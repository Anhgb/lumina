import dotenv from 'dotenv';
import { app } from './src/app.js';
import { testConnection } from './src/config/database.js';

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function startServer() {
  console.log('✦ Khởi động Lumina Eyewear Backend API...');

  // Test MySQL / MariaDB connection
  const isDbReady = await testConnection();
  if (isDbReady) {
    console.log(`✓ Đã kết nối thành công MySQL [${process.env.DB_NAME || 'lumina_eyewear_db'}] trên XAMPP (Port ${process.env.DB_PORT || 3306})`);
  } else {
    console.warn(`⚠ Cảnh báo: Không thể kết nối cơ sở dữ liệu MySQL trên ${process.env.DB_HOST}:${process.env.DB_PORT}. Vui lòng kiểm tra XAMPP MySQL.`);
  }

  const server = app.listen(PORT, () => {
    console.log(`✓ Lumina Eyewear Server đang lắng nghe tại: http://localhost:${PORT}`);
    console.log(`  ➜ Health check: http://localhost:${PORT}/api/health`);
    console.log(`  ➜ Checkout API: POST http://localhost:${PORT}/api/orders/checkout`);
    console.log(`  ➜ Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'BẬT' : 'TẮT'}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n✦ Đang tắt máy chủ Lumina Eyewear an toàn...');
    server.close(() => {
      console.log('✓ Máy chủ đã dừng.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
