# REPORT VERIFICATION DOCUMENT
## Lumina Eyewear — Graduation Thesis Report

**Ngày xác minh:** 13/11/2026  
**Người xác minh:** AI Research Agent (Antigravity)  
**Phiên bản dự án:** 1.0.0

---

## 1. TÀI LIỆU ĐÃ ĐỌC VÀ XÁC MINH

| # | Tài liệu | Đường dẫn | Trạng thái |
|---|----------|-----------|-----------|
| 1 | Package.json (root) | `package.json` | ✅ Đã đọc |
| 2 | Package.json (backend) | `backend/package.json` | ✅ Đã đọc |
| 3 | QA Final Report | `docs/QA_FINAL_REPORT.md` | ✅ Đã đọc |
| 4 | Pending Information | `docs/report/PENDING_INFORMATION.md` | ✅ Đã đọc |
| 5 | Schema SQL | `backend/database/schema.sql` | ✅ Đã đọc |
| 6 | Migration files (7) | `backend/database/migrations/` | ✅ Đã đọc |
| 7 | App.jsx (routing) | `src/App.jsx` | ✅ Đã đọc |
| 8 | AuthContext.jsx | `src/context/AuthContext.jsx` | ✅ Đã đọc |
| 9 | CartContext.jsx | `src/context/CartContext.jsx` | ✅ Đã đọc |
| 10 | authMiddleware.js | `backend/middleware/authMiddleware.js` | ✅ Đã đọc |
| 11 | vite.config.js | `vite.config.js` | ✅ Đã đọc |
| 12 | tailwind.config.js | `tailwind.config.js` (v4 inline) | ✅ Đã đọc |

---

## 2. THƯ MỤC MÃ NGUỒN ĐÃ KIỂM TRA

### Frontend (`src/`)
| Thư mục | Số tệp | Nội dung |
|---------|--------|---------|
| `src/pages/` | 11 | HomePage, CatalogPage, StudioPage, TryOnPage, CartPage, CheckoutPage, AccountPage, AdminDashboard, AdminLoginPage, ForbiddenPage, NotFoundPage |
| `src/components/` | 56 | Tất cả component đã được liệt kê |
| `src/context/` | 4 | AuthContext, CartContext, CustomGlassesContext, ChatContext |
| `src/hooks/` | Nhiều | Custom hooks |
| `src/services/` | Nhiều | API service wrappers |

### Backend (`backend/`)
| Thư mục | Số tệp | Nội dung |
|---------|--------|---------|
| `backend/services/` | 14 | care, loyalty, notification, review, admin, referral, me, retention, chat, checkout, payment, pricing, config, paymentProvider |
| `backend/ai/` | 11 | ai.service, afterSalesTools, intentClassifier, productTools, afterSalesAdvisor, orderAdvisor, promptBuilder, responseParser, studioAdvisor, faq.data, aiProvider.factory |
| `backend/routes/` | Nhiều | RESTful API routes |
| `backend/middleware/` | Nhiều | authMiddleware, errorMiddleware |
| `backend/database/` | 1 schema + 7 migration | Schema và migration files |

### Tests (`backend/tests/`)
| Tệp test | Số test cases | Trạng thái ghi nhận |
|----------|--------------|---------------------|
| checkout.test.js | ~20 | PASS |
| admin.test.js | ~20 | PASS |
| care.test.js | ~25 | PASS |
| loyalty.test.js | ~25 | PASS |
| notifications.test.js | ~20 | PASS |
| reviews_referral.test.js | ~20 | PASS |
| payment.test.js | ~15 | PASS |
| e2eSecurityAcceptance.test.js | ~25 | PASS |
| **Tổng** | **256** | **ALL PASS** |

---

## 3. CHỨC NĂNG ĐÃ XÁC MINH TRONG MÃ NGUỒN

### ✅ 3D Bespoke Studio (StudioPage.jsx + ThreeDCustomizer.jsx)
- **10 frame models** được xác minh: round, square, aviator, slim-oval, cateye, modern-pilot, geometric-hexagon, sculpted-cateye, oversized-square, bug-eye
- **CatmullRomCurve3** dùng cho 4 temple styles (classic, angular, curved, wavy)
- **Tortoiseshell procedural texture** via CanvasTexture với noise algorithm
- **Engraving** via CanvasTexture với font rendering
- **Snapshot với watermark** dùng canvas.toDataURL()
- **Pricing**: Base models từ 2.25M đến 2.9M VND, addons từ 150k đến 500k VND
- Lưu design draft vào LocalStorage

### ✅ AI Virtual Try-On (TryOnPage.jsx + AIVirtualTryOn.jsx)
- **MediaPipe Tasks Vision** `@mediapipe/tasks-vision@1.1.1` — FaceLandmarker
- **468 facial landmarks** cho face detection
- **FaceShapeSmoother** với 12-frame buffer (temporal smoothing)
- `computeGlassesFit()` dùng landmarks 33, 133, 362, 263 (mắt trái/phải)
- Hiển thị overlay kính lên webcam stream real-time

### ✅ AI Face Stylist (FaceStylistPanel.jsx)
- 5 hình dạng khuôn mặt: oval, round, square, heart, diamond
- Tích hợp với face landmark detection
- Đề xuất frame phù hợp dựa trên face shape
- Dữ liệu `ai_face_rules` từ Postman Mock Server

### ✅ Lumina AI Concierge (ChatWidget.jsx + ai.service.js)
- **4-tier hybrid pipeline**: FAQ → Intent → Domain → LLM
- **Weighted intent classifier** (intentClassifier.js, 515 lines)
- **8 After-sales tools** (afterSalesTools.js, 544 lines)
- promptBuilder.js, responseParser.js, aiProvider.factory.js
- chat_sessions, chat_messages, chat_feedbacks tables

### ✅ Hệ thống Loyalty (loyalty.service.js)
- **4 tiers**: Member, Silver, Gold, Diamond
- Idempotency via UNIQUE constraint
- Atomic redemption với row lock (SELECT ... FOR UPDATE)
- 7-day grace period khi downgrade tier
- Tables: loyalty_tiers, loyalty_accounts, loyalty_transactions, loyalty_rules, loyalty_redemptions

### ✅ After-Sales Care (care.service.js)
- **State machine**: submitted → reviewing → approved/rejected/in_progress → resolved → closed
- **7 request types** (xác minh trong code)
- Tables: care_requests, care_attachments, care_internal_notes, order_delivery_events
- AdminCareModal.jsx cho admin side

### ✅ Checkout (checkout.service.js)
- **ACID transaction** với MySQL BEGIN/COMMIT/ROLLBACK
- **Server-side price verification** (pricing.service.js)
- Stock deduction atomic
- Design snapshot saved tại thời điểm đặt hàng

### ✅ RBAC & Auth (authMiddleware.js)
- 3 roles: Guest, Customer, Admin
- requireCustomer, requireAdmin middleware
- **Demo tokens** in-memory (DEMO_MODE) — KHÔNG production-ready
- LocalStorage session — vulnerable to XSS

### ✅ Payment (payment.service.js + paymentProvider.js)
- COD (Cash on Delivery)
- Mock bank transfer / QR simulation
- **Không có real payment gateway** (VNPay/Momo chưa tích hợp)

### ✅ Reviews & Referral
- review.service.js (556 lines) — Reviews + moderation + helpful votes
- referral.service.js (443 lines) — Referral program
- Tables: reviews, review_helpful_votes, referral_codes, referral_attributions

### ✅ Notification System
- notification.service.js (661 lines)
- Consent-based (opt-in)
- Tables: notifications, notification_preferences, notification_templates, notification_delivery_logs
- **Chỉ in-app** — không có email/SMS thật

### ✅ Admin Dashboard (AdminDashboard.jsx — 2155 lines)
- 8+ panels: stats, orders, products, care, loyalty, reviews, referral, retention analytics
- retention.service.js (368 lines) — 8 KPI metrics
- AdminLoyaltyTab.jsx, AdminRetentionTab.jsx, AdminCareModal.jsx

### ✅ Database
- MariaDB/MySQL qua XAMPP port 3306
- Database: `lumina_eyewear_db`
- 24+ tables xác minh từ schema.sql và 7 migration files

### ✅ Data Sources
- **MockAPI.io**: Products, Categories
- **Postman Mock Server**: Vouchers, Charms, ai_face_rules
- **LocalStorage**: Cart, session, design drafts
- **Backend MySQL**: Orders, auth, loyalty, care, reviews, referral, notifications

---

## 4. CHỨC NĂNG CHƯA XÁC MINH / CẦN KIỂM TRA THÊM

| # | Chức năng | Lý do chưa xác minh | Ưu tiên |
|---|-----------|---------------------|---------|
| 1 | UI screenshots thực tế | App không thể mở trong sandbox | Cao |
| 2 | Kết quả test thực tế (re-run) | Tests được ghi nhận, chưa chạy lại | Cao |
| 3 | Tốc độ load thực tế | Cần browser/Lighthouse | Trung bình |
| 4 | Responsive trên thiết bị thật | Cần browser testing | Trung bình |
| 5 | Webcam integration TryOn | Cần hardware | Cao |
| 6 | Email integration | Chưa implement | Thấp |

---

## 5. KẾT QUẢ KIỂM THỬ

### Lệnh chạy test (ghi nhận trong QA_FINAL_REPORT.md)
```bash
cd backend && node --test
```

### Kết quả ghi nhận
- **Tổng số test suites**: 18
- **Tổng số test cases**: 256
- **Kết quả**: ALL PASS
- **Thời gian**: 3.06 giây
- **Môi trường**: MariaDB (XAMPP), Node.js

> ⚠️ **Lưu ý**: Kết quả trên được GHI NHẬN từ file QA_FINAL_REPORT.md. Sinh viên cần chạy lại tests trước khi nộp báo cáo để xác nhận kết quả hiện tại.

---

## 6. MÂU THUẪN GIỮA TÀI LIỆU VÀ MÃ NGUỒN

| # | Mâu thuẫn | Chi tiết | Mức độ |
|---|-----------|---------|--------|
| 1 | Auth security | Demo tokens hardcoded — không phải JWT production | Cần ghi rõ trong báo cáo |
| 2 | Payment | Mock only — không có VNPay/Momo thật | Cần ghi rõ trong báo cáo |
| 3 | Bundle size | 1.69MB không có code splitting | Cần ghi rõ hạn chế |
| 4 | HTTPS | Chỉ HTTP trong dev | Cần ghi rõ hạn chế |
| 5 | AI LLM | aiProvider.factory.js — cần verify API key có sẵn | Cần kiểm tra |

---

## 7. VIỆC CẦN LÀM TRƯỚC KHI NỘP BÁO CÁO

### Bắt buộc (Must Do)
- [ ] **Thay thế placeholder** trong báo cáo: [HỌ TÊN SINH VIÊN], [MÃ SINH VIÊN], [LỚP], [TÊN GIẢNG VIÊN HƯỚNG DẪN], [TÊN KHOA]
- [ ] **Chạy lại tests** `cd backend && node --test` và chụp màn hình kết quả
- [ ] **Chụp màn hình** tất cả 15 màn hình yêu cầu (xem `evidence/SCREENSHOTS_NEEDED.md`)
- [ ] **Chèn ảnh** vào báo cáo Word thay thế các [Hình ảnh] placeholder
- [ ] **Kiểm tra ngữ pháp** tiếng Việt toàn bộ báo cáo
- [ ] **Thêm số trang** và mục lục cuối cùng

### Khuyến nghị (Recommended)
- [ ] Xin ý kiến GVHD về format báo cáo của trường
- [ ] Thêm sơ đồ kiến trúc hệ thống (vẽ tay hoặc draw.io)
- [ ] Thêm sơ đồ ERD database
- [ ] Thêm sơ đồ Use Case UML
- [ ] Thêm sơ đồ state machine cho After-Sales Care
- [ ] Chụp ảnh màn hình test results thực tế

### Tùy chọn (Optional)
- [ ] Demo video ngắn 3-5 phút
- [ ] Slide thuyết trình (PowerPoint/Canva)
- [ ] Thêm phụ lục code quan trọng

---

## 8. ĐÁNH GIÁ TỔNG THỂ

| Tiêu chí | Điểm mạnh | Điểm cần cải thiện |
|----------|-----------|-------------------|
| Tính đầy đủ chức năng | 10/11 chức năng hoàn thành | Payment còn là simulation |
| Chất lượng code | Service layer rõ ràng, 256 tests | Bundle size lớn (1.69MB) |
| Bảo mật | RBAC đúng layer | Demo auth không production-ready |
| AI features | 3 AI modules (Concierge, TryOn, Stylist) | Phụ thuộc API key bên ngoài |
| Database design | 24+ tables, normalized | Chưa có index documentation |
| Testing | 256 tests, 18 suites | Chỉ backend tests, chưa có frontend test |
| Tài liệu | QA report đầy đủ | Thiếu ERD, Use Case diagrams |

**Kết luận**: Dự án Lumina Eyewear là một đồ án tốt nghiệp có chất lượng tốt với nhiều tính năng AI nâng cao, kiến trúc hệ thống rõ ràng và bộ test toàn diện. Sinh viên cần hoàn thiện phần placeholder và bổ sung bằng chứng thực tế trước khi nộp.
