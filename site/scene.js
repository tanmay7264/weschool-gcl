import * as THREE from 'three';

const GREEN = new THREE.Color('#8DBA4E'), PURPLE = new THREE.Color('#7B63A6'), ORANGE = new THREE.Color('#F0973A');

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function labelTexture(text) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4B3B68'; g.font = '800 72px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 68);
  return new THREE.CanvasTexture(c);
}

export function start({ journeyProgress, journey, reduceMotion, stageCount }) {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // throws without WebGL -> caller falls back
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#F7F5FB');
  scene.fog = new THREE.Fog('#F7F5FB', 18, 70);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

  // Globe: Fibonacci-sphere particles in brand colours ("Global Citizen")
  const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    pos.set([Math.cos(th) * r * 3.2, y * 3.2, Math.sin(th) * r * 3.2], i * 3);
    const c = GREEN.clone().lerp(PURPLE, (y + 1) / 2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const globe = new THREE.Group();
  globe.add(new THREE.Points(gGeo, new THREE.PointsMaterial({ size: 0.06, vertexColors: true })));
  globe.add(new THREE.Mesh(new THREE.IcosahedronGeometry(3.0, 2), new THREE.MeshBasicMaterial({ color: PURPLE, wireframe: true, transparent: true, opacity: 0.18 })));
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.6 }));
  orbit.rotation.x = 1.2; globe.add(orbit);
  globe.position.set(2.6, 0, 0);
  scene.add(globe);

  // Starfield
  const S = 1800, sp = new Float32Array(S * 3);
  for (let i = 0; i < S * 3; i += 3) sp.set([(Math.random() - .5) * 120, (Math.random() - .5) * 80, 10 - Math.random() * 110], i);
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.08, color: '#A79CC6', transparent: true, opacity: 0.55 })));

  // Journey nodes along a gentle curve going into depth
  const glow = glowTexture(), nodes = [];
  const nodePos = i => new THREE.Vector3(Math.sin(i * 1.3) * 5, Math.cos(i * 0.9) * 1.5, -16 - i * 13);
  for (let i = 0; i < stageCount; i++) {
    const g = new THREE.Group(); g.position.copy(nodePos(i));
    const c = i === 0 ? ORANGE : GREEN;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: c, transparent: true, opacity: 0.45, depthWrite: false }));
    halo.scale.setScalar(5);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 16), new THREE.MeshBasicMaterial({ color: c }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.04, 8, 80), new THREE.MeshBasicMaterial({ color: i === 0 ? GREEN : ORANGE }));
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(i === 0 ? '★' : String(i)), transparent: true, depthWrite: false }));
    label.position.y = 2.1; label.scale.setScalar(1.3);
    g.add(halo, core, ring, label);
    scene.add(g); nodes.push({ g, halo, ring });
  }
  const curve = new THREE.CatmullRomCurve3(nodes.map(n => n.g.position));
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(300)),
    new THREE.LineDashedMaterial({ color: ORANGE, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.7 }));
  path.computeLineDistances(); scene.add(path);

  // Camera targets
  const camPos = new THREE.Vector3(0, 0, 10), look = new THREE.Vector3();
  const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
  const HERO_POS = new THREE.Vector3(0, 0, 10), HERO_LOOK = new THREE.Vector3(0, 0, 0);
  const OFFSET = new THREE.Vector3(-1.2, 0.4, 11), LOOK_DROP = new THREE.Vector3(0, -1.1, 0);
  const OVERVIEW_POS = new THREE.Vector3(0, 26, -30), OVERVIEW_LOOK = nodePos((stageCount - 1) / 2);
  const mouse = new THREE.Vector2();
  addEventListener('pointermove', e => mouse.set(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5), { passive: true });

  // Camera sits on node i at the middle of stage i's scroll band (matches the HTML cards).
  const stageT = () => THREE.MathUtils.clamp((journeyProgress() * stageCount - 0.5) / (stageCount - 1), 0, 1);

  function targets() {
    const top = journey.offsetTop, end = top + journey.offsetHeight - innerHeight;
    const nodeAt = t => curve.getPoint(t);
    if (scrollY < top) {                       // hero -> first node
      const k = THREE.MathUtils.smoothstep(scrollY / top, 0, 1);
      tPos.lerpVectors(HERO_POS, nodeAt(0).add(OFFSET), k);
      tLook.lerpVectors(HERO_LOOK, nodeAt(0).add(LOOK_DROP), k);
    } else if (scrollY <= end) {                // travel along the stages
      const t = stageT();
      tPos.copy(nodeAt(t)).add(OFFSET); tLook.copy(nodeAt(t)).add(LOOK_DROP); // drop look target so the node sits above the cards
    } else {                                    // pull back to an overview of the whole path
      const k = THREE.MathUtils.smoothstep((scrollY - end) / innerHeight, 0, 1);
      tPos.lerpVectors(nodeAt(1).add(OFFSET), OVERVIEW_POS, k);
      tLook.lerpVectors(nodeAt(1).add(LOOK_DROP), OVERVIEW_LOOK, k);
    }
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  targets(); camPos.copy(tPos); look.copy(tLook);
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta(), time = clock.elapsedTime;
    targets();
    const ease = reduceMotion ? 1 : 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
    camPos.lerp(tPos, ease); look.lerp(tLook, ease);
    camera.position.copy(camPos);
    if (!reduceMotion) camera.position.add(new THREE.Vector3(mouse.x * 0.8, -mouse.y * 0.5, 0));
    camera.lookAt(look);

    if (!reduceMotion) {
      globe.rotation.y += dt * 0.12;
      orbit.rotation.z += dt * 0.3;
    }
    const active = Math.round(stageT() * (stageCount - 1));
    nodes.forEach((n, i) => {
      const on = i === active && scrollY >= journey.offsetTop - innerHeight / 2;
      const s = THREE.MathUtils.lerp(n.halo.scale.x, on ? 7.5 : 4.5, 0.08);
      n.halo.scale.setScalar(s);
      if (!reduceMotion) { n.ring.rotation.x = time * 0.6 + i; n.ring.rotation.y = time * 0.4; }
    });
    renderer.render(scene, camera);
  });
}
