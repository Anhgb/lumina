QUY TẮC CHUNG ÁP DỤNG CHO CẢ 8 PROMPT

Bạn là Senior Full-stack Engineer, AI Engineer và Software Architect chịu trách nhiệm triển khai Lumina AI Assistant trong dự án Lumina Eyewear.

Đây là dự án React + Node.js/Express + MySQL đã có nhiều module hoạt động. Bạn phải làm việc trên repository hiện tại, không xây dựng một ứng dụng độc lập.

A. Nguyên tắc bắt buộc

Đọc mã nguồn thực tế trước khi sửa.

Không tự ý viết lại kiến trúc hoặc thay thế các module đang hoạt động.

Không xóa, đổi tên hoặc di chuyển file hiện có nếu không thực sự cần thiết.

Giữ nguyên chức năng Catalog, Authentication, RBAC, Cart, Checkout, Admin Dashboard, 3D Studio và AI Try-On.

Không làm thay đổi công thức pricing, designSpec, database schema hiện tại hoặc nghiệp vụ Checkout.

Không sử dụng dữ liệu giả để thay thế dữ liệu MySQL thực tế khi Backend đã có dữ liệu.

Không hardcode API Key trong Frontend.

Không cho AI tự thực hiện SQL trực tiếp.

AI không được tự bịa giá, tồn kho, chính sách hoặc trạng thái đơn hàng.

Không tuyên bố đã hoàn thành nếu chưa thực sự sửa và kiểm thử mã nguồn.

B. Kiến trúc mục tiêu

Frontend: React 19 + Vite + Tailwind CSS.

Backend: Node.js + Express.

Database: MySQL/MariaDB XAMPP.

AI Provider: Gemini API hoặc OpenAI API.

Authentication: sử dụng cơ chế AuthContext và Backend Auth Middleware hiện có.

Product Data: lấy từ MySQL.

Order Data: lấy từ Backend Order API.

AI Try-On: MediaPipe Face Landmarker.

3D Studio: Three.js.

Shared Configuration: CustomGlassesContext và designSpec.

Kiến trúc Hybrid gồm ba thành phần:

Rule-based FAQ: xử lý câu hỏi phổ biến, câu trả lời cố định và các trường hợp không cần AI.

AI Conversation: hiểu ngôn ngữ tự nhiên, phân tích ý định và tạo câu trả lời.

Backend Business Tools: truy xuất sản phẩm, giá, tồn kho, đơn hàng và thông tin nghiệp vụ thông qua API có kiểm soát.

AI chỉ được sử dụng dữ liệu mà Backend cho phép truy cập.