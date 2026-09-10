/**
 * AR Studio - Utilidades de Detección de Dispositivo y Entorno
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
