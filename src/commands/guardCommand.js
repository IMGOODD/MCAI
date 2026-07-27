const { guardArea } = require('../actions/guardArea');
const result = require('../utils/commandResult');

module.exports = {
  name: 'guardCommand',

  async execute(bot, username) {
    try {
      bot.chat('주변 64블록을 지킬게.');
      const guardResult = await guardArea(bot, username);
      return guardResult.success
        ? result.success(guardResult.code, guardResult.data)
        : result.failure(guardResult.code, guardResult.data);
    } catch (error) {
      console.error('[guardCommand] failed:', error);
      return result.failure('GUARD_FAILED', { error: error.message });
    }
  }
};
