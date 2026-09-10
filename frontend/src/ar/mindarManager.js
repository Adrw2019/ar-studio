/**
 * AR Studio - MindAR Manager
 * Encapsula la inicialización, ciclo de vida, permisos de cámara y tracking de MindAR
 */
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

export class MindARManager {
  constructor(options = {}) {
    this.container = options.container;
    this.imageTargetSrc = options.imageTargetSrc || '/markers/targets.mind';
    this.maxTrack = options.maxTrack || 2;
    this.uiLoading = options.uiLoading || 'no';
    this.uiScanning = options.uiScanning || 'no';
    this.uiError = options.uiError || 'no';
    this.filterMinCF = options.filterMinCF || 0.001;
    this.filterBeta = options.filterBeta || 1000;
    
    this.mindarThree = null;
    this.isStarted = false;
    this.anchors = [];
  }

  /**
   * Inicializa la instancia de MindAR y Three.js
   */
  async initialize() {
    if (!this.container) {
      throw new Error('El contenedor DOM para MindAR es requerido.');
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

      // Sobrescribir _startVideo para compatibilidad móvil robusta (Chrome/Brave/Safari)
      const instance = this.mindarThree;
      const domContainer = this.container;
      instance._startVideo = function() {
        return new Promise(async (resolve, reject) => {
          // Limpiar videos previos
          const existingVideos = domContainer.querySelectorAll('video');
          existingVideos.forEach(v => {
            if (v.srcObject) {
              v.srcObject.getTracks().forEach(t => t.stop());
            }
            v.remove();
          });

          const video = document.createElement('video');
          video.setAttribute('autoplay', '');
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.style.position = 'absolute';
          video.style.top = '0px';
          video.style.left = '0px';
          video.style.zIndex = '-2';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'cover';

          instance.video = video;
          domContainer.appendChild(video);

          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            instance.ui.showCompatibility();
            reject(new Error('Tu navegador no soporta captura de cámara.'));
            return;
          }

          let stream = null;
          try {
            // Intento 1: Cámara trasera (environment)
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: { ideal: 'environment' } }
            });
          } catch (e1) {
            console.warn('Fallo cámara trasera ideal, intentando modo básico:', e1);
            try {
              // Intento 2: Cualquier cámara disponible
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
              });
            } catch (e2) {
              console.error('Error total en getUserMedia:', e2);
              reject(e2);
              return;
            }
          }

          video.srcObject = stream;
          video.muted = true;

          // Forzar reproducción inmediata
          try {
            await video.play();
          } catch (playErr) {
            console.warn('Autoplay pendiente de interacción del usuario:', playErr);
          }

          let isResolved = false;
          const markReady = () => {
            if (isResolved) return;
            isResolved = true;
            const w = video.videoWidth || 640;
            const h = video.videoHeight || 480;
            video.setAttribute('width', w);
            video.setAttribute('height', h);
            resolve();
          };

          if (video.videoWidth > 0) {
            markReady();
          } else {
            video.addEventListener('loadedmetadata', markReady, { once: true });
            video.addEventListener('canplay', markReady, { once: true });
            video.addEventListener('playing', markReady, { once: true });

            // Safety timeout: si en 2.5s no disparó evento pero hay stream activo, forzar avance
            setTimeout(() => {
              if (!isResolved) {
                console.info('[MindAR] Activando fallback de dimensiones de video');
                markReady();
              }
            }, 2500);
          }
        });
      };

      // Proteger _startAR para capturar errores de WebGL/WASM y no congelar la promesa
      const originalStartAR = instance._startAR.bind(instance);
      instance._startAR = function() {
        return new Promise(async (resolve, reject) => {
          try {
            await originalStartAR();
            resolve();
          } catch (arErr) {
            console.error('Error al inicializar tracker AR (WebGL/WASM):', arErr);
            reject(arErr);
          }
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
      await this.mindarThree.start();
      this.isStarted = true;
      return true;
    } catch (err) {
      console.error('Error al iniciar MindAR:', err);
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
        
        // Detener streams de video explícitamente en dispositivos móviles
        if (this.container) {
          const videos = this.container.querySelectorAll('video');
          videos.forEach((video) => {
            if (video.srcObject) {
              const tracks = video.srcObject.getTracks();
              tracks.forEach(track => track.stop());
              video.srcObject = null;
            }
            video.remove();
          });
        }
      }
      this.isStarted = false;
      this.anchors = [];
    } catch (err) {
      console.warn('Advertencia al detener MindAR:', err);
    }
  }

  /**
   * Traduce errores comunes de cámara/WebGL a mensajes claros para el usuario
   */
  parseError(err) {
    const errorMsg = err?.message || err?.name || String(err);
    
    if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
      return new Error('Permiso de cámara denegado. Por favor, autoriza el acceso a la cámara en los ajustes de tu navegador.');
    }
    if (errorMsg.includes('NotFoundError') || errorMsg.includes('DevicesNotFoundError')) {
      return new Error('No se encontró ninguna cámara trasera en el dispositivo.');
    }
    if (errorMsg.includes('NotReadableError') || errorMsg.includes('TrackStartError')) {
      return new Error('La cámara está siendo utilizada por otra aplicación.');
    }
    if (errorMsg.includes('WebGL') || errorMsg.includes('webgl')) {
      return new Error('Tu navegador o dispositivo no soporta aceleración WebGL.');
    }
    if (errorMsg.includes('targets.mind') || errorMsg.includes('404')) {
      return new Error('No se pudo cargar el archivo de targets /markers/targets.mind.');
    }

    return new Error(`Error al iniciar Realidad Aumentada: ${errorMsg}`);
  }
}
