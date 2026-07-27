
  
async function coordsPrint(bot, username) {
  const { x, y, z } = bot.entity.position;

  const posX = Math.floor(x);
  const posY = Math.floor(y);
  const posZ = Math.floor(z);

  bot.chat(`내 현재 좌표는 X: ${posX}, Y: ${posY}, Z: ${posZ} 야.`);
  return true;
};

module.exports = {coordsPrint};
