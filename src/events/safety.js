const { ensureSafety } = require('../actions/ensureSafety');
const { eatFood } = require('../actions/eatFood');
const { findHostileThreats, handleHostileThreat } = require('../core/combatManager');

module.exports = function registerSafetyEvents(bot) {
  let previousHealth = bot.health ?? 20;

  bot.on('health', () => {
    const currentHealth = bot.health ?? previousHealth;
    const tookDamage = currentHealth < previousHealth;
    previousHealth = currentHealth;
    if (!tookDamage) return;
    if (bot.isCombatActive) return;

    console.warn('[safety] damage detected', {
      health: currentHealth,
      oxygen: bot.oxygenLevel,
      inWater: Boolean(bot.entity?.isInWater)
    });
    (async () => {
      if ((bot.food ?? 20) < 20) await eatFood(bot);
      if (findHostileThreats(bot).length > 0) {
        await handleHostileThreat(bot, {
          reason: 'damage',
          username: bot.lastCommanderUsername
        });
        return;
      }
      await ensureSafety(
        bot,
        bot.entity?.isInWater ? 'water_damage' : 'health_decreased'
      );
    })().catch(error =>
      console.error('[safety] damage recovery failed:', error.message)
    );
  });

  bot.on('spawn', () => {
    previousHealth = bot.health ?? 20;
  });
};
