/**
 * Lumina Eyewear — Rule-based FAQ Knowledge Base
 * 
 * Mỗi entry gồm: id, question, keywords[], answer, category, isActive.
 * Intent classifier sẽ so khớp keywords với tin nhắn người dùng.
 * Nếu match confidence cao → trả FAQ trực tiếp, không gọi AI provider.
 */

const FAQ_DATA = [
  // ── Giờ hoạt động ──
  {
    id: 'faq-hours-01',
    question: 'Lumina Eyewear mở cửa lúc mấy giờ?',
    keywords: ['giờ', 'mở cửa', 'đóng cửa', 'mấy giờ', 'thời gian', 'hoạt động', 'làm việc', 'opening', 'hours'],
    answer: `Showroom Lumina Eyewear phục vụ quý khách theo lịch sau:\n\n✦ **Thứ 2 – Thứ 6**: 9:00 – 20:00\n✦ **Thứ 7 – Chủ nhật**: 9:30 – 21:00\n✦ **Ngày lễ**: Vui lòng theo dõi thông báo trên website.\n\nQuý khách có thể đặt lịch hẹn trước để được phục vụ riêng tư tại khu Private Lounge.`,
    category: 'hours',
    isActive: true,
  },

  // ── Chính sách đổi trả ──
  {
    id: 'faq-return-01',
    question: 'Chính sách đổi trả của Lumina Eyewear?',
    keywords: ['đổi trả', 'trả hàng', 'hoàn tiền', 'đổi hàng', 'return', 'refund', 'exchange', 'đổi sản phẩm'],
    answer: `Chính sách đổi trả tại Lumina Eyewear:\n\n✦ **Kính Catalog nguyên bản**: Đổi trả trong vòng **07 ngày** kể từ ngày giao hàng xác minh, với điều kiện sản phẩm còn nguyên tem niêm phong Atelier, hộp đựng, chưa cắt tròng thuốc theo độ khúc xạ riêng.\n✦ **Kính 3D Bespoke cá nhân hóa**: Lumina hỗ trợ cân chỉnh, sửa chữa lỗi kỹ thuật và xử lý sản phẩm không đúng cấu hình đã xác nhận. Không áp dụng đổi trả hoàn tiền do thay đổi ý định.\n✦ Quý khách có thể tạo phiếu yêu cầu tại mục **Lumina Care** trong trang Tài khoản (/account) để được xử lý minh bạch.`,
    category: 'returns',
    isActive: true,
  },

  // ── Chính sách bảo hành ──
  {
    id: 'faq-warranty-01',
    question: 'Chính sách bảo hành kính Lumina?',
    keywords: ['bảo hành', 'warranty', 'sửa chữa', 'hỏng', 'lỗi', 'bể', 'gãy', 'trầy', 'lumina care', 'bảo dưỡng'],
    answer: `Đặc quyền bảo hành & Lumina Care (đã phê duyệt chính thức):\n\n✦ **Bảo hành 12 tháng** chính hãng cho khung gọng và lỗi kỹ thuật phát sinh từ vật liệu hoặc chế tác.\n✦ **Bảo hành lớp phủ tròng kính**: 06 tháng cho lớp phủ chống chói, chống trầy, lọc ánh sáng xanh.\n✦ **Dịch vụ bảo dưỡng & ve mũi**: 24 tháng kể từ ngày giao hàng xác minh (vệ sinh sóng siêu âm, nắn chỉnh gọng, thay đệm ve mũi).\n✦ Không bảo hành hư hỏng do va chạm mạnh, đè gãy hoặc tự ý can thiệp bên ngoài.\n\nQuý khách có thể gửi phiếu tại mục **Lumina Care** trong trang Tài khoản (/account) để chuyên viên tiếp nhận.`,
    category: 'warranty',
    isActive: true,
  },

  // ── Hướng dẫn sử dụng website ──
  {
    id: 'faq-website-01',
    question: 'Hướng dẫn sử dụng website Lumina?',
    keywords: ['hướng dẫn', 'sử dụng', 'website', 'cách dùng', 'cách mua', 'mua hàng', 'đặt hàng', 'thanh toán', 'trang web'],
    answer: `Hướng dẫn mua hàng trên Lumina Eyewear:\n\n✦ **Bước 1**: Khám phá bộ sưu tập tại mục **Catalog** hoặc sử dụng **AI Virtual Try-On** để thử kính.\n✦ **Bước 2**: Chọn sản phẩm → Bấm **Thêm vào giỏ hàng**.\n✦ **Bước 3**: Vào **Giỏ hàng** → Kiểm tra đơn → Bấm **Thanh toán**.\n✦ **Bước 4**: Điền thông tin giao hàng → Chọn phương thức thanh toán → Xác nhận.\n\nQuý khách cũng có thể thiết kế kính riêng tại **3D Bespoke Atelier** trước khi đặt hàng.`,
    category: 'website',
    isActive: true,
  },

  // ── Bảo quản kính ──
  {
    id: 'faq-care-01',
    question: 'Cách bảo quản kính mắt?',
    keywords: ['bảo quản', 'giữ gìn', 'lau kính', 'vệ sinh', 'chăm sóc', 'rửa kính', 'care', 'cleaning', 'bảo dưỡng'],
    answer: `Hướng dẫn bảo quản kính Lumina Eyewear:\n\n✦ **Lau kính**: Sử dụng khăn microfiber chuyên dụng đi kèm. Tránh dùng giấy ăn, vải thô hoặc áo quần.\n✦ **Rửa kính**: Rửa nhẹ dưới vòi nước ấm với xà phòng dịu. Tránh nước nóng làm bong lớp phủ.\n✦ **Cất giữ**: Luôn đặt kính vào hộp bảo vệ Atelier khi không sử dụng, mặt kính hướng lên.\n✦ **Tránh**: Đặt kính trên đầu, để trên mặt nóng (táp-lô xe hơi), hoặc tiếp xúc với hóa chất.\n✦ **Định kỳ**: Mang đến Showroom Lumina để vệ sinh sóng siêu âm miễn phí mỗi 3 tháng.`,
    category: 'care',
    isActive: true,
  },

  // ── Vận chuyển ──
  {
    id: 'faq-shipping-01',
    question: 'Phí vận chuyển và thời gian giao hàng?',
    keywords: ['vận chuyển', 'giao hàng', 'phí ship', 'ship', 'shipping', 'delivery', 'bao lâu', 'mấy ngày', 'thời gian giao'],
    answer: `Chính sách vận chuyển Lumina Eyewear:\n\n✦ **Nội thành TP.HCM & Hà Nội**: Giao trong 1–2 ngày làm việc.\n✦ **Tỉnh thành khác**: 3–5 ngày làm việc.\n✦ **Miễn phí vận chuyển** cho đơn hàng từ 2.000.000đ.\n✦ Đơn dưới 2.000.000đ: Phí vận chuyển 30.000đ – 50.000đ tùy khu vực.\n✦ Mỗi đơn hàng đều được đóng gói trong hộp Atelier cao cấp kèm khăn microfiber và thẻ bảo hành.\n\nQuý khách có thể tra cứu trạng thái đơn hàng bằng mã đơn (LUM-XXXXXXXX-XXXX).`,
    category: 'shipping',
    isActive: true,
  },

  // ── Thanh toán ──
  {
    id: 'faq-payment-01',
    question: 'Lumina hỗ trợ những phương thức thanh toán nào?',
    keywords: ['phương thức thanh toán', 'hình thức thanh toán', 'các cách thanh toán', 'thẻ tín dụng', 'ví điện tử', 'momo', 'vnpay', 'zalopay'],
    answer: `Phương thức thanh toán tại Lumina Eyewear:\n\n✦ **Thanh toán khi nhận hàng (COD)**: Áp dụng toàn quốc.\n✦ **Chuyển khoản ngân hàng**: Xác nhận tự động trong 5 phút.\n✦ **Thẻ quốc tế**: Visa, Mastercard, JCB qua cổng thanh toán bảo mật.\n✦ **Ví điện tử**: MoMo, VNPay, ZaloPay.\n\nMọi giao dịch đều được mã hóa SSL 256-bit. Lumina không lưu trữ thông tin thẻ của quý khách.`,
    category: 'payment',
    isActive: true,
  },
  {
    id: 'faq-payment-cod-01',
    question: 'Chính sách thanh toán khi nhận hàng (COD)?',
    keywords: ['cod', 'nhận hàng thanh toán', 'thanh toán khi nhận hàng', 'thanh toán khi nhận', 'tiền mặt khi nhận', 'trả tiền mặt', 'thanh toán cod', 'giao hàng thu tiền', 'nhận hàng trả tiền'],
    answer: `Chính sách thanh toán COD tại Lumina Eyewear:\n\n✦ **Áp dụng miễn phí toàn quốc** cho mọi đơn hàng kính mắt.\n✦ Quý khách được **đồng kiểm tra tem niêm phong Atelier** và tình trạng nguyên vẹn của hộp sản phẩm trước khi thanh toán tiền mặt cho nhân viên giao hàng.\n✦ Đơn hàng COD sẽ được nhân viên Lumina Concierge liên hệ xác nhận qua điện thoại trước khi tiến hành đóng gói và chuyển phát.`,
    category: 'payment',
    isActive: true,
  },
  {
    id: 'faq-payment-transfer-01',
    question: 'Quy trình thanh toán chuyển khoản ngân hàng?',
    keywords: ['chuyển khoản', 'ngân hàng', 'chuyển khoản ngân hàng', 'thanh toán chuyển khoản', 'qr code', 'chuyển khoản mô phỏng', 'quét mã qr', 'số tài khoản', 'xác nhận chuyển khoản'],
    answer: `Quy trình thanh toán chuyển khoản tại Lumina Eyewear:\n\n✦ **Xác nhận tự động**: Sau khi hoàn tất đặt hàng, màn hình hiển thị mã QR kèm nội dung chuyển khoản chuẩn hóa. Hệ thống đối soát tự động cập nhật trạng thái đã thanh toán trong vòng 5 phút.\n✦ **Đối soát an toàn**: Trường hợp chuyển khoản ngoài giờ làm việc hoặc ngân hàng bảo trì, chuyên viên CSKH Lumina sẽ đối soát thủ công dựa trên mã giao dịch hợp lệ.\n✦ **Bảo mật tuyệt đối**: Lumina tuyệt đối không yêu cầu quý khách cung cấp mã OTP hay mật khẩu ngân hàng.\n\n*Lưu ý: Trợ lý AI không có thẩm quyền tự xác nhận đã nhận tiền nếu hệ thống tài chính chưa ghi nhận.*`,
    category: 'payment',
    isActive: true,
  },
  {
    id: 'faq-cancel-01',
    question: 'Quy định hủy hoặc thay đổi đơn hàng?',
    keywords: ['hủy đơn', 'hủy đơn hàng', 'hủy đặt hàng', 'cancel order', 'thay đổi đơn', 'thay đổi đơn hàng', 'hủy hoặc thay đổi', 'quy định hủy', 'chính sách hủy', 'thay đổi địa chỉ đơn', 'sửa đơn hàng', 'đổi thông tin đơn'],
    answer: `Quy định hủy hoặc thay đổi thông tin đơn hàng tại Lumina:\n\n✦ **Đơn Chờ xác nhận (Pending) hoặc Đã xác nhận (Confirmed)**: Quý khách được hỗ trợ hủy đơn hoặc điều chỉnh địa chỉ giao hàng miễn phí bằng cách liên hệ ngay Hotline **1900-LUMINA** hoặc email **concierge@lumina-eyewear.vn**.\n✦ **Đơn Đang chế tác (Processing)**: Tròng kính đã được mài cắt riêng biệt theo đơn thuốc nhãn khoa nên không thể hủy ngang trên hệ thống.\n✦ **Đơn Đã hoàn thành (Completed)**: Áp dụng chính sách đổi trả trong vòng 7 ngày kể từ lúc nhận hàng.\n\n*Lưu ý: Để bảo vệ an toàn giao dịch, trợ lý AI không có quyền tự động hủy đơn hoặc đổi trạng thái trong database.*`,
    category: 'cancel',
    isActive: true,
  },

  // ── Tài khoản ──
  {
    id: 'faq-account-01',
    question: 'Làm sao để tạo tài khoản Lumina?',
    keywords: ['tạo tài khoản', 'đăng ký', 'đăng nhập', 'sign up', 'register', 'login', 'tài khoản', 'account', 'quên mật khẩu'],
    answer: `Hướng dẫn tài khoản Lumina Eyewear:\n\n✦ **Đăng ký**: Bấm **Đăng ký** ở góc phải trên cùng → Nhập email và mật khẩu → Xác nhận.\n✦ **Đăng nhập**: Bấm **Đăng nhập** → Nhập thông tin tài khoản.\n✦ **Quên mật khẩu**: Bấm **Quên mật khẩu** → Nhập email → Kiểm tra hộp thư để đặt lại.\n\nKhi có tài khoản, quý khách có thể lưu lịch sử đơn hàng, lịch sử trò chuyện và thiết kế 3D cá nhân.`,
    category: 'account',
    isActive: true,
  },

  // ── Liên hệ ──
  {
    id: 'faq-contact-01',
    question: 'Liên hệ Lumina Eyewear?',
    keywords: ['liên hệ', 'contact', 'hotline', 'email', 'địa chỉ', 'showroom', 'cửa hàng', 'điện thoại', 'số điện thoại'],
    answer: `Thông tin liên hệ Lumina Eyewear:\n\n✦ **Hotline**: 1900-LUMINA (1900-586-462)\n✦ **Email**: concierge@lumina-eyewear.vn\n✦ **Showroom chính**: Số 1 Đường Nguyễn Huệ, Quận 1, TP.HCM\n✦ **Giờ làm việc**: Thứ 2 – CN, 9:00 – 21:00\n\nQuý khách cũng có thể trò chuyện trực tiếp với Lumina AI Assistant ngay tại đây.`,
    category: 'contact',
    isActive: true,
  },

  // ── Try-On AI hướng dẫn ──
  {
    id: 'faq-tryon-01',
    question: 'Cách sử dụng tính năng thử kính AI?',
    keywords: ['thử kính', 'try on', 'try-on', 'ai try-on', 'hướng dẫn try-on', 'hướng dẫn thử kính', 'camera', 'virtual', 'ảnh chân dung', 'webcam', 'pd', 'pupillary distance', 'bật camera', 'cấp quyền camera'],
    answer: `Hướng dẫn sử dụng AI Virtual Try-On:\n\n✦ **Bước 1 — Bật camera**: Vào mục **Thử kính AI** → bấm **Bật Camera** → trình duyệt yêu cầu quyền truy cập, chọn **Cho phép**.\n✦ **Bước 2 — Căn chỉnh gương mặt**: Nhìn thẳng vào camera, ánh sáng đều, không nghiêng đầu quá 15°. Đảm bảo toàn bộ gương mặt nằm trong khung hình.\n✦ **Bước 3 — Thử kính**: Chọn kiểu gọng từ bảng bên trái. Kính ướm thử tự động theo chuyển động gương mặt realtime.\n✦ **Bước 4 — Face Stylist**: Bấm **Phân tích dáng mặt** để AI nhận diện khuôn mặt và gợi ý kiểu gọng phù hợp nhất.\n\n**Nếu không nhận diện được khuôn mặt**: Di chuyển lại gần camera, cải thiện ánh sáng, hoặc tải lên ảnh chân dung thay thế.\n\n*Lưu ý: AI chỉ phân tích tỷ lệ hình ảnh, không lưu trữ ảnh camera của quý khách.*`,
    category: 'tryon',
    isActive: true,
  },

  // ── PD (Pupillary Distance) giải thích ──
  {
    id: 'faq-pd-01',
    question: 'PD (khoảng cách đồng tử) là gì và cách đo?',
    keywords: ['pd', 'pupillary distance', 'khoảng cách đồng tử', 'đồng tử', 'đo pd', 'số đo pd', 'pd bao nhiêu', 'pupillary'],
    answer: `**PD (Pupillary Distance — Khoảng cách đồng tử)** là khoảng cách tính bằng mm giữa tâm đồng tử mắt trái và mắt phải.\n\n✦ **Phạm vi bình thường**: 50–75mm (trung bình người Việt: 62–65mm).\n✦ **Camera AI của Lumina**: Ước lượng tỷ lệ tương đối khuôn mặt qua 478 điểm MediaPipe — **không thay thế số đo PD thực tế**.\n✦ **Để có PD chính xác cho đơn kính thuốc**: Nhập số đo từ đơn bác sĩ nhãn khoa, hoặc đo tại cửa hàng kính chuyên dụng.\n\n*Lumina không chịu trách nhiệm y tế về độ chính xác PD ước lượng từ webcam.*`,
    category: 'tryon',
    isActive: true,
  },

  // ── Face Stylist hướng dẫn ──
  {
    id: 'faq-facestylist-01',
    question: 'Face Stylist AI hoạt động như thế nào?',
    keywords: ['face stylist', 'dáng mặt', 'nhận diện mặt', 'khuôn mặt', 'phân tích dáng mặt', 'mặt tròn', 'mặt vuông', 'trái xoan', 'trái tim', 'kim cương', 'face shape'],
    answer: `**Face Stylist AI** phân tích 478 điểm mốc khuôn mặt (MediaPipe FaceMesh) để nhận diện dáng mặt và gợi ý kiểu gọng phù hợp.\n\n✦ **Mặt tròn** → Gọng Aviator, Square tạo góc cạnh thon gọn.\n✦ **Mặt vuông** → Gọng Round, Cat-Eye làm mềm đường viền quai hàm.\n✦ **Mặt oval / Trái xoan** → Đa năng, hầu hết kiểu gọng đều phù hợp.\n✦ **Mặt trái tim** → Gọng Aviator, Round cân bằng vầng trán rộng.\n✦ **Mặt kim cương** → Gọng Cat-Eye tôn gò má cao đặc trưng.\n\n*Gợi ý mang tính thẩm mỹ, không phải quy chuẩn tuyệt đối. Quý khách tự tin chọn theo gu cá nhân.*`,
    category: 'tryon',
    isActive: true,
  },

  // ── 3D Atelier hướng dẫn ──
  {
    id: 'faq-studio-01',
    question: 'Hướng dẫn sử dụng 3D Bespoke Atelier?',
    keywords: ['3d', 'atelier', 'studio', 'tùy biến', 'customize', 'custom', 'thiết kế', 'bespoke', 'cá nhân hóa', '3d atelier', 'studio 3d'],
    answer: `Hướng dẫn 3D Bespoke Atelier:\n\n✦ **Bước 1**: Vào mục **3D Atelier** từ menu chính.\n✦ **Bước 2**: Chọn kiểu gọng cơ bản (Round, Square, Aviator, Cat-Eye).\n✦ **Bước 3**: Tùy chỉnh chất liệu (Titanium, Acetate, mạ vàng 18K), màu sắc và hoa văn.\n✦ **Bước 4**: Thêm tùy biến cao cấp: đính đá Swarovski, gắn Charm, khắc laser tên riêng.\n✦ **Bước 5**: Xem trước 3D realtime → Thêm vào giỏ hàng hoặc lưu thiết kế.\n\nMọi thiết kế Bespoke đều là phiên bản duy nhất, được chế tác thủ công trong 7–10 ngày.`,
    category: 'studio',
    isActive: true,
  },

  // ── Giá tùy biến 3D ──
  {
    id: 'faq-studio-price-01',
    question: 'Bảng giá tùy biến 3D Bespoke Atelier?',
    keywords: ['giá 3d', 'giá atelier', 'giá tùy biến', 'giá bespoke', 'chi phí tùy chỉnh', 'giá khắc laser', 'giá rhinestone', 'giá charm', 'bảng giá 3d'],
    answer: `**Bảng giá tùy biến 3D Bespoke Atelier Lumina:**\n\n✦ **Giá gọng cơ bản**: Từ **1.950.000đ** (Round Titanium tối giản) đến **3.450.000đ** (Aviator mạ vàng 18K).\n✦ **Đính đá Swarovski (Rhinestones)**: +**500.000đ**\n✦ **Khắc laser tên riêng**: +**300.000đ** (tối đa 15 ký tự)\n✦ **Gắn Charm trang trí**: +**200.000đ**/charm (tối đa 2 charm)\n\nGiá tùy chỉnh tổng cộng được tính realtime tại thanh **Summary Bar** phía dưới màn hình Atelier.\n\n*Giá cuối cùng được xác nhận khi thêm vào giỏ hàng. Không tính phí thiết kế hay phí tư vấn.*`,
    category: 'studio',
    isActive: true,
  },

  // ── Khắc laser ──
  {
    id: 'faq-engraving-01',
    question: 'Dịch vụ khắc laser trên gọng kính?',
    keywords: ['khắc laser', 'khắc tên', 'khắc chữ', 'engraving', 'khắc gọng', 'tên trên kính', 'cá nhân hóa laser'],
    answer: `**Dịch vụ khắc laser cá nhân hóa Lumina:**\n\n✦ Công nghệ khắc CNC độ chính xác 0.1mm trên gọng Titanium hoặc bề mặt kim loại.\n✦ Tối đa **15 ký tự** (chữ hoa, số và ký tự đặc biệt ✦ ♥ ★).\n✦ Vị trí: Mặt trong cạnh đuôi gọng bên phải — khuất khi đeo, chỉ chủ nhân mới nhìn thấy.\n✦ Phụ phí: +**300.000đ**.\n\n*Thông điệp được khắc vĩnh viễn — không thể thay đổi sau khi đặt hàng.*`,
    category: 'studio',
    isActive: true,
  },
];

export default FAQ_DATA;

