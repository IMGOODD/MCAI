const { goals: { GoalFollow } } = require('mineflayer-pathfinder');
const { craftTool } = require('../actions/craft');
const { placing } = require('../actions/place');
const result = require('../utils/commandResult');

module.exports = {
  
  async execute(bot, username, decision) {

    if (bot.isBusy) {
      bot.chat('지금 다른 작업을 하고 있어. 잠시만 기다려줘.');
      return result.failure('BOT_BUSY', { action: 'craft', item: decision.target });
    }
   
    bot.isBusy = true;

    const mcData = require('minecraft-data')(bot.version);

    try {
      const itemName = decision.target;
      console.log(`[제작 요청] : ${itemName}`);

      const success = await craftTool(bot, mcData, itemName, decision.count || 1);

      if (!success) {
        bot.chat(`${itemName} 제작 실패 했어.`)
        return result.failure('CRAFT_FAILED', { item: itemName, requested: decision.count || 1 });
      }

      bot.chat(`${itemName} 제작 완료 했어`)

      return result.success('CRAFT_COMPLETED', { item: itemName, crafted: decision.count || 1 });
    } catch (err) {
      console.error('제작 명령 수행 중 오류:', err);
      bot.chat(`${decision.target} 제작하다가 문제가 생겼어.`);
      return result.failure('CRAFT_ERROR', { item: decision.target, error: err.message });
    } finally {
      bot.isBusy = false;
      bot.pathfinder.setGoal(null);
    }
  }
};
