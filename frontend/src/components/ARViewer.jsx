import React, { useEffect, useRef } from 'react';
import { MindARManager } from '../ar/mindarManager';
import { SceneManager } from '../ar/sceneManager';
import { InteractionManager } from '../ar/interactionManager';
import { demoMarkers as fallbackDemoMarkers, interactionRules as fallbackRules } from '../ar/config';

export default function ARViewer({
  markers: propMarkers,
  assets: propAssets,
  interactionRules: propRules,
  mindFileUrl,
  onStatusChange,
  onObjectTouched,
  onInteractionChange,
  onError,
  onLoaded,
  resetTrigger
}) {
  const containerRef = useRef(null);
  const mindarManagerRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const interactionManagerRef = useRef(null);
  const activeTargetsCount = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;
    if (!container) return;

    // Normalizar marcadores y assets pasados por prop
    let resolvedMarkers = fallbackDemoMarkers;
    let resolvedRules = propRules && propRules.length > 0 ? propRules : fallbackRules;

    if (propMarkers && propMarkers.length > 0) {
      resolvedMarkers = propMarkers.map((m, idx) => {
        const associatedAsset = (propAssets || []).find(a => a.marker_id === m.id) || (propAssets || [])[idx] || {};
        return {
          id: m.id || idx,
          name: m.name,
          targetIndex: m.target_index ?? idx,
          modelUrl: associatedAsset.file_url || '/models/motor.glb',
          scale: [
            parseFloat(associatedAsset.scale_x ?? 0.75),
            parseFloat(associatedAsset.scale_y ?? 0.75),
            parseFloat(associatedAsset.scale_z ?? 0.75)
          ],
          position: [
            parseFloat(associatedAsset.position_x ?? 0),
            parseFloat(associatedAsset.position_y ?? 0),
            parseFloat(associatedAsset.position_z ?? 0)
          ],
          rotation: [
            parseFloat(associatedAsset.rotation_x ?? 0) * (Math.PI / 180),
            parseFloat(associatedAsset.rotation_y ?? 0) * (Math.PI / 180),
            parseFloat(associatedAsset.rotation_z ?? 0) * (Math.PI / 180)
          ],
          info: associatedAsset.configuration || {
            title: m.name,
            description: m.description || 'Objeto de Realidad Aumentada interactivo.'
          }
        };
      });
    }

    // Normalizar reglas
    const normalizedRules = resolvedRules.map((r, i) => ({
      id: r.id || `rule-${i}`,
      name: r.name || 'Regla Multi-Tarjeta',
      requiredMarkers: r.trigger_config?.required_markers || r.requiredMarkers || ['Motor', 'Energía'],
      action: r.action_type || r.action || 'startMotor',
      title: r.action_config?.title || r.title || '⚡ ¡Interacción Activada!',
      message: r.action_config?.message || r.message || 'Tarjetas detectadas e interactuando.'
    }));

    async function initAR() {
      try {
        // 1. Instanciar MindAR Manager
        const mindarManager = new MindARManager({
          container,
          imageTargetSrc: mindFileUrl || '/markers/targets.mind',
          maxTrack: Math.max(2, resolvedMarkers.length),
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no'
        });
        mindarManagerRef.current = mindarManager;

        // 2. Inicializar Three.js y MindAR
        const { scene, camera, renderer } = await mindarManager.initialize();

        if (!isMounted) {
          mindarManager.stop();
          return;
        }

        // 3. Instanciar Scene Manager
        const sceneManager = new SceneManager(scene, camera, renderer);
        sceneManagerRef.current = sceneManager;

        // 4. Instanciar Interaction Manager (Touch Raycaster)
        const interactionManager = new InteractionManager({
          camera,
          scene,
          container,
          sceneManager,
          onObjectTouched: (markerName, userData) => {
            const markerConfig = resolvedMarkers.find(m => m.name === markerName) || {
              name: markerName,
              info: {
                title: markerName,
                description: 'Elemento de Realidad Aumentada interactivo.'
              }
            };
            onObjectTouched(markerConfig);
          },
          onInteractionTriggered: (rule) => {
            onInteractionChange({
              active: true,
              title: rule.title,
              message: rule.message
            });
          },
          onInteractionEnded: (rule) => {
            onInteractionChange({
              active: false,
              title: '',
              message: ''
            });
          }
        });
        interactionManagerRef.current = interactionManager;

        // 5. Configurar cada marcador
        for (const markerConfig of resolvedMarkers) {
          const anchor = mindarManager.addAnchor(markerConfig.targetIndex);

          // Cargar modelo 3D o procedural
          await sceneManager.loadModelForMarker(markerConfig, anchor.group);

          // Listeners de anclaje
          anchor.onTargetFound = () => {
            if (!isMounted) return;
            activeTargetsCount.current += 1;
            anchor.group.visible = true;
            onStatusChange({
              status: 'detected',
              markerName: markerConfig.name
            });
            interactionManager.updateMarkerVisibility(markerConfig.name, true, normalizedRules);
          };

          anchor.onTargetLost = () => {
            if (!isMounted) return;
            activeTargetsCount.current = Math.max(0, activeTargetsCount.current - 1);
            anchor.group.visible = false;
            interactionManager.updateMarkerVisibility(markerConfig.name, false, normalizedRules);

            if (activeTargetsCount.current === 0) {
              onStatusChange({
                status: 'lost',
                markerName: null
              });
            }
          };
        }

        // 6. Configurar bucle de renderizado continuo
        renderer.setAnimationLoop(() => {
          sceneManager.update();
          renderer.render(scene, camera);
        });

        // 7. Arrancar cámara y tracking
        await mindarManager.start();

        if (isMounted) {
          onLoaded();
        }
      } catch (err) {
        console.error('[ARViewer] Error en el pipeline AR:', err);
        if (isMounted) {
          onError(err.message || 'No se pudo iniciar la experiencia de Realidad Aumentada.');
        }
      }
    }

    initAR();

    return () => {
      isMounted = false;
      if (interactionManagerRef.current) {
        interactionManagerRef.current.destroy();
      }
      if (mindarManagerRef.current) {
        mindarManagerRef.current.stop();
      }
    };
  }, [propMarkers, propAssets, propRules, mindFileUrl]);

  // Manejar trigger de reinicio
  useEffect(() => {
    if (resetTrigger > 0) {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.reset();
      }
      if (interactionManagerRef.current) {
        interactionManagerRef.current.reset();
      }
    }
  }, [resetTrigger]);

  return <div ref={containerRef} className="ar-scene-container" />;
}
