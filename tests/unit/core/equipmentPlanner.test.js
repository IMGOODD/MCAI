const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlan } = require('../../../src/core/planner');

function botWith(items = []) {
  return {
    version: '1.20.1',
    inventory: { items: () => items },
    findBlock: () => null
  };
}

test('보유한 방어구는 제작하지 않고 바로 장착한다', () => {
  const plan = createPlan(botWith([
    { name: 'netherite_helmet', count: 1, slot: 9 }
  ]), {
    action: 'equipmentCommand',
    target: 'netherite_helmet',
    count: 1
  });

  assert.deepEqual(plan, [
    { action: 'equipCommand', target: 'netherite_helmet', count: 1 }
  ]);
});

test('철 방어구 한 벌은 공유 재고로 네 부위를 제작한 뒤 장착한다', () => {
  const plan = createPlan(botWith([
    { name: 'iron_ingot', count: 24, slot: 9 },
    { name: 'crafting_table', count: 1, slot: 10 }
  ]), {
    action: 'equipmentCommand',
    target: 'iron_armor_set',
    count: 1
  });

  assert.deepEqual(plan, [
    { action: 'craftCommand', target: 'iron_helmet', count: 1 },
    { action: 'equipCommand', target: 'iron_helmet', count: 1 },
    { action: 'craftCommand', target: 'iron_chestplate', count: 1 },
    { action: 'equipCommand', target: 'iron_chestplate', count: 1 },
    { action: 'craftCommand', target: 'iron_leggings', count: 1 },
    { action: 'equipCommand', target: 'iron_leggings', count: 1 },
    { action: 'craftCommand', target: 'iron_boots', count: 1 },
    { action: 'equipCommand', target: 'iron_boots', count: 1 }
  ]);
});

test('best_armor는 부위별로 가진 장비 중 가장 높은 등급만 선택한다', () => {
  const plan = createPlan(botWith([
    { name: 'iron_helmet', count: 1, slot: 5 },
    { name: 'diamond_helmet', count: 1, slot: 9 },
    { name: 'leather_boots', count: 1, slot: 8 },
    { name: 'netherite_boots', count: 1, slot: 10 }
  ]), {
    action: 'equipmentCommand',
    target: 'best_armor',
    count: 1
  });

  assert.deepEqual(plan, [
    { action: 'equipCommand', target: 'diamond_helmet', count: 1 },
    { action: 'equipCommand', target: 'netherite_boots', count: 1 }
  ]);
});

test('보유하지 않은 네더라이트 방어구는 대장장이 작업 필요를 명확히 알린다', () => {
  assert.throws(
    () => createPlan(botWith(), {
      action: 'equipmentCommand',
      target: 'netherite_chestplate',
      count: 1
    }),
    /대장장이 작업대 업그레이드 기능/
  );
});
