# TÀI LIỆU ĐẶC TẢ YÊU CẦU SẢN PHẨM (PRD)

**Tên dự án:** Lumina Eyewear – AI Virtual Try-On & 3D Custom Design E-Commerce  
**Phiên bản:** 3.0 (Modular React/Vite & Hybrid Data Architecture Edition)  
**Trạng thái:** Sẵn sàng phát triển (Ready for Development)

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1.1. Tầm nhìn sản phẩm
**Lumina Eyewear** là nền tảng thương mại điện tử thời trang mắt kính cao cấp thế hệ mới. Dự án giải quyết bài toán lớn nhất của việc mua kính trực tuyến: *không biết kính có hợp với khuôn mặt không* và *nhu cầu cá nhân hóa độc bản*. Hệ thống kết hợp công nghệ **Client-side Edge AI** để phân tích nhân trắc học khuôn mặt, tư vấn kiểu dáng và **Đồ họa 3D (Three.js/WebGL)** giúp khách hàng tự thiết kế mẫu kính của riêng mình, thử trực tiếp mẫu kính vừa thiết kế lên mặt và đặt gia công.

### 1.2. Mục tiêu kỹ thuật (Môn học Web Frontend Nâng cao)
* **Kiến trúc Modular React + Vite:** Tổ chức mã nguồn tách biệt rõ ràng theo chuẩn công nghiệp (`api`, `components`, `context`, `hooks`, `utils`, `pages`).
* **Kiến trúc Dữ liệu Đa nguồn (Multi-Source Data Strategy):** Phối hợp nhịp nhàng giữa **MockAPI.io**, **Postman Mock Server**, **localStorage**, **JavaScript In-Memory Filtering** và **Backend + Database thật**.
* **Đồng bộ hóa Kép (Dual-Sync 3D & AI):** Đồng bộ trạng thái thời gian thực giữa phòng thiết kế 3D (`Three.js`), phòng thử kính ảo (`MediaPipe`) và giỏ hàng (kèm ảnh chụp Snapshot Base64 và cấu hình JSON).
* **Hệ thống Kiểm tra Logic & Phân quyền (RBAC & Validation Engine):** Bảo vệ luồng mua hàng và kiểm soát chặt chẽ các ràng buộc y khoa (độ cận/loạn), giới hạn vật lý 3D và tồn kho.

---

## 2. KIẾN TRÚC MÔ HÌNH AI (AI MODEL ARCHITECTURE)

Để đảm bảo hiệu năng cao ($30\text{ FPS} - 60\text{ FPS}$) ngay trên trình duyệt mà không phụ thuộc vào máy chủ GPU đắt đỏ, hệ thống sử dụng kiến trúc AI lai (Hybrid Client-Cloud AI):

### 2.1. Google MediaPipe Face Landmarker (Face Mesh via WebAssembly & WebGL)
* **Vai trò:** Xử lý thị giác máy tính (Computer Vision) trực tiếp tại trình duyệt (Client-side).
* **Khả năng kỹ thuật:**
  * Trích xuất **478 điểm mốc 3D (3D Landmarks)** trên khuôn mặt theo thời gian thực qua Webcam.
  * Cung cấp ma trận biến đổi không gian (`facialTransformationMatrixes`) để tính góc nghiêng đầu (Pitch, Yaw, Roll) giúp gắn kính ảo bám sát chuyển động mặt.
  * Đo đạc tỷ lệ nhân trắc học: Chiều dài mặt ($P_{10}$ đến $P_{152}$), độ rộng gò má ($P_{234}$ đến $P_{454}$), độ rộng xương hàm ($P_{172}$ đến $P_{397}$) và khoảng cách giữa hai tâm mắt ($P_{33}$ và $P_{263}$).

### 2.2. Hệ thống Hybrid AI Stylist (Rule-based Geometry + Gemini Flash API / Mock LLM)
* **Tầng 1 – Phân loại Hình học Tức thì (Client-side Rule-based Geometry):**
  * Tính toán tỷ lệ ngay tại trình duyệt:
    $$\text{LW Ratio} = \frac{\text{Chiều dài mặt } (L)}{\text{Độ rộng gò má } (W)}, \quad \text{JW Ratio} = \frac{\text{Độ rộng xương hàm } (J)}{\text{Độ rộng gò má } (W)}$$
  * Phân loại tức thì vào 4 nhóm dáng mặt: **Trái xoan (Oval)**, **Vuông (Square)**, **Tròn (Round)**, **Trái tim (Heart)** và tự động kích hoạt bộ lọc sản phẩm tương ứng.
* **Tầng 2 – Tư vấn Phong cách Thông minh (Gemini Flash API / Postman Mock Fallback):**
  * Kết hợp dữ liệu *Dáng mặt + Tông da + Mục đích sử dụng (đi biển, làm việc văn phòng, lái xe đêm)* để sinh lời khuyên cá nhân hóa về màu gọng, độ đậm màu tròng và cách phối Charm/Đính đá.

---

## 3. KIẾN TRÚC DỮ LIỆU ĐA NGUỒN & TÍCH HỢP API (DATA & API STRATEGY)

Dự án áp dụng mô hình phân bổ công nghệ dữ liệu chuẩn thực tế theo bảng đặc tả sau:

### 3.1. Bảng Phân bổ Công nghệ Lưu trữ & Xử lý Dữ liệu

| Loại dữ liệu | Công nghệ sử dụng | Công dụng & Cơ chế hoạt động trong dự án |
| :--- | :--- | :--- |
| **Sản phẩm, danh mục** | **MockAPI.io** | Lấy danh sách sản phẩm (`GET /products`), chi tiết kính và danh mục qua RESTful API. Hỗ trợ Admin thực hiện CRUD sản phẩm mẫu. |
| **API trả về dữ liệu mẫu cố định** | **Postman Mock Server** | Mô phỏng phản hồi API cho các cấu hình tĩnh ít biến động: Danh sách mã giảm giá (`vouchers`), danh mục phụ kiện Charm/Đá (`charms`), bảng quy tắc gợi ý của AI (`ai-rules`). |
| **Trạng thái đăng nhập** | **`localStorage`** | Lưu trữ thông tin người dùng và JWT Token (`lumina_auth_user`) để giữ trạng thái đăng nhập và quyền hạn (Role) sau khi tải lại trang (F5). |
| **Giỏ hàng** | **`localStorage`** | Lưu trữ danh sách sản phẩm trong giỏ (`lumina_cart`), bao gồm cả cấu hình JSON chi tiết và ảnh chụp Snapshot Base64 của mẫu kính 3D tự thiết kế khi tải lại trang. |
| **Lọc, sắp xếp, tìm kiếm** | **JavaScript ở Frontend** | Sử dụng React Hook (`useMemo` trong `useProductFilter.js`) để lọc theo danh mục/dáng mặt, tìm kiếm theo từ khóa và sắp xếp theo giá/tên trực tiếp trên mảng dữ liệu đang hiển thị với độ trễ $0\text{ ms}$. |
| **Đơn hàng, thanh toán thật** | **Backend + Database** | Gửi dữ liệu đơn hàng chính thức (`POST /orders/checkout`), thông số độ cận và thông tin giao hàng/thanh toán xuống Backend + Database thật để lưu trữ và xử lý đáng tin cậy. |

### 3.2. Cấu hình Biến Môi trường (`.env`) & Tầng Giao tiếp (`apiClient.js`)
Hệ thống tách biệt 3 Axios Instance độc lập tương ứng với 3 nguồn dịch vụ mạng:
1. `mockApiClient` $\rightarrow$ Trỏ tới `VITE_MOCKAPI_URL` (MockAPI.io).
2. `postmanClient` $\rightarrow$ Trỏ tới `VITE_POSTMAN_MOCK_URL` (Postman Mock Server).
3. `backendClient` $\rightarrow$ Trỏ tới `VITE_BACKEND_API_URL` (Backend Server thật), được gắn Request Interceptor tự động đọc JWT Token từ `localStorage` (`Authorization: Bearer <token>`).

---

## 4. LUỒNG ĐỒNG BỘ KÉP: 3D STUDIO $\leftrightarrow$ AI TRY-ON $\leftrightarrow$ GIỎ HÀNG

Đây là luồng nghiệp vụ cốt lõi kết nối hai công nghệ lớn nhất của dự án thông qua `CustomGlassesContext`:

### 4.1. Cấu trúc State Thiết kế 3D (`customConfig`)
```json
{
  "baseModel": "aviator",
  "frameColor": "#d4af37",
  "lensColor": "#1f2937",
  "lensOpacity": 0.45,
  "hasRhinestones": true,
  "charms": ["star"],
  "engravingText": "LUMINA",
  "snapshotDataUrl": "data:image/png;base64,...",
  "customPrice": 2850000
}
```

### 4.2. Hai nhánh xử lý sau khi người dùng tùy chỉnh kính 3D
1. **Nhánh 1 – Đồng bộ sang Phòng thử kính AI (Real-time Virtual Try-On Sync):**
   * Khi người dùng đổi màu gọng, màu tròng, bật/tắt đính đá (Rhinestones) hoặc gắn Charm (Ngôi sao, Trái tim) trong **3D Studio** và bấm *"Thử mẫu vừa thiết kế lên mặt"*:
   * `AIVirtualTryOn.jsx` đọc trực tiếp `customConfig` thông qua `useRef` (để không phải khởi tạo lại mô hình Wasm của MediaPipe).
   * Trên luồng Webcam, hệ thống vẽ trực tiếp gọng kính theo đúng mã màu `frameColor`, phủ màu tròng theo `lensColor` và độ mờ `lensOpacity`, đồng thời render hàng đá pha lê lấp lánh dọc viền trên gọng và biểu tượng Charm tại góc mắt kính bám theo chuyển động 2 mắt người dùng.
2. **Nhánh 2 – Xuất Cấu hình JSON + Ảnh chụp Snapshot 3D vào Giỏ hàng:**
   * Khi người dùng bấm *"Thêm Thiết kế vào Giỏ hàng"*:
   * Trình render `THREE.WebGLRenderer` (được cấu hình `preserveDrawingBuffer: true`) sẽ chụp lại khung hình 3D hiện tại thành chuỗi ảnh `canvas.toDataURL('image/png')`.
   * Hệ thống đóng gói đối tượng gồm: ảnh `snapshot`, toàn bộ `designSpec` (JSON) và `customPrice` rồi đẩy vào `CartContext` (tự động đồng bộ xuống `localStorage`).
   * Khi tiến hành Thanh toán, toàn bộ gói JSON này được gửi xuống **Backend + Database thật** để xưởng gia công chế tác đúng mẫu kính khách hàng đã thiết kế.

---

## 5. HỆ THỐNG PHÂN QUYỀN & BẢO VỆ THAO TÁC (RBAC & AUTH GUARD)

### 5.1. Định nghĩa Vai trò & Lưu trữ
Trạng thái đăng nhập được lưu tại `localStorage` với key `lumina_auth_user`. Hệ thống hỗ trợ thanh **Quick Role Switcher** trên góc màn hình (dành cho mục đích Demo đồ án) để chuyển đổi nhanh giữa 3 quyền:
1. **Guest (Khách vãng lai):** Được xem Slider, dùng thử bộ lọc JS, quét mặt AI và xoay thử kính 3D. **Bị chặn** mọi thao tác Lưu thiết kế 3D, Thêm vào giỏ hàng, Áp dụng Voucher và Thanh toán.
2. **Customer (Khách hàng đã đăng nhập):** Thực hiện đầy đủ luồng mua sắm, nhập thông số độ cận, lưu bộ sưu tập kính 3D và gửi đơn hàng xuống Backend thật.
3. **Admin (Quản trị viên):** Quản lý danh mục sản phẩm (đồng bộ MockAPI.io), kiểm duyệt các đơn hàng đặt làm kính 3D riêng từ Backend.

### 5.2. Ma trận Phân quyền (Permission Matrix)

| Tính năng / Thao tác | Guest | Customer | Admin | Phản hồi của hệ thống khi vi phạm quyền |
| :--- | :---: | :---: | :---: | :--- |
| Xem Hero Slider, Lọc/Tìm kiếm bằng JS | Có | Có | Có | Cho phép truy cập tự do. |
| Tương tác 3D Studio & Quét mặt AI | Có | Có | Có | Cho phép trải nghiệm để kích thích mua hàng. |
| **Xuất kính 3D / Thêm vào Giỏ hàng** | **Không** | Có | Có | Cảnh báo `AUTH_REQUIRED` & mở Modal Đăng nhập. |
| **Nhập Độ cận & Tạo Đơn hàng (Backend)** | **Không** | Có | Không | Chặn truy cập, yêu cầu đăng nhập tài khoản Customer. |
| **Truy cập Trang Quản trị (`/admin`)** | **Không** | **Không** | Có | Chuyển hướng về trang `403 Forbidden`. |

---

## 6. BỘ QUY TẮC KIỂM TRA LOGIC & CẢNH BÁO NGHIỆP VỤ (`validators.js`)

Hệ thống kiểm tra dữ liệu nghiêm ngặt tại Frontend trước khi lưu vào `localStorage` hoặc gửi xuống Backend:

### 6.1. Cảnh báo Bảo vệ Luồng Mua hàng (`requireAuth`)
* **Điều kiện:** `currentUser === null` khi người dùng bấm *"Thêm vào giỏ"*, *"Lưu thiết kế 3D"* hoặc *"Thanh toán"*.
* **Hành vi:** Chặn hàm thêm giỏ hàng, phát thông báo cảnh báo: *"Cảnh báo: Bạn cần đăng nhập tài khoản trước khi thực hiện thao tác này!"* và tự động bật Modal Đăng nhập.

### 6.2. Kiểm tra Logic Thông số Độ cận & Tương thích Gọng kính (`validatePrescription`)
* **Khoảng cách đồng tử (PD - Pupillary Distance):**
  * Quy tắc: Chỉ chấp nhận giá trị số trong khoảng $[50\text{ mm}, 75\text{ mm}]$.
  * Cảnh báo khi sai: *"Lỗi logic: Khoảng cách đồng tử (PD) của người trưởng thành phải nằm trong khoảng từ $50\text{ mm}$ đến $75\text{ mm}$."*
* **Độ lệch khúc xạ 2 mắt (Anisometropia Warning):**
  * Quy tắc: Nếu $\vert \text{SPH}_{\text{trái}} - \text{SPH}_{\text{phải}} \vert > 4.00\text{ Diop}$.
  * Cảnh báo y khoa: *"Cảnh báo y khoa: Độ lệch giữa mắt trái và mắt phải vượt quá $4.00\text{ Diop}$. Khuyến nghị chọn tròng chiết suất cao ($1.67$ trở lên) để tránh lệch trọng tâm kính."*
* **Ràng buộc Độ cận nặng và Độ dày Gọng kính:**
  * Quy tắc: Nếu $\vert \text{SPH}_{\text{trái}} \vert > 6.00\text{ Diop}$ hoặc $\vert \text{SPH}_{\text{phải}} \vert > 6.00\text{ Diop}$ VÀ người dùng đang chọn gọng kim loại mảnh (`frameType === 'thin-metal'`).
  * Cảnh báo chặn (Block Error): *"Lỗi tương thích: Độ cận của bạn vượt quá $-6.00\text{ Diop}$ (tròng kính sẽ rất dày ở rìa), không thể lắp an toàn vào gọng kim loại mảnh. Vui lòng đổi sang gọng nhựa Acetate dày!"*
* **Ràng buộc Độ loạn (CYL) và Trục loạn (AXIS):**
  * Quy tắc: Nếu $\text{CYL} \neq 0$ thì bắt buộc phải nhập $\text{AXIS} \in [1^\circ, 180^\circ]$. Nếu $\text{CYL} = 0$ thì tự động vô hiệu hóa ô $\text{AXIS}$.

### 6.3. Kiểm tra Giới hạn Vật lý & An toàn khi Thiết kế 3D (`validateCustom3D`)
* **Giới hạn trọng lượng Charm trên gọng:**
  * Quy tắc: Số lượng Charm gắn lên gọng không được vượt quá $2$ (`config.charms.length > 2`).
  * Cảnh báo chặn: *"Lỗi thiết kế: Mỗi bên gọng kính chỉ chịu lực tối đa 1 Charm (Tổng cộng tối đa 2 Charm trên một mẫu kính) để tránh làm lệch kính khi đeo."*
* **Cảnh báo độ tối tròng kính khi lái xe:**
  * Quy tắc: Nếu độ đậm đặc của màu tròng kính vượt quá $85\%$ (`config.lensOpacity > 0.85`).
  * Cảnh báo an toàn: *"Lưu ý an toàn: Độ tối màu tròng kính đang vượt quá $85\%$. Mẫu kính này chỉ phù hợp đi nắng gắt, tuyệt đối không sử dụng khi lái xe vào ban đêm."*

### 6.4. Kiểm tra Tồn kho & Mã giảm giá (Stock & Voucher Logic)
* Đối chiếu số lượng đặt mua với trường `stock` lấy từ **MockAPI.io**. Nếu vượt quá tồn kho, khóa nút tăng số lượng và báo lỗi.
* Đối chiếu mã giảm giá người dùng nhập với danh sách `vouchers` lấy từ **Postman Mock Server** (kiểm tra mã tồn tại, hạn sử dụng `expiredAt` và giá trị đơn hàng tối thiểu `minOrder`).

---

## 7. ĐẶC TẢ GIAO DIỆN CHUYÊN NGHIỆP & LỌC DỮ LIỆU FRONTEND

### 7.1. Animated Hero Slider ở Trang chủ (`HeroSlider.jsx`)
* **Thiết kế chuyển động:** Gồm 3 chiến dịch chính (*AI Face Stylist*, *Bespoke 3D Atelier*, *Limited Edition Cyber Cat-Eye*).
* **Cơ chế hoạt động:** Tự động chuyển slide mỗi $5000\text{ ms}$ kết hợp hiệu ứng chuyển màu nền Gradient mượt mà (`transition-all duration-700`), nút CTA điều hướng trực tiếp sang tab tương ứng (`tryon`, `studio`, `catalog`) và thanh chỉ báo tiến trình dạng viên nang (Pill Pagination Indicator) co giãn động.

### 7.2. Bộ Lọc, Sắp xếp & Tìm kiếm bằng JavaScript tại Client (`useProductFilter.js`)
Sau khi tải danh sách sản phẩm từ **MockAPI.io** về State của React, mọi thao tác tra cứu của người dùng được xử lý tức thì ở Frontend thông qua `useMemo`:
* **Tìm kiếm (`searchTerm`):** So khớp chuỗi không phân biệt hoa thường (`toLowerCase().includes()`).
* **Lọc theo Danh mục (`selectedCategory`):** `all`, `aviator`, `cateye`, `round`, `square`.
* **Lọc theo Dáng mặt AI (`selectedFaceShape`):** Tự động lọc ra các mẫu kính có mảng `recommendedFaces` chứa dáng mặt vừa được MediaPipe quét (VD: `Oval`, `Square`, `Round`, `Heart`).
* **Sắp xếp (`sortBy`):** Tăng dần theo giá (`a.price - b.price`), giảm dần theo giá (`b.price - a.price`), và theo bảng chữ cái (`a.name.localeCompare(b.name)`).

---

## 8. CẤU TRÚC THƯ MỤC DỰ ÁN CHUẨN REACT + VITE

```text
lumina-eyewear/
├── public/
│   └── models/                      # Tài nguyên 3D / Hình ảnh tĩnh
├── src/
│   ├── api/
│   │   ├── apiClient.js             # Cấu hình 3 Axios instances (MockAPI.io, Postman, Backend thật)
│   │   ├── productService.js        # Gọi MockAPI.io lấy sản phẩm, danh mục
│   │   ├── configService.js         # Gọi Postman Mock Server lấy Vouchers, Charms, AI Rules
│   │   └── orderService.js          # Gọi Backend + Database thật xử lý Đơn hàng & Thanh toán
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx           # Điều hướng + Quick Role Switcher + Badge Giỏ hàng
│   │   │   ├── HeroSlider.jsx       # Slider chuyển động chuyên nghiệp ở Trang chủ
│   │   │   └── ProtectedAction.jsx  # Wrapper kiểm tra đăng nhập trước khi thao tác
│   │   ├── product/
│   │   │   ├── ProductFilterBar.jsx # Thanh công cụ Lọc, Sắp xếp, Tìm kiếm bằng JS
│   │   │   └── PrescriptionModal.jsx# Modal nhập độ cận có bắt lỗi logic y khoa
│   │   ├── studio3d/
│   │   │   └── ThreeDCustomizer.jsx # Thiết kế kính 3D + Chụp Snapshot + Đồng bộ sang AI Try-On
│   │   └── tryon/
│   │       └── AIVirtualTryOn.jsx   # MediaPipe quét dáng mặt + Vẽ mẫu kính vừa custom 3D lên mặt
│   ├── context/
│   │   ├── AuthContext.jsx          # Quản lý đăng nhập & phân quyền (Lưu localStorage)
│   │   ├── CartContext.jsx          # Quản lý giỏ hàng + cấu hình 3D (Lưu localStorage)
│   │   └── CustomGlassesContext.jsx # Cầu nối đồng bộ thời gian thực giữa 3D Studio và AI Try-On
│   ├── hooks/
│   │   ├── useLocalStorage.js       # Custom Hook tự động đồng bộ State với localStorage
│   │   └── useProductFilter.js      # Custom Hook Lọc, Sắp xếp, Tìm kiếm bằng JS tại Frontend
│   ├── utils/
│   │   └── validators.js            # Bộ quy tắc kiểm tra logic (Auth, Độ cận, Giới hạn 3D, Voucher)
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── StudioPage.jsx
│   │   ├── TryOnPage.jsx
│   │   ├── CheckoutPage.jsx
│   │   └── AdminDashboard.jsx
│   ├── App.jsx
│   └── main.jsx
├── .env                             # Khai báo VITE_MOCKAPI_URL, VITE_POSTMAN_MOCK_URL, VITE_BACKEND_API_URL
├── package.json
└── vite.config.js
```

---

## 9. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

* [ ] **Đúng kiến trúc lưu trữ & API:** Sản phẩm lấy từ MockAPI.io; Voucher & Charm lấy từ Postman Mock Server; Đăng nhập & Giỏ hàng giữ nguyên khi nhấn F5 nhờ `localStorage`; Lọc/Sắp xếp/Tìm kiếm phản hồi tức thì bằng JavaScript; Đơn hàng gửi qua API xuống Backend thật.
* [ ] **Đồng bộ 3D $\leftrightarrow$ AI Try-On $\leftrightarrow$ Giỏ hàng:** Thay đổi màu gọng, màu mắt kính, đính đá và gắn Charm trong 3D Studio phải hiển thị đúng trên khuôn mặt khi chuyển sang tab AI Try-On, đồng thời xuất được ảnh chụp Snapshot + JSON vào giỏ hàng.
* [ ] **Bắt lỗi Logic chính xác 100%:** Hệ thống chặn và hiển thị đúng thông báo khi Guest bấm mua hàng chưa đăng nhập, khi nhập sai khoảng cách đồng tử PD ($< 50\text{ mm}$ hoặc $> 75\text{ mm}$), khi chọn gọng kim loại mảnh cho độ cận $> -6.00\text{ Diop}$, hoặc khi gắn quá $2\text{ Charm}$ lên kính.
* [ ] **Trải nghiệm UI/UX Thời trang:** Hero Slider ở trang chủ tự động chuyển cảnh mượt mà; chuyển đổi qua lại giữa 3D Studio và AI Camera không gây rò rỉ bộ nhớ (Memory Leak) hay lỗi WebAssembly.