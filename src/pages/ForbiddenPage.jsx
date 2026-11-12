import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[75vh] bg-[#FAF8F5] text-[#141413] py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center space-y-6 bg-white border border-[#D6D3CD] p-8 sm:p-12 rounded-sm shadow-md">
        <div className="w-16 h-16 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-full mx-auto flex items-center justify-center text-[#DC2626]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#DC2626]">
            MÃ LỖI: 403 FORBIDDEN
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-light text-[#141413]">
            Truy Cập Bị Từ Chối
          </h1>
          <p className="text-xs sm:text-sm text-[#141413]/70 font-body leading-relaxed">
            Bạn không có đặc quyền truy cập vào khu vực này. Trang quản trị yêu cầu phiên xác thực
            với vai trò <strong>Admin</strong>.
          </p>
        </div>

        <div className="p-4 bg-[#FAF8F5] rounded border border-[#D6D3CD]/60 text-xs text-[#141413]/80 leading-relaxed font-body">
          Nếu bạn là quản trị viên trong quá trình thử nghiệm đồ án, bạn có thể chuyển đổi nhanh vai trò sang <strong>Admin</strong>
          bằng <strong>Quick Role Switcher</strong> ở góc dưới bên trái màn hình.
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-medium uppercase tracking-wider rounded-sm"
          >
            <Home className="w-4 h-4" />
            <span>Về Trang chủ</span>
          </Link>
          <Link
            to="/catalog"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-[#D6D3CD] text-[#141413] hover:bg-[#FAF8F5] transition-colors text-xs font-medium uppercase tracking-wider rounded-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xem Bộ sưu tập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
