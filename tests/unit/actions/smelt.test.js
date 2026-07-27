const test = require('node:test');
const assert = require('node:assert/strict');
const { fuelRequired, smeltItem } = require('../../../src/actions/smelt');
const { createBot } = require('../../helpers/createBot');

const mcData = {
  blocksByName: { furnace: { id: 61 } },
  itemsByName: {
    raw_iron: { id: 1001 },
    coal: { id: 1002 },
    iron_ingot: { id: 1003 }
  }
};

function position(x, y, z) {
  return { x, y, z };
}

test('fuelRequired는 석탄 한 개당 8개 제련으로 계산한다', () => {
  assert.equal(fuelRequired(1), 1);
  assert.equal(fuelRequired(8), 1);
  assert.equal(fuelRequired(9), 2);
});

test('smeltItem은 주변 화로에 철 원석과 석탄을 넣고 결과물을 회수한다', async () => {
  const furnaceBlock = { name: 'furnace', position: position(10, 64, 10) };
  const calls = [];
  let output = null;
  let closed = false;
  const furnace = {
    progress: 1,
    fuel: 0.5,
    inputItem: () => null,
    fuelItem: () => null,
    outputItem: () => output,
    async putInput(type, metadata, count) { calls.push(['input', type, metadata, count]); },
    async putFuel(type, metadata, count) {
      calls.push(['fuel', type, metadata, count]);
      output = { name: 'iron_ingot', count: 3 };
    },
    async takeOutput() { calls.push(['take']); return output; },
    close() { closed = true; }
  };
  const bot = createBot({
    isBusy: false,
    inventory: {
      items: () => [
        { name: 'raw_iron', type: 1001, count: 3 },
        { name: 'coal', type: 1002, count: 1 }
      ]
    },
    findBlock: () => furnaceBlock,
    pathfinder: {
      async goto(goal) { calls.push(['goto', goal.x, goal.y, goal.z]); },
      setGoal() {}
    },
    openFurnace: async block => {
      assert.equal(block, furnaceBlock);
      return furnace;
    },
    waitForTicks: async () => {}
  });

  const result = await smeltItem(bot, mcData, 'iron_ingot', 3);

  assert.equal(result.success, true);
  assert.equal(result.code, 'SMELT_COMPLETED');
  assert.equal(result.data.smelted, 3);
  assert.equal(result.data.fuelUsed, 1);
  assert.deepEqual(calls, [
    ['goto', 10, 64, 10],
    ['input', 1001, null, 3],
    ['fuel', 1002, null, 1],
    ['take']
  ]);
  assert.equal(closed, true);
});

test('smeltItem은 원료나 연료가 부족하면 필요한 수량을 반환한다', async () => {
  const bot = createBot({
    inventory: { items: () => [{ name: 'raw_iron', type: 1001, count: 2 }] }
  });

  const result = await smeltItem(bot, mcData, 'iron_ingot', 3);

  assert.equal(result.success, false);
  assert.equal(result.code, 'SMELT_MATERIALS_MISSING');
  assert.deepEqual(result.data.input, { name: 'raw_iron', required: 3, available: 2 });
  assert.deepEqual(result.data.fuel, { name: 'coal', required: 1, available: 0 });
});

test('smeltItem은 사용 중인 화로를 덮어쓰지 않는다', async () => {
  const furnaceBlock = { name: 'furnace', position: position(10, 64, 10) };
  const furnace = {
    inputItem: () => ({ name: 'sand', count: 1 }),
    fuelItem: () => null,
    outputItem: () => null,
    close() {}
  };
  const bot = createBot({
    inventory: {
      items: () => [
        { name: 'raw_iron', count: 1 },
        { name: 'coal', count: 1 }
      ]
    },
    findBlock: () => furnaceBlock,
    pathfinder: { async goto() {}, setGoal() {} },
    openFurnace: async () => furnace
  });

  const result = await smeltItem(bot, mcData, 'iron_ingot', 1);
  assert.equal(result.success, false);
  assert.equal(result.code, 'FURNACE_OCCUPIED');
  assert.equal(result.data.input, 'sand');
});

test('화로 연료 칸에 같은 석탄이 남아 있으면 재사용한다', async () => {
  const furnaceBlock = { name: 'furnace', position: position(10, 64, 10) };
  const calls = [];
  let output = null;
  const furnace = {
    progress: 1,
    fuel: 0.5,
    inputItem: () => null,
    fuelItem: () => ({ name: 'coal', count: 1 }),
    outputItem: () => output,
    async putInput(type, metadata, count) {
      calls.push(['input', type, metadata, count]);
      output = { name: 'iron_ingot', count };
    },
    async putFuel(type, metadata, count) {
      calls.push(['fuel', type, metadata, count]);
    },
    async takeOutput() { return output; },
    close() {}
  };
  const bot = createBot({
    inventory: {
      items: () => [
        { name: 'raw_iron', type: 1001, count: 8 },
        { name: 'coal', type: 1002, count: 1 }
      ]
    },
    findBlock: () => furnaceBlock,
    pathfinder: { async goto() {}, setGoal() {} },
    openFurnace: async () => furnace,
    waitForTicks: async () => {}
  });

  const result = await smeltItem(bot, mcData, 'iron_ingot', 8);

  assert.equal(result.success, true);
  assert.equal(result.data.fuelInFurnace, 1);
  assert.equal(result.data.fuelUsed, 0);
  assert.deepEqual(calls, [['input', 1001, null, 8]]);
});
