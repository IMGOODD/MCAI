const { findHostileThreats, handleHostileThreat } = require('../core/combatManager');

module.exports = function registerDefenseEvents(bot) {
  let ticks = 0;
  let lastHandledAt = 0;

  bot.on('physicsTick', () => {
    if (++ticks % 10 !== 0 || bot.isCombatActive || bot.isSafetyActive) return;
    if (Date.now() - lastHandledAt < 2000) return;
    if (findHostileThreats(bot).length === 0) return;

    lastHandledAt = Date.now();
    handleHostileThreat(bot, { username: bot.lastCommanderUsername })
      .then(result => console.log('[defense:result]', result))
      .catch(error => console.error('[defense] unexpected failure:', error.message));
  });
};
