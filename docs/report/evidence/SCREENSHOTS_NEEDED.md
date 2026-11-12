# SCREENSHOTS NEEDED — Evidence Files for Thesis Report
## Lumina Eyewear — Báo Cáo Đồ Án Tốt Nghiệp

Sinh viên cần chụp màn hình (screenshot) các màn hình sau đây để đưa vào báo cáo.  
Lưu tất cả file vào thư mục này: `docs/report/evidence/`

---

## Hướng dẫn chụp màn hình

1. Khởi động XAMPP và bật Apache + MySQL
2. Chạy backend: `cd backend && node server.js`
3. Chạy frontend: `npm run dev`
4. Mở trình duyệt tại `http://localhost:5173`
5. Chụp màn hình với **độ phân giải ít nhất 1280×720**
6. Lưu định dạng PNG với tên file như hướng dẫn bên dưới

---

## Danh sách 15 Màn Hình Cần Chụp

### 1. Trang Chủ (HomePage)
**Tên file:** `01_homepage.png`  
**URL:** `http://localhost:5173/`  
**Mô tả:** Hero slider đang hiển thị, features section có thể thấy  
**Nội dung cần thấy:** Hero banner với logo Lumina, navigation bar, nút CTA

---

### 2. Trang Danh Mục Sản Phẩm (CatalogPage)
**Tên file:** `02_catalog.png`  
**URL:** `http://localhost:5173/catalog`  
**Mô tả:** Grid sản phẩm với bộ lọc và thanh tìm kiếm  
**Nội dung cần thấy:** Danh sách sản phẩm, filter sidebar, search bar

---

### 3. 3D Bespoke Studio
**Tên file:** `03_studio_3d.png`  
**URL:** `http://localhost:5173/studio-3d`  
**Mô tả:** 3D customizer với frame đang hiển thị  
**Nội dung cần thấy:** 3D glasses model, customization panels (color, temple, engraving)

---

### 4. AI Virtual Try-On
**Tên file:** `04_tryon_ai.png`  
**URL:** `http://localhost:5173/try-on`  
**Mô tả:** Màn hình try-on với camera đang chạy và overlay kính  
**Nội dung cần thấy:** Camera feed, glasses overlay, landmark detection

---

### 5. Giỏ Hàng (CartPage)
**Tên file:** `05_cart.png`  
**URL:** `http://localhost:5173/cart`  
**Mô tả:** Giỏ hàng có ít nhất 1 sản phẩm  
**Nội dung cần thấy:** Product list, quantity controls, total price, checkout button

---

### 6. Trang Thanh Toán (CheckoutPage)
**Tên file:** `06_checkout.png`  
**URL:** `http://localhost:5173/checkout`  
**Mô tả:** Form thanh toán đầy đủ  
**Nội dung cần thấy:** Thông tin giao hàng, phương thức thanh toán (COD/QR), tổng tiền

---

### 7. Trang Tài Khoản Khách Hàng (AccountPage)
**Tên file:** `07_account.png`  
**URL:** `http://localhost:5173/account` (cần đăng nhập)  
**Mô tả:** Customer portal với tabs  
**Nội dung cần thấy:** Profile, orders history, loyalty points, referral section

---

### 8. Admin Dashboard — Tổng Quan
**Tên file:** `08_admin_dashboard.png`  
**URL:** `http://localhost:5173/admin`  
**Mô tả:** Admin dashboard main view với stats  
**Nội dung cần thấy:** KPI cards (doanh thu, đơn hàng, khách hàng), charts

---

### 9. Admin Dashboard — Quản Lý Đơn Hàng
**Tên file:** `09_admin_orders.png`  
**URL:** `http://localhost:5173/admin` → Orders tab  
**Mô tả:** Danh sách đơn hàng trong admin  
**Nội dung cần thấy:** Order table, status badges, action buttons

---

### 10. Admin Dashboard — After-Sales Care
**Tên file:** `10_admin_care.png`  
**URL:** `http://localhost:5173/admin` → Care tab  
**Mô tả:** Care request management  
**Nội dung cần thấy:** Care requests list, state machine status (submitted/reviewing/resolved)

---

### 11. Admin Dashboard — Loyalty Program
**Tên file:** `11_admin_loyalty.png`  
**URL:** `http://localhost:5173/admin` → Loyalty tab  
**Mô tả:** Loyalty program management  
**Nội dung cần thấy:** Tier configuration (Member/Silver/Gold/Diamond), loyalty accounts

---

### 12. AI Concierge Chat Widget
**Tên file:** `12_ai_chat.png`  
**URL:** Bất kỳ trang nào (chat widget ở góc dưới phải)  
**Mô tả:** Chat widget đang mở với cuộc hội thoại  
**Nội dung cần thấy:** Chat bubbles, AI response, input field

---

### 13. Admin Dashboard — Retention Analytics
**Tên file:** `13_admin_retention.png`  
**URL:** `http://localhost:5173/admin` → Retention tab  
**Mô tả:** 8 KPI metrics analytics  
**Nội dung cần thấy:** KPI cards, charts (revenue trend, repeat rate, churn)

---

### 14. Test Results (Terminal)
**Tên file:** `14_test_results.png`  
**URL:** Terminal/PowerShell  
**Mô tả:** Kết quả chạy `node --test` trong thư mục backend  
**Lệnh:** `cd d:\fe_nck22\lumina-eyewear\backend && node --test`  
**Nội dung cần thấy:** Test suite names, PASS/FAIL status, số test đã pass, thời gian chạy

---

### 15. Database Schema (phpMyAdmin)
**Tên file:** `15_database_schema.png`  
**URL:** `http://localhost/phpmyadmin` → lumina_eyewear_db  
**Mô tả:** Danh sách bảng trong database  
**Nội dung cần thấy:** Tất cả 24+ tables của lumina_eyewear_db

---

## Màn hình Bổ sung (Khuyến nghị)

| # | Tên file | Mô tả |
|---|----------|-------|
| 16 | `16_face_stylist.png` | AI Face Stylist panel với face shape detection |
| 17 | `17_notification_bell.png` | Notification bell với danh sách thông báo |
| 18 | `18_review_form.png` | Form đánh giá sản phẩm |
| 19 | `19_referral_card.png` | Referral card với unique code |
| 20 | `20_admin_reviews.png` | Admin reviews moderation panel |

---

## Lưu ý quan trọng

> ⚠️ **Dữ liệu demo**: Trước khi chụp màn hình, đảm bảo database có dữ liệu mẫu.  
> Chạy script seed nếu có, hoặc tạo test data thủ công qua API.

> ⚠️ **Màn hình Try-On**: Cần laptop/máy tính có webcam hoạt động.

> ⚠️ **Màn hình Admin**: Cần đăng nhập với tài khoản admin (xem .env file hoặc DEMO_MODE credentials).

> ⚠️ **Resolution**: Chụp ở full screen 1920×1080 hoặc ít nhất 1280×720 để rõ nét.

---

*File này được tạo bởi AI Research Agent ngày 13/11/2026*
