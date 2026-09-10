import React from 'react';
import { Layers, Plus, Box, Image, Volume2, Video, Type, Trash2, Zap, Upload } from 'lucide-react';

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
  onOpenUploadModal,
  onOpenRulesModal
}) {
  return (
    <aside className="editor-panel-left">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} color="var(--accent-cyan)" />
          <h3>Elementos</h3>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', minHeight: '30px' }}
          onClick={onAddMarker}
          title="Agregar nueva tarjeta física"
        >
          <Plus size={14} />
          <span>Tarjeta</span>
        </button>
      </div>

      <div className="panel-content">
        {/* Lista de Tarjetas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {markers.map((marker, index) => {
            const isMarkerSelected = marker.id === selectedMarkerId;
            const markerAssets = assets.filter(a => a.marker_id === marker.id);

            return (
              <div
                key={marker.id}
                className={`marker-card-tree-item ${isMarkerSelected ? 'selected' : ''}`}
                onClick={() => onSelectMarker(marker.id)}
              >
                {/* Header de la Tarjeta */}
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
                        fontSize: '0.7rem',
                        fontWeight: 800
                      }}
                    >
                      {index + 1}
                    </div>
                    <span className="marker-tree-name">{marker.name}</span>
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
                        title="Eliminar tarjeta"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-lista de Assets asociados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                  {markerAssets.map((asset) => {
                    const isAssetSelected = asset.id === selectedAssetId;
                    let AssetIcon = Box;
                    if (asset.type === 'image') AssetIcon = Image;
                    if (asset.type === 'audio') AssetIcon = Volume2;
                    if (asset.type === 'video') AssetIcon = Video;
                    if (asset.type === 'text') AssetIcon = Type;

                    return (
                      <div
                        key={asset.id}
                        className={`asset-sub-item ${isAssetSelected ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset(asset.id, marker.id);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AssetIcon size={14} />
                          <span>{asset.configuration?.title || 'Modelo 3D'}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {asset.type}
                        </span>
                      </div>
                    );
                  })}

                  {/* Botón para asociar asset/modelo a esta tarjeta */}
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px dashed var(--border-glass)',
                      color: 'var(--text-secondary)',
                      borderRadius: '8px',
                      padding: '0.35rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                      marginTop: '0.2rem'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenUploadModal(marker.id);
                    }}
                  >
                    <Upload size={12} />
                    <span>Subir Modelo / Asset</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sección de Reglas de Interacción Multi-Tarjeta */}
        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Interacciones
            </span>
            <button
              type="button"
              className="badge-pill"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={onOpenRulesModal}
            >
              <Zap size={11} style={{ display: 'inline', marginRight: '3px' }} />
              {interactions.length} Reglas
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
            onClick={onOpenRulesModal}
          >
            <Zap size={14} color="var(--accent-amber)" />
            <span>Configurar Reglas Multi-Tarjeta</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
