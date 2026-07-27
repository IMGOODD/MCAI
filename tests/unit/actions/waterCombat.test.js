const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getWaterDepth,
  performWaterCombat
} = require('../../../src/actions/waterCombat');

function position(x, y = 64, z = 0) {
  return {
    x, y, z,
    distanceTo(other) {
      return Math.hypot(x - other.x, y - other.y, z - other.z);
    },
    offset(dx, dy, dz) {
      return position(x + dx, y + dy, z + dz);
    }
  };
}

function blockAtDepth(waterTop, waterDepth) {
  return blockPosition => {
    const inWater = blockPosition.y <= waterTop &&
      blockPosition.y > waterTop - waterDepth;
    return { name: inWater ? 'water' : 'stone' };
  };
}

test('water depth is measured from the entity surface to the floor', () => {
  const bot = { blockAt: blockAtDepth(63, 2) };

  assert.equal(getWaterDepth(bot, position(0, 64.2, 0)), 2);
});

test('shallow-water combat attacks the target and completes', async () => {
  const movement = {
    liquidCost: 4,
    blocksToAvoid: new Set([1])
  };
  let attacks = 0;
  const bot = {
    health: 20,
    oxygenLevel: 20,
    isStopped: false,
    isCombatActive: false,
    entity: { position: position(0), isInWater: false },
    registry: { blocksByName: { water: { id: 1 } } },
    blockAt: blockAtDepth(63, 1),
    pathfinder: { movements: movement, setGoal() {} },
    setControlState() {},
    async lookAt() {},
    async attack(target) {
      attacks += 1;
      target.isValid = false;
    },
    async waitForTicks() {}
  };
  const target = {
    name: 'cow',
    isValid: true,
    position: position(2),
    height: 1.4
  };

  const result = await performWaterCombat(bot, target);

  assert.equal(result.success, true);
  assert.equal(result.code, 'TARGET_DEFEATED');
  assert.equal(result.data.mode, 'water');
  assert.equal(attacks, 1);
  assert.equal(bot.isCombatActive, false);
  assert.equal(movement.liquidCost, 4);
  assert.equal(movement.blocksToAvoid.has(1), true);
});

test('low oxygen exits water before returning control to hunting', async () => {
  const bot = {
    health: 20,
    oxygenLevel: 6,
    isStopped: false,
    isCombatActive: false,
    entity: { position: position(0, 63), isInWater: true },
    blockAt: blockAtDepth(63, 2),
    pathfinder: { setGoal() {} },
    setControlState() {},
    async waitForTicks() {}
  };
  const target = {
    name: 'chicken',
    isValid: true,
    position: position(2, 64),
    height: 0.7
  };
  let recoveries = 0;

  const result = await performWaterCombat(bot, target, {
    recoverFromWater: async () => {
      recoveries += 1;
      bot.entity.isInWater = false;
      bot.entity.position = position(0, 64);
      bot.oxygenLevel = 20;
      return true;
    }
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'WATER_COMBAT_RECOVERED');
  assert.equal(result.data.reason, 'WATER_COMBAT_LOW_OXYGEN');
  assert.equal(recoveries, 1);
  assert.equal(bot.entity.isInWater, false);
  assert.equal(bot.isCombatActive, false);
});
