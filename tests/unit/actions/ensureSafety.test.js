const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ensureSafety,
  isDrySafeGround,
  findSafeGroundByScan
} = require('../../../src/actions/ensureSafety');

function position() {
  return { offset: (x, y, z) => ({ x, y, z }) };
}

test('안전 지면은 발과 머리 공간이 비어 있고 주변에 물이 없어야 한다', () => {
  const ground = { name: 'stone', boundingBox: 'block', position: position() };
  const dryBot = { blockAt: () => ({ name: 'air', boundingBox: 'empty' }) };
  const wetBot = { blockAt: pos => pos.x === 1 ? { name: 'water', boundingBox: 'empty' } : { name: 'air', boundingBox: 'empty' } };

  assert.equal(isDrySafeGround(dryBot, ground), true);
  assert.equal(isDrySafeGround(wetBot, ground), false);
});

test('findBlocks가 놓친 마른 지면을 현재 좌표 주변 직접 탐색으로 찾는다', () => {
  const makePosition = (x, y, z) => ({
    x,
    y,
    z,
    offset(dx, dy, dz) {
      return makePosition(x + dx, y + dy, z + dz);
    }
  });
  const safePosition = makePosition(2, 65, 0);
  const bot = {
    entity: { position: makePosition(0, 64, 0) },
    blockAt(pos) {
      if (pos.x === safePosition.x && pos.y === safePosition.y && pos.z === safePosition.z) {
        return { name: 'stone', boundingBox: 'block', position: safePosition };
      }
      return { name: 'air', boundingBox: 'empty', position: pos };
    }
  };

  const found = findSafeGroundByScan(bot, 4, 4, 2);
  assert.equal(found?.position, safePosition);
});

test('안전 지점에 도착해도 여전히 물속이면 복구 실패로 반환한다', async () => {
  const groundPosition = {
    x: 10,
    y: 63,
    z: 10,
    offset: (x, y, z) => ({ x: 10 + x, y: 63 + y, z: 10 + z })
  };
  const ground = { name: 'stone', boundingBox: 'block', position: groundPosition };
  const bot = {
    entity: { isInWater: true, position: { x: 10, y: 62, z: 10 } },
    health: 20,
    oxygenLevel: 15,
    isStopped: false,
    pathfinder: {
      movements: { liquidCost: 100, blocksToAvoid: new Set() },
      setGoal() {},
      async goto() {}
    },
    findBlocks: () => [groundPosition],
    blockAt: pos => pos === groundPosition ? ground : { name: 'air', boundingBox: 'empty' },
    waitForTicks: async () => {},
    stopDigging() {}
  };

  assert.equal(await ensureSafety(bot, 'water_before_collection'), false);
});

test('물속에서는 안전 이동 동안만 물 회피 설정을 풀고 원래대로 복구한다', async () => {
  const groundPosition = { x: 10, y: 63, z: 10, offset: (x, y, z) => ({ x: 10 + x, y: 63 + y, z: 10 + z }) };
  const ground = { name: 'stone', boundingBox: 'block', position: groundPosition };
  const movements = { liquidCost: 100, blocksToAvoid: new Set([1, 2, 3]) };
  const bot = {
    entity: { isInWater: true, position: { x: 10, y: 62, z: 10 } },
    health: 20,
    oxygenLevel: 15,
    isStopped: false,
    registry: {
      blocksByName: {
        water: { id: 1 },
        flowing_water: { id: 2 },
        bubble_column: { id: 3 }
      }
    },
    pathfinder: {
      movements,
      setGoal() {},
      async goto() {
        assert.equal(movements.blocksToAvoid.size, 0);
        bot.entity.isInWater = false;
      }
    },
    findBlocks: () => [groundPosition],
    blockAt: pos => pos === groundPosition ? ground : { name: 'air', boundingBox: 'empty' },
    waitForTicks: async () => {},
    stopDigging() {}
  };

  assert.equal(await ensureSafety(bot, 'water_before_collection'), true);
  assert.equal(bot.entity.isInWater, false);
  assert.equal(movements.liquidCost, 100);
  assert.deepEqual([...movements.blocksToAvoid].sort(), [1, 2, 3]);
  assert.equal(bot.isStopped, false);
  assert.equal(bot.isSafetyActive, false);
});
