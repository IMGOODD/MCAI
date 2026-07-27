const test = require('node:test');
const assert = require('node:assert/strict');
const minecraftData = require('minecraft-data');
const { createPlan, UnsupportedMaterialError } = require('../../../src/core/planner');

const mcData = minecraftData('1.20.1');

function botWith(items = [], nearby = {}) {
  return {
    version: '1.20.1',
    inventory: { items: () => items },
    findBlock({ matching }) {
      if (matching === mcData.blocksByName.furnace.id && nearby.furnace) {
        return { name: 'furnace' };
      }
      if (matching === mcData.blocksByName.crafting_table.id && nearby.craftingTable) {
        return { name: 'crafting_table' };
      }
      return null;
    }
  };
}

test('철과 석탄이 충분하고 화로만 없으면 화로만 제작한 뒤 제련한다', () => {
  const bot = botWith([
    { name: 'raw_iron', count: 3 },
    { name: 'coal', count: 1 },
    { name: 'cobblestone', count: 8 }
  ], { craftingTable: true });

  assert.deepEqual(createPlan(bot, {
    action: 'smeltCommand',
    target: 'iron_ingot',
    count: 3
  }, { mcData }), [
    { action: 'craftCommand', target: 'furnace', count: 1 },
    { action: 'smeltCommand', target: 'iron_ingot', count: 3 }
  ]);
});

test('주변에 화로가 있으면 새 화로를 제작하지 않는다', () => {
  const bot = botWith([
    { name: 'raw_iron', count: 3 },
    { name: 'coal', count: 1 }
  ], { furnace: true });

  assert.deepEqual(createPlan(bot, {
    action: 'smeltCommand',
    target: 'iron_ingot',
    count: 3
  }, { mcData }), [
    { action: 'smeltCommand', target: 'iron_ingot', count: 3 }
  ]);
});

test('인벤토리에 화로가 있으면 설치는 action에 맡기고 새로 제작하지 않는다', () => {
  const bot = botWith([
    { name: 'raw_iron', count: 3 },
    { name: 'coal', count: 1 },
    { name: 'furnace', count: 1 }
  ]);

  assert.deepEqual(createPlan(bot, {
    action: 'smeltCommand',
    target: 'iron_ingot',
    count: 3
  }, { mcData }), [
    { action: 'smeltCommand', target: 'iron_ingot', count: 3 }
  ]);
});

test('철 또는 석탄이 부족하면 부족한 제련 재료를 명확히 알린다', () => {
  assert.throws(
    () => createPlan(botWith([{ name: 'coal', count: 1 }]), {
      action: 'smeltCommand', target: 'iron_ingot', count: 3
    }, { mcData }),
    error => error instanceof UnsupportedMaterialError && error.itemName === 'raw_iron'
  );

  assert.throws(
    () => createPlan(botWith([{ name: 'raw_iron', count: 3 }]), {
      action: 'smeltCommand', target: 'iron_ingot', count: 3
    }, { mcData }),
    error => error instanceof UnsupportedMaterialError && error.itemName === 'coal'
  );
});

test('smeltCommand 수량은 보유 철괴와 관계없이 추가로 제련할 수량이다', () => {
  assert.deepEqual(createPlan(botWith([
    { name: 'iron_ingot', count: 10 },
    { name: 'raw_iron', count: 2 },
    { name: 'coal', count: 1 }
  ], { furnace: true }), {
    action: 'smeltCommand', target: 'iron_ingot', count: 2
  }, { mcData }), [
    { action: 'smeltCommand', target: 'iron_ingot', count: 2 }
  ]);
});

test('석탄이 없어도 목탄이 있으면 대체 연료로 계획한다', () => {
  assert.deepEqual(createPlan(botWith([
    { name: 'raw_iron', count: 8 },
    { name: 'charcoal', count: 1 }
  ], { furnace: true }), {
    action: 'smeltCommand',
    target: 'iron_ingot',
    count: 8
  }, { mcData }), [
    {
      action: 'smeltCommand',
      target: 'iron_ingot',
      count: 8,
      fuel: 'charcoal'
    }
  ]);
});
