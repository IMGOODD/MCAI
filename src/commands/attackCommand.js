const huntCommand = require('./huntCommand');

module.exports = {
  name: 'attackCommand',

  async execute(bot, username, task = {}) {
    console.warn('[attackCommand] legacy command redirected to huntCommand');
    const target = ['animal', '동물'].includes(task.target) ? 'meat' : task.target;
    return huntCommand.execute(bot, username, {
      action: 'huntCommand',
      target: target || 'meat',
      count: Math.max(1, task.count || 1)
    });
  }
};
