import React from 'react';
import { X, Download, Printer, Layers } from 'lucide-react';
import { demoMarkers } from '../ar/config';

export default function TargetPreviewModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={22} color="var(--accent-cyan)" />
            <h2>Tarjetas de Prueba AR</h2>
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
          Apunta la cámara de tu celular o tablet hacia una de estas tarjetas (puedes imprimirlas o abrirlas en la pantalla de tu computadora u otro teléfono):
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {demoMarkers.map((marker) => (
            <div
              key={marker.id}
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
                  Tarjeta {marker.targetIndex + 1}: {marker.name}
                </span>
                <span className="badge-pill" style={{ fontSize: '0.7rem' }}>
                  Target #{marker.targetIndex}
                </span>
              </div>

              {/* Contenedor visual de la tarjeta con SVG/Canvas de alta legibilidad para tracking */}
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
                  <span>{marker.name.toUpperCase()}</span>
                </div>

                {/* Gráfico de alto contraste para reconocimiento óptico de MindAR */}
                {marker.name === 'Motor' ? (
                  <svg viewBox="0 0 200 200" width="100%" height="160">
                    <rect width="200" height="200" fill="#ffffff" />
                    <circle cx="100" cy="100" r="85" fill="#0f172a" />
                    <circle cx="100" cy="100" r="65" fill="#ffffff" />
                    <circle cx="100" cy="100" r="45" fill="#0284c7" />
                    {/* Patrón de rotor asimétrico de alto contraste */}
                    <rect x="90" y="25" width="20" height="150" fill="#0f172a" rx="6" />
                    <rect x="25" y="90" width="150" height="20" fill="#0f172a" rx="6" />
                    <circle cx="100" cy="100" r="22" fill="#f59e0b" />
                    <circle cx="100" cy="100" r="8" fill="#ffffff" />
                    {/* Marcadores de esquinas asimétricos */}
                    <rect x="35" y="35" width="18" height="18" fill="#0f172a" />
                    <polygon points="165,35 150,55 165,55" fill="#0f172a" />
                    <circle cx="155" cy="155" r="10" fill="#0f172a" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 200 200" width="100%" height="160">
                    <rect width="200" height="200" fill="#ffffff" />
                    <polygon points="100,15 185,100 100,185 15,100" fill="#0f172a" />
                    <polygon points="100,35 165,100 100,165 35,100" fill="#10b981" />
                    <polygon points="100,55 145,100 100,145 55,100" fill="#ffffff" />
                    {/* Rayo de energía central */}
                    <path d="M105 60 L85 105 L105 105 L95 145 L125 95 L105 95 Z" fill="#f59e0b" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="50" cy="50" r="8" fill="#0f172a" />
                    <rect x="145" y="42" width="15" height="15" fill="#0f172a" />
                  </svg>
                )}

                <div style={{ color: '#0f172a', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>
                  TARJETA EDUCATIVA
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          onClick={() => window.print()}
        >
          <Printer size={18} />
          <span>Imprimir Tarjetas</span>
        </button>
      </div>
    </div>
  );
}
