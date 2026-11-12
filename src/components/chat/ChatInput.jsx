import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Send } from 'lucide-react';

const MAX_CHAR_LIMIT = 500;

export default function ChatInput({ onSendMessage, disabled = false }) {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea up to 100px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || disabled) return;

    onSendMessage(inputText.trim());
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const isNearLimit = inputText.length >= MAX_CHAR_LIMIT * 0.8;
  const isOverLimit = inputText.length > MAX_CHAR_LIMIT;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-white border-t border-[rgba(20,20,19,0.08)] sticky bottom-0 z-10"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-end gap-2 bg-[#FAF8F5] border border-[rgba(20,20,19,0.12)] focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 rounded-2xl p-2 transition-all duration-200 shadow-2xs">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          disabled={disabled}
          onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHAR_LIMIT + 20))}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Lumina Concierge đang chuẩn bị câu trả lời...'
              : 'Hỏi Lumina về kính, phong cách, đơn hàng...'
          }
          className="flex-1 bg-transparent text-[13px] text-[#141413] placeholder-[#8E8A82] outline-none resize-none max-h-[100px] leading-relaxed disabled:opacity-50 font-body py-0.5 px-1"
          aria-label="Hỏi Lumina về kính, phong cách, đơn hàng..."
        />

        <button
          type="submit"
          disabled={!inputText.trim() || disabled || isOverLimit}
          title="Gửi câu hỏi (Enter)"
          aria-label="Gửi câu hỏi"
          className="w-8 h-8 rounded-xl bg-[#D4AF37] hover:bg-[#C29D29] text-[#141413] flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 shadow-xs active:scale-95"
        >
          <ArrowUp className="w-4 h-4 text-[#141413] stroke-[2.5]" />
        </button>
      </div>

      {/* Helper text & character counter */}
      <div className="flex items-center justify-between px-1.5 mt-1 text-[10px] text-[#8E8A82]">
        <span className="hidden sm:inline">Nhấn Enter để gửi ✦ Shift+Enter xuống dòng</span>
        <span className="sm:hidden">Nhấn Enter để gửi</span>
        {isNearLimit && (
          <span
            className={`font-mono text-[9px] ${
              isOverLimit ? 'text-rose-600 font-bold' : 'text-[#8E8A82]'
            }`}
          >
            {inputText.length}/{MAX_CHAR_LIMIT}
          </span>
        )}
      </div>
    </form>
  );
}
