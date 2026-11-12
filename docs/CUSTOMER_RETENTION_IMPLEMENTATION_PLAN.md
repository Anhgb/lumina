# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG CUSTOMER RETENTION (IMPLEMENTATION PLAN)
**Tài liệu:** `CUSTOMER_RETENTION_IMPLEMENTATION_PLAN.md`  
**Phiên bản:** 1.0 — Phân kỳ thực thi (Roadmap & Execution Strategy)  
**Nguyên tắc:** Triển khai từng module độc lập, kiểm thử liên tục, không phá vỡ tính năng hiện tại, không tự tiện kích hoạt chính sách khi chưa phê duyệt.

---

## 1. TỔNG QUAN LỘ TRÌNH TRIỂN KHAI (ROADMAP OVERVIEW)

```
[Phase 1 / Prompt 02] My Lumina Customer Portal & My Orders API
       │
       ▼
[Phase 2 / Prompt 03] Lumina Care: After-Sales & Warranty Ticket System
       │
       ▼
[Phase 3 / Prompt 04] Lumina Membership & Loyalty Ledger Engine
       │
       ▼
[Phase 4 / Prompt 05] Customer Reviews & Verified Buyer Feedback
       │
       ▼
[Phase 5 / Prompt 06] Notification Center & Consent Management
       │
       ▼
[Phase 6 / Prompt 07] Lumina AI Concierge After-Sales Tools Integration
       │
       ▼
[Phase 7 / Prompt 08] Security Audit, End-to-End Testing & Final Acceptance
```

---

## 2. KẾ HOẠCH CHI TIẾT THEO TỪNG GIAI ĐOẠN

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 1 (PROMPT 02) — MY LUMINA CUSTOMER PORTAL
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Cung cấp khu vực tài khoản tập trung (`/account`) cho Customer theo dõi đơn hàng, cấu hình kính 3D đã mua/lưu và quản lý thông tin cá nhân.
* **Tệp dự kiến tạo mới:**
  - `src/pages/AccountPage.jsx`: Giao diện chính của Customer Portal gồm các tabs.
  - `src/components/account/ProfileOverviewTab.jsx`: Tổng quan hồ sơ, thẻ thành viên.
  - `src/components/account/OrderHistoryTab.jsx`: Danh sách đơn hàng & trạng thái.
  - `src/components/account/OrderDetailModal.jsx`: Modal chi tiết đơn hàng, toa kính, Snapshot 3D.
  - `src/components/account/BespokeCollectionTab.jsx`: Bộ sưu tập kính 3D đã mua & bản nháp.
  - `server/src/routes/me.routes.js`: Router bảo vệ cho người dùng hiện tại.
  - `server/src/controllers/me.controller.js`: Xử lý dữ liệu hồ sơ và đơn hàng cá nhân.
* **Tệp dự kiến chỉnh sửa:**
  - `src/App.jsx`: Khai báo route `/account` (được bảo vệ bởi `ProtectedRoute requiredRole="customer"`).
  - `src/components/common/Navbar.jsx`: Thêm nút truy cập "Tài khoản của tôi" khi đã đăng nhập.
  - `src/api/orderService.js`: Bổ sung hàm `fetchMyOrders()`.
  - `server/src/app.js`: Mount router `/api/me`.
* **API Endpoints mới:**
  - `GET /api/me/profile`: Lấy thông tin cá nhân của `req.user.id`.
  - `GET /api/me/orders`: Lấy danh sách đơn hàng của riêng khách đang đăng nhập (`WHERE user_id = ?`).
  - `GET /api/me/orders/:orderCode`: Lấy chi tiết đơn kèm quyền sở hữu.
  - `GET /api/me/designs`: Lấy danh sách kính 3D Bespoke đã đặt từ các đơn hàng.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  - Guest truy cập `/account` bị chặn và chuyển sang AuthModal.
  - Customer A không thể xem đơn hoặc kính 3D của Customer B (Chống IDOR).
  - Hiển thị đầy đủ Snapshot, toa kính và thông số càng/khắc chữ laser.
  - `npm test` và `npm run build` giữ vững 100% pass.

---

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 2 (PROMPT 03) — LUMINA CARE: AFTER-SALES & WARRANTY REQUESTS
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Xây dựng quy trình khép kín tiếp nhận yêu cầu bảo hành, vệ sinh, sửa chữa từ khách hàng và quản lý xử lý trên Admin Dashboard.
* **Tệp dự kiến tạo mới:**
  - `src/pages/CarePage.jsx`: Cổng dịch vụ khách hàng Lumina Care.
  - `src/components/care/CreateRequestModal.jsx`: Form tạo phiếu yêu cầu (chọn đơn hàng, loại dịch vụ, mô tả).
  - `src/components/care/RequestTimeline.jsx`: Dòng thời gian tiến độ xử lý ticket.
  - `src/components/admin/CareManagementTab.jsx`: Tab quản lý phiếu hỗ trợ trên Admin Dashboard.
  - `server/src/routes/care.routes.js`: Router tiếp nhận & xử lý ticket.
  - `server/src/controllers/care.controller.js`: Controller hỗ trợ sau bán.
  - `server/src/services/care.service.js`: Nghiệp vụ Ticket State Machine & Events log.
* **Tệp dự kiến chỉnh sửa:**
  - `src/pages/AdminDashboard.jsx`: Thêm tab `care` (Quản lý Yêu cầu Bảo hành).
  - `server/src/routes/admin.routes.js`: Thêm route cập nhật ticket cho Admin.
* **API Endpoints mới:**
  - `POST /api/care/requests`: Khách hàng tạo phiếu yêu cầu mới.
  - `GET /api/care/my-requests`: Khách hàng xem danh sách phiếu của mình.
  - `GET /api/care/requests/:ticketCode`: Chi tiết phiếu và lịch sử sự kiện.
  - `POST /api/care/requests/:ticketCode/messages`: Khách phản hồi/trao đổi.
  - `GET /api/admin/care/requests`: Admin lọc và tìm kiếm danh sách ticket.
  - `PATCH /api/admin/care/requests/:ticketCode/status`: Admin cập nhật trạng thái theo State Machine.
  - `POST /api/admin/care/requests/:ticketCode/notes`: Admin thêm ghi chú nội bộ.
* **Tiêu chí nghiệm thu:**
  - Mã phiếu sinh tự động dạng `CARE-YYYYMM-XXXX`.
  - Tuân thủ State Machine: `submitted` -> `reviewing` -> `approved` -> `in_progress` -> `resolved` -> `closed`.
  - Phân tách rõ ràng ghi chú nội bộ (`is_internal_only = 1`) không để lộ cho khách hàng.

---

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 3 (PROMPT 04) — LUMINA MEMBERSHIP & LOYALTY LEDGER
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Xây dựng động cơ tích điểm và quản lý hạng thành viên an toàn, chống gian lận, không phụ thuộc tính toán từ Frontend.
* **Tệp dự kiến tạo mới:**
  - `server/src/services/loyalty.service.js`: Xử lý ghi sổ cái điểm (Ledger), khoá Idempotency, nâng hạng thành viên.
  - `server/src/routes/loyalty.routes.js`: Tra cứu lịch sử điểm.
  - `src/components/account/LoyaltyHistoryModal.jsx`: Xem sổ cái điểm cá nhân.
* **Tệp dự kiến chỉnh sửa:**
  - `server/src/services/admin.service.js`: Sự kiện xác nhận giao hàng kích hoạt tích điểm an toàn.
  - `server/src/services/checkout.service.js`: Áp dụng trừ điểm giảm giá (Redeem Points) khi thanh toán.
* **API Endpoints mới:**
  - `GET /api/loyalty/balance`: Lấy số dư điểm và hạng thành viên.
  - `GET /api/loyalty/history`: Lấy lịch sử biến động điểm (Ledger entries).
  - `POST /api/admin/loyalty/adjust`: Admin điều chỉnh điểm thủ công (kèm lý do và audit log).
* **Quy tắc & Tiêu chí nghiệm thu:**
  - Mọi giao dịch điểm đều có `idempotency_key` duy nhất.
  - Không thể redeem điểm vượt quá số dư hiện có.
  - Điểm chỉ được cộng sau khi có sự kiện giao hàng thành công được xác nhận.

---

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 4 (PROMPT 05) — CUSTOMER REVIEWS & VERIFIED PURCHASES
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Thu thập đánh giá sản phẩm từ người mua thực, hiển thị sao uy tín trên trang Catalog và Chi tiết sản phẩm.
* **Tệp dự kiến tạo mới:**
  - `src/components/reviews/ProductReviewList.jsx`: Danh sách đánh giá của sản phẩm.
  - `src/components/reviews/WriteReviewModal.jsx`: Form đánh giá (sao, tiêu đề, nhận xét).
  - `src/components/admin/ReviewModerationTab.jsx`: Tab duyệt đánh giá trên Admin Dashboard.
  - `server/src/routes/review.routes.js`: Router đánh giá sản phẩm.
  - `server/src/controllers/review.controller.js`: Xử lý đánh giá.
  - `server/src/services/review.service.js`: Nghiệp vụ kiểm tra mua hàng thực tế & tính điểm trung bình.
* **API Endpoints mới:**
  - `GET /api/products/:productId/reviews`: Khách xem đánh giá công khai đã được duyệt.
  - `POST /api/reviews`: Khách gửi đánh giá (Backend kiểm tra `orders` đã hoàn tất của user).
  - `GET /api/admin/reviews`: Admin xem danh sách đánh giá chờ duyệt.
  - `PATCH /api/admin/reviews/:id/status`: Admin duyệt (`approved`) hoặc từ chối (`rejected`).
* **Tiêu chí nghiệm thu:**
  - Khách chưa mua hoặc đơn chưa hoàn tất bị từ chối đánh giá (HTTP 403 / 400).
  - Mỗi sản phẩm trong một đơn hàng chỉ được đánh giá duy nhất 1 lần.

---

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 5 (PROMPT 06) — NOTIFICATION CENTER & CONSENT MANAGEMENT
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Cung cấp trung tâm thông báo In-app trên giao diện web và quản lý sự đồng ý nhận tin tiếp thị (Consent) của khách hàng.
* **Tệp dự kiến tạo mới:**
  - `src/components/common/NotificationBell.jsx`: Chuông thông báo trên thanh Navbar.
  - `src/components/account/NotificationList.jsx`: Hộp thư thông báo trong My Lumina.
  - `server/src/services/notification.service.js`: Dispatcher phát thông báo nội bộ.
  - `server/src/routes/notification.routes.js`: Router thông báo cá nhân.
* **Tệp dự kiến chỉnh sửa:**
  - `src/components/common/Navbar.jsx`: Gắn NotificationBell cạnh giỏ hàng.
* **API Endpoints mới:**
  - `GET /api/me/notifications`: Lấy danh sách thông báo của khách.
  - `PATCH /api/me/notifications/:id/read`: Đánh dấu đã đọc.
  - `PATCH /api/me/notifications/read-all`: Đánh dấu đọc tất cả.
  - `POST /api/me/consents`: Cập nhật tùy chọn nhận thông báo và tiếp thị.
* **Tiêu chí nghiệm thu:**
  - Chuông hiển thị badge số lượng thông báo chưa đọc theo thời gian thực.
  - Không có thông báo rác hoặc spam.

---

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 6 (PROMPT 07) — LUMINA AI CONCIERGE AFTER-SALES INTEGRATION
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Nâng cấp AI Concierge trở thành trợ lý giải đáp sau mua, tra cứu tiến độ ticket và tư vấn chăm sóc kính dựa trên tri thức chính thống.
* **Tệp dự kiến tạo mới:**
  - `server/src/ai/careAdvisor.js`: Tool tra cứu trạng thái ticket bảo hành qua `req.user.id`.
* **Tệp dự kiến chỉnh sửa:**
  - `server/src/ai/intentClassifier.js`: Nhận diện ý định bảo hành, vệ sinh, kiểm tra tiến độ hỗ trợ.
  - `server/src/ai/faq.data.js`: Bổ sung tri thức bảo quản kính, vệ sinh tròng, chính sách đổi trả.
  - `server/src/ai/promptBuilder.js`: Thiết lập rào chắn AI không tự ý cam kết đền bù hoặc sửa đổi dữ liệu.
* **Tiêu chí nghiệm thu:**
  - AI trả lời chính xác tiến độ phiếu hỗ trợ khi khách hỏi "Phiếu bảo hành của tôi đến đâu rồi?".
  - Chặn triệt để: AI không được tự thay đổi trạng thái ticket hoặc cộng điểm cho khách.

---

### ─────────────────────────────────────────────────────────────────────────────
### GIAI ĐOẠN 7 (PROMPT 08) — E2E TESTING, SECURITY AUDIT & BÁO CÁO NGHIỆM THU
### ─────────────────────────────────────────────────────────────────────────────
* **Mục tiêu:** Kiểm thử toàn diện toàn bộ các kịch bản giữ chân khách hàng, quét lỗ hổng IDOR, Injection và lập báo cáo nghiệm thu chính thức.
* **Kịch bản kiểm thử bắt buộc (Minimum Test Scenarios):**
  1. Guest truy cập `/account` -> Yêu cầu đăng nhập.
  2. Customer A tra cứu đơn hàng hoặc ticket của Customer B -> HTTP 403 Forbidden.
  3. Khách hàng gửi yêu cầu bảo hành cho sản phẩm chưa mua -> Bị từ chối.
  4. Chuyển đổi trạng thái ticket bảo hành trái phép -> HTTP 400 Bad Request.
  5. Cộng điểm trùng lặp cùng một sự kiện -> Idempotency chặn đứng.
  6. Khách hàng đánh giá sản phẩm đã mua -> Ghi nhận và hiển thị sao đúng.
  7. Khách hàng chưa mua cố gắng đánh giá -> HTTP 403 Forbidden.
  8. AI Concierge tra cứu phiếu hỗ trợ -> Trả lời đúng, không vượt quyền.
  9. Regression test toàn bộ 154 tests hiện tại -> Đảm bảo pass 100%.
  10. `npm run build` -> Hoàn tất với 0 lỗi.

---

## 3. CHIẾN LƯỢC QUẢN LÝ THAY ĐỔI & KHÔI PHỤC (ROLLBACK STRATEGY)

1. **Nguyên tắc cơ sở dữ liệu:**
   - Mọi bảng mới đều dùng `CREATE TABLE IF NOT EXISTS`, tuyệt đối không `DROP` hoặc `ALTER` cấu trúc cốt lõi của các bảng hiện hữu (`orders`, `order_items`, `products`, `custom_specs`).
   - Nếu cần huỷ bỏ tính năng sau mua, chỉ cần vô hiệu hoá các route `/api/me`, `/api/care`, `/api/loyalty` mà không làm ảnh hưởng đến luồng Mua hàng và Admin cốt lõi.
2. **Nguyên tắc giao diện người dùng:**
   - Trang `/account` và `/care` là các trang độc lập, không can thiệp vào mã nguồn của `StudioPage.jsx`, `CatalogPage.jsx` hay `ThreeDCustomizer.jsx`.
   - Giỏ hàng và quy trình Checkout giữ nguyên logic tính giá gốc, chỉ mở rộng tuỳ chọn trừ điểm thưởng nếu có.

