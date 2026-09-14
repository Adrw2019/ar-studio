/**
 * AR Studio - Inicialización Segura y Migración Aditiva de Base de Datos PostgreSQL
 * 
 * Reglas estrictas:
 * - NO ejecuta DROP TABLE, TRUNCATE ni DELETE masivo.
 * - Solo utiliza CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS y ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
 * - Idempotente: Se puede ejecutar múltiples veces sin afectar los datos existentes.
 */

const initSql = `
-- 1. Extensión para UUID si está disponible (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'STEM',
    status VARCHAR(50) DEFAULT 'draft',
    tracking_status VARCHAR(50) DEFAULT 'pending',
    tracking_error TEXT,
    mind_file_url TEXT,
    max_track_targets INTEGER DEFAULT 1,
    theme JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas aditivas en projects si la tabla ya existía
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'STEM';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tracking_error TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mind_file_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_track_targets INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. TABLA: markers (Tarjetas físicas de seguimiento AR)
CREATE TABLE IF NOT EXISTS markers (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_image TEXT DEFAULT '',
    target_index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    quality VARCHAR(50),
    quality_score NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas aditivas en markers
ALTER TABLE markers ADD COLUMN IF NOT EXISTS target_image TEXT DEFAULT '';
ALTER TABLE markers ADD COLUMN IF NOT EXISTS target_index INTEGER DEFAULT 0;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS quality VARCHAR(50);
ALTER TABLE markers ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5, 2);
ALTER TABLE markers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. TABLA: assets (Modelos 3D, imágenes, video, audio)
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    marker_id VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'model3d',
    file_url TEXT NOT NULL,
    position_x NUMERIC(8, 4) DEFAULT 0.0000,
    position_y NUMERIC(8, 4) DEFAULT 0.0000,
    position_z NUMERIC(8, 4) DEFAULT 0.0000,
    rotation_x NUMERIC(8, 4) DEFAULT 0.0000,
    rotation_y NUMERIC(8, 4) DEFAULT 0.0000,
    rotation_z NUMERIC(8, 4) DEFAULT 0.0000,
    scale_x NUMERIC(8, 4) DEFAULT 1.0000,
    scale_y NUMERIC(8, 4) DEFAULT 1.0000,
    scale_z NUMERIC(8, 4) DEFAULT 1.0000,
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas aditivas en assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS marker_id VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS position_x NUMERIC(8, 4) DEFAULT 0.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS position_y NUMERIC(8, 4) DEFAULT 0.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS position_z NUMERIC(8, 4) DEFAULT 0.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS rotation_x NUMERIC(8, 4) DEFAULT 0.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS rotation_y NUMERIC(8, 4) DEFAULT 0.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS rotation_z NUMERIC(8, 4) DEFAULT 0.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS scale_x NUMERIC(8, 4) DEFAULT 1.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS scale_y NUMERIC(8, 4) DEFAULT 1.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS scale_z NUMERIC(8, 4) DEFAULT 1.0000;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 5. TABLA: interactions (Reglas e interactividad AR)
CREATE TABLE IF NOT EXISTS interactions (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas aditivas en interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS action_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 6. ÍNDICES DE RENDIMIENTO (Creación idempotente)
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_markers_project_id ON markers(project_id);
CREATE INDEX IF NOT EXISTS idx_markers_target_index ON markers(project_id, target_index);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_marker_id ON assets(marker_id);
CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON interactions(project_id);
`;

let isInitialized = false;
let initPromise = null;

/**
 * Ejecuta la inicialización segura de la base de datos
 * @param {Object} pool - Instancia de pg.Pool
 */
async function initDatabase(pool) {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[PostgreSQL] Verificando e inicializando estructura de tablas en Neon...');
      await pool.query(initSql);
      console.log('✅ [PostgreSQL] Tablas e índices verificados exitosamente (projects, markers, assets, interactions).');
      isInitialized = true;
      return true;
    } catch (err) {
      console.error('⚠️ [PostgreSQL] Error durante inicialización de tablas:', err.message);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

module.exports = {
  initDatabase,
  initSql
};
