#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "_worker.js"));
const compressed = gzipSync(source, { level: 9 });
const limit = 3 * 1024 * 1024;

console.log(`Worker source: ${source.byteLength} bytes`);
console.log(`Worker gzip: ${compressed.byteLength} bytes / ${limit} bytes`);

if (compressed.byteLength >= limit) {
  throw new Error("Compressed Worker exceeds the 3 MiB upload boundary.");
}
