import { Router } from 'express';
import {
  createCareRequest,
  getMyCareRequests,
  getMyCareRequestByCode,
  addCustomerMessage,
  rateCareRequest,
  confirmCustomerReceipt,
  checkWarrantyCoverage,
} from '../controllers/care.controller.js';
import { authenticate, requireCustomer } from '../middleware/authMiddleware.js';

const router = Router();

// Yêu cầu xác thực Customer cho tất cả các thao tác Lumina Care
router.use(authenticate, requireCustomer);

// 1. Gửi phiếu yêu cầu hỗ trợ mới
router.post('/requests', createCareRequest);

// 2. Lấy danh sách phiếu yêu cầu của khách hàng hiện tại
router.get('/requests', getMyCareRequests);

// 3. Chi tiết phiếu yêu cầu và luồng trao đổi (không lộ ghi chú nội bộ)
router.get('/requests/:ticketCode', getMyCareRequestByCode);

// 4. Khách hàng gửi tin nhắn / bổ sung thông tin
router.post('/requests/:ticketCode/messages', addCustomerMessage);

// 5. Khách hàng đánh giá chất lượng phiếu hỗ trợ
router.post('/requests/:ticketCode/rate', rateCareRequest);

// 6. Khách hàng xác nhận đã nhận hàng an toàn
router.post('/orders/:orderCode/confirm-receipt', confirmCustomerReceipt);

// 7. Tra cứu thời hạn bảo hành thực tế
router.get('/orders/:orderCode/warranty', checkWarrantyCoverage);

export default router;

