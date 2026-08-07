import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

test('Next webpack can require every configured PostCSS plugin', async () => {
  const config = (await import('../../postcss.config.mjs')).default;
  const pluginNames = Object.keys(config.plugins);

  assert.deepEqual(pluginNames, ['@tailwindcss/postcss', 'postcss-preset-env']);
  const presetEntry = require.resolve('postcss-preset-env', {
    paths: [repositoryRoot],
  });
  const presetManifest = JSON.parse(
    readFileSync(path.join(path.dirname(presetEntry), '..', 'package.json'), 'utf8'),
  );
  assert.equal(
    typeof presetManifest.exports?.['.']?.require?.default,
    'string',
    'postcss-preset-env must publish a CommonJS condition for Next webpack',
  );
  require('next/dist/server/require-hook');
  const { getPostCssPlugins } = require(
    'next/dist/build/webpack/config/blocks/css/plugins',
  );

  const plugins = await getPostCssPlugins(repositoryRoot);
  assert.equal(plugins.length, pluginNames.length);
  const postcss = require('postcss');
  await postcss(plugins).process(
    '.sample { color: color-mix(in srgb, red 50%, transparent); }',
    { from: undefined },
  );
});
