const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const healthRoutes = require('./routes/healthRoutes');
const projectRoutes = require('./routes/projectRoutes');
const markerRoutes = require('./routes/markerRoutes');
const assetRoutes = require('./routes/assetRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Normalizar prefijo de Netlify Functions si la solicitud viene con /.netlify/functions/api
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '');
    if (!req.url) req.url = '/';
  }
  next();
});

// Configuración de Seguridad con Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Configuración de CORS segura
const allowedOrigins = [
  'https://adrw2019.github.io',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origin (como apps móviles, curl o server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    // En desarrollo, permitir orígenes locales y de red privada
    if (isDevelopment) {
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.')
      ) {
        return callback(null, true);
      }
    }
    // Permitir orígenes explícitos configurados
    if (allowedOrigins.some(allowed => origin === allowed || (allowed.endsWith('/') && origin === allowed.slice(0, -1)))) {
      return callback(null, true);
    }
    // Permitir subdominios de netlify.app para previsualizaciones
    if (origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }
    // En producción, denegar orígenes no autorizados
    return callback(new Error(`CORS no permitido para el origen: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Limitador de tasa de peticiones (Rate Limiter)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente en 15 minutos.'
  }
});
app.use('/api/', limiter);

// Parsing de cuerpos JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Servir estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Registro de Rutas API
app.use('/api/health', healthRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/markers', markerRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/interactions', interactionRoutes);

// Ruta raíz informativa
app.get('/', (req, res) => {
  res.json({
    name: 'AR Studio Backend API',
    version: '1.0.0',
    description: 'API para la gestión de experiencias de Realidad Aumentada móvil',
    statusEndpoint: '/api/health'
  });
});

// Manejador para rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.originalUrl} no encontrada en este servidor`
  });
});

// Manejador global de errores
app.use(errorHandler);

module.exports = app;
