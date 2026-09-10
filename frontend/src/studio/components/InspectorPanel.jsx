import React from 'react';
import { Sliders, Move, RotateCw, Scaling, FileText, Sparkles, Volume2 } from 'lucide-react';

export default function InspectorPanel({
  selectedMarker,
  selectedAsset,
  onUpdateMarker,
  onUpdateAsset
}) {
  if (!selectedMarker && !selectedAsset) {
    return (
      <aside className="editor-panel-right">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={16} color="var(--accent-cyan)" />
            <h3>Propiedades</h3>
          </div>
        </div>
        <div className="panel-content" style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '3rem' }}>
          Selecciona una tarjeta o elemento para editar sus propiedades.
        </div>
      </aside>
    );
  }

  const handleAssetFieldChange = (field, value) => {
    if (!selectedAsset) return;
    onUpdateAsset(selectedAsset.id, {
      ...selectedAsset,
      [field]: value
    });
  };

  const handleConfigFieldChange = (configKey, value) => {
    if (!selectedAsset) return;
    const currentConfig = selectedAsset.configuration || {};
    onUpdateAsset(selectedAsset.id, {
      ...selectedAsset,
      configuration: {
        ...currentConfig,
        [configKey]: value
      }
    });
  };

  return (
    <aside className="editor-panel-right">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={16} color="var(--accent-cyan)" />
          <h3>Propiedades</h3>
        </div>
        <span className="badge-pill" style={{ fontSize: '0.7rem' }}>
          {selectedAsset ? 'Modelo 3D' : 'Tarjeta Marcador'}
        </span>
      </div>

      <div className="panel-content">
        {/* Si hay un asset seleccionado */}
        {selectedAsset && (
          <>
            {/* 1. Transformación: Posición */}
            <div className="inspector-section">
              <div className="inspector-section-title">
                <Move size={14} color="var(--accent-cyan)" />
                <span>Posición (X, Y, Z)</span>
              </div>
              <div className="transform-axis-grid">
                <div className="axis-input-box">
                  <span className="axis-label">X</span>
                  <input
                    type="number"
                    step="0.05"
                    className="axis-input"
                    value={selectedAsset.position_x ?? 0}
                    onChange={(e) => handleAssetFieldChange('position_x', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="axis-input-box">
                  <span className="axis-label">Y (Altura)</span>
                  <input
                    type="number"
                    step="0.05"
                    className="axis-input"
                    value={selectedAsset.position_y ?? 0}
                    onChange={(e) => handleAssetFieldChange('position_y', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="axis-input-box">
                  <span className="axis-label">Z</span>
                  <input
                    type="number"
                    step="0.05"
                    className="axis-input"
                    value={selectedAsset.position_z ?? 0}
                    onChange={(e) => handleAssetFieldChange('position_z', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Transformación: Rotación */}
            <div className="inspector-section">
              <div className="inspector-section-title">
                <RotateCw size={14} color="var(--accent-cyan)" />
                <span>Rotación (Grados °)</span>
              </div>
              <div className="transform-axis-grid">
                <div className="axis-input-box">
                  <span className="axis-label">X°</span>
                  <input
                    type="number"
                    step="5"
                    className="axis-input"
                    value={selectedAsset.rotation_x ?? 0}
                    onChange={(e) => handleAssetFieldChange('rotation_x', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="axis-input-box">
                  <span className="axis-label">Y°</span>
                  <input
                    type="number"
                    step="5"
                    className="axis-input"
                    value={selectedAsset.rotation_y ?? 0}
                    onChange={(e) => handleAssetFieldChange('rotation_y', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="axis-input-box">
                  <span className="axis-label">Z°</span>
                  <input
                    type="number"
                    step="5"
                    className="axis-input"
                    value={selectedAsset.rotation_z ?? 0}
                    onChange={(e) => handleAssetFieldChange('rotation_z', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Transformación: Escala */}
            <div className="inspector-section">
              <div className="inspector-section-title">
                <Scaling size={14} color="var(--accent-cyan)" />
                <span>Escala Uniforme</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  style={{ flex: 1, accentColor: 'var(--accent-cyan)' }}
                  value={selectedAsset.scale_x ?? 0.75}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.75;
                    onUpdateAsset(selectedAsset.id, {
                      ...selectedAsset,
                      scale_x: val,
                      scale_y: val,
                      scale_z: val
                    });
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', width: '45px', textAlign: 'right' }}>
                  {(selectedAsset.scale_x ?? 0.75).toFixed(2)}x
                </span>
              </div>
            </div>

            {/* 4. Metadatos Educativos & Ficha Didáctica */}
            <div className="inspector-section" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="inspector-section-title">
                <FileText size={14} color="var(--accent-cyan)" />
                <span>Ficha Didáctica</span>
              </div>

              <div className="form-group">
                <label className="form-label">Título del Objeto</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedAsset.configuration?.title || ''}
                  onChange={(e) => handleConfigFieldChange('title', e.target.value)}
                  placeholder="Ej: Motor Eléctrico"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría / Tema</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedAsset.configuration?.category || ''}
                  onChange={(e) => handleConfigFieldChange('category', e.target.value)}
                  placeholder="Ej: Electromagnetismo"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción Explicativa</label>
                <textarea
                  className="form-textarea"
                  value={selectedAsset.configuration?.description || ''}
                  onChange={(e) => handleConfigFieldChange('description', e.target.value)}
                  placeholder="Explica qué es y cómo funciona este elemento..."
                />
              </div>
            </div>

            {/* 5. Comportamiento Táctil */}
            <div className="inspector-section" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="inspector-section-title">
                <Sparkles size={14} color="var(--accent-cyan)" />
                <span>Interacción al Tocar</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedAsset.configuration?.interactive !== false}
                  onChange={(e) => handleConfigFieldChange('interactive', e.target.checked)}
                  style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
                />
                <span>Habilitar toque táctil y pulsación</span>
              </label>
            </div>
          </>
        )}

        {/* Si solo hay marcador seleccionado (sin asset) */}
        {!selectedAsset && selectedMarker && (
          <div className="inspector-section">
            <div className="form-group">
              <label className="form-label">Nombre de la Tarjeta</label>
              <input
                type="text"
                className="form-input"
                value={selectedMarker.name || ''}
                onChange={(e) => onUpdateMarker(selectedMarker.id, { ...selectedMarker, name: e.target.value })}
                placeholder="Ej: Tarjeta Motor"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-textarea"
                value={selectedMarker.description || ''}
                onChange={(e) => onUpdateMarker(selectedMarker.id, { ...selectedMarker, description: e.target.value })}
                placeholder="Descripción del marcador..."
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
