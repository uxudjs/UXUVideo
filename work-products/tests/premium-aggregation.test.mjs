import assert from 'node:assert/strict';
import test from 'node:test';

import { interleavePremiumResults, mergePremiumCategories } from '../../_worker.js';

test('fuzzily merges stable Premium category labels with four-character overlap', () => {
  const merged = mergePremiumCategories([
    { sourceId: 'a', typeId: 1, label: '欧美动作电影专区' },
    { sourceId: 'b', typeId: 8, label: '欧美动作片' },
    { sourceId: 'a', typeId: 2, label: '喜剧片' },
    { sourceId: 'b', typeId: 9, label: '喜剧' },
  ]);
  assert.deepEqual(merged, [
    { label: '欧美动作电影专区', values: ['a:1', 'b:8'] },
    { label: '喜剧片', values: ['a:2', 'b:9'] },
  ]);
});

test('interleaves Premium sources deterministically and stops at the requested limit', () => {
  assert.deepEqual(interleavePremiumResults([
    [{ source: 'a', id: 1 }, { source: 'a', id: 2 }],
    [{ source: 'b', id: 1 }, { source: 'b', id: 2 }],
    [{ source: 'c', id: 1 }],
  ], 4), [
    { source: 'a', id: 1 }, { source: 'b', id: 1 }, { source: 'c', id: 1 }, { source: 'a', id: 2 },
  ]);
});
