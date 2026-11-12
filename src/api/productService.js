import { mockApiClient } from './apiClient';
import { INITIAL_PRODUCTS } from '../data/products';

/**
 * productService.js — Product API abstraction.
 * Follows PRD 3.1 & 5.2:
 * - Attempts to call MockAPI.io (GET /products)
 * - Gracefully falls back to local data on network failure or empty config
 */
export const productService = {
  /**
   * Fetch all products
   * @returns {Promise<{ products: Array, source: 'mockapi' | 'local' }>}
   */
  async getProducts() {
    const hasMockApiUrl = Boolean(import.meta.env.VITE_MOCKAPI_URL);

    if (hasMockApiUrl) {
      try {
        const response = await mockApiClient.get('/products');
        if (Array.isArray(response.data) && response.data.length > 0) {
          return {
            products: response.data,
            source: 'mockapi',
          };
        }
      } catch (error) {
        console.warn(
          '[productService] MockAPI request failed, falling back to local dataset.',
          error.message
        );
      }
    }

    // Realistic simulated network delay for smooth skeleton demonstration (300ms)
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      products: INITIAL_PRODUCTS,
      source: 'local',
    };
  },

  /**
   * Fetch a single product by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getProductById(id) {
    const hasMockApiUrl = Boolean(import.meta.env.VITE_MOCKAPI_URL);

    if (hasMockApiUrl) {
      try {
        const response = await mockApiClient.get(`/products/${id}`);
        if (response.data) {
          return response.data;
        }
      } catch {
        // Fall back to local search
      }
    }

    const localItem = INITIAL_PRODUCTS.find((p) => p.id === id);
    return localItem || null;
  },
};
