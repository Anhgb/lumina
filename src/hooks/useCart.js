import { useContext } from 'react';
import { CartContext } from '../context/CartContext';

/**
 * useCart — Hook to access shared cart state
 * @returns {Object} Cart state and actions
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
