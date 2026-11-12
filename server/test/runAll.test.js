import './checkout.test.js';
import './admin.test.js';
import './payment.test.js';
import './pricing.test.js';
import './chat.test.js';
import './ai.test.js';
import './productAdvisor.test.js';
import './orderAdvisor.test.js';
import './studioAdvisor.test.js';
import './me.test.js';
import './care.test.js';
import './loyalty.test.js';
import './reviews_referral.test.js';
import './notifications.test.js';
import './aftersales_concierge.test.js';
import './admin_retention_analytics.test.js';
import './e2eSecurityAcceptance.test.js';
import './final_qa_retention_integration.test.js';
import { after } from 'node:test';

after(() => {
  setTimeout(() => process.exit(0), 100);
});
