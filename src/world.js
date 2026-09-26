import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BOARD, GROUP_COLORS } from './rules.js';

const SPACING = 5.1;
const TILE = 4.55;
const BOARD_RADIUS = 3.5;

export function createWorld(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9bd9ec');
  scene.fog = new THREE.Fog('#9bd9ec', 56, 108);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 180);
  camera.position.set(0, 43, 52);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe9fbff, 0x607b4d, 2.2));
  const sun = new THREE.DirectionalLight(0xfff5d8, 2.3);
  sun.position.set(-24, 48, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  scene.add(sun);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 42;
  controls.maxDistance = 78;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.target.set(0, 0, 0);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: '#7bc06a', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.1;
  ground.receiveShadow = true;
  scene.add(ground);

  const boardBase = new THREE.Mesh(new THREE.BoxGeometry(44, 1.3, 44), new THREE.MeshStandardMaterial({ color: '#795839', roughness: 0.9 }));
  boardBase.position.y = -0.85;
  boardBase.castShadow = true;
  boardBase.receiveShadow = true;
  scene.add(boardBase);
  const boardTop = new THREE.Mesh(new THREE.BoxGeometry(43, 0.25, 43), new THREE.MeshStandardMaterial({ color: '#487c46', roughness: 1 }));
  boardTop.position.y = -0.07;
  boardTop.receiveShadow = true;
  scene.add(boardTop);

  const points = boardPositions();
  const tileMeshes = [];
  const buildingGroups = [];
  BOARD.forEach((space, index) => {
    const position = points[index];
    const group = new THREE.Group();
    group.position.set(position.x, 0, position.z);
    const groupColor = GROUP_COLORS[space.group] ?? 0xb5c77d;
    const topColor = space.type === 'property' ? groupColor : specialColor(space.type);
    const tile = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.8, TILE), new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.88 }));
    tile.castShadow = true;
    tile.receiveShadow = true;
    tile.position.y = 0.28;
    group.add(tile);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(tile.geometry), new THREE.LineBasicMaterial({ color: '#273b35' }));
    edge.position.copy(tile.position);
    group.add(edge);
    const top = new THREE.Mesh(new THREE.BoxGeometry(TILE - 0.2, 0.13, TILE - 0.2), new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.9 }));
    top.position.y = 0.76;
    top.receiveShadow = true;
    group.add(top);

    if (space.type === 'property') {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 0.28), new THREE.MeshStandardMaterial({ color: groupColor, roughness: 0.8 }));
      marker.position.set(0, 0.9, index < 8 || index > 20 ? 1.32 : -1.32);
      group.add(marker);
    }
    addLabel(group, space.name, space.type === 'property' ? '#172a24' : '#15262b');
    const buildings = new THREE.Group();
    buildings.position.y = 0.95;
    for (let level = 0; level < 3; level++) {
      const house = new THREE.Group();
      house.visible = false;
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.65), new THREE.MeshStandardMaterial({ color: '#ead9ae' }));
      trunk.position.y = 0.35;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), new THREE.MeshStandardMaterial({ color: '#b86147' }));
      roof.position.y = 0.9;
      house.add(trunk, roof);
      house.position.set(-1.2 + level * 1.2, 0.04, 0.35);
      buildings.add(house);
    }
    group.add(buildings);
    buildingGroups[index] = buildings.children;
    scene.add(group);
    tileMeshes[index] = { group, tile, top, baseColor: topColor };
  });

  const center = new THREE.Mesh(new THREE.BoxGeometry(17, 0.45, 17), new THREE.MeshStandardMaterial({ color: '#315b42', roughness: 0.96 }));
  center.position.y = 0.08;
  center.receiveShadow = true;
  scene.add(center);
  const logo = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.45, 8.5), new THREE.MeshStandardMaterial({ color: '#eacb72', roughness: 0.75 }));
  logo.position.set(0, 0.55, 0);
  scene.add(logo);
  const logoInner = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.28, 7.2), new THREE.MeshStandardMaterial({ color: '#5d8b54', roughness: 0.8 }));
  logoInner.position.set(0, 0.9, 0);
  scene.add(logoInner);
  addWorldText(scene, 'BLOCK PARTY', 0, 1.1, 0, 0.72, '#f6e7ad');
  addCardStack(scene);
  addVoxelTree(scene, -7, 0, -4, '#537f48');
  addVoxelTree(scene, 7, 0, -4, '#3f7049');
  addVoxelTree(scene, -7, 0, 4, '#4e7843');
  addVoxelTree(scene, 7, 0, 4, '#668744');
  const dice = createDice(scene);

  let currentGame = null;
  const avatarGroups = new Map();
  function sync(game) {
    currentGame = game;
    game.players.forEach((player, index) => {
      let avatar = avatarGroups.get(player.id);
      if (!avatar) {
        avatar = createAvatar(player.color);
        avatarGroups.set(player.id, avatar);
        scene.add(avatar);
      }
      avatar.visible = !player.bankrupt;
      if (!player.bankrupt) avatar.position.copy(positionFor(points[player.position], player.id, game.players.length));
      avatar.userData.marker.material.color.set(player.color);
    });
    game.board.forEach((space, index) => {
      const mesh = tileMeshes[index];
      if (!mesh) return;
      mesh.top.material.color.set(space.owner ? game.players.find((p) => p.id === space.owner)?.color ?? mesh.baseColor : mesh.baseColor);
      mesh.top.material.emissive.set(space.owner ? game.players.find((p) => p.id === space.owner)?.color ?? '#000000' : '#000000');
      mesh.top.material.emissiveIntensity = space.owner ? 0.08 : 0;
      buildingGroups[index].forEach((house, level) => { house.visible = space.owner !== null && level < space.level; });
    });
    render();
  }

  function animateRoll(values) {
    return new Promise((resolve) => {
      const start = performance.now();
      const duration = 850;
      dice.forEach((die) => { die.visible = true; });
      function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        dice.forEach((die, i) => {
          die.rotation.x += 0.24 + i * 0.04;
          die.rotation.z += 0.19 + i * 0.06;
          die.position.y = 1 + Math.sin(progress * Math.PI * 5) * (1 - progress) * 2.1;
        });
        render();
        if (progress < 1) requestAnimationFrame(frame);
        else {
          dice.forEach((die, i) => {
            die.position.y = 1;
            die.rotation.set(values[i] * Math.PI / 3, 0, 0);
          });
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function movePlayer(game, playerId, from, to, steps) {
    const player = game.players.find((p) => p.id === playerId);
    const avatar = avatarGroups.get(playerId);
    if (!player || !avatar) return Promise.resolve();
    const path = Array.from({ length: steps }, (_, step) => points[(from + step + 1) % points.length]);
    return new Promise((resolve) => {
      let step = 0;
      const travelStep = () => {
        if (step >= path.length) {
          player.position = to;
          sync(game);
          resolve();
          return;
        }
        const target = path[step];
        const startPos = avatar.position.clone();
        const started = performance.now();
        const duration = 185;
        const moveFrame = (now) => {
          const t = Math.min(1, (now - started) / duration);
          const eased = t * t * (3 - 2 * t);
          avatar.position.set(THREE.MathUtils.lerp(startPos.x, target.x, eased), 0.6 + Math.sin(t * Math.PI) * 0.8, THREE.MathUtils.lerp(startPos.z, target.z, eased));
          avatar.rotation.y += 0.04;
          render();
          if (t < 1) requestAnimationFrame(moveFrame);
          else { step += 1; travelStep(); }
        };
        requestAnimationFrame(moveFrame);
      };
      avatar.position.copy(positionFor(points[from], playerId, game.players.length));
      travelStep();
    });
  }

  function highlight(index) {
    tileMeshes.forEach((item, i) => item.tile.material.emissive?.set(i === index ? '#f3df8c' : '#000000'));
    if (tileMeshes[index]) {
      tileMeshes[index].tile.material.emissiveIntensity = 0.22;
      setTimeout(() => { if (tileMeshes[index]) tileMeshes[index].tile.material.emissiveIntensity = 0; }, 850);
    }
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  }
  window.addEventListener('resize', resize);
  resize();
  render();
  return { sync, animateRoll, movePlayer, highlight, render };
}

function boardPositions() {
  const points = [];
  for (let x = -BOARD_RADIUS; x <= BOARD_RADIUS; x++) points.push({ x: x * SPACING, z: -BOARD_RADIUS * SPACING });
  for (let z = -BOARD_RADIUS + 1; z <= BOARD_RADIUS; z++) points.push({ x: BOARD_RADIUS * SPACING, z: z * SPACING });
  for (let x = BOARD_RADIUS - 1; x >= -BOARD_RADIUS; x--) points.push({ x: x * SPACING, z: BOARD_RADIUS * SPACING });
  for (let z = BOARD_RADIUS - 1; z > -BOARD_RADIUS; z--) points.push({ x: -BOARD_RADIUS * SPACING, z: z * SPACING });
  return points;
}

function positionFor(point, playerId, count) {
  const angle = ((playerId - 1) / Math.max(1, count)) * Math.PI * 2;
  return new THREE.Vector3(point.x + Math.cos(angle) * 0.5, 0.6, point.z + Math.sin(angle) * 0.5);
}

function createAvatar(color) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#f0bc8c', roughness: 0.9 });
  const shirt = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
  const pants = new THREE.MeshStandardMaterial({ color: '#334c58', roughness: 0.9 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), skin);
  head.position.y = 2.3;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.95), new THREE.MeshStandardMaterial({ color: '#604531' }));
  hair.position.y = 2.75;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.65), shirt);
  torso.position.y = 1.28;
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.0, 0.38), shirt);
  leftArm.position.set(-0.72, 1.28, 0);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.72;
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.46), pants);
  leftLeg.position.set(-0.28, 0.38, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.28;
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 4), new THREE.MeshBasicMaterial({ color }));
  marker.position.y = 3.02;
  marker.rotation.x = Math.PI;
  group.add(head, hair, torso, leftArm, rightArm, leftLeg, rightLeg, marker);
  group.userData.marker = marker;
  group.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  return group;
}

function createDice(scene) {
  const dots = Array.from({ length: 6 }, (_, n) => diceTexture(n + 1));
  const materials = dots.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.48 }));
  const cube = new THREE.BoxGeometry(1.7, 1.7, 1.7);
  const dice = [-1.25, 1.25].map((x, i) => {
    const mesh = new THREE.Mesh(cube, materials);
    mesh.position.set(x, 1, 0);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  });
  return dice;
}

function diceTexture(value) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff9e9';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#55625c';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 120, 120);
  ctx.fillStyle = '#30433c';
  const points = { 1: [[64, 64]], 2: [[34, 34], [94, 94]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[34, 34], [94, 34], [34, 94], [94, 94]], 5: [[34, 34], [94, 34], [64, 64], [34, 94], [94, 94]], 6: [[34, 30], [94, 30], [34, 64], [94, 64], [34, 98], [94, 98]] }[value];
  points.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addLabel(group, name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = color;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), 256, 49, 486);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.72), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
  label.position.set(0, 1.1, 0);
  label.rotation.x = -Math.PI / 2;
  group.add(label);
}

function addWorldText(scene, text, x, y, z, size, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.font = '900 70px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * 6.5, size * 1.6), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.position.set(x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
}

function addVoxelTree(scene, x, y, z, leafColor) {
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.2, 0.75), new THREE.MeshStandardMaterial({ color: '#79583a' }));
  trunk.position.set(x, y + 1, z);
  const leaves = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.8, 2.5), new THREE.MeshStandardMaterial({ color: leafColor, roughness: 1 }));
  leaves.position.set(x, y + 3, z);
  trunk.castShadow = leaves.castShadow = true;
  scene.add(trunk, leaves);
}

function addCardStack(scene) {
  const cardBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.24, 3.1), new THREE.MeshStandardMaterial({ color: '#e9bb58', roughness: 0.72 }));
  cardBase.position.set(-5.1, 0.48, 0);
  cardBase.rotation.y = -0.24;
  cardBase.castShadow = true;
  const cardTop = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 2.95), new THREE.MeshStandardMaterial({ color: '#6651aa', roughness: 0.68 }));
  cardTop.position.set(-5.1, 0.69, 0);
  cardTop.rotation.y = -0.24;
  cardTop.castShadow = true;
  scene.add(cardBase, cardTop);
  addWorldText(scene, '?', -5.1, 0.83, 0, 0.42, '#fff4bd');
}

function specialColor(type) {
  return ({ start: 0xf5c952, event: 0xd37bff, tax: 0xef7770, jail: 0x4e6070, rest: 0x65c9b0 })[type] ?? 0xb5c77d;
}
