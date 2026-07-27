const { collectResource } = require('../actions/collect');
const result = require('../utils/commandResult');

module.exports = {
  name: 'collectResourceCommand',

  async execute(bot, username, decision) {
    bot.isStopped = false;
    const resource = decision.target;
    const requested = decision.count || 1;
    const mcData = require('minecraft-data')(bot.version);

    try {
      const acquired = await collectResource(bot, mcData, resource, requested, decision.expectedItem);
      if (bot.isStopped) return result.failure('COLLECTION_STOPPED', { resource, acquired: acquired || 0 });
      if (acquired === false || acquired < requested) {
        console.warn('[collectResourceCommand] insufficient pickup', { resource, requested, acquired: acquired || 0 });
        return result.failure('RESOURCE_COLLECTION_INCOMPLETE', { resource, requested, acquired: acquired || 0 });
      }
      return result.success('RESOURCE_COLLECTED', {
        resource,
        expectedItem: decision.expectedItem || null,
        acquired
      });
    } catch (error) {
      console.error('[collectResourceCommand] failed:', error);
      return result.failure('RESOURCE_COLLECTION_FAILED', { resource, requested, error: error.message });
    }
  }
};
