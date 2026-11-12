import React from 'react';
import { Star } from 'lucide-react';

/**
 * StarRating component supporting display and interactive input.
 * 
 * @param {object} props
 * @param {number} props.rating Current rating (1-5)
 * @param {function} [props.onChange] Callback for interactive rating
 * @param {string} [props.size='md'] Size: 'sm', 'md', 'lg'
 * @param {boolean} [props.showText=false] Show numerical rating text
 */
export default function StarRating({
  rating = 0,
  onChange,
  size = 'md',
  showText = false,
  className = '',
}) {
  const isInteractive = typeof onChange === 'function';

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }[size] || 'w-5 h-5';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onClick={() => isInteractive && onChange(star)}
            className={`transition-colors ${
              isInteractive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            }`}
            aria-label={`${star} sao`}
          >
            <Star
              className={`${sizeClasses} ${
                isFilled
                  ? 'fill-[#D4AF37] text-[#D4AF37]'
                  : 'fill-transparent text-[#D4AF37]/30'
              }`}
            />
          </button>
        );
      })}
      {showText && (
        <span className="ml-1.5 font-medium text-stone-800 text-sm">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

