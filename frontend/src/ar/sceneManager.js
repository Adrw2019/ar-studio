/**
 * AR Studio - Scene Manager
 * Gestiona la escena Three.js, iluminación, renderizado, carga de modelos GLB y modelos procedurales
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { resolveAssetPath } from '../utils/paths';

export class SceneManager {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gltfLoader = new GLTFLoader();
    this.animatedObjects = [];
    this.isMotorActive = false;
    this.motorSpeedMultiplier = 1.0;

    this.setupLighting();
  }

  /**
   * Configura iluminación realista y vibrante para visualización AR móvil
   */
  setupLighting() {
    // Luz ambiental suave para evitar sombras completamente oscuras
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Luz direccional frontal/superior
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(2, 5, 4);
    this.scene.add(directionalLight);

    // Luz de relleno lateral con tonalidad cian tecnológica
    const fillLight = new THREE.DirectionalLight(0x00f2fe, 1.0);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);

    // Luz de acento inferior
    const bottomLight = new THREE.DirectionalLight(0x8a2be2, 0.6);
    bottomLight.position.set(0, -3, 2);
    this.scene.add(bottomLight);
  }

  /**
   * Carga todos los assets asociados a un marcador en su anchorGroup de MindAR.
   * Soporta múltiples assets por tarjeta (model3d, image, text, video, audio).
   * Respeta transformaciones guardadas en el editor: position, rotation, scale.
   */
  async loadAssetsForMarker(markerConfig, anchorGroup) {
    const assets = markerConfig.assets || [];
    const markerName = markerConfig.name || 'Tarjeta';

    // Si no hay assets configurados y es un marcador demo, soportar procedural didáctico
    if (assets.length === 0) {
      if (markerName.toLowerCase() === 'motor' || markerName.toLowerCase().includes('energ')) {
        const demoModel = this.createProceduralModel(markerName);
        const wrapper = new THREE.Group();
        wrapper.name = `marker-model-${markerName}`;
        wrapper.userData = {
          markerConfig,
          initialScale: new THREE.Vector3(0.75, 0.75, 0.75),
          targetScale: new THREE.Vector3(0.75, 0.75, 0.75),
          isScaling: false
        };
        wrapper.add(demoModel);
        anchorGroup.add(wrapper);
        this.animatedObjects.push({
          group: wrapper,
          type: 'procedural',
          name: markerName,
          model: demoModel
        });
      } else {
        console.info(`[SceneManager] Marcador "${markerName}" no tiene contenido digital configurado.`);
      }
      return;
    }

    // Cargar todos los assets asignados a esta tarjeta
    for (const asset of assets) {
      await this.loadSingleAsset(markerConfig, asset, anchorGroup);
    }
  }

  /**
   * Carga un único asset digital (3D GLB, imagen, texto didáctico, etc.)
   */
  async loadSingleAsset(markerConfig, asset, anchorGroup) {
    const markerName = markerConfig.name || 'Tarjeta';
    const assetId = asset.id || `asset-${Date.now()}`;
    const assetType = (asset.type || 'model3d').toLowerCase();

    // Transformaciones exactas guardadas por el editor
    const position = asset.position || [
      parseFloat(asset.position_x ?? 0),
      parseFloat(asset.position_y ?? 0),
      parseFloat(asset.position_z ?? 0)
    ];

    const rotation = asset.rotation || [
      THREE.MathUtils.degToRad(parseFloat(asset.rotation_x ?? 0)),
      THREE.MathUtils.degToRad(parseFloat(asset.rotation_y ?? 0)),
      THREE.MathUtils.degToRad(parseFloat(asset.rotation_z ?? 0))
    ];

    const scale = asset.scale || [
      parseFloat(asset.scale_x ?? 0.75),
      parseFloat(asset.scale_y ?? 0.75),
      parseFloat(asset.scale_z ?? 0.75)
    ];

    const assetGroup = new THREE.Group();
    assetGroup.name = `marker-model-${markerName}-${assetId}`;
    assetGroup.position.set(position[0], position[1], position[2]);
    assetGroup.rotation.set(rotation[0], rotation[1], rotation[2]);
    assetGroup.scale.set(scale[0], scale[1], scale[2]);
    assetGroup.userData = {
      markerConfig,
      asset,
      markerName,
      assetId,
      initialScale: new THREE.Vector3(...scale),
      targetScale: new THREE.Vector3(...scale),
      isScaling: false,
      info: asset.configuration || {
        title: asset.name || markerName,
        description: markerConfig.description || 'Elemento didáctico interactivo.'
      }
    };

    anchorGroup.add(assetGroup);

    // ==========================================
    // A) MODELO 3D REAL (GLB / GLTF)
    // ==========================================
    if (assetType === 'model3d' || assetType === 'model') {
      const fileUrl = (asset.file_url || asset.url || asset.asset_url || asset.model_url || '').trim();

      if (!fileUrl) {
        console.warn(`[SceneManager] Asset 3D (${assetId}) no tiene URL de archivo.`);
        return;
      }

      const isExternal = fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:') || fileUrl.startsWith('blob:');
      const resolvedUrl = isExternal ? fileUrl : resolveAssetPath(fileUrl);

      try {
        const gltf = await this.loadGLTF(resolvedUrl);
        const model = gltf.scene;

        // Activar sombras y metadatos de interacción táctil
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.userData.interactive = true;
            node.userData.markerName = markerName;
            node.userData.asset = asset;
            node.userData.info = assetGroup.userData.info;
          }
        });

        // Centrar la geometría del modelo en X y Z y asentar la base en Y = 0 (exactamente igual que Viewport3D)
        const bbox = new THREE.Box3().setFromObject(model);
        if (!bbox.isEmpty()) {
          const center = bbox.getCenter(new THREE.Vector3());
          model.position.x = -center.x;
          model.position.z = -center.z;
          model.position.y = -bbox.min.y;
        }

        assetGroup.add(model);

        let mixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }

        this.animatedObjects.push({
          group: assetGroup,
          type: 'glb',
          model,
          mixer,
          animations: gltf.animations
        });
      } catch (err) {
        // NUNCA utilizar un cubo morado ante un error de carga de GLB
        console.error('Error cargando GLB real:', resolvedUrl, err);

        // Si es proyecto demo de prueba ("Motor" o "Energía"), permitir respaldo didáctico
        if (markerName.toLowerCase() === 'motor' || markerName.toLowerCase().includes('energ')) {
          const proceduralModel = this.createProceduralModel(markerName);
          assetGroup.add(proceduralModel);
          this.animatedObjects.push({
            group: assetGroup,
            type: 'procedural',
            name: markerName,
            model: proceduralModel
          });
        } else {
          // Para proyectos de usuario: mostrar mensaje entendible de error en 3D
          const errorBoard = this.createErrorBoardMesh('No se pudo cargar el contenido 3D');
          assetGroup.add(errorBoard);
        }
      }
    }
    // ==========================================
    // B) IMAGEN DIGITAL SUPERPUESTA
    // ==========================================
    else if (assetType === 'image') {
      const fileUrl = (asset.file_url || asset.url || '').trim();
      if (fileUrl) {
        const textureLoader = new THREE.TextureLoader();
        // Configurar crossOrigin solo para URLs de red (no para blob:)
        if (!fileUrl.startsWith('blob:')) {
          textureLoader.setCrossOrigin('anonymous');
        }
        textureLoader.load(
          fileUrl,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const aspect = (texture.image?.width || 1) / (texture.image?.height || 1);
            const geo = new THREE.PlaneGeometry(0.8 * aspect, 0.8);
            const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 0.45;
            mesh.rotation.x = -Math.PI / 6;
            mesh.userData.interactive = true;
            mesh.userData.markerName = markerName;
            assetGroup.add(mesh);
          },
          undefined,
          (err) => console.error('[SceneManager] Error cargando imagen:', fileUrl, err)
        );
      }
    }
    // ==========================================
    // C) TEXTO EDUCATIVO (Holograma didáctico)
    // ==========================================
    else if (assetType === 'text') {
      const title = asset.configuration?.title || asset.name || 'Información';
      const desc = asset.configuration?.description || 'Contenido didáctico para la experiencia de Realidad Aumentada.';
      const textMesh = this.createTextBoardMesh(title, desc);
      textMesh.userData.interactive = true;
      textMesh.userData.markerName = markerName;
      assetGroup.add(textMesh);
    }
    // ==========================================
    // D) AUDIO DIDÁCTICO
    // ==========================================
    else if (assetType === 'audio') {
      const fileUrl = (asset.file_url || asset.url || '').trim();
      const title = asset.configuration?.title || 'Audio Didáctico';
      const audioBadge = this.createAudioBadgeMesh(title);
      audioBadge.userData.interactive = true;
      audioBadge.userData.markerName = markerName;

      // Preparar elemento <audio> para reproducción por interacción del usuario
      // Safari/iOS requiere que la reproducción con sonido sea iniciada por el usuario
      if (fileUrl) {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = fileUrl;
        // NO hacer autoplay con sonido
        audioBadge.userData.audioElement = audio;
        audioBadge.userData.audioUrl = fileUrl;
      }

      assetGroup.add(audioBadge);
    }
    // ==========================================
    // E) VIDEO DIGITAL
    // ==========================================
    else if (assetType === 'video') {
      const fileUrl = (asset.file_url || asset.url || '').trim();
      const title = asset.configuration?.title || 'Video';
      const videoBoard = this.createVideoPlaceholderMesh(title);
      videoBoard.userData.interactive = true;
      videoBoard.userData.markerName = markerName;

      // Preparar elemento <video> con playsinline para evitar fullscreen en iOS
      if (fileUrl) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.playsInline = true;
        video.src = fileUrl;
        // NO hacer autoplay - requiere interacción del usuario (especialmente en Safari)
        videoBoard.userData.videoElement = video;
        videoBoard.userData.videoUrl = fileUrl;
      }

      assetGroup.add(videoBoard);
    }
  }

  /**
   * Retrocompatibilidad con implementaciones previas
   */
  async loadModelForMarker(markerConfig, anchorGroup) {
    if (markerConfig.assets && markerConfig.assets.length > 0) {
      return this.loadAssetsForMarker(markerConfig, anchorGroup);
    }

    const legacyAsset = {
      id: markerConfig.id || 'legacy-asset',
      type: 'model3d',
      file_url: markerConfig.modelUrl,
      position: markerConfig.position,
      rotation: markerConfig.rotation,
      scale: markerConfig.scale,
      configuration: markerConfig.info
    };
    return this.loadSingleAsset(markerConfig, legacyAsset, anchorGroup);
  }

  /**
   * Promisifica GLTFLoader
   */
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err)
      );
    });
  }

  /**
   * Panel 3D claro y entendible cuando un archivo 3D no puede cargarse
   */
  createErrorBoardMesh(message = 'No se pudo cargar el contenido 3D') {
    const group = new THREE.Group();
    group.name = 'error-indicator-board';

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');

    // Fondo estilo HUD de advertencia
    ctx.fillStyle = 'rgba(24, 18, 24, 0.92)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 160, 20);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Ícono y título
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ Error en Contenido 3D', 256, 65);

    // Mensaje
    ctx.fillStyle = '#fca5a5';
    ctx.font = '20px sans-serif';
    ctx.fillText(message, 256, 115);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const planeGeo = new THREE.PlaneGeometry(1.0, 0.35);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.position.y = 0.4;
    mesh.rotation.x = -Math.PI / 8;
    group.add(mesh);

    return group;
  }

  /**
   * Panel didáctico en 3D para textos educativos
   */
  createTextBoardMesh(title, desc) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 300, 24);
    ctx.fill();
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(title, 36, 68);

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
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.45;
    mesh.rotation.x = -Math.PI / 8;
    return mesh;
  }

  /**
   * Badge 3D para audio didáctico
   */
  createAudioBadgeMesh(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(8, 8, 364, 104, 16);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔊 ${title}`, 190, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(0.85, 0.28);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.45;
    return mesh;
  }

  /**
   * Placeholder 3D para video
   */
  createVideoPlaceholderMesh(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#080b11';
    ctx.beginPath();
    ctx.roundRect(8, 8, 464, 254, 16);
    ctx.fill();
    ctx.strokeStyle = '#8a2be2';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`▶ ${title}`, 240, 145);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(1.1, 0.62);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.45;
    return mesh;
  }

  /**
   * Genera modelos 3D procedurales didácticos para el laboratorio de demostración (Motor y Energía)
   */
  createProceduralModel(type) {
    const root = new THREE.Group();
    root.name = `procedural-${type}`;

    if (type.toLowerCase() === 'motor') {
      // Base / Carcasa exterior del motor
      const baseGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.25, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.12;
      root.add(baseMesh);

      // Estator cilíndrico
      const statorGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.7, 32, 1, true);
      const statorMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.9,
        roughness: 0.3,
        side: THREE.DoubleSide
      });
      const statorMesh = new THREE.Mesh(statorGeo, statorMat);
      statorMesh.position.y = 0.55;
      root.add(statorMesh);

      // Bobinas de cobre (anillos brillantes)
      const coilMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        emissive: 0x78350f,
        emissiveIntensity: 0.2,
        metalness: 0.95,
        roughness: 0.15
      });

      for (let i = 0; i < 4; i++) {
        const coilGeo = new THREE.TorusGeometry(0.38, 0.05, 16, 32);
        const coilMesh = new THREE.Mesh(coilGeo, coilMat);
        coilMesh.rotation.x = Math.PI / 2;
        coilMesh.position.y = 0.35 + i * 0.12;
        root.add(coilMesh);
      }

      // Rotor central giratorio
      const rotorGroup = new THREE.Group();
      rotorGroup.name = 'motor-rotor';
      rotorGroup.position.y = 0.55;

      const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 16);
      const shaftMat = new THREE.MeshStandardMaterial({
        color: 0x00f2fe,
        emissive: 0x00f2fe,
        emissiveIntensity: 0.3,
        metalness: 0.9,
        roughness: 0.1
      });
      const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
      rotorGroup.add(shaftMesh);

      // Paletas del ventilador/rotor
      for (let i = 0; i < 6; i++) {
        const bladeGeo = new THREE.BoxGeometry(0.32, 0.06, 0.02);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.8,
          roughness: 0.2
        });
        const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
        bladeMesh.rotation.y = (i * Math.PI) / 3;
        rotorGroup.add(bladeMesh);
      }

      root.add(rotorGroup);

      // Anillo de energía pulsante
      const glowRingGeo = new THREE.RingGeometry(0.65, 0.72, 32);
      const glowRingMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = 0.02;
      glowRing.name = 'motor-glow-ring';
      root.add(glowRing);

    } else if (type.toLowerCase() === 'energía' || type.toLowerCase() === 'energia') {
      // Celda de Energía futurista
      const batteryBodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 32);
      const batteryMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.2
      });
      const batteryMesh = new THREE.Mesh(batteryBodyGeo, batteryMat);
      batteryMesh.position.y = 0.5;
      root.add(batteryMesh);

      // Núcleo brillante de energía
      const coreGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.92, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.8,
        roughness: 0.1
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 0.5;
      coreMesh.name = 'energy-core';
      root.add(coreMesh);

      // Anillos orbitales flotantes
      const orbitGroup = new THREE.Group();
      orbitGroup.name = 'energy-orbits';
      orbitGroup.position.y = 0.5;

      for (let i = 0; i < 2; i++) {
        const orbitGeo = new THREE.TorusGeometry(0.55 + i * 0.1, 0.02, 16, 40);
        const orbitMat = new THREE.MeshBasicMaterial({
          color: i === 0 ? 0x10b981 : 0x34d399,
          transparent: true,
          opacity: 0.8
        });
        const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
        orbitMesh.rotation.x = Math.PI / 3 + i * 0.4;
        orbitMesh.rotation.y = i * 0.5;
        orbitGroup.add(orbitMesh);
      }
      root.add(orbitGroup);

      // Terminal positivo superior
      const terminalGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
      const terminalMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.1
      });
      const terminalMesh = new THREE.Mesh(terminalGeo, terminalMat);
      terminalMesh.position.y = 1.05;
      root.add(terminalMesh);
    }

    // Marcar todos los sub-meshes como interactivos
    root.traverse((child) => {
      if (child.isMesh) {
        child.userData.interactive = true;
        child.userData.markerName = type;
      }
    });

    return root;
  }

  /**
   * Actualiza animaciones continuas en cada frame de renderizado
   */
  update(delta = 0.016) {
    this.animatedObjects.forEach((item) => {
      // Si tiene AnimationMixer de GLTF
      if (item.mixer) {
        item.mixer.update(delta);
      }

      // Animaciones procedurales dinámicas
      if (item.type === 'procedural') {
        const rotor = item.model.getObjectByName('motor-rotor');
        if (rotor) {
          const speed = (this.isMotorActive ? 12.0 : 1.5) * this.motorSpeedMultiplier;
          rotor.rotation.y += speed * delta;
        }

        const glowRing = item.model.getObjectByName('motor-glow-ring');
        if (glowRing) {
          const scalePulse = 1 + Math.sin(Date.now() * 0.005) * 0.08;
          glowRing.scale.set(scalePulse, scalePulse, 1);
          if (this.isMotorActive) {
            glowRing.material.opacity = 0.9 + Math.sin(Date.now() * 0.02) * 0.1;
          }
        }

        const orbits = item.model.getObjectByName('energy-orbits');
        if (orbits) {
          orbits.rotation.y += 1.8 * delta;
          orbits.rotation.x += 0.8 * delta;
        }

        const core = item.model.getObjectByName('energy-core');
        if (core && core.material) {
          core.material.emissiveIntensity = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;
        }
      }

      // Interpolación elástica de escala para interacción táctil
      if (item.group && item.group.userData) {
        const { targetScale, initialScale, isScaling } = item.group.userData;
        if (targetScale && isScaling) {
          item.group.scale.lerp(targetScale, 0.18);
          // Si ya está cerca del targetScale, regresar a escala inicial
          if (item.group.scale.distanceTo(targetScale) < 0.01) {
            item.group.userData.targetScale = initialScale.clone();
            if (item.group.scale.distanceTo(initialScale) < 0.02) {
              item.group.userData.isScaling = false;
              item.group.scale.copy(initialScale);
            }
          }
        }
      }
    });
  }

  /**
   * Activa o desactiva la interacción del motor (animación rápida)
   */
  setMotorActive(active) {
    this.isMotorActive = active;
  }

  /**
   * Restaura la escena y las transformaciones al estado original
   */
  reset() {
    this.isMotorActive = false;
    this.motorSpeedMultiplier = 1.0;
    this.animatedObjects.forEach((item) => {
      if (item.group && item.group.userData && item.group.userData.initialScale) {
        item.group.scale.copy(item.group.userData.initialScale);
        item.group.userData.targetScale = item.group.userData.initialScale.clone();
        item.group.userData.isScaling = false;
      }
    });
  }
}
