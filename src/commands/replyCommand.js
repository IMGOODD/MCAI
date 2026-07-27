const result = require('../utils/commandResult');

module.exports.execute = async (bot, username, decision) => {

    const master = bot.players[username]?.entity;
    // Keep responses polite.
    if(master){
        await bot.lookAt(master.position.offset(0, 1.6, 0));
    }

    bot.chat(decision.target);
    return result.success('REPLY_SENT', { username, text: decision.target });
}
