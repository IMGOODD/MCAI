const test = require('node:test');
const assert = require('node:assert/strict');
const { craftTool, resolveItemName } = require('../../../src/actions/craft');
const { createBot } = require('../../helpers/createBot');

test('craftTool은 제작대를 찾거나 설치할 수 없으면 false를 반환한다', async () => {
  const mcData = { blocksByName: { crafting_table: { id: 58 } }, itemsByName: {} };
  assert.equal(await craftTool(createBot(), mcData, 'wooden_axe'), false);
});

test('planks 요청은 보유한 통나무 종류에 맞는 판자로 변환한다', () => {
  const bot = createBot({ inventory: { items: () => [{ name: 'oak_log', count: 1 }] } });
  assert.equal(resolveItemName(bot, 'planks'), 'oak_planks');
  assert.equal(resolveItemName(createBot(), 'planks'), null);
});

test('제작대 windowOpen 시간 초과 시 제작대에 다시 접근해 한 번 재시도한다', async () => {
  const tablePosition = { x: 10, y: 64, z: 10 };
  const table = { name: 'crafting_table', position: tablePosition };
  const recipe = { result: { count: 1 }, requiresTable: true };
  let craftCalls = 0;
  let gotoCalls = 0;
  const bot = createBot({
    world: {},
    inventory: { items: () => [{ name: 'iron_ingot', count: 3 }, { name: 'stick', count: 2 }] },
    findBlock: () => table,
    blockAt: () => table,
    recipesFor: (id, metadata, count, craftingTable) => craftingTable ? [recipe] : [],
    pathfinder: {
      async goto() { gotoCalls++; },
      setGoal() {}
    },
    waitForTicks: async () => {},
    async craft() {
      craftCalls++;
      if (craftCalls === 1) throw new Error('Event windowOpen did not fire within timeout of 20000ms');
    }
  });
  const mcData = {
    blocksByName: { crafting_table: { id: 58 } },
    itemsByName: { iron_pickaxe: { id: 257 } },
    items: []
  };

  assert.equal(await craftTool(bot, mcData, 'iron_pickaxe'), true);
  assert.equal(craftCalls, 2);
  assert.equal(gotoCalls, 2);
});
