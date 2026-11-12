import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ProductRecommendationCard from './ProductRecommendationCard';
import QuickActions from './QuickActions';

/**
 * Format markdown-like text (bold **text**, links [text](url), inline `code`, bullet points ✦) safely into JSX
 */
function parseFormattedSpans(text) {
  if (!text) return null;
  // Regex to split by bold (**...**), markdown link ([...](...)), and inline code (`...`)
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|\`.*?\`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`b-${idx}`} className="font-semibold text-[#141413]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`c-${idx}`} className="font-mono bg-[#FAF8F5] px-1 py-0.5 rounded text-[11px] border border-[#D6D3CD]/60 text-[#141413]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      return (
        <a
          key={`a-${idx}`}
          href={url}
          className="text-[#D4AF37] underline font-semibold hover:text-[#141413] transition-colors"
          target={url.startsWith('http') ? '_blank' : undefined}
          rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {label}
        </a>
      );
    }
    return part;
  });
}

function renderFormattedContent(text) {
  if (!text) return null;

  return text.split('\n\n').map((paragraph, pIdx) => {
    const lines = paragraph.split('\n');

    return (
      <p key={`p-${pIdx}`} className={pIdx > 0 ? 'mt-2' : ''}>
        {lines.map((line, lIdx) => (
          <React.Fragment key={`l-${lIdx}`}>
            {lIdx > 0 && <br />}
            {parseFormattedSpans(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

export default function ChatMessage({ message, onRetry, onSelectAction, onCardActionClick }) {
  const isAI = message.sender === 'ai';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';

  return (
    <div
      className={`flex flex-col gap-1 w-full ${
        isAI ? 'items-start' : 'items-end'
      } animate-fade-in`}
    >
      {/* Sender Header for AI */}
      {isAI && (
        <div className="flex items-center gap-1.5 ml-1 text-[11px] text-[#8E8A82]">
          <div className="w-3.5 h-3.5 rounded-full bg-[#141413] flex items-center justify-center text-[#D4AF37] flex-shrink-0">
            <span className="text-[8px] font-bold">✦</span>
          </div>
          <span className="font-brand font-semibold text-[#141413] text-[10px] tracking-widest uppercase">
            LUMINA CONCIERGE
          </span>
          <span className="text-[9px] text-[#A8A49C]">{message.timestamp}</span>
        </div>
      )}

      {/* Bubble Container */}
      <div className="flex items-end gap-1.5 max-w-[88%] sm:max-w-[85%]">
        {/* Error Retry Button on left of User bubble */}
        {!isAI && isError && (
          <button
            type="button"
            onClick={() => onRetry?.(message.id)}
            title="Thử gửi lại"
            aria-label="Thử gửi lại tin nhắn"
            className="p-1 rounded-full text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          className={`px-3.5 py-2.5 text-[13px] leading-relaxed transition-all ${
            isAI
              ? 'bg-white border border-[rgba(20,20,19,0.08)] text-[#141413] rounded-2xl rounded-tl-xs shadow-2xs'
              : 'bg-[#141413] text-[#FAF8F5] border border-[#262624] rounded-2xl rounded-tr-xs shadow-xs'
          } ${isError ? 'border-rose-300 bg-rose-50 text-rose-900' : ''} ${
            isSending ? 'opacity-70' : ''
          }`}
        >
          {/* Main message text */}
          <div className="break-words">
            {isAI ? renderFormattedContent(message.text) : message.text}
          </div>

          {/* Timestamp for user message */}
          {!isAI && (
            <div className="mt-1 text-[9px] text-right text-[#FAF8F5]/50 flex items-center justify-end gap-1 font-mono">
              {isSending && <span className="italic">Đang gửi...</span>}
              {isError && (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> Thất bại
                </span>
              )}
              {!isSending && !isError && <span>{message.timestamp}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Product Recommendation Cards (if any) */}
      {isAI && message.productCards && message.productCards.length > 0 && (
        <div className="w-full pl-1 mt-2 space-y-2">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#8E8A82] flex items-center gap-1">
            <span className="text-[#D4AF37]">✦</span> Tuyệt tác đề xuất riêng cho bạn
          </p>
          <div className="flex flex-col gap-2.5">
            {message.productCards.map((product) => (
              <ProductRecommendationCard
                key={product.id}
                product={product}
                onActionClick={onCardActionClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Confirmation / Preview Card (Prompt 07) */}
      {isAI && message.metadata?.actionButton && (
        <div className="pl-1 mt-2 w-full max-w-sm">
          <div className="bg-[#FAF8F5] border border-[#D4AF37]/50 rounded-lg p-3 space-y-2 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] flex items-center gap-1 font-semibold">
              <span>✦</span> Yêu Cầu Xác Nhận Khách Hàng
            </div>
            <p className="text-[11px] text-[#141413]/70 leading-relaxed">
              Bản xem trước đã sẵn sàng. Bấm xác nhận bên dưới để mở trang gửi phiếu:
            </p>
            <a
              href={message.metadata.actionButton.url}
              className="inline-flex items-center justify-center w-full px-3.5 py-2 bg-[#141413] hover:bg-[#D4AF37] hover:text-[#141413] text-[#FAF8F5] text-xs font-semibold rounded transition text-center shadow-xs"
            >
              {message.metadata.actionButton.label}
            </a>
          </div>
        </div>
      )}

      {/* Quick Action Suggestion Chips (if any) */}
      {isAI && message.quickActions && message.quickActions.length > 0 && (
        <div className="pl-1 mt-1.5">
          <QuickActions
            actions={message.quickActions}
            onSelectAction={onSelectAction}
          />
        </div>
      )}
    </div>
  );
}
