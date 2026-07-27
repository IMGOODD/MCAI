const test = require('node:test');
const assert = require('node:assert/strict');
const { createLlmClient, PROVIDERS } = require('../../src/llm');
const openaiProvider = require('../../src/llm/providers/openai');
const geminiProvider = require('../../src/llm/providers/gemini');

test('each provider resolves its own default model and API key', () => {
  const original = process.env.TEST_MCAI_LLM_KEY;
  process.env.TEST_MCAI_LLM_KEY = 'test-key';

  const openai = openaiProvider.resolveSettings({ apiKeyEnv: 'TEST_MCAI_LLM_KEY' });
  const gemini = geminiProvider.resolveSettings({ apiKeyEnv: 'TEST_MCAI_LLM_KEY' });

  assert.equal(openai.apiKey, 'test-key');
  assert.equal(openai.model, 'gpt-5.4-mini');
  assert.equal(gemini.apiKey, 'test-key');
  assert.equal(gemini.model, 'gemini-2.0-flash');

  if (original === undefined) delete process.env.TEST_MCAI_LLM_KEY;
  else process.env.TEST_MCAI_LLM_KEY = original;
});

test('the LLM entry point only selects a registered provider', () => {
  assert.equal(PROVIDERS.openai, openaiProvider);
  assert.equal(PROVIDERS.gemini, geminiProvider);
});

test('unsupported LLM providers fail before a request is sent', () => {
  assert.throws(
    () => createLlmClient({ provider: 'unknown-provider' }),
    /Unsupported LLM provider/
  );
});
