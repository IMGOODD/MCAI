const { OpenAI } = require('openai');

function createOpenAIProvider({ apiKey, baseURL, model }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

  return {
    name: 'openai',
    async generateJson({ systemPrompt, userPrompt }) {
      const response = await client.responses.create({
        model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        text: { format: { type: 'json_object' } },
        temperature: 0.1
      });

      return response.output_text;
    }
  };
}

module.exports = { createOpenAIProvider };
