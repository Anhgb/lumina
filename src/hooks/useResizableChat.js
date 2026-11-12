import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'lumina_chat_window_dimensions';

export const DEFAULT_CHAT_WIDTH = 360;
export const DEFAULT_CHAT_HEIGHT = 520;
export const MAXIMIZED_CHAT_WIDTH = 580;
export const MAXIMIZED_CHAT_HEIGHT = 680;

export const MIN_CHAT_WIDTH = 320;
export const MIN_CHAT_HEIGHT = 400;

/**
 * useResizableChat.js — Hook quản lý kích thước động của Chatbox bằng chuột/cảm ứng.
 * 
 * Tính năng:
 * - Kéo dãn theo cạnh trên (Height)
 * - Kéo dãn theo cạnh trái (Width)
 * - Kéo dãn góc trên-trái (Both Width & Height)
 * - Lưu kích thước ưa thích vào localStorage
 * - Hỗ trợ Maximize / Restore nhanh
 * - Giới hạn kích thước an toàn theo viewport màn hình
 */
export function useResizableChat() {
  const [dimensions, setDimensions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            width: Math.max(MIN_CHAT_WIDTH, Math.min(parsed.width, 850)),
            height: Math.max(MIN_CHAT_HEIGHT, Math.min(parsed.height, 900)),
          };
        }
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage
    }
    return { width: DEFAULT_CHAT_WIDTH, height: DEFAULT_CHAT_HEIGHT };
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaximizeDimsRef = useRef(null);

  const resizeDirectionRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0, width: DEFAULT_CHAT_WIDTH, height: DEFAULT_CHAT_HEIGHT });

  // Khởi động thao tác kéo chuột
  const startResize = useCallback((direction, e) => {
    // Chỉ kích hoạt khi click chuột trái hoặc touch
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    resizeDirectionRef.current = direction;
    startPosRef.current = {
      x: clientX,
      y: clientY,
      width: dimensions.width,
      height: dimensions.height,
    };
    setIsResizing(true);
    setIsMaximized(false);
  }, [dimensions]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e) => {
      const dir = resizeDirectionRef.current;
      if (!dir) return;

      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

      const { x: startX, y: startY, width: startWidth, height: startHeight } = startPosRef.current;
      
      // Do cửa sổ neo ở góc dưới-phải:
      // Kéo sang trái (clientX giảm) => deltaX tăng => Width tăng
      const deltaX = startX - clientX;
      // Kéo lên trên (clientY giảm) => deltaY tăng => Height tăng
      const deltaY = startY - clientY;

      const maxWidth = Math.min(850, window.innerWidth - 48);
      const maxHeight = Math.min(900, window.innerHeight - 100);

      setDimensions((prev) => {
        let nextWidth = prev.width;
        let nextHeight = prev.height;

        if (dir === 'left' || dir === 'top-left') {
          nextWidth = Math.max(MIN_CHAT_WIDTH, Math.min(startWidth + deltaX, maxWidth));
        }
        if (dir === 'top' || dir === 'top-left') {
          nextHeight = Math.max(MIN_CHAT_HEIGHT, Math.min(startHeight + deltaY, maxHeight));
        }

        return { width: Math.round(nextWidth), height: Math.round(nextHeight) };
      });
    };

    const handleEnd = () => {
      setIsResizing(false);
      resizeDirectionRef.current = null;
      setDimensions((current) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {}
        return current;
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing]);

  // Phóng to / Thu về kích thước trước đó
  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore
      const restoreDims = preMaximizeDimsRef.current || { width: DEFAULT_CHAT_WIDTH, height: DEFAULT_CHAT_HEIGHT };
      setDimensions(restoreDims);
      setIsMaximized(false);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restoreDims));
      } catch {}
    } else {
      // Maximize
      preMaximizeDimsRef.current = dimensions;
      const targetWidth = Math.min(MAXIMIZED_CHAT_WIDTH, window.innerWidth - 48);
      const targetHeight = Math.min(MAXIMIZED_CHAT_HEIGHT, window.innerHeight - 100);
      const maxDims = { width: targetWidth, height: targetHeight };
      setDimensions(maxDims);
      setIsMaximized(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(maxDims));
      } catch {}
    }
  }, [isMaximized, dimensions]);

  // Reset về kích thước mặc định (360x520)
  const resetToDefault = useCallback(() => {
    const defaultDims = { width: DEFAULT_CHAT_WIDTH, height: DEFAULT_CHAT_HEIGHT };
    setDimensions(defaultDims);
    setIsMaximized(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDims));
    } catch {}
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isResizing,
    isMaximized,
    startResize,
    toggleMaximize,
    resetToDefault,
  };
}

