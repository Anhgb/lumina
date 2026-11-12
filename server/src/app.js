import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/health.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import meRoutes from './routes/me.routes.js';
import careRoutes from './routes/care.routes.js';
import { customerLoyaltyRouter, publicLoyaltyRouter } from './routes/loyalty.routes.js';
import reviewRoutes from './routes/review.routes.js';
import referralRoutes from './routes/referral.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { errorHandler, NotFoundError } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// 1. CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-session-id', 'Accept', 'X-Requested-With'],
  })
);

// 2. Body Parser (10mb limit for 3D Bespoke snapshots)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Serve Snapshots Static Uploads Safely
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// 4. Mount API Routes
app.use('/api', healthRoutes);
app.use('/api', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api/me', meRoutes);
app.use('/api/me/loyalty', customerLoyaltyRouter);
app.use('/api/loyalty', publicLoyaltyRouter);
app.use('/api/care', careRoutes);
app.use('/api', reviewRoutes);
app.use('/api', referralRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// 5. Catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Đường dẫn API "${req.originalUrl}" không tồn tại trên máy chủ.`));
});

// 6. Centralized Error Handler
app.use(errorHandler);

export default app;
