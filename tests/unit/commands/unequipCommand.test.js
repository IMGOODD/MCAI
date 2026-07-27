const test = require('node:test');
const assert = require('node:assert/strict');
const unequipCommand = require('../../../src/commands/unequipCommand');

test('unequipCommand는 해제 결과를 공통 형식으로 반환하고 채팅으로 알린다', async () => {
  const bot = {
    isBusy: false,
    messages: [],
    inventory: {
      slots: {
        8: { name: 'iron_boots' }
      }
    },
    async unequip() {},
    chat(message) {
      this.messages.push(message);
    }
  };

  const result = await unequipCommand.execute(bot, 'tester', {
    action: 'unequipCommand',
    target: 'boots',
    count: 1
  });

  assert.equal(result.success, true);
  assert.equal(result.code, 'EQUIPMENT_UNEQUIPPED');
  assert.equal(result.data.count, 1);
  assert.equal(bot.messages.length, 1);
  assert.equal(bot.isBusy, false);
});
