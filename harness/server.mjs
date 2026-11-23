import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defaultJudgeModel, judgeTurn } from '../online-judge.mjs';
import { requestOpenAIText } from '../openai-response.mjs';

const port = Number(process.env.CHAT_JUDGE_PORT ?? 4188);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('CHAT_JUDGE_PORT must be a port from 1 to 65535.');
}

const host = `127.0.0.1:${port}`;
const origin = `http://${host}`;
const localHosts = new Set([host, `localhost:${port}`]);
const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url)));
const extensionId = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex')
  .slice(0, 32).replace(/[a-f0-9]/g, digit => String.fromCharCode(97 + Number.parseInt(digit, 16)));
const extensionOrigin = `chrome-extension://${extensionId}`;
const adapterPath = process.env.CHAT_JUDGE_ADAPTER;
const configuredKey = process.env.OPENAI_API_KEY;
let sessionKey = null;
const activeKey = () => sessionKey ?? configuredKey;
const adapter = adapterPath && (await import(pathToFileURL(resolve(adapterPath)).href)).generateReply;
if (adapterPath && typeof adapter !== 'function') {
  throw new Error('CHAT_JUDGE_ADAPTER must export a generateReply function.');
}
const replyModel = process.env.OPENAI_REPLY_MODEL || defaultJudgeModel;

const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};
const staticRoutes = new Map();
for (const [route, path, type] of [
  ['/harness/', './index.html', 'text/html'],
  ['/harness/styles.css', './styles.css', 'text/css'],
  ['/harness/app.mjs', './app.mjs', 'text/javascript'],
  ['/harness/scripted.mjs', './scripted.mjs', 'text/javascript'],
]) {
  staticRoutes.set(route, { type, body: await readFile(new URL(path, import.meta.url)) });
}

function respond(res, status, body, type = 'application/json') {
  res.writeHead(status, { ...headers, 'Content-Type': `${type}; charset=utf-8` });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function config() {
  return {
    modelAvailable: Boolean(adapter || activeKey()),
    modelLabel: adapter ? 'Model adapter' : 'OpenAI',
    judgeAvailable: Boolean(activeKey()),
    sessionKeyActive: sessionKey !== null,
  };
}

function localJson(req) {
  return req.headers.origin === `http://${req.headers.host}` &&
    req.headers['content-type']?.split(';')[0] === 'application/json';
}

async function configureKey(req, res) {
  if (!localJson(req)) {
    respond(res, 403, { error: 'Local JSON requests only.' });
    return;
  }
  const body = await parseRequest(req);
  const key = typeof body?.key === 'string' ? body.key.trim() : body?.key;
  if (key !== null && (typeof key !== 'string' || key.length > 512 || !/^sk-[A-Za-z0-9_-]+$/.test(key))) {
    respond(res, 400, { error: 'Enter a valid OpenAI API key.' });
    return;
  }
  sessionKey = key;
  respond(res, 200, config());
}

async function parseRequest(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > 256_000) {
      req.resume();
      return null;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function isPrefix(body, maxTurnLength) {
  return Array.isArray(body?.turns) && body.turns.length >= 1 &&
    body.turns.length <= 60 && body.turns.every(turn => ['user', 'assistant'].includes(turn?.role) &&
      typeof turn.text === 'string' && turn.text.trim() && turn.text.length <= maxTurnLength);
}

async function reply(req, res) {
  if (!localJson(req)) {
    respond(res, 403, { error: 'Local JSON requests only.' });
    return;
  }
  const apiKey = activeKey();
  if (!adapter && !apiKey) {
    respond(res, 503, { error: 'Add an OpenAI key in local demo settings or configure a reply adapter.' });
    return;
  }
  const body = await parseRequest(req);
  if (body?.synthetic !== true || !isPrefix(body, 4000) || typeof body.systemPrompt !== 'string' || body.systemPrompt.length > 4000 ||
      body.turns.at(-1).role !== 'user') {
    respond(res, 400, { error: 'Expected synthetic turns and a system prompt within demo limits.' });
    return;
  }

  const controller = new AbortController();
  res.once('close', () => controller.abort());
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
  try {
    const turns = body.turns.map(({ role, text }) => ({ role, text }));
    const text = adapter
      ? await adapter({ systemPrompt: body.systemPrompt, turns, signal })
      : (await requestOpenAIText({
        apiKey, signal, model: replyModel, instructions: body.systemPrompt.trim() || undefined,
        input: turns.map(({ role, text }) => ({ role, content: text })),
        max_output_tokens: 700,
      })).text;
    if (signal.aborted || typeof text !== 'string' || !text.trim() || text.length > 4000) {
      throw new Error('Invalid or expired model reply');
    }
    respond(res, 200, { text: text.trim() });
  } catch {
    if (!res.destroyed) respond(res, 502, { error: 'Model reply unavailable.' });
  }
}

async function score(req, res, fromExtension) {
  if (req.headers.origin !== (fromExtension ? extensionOrigin : `http://${req.headers.host}`) ||
      req.headers['content-type']?.split(';')[0] !== 'application/json') {
    respond(res, 403, { error: 'Local JSON requests only.' });
    return;
  }
  const judgeKey = activeKey();
  if (!judgeKey) {
    respond(res, 503, { error: 'OpenAI judge is unconfigured.' });
    return;
  }
  const body = await parseRequest(req);
  if (!isPrefix(body, fromExtension ? 32000 : 4000) || (!fromExtension && body.synthetic !== true)) {
    respond(res, 400, { error: 'Invalid transcript for scoring.' });
    return;
  }
  const controller = new AbortController();
  res.once('close', () => controller.abort());
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]);
  try {
    const assessment = await judgeTurn(body.turns, { apiKey: judgeKey, model: process.env.OPENAI_JUDGE_MODEL, signal });
    if (!res.destroyed) respond(res, 200, assessment);
  } catch {
    if (!res.destroyed) respond(res, 502, { error: 'OpenAI assessment unavailable.' });
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!localHosts.has(req.headers.host)) {
      respond(res, 403, { error: 'Open the supported loopback address.' });
      return;
    }
    if (req.method === 'GET') {
      if (req.url === '/' || req.url === '/harness' || req.url === '/harness/index.html') {
        res.writeHead(302, { ...headers, Location: '/harness/' }).end();
        return;
      }
      if (req.url === '/harness/api/config') {
        respond(res, 200, config());
        return;
      }
      const asset = staticRoutes.get(req.url);
      if (asset) {
        respond(res, 200, asset.body, asset.type);
        return;
      }
    }
    if (req.method === 'POST' && req.url === '/harness/api/key') {
      await configureKey(req, res);
      return;
    }
    if (req.method === 'POST' && req.url === '/harness/api/reply') {
      await reply(req, res);
      return;
    }
    if (req.method === 'POST' && ['/harness/api/score', '/api/extension/score'].includes(req.url)) {
      await score(req, res, req.url === '/api/extension/score');
      return;
    }
    respond(res, 404, { error: 'Not found.' });
  } catch {
    if (!res.destroyed) respond(res, 500, { error: 'Local server error.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Real-Time Chat Judge demo: ${origin}/harness/`);
  console.log(adapter ? 'Custom model replies enabled.' : configuredKey ? 'OpenAI replies and scoring enabled.' : 'Scripted replies enabled.');
});
