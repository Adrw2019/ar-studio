import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Play, Check, Loader2, Sparkles } from 'lucide-react';

export default function StudioNavbar({
  projectName,
  onNameChange,
  saveStatus,
  onManualSave,
  onOpenPublish,
  onOpenTheme,
  projectSlug
}) {
  const navigate = useNavigate();

  return (
    <header className="studio-navbar">
      {/* Fila Superior: [ ← ] + Título Proyecto + Estado de Guardado */}
      <div className="studio-nav-row-top">
        <div className="studio-nav-left">
          <button
            type="button"
            className="btn btn-secondary btn-icon nav-back-btn"
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
            aria-label="Nombre del Proyecto"
          />
        </div>

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
            <span>Sin guardar</span>
          )}
        </div>
      </div>

      {/* Fila Inferior (en móvil) / Derecha (en PC): Acciones con touch targets >= 44px */}
      <div className="studio-nav-actions">
        <button
          type="button"
          className="btn btn-secondary nav-action-btn"
          onClick={onOpenTheme}
          title="Personalizar apariencia, colores y textos del proyecto"
        >
          <Sparkles size={16} color="var(--accent-amber)" />
          <span>Tema</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary nav-action-btn"
          onClick={onManualSave}
          title="Guardar cambios manualmente"
        >
          <Save size={16} />
          <span>Guardar</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary nav-action-btn"
          style={{ borderColor: 'rgba(0, 242, 254, 0.4)' }}
          onClick={onOpenPublish}
          title="Publicar y generar código QR"
        >
          <Globe size={16} color="var(--accent-cyan)" />
          <span>Publicar</span>
        </button>

        <button
          type="button"
          className="btn btn-primary nav-action-btn nav-action-btn-ar"
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
