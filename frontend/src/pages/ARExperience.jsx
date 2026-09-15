import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, AlertTriangle, HelpCircle, Layers, FolderOpen,
  Play, Sparkles, Printer, CheckCircle2, ShieldCheck, BookOpen, WifiOff
} from 'lucide-react';
import ARViewer from '../components/ARViewer';
import MarkerStatus from '../components/MarkerStatus';
import ARControls from '../components/ARControls';
import LoadingScreen from '../components/LoadingScreen';
import InfoModal from '../components/InfoModal';
import TargetPreviewModal from '../components/TargetPreviewModal';
import OfflineProjectManager from '../components/OfflineProjectManager';
import { demoMarkers, interactionRules } from '../ar/config';
import { apiService } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { resolveAssetPath } from '../utils/paths';

export default function ARExperience() {
  const { slug: rawSlug } = useParams();
  const slug = rawSlug || (typeof window !== 'undefined' && window.location.pathname.includes('/demo') ? 'demo' : null);
  const navigate = useNavigate();

  // Activar clase para pantalla completa AR
  useEffect(() => {
    document.body.classList.add('ar-active');
    return () => {
      document.body.classList.remove('ar-active');
    };
  }, []);

  // Estados del Proyecto
  const [loadState, setLoadState] = useState('loading'); // 'loading', 'ready', 'empty', 'not_found', 'error'
  const [projectData, setProjectData] = useState(null);
  const [projectError, setProjectError] = useState(null);

  // Flujo del Estudiante: 'hasStarted' controla si se muestra la pantalla de bienvenida o la cámara AR
  const [hasStarted, setHasStarted] = useState(false);

  // Estados de la experiencia AR
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusState, setStatusState] = useState({
    status: 'searching', // 'searching', 'detected', 'lost', 'interaction'
    activeMarkerName: null
  });
  const [interactionState, setInteractionState] = useState({
    active: false,
    title: '',
    message: ''
  });
  const [selectedMarkerInfo, setSelectedMarkerInfo] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Referencia para limpiar Blob URLs al desmontar (crítico en iPhone/iPad)
  const blobUrlsRef = useRef([]);

  const loadProject = useCallback(async () => {
    if (!slug) {
      setProjectData(null);
      setLoadState('empty');
      return;
    }

    if (slug === 'demo') {
      const demoProject = {
        id: 'demo',
        name: 'Demo: Motor y Energía',
        category: 'Electrónica',
        slug: 'demo',
        status: 'demo',
        mind_file_url: 'markers/targets.mind',
        max_track_targets: 2,
        theme: {
          primaryColor: '#00f2fe',
          secondaryColor: '#8a2be2',
          title: 'Laboratorio de Electrónica y Motor',
          subtitle: 'Simulación de inducción electromagnética',
          introText: 'Bienvenido al laboratorio interactivo. Enfoca las tarjetas físicas de Motor y Energía para iniciar la simulación.'
        },
        markers: demoMarkers,
        assets: demoMarkers.map((m) => ({
          id: `asset-${m.id}`,
          marker_id: m.id,
          file_url: m.modelUrl,
          scale_x: m.scale[0],
          scale_y: m.scale[1],
          scale_z: m.scale[2],
          position_x: m.position[0],
          position_y: m.position[1],
          position_z: m.position[2],
          rotation_x: m.rotation[0],
          rotation_y: m.rotation[1],
          rotation_z: m.rotation[2],
          configuration: m.info
        })),
        interactions: interactionRules
      };
      setProjectData(demoProject);
      setLoadState('ready');
      return;
    }

    setLoadState('loading');
    setProjectError(null);
    setIsOfflineMode(false);
    try {
      let project = await apiService.getProjectBySlug(slug);
      if (!project || !project.id) {
        project = await apiService.getProjectById(slug);
      }
      if (project && project.id) {
        // Verificar si viene del almacenamiento offline
        if (project._isOffline) {
          setIsOfflineMode(true);
          // Resolver URLs de assets a Blob URLs locales desde IndexedDB
          project = await resolveOfflineProjectUrls(project);
        }

        // Asegurar que markers esté presente si la consulta principal no los incluyó
        if (!project.markers || project.markers.length === 0) {
          try {
            const markers = await apiService.getMarkersByProject(project.id);
            if (markers && markers.length > 0) {
              project.markers = markers;
            }
          } catch (mErr) {
            console.warn('[ARExperience] Error al recuperar markers de respaldo:', mErr);
          }
        }
        setProjectData(project);
        setLoadState('ready');
      } else {
        setProjectData(null);
        setLoadState('not_found');
      }
    } catch (err) {
      console.error('[ARExperience] Error al consultar proyecto:', err);
      setProjectData(null);
      setProjectError(err.message || 'No se pudo cargar el proyecto');
      setLoadState('error');
    }
  }, [slug]);

  /**
   * Resuelve las URLs de un proyecto offline a Blob URLs desde IndexedDB
   */
  async function resolveOfflineProjectUrls(project) {
    const projectId = String(project.id);
    const resolved = { ...project };

    try {
      await offlineStorage.init();

      // Resolver mind_file_url
      if (project.mind_file_url) {
        const mindBlobUrl = await offlineStorage.getMindFileBlobUrl(projectId, project.mind_file_url);
        if (mindBlobUrl) {
          resolved.mind_file_url = mindBlobUrl;
          blobUrlsRef.current.push(mindBlobUrl);
        }
      }

      // Resolver URLs de assets (GLB, imágenes, audio, video)
      if (resolved.assets && resolved.assets.length > 0) {
        for (let i = 0; i < resolved.assets.length; i++) {
          const asset = resolved.assets[i];
          const fileUrl = asset.file_url || asset.url || asset.asset_url || asset.model_url || '';
          if (fileUrl && !fileUrl.startsWith('blob:') && !fileUrl.startsWith('data:')) {
            const blobUrl = await offlineStorage.resolveAssetUrl(projectId, fileUrl);
            if (blobUrl && blobUrl.startsWith('blob:')) {
              resolved.assets[i] = { ...asset, file_url: blobUrl };
              blobUrlsRef.current.push(blobUrl);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ARExperience] Error al resolver URLs offline:', err);
    }

    return resolved;
  }

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Limpiar Blob URLs al desmontar para evitar fugas de memoria (crítico en iPhone/iPad)
  useEffect(() => {
    return () => {
      if (blobUrlsRef.current.length > 0) {
        blobUrlsRef.current.forEach((url) => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        });
        blobUrlsRef.current = [];
      }
      offlineStorage.revokeAllBlobUrls();
    };
  }, []);

  // Callbacks para eventos del motor AR
  const handleStatusChange = useCallback((newStatus) => {
    setStatusState(newStatus);
  }, []);

  const handleObjectTouched = useCallback((markerConfig) => {
    setSelectedMarkerInfo(markerConfig.info || {
      title: markerConfig.name,
      description: 'Elemento de Realidad Aumentada interactivo.'
    });
    setIsInfoModalOpen(true);
  }, []);

  const handleInteractionChange = useCallback((interaction) => {
    setInteractionState(interaction);
    if (interaction.active) {
      setStatusState({
        status: 'interaction',
        activeMarkerName: null
      });
    } else {
      setStatusState(prev => ({
        ...prev,
        status: prev.activeMarkerName ? 'detected' : 'searching'
      }));
    }
  }, []);

  const handleError = useCallback((msg) => {
    setIsLoading(false);
    setErrorMessage(msg);
  }, []);

  const handleLoaded = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleReset = useCallback(() => {
    setResetTrigger(prev => prev + 1);
    setIsInfoModalOpen(false);
    setSelectedMarkerInfo(null);
    setInteractionState({ active: false, title: '', message: '' });
  }, []);

  const handleToggleInfo = useCallback(() => {
    if (isInfoModalOpen) {
      setIsInfoModalOpen(false);
    } else {
      if (!statusState.activeMarkerName && !selectedMarkerInfo) {
        return;
      }
      if (statusState.activeMarkerName && projectData?.markers) {
        const activeMarker = projectData.markers.find(m => m.name === statusState.activeMarkerName);
        if (activeMarker) {
          const markerAssets = (projectData.assets || []).filter(a => a.marker_id === activeMarker.id);
          const assetWithInfo = markerAssets.find(a => a.configuration?.title || a.configuration?.description) || markerAssets[0];
          setSelectedMarkerInfo(assetWithInfo?.configuration || activeMarker.info || {
            title: activeMarker.name,
            description: activeMarker.description || 'Elemento didáctico interactivo.'
          });
        }
      }
      setIsInfoModalOpen(true);
    }
  }, [isInfoModalOpen, statusState.activeMarkerName, projectData, selectedMarkerInfo]);

  // 1. Estado de carga de configuración
  if (loadState === 'loading') {
    return <LoadingScreen message="Cargando experiencia de Realidad Aumentada..." />;
  }

  // 2. Estado vacío: No hay slug o proyecto
  if (loadState === 'empty') {
    return (
      <div className="ar-empty-overlay">
        <div className="ar-empty-card">
          <div className="empty-icon-box">
            <Layers size={32} color="var(--accent-cyan)" />
          </div>
          <h2>No hay un proyecto AR cargado</h2>
          <p>Selecciona una experiencia desde el catálogo para visualizar los marcadores y modelos 3D.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/projects')}
          >
            <FolderOpen size={18} />
            <span>Volver a proyectos</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Estado: Proyecto no encontrado
  if (loadState === 'not_found') {
    return (
      <div className="ar-empty-overlay">
        <div className="ar-empty-card">
          <div className="empty-icon-box warning">
            <AlertTriangle size={32} color="var(--accent-amber)" />
          </div>
          <h2>Proyecto no encontrado</h2>
          <p>No se encontró ninguna experiencia de Realidad Aumentada asociada a "{slug}".</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/projects')}
          >
            <FolderOpen size={18} />
            <span>Volver a proyectos</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Estado: Error al consultar API
  if (loadState === 'error') {
    return (
      <div className="ar-empty-overlay">
        <div className="ar-empty-card">
          <div className="empty-icon-box error">
            <AlertTriangle size={32} color="var(--accent-rose)" />
          </div>
          <h2>No se pudo cargar el proyecto</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {projectError || 'Ocurrió un error al comunicarse con el servidor.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => navigate('/projects')}
            >
              <span>Volver a proyectos</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => loadProject()}
            >
              <RefreshCw size={18} />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Configuración de apariencia visual del proyecto
  const theme = projectData?.theme || {};
  const primaryColor = theme.primaryColor || '#00f2fe';
  const secondaryColor = theme.secondaryColor || '#8a2be2';
  const projectTitle = theme.title || projectData?.name || 'Experiencia AR';
  const projectSubtitle = theme.subtitle || projectData?.category || 'Realidad Aumentada';
  const projectIntro = theme.introText || projectData?.description || 'Enfoca las tarjetas físicas con la cámara para interactuar con los elementos 3D.';
  const markersList = projectData?.markers || [];

  // =========================================================================
  // PASO 1 DEL FLUJO DEL ESTUDIANTE: PANTALLA DE BIENVENIDA PERSONALIZADA
  // =========================================================================
  if (!hasStarted) {
    return (
      <div
        className="ar-player-page"
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: theme.backgroundImage
            ? `linear-gradient(rgba(8, 11, 17, 0.85), rgba(8, 11, 17, 0.95)), url(${theme.backgroundImage}) center/cover no-repeat`
            : `radial-gradient(circle at 50% 20%, ${secondaryColor}25, #080b11 80%)`,
          position: 'relative',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(13, 18, 29, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${primaryColor}44`,
            borderRadius: '24px',
            padding: '2rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px ${primaryColor}15`,
            textAlign: 'center'
          }}
        >
          {/* Badge de Categoría */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${primaryColor}66`,
                color: primaryColor,
                padding: '0.3rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <Sparkles size={13} color={primaryColor} />
              {projectData?.category || 'Experiencia AR'}
            </span>
          </div>

          {/* Título y Subtítulo */}
          <div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.25,
                margin: '0 0 0.4rem 0'
              }}
            >
              {projectTitle}
            </h1>
            <p style={{ margin: 0, fontSize: '0.92rem', color: primaryColor, fontWeight: 600 }}>
              {projectSubtitle}
            </p>
          </div>

          {/* Texto de Introducción */}
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0,
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
              textAlign: 'left'
            }}
          >
            {projectIntro}
          </p>

          {/* Gestor de Proyecto Offline - Ubicado Arriba para Máxima Visibilidad en Móviles */}
          {projectData && (
            <div style={{ textAlign: 'left', width: '100%' }}>
              <OfflineProjectManager project={projectData} compact />
            </div>
          )}

          {/* Resumen de Tarjetas Físicas */}
          {markersList.length > 0 && (
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Tarjetas para esta experiencia ({markersList.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: primaryColor,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: 0
                  }}
                >
                  <Printer size={13} />
                  <span>Ver / Imprimir</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {markersList.map((m, idx) => (
                  <span
                    key={m.id || idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: primaryColor }} />
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Badge de modo offline */}
          {isOfflineMode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                fontSize: '0.78rem',
                color: '#f59e0b',
                fontWeight: 600
              }}
            >
              <WifiOff size={14} />
              <span>Modo Offline — usando proyecto descargado localmente</span>
            </div>
          )}

          {/* Aviso si no cuenta con targets.mind compilado */}
          {(!projectData?.mind_file_url || projectData?.tracking_status === 'pending') && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '12px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#f59e0b',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Tarjetas pendientes de preparar:</strong> Este proyecto aún no cuenta con un archivo <code>targets.mind</code> compilado.
              </div>
            </div>
          )}

          {/* Botón Principal de Inicio de Experiencia */}
          {!projectData?.mind_file_url || projectData?.tracking_status === 'pending' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                  opacity: 0.7
                }}
                disabled
              >
                <span>Tarjetas pendientes de preparar</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem' }}
                onClick={() => navigate(projectData?.id ? `/studio/project/${projectData.id}` : '/projects')}
              >
                <span>Abrir en AR Studio para preparar tarjetas</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                padding: '0.85rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 800,
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                color: '#050b14',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                boxShadow: `0 8px 24px ${primaryColor}40`,
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
              }}
              onClick={() => setHasStarted(true)}
            >
              <Play size={20} fill="#050b14" />
              <span>Iniciar experiencia</span>
            </button>
          )}

          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Se solicitará acceso a la cámara trasera para enfocar las tarjetas físicas.
          </span>
        </div>

        {/* Modal para ver e imprimir las tarjetas del proyecto */}
        <TargetPreviewModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          markers={markersList}
          project={projectData}
          projectId={projectData?.id}
        />
      </div>
    );
  }

  // =========================================================================
  // PASO 2 DEL FLUJO DEL ESTUDIANTE: CÁMARA ACTIVA + CONTENIDO AR INTERACTIVO
  // =========================================================================
  return (
    <div className="ar-player-page ar-viewport-container">
      {/* 1. Visor AR (WebGL Canvas + MindAR Video Stream) */}
      {!errorMessage && (
        <ARViewer
          markers={projectData?.markers}
          assets={projectData?.assets}
          interactionRules={projectData?.interactions}
          mindFileUrl={projectData?.mind_file_url}
          onStatusChange={handleStatusChange}
          onObjectTouched={handleObjectTouched}
          onInteractionChange={handleInteractionChange}
          onError={handleError}
          onLoaded={handleLoaded}
          resetTrigger={resetTrigger}
        />
      )}

      {/* 2. Pantalla de Carga Inicial del Motor */}
      {isLoading && !errorMessage && (
        <LoadingScreen message="Inicializando cámara trasera y motor de seguimiento..." />
      )}

      {/* 3. Pantalla de Error / Permisos Denegados */}
      {errorMessage && (
        <div className="ar-loading-overlay">
          <div className="ar-error-card">
            <div className="error-icon-box">
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Acceso a Cámara</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={18} />
                <span>Reintentar</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHasStarted(false)}
              >
                <span>Volver a la portada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Retícula de Escaneo / Búsqueda */}
      {!isLoading && !errorMessage && (
        <div className={`ar-scan-reticle ${statusState.status === 'detected' || statusState.status === 'interaction' ? 'detected' : ''}`}>
          <div className="reticle-corner tl" style={{ borderColor: primaryColor }} />
          <div className="reticle-corner tr" style={{ borderColor: primaryColor }} />
          <div className="reticle-corner bl" style={{ borderColor: primaryColor }} />
          <div className="reticle-corner br" style={{ borderColor: primaryColor }} />
          <div className="reticle-hint" style={{ background: 'rgba(13, 18, 29, 0.85)', border: `1px solid ${primaryColor}44` }}>
            Apunta hacia una tarjeta de <strong>{projectTitle}</strong>
          </div>
        </div>
      )}

      {/* 5. Capa de Interfaz Flotante (HUD) */}
      {!isLoading && !errorMessage && (
        <div className="ar-ui-overlay">
          {/* Barra Superior */}
          <div className="ar-top-bar">
            <button
              type="button"
              className="ar-round-btn"
              onClick={() => setHasStarted(false)}
              aria-label="Volver a la portada del proyecto"
              title="Volver a la presentación del proyecto"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="ar-brand-pill" style={{ borderColor: `${primaryColor}66` }}>
              <div className="ar-badge-live" style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }} />
              <span className="ar-brand-text">
                {projectTitle.length > 22 ? `${projectTitle.slice(0, 22)}...` : projectTitle}
              </span>
            </div>

            <button
              type="button"
              className="ar-round-btn"
              onClick={() => setIsTargetModalOpen(true)}
              aria-label="Ver tarjetas de prueba"
              title="Ver tarjetas del proyecto"
            >
              <HelpCircle size={20} />
            </button>
          </div>

          {/* Área Inferior: Estado del Marcador + Controles Táctiles */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <MarkerStatus
              status={statusState.status}
              activeMarkerName={statusState.activeMarkerName}
              interactionMessage={interactionState.message}
            />

            {statusState.status === 'detected' && (
              <div className="ar-touch-hint" style={{ border: `1px solid ${primaryColor}55` }}>
                <span>👆 Toca el elemento en pantalla para interactuar</span>
              </div>
            )}

            <ARControls
              onToggleInfo={handleToggleInfo}
              onReset={handleReset}
              onToggleCardPreview={() => setIsTargetModalOpen(true)}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(prev => !prev)}
              isInfoOpen={isInfoModalOpen}
            />
          </div>
        </div>
      )}

      {/* 6. Modal Didáctico del Elemento Tocado */}
      {isInfoModalOpen && selectedMarkerInfo && (
        <InfoModal
          markerInfo={selectedMarkerInfo}
          onClose={() => setIsInfoModalOpen(false)}
        />
      )}

      {/* 7. Modal de Vista Previa de Tarjetas Imprimibles */}
      <TargetPreviewModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        markers={markersList}
        project={projectData}
        projectId={projectData?.id}
      />
    </div>
  );
}
