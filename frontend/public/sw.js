/**
 * AR Studio - Service Worker v1.0
 * Estrategia: App Shell (Cache-First) + Proyectos Offline (Cache-Only cuando offline)
 * Compatible con Chrome Android, Safari iOS/iPadOS, y navegadores de escritorio.
 *
 * NO depende de APIs exclusivas de Chromium.
 * NO borra automáticamente proyectos descargados por el usuario.
 */

const APP_SHELL_CACHE = 'ar-studio-shell-v1';
const RUNTIME_CACHE = 'ar-studio-runtime-v1';
const FONT_CACHE = 'ar-studio-fonts-v1';

// Prefijo para cachés de proyectos offline (ar-studio-project-{id})
const PROJECT_CACHE_PREFIX = 'ar-studio-project-';

// Recursos del App Shell que se pre-cachean en install
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
];

// ============================================================
// INSTALL: Pre-cachear el App Shell
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v1...');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-cacheando App Shell...');
        // Usar addAll con tolerancia a fallos (algunos recursos podrían no existir aún)
        return Promise.allSettled(
          APP_SHELL_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] No se pudo pre-cachear: ${url}`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] App Shell pre-cacheado.');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVATE: Limpiar cachés obsoletas (pero NUNCA los proyectos del usuario)
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker v1...');
  const VALID_CACHES = [APP_SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Mantener cachés válidas actuales
            if (VALID_CACHES.includes(cacheName)) return;
            // NUNCA eliminar cachés de proyectos del usuario
            if (cacheName.startsWith(PROJECT_CACHE_PREFIX)) return;
            // Eliminar cachés obsoletas de versiones anteriores del app shell
            console.log('[SW] Eliminando caché obsoleta:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado y controlando clientes.');
        return self.clients.claim();
      })
  );
});

// ============================================================
// FETCH: Routing por tipo de recurso
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo manejar GET requests
  if (event.request.method !== 'GET') return;

  // Ignorar extensiones de Chrome y URLs de DevTools
  if (url.protocol === 'chrome-extension:' || url.protocol === 'devtools:') return;

  // 1. Google Fonts → Cache-First (raramente cambian)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request, FONT_CACHE));
    return;
  }

  // 2. API calls → Network-First con fallback genérico
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 3. Cloudinary assets → Network-First (pueden actualizarse)
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('res.cloudinary.com')) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // 4. Recursos de navegación (HTML) → Network-First con fallback al shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      networkFirst(event.request, APP_SHELL_CACHE)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 5. Assets estáticos de la app (JS, CSS, imágenes locales) → Cache-First
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.jpg') ||
     url.pathname.endsWith('.webp') ||
     url.pathname.endsWith('.woff2') ||
     url.pathname.endsWith('.woff'))
  ) {
    event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
    return;
  }

  // 6. Todo lo demás → Network-First con caché runtime
  event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
});

// ============================================================
// MESSAGE: Comandos desde la aplicación
// ============================================================
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_PROJECT_ASSETS':
      // Cachear assets de un proyecto específico para uso offline
      if (data && data.projectId && data.urls) {
        event.waitUntil(cacheProjectAssets(data.projectId, data.urls));
      }
      break;

    case 'DELETE_PROJECT_CACHE':
      // Eliminar caché de un proyecto específico
      if (data && data.projectId) {
        event.waitUntil(deleteProjectCache(data.projectId));
      }
      break;

    case 'GET_CACHE_STATUS':
      // Reportar qué proyectos están cacheados
      event.waitUntil(
        getCacheStatus().then((status) => {
          event.ports[0]?.postMessage(status);
        })
      );
      break;
  }
});

// ============================================================
// Estrategias de Cacheo
// ============================================================

/**
 * Cache-First: Servir desde caché si existe, sino hacer fetch y cachear
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Si no hay red y no hay caché, intentar buscar en cachés de proyecto
    const projectResponse = await searchProjectCaches(request);
    if (projectResponse) return projectResponse;
    throw err;
  }
}

/**
 * Network-First: Intentar red primero, fallback a caché
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (cacheName && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    if (cacheName) {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    // Buscar en cachés de proyecto como último recurso
    const projectResponse = await searchProjectCaches(request);
    if (projectResponse) return projectResponse;
    throw err;
  }
}

/**
 * Buscar un recurso en las cachés de proyecto del usuario
 */
async function searchProjectCaches(request) {
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    if (name.startsWith(PROJECT_CACHE_PREFIX)) {
      const cache = await caches.open(name);
      const match = await cache.match(request);
      if (match) return match;
    }
  }
  return null;
}

// ============================================================
// Gestión de Cachés de Proyecto
// ============================================================

/**
 * Cachear assets de un proyecto específico
 */
async function cacheProjectAssets(projectId, urls) {
  const cacheName = `${PROJECT_CACHE_PREFIX}${projectId}`;
  const cache = await caches.open(cacheName);

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          return { url, status: 'cached' };
        }
        return { url, status: 'error', reason: `HTTP ${response.status}` };
      } catch (err) {
        return { url, status: 'error', reason: err.message };
      }
    })
  );

  console.log(`[SW] Proyecto ${projectId} cacheado:`, results);
  // Notificar a los clientes
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'PROJECT_CACHE_COMPLETE',
      projectId,
      results: results.map((r) => r.value || r.reason)
    });
  });
}

/**
 * Eliminar caché de un proyecto específico
 */
async function deleteProjectCache(projectId) {
  const cacheName = `${PROJECT_CACHE_PREFIX}${projectId}`;
  const deleted = await caches.delete(cacheName);
  console.log(`[SW] Caché del proyecto ${projectId} ${deleted ? 'eliminada' : 'no encontrada'}.`);
}

/**
 * Obtener estado de cachés de proyectos
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const projects = [];
  for (const name of cacheNames) {
    if (name.startsWith(PROJECT_CACHE_PREFIX)) {
      const projectId = name.replace(PROJECT_CACHE_PREFIX, '');
      const cache = await caches.open(name);
      const keys = await cache.keys();
      projects.push({
        projectId,
        cachedUrls: keys.length,
        cacheName: name
      });
    }
  }
  return { projects, appShellCached: cacheNames.includes(APP_SHELL_CACHE) };
}
