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

test('곡괭이의 남은 내구도가 부족하면 예비 곡괭이를 먼저 제작한다', () => {
  const plan = createPlan(botWith([
    {
      name: 'stone_pickaxe',
      count: 1,
      maxDurability: 131,
      durabilityUsed: 130
    },
    { name: 'wooden_pickaxe', count: 1, maxDurability: 59, durabilityUsed: 0 },
    { name: 'cobblestone', count: 3 },
    { name: 'stick', count: 2 },
    { name: 'crafting_table', count: 1 }
  ]), {
    action: 'collectCommand',
    target: 'iron',
    count: 4
  });

  assert.deepEqual(plan, [
    { action: 'craftCommand', target: 'stone_pickaxe', count: 1 },
    { action: 'collectCommand', target: 'iron', count: 4 }
  ]);
});

test('대량 채집은 요청량을 버틸 수량의 곡괭이를 준비한다', () => {
  const plan = createPlan(botWith(), {
    action: 'collectCommand',
    target: 'stone',
    count: 64
  });

  assert.equal(plan.some(step =>
    step.action === 'craftCommand' &&
    step.target === 'wooden_pickaxe' &&
    step.count === 2
  ), true);
  assert.deepEqual(plan.at(-1), {
    action: 'collectCommand',
    target: 'stone',
    count: 64
  });
});
