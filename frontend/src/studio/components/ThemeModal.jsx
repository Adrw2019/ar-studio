import React, { useState } from 'react';
import { X, Palette, Sparkles, Check, Image, Type } from 'lucide-react';

const PRESET_PALETTES = [
  { name: 'Naranja Industrial', primary: '#f97316', secondary: '#0284c7' },
  { name: 'Verde Naturaleza', primary: '#10b981', secondary: '#06b6d4' },
  { name: 'Azul Electrónico', primary: '#00f2fe', secondary: '#8a2be2' },
  { name: 'Rojo Anatomía', primary: '#ef4444', secondary: '#ec4899' },
  { name: 'Púrpura Robótica', primary: '#6366f1', secondary: '#a855f7' }
];

export default function ThemeModal({
  isOpen,
  onClose,
  theme = {},
  projectName = '',
  onSaveTheme
}) {
  if (!isOpen) return null;

  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor || '#00f2fe');
  const [secondaryColor, setSecondaryColor] = useState(theme.secondaryColor || '#8a2be2');
  const [title, setTitle] = useState(theme.title || projectName || '');
  const [subtitle, setSubtitle] = useState(theme.subtitle || '');
  const [introText, setIntroText] = useState(theme.introText || '');
  const [backgroundImage, setBackgroundImage] = useState(theme.backgroundImage || '');
  const [logo, setLogo] = useState(theme.logo || '');

  const handleApplyPreset = (preset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const handleSave = () => {
    onSaveTheme({
      ...theme,
      primaryColor,
      secondaryColor,
      title: title.trim() || projectName,
      subtitle: subtitle.trim(),
      introText: introText.trim(),
      backgroundImage: backgroundImage.trim(),
      logo: logo.trim(),
      buttonStyle: 'modern',
      panelStyle: 'glass'
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Palette size={22} color={primaryColor} />
            <h2>Apariencia del Proyecto</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-0.25rem', marginBottom: '1rem' }}>
          Personaliza los colores, títulos y textos que verán los estudiantes al escanear el código QR de este proyecto:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Paletas recomendadas */}
          <div className="form-group">
            <label className="form-label">Paletas Educativas Recomendadas</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PRESET_PALETTES.map((preset) => {
                const isActive = primaryColor === preset.primary;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isActive ? primaryColor : 'var(--border-glass)'}`,
                      borderRadius: '8px',
                      padding: '0.35rem 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: preset.primary }} />
                    <span>{preset.name}</span>
                    {isActive && <Check size={12} color={primaryColor} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colores principales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Color Primario (Botones y realces)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color Secundario (Acentos)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
          </div>

          {/* Título de bienvenida */}
          <div className="form-group">
            <label className="form-label">Título en Pantalla de Bienvenida</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Ingeniería Industrial: Planta de Manufactura"
            />
          </div>

          {/* Subtítulo */}
          <div className="form-group">
            <label className="form-label">Subtítulo Descriptivo</label>
            <input
              type="text"
              className="form-input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ej: Simulación interactiva de procesos y seguridad"
            />
          </div>

          {/* Texto de introducción */}
          <div className="form-group">
            <label className="form-label">Texto de Introducción para el Estudiante</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="Explica qué verá el estudiante al iniciar la experiencia con la cámara..."
            />
          </div>

          {/* Vista previa miniatura del tema */}
          <div
            style={{
              background: `radial-gradient(circle at top right, ${secondaryColor}22, #080b11 75%)`,
              border: `1px solid ${primaryColor}44`,
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: primaryColor, textTransform: 'uppercase' }}>
              Vista previa de la pantalla del estudiante
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              {title || projectName || 'Título del Proyecto'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {subtitle || 'Subtítulo educativo'}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                marginTop: '0.4rem',
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                color: '#050b14',
                fontWeight: 700
              }}
            >
              Iniciar experiencia
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
              Guardar Apariencia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
