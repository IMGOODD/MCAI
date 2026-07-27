const test = require('node:test');
const assert = require('node:assert/strict');
const { equipTool, getItemCount, hasRequiredTool } = require('../../../src/utils/inventory');

function createInventoryBot(items) {
  return { inventory: { items: () => items }, equipCalls: [], async equip(item, destination) { this.equipCalls.push({ item, destination }); } };
}

test('equipTool은 가장 높은 등급의 도구를 장착한다', async () => {
  const ironAxe = { name: 'iron_axe', count: 1 };
  const bot = createInventoryBot([{ name: 'wooden_axe', count: 1 }, ironAxe, { name: 'diamond_pickaxe', count: 1 }]);
  assert.equal(await equipTool(bot, 'axe'), true);
  assert.deepEqual(bot.equipCalls, [{ item: ironAxe, destination: 'hand' }]);
});

test('인벤토리 유틸리티는 곡괭이를 도끼에서 제외하고 아이템 수량을 합산한다', async () => {
  const bot = createInventoryBot([{ name: 'iron_pickaxe', count: 1 }, { name: 'oak_log', count: 4 }, { name: 'birch_log', count: 2 }]);
  assert.equal(await equipTool(bot, 'axe'), false);
  assert.equal(await hasRequiredTool(bot, 'pickaxe', 'stone'), true);
  assert.equal(await hasRequiredTool(bot, 'pickaxe', 'diamond'), false);
  assert.equal(getItemCount(bot, name => name.endsWith('_log')), 6);
});

test('최소 등급을 지정하면 낮은 등급 도구를 장착하지 않는다', async () => {
  const woodenPickaxe = { name: 'wooden_pickaxe', count: 1 };
  const stonePickaxe = { name: 'stone_pickaxe', count: 1 };
  const bot = createInventoryBot([woodenPickaxe, stonePickaxe]);

  assert.equal(await equipTool(bot, 'pickaxe', 'stone'), true);
  assert.deepEqual(bot.equipCalls, [
    { item: stonePickaxe, destination: 'hand' }
  ]);

  const woodenOnly = createInventoryBot([woodenPickaxe]);
  assert.equal(await equipTool(woodenOnly, 'pickaxe', 'stone'), false);
  assert.deepEqual(woodenOnly.equipCalls, []);
});
