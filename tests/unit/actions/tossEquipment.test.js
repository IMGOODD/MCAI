const test = require('node:test');
const assert = require('node:assert/strict');
const { tossItem } = require('../../../src/actions/toss');
const { createBot } = require('../../helpers/createBot');

test('장비 전달은 현재 착용 중인 슬롯을 제외한다', async () => {
  const calls = [];
  const bot = createBot({
    inventory: {
      items: () => [
        { name: 'iron_helmet', type: 100, count: 1, slot: 5 },
        { name: 'iron_helmet', type: 100, count: 2, slot: 12 }
      ]
    },
    async toss(type, metadata, count) {
      calls.push([type, metadata, count]);
    }
  });

  assert.equal(await tossItem(bot, 'iron_helmet', 1, {
    excludeSlots: [5, 6, 7, 8]
  }), true);
  assert.deepEqual(calls, [[100, null, 1]]);
});
