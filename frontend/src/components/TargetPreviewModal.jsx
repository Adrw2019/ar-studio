import React from 'react';
import { X, Printer, Layers } from 'lucide-react';
import { resolveAssetPath } from '../utils/paths';

export default function TargetPreviewModal({ isOpen, onClose, markers = [] }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={22} color="var(--accent-cyan)" />
            <h2>Tarjetas de Seguimiento AR</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Apunta la cámara de tu celular o tablet hacia una de estas tarjetas (puedes imprimirlas o abrirlas en otra pantalla):
        </p>

        {markers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
            No hay tarjetas configuradas en este proyecto.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {markers.map((marker, idx) => {
              const targetIdx = marker.target_index ?? marker.targetIndex ?? idx;
              const targetImg = marker.target_image || marker.previewImage;

              return (
                <div
                  key={marker.id || idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '16px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      Tarjeta {targetIdx + 1}: {marker.name}
                    </span>
                    <span className="badge-pill" style={{ fontSize: '0.7rem' }}>
                      Target #{targetIdx}
                    </span>
                  </div>

                  {/* Contenedor visual de la tarjeta con imagen o SVG */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '260px',
                      aspectRatio: '1/1.3',
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      border: '3px solid #0f172a'
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a', fontWeight: 800, fontSize: '0.8rem' }}>
                      <span>AR STUDIO</span>
                      <span>{marker.name?.toUpperCase()}</span>
                    </div>

                    {targetImg ? (
                      <img
                        src={resolveAssetPath(targetImg)}
                        alt={marker.name}
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : marker.name === 'Motor' ? (
                      <svg viewBox="0 0 200 200" width="100%" height="160">
                        <rect width="200" height="200" fill="#ffffff" />
                        <circle cx="100" cy="100" r="85" fill="#0f172a" />
                        <circle cx="100" cy="100" r="65" fill="#ffffff" />
                        <circle cx="100" cy="100" r="45" fill="#0284c7" />
                        <rect x="90" y="25" width="20" height="150" fill="#0f172a" rx="6" />
                        <rect x="25" y="90" width="150" height="20" fill="#0f172a" rx="6" />
                        <circle cx="100" cy="100" r="22" fill="#f59e0b" />
                        <circle cx="100" cy="100" r="8" fill="#ffffff" />
                        <rect x="35" y="35" width="18" height="18" fill="#0f172a" />
                        <polygon points="165,35 150,55 165,55" fill="#0f172a" />
                        <circle cx="155" cy="155" r="10" fill="#0f172a" />
                      </svg>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', gap: '0.5rem' }}>
                        <div style={{ width: '80px', height: '80px', border: '3px dashed #0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>#{targetIdx}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ color: '#0f172a', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>
                      TARJETA EDUCATIVA
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {markers.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={() => window.print()}
          >
            <Printer size={18} />
            <span>Imprimir Tarjetas</span>
          </button>
        )}
      </div>
    </div>
  );
}
