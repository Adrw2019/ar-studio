/**
 * AR Studio - Resolución segura de rutas estáticas.
 * Compatible con:
 * - localhost
 * - GitHub Pages /ar-studio/
 * - Netlify
 */

export function resolveAssetPath(path) {
  if (!path) return '';

  // URLs externas o generadas dinámicamente
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const base = (import.meta.env?.BASE_URL || '/').endsWith('/')
    ? (import.meta.env?.BASE_URL || '/')
    : `${import.meta.env?.BASE_URL || '/'}/`;

  let cleanPath = path.startsWith('/')
    ? path.slice(1)
    : path;

  // Evitar duplicar el basename de GitHub Pages o prefijos repetidos
  const cleanBase = base.replace(/^\/|\/$/g, '');

  if (cleanBase) {
    while (cleanPath.startsWith(`${cleanBase}/`)) {
      cleanPath = cleanPath.substring(cleanBase.length + 1);
    }
  }

  // Prevenir residuo si viene prefijado con 'ar-studio/'
  while (cleanPath.startsWith('ar-studio/')) {
    cleanPath = cleanPath.substring('ar-studio/'.length);
  }

  return `${base}${cleanPath}`;
}
