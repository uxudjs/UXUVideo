import assert from 'node:assert/strict';
import test from 'node:test';

import { filterMediaManifest } from '../../_worker.js';

const playlist = [
  '#EXTM3U',
  '#EXT-X-TARGETDURATION:10',
  '#EXTINF:10,',
  'main-001.ts',
  '#EXT-X-DISCONTINUITY',
  '#EXTINF:1,',
  'ads/promo.ts',
  '#EXT-X-DISCONTINUITY',
  '#EXTINF:10,',
  'main-002.ts',
  '#EXT-X-ENDLIST',
].join('\n');

test('off stays byte-identical while keyword, heuristic, and aggressive modes remain distinct', () => {
  assert.equal(filterMediaManifest(playlist, 'off', ['promo']), playlist);

  const keyword = filterMediaManifest(playlist, 'keyword', ['promo']);
  assert.doesNotMatch(keyword, /promo\.ts/);
  assert.match(keyword, /main-001\.ts/);
  assert.match(keyword, /main-002\.ts/);

  const heuristic = filterMediaManifest(playlist, 'heuristic', []);
  assert.doesNotMatch(heuristic, /ads\/promo\.ts/);

  const equalDurationAd = playlist.replace('#EXTINF:1,\nads/promo.ts', '#EXTINF:10,\nads/promo.ts');
  assert.match(filterMediaManifest(equalDurationAd, 'heuristic', []), /ads\/promo\.ts/);
  assert.doesNotMatch(filterMediaManifest(equalDurationAd, 'aggressive', []), /ads\/promo\.ts/);
});

test('cue and interstitial metadata are removed without damaging content segments', () => {
  const marked = [
    '#EXTM3U',
    '#EXTINF:10,', 'main.ts',
    '#EXT-X-CUE-OUT:5',
    '#EXTINF:5,', 'ad.ts',
    '#EXT-X-CUE-IN',
    '#EXT-X-DATERANGE:ID="break",CLASS="com.apple.hls.interstitial",X-ASSET-URI="ad.m3u8"',
    '#EXTINF:10,', 'after.ts',
  ].join('\n');
  const filtered = filterMediaManifest(marked, 'keyword', []);
  assert.doesNotMatch(filtered, /CUE-|DATERANGE|ad\.ts/);
  assert.match(filtered, /main\.ts/);
  assert.match(filtered, /after\.ts/);
});

test('filtering fails safe when malformed input or an overbroad rule would remove every segment', () => {
  const oneSegment = '#EXTM3U\n#EXTINF:5,\nsponsor-only.ts\n#EXT-X-ENDLIST';
  assert.equal(filterMediaManifest(oneSegment, 'keyword', ['sponsor']), oneSegment);
  assert.equal(filterMediaManifest('not-a-playlist', 'aggressive', ['ad']), 'not-a-playlist');
});

