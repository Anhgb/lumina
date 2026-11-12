/**
 * Lumina Eyewear — Gemini AI Provider
 * 
 * Tích hợp Google Gemini API qua REST fetch() (không cần npm package).
 * Sử dụng generateContent endpoint.
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gọi Gemini API để generate nội dung.
 * 
 * @param {object} options
 * @param {string} options.systemPrompt - System instruction
 * @param {string} options.userMessage - Tin nhắn người dùng hiện tại
 * @param {{ role: string, content: string }[]} [options.messageHistory] - Lịch sử hội thoại
 * @param {string} options.apiKey - Gemini API Key
 * @param {string} [options.model] - Model name (default: gemini-2.0-flash)
 * @returns {Promise<string>} AI response text
 */
export async function generateResponse({ systemPrompt, userMessage, messageHistory = [], apiKey, model }) {
  const modelName = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  // Build contents array theo Gemini format
  const contents = [];

  // Thêm lịch sử hội thoại (Gemini dùng 'model' cho assistant)
  for (const msg of messageHistory) {
    contents.push({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  // Thêm tin nhắn hiện tại
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Extract text từ response
  if (
    data.candidates &&
    data.candidates.length > 0 &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts.length > 0
  ) {
    return data.candidates[0].content.parts[0].text;
  }

  // Check blocked content
  if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
    throw new Error('Gemini response blocked by safety filters');
  }

  throw new Error('Gemini returned empty response');
}

export default { generateResponse };

