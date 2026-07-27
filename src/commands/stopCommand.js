const { stopSign } = require('../actions/stop')
const result = require('../utils/commandResult');

module.exports = {
    async execute(bot, username){
        await stopSign(bot, username);

        return result.success('TASK_STOPPED', { username });
    }
}
