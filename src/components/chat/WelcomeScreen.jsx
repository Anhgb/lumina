import React from 'react';
import { Sparkles, Compass, Search, PackageCheck, ShieldCheck, Award, Wrench } from 'lucide-react';
import { CORE_QUICK_ACTIONS } from '../../context/ChatContext';

const ACTION_ICONS = {
  'Theo dõi đơn': PackageCheck,
  'Yêu cầu hỗ trợ': ShieldCheck,
  'Điểm thành viên': Award,
  'Bảo quản kính': Wrench,
  'Tư vấn chọn kính': Sparkles,
  'Tìm sản phẩm': Search,
  'Khám phá 3D Atelier': Compass,
  'Hỗ trợ đơn hàng': PackageCheck,
};

const ACTION_DESCRIPTIONS = {
  'Theo dõi đơn': 'Tra cứu tiến trình chế tác & vận chuyển',
  'Yêu cầu hỗ trợ': 'Bảo hành & cân chỉnh Lumina Care',
  'Điểm thành viên': 'Xem số dư điểm & phân hạng thẻ',
  'Bảo quản kính': 'Cẩm nang vệ sinh sóng siêu âm',
  'Tư vấn chọn kính': 'Định hình phong cách chuẩn dáng mặt',
  'Tìm sản phẩm': 'Bộ sưu tập kính mạ vàng & Titanium',
  'Khám phá 3D Atelier': 'Chế tác Bespoke 3D độc bản',
  'Hỗ trợ đơn hàng': 'Tra cứu hành trình vận chuyển',
};

export default function WelcomeScreen({ onSelectAction, disabled = false }) {
  return (
    <div className="py-6 px-3 text-center space-y-5 animate-fade-in">
      {/* Monogram emblem */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[#141413] border border-[#D4AF37]/50 flex items-center justify-center shadow-md">
          <span className="font-brand text-lg font-bold text-[#D4AF37]">✦</span>
        </div>
        <span className="mt-2 text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
          ATELIER CONCIERGE
        </span>
      </div>

      {/* Editorial Title & Description */}
      <div className="space-y-2">
        <h2 className="font-display text-2xl sm:text-[26px] font-normal text-[#141413] tracking-tight leading-snug">
          Chào mừng đến với Lumina.
        </h2>
        <p className="text-xs text-[#6B6B6B] font-body max-w-[320px] mx-auto leading-relaxed">
          Tôi là trợ lý cá nhân của bạn, sẵn sàng đồng hành từ tư vấn thiết kế đến hỗ trợ sau mua Lumina Care & Quyền lợi thành viên.
        </p>
      </div>

      {/* 4 Core Quick Actions (2x2 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-left">
        {CORE_QUICK_ACTIONS.map((action) => {
          const Icon = ACTION_ICONS[action] || Sparkles;
          const desc = ACTION_DESCRIPTIONS[action] || '';

          return (
            <button
              key={action}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAction(action)}
              className="group p-3 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[rgba(20,20,19,0.08)] hover:border-[#D4AF37]/60 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] group-hover:bg-[#141413] border border-[#D6D3CD]/60 group-hover:border-[#D4AF37] flex items-center justify-center text-[#141413] group-hover:text-[#D4AF37] flex-shrink-0 transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#141413] group-hover:text-[#D4AF37] transition-colors truncate">
                  {action}
                </p>
                <p className="text-[10px] text-[#8E8A82] leading-tight line-clamp-1 mt-0.5">
                  {desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

