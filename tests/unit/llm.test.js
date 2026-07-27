const test = require('node:test');
const assert = require('node:assert/strict');
const { createLlmClient, resolveApiKey } = require('../../src/llm');

test('LLM API key is resolved from the configured environment variable', () => {
  const original = process.env.TEST_MCAI_LLM_KEY;
  process.env.TEST_MCAI_LLM_KEY = 'test-key';

  assert.equal(
    resolveApiKey({ provider: 'openai', apiKeyEnv: 'TEST_MCAI_LLM_KEY' }),
    'test-key'
  );

  if (original === undefined) delete process.env.TEST_MCAI_LLM_KEY;
  else process.env.TEST_MCAI_LLM_KEY = original;
});

test('unsupported LLM providers fail before a request is sent', () => {
  assert.throws(
    () => createLlmClient({ provider: 'unknown-provider' }),
    /Unsupported LLM provider/
  );
});
