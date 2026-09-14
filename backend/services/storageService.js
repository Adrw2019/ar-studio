const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

// Asegurar carga de variables de entorno (.env en backend y en root)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * AR Studio - Servicio de Almacenamiento Persistente
 * Soporta almacenamiento local en disco y Cloudinary (Free tier) como almacenamiento persistente en la nube.
 * 
 * Reglas clave:
 * - NO guarda en disco local cuando STORAGE_PROVIDER=cloudinary.
 * - Soporta imágenes (image), modelos 3D y .mind (raw), y audio/video (video).
 * - Estructura jerárquica: ar-studio/projects/:projectId/:category/
 * - Valida límites de tamaño antes de iniciar la subida.
 */

const UPLOADS_BASE_DIR = path.resolve(__dirname, '../uploads');

// Límites de tamaño por categoría/tipo (Requisito 13)
const FILE_LIMITS = {
  card: 5 * 1024 * 1024,      // Tarjetas (JPG, PNG, WEBP): 5 MB
  image: 5 * 1024 * 1024,     // Imágenes: 5 MB
  model: 25 * 1024 * 1024,    // Modelos 3D (GLB, GLTF): 25 MB
  audio: 10 * 1024 * 1024,    // Audio (MP3, WAV, OGG): 10 MB
  video: 40 * 1024 * 1024,    // Video (MP4, WEBM): 40 MB
  mind: 10 * 1024 * 1024,     // Compilado .mind: 10 MB
  default: 25 * 1024 * 1024   // Por defecto: 25 MB
};

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

class StorageService {
  constructor() {
    this.provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    // Solo preparar directorios locales si estamos en modo local
    if (this.provider === 'local') {
      ensureDirectoryExists(UPLOADS_BASE_DIR);
      ensureDirectoryExists(path.join(UPLOADS_BASE_DIR, 'targets'));
      ensureDirectoryExists(path.join(UPLOADS_BASE_DIR, 'markers'));
      ensureDirectoryExists(path.join(UPLOADS_BASE_DIR, 'models'));
    }

    this.initCloudinary();
  }

  /**
   * Configura el cliente de Cloudinary si las variables están presentes.
   */
  initCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret &&
        !cloudName.startsWith('SU_') &&
        !apiKey.startsWith('SU_') &&
        !apiSecret.startsWith('SU_')) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      console.log(`[StorageService] Cloudinary configurado exitosamente (Cloud: ${cloudName}).`);
    }
  }

  /**
   * Valida que las credenciales de Cloudinary estén presentes y configuradas.
   * Lanza un error explícito si faltan (Requisito 15: NO fallback silencioso).
   */
  ensureCloudinaryConfigured() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret ||
        cloudName.trim() === '' ||
        cloudName === 'SU_NOMBRE_DE_NUBE' ||
        apiKey === 'SU_CLAVE_API' ||
        apiSecret === 'SU_SECRETO_API') {
      throw new Error('Cloudinary storage is not configured.');
    }

    // Asegurar configuración activa
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
  }

  /**
   * Determina el resource_type adecuado para Cloudinary según la extensión (Requisito 4)
   * - image: JPG, PNG, WEBP, SVG, GIF
   * - video: MP4, WEBM, MOV, MP3, WAV, OGG (Cloudinary procesa audio como 'video')
   * - raw: GLB, GLTF, .mind, BIN
   */
  getResourceType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) {
      return 'image';
    }
    if (['.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.aac'].includes(ext)) {
      return 'video';
    }
    return 'raw';
  }

  /**
   * Obtiene el límite de tamaño permitido según el tipo de archivo (Requisito 13)
   */
  getFileLimit(filename, category = '') {
    const ext = path.extname(filename).toLowerCase();
    const cat = category.toLowerCase();

    if (ext === '.mind' || cat === 'tracking') {
      return { limit: FILE_LIMITS.mind, name: 'targets.mind (10 MB)' };
    }
    if (['.glb', '.gltf'].includes(ext) || cat === 'models') {
      return { limit: FILE_LIMITS.model, name: 'Modelo 3D (25 MB)' };
    }
    if (['.mp3', '.wav', '.ogg', '.aac'].includes(ext) || cat === 'audio') {
      return { limit: FILE_LIMITS.audio, name: 'Audio (10 MB)' };
    }
    if (['.mp4', '.webm', '.mov'].includes(ext) || cat === 'video') {
      return { limit: FILE_LIMITS.video, name: 'Video (40 MB)' };
    }
    if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext) || cat === 'cards' || cat === 'images') {
      return { limit: FILE_LIMITS.card, name: 'Tarjeta / Imagen (5 MB)' };
    }
    return { limit: FILE_LIMITS.default, name: 'Archivo (25 MB)' };
  }

  /**
   * Valida el tamaño del buffer antes de subir
   */
  validateFileSize(buffer, filename, category) {
    const bytes = buffer.byteLength || buffer.length || 0;
    const { limit, name } = this.getFileLimit(filename, category);

    if (bytes > limit) {
      const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
      throw new Error(`El archivo '${filename}' (${sizeMB} MB) excede el tamaño máximo permitido para ${name}.`);
    }
  }

  /**
   * Construye la ruta de carpeta jerárquica por proyecto (Requisito 5)
   * Formato: ar-studio/projects/:projectId/:category
   */
  buildFolderPath({ projectId, category = 'tracking', folder }) {
    if (projectId) {
      const cleanCategory = category || folder || 'tracking';
      return `ar-studio/projects/${projectId}/${cleanCategory}`;
    }
    if (folder) {
      return folder.startsWith('ar-studio') ? folder : `ar-studio/${folder}`;
    }
    return 'ar-studio/general';
  }

  /**
   * Guarda un archivo en el proveedor de almacenamiento configurado
   * @param {Object} options
   * @param {string} options.filename - Nombre del archivo (ej. 'targets.mind', 'card-0.jpg', 'motor.glb')
   * @param {Buffer|Uint8Array} options.buffer - Contenido binario
   * @param {string} [options.mimeType] - Tipo MIME
   * @param {string} [options.folder='targets'] - Subcarpeta o categoría
   * @param {string} [options.projectId] - ID del proyecto para organización estricta
   * @param {string} [options.category] - cards | models | images | audio | video | tracking
   * @returns {Promise<Object>} Resultado estandarizado
   */
  async saveFile({ filename, buffer, mimeType = 'application/octet-stream', folder = 'targets', projectId, category }) {
    if (!buffer || (buffer.length === 0 && buffer.byteLength === 0)) {
      throw new Error('El buffer del archivo está vacío.');
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const assignedCategory = category || folder || 'tracking';

    // 1. Validar tamaño antes de procesar (Requisito 13)
    this.validateFileSize(buffer, safeFilename, assignedCategory);

    // 2. Determinar tipo de recurso y carpeta
    const resourceType = this.getResourceType(safeFilename);
    const targetFolder = this.buildFolderPath({ projectId, category: assignedCategory, folder });
    const currentProvider = (process.env.STORAGE_PROVIDER || this.provider || 'local').toLowerCase();

    // ==========================================
    // MODO CLOUDINARY (Requisitos 3, 4, 5, 6, 7)
    // ==========================================
    if (currentProvider === 'cloudinary') {
      this.ensureCloudinaryConfigured();

      // Para archivos raw (.mind, .glb, .gltf), incluir la extensión en public_id
      // Para imágenes/video, usar el nombre base (Cloudinary añade el formato según corresponda)
      const ext = path.extname(safeFilename);
      const publicId = resourceType === 'raw' ? safeFilename : path.basename(safeFilename, ext);

      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: targetFolder,
          public_id: publicId,
          resource_type: resourceType,
          overwrite: true,
          invalidate: true
        };

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) {
            console.error(`[StorageService] Error en Cloudinary upload_stream (${safeFilename}):`, error.message);
            return reject(error);
          }

          console.log(`[StorageService] ✅ Subida exitosa a Cloudinary: ${result.public_id} (${result.bytes} bytes, type: ${result.resource_type})`);
          console.log(`[StorageService] 🔗 URL Segura: ${result.secure_url}`);

          resolve({
            provider: 'cloudinary',
            public_id: result.public_id,
            resource_type: result.resource_type,
            url: result.url,
            secure_url: result.secure_url,
            bytes: result.bytes,
            format: result.format || ext.replace('.', ''),
            filename: safeFilename
          });
        });

        // Transmitir buffer mediante Readable stream (NO escribe en disco local)
        Readable.from(Buffer.from(buffer)).pipe(stream);
      });
    }

    // ==========================================
    // MODO LOCAL (Requisito 3)
    // ==========================================
    const localSubFolder = assignedCategory || folder || 'targets';
    const folderDir = path.join(UPLOADS_BASE_DIR, localSubFolder);
    ensureDirectoryExists(folderDir);

    const filePath = path.join(folderDir, safeFilename);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    const publicUrl = `/uploads/${localSubFolder}/${safeFilename}`;
    const bytes = buffer.byteLength || buffer.length;

    console.log(`[StorageService] Archivo guardado localmente: ${filePath} (${bytes} bytes) -> URL: ${publicUrl}`);

    return {
      provider: 'local',
      public_id: safeFilename,
      resource_type: resourceType,
      url: publicUrl,
      secure_url: publicUrl,
      bytes: bytes,
      format: path.extname(safeFilename).replace('.', ''),
      filename: safeFilename,
      localPath: filePath
    };
  }

  /**
   * Elimina un archivo del almacenamiento (Requisito 11)
   * @param {string|Object} publicIdOrUrl - public_id o URL pública
   * @param {string|Object} [optionsOrType='raw'] - resource_type ('image' | 'video' | 'raw')
   */
  async deleteFile(publicIdOrUrl, optionsOrType = {}) {
    if (!publicIdOrUrl) return;

    const currentProvider = (process.env.STORAGE_PROVIDER || this.provider || 'local').toLowerCase();

    // Normalizar argumentos
    let publicId = typeof publicIdOrUrl === 'string' ? publicIdOrUrl : publicIdOrUrl.public_id;
    let resourceType = typeof optionsOrType === 'string' ? optionsOrType : (optionsOrType.resource_type || 'raw');

    if (currentProvider === 'cloudinary') {
      this.ensureCloudinaryConfigured();

      // Si se pasa una URL completa de Cloudinary, extraer public_id y resource_type
      if (publicId && publicId.startsWith('http')) {
        const parsed = this.parseCloudinaryUrl(publicId);
        if (parsed) {
          publicId = parsed.public_id;
          resourceType = parsed.resource_type || resourceType;
        }
      }

      return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true }, (error, result) => {
          if (error) {
            console.error(`[StorageService] Error al eliminar en Cloudinary (${publicId}):`, error.message);
            return reject(error);
          }
          console.log(`[StorageService] 🗑️ Archivo eliminado de Cloudinary: ${publicId} (type: ${resourceType}, result: ${result.result})`);
          resolve(result);
        });
      });
    }

    // Modo local
    if (publicId && publicId.startsWith('/uploads/')) {
      try {
        const cleanPath = publicId.replace(/^\/uploads\//, '');
        const fullPath = path.join(UPLOADS_BASE_DIR, cleanPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`[StorageService] Archivo local eliminado: ${fullPath}`);
        }
      } catch (err) {
        console.warn(`[StorageService] No se pudo eliminar local ${publicId}:`, err.message);
      }
    }
  }

  /**
   * Extrae public_id y resource_type a partir de una URL de Cloudinary
   */
  parseCloudinaryUrl(url) {
    try {
      const match = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
      if (match) {
        let publicId = decodeURIComponent(match[2]);
        const resType = match[1];

        // Cloudinary gestiona public_id sin extensión para 'image' y 'video', pero CON extensión para 'raw' (.glb, .mind)
        if (resType === 'image' || resType === 'video') {
          publicId = publicId.replace(/\.[^/.]+$/, '');
        }

        return {
          resource_type: resType,
          public_id: publicId
        };
      }
    } catch (e) {
      // Ignorar error de parsing
    }
    return null;
  }

  /**
   * Comprueba si un archivo existe en almacenamiento local
   */
  fileExists(fileUrl) {
    if (!fileUrl) return false;
    if (fileUrl.startsWith('http')) return true; // Asumir que URLs remotas existen
    const cleanPath = fileUrl.replace(/^\/uploads\//, '');
    const fullPath = path.join(UPLOADS_BASE_DIR, cleanPath);
    return fs.existsSync(fullPath);
  }
}

module.exports = new StorageService();
