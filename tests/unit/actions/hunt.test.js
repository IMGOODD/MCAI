const test = require('node:test');
const assert = require('node:assert/strict');
const { isEligibleAnimal, findHuntTarget } = require('../../../src/actions/hunt');
const { huntResource } = require('../../../src/actions/hunt');
const { getHuntingResource } = require('../../../src/data/huntingData');

function position(x, y = 64, z = 0) {
  return {
    x, y, z,
    distanceTo(other) {
      return Math.hypot(x - other.x, y - other.y, z - other.z);
    }
  };
}

function botWith(entities) {
  return {
    entity: { position: position(0) },
    entities: Object.fromEntries(entities.map(entity => [entity.id, entity])),
    blockAt: () => ({ name: 'grass_block' })
  };
}

test('사냥 대상에서 새끼, 이름표 개체와 물속 동물을 제외한다', () => {
  const resource = getHuntingResource('meat');
  const bot = botWith([]);
  const adultCow = { id: 1, name: 'cow', height: 1.4, isValid: true, position: position(3) };

  assert.equal(isEligibleAnimal(bot, adultCow, resource), true);
  assert.equal(isEligibleAnimal(bot, { ...adultCow, isBaby: true }, resource), false);
  assert.equal(isEligibleAnimal(bot, { ...adultCow, customName: '목장소' }, resource), false);

  const waterBot = { ...bot, blockAt: () => ({ name: 'water' }) };
  assert.equal(isEligibleAnimal(waterBot, adultCow, resource), false);
});

test('요청한 고기를 주는 성체 중 가장 가까운 동물을 고른다', () => {
  const pig = { id: 1, name: 'pig', height: 0.9, isValid: true, position: position(8) };
  const cow = { id: 2, name: 'cow', height: 1.4, isValid: true, position: position(4) };
  const sheep = { id: 3, name: 'sheep', height: 1.3, isValid: true, position: position(2) };
  const bot = botWith([pig, cow, sheep]);

  assert.equal(findHuntTarget(bot, getHuntingResource('meat')).id, cow.id);
  assert.equal(findHuntTarget(bot, getHuntingResource('porkchop')).id, pig.id);
});

test('특정 동물 사냥은 드롭을 줍지 못해도 실제 처치 마릿수로 완료한다', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const bot = {
    ...botWith([cow]),
    health: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };
  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'kills',
    equipWeapon: async () => true,
    attackTarget: async () => {
      cow.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 2 } };
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, true);
  assert.equal(result.data.hunted, 1);
  assert.equal(result.data.acquired, 0);
  assert.equal(result.data.countMode, 'kills');
});

test('사냥 중 추격 제한에 걸려도 같은 동물을 다시 공격한다', async () => {
  const firstCow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(40)
  };
  const secondCow = {
    id: 2,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(4)
  };
  const bot = {
    ...botWith([firstCow, secondCow]),
    health: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };
  const attackedIds = [];

  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'kills',
    searchRadius: 64,
    equipWeapon: async () => true,
    attackTarget: async (_bot, animal) => {
      attackedIds.push(animal.id);
      if (attackedIds.length <= 4) {
        return {
          success: false,
          code: 'COMBAT_LEASH_EXCEEDED',
          data: { attacks: 1 }
        };
      }
      animal.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 2 } };
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, true);
  assert.deepEqual(attackedIds, [
    secondCow.id,
    secondCow.id,
    secondCow.id,
    secondCow.id,
    secondCow.id
  ]);
});

test('기본 사냥 검색 범위는 24칸 밖의 동물도 포함한다', () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(48)
  };
  const bot = botWith([cow]);

  assert.equal(findHuntTarget(bot, getHuntingResource('beef')).id, cow.id);
});

test('until_empty 모드는 주변의 사냥 가능한 동물이 없어질 때까지 반복한다', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const sheep = {
    id: 2,
    name: 'sheep',
    height: 1.3,
    isValid: true,
    position: position(5)
  };
  const bot = {
    ...botWith([cow, sheep]),
    health: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };
  const attacked = [];

  const result = await huntResource(bot, 'animals', 1, {
    countMode: 'until_empty',
    equipWeapon: async () => true,
    attackTarget: async (_bot, animal) => {
      attacked.push(animal.name);
      animal.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 1 } };
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, true);
  assert.equal(result.code, 'HUNT_AREA_CLEARED');
  assert.equal(result.data.requested, null);
  assert.equal(result.data.hunted, 2);
  assert.deepEqual(attacked, ['cow', 'sheep']);
});

test('특정 동물 until_empty 모드는 다른 종류를 공격하지 않는다', async () => {
  const sheep = {
    id: 1,
    name: 'sheep',
    height: 1.3,
    isValid: true,
    position: position(3)
  };
  const pig = {
    id: 2,
    name: 'pig',
    height: 0.9,
    isValid: true,
    position: position(2)
  };
  const bot = {
    ...botWith([sheep, pig]),
    health: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };

  const result = await huntResource(bot, 'sheep', 1, {
    countMode: 'until_empty',
    equipWeapon: async () => true,
    attackTarget: async (_bot, animal) => {
      animal.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 1 } };
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, true);
  assert.equal(result.data.hunted, 1);
  assert.equal(sheep.isValid, false);
  assert.equal(pig.isValid, true);
});

test('사냥 중 물에 빠지면 복구한 뒤 잠근 대상을 계속 사냥한다', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const bot = {
    ...botWith([cow]),
    health: 20,
    isStopped: false,
    entity: { position: position(0), isInWater: true },
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };
  let combatCalls = 0;

  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'kills',
    equipWeapon: async () => true,
    attackTarget: async () => {
      combatCalls += 1;
      if (combatCalls === 1) {
        return { success: false, code: 'COMBAT_WATER_RISK', data: { attacks: 0 } };
      }
      cow.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 1 } };
    },
    recoverFromWater: async () => {
      bot.entity.isInWater = false;
      return true;
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, true);
  assert.equal(result.data.hunted, 1);
  assert.equal(combatCalls, 2);
});

test('물 탈출에 실패하면 전체 사냥 완료로 잘못 처리하지 않는다', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const bot = {
    ...botWith([cow]),
    health: 20,
    isStopped: false,
    entity: { position: position(0), isInWater: true },
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };

  const result = await huntResource(bot, 'animals', 1, {
    countMode: 'until_empty',
    equipWeapon: async () => true,
    attackTarget: async () => ({
      success: false,
      code: 'COMBAT_WATER_RECOVERY_FAILED',
      data: { attacks: 0 }
    }),
    collectDrops: async () => false
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'HUNT_WATER_RECOVERY_FAILED');
});

test('target combat retries are separate from target searches', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const bot = {
    ...botWith([cow]),
    health: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };

  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'until_empty',
    maxSearchAttempts: 10,
    maxTargetRetries: 2,
    equipWeapon: async () => true,
    attackTarget: async () => ({
      success: false,
      code: 'COMBAT_LEASH_EXCEEDED',
      data: { attacks: 0 }
    }),
    collectDrops: async () => false
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'HUNT_TARGET_RETRIES_EXHAUSTED');
  assert.equal(result.data.searchAttempts, 2);
  assert.equal(result.data.combatRetries, 2);
  assert.equal(result.data.hunted, 0);
  assert.equal(result.data.retryExhaustedTargets, 1);
});

test('until_empty reports when the target search limit is exhausted', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const bot = {
    ...botWith([cow]),
    health: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };

  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'until_empty',
    maxSearchAttempts: 1,
    equipWeapon: async () => true,
    attackTarget: async (_bot, animal) => {
      animal.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 1 } };
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'HUNT_ATTEMPTS_EXHAUSTED');
  assert.equal(result.data.searchAttempts, 1);
  assert.equal(result.data.combatRetries, 0);
  assert.equal(result.data.hunted, 1);
});

test('low health has a dedicated hunt failure code', async () => {
  const bot = {
    ...botWith([]),
    health: 7,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    async waitForTicks() {}
  };

  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'until_empty'
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'HUNT_LOW_HEALTH');
  assert.equal(result.data.searchAttempts, 0);
  assert.equal(result.data.hunted, 0);
});

test('hunt routes a shallow-water animal to water combat', async () => {
  const cow = {
    id: 1,
    name: 'cow',
    height: 1.4,
    isValid: true,
    position: position(3)
  };
  const bot = {
    ...botWith([cow]),
    health: 20,
    oxygenLevel: 20,
    isStopped: false,
    inventory: { items: () => [] },
    heldItem: null,
    blockAt(blockPosition) {
      return blockPosition.y === 63 ? { name: 'water' } : { name: 'air' };
    },
    async waitForTicks() {}
  };
  let waterCombatCalls = 0;

  const result = await huntResource(bot, 'cow', 1, {
    countMode: 'kills',
    equipWeapon: async () => true,
    attackTarget: async () => {
      throw new Error('land combat should not be selected');
    },
    waterAttackTarget: async (_bot, animal) => {
      waterCombatCalls += 1;
      animal.isValid = false;
      return { success: true, code: 'TARGET_DEFEATED', data: { attacks: 1 } };
    },
    collectDrops: async () => false
  });

  assert.equal(result.success, true);
  assert.equal(result.data.hunted, 1);
  assert.equal(waterCombatCalls, 1);
});
