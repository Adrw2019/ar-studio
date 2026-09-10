import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Play, Check, Loader2, Sparkles } from 'lucide-react';

export default function StudioNavbar({
  projectName,
  onNameChange,
  saveStatus,
  onManualSave,
  onOpenPublish,
  projectSlug
}) {
  const navigate = useNavigate();

  return (
    <header className="studio-navbar">
      <div className="studio-nav-left">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          style={{ width: '38px', height: '38px' }}
          onClick={() => navigate('/studio')}
          aria-label="Volver a proyectos"
          title="Volver al Dashboard"
        >
          <ArrowLeft size={18} />
        </button>

        <input
          type="text"
          value={projectName || ''}
          onChange={(e) => onNameChange(e.target.value)}
          className="project-title-input"
          placeholder="Nombre del Proyecto"
        />

        <div className={`save-status-pill ${saveStatus}`}>
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={13} className="animate-spin-slow" />
              <span>Guardando...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check size={13} />
              <span>Guardado</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <span>Cambios sin guardar</span>
          )}
        </div>
      </div>

      <div className="studio-nav-actions">
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', minHeight: '38px' }}
          onClick={onManualSave}
          title="Guardar cambios manualmente"
        >
          <Save size={16} />
          <span className="hide-mobile-sm">Guardar</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', minHeight: '38px', borderColor: 'var(--accent-cyan)' }}
          onClick={onOpenPublish}
          title="Publicar y generar código QR"
        >
          <Globe size={16} color="var(--accent-cyan)" />
          <span className="hide-mobile-sm">Publicar</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', minHeight: '38px' }}
          onClick={() => window.open(`/ar/${projectSlug || 'demo'}`, '_blank')}
          title="Ejecutar experiencia en AR Player"
        >
          <Play size={16} fill="#050b14" />
          <span>Lanzar AR</span>
        </button>
      </div>
    </header>
  );
}
