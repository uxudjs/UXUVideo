import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const pagesRoot = fileURLToPath(new URL("../../../UXUV-Pages/", import.meta.url));
const sourceExtensions = new Set([".js", ".mjs", ".ts", ".tsx"]);

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && sourceExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

function matches(files, pattern) {
  return files.filter((path) => pattern.test(readFileSync(path, "utf8")));
}

test("retired Next route and server trees are absent", () => {
  assert.equal(existsSync(join(root, "app/api")), false);
  assert.equal(existsSync(join(root, "lib/server")), false);
});

test("runtime source contains no retired Next server or Upstash contracts", () => {
  const files = sourceFiles(join(root, "app")).concat(sourceFiles(join(root, "lib")));
  assert.deepEqual(matches(files, /\bNext(?:Request|Response)\b|server-only|@upstash\/redis|UPSTASH_REDIS/), []);
  assert.deepEqual(matches(files, /from\s+["']node:(?:fs|path)["']|require\(["'](?:fs|path)["']\)/), []);

  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(packageJson.dependencies?.["@upstash/redis"], undefined);
});

test("Pages source has no dependency on the retired UXUVideo implementation", () => {
  const files = sourceFiles(join(pagesRoot, "app"))
    .concat(sourceFiles(join(pagesRoot, "components")), sourceFiles(join(pagesRoot, "lib")));
  assert.deepEqual(matches(files, /UXUVideo[\\/](?:app\/api|lib\/server)|\.\.\/[\\/]?UXUVideo/), []);
});
