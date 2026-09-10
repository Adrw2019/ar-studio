const db = require('../config/db');

exports.getHealth = async (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AR Studio API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: db.isDbConnected() ? 'connected' : 'offline/mock-ready'
  });
};
