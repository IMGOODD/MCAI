const test = require('node:test');
const assert = require('node:assert/strict');
const equipCommand = require('../../../src/commands/equipCommand');

test('equipCommand는 장착 결과를 공통 반환 형식으로 반환한다', async () => {
  const helmet = { name: 'iron_helmet', count: 1, slot: 9 };
  const bot = {
    isBusy: false,
    messages: [],
    inventory: { items: () => [helmet] },
    async equip() {},
    chat(message) { this.messages.push(message); }
  };

  const result = await equipCommand.execute(bot, 'tester', {
    action: 'equipCommand',
    target: 'iron_helmet',
    count: 1
  });

  assert.deepEqual(result, {
    success: true,
    code: 'EQUIPMENT_EQUIPPED',
    data: { item: 'iron_helmet', slot: 'head' }
  });
  assert.equal(bot.isBusy, false);
  assert.equal(bot.messages.length, 1);
});
