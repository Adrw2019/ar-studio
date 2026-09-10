// Middleware global para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
  console.error('❌ [API Error]:', err.stack || err.message);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo excede el tamaño máximo permitido'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Error al procesar archivo: ${err.message}`
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
