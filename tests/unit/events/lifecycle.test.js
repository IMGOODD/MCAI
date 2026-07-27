const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const registerLifecycleEvents = require('../../../src/events/lifecycle');

test('사망하면 작업을 멈추고 부활한 뒤 한 번만 알린다', () => {
  const bot = new EventEmitter();
  const messages = [];
  let goal = 'active';
  let diggingStopped = false;
  bot.pathfinder = { setGoal(value) { goal = value; } };
  bot.stopDigging = () => { diggingStopped = true; };
  bot.chat = message => messages.push(message);

  registerLifecycleEvents(bot);
  bot.emit('spawn');
  assert.deepEqual(messages, []);

  bot.emit('death');
  assert.equal(bot.isStopped, true);
  assert.equal(goal, null);
  assert.equal(diggingStopped, true);

  bot.emit('spawn');
  assert.equal(bot.isStopped, false);
  assert.deepEqual(messages, ['죽었어.']);

  bot.emit('spawn');
  assert.deepEqual(messages, ['죽었어.']);
});
