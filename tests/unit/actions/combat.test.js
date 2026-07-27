const test = require('node:test');
const assert = require('node:assert/strict');
const { isEntityInWater, performBoundedAttack } = require('../../../src/actions/combat');

test('전투 대상이 시작 위치의 추격 한계를 벗어나면 공격하지 않는다', async () => {
  let attacks = 0;
  const bot = {
    health: 20,
    isStopped: false,
    entity: { position: { x: 0, y: 64, z: 0 }, isInWater: false },
    blockAt: () => ({ name: 'stone' }),
    pathfinder: { setGoal() {} },
    async attack() { attacks += 1; },
    async lookAt() {},
    async waitForTicks() {}
  };
  const target = {
    name: 'zombie',
    isValid: true,
    position: { x: 20, y: 64, z: 0 },
    height: 1.8
  };

  const result = await performBoundedAttack(bot, target, { maxChaseDistance: 10 });
  assert.equal(result.code, 'COMBAT_LEASH_EXCEEDED');
  assert.equal(attacks, 0);
});

test('전투 중 봇이 물에 빠지면 안전 지면으로 나온 뒤 같은 대상을 계속 공격한다', async () => {
  let recoveries = 0;
  let attacks = 0;
  const bot = {
    health: 20,
    isStopped: false,
    entity: { position: { x: 0, y: 62, z: 0 }, isInWater: true },
    blockAt: () => ({ name: 'stone' }),
    pathfinder: { setGoal() {} },
    async attack(target) {
      attacks += 1;
      target.isValid = false;
    },
    async lookAt() {},
    async waitForTicks() {}
  };
  const target = {
    name: 'cow',
    isValid: true,
    position: { x: 2, y: 64, z: 0 },
    height: 1.4
  };

  const result = await performBoundedAttack(bot, target, {
    recoverFromWater: async () => {
      recoveries += 1;
      bot.entity.isInWater = false;
      bot.entity.position.y = 64;
      return true;
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.code, 'TARGET_DEFEATED');
  assert.equal(result.data.waterRecoveries, 1);
  assert.equal(recoveries, 1);
  assert.equal(attacks, 1);
});

test('발 위치가 공기여도 바로 아래가 물이면 수면 위 대상으로 판별한다', () => {
  const bot = {
    blockAt(position) {
      return position.y === 63
        ? { name: 'water' }
        : { name: 'air' };
    }
  };
  const entity = {
    position: { x: 10.5, y: 64.2, z: 10.5 }
  };

  assert.equal(isEntityInWater(bot, entity), true);
});
