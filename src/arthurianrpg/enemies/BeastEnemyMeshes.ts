import * as THREE from 'three';

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

// ─── helpers ────────────────────────────────────────────────────────────────
function m(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r: number, w = 16, h = 12): THREE.SphereGeometry {
  return new THREE.SphereGeometry(r, w, h);
}

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

function cyl(rt: number, rb: number, h: number, seg = 12): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rt, rb, h, seg);
}

function cone(r: number, h: number, seg = 10): THREE.ConeGeometry {
  return new THREE.ConeGeometry(r, h, seg);
}

function torus(r: number, tube: number, seg = 16, tSeg = 8): THREE.TorusGeometry {
  return new THREE.TorusGeometry(r, tube, seg, tSeg);
}

function place(mesh: THREE.Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  mesh.position.set(x, y, z);
  if (rx) mesh.rotation.x = rx;
  if (ry) mesh.rotation.y = ry;
  if (rz) mesh.rotation.z = rz;
  if (sx !== 1 || sy !== 1 || sz !== 1) mesh.scale.set(sx, sy, sz);
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUADRUPED (wolves, boars)
// ─────────────────────────────────────────────────────────────────────────────
export function buildQuadrupedEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials
): void {
  const s = look.scale;
  const bodyMat = materials.furMat(look.bodyColor);
  const accentMat = materials.furMat(look.accentColor);
  const skinM = materials.skinMat(look.bodyColor);
  const darkSkin = materials.skinMat(0x331111);
  const gumMat = materials.skinMat(0x993355);
  const tongueMat = materials.skinMat(0xcc4466);
  const toothMat = materials.mat(0xeeeedd);
  const clawMat = materials.mat(0x222222);
  const noseMat = materials.mat(0x111111);
  const scarMat = materials.mat(0xccaa99);
  const breathMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, roughness: 1 });
  const droolMat = new THREE.MeshPhysicalMaterial({ color: 0xddddff, transparent: true, opacity: 0.25, roughness: 0.1 });
  const whiskerMat = materials.mat(0x444444);
  const isBoar = look.shape === 'boar';

  // ── Torso: Ribcage (barrel) ───────────────────────────────────────────────
  const ribcage = m(new THREE.SphereGeometry(0.28 * s, 20, 16), bodyMat);
  place(ribcage, 0, 0.45 * s, -0.05 * s, 0, 0, 0, 1, 0.85, 1.15);
  g.add(ribcage);

  // Upper ribcage detail
  const upperRib = m(sphere(0.22 * s, 18, 14), bodyMat);
  place(upperRib, 0, 0.52 * s, -0.08 * s, 0, 0, 0, 1.05, 0.7, 1.0);
  g.add(upperRib);

  // ── Torso: Waist/loin (narrow section) ────────────────────────────────────
  const waist = m(new THREE.SphereGeometry(0.2 * s, 18, 14), bodyMat);
  place(waist, 0, 0.42 * s, -0.32 * s, 0, 0, 0, 0.85, 0.75, 1.1);
  g.add(waist);

  // ── Torso: Haunches ───────────────────────────────────────────────────────
  const haunches = m(new THREE.SphereGeometry(0.26 * s, 20, 16), bodyMat);
  place(haunches, 0, 0.44 * s, -0.55 * s, 0, 0, 0, 1.0, 0.9, 1.0);
  g.add(haunches);

  // ── Chest ruff ────────────────────────────────────────────────────────────
  const chestRuff = m(sphere(0.18 * s, 16, 12), accentMat);
  place(chestRuff, 0, 0.38 * s, 0.18 * s, 0, 0, 0, 1.1, 1.0, 0.8);
  g.add(chestRuff);

  // ── Shoulder muscles (visible bulges) ─────────────────────────────────────
  for (const side of [-1, 1]) {
    const shoulderMuscle = m(sphere(0.14 * s, 14, 10), bodyMat);
    place(shoulderMuscle, side * 0.18 * s, 0.5 * s, 0.05 * s, 0, 0, 0, 0.8, 1.0, 1.1);
    g.add(shoulderMuscle);
  }

  // ── Haunch muscles ────────────────────────────────────────────────────────
  for (const side of [-1, 1]) {
    const haunchMuscle = m(sphere(0.16 * s, 14, 10), bodyMat);
    place(haunchMuscle, side * 0.16 * s, 0.46 * s, -0.52 * s, 0, 0, 0, 0.7, 1.0, 1.1);
    g.add(haunchMuscle);
  }

  // ── Neck muscle ───────────────────────────────────────────────────────────
  const neck = m(cyl(0.12 * s, 0.18 * s, 0.25 * s, 14), bodyMat);
  place(neck, 0, 0.55 * s, 0.15 * s, -0.5, 0, 0);
  g.add(neck);

  const neckMuscleL = m(cyl(0.06 * s, 0.08 * s, 0.2 * s, 10), bodyMat);
  place(neckMuscleL, -0.08 * s, 0.54 * s, 0.12 * s, -0.5, 0, 0.15);
  g.add(neckMuscleL);

  const neckMuscleR = m(cyl(0.06 * s, 0.08 * s, 0.2 * s, 10), bodyMat);
  place(neckMuscleR, 0.08 * s, 0.54 * s, 0.12 * s, -0.5, 0, -0.15);
  g.add(neckMuscleR);

  // ── Head: Cranium ─────────────────────────────────────────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62 * s, 0.3 * s);
  g.add(headGroup);

  const cranium = m(sphere(0.14 * s, 18, 14), bodyMat);
  place(cranium, 0, 0, 0, 0, 0, 0, 1.1, 0.9, 1.0);
  headGroup.add(cranium);

  // Brow ridge
  const browRidge = m(box(0.2 * s, 0.04 * s, 0.08 * s), bodyMat);
  place(browRidge, 0, 0.06 * s, 0.08 * s);
  headGroup.add(browRidge);

  // ── Head: Muzzle (tapered box, not cone) ──────────────────────────────────
  const muzzleLen = isBoar ? 0.22 * s : 0.2 * s;
  const muzzleW = isBoar ? 0.12 * s : 0.09 * s;
  const muzzle = m(box(muzzleW, 0.08 * s, muzzleLen), skinM);
  place(muzzle, 0, -0.03 * s, 0.16 * s, 0.05, 0, 0, 1, 1, 1);
  headGroup.add(muzzle);

  // Muzzle taper front
  const muzzleFront = m(box(muzzleW * 0.7, 0.06 * s, 0.06 * s), skinM);
  place(muzzleFront, 0, -0.03 * s, 0.28 * s);
  headGroup.add(muzzleFront);

  // ── Upper jaw ─────────────────────────────────────────────────────────────
  const upperJaw = m(box(muzzleW * 0.9, 0.025 * s, muzzleLen * 0.9), gumMat);
  place(upperJaw, 0, -0.065 * s, 0.16 * s);
  headGroup.add(upperJaw);

  // Upper gum line
  const upperGum = m(box(muzzleW * 0.85, 0.015 * s, muzzleLen * 0.85), gumMat);
  place(upperGum, 0, -0.078 * s, 0.16 * s);
  headGroup.add(upperGum);

  // ── Lower jaw ─────────────────────────────────────────────────────────────
  const lowerJaw = m(box(muzzleW * 0.8, 0.03 * s, muzzleLen * 0.8), skinM);
  place(lowerJaw, 0, -0.09 * s, 0.14 * s, 0.08, 0, 0);
  headGroup.add(lowerJaw);

  // Lower gum line
  const lowerGum = m(box(muzzleW * 0.75, 0.015 * s, muzzleLen * 0.75), gumMat);
  place(lowerGum, 0, -0.078 * s, 0.14 * s);
  headGroup.add(lowerGum);

  // ── Tongue ────────────────────────────────────────────────────────────────
  const tongue = m(sphere(0.04 * s, 12, 8), tongueMat);
  place(tongue, 0, -0.08 * s, 0.12 * s, 0, 0, 0, 1.2, 0.4, 1.8);
  headGroup.add(tongue);

  // ── Upper teeth (6) ───────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const tx = (i - 2.5) * 0.018 * s;
    const tooth = m(cone(0.008 * s, 0.025 * s, 6), toothMat);
    place(tooth, tx, -0.08 * s, 0.22 * s, Math.PI, 0, 0);
    headGroup.add(tooth);
  }

  // ── Lower teeth (6) ──────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const tx = (i - 2.5) * 0.016 * s;
    const tooth = m(cone(0.007 * s, 0.02 * s, 6), toothMat);
    place(tooth, tx, -0.075 * s, 0.2 * s, 0, 0, 0);
    headGroup.add(tooth);
  }

  // ── Canine fangs (2 per side, upper + lower) ─────────────────────────────
  for (const side of [-1, 1]) {
    // Upper canine
    const upperFang = m(cone(0.012 * s, 0.045 * s, 8), toothMat);
    place(upperFang, side * 0.05 * s, -0.09 * s, 0.2 * s, Math.PI, 0, 0);
    headGroup.add(upperFang);

    // Lower canine
    const lowerFang = m(cone(0.01 * s, 0.035 * s, 8), toothMat);
    place(lowerFang, side * 0.04 * s, -0.065 * s, 0.19 * s, 0, 0, 0);
    headGroup.add(lowerFang);
  }

  // ── Nose ──────────────────────────────────────────────────────────────────
  const nose = m(sphere(0.03 * s, 12, 10), noseMat);
  place(nose, 0, 0.0 * s, 0.3 * s, 0, 0, 0, isBoar ? 1.4 : 1.0, 0.8, 0.7);
  headGroup.add(nose);

  // Nostrils (2 dark indentations)
  for (const side of [-1, 1]) {
    const nostril = m(sphere(0.01 * s, 8, 6), darkSkin);
    place(nostril, side * 0.012 * s, -0.005 * s, 0.32 * s);
    headGroup.add(nostril);
  }

  // ── Eyes ───────────────────────────────────────────────────────────────────
  for (const side of [-1, 1]) {
    // Eye socket depression
    const socket = m(sphere(0.03 * s, 10, 8), darkSkin);
    place(socket, side * 0.07 * s, 0.04 * s, 0.08 * s);
    headGroup.add(socket);

    // Eyeball
    const eye = m(sphere(0.022 * s, 12, 10), materials.eyeMat);
    place(eye, side * 0.07 * s, 0.04 * s, 0.095 * s);
    headGroup.add(eye);

    // Pupil
    const pupil = m(sphere(0.012 * s, 8, 6), new THREE.MeshPhysicalMaterial({ color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 0.6 }));
    place(pupil, side * 0.07 * s, 0.04 * s, 0.115 * s);
    headGroup.add(pupil);
  }

  // ── Ears ──────────────────────────────────────────────────────────────────
  for (const side of [-1, 1]) {
    // Outer pinna
    const earOuter = m(cone(0.035 * s, 0.1 * s, 10), bodyMat);
    const earAngle = isBoar ? 0.3 : -0.2;
    place(earOuter, side * 0.08 * s, 0.12 * s, -0.02 * s, earAngle, 0, side * 0.3);
    headGroup.add(earOuter);

    // Inner ear
    const earInner = m(cone(0.02 * s, 0.07 * s, 8), gumMat);
    place(earInner, side * 0.08 * s, 0.11 * s, -0.01 * s, earAngle, 0, side * 0.3);
    headGroup.add(earInner);
  }

  // ── Whiskers (6 total, 3 per side) ────────────────────────────────────────
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const whisker = m(cyl(0.002 * s, 0.002 * s, 0.1 * s, 4), whiskerMat);
      place(whisker, side * 0.055 * s, -0.02 * s + i * 0.012 * s, 0.24 * s, 0, 0, side * (0.7 + i * 0.15));
      headGroup.add(whisker);
    }
  }

  // ── Front legs (digitigrade anatomy) ──────────────────────────────────────
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.14 * s, 0.35 * s, 0.05 * s);
    g.add(legGroup);

    // Humerus (upper arm)
    const humerus = m(cyl(0.055 * s, 0.045 * s, 0.18 * s, 12), bodyMat);
    place(humerus, 0, -0.08 * s, 0, 0.15, 0, 0);
    legGroup.add(humerus);

    // Elbow joint
    const elbow = m(sphere(0.04 * s, 10, 8), bodyMat);
    place(elbow, 0, -0.17 * s, 0.02 * s);
    legGroup.add(elbow);

    // Radius (lower foreleg)
    const radius = m(cyl(0.04 * s, 0.032 * s, 0.16 * s, 10), bodyMat);
    place(radius, 0, -0.26 * s, 0.01 * s, -0.1, 0, 0);
    legGroup.add(radius);

    // Wrist joint
    const wrist = m(sphere(0.03 * s, 8, 6), bodyMat);
    place(wrist, 0, -0.34 * s, 0.0);
    legGroup.add(wrist);

    // Metacarpals (pastern)
    const pastern = m(cyl(0.025 * s, 0.03 * s, 0.06 * s, 8), skinM);
    place(pastern, 0, -0.37 * s, 0.01 * s, 0.3, 0, 0);
    legGroup.add(pastern);

    // ── Paw with toe pads and claws ─────────────────────────────────────────
    // 4 toe pads
    for (let t = 0; t < 4; t++) {
      const tx = (t - 1.5) * 0.018 * s;
      const toePad = m(sphere(0.012 * s, 8, 6), darkSkin);
      place(toePad, tx, -0.4 * s, 0.03 * s);
      legGroup.add(toePad);

      // Claw per toe
      const claw = m(cone(0.005 * s, 0.02 * s, 6), clawMat);
      place(claw, tx, -0.4 * s, 0.045 * s, -0.4, 0, 0);
      legGroup.add(claw);
    }

    // Central pad (larger)
    const centralPad = m(sphere(0.02 * s, 10, 8), darkSkin);
    place(centralPad, 0, -0.4 * s, 0.01 * s, 0, 0, 0, 1.3, 0.6, 1.0);
    legGroup.add(centralPad);
  }

  // ── Hind legs (digitigrade, backward-bent hock) ───────────────────────────
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.14 * s, 0.38 * s, -0.5 * s);
    g.add(legGroup);

    // Femur (upper thigh)
    const femur = m(cyl(0.065 * s, 0.05 * s, 0.18 * s, 12), bodyMat);
    place(femur, 0, -0.06 * s, -0.02 * s, -0.35, 0, 0);
    legGroup.add(femur);

    // Knee/stifle joint
    const knee = m(sphere(0.045 * s, 10, 8), bodyMat);
    place(knee, 0, -0.14 * s, -0.06 * s);
    legGroup.add(knee);

    // Tibia (lower, angled back)
    const tibia = m(cyl(0.04 * s, 0.03 * s, 0.17 * s, 10), bodyMat);
    place(tibia, 0, -0.24 * s, -0.02 * s, 0.4, 0, 0);
    legGroup.add(tibia);

    // Hock joint (prominent backward bend)
    const hock = m(sphere(0.032 * s, 10, 8), bodyMat);
    place(hock, 0, -0.32 * s, 0.02 * s);
    legGroup.add(hock);

    // Metatarsals
    const meta = m(cyl(0.025 * s, 0.028 * s, 0.08 * s, 8), skinM);
    place(meta, 0, -0.36 * s, 0.04 * s, -0.2, 0, 0);
    legGroup.add(meta);

    // ── Hind paw with toe pads and claws ────────────────────────────────────
    for (let t = 0; t < 4; t++) {
      const tx = (t - 1.5) * 0.016 * s;
      const toePad = m(sphere(0.011 * s, 8, 6), darkSkin);
      place(toePad, tx, -0.4 * s, 0.06 * s);
      legGroup.add(toePad);

      const claw = m(cone(0.005 * s, 0.018 * s, 6), clawMat);
      place(claw, tx, -0.4 * s, 0.075 * s, -0.4, 0, 0);
      legGroup.add(claw);
    }

    // Central pad
    const centralPadH = m(sphere(0.018 * s, 10, 8), darkSkin);
    place(centralPadH, 0, -0.4 * s, 0.04 * s, 0, 0, 0, 1.2, 0.5, 1.0);
    legGroup.add(centralPadH);
  }

  // ── Tail (6-8 articulated segments) ───────────────────────────────────────
  const tailSegs = isBoar ? 6 : 8;
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.5 * s, -0.7 * s);
  g.add(tailGroup);

  for (let i = 0; i < tailSegs; i++) {
    const t = i / (tailSegs - 1);
    const segRadius = (isBoar ? 0.015 : 0.03) * (1 - t * 0.6) * s;
    const seg = m(sphere(segRadius, 8, 6), bodyMat);
    const curlX = isBoar ? Math.sin(t * Math.PI * 1.5) * 0.06 * s : 0;
    const curlY = isBoar ? Math.cos(t * Math.PI * 1.5) * 0.04 * s : t * 0.08 * s;
    place(seg, curlX, curlY, -i * 0.04 * s);
    tailGroup.add(seg);

    // Fur tuft on each segment (wolf only for bushier tail)
    if (!isBoar) {
      const tuft = m(cone(segRadius * 1.2, segRadius * 3, 6), accentMat);
      place(tuft, curlX, curlY + segRadius, -i * 0.04 * s, 0.3, 0, 0);
      tailGroup.add(tuft);
    }
  }

  // Bushy tail end (wolf: cluster of spheres, boar: thin tip)
  if (!isBoar) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const fluff = m(sphere(0.02 * s, 8, 6), accentMat);
      place(fluff, Math.cos(angle) * 0.02 * s, Math.sin(angle) * 0.02 * s + 0.08 * s * (tailSegs - 1) / (tailSegs - 1), -(tailSegs - 1) * 0.04 * s);
      tailGroup.add(fluff);
    }
  } else {
    const tip = m(cone(0.008 * s, 0.03 * s, 6), bodyMat);
    place(tip, 0, 0.03 * s, -(tailSegs - 1) * 0.04 * s);
    tailGroup.add(tip);
  }

  // ── Spinal ridge (10+ fur spike cones) ────────────────────────────────────
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const spineZ = 0.15 * s - t * 0.8 * s;
    const spineY = 0.56 * s + Math.sin(t * Math.PI) * 0.04 * s;
    const spikeH = (0.02 + Math.sin(t * Math.PI) * 0.02) * s;
    const spike = m(cone(0.008 * s, spikeH, 6), accentMat);
    place(spike, 0, spineY, spineZ, 0, 0, 0);
    g.add(spike);
  }

  // ── Fur system: 40+ cone meshes across body ──────────────────────────────
  // Hackles (spine fur, denser)
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const fz = 0.1 * s - t * 0.7 * s;
    const fy = 0.58 * s + Math.sin(t * Math.PI) * 0.03 * s;
    const fur = m(cone(0.01 * s, 0.035 * s, 5), bodyMat);
    place(fur, (Math.random() - 0.5) * 0.04 * s, fy, fz, (Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
    g.add(fur);
  }

  // Flank fur (both sides)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const fz = 0.08 * s - t * 0.6 * s;
      const fy = 0.42 * s + (Math.random() - 0.5) * 0.08 * s;
      const fur = m(cone(0.008 * s, 0.025 * s, 5), bodyMat);
      place(fur, side * (0.2 + Math.random() * 0.06) * s, fy, fz, 0, 0, side * 0.5);
      g.add(fur);
    }
  }

  // Chest ruff fur
  for (let i = 0; i < 8; i++) {
    const angle = ((i / 8) - 0.5) * Math.PI * 0.8;
    const fur = m(cone(0.009 * s, 0.03 * s, 5), accentMat);
    place(fur, Math.sin(angle) * 0.12 * s, 0.35 * s + Math.cos(angle) * 0.05 * s, 0.18 * s, -0.5, 0, 0);
    g.add(fur);
  }

  // Tail fur (extra tufts along base)
  for (let i = 0; i < 5; i++) {
    const fur = m(cone(0.007 * s, 0.02 * s, 5), bodyMat);
    place(fur, (Math.random() - 0.5) * 0.04 * s, 0.52 * s, (-0.65 - i * 0.03) * s, 0.5, 0, 0);
    g.add(fur);
  }

  // ── Battle scars (4-5 thin lighter-colored boxes on flanks) ───────────────
  for (let i = 0; i < 5; i++) {
    const scarSide = i % 2 === 0 ? 1 : -1;
    const scarZ = -0.1 * s + i * -0.1 * s;
    const scar = m(box(0.005 * s, 0.003 * s, 0.06 * s), scarMat);
    place(scar, scarSide * 0.25 * s, 0.44 * s + (Math.random() - 0.5) * 0.06 * s, scarZ, 0, 0, (Math.random() - 0.5) * 0.4);
    g.add(scar);
  }

  // ── Panting breath (transparent sphere at mouth) ──────────────────────────
  const breath = m(sphere(0.03 * s, 8, 6), breathMat);
  place(breath, 0, -0.1 * s, 0.32 * s);
  headGroup.add(breath);

  // ── Drool (tiny transparent elongated meshes from jaw) ────────────────────
  for (const side of [-1, 1]) {
    const drool = m(cyl(0.003 * s, 0.002 * s, 0.04 * s, 4), droolMat);
    place(drool, side * 0.03 * s, -0.11 * s, 0.18 * s);
    headGroup.add(drool);
  }

  // ── Boar-specific: dewlap / throat pouch ──────────────────────────────────
  if (isBoar) {
    const dewlap = m(sphere(0.08 * s, 12, 10), skinM);
    place(dewlap, 0, 0.3 * s, 0.22 * s, 0, 0, 0, 1.0, 1.3, 0.8);
    g.add(dewlap);

    // Tusks (larger curved cones for boar)
    for (const side of [-1, 1]) {
      const tusk = m(cone(0.015 * s, 0.08 * s, 8), toothMat);
      place(tusk, side * 0.04 * s, -0.04 * s, 0.28 * s, -0.3, side * 0.2, 0);
      headGroup.add(tusk);
    }

    // Warts on snout
    for (let i = 0; i < 3; i++) {
      const wart = m(sphere(0.008 * s, 6, 4), darkSkin);
      place(wart, (i - 1) * 0.025 * s, 0.01 * s, 0.25 * s);
      headGroup.add(wart);
    }
  }

  // ── Glow effect ───────────────────────────────────────────────────────────
  if (materials.glowMat) {
    const glow = m(sphere(0.35 * s, 12, 10), materials.glowMat);
    place(glow, 0, 0.45 * s, -0.15 * s);
    g.add(glow);
  }

  // ── Weapon / shield ───────────────────────────────────────────────────────
  if (look.hasWeapon) {
    materials.addWeapon(g, 0.2 * s, 0.45 * s);
  }
  if (look.hasShield) {
    materials.addShield(g, -0.2 * s, 0.45 * s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BEAST (bears, trolls, giants)
// ─────────────────────────────────────────────────────────────────────────────
export function buildBeastEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials
): void {
  const s = look.scale;
  const bodyMat = materials.furMat(look.bodyColor);
  const accentMat = materials.furMat(look.accentColor);
  const skinM = materials.skinMat(look.bodyColor);
  const darkSkin = materials.skinMat(0x221111);
  const gumMat = materials.skinMat(0x993355);
  const tongueMat = materials.skinMat(0xcc4466);
  const toothMat = materials.mat(0xeeeedd);
  const clawMat = materials.mat(0x111111);
  const scarDarkMat = materials.mat(0x553333);
  const scarLightMat = materials.mat(0xccaa88);
  const boneMat = materials.mat(0xddccaa);
  const bellyMat = materials.furMat(look.accentColor);
  const droolMat = new THREE.MeshPhysicalMaterial({ color: 0xddddff, transparent: true, opacity: 0.2, roughness: 0.1 });
  const crackMat = materials.mat(0x333333);
  const mattedFurMat = materials.furMat(
    ((look.bodyColor >> 16 & 0xff) * 0.85 | 0) << 16 |
    ((look.bodyColor >> 8 & 0xff) * 0.85 | 0) << 8 |
    ((look.bodyColor & 0xff) * 0.85 | 0)
  );

  // ── Torso: massive chest ──────────────────────────────────────────────────
  const chest = m(sphere(0.38 * s, 24, 20), bodyMat);
  place(chest, 0, 0.75 * s, 0, 0, 0, 0, 1.0, 1.05, 0.95);
  g.add(chest);

  // Pectoral masses (2 large spheres)
  for (const side of [-1, 1]) {
    const pec = m(sphere(0.2 * s, 18, 14), bodyMat);
    place(pec, side * 0.15 * s, 0.72 * s, 0.12 * s, 0, 0, 0, 0.9, 0.85, 1.0);
    g.add(pec);
  }

  // Trapezius (upper back)
  const trap = m(sphere(0.25 * s, 18, 14), bodyMat);
  place(trap, 0, 0.92 * s, -0.08 * s, 0, 0, 0, 1.2, 0.7, 1.0);
  g.add(trap);

  // Latissimus (side back, both sides)
  for (const side of [-1, 1]) {
    const lat = m(sphere(0.18 * s, 16, 12), bodyMat);
    place(lat, side * 0.22 * s, 0.7 * s, -0.1 * s, 0, 0, 0, 0.7, 1.0, 1.1);
    g.add(lat);
  }

  // Deltoids (shoulder caps)
  for (const side of [-1, 1]) {
    const delt = m(sphere(0.16 * s, 16, 12), bodyMat);
    place(delt, side * 0.35 * s, 0.85 * s, 0.02 * s, 0, 0, 0, 0.8, 1.0, 0.9);
    g.add(delt);
  }

  // ── Belly: lighter underbelly panel ───────────────────────────────────────
  const belly = m(sphere(0.28 * s, 18, 14), bellyMat);
  place(belly, 0, 0.55 * s, 0.1 * s, 0, 0, 0, 0.9, 1.0, 0.8);
  g.add(belly);

  // ── Hunched spine: vertebra bumps (10 spheres along back) ─────────────────
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const vx = 0;
    const vy = (0.95 - t * 0.35) * s;
    const vz = (-0.1 - t * 0.2) * s;
    const bump = m(sphere((0.04 - t * 0.01) * s, 8, 6), bodyMat);
    place(bump, vx, vy, vz);
    g.add(bump);
  }

  // ── Thick muscular neck with tendons ──────────────────────────────────────
  const neck = m(cyl(0.16 * s, 0.2 * s, 0.22 * s, 16), bodyMat);
  place(neck, 0, 0.98 * s, 0.06 * s, 0.3, 0, 0);
  g.add(neck);

  // Neck tendons
  for (const side of [-1, 1]) {
    const tendon = m(cyl(0.025 * s, 0.02 * s, 0.2 * s, 6), skinM);
    place(tendon, side * 0.08 * s, 0.96 * s, 0.08 * s, 0.3, 0, side * 0.1);
    g.add(tendon);
  }
  // Central tendon
  const centralTendon = m(cyl(0.02 * s, 0.015 * s, 0.18 * s, 6), skinM);
  place(centralTendon, 0, 0.97 * s, 0.12 * s, 0.35, 0, 0);
  g.add(centralTendon);

  // ── Head ──────────────────────────────────────────────────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.1 * s, 0.15 * s);
  g.add(headGroup);

  // Cranium
  const cranium = m(sphere(0.18 * s, 20, 16), bodyMat);
  place(cranium, 0, 0, 0, 0, 0, 0, 1.05, 0.95, 1.0);
  headGroup.add(cranium);

  // Prominent brow ridge (box overhang)
  const browRidge = m(box(0.28 * s, 0.05 * s, 0.1 * s), bodyMat);
  place(browRidge, 0, 0.06 * s, 0.12 * s);
  headGroup.add(browRidge);

  // Deep-set eyes
  for (const side of [-1, 1]) {
    // Eye socket (dark recess)
    const socket = m(sphere(0.04 * s, 10, 8), darkSkin);
    place(socket, side * 0.08 * s, 0.03 * s, 0.12 * s);
    headGroup.add(socket);

    // Eyeball
    const eye = m(sphere(0.028 * s, 14, 10), materials.eyeMat);
    place(eye, side * 0.08 * s, 0.03 * s, 0.14 * s);
    headGroup.add(eye);

    // Pupil
    const pupilMat = new THREE.MeshPhysicalMaterial({ color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 0.7 });
    const pupil = m(sphere(0.015 * s, 8, 6), pupilMat);
    place(pupil, side * 0.08 * s, 0.03 * s, 0.165 * s);
    headGroup.add(pupil);
  }

  // Wide flat nose with flared nostrils
  const nose = m(box(0.08 * s, 0.04 * s, 0.05 * s), darkSkin);
  place(nose, 0, -0.04 * s, 0.17 * s);
  headGroup.add(nose);

  // Flared nostrils
  for (const side of [-1, 1]) {
    const nostril = m(sphere(0.018 * s, 8, 6), darkSkin);
    place(nostril, side * 0.035 * s, -0.04 * s, 0.19 * s, 0, 0, 0, 1.2, 0.7, 0.8);
    headGroup.add(nostril);
  }

  // Thick lips
  const upperLip = m(box(0.12 * s, 0.02 * s, 0.04 * s), skinM);
  place(upperLip, 0, -0.07 * s, 0.15 * s);
  headGroup.add(upperLip);

  const lowerLip = m(box(0.11 * s, 0.025 * s, 0.035 * s), skinM);
  place(lowerLip, 0, -0.1 * s, 0.14 * s);
  headGroup.add(lowerLip);

  // Pronounced underbite with visible lower canines
  const underbite = m(box(0.1 * s, 0.03 * s, 0.04 * s), gumMat);
  place(underbite, 0, -0.09 * s, 0.16 * s);
  headGroup.add(underbite);

  // ── Mouth: upper jaw with teeth ───────────────────────────────────────────
  const upperJaw = m(box(0.11 * s, 0.02 * s, 0.08 * s), gumMat);
  place(upperJaw, 0, -0.075 * s, 0.12 * s);
  headGroup.add(upperJaw);

  // Upper teeth row
  for (let i = 0; i < 8; i++) {
    const tx = (i - 3.5) * 0.014 * s;
    const tooth = m(cone(0.008 * s, 0.02 * s, 6), toothMat);
    place(tooth, tx, -0.088 * s, 0.14 * s, Math.PI, 0, 0);
    headGroup.add(tooth);
  }

  // ── Mouth: lower jaw with teeth ───────────────────────────────────────────
  const lowerJaw = m(box(0.1 * s, 0.02 * s, 0.07 * s), gumMat);
  place(lowerJaw, 0, -0.095 * s, 0.11 * s);
  headGroup.add(lowerJaw);

  // Lower teeth row
  for (let i = 0; i < 8; i++) {
    const tx = (i - 3.5) * 0.013 * s;
    const tooth = m(cone(0.007 * s, 0.018 * s, 6), toothMat);
    place(tooth, tx, -0.088 * s, 0.13 * s, 0, 0, 0);
    headGroup.add(tooth);
  }

  // Lower canines protruding upward (underbite)
  for (const side of [-1, 1]) {
    const lowerCanine = m(cone(0.012 * s, 0.04 * s, 8), toothMat);
    place(lowerCanine, side * 0.04 * s, -0.068 * s, 0.15 * s, 0, 0, 0);
    headGroup.add(lowerCanine);
  }

  // Gum tissue
  const gumUpper = m(box(0.1 * s, 0.01 * s, 0.06 * s), gumMat);
  place(gumUpper, 0, -0.082 * s, 0.13 * s);
  headGroup.add(gumUpper);

  // Tongue
  const tongue = m(sphere(0.04 * s, 12, 8), tongueMat);
  place(tongue, 0, -0.09 * s, 0.08 * s, 0, 0, 0, 1.3, 0.4, 1.8);
  headGroup.add(tongue);

  // ── Ears (round, bear-like) ───────────────────────────────────────────────
  for (const side of [-1, 1]) {
    const earOuter = m(sphere(0.04 * s, 12, 10), bodyMat);
    place(earOuter, side * 0.13 * s, 0.1 * s, -0.02 * s, 0, 0, 0, 0.8, 1.0, 0.6);
    headGroup.add(earOuter);

    const earInner = m(sphere(0.025 * s, 10, 8), gumMat);
    place(earInner, side * 0.13 * s, 0.1 * s, 0.0);
    headGroup.add(earInner);
  }

  // ── Drool / saliva strands (2-3 thin transparent cylinders) ───────────────
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * 0.025 * s;
    const drool = m(cyl(0.004 * s, 0.002 * s, 0.06 * s, 4), droolMat);
    place(drool, dx, -0.13 * s, 0.12 * s);
    headGroup.add(drool);
  }

  // ── Arms with full musculature ────────────────────────────────────────────
  for (const side of [-1, 1]) {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.4 * s, 0.8 * s, 0.05 * s);
    g.add(armGroup);

    // Upper arm: bicep
    const bicep = m(cyl(0.1 * s, 0.08 * s, 0.22 * s, 14), bodyMat);
    place(bicep, 0, -0.1 * s, 0.02 * s, 0.15, 0, side * 0.1);
    armGroup.add(bicep);

    // Tricep (overlapping, slightly behind)
    const tricep = m(cyl(0.085 * s, 0.07 * s, 0.2 * s, 12), bodyMat);
    place(tricep, 0, -0.1 * s, -0.04 * s, 0.15, 0, side * 0.1);
    armGroup.add(tricep);

    // Elbow joint
    const elbow = m(sphere(0.065 * s, 12, 10), bodyMat);
    place(elbow, 0, -0.22 * s, 0);
    armGroup.add(elbow);

    // Forearm flexors (different radii)
    const forearm1 = m(cyl(0.075 * s, 0.055 * s, 0.22 * s, 12), bodyMat);
    place(forearm1, 0.015 * s, -0.34 * s, 0.01 * s, -0.1, 0, 0);
    armGroup.add(forearm1);

    const forearm2 = m(cyl(0.06 * s, 0.05 * s, 0.2 * s, 10), bodyMat);
    place(forearm2, -0.015 * s, -0.34 * s, -0.015 * s, -0.1, 0, 0);
    armGroup.add(forearm2);

    // Wrist
    const wrist = m(sphere(0.05 * s, 10, 8), skinM);
    place(wrist, 0, -0.46 * s, 0);
    armGroup.add(wrist);

    // ── Hand with 5 individual fingers ──────────────────────────────────────
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.5 * s, 0);
    armGroup.add(handGroup);

    // Palm
    const palm = m(box(0.1 * s, 0.06 * s, 0.08 * s), skinM);
    place(palm, 0, 0, 0.02 * s);
    handGroup.add(palm);

    for (let f = 0; f < 5; f++) {
      const fx = (f - 2) * 0.022 * s;
      const isThumb = f === 0;
      const fingerLen = isThumb ? 0.05 * s : 0.065 * s;
      const fingerRad = isThumb ? 0.015 * s : 0.012 * s;

      // Finger segment
      const finger = m(cyl(fingerRad, fingerRad * 0.85, fingerLen, 8), skinM);
      const fz = isThumb ? 0.0 : 0.06 * s;
      const fy = isThumb ? 0.01 * s : -0.03 * s;
      const frz = isThumb ? side * 0.8 : 0;
      place(finger, fx + (isThumb ? side * 0.03 * s : 0), fy, fz, -0.2, 0, frz);
      handGroup.add(finger);

      // Knuckle joint (sphere)
      const knuckle = m(sphere(fingerRad * 1.2, 8, 6), skinM);
      place(knuckle, fx + (isThumb ? side * 0.03 * s : 0), fy + fingerLen * 0.1, fz - 0.01 * s);
      handGroup.add(knuckle);

      // Massive claw (curved cone, 0.08 length)
      const claw = m(cone(fingerRad * 1.1, 0.08 * s, 8), clawMat);
      const clawFZ = fz + fingerLen * 0.6;
      const clawFY = fy - 0.02 * s;
      place(claw, fx + (isThumb ? side * 0.03 * s : 0), clawFY, clawFZ, -0.6, 0, frz * 0.5);
      handGroup.add(claw);
    }

    // Forearm fur (longer hanging strands)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const fur = m(cone(0.012 * s, 0.05 * s, 5), bodyMat);
      place(fur, Math.cos(angle) * 0.06 * s, -0.32 * s + Math.random() * 0.08 * s, Math.sin(angle) * 0.06 * s, 0, 0, Math.cos(angle) * 0.4);
      armGroup.add(fur);
    }
  }

  // ── Legs with full musculature ────────────────────────────────────────────
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.2 * s, 0.4 * s, -0.05 * s);
    g.add(legGroup);

    // Quadriceps (front of thigh)
    const quad = m(cyl(0.12 * s, 0.09 * s, 0.28 * s, 14), bodyMat);
    place(quad, 0.02 * s, -0.1 * s, 0.03 * s, 0.05, 0, 0);
    legGroup.add(quad);

    // Hamstrings (back of thigh)
    const hamstring = m(cyl(0.1 * s, 0.08 * s, 0.25 * s, 12), bodyMat);
    place(hamstring, -0.01 * s, -0.1 * s, -0.04 * s, -0.05, 0, 0);
    legGroup.add(hamstring);

    // Knee
    const knee = m(sphere(0.075 * s, 12, 10), bodyMat);
    place(knee, 0, -0.25 * s, 0.02 * s);
    legGroup.add(knee);

    // Calves
    const calf = m(cyl(0.08 * s, 0.06 * s, 0.25 * s, 12), bodyMat);
    place(calf, 0, -0.38 * s, 0.0, 0, 0, 0);
    legGroup.add(calf);

    // Ankle
    const ankle = m(sphere(0.055 * s, 10, 8), skinM);
    place(ankle, 0, -0.51 * s, 0);
    legGroup.add(ankle);

    // ── Foot with 5 individual toes and claws ───────────────────────────────
    const foot = m(box(0.12 * s, 0.04 * s, 0.16 * s), skinM);
    place(foot, 0, -0.55 * s, 0.04 * s);
    legGroup.add(foot);

    for (let t = 0; t < 5; t++) {
      const tx = (t - 2) * 0.024 * s;
      // Toe
      const toe = m(sphere(0.018 * s, 8, 6), skinM);
      place(toe, tx, -0.55 * s, 0.12 * s);
      legGroup.add(toe);

      // Toe claw
      const toeClaw = m(cone(0.01 * s, 0.04 * s, 8), clawMat);
      place(toeClaw, tx, -0.555 * s, 0.15 * s, -0.5, 0, 0);
      legGroup.add(toeClaw);
    }

    // Leg fur
    for (let i = 0; i < 5; i++) {
      const fy = -0.05 * s - i * 0.08 * s;
      const fur = m(cone(0.01 * s, 0.03 * s, 5), bodyMat);
      place(fur, side * 0.08 * s, fy, 0, 0, 0, side * 0.4);
      legGroup.add(fur);
    }
  }

  // ── Pelvis / hip region ───────────────────────────────────────────────────
  const pelvis = m(sphere(0.22 * s, 16, 12), bodyMat);
  place(pelvis, 0, 0.45 * s, -0.08 * s, 0, 0, 0, 1.2, 0.8, 1.0);
  g.add(pelvis);

  // ── Fur / hair system: 60+ cone meshes ────────────────────────────────────
  // Chest fur (hanging strands)
  for (let i = 0; i < 14; i++) {
    const angle = ((i / 14) - 0.5) * Math.PI;
    const fx = Math.sin(angle) * 0.22 * s;
    const fy = 0.6 * s + Math.cos(angle) * 0.1 * s;
    const fur = m(cone(0.01 * s, 0.06 * s, 5), accentMat);
    place(fur, fx, fy, 0.2 * s, -0.3, 0, 0);
    g.add(fur);
  }

  // Shoulder mane
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI;
      const fur = m(cone(0.012 * s, 0.055 * s, 5), bodyMat);
      place(fur,
        side * (0.3 + Math.cos(angle) * 0.08) * s,
        (0.85 + Math.sin(angle) * 0.08) * s,
        -0.02 * s,
        0, 0, side * 0.3
      );
      g.add(fur);
    }
  }

  // Back fur
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const fz = -0.1 * s - t * 0.2 * s;
    const fy = (0.92 - t * 0.3) * s;
    const fur = m(cone(0.011 * s, 0.04 * s, 5), bodyMat);
    place(fur, (Math.random() - 0.5) * 0.12 * s, fy, fz, 0.3, 0, 0);
    g.add(fur);
  }

  // Forearm fur
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const fur = m(cone(0.009 * s, 0.04 * s, 5), bodyMat);
      place(fur, side * 0.42 * s, (0.55 - i * 0.08) * s, 0.03 * s, 0, 0, side * 0.6);
      g.add(fur);
    }
  }

  // Side torso fur
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const fur = m(cone(0.01 * s, 0.035 * s, 5), bodyMat);
      place(fur, side * 0.32 * s, (0.55 + t * 0.3) * s, (-0.05 + t * 0.1) * s, 0, 0, side * 0.5);
      g.add(fur);
    }
  }

  // ── Matted fur patches (rougher, different color) ─────────────────────────
  for (let i = 0; i < 5; i++) {
    const patchSide = i % 2 === 0 ? 1 : -1;
    const patch = m(sphere(0.06 * s, 10, 8), mattedFurMat);
    place(patch,
      patchSide * (0.2 + Math.random() * 0.1) * s,
      (0.55 + Math.random() * 0.3) * s,
      (Math.random() - 0.5) * 0.15 * s,
      0, 0, 0, 1.3, 0.4, 1.2
    );
    g.add(patch);
  }

  // ── Battle scars (6-8) ────────────────────────────────────────────────────
  // Deep scars (dark thin boxes)
  for (let i = 0; i < 4; i++) {
    const scarSide = i % 2 === 0 ? 1 : -1;
    const scar = m(box(0.005 * s, 0.004 * s, 0.08 * s), scarDarkMat);
    place(scar,
      scarSide * (0.28 + Math.random() * 0.06) * s,
      (0.55 + Math.random() * 0.3) * s,
      (Math.random() - 0.3) * 0.15 * s,
      0, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.8
    );
    g.add(scar);
  }

  // Healed scars (raised light boxes)
  for (let i = 0; i < 4; i++) {
    const scarSide = i % 2 === 0 ? -1 : 1;
    const scar = m(box(0.007 * s, 0.006 * s, 0.07 * s), scarLightMat);
    place(scar,
      scarSide * (0.25 + Math.random() * 0.08) * s,
      (0.6 + Math.random() * 0.25) * s,
      (Math.random() - 0.4) * 0.12 * s,
      0, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6
    );
    g.add(scar);
  }

  // ── War trophies: teeth necklace ──────────────────────────────────────────
  const necklaceRing = m(torus(0.2 * s, 0.008 * s, 12, 24), boneMat);
  place(necklaceRing, 0, 0.65 * s, 0.15 * s, Math.PI * 0.5, 0, 0);
  g.add(necklaceRing);

  // Teeth on necklace (series of small cones)
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const toothN = m(cone(0.008 * s, 0.03 * s, 6), toothMat);
    place(toothN,
      Math.sin(angle) * 0.2 * s,
      0.65 * s - 0.015 * s,
      0.15 * s + Math.cos(angle) * 0.2 * s,
      0, 0, 0
    );
    g.add(toothN);
  }

  // ── War trophies: bones tied in fur ───────────────────────────────────────
  for (const side of [-1, 1]) {
    // Bone shaft (cylinder)
    const boneShaft = m(cyl(0.01 * s, 0.01 * s, 0.1 * s, 6), boneMat);
    place(boneShaft, side * 0.32 * s, 0.9 * s, -0.08 * s, 0.5, side * 0.3, 0);
    g.add(boneShaft);

    // Bone ends (spheres)
    const boneEnd1 = m(sphere(0.018 * s, 8, 6), boneMat);
    place(boneEnd1, side * 0.3 * s, 0.94 * s, -0.05 * s);
    g.add(boneEnd1);

    const boneEnd2 = m(sphere(0.015 * s, 8, 6), boneMat);
    place(boneEnd2, side * 0.34 * s, 0.86 * s, -0.11 * s);
    g.add(boneEnd2);
  }

  // Extra bone decoration on head
  const skullBone = m(cyl(0.008 * s, 0.008 * s, 0.06 * s, 6), boneMat);
  place(skullBone, 0.1 * s, 0.08 * s, -0.1 * s, 0, 0, 0.8);
  headGroup.add(skullBone);

  const skullEnd = m(sphere(0.014 * s, 6, 4), boneMat);
  place(skullEnd, 0.13 * s, 0.1 * s, -0.1 * s);
  headGroup.add(skullEnd);

  // ── Ground impact cracks beneath feet ─────────────────────────────────────
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const crack = m(box(0.008 * s, 0.003 * s, (0.08 + Math.random() * 0.06) * s), crackMat);
      place(crack,
        side * 0.2 * s + Math.cos(angle) * 0.05 * s,
        -0.15 * s,
        -0.05 * s + Math.sin(angle) * 0.05 * s,
        0, angle, 0
      );
      g.add(crack);
    }
  }

  // ── Glow effect ───────────────────────────────────────────────────────────
  if (materials.glowMat) {
    const glow = m(sphere(0.5 * s, 14, 12), materials.glowMat);
    place(glow, 0, 0.7 * s, 0);
    g.add(glow);
  }

  // ── Helm ──────────────────────────────────────────────────────────────────
  if (look.hasHelm) {
    const helm = m(sphere(0.2 * s, 16, 14), materials.armorMat(look.accentColor));
    place(helm, 0, 0.05 * s, 0, 0, 0, 0, 1.1, 0.9, 1.05);
    headGroup.add(helm);

    // Helm horns
    for (const side of [-1, 1]) {
      const horn = m(cone(0.02 * s, 0.12 * s, 8), materials.armorMat(look.accentColor));
      place(horn, side * 0.15 * s, 0.1 * s, -0.02 * s, 0, 0, side * 0.5);
      headGroup.add(horn);
    }
  }

  // ── Cape ──────────────────────────────────────────────────────────────────
  if (look.hasCape) {
    const cape = m(box(0.4 * s, 0.6 * s, 0.02 * s), materials.armorMat(look.accentColor));
    place(cape, 0, 0.6 * s, -0.25 * s, 0.15, 0, 0);
    g.add(cape);
  }

  // ── Weapon / shield ───────────────────────────────────────────────────────
  if (look.hasWeapon) {
    materials.addWeapon(g, 0.5 * s, 0.4 * s);
  }
  if (look.hasShield) {
    materials.addShield(g, -0.5 * s, 0.5 * s);
  }
}
