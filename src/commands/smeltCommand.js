const { smeltItem } = require('../actions/smelt');
const result = require('../utils/commandResult');
const { shortageMessagesFromData } = require('../utils/smeltingFeedback');

module.exports = {
  name: 'smeltCommand',

  async execute(bot, username, decision) {
    const item = decision.target;
    const requested = Math.max(1, decision.count || 1);
    if (bot.isBusy) {
      return result.failure('BOT_BUSY', { action: 'smelt', item });
    }

    bot.isBusy = true;
    bot.isStopped = false;
    try {
      const mcData = require('minecraft-data')(bot.version);
      const smeltResult = await smeltItem(bot, mcData, item, requested, {
        furnacePosition: decision.furnacePosition || null,
        fuel: decision.fuel || null
      });
      if (!smeltResult.success) {
        console.warn('[smeltCommand] failed:', smeltResult);
        if (smeltResult.code === 'SMELT_MATERIALS_MISSING') {
          for (const message of shortageMessagesFromData(smeltResult.data)) {
            bot.chat(message);
          }
        }
        return result.failure(smeltResult.code, smeltResult.data);
      }

      bot.chat(`${item} 제련을 완료했습니다.`);
      return result.success(smeltResult.code, smeltResult.data);
    } catch (error) {
      console.error('[smeltCommand] unexpected error:', error);
      return result.failure('SMELT_COMMAND_FAILED', {
        item,
        requested,
        error: error.message
      });
    } finally {
      bot.isBusy = false;
      bot.pathfinder.setGoal(null);
    }
  }
};
