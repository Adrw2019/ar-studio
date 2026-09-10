import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw, Grid, Play, Pause, Maximize2 } from 'lucide-react';

export default function Viewport3D({
  activeAsset,
  activeMarker,
  onTransformChange
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelWrapperRef = useRef(null);
  const animationMixerRef = useRef(null);

  const [showGrid, setShowGrid] = useState(true);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(true);
  const gridHelperRef = useRef(null);

  // Inicializar escena Three.js con OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19');
    sceneRef.current = scene;

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.8, 2.6);
    cameraRef.current = camera;

    // 3. Renderer WebGL
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls (Interacción sin cámara)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // No pasar mucho por debajo del suelo
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controlsRef.current = controls;

    // 5. Iluminación de Estudio Profesional
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainDirLight.position.set(3, 6, 4);
    mainDirLight.castShadow = true;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0x00f2fe, 1.2);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0x8a2be2, 0.8);
    backLight.position.set(0, 2, -4);
    scene.add(backLight);

    // 6. Grid Helper
    const gridHelper = new THREE.GridHelper(6, 24, 0x00f2fe, 0x1e293b);
    gridHelper.position.y = -0.001;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 7. Base física simulada de la tarjeta impresa
    const cardGroup = new THREE.Group();
    cardGroup.name = 'simulated-target-card';

    const cardGeo = new THREE.BoxGeometry(1.0, 0.01, 1.33);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.receiveShadow = true;
    cardMesh.position.y = -0.005;
    cardGroup.add(cardMesh);

    // Borde brillante de la tarjeta
    const edgesGeo = new THREE.EdgesGeometry(cardGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 2 });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    edgesMesh.position.y = -0.005;
    cardGroup.add(edgesMesh);

    scene.add(cardGroup);

    // 8. Grupo contenedor para el modelo 3D del asset
    const modelWrapper = new THREE.Group();
    modelWrapper.name = 'asset-model-wrapper';
    scene.add(modelWrapper);
    modelWrapperRef.current = modelWrapper;

    // 9. Loop de renderizado y animación
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (animationMixerRef.current) {
        animationMixerRef.current.update(delta);
      }

      // Animaciones continuas de piezas procedurales si existen
      const rotor = modelWrapper.getObjectByName('motor-rotor');
      if (rotor) {
        rotor.rotation.y += 2.0 * delta;
      }
      const orbits = modelWrapper.getObjectByName('energy-orbits');
      if (orbits) {
        orbits.rotation.y += 1.5 * delta;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Cargar modelo 3D según el asset seleccionado
  useEffect(() => {
    const wrapper = modelWrapperRef.current;
    if (!wrapper) return;

    // Limpiar modelos anteriores
    while (wrapper.children.length > 0) {
      wrapper.remove(wrapper.children[0]);
    }

    if (!activeAsset) return;

    const gltfLoader = new GLTFLoader();
    const modelUrl = activeAsset.file_url;

    let isCancelled = false;

    // Intentar cargar modelo GLB
    if (modelUrl && (modelUrl.endsWith('.glb') || modelUrl.endsWith('.gltf') || modelUrl.includes('/models/'))) {
      gltfLoader.load(
        modelUrl,
        (gltf) => {
          if (isCancelled) return;
          const model = gltf.scene;
          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });
          wrapper.add(model);

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
            animationMixerRef.current = mixer;
          }
        },
        undefined,
        (err) => {
          // Fallback procedural
          if (isCancelled) return;
          const procedural = createEditorProceduralModel(activeAsset.configuration?.title || activeMarker?.name || 'Motor');
          wrapper.add(procedural);
        }
      );
    } else {
      const procedural = createEditorProceduralModel(activeAsset.configuration?.title || activeMarker?.name || 'Motor');
      wrapper.add(procedural);
    }

    return () => {
      isCancelled = true;
    };
  }, [activeAsset?.file_url, activeAsset?.id, activeMarker?.name]);

  // Sincronizar posición, rotación y escala en tiempo real
  useEffect(() => {
    const wrapper = modelWrapperRef.current;
    if (!wrapper || !activeAsset) return;

    const posX = parseFloat(activeAsset.position_x || 0);
    const posY = parseFloat(activeAsset.position_y || 0);
    const posZ = parseFloat(activeAsset.position_z || 0);

    const rotX = THREE.MathUtils.degToRad(parseFloat(activeAsset.rotation_x || 0));
    const rotY = THREE.MathUtils.degToRad(parseFloat(activeAsset.rotation_y || 0));
    const rotZ = THREE.MathUtils.degToRad(parseFloat(activeAsset.rotation_z || 0));

    const scaX = parseFloat(activeAsset.scale_x || 0.75);
    const scaY = parseFloat(activeAsset.scale_y || 0.75);
    const scaZ = parseFloat(activeAsset.scale_z || 0.75);

    wrapper.position.set(posX, posY, posZ);
    wrapper.rotation.set(rotX, rotY, rotZ);
    wrapper.scale.set(scaX, scaY, scaZ);
  }, [
    activeAsset?.position_x, activeAsset?.position_y, activeAsset?.position_z,
    activeAsset?.rotation_x, activeAsset?.rotation_y, activeAsset?.rotation_z,
    activeAsset?.scale_x, activeAsset?.scale_y, activeAsset?.scale_z
  ]);

  // Alternar visibilidad de Grid
  const toggleGrid = () => {
    if (gridHelperRef.current) {
      const next = !showGrid;
      gridHelperRef.current.visible = next;
      setShowGrid(next);
    }
  };

  // Resetear cámara
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 1.8, 2.6);
      controlsRef.current.target.set(0, 0.2, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="editor-viewport-center" style={{ width: '100%', height: '100%' }}>
      {/* Contenedor DOM Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* HUD de controles 3D */}
      <div className="viewport-hud">
        <button
          type="button"
          className="viewport-hud-btn"
          onClick={resetCamera}
          title="Centrar vista 3D"
        >
          <RotateCw size={14} />
          <span>Centrar</span>
        </button>

        <button
          type="button"
          className="viewport-hud-btn"
          onClick={toggleGrid}
          title="Mostrar/ocultar cuadrícula"
          style={{ color: showGrid ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
        >
          <Grid size={14} />
          <span>Grid</span>
        </button>
      </div>

      {/* Tag de información del viewport */}
      <div className="viewport-info-tag">
        Tarjeta: <strong>{activeMarker?.name || 'Tarjeta 1'}</strong> • Arrastra para orbitar • Rueda para zoom
      </div>
    </div>
  );
}

// Generador procedural didáctico para el visor 3D del Studio
function createEditorProceduralModel(type = '') {
  const root = new THREE.Group();
  const lower = type.toLowerCase();

  if (lower.includes('motor') || lower.includes('rotor')) {
    const baseGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.25, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.12;
    baseMesh.castShadow = true;
    root.add(baseMesh);

    const statorGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.7, 32, 1, true);
    const statorMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide });
    const statorMesh = new THREE.Mesh(statorGeo, statorMat);
    statorMesh.position.y = 0.55;
    root.add(statorMesh);

    const coilMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.95, roughness: 0.15 });
    for (let i = 0; i < 4; i++) {
      const coilGeo = new THREE.TorusGeometry(0.38, 0.05, 16, 32);
      const coilMesh = new THREE.Mesh(coilGeo, coilMat);
      coilMesh.rotation.x = Math.PI / 2;
      coilMesh.position.y = 0.35 + i * 0.12;
      root.add(coilMesh);
    }

    const rotorGroup = new THREE.Group();
    rotorGroup.name = 'motor-rotor';
    rotorGroup.position.y = 0.55;

    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 16);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, metalness: 0.9, roughness: 0.1 });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    rotorGroup.add(shaftMesh);

    for (let i = 0; i < 6; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.32, 0.06, 0.02);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      bladeMesh.rotation.y = (i * Math.PI) / 3;
      rotorGroup.add(bladeMesh);
    }
    root.add(rotorGroup);

  } else if (lower.includes('energ') || lower.includes('bater') || lower.includes('power')) {
    const batteryBodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 32);
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const batteryMesh = new THREE.Mesh(batteryBodyGeo, batteryMat);
    batteryMesh.position.y = 0.5;
    root.add(batteryMesh);

    const coreGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.92, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.6 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 0.5;
    root.add(coreMesh);

    const orbitGroup = new THREE.Group();
    orbitGroup.name = 'energy-orbits';
    orbitGroup.position.y = 0.5;
    for (let i = 0; i < 2; i++) {
      const orbitGeo = new THREE.TorusGeometry(0.55 + i * 0.1, 0.02, 16, 40);
      const orbitMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0x10b981 : 0x34d399 });
      const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
      orbitMesh.rotation.x = Math.PI / 3 + i * 0.4;
      orbitGroup.add(orbitMesh);
    }
    root.add(orbitGroup);

  } else {
    const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2, metalness: 0.8, roughness: 0.2 });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.position.y = 0.45;
    boxMesh.castShadow = true;
    root.add(boxMesh);
  }

  return root;
}
