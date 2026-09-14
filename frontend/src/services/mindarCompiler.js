import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

/**
 * Carga una imagen en un elemento HTMLImageElement con soporte CORS
 */
function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen para reconocimiento: ${url}`));
    // Evitar colisión de caché CORS agregando un parámetro temporal
    const separator = url.includes('?') ? '&' : '?';
    img.src = `${url}${separator}t=${Date.now()}`;
  });
}

/**
 * Compila tarjetas en el navegador utilizando MindAR Compiler
 * @param {Array} markers - Lista de tarjetas con target_image y target_index
 * @param {Function} onProgress - Callback de progreso (0 a 100)
 * @returns {Promise<{ buffer: Uint8Array, blob: Blob, count: number }>}
 */
export async function compileMindTargetsInBrowser(markers, onProgress) {
  if (!markers || markers.length === 0) {
    throw new Error('El proyecto no tiene tarjetas registradas para compilar.');
  }

  // 1. Filtrar tarjetas con imagen y ordenar por target_index estrictamente
  const sortedMarkers = [...markers]
    .filter(m => m.target_image && m.target_image.trim())
    .sort((a, b) => (a.target_index ?? 0) - (b.target_index ?? 0));

  if (sortedMarkers.length === 0) {
    throw new Error('Ninguna tarjeta tiene imagen asignada. Sube la imagen física antes de compilar.');
  }

  // 2. Verificar que ninguna URL sea blob temporal
  const blobMarker = sortedMarkers.find(m => m.target_image.startsWith('blob:'));
  if (blobMarker) {
    throw new Error('La imagen de esta tarjeta todavía no está almacenada correctamente. Vuelve a subirla.');
  }

  // 3. Descargar y preparar cada imagen en el navegador
  if (onProgress) onProgress(5);
  const images = [];
  for (let i = 0; i < sortedMarkers.length; i++) {
    const marker = sortedMarkers[i];
    try {
      const img = await loadImageElement(marker.target_image);
      images.push(img);
    } catch (err) {
      throw new Error(`Error al descargar la imagen de la tarjeta "${marker.name || i + 1}": ${err.message}`);
    }
  }

  if (onProgress) onProgress(10);

  // 4. Instanciar compilador de MindAR y ejecutar compilación client-side
  const compiler = new Compiler();

  await compiler.compileImageTargets(images, (percent) => {
    if (onProgress) {
      // Mapear el progreso entre 10% y 95%
      const mapped = Math.round(10 + (percent * 0.85));
      onProgress(Math.min(mapped, 95));
    }
  });

  if (onProgress) onProgress(98);

  // 5. Exportar el buffer binario compilado (.mind)
  const buffer = compiler.exportData();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });

  if (onProgress) onProgress(100);

  return {
    buffer,
    blob,
    count: images.length
  };
}
