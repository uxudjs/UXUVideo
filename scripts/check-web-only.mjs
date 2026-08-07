#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenRootName = /^(?:Dockerfile(?:\..+)?|docker-compose(?:\..+)?\.ya?ml|wrangler(?:\.[^.]+)?\.toml)$/i;
const forbiddenWorkflowName = /(?:cloudflare|wrangler|docker|android-tv|apple-tv|tvos|apk)/i;
const forbiddenDirectories = new Set(['android-tv', 'apple-tv']);
const forbiddenDependencies = new Set([
  '@cloudflare/next-on-pages',
  '@cloudflare/workers-types',
  '@opennextjs/cloudflare',
  'wrangler',
]);
const forbiddenScript = /(?:next-on-pages|@opennextjs\/cloudflare|\bwrangler\b|\bdocker(?:-compose)?\b)/i;

function manifestViolations(root, relativeFile) {
  const file = path.join(root, relativeFile);
  if (!fs.existsSync(file)) return [];
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dependencyGroups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const dependencies = dependencyGroups.flatMap((group) => Object.keys(manifest[group] || {}));
  const violations = dependencies.filter((name) => forbiddenDependencies.has(name))
    .map((name) => `${relativeFile}: dependency ${name}`);
  for (const [name, command] of Object.entries(manifest.scripts || {})) {
    if (name === 'pages:build' || forbiddenScript.test(String(command))) {
      violations.push(`${relativeFile}: script ${name}`);
    }
  }
  return violations;
}

export function findWebOnlyViolations(root = process.cwd()) {
  const violations = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (forbiddenRootName.test(entry.name) || (entry.isDirectory() && forbiddenDirectories.has(entry.name))) {
      violations.push(entry.name);
    }
  }
  const workflowDir = path.join(root, '.github', 'workflows');
  if (fs.existsSync(workflowDir)) {
    for (const name of fs.readdirSync(workflowDir)) {
      if (forbiddenWorkflowName.test(name)) violations.push(`.github/workflows/${name}`);
    }
  }
  violations.push(...manifestViolations(root, 'package.json'));
  violations.push(...manifestViolations(root, 'verification/package.json'));
  return [...new Set(violations)].sort();
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const violations = findWebOnlyViolations(path.resolve(process.argv[2] || process.cwd()));
  if (violations.length) {
    process.stderr.write(`Web-only policy violations:\n${violations.map((item) => `- ${item}`).join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Web-only policy passed.\n');
  }
}
