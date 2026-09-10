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
const PORT = process.env.PORT || 5000;

// Configuración de Seguridad y Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configurable
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes locales de desarrollo y llamadas de red interna
    if (!origin || origin === clientOrigin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      callback(null, true); // Abierto para demo local en red
    }
  },
  credentials: true
}));

// Limitador de tasa de peticiones (Rate Limiter)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Límite de 300 peticiones por ventana
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

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 AR Studio API escuchando en el puerto ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

module.exports = { app, server };
