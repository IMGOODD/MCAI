const test = require('node:test');
const assert = require('node:assert/strict');
const { equipArmor } = require('../../../src/actions/equip');

test('방어구를 데이터에 지정된 슬롯에 장착한다', async () => {
  const helmet = { name: 'diamond_helmet', count: 1, slot: 9 };
  const calls = [];
  const bot = {
    inventory: { items: () => [helmet] },
    async equip(item, destination) {
      calls.push({ item, destination });
    }
  };

  const result = await equipArmor(bot, 'diamond_helmet');

  assert.equal(result.success, true);
  assert.equal(result.code, 'EQUIPMENT_EQUIPPED');
  assert.deepEqual(calls, [{ item: helmet, destination: 'head' }]);
});

test('보유하지 않은 방어구는 장착 실패를 반환한다', async () => {
  const bot = { inventory: { items: () => [] } };
  const result = await equipArmor(bot, 'netherite_boots');

  assert.deepEqual(result, {
    success: false,
    code: 'EQUIPMENT_MISSING',
    data: { item: 'netherite_boots', slot: 'feet' }
  });
});
