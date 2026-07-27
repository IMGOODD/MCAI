const brain = require('../core/brain');

module.exports = (bot) =>{
  bot.on('chat', async(username, message) =>{
    if (username == bot.username) return;
    bot.lastCommanderUsername = username;

    console.log(`[채팅 수신] ${username}: ${message}`);

    if (message === '!exit') {
      bot.chat('서버 연결을 종료합니다.');
      bot.quit();
      console.log("봇이 퇴장했습니다.");
      return;
    }

    await brain.process(bot, username, message);
  });
};

