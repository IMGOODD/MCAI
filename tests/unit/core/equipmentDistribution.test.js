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

test('여러 벌을 제작하면 지정 수량을 전달하고 한 벌을 장착한다', () => {
  const plan = createPlan(botWith([
    { name: 'iron_ingot', count: 48, slot: 9 },
    { name: 'crafting_table', count: 1, slot: 10 }
  ]), {
    action: 'equipmentCommand',
    target: 'iron_armor_set',
    count: 2,
    keep: 1,
    give: 1
  });

  for (const itemName of [
    'iron_helmet',
    'iron_chestplate',
    'iron_leggings',
    'iron_boots'
  ]) {
    assert.deepEqual(plan.filter(step => step.target === itemName), [
      { action: 'craftCommand', target: itemName, count: 2 },
      {
        action: 'tossCommand',
        target: itemName,
        count: 1,
        excludeEquipmentSlots: true
      },
      { action: 'equipCommand', target: itemName, count: 1 }
    ]);
  }
});

test('count, keep, give 배분은 임의 수량으로 확장된다', () => {
  const plan = createPlan(botWith([
    { name: 'iron_ingot', count: 15, slot: 9 },
    { name: 'crafting_table', count: 1, slot: 10 }
  ]), {
    action: 'equipmentCommand',
    target: 'iron_helmet',
    count: 3,
    keep: 1,
    give: 2
  });

  assert.deepEqual(plan, [
    { action: 'craftCommand', target: 'iron_helmet', count: 3 },
    {
      action: 'tossCommand',
      target: 'iron_helmet',
      count: 2,
      excludeEquipmentSlots: true
    },
    { action: 'equipCommand', target: 'iron_helmet', count: 1 }
  ]);
});

test('전체 수량과 보관 및 전달 수량이 다르면 계획을 거부한다', () => {
  assert.throws(
    () => createPlan(botWith(), {
      action: 'equipmentCommand',
      target: 'iron_helmet',
      count: 3,
      keep: 1,
      give: 1
    }),
    /장비 배분 수량/
  );
});
