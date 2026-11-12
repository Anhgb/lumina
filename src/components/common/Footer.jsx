import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="bg-[#FAF8F5] border-t border-[#D6D3CD] pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-[#D6D3CD]">
          {/* Brand Info Column */}
          <div className="md:col-span-1 space-y-4">
            <BrandLogo />
            <p className="text-xs text-[#141413]/70 leading-relaxed font-body pt-2">
              Lumina Eyewear — Nền tảng thương mại điện tử kính mắt thời trang cao cấp thế hệ mới.
              Kết hợp công nghệ Client-Side AI và xưởng chế tác 3D độc bản.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[#D4AF37]">
              <span className="text-sm">✦</span>
              <span className="text-[11px] uppercase tracking-widest text-[#141413]/80 font-medium">
                Bespoke Atelier & AI Stylist
              </span>
            </div>
          </div>

          {/* Column 2: Khám phá */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#141413]">
              Khám Phá
            </h4>
            <ul className="space-y-2 text-xs text-[#141413]/75 font-body">
              <li>
                <Link to="/catalog" className="hover:text-[#D4AF37] transition-colors">
                  Tất cả bộ sưu tập
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=cateye" className="hover:text-[#D4AF37] transition-colors">
                  Dáng mắt mèo (Cat-Eye)
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=aviator" className="hover:text-[#D4AF37] transition-colors">
                  Dáng phi công (Aviator)
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=round" className="hover:text-[#D4AF37] transition-colors">
                  Gọng tròn cổ điển (Round)
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=square" className="hover:text-[#D4AF37] transition-colors">
                  Gọng vuông hiện đại (Square)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trải nghiệm công nghệ */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#141413]">
              Công Nghệ
            </h4>
            <ul className="space-y-2 text-xs text-[#141413]/75 font-body">
              <li>
                <Link to="/studio-3d" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
                  <span>3D Bespoke Studio</span>
                  <span className="text-[9px] bg-[#141413] text-[#FAF8F5] px-1 py-0.2 rounded font-mono">3D</span>
                </Link>
              </li>
              <li>
                <Link to="/try-on" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
                  <span>AI Virtual Try-On</span>
                  <span className="text-[9px] bg-[#D4AF37] text-[#141413] px-1 py-0.2 rounded font-bold">AI</span>
                </Link>
              </li>
              <li>
                <span className="text-[#141413]/50 cursor-not-allowed">
                  Phân tích tỷ lệ nhân trắc
                </span>
              </li>
              <li>
                <span className="text-[#141413]/50 cursor-not-allowed">
                  Bảo chứng tròng quang học
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Tạp chí & Bản tin */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#141413]">
              Editorial
            </h4>
            <p className="text-xs text-[#141413]/70 font-body leading-relaxed">
              Nhận thông báo về bộ sưu tập giới hạn và lời khuyên phong cách từ AI Stylist định kỳ.
            </p>
            <div className="flex items-center border border-[#D6D3CD] rounded-sm bg-white overflow-hidden focus-within:border-[#141413]">
              <input
                type="email"
                placeholder="email@cuaban.com"
                className="w-full px-3 py-2 text-xs outline-none bg-transparent text-[#141413]"
              />
              <button
                type="button"
                className="px-3 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#141413] transition-colors whitespace-nowrap"
              >
                Đăng ký
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#141413]/60 font-body gap-4">
          <p>© {new Date().getFullYear()} LUMINA EYEWEAR. Bản quyền thuộc về Đồ án Web Frontend Nâng cao.</p>
          <div className="flex items-center space-x-6">
            <span>Bảo mật dữ liệu (Client Edge AI)</span>
            <span>Chính sách đổi trả</span>
            <Link to="/403" className="hover:text-[#141413]">
              Kiểm tra 403
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
