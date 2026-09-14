import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layers, Sliders, Eye, Box, Zap, Sparkles, AlertTriangle, CheckCircle2, RefreshCw, Info } from 'lucide-react';
import StudioNavbar from '../components/StudioNavbar';
import Viewport3D from '../components/Viewport3D';
import ElementsPanel from '../components/ElementsPanel';
import InspectorPanel from '../components/InspectorPanel';
import RulesEditorModal from '../components/RulesEditorModal';
import PublishModal from '../components/PublishModal';
import UploadAssetModal from '../components/UploadAssetModal';
import ThemeModal from '../components/ThemeModal';
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
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
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
      const sanitizedProject = {
        ...projectData,
        markers: (projectData.markers || []).map(m => ({
          ...m,
          target_image: (m.target_image && m.target_image.startsWith('blob:')) ? '' : m.target_image
        })),
        assets: (projectData.assets || []).map(a => ({
          ...a,
          file_url: (a.file_url && a.file_url.startsWith('blob:')) ? '' : a.file_url
        }))
      };
      await apiService.updateProject(sanitizedProject.id, sanitizedProject);
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

  // Estado de compilación de targets
  const [isCompiling, setIsCompiling] = useState(false);
  const [showErrorDetailModal, setShowErrorDetailModal] = useState(false);

  // Compilar targets físicos con MindAR
  const handleCompileTargets = async () => {
    if (!project || !project.id) return;

    // Validación preventiva de URLs blob
    const hasBlob = (project.markers || []).some(m => m.target_image && m.target_image.startsWith('blob:'));
    if (hasBlob) {
      setProject(prev => ({
        ...prev,
        tracking_status: 'error',
        tracking_error: 'La imagen de esta tarjeta todavía no está almacenada correctamente. Vuelve a subirla.'
      }));
      return;
    }

    setIsCompiling(true);
    const compilingState = { ...project, tracking_status: 'compiling', tracking_error: null };
    setProject(compilingState);

    try {
      // 1. Guardar primero el proyecto actual
      await apiService.updateProject(project.id, compilingState);

      // 2. Ejecutar compilación de MindAR
      const res = await apiService.compileProjectTargets(project.id);
      if (res && res.success) {
        setProject(prev => ({
          ...prev,
          mind_file_url: res.mind_file_url,
          tracking_status: 'ready',
          tracking_error: null,
          markers: res.markers || prev.markers
        }));
      } else {
        throw new Error(res?.error || res?.tracking_error || 'Error al compilar targets.');
      }
    } catch (err) {
      console.error('[StudioEditor] Error al compilar tarjetas:', err);
      setProject(prev => ({
        ...prev,
        tracking_status: 'error',
        tracking_error: err.message || 'Error al compilar las tarjetas físicas.'
      }));
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAddMarker = () => {
    if (!project) return;
    const existingIndices = (project.markers || []).map(m => typeof m.target_index === 'number' ? m.target_index : 0);
    const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;
    const markerCount = (project.markers || []).length;

    const newMarker = {
      id: `marker-${Date.now()}-${nextIndex}`,
      project_id: project.id,
      name: `Tarjeta ${markerCount + 1}`,
      target_image: '',
      target_index: nextIndex,
      description: `Tarjeta física #${markerCount + 1}`
    };

    const newAsset = {
      id: `asset-${Date.now()}-${nextIndex}`,
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
        title: `Elemento ${markerCount + 1}`,
        category: 'Educación',
        description: 'Objeto didáctico 3D.',
        interactive: true
      }
    };

    // Agregar tarjeta requiere recompilar targets.mind
    const updated = {
      ...project,
      tracking_status: 'pending',
      mind_file_url: null,
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

    // Eliminar tarjeta requiere recompilar targets.mind
    const updated = {
      ...project,
      tracking_status: 'pending',
      mind_file_url: null,
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

    // Rechazar asignaciones de URLs blob temporales en target_image
    if (updatedMarker.target_image && updatedMarker.target_image.startsWith('blob:')) {
      console.warn('[StudioEditor] Intento de asignar blob URL a target_image rechazado.');
      return;
    }

    const originalMarker = (project.markers || []).find(m => m.id === markerId);
    const imageChanged = originalMarker && originalMarker.target_image !== updatedMarker.target_image;

    const updatedMarkers = (project.markers || []).map(m => m.id === markerId ? updatedMarker : m);

    const updatedProject = {
      ...project,
      ...(imageChanged ? { tracking_status: 'pending', mind_file_url: null } : {}),
      markers: updatedMarkers
    };

    triggerAutoSave(updatedProject);
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
        onOpenTheme={() => setIsThemeModalOpen(true)}
        projectSlug={project.slug}
      />

      {/* 2. Guía de Flujo Discreto para Estudiantes */}
      <div className="editor-stepper">
        <div className="stepper-item active">
          <span className="stepper-num">1</span>
          <span>Tarjeta</span>
        </div>
        <span className="stepper-arrow">→</span>
        <div className="stepper-item active">
          <span className="stepper-num">2</span>
          <span>Contenido</span>
        </div>
        <span className="stepper-arrow">→</span>
        <div className="stepper-item">
          <span className="stepper-num">3</span>
          <span>Interacción</span>
        </div>
        <span className="stepper-arrow">→</span>
        <div className="stepper-item" onClick={() => setIsThemeModalOpen(true)} style={{ cursor: 'pointer' }}>
          <span className="stepper-num">4</span>
          <span>Apariencia</span>
        </div>
        <span className="stepper-arrow">→</span>
        <div className="stepper-item" onClick={() => setIsPublishModalOpen(true)} style={{ cursor: 'pointer' }}>
          <span className="stepper-num">5</span>
          <span>Publicar / QR</span>
        </div>
      </div>

      {/* 2.5 Barra de Estado de Preparación de Tarjetas MindAR */}
      <div
        className="target-compilation-bar"
        style={{
          margin: '0.4rem 1.25rem 0.6rem 1.25rem',
          padding: '0.65rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: project.tracking_status === 'ready'
            ? 'rgba(16, 185, 129, 0.08)'
            : (project.tracking_status === 'compiling' || isCompiling)
            ? 'rgba(0, 242, 254, 0.08)'
            : project.tracking_status === 'error'
            ? 'rgba(244, 63, 94, 0.1)'
            : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${
            project.tracking_status === 'ready'
              ? 'rgba(16, 185, 129, 0.35)'
              : (project.tracking_status === 'compiling' || isCompiling)
              ? 'rgba(0, 242, 254, 0.35)'
              : project.tracking_status === 'error'
              ? 'rgba(244, 63, 94, 0.35)'
              : 'rgba(245, 158, 11, 0.35)'
          }`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {project.tracking_status === 'ready' ? (
            <CheckCircle2 size={20} color="#10b981" />
          ) : (project.tracking_status === 'compiling' || isCompiling) ? (
            <RefreshCw size={20} color="var(--accent-cyan)" className="animate-spin-slow" />
          ) : project.tracking_status === 'error' ? (
            <AlertTriangle size={20} color="#f43f5e" />
          ) : (
            <AlertTriangle size={20} color="#f59e0b" />
          )}

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#ffffff' }}>
              {project.tracking_status === 'ready'
                ? 'Tarjetas listas para AR'
                : (project.tracking_status === 'compiling' || isCompiling)
                ? 'Preparando reconocimiento de imágenes...'
                : project.tracking_status === 'error'
                ? 'No se pudieron preparar las tarjetas'
                : 'Las tarjetas aún no están preparadas'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {project.tracking_status === 'ready'
                ? `Archivo de seguimiento visual compilado y listo para la cámara.`
                : (project.tracking_status === 'compiling' || isCompiling)
                ? 'Extrayendo características visuales con MindAR (esto puede tardar unos segundos)...'
                : project.tracking_status === 'error'
                ? (project.tracking_error || 'Error al procesar las imágenes de las tarjetas.')
                : 'Debes compilar las imágenes para que la cámara del estudiante las reconozca.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {project.tracking_status === 'error' && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem', minHeight: '32px' }}
              onClick={() => setShowErrorDetailModal(true)}
            >
              <span>Ver detalle</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            style={{
              fontSize: '0.8rem',
              padding: '0.45rem 0.95rem',
              fontWeight: 700,
              minHeight: '34px',
              backgroundColor: project.tracking_status === 'ready' ? 'transparent' : 'var(--accent-cyan)',
              color: project.tracking_status === 'ready' ? '#10b981' : '#050b14',
              borderColor: project.tracking_status === 'ready' ? 'rgba(16, 185, 129, 0.4)' : 'var(--accent-cyan)'
            }}
            disabled={isCompiling || project.tracking_status === 'compiling'}
            onClick={handleCompileTargets}
          >
            {isCompiling || project.tracking_status === 'compiling' ? (
              <>
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Preparando...</span>
              </>
            ) : project.tracking_status === 'ready' ? (
              <>
                <RefreshCw size={14} />
                <span>Recompilar tarjetas</span>
              </>
            ) : project.tracking_status === 'error' ? (
              <>
                <RefreshCw size={14} />
                <span>Reintentar</span>
              </>
            ) : (
              <>
                <Sparkles size={14} fill="#050b14" />
                <span>Preparar tarjetas para AR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Área de Trabajo Principal */}
      <div className="editor-workspace">
        {/* Panel Izquierdo: Elementos */}
        <div className={`editor-panel-left ${mobileActiveTab === 'elements' ? 'tab-active' : ''}`}>
          <ElementsPanel
            markers={project.markers || []}
            assets={project.assets || []}
            interactions={project.interactions || []}
            selectedMarkerId={selectedMarkerId}
            selectedAssetId={selectedAssetId}
            projectId={project?.id}
            onSelectMarker={handleSelectMarker}
            onSelectAsset={handleSelectAsset}
            onAddMarker={handleAddMarker}
            onDeleteMarker={handleDeleteMarker}
            onUpdateMarker={handleUpdateMarker}
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

      {/* 4. Barra de Pestañas Inferior para Tablet y Celular */}
      <nav className="editor-mobile-tab-bar">
        <button
          type="button"
          className={`mobile-tab-btn ${mobileActiveTab === 'elements' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab(mobileActiveTab === 'elements' ? 'viewport' : 'elements')}
        >
          <Layers size={18} />
          <span>Tarjetas</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${mobileActiveTab === 'viewport' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('viewport')}
        >
          <Eye size={18} />
          <span>Vista previa</span>
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

      {/* 5. Modales */}
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

      {isThemeModalOpen && (
        <ThemeModal
          isOpen={true}
          onClose={() => setIsThemeModalOpen(false)}
          theme={project.theme || {}}
          projectName={project.name}
          onSaveTheme={(newTheme) => triggerAutoSave({ ...project, theme: newTheme })}
        />
      )}

      {uploadModalTargetMarkerId && (
        <UploadAssetModal
          isOpen={true}
          onClose={() => setUploadModalTargetMarkerId(null)}
          targetMarkerId={uploadModalTargetMarkerId}
          projectId={project?.id}
          onAssetUploaded={handleAssetUploaded}
        />
      )}

      {/* Modal de Detalle de Error en Compilación */}
      {showErrorDetailModal && (
        <div className="modal-backdrop" onClick={() => setShowErrorDetailModal(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="#f43f5e" />
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Detalle del Error de Compilación</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              No se pudo generar el archivo targets.mind para el reconocimiento visual de las tarjetas:
            </p>
            <div
              style={{
                padding: '0.85rem',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#f43f5e',
                wordBreak: 'break-word',
                marginBottom: '1.25rem'
              }}
            >
              {project.tracking_error || 'Error desconocido al compilar las imágenes.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowErrorDetailModal(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowErrorDetailModal(false);
                  handleCompileTargets();
                }}
              >
                <RefreshCw size={14} />
                <span>Reintentar preparación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
