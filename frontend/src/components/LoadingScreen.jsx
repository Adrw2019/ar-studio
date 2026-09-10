import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, Play, RefreshCw, AlertCircle } from 'lucide-react';

export default function LoadingScreen({ message = 'Iniciando cámara y motor de Realidad Aumentada...' }) {
  const [showTapHint, setShowTapHint] = useState(false);

  useEffect(() => {
    // Si tras 3 segundos no ha iniciado, mostrar botón táctil para desbloquear autoplay en móviles
    const timer = setTimeout(() => {
      setShowTapHint(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualActivate = (e) => {
    if (e) e.stopPropagation();
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
      v.muted = true;
      v.playsInline = true;
      v.play().catch((err) => console.warn('[LoadingScreen] Play manual:', err));
    });
  };

  return (
    <div className="ar-loading-overlay">
      <div className="loading-spinner-ring" />
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
          <Camera size={20} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>
            AR Studio
          </span>
          <Sparkles size={16} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '300px' }}>
          {message}
        </p>
      </div>

      {showTapHint ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.4rem',
              fontSize: '0.95rem',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)',
              animation: 'pulse 1.8s infinite'
            }}
            onClick={handleManualActivate}
          >
            <Play size={18} fill="#050b14" />
            <span>Toca aquí para activar la cámara</span>
          </button>
          
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px', lineHeight: '1.3' }}>
            Si tu celular bloqueó el video automático, toca el botón de arriba para conceder acceso.
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', marginTop: '0.25rem' }}
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} />
            <span>Recargar página</span>
          </button>
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Asegúrate de permitir el acceso a la cámara cuando el navegador lo solicite.
        </div>
      )}
    </div>
  );
}
