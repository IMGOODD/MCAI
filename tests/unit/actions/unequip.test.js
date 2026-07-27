const test = require('node:test');
const assert = require('node:assert/strict');
const {
  unequipArmor,
  resolveUnequipTargets
} = require('../../../src/actions/unequip');

test('방어구 부위와 전체 해제 대상을 실제 착용 슬롯으로 변환한다', () => {
  assert.deepEqual(resolveUnequipTargets('helmet'), [{
    piece: 'helmet',
    destination: 'head',
    inventorySlot: 5
  }]);
  assert.equal(resolveUnequipTargets('all').length, 4);
});

test('특정 부위의 착용 장비를 인벤토리로 해제한다', async () => {
  const calls = [];
  const bot = {
    inventory: {
      slots: {
        5: { name: 'iron_helmet', count: 1, slot: 5 }
      }
    },
    async unequip(destination) {
      calls.push(destination);
    }
  };

  const result = await unequipArmor(bot, 'helmet');

  assert.equal(result.success, true);
  assert.equal(result.code, 'EQUIPMENT_UNEQUIPPED');
  assert.deepEqual(result.data.items, [{ item: 'iron_helmet', slot: 'head' }]);
  assert.deepEqual(calls, ['head']);
});

test('정확한 아이템을 요청하면 같은 슬롯의 다른 장비는 벗지 않는다', async () => {
  const bot = {
    inventory: {
      slots: {
        5: { name: 'diamond_helmet', count: 1, slot: 5 }
      }
    },
    async unequip() {
      throw new Error('호출되면 안 됩니다.');
    }
  };

  assert.deepEqual(await unequipArmor(bot, 'iron_helmet'), {
    success: false,
    code: 'EQUIPMENT_NOT_EQUIPPED',
    data: { target: 'iron_helmet' }
  });
});

test('전체 방어구를 머리부터 발까지 순서대로 벗는다', async () => {
  const calls = [];
  const bot = {
    inventory: {
      slots: {
        5: { name: 'iron_helmet' },
        6: { name: 'iron_chestplate' },
        7: { name: 'iron_leggings' },
        8: { name: 'iron_boots' }
      }
    },
    async unequip(destination) {
      calls.push(destination);
    }
  };

  const result = await unequipArmor(bot, 'all');
  assert.equal(result.data.count, 4);
  assert.deepEqual(calls, ['head', 'torso', 'legs', 'feet']);
});
