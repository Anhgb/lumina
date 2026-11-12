# TÀI LIỆU ĐẶC TẢ YÊU CẦU SẢN PHẨM (PRD)
## Dự án: LUMINA EYEWEAR — Nền tảng Thương mại Điện tử Kính Thời trang Tích hợp AI Stylist & Xưởng Chế tác 3D
* **Phiên bản:** 4.0 (Tích hợp Brand Identity & Multi-Source Architecture)
* **Môn học:** Phát triển Web Frontend Nâng cao
* **Kiến trúc Frontend:** React (Vite), Three.js (WebGL), Google MediaPipe Face Mesh (Wasm), Tailwind CSS

---

## 1. HỆ THỐNG NHẬN DIỆN THƯƠNG HIỆU & QUY CHUẨN UI/UX (BRAND IDENTITY & DESIGN SYSTEM)

Toàn bộ giao diện người dùng (UI) và trải nghiệm thị giác của nền tảng được xây dựng đồng bộ tuyệt đối với thiết kế logo chính thức của **LUMINA EYEWEAR** (`public/assets/logo-lumina.jpg`).

### 1.1. Phân tích Cấu trúc Logo Chính thức
* **Biểu tượng Monogram (Icon Mark):** Sự kết hợp tinh tế giữa chữ cái in hoa **"L"** có chân (Serif) cổ điển, vững chãi và nét vẽ liền mạch (Single-line art) uốn lượn của một bên **gọng kính thời trang dáng mắt mèo (Cat-Eye / Browline)** cắt ngang qua thân chữ L.
* **Điểm nhấn Ngôi sao 4 cánh (Four-Pointed Star Sparkle `✦`):** Nằm ở góc trên bên phải của đuôi gọng kính[cite: 1]. Đây là biểu tượng cốt lõi đại diện cho 3 giá trị của dự án:
  1. **Ánh sáng (*Lumina*):** Sự tỏa sáng và định hình phong cách cá nhân.
  2. **Trí tuệ nhân tạo (AI Stylist):** Biểu tượng chuẩn quốc tế cho tính năng gợi ý thông minh bằng AI.
  3. **Chế tác Thủ công (Bespoke Charm & Rhinestones):** Ánh lấp lánh của đá pha lê và phụ kiện Charm gắn trên gọng kính.
* **Chữ thương hiệu chính (Primary Wordmark):** Dòng chữ **`LUMINA`** in hoa với độ tương phản nét thanh - nét đậm cao; đặc biệt chữ **`A`** cuối cùng được cách điệu lược bỏ nét gạch ngang (`Λ`), tạo cảm giác hiện đại, tối giản và mang đậm hơi thở thời trang cao cấp (High-Fashion Editorial)[cite: 1].
* **Dòng mô tả phụ (Sub-branding Descriptor):** Chữ **`E Y E W E A R`** sử dụng kiểu chữ không chân (Sans-serif) nét mảnh, khoảng cách giữa các ký tự mở rộng (wide letter-spacing), được đặt cân xứng giữa hai đường kẻ ngang mảnh hai bên (`─── EYEWEAR ───`)[cite: 1].

### 1.2. Bảng Màu Chuẩn (Color Palette & CSS Variables)
Hệ thống màu sắc của Website được trích xuất trực tiếp từ bản gốc của Logo[cite: 1] và mở rộng cho các trạng thái giao diện:

| Tên Token | Mã Hex | Nguồn gốc & Ứng dụng trên Giao diện Web |
| :--- | :--- | :--- |
| `--bg-ivory-primary` | `#FAF8F5` | Màu nền kem ấm (Warm Alabaster/Ivory) trích xuất trực tiếp từ màu nền của ảnh Logo[cite: 1]; dùng làm màu nền chủ đạo cho Trang chủ, Danh mục sản phẩm và Giỏ hàng để tạo cảm giác sang trọng, dịu mắt. |
| `--text-obsidian` | `#141413` | Màu đen mực (Obsidian Black) trích xuất từ nét chữ và biểu tượng trên Logo[cite: 1]; dùng cho toàn bộ tiêu đề, văn bản chính, viền nút bấm và icon. |
| `--bg-studio-dark` | `#0D0D0D` | Màu nền tối chuyên biệt cho khu vực **3D Custom Studio** và **AI Virtual Try-On**, giúp làm nổi bật ánh sáng kim loại của gọng kính và hiệu ứng đá lấp lánh. |
| `--accent-champagne` | `#D4AF37` | Màu Vàng Champagne kim loại; dùng cho hiệu ứng ngôi sao `✦` AI, huy hiệu "AI Gợi ý", và màu mặc định của Charm/Gọng kính cao cấp. |
| `--border-hairline` | `#D6D3CD` | Màu xám kem mảnh lấy cảm hứng từ hai đường kẻ ngang cạnh chữ `EYEWEAR`[cite: 1]; dùng làm đường phân cách (Divider) giữa các section và viền thẻ sản phẩm. |
| `--status-error` | `#DC2626` | Màu đỏ cảnh báo khi người dùng vi phạm quy tắc logic (nhập sai độ cận, vượt số lượng Charm, chưa đăng nhập). |
| `--status-warning` | `#D97706` | Màu cam hổ phách dùng cho các cảnh báo khuyến nghị y khoa hoặc an toàn thị giác. |

### 1.3. Hệ thống Phông chữ (Typography)
Để đồng bộ hoàn hảo với các đường nét trong Logo[cite: 1]:
* **Phông chữ Tiêu đề (Heading / Display):** Sử dụng **`Cormorant Garamond`** hoặc **`Playfair Display`** (Serif) để đồng điệu với chữ **"L"** có chân cổ điển trên biểu tượng chính[cite: 1].
* **Phông chữ Thương hiệu (Brand Header):** Sử dụng **`Cinzel`** hoặc **`Bodoni Moda`** cho các tiêu đề bộ sưu tập lớn, tái hiện độ tương phản thanh - đậm của chữ **`LUMINA`**[cite: 1].
* **Phông chữ Nội dung & Nhãn phụ (Body & Sub-label):** Sử dụng **`Plus Jakarta Sans`** hoặc **`Inter`** (Sans-serif). Các nhãn phụ (Sub-headings) áp dụng thuộc tính CSS `uppercase tracking-[0.35em]` kèm hai đường line hai bên giống hệt cụm `─── EYEWEAR ───` trên logo[cite: 1].

### 1.4. Quy chuẩn Ứng dụng Logo vào Tính năng Kỹ thuật
1. **Thanh điều hướng (Navbar):** Hiển thị đầy đủ cụm Logo ở góc trái hoặc chính giữa Header; khi cuộn trang xuống (Scroll down), Header thu gọn chỉ giữ lại biểu tượng Monogram chữ **L lồng gọng kính và ngôi sao 4 cánh**[cite: 1] để tiết kiệm diện tích.
2. **Hiệu ứng Loading AI & Khởi tạo 3D:** Biểu tượng **Ngôi sao 4 cánh (`✦`)** trên đuôi kính của logo[cite: 1] được tách thành SVG riêng và áp dụng hiệu ứng xoay/nhấp nháy (`animate-pulse`) khi MediaPipe đang quét khuôn mặt hoặc khi đang tải dữ liệu từ MockAPI.io.
3. **Đồng bộ Charm 3D mặc định:** Mẫu Charm **"Ngôi sao Lumina"** trong phòng 3D Studio được thiết kế theo đúng hình dáng ngôi sao 4 cánh (`✦`) ở góc phải logo[cite: 1].
4. **Đóng dấu Bản quyền (Watermark trên Snapshot 3D):** Khi người dùng nhấn xuất ảnh thiết kế 3D vào giỏ hàng (`canvas.toDataURL()`), hệ thống tự động vẽ chìm (stamp) logo `LUMINA EYEWEAR`[cite: 1] ở góc dưới bên phải bức ảnh trước khi lưu vào `localStorage`.

---

## 2. KIẾN TRÚC PHÂN QUYỀN & QUẢN LÝ TÁC NHÂN (RBAC)

Hệ thống phân chia thành 3 nhóm quyền (Roles) rõ rệt, đi kèm thanh **Quick Role Switcher** trên góc giao diện để phục vụ demo thuyết trình đồ án nhanh chóng:

| Tính năng / Thao tác | Guest (Khách vãng lai) | Customer (Đã đăng nhập) | Admin (Quản trị viên) |
| :--- | :---: | :---: | :---: |
| Xem Trang chủ, Hero Slider, Danh mục kính | ✅ | ✅ | ✅ |
| Lọc, Sắp xếp, Tìm kiếm sản phẩm (Client JS) | ✅ | ✅ | ✅ |
| Sử dụng AI Quét dáng mặt & Thử kính ảo | ✅ (Chỉ xem trực tiếp) | ✅ (Lưu được hồ sơ dáng mặt) | ✅ |
| Tùy chỉnh kính trong 3D Studio | ✅ (Chỉ xoay & thử màu) | ✅ (Lưu thiết kế & Xuất ảnh) | ✅ |
| **Thêm vào giỏ hàng / Lưu mẫu 3D / Nhập độ cận** | ❌ *(Bật cảnh báo bắt đăng nhập)* | ✅ | ✅ |
| **Áp dụng Voucher & Thanh toán đơn hàng** | ❌ *(Chặn Route `/checkout`)* | ✅ | ✅ |
| Quản lý Tồn kho Gọng/Charm & Duyệt đơn Custom 3D | ❌ | ❌ | ✅ |

---

## 3. KIẾN TRÚC DỮ LIỆU ĐA NGUỒN (MULTI-SOURCE DATA ARCHITECTURE)

Dự án kết hợp 5 tầng công nghệ lưu trữ và xử lý dữ liệu để đảm bảo cả tốc độ phản hồi ở Frontend lẫn tính toàn vẹn của giao dịch thương mại điện tử:

| Loại dữ liệu | Công nghệ sử dụng | Công dụng & Cơ chế hoạt động chi tiết |
| :--- | :--- | :--- |
| **1. Sản phẩm, danh mục** | **MockAPI.io** | Lưu trữ và lấy danh sách kính, thông số kích thước gọng, giá bán, tồn kho, danh sách dáng mặt phù hợp (`recommendedFaces`) thông qua RESTful API (`GET /products`, `GET /categories`). |
| **2. API trả về dữ liệu mẫu cố định** | **Postman Mock Server** | Mô phỏng phản hồi API cho các cấu hình hệ thống ít biến động: Danh sách mã giảm giá (`vouchers`), danh mục phụ kiện Charm/Đá 3D (`charms`), bảng quy tắc tư vấn của AI Stylist (`ai_face_rules`). |
| **3. Trạng thái đăng nhập** | **`localStorage`** | Lưu thông tin phiên đăng nhập (`lumina_auth_user` gồm `id`, `name`, `role`, `token`, `savedFaceShape`) giúp duy trì trạng thái đăng nhập và phân quyền ngay cả khi tải lại trang (F5). |
| **4. Giỏ hàng** | **`localStorage`** | Lưu danh sách sản phẩm đang chọn (`lumina_cart_items`), bao gồm cả thông số độ cận (Prescription), cấu hình JSON của kính 3D tự thiết kế và ảnh chụp Snapshot Base64 có gắn logo Lumina[cite: 1]. |
| **5. Lọc, sắp xếp, tìm kiếm** | **JavaScript ở Frontend** | Xử lý trực tiếp trên mảng dữ liệu đang hiển thị tại trình duyệt bằng React `useMemo` (Tìm theo từ khóa, lọc theo danh mục, lọc theo dáng mặt AI vừa quét, sắp xếp theo giá tăng/giảm) với độ trễ 0ms. |
| **6. Đơn hàng, thanh toán thật** | **Backend + Database** | Khi khách hàng hoàn tất Checkout, toàn bộ dữ liệu giỏ hàng, thông số độ cận và bản vẽ 3D được gửi qua `POST /api/orders/checkout` xuống Backend & Database thật để xác thực tồn kho, trừ kho và lưu trữ giao dịch an toàn. |

---

## 4. ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ CHỨC NĂNG

### 4.1. Trang chủ (Home) & Hero Slider Chuyển động Chuyên nghiệp
* **Thiết kế Bố cục:** Sử dụng tông nền kem ngà `#FAF8F5` kết hợp chữ đen `#141413` từ logo `LUMINA EYEWEAR`[cite: 1], mang phong cách tạp chí thời trang cao cấp.
* **Hero Slider Chuyển động:**
  * Chuyển cảnh mượt mà (Auto-play 5000ms có thanh Progress Bar chạy dọc theo đường line mảnh của thương hiệu).
  * **Slide 1 — AI Stylist:** Giới thiệu công nghệ quét khuôn mặt 478 điểm mốc với biểu tượng ngôi sao 4 cánh `✦`[cite: 1] phát sáng; nút CTA dẫn thẳng tới `/try-on`.
  * **Slide 2 — 3D Bespoke Atelier:** Trình diễn mẫu kính chữ L cách điệu[cite: 1] xoay 360 độ với hiệu ứng đính đá và gắn Charm; nút CTA dẫn tới `/studio-3d`.
  * **Slide 3 — Seasonal Lookbook:** Giới thiệu bộ sưu tập giới hạn kèm mã ưu đãi từ Postman Mock Server.

### 4.2. Phòng Phân tích Khuôn mặt & Tư vấn Gọng kính bằng AI (AI Face Shape & Virtual Try-On)
* **Mô hình AI sử dụng:** **Google MediaPipe Face Landmarker (Face Mesh)** chạy trực tiếp trên trình duyệt qua WebAssembly & WebGL kết hợp **Hybrid AI Stylist Engine**.
* **Quy trình 3 bước:**
  1. **Quét & Đo đạc Tỷ lệ (1.5 giây đầu):** Thuật toán đo khoảng cách Euclid giữa các điểm mốc: Chiều dài mặt (Trán `10` – Cằm `152`), Độ rộng gò má (`234` – `454`), Độ rộng xương hàm (`172` – `397`) và Khoảng cách đồng tử PD (`468` – `473`).
  2. **Phân loại & Giải thích:** Xác định chính xác 1 trong 5 dáng mặt (*Tròn - Round, Vuông - Square, Trái xoan - Oval, Trái tim - Heart, Kim cương - Diamond*) và hiển thị lời khuyên từ dữ liệu Postman Mock Server.
  3. **Gắn kính Thực tế ảo & Đồng bộ 3D:** Tự động lọc ra các mẫu kính phù hợp nhất từ MockAPI.io hoặc nạp trực tiếp mẫu kính khách hàng vừa tự thiết kế bên 3D Studio (đúng màu gọng, màu tròng, hàng đá pha lê và Charm ngôi sao `✦`[cite: 1]) lên khuôn mặt người dùng theo thời gian thực.

### 4.3. Xưởng Chế tác Kính 3D Cá nhân hóa (3D Custom Glasses Studio)
* **Công nghệ:** `Three.js` + `OrbitControls` với `preserveDrawingBuffer: true` để hỗ trợ chụp ảnh kết xuất.
* **Khả năng tùy biến:**
  * Chọn kiểu dáng gọng gốc (Aviator, Cat-Eye lấy cảm hứng từ nét kính trên logo[cite: 1], Round, Square).
  * Đổi màu chất liệu gọng (Vàng 18K, Đen Obsidian `#141413`[cite: 1], Bạc Titanium, Đồi mồi) và điều chỉnh độ nhám kim loại (`metalness`, `roughness`).
  * Đổi màu tròng kính và thanh trượt điều chỉnh độ trong suốt (`lensOpacity` từ `0.1` đến `0.95`).
  * Bật/tắt **Đính đá Pha lê (Rhinestones)** dọc viền trên của gọng kính.
  * Gắn phụ kiện **Charm 3D** lên gọng kính (bao gồm Charm **Ngôi sao Lumina 4 cánh `✦`** đặc trưng trên logo[cite: 1], Trái tim Ruby, Hồ điệp Bạc).

### 4.4. Luồng Đồng bộ Kép (Dual-Sync Workflow)
Sau khi hoàn tất thiết kế trong 3D Studio, người dùng có 2 lựa chọn liền mạch:
1. **"Thử mẫu vừa thiết kế lên mặt (Sync to AI Try-On)":** Đẩy toàn bộ object cấu hình vào `CustomGlassesContext` và chuyển sang màn hình Webcam để xem mẫu kính vừa phối màu/gắn charm trông như thế nào trên khuôn mặt thật của mình.
2. **"Xuất thiết kế & Thêm vào Giỏ hàng (Snapshot + JSON to Cart)":**
   * Chụp ảnh 2D từ khung hình 3D hiện tại, tự động chèn watermark logo `LUMINA EYEWEAR`[cite: 1] vào góc ảnh.
   * Đóng gói ảnh chụp Base64 + thông số JSON (`baseModel`, `frameColor`, `lensColor`, `lensOpacity`, `hasRhinestones`, `charms`) lưu vào `localStorage` của Giỏ hàng.

---

## 5. MA TRẬN KIỂM TRA LOGIC & CẢNH BÁO NGHIỆP VỤ (VALIDATION RULES)

Hệ thống bắt buộc kiểm tra các điều kiện logic chặt chẽ và phát cảnh báo (Toast / Modal / Inline Error) khi người dùng nhập sai hoặc thực hiện thao tác không hợp lệ:

### 5.1. Cảnh báo Phân quyền & Bảo vệ Thao tác Mua hàng (`Auth Guard Logic`)
* **Quy tắc:** Người dùng ở trạng thái `Guest` (chưa có dữ liệu hợp lệ trong `localStorage['lumina_auth_user']`) **không được phép** thực hiện các thao tác bên trong luồng mua hàng.
* **Kịch bản bắt lỗi:** Khi `Guest` nhấn vào *"Thêm vào giỏ hàng"*, *"Lưu mẫu thiết kế 3D"*, *"Nhập thông số độ cận"*, hoặc *"Thanh toán"*, hệ thống chặn sự kiện ngay lập tức, hiển thị cảnh báo:
  > ⚠️ *"Cảnh báo phân quyền: Vui lòng đăng nhập tài khoản Lumina Eyewear trước khi lưu cấu hình kính và thực hiện mua hàng!"* — đồng thời tự động bật Modal Đăng nhập.

### 5.2. Cảnh báo Logic Nhập Thông số Độ cận (`Prescription Validation`)
* **Quy tắc 1 — Giới hạn Khoảng cách Đồng tử (PD):** Nếu người dùng nhập `PD < 50mm` hoặc `PD > 75mm` (hoặc bỏ trống khi đã chọn làm tròng cận):
  > ❌ *"Lỗi logic thông số: Khoảng cách đồng tử (PD) hợp lệ của người trưởng thành phải nằm trong khoảng 50mm – 75mm (hoặc bấm nút 'Lấy PD từ AI Camera' để điền tự động)."*
* **Quy tắc 2 — Tương thích Độ cận cao & Chất liệu Gọng:** Nếu độ cận `|SPH| > 6.00 Diop` (tròng kính rất dày ở viền) nhưng người dùng đang chọn gọng kim loại mảnh (`frameType === 'thin-metal'` hoặc gọng khoan không viền):
  > ❌ *"Lỗi tương thích kỹ thuật: Độ cận của bạn vượt quá -6.00 Diop khiến rìa tròng kính dày, không thể lắp an toàn vào gọng kim loại mảnh. Vui lòng đổi sang gọng nhựa Acetate dày hoặc chọn nâng cấp Tròng siêu mỏng chiết suất 1.74!"*
* **Quy tắc 3 — Độ lệch khúc xạ giữa hai mắt (Anisometropia):** Nếu `|SPH_Trái - SPH_Phải| > 4.00 Diop`:
  > ⚠️ *"Cảnh báo y khoa: Độ chênh lệch giữa mắt trái và mắt phải vượt quá 4.00 Diop, dễ gây choáng khi đeo. Hệ thống khuyến nghị bạn kiểm tra lại đơn kính hoặc chọn tròng kính phi cầu (Aspheric)."*
* **Quy tắc 4 — Bắt buộc Trục loạn (Axis) khi có Độ loạn (CYL):** Nếu `CYL != 0` nhưng trường `Axis` để trống hoặc nằm ngoài khoảng `1° – 180°`:
  > ❌ *"Lỗi thiếu dữ liệu: Bạn đã nhập độ loạn thị (CYL), bắt buộc phải nhập Trục loạn (Axis) tương ứng trong khoảng từ 1° đến 180°."*

### 5.3. Cảnh báo Giới hạn Vật lý trong Thiết kế 3D (`3D Studio Constraints`)
* **Quy tắc 1 — Giới hạn Trọng lượng Charm:** Nếu người dùng chọn gắn nhiều hơn 2 phụ kiện Charm lên cùng một gọng kính (`charms.length > 2`):
  > ❌ *"Cảnh báo kết cấu 3D: Mỗi bên càng kính chỉ chịu lực tối đa 01 Charm (tổng cộng tối đa 02 Charm trên một mẫu kính) để đảm bảo cân bằng trọng lượng trên sống mũi."*
* **Quy tắc 2 — Cảnh báo Độ tối Tròng kính:** Nếu người dùng kéo thanh trượt độ đậm màu tròng kính vượt quá 85% (`lensOpacity > 0.85`):
  > ⚠️ *"Lưu ý an toàn thị giác: Độ tối tròng kính đang vượt mức 85%. Mẫu kính này chỉ phù hợp chống nắng gắt ngoài trời, tuyệt đối không sử dụng khi lái xe vào ban đêm hoặc trong hầm tối."*

### 5.4. Cảnh báo Tồn kho & Mã giảm giá (`Stock & Voucher Logic`)
* **Quy tắc Tồn kho:** Khi tăng số lượng trong giỏ hàng vượt quá trường `stock` lấy từ `MockAPI.io`, khóa nút `+` và báo lỗi.
* **Quy tắc Voucher (Đối chiếu với dữ liệu từ Postman Mock Server):** Báo lỗi chi tiết theo từng nguyên nhân: Mã không tồn tại, Mã đã hết hạn (`expiredAt < currentDate`), hoặc Tổng giá trị đơn hàng chưa đạt mức tối thiểu (`cartTotal < voucher.minOrder`).

---

## 6. CẤU TRÚC THƯ MỤC DỰ ÁN CHUẨN (REACT + VITE)

```text
lumina-eyewear/
├── public/
│   ├── assets/
│   │   └── logo-lumina.jpg          # Logo chính thức LUMINA EYEWEAR (Nền kem #FAF8F5, chữ đen #141413)
│   └── models/                      # Tài nguyên 3D / Môi trường ánh sáng HDRI
├── src/
│   ├── api/
│   │   ├── apiClient.js             # Cấu hình 3 Axios instances: MockAPI.io, Postman Mock, Backend thật
│   │   ├── productService.js        # Gọi MockAPI.io lấy sản phẩm & danh mục
│   │   ├── configService.js         # Gọi Postman Mock Server lấy Vouchers, Charm list, AI Rules
│   │   └── orderService.js          # Gọi Backend + Database xử lý lưu đơn hàng & thanh toán thật
│   ├── components/
│   │   ├── common/
│   │   │   ├── BrandLogo.jsx        # Component hiển thị Logo Lumina đầy đủ hoặc rút gọn Monogram chữ L
│   │   │   ├── Navbar.jsx           # Header thời trang + Quick Role Switcher + Badge Giỏ hàng
│   │   │   ├── HeroSlider.jsx       # Slider chuyển động chuyên nghiệp ở Trang chủ
│   │   │   └── ProtectedAction.jsx  # Wrapper chặn thao tác mua hàng nếu chưa đăng nhập
│   │   ├── product/
│   │   │   ├── ProductFilterBar.jsx # Thanh Tìm kiếm, Lọc danh mục, Lọc dáng mặt, Sắp xếp bằng JS
│   │   │   ├── ProductCard.jsx      # Thẻ sản phẩm phong cách Editorial kèm nhãn "✦ AI Gợi ý"
│   │   │   └── PrescriptionModal.jsx# Bảng nhập độ cận có bắt lỗi logic chuyên sâu
│   │   ├── studio3d/
│   │   │   └── ThreeDCustomizer.jsx # Xưởng 3D Three.js + Gắn Charm ngôi sao Lumina + Xuất Snapshot có Watermark
│   │   └── tryon/
│   │       └── AIVirtualTryOn.jsx   # MediaPipe Face Mesh quét dáng mặt + Thử kính Custom trực tiếp
│   ├── context/
│   │   ├── AuthContext.jsx          # Quản lý Đăng nhập & Phân quyền (Đồng bộ localStorage)
│   │   ├── CartContext.jsx          # Quản lý Giỏ hàng & Cấu hình 3D (Đồng bộ localStorage)
│   │   └── CustomGlassesContext.jsx # Cầu nối đồng bộ thời gian thực giữa 3D Studio và AI Try-On
│   ├── hooks/
│   │   ├── useLocalStorage.js       # Custom Hook tự động đọc/ghi localStorage khi F5
│   │   └── useProductFilter.js      # Custom Hook xử lý Lọc, Sắp xếp, Tìm kiếm ở Frontend
│   ├── utils/
│   │   ├── validators.js            # Bộ hàm kiểm tra logic & trả về thông điệp cảnh báo
│   │   └── watermarkHelper.js       # Hàm đóng dấu logo LUMINA EYEWEAR lên ảnh chụp 3D Snapshot
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── StudioPage.jsx
│   │   ├── TryOnPage.jsx
│   │   ├── CheckoutPage.jsx
│   │   └── AdminDashboard.jsx
│   ├── index.css                    # Khai báo CSS Variables theo bảng màu Logo (#FAF8F5, #141413)
│   ├── App.jsx
│   └── main.jsx
├── .env                             # Lưu URL của MockAPI.io, Postman Mock Server và Backend API
├── PRD.md                           # Tài liệu Đặc tả Yêu cầu Sản phẩm
└── package.json