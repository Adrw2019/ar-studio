import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, HelpCircle, Layers, FolderOpen } from 'lucide-react';
import ARViewer from '../components/ARViewer';
import MarkerStatus from '../components/MarkerStatus';
import ARControls from '../components/ARControls';
import LoadingScreen from '../components/LoadingScreen';
import InfoModal from '../components/InfoModal';
import TargetPreviewModal from '../components/TargetPreviewModal';
import { demoMarkers, interactionRules } from '../ar/config';
import { apiService } from '../services/api';

export default function ARExperience() {
  const { slug: rawSlug } = useParams();
  const slug = rawSlug || (typeof window !== 'undefined' && window.location.pathname.includes('/demo') ? 'demo' : null);
  const navigate = useNavigate();

  // Activar estilos exclusivos en body durante el montaje de la experiencia AR
  useEffect(() => {
    document.body.classList.add('ar-active');
    return () => {
      document.body.classList.remove('ar-active');
    };
  }, []);

  // Estados del Proyecto: 'loading', 'ready', 'empty', 'not_found', 'error'
  const [loadState, setLoadState] = useState('loading');
  const [projectData, setProjectData] = useState(null);
  const [projectError, setProjectError] = useState(null);

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

  const loadProject = useCallback(async () => {
    // 1. Si no hay slug, no cargar marcadores ni motor
    if (!slug) {
      setProjectData(null);
      setLoadState('empty');
      return;
    }

    // 2. Ruta explícita de demo de desarrollo
    if (slug === 'demo') {
      const demoProject = {
        id: 'demo',
        name: 'Demo: Motor y Energía',
        slug: 'demo',
        status: 'demo',
        mind_file_url: 'markers/targets.mind',
        max_track_targets: 2,
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

    // 3. Cargar proyecto real desde la API
    setLoadState('loading');
    setProjectError(null);
    try {
      const project = await apiService.getProjectBySlug(slug);
      if (project && project.id) {
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

  useEffect(() => {
    loadProject();
  }, [loadProject]);

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
      // El panel NO debe mostrarse automáticamente si no existe un objeto seleccionado o detectado
      if (!statusState.activeMarkerName && !selectedMarkerInfo) {
        return;
      }
      if (statusState.activeMarkerName && projectData?.markers) {
        const activeMarker = projectData.markers.find(m => m.name === statusState.activeMarkerName);
        if (activeMarker) {
          const associatedAsset = projectData.assets?.find(a => a.marker_id === activeMarker.id);
          setSelectedMarkerInfo(associatedAsset?.configuration || activeMarker.info || {
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
    return <LoadingScreen message="Cargando configuración del proyecto AR..." />;
  }

  // 2. Estado vacío: No hay proyecto cargado
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

  // 5. Estado listo: Proyecto válido cargado
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

      {/* 2. Pantalla de Carga Inicial */}
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
                onClick={() => navigate('/projects')}
              >
                <span>Volver a proyectos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Retícula de Escaneo / Búsqueda */}
      {!isLoading && !errorMessage && (
        <div className={`ar-scan-reticle ${statusState.status === 'detected' || statusState.status === 'interaction' ? 'detected' : ''}`}>
          <div className="reticle-corner tl" />
          <div className="reticle-corner tr" />
          <div className="reticle-corner bl" />
          <div className="reticle-corner br" />
          <div className="reticle-hint">
            Apunta hacia la tarjeta {projectData?.name ? `de ${projectData.name}` : 'física'}
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
              onClick={() => navigate('/projects')}
              aria-label="Volver al menú de proyectos"
              title="Volver a proyectos"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="ar-brand-pill">
              <div className="ar-badge-live" />
              <span className="ar-brand-text">
                {projectData?.name ? projectData.name.slice(0, 20) : 'AR Studio'}
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
            {/* Badge de Estado Dinámico */}
            <MarkerStatus
              status={statusState.status}
              activeMarkerName={statusState.activeMarkerName}
              interactionMessage={interactionState.message}
            />

            {/* Hint de toque si el modelo está visible */}
            {statusState.status === 'detected' && (
              <div className="ar-touch-hint">
                <span>👆 Toca el modelo 3D en pantalla para interactuar</span>
              </div>
            )}

            {/* Controles Flotantes Inferiores */}
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

      {/* 6. Modal Didáctico del Modelo Tocado */}
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
        markers={projectData?.markers}
      />
    </div>
  );
}
