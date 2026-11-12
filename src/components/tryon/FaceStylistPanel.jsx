import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Eye,
  Sliders,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { configService } from '../../api/configService';
import { products } from '../../data/products';
import { validatePD } from '../../utils/validators';

export default function FaceStylistPanel({
  faceAnalysis,
  currentModel,
  onSelectModel,
  onSelectColor,
  onSaveFaceShape,
}) {
  const [skinTone, setSkinTone] = useState('warm'); // 'warm' | 'cool' | 'neutral'
  const [occasion, setOccasion] = useState('office'); // 'office' | 'beach' | 'evening'
  const [customPD, setCustomPD] = useState('');
  const [pdConfirmed, setPdConfirmed] = useState(false);
  const [pdError, setPdError] = useState('');

  const detectedShape = faceAnalysis?.shape || 'oval';
  const hasFace = Boolean(faceAnalysis);

  const advice = configService.getAdviceForShape(detectedShape);

  // Filter products matching this face shape from catalog
  const matchingProducts = products
    .filter(
      (p) =>
        Array.isArray(p.recommendedFaces) &&
        p.recommendedFaces.some(
          (f) => f.toLowerCase() === detectedShape.toLowerCase() || f.toLowerCase() === advice.shapeNameVi.toLowerCase()
        )
    )
    .slice(0, 3);

  // PD Confirmation Handler
  const handleConfirmPD = () => {
    const val = customPD.trim();
    if (!val) {
      setPdError('Camera không được hiệu chuẩn để đo PD theo milimét. Hãy nhập PD từ đơn kính hoặc kết quả đo chuyên môn.');
      setPdConfirmed(false);
      return;
    }
    const res = validatePD(val);
    if (!res.isValid) {
      setPdError(res.message);
      setPdConfirmed(false);
    } else {
      setPdError('');
      setPdConfirmed(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Face Shape Classification Result Card */}
      <div className="bg-[#141413] border border-[#D6D3CD]/20 p-5 rounded-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D6D3CD]/15">
          <div className="flex items-center gap-2">
            <span className="text-[#D4AF37] text-sm">✦</span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#FAF8F5]/80">
              KẾT QUẢ PHÂN LOẠI DÁNG MẶT AI
            </span>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            Rule-based 478 Landmark
          </span>
        </div>

        {hasFace ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-mono text-[#FAF8F5]/50">Dáng mặt nhận diện:</p>
                <h3 className="font-brand text-2xl font-bold text-[#D4AF37]">
                  {advice.shapeNameVi} ({advice.shape})
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <p className="text-xs text-[#FAF8F5]/80 font-body leading-relaxed bg-[#0D0D0D] p-3 rounded border border-[#D6D3CD]/10">
              {advice.description}
            </p>

            {/* Relative fit ratio; it is not a physical measurement. */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
              <div className="p-2.5 bg-[#0D0D0D] border border-[#D6D3CD]/10 rounded-sm">
                <span className="text-[10px] text-[#FAF8F5]/50 block">Tỷ lệ gọng / gò má:</span>
                <span className="font-bold text-[#FAF8F5] text-sm">
                  {Math.round((faceAnalysis.fitRatio || 0) * 100)}%
                </span>
                <span className="text-[9px] text-[#D4AF37] block mt-0.5">Tỷ lệ hình ảnh, không phải số đo</span>
              </div>

              <div className="p-2.5 bg-[#0D0D0D] border border-[#D6D3CD]/10 rounded-sm">
                <span className="text-[10px] text-[#FAF8F5]/50 block">Độ nghiêng đầu (Roll):</span>
                <span className="font-bold text-[#FAF8F5] text-sm">
                  {Math.round((faceAnalysis.rollAngle * 180) / Math.PI)}°
                </span>
                <span className={`text-[9px] block mt-0.5 ${Math.abs(Math.round((faceAnalysis.rollAngle * 180) / Math.PI)) <= 8 ? 'text-[#15803D]' : 'text-[#D4AF37]'}`}>
                  {Math.abs(Math.round((faceAnalysis.rollAngle * 180) / Math.PI)) <= 8 ? 'Cân bằng chuẩn' : 'Có độ nghiêng'}
                </span>
              </div>
            </div>

            {/* PD Confirmation Form (PRD 7.2) */}
            <div className="p-3 bg-[#0D0D0D] border border-[#D6D3CD]/15 rounded-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#FAF8F5]">
                <span>Xác nhận số đo khoảng cách đồng tử (PD):</span>
                <span className="text-[10px] font-mono text-[#FAF8F5]/50">Chuẩn 50–75mm</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Nhập PD từ đơn kính / kết quả đo"
                  value={customPD}
                  onChange={(e) => setCustomPD(e.target.value)}
                  min={50}
                  max={75}
                  className="w-full px-3 py-1.5 text-xs bg-[#141413] text-[#FAF8F5] border border-[#D6D3CD]/30 rounded-sm outline-none focus:border-[#D4AF37] font-mono"
                />
                <button
                  type="button"
                  onClick={handleConfirmPD}
                  className="px-3 py-1.5 bg-[#FAF8F5] text-[#141413] hover:bg-[#D4AF37] transition-colors text-[11px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0"
                >
                  Xác nhận
                </button>
              </div>

              {pdError && (
                <p className="text-[10px] text-[#DC2626] font-body flex items-start gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{pdError}</span>
                </p>
              )}
              {pdConfirmed && (
                <p className="text-[10px] text-[#15803D] font-body flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã ghi nhận số đo PD hợp lệ cho đơn kính.</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2 text-[#FAF8F5]/60">
            <HelpCircle className="w-8 h-8 mx-auto text-[#D4AF37]/60" />
            <p className="text-xs font-body">
              Chưa phát hiện khuôn mặt. Hãy <strong>Bật Camera</strong> và hướng thẳng vào màn hình để AI
              tính toán tỷ lệ dáng mặt của bạn.
            </p>
          </div>
        )}

        {/* Medical disclaimer note */}
        <p className="text-[9px] text-[#FAF8F5]/40 font-body leading-relaxed pt-2 border-t border-[#D6D3CD]/10 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#D4AF37]" />
          <span>
            Lưu ý: Camera chỉ phân tích tỷ lệ hình ảnh, không đo PD theo milimét do chưa hiệu chuẩn.
            Chỉ dùng PD từ đơn kính hoặc kết quả đo chuyên môn; gợi ý dáng mặt chỉ mang tính thẩm mỹ.
          </span>
        </p>
      </div>

      {/* 2. AI Stylist Styling Advice & Model Quick Apply */}
      <div className="bg-[#141413] border border-[#D6D3CD]/20 p-5 rounded-sm shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#D6D3CD]/15">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="font-brand text-lg font-bold text-[#FAF8F5]">Tư Vấn Phong Cách AI</h3>
        </div>

        {/* Stylist Explanation */}
        <p className="text-xs text-[#FAF8F5]/80 font-body leading-relaxed bg-[#0D0D0D] p-3 rounded border border-[#D6D3CD]/10">
          {advice.stylingAdvice}
        </p>

        {/* Quick Recommended Models to Test on Webcam */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono text-[#FAF8F5]/50">
            Dáng kính gợi ý tốt nhất cho bạn:
          </span>
          <div className="flex flex-wrap gap-2">
            {advice.recommendedFrames.map((frameId) => {
              const isCurrent = currentModel === frameId;
              return (
                <button
                  key={frameId}
                  type="button"
                  onClick={() => onSelectModel(frameId)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#D4AF37] text-[#141413] border-[#D4AF37] shadow-sm font-bold'
                      : 'bg-[#0D0D0D] border-[#D6D3CD]/30 text-[#FAF8F5] hover:border-[#D4AF37]'
                  }`}
                >
                  <span>{frameId}</span>
                  {isCurrent && <span className="text-[10px]">● Đang thử</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skin Tone & Occasion Customizer */}
        <div className="pt-2 border-t border-[#D6D3CD]/15 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-mono text-[#FAF8F5]/50">
              Tông da (Skin Tone):
            </span>
            <div className="flex gap-1.5">
              {[
                { id: 'warm', name: 'Vàng Ấm', color: '#D4AF37' },
                { id: 'cool', name: 'Trắng Sáng', color: '#C0C0C0' },
                { id: 'neutral', name: 'Trung Tính', color: '#141413' },
              ].map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => {
                    setSkinTone(tone.id);
                    onSelectColor?.(tone.color);
                  }}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    skinTone === tone.id
                      ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/15'
                      : 'border-white/10 text-[#FAF8F5]/60 hover:text-[#FAF8F5]'
                  }`}
                >
                  {tone.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Matching Products from Catalog */}
      <div className="bg-[#141413] border border-[#D6D3CD]/20 p-5 rounded-sm shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D6D3CD]/15">
          <h4 className="font-brand text-sm font-bold text-[#FAF8F5]">
            Mẫu Kính Có Sẵn Hợp Dáng Mặt Này
          </h4>
          <Link
            to={`/catalog?faceShape=${detectedShape}`}
            className="text-[10px] font-mono text-[#D4AF37] hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        <div className="space-y-2.5">
          {matchingProducts.map((p) => (
            <div
              key={p.id}
              className="p-2.5 bg-[#0D0D0D] border border-[#D6D3CD]/15 rounded-sm flex items-center justify-between gap-3 group hover:border-[#D4AF37]/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-12 h-12 object-cover rounded-sm border border-[#D6D3CD]/20"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#FAF8F5] truncate group-hover:text-[#D4AF37] transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[10px] font-mono text-[#FAF8F5]/50">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(p.price)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectModel(p.category)}
                className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded border border-[#D6D3CD]/30 text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] hover:border-[#D4AF37] transition-colors flex-shrink-0"
              >
                Ướm thử
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
