const test = require('node:test');
const assert = require('node:assert/strict');
const { collectResource, isToolMandatory } = require('../../../src/actions/collect');
const { collectAllItems, droppedItemName } = require('../../../src/actions/itemSearch');
const { createBot } = require('../../helpers/createBot');

test('collectResource는 지원하지 않는 자원 요청을 거절한다', async () => {
  assert.equal(await collectResource(createBot(), { blocksArray: [] }, 'unknown_resource', 1), false);
});

test('드롭 아이템은 getDroppedItem API로 이름을 판별한다', () => {
  const entity = { name: 'item', getDroppedItem: () => ({ name: 'oak_log' }) };
  assert.equal(droppedItemName(entity, { items: [] }), 'oak_log');
  assert.equal(droppedItemName({ name: 'zombie' }, { items: [] }), null);
});

test('맨손 채집 자원은 권장 도구가 없어도 채집을 중단하지 않는다', () => {
  assert.equal(isToolMandatory({ tool: 'axe', minTier: 'hand' }), false);
  assert.equal(isToolMandatory({ tool: 'shovel', minTier: 'hand' }), false);
  assert.equal(isToolMandatory({ tool: 'pickaxe', minTier: 'wooden' }), true);
});

test('드롭 아이템 회수는 기존 물 회피 이동 설정을 보존한다', async () => {
  const movements = {
    liquidCost: 100,
    thinkTimeout: 5000,
    blocksToAvoid: new Set([1, 2, 3])
  };
  let setMovementsCalls = 0;
  const bot = createBot({
    pathfinder: {
      movements,
      setGoal() {},
      setMovements() { setMovementsCalls++; }
    },
    waitForTicks: async () => {},
    nearestEntity: () => null
  });

  await collectAllItems(bot, 'stone');

  assert.equal(bot.pathfinder.movements, movements);
  assert.equal(setMovementsCalls, 0);
  assert.equal(movements.liquidCost, 100);
  assert.equal(movements.thinkTimeout, 5000);
  assert.deepEqual([...movements.blocksToAvoid], [1, 2, 3]);
});
