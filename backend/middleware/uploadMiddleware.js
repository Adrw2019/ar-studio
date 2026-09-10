const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento seguro
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitizar nombre de archivo eliminando caracteres extraños
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  }
});

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
