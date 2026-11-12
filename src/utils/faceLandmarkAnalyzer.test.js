import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeFaceLandmarks, computeGlassesFit, mapLandmarkToViewport } from './faceLandmarkAnalyzer.js';
import { GlassesTracker } from '../components/tryon/glassesRenderer.js';
import { FRAME_MODEL_IDS } from '../data/frameModels.js';

function makeFace({ yaw = 0, pitch = 0, roll = 0 } = {}) {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const set = (index, x, y, z = 0) => { landmarks[index] = { x, y, z }; };
  set(33, 0.385, 0.42); set(133, 0.455, 0.42);
  set(362, 0.545, 0.42); set(263, 0.615, 0.42);
  set(168, 0.5, 0.39); set(6, 0.5, 0.37);
  set(1, 0.5 + yaw * 0.08, 0.5 + pitch * 0.05, -0.04);
  set(234, 0.30, 0.55); set(454, 0.70, 0.55);
  set(127, 0.33, 0.40); set(356, 0.67, 0.40);
  set(10, 0.5, 0.20); set(152, 0.5, 0.82);
  set(58, 0.42, 0.74); set(288, 0.58, 0.74);

  if (roll) {
    const cx = 0.5;
    const cy = 0.5;
    const cos = Math.cos(roll);
    const sin = Math.sin(roll);
    for (const point of landmarks) {
      const x = (point.x - cx) * 640;
      const y = (point.y - cy) * 480;
      point.x = cx + (cos * x - sin * y) / 640;
      point.y = cy + (sin * x + cos * y) / 480;
    }
  }
  return landmarks;
}

test('fit uses eye-corner span and distinct canvas/model coordinate anchors', () => {
  const fit = computeGlassesFit(makeFace(), 640, 480, { baseModel: 'aviator' });
  const analysis = analyzeFaceLandmarks(makeFace(), 640, 480, { baseModel: 'aviator' });
  assert.ok(fit);
  assert.ok(analysis);
  assert.equal(fit.coordinateSpaces.anchors, 'canvas-pixel');
  assert.equal(fit.coordinateSpaces.modelAnchors, 'procedural-model-unit');
  assert.ok(Math.abs(fit.eyeDistancePx - 102.4) < 1);
  assert.ok(fit.frameWidthPx > fit.eyeDistancePx);
  assert.ok(fit.hingeLeftPx.x < fit.centerPx.x);
  assert.ok(fit.hingeRightPx.x > fit.centerPx.x);
  assert.ok(fit.fitRatio > 0 && fit.fitRatio < 1);
  assert.equal(analysis.centerPx.x, fit.centerPx.x);
  assert.equal(analysis.frameScale, fit.frameScale);
  assert.equal('estimatedPD' in analysis, false);
});

test('fitting remains finite for frontal, yawed, pitched, and rolled landmarks', () => {
  const frontal = computeGlassesFit(makeFace(), 640, 480);
  const turnedLeft = computeGlassesFit(makeFace({ yaw: -0.45 }), 640, 480);
  const turnedRight = computeGlassesFit(makeFace({ yaw: 0.45 }), 640, 480);
  const pitched = computeGlassesFit(makeFace({ pitch: 0.35 }), 640, 480);
  const rolled = computeGlassesFit(makeFace({ roll: 0.22 }), 640, 480);

  assert.ok(frontal && turnedLeft && turnedRight && pitched && rolled);
  assert.ok(turnedLeft.yaw < frontal.yaw);
  assert.ok(turnedRight.yaw > frontal.yaw);
  assert.ok(pitched.pitch > frontal.pitch);
  assert.ok(Math.abs(rolled.rollAngle - 0.22) < 0.02);
  for (const fit of [frontal, turnedLeft, turnedRight, pitched, rolled]) {
    for (const value of [fit.frameScale, fit.frameWidthPx, fit.frameHeightPx, fit.yaw, fit.pitch, fit.rollAngle]) {
      assert.ok(Number.isFinite(value));
    }
  }
});

test('each existing style ID resolves to a finite fit', () => {
  for (const baseModel of FRAME_MODEL_IDS) {
    const fit = computeGlassesFit(makeFace(), 640, 480, { baseModel });
    assert.ok(fit, baseModel);
    assert.ok(fit.frameWidthPx > 0, baseModel);
  }
});

test('viewport mapping keeps contain, cover, mirror, and DPR conversions explicit', () => {
  const contain = mapLandmarkToViewport({ x: 0.25, y: 0.5 }, {
    sourceWidth: 640, sourceHeight: 480, viewportWidth: 400, viewportHeight: 400,
  });
  const mirrored = mapLandmarkToViewport({ x: 0.25, y: 0.5 }, {
    sourceWidth: 640, sourceHeight: 480, viewportWidth: 400, viewportHeight: 400,
    mirrored: true, devicePixelRatio: 2,
  });
  const cover = mapLandmarkToViewport({ x: 0.25, y: 0.5 }, {
    sourceWidth: 640, sourceHeight: 480, viewportWidth: 400, viewportHeight: 400,
    objectFit: 'cover',
  });
  assert.deepEqual({ x: contain.x, y: contain.y }, { x: 100, y: 200 });
  assert.deepEqual({ x: mirrored.x, y: mirrored.y }, { x: 600, y: 400 });
  assert.ok(Math.abs(cover.x - 66.6667) < 0.01);
  assert.equal(cover.y, 200);
});

test('tracker smooths by elapsed time and fades briefly after face loss', () => {
  const tracker = new GlassesTracker();
  tracker.update({ x: 100, y: 100, scale: 60, angle: 0, yaw: 0, pitch: 0 }, 0);
  const smoothed = tracker.update({ x: 130, y: 100, scale: 60, angle: 0, yaw: 0, pitch: 0 }, 16);
  assert.ok(smoothed.x > 100 && smoothed.x < 130);
  assert.equal(tracker.update(null, 60).opacity, 1);
  const fading = tracker.update(null, 150);
  assert.ok(fading && fading.opacity > 0 && fading.opacity < 1);
  assert.equal(tracker.update(null, 230), null);
});

test('invalid/insufficient landmarks do not produce floating glasses anchors', () => {
  assert.equal(computeGlassesFit(makeFace().slice(0, 467), 640, 480), null);
  const invalid = makeFace();
  invalid[33] = { x: Number.NaN, y: 0.4, z: 0 };
  assert.equal(computeGlassesFit(invalid, 640, 480), null);
});

