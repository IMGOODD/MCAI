const test = require('node:test');
const assert = require('node:assert/strict');
const { eatFood } = require('../../../src/actions/eatFood');
const { createBot } = require('../../helpers/createBot');

test('eatFood는 배가 부르거나 음식이 없으면 먹지 않는다', async () => {
  assert.equal(await eatFood(createBot({ food: 20 })), false);
  assert.equal(await eatFood(createBot({ food: 5 })), false);
});

test('eatFood는 보유한 음식을 장착하고 먹는다', async () => {
  const bread = { name: 'bread', count: 1 }; const calls = [];
  const bot = createBot({ inventory: { items: () => [bread] }, async equip(item, slot) { calls.push(['equip', item, slot]); }, async consume() { calls.push(['consume']); } });
  assert.equal(await eatFood(bot), true);
  assert.deepEqual(calls, [['equip', bread, 'hand'], ['consume']]);
});
