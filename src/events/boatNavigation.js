const { findBoatItem, travelByBoat } = require('../actions/boatTravel');

module.exports = function registerBoatNavigationEvents(bot) {
  let ticks = 0;
  bot.on('physicsTick', () => {
    const travel = bot._activeTravelTarget;
    if (++ticks % 10 !== 0 || !travel || bot._boatTravelActive ||
        bot.isStopped || !bot.entity?.isInWater || !findBoatItem(bot)) return;

    bot._boatTravelActive = true;
    console.log('[boat:water-encountered]', {
      position: bot.entity?.position,
      mode: travel.mode
    });
    travelByBoat(bot, travel.getPosition, { range: travel.range })
      .then(result => {
        console.log('[boat:travel-result]', result);
        if (!bot.isStopped && bot._activeTravelTarget === travel) travel.resume?.();
      })
      .catch(error =>
        console.error('[boatNavigation] unexpected failure:', error.message)
      )
      .finally(() => {
        bot._boatTravelActive = false;
      });
  });
};
