import React, { useState, useEffect, useCallback } from 'react';
import { Download, Share, Plus, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { isAppleDevice, isSafari, isStandalone, isIPhone, isIPad } from '../utils/device';

/**
 * AR Studio - Componente de Instalación PWA
 * Detecta la plataforma y muestra las instrucciones apropiadas:
 * - Chrome/Edge: Captura beforeinstallprompt y muestra botón "Instalar"
 * - Safari iOS/iPadOS: Muestra instrucciones manuales
 * - Ya instalado: No muestra nada
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Si ya está en modo standalone, no mostrar nada
  const standalone = isStandalone();

  useEffect(() => {
    if (standalone) {
      setInstalled(true);
      return;
    }

    // Verificar si fue previamente descartado en esta sesión
    const wasDismissed = sessionStorage.getItem('ar-studio-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    // Capturar el evento beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Detectar instalación completada
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [standalone]);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('[InstallPrompt] Error al mostrar prompt:', err);
        setShowInstructions(true);
      }
    } else {
      setShowInstructions((prev) => !prev);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem('ar-studio-install-dismissed', 'true');
  }, []);

  // No mostrar si ya está instalado o fue descartado
  if (installed || dismissed) return null;

  const isApple = isAppleDevice();
  const deviceLabel = isIPhone() ? 'iPhone' : isIPad() ? 'iPad' : 'dispositivo';

  return (
    <div style={{
      background: 'rgba(13, 18, 29, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(0, 242, 254, 0.25)',
      borderRadius: '16px',
      padding: '1rem 1.15rem',
      marginTop: '0.75rem',
      marginBottom: '0.75rem',
      width: '100%',
      maxWidth: '520px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.65rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(0, 242, 254, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Download size={16} color="#00f2fe" />
          </div>
          <span style={{
            fontSize: '0.92rem',
            fontWeight: 700,
            color: '#ffffff'
          }}>
            Instalar AR Studio
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Botón Principal de Instalación */}
      <button
        type="button"
        onClick={handleInstallClick}
        style={{
          width: '100%',
          padding: '0.65rem 1rem',
          background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
          color: '#050b14',
          border: 'none',
          borderRadius: '12px',
          fontSize: '0.88rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 16px rgba(0, 242, 254, 0.25)'
        }}
      >
        <Download size={17} />
        <span>{deferredPrompt ? 'Instalar AR Studio' : `Instalar en ${isApple ? deviceLabel : 'dispositivo'}`}</span>
      </button>

      {/* Instrucciones Manuales (cuando se despliegan o en Apple/Navegadores sin evento directo) */}
      {showInstructions && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {isApple ? (
            <>
              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                Para instalar AR Studio en tu <strong style={{ color: '#ffffff' }}>{deviceLabel}</strong> mediante <strong style={{ color: '#ffffff' }}>Safari</strong>:
              </p>

              {/* Paso 1 */}
              <div style={stepStyle}>
                <div style={stepNumberStyle}>1</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span>Pulsa</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    background: 'rgba(0, 122, 255, 0.15)',
                    border: '1px solid rgba(0, 122, 255, 0.3)',
                    borderRadius: '6px',
                    padding: '0.15rem 0.4rem',
                    fontSize: '0.78rem',
                    color: '#007AFF',
                    fontWeight: 600
                  }}>
                    <Share size={12} />
                    Compartir
                  </span>
                </div>
              </div>

              {/* Paso 2 */}
              <div style={stepStyle}>
                <div style={stepNumberStyle}>2</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span>Selecciona</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.15rem 0.4rem',
                    fontSize: '0.78rem',
                    color: '#ffffff',
                    fontWeight: 600
                  }}>
                    <Plus size={12} />
                    Añadir a pantalla de inicio
                  </span>
                </div>
              </div>

              {/* Paso 3 */}
              <div style={stepStyle}>
                <div style={stepNumberStyle}>3</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Pulsa</span>
                  <strong style={{ color: '#007AFF' }}>"Añadir"</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                Para instalar AR Studio en tu navegador <strong style={{ color: '#ffffff' }}>Chrome / Android</strong>:
              </p>

              <div style={stepStyle}>
                <div style={stepNumberStyle}>1</div>
                <span>Toca el menú de tres puntos (<strong>⋮</strong>) en la esquina superior derecha</span>
              </div>

              <div style={stepStyle}>
                <div style={stepNumberStyle}>2</div>
                <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong></span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Estilos para los pasos de instrucción
const stepStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '0.82rem',
  color: 'var(--text-primary)',
  padding: '0.4rem 0.5rem',
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '10px',
  border: '1px solid var(--border-subtle)'
};

const stepNumberStyle = {
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  background: 'rgba(0, 242, 254, 0.15)',
  color: '#00f2fe',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.72rem',
  fontWeight: 700,
  flexShrink: 0
};
