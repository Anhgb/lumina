import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, ImagePlus, Upload, Trash2, AlertCircle, LoaderCircle, FlipHorizontal } from 'lucide-react';
import { analyzeFaceLandmarks, FaceShapeSmoother } from '../../utils/faceLandmarkAnalyzer';
import { GlassesTracker } from './glassesRenderer';
import {
  createThreeDGlassesOverlay,
  disposeThreeDGlassesOverlay,
  updateThreeDGlassesOverlay,
} from './threeDGlassesOverlay';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function AIVirtualTryOn({ designSpec, onFaceAnalyzed, className = '' }) {
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const inputRef = useRef(null);
  const landmarkerRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const urlRef = useRef(null);
  const modeRef = useRef('camera');
  const runningModeRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const lastUiUpdateRef = useRef(0);
  const analysisRef = useRef(null);
  const specRef = useRef(designSpec);
  const detectedRef = useRef(false);
  const trackerRef = useRef(new GlassesTracker());
  const smootherRef = useRef(new FaceShapeSmoother(12));

  const [mode, setMode] = useState('camera');
  const [camera, setCamera] = useState('idle');
  const [upload, setUpload] = useState('empty');
  const [message, setMessage] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [mirrorUpload, setMirrorUpload] = useState(false);
  const [webglError, setWebglError] = useState('');

  useEffect(() => { specRef.current = designSpec; }, [designSpec]);

  const setDetected = useCallback((value) => {
    if (detectedRef.current === value) return;
    detectedRef.current = value;
    setFaceDetected(value);
    if (!value) onFaceAnalyzed?.(null);
  }, [onFaceAnalyzed]);

  const renderOverlay = useCallback((position = trackerRef.current.current, spec = specRef.current) => {
    const canvas = canvasRef.current;
    if (!overlayRef.current || !canvas) return;
    updateThreeDGlassesOverlay(overlayRef.current, position, spec, canvas.width, canvas.height);
  }, []);

  const loseTracking = useCallback(() => {
    const fadedPosition = trackerRef.current.update(null, performance.now());
    renderOverlay(fadedPosition, specRef.current);
    setDetected(false);
  }, [renderOverlay, setDetected]);

  const cancelLoop = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    renderOverlay(null);
  }, [renderOverlay]);

  const releaseImage = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    cancelLoop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    lastTimeRef.current = -1;
    trackerRef.current.reset();
    smootherRef.current.reset();
    setDetected(false);
    renderOverlay(null);
    setCamera('idle');
  }, [cancelLoop, renderOverlay, setDetected]);

  const getLandmarker = useCallback(async (runningMode) => {
    if (landmarkerRef.current) {
      if (runningModeRef.current !== runningMode) {
        await landmarkerRef.current.setOptions({ runningMode });
        runningModeRef.current = runningMode;
      }
      return landmarkerRef.current;
    }
    const create = async (delegate) => FaceLandmarker.createFromOptions(
      await FilesetResolver.forVisionTasks(WASM_URL),
      {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode,
        numFaces: 2,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        // Use normalized landmarks until the matrix coordinate convention is validated here.
        outputFacialTransformationMatrixes: false,
      }
    );
    try {
      landmarkerRef.current = await create('GPU');
    } catch {
      landmarkerRef.current = await create('CPU');
    }
    runningModeRef.current = runningMode;
    return landmarkerRef.current;
  }, []);

  const renderStill = useCallback(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !analysisRef.current) return;
    if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    renderOverlay(trackerRef.current.current, specRef.current);
  }, [renderOverlay]);

  useEffect(() => {
    if (!overlayCanvasRef.current) return undefined;
    try {
      overlayRef.current = createThreeDGlassesOverlay(overlayCanvasRef.current, designSpec);
      renderOverlay(null, designSpec);
    } catch (error) {
      console.error('[AIVirtualTryOn] WebGL overlay initialization failed.', error);
      setWebglError('Không thể khởi tạo lớp kính 3D trên trình duyệt này.');
    }
    const canvas = overlayCanvasRef.current;
    const handleContextLost = (event) => {
      event.preventDefault();
      setWebglError('WebGL đã bị ngắt. Tải lại trang để khởi động lại phần thử kính 3D.');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      disposeThreeDGlassesOverlay(overlayRef.current);
      overlayRef.current = null;
    };
  }, []); // One renderer is retained for this Try-On viewport.

  useEffect(() => {
    if (mode === 'upload' && upload === 'ready') renderStill();
    else renderOverlay(trackerRef.current.current, designSpec);
  }, [designSpec, mode, upload, renderOverlay, renderStill]);

  const renderVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || modeRef.current !== 'camera') return;
    animationRef.current = requestAnimationFrame(renderVideo);
    if (video.readyState < 2) return;

    if (canvas.width !== (video.videoWidth || 640) || canvas.height !== (video.videoHeight || 480)) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!landmarkerRef.current || video.currentTime === lastTimeRef.current) {
      renderOverlay(trackerRef.current.current, specRef.current);
      return;
    }
    lastTimeRef.current = video.currentTime;
    try {
      const result = landmarkerRef.current.detectForVideo(video, performance.now());
      const faces = result?.faceLandmarks || [];
      if (faces.length > 1) {
        loseTracking();
        setMessage('Phát hiện nhiều khuôn mặt. Hãy để một người trong khung hình để chọn đúng vùng thử kính.');
        return;
      }
      const points = faces[0];
      if (!points) {
        loseTracking();
        return;
      }

      // The camera preview is mirrored, so mirror normalized landmarks into that same source space.
      const analysis = analyzeFaceLandmarks(
        points.map((point) => ({ ...point, x: 1 - point.x })),
        canvas.width,
        canvas.height,
        { objectFit: 'contain', devicePixelRatio: 1, baseModel: specRef.current?.baseModel }
      );
      if (!analysis) {
        loseTracking();
        return;
      }
      setDetected(true);
      setMessage('');
      smootherRef.current.addSample(analysis.rawShape);
      const position = trackerRef.current.update({
        x: analysis.centerPx.x,
        y: analysis.centerPx.y,
        scale: analysis.frameScale,
        angle: analysis.rollAngle,
        yaw: analysis.yaw,
        pitch: analysis.pitch,
        confidence: analysis.trackingQuality,
        hingeLeftPx: analysis.hingeLeftPx,
        hingeRightPx: analysis.hingeRightPx,
      });
      renderOverlay(position, specRef.current);
      if (performance.now() - lastUiUpdateRef.current > 250) {
        lastUiUpdateRef.current = performance.now();
        onFaceAnalyzed?.({ ...analysis, shape: smootherRef.current.getSmoothedShape() });
      }
    } catch (error) {
      console.warn('Face detection failed', error);
      loseTracking();
    }
  }, [loseTracking, onFaceAnalyzed, renderOverlay, setDetected]);

  const startCamera = async () => {
    releaseImage();
    analysisRef.current = null;
    setMode('camera');
    modeRef.current = 'camera';
    setCamera('loading');
    setMessage('');

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        const error = new Error('Camera access requires a secure browser context.');
        error.code = 'INSECURE_CONTEXT';
        throw error;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      const metadataReady = new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('The camera stream could not be played.'));
      });
      video.srcObject = stream;
      await metadataReady;
      video.onloadedmetadata = null;
      video.onerror = null;
      await video.play();
      canvasRef.current.width = video.videoWidth || 640;
      canvasRef.current.height = video.videoHeight || 480;
      lastTimeRef.current = -1;
      setCamera('streaming');
      renderVideo();

      try {
        await getLandmarker('VIDEO');
      } catch (modelError) {
        console.error('[AIVirtualTryOn] Face Landmarker startup failed.', modelError);
        setMessage('Camera is running, but the face model could not load. Check your internet connection and try again.');
      }
    } catch (error) {
      console.error('[AIVirtualTryOn] Camera startup failed.', error);
      stopCamera();
      setCamera('error');
      const errors = {
        INSECURE_CONTEXT: 'Open this site at http://localhost:5173 or HTTPS. Camera permission is blocked on an insecure network address.',
        NotAllowedError: 'Camera permission was denied. Allow camera access in the browser address bar, then try again.',
        NotFoundError: 'No camera was found. Connect or enable a webcam, then try again.',
        NotReadableError: 'Your camera is being used by another app. Close another camera app and try again.',
        OverconstrainedError: 'The requested camera settings are not supported. Please try again.',
      };
      setMessage(errors[error.code || error.name] || 'Unable to start the camera. Please check browser camera settings and try again.');
    }
  };

  const chooseUpload = () => {
    stopCamera();
    clearCanvas();
    setMode('upload');
    modeRef.current = 'upload';
    setMirrorUpload(false);
    setMessage('');
  };

  const clearUpload = () => {
    releaseImage();
    analysisRef.current = null;
    if (imageRef.current) imageRef.current.removeAttribute('src');
    clearCanvas();
    trackerRef.current.reset();
    setUpload('empty');
    setDetected(false);
    setMessage('');
    setMirrorUpload(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (file) => {
    if (!file || !IMAGE_TYPES.includes(file.type)) {
      setUpload('error');
      setMessage('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      setUpload('error');
      setMessage('Image size must not exceed 10 MB.');
      return;
    }
    stopCamera();
    releaseImage();
    analysisRef.current = null;
    trackerRef.current.reset();
    setMirrorUpload(false);
    setUpload('loading');
    setMessage('');
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const image = imageRef.current;
    image.onload = async () => {
      if (urlRef.current !== url || !image.naturalWidth) return;
      try {
        setUpload('detecting');
        const result = (await getLandmarker('IMAGE')).detect(image);
        const faces = result?.faceLandmarks || [];
        if (faces.length > 1) {
          setUpload('multiple');
          setDetected(false);
          setMessage('Ảnh có nhiều khuôn mặt. Hãy chọn ảnh chân dung chỉ có một người để thử kính chính xác.');
          clearCanvas();
          return;
        }
        const points = faces[0];
        if (!points) {
          setUpload('no-face');
          setDetected(false);
          setMessage('Không tìm thấy khuôn mặt. Hãy dùng ảnh chân dung rõ nét, đủ sáng và nhìn gần chính diện.');
          clearCanvas();
          return;
        }
        const analysis = analyzeFaceLandmarks(points, image.naturalWidth, image.naturalHeight, {
          objectFit: 'contain',
          devicePixelRatio: 1,
          baseModel: specRef.current?.baseModel,
        });
        if (!analysis) throw new Error('Invalid landmarks');
        analysisRef.current = analysis;
        trackerRef.current.update({
          x: analysis.centerPx.x,
          y: analysis.centerPx.y,
          scale: analysis.frameScale,
          angle: analysis.rollAngle,
          yaw: analysis.yaw,
          pitch: analysis.pitch,
          confidence: analysis.trackingQuality,
          hingeLeftPx: analysis.hingeLeftPx,
          hingeRightPx: analysis.hingeRightPx,
        });
        setDetected(true);
        setUpload('ready');
        onFaceAnalyzed?.({ ...analysis, shape: analysis.rawShape });
        requestAnimationFrame(renderStill);
      } catch (error) {
        console.warn('Portrait analysis failed', error);
        clearCanvas();
        setDetected(false);
        setUpload('error');
        setMessage('Face Landmarker is unavailable or the image could not be analyzed. Please try again.');
      }
    };
    image.onerror = () => {
      setUpload('error');
      setMessage('This image could not be decoded.');
    };
    image.src = url;
  };

  useEffect(() => () => {
    stopCamera();
    releaseImage();
    landmarkerRef.current?.close();
  }, [stopCamera, releaseImage]);

  const busy = upload === 'loading' || upload === 'detecting';
  const previewReady = (mode === 'camera' && camera === 'streaming') || (mode === 'upload' && upload === 'ready');

  return (
    <div className={`relative w-full bg-[#0D0D0D] border border-[#D6D3CD]/20 rounded-sm overflow-hidden flex flex-col ${className}`}>
      <video ref={videoRef} playsInline muted className="hidden" />
      <img ref={imageRef} alt="" className="hidden" />
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />

      <div className="p-3 border-b border-[#D6D3CD]/15 bg-[#141413] flex gap-2">
        <button type="button" onClick={() => { clearUpload(); setMode('camera'); modeRef.current = 'camera'; }} className={`flex-1 py-2 text-xs font-semibold uppercase border rounded-sm ${mode === 'camera' ? 'bg-[#D4AF37] border-[#D4AF37] text-[#141413]' : 'border-[#D6D3CD]/30'}`}>
          <Camera className="inline w-3.5 h-3.5 mr-1" />Live camera
        </button>
        <button type="button" onClick={chooseUpload} className={`flex-1 py-2 text-xs font-semibold uppercase border rounded-sm ${mode === 'upload' ? 'bg-[#D4AF37] border-[#D4AF37] text-[#141413]' : 'border-[#D6D3CD]/30'}`}>
          <ImagePlus className="inline w-3.5 h-3.5 mr-1" />Upload portrait
        </button>
      </div>

      <div className="relative flex-1 min-h-[420px] h-[min(70vh,580px)] max-h-[580px] bg-black">
        <div className={`absolute inset-0 ${mode === 'upload' && mirrorUpload ? 'scale-x-[-1]' : ''}`}>
          <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-contain ${previewReady ? 'block' : 'hidden'}`} />
          <canvas ref={overlayCanvasRef} aria-hidden="true" className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${previewReady && !webglError ? 'block' : 'hidden'}`} />
        </div>

        {mode === 'camera' && camera === 'idle' && <Empty icon={<Camera />} title="Try glasses with live camera" text="Camera starts only after you enable it." action="Enable camera" onClick={startCamera} />}
        {mode === 'camera' && camera === 'loading' && <Busy text="Starting Face Landmarker…" />}
        {mode === 'camera' && camera === 'error' && <Empty icon={<AlertCircle />} title="Unable to start camera" text={message} action="Try again" onClick={startCamera} />}
        {mode === 'upload' && upload !== 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
            <Upload className="w-10 h-10 text-[#D4AF37]" />
            <h3 className="font-brand text-xl font-bold">Upload a portrait</h3>
            <p className="text-xs text-[#FAF8F5]/70">JPEG, PNG, or WebP · up to 10 MB · processed locally in your browser.</p>
            {busy ? <Busy text={upload === 'detecting' ? 'Detecting face…' : 'Loading image…'} /> : <button type="button" onClick={() => inputRef.current?.click()} className="px-5 py-3 bg-[#FAF8F5] text-[#141413] text-xs font-semibold uppercase rounded-sm">Choose image</button>}
            {message && <p role="alert" className="text-xs text-red-300">{message}</p>}
          </div>
        )}
        {previewReady && (
          <>
            <div className="absolute bottom-4 left-4 max-w-[65%] bg-[#141413]/85 px-2.5 py-1.5 text-[9px] leading-relaxed text-[#FAF8F5]/70 pointer-events-none">
              Càng kính là hình học ước lượng theo pose; MediaPipe không định vị chính xác tai hoặc xử lý che khuất tóc.
            </div>
            <div className="absolute top-4 left-4 bg-[#141413]/90 px-3 py-1.5 text-[10px] uppercase pointer-events-none">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
              {faceDetected ? 'Face detected' : 'Finding face…'}
            </div>
            {webglError && <div role="alert" className="absolute top-14 left-4 right-4 bg-[#141413]/95 border border-red-500/50 px-3 py-2 text-[11px]">{webglError}</div>}
            {message && mode === 'camera' && <div role="status" className="absolute top-14 left-4 right-4 bg-[#141413]/95 border border-[#D4AF37]/50 px-3 py-2 text-[11px]">{message}</div>}
            {mode === 'camera' && <button type="button" onClick={stopCamera} className="absolute bottom-4 right-4 px-3 py-2 bg-red-700 text-xs uppercase"><CameraOff className="inline w-3.5 h-3.5 mr-1" />Stop</button>}
            {mode === 'upload' && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button type="button" onClick={() => setMirrorUpload((value) => !value)} className="px-3 py-2 bg-[#141413]/90 text-xs uppercase"><FlipHorizontal className="inline w-3.5 h-3.5 mr-1" />Flip</button>
                <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-2 bg-[#FAF8F5] text-[#141413] text-xs uppercase"><ImagePlus className="inline w-3.5 h-3.5 mr-1" />Change</button>
                <button type="button" onClick={clearUpload} className="px-3 py-2 bg-red-700 text-xs uppercase"><Trash2 className="inline w-3.5 h-3.5 mr-1" />Remove</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Busy({ text }) {
  return <div className="py-8 text-center"><LoaderCircle className="mx-auto w-7 h-7 text-[#D4AF37] animate-spin" /><p className="mt-2 text-xs">{text}</p></div>;
}

function Empty({ icon, title, text, action, onClick }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center py-16 px-6 text-center space-y-4"><div className="w-12 h-12 text-[#D4AF37]">{icon}</div><h3 className="font-brand text-xl font-bold">{title}</h3><p className="text-xs text-[#FAF8F5]/70">{text}</p><button type="button" onClick={onClick} className="px-5 py-3 bg-[#FAF8F5] text-[#141413] text-xs font-semibold uppercase rounded-sm">{action}</button></div>;
}
