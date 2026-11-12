import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateCustomEyewearPrice } from '../utils/pricingCalculator';
import { FRAME_MODEL_IDS, getFrameModel } from '../data/frameModels';

export const CustomGlassesContext = createContext(null);

// ── Storage key cho persist designSpec ──────────────────────────────────────
const STUDIO_STORAGE_KEY = 'lumina_studio_design';

export const DEFAULT_DESIGN_SPEC = {
  baseModel: 'aviator',
  frameType: 'acetate',
  frameColor: '#D4AF37',
  metalness: 0.9,
  roughness: 0.2,
  lensColor: '#1F2937',
  lensOpacity: 0.45,
  hasRhinestones: false,
  charms: ['lumina-star'],
  engravingText: 'LUMINA',
  // v2: Temple & Engraving (backward-compat defaults)
  templeStyle: 'classic-acetate',
  engravingPlacement: 'outer_temple',
};

// ── Helpers persist ──────────────────────────────────────────────────────────
function loadPersistedSpec() {
  try {
    const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.baseModel) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveSpec(spec) {
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(spec));
  } catch {
    // QuotaExceeded — fail silently, spec still lives in memory
  }
}

export function CustomGlassesProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [designSpec, setDesignSpecState] = useState(() => {
    // 1. URL param takes highest priority
    const initialModel = searchParams.get('model');
    if (initialModel && FRAME_MODEL_IDS.includes(initialModel.toLowerCase())) {
      const modelId = initialModel.toLowerCase();
      return { ...DEFAULT_DESIGN_SPEC, baseModel: modelId, frameType: getFrameModel(modelId).frameType };
    }
    // 2. Restore from localStorage
    const persisted = loadPersistedSpec();
    if (persisted) return persisted;
    // 3. Factory default
    return DEFAULT_DESIGN_SPEC;
  });

  // Wrapper: setDesignSpec + auto-persist
  const setDesignSpec = useCallback((updater) => {
    setDesignSpecState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveSpec(next);
      return next;
    });
  }, []);

  // Keep in sync with URL if user clicks different 3D link
  useEffect(() => {
    const modelParam = searchParams.get('model');
    if (modelParam && FRAME_MODEL_IDS.includes(modelParam.toLowerCase())) {
      setDesignSpec((prev) => {
        if (prev.baseModel !== modelParam.toLowerCase()) {
          const modelId = modelParam.toLowerCase();
          return { ...prev, baseModel: modelId, frameType: getFrameModel(modelId).frameType };
        }
        return prev;
      });
    }
  }, [searchParams, setDesignSpec]);

  // Price calculation
  const priceInfo = useMemo(() => calculateCustomEyewearPrice(designSpec), [designSpec]);

  // Validation (PRD 7.3)
  const isHighOpacityWarning = designSpec.lensOpacity > 0.85;

  // ── Setters ────────────────────────────────────────────────────────────────
  const setBaseModel = useCallback((model) => {
    if (!FRAME_MODEL_IDS.includes(model)) return;
    setDesignSpec((prev) => ({
      ...prev,
      baseModel: model,
      frameType: getFrameModel(model).frameType,
    }));
    setSearchParams((current) => {
      if (current.get('model') === model) return current;
      const next = new URLSearchParams(current);
      next.set('model', model);
      return next;
    }, { replace: true });
  }, [setDesignSpec, setSearchParams]);

  const setFrameColor = useCallback((color, defaultMetalness = null, defaultRoughness = null) => {
    setDesignSpec((prev) => ({
      ...prev,
      frameColor: color,
      metalness: defaultMetalness !== null ? defaultMetalness : prev.metalness,
      roughness: defaultRoughness !== null ? defaultRoughness : prev.roughness,
    }));
  }, [setDesignSpec]);

  const setMetalness = useCallback((val) => {
    const clamped = Math.min(1.0, Math.max(0.0, parseFloat(val) || 0));
    setDesignSpec((prev) => ({ ...prev, metalness: clamped }));
  }, [setDesignSpec]);

  const setRoughness = useCallback((val) => {
    const clamped = Math.min(1.0, Math.max(0.0, parseFloat(val) || 0));
    setDesignSpec((prev) => ({ ...prev, roughness: clamped }));
  }, [setDesignSpec]);

  const setLensColor = useCallback((color) => {
    setDesignSpec((prev) => ({ ...prev, lensColor: color }));
  }, [setDesignSpec]);

  const setLensOpacity = useCallback((val) => {
    // PRD 7.3: Range 0.10 – 0.95
    const clamped = Math.min(0.95, Math.max(0.10, parseFloat(val) || 0.45));
    setDesignSpec((prev) => ({ ...prev, lensOpacity: parseFloat(clamped.toFixed(2)) }));
  }, [setDesignSpec]);

  const toggleRhinestones = useCallback(() => {
    setDesignSpec((prev) => ({ ...prev, hasRhinestones: !prev.hasRhinestones }));
  }, [setDesignSpec]);

  const addCharm = useCallback((charmId) => {
    setDesignSpec((prev) => {
      if (prev.charms.length >= 2) return prev; // PRD 7.3: max 2
      return { ...prev, charms: [...prev.charms, charmId] };
    });
  }, [setDesignSpec]);

  const removeCharm = useCallback((indexToRemove) => {
    setDesignSpec((prev) => ({
      ...prev,
      charms: prev.charms.filter((_, idx) => idx !== indexToRemove),
    }));
  }, [setDesignSpec]);

  const setEngravingText = useCallback((text) => {
    const sanitized = (text || '')
      .replace(/[^\w\s\u00C0-\u1EF9✦♥★-]/gi, '')
      .slice(0, 15);
    setDesignSpec((prev) => ({ ...prev, engravingText: sanitized }));
  }, [setDesignSpec]);

  // v2: Temple style setter
  const VALID_TEMPLE_STYLES = ['classic-acetate', 'slim-metal', 'statement-wide', 'sculpted-comfort'];
  const setTempleStyle = useCallback((style) => {
    if (!VALID_TEMPLE_STYLES.includes(style)) return;
    setDesignSpec((prev) => ({ ...prev, templeStyle: style }));
  }, [setDesignSpec]);

  // v2: Engraving placement setter
  const VALID_ENGRAVING_PLACEMENTS = ['outer_temple', 'inner_temple', 'two_temples'];
  const setEngravingPlacement = useCallback((placement) => {
    if (!VALID_ENGRAVING_PLACEMENTS.includes(placement)) return;
    setDesignSpec((prev) => ({ ...prev, engravingPlacement: placement }));
  }, [setDesignSpec]);

  const resetToDefault = useCallback(() => {
    setDesignSpec(DEFAULT_DESIGN_SPEC);
  }, [setDesignSpec]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      designSpec,
      setDesignSpec,
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
      customPrice: priceInfo.total,
      isHighOpacityWarning,
    }),
    [
      designSpec,
      setDesignSpec,
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
    ]
  );

  return (
    <CustomGlassesContext.Provider value={value}>
      {children}
    </CustomGlassesContext.Provider>
  );
}

