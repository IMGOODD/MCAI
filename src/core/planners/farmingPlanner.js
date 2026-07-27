module.exports = {
  domain: 'farming',

  canHandle(task) {
    return ['farmCommand', 'harvestCommand', 'plantCommand'].includes(task?.action);
  },

  createPlan(bot, task) {
    // Farming requirements are planned here as the domain expands.
    return [task];
  }
};
