-- =============================================================================
-- AR STUDIO - PostgreSQL Database Schema
-- Fase 1: Arquitectura Base de Proyectos de Realidad Aumentada
-- =============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLA: users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLA: projects
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    mind_file_url VARCHAR(500),
    max_track_targets INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLA: markers
-- =============================================================================
CREATE TABLE IF NOT EXISTS markers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_image VARCHAR(500) NOT NULL,
    target_index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, target_index)
);

-- =============================================================================
-- TABLA: assets
-- =============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    marker_id UUID REFERENCES markers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'model3d', 'image', 'video', 'audio', 'text'
    file_url VARCHAR(500) NOT NULL,
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

-- =============================================================================
-- TABLA: interactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL, -- 'multi_marker', 'touch', 'distance', 'timer'
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- ej: {"required_markers": ["motor", "energia"]}
    action_type VARCHAR(100) NOT NULL, -- 'animate', 'show_text', 'play_audio', 'change_color'
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- ej: {"animation": "spin", "message": "Motor encendido"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ÍNDICES PARA RENDIMIENTO
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_markers_project_id ON markers(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_marker_id ON assets(marker_id);
CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON interactions(project_id);

-- =============================================================================
-- TRIGGER AUTOMÁTICO DE ACTUALIZACIÓN DE TIMESTAMPS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_markers_updated_at ON markers;
CREATE TRIGGER trg_markers_updated_at BEFORE UPDATE ON markers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_assets_updated_at ON assets;
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_interactions_updated_at ON interactions;
CREATE TRIGGER trg_interactions_updated_at BEFORE UPDATE ON interactions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =============================================================================
-- DATOS SEMILLA (SEED) INICIALES - PROYECTO DEMO: MOTOR Y ENERGÍA
-- =============================================================================
DO $$
DECLARE
    demo_user_id UUID;
    demo_project_id UUID;
    marker_motor_id UUID;
    marker_energy_id UUID;
BEGIN
    -- Usuario demo
    INSERT INTO users (id, name, email, password_hash)
    VALUES (
        '11111111-1111-1111-1111-111111111111',
        'Profesor AR Studio',
        'demo@arstudio.edu',
        '$2b$10$wN30iI7h0dY7r5c6sL0u5.8vM1qgE2yP3o7nQ1v5r2c3s4a5b6c7d' -- Hash bcrypt demo
    ) ON CONFLICT (email) DO NOTHING;

    demo_user_id := '11111111-1111-1111-1111-111111111111';

    -- Proyecto demo
    INSERT INTO projects (id, user_id, name, description, slug, status, mind_file_url, max_track_targets)
    VALUES (
        '22222222-2222-2222-2222-222222222222',
        demo_user_id,
        'Experimento: Motor Eléctrico y Energía',
        'Proyecto educativo de electromagnetismo con tarjetas interactivas.',
        'motor-energia-demo',
        'published',
        '/markers/targets.mind',
        2
    ) ON CONFLICT (slug) DO NOTHING;

    demo_project_id := '22222222-2222-2222-2222-222222222222';

    -- Marcador 1: Motor
    INSERT INTO markers (id, project_id, name, target_image, target_index, description)
    VALUES (
        '33333333-3333-3333-3333-333333333331',
        demo_project_id,
        'Motor',
        '/markers/card-motor.png',
        0,
        'Tarjeta de inducción y rotor del motor eléctrico'
    ) ON CONFLICT DO NOTHING;
    marker_motor_id := '33333333-3333-3333-3333-333333333331';

    -- Marcador 2: Energía
    INSERT INTO markers (id, project_id, name, target_image, target_index, description)
    VALUES (
        '33333333-3333-3333-3333-333333333332',
        demo_project_id,
        'Energía',
        '/markers/card-energy.png',
        1,
        'Tarjeta de suministro eléctrico y acumulador'
    ) ON CONFLICT DO NOTHING;
    marker_energy_id := '33333333-3333-3333-3333-333333333332';

    -- Asset 1: Modelo 3D de Motor
    INSERT INTO assets (project_id, marker_id, type, file_url, position_x, position_y, position_z, scale_x, scale_y, scale_z, configuration)
    VALUES (
        demo_project_id,
        marker_motor_id,
        'model3d',
        '/models/motor.glb',
        0, 0, 0,
        0.75, 0.75, 0.75,
        '{"title": "Motor Eléctrico", "subtitle": "Transforma energía eléctrica en mecánica", "interactive": true}'::jsonb
    ) ON CONFLICT DO NOTHING;

    -- Asset 2: Modelo 3D de Energía
    INSERT INTO assets (project_id, marker_id, type, file_url, position_x, position_y, position_z, scale_x, scale_y, scale_z, configuration)
    VALUES (
        demo_project_id,
        marker_energy_id,
        'model3d',
        '/models/energy.glb',
        0, 0, 0,
        0.75, 0.75, 0.75,
        '{"title": "Generador de Energía", "subtitle": "Fuente de voltaje y corriente continua", "interactive": true}'::jsonb
    ) ON CONFLICT DO NOTHING;

    -- Interacción: Motor + Energía
    INSERT INTO interactions (project_id, name, trigger_type, trigger_config, action_type, action_config)
    VALUES (
        demo_project_id,
        'Activación de Motor por Circuito de Energía',
        'multi_marker',
        '{"required_markers": ["Motor", "Energía"]}'::jsonb,
        'start_motor_simulation',
        '{"animation": "spin_fast", "audio_effect": "motor_hum.mp3", "message": "⚡ ¡Circuito completado! Motor encendido"}'::jsonb
    ) ON CONFLICT DO NOTHING;
END $$;
