const { fightEnderDragon } = require('../actions/dragonFight');
const result = require('../utils/commandResult');

module.exports = {
  name: 'dragonCommand',

  async execute(bot, username) {
    try {
      bot.chat('엔더 드래곤 공략을 시작할게.');
      const fightResult = await fightEnderDragon(bot, username);
      if (fightResult.code === 'ENDER_DRAGON_DEFEATED') {
        bot.chat('엔더 드래곤을 잡았어.');
      }
      return fightResult.success
        ? result.success(fightResult.code, fightResult.data)
        : result.failure(fightResult.code, fightResult.data);
    } catch (error) {
      console.error('[dragonCommand] failed:', error);
      return result.failure('DRAGON_FIGHT_FAILED', { error: error.message });
    }
  }
};
