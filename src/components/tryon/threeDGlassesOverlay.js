import * as THREE from 'three';
import { buildProceduralEyewear } from '../studio3d/proceduralEyewear';

function collectMaterialStates(root) {
  const seen = new Set();
  const states = [];
  root.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material || seen.has(material)) continue;
      seen.add(material);
      states.push({
        material,
        opacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      });
    }
  });
  return states;
}

function restoreMaterialStates(states = []) {
  for (const state of states) {
    const { material } = state;
    if (material.transparent !== state.transparent) material.needsUpdate = true;
    material.opacity = state.opacity;
    material.transparent = state.transparent;
    material.depthWrite = state.depthWrite;
  }
}

function applyTrackingOpacity(states = [], opacity = 1) {
  const alpha = THREE.MathUtils.clamp(opacity, 0, 1);
  for (const state of states) {
    const { material } = state;
    const transparent = state.transparent || alpha < 0.999;
    if (material.transparent !== transparent) material.needsUpdate = true;
    material.opacity = state.opacity * alpha;
    material.transparent = transparent;
    material.depthWrite = alpha < 0.999 ? false : state.depthWrite;
  }
}

export function createThreeDGlassesOverlay(canvas, initialSpec, width = 640, height = 480) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(2 * Math.atan(height / 2000) * (180 / Math.PI), width / height, 0.1, 3000);
  camera.position.set(0, 0, 1000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.45));
  const keyLight = new THREE.DirectionalLight(0xfff2d8, 1.2);
  keyLight.position.set(-0.4, 0.8, 1);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdde8ff, 0.55);
  fillLight.position.set(0.8, 0.2, -0.5);
  scene.add(fillLight);

  renderer.setSize(width, height, false);
  const glasses = buildProceduralEyewear(initialSpec);
  scene.add(glasses);

  return {
    renderer,
    scene,
    camera,
    glasses,
    width,
    height,
    baseModel: initialSpec?.baseModel || 'aviator',
    lastSpec: initialSpec,
    materialStates: collectMaterialStates(glasses),
  };
}

export function updateThreeDGlassesOverlay(overlay, position, designSpec, width, height) {
  if (!overlay) return;
  const nextWidth = Math.max(1, Math.round(width || overlay.width));
  const nextHeight = Math.max(1, Math.round(height || overlay.height));
  if (overlay.width !== nextWidth || overlay.height !== nextHeight) {
    overlay.width = nextWidth;
    overlay.height = nextHeight;
    overlay.renderer.setSize(nextWidth, nextHeight, false);
    overlay.camera.aspect = nextWidth / nextHeight;
    overlay.camera.fov = 2 * Math.atan(nextHeight / 2000) * (180 / Math.PI);
    overlay.camera.updateProjectionMatrix();
  }

  const model = designSpec?.baseModel || 'aviator';
  if (overlay.baseModel !== model) {
    restoreMaterialStates(overlay.materialStates);
    overlay.scene.remove(overlay.glasses);
    overlay.glasses.userData?.dispose?.();
    overlay.glasses = buildProceduralEyewear(designSpec);
    overlay.scene.add(overlay.glasses);
    overlay.baseModel = model;
    overlay.lastSpec = designSpec;
    overlay.materialStates = collectMaterialStates(overlay.glasses);
  } else if (overlay.lastSpec !== designSpec) {
    restoreMaterialStates(overlay.materialStates);
    overlay.glasses.userData.updateMaterials?.(designSpec);
    overlay.lastSpec = designSpec;
    overlay.materialStates = collectMaterialStates(overlay.glasses);
  }

  restoreMaterialStates(overlay.materialStates);
  if (position?.visible && position.opacity > 0) {
    overlay.glasses.visible = true;
    const center = position.centerPx || { x: position.x, y: position.y };
    const frameScale = position.frameScale || position.scale;
    overlay.glasses.position.set(center.x - nextWidth / 2, nextHeight / 2 - center.y, 0);
    overlay.glasses.scale.setScalar(frameScale);
    overlay.glasses.rotation.set(position.pitch || 0, position.yaw || 0, -(position.angle || 0));
    applyTrackingOpacity(overlay.materialStates, position.opacity);
  } else {
    overlay.glasses.visible = false;
  }

  overlay.renderer.render(overlay.scene, overlay.camera);
}

export function disposeThreeDGlassesOverlay(overlay) {
  if (!overlay) return;
  overlay.scene.remove(overlay.glasses);
  overlay.glasses.userData?.dispose?.();
  overlay.renderer.dispose();
}
