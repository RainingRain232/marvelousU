// ============================================================================
// DragonSpiderEnemyMeshes.ts – Ultra-detailed Dragon & Arachnid enemy meshes
// Anatomically detailed THREE.js primitive constructions
// ============================================================================

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface EnemyAppearance {
  bodyColor: number;
  accentColor: number;
  scale: number;
  shape: string;
  eyeColor: number;
  hasWeapon?: string;
  hasShield?: boolean;
  hasHelm?: boolean;
  hasCape?: boolean;
  glowColor?: number;
}

interface EnemyMaterials {
  mat: (c: number) => THREE.MeshPhysicalMaterial;
  skinMat: (c: number) => THREE.MeshPhysicalMaterial;
  armorMat: (c: number) => THREE.MeshPhysicalMaterial;
  furMat: (c: number) => THREE.MeshPhysicalMaterial;
  eyeMat: THREE.MeshPhysicalMaterial;
  glowMat: THREE.MeshPhysicalMaterial | null;
  addWeapon: (parent: THREE.Group, wx: number, wy: number) => void;
  addShield: (parent: THREE.Group, sx: number, sy: number) => void;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function castShadows(m: THREE.Mesh): THREE.Mesh {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r: number, wSeg = 24, hSeg = 16): THREE.SphereGeometry {
  return new THREE.SphereGeometry(r, wSeg, hSeg);
}

function cylinder(rTop: number, rBot: number, h: number, seg = 20): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg);
}

function cone(r: number, h: number, seg = 16): THREE.ConeGeometry {
  return new THREE.ConeGeometry(r, h, seg);
}

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d, 2, 2, 2);
}

function torus(r: number, tube: number, rSeg = 16, tSeg = 32): THREE.TorusGeometry {
  return new THREE.TorusGeometry(r, tube, rSeg, tSeg);
}

function plane(w: number, h: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(w, h, 6, 6);
}

function addMesh(
  parent: THREE.Object3D,
  geom: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1
): THREE.Mesh {
  const m = castShadows(new THREE.Mesh(geom, mat));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

function addLight(
  parent: THREE.Object3D,
  color: number,
  intensity: number,
  dist: number,
  x: number,
  y: number,
  z: number
): THREE.PointLight {
  const l = new THREE.PointLight(color, intensity, dist);
  l.position.set(x, y, z);
  parent.add(l);
  return l;
}

// ============================================================================
// BUILD LARGE ENEMY – DRAGON
// ============================================================================

export function buildLargeEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials
): void {
  const s = look.scale;
  const bodyMat = materials.skinMat(look.bodyColor);
  const accentMat = materials.armorMat(look.accentColor);
  const bellyMat = materials.skinMat(0xd4a574);
  const boneMat = materials.armorMat(0xe8dcc8);
  const toothMat = materials.mat(0xfffff0);
  const tongueMat = materials.skinMat(0xcc3344);
  const hornMat = materials.armorMat(0x3a2a1a);
  const membraneMat = new THREE.MeshPhysicalMaterial({
    color: look.accentColor,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const veinMat = materials.mat(0x220000);
  const scarMat = materials.mat(0x553333);
  const smokeMat = new THREE.MeshPhysicalMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.2,
    roughness: 1.0,
  });
  const fireMat = new THREE.MeshPhysicalMaterial({
    color: 0xff4400,
    emissive: 0xff2200,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.8,
  });
  const corneaMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    roughness: 0.0,
  });
  const irisMat = materials.mat(look.eyeColor);
  const pupilMat = materials.mat(0x000000);
  const nictMat = new THREE.MeshPhysicalMaterial({
    color: 0xaabb99,
    transparent: true,
    opacity: 0.3,
  });
  const webMat = new THREE.MeshPhysicalMaterial({
    color: look.bodyColor,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });

  // =========================================================================
  // TORSO – ribcage barrel, narrow waist, wide pelvis
  // =========================================================================

  // Ribcage barrel
  addMesh(g, sphere(1.4 * s, 20, 16), bodyMat, 0, 2.8 * s, 0, 0, 0, 0, 1.1, 0.85, 1.0);

  // Individual rib hints - 8 ribs per side
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 8; i++) {
      const angle = -0.4 + i * 0.1;
      const rx = side * (1.25 * s + 0.05);
      const ry = 2.8 * s + (0.6 - i * 0.15) * s;
      addMesh(g, cylinder(0.04 * s, 0.04 * s, 0.9 * s, 6), boneMat,
        rx, ry, i * 0.08 * s, 0, 0, side * 0.3 + angle);
    }
  }

  // Narrow waist
  addMesh(g, cylinder(0.9 * s, 1.1 * s, 0.8 * s, 16), bodyMat, 0, 1.8 * s, 0);

  // Wide pelvis
  addMesh(g, sphere(1.2 * s, 16, 12), bodyMat, 0, 1.3 * s, -0.4 * s, 0, 0, 0, 1.2, 0.7, 1.0);

  // =========================================================================
  // SCALE PLATES along flanks – 24 per side
  // =========================================================================

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 24; i++) {
      const row = Math.floor(i / 6);
      const col = i % 6;
      const px = side * (1.0 + row * 0.15) * s;
      const py = (3.3 - col * 0.35) * s;
      const pz = (row * 0.2 - 0.3) * s;
      addMesh(g, box(0.22 * s, 0.18 * s, 0.05 * s), accentMat,
        px, py, pz, 0.1, side * 0.2, side * 0.4);
    }
  }

  // =========================================================================
  // BELLY SCALES – 18 horizontal overlapping plates
  // =========================================================================

  for (let i = 0; i < 18; i++) {
    const py = (3.4 - i * 0.2) * s;
    const pz = i < 9 ? 0 : -0.2 * s;
    addMesh(g, box(1.6 * s, 0.12 * s, 0.04 * s), bellyMat,
      0, py, 0.8 * s + pz, 0.15, 0, 0);
  }

  // =========================================================================
  // NECK – 10 vertebrae sections with throat pouch and ventral scales
  // =========================================================================

  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 3.6 * s, 0.8 * s);
  g.add(neckGroup);

  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const segR = (0.7 - t * 0.25) * s;
    const segH = 0.4 * s;
    const nx = 0;
    const ny = i * 0.38 * s;
    const nz = i * 0.25 * s;
    const neckAngle = -0.12 * i;

    // Vertebra cylinder
    addMesh(neckGroup, cylinder(segR, segR * 1.05, segH, 14), bodyMat,
      nx, ny, nz, neckAngle, 0, 0);

    // Throat pouch (underbelly)
    addMesh(neckGroup, cylinder(segR * 0.6, segR * 0.65, segH * 0.6, 10), bellyMat,
      nx, ny - segR * 0.3, nz + 0.15 * s, neckAngle, 0, 0);

    // Ventral neck scale plates (3 per vertebra)
    for (let vs = 0; vs < 3; vs++) {
      const vAngle = (-0.3 + vs * 0.3);
      addMesh(neckGroup, box(0.15 * s, 0.1 * s, 0.03 * s), accentMat,
        vAngle * segR, ny - segR * 0.5, nz + 0.2 * s, neckAngle + 0.2, 0, 0);
    }
  }

  // Chest glow – inner fire inside neck base
  addMesh(neckGroup, sphere(0.4 * s, 12, 8), fireMat, 0, 0.3 * s, 0.1 * s);
  addLight(neckGroup, 0xff4400, 1.5, 4 * s, 0, 0.3 * s, 0.1 * s);

  // =========================================================================
  // HEAD – elongated skull with full detail
  // =========================================================================

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 3.8 * s + 10 * 0.38 * s, 0.8 * s + 10 * 0.25 * s);
  headGroup.rotation.x = -0.3;
  g.add(headGroup);

  // Cranium
  addMesh(headGroup, sphere(0.65 * s, 18, 14), bodyMat, 0, 0.3 * s, 0, 0, 0, 0, 1.0, 0.85, 1.2);

  // Temporal ridges
  addMesh(headGroup, box(1.2 * s, 0.08 * s, 0.15 * s), accentMat, 0, 0.65 * s, -0.1 * s);
  addMesh(headGroup, box(1.0 * s, 0.06 * s, 0.12 * s), accentMat, 0, 0.55 * s, 0.1 * s);

  // Supraorbital ridges (brow horns)
  for (let side = -1; side <= 1; side += 2) {
    addMesh(headGroup, box(0.3 * s, 0.12 * s, 0.2 * s), accentMat,
      side * 0.35 * s, 0.55 * s, 0.35 * s, 0.2, side * 0.15, 0);
  }

  // Snout (upper jaw)
  addMesh(headGroup, box(0.6 * s, 0.35 * s, 1.2 * s), bodyMat,
    0, 0.1 * s, 0.9 * s, 0, 0, 0, 1, 1, 1);

  // Snout ridges
  for (let i = 0; i < 4; i++) {
    addMesh(headGroup, box(0.5 * s - i * 0.05 * s, 0.04 * s, 0.25 * s), accentMat,
      0, 0.3 * s, 0.4 * s + i * 0.25 * s);
  }

  // Lower jaw
  const lowerJaw = new THREE.Group();
  lowerJaw.position.set(0, -0.15 * s, 0.3 * s);
  lowerJaw.rotation.x = 0.15; // slightly open
  headGroup.add(lowerJaw);

  addMesh(lowerJaw, box(0.5 * s, 0.2 * s, 1.0 * s), bodyMat, 0, 0, 0.35 * s);

  // TEETH – upper jaw: 14 teeth
  for (let i = 0; i < 14; i++) {
    const side = i < 7 ? -1 : 1;
    const idx = i % 7;
    const isCanine = idx === 2 || idx === 3;
    const tH = isCanine ? 0.2 * s : 0.12 * s;
    const tR = isCanine ? 0.04 * s : 0.025 * s;
    const tx = side * (0.08 + idx * 0.04) * s;
    const tz = 0.3 * s + idx * 0.1 * s;
    addMesh(headGroup, cone(tR, tH, 6), toothMat,
      tx, -0.12 * s, tz, Math.PI, 0, 0);
  }

  // TEETH – lower jaw: 14 teeth
  for (let i = 0; i < 14; i++) {
    const side = i < 7 ? -1 : 1;
    const idx = i % 7;
    const isCanine = idx === 2 || idx === 3;
    const tH = isCanine ? 0.18 * s : 0.1 * s;
    const tR = isCanine ? 0.035 * s : 0.02 * s;
    const tx = side * (0.07 + idx * 0.035) * s;
    const tz = 0.1 * s + idx * 0.1 * s;
    addMesh(lowerJaw, cone(tR, tH, 6), toothMat,
      tx, 0.12 * s, tz, 0, 0, 0);
  }

  // TONGUE – forked
  addMesh(lowerJaw, cylinder(0.06 * s, 0.04 * s, 0.5 * s, 8), tongueMat,
    0, 0.05 * s, 0.6 * s, Math.PI / 2 - 0.1, 0, 0);
  // Fork prongs
  addMesh(lowerJaw, cone(0.025 * s, 0.2 * s, 6), tongueMat,
    -0.04 * s, 0.06 * s, 0.9 * s, Math.PI / 2 - 0.2, 0, -0.2);
  addMesh(lowerJaw, cone(0.025 * s, 0.2 * s, 6), tongueMat,
    0.04 * s, 0.06 * s, 0.9 * s, Math.PI / 2 - 0.2, 0, 0.2);

  // NOSTRILS with inner glow + smoke particles
  for (let side = -1; side <= 1; side += 2) {
    const nx = side * 0.12 * s;
    const ny = 0.25 * s;
    const nz = 1.45 * s;

    // Nostril opening
    addMesh(headGroup, torus(0.06 * s, 0.02 * s, 8, 12), bodyMat, nx, ny, nz, 0.3, 0, 0);
    // Inner glow
    addMesh(headGroup, sphere(0.04 * s, 8, 6), fireMat, nx, ny, nz + 0.02 * s);

    // Smoke particles (5 per nostril)
    for (let sp = 0; sp < 5; sp++) {
      const sx2 = nx + (Math.random() - 0.5) * 0.1 * s;
      const sy = ny + 0.1 * s + sp * 0.08 * s;
      const sz = nz + 0.05 * s + sp * 0.04 * s;
      addMesh(headGroup, sphere(0.03 * s + sp * 0.005 * s, 6, 4), smokeMat, sx2, sy, sz);
    }
  }

  // EYES – slit-pupil with full detail
  for (let side = -1; side <= 1; side += 2) {
    const ex = side * 0.45 * s;
    const ey = 0.4 * s;
    const ez = 0.35 * s;

    // Outer eyeball
    addMesh(headGroup, sphere(0.14 * s, 14, 10), materials.eyeMat, ex, ey, ez);

    // Iris ring
    addMesh(headGroup, torus(0.08 * s, 0.03 * s, 10, 20), irisMat,
      ex, ey, ez + 0.1 * s, 0, 0, 0);

    // Vertical slit pupil
    addMesh(headGroup, box(0.02 * s, 0.12 * s, 0.01 * s), pupilMat,
      ex, ey, ez + 0.13 * s);

    // Reflective cornea (clearcoat sphere)
    addMesh(headGroup, sphere(0.145 * s, 14, 10), corneaMat, ex, ey, ez);

    // Nictitating membrane hint
    addMesh(headGroup, sphere(0.15 * s, 10, 6), nictMat,
      ex, ey + 0.05 * s, ez, 0, 0, 0, 1.0, 0.5, 1.0);

    // Eye glow light
    addLight(headGroup, look.eyeColor, 0.8, 2 * s, ex, ey, ez + 0.2 * s);
  }

  // =========================================================================
  // HORNS – 2 large + 4 smaller nubs along skull ridge
  // =========================================================================

  for (let side = -1; side <= 1; side += 2) {
    // Large main horns
    const hornGroup = new THREE.Group();
    hornGroup.position.set(side * 0.4 * s, 0.65 * s, -0.2 * s);
    hornGroup.rotation.set(-0.6, side * 0.3, side * 0.2);
    headGroup.add(hornGroup);

    // Horn built from tapered segments with spiral twist
    for (let h = 0; h < 8; h++) {
      const t = h / 7;
      const hR = (0.1 - t * 0.09) * s;
      const hH = 0.2 * s;
      addMesh(hornGroup, cylinder(hR * 0.85, hR, hH, 8), hornMat,
        0, h * 0.18 * s, 0, 0, t * 0.4 * side, 0);
    }

    // 2 smaller nubs per side
    for (let n = 0; n < 2; n++) {
      const nubGroup = new THREE.Group();
      nubGroup.position.set(side * (0.3 + n * 0.15) * s, 0.6 * s, (-0.4 - n * 0.2) * s);
      nubGroup.rotation.set(-0.8, side * 0.15, side * 0.1);
      headGroup.add(nubGroup);

      for (let h = 0; h < 4; h++) {
        const t = h / 3;
        const hR = (0.06 - t * 0.05) * s;
        addMesh(nubGroup, cylinder(hR * 0.8, hR, 0.12 * s, 6), hornMat,
          0, h * 0.11 * s, 0, 0, t * 0.3 * side, 0);
      }
    }
  }

  // Battle damage: broken horn tip (one side shorter)
  // Already handled by asymmetric horn count – left horn gets extra tip removed effect
  addMesh(headGroup, sphere(0.05 * s, 6, 4), scarMat,
    -0.4 * s, 0.65 * s + 8 * 0.18 * s, -0.2 * s);

  // =========================================================================
  // DORSAL SPINES – 14 from skull to tail, with webbing
  // =========================================================================

  const spinePositions: { x: number; y: number; z: number; h: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const spineH = (0.5 - Math.abs(t - 0.2) * 0.8) * s;
    const px = 0;
    const py = (7.2 - t * 5.5) * s;
    const pz = (3.0 - t * 5.0) * s;

    addMesh(g, cone(0.06 * s, Math.max(spineH, 0.1 * s), 6), accentMat,
      px, py + spineH * 0.5, pz, 0, 0, 0);

    spinePositions.push({ x: px, y: py + spineH, z: pz, h: spineH });

    // Webbing between adjacent spines
    if (i > 0) {
      const prev = spinePositions[i - 1];
      const cur = spinePositions[i];
      const midX = (prev.x + cur.x) / 2;
      const midY = (prev.y + cur.y) / 2;
      const midZ = (prev.z + cur.z) / 2;
      const dist = Math.sqrt(
        (cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2 + (cur.z - prev.z) ** 2
      );
      const webPlane = addMesh(g, plane(dist, Math.min(prev.h, cur.h) * 0.7), webMat,
        midX, midY - 0.1 * s, midZ);
      webPlane.lookAt(new THREE.Vector3(cur.x, cur.y, cur.z));
    }
  }

  // =========================================================================
  // TAIL – 12 articulated segments with club and lateral spines
  // =========================================================================

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 1.3 * s, -1.4 * s);
  g.add(tailGroup);

  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const tR = (0.5 - t * 0.42) * s;
    const segLen = 0.5 * s;
    const tx = 0;
    const ty = -i * 0.12 * s;
    const tz = -i * segLen;
    const curvature = -0.08 * i;

    // Main segment
    addMesh(tailGroup, cylinder(tR * 0.9, tR, segLen, 12), bodyMat,
      tx, ty, tz, curvature, 0, 0);

    // Belly plate
    addMesh(tailGroup, box(tR * 1.4, 0.05 * s, segLen * 0.8), bellyMat,
      tx, ty - tR * 0.7, tz, curvature, 0, 0);

    // Lateral spines (every other segment)
    if (i % 2 === 0 && i > 2) {
      for (let side = -1; side <= 1; side += 2) {
        addMesh(tailGroup, cone(0.03 * s, 0.15 * s, 5), accentMat,
          side * tR * 1.1, ty, tz, 0, 0, side * 1.2);
      }
    }
  }

  // Tail club – diamond shape from two cones
  const tailEnd = -12 * 0.5 * s;
  addMesh(tailGroup, cone(0.2 * s, 0.4 * s, 8), accentMat,
    0, -12 * 0.12 * s, tailEnd, Math.PI, 0, 0);
  addMesh(tailGroup, cone(0.2 * s, 0.35 * s, 8), accentMat,
    0, -12 * 0.12 * s + 0.35 * s, tailEnd, 0, 0, 0);

  // Tail tip spike
  addMesh(tailGroup, cone(0.06 * s, 0.3 * s, 6), boneMat,
    0, -12 * 0.12 * s - 0.4 * s, tailEnd, Math.PI, 0, 0);

  // =========================================================================
  // WINGS – full bone structure with membrane and veins
  // =========================================================================

  for (let side = -1; side <= 1; side += 2) {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(side * 1.3 * s, 3.2 * s, -0.2 * s);
    wingGroup.rotation.set(0, side * 0.4, side * 0.6);
    g.add(wingGroup);

    // Humerus
    addMesh(wingGroup, cylinder(0.12 * s, 0.1 * s, 1.5 * s, 10), bodyMat,
      0, 0.75 * s, 0, 0, 0, side * 0.8);

    // Elbow joint
    const elbowX = side * 1.1 * s;
    const elbowY = 0.4 * s;
    addMesh(wingGroup, sphere(0.14 * s, 10, 8), bodyMat, elbowX, elbowY, 0);

    // Radius / Ulna
    addMesh(wingGroup, cylinder(0.1 * s, 0.07 * s, 1.8 * s, 10), bodyMat,
      elbowX + side * 0.9 * s, elbowY + 0.3 * s, 0, 0, 0, side * 1.0);
    addMesh(wingGroup, cylinder(0.07 * s, 0.05 * s, 1.7 * s, 8), bodyMat,
      elbowX + side * 0.85 * s, elbowY + 0.2 * s, 0.08 * s, 0.1, 0, side * 1.0);

    // Thumb claw at wing joint
    addMesh(wingGroup, cone(0.05 * s, 0.25 * s, 6), boneMat,
      elbowX, elbowY - 0.2 * s, 0.1 * s, 0.5, 0, side * 0.3);

    // 4 wing finger bones with membrane panels
    const wristX = elbowX + side * 2.0 * s;
    const wristY = elbowY + 0.7 * s;

    for (let f = 0; f < 4; f++) {
      const fingerAngle = (-0.3 + f * 0.25) * side;
      const fingerLen = (2.5 - f * 0.4) * s;
      const endX = wristX + Math.sin(fingerAngle) * fingerLen;
      const endY = wristY + Math.cos(fingerAngle) * fingerLen * 0.5;
      const endZ = f * 0.3 * s;

      // Finger bone segments (3 per finger)
      for (let seg = 0; seg < 3; seg++) {
        const st = seg / 3;
        const segStartX = wristX + (endX - wristX) * st;
        const segStartY = wristY + (endY - wristY) * st;
        const segStartZ = endZ * st;
        const segR = (0.06 - seg * 0.015) * s;
        const segL = fingerLen / 3;

        addMesh(wingGroup, cylinder(segR, segR * 0.8, segL, 8), bodyMat,
          segStartX + (endX - wristX) / 6,
          segStartY + (endY - wristY) / 6,
          segStartZ + endZ / 6,
          fingerAngle * 0.3, fingerAngle, 0);

        // Joint sphere
        addMesh(wingGroup, sphere(segR * 1.2, 6, 4), bodyMat,
          segStartX, segStartY, segStartZ);
      }

      // Membrane panel between this finger and the next (or body)
      if (f < 3) {
        const nextAngle = (-0.3 + (f + 1) * 0.25) * side;
        const nextLen = (2.5 - (f + 1) * 0.4) * s;
        const nextEndX = wristX + Math.sin(nextAngle) * nextLen;
        const nextEndY = wristY + Math.cos(nextAngle) * nextLen * 0.5;

        const memW = Math.sqrt((nextEndX - endX) ** 2 + (nextEndY - endY) ** 2);
        const memH = fingerLen * 0.7;
        addMesh(wingGroup, plane(memW, memH), membraneMat,
          (endX + nextEndX) / 2, (endY + nextEndY) / 2, (f * 0.3 + (f + 1) * 0.3) / 2 * s,
          0, 0, 0);

        // Vein patterns on each membrane panel (4 veins each)
        for (let v = 0; v < 4; v++) {
          const veinLen = memH * 0.6;
          addMesh(wingGroup, cylinder(0.01 * s, 0.008 * s, veinLen, 4), veinMat,
            (endX + nextEndX) / 2 + (v - 1.5) * memW * 0.15,
            (endY + nextEndY) / 2,
            ((f * 0.3 + (f + 1) * 0.3) / 2 + 0.01) * s,
            0.1 * v, 0, 0);
        }
      }
    }

    // Last membrane panel connecting to body
    const lastFingerAngle = (-0.3 + 3 * 0.25) * side;
    const lastFingerLen = (2.5 - 3 * 0.4) * s;
    const lastEndX = wristX + Math.sin(lastFingerAngle) * lastFingerLen;
    const lastEndY = wristY + Math.cos(lastFingerAngle) * lastFingerLen * 0.5;
    const bodyConnectX = side * 0.8 * s;
    const bodyConnectY = 2.0 * s;

    const lastMemW = Math.sqrt((bodyConnectX - lastEndX) ** 2 + (bodyConnectY - lastEndY) ** 2);
    addMesh(wingGroup, plane(lastMemW, lastFingerLen * 0.6), membraneMat,
      (lastEndX + bodyConnectX) / 2, (lastEndY + bodyConnectY) / 2, 0.5 * s);

    // Under-wing ambient light
    addLight(wingGroup, look.accentColor, 0.5, 3 * s, wristX * 0.5, wristY * 0.5, 0.5 * s);
  }

  // =========================================================================
  // LEGS – 4 legs with thigh, knee, shin, ankle, toes + talons
  // =========================================================================

  const legConfigs = [
    { x: -1.0, z: 0.6, label: "FL" },
    { x: 1.0, z: 0.6, label: "FR" },
    { x: -1.1, z: -0.8, label: "RL" },
    { x: 1.1, z: -0.8, label: "RR" },
  ];

  for (const leg of legConfigs) {
    const legGroup = new THREE.Group();
    const isRear = leg.label.startsWith("R");
    legGroup.position.set(leg.x * s, isRear ? 1.3 * s : 2.2 * s, leg.z * s);
    g.add(legGroup);

    const thighLen = isRear ? 1.2 * s : 1.0 * s;
    const shinLen = isRear ? 1.0 * s : 0.9 * s;
    const side = leg.x > 0 ? 1 : -1;

    // Hip joint
    addMesh(legGroup, sphere(0.25 * s, 10, 8), bodyMat, 0, 0, 0);

    // Thigh (sphere + cylinder)
    addMesh(legGroup, sphere(0.2 * s, 10, 8), bodyMat, 0, -0.15 * s, 0);
    addMesh(legGroup, cylinder(0.2 * s, 0.14 * s, thighLen, 12), bodyMat,
      side * 0.15 * s, -thighLen / 2, 0, 0, 0, side * 0.2);

    // Knee joint
    const kneeY = -thighLen;
    const kneeX = side * 0.3 * s;
    addMesh(legGroup, sphere(0.16 * s, 10, 8), accentMat, kneeX, kneeY, 0);

    // Shin
    addMesh(legGroup, cylinder(0.14 * s, 0.1 * s, shinLen, 10), bodyMat,
      kneeX, kneeY - shinLen / 2, 0.1 * s, 0.2, 0, 0);

    // Ankle
    const ankleY = kneeY - shinLen;
    addMesh(legGroup, sphere(0.12 * s, 8, 6), accentMat, kneeX, ankleY, 0.2 * s);

    // Foot
    addMesh(legGroup, box(0.3 * s, 0.08 * s, 0.35 * s), bodyMat,
      kneeX, ankleY - 0.1 * s, 0.35 * s);

    // 4 toes with curved talons
    for (let t = 0; t < 4; t++) {
      const toeX = kneeX + (t - 1.5) * 0.08 * s;
      const toeZ = 0.5 * s;
      const toeY = ankleY - 0.12 * s;

      // Toe segment
      addMesh(legGroup, cylinder(0.04 * s, 0.03 * s, 0.18 * s, 6), bodyMat,
        toeX, toeY, toeZ, Math.PI / 2 - 0.2, 0, 0);

      // Curved talon (bent cone)
      const talonGroup = new THREE.Group();
      talonGroup.position.set(toeX, toeY - 0.03 * s, toeZ + 0.15 * s);
      talonGroup.rotation.x = 0.8;
      legGroup.add(talonGroup);
      addMesh(talonGroup, cone(0.025 * s, 0.15 * s, 5), boneMat, 0, 0, 0, 0.4, 0, 0);
    }
  }

  // =========================================================================
  // BATTLE DAMAGE – scars and missing scale patches
  // =========================================================================

  // Scar across flank
  addMesh(g, box(0.03 * s, 0.02 * s, 0.8 * s), scarMat, 1.15 * s, 2.5 * s, 0.2 * s, 0, 0, 0.3);
  addMesh(g, box(0.03 * s, 0.02 * s, 0.5 * s), scarMat, -0.9 * s, 3.0 * s, -0.1 * s, 0.1, 0, -0.2);

  // Missing scale patch indicators (darker exposed skin)
  addMesh(g, sphere(0.15 * s, 6, 4), scarMat, 0.8 * s, 2.8 * s, 0.5 * s);
  addMesh(g, sphere(0.12 * s, 6, 4), scarMat, -1.0 * s, 2.3 * s, -0.3 * s);
  addMesh(g, sphere(0.1 * s, 6, 4), scarMat, 0.5 * s, 1.6 * s, 0.4 * s);

  // Old wound on shoulder
  addMesh(g, torus(0.08 * s, 0.02 * s, 6, 8), scarMat, 1.1 * s, 3.1 * s, 0.3 * s, 0.5, 0.3, 0);

  // =========================================================================
  // Throat glow point light
  // =========================================================================

  addLight(g, 0xff3300, 2.0, 5 * s, 0, 4.0 * s, 1.5 * s);

  // =========================================================================
  // Weapon / Shield attachment
  // =========================================================================

  if (look.hasWeapon) {
    materials.addWeapon(g, 1.8 * s, 2.0 * s);
  }
  if (look.hasShield) {
    materials.addShield(g, -1.8 * s, 2.5 * s);
  }
}

// ============================================================================
// BUILD ARACHNID ENEMY – SPIDER
// ============================================================================

export function buildArachnidEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials
): void {
  const s = look.scale;
  const bodyMat = materials.skinMat(look.bodyColor);
  const accentMat = materials.armorMat(look.accentColor);
  const chitinMat = materials.armorMat(look.bodyColor);
  const fangMat = materials.mat(0x1a1a1a);
  const venomMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ff44,
    transparent: true,
    opacity: 0.6,
    emissive: 0x44aa00,
    emissiveIntensity: 0.5,
  });
  const hairMat = materials.furMat(look.bodyColor);
  const markingMat = materials.mat(look.accentColor);
  const corneaMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
  });
  const silkMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.3,
  });
  const sternumMat = materials.armorMat(0x2a2218);
  const labiumMat = materials.skinMat(0x3a2a20);
  const slitMat = materials.mat(0x111111);
  const padMat = materials.skinMat(0x554433);
  const eggMat = new THREE.MeshPhysicalMaterial({
    color: 0xeeddcc,
    transparent: true,
    opacity: 0.7,
    roughness: 0.4,
  });
  const glowMat = look.glowColor
    ? new THREE.MeshPhysicalMaterial({
        color: look.glowColor,
        emissive: look.glowColor,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.8,
      })
    : null;

  // =========================================================================
  // CEPHALOTHORAX – flattened, wider than tall, with carapace ridges
  // =========================================================================

  const cephGroup = new THREE.Group();
  cephGroup.position.set(0, 1.2 * s, 0.6 * s);
  g.add(cephGroup);

  // Main cephalothorax shape – flattened sphere
  addMesh(cephGroup, sphere(0.8 * s, 20, 16), chitinMat,
    0, 0, 0, 0, 0, 0, 1.15, 0.65, 1.0);

  // Anterior narrowing
  addMesh(cephGroup, sphere(0.5 * s, 14, 10), chitinMat,
    0, 0.05 * s, 0.55 * s, 0, 0, 0, 0.9, 0.55, 0.7);

  // Carapace ridges – 4 raised longitudinal ridges
  for (let i = 0; i < 4; i++) {
    const rx = (-0.3 + i * 0.2) * s;
    addMesh(cephGroup, box(0.06 * s, 0.04 * s, 1.2 * s), accentMat,
      rx, 0.45 * s, -0.1 * s);
  }

  // Lateral carapace edge ridges
  for (let side = -1; side <= 1; side += 2) {
    addMesh(cephGroup, box(0.04 * s, 0.03 * s, 0.9 * s), accentMat,
      side * 0.75 * s, 0.3 * s, 0, 0, side * 0.15, 0);
  }

  // Fovea (central depression)
  addMesh(cephGroup, sphere(0.08 * s, 8, 6), slitMat,
    0, 0.42 * s, -0.1 * s, 0, 0, 0, 1.5, 0.3, 1.5);

  // =========================================================================
  // CEPHALOTHORAX UNDERSIDE – sternum, labium, coxal glands
  // =========================================================================

  // Sternum plate
  addMesh(cephGroup, box(0.5 * s, 0.04 * s, 0.7 * s), sternumMat,
    0, -0.5 * s, -0.1 * s, 0, 0, 0, 1.0, 1.0, 1.0);

  // Labium
  addMesh(cephGroup, sphere(0.1 * s, 8, 6), labiumMat,
    0, -0.48 * s, 0.4 * s, 0, 0, 0, 1.0, 0.5, 0.8);

  // Coxal glands (4 pairs of small bumps)
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      addMesh(cephGroup, sphere(0.04 * s, 6, 4), sternumMat,
        side * (0.15 + i * 0.08) * s, -0.52 * s, (0.2 - i * 0.15) * s);
    }
  }

  // =========================================================================
  // PEDICEL – narrow waist connection
  // =========================================================================

  const pedicelGroup = new THREE.Group();
  pedicelGroup.position.set(0, 1.15 * s, -0.2 * s);
  g.add(pedicelGroup);

  // Main pedicel cylinder
  addMesh(pedicelGroup, cylinder(0.15 * s, 0.18 * s, 0.35 * s, 12), chitinMat,
    0, 0, 0);

  // Chitinous rings (5 visible rings)
  for (let i = 0; i < 5; i++) {
    addMesh(pedicelGroup, torus(0.16 * s + i * 0.005 * s, 0.015 * s, 6, 16), accentMat,
      0, -0.14 * s + i * 0.07 * s, 0, Math.PI / 2, 0, 0);
  }

  // =========================================================================
  // ABDOMEN (OPISTHOSOMA) – large ovoid with markings
  // =========================================================================

  const abdGroup = new THREE.Group();
  abdGroup.position.set(0, 1.3 * s, -1.2 * s);
  g.add(abdGroup);

  // Main abdomen shape
  addMesh(abdGroup, sphere(1.1 * s, 22, 18), bodyMat,
    0, 0, 0, 0, 0, 0, 0.9, 0.85, 1.2);

  // Posterior taper
  addMesh(abdGroup, sphere(0.7 * s, 14, 10), bodyMat,
    0, -0.1 * s, -0.7 * s, 0, 0, 0, 0.7, 0.7, 0.9);

  // =========================================================================
  // ABDOMEN MARKINGS – hourglass/skull pattern from colored shapes
  // =========================================================================

  const markY = 0.78 * s;

  // Hourglass upper triangle
  addMesh(abdGroup, cone(0.2 * s, 0.3 * s, 3), markingMat,
    0, markY, 0.3 * s, 0, 0, 0);

  // Hourglass lower triangle (inverted)
  addMesh(abdGroup, cone(0.2 * s, 0.3 * s, 3), markingMat,
    0, markY, 0, Math.PI, 0, 0);

  // Hourglass waist connection
  addMesh(abdGroup, box(0.06 * s, 0.05 * s, 0.15 * s), markingMat,
    0, markY, 0.15 * s);

  // Surrounding accent dots (8 small shapes around hourglass)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dotR = 0.35 * s;
    addMesh(abdGroup, sphere(0.04 * s, 6, 4), markingMat,
      Math.cos(angle) * dotR, markY + 0.02 * s, 0.15 * s + Math.sin(angle) * dotR * 0.5);
  }

  // Lateral stripe marks
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      addMesh(abdGroup, box(0.15 * s, 0.03 * s, 0.08 * s), markingMat,
        side * 0.65 * s, 0.5 * s + i * 0.15 * s, -0.2 * s + i * 0.1 * s,
        0, side * 0.3, 0);
    }
  }

  // Abdomen glow from markings
  if (glowMat) {
    addMesh(abdGroup, sphere(0.15 * s, 8, 6), glowMat, 0, markY + 0.05 * s, 0.15 * s);
    addLight(abdGroup, look.glowColor!, 0.8, 2 * s, 0, markY + 0.1 * s, 0.15 * s);
  }

  // =========================================================================
  // SILK GLAND BUMPS – 3 pairs at rear of abdomen
  // =========================================================================

  for (let pair = 0; pair < 3; pair++) {
    for (let side = -1; side <= 1; side += 2) {
      addMesh(abdGroup, sphere(0.06 * s, 8, 6), chitinMat,
        side * (0.15 + pair * 0.05) * s, -0.25 * s - pair * 0.08 * s, -1.1 * s - pair * 0.1 * s);
    }
  }

  // =========================================================================
  // SPINNERETS – 6 articulated nozzles at rear
  // =========================================================================

  const spinneretGroup = new THREE.Group();
  spinneretGroup.position.set(0, -0.1 * s, -1.9 * s);
  abdGroup.add(spinneretGroup);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const sr = 0.12 * s;
    const sx2 = Math.cos(angle) * sr;
    const sy = Math.sin(angle) * sr;

    // Spinneret base
    addMesh(spinneretGroup, cylinder(0.035 * s, 0.025 * s, 0.12 * s, 6), chitinMat,
      sx2, sy, 0, angle * 0.2, 0, 0);

    // Spinneret tip
    addMesh(spinneretGroup, cone(0.02 * s, 0.06 * s, 5), chitinMat,
      sx2, sy, -0.08 * s, angle * 0.2, 0, 0);

    // Tiny nozzle opening
    addMesh(spinneretGroup, torus(0.015 * s, 0.005 * s, 4, 8), slitMat,
      sx2, sy, -0.12 * s, Math.PI / 2, 0, 0);
  }

  // Web anchor – silk strand trailing from spinnerets
  addMesh(spinneretGroup, cylinder(0.01 * s, 0.005 * s, 2.0 * s, 4), silkMat,
    0, 0, -1.2 * s, 0.3, 0, 0);

  // =========================================================================
  // BOOK LUNG SLITS – 2 pairs on abdomen underside
  // =========================================================================

  for (let pair = 0; pair < 2; pair++) {
    for (let side = -1; side <= 1; side += 2) {
      addMesh(abdGroup, box(0.15 * s, 0.01 * s, 0.04 * s), slitMat,
        side * 0.3 * s, -0.75 * s, 0.5 * s - pair * 0.35 * s);
    }
  }

  // Spiracle
  addMesh(abdGroup, torus(0.03 * s, 0.01 * s, 6, 10), slitMat,
    0, -0.78 * s, -0.3 * s, Math.PI / 2, 0, 0);

  // =========================================================================
  // EGG SAC – carried under abdomen
  // =========================================================================

  const eggSacGroup = new THREE.Group();
  eggSacGroup.position.set(0, -0.6 * s, -0.6 * s);
  abdGroup.add(eggSacGroup);

  // Silk wrapping (semi-transparent sphere)
  addMesh(eggSacGroup, sphere(0.35 * s, 12, 10), silkMat, 0, 0, 0);

  // Individual eggs inside (12 small spheres)
  for (let e = 0; e < 12; e++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const er = 0.2 * s;
    addMesh(eggSacGroup, sphere(0.05 * s, 6, 4), eggMat,
      Math.sin(phi) * Math.cos(theta) * er,
      Math.sin(phi) * Math.sin(theta) * er,
      Math.cos(phi) * er);
  }

  // Silk attachment threads (3)
  for (let t = 0; t < 3; t++) {
    const ta = (t / 3) * Math.PI * 2;
    addMesh(eggSacGroup, cylinder(0.008 * s, 0.006 * s, 0.5 * s, 4), silkMat,
      Math.cos(ta) * 0.1 * s, 0.3 * s, Math.sin(ta) * 0.1 * s, 0.3, ta, 0);
  }

  // =========================================================================
  // CHELICERAE – 2 large fangs with venom droplets
  // =========================================================================

  for (let side = -1; side <= 1; side += 2) {
    const chelGroup = new THREE.Group();
    chelGroup.position.set(side * 0.2 * s, 0, 0.85 * s);
    chelGroup.rotation.set(0.2, side * 0.25, 0); // spread for threat display
    cephGroup.add(chelGroup);

    // Basal segment (paturon)
    addMesh(chelGroup, cylinder(0.1 * s, 0.08 * s, 0.35 * s, 10), chitinMat,
      0, -0.1 * s, 0, 0.3, 0, 0);

    // Venom gland bulge behind chelicera
    addMesh(chelGroup, sphere(0.09 * s, 8, 6), chitinMat,
      0, 0.08 * s, -0.12 * s, 0, 0, 0, 1.0, 0.8, 1.2);

    // Fang segment (curved cylinder + cone tip)
    const fangGroup = new THREE.Group();
    fangGroup.position.set(0, -0.3 * s, 0.05 * s);
    fangGroup.rotation.x = 0.6;
    chelGroup.add(fangGroup);

    addMesh(fangGroup, cylinder(0.04 * s, 0.02 * s, 0.35 * s, 8), fangMat,
      0, -0.15 * s, 0, 0.3, 0, 0);

    addMesh(fangGroup, cone(0.025 * s, 0.12 * s, 6), fangMat,
      0, -0.35 * s, 0.05 * s, 0.2, 0, 0);

    // Venom droplet at fang tip
    addMesh(fangGroup, sphere(0.03 * s, 8, 6), venomMat,
      0, -0.42 * s, 0.08 * s);

    // Cheliceral teeth (small serrations along inner edge)
    for (let t = 0; t < 4; t++) {
      addMesh(chelGroup, cone(0.015 * s, 0.04 * s, 4), fangMat,
        side * -0.06 * s, -0.05 * s - t * 0.06 * s, 0.08 * s);
    }
  }

  // =========================================================================
  // PEDIPALPS – 2 fully articulated sensory appendages
  // =========================================================================

  for (let side = -1; side <= 1; side += 2) {
    const palpGroup = new THREE.Group();
    palpGroup.position.set(side * 0.35 * s, -0.1 * s, 0.7 * s);
    cephGroup.add(palpGroup);

    // Coxa
    addMesh(palpGroup, cylinder(0.06 * s, 0.05 * s, 0.15 * s, 8), chitinMat,
      0, 0, 0, 0.4, side * 0.3, 0);

    // Femur
    addMesh(palpGroup, cylinder(0.05 * s, 0.04 * s, 0.25 * s, 8), chitinMat,
      side * 0.08 * s, -0.15 * s, 0.08 * s, 0.2, side * 0.2, 0);

    // Tarsus with bulbous tip (male-style)
    addMesh(palpGroup, sphere(0.07 * s, 10, 8), chitinMat,
      side * 0.15 * s, -0.3 * s, 0.18 * s);

    // Palpal claw
    addMesh(palpGroup, cone(0.02 * s, 0.06 * s, 5), fangMat,
      side * 0.15 * s, -0.38 * s, 0.22 * s, 0.5, 0, 0);

    // Hair bristles on palp
    for (let h = 0; h < 5; h++) {
      const ha = (h / 5) * Math.PI;
      addMesh(palpGroup, cone(0.006 * s, 0.04 * s, 3), hairMat,
        side * (0.1 + Math.cos(ha) * 0.06) * s,
        -0.15 * s + Math.sin(ha) * 0.06 * s,
        0.12 * s);
    }
  }

  // =========================================================================
  // EYES – 8 eyes in anatomically correct cluster
  // =========================================================================

  const eyeCluster = new THREE.Group();
  eyeCluster.position.set(0, 0.35 * s, 0.65 * s);
  cephGroup.add(eyeCluster);

  // Eye definitions: [x, y, z, radius, label]
  const eyeDefs: [number, number, number, number, string][] = [
    // Anterior median (AME) – 2 large front-center
    [-0.06, 0.08, 0.12, 0.065, "AME"],
    [0.06, 0.08, 0.12, 0.065, "AME"],
    // Anterior lateral (ALE) – 2 smaller
    [-0.16, 0.06, 0.08, 0.045, "ALE"],
    [0.16, 0.06, 0.08, 0.045, "ALE"],
    // Posterior median (PME) – 2 small
    [-0.05, 0.16, 0.04, 0.035, "PME"],
    [0.05, 0.16, 0.04, 0.035, "PME"],
    // Posterior lateral (PLE) – 2 small
    [-0.18, 0.14, 0.02, 0.04, "PLE"],
    [0.18, 0.14, 0.02, 0.04, "PLE"],
  ];

  for (const [ex, ey, ez, er, _label] of eyeDefs) {
    const erS = er * s;
    const exS = ex * s;
    const eyS = ey * s;
    const ezS = ez * s;

    // Eyeball
    addMesh(eyeCluster, sphere(erS, 12, 10), materials.eyeMat, exS, eyS, ezS);

    // Pupil (dark inner sphere, slightly forward)
    addMesh(eyeCluster, sphere(erS * 0.6, 8, 6), materials.mat(0x000000),
      exS, eyS, ezS + erS * 0.4);

    // Reflective cornea
    addMesh(eyeCluster, sphere(erS * 1.05, 10, 8), corneaMat, exS, eyS, ezS);

    // Eye socket ridge
    addMesh(eyeCluster, torus(erS * 1.1, erS * 0.15, 8, 14), chitinMat,
      exS, eyS, ezS, 0, 0, 0);
  }

  // Eye cluster glow light
  addLight(eyeCluster, look.eyeColor, 1.0, 2.5 * s, 0, 0.1 * s, 0.15 * s);

  // Secondary eye glow
  addLight(eyeCluster, look.eyeColor, 0.4, 1.5 * s, 0, 0.15 * s, 0);

  // =========================================================================
  // LEGS – 8 fully articulated legs with 7 segments each
  // =========================================================================

  // Leg attachment points on cephalothorax, with angles
  // Format: [xOffset, zOffset, spreadAngle, elevationAngle, length multiplier, raised?]
  const legDefs: [number, number, number, number, number, boolean][] = [
    // Pair 1 (front) – raised for threat display
    [-0.65, 0.4, -0.9, -0.3, 1.1, true],
    [0.65, 0.4, 0.9, -0.3, 1.1, true],
    // Pair 2
    [-0.75, 0.1, -1.2, 0.1, 1.0, false],
    [0.75, 0.1, 1.2, 0.1, 1.0, false],
    // Pair 3
    [-0.72, -0.2, -1.5, 0.2, 0.95, false],
    [0.72, -0.2, 1.5, 0.2, 0.95, false],
    // Pair 4 (rear)
    [-0.6, -0.45, -1.9, 0.3, 0.9, false],
    [0.6, -0.45, 1.9, 0.3, 0.9, false],
  ];

  for (let legIdx = 0; legIdx < 8; legIdx++) {
    const [lx, lz, spreadAng, elevAng, lenMult, raised] = legDefs[legIdx];

    const legGroup = new THREE.Group();
    legGroup.position.set(lx * s, 1.2 * s, (0.6 + lz) * s);
    legGroup.rotation.set(raised ? -0.8 : elevAng, spreadAng, 0);
    g.add(legGroup);

    // 7 segments: coxa, trochanter, femur, patella, tibia, metatarsus, tarsus
    const segDefs: { name: string; rTop: number; rBot: number; len: number }[] = [
      { name: "coxa", rTop: 0.09, rBot: 0.07, len: 0.2 },
      { name: "trochanter", rTop: 0.07, rBot: 0.065, len: 0.12 },
      { name: "femur", rTop: 0.065, rBot: 0.05, len: 0.55 },
      { name: "patella", rTop: 0.055, rBot: 0.05, len: 0.15 },
      { name: "tibia", rTop: 0.05, rBot: 0.04, len: 0.5 },
      { name: "metatarsus", rTop: 0.04, rBot: 0.03, len: 0.4 },
      { name: "tarsus", rTop: 0.03, rBot: 0.02, len: 0.25 },
    ];

    let cumLen = 0;
    for (let si = 0; si < segDefs.length; si++) {
      const seg = segDefs[si];
      const segLen = seg.len * s * lenMult;
      const rT = seg.rTop * s;
      const rB = seg.rBot * s;

      // Digitigrade angle: knees go up, feet go down
      let segAngle = 0;
      if (si === 0) segAngle = 0.5; // coxa up
      else if (si === 1) segAngle = 0.3; // trochanter
      else if (si === 2) segAngle = raised ? -1.2 : 0.8; // femur up
      else if (si === 3) segAngle = raised ? 0.5 : -0.2; // patella (knee)
      else if (si === 4) segAngle = raised ? 0.9 : -1.0; // tibia down
      else if (si === 5) segAngle = raised ? 0.2 : -0.4; // metatarsus
      else segAngle = raised ? -0.1 : 0.2; // tarsus

      // Segment cylinder
      const segX = 0;
      const segY = -cumLen;
      addMesh(legGroup, cylinder(rT, rB, segLen, 8), chitinMat,
        segX, segY - segLen / 2, 0, segAngle, 0, 0);

      // Joint sphere between segments
      if (si > 0) {
        addMesh(legGroup, sphere(rT * 1.1, 8, 6), chitinMat,
          segX, segY, 0);
      }

      // Hair/bristle clusters at each joint (4 tiny cones)
      for (let h = 0; h < 4; h++) {
        const hairAngle = (h / 4) * Math.PI * 2;
        const hairR = rT * 1.3;
        addMesh(legGroup, cone(0.006 * s, 0.04 * s * lenMult, 3), hairMat,
          Math.cos(hairAngle) * hairR,
          segY + Math.sin(hairAngle) * hairR * 0.3,
          Math.sin(hairAngle) * hairR * 0.5,
          hairAngle * 0.3, 0, hairAngle);
      }

      cumLen += segLen;
    }

    // Tarsal claws at foot (2 small hooks)
    const footY = -cumLen;
    for (let claw = -1; claw <= 1; claw += 2) {
      const clawGroup = new THREE.Group();
      clawGroup.position.set(claw * 0.02 * s, footY - 0.02 * s, 0);
      clawGroup.rotation.x = 0.8;
      legGroup.add(clawGroup);
      addMesh(clawGroup, cone(0.01 * s, 0.05 * s, 4), fangMat, 0, 0, 0, 0.4, 0, 0);
    }

    // Scopula pad (flat disc at foot bottom)
    addMesh(legGroup, cylinder(0.03 * s, 0.035 * s, 0.01 * s, 10), padMat,
      0, footY - 0.03 * s, 0);

    // Additional hair bristles along femur and tibia (longer hairs)
    const longHairSegs = [2, 4]; // femur, tibia indices
    for (const lhSeg of longHairSegs) {
      const lhBaseY = -(segDefs.slice(0, lhSeg).reduce((acc, sd) => acc + sd.len * s * lenMult, 0));
      for (let lh = 0; lh < 6; lh++) {
        const lha = (lh / 6) * Math.PI * 2;
        const lhR = segDefs[lhSeg].rTop * s * 1.4;
        addMesh(legGroup, cone(0.005 * s, 0.07 * s * lenMult, 3), hairMat,
          Math.cos(lha) * lhR,
          lhBaseY - lh * 0.06 * s * lenMult,
          Math.sin(lha) * lhR,
          lha * 0.2 + 0.3, 0, lha);
      }
    }
  }

  // =========================================================================
  // BODY HAIR / SETAE – 90+ tiny cone bristles on cephalothorax and abdomen
  // =========================================================================

  // Cephalothorax setae (40 bristles)
  for (let i = 0; i < 40; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5; // upper hemisphere only
    const r = 0.82 * s;
    const bx = Math.sin(phi) * Math.cos(theta) * r * 1.15;
    const by = Math.cos(phi) * r * 0.65;
    const bz = Math.sin(phi) * Math.sin(theta) * r;
    addMesh(cephGroup, cone(0.005 * s, 0.035 * s, 3), hairMat,
      bx, by + 0.05 * s, bz, phi * 0.5, theta, 0);
  }

  // Abdomen setae (50 bristles)
  for (let i = 0; i < 50; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = 1.0 * s;
    const bx = Math.sin(phi) * Math.cos(theta) * r * 0.9;
    const by = Math.cos(phi) * r * 0.85;
    const bz = Math.sin(phi) * Math.sin(theta) * r * 1.2;
    addMesh(abdGroup, cone(0.005 * s, 0.04 * s, 3), hairMat,
      bx, by, bz, phi * 0.3, theta * 0.2, 0);
  }

  // =========================================================================
  // Weapon / Shield attachment
  // =========================================================================

  if (look.hasWeapon) {
    materials.addWeapon(g, 1.0 * s, 1.2 * s);
  }
  if (look.hasShield) {
    materials.addShield(g, -1.0 * s, 1.2 * s);
  }
}
