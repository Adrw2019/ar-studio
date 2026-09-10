/**
 * AR Studio - API Service Client
 * Métodos para interactuar con la API REST del backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiService = {
  /**
   * Health check del backend
   */
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
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
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.warn('Error al obtener proyectos:', err);
      return [];
    }
  },

  /**
   * Obtener proyecto por ID (para edición en Studio)
   */
  async getProjectById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`);
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.warn(`Error al obtener proyecto ${id}:`, err);
      return null;
    }
  },

  /**
   * Obtener proyecto por Slug (para ejecución en AR Player)
   */
  async getProjectBySlug(slug) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/slug/${slug}`);
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.warn(`Error al obtener proyecto ${slug}:`, err);
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
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error('Error al crear proyecto:', err);
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
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error(`Error al actualizar proyecto ${id}:`, err);
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
      return await res.json();
    } catch (err) {
      console.error(`Error al eliminar proyecto ${id}:`, err);
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
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error(`Error al duplicar proyecto ${id}:`, err);
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
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al subir archivo');
      }
      return data;
    } catch (err) {
      console.error('Error al subir archivo:', err);
      throw err;
    }
  }
};
