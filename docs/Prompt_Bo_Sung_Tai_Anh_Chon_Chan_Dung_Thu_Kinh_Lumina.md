# PROMPT TRIỂN KHAI — TẢI ẢNH CHÂN DUNG ĐỂ THỬ KÍNH

## Dự án Lumina Eyewear · React + Vite · MediaPipe Face Landmarker

Bạn là Senior Frontend Engineer chuyên React, MediaPipe Face Landmarker, Canvas 2D và trải nghiệm thử kính AR. Hãy bổ sung chức năng **tải ảnh chân dung cá nhân để thử kính** vào module AI Virtual Try-On hiện có của Lumina Eyewear.

Thư mục dự án:

`D:\fe_nck22\lumina-eyewear`

Tài liệu chuẩn: `PRD_Lumina_Eyewear.md` phiên bản 5.1.

## 1. Mục tiêu

Hiện trang `/try-on` đã có chế độ webcam và/hoặc thử chân dung mẫu. Hãy bổ sung một phương thức thứ hai cho phép người dùng chọn ảnh từ thiết bị, sau đó phát hiện khuôn mặt và vẽ mẫu kính đang thiết kế lên ảnh đó.

Người dùng phải có thể:

1. Chuyển giữa **Camera trực tiếp** và **Tải ảnh chân dung**.
2. Chọn ảnh từ máy tính hoặc điện thoại bằng nút tải ảnh; hỗ trợ kéo-thả nếu phù hợp với UI hiện có.
3. Xem trước ảnh đã chọn.
4. Chạy MediaPipe Face Landmarker trên ảnh tĩnh và hiển thị kính ảo căn theo khuôn mặt.
5. Thay đổi kiểu gọng/màu sắc/phụ kiện trong `CustomGlassesContext` và thấy overlay cập nhật trên cùng ảnh mà không phải tải ảnh lại.
6. Thay ảnh, xóa ảnh hoặc quay lại chế độ webcam.
7. Nhận thông báo rõ ràng nếu file không hợp lệ hoặc không phát hiện khuôn mặt.

Đây là chức năng bổ sung cho ảnh tĩnh, không phải thay thế webcam. Giữ nguyên các chức năng AI Try-On đang hoạt động.

## 2. Audit code trước khi sửa

Đọc PRD và kiểm tra các file thực tế, tối thiểu:

- `src/pages/TryOnPage.jsx`
- `src/components/tryon/AIVirtualTryOn.jsx`
- `src/components/tryon/FaceStylistPanel.jsx`
- `src/components/tryon/glassesRenderer.js`
- `src/utils/faceLandmarkAnalyzer.js`
- `src/context/CustomGlassesContext.jsx`
- `src/hooks/useCustomGlasses.js`
- `src/utils/validators.js`
- `package.json` và `package-lock.json`

Nếu đường dẫn khác, hãy tìm component tương đương.

**Không** tạo một dự án mới, không thay thế MediaPipe bằng ảnh kính tĩnh, không xóa chế độ webcam, không đổi schema `designSpec`, không viết lại các module đã hoạt động nếu không cần thiết. Ưu tiên bổ sung vào cấu trúc hiện có và tái sử dụng analyzer/renderer hiện tại.

## 3. UI/UX

Trong trang `/try-on`, tạo lựa chọn phương thức dễ hiểu, thống nhất Design System Lumina Eyewear:

- `Camera trực tiếp`
- `Tải ảnh chân dung`

Ở chế độ tải ảnh, hiển thị khu vực upload có icon ảnh, hướng dẫn ngắn và nút `Chọn ảnh`. Cho phép kéo-thả nếu việc này không gây xung đột với các thao tác khác.

Dùng giao diện đồng bộ với màu sắc hiện tại:

- Ivory `#FAF8F5`
- Obsidian `#141413`
- Studio Dark `#0D0D0D`
- Champagne `#D4AF37`

Sau khi chọn ảnh, hiển thị ảnh trong vùng xem trước với các điều khiển:

- `Đổi ảnh`
- `Xóa ảnh`
- Trạng thái nhận diện khuôn mặt
- Nút hoặc trạng thái thử kính nếu cần

Không để khu vực upload che overlay kính, HUD hay các điều khiển chính. Bố cục phải responsive trên desktop, tablet và mobile.

## 4. Loại file và an toàn dữ liệu

Hỗ trợ các định dạng ảnh thông dụng:

- JPEG/JPG
- PNG
- WebP

Dùng `accept="image/jpeg,image/png,image/webp"` cho input file và kiểm tra lại MIME type ở JavaScript; không chỉ tin vào phần mở rộng.

Đặt giới hạn file phù hợp, mặc định tối đa 10 MB. Giới hạn này có thể được điều chỉnh theo kiến trúc hiện tại.

Kiểm tra:

- File rỗng hoặc không phải ảnh.
- Ảnh không tải/giải mã được.
- Ảnh quá lớn theo giới hạn đã cấu hình.
- Kích thước ảnh không hợp lệ.
- Người dùng chọn lại chính ảnh hiện tại.

Không gửi ảnh chân dung lên Backend, không lưu ảnh vào `localStorage` và không gửi ảnh tới bên thứ ba. Xử lý cục bộ trong trình duyệt bằng object URL hoặc cơ chế tương đương. Khi thay ảnh, xóa ảnh hoặc unmount component, thu hồi `URL.createObjectURL()` bằng `URL.revokeObjectURL()` đúng lúc.

Không log nội dung ảnh hay dữ liệu riêng tư vào console.

## 5. Chạy MediaPipe với ảnh tĩnh

Dùng `FaceLandmarker` hiện có, không khởi tạo detector mới cho mỗi lần render.

Với ảnh tĩnh, dùng API phù hợp cho ảnh như `landmarker.detect(imageElement)` (hoặc API tương thích với phiên bản thư viện thực tế), không gọi `detectForVideo()` như luồng webcam.

Quy trình mong muốn:

1. Người dùng chọn file.
2. Trình duyệt giải mã và hiển thị ảnh.
3. Khi ảnh đã sẵn sàng, truyền ảnh vào MediaPipe để nhận diện landmark.
4. Lưu kết quả landmark cho ảnh hiện tại trong state/ref phù hợp.
5. Vẽ ảnh gốc và overlay kính lên canvas hoặc lớp render hiện có.
6. Khi thay `designSpec`, vẽ lại overlay từ landmark đã lưu; không cần chạy nhận diện lại hoặc tải lại ảnh nếu không cần.
7. Khi chọn ảnh mới, chạy nhận diện lại cho ảnh mới.

Bảo đảm dùng cùng một hệ tọa độ cho ảnh và overlay. Không kéo méo ảnh để khớp canvas. Giữ đúng tỷ lệ khung hình khi resize bằng `object-fit: contain` hoặc phép tính scale/offset tương đương. Overlay phải dùng cùng scale và offset của ảnh sau khi hiển thị.

Nếu giao diện đang mirror ảnh ở chế độ webcam, **không tự động mirror ảnh tải lên** trừ khi có lựa chọn rõ ràng của người dùng. Tránh hiện tượng kính lệch mắt do áp dụng nhầm phép biến đổi gương.

Nếu ảnh có nhiều khuôn mặt nhưng cấu hình chỉ hỗ trợ một khuôn mặt, hãy chọn khuôn mặt chính theo logic rõ ràng (ví dụ khuôn mặt lớn nhất/ở gần trung tâm) hoặc thông báo người dùng tải ảnh chân dung có một người. Không âm thầm gắn kính lên khuôn mặt sai.

## 6. Vẽ kính trên ảnh chân dung

Tái sử dụng `faceLandmarkAnalyzer.js` và `glassesRenderer.js` nếu tương thích.

Overlay cần đồng bộ với `designSpec` hiện tại, bao gồm các thuộc tính có trong schema:

- `baseModel`
- `frameColor`
- `lensColor`
- `lensOpacity`
- `hasRhinestones`
- `charms`
- `engravingText`
- các thuộc tính vật liệu liên quan

Khi người dùng thay gọng, màu, độ trong suốt, đá hoặc Charm trong Studio/điều khiển Try-On, overlay trên ảnh tĩnh phải cập nhật. Không chỉ vẽ một hình chữ nhật tượng trưng cho kính; phải dùng renderer kính hiện có để vẽ đúng silhouette và các chi tiết được hỗ trợ.

Vì ảnh tĩnh không có chuyển động đầu, không cần animation tracking liên tục. Ưu tiên hình ảnh ổn định, căn chỉnh đúng và tiết kiệm tài nguyên.

Không khẳng định overlay 2D có hiệu ứng khúc xạ, phối cảnh hoặc bóng đổ giống hoàn toàn mô hình Three.js 3D nếu renderer không hỗ trợ.

## 7. Trạng thái và thông báo

Phải có trạng thái:

- Chưa chọn ảnh.
- Đang tải/giải mã ảnh.
- Đang nhận diện khuôn mặt.
- Đã nhận diện và đang thử kính.
- Không tìm thấy khuôn mặt.
- Có nhiều khuôn mặt hoặc ảnh không phù hợp (nếu phát hiện được).
- File không hợp lệ/quá lớn.
- Không tải được model hoặc detector chưa sẵn sàng.
- Có lỗi render overlay.

Khi không tìm thấy khuôn mặt:

- Không hiển thị kính ở vị trí đoán mò.
- Xóa overlay cũ hoặc không cho ảnh trước còn sót lại.
- Hiển thị thông báo thân thiện, ví dụ: `Không phát hiện được khuôn mặt. Hãy chọn ảnh chân dung rõ mặt, đủ sáng và nhìn gần về phía camera.`
- Cho phép thử lại hoặc đổi ảnh.

Khi đổi ảnh hoặc xóa ảnh, bảo đảm overlay từ ảnh cũ không còn được hiển thị.

## 8. Tích hợp với webcam và lifecycle

Giữ nguyên chế độ webcam hiện tại. Khi chuyển từ webcam sang ảnh tĩnh:

- Dừng webcam nếu kiến trúc hiện tại coi hai chế độ là loại trừ nhau.
- Gọi `MediaStreamTrack.stop()` và gỡ `video.srcObject`.
- Hủy animation frame của luồng video.
- Không đóng detector nếu ảnh tĩnh sẽ tiếp tục dùng cùng detector và lifecycle cho phép tái sử dụng.

Khi chuyển từ ảnh tĩnh sang webcam:

- Không giữ ảnh cũ phủ lên camera.
- Chạy đúng pipeline `detectForVideo()` cho luồng video.
- Không tạo hai vòng lặp xử lý đồng thời.

Khi unmount:

- Thu hồi object URL của ảnh.
- Dừng camera nếu đang hoạt động.
- Hủy animation frame, timer và listener do component tạo.
- Đóng detector đúng một lần khi component/provider sở hữu detector kết thúc vòng đời.

Chú ý React Strict Mode trong môi trường development để tránh tạo hai camera stream hoặc hai detector ngoài ý muốn.

## 9. Tích hợp với các module hiện có

- Đọc cấu hình từ `CustomGlassesContext`/`useCustomGlasses` hiện tại.
- Không đổi schema `designSpec`.
- Không phá `FaceStylistPanel` hay danh sách Catalog phù hợp.
- Không phá Auth Guard và hành vi thêm vào giỏ.
- Không tự lưu ảnh chân dung upload vào `CartContext` hoặc gửi ảnh đó lên Backend.
- Nếu người dùng chủ động xuất Snapshot thiết kế, chỉ làm theo flow Snapshot hiện có; phân biệt Snapshot kính thiết kế với ảnh chân dung riêng tư.
- Nếu có nút `Thêm mẫu đang thử vào giỏ`, giữ nguyên RBAC và dữ liệu sản phẩm; không đưa ảnh chân dung người dùng vào đơn hàng mặc định.

## 10. Kiểm thử nghiệm thu

Thực hiện kiểm tra thực tế các tình huống sau:

1. Mở `/try-on`, chế độ mặc định không tự bật camera.
2. Chọn JPG hợp lệ và phát hiện được khuôn mặt.
3. Chọn PNG và WebP hợp lệ.
4. Chọn file không phải ảnh, file rỗng và ảnh vượt giới hạn; hệ thống từ chối bằng thông báo dễ hiểu.
5. Chọn ảnh không có khuôn mặt; không hiển thị overlay sai.
6. Chọn ảnh mới sau khi ảnh cũ đã được nhận diện; overlay cũ phải được xóa.
7. Đổi model gọng/màu/tròng/Charm; overlay trên ảnh tĩnh cập nhật đúng mà không yêu cầu chọn lại ảnh.
8. Chuyển từ ảnh tĩnh sang webcam và ngược lại; không xuất hiện hai loop hoặc overlay chồng lẫn.
9. Xóa ảnh và unmount; object URL được thu hồi, không còn ảnh cũ.
10. Xác nhận ảnh chân dung không được gửi lên Backend hoặc lưu vào localStorage.
11. Kiểm thử responsive cho desktop và mobile.
12. Chạy các test hiện có và `npm run build`.

Chỉ báo ĐẠT nếu đã thực sự chạy và xác minh. Nếu không thể kiểm tra webcam hoặc một định dạng file trong môi trường hiện tại, ghi rõ chưa kiểm tra.

## 11. Báo cáo kết quả

Khi hoàn thành, báo cáo:

- File đã tạo/sửa.
- Cách chuyển giữa webcam và ảnh tải lên.
- Cách MediaPipe nhận diện ảnh tĩnh.
- Cách overlay đồng bộ với `designSpec`.
- Các test đã chạy và kết quả.
- Giới hạn còn tồn tại.

Chỉ thực hiện chức năng tải ảnh chân dung để thử kính. Không triển khai lại toàn bộ module AI, không thay đổi API/Backend và không tự triển khai thêm tính năng ngoài phạm vi.
