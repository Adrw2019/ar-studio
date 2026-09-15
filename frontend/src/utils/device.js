/**
 * AR Studio - Utilidades de Detección de Dispositivo y Entorno
 * Compatible con Chrome Android, Safari iOS/iPadOS, y navegadores de escritorio.
 */

/**
 * Verifica si el navegador soporta WebGL
 */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Verifica si el entorno es seguro (HTTPS o localhost)
 */
export function isSecureContext() {
  if (typeof window === 'undefined') return true;
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'https:'
  );
}

/**
 * Verifica si el navegador tiene API de MediaDevices para acceder a la cámara
 */
export function hasCameraSupport() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Obtiene la lista de cámaras disponibles en el dispositivo
 */
export async function getAvailableCameras() {
  if (!hasCameraSupport()) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (err) {
    console.warn('Error al enumerar cámaras:', err);
    return [];
  }
}

// ============================================================
// Detección de dispositivos Apple (iPhone, iPad, iPod)
// ============================================================

/**
 * Detecta si el dispositivo es iOS/iPadOS.
 * Incluye iPads modernos que reportan user agent de escritorio (macOS con touch).
 */
export function isAppleDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPhones, iPods, iPads con user agent clásico
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  // iPads modernos con iPadOS 13+ reportan "Macintosh" pero tienen touchscreen
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * Detecta si el dispositivo es específicamente un iPhone
 */
export function isIPhone() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone/i.test(navigator.userAgent || '');
}

/**
 * Detecta si el dispositivo es un iPad (incluye iPadOS con UA de escritorio)
 */
export function isIPad() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * Detecta si el navegador es Safari (no Chrome en iOS)
 */
export function isSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Safari real: contiene "Safari" pero NO "CriOS" (Chrome iOS) ni "FxiOS" (Firefox iOS) ni "Chrome"
  const isSafariBrowser = /Safari/i.test(ua) && !/CriOS|FxiOS|Chrome|Chromium|Edg/i.test(ua);
  return isSafariBrowser;
}

/**
 * Detecta si estamos en un navegador basado en WebKit en iOS
 * (todos los navegadores en iOS usan WebKit)
 */
export function isIOSWebKit() {
  return isAppleDevice() && typeof navigator !== 'undefined' && /AppleWebKit/i.test(navigator.userAgent || '');
}

/**
 * Verifica si la app ya se está ejecutando en modo standalone (instalada como PWA)
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  // Estándar: display-mode media query
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // Safari iOS: navigator.standalone
  if (window.navigator && window.navigator.standalone === true) return true;
  return false;
}

/**
 * Verifica si el navegador soporta el evento beforeinstallprompt (Chrome/Edge)
 */
export function supportsInstallPrompt() {
  if (typeof window === 'undefined') return false;
  // beforeinstallprompt solo está disponible en Chromium-based browsers
  return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window;
}

/**
 * Verifica si navigator.storage.persist() está disponible
 */
export function supportsPersistentStorage() {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator.storage && typeof navigator.storage.persist === 'function');
}

/**
 * Verifica si navigator.storage.estimate() está disponible
 */
export function supportsStorageEstimate() {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator.storage && typeof navigator.storage.estimate === 'function');
}

/**
 * Obtiene información del dispositivo actual para diagnóstico
 */
export function getDeviceInfo() {
  return {
    isApple: isAppleDevice(),
    isIPhone: isIPhone(),
    isIPad: isIPad(),
    isSafari: isSafari(),
    isStandalone: isStandalone(),
    supportsInstallPrompt: supportsInstallPrompt(),
    supportsPersistentStorage: supportsPersistentStorage(),
    supportsStorageEstimate: supportsStorageEstimate(),
    hasCamera: hasCameraSupport(),
    isSecure: isSecureContext(),
    hasWebGL: isWebGLAvailable(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  };
}
