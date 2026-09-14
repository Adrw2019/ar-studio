import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Layers, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { resolveAssetPath } from '../utils/paths';
import { apiService } from '../services/api';

export default function TargetPreviewModal({
  isOpen,
  onClose,
  markers = [],
  project = null,
  projectId = null
}) {
  const [selectedFullImage, setSelectedFullImage] = useState(null);
  const [fetchedMarkers, setFetchedMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  // Ref to track what we've already fetched for, preventing re-fetches
  const lastFetchKey = useRef(null);

  // Obtención segura de marcadores — runs only when the modal opens or the real project changes
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // If markers were passed directly via props, use them — no fetch needed
    const propsMarkers = (markers && markers.length > 0) ? markers : null;
    const projectMarkers = (project?.markers && project.markers.length > 0) ? project.markers : null;

    if (propsMarkers || projectMarkers) {
      console.log('[TargetPreview] Usando marcadores de props/project, sin fetch.', {
        propsCount: propsMarkers?.length || 0,
        projectMarkersCount: projectMarkers?.length || 0
      });
      setLoading(false);
      setFetchError(null);
      return;
    }

    // Resolve project identifier
    const targetProjectId = projectId || project?.id || project?.slug || null;

    console.log('[TargetPreview] project:', project);
    console.log('[TargetPreview] projectId:', projectId);
    console.log('[TargetPreview] markers recibidos:', markers);
    console.log('[TargetPreview] targetProjectId resuelto:', targetProjectId);

    // Build a stable key for this fetch to avoid re-fetching
    const fetchKey = targetProjectId || '__global__';
    if (lastFetchKey.current === fetchKey && fetchedMarkers.length > 0) {
      console.log('[TargetPreview] Ya se consultaron marcadores para:', fetchKey);
      return;
    }

    const controller = new AbortController();

    async function fetchMarkers() {
      setLoading(true);
      setFetchError(null);

      try {
        let markerList = [];

        if (targetProjectId) {
          // 1. Try dedicated markers endpoint
          console.log('[TargetPreview] Consultando GET /api/markers/project/' + targetProjectId);
          const markersData = await apiService.getMarkersByProject(targetProjectId);
          markerList = Array.isArray(markersData) ? markersData
            : Array.isArray(markersData?.markers) ? markersData.markers
            : [];

          console.log('[TargetPreview] Respuesta getMarkersByProject:', markersData);

          // 2. Fallback: get project by ID and extract .markers
          if (markerList.length === 0) {
            console.log('[TargetPreview] Sin marcadores directos, fallback a getProjectById');
            const fullProject = await apiService.getProjectById(targetProjectId);
            console.log('[TargetPreview] Respuesta getProjectById:', fullProject);
            if (fullProject?.markers && Array.isArray(fullProject.markers)) {
              markerList = fullProject.markers;
            }
          }
        } else {
          // No project specified — global mode (e.g. Home page)
          console.log('[TargetPreview] Sin projectId, consultando primer proyecto disponible');
          const projectsList = await apiService.getProjects();
          if (projectsList && projectsList.length > 0) {
            const firstProj = projectsList[0];
            console.log('[TargetPreview] Primer proyecto:', firstProj.id, firstProj.name);
            const fullProj = await apiService.getProjectById(firstProj.id);
            if (fullProj?.markers && Array.isArray(fullProj.markers)) {
              markerList = fullProj.markers;
            }
          }
        }

        if (!controller.signal.aborted) {
          console.log('[TargetPreview] Marcadores resueltos:', markerList.length, markerList);
          setFetchedMarkers(markerList);
          lastFetchKey.current = fetchKey;
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[TargetPreview] Error cargando tarjetas:', err);
          setFetchedMarkers([]);
          setFetchError(err.message || 'Error al cargar tarjetas');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchMarkers();

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId, project?.id]);
  // Note: `markers` is intentionally excluded — its array reference changes every render
  // and would cause an infinite loop. We read it directly in the render phase instead.

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Consolidar lista de marcadores real respetando el proyecto
  const rawList = (markers && markers.length > 0)
    ? markers
    : (project?.markers && project.markers.length > 0)
      ? project.markers
      : fetchedMarkers;

  // Ordenar estrictamente por target_index ascendente
  const activeMarkers = [...rawList].sort((a, b) => {
    const idxA = a.target_index !== undefined ? a.target_index : (a.targetIndex !== undefined ? a.targetIndex : 0);
    const idxB = b.target_index !== undefined ? b.target_index : (b.targetIndex !== undefined ? b.targetIndex : 0);
    return idxA - idxB;
  });

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-content"
          style={{
            maxWidth: '820px',
            width: 'calc(100vw - 24px)',
            maxHeight: 'calc(100dvh - 24px)',
            overflowY: 'auto',
            padding: '1.5rem'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Layers size={22} color="var(--accent-cyan)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Tarjetas de Seguimiento AR</h2>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
            Apunta la cámara de tu celular o tablet hacia una de estas tarjetas (puedes imprimirlas o abrirlas en otra pantalla):
          </p>

          {/* Estado de Carga */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={32} className="animate-spin-slow" style={{ margin: '0 auto 0.75rem auto', color: 'var(--accent-cyan)' }} />
              <p style={{ fontSize: '0.9rem' }}>Cargando tarjetas físicas del proyecto...</p>
            </div>
          ) : activeMarkers.length === 0 ? (
            /* Estado Vacío: Se muestra SOLAMENTE si markers.length === 0 */
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed var(--border-glass)' }}>
              <Layers size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                No hay tarjetas configuradas en este proyecto.
              </p>
            </div>
          ) : (
            /* Cuadrícula Responsive de Tarjetas Físicas:
               - Móvil: 1 columna
               - Tablet: 2 columnas
               - PC: hasta 3 columnas */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '1.1rem',
                width: '100%'
              }}
            >
              {activeMarkers.map((marker, idx) => {
                const targetIdx = marker.target_index !== undefined
                  ? marker.target_index
                  : (marker.targetIndex !== undefined ? marker.targetIndex : idx);

                // Campo persistente de imagen en Cloudinary
                const rawImage = marker.target_image || marker.targetImage;
                const targetImg = rawImage ? resolveAssetPath(rawImage) : null;
                const cardName = marker.name || `Tarjeta ${targetIdx + 1}`;

                return (
                  <div
                    key={marker.id || idx}
                    style={{
                      background: 'rgba(13, 18, 29, 0.75)',
                      border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.12))',
                      borderRadius: '18px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                      transition: 'transform var(--transition-fast), border-color var(--transition-fast)'
                    }}
                  >
                    {/* Encabezado de la Tarjeta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cardName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--accent-cyan)',
                          backgroundColor: 'rgba(0, 242, 254, 0.12)',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          borderRadius: '999px',
                          padding: '0.15rem 0.55rem',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Target #{targetIdx}
                      </span>
                    </div>

                    {/* Contenedor Visual de la Tarjeta (Miniatura) */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1.25',
                        maxHeight: '260px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                        border: '2px solid rgba(15, 23, 42, 0.15)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      {targetImg ? (
                        <img
                          src={targetImg}
                          alt={cardName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                          <ImageIcon size={36} color="#94a3b8" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                            Imagen pendiente
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acción: Ver imagen completa en Lightbox */}
                    {targetImg ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          fontSize: '0.85rem',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          marginTop: 'auto'
                        }}
                        onClick={() => setSelectedFullImage({
                          url: targetImg,
                          name: cardName,
                          targetIdx
                        })}
                      >
                        <Eye size={16} />
                        <span>Ver imagen completa</span>
                      </button>
                    ) : (
                      <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Sin imagen física asignada
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Botón de Impresión */}
          {activeMarkers.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '44px', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => window.print()}
              >
                <Printer size={18} />
                <span>Imprimir Tarjetas</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Modal para Ver Imagen Completa */}
      {selectedFullImage && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1200, background: 'rgba(0, 0, 0, 0.92)' }}
          onClick={() => setSelectedFullImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.85rem',
              background: '#0d121d',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '1.25rem',
              boxShadow: '0 8px 40px rgba(0, 0, 0, 0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem' }}>
                  {selectedFullImage.name}
                </span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  (Target #{selectedFullImage.targetIdx})
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                style={{ minHeight: '44px', minWidth: '44px' }}
                onClick={() => setSelectedFullImage(null)}
                aria-label="Cerrar imagen completa"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                width: '100%',
                maxHeight: '70vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '12px',
                overflow: 'hidden'
              }}
            >
              <img
                src={selectedFullImage.url}
                alt={selectedFullImage.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain'
                }}
              />
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
              💡 Puedes apuntar la cámara de tu celular hacia esta pantalla para escanear y probar el reconocimiento AR.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
