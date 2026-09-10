import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/home.css';
import './styles/ar.css';

// Limpieza automática de Service Workers y cachés residuales de proyectos anteriores en localhost
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('🧹 Service Worker previo eliminado:', registration);
    }
  });
}
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
