const test = require('node:test');
const assert = require('node:assert/strict');
const minecraftData = require('minecraft-data');
const { createPlan } = require('../../../src/core/planner');

const mcData = minecraftData('1.20.1');

function botWith(items = []) {
  return { version: '1.20.1', inventory: { items: () => items } };
}

test('돌 수집은 minecraft-data 레시피를 따라 최소 나무 곡괭이를 준비한다', () => {
  const task = { action: 'collectCommand', target: 'stone', count: 64 };
  const plan = createPlan(botWith(), task);
  assert.equal(plan.some(step => step.target === 'crafting_table'), true);
  assert.equal(plan.some(step =>
    step.action === 'craftCommand' &&
    step.target === 'wooden_pickaxe' &&
    step.count === 2
  ), true);
  assert.deepEqual(plan.at(-1), task);
});

test('보유 아이템은 재료와 최종 채집 수량에서 제외한다', () => {
  const task = { action: 'collectCommand', target: 'stone', count: 64 };
  const bot = botWith([
    { name: 'crafting_table', count: 1 },
    { name: 'oak_planks', count: 3 },
    { name: 'stick', count: 2 },
    { name: 'cobblestone', count: 1 }
  ]);
  const plan = createPlan(bot, task);
  assert.equal(plan.some(step =>
    step.action === 'craftCommand' &&
    step.target === 'wooden_pickaxe' &&
    step.count === 2
  ), true);
  assert.deepEqual(plan.at(-1), {
    action: 'collectCommand',
    target: 'stone',
    count: 63,
    deliveryCount: 64
  });
});

test('stone_pickaxe 제작은 재료와 채집 도구를 재귀적으로 계획한다', () => {
  const plan = createPlan(botWith(), { action: 'craftCommand', target: 'stone_pickaxe', count: 1 });
  assert.deepEqual(plan.slice(-3), [
    { action: 'craftCommand', target: 'wooden_pickaxe', count: 1 },
    { action: 'collectResourceCommand', target: 'stone', count: 3, expectedItem: 'cobblestone' },
    { action: 'craftCommand', target: 'stone_pickaxe', count: 1 }
  ]);
  assert.equal(plan.some(step => step.target === 'crafting_table'), true);
});

test('3x3 제작에는 제작대를 자동으로 준비하고 보유 통나무 종류를 사용한다', () => {
  const plan = createPlan(botWith([{ name: 'spruce_log', count: 3 }]), {
    action: 'craftCommand', target: 'wooden_pickaxe', count: 1
  });
  assert.equal(plan.some(step => step.target === 'crafting_table'), true);
  assert.equal(plan.some(step => step.action === 'collectResourceCommand' && step.target === 'log'), false);
  assert.equal(plan.filter(step => step.target === 'planks').length, 3);
});

test('보유 판자가 부족하면 같은 나무 종류의 통나무를 추가로 채집한다', () => {
  const plan = createPlan(botWith([
    { name: 'dark_oak_planks', count: 1 },
    { name: 'stick', count: 2 }
  ]), {
    action: 'craftCommand', target: 'wooden_axe', count: 1
  });

  assert.equal(plan.some(step =>
    step.action === 'collectResourceCommand' &&
    step.target === 'log' &&
    step.expectedItem === 'dark_oak_log'
  ), true);
});

test('보유 목재가 없으면 oak_log로 고정하지 않고 주변 원목을 채집한다', () => {
  const plan = createPlan(botWith([
    { name: 'iron_ingot', count: 3 },
    { name: 'crafting_table', count: 1 }
  ]), { action: 'craftCommand', target: 'iron_pickaxe', count: 1 });

  const logSteps = plan.filter(step =>
    step.action === 'collectResourceCommand' && step.target === 'log'
  );
  assert.equal(logSteps.length > 0, true);
  assert.equal(logSteps.every(step => step.expectedItem == null), true);
});

test('주변에 제작대가 있으면 새 제작대를 만들지 않는다', () => {
  const bot = botWith();
  bot.findBlock = () => ({ name: 'crafting_table' });
  const plan = createPlan(bot, { action: 'craftCommand', target: 'wooden_axe', count: 1 });
  assert.equal(plan.some(step => step.target === 'crafting_table'), false);
  assert.deepEqual(plan.at(-1), { action: 'craftCommand', target: 'wooden_axe', count: 1 });
});

test('이미 최종 아이템을 충분히 보유하면 제작 작업을 만들지 않는다', () => {
  const task = { action: 'craftCommand', target: 'diamond_hoe', count: 1 };
  assert.deepEqual(createPlan(botWith([{ name: 'diamond_hoe', count: 1 }]), task), []);
});

test('diamond_hoe도 전용 규칙 없이 minecraft-data 레시피로 계획한다', () => {
  const plan = createPlan(botWith([{ name: 'diamond', count: 2 }]), {
    action: 'craftCommand', target: 'diamond_hoe', count: 1
  });
  assert.equal(plan.some(step => step.target === 'stick'), true);
  assert.deepEqual(plan.at(-1), { action: 'craftCommand', target: 'diamond_hoe', count: 1 });
});

test('철 도구 제작은 원광, 연료, 화로와 제련을 재귀적으로 계획한다', () => {
  const plan = createPlan(botWith([
    { name: 'raw_iron', count: 3 },
    { name: 'coal', count: 1 },
    { name: 'cobblestone', count: 8 },
    { name: 'stick', count: 2 },
    { name: 'crafting_table', count: 1 }
  ]), { action: 'craftCommand', target: 'iron_pickaxe', count: 1 });

  assert.deepEqual(plan, [
    { action: 'craftCommand', target: 'furnace', count: 1 },
    { action: 'smeltCommand', target: 'iron_ingot', count: 3 },
    { action: 'craftCommand', target: 'iron_pickaxe', count: 1 }
  ]);
});

test('철검 제작은 보유 철괴를 제외하고 부족한 철괴와 석탄만 준비한다', () => {
  const bot = botWith([
    { name: 'cobblestone', count: 56 },
    { name: 'raw_iron', count: 24 },
    { name: 'iron_ingot', count: 1 },
    { name: 'crafting_table', count: 1 },
    { name: 'stone_pickaxe', count: 1 }
  ]);
  bot.findBlock = ({ matching }) => (
    matching === mcData.blocksByName.crafting_table.id ? { name: 'crafting_table' } : null
  );

  const plan = createPlan(bot, { action: 'craftCommand', target: 'iron_sword', count: 1 });

  assert.equal(plan.some(step =>
    step.action === 'collectResourceCommand' && step.target === 'coal' && step.count === 1
  ), true);
  assert.equal(plan.some(step =>
    step.action === 'smeltCommand' && step.target === 'iron_ingot' && step.count === 1
  ), true);
  assert.deepEqual(plan.at(-1), { action: 'craftCommand', target: 'iron_sword', count: 1 });
});

test('범용 확장 대상이 아닌 명령은 그대로 유지한다', () => {
  const task = { action: 'replyCommand', target: 'hello', count: 0 };
  assert.deepEqual(createPlan(botWith(), task), [task]);
});

test('석탄 채집은 최소 나무 곡괭이를 재귀적으로 준비한다', () => {
  const task = { action: 'collectCommand', target: 'coal', count: 8 };
  const plan = createPlan(botWith(), task);

  assert.equal(plan.some(step => step.target === 'wooden_pickaxe'), true);
  assert.deepEqual(plan.at(-1), task);
});

test('철 채집은 나무 곡괭이로 돌을 캐서 돌 곡괭이까지 준비한다', () => {
  const task = { action: 'collectCommand', target: 'iron', count: 3 };
  const plan = createPlan(botWith(), task);

  assert.equal(plan.some(step => step.target === 'wooden_pickaxe'), true);
  assert.equal(plan.some(step =>
    step.action === 'collectResourceCommand' &&
    step.target === 'stone' &&
    step.expectedItem === 'cobblestone'
  ), true);
  assert.equal(plan.some(step => step.target === 'stone_pickaxe'), true);
  assert.deepEqual(plan.at(-1), task);
});

test('보유한 석탄과 철 원석은 최종 채집 수량에서 제외한다', () => {
  const coalPlan = createPlan(botWith([
    { name: 'wooden_pickaxe', count: 1 },
    { name: 'coal', count: 3 }
  ]), { action: 'collectCommand', target: 'coal', count: 8 });
  const ironPlan = createPlan(botWith([
    { name: 'stone_pickaxe', count: 1 },
    { name: 'raw_iron', count: 2 }
  ]), { action: 'collectCommand', target: 'iron', count: 3 });

  assert.deepEqual(coalPlan, [{ action: 'collectCommand', target: 'coal', count: 5, deliveryCount: 8 }]);
  assert.deepEqual(ironPlan, [{ action: 'collectCommand', target: 'iron', count: 1, deliveryCount: 3 }]);
});
