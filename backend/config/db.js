const { Pool } = require('pg');
const path = require('path');
const { initDatabase } = require('../database/initDb');

// Cargar variables de entorno
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * AR Studio - Configuración de Base de Datos PostgreSQL
 * Optimizado para PostgreSQL Neon y Netlify Functions (Serverless).
 * 
 * Características:
 * - Singleton de Pool reutilizado entre invocaciones serverless.
 * - Conexión SSL segura para Neon (rejectUnauthorized: false).
 * - Verificación activa de conectividad mediante SELECT 1.
 * - Inicialización aditiva y no destructiva automática de tablas.
 */

let pool = null;
let isInitialized = false;

function createPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim()) {
    const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    pool = new Pool({
      connectionString: databaseUrl.trim(),
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  } else if (process.env.DB_HOST && process.env.DB_NAME) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  if (pool) {
    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool] Error en cliente inactivo:', err.message);
    });
  }

  return pool;
}

/**
 * Verifica activamente la conexión con PostgreSQL ejecutando SELECT 1
 * @returns {Promise<boolean>}
 */
async function checkConnection() {
  const currentPool = createPool();
  if (!currentPool) return false;

  try {
    const res = await currentPool.query('SELECT 1 AS ok');
    return Boolean(res && res.rows && res.rows[0]?.ok === 1);
  } catch (err) {
    console.warn('[PostgreSQL] Verificación de conexión falló:', err.message);
    return false;
  }
}

/**
 * Asegura que las tablas estén creadas de forma no destructiva
 */
async function ensureInitialized() {
  if (isInitialized) return true;
  const currentPool = createPool();
  if (!currentPool) return false;

  try {
    await initDatabase(currentPool);
    isInitialized = true;
    return true;
  } catch (err) {
    console.error('[PostgreSQL] No se pudieron inicializar las tablas:', err.message);
    return false;
  }
}

/**
 * Ejecuta una consulta SQL en PostgreSQL
 * @param {string} text - Consulta SQL
 * @param {Array} [params] - Parámetros de la consulta
 * @returns {Promise<Object>} Resultado de pg.query
 */
async function query(text, params) {
  const currentPool = createPool();
  if (!currentPool) {
    throw new Error('Base de datos no configurada (DATABASE_URL no encontrada)');
  }

  // Asegurar que las tablas existan antes de ejecutar queries contra el modelo
  if (!isInitialized) {
    await ensureInitialized().catch(() => {});
  }

  return currentPool.query(text, params);
}

module.exports = {
  query,
  getPool: createPool,
  checkConnection,
  ensureInitialized,
  isDbConnected: checkConnection, // Compatible con llamadas sincrónicas/asincrónicas
  hasDatabaseConfigured: () => Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_NAME))
};
