const { sortInventory } = require('../actions/storage');
const result = require('../utils/commandResult');

module.exports = {
  name: 'sortInventoryCommand',

  async execute(bot) {
    if (bot.isBusy) {
      return result.failure('BOT_BUSY', { action: 'sortInventory' });
    }

    bot.isBusy = true;
    bot.isStopped = false;
    try {
      const mcData = require('minecraft-data')(bot.version);
      const storageResult = await sortInventory(bot, mcData);
      if (!storageResult.success) {
        console.warn('[sortInventoryCommand] incomplete:', storageResult);
        return result.failure(storageResult.code, storageResult.data);
      }

      bot.chat('주변 상자에 아이템 정리를 완료했습니다.');
      return result.success(storageResult.code, storageResult.data);
    } catch (error) {
      console.error('[sortInventoryCommand] failed:', error);
      return result.failure('INVENTORY_SORT_FAILED', { error: error.message });
    } finally {
      bot.isBusy = false;
      bot.pathfinder.setGoal(null);
    }
  }
};
