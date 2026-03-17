import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface EnemyAppearance {
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

export interface EnemyMaterials {
  mat: (c: number) => THREE.MeshPhysicalMaterial;
  skinMat: (c: number) => THREE.MeshPhysicalMaterial;
  armorMat: (c: number) => THREE.MeshPhysicalMaterial;
  furMat: (c: number) => THREE.MeshPhysicalMaterial;
  eyeMat: THREE.MeshPhysicalMaterial;
  glowMat: THREE.MeshPhysicalMaterial | null;
  addWeapon: (parent: THREE.Group, wx: number, wy: number) => void;
  addShield: (parent: THREE.Group, sx: number, sy: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Shared geometry helpers                                           */
/* ------------------------------------------------------------------ */

const S = true; // shorthand for castShadow

function m(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = S): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = shadow;
  return mesh;
}

function pos(mesh: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  mesh.position.set(x, y, z);
  return mesh;
}

function rot(mesh: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  mesh.rotation.set(x, y, z);
  return mesh;
}

function scl(mesh: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  mesh.scale.set(x, y, z);
  return mesh;
}

function cyl(rTop: number, rBot: number, h: number, seg = 20): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg);
}

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d, 2, 2, 2);
}

function sph(r: number, wSeg = 24, hSeg = 16): THREE.SphereGeometry {
  return new THREE.SphereGeometry(r, wSeg, hSeg);
}

function tor(r: number, tube: number, rSeg = 16, tSeg = 32): THREE.TorusGeometry {
  return new THREE.TorusGeometry(r, tube, rSeg, tSeg);
}

function cone(r: number, h: number, seg = 16): THREE.ConeGeometry {
  return new THREE.ConeGeometry(r, h, seg);
}

function plane(w: number, h: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(w, h);
}

/** Build a finger with 3 phalanx segments */
function buildFinger(
  mat: THREE.Material,
  length: number,
  radius: number,
  curveAngle: number,
): THREE.Group {
  const finger = new THREE.Group();

  // Proximal phalanx
  const proximal = m(cyl(radius, radius * 0.95, length * 0.45, 8), mat);
  proximal.position.y = length * 0.225;
  finger.add(proximal);

  // Middle phalanx
  const middleGroup = new THREE.Group();
  middleGroup.position.y = length * 0.45;
  middleGroup.rotation.x = curveAngle * 0.4;
  const middle = m(cyl(radius * 0.9, radius * 0.85, length * 0.3, 8), mat);
  middle.position.y = length * 0.15;
  middleGroup.add(middle);

  // Distal phalanx
  const distalGroup = new THREE.Group();
  distalGroup.position.y = length * 0.3;
  distalGroup.rotation.x = curveAngle * 0.6;
  const distal = m(cyl(radius * 0.8, radius * 0.5, length * 0.25, 8), mat);
  distal.position.y = length * 0.125;
  distalGroup.add(distal);

  // Fingertip nail
  const nail = m(box(radius * 1.2, radius * 0.3, radius * 0.8), mat);
  nail.position.set(0, length * 0.25, -radius * 0.3);
  distalGroup.add(nail);

  middleGroup.add(distalGroup);
  finger.add(middleGroup);

  return finger;
}

/** Build a complete hand with 5 fingers */
function buildHand(
  mat: THREE.Material,
  side: number, // -1 left, 1 right
): THREE.Group {
  const hand = new THREE.Group();

  // Palm
  const palm = m(box(0.09, 0.04, 0.08), mat);
  hand.add(palm);

  const fingerLength = 0.07;
  const fingerR = 0.012;

  // Four main fingers
  for (let i = 0; i < 4; i++) {
    const xOff = -0.03 + i * 0.02;
    const f = buildFinger(mat, fingerLength, fingerR, 0.25 + i * 0.05);
    f.position.set(xOff, 0.02, -0.03);
    f.rotation.x = -0.15;
    hand.add(f);
  }

  // Thumb
  const thumb = buildFinger(mat, fingerLength * 0.75, fingerR * 1.1, 0.3);
  thumb.position.set(side * 0.045, 0.0, 0.02);
  thumb.rotation.set(-0.3, side * 0.6, side * 0.3);
  hand.add(thumb);

  return hand;
}

/** Build tattered cloth strip */
function buildTatteredStrip(
  mat: THREE.Material,
  w: number,
  h: number,
): THREE.Mesh {
  const geo = plane(w, h);
  const clothMat = (mat as THREE.MeshPhysicalMaterial).clone();
  clothMat.side = THREE.DoubleSide;
  const strip = m(geo, clothMat);
  return strip;
}

/** Build a scar (thin line on skin) */
function buildScar(skinMat: THREE.Material, length: number): THREE.Mesh {
  const scarMat = (skinMat as THREE.MeshPhysicalMaterial).clone();
  scarMat.color = new THREE.Color(0xddc0b0);
  const scar = m(box(length, 0.003, 0.005), scarMat);
  return scar;
}

/* ------------------------------------------------------------------ */
/*  buildHumanoidEnemy – bandits, soldiers, rogues                    */
/* ------------------------------------------------------------------ */

export function buildHumanoidEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials,
): void {
  const sc = look.scale;
  const skinM = materials.skinMat(look.bodyColor);
  const clothM = materials.mat(look.accentColor);
  const leatherM = materials.armorMat(0x5c3a1e);
  const darkLeather = materials.armorMat(0x3b2510);
  const clothDark = materials.mat(0x2a2a2a);
  const beltM = materials.armorMat(0x4a3018);
  const bootM = materials.armorMat(0x3d2b1a);
  const hairM = materials.furMat(0x3b2010);

  /* ============================================================== */
  /*  TORSO – Anatomical muscular build                             */
  /* ============================================================== */

  // Upper chest / pectorals
  const chest = m(cyl(0.17 * sc, 0.19 * sc, 0.14 * sc, 20), skinM);
  pos(chest, 0, 1.05 * sc, 0);
  g.add(chest);

  // Pectoral definition – two bulging boxes
  const pectL = m(box(0.08 * sc, 0.06 * sc, 0.06 * sc), skinM);
  pos(pectL, -0.06 * sc, 1.08 * sc, 0.1 * sc);
  g.add(pectL);
  const pectR = m(box(0.08 * sc, 0.06 * sc, 0.06 * sc), skinM);
  pos(pectR, 0.06 * sc, 1.08 * sc, 0.1 * sc);
  g.add(pectR);

  // Ribcage section
  const ribcage = m(cyl(0.19 * sc, 0.16 * sc, 0.12 * sc, 20), skinM);
  pos(ribcage, 0, 0.93 * sc, 0);
  g.add(ribcage);

  // Abdomen / belly
  const abdomen = m(cyl(0.16 * sc, 0.14 * sc, 0.12 * sc, 16), skinM);
  pos(abdomen, 0, 0.81 * sc, 0);
  g.add(abdomen);

  // Abdominal muscle lines (6 vertical thin boxes for six-pack or just muscle def)
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col += 2) {
      const ab = m(box(0.04 * sc, 0.025 * sc, 0.01 * sc), skinM);
      pos(ab, col * 0.035 * sc, (0.82 + row * 0.04) * sc, 0.14 * sc);
      g.add(ab);
    }
  }

  /* ============================================================== */
  /*  UNDERTUNIC – base layer cloth                                 */
  /* ============================================================== */

  const undertunic = m(cyl(0.2 * sc, 0.18 * sc, 0.35 * sc, 16), clothDark);
  pos(undertunic, 0, 0.925 * sc, 0);
  g.add(undertunic);

  // Undertunic sleeves (visible at shoulder edge)
  for (const side of [-1, 1]) {
    const sleeve = m(cyl(0.055 * sc, 0.05 * sc, 0.08 * sc, 12), clothDark);
    pos(sleeve, side * 0.2 * sc, 1.06 * sc, 0);
    g.add(sleeve);
  }

  /* ============================================================== */
  /*  OVERTUNIC – split at waist                                    */
  /* ============================================================== */

  const overtunicTop = m(cyl(0.21 * sc, 0.2 * sc, 0.2 * sc, 16), clothM);
  pos(overtunicTop, 0, 1.0 * sc, 0);
  g.add(overtunicTop);

  // Split overtunic lower flaps (front and back)
  for (const zSide of [-1, 1]) {
    const flap = buildTatteredStrip(clothM, 0.18 * sc, 0.15 * sc);
    pos(flap, 0, 0.8 * sc, zSide * 0.12 * sc);
    rot(flap, zSide * 0.1, 0, 0);
    g.add(flap);
  }

  // Side slits
  for (const side of [-1, 1]) {
    const sideFlap = buildTatteredStrip(clothM, 0.06 * sc, 0.12 * sc);
    pos(sideFlap, side * 0.14 * sc, 0.8 * sc, 0);
    rot(sideFlap, 0, Math.PI / 2, side * 0.1);
    g.add(sideFlap);
  }

  /* ============================================================== */
  /*  LEATHER VEST / JERKIN with stitching                          */
  /* ============================================================== */

  const vest = m(cyl(0.19 * sc, 0.17 * sc, 0.22 * sc, 16), leatherM);
  pos(vest, 0, 0.99 * sc, 0);
  g.add(vest);

  // Vest front opening edges
  for (const side of [-1, 1]) {
    const edge = m(box(0.012 * sc, 0.22 * sc, 0.03 * sc), darkLeather);
    pos(edge, side * 0.06 * sc, 0.99 * sc, 0.16 * sc);
    g.add(edge);
  }

  // Stitching lines on vest – tiny line meshes along the seams
  for (let i = 0; i < 8; i++) {
    // Left seam
    const stitchL = m(box(0.003 * sc, 0.006 * sc, 0.015 * sc), darkLeather);
    pos(stitchL, -0.065 * sc, (0.89 + i * 0.025) * sc, 0.165 * sc);
    g.add(stitchL);
    // Right seam
    const stitchR = m(box(0.003 * sc, 0.006 * sc, 0.015 * sc), darkLeather);
    pos(stitchR, 0.065 * sc, (0.89 + i * 0.025) * sc, 0.165 * sc);
    g.add(stitchR);
  }

  // Side stitching
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const stitch = m(box(0.015 * sc, 0.005 * sc, 0.003 * sc), darkLeather);
      pos(stitch, side * 0.18 * sc, (0.9 + i * 0.03) * sc, 0);
      g.add(stitch);
    }
  }

  /* ============================================================== */
  /*  SHOULDER STRAPS / BANDOLIERS                                  */
  /* ============================================================== */

  // Cross-chest bandolier (left shoulder to right hip)
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const bx = THREE.MathUtils.lerp(-0.16 * sc, 0.1 * sc, t);
    const by = THREE.MathUtils.lerp(1.12 * sc, 0.78 * sc, t);
    const bz = THREE.MathUtils.lerp(0.05 * sc, 0.14 * sc, t);
    const seg = m(box(0.025 * sc, 0.025 * sc, 0.015 * sc), darkLeather);
    pos(seg, bx, by, bz);
    rot(seg, 0, 0, 0.35);
    g.add(seg);
  }

  // Small pouches on bandolier
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.2;
    const px = THREE.MathUtils.lerp(-0.16 * sc, 0.1 * sc, t);
    const py = THREE.MathUtils.lerp(1.12 * sc, 0.78 * sc, t) - 0.02 * sc;
    const pz = THREE.MathUtils.lerp(0.05 * sc, 0.14 * sc, t) + 0.015 * sc;
    const pouch = m(box(0.02 * sc, 0.025 * sc, 0.02 * sc), leatherM);
    pos(pouch, px, py, pz);
    g.add(pouch);
    // Pouch flap
    const flap = m(box(0.022 * sc, 0.005 * sc, 0.022 * sc), darkLeather);
    pos(flap, px, py + 0.015 * sc, pz);
    g.add(flap);
  }

  /* ============================================================== */
  /*  NECK with tendons and adam's apple                             */
  /* ============================================================== */

  const neck = m(cyl(0.06 * sc, 0.07 * sc, 0.08 * sc, 12), skinM);
  pos(neck, 0, 1.16 * sc, 0);
  g.add(neck);

  // Sternocleidomastoid tendons (left and right)
  for (const side of [-1, 1]) {
    const tendon = m(cyl(0.012 * sc, 0.01 * sc, 0.09 * sc, 6), skinM);
    pos(tendon, side * 0.035 * sc, 1.16 * sc, 0.025 * sc);
    rot(tendon, 0.1, 0, side * -0.15);
    g.add(tendon);
  }

  // Adam's apple
  const adamsApple = m(box(0.018 * sc, 0.022 * sc, 0.015 * sc), skinM);
  pos(adamsApple, 0, 1.155 * sc, 0.06 * sc);
  g.add(adamsApple);

  /* ============================================================== */
  /*  HEAD – detailed facial features                               */
  /* ============================================================== */

  const head = m(sph(0.11 * sc, 20, 16), skinM);
  pos(head, 0, 1.3 * sc, 0);
  g.add(head);

  // Jaw / chin
  const jaw = m(box(0.08 * sc, 0.04 * sc, 0.07 * sc), skinM);
  pos(jaw, 0, 1.21 * sc, 0.04 * sc);
  g.add(jaw);

  // Chin point
  const chin = m(sph(0.025 * sc, 8, 6), skinM);
  pos(chin, 0, 1.195 * sc, 0.07 * sc);
  g.add(chin);

  // Cheekbones
  for (const side of [-1, 1]) {
    const cheekbone = m(box(0.035 * sc, 0.02 * sc, 0.03 * sc), skinM);
    pos(cheekbone, side * 0.065 * sc, 1.28 * sc, 0.075 * sc);
    g.add(cheekbone);
  }

  // Jawline ridges
  for (const side of [-1, 1]) {
    const jawLine = m(box(0.01 * sc, 0.03 * sc, 0.04 * sc), skinM);
    pos(jawLine, side * 0.06 * sc, 1.23 * sc, 0.03 * sc);
    rot(jawLine, 0, side * 0.2, 0);
    g.add(jawLine);
  }

  // Nose bridge + tip
  const noseBridge = m(box(0.015 * sc, 0.04 * sc, 0.02 * sc), skinM);
  pos(noseBridge, 0, 1.3 * sc, 0.1 * sc);
  g.add(noseBridge);
  const noseTip = m(sph(0.015 * sc, 8, 6), skinM);
  pos(noseTip, 0, 1.28 * sc, 0.115 * sc);
  g.add(noseTip);

  // Nostrils
  for (const side of [-1, 1]) {
    const nostril = m(sph(0.007 * sc, 6, 4), skinM);
    pos(nostril, side * 0.01 * sc, 1.275 * sc, 0.112 * sc);
    g.add(nostril);
  }

  // Eyes
  for (const side of [-1, 1]) {
    // Eye socket depression
    const socket = m(sph(0.02 * sc, 8, 6), skinM);
    pos(socket, side * 0.04 * sc, 1.31 * sc, 0.085 * sc);
    g.add(socket);

    // Eyeball
    const eye = m(sph(0.014 * sc, 10, 8), materials.eyeMat);
    pos(eye, side * 0.04 * sc, 1.31 * sc, 0.095 * sc);
    g.add(eye);

    // Pupil
    const pupilMat = materials.mat(look.eyeColor);
    const pupil = m(sph(0.007 * sc, 8, 6), pupilMat);
    pos(pupil, side * 0.04 * sc, 1.31 * sc, 0.107 * sc);
    g.add(pupil);

    // Eyebrow – thin box mesh
    const brow = m(box(0.035 * sc, 0.008 * sc, 0.012 * sc), hairM);
    pos(brow, side * 0.04 * sc, 1.34 * sc, 0.09 * sc);
    rot(brow, 0, 0, side * -0.1);
    g.add(brow);

    // Upper eyelid
    const lid = m(box(0.028 * sc, 0.005 * sc, 0.015 * sc), skinM);
    pos(lid, side * 0.04 * sc, 1.32 * sc, 0.093 * sc);
    g.add(lid);
  }

  // Ears
  for (const side of [-1, 1]) {
    const ear = m(box(0.015 * sc, 0.035 * sc, 0.025 * sc), skinM);
    pos(ear, side * 0.11 * sc, 1.3 * sc, -0.01 * sc);
    g.add(ear);
    // Earlobe
    const lobe = m(sph(0.008 * sc, 6, 4), skinM);
    pos(lobe, side * 0.112 * sc, 1.28 * sc, -0.01 * sc);
    g.add(lobe);
  }

  // Mouth line
  const mouth = m(box(0.04 * sc, 0.004 * sc, 0.01 * sc), materials.mat(0x8b4040));
  pos(mouth, 0, 1.255 * sc, 0.1 * sc);
  g.add(mouth);

  // Lower lip
  const lowerLip = m(box(0.035 * sc, 0.008 * sc, 0.012 * sc), materials.mat(0xa05555));
  pos(lowerLip, 0, 1.25 * sc, 0.1 * sc);
  g.add(lowerLip);

  /* ============================================================== */
  /*  HAIR – cluster of cone/cylinder tufts                         */
  /* ============================================================== */

  const hairCluster = new THREE.Group();
  hairCluster.position.set(0, 1.37 * sc, -0.01 * sc);

  // Main hair volume
  const hairBase = m(sph(0.1 * sc, 12, 10), hairM);
  pos(hairBase, 0, 0, 0);
  hairCluster.add(hairBase);

  // Individual tufts on top
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.06 * sc;
    const tuft = m(cone(0.018 * sc, 0.06 * sc, 6), hairM);
    pos(tuft, Math.cos(angle) * radius, 0.04 * sc, Math.sin(angle) * radius);
    rot(tuft, Math.sin(angle) * 0.3, 0, -Math.cos(angle) * 0.3);
    hairCluster.add(tuft);
  }
  // Center tufts
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const tuft = m(cone(0.015 * sc, 0.05 * sc, 6), hairM);
    pos(tuft, Math.cos(angle) * 0.025 * sc, 0.06 * sc, Math.sin(angle) * 0.025 * sc);
    hairCluster.add(tuft);
  }

  // Back hair drape (longer strands)
  for (let i = 0; i < 6; i++) {
    const strand = m(cyl(0.012 * sc, 0.008 * sc, 0.1 * sc, 6), hairM);
    pos(strand, (i - 2.5) * 0.025 * sc, -0.05 * sc, -0.08 * sc);
    rot(strand, 0.3, 0, 0);
    hairCluster.add(strand);
  }

  g.add(hairCluster);

  /* ============================================================== */
  /*  SCARS on face and arms                                        */
  /* ============================================================== */

  // Face scar (left cheek, diagonal)
  const faceScar = buildScar(skinM, 0.04 * sc);
  pos(faceScar, -0.06 * sc, 1.28 * sc, 0.09 * sc);
  rot(faceScar, 0, 0, 0.5);
  g.add(faceScar);

  // Right cheek scar
  const faceScar2 = buildScar(skinM, 0.025 * sc);
  pos(faceScar2, 0.05 * sc, 1.26 * sc, 0.09 * sc);
  rot(faceScar2, 0, 0, -0.3);
  g.add(faceScar2);

  // Forehead scar
  const foreheadScar = buildScar(skinM, 0.035 * sc);
  pos(foreheadScar, 0.02 * sc, 1.35 * sc, 0.095 * sc);
  rot(foreheadScar, 0, 0, 0.2);
  g.add(foreheadScar);

  /* ============================================================== */
  /*  ARMS – muscular biceps and forearms                           */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.24 * sc, 1.06 * sc, 0);

    // Shoulder ball joint
    const shoulder = m(sph(0.055 * sc, 12, 10), skinM);
    pos(shoulder, 0, 0, 0);
    armGroup.add(shoulder);

    // Deltoid muscle shape
    const deltoid = m(cyl(0.06 * sc, 0.05 * sc, 0.06 * sc, 12), skinM);
    pos(deltoid, 0, -0.02 * sc, 0);
    armGroup.add(deltoid);

    // Bicep (thicker upper arm)
    const bicep = m(cyl(0.05 * sc, 0.045 * sc, 0.14 * sc, 12), skinM);
    pos(bicep, 0, -0.12 * sc, 0);
    armGroup.add(bicep);

    // Bicep muscle bulge
    const bicepBulge = m(sph(0.035 * sc, 8, 6), skinM);
    pos(bicepBulge, 0, -0.1 * sc, 0.03 * sc);
    armGroup.add(bicepBulge);

    // Elbow joint
    const elbow = m(sph(0.035 * sc, 8, 6), skinM);
    pos(elbow, 0, -0.2 * sc, 0);
    armGroup.add(elbow);

    // Forearm (slightly thinner, tapered)
    const forearm = m(cyl(0.042 * sc, 0.032 * sc, 0.14 * sc, 12), skinM);
    pos(forearm, 0, -0.33 * sc, 0);
    armGroup.add(forearm);

    // Forearm muscle ridge
    const forearmRidge = m(box(0.01 * sc, 0.1 * sc, 0.02 * sc), skinM);
    pos(forearmRidge, side * 0.02 * sc, -0.3 * sc, 0.02 * sc);
    armGroup.add(forearmRidge);

    // Wrist
    const wrist = m(cyl(0.03 * sc, 0.028 * sc, 0.04 * sc, 10), skinM);
    pos(wrist, 0, -0.42 * sc, 0);
    armGroup.add(wrist);

    // Arm scar
    const armScar = buildScar(skinM, 0.05 * sc);
    pos(armScar, side * 0.02 * sc, -0.18 * sc, 0.04 * sc);
    rot(armScar, 0, 0, 0.6);
    armGroup.add(armScar);

    // Leather bracer on forearm
    const bracer = m(cyl(0.038 * sc, 0.04 * sc, 0.06 * sc, 12), leatherM);
    pos(bracer, 0, -0.36 * sc, 0);
    armGroup.add(bracer);

    // Bracer stitching
    for (let i = 0; i < 4; i++) {
      const bStitch = m(box(0.003 * sc, 0.008 * sc, 0.012 * sc), darkLeather);
      pos(bStitch, side * 0.035 * sc, (-0.34 + i * 0.015) * sc, 0.02 * sc);
      armGroup.add(bStitch);
    }

    // Hand with individual fingers
    const hand = buildHand(skinM, side);
    hand.position.set(0, -0.46 * sc, 0);
    hand.scale.setScalar(sc);
    armGroup.add(hand);

    g.add(armGroup);
  }

  /* ============================================================== */
  /*  BELT with pouches and dagger sheath                           */
  /* ============================================================== */

  // Main belt
  const belt = m(cyl(0.17 * sc, 0.17 * sc, 0.035 * sc, 16), beltM);
  pos(belt, 0, 0.75 * sc, 0);
  g.add(belt);

  // Belt buckle
  const buckle = m(box(0.03 * sc, 0.03 * sc, 0.015 * sc), materials.mat(0xc0a030));
  pos(buckle, 0, 0.75 * sc, 0.17 * sc);
  g.add(buckle);

  // Belt buckle prong
  const prong = m(cyl(0.003 * sc, 0.003 * sc, 0.025 * sc, 4), materials.mat(0xb09020));
  pos(prong, 0, 0.755 * sc, 0.175 * sc);
  rot(prong, 0, 0, Math.PI / 2);
  g.add(prong);

  // Belt pouches (4 pouches around belt)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.5;
    const px = Math.sin(angle) * 0.18 * sc;
    const pz = Math.cos(angle) * 0.18 * sc;

    const pouchBody = m(box(0.03 * sc, 0.035 * sc, 0.025 * sc), leatherM);
    pos(pouchBody, px, 0.73 * sc, pz);
    g.add(pouchBody);

    const pouchFlap = m(box(0.032 * sc, 0.006 * sc, 0.027 * sc), darkLeather);
    pos(pouchFlap, px, 0.75 * sc, pz);
    g.add(pouchFlap);

    // Pouch button
    const button = m(sph(0.004 * sc, 4, 4), materials.mat(0xc0a030));
    pos(button, px, 0.745 * sc, pz + 0.014 * sc);
    g.add(button);
  }

  // Dagger sheath on belt (left hip)
  const sheathBody = m(cyl(0.015 * sc, 0.01 * sc, 0.1 * sc, 8), darkLeather);
  pos(sheathBody, -0.16 * sc, 0.7 * sc, 0.05 * sc);
  rot(sheathBody, 0, 0, 0.15);
  g.add(sheathBody);

  // Dagger pommel sticking out
  const daggerPommel = m(sph(0.012 * sc, 6, 4), materials.mat(0x888888));
  pos(daggerPommel, -0.155 * sc, 0.755 * sc, 0.05 * sc);
  g.add(daggerPommel);

  /* ============================================================== */
  /*  LEGS – with muscle definition                                 */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.08 * sc, 0.72 * sc, 0);

    // Hip joint
    const hip = m(sph(0.05 * sc, 10, 8), skinM);
    legGroup.add(hip);

    // Thigh (muscular, tapered)
    const thigh = m(cyl(0.065 * sc, 0.05 * sc, 0.22 * sc, 14), skinM);
    pos(thigh, 0, -0.13 * sc, 0);
    legGroup.add(thigh);

    // Quadricep bulge
    const quad = m(sph(0.04 * sc, 8, 6), skinM);
    pos(quad, 0, -0.1 * sc, 0.04 * sc);
    legGroup.add(quad);

    // Knee cap
    const kneeCap = m(sph(0.03 * sc, 8, 6), skinM);
    pos(kneeCap, 0, -0.24 * sc, 0.03 * sc);
    legGroup.add(kneeCap);

    // Knee wraps / leather greaves
    const kneeWrap = m(cyl(0.048 * sc, 0.046 * sc, 0.06 * sc, 10), leatherM);
    pos(kneeWrap, 0, -0.24 * sc, 0);
    legGroup.add(kneeWrap);

    // Wrap straps around knee
    for (let i = 0; i < 3; i++) {
      const strap = m(tor(0.048 * sc, 0.004 * sc, 6, 16), darkLeather);
      pos(strap, 0, (-0.22 + i * 0.02) * sc, 0);
      rot(strap, Math.PI / 2, 0, 0);
      legGroup.add(strap);
    }

    // Shin / calf (tapered)
    const shin = m(cyl(0.045 * sc, 0.035 * sc, 0.2 * sc, 12), skinM);
    pos(shin, 0, -0.38 * sc, 0);
    legGroup.add(shin);

    // Calf muscle bulge (back of leg)
    const calf = m(sph(0.03 * sc, 8, 6), skinM);
    pos(calf, 0, -0.32 * sc, -0.03 * sc);
    legGroup.add(calf);

    // Ankle
    const ankle = m(cyl(0.032 * sc, 0.03 * sc, 0.04 * sc, 10), skinM);
    pos(ankle, 0, -0.5 * sc, 0);
    legGroup.add(ankle);

    g.add(legGroup);
  }

  /* ============================================================== */
  /*  BOOTS – detailed with sole, heel, shaft, lacing               */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const bootGroup = new THREE.Group();
    bootGroup.position.set(side * 0.08 * sc, 0.2 * sc, 0);

    // Boot upper shaft
    const shaft = m(cyl(0.04 * sc, 0.045 * sc, 0.14 * sc, 12), bootM);
    pos(shaft, 0, 0.05 * sc, 0);
    bootGroup.add(shaft);

    // Boot shaft top rim
    const shaftRim = m(tor(0.043 * sc, 0.005 * sc, 8, 16), darkLeather);
    pos(shaftRim, 0, 0.12 * sc, 0);
    rot(shaftRim, Math.PI / 2, 0, 0);
    bootGroup.add(shaftRim);

    // Boot main body / foot
    const bootBody = m(box(0.08 * sc, 0.05 * sc, 0.12 * sc), bootM);
    pos(bootBody, 0, -0.04 * sc, 0.01 * sc);
    bootGroup.add(bootBody);

    // Boot toe cap
    const toeCap = m(sph(0.035 * sc, 8, 6), bootM);
    pos(toeCap, 0, -0.035 * sc, 0.065 * sc);
    bootGroup.add(toeCap);

    // Sole (slightly wider, darker)
    const sole = m(box(0.085 * sc, 0.015 * sc, 0.13 * sc), materials.mat(0x1a1008));
    pos(sole, 0, -0.065 * sc, 0.01 * sc);
    bootGroup.add(sole);

    // Heel (raised back section)
    const heel = m(box(0.06 * sc, 0.025 * sc, 0.04 * sc), materials.mat(0x1a1008));
    pos(heel, 0, -0.06 * sc, -0.045 * sc);
    bootGroup.add(heel);

    // Lacing detail (front of shaft)
    for (let i = 0; i < 6; i++) {
      const laceL = m(box(0.003 * sc, 0.003 * sc, 0.015 * sc), materials.mat(0x222222));
      pos(laceL, -0.01 * sc, (-0.01 + i * 0.02) * sc, 0.04 * sc);
      rot(laceL, 0, 0, 0.4);
      bootGroup.add(laceL);

      const laceR = m(box(0.003 * sc, 0.003 * sc, 0.015 * sc), materials.mat(0x222222));
      pos(laceR, 0.01 * sc, (-0.01 + i * 0.02) * sc, 0.04 * sc);
      rot(laceR, 0, 0, -0.4);
      bootGroup.add(laceR);
    }

    // Cross lacing
    for (let i = 0; i < 5; i++) {
      const cross = m(box(0.02 * sc, 0.003 * sc, 0.003 * sc), materials.mat(0x222222));
      pos(cross, 0, (0.0 + i * 0.02) * sc, 0.042 * sc);
      bootGroup.add(cross);
    }

    g.add(bootGroup);
  }

  /* ============================================================== */
  /*  TATTERED CLOTH STRIPS from belt/shoulders                     */
  /* ============================================================== */

  // Belt-hanging strips
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.8;
    const sx = Math.sin(angle) * 0.16 * sc;
    const sz = Math.cos(angle) * 0.16 * sc;
    const strip = buildTatteredStrip(clothM, 0.04 * sc, (0.08 + Math.random() * 0.06) * sc);
    pos(strip, sx, 0.7 * sc, sz);
    rot(strip, 0.1 * (i - 1.5), angle, 0);
    g.add(strip);
  }

  // Shoulder tattered cloth (one shoulder)
  const shoulderRag = buildTatteredStrip(clothDark, 0.08 * sc, 0.12 * sc);
  pos(shoulderRag, -0.2 * sc, 1.02 * sc, -0.05 * sc);
  rot(shoulderRag, 0.3, 0.5, 0.2);
  g.add(shoulderRag);

  const shoulderRag2 = buildTatteredStrip(clothM, 0.06 * sc, 0.1 * sc);
  pos(shoulderRag2, -0.18 * sc, 1.0 * sc, 0.05 * sc);
  rot(shoulderRag2, -0.2, 0.3, -0.1);
  g.add(shoulderRag2);

  /* ============================================================== */
  /*  PELVIS / HIPS bridging torso to legs                          */
  /* ============================================================== */

  const pelvis = m(cyl(0.14 * sc, 0.1 * sc, 0.06 * sc, 14), clothM);
  pos(pelvis, 0, 0.74 * sc, 0);
  g.add(pelvis);

  // Trouser wrappings around upper thighs
  for (const side of [-1, 1]) {
    const trouserTop = m(cyl(0.06 * sc, 0.055 * sc, 0.1 * sc, 10), clothDark);
    pos(trouserTop, side * 0.08 * sc, 0.65 * sc, 0);
    g.add(trouserTop);
  }

  /* ============================================================== */
  /*  GLOW EFFECT (optional)                                        */
  /* ============================================================== */

  if (look.glowColor != null && materials.glowMat) {
    const glowRing = m(tor(0.22 * sc, 0.01 * sc, 8, 24), materials.glowMat);
    pos(glowRing, 0, 0.9 * sc, 0);
    rot(glowRing, Math.PI / 2, 0, 0);
    g.add(glowRing);

    // Glow particles around body
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const particle = m(sph(0.01 * sc, 6, 4), materials.glowMat);
      pos(particle, Math.cos(angle) * 0.25 * sc, (0.8 + i * 0.08) * sc, Math.sin(angle) * 0.25 * sc);
      g.add(particle);
    }
  }

  /* ============================================================== */
  /*  CAPE (optional)                                               */
  /* ============================================================== */

  if (look.hasCape) {
    const capeMat = clothM.clone();
    capeMat.side = THREE.DoubleSide;

    // Cape clasp at neck
    const clasp = m(sph(0.015 * sc, 6, 4), materials.mat(0xc0a030));
    pos(clasp, 0, 1.12 * sc, -0.08 * sc);
    g.add(clasp);

    // Cape body (multiple panels for drape effect)
    for (let i = 0; i < 3; i++) {
      const panelW = (0.2 + i * 0.05) * sc;
      const panelH = (0.5 + i * 0.05) * sc;
      const capePanel = m(plane(panelW, panelH), capeMat);
      pos(capePanel, (i - 1) * 0.02 * sc, 0.85 * sc, (-0.14 - i * 0.01) * sc);
      rot(capePanel, 0.05 + i * 0.02, 0, 0);
      g.add(capePanel);
    }

    // Cape bottom tattered edge
    for (let i = 0; i < 5; i++) {
      const tatter = m(plane(0.06 * sc, 0.08 * sc), capeMat);
      pos(tatter, (i - 2) * 0.06 * sc, 0.55 * sc, -0.16 * sc);
      rot(tatter, 0.1 * (i - 2), 0, 0.05 * (i - 2));
      g.add(tatter);
    }
  }

  /* ============================================================== */
  /*  WEAPON & SHIELD (optional)                                    */
  /* ============================================================== */

  if (look.hasWeapon) {
    materials.addWeapon(g, 0.28 * sc, 0.65 * sc);
  }

  if (look.hasShield) {
    materials.addShield(g, -0.3 * sc, 0.85 * sc);
  }
}

/* ================================================================== */
/*  buildArmoredEnemy – knights, enchanted armor, elite warriors      */
/* ================================================================== */

export function buildArmoredEnemy(
  g: THREE.Group,
  look: EnemyAppearance,
  materials: EnemyMaterials,
): void {
  const sc = look.scale;
  const armorM = materials.armorMat(look.bodyColor);
  const armorDark = materials.armorMat(0x3a3a3a);
  const armorLight = materials.armorMat(0x888888);
  const chainM = materials.mat(0x606060);
  const leatherPad = materials.mat(0x2a1a0a);
  const clothM = materials.mat(look.accentColor);
  const goldTrim = materials.mat(0xc4a832);
  const skinM = materials.skinMat(look.bodyColor);
  const plumeMat = materials.furMat(0xcc2222);

  /* ============================================================== */
  /*  CUIRASS – breastplate, fauld, gorget                          */
  /* ============================================================== */

  // Breastplate (front chest)
  const breastplate = m(cyl(0.2 * sc, 0.22 * sc, 0.18 * sc, 20), armorM);
  pos(breastplate, 0, 1.02 * sc, 0);
  g.add(breastplate);

  // Breastplate medial ridge (center line)
  const medialRidge = m(box(0.01 * sc, 0.16 * sc, 0.025 * sc), armorLight);
  pos(medialRidge, 0, 1.02 * sc, 0.19 * sc);
  g.add(medialRidge);

  // Pectoral contour plates (left and right)
  for (const side of [-1, 1]) {
    const pectPlate = m(sph(0.08 * sc, 12, 10), armorM);
    scl(pectPlate, 1, 0.7, 0.5);
    pos(pectPlate, side * 0.07 * sc, 1.06 * sc, 0.14 * sc);
    g.add(pectPlate);
  }

  // Ornamental engravings on breastplate (thin raised lines)
  // Central crest engraving
  const engravingV1 = m(box(0.003 * sc, 0.1 * sc, 0.005 * sc), goldTrim);
  pos(engravingV1, 0.04 * sc, 1.02 * sc, 0.2 * sc);
  rot(engravingV1, 0, 0, 0.15);
  g.add(engravingV1);
  const engravingV2 = m(box(0.003 * sc, 0.1 * sc, 0.005 * sc), goldTrim);
  pos(engravingV2, -0.04 * sc, 1.02 * sc, 0.2 * sc);
  rot(engravingV2, 0, 0, -0.15);
  g.add(engravingV2);

  // Horizontal engraving lines
  for (let i = 0; i < 3; i++) {
    const engH = m(box(0.12 * sc, 0.003 * sc, 0.005 * sc), goldTrim);
    pos(engH, 0, (0.96 + i * 0.04) * sc, 0.2 * sc);
    g.add(engH);
  }

  // Decorative diamond shapes
  for (const side of [-1, 1]) {
    const diamond = m(box(0.015 * sc, 0.015 * sc, 0.005 * sc), goldTrim);
    pos(diamond, side * 0.06 * sc, 1.02 * sc, 0.2 * sc);
    rot(diamond, 0, 0, Math.PI / 4);
    g.add(diamond);
  }

  // Backplate
  const backplate = m(cyl(0.19 * sc, 0.21 * sc, 0.16 * sc, 16), armorM);
  pos(backplate, 0, 1.01 * sc, -0.02 * sc);
  g.add(backplate);

  // Gorget (neck guard with flared rim)
  const gorget = m(cyl(0.1 * sc, 0.15 * sc, 0.06 * sc, 16), armorM);
  pos(gorget, 0, 1.14 * sc, 0);
  g.add(gorget);

  // Gorget flared rim
  const gorgetRim = m(tor(0.11 * sc, 0.008 * sc, 10, 20), armorLight);
  pos(gorgetRim, 0, 1.17 * sc, 0);
  rot(gorgetRim, Math.PI / 2, 0, 0);
  g.add(gorgetRim);

  // Gorget lower rim
  const gorgetLowerRim = m(tor(0.14 * sc, 0.006 * sc, 10, 20), armorLight);
  pos(gorgetLowerRim, 0, 1.11 * sc, 0);
  rot(gorgetLowerRim, Math.PI / 2, 0, 0);
  g.add(gorgetLowerRim);

  /* ============================================================== */
  /*  FAULD – overlapping waist plates                              */
  /* ============================================================== */

  for (let i = 0; i < 5; i++) {
    const fauldW = (0.2 - i * 0.005) * sc;
    const fauld = m(cyl(fauldW, fauldW + 0.01 * sc, 0.03 * sc, 16), armorM);
    pos(fauld, 0, (0.9 - i * 0.028) * sc, 0);
    g.add(fauld);

    // Trim on each fauld plate
    const fTrim = m(tor(fauldW + 0.005 * sc, 0.003 * sc, 8, 20), armorLight);
    pos(fTrim, 0, (0.886 - i * 0.028) * sc, 0);
    rot(fTrim, Math.PI / 2, 0, 0);
    g.add(fTrim);
  }

  // Rivets on fauld edges
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 4; j++) {
      const angle = (j / 4) * Math.PI * 2;
      const rr = 0.19 * sc;
      const rivet = m(sph(0.005 * sc, 4, 4), armorLight);
      pos(rivet, Math.sin(angle) * rr, (0.9 - i * 0.028) * sc, Math.cos(angle) * rr);
      g.add(rivet);
    }
  }

  /* ============================================================== */
  /*  CHAINMAIL layer visible between plates                        */
  /* ============================================================== */

  // Chainmail at waist/gap between cuirass and fauld
  const chainSkirt = m(cyl(0.18 * sc, 0.16 * sc, 0.08 * sc, 16), chainM);
  pos(chainSkirt, 0, 0.76 * sc, 0);
  g.add(chainSkirt);

  // Chainmail ring detail (tiny torus meshes in pattern)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 12; col++) {
      const angle = (col / 12) * Math.PI * 2;
      const radius = 0.17 * sc;
      const ring = m(tor(0.006 * sc, 0.002 * sc, 4, 8), chainM);
      pos(
        ring,
        Math.sin(angle) * radius,
        (0.74 + row * 0.025) * sc,
        Math.cos(angle) * radius,
      );
      rot(ring, Math.PI / 2, angle, 0);
      g.add(ring);
    }
  }

  // Chainmail hanging below cuirass (skirt rings)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 16; col++) {
      const angle = (col / 16) * Math.PI * 2;
      const radius = (0.16 - row * 0.008) * sc;
      const ring = m(tor(0.005 * sc, 0.0015 * sc, 4, 6), chainM);
      pos(
        ring,
        Math.sin(angle) * radius,
        (0.72 - row * 0.02) * sc,
        Math.cos(angle) * radius,
      );
      rot(ring, Math.PI / 2, angle, 0);
      g.add(ring);
    }
  }

  /* ============================================================== */
  /*  SURCOAT under armor visible at edges                          */
  /* ============================================================== */

  const surcoatMat = clothM.clone();
  surcoatMat.side = THREE.DoubleSide;

  // Surcoat peeking below chainmail
  const surcoatLower = m(cyl(0.155 * sc, 0.14 * sc, 0.06 * sc, 12), surcoatMat);
  pos(surcoatLower, 0, 0.63 * sc, 0);
  g.add(surcoatLower);

  // Surcoat visible at arm openings
  for (const side of [-1, 1]) {
    const surcoatSleeve = m(cyl(0.06 * sc, 0.055 * sc, 0.04 * sc, 10), surcoatMat);
    pos(surcoatSleeve, side * 0.22 * sc, 1.08 * sc, 0);
    g.add(surcoatSleeve);
  }

  /* ============================================================== */
  /*  HERALDIC TABARD over armor                                    */
  /* ============================================================== */

  const tabardMat = clothM.clone();
  tabardMat.side = THREE.DoubleSide;

  // Front tabard panel
  const tabardFront = m(plane(0.22 * sc, 0.4 * sc), tabardMat);
  pos(tabardFront, 0, 0.85 * sc, 0.2 * sc);
  g.add(tabardFront);

  // Back tabard panel
  const tabardBack = m(plane(0.22 * sc, 0.4 * sc), tabardMat);
  pos(tabardBack, 0, 0.85 * sc, -0.2 * sc);
  g.add(tabardBack);

  // Coat of arms shapes on front tabard
  // Shield shape (diamond)
  const coaDiamond = m(box(0.06 * sc, 0.06 * sc, 0.003 * sc), materials.mat(0xffd700));
  pos(coaDiamond, 0, 0.9 * sc, 0.205 * sc);
  rot(coaDiamond, 0, 0, Math.PI / 4);
  g.add(coaDiamond);

  // Cross on coat of arms
  const coaCrossV = m(box(0.015 * sc, 0.05 * sc, 0.004 * sc), materials.mat(0xcc0000));
  pos(coaCrossV, 0, 0.9 * sc, 0.208 * sc);
  g.add(coaCrossV);
  const coaCrossH = m(box(0.05 * sc, 0.015 * sc, 0.004 * sc), materials.mat(0xcc0000));
  pos(coaCrossH, 0, 0.9 * sc, 0.208 * sc);
  g.add(coaCrossH);

  // Small fleur-de-lis dots
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const dot = m(sph(0.006 * sc, 4, 4), materials.mat(0xffd700));
      pos(dot, sx * 0.04 * sc, (0.9 + sy * 0.04) * sc, 0.207 * sc);
      g.add(dot);
    }
  }

  /* ============================================================== */
  /*  PAULDRONS – layered overlapping plates with rivets            */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const pauldronGroup = new THREE.Group();
    pauldronGroup.position.set(side * 0.24 * sc, 1.12 * sc, 0);

    // Main pauldron dome
    const mainPlate = m(sph(0.08 * sc, 14, 10), armorM);
    scl(mainPlate, 1, 0.7, 1);
    pauldronGroup.add(mainPlate);

    // Layer 1 – upper plate
    const layer1 = m(cyl(0.075 * sc, 0.08 * sc, 0.025 * sc, 14), armorM);
    pos(layer1, 0, 0.02 * sc, 0);
    pauldronGroup.add(layer1);

    // Layer 2 – mid plate
    const layer2 = m(cyl(0.08 * sc, 0.085 * sc, 0.02 * sc, 14), armorM);
    pos(layer2, 0, -0.005 * sc, 0);
    pauldronGroup.add(layer2);

    // Layer 3 – lower plate
    const layer3 = m(cyl(0.085 * sc, 0.07 * sc, 0.025 * sc, 14), armorM);
    pos(layer3, 0, -0.03 * sc, 0);
    pauldronGroup.add(layer3);

    // Layer 4 – bottom lip
    const layer4 = m(cyl(0.07 * sc, 0.06 * sc, 0.015 * sc, 14), armorM);
    pos(layer4, 0, -0.05 * sc, 0);
    pauldronGroup.add(layer4);

    // Etched trim on each layer edge (thin torus)
    for (let i = 0; i < 4; i++) {
      const trimR = (0.075 + i * 0.003) * sc;
      const trimY = (0.02 - i * 0.025) * sc;
      const trim = m(tor(trimR, 0.003 * sc, 6, 16), goldTrim);
      pos(trim, 0, trimY, 0);
      rot(trim, Math.PI / 2, 0, 0);
      pauldronGroup.add(trim);
    }

    // Rivets on pauldron (6 around each layer)
    for (let layer = 0; layer < 3; layer++) {
      for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * Math.PI * 2;
        const rr = (0.07 + layer * 0.005) * sc;
        const rivet = m(sph(0.005 * sc, 4, 4), armorLight);
        pos(
          rivet,
          Math.sin(angle) * rr,
          (0.015 - layer * 0.025) * sc,
          Math.cos(angle) * rr,
        );
        pauldronGroup.add(rivet);
      }
    }

    // Leather padding visible under pauldron
    const padding = m(cyl(0.065 * sc, 0.06 * sc, 0.03 * sc, 10), leatherPad);
    pos(padding, 0, -0.06 * sc, 0);
    pauldronGroup.add(padding);

    g.add(pauldronGroup);
  }

  /* ============================================================== */
  /*  ARMS – articulated plate with leather at joints               */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.26 * sc, 1.04 * sc, 0);

    // Upper arm rerebrace (plate)
    const rerebrace = m(cyl(0.055 * sc, 0.05 * sc, 0.12 * sc, 14), armorM);
    pos(rerebrace, 0, -0.08 * sc, 0);
    armGroup.add(rerebrace);

    // Leather at elbow joint
    const elbowLeather = m(cyl(0.04 * sc, 0.04 * sc, 0.04 * sc, 10), leatherPad);
    pos(elbowLeather, 0, -0.16 * sc, 0);
    armGroup.add(elbowLeather);

    // Elbow cop (couter)
    const couter = m(sph(0.04 * sc, 10, 8), armorM);
    scl(couter, 1, 0.6, 1);
    pos(couter, 0, -0.17 * sc, 0);
    armGroup.add(couter);

    // Couter wing (side projection)
    const couterWing = m(box(0.02 * sc, 0.04 * sc, 0.035 * sc), armorM);
    pos(couterWing, side * 0.035 * sc, -0.17 * sc, 0);
    armGroup.add(couterWing);

    // Lower arm vambrace (plate)
    const vambrace = m(cyl(0.048 * sc, 0.038 * sc, 0.12 * sc, 14), armorM);
    pos(vambrace, 0, -0.26 * sc, 0);
    armGroup.add(vambrace);

    // Vambrace medial ridge
    const vambraceRidge = m(box(0.005 * sc, 0.1 * sc, 0.01 * sc), armorLight);
    pos(vambraceRidge, 0, -0.26 * sc, 0.04 * sc);
    armGroup.add(vambraceRidge);

    // Rivets on arm pieces
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const rv1 = m(sph(0.004 * sc, 4, 4), armorLight);
      pos(rv1, Math.sin(angle) * 0.05 * sc, -0.05 * sc, Math.cos(angle) * 0.05 * sc);
      armGroup.add(rv1);

      const rv2 = m(sph(0.004 * sc, 4, 4), armorLight);
      pos(rv2, Math.sin(angle) * 0.045 * sc, -0.23 * sc, Math.cos(angle) * 0.045 * sc);
      armGroup.add(rv2);
    }

    /* ------------------------------------------------------------ */
    /*  GAUNTLETS with articulated finger plates                    */
    /* ------------------------------------------------------------ */

    const gauntletGroup = new THREE.Group();
    gauntletGroup.position.set(0, -0.35 * sc, 0);

    // Gauntlet cuff
    const cuff = m(cyl(0.04 * sc, 0.045 * sc, 0.04 * sc, 12), armorM);
    gauntletGroup.add(cuff);

    // Gauntlet cuff rim
    const cuffRim = m(tor(0.044 * sc, 0.004 * sc, 8, 16), armorLight);
    pos(cuffRim, 0, 0.02 * sc, 0);
    rot(cuffRim, Math.PI / 2, 0, 0);
    gauntletGroup.add(cuffRim);

    // Hand plate
    const handPlate = m(box(0.07 * sc, 0.02 * sc, 0.06 * sc), armorM);
    pos(handPlate, 0, -0.03 * sc, 0);
    gauntletGroup.add(handPlate);

    // Knuckle guard ridge
    const knuckleGuard = m(box(0.07 * sc, 0.012 * sc, 0.015 * sc), armorLight);
    pos(knuckleGuard, 0, -0.02 * sc, 0.03 * sc);
    gauntletGroup.add(knuckleGuard);

    // Articulated finger plates (5 per hand)
    for (let f = 0; f < 5; f++) {
      const fx = (-0.025 + f * 0.0125) * sc;
      const isThumb = f === 0;
      const fz = isThumb ? 0.02 * sc : -0.03 * sc;
      const fingerRot = isThumb ? 0.4 : 0;

      for (let seg = 0; seg < 3; seg++) {
        const plateW = (isThumb ? 0.01 : 0.012 - seg * 0.001) * sc;
        const plateH = (isThumb ? 0.012 : 0.015 - seg * 0.002) * sc;
        const fPlate = m(box(plateW, 0.008 * sc, plateH), armorM);
        const segY = -(0.04 + seg * 0.015) * sc;
        pos(fPlate, isThumb ? fx + side * 0.02 * sc : fx, segY, fz - seg * 0.005 * sc);
        rot(fPlate, fingerRot, 0, 0);
        gauntletGroup.add(fPlate);
      }

      // Knuckle guard per finger
      if (!isThumb) {
        const knuckle = m(sph(0.006 * sc, 4, 4), armorLight);
        pos(knuckle, fx, -0.037 * sc, fz + 0.002 * sc);
        gauntletGroup.add(knuckle);
      }
    }

    // Leather padding between gauntlet plates
    const gPadding = m(box(0.065 * sc, 0.015 * sc, 0.055 * sc), leatherPad);
    pos(gPadding, 0, -0.025 * sc, 0);
    gauntletGroup.add(gPadding);

    armGroup.add(gauntletGroup);
    g.add(armGroup);
  }

  /* ============================================================== */
  /*  NECK                                                          */
  /* ============================================================== */

  const neck = m(cyl(0.06 * sc, 0.065 * sc, 0.06 * sc, 12), leatherPad);
  pos(neck, 0, 1.17 * sc, 0);
  g.add(neck);

  // Chainmail at neck gap
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ring = m(tor(0.005 * sc, 0.002 * sc, 4, 6), chainM);
    pos(ring, Math.sin(angle) * 0.07 * sc, 1.15 * sc, Math.cos(angle) * 0.07 * sc);
    rot(ring, Math.PI / 2, angle, 0);
    g.add(ring);
  }

  /* ============================================================== */
  /*  HELM – with visor, breathing holes, plume/crest               */
  /* ============================================================== */

  if (look.hasHelm !== false) {
    const helmGroup = new THREE.Group();
    helmGroup.position.set(0, 1.32 * sc, 0);

    // Helm skull (main dome)
    const helmSkull = m(sph(0.12 * sc, 20, 16), armorM);
    helmGroup.add(helmSkull);

    // Helm brow ridge
    const browRidge = m(tor(0.1 * sc, 0.01 * sc, 10, 20), armorM);
    pos(browRidge, 0, -0.02 * sc, 0.02 * sc);
    rot(browRidge, Math.PI / 2, 0, 0);
    helmGroup.add(browRidge);

    // Visor (T-shaped opening)
    // Horizontal slit
    const visorSlitH = m(box(0.06 * sc, 0.01 * sc, 0.02 * sc), armorDark);
    pos(visorSlitH, 0, -0.02 * sc, 0.115 * sc);
    helmGroup.add(visorSlitH);
    // Vertical slit (nasal)
    const visorSlitV = m(box(0.01 * sc, 0.04 * sc, 0.02 * sc), armorDark);
    pos(visorSlitV, 0, -0.03 * sc, 0.115 * sc);
    helmGroup.add(visorSlitV);

    // Visor plate
    const visorPlate = m(cyl(0.1 * sc, 0.09 * sc, 0.06 * sc, 16), armorM);
    pos(visorPlate, 0, -0.03 * sc, 0.04 * sc);
    helmGroup.add(visorPlate);

    // Visor hinges
    for (const side of [-1, 1]) {
      const hinge = m(sph(0.008 * sc, 6, 4), armorLight);
      pos(hinge, side * 0.095 * sc, -0.01 * sc, 0.04 * sc);
      helmGroup.add(hinge);
    }

    // Breathing holes (3 on each side)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const hole = m(cyl(0.005 * sc, 0.005 * sc, 0.025 * sc, 6), armorDark);
        pos(hole, side * 0.08 * sc, (-0.03 - i * 0.015) * sc, 0.08 * sc);
        rot(hole, 0, side * 0.4, 0);
        helmGroup.add(hole);
      }
    }

    // Crest / plume holder (ridge on top)
    const crestRidge = m(box(0.01 * sc, 0.03 * sc, 0.12 * sc), armorM);
    pos(crestRidge, 0, 0.11 * sc, 0);
    helmGroup.add(crestRidge);

    // Plume (cluster of elongated cones for feather effect)
    const plumeGroup = new THREE.Group();
    plumeGroup.position.set(0, 0.12 * sc, -0.02 * sc);

    for (let i = 0; i < 8; i++) {
      const feather = m(cone(0.01 * sc, 0.12 * sc, 6), plumeMat);
      pos(feather, (i - 3.5) * 0.005 * sc, 0.06 * sc, -i * 0.012 * sc);
      rot(feather, 0.4 + i * 0.04, 0, (i - 3.5) * 0.03);
      plumeGroup.add(feather);
    }

    // Feather barb details (smaller cones off main feathers)
    for (let i = 0; i < 5; i++) {
      for (const side of [-1, 1]) {
        const barb = m(cone(0.004 * sc, 0.04 * sc, 4), plumeMat);
        pos(barb, side * 0.015 * sc, (0.03 + i * 0.02) * sc, -0.02 - i * 0.015 * sc);
        rot(barb, 0.3, 0, side * 0.5);
        plumeGroup.add(barb);
      }
    }

    helmGroup.add(plumeGroup);

    // Helm chin guard
    const chinGuard = m(cyl(0.08 * sc, 0.07 * sc, 0.03 * sc, 12), armorM);
    pos(chinGuard, 0, -0.08 * sc, 0.02 * sc);
    helmGroup.add(chinGuard);

    // Helm edge trim
    const helmTrim = m(tor(0.11 * sc, 0.005 * sc, 10, 20), goldTrim);
    pos(helmTrim, 0, -0.06 * sc, 0);
    rot(helmTrim, Math.PI / 2, 0, 0);
    helmGroup.add(helmTrim);

    g.add(helmGroup);
  } else {
    // No helm – show face (reuse some head geometry)
    const head = m(sph(0.11 * sc, 20, 16), skinM);
    pos(head, 0, 1.32 * sc, 0);
    g.add(head);

    // Basic eyes
    for (const side of [-1, 1]) {
      const eye = m(sph(0.014 * sc, 10, 8), materials.eyeMat);
      pos(eye, side * 0.04 * sc, 1.34 * sc, 0.095 * sc);
      g.add(eye);
    }
  }

  /* ============================================================== */
  /*  LEGS – greaves with knee cops, shin guards, sabatons          */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.09 * sc, 0.7 * sc, 0);

    // Cuisse (thigh plate)
    const cuisse = m(cyl(0.065 * sc, 0.055 * sc, 0.2 * sc, 14), armorM);
    pos(cuisse, 0, -0.1 * sc, 0);
    legGroup.add(cuisse);

    // Cuisse trim rings
    for (let i = 0; i < 2; i++) {
      const cTrim = m(tor((0.06 - i * 0.005) * sc, 0.004 * sc, 8, 16), armorLight);
      pos(cTrim, 0, (0.0 - i * 0.18) * sc, 0);
      rot(cTrim, Math.PI / 2, 0, 0);
      legGroup.add(cTrim);
    }

    // Leather under cuisse
    const cuisseLeather = m(cyl(0.058 * sc, 0.053 * sc, 0.04 * sc, 10), leatherPad);
    pos(cuisseLeather, 0, -0.22 * sc, 0);
    legGroup.add(cuisseLeather);

    // Knee cop (poleyn)
    const poleyn = m(sph(0.045 * sc, 12, 10), armorM);
    scl(poleyn, 1, 0.6, 1.1);
    pos(poleyn, 0, -0.24 * sc, 0.02 * sc);
    legGroup.add(poleyn);

    // Poleyn wing
    const poleynWing = m(box(0.015 * sc, 0.04 * sc, 0.04 * sc), armorM);
    pos(poleynWing, side * 0.04 * sc, -0.24 * sc, 0.01 * sc);
    legGroup.add(poleynWing);

    // Poleyn rivets
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI + Math.PI / 4;
      const rv = m(sph(0.004 * sc, 4, 4), armorLight);
      pos(rv, Math.sin(angle) * 0.04 * sc, -0.24 * sc, Math.cos(angle) * 0.04 * sc);
      legGroup.add(rv);
    }

    // Greave / shin guard
    const greave = m(cyl(0.05 * sc, 0.04 * sc, 0.18 * sc, 14), armorM);
    pos(greave, 0, -0.37 * sc, 0);
    legGroup.add(greave);

    // Greave medial ridge (shin ridge)
    const greaveRidge = m(box(0.008 * sc, 0.16 * sc, 0.012 * sc), armorLight);
    pos(greaveRidge, 0, -0.37 * sc, 0.045 * sc);
    legGroup.add(greaveRidge);

    // Greave trim
    const greaveTrim = m(tor(0.042 * sc, 0.004 * sc, 8, 16), armorLight);
    pos(greaveTrim, 0, -0.28 * sc, 0);
    rot(greaveTrim, Math.PI / 2, 0, 0);
    legGroup.add(greaveTrim);

    // Leather at ankle gap
    const ankleLeather = m(cyl(0.038 * sc, 0.036 * sc, 0.03 * sc, 10), leatherPad);
    pos(ankleLeather, 0, -0.48 * sc, 0);
    legGroup.add(ankleLeather);

    g.add(legGroup);
  }

  /* ============================================================== */
  /*  SABATONS – articulated foot armor                             */
  /* ============================================================== */

  for (const side of [-1, 1]) {
    const sabatonGroup = new THREE.Group();
    sabatonGroup.position.set(side * 0.09 * sc, 0.18 * sc, 0);

    // Sabaton ankle plate
    const anklePlate = m(cyl(0.04 * sc, 0.045 * sc, 0.04 * sc, 12), armorM);
    pos(anklePlate, 0, 0.02 * sc, 0);
    sabatonGroup.add(anklePlate);

    // Main foot plate
    const footPlate = m(box(0.08 * sc, 0.035 * sc, 0.1 * sc), armorM);
    pos(footPlate, 0, -0.02 * sc, 0.015 * sc);
    sabatonGroup.add(footPlate);

    // Articulated toe plates (3 overlapping)
    for (let i = 0; i < 3; i++) {
      const toePlate = m(box((0.07 - i * 0.01) * sc, 0.012 * sc, 0.025 * sc), armorM);
      pos(toePlate, 0, -0.02 * sc, (0.06 + i * 0.022) * sc);
      sabatonGroup.add(toePlate);

      // Toe plate rivet
      const toeRivet = m(sph(0.003 * sc, 4, 4), armorLight);
      pos(toeRivet, 0.025 * sc, -0.012 * sc, (0.06 + i * 0.022) * sc);
      sabatonGroup.add(toeRivet);
    }

    // Pointed toe tip
    const toeTip = m(cone(0.02 * sc, 0.03 * sc, 8), armorM);
    pos(toeTip, 0, -0.02 * sc, 0.13 * sc);
    rot(toeTip, Math.PI / 2, 0, 0);
    sabatonGroup.add(toeTip);

    // Sole plate
    const solePlate = m(box(0.085 * sc, 0.01 * sc, 0.12 * sc), armorDark);
    pos(solePlate, 0, -0.04 * sc, 0.01 * sc);
    sabatonGroup.add(solePlate);

    // Heel spur
    const heelSpur = m(cone(0.008 * sc, 0.025 * sc, 6), armorLight);
    pos(heelSpur, 0, -0.035 * sc, -0.04 * sc);
    rot(heelSpur, -0.3, 0, 0);
    sabatonGroup.add(heelSpur);

    g.add(sabatonGroup);
  }

  /* ============================================================== */
  /*  ARMORED CODPIECE                                              */
  /* ============================================================== */

  const codpiece = m(sph(0.035 * sc, 8, 6), armorM);
  scl(codpiece, 0.8, 1, 0.6);
  pos(codpiece, 0, 0.65 * sc, 0.1 * sc);
  g.add(codpiece);

  // Codpiece ridge
  const codpieceRidge = m(box(0.005 * sc, 0.03 * sc, 0.01 * sc), armorLight);
  pos(codpieceRidge, 0, 0.66 * sc, 0.12 * sc);
  g.add(codpieceRidge);

  /* ============================================================== */
  /*  SWORD SCABBARD on belt                                        */
  /* ============================================================== */

  // Scabbard body
  const scabbardBody = m(cyl(0.018 * sc, 0.012 * sc, 0.35 * sc, 8), leatherPad);
  pos(scabbardBody, -0.2 * sc, 0.6 * sc, -0.05 * sc);
  rot(scabbardBody, 0, 0, 0.1);
  g.add(scabbardBody);

  // Scabbard tip (cone)
  const scabbardTip = m(cone(0.012 * sc, 0.03 * sc, 6), armorLight);
  pos(scabbardTip, -0.215 * sc, 0.42 * sc, -0.05 * sc);
  rot(scabbardTip, 0, 0, 0.1);
  g.add(scabbardTip);

  // Scabbard throat (top mount)
  const scabbardThroat = m(cyl(0.022 * sc, 0.02 * sc, 0.03 * sc, 8), armorLight);
  pos(scabbardThroat, -0.185 * sc, 0.78 * sc, -0.05 * sc);
  rot(scabbardThroat, 0, 0, 0.1);
  g.add(scabbardThroat);

  // Scabbard belt loops
  for (let i = 0; i < 2; i++) {
    const loop = m(tor(0.012 * sc, 0.004 * sc, 6, 8), leatherPad);
    pos(loop, -0.19 * sc, (0.74 - i * 0.08) * sc, -0.05 * sc);
    rot(loop, 0, 0, 0.1);
    g.add(loop);
  }

  /* ============================================================== */
  /*  BELT                                                          */
  /* ============================================================== */

  const belt = m(cyl(0.19 * sc, 0.19 * sc, 0.03 * sc, 16), leatherPad);
  pos(belt, 0, 0.77 * sc, 0);
  g.add(belt);

  // Belt buckle
  const buckle = m(box(0.035 * sc, 0.035 * sc, 0.015 * sc), goldTrim);
  pos(buckle, 0, 0.77 * sc, 0.19 * sc);
  g.add(buckle);

  // Belt rivets
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const rv = m(sph(0.004 * sc, 4, 4), armorLight);
    pos(rv, Math.sin(angle) * 0.195 * sc, 0.77 * sc, Math.cos(angle) * 0.195 * sc);
    g.add(rv);
  }

  /* ============================================================== */
  /*  GLOW EFFECT (optional – for enchanted armor)                  */
  /* ============================================================== */

  if (look.glowColor != null && materials.glowMat) {
    // Glowing rune lines on armor
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const glowLine = m(box(0.003 * sc, 0.12 * sc, 0.003 * sc), materials.glowMat);
      pos(glowLine, Math.sin(angle) * 0.2 * sc, 1.0 * sc, Math.cos(angle) * 0.2 * sc);
      g.add(glowLine);
    }

    // Glow at joints
    for (const side of [-1, 1]) {
      const shoulderGlow = m(tor(0.06 * sc, 0.005 * sc, 6, 12), materials.glowMat);
      pos(shoulderGlow, side * 0.24 * sc, 1.1 * sc, 0);
      rot(shoulderGlow, Math.PI / 2, 0, 0);
      g.add(shoulderGlow);
    }

    // Eye glow inside helm visor
    for (const side of [-1, 1]) {
      const eyeGlow = m(sph(0.012 * sc, 6, 4), materials.glowMat);
      pos(eyeGlow, side * 0.025 * sc, 1.31 * sc, 0.11 * sc);
      g.add(eyeGlow);
    }
  }

  /* ============================================================== */
  /*  CAPE (optional)                                               */
  /* ============================================================== */

  if (look.hasCape) {
    const capeMat = clothM.clone();
    capeMat.side = THREE.DoubleSide;

    // Cape clasps (both sides of gorget)
    for (const side of [-1, 1]) {
      const clasp = m(sph(0.012 * sc, 6, 4), goldTrim);
      pos(clasp, side * 0.1 * sc, 1.14 * sc, -0.05 * sc);
      g.add(clasp);
    }

    // Cape chain between clasps
    for (let i = 0; i < 6; i++) {
      const chainLink = m(tor(0.006 * sc, 0.002 * sc, 4, 6), goldTrim);
      pos(chainLink, (-0.06 + i * 0.02) * sc, 1.13 * sc, -0.06 * sc);
      rot(chainLink, 0, Math.PI / 2, 0);
      g.add(chainLink);
    }

    // Cape body (3 layered panels for volume)
    for (let i = 0; i < 3; i++) {
      const capeW = (0.3 + i * 0.03) * sc;
      const capeH = (0.55 + i * 0.05) * sc;
      const capePanel = m(plane(capeW, capeH), capeMat);
      pos(capePanel, 0, 0.85 * sc, (-0.18 - i * 0.015) * sc);
      rot(capePanel, 0.03 + i * 0.02, 0, 0);
      g.add(capePanel);
    }

    // Cape bottom edge (heraldic trim)
    const capeEdge = m(box(0.35 * sc, 0.015 * sc, 0.005 * sc), goldTrim);
    pos(capeEdge, 0, 0.56 * sc, -0.2 * sc);
    g.add(capeEdge);
  }

  /* ============================================================== */
  /*  WEAPON & SHIELD (optional)                                    */
  /* ============================================================== */

  if (look.hasWeapon) {
    materials.addWeapon(g, 0.3 * sc, 0.65 * sc);
  }

  if (look.hasShield) {
    materials.addShield(g, -0.32 * sc, 0.85 * sc);
  }
}
