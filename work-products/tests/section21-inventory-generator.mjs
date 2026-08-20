import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INVENTORIES, inventoryRows, serializeInventory,
} from './section21-inventory.mjs';

const mode = process.argv[2];
const label = process.argv[3];
if (!['--write-baseline', '--write-snapshot', '--verify-snapshot'].includes(mode)
    || (['--write-snapshot', '--verify-snapshot'].includes(mode) && !/^S21-[A-Z0-9-]+$/.test(label ?? ''))) {
  throw new Error('usage: node section21-inventory-generator.mjs --write-baseline|--write-snapshot S21-LABEL|--verify-snapshot S21-LABEL');
}

const workerRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pagesRoot = resolve(workerRoot, '..', 'UXUV-Pages');
const evidenceRoot = join(workerRoot, 'work-products', 'evidence', 'section21');
const planSha256 = createHash('sha256').update(readFileSync(join(workerRoot, 'work-products', 'plan.md'))).digest('hex');

for (const definition of INVENTORIES) {
  const target = ['--write-snapshot', '--verify-snapshot'].includes(mode)
    ? join(evidenceRoot, 'inventory-snapshots', `${label}-${definition.name}`)
    : join(evidenceRoot, definition.name);
  if (mode === '--verify-snapshot') {
    const actual = serializeInventory(planSha256, inventoryRows(definition, [
      { name: 'worker', root: workerRoot }, { name: 'pages', root: pagesRoot },
    ]));
    if (readFileSync(target, 'utf8') !== actual) throw new Error(`inventory snapshot drift: ${definition.name}`);
    continue;
  }
  if (mode === '--write-baseline' || mode === '--write-snapshot') {
    if (existsSync(target)) throw new Error(`refusing to overwrite inventory evidence: ${target}`);
    mkdirSync(dirname(target), { recursive: true });
    const content = serializeInventory(planSha256, inventoryRows(definition, [
      { name: 'worker', root: workerRoot }, { name: 'pages', root: pagesRoot },
    ]));
    writeFileSync(target, content, 'utf8');
    continue;
  }
}
