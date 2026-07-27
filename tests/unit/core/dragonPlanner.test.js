const test = require('node:test');
const assert = require('node:assert/strict');
const dragonPlanner = require('../../../src/core/planners/dragonPlanner');

function botWith(items) {
  return { inventory: { items: () => items.map(name => ({ name, count: 1 })) } };
}

test('dragonCommand를 보스 전투 planner로 분류하고 준비 상태를 전달한다', () => {
  const bot = botWith(['iron_sword', 'bow', 'arrow', 'bread']);
  const task = { action: 'dragonCommand', target: 'ender_dragon', count: 1 };
  assert.equal(dragonPlanner.canHandle(task), true);
  const [step] = dragonPlanner.createPlan(bot, task);
  assert.deepEqual(step.readiness, {
    sword: true,
    bow: true,
    arrows: true,
    food: true
  });
});
