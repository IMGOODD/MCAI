const { unequipArmor } = require('../actions/unequip');
const result = require('../utils/commandResult');

module.exports = {
  name: 'unequipCommand',

  async execute(bot, username, decision) {
    const target = decision.target || 'all';
    if (bot.isBusy) {
      return result.failure('BOT_BUSY', { action: 'unequip', target });
    }

    bot.isBusy = true;
    try {
      const unequipResult = await unequipArmor(bot, target);
      if (!unequipResult.success) {
        console.warn('[unequipCommand] failed:', unequipResult);
        return result.failure(unequipResult.code, unequipResult.data);
      }

      const itemNames = unequipResult.data.items.map(item => item.item).join(', ');
      bot.chat(`${itemNames}을(를) 벗었습니다.`);
      return result.success(unequipResult.code, unequipResult.data);
    } catch (error) {
      console.error('[unequipCommand] unexpected error:', error);
      return result.failure('EQUIPMENT_UNEQUIP_COMMAND_FAILED', {
        target,
        error: error.message
      });
    } finally {
      bot.isBusy = false;
    }
  }
};
