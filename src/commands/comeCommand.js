const { comeToMe, comeToCoordinates, parseCoordinates } = require('../actions/come');
const commandResult = require('../utils/commandResult');

module.exports = {
    name : "comeCommand",
    async execute(bot, username, decision = {}){
        const coordinates = parseCoordinates(decision.target);
        const started = coordinates
            ? await comeToCoordinates(bot, coordinates)
            : await comeToMe(bot, username);

        if(!started){
            return commandResult.failure('MOVE_TARGET_UNAVAILABLE', {
                username,
                target: decision.target || null
            });
        }

        return commandResult.success('MOVEMENT_STARTED', {
            mode: coordinates ? 'coordinates' : 'player',
            username,
            target: coordinates
        });
    }
}
