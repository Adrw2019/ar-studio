import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Sparkles, CheckCircle2, Cpu } from 'lucide-react';
import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';
import Header from '../components/Header';

export default function MarkerCompiler() {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compiledBlobUrl, setCompiledBlobUrl] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setCompiledBlobUrl(null);
      setProgress(0);
      setStatusMessage('');
    }
  };

  const handleCompile = async () => {
    if (selectedFiles.length === 0) return;

    setIsCompiling(true);
    setProgress(0);
    setStatusMessage('Cargando imágenes de tarjetas...');

    try {
      const compiler = new Compiler();
      const images = [];

      for (const file of selectedFiles) {
        const img = await loadImage(file);
        images.push(img);
      }

      setStatusMessage('Extrayendo puntos de características ópticas con WebGL...');
      
      const data = await compiler.compileImageTargets(images, (progressPercent) => {
        setProgress(Math.round(progressPercent));
      });

      setStatusMessage('Exportando archivo binario .mind...');
      const exportedBuffer = compiler.exportData();
      
      const blob = new Blob([exportedBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setCompiledBlobUrl(url);
      setStatusMessage('¡Compilación completada exitosamente!');
    } catch (err) {
      console.error('Error durante la compilación:', err);
      setStatusMessage(`Error en la compilación: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const loadImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={() => navigate('/')}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Compilador de Marcadores</h2>
        <div style={{ width: '48px' }} />
      </header>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Genera archivos <code>.mind</code> para MindAR directamente desde tus imágenes JPG o PNG con aceleración GPU en tu navegador.
      </p>

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Upload Zone */}
        <label
          style={{
            border: '2px dashed var(--border-glow)',
            borderRadius: '16px',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            background: 'rgba(0, 242, 254, 0.03)'
          }}
        >
          <Upload size={32} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            Seleccionar imágenes de tarjetas (PNG / JPG)
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Puedes seleccionar una o múltiples imágenes a la vez
          </span>
          <input
            type="file"
            multiple
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Imágenes seleccionadas ({selectedFiles.length}):
            </div>
            {selectedFiles.map((f, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}
              >
                <span>Tarjeta #{i}: {f.name}</span>
                <span style={{ color: 'var(--accent-cyan)' }}>{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}

        {/* Compile Button */}
        <button
          type="button"
          className="btn btn-primary"
          disabled={selectedFiles.length === 0 || isCompiling}
          onClick={handleCompile}
          style={{ opacity: selectedFiles.length === 0 || isCompiling ? 0.6 : 1 }}
        >
          <Cpu size={18} />
          <span>{isCompiling ? `Compilando (${progress}%)...` : 'Compilar archivo .mind'}</span>
        </button>

        {/* Progress Bar */}
        {isCompiling && (
          <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
                height: '100%',
                transition: 'width 200ms ease'
              }}
            />
          </div>
        )}

        {statusMessage && (
          <div style={{ fontSize: '0.85rem', color: compiledBlobUrl ? 'var(--accent-green)' : 'var(--text-secondary)', textAlign: 'center' }}>
            {statusMessage}
          </div>
        )}

        {/* Download Button */}
        {compiledBlobUrl && (
          <a
            href={compiledBlobUrl}
            download="targets.mind"
            className="btn btn-secondary"
            style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)', textDecoration: 'none' }}
          >
            <Download size={18} />
            <span>Descargar targets.mind</span>
          </a>
        )}
      </div>
    </div>
  );
}
