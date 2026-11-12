import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] bg-[#FAF8F5] text-[#141413] py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center space-y-6 bg-white border border-[#D6D3CD] p-8 sm:p-12 rounded-sm shadow-md">
        <div className="w-16 h-16 bg-[#FAF8F5] border border-[#D6D3CD] rounded-full mx-auto flex items-center justify-center text-[#D4AF37]">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#141413]/60">
            LỖI 404 — KHÔNG TÌM THẤY TRANG
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-light text-[#141413]">
            Trang Không Tồn Tại
          </h1>
          <p className="text-xs sm:text-sm text-[#141413]/70 font-body leading-relaxed">
            Đường dẫn bạn yêu cầu không nằm trong sơ đồ trang của Lumina Eyewear.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-medium uppercase tracking-wider rounded-sm"
          >
            <Home className="w-4 h-4" />
            <span>Trở về Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
