const test = require('node:test');
const assert = require('node:assert/strict');
const { findOrPlaceFurnace } = require('../../../src/actions/smelt');

test('현재 위치에서 화로를 못 찾으면 planner가 기록한 좌표로 복귀한다', async () => {
  const furnace = {
    name: 'furnace',
    position: { x: 100, y: 64, z: 100 }
  };
  let searchCount = 0;
  const goals = [];
  const bot = {
    inventory: { items: () => [] },
    findBlock() {
      searchCount += 1;
      return searchCount === 1 ? null : furnace;
    },
    pathfinder: {
      async goto(goal) { goals.push(goal); },
      setGoal() {}
    }
  };
  const mcData = { blocksByName: { furnace: { id: 61 } } };

  const found = await findOrPlaceFurnace(bot, mcData, furnace.position);

  assert.equal(found, furnace);
  assert.equal(searchCount, 2);
  assert.equal(goals.length, 1);
  assert.deepEqual(
    { x: goals[0].x, y: goals[0].y, z: goals[0].z },
    { x: 100, y: 64, z: 100 }
  );
});
