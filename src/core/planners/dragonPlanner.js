const { REQUIRED_ITEMS } = require('../../data/dragonData');

function inventoryNames(bot) {
  return new Set((bot.inventory?.items?.() || []).map(item => item.name));
}

function readiness(bot) {
  const names = inventoryNames(bot);
  return {
    sword: REQUIRED_ITEMS.sword.some(name => names.has(name)),
    bow: REQUIRED_ITEMS.bow.some(name => names.has(name)),
    arrows: REQUIRED_ITEMS.arrows.some(name => names.has(name)),
    food: REQUIRED_ITEMS.food.some(name => names.has(name))
  };
}

module.exports = {
  domain: 'dragon',
  canHandle(task) {
    return task?.action === 'dragonCommand';
  },
  createPlan(bot, task) {
    const status = readiness(bot);
    console.log('[dragon-planner:readiness]', status);
    return [{ ...task, readiness: status }];
  },
  readiness
};
