const test = require('node:test');
const assert = require('node:assert/strict');
const minecraftData = require('minecraft-data');
const { createPlan } = require('../../../src/core/planner');

const mcData = minecraftData('1.20.1');

test('제작 전 발견한 화로 좌표를 이후 제련 단계에 보존한다', () => {
  const furnacePosition = { x: 100, y: 64, z: 100 };
  const bot = {
    version: '1.20.1',
    inventory: {
      items: () => [
        { name: 'raw_iron', count: 5 },
        { name: 'coal', count: 1 }
      ]
    },
    findBlock({ matching }) {
      if (matching === mcData.blocksByName.furnace.id) {
        return { name: 'furnace', position: furnacePosition };
      }
      if (matching === mcData.blocksByName.crafting_table.id) {
        return {
          name: 'crafting_table',
          position: { x: 101, y: 64, z: 100 }
        };
      }
      return null;
    }
  };

  const plan = createPlan(bot, {
    action: 'equipmentCommand',
    target: 'iron_helmet',
    count: 1
  }, { mcData });

  assert.deepEqual(
    plan.find(step => step.action === 'smeltCommand'),
    {
      action: 'smeltCommand',
      target: 'iron_ingot',
      count: 5,
      furnacePosition
    }
  );
});
