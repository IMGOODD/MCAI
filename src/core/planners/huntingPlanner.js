const craftingPlanner = require('./craftingPlanner');
const { getHuntingResource, normalizeHuntTarget } = require('../../data/huntingData');

function inventoryItems(bot) {
  return bot?.inventory && typeof bot.inventory.items === 'function' ? bot.inventory.items() : [];
}

function hasSword(bot) {
  return inventoryItems(bot).some(item => item.name.endsWith('_sword'));
}

module.exports = {
  domain: 'hunting',

  canHandle(task) {
    return task?.action === 'huntCommand';
  },

  createPlan(bot, task, options = {}) {
    const target = normalizeHuntTarget(task.target);
    const countMode = ['kills', 'until_empty'].includes(task.countMode)
      ? task.countMode
      : 'drops';
    if (!getHuntingResource(target)) return [task];

    const steps = [];
    console.log('[hunting-planner:goal]', {
      action: task.action,
      target,
      count: Math.max(1, task.count || 1),
      countMode
    });
    if (!hasSword(bot)) {
      console.log('[hunting-planner:weapon]', { hasSword: false, preparing: 'wooden_sword' });
      steps.push(...craftingPlanner.createCraftingPlan(bot, {
        action: 'craftCommand',
        target: 'wooden_sword',
        count: 1
      }, options));
    } else {
      console.log('[hunting-planner:weapon]', { hasSword: true });
    }

    const huntStep = {
      action: 'huntCommand',
      target: ['kills', 'until_empty'].includes(countMode)
        ? String(task.target).toLowerCase()
        : target,
      count: Math.max(1, task.count || 1)
    };
    if (countMode !== 'drops') huntStep.countMode = countMode;
    steps.push(huntStep);
    console.log('[hunting-planner:result]', steps);
    return steps;
  }
};
