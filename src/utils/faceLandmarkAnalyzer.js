/**
 * faceLandmarkAnalyzer.js — Geometric ratio analysis, approximate head-pose
 * fitting, and 5 Face Shape Classification.
 * Conforms to PRD Section III & Prompt 6:
 * - 5 Groups: Round, Square, Oval, Heart, Diamond
 * - Moving average temporal smoothing over frames
 * - Eye-corner-based fit, roll/yaw/pitch estimates, and model-relative sizing
 * - Explicit separation between normalized landmarks and canvas/model coordinates
 */

import { getGlassesFitProfile } from './glassesFitProfiles.js';

export class FaceShapeSmoother {
  constructor(bufferSize = 12) {
    this.bufferSize = bufferSize;
    this.history = [];
  }

  addSample(shape) {
    if (!shape) return;
    this.history.push(shape);
    if (this.history.length > this.bufferSize) {
      this.history.shift();
    }
  }

  getSmoothedShape() {
    if (this.history.length === 0) return 'oval';

    const counts = {};
    for (const s of this.history) {
      counts[s] = (counts[s] || 0) + 1;
    }

    let maxShape = 'oval';
    let maxCount = 0;
    for (const [shape, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxShape = shape;
      }
    }
    return maxShape;
  }

  reset() {
    this.history = [];
  }
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
function dist2D(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/** Map normalized MediaPipe coordinates through the same fit used by the preview. */
export function mapLandmarkToViewport(point, {
  sourceWidth,
  sourceHeight,
  viewportWidth = sourceWidth,
  viewportHeight = sourceHeight,
  objectFit = 'contain',
  mirrored = false,
  devicePixelRatio = 1,
} = {}) {
  if (!point || !sourceWidth || !sourceHeight || !viewportWidth || !viewportHeight) return null;
  const scaleX = viewportWidth / sourceWidth;
  const scaleY = viewportHeight / sourceHeight;
  const fitScale = objectFit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const fittedWidth = sourceWidth * fitScale;
  const fittedHeight = sourceHeight * fitScale;
  const offsetX = (viewportWidth - fittedWidth) / 2;
  const offsetY = (viewportHeight - fittedHeight) / 2;
  const sourceX = (mirrored ? 1 - point.x : point.x) * sourceWidth;
  return {
    x: (offsetX + sourceX * fitScale) * devicePixelRatio,
    y: (offsetY + point.y * sourceHeight * fitScale) * devicePixelRatio,
    z: (point.z || 0) * sourceWidth * fitScale * devicePixelRatio,
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isPoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const midpoint = (a, b) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: ((a.z || 0) + (b.z || 0)) / 2,
});

/**
 * Fit a model-relative glasses group to normalized Face Landmarker points.
 * Returned `*Px` anchors are canvas pixels; `modelAnchors` use procedural
 * eyewear units. Pose is a conservative landmark estimate, not a measurement.
 */
export function computeGlassesFit(landmarks, canvasWidth, canvasHeight, mapping = {}) {
  if (!landmarks || landmarks.length < 468 || !canvasWidth || !canvasHeight) return null;

  const mapPoint = (point) => mapLandmarkToViewport(point, {
    sourceWidth: canvasWidth,
    sourceHeight: canvasHeight,
    viewportWidth: canvasWidth,
    viewportHeight: canvasHeight,
    ...mapping,
  });

  // Canthi are more stable for frame placement than iris centers, which move with gaze.
  const eyeA = mapPoint(midpoint(landmarks[33], landmarks[133]));
  const eyeB = mapPoint(midpoint(landmarks[362], landmarks[263]));
  const outerA = mapPoint(landmarks[33]);
  const outerB = mapPoint(landmarks[263]);
  const noseTip = mapPoint(landmarks[1]);
  const bridgeLandmark = {
    x: landmarks[6].x * 0.7 + landmarks[168].x * 0.3,
    y: landmarks[6].y * 0.7 + landmarks[168].y * 0.3,
  };
  const bridgePx = mapPoint(bridgeLandmark);
  const cheekA = mapPoint(landmarks[234]);
  const cheekB = mapPoint(landmarks[454]);
  if (![eyeA, eyeB, outerA, outerB, noseTip, bridgePx, cheekA, cheekB].every(isPoint)) return null;

  // Sort after the caller applies the preview's mirror convention.
  const [leftEyePx, rightEyePx, leftOuterEyePx, rightOuterEyePx] = eyeA.x <= eyeB.x
    ? [eyeA, eyeB, outerA, outerB]
    : [eyeB, eyeA, outerB, outerA];
  const dx = rightEyePx.x - leftEyePx.x;
  const dy = rightEyePx.y - leftEyePx.y;
  const eyeDistancePx = Math.hypot(dx, dy);
  if (!Number.isFinite(eyeDistancePx) || eyeDistancePx < 10) return null;

  const axis = { x: dx / eyeDistancePx, y: dy / eyeDistancePx };
  const normal = { x: -axis.y, y: axis.x };
  const centerPx = {
    x: (leftEyePx.x + rightEyePx.x) / 2,
    y: (leftEyePx.y + rightEyePx.y) / 2,
  };
  const noseDelta = { x: noseTip.x - centerPx.x, y: noseTip.y - centerPx.y };
  const noseAlongEyeAxis = (noseDelta.x * axis.x + noseDelta.y * axis.y) / eyeDistancePx;
  const noseAlongFaceVertical = (noseDelta.x * normal.x + noseDelta.y * normal.y) / eyeDistancePx;
  const yaw = clamp(Math.atan2(noseAlongEyeAxis, 0.55), -0.65, 0.65);
  const pitch = clamp((noseAlongFaceVertical - 0.38) * 1.2, -0.5, 0.5);
  const rollAngle = Math.atan2(dy, dx);

  const profile = getGlassesFitProfile(mapping.baseModel);
  const cheekboneWidthPx = Math.hypot(cheekB.x - cheekA.x, cheekB.y - cheekA.y);
  const eyeBasedScale = eyeDistancePx / profile.eyeSpan;
  // Cheek landmarks can compress under yaw, so their width may trim at most
  // 18% from the eye-based fit rather than driving the fit on their own.
  const faceLimitedScale = cheekboneWidthPx > 0
    ? (cheekboneWidthPx * 1.02) / profile.frameWidth
    : eyeBasedScale;
  const frameScale = Math.max(eyeBasedScale * 0.82, Math.min(eyeBasedScale, faceLimitedScale));
  const frameWidthPx = profile.frameWidth * frameScale;
  const frameHeightPx = profile.frameHeight * frameScale;
  const hingeOffsetPx = profile.hingeX * frameScale;
  const hingeLeftPx = {
    x: centerPx.x - axis.x * hingeOffsetPx,
    y: centerPx.y - axis.y * hingeOffsetPx,
  };
  const hingeRightPx = {
    x: centerPx.x + axis.x * hingeOffsetPx,
    y: centerPx.y + axis.y * hingeOffsetPx,
  };
  const fitRatio = cheekboneWidthPx > 0 ? frameWidthPx / cheekboneWidthPx : null;
  const trackingQuality = clamp(
    Math.min(1, eyeDistancePx / 48) * (1 - Math.max(0, Math.abs(yaw) - 0.45) * 0.55),
    0.25,
    1
  );

  return {
    coordinateSpaces: {
      sourceLandmarks: 'normalized-image',
      anchors: 'canvas-pixel',
      modelAnchors: 'procedural-model-unit',
    },
    centerPx,
    leftEyePx,
    rightEyePx,
    leftOuterEyePx,
    rightOuterEyePx,
    bridgePx,
    hingeLeftPx,
    hingeRightPx,
    eyeDistancePx,
    cheekboneWidthPx,
    frameWidthPx,
    frameHeightPx,
    frameScale,
    fitRatio,
    rollAngle,
    yaw,
    pitch,
    trackingQuality,
    // No ear landmarks are assumed; these define the model's hinge and rearward path.
    modelAnchors: {
      hingeLeft: { x: -profile.hingeX, y: 0.16, z: 0 },
      hingeRight: { x: profile.hingeX, y: 0.16, z: 0 },
      templeDirection: { x: 0, y: 0, z: -1 },
      templeLength: profile.templeLength,
    },
  };
}

/**
 * Analyzes MediaPipe 468/478 Face Landmarks.
 * @param {Array} landmarks - Array of normalized {x, y, z} points from MediaPipe (mirrored for canvas)
 * @param {number} canvasWidth - Width of render canvas
 * @param {number} canvasHeight - Height of render canvas
 * @returns {Object} Face shape plus normalized fit and canvas-space anchors
 */
export function analyzeFaceLandmarks(landmarks, canvasWidth = 640, canvasHeight = 480, mapping = {}) {
  if (!landmarks || landmarks.length < 468) {
    return null;
  }
  const fit = computeGlassesFit(landmarks, canvasWidth, canvasHeight, mapping);
  if (!fit) return null;
  const mapPoint = (point) => mapLandmarkToViewport(point, {
    sourceWidth: canvasWidth,
    sourceHeight: canvasHeight,
    viewportWidth: canvasWidth,
    viewportHeight: canvasHeight,
    ...mapping,
  });

  // Key MediaPipe landmark indices
  // Forehead & Chin
  const forehead = landmarks[10];
  const chin = landmarks[152];

  // Cheeks & Temples
  const cheek1 = landmarks[234];
  const cheek2 = landmarks[454];
  const jaw1 = landmarks[58] || landmarks[172];
  const jaw2 = landmarks[288] || landmarks[397];
  const temple1 = landmarks[127] || landmarks[103] || landmarks[54];
  const temple2 = landmarks[356] || landmarks[332] || landmarks[284];

  // Keep face-shape analysis on canthi too; iris position changes with gaze.
  const eye1 = midpoint(landmarks[33], landmarks[133]);
  const eye2 = midpoint(landmarks[362], landmarks[263]);

  // Convert to canvas pixel coordinates
  const eye1Px = mapPoint(eye1);
  const eye2Px = mapPoint(eye2);

  // Identify screenLeftEye (smaller X on canvas) and screenRightEye (larger X on canvas)
  // This guarantees that dx = screenRightEye.x - screenLeftEye.x is ALWAYS strictly positive.
  // Therefore, rollAngle is ALWAYS centered at 0° for an upright face, never flipped to ±180°!
  const screenLeftEye = eye1Px.x < eye2Px.x ? eye1Px : eye2Px;
  const screenRightEye = eye1Px.x < eye2Px.x ? eye2Px : eye1Px;

  // Interpupillary distance in canvas pixels
  const dx = screenRightEye.x - screenLeftEye.x;
  const dy = screenRightEye.y - screenLeftEye.y;
  const eyeDistancePx = Math.hypot(dx, dy);

  if (eyeDistancePx < 10) return null;

  // Pose is computed in the eye-line coordinate frame by computeGlassesFit.
  const rollAngle = fit.rollAngle;

  const bridgePx = fit.bridgePx;

  // Temple and cheek pixel positions
  const temple1Px = mapPoint(temple1);
  const temple2Px = mapPoint(temple2);
  const cheek1Px = mapPoint(cheek1);
  const cheek2Px = mapPoint(cheek2);

  const templeWidthPx = Math.hypot(temple2Px.x - temple1Px.x, temple2Px.y - temple1Px.y);
  const cheekboneWidthPx = Math.hypot(cheek2Px.x - cheek1Px.x, cheek2Px.y - cheek1Px.y);

  const { yaw, pitch } = fit;
  const scale = fit.frameScale;

  // Normalized Geometric Face Measurements for classification
  const faceLength = dist2D(forehead, chin);
  const cheekboneWidth = dist2D(cheek1, cheek2);
  const jawlineWidth = dist2D(jaw1, jaw2);
  const foreheadWidth = dist2D(temple1, temple2);

  if (cheekboneWidth === 0 || jawlineWidth === 0) {
    return null;
  }

  // Dimension Ratios
  const lengthToWidth = faceLength / cheekboneWidth;
  const jawToCheek = jawlineWidth / cheekboneWidth;
  const foreheadToJaw = foreheadWidth / jawlineWidth;
  const foreheadToCheek = foreheadWidth / cheekboneWidth;

  // Rule-based classification for the 5 shapes (PRD Section III)
  let rawShape = 'oval';

  if (foreheadToJaw > 1.25 && jawToCheek < 0.8) {
    // Wide forehead, pointed narrow chin -> Heart
    rawShape = 'heart';
  } else if (cheekboneWidth > foreheadWidth * 1.15 && cheekboneWidth > jawlineWidth * 1.22) {
    // Cheekbones widest, narrow forehead and jaw -> Diamond
    rawShape = 'diamond';
  } else if (lengthToWidth < 1.22 && jawToCheek >= 0.84) {
    // Short face, wide prominent square jawline -> Square
    rawShape = 'square';
  } else if (lengthToWidth < 1.22 && jawToCheek < 0.84) {
    // Short face, soft rounded jawline -> Round
    rawShape = 'round';
  } else {
    // Balanced proportions, length approx 1.3 - 1.5x width -> Oval
    rawShape = 'oval';
  }

  return {
    rawShape,
    leftEyePx: screenLeftEye,
    rightEyePx: screenRightEye,
    bridgePx,
    eyeDistancePx,
    templeWidthPx,
    cheekboneWidthPx,
    scale,
    rollAngle,
    yaw,
    pitch,
    faceLength,
    cheekboneWidth,
    jawlineWidth,
    foreheadWidth,
    ...fit,
    scale: fit.frameScale,
    confidence: fit.trackingQuality,
  };
}
