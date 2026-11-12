/**
 * useChatContext.js — Lumina AI Context Collector Hook
 *
 * Thu thập ngữ cảnh giao diện phù hợp theo trang hiện tại:
 *   /studio-3d       -> designSpec từ CustomGlassesContext
 *   /try-on          -> faceAnalysis nếu có (qua prop drilling từ TryOnPage)
 *   /product/:id     -> productId đang xem
 *   /catalog         -> không có gì đặc biệt
 *
 * BẢO MẬT: KHÔNG gửi ảnh camera, dữ liệu sinh trắc học, API key,
 * hay thông tin nhạy cảm vào AI Provider.
 *
 * Chỉ gửi:
 *   - currentPage (pathname hiện tại)
 *   - activeProductId (ID sản phẩm đang xem)
 *   - designSpec (tùy chỉnh 3D nếu đang ở Studio) — không bao gồm snapshot/image
 *   - detectedFaceShape (kết quả dáng mặt nếu đã phân tích) — KHÔNG bao gồm landmark raw
 */

import { useContext, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CustomGlassesContext } from '../context/CustomGlassesContext';

/**
 * Sanitize designSpec để gửi lên backend — loại bỏ ảnh snapshot và dữ liệu thừa.
 * Chỉ giữ các trường cần thiết cho AI giải thích.
 */
function sanitizeDesignSpec(designSpec) {
  if (!designSpec) return null;
  const {
    baseModel,
    frameType,
    frameColor,
    metalness,
    roughness,
    lensColor,
    lensOpacity,
    hasRhinestones,
    charms,
    engravingText,
  } = designSpec;
  return {
    baseModel,
    frameType,
    frameColor,
    metalness: typeof metalness === 'number' ? parseFloat(metalness.toFixed(2)) : metalness,
    roughness: typeof roughness === 'number' ? parseFloat(roughness.toFixed(2)) : roughness,
    lensColor,
    lensOpacity: typeof lensOpacity === 'number' ? parseFloat(lensOpacity.toFixed(2)) : lensOpacity,
    hasRhinestones: Boolean(hasRhinestones),
    charms: Array.isArray(charms) ? charms : [],
    engravingText: engravingText || '',
  };
}

/**
 * Hook thu thập clientContext theo trang hiện tại.
 *
 * @param {object} [extraContext] - Dữ liệu bổ sung (ví dụ faceAnalysis từ TryOnPage)
 * @returns {{ clientContext: object|null }}
 */
export function useChatContext(extraContext = {}) {
  const location = useLocation();
  const pathname = location.pathname;

  // Lấy CustomGlassesContext nếu khả dụng (Provider có thể không wrap mọi trang)
  const glassesCtx = useContext(CustomGlassesContext);

  const clientContext = useMemo(() => {
    // Xác định loại trang
    const isStudio = pathname === '/studio-3d' || pathname.startsWith('/studio');
    const isTryOn = pathname === '/try-on' || pathname.startsWith('/try-on');
    const isProduct = pathname.startsWith('/product/');
    const isCatalog = pathname === '/catalog';

    const ctx = {
      currentPage: pathname,
    };

    // Trang 3D Atelier: gửi designSpec đã sanitize
    if (isStudio && glassesCtx?.designSpec) {
      ctx.pageType = 'studio';
      ctx.designSpec = sanitizeDesignSpec(glassesCtx.designSpec);
      // Thêm giá tùy chỉnh nếu có (giúp AI nêu tổng chi phí)
      if (glassesCtx.priceInfo?.total) {
        ctx.customPrice = glassesCtx.priceInfo.total;
      }
    }

    // Trang AI Try-On
    if (isTryOn) {
      ctx.pageType = 'tryon';
      // Chỉ gửi kết quả shape (string), KHÔNG gửi landmarks hay ảnh camera
      if (extraContext?.detectedFaceShape) {
        ctx.detectedFaceShape = extraContext.detectedFaceShape;
      }
      // Model đang được ướm thử trên camera
      if (glassesCtx?.designSpec?.baseModel) {
        ctx.activeFrameModel = glassesCtx.designSpec.baseModel;
      }
    }

    // Trang chi tiết sản phẩm
    if (isProduct) {
      ctx.pageType = 'product';
      const productId = pathname.split('/product/')[1]?.split('/')[0] || null;
      if (productId) ctx.activeProductId = productId;
    }

    // Trang catalog
    if (isCatalog) {
      ctx.pageType = 'catalog';
    }

    // Nếu không có gì đặc biệt (trang chủ, checkout, v.v.)
    if (!isStudio && !isTryOn && !isProduct && !isCatalog) {
      ctx.pageType = 'general';
    }

    return ctx;
  }, [pathname, glassesCtx, extraContext]);

  return { clientContext };
}

export default useChatContext;

