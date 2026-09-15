/**
 * AR Studio - Connectivity Service
 * Detección robusta de conectividad que no depende exclusivamente de navigator.onLine.
 * Diferencia entre: dispositivo conectado, API disponible, y proyecto disponible localmente.
 *
 * Compatible con Chrome Android, Safari iOS/iPadOS, y navegadores de escritorio.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');

class ConnectivityService {
  constructor() {
    this.status = {
      deviceOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      apiAvailable: null, // null = no verificado aún, true/false después
      lastCheck: null
    };
    this._listeners = [];
    this._monitorInterval = null;
    this._onlineHandler = null;
    this._offlineHandler = null;
  }

  /**
   * Estado actual de conectividad
   */
  getStatus() {
    return { ...this.status };
  }

  /**
   * Verifica si el dispositivo tiene conectividad real al backend
   * Hace una solicitud ligera HEAD al health endpoint
   * @returns {Promise<boolean>}
   */
  async checkApiAvailability() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      this.status.apiAvailable = response.ok;
      this.status.lastCheck = new Date().toISOString();
      return response.ok;
    } catch (err) {
      this.status.apiAvailable = false;
      this.status.lastCheck = new Date().toISOString();
      return false;
    }
  }

  /**
   * Verifica conectividad completa: dispositivo + API
   * @returns {Promise<{ deviceOnline: boolean, apiAvailable: boolean }>}
   */
  async checkFull() {
    this.status.deviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (this.status.deviceOnline) {
      await this.checkApiAvailability();
    } else {
      this.status.apiAvailable = false;
    }

    this.status.lastCheck = new Date().toISOString();
    return this.getStatus();
  }

  /**
   * Inicia monitoreo continuo de conectividad
   * @param {Function} onStatusChange - Callback cuando cambia el estado
   * @param {number} intervalMs - Intervalo de verificación del API (por defecto 30s)
   */
  startMonitoring(onStatusChange, intervalMs = 30000) {
    this.stopMonitoring();

    if (typeof onStatusChange === 'function') {
      this._listeners.push(onStatusChange);
    }

    // Escuchar eventos online/offline del navegador
    this._onlineHandler = () => {
      this.status.deviceOnline = true;
      this._notifyListeners();
      // Verificar API cuando vuelve la conexión
      this.checkApiAvailability().then(() => this._notifyListeners());
    };

    this._offlineHandler = () => {
      this.status.deviceOnline = false;
      this.status.apiAvailable = false;
      this._notifyListeners();
    };

    window.addEventListener('online', this._onlineHandler);
    window.addEventListener('offline', this._offlineHandler);

    // Verificación periódica del API (no excesiva para no gastar batería)
    this._monitorInterval = setInterval(async () => {
      if (this.status.deviceOnline) {
        const wasAvailable = this.status.apiAvailable;
        await this.checkApiAvailability();
        if (wasAvailable !== this.status.apiAvailable) {
          this._notifyListeners();
        }
      }
    }, intervalMs);

    // Verificación inicial
    this.checkFull().then(() => this._notifyListeners());
  }

  /**
   * Detiene el monitoreo de conectividad
   */
  stopMonitoring() {
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }
    if (this._offlineHandler) {
      window.removeEventListener('offline', this._offlineHandler);
      this._offlineHandler = null;
    }
    this._listeners = [];
  }

  /**
   * Notifica a todos los listeners registrados
   */
  _notifyListeners() {
    const currentStatus = this.getStatus();
    this._listeners.forEach((fn) => {
      try {
        fn(currentStatus);
      } catch (e) {
        console.warn('[Connectivity] Error en listener:', e);
      }
    });
  }
}

// Exportar instancia singleton
export const connectivity = new ConnectivityService();
