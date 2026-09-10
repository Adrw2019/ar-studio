import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban, Plus, Search, Layers, Play, Copy, Trash2, Globe, ExternalLink,
  Sparkles, Clock, CheckCircle2, Box, ArrowLeft, RefreshCw
} from 'lucide-react';
import { apiService } from '../../services/api';
import PublishModal from '../components/PublishModal';
import '../styles/dashboard.css';

export default function StudioDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'draft', 'published'
  const [activePublishProject, setActivePublishProject] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProjects();
      setProjects(data || []);
    } catch (err) {
      console.error('Error al cargar proyectos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const created = await apiService.createProject({
        name: newProjectName.trim(),
        description: 'Proyecto educativo interactivo de Realidad Aumentada.'
      });
      setIsCreating(false);
      setNewProjectName('');
      if (created && created.id) {
        navigate(`/studio/project/${created.id}`);
      } else {
        loadProjects();
      }
    } catch (err) {
      alert('Error al crear proyecto: ' + err.message);
    }
  };

  const handleDuplicate = async (projectId) => {
    try {
      const duplicated = await apiService.duplicateProject(projectId);
      if (duplicated) {
        loadProjects();
      }
    } catch (err) {
      alert('Error al duplicar proyecto: ' + err.message);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    if (window.confirm(`¿Estás seguro de eliminar el proyecto "${projectName}"?`)) {
      try {
        await apiService.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        alert('Error al eliminar proyecto: ' + err.message);
      }
    }
  };

  // Filtrado de proyectos
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <header className="dashboard-top-bar">
        <div className="dashboard-title-area">
          <Link to="/" className="btn btn-secondary btn-icon" style={{ width: '40px', height: '40px' }} title="Volver al inicio">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FolderKanban size={24} color="var(--accent-cyan)" />
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>AR Studio Projects</h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Crea, edita y publica experiencias educativas de Realidad Aumentada
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={18} fill="#050b14" />
          <span>Nuevo Proyecto</span>
        </button>
      </header>

      {/* Control & Search Bar */}
      <section className="dashboard-controls">
        <div className="search-input-wrapper">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar proyectos por nombre o tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Todos ({projects.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'published' ? 'active' : ''}`}
            onClick={() => setFilterStatus('published')}
          >
            Publicados
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'draft' ? 'active' : ''}`}
            onClick={() => setFilterStatus('draft')}
          >
            Borradores
          </button>
        </div>
      </section>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="animate-spin-slow" style={{ margin: '0 auto 1rem auto' }} />
          <p>Cargando proyectos educativos...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-card-header">
                <span className={project.status === 'published' ? 'status-badge-published' : 'status-badge-draft'}>
                  {project.status === 'published' ? '● Publicado' : '○ Borrador'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    onClick={() => handleDuplicate(project.id)}
                    title="Duplicar proyecto"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    onClick={() => handleDelete(project.id, project.name)}
                    title="Eliminar proyecto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="project-card-body">
                <h3 className="project-name">{project.name}</h3>
                <p className="project-desc">{project.description || 'Sin descripción'}</p>

                <div className="project-meta-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers size={13} color="var(--accent-cyan)" />
                    {project.markers_count || (project.markers ? project.markers.length : 1)} Tarjetas
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Box size={13} color="var(--accent-blue)" />
                    {project.assets_count || (project.assets ? project.assets.length : 1)} Modelos 3D
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                    <Clock size={13} />
                    {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="project-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                  onClick={() => navigate(`/studio/project/${project.id}`)}
                >
                  <span>Editar 3D</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                  onClick={() => setActivePublishProject(project)}
                >
                  <Globe size={15} />
                  <span>Publicar / QR</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FolderKanban size={48} color="var(--accent-cyan)" />
          <h3 style={{ margin: 0 }}>No se encontraron proyectos</h3>
          <p style={{ maxWidth: '400px', margin: 0, fontSize: '0.9rem' }}>
            {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Crea tu primer proyecto educativo con Realidad Aumentada.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} fill="#050b14" />
            <span>Crear Proyecto</span>
          </button>
        </div>
      )}

      {/* Modal Crear Nuevo Proyecto */}
      {isCreating && (
        <div className="modal-backdrop" onClick={() => setIsCreating(false)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo Proyecto AR</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre del Proyecto</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ej: Circuito Eléctrico, Sistema Solar..."
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Crear y Editar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Publicar y QR */}
      {activePublishProject && (
        <PublishModal
          isOpen={true}
          onClose={() => setActivePublishProject(null)}
          project={activePublishProject}
          onUpdateStatus={async (newStatus) => {
            await apiService.updateProject(activePublishProject.id, { status: newStatus });
            loadProjects();
          }}
          onUpdateSlug={async (newSlug) => {
            await apiService.updateProject(activePublishProject.id, { slug: newSlug });
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
