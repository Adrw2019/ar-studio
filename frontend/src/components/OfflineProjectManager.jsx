import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, RefreshCw, Trash2, CheckCircle2, WifiOff, Wifi,
  AlertTriangle, HardDrive, CloudOff, Loader2
} from 'lucide-react';
import { offlineStorage } from '../services/offlineStorage';
import { connectivity } from '../services/connectivityService';

/**
 * AR Studio - Gestor de Proyectos Offline
 * Permite al usuario descargar, actualizar y eliminar proyectos para uso sin Internet.
 * Muestra tamaño estimado, progreso de descarga, y estado de conectividad.
 */
export default function OfflineProjectManager({ project, compact = false }) {
  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null); // 'download' | 'delete' | 'update' | null
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ deviceOnline: true, apiAvailable: null });
  const [offlineProjectInfo, setOfflineProjectInfo] = useState(null);

  const projectId = project?.id;

  // Verificar si el proyecto está preparado para uso offline (tiene targets.mind o tarjetas listas)
  const hasMindFile = Boolean(project?.mind_file_url && String(project.mind_file_url).trim().length > 0);
  const hasTargetImages = Boolean(project?.markers && project.markers.length > 0);
  const isTrackingReady = project?.tracking_status === 'ready' || (hasMindFile && hasTargetImages);
  const isProjectReady = hasMindFile || isTrackingReady;

  // Verificar estado offline del proyecto al montar
  useEffect(() => {
    if (!projectId) return;

    const checkStatus = async () => {
      try {
        await offlineStorage.init();
        const isAvailable = await offlineStorage.isProjectOffline(String(projectId));
        setIsOffline(isAvailable);

        if (isAvailable) {
          const info = await offlineStorage.getOfflineProject(String(projectId));
          setOfflineProjectInfo(info);
        }
      } catch (err) {
        console.warn('[OfflineManager] Error al verificar estado offline:', err);
      }
    };

    checkStatus();
  }, [projectId]);

  // Monitorear conectividad
  useEffect(() => {
    const handleStatusChange = (status) => {
      setConnectionStatus(status);
    };

    connectivity.startMonitoring(handleStatusChange, 30000);
    return () => connectivity.stopMonitoring();
  }, []);

  // Estimar tamaño cuando se prepara la descarga
  const handlePrepareDownload = useCallback(async () => {
    if (!project) return;
    setError(null);

    try {
      setShowConfirm('download');

      // Estimar tamaño
      const estimate = await offlineStorage.estimateProjectSize(project);
      setEstimatedSize(estimate);

      // Consultar espacio disponible
      const storage = await offlineStorage.getStorageEstimate();
      setStorageInfo(storage);
    } catch (err) {
      console.warn('[OfflineManager] Error al estimar tamaño:', err);
      setEstimatedSize({ totalBytes: 0, formattedSize: 'Desconocido', assetCount: 0 });
    }
  }, [project]);

  // Ejecutar descarga
  const handleDownload = useCallback(async () => {
    if (!project) return;
    setDownloading(true);
    setProgress(0);
    setError(null);
    setShowConfirm(null);

    try {
      const result = await offlineStorage.downloadProject(project, (p) => setProgress(p));
      setIsOffline(true);
      setOfflineProjectInfo({
        downloadedAt: new Date().toISOString(),
        totalSize: result.totalSize,
        assetCount: result.assetsDownloaded
      });
    } catch (err) {
      console.error('[OfflineManager] Error al descargar:', err);
      setError(`No se pudo completar la descarga: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }, [project]);

  // Actualizar proyecto
  const handleUpdate = useCallback(async () => {
    if (!project) return;
    setDownloading(true);
    setProgress(0);
    setError(null);
    setShowConfirm(null);

    try {
      const result = await offlineStorage.updateProject(project, (p) => setProgress(p));
      setOfflineProjectInfo({
        downloadedAt: new Date().toISOString(),
        totalSize: result.totalSize,
        assetCount: result.assetsDownloaded
      });
    } catch (err) {
      console.error('[OfflineManager] Error al actualizar:', err);
      setError(`No se pudo completar la actualización: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }, [project]);

  // Eliminar descarga
  const handleDelete = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    setShowConfirm(null);

    try {
      await offlineStorage.deleteOfflineProject(String(projectId));
      setIsOffline(false);
      setOfflineProjectInfo(null);
    } catch (err) {
      console.error('[OfflineManager] Error al eliminar:', err);
      setError(`Error al eliminar: ${err.message}`);
    }
  }, [projectId]);

  if (!project) return null;

  const isOnline = connectionStatus.deviceOnline;
  const primaryColor = project.theme?.primaryColor || '#00f2fe';

  // ============================================================
  // RENDERING DE ESTADOS
  // ============================================================

  // ESTADO: PROYECTO NO PREPARADO
  if (!isProjectReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        padding: '0.65rem 0.85rem',
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>Uso sin conexión no disponible todavía</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.45, paddingLeft: '1.35rem' }}>
          Primero debes preparar y publicar las tarjetas de este proyecto.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      width: '100%',
      boxSizing: 'border-box',
      ...(compact ? {} : {
        background: 'rgba(13, 18, 29, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '0.85rem'
      })
    }}>
      {/* Estado de conectividad y disponibilidad */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.74rem',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isOnline ? '#10b981' : '#f59e0b' }}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
        </div>

        {isOffline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}>
            <CheckCircle2 size={13} />
            <span>✓ Disponible sin conexión</span>
          </div>
        )}
      </div>

      {/* ESTADO 2: DESCARGANDO */}
      {downloading && (
        <div style={{
          background: 'rgba(0, 242, 254, 0.08)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          borderRadius: '12px',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#00f2fe', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Loader2 size={15} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Descargando... {progress}%
            </span>
          </div>
          <div style={{
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* ESTADO 4: ERROR */}
      {error && !downloading && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
            No se pudo completar la descarga
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {error}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              ...compactBtnPrimary,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              alignSelf: 'flex-start',
              padding: '0.4rem 0.8rem'
            }}
          >
            <RefreshCw size={13} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* CONFIRMACIÓN DE DESCARGA */}
      {showConfirm === 'download' && !downloading && (
        <div style={{
          background: 'rgba(0, 242, 254, 0.06)',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          borderRadius: '12px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600 }}>
            <HardDrive size={14} style={{ marginRight: '0.35rem', verticalAlign: '-2px', color: '#00f2fe' }} />
            {estimatedSize
              ? `Tamaño aproximado: ${estimatedSize.formattedSize}`
              : 'Calculando tamaño...'}
          </div>
          {storageInfo && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Almacenamiento disponible: {storageInfo.formattedAvailable}
            </div>
          )}
          {estimatedSize && estimatedSize.totalBytes > 50 * 1024 * 1024 && (
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertTriangle size={12} />
              Descarga grande. Se recomienda usar Wi-Fi.
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setShowConfirm(null)}
              style={compactBtnSecondary}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                ...compactBtnPrimary,
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                color: '#050b14',
                borderColor: 'transparent',
                fontWeight: 700
              }}
            >
              <Download size={14} />
              <span>Confirmar Descarga</span>
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      {showConfirm === 'delete' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600 }}>
            ¿Eliminar la descarga offline de este proyecto?
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => setShowConfirm(null)} style={compactBtnSecondary}>
              Cancelar
            </button>
            <button type="button" onClick={handleDelete} style={{ ...compactBtnSecondary, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}>
              <Trash2 size={13} />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 1: NO DESCARGADO & ESTADO 3: DESCARGADO (BOTONES PRINCIPALES) */}
      {!showConfirm && !downloading && !error && (
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          {/* ESTADO 1: NO DESCARGADO */}
          {!isOffline && isOnline && (
            <button
              type="button"
              onClick={handlePrepareDownload}
              style={compactBtnPrimary}
            >
              <Download size={15} />
              <span>Descargar para usar sin Internet</span>
            </button>
          )}

          {!isOffline && !isOnline && (
            <div style={{
              fontSize: '0.78rem',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.65rem',
              background: 'rgba(245, 158, 11, 0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              width: '100%'
            }}>
              <CloudOff size={14} />
              <span>Conéctate a Internet para descargar este proyecto.</span>
            </div>
          )}

          {/* ESTADO 3: DESCARGADO */}
          {isOffline && (
            <>
              {isOnline && (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(null);
                    handleUpdate();
                  }}
                  style={compactBtnSecondary}
                >
                  <RefreshCw size={13} />
                  <span>Actualizar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowConfirm('delete')}
                style={{ ...compactBtnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }}
              >
                <Trash2 size={13} />
                <span>Eliminar descarga</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Estilos reutilizables para botones compactos
const compactBtnPrimary = {
  flex: 1,
  padding: '0.45rem 0.6rem',
  background: 'rgba(0, 242, 254, 0.12)',
  color: '#00f2fe',
  border: '1px solid rgba(0, 242, 254, 0.3)',
  borderRadius: '10px',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  transition: 'background 0.15s ease'
};

const compactBtnSecondary = {
  flex: 1,
  padding: '0.45rem 0.6rem',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  transition: 'background 0.15s ease'
};
