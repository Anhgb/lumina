import { useState, useMemo, useCallback } from 'react';
import { PRICE_RANGES } from '../data/products';

/**
 * useProductFilter — Custom hook for client-side filtering and sorting.
 * Conforms to PRD 5.2:
 * - Search: Case-insensitive via toLowerCase().includes()
 * - Category filter: all, aviator, cateye, round, square
 * - Face shape filter: all, Round, Square, Oval, Heart, Diamond
 * - Price range filter
 * - In-stock filter
 * - Sorting: featured, price-asc, price-desc, name-asc, newest
 * - In-memory useMemo optimization (no API calls on filter change)
 */
export function useProductFilter(products = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFaceShape, setSelectedFaceShape] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      selectedCategory !== 'all' ||
      selectedFaceShape !== 'all' ||
      selectedPriceRange !== 'all' ||
      inStockOnly === true
    );
  }, [searchTerm, selectedCategory, selectedFaceShape, selectedPriceRange, inStockOnly]);

  // Reset all filters to initial state
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedFaceShape('all');
    setSelectedPriceRange('all');
    setInStockOnly(false);
    setSortBy('featured');
  }, []);

  // Compute filtered & sorted product list
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    let result = [...products];

    // 1. Search filter: Matches name, category label, or description
    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.categoryLabel?.toLowerCase().includes(normalizedQuery) ||
          item.description?.toLowerCase().includes(normalizedQuery)
      );
    }

    // 2. Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(
        (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 3. Face shape filter (Exact match against recommendedFaces array)
    if (selectedFaceShape !== 'all') {
      result = result.filter(
        (item) =>
          Array.isArray(item.recommendedFaces) &&
          item.recommendedFaces.includes(selectedFaceShape)
      );
    }

    // 4. Price range filter
    if (selectedPriceRange !== 'all') {
      const range = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
      if (range) {
        result = result.filter(
          (item) => item.price >= range.min && item.price <= range.max
        );
      }
    }

    // 5. In-stock only filter
    if (inStockOnly) {
      result = result.filter((item) => (item.stock ?? 0) > 0);
    }

    // 6. Sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    return result;
  }, [
    products,
    searchTerm,
    selectedCategory,
    selectedFaceShape,
    selectedPriceRange,
    inStockOnly,
    sortBy,
  ]);

  return {
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
    totalCount: products.length,
    resultCount: filteredProducts.length,
    hasActiveFilters,
    resetFilters,
  };
}
