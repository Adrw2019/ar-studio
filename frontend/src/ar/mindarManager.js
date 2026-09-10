/**
 * AR Studio - MindAR Manager
 * Encapsula la inicialización, ciclo de vida, permisos de cámara y tracking de MindAR
 */
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { resolveAssetPath } from '../utils/paths';

/**
 * Espera a que el elemento video tenga dimensiones válidas y datos suficientes (readyState >= 2)
 * antes de pasarlo al motor de tracking de MindAR.
 */
export async function waitForVideoReady(video, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        resolve();
        return;
      }

      if (Date.now() - start > timeout) {
        reject(new Error("La cámara no entregó dimensiones válidas."));
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

export class MindARManager {
  constructor(options = {}) {
    this.container = options.container;

    // Resolver URL absoluta del archivo .mind
    let rawTarget = resolveAssetPath(options.imageTargetSrc || 'markers/targets.mind');
    if (typeof window !== 'undefined' && rawTarget && !rawTarget.startsWith('http')) {
      try {
        rawTarget = new URL(rawTarget, window.location.href).href;
      } catch (e) {
        // fallback
      }
    }
    this.imageTargetSrc = rawTarget;

    this.maxTrack = options.maxTrack || 2;
    this.uiLoading = options.uiLoading || 'no';
    this.uiScanning = options.uiScanning || 'no';
    this.uiError = options.uiError || 'no';
    this.filterMinCF = options.filterMinCF || 0.001;
    this.filterBeta = options.filterBeta || 1000;

    this.mindarThree = null;
    this.video = null;
    this.stream = null;
    this.isStarted = false;
    this.anchors = [];
  }

  /**
   * Limpia y detiene cualquier video y stream previo para evitar múltiples streams de cámara
   */
  cleanupVideo() {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error al detener tracks:', e);
      }
      this.stream = null;
    }

    if (this.container) {
      const existingVideos = this.container.querySelectorAll('video');
      existingVideos.forEach((v) => {
        if (v.srcObject) {
          try {
            v.srcObject.getTracks().forEach((t) => t.stop());
          } catch (e) {}
          v.srcObject = null;
        }
        v.remove();
      });
    }

    this.video = null;
  }

  /**
   * Solicita el stream de cámara una única vez, priorizando la cámara trasera
   * y realizando fallback automático si no está disponible.
   */
  async setupCamera() {
    // 1. Validar contexto HTTPS y soporte de API
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      throw new Error('Verifica que estés usando HTTPS');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Verifica que estés usando HTTPS');
    }

    // 2. Limpiar streams anteriores
    this.cleanupVideo();

    // 3. Crear el elemento de video configurado para reproducción inline en móviles
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.style.position = 'absolute';
    video.style.inset = '0px';
    video.style.zIndex = '1';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.margin = '0px';

    this.container.appendChild(video);

    // 4. Solicitar acceso a cámara (una sola vez) con facingMode: { ideal: "environment" }
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' }
        }
      });
    } catch (errRear) {
      console.warn('[MindARManager] Cámara trasera ideal no disponible, intentando fallback:', errRear);

      // Si el usuario denegó el permiso, propagar inmediatamente sin reintentar
      if (errRear.name === 'NotAllowedError' || errRear.name === 'PermissionDeniedError') {
        throw errRear;
      }

      // Fallback a cualquier cámara disponible
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true
        });
      } catch (errFallback) {
        console.error('[MindARManager] Fallback de cámara falló:', errFallback);
        throw errFallback;
      }
    }

    this.stream = stream;
    video.srcObject = stream;
    video.muted = true;

    // 5. Iniciar reproducción
    try {
      await video.play();
    } catch (playErr) {
      console.warn('[MindARManager] Autoplay pendiente de interacción:', playErr);
    }

    // 6. Esperar a que el video tenga dimensiones válidas antes de continuar
    await waitForVideoReady(video, 10000);

    // 7. Verificar explícitamente dimensiones
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('La cámara no entregó dimensiones válidas.');
    }

    video.setAttribute('width', video.videoWidth);
    video.setAttribute('height', video.videoHeight);

    this.video = video;
    return video;
  }

  /**
   * Inicializa la instancia de MindAR y Three.js
   */
  async initialize() {
    if (!this.container) {
      throw new Error('El contenedor DOM para MindAR es requerido.');
    }

    // Pre-verificar que el archivo de targets existe y responde con HTTP 200
    try {
      console.info('[MindARManager] Validando archivo de targets:', this.imageTargetSrc);
      const res = await fetch(this.imageTargetSrc);
      if (!res.ok) {
        throw new Error(`Error ${res.status} al descargar ${this.imageTargetSrc}`);
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1000) {
        throw new Error(`Archivo targets.mind corrupto o muy pequeño (${buf.byteLength} bytes).`);
      }
      console.info('[MindARManager] Targets validados exitosamente:', buf.byteLength, 'bytes.');
    } catch (fetchErr) {
      console.error('[MindARManager] Error al verificar marcadores:', fetchErr);
      throw this.parseError(fetchErr);
    }

    try {
      this.mindarThree = new MindARThree({
        container: this.container,
        imageTargetSrc: this.imageTargetSrc,
        maxTrack: this.maxTrack,
        uiLoading: this.uiLoading,
        uiScanning: this.uiScanning,
        uiError: this.uiError,
        filterMinCF: this.filterMinCF,
        filterBeta: this.filterBeta
      });

      // Proteger _startAR para capturar errores de WebGL/WASM y no congelar la promesa
      const instance = this.mindarThree;
      const originalStartAR = instance._startAR.bind(instance);
      instance._startAR = function () {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Tiempo de espera agotado al inicializar el procesador de visión AR.'));
          }, 15000);

          Promise.resolve()
            .then(() => originalStartAR())
            .then(() => {
              clearTimeout(timeout);
              resolve();
            })
            .catch((arErr) => {
              clearTimeout(timeout);
              console.error('[MindARManager] Error en _startAR:', arErr);
              reject(arErr);
            });
        });
      };

      return {
        renderer: this.mindarThree.renderer,
        scene: this.mindarThree.scene,
        camera: this.mindarThree.camera
      };
    } catch (err) {
      console.error('Error al instanciar MindARThree:', err);
      throw this.parseError(err);
    }
  }

  /**
   * Registra un anclaje para un índice de marcador específico
   * @param {number} targetIndex Índice del marcador en el archivo .mind
   * @returns {Object} Anclaje con { group, onTargetFound, onTargetLost }
   */
  addAnchor(targetIndex) {
    if (!this.mindarThree) {
      throw new Error('MindAR debe inicializarse antes de agregar anclajes.');
    }
    const anchor = this.mindarThree.addAnchor(targetIndex);
    this.anchors.push(anchor);
    return anchor;
  }

  /**
   * Inicia el flujo de cámara y el motor de tracking
   */
  async start() {
    if (!this.mindarThree) {
      throw new Error('MindAR no ha sido inicializado.');
    }

    try {
      // 1. Inicializar cámara y esperar video con dimensiones válidas (videoWidth > 0 && videoHeight > 0)
      const video = await this.setupCamera();

      // 2. Asociar el video verificado a MindARThree
      this.mindarThree.video = video;

      // 3. Evitar que MindARThree vuelva a solicitar getUserMedia creando un stream duplicado
      this.mindarThree._startVideo = () => Promise.resolve();

      // 4. Iniciar MindARThree de forma segura
      await Promise.race([
        this.mindarThree.start(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera de inicialización AR agotado.')), 20000)
        )
      ]);

      this.isStarted = true;
      return true;
    } catch (err) {
      console.error('[MindARManager] Error al iniciar MindAR:', err);
      throw this.parseError(err);
    }
  }

  /**
   * Detiene el motor de tracking, apaga la cámara y libera recursos
   */
  stop() {
    try {
      if (this.mindarThree) {
        if (this.mindarThree.renderer) {
          this.mindarThree.renderer.setAnimationLoop(null);
        }
        if (this.mindarThree.controller && typeof this.mindarThree.stop === 'function') {
          try {
            this.mindarThree.stop();
          } catch (stopErr) {
            console.warn('Error al llamar mindarThree.stop():', stopErr);
          }
        }
      }

      this.cleanupVideo();
      this.isStarted = false;
      this.anchors = [];
    } catch (err) {
      console.warn('Advertencia al detener MindAR:', err);
    }
  }

  /**
   * Traduce errores de cámara/WebGL/HTTPS a mensajes claros y amigables para el usuario
   */
  parseError(err) {
    if (!err) return new Error('No fue posible iniciar la cámara');

    const errName = err.name || '';
    const errorMsg = err.message || String(err);

    // 1. HTTPS requerido
    if (
      errName === 'SecurityError' ||
      errorMsg.includes('HTTPS') ||
      (typeof window !== 'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1')
    ) {
      return new Error('Verifica que estés usando HTTPS. La cámara solo funciona en conexiones seguras.');
    }

    // 2. Permiso denegado
    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errorMsg.includes('NotAllowedError') ||
      errorMsg.includes('Permission denied') ||
      errorMsg.includes('Permiso de cámara denegado')
    ) {
      return new Error('Permiso de cámara denegado. Por favor, autoriza el acceso a la cámara en los ajustes de tu navegador.');
    }

    // 3. No se encontró cámara disponible
    if (
      errName === 'NotFoundError' ||
      errName === 'DevicesNotFoundError' ||
      errorMsg.includes('NotFoundError') ||
      errorMsg.includes('DevicesNotFoundError')
    ) {
      return new Error('No se encontró una cámara disponible en el dispositivo.');
    }

    // 4. Cámara en uso por otra app
    if (
      errName === 'NotReadableError' ||
      errName === 'TrackStartError' ||
      errorMsg.includes('NotReadableError') ||
      errorMsg.includes('TrackStartError')
    ) {
      return new Error('La cámara está siendo utilizada por otra aplicación o pestaña.');
    }

    // 5. Restricciones no satisfechas (OverconstrainedError)
    if (
      errName === 'OverconstrainedError' ||
      errorMsg.includes('OverconstrainedError')
    ) {
      return new Error('No fue posible iniciar la cámara con la configuración solicitada.');
    }

    // 6. Solicitud abortada (AbortError)
    if (
      errName === 'AbortError' ||
      errorMsg.includes('AbortError')
    ) {
      return new Error('No fue posible iniciar la cámara (la solicitud fue cancelada).');
    }

    // 7. Dimensiones no válidas
    if (errorMsg.includes('dimensiones válidas')) {
      return new Error('No fue posible iniciar la cámara: no se obtuvieron dimensiones de video válidas.');
    }

    // 8. Marcadores o WebGL
    if (errorMsg.includes('targets.mind') || errorMsg.includes('marcadores')) {
      return new Error(errorMsg);
    }
    if (errorMsg.includes('WebGL') || errorMsg.includes('webgl')) {
      return new Error('Tu navegador o dispositivo no soporta aceleración WebGL.');
    }

    return new Error(`No fue posible iniciar la cámara: ${errorMsg}`);
  }
}
