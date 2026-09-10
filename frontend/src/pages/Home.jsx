import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, FolderKanban, Image, Sparkles, Smartphone, Layers, Cpu, Compass, Sliders, Globe, QrCode } from 'lucide-react';
import Header from '../components/Header';
import TargetPreviewModal from '../components/TargetPreviewModal';

export default function Home() {
  const navigate = useNavigate();
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  return (
    <div className="home-container">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        {/* Hologram / AR Scan Card Simulation */}
        <div className="hero-visual-card">
          <div className="card-scan-beam" />
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <Layers size={48} color="var(--accent-cyan)" className="animate-float" />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.5rem', letterSpacing: '1px' }}>
              CREADOR & VISOR AR
            </div>
          </div>
        </div>

        <h1 className="hero-title">
          Plataforma de <span className="text-gradient">Realidad Aumentada</span>
        </h1>

        <p className="hero-subtitle">
          Crea, edita, publica y ejecuta proyectos educativos interactivos sobre tarjetas físicas impresas. Todo desde el navegador en PC, tablet o celular.
        </p>

        {/* Action Buttons */}
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/studio')}
          >
            <Sliders size={20} />
            <span>Abrir AR Studio Editor</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/ar/demo')}
          >
            <Play size={18} fill="currentColor" />
            <span>Ejecutar AR Player</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderStyle: 'dashed', borderColor: 'var(--accent-cyan)' }}
            onClick={() => setIsTargetModalOpen(true)}
          >
            <Image size={18} color="var(--accent-cyan)" />
            <span>Ver Tarjetas Imprimibles</span>
          </button>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="features-grid">
        <div className="feature-item">
          <div className="feature-icon-box">
            <Sliders size={22} />
          </div>
          <div>
            <h3>Editor 3D Universal</h3>
            <p>Diseña experiencias en PC o celular con vista previa 3D en tiempo real y sin cámara obligatoria.</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-box">
            <Globe size={22} />
          </div>
          <div>
            <h3>Publicación y Códigos QR</h3>
            <p>Genera enlaces públicos únicos y códigos QR para que los alumnos abran la experiencia al instante.</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-box">
            <Smartphone size={22} />
          </div>
          <div>
            <h3>AR Player sin Apps</h3>
            <p>Reconocimiento de imágenes con MindAR directamente en Safari y Chrome móvil.</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-box">
            <Compass size={22} />
          </div>
          <div>
            <h3>Multi-Tarjeta Interactiva</h3>
            <p>Detecta combinaciones de tarjetas simultáneas y desencadena animaciones y circuitos dinámicos.</p>
          </div>
        </div>
      </section>

      {/* Modal de visualización de tarjetas */}
      <TargetPreviewModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
      />
    </div>
  );
}
