module.exports = {
  domain: 'storage',

  canHandle(task) {
    return ['storeCommand', 'withdrawCommand', 'sortInventoryCommand'].includes(task?.action);
  },

  createPlan(bot, task) {
    console.log('[storage-planner:goal]', task);
    console.log('[storage-planner:result]', [task]);
    // Keep storage planning as an extension point for future commands.
    return [task];
  }
};
