const craftingPlanner = require('./craftingPlanner');

module.exports = {
  domain: 'collection',

  canHandle(task) {
    return ['collectCommand', 'collectResourceCommand'].includes(task?.action);
  },

  createPlan(bot, task, options) {
    // Reuse the recursive crafting planner to prepare required tools.
    return craftingPlanner.createCraftingPlan(bot, task, options);
  }
};
