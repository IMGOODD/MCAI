const test = require('node:test');
const assert = require('node:assert/strict');
const sortInventoryCommand = require('../../../src/commands/sortInventoryCommand');

test('상자가 없으면 공통 실패 형식을 반환한다', async () => {
  const bot = {
    version: '1.20.1',
    isBusy: false,
    inventory: { items: () => [] },
    entities: {},
    findBlocks: () => [],
    pathfinder: { setGoal() {} },
    chat() {}
  };

  const result = await sortInventoryCommand.execute(bot);

  assert.deepEqual(result, {
    success: false,
    code: 'STORAGE_CHEST_NOT_FOUND',
    data: { maxDistance: 32 }
  });
  assert.equal(bot.isBusy, false);
});
