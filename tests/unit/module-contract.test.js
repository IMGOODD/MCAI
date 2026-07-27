const test = require('node:test');
const assert = require('node:assert/strict');

test('모든 소스 모듈을 정상적으로 불러올 수 있다', () => {
  const modulePaths = [
    '../../src/actions/answer', '../../src/actions/attackEntity', '../../src/actions/collect',
    '../../src/actions/come', '../../src/actions/coords', '../../src/actions/craft',
    '../../src/actions/eatFood', '../../src/actions/farm', '../../src/actions/itemSearch',
    '../../src/actions/place', '../../src/actions/stop', '../../src/actions/toss',
    '../../src/actions/smelt', '../../src/actions/equip', '../../src/actions/unequip',
    '../../src/actions/storage', '../../src/actions/combat', '../../src/actions/hunt',
    '../../src/actions/doorInteraction',
    '../../src/commands/answerCommand', '../../src/commands/attackCommand',
    '../../src/commands/huntCommand',
    '../../src/commands/collectCommand', '../../src/commands/collectResourceCommand',
    '../../src/commands/comeCommand', '../../src/commands/coordsCommand',
    '../../src/commands/craftCommand', '../../src/commands/replyCommand',
    '../../src/commands/smeltCommand', '../../src/commands/equipCommand',
    '../../src/commands/unequipCommand',
    '../../src/commands/sortInventoryCommand',
    '../../src/commands/stopCommand', '../../src/commands/tossCommand',
    '../../src/core/brain', '../../src/core/planner', '../../src/core/combatManager',
    '../../src/llm', '../../src/llm/providers/openai', '../../src/llm/providers/gemini',
    '../../src/core/planners/smeltingPlanner', '../../src/core/planners/huntingPlanner',
    '../../src/core/planners/equipmentPlanner', '../../src/data/equipmentData',
    '../../src/events/chat', '../../src/events/defense', '../../src/utils/smeltingFeedback',
    '../../src/data/huntingData', '../../src/data/combatData'
  ];
  for (const modulePath of modulePaths) assert.doesNotThrow(() => require(modulePath), modulePath);
});
