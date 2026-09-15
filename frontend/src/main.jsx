import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/home.css';
import './styles/ar.css';

// ============================================================
// Registro del Service Worker para PWA + Offline
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Determinar la ruta base del SW según el entorno
    const swUrl = `${import.meta.env.BASE_URL || '/'}sw.js`;

    navigator.serviceWorker
      .register(swUrl, { scope: import.meta.env.BASE_URL || '/' })
      .then((registration) => {
        console.log('[AR Studio] Service Worker registrado:', registration.scope);

        // Cuando hay una actualización disponible, notificar al nuevo SW que tome el control
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[AR Studio] Service Worker actualizado y activo.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[AR Studio] Error al registrar Service Worker:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
