import { readFileSync } from 'node:fs';
import { createFocusedScorer, focusedDetectorVersion } from '../extension/focused-scorer.mjs';

const { turns } = JSON.parse(readFileSync(0, 'utf8'));
if (!Array.isArray(turns) || !turns.length) throw new Error('Expected a nonempty conversation prefix.');
const detector = createFocusedScorer({ includeRetention: process.argv.includes('--retention') });
let assessment;
for (const { role, text } of turns) assessment = detector.push({ role, text });
process.stdout.write(JSON.stringify({ detector: focusedDetectorVersion, ...assessment }));
