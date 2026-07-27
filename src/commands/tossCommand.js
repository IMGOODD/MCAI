const { tossAllItems, tossItem } = require('../actions/toss');
const { approachPlayer } = require('../actions/approachPlayer');
const result = require('../utils/commandResult');

module.exports = {
  name: 'tossCommand',

  async execute(bot, username, task) {
    try {
      const reached = await approachPlayer(bot, username, 3);
      if (!reached) {
        bot.chat('너가 어디 있는지 안 보여서 줄 수 없어.');
        return result.failure('PLAYER_NOT_FOUND', { username, target: task.target });
      }
    } catch (error) {
      console.error('[tossCommand] player approach failed:', error);
      bot.chat('너한테 가까이 갈 수가 없어.');
      return result.failure('PLAYER_REACH_FAILED', {
        username,
        target: task.target,
        error: error.message
      });
    }

    const requested = task.target === 'all' ? 0 : (task.count || 1);
    const tossed = task.target === 'all'
      ? await tossAllItems(bot)
      : await tossItem(bot, task.target, requested, {
        excludeSlots: task.excludeEquipmentSlots ? [5, 6, 7, 8] : []
      });

    if (!tossed) {
      bot.chat(`${task.target}을(를) 줄 수가 없어.`);
      return result.failure('ITEM_TOSS_FAILED', { target: task.target, requested });
    }

    bot.chat(task.target === 'all'
      ? '여기 인벤토리에 있는 거 다 줬어.'
      : `여기 ${task.target} ${requested}개 줄게.`);
    return result.success('ITEMS_TOSSED', { target: task.target, requested });
  }
};
