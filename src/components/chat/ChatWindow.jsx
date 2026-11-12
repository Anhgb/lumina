import React, { useEffect, useState } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import { useChat } from '../../hooks/useChat';
import { useResizableChat } from '../../hooks/useResizableChat';

export default function ChatWindow() {
  const {
    isOpen,
    isMinimized,
    messages,
    isTyping,
    closeChat,
    toggleMinimize,
    sendMessage,
    retryMessage,
  } = useChat();

  const {
    width,
    height,
    isResizing,
    isMaximized,
    startResize,
    toggleMaximize: toggleMaximizeWindow,
  } = useResizableChat();

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 640
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeChat]);

  if (!isOpen) return null;

  // Dynamic dimensions on Desktop (maintaining bottom-sheet layout on mobile)
  const desktopStyle = isDesktop
    ? {
        width: `${width}px`,
        height: isMinimized ? '50px' : `${height}px`,
        maxHeight: 'calc(100dvh - 80px)',
        maxWidth: 'calc(100vw - 32px)',
      }
    : {};

  return (
    <div
      role="dialog"
      aria-label="Cửa sổ tư vấn Lumina Concierge AI"
      aria-modal="false"
      className={`fixed z-50 flex flex-col overflow-hidden bg-[#FAF8F5] border border-[rgba(20,20,19,0.12)] animate-concierge-slide-up
        /* Mobile: Bottom Sheet safe layout */
        bottom-0 right-0 w-full rounded-t-[20px] max-h-[88dvh]
        /* Desktop: Anchored at bottom-right with standard 350px baseline */
        sm:bottom-20 sm:right-6 sm:w-[350px] sm:rounded-[20px]
        ${isResizing ? 'transition-none select-none' : 'transition-all duration-200 ease-out'}
        ${
          !isDesktop
            ? isMinimized
              ? 'h-[50px] overflow-hidden'
              : 'h-[85dvh]'
            : isMinimized
            ? 'overflow-hidden'
            : ''
        }
      `}
      style={{
        ...desktopStyle,
        boxShadow: '0 20px 50px -10px rgba(20, 20, 19, 0.22), 0 0 20px rgba(212, 175, 55, 0.08)',
      }}
    >
      {/* Desktop Mouse Resize Handles */}
      {isDesktop && !isMinimized && (
        <>
          {/* Top Edge Handle (Height) */}
          <div
            onMouseDown={(e) => startResize('top', e)}
            onTouchStart={(e) => startResize('top', e)}
            title="Kéo cạnh trên để tùy chỉnh chiều cao"
            className="absolute top-0 left-6 right-6 h-2 -mt-0.5 cursor-ns-resize z-30 group"
          >
            <div className="w-12 h-1 mx-auto mt-0.5 rounded-full bg-transparent group-hover:bg-[#D4AF37]/60 transition-colors" />
          </div>

          {/* Left Edge Handle (Width) */}
          <div
            onMouseDown={(e) => startResize('left', e)}
            onTouchStart={(e) => startResize('left', e)}
            title="Kéo cạnh trái để tùy chỉnh chiều rộng"
            className="absolute top-6 left-0 bottom-6 w-2 -ml-0.5 cursor-ew-resize z-30 group"
          >
            <div className="h-12 w-1 my-auto ml-0.5 rounded-full bg-transparent group-hover:bg-[#D4AF37]/60 transition-colors" />
          </div>

          {/* Top-Left Corner Handle (Width & Height) */}
          <div
            onMouseDown={(e) => startResize('top-left', e)}
            onTouchStart={(e) => startResize('top-left', e)}
            title="Kéo góc để tùy chỉnh kích thước (rộng & cao)"
            className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-40 group flex items-start justify-start p-1.5"
          >
            <span className="w-2.5 h-2.5 border-t-2 border-l-2 border-[#D4AF37]/40 group-hover:border-[#D4AF37] rounded-tl-sm transition-colors shadow-xs" />
          </div>
        </>
      )}

      {/* 1. Header */}
      <ChatHeader
        onMinimize={toggleMinimize}
        onClose={closeChat}
        isMinimized={isMinimized}
        onToggleMaximize={isDesktop ? toggleMaximizeWindow : undefined}
        isMaximized={isMaximized}
      />

      {/* 2. Messages & Input (Hidden when minimized) */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            onRetry={retryMessage}
            onSelectAction={sendMessage}
            onCardActionClick={closeChat}
          />

          <ChatInput
            onSendMessage={sendMessage}
            disabled={isTyping}
          />
        </div>
      )}
    </div>
  );
}
