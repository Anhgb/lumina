import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_MODEL_PRICES as FRONTEND_MODEL_PRICES, calculateCustomEyewearPrice } from '../../src/utils/pricingCalculator.js';
import { BASE_MODEL_PRICES as SERVER_MODEL_PRICES, calculateAuthoritativeBespokePrice } from '../src/services/pricing.service.js';

test('Frontend and backend use the same demo base prices for every frame preset', () => {
  assert.deepEqual(Object.keys(FRONTEND_MODEL_PRICES).sort(), Object.keys(SERVER_MODEL_PRICES).sort());
  for (const [modelId, frontendModel] of Object.entries(FRONTEND_MODEL_PRICES)) {
    assert.equal(SERVER_MODEL_PRICES[modelId].price, frontendModel.basePrice, `${modelId} base price`);
    const spec = { baseModel: modelId, frameColor: '#141413', lensOpacity: 0.45, charms: [], engravingText: '' };
    assert.equal(calculateAuthoritativeBespokePrice(spec), calculateCustomEyewearPrice(spec).total, `${modelId} total`);
  }
});
