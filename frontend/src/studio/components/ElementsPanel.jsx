import React, { useRef, useState } from 'react';
import { Layers, Plus, Box, Image, Volume2, Video, Type, Trash2, Zap, Upload, HelpCircle, RefreshCw, CreditCard, Sparkles, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

export default function ElementsPanel({
  className = '',
  markers = [],
  assets = [],
  interactions = [],
  selectedMarkerId,
  selectedAssetId,
  projectId,
  onSelectMarker,
  onSelectAsset,
  onAddMarker,
  onDeleteMarker,
  onUpdateMarker,
  onDeleteAsset,
  onOpenUploadModal,
  onOpenRulesModal
}) {
  const fileInputRefs = useRef({});
  const [cardPreviews, setCardPreviews] = useState({});
  const [uploadingMarkerId, setUploadingMarkerId] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const handleTriggerFileInput = (markerId) => {
    if (fileInputRefs.current[markerId]) {
      fileInputRefs.current[markerId].click();
    }
  };

  const handleCardImageChange = async (e, markerId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Permitir volver a seleccionar el mismo archivo si es necesario
    e.target.value = '';

    // 1. Crear Blob URL temporal ÚNICAMENTE para previsualización local mientras se sube
    const localBlobUrl = URL.createObjectURL(file);
    setCardPreviews(prev => ({ ...prev, [markerId]: localBlobUrl }));
    setUploadingMarkerId(markerId);

    try {
      // 2. Subir inmediatamente el File al backend -> Cloudinary
      const res = await apiService.uploadFile(file, {
        projectId,
        category: 'cards'
      });

      if (!res?.file_url || (!res.file_url.startsWith('https://') && !res.file_url.startsWith('http://'))) {
        throw new Error('El servidor no devolvió una URL válida de almacenamiento.');
      }

      // 3. Actualizar marker.target_image exclusivamente con la secure_url de Cloudinary
      const targetMarker = markers.find(m => m.id === markerId);
      if (targetMarker && onUpdateMarker) {
        onUpdateMarker(markerId, {
          ...targetMarker,
          target_image: res.file_url
        });
      }
    } catch (err) {
      console.error('[ElementsPanel] Error al subir imagen de tarjeta a Cloudinary:', err);
      alert(`No se pudo almacenar la imagen de la tarjeta: ${err.message || 'Error desconocido'}`);
    } finally {
      // 4. Revocar el blob temporal y limpiar preview temporal
      URL.revokeObjectURL(localBlobUrl);
      setCardPreviews(prev => {
        const next = { ...prev };
        delete next[markerId];
        return next;
      });
      setUploadingMarkerId(null);
    }
  };

  return (
    <aside className={`editor-panel-left ${className}`.trim()}>
      {/* Header del Panel */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} color="var(--accent-cyan)" />
          <h3>Mi Proyecto</h3>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: '36px' }}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CreditCard size={13} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Imagen de la tarjeta
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        (Target #{marker.target_index ?? index})
                      </span>
                      <button
                        type="button"
                        className="help-icon-btn"
                        aria-label="Ayuda sobre imagen de la tarjeta"
                      >
                        ?
                        <span className="tooltip-box">
                          Usa una imagen clara, contrastada y con detalles. Esta imagen será compilada y reconocida por la cámara.
                        </span>
                      </button>
                    </div>

                    {marker.quality && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '6px',
                          backgroundColor: marker.quality === 'Buena' ? 'rgba(16, 185, 129, 0.15)' : marker.quality === 'Media' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: marker.quality === 'Buena' ? '#10b981' : marker.quality === 'Media' ? '#f59e0b' : '#f43f5e',
                          border: `1px solid ${marker.quality === 'Buena' ? '#10b98144' : marker.quality === 'Media' ? '#f59e0b44' : '#f43f5e44'}`
                        }}
                        title={`Puntuación de seguimiento: ${marker.quality_score || 0}%`}
                      >
                        Calidad: {marker.quality}
                      </span>
                    )}
                  </div>

                  <div className="card-target-preview-row">
                    {hasImage ? (
                      <img
                        src={cardPreviews[marker.id] || marker.target_image}
                        alt="Miniatura de la tarjeta física"
                        className="card-target-thumb"
                        onError={(e) => {
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
                        disabled={uploadingMarkerId === marker.id}
                        onClick={() => handleTriggerFileInput(marker.id)}
                      >
                        {uploadingMarkerId === marker.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Subiendo...</span>
                          </>
                        ) : hasImage ? (
                          <>
                            <RefreshCw size={12} />
                            <span>Cambiar imagen</span>
                          </>
                        ) : (
                          <>
                            <Upload size={12} />
                            <span>Subir imagen</span>
                          </>
                        )}
                      </button>
                      <span className="card-target-help-text">
                        {uploadingMarkerId === marker.id
                          ? 'Almacenando imagen en Cloudinary...'
                          : 'Esta es la imagen física que la cámara reconocerá.'}
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

                  {markerAssets.length === 0 ? (
                    <div
                      style={{
                        padding: '0.65rem 0.5rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontStyle: 'italic',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px',
                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                        margin: '0.2rem 0'
                      }}
                    >
                      Aún no has agregado contenido
                    </div>
                  ) : (
                    markerAssets.map((asset) => {
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
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.45rem',
                            padding: '0.45rem 0.6rem'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAsset(asset.id, marker.id);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', flex: 1 }}>
                            <AssetIcon size={14} color={isAssetSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem' }}>
                              <strong>{typeLabel}:</strong> {displayName}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="asset-delete-btn"
                            title={`Eliminar ${typeLabel}: ${displayName}`}
                            aria-label={`Eliminar contenido ${displayName}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetToDelete(asset);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '3px 5px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'color var(--transition-fast), background var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#f43f5e';
                              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-muted)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}

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

      {/* Modal de Confirmación para Eliminar Contenido Digital */}
      {assetToDelete && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 11, 20, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setAssetToDelete(null)}
        >
          <div
            className="modal-card"
            style={{
              background: '#0d121d',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(244, 63, 94, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-asset-title"
          >
            {/* Ícono de advertencia */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f43f5e'
                }}
              >
                <Trash2 size={26} />
              </div>
            </div>

            {/* Título y texto explicativo */}
            <div>
              <h3 id="delete-asset-title" style={{ margin: '0 0 0.4rem 0', color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>
                ¿Eliminar este contenido?
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Este contenido se eliminará del proyecto.
              </p>
            </div>

            {/* Caja informativa con el nombre del contenido */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Nombre:
              </span>
              <span
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace'
                }}
              >
                {assetToDelete.configuration?.title ||
                 (assetToDelete.file_url ? assetToDelete.file_url.split('/').pop() : assetToDelete.type || 'Contenido')}
              </span>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                onClick={() => setAssetToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  backgroundColor: '#e11d48',
                  borderColor: '#e11d48',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (onDeleteAsset) {
                    onDeleteAsset(assetToDelete.id);
                  }
                  setAssetToDelete(null);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
