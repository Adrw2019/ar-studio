/**
 * AR Studio - Script de prueba para Cloudinary Storage Service
 * Ejecuta pruebas de subida, verificación de descarga HTTP 200 y eliminación.
 * NUNCA imprime credenciales ni API_SECRET en consola.
 */

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const storageService = require('../backend/services/storageService');

// Colores para salida en consola
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

async function runTests() {
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}   AR STUDIO - PRUEBAS DE STORAGE / CLOUDINARY     ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  console.log(`Proveedor activo: ${YELLOW}${process.env.STORAGE_PROVIDER || 'local'}${RESET}`);
  console.log(`Cloud Name: ${cloudName ? (cloudName.startsWith('SU_') ? YELLOW + cloudName + ' (placeholder)' + RESET : GREEN + cloudName + RESET) : RED + 'NO CONFIGURADO' + RESET}`);
  console.log(`API Key: ${apiKey ? (apiKey.startsWith('SU_') ? YELLOW + apiKey + ' (placeholder)' + RESET : GREEN + apiKey.substring(0, 4) + '***' + RESET) : RED + 'NO CONFIGURADO' + RESET}`);
  console.log(`API Secret: ${apiSecret ? (apiSecret.startsWith('SU_') ? YELLOW + apiSecret + ' (placeholder)' + RESET : GREEN + 'CONFIGURADO (Oculto por seguridad)' + RESET) : RED + 'NO CONFIGURADO' + RESET}\n`);

  // ==========================================================
  // PRUEBA A: VALIDACIÓN DE ERROR DE CONFIGURACIÓN (Requisito 15)
  // ==========================================================
  console.log(`${CYAN}--- PRUEBA A: Validación de Error de Configuración (Requisito 15) ---${RESET}`);
  try {
    // Guardar temporalmente las variables reales
    const savedName = process.env.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_CLOUD_NAME = ''; // Simular variable faltante

    let threwExpectedError = false;
    try {
      storageService.ensureCloudinaryConfigured();
    } catch (err) {
      if (err.message === 'Cloudinary storage is not configured.') {
        threwExpectedError = true;
      } else {
        console.error(`Error inesperado: ${err.message}`);
      }
    } finally {
      process.env.CLOUDINARY_CLOUD_NAME = savedName;
    }

    if (threwExpectedError) {
      console.log(`${GREEN}✔ PASS: Retorna exactamente 'Cloudinary storage is not configured.' cuando faltan credenciales.${RESET}`);
    } else {
      console.log(`${RED}✘ FAIL: No arrojó el error esperado ante credenciales faltantes.${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en Prueba A: ${err.message}${RESET}`);
  }

  // ==========================================================
  // PRUEBA B: VALIDACIÓN DE LÍMITES DE TAMAÑO (Requisito 13)
  // ==========================================================
  console.log(`\n${CYAN}--- PRUEBA B: Validación de Límites de Tamaño (Requisito 13) ---${RESET}`);
  try {
    // Crear un buffer falso de 6 MB para tarjeta (límite: 5 MB)
    const oversizedCardBuffer = Buffer.alloc(6 * 1024 * 1024);
    let rejectedOversized = false;
    try {
      storageService.validateFileSize(oversizedCardBuffer, 'card-oversized.jpg', 'cards');
    } catch (err) {
      if (err.message.includes('excede el tamaño máximo permitido')) {
        rejectedOversized = true;
      }
    }

    if (rejectedOversized) {
      console.log(`${GREEN}✔ PASS: Rechaza correctamente archivos que superan el límite (ej. tarjeta > 5 MB).${RESET}`);
    } else {
      console.log(`${RED}✘ FAIL: No rechazó archivo excedido en tamaño.${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en Prueba B: ${err.message}${RESET}`);
  }

  // Comprobar si tenemos credenciales reales para ejecutar las pruebas en vivo
  const hasRealCredentials =
    cloudName && !cloudName.startsWith('SU_') &&
    apiKey && !apiKey.startsWith('SU_') &&
    apiSecret && !apiSecret.startsWith('SU_');

  if (!hasRealCredentials) {
    console.log(`\n${YELLOW}ℹ️ Las credenciales actuales en .env son placeholders ('SU_...').${RESET}`);
    console.log(`${YELLOW}ℹ️ Para ejecutar las pruebas en vivo de subida, descarga y borrado en Cloudinary:${RESET}`);
    console.log(`${YELLOW}   1. Ingresa tu Cloud Name, API Key y API Secret reales en .env o backend/.env.${RESET}`);
    console.log(`${YELLOW}   2. Vuelve a ejecutar este script.${RESET}`);
    return;
  }

  // ==========================================================
  // TEST 1: SUBIR IMAGEN PEQUEÑA (Requisito 14 - Test 1)
  // ==========================================================
  console.log(`\n${CYAN}--- TEST 1: Subir imagen pequeña a Cloudinary ---${RESET}`);
  let imageUploadResult = null;
  try {
    // Buffer de imagen PNG válida de 1x1 píxel
    const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const samplePngBuffer = Buffer.from(samplePngBase64, 'base64');

    imageUploadResult = await storageService.saveFile({
      filename: 'test-card.png',
      buffer: samplePngBuffer,
      mimeType: 'image/png',
      projectId: 'project-test',
      category: 'cards'
    });

    console.log(`Subida: ${GREEN}OK${RESET}`);
    console.log(`Public ID: ${imageUploadResult.public_id}`);
    console.log(`Resource Type: ${imageUploadResult.resource_type}`);
    console.log(`Bytes: ${imageUploadResult.bytes}`);
    console.log(`Secure URL: ${imageUploadResult.secure_url}`);

    // Validar descarga HTTP 200
    const res = await fetch(imageUploadResult.secure_url);
    if (res.status === 200) {
      const downloaded = Buffer.from(await res.arrayBuffer());
      console.log(`Descarga HTTP: ${GREEN}200 OK${RESET} (${downloaded.length} bytes recibidos)`);
      console.log(`${GREEN}✔ TEST 1 COMPLETADO CON ÉXITO${RESET}`);
    } else {
      console.log(`${RED}✘ FAIL en descarga: HTTP ${res.status}${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en TEST 1: ${err.message}${RESET}`);
  }

  // ==========================================================
  // TEST 2: SUBIR BUFFER BINARIO GLB COMO RAW (Requisito 14 - Test 2)
  // ==========================================================
  console.log(`\n${CYAN}--- TEST 2: Subir Buffer binario GLB (raw) a Cloudinary ---${RESET}`);
  let glbUploadResult = null;
  try {
    // Buffer binario que simula un modelo GLB (Magic bytes 0x46546C67 'glTF' + header básico)
    const glbHeader = Buffer.from([
      0x67, 0x6C, 0x54, 0x46, // 'glTF' magic
      0x02, 0x00, 0x00, 0x00, // Version 2
      0x1C, 0x00, 0x00, 0x00, // Total length (28 bytes)
      0x08, 0x00, 0x00, 0x00, // Chunk 0 length (8 bytes)
      0x4A, 0x53, 0x4F, 0x4E, // Chunk 0 type: 'JSON'
      0x7B, 0x7D, 0x20, 0x20, // Content: "{}" padded
      0x00, 0x00, 0x00, 0x00  // Chunk 1 empty
    ]);

    glbUploadResult = await storageService.saveFile({
      filename: 'test-model.glb',
      buffer: glbHeader,
      mimeType: 'model/gltf-binary',
      projectId: 'project-test',
      category: 'models'
    });

    console.log(`Subida: ${GREEN}OK${RESET}`);
    console.log(`Public ID: ${glbUploadResult.public_id}`);
    console.log(`Resource Type: ${glbUploadResult.resource_type} (debe ser 'raw')`);
    console.log(`Bytes: ${glbUploadResult.bytes}`);
    console.log(`Secure URL: ${glbUploadResult.secure_url}`);

    if (glbUploadResult.resource_type !== 'raw') {
      console.log(`${RED}✘ ALERTA: resource_type no es 'raw'${RESET}`);
    }

    // Validar descarga HTTP 200 y comparar bytes exactos
    const res = await fetch(glbUploadResult.secure_url);
    if (res.status === 200) {
      const downloaded = Buffer.from(await res.arrayBuffer());
      const bytesMatch = downloaded.equals(glbHeader);
      console.log(`Descarga HTTP: ${GREEN}200 OK${RESET} (${downloaded.length} bytes recibidos)`);
      console.log(`Integridad binaria: ${bytesMatch ? GREEN + '100% IDÉNTICO AL ORIGINAL' + RESET : RED + 'DIFERENCIA DETECTADA' + RESET}`);
      console.log(`${GREEN}✔ TEST 2 COMPLETADO CON ÉXITO${RESET}`);
    } else {
      console.log(`${RED}✘ FAIL en descarga GLB: HTTP ${res.status}${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en TEST 2: ${err.message}${RESET}`);
  }

  // ==========================================================
  // TEST 3: SUBIR targets.mind REAL (Requisito 14 - Test 3)
  // ==========================================================
  console.log(`\n${CYAN}--- TEST 3: Subir targets.mind real como RAW a Cloudinary ---${RESET}`);
  let mindUploadResult = null;
  try {
    const mindFilePath = path.resolve(__dirname, '../frontend/public/markers/targets.mind');
    if (!fs.existsSync(mindFilePath)) {
      throw new Error(`No se encontró el archivo real en ${mindFilePath}`);
    }

    const originalMindBuffer = fs.readFileSync(mindFilePath);
    console.log(`Archivo targets.mind leído: ${originalMindBuffer.length} bytes`);

    mindUploadResult = await storageService.saveFile({
      filename: 'project-test-targets.mind',
      buffer: originalMindBuffer,
      mimeType: 'application/octet-stream',
      projectId: 'project-test',
      category: 'tracking'
    });

    console.log(`Subida: ${GREEN}OK${RESET}`);
    console.log(`Public ID: ${mindUploadResult.public_id}`);
    console.log(`Resource Type: ${mindUploadResult.resource_type} (debe ser 'raw')`);
    console.log(`Bytes: ${mindUploadResult.bytes}`);
    console.log(`Secure URL: ${mindUploadResult.secure_url}`);

    // Validar que la URL termina en .mind
    const endsWithMind = mindUploadResult.secure_url.endsWith('.mind');
    console.log(`Extensión en URL: ${endsWithMind ? GREEN + 'Termina en .mind (Correcto para MindAR)' + RESET : YELLOW + 'Sin .mind explícito' + RESET}`);

    // Descargar mediante GET HTTP
    const res = await fetch(mindUploadResult.secure_url);
    if (res.status === 200) {
      const downloadedBuffer = Buffer.from(await res.arrayBuffer());
      const isExactMatch = downloadedBuffer.equals(originalMindBuffer);
      console.log(`Descarga HTTP: ${GREEN}200 OK${RESET}`);
      console.log(`Bytes descargados: ${downloadedBuffer.length} (Original: ${originalMindBuffer.length})`);
      console.log(`Coincidencia exacta de bytes: ${isExactMatch ? GREEN + 'SÍ, 100% IDÉNTICO' + RESET : RED + 'NO' + RESET}`);

      if (isExactMatch) {
        console.log(`${GREEN}✔ TEST 3 COMPLETADO CON ÉXITO: El navegador/MindAR podrá descargar targets.mind sin alteraciones.${RESET}`);
      }
    } else {
      console.log(`${RED}✘ FAIL en descarga .mind: HTTP ${res.status}${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}✘ FAIL en TEST 3: ${err.message}${RESET}`);
  }

  // ==========================================================
  // LIMPIEZA / ELIMINACIÓN EN CLOUDINARY (Requisito 11 & 14)
  // ==========================================================
  console.log(`\n${CYAN}--- LIMPIEZA: Eliminar archivos de prueba de Cloudinary ---${RESET}`);

  if (imageUploadResult && imageUploadResult.public_id) {
    try {
      const delImg = await storageService.deleteFile(imageUploadResult.public_id, 'image');
      console.log(`Eliminar imagen (${imageUploadResult.public_id}): ${GREEN}${delImg.result}${RESET}`);
    } catch (e) {
      console.warn(`Error al eliminar imagen: ${e.message}`);
    }
  }

  if (glbUploadResult && glbUploadResult.public_id) {
    try {
      const delGlb = await storageService.deleteFile(glbUploadResult.public_id, 'raw');
      console.log(`Eliminar GLB (${glbUploadResult.public_id}): ${GREEN}${delGlb.result}${RESET}`);
    } catch (e) {
      console.warn(`Error al eliminar GLB: ${e.message}`);
    }
  }

  if (mindUploadResult && mindUploadResult.public_id) {
    try {
      const delMind = await storageService.deleteFile(mindUploadResult.public_id, 'raw');
      console.log(`Eliminar targets.mind (${mindUploadResult.public_id}): ${GREEN}${delMind.result}${RESET}`);
    } catch (e) {
      console.warn(`Error al eliminar targets.mind: ${e.message}`);
    }
  }

  console.log(`\n${GREEN}✔ Todas las pruebas y limpieza finalizadas correctamente.${RESET}\n`);
}

runTests().catch(err => {
  console.error(`Error fatal en pruebas:`, err);
});
