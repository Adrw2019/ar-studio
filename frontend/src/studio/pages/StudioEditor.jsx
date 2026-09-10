import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layers, Sliders, Eye, Box, Zap, Sparkles } from 'lucide-react';
import StudioNavbar from '../components/StudioNavbar';
import Viewport3D from '../components/Viewport3D';
import ElementsPanel from '../components/ElementsPanel';
import InspectorPanel from '../components/InspectorPanel';
import RulesEditorModal from '../components/RulesEditorModal';
import PublishModal from '../components/PublishModal';
import UploadAssetModal from '../components/UploadAssetModal';
import { apiService } from '../../services/api';
import '../styles/editor.css';

export default function StudioEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados del Proyecto
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'

  // Selección actual
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  // Navegación en Móvil/Tablet ('viewport', 'elements', 'inspector')
  const [mobileActiveTab, setMobileActiveTab] = useState('viewport');

  // Modales
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [uploadModalTargetMarkerId, setUploadModalTargetMarkerId] = useState(null);

  // Referencia para debounce de auto-guardado
  const autoSaveTimerRef = useRef(null);

  // Cargar Proyecto desde Backend
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await apiService.getProjectById(id);
        if (data) {
          setProject(data);
          if (data.markers && data.markers.length > 0) {
            setSelectedMarkerId(data.markers[0].id);
            const firstAsset = (data.assets || []).find(a => a.marker_id === data.markers[0].id);
            if (firstAsset) {
              setSelectedAssetId(firstAsset.id);
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar proyecto:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Función de Guardado al Backend
  const saveToBackend = useCallback(async (projectData) => {
    if (!projectData || !projectData.id) return;
    setSaveStatus('saving');
    try {
      await apiService.updateProject(projectData.id, projectData);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error en guardado:', err);
      setSaveStatus('unsaved');
    }
  }, []);

  // Trigger de Auto-guardado con Debounce (1500ms)
  const triggerAutoSave = useCallback((updatedProject) => {
    setProject(updatedProject);
    setSaveStatus('unsaved');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveToBackend(updatedProject);
    }, 1500);
  }, [saveToBackend]);

  // Manejadores de Estado del Proyecto
  const handleNameChange = (newName) => {
    if (!project) return;
    triggerAutoSave({ ...project, name: newName });
  };

  const handleSelectMarker = (markerId) => {
    setSelectedMarkerId(markerId);
    const markerAsset = (project.assets || []).find(a => a.marker_id === markerId);
    setSelectedAssetId(markerAsset ? markerAsset.id : null);
    // En móvil, regresar a viewport o mantener
  };

  const handleSelectAsset = (assetId, markerId) => {
    setSelectedMarkerId(markerId);
    setSelectedAssetId(assetId);
    setMobileActiveTab('inspector'); // En móvil abrir inspector directamente
  };

  const handleAddMarker = () => {
    if (!project) return;
    const markerIndex = (project.markers || []).length;
    const newMarker = {
      id: `marker-${Date.now()}-${markerIndex}`,
      project_id: project.id,
      name: `Tarjeta ${markerIndex + 1}`,
      target_image: '/markers/card-motor.svg',
      target_index: markerIndex,
      description: `Tarjeta marcadora #${markerIndex + 1}`
    };

    const newAsset = {
      id: `asset-${Date.now()}-${markerIndex}`,
      project_id: project.id,
      marker_id: newMarker.id,
      type: 'model3d',
      file_url: '/models/motor.glb',
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
        title: `Elemento ${markerIndex + 1}`,
        category: 'Educación',
        description: 'Objeto didáctico 3D.',
        interactive: true
      }
    };

    const updated = {
      ...project,
      markers: [...(project.markers || []), newMarker],
      assets: [...(project.assets || []), newAsset]
    };

    setSelectedMarkerId(newMarker.id);
    setSelectedAssetId(newAsset.id);
    triggerAutoSave(updated);
  };

  const handleDeleteMarker = (markerId) => {
    if (!project) return;
    const remainingMarkers = (project.markers || []).filter(m => m.id !== markerId);
    const remainingAssets = (project.assets || []).filter(a => a.marker_id !== markerId);

    const updated = {
      ...project,
      markers: remainingMarkers,
      assets: remainingAssets
    };

    if (remainingMarkers.length > 0) {
      setSelectedMarkerId(remainingMarkers[0].id);
      const nextAsset = remainingAssets.find(a => a.marker_id === remainingMarkers[0].id);
      setSelectedAssetId(nextAsset ? nextAsset.id : null);
    } else {
      setSelectedMarkerId(null);
      setSelectedAssetId(null);
    }

    triggerAutoSave(updated);
  };

  const handleUpdateMarker = (markerId, updatedMarker) => {
    if (!project) return;
    const updatedMarkers = (project.markers || []).map(m => m.id === markerId ? updatedMarker : m);
    triggerAutoSave({ ...project, markers: updatedMarkers });
  };

  const handleUpdateAsset = (assetId, updatedAsset) => {
    if (!project) return;
    const updatedAssets = (project.assets || []).map(a => a.id === assetId ? updatedAsset : a);
    triggerAutoSave({ ...project, assets: updatedAssets });
  };

  const handleAssetUploaded = (newAssetData) => {
    if (!project) return;
    const newAsset = {
      ...newAssetData,
      id: `asset-${Date.now()}`,
      project_id: project.id
    };

    const updated = {
      ...project,
      assets: [...(project.assets || []), newAsset]
    };

    setSelectedAssetId(newAsset.id);
    triggerAutoSave(updated);
  };

  const handleSaveInteractions = (newInteractions) => {
    if (!project) return;
    triggerAutoSave({ ...project, interactions: newInteractions });
  };

  if (loading || !project) {
    return (
      <div className="editor-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={32} color="var(--accent-cyan)" className="animate-spin-slow" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Cargando editor 3D de AR Studio...</p>
      </div>
    );
  }

  // Elementos activos
  const activeMarker = (project.markers || []).find(m => m.id === selectedMarkerId) || (project.markers || [])[0];
  const activeAsset = (project.assets || []).find(a => a.id === selectedAssetId) ||
                      (project.assets || []).find(a => a.marker_id === selectedMarkerId) ||
                      (project.assets || [])[0];

  return (
    <div className="editor-layout">
      {/* 1. Barra Superior del Editor */}
      <StudioNavbar
        projectName={project.name}
        onNameChange={handleNameChange}
        saveStatus={saveStatus}
        onManualSave={() => saveToBackend(project)}
        onOpenPublish={() => setIsPublishModalOpen(true)}
        projectSlug={project.slug}
      />

      {/* 2. Área de Trabajo Principal */}
      <div className="editor-workspace">
        {/* Panel Izquierdo: Elementos */}
        <div className={`editor-panel-left ${mobileActiveTab === 'elements' ? 'tab-active' : ''}`}>
          <ElementsPanel
            markers={project.markers || []}
            assets={project.assets || []}
            interactions={project.interactions || []}
            selectedMarkerId={selectedMarkerId}
            selectedAssetId={selectedAssetId}
            onSelectMarker={handleSelectMarker}
            onSelectAsset={handleSelectAsset}
            onAddMarker={handleAddMarker}
            onDeleteMarker={handleDeleteMarker}
            onOpenUploadModal={(markerId) => setUploadModalTargetMarkerId(markerId)}
            onOpenRulesModal={() => setIsRulesModalOpen(true)}
          />
        </div>

        {/* Área Central: Previsualizador 3D con OrbitControls (Sin cámara requerida) */}
        <Viewport3D
          activeAsset={activeAsset}
          activeMarker={activeMarker}
          onTransformChange={(updated) => handleUpdateAsset(activeAsset?.id, updated)}
        />

        {/* Panel Derecho: Inspector de Propiedades */}
        <div className={`editor-panel-right ${mobileActiveTab === 'inspector' ? 'tab-active' : ''}`}>
          <InspectorPanel
            selectedMarker={activeMarker}
            selectedAsset={activeAsset}
            onUpdateMarker={handleUpdateMarker}
            onUpdateAsset={handleUpdateAsset}
          />
        </div>
      </div>

      {/* 3. Barra de Pestañas Inferior para Tablet y Celular */}
      <nav className="editor-mobile-tab-bar">
        <button
          type="button"
          className={`mobile-tab-btn ${mobileActiveTab === 'elements' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab(mobileActiveTab === 'elements' ? 'viewport' : 'elements')}
        >
          <Layers size={18} />
          <span>Elementos</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${mobileActiveTab === 'viewport' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('viewport')}
        >
          <Eye size={18} />
          <span>Vista 3D</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${mobileActiveTab === 'inspector' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab(mobileActiveTab === 'inspector' ? 'viewport' : 'inspector')}
        >
          <Sliders size={18} />
          <span>Propiedades</span>
        </button>
      </nav>

      {/* 4. Modales */}
      {isRulesModalOpen && (
        <RulesEditorModal
          isOpen={true}
          onClose={() => setIsRulesModalOpen(false)}
          markers={project.markers || []}
          interactions={project.interactions || []}
          onSaveInteractions={handleSaveInteractions}
        />
      )}

      {isPublishModalOpen && (
        <PublishModal
          isOpen={true}
          onClose={() => setIsPublishModalOpen(false)}
          project={project}
          onUpdateStatus={(newStatus) => triggerAutoSave({ ...project, status: newStatus })}
          onUpdateSlug={(newSlug) => triggerAutoSave({ ...project, slug: newSlug })}
        />
      )}

      {uploadModalTargetMarkerId && (
        <UploadAssetModal
          isOpen={true}
          onClose={() => setUploadModalTargetMarkerId(null)}
          targetMarkerId={uploadModalTargetMarkerId}
          onAssetUploaded={handleAssetUploaded}
        />
      )}
    </div>
  );
}
