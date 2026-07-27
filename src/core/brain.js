const config = require('../../config.json');
const fs = require('fs');
const path = require('path');
const { createLlmClient } = require('../llm');

const knowledgeDir = path.join(__dirname, 'knowledge');
const systemInstructions = fs.readFileSync(path.join(knowledgeDir, 'system-instructions.md'), 'utf8');
const actionKnowledge = fs.readFileSync(path.join(knowledgeDir, 'actions.md'), 'utf8');
const schema = fs.readFileSync(path.join(knowledgeDir, 'response-schema.md'), 'utf8');
const examples = fs.readFileSync(path.join(knowledgeDir, 'examples.md'), 'utf8');
const { createPlan, UnsupportedMaterialError } = require('./planner');
const { waitUntilSafe } = require('../actions/ensureSafety');
const { waitUntilCombatComplete } = require('./combatManager');
const { materialShortageMessage } = require('../utils/smeltingFeedback');

module.exports = {
  async process(bot, username, message) {
    const systemPrompt = [systemInstructions, actionKnowledge, schema, examples].join('\n\n');
    try {
      const llm = createLlmClient(config.llm);
      const output = await llm.generateJson({
        systemPrompt,
        userPrompt: `${username}: ${message}`
      });
      const response = JSON.parse(output);
      console.log('[brain] LLM actions:', JSON.stringify(response.actions || [response], null, 2));
      taskLoop: for (const task of response.actions || [response]) {
        for (const plannedTask of createPlan(bot, task)) {
          await waitUntilSafe(bot);
          await waitUntilCombatComplete(bot);
          const commandPath = path.join(__dirname, '../commands', `${plannedTask.action}.js`);

          if (!fs.existsSync(commandPath)) { console.warn(`Unknown command: ${plannedTask.action}`); continue; }
          
          const result = await require(commandPath).execute(bot, username, plannedTask);
          console.log(result);
          if (result && result.success === false) {
            console.warn('[brain] task failed; continuing with next goal:', {
              goal: task,
              failedStep: plannedTask,
              result
            });
            continue taskLoop;
          }
        }
      }
    } catch (err) {
      console.error('[brain] processing failed:', err.message);
      if (err instanceof UnsupportedMaterialError) {
        console.warn('[brain] unsupported material:', err.message);
        const shortageMessage = materialShortageMessage(err.itemName);
        if (shortageMessage) bot.chat(shortageMessage);
        return;
      }
    }
  }
};
