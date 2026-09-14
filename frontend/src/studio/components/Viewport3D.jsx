import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw, Grid, Sparkles, HelpCircle } from 'lucide-react';

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
  const cardMeshRef = useRef(null);
  const animationMixerRef = useRef(null);

  const [showGrid, setShowGrid] = useState(true);
  const gridHelperRef = useRef(null);

  // 1. Inicializar escena Three.js con OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080b11');
    sceneRef.current = scene;

    // Cámara
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.8, 2.6);
    cameraRef.current = camera;

    // Renderer WebGL
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Orbit Controls (Interacción sin necesidad de cámara real)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Vista desde arriba de la tarjeta
    controls.minDistance = 0.5;
    controls.maxDistance = 8;
    controlsRef.current = controls;

    // Iluminación Profesional
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainDirLight.position.set(3, 6, 4);
    mainDirLight.castShadow = true;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0x00f2fe, 1.0);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0x8a2be2, 0.6);
    backLight.position.set(0, 2, -4);
    scene.add(backLight);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(6, 24, 0x00f2fe, 0x1e293b);
    gridHelper.position.y = -0.001;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Base física simulada de la tarjeta impresa
    const cardGroup = new THREE.Group();
    cardGroup.name = 'simulated-target-card';

    const cardGeo = new THREE.BoxGeometry(1.0, 0.01, 1.33);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.1
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.receiveShadow = true;
    cardMesh.position.y = -0.005;
    cardGroup.add(cardMesh);
    cardMeshRef.current = cardMesh;

    // Borde brillante de la tarjeta
    const edgesGeo = new THREE.EdgesGeometry(cardGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 2 });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    edgesMesh.position.y = -0.005;
    cardGroup.add(edgesMesh);

    scene.add(cardGroup);

    // Grupo contenedor para el contenido digital
    const modelWrapper = new THREE.Group();
    modelWrapper.name = 'asset-model-wrapper';
    scene.add(modelWrapper);
    modelWrapperRef.current = modelWrapper;

    // Loop de renderizado
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

      // Animaciones procedurales si existen
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

    // Resize handler
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

  // 2. Actualizar textura de la tarjeta física cuando cambie target_image
  useEffect(() => {
    if (!cardMeshRef.current || !activeMarker?.target_image) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      activeMarker.target_image,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (cardMeshRef.current) {
          cardMeshRef.current.material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.4,
            metalness: 0.05
          });
        }
      },
      undefined,
      (err) => {
        // Si no carga la imagen remota, mantener material por defecto
        if (cardMeshRef.current) {
          cardMeshRef.current.material = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.5,
            metalness: 0.1
          });
        }
      }
    );
  }, [activeMarker?.target_image]);

  // 3. Cargar contenido según el tipo de asset (SIN cubo morado si no hay contenido)
  useEffect(() => {
    const wrapper = modelWrapperRef.current;
    if (!wrapper) return;

    // Limpiar modelos anteriores
    while (wrapper.children.length > 0) {
      wrapper.remove(wrapper.children[0]);
    }

    // SI NO HAY CONTENIDO CARGADO, NO MOSTRAR NADA (SE MUESTRA ESTADO VACÍO EN EL DOM)
    if (!activeAsset) return;

    let isCancelled = false;

    // A) MODELO 3D
    if (activeAsset.type === 'model3d' && activeAsset.file_url) {
      const gltfLoader = new GLTFLoader();
      const modelUrl = activeAsset.file_url;

      if (modelUrl.endsWith('.glb') || modelUrl.endsWith('.gltf') || modelUrl.includes('/models/')) {
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
          () => {
            if (isCancelled) return;
            // Solo si falla la carga del modelo se muestra objeto procedural didáctico
            const procedural = createEditorProceduralModel(activeAsset.configuration?.title || activeMarker?.name || 'Motor');
            wrapper.add(procedural);
          }
        );
      } else {
        const procedural = createEditorProceduralModel(activeAsset.configuration?.title || activeMarker?.name || 'Motor');
        wrapper.add(procedural);
      }
    }
    // B) IMAGEN DIGITAL SUPERPUESTA
    else if (activeAsset.type === 'image' && activeAsset.file_url) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(activeAsset.file_url, (tex) => {
        if (isCancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = (tex.image?.width || 1) / (tex.image?.height || 1);
        const geo = new THREE.PlaneGeometry(0.8 * aspect, 0.8);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.45;
        mesh.rotation.x = -Math.PI / 6; // Ligeramente inclinada hacia la cámara
        wrapper.add(mesh);
      });
    }
    // C) TEXTO EDUCATIVO (Holograma didáctico)
    else if (activeAsset.type === 'text') {
      const textMesh = createTextBoardMesh(
        activeAsset.configuration?.title || 'Información',
        activeAsset.configuration?.description || 'Contenido didáctico para la experiencia de Realidad Aumentada.'
      );
      wrapper.add(textMesh);
    }
    // D) AUDIO DIDÁCTICO
    else if (activeAsset.type === 'audio') {
      const audioBadge = createAudioBadgeMesh(activeAsset.configuration?.title || 'Audio Didáctico');
      wrapper.add(audioBadge);
    }
    // E) VIDEO DIGITAL
    else if (activeAsset.type === 'video') {
      const videoBoard = createVideoPlaceholderMesh(activeAsset.configuration?.title || 'Video');
      wrapper.add(videoBoard);
    }

    return () => {
      isCancelled = true;
    };
  }, [activeAsset?.file_url, activeAsset?.id, activeAsset?.type, activeMarker?.name]);

  // 4. Sincronizar posición, rotación y escala
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
    <div className="editor-viewport-center" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Contenedor WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* ESTADO VACÍO CUANDO NO HAY CONTENIDO CARGADO */}
      {!activeAsset && (
        <div className="viewport-empty-overlay">
          <div className="viewport-empty-card">
            <div className="viewport-empty-title">
              <Sparkles size={20} color="var(--accent-cyan)" />
              <span>Aún no has agregado contenido</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Sigue estos sencillos pasos para ver tu experiencia:
            </p>
            <div className="viewport-empty-steps">
              <div className="viewport-empty-step-item">
                <span className="viewport-empty-step-num">1</span>
                <span>Sube la imagen de tu tarjeta física</span>
              </div>
              <div className="viewport-empty-step-item">
                <span className="viewport-empty-step-num">2</span>
                <span>Agrega un modelo, imagen, video, audio o texto</span>
              </div>
              <div className="viewport-empty-step-item">
                <span className="viewport-empty-step-num">3</span>
                <span>Aquí verás la vista previa en 3D</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD de Controles del Visor 3D */}
      <div className="viewport-hud">
        <button
          type="button"
          className="viewport-hud-btn"
          onClick={resetCamera}
          title="Restablecer posición de la cámara"
        >
          <RotateCw size={14} />
          <span>Centrar</span>
        </button>

        <button
          type="button"
          className="viewport-hud-btn"
          onClick={toggleGrid}
          title="Mostrar u ocultar la cuadrícula del suelo"
          style={{ color: showGrid ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
        >
          <Grid size={14} />
          <span>Cuadrícula</span>
        </button>
      </div>

      {/* Etiqueta de Información del Viewport */}
      <div className="viewport-info-tag">
        Tarjeta: <strong>{activeMarker?.name || 'Tarjeta 1'}</strong> • Arrastra para orbitar • Rueda para zoom
      </div>
    </div>
  );
}

// Generador procedural didáctico para modelos de ejemplo
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

  } else {
    // Generar un átomo / esfera interactiva didáctica identificada como ejemplo
    const sphereGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.2, metalness: 0.8 });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.position.y = 0.45;
    root.add(sphereMesh);

    const orbitGroup = new THREE.Group();
    orbitGroup.name = 'energy-orbits';
    orbitGroup.position.y = 0.45;
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.TorusGeometry(0.55 + i * 0.1, 0.02, 16, 40);
      const ringMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00f2fe : 0x38bdf8 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 3 + i * 0.4;
      orbitGroup.add(ringMesh);
    }
    root.add(orbitGroup);
  }

  return root;
}

// Crea un panel de texto didáctico en 3D
function createTextBoardMesh(title, desc) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Fondo estilizado glass
  ctx.fillStyle = '#0f172a';
  ctx.roundRect(10, 10, 492, 300, 24);
  ctx.fill();
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Título
  ctx.fillStyle = '#00f2fe';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(title, 36, 68);

  // Descripción
  ctx.fillStyle = '#f8fafc';
  ctx.font = '22px sans-serif';
  const words = (desc || '').split(' ');
  let line = '';
  let y = 120;
  for (const w of words) {
    const testLine = line + w + ' ';
    if (ctx.measureText(testLine).width > 440) {
      ctx.fillText(line, 36, y);
      line = w + ' ';
      y += 34;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 36, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1.2, 0.75);
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.5;
  return mesh;
}

// Crea una tarjeta de audio flotante
function createAudioBadgeMesh(title) {
  const canvas = document.createElement('canvas');
  canvas.width = 380;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.roundRect(8, 8, 364, 124, 20);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('🔊 Audio explicativo', 28, 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px sans-serif';
  ctx.fillText(title, 28, 95);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(0.9, 0.35);
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.45;
  return mesh;
}

// Crea una pantalla de video flotante
function createVideoPlaceholderMesh(title) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050b14';
  ctx.fillRect(0, 0, 480, 270);
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 472, 262);

  ctx.fillStyle = '#00f2fe';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('▶ Video AR', 150, 130);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText(title, 140, 180);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1.2, 0.675);
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.5;
  return mesh;
}
