const db = require('../config/db');

/**
 * Health Check Controller
 * Valida el estado de la API y la conectividad real con PostgreSQL Neon.
 * No expone credenciales ni cadenas de conexión.
 */
exports.getHealth = async (req, res) => {
  let databaseStatus = 'disconnected';

  if (process.env.DATABASE_URL) {
    try {
      const isConnected = await db.checkConnection();
      databaseStatus = isConnected ? 'connected' : 'error';
    } catch (err) {
      databaseStatus = 'error';
    }
  } else if (db.hasDatabaseConfigured()) {
    try {
      const isConnected = await db.checkConnection();
      databaseStatus = isConnected ? 'connected' : 'error';
    } catch (err) {
      databaseStatus = 'error';
    }
  } else {
    databaseStatus = 'not_configured';
  }

  res.status(200).json({
    status: 'ok',
    service: 'AR Studio API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: databaseStatus
  });
};
