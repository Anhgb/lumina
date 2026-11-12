import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildProceduralEyewear } from './proceduralEyewear';
import { getFrameModel } from '../../data/frameModels';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Eye, Sparkles, AlertTriangle } from 'lucide-react';

/**
 * ThreeDCustomizer — Real-time WebGL 3D Eyewear Viewer with OrbitControls.
 * Conforms to PRD Section 5.5 & Prompt 5:
 * - Clean lifecycle management (disposes geometries, materials, textures)
 * - Single WebGLRenderer instance preserved across updates
 * - OrbitControls for rotate, pan, and zoom
 * - Camera reset & auto-rotate toggles
 * - WebGL compatibility detection & graceful fallback
 * - Exposes captureSnapshot() for watermark & cart export
 */
const ThreeDCustomizer = forwardRef(function ThreeDCustomizer(
  { designSpec, className = '' },
  ref
) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelGroupRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const [isAutoRotate, setIsAutoRotate] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const selectedModel = getFrameModel(designSpec?.baseModel);

  // Expose captureSnapshot function to parent via ref
  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return null;
      }
      // Force render to ensure clean buffer
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL('image/png', 0.95);
    },
    resetCamera: () => {
      if (controlsRef.current && cameraRef.current) {
        cameraRef.current.position.set(0, 0.4, 3.6);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    },
    setCamera: (pos, target) => {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(pos[0], pos[1], pos[2]);
        controlsRef.current.target.set(target[0], target[1], target[2]);
        controlsRef.current.update();
      }
    },
  }));

  // Initial WebGL scene setup (Runs ONCE on mount)
  useEffect(() => {
    // 1. WebGL Support check
    const isWebGLAvailable = () => {
      try {
        const canvas = document.createElement('canvas');
        return Boolean(
          window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch {
        return false;
      }
    };

    if (!isWebGLAvailable()) {
      setWebGlSupported(false);
      setLoading(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 2. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0c0c); // Deep luxury studio obsidian

    // Soft studio floor reflection grid (subdued, elegant)
    const gridHelper = new THREE.GridHelper(8, 20, 0x222222, 0x131313);
    gridHelper.position.y = -1.1;
    scene.add(gridHelper);

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0.45, 3.6);
    cameraRef.current = camera;

    // 4. Renderer with preserveDrawingBuffer for Snapshots (PRD 5.7)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 5. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.6;
    controls.maxDistance = 6.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Don't dip too far beneath floor
    controls.autoRotate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 1.4;
    controlsRef.current = controls;

    // 6. Luxury Studio Lighting
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.85);
    scene.add(ambientLight);

    // Key Light (warm gold-champagne)
    const keyLight = new THREE.DirectionalLight(0xffe8c2, 1.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    // Fill Light (cool titanium rim)
    const fillLight = new THREE.DirectionalLight(0xdce7f5, 1.2);
    fillLight.position.set(-4, 3, 2);
    scene.add(fillLight);

    // Back / Rim Light for metallic edges & crystal shine
    const rimLight = new THREE.DirectionalLight(0xd4af37, 2.0);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Top spotlight on eyewear
    const spotLight = new THREE.SpotLight(0xffffff, 1.5, 10, Math.PI / 5, 0.3);
    spotLight.position.set(0, 3, 1.5);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // 7. Animation loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    setLoading(false);

    // 8. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    const handleContextLost = (event) => {
      event.preventDefault();
      setWebGlSupported(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // 9. Cleanup on Unmount (PRD Section 6 Rule)
    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (controls) controls.dispose();
      if (modelGroupRef.current?.userData?.dispose) {
        modelGroupRef.current.userData.dispose();
      }
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  // Geometry is replaced only when the selected silhouette changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !designSpec) return;

    // Remove old model and dispose geometries & materials cleanly
    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      if (modelGroupRef.current.userData?.dispose) {
        modelGroupRef.current.userData.dispose();
      }
      modelGroupRef.current = null;
    }

    // Build new procedural glasses model with current designSpec
    try {
      const newGlasses = buildProceduralEyewear(designSpec);
      newGlasses.position.set(0, 0, 0);
      scene.add(newGlasses);
      modelGroupRef.current = newGlasses;
    } catch (err) {
      console.error('[ThreeDCustomizer] Error building procedural eyewear:', err);
    }
  }, [designSpec?.baseModel, designSpec?.templeStyle]);

  // Material, engraving, and accessory changes reuse the current geometry and renderer.
  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group) return;
    group.userData.updateMaterials?.(designSpec);
    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [designSpec]);

  // Handle auto-rotate toggle
  const toggleAutoRotate = () => {
    if (controlsRef.current) {
      const nextState = !isAutoRotate;
      controlsRef.current.autoRotate = nextState;
      setIsAutoRotate(nextState);
    }
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0, 0.45, 3.6);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Zoom helpers
  const handleZoom = (delta) => {
    if (cameraRef.current && controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, delta);
      controlsRef.current.update();
    }
  };

  // WebGL Not Supported Screen
  if (!webGlSupported) {
    return (
      <div className="w-full h-full min-h-[460px] bg-[#0D0D0D] border border-[#D6D3CD]/20 rounded-sm flex flex-col items-center justify-center p-6 text-center text-[#FAF8F5]">
        <AlertTriangle className="w-12 h-12 text-[#D97706] mb-3" />
        <h3 className="font-brand text-xl font-bold mb-2">Trình Duyệt Chưa Hỗ Trợ WebGL</h3>
        <p className="text-xs text-[#FAF8F5]/70 max-w-md font-body leading-relaxed mb-4">
          Phòng chế tác 3D Bespoke Atelier yêu cầu tăng tốc phần cứng WebGL để dựng mô hình Three.js.
          Vui lòng kích hoạt tăng tốc phần cứng trong cài đặt trình duyệt của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[460px] bg-[#0D0D0D] rounded-sm overflow-hidden select-none ${className}`}>
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#0D0D0D] flex flex-col items-center justify-center text-[#D4AF37] space-y-3 z-20">
          <Sparkles className="w-8 h-8 animate-spin" />
          <span className="text-xs font-mono uppercase tracking-[0.25em]">
            Đang khởi tạo WebGL 3D Atelier...
          </span>
        </div>
      )}

      {/* Top-Left Overlay Badge: Editorial Atelier Spec */}
      <div className="absolute top-5 left-5 z-10 pointer-events-none">
        <div className="bg-[#121212]/85 backdrop-blur-md px-4 py-3 border border-[#D4AF37]/30 rounded-sm shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#D4AF37] text-[10px]">✦</span>
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37]">
              LUMINA / 3D ATELIER
            </span>
            <span className="flex h-1.5 w-1.5 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D4AF37]"></span>
            </span>
          </div>
          <h3 className="text-sm font-brand font-bold text-[#FAF8F5] tracking-wide uppercase">
            {`FRAME / ${selectedModel.name.toUpperCase()}`}
          </h3>
          <p className="text-[10px] font-body text-[#FAF8F5]/60 mt-0.5">
            {selectedModel.description}
          </p>
        </div>
      </div>

      {/* Floating 3D Navigation Controls (Bottom-Right Glassmorphism Pill) */}
      <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 bg-[#141413]/90 backdrop-blur-md p-1.5 border border-[#D6D3CD]/20 rounded-full shadow-2xl">
        <button
          type="button"
          onClick={toggleAutoRotate}
          title={isAutoRotate ? 'Dừng tự động xoay (360°)' : 'Bật tự động xoay 360°'}
          className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            isAutoRotate
              ? 'bg-[#D4AF37] text-[#141413] font-bold shadow-md shadow-[#D4AF37]/20'
              : 'text-[#FAF8F5]/70 hover:text-[#FAF8F5] hover:bg-white/10'
          }`}
          aria-label="Tự động xoay 360 độ"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span className="text-[10px] font-bold">360°</span>
        </button>

        <span className="w-px h-3.5 bg-[#D6D3CD]/20 mx-0.5" />

        <button
          type="button"
          onClick={handleResetCamera}
          title="Đặt lại góc nhìn chính diện"
          className="p-2 text-[#FAF8F5]/70 hover:text-[#D4AF37] hover:bg-white/10 rounded-full transition-colors"
          aria-label="Đặt lại góc nhìn chính diện"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleZoom(0.35)}
          title="Phóng to gần hơn"
          className="p-2 text-[#FAF8F5]/70 hover:text-[#D4AF37] hover:bg-white/10 rounded-full transition-colors"
          aria-label="Phóng to"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleZoom(-0.35)}
          title="Thu nhỏ xa hơn"
          className="p-2 text-[#FAF8F5]/70 hover:text-[#D4AF37] hover:bg-white/10 rounded-full transition-colors"
          aria-label="Thu nhỏ"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Minimalist Hint (Bottom-Left) */}
      <div className="absolute bottom-5 left-5 z-10 hidden sm:flex items-center gap-2 text-[10px] text-[#FAF8F5]/45 font-mono pointer-events-none bg-[#141413]/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-[#D6D3CD]/10">
        <Eye className="w-3 h-3 text-[#D4AF37]" />
        <span>Kéo chuột để xoay 360° · Cuộn để phóng to</span>
      </div>
    </div>
  );
});

export default ThreeDCustomizer;
