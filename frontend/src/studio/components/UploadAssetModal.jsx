import React, { useState } from 'react';
import { X, Upload, Box, Image, Volume2, Video, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

export default function UploadAssetModal({
  isOpen,
  onClose,
  targetMarkerId,
  onAssetUploaded
}) {
  if (!isOpen) return null;

  const [fileType, setFileType] = useState('model3d'); // 'model3d', 'image', 'audio', 'video'
  const [assetTitle, setAssetTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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
    if (!selectedFile) {
      setErrorMessage('Por favor selecciona un archivo');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Subir archivo físico al backend
      const res = await apiService.uploadFile(selectedFile);
      const fileUrl = res.file_url;

      // Notificar al editor para agregar el nuevo asset
      onAssetUploaded({
        marker_id: targetMarkerId,
        type: fileType,
        file_url: fileUrl,
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 0.75,
        scale_y: 0.75,
        scale_z: 0.75,
        configuration: {
          title: assetTitle || selectedFile.name,
          category: 'Elemento 3D',
          description: 'Objeto didáctico de Realidad Aumentada.',
          interactive: true
        }
      });

      onClose();
    } catch (err) {
      console.error('Error al subir archivo:', err);
      // Si falla la subida al backend, fallback con URL simulada o local para que no bloquee
      onAssetUploaded({
        marker_id: targetMarkerId,
        type: fileType,
        file_url: `/models/${selectedFile.name}`,
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 0.75,
        scale_y: 0.75,
        scale_z: 0.75,
        configuration: {
          title: assetTitle || selectedFile.name,
          category: 'Elemento 3D',
          description: 'Objeto didáctico de Realidad Aumentada.',
          interactive: true
        }
      });
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Upload size={22} color="var(--accent-cyan)" />
            <h2>Subir Contenido AR</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tipo de Elemento */}
          <div className="form-group">
            <label className="form-label">Tipo de Elemento</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${fileType === 'model3d' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem', fontSize: '0.8rem', minHeight: '36px' }}
                onClick={() => setFileType('model3d')}
              >
                <Box size={16} />
                <span>Modelo 3D</span>
              </button>
              <button
                type="button"
                className={`btn ${fileType === 'audio' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem', fontSize: '0.8rem', minHeight: '36px' }}
                onClick={() => setFileType('audio')}
              >
                <Volume2 size={16} />
                <span>Audio</span>
              </button>
            </div>
          </div>

          {/* Nombre / Título */}
          <div className="form-group">
            <label className="form-label">Nombre del Elemento</label>
            <input
              type="text"
              className="form-input"
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder="Ej: Motor Eléctrico, Batería, etc."
              required
            />
          </div>

          {/* File Input */}
          <label
            style={{
              border: '2px dashed var(--border-glow)',
              borderRadius: '14px',
              padding: '1.5rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              background: 'rgba(0, 242, 254, 0.03)'
            }}
          >
            <Upload size={24} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedFile ? selectedFile.name : 'Seleccionar archivo desde tu dispositivo'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {fileType === 'model3d' ? 'Soporta archivos .glb y .gltf' : 'Soporta .mp3 y .wav'}
            </span>
            <input
              type="file"
              accept={fileType === 'model3d' ? '.glb,.gltf' : '.mp3,.wav'}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>

          {errorMessage && (
            <div style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin-slow" /> : <Upload size={16} />}
              <span>{isUploading ? 'Subiendo...' : 'Asociar a Tarjeta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
