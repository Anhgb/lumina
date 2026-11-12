import React, { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { CATEGORIES, FACE_SHAPES, PRICE_RANGES } from '../../data/products';

/**
 * ProductFilterBar — Comprehensive filter & sort control panel.
 * Conforms to PRD 5.2:
 * - Search by term (debounced 300ms)
 * - Filter by category
 * - Filter by 5 face shapes (Round, Square, Oval, Heart, Diamond)
 * - Filter by price range
 * - Filter by in-stock status
 * - Sort options
 * - Responsive mobile drawer
 */
export default function ProductFilterBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedFaceShape,
  setSelectedFaceShape,
  selectedPriceRange,
  setSelectedPriceRange,
  inStockOnly,
  setInStockOnly,
  sortBy,
  setSortBy,
  hasActiveFilters,
  resetFilters,
  resultCount,
  totalCount,
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Sync external changes (e.g., reset filters) into local input state
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Debounce pushing localSearch to parent filter (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, setSearchTerm]);

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Primary Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white border border-[#D6D3CD] rounded-sm shadow-sm">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#141413]/50">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm kiếm mẫu kính, kiểu gọng, chất liệu..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-[#FAF8F5] border border-[#D6D3CD] rounded-sm text-[#141413] placeholder-[#141413]/40 focus:outline-none focus:border-[#141413] focus:bg-white transition-colors"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#141413]/40 hover:text-[#141413]"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Action Utilities (Sort + Mobile Filter Toggle + Reset) */}
        <div className="flex items-center gap-3 justify-between lg:justify-end">
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D6D3CD] text-[#141413] text-xs font-semibold uppercase tracking-wider rounded-sm hover:border-[#141413]"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
            <span>Bộ lọc</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <label htmlFor="sort-select" className="hidden sm:inline text-xs text-[#141413]/60 font-medium whitespace-nowrap">
              Sắp xếp:
            </label>
            <div className="relative flex-1 sm:flex-initial">
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 text-xs bg-[#FAF8F5] border border-[#D6D3CD] text-[#141413] font-medium rounded-sm focus:outline-none focus:border-[#141413] cursor-pointer"
              >
                <option value="featured">✦ Nổi bật nhất</option>
                <option value="price-asc">Giá: Thấp đến Cao</option>
                <option value="price-desc">Giá: Cao đến Thấp</option>
                <option value="name-asc">Tên: A — Z</option>
                <option value="newest">Sản phẩm mới nhất</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#141413]/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs text-[#DC2626] hover:bg-[#DC2626]/10 rounded-sm font-medium transition-colors"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Filter Bar (Visible on lg screens) */}
      <div className="hidden lg:grid grid-cols-12 gap-6 p-6 bg-white border border-[#D6D3CD] rounded-sm">
        {/* 1. Category Filter Tabs (5 cols) */}
        <div className="col-span-5 space-y-2 border-r border-[#D6D3CD]/60 pr-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#141413]/70">
            Kiểu Dáng Gọng Kính
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs rounded-sm transition-all font-medium ${
                    isActive
                      ? 'bg-[#141413] text-[#FAF8F5] shadow-sm'
                      : 'bg-[#FAF8F5] text-[#141413]/80 hover:bg-[#D6D3CD]/40'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Face Shape Filter (4 cols) */}
        <div className="col-span-4 space-y-2 border-r border-[#D6D3CD]/60 pr-6">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#141413]/70">
              Dáng Mặt Khuyên Dùng
            </span>
            <span className="text-[10px] text-[#D4AF37] font-mono">✦ AI</span>
          </div>
          <div className="relative pt-1">
            <select
              value={selectedFaceShape}
              onChange={(e) => setSelectedFaceShape(e.target.value)}
              className="w-full appearance-none px-3 py-2 text-xs bg-[#FAF8F5] border border-[#D6D3CD] rounded-sm text-[#141413] font-medium focus:outline-none focus:border-[#141413] cursor-pointer"
            >
              {FACE_SHAPES.map((shape) => (
                <option key={shape.id} value={shape.id}>
                  {shape.label} {shape.desc ? `— ${shape.desc}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#141413]/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none mt-0.5" />
          </div>
        </div>

        {/* 3. Price & Stock Options (3 cols) */}
        <div className="col-span-3 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#141413]/70">
              Khoảng Giá
            </span>
            <div className="relative pt-1">
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full appearance-none px-3 py-2 text-xs bg-[#FAF8F5] border border-[#D6D3CD] rounded-sm text-[#141413] font-medium focus:outline-none focus:border-[#141413] cursor-pointer"
              >
                {PRICE_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#141413]/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none mt-0.5" />
            </div>
          </div>

          {/* In-stock toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-2 select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded border-[#D6D3CD] text-[#141413] focus:ring-0 accent-[#141413] cursor-pointer"
            />
            <span className="text-xs text-[#141413]/80 font-medium">Chỉ xem hàng có sẵn</span>
          </label>
        </div>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-full max-w-xs bg-[#FAF8F5] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D6D3CD]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="font-brand text-base font-bold uppercase tracking-wider text-[#141413]">
                    Bộ Lọc Sản Phẩm
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-[#141413]/60 hover:text-[#141413]"
                  aria-label="Đóng bộ lọc"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Category */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                  Kiểu Dáng Gọng
                </span>
                <div className="flex flex-col gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-2 text-xs rounded text-left transition-colors font-medium ${
                        selectedCategory === cat.id
                          ? 'bg-[#141413] text-[#FAF8F5]'
                          : 'bg-white text-[#141413] border border-[#D6D3CD]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Face shape */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                  Dáng Mặt Khuyên Dùng
                </span>
                <select
                  value={selectedFaceShape}
                  onChange={(e) => setSelectedFaceShape(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6D3CD] rounded text-[#141413]"
                >
                  {FACE_SHAPES.map((shape) => (
                    <option key={shape.id} value={shape.id}>
                      {shape.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Price range */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                  Khoảng Giá
                </span>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6D3CD] rounded text-[#141413]"
                >
                  {PRICE_RANGES.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. In-stock checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#141413]"
                />
                <span className="text-xs text-[#141413] font-medium">Chỉ xem hàng có sẵn</span>
              </label>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#D6D3CD] space-y-2">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-3 bg-[#141413] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider rounded"
              >
                Áp Dụng ({resultCount} sản phẩm)
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    resetFilters();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full py-2 text-xs text-[#DC2626] font-medium"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags Summary */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#141413]/70 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span>Hiển thị: </span>
          <span className="font-bold text-[#141413] font-mono">
            {resultCount} / {totalCount} sản phẩm
          </span>

          {/* Active chips */}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#141413] text-[#FAF8F5] text-[11px]">
              <span>{CATEGORIES.find((c) => c.id === selectedCategory)?.label}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="hover:text-[#D4AF37]"
              >
                ×
              </button>
            </span>
          )}

          {selectedFaceShape !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-[#141413] font-semibold text-[11px]">
              <span>Dáng {selectedFaceShape}</span>
              <button
                type="button"
                onClick={() => setSelectedFaceShape('all')}
                className="hover:text-black font-bold"
              >
                ×
              </button>
            </span>
          )}

          {selectedPriceRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#D6D3CD] text-[#141413] text-[11px]">
              <span>{PRICE_RANGES.find((r) => r.id === selectedPriceRange)?.label}</span>
              <button
                type="button"
                onClick={() => setSelectedPriceRange('all')}
                className="hover:text-[#DC2626]"
              >
                ×
              </button>
            </span>
          )}

          {inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#D6D3CD] text-[#141413] text-[11px]">
              <span>Còn hàng</span>
              <button
                type="button"
                onClick={() => setInStockOnly(false)}
                className="hover:text-[#DC2626]"
              >
                ×
              </button>
            </span>
          )}

          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#D6D3CD] text-[#141413] text-[11px]">
              <span>Từ khóa: "{searchTerm}"</span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="hover:text-[#DC2626]"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-[#DC2626] hover:underline font-medium mt-2 sm:mt-0"
          >
            Xóa tất cả bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}
