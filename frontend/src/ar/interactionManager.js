/**
 * AR Studio - Interaction Manager
 * Gestiona raycasting táctil, animación de pulsación y motor de reglas multi-marcador
 */
import * as THREE from 'three';

export class InteractionManager {
  constructor(options = {}) {
    this.camera = options.camera;
    this.scene = options.scene;
    this.container = options.container;
    this.sceneManager = options.sceneManager;
    this.onObjectTouched = options.onObjectTouched || (() => {});
    this.onInteractionTriggered = options.onInteractionTriggered || (() => {});
    this.onInteractionEnded = options.onInteractionEnded || (() => {});

    this.raycaster = new THREE.Raycaster();
    this.touchCoord = new THREE.Vector2();
    this.activeMarkers = new Set();
    this.activeRules = new Set();

    this.boundHandleTouch = this.handleTouch.bind(this);
    this.initEventListeners();
  }

  /**
   * Inicializa listeners táctiles móviles nativos
   */
  initEventListeners() {
    if (this.container) {
      this.container.addEventListener('touchstart', this.boundHandleTouch, { passive: false });
      this.container.addEventListener('pointerdown', this.boundHandleTouch, { passive: true });
    }
  }

  /**
   * Limpia event listeners
   */
  destroy() {
    if (this.container) {
      this.container.removeEventListener('touchstart', this.boundHandleTouch);
      this.container.removeEventListener('pointerdown', this.boundHandleTouch);
    }
    this.activeMarkers.clear();
    this.activeRules.clear();
  }

  /**
   * Manejador de eventos táctiles con Raycasting
   */
  handleTouch(event) {
    // Obtener coordenadas de toque
    let clientX, clientY;
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    if (clientX === undefined || clientY === undefined) return;

    const rect = this.container.getBoundingClientRect();
    this.touchCoord.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.touchCoord.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.touchCoord, this.camera);

    // Buscar intersección con los objetos interactivos
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    const hit = intersects.find((i) => i.object.userData && (i.object.userData.interactive || i.object.userData.markerName));

    if (hit) {
      const markerName = hit.object.userData.markerName || 'Modelo';
      
      // Encontrar el grupo contenedor del modelo para animar escala
      let current = hit.object;
      while (current.parent && !current.name.startsWith('marker-model-') && current.parent !== this.scene) {
        current = current.parent;
      }

      if (current && current.userData) {
        const initial = current.userData.initialScale || current.scale.clone();
        current.userData.initialScale = initial;
        // Escalar 1.35x temporalmente como feedback táctil
        current.userData.targetScale = initial.clone().multiplyScalar(1.35);
        current.userData.isScaling = true;
      }

      // Feedback háptico en celulares compatibles
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([25, 35, 25]); } catch (e) { /* ignore */ }
      }

      // Notificar a la UI
      this.onObjectTouched(markerName, hit.object.userData);
    }
  }

  /**
   * Actualiza el estado de los marcadores visibles y evalúa reglas de interacción
   * @param {string} markerName Nombre del marcador
   * @param {boolean} isVisible Estado de visibilidad
   * @param {Array} interactionRules Reglas configuradas
   */
  updateMarkerVisibility(markerName, isVisible, interactionRules = []) {
    if (isVisible) {
      this.activeMarkers.add(markerName);
    } else {
      this.activeMarkers.delete(markerName);
    }

    this.evaluateRules(interactionRules);
  }

  /**
   * Evalúa si se cumplen las condiciones para activar interacciones multi-tarjeta
   */
  evaluateRules(interactionRules = []) {
    interactionRules.forEach((rule) => {
      const allRequiredPresent = rule.requiredMarkers.every((markerName) => 
        this.activeMarkers.has(markerName)
      );

      if (allRequiredPresent && !this.activeRules.has(rule.id)) {
        // Regla activada
        this.activeRules.add(rule.id);
        if (rule.action === 'startMotor' && this.sceneManager) {
          this.sceneManager.setMotorActive(true);
        }
        this.onInteractionTriggered(rule);
      } else if (!allRequiredPresent && this.activeRules.has(rule.id)) {
        // Regla desactivada
        this.activeRules.delete(rule.id);
        if (rule.action === 'startMotor' && this.sceneManager) {
          this.sceneManager.setMotorActive(false);
        }
        this.onInteractionEnded(rule);
      }
    });
  }

  /**
   * Restaura los estados de interacción
   */
  reset() {
    this.activeRules.clear();
    if (this.sceneManager) {
      this.sceneManager.setMotorActive(false);
    }
  }
}
