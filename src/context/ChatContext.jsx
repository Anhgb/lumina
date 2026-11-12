import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { INITIAL_PRODUCTS } from '../data/products';
import {
  createChatSession,
  getChatMessages,
  sendChatMessage,
  deleteChatSession,
  submitChatFeedback,
} from '../api/chatService';
import { useChatContext } from '../hooks/useChatContext';

export const ChatContext = createContext(null);

export const CORE_QUICK_ACTIONS = [
  'Theo dõi đơn',
  'Yêu cầu hỗ trợ',
  'Điểm thành viên',
  'Bảo quản kính',
];

const SESSION_STORAGE_KEY = 'lumina_active_chat_session_code';

const INITIAL_WELCOME_MESSAGE = {
  id: 'msg-welcome-01',
  sender: 'ai',
  text: `Xin chào quý khách! Tôi là Lumina Concierge ✦\n\nTôi là trợ lý cá nhân đồng hành cùng bạn từ tư vấn phong cách đến đặc quyền chăm sóc sau mua Lumina Care & Hội viên.\n\nBạn cần tôi hỗ trợ điều gì hôm nay?`,
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  status: 'sent',
  quickActions: CORE_QUICK_ACTIONS,
};

// Authentic products from catalog for high-fidelity recommendation cards
const FEATURED_PRODUCTS_MOCK = INITIAL_PRODUCTS.slice(0, 3).map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  categoryLabel: p.categoryLabel || 'Kính cao cấp',
  price: p.price,
  originalPrice: p.originalPrice,
  stock: p.stock,
  image: p.image,
  frameMaterial: p.frameMaterial,
  description: p.description,
  actionUrl: '/catalog',
  tryOnUrl: `/try-on?model=${p.category}`,
}));

// UI preview sample mock responses for layout testing (separate from actual business backend)
const MOCK_PREVIEW_RESPONSES = {
  'Theo dõi đơn': {
    text: 'Dạ, để tra cứu hành trình chế tác và vận chuyển đơn hàng, quý khách vui lòng cung cấp mã đơn hàng (ví dụ: **LUM-20261016-DEMO**) hoặc đăng nhập tài khoản Lumina để kiểm tra tiến độ trực tiếp từ xưởng chế tác Atelier.',
    quickActions: ['Xem đơn hàng mẫu LUM-20261016-DEMO', 'Chính sách bảo hành', 'Yêu cầu hỗ trợ'],
  },
  'Yêu cầu hỗ trợ': {
    text: `Chính sách **Lumina Care — Hỗ trợ & Bảo hành sau mua**:\n\n✦ **Bảo hành 12 tháng** gọng kính và **06 tháng** lớp phủ quang học.\n✦ **Miễn phí 24 tháng** vệ sinh sóng siêu âm đa tầng và cân chỉnh ve mũi tại showroom.\n✦ Quý khách có thể gửi phiếu yêu cầu tại mục [**Lumina Care trong Tài khoản**](/account?tab=care).`,
    quickActions: ['Bảo quản kính', 'Điểm thành viên', 'Hotline 1900-LUMINA'],
  },
  'Điểm thành viên': {
    text: `Chương trình hội viên **Lumina Membership**:\n\n✦ Tích lũy **1%** giá trị đơn hàng (100.000đ = 1 điểm).\n✦ Quy đổi: **1 điểm = 1.000đ** trừ trực tiếp vào đơn hàng mới (tối đa 20% giá trị sản phẩm).\n✦ Quý khách vui lòng đăng nhập để xem số dư điểm và tiến độ phân hạng tại [**Trang Thành Viên**](/account?tab=loyalty).`,
    quickActions: ['Theo dõi đơn', 'Bảo quản kính', 'Quyền lợi hạng thẻ'],
  },
  'Bảo quản kính': {
    text: `Cẩm nang **Bảo quản kính mắt Lumina Eyewear**:\n\n✦ Luôn sử dụng khăn lau microfiber chuyên dụng, tránh dùng vạt áo hoặc khăn giấy.\n✦ Rửa nhẹ dưới vòi nước ấm pha xà phòng dịu nhẹ trước khi lau sạch.\n✦ Cất kính vào hộp Atelier khi không sử dụng, tránh để trên táp-lô xe hơi nhiệt độ cao.\n✦ Miễn phí vệ sinh sóng siêu âm định kỳ trong 24 tháng tại showroom Lumina.`,
    quickActions: ['Yêu cầu hỗ trợ', 'Điểm thành viên', 'Theo dõi đơn'],
  },
  'Tư vấn chọn kính': {
    text: `Chào quý khách! Để lựa chọn dáng kính chuẩn tỉ lệ vàng gương mặt:\n\n✦ **Mặt tròn**: Nên chọn gọng **Vuông (Square)** hoặc **Aviator giọt nước** để tạo góc cạnh thon gọn.\n✦ **Mặt vuông**: Gọng **Tròn (Round)** hoặc oval mềm mại sẽ làm dịu đường viền quai hàm.\n✦ **Mặt trái xoan**: Phù hợp đa dạng kiểu dáng, đặc biệt tôn vinh với **Cat-Eye** kiêu kỳ.\n\nQuý khách có thể trải nghiệm **AI Virtual Try-On** qua camera để được quét 478 điểm mốc khuôn mặt chuẩn xác nhất.`,
    quickActions: ['Trải nghiệm AI Try-On', 'Mặt tròn', 'Mặt vuông', 'Mặt trái xoan'],
  },
  'Tìm sản phẩm': {
    text: 'Dưới đây là các thiết kế biểu tượng bán chạy nhất tại Lumina Atelier được chế tác từ Titanium hàng không và mạ vàng 18K:',
    productCards: FEATURED_PRODUCTS_MOCK,
    quickActions: ['Xem tất cả bộ sưu tập', 'Gọng Titanium siêu nhẹ', 'Gọng mắt mèo Cat-Eye'],
  },
  'Khám phá 3D Atelier': {
    text: `Không gian **3D Bespoke Atelier** cho phép quý khách tự do chế tác kính độc bản:\n\n✦ **Tùy biến vật liệu**: Titanium đánh bóng gương, Vàng Champagne 18K, Đồi mồi Ý.\n✦ **Tròng kính quang học**: Điều chỉnh độ truyền sáng 10% – 95% chuẩn nhãn khoa.\n✦ **Chi tiết độc bản**: Đính đá Swarovski, gắn Charm may mắn và khắc tên riêng trên gọng.`,
    quickActions: ['Vào phòng 3D Atelier ngay', 'Bảng giá tùy biến 3D', 'Chất liệu Titanium'],
  },
  'Hỗ trợ đơn hàng': {
    text: 'Dạ, để tra cứu hành trình chế tác và vận chuyển đơn hàng, quý khách vui lòng nhập mã đơn hàng (ví dụ: **LUM-20261016-DEMO**) hoặc đăng nhập tài khoản Lumina để xem toàn bộ lịch sử đơn mua.',
    quickActions: ['Xem đơn hàng mẫu LUM-20261016-DEMO', 'Chính sách đổi trả', 'Thời gian giao hàng'],
  },
  'Thử kính AI': {
    text: 'Tính năng **AI Virtual Try-On** sử dụng công nghệ MediaPipe FaceMesh nhận diện 478 điểm mốc theo thời gian thực, tự động phân tích tỷ lệ trán, gò má, cằm và ướm kính chuẩn xác đến từng milimét.',
    quickActions: ['Mở trang AI Try-On ngay', 'Độ chính xác đo khoảng cách đồng tử (PD)'],
  },
  'Chính sách bảo hành': {
    text: `Lumina Eyewear áp dụng đặc quyền hậu mãi chuẩn thượng lưu:\n\n✦ **Bảo hành 12 tháng** cho khung gọng chính hãng và lỗi kỹ thuật.\n✦ **Chăm sóc trọn đời**: Miễn phí vệ sinh sóng siêu âm, thay ve đệm mũi và cân chỉnh ốc ve.\n✦ **Đổi trả trong 7 ngày** đối với sản phẩm còn nguyên tem niêm phong Atelier.`,
    quickActions: ['Địa chỉ Showroom Lumina', 'Phí vận chuyển toàn quốc'],
  },
};

/**
 * Intelligent local fallback when backend is temporarily unreachable.
 */
function getSmartFallbackResponse(userText) {
  const lower = (userText || '').toLowerCase();

  // 1. Direct match in sample responses
  if (MOCK_PREVIEW_RESPONSES[userText]) {
    return MOCK_PREVIEW_RESPONSES[userText];
  }

  // 2. Face shape inquiries
  if (lower.includes('trái xoan') || lower.includes('oval')) {
    return {
      text: `Dạ, tư vấn dáng kính cho **Mặt trái xoan (Oval)**:\n\n✦ **Đặc điểm**: Tỉ lệ các vùng trên gương mặt cân đối lý tưởng, phần trán hơi rộng hơn cằm và đường nét cong nhẹ nhàng.\n✦ **Kiểu gọng gợi ý**: **Cat-Eye (Mắt mèo)**, **Square (Gọng vuông)**, **Aviator (Phi công)**, **Round (Gọng tròn)**.\n✦ **Cơ sở phong cách**: Mặt trái xoan là dáng mặt linh hoạt nhất. Quý khách có thể tự tin diện hầu hết các form kính, đặc biệt dáng Cat-Eye hoặc Square sẽ làm nổi bật thần thái sang trọng, thời thượng.\n\n*Gợi ý mang tính tham khảo thẩm mỹ nhãn khoa. Quý khách có thể bấm nút **Thử kính AI** để ướm thử trực tiếp trên khuôn mặt.*`,
      quickActions: ['Mắt mèo Cat-Eye quý phái', 'Gọng Vuông cá tính', 'Thử kính AI phân tích'],
      productCards: FEATURED_PRODUCTS_MOCK,
    };
  }

  if (lower.includes('mặt tròn') || lower.includes('tròn')) {
    return {
      text: `Dạ, tư vấn dáng kính cho **Mặt tròn (Round)**:\n\n✦ **Đặc điểm**: Chiều ngang và chiều dọc gương mặt tương đương, gò má đầy đặn, cằm tròn mềm mại.\n✦ **Kiểu gọng gợi ý**: **Square (Gọng vuông)**, **Aviator (Phi công giọt nước)**, **Cat-Eye góc cạnh**.\n✦ **Cơ sở phong cách**: Các góc cạnh sắc sảo của gọng vuông hoặc mắt mèo giúp tạo chiều sâu và cảm giác gương mặt thon gọn, thanh thoát hơn.\n✦ **Nên tránh**: Gọng tròn nhỏ hoặc gọng quá mỏng vì sẽ làm gương mặt trông tròn hơn.`,
      quickActions: ['Gọng vuông Square lịch lãm', 'Phi công Aviator', 'Thử kính AI'],
      productCards: FEATURED_PRODUCTS_MOCK,
    };
  }

  if (lower.includes('mặt vuông') || lower.includes('vuông')) {
    return {
      text: `Dạ, tư vấn dáng kính cho **Mặt vuông (Square)**:\n\n✦ **Đặc điểm**: Quai hàm góc cạnh, vầng trán rộng, đường nét gương mặt sắc nét và quyền lực.\n✦ **Kiểu gọng gợi ý**: **Round (Gọng tròn)**, **Oval mềm mại**, **Aviator thanh mảnh**.\n✦ **Cơ sở phong cách**: Đường cong của gọng tròn sẽ làm dịu đi nét sắc cạnh của khung hàm, tạo sự hài hòa và tinh tế cho gương mặt.`,
      quickActions: ['Gọng tròn Round tinh tế', 'Aviator Titanium', 'Thử kính AI'],
      productCards: FEATURED_PRODUCTS_MOCK,
    };
  }

  if (lower.includes('bảo hành') || lower.includes('đổi trả')) {
    return MOCK_PREVIEW_RESPONSES['Chính sách bảo hành'];
  }

  if (lower.includes('3d') || lower.includes('atelier') || lower.includes('tùy biến')) {
    return MOCK_PREVIEW_RESPONSES['Khám phá 3D Atelier'];
  }

  if (lower.includes('thử kính') || lower.includes('camera') || lower.includes('try-on') || lower.includes('try on')) {
    return MOCK_PREVIEW_RESPONSES['Thử kính AI'];
  }

  if (lower.includes('đơn hàng') || lower.includes('tra cứu') || lower.includes('kiểm tra đơn')) {
    return MOCK_PREVIEW_RESPONSES['Hỗ trợ đơn hàng'];
  }

  // Graceful conversational fallback
  return {
    text: `Chào quý khách! Tôi là Lumina Concierge ✦ — Trợ lý phong cách và kính mắt cao cấp của bạn.\n\nTôi có thể hỗ trợ bạn tìm mẫu kính phù hợp với tỉ lệ khuôn mặt, tra cứu đơn hàng, hoặc hướng dẫn trải nghiệm phòng thiết kế **3D Atelier** và **AI Virtual Try-On**.\n\nQuý khách muốn tôi tư vấn về nội dung nào bên dưới?`,
    quickActions: CORE_QUICK_ACTIONS,
    productCards: FEATURED_PRODUCTS_MOCK,
  };
}

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Ngữ cảnh giao diện theo trang hiện tại (Prompt 07)
  const { clientContext } = useChatContext();

  const [sessionCode, setSessionCode] = useState(() => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // Ensure active session exists on backend
  const getOrCreateSession = useCallback(async () => {
    if (sessionCode) return sessionCode;

    try {
      const res = await createChatSession({ title: 'Tư vấn Lumina Concierge' });
      if (res?.success && res.data?.sessionCode) {
        setSessionCode(res.data.sessionCode);
        localStorage.setItem(SESSION_STORAGE_KEY, res.data.sessionCode);
        return res.data.sessionCode;
      }
    } catch (err) {
      console.warn('[ChatContext] Could not create server session, using client fallback:', err);
    }
    return null;
  }, [sessionCode]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsMinimized(false);
        setUnreadCount(0);
      }
      return next;
    });
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim() || isTyping) return;

      const userText = text.trim();
      const userMsgId = `msg-user-${Date.now()}`;
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      // Append user message
      const userMessage = {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: nowTime,
        status: 'sent',
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      // 1. Attempt live backend chat API call with auto-healing for expired/stale sessions
      try {
        let activeCode = await getOrCreateSession();
        let res = null;

        if (activeCode) {
          try {
            res = await sendChatMessage(activeCode, { content: userText, clientContext });
          } catch (apiErr) {
            // If session expired, deleted, or forbidden (404/403/400), invalidate old session and auto-heal
            if (apiErr?.status === 404 || apiErr?.status === 403 || apiErr?.status === 400) {
              console.warn('[ChatContext] Session invalid or expired (status', apiErr.status, '), auto-healing with fresh session...');
              localStorage.removeItem(SESSION_STORAGE_KEY);
              setSessionCode(null);
              // Create brand new session
              const freshSession = await createChatSession({ title: 'Tư vấn Lumina Concierge' });
              if (freshSession?.success && freshSession.data?.sessionCode) {
                const freshCode = freshSession.data.sessionCode;
                setSessionCode(freshCode);
                localStorage.setItem(SESSION_STORAGE_KEY, freshCode);
                // Retry sending message to fresh session
                res = await sendChatMessage(freshCode, { content: userText, clientContext });
              }
            } else {
              throw apiErr;
            }
          }
        }

        if (res?.success && res.data?.assistantMessage) {
          const assistantData = res.data.assistantMessage;
          const aiMessage = {
            id: `msg-ai-${assistantData.id || Date.now()}`,
            sender: 'ai',
            text: assistantData.content,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
            metadata: assistantData.metadata || null,
            productCards: assistantData.metadata?.productCards || null,
            quickActions: assistantData.metadata?.quickActions || CORE_QUICK_ACTIONS,
          };

          setMessages((prev) => [...prev, aiMessage]);
          setIsTyping(false);
          if (!isOpen || isMinimized) {
            setUnreadCount((c) => c + 1);
          }
          return;
        }
      } catch (err) {
        console.warn('[ChatContext] Backend API call failed, falling back to smart local concierge:', err);
      }

      // 2. Intelligent local fallback if server is unreachable
      setTimeout(() => {
        const smartResponse = getSmartFallbackResponse(userText);

        const aiMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          text: smartResponse.text,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          productCards: smartResponse.productCards || null,
          quickActions: smartResponse.quickActions || CORE_QUICK_ACTIONS,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);

        // If chat is minimized or closed, increase unread
        if (!isOpen || isMinimized) {
          setUnreadCount((c) => c + 1);
        }
      }, 400);
    },
    [isTyping, isOpen, isMinimized, getOrCreateSession, clientContext]
  );

  const retryMessage = useCallback(
    (msgId) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg) return;

      // Mark as sending then succeed
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: 'sending' } : m))
      );

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: 'sent' } : m))
        );
      }, 500);
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    if (sessionCode) {
      deleteChatSession(sessionCode).catch(() => {});
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionCode(null);
    }
  }, [sessionCode]);

  const value = useMemo(
    () => ({
      isOpen,
      isMinimized,
      messages,
      isTyping,
      unreadCount,
      sessionCode,
      openChat,
      closeChat,
      toggleChat,
      toggleMinimize,
      sendMessage,
      retryMessage,
      clearMessages,
    }),
    [
      isOpen,
      isMinimized,
      messages,
      isTyping,
      unreadCount,
      sessionCode,
      openChat,
      closeChat,
      toggleChat,
      toggleMinimize,
      sendMessage,
      retryMessage,
      clearMessages,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
