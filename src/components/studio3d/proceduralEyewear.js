import * as THREE from 'three';
import { getGlassesFitProfile } from '../../utils/glassesFitProfiles.js';

// ─── Temple Style & Engraving Placement Metadata ─────────────────────────────
export const TEMPLE_STYLES = [
  { id: 'classic-acetate', name: 'Classic Acetate', nameVi: 'Acetate Cổ Điển', desc: 'Càng bản vừa chắc chắn, đầu càng ôm sát tai', icon: '▬' },
  { id: 'slim-metal', name: 'Slim Metal', nameVi: 'Kim Loại Thanh Mảnh', desc: 'Càng kim loại mảnh thanh thoát, tinh tế', icon: '━' },
  { id: 'statement-wide', name: 'Statement Wide', nameVi: 'Bản Rộng Phong Cách', desc: 'Càng rộng thời trang, diện tích khắc chữ lý tưởng', icon: '█' },
  { id: 'sculpted-comfort', name: 'Sculpted Comfort', nameVi: 'Điêu Khắc Comfort', desc: 'Đường cong điêu khắc, đầu càng thuôn ôm tai', icon: '◗' },
];

export const ENGRAVING_PLACEMENTS = [
  { id: 'outer_temple', nameVi: 'Mặt Ngoài Càng', desc: 'Người đối diện nhìn thấy khi bạn đeo kính' },
  { id: 'inner_temple', nameVi: 'Mặt Trong Càng', desc: 'Hướng vào phần đầu người đeo, bí mật riêng tư' },
  { id: 'two_temples', nameVi: 'Cả Hai Mặt', desc: 'Khắc đồng thời mặt ngoài và mặt trong càng kính' },
];

/**
 * proceduralEyewear.js — 3D Eyewear Geometry & Material Generator for Lumina Bespoke Studio.
 * Conforms to PRD Section 5.5 & Prompt 5:
 * - 4 distinct procedural frame models: Aviator, Cat-Eye, Round, Square
 * - Rims, lenses, bridge, nose pads, temples with ear curves
 * - Real-time material updates (metalness, roughness, colors, opacity)
 * - Sparkling Rhinestones along top rim
 * - 3D Charms: lumina-star, ruby-heart, silver-butterfly (max 2)
 * - Canvas-based laser engraving on temple
 * - Procedural Tortoiseshell texture generator
 */

// Generate procedural tortoiseshell texture
export function createTortoiseshellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Rich amber-gold base
  ctx.fillStyle = '#C27827';
  ctx.fillRect(0, 0, 512, 512);

  // Gradient swirls
  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 320);
  grad.addColorStop(0, '#E69C24');
  grad.addColorStop(0.5, '#964B00');
  grad.addColorStop(1, '#3B1E08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Random dark obsidian spots and mottling
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 6 + Math.random() * 28;
    const opacity = 0.4 + Math.random() * 0.55;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.scale(1 + Math.random() * 1.5, 0.5 + Math.random() * 0.8);

    ctx.fillStyle = Math.random() > 0.4 ? `rgba(20, 20, 19, ${opacity})` : `rgba(74, 34, 7, ${opacity})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Build a temple arm mesh for the given style.
 * @param {string} templeStyle - 'classic-acetate' | 'slim-metal' | 'statement-wide' | 'sculpted-comfort'
 * @param {Object} fitProfile  - from getGlassesFitProfile()
 * @param {number} side        - 1 for left, -1 for right (mirrors X)
 * @param {Object} [options]   - extra overrides
 * @returns {THREE.Group}
 */
export function buildTempleGeometry(templeStyle, fitProfile, side = 1, options = {}) {
  const { hingeX, templeLength } = fitProfile;
  const sx = side; // 1 = left temple (negative X world), -1 = right

  // Control points shared across styles, mirrored by sx
  // Convention: left temple extends in -X direction from hinge
  const cp = (x, y, z) => new THREE.Vector3(-hingeX * sx + x * sx, y, z);

  // Build the main CatmullRomCurve3 for this style
  let curve;
  let bodyGeo;
  let earTipGeo;
  const group = new THREE.Group();
  group.name = `Temple_${side > 0 ? 'Left' : 'Right'}_${templeStyle}`;

  switch (templeStyle) {
    case 'slim-metal': {
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-hingeX * sx, 0.16, 0.0),
        new THREE.Vector3(-hingeX * sx + (-0.02 * sx), 0.16, -templeLength * 0.12),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.155, -templeLength * 0.38),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.15, -templeLength * 0.60),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.13, -templeLength * 0.78),
        new THREE.Vector3(-hingeX * sx + (-0.02 * sx), 0.03, -templeLength * 0.92),
        new THREE.Vector3(-hingeX * sx + (-0.01 * sx), -0.14, -templeLength * 0.98),
        new THREE.Vector3(-hingeX * sx * 0.98, -0.18, -templeLength),
      ]);
      bodyGeo = new THREE.TubeGeometry(curve, 50, 0.016, 8, false);
      earTipGeo = new THREE.SphereGeometry(0.016, 8, 8);
      break;
    }

    case 'statement-wide': {
      // Wide flat bar using ExtrudeGeometry
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-hingeX * sx, 0.16, 0.0),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.155, -templeLength * 0.15),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.14, -templeLength * 0.45),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.13, -templeLength * 0.70),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.05, -templeLength * 0.87),
        new THREE.Vector3(-hingeX * sx + (-0.01 * sx), -0.10, -templeLength * 0.96),
        new THREE.Vector3(-hingeX * sx * 0.98, -0.18, -templeLength),
      ]);
      // Build a wide flat shape (rectangle 0.085 × 0.028)
      const wideShape = new THREE.Shape();
      wideShape.moveTo(-0.0425, -0.014);
      wideShape.lineTo( 0.0425, -0.014);
      wideShape.lineTo( 0.0425,  0.014);
      wideShape.lineTo(-0.0425,  0.014);
      wideShape.closePath();
      // Approximate a swept bar along Z using TubeGeometry for 3D, 
      // then place a wide box mesh along the curve manually.
      // For simplicity & engraving UV compatibility use TubeGeometry with large radius & segments=4 (square cross-section).
      bodyGeo = new THREE.TubeGeometry(curve, 50, 0.038, 4, false);
      earTipGeo = new THREE.BoxGeometry(0.085, 0.028, 0.06);
      break;
    }

    case 'sculpted-comfort': {
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-hingeX * sx, 0.16, 0.0),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.16, -templeLength * 0.13),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.155, -templeLength * 0.35),
        new THREE.Vector3(-hingeX * sx + (-0.05 * sx), 0.14, -templeLength * 0.55),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.10, -templeLength * 0.72),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.02, -templeLength * 0.88),
        new THREE.Vector3(-hingeX * sx + (-0.01 * sx), -0.12, -templeLength * 0.96),
        new THREE.Vector3(-hingeX * sx * 0.98, -0.18, -templeLength),
      ]);
      // Variable-radius approximation: use slightly larger tube in the middle
      bodyGeo = new THREE.TubeGeometry(curve, 50, 0.030, 10, false);
      earTipGeo = new THREE.CapsuleGeometry(0.022, 0.06, 4, 8);
      break;
    }

    case 'classic-acetate':
    default: {
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-hingeX * sx, 0.16, 0.0),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.16, -templeLength * 0.14),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.155, -templeLength * 0.40),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.145, -templeLength * 0.60),
        new THREE.Vector3(-hingeX * sx + (-0.04 * sx), 0.13, -templeLength * 0.75),
        new THREE.Vector3(-hingeX * sx + (-0.03 * sx), 0.03, -templeLength * 0.90),
        new THREE.Vector3(-hingeX * sx + (-0.01 * sx), -0.14, -templeLength * 0.97),
        new THREE.Vector3(-hingeX * sx * 0.98, -0.18, -templeLength),
      ]);
      bodyGeo = new THREE.TubeGeometry(curve, 50, 0.038, 10, false);
      earTipGeo = new THREE.SphereGeometry(0.038, 10, 10);
      break;
    }
  }

  // Body mesh (material will be assigned by caller)
  const bodyMesh = new THREE.Mesh(bodyGeo);
  bodyMesh.name = 'TempleBody';
  bodyMesh.userData.isTempleBody = true;
  group.add(bodyMesh);

  // Ear tip placed at the end of the curve
  const tipPoints = curve.getPoints(80);
  const tipPos = tipPoints[tipPoints.length - 1];
  const earTipMesh = new THREE.Mesh(earTipGeo);
  earTipMesh.name = 'TempleEarTip';
  earTipMesh.position.copy(tipPos);
  earTipMesh.userData.isEarTip = true;
  group.add(earTipMesh);

  // Store geo refs for dispose
  group.userData._bodyGeo = bodyGeo;
  group.userData._earTipGeo = earTipGeo;
  group.userData._curve = curve;
  group.userData._templeStyle = templeStyle;

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGRAVING SYSTEM — DUAL SIDE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a CanvasTexture for temple engraving.
 * @param {string} text
 * @param {string} placement - 'outer_temple' | 'inner_temple' | 'two_temples'
 * @param {string} templeStyle
 * @returns {THREE.CanvasTexture}
 */
export function createTempleEngravingTexture(text = '', placement = 'outer_temple', templeStyle = 'classic-acetate') {
  const canvas = document.createElement('canvas');
  const isWide = templeStyle === 'statement-wide' || templeStyle === 'classic-acetate';
  canvas.width = 512;
  canvas.height = isWide ? 80 : 64;
  const texture = new THREE.CanvasTexture(canvas);
  updateTempleEngravingTexture(texture, text, placement, templeStyle);
  return texture;
}

/**
 * Update an existing CanvasTexture for temple engraving without recreating it.
 */
export function updateTempleEngravingTexture(texture, text = '', placement = 'outer_temple', templeStyle = 'classic-acetate') {
  const canvas = texture?.image;
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (text && text.trim().length > 0) {
    ctx.font = 'bold 24px "Cinzel", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#D4AF37';
    ctx.fillText(`✦ ${text.trim().toUpperCase()} ✦`, w / 2, h / 2);
  }

  texture.needsUpdate = true;
}

/**
 * Apply engraving texture to a temple group's body mesh.
 * @param {THREE.Group} templeGroup - result of buildTempleGeometry()
 * @param {string} text
 * @param {string} placement - 'outer_temple' | 'inner_temple' | 'two_temples'
 * @param {string} templeStyle
 * @param {number} side - 1 or -1
 */
export function applyEngravingToTemple(templeGroup, text, placement = 'outer_temple', templeStyle = 'classic-acetate', side = 1) {
  if (!templeGroup) return;
  const bodyMesh = templeGroup.getObjectByProperty('name', 'TempleBody');
  if (!bodyMesh) return;

  const mat = bodyMesh.material;
  if (!mat) return;

  const hasText = text && text.trim().length > 0;
  if (!hasText) {
    mat.emissiveMap = null;
    mat.emissiveIntensity = 0;
    mat.needsUpdate = true;
    return;
  }

  // Reuse or create texture
  if (!templeGroup.userData._engravingTexture) {
    templeGroup.userData._engravingTexture = createTempleEngravingTexture(text, placement, templeStyle);
  } else {
    updateTempleEngravingTexture(templeGroup.userData._engravingTexture, text, placement, templeStyle);
  }

  const tex = templeGroup.userData._engravingTexture;
  mat.emissiveMap = tex;
  mat.emissive = new THREE.Color('#D4AF37');
  mat.emissiveIntensity = 0.15;
  mat.needsUpdate = true;
}

// Generate laser engraving texture for the left temple
export function createEngravingTexture(text = 'LUMINA') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  updateEngravingTexture(texture, text);
  return texture;
}

function updateEngravingTexture(texture, text = '') {
  const canvas = texture?.image;
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, 512, 64);

  if (text && text.trim().length > 0) {
    ctx.font = 'bold 26px "Cinzel", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Engraved metallic luster with shadow
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = '#D4AF37';
    ctx.fillText(`✦ ${text.trim().toUpperCase()} ✦`, 256, 32);
  }

  texture.needsUpdate = true;
}

/**
 * Creates 2D shapes for left rim and left lens based on model type.
 * Centered around X = -0.75, Y = 0.0
 */
function getLensAndRimShape(modelType) {
  const rimShape = new THREE.Shape();
  const lensShape = new THREE.Shape();
  const copyPath = (target, source) => {
    target.curves = source.curves.map((curve) => curve.clone());
    target.currentPoint.copy(source.currentPoint);
  };

  switch (modelType) {
    case 'cateye': {
      // Upswept cat-eye: outer top corner is sharply pulled upwards
      // Outer rim
      rimShape.moveTo(-0.25, 0.1);
      rimShape.bezierCurveTo(-0.35, 0.38, -0.9, 0.52, -1.38, 0.48); // Sharp high brow
      rimShape.bezierCurveTo(-1.42, 0.2, -1.35, -0.22, -1.1, -0.42); // Outer sweep
      rimShape.bezierCurveTo(-0.85, -0.52, -0.45, -0.45, -0.25, -0.2); // Bottom inner curve
      rimShape.closePath();

      // Inner lens hole
      const hole = new THREE.Path();
      hole.moveTo(-0.32, 0.08);
      hole.bezierCurveTo(-0.4, 0.32, -0.85, 0.42, -1.28, 0.38);
      hole.bezierCurveTo(-1.32, 0.15, -1.25, -0.18, -1.05, -0.35);
      hole.bezierCurveTo(-0.8, -0.42, -0.48, -0.38, -0.32, -0.15);
      hole.closePath();
      rimShape.holes.push(hole);

      // Lens itself
      lensShape.moveTo(-0.32, 0.08);
      lensShape.bezierCurveTo(-0.4, 0.32, -0.85, 0.42, -1.28, 0.38);
      lensShape.bezierCurveTo(-1.32, 0.15, -1.25, -0.18, -1.05, -0.35);
      lensShape.bezierCurveTo(-0.8, -0.42, -0.48, -0.38, -0.32, -0.15);
      lensShape.closePath();
      break;
    }

    case 'sculpted-cateye': {
      rimShape.moveTo(-0.18, 0.12);
      rimShape.lineTo(-1.43, 0.48);
      rimShape.quadraticCurveTo(-1.5, 0.45, -1.43, 0.28);
      rimShape.lineTo(-1.31, -0.22);
      rimShape.quadraticCurveTo(-1.17, -0.51, -0.83, -0.48);
      rimShape.quadraticCurveTo(-0.43, -0.45, -0.23, -0.19);
      rimShape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-0.29, 0.06);
      hole.lineTo(-1.32, 0.36);
      hole.lineTo(-1.23, -0.19);
      hole.quadraticCurveTo(-1.1, -0.42, -0.84, -0.4);
      hole.quadraticCurveTo(-0.49, -0.38, -0.32, -0.16);
      hole.closePath();
      rimShape.holes.push(hole);
      copyPath(lensShape, hole);
      break;
    }

    case 'round': {
      // Classic round / panto: subtle vertical elongation
      const cx = -0.78;
      const cy = -0.02;
      const rxOuter = 0.52;
      const ryOuter = 0.48;
      const rxInner = 0.44;
      const ryInner = 0.40;

      rimShape.absellipse(cx, cy, rxOuter, ryOuter, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absellipse(cx, cy, rxInner, ryInner, 0, Math.PI * 2, true);
      rimShape.holes.push(hole);

      lensShape.absellipse(cx, cy, rxInner, ryInner, 0, Math.PI * 2, false);
      break;
    }

    case 'square': {
      // Bold rectangular frame with rounded corners
      const x0 = -1.34;
      const x1 = -0.24;
      const y0 = -0.42;
      const y1 = 0.38;
      const r = 0.1;

      // Outer
      rimShape.moveTo(x0 + r, y0);
      rimShape.lineTo(x1 - r, y0);
      rimShape.quadraticCurveTo(x1, y0, x1, y0 + r);
      rimShape.lineTo(x1, y1 - r);
      rimShape.quadraticCurveTo(x1, y1, x1 - r, y1);
      rimShape.lineTo(x0 + r, y1);
      rimShape.quadraticCurveTo(x0, y1, x0, y1 - r);
      rimShape.lineTo(x0, y0 + r);
      rimShape.quadraticCurveTo(x0, y0, x0 + r, y0);
      rimShape.closePath();

      // Inner hole
      const ix0 = x0 + 0.08;
      const ix1 = x1 - 0.08;
      const iy0 = y0 + 0.08;
      const iy1 = y1 - 0.08;
      const ir = 0.07;

      const hole = new THREE.Path();
      hole.moveTo(ix0 + ir, iy0);
      hole.quadraticCurveTo(ix0, iy0, ix0, iy0 + ir);
      hole.lineTo(ix0, iy1 - ir);
      hole.quadraticCurveTo(ix0, iy1, ix0 + ir, iy1);
      hole.lineTo(ix1 - ir, iy1);
      hole.quadraticCurveTo(ix1, iy1, ix1, iy1 - ir);
      hole.lineTo(ix1, iy0 + ir);
      hole.quadraticCurveTo(ix1, iy0, ix1 - ir, iy0);
      hole.closePath();
      rimShape.holes.push(hole);

      // Lens
      lensShape.moveTo(ix0 + ir, iy0);
      lensShape.lineTo(ix1 - ir, iy0);
      lensShape.quadraticCurveTo(ix1, iy0, ix1, iy0 + ir);
      lensShape.lineTo(ix1, iy1 - ir);
      lensShape.quadraticCurveTo(ix1, iy1, ix1 - ir, iy1);
      lensShape.lineTo(ix0 + ir, iy1);
      lensShape.quadraticCurveTo(ix0, iy1, ix0, iy1 - ir);
      lensShape.lineTo(ix0, iy0 + ir);
      lensShape.quadraticCurveTo(ix0, iy0, ix0 + ir, iy0);
      lensShape.closePath();
      break;
    }

    case 'oversized-square': {
      const roundedRect = (shape, x0, y0, x1, y1, r) => {
        shape.moveTo(x0 + r, y0);
        shape.lineTo(x1 - r, y0);
        shape.quadraticCurveTo(x1, y0, x1, y0 + r);
        shape.lineTo(x1, y1 - r);
        shape.quadraticCurveTo(x1, y1, x1 - r, y1);
        shape.lineTo(x0 + r, y1);
        shape.quadraticCurveTo(x0, y1, x0, y1 - r);
        shape.lineTo(x0, y0 + r);
        shape.quadraticCurveTo(x0, y0, x0 + r, y0);
        shape.closePath();
      };
      roundedRect(rimShape, -1.47, -0.52, -0.12, 0.47, 0.18);
      const hole = new THREE.Path();
      roundedRect(hole, -1.36, -0.41, -0.23, 0.36, 0.13);
      rimShape.holes.push(hole);
      roundedRect(lensShape, -1.36, -0.41, -0.23, 0.36, 0.13);
      break;
    }

    case 'modern-pilot': {
      rimShape.moveTo(-0.2, 0.34);
      rimShape.lineTo(-1.29, 0.4);
      rimShape.quadraticCurveTo(-1.43, 0.38, -1.42, 0.2);
      rimShape.lineTo(-1.31, -0.25);
      rimShape.quadraticCurveTo(-1.21, -0.51, -0.9, -0.57);
      rimShape.quadraticCurveTo(-0.48, -0.59, -0.24, -0.34);
      rimShape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-0.29, 0.26);
      hole.lineTo(-1.23, 0.31);
      hole.lineTo(-1.24, 0.16);
      hole.lineTo(-1.16, -0.22);
      hole.quadraticCurveTo(-1.07, -0.43, -0.88, -0.47);
      hole.quadraticCurveTo(-0.51, -0.49, -0.31, -0.29);
      hole.closePath();
      rimShape.holes.push(hole);
      copyPath(lensShape, hole);
      break;
    }

    case 'slim-oval': {
      const cx = -0.78;
      rimShape.absellipse(cx, -0.01, 0.59, 0.41, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absellipse(cx, -0.01, 0.535, 0.355, 0, Math.PI * 2, true);
      rimShape.holes.push(hole);
      lensShape.absellipse(cx, -0.01, 0.535, 0.355, 0, Math.PI * 2, false);
      break;
    }

    case 'geometric-hexagon': {
      const polygon = (shape, points) => {
        points.forEach(([x, y], index) => {
          if (index === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        });
        shape.closePath();
      };
      const outer = [[-1.36, 0], [-1.11, 0.43], [-0.45, 0.43], [-0.2, 0], [-0.45, -0.43], [-1.11, -0.43]];
      const inner = [[-1.26, 0], [-1.06, 0.34], [-0.51, 0.34], [-0.3, 0], [-0.51, -0.34], [-1.06, -0.34]];
      polygon(rimShape, outer);
      const hole = new THREE.Path();
      polygon(hole, inner);
      rimShape.holes.push(hole);
      polygon(lensShape, inner);
      break;
    }

    case 'bug-eye': {
      const cx = -0.79;
      rimShape.absellipse(cx, -0.02, 0.69, 0.57, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absellipse(cx, -0.02, 0.58, 0.47, 0, Math.PI * 2, true);
      rimShape.holes.push(hole);
      lensShape.absellipse(cx, -0.02, 0.58, 0.47, 0, Math.PI * 2, false);
      break;
    }

    case 'aviator':
    default: {
      // Classic teardrop aviator: wider upper portion, downward sloping teardrop
      rimShape.moveTo(-0.24, 0.28);
      rimShape.bezierCurveTo(-0.35, 0.42, -0.85, 0.45, -1.34, 0.35); // Upper brow
      rimShape.bezierCurveTo(-1.42, 0.15, -1.38, -0.25, -1.18, -0.48); // Outer teardrop drop
      rimShape.bezierCurveTo(-0.95, -0.62, -0.55, -0.58, -0.32, -0.32); // Bottom teardrop curve
      rimShape.bezierCurveTo(-0.22, -0.15, -0.22, 0.15, -0.24, 0.28); // Inner nose bridge
      rimShape.closePath();

      const hole = new THREE.Path();
      hole.moveTo(-0.3, 0.24);
      hole.bezierCurveTo(-0.4, 0.36, -0.82, 0.38, -1.26, 0.28);
      hole.bezierCurveTo(-1.32, 0.12, -1.28, -0.2, -1.12, -0.4);
      hole.bezierCurveTo(-0.92, -0.52, -0.58, -0.48, -0.38, -0.26);
      hole.bezierCurveTo(-0.28, -0.12, -0.28, 0.12, -0.3, 0.24);
      hole.closePath();
      rimShape.holes.push(hole);

      lensShape.moveTo(-0.3, 0.24);
      lensShape.bezierCurveTo(-0.4, 0.36, -0.82, 0.38, -1.26, 0.28);
      lensShape.bezierCurveTo(-1.32, 0.12, -1.28, -0.2, -1.12, -0.4);
      lensShape.bezierCurveTo(-0.92, -0.52, -0.58, -0.48, -0.38, -0.26);
      lensShape.bezierCurveTo(-0.28, -0.12, -0.28, 0.12, -0.3, 0.24);
      lensShape.closePath();
      break;
    }
  }

  return { rimShape, lensShape };
}

/**
 * Procedural 3D Charm Geometry Creators
 */
function createLuminaStarGeometry() {
  const shape = new THREE.Shape();
  const outerR = 0.12;
  const innerR = 0.035;
  const points = 4;

  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
}

function createRubyHeartGeometry() {
  const shape = new THREE.Shape();
  const x = 0;
  const y = 0;
  const scale = 0.022;

  shape.moveTo(x, y + 2 * scale);
  shape.bezierCurveTo(x, y + 3.5 * scale, x - 3.5 * scale, y + 5 * scale, x - 5 * scale, y + 2 * scale);
  shape.bezierCurveTo(x - 6 * scale, y - 1 * scale, x - 3 * scale, y - 4 * scale, x, y - 6 * scale);
  shape.bezierCurveTo(x + 3 * scale, y - 4 * scale, x + 6 * scale, y - 1 * scale, x + 5 * scale, y + 2 * scale);
  shape.bezierCurveTo(x + 3.5 * scale, y + 5 * scale, x, y + 3.5 * scale, x, y + 2 * scale);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
}

function createSilverButterflyGeometry() {
  const shape = new THREE.Shape();
  const s = 0.03;

  // Upper right wing
  shape.moveTo(0, 0);
  shape.bezierCurveTo(2 * s, 3 * s, 4 * s, 3.5 * s, 4 * s, 2 * s);
  shape.bezierCurveTo(4 * s, 0.5 * s, 2 * s, 0.2 * s, 0.5 * s, 0);
  // Lower right wing
  shape.bezierCurveTo(2 * s, -1 * s, 3 * s, -2.5 * s, 2 * s, -3 * s);
  shape.bezierCurveTo(1 * s, -3 * s, 0.5 * s, -1.5 * s, 0, 0);
  // Lower left wing
  shape.bezierCurveTo(-0.5 * s, -1.5 * s, -1 * s, -3 * s, -2 * s, -3 * s);
  shape.bezierCurveTo(-3 * s, -2.5 * s, -2 * s, -1 * s, -0.5 * s, 0);
  // Upper left wing
  shape.bezierCurveTo(-2 * s, 0.2 * s, -4 * s, 0.5 * s, -4 * s, 2 * s);
  shape.bezierCurveTo(-4 * s, 3.5 * s, -2 * s, 3 * s, 0, 0);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
}

/**
 * Assembles the complete procedural 3D Eyewear Model
 * @param {Object} spec - designSpec
 * @returns {THREE.Group} glassesGroup with update hooks
 */
export function buildProceduralEyewear(spec) {
  spec = {
    baseModel: 'aviator',
    frameColor: '#D4AF37',
    lensColor: '#1F2937',
    lensOpacity: 0.45,
    templeStyle: 'classic-acetate',
    engravingPlacement: 'outer_temple',
    ...spec,
  };
  const fitProfile = getGlassesFitProfile(spec.baseModel);
  const glassesGroup = new THREE.Group();
  glassesGroup.name = 'LuminaEyewearModel';
  glassesGroup.userData.baseModel = spec.baseModel;
  glassesGroup.userData.fitProfile = fitProfile;

  // Dispose tracking array
  const disposables = [];

  // 1. Frame Material setup
  let isTortoise = spec.frameColor === 'tortoiseshell';
  let tortoiseTexture = isTortoise ? createTortoiseshellTexture() : null;
  if (tortoiseTexture) disposables.push(tortoiseTexture);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: isTortoise ? 0xffffff : new THREE.Color(spec.frameColor || '#D4AF37'),
    map: tortoiseTexture,
    metalness: typeof spec.metalness === 'number' ? spec.metalness : 0.9,
    roughness: typeof spec.roughness === 'number' ? spec.roughness : 0.2,
    envMapIntensity: 1.2,
  });
  disposables.push(frameMaterial);

  // 2. Lens Material setup (PRD 5.5: transparent glass with tint)
  const lensMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.lensColor || '#1F2937'),
    transparent: true,
    opacity: typeof spec.lensOpacity === 'number' ? spec.lensOpacity : 0.45,
    roughness: 0.08,
    metalness: 0.15,
    reflectivity: 0.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.6,
    ior: 1.5,
    depthWrite: false, // Prevents alpha sorting glitches
    side: THREE.DoubleSide,
  });
  disposables.push(lensMaterial);

  // 3. Build Rims & Lenses (Left and Right)
  const { rimShape, lensShape } = getLensAndRimShape(spec.baseModel);

  const isThinMetal = ['titanium', 'thin-metal'].includes(spec.frameType) || ['modern-pilot', 'slim-oval', 'geometric-hexagon'].includes(spec.baseModel);
  const rimDepth = isThinMetal ? 0.028 : 0.085;
  const extrudeSettings = {
    depth: rimDepth,
    bevelEnabled: true,
    bevelThickness: isThinMetal ? 0.008 : 0.022,
    bevelSize: isThinMetal ? 0.006 : 0.018,
    bevelSegments: 3,
  };

  const leftRimGeo = new THREE.ExtrudeGeometry(rimShape, extrudeSettings);
  disposables.push(leftRimGeo);
  const leftRimMesh = new THREE.Mesh(leftRimGeo, frameMaterial);
  leftRimMesh.name = 'LeftRim';
  glassesGroup.add(leftRimMesh);

  // Right Rim: mirrored by cloning with scale X = -1
  const rightRimMesh = new THREE.Mesh(leftRimGeo, frameMaterial);
  rightRimMesh.scale.set(-1, 1, 1);
  rightRimMesh.name = 'RightRim';
  glassesGroup.add(rightRimMesh);

  // Left Lens
  const lensSettings = {
    depth: 0.015,
    bevelEnabled: false,
  };
  const leftLensGeo = new THREE.ExtrudeGeometry(lensShape, lensSettings);
  disposables.push(leftLensGeo);
  const leftLensMesh = new THREE.Mesh(leftLensGeo, lensMaterial);
  leftLensMesh.position.z = 0.018;
  leftLensMesh.name = 'LeftLens';
  glassesGroup.add(leftLensMesh);

  // Right Lens: mirrored
  const rightLensMesh = new THREE.Mesh(leftLensGeo, lensMaterial);
  rightLensMesh.scale.set(-1, 1, 1);
  rightLensMesh.position.z = 0.018;
  rightLensMesh.name = 'RightLens';
  glassesGroup.add(rightLensMesh);

  // 4. Bridge (Cầu kính)
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.25, 0.05, 0.02),
    new THREE.Vector3(-0.12, 0.12, 0.04),
    new THREE.Vector3(0.0, 0.14, 0.05),
    new THREE.Vector3(0.12, 0.12, 0.04),
    new THREE.Vector3(0.25, 0.05, 0.02),
  ]);
  const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 20, isThinMetal ? 0.014 : 0.026, 10, false);
  disposables.push(bridgeGeo);
  const bridgeMesh = new THREE.Mesh(bridgeGeo, frameMaterial);
  bridgeMesh.name = 'Bridge';
  glassesGroup.add(bridgeMesh);

  // 5. Aviator Top Brow Bar (if Aviator model)
  if (['aviator', 'modern-pilot'].includes(spec.baseModel)) {
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.85, 0.36, 0.02),
      new THREE.Vector3(-0.4, 0.40, 0.04),
      new THREE.Vector3(0.0, 0.41, 0.05),
      new THREE.Vector3(0.4, 0.40, 0.04),
      new THREE.Vector3(0.85, 0.36, 0.02),
    ]);
    const browGeo = new THREE.TubeGeometry(browCurve, 24, isThinMetal ? 0.013 : 0.022, 8, false);
    disposables.push(browGeo);
    const browMesh = new THREE.Mesh(browGeo, frameMaterial);
    browMesh.name = 'AviatorBrowBar';
    glassesGroup.add(browMesh);
  }

  // 6. Nose Pads (Đệm mũi)
  const padMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
    roughness: 0.2,
    metalness: 0.05,
  });
  disposables.push(padMaterial);

  const padGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
  disposables.push(padGeo);

  const leftPad = new THREE.Mesh(padGeo, padMaterial);
  leftPad.position.set(-0.2, -0.06, -0.05);
  leftPad.rotation.z = Math.PI / 6;
  leftPad.rotation.x = Math.PI / 10;
  glassesGroup.add(leftPad);

  const rightPad = new THREE.Mesh(padGeo, padMaterial);
  rightPad.position.set(0.2, -0.06, -0.05);
  rightPad.rotation.z = -Math.PI / 6;
  rightPad.rotation.x = Math.PI / 10;
  glassesGroup.add(rightPad);

  // 7. Temples — use buildTempleGeometry for preset styles, fallback to old TubeGeometry
  const hingeX = fitProfile.hingeX;
  const templeLength = fitProfile.templeLength;
  const validTempleStyles = TEMPLE_STYLES.map((s) => s.id);
  const usePresetTemples = validTempleStyles.includes(spec.templeStyle);

  // Temple material factory
  const makeTempleMaterial = (hasEngraving) =>
    new THREE.MeshStandardMaterial({
      color: isTortoise ? 0xffffff : new THREE.Color(spec.frameColor || '#D4AF37'),
      map: isTortoise ? tortoiseTexture : null,
      metalness: typeof spec.metalness === 'number' ? spec.metalness : 0.9,
      roughness: typeof spec.roughness === 'number' ? spec.roughness : 0.2,
    });

  let leftTempleGroup, rightTempleGroup;
  // Track temple-specific disposables
  const templeDisposables = [];

  if (usePresetTemples) {
    // ── NEW: Preset temple geometry ──────────────────────────────────────────
    const engravingPlacement = spec.engravingPlacement || 'outer_temple';

    leftTempleGroup = buildTempleGeometry(spec.templeStyle, fitProfile, 1, {});
    rightTempleGroup = buildTempleGeometry(spec.templeStyle, fitProfile, -1, {});

    // Assign materials to each body/earTip mesh in the groups
    const applyMaterialToGroup = (group) => {
      const mat = makeTempleMaterial(false);
      templeDisposables.push(mat);
      group.traverse((child) => {
        if (child.isMesh) {
          child.material = mat;
          child.castShadow = true;
        }
      });
      return mat;
    };

    const leftMat = applyMaterialToGroup(leftTempleGroup);
    applyMaterialToGroup(rightTempleGroup);

    // Apply engraving
    if (spec.engravingText && spec.engravingText.trim()) {
      applyEngravingToTemple(leftTempleGroup, spec.engravingText, engravingPlacement, spec.templeStyle, 1);
      if (engravingPlacement === 'two_temples') {
        applyEngravingToTemple(rightTempleGroup, spec.engravingText, engravingPlacement, spec.templeStyle, -1);
      }
    }

    leftTempleGroup.name = 'LeftTemple';
    rightTempleGroup.name = 'RightTemple';
    glassesGroup.add(leftTempleGroup);
    glassesGroup.add(rightTempleGroup);
  } else {
    // ── LEGACY FALLBACK: original TubeGeometry temples ───────────────────────
    const leftTempleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-hingeX, 0.16, 0.0),
      new THREE.Vector3(-hingeX - 0.04, 0.16, -templeLength * 0.145),
      new THREE.Vector3(-hingeX - 0.04, 0.15, -templeLength * 0.582),
      new THREE.Vector3(-hingeX - 0.04, 0.14, -templeLength * 0.8),
      new THREE.Vector3(-hingeX - 0.02, 0.02, -templeLength * 0.945),
      new THREE.Vector3(-hingeX, -0.18, -templeLength),
    ]);

    const templeGeo = new THREE.TubeGeometry(leftTempleCurve, 40, isThinMetal ? 0.016 : 0.032, 10, false);
    disposables.push(templeGeo);

    // Temple material with laser engraving map on left temple
    const engravingTexture = createEngravingTexture(spec.engravingText);
    disposables.push(engravingTexture);

    const leftTempleMaterial = new THREE.MeshStandardMaterial({
      color: isTortoise ? 0xffffff : new THREE.Color(spec.frameColor || '#D4AF37'),
      map: spec.engravingText?.trim() ? engravingTexture : (isTortoise ? tortoiseTexture : null),
      metalness: typeof spec.metalness === 'number' ? spec.metalness : 0.9,
      roughness: typeof spec.roughness === 'number' ? spec.roughness : 0.2,
    });
    disposables.push(leftTempleMaterial);

    const leftTempleMesh = new THREE.Mesh(templeGeo, leftTempleMaterial);
    leftTempleMesh.name = 'LeftTemple';
    glassesGroup.add(leftTempleMesh);

    const rightTempleMesh = new THREE.Mesh(templeGeo, frameMaterial);
    rightTempleMesh.scale.set(-1, 1, 1);
    rightTempleMesh.name = 'RightTemple';
    glassesGroup.add(rightTempleMesh);

    // Store refs for updateMaterials legacy path
    leftTempleGroup = leftTempleMesh;
    rightTempleGroup = rightTempleMesh;
    leftTempleGroup.userData._legacyMaterial = leftTempleMaterial;
    leftTempleGroup.userData._legacyEngravingTexture = engravingTexture;
  }

  // 8. Faceted rhinestones; visibility changes without recreating the glasses model.
  const rhinestoneGeo = new THREE.IcosahedronGeometry(0.026, 1);
  const rhinestoneMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.12,
    metalness: 0.55,
    clearcoat: 0.8,
    emissive: 0x111111,
  });
  disposables.push(rhinestoneGeo, rhinestoneMaterial);
  const rhinestoneGroup = new THREE.Group();
  rhinestoneGroup.name = 'RhinestonesGroup';
  rhinestoneGroup.visible = Boolean(spec.hasRhinestones);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const lx = -0.38 - t * 0.92;
    const ly = 0.32 + Math.sin(t * Math.PI) * 0.12;
    for (const side of [-1, 1]) {
      const gem = new THREE.Mesh(rhinestoneGeo, rhinestoneMaterial);
      gem.position.set(lx * side, ly, 0.055);
      rhinestoneGroup.add(gem);
    }
  }
  glassesGroup.add(rhinestoneGroup);

  // 9. Charm details are real 3D geometry. Each slot has three hidden choices.
  const charmDefinitions = {
    'lumina-star': {
      geometry: createLuminaStarGeometry(),
      material: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.16, metalness: 0.78 }),
    },
    'ruby-heart': {
      geometry: createRubyHeartGeometry(),
      material: new THREE.MeshPhysicalMaterial({ color: 0xdc2626, roughness: 0.15, metalness: 0.25, clearcoat: 1, transmission: 0.35 }),
    },
    'silver-butterfly': {
      geometry: createSilverButterflyGeometry(),
      material: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.82 }),
    },
  };
  Object.values(charmDefinitions).forEach(({ geometry, material }) => disposables.push(geometry, material));
  const charmGroup = new THREE.Group();
  charmGroup.name = 'CharmsGroup';
  const charmMeshes = [];
  for (let slot = 0; slot < 2; slot++) {
    for (const [id, definition] of Object.entries(charmDefinitions)) {
      const mesh = new THREE.Mesh(definition.geometry, definition.material);
      const side = slot === 0 ? -1 : 1;
      mesh.position.set(side * hingeX, 0.16, -0.35);
      mesh.rotation.y = side * -Math.PI / 2;
      mesh.visible = false;
      mesh.userData.charmId = id;
      mesh.userData.slot = slot;
      charmMeshes.push(mesh);
      charmGroup.add(mesh);
    }
  }
  glassesGroup.add(charmGroup);

  // Cleanup helper to prevent WebGL memory leaks
  glassesGroup.userData.updateMaterials = (nextSpec = {}) => {
    const color = nextSpec.frameColor || '#D4AF37';
    const nextIsTortoise = color === 'tortoiseshell';
    if (nextIsTortoise && !tortoiseTexture) {
      tortoiseTexture = createTortoiseshellTexture();
      disposables.push(tortoiseTexture);
    } else if (!nextIsTortoise && tortoiseTexture) {
      tortoiseTexture.dispose();
      tortoiseTexture = null;
    }
    isTortoise = nextIsTortoise;
    const frameMetalness = typeof nextSpec.metalness === 'number' ? nextSpec.metalness : (isThinMetal ? 0.82 : 0.16);
    const frameRoughness = typeof nextSpec.roughness === 'number' ? nextSpec.roughness : (isThinMetal ? 0.22 : 0.34);

    frameMaterial.color.set(isTortoise ? '#ffffff' : color);
    frameMaterial.metalness = frameMetalness;
    frameMaterial.roughness = frameRoughness;
    frameMaterial.map = tortoiseTexture;
    frameMaterial.needsUpdate = true;

    // Update temple materials (preset path vs legacy path)
    if (usePresetTemples) {
      const engravingText = nextSpec.engravingText || '';
      const engravingPlacement = nextSpec.engravingPlacement || spec.engravingPlacement || 'outer_temple';

      // Update material color/metalness on each temple group
      for (const tGroup of [leftTempleGroup, rightTempleGroup]) {
        tGroup.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.color.set(isTortoise ? '#ffffff' : color);
            child.material.metalness = frameMetalness;
            child.material.roughness = frameRoughness;
            child.material.map = isTortoise ? tortoiseTexture : null;
            child.material.needsUpdate = true;
          }
        });
      }

      // Dispose old engraving textures before updating
      for (const tGroup of [leftTempleGroup, rightTempleGroup]) {
        if (tGroup.userData._engravingTexture) {
          tGroup.userData._engravingTexture.dispose();
          tGroup.userData._engravingTexture = null;
        }
        // Clear emissive map
        const body = tGroup.getObjectByProperty('name', 'TempleBody');
        if (body && body.material) {
          body.material.emissiveMap = null;
          body.material.emissiveIntensity = 0;
          body.material.needsUpdate = true;
        }
      }

      if (engravingText.trim()) {
        applyEngravingToTemple(leftTempleGroup, engravingText, engravingPlacement, spec.templeStyle, 1);
        if (engravingPlacement === 'two_temples') {
          applyEngravingToTemple(rightTempleGroup, engravingText, engravingPlacement, spec.templeStyle, -1);
        }
      }
    } else {
      // Legacy path
      const legacyMat = leftTempleGroup.userData._legacyMaterial;
      const legacyTex = leftTempleGroup.userData._legacyEngravingTexture;
      if (legacyMat) {
        legacyMat.color.set(isTortoise ? '#ffffff' : color);
        legacyMat.metalness = frameMetalness;
        legacyMat.roughness = frameRoughness;
        const engravingText = nextSpec.engravingText || '';
        if (legacyTex) {
          updateEngravingTexture(legacyTex, engravingText);
          legacyMat.map = engravingText.trim() ? legacyTex : tortoiseTexture;
        }
        legacyMat.needsUpdate = true;
      }
    }

    lensMaterial.color.set(nextSpec.lensColor || '#1F2937');
    lensMaterial.opacity = typeof nextSpec.lensOpacity === 'number' ? nextSpec.lensOpacity : 0.45;
    lensMaterial.needsUpdate = true;
    rhinestoneGroup.visible = Boolean(nextSpec.hasRhinestones);
    const selectedCharms = Array.isArray(nextSpec.charms) ? nextSpec.charms.slice(0, 2) : [];
    charmMeshes.forEach((mesh) => {
      mesh.visible = selectedCharms[mesh.userData.slot] === mesh.userData.charmId;
    });
  };

  glassesGroup.userData.dispose = () => {
    disposables.forEach((item) => {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    });
  };

  return glassesGroup;
}
