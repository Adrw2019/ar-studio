/**
 * AR Studio - Offline Storage Service
 * Almacenamiento offline de proyectos completos usando IndexedDB.
 * Compatible con Chrome Android, Safari iOS/iPadOS, y navegadores de escritorio.
 *
 * NO depende de File System Access API.
 * NO depende de APIs exclusivas de Chromium.
 * Gestiona Blob URLs correctamente para evitar fugas de memoria en iPhone/iPad.
 */

const DB_NAME = 'ar-studio-offline';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'assets';

class OfflineStorageService {
  constructor() {
    this.db = null;
    /** @type {Map<string, string>} Registro de Blob URLs activas para revocar al limpiar */
    this._activeBlobUrls = new Map();
  }

  // ============================================================
  // Inicialización de la base de datos
  // ============================================================

  /**
   * Abre o crea la base de datos IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store para metadatos de proyectos (JSON con configuración, markers, assets info)
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const projectStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('slug', 'slug', { unique: false });
          projectStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // Store para blobs de archivos binarios (targets.mind, GLB, imágenes, audio, video)
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          const assetStore = db.createObjectStore(STORE_ASSETS, { keyPath: 'key' });
          assetStore.createIndex('projectId', 'projectId', { unique: false });
          assetStore.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[OfflineStorage] Base de datos inicializada.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[OfflineStorage] Error al abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // ============================================================
  // Transacciones genéricas
  // ============================================================

  /**
   * Ejecuta una transacción en un object store
   */
  _transaction(storeName, mode = 'readonly') {
    if (!this.db) throw new Error('IndexedDB no inicializada. Llama a init() primero.');
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  /**
   * Wrapper de promesa para operaciones IDB
   */
  _promisify(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================
  // Estimación de tamaño de descarga
  // ============================================================

  /**
   * Calcula el tamaño aproximado de descarga de un proyecto (sin descargarlo)
   * @param {Object} project - Datos del proyecto con markers y assets
   * @returns {Promise<{ totalBytes: number, formattedSize: string, assetCount: number }>}
   */
  async estimateProjectSize(project) {
    const urls = this._collectProjectAssetUrls(project);
    let totalBytes = 0;
    let measured = 0;

    // Usar HEAD requests para obtener Content-Length sin descargar
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              totalBytes += parseInt(contentLength, 10);
              measured++;
            }
          }
        } catch (err) {
          // Si HEAD falla, ignorar y no sumar
        }
      })
    );

    // Si no pudimos medir todos, estimar el resto basado en promedio
    if (measured > 0 && measured < urls.length) {
      const avgSize = totalBytes / measured;
      totalBytes += avgSize * (urls.length - measured);
    }

    // Agregar metadatos del proyecto (~10KB estimado)
    totalBytes += 10 * 1024;

    return {
      totalBytes: Math.round(totalBytes),
      formattedSize: this._formatBytes(totalBytes),
      assetCount: urls.length,
      measuredCount: measured
    };
  }

  /**
   * Consulta el espacio de almacenamiento disponible (cuando la API exista)
   * @returns {Promise<{ quota: number, usage: number, available: number, formattedAvailable: string } | null>}
   */
  async getStorageEstimate() {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return null;
    }
    try {
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota || 0) - (estimate.usage || 0);
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        available,
        formattedQuota: this._formatBytes(estimate.quota || 0),
        formattedUsage: this._formatBytes(estimate.usage || 0),
        formattedAvailable: this._formatBytes(available)
      };
    } catch (err) {
      console.warn('[OfflineStorage] storage.estimate() no disponible:', err);
      return null;
    }
  }

  /**
   * Solicita almacenamiento persistente (si está disponible)
   * No bloquea si no está disponible (Safari, etc.)
   */
  async requestPersistentStorage() {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
      console.info('[OfflineStorage] navigator.storage.persist() no disponible en este navegador.');
      return false;
    }
    try {
      const granted = await navigator.storage.persist();
      console.log('[OfflineStorage] Almacenamiento persistente:', granted ? 'concedido' : 'denegado');
      return granted;
    } catch (err) {
      console.warn('[OfflineStorage] Error al solicitar persistencia:', err);
      return false;
    }
  }

  // ============================================================
  // Descarga y almacenamiento de proyectos
  // ============================================================

  /**
   * Descarga y almacena un proyecto completo con todos sus assets en IndexedDB
   * @param {Object} project - Datos completos del proyecto
   * @param {Function} onProgress - Callback de progreso (0-100)
   * @returns {Promise<{ success: boolean, assetsDownloaded: number, totalSize: number }>}
   */
  async downloadProject(project, onProgress = () => {}) {
    await this.init();

    const projectId = String(project.id);
    const urls = this._collectProjectAssetUrls(project);
    const totalItems = urls.length + 1; // +1 para los metadatos del proyecto
    let completedItems = 0;
    let totalSize = 0;

    onProgress(0);

    // 1. Descargar y almacenar cada asset como Blob en IndexedDB
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`[OfflineStorage] Error al descargar ${url}: HTTP ${response.status}`);
          completedItems++;
          onProgress(Math.round((completedItems / totalItems) * 100));
          continue;
        }

        const blob = await response.blob();
        totalSize += blob.size;

        const assetKey = this._urlToAssetKey(projectId, url);
        const assetRecord = {
          key: assetKey,
          projectId,
          originalUrl: url,
          type: this._detectAssetType(url),
          mimeType: blob.type || this._guessMimeType(url),
          size: blob.size,
          blob: blob,
          downloadedAt: new Date().toISOString()
        };

        const store = this._transaction(STORE_ASSETS, 'readwrite');
        await this._promisify(store.put(assetRecord));
      } catch (err) {
        console.warn(`[OfflineStorage] No se pudo descargar: ${url}`, err.message);
      }

      completedItems++;
      onProgress(Math.round((completedItems / totalItems) * 95));
    }

    // 2. Almacenar metadatos del proyecto (sin blobs, solo JSON)
    const projectRecord = {
      id: projectId,
      slug: project.slug || '',
      name: project.name || 'Proyecto AR',
      category: project.category || '',
      description: project.description || '',
      mind_file_url: project.mind_file_url || '',
      max_track_targets: project.max_track_targets || 2,
      theme: project.theme || {},
      markers: (project.markers || []).map((m) => ({
        ...m,
        // No incluir blobs en los metadatos
      })),
      assets: (project.assets || []).map((a) => ({
        ...a,
        // No incluir blobs en los metadatos
      })),
      interactions: project.interactions || [],
      tracking_status: project.tracking_status || 'ready',
      status: project.status || 'published',
      downloadedAt: new Date().toISOString(),
      totalSize,
      assetCount: urls.length
    };

    const projectStore = this._transaction(STORE_PROJECTS, 'readwrite');
    await this._promisify(projectStore.put(projectRecord));

    // 3. Notificar al Service Worker para cachear URLs de red
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PROJECT_ASSETS',
        data: { projectId, urls }
      });
    }

    // 4. Solicitar almacenamiento persistente
    await this.requestPersistentStorage();

    onProgress(100);

    console.log(`[OfflineStorage] Proyecto "${project.name}" descargado: ${urls.length} assets, ${this._formatBytes(totalSize)}`);

    return {
      success: true,
      assetsDownloaded: completedItems - 1,
      totalSize,
      formattedSize: this._formatBytes(totalSize)
    };
  }

  // ============================================================
  // Recuperación de proyectos offline
  // ============================================================

  /**
   * Obtiene los metadatos de un proyecto almacenado offline
   * @param {string} projectId
   * @returns {Promise<Object|null>}
   */
  async getOfflineProject(projectId) {
    await this.init();
    const store = this._transaction(STORE_PROJECTS, 'readonly');
    return this._promisify(store.get(String(projectId)));
  }

  /**
   * Obtiene un proyecto offline por slug
   * @param {string} slug
   * @returns {Promise<Object|null>}
   */
  async getOfflineProjectBySlug(slug) {
    await this.init();
    const store = this._transaction(STORE_PROJECTS, 'readonly');
    const index = store.index('slug');
    return this._promisify(index.get(slug));
  }

  /**
   * Verifica si un proyecto está almacenado offline
   * @param {string} projectId
   * @returns {Promise<boolean>}
   */
  async isProjectOffline(projectId) {
    try {
      const project = await this.getOfflineProject(projectId);
      return !!project;
    } catch {
      return false;
    }
  }

  /**
   * Lista todos los proyectos descargados
   * @returns {Promise<Array>}
   */
  async listOfflineProjects() {
    await this.init();
    const store = this._transaction(STORE_PROJECTS, 'readonly');
    return this._promisify(store.getAll());
  }

  // ============================================================
  // Gestión de Blob URLs (crítico para iPhone/iPad)
  // ============================================================

  /**
   * Obtiene un asset binario como Blob URL para uso en elementos HTML/Three.js
   * IMPORTANTE: La URL devuelta DEBE revocarse cuando ya no sea necesaria.
   *
   * @param {string} projectId
   * @param {string} originalUrl - URL original del asset (Cloudinary, etc.)
   * @returns {Promise<string|null>} Blob URL o null si no existe
   */
  async getAssetBlobUrl(projectId, originalUrl) {
    await this.init();
    const assetKey = this._urlToAssetKey(String(projectId), originalUrl);

    try {
      const store = this._transaction(STORE_ASSETS, 'readonly');
      const record = await this._promisify(store.get(assetKey));

      if (!record || !record.blob) return null;

      const blobUrl = URL.createObjectURL(record.blob);
      this._activeBlobUrls.set(assetKey, blobUrl);
      return blobUrl;
    } catch (err) {
      console.warn(`[OfflineStorage] Error al recuperar asset: ${assetKey}`, err);
      return null;
    }
  }

  /**
   * Obtiene el Blob URL del archivo targets.mind de un proyecto
   * @param {string} projectId
   * @param {string} mindFileUrl - URL original del .mind
   * @returns {Promise<string|null>}
   */
  async getMindFileBlobUrl(projectId, mindFileUrl) {
    return this.getAssetBlobUrl(projectId, mindFileUrl);
  }

  /**
   * Revoca una Blob URL específica para liberar memoria
   * @param {string} blobUrl
   */
  revokeBlobUrl(blobUrl) {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
      // Remover del registro
      for (const [key, url] of this._activeBlobUrls.entries()) {
        if (url === blobUrl) {
          this._activeBlobUrls.delete(key);
          break;
        }
      }
    }
  }

  /**
   * Revoca TODAS las Blob URLs activas para liberar memoria.
   * Llamar cuando el componente se desmonta o cuando se cambia de proyecto.
   * ESPECIALMENTE IMPORTANTE en iPhone/iPad donde la memoria es limitada.
   */
  revokeAllBlobUrls() {
    let count = 0;
    for (const [key, url] of this._activeBlobUrls.entries()) {
      try {
        URL.revokeObjectURL(url);
        count++;
      } catch (e) {
        // Ignorar errores de revocación
      }
    }
    this._activeBlobUrls.clear();
    if (count > 0) {
      console.log(`[OfflineStorage] ${count} Blob URLs revocadas.`);
    }
  }

  /**
   * Resuelve una URL de asset: si el proyecto está offline, devuelve Blob URL local;
   * si no, devuelve la URL original.
   * @param {string} projectId
   * @param {string} originalUrl
   * @returns {Promise<string>}
   */
  async resolveAssetUrl(projectId, originalUrl) {
    if (!originalUrl) return '';
    // Si ya es una blob URL, devolverla directamente
    if (originalUrl.startsWith('blob:')) return originalUrl;
    // Si ya es data URL, devolverla directamente
    if (originalUrl.startsWith('data:')) return originalUrl;

    try {
      const blobUrl = await this.getAssetBlobUrl(projectId, originalUrl);
      if (blobUrl) return blobUrl;
    } catch (err) {
      // Si falla IndexedDB, usar URL original
    }

    return originalUrl;
  }

  // ============================================================
  // Eliminación y actualización de proyectos
  // ============================================================

  /**
   * Elimina un proyecto descargado y todos sus assets de IndexedDB
   * @param {string} projectId
   * @returns {Promise<boolean>}
   */
  async deleteOfflineProject(projectId) {
    await this.init();
    const pid = String(projectId);

    // 1. Revocar todas las Blob URLs de este proyecto
    for (const [key, url] of this._activeBlobUrls.entries()) {
      if (key.startsWith(`${pid}:`)) {
        URL.revokeObjectURL(url);
        this._activeBlobUrls.delete(key);
      }
    }

    // 2. Eliminar assets del proyecto de IndexedDB
    try {
      const assetsStore = this._transaction(STORE_ASSETS, 'readwrite');
      const index = assetsStore.index('projectId');
      const request = index.openCursor(IDBKeyRange.only(pid));

      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = reject;
      });
    } catch (err) {
      console.warn('[OfflineStorage] Error al eliminar assets:', err);
    }

    // 3. Eliminar metadatos del proyecto
    try {
      const projectStore = this._transaction(STORE_PROJECTS, 'readwrite');
      await this._promisify(projectStore.delete(pid));
    } catch (err) {
      console.warn('[OfflineStorage] Error al eliminar proyecto:', err);
    }

    // 4. Notificar al Service Worker para limpiar caché
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'DELETE_PROJECT_CACHE',
        data: { projectId: pid }
      });
    }

    console.log(`[OfflineStorage] Proyecto ${pid} eliminado de almacenamiento offline.`);
    return true;
  }

  /**
   * Actualiza un proyecto (re-descarga con datos frescos)
   * @param {Object} project
   * @param {Function} onProgress
   */
  async updateProject(project, onProgress = () => {}) {
    await this.deleteOfflineProject(project.id);
    return this.downloadProject(project, onProgress);
  }

  // ============================================================
  // Utilidades internas
  // ============================================================

  /**
   * Recopila todas las URLs de assets que necesitan descargarse para un proyecto
   */
  _collectProjectAssetUrls(project) {
    const urls = new Set();

    // 1. Archivo targets.mind
    if (project.mind_file_url) {
      const mindUrl = this._resolveUrl(project.mind_file_url);
      if (mindUrl) urls.add(mindUrl);
    }

    // 2. Assets de cada marcador (imágenes de las tarjetas)
    if (project.markers) {
      for (const marker of project.markers) {
        if (marker.target_image || marker.target_image_url) {
          const imgUrl = this._resolveUrl(marker.target_image || marker.target_image_url);
          if (imgUrl) urls.add(imgUrl);
        }
        if (marker.previewImage) {
          const previewUrl = this._resolveUrl(marker.previewImage);
          if (previewUrl) urls.add(previewUrl);
        }
      }
    }

    // 3. Contenido digital (GLB, imágenes, audio, video)
    if (project.assets) {
      for (const asset of project.assets) {
        const fileUrl = asset.file_url || asset.url || asset.asset_url || asset.model_url || '';
        if (fileUrl) {
          const resolved = this._resolveUrl(fileUrl);
          if (resolved) urls.add(resolved);
        }
      }
    }

    // 4. Theme assets (background, logo)
    if (project.theme) {
      if (project.theme.backgroundImage) {
        const bgUrl = this._resolveUrl(project.theme.backgroundImage);
        if (bgUrl) urls.add(bgUrl);
      }
      if (project.theme.logoUrl) {
        const logoUrl = this._resolveUrl(project.theme.logoUrl);
        if (logoUrl) urls.add(logoUrl);
      }
    }

    return Array.from(urls);
  }

  /**
   * Resuelve una URL relativa a absoluta, ignorando blob: y data: URLs
   */
  _resolveUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return null;

    // Ya es URL absoluta
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // URL relativa: resolver contra location actual
    try {
      return new URL(trimmed, window.location.href).href;
    } catch {
      return null;
    }
  }

  /**
   * Genera una clave única para un asset basada en projectId + URL
   */
  _urlToAssetKey(projectId, url) {
    // Usar hash simple de la URL para evitar problemas con caracteres especiales
    const cleanUrl = (url || '').replace(/[?#].*$/, ''); // Remover query/fragment
    return `${projectId}:${cleanUrl}`;
  }

  /**
   * Detecta el tipo de asset basado en la extensión de la URL
   */
  _detectAssetType(url) {
    const ext = (url || '').split('?')[0].split('.').pop().toLowerCase();
    const typeMap = {
      mind: 'mind',
      glb: 'model3d',
      gltf: 'model3d',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      webp: 'image',
      svg: 'image',
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      m4a: 'audio',
      mp4: 'video',
      webm: 'video',
      mov: 'video'
    };
    return typeMap[ext] || 'other';
  }

  /**
   * Determina un MIME type basado en la extensión
   */
  _guessMimeType(url) {
    const ext = (url || '').split('?')[0].split('.').pop().toLowerCase();
    const mimeMap = {
      mind: 'application/octet-stream',
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Formatea bytes a una cadena legible (KB, MB, GB)
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }
}

// Exportar instancia singleton
export const offlineStorage = new OfflineStorageService();
