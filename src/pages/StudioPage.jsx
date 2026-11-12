import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Box, ShieldCheck, Award, Flame, Eye, Settings2 } from 'lucide-react';
import { useCustomGlasses } from '../hooks/useCustomGlasses';
import ThreeDCustomizer from '../components/studio3d/ThreeDCustomizer';
import ModelSelector from '../components/studio3d/ModelSelector';
import FrameControls from '../components/studio3d/FrameControls';
import LensControls from '../components/studio3d/LensControls';
import AccessoriesControls from '../components/studio3d/AccessoriesControls';
import TempleControls from '../components/studio3d/TempleControls';
import EngravingControls from '../components/studio3d/EngravingControls';
import ViewPresetControls from '../components/studio3d/ViewPresetControls';
import StudioSummaryBar from '../components/studio3d/StudioSummaryBar';

export default function StudioPage() {
  const customizerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'view'
  const {
    designSpec,
    setBaseModel,
    setFrameColor,
    setMetalness,
    setRoughness,
    setLensColor,
    setLensOpacity,
    toggleRhinestones,
    addCharm,
    removeCharm,
    setEngravingText,
    setTempleStyle,
    setEngravingPlacement,
    resetToDefault,
    priceInfo,
    isHighOpacityWarning,
  } = useCustomGlasses();

  // Snapshot handler triggered by summary bar
  const handleCaptureSnapshot = () => {
    if (customizerRef.current?.captureSnapshot) {
      return customizerRef.current.captureSnapshot();
    }
    return null;
  };

  // Camera view preset handler
  const handleSetView = ({ pos, target }) => {
    if (customizerRef.current?.setCamera) {
      customizerRef.current.setCamera(pos, target);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#FAF8F5] pb-24 font-body">
      {/* 1. Minimalist Editorial Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3">
        <ol className="flex items-center space-x-2 text-[11px] font-mono text-[#FAF8F5]/50 uppercase tracking-widest">
          <li>
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">
              Trang chủ
            </Link>
          </li>
          <ChevronRight className="w-3 h-3 text-[#FAF8F5]/20" />
          <li>
            <Link to="/catalog" className="hover:text-[#D4AF37] transition-colors">
              Bộ sưu tập
            </Link>
          </li>
          <ChevronRight className="w-3 h-3 text-[#FAF8F5]/20" />
          <li className="font-semibold text-[#D4AF37]" aria-current="page">
            3D Bespoke Atelier
          </li>
        </ol>
      </nav>

      {/* 2. Editorial Studio Header (Section 3.2) */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#D6D3CD]/15 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37]">
              <span>✦</span>
              <span>LUMINA EYEWEAR / BESPOKE ATELIER</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#FAF8F5]">
              Design Your <span className="italic font-display font-light text-[#D4AF37]">Signature</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#FAF8F5]/65 max-w-2xl font-body leading-relaxed">
              Personalize every detail. Create a frame that is uniquely yours — chọn 4 kiểu Classic hoặc 6 style preset Trending 2026,
              cùng vật liệu acetate/kim loại, màu tròng, đá và chữ khắc laser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            {/* Live 3D Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141413] border border-[#D4AF37]/30 text-[#D4AF37]">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
              </span>
              <span className="text-[10px] tracking-widest uppercase">LIVE 3D PREVIEW</span>
            </div>

            {/* Spec count */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-[#D6D3CD]/20 text-[#FAF8F5]/70 text-[10px] uppercase tracking-wider">
              <span className="text-[#D4AF37]">4/4</span>
              <span>TÙY CHỌN CẤU HÌNH</span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Atelier Studio Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 3D Viewport (7 cols ~58%) */}
          <section
            aria-label="3D Eyewear Viewport"
            className="lg:col-span-7 flex flex-col space-y-4 lg:sticky lg:top-24"
          >
            {/* 3D WebGL Canvas Card */}
            <div className="w-full h-[500px] sm:h-[560px] lg:h-[620px] bg-[#0C0C0C] border border-[#D6D3CD]/20 rounded-sm shadow-2xl overflow-hidden relative ring-1 ring-white/5">
              <ThreeDCustomizer
                ref={customizerRef}
                designSpec={designSpec}
                className="w-full h-full"
              />
            </div>

            {/* View Preset Controls (Góc nhìn nhanh) */}
            <ViewPresetControls onSetView={handleSetView} />

            {/* Architectural Quality Strip */}
            <div className="grid grid-cols-3 divide-x divide-[#D6D3CD]/15 bg-[#121212]/90 border border-[#D6D3CD]/15 rounded-sm p-3.5 shadow-lg">
              <div className="flex items-center justify-center gap-2.5 px-2">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <div className="text-[10px] leading-tight text-left">
                  <p className="font-semibold text-[#FAF8F5] uppercase tracking-wider">Titanium & Vàng 18K</p>
                  <p className="text-[#FAF8F5]/50 font-mono text-[9px]">Hợp kim siêu nhẹ bền bỉ</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 px-2">
                <Flame className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <div className="text-[10px] leading-tight text-left">
                  <p className="font-semibold text-[#FAF8F5] uppercase tracking-wider">Laser Sợi Quang</p>
                  <p className="text-[#FAF8F5]/50 font-mono text-[9px]">Khắc 1064nm sắc nét</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 px-2">
                <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <div className="text-[10px] leading-tight text-left">
                  <p className="font-semibold text-[#FAF8F5] uppercase tracking-wider">Watermark Bản Quyền</p>
                  <p className="text-[#FAF8F5]/50 font-mono text-[9px]">Chứng thực WebGL độc bản</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Customization Controls & Summary (5 cols ~42%) */}
          <section aria-label="Customization Controls" className="lg:col-span-5 space-y-6">
            {/* Control Modules in Clean Architectural Atelier Card */}
            <div className="space-y-6 bg-[#121212]/90 backdrop-blur-md border border-[#D6D3CD]/15 p-6 rounded-sm shadow-2xl">
              {/* 1. Base Model */}
              <ModelSelector
                currentModel={designSpec.baseModel}
                onSelectModel={setBaseModel}
              />

              <hr className="border-[#D6D3CD]/10" />

              {/* 2. Frame Color & Materials */}
              <FrameControls
                frameColor={designSpec.frameColor}
                metalness={designSpec.metalness}
                roughness={designSpec.roughness}
                onSelectColor={setFrameColor}
                onChangeMetalness={setMetalness}
                onChangeRoughness={setRoughness}
              />

              <hr className="border-[#D6D3CD]/10" />

              {/* 3. Lens Color & Opacity */}
              <LensControls
                lensColor={designSpec.lensColor}
                lensOpacity={designSpec.lensOpacity}
                onSelectLensColor={setLensColor}
                onChangeLensOpacity={setLensOpacity}
                isHighOpacityWarning={isHighOpacityWarning}
              />

              <hr className="border-[#D6D3CD]/10" />

              {/* 4. Temple Style (v2 — NEW) */}
              <TempleControls
                templeStyle={designSpec.templeStyle || 'classic-acetate'}
                onSelectTempleStyle={setTempleStyle}
              />

              <hr className="border-[#D6D3CD]/10" />

              {/* 5. Engraving Placement & Text (v2 — NEW, replaces old in AccessoriesControls) */}
              <EngravingControls
                engravingText={designSpec.engravingText || ''}
                engravingPlacement={designSpec.engravingPlacement || 'outer_temple'}
                onChangeEngravingText={setEngravingText}
                onChangeEngravingPlacement={setEngravingPlacement}
              />

              <hr className="border-[#D6D3CD]/10" />

              {/* 6. Rhinestones & Charms (accessories only — engraving moved above) */}
              <AccessoriesControls
                hasRhinestones={designSpec.hasRhinestones}
                onToggleRhinestones={toggleRhinestones}
                charms={designSpec.charms}
                onAddCharm={addCharm}
                onRemoveCharm={removeCharm}
                engravingText={designSpec.engravingText}
                onChangeEngravingText={setEngravingText}
              />
            </div>

            {/* 5. Pricing Summary & Export Actions */}
            <StudioSummaryBar
              designSpec={designSpec}
              priceInfo={priceInfo}
              onReset={resetToDefault}
              onCaptureSnapshot={handleCaptureSnapshot}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
