# TÀI LIỆU ĐẶC TẢ YÊU CẦU SẢN PHẨM (PRD)

**Tên dự án:** Lumina Eyewear – AI Virtual Try-On & 3D Custom Design E-Commerce  
**Tên đầy đủ:** LUMINA EYEWEAR — Nền tảng thương mại điện tử kính thời trang tích hợp AI Stylist và xưởng chế tác 3D  
**Phiên bản:** 5.1 — Unified & Decision-Resolved PRD  
**Nguồn hợp nhất:** PRD1.md phiên bản 3.0 và PRD2.md phiên bản 4.0  
**Môn học:** Phát triển Web Frontend Nâng cao  
**Trạng thái:** Đặc tả đã thống nhất, sẵn sàng dùng làm cơ sở triển khai đồ án  
**Kiến trúc Frontend:** React + Vite, Tailwind CSS, Three.js/WebGL, Google MediaPipe Face Landmarker  

> **Nguyên tắc tài liệu:** Tài liệu này hợp nhất các yêu cầu xuất hiện trong hai PRD nguồn và chốt một phương án duy nhất cho những điểm mâu thuẫn. Các lựa chọn trong bản này là quyết định triển khai cho đồ án; không phải chẩn đoán y khoa hay bảo đảm phù hợp cho mọi sản phẩm kính ngoài thực tế.

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1.1. Tầm nhìn sản phẩm

**Lumina Eyewear** là nền tảng thương mại điện tử kính thời trang theo định hướng cao cấp, giải quyết hai nhu cầu chính khi mua kính trực tuyến: người dùng khó đánh giá mẫu kính có phù hợp với khuôn mặt hay không và muốn cá nhân hóa thiết kế riêng. Website kết hợp AI chạy phía trình duyệt để ước lượng dáng mặt, gợi ý phong cách, tính năng thử kính ảo qua webcam và phòng thiết kế kính 3D để khách hàng phối màu, thêm đá/Charm, xem thử thiết kế rồi gửi cấu hình cho luồng đặt hàng.

### 1.2. Mục tiêu kỹ thuật

- **Kiến trúc Modular React + Vite:** Tổ chức mã nguồn theo các nhóm `api`, `components`, `context`, `hooks`, `utils` và `pages`.
- **Kiến trúc dữ liệu đa nguồn:** Kết hợp MockAPI.io, Postman Mock Server, `localStorage`, JavaScript phía client và Backend + Database thật.
- **Đồng bộ 3D – AI – Giỏ hàng:** Cùng một cấu hình kính được sử dụng trong 3D Studio, AI Virtual Try-On và dữ liệu giỏ hàng; đi kèm ảnh Snapshot có watermark và cấu hình JSON.
- **Phân quyền và kiểm tra nghiệp vụ:** Quản lý vai trò Guest/Customer/Admin; kiểm tra dữ liệu đặt tròng, cấu hình 3D, tồn kho và voucher.
- **Giao diện đồng bộ thương hiệu:** Sử dụng logo, màu sắc và typography được quy định tại mục 2.

### 1.3. Phạm vi đồ án

**Trong phạm vi:** Trang chủ và Hero Slider; danh mục/sản phẩm; tìm kiếm, lọc và sắp xếp; AI Face Shape Stylist; AI Virtual Try-On; 3D Custom Studio; đăng nhập demo và phân quyền; giỏ hàng; biểu mẫu thông số tròng; voucher; trang quản trị; gửi đơn qua API Backend.

**Ngoài phạm vi bắt buộc của bản Frontend demo:** Cổng thanh toán ngân hàng thật, chẩn đoán/đo mắt chuyên môn, mô hình AI y khoa, vận hành xưởng gia công thực tế và bảo đảm độ chính xác của phép đo PD qua webcam. Các phần này chỉ được mô phỏng hoặc tích hợp qua Backend khi có dịch vụ thật.

---

## 2. NHẬN DIỆN THƯƠNG HIỆU & QUY CHUẨN UI/UX (BRAND IDENTITY & DESIGN SYSTEM)

Toàn bộ UI/UX phải nhất quán với logo chính thức tại `public/assets/logo-lumina.jpg`.

### 2.1. Cấu trúc logo

- **Monogram:** Chữ cái in hoa `L` có chân (Serif), kết hợp nét vẽ liền mạch của gọng kính dáng Cat-Eye/Browline.
- **Biểu tượng ngôi sao bốn cánh `✦`:** Điểm nhấn ở phía trên bên phải biểu trưng cho ánh sáng, AI Stylist và tính thủ công của phụ kiện kính.
- **Wordmark:** Chữ `LUMINA` in hoa, có độ tương phản nét thanh – nét đậm; chữ `A` cách điệu theo thiết kế logo.
- **Descriptor:** Chữ `EYEWEAR` kiểu Sans-serif, nét mảnh và giãn ký tự rộng, đặt giữa hai đường kẻ ngang mảnh.

### 2.2. Bảng màu chuẩn

| CSS Token | Giá trị | Ứng dụng |
| :--- | :--- | :--- |
| `--bg-ivory-primary` | `#FAF8F5` | Nền chính của Home, Catalog, Cart và các khu vực nội dung sáng |
| `--text-obsidian` | `#141413` | Tiêu đề, văn bản chính, icon và viền nút |
| `--bg-studio-dark` | `#0D0D0D` | Nền khu vực 3D Studio và AI Virtual Try-On |
| `--accent-champagne` | `#D4AF37` | Điểm nhấn, biểu tượng `✦`, AI badge và màu kim loại mặc định |
| `--border-hairline` | `#D6D3CD` | Viền thẻ sản phẩm và đường phân cách |
| `--status-error` | `#DC2626` | Lỗi nhập liệu, quyền truy cập và thao tác không hợp lệ |
| `--status-warning` | `#D97706` | Cảnh báo nghiệp vụ và an toàn |

Khai báo các biến CSS trong `src/index.css`; không rải mã màu thương hiệu tùy ý ở nhiều component khi đã có token tương ứng.

### 2.3. Typography

- **Heading/Display:** `Cormorant Garamond` hoặc `Playfair Display`.
- **Brand Header:** `Cinzel` hoặc `Bodoni Moda` cho tiêu đề bộ sưu tập lớn.
- **Body/Sub-label:** `Plus Jakarta Sans` hoặc `Inter`.
- Nhãn phụ có thể dùng chữ in hoa và letter-spacing rộng (`uppercase tracking-[0.35em]`) để gợi lại phong cách wordmark.

### 2.4. Quy tắc dùng logo

1. Navbar hiển thị logo đầy đủ; khi thu gọn có thể chuyển sang Monogram chữ `L`.
2. Tách biểu tượng `✦` thành SVG riêng để sử dụng cho trạng thái Loading AI/3D; không cần tải lại toàn bộ logo cho mọi hiệu ứng.
3. Charm mặc định **Lumina Star** dùng hình ngôi sao bốn cánh đồng nhất với nhận diện thương hiệu.
4. Snapshot thiết kế 3D phải có watermark `LUMINA EYEWEAR` ở góc dưới bên phải trước khi lưu vào giỏ hàng.

---

## 3. KIẾN TRÚC DỮ LIỆU ĐA NGUỒN & TÍCH HỢP API

### 3.1. Quyết định phân công nguồn dữ liệu

| Loại dữ liệu | Nguồn chuẩn | Cơ chế sử dụng |
| :--- | :--- | :--- |
| Sản phẩm và danh mục | **MockAPI.io** | Lấy danh sách/chi tiết sản phẩm, danh mục, giá hiển thị, tồn kho và `recommendedFaces`; hỗ trợ CRUD demo cho Admin |
| Voucher, danh sách Charm và luật tư vấn AI | **Postman Mock Server** | Cung cấp dữ liệu JSON cố định để mô phỏng cấu hình và phản hồi API |
| Trạng thái đăng nhập demo | **`localStorage`** | Lưu đối tượng `lumina_auth_user` để giữ trạng thái sau khi tải lại trang |
| Giỏ hàng demo | **`localStorage`** | Lưu `lumina_cart_items`, cấu hình sản phẩm, thông số tròng nếu có và Snapshot Base64 đã đóng dấu watermark |
| Tìm kiếm/lọc/sắp xếp | **JavaScript phía Frontend** | Dùng `useMemo` để thao tác trên mảng sản phẩm đã tải về; không gửi API cho mỗi ký tự tìm kiếm |
| Đơn hàng và thanh toán thật | **Backend + Database** | Gửi đơn đến `POST /api/orders/checkout`; Backend phải xác minh người dùng, giá, voucher và tồn kho trước khi tạo đơn |

**Quy tắc:** MockAPI.io và Postman Mock Server phục vụ dữ liệu demo, không phải nguồn xác thực cuối cùng cho giao dịch thật. Backend là nguồn có thẩm quyền cuối cùng với giá phải thanh toán, tồn kho, voucher và trạng thái đơn hàng.

### 3.2. Ba Axios Instance

`src/api/apiClient.js` cấu hình ba instance độc lập:

1. `mockApiClient` — `baseURL: import.meta.env.VITE_MOCKAPI_URL`.
2. `postmanClient` — `baseURL: import.meta.env.VITE_POSTMAN_MOCK_URL`.
3. `backendClient` — `baseURL: import.meta.env.VITE_BACKEND_API_URL`; gắn token demo vào `Authorization: Bearer <token>` nếu dự án đang dùng cơ chế token demo.

Endpoint chuẩn tạo đơn là `POST /api/orders/checkout`. Vì vậy `VITE_BACKEND_API_URL` phải là URL gốc của Backend, không bao gồm đoạn `/api` ở cuối để tránh tạo đường dẫn `/api/api/orders/checkout`.

### 3.3. Biến môi trường

File `.env` gồm các biến cấu hình, ví dụ:

```dotenv
VITE_MOCKAPI_URL=https://<mockapi-project-url>
VITE_POSTMAN_MOCK_URL=https://<postman-mock-server-url>
VITE_BACKEND_API_URL=http://localhost:3000
```

- Thay các giá trị ví dụ bằng URL thật của dự án.
- Không commit thông tin bí mật, mật khẩu hoặc API key riêng tư vào Git.
- Biến bắt đầu bằng `VITE_` được đưa ra phía trình duyệt; **không đặt Gemini API key hoặc secret của Backend trong biến `VITE_`**.
- Nếu bổ sung Gemini, Frontend gọi Backend proxy; Backend mới giữ API key. Khi chưa có Backend proxy, dùng luật cục bộ và Postman Mock Server làm phương án mặc định.

### 3.4. Quy ước dữ liệu từ Postman Mock Server

Sử dụng thống nhất các tài nguyên cấu hình:

- `vouchers`: danh sách mã giảm giá.
- `charms`: danh sách Charm/đá trang trí có thể gắn lên kính.
- `ai_face_rules`: các quy tắc gợi ý theo dáng mặt, màu gọng, mục đích sử dụng và phong cách.

Tên `ai_face_rules` là tên chuẩn của tài liệu này; không dùng đồng thời `ai-rules` trong code.

---

## 4. KIẾN TRÚC AI & PHÂN TÍCH KHUÔN MẶT

### 4.1. MediaPipe Face Landmarker

- **Vai trò:** Ước lượng landmark khuôn mặt trực tiếp trên trình duyệt bằng WebAssembly/WebGL, nhằm giảm nhu cầu gửi hình webcam lên máy chủ.
- **Landmark:** Sử dụng các điểm mốc khuôn mặt do model cung cấp (cấu hình mục tiêu 478 điểm khi dùng bản có điểm mống mắt).
- **Ma trận biến đổi:** Dùng `facialTransformationMatrixes` nếu model/config trả về trường này để hỗ trợ góc nghiêng đầu Pitch/Yaw/Roll và căn chỉnh kính ảo.
- **Đo tỷ lệ:** Ước lượng chiều dài mặt (điểm 10–152), độ rộng gò má (234–454), độ rộng hàm (172–397) và khoảng cách hai mắt/ước lượng PD dựa trên các landmark phù hợp (cấu hình có thể tham chiếu các điểm mống mắt 468–473).
- **Quyền riêng tư:** Webcam chỉ được khởi tạo sau khi người dùng cấp quyền. Không tải ảnh/video khuôn mặt lên máy chủ theo mặc định; chỉ lưu dáng mặt nếu người dùng chủ động chọn lưu hồ sơ.

> **Giới hạn:** Kết quả dáng mặt là ước lượng phục vụ gợi ý thời trang. PD suy ra từ camera chỉ là số đo tham khảo, không thay thế phép đo được xác nhận bởi chuyên viên/đơn kính. Giao diện phải cho phép người dùng kiểm tra và sửa giá trị.

### 4.2. Bộ phân loại dáng mặt

Bản thống nhất hỗ trợ **5 nhóm dáng mặt**:

1. Tròn — `Round`
2. Vuông — `Square`
3. Trái xoan — `Oval`
4. Trái tim — `Heart`
5. Kim cương — `Diamond`

Tầng hình học phía client tính các tỷ lệ từ landmark, trong đó:

\[
LW\ Ratio = \frac{L}{W}, \qquad JW\ Ratio = \frac{J}{W}
\]

Với `L` là chiều dài mặt, `W` là độ rộng gò má và `J` là độ rộng hàm. Ngưỡng phân loại cụ thể cần được gom trong một hàm/service duy nhất để hiệu chỉnh dễ dàng; không nhúng các ngưỡng rải rác vào component giao diện. Nếu không phát hiện mặt ổn định hoặc độ tin cậy thấp, hiển thị trạng thái “Chưa xác định” và yêu cầu quét lại thay vì ép gán một dáng mặt.

Tất cả sản phẩm có trường `recommendedFaces` phải dùng đúng các enum viết hoa nêu trên để bộ lọc hoạt động thống nhất.

### 4.3. Hybrid AI Stylist

- **Tầng 1 — Rule-based tại client:** Tính toán tỷ lệ và trả về nhóm dáng mặt theo quy tắc xác định trước.
- **Tầng 2 — Quy tắc tư vấn:** Đọc dữ liệu `ai_face_rules` từ Postman Mock Server để kết hợp dáng mặt, tông da do người dùng chọn và mục đích sử dụng (ví dụ: thời trang, đi nắng, làm việc văn phòng) thành gợi ý màu gọng/tròng và Charm.
- **Tầng mở rộng — Gemini Flash:** Chỉ triển khai khi có Backend proxy bảo vệ API key. Nếu dịch vụ AI không khả dụng, hệ thống phải tiếp tục hoạt động bằng Rule-based + Postman Mock Server.
- **Không tuyên bố chẩn đoán:** Nội dung gợi ý là tư vấn phong cách; không kết luận bệnh lý hoặc thay thế lời khuyên chuyên môn về mắt.

### 4.4. Mục tiêu hiệu năng và vòng đời tài nguyên

- Hướng tới trải nghiệm mượt (mục tiêu 30–60 FPS trên thiết bị hỗ trợ), nhưng không cam kết cùng FPS trên mọi thiết bị.
- Chỉ có một luồng camera đang hoạt động tại một thời điểm.
- Khi rời trang Try-On hoặc component bị hủy, dừng `MediaStream` tracks, hủy vòng lặp animation và giải phóng tài nguyên liên quan.
- Khi rời 3D Studio, hủy renderer, controls, geometry, material, texture và event listener do component tạo ra.
- Có trạng thái giao diện rõ cho quyền camera bị từ chối, không tìm thấy camera, không phát hiện khuôn mặt hoặc model chưa tải được.

---

## 5. ĐẶC TẢ CÁC PHÂN HỆ CHỨC NĂNG

### 5.1. Trang chủ và Hero Slider

- Dùng nền kem `#FAF8F5`, chữ `#141413` và phong cách editorial cao cấp.
- Có ba chiến dịch, tự động chuyển slide sau mỗi `5000 ms`, chuyển cảnh mượt khoảng `700 ms`, và hiển thị progress indicator/pill pagination.
- **Slide 1 — AI Face Stylist:** Giới thiệu quét dáng mặt; CTA tới `/try-on`.
- **Slide 2 — 3D Bespoke Atelier:** Trình diễn thiết kế kính 3D, phối màu, đá và Charm; CTA tới `/studio-3d`.
- **Slide 3 — Seasonal Lookbook:** Giới thiệu bộ sưu tập theo mùa; có thể làm nổi bật chiến dịch “Limited Edition Cyber Cat-Eye” và voucher lấy từ Postman Mock Server.
- Nếu người dùng chuyển slide thủ công, bộ đếm tự động phải được đặt lại hợp lý để tránh chuyển cảnh ngay sau khi tương tác.

### 5.2. Catalog: Sản phẩm, tìm kiếm, lọc và sắp xếp

Dữ liệu sản phẩm được lấy từ MockAPI.io; thao tác hiển thị tiếp theo thực hiện ở Frontend qua `useProductFilter.js` và `useMemo`.

- **Tìm kiếm (`searchTerm`):** So khớp không phân biệt hoa thường bằng `toLowerCase().includes()`.
- **Lọc danh mục (`selectedCategory`):** `all`, `aviator`, `cateye`, `round`, `square`.
- **Lọc dáng mặt (`selectedFaceShape`):** Dựa vào `recommendedFaces`, hỗ trợ đủ `Round`, `Square`, `Oval`, `Heart`, `Diamond`.
- **Sắp xếp (`sortBy`):** Giá tăng dần (`a.price - b.price`), giá giảm dần (`b.price - a.price`), tên A–Z (`a.name.localeCompare(b.name)`).
- Có trạng thái Loading, lỗi tải dữ liệu, không có kết quả và nút thử lại.
- Việc lọc phía client chỉ áp dụng trên dữ liệu đã tải về; không diễn giải “0 ms” như cam kết hiệu năng tuyệt đối.

### 5.3. Product Card và thông tin sản phẩm

- Hiển thị ảnh, tên, giá, tình trạng tồn kho, dáng mặt phù hợp và nhãn `✦ AI Gợi ý` khi sản phẩm khớp gợi ý.
- Số lượng tồn kho hiển thị chỉ có tính tham khảo từ MockAPI; Backend phải xác nhận tồn kho lại trước khi tạo đơn thật.
- Giá hiển thị từ MockAPI chỉ là giá tham khảo cho UI; không tin cậy giá do Frontend tự gửi khi Checkout.

### 5.4. AI Virtual Try-On (`AIVirtualTryOn.jsx`)

- Xin quyền webcam rõ ràng trước khi bật camera.
- Phân tích landmark và ước lượng dáng mặt; hiển thị kết quả cùng lời giải thích/gợi ý phù hợp.
- Cho phép thử các mẫu trong catalog và mẫu kính đang chỉnh sửa trong 3D Studio.
- Gắn kính theo vị trí hai mắt, góc đầu và landmark khả dụng; cập nhật màu gọng, màu tròng, `lensOpacity`, đá và Charm theo `customConfig`.
- Khi cấu hình kính thay đổi, cập nhật cấu hình đang hiển thị mà không khởi tạo lại toàn bộ model MediaPipe nếu không cần thiết; có thể dùng `useRef` để đọc cấu hình mới trong vòng lặp animation.
- Có nút dừng camera và xử lý rõ trạng thái camera/model không sẵn sàng.
- “Lấy PD từ AI Camera” chỉ điền **giá trị ước lượng tham khảo**; người dùng phải xác nhận/sửa lại trước khi đặt tròng.

### 5.5. 3D Custom Studio (`ThreeDCustomizer.jsx`)

Sử dụng Three.js, WebGL và `OrbitControls` để người dùng xoay mô hình và tùy chỉnh thiết kế.

**Kiểu dáng gọng:** `Aviator`, `Cat-Eye`, `Round`, `Square`.  
**Màu/chất liệu gọng:** Vàng Champagne/Vàng 18K, Đen Obsidian `#141413`, Bạc Titanium, Đồi mồi. Có thể điều chỉnh `metalness` và `roughness` nếu vật liệu mô hình hỗ trợ.  
**Tròng kính:** Chọn màu và điều chỉnh `lensOpacity` trong khoảng `0.10–0.95`.  
**Đá pha lê:** Bật/tắt hàng đá dọc viền trên gọng.  
**Charm 3D:** `lumina-star` (ngôi sao bốn cánh), `ruby-heart` (trái tim Ruby), `silver-butterfly` (hồ điệp bạc).  
**Khắc chữ:** Cho phép nhập `engravingText` nếu thiết kế/mô hình hỗ trợ; giới hạn độ dài và loại bỏ ký tự không được hỗ trợ trong bản demo.

Thiết kế mặc định có thể là Aviator, gọng `#D4AF37`, tròng `#1F2937`, `lensOpacity: 0.45`, bật/tắt đá và không quá hai Charm.

### 5.6. Luồng đồng bộ 3D Studio ↔ AI Try-On

Cả hai phân hệ cùng đọc cấu hình chuẩn từ `CustomGlassesContext`.

1. Người dùng chỉnh màu gọng, màu tròng, độ tối, đá, Charm hoặc chữ khắc trong 3D Studio.
2. Khi bấm **“Thử mẫu vừa thiết kế lên mặt”**, ứng dụng chuyển sang `/try-on` và AI Try-On dùng cấu hình mới nhất.
3. Kính ảo trên webcam phải phản ánh đúng những thuộc tính hiện đang hỗ trợ trong mô hình 3D; nếu một thuộc tính chưa thể dựng chính xác trong overlay 2D, giao diện không được giả vờ rằng nó đã được hiển thị hoàn chỉnh.
4. Chuyển giữa hai trang không tạo nhiều camera stream hoặc nhiều vòng animation cùng lúc.

### 5.7. Snapshot, watermark và giỏ hàng

Khi người dùng bấm **“Xuất thiết kế & Thêm vào giỏ hàng”**:

1. Kiểm tra đăng nhập và tính hợp lệ của cấu hình.
2. Kết xuất frame hiện tại bằng Three.js; cấu hình renderer hỗ trợ chụp snapshot (`preserveDrawingBuffer: true` nếu cách kết xuất đang dùng yêu cầu).
3. Tạo ảnh `canvas.toDataURL('image/png')`, vẽ watermark `LUMINA EYEWEAR` ở góc dưới bên phải bằng `watermarkHelper.js`, rồi nhận về Snapshot cuối cùng.
4. Đóng gói Snapshot Base64, `designSpec`, giá hiển thị và số lượng thành cart item.
5. Lưu mảng giỏ hàng ở key `lumina_cart_items` trong `localStorage` để khôi phục sau F5.
6. Nếu ghi `localStorage` thất bại do giới hạn dung lượng, hiển thị lỗi có thể hiểu được và không giả báo đã thêm hàng thành công. Không lặp lại Snapshot Base64 ở nhiều trường của cùng một cart item.
7. Khi Checkout, gửi dữ liệu đơn, cấu hình, tham chiếu Snapshot, thông số tròng và voucher xuống Backend. Backend phải tự xác minh giá/tồn kho trước khi chấp nhận đơn.

### 5.8. Giỏ hàng và Checkout

- Giỏ hàng hỗ trợ tăng/giảm số lượng, xóa sản phẩm, hiển thị cấu hình 3D và thông số tròng liên quan.
- Số lượng không được vượt `stock` đang biết từ MockAPI; nếu vượt, khóa nút tăng và hiển thị lỗi. Backend vẫn phải kiểm tra lại tồn kho.
- Voucher lấy từ `vouchers` trên Postman Mock Server; kiểm tra mã tồn tại, `expiredAt` và `minOrder` ở UI. Với giao dịch thật, Backend phải kiểm tra lại tính hợp lệ của mã.
- Checkout tạo đơn bằng `POST /api/orders/checkout`.
- Frontend không lưu thông tin thẻ thanh toán hoặc dữ liệu nhạy cảm thanh toán trong `localStorage`.
- Trạng thái thành công chỉ hiển thị khi Backend trả về kết quả tạo đơn thành công; không giả định request thành công trước khi nhận phản hồi.

### 5.9. Admin Dashboard

- Admin có thể CRUD dữ liệu sản phẩm/danh mục demo qua MockAPI.io.
- Admin có thể xem/quản lý tồn kho gọng/Charm và xem/kiểm duyệt đơn hàng Custom 3D nếu Backend cung cấp API tương ứng.
- Admin có thể xem thống kê số đơn hàng và doanh thu. 
- Admin không dùng quyền Admin để tạo đơn mua như Customer; tạo đơn checkout là hành động dành cho Customer.
- Trong chế độ production, mọi quyền quản trị phải được xác minh ở Backend, không chỉ ẩn/hiện component trên Frontend.

---

## 6. PHÂN QUYỀN & QUẢN LÝ TÁC NHÂN (RBAC & AUTH GUARD)

### 6.1. Vai trò

- **Guest:** Chưa đăng nhập. Được xem nội dung, tìm kiếm/lọc, thử dáng mặt AI, xem Try-On trực tiếp và xoay/thử màu trong 3D Studio. Không được lưu thiết kế, xuất Snapshot vào giỏ, nhập thông số tròng để mua, áp dụng voucher hoặc Checkout.
- **Customer:** Được sử dụng luồng mua hàng, lưu mẫu 3D, thêm giỏ, nhập thông số tròng, dùng voucher và tạo đơn. Có thể lưu `savedFaceShape` khi chủ động yêu cầu.
- **Admin:** Được truy cập trang quản trị, quản lý sản phẩm/tồn kho và duyệt đơn theo API được cấp. Có thể xem/preview các tính năng AI/3D nhưng không tạo đơn Checkout dưới quyền Admin.

### 6.2. Ma trận quyền chuẩn

| Chức năng | Guest | Customer | Admin |
| :--- | :---: | :---: | :---: |
| Xem Home, Hero Slider và danh mục | Có | Có | Có |
| Tìm kiếm/lọc/sắp xếp bằng JavaScript | Có | Có | Có |
| Quét dáng mặt AI và thử kính trực tiếp | Có, không lưu hồ sơ | Có | Có |
| Xoay/thử màu trong 3D Studio | Có, chỉ trải nghiệm | Có | Có |
| Lưu hồ sơ dáng mặt | Không | Có, khi chủ động chọn | Theo nhu cầu quản trị; không mặc định lưu dữ liệu cá nhân |
| Lưu thiết kế 3D / Snapshot / thêm giỏ | Không | Có | Không dùng quyền Admin để mua |
| Nhập đơn tròng để mua | Không | Có | Không |
| Áp dụng voucher và Checkout | Không | Có | Không |
| Tạo đơn hàng cho khách | Không | Có | Không trực tiếp qua checkout; Admin có thể xử lý đơn đã tạo |
| CRUD sản phẩm/danh mục demo | Không | Không | Có |
| Quản lý tồn kho/duyệt đơn | Không | Không | Có, qua quyền Backend tương ứng |
| Truy cập `/admin` | Không | Không | Có |

### 6.3. Auth Guard

Khi Guest chọn hành động cần đăng nhập, hệ thống phải chặn thao tác trước khi thay đổi giỏ hàng hoặc gửi API, hiển thị Modal đăng nhập và thông báo thống nhất:

> **“Vui lòng đăng nhập Lumina Eyewear trước khi lưu cấu hình kính và thực hiện mua hàng.”**

Có thể trả mã lỗi UI `AUTH_REQUIRED` để các component xử lý thống nhất. Route `/admin` bị chặn với Guest/Customer và hiển thị trang `403 Forbidden` hoặc chuyển về trang phù hợp.

### 6.4. Quick Role Switcher và bảo mật

- **Chỉ hiển thị trong chế độ phát triển/demo** để phục vụ thuyết trình đồ án.
- Không được hiển thị hoặc cho phép người dùng tự chọn Admin trong bản production.
- Role phía Frontend chỉ điều khiển UI; Backend vẫn phải xác minh token/session và quyền trên mọi endpoint bảo vệ.
- Đối với bản demo, `lumina_auth_user` có thể giữ `id`, `name`, `role`, `token` mô phỏng và `savedFaceShape`.
- Đối với triển khai thật, ưu tiên phiên xác thực do Backend quản lý bằng cookie `HttpOnly`, `Secure`, `SameSite` phù hợp; không xem token lưu trong `localStorage` là giải pháp bảo mật đầy đủ.

---

## 7. VALIDATION & CẢNH BÁO NGHIỆP VỤ (`validators.js`)

Tất cả kiểm tra phía Frontend giúp phản hồi sớm cho người dùng, nhưng không thay thế kiểm tra lại tại Backend. Cảnh báo thông số kính dưới đây là quy tắc demo có thể cấu hình; người dùng nên xác nhận đơn kính và tư vấn kỹ thuật với chuyên viên có chuyên môn.

### 7.1. Bảo vệ luồng mua (`requireAuth`)

- Nếu chưa đăng nhập mà thực hiện lưu thiết kế, thêm giỏ, nhập thông số tròng để mua, dùng voucher hoặc Checkout: chặn thao tác, phát `AUTH_REQUIRED`, mở Modal đăng nhập.
- Không xóa dữ liệu form người dùng đã nhập nếu có thể khôi phục an toàn sau đăng nhập.

### 7.2. Kiểm tra thông số tròng (`validatePrescription`)

**PD — Khoảng cách đồng tử**

- Giá trị phải là số trong khoảng **50–75 mm** theo quy tắc đầu vào của đồ án.
- Nếu chọn làm tròng cận mà bỏ trống PD: báo lỗi.
- “Lấy PD từ AI Camera” chỉ cung cấp giá trị ước lượng để tham khảo; cần xác nhận/sửa trước khi tiếp tục.
- Thông báo: *“PD phải nằm trong khoảng 50–75 mm theo quy tắc nhập liệu của hệ thống. Vui lòng xác nhận lại số đo hoặc kiểm tra với chuyên viên kính mắt.”*

**Độ lệch SPH giữa hai mắt**

- Nếu `abs(SPH_left - SPH_right) > 4.00`, hiển thị cảnh báo và yêu cầu người dùng kiểm tra lại đơn kính với chuyên viên.
- Thông báo: *“Độ chênh SPH giữa hai mắt lớn hơn 4.00 Diop. Vui lòng kiểm tra lại đơn kính và hỏi chuyên viên về lựa chọn tròng phù hợp.”*
- Không tự động khẳng định một loại chiết suất hay thiết kế tròng là phù hợp cho mọi trường hợp.

**Độ SPH cao và loại gọng**

- Quy tắc demo: nếu `abs(SPH_left) > 6.00` hoặc `abs(SPH_right) > 6.00` và chọn gọng `thin-metal` hoặc `rimless`, hệ thống chặn tiếp tục với cảnh báo tương thích cấu hình.
- Thông báo: *“Cấu hình độ kính và loại gọng này cần được kiểm tra kỹ thuật trước khi đặt. Vui lòng chọn loại gọng khác hoặc xác nhận phương án với chuyên viên kính mắt.”*
- Đây là ngưỡng minh họa để kiểm thử logic trong đồ án, không phải quy luật lắp kính phổ quát. Khi triển khai thực tế, quy tắc cần được chuyên viên quang học/xưởng kính xác nhận.

**CYL và AXIS**

- Nếu `CYL != 0`, `AXIS` bắt buộc là số nguyên trong khoảng `1–180`.
- Nếu `CYL = 0`, vô hiệu hóa và xóa/đặt lại `AXIS` theo một quy tắc thống nhất.
- Thông báo khi không hợp lệ: *“Bạn đã nhập độ loạn (CYL), vui lòng nhập trục loạn (AXIS) từ 1° đến 180°.”*

### 7.3. Giới hạn thiết kế 3D (`validateCustom3D`)

**Số lượng Charm**

- `charms.length` không được lớn hơn `2`.
- Chỉ cho phép tối đa một Charm mỗi bên càng kính; nếu mô hình không hỗ trợ phân biệt trái/phải, vẫn áp dụng tổng tối đa hai Charm.
- Thông báo: *“Mỗi bên càng kính chỉ được gắn tối đa một Charm trong cấu hình demo; tổng cộng không quá hai Charm.”*

**Độ tối tròng**

- `lensOpacity` phải trong khoảng `0.10–0.95`.
- Nếu `lensOpacity > 0.85`, hiển thị cảnh báo rõ ràng rằng mô phỏng tròng đang rất tối và không nên sử dụng cấu hình này khi lái xe ban đêm/hầm tối.
- Không diễn giải `lensOpacity` của mô hình 3D như một chứng nhận về độ truyền sáng hoặc chuẩn an toàn của tròng kính thật.

### 7.4. Tồn kho (`validateStock`)

- Tổng số lượng mua không được vượt quá `stock` đang hiển thị.
- Vô hiệu hóa nút tăng số lượng khi đạt tồn kho và thông báo số lượng còn lại.
- Backend xác minh lại tồn kho trước khi trừ kho/tạo đơn để tránh dữ liệu MockAPI hoặc UI đã lỗi thời.

### 7.5. Voucher (`validateVoucher`)

Dữ liệu voucher lấy từ `vouchers` trên Postman Mock Server. Kiểm tra:

1. Mã có tồn tại hay không.
2. Mã có hết hạn (`expiredAt < currentDate`) hay không.
3. Tổng giá trị đơn (`cartTotal`) có đạt `minOrder` hay không.

Thông báo lỗi phải nêu rõ nguyên nhân. Backend cần kiểm tra lại voucher khi Checkout thật; phản hồi Mock Server không phải nguồn xác thực giao dịch.

---

## 8. MÔ HÌNH DỮ LIỆU VÀ QUY ƯỚC API

### 8.1. Key lưu trữ chuẩn

| Key | Nội dung |
| :--- | :--- |
| `lumina_auth_user` | Trạng thái user demo: `id`, `name`, `role`, `token` mô phỏng và `savedFaceShape` nếu người dùng đã chọn lưu |
| `lumina_cart_items` | Mảng cart item; mỗi item có sản phẩm/cấu hình, số lượng, giá hiển thị và Snapshot Base64 nếu là thiết kế 3D |

Không dùng `lumina_cart` song song. Nếu sau này đổi schema, phải viết migration hoặc xóa dữ liệu demo cũ có thông báo rõ.

### 8.2. Cấu hình thiết kế kính (`designSpec`)

```json
{
  "baseModel": "aviator",
  "frameType": "acetate",
  "frameColor": "#D4AF37",
  "lensColor": "#1F2937",
  "lensOpacity": 0.45,
  "hasRhinestones": true,
  "charms": ["lumina-star"],
  "engravingText": "LUMINA"
}
```

`designSpec` là nguồn cấu hình dùng chung giữa 3D Studio và AI Try-On. Snapshot và giá hiển thị là dữ liệu đi kèm cart item, không được dùng để thay thế cấu hình thiết kế. `customPrice` có thể được dùng để hiển thị ở Frontend, nhưng Backend phải tự tính/kiểm tra giá chính thức.

### 8.3. Ví dụ cart item

```json
{
  "cartItemId": "local-item-id",
  "productType": "custom",
  "quantity": 1,
  "designSpec": {
    "baseModel": "aviator",
    "frameType": "acetate",
    "frameColor": "#D4AF37",
    "lensColor": "#1F2937",
    "lensOpacity": 0.45,
    "hasRhinestones": true,
    "charms": ["lumina-star"],
    "engravingText": "LUMINA"
  },
  "snapshotDataUrl": "data:image/png;base64,...",
  "displayPrice": 2850000
}
```

`local-item-id` và giá ví dụ chỉ minh họa cấu trúc; code thực tế phải tạo ID và tính giá từ quy tắc dự án. Không xem `displayPrice` do client gửi là giá giao dịch đã được xác nhận.

### 8.4. Endpoint chuẩn

| Dịch vụ | Phương thức/đường dẫn | Mục đích |
| :--- | :--- | :--- |
| MockAPI.io | `GET /products` | Lấy sản phẩm |
| MockAPI.io | `GET /categories` | Lấy danh mục |
| MockAPI.io | Các endpoint CRUD resource tương ứng | Quản lý sản phẩm demo cho Admin |
| Postman Mock Server | `GET /vouchers` | Lấy danh sách voucher |
| Postman Mock Server | `GET /charms` | Lấy danh sách Charm |
| Postman Mock Server | `GET /ai_face_rules` | Lấy luật tư vấn AI |
| Backend | `POST /api/orders/checkout` | Xác minh và tạo đơn hàng |

Tên route phía Mock Server phụ thuộc cách người phát triển khai báo collection; điều bắt buộc là resource logic phải có tên thống nhất trong `configService.js` và tài liệu này.

---

## 9. CẤU TRÚC THƯ MỤC REACT + VITE

```text
lumina-eyewear/
├── public/
│   ├── assets/
│   │   └── logo-lumina.jpg
│   └── models/
├── src/
│   ├── api/
│   │   ├── apiClient.js
│   │   ├── productService.js
│   │   ├── configService.js
│   │   └── orderService.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── BrandLogo.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── HeroSlider.jsx
│   │   │   └── ProtectedAction.jsx
│   │   ├── product/
│   │   │   ├── ProductFilterBar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   └── PrescriptionModal.jsx
│   │   ├── studio3d/
│   │   │   └── ThreeDCustomizer.jsx
│   │   └── tryon/
│   │       └── AIVirtualTryOn.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   └── CustomGlassesContext.jsx
│   ├── hooks/
│   │   ├── useLocalStorage.js
│   │   └── useProductFilter.js
│   ├── utils/
│   │   ├── validators.js
│   │   └── watermarkHelper.js
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── StudioPage.jsx
│   │   ├── TryOnPage.jsx
│   │   ├── CheckoutPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ForbiddenPage.jsx
│   ├── index.css
│   ├── App.jsx
│   └── main.jsx
├── .env
├── .env.example
├── PRD.md
├── package.json
└── vite.config.js
```

**Vai trò các module chính:**

- `apiClient.js`: Khởi tạo ba Axios Instance.
- `productService.js`: Lấy sản phẩm và danh mục từ MockAPI.io.
- `configService.js`: Lấy voucher, Charm và `ai_face_rules` từ Postman Mock Server.
- `orderService.js`: Gửi yêu cầu Checkout tới Backend.
- `AuthContext.jsx`: Quản lý phiên demo và vai trò.
- `CartContext.jsx`: Quản lý giỏ, Snapshot và đồng bộ `localStorage`.
- `CustomGlassesContext.jsx`: Chia sẻ `designSpec` giữa 3D Studio và AI Try-On.
- `useLocalStorage.js`: Đọc/ghi JSON có xử lý lỗi parse và lỗi quota.
- `useProductFilter.js`: Tìm kiếm, lọc và sắp xếp dữ liệu phía client.
- `validators.js`: Các hàm kiểm tra Auth, prescription, cấu hình 3D, tồn kho và voucher.
- `watermarkHelper.js`: Tạo Snapshot có watermark thương hiệu.

---

## 10. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

### 10.1. Dữ liệu và API

- [ ] Sản phẩm/danh mục được lấy từ MockAPI.io.
- [ ] Voucher, Charm và `ai_face_rules` được lấy từ Postman Mock Server.
- [ ] Ba Axios Instance dùng đúng URL trong `.env`.
- [ ] `lumina_auth_user` và `lumina_cart_items` được khôi phục sau khi tải lại trang trong chế độ demo.
- [ ] Tìm kiếm/lọc/sắp xếp hoạt động ở client theo tiêu chí tại mục 5.2.
- [ ] Checkout gửi `POST /api/orders/checkout`; UI chỉ hiển thị đặt hàng thành công sau khi nhận phản hồi thành công từ Backend.
- [ ] Database lưu vào xampp 

### 10.2. AI và Try-On

- [ ] Hệ thống hỗ trợ 5 nhóm dáng mặt: Round, Square, Oval, Heart, Diamond và trạng thái chưa xác định.
- [ ] Không yêu cầu tải ảnh/video khuôn mặt lên server trong luồng mặc định.
- [ ] Có xử lý quyền webcam, lỗi model và trạng thái không phát hiện khuôn mặt.
- [ ] Dáng mặt đã quét lọc đúng trường `recommendedFaces`.
- [ ] PD từ camera được ghi rõ là ước lượng tham khảo và có bước xác nhận.
- [ ] AI Stylist hoạt động bằng Rule-based + `ai_face_rules` ngay cả khi không cấu hình Gemini.

### 10.3. Đồng bộ 3D và giỏ hàng

- [ ] Thay đổi màu gọng, màu tròng, `lensOpacity`, đá và Charm trong 3D Studio được phản ánh trong Try-On ở các thuộc tính mà overlay hỗ trợ.
- [ ] Chuyển giữa Studio và Try-On không nhân đôi camera stream hoặc gây rò rỉ tài nguyên.
- [ ] Snapshot xuất ra có watermark `LUMINA EYEWEAR`.
- [ ] Cart item giữ được `designSpec`, Snapshot và số lượng sau F5.
- [ ] Nếu lưu Snapshot thất bại vì dung lượng, hệ thống báo lỗi thay vì báo thành công giả.

### 10.4. Phân quyền và validation

- [ ] Guest có thể xem catalog và trải nghiệm AI/3D nhưng bị chặn các thao tác cần đăng nhập theo ma trận quyền.
- [ ] Quick Role Switcher chỉ tồn tại trong chế độ demo/phát triển.
- [ ] Customer có thể lưu mẫu, thao tác giỏ và Checkout.
- [ ] Admin truy cập được trang quản trị; Guest/Customer không truy cập được `/admin`.
- [ ] PD ngoài phạm vi hoặc bị bỏ trống khi bắt buộc tạo lỗi chính xác.
- [ ] CYL khác 0 nhưng AXIS thiếu/ngoài `1–180` tạo lỗi; CYL bằng 0 thì AXIS bị vô hiệu hóa.
- [ ] Chênh lệch SPH lớn hơn `4.00 Diop` tạo cảnh báo.
- [ ] Quy tắc demo chặn tổ hợp `abs(SPH) > 6.00` với gọng `thin-metal` hoặc `rimless`.
- [ ] Không cho phép trên 2 Charm; cảnh báo `lensOpacity > 0.85`.
- [ ] Tồn kho và voucher được kiểm tra trước Checkout; Backend xác minh lại các giá trị có ảnh hưởng giao dịch.

### 10.5. UI/UX và hiệu năng

- [ ] Giao diện dùng đúng palette, typography và logo Lumina Eyewear. Trải nghiệm người dùng tốt, có sử dụng các animation khi click chuột
- [ ] Hero Slider tự động chuyển sau 5000 ms và có điều khiển thủ công.
- [ ] Loading, lỗi API, lỗi camera và trạng thái dữ liệu rỗng có giao diện phản hồi.
- [ ] Tài nguyên webcam, MediaPipe, Three.js và event listener được dọn đúng vòng đời component.

---

## 11. CÁC QUYẾT ĐỊNH ĐÃ THỐNG NHẤT

Bảng này thay thế mục “các điểm cần xác nhận” của bản hợp nhất trước. Các lựa chọn dưới đây là chuẩn để code; không cần giữ hai tên/luồng song song.

| Hạng mục có khác biệt trong hai PRD | Quyết định chính thức trong PRD 5.1 | Lý do |
| :--- | :--- | :--- |
| Số nhóm dáng mặt | **5 nhóm:** Round, Square, Oval, Heart, Diamond | Giữ tập tính năng đầy đủ hơn của PRD2; đồng bộ model, luật tư vấn và `recommendedFaces` |
| Key giỏ hàng | **`lumina_cart_items`** | Tên rõ nghĩa và nhất quán với schema cart item |
| Key phiên đăng nhập | **`lumina_auth_user`** | Giữ nguyên key được cả hai bản sử dụng |
| Endpoint Checkout | **`POST /api/orders/checkout`** | Dùng một route có prefix API rõ ràng; `VITE_BACKEND_API_URL` là URL gốc |
| Tên dữ liệu luật AI | **`ai_face_rules`** | Thống nhất tên cấu hình của PRD2 |
| Phạm vi Quick Role Switcher | Chỉ dùng trong dev/demo; ẩn ở production | Tránh để người dùng tự đổi sang Admin trên bản triển khai thật |
| Quyền mua hàng của Admin | Admin quản trị/xử lý đơn; chỉ Customer tạo Checkout | Tách nhiệm vụ quản trị và nhiệm vụ mua hàng |
| Quyền Guest | Được thử AI/3D, nhưng không lưu thiết kế, không thêm giỏ, không nhập prescription để mua, không áp voucher/Checkout | Giữ rõ Auth Guard được mô tả trong cả hai bản |
| Hero slide thứ ba | **Seasonal Lookbook**, có thể giới thiệu chiến dịch phụ **Limited Edition Cyber Cat-Eye** | Giữ được cả hai tên mà không tạo hai slide thứ ba |
| Logic độ SPH cao và gọng | Quy tắc demo: `abs(SPH) > 6.00` kết hợp `thin-metal` hoặc `rimless` thì chặn và yêu cầu kiểm tra kỹ thuật | Bao phủ hai mô tả, đồng thời ghi rõ đây là ngưỡng demo cần chuyên viên xác nhận khi dùng thật |
| Cảnh báo lệch SPH | Chỉ cảnh báo kiểm tra lại đơn và hỏi chuyên viên; không tự kết luận một loại tròng là phù hợp | Tránh biến tư vấn phong cách thành kết luận y khoa cứng nhắc |
| PD từ AI Camera | Chỉ là số đo ước lượng, cần xác nhận/sửa trước khi mua | Phù hợp với giới hạn của đo đạc qua webcam |
| Gemini Flash | Chưa bắt buộc cho bản đầu; chỉ qua Backend proxy nếu triển khai, luôn có Rule-based + Mock fallback | Không để lộ API key phía Frontend và bảo đảm demo hoạt động khi không có dịch vụ AI thật |
| Logo asset | **`public/assets/logo-lumina.jpg`** | Thống nhất đường dẫn ở PRD2; phải đặt đúng file tại đây |
| Trạng thái thanh toán/đơn hàng | Backend quyết định thành công, tồn kho và giá cuối | Không tin dữ liệu giá/stock từ client trong giao dịch thật |

---

## 12. THỨ TỰ TRIỂN KHAI ĐỀ XUẤT

1. **Nền dự án:** Khởi tạo React + Vite, Tailwind/CSS variables, Router, `.env.example`, layout Navbar/Footer và BrandLogo.
2. **API và catalog:** Hoàn tất ba Axios Instance, Product/Config services, loading/error/empty states và lọc bằng `useProductFilter`.
3. **Auth và cart:** Hoàn tất `AuthContext`, `CartContext`, `useLocalStorage`, Auth Guard và Quick Role Switcher chỉ trong chế độ demo.
4. **3D Studio:** Dựng gọng cơ bản, phối màu/tròng, đá/Charm, cấu hình `designSpec` và Snapshot/watermark.
5. **AI Try-On:** Kết nối MediaPipe, quyền camera, phân loại 5 dáng mặt, overlay kính và đồng bộ `CustomGlassesContext`.
6. **Prescription và voucher:** Tạo form, validate các trường, thông báo lỗi nhất quán và luồng áp dụng voucher.
7. **Checkout và Admin:** Kết nối Backend cho Checkout; dựng CRUD demo và các trang quản trị.
8. **Kiểm thử:** Chạy lần lượt Acceptance Criteria mục 10, kiểm tra responsive, tải lại trang, lỗi API, dọn camera/renderer và phân quyền.

---

## 13. YÊU CẦU PHI CHỨC NĂNG VÀ GIỚI HẠN

### 13.1. Bảo mật

- Không lưu mật khẩu dạng rõ hoặc thông tin thanh toán nhạy cảm trong `localStorage`.
- Quick Role Switcher chỉ dành cho demo; không được dùng làm xác thực thật.
- Không để API key của Gemini hoặc bí mật Backend trong mã Frontend hay biến `VITE_`.
- Backend phải xác minh quyền, giá, voucher, tồn kho và dữ liệu Checkout.

### 13.2. Quyền riêng tư

- Webcam chỉ hoạt động sau khi người dùng cấp quyền.
- Không gửi video/ảnh khuôn mặt lên server trong luồng mặc định.
- Chỉ lưu `savedFaceShape` nếu người dùng chủ động yêu cầu; cung cấp cách xóa dữ liệu đã lưu.

### 13.3. Khả năng phục hồi

- API lỗi phải có thông báo và nút thử lại khi phù hợp.
- Nếu thiếu URL mock hoặc cấu hình chưa hoàn tất, hiển thị lỗi cấu hình dễ hiểu thay vì treo giao diện.
- Các thao tác ghi JSON vào `localStorage` phải xử lý lỗi `JSON.parse`, `QuotaExceededError` và dữ liệu hỏng.
- AI Stylist vẫn có thể đưa gợi ý cơ bản bằng Rule-based khi Postman/Gemini không khả dụng; các chức năng phụ thuộc dữ liệu từ xa phải báo trạng thái nếu không tải được.

### 13.4. Khả năng truy cập và responsive

- Bố cục hoạt động trên desktop, tablet và mobile.
- Nút bấm, modal, thanh trượt và form có nhãn rõ; lỗi nhập liệu không chỉ được biểu đạt bằng màu sắc.
- Người dùng có thể dừng camera rõ ràng và được thông báo trước khi trình duyệt cần quyền truy cập webcam.

---

**Kết thúc PRD thống nhất Lumina Eyewear — Phiên bản 5.1.**
