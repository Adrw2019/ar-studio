import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban, Plus, Search, Layers, Play, Copy, Trash2, Globe, ExternalLink,
  Sparkles, Clock, CheckCircle2, Box, ArrowLeft, RefreshCw, QrCode, Tag
} from 'lucide-react';
import { apiService } from '../../services/api';
import PublishModal from '../components/PublishModal';
import '../styles/dashboard.css';

const CATEGORY_PRESETS = [
  'Todos',
  'Ingeniería Industrial',
  'Medio Ambiente',
  'Electrónica',
  'Anatomía',
  'Robótica',
  'STEM'
];

const CATEGORY_THEMES = {
  'Ingeniería Industrial': { primaryColor: '#f97316', secondaryColor: '#0284c7', buttonStyle: 'industrial' },
  'Medio Ambiente': { primaryColor: '#10b981', secondaryColor: '#06b6d4', buttonStyle: 'eco' },
  'Electrónica': { primaryColor: '#00f2fe', secondaryColor: '#8a2be2', buttonStyle: 'neon' },
  'Anatomía': { primaryColor: '#ef4444', secondaryColor: '#ec4899', buttonStyle: 'cardio' },
  'Robótica': { primaryColor: '#6366f1', secondaryColor: '#a855f7', buttonStyle: 'cyber' },
  'STEM': { primaryColor: '#00f2fe', secondaryColor: '#8a2be2', buttonStyle: 'modern' }
};

export default function StudioDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'draft', 'published'
  const [activePublishProject, setActivePublishProject] = useState(null);

  // Estado del modal de creación
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('Ingeniería Industrial');
  const [newProjectDesc, setNewProjectDesc] = useState('');

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

    const chosenTheme = CATEGORY_THEMES[newProjectCategory] || CATEGORY_THEMES['STEM'];

    try {
      const created = await apiService.createProject({
        name: newProjectName.trim(),
        category: newProjectCategory,
        description: newProjectDesc.trim() || `Experiencia interactiva de ${newProjectCategory} en Realidad Aumentada.`,
        theme: {
          ...chosenTheme,
          title: newProjectName.trim(),
          subtitle: `Módulo de ${newProjectCategory}`,
          introText: newProjectDesc.trim() || `Explora en Realidad Aumentada los conceptos clave de ${newProjectName.trim()}.`
        }
      });
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectDesc('');
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
    if (window.confirm(`¿Estás seguro de eliminar el proyecto "${projectName}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiService.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        alert('Error al eliminar proyecto: ' + err.message);
      }
    }
  };

  // Filtrado compuesto (búsqueda + categoría + estado)
  const filteredProjects = projects.filter((p) => {
    const pCategory = p.category || 'STEM';
    const matchesCategory = selectedCategory === 'Todos' || pCategory.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          pCategory.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-container">
      {/* 1. Barra Superior Principal */}
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
              Gestiona múltiples proyectos educativos independientes de Realidad Aumentada
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

      {/* 2. Categorías / Dominios de Proyectos */}
      <section style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {CATEGORY_PRESETS.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-glass)'}`,
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              {cat}
            </button>
          );
        })}
      </section>

      {/* 3. Barra de Búsqueda y Filtros de Estado */}
      <section className="dashboard-controls">
        <div className="search-input-wrapper">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, descripción o área temática..."
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

      {/* 4. Galería de Proyectos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="animate-spin-slow" style={{ margin: '0 auto 1rem auto' }} />
          <p>Cargando proyectos educativos independientes...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="projects-grid">
          {filteredProjects.map((project) => {
            const projectTheme = project.theme || {};
            const themeColor = projectTheme.primaryColor || 'var(--accent-cyan)';
            const categoryName = project.category || 'General';

            return (
              <div key={project.id} className="project-card">
                {/* Header de la Card con Categoría y Estado */}
                <div className="project-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: themeColor,
                        display: 'inline-block',
                        boxShadow: `0 0 8px ${themeColor}`
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {categoryName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span className={project.status === 'published' ? 'status-badge-published' : 'status-badge-draft'}>
                      {project.status === 'published' ? '● Publicado' : project.status === 'ready' ? '● Listo' : '○ Borrador'}
                    </span>

                    {(!project.mind_file_url || project.tracking_status === 'pending') && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#f59e0b',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '999px',
                          padding: '0.15rem 0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Las tarjetas físicas aún no cuentan con un archivo targets.mind compilado."
                      >
                        <span>⚠️</span> Tarjetas pendientes de preparar
                      </span>
                    )}

                    {/* Acciones Rápidas: Duplicar y Eliminar */}
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', marginLeft: 'auto' }}
                      onClick={() => handleDuplicate(project.id)}
                      title="Duplicar este proyecto"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px' }}
                      onClick={() => handleDelete(project.id, project.name)}
                      title="Eliminar este proyecto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Cuerpo del Proyecto */}
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
                      {project.assets_count || (project.assets ? project.assets.length : 0)} Contenidos
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                      <Clock size={13} />
                      {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Barra de Acciones del Proyecto (Editar, Abrir, QR, Publicar) */}
                <div className="project-card-actions" style={{ gridTemplateColumns: '1.2fr 1fr auto auto' }}>
                  {/* 1. EDITAR */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                    onClick={() => navigate(`/studio/project/${project.id}`)}
                    title="Abrir editor 3D del proyecto"
                  >
                    <span>Editar 3D</span>
                  </button>

                  {/* 2. ABRIR EXPERIENCIA */}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem', backgroundColor: themeColor, borderColor: themeColor }}
                    onClick={() => window.open(`/ar/${project.slug || project.id}`, '_blank')}
                    title="Ejecutar experiencia AR personalizada"
                  >
                    <Play size={13} fill="#050b14" />
                    <span>Abrir</span>
                  </button>

                  {/* 3. QR PROPIO */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    style={{ width: '34px', height: '34px', padding: 0 }}
                    onClick={() => setActivePublishProject(project)}
                    title="Ver y descargar código QR del proyecto"
                  >
                    <QrCode size={16} color="var(--accent-cyan)" />
                  </button>

                  {/* 4. PUBLICAR */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    style={{ width: '34px', height: '34px', padding: 0 }}
                    onClick={() => setActivePublishProject(project)}
                    title="Configurar publicación y URL pública"
                  >
                    <Globe size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state" style={{ padding: '4.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <FolderKanban size={32} color="var(--accent-cyan)" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem' }}>No hay proyectos todavía</h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Crea tu primer proyecto de realidad aumentada.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.6rem', fontSize: '0.95rem', fontWeight: 700 }}
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} fill="#050b14" />
            <span>+ Crear primer proyecto</span>
          </button>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <FolderKanban size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ margin: '0 0 0.4rem 0' }}>No se encontraron coincidencias</h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem auto', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {searchQuery
              ? `No hay proyectos que coincidan con "${searchQuery}".`
              : `No hay proyectos en la categoría "${selectedCategory}".`}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setSearchQuery(''); setSelectedCategory('Todos'); setFilterStatus('all'); }}
          >
            <span>Restablecer filtros</span>
          </button>
        </div>
      )}

      {/* 5. Modal Crear Nuevo Proyecto con Categoría */}
      {isCreating && (
        <div className="modal-backdrop" onClick={() => setIsCreating(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '0.5rem' }}>Nuevo Proyecto de Realidad Aumentada</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Cada proyecto tendrá sus propias tarjetas físicas, contenidos digitales, apariencia y código QR único.
            </p>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Área / Categoría</label>
                <select
                  className="form-select"
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value)}
                >
                  <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                  <option value="Medio Ambiente">Medio Ambiente</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Anatomía">Anatomía</option>
                  <option value="Seguridad Industrial">Seguridad Industrial</option>
                  <option value="Robótica">Robótica</option>
                  <option value="STEM">Ciencias / STEM</option>
                  <option value="Otra">Otra área</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Proyecto</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ej: Planta de Producción, Ecosistema Marino..."
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Breve descripción didáctica</label>
                <textarea
                  className="form-textarea"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Explica qué aprenderán los estudiantes en esta experiencia..."
                  rows={3}
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
                  Crear y Diseñar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Publicar y QR Propio del Proyecto */}
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
