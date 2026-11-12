import { Router } from 'express';
import { testConnection } from '../config/database.js';

const router = Router();

/**
 * GET /api/health — Server & MySQL Health Check Endpoint.
 * Conforms to Prompt 7 Section 9 & 10.
 */
router.get('/health', async (req, res) => {
  const isDbConnected = await testConnection();

  const healthData = {
    status: isDbConnected ? 'healthy' : 'degraded',
    service: 'lumina-eyewear-backend',
    version: '1.0.0',
    database: {
      type: 'MySQL / MariaDB (XAMPP)',
      connected: isDbConnected,
      name: process.env.DB_NAME || 'lumina_eyewear_db',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
    },
    demoMode: process.env.DEMO_MODE === 'true',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  const statusCode = isDbConnected ? 200 : 503;
  res.status(statusCode).json(healthData);
});

export default router;
