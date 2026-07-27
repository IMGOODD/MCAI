const test = require('node:test');
const assert = require('node:assert/strict');
const { tossItem, tossMatchingItems } = require('../../../src/actions/toss');
const { createBot } = require('../../helpers/createBot');

test('tossItem은 여러 슬롯에서 요청한 수량만 버린다', async () => {
  const calls = []; const bot = createBot({ inventory: { items: () => [{ name: 'dirt', type: 3, count: 2 }, { name: 'dirt', type: 3, count: 5 }] }, async toss(type, metadata, count) { calls.push([type, metadata, count]); } });
  assert.equal(await tossItem(bot, 'dirt', 4), true);
  assert.deepEqual(calls, [[3, null, 2], [3, null, 2]]);
});

test('tossMatchingItems는 자원 그룹에서도 요청한 수량만 버린다', async () => {
  const calls = [];
  const bot = createBot({
    inventory: {
      items: () => [
        { name: 'cobblestone', type: 4, count: 3 },
        { name: 'cobbled_deepslate', type: 5, count: 4 }
      ]
    },
    async toss(type, metadata, count) { calls.push([type, metadata, count]); }
  });

  const matcher = name => ['cobblestone', 'cobbled_deepslate'].includes(name);
  assert.equal(await tossMatchingItems(bot, matcher, 5), true);
  assert.deepEqual(calls, [[4, null, 3], [5, null, 2]]);
});
