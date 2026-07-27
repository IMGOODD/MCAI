const { huntResource } = require('../actions/hunt');
const {
  getHuntingResource,
  getHuntingAnimal,
  normalizeHuntTarget
} = require('../data/huntingData');
const result = require('../utils/commandResult');

function huntFailureMessage(huntResult) {
  if ([
    'HUNT_INCOMPLETE',
    'HUNT_ATTEMPTS_EXHAUSTED',
    'HUNT_TARGET_RETRIES_EXHAUSTED'
  ].includes(huntResult?.code)) return '사냥에 실패했어.';
  return null;
}

function huntCountMessage(subject, huntResult) {
  if (!['kills', 'until_empty'].includes(huntResult?.data?.countMode)) return null;
  const hunted = Math.max(0, Number(huntResult.data.hunted) || 0);
  return `${subject} ${hunted}마리 잡았어.`;
}

module.exports = {
  name: 'huntCommand',
  huntFailureMessage,
  huntCountMessage,

  async execute(bot, username, decision) {
    bot.isStopped = false;
    const target = normalizeHuntTarget(decision.target);
    const resource = getHuntingResource(target);
    const animal = getHuntingAnimal(decision.target);
    const requested = Math.max(1, decision.count || 1);
    const countMode = ['kills', 'until_empty'].includes(decision.countMode)
      ? decision.countMode
      : 'drops';

    if (!resource) {
      console.warn('[huntCommand] unsupported resource:', decision.target);
      return result.failure('UNSUPPORTED_HUNT_RESOURCE', { resource: decision.target });
    }

    try {
      const huntResult = await huntResource(bot, target, requested, { countMode });
      if (huntResult.success) {
        const subject = animal?.displayName || resource.displayName;
        const countMessage = huntCountMessage(subject, huntResult);
        if (countMessage) {
          bot.chat(countMessage);
        } else {
          bot.chat(`${resource.displayName} ${huntResult.data.acquired}개를 구했어.`);
        }
        return result.success(huntResult.code, huntResult.data);
      }

      console.warn('[huntCommand] hunt incomplete:', huntResult);
      const subject = animal?.displayName || resource.displayName;
      const countMessage = huntCountMessage(subject, huntResult);
      if (countMessage) {
        bot.chat(countMessage);
      } else {
        const failureMessage = huntFailureMessage(huntResult);
        if (failureMessage) bot.chat(failureMessage);
      }
      return result.failure(huntResult.code, huntResult.data);
    } catch (error) {
      console.error('[huntCommand] failed:', error);
      return result.failure('HUNT_FAILED', {
        resource: target,
        requested: countMode === 'until_empty' ? null : requested,
        error: error.message
      });
    }
  }
};
