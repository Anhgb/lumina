# LUMINA AI ASSISTANT — ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API SPECIFICATION)
**Lumina AI Assistant REST API & Function Calling Specification**  
*Phiên bản:* 1.0.0 — *Dự án:* Lumina Eyewear — *Tác giả:* Senior Software Architect  
*Mã tài liệu:* `LUMINA_AI_API_SPEC.md`

---

## 1. QUY ƯỚC CHUNG (GENERAL CONVENTIONS)

- **Giao thức**: HTTPS (Production) / HTTP (Local Development `http://localhost:3000`).
- **Định dạng dữ liệu**: `application/json; charset=utf-8`.
- **Xác thực (Authentication)**:
  - Header: `Authorization: Bearer <token>`
  - Đối với Khách hàng (Customer): Gửi kèm Bearer token lưu trong `localStorage.getItem('lumina_auth_user')`.
  - Đối với Khách vãng lai (Guest): Cho phép không gửi Header `Authorization` (hoặc token rỗng); hệ thống sẽ định danh tạm thời qua `x-session-token` (UUIDv4).
- **Cấu trúc phản hồi tiêu chuẩn**:
  ```json
  {
    "success": true,
    "message": "Thông điệp mô tả kết quả xử lý",
    "data": { ... }
  }
  ```
- **Cấu trúc lỗi tiêu chuẩn**:
  ```json
  {
    "success": false,
    "message": "Nội dung lỗi chi tiết bằng tiếng Việt",
    "code": "ERROR_CODE_STRING",
    "errors": []
  }
  ```

---

## 2. DANH SÁCH ENDPOINTS CỦA AI ASSISTANT

### 2.1. `POST /api/ai/chat` — Gửi tin nhắn & Nhận phản hồi tư vấn
Endpoint cốt lõi xử lý mọi tương tác của khách hàng với Lumina AI Assistant.

- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` *(Tùy chọn - Bắt buộc nếu muốn tra cứu đơn hàng cá nhân)*
  - `x-session-token: <uuid>` *(Bắt buộc để duy trì ngữ cảnh phiên trò chuyện)*

- **Request Body**:
  ```json
  {
    "conversationId": "conv_20261101_abc123",
    "message": "Tôi có khuôn mặt tròn thì nên chọn gọng kính nào đẹp và tôn mặt?",
    "clientContext": {
      "currentPage": "/try-on",
      "detectedFaceShape": "round",
      "currentDesignSpec": {
        "baseModel": "round",
        "frameColor": "#D4AF37",
        "lensColor": "#1F2937"
      }
    }
  }
  ```

- **Response Body (200 OK — Tư vấn sản phẩm & Dáng mặt)**:
  ```json
  {
    "success": true,
    "data": {
      "conversationId": "conv_20261101_abc123",
      "source": "llm_with_tools",
      "intent": "face_shape_styling",
      "message": "Chào quý khách! Với gương mặt Tròn phúc hậu, quý khách nên ưu tiên các mẫu gọng có góc cạnh như Dáng Vuông (Square) hoặc Aviator giọt nước để giúp khuôn mặt thanh thoát và thon gọn hơn. Lumina trân trọng gợi ý cho quý khách 2 tuyệt tác sau đây từ bộ sưu tập Atelier:",
      "productCards": [
        {
          "id": "lumina-04",
          "name": "Neo-Classic Square Obsidian",
          "category": "square",
          "categoryLabel": "Gọng vuông (Square)",
          "price": 2450000,
          "originalPrice": 2900000,
          "image": "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=800&q=80",
          "frameMaterial": "Acetate Ý đen bóng nguyên khối",
          "stock": 6,
          "actionUrl": "/catalog?category=square"
        },
        {
          "id": "lumina-02",
          "name": "Celestial Aviator Titanium Gold",
          "category": "aviator",
          "categoryLabel": "Phi công (Aviator)",
          "price": 2850000,
          "originalPrice": 3400000,
          "image": "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80",
          "frameMaterial": "Titanium siêu nhẹ cấp hàng không",
          "stock": 12,
          "actionUrl": "/catalog?category=aviator"
        }
      ],
      "actions": [
        {
          "type": "APPLY_STUDIO_SPEC",
          "label": "Mở dáng Square trong 3D Atelier",
          "payload": {
            "baseModel": "square",
            "frameColor": "#141413"
          }
        },
        {
          "type": "NAVIGATE",
          "label": "Thử kính trực tiếp qua Webcam (Try-On)",
          "url": "/try-on"
        }
      ],
      "quickSuggestions": [
        "Xem chi tiết chất liệu Titanium",
        "Chính sách bảo hành gọng kính",
        "Có hỗ trợ làm mắt cận không?"
      ]
    }
  }
  ```

- **Response Body (200 OK — Tra cứu đơn hàng thành công)**:
  ```json
  {
    "success": true,
    "data": {
      "conversationId": "conv_20261101_abc123",
      "source": "order_tool",
      "intent": "order_tracking",
      "message": "Dạ, Lumina đã tìm thấy đơn hàng #LUM-20261016-DEMO của quý khách:",
      "orderSummary": {
        "orderCode": "LUM-20261016-DEMO",
        "customerName": "Nguyễn Minh Anh",
        "status": "confirmed",
        "statusLabel": "Đã xác nhận & Đang chế tác",
        "totalAmount": 3250000,
        "paymentStatus": "paid",
        "paymentMethod": "Chuyển khoản QR ngân hàng",
        "createdAt": "2026-10-16T14:30:00Z",
        "items": [
          {
            "productName": "Cyber Cat-Eye 18K Champagne",
            "quantity": 1,
            "unitPrice": 3250000
          }
        ]
      },
      "quickSuggestions": [
        "Thời gian giao hàng dự kiến là khi nào?",
        "Tôi muốn thay đổi địa chỉ nhận hàng"
      ]
    }
  }
  ```

- **Response Body (200 OK — Tra cứu đơn hàng nhưng chưa đăng nhập)**:
  ```json
  {
    "success": true,
    "data": {
      "conversationId": "conv_20261101_abc123",
      "source": "security_guard",
      "intent": "order_tracking_unauthorized",
      "message": "Vì lý do bảo mật thông tin cá nhân và chi tiết đơn hàng, quý khách vui lòng đăng nhập tài khoản Lumina để thực hiện tra cứu.",
      "actions": [
        {
          "type": "TRIGGER_LOGIN",
          "label": "Đăng nhập ngay"
        }
      ]
    }
  }
  ```

---

### 2.2. `GET /api/ai/faq` — Lấy danh mục câu hỏi thường gặp
Phục vụ hiển thị gợi ý nhanh khi người dùng vừa mở khung chat Lumina AI Assistant.

- **Headers**: Không yêu cầu xác thực.
- **Response Body (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "categories": [
        {
          "id": "styling",
          "title": "Tư vấn chọn kính & Dáng mặt",
          "items": [
            "Cách xác định dáng khuôn mặt chuẩn nhãn khoa?",
            "Mặt vuông nên chọn gọng tròn hay mắt mèo?",
            "Da ngăm nên đeo gọng màu gì tôn da?"
          ]
        },
        {
          "id": "atelier_3d",
          "title": "Thiết kế Bespoke 3D & Khắc tên",
          "items": [
            "Khắc tên trên gọng kính tối đa bao nhiêu ký tự?",
            "Charm gắn gọng có bị rớt khi vận động mạnh không?",
            "Lumina có các chất liệu gọng nào?"
          ]
        },
        {
          "id": "policies",
          "title": "Chính sách & Hậu mãi",
          "items": [
            "Chính sách bảo hành và đổi trả của Lumina?",
            "Thời gian giao hàng toàn quốc mất bao lâu?",
            "Địa chỉ showroom Lumina Atelier ở đâu?"
          ]
        }
      ]
    }
  }
  ```

---

### 2.3. `POST /api/ai/feedback` — Gửi đánh giá câu trả lời (Audit Quality)
Giúp đánh giá và tinh chỉnh độ chính xác của AI Assistant.

- **Request Body**:
  ```json
  {
    "messageId": 128,
    "rating": "liked", // 'liked' | 'disliked'
    "comment": "Tư vấn dáng kính rất hợp với mặt tròn, đã đặt mua ngay!"
  }
  ```
- **Response Body (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Cảm ơn quý khách đã gửi phản hồi giúp Lumina nâng cao chất lượng phục vụ."
  }
  ```

---

## 3. ĐẶC TẢ PUBLIC PRODUCT APIS (CHO CATALOG & AI ASSISTANT)

Để đảm bảo AI Assistant và Trang danh mục lấy dữ liệu đồng nhất từ MySQL (thay vì dữ liệu mock), bổ sung thêm các public endpoint:

### 3.1. `GET /api/products` — Lấy danh sách sản phẩm từ MySQL
- **Query Parameters**:
  - `category` (string, optional): `cateye`, `aviator`, `round`, `square`
  - `faceShape` (string, optional): `Round`, `Square`, `Oval`, `Heart`, `Diamond`
  - `minPrice` (number, optional)
  - `maxPrice` (number, optional)
  - `search` (string, optional): Từ khóa tìm kiếm theo tên hoặc chất liệu
  - `limit` (number, default: 20)
- **Response (200 OK)**: Trả về danh sách sản phẩm từ bảng `products` trong MySQL kèm thông tin tồn kho thực tế.

### 3.2. `GET /api/products/:id` — Chi tiết một sản phẩm
- **Params**: `id` (e.g. `lumina-01`)
- **Response (200 OK)**: Dữ liệu chi tiết của sản phẩm kèm trạng thái khả dụng.

---

## 4. ĐẶC TẢ FUNCTION CALLING TOOLS CHO LLM (TIER 2 TOOLS)

Khi Gemini/OpenAI xử lý câu hỏi của khách hàng, các Tool sau đây được đăng ký để AI có thể tự động gọi khi cần dữ liệu thực tế từ MySQL:

### 4.1. Tool: `search_products`
```json
{
  "name": "search_products",
  "description": "Truy xuất danh sách sản phẩm kính mắt thực tế từ cơ sở dữ liệu MySQL của Lumina. Dùng khi khách hàng tìm kiếm sản phẩm theo dáng kính, khoảng giá, chất liệu hoặc dáng mặt.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "category": {
        "type": "STRING",
        "description": "Kiểu dáng gọng kính: cateye, aviator, round, square",
        "enum": ["cateye", "aviator", "round", "square", "all"]
      },
      "face_shape": {
        "type": "STRING",
        "description": "Dáng khuôn mặt cần tư vấn: Round, Square, Oval, Heart, Diamond"
      },
      "max_price": {
        "type": "NUMBER",
        "description": "Mức giá tối đa (VNĐ)"
      },
      "keyword": {
        "type": "STRING",
        "description": "Từ khóa tìm kiếm (VD: titan, mạ vàng, đồi mồi)"
      }
    }
  }
}
```

### 4.2. Tool: `check_product_stock`
```json
{
  "name": "check_product_stock",
  "description": "Kiểm tra số lượng tồn kho khả dụng tức thời của một sản phẩm trong kho MySQL theo ID sản phẩm.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "product_id": {
        "type": "STRING",
        "description": "Mã sản phẩm (VD: lumina-01, lumina-02)"
      }
    },
    "required": ["product_id"]
  }
}
```

### 4.3. Tool: `lookup_customer_order`
```json
{
  "name": "lookup_customer_order",
  "description": "Tra cứu tiến độ và thông tin đơn hàng của khách hàng theo mã đơn. CÔNG CỤ NÀY ĐÃ TÍCH HỢP IDOR PROTECTION: Chỉ trả về thông tin nếu đơn hàng thuộc sở hữu của tài khoản hiện tại.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "order_code": {
        "type": "STRING",
        "description": "Mã đơn hàng Lumina (VD: LUM-20261016-DEMO)"
      }
    },
    "required": ["order_code"]
  }
}
```

### 4.4. Tool: `get_face_styling_rules`
```json
{
  "name": "get_face_styling_rules",
  "description": "Lấy cẩm nang chuẩn nhãn khoa và thẩm mỹ của Lumina về dáng mặt (đặc điểm, dáng kính nên đeo, dáng kính nên tránh, màu sắc phù hợp).",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "face_shape": {
        "type": "STRING",
        "description": "Dáng khuôn mặt: round, square, oval, heart, diamond",
        "enum": ["round", "square", "oval", "heart", "diamond"]
      }
    },
    "required": ["face_shape"]
  }
}
```

---

## 5. MÃ LỖI HTTP VÀ XỬ LÝ LỖI (ERROR CODES)

| Mã HTTP | Mã lỗi (`code`) | Ý nghĩa & Hướng xử lý |
| :---: | :--- | :--- |
| **400** | `INVALID_PAYLOAD` | Dữ liệu tin nhắn rỗng hoặc không đúng định dạng JSON. |
| **401** | `UNAUTHORIZED` | Yêu cầu tra cứu thông tin đơn hàng nhưng chưa cung cấp token. |
| **403** | `FORBIDDEN_IDOR` | Cố tình truy cập đơn hàng không thuộc sở hữu của tài khoản hiện tại. |
| **404** | `ORDER_NOT_FOUND` | Không tìm thấy mã đơn hàng yêu cầu trong hệ thống. |
| **429** | `RATE_LIMIT_EXCEEDED` | Quá nhiều lượt hỏi trong thời gian ngắn (chống spam/DDoS LLM). |
| **503** | `LLM_SERVICE_UNAVAILABLE` | Không kết nối được dịch vụ Gemini/OpenAI; tự động chuyển sang chế độ Rule-based offline. |

---
*Tài liệu Đặc tả API đã hoàn thành — Đầy đủ chi tiết để Frontend và Backend kết nối chính xác và an toàn.*
