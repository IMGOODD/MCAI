const { equipArmor } = require('../actions/equip');
const result = require('../utils/commandResult');

module.exports = {
  name: 'equipCommand',

  async execute(bot, username, decision) {
    const itemName = decision.target;
    if (bot.isBusy) {
      return result.failure('BOT_BUSY', { action: 'equip', item: itemName });
    }

    bot.isBusy = true;
    try {
      const equipResult = await equipArmor(bot, itemName);
      if (!equipResult.success) {
        console.warn('[equipCommand] failed:', equipResult);
        return result.failure(equipResult.code, equipResult.data);
      }

      bot.chat(`${itemName}을(를) 장착했습니다.`);
      return result.success(equipResult.code, equipResult.data);
    } catch (error) {
      console.error('[equipCommand] unexpected error:', error);
      return result.failure('EQUIPMENT_COMMAND_FAILED', {
        item: itemName,
        error: error.message
      });
    } finally {
      bot.isBusy = false;
    }
  }
};
