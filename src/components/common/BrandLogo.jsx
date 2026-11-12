import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * BrandLogo — Official logo implementation for LUMINA EYEWEAR.
 * Primary source: /assets/logo-lumina.jpg
 * Compact / Fallback: Vector Monogram L + Cat-Eye + ✦ Star
 *
 * @param {boolean} compact - If true, displays the compact icon/monogram
 * @param {string} className - Extra CSS classes
 * @param {string} variant - 'light' (inverted on dark background) or 'dark' (on light background)
 */
export default function BrandLogo({ compact = false, className = '', variant = 'dark' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isLight = variant === 'light';

  return (
    <Link
      to="/"
      aria-label="Lumina Eyewear Home"
      className={`group inline-flex items-center gap-3 transition-opacity duration-300 hover:opacity-90 ${className}`}
    >
      {!compact && !imageFailed ? (
        /* Official Logo Image from public/assets/logo-lumina.jpg */
        <div className="relative flex items-center h-10 sm:h-12 overflow-hidden rounded-sm transition-transform duration-300 group-hover:scale-[1.02]">
          <img
            src="/assets/logo-lumina.jpg"
            alt="LUMINA EYEWEAR"
            onError={() => setImageFailed(true)}
            className={`h-full w-auto object-contain ${
              isLight ? 'brightness-125 contrast-125 invert' : 'mix-blend-multiply'
            }`}
          />
        </div>
      ) : (
        /* Vector Monogram Mark (Used for compact mode or as fallback) */
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center flex-shrink-0">
            <svg
              viewBox="0 0 100 100"
              className="w-10 h-10 transition-transform duration-500 ease-out group-hover:scale-105"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke={isLight ? 'rgba(214, 211, 205, 0.4)' : '#D6D3CD'}
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Serif L */}
              <path d="M28 26 H42" stroke={isLight ? '#FAF8F5' : '#141413'} strokeWidth="3" strokeLinecap="square" />
              <path d="M35 26 V74" stroke={isLight ? '#FAF8F5' : '#141413'} strokeWidth="4" strokeLinecap="square" />
              <path d="M28 74 H66" stroke={isLight ? '#FAF8F5' : '#141413'} strokeWidth="4" strokeLinecap="square" />

              {/* Cat-Eye single-line contour */}
              <path
                d="M22 56 C 26 40, 48 38, 68 45 C 75 47, 80 43, 82 38"
                stroke={isLight ? '#FAF8F5' : '#141413'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Four-pointed star sparkle ✦ */}
              <path
                d="M80 24 C80 29 83 32 88 32 C83 32 80 35 80 40 C80 35 77 32 72 32 C77 32 80 29 80 24 Z"
                fill="#D4AF37"
              />
            </svg>
          </div>

          {!compact && (
            <div className="flex flex-col select-none">
              <div
                className="flex items-baseline tracking-[0.25em] font-brand text-xl font-bold leading-none"
                style={{ color: isLight ? '#FAF8F5' : '#141413' }}
              >
                <span>LUMIN</span>
                <span className="relative inline-block ml-[0.05em]">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[0.9em] h-[0.9em] inline-block"
                    fill="none"
                    stroke={isLight ? '#FAF8F5' : '#141413'}
                    strokeWidth="2.8"
                  >
                    <path d="M4 22 L12 2 L20 22" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 mt-1 text-[9px] font-medium tracking-[0.35em] uppercase"
                style={{ color: isLight ? '#FAF8F5' : '#141413' }}
              >
                <span className="w-3 h-[1px] bg-[#D6D3CD] opacity-60"></span>
                <span>EYEWEAR</span>
                <span className="w-3 h-[1px] bg-[#D6D3CD] opacity-60"></span>
              </div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
