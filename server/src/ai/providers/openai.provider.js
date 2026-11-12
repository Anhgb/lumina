/**
 * Lumina Eyewear — OpenAI Provider
 * 
 * Tích hợp OpenAI Chat Completions API qua REST fetch().
 */

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * Gọi OpenAI Chat Completions API.
 * 
 * @param {object} options
 * @param {string} options.systemPrompt - System message
 * @param {string} options.userMessage - Tin nhắn người dùng hiện tại
 * @param {{ role: string, content: string }[]} [options.messageHistory] - Lịch sử hội thoại
 * @param {string} options.apiKey - OpenAI API Key
 * @param {string} [options.model] - Model name (default: gpt-4o-mini)
 * @returns {Promise<string>} AI response text
 */
export async function generateResponse({ systemPrompt, userMessage, messageHistory = [], apiKey, model }) {
  const modelName = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Build messages array theo OpenAI format
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Thêm lịch sử hội thoại (OpenAI dùng 'assistant')
  for (const msg of messageHistory) {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  // Thêm tin nhắn hiện tại
  messages.push({ role: 'user', content: userMessage });

  const requestBody = {
    model: modelName,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9,
  };

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content;
  }

  throw new Error('OpenAI returned empty response');
}

export default { generateResponse };

