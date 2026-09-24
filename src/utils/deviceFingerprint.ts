import { DeviceFingerprintData } from '../types';

/**
 * Fast DJB2 hash algorithm for converting strings to hex fingerprint hashes
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 1. Canvas Fingerprinting
 * Draws complex text, geometric shapes, emojis, gradients, and shadows on an invisible canvas.
 * GPU and rasterization variations create a unique signature across devices and drivers.
 */
export function getCanvasFingerprint(): { hash: string; dataUrlSample: string } {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return { hash: 'canvas_unsupported', dataUrlSample: '' };
    }

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 280, 0);
    gradient.addColorStop(0, '#059669');
    gradient.addColorStop(0.5, '#2563eb');
    gradient.addColorStop(1, '#db2777');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 280, 60);

    // Text rendering with subtle shadows and custom font stack
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Times New Roman', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 3;
    ctx.fillText('SmartDialer™ BD FinTech Shield 🛡️ ৳১,৫০০', 6, 12);

    // Secondary shapes and alpha blending
    ctx.fillStyle = 'rgba(255, 235, 59, 0.85)';
    ctx.beginPath();
    ctx.arc(245, 30, 18, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    const dataUrl = canvas.toDataURL();
    const hash = hashString(dataUrl);

    return {
      hash: `cv_${hash}`,
      dataUrlSample: dataUrl,
    };
  } catch {
    return { hash: 'cv_error', dataUrlSample: '' };
  }
}

/**
 * 2. WebGL Hardware & Shader Fingerprinting
 * Extracts unmasked GPU vendor, GPU model renderer (ANGLE/Intel/Mali/Adreno/NVIDIA),
 * supported extensions count, and precision formats.
 */
export function getWebGLFingerprint(): {
  hash: string;
  vendor: string;
  renderer: string;
  extensionsCount: number;
} {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return {
        hash: 'gl_unavailable',
        vendor: 'Unknown / Blocked',
        renderer: 'Software / No WebGL',
        extensionsCount: 0,
      };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let vendor = 'Standard WebGL Vendor';
    let renderer = 'Standard WebGL Renderer';

    if (debugInfo) {
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
    } else {
      vendor = gl.getParameter(gl.VENDOR) || vendor;
      renderer = gl.getParameter(gl.RENDERER) || renderer;
    }

    const extensions = gl.getSupportedExtensions() || [];
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) || [0, 0];

    const rawGlSignature = `${vendor}~${renderer}~ext:${extensions.length}~tex:${maxTextureSize}~vp:${maxViewportDims}`;
    const hash = `gl_${hashString(rawGlSignature)}`;

    return {
      hash,
      vendor: String(vendor),
      renderer: String(renderer),
      extensionsCount: extensions.length,
    };
  } catch {
    return {
      hash: 'gl_error',
      vendor: 'Error',
      renderer: 'Error',
      extensionsCount: 0,
    };
  }
}

/**
 * 3. Audio Context Processing Fingerprint
 * Analyzes microscopic variations in oscillator frequency response and dynamics compression.
 */
export async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return 'aud_unsupported';
    }

    const offlineCtx = new OfflineAudioContext(1, 44100, 44100);
    const oscillator = offlineCtx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, offlineCtx.currentTime);

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, offlineCtx.currentTime);
    compressor.knee.setValueAtTime(40, offlineCtx.currentTime);
    compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);
    compressor.attack.setValueAtTime(0, offlineCtx.currentTime);
    compressor.release.setValueAtTime(0.25, offlineCtx.currentTime);

    oscillator.connect(compressor);
    compressor.connect(offlineCtx.destination);

    oscillator.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    const channelData = renderedBuffer.getChannelData(0);

    let sum = 0;
    for (let i = 4500; i < 5000; i++) {
      sum += Math.abs(channelData[i]);
    }

    return `aud_${hashString(String(sum))}`;
  } catch {
    return 'aud_fallback';
  }
}

/**
 * Complete Device Fingerprint Collector
 */
export async function collectDeviceFingerprint(): Promise<DeviceFingerprintData> {
  const canvasInfo = getCanvasFingerprint();
  const webglInfo = getWebGLFingerprint();
  const audioHash = await getAudioFingerprint();

  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  const colorDepth = window.screen?.colorDepth || 24;
  const pixelRatio = window.devicePixelRatio || 1;
  const platform = navigator.platform || 'Unknown';
  const touchSupport = Boolean(
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  );
  const userAgent = navigator.userAgent;

  // Combine components into unique deviceHash
  const rawSignature = [
    canvasInfo.hash,
    webglInfo.hash,
    webglInfo.renderer,
    audioHash,
    hardwareConcurrency,
    deviceMemoryGb || 'x',
    screenResolution,
    colorDepth,
    pixelRatio,
    platform,
    touchSupport ? 'touch' : 'notouch',
  ].join('|');

  const deviceHash = `dev_bd_${hashString(rawSignature)}`;

  return {
    deviceHash,
    canvasHash: canvasInfo.hash,
    webglHash: webglInfo.hash,
    webglVendor: webglInfo.vendor,
    webglRenderer: webglInfo.renderer,
    hardwareConcurrency,
    deviceMemoryGb,
    screenResolution,
    colorDepth,
    pixelRatio,
    platform,
    touchSupport,
    audioHash,
    userAgent,
  };
}
