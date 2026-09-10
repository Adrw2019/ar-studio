import React from 'react';
import { X, BookOpen, CheckCircle, Sparkles } from 'lucide-react';

export default function InfoModal({ markerInfo, onClose }) {
  if (!markerInfo) return null;

  return (
    <div className="ar-info-sheet">
      <div className="info-sheet-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={18} color="var(--accent-cyan)" />
          <h3 style={{ margin: 0 }}>{markerInfo.title || 'Información del Objeto 3D'}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="modal-close-btn"
          aria-label="Cerrar ficha informativa"
        >
          <X size={18} />
        </button>
      </div>

      <div className="info-sheet-content">
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="badge-pill" style={{ fontSize: '0.7rem' }}>
            {markerInfo.category || 'Ciencia e Ingeniería'}
          </span>
        </div>

        <p style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          {markerInfo.description}
        </p>

        {markerInfo.details && markerInfo.details.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {markerInfo.details.map((detail, index) => (
              <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem' }}>
                <CheckCircle size={14} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
