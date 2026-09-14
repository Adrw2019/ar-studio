import React, { useRef } from 'react';
import { Layers, Plus, Box, Image, Volume2, Video, Type, Trash2, Zap, Upload, HelpCircle, RefreshCw, CreditCard, Sparkles } from 'lucide-react';
import { apiService } from '../../services/api';

export default function ElementsPanel({
  markers = [],
  assets = [],
  interactions = [],
  selectedMarkerId,
  selectedAssetId,
  onSelectMarker,
  onSelectAsset,
  onAddMarker,
  onDeleteMarker,
  onUpdateMarker,
  onOpenUploadModal,
  onOpenRulesModal
}) {
  const fileInputRefs = useRef({});

  const handleTriggerFileInput = (markerId) => {
    if (fileInputRefs.current[markerId]) {
      fileInputRefs.current[markerId].click();
    }
  };

  const handleCardImageChange = async (e, markerId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Mostrar miniatura inmediatamente usando Blob URL local
    const localUrl = URL.createObjectURL(file);
    const targetMarker = markers.find(m => m.id === markerId);

    if (targetMarker && onUpdateMarker) {
      onUpdateMarker(markerId, {
        ...targetMarker,
        target_image: localUrl
      });
    }

    // 2. Intentar guardar en backend /uploads si está disponible
    try {
      const res = await apiService.uploadFile(file);
      if (res?.file_url && targetMarker && onUpdateMarker) {
        onUpdateMarker(markerId, {
          ...targetMarker,
          target_image: res.file_url
        });
      }
    } catch (err) {
      console.warn('Subida remota no disponible; usando imagen local:', err.message);
    }
  };

  return (
    <aside className="editor-panel-left">
      {/* Header del Panel */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} color="var(--accent-cyan)" />
          <h3>Mi Proyecto</h3>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', minHeight: '30px' }}
          onClick={onAddMarker}
          title="Agregar otra tarjeta física a la experiencia"
        >
          <Plus size={14} />
          <span>Tarjeta</span>
        </button>
      </div>

      <div className="panel-content">
        {/* Lista de Tarjetas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {markers.map((marker, index) => {
            const isMarkerSelected = marker.id === selectedMarkerId;
            const markerAssets = assets.filter(a => a.marker_id === marker.id);
            const hasImage = Boolean(marker.target_image);

            return (
              <div
                key={marker.id}
                className={`marker-card-tree-item ${isMarkerSelected ? 'selected' : ''}`}
                onClick={() => onSelectMarker(marker.id)}
              >
                {/* 1. Header de la Tarjeta */}
                <div className="marker-tree-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(0, 242, 254, 0.15)',
                        color: 'var(--accent-cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}
                    >
                      {index + 1}
                    </div>
                    <span className="marker-tree-name">{marker.name || `Tarjeta ${index + 1}`}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {markers.length > 1 && (
                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMarker(marker.id);
                        }}
                        title="Eliminar esta tarjeta"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Sección: TARJETA FÍSICA (Imagen que reconoce la cámara) */}
                <div className="card-target-box" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CreditCard size={13} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Imagen de la tarjeta
                      </span>
                      <button
                        type="button"
                        className="help-icon-btn"
                        aria-label="Ayuda sobre imagen de la tarjeta"
                      >
                        ?
                        <span className="tooltip-box">
                          Usa una imagen clara y con detalles. Esta imagen será reconocida por la cámara.
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="card-target-preview-row">
                    {hasImage ? (
                      <img
                        src={marker.target_image}
                        alt="Miniatura de la tarjeta física"
                        className="card-target-thumb"
                        onError={(e) => {
                          // Fallback si la ruta de la imagen falla
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="card-target-empty-icon">
                        <Image size={20} />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minHeight: '30px', alignSelf: 'flex-start' }}
                        onClick={() => handleTriggerFileInput(marker.id)}
                      >
                        {hasImage ? <RefreshCw size={12} /> : <Upload size={12} />}
                        <span>{hasImage ? 'Cambiar imagen' : 'Subir imagen'}</span>
                      </button>
                      <span className="card-target-help-text">
                        Esta es la imagen física que la cámara reconocerá.
                      </span>
                    </div>

                    {/* Input invisible para selección de archivo JPG, PNG, WEBP */}
                    <input
                      ref={(el) => (fileInputRefs.current[marker.id] = el)}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleCardImageChange(e, marker.id)}
                    />
                  </div>
                </div>

                {/* 3. Sección: CONTENIDO DIGITAL (Lo que aparece en Realidad Aumentada) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Contenido digital:
                    </span>
                    <button
                      type="button"
                      className="help-icon-btn"
                      aria-label="Ayuda sobre contenido digital"
                    >
                      ?
                      <span className="tooltip-box">
                        Objetos, sonidos o textos que aparecerán flotando sobre la tarjeta física al enfocarla.
                      </span>
                    </button>
                  </div>

                  {markerAssets.map((asset) => {
                    const isAssetSelected = asset.id === selectedAssetId;
                    let AssetIcon = Box;
                    let typeLabel = 'Modelo 3D';
                    if (asset.type === 'image') { AssetIcon = Image; typeLabel = 'Imagen'; }
                    if (asset.type === 'audio') { AssetIcon = Volume2; typeLabel = 'Audio'; }
                    if (asset.type === 'video') { AssetIcon = Video; typeLabel = 'Video'; }
                    if (asset.type === 'text') { AssetIcon = Type; typeLabel = 'Texto'; }

                    const displayName = asset.configuration?.title ||
                                        (asset.file_url ? asset.file_url.split('/').pop() : typeLabel);

                    return (
                      <div
                        key={asset.id}
                        className={`asset-sub-item ${isAssetSelected ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset(asset.id, marker.id);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                          <AssetIcon size={14} color={isAssetSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <strong>{typeLabel}:</strong> {displayName}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Botón para agregar contenido digital */}
                  <button
                    type="button"
                    style={{
                      background: 'rgba(0, 242, 254, 0.05)',
                      border: '1px dashed var(--border-glow)',
                      color: 'var(--accent-cyan)',
                      borderRadius: '8px',
                      padding: '0.45rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      marginTop: '0.35rem',
                      transition: 'background var(--transition-fast)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenUploadModal(marker.id);
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Agregar contenido</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Botón para agregar otra tarjeta física */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.82rem', padding: '0.55rem', borderStyle: 'dashed' }}
            onClick={onAddMarker}
          >
            <Plus size={15} />
            <span>+ Agregar otra tarjeta</span>
          </button>
        </div>

        {/* Sección de Combinar Tarjetas (Reglas Multi-Tarjeta) */}
        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Combinar tarjetas
              </span>
              <button
                type="button"
                className="help-icon-btn"
                aria-label="Ayuda sobre combinar tarjetas"
              >
                ?
                <span className="tooltip-box">
                  Haz que ocurra algo especial cuando la cámara vea dos tarjetas juntas en la mesa.
                </span>
              </button>
            </div>

            <button
              type="button"
              className="badge-pill"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={onOpenRulesModal}
            >
              <Zap size={11} style={{ display: 'inline', marginRight: '3px' }} />
              {interactions.length} {interactions.length === 1 ? 'Regla' : 'Reglas'}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.55rem' }}
            onClick={onOpenRulesModal}
          >
            <Zap size={14} color="var(--accent-amber)" />
            <span>Crear interacción entre tarjetas</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
