import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const contract = resolve(process.cwd(), '..', 'docs', 'api_contract.md');
if (!existsSync(contract)) { console.error('docs/api_contract.md is missing'); process.exit(1); }
const text = readFileSync(contract, 'utf8');
for (const marker of ['Mobile API Contract', 'No mobile endpoint creates', 'Events', 'Team Finder', 'Chat', 'Protected operations']) {
  if (!text.includes(marker)) { console.error(`API contract missing: ${marker}`); process.exit(1); }
}
console.log('API contract is present and contains required boundaries.');
