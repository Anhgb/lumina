import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, RefreshCw, AlertTriangle, Eye, Sparkles } from 'lucide-react';
import { productService } from '../api/productService';
import { useProductFilter } from '../hooks/useProductFilter';
import ProductCard from '../components/product/ProductCard';
import ProductFilterBar from '../components/product/ProductFilterBar';
import ProductQuickViewModal from '../components/product/ProductQuickViewModal';

const ITEMS_PER_PAGE = 8;

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Initialize filter hook
  const {
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
    filteredProducts,
    totalCount,
    resultCount,
    hasActiveFilters,
    resetFilters,
  } = useProductFilter(products);

  // Sync category from URL search query (e.g. /catalog?category=cateye)
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    if (urlCategory && ['cateye', 'aviator', 'round', 'square'].includes(urlCategory.toLowerCase())) {
      setSelectedCategory(urlCategory.toLowerCase());
    }
    const urlFace = searchParams.get('face');
    if (urlFace && ['Round', 'Square', 'Oval', 'Heart', 'Diamond'].includes(urlFace)) {
      setSelectedFaceShape(urlFace);
    }
  }, [searchParams, setSelectedCategory, setSelectedFaceShape]);

  // Load products from API / local dataset
  const fetchProductList = async () => {
    setLoading(true);
    setError(null);
    try {
      const { products: loadedProducts } = await productService.getProducts();
      setProducts(loadedProducts);
    } catch (err) {
      console.error('[CatalogPage] Failed to load products:', err);
      setError('Không thể kết nối danh mục sản phẩm. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductList();
  }, []);

  // Products to display based on load more pagination
  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] pb-24">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <ol className="flex items-center space-x-2 text-xs text-[#141413]/60 font-body">
          <li>
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">
              Trang chủ
            </Link>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-[#141413]/40" />
          <li className="font-semibold text-[#141413] tracking-wide" aria-current="page">
            Bộ sưu tập kính
          </li>
        </ol>
      </nav>

      {/* 2. Editorial Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-b border-[#D6D3CD]">
        <div className="max-w-3xl space-y-4">
          <div className="lumina-descriptor">LUMINA ATELIER</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-[#141413] tracking-tight">
            Bộ Sưu Tập Kính Thời Trang
          </h1>
          <p className="text-xs sm:text-sm text-[#141413]/75 font-body leading-relaxed max-w-2xl">
            Tất cả thiết kế gọng kính được chế tác tỉ mỉ từ Titan, Acetate cao cấp và mạ vàng 18K.
            Sử dụng bộ lọc dáng mặt để nhận gợi ý từ trí tuệ nhân tạo AI hoặc mở phòng thiết kế 3D
            để phối màu theo phong cách riêng của bạn.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-[#141413]/60 pt-2">
            <span>✦ {totalCount} mẫu thiết kế độc quyền</span>
            <span>•</span>
            <span>4 dáng gọng biểu tượng</span>
          </div>
        </div>
      </header>

      {/* 3. Main Catalog Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Filter and Search Bar */}
        <ProductFilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedFaceShape={selectedFaceShape}
          setSelectedFaceShape={setSelectedFaceShape}
          selectedPriceRange={selectedPriceRange}
          setSelectedPriceRange={setSelectedPriceRange}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          sortBy={sortBy}
          setSortBy={setSortBy}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
          resultCount={resultCount}
          totalCount={totalCount}
        />

        {/* 4. Product Grid Area with Loading, Error, Empty, and Success states */}
        {loading ? (
          /* Loading State: Shimmering Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white border border-[#D6D3CD] rounded-sm p-4 space-y-4">
                <div className="aspect-[4/3] bg-[#D6D3CD]/30 rounded-sm" />
                <div className="h-4 bg-[#D6D3CD]/40 rounded w-2/3" />
                <div className="h-3 bg-[#D6D3CD]/30 rounded w-full" />
                <div className="h-5 bg-[#D6D3CD]/50 rounded w-1/2 pt-2" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="h-8 bg-[#D6D3CD]/30 rounded" />
                  <div className="h-8 bg-[#D6D3CD]/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State with Retry Button */
          <div className="text-center py-20 bg-white border border-[#D6D3CD] rounded-sm p-8 max-w-lg mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-[#DC2626]/10 text-[#DC2626] rounded-full mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="font-brand text-lg font-bold text-[#141413]">
              Không thể tải danh mục sản phẩm
            </h3>
            <p className="text-xs text-[#141413]/70 font-body leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={fetchProductList}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141413] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#D4AF37] hover:text-[#141413] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : displayedProducts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white border border-[#D6D3CD] rounded-sm p-8 max-w-lg mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-[#FAF8F5] text-[#D4AF37] rounded-full mx-auto flex items-center justify-center border border-[#D6D3CD]">
              <Eye className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-brand text-xl font-bold text-[#141413]">
                Không tìm thấy mẫu kính phù hợp
              </h3>
              <p className="text-xs text-[#141413]/70 font-body leading-relaxed">
                Rất tiếc, không có sản phẩm nào khớp với các tiêu chí lọc hiện tại của bạn.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={resetFilters}
                className="px-6 py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-wider rounded-sm"
              >
                Đặt lại toàn bộ bộ lọc
              </button>
            </div>
          </div>
        ) : (
          /* Product Grid */
          <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  activeFaceShape={selectedFaceShape}
                  onQuickView={(p) => setQuickViewProduct(p)}
                />
              ))}
            </div>

            {/* Load More Pagination Button */}
            {hasMore && (
              <div className="text-center pt-8 border-t border-[#D6D3CD]/60 space-y-3">
                <p className="text-xs text-[#141413]/60 font-mono">
                  Đang hiển thị {displayedProducts.length} trên tổng số {filteredProducts.length} sản phẩm
                </p>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-white border border-[#141413] text-[#141413] hover:bg-[#141413] hover:text-[#FAF8F5] transition-all text-xs font-semibold uppercase tracking-[0.2em] rounded-sm shadow-sm"
                >
                  Tải Thêm Sản Phẩm ({filteredProducts.length - displayedProducts.length} còn lại)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}
