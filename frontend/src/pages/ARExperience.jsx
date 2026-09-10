import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, HelpCircle, Layers } from 'lucide-react';
import ARViewer from '../components/ARViewer';
import MarkerStatus from '../components/MarkerStatus';
import ARControls from '../components/ARControls';
import LoadingScreen from '../components/LoadingScreen';
import InfoModal from '../components/InfoModal';
import TargetPreviewModal from '../components/TargetPreviewModal';
import { demoMarkers as defaultMarkers } from '../ar/config';
import { apiService } from '../services/api';

export default function ARExperience() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Estados del Proyecto
  const [projectData, setProjectData] = useState(null);
  const [isFetchingProject, setIsFetchingProject] = useState(true);

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

  useEffect(() => {
    async function loadProject() {
      if (!slug || slug === 'demo') {
        setIsFetchingProject(false);
        return;
      }
      setIsFetchingProject(true);
      try {
        const project = await apiService.getProjectBySlug(slug);
        if (project) {
          setProjectData(project);
        }
      } catch (err) {
        console.warn('No se pudo cargar el proyecto por slug, usando configuración demo:', err);
      } finally {
        setIsFetchingProject(false);
      }
    }
    loadProject();
  }, [slug]);

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
    setInteractionState({ active: false, title: '', message: '' });
  }, []);

  const handleToggleInfo = useCallback(() => {
    if (isInfoModalOpen) {
      setIsInfoModalOpen(false);
    } else {
      const markers = projectData?.markers || defaultMarkers;
      const activeMarker = markers.find(m => m.name === statusState.activeMarkerName) || markers[0];
      const associatedAsset = projectData?.assets?.find(a => a.marker_id === activeMarker?.id);
      setSelectedMarkerInfo(associatedAsset?.configuration || activeMarker?.info || {
        title: activeMarker?.name || 'Objeto AR',
        description: 'Elemento didáctico interactivo.'
      });
      setIsInfoModalOpen(true);
    }
  }, [isInfoModalOpen, statusState.activeMarkerName, projectData]);

  if (isFetchingProject) {
    return <LoadingScreen message="Cargando configuración de la experiencia AR..." />;
  }

  return (
    <div className="ar-viewport-container">
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
                onClick={() => navigate('/')}
              >
                <span>Volver al Inicio</span>
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
              onClick={() => navigate('/')}
              aria-label="Volver al menú principal"
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
      {isInfoModalOpen && (
        <InfoModal
          markerInfo={selectedMarkerInfo}
          onClose={() => setIsInfoModalOpen(false)}
        />
      )}

      {/* 7. Modal de Vista Previa de Tarjetas Imprimibles */}
      <TargetPreviewModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
      />
    </div>
  );
}
