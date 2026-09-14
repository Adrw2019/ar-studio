import React, { useState } from 'react';
import { X, Upload, Box, Image, Volume2, Video, Type, Loader2, Sparkles, PlusCircle } from 'lucide-react';
import { apiService } from '../../services/api';

const CONTENT_OPTIONS = [
  {
    type: 'model3d',
    title: 'Modelo 3D',
    desc: 'Objeto tridimensional que aparecerá sobre la tarjeta.',
    icon: Box,
    accept: '.glb,.gltf',
    hint: 'Archivos .glb y .gltf'
  },
  {
    type: 'image',
    title: 'Imagen',
    desc: 'Imagen superpuesta sobre la tarjeta.',
    icon: Image,
    accept: '.png,.jpg,.jpeg,.webp',
    hint: 'Archivos .png, .jpg y .webp'
  },
  {
    type: 'video',
    title: 'Video',
    desc: 'Reproduce un video al reconocerla.',
    icon: Video,
    accept: '.mp4,.webm',
    hint: 'Archivos .mp4 y .webm'
  },
  {
    type: 'audio',
    title: 'Audio',
    desc: 'Reproduce una explicación.',
    icon: Volume2,
    accept: '.mp3,.wav,.ogg',
    hint: 'Archivos .mp3 y .wav'
  },
  {
    type: 'text',
    title: 'Texto',
    desc: 'Muestra información educativa.',
    icon: Type,
    accept: null,
    hint: 'Mensaje didáctico o tarjeta informativa'
  }
];

export default function UploadAssetModal({
  isOpen,
  onClose,
  targetMarkerId,
  projectId,
  onAssetUploaded
}) {
  if (!isOpen) return null;

  const [selectedType, setSelectedType] = useState('model3d');
  const [assetTitle, setAssetTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const activeOption = CONTENT_OPTIONS.find(o => o.type === selectedType) || CONTENT_OPTIONS[0];

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!assetTitle) {
        setAssetTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMessage(null);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (selectedType === 'text') {
      if (!textContent.trim()) {
        setErrorMessage('Por favor escribe el texto educativo.');
        return;
      }

      onAssetUploaded({
        marker_id: targetMarkerId,
        type: 'text',
        file_url: '',
        position_x: 0,
        position_y: 0.2,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 1,
        scale_y: 1,
        scale_z: 1,
        configuration: {
          title: assetTitle || 'Ficha Educativa',
          category: 'Información',
          description: textContent,
          interactive: true
        }
      });
      onClose();
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Por favor selecciona un archivo desde tu dispositivo.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const category = selectedType === 'model3d'
        ? 'models'
        : (selectedType === 'image' ? 'images' : (selectedType === 'video' ? 'video' : 'audio'));

      // Subir archivo al backend -> storageService -> Cloudinary
      const res = await apiService.uploadFile(selectedFile, {
        projectId,
        category
      });

      if (!res?.file_url || (!res.file_url.startsWith('https://') && !res.file_url.startsWith('http://') && !res.file_url.startsWith('/uploads/'))) {
        throw new Error('El servidor no devolvió una URL válida para el archivo.');
      }

      const fileUrl = res.file_url;

      onAssetUploaded({
        marker_id: targetMarkerId,
        type: selectedType,
        file_url: fileUrl,
        position_x: 0,
        position_y: selectedType === 'model3d' ? 0 : 0.1,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 0.75,
        scale_y: 0.75,
        scale_z: 0.75,
        configuration: {
          title: assetTitle || selectedFile.name,
          category: activeOption.title,
          description: `Elemento de tipo ${activeOption.title} para la experiencia AR.`,
          interactive: true
        }
      });

      onClose();
    } catch (err) {
      console.error('[UploadAssetModal] Error al subir archivo:', err);
      setErrorMessage(err.message || 'Error al almacenar el archivo en la nube. Por favor reintenta.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '490px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="var(--accent-cyan)" />
            <h2>Agregar contenido</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
          Elige qué tipo de elemento aparecerá sobre la tarjeta física al enfocarla con la cámara:
        </p>

        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 1. Selector de tipo de contenido */}
          <div className="content-type-grid">
            {CONTENT_OPTIONS.map((option) => {
              const IconComp = option.icon;
              const isSelected = selectedType === option.type;

              return (
                <div
                  key={option.type}
                  className={`content-type-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedType(option.type);
                    setSelectedFile(null);
                    setErrorMessage(null);
                  }}
                >
                  <div className="content-type-icon-box" style={{ background: isSelected ? 'var(--accent-cyan)' : undefined, color: isSelected ? '#050b14' : undefined }}>
                    <IconComp size={18} />
                  </div>
                  <div>
                    <div className="content-type-title">{option.title}</div>
                    <div className="content-type-desc">{option.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Título o nombre del contenido */}
          <div className="form-group">
            <label className="form-label">Nombre del elemento</label>
            <input
              type="text"
              className="form-input"
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder="Ej: Motor Eléctrico, Explicación del circuito, etc."
              required
            />
          </div>

          {/* 3. Entrada según tipo (Archivo o Texto) */}
          {selectedType === 'text' ? (
            <div className="form-group">
              <label className="form-label">Texto educativo que se mostrará</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Escribe la explicación o información educativa que aparecerá sobre la tarjeta..."
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Archivo digital ({activeOption.hint})</label>
              <label
                style={{
                  border: '2px dashed var(--border-glow)',
                  borderRadius: '12px',
                  padding: '1.25rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  background: 'rgba(0, 242, 254, 0.03)'
                }}
              >
                <Upload size={22} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
                  {selectedFile ? selectedFile.name : 'Seleccionar archivo desde tu dispositivo'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {activeOption.hint}
                </span>
                <input
                  type="file"
                  accept={activeOption.accept}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          {errorMessage && (
            <div style={{ color: 'var(--accent-rose)', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isUploading || (selectedType !== 'text' && !selectedFile)}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin-slow" /> : <PlusCircle size={16} />}
              <span>{isUploading ? 'Agregando...' : 'Agregar a la tarjeta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
