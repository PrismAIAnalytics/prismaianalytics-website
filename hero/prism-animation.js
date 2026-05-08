import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const LOOP_SECONDS = 8;
const OUTER_W = 0.955;
const OUTER_H_TOP = 1.0;
const OUTER_H_BOT = -0.5;
const SHAPE_W = OUTER_W * 2;
const SHAPE_H = OUTER_H_TOP - OUTER_H_BOT;

const INNER_W = 0.349;
const INNER_H_TOP = 0.365;
const INNER_H_BOT = -0.183;

const SVG_URL = './prism-logo.svg';
const SVG_NATIVE_W = 98;
const SVG_NATIVE_H = 77;
const TEXTURE_SCALE = 16;

const SVG_INNER_PX = {
  ax: 31.1, ay: 60.71,
  bx: 66.9, by: 60.71,
  cx: 49.0, cy: 32.6,
};

export async function mountPrismAnimation(canvas, opts = {}) {
  // Resolve SVG path: opts.svgUrl wins (used when mounted from /); falls back
  // to the module-relative ./prism-logo.svg used by the standalone test page.
  const svgUrl = opts.svgUrl || SVG_URL;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    // preserveDrawingBuffer removed — only needed for canvas-to-image capture,
    // not for animation. Saves memory.
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = null;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.05, 4.6);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  scene.add(root);

  const logoTexture = await loadSvgTextureWithMask(svgUrl);
  const outerPrism = buildOuterPrism(logoTexture);
  root.add(outerPrism);

  const chrome = buildChromePyramid();
  root.add(chrome);

  const ambient = new THREE.AmbientLight(0xe8edf6, 0.4);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(-2.4, 3.2, 4.0);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc4d3ec, 0.55);
  fillLight.position.set(3.0, -0.6, 2.4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x4f6ba8, 0.4);
  rimLight.position.set(0, -2.5, -3.0);
  scene.add(rimLight);

  const sweep = new THREE.PointLight(0xffffff, 14, 6, 1.6);
  scene.add(sweep);

  resize();
  window.addEventListener('resize', resize);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const state = { frozen: null };

  const MAX_YAW = THREE.MathUtils.degToRad(26);
  const MAX_PITCH = THREE.MathUtils.degToRad(6);
  const CHROME_REST_Z = 0.04;
  const CHROME_POP_Z = 0.36;
  const CHROME_SPIN = THREE.MathUtils.degToRad(35);

  const clock = new THREE.Clock();

  // Tick stored as a named function so pause()/play() can stop and resume the
  // loop without rebuilding the scene. Also lets the IntersectionObserver path
  // pause the animation when the canvas scrolls out of view (saves CPU/battery).
  const tick = () => {
    const t = clock.getElapsedTime();
    let yaw, pitch, sweepPhase, leanAmt, omega;
    if (state.frozen !== null) {
      yaw = state.frozen;
      pitch = 0;
      sweepPhase = state.frozen;
      leanAmt = Math.abs(yaw) / MAX_YAW;
      omega = state.frozen;
    } else {
      const phase = (t % LOOP_SECONDS) / LOOP_SECONDS;
      omega = phase * Math.PI * 2;
      yaw = Math.sin(omega) * MAX_YAW;
      pitch = Math.sin(omega * 0.5 + 1.2) * MAX_PITCH;
      leanAmt = Math.abs(Math.sin(omega));
      sweepPhase = omega;
    }

    root.rotation.y = yaw;
    root.rotation.x = pitch;

    const eased = leanAmt * leanAmt * (3 - 2 * leanAmt);
    chrome.position.z = CHROME_REST_Z + (CHROME_POP_Z - CHROME_REST_Z) * eased;
    chrome.rotation.y = -yaw * 1.8 + Math.sin(omega * 1.5) * CHROME_SPIN * eased;
    chrome.rotation.x = pitch * 0.8;

    sweep.position.set(
      Math.cos(sweepPhase) * 2.4,
      0.7 + Math.sin(sweepPhase * 2) * 0.2,
      Math.sin(sweepPhase) * 2.4
    );

    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(tick);

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      logoTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
    pause() {
      renderer.setAnimationLoop(null);
    },
    play() {
      renderer.setAnimationLoop(tick);
    },
  };
}

function loadSvgTextureWithMask(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const w = SVG_NATIVE_W * TEXTURE_SCALE;
      const h = SVG_NATIVE_H * TEXTURE_SCALE;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(SVG_INNER_PX.ax * TEXTURE_SCALE, SVG_INNER_PX.ay * TEXTURE_SCALE);
      ctx.lineTo(SVG_INNER_PX.bx * TEXTURE_SCALE, SVG_INNER_PX.by * TEXTURE_SCALE);
      ctx.lineTo(SVG_INNER_PX.cx * TEXTURE_SCALE, SVG_INNER_PX.cy * TEXTURE_SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function buildOuterPrism(logoTexture) {
  const shape = new THREE.Shape();
  shape.moveTo(-OUTER_W, OUTER_H_BOT);
  shape.lineTo(OUTER_W, OUTER_H_BOT);
  shape.lineTo(0, OUTER_H_TOP);
  shape.closePath();

  const uvGenerator = {
    generateTopUV(_geom, vertices, indexA, indexB, indexC) {
      const get = i => ({
        x: vertices[i * 3],
        y: vertices[i * 3 + 1],
      });
      const a = get(indexA);
      const b = get(indexB);
      const c = get(indexC);
      const u = x => (x - -OUTER_W) / SHAPE_W;
      const v = y => (y - OUTER_H_BOT) / SHAPE_H;
      return [
        new THREE.Vector2(u(a.x), v(a.y)),
        new THREE.Vector2(u(b.x), v(b.y)),
        new THREE.Vector2(u(c.x), v(c.y)),
      ];
    },
    generateSideWallUV() {
      return [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1),
      ];
    },
  };

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 10,
    UVGenerator: uvGenerator,
  });
  geom.translate(0, 0, -0.12);
  geom.computeVertexNormals();

  const frontMaterial = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    alphaTest: 0.02,
    toneMapped: false,
  });

  const sideMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x17135c,
    metalness: 0.6,
    roughness: 0.28,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  });

  return new THREE.Mesh(geom, [frontMaterial, sideMaterial]);
}

function buildChromePyramid() {
  const fill = 0.95;
  const baseZ = 0;
  const apexZ = 0.32;

  const positions = new Float32Array([
    -INNER_W * fill, INNER_H_BOT * fill, baseZ,
    INNER_W * fill, INNER_H_BOT * fill, baseZ,
    0, INNER_H_TOP * fill, baseZ,
    0, 0.06, apexZ,
  ]);

  const indices = [
    0, 1, 3,
    1, 2, 3,
    2, 0, 3,
    2, 1, 0,
  ];

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xeef3fb,
    metalness: 1.0,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.5,
  });

  return new THREE.Mesh(geom, material);
}
