const test = require('node:test');
const assert = require('node:assert/strict');
const smeltCommand = require('../../../src/commands/smeltCommand');
const { createBot } = require('../../helpers/createBot');

test('smeltCommand는 제련 재료가 없으면 표준 실패 결과를 반환한다', async () => {
  const bot = createBot({ isBusy: false });
  const result = await smeltCommand.execute(bot, 'player', {
    action: 'smeltCommand',
    target: 'iron_ingot',
    count: 3
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'SMELT_MATERIALS_MISSING');
  assert.equal(result.data.input.name, 'raw_iron');
  assert.equal(result.data.fuel.name, 'coal');
  assert.equal(bot.isBusy, false);
  assert.deepEqual(bot.chatMessages, ['철 광석이 부족해.', '석탄이 부족해.']);
});
