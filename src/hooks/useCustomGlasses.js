import { useContext } from 'react';
import { CustomGlassesContext } from '../context/CustomGlassesContext';

export function useCustomGlasses() {
  const context = useContext(CustomGlassesContext);
  if (!context) {
    throw new Error('useCustomGlasses must be used within a CustomGlassesProvider');
  }
  return context;
}
