import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = readFileSync(join(root, '_worker.js'), 'utf8');

function bodyBetween(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `missing source boundary: ${start}`);
  return source.slice(from, to);
}

test('S21-T02 routes the retired UXUV-Pages browser prefix to a local 404', () => {
  const lookup = bodyBetween('function pagesLookupPath', 'function staticContentSecurityPolicy');
  assert.doesNotMatch(lookup, /PAGES_PUBLIC_PREFIX/);
  const router = bodyBetween('async function routeRequest', 'function logCompletion');
  assert.match(router, /\/UXUV-Pages/);
  assert.match(router, /PAGE_NOT_FOUND|404/);
  assert.match(router, /retiredPrefixNotFound/);
});

test('S21-T03 exposes exactly 21 non-IPTV routes', () => {
  const routes = bodyBetween('const ROUTES = [', 'const AUTH_ROUTE_IDS');
  const routeIds = [...routes.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(routeIds.length, 21);
  assert.equal(routeIds.some((id) => id.includes('iptv')), false);
});

test('S21-T03 removes environment-owned source defaults', () => {
  assert.doesNotMatch(source, /SUBSCRIPTION_SOURCES|DANMAKU_API_URL|IPTV_SOURCES/);
});

test('S21-T03 removes the IPTV capability flag', () => {
  assert.doesNotMatch(source, /capabilities:\s*\{[^}]*iptv/s);
});

test('S21-T03 removes default source fields from the config payload', () => {
  assert.doesNotMatch(source, /subscriptionSources|iptvSources|danmakuApiUrl/);
});

test('S21-T03 switches the complete Worker surface to v2 atomically', () => {
  assert.match(source, /const WORKER_VERSION = '2\.0\.0'/);
  assert.match(source, /const API_CONTRACT_VERSION = '2'/);
});

test('S21-T04 applies one 8000 ms deadline to each search page', () => {
  const searchPage = bodyBetween('async function searchSourcePage', 'function handleParallelSearch');
  assert.match(source, /const SEARCH_SOURCE_TIMEOUT_MS = 8_000/);
  assert.match(searchPage, /SEARCH_SOURCE_TIMEOUT_MS/);
});

test('S21-T04 has no retry or legacy 20-second path', () => {
  const searchPage = bodyBetween('async function searchSourcePage', 'function handleParallelSearch');
  assert.doesNotMatch(searchPage, /20_000|retry|attempt/i);
});

test('S21-T04 preserves the all-sources-unavailable error', () => {
  const parallelSearch = bodyBetween('function handleParallelSearch', 'async function accountVideoSources');
  assert.match(parallelSearch, /SEARCH_SOURCES_UNAVAILABLE/);
});

test('S21-T04 preserves partial success when at least one source responds', () => {
  const parallelSearch = bodyBetween('function handleParallelSearch', 'async function accountVideoSources');
  assert.match(parallelSearch, /validSources\s*>\s*0|validSources\s*===\s*0/);
});
