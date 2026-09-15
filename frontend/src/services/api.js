/**
 * AR Studio - API Service Client
 * Métodos para interactuar con la API REST del backend.
 * Incluye fallback a IndexedDB para proyectos descargados offline.
 */
import { offlineStorage } from './offlineStorage';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl;
console.log('[AR-STUDIO API] Base URL:', API_BASE_URL);

/**
 * Función segura para procesar respuestas HTTP y evitar errores crípticos de parsing JSON
 */
async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    const text = await res.text();
    // Si la API devolvió un JSON con detalle de error, extraer el mensaje
    if (contentType.includes('application/json')) {
      try {
        const errorJson = JSON.parse(text);
        throw new Error(errorJson.error || errorJson.message || `API ${res.status}`);
      } catch (err) {
        if (!err.message.startsWith('Unexpected token')) throw err;
      }
    }
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`La API devolvió contenido no JSON: ${text.slice(0, 100)}`);
  }

  return res.json();
}

export const apiService = {
  /**
   * Health check del backend
   */
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await parseResponse(res);
    } catch (err) {
      console.warn('Backend API no disponible (modo offline):', err.message);
      return { status: 'offline', error: err.message };
    }
  },

  /**
   * Obtener todos los proyectos
   */
  async getProjects() {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`);
      const data = await parseResponse(res);
      return data.data || [];
    } catch (err) {
      console.warn('Error al obtener proyectos (intentando offline):', err.message);
      // Fallback: listar proyectos descargados desde IndexedDB
      try {
        await offlineStorage.init();
        const offlineProjects = await offlineStorage.listOfflineProjects();
        if (offlineProjects && offlineProjects.length > 0) {
          console.info('[API] Proyectos cargados desde almacenamiento offline:', offlineProjects.length);
          return offlineProjects;
        }
      } catch (offErr) {
        console.warn('[API] Fallback offline también falló:', offErr);
      }
      return [];
    }
  },

  /**
   * Obtener proyecto por ID (para edición en Studio)
   */
  async getProjectById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`);
      const data = await parseResponse(res);
      return data.data || null;
    } catch (err) {
      console.warn(`Error al obtener proyecto ${id} (intentando offline):`, err.message);
      // Fallback: buscar proyecto en IndexedDB
      try {
        await offlineStorage.init();
        const offlineProject = await offlineStorage.getOfflineProject(String(id));
        if (offlineProject) {
          console.info(`[API] Proyecto ${id} cargado desde almacenamiento offline.`);
          offlineProject._isOffline = true;
          return offlineProject;
        }
      } catch (offErr) {
        console.warn('[API] Fallback offline también falló:', offErr);
      }
      return null;
    }
  },

  /**
   * Obtener proyecto por Slug (para ejecución en AR Player)
   */
  async getProjectBySlug(slug) {
    try {
      let res = await fetch(`${API_BASE_URL}/projects/slug/${slug}`);
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/projects/public/${slug}`);
      }
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/projects/${slug}`);
      }
      const data = await parseResponse(res);
      return data.data || null;
    } catch (err) {
      console.warn(`Error al obtener proyecto ${slug} (intentando offline):`, err.message);
      // Fallback: buscar proyecto en IndexedDB por slug o por ID
      try {
        await offlineStorage.init();
        let offlineProject = await offlineStorage.getOfflineProjectBySlug(slug);
        if (!offlineProject) {
          offlineProject = await offlineStorage.getOfflineProject(String(slug));
        }
        if (offlineProject) {
          console.info(`[API] Proyecto "${slug}" cargado desde almacenamiento offline.`);
          offlineProject._isOffline = true;
          return offlineProject;
        }
      } catch (offErr) {
        console.warn('[API] Fallback offline también falló:', offErr);
      }
      return null;
    }
  },

  /**
   * Obtener marcadores físicos (tarjetas) de un proyecto
   */
  async getMarkersByProject(projectId) {
    try {
      const res = await fetch(`${API_BASE_URL}/markers/project/${projectId}`);
      const data = await parseResponse(res);
      return data.data || [];
    } catch (err) {
      console.warn(`Error al obtener marcadores del proyecto ${projectId}:`, err.message);
      return [];
    }
  },

  /**
   * Crear nuevo proyecto
   */
  async createProject(projectData) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      const data = await parseResponse(res);
      return data.data || null;
    } catch (err) {
      console.error('Error al crear proyecto:', err.message);
      throw err;
    }
  },

  /**
   * Actualizar proyecto (Guardar / Auto-guardar)
   */
  async updateProject(id, projectData) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      const data = await parseResponse(res);
      return data.data || null;
    } catch (err) {
      console.error(`Error al actualizar proyecto ${id}:`, err.message);
      throw err;
    }
  },

  /**
   * Eliminar proyecto
   */
  async deleteProject(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE'
      });
      return await parseResponse(res);
    } catch (err) {
      console.error(`Error al eliminar proyecto ${id}:`, err.message);
      throw err;
    }
  },

  /**
   * Duplicar proyecto
   */
  async duplicateProject(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}/duplicate`, {
        method: 'POST'
      });
      const data = await parseResponse(res);
      return data.data || null;
    } catch (err) {
      console.error(`Error al duplicar proyecto ${id}:`, err.message);
      throw err;
    }
  },

  /**
   * Subir archivo al backend (GLB, PNG, JPG, MP3, MP4)
   */
  async uploadFile(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options.projectId) {
        formData.append('projectId', options.projectId);
      }
      if (options.category) {
        formData.append('category', options.category);
      }

      const res = await fetch(`${API_BASE_URL}/assets/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await parseResponse(res);
      if (!data.success) {
        throw new Error(data.error || 'Error al subir archivo');
      }
      return data;
    } catch (err) {
      console.error('Error al subir archivo:', err.message);
      throw err;
    }
  },

  /**
   * Compilar targets.mind para un proyecto específico
   */
  async compileProjectTargets(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}/compile-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await parseResponse(res);
      return data;
    } catch (err) {
      console.error(`Error al compilar targets para proyecto ${id}:`, err.message);
      throw err;
    }
  },

  /**
   * Subir archivo .mind ya compilado directamente en el navegador (liviano, sin timeout de Netlify)
   */
  async uploadCompiledMind(id, mindBlob) {
    try {
      const formData = new FormData();
      formData.append('file', mindBlob, `${id}-targets.mind`);

      const res = await fetch(`${API_BASE_URL}/projects/${id}/upload-mind`, {
        method: 'POST',
        body: formData
      });
      const data = await parseResponse(res);
      if (!data.success) {
        throw new Error(data.error || 'Error al guardar archivo .mind compilado');
      }
      return data;
    } catch (err) {
      console.error(`Error al subir targets.mind para proyecto ${id}:`, err.message);
      throw err;
    }
  },

  /**
   * Eliminar un asset o contenido digital por ID (PostgreSQL Neon + Cloudinary)
   */
  async deleteAsset(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/assets/${id}`, {
        method: 'DELETE'
      });
      const data = await parseResponse(res);
      return data;
    } catch (err) {
      console.error(`Error al eliminar contenido digital ${id}:`, err.message);
      throw err;
    }
  }
};
