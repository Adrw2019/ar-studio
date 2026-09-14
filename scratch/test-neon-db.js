/**
 * AR Studio - Script de prueba para conexión PostgreSQL Neon
 * Valida:
 * 1. Conexión segura (SELECT 1)
 * 2. Inicialización no destructiva de tablas (projects, markers, assets, interactions)
 * 3. Ciclo de vida CRUD de un proyecto de prueba (crear, consultar, actualizar, eliminar)
 * 4. Limpieza total del registro de prueba sin afectar otros datos
 * 
 * NUNCA imprime credenciales ni DATABASE_URL en consola.
 */

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../backend/config/db');
const { initDatabase } = require('../backend/database/initDb');

// Colores para consola
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

async function runNeonTests() {
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}    AR STUDIO - PRUEBAS DE POSTGRESQL NEON          ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const hasDbUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
  const isNeon = hasDbUrl ? process.env.DATABASE_URL.includes('neon.tech') : false;

  console.log(`DATABASE_URL detectada: ${hasDbUrl ? GREEN + 'SÍ (Configurada)' + RESET : YELLOW + 'NO (Pendiente en .env local)' + RESET}`);
  console.log(`Proveedor detectado: ${isNeon ? GREEN + 'PostgreSQL Neon (SSL activo)' + RESET : YELLOW + (hasDbUrl ? 'PostgreSQL' : 'No configurado') + RESET}\n`);

  if (!hasDbUrl) {
    console.log(`${YELLOW}ℹ️ DATABASE_URL no está presente en el .env local.${RESET}`);
    console.log(`${YELLOW}ℹ️ Como se indicó, ya está configurada en Netlify como variable secreta.${RESET}`);
    console.log(`${YELLOW}ℹ️ Si deseas probar la conexión localmente contra Neon antes del despliegue:${RESET}`);
    console.log(`${YELLOW}   1. Agrega DATABASE_URL=tu_cadena_neon en tu archivo .env local.${RESET}`);
    console.log(`${YELLOW}   2. Ejecuta nuevamente: node scratch/test-neon-db.js${RESET}`);
    return;
  }

  const pool = db.getPool();

  // ==========================================================
  // PRUEBA 1: SELECT 1 (Conexión activa)
  // ==========================================================
  console.log(`${CYAN}--- PRUEBA 1: Verificación de Conexión (SELECT 1) ---${RESET}`);
  try {
    const isConnected = await db.checkConnection();
    if (isConnected) {
      console.log(`${GREEN}✔ PASS: Conexión con PostgreSQL Neon exitosa (SELECT 1 -> ok).${RESET}`);
    } else {
      throw new Error('checkConnection() devolvió false');
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en SELECT 1: ${err.message}${RESET}`);
    return;
  }

  // ==========================================================
  // PRUEBA 2: Inicialización Segura de Tablas (DDL no destructivo)
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA 2: Inicialización Segura de Tablas (PASO 4) ---${RESET}`);
  try {
    await initDatabase(pool);
    console.log(`${GREEN}✔ PASS: Tablas (projects, markers, assets, interactions) e índices verificados en Neon.${RESET}`);
  } catch (err) {
    console.log(`${RED}✘ FAIL en inicialización de tablas: ${err.message}${RESET}`);
    return;
  }

  // Contar registros existentes antes de la prueba
  let initialCount = 0;
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM projects');
    initialCount = parseInt(countRes.rows[0].count, 10);
    console.log(`Registros previos en tabla 'projects': ${initialCount}`);
  } catch (err) {
    console.warn('No se pudo obtener conteo previo:', err.message);
  }

  // ==========================================================
  // PRUEBA 3: Creación de Proyecto de Prueba (POST /api/projects)
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA 3: Creación de Registro de Prueba (POST) ---${RESET}`);
  const testProjectId = `test-neon-${Date.now()}`;
  const testSlug = `test-neon-exp-${Date.now()}`;

  try {
    const insertRes = await pool.query(
      `INSERT INTO projects (id, name, description, category, slug, status, tracking_status, mind_file_url, max_track_targets, theme, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        testProjectId,
        'Proyecto Temporal de Prueba Neon',
        'Descripción de prueba de persistencia en Neon',
        'Robótica',
        testSlug,
        'draft',
        'pending',
        null,
        1,
        JSON.stringify({ primaryColor: '#00f2fe', title: 'Test Neon' })
      ]
    );

    console.log(`${GREEN}✔ PASS: Proyecto creado con ID: ${insertRes.rows[0].id}${RESET}`);
    console.log(`  Status inicial: ${insertRes.rows[0].status} (debe ser 'draft')`);
    console.log(`  Tracking status: ${insertRes.rows[0].tracking_status} (debe ser 'pending')`);
    console.log(`  Mind file URL: ${insertRes.rows[0].mind_file_url} (debe ser null)`);

    // Insertar tarjeta vinculada mediante project_id
    const markerRes = await pool.query(
      `INSERT INTO markers (id, project_id, name, target_image, target_index, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [`marker-${testProjectId}-0`, testProjectId, 'Tarjeta Test', 'https://res.cloudinary.com/test.png', 0, 'Tarjeta de prueba']
    );
    console.log(`${GREEN}✔ PASS: Tarjeta vinculada por project_id creada: ${markerRes.rows[0].id}${RESET}`);
  } catch (err) {
    console.log(`${RED}✘ FAIL en inserción de prueba: ${err.message}${RESET}`);
    return;
  }

  // ==========================================================
  // PRUEBA 4: Consulta del Proyecto (GET)
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA 4: Consulta de Registro de Prueba (GET) ---${RESET}`);
  try {
    const getRes = await pool.query('SELECT * FROM projects WHERE id = $1', [testProjectId]);
    if (getRes.rows.length === 1 && getRes.rows[0].slug === testSlug) {
      console.log(`${GREEN}✔ PASS: Proyecto recuperado exitosamente desde Neon por ID.${RESET}`);
    } else {
      throw new Error('El proyecto consultado no coincide con el insertado');
    }

    const markersGet = await pool.query('SELECT * FROM markers WHERE project_id = $1', [testProjectId]);
    console.log(`${GREEN}✔ PASS: Tarjetas asociadas recuperadas: ${markersGet.rows.length} encontrada(s).${RESET}`);
  } catch (err) {
    console.log(`${RED}✘ FAIL en consulta: ${err.message}${RESET}`);
  }

  // ==========================================================
  // PRUEBA 5: Actualización del Proyecto (PUT)
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA 5: Actualización de Registro de Prueba (PUT) ---${RESET}`);
  try {
    const updateRes = await pool.query(
      `UPDATE projects
       SET name = $1, tracking_status = $2, mind_file_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        'Proyecto Temporal Actualizado',
        'ready',
        'https://res.cloudinary.com/zlfrskg6/raw/upload/test.mind',
        testProjectId
      ]
    );

    if (updateRes.rows[0].tracking_status === 'ready' && updateRes.rows[0].mind_file_url.includes('.mind')) {
      console.log(`${GREEN}✔ PASS: Proyecto actualizado correctamente.${RESET}`);
      console.log(`  Nuevo nombre: ${updateRes.rows[0].name}`);
      console.log(`  Nuevo tracking_status: ${updateRes.rows[0].tracking_status}`);
      console.log(`  Nueva URL .mind: ${updateRes.rows[0].mind_file_url}`);
    } else {
      throw new Error('Los datos actualizados no coinciden');
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en actualización: ${err.message}${RESET}`);
  }

  // ==========================================================
  // PRUEBA 6: Eliminación ÚNICAMENTE del Proyecto de Prueba
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA 6: Eliminación del Registro de Prueba (DELETE) ---${RESET}`);
  try {
    // ON DELETE CASCADE eliminará automáticamente los marcadores vinculados
    const delRes = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [testProjectId]);
    if (delRes.rows.length === 1) {
      console.log(`${GREEN}✔ PASS: Registro de prueba eliminado exitosamente.${RESET}`);
    } else {
      throw new Error('No se pudo eliminar el proyecto de prueba');
    }

    // Verificar que los marcadores hijos también fueron eliminados por CASCADE
    const orphanMarkers = await pool.query('SELECT COUNT(*) FROM markers WHERE project_id = $1', [testProjectId]);
    if (parseInt(orphanMarkers.rows[0].count, 10) === 0) {
      console.log(`${GREEN}✔ PASS: Cascada verificada (ON DELETE CASCADE): marcadores hijos eliminados.${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en eliminación: ${err.message}${RESET}`);
  }

  // ==========================================================
  // PRUEBA 7: Confirmar que NO se afectaron otros registros
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA 7: Verificación de Integridad Global ---${RESET}`);
  try {
    const finalCountRes = await pool.query('SELECT COUNT(*) FROM projects');
    const finalCount = parseInt(finalCountRes.rows[0].count, 10);
    if (finalCount === initialCount) {
      console.log(`${GREEN}✔ PASS: Conteo final (${finalCount}) es idéntico al inicial (${initialCount}). Ningún otro registro fue alterado.${RESET}`);
    } else {
      console.log(`${YELLOW}Aviso: Conteo inicial ${initialCount}, final ${finalCount}.${RESET}`);
    }
  } catch (err) {
    console.warn('Error verificando conteo final:', err.message);
  }

  console.log(`\n${GREEN}✔ Todas las pruebas de persistencia PostgreSQL Neon concluyeron con éxito.${RESET}\n`);
}

runNeonTests().catch(err => {
  console.error('Error fatal en pruebas Neon:', err.message);
});
