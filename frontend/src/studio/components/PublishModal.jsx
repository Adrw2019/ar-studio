import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Globe, Copy, Check, Download, ExternalLink, Sparkles } from 'lucide-react';

export default function PublishModal({
  isOpen,
  onClose,
  project,
  onUpdateStatus,
  onUpdateSlug
}) {
  if (!isOpen || !project) return null;

  const [copied, setCopied] = useState(false);
  const [localSlug, setLocalSlug] = useState(project.slug || '');
  const [isPublished, setIsPublished] = useState(project.status === 'published');
  const qrRef = useRef(null);

  // Determinar URL pública completa
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const publicUrl = `${origin}/ar/${localSlug || project.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 40, 40, 520, 520);

      const a = document.createElement('a');
      a.download = `qr-${localSlug || 'ar-project'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const handleTogglePublish = () => {
    const nextStatus = isPublished ? 'draft' : 'published';
    setIsPublished(!isPublished);
    onUpdateStatus(nextStatus);
  };

  const handleSaveSlug = () => {
    const sanitized = localSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setLocalSlug(sanitized);
    onUpdateSlug(sanitized);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Globe size={22} color="var(--accent-cyan)" />
            <h2>Publicar Experiencia</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Estado del Proyecto */}
        <div
          style={{
            background: isPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${isPublished ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
            borderRadius: '16px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isPublished ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              {isPublished ? '● Proyecto Publicado' : '○ Estado Borrador'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isPublished ? 'Cualquier persona con el enlace o QR puede ejecutar la experiencia AR.' : 'Solo visible en el editor hasta ser publicado.'}
            </div>
          </div>

          <button
            type="button"
            className={`btn ${isPublished ? 'btn-secondary' : 'btn-primary'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', minHeight: '34px' }}
            onClick={handleTogglePublish}
          >
            {isPublished ? 'Despublicar' : 'Publicar Ahora'}
          </button>
        </div>

        {/* Slug & Enlace */}
        <div className="form-group">
          <label className="form-label">Identificador de URL (Slug)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              value={localSlug}
              onChange={(e) => setLocalSlug(e.target.value)}
              onBlur={handleSaveSlug}
              placeholder="nombre-del-proyecto"
            />
          </div>
        </div>

        {/* QR Code & URL Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
          ref={qrRef}
        >
          <QRCodeSVG
            value={publicUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#090d16"
            level="Q"
            includeMargin={false}
          />
          <div style={{ textAlign: 'center', color: '#090d16' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>ESCANEAR CON CELULAR</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>
              {publicUrl}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
            <span>{copied ? '¡Copiado!' : 'Copiar URL'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadQR}
          >
            <Download size={16} />
            <span>Descargar QR</span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => window.open(publicUrl, '_blank')}
        >
          <ExternalLink size={16} />
          <span>Abrir Experiencia AR</span>
        </button>
      </div>
    </div>
  );
}
