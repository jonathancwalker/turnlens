import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { judgeTurn } from '../online-judge.mjs';

try {
  if (!process.env.OPENAI_API_KEY) process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  const { turns } = JSON.parse(readFileSync(0, 'utf8'));
  const result = await judgeTurn(turns, {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_JUDGE_MODEL,
    includeRetention: process.argv.includes('--retention'),
    targetEvidence: process.argv.includes('--target-evidence'),
    includeRecognition: true,
  });
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
