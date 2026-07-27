async function stopSign(bot, username) {
  bot.chat('오키');

  bot.isBusy = false;
  bot.isStopped = true;
  bot._restoreComeWaterTraversal?.();
  bot._activeTravelTarget = null;
  
  if (bot.pathfinder) {
    bot.pathfinder.setGoal(null);
  }
  
  if(typeof bot.stopDigging === 'function'){
      bot.stopDigging();
  }
  
  return true;
}

module.exports = {stopSign}
