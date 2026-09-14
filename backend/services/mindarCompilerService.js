const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/**
 * AR Studio - MindAR Target Compiler Service
 * Ejecuta la compilación de imágenes de tarjetas físicas a formato binario .mind.
 * Utiliza OfflineCompiler de MindAR junto con node-canvas y TensorFlow.js.
 */

class MindARCompilerService {
  constructor() {
    this.canvasModule = null;
    this.offlineCompilerClass = null;
    this.initPromise = null;
  }

  /**
   * Inicialización diferida de módulos ESM nativos
   */
  async ensureInitialized() {
    if (this.canvasModule && this.offlineCompilerClass) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Resolver rutas hacia frontend/node_modules
        const rootDir = path.resolve(__dirname, '../..');
        const canvasPath = path.resolve(rootDir, 'frontend/node_modules/canvas/index.js');
        const compilerPath = path.resolve(rootDir, 'frontend/node_modules/mind-ar/src/image-target/offline-compiler.js');

        if (!fs.existsSync(canvasPath)) {
          throw new Error(`Módulo canvas no encontrado en ${canvasPath}`);
        }
        if (!fs.existsSync(compilerPath)) {
          throw new Error(`Módulo offline-compiler no encontrado en ${compilerPath}`);
        }

        const canvasMod = await import(pathToFileURL(canvasPath).href);
        const compilerMod = await import(pathToFileURL(compilerPath).href);

        this.canvasModule = canvasMod;
        this.offlineCompilerClass = compilerMod.OfflineCompiler;

        console.log('[MindARCompilerService] ✅ Módulos de compilación inicializados correctamente.');
      } catch (err) {
        console.error('[MindARCompilerService] ❌ Error al inicializar compilador MindAR:', err);
        throw new Error(`Compilador MindAR no disponible en este entorno: ${err.message}`);
      }
    })();

    return this.initPromise;
  }

  /**
   * Resuelve una ruta o URL de imagen a un Buffer legible por Canvas
   */
  async resolveImageToBuffer(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('La URL o ruta de la imagen no es válida');
    }

    const trimmed = imageUrl.trim();

    // 1. Data URL Base64
    if (trimmed.startsWith('data:image/')) {
      const parts = trimmed.split(',');
      if (parts.length < 2) throw new Error('Formato Data URI inválido');
      return Buffer.from(parts[1], 'base64');
    }

    const rootDir = path.resolve(__dirname, '../..');

    // 2. Ruta local /uploads/...
    if (trimmed.startsWith('/uploads/')) {
      const localUploadPath = path.resolve(rootDir, 'backend', trimmed.replace(/^\//, ''));
      if (fs.existsSync(localUploadPath)) {
        return fs.readFileSync(localUploadPath);
      }
    }

    // 3. Ruta pública /markers/...
    if (trimmed.startsWith('/markers/') || trimmed.startsWith('markers/')) {
      const publicMarkerPath = path.resolve(rootDir, 'frontend/public', trimmed.replace(/^\//, ''));
      if (fs.existsSync(publicMarkerPath)) {
        return fs.readFileSync(publicMarkerPath);
      }
    }

    // 4. Ruta absoluta directa en disco
    if (path.isAbsolute(trimmed) && fs.existsSync(trimmed)) {
      return fs.readFileSync(trimmed);
    }

    // 5. URL HTTP / HTTPS remota
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status} al descargar imagen desde ${trimmed}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // 6. Intento de resolución en carpetas estándar
    const candidatePaths = [
      path.resolve(rootDir, 'frontend/public', trimmed),
      path.resolve(rootDir, 'backend/uploads', trimmed),
      path.resolve(rootDir, trimmed)
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate);
      }
    }

    throw new Error(`No se pudo encontrar el archivo de imagen en: ${trimmed}`);
  }

  /**
   * Compila un conjunto de marcadores a formato targets.mind
   * @param {string} projectId - ID del proyecto
   * @param {Array<Object>} markers - Arreglo de marcadores con target_index y target_image
   * @param {Function} [progressCallback] - Callback para reportar progreso (0-100)
   * @returns {Promise<{ buffer: Buffer, targetsCount: number, qualityReport: Array<Object> }>}
   */
  async compileMarkers(projectId, markers, progressCallback) {
    await this.ensureInitialized();

    if (!Array.isArray(markers) || markers.length === 0) {
      throw new Error('El proyecto no tiene tarjetas para compilar. Agrega al menos una tarjeta física.');
    }

    // 1. Ordenar estrictamente por target_index ASC
    const sortedMarkers = [...markers].sort((a, b) => {
      const indexA = a.target_index !== undefined ? a.target_index : 0;
      const indexB = b.target_index !== undefined ? b.target_index : 0;
      return indexA - indexB;
    });

    const { createCanvas, loadImage } = this.canvasModule;
    const canvasList = [];
    const validMarkers = [];

    console.log(`[MindARCompilerService] Iniciando preparación de ${sortedMarkers.length} tarjetas para proyecto ${projectId}...`);

    // 2. Procesar y cargar cada imagen en un Canvas
    for (let i = 0; i < sortedMarkers.length; i++) {
      const marker = sortedMarkers[i];
      const imageUrl = marker.target_image;

      if (!imageUrl || !imageUrl.trim()) {
        throw new Error(`La tarjeta "${marker.name || `Tarjeta #${i + 1}`}" (índice ${marker.target_index ?? i}) no tiene una imagen asignada.`);
      }

      const imgBuffer = await this.resolveImageToBuffer(imageUrl);
      const img = await loadImage(imgBuffer);

      if (!img.width || !img.height || img.width < 50 || img.height < 50) {
        throw new Error(`La imagen de la tarjeta "${marker.name}" tiene una resolución insuficiente (${img.width}x${img.height} px). Mínimo requerido: 100x100 px.`);
      }

      // Renderizar en Canvas 2D
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      canvasList.push(canvas);
      validMarkers.push(marker);
    }

    // 3. Instanciar OfflineCompiler de MindAR
    const compiler = new this.offlineCompilerClass();
    const startTime = Date.now();

    console.log(`[MindARCompilerService] Compilando ${canvasList.length} imágenes con MindAR...`);

    // 4. Ejecutar compilación de características de tracking y matching
    await compiler.compileImageTargets(canvasList, (progress) => {
      const rounded = Math.round(progress);
      if (progressCallback) {
        progressCallback(rounded);
      }
      if (rounded % 25 === 0 || rounded === 100) {
        console.log(`[MindARCompilerService] Proyecto ${projectId}: ${rounded}%`);
      }
    });

    // 5. Analizar calidad de los targets detectados
    const qualityReport = [];
    if (Array.isArray(compiler.data)) {
      compiler.data.forEach((targetData, idx) => {
        const marker = validMarkers[idx];
        let totalFeatures = 0;
        let keyframesCount = 0;

        if (Array.isArray(targetData.matchingData)) {
          keyframesCount = targetData.matchingData.length;
          targetData.matchingData.forEach((frame) => {
            const maxima = frame.maximaPoints?.length || 0;
            const minima = frame.minimaPoints?.length || 0;
            totalFeatures += (maxima + minima);
          });
        }

        const avgFeatures = keyframesCount > 0 ? Math.round(totalFeatures / keyframesCount) : totalFeatures;

        // Clasificación de calidad según densidad de puntos característicos
        let qualityLabel = 'Media';
        let qualityScore = 70;

        if (avgFeatures >= 80) {
          qualityLabel = 'Buena';
          qualityScore = Math.min(98, 75 + Math.round(avgFeatures / 5));
        } else if (avgFeatures < 35) {
          qualityLabel = 'Baja';
          qualityScore = Math.max(25, Math.round(avgFeatures));
        }

        qualityReport.push({
          marker_id: marker.id,
          target_index: marker.target_index ?? idx,
          name: marker.name,
          features_count: totalFeatures,
          avg_features: avgFeatures,
          score: qualityScore,
          quality: qualityLabel
        });
      });
    }

    // 6. Exportar Buffer Msgpack .mind
    const rawExport = compiler.exportData();
    const finalBuffer = Buffer.from(rawExport);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[MindARCompilerService] ✅ Compilación exitosa en ${duration}s. Archivo .mind generado (${finalBuffer.length} bytes).`);

    return {
      buffer: finalBuffer,
      targetsCount: validMarkers.length,
      qualityReport
    };
  }
}

module.exports = new MindARCompilerService();
