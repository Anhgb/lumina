import { useState, useEffect, useCallback } from 'react';

/**
 * useLocalStorage — Resilient localStorage hook.
 * Conforms to PRD 5.7 & 9:
 * - Safe JSON parsing with fallback
 * - QuotaExceededError handling
 * - Multi-tab synchronization via 'storage' event
 * - Graceful fallback when storage is inaccessible
 */
export function useLocalStorage(key, initialValue) {
  // Read value from localStorage or fallback
  const readValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState(readValue);

  // Set value and persist to localStorage
  const setValue = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        return false;
      }

      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return true;
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.error(
            `[useLocalStorage] QuotaExceededError: Dung lượng localStorage đã đầy khi lưu "${key}".`,
            error
          );
        } else {
          console.error(`[useLocalStorage] Error setting key "${key}":`, error);
        }
        return false;
      }
    },
    [key, storedValue]
  );

  // Sync state if another tab updates the same key
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors from external changes
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
