import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DailyEntry } from '../types';
import { 
  Sparkles, 
  RotateCcw, 
  Eye, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  Sun, 
  Moon, 
  Sunset,
  Calendar,
  Layers,
  Info
} from 'lucide-react';

interface ZenSanctuary3DProps {
  entries: DailyEntry[];
  onSelectDate: (date: string) => void;
  onClose?: () => void;
}

// Scratch math helpers at module scope to ensure zero GC in animation loop
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

// Sound synthesizer using Web Audio API (Zero external audio files)
class ZenAudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play Tibetan Singing Bowl chime
  playBowl(freq = 432, duration = 3.2) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Base fundamental & harmonic overtones
      const freqs = [freq, freq * 2.01, freq * 3.02, freq * 4.76];
      const gains = [0.4, 0.25, 0.12, 0.05];

      freqs.forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        // Gentle envelope attack and long ringing decay
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gains[i], now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Audio playback not permitted yet:', e);
    }
  }

  // Soft water drop sound
  playWaterDrop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      // ignore
    }
  }
}

const zenAudio = new ZenAudioSynthesizer();

// Generate procedural stone bump texture using 2D canvas
function createStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b8e88';
  ctx.fillRect(0, 0, 512, 512);

  // Noise speckles
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = Math.floor(120 + Math.random() * 60);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ZenSanctuary3D: React.FC<ZenSanctuary3DProps> = ({ entries, onSelectDate }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // UI states
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<'orbit' | 'lantern' | 'orbs' | 'basin'>('orbit');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'afternoon' | 'night'>('afternoon');
  const [autoRotate, setAutoRotate] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Three.js runtime references stored in mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const interactiveOrbsRef = useRef<THREE.Mesh[]>([]);
  const lanternLightRef = useRef<THREE.PointLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const isTransitioningCameraRef = useRef(false);

  // Initialize and mount Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Setup Renderer with PBR color pipeline
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Scene & Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfcfaf2); // Warm parchment background
    scene.fog = new THREE.FogExp2(0xfcfaf2, 0.025);
    sceneRef.current = scene;

    // 4. Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 8, 16);
    cameraRef.current = camera;

    // 5. OrbitControls with Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't flip under the floor
    controls.minDistance = 4;
    controls.maxDistance = 35;
    controls.target.set(0, 2, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // 6. Mandatory Studio Environment Reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 7. Lighting Rig: Warm Key + Cool Hemisphere + Cozy Lantern light
    const hemiLight = new THREE.HemisphereLight(0xfff7e6, 0x5a6358, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfffae0, 2.2);
    dirLight.position.set(12, 18, 10);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Soft Contact Shadow Plane Grounding
    const contactShadowGeo = new THREE.PlaneGeometry(16, 16);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x222d25,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    // 8. PROCEDURAL COMPOSITE HERO MODELS (3–12 parts each, grounded at bottom-center)
    const stoneTexture = createStoneTexture();

    // Part A: Floating Zen Island Base (Faceted layered rock plinth)
    const islandGroup = new THREE.Group();
    islandGroup.position.set(0, 0, 0);

    const islandRockGeo = new THREE.CylinderGeometry(5.2, 3.8, 1.2, 16, 2);
    const islandRockMat = new THREE.MeshStandardMaterial({
      color: 0x6e7368,
      roughness: 0.9,
      metalness: 0.1,
      bumpMap: stoneTexture,
      bumpScale: 0.08
    });
    const islandRock = new THREE.Mesh(islandRockGeo, islandRockMat);
    islandRock.position.y = 0.6;
    islandRock.receiveShadow = true;
    islandRock.castShadow = true;
    islandGroup.add(islandRock);

    // Island Moss Grass Top Layer
    const islandTopGeo = new THREE.CylinderGeometry(5.4, 5.2, 0.35, 24);
    const islandTopMat = new THREE.MeshStandardMaterial({
      color: 0x4d6b53, // Olive green
      roughness: 0.75,
      metalness: 0.05
    });
    const islandTop = new THREE.Mesh(islandTopGeo, islandTopMat);
    islandTop.position.y = 1.3;
    islandTop.receiveShadow = true;
    islandGroup.add(islandTop);

    // Part B: Zen Life Tree (Multi-tier procedural sculpture)
    const treeGroup = new THREE.Group();
    treeGroup.position.set(0, 1.45, 0);

    // 1. Twisted Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 3.2, 10);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
      metalness: 0.05
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.6;
    trunk.rotation.z = -0.06;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // 2. Primary Lateral Bough
    const bough1Geo = new THREE.CylinderGeometry(0.18, 0.28, 2.0, 8);
    const bough1 = new THREE.Mesh(bough1Geo, trunkMat);
    bough1.position.set(0.6, 2.6, 0.2);
    bough1.rotation.z = -Math.PI / 3.8;
    bough1.castShadow = true;
    treeGroup.add(bough1);

    // 3. Secondary Lateral Bough
    const bough2Geo = new THREE.CylinderGeometry(0.15, 0.22, 1.8, 8);
    const bough2 = new THREE.Mesh(bough2Geo, trunkMat);
    bough2.position.set(-0.5, 2.4, -0.2);
    bough2.rotation.z = Math.PI / 4;
    bough2.castShadow = true;
    treeGroup.add(bough2);

    // 4–6. Three Foliage Canopy Clouds (PBR Olive / Forest green clusters)
    const foliageMat = new THREE.MeshPhysicalMaterial({
      color: 0x3e5e45,
      roughness: 0.55,
      metalness: 0.1,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3
    });

    const canopyTopGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const canopyTop = new THREE.Mesh(canopyTopGeo, foliageMat);
    canopyTop.position.set(0.1, 3.9, 0);
    canopyTop.scale.set(1.4, 0.85, 1.3);
    canopyTop.castShadow = true;
    treeGroup.add(canopyTop);

    const canopyRight = new THREE.Mesh(canopyTopGeo, foliageMat);
    canopyRight.position.set(1.6, 3.2, 0.3);
    canopyRight.scale.set(1.1, 0.7, 1.0);
    canopyRight.castShadow = true;
    treeGroup.add(canopyRight);

    const canopyLeft = new THREE.Mesh(canopyTopGeo, foliageMat);
    canopyLeft.position.set(-1.4, 2.9, -0.3);
    canopyLeft.scale.set(1.0, 0.65, 0.9);
    canopyLeft.castShadow = true;
    treeGroup.add(canopyLeft);

    islandGroup.add(treeGroup);

    // Part C: Stone Lantern (Toro) - 5 distinct geometric parts
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(-2.5, 1.45, 1.6);

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0x8a8a80,
      roughness: 0.85,
      metalness: 0.15,
      bumpMap: stoneTexture,
      bumpScale: 0.05
    });

    // 1. Plinth base
    const lanternBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), lanternMat);
    lanternBase.position.y = 0.125;
    lanternBase.castShadow = true;
    lanternGroup.add(lanternBase);

    // 2. Shaft
    const lanternShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 8), lanternMat);
    lanternShaft.position.y = 0.7;
    lanternShaft.castShadow = true;
    lanternGroup.add(lanternShaft);

    // 3. Light chamber frame
    const lanternChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 6), lanternMat);
    lanternChamber.position.y = 1.35;
    lanternChamber.castShadow = true;
    lanternGroup.add(lanternChamber);

    // 4. Glowing inner flame & PointLight
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const flameOrb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), flameMat);
    flameOrb.position.y = 1.35;
    lanternGroup.add(flameOrb);

    const lanternLight = new THREE.PointLight(0xffa033, 2.4, 6);
    lanternLight.position.y = 1.35;
    lanternGroup.add(lanternLight);
    lanternLightRef.current = lanternLight;

    // 5. Tiered Pagoda Roof
    const roofGeo = new THREE.ConeGeometry(0.75, 0.45, 6);
    const lanternRoof = new THREE.Mesh(roofGeo, lanternMat);
    lanternRoof.position.y = 1.8;
    lanternRoof.castShadow = true;
    lanternGroup.add(lanternRoof);

    // 6. Finial jewel
    const finialGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const lanternFinial = new THREE.Mesh(finialGeo, lanternMat);
    lanternFinial.position.y = 2.1;
    lanternGroup.add(lanternFinial);

    islandGroup.add(lanternGroup);

    // Part D: Tsukubai Zen Water Basin & Bamboo Spout
    const basinGroup = new THREE.Group();
    basinGroup.position.set(2.4, 1.45, 1.4);

    const basinStoneGeo = new THREE.CylinderGeometry(0.7, 0.6, 0.55, 16);
    const basinStone = new THREE.Mesh(basinStoneGeo, lanternMat);
    basinStone.position.y = 0.275;
    basinStone.castShadow = true;
    basinStone.receiveShadow = true;
    basinGroup.add(basinStone);

    // Water surface disc (reflective PBR glass)
    const waterGeo = new THREE.CircleGeometry(0.58, 24);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x387060,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.54;
    basinGroup.add(waterMesh);

    // Bamboo spout ladle
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x829158, roughness: 0.6 });
    const bambooGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
    const bamboo = new THREE.Mesh(bambooGeo, bambooMat);
    bamboo.rotation.z = Math.PI / 2.3;
    bamboo.position.set(-0.35, 0.62, 0);
    basinGroup.add(bamboo);

    islandGroup.add(basinGroup);

    scene.add(islandGroup);

    // 9. 30-DAY MOOD ORBS / ENERGY NODES (SPIRAL PATH AROUND THE TREE)
    const orbs: THREE.Mesh[] = [];
    const last30Entries = [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    const orbBaseGeo = new THREE.SphereGeometry(0.18, 16, 16);

    last30Entries.forEach((entry, idx) => {
      // Spiral positioning from outer ring to near the Zen Tree
      const angle = idx * 0.45;
      const radius = 3.6 - (idx / 30) * 1.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 1.8 + Math.sin(idx * 0.5) * 0.25;

      const colorHex = entry.state === 'good' 
        ? 0x22c55e // Luminous Green (Good)
        : entry.state === 'normal'
        ? 0xf59e0b // Golden Amber (Neutral)
        : 0xf43f5e; // Crimson Rose (Bad)

      const orbMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.3
      });

      const orb = new THREE.Mesh(orbBaseGeo, orbMat);
      orb.position.set(x, y, z);
      orb.castShadow = true;
      orb.userData = {
        isMoodOrb: true,
        entry: entry,
        originalY: y,
        index: idx,
        colorHex: colorHex
      };

      scene.add(orb);
      orbs.push(orb);
    });
    interactiveOrbsRef.current = orbs;

    // 10. Ambient Golden Fireflies / Zen Particles
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 1] = 1.2 + Math.random() * 4;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffe6a3,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 11. Raycasting for Mouse/Touch Interaction
    let hoveredOrb: THREE.Mesh | null = null;

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const intersects = _raycaster.intersectObjects(interactiveOrbsRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hoveredOrb !== hit) {
          if (hoveredOrb) {
            (hoveredOrb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
            hoveredOrb.scale.set(1, 1, 1);
          }
          hoveredOrb = hit;
          (hit.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          hit.scale.set(1.4, 1.4, 1.4);
          setHoveredDate(hit.userData.entry.date);
          container.style.cursor = 'pointer';
        }
      } else {
        if (hoveredOrb) {
          (hoveredOrb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
          hoveredOrb.scale.set(1, 1, 1);
          hoveredOrb = null;
          setHoveredDate(null);
          container.style.cursor = 'default';
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const intersects = _raycaster.intersectObjects(interactiveOrbsRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        setSelectedEntry(hit.userData.entry);
        zenAudio.playBowl(hit.userData.entry.state === 'good' ? 528 : 432, 2.5);

        // Smoothly glide camera lookAt towards clicked orb
        _targetLookAt.copy(hit.position);
        _targetCamPos.set(hit.position.x * 1.5, hit.position.y + 1.2, hit.position.z * 1.5 + 3);
        isTransitioningCameraRef.current = true;
      } else {
        // Check if clicked the water basin or lantern
        const hitOther = _raycaster.intersectObject(islandGroup, true);
        if (hitOther.length > 0) {
          zenAudio.playWaterDrop();
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousemove', onPointerMove);
    domElement.addEventListener('click', onClick);

    // 12. Animation Loop with Exponential Damping & Software WebGL Pacing
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Gentle floating animation for mood orbs
      interactiveOrbsRef.current.forEach((orb) => {
        orb.position.y = orb.userData.originalY + Math.sin(time * 2 + orb.userData.index * 0.4) * 0.12;
      });

      // Subtle lantern flame flicker
      if (lanternLightRef.current) {
        lanternLightRef.current.intensity = 2.2 + Math.sin(time * 8) * 0.4;
      }

      // Smooth camera transition if active
      if (isTransitioningCameraRef.current && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerp(_targetCamPos, 0.05);
        controlsRef.current.target.lerp(_targetLookAt, 0.05);
        if (cameraRef.current.position.distanceTo(_targetCamPos) < 0.1) {
          isTransitioningCameraRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    animate();

    // 13. Responsive Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousemove', onPointerMove);
      domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [entries]);

  // Handle Preset Camera Views
  const handleSelectPreset = (preset: 'orbit' | 'lantern' | 'orbs' | 'basin') => {
    setActivePreset(preset);
    zenAudio.playBowl(440, 1.8);
    if (!controlsRef.current || !cameraRef.current) return;

    isTransitioningCameraRef.current = true;
    if (preset === 'orbit') {
      _targetCamPos.set(0, 8, 16);
      _targetLookAt.set(0, 2, 0);
    } else if (preset === 'lantern') {
      _targetCamPos.set(-4.5, 3.5, 3.8);
      _targetLookAt.set(-2.5, 2.5, 1.6);
    } else if (preset === 'orbs') {
      _targetCamPos.set(0, 5, 8.5);
      _targetLookAt.set(0, 2.2, 0);
    } else if (preset === 'basin') {
      _targetCamPos.set(4.2, 3.2, 3.2);
      _targetLookAt.set(2.4, 1.8, 1.4);
    }
  };

  // Handle Time of Day Lighting
  const handleTimeOfDayChange = (tod: 'day' | 'afternoon' | 'night') => {
    setTimeOfDay(tod);
    const scene = sceneRef.current;
    const dir = dirLightRef.current;
    const hemi = hemiLightRef.current;
    const renderer = rendererRef.current;
    if (!scene || !dir || !hemi || !renderer) return;

    if (tod === 'day') {
      scene.background = new THREE.Color(0xf6fbf7);
      if (scene.fog) scene.fog.color = new THREE.Color(0xf6fbf7);
      dir.color.setHex(0xffffff);
      dir.intensity = 2.4;
      hemi.color.setHex(0xf0fdf4);
      hemi.groundColor.setHex(0x526b56);
      renderer.toneMappingExposure = 1.2;
    } else if (tod === 'afternoon') {
      scene.background = new THREE.Color(0xfcfaf2);
      if (scene.fog) scene.fog.color = new THREE.Color(0xfcfaf2);
      dir.color.setHex(0xfffae0);
      dir.intensity = 2.2;
      hemi.color.setHex(0xfff7e6);
      hemi.groundColor.setHex(0x5a6358);
      renderer.toneMappingExposure = 1.15;
    } else if (tod === 'night') {
      scene.background = new THREE.Color(0x131a15);
      if (scene.fog) scene.fog.color = new THREE.Color(0x131a15);
      dir.color.setHex(0x557799);
      dir.intensity = 0.5;
      hemi.color.setHex(0x1e2e24);
      hemi.groundColor.setHex(0x0c140e);
      renderer.toneMappingExposure = 0.95;
    }
  };

  // Toggle Auto Rotation
  const toggleAutoRotate = () => {
    setAutoRotate(prev => {
      const next = !prev;
      if (controlsRef.current) controlsRef.current.autoRotate = next;
      return next;
    });
  };

  // Toggle Sound
  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      zenAudio.enabled = next;
      if (next) zenAudio.playBowl(528, 2);
      return next;
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-100px)] min-h-[580px] bg-[#fcfaf2] rounded-3xl overflow-hidden border border-[#e8e5d8] shadow-sm select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Title & Live Badge */}
      <div className="absolute top-5 left-5 pointer-events-auto flex items-center gap-3">
        <div className="bg-[#fcfbf7] border border-[#ded9c8] px-4 py-2 rounded-2xl shadow-md shadow-[#4d6b53]/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#eff4ec] border border-[#c8d8c3] flex items-center justify-center text-[#4d6b53]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-extrabold text-[#222d25]">休息一下</h2>
              <span className="text-[10px] bg-[#eff4ec] text-[#3d5942] border border-[#c8d8c3] px-2 py-0.2 rounded-full font-bold">
                慢慢呼吸
              </span>
            </div>
            <p className="text-[11px] text-[#616c62]">
              圍繞生命樹的 30 顆心靈能量星群，點擊探索每日反省與修復智慧
            </p>
          </div>
        </div>
      </div>

      {/* Top Right Quick Controls: Sound & Reset View */}
      <div className="absolute top-5 right-5 pointer-events-auto flex items-center gap-2">
        <button
          onClick={toggleSound}
          className={`p-2.5 rounded-xl border transition shadow-xs cursor-pointer ${
            soundEnabled
              ? 'bg-[#eff4ec] text-[#3d5942] border-[#c8d8c3]'
              : 'bg-white text-slate-400 border-[#ded9c8]'
          }`}
          title={soundEnabled ? '點擊靜音' : '點擊開啟頌缽音效'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={() => handleSelectPreset('orbit')}
          className="p-2.5 bg-white hover:bg-[#f8f7f2] text-[#4d6b53] border border-[#ded9c8] rounded-xl transition shadow-xs cursor-pointer"
          title="重置視角"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Hover Info Badge (when hovering an orb) */}
      {hoveredDate && !selectedEntry && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none bg-[#222d25]/90 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-[#3e4f42] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#a8ccaf]" />
          <span>點擊查看 <strong>{hoveredDate}</strong> 反省節點</span>
        </div>
      )}

      {/* Modal / Card for Clicked Entry */}
      {selectedEntry && (
        <div className="absolute top-20 right-5 max-w-sm w-full bg-[#fcfbf7] border border-[#ded9c8] p-5 rounded-2xl shadow-xl pointer-events-auto space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#e8e5d8] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#222d25] font-mono">{selectedEntry.date}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                selectedEntry.state === 'good' 
                  ? 'bg-[#eff7ee] text-[#2c5832] border-[#b8dab3]' 
                  : selectedEntry.state === 'normal' 
                  ? 'bg-amber-50 text-amber-800 border-amber-300' 
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                {selectedEntry.state === 'good' ? '🟢 好日子' : selectedEntry.state === 'normal' ? '🟡 平凡' : '🔴 卡關'}
              </span>
            </div>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="text-xs text-[#2c332d] space-y-1.5 leading-relaxed">
            {selectedEntry.state === 'good' && (
              <>
                <p><strong className="text-[#2c5832]">生活滋養：</strong>{selectedEntry.goodWhere}</p>
                {selectedEntry.goodKeep && <p><strong className="text-[#4d6b53]">成功配方：</strong>{selectedEntry.goodKeep}</p>}
              </>
            )}
            {selectedEntry.state === 'normal' && (
              <>
                <p><strong className="text-amber-800">平靜微光：</strong>{selectedEntry.normalMoment}</p>
                {selectedEntry.normalAmplify && <p><strong className="text-amber-700">感受放大：</strong>{selectedEntry.normalAmplify}</p>}
              </>
            )}
            {selectedEntry.state === 'bad' && (
              <>
                {selectedEntry.badFact && <p><strong className="text-rose-700">客觀事實：</strong>{selectedEntry.badFact}</p>}
                {selectedEntry.badImprove && <p><strong className="text-[#3d5942]">改善辦法：</strong>{selectedEntry.badImprove}</p>}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {selectedEntry.tags.map(t => (
              <span key={t} className="text-[10px] bg-white border border-[#ded9c8] text-[#616c62] px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {selectedEntry.factors.map(f => (
              <span key={f} className="text-[10px] bg-[#eff4ec] border border-[#c8d8c3] text-[#3d5942] px-2 py-0.5 rounded-full font-mono">
                {f}
              </span>
            ))}
          </div>

          <div className="pt-2 border-t border-[#e8e5d8] flex justify-end">
            <button
              onClick={() => onSelectDate(selectedEntry.date)}
              className="px-3 py-1.5 bg-[#4d6b53] hover:bg-[#3d5942] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              進入詳細反省頁面 ➔
            </button>
          </div>
        </div>
      )}

      {/* Viewport-First Ergonomic Collapsible Bottom Control Dock */}
      <div 
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-300 w-[94vw] max-w-3xl ${
          isDockCollapsed ? 'translate-y-[calc(100%-24px)]' : 'translate-y-0'
        }`}
      >
        {/* Toggle Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsDockCollapsed(prev => !prev)}
            className="flex items-center gap-1.5 px-4 py-1 bg-[#fcfbf7] border-t border-x border-[#ded9c8] rounded-t-xl text-[11px] font-bold text-[#4d6b53] shadow-xs cursor-pointer hover:bg-white"
          >
            {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isDockCollapsed ? '顯示選項' : '收起選項'}</span>
          </button>
        </div>

        {/* Control Bar (Solid surface, no backdrop-filter over WebGL) */}
        <div className="bg-[#fcfbf7] border border-[#ded9c8] rounded-2xl p-3.5 shadow-xl shadow-[#4d6b53]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Preset Camera Views */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#616c62] mr-1 hidden sm:inline">視角切換:</span>
            <button
              onClick={() => handleSelectPreset('orbit')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activePreset === 'orbit' ? 'bg-[#4d6b53] text-white shadow-xs' : 'bg-white text-[#616c62] hover:bg-[#f8f7f2] border border-[#ded9c8]'
              }`}
            >
              🌲 全景巡航
            </button>
            <button
              onClick={() => handleSelectPreset('lantern')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activePreset === 'lantern' ? 'bg-[#4d6b53] text-white shadow-xs' : 'bg-white text-[#616c62] hover:bg-[#f8f7f2] border border-[#ded9c8]'
              }`}
            >
              🏮 禪意石燈
            </button>
            <button
              onClick={() => handleSelectPreset('orbs')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activePreset === 'orbs' ? 'bg-[#4d6b53] text-white shadow-xs' : 'bg-white text-[#616c62] hover:bg-[#f8f7f2] border border-[#ded9c8]'
              }`}
            >
              🔮 30天星軌
            </button>
            <button
              onClick={() => handleSelectPreset('basin')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activePreset === 'basin' ? 'bg-[#4d6b53] text-white shadow-xs' : 'bg-white text-[#616c62] hover:bg-[#f8f7f2] border border-[#ded9c8]'
              }`}
            >
              💧 水鏡禪觀
            </button>
          </div>

          {/* Time of Day Mood Lighting */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#616c62] mr-1 hidden sm:inline">光影氛圍:</span>
            <button
              onClick={() => handleTimeOfDayChange('day')}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                timeOfDay === 'day' ? 'bg-[#4d6b53] text-white' : 'bg-white text-[#616c62] border border-[#ded9c8]'
              }`}
              title="晨光朝氣 (Lush Day)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleTimeOfDayChange('afternoon')}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                timeOfDay === 'afternoon' ? 'bg-[#4d6b53] text-white' : 'bg-white text-[#616c62] border border-[#ded9c8]'
              }`}
              title="午後暖陽 (Warm Afternoon)"
            >
              <Sunset className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleTimeOfDayChange('night')}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                timeOfDay === 'night' ? 'bg-[#4d6b53] text-white' : 'bg-white text-[#616c62] border border-[#ded9c8]'
              }`}
              title="靜謐夜思 (Twilight Zen)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            {/* Auto Rotate Toggle */}
            <button
              onClick={toggleAutoRotate}
              className={`ml-2 px-2.5 py-1.5 rounded-xl font-semibold border transition cursor-pointer ${
                autoRotate
                  ? 'bg-[#eff4ec] text-[#3d5942] border-[#c8d8c3]'
                  : 'bg-white text-slate-400 border-[#ded9c8]'
              }`}
            >
              {autoRotate ? '自動環繞: 開' : '自動環繞: 關'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
