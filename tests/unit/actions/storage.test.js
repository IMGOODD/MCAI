const test = require('node:test');
const assert = require('node:assert/strict');
const {
  consolidateChests,
  createConsolidationAssignments,
  createStorageAssignments,
  mapChestLabels,
  positionKey,
  sortInventory,
  storageCandidates
} = require('../../../src/actions/storage');

function position(x, y, z) {
  return { x, y, z };
}

function chest(x, y, z) {
  return { name: 'chest', position: position(x, y, z) };
}

test('가장 가까운 아이템 액자를 상자 라벨로 연결한다', () => {
  const chests = [chest(0, 64, 0), chest(5, 64, 0)];
  const entities = {
    1: {
      name: 'item_frame',
      position: position(0.5, 64.5, -0.1),
      heldItem: { name: 'iron_ingot' }
    }
  };

  const labels = mapChestLabels(chests, entities);
  assert.equal(labels.get(positionKey(chests[0].position)), 'iron_ingot');
  assert.equal(labels.has(positionKey(chests[1].position)), false);
});

test('라벨 아이템은 일치 상자로, 나머지는 빈 상자 순서로 보낸다', () => {
  const chests = [chest(0, 64, 0), chest(5, 64, 0), chest(10, 64, 0)];
  const labels = new Map([[positionKey(chests[0].position), 'iron_ingot']]);

  assert.deepEqual(storageCandidates('iron_ingot', chests, labels), [chests[0]]);
  assert.deepEqual(storageCandidates('coal', chests, labels, 0), [chests[1], chests[2]]);
  assert.deepEqual(storageCandidates('dirt', chests, labels, 1), [chests[2], chests[1]]);
});

test('인벤토리를 액자 라벨과 빈 상자 순서에 따라 보관한다', async () => {
  const chestBlocks = [chest(1, 64, 0), chest(5, 64, 0)];
  const deposits = [];
  const bot = {
    isStopped: false,
    entities: {
      1: {
        name: 'item_frame',
        position: position(1.5, 64.5, -0.1),
        heldItem: { name: 'iron_ingot' }
      }
    },
    inventory: {
      items: () => [
        { name: 'iron_helmet', type: 1, count: 1, slot: 5 },
        { name: 'iron_ingot', type: 2, count: 4, metadata: 0, slot: 9 },
        { name: 'coal', type: 3, count: 8, metadata: 0, slot: 10 }
      ]
    },
    findBlocks: () => chestBlocks.map(block => block.position),
    blockAt(pos) {
      return chestBlocks.find(block => positionKey(block.position) === positionKey(pos));
    },
    pathfinder: {
      async goto() {},
      setGoal() {}
    },
    async openChest(block) {
      return {
        async deposit(type, metadata, count) {
          deposits.push({
            chest: positionKey(block.position),
            type,
            metadata,
            count
          });
        },
        close() {}
      };
    }
  };
  const mcData = {
    blocksByName: {
      chest: { id: 10 },
      trapped_chest: { id: 11 }
    }
  };

  const result = await sortInventory(bot, mcData);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.stored, { coal: 8, iron_ingot: 4 });
  assert.deepEqual(deposits, [
    { chest: '5,64,0', type: 3, metadata: 0, count: 8 },
    { chest: '1,64,0', type: 2, metadata: 0, count: 4 }
  ]);
});

test('주변 상자가 없으면 명확한 실패 결과를 반환한다', async () => {
  const bot = {
    inventory: { items: () => [] },
    findBlocks: () => [],
    entities: {},
    pathfinder: { setGoal() {} }
  };
  const mcData = { blocksByName: { chest: { id: 10 } } };

  assert.deepEqual(await sortInventory(bot, mcData), {
    success: false,
    code: 'STORAGE_CHEST_NOT_FOUND',
    data: { maxDistance: 32 }
  });
});

test('기존에 같은 이름의 아이템이 든 상자를 우선 재사용한다', () => {
  const chests = [chest(0, 64, 0), chest(5, 64, 0), chest(10, 64, 0)];
  const contents = new Map([
    [positionKey(chests[0].position), new Set(['cobblestone'])],
    [positionKey(chests[1].position), new Set(['dirt'])],
    [positionKey(chests[2].position), new Set()]
  ]);
  const items = [
    { name: 'dirt', count: 32 },
    { name: 'cobblestone', count: 64 }
  ];

  const { assignments } = createStorageAssignments(items, chests, new Map(), contents);
  assert.deepEqual(assignments.get('dirt'), [chests[1]]);
  assert.deepEqual(assignments.get('cobblestone'), [chests[0]]);
});

test('새로운 아이템 이름은 비어 있는 상자에 좌표 순서대로 하나씩 배정한다', () => {
  const chests = [chest(0, 64, 0), chest(5, 64, 0), chest(10, 64, 0)];
  const contents = new Map(chests.map(block => [
    positionKey(block.position),
    new Set()
  ]));
  const items = [
    { name: 'coal', count: 8 },
    { name: 'dirt', count: 32 },
    { name: 'stone', count: 64 }
  ];

  const { assignments } = createStorageAssignments(items, chests, new Map(), contents);
  assert.deepEqual(assignments.get('coal'), [chests[0]]);
  assert.deepEqual(assignments.get('dirt'), [chests[1]]);
  assert.deepEqual(assignments.get('stone'), [chests[2]]);
});

test('뒤섞인 상자는 순수하게 한 종류만 든 상자를 목적지로 우선 선택한다', () => {
  const chests = [chest(0, 64, 0), chest(5, 64, 0), chest(10, 64, 0)];
  const snapshots = new Map([
    [positionKey(chests[0].position), [
      { name: 'dirt', type: 1, count: 8 },
      { name: 'cobblestone', type: 2, count: 8 }
    ]],
    [positionKey(chests[1].position), [
      { name: 'dirt', type: 1, count: 32 }
    ]],
    [positionKey(chests[2].position), []]
  ]);

  const { assignments } = createConsolidationAssignments(
    [],
    chests,
    new Map(),
    snapshots
  );
  assert.deepEqual(assignments.get('dirt'), [chests[1]]);
  assert.deepEqual(assignments.get('cobblestone'), [chests[0]]);
});

test('잘못 들어간 상자 스택을 같은 이름의 목적 상자로 이동한다', async () => {
  const chests = [chest(0, 64, 0), chest(5, 64, 0)];
  const snapshots = new Map([
    [positionKey(chests[0].position), [
      { name: 'dirt', type: 1, metadata: 0, count: 12 }
    ]],
    [positionKey(chests[1].position), [
      { name: 'cobblestone', type: 2, metadata: 0, count: 32 }
    ]]
  ]);
  const state = {
    assignments: new Map([
      ['dirt', [chests[1]]],
      ['cobblestone', [chests[0]]]
    ]),
    reserved: new Map()
  };
  const operations = [];
  const bot = {
    isStopped: false,
    pathfinder: { async goto() {}, setGoal() {} },
    async openChest(block) {
      return {
        async withdraw(type, metadata, count) {
          operations.push(['withdraw', positionKey(block.position), type, count]);
        },
        async deposit(type, metadata, count) {
          operations.push(['deposit', positionKey(block.position), type, count]);
        },
        close() {}
      };
    }
  };

  const result = await consolidateChests(bot, chests, new Map(), snapshots, state);
  assert.deepEqual(result.moved, { dirt: 12, cobblestone: 32 });
  assert.deepEqual(operations, [
    ['withdraw', '0,64,0', 1, 12],
    ['deposit', '5,64,0', 1, 12],
    ['withdraw', '5,64,0', 2, 32],
    ['deposit', '0,64,0', 2, 32]
  ]);
});
