const { coordsPrint } = require('../actions/coords');
const result = require('../utils/commandResult');

module.exports={
    name: "coordsCommand",

    async execute(bot, username){
        const result = await coordsPrint(bot, username);
        
        return result.success('COORDINATES_REPORTED', {
            position: bot.entity?.position || null
        });
    }
    
}
