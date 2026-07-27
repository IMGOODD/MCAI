const test = require('node:test');
const assert = require('node:assert/strict');
const answerCommand = require('../../../src/commands/answerCommand');
const { createBot } = require('../../helpers/createBot');

test('stone 질의는 돌 도구를 합산하지 않고 정확히 stone만 센다', async () => {
  const bot = createBot({
    inventory: {
      items: () => [
        { name: 'stone', displayName: 'Stone', count: 4 },
        { name: 'cobblestone', displayName: 'Cobblestone', count: 7 },
        { name: 'stone_pickaxe', displayName: 'Stone Pickaxe', count: 1 },
        { name: 'stone_axe', displayName: 'Stone Axe', count: 1 }
      ]
    }
  });

  const result = await answerCommand.execute(bot, 'tester', {
    action: 'answerCommand',
    target: 'stone',
    count: 0
  });

  assert.equal(result.success, true);
  assert.equal(result.code, 'ITEM_COUNT_REPORTED');
  assert.deepEqual(result.data, { item: 'stone', count: 4 });
});

test('cobblestone 질의는 조약돌만 센다', async () => {
  const bot = createBot({
    inventory: {
      items: () => [
        { name: 'cobblestone', displayName: 'Cobblestone', count: 7 },
        { name: 'stone_shovel', displayName: 'Stone Shovel', count: 1 }
      ]
    }
  });

  const result = await answerCommand.execute(bot, 'tester', {
    action: 'answerCommand',
    target: 'cobblestone',
    count: 0
  });

  assert.deepEqual(result.data, { item: 'cobblestone', count: 7 });
});
