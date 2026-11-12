/**
 * Canonical dimensions shared by the procedural frame and face fitter.
 * Lengths are model units, not millimeters.
 */
export const GLASSES_FIT_PROFILES = Object.freeze({
  aviator: { eyeSpan: 1.56, frameWidth: 2.84, frameHeight: 1.12, hingeX: 1.4, templeLength: 2.75 },
  cateye: { eyeSpan: 1.56, frameWidth: 2.84, frameHeight: 0.96, hingeX: 1.4, templeLength: 2.75 },
  round: { eyeSpan: 1.56, frameWidth: 2.6, frameHeight: 0.96, hingeX: 1.4, templeLength: 2.75 },
  square: { eyeSpan: 1.56, frameWidth: 2.68, frameHeight: 0.8, hingeX: 1.4, templeLength: 2.75 },
  'modern-pilot': { eyeSpan: 1.56, frameWidth: 2.86, frameHeight: 1.16, hingeX: 1.4, templeLength: 2.75 },
  'sculpted-cateye': { eyeSpan: 1.56, frameWidth: 3.0, frameHeight: 0.99, hingeX: 1.4, templeLength: 2.75 },
  'oversized-square': { eyeSpan: 1.56, frameWidth: 2.94, frameHeight: 0.99, hingeX: 1.49, templeLength: 2.75 },
  'slim-oval': { eyeSpan: 1.56, frameWidth: 2.74, frameHeight: 0.82, hingeX: 1.4, templeLength: 2.75 },
  'geometric-hexagon': { eyeSpan: 1.56, frameWidth: 2.72, frameHeight: 0.86, hingeX: 1.4, templeLength: 2.75 },
  'bug-eye': { eyeSpan: 1.56, frameWidth: 2.96, frameHeight: 1.14, hingeX: 1.49, templeLength: 2.75 },
});

export const DEFAULT_GLASSES_FIT_PROFILE = GLASSES_FIT_PROFILES.aviator;

export function getGlassesFitProfile(modelId) {
  return GLASSES_FIT_PROFILES[modelId] || DEFAULT_GLASSES_FIT_PROFILE;
}

