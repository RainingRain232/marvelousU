import * as THREE from 'three';

// ─── Interfaces ────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function m(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pos(mesh: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  mesh.position.set(x, y, z);
  return mesh;
}

function rot(mesh: THREE.Object3D, rx: number, ry: number, rz: number): THREE.Object3D {
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

// ─── BOSS HUMANOID ─────────────────────────────────────────────────────────────

export function buildBossHumanoidEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials
): void {
  const sc = look.scale;
  const body = look.bodyColor;
  const accent = look.accentColor;
  const glow = look.glowColor ?? accent;

  const armorM = materials.armorMat(body);
  const trimM = materials.armorMat(accent);
  const skinM = materials.skinMat(body);
  const furM = materials.furMat(body);
  const glowEmissive = new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });
  const darkM = materials.mat(0x111111);

  // ── Torso: V-shaped massive ──
  // Upper torso - broad
  const upperTorso = m(new THREE.BoxGeometry(1.6 * sc, 0.8 * sc, 0.8 * sc, 4, 4, 4), armorM);
  pos(upperTorso, 0, 1.6 * sc, 0);
  g.add(upperTorso);

  // Chest pectorals - left and right
  const pectoralGeo = new THREE.SphereGeometry(0.38 * sc, 18, 14, 0, Math.PI);
  const pectoralL = m(pectoralGeo, armorM);
  pos(pectoralL, -0.3 * sc, 1.7 * sc, 0.35 * sc);
  rot(pectoralL, -0.3, 0, 0);
  g.add(pectoralL);
  const pectoralR = m(pectoralGeo, armorM);
  pos(pectoralR, 0.3 * sc, 1.7 * sc, 0.35 * sc);
  rot(pectoralR, -0.3, 0, 0);
  g.add(pectoralR);

  // Breastplate center ridge
  const chestRidge = m(new THREE.BoxGeometry(0.08 * sc, 0.7 * sc, 0.15 * sc), trimM);
  pos(chestRidge, 0, 1.65 * sc, 0.42 * sc);
  g.add(chestRidge);

  // Dragon relief on breastplate - built from multiple small shapes
  const dragonSpineGeo = new THREE.CylinderGeometry(0.02 * sc, 0.02 * sc, 0.5 * sc, 10);
  const dragonSpine = m(dragonSpineGeo, trimM);
  pos(dragonSpine, 0, 1.7 * sc, 0.45 * sc);
  rot(dragonSpine, 0, 0, 0.1);
  g.add(dragonSpine);

  // Dragon wing left relief
  for (let i = 0; i < 4; i++) {
    const wingSegL = m(new THREE.BoxGeometry(0.12 * sc, 0.03 * sc, 0.03 * sc), trimM);
    pos(wingSegL, -0.1 * sc - i * 0.08 * sc, 1.78 * sc - i * 0.04 * sc, 0.46 * sc);
    rot(wingSegL, 0, 0, -0.2 * i);
    g.add(wingSegL);
  }
  // Dragon wing right relief
  for (let i = 0; i < 4; i++) {
    const wingSegR = m(new THREE.BoxGeometry(0.12 * sc, 0.03 * sc, 0.03 * sc), trimM);
    pos(wingSegR, 0.1 * sc + i * 0.08 * sc, 1.78 * sc - i * 0.04 * sc, 0.46 * sc);
    rot(wingSegR, 0, 0, 0.2 * i);
    g.add(wingSegR);
  }

  // Dragon skull center
  const dragonSkull = m(new THREE.OctahedronGeometry(0.06 * sc), trimM);
  pos(dragonSkull, 0, 1.88 * sc, 0.46 * sc);
  g.add(dragonSkull);

  // Gold trim around breastplate edges
  const trimGeoTop = new THREE.TorusGeometry(0.8 * sc, 0.02 * sc, 6, 24, Math.PI);
  const trimTop = m(trimGeoTop, trimM);
  pos(trimTop, 0, 2.0 * sc, 0.0);
  rot(trimTop, Math.PI / 2, 0, 0);
  g.add(trimTop);

  const trimGeoBottom = new THREE.TorusGeometry(0.75 * sc, 0.02 * sc, 6, 24, Math.PI);
  const trimBottom = m(trimGeoBottom, trimM);
  pos(trimBottom, 0, 1.2 * sc, 0.0);
  rot(trimBottom, Math.PI / 2, 0, Math.PI);
  g.add(trimBottom);

  // Abdominal plates - 6-pack
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const abPlate = m(new THREE.BoxGeometry(0.22 * sc, 0.12 * sc, 0.1 * sc, 2, 2, 2), armorM);
      pos(abPlate, (col === 0 ? -0.14 : 0.14) * sc, (1.35 - row * 0.14) * sc, 0.38 * sc);
      g.add(abPlate);
    }
  }

  // Lower torso - narrower waist
  const lowerTorso = m(new THREE.BoxGeometry(1.1 * sc, 0.5 * sc, 0.7 * sc, 3, 3, 3), armorM);
  pos(lowerTorso, 0, 1.0 * sc, 0);
  g.add(lowerTorso);

  // ── Ornate belt ──
  const beltMain = m(new THREE.BoxGeometry(1.3 * sc, 0.15 * sc, 0.85 * sc), trimM);
  pos(beltMain, 0, 0.8 * sc, 0);
  g.add(beltMain);

  // Central buckle - octahedron with emissive gem
  const buckle = m(new THREE.OctahedronGeometry(0.1 * sc), trimM);
  pos(buckle, 0, 0.8 * sc, 0.44 * sc);
  g.add(buckle);
  const buckleGem = m(new THREE.SphereGeometry(0.04 * sc, 8, 8), glowEmissive);
  pos(buckleGem, 0, 0.8 * sc, 0.5 * sc);
  g.add(buckleGem);

  // Skull decorations on belt
  for (const sx of [-0.35, 0.35]) {
    const skullDec = m(new THREE.SphereGeometry(0.06 * sc, 8, 6), darkM);
    pos(skullDec, sx * sc, 0.8 * sc, 0.44 * sc);
    g.add(skullDec);
    // Eye sockets
    for (const ex of [-0.02, 0.02]) {
      const skullEye = m(new THREE.SphereGeometry(0.015 * sc, 6, 6), glowEmissive);
      pos(skullEye, (sx + ex) * sc, 0.82 * sc, 0.49 * sc);
      g.add(skullEye);
    }
  }

  // Hanging trophy chains from belt
  for (const cx of [-0.5, -0.25, 0.25, 0.5]) {
    for (let ci = 0; ci < 4; ci++) {
      const chainLink = m(new THREE.TorusGeometry(0.025 * sc, 0.006 * sc, 6, 8), trimM);
      pos(chainLink, cx * sc, (0.72 - ci * 0.06) * sc, 0.44 * sc);
      rot(chainLink, ci % 2 === 0 ? 0 : Math.PI / 2, 0, 0);
      g.add(chainLink);
    }
  }

  // ── Fauld: 5 overlapping waist plates ──
  for (let fi = 0; fi < 5; fi++) {
    const angle = (fi - 2) * 0.35;
    const fauld = m(new THREE.BoxGeometry(0.28 * sc, 0.25 * sc, 0.06 * sc), armorM);
    pos(fauld, Math.sin(angle) * 0.5 * sc, 0.6 * sc, Math.cos(angle) * 0.45 * sc);
    rot(fauld, 0.2, angle, 0);
    g.add(fauld);
    // Spike on fauld
    const fauldSpike = m(new THREE.ConeGeometry(0.02 * sc, 0.1 * sc, 6), trimM);
    pos(fauldSpike, Math.sin(angle) * 0.52 * sc, 0.5 * sc, Math.cos(angle) * 0.48 * sc);
    rot(fauldSpike, 0.3, angle, 0);
    g.add(fauldSpike);
  }

  // Tassets with spikes
  for (const tx of [-0.4, 0.4]) {
    const tasset = m(new THREE.BoxGeometry(0.3 * sc, 0.3 * sc, 0.08 * sc), armorM);
    pos(tasset, tx * sc, 0.55 * sc, 0.3 * sc);
    rot(tasset, 0.15, 0, 0);
    g.add(tasset);
    const tassetSpike = m(new THREE.ConeGeometry(0.025 * sc, 0.12 * sc, 6), trimM);
    pos(tassetSpike, tx * sc, 0.42 * sc, 0.34 * sc);
    rot(tassetSpike, 0.15, 0, 0);
    g.add(tassetSpike);
  }

  // ── Pauldrons ──
  for (const side of [-1, 1]) {
    const pauldronGroup = new THREE.Group();
    pauldronGroup.position.set(side * 0.85 * sc, 1.95 * sc, 0);

    // 4 layered plates
    for (let li = 0; li < 4; li++) {
      const plate = m(
        new THREE.BoxGeometry((0.45 - li * 0.06) * sc, 0.08 * sc, (0.5 - li * 0.05) * sc),
        armorM
      );
      pos(plate, 0, -li * 0.09 * sc, 0);
      pauldronGroup.add(plate);

      // Edge trim on each plate
      const edgeTrim = m(
        new THREE.BoxGeometry((0.47 - li * 0.06) * sc, 0.02 * sc, 0.02 * sc),
        trimM
      );
      pos(edgeTrim, 0, -li * 0.09 * sc, (0.26 - li * 0.025) * sc);
      pauldronGroup.add(edgeTrim);
    }

    // 3 spikes per pauldron
    for (let si = 0; si < 3; si++) {
      const spike = m(new THREE.ConeGeometry(0.03 * sc, 0.2 * sc, 8), trimM);
      pos(spike, (si - 1) * 0.12 * sc, 0.12 * sc, 0);
      pauldronGroup.add(spike);
    }

    // Hanging chain links from pauldron
    for (let ci = 0; ci < 6; ci++) {
      const cLink = m(new THREE.TorusGeometry(0.02 * sc, 0.005 * sc, 6, 8), trimM);
      pos(cLink, side * 0.1 * sc, -0.35 * sc - ci * 0.05 * sc, 0.15 * sc);
      rot(cLink, ci % 2 === 0 ? 0 : Math.PI / 2, 0, 0);
      pauldronGroup.add(cLink);
    }

    g.add(pauldronGroup);
  }

  // ── Shoulder fur mantle ──
  for (const side of [-1, 1]) {
    for (let fi = 0; fi < 8; fi++) {
      const furCone = m(new THREE.ConeGeometry(0.04 * sc, 0.15 * sc, 6), furM);
      const angle = (fi / 8) * Math.PI - Math.PI / 2;
      pos(
        furCone,
        side * (0.7 + Math.cos(angle) * 0.2) * sc,
        (1.9 + Math.sin(angle) * 0.1) * sc,
        Math.sin(angle) * 0.25 * sc
      );
      rot(furCone, 0, 0, side * 0.5 + Math.random() * 0.3);
      g.add(furCone);
    }
  }

  // ── Head ──
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.3 * sc, 0);

  // Cranium
  const cranium = m(new THREE.SphereGeometry(0.28 * sc, 20, 16), skinM);
  headGroup.add(cranium);

  // Heavy brow ridge
  const browRidge = m(new THREE.BoxGeometry(0.5 * sc, 0.06 * sc, 0.15 * sc, 3, 1, 1), skinM);
  pos(browRidge, 0, 0.08 * sc, 0.2 * sc);
  headGroup.add(browRidge);

  // Cheekbones
  for (const cx of [-0.15, 0.15]) {
    const cheek = m(new THREE.SphereGeometry(0.08 * sc, 8, 6), skinM);
    pos(cheek, cx * sc, -0.02 * sc, 0.22 * sc);
    headGroup.add(cheek);
  }

  // Menacing jawline
  const jaw = m(new THREE.BoxGeometry(0.35 * sc, 0.1 * sc, 0.2 * sc, 2, 2, 2), skinM);
  pos(jaw, 0, -0.15 * sc, 0.1 * sc);
  headGroup.add(jaw);

  // Eyes
  for (const ex of [-0.09, 0.09]) {
    const eyeMesh = m(new THREE.SphereGeometry(0.04 * sc, 8, 8), materials.eyeMat);
    pos(eyeMesh, ex * sc, 0.04 * sc, 0.24 * sc);
    headGroup.add(eyeMesh);
    // Iris glow
    const iris = m(new THREE.SphereGeometry(0.02 * sc, 8, 8), glowEmissive);
    pos(iris, ex * sc, 0.04 * sc, 0.27 * sc);
    headGroup.add(iris);
  }

  // Scars across face (colored strips)
  const scar1 = m(new THREE.BoxGeometry(0.25 * sc, 0.015 * sc, 0.01 * sc), new THREE.MeshPhysicalMaterial({
    color: 0x880000, roughness: 0.8, metalness: 0.0,
  }));
  pos(scar1, 0.02 * sc, 0.0 * sc, 0.3 * sc);
  rot(scar1, 0, 0, 0.3);
  headGroup.add(scar1);

  const scar2 = m(new THREE.BoxGeometry(0.18 * sc, 0.012 * sc, 0.01 * sc), new THREE.MeshPhysicalMaterial({
    color: 0x880000, roughness: 0.8, metalness: 0.0,
  }));
  pos(scar2, -0.04 * sc, -0.06 * sc, 0.28 * sc);
  rot(scar2, 0, 0, -0.2);
  headGroup.add(scar2);

  // War paint strips
  const warpaintM = new THREE.MeshPhysicalMaterial({ color: 0x222266, roughness: 0.5, metalness: 0.0 });
  for (let wp = 0; wp < 3; wp++) {
    const paint = m(new THREE.BoxGeometry(0.06 * sc, 0.02 * sc, 0.01 * sc), warpaintM);
    pos(paint, (-0.12 + wp * 0.06) * sc, -0.04 * sc, 0.29 * sc);
    headGroup.add(paint);
  }

  g.add(headGroup);

  // ── Crown / Helm ──
  if (look.hasHelm !== false) {
    const helmGroup = new THREE.Group();
    helmGroup.position.set(0, 2.3 * sc, 0);

    // Base helm
    const helmBase = m(new THREE.SphereGeometry(0.32 * sc, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), armorM);
    pos(helmBase, 0, 0.05 * sc, 0);
    helmGroup.add(helmBase);

    // Helm visor
    const visor = m(new THREE.BoxGeometry(0.4 * sc, 0.12 * sc, 0.08 * sc), armorM);
    pos(visor, 0, 0.04 * sc, 0.28 * sc);
    helmGroup.add(visor);

    // 8 crown spikes
    for (let si = 0; si < 8; si++) {
      const angle = (si / 8) * Math.PI * 2;
      const spikeH = (0.2 + (si % 2 === 0 ? 0.1 : 0)) * sc;
      const spike = m(new THREE.ConeGeometry(0.03 * sc, spikeH, 6), trimM);
      pos(
        spike,
        Math.sin(angle) * 0.28 * sc,
        0.22 * sc + spikeH * 0.5,
        Math.cos(angle) * 0.28 * sc
      );
      helmGroup.add(spike);

      // Jewel at base of each spike
      const jewel = m(new THREE.SphereGeometry(0.02 * sc, 8, 8), glowEmissive);
      pos(jewel, Math.sin(angle) * 0.28 * sc, 0.22 * sc, Math.cos(angle) * 0.28 * sc);
      helmGroup.add(jewel);
    }

    // Nose guard
    const noseGuard = m(new THREE.BoxGeometry(0.04 * sc, 0.2 * sc, 0.06 * sc), armorM);
    pos(noseGuard, 0, 0.05 * sc, 0.3 * sc);
    helmGroup.add(noseGuard);

    // Helm trim
    const helmTrim = m(new THREE.TorusGeometry(0.31 * sc, 0.015 * sc, 6, 24), trimM);
    pos(helmTrim, 0, 0.0 * sc, 0);
    rot(helmTrim, Math.PI / 2, 0, 0);
    helmGroup.add(helmTrim);

    g.add(helmGroup);
  }

  // ── Arms ──
  for (const side of [-1, 1]) {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.9 * sc, 1.6 * sc, 0);

    // Upper arm
    const upperArm = m(new THREE.CylinderGeometry(0.15 * sc, 0.13 * sc, 0.55 * sc, 10), armorM);
    pos(upperArm, 0, -0.3 * sc, 0);
    armGroup.add(upperArm);

    // Elbow guard
    const elbowGuard = m(new THREE.SphereGeometry(0.14 * sc, 10, 8), armorM);
    pos(elbowGuard, 0, -0.55 * sc, 0);
    armGroup.add(elbowGuard);

    // Forearm
    const forearm = m(new THREE.CylinderGeometry(0.13 * sc, 0.11 * sc, 0.5 * sc, 10), armorM);
    pos(forearm, 0, -0.85 * sc, 0);
    armGroup.add(forearm);

    // Gauntlet
    const gauntlet = m(new THREE.BoxGeometry(0.18 * sc, 0.2 * sc, 0.16 * sc, 2, 2, 2), armorM);
    pos(gauntlet, 0, -1.15 * sc, 0);
    armGroup.add(gauntlet);

    // Wrist blades (thin cones)
    const wristBlade = m(new THREE.ConeGeometry(0.015 * sc, 0.2 * sc, 4), trimM);
    pos(wristBlade, side * 0.08 * sc, -1.1 * sc, 0.1 * sc);
    rot(wristBlade, 0.5, 0, 0);
    armGroup.add(wristBlade);

    const wristBlade2 = m(new THREE.ConeGeometry(0.012 * sc, 0.15 * sc, 4), trimM);
    pos(wristBlade2, side * 0.06 * sc, -1.05 * sc, 0.12 * sc);
    rot(wristBlade2, 0.6, 0, 0);
    armGroup.add(wristBlade2);

    // Individual fingers with spiked knuckle guards
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -1.25 * sc, 0);

    for (let fi = 0; fi < 5; fi++) {
      const fx = (fi - 2) * 0.03 * sc;
      const fingerLen = fi === 0 ? 0.06 : 0.09; // thumb shorter

      // Metacarpal
      const meta = m(new THREE.CylinderGeometry(0.012 * sc, 0.01 * sc, fingerLen * sc, 6), skinM);
      pos(meta, fx, -fingerLen * 0.5 * sc, 0.04 * sc);
      handGroup.add(meta);

      // Proximal
      const prox = m(new THREE.CylinderGeometry(0.01 * sc, 0.009 * sc, fingerLen * 0.7 * sc, 6), skinM);
      pos(prox, fx, -(fingerLen + fingerLen * 0.35) * sc, 0.06 * sc);
      rot(prox, 0.2, 0, 0);
      handGroup.add(prox);

      // Distal
      const dist = m(new THREE.CylinderGeometry(0.009 * sc, 0.006 * sc, fingerLen * 0.5 * sc, 6), skinM);
      pos(dist, fx, -(fingerLen + fingerLen * 0.7) * sc, 0.08 * sc);
      rot(dist, 0.4, 0, 0);
      handGroup.add(dist);

      // Knuckle guard spike
      if (fi > 0) {
        const knuckleSpike = m(new THREE.ConeGeometry(0.01 * sc, 0.04 * sc, 4), trimM);
        pos(knuckleSpike, fx, -0.01 * sc, 0.06 * sc);
        handGroup.add(knuckleSpike);
      }
    }

    armGroup.add(handGroup);
    g.add(armGroup);
  }

  // ── Legs with greaves ──
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.3 * sc, 0.0, 0);

    // Upper leg (thigh)
    const thigh = m(new THREE.CylinderGeometry(0.18 * sc, 0.15 * sc, 0.55 * sc, 10), armorM);
    pos(thigh, 0, 0.5 * sc, 0);
    legGroup.add(thigh);

    // Knee joint
    const knee = m(new THREE.SphereGeometry(0.15 * sc, 10, 8), armorM);
    pos(knee, 0, 0.22 * sc, 0);
    legGroup.add(knee);

    // Knee blade
    const kneeBlade = m(new THREE.ConeGeometry(0.03 * sc, 0.15 * sc, 6), trimM);
    pos(kneeBlade, 0, 0.22 * sc, 0.16 * sc);
    rot(kneeBlade, -0.5, 0, 0);
    legGroup.add(kneeBlade);

    // Lower leg (greave)
    const greave = m(new THREE.CylinderGeometry(0.15 * sc, 0.12 * sc, 0.5 * sc, 10), armorM);
    pos(greave, 0, -0.05 * sc, 0);
    legGroup.add(greave);

    // Greave spikes (3 along shin)
    for (let gi = 0; gi < 3; gi++) {
      const greaveSpike = m(new THREE.ConeGeometry(0.02 * sc, 0.08 * sc, 5), trimM);
      pos(greaveSpike, 0, (0.05 - gi * 0.12) * sc, 0.13 * sc);
      rot(greaveSpike, -0.4, 0, 0);
      legGroup.add(greaveSpike);
    }

    // Greave trim
    const greaveTrim = m(new THREE.TorusGeometry(0.14 * sc, 0.012 * sc, 6, 16), trimM);
    pos(greaveTrim, 0, 0.18 * sc, 0);
    rot(greaveTrim, Math.PI / 2, 0, 0);
    legGroup.add(greaveTrim);

    const greaveTrimLow = m(new THREE.TorusGeometry(0.12 * sc, 0.012 * sc, 6, 16), trimM);
    pos(greaveTrimLow, 0, -0.28 * sc, 0);
    rot(greaveTrimLow, Math.PI / 2, 0, 0);
    legGroup.add(greaveTrimLow);

    // Boot
    const boot = m(new THREE.BoxGeometry(0.16 * sc, 0.1 * sc, 0.25 * sc, 2, 2, 2), armorM);
    pos(boot, 0, -0.35 * sc, 0.04 * sc);
    legGroup.add(boot);

    g.add(legGroup);
  }

  // ── Cape ──
  if (look.hasCape !== false) {
    for (let ci = 0; ci < 5; ci++) {
      const capeWidth = (1.2 - ci * 0.05) * sc;
      const capeHeight = (0.4 + ci * 0.08) * sc;
      const capeGeo = new THREE.PlaneGeometry(capeWidth, capeHeight, 6, 4);
      const capeMat = new THREE.MeshPhysicalMaterial({
        color: body,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92 - ci * 0.04,
      });
      const capeSegment = m(capeGeo, capeMat);
      pos(capeSegment, 0, (1.8 - ci * 0.35) * sc, (-0.42 - ci * 0.04) * sc);
      rot(capeSegment, 0.05 + ci * 0.03, 0, 0);
      g.add(capeSegment);
    }

    // Tattered bottom edges (irregular plane pieces)
    for (let ti = 0; ti < 6; ti++) {
      const tatter = m(
        new THREE.PlaneGeometry(0.15 * sc, (0.1 + Math.random() * 0.15) * sc, 2, 2),
        new THREE.MeshPhysicalMaterial({
          color: body, roughness: 0.8, metalness: 0.0,
          side: THREE.DoubleSide, transparent: true, opacity: 0.6,
        })
      );
      pos(
        tatter,
        (-0.4 + ti * 0.16) * sc,
        (0.15 - Math.random() * 0.1) * sc,
        (-0.6 - Math.random() * 0.05) * sc
      );
      rot(tatter, 0.1 + Math.random() * 0.15, Math.random() * 0.2 - 0.1, 0);
      g.add(tatter);
    }
  }

  // ── Back-mounted banner pole ──
  const bannerPole = m(new THREE.CylinderGeometry(0.02 * sc, 0.02 * sc, 1.2 * sc, 6), trimM);
  pos(bannerPole, 0.15 * sc, 2.4 * sc, -0.35 * sc);
  g.add(bannerPole);

  const banner = m(
    new THREE.PlaneGeometry(0.35 * sc, 0.5 * sc, 3, 3),
    new THREE.MeshPhysicalMaterial({
      color: accent, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide,
    })
  );
  pos(banner, 0.34 * sc, 2.6 * sc, -0.35 * sc);
  rot(banner, 0, Math.PI / 2, 0);
  g.add(banner);

  // Banner emblem (small octahedron on banner)
  const bannerEmblem = m(new THREE.OctahedronGeometry(0.04 * sc), glowEmissive);
  pos(bannerEmblem, 0.34 * sc, 2.6 * sc, -0.33 * sc);
  g.add(bannerEmblem);

  // ── Boss Aura ──
  // Inner core sphere
  const auraCoreMat = new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.15,
    roughness: 0.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const auraCore = m(new THREE.SphereGeometry(0.8 * sc, 20, 16), auraCoreMat);
  pos(auraCore, 0, 1.4 * sc, 0);
  g.add(auraCore);

  // Outer aura sphere
  const auraOuterMat = new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.06,
    roughness: 0.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const auraOuter = m(new THREE.SphereGeometry(1.5 * sc, 24, 18), auraOuterMat);
  pos(auraOuter, 0, 1.4 * sc, 0);
  g.add(auraOuter);

  // Orbiting wisp spheres (12)
  const wispMat = new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 3.0,
    transparent: true,
    opacity: 0.6,
    roughness: 0.0,
    metalness: 0.0,
  });
  for (let wi = 0; wi < 12; wi++) {
    const angle = (wi / 12) * Math.PI * 2;
    const radius = (1.0 + (wi % 3) * 0.2) * sc;
    const height = (0.8 + (wi % 4) * 0.4) * sc;
    const wisp = m(new THREE.SphereGeometry(0.03 * sc, 8, 8), wispMat);
    pos(wisp, Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    g.add(wisp);
  }

  // ── Ground crack effect ──
  for (let ci = 0; ci < 8; ci++) {
    const angle = (ci / 8) * Math.PI * 2;
    const crackLen = (0.6 + Math.random() * 0.5) * sc;
    const crack = m(
      new THREE.BoxGeometry(0.03 * sc, 0.015 * sc, crackLen),
      new THREE.MeshPhysicalMaterial({
        color: 0x111111, roughness: 1.0, metalness: 0.0,
        emissive: glow, emissiveIntensity: 0.3,
      })
    );
    pos(
      crack,
      Math.sin(angle) * crackLen * 0.5,
      -0.34 * sc,
      Math.cos(angle) * crackLen * 0.5
    );
    rot(crack, 0, angle, 0);
    g.add(crack);
  }

  // ── Two point lights ──
  const chestLight = new THREE.PointLight(0xffaa44, 1.5, 4 * sc);
  chestLight.position.set(0, 1.6 * sc, 0.3 * sc);
  chestLight.castShadow = true;
  g.add(chestLight);

  const crownLight = new THREE.PointLight(0x4488ff, 1.2, 3 * sc);
  crownLight.position.set(0, 2.8 * sc, 0);
  crownLight.castShadow = true;
  g.add(crownLight);

  // ── Weapon / Shield ──
  if (look.hasWeapon) {
    materials.addWeapon(g, -0.9 * sc, 0.4 * sc);
  }
  if (look.hasShield) {
    materials.addShield(g, 0.9 * sc, 0.6 * sc);
  }
}

// ─── SPECTRAL ENEMY ────────────────────────────────────────────────────────────

export function buildSpectralEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials
): void {
  const sc = look.scale;
  const body = look.bodyColor;
  const accent = look.accentColor;
  const glow = look.glowColor ?? accent;

  // Spectral materials
  const spectralBodyMat = new THREE.MeshPhysicalMaterial({
    color: body,
    emissive: body,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.35,
    roughness: 0.2,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const spectralGlowMat = new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 3.0,
    transparent: true,
    opacity: 0.8,
    roughness: 0.0,
    metalness: 0.0,
  });

  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xddccaa,
    emissive: 0x332211,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.7,
    roughness: 0.5,
    metalness: 0.1,
  });

  const darkVoidMat = new THREE.MeshPhysicalMaterial({
    color: 0x000011,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });

  const chainMat = new THREE.MeshPhysicalMaterial({
    color: 0x555566,
    emissive: 0x111122,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.6,
    roughness: 0.4,
    metalness: 0.8,
  });

  const runicMat = new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 4.0,
    transparent: true,
    opacity: 0.7,
    roughness: 0.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const tombstoneMat = new THREE.MeshPhysicalMaterial({
    color: 0x444444,
    emissive: 0x111111,
    emissiveIntensity: 0.1,
    transparent: true,
    opacity: 0.5,
    roughness: 0.9,
    metalness: 0.0,
  });

  const fogMat = new THREE.MeshPhysicalMaterial({
    color: body,
    emissive: body,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.12,
    roughness: 0.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // ── Ethereal layered robes: 3 overlapping cones ──
  for (let ri = 0; ri < 3; ri++) {
    const robeRadius = (0.55 + ri * 0.08) * sc;
    const robeHeight = (1.6 + ri * 0.1) * sc;
    const robeGeo = new THREE.ConeGeometry(robeRadius, robeHeight, 18, 6, true);
    const robeMat = new THREE.MeshPhysicalMaterial({
      color: body,
      emissive: body,
      emissiveIntensity: 0.3 - ri * 0.05,
      transparent: true,
      opacity: 0.3 - ri * 0.06,
      roughness: 0.3,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const robe = m(robeGeo, robeMat);
    pos(robe, (ri - 1) * 0.03 * sc, 0.7 * sc + ri * 0.04 * sc, (ri - 1) * 0.02 * sc);
    g.add(robe);
  }

  // Tattered robe edges at bottom (irregular geometry pieces)
  for (let ti = 0; ti < 10; ti++) {
    const tAngle = (ti / 10) * Math.PI * 2;
    const tatterH = (0.12 + Math.random() * 0.2) * sc;
    const tatter = m(
      new THREE.PlaneGeometry(0.12 * sc, tatterH, 2, 2),
      new THREE.MeshPhysicalMaterial({
        color: body, emissive: body, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.2, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.0,
      })
    );
    pos(
      tatter,
      Math.sin(tAngle) * 0.5 * sc,
      -0.12 * sc - Math.random() * 0.1 * sc,
      Math.cos(tAngle) * 0.5 * sc
    );
    rot(tatter, Math.random() * 0.3, tAngle, 0);
    g.add(tatter);
  }

  // ── Visible skeletal structure inside transparent body ──

  // Spine: 8 vertebrae
  for (let vi = 0; vi < 8; vi++) {
    const vertebra = m(new THREE.CylinderGeometry(0.035 * sc, 0.04 * sc, 0.06 * sc, 8), boneMat);
    pos(vertebra, 0, (1.7 - vi * 0.1) * sc, -0.05 * sc);
    g.add(vertebra);

    // Spinous process (small bump on back of each vertebra)
    const spinous = m(new THREE.ConeGeometry(0.015 * sc, 0.04 * sc, 4), boneMat);
    pos(spinous, 0, (1.7 - vi * 0.1) * sc, -0.1 * sc);
    rot(spinous, 0.5, 0, 0);
    g.add(spinous);
  }

  // Ribcage: 12 curved ribs (6 pairs)
  for (let ri = 0; ri < 6; ri++) {
    for (const side of [-1, 1]) {
      const ribLen = (0.25 - ri * 0.02) * sc;
      const ribCurve = new THREE.TorusGeometry(ribLen, 0.012 * sc, 6, 12, Math.PI * 0.7);
      const rib = m(ribCurve, boneMat);
      pos(rib, side * 0.03 * sc, (1.55 - ri * 0.08) * sc, 0.05 * sc);
      rot(rib, 0.3, side * 0.8, side * 0.3);
      g.add(rib);
    }
  }

  // Sternum
  const sternum = m(new THREE.BoxGeometry(0.03 * sc, 0.4 * sc, 0.02 * sc), boneMat);
  pos(sternum, 0, 1.4 * sc, 0.2 * sc);
  g.add(sternum);

  // Pelvis
  const pelvisGeo = new THREE.TorusGeometry(0.15 * sc, 0.03 * sc, 8, 12, Math.PI);
  const pelvis = m(pelvisGeo, boneMat);
  pos(pelvis, 0, 0.9 * sc, 0);
  rot(pelvis, -0.3, 0, 0);
  g.add(pelvis);

  // Sacrum
  const sacrum = m(new THREE.ConeGeometry(0.06 * sc, 0.1 * sc, 6), boneMat);
  pos(sacrum, 0, 0.85 * sc, -0.05 * sc);
  rot(sacrum, Math.PI, 0, 0);
  g.add(sacrum);

  // ── Skull head ──
  const skullGroup = new THREE.Group();
  skullGroup.position.set(0, 2.0 * sc, 0);

  // Cranium
  const cranium = m(new THREE.SphereGeometry(0.22 * sc, 20, 16), boneMat);
  pos(cranium, 0, 0.05 * sc, 0);
  skullGroup.add(cranium);

  // Temporal bones (sides of skull)
  for (const side of [-1, 1]) {
    const temporal = m(new THREE.SphereGeometry(0.1 * sc, 8, 6), boneMat);
    pos(temporal, side * 0.15 * sc, 0.0 * sc, -0.02 * sc);
    skullGroup.add(temporal);
  }

  // Cheekbones
  for (const side of [-1, 1]) {
    const cheek = m(new THREE.BoxGeometry(0.08 * sc, 0.04 * sc, 0.06 * sc), boneMat);
    pos(cheek, side * 0.12 * sc, -0.06 * sc, 0.12 * sc);
    skullGroup.add(cheek);
  }

  // Brow ridge
  const browRidge = m(new THREE.BoxGeometry(0.3 * sc, 0.03 * sc, 0.08 * sc), boneMat);
  pos(browRidge, 0, 0.02 * sc, 0.16 * sc);
  skullGroup.add(browRidge);

  // Nasal cavity (inverted cone)
  const nasalCavity = m(new THREE.ConeGeometry(0.03 * sc, 0.06 * sc, 4), darkVoidMat);
  pos(nasalCavity, 0, -0.06 * sc, 0.2 * sc);
  rot(nasalCavity, Math.PI, 0, 0);
  skullGroup.add(nasalCavity);

  // Nasal bridge
  const nasalBridge = m(new THREE.BoxGeometry(0.03 * sc, 0.08 * sc, 0.03 * sc), boneMat);
  pos(nasalBridge, 0, -0.02 * sc, 0.2 * sc);
  skullGroup.add(nasalBridge);

  // Hollow eye sockets (dark spheres behind glowing eyes)
  for (const side of [-1, 1]) {
    // Dark socket
    const socket = m(new THREE.SphereGeometry(0.05 * sc, 8, 8), darkVoidMat);
    pos(socket, side * 0.08 * sc, 0.0 * sc, 0.15 * sc);
    skullGroup.add(socket);

    // Glowing eye
    const eyeGlow = m(new THREE.SphereGeometry(0.035 * sc, 10, 10), spectralGlowMat);
    pos(eyeGlow, side * 0.08 * sc, 0.0 * sc, 0.17 * sc);
    skullGroup.add(eyeGlow);

    // Eye trail wisp
    const eyeTrail = m(new THREE.CylinderGeometry(0.01 * sc, 0.002 * sc, 0.12 * sc, 6), spectralGlowMat);
    pos(eyeTrail, side * 0.08 * sc, 0.06 * sc, 0.17 * sc);
    skullGroup.add(eyeTrail);
  }

  // Separate jaw bone (hinged lower)
  const jawbone = m(new THREE.BoxGeometry(0.2 * sc, 0.06 * sc, 0.12 * sc, 2, 2, 2), boneMat);
  pos(jawbone, 0, -0.15 * sc, 0.06 * sc);
  rot(jawbone, 0.15, 0, 0);
  skullGroup.add(jawbone);

  // Jaw hinge details
  for (const side of [-1, 1]) {
    const hinge = m(new THREE.SphereGeometry(0.02 * sc, 6, 6), boneMat);
    pos(hinge, side * 0.1 * sc, -0.1 * sc, 0.02 * sc);
    skullGroup.add(hinge);
  }

  // Teeth row (upper and lower)
  for (let ti = 0; ti < 6; ti++) {
    const tooth = m(new THREE.BoxGeometry(0.015 * sc, 0.02 * sc, 0.015 * sc), boneMat);
    pos(tooth, (ti - 2.5) * 0.025 * sc, -0.1 * sc, 0.18 * sc);
    skullGroup.add(tooth);

    const lowerTooth = m(new THREE.BoxGeometry(0.013 * sc, 0.018 * sc, 0.013 * sc), boneMat);
    pos(lowerTooth, (ti - 2.5) * 0.025 * sc, -0.14 * sc, 0.16 * sc);
    skullGroup.add(lowerTooth);
  }

  g.add(skullGroup);

  // ── Hood with deep shadow ──
  const hoodOuter = m(
    new THREE.SphereGeometry(0.35 * sc, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    spectralBodyMat
  );
  pos(hoodOuter, 0, 2.08 * sc, -0.05 * sc);
  g.add(hoodOuter);

  // Hood fabric drape (sides)
  for (const side of [-1, 1]) {
    const hoodSide = m(
      new THREE.PlaneGeometry(0.2 * sc, 0.35 * sc, 3, 3),
      new THREE.MeshPhysicalMaterial({
        color: body, emissive: body, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.3, side: THREE.DoubleSide, roughness: 0.3, metalness: 0.0,
      })
    );
    pos(hoodSide, side * 0.25 * sc, 1.95 * sc, 0.05 * sc);
    rot(hoodSide, 0, side * 0.4, 0);
    g.add(hoodSide);
  }

  // Deep shadow sphere inside hood
  const hoodShadow = m(new THREE.SphereGeometry(0.18 * sc, 10, 10), darkVoidMat);
  pos(hoodShadow, 0, 2.0 * sc, 0.05 * sc);
  g.add(hoodShadow);

  // ── Skeletal hands with 5 fingers per hand (3 segments each) ──
  for (const side of [-1, 1]) {
    const handGroup = new THREE.Group();
    handGroup.position.set(side * 0.5 * sc, 1.2 * sc, 0.15 * sc);

    // Wrist bones
    const wristBone = m(new THREE.CylinderGeometry(0.025 * sc, 0.02 * sc, 0.08 * sc, 6), boneMat);
    handGroup.add(wristBone);

    // Carpals (small cluster of bones)
    for (let ci = 0; ci < 3; ci++) {
      const carpal = m(new THREE.SphereGeometry(0.015 * sc, 6, 6), boneMat);
      pos(carpal, (ci - 1) * 0.02 * sc, -0.05 * sc, 0);
      handGroup.add(carpal);
    }

    // 5 fingers, 3 segments each
    for (let fi = 0; fi < 5; fi++) {
      const fingerAngle = (fi - 2) * 0.25;
      const fingerLen = fi === 0 ? 0.05 : 0.07; // thumb shorter
      const baseX = (fi - 2) * 0.025 * sc;
      const baseY = -0.08 * sc;

      // Metacarpal
      const metacarpal = m(
        new THREE.CylinderGeometry(0.008 * sc, 0.007 * sc, fingerLen * sc, 5),
        boneMat
      );
      pos(metacarpal, baseX, baseY - fingerLen * 0.5 * sc, 0);
      rot(metacarpal, 0, 0, fingerAngle * 0.3);
      handGroup.add(metacarpal);

      // Joint knuckle
      const knuckle1 = m(new THREE.SphereGeometry(0.009 * sc, 5, 5), boneMat);
      pos(knuckle1, baseX + Math.sin(fingerAngle * 0.3) * fingerLen * sc,
        baseY - fingerLen * sc, 0);
      handGroup.add(knuckle1);

      // Proximal phalanx
      const proximal = m(
        new THREE.CylinderGeometry(0.007 * sc, 0.006 * sc, fingerLen * 0.8 * sc, 5),
        boneMat
      );
      pos(
        proximal,
        baseX + Math.sin(fingerAngle * 0.3) * fingerLen * 1.2 * sc,
        baseY - fingerLen * 1.4 * sc,
        0.01 * sc
      );
      rot(proximal, 0.3, 0, fingerAngle * 0.4);
      handGroup.add(proximal);

      // Second joint
      const knuckle2 = m(new THREE.SphereGeometry(0.007 * sc, 5, 5), boneMat);
      pos(
        knuckle2,
        baseX + Math.sin(fingerAngle * 0.3) * fingerLen * 1.5 * sc,
        baseY - fingerLen * 1.8 * sc,
        0.02 * sc
      );
      handGroup.add(knuckle2);

      // Distal phalanx
      const distal = m(
        new THREE.CylinderGeometry(0.006 * sc, 0.003 * sc, fingerLen * 0.6 * sc, 5),
        boneMat
      );
      pos(
        distal,
        baseX + Math.sin(fingerAngle * 0.3) * fingerLen * 1.7 * sc,
        baseY - fingerLen * 2.1 * sc,
        0.03 * sc
      );
      rot(distal, 0.5, 0, fingerAngle * 0.5);
      handGroup.add(distal);
    }

    // Forearm bones (radius/ulna)
    const radius = m(new THREE.CylinderGeometry(0.015 * sc, 0.012 * sc, 0.4 * sc, 6), boneMat);
    pos(radius, 0.02 * sc, 0.25 * sc, 0);
    handGroup.add(radius);

    const ulna = m(new THREE.CylinderGeometry(0.013 * sc, 0.01 * sc, 0.4 * sc, 6), boneMat);
    pos(ulna, -0.02 * sc, 0.25 * sc, 0);
    handGroup.add(ulna);

    g.add(handGroup);
  }

  // ── Chains wrapped around body (20+ torus links in spiral) ──
  for (let ci = 0; ci < 24; ci++) {
    const chainAngle = (ci / 24) * Math.PI * 6; // 3 full spirals
    const chainY = (1.0 + ci * 0.03) * sc;
    const chainRadius = (0.3 + Math.sin(ci * 0.5) * 0.05) * sc;
    const link = m(new THREE.TorusGeometry(0.02 * sc, 0.005 * sc, 5, 8), chainMat);
    pos(
      link,
      Math.sin(chainAngle) * chainRadius,
      chainY,
      Math.cos(chainAngle) * chainRadius
    );
    rot(link, ci % 2 === 0 ? 0 : Math.PI / 2, chainAngle, 0);
    g.add(link);
  }

  // Dangling chain ends
  for (const dx of [-0.2, 0.2]) {
    for (let di = 0; di < 5; di++) {
      const dLink = m(new THREE.TorusGeometry(0.018 * sc, 0.004 * sc, 5, 8), chainMat);
      pos(dLink, dx * sc, (0.9 - di * 0.06) * sc, 0.25 * sc);
      rot(dLink, di % 2 === 0 ? 0 : Math.PI / 2, 0, 0);
      g.add(dLink);
    }
  }

  // ── Shattered / cracked halo above head ──
  // Main halo arc
  const haloGeo1 = new THREE.TorusGeometry(0.3 * sc, 0.02 * sc, 8, 16, Math.PI * 0.6);
  const halo1 = m(haloGeo1, spectralGlowMat);
  pos(halo1, 0, 2.45 * sc, 0);
  rot(halo1, Math.PI / 2, 0, 0);
  g.add(halo1);

  // Second arc fragment
  const haloGeo2 = new THREE.TorusGeometry(0.3 * sc, 0.02 * sc, 8, 12, Math.PI * 0.35);
  const halo2 = m(haloGeo2, spectralGlowMat);
  pos(halo2, 0, 2.45 * sc, 0);
  rot(halo2, Math.PI / 2, Math.PI * 1.1, 0);
  g.add(halo2);

  // Floating halo shards (small broken pieces)
  for (let hi = 0; hi < 4; hi++) {
    const shardAngle = Math.PI * 0.7 + hi * 0.15;
    const shard = m(new THREE.BoxGeometry(0.04 * sc, 0.02 * sc, 0.02 * sc), spectralGlowMat);
    pos(
      shard,
      Math.sin(shardAngle) * 0.33 * sc,
      2.45 * sc + (Math.random() - 0.5) * 0.08 * sc,
      Math.cos(shardAngle) * 0.33 * sc
    );
    rot(shard, Math.random(), Math.random(), Math.random());
    g.add(shard);
  }

  // ── Soul wisps: 16 small spheres with cylinder tails orbiting ──
  for (let wi = 0; wi < 16; wi++) {
    const wispAngle = (wi / 16) * Math.PI * 2;
    const wispRadius = (0.6 + (wi % 4) * 0.15) * sc;
    const wispY = (0.6 + (wi % 5) * 0.35) * sc;
    const wispSize = (0.02 + (wi % 3) * 0.008) * sc;

    // Wisp sphere
    const wispSphere = m(new THREE.SphereGeometry(wispSize, 8, 8), spectralGlowMat);
    pos(
      wispSphere,
      Math.sin(wispAngle) * wispRadius,
      wispY,
      Math.cos(wispAngle) * wispRadius
    );
    g.add(wispSphere);

    // Wisp tail (cylinder)
    const tailLen = (0.06 + Math.random() * 0.08) * sc;
    const wispTailMat = new THREE.MeshPhysicalMaterial({
      color: glow, emissive: glow, emissiveIntensity: 2.0,
      transparent: true, opacity: 0.35, roughness: 0.0, metalness: 0.0,
    });
    const tail = m(new THREE.CylinderGeometry(wispSize * 0.5, 0.001 * sc, tailLen, 6), wispTailMat);
    pos(
      tail,
      Math.sin(wispAngle) * (wispRadius - tailLen * 0.3),
      wispY - tailLen * 0.3,
      Math.cos(wispAngle) * (wispRadius - tailLen * 0.3)
    );
    rot(tail, 0.3, wispAngle, 0);
    g.add(tail);
  }

  // ── Ghostly trail below body (tapering cone segments) ──
  for (let ti = 0; ti < 4; ti++) {
    const trailRadius = (0.35 - ti * 0.07) * sc;
    const trailH = (0.3 + ti * 0.1) * sc;
    const trailMat = new THREE.MeshPhysicalMaterial({
      color: body, emissive: body, emissiveIntensity: 0.3 - ti * 0.05,
      transparent: true, opacity: 0.2 - ti * 0.04,
      roughness: 0.1, metalness: 0.0, side: THREE.DoubleSide,
    });
    const trail = m(new THREE.ConeGeometry(trailRadius, trailH, 14, 4, true), trailMat);
    pos(trail, 0, (-0.2 - ti * 0.25) * sc, 0);
    g.add(trail);
  }

  // ── Spectral lantern in one hand ──
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(-0.6 * sc, 1.0 * sc, 0.2 * sc);

  // Lantern handle (thin cylinder)
  const lanternHandle = m(new THREE.CylinderGeometry(0.008 * sc, 0.008 * sc, 0.15 * sc, 6), chainMat);
  pos(lanternHandle, 0, 0.1 * sc, 0);
  lanternGroup.add(lanternHandle);

  // Wireframe octahedron cage
  const lanternCageGeo = new THREE.OctahedronGeometry(0.08 * sc);
  const lanternCageMat = new THREE.MeshPhysicalMaterial({
    color: 0x556677,
    emissive: glow,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.4,
    wireframe: true,
    roughness: 0.3,
    metalness: 0.6,
  });
  const lanternCage = m(lanternCageGeo, lanternCageMat);
  lanternGroup.add(lanternCage);

  // Emissive core sphere inside lantern
  const lanternCore = m(new THREE.SphereGeometry(0.04 * sc, 10, 10), spectralGlowMat);
  lanternGroup.add(lanternCore);

  // Lantern chain links to hand
  for (let lci = 0; lci < 3; lci++) {
    const lLink = m(new THREE.TorusGeometry(0.012 * sc, 0.003 * sc, 5, 8), chainMat);
    pos(lLink, 0, (0.16 + lci * 0.03) * sc, 0);
    rot(lLink, lci % 2 === 0 ? 0 : Math.PI / 2, 0, 0);
    lanternGroup.add(lLink);
  }

  g.add(lanternGroup);

  // ── Runic symbols floating around (small plane meshes) ──
  for (let ri = 0; ri < 8; ri++) {
    const runeAngle = (ri / 8) * Math.PI * 2;
    const runeRadius = (0.7 + (ri % 3) * 0.2) * sc;
    const runeY = (0.8 + (ri % 4) * 0.4) * sc;
    const rune = m(new THREE.PlaneGeometry(0.06 * sc, 0.06 * sc), runicMat);
    pos(
      rune,
      Math.sin(runeAngle) * runeRadius,
      runeY,
      Math.cos(runeAngle) * runeRadius
    );
    rot(rune, 0, runeAngle + Math.PI, 0);
    g.add(rune);
  }

  // ── Inner spirit core ──
  const spiritCore = m(new THREE.SphereGeometry(0.12 * sc, 14, 14), new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 5.0,
    transparent: true,
    opacity: 0.6,
    roughness: 0.0,
    metalness: 0.0,
  }));
  pos(spiritCore, 0, 1.5 * sc, 0.05 * sc);
  g.add(spiritCore);

  // Spirit core outer glow
  const spiritOuter = m(new THREE.SphereGeometry(0.2 * sc, 12, 12), new THREE.MeshPhysicalMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.15,
    roughness: 0.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }));
  pos(spiritOuter, 0, 1.5 * sc, 0.05 * sc);
  g.add(spiritOuter);

  // ── Tombstone fragments orbiting ──
  for (let ti = 0; ti < 6; ti++) {
    const tombAngle = (ti / 6) * Math.PI * 2;
    const tombRadius = (0.9 + (ti % 2) * 0.3) * sc;
    const tombY = (1.0 + (ti % 3) * 0.5) * sc;

    // Irregular box shape
    const tw = (0.04 + Math.random() * 0.04) * sc;
    const th = (0.06 + Math.random() * 0.06) * sc;
    const td = (0.02 + Math.random() * 0.02) * sc;
    const tomb = m(new THREE.BoxGeometry(tw, th, td), tombstoneMat);
    pos(tomb, Math.sin(tombAngle) * tombRadius, tombY, Math.cos(tombAngle) * tombRadius);
    rot(tomb, Math.random() * 0.5, tombAngle, Math.random() * 0.5);
    g.add(tomb);
  }

  // ── Ground fog effect: 10 flat cylinder discs at base ──
  for (let fi = 0; fi < 10; fi++) {
    const fogAngle = (fi / 10) * Math.PI * 2;
    const fogRadius = (0.3 + fi * 0.08) * sc;
    const fogDisc = m(
      new THREE.CylinderGeometry(
        (0.15 + Math.random() * 0.15) * sc,
        (0.18 + Math.random() * 0.15) * sc,
        0.02 * sc,
        12
      ),
      fogMat
    );
    pos(
      fogDisc,
      Math.sin(fogAngle) * fogRadius,
      (-0.3 - Math.random() * 0.1) * sc,
      Math.cos(fogAngle) * fogRadius
    );
    g.add(fogDisc);
  }

  // ── Clavicle and shoulder bones ──
  for (const side of [-1, 1]) {
    // Clavicle
    const clavicle = m(new THREE.CylinderGeometry(0.015 * sc, 0.012 * sc, 0.3 * sc, 6), boneMat);
    pos(clavicle, side * 0.15 * sc, 1.72 * sc, 0.05 * sc);
    rot(clavicle, 0, 0, side * 0.8);
    g.add(clavicle);

    // Scapula (flat triangular bone)
    const scapula = m(new THREE.ConeGeometry(0.08 * sc, 0.15 * sc, 3), boneMat);
    pos(scapula, side * 0.2 * sc, 1.55 * sc, -0.12 * sc);
    rot(scapula, 0.3, 0, side * 0.2);
    g.add(scapula);

    // Humerus (upper arm bone)
    const humerus = m(new THREE.CylinderGeometry(0.018 * sc, 0.015 * sc, 0.35 * sc, 6), boneMat);
    pos(humerus, side * 0.4 * sc, 1.5 * sc, 0.05 * sc);
    rot(humerus, 0, 0, side * 0.3);
    g.add(humerus);
  }

  // ── Two point lights with different intensities ──
  const spectralLight1 = new THREE.PointLight(glow, 2.0, 5 * sc);
  spectralLight1.position.set(0, 1.5 * sc, 0.3 * sc);
  spectralLight1.castShadow = true;
  g.add(spectralLight1);

  const spectralLight2 = new THREE.PointLight(glow, 0.8, 3 * sc);
  spectralLight2.position.set(0, 2.2 * sc, -0.2 * sc);
  spectralLight2.castShadow = true;
  g.add(spectralLight2);

  // Lantern point light
  const lanternLight = new THREE.PointLight(glow, 1.0, 2 * sc);
  lanternLight.position.set(-0.6 * sc, 1.0 * sc, 0.2 * sc);
  g.add(lanternLight);

  // ── Weapon / Shield ──
  if (look.hasWeapon) {
    materials.addWeapon(g, 0.6 * sc, 1.0 * sc);
  }
  if (look.hasShield) {
    materials.addShield(g, -0.6 * sc, 1.2 * sc);
  }
}
