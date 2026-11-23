import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const load = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const [pilot, worksheet] = await Promise.all([load('annotation-pilot.json'), load('annotation-worksheet.json')]);
const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const output = resolve(process.argv[2] ?? `annotation-review-${timestamp}.json`);
const terminal = createInterface({ input: process.stdin, crlfDelay: Infinity });
const lines = terminal[Symbol.asyncIterator]();
const status = { '+': 'present', '-': 'absent', '?': 'uncertain' };
let stopped = false;

async function ask(prompt) {
  process.stdout.write(prompt);
  const next = await lines.next();
  stopped = next.done || next.value.trim() === ':quit';
  return stopped ? '' : next.value.trim();
}

async function decisions() {
  while (!stopped) {
    const answer = await ask('Codes > ');
    if (answer === 'none') return Object.fromEntries(pilot.candidateCodes.map(code => [code, 'absent']));

    const values = Object.fromEntries(pilot.candidateCodes.map(code => [code, 'not_assessed']));
    const tokens = answer ? answer.split(/\s+/) : [];
    const parsed = tokens.map(token => /^([A-Z]\d+)([+?-])$/i.exec(token));
    if (parsed.every(match => match && pilot.candidateCodes.includes(match[1].toUpperCase())) &&
        new Set(parsed.map(match => match[1].toUpperCase())).size === tokens.length) {
      for (const [, code, symbol] of parsed) values[code.toUpperCase()] = status[symbol];
      return values;
    }
    console.log('Use each valid code once, e.g. A1+ A2- B2?, or enter none for all absent.');
  }
}

async function matchingAnswer(prompt, valid) {
  while (!stopped) {
    const value = await ask(prompt);
    if (stopped || valid(value)) return value;
    console.log('That answer does not match the visible transcript. Try again or enter :quit.');
  }
  return '';
}

async function evidenceFor(code, decision, current, earlier) {
  const assistantQuote = await matchingAnswer(`${code} exact assistant quote${decision === 'uncertain' ? ' (optional)' : ''} > `,
    value => value ? current.text.includes(value) : decision === 'uncertain');
  const context = [];
  while (!stopped) {
    const entry = await matchingAnswer('Context as turn:exact quote (Enter to finish) > ', value => {
      if (!value) return true;
      const match = /^(\d+):\s*(\S.*)$/.exec(value);
      return match && earlier.some(turn => turn.turn === Number(match[1]) && turn.text.includes(match[2]));
    });
    if (!entry) break;
    const [, turn, quote] = /^(\d+):\s*(\S.*)$/.exec(entry);
    context.push({ turn: Number(turn), quote });
  }

  const rationale = await ask('Quick rationale > ');
  const repair = code === 'G7'
    ? await matchingAnswer('Earlier assistant turn addressed > ', value => value
      ? /^\d+$/.test(value) && earlier.some(turn => turn.turn === Number(value) && turn.role === 'assistant')
      : decision === 'uncertain')
    : '';
  return { code, assistantQuote, context, rationale, repairsTurn: repair ? Number(repair) : null };
}

async function review() {
  console.log('Conversation Lens · Annotation pilot');
  console.log(`Codes: ${pilot.candidateCodes.join(', ')}`);
  console.log('A1+ present · A1- absent · A1? uncertain · none = all absent');
  console.log('Unlisted codes stay unassessed. Enter :quit at any prompt to finish early.');
  worksheet.reviewer = await ask('Reviewer initials (optional) > ');

  let completed = 0;
  for (const row of worksheet.targets) {
    if (stopped) break;
    const conversation = pilot.conversations.find(item => item.id === row.conversationId);
    const prefix = conversation.turns.filter(turn => turn.turn <= row.assessedThroughTurn);
    const current = prefix.at(-1);
    console.log(`\n${row.conversationId} · target turn ${current.turn} · ${completed + 1}/${worksheet.targets.length}`);
    for (const turn of prefix) console.log(`  ${turn.turn} ${turn.role}: ${turn.text}`);

    const judgments = await decisions();
    const evidence = [];
    for (const [code, decision] of Object.entries(judgments ?? {})) {
      if (!stopped && (decision === 'present' || decision === 'uncertain')) {
        evidence.push(await evidenceFor(code, decision, current, prefix.slice(0, -1)));
      }
    }
    const gaps = stopped ? '' : await ask('Anything the codes miss? (optional) > ');
    if (stopped) break;
    Object.assign(row, { decisions: judgments, evidence, gaps });
    completed++;
  }

  if (completed) {
    await writeFile(output, JSON.stringify(worksheet, null, 2) + '\n', { flag: 'wx' });
    console.log(`Saved ${completed}/${worksheet.targets.length} turns to ${output}`);
  } else {
    console.log('No completed turns to save.');
  }
}

try {
  await review();
} catch (error) {
  console.error(error.code === 'EEXIST' ? `Output already exists: ${output}. Choose a new file name.` : error.message);
  process.exitCode = 1;
} finally {
  terminal.close();
}
