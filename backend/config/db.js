const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ar_studio',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

let isDbConnected = false;

// Comprobar conectividad opcional sin bloquear el arranque de la API
pool.connect((err, client, release) => {
  if (err) {
    console.warn('⚠️ [PostgreSQL] No se pudo conectar a la base de datos. El backend operará en modo memoria/fallback:', err.message);
    isDbConnected = false;
  } else {
    console.log('✅ [PostgreSQL] Conexión establecida exitosamente con PostgreSQL');
    isDbConnected = true;
    release();
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  isDbConnected: () => isDbConnected
};
