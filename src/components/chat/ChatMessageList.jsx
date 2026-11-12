import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';

export default function ChatMessageList({
  messages = [],
  isTyping = false,
  onRetry,
  onSelectAction,
  onCardActionClick,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom on new message or typing state
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const hasOnlyWelcome = messages.length <= 1;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm bg-[#FAF8F5]/90"
      tabIndex={0}
      aria-label="Nội dung cuộc trò chuyện"
    >
      {/* If only the initial welcome message exists, render the luxury Welcome Screen */}
      {hasOnlyWelcome ? (
        <WelcomeScreen
          onSelectAction={onSelectAction}
          disabled={isTyping}
        />
      ) : (
        /* Otherwise render the message stream */
        messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onRetry={onRetry}
            onSelectAction={onSelectAction}
            onCardActionClick={onCardActionClick}
          />
        ))
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="pt-1">
          <TypingIndicator />
        </div>
      )}

      {/* Anchor for auto-scroll */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
