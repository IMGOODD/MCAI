const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isWoodenDoor,
  isIronDoor,
  isPressurePlate,
  configureDoorInteractions,
  findNearbyClosedDoor,
  doorwayExitPosition,
  crossedDoorPlane,
  passThroughDoor,
  openDoor,
  findPressurePlateForDoor,
  openIronDoorWithPressurePlate,
  closeDoorAfterPassage,
  registerDoorInteractionEvents
} = require('../../../src/actions/doorInteraction');
const { EventEmitter } = require('node:events');
const { Vec3 } = require('vec3');

test('일반 나무 문만 자동 개방 대상으로 판별한다', () => {
  assert.equal(isWoodenDoor({ name: 'oak_door' }), true);
  assert.equal(isWoodenDoor({ name: 'dark_oak_door' }), true);
  assert.equal(isWoodenDoor({ name: 'iron_door' }), false);
  assert.equal(isWoodenDoor({ name: 'oak_trapdoor' }), false);
  assert.equal(isWoodenDoor({ name: 'oak_fence_gate' }), false);
});

test('기존 movement에 나무 문 ID를 추가하고 문 열기를 활성화한다', () => {
  const movements = { canOpenDoors: false, openable: new Set([3]) };
  const mcData = {
    blocksArray: [
      { id: 1, name: 'oak_door' },
      { id: 2, name: 'iron_door' },
      { id: 3, name: 'oak_fence_gate' },
      { id: 4, name: 'birch_door' }
    ]
  };

  assert.equal(configureDoorInteractions({}, mcData, movements), 2);
  assert.equal(movements.canOpenDoors, true);
  assert.deepEqual([...movements.openable].sort(), [1, 3, 4]);
});

test('주변에서 닫힌 나무 문만 찾는다', () => {
  let matcher;
  const closedDoor = {
    name: 'spruce_door',
    getProperties: () => ({ open: false })
  };
  const bot = {
    findBlock(options) {
      matcher = options.matching;
      return closedDoor;
    }
  };

  assert.equal(findNearbyClosedDoor(bot), closedDoor);
  assert.equal(matcher(closedDoor), true);
  assert.equal(matcher({
    name: 'spruce_door',
    getProperties: () => ({ open: true })
  }), false);
});

test('문에 접근해 activateBlock으로 연 뒤 열린 상태를 확인한다', async () => {
  let open = false;
  let activated = 0;
  const position = { x: 3, y: 64, z: 0 };
  const door = {
    name: 'oak_door',
    position,
    getProperties: () => ({ open })
  };
  const bot = {
    entity: { position: { x: 0, y: 64, z: 0 } },
    pathfinder: {
      async goto() {},
      setGoal() {}
    },
    async activateBlock() {
      activated += 1;
      open = true;
    },
    async waitForTicks() {},
    blockAt: () => ({
      ...door,
      getProperties: () => ({ open })
    })
  };

  assert.equal(await openDoor(bot, door), true);
  assert.equal(activated, 1);
});

test('경로 탐색이 timeout이면 문을 연 뒤 기존 목표를 다시 설정한다', async () => {
  const bot = new EventEmitter();
  let open = false;
  let activated = 0;
  const door = {
    name: 'oak_door',
    position: { x: 1, y: 64, z: 0 },
    getProperties: () => ({ open })
  };
  const originalGoal = { constructor: { name: 'GoalNear' } };
  const goalCalls = [];
  Object.assign(bot, {
    entity: { position: { x: 0, y: 64, z: 0 } },
    pathfinder: {
      goal: originalGoal,
      setGoal(goal, dynamic) {
        goalCalls.push({ goal, dynamic });
        this.goal = goal;
      }
    },
    findBlock({ matching }) {
      return matching(door) ? door : null;
    },
    async activateBlock() {
      activated += 1;
      open = true;
    },
    async waitForTicks() {},
    blockAt: () => ({
      ...door,
      getProperties: () => ({ open })
    })
  });

  registerDoorInteractionEvents(bot, { retryDelayMs: 1 });
  bot.emit('path_update', { status: 'timeout', path: [], visitedNodes: 12 });
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(activated, 1);
  assert.deepEqual(goalCalls, [
    { goal: null, dynamic: undefined },
    { goal: originalGoal, dynamic: false }
  ]);
  assert.equal(bot.pathfinder.goal, originalGoal);
});

test('문 통과 지점은 봇이 접근한 방향의 문 반대편으로 계산한다', () => {
  const bot = {
    entity: { position: { x: 8.5, y: 64, z: 10.5 } }
  };
  const door = {
    name: 'spruce_door',
    position: { x: 10, y: 64, z: 10 }
  };

  const exit = doorwayExitPosition(bot, door);
  assert.equal(exit.x, 12.25);
  assert.equal(exit.y, 64);
  assert.equal(exit.z, 10.5);
});

test('passThroughDoor는 열린 문 너머를 바라보고 전진한 뒤 멈춘다', async () => {
  const controls = [];
  const bot = {
    entity: { position: new Vec3(8.5, 64, 10.5) },
    async lookAt() {},
    setControlState(control, enabled) {
      controls.push({ control, enabled });
    },
    async waitForTicks() {
      this.entity.position.x += 0.5;
    }
  };
  const door = {
    name: 'spruce_door',
    position: { x: 10, y: 64, z: 10 }
  };

  assert.equal(await passThroughDoor(bot, door), true);
  assert.deepEqual(controls, [
    { control: 'forward', enabled: true },
    { control: 'sprint', enabled: true },
    { control: 'forward', enabled: false },
    { control: 'sprint', enabled: false },
    { control: 'jump', enabled: false }
  ]);
  assert.ok(bot.entity.position.x > 10.5);
});

test('비스듬히 접근해도 door facing을 기준으로 문 반대편을 계산한다', () => {
  const bot = {
    entity: { position: new Vec3(8, 64, 9) }
  };
  const northFacingDoor = {
    name: 'spruce_door',
    position: { x: 10, y: 64, z: 10 },
    getProperties: () => ({ facing: 'north', open: false })
  };

  const exit = doorwayExitPosition(bot, northFacingDoor);
  assert.equal(exit.x, 10.5);
  assert.equal(exit.z, 12.25);
  assert.equal(
    crossedDoorPlane(
      new Vec3(10.5, 64, 9),
      new Vec3(10.5, 64, 11.5),
      northFacingDoor
    ),
    true
  );
});

test('가까운 문이 없으면 넓은 범위에서 벽의 출입문을 다시 찾는다', async () => {
  const bot = new EventEmitter();
  const searchedDistances = [];
  let open = false;
  let activated = 0;
  const door = {
    name: 'spruce_door',
    position: { x: 20, y: 64, z: 0 },
    getProperties: () => ({ open })
  };
  const originalGoal = {
    x: -10,
    y: 64,
    z: 0,
    constructor: { name: 'GoalNear' }
  };

  Object.assign(bot, {
    entity: { position: new Vec3(0, 64, 0) },
    pathfinder: {
      goal: originalGoal,
      async goto() {},
      setGoal(goal) {
        this.goal = goal;
      }
    },
    findBlock({ matching, maxDistance }) {
      searchedDistances.push(maxDistance);
      return maxDistance >= 20 && matching(door) ? door : null;
    },
    async activateBlock() {
      activated += 1;
      open = true;
    },
    async waitForTicks() {},
    blockAt: () => ({
      ...door,
      getProperties: () => ({ open })
    })
  });

  registerDoorInteractionEvents(bot, {
    retryDelayMs: 1,
    maxDistance: 6,
    doorSearchRadius: 64
  });
  bot.emit('path_update', { status: 'timeout', path: [], visitedNodes: 100 });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(searchedDistances.slice(0, 2), [6, 64]);
  assert.equal(activated, 1);
});

test('iron doors and pressure plates are recognized separately', () => {
  assert.equal(isIronDoor({ name: 'iron_door' }), true);
  assert.equal(isIronDoor({ name: 'oak_door' }), false);
  assert.equal(isPressurePlate({ name: 'stone_pressure_plate' }), true);
  assert.equal(isPressurePlate({ name: 'heavy_weighted_pressure_plate' }), true);
  assert.equal(isPressurePlate({ name: 'stone_button' }), false);
});

test('an iron door is opened by stepping on the nearest pressure plate', async () => {
  let open = false;
  const doorPosition = new Vec3(1, 64, 0);
  const platePosition = new Vec3(0, 64, 0);
  const door = {
    name: 'iron_door',
    position: doorPosition,
    getProperties: () => ({ open, half: 'lower', facing: 'east' })
  };
  const plate = {
    name: 'stone_pressure_plate',
    position: platePosition
  };
  const bot = {
    entity: { position: new Vec3(-2, 64, 0) },
    pathfinder: {
      async goto(goal) {
        assert.equal(goal.x, platePosition.x);
        assert.equal(goal.y, platePosition.y);
        assert.equal(goal.z, platePosition.z);
        bot.entity.position = platePosition.clone();
        open = true;
      },
      setGoal() {}
    },
    blockAt(position) {
      if (position.equals(doorPosition)) {
        return {
          ...door,
          getProperties: () => ({ open, half: 'lower', facing: 'east' })
        };
      }
      if (position.equals(platePosition)) return plate;
      return { name: 'stone', position };
    },
    async waitForTicks() {}
  };

  assert.equal(findPressurePlateForDoor(bot, door), plate);
  assert.equal(await openIronDoorWithPressurePlate(bot, door), true);
  assert.equal(open, true);
});

test('a wooden door is closed after the bot passes through it', async () => {
  let open = true;
  let activations = 0;
  const position = new Vec3(3, 64, 0);
  const door = {
    name: 'oak_door',
    position,
    getProperties: () => ({ open, half: 'lower' })
  };
  const bot = {
    blockAt() {
      return {
        ...door,
        getProperties: () => ({ open, half: 'lower' })
      };
    },
    async activateBlock() {
      activations += 1;
      open = false;
    },
    async waitForTicks() {}
  };

  assert.equal(await closeDoorAfterPassage(bot, door), true);
  assert.equal(activations, 1);
  assert.equal(open, false);
});

test('an iron door waits for the pressure plate to release and close it', async () => {
  let open = true;
  const position = new Vec3(3, 64, 0);
  const door = {
    name: 'iron_door',
    position,
    getProperties: () => ({ open, half: 'lower' })
  };
  const bot = {
    blockAt() {
      return {
        ...door,
        getProperties: () => ({ open, half: 'lower' })
      };
    },
    async waitForTicks() {
      open = false;
    }
  };

  assert.equal(await closeDoorAfterPassage(bot, door, { waitTicks: 4 }), true);
  assert.equal(open, false);
});

test('a stuck event received during door recovery is retried instead of discarded', async () => {
  const bot = new EventEmitter();
  let open = false;
  let activations = 0;
  let rejectFirstAttempt;
  const firstAttempt = new Promise((resolve, reject) => {
    rejectFirstAttempt = reject;
  });
  const door = {
    name: 'oak_door',
    position: new Vec3(1, 64, 0),
    getProperties: () => ({ open, half: 'lower' })
  };
  const originalGoal = { constructor: { name: 'GoalNear' } };

  Object.assign(bot, {
    entity: { position: new Vec3(0, 64, 0) },
    pathfinder: {
      goal: originalGoal,
      setGoal(goal) {
        this.goal = goal;
      }
    },
    findBlock({ matching }) {
      return matching(door) ? door : null;
    },
    async activateBlock() {
      activations += 1;
      if (activations === 1) await firstAttempt;
      open = true;
    },
    async waitForTicks() {},
    blockAt() {
      return {
        ...door,
        getProperties: () => ({ open, half: 'lower' })
      };
    }
  });

  registerDoorInteractionEvents(bot, { retryDelayMs: 5 });
  bot.emit('path_reset', 'stuck');
  await new Promise(resolve => setImmediate(resolve));
  bot.emit('path_reset', 'stuck');
  rejectFirstAttempt(new Error('first attempt failed'));
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(activations, 2);
  assert.equal(open, true);
});
