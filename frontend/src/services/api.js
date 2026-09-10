/**
 * AR Studio - API Service Client
 * Métodos para interactuar con la API REST del backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
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
      console.warn('Error al obtener proyectos:', err.message);
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
      console.warn(`Error al obtener proyecto ${id}:`, err.message);
      return null;
    }
  },

  /**
   * Obtener proyecto por Slug (para ejecución en AR Player)
   */
  async getProjectBySlug(slug) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/slug/${slug}`);
      const data = await parseResponse(res);
      return data.data || null;
    } catch (err) {
      console.warn(`Error al obtener proyecto ${slug}:`, err.message);
      return null;
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
  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

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
  }
};
