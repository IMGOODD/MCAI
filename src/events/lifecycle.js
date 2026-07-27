module.exports = function registerLifecycleEvents(bot) {
  let waitingForRespawn = false;

  bot.on('death', () => {
    waitingForRespawn = true;
    bot.isStopped = true;
    bot.pathfinder?.setGoal(null);

    try {
      bot.stopDigging?.();
    } catch (error) {
      console.warn('[lifecycle] stopDigging after death failed:', error.message);
    }

    console.warn('[lifecycle] bot died; waiting for respawn');
  });

  bot.on('spawn', () => {
    if (!waitingForRespawn) return;
    waitingForRespawn = false;
    bot.isStopped = false;
    bot.chat('죽었어.');
    console.log('[lifecycle] bot respawned');
  });
};
