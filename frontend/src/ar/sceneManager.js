/**
 * AR Studio - Scene Manager
 * Gestiona la escena Three.js, iluminación, renderizado, carga de modelos GLB y modelos procedurales
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
   * Carga un modelo 3D GLB en el anclaje o genera un modelo procedural educativo
   */
  async loadModelForMarker(markerConfig, anchorGroup) {
    const { name, modelUrl, scale = [1, 1, 1], position = [0, 0, 0], rotation = [0, 0, 0] } = markerConfig;

    const wrapperGroup = new THREE.Group();
    wrapperGroup.name = `marker-model-${name}`;
    wrapperGroup.userData = {
      markerConfig,
      initialScale: new THREE.Vector3(...scale),
      targetScale: new THREE.Vector3(...scale),
      isScaling: false
    };

    anchorGroup.add(wrapperGroup);

    // Intentar cargar modelo GLB
    try {
      if (modelUrl) {
        const gltf = await this.loadGLTF(modelUrl);
        const model = gltf.scene;
        model.scale.set(...scale);
        model.position.set(...position);
        model.rotation.set(...rotation);
        
        // Habilitar sombras y materiales brillantes
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.userData.interactive = true;
            node.userData.markerName = name;
          }
        });

        wrapperGroup.add(model);
        this.animatedObjects.push({
          group: wrapperGroup,
          type: 'glb',
          model,
          mixer: gltf.animations && gltf.animations.length > 0 ? new THREE.AnimationMixer(model) : null,
          animations: gltf.animations
        });
        return wrapperGroup;
      }
    } catch (err) {
      console.info(`[SceneManager] Modelo GLB no encontrado en ${modelUrl}. Utilizando modelo procedural de alta fidelidad para "${name}".`);
    }

    // Modelo procedural de respaldo educativo
    const proceduralModel = this.createProceduralModel(name);
    proceduralModel.scale.set(...scale);
    proceduralModel.position.set(...position);
    proceduralModel.rotation.set(...rotation);
    
    wrapperGroup.add(proceduralModel);
    this.animatedObjects.push({
      group: wrapperGroup,
      type: 'procedural',
      name,
      model: proceduralModel
    });

    return wrapperGroup;
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
   * Genera modelos 3D procedurales didácticos con Three.js
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
    } else {
      // Geometría genérica de alta fidelidad
      const cubeGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x8a2be2,
        roughness: 0.2,
        metalness: 0.8
      });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      cube.position.y = 0.4;
      root.add(cube);
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
