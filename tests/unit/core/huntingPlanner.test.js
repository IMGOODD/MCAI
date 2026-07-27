const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlan } = require('../../../src/core/planner');

function botWith(items = []) {
  return { version: '1.20.1', inventory: { items: () => items } };
}

test('검이 있으면 추가 제작 없이 고기 사냥 목표만 실행한다', () => {
  const plan = createPlan(botWith([{ name: 'stone_sword', count: 1 }]), {
    action: 'huntCommand',
    target: 'meat',
    count: 5
  });
  assert.deepEqual(plan, [{ action: 'huntCommand', target: 'meat', count: 5 }]);
});

test('검이 없으면 planner가 나무 검을 준비한 뒤 사냥한다', () => {
  const plan = createPlan(botWith(), {
    action: 'huntCommand',
    target: 'beef',
    count: 2
  });
  assert.equal(plan.some(step =>
    step.action === 'craftCommand' && step.target === 'wooden_sword'
  ), true);
  assert.deepEqual(plan.at(-1), {
    action: 'huntCommand',
    target: 'beef',
    count: 2
  });
});

test('특정 동물 사냥은 드롭 개수가 아닌 처치 마릿수 모드를 보존한다', () => {
  const plan = createPlan(botWith([{ name: 'iron_sword', count: 1 }]), {
    action: 'huntCommand',
    target: 'cow',
    count: 3,
    countMode: 'kills'
  });
  assert.deepEqual(plan, [{
    action: 'huntCommand',
    target: 'cow',
    count: 3,
    countMode: 'kills'
  }]);
});

test('전체 사냥은 until_empty 모드를 command까지 보존한다', () => {
  const plan = createPlan(botWith([{ name: 'iron_sword', count: 1 }]), {
    action: 'huntCommand',
    target: 'animals',
    count: 0,
    countMode: 'until_empty'
  });

  assert.deepEqual(plan, [{
    action: 'huntCommand',
    target: 'animals',
    count: 1,
    countMode: 'until_empty'
  }]);
});
