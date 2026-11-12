# LUMINA EYEWEAR — NÂNG CẤP THỬ KÍNH 3D THỰC & CẬP NHẬT MẪU GỌNG XU HƯỚNG 2026

## 0. Vai trò và mục tiêu

Bạn là Senior 3D Graphics Engineer, React Engineer và Eyewear Product Designer. Hãy cải tiến trực tiếp dự án Lumina Eyewear hiện có để:

1. Thay trải nghiệm kính thử hiện tại có đường viền 2D đơn giản bằng **mô hình gọng kính 3D có chiều sâu, vật liệu và phối cảnh**, được định vị trên khuôn mặt bằng Google MediaPipe Face Landmarker.
2. Giữ được cả hai nguồn thử kính: webcam trực tiếp và ảnh chân dung do người dùng tải lên (nếu tính năng upload ảnh đã được triển khai; nếu chưa, bổ sung theo kiến trúc hiện có).
3. Bổ sung các kiểu gọng theo xu hướng eyewear 2026 vào 3D Studio và Try-On, nhưng vẫn giữ các kiểu gọng cũ để không phá vỡ đơn hàng/designSpec đã lưu.
4. Đồng bộ màu gọng, màu tròng, độ trong suốt, vật liệu, đá, Charm và các lựa chọn liên quan giữa Studio 3D → AI Try-On → Snapshot → Cart → Checkout → Backend.

Repository: `D:\fe_nck22\lumina-eyewear`
Tài liệu yêu cầu chuẩn: `PRD_Lumina_Eyewear.md` phiên bản 5.1 cùng các tài liệu cập nhật mới nhất trong repository.

Đây là task nâng cấp dựa trên code hiện có, không phải tạo một dự án mới.

---

## 1. Xu hướng thiết kế gọng cần đưa vào dự án

Dùng các nhóm xu hướng năm 2026 làm định hướng thiết kế, không tuyên bố đây là bảng xếp hạng doanh số toàn thị trường. Các bài tổng hợp xu hướng năm 2026 nêu bật những nhóm như cat-eye kiến trúc, aviator/pilot hiện đại, oversized/bug-eye, gọng thể thao, kim loại mảnh, oversized square/rectangular, oval mảnh và geometric/hexagonal.

Nguồn tham khảo xu hướng:
- ELLE Vietnam, “5 xu hướng kính mát ‘chiếm sóng’ mùa Hè 2026”: https://www.elle.vn/xu-huong-thoi-trang/xu-huong-kinh-mat-mua-he-2026/
- Liên Sơn Optical, “Xu hướng kính mắt 2026”: https://www.liensonoptic.vn/blogs/news/xu-huong-kinh-mat-2026
- ELLE Canada, “The 2026 Eyewear Trends”: https://www.ellecanada.com/fashion/trends/2026-eyewear-trends
- 1-800 Contacts, “2026 Glasses Trends”: https://www.1800contacts.com/eyesociety/2026-glasses-trends

Bổ sung hoặc hoàn thiện các preset/design sau, dùng tên và ID ổn định:

### Giữ nguyên các model hiện có
- `aviator`
- `cateye`
- `round`
- `square`

### Bổ sung model/preset mới
- `modern-pilot`: Aviator/Pilot được tinh chỉnh tỷ lệ, có thể dùng cầu đôi/brow bar; vẫn phân biệt rõ với Aviator hiện có.
- `sculpted-cateye`: Cat-Eye góc đuôi sắc nét hơn, hình khối hiện đại.
- `oversized-square`: gọng vuông/rectangular bản acetate lớn, cạnh bo có chủ đích.
- `slim-oval`: gọng oval nhỏ gọn, ưu tiên profile kim loại mảnh.
- `geometric-hexagon`: gọng lục giác có cạnh và cầu kính cân đối.
- `bug-eye`: gọng oversize có vùng bao phủ lớn, nhưng không được phóng đại đến mức che kín khuôn mặt.
- Tùy năng lực triển khai có thể thêm `sport-shield` như preset kính râm riêng; không bắt buộc nếu làm ảnh hưởng chất lượng các model chính.

Không sao chép thiết kế độc quyền, logo hoặc hình dáng nhận diện riêng của thương hiệu kính có bản quyền. Tạo hình học nguyên bản theo mô tả phong cách chung.

### Màu sắc/vật liệu xu hướng
Ngoài Champagne Gold, Obsidian, Titanium Silver và Tortoiseshell đang có, có thể bổ sung preset màu trong suốt, amber/honey, burgundy hoặc xanh đậm nếu hệ thống dữ liệu và pricing hỗ trợ. Các lựa chọn mới phải có tên, mã màu/material rõ ràng và không làm mất các giá trị cũ.

---

## 2. Audit repository trước khi sửa

Đọc code và xác định implementation hiện tại của các file sau (tìm file tương đương nếu tên/path khác):

- `src/components/tryon/AIVirtualTryOn.jsx`
- `src/components/tryon/glassesRenderer.js`
- `src/utils/faceLandmarkAnalyzer.js`
- `src/pages/TryOnPage.jsx`
- `src/components/studio3d/ThreeDCustomizer.jsx`
- `src/components/studio3d/proceduralEyewear.js`
- `src/components/studio3d/ModelSelector.jsx`
- `src/context/CustomGlassesContext.jsx`
- `src/hooks/useCustomGlasses.js`
- `src/utils/pricingCalculator.js`
- `src/utils/watermarkHelper.js`
- `src/data/products.js` hoặc module Catalog thực tế
- `server/src/services/pricing.service.js`
- `server/src/validators/checkout.validator.js`
- `server/sql/schema.sql` và `server/sql/seed.sql`
- `src/pages/CartPage.jsx`, `src/pages/CheckoutPage.jsx`, API service liên quan

Ghi rõ renderer hiện tại là Canvas 2D, Three.js hay kết hợp. Kiểm tra cách MediaPipe trả landmarks/transformation matrices và cách mapping camera mirror, kích thước video, object-fit và canvas.

Trước khi sửa code, ghi lại test/build hiện tại nếu môi trường cho phép. Không xóa, reset database, ghi đè dữ liệu sản phẩm thật hoặc chạy seed phá huỷ dữ liệu.

---

## 3. Thiết kế trải nghiệm Try-On mới

Làm cho kính nhìn giống sản phẩm thật hơn, không chỉ là đường viền màu vàng phẳng như ảnh hiện tại.

### Yêu cầu hình ảnh
- Tạo gọng 3D có độ dày nhìn thấy được, mặt trước, cạnh gọng, cầu kính và càng kính khi góc nhìn cho phép.
- Tròng kính có màu và độ trong suốt đúng `lensColor` / `lensOpacity`; không được che kín mắt nếu opacity đang thấp.
- Ánh sáng và highlight kim loại có kiểm soát, tránh gọng phát sáng vàng quá mức hoặc giống nét vẽ.
- Tortoiseshell phải trông như acetate vân đồi mồi; titanium là kim loại mảnh; acetate có chiều dày hợp lý.
- Charm và rhinestones phải là geometry/chi tiết thực sự khi đang bật, không chỉ là icon đặt chồng trên ảnh.
- Tỷ lệ gọng so với khuôn mặt phải tự nhiên; cầu kính nằm trên sống mũi, gọng đi qua vùng mắt hợp lý.
- Không tạo bóng/occlusion giả đến mức khiến mắt hoặc khuôn mặt bị che bất thường.

### Phương án render
Ưu tiên **Three.js với transparent WebGL overlay** và `THREE.Group` cho mô hình kính, nếu có thể tích hợp ổn định vào kiến trúc hiện tại. Canvas kính cần căn chỉnh khớp với video hoặc ảnh chân dung bên dưới.

Nếu hệ thống đã có Three.js viewport và procedural model hoạt động tốt, hãy tái sử dụng geometry/material factory thay vì tạo lại logic từ đầu. Không để camera Try-On và Studio cùng chiếm một canvas/renderer; mỗi viewport có vòng đời riêng và dispose đúng cách.

Không được chỉ tạo một màn hình 3D quay kính riêng mà không gắn được mô hình kính vào khuôn mặt. Mục tiêu là **3D glasses overlay trên mặt trong Try-On**, không phải chỉ một product viewer độc lập.

Nếu không thể đạt tracking 3D đầy đủ bằng dữ liệu hiện có, triển khai theo từng mức:
1. Đầu tiên: model 3D có độ dày, gắn theo tâm hai mắt, scale và roll.
2. Tiếp theo: thêm yaw/pitch/pose dựa trên facial transformation matrix hoặc phương pháp hình học đã xác thực.
3. Báo cáo rõ giới hạn khi quay nghiêng; không giả vờ rằng mô hình bám chính xác ở mọi góc.

---

## 4. Tracking khuôn mặt và căn chỉnh model

Tiếp tục dùng `@mediapipe/tasks-vision` và Face Landmarker hiện có.

Yêu cầu:
- Dùng đúng chế độ `VIDEO` cho webcam và `IMAGE` cho ảnh tĩnh.
- Tái sử dụng detector đang chạy; đổi gọng/màu không được khởi tạo lại webcam hoặc model.
- Tính các điểm neo từ landmark thực tế; không hardcode vị trí gọng dựa trên một ảnh duy nhất.
- Map tọa độ landmark sang canvas theo đúng kích thước video/ảnh đang hiển thị, bao gồm mirror, object-fit `contain/cover`, letterbox và device pixel ratio.
- Tính chiều rộng gọng từ khoảng cách hai mắt với hệ số hiệu chỉnh rõ ràng; cho phép tinh chỉnh offset/scale để tránh kính quá nhỏ hoặc quá to.
- Làm mượt transform bằng Lerp/low-pass hoặc phương pháp tương đương để giảm rung, nhưng không gây độ trễ rõ rệt.
- Khi mất mặt, ẩn/fade model an toàn; không để kính lơ lửng tại tọa độ cũ vô hạn.
- Xử lý một mặt làm mục tiêu. Nếu ảnh có nhiều mặt, hiển thị thông báo/chọn vùng theo thiết kế hiện tại; không tự gắn kính vào khuôn mặt ngẫu nhiên.
- Với ảnh tĩnh, chỉ chạy inference khi người dùng tải/thay ảnh hoặc yêu cầu phân tích lại; không lặp inference liên tục như video.

MediaPipe cung cấp landmark; không được coi nó là một API tự sinh kính 3D. Phần geometry, material, transform và render là trách nhiệm của dự án.

---

## 5. Tái cấu trúc procedural 3D eyewear

Mở rộng `proceduralEyewear.js` hoặc module tương đương để các model cũ và mới dùng chung cơ chế dựng geometry.

Mỗi model cần có:
- Hai vòng gọng/tròng tương ứng.
- Cầu kính.
- Hai càng kính với bản lề hợp lý.
- Chiều dày gọng nhất quán theo style.
- Kích thước và khoảng cách mắt hợp lý.
- Pivot/origin nhất quán để dễ gắn lên khuôn mặt.
- Material riêng cho kim loại/acetate/tròng khi cần.
- Tùy chọn rhinestones và Charm không bị đặt sai vị trí khi đổi model.

Không bắt buộc phải dùng file `.glb`; có thể tiếp tục dùng procedural geometry nếu chưa có asset ngoài. Không dùng một hình phẳng chung cho tất cả model. Mỗi dáng phải có silhouette khác biệt rõ ràng ở cả Studio và Try-On.

Đảm bảo hàm tạo model trả về `THREE.Group` hoặc cấu trúc nhất quán, có metadata cần thiết cho cập nhật material và dispose. Tránh dispose texture/material dùng chung khi một model bị hủy nếu các instance khác còn sử dụng tài nguyên đó.

---

## 6. Đồng bộ model mới xuyên suốt toàn hệ thống

Đây là yêu cầu trọng yếu. Việc thêm model không chỉ sửa danh sách trên UI.

Cập nhật nhất quán những phần liên quan:
- `ModelSelector.jsx`
- `proceduralEyewear.js`
- `ThreeDCustomizer.jsx`
- renderer cho Try-On 3D
- `CustomGlassesContext` / `designSpec`
- `pricingCalculator.js`
- Backend `pricing.service.js`
- Backend `checkout.validator.js` hoặc allowlist model tương ứng
- Snapshot/watermark và Cart item
- Product/Catalog data nếu model mới được bán như sản phẩm thật
- Seed/migration chỉ khi thật sự cần và có phương án không ghi đè dữ liệu hiện hữu

Giữ nguyên các ID legacy `aviator`, `cateye`, `round`, `square` để dữ liệu thiết kế/đơn hàng cũ vẫn đọc được.

Với ID mới, cập nhật allowlist ở Frontend và Backend. Không chấp nhận model lạ tùy ý gửi lên Checkout.

### Quy tắc giá
- Không tự tạo giá mâu thuẫn giữa Frontend và Backend.
- Mỗi kiểu gọng mới phải có giá demo rõ ràng trong `pricingCalculator.js` và phép tính tương ứng ở Backend.
- Backend vẫn là nguồn thẩm quyền cuối cùng khi tạo đơn; không tin `customPrice` do Client gửi.
- Nếu chưa thể quyết định giá một model mới, ghi rõ đó là giá demo cần xác nhận và giữ cùng một giá trị ở Frontend/Backend.
- Không thay đổi giá lịch sử của đơn hàng đã tạo.

### Catalog và tồn kho
Nếu thêm các mẫu mới vào Catalog bán hàng, không chỉ thêm card với ID giả rồi hiển thị như sản phẩm có sẵn trong MySQL.
- Kiểm tra cơ chế ánh xạ MockAPI ↔ MySQL hiện tại.
- Nếu cần thêm sản phẩm bán thật, cung cấp seed hoặc migration có ID ổn định, nhưng không chạy lệnh phá huỷ dữ liệu.
- Nếu chỉ là mẫu/preset trong Studio, ghi rõ đó là style preset, không tự động coi như SKU bán hàng hoặc có tồn kho.

---

## 7. UI/UX cập nhật danh mục mẫu gọng

Trong Studio 3D và Try-On, tạo một khu vực chọn style rõ ràng:
- Classic: Aviator, Cat-Eye, Round, Square.
- Trending 2026: Modern Pilot, Sculpted Cat-Eye, Oversized Square, Slim Oval, Geometric Hexagon, Bug-Eye.

Có thể dùng tabs, chip hoặc filter `Classic / Trending 2026`. Không làm panel quá chật.

Mỗi kiểu gọng phải có thumbnail/silhouette riêng, tên, mô tả ngắn và trạng thái đang chọn. Không dùng cùng một icon hoặc cùng một hình đại diện cho mọi model.

Khi chọn model:
- 3D Studio cập nhật đúng geometry.
- Try-On cập nhật đúng gọng 3D trên mặt.
- Summary/price cập nhật đúng.
- DesignSpec dùng ID tương ứng.
- Khi quay lại trang hoặc tải lại nếu dữ liệu đang được lưu theo kiến trúc hiện tại, model không bị reset ngoài ý muốn.

Không đưa các xu hướng vào danh mục theo cách gợi ý rằng mọi kiểu đều hợp với mọi khuôn mặt. Dùng AI Face Stylist như bộ lọc/gợi ý mềm và luôn cho người dùng tự chọn.

---

## 8. Hiệu năng và vòng đời tài nguyên

- Dùng một renderer cho mỗi viewport, không khởi tạo lại mỗi lần đổi model/màu.
- Dọn `requestAnimationFrame`, resize observer, event listener, MediaStream tracks và detector khi unmount.
- Dispose geometry/material/texture an toàn.
- Xử lý `webglcontextlost` / lỗi WebGL nếu có thể.
- Chỉ tạo hoặc thay model khi `baseModel` đổi; chỉ cập nhật material khi màu/chất liệu đổi.
- Hạn chế draw call quá nhiều khi bật nhiều đá; có thể dùng geometry instancing hoặc cách tối ưu phù hợp.
- Không chạy cả renderer Studio 3D và một animation loop không cần thiết ở trang Try-On.
- Không yêu cầu FPS cố định nếu chưa đo trong môi trường thực tế.
- Với ảnh lớn, tạo preview kích thước hợp lý để phân tích và render, nhưng không ghi đè file gốc trên thiết bị.
- Tôn trọng `prefers-reduced-motion` cho auto-rotate hoặc UI animation.

---

## 9. Quyền riêng tư và xử lý ảnh

- Camera chỉ bật sau thao tác người dùng.
- Ảnh chân dung được xử lý cục bộ trong trình duyệt mặc định.
- Không upload khuôn mặt lên Backend, không lưu vào localStorage và không gửi sang dịch vụ AI ngoài nếu không có yêu cầu và thông báo phù hợp.
- Có nút dừng camera, thay ảnh và xóa ảnh.
- Dừng camera và giải phóng tài nguyên khi rời trang.
- Thông báo rõ khi ảnh không đọc được hoặc không tìm thấy khuôn mặt.

---

## 10. Kiểm thử bắt buộc

Chạy và ghi kết quả thật cho các trường hợp:

1. Các kiểu gọng cũ `aviator`, `cateye`, `round`, `square` vẫn hoạt động.
2. Từng model mới hiển thị silhouette 3D khác nhau.
3. Gọng 3D nằm đúng vùng hai mắt trên webcam chính diện.
4. Overlay ổn định khi quay đầu nhẹ, cúi/ngẩng và di chuyển trong khung hình.
5. Khi mặt mất khỏi khung hình, kính được ẩn hoặc chuyển trạng thái hợp lý.
6. Tải ảnh chân dung (nếu chức năng có) cho kết quả overlay đúng vị trí khi ảnh `contain/cover`, ảnh mirror và ảnh có nhiều tỷ lệ khung hình.
7. Đổi model và màu không khởi tạo lại camera hoặc detector.
8. Màu gọng, lens opacity, Rhinestones và Charm đồng bộ từ Studio sang Try-On.
9. Thêm model vào designSpec không làm hỏng Cart, Snapshot, Checkout hoặc backend validation.
10. Giá Frontend và Backend giống nhau cho tất cả model mới.
11. Model không hợp lệ bị Backend từ chối khi Checkout.
12. Rời trang dừng camera và animation loop.
13. Không phát sinh console error nghiêm trọng.
14. Chạy test backend hiện có.
15. Chạy `npm run build` ở Frontend và sửa các lỗi phát sinh do thay đổi.

Nếu không có webcam thật, ghi rõ trường hợp camera chưa được kiểm tra trực tiếp; không coi mannequin/demo preview là kiểm thử tracking webcam thật.

---

## 11. Quy trình thực hiện

1. Audit code và ghi lại kiến trúc hiện tại.
2. Xác định khác biệt giữa renderer 2D hiện tại và mục tiêu overlay 3D.
3. Triển khai một model 3D đầu tiên và xác minh tracking hoạt động trước.
4. Mở rộng geometry và các style còn lại.
5. Cập nhật selector, designSpec, pricing, backend allowlist và dữ liệu Catalog nếu cần.
6. Kiểm tra cả webcam, ảnh tĩnh, Studio, Cart và Checkout.
7. Chạy toàn bộ test và build.
8. Ghi báo cáo nghiệm thu, gồm file đã sửa, mẫu gọng mới, cách tracking được thực hiện, kết quả test và giới hạn còn lại.

Không dừng ở việc chỉ thay màu đường viền vàng thành màu khác. Mục tiêu là tạo trải nghiệm kính 3D có chiều sâu và gắn được với khuôn mặt.

Không xóa tính năng đang hoạt động, không thay đổi API ngoài phạm vi cần thiết và không tuyên bố hoàn thành những gì chưa được kiểm thử.

Sau khi hoàn thành, dừng lại và chờ nghiệm thu.
