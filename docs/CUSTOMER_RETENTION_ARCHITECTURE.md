# KIẾN TRÚC HỆ THỐNG CHĂM SÓC SAU MUA & GIỮ CHÂN KHÁCH HÀNG (LUMINA CUSTOMER RETENTION)
**Tài liệu:** `CUSTOMER_RETENTION_ARCHITECTURE.md`  
**Phiên bản:** 1.0 — Architecture Audit & Blueprint  
**Vai trò:** Senior Software Architect  
**Trạng thái:** Audit hoàn tất — Thiết kế kiến trúc (Dừng trước khi chỉnh sửa code/database)

---

## 1. TỔNG QUAN HỆ THỐNG & KẾT QUẢ KHẢO SÁT THỰC TẾ (SYSTEM AUDIT)

Hệ thống Lumina Eyewear hiện tại được xây dựng trên nền tảng:
- **Frontend:** React 18, Vite, Tailwind CSS, Three.js, MediaPipe, React Router v6.
- **Backend:** Node.js (v24), Express 4.21, MySQL 8 / MariaDB (qua `mysql2/promise`), connection pool.
- **Authentication:** Demo JWT & Token RBAC Middleware (`authenticate`, `requireCustomer`, `requireAdmin`).
- **AI Concierge:** Kiến trúc Hybrid (Local FAQ/Tools + LLM Provider Factory cho Gemini / OpenAI).

### 1.1. Bảng đối chiếu 8 điểm xác minh kỹ thuật

| STT | Hạng mục kiểm tra | Trạng thái hiện tại trong mã nguồn | Đánh giá & Rủi ro kiến trúc |
|---|---|---|---|
| **1** | Xác định Customer & User ID thẩm quyền | • Token truyền qua header `Authorization: Bearer <token>`<br>• `authMiddleware.js` giải mã và trích xuất `req.user.id` (`cust-lumina-01`, `cust-lumina-02`, hoặc `user-${timestamp}`)<br>• Client lưu user trong `localStorage` (`lumina_auth_user`). | • **Đã bảo mật Backend**: Mọi controller đều lấy `user_id` từ `req.user.id`, không tin `userId` do client gửi.<br>• **Hạn chế**: Chưa có bảng `users` riêng trong MySQL; tài khoản demo chỉ phục vụ đồ án, chưa có JWT private-key signing. |
| **2** | Cấu trúc `orders`, `order_items`, `custom_specs`, `products`, `payments` | • `orders`: lưu thông tin người nhận, địa chỉ, tổng tiền, `payment_status`, `status`, `user_id`.<br>• `payments`: quản lý lịch sử thanh toán, idempotency, đối soát manual/webhook.<br>• `order_items`: chứa `prescription_data` (JSON).<br>• `custom_specs`: chứa 12 thông số 3D, khắc laser, kiểu càng và `snapshot_path`.<br>• `products`: quản lý catalog và tồn kho `stock`. | • Schema chặt chẽ, có foreign key cascade.<br>• Chưa có trường ghi nhận thời điểm giao hàng (`delivered_at`) hoặc mã vận đơn. |
| **3** | Trạng thái đơn hàng & Nguồn xác nhận giao hàng | • Trạng thái: `pending`, `confirmed`, `processing`, `completed`, `cancelled`.<br>• Chuyển trạng thái tuân thủ nghiêm ngặt State Machine trong `admin.service.js`.<br>• **KHÔNG CÓ nguồn xác nhận giao hàng tự động** (chưa có 3PL courier API, tracking code, hoặc webhook vận chuyển). | • **CẢNH BÁO QUAN TRỌNG**: Trạng thái `completed` hiện nay do Admin bấm thủ công, KHÔNG ĐƯỢC đồng nhất với "đã giao hàng thành công".<br>• Cần bổ sung trường/bảng quản lý sự kiện giao hàng (Delivery Event) có audit log. |
| **4** | Thông tin Customer khi Checkout & Quyền sở hữu đơn | • Checkout lưu: họ tên, email, SĐT, địa chỉ, thành phố, ghi chú.<br>• `orders.user_id` liên kết với `req.user.id`.<br>• `getOrderDetails` chặn IDOR: kiểm tra `order.user_id === req.user.id` (khách khác nhận HTTP 403). | • Quyền sở hữu được kiểm soát nghiêm ngặt ở Server.<br>• Thiếu endpoint để Customer lấy danh sách toàn bộ đơn hàng của chính mình (`GET /api/me/orders`). |
| **5** | Cơ chế lưu `designSpec`/Snapshot & Khả năng hiển thị lại | • Snapshot dataUrl được lưu thành file tĩnh tại `server/uploads/snapshots/` và serve qua `/uploads`.<br>• Các thuộc tính 3D lưu chi tiết trong `custom_specs`. | • Ảnh thumbnail 2D tải cực nhanh qua URL tĩnh.<br>• Dữ liệu `custom_specs` đủ 100% để tái dựng mô hình 3D trong Three.js (chế độ xem lại hoặc tái tùy biến). |
| **6** | Cấu trúc Admin Dashboard & Khả năng mở rộng tab | • `AdminDashboard.jsx` tổ chức dạng Tab State (`orders`, `inventory`, `analytics`).<br>• Backend `admin.routes.js` bảo vệ bằng `authenticate, requireAdmin`. | • Cực kỳ thuận lợi để thêm các tab quản lý mới: `care` (Yêu cầu hỗ trợ), `reviews` (Đánh giá), `loyalty` (Khách hàng & Điểm thưởng). |
| **7** | Tồn tại của Email / SMS / Push Provider | • **XÁC NHẬN 100% KHÔNG TỒN TẠI**.<br>• `package.json` không có nodemailer, twilio, sendgrid, web-push.<br>• Frontend `forgotPassword` chỉ giả lập bằng `setTimeout`. | • **Nguyên tắc**: Tuyệt đối không giả mạo việc gửi email/SMS thật.<br>• Thiết kế In-app Notification Center trên web; chuẩn bị sẵn Adapter Interface cho Email/SMS sau này. |
| **8** | Hiện trạng Lumina AI Concierge | • Đã có hệ thống Chat đầy đủ: bảng `chat_sessions`, `chat_messages`, `chat_feedbacks`.<br>• Hybrid Architecture: Rule-based FAQ & Catalog Tools kết hợp LLM Provider Factory (Gemini / OpenAI). | • Có thể mở rộng thêm Tool `afterSalesAdvisor` để AI tra cứu trạng thái bảo hành và chính sách mà không cho phép AI tự ý chỉnh sửa dữ liệu. |

---

## 2. KIẾN TRÚC TỔNG THỂ (HIGH-LEVEL ARCHITECTURE)

```
+---------------------------------------------------------------------------------------------------+
|                                      FRONTEND (React + Vite)                                      |
|                                                                                                   |
|  +-----------------------+  +------------------------+  +-------------------+  +---------------+  |
|  | My Lumina Portal      |  | Lumina Care Portal     |  | Reviews & Rating  |  | AI Concierge  |  |
|  | (/account)            |  | (/care)                |  | (Product Details) |  | (ChatWidget)  |  |
|  | - Hồ sơ & Điểm thành  |  | - Gửi yêu cầu bảo hành |  | - Viết đánh giá   |  | - Tra cứu     |  |
|  |   viên (Loyalty)      |  | - Theo dõi tiến độ     |  | - Đánh giá đã mua |  |   bảo hành/đơn |  |
|  | - Đơn hàng của tôi    |  | - Hướng dẫn bảo quản   |  |   (Verified)      |  | - Hướng dẫn   |  |
|  | - Kính 3D đã lưu/mua  |  |                        |  |                   |  |   chăm sóc    |  |
|  +-----------------------+  +------------------------+  +-------------------+  +---------------+  |
|                                         |                                                         |
|                             Axios Interceptor (Bearer Token)                                      |
+-----------------------------------------|---------------------------------------------------------+
                                          |
                                HTTP REST API Requests
                                          |
+-----------------------------------------v---------------------------------------------------------+
|                                    BACKEND (Node.js + Express)                                    |
|                                                                                                   |
|  [Security Middlewares]                                                                           |
|   ├── authMiddleware (authenticate, requireCustomer, requireAdmin)                                |
|   ├── ownershipGuard (xác thực quyền sở hữu đơn hàng / yêu cầu bảo hành / review)                 |
|   └── rateLimiter & contentSanitizer                                                              |
|                                                                                                   |
|  [Business Services Layer]                                                                        |
|   ├── CustomerPortalService: Lấy profile, danh sách đơn của tôi, kính đã mua                      |
|   ├── AfterSalesService: Quản lý ticket hỗ trợ, vòng đời bảo hành, audit events                   |
|   ├── LoyaltyService: Ghi sổ điểm (Ledger), tính hạng thành viên, đối soát điểm                   |
|   ├── ReviewService: Kiểm tra điều kiện mua thực (Verified Purchase), lưu và duyệt review        |
|   ├── NotificationService: In-app Notification Dispatcher + Email/SMS Adapter (Mock/Ready)        |
|   └── AIChatService: Mở rộng Tool AfterSalesAdvisor tra cứu ticket có kiểm soát                   |
|                                                                                                   |
|  [Data Access Layer (MySQL Connection Pool & Transactions)]                                       |
+-----------------------------------------|---------------------------------------------------------+
                                          |
                                MySQL Queries / Prepared Statements
                                          |
+-----------------------------------------v---------------------------------------------------------+
|                                  DATABASE (MySQL / MariaDB)                                       |
|                                                                                                   |
|  [Core Tables (Đã có)]          [Customer Retention Extension Tables (Mới)]                       |
|   - products                     - customer_profiles (Hồ sơ, hạng thành viên, tổng chi tiêu)      |
|   - orders                       - loyalty_ledgers (Sổ cái biến động điểm, idempotent)            |
|   - order_items                  - after_sales_requests (Yêu cầu bảo hành / sửa chữa)             |
|   - custom_specs                 - after_sales_events (Lịch sử xử lý ticket & trao đổi)           |
|   - payments                     - product_reviews (Đánh giá sản phẩm đã xác thực mua)            |
|   - chat_sessions/messages       - customer_notifications (Hộp thư thông báo nội bộ In-app)       |
|                                  - customer_consents (Lưu trữ đồng ý nhận tin marketing)          |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. THIẾT KẾ CÁC PHÂN HỆ CHỨC NĂNG (SUBSYSTEM DESIGNS)

### 3.1. Phân hệ 1: My Lumina — Customer Portal (`/account`)
* **Mục tiêu:** Cung cấp không gian cá nhân hoá cho khách hàng đã đăng nhập để quản lý toàn bộ mối quan hệ với Lumina.
* **Các thành phần giao diện:**
  1. **Tab 1: Tổng quan (Overview):** Thông tin cá nhân, thẻ thành viên số (Digital Membership Card), điểm khả dụng, hạng thành viên (`Member`, `Silver`, `Gold`, `Diamond`), thống kê đơn hàng.
  2. **Tab 2: Đơn hàng của tôi (My Orders):** Danh sách toàn bộ đơn hàng lọc theo trạng thái, tìm kiếm theo mã đơn. Bấm xem chi tiết: danh sách sản phẩm, toa kính (OD/OS/PD), trạng thái thanh toán, và nút kích hoạt yêu cầu chăm sóc kính.
  3. **Tab 3: Bộ sưu tập kính 3D (Bespoke Atelier Collection):** 
     - Phân loại rõ: **Kính đã mua** (lấy từ các đơn hàng thành công, hiển thị Snapshot chính thức và nút "Chiêm ngưỡng 3D") và **Bản nháp đang lưu** (lấy từ `CustomGlassesContext` / local storage).
  4. **Tab 4: Lumina Care (Yêu cầu bảo hành & Chăm sóc):** Danh sách các phiếu bảo hành/sửa chữa đang xử lý, trạng thái và phản hồi từ thợ kỹ thuật.
  5. **Tab 5: Cài đặt & Nhận tin (Preferences & Consent):** Cập nhật thông tin liên hệ, tùy chọn bật/tắt nhận thông báo chăm sóc hoặc ưu đãi.

### 3.2. Phân hệ 2: Lumina Care — Dịch vụ sau mua & Bảo hành
* **Mục tiêu:** Tiếp nhận và xử lý khiếu nại, bảo hành, vệ sinh định kỳ, cân chỉnh gọng và sửa chữa.
* **Loại yêu cầu hỗ trợ (Support Types):**
  - `warranty_claim`: Yêu cầu bảo hành lỗi kỹ thuật sản xuất.
  - `fit_adjustment`: Điều chỉnh độ ôm, ve mũi, càng kính cho vừa vặn khuôn mặt.
  - `deep_cleaning`: Vệ sinh siêu âm và làm mới kính.
  - `repair_service`: Sửa chữa linh kiện (thay ốc, đệm mũi, thay tròng).
  - `usage_consultation`: Tư vấn kỹ thuật và cách bảo quản kính.
  - `other`: Vấn đề khác.
* **Vòng đời trạng thái yêu cầu (State Machine):**
  - `submitted`: Khách hàng mới gửi yêu cầu.
  - `reviewing`: Kỹ thuật viên/Admin đang xem xét thông tin và hình ảnh.
  - `waiting_customer`: Đang chờ khách hàng phản hồi bổ sung thông tin hoặc gửi kính về xưởng.
  - `approved`: Yêu cầu được chấp thuận theo điều kiện bảo hành/sửa chữa.
  - `in_progress`: Đang trong quá trình chế tác/sửa chữa/vệ sinh tại xưởng Lumina.
  - `resolved`: Đã xử lý xong và gửi trả kính cho khách hàng.
  - `rejected`: Từ chối (nằm ngoài phạm vi bảo hành hoặc vi phạm điều khoản sử dụng).
  - `closed`: Khách hàng hài lòng và đóng phiếu hỗ trợ.

### 3.3. Phân hệ 3: Lumina Membership & Loyalty (Điểm thưởng & Hạng thành viên)
* **Nguyên tắc cốt lõi:**
  - **Single Source of Truth:** Điểm được tính toán và lưu vết duy nhất tại Backend thông qua cơ chế **Double-Entry Ledger (Sổ cái điểm)**.
  - **Idempotency:** Mỗi giao dịch cộng/trừ điểm gắn liền với một `idempotency_key` hoặc `reference_id` (ví dụ mã đơn hàng, mã ticket). Không thể cộng điểm 2 lần cho cùng một sự kiện.
  - **Sự kiện kích hoạt tích điểm:** Điểm KHÔNG được cộng ngay khi đặt hàng. Điểm chỉ được cộng sau khi đơn hàng chuyển sang trạng thái giao hàng thành công và kết thúc thời gian đổi trả quy định.

### 3.4. Phân hệ 4: Customer Reviews (Đánh giá sản phẩm đã xác thực)
* **Quy chuẩn đánh giá minh bạch:**
  - Chỉ khách hàng có tài khoản đã mua sản phẩm trong một đơn hàng đã hoàn tất (`order_items` thuộc đơn `status = 'completed'`) mới được đánh giá sản phẩm đó (`is_verified_buyer = 1`).
  - Mỗi sản phẩm trong một đơn hàng chỉ được đánh giá tối đa 1 lần.
  - Điểm thưởng (nếu có): Được tặng khi hoàn thành đánh giá hợp lệ đầu tiên, **tuyệt đối không phụ thuộc vào việc đánh giá 1 sao hay 5 sao**.

### 3.5. Phân hệ 5: Notification & Engagement Center
* **Kiến trúc Notification:**
  - Lưu trữ trong bảng `customer_notifications` trong database.
  - Khách hàng xem thông báo qua biểu tượng chuông trên Navbar hoặc trong tab Thông báo tại My Lumina Portal.
  - Hệ thống phát thông báo khi: Đơn hàng đổi trạng thái, thanh toán thành công, ticket bảo hành có cập nhật, điểm thưởng được cộng/hết hạn.
  - Thiết kế `NotificationService` theo mẫu Adapter:
    - `InAppNotificationAdapter`: Ghi vào database (hoạt động thực tế 100%).
    - `EmailNotificationAdapter`: Interface chuẩn, log ra console ở môi trường Demo, sẵn sàng kết nối SendGrid/Nodemailer khi có thông tin cấu hình thật.

### 3.6. Phân hệ 6: Lumina AI Concierge After-Sales Integration
* **Quyền hạn được kiểm soát nghiêm ngặt:**
  - Bổ sung Tool `afterSalesAdvisor` cho phép AI tra cứu tiến độ ticket bảo hành của chính khách hàng đang đăng nhập (thông qua `req.user.id`).
  - Trả lời các câu hỏi thường gặp về bảo quản kính, cách vệ sinh tròng kính, chính sách đổi trả dựa trên tri thức đã được phê duyệt.
  - **Rào chắn bảo mật (Guardrails):**
    - AI KHÔNG được phép tạo hoặc tự duyệt phiếu bảo hành.
    - AI KHÔNG được phép thay đổi điểm thưởng hoặc trạng thái đơn hàng.
    - AI KHÔNG truy cập câu lệnh SQL trực tiếp.

---

## 4. MA TRẬN PHÂN QUYỀN VÀ BẢO MẬT (SECURITY & ACCESS CONTROL)

| Endpoint / Hành động | Khách vãng lai (Guest) | Khách hàng (Customer) | Quản trị viên (Admin) | Cơ chế kiểm tra bảo mật |
|---|---|---|---|---|
| Xem trang cá nhân `/account` | ❌ Bị redirect / yêu cầu đăng nhập | ✅ Xem thông tin của chính mình | ❌ Không dùng cho Admin | `authenticate`, `requireCustomer` |
| Xem danh sách đơn `GET /api/me/orders` | ❌ 401 Unauthorized | ✅ Chỉ xem đơn có `user_id = req.user.id` | ❌ Dùng `admin/orders` | Backend Ownership Query (`WHERE user_id = ?`) |
| Gửi yêu cầu bảo hành `POST /api/care/requests` | ❌ 401 Unauthorized | ✅ Tạo yêu cầu cho đơn của mình | ❌ 403 Forbidden | Kiểm tra `order.user_id === req.user.id` |
| Cập nhật trạng thái bảo hành | ❌ 401 Unauthorized | ❌ 403 Forbidden | ✅ Toàn quyền phê duyệt | `requireAdmin`, State Machine Check |
| Gửi đánh giá sản phẩm | ❌ 401 Unauthorized | ✅ Phải có đơn hàng hợp lệ | ❌ 403 Forbidden | `Verified Purchase Validator` |
| Cộng/trừ điểm thủ công | ❌ 401 Unauthorized | ❌ 403 Forbidden | ✅ Có audit log lý do | `requireAdmin`, ghi nhận `admin_id` |

---

## 5. CÁC QUYẾT ĐỊNH CẦN NGƯỜI QUẢN TRỊ LUMINA PHÊ DUYỆT (PENDING BUSINESS DECISIONS)

> [!IMPORTANT]
> Toàn bộ các thông số dưới đây hiện ở trạng thái **`DRAFT / CHƯA ĐƯỢC DUYỆT`**. Hệ thống kỹ thuật được thiết kế theo dạng tham số động (Dynamic Configuration), không hardcode vào logic cốt lõi.

1. **Chính sách bảo hành & dịch vụ Lumina Care `[DRAFT / CHƯA ĐƯỢC DUYỆT]`:**
   - Thời hạn bảo hành lỗi sản xuất: Đề xuất minh họa **12 tháng** cho gọng kính, **06 tháng** cho lớp váng phủ tròng kính.
   - Dịch vụ vệ sinh & căn chỉnh ve mũi: Đề xuất minh họa **Miễn phí trọn đời** tại chuỗi cửa hàng Lumina.
   - Quy định đổi hàng: Đề xuất minh họa trong vòng **07 ngày** kể từ ngày giao hàng đối với sản phẩm nguyên vẹn; kính thiết kế riêng Bespoke 3D chỉ hỗ trợ căn chỉnh kỹ thuật, không áp dụng đổi trả vì lý do đổi ý.

2. **Chương trình thành viên Lumina Membership `[DRAFT / CHƯA ĐƯỢC DUYỆT]`:**
   - Tỷ lệ tích điểm: Đề xuất minh họa **1% giá trị thanh toán** (100.000 VNĐ = 1 điểm).
   - Giá trị quy đổi: Đề xuất minh họa **1 điểm = 1.000 VNĐ** (trừ trực tiếp vào đơn hàng kế tiếp).
   - Hạng thành viên (Tiers):
     - **Member:** 0 – 49 điểm (Quyền lợi cơ bản, vệ sinh kính miễn phí).
     - **Silver:** 50 – 199 điểm (Ưu đãi 5% sinh nhật, tặng khăn lau cao cấp).
     - **Gold:** 200 – 499 điểm (Ưu đãi 10% sinh nhật, miễn phí vận chuyển 2 chiều khi bảo hành).
     - **Diamond:** Từ 500 điểm (Ưu đãi 15% sinh nhật, chế tác charm độc quyền, dịch vụ VIP tại nhà).
   - Thời hạn điểm: Đề xuất minh họa **12 tháng** kể từ ngày phát sinh điểm.

3. **Quy trình xác nhận giao hàng (Delivery Confirmation) `[DRAFT / CHƯA ĐƯỢC DUYỆT]`:**
   - Vì hệ thống chưa kết nối API hãng vận chuyển, đề xuất quy trình kết hợp:
     - **Admin Action:** Nhân viên vận hành cập nhật mã vận đơn và ngày giao thực tế kèm ghi chú đối tác giao hàng.
     - **Customer Action:** Khách hàng có nút "Đã nhận hàng an toàn" trên My Lumina Portal để chủ động kích hoạt bảo hành điện tử và nhận ngay điểm thưởng thành viên.

