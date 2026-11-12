import React, { createContext, useMemo, useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ─── Constants ────────────────────────────────────────────────────────────────
const CART_STORAGE_KEY = 'lumina_cart_items';

export const CartContext = createContext(null);

// ─── Toast icon map ────────────────────────────────────────────────────────────
const TOAST_ICONS = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
};

const TOAST_COLORS = {
  success: 'border-[#D4AF37]/60',
  warning: 'border-amber-500/60',
  error: 'border-red-500/60',
  info: 'border-[#D4AF37]/40',
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [storedItems, setStoredItems] = useLocalStorage(CART_STORAGE_KEY, []);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 3.2 s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  // Sanitize stored items — ensure array, filter invalid entries
  const cartItems = useMemo(() => {
    if (!Array.isArray(storedItems)) return [];
    return storedItems.filter((item) => item && item.id && item.price && item.quantity > 0);
  }, [storedItems]);

  // ── addToCart ──────────────────────────────────────────────────────────────
  /**
   * Add a product to the cart.
   * @param {Object} product - Product data object
   * @param {number} quantity - Number of items to add (default 1)
   */
  const addToCart = useCallback(
    (product, quantity = 1) => {
      if (!product || !product.id) {
        showToast('Lỗi: Dữ liệu sản phẩm không hợp lệ.', 'error');
        return { success: false, message: 'Dữ liệu sản phẩm không hợp lệ.' };
      }

      const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);
      const availableStock = typeof product.stock === 'number' ? product.stock : 999;

      if (availableStock <= 0) {
        showToast(`Sản phẩm "${product.name}" hiện đã hết hàng.`, 'warning');
        return { success: false, message: 'Sản phẩm đã hết hàng.' };
      }

      let updatedItems = [];
      const existingIndex = cartItems.findIndex((item) => item.id === product.id);

      if (existingIndex > -1) {
        const existingItem = cartItems[existingIndex];
        const newTotalQty = existingItem.quantity + qtyToAdd;

        if (newTotalQty > availableStock) {
          const addedQty = Math.max(0, availableStock - existingItem.quantity);

          if (addedQty === 0) {
            showToast(
              `Bạn đã có ${existingItem.quantity} sản phẩm trong giỏ (tối đa tồn kho khả dụng).`,
              'warning'
            );
            return { success: false, message: 'Đã đạt giới hạn tồn kho khả dụng.' };
          }

          updatedItems = cartItems.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: availableStock } : item
          );
          showToast(
            `Đã cập nhật số lượng đến mức tồn kho tối đa (${availableStock} chiếc).`,
            'warning'
          );
        } else {
          updatedItems = cartItems.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: newTotalQty } : item
          );
          showToast(`Đã thêm ${qtyToAdd} sản phẩm "${product.name}" vào giỏ hàng.`, 'success');
        }
      } else {
        const finalQty = Math.min(qtyToAdd, availableStock);
        const newItem = {
          id: product.id,
          productId: product.id,
          name: product.name,
          category: product.category,
          categoryLabel: product.categoryLabel || product.category,
          price: product.price,
          originalPrice: product.originalPrice || null,
          image: product.image,
          quantity: finalQty,
          stock: availableStock,
          dimensions: product.dimensions || '',
          frameMaterial: product.frameMaterial || '',
          productType: product.productType || (product.designSpec ? 'custom' : 'catalog'),
          designSpec: product.designSpec || null,
          snapshotDataUrl: product.snapshotDataUrl || null,
        };
        updatedItems = [...cartItems, newItem];
        showToast(`Đã thêm "${product.name}" vào giỏ hàng.`, 'success');
      }

      const success = setStoredItems(updatedItems);
      if (!success) {
        showToast('Cảnh báo: Không thể lưu vào bộ nhớ trình duyệt do dung lượng đầy.', 'error');
      }
      return { success: true };
    },
    [cartItems, setStoredItems, showToast]
  );

  // ── increaseQuantity ───────────────────────────────────────────────────────
  const increaseQuantity = useCallback(
    (cartItemId) => {
      const item = cartItems.find((i) => i.id === cartItemId);
      if (!item) return;

      if (item.quantity >= item.stock) {
        showToast(`Không thể tăng: Chỉ còn ${item.stock} sản phẩm trong kho.`, 'warning');
        return;
      }

      const updated = cartItems.map((i) =>
        i.id === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
      );
      setStoredItems(updated);
    },
    [cartItems, setStoredItems, showToast]
  );

  // ── decreaseQuantity ───────────────────────────────────────────────────────
  const decreaseQuantity = useCallback(
    (cartItemId) => {
      const item = cartItems.find((i) => i.id === cartItemId);
      if (!item) return;
      if (item.quantity <= 1) return; // Minimum reached

      const updated = cartItems.map((i) =>
        i.id === cartItemId ? { ...i, quantity: i.quantity - 1 } : i
      );
      setStoredItems(updated);
    },
    [cartItems, setStoredItems]
  );

  // ── updateQuantity ─────────────────────────────────────────────────────────
  const updateQuantity = useCallback(
    (cartItemId, newQty) => {
      const item = cartItems.find((i) => i.id === cartItemId);
      if (!item) return;

      const parsed = parseInt(newQty, 10);
      if (isNaN(parsed) || parsed < 1) return;

      const bounded = Math.min(parsed, item.stock);
      if (parsed > item.stock) {
        showToast(
          `Số lượng đã tự điều chỉnh về tồn kho tối đa (${item.stock} chiếc).`,
          'warning'
        );
      }

      const updated = cartItems.map((i) =>
        i.id === cartItemId ? { ...i, quantity: bounded } : i
      );
      setStoredItems(updated);
    },
    [cartItems, setStoredItems, showToast]
  );

  // ── removeFromCart ─────────────────────────────────────────────────────────
  const removeFromCart = useCallback(
    (cartItemId) => {
      const item = cartItems.find((i) => i.id === cartItemId);
      const updated = cartItems.filter((i) => i.id !== cartItemId);
      setStoredItems(updated);
      if (item) {
        showToast(`Đã xóa "${item.name}" khỏi giỏ hàng.`, 'info');
      }
    },
    [cartItems, setStoredItems, showToast]
  );

  // ── clearCart ──────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setStoredItems([]);
    showToast('Đã làm trống giỏ hàng.', 'info');
  }, [setStoredItems, showToast]);

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const totalCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0),
    [cartItems]
  );

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      cartItems,
      totalCount,
      totalPrice,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      updateQuantity,
      removeFromCart,
      clearCart,
      showToast,
      toast,
      closeToast: () => setToast(null),
    }),
    [
      cartItems,
      totalCount,
      totalPrice,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      updateQuantity,
      removeFromCart,
      clearCart,
      showToast,
      toast,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#141413] text-[#FAF8F5] p-4 rounded-sm shadow-2xl border ${TOAST_COLORS[toast.type] || TOAST_COLORS.success} flex items-center justify-between gap-3 animate-fade-in`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[#D4AF37] text-sm flex-shrink-0" aria-hidden="true">
              {TOAST_ICONS[toast.type] || '✓'}
            </span>
            <p className="text-xs font-body leading-snug">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-[#FAF8F5]/60 hover:text-[#FAF8F5] text-xs font-bold px-1 flex-shrink-0"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </CartContext.Provider>
  );
}
