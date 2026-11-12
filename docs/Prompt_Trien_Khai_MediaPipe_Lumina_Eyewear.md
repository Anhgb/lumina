# PROMPT TRIỂN KHAI & HOÀN THIỆN GOOGLE MEDIAPIPE FACE LANDMARKER — LUMINA EYEWEAR

**Dự án:** Lumina Eyewear — AI Virtual Try-On & Face Stylist  
**Tài liệu chuẩn:** `PRD_Lumina_Eyewear.md`, phiên bản 5.1  
**Thư mục dự án:** `D:\fe_nck22\lumina-eyewear`  
**Mục tiêu:** Rà soát, hoàn thiện và kiểm thử tính năng thử kính ảo sử dụng Google MediaPipe Face Landmarker trong ứng dụng React + Vite hiện có.

> **Cách sử dụng:** Mở đúng repository Lumina Eyewear trong Antigravity hoặc Codex, sau đó cung cấp toàn bộ nội dung file này. Agent phải sửa trực tiếp code trong repository hiện có, không chỉ tạo hướng dẫn hay bản demo độc lập.

---

## 1. Vai trò và phạm vi công việc

Bạn là Senior Frontend Engineer chuyên React, Google MediaPipe Face Landmarker, Computer Vision, Canvas 2D và Three.js. Hãy làm việc theo PRD chính thức phiên bản 5.1 và mã nguồn thực tế hiện có.

Mục tiêu là làm cho tính năng **AI Virtual Try-On & Face Stylist** hoạt động ổn định, dễ sử dụng và đồng bộ với Studio 3D, giỏ hàng của Lumina Eyewear.

Báo cáo trước đây cho biết dự án đã có các thành phần sau; hãy xác minh chúng thực sự tồn tại và đang được sử dụng trước khi chỉnh sửa:

- `src/components/tryon/AIVirtualTryOn.jsx`
- `src/utils/faceLandmarkAnalyzer.js`
- `src/components/tryon/glassesRenderer.js`
- `src/components/tryon/FaceStylistPanel.jsx`
- `src/pages/TryOnPage.jsx`
- `src/context/CustomGlassesContext.jsx`
- `src/hooks/useCustomGlasses.js`
- `src/api/configService.js`
- `src/data/products.js`
- `src/utils/validators.js`

Đường dẫn trên là danh sách dự kiến, không được mặc định rằng mọi file đều tồn tại. Nếu repository sử dụng tên hoặc kiến trúc khác, hãy tái sử dụng các module tương đương.

### Không được làm

1. Không tạo lại dự án React + Vite hoặc tạo thư mục dự án lồng bên trong.
2. Không viết lại từ đầu module đang hoạt động nếu có thể sửa phần thiếu.
3. Không thay thế MediaPipe bằng hình ảnh tĩnh hoặc overlay giả.
4. Không đổi schema `designSpec`, key localStorage, API hoặc quy tắc RBAC chỉ để tiện triển khai.
5. Không xóa hoặc làm hỏng Studio 3D, `CustomGlassesContext`, `CartContext`, Auth Guard hay Checkout.
6. Không lưu hình ảnh webcam hoặc dữ liệu khuôn mặt nếu chưa có yêu cầu và sự đồng ý rõ ràng.
7. Không tuyên bố đạt FPS, độ chính xác nhận diện hoặc độ chính xác PD nếu chưa có phép đo đáng tin cậy.
8. Không dùng dữ liệu fallback để che lỗi; phải phân biệt trạng thái fallback với dữ liệu API thật.
9. Không đưa API key, database credentials hoặc JWT secret vào mã Frontend hay biến môi trường `VITE_*`.
10. Không chuyển sang các tính năng thanh toán hoặc Admin ngoài phạm vi công việc này.

Trước khi chỉnh sửa, kiểm tra Git status và các file liên quan. Không reset Git, commit hoặc push code.

---

## 2. Kiểm tra dependency và tài nguyên MediaPipe

### 2.1 Kiểm tra hiện trạng

Tại thư mục gốc, kiểm tra:

```powershell
cd D:\fe_nck22\lumina-eyewear
npm ls @mediapipe/tasks-vision
```

Đọc `package.json` và `package-lock.json` để xác định phiên bản đã cài. Chỉ cài hoặc thay đổi dependency nếu thiếu hoặc có bằng chứng phiên bản hiện tại gây lỗi.

Nếu thư viện chưa được cài, dùng:

```powershell
npm install @mediapipe/tasks-vision
```

Không nâng cấp hàng loạt dependency không liên quan.

### 2.2 WASM và model

Dùng phiên bản WASM tương thích với phiên bản `@mediapipe/tasks-vision` đã cài. Ví dụ với phiên bản 0.10.14:

```text
WASM:
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm

Face Landmarker model:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

Không để URL WASM trỏ tới một phiên bản khác với thư viện npm đang chạy. Kiểm tra tài nguyên có tải được trong trình duyệt và xử lý lỗi mạng/model rõ ràng.

Nếu muốn đóng gói WASM/model cục bộ thay vì CDN, hãy đề xuất cách thực hiện riêng và chỉ thay đổi khi phù hợp với cấu trúc repository. Không tải tài nguyên về hoặc tạo file nhị phân nếu môi trường không hỗ trợ việc đó.

### 2.3 Điều kiện camera

Camera trình duyệt phải được bật sau hành động chủ động của người dùng. `localhost` được xem là secure context cho mục tiêu phát triển; môi trường triển khai công khai cần HTTPS.

Xử lý tối thiểu các lỗi:

- `NotAllowedError`: người dùng từ chối quyền camera.
- `NotFoundError`: không tìm thấy thiết bị camera.
- `NotReadableError`: camera đang bị ứng dụng khác sử dụng hoặc không thể mở.
- Lỗi tải WASM/model, GPU hoặc detector.

Giao diện phải có hướng dẫn khắc phục và nút thử lại khi phù hợp.

---

## 3. Khởi tạo Face Landmarker đúng cách

Kiểm tra code hiện có trước khi bổ sung logic. Nếu cần xây dựng hoặc sửa hàm khởi tạo, dùng API tương ứng với phiên bản thư viện thực tế:

```js
import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);

  const options = {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  };

  try {
    return await FaceLandmarker.createFromOptions(vision, options);
  } catch (gpuError) {
    // Chỉ fallback sang CPU khi khởi tạo GPU thất bại.
    return await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU',
      },
    });
  }
}
```

Đây là mẫu tham khảo. Nếu phiên bản thư viện hiện tại có khác biệt API, hãy tuân thủ API trong phiên bản đã cài. Fallback CPU không thể khắc phục lỗi URL WASM hoặc model không tải được; hãy log nguyên nhân ban đầu để chẩn đoán.

Yêu cầu:

- Detector được tạo một lần cho một phiên hoạt động, không khởi tạo lại theo mỗi lần React render.
- Dùng `runningMode: 'VIDEO'` khi phân tích webcam.
- Không tạo nhiều detector hoặc vòng lặp frame đồng thời.
- Duy trì trạng thái khởi tạo, sẵn sàng, lỗi và dừng riêng biệt.
- Tránh cập nhật React state ở tần suất mỗi frame nếu không cần thiết; dùng `useRef` cho dữ liệu chuyển động tần suất cao.

---

## 4. Webcam và vòng lặp xử lý frame

Sử dụng `useRef` để giữ những tài nguyên tồn tại qua các lần render:

- `videoRef`
- `streamRef`
- `landmarkerRef`
- `animationRef`
- `lastVideoTimeRef`
- `designSpecRef` hoặc cơ chế tương đương để đọc cấu hình thiết kế mới mà không khởi tạo lại detector.

Luồng phải thực hiện như sau:

1. Người dùng bấm nút bật camera.
2. Gọi `navigator.mediaDevices.getUserMedia()` với `audio: false`.
3. Gắn stream vào video element và chờ video phát.
4. Khởi tạo detector nếu chưa có.
5. Xử lý frame mới bằng `detectForVideo(video, timestamp)` theo API hiện tại.
6. Lấy `result.faceLandmarks?.[0]` nếu có mặt.
7. Gọi analyzer và renderer hiện có.
8. Nếu không thấy mặt, hiển thị trạng thái tìm khuôn mặt và xóa overlay cũ phù hợp.
9. Lặp lại khi camera còn hoạt động.

Ví dụ xử lý frame tham khảo:

```js
function processFrame() {
  const video = videoRef.current;
  const landmarker = landmarkerRef.current;

  if (!video || !landmarker || video.readyState < 2) {
    return;
  }

  if (video.currentTime !== lastVideoTimeRef.current) {
    const result = landmarker.detectForVideo(
      video,
      performance.now(),
    );

    const landmarks = result.faceLandmarks?.[0];

    if (landmarks) {
      updateTryOn(landmarks); // Thay bằng hàm thật trong repository.
    } else {
      clearGlassesOverlay(); // Thay bằng hàm thật trong repository.
    }

    lastVideoTimeRef.current = video.currentTime;
  }

  animationRef.current = requestAnimationFrame(processFrame);
}
```

Không chép nguyên mẫu này nếu các hàm tương đương đã có. Phải bảo đảm `requestAnimationFrame` chỉ được lên lịch một lần cho mỗi vòng lặp và không chạy tiếp sau khi dừng camera.

### Hiệu năng

`detectForVideo()` có thể chạy đồng bộ và chặn main thread. Hãy xử lý frame mới, tránh tính toán trùng, và không cập nhật toàn bộ cây React ở 30–60 lần mỗi giây. Nếu quan sát thấy giật lag đáng kể, báo rõ bằng chứng và đề xuất Web Worker hoặc chiến lược giảm tần suất xử lý; không thêm kiến trúc phức tạp khi chưa cần.

---

## 5. Phân tích landmark và phân loại dáng mặt

Tái sử dụng `src/utils/faceLandmarkAnalyzer.js` nếu tồn tại.

Hệ thống phải hỗ trợ năm nhóm theo PRD:

- `Round` — mặt tròn.
- `Square` — mặt vuông.
- `Oval` — mặt trái xoan.
- `Heart` — mặt trái tim.
- `Diamond` — mặt kim cương.

Yêu cầu:

1. Đo tỷ lệ hình học từ các landmark phù hợp cho chiều dài mặt, độ rộng gò má và độ rộng hàm.
2. Chuẩn hóa tọa độ khi tính tỷ lệ; tránh dùng tọa độ pixel thô nếu canvas/video có tỷ lệ khác nhau.
3. Làm mượt kết quả qua nhiều frame để tránh đổi dáng mặt liên tục.
4. Nếu thiếu landmark, landmark không hợp lệ hoặc góc mặt không thuận lợi, hiển thị `Chưa xác định` và cho phép quét lại.
5. Ghi rõ đây là bộ phân loại Rule-based phục vụ gợi ý phong cách, không phải chẩn đoán y khoa.
6. Không khẳng định độ chính xác phân loại tuyệt đối nếu chưa có bộ dữ liệu đánh giá.

Dùng danh sách chỉ số landmark theo topology và phiên bản model thực tế. Không giả định chỉ số dùng cho tâm mắt, con ngươi hoặc đường hàm là chính xác nếu chưa kiểm tra kết quả trên video.

---

## 6. Định vị và render gọng kính

Tái sử dụng `src/components/tryon/glassesRenderer.js` hoặc module render tương đương.

Sử dụng thông tin landmark để xác định:

- Tâm và vị trí tương đối của hai mắt.
- Khoảng cách giữa hai mắt để ước tính chiều rộng gọng.
- Góc nghiêng đầu trong mặt phẳng ảnh.
- Độ dịch chuyển qua các frame và mức nội suy giảm rung.

Canvas 2D có thể dùng tọa độ chuẩn hóa:

```js
const x = landmark.x * canvas.width;
const y = landmark.y * canvas.height;
```

Đảm bảo tọa độ được tính theo kích thước nội tại của canvas/video, không chỉ theo kích thước CSS. Nếu video được mirror cho selfie, phải áp dụng cùng quy tắc phản chiếu cho overlay; không phản chiếu hai lần.

Renderer phải hỗ trợ các thuộc tính đã có trong `designSpec`, tối thiểu:

- `baseModel`
- `frameColor`
- `lensColor`
- `lensOpacity`
- `hasRhinestones`
- `charms`
- `engravingText`
- Các thuộc tính vật liệu liên quan nếu schema hiện tại có.

Hỗ trợ đủ bốn hình dạng gọng: Aviator, Cat-Eye, Round và Square. Khi thay đổi cấu hình, cập nhật renderer mà không khởi tạo lại webcam hoặc detector.

Không tuyên bố Canvas 2D có chất lượng vật liệu hoặc bóng đổ giống hoàn toàn Three.js PBR. Báo cáo rõ khác biệt hình ảnh giữa Studio 3D và webcam overlay.

---

## 7. Đồng bộ với CustomGlassesContext

Rà soát và tái sử dụng:

- `src/context/CustomGlassesContext.jsx`
- `src/hooks/useCustomGlasses.js`
- `src/pages/StudioPage.jsx`
- `src/pages/TryOnPage.jsx`
- `src/components/tryon/AIVirtualTryOn.jsx`

Các bước bắt buộc:

1. Thay đổi tùy chọn trong `/studio-3d` cập nhật `designSpec` hiện có.
2. Điều hướng sang `/try-on` vẫn giữ nguyên cấu hình.
3. Overlay dùng cấu hình hiện tại, không dùng một bản hardcode khác.
4. Thay màu, kiểu gọng, Charm hoặc Rhinestones khi webcam đang chạy không được khởi tạo lại detector.
5. Nếu người dùng quay lại Studio và chỉnh sửa, cấu hình mới phải hiển thị khi trở lại Try-On.
6. Không đổi tên field hoặc tạo schema song song không tương thích.

---

## 8. Face Stylist và dữ liệu gợi ý

Rà soát `src/components/tryon/FaceStylistPanel.jsx`, `src/api/configService.js` và dữ liệu `src/data/products.js`.

- Lấy `ai_face_rules` từ Postman Mock Server nếu URL đã cấu hình.
- Khi request thất bại, dùng fallback local tương thích và thể hiện đây là dữ liệu dự phòng.
- Gợi ý kính dựa trên `recommendedFaces` và dữ liệu sản phẩm thực tế hiện có.
- Tông da hoặc mục đích sử dụng chỉ được dùng khi người dùng chọn/cung cấp hoặc dữ liệu thực tế có tồn tại.
- Không dựng lời khuyên dựa trên thông tin chưa được cung cấp.
- Các nút “Ướm thử ngay” phải chuyển mẫu được chọn vào cấu hình hoặc luồng phù hợp hiện có.

Không cần Gemini API Key để chạy Face Landmarker và bộ gợi ý Rule-based. Chỉ triển khai Gemini khi dự án có yêu cầu rõ ràng và có Backend proxy bảo vệ khóa bí mật.

---

## 9. Ước lượng PD và kiểm tra đơn kính

Nếu ứng dụng đang hiển thị PD từ webcam:

- Ghi rõ đây là giá trị tham khảo, không thay thế phép đo chuyên môn.
- Không chuyển tọa độ pixel thành milimét nếu chưa hiệu chuẩn camera và khoảng cách tới khuôn mặt.
- Không khẳng định PD lấy từ landmark là số đo vật lý chính xác chỉ dựa vào tỷ lệ mắt.
- Cho phép người dùng nhập hoặc xác nhận số đo.
- Dùng `validators.js` hiện có để kiểm tra dữ liệu trước Checkout và bảo đảm Backend xác thực lại.
- Không lưu hoặc truyền đơn thuốc ngoài mục đích chức năng đã được người dùng đồng ý.

---

## 10. Quyền riêng tư và cleanup tài nguyên

Đây là tiêu chí bắt buộc.

Khi dừng camera, chuyển trang hoặc unmount component:

- Gọi `cancelAnimationFrame()` và đặt ref về trạng thái an toàn.
- Gọi `track.stop()` cho mọi `MediaStreamTrack`.
- Gỡ stream khỏi video bằng `video.srcObject = null` sau khi dừng.
- Dừng và hủy detector bằng API thật của phiên bản thư viện hiện tại.
- Gỡ listener, timer và observer đã đăng ký.
- Hủy canvas/context phụ hoặc tài nguyên render do module tạo nếu cần.
- Không để vòng lặp frame tự lên lịch trở lại sau khi đã dừng.
- Xử lý race condition nếu người dùng bấm bật/tắt nhiều lần liên tiếp hoặc unmount trong khi model vẫn đang tải.
- Không thu âm và không tải ảnh khuôn mặt lên máy chủ trừ khi có yêu cầu rõ ràng, có thông báo phù hợp và có cơ chế đồng ý.

Ví dụ cleanup tham khảo:

```js
function stopCamera() {
  if (animationRef.current !== null) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }

  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;

  if (videoRef.current) {
    videoRef.current.pause();
    videoRef.current.srcObject = null;
  }

  landmarkerRef.current?.close();
  landmarkerRef.current = null;
  lastVideoTimeRef.current = -1;
}
```

Đây là ví dụ; điều chỉnh theo kiến trúc thật. Bảo đảm cleanup không gọi dispose trùng gây lỗi và không hủy tài nguyên đang được một phiên khác sử dụng.

---

## 11. Giao diện và trạng thái người dùng

Giữ Design System hiện có của Lumina:

- Ivory `#FAF8F5`
- Obsidian `#141413`
- Studio Dark `#0D0D0D`
- Champagne `#D4AF37`

Trang Try-On phải hỗ trợ rõ các trạng thái:

- Chưa bật camera.
- Đang xin quyền camera.
- Đang tải MediaPipe/model.
- Camera đang hoạt động.
- Đang tìm khuôn mặt.
- Đã phát hiện khuôn mặt.
- Chưa xác định được dáng mặt.
- Camera bị từ chối/không khả dụng.
- Lỗi tải WASM/model.
- Chế độ demo mannequin nếu đang có trong code.

Yêu cầu:

- Người dùng chủ động bấm nút bật camera.
- Có nút dừng camera.
- Có nút thử lại khi lỗi.
- Có hướng dẫn xử lý quyền camera.
- Responsive trên desktop, tablet và mobile.
- Overlay phải căn theo video chính xác khi thay đổi kích thước cửa sổ.
- Giữ nguyên Auth Guard ở các thao tác yêu cầu đăng nhập.

---

## 12. Kế hoạch kiểm thử

Thực hiện kiểm thử những tiêu chí sau và ghi nhận kết quả thực tế:

1. `/try-on` tải mà không có runtime error.
2. Camera chưa bật khi người dùng chưa thao tác.
3. Sau khi cấp quyền, video hiển thị và detector hoạt động.
4. Landmark và overlay cập nhật theo khuôn mặt.
5. Không thấy khuôn mặt thì hiển thị đúng trạng thái và không giữ kính sai vị trí.
6. Đổi kiểu gọng hoặc màu trong Studio rồi mở Try-On cho kết quả đồng bộ.
7. Thay `designSpec` trong khi camera chạy không tạo detector/stream mới không cần thiết.
8. Quyền camera bị từ chối không khiến trang crash.
9. Không có webcam hoặc model tải thất bại được xử lý rõ ràng.
10. Dừng camera làm stream thực sự kết thúc.
11. Rời trang rồi quay lại không tạo vòng frame trùng lặp.
12. Không lưu ảnh webcam ngoài ý muốn.
13. `npm run build` thành công.
14. Các test sẵn có không bị hồi quy.

Nếu có công cụ browser automation, hãy dùng để kiểm thử thật. Nếu không thể cấp quyền webcam hoặc chạy browser test trong môi trường hiện tại, đánh dấu tiêu chí đó là “Chưa kiểm thử được” thay vì tự đánh dấu ĐẠT.

---

## 13. Thứ tự thực hiện

1. Kiểm tra PRD, Git status, dependency và code hiện có.
2. Lập danh sách điểm đang đúng, điểm thiếu và lỗi có thể tái hiện.
3. Sửa phần khởi tạo MediaPipe hoặc đường dẫn WASM/model nếu cần.
4. Hoàn thiện camera lifecycle và vòng xử lý frame.
5. Hoàn thiện analyzer và overlay nếu có lỗi định vị.
6. Kiểm tra đồng bộ `designSpec` và Face Stylist.
7. Chạy test và build.
8. Kiểm tra lại các luồng Studio 3D, Try-On, Cart và Checkout có liên quan.
9. Tổng hợp báo cáo.

Không tạo component trùng lặp. Không viết lại module hoạt động nếu chỉ cần chỉnh sửa nhỏ. Không thay đổi nghiệp vụ ngoài phạm vi.

---

## 14. Báo cáo cuối cùng bắt buộc

Cuối quá trình, báo cáo:

- File đã kiểm tra.
- File đã tạo/sửa và lý do.
- Phiên bản `@mediapipe/tasks-vision` đang dùng.
- URL/phiên bản WASM và model được cấu hình.
- Cách khởi động và kiểm tra `/try-on`.
- Test đã chạy và kết quả thực tế.
- Test chưa chạy hoặc cần cấu hình bên ngoài.
- Các giới hạn về PD, dáng mặt và độ trung thực của overlay.
- Lỗi còn tồn tại.

Chỉ báo cáo “hoàn thành” khi có kết quả kiểm chứng. Nếu còn lỗi, hãy liệt kê rõ và đề xuất bước xử lý tiếp theo.

**Phạm vi cuối cùng:** Hoàn thiện MediaPipe Face Landmarker và AI Virtual Try-On hiện có. Không triển khai thêm tính năng kinh doanh, không tích hợp Gemini API và không thay thế SDK khi chưa có lý do kỹ thuật được chứng minh.

---

## Tài liệu tham khảo

- Google MediaPipe Face Landmarker for Web: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- MediaPipe Tasks Vision npm package: https://www.npmjs.com/package/@mediapipe/tasks-vision
- Project model asset: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
