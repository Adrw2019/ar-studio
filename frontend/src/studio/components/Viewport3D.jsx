import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw, Grid, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';

export default function Viewport3D({
  className = '',
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
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(null);
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

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler con ResizeObserver y window.resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
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
          if (cardMeshRef.current.material) {
            if (cardMeshRef.current.material.map) {
              cardMeshRef.current.material.map.dispose();
            }
            cardMeshRef.current.material.dispose();
          }
          cardMeshRef.current.material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.4,
            metalness: 0.05
          });
        }
      },
      undefined,
      (err) => {
        if (cardMeshRef.current) {
          if (cardMeshRef.current.material) {
            if (cardMeshRef.current.material.map) {
              cardMeshRef.current.material.map.dispose();
            }
            cardMeshRef.current.material.dispose();
          }
          cardMeshRef.current.material = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.5,
            metalness: 0.1
          });
        }
      }
    );
  }, [activeMarker?.target_image]);

  // 3. Cargar contenido según el tipo de asset (Carga real GLTF / GLB con GLTFLoader)
  useEffect(() => {
    const wrapper = modelWrapperRef.current;
    if (!wrapper) return;

    // Limpiar modelos anteriores del scene y liberar memoria GPU
    while (wrapper.children.length > 0) {
      const child = wrapper.children[0];
      wrapper.remove(child);
      disposeThreeObject(child);
    }

    if (animationMixerRef.current) {
      animationMixerRef.current.stopAllAction();
      animationMixerRef.current = null;
    }

    setModelError(null);
    setModelLoading(false);

    // Si no hay contenido cargado, no mostrar nada
    if (!activeAsset) return;

    let isCancelled = false;

    // A) MODELO 3D REAL (GLB / GLTF)
    if (activeAsset.type === 'model3d') {
      if (activeAsset.file_url) {
        setModelLoading(true);
        setModelError(null);
        const gltfLoader = new GLTFLoader();

        gltfLoader.load(
          activeAsset.file_url,
          (gltf) => {
            if (isCancelled) {
              disposeThreeObject(gltf.scene);
              return;
            }
            setModelLoading(false);
            setModelError(null);

            const model = gltf.scene;
            model.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });

            // Centrar la geometría del modelo en X y Z y asentar la base en Y = 0
            const bbox = new THREE.Box3().setFromObject(model);
            if (!bbox.isEmpty()) {
              const center = bbox.getCenter(new THREE.Vector3());
              model.position.x = -center.x;
              model.position.z = -center.z;
              model.position.y = -bbox.min.y;
            }

            wrapper.add(model);

            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
              animationMixerRef.current = mixer;
            }
          },
          undefined,
          (err) => {
            if (isCancelled) return;
            console.error('[Viewport3D] Error cargando modelo 3D desde:', activeAsset.file_url, err);
            setModelLoading(false);
            setModelError('No se pudo cargar el modelo 3D');
            const errorIndicator = createErrorPlaceholderMesh();
            wrapper.add(errorIndicator);
          }
        );
      } else {
        setModelError('No se ha proporcionado una URL para el modelo 3D');
      }
    }
    // B) IMAGEN DIGITAL SUPERPUESTA
    else if (activeAsset.type === 'image' && activeAsset.file_url) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(activeAsset.file_url, (tex) => {
        if (isCancelled) {
          tex.dispose();
          return;
        }
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
    <div className={`editor-viewport-center ${className}`.trim()} style={{ width: '100%', height: '100%', position: 'relative' }}>
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

      {/* Alerta de Error de Carga de Modelo 3D */}
      {modelError && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '0.45rem 1.1rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <AlertTriangle size={15} />
          <span>{modelError}</span>
        </div>
      )}

      {/* Indicador de Carga */}
      {modelLoading && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            color: 'var(--accent-cyan)',
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <Loader2 size={15} className="animate-spin" />
          <span>Cargando modelo 3D...</span>
        </div>
      )}

      {/* Etiqueta de Información del Viewport */}
      <div className="viewport-info-tag">
        Tarjeta: <strong>{activeMarker?.name || 'Tarjeta 1'}</strong> • Arrastra para orbitar • Rueda para zoom
      </div>
    </div>
  );
}

// Indicador de error 3D claramente identificado (reemplaza cualquier falso modelo placeholder)
function createErrorPlaceholderMesh() {
  const group = new THREE.Group();
  group.name = 'model-load-error-placeholder';

  // Caja wireframe roja de error
  const boxGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.y = 0.35;
  group.add(wireframe);

  // Cartel flotante de error
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1b1b';
  ctx.roundRect(8, 8, 384, 124, 16);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ Error en Modelo 3D', 200, 52);

  ctx.fillStyle = '#f87171';
  ctx.font = '16px sans-serif';
  ctx.fillText('No se pudo cargar el modelo 3D', 200, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const planeGeo = new THREE.PlaneGeometry(0.9, 0.32);
  const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  const badgeMesh = new THREE.Mesh(planeGeo, planeMat);
  badgeMesh.position.y = 0.78;
  group.add(badgeMesh);

  return group;
}

// Limpieza recursiva de objetos Three.js para liberar memoria GPU
function disposeThreeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => disposeMaterial(mat));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(mat) {
  if (!mat) return;
  for (const key of Object.keys(mat)) {
    const value = mat[key];
    if (value && typeof value === 'object' && typeof value.dispose === 'function') {
      value.dispose();
    }
  }
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
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
