const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Almacenamiento en memoria para compatibilidad total con Serverless / Netlify Functions
// y transmisión directa por streams a Cloudinary o disco local sin errores de sistema de solo lectura
const storage = multer.memoryStorage();

// Validación de tipos de archivos permitidos
const allowedExtensions = [
  // Modelos 3D
  '.glb', '.gltf',
  // Marcadores AR
  '.mind',
  // Imágenes
  '.jpg', '.jpeg', '.png', '.webp',
  // Videos
  '.mp4', '.webm',
  // Audio
  '.mp3', '.wav'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido (${ext}). Tipos soportados: ${allowedExtensions.join(', ')}`), false);
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024
  }
});

module.exports = upload;
