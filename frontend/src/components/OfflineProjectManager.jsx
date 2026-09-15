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
      // Aún así permitir la descarga
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
      setError(`Error al descargar: ${err.message}`);
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
      setError(`Error al actualizar: ${err.message}`);
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
  // Modo compacto (para la pantalla de bienvenida AR)
  // ============================================================
  if (compact) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: '100%'
      }}>
        {/* Estado de conectividad */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.72rem',
          color: isOnline ? '#10b981' : '#f59e0b',
          fontWeight: 600
        }}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{isOnline ? 'Conectado' : 'Sin conexión'}</span>
          {isOffline && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginLeft: 'auto',
              color: '#10b981'
            }}>
              <CheckCircle2 size={12} />
              Disponible offline
            </span>
          )}
        </div>

        {/* Descargando */}
        {downloading && (
          <div style={{
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: '10px',
            padding: '0.5rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#00f2fe' }}>
              <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Descargando proyecto... {progress}%</span>
            </div>
            <div style={{
              height: '4px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            fontSize: '0.75rem',
            color: '#ef4444',
            padding: '0.35rem 0.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        {/* Confirmación de descarga */}
        {showConfirm === 'download' && !downloading && (
          <div style={{
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.15)',
            borderRadius: '12px',
            padding: '0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <HardDrive size={13} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} />
              {estimatedSize
                ? `Este proyecto requiere aproximadamente ${estimatedSize.formattedSize}.`
                : 'Calculando tamaño...'}
            </div>
            {storageInfo && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Espacio disponible: {storageInfo.formattedAvailable}
              </div>
            )}
            {estimatedSize && estimatedSize.totalBytes > 50 * 1024 * 1024 && (
              <div style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertTriangle size={11} />
                Descarga grande. Asegúrate de estar en Wi-Fi.
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  background: primaryColor,
                  borderColor: primaryColor
                }}
              >
                <Download size={13} />
                Descargar
              </button>
            </div>
          </div>
        )}

        {/* Confirmación de eliminación */}
        {showConfirm === 'delete' && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
              ¿Eliminar la descarga offline de este proyecto?
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowConfirm(null)} style={compactBtnSecondary}>
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} style={{ ...compactBtnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                <Trash2 size={13} />
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Botones de acción (cuando no hay confirmación activa) */}
        {!showConfirm && !downloading && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isOffline && isOnline && (
              <button
                type="button"
                onClick={handlePrepareDownload}
                style={compactBtnPrimary}
              >
                <Download size={14} />
                <span>Descargar para uso offline</span>
              </button>
            )}
            {!isOffline && !isOnline && (
              <div style={{
                fontSize: '0.78rem',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.6rem',
                background: 'rgba(245, 158, 11, 0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                width: '100%'
              }}>
                <CloudOff size={14} />
                <span>Proyecto no disponible offline. Conéctate a Internet para descargarlo.</span>
              </div>
            )}
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
                  style={{ ...compactBtnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                >
                  <Trash2 size={13} />
                  <span>Eliminar</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Modo completo (para la página de proyectos, si se necesita)
  // ============================================================
  return (
    <div style={{
      background: 'rgba(13, 18, 29, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '16px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Disponibilidad Offline
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.72rem',
          color: isOnline ? '#10b981' : '#f59e0b',
          fontWeight: 600
        }}>
          {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {isOffline ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.65rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '10px'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>Disponible offline</div>
            {offlineProjectInfo && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Descargado: {new Date(offlineProjectInfo.downloadedAt).toLocaleDateString('es')}
                {offlineProjectInfo.totalSize ? ` · ${offlineStorage._formatBytes(offlineProjectInfo.totalSize)}` : ''}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.4
        }}>
          Descarga este proyecto para usarlo sin conexión a Internet.
        </div>
      )}

      {downloading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#00f2fe' }}>Descargando...</span>
            <span style={{ fontSize: '0.75rem', color: '#00f2fe' }}>{progress}%</span>
          </div>
          <div style={{
            height: '6px',
            background: 'rgba(255,255,255,0.08)',
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

      {error && (
        <div style={{
          fontSize: '0.78rem',
          color: '#ef4444',
          padding: '0.4rem 0.6rem',
          background: 'rgba(239, 68, 68, 0.08)',
          borderRadius: '8px'
        }}>
          {error}
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
