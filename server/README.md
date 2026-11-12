# LUMINA EYEWEAR — BACKEND API & MYSQL/XAMPP INTEGRATION GUIDE

Tài liệu hướng dẫn cài đặt, cấu hình, vận hành và nghiệm thu hệ thống **Backend Node.js (Express) kết nối MySQL/MariaDB (XAMPP)** cho dự án **Lumina Eyewear — 3D Bespoke & AI Eyewear Atelier** (theo PRD v5.1).

---

## 1. Yêu Cầu Môi Trường

- **Node.js**: Phiên bản 18+ (khuyến nghị 20+ LTS).
- **XAMPP**: Chạy module **MySQL** (cổng mặc định `3306`) và **Apache** (nếu dùng phpMyAdmin).
- **Trình duyệt**: Chrome/Edge/Firefox hỗ trợ WebGL và ES6.

---

## 2. Cấu Trúc Thư Mục Backend

```
server/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection pool (mysql2/promise)
│   ├── controllers/
│   │   ├── admin.controller.js  # Điều hướng thống kê, quản lý đơn hàng & tồn kho
│   │   ├── order.controller.js  # Điều hướng request checkout, get order, preview
│   │   └── payment.controller.js# Điều hướng khởi tạo và tra cứu thanh toán
│   ├── middleware/
│   │   ├── authMiddleware.js    # RBAC xác thực Server-side (Customer checkout, Admin)
│   │   └── errorHandler.js      # Xử lý tập trung lỗi HTTP (400, 401, 403, 409, 500)
│   ├── routes/
│   │   ├── admin.routes.js      # GET/PATCH /api/admin/* (Bảo vệ RBAC quản trị)
│   │   ├── health.routes.js     # GET /api/health
│   │   ├── order.routes.js      # POST /api/orders/checkout, GET /api/orders/:code
│   │   └── payment.routes.js    # POST/GET /api/payments/*
│   ├── services/
│   │   ├── admin.service.js     # Thống kê MySQL, State Machine đơn hàng & kho
│   │   ├── checkout.service.js  # Transaction MySQL, lưu snapshot, rollback
│   │   ├── payment.service.js   # Giao dịch, idempotency, trạng thái và đối soát
│   │   ├── paymentProvider.js   # Provider mock an toàn cho demo
│   │   └── pricing.service.js   # Tính giá có thẩm quyền, kiểm tra tồn kho
│   ├── validators/
│   │   └── checkout.validator.js# Kiểm tra payload khách hàng, kính 3D, PD toa kính
│   └── app.js                   # Cấu hình Express app, CORS, static uploads
├── sql/
│   ├── schema.sql               # Tạo database, bảng products, orders, order_items, custom_specs
│   ├── migrations/               # Migration cộng thêm, không xóa dữ liệu hiện có
│   └── seed.sql                 # Dữ liệu mẫu sản phẩm và đơn hàng ban đầu
├── test/
│   ├── admin.test.js            # Test suite Admin Dashboard (10 test cases)
│   ├── checkout.test.js         # Test suite Checkout & An ninh IDOR/Đơn thuốc (9 test cases)
│   ├── payment.test.js          # Payment, idempotency, quyền và đối soát
│   └── runAll.test.js           # Runner tổng hợp kết nối kiểm thử tự động
├── uploads/
│   └── snapshots/               # Nơi lưu file ảnh Snapshot kính 3D Bespoke
├── .env.example                 # File mẫu cấu hình biến môi trường
├── package.json                 # Dependencies (express, mysql2, cors, dotenv)
├── README.md                    # Tài liệu hướng dẫn này
└── server.js                    # File khởi động chính của Backend
```

---

## 3. Khởi Động MySQL Trên XAMPP & Nhập Cơ Sở Dữ Liệu

### Bước 1: Khởi động MySQL từ XAMPP Control Panel
1. Mở ứng dụng **XAMPP Control Panel**.
2. Bấm nút **Start** ở dòng **MySQL** (mặc định cổng `3306`).
3. Bấm nút **Start** ở dòng **Apache** (nếu muốn dùng phpMyAdmin tại `http://localhost/phpmyadmin`).

### Bước 2: Nhập Schema và Seed Data
Bạn có thể nhập cơ sở dữ liệu bằng **1 trong 2 cách** sau:

#### Cách A: Nhập bằng dòng lệnh (Khuyến nghị, nhanh nhất)
Mở PowerShell hoặc Command Prompt tại thư mục dự án:
```powershell
# Chạy mysql client từ XAMPP để nạp schema.sql
Get-Content d:\fe_nck22\lumina-eyewear\server\sql\schema.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root

# Nạp dữ liệu seed ban đầu
Get-Content d:\fe_nck22\lumina-eyewear\server\sql\seed.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root
```

#### Cách B: Nhập qua giao diện phpMyAdmin
1. Mở trình duyệt và truy cập: `http://localhost/phpmyadmin`
2. Nhấn vào tab **SQL**, dán nội dung từ file `server/sql/schema.sql` và bấm **Go (Thực hiện)**.
3. Tiếp tục nhấn vào database vừa tạo `lumina_eyewear_db`, vào tab **SQL**, dán nội dung file `server/sql/seed.sql` và bấm **Go**.

---

## 4. Cấu Hình Biến Môi Trường (.env)

Tạo file `server/.env` dựa trên `server/.env.example`:
```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development

# Cấu hình MySQL XAMPP cục bộ
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=lumina_eyewear_db
DB_USER=root
DB_PASSWORD=

# Chế độ Demo phục vụ đồ án
DEMO_MODE=true
MAX_SNAPSHOT_SIZE_MB=5
PAYMENT_PROVIDER=mock
```

---

## 5. Cài Đặt & Khởi Động Backend Server

1. Di chuyển vào thư mục `server/`:
   ```bash
   cd d:\fe_nck22\lumina-eyewear\server
   ```
2. Cài đặt dependencies (nếu chưa cài):
   ```bash
   npm install
   ```
3. Khởi động máy chủ Backend trong terminal này:
   ```bash
   node server.js
   ```
   *Khi khởi động thành công, console sẽ hiển thị:*
   ```text
   ✦ Khởi động Lumina Eyewear Backend API...
   ✓ Đã kết nối thành công MySQL [lumina_eyewear_db] trên XAMPP (Port 3306)
   ✓ Lumina Eyewear Server đang lắng nghe tại: http://localhost:3000
     ➜ Health check: http://localhost:3000/api/health
     ➜ Checkout API: POST http://localhost:3000/api/orders/checkout
     ➜ Admin APIs:   GET/PATCH http://localhost:3000/api/admin/*
   ```
4. Mở terminal khác tại `server/` và chạy toàn bộ API/integration tests:
   ```bash
   npm test
   ```
   Test yêu cầu MySQL đang chạy, migration Payment đã áp dụng và backend ở `http://localhost:3000`.

---

## 6. Danh Sách API Quản Trị (Admin Endpoints)

Tất cả endpoint dưới đây đều được bảo vệ nghiêm ngặt bằng middleware `authenticate` và `requireAdmin`. Yêu cầu gửi kèm header `Authorization: Bearer demo-jwt-admin-token-sec888`. Khách vãng lai bị trả về `401 Unauthorized`; tài khoản Customer bị trả về `403 Forbidden`.

| Phương thức | Đường dẫn API | Mô tả chức năng |
|:---|:---|:---|
| `GET` | `/api/admin/stats` | Thống kê số lượng đơn, doanh thu thực tế, đơn cần xử lý và cảnh báo tồn kho |
| `GET` | `/api/admin/orders` | Danh sách đơn hàng phân trang, lọc theo trạng thái (`status`), tìm kiếm (`search`) |
| `GET` | `/api/admin/orders/:orderCode` | Chi tiết đơn hàng, thông tin giao nhận, toa kính và thông số 3D Bespoke kèm ảnh Snapshot |
| `PATCH` | `/api/admin/orders/:orderCode/status` | Cập nhật trạng thái đơn hàng theo máy trạng thái (State Machine). Hoàn kho khi đơn bị hủy |
| `GET` | `/api/admin/products` | Danh mục sản phẩm & tồn kho khả dụng từ bảng `products` trong MySQL |
| `PATCH` | `/api/admin/products/:id` | Cập nhật số lượng tồn kho (`stock`), đơn giá (`price`) và trạng thái kinh doanh (`is_active`) |

### Quy tắc Chuyển Đổi Trạng Thái (Order State Machine):
- `pending` ➜ `confirmed`, `cancelled`
- `confirmed` ➜ `processing`, `cancelled`
- `processing` ➜ `completed`, `cancelled`
- `completed` ➜ Trạng thái kết thúc (không thể chuyển đổi tiếp)
- `cancelled` ➜ Trạng thái kết thúc (không thể phục hồi, tự động hoàn trả số lượng hàng Catalog về kho)

---

## 7. Khởi Động Frontend React

Mở một cửa sổ dòng lệnh thứ hai tại thư mục gốc `lumina-eyewear`:
```bash
cd d:\fe_nck22\lumina-eyewear
npm run dev
```
Truy cập giao diện tại: `http://localhost:5173`

---

## 8. Kiểm Thử Hệ Thống Thực Tế

### A. Kiểm tra Endpoint Health Check
- Truy cập trình duyệt: `http://localhost:3000/api/health`
- Phản hồi JSON:
  ```json
  {
    "status": "healthy",
    "service": "lumina-eyewear-backend",
    "version": "1.0.0",
    "database": {
      "type": "MySQL / MariaDB (XAMPP)",
      "connected": true,
      "name": "lumina_eyewear_db",
      "host": "127.0.0.1",
      "port": "3306"
    },
    "demoMode": true
  }
  ```

### B. Thực Hiện Đặt Hàng Trực Tiếp Trên Giao Diện Web
1. Đăng nhập tài khoản Customer: Chọn **Đăng nhập** trên Navbar -> Chọn **Khách hàng: Nguyễn Minh Anh**.
2. Vào **Bộ sưu tập (Catalog)**: Thêm 1 gọng kính catalog vào giỏ hàng.
3. Vào **3D Atelier (Bespoke)**: Tùy biến màu vàng 18K, đính đá Rhinestones, charm -> bấm **Lưu & Thêm vào giỏ**.
4. Vào **Giỏ hàng (/cart)**: Kiểm tra danh sách hiển thị đầy đủ kính thường và kính 3D -> bấm **Tiến hành thanh toán**.
5. Tại trang **Thanh toán (/checkout)**:
   - Điền/kiểm tra thông tin người nhận (địa chỉ, số điện thoại).
   - Nhập mã ưu đãi `LUMINA10` (giảm 10%) hoặc `BESPOKE200`.
   - Chọn phương thức thanh toán **COD**.
   - Bấm **Xác nhận & Đặt hàng**.
6. **Kết quả**:
   - Backend tiếp nhận request, mở MySQL Transaction, kiểm tra tồn kho, tính lại giá có thẩm quyền, giải mã base64 snapshot và lưu thành file PNG vật lý trong `server/uploads/snapshots/`.
   - Ghi bản ghi vào các bảng `orders`, `order_items`, `custom_specs`.
   - Trả về mã đơn hàng `LUM-YYMMDD-XXXX`.
   - Frontend hiển thị màn hình xác nhận đơn hàng thành công sang trọng và tự động làm sạch giỏ hàng.

### C. Kiểm Tra Dữ Liệu Trong phpMyAdmin
1. Mở `http://localhost/phpmyadmin`, chọn database `lumina_eyewear_db`.
2. Bảng `orders`: Có bản ghi đơn hàng mới tạo với `order_code`, `total_amount`, `status = 'pending'`, `customer_name`, `customer_phone`.
3. Bảng `order_items`: Lưu chi tiết các sản phẩm với giá và số lượng được Backend xác nhận.
4. Bảng `custom_specs`: Lưu chi tiết thông số `base_model`, `frame_color`, `charms`, `engraving_text` và đường dẫn file ảnh `snapshot_path` (`/uploads/snapshots/...`).

---

## 8. Ranh Giới Bảo Mật & Giới Hạn Của Chế Độ Demo

> [!NOTE]
> - **Chế độ Demo (`DEMO_MODE=true`)**: Backend chỉ chấp nhận các token demo có trong danh sách định danh sẵn nhằm phục vụ đồ án cục bộ.
> - **Cổng thanh toán thật**: Hệ thống chỉ mô phỏng phương thức COD và Chuyển khoản ngân hàng (QR Code). Không tích hợp trực tiếp thẻ tín dụng quốc tế hoặc tài khoản ngân hàng thực tế.
> - **Tài khoản MySQL**: Mặc định kết nối cục bộ `127.0.0.1:3306` của XAMPP, không mở ra Internet bên ngoài.

---

## 9. Payment Management (Demo / Manual Reconciliation)

Payment status được lưu riêng ở `orders.payment_status`: `unpaid`, `pending`, `paid`, `failed`, `refunded`. State Machine đơn hàng vẫn là `pending`, `confirmed`, `processing`, `completed`, `cancelled`. Checkout khởi tạo đơn ở `confirmed`; COD bắt đầu `unpaid`, còn chuyển khoản thành `pending` sau khi khách khởi tạo hướng dẫn thanh toán.

### Cập nhật schema hiện có

Không chạy lại schema hoặc seed để cập nhật cơ sở dữ liệu đang có. Chạy migration cộng thêm một lần (có thể chạy lại an toàn) từ thư mục `server/`:

```powershell
Get-Content .\sql\migrations\20261026_payment_management.sql -Raw | & "C:\xampp\mysql\bin\mysql.exe" -u root
```

Migration thêm `orders.payment_status` nếu thiếu và tạo `payments` nếu chưa tồn tại. Tiền dùng `DECIMAL`; các truy vấn dùng prepared statements. Bảng lưu từng payment attempt, idempotency key duy nhất, payment code, trạng thái và dữ liệu đối soát. Không có đơn hàng hay dữ liệu seed nào bị xóa.

### API

| Method | Endpoint | Quyền / mục đích |
|:---|:---|:---|
| `POST` | `/api/payments/initiate` | Customer sở hữu đơn `banking`; body gồm `orderCode`, `idempotencyKey`. Backend lấy số tiền từ đơn hàng. |
| `GET` | `/api/payments/:paymentCode/status` | Chủ đơn hoặc Admin xem trạng thái do backend lưu. |
| `POST` | `/api/payments/webhook/:provider` | Đường nhận callback; provider mock luôn từ chối vì không thể xác minh chuyển khoản. |
| `POST` | `/api/admin/orders/:orderCode/payment-reconciliation` | Admin ghi nhận `outcome: paid|failed`, `note`; `paid` bắt buộc có `reference`. |

Admin có thể xác nhận COD hoặc chuyển khoản thủ công sau khi đối chiếu tiền thực nhận. Backend lưu người xác nhận, mã tham chiếu, ghi chú và số tiền lấy từ đơn; không cho sửa số tiền. Đơn đã `paid` không thể xác nhận lần nữa. Hủy đơn đã thanh toán bị chặn cho đến khi có quy trình hoàn tiền.

### Cấu hình và giới hạn

Trong `server/.env`, dùng `PAYMENT_PROVIDER=mock` cùng `DEMO_MODE=true`. Provider mock chỉ tạo hướng dẫn pending, không có URL thanh toán, không xác minh webhook và không thể tự chuyển đơn sang paid. Provider này bị từ chối khi `DEMO_MODE=false` hoặc `NODE_ENV=production`. QR đang hiển thị là ảnh tĩnh có sẵn trong giao diện; ảnh không chứa số tiền/mã đơn được backend xác minh. Cần Admin đối soát bằng chứng nhận tiền.

Chưa có VNPay, MoMo hay provider thật trong repository và chưa có credentials/tài liệu sandbox để cấu hình. Muốn bật sandbox cần chọn provider, cung cấp tài khoản sandbox và secrets backend, URL callback theo tài liệu chính thức, rồi kiểm thử chữ ký/webhook. Không đặt secret vào biến `VITE_*`. Hoàn tiền chưa được triển khai; `refunded` chỉ là trạng thái schema dành cho nghiệp vụ sau.

Chạy test backend sau khi migration đã áp dụng, MySQL và backend server đang chạy: `cd server; npm test`. Build giao diện tại thư mục gốc: `npm run build`.
