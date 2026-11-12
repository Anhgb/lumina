/**
 * Lumina Eyewear — AI Provider Factory
 * 
 * Trả về provider (Gemini hoặc OpenAI) dựa trên cấu hình env.
 * Nếu không có API key → trả null (hệ thống chạy FAQ-only mode).
 */

import * as geminiProvider from './providers/gemini.provider.js';
import * as openaiProvider from './providers/openai.provider.js';

/**
 * @typedef {object} AIProvider
 * @property {function} generateResponse - Hàm gọi AI
 * @property {string} name - Tên provider
 * @property {string} apiKey - API key
 * @property {string} model - Model name
 */

/**
 * Tạo AI provider dựa trên biến môi trường.
 * 
 * Ưu tiên: AI_PROVIDER env var → gemini (nếu có key) → openai (nếu có key) → null
 * 
 * @returns {AIProvider|null} Provider object hoặc null nếu không có API key
 */
export function createAIProvider() {
  const providerName = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

  // Explicit provider selection
  if (providerName === 'gemini' && geminiKey) {
    return {
      name: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      generateResponse: (opts) => geminiProvider.generateResponse({
        ...opts,
        apiKey: geminiKey,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      }),
    };
  }

  if (providerName === 'openai' && openaiKey) {
    return {
      name: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      generateResponse: (opts) => openaiProvider.generateResponse({
        ...opts,
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      }),
    };
  }

  // Auto-detect: try gemini first, then openai
  if (geminiKey) {
    return {
      name: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      generateResponse: (opts) => geminiProvider.generateResponse({
        ...opts,
        apiKey: geminiKey,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      }),
    };
  }

  if (openaiKey) {
    return {
      name: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      generateResponse: (opts) => openaiProvider.generateResponse({
        ...opts,
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      }),
    };
  }

  // Không có API key → FAQ-only mode
  return null;
}

/**
 * Kiểm tra xem AI provider có sẵn hay không.
 * @returns {boolean}
 */
export function isAIProviderAvailable() {
  return createAIProvider() !== null;
}

export default { createAIProvider, isAIProviderAvailable };

