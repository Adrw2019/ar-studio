import React, { useState } from 'react';
import { Sliders, Move, RotateCw, Scaling, FileText, Sparkles, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

export default function InspectorPanel({
  selectedMarker,
  selectedAsset,
  onUpdateMarker,
  onUpdateAsset
}) {
  // Ajustes avanzados colapsados por defecto
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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
          Selecciona una tarjeta o contenido digital para ajustar sus propiedades.
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

  // Valores calculados para sliders sencillos
  const currentScale = parseFloat(selectedAsset?.scale_x ?? 0.75);
  const currentHeight = parseFloat(selectedAsset?.position_y ?? 0);
  const currentRotation = Math.round((parseFloat(selectedAsset?.rotation_y ?? 0) % 360 + 360) % 360);

  // Etiqueta amigable de tipo
  let typeLabel = 'Contenido Digital';
  if (selectedAsset?.type === 'model3d') typeLabel = 'Modelo 3D';
  if (selectedAsset?.type === 'image') typeLabel = 'Imagen';
  if (selectedAsset?.type === 'video') typeLabel = 'Video';
  if (selectedAsset?.type === 'audio') typeLabel = 'Audio';
  if (selectedAsset?.type === 'text') typeLabel = 'Texto';

  return (
    <aside className="editor-panel-right">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={16} color="var(--accent-cyan)" />
          <h3>Propiedades</h3>
        </div>
        <span className="badge-pill" style={{ fontSize: '0.7rem' }}>
          {selectedAsset ? typeLabel : 'Tarjeta Física'}
        </span>
      </div>

      <div className="panel-content">
        {/* Si hay un asset seleccionado */}
        {selectedAsset && (
          <>
            {/* SECCIÓN PRINCIPAL SENCILLA: TAMAÑO, ALTURA Y GIRO */}
            <div className="inspector-section">
              <div className="inspector-section-title">
                <Sliders size={14} color="var(--accent-cyan)" />
                <span>Ajustes Principales</span>
              </div>

              <div className="simple-slider-group">
                {/* 1. TAMAÑO */}
                <div className="simple-slider-row">
                  <div className="simple-slider-header">
                    <span className="simple-slider-label">
                      TAMAÑO
                      <button type="button" className="help-icon-btn" aria-label="Ayuda sobre tamaño">
                        ?
                        <span className="tooltip-box">
                          Ajusta qué tan grande o pequeño se verá sobre la tarjeta.
                        </span>
                      </button>
                    </span>
                    <span className="simple-slider-val">{currentScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.05"
                    value={currentScale}
                    style={{ accentColor: 'var(--accent-cyan)', width: '100%', cursor: 'pointer' }}
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
                </div>

                {/* 2. ALTURA */}
                <div className="simple-slider-row">
                  <div className="simple-slider-header">
                    <span className="simple-slider-label">
                      ALTURA
                      <button type="button" className="help-icon-btn" aria-label="Ayuda sobre altura">
                        ?
                        <span className="tooltip-box">
                          Sube o baja el contenido sobre la superficie de la tarjeta física.
                        </span>
                      </button>
                    </span>
                    <span className="simple-slider-val">{currentHeight.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="-0.2"
                    max="2.0"
                    step="0.05"
                    value={currentHeight}
                    style={{ accentColor: 'var(--accent-cyan)', width: '100%', cursor: 'pointer' }}
                    onChange={(e) => handleAssetFieldChange('position_y', parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* 3. GIRO */}
                <div className="simple-slider-row">
                  <div className="simple-slider-header">
                    <span className="simple-slider-label">
                      GIRO
                      <button type="button" className="help-icon-btn" aria-label="Ayuda sobre giro">
                        ?
                        <span className="tooltip-box">
                          Gira el contenido horizontalmente para orientarlo hacia el estudiante.
                        </span>
                      </button>
                    </span>
                    <span className="simple-slider-val">{currentRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={currentRotation}
                    style={{ accentColor: 'var(--accent-cyan)', width: '100%', cursor: 'pointer' }}
                    onChange={(e) => handleAssetFieldChange('rotation_y', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN COLAPSABLE: AJUSTES AVANZADOS (X, Y, Z) */}
            <div className="inspector-section">
              <button
                type="button"
                className="advanced-toggle-btn"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                <span>Ajustes avanzados (coordenadas 3D)</span>
                {isAdvancedOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {isAdvancedOpen && (
                <div className="advanced-content">
                  {/* Posición X, Y, Z */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Posición X, Y, Z
                    </span>
                    <div className="transform-axis-grid">
                      <div className="axis-input-box">
                        <span className="axis-label">X (Lateral)</span>
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
                        <span className="axis-label">Z (Profundidad)</span>
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

                  {/* Rotación X, Y, Z */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Rotación X, Y, Z (Grados)
                    </span>
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

                  {/* Escala Exacta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Escala exacta
                    </span>
                    <div className="transform-axis-grid">
                      <div className="axis-input-box">
                        <span className="axis-label">X</span>
                        <input
                          type="number"
                          step="0.05"
                          className="axis-input"
                          value={selectedAsset.scale_x ?? 0.75}
                          onChange={(e) => handleAssetFieldChange('scale_x', parseFloat(e.target.value) || 0.75)}
                        />
                      </div>
                      <div className="axis-input-box">
                        <span className="axis-label">Y</span>
                        <input
                          type="number"
                          step="0.05"
                          className="axis-input"
                          value={selectedAsset.scale_y ?? 0.75}
                          onChange={(e) => handleAssetFieldChange('scale_y', parseFloat(e.target.value) || 0.75)}
                        />
                      </div>
                      <div className="axis-input-box">
                        <span className="axis-label">Z</span>
                        <input
                          type="number"
                          step="0.05"
                          className="axis-input"
                          value={selectedAsset.scale_z ?? 0.75}
                          onChange={(e) => handleAssetFieldChange('scale_z', parseFloat(e.target.value) || 0.75)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN: INFORMACIÓN DEL CONTENIDO (Antes Ficha Didáctica) */}
            <div className="inspector-section" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="inspector-section-title">
                <FileText size={14} color="var(--accent-cyan)" />
                <span>Información del contenido</span>
                <button type="button" className="help-icon-btn" aria-label="Ayuda sobre información del contenido">
                  ?
                  <span className="tooltip-box">
                    Datos y explicaciones que el estudiante leerá en pantalla cuando interactúe con el elemento.
                  </span>
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Título del elemento</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedAsset.configuration?.title || ''}
                  onChange={(e) => handleConfigFieldChange('title', e.target.value)}
                  placeholder="Ej: Motor Eléctrico, Batería, etc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría / Tema</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedAsset.configuration?.category || ''}
                  onChange={(e) => handleConfigFieldChange('category', e.target.value)}
                  placeholder="Ej: Física, Electromagnetismo, etc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción explicativa</label>
                <textarea
                  className="form-textarea"
                  value={selectedAsset.configuration?.description || ''}
                  onChange={(e) => handleConfigFieldChange('description', e.target.value)}
                  placeholder="Explica de forma clara y sencilla qué es este elemento y cómo funciona..."
                />
              </div>
            </div>

            {/* SECCIÓN: INTERACCIÓN AL TOCAR */}
            <div className="inspector-section" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="inspector-section-title">
                <Sparkles size={14} color="var(--accent-cyan)" />
                <span>Interacción al tocar</span>
                <button type="button" className="help-icon-btn" aria-label="Ayuda sobre interacción">
                  ?
                  <span className="tooltip-box">
                    Permite que el estudiante toque el elemento en la pantalla de su móvil para ver información o escuchar el audio.
                  </span>
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedAsset.configuration?.interactive !== false}
                  onChange={(e) => handleConfigFieldChange('interactive', e.target.checked)}
                  style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Habilitar toque táctil y pulsación</span>
              </label>
            </div>
          </>
        )}

        {/* Si solo hay tarjeta física seleccionada */}
        {!selectedAsset && selectedMarker && (
          <div className="inspector-section">
            <div className="inspector-section-title">
              <FileText size={14} color="var(--accent-cyan)" />
              <span>Información de la Tarjeta</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre de la Tarjeta</label>
              <input
                type="text"
                className="form-input"
                value={selectedMarker.name || ''}
                onChange={(e) => onUpdateMarker(selectedMarker.id, { ...selectedMarker, name: e.target.value })}
                placeholder="Ej: Tarjeta 1 - Motor"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción didáctica</label>
              <textarea
                className="form-textarea"
                value={selectedMarker.description || ''}
                onChange={(e) => onUpdateMarker(selectedMarker.id, { ...selectedMarker, description: e.target.value })}
                placeholder="Breve descripción o notas para el estudiante..."
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
