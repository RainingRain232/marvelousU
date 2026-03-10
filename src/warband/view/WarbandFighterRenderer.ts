// ---------------------------------------------------------------------------
// Warband mode – 3D skeleton-based fighter renderer
// Programmatic meshes: cylinders for limbs, sphere for head, boxes for torso.
// Each fighter has a bone hierarchy that drives mesh transforms.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  type WarbandFighter,
  FighterCombatState,
  CombatDirection,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";
import { isMeleeWeapon, isRangedWeapon } from "../config/WeaponDefs";

// ---- Colors ---------------------------------------------------------------

interface FighterColors {
  skin: number;
  tunic: number;
  pants: number;
  boots: number;
  hair: number;
}

const PLAYER_TEAM_COLORS: FighterColors[] = [
  { skin: 0xe8c4a0, tunic: 0x2244aa, pants: 0x334488, boots: 0x654321, hair: 0x4a3520 },
  { skin: 0xd4a574, tunic: 0x2255bb, pants: 0x335599, boots: 0x553311, hair: 0x222222 },
  { skin: 0xf0d0b0, tunic: 0x3355cc, pants: 0x4466aa, boots: 0x654321, hair: 0x886644 },
  { skin: 0xc49060, tunic: 0x2244aa, pants: 0x334488, boots: 0x443322, hair: 0x111111 },
  { skin: 0xe0b890, tunic: 0x3366dd, pants: 0x4477bb, boots: 0x654321, hair: 0x664422 },
];

const ENEMY_TEAM_COLORS: FighterColors[] = [
  { skin: 0xe8c4a0, tunic: 0xaa2222, pants: 0x883333, boots: 0x654321, hair: 0x4a3520 },
  { skin: 0xd4a574, tunic: 0xbb3322, pants: 0x993333, boots: 0x553311, hair: 0x222222 },
  { skin: 0xf0d0b0, tunic: 0xcc3333, pants: 0xaa4444, boots: 0x654321, hair: 0x886644 },
  { skin: 0xc49060, tunic: 0xaa2222, pants: 0x883333, boots: 0x443322, hair: 0x111111 },
  { skin: 0xe0b890, tunic: 0xdd4433, pants: 0xbb4444, boots: 0x654321, hair: 0x664422 },
];

// ---- Bone constants -------------------------------------------------------

const HEAD_RADIUS = 0.12;
const NECK_LEN = 0.1;
const NECK_RADIUS = 0.045;
const TORSO_WIDTH = 0.28;
const TORSO_HEIGHT = 0.42;
const TORSO_DEPTH = 0.16;
const UPPER_ARM_LEN = 0.26;
const FOREARM_LEN = 0.24;
const HAND_SIZE = 0.05;
const THIGH_LEN = 0.38;
const SHIN_LEN = 0.36;
const FOOT_LEN = 0.18;
const FOOT_HEIGHT = 0.06;
const LIMB_THICKNESS = 0.048;
const JOINT_RADIUS = 0.028;
const SHOULDER_WIDTH = TORSO_WIDTH * 0.56;
const SHOULDER_CAP_RADIUS = 0.055;
const HIP_WIDTH = TORSO_WIDTH * 0.32;
const PELVIS_HEIGHT = 0.1;

// ---- Fighter mesh group ---------------------------------------------------

export class FighterMesh {
  group: THREE.Group;
  fighterId: string;

  // Bone groups (for animation)
  private _root: THREE.Group;
  private _hips: THREE.Group;
  private _spine: THREE.Group;
  private _chest: THREE.Group;
  private _neck: THREE.Group;
  private _headBone: THREE.Group;
  private _leftUpperArm: THREE.Group;
  private _leftForearm: THREE.Group;
  private _leftHand: THREE.Group;
  private _rightUpperArm: THREE.Group;
  private _rightForearm: THREE.Group;
  private _rightHand: THREE.Group;
  private _leftThigh: THREE.Group;
  private _leftShin: THREE.Group;
  private _leftFoot: THREE.Group;
  private _rightThigh: THREE.Group;
  private _rightShin: THREE.Group;
  private _rightFoot: THREE.Group;

  // Weapon mesh attached to right hand
  private _weaponMesh: THREE.Mesh | null = null;
  private _shieldMesh: THREE.Mesh | null = null;

  // Face feature meshes (for helm visibility toggling)
  private _hairMeshes: THREE.Mesh[] = [];
  private _earMeshes: THREE.Mesh[] = [];
  private _faceMeshes: THREE.Mesh[] = []; // eyes, nose, jaw, eyebrows, mouth

  // HP bar
  private _hpBarBg: THREE.Mesh;
  private _hpBarFill: THREE.Mesh;

  // Armor overlays
  private _armorMeshes: THREE.Mesh[] = [];

  // Animation blend: smoothly ramps from 0→1 when entering a new combat pose
  private _poseBlend = 0;
  private _lastCombatState: FighterCombatState = FighterCombatState.IDLE;

  private _colors: FighterColors;

  constructor(fighter: WarbandFighter, index: number) {
    this.fighterId = fighter.id;
    this._colors =
      fighter.team === "player"
        ? PLAYER_TEAM_COLORS[index % PLAYER_TEAM_COLORS.length]
        : ENEMY_TEAM_COLORS[index % ENEMY_TEAM_COLORS.length];

    this.group = new THREE.Group();
    this._root = new THREE.Group();
    this.group.add(this._root);

    const skinMat = new THREE.MeshStandardMaterial({ color: this._colors.skin, roughness: 0.7 });
    const tunicMat = new THREE.MeshStandardMaterial({ color: this._colors.tunic, roughness: 0.8 });

    // Build skeleton hierarchy
    this._hips = this._makeBoneGroup();
    this._root.add(this._hips);
    this._hips.position.y = THIGH_LEN + SHIN_LEN + FOOT_HEIGHT + 0.015; // hip height (includes sole)

    // Pelvis (rounded box connecting to legs)
    const pelvisGeo = new THREE.CylinderGeometry(
      TORSO_WIDTH * 0.45, HIP_WIDTH + 0.04, PELVIS_HEIGHT, 8,
    );
    const pelvisMesh = new THREE.Mesh(pelvisGeo, tunicMat);
    pelvisMesh.position.y = PELVIS_HEIGHT * 0.4;
    pelvisMesh.castShadow = true;
    this._hips.add(pelvisMesh);

    // Spine
    this._spine = this._makeBoneGroup();
    this._spine.position.y = PELVIS_HEIGHT * 0.5;
    this._hips.add(this._spine);

    // Chest
    this._chest = this._makeBoneGroup();
    this._spine.add(this._chest);

    // ---- Torso: box shape (wider at shoulders, narrower at waist) ----
    const torsoGeo = new THREE.BoxGeometry(TORSO_WIDTH, TORSO_HEIGHT, TORSO_DEPTH);
    const torsoMesh = new THREE.Mesh(torsoGeo, tunicMat);
    torsoMesh.position.y = TORSO_HEIGHT / 2;
    torsoMesh.castShadow = true;
    this._chest.add(torsoMesh);

    // Shoulder caps (rounded balls at shoulder joints)
    for (const side of [-1, 1]) {
      const capGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS, 6, 5);
      const cap = new THREE.Mesh(capGeo, tunicMat);
      cap.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT - 0.01, 0);
      cap.castShadow = true;
      this._chest.add(cap);
    }

    // Collar (raised ring around neckline)
    const collarGeo = new THREE.TorusGeometry(NECK_RADIUS * 1.6, 0.018, 4, 8);
    const collar = new THREE.Mesh(collarGeo, tunicMat);
    collar.position.y = TORSO_HEIGHT + 0.01;
    collar.rotation.x = Math.PI / 2;
    collar.castShadow = true;
    this._chest.add(collar);

    // Belt at waist
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
    const beltGeo = new THREE.BoxGeometry(TORSO_WIDTH + 0.02, 0.035, TORSO_DEPTH + 0.02);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.02;
    belt.castShadow = true;
    this._chest.add(belt);

    // Belt buckle
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.3, metalness: 0.7 });
    const buckleGeo = new THREE.BoxGeometry(0.03, 0.025, 0.01);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.02, TORSO_DEPTH / 2 + 0.015);
    this._chest.add(buckle);

    // ---- Neck: visible cylinder connecting torso to head ----
    this._neck = this._makeBoneGroup();
    this._neck.position.y = TORSO_HEIGHT;
    this._chest.add(this._neck);

    const neckGeo = new THREE.CylinderGeometry(NECK_RADIUS, NECK_RADIUS * 1.1, NECK_LEN, 8);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = NECK_LEN / 2;
    neckMesh.castShadow = true;
    this._neck.add(neckMesh);

    // ---- Head: slightly oval, sits on top of neck ----
    this._headBone = this._makeBoneGroup();
    this._headBone.position.y = NECK_LEN;
    this._neck.add(this._headBone);

    // Main head shape (slightly taller than wide for an oval look)
    const headGeo = new THREE.SphereGeometry(HEAD_RADIUS, 10, 8);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = HEAD_RADIUS;
    headMesh.scale.set(1, 1.12, 0.95); // slightly oval: taller, slightly flatter front-back
    headMesh.castShadow = true;
    this._headBone.add(headMesh);

    // Jaw / chin (subtle lower face shape)
    const jawGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.65, 6, 4, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.5);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.position.set(0, HEAD_RADIUS * 0.45, HEAD_RADIUS * 0.15);
    jawMesh.scale.set(0.85, 0.7, 0.7);
    this._headBone.add(jawMesh);
    this._faceMeshes.push(jawMesh);

    // Hair (cap on top)
    const hairMat = new THREE.MeshStandardMaterial({
      color: this._colors.hair,
      roughness: 0.9,
    });
    const hairGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.06, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = HEAD_RADIUS;
    hairMesh.scale.set(1, 1.12, 0.95);
    this._headBone.add(hairMesh);
    this._hairMeshes.push(hairMesh);

    // Hair sides (extend down past ears for a fuller look)
    for (const side of [-1, 1]) {
      const sideHairGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.4, 5, 4);
      const sideHair = new THREE.Mesh(sideHairGeo, hairMat);
      sideHair.position.set(side * HEAD_RADIUS * 0.75, HEAD_RADIUS * 0.65, -HEAD_RADIUS * 0.15);
      sideHair.scale.set(0.5, 1.0, 0.6);
      this._headBone.add(sideHair);
      this._hairMeshes.push(sideHair);
    }

    // Ears (small bumps)
    const earGeo = new THREE.SphereGeometry(0.025, 4, 3);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * HEAD_RADIUS * 0.92, HEAD_RADIUS * 0.95, 0);
      ear.scale.set(0.5, 0.7, 0.6);
      this._headBone.add(ear);
      this._earMeshes.push(ear);
    }

    // Eyes
    const eyeWhiteGeo = new THREE.SphereGeometry(0.018, 5, 4);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    const eyePupilGeo = new THREE.SphereGeometry(0.009, 4, 3);
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(side * 0.038, HEAD_RADIUS * 1.0, HEAD_RADIUS * 0.82);
      this._headBone.add(eyeWhite);
      this._faceMeshes.push(eyeWhite);
      const eyePupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      eyePupil.position.set(side * 0.038, HEAD_RADIUS * 1.0, HEAD_RADIUS * 0.84);
      this._headBone.add(eyePupil);
      this._faceMeshes.push(eyePupil);
    }

    // Eyebrows (small dark ridges above eyes)
    const browMat = new THREE.MeshStandardMaterial({ color: this._colors.hair, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const browGeo = new THREE.BoxGeometry(0.03, 0.006, 0.012);
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(side * 0.038, HEAD_RADIUS * 1.08, HEAD_RADIUS * 0.82);
      brow.rotation.z = side * -0.15; // slight angle
      this._headBone.add(brow);
      this._faceMeshes.push(brow);
    }

    // Nose (small cone)
    const noseGeo = new THREE.ConeGeometry(0.015, 0.03, 4);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0, HEAD_RADIUS * 0.82, HEAD_RADIUS * 0.9);
    noseMesh.rotation.x = Math.PI * 0.6;
    this._headBone.add(noseMesh);
    this._faceMeshes.push(noseMesh);

    // Mouth (thin dark line)
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x994444, roughness: 0.6 });
    const mouthGeo = new THREE.BoxGeometry(0.035, 0.005, 0.008);
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, HEAD_RADIUS * 0.62, HEAD_RADIUS * 0.88);
    this._headBone.add(mouthMesh);
    this._faceMeshes.push(mouthMesh);

    // Upper lip (subtle bump)
    const lipGeo = new THREE.SphereGeometry(0.02, 4, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const lipMesh = new THREE.Mesh(lipGeo, skinMat);
    lipMesh.position.set(0, HEAD_RADIUS * 0.65, HEAD_RADIUS * 0.88);
    lipMesh.scale.set(1, 0.4, 0.5);
    this._headBone.add(lipMesh);
    this._faceMeshes.push(lipMesh);

    // ---- Arms ----
    // Left arm (at +X local so it appears on the LEFT when viewed from behind a Math.PI-rotated player)
    this._leftUpperArm = this._makeBoneGroup();
    this._leftUpperArm.position.set(SHOULDER_WIDTH, TORSO_HEIGHT - 0.02, 0);
    this._chest.add(this._leftUpperArm);
    this._addLimb(this._leftUpperArm, UPPER_ARM_LEN, this._colors.tunic);

    this._leftForearm = this._makeBoneGroup();
    this._leftForearm.position.y = -UPPER_ARM_LEN;
    this._leftUpperArm.add(this._leftForearm);
    this._addJoint(this._leftForearm, this._colors.skin); // elbow joint
    this._addLimb(this._leftForearm, FOREARM_LEN, this._colors.skin);

    this._leftHand = this._makeBoneGroup();
    this._leftHand.position.y = -FOREARM_LEN;
    this._leftForearm.add(this._leftHand);
    this._addJoint(this._leftHand, this._colors.skin); // wrist
    this._addHand(this._leftHand, this._colors.skin);

    // Right arm (at -X local so it appears on the RIGHT when viewed from behind a Math.PI-rotated player)
    this._rightUpperArm = this._makeBoneGroup();
    this._rightUpperArm.position.set(-SHOULDER_WIDTH, TORSO_HEIGHT - 0.02, 0);
    this._chest.add(this._rightUpperArm);
    this._addLimb(this._rightUpperArm, UPPER_ARM_LEN, this._colors.tunic);

    this._rightForearm = this._makeBoneGroup();
    this._rightForearm.position.y = -UPPER_ARM_LEN;
    this._rightUpperArm.add(this._rightForearm);
    this._addJoint(this._rightForearm, this._colors.skin); // elbow joint
    this._addLimb(this._rightForearm, FOREARM_LEN, this._colors.skin);

    this._rightHand = this._makeBoneGroup();
    this._rightHand.position.y = -FOREARM_LEN;
    this._rightForearm.add(this._rightHand);
    this._addJoint(this._rightHand, this._colors.skin); // wrist
    this._addHand(this._rightHand, this._colors.skin);

    // ---- Legs ----
    // Left leg
    this._leftThigh = this._makeBoneGroup();
    this._leftThigh.position.set(-HIP_WIDTH, 0, 0);
    this._hips.add(this._leftThigh);
    this._addJoint(this._leftThigh, this._colors.pants); // hip joint
    this._addLimb(this._leftThigh, THIGH_LEN, this._colors.pants, true);

    this._leftShin = this._makeBoneGroup();
    this._leftShin.position.y = -THIGH_LEN;
    this._leftThigh.add(this._leftShin);
    this._addJoint(this._leftShin, this._colors.pants); // knee joint
    this._addLimb(this._leftShin, SHIN_LEN, this._colors.pants);

    this._leftFoot = this._makeBoneGroup();
    this._leftFoot.position.y = -SHIN_LEN;
    this._leftShin.add(this._leftFoot);
    this._addFoot(this._leftFoot, this._colors.boots);

    // Right leg
    this._rightThigh = this._makeBoneGroup();
    this._rightThigh.position.set(HIP_WIDTH, 0, 0);
    this._hips.add(this._rightThigh);
    this._addJoint(this._rightThigh, this._colors.pants); // hip joint
    this._addLimb(this._rightThigh, THIGH_LEN, this._colors.pants, true);

    this._rightShin = this._makeBoneGroup();
    this._rightShin.position.y = -THIGH_LEN;
    this._rightThigh.add(this._rightShin);
    this._addJoint(this._rightShin, this._colors.pants); // knee joint
    this._addLimb(this._rightShin, SHIN_LEN, this._colors.pants);

    this._rightFoot = this._makeBoneGroup();
    this._rightFoot.position.y = -SHIN_LEN;
    this._rightShin.add(this._rightFoot);
    this._addFoot(this._rightFoot, this._colors.boots);

    // ---- HP bar ----
    const hpW = 0.6;
    const hpH = 0.06;
    const hpBgGeo = new THREE.PlaneGeometry(hpW, hpH);
    const hpBgMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
    });
    this._hpBarBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    this._hpBarBg.position.y = WB.FIGHTER_HEIGHT + 0.3;
    this.group.add(this._hpBarBg);

    const hpFillGeo = new THREE.PlaneGeometry(hpW - 0.02, hpH - 0.02);
    const hpFillMat = new THREE.MeshBasicMaterial({
      color: fighter.team === "player" ? 0x22aa44 : 0xcc2222,
      side: THREE.DoubleSide,
    });
    this._hpBarFill = new THREE.Mesh(hpFillGeo, hpFillMat);
    this._hpBarFill.position.y = WB.FIGHTER_HEIGHT + 0.3;
    this._hpBarFill.position.z = 0.001;
    this.group.add(this._hpBarFill);

    // Build weapon
    this._updateWeaponMesh(fighter);

    // Position
    this.group.position.set(
      fighter.position.x,
      fighter.position.y,
      fighter.position.z,
    );
    this.group.rotation.y = fighter.rotation;
  }

  private _makeBoneGroup(): THREE.Group {
    return new THREE.Group();
  }

  /** Add a smooth joint sphere at a bone connection point */
  private _addJoint(parent: THREE.Group, color: number): void {
    const geo = new THREE.SphereGeometry(JOINT_RADIUS, 6, 5);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    parent.add(mesh);
  }

  /** Add a tapered limb segment (cylinder wider at top, narrower at bottom) */
  private _addLimb(parent: THREE.Group, length: number, color: number, thicker = false): void {
    const topR = thicker ? LIMB_THICKNESS * 1.15 : LIMB_THICKNESS;
    const botR = thicker ? LIMB_THICKNESS * 0.95 : LIMB_THICKNESS * 0.82;
    const geo = new THREE.CylinderGeometry(topR, botR, length, 7);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    parent.add(mesh);
  }

  private _addHand(parent: THREE.Group, color: number): void {
    // Palm (flattened sphere)
    const geo = new THREE.SphereGeometry(HAND_SIZE, 6, 5);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(0.9, 0.6, 1.1); // flattened hand shape
    mesh.position.y = -HAND_SIZE * 0.3;
    mesh.castShadow = true;
    parent.add(mesh);

    // Fingers (tiny cylinder group) with knuckle joints
    const fingerMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      // Knuckle
      const knuckleGeo = new THREE.SphereGeometry(0.009, 3, 3);
      const knuckle = new THREE.Mesh(knuckleGeo, fingerMat);
      knuckle.position.set((i - 1.5) * 0.016, -HAND_SIZE * 0.4, 0.03);
      parent.add(knuckle);

      // Finger segment
      const fingerGeo = new THREE.CylinderGeometry(0.007, 0.005, 0.038, 3);
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.set((i - 1.5) * 0.016, -HAND_SIZE * 0.55, 0.035);
      finger.rotation.x = 0.4;
      parent.add(finger);
    }

    // Thumb (offset to the side)
    const thumbGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.03, 3);
    const thumb = new THREE.Mesh(thumbGeo, fingerMat);
    thumb.position.set(HAND_SIZE * 0.55, -HAND_SIZE * 0.25, 0.025);
    thumb.rotation.x = 0.2;
    thumb.rotation.z = 0.5;
    parent.add(thumb);
  }

  private _addFoot(parent: THREE.Group, color: number): void {
    // Ankle joint
    this._addJoint(parent, color);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

    // Shoe upper (covers the top of the foot)
    const upperGeo = new THREE.BoxGeometry(0.08, FOOT_HEIGHT, FOOT_LEN * 0.85);
    const upper = new THREE.Mesh(upperGeo, mat);
    upper.position.set(0, -FOOT_HEIGHT / 2, FOOT_LEN * 0.15);
    upper.castShadow = true;
    parent.add(upper);

    // Ankle cuff (top of the boot)
    const cuffGeo = new THREE.CylinderGeometry(0.044, 0.042, 0.025, 6);
    const cuff = new THREE.Mesh(cuffGeo, mat);
    cuff.position.set(0, -0.01, 0);
    parent.add(cuff);

    // Sole (slightly wider/longer, darker)
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 });
    const soleGeo = new THREE.BoxGeometry(0.09, 0.025, FOOT_LEN);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -FOOT_HEIGHT, FOOT_LEN * 0.2);
    sole.castShadow = true;
    parent.add(sole);

    // Heel (raised back section)
    const heelGeo = new THREE.BoxGeometry(0.07, 0.03, 0.04);
    const heel = new THREE.Mesh(heelGeo, soleMat);
    heel.position.set(0, -FOOT_HEIGHT - 0.01, -FOOT_LEN * 0.15);
    parent.add(heel);

    // Toe cap (rounded front)
    const toeGeo = new THREE.SphereGeometry(0.038, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const toeMesh = new THREE.Mesh(toeGeo, mat);
    toeMesh.rotation.x = -Math.PI / 2;
    toeMesh.position.set(0, -FOOT_HEIGHT * 0.4, FOOT_LEN * 0.55);
    parent.add(toeMesh);
  }

  /** Update weapon visuals when equipment changes */
  _updateWeaponMesh(fighter: WarbandFighter): void {
    // Remove old weapon
    if (this._weaponMesh) {
      this._rightHand.remove(this._weaponMesh);
      this._weaponMesh.geometry.dispose();
      (this._weaponMesh.material as THREE.Material).dispose();
      this._weaponMesh = null;
    }

    const wpn = fighter.equipment.mainHand;
    if (!wpn) return;

    if (isMeleeWeapon(wpn) || wpn.category === "thrown") {
      // Melee / thrown weapon: cylinder/box for blade + handle
      const bladeLen = wpn.length * 0.65;
      const handleLen = wpn.length * 0.35;

      const weaponGroup = new THREE.Group();

      const handleMat = new THREE.MeshStandardMaterial({
        color: wpn.accentColor ?? 0x654321,
        roughness: 0.7,
      });
      const bladeMat = new THREE.MeshStandardMaterial({
        color: wpn.color,
        roughness: 0.3,
        metalness: 0.7,
      });
      const guardMat = new THREE.MeshStandardMaterial({
        color: 0xaaaa55,
        roughness: 0.4,
        metalness: 0.6,
      });

      // Handle with leather wrap texture
      const handleGeo = new THREE.CylinderGeometry(0.018, 0.022, handleLen, 6);
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.y = handleLen / 2;
      weaponGroup.add(handle);

      // Handle wrap rings (leather grip detail)
      const wrapMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
      const wrapCount = Math.floor(handleLen / 0.04);
      for (let i = 0; i < wrapCount; i++) {
        const wrapGeo = new THREE.TorusGeometry(0.021, 0.003, 3, 6);
        const wrap = new THREE.Mesh(wrapGeo, wrapMat);
        wrap.position.y = 0.03 + i * 0.035;
        wrap.rotation.x = Math.PI / 2;
        weaponGroup.add(wrap);
      }

      // Pommel (weighted end of handle)
      const pommelGeo = new THREE.SphereGeometry(0.022, 5, 4);
      const pommel = new THREE.Mesh(pommelGeo, guardMat);
      pommel.position.y = -0.005;
      pommel.scale.set(1, 0.7, 1);
      weaponGroup.add(pommel);

      // Blade
      if (wpn.category === "polearm") {
        // Long shaft + small head
        const shaftGeo = new THREE.CylinderGeometry(0.016, 0.018, bladeLen * 0.8, 6);
        const shaft = new THREE.Mesh(shaftGeo, handleMat);
        shaft.position.y = handleLen + bladeLen * 0.4;
        weaponGroup.add(shaft);

        // Shaft reinforcement rings
        for (let i = 0; i < 2; i++) {
          const ringGeo = new THREE.TorusGeometry(0.02, 0.004, 3, 6);
          const ring = new THREE.Mesh(ringGeo, bladeMat);
          ring.position.y = handleLen + bladeLen * (0.15 + i * 0.3);
          ring.rotation.x = Math.PI / 2;
          weaponGroup.add(ring);
        }

        if (wpn.id.includes("halberd") || wpn.id.includes("glaive")) {
          // Halberd/glaive: flat axe-like blade + spike
          const axeHeadGeo = new THREE.BoxGeometry(0.07, bladeLen * 0.2, 0.012);
          const axeHead = new THREE.Mesh(axeHeadGeo, bladeMat);
          axeHead.position.set(0.02, handleLen + bladeLen * 0.85, 0);
          axeHead.castShadow = true;
          weaponGroup.add(axeHead);

          const spikeGeo = new THREE.ConeGeometry(0.015, bladeLen * 0.15, 4);
          const spike = new THREE.Mesh(spikeGeo, bladeMat);
          spike.position.y = handleLen + bladeLen * 0.95;
          spike.castShadow = true;
          weaponGroup.add(spike);
        } else {
          // Spear/pike/lance: pointed tip
          const tipGeo = new THREE.ConeGeometry(0.025, bladeLen * 0.2, 4);
          const tip = new THREE.Mesh(tipGeo, bladeMat);
          tip.position.y = handleLen + bladeLen * 0.9;
          tip.castShadow = true;
          weaponGroup.add(tip);

          // Leaf-shaped widening at base of tip
          const leafGeo = new THREE.SphereGeometry(0.028, 4, 3);
          const leaf = new THREE.Mesh(leafGeo, bladeMat);
          leaf.position.y = handleLen + bladeLen * 0.8;
          leaf.scale.set(0.8, 0.4, 0.3);
          weaponGroup.add(leaf);
        }
      } else {
        const isAxe = wpn.id.includes("axe") || wpn.id.includes("bardiche");
        const isMace = wpn.id.includes("mace") || wpn.id.includes("hammer") || wpn.id.includes("morning");

        if (isAxe) {
          // Axe head: curved crescent shape
          const headGeo = new THREE.TorusGeometry(bladeLen * 0.18, 0.015, 3, 6, Math.PI * 0.7);
          const head = new THREE.Mesh(headGeo, bladeMat);
          head.position.set(0.03, handleLen + bladeLen * 0.25, 0);
          head.rotation.z = -Math.PI * 0.15;
          head.castShadow = true;
          weaponGroup.add(head);

          // Axe blade face (filled crescent)
          const faceGeo = new THREE.BoxGeometry(0.06, bladeLen * 0.25, 0.015);
          const face = new THREE.Mesh(faceGeo, bladeMat);
          face.position.set(0.04, handleLen + bladeLen * 0.25, 0);
          face.castShadow = true;
          weaponGroup.add(face);

          // Short shaft extension above handle
          const extGeo = new THREE.CylinderGeometry(0.016, 0.018, bladeLen * 0.4, 5);
          const ext = new THREE.Mesh(extGeo, handleMat);
          ext.position.y = handleLen + bladeLen * 0.2;
          weaponGroup.add(ext);
        } else if (isMace) {
          // Mace shaft
          const shaftGeo = new THREE.CylinderGeometry(0.016, 0.018, bladeLen * 0.6, 5);
          const shaft = new THREE.Mesh(shaftGeo, handleMat);
          shaft.position.y = handleLen + bladeLen * 0.3;
          weaponGroup.add(shaft);

          // Mace head (sphere with flanges)
          const headGeo = new THREE.SphereGeometry(0.04, 6, 5);
          const head = new THREE.Mesh(headGeo, bladeMat);
          head.position.y = handleLen + bladeLen * 0.7;
          head.castShadow = true;
          weaponGroup.add(head);

          // Flanges / spikes
          const flangeCount = wpn.id.includes("morning") ? 6 : 4;
          for (let i = 0; i < flangeCount; i++) {
            const angle = (i / flangeCount) * Math.PI * 2;
            if (wpn.id.includes("morning")) {
              // Morning star spikes
              const spikeGeo = new THREE.ConeGeometry(0.008, 0.03, 4);
              const spike = new THREE.Mesh(spikeGeo, bladeMat);
              spike.position.set(
                Math.cos(angle) * 0.04,
                handleLen + bladeLen * 0.7,
                Math.sin(angle) * 0.04,
              );
              spike.rotation.z = -angle + Math.PI / 2;
              spike.rotation.x = Math.PI / 2;
              weaponGroup.add(spike);
            } else {
              // Mace flanges (flat plates)
              const flangeGeo = new THREE.BoxGeometry(0.06, 0.05, 0.006);
              const flange = new THREE.Mesh(flangeGeo, bladeMat);
              flange.position.set(0, handleLen + bladeLen * 0.7, 0);
              flange.rotation.y = angle;
              weaponGroup.add(flange);
            }
          }
        } else {
          // Sword blade — tapered with fuller groove
          const bladeGeo = new THREE.BoxGeometry(0.035, bladeLen, 0.01);
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.position.y = handleLen + bladeLen / 2;
          blade.castShadow = true;
          weaponGroup.add(blade);

          // Blade tip (tapered point)
          const tipGeo = new THREE.ConeGeometry(0.0175, bladeLen * 0.15, 4);
          const tip = new THREE.Mesh(tipGeo, bladeMat);
          tip.position.y = handleLen + bladeLen + bladeLen * 0.05;
          tip.scale.set(1, 1, 0.3);
          weaponGroup.add(tip);

          // Fuller (groove running down the center of the blade)
          const fullerMat = new THREE.MeshStandardMaterial({
            color: wpn.color,
            roughness: 0.15,
            metalness: 0.9,
          });
          const fullerGeo = new THREE.BoxGeometry(0.008, bladeLen * 0.7, 0.012);
          const fuller = new THREE.Mesh(fullerGeo, fullerMat);
          fuller.position.set(0, handleLen + bladeLen * 0.4, 0);
          weaponGroup.add(fuller);

          // Blade edge highlights (thin strips along cutting edges)
          const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.1,
            metalness: 0.9,
          });
          for (const side of [-1, 1]) {
            const edgeGeo = new THREE.BoxGeometry(0.002, bladeLen * 0.9, 0.008);
            const edge = new THREE.Mesh(edgeGeo, edgeMat);
            edge.position.set(side * 0.018, handleLen + bladeLen * 0.45, 0);
            weaponGroup.add(edge);
          }
        }
      }

      // Cross guard for swords
      if (wpn.id.includes("sword") || wpn.id.includes("falchion")) {
        // Main guard bar
        const guardGeo = new THREE.BoxGeometry(0.11, 0.015, 0.025);
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = handleLen;
        weaponGroup.add(guard);

        // Guard tips (rounded ends)
        for (const side of [-1, 1]) {
          const tipGeo = new THREE.SphereGeometry(0.01, 4, 3);
          const tip = new THREE.Mesh(tipGeo, guardMat);
          tip.position.set(side * 0.055, handleLen, 0);
          weaponGroup.add(tip);
        }

        // Ricasso (thickened base of blade near guard)
        const ricassoGeo = new THREE.BoxGeometry(0.04, 0.03, 0.012);
        const ricasso = new THREE.Mesh(ricassoGeo, bladeMat);
        ricasso.position.y = handleLen + 0.02;
        weaponGroup.add(ricasso);
      }

      // Flip weapon so blade extends forward (away from elbow) when arm is raised
      weaponGroup.rotation.x = Math.PI;
      weaponGroup.position.y = 0.05; // offset grip into hand

      // Use the group as a single mesh wrapper
      const dummyGeo = new THREE.BufferGeometry();
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      this._weaponMesh = new THREE.Mesh(dummyGeo, dummyMat);
      this._weaponMesh.add(weaponGroup);
      this._rightHand.add(this._weaponMesh);
    } else if (isRangedWeapon(wpn)) {
      // Bow: curved shape with limb taper
      const bowGeo = new THREE.TorusGeometry(wpn.length * 0.4, 0.015, 5, 10, Math.PI);
      const bowMat = new THREE.MeshStandardMaterial({
        color: wpn.color,
        roughness: 0.7,
      });
      this._weaponMesh = new THREE.Mesh(bowGeo, bowMat);
      this._weaponMesh.rotation.z = Math.PI / 2;
      this._weaponMesh.position.y = 0.1;
      this._weaponMesh.castShadow = true;
      this._rightHand.add(this._weaponMesh);

      // Bow grip (thicker middle section)
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
      const gripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 5);
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.position.set(wpn.length * 0.4, 0, 0);
      grip.rotation.z = Math.PI / 2;
      this._weaponMesh.add(grip);

      // Bow string
      const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, wpn.length * 0.7, 2);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0xddddcc });
      const string = new THREE.Mesh(stringGeo, stringMat);
      string.position.y = 0.1;
      this._weaponMesh.add(string);

      // Bow nocks (string attachment points at tips)
      for (const side of [-1, 1]) {
        const nockGeo = new THREE.SphereGeometry(0.008, 3, 3);
        const nock = new THREE.Mesh(nockGeo, bowMat);
        nock.position.set(0, side * wpn.length * 0.35 + 0.1, 0);
        this._weaponMesh.add(nock);
      }

      // Arrow (if crossbow, show bolt)
      const isCrossbow = wpn.category === "crossbow";
      const arrowLen = isCrossbow ? 0.2 : 0.35;
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
      const arrowGeo = new THREE.CylinderGeometry(0.004, 0.004, arrowLen, 3);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(wpn.length * 0.4 + 0.01, 0.1, 0);
      arrow.rotation.z = Math.PI / 2;
      this._weaponMesh.add(arrow);

      // Arrowhead
      const headMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
      const headGeo = new THREE.ConeGeometry(0.008, 0.025, 4);
      const arrowHead = new THREE.Mesh(headGeo, headMat);
      arrowHead.position.set(wpn.length * 0.4 + arrowLen * 0.5 + 0.02, 0.1, 0);
      arrowHead.rotation.z = -Math.PI / 2;
      this._weaponMesh.add(arrowHead);
    }

    // Shield on left hand
    if (this._shieldMesh) {
      this._shieldMesh.parent?.remove(this._shieldMesh);
      this._shieldMesh.geometry.dispose();
      (this._shieldMesh.material as THREE.Material).dispose();
      this._shieldMesh = null;
    }

    const shield = fighter.equipment.offHand;
    if (shield && shield.category === "shield") {
      // Scale down shield radius so large shields don't look oversized
      const shieldRadius = Math.min(shield.length * 0.55, 0.35);
      const shieldGeo = new THREE.CircleGeometry(shieldRadius, 8);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: shield.color,
        roughness: 0.6,
        metalness: 0.3,
        side: THREE.DoubleSide,
      });
      this._shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      this._shieldMesh.position.set(0.05, -0.05, 0.2);
      this._shieldMesh.castShadow = true;
      this._leftForearm.add(this._shieldMesh);

      // Shield rim (metal edge)
      const rimMat = new THREE.MeshStandardMaterial({
        color: shield.accentColor ?? 0x888888,
        roughness: 0.35,
        metalness: 0.6,
      });
      const rimGeo = new THREE.TorusGeometry(shieldRadius, 0.012, 4, 16);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.z = 0.005;
      this._shieldMesh.add(rim);

      // Shield boss (center dome)
      const bossGeo = new THREE.SphereGeometry(shieldRadius * 0.22, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const bossMat = new THREE.MeshStandardMaterial({
        color: shield.accentColor ?? 0x999999,
        roughness: 0.3,
        metalness: 0.7,
      });
      const boss = new THREE.Mesh(bossGeo, bossMat);
      boss.position.z = 0.02;
      this._shieldMesh.add(boss);

      // Shield cross / reinforcing strips (two crossing bars)
      const stripMat = new THREE.MeshStandardMaterial({
        color: shield.accentColor ?? 0x888888,
        roughness: 0.4,
        metalness: 0.5,
      });
      const hStripGeo = new THREE.BoxGeometry(shieldRadius * 1.6, 0.02, 0.008);
      const hStrip = new THREE.Mesh(hStripGeo, stripMat);
      hStrip.position.z = 0.012;
      this._shieldMesh.add(hStrip);
      const vStripGeo = new THREE.BoxGeometry(0.02, shieldRadius * 1.6, 0.008);
      const vStrip = new THREE.Mesh(vStripGeo, stripMat);
      vStrip.position.z = 0.012;
      this._shieldMesh.add(vStrip);

      // Shield back handle (visible from behind)
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
      const shieldHandleGeo = new THREE.BoxGeometry(0.02, shieldRadius * 0.6, 0.02);
      const shieldHandle = new THREE.Mesh(shieldHandleGeo, handleMat);
      shieldHandle.position.z = -0.015;
      this._shieldMesh.add(shieldHandle);
    }
  }

  /** Update armor overlay meshes */
  updateArmorVisuals(fighter: WarbandFighter): void {
    // Clean old armor meshes
    for (const m of this._armorMeshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this._armorMeshes = [];

    const armor = fighter.equipment.armor;

    // Toggle face/hair visibility based on helm coverage
    const helmDef = armor.head?.defense ?? 0;
    // Hair: hidden by any helm (covered by dome)
    for (const m of this._hairMeshes) m.visible = helmDef === 0;
    // Ears: hidden by helms with cheek guards (defense >= 14)
    for (const m of this._earMeshes) m.visible = helmDef < 14;
    // Face features: hidden by full helms (defense >= 22)
    for (const m of this._faceMeshes) m.visible = helmDef < 22;

    // Head armor (helm covers top and back, leaves face open)
    if (armor.head) {
      const helmMat = new THREE.MeshStandardMaterial({
        color: armor.head.color,
        roughness: 0.4,
        metalness: 0.6,
      });

      // Main helm dome (top of head) — open at the front face (+Z = phi π/2)
      // Gap centered at phi=π/2: phiStart after gap, phiLength covers back and sides
      const helmGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.18, 10, 8, Math.PI * 0.7, Math.PI * 1.6, 0, Math.PI * 0.6);
      const helm = new THREE.Mesh(helmGeo, helmMat);
      helm.position.y = HEAD_RADIUS;
      helm.scale.set(1, 1.12, 0.95);
      helm.castShadow = true;
      this._headBone.add(helm);
      this._armorMeshes.push(helm);

      // Helm brow band (reinforcing strip around the forehead, connecting the dome edges)
      const browBandGeo = new THREE.TorusGeometry(HEAD_RADIUS * 1.12, 0.012, 4, 12, Math.PI * 1.6);
      const browBand = new THREE.Mesh(browBandGeo, helmMat);
      browBand.position.y = HEAD_RADIUS * 0.95;
      browBand.rotation.x = Math.PI / 2;
      browBand.rotation.z = Math.PI * 0.7;
      browBand.scale.set(1, 0.95, 0.5);
      this._headBone.add(browBand);
      this._armorMeshes.push(browBand);

      // Neck guard (extends down the back of the head/neck) — covers back and sides
      const neckGuardGeo = new THREE.CylinderGeometry(HEAD_RADIUS * 1.1, HEAD_RADIUS * 1.25, HEAD_RADIUS * 0.7, 10, 1, true, Math.PI * 0.4, Math.PI * 1.2);
      const neckGuard = new THREE.Mesh(neckGuardGeo, helmMat);
      neckGuard.position.set(0, HEAD_RADIUS * 0.45, -HEAD_RADIUS * 0.1);
      neckGuard.castShadow = true;
      this._headBone.add(neckGuard);
      this._armorMeshes.push(neckGuard);

      // Cheek guards (side plates that frame the face) — for defense >= 10
      if (helmDef >= 10) {
        for (const side of [-1, 1]) {
          const cheekGeo = new THREE.BoxGeometry(0.02, HEAD_RADIUS * 0.7, HEAD_RADIUS * 0.55);
          const cheek = new THREE.Mesh(cheekGeo, helmMat);
          cheek.position.set(side * HEAD_RADIUS * 1.05, HEAD_RADIUS * 0.65, HEAD_RADIUS * 0.15);
          this._headBone.add(cheek);
          this._armorMeshes.push(cheek);
        }

        // Aventail (chain mail curtain hanging from helm, protecting neck sides)
        const aventailMat = new THREE.MeshStandardMaterial({
          color: 0x999999, roughness: 0.7, metalness: 0.4,
        });
        const aventailGeo = new THREE.CylinderGeometry(
          HEAD_RADIUS * 1.05, HEAD_RADIUS * 1.25, HEAD_RADIUS * 0.5,
          10, 1, true, Math.PI * 0.3, Math.PI * 1.4,
        );
        const aventail = new THREE.Mesh(aventailGeo, aventailMat);
        aventail.position.set(0, HEAD_RADIUS * 0.25, 0);
        this._headBone.add(aventail);
        this._armorMeshes.push(aventail);
      }

      // Nose guard for nasal helms and above
      if (helmDef >= 14) {
        const noseGuardGeo = new THREE.BoxGeometry(0.018, 0.09, 0.02);
        const noseGuard = new THREE.Mesh(noseGuardGeo, helmMat);
        noseGuard.position.set(0, HEAD_RADIUS * 0.85, HEAD_RADIUS * 0.92);
        this._headBone.add(noseGuard);
        this._armorMeshes.push(noseGuard);

        // Helm crest / ridge along the top
        const crestGeo = new THREE.BoxGeometry(0.015, 0.02, HEAD_RADIUS * 1.4);
        const crest = new THREE.Mesh(crestGeo, helmMat);
        crest.position.set(0, HEAD_RADIUS * 1.32, -HEAD_RADIUS * 0.15);
        this._headBone.add(crest);
        this._armorMeshes.push(crest);
      }

      // Face plate for bascinet (defense >= 18): visor with eye slits
      // phi centered at π/2 (+Z = face direction)
      if (helmDef >= 18 && helmDef < 22) {
        const visorGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.15, 8, 6, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.35);
        const visor = new THREE.Mesh(visorGeo, helmMat);
        visor.position.y = HEAD_RADIUS;
        visor.scale.set(1, 1.12, 1.0);
        visor.castShadow = true;
        this._headBone.add(visor);
        this._armorMeshes.push(visor);

        // Eye slit (dark strip across visor)
        const slitMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const slitGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.4, 0.012, 0.005);
        const slit = new THREE.Mesh(slitGeo, slitMat);
        slit.position.set(0, HEAD_RADIUS * 1.0, HEAD_RADIUS * 1.1);
        this._headBone.add(slit);
        this._armorMeshes.push(slit);

        // Visor breathing holes
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (let i = 0; i < 4; i++) {
          const holeGeo = new THREE.CircleGeometry(0.004, 4);
          const hole = new THREE.Mesh(holeGeo, holeMat);
          hole.position.set((i - 1.5) * 0.018, HEAD_RADIUS * 0.82, HEAD_RADIUS * 1.08);
          this._headBone.add(hole);
          this._armorMeshes.push(hole);
        }
      }

      // Full face plate for great helm (defense >= 22): fully enclosed
      // phi centered at π/2 (+Z = face direction)
      if (helmDef >= 22) {
        // Full face coverage — front plate centered on face
        const facePlateGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.2, 8, 6, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.15, Math.PI * 0.55);
        const facePlate = new THREE.Mesh(facePlateGeo, helmMat);
        facePlate.position.y = HEAD_RADIUS;
        facePlate.scale.set(1, 1.12, 1.0);
        facePlate.castShadow = true;
        this._headBone.add(facePlate);
        this._armorMeshes.push(facePlate);

        // Widen the main dome for great helm to fully enclose (no side gaps)
        const fullDomeGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.19, 10, 8, Math.PI * 0.55, Math.PI * 1.9, 0, Math.PI * 0.6);
        const fullDome = new THREE.Mesh(fullDomeGeo, helmMat);
        fullDome.position.y = HEAD_RADIUS;
        fullDome.scale.set(1, 1.12, 0.95);
        this._headBone.add(fullDome);
        this._armorMeshes.push(fullDome);

        // Eye slit (horizontal dark strip)
        const slitMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const slitGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.6, 0.015, 0.005);
        const slit = new THREE.Mesh(slitGeo, slitMat);
        slit.position.set(0, HEAD_RADIUS * 1.02, HEAD_RADIUS * 1.15);
        this._headBone.add(slit);
        this._armorMeshes.push(slit);

        // Breathing holes (cross pattern below eye slit)
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 4; col++) {
            const holeGeo = new THREE.CircleGeometry(0.004, 4);
            const hole = new THREE.Mesh(holeGeo, holeMat);
            hole.position.set(
              (col - 1.5) * 0.018,
              HEAD_RADIUS * 0.78 - row * 0.02,
              HEAD_RADIUS * 1.14,
            );
            this._headBone.add(hole);
            this._armorMeshes.push(hole);
          }
        }

        // Great helm flat top plate
        const topGeo = new THREE.CylinderGeometry(HEAD_RADIUS * 0.6, HEAD_RADIUS * 0.8, 0.015, 8);
        const top = new THREE.Mesh(topGeo, helmMat);
        top.position.y = HEAD_RADIUS * 1.35;
        this._headBone.add(top);
        this._armorMeshes.push(top);
      }
    }

    // Torso armor (box, slightly larger than body)
    if (armor.torso) {
      const armorMat = new THREE.MeshStandardMaterial({
        color: armor.torso.color,
        roughness: 0.4,
        metalness: 0.5,
      });

      // Main chest plate
      const armorGeo = new THREE.BoxGeometry(
        TORSO_WIDTH + 0.04,
        TORSO_HEIGHT + 0.02,
        TORSO_DEPTH + 0.04,
      );
      const armorMesh = new THREE.Mesh(armorGeo, armorMat);
      armorMesh.position.y = TORSO_HEIGHT / 2;
      armorMesh.castShadow = true;
      this._chest.add(armorMesh);
      this._armorMeshes.push(armorMesh);

      // Chest plate center ridge (for plate armor defense >= 25)
      if (armor.torso.defense >= 25) {
        const ridgeMat = new THREE.MeshStandardMaterial({
          color: armor.torso.accentColor ?? armor.torso.color,
          roughness: 0.25,
          metalness: 0.7,
        });
        const ridgeGeo = new THREE.BoxGeometry(0.02, TORSO_HEIGHT * 0.7, TORSO_DEPTH + 0.06);
        const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
        ridge.position.set(0, TORSO_HEIGHT * 0.55, 0);
        this._chest.add(ridge);
        this._armorMeshes.push(ridge);
      }

      // Gorget (neck protection) for defense >= 15
      if (armor.torso.defense >= 15) {
        const gorgetGeo = new THREE.CylinderGeometry(NECK_RADIUS * 1.8, TORSO_WIDTH * 0.45, 0.06, 8);
        const gorget = new THREE.Mesh(gorgetGeo, armorMat);
        gorget.position.y = TORSO_HEIGHT + 0.02;
        gorget.castShadow = true;
        this._chest.add(gorget);
        this._armorMeshes.push(gorget);
      }

      // Fauld (armored skirt below waist) for defense >= 10
      if (armor.torso.defense >= 10) {
        const fauldH = 0.08;
        const fauldGeo = new THREE.CylinderGeometry(
          TORSO_WIDTH * 0.48, TORSO_WIDTH * 0.55, fauldH, 8,
        );
        const fauld = new THREE.Mesh(fauldGeo, armorMat);
        fauld.position.y = -fauldH * 0.3;
        fauld.castShadow = true;
        this._chest.add(fauld);
        this._armorMeshes.push(fauld);

        // Fauld lames (overlapping horizontal strips)
        for (let i = 0; i < 3; i++) {
          const lameGeo = new THREE.BoxGeometry(TORSO_WIDTH + 0.02 - i * 0.01, 0.008, TORSO_DEPTH + 0.03);
          const lame = new THREE.Mesh(lameGeo, armorMat);
          lame.position.y = -0.01 - i * 0.025;
          this._chest.add(lame);
          this._armorMeshes.push(lame);
        }
      }

      // Shoulder pauldrons for heavier armor
      if (armor.torso.defense >= 18) {
        for (const side of [-1, 1]) {
          // Main pauldron dome
          const pauldronGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS * 1.5, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.6);
          const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
          pauldron.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT, 0);
          pauldron.castShadow = true;
          this._chest.add(pauldron);
          this._armorMeshes.push(pauldron);

          // Layered pauldron lames (overlapping plates below the dome)
          for (let i = 0; i < 2; i++) {
            const lameGeo = new THREE.BoxGeometry(
              SHOULDER_CAP_RADIUS * 2.2 - i * 0.01,
              0.025,
              SHOULDER_CAP_RADIUS * 2.0,
            );
            const lame = new THREE.Mesh(lameGeo, armorMat);
            lame.position.set(
              side * SHOULDER_WIDTH,
              TORSO_HEIGHT - 0.04 - i * 0.03,
              0,
            );
            this._chest.add(lame);
            this._armorMeshes.push(lame);
          }
        }
      }

      // Armor trim / edge detail (accent color strip along bottom)
      if (armor.torso.accentColor) {
        const trimMat = new THREE.MeshStandardMaterial({
          color: armor.torso.accentColor,
          roughness: 0.3,
          metalness: 0.6,
        });
        const trimGeo = new THREE.BoxGeometry(TORSO_WIDTH + 0.05, 0.015, TORSO_DEPTH + 0.05);
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0.02;
        this._chest.add(trim);
        this._armorMeshes.push(trim);
      }
    }

    // Gauntlets (cover forearm and hand)
    if (armor.gauntlets) {
      const gMat = new THREE.MeshStandardMaterial({
        color: armor.gauntlets.color,
        roughness: 0.4,
        metalness: 0.5,
      });
      for (const [forearm, hand] of [[this._leftForearm, this._leftHand], [this._rightForearm, this._rightHand]]) {
        // Forearm guard (vambrace)
        const fGeo = new THREE.CylinderGeometry(LIMB_THICKNESS + 0.012, LIMB_THICKNESS + 0.008, FOREARM_LEN * 0.7, 6);
        const fMesh = new THREE.Mesh(fGeo, gMat);
        fMesh.position.y = -FOREARM_LEN * 0.35;
        forearm.add(fMesh);
        this._armorMeshes.push(fMesh);

        // Elbow cop (couter) — protection at elbow joint
        const couterGeo = new THREE.SphereGeometry(LIMB_THICKNESS * 1.2, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const couter = new THREE.Mesh(couterGeo, gMat);
        couter.position.set(0, 0.005, -LIMB_THICKNESS * 0.2);
        couter.rotation.x = Math.PI / 2;
        forearm.add(couter);
        this._armorMeshes.push(couter);

        // Wrist flare (widened end of vambrace)
        const wristGeo = new THREE.CylinderGeometry(LIMB_THICKNESS + 0.015, LIMB_THICKNESS + 0.012, 0.02, 6);
        const wrist = new THREE.Mesh(wristGeo, gMat);
        wrist.position.y = -FOREARM_LEN * 0.68;
        forearm.add(wrist);
        this._armorMeshes.push(wrist);

        // Hand cover (gauntlet plate)
        const hGeo = new THREE.SphereGeometry(HAND_SIZE * 1.25, 5, 4);
        const hMesh = new THREE.Mesh(hGeo, gMat);
        hMesh.position.y = -HAND_SIZE * 0.3;
        hMesh.scale.set(1, 0.7, 1.1);
        hMesh.castShadow = true;
        hand.add(hMesh);
        this._armorMeshes.push(hMesh);

        // Finger plates (for heavier gauntlets defense >= 8)
        if (armor.gauntlets.defense >= 8) {
          for (let i = 0; i < 4; i++) {
            const fpGeo = new THREE.BoxGeometry(0.014, 0.008, 0.035);
            const fp = new THREE.Mesh(fpGeo, gMat);
            fp.position.set((i - 1.5) * 0.016, -HAND_SIZE * 0.45, 0.03);
            hand.add(fp);
            this._armorMeshes.push(fp);
          }
        }
      }
    }

    // Leg armor (thigh + shin guards + knee cops)
    if (armor.legs) {
      const lMat = new THREE.MeshStandardMaterial({
        color: armor.legs.color,
        roughness: 0.4,
        metalness: 0.5,
      });
      for (const thigh of [this._leftThigh, this._rightThigh]) {
        const lGeo = new THREE.CylinderGeometry(LIMB_THICKNESS * 1.2 + 0.01, LIMB_THICKNESS + 0.008, THIGH_LEN * 0.85, 7);
        const lMesh = new THREE.Mesh(lGeo, lMat);
        lMesh.position.y = -THIGH_LEN * 0.45;
        thigh.add(lMesh);
        this._armorMeshes.push(lMesh);
      }

      // Knee cops (poleyns) — rounded protectors at the knee joint
      for (const shin of [this._leftShin, this._rightShin]) {
        // Shin guard
        const sGeo = new THREE.CylinderGeometry(LIMB_THICKNESS + 0.008, LIMB_THICKNESS * 0.85 + 0.006, SHIN_LEN * 0.8, 7);
        const sMesh = new THREE.Mesh(sGeo, lMat);
        sMesh.position.y = -SHIN_LEN * 0.4;
        shin.add(sMesh);
        this._armorMeshes.push(sMesh);

        // Knee cop (dome on front of knee)
        const kneeCopGeo = new THREE.SphereGeometry(LIMB_THICKNESS * 1.3, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const kneeCop = new THREE.Mesh(kneeCopGeo, lMat);
        kneeCop.position.set(0, -0.01, LIMB_THICKNESS * 0.3);
        kneeCop.rotation.x = -Math.PI / 2;
        kneeCop.castShadow = true;
        shin.add(kneeCop);
        this._armorMeshes.push(kneeCop);

        // Shin guard ridge (raised center line on front)
        if (armor.legs.defense >= 12) {
          const ridgeGeo = new THREE.BoxGeometry(0.012, SHIN_LEN * 0.6, 0.01);
          const ridge = new THREE.Mesh(ridgeGeo, lMat);
          ridge.position.set(0, -SHIN_LEN * 0.4, LIMB_THICKNESS + 0.01);
          shin.add(ridge);
          this._armorMeshes.push(ridge);
        }
      }
    }

    // Boots (armored footwear overlay)
    if (armor.boots) {
      const bMat = new THREE.MeshStandardMaterial({
        color: armor.boots.color,
        roughness: 0.5,
        metalness: 0.4,
      });
      for (const foot of [this._leftFoot, this._rightFoot]) {
        // Main boot covering
        const bGeo = new THREE.BoxGeometry(0.09, FOOT_HEIGHT + 0.02, FOOT_LEN + 0.03);
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(0, -FOOT_HEIGHT / 2, FOOT_LEN * 0.2);
        bMesh.castShadow = true;
        foot.add(bMesh);
        this._armorMeshes.push(bMesh);

        // Ankle guard (raised ankle protection)
        const ankleGeo = new THREE.CylinderGeometry(0.048, 0.046, 0.04, 6);
        const ankle = new THREE.Mesh(ankleGeo, bMat);
        ankle.position.set(0, 0.01, 0);
        foot.add(ankle);
        this._armorMeshes.push(ankle);

        // Armored toe cap
        const toeCapGeo = new THREE.SphereGeometry(0.042, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const toeCap = new THREE.Mesh(toeCapGeo, bMat);
        toeCap.rotation.x = -Math.PI / 2;
        toeCap.position.set(0, -FOOT_HEIGHT * 0.35, FOOT_LEN * 0.55);
        foot.add(toeCap);
        this._armorMeshes.push(toeCap);

        // Sole plate (hardened sole)
        if (armor.boots.defense >= 8) {
          const soleMat = new THREE.MeshStandardMaterial({
            color: 0x333333, roughness: 0.6, metalness: 0.3,
          });
          const soleGeo = new THREE.BoxGeometry(0.095, 0.015, FOOT_LEN + 0.04);
          const sole = new THREE.Mesh(soleGeo, soleMat);
          sole.position.set(0, -FOOT_HEIGHT - 0.01, FOOT_LEN * 0.2);
          foot.add(sole);
          this._armorMeshes.push(sole);
        }
      }
    }
  }

  /** Main update: animate skeleton based on fighter state */
  update(fighter: WarbandFighter, dt: number, camera: THREE.Camera): void {
    // Position and rotation
    this.group.position.set(
      fighter.position.x,
      fighter.position.y,
      fighter.position.z,
    );
    this.group.rotation.y = fighter.rotation;

    // Track combat state changes to reset blend
    if (fighter.combatState !== this._lastCombatState) {
      this._poseBlend = 0;
      this._lastCombatState = fighter.combatState;
    }
    // Ramp blend toward 1 over ~8 frames (0.125 per tick)
    if (this._poseBlend < 1) {
      this._poseBlend = Math.min(1, this._poseBlend + 0.125);
    }

    // Animate based on state
    switch (fighter.combatState) {
      case FighterCombatState.IDLE:
        this._animateIdle(fighter, dt);
        break;
      case FighterCombatState.WINDING:
        this._animateWindup(fighter);
        break;
      case FighterCombatState.RELEASING:
        this._animateRelease(fighter);
        break;
      case FighterCombatState.RECOVERY:
        this._animateRecovery(fighter);
        break;
      case FighterCombatState.BLOCKING:
        this._animateBlock(fighter);
        break;
      case FighterCombatState.STAGGERED:
        this._animateStagger(fighter);
        break;
      case FighterCombatState.DRAWING:
      case FighterCombatState.AIMING:
        this._animateDrawBow(fighter);
        break;
      case FighterCombatState.DEAD:
        this._animateDead();
        break;
    }

    // Walk cycle (if moving and not dead)
    if (fighter.combatState !== FighterCombatState.DEAD) {
      const speed = Math.sqrt(
        fighter.velocity.x ** 2 + fighter.velocity.z ** 2,
      );
      if (speed > 0.5) {
        this._animateWalkCycle(fighter.walkCycle, speed);
      }
    }

    // HP bar - face camera
    this._hpBarBg.lookAt(camera.position);
    this._hpBarFill.lookAt(camera.position);

    // HP bar scale
    const hpPct = Math.max(0, fighter.hp / fighter.maxHp);
    this._hpBarFill.scale.x = hpPct;
    this._hpBarFill.position.x = -(1 - hpPct) * 0.29;

    // Hide HP for player in first person
    const showHp = !fighter.isPlayer || true; // always show for now
    this._hpBarBg.visible = showHp;
    this._hpBarFill.visible = showHp;

    // Dead fighters fall over
    if (fighter.combatState === FighterCombatState.DEAD) {
      this._hpBarBg.visible = false;
      this._hpBarFill.visible = false;
    }
  }

  // ---- Animation methods --------------------------------------------------

  private _animateIdle(_fighter: WarbandFighter, _dt: number): void {
    // Subtle breathing
    const breathe = Math.sin(Date.now() * 0.003) * 0.01;
    this._chest.position.y = breathe;

    // Arms resting at sides — z-rotations flipped since arms swapped sides
    this._leftUpperArm.rotation.x = 0.05;
    this._leftUpperArm.rotation.z = -0.45;
    this._leftForearm.rotation.x = -0.15;
    this._rightUpperArm.rotation.x = 0.1;
    this._rightUpperArm.rotation.z = 0.25;
    this._rightForearm.rotation.x = -0.3;

    // Shield arm held further out and forward
    if (this._shieldMesh) {
      this._leftUpperArm.rotation.x = -0.3;
      this._leftUpperArm.rotation.z = -0.5;
      this._leftForearm.rotation.x = -0.6;
    }

    // Weapon ready position
    if (this._weaponMesh) {
      this._rightUpperArm.rotation.x = -0.4;
      this._rightUpperArm.rotation.z = 0.3;
      this._rightForearm.rotation.x = -0.8;
    }

    // Legs straight
    this._leftThigh.rotation.x = 0;
    this._leftShin.rotation.x = 0;
    this._rightThigh.rotation.x = 0;
    this._rightShin.rotation.x = 0;

    // Reset spine twist
    this._spine.rotation.y = 0;
    this._spine.rotation.x = 0;
    this._hips.rotation.x = 0;
  }

  private _animateWalkCycle(phase: number, speed: number): void {
    const t = phase * Math.PI * 2;
    const amplitude = Math.min(speed * 0.06, 0.5);

    // Legs swing
    this._leftThigh.rotation.x = Math.sin(t) * amplitude;
    this._leftShin.rotation.x = Math.max(0, -Math.sin(t) * amplitude * 0.8) - 0.1;
    this._rightThigh.rotation.x = -Math.sin(t) * amplitude;
    this._rightShin.rotation.x = Math.max(0, Math.sin(t) * amplitude * 0.8) - 0.1;

    // Arms counter-swing (if not attacking)
    this._leftUpperArm.rotation.x = -Math.sin(t) * amplitude * 0.5 + 0.1;
    if (!this._weaponMesh) {
      this._rightUpperArm.rotation.x = Math.sin(t) * amplitude * 0.5 + 0.1;
    }

    // Body bob
    this._root.position.y = Math.abs(Math.sin(t)) * 0.02;

    // Slight torso twist
    this._spine.rotation.y = Math.sin(t) * amplitude * 0.1;
  }

  private _animateWindup(fighter: WarbandFighter): void {
    const dir = fighter.attackDirection;
    // For AI, stateTimer counts down from WINDUP_TICKS_BASE; for player hold, stateTimer=999
    const rawProgress = fighter.stateTimer > 100 ? 1 : 1 - fighter.stateTimer / WB.WINDUP_TICKS_BASE;
    // Smooth blend-in so arms don't snap instantly to windup pose
    const progress = rawProgress * this._poseBlend;

    // Idle pose values (what the arm looks like at rest with weapon)
    const idleArmX = this._weaponMesh ? -0.4 : 0.1;
    const idleArmZ = this._weaponMesh ? 0.3 : 0.25;
    const idleForearmX = this._weaponMesh ? -0.8 : -0.3;

    // Arm pulled back ready to swing — lerp from idle to target
    switch (dir) {
      case CombatDirection.LEFT_SWING:
        this._spine.rotation.y = 0.5 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-1.2 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (-0.6 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-1.2 - idleForearmX) * progress;
        break;
      case CombatDirection.RIGHT_SWING:
        this._spine.rotation.y = -0.5 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-1.2 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (0.8 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-1.2 - idleForearmX) * progress;
        break;
      case CombatDirection.OVERHEAD:
        this._spine.rotation.x = -0.1 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-2.8 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (0.2 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-0.6 - idleForearmX) * progress;
        break;
      case CombatDirection.STAB:
        this._spine.rotation.y = 0.2 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-0.6 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (0.3 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-2.0 - idleForearmX) * progress;
        break;
    }
  }

  private _animateRelease(fighter: WarbandFighter): void {
    const dir = fighter.attackDirection;
    const progress = 1 - fighter.stateTimer / WB.RELEASE_TICKS_BASE;

    switch (dir) {
      case CombatDirection.LEFT_SWING:
        // Swing from right to left (left swing from attacker's perspective)
        this._spine.rotation.y = 0.5 - 1.2 * progress;
        this._rightUpperArm.rotation.x = -1.2 + 1.8 * progress;
        this._rightUpperArm.rotation.z = -0.6 + 1.6 * progress;
        this._rightForearm.rotation.x = -1.2 + 1.0 * progress;
        break;
      case CombatDirection.RIGHT_SWING:
        // Swing from left to right
        this._spine.rotation.y = -0.5 + 1.2 * progress;
        this._rightUpperArm.rotation.x = -1.2 + 1.8 * progress;
        this._rightUpperArm.rotation.z = 0.8 - 1.6 * progress;
        this._rightForearm.rotation.x = -1.2 + 1.0 * progress;
        break;
      case CombatDirection.OVERHEAD:
        // Chop downward
        this._spine.rotation.x = -0.1 + 0.4 * progress;
        this._rightUpperArm.rotation.x = -2.8 + 3.4 * progress;
        this._rightUpperArm.rotation.z = 0.2;
        this._rightForearm.rotation.x = -0.6 - 0.3 * progress;
        break;
      case CombatDirection.STAB:
        // Thrust forward
        this._spine.rotation.y = 0.2 - 0.2 * progress;
        this._rightUpperArm.rotation.x = -0.6 - 0.8 * progress;
        this._rightUpperArm.rotation.z = 0.3 - 0.3 * progress;
        this._rightForearm.rotation.x = -2.0 + 1.5 * progress;
        break;
    }
  }

  private _animateRecovery(fighter: WarbandFighter): void {
    // Return to idle gradually
    const progress = 1 - fighter.stateTimer / WB.RECOVERY_TICKS_BASE;
    this._spine.rotation.y *= 1 - progress * 0.1;
    this._spine.rotation.x *= 1 - progress * 0.1;
    this._rightUpperArm.rotation.x =
      this._rightUpperArm.rotation.x * (1 - progress * 0.1) + -0.4 * progress * 0.1;
    this._rightForearm.rotation.x =
      this._rightForearm.rotation.x * (1 - progress * 0.1) + -0.8 * progress * 0.1;
  }

  private _animateBlock(fighter: WarbandFighter): void {
    const dir = fighter.blockDirection;
    const b = this._poseBlend; // smooth blend-in

    // Idle reference values (match _animateIdle — z signs flipped for swapped arms)
    const hasShield = !!this._shieldMesh;
    const lArmXIdle = hasShield ? -0.3 : 0.05;
    const lArmZIdle = hasShield ? -0.5 : -0.45;
    const lForeXIdle = hasShield ? -0.6 : -0.15;
    const rArmXIdle = this._weaponMesh ? -0.4 : 0.1;
    const rArmZIdle = this._weaponMesh ? 0.3 : 0.25;
    const rForeXIdle = this._weaponMesh ? -0.8 : -0.3;

    const lerp = (from: number, to: number) => from + (to - from) * b;

    // Raise shield/weapon to block in direction
    switch (dir) {
      case CombatDirection.LEFT_SWING:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -1.3);
        this._leftUpperArm.rotation.z = lerp(lArmZIdle, -0.5);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -0.8);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -1.0);
        this._rightForearm.rotation.x = lerp(rForeXIdle, -1.2);
        break;
      case CombatDirection.RIGHT_SWING:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -1.0);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -1.2);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -1.3);
        this._rightUpperArm.rotation.z = lerp(rArmZIdle, 0.5);
        this._rightForearm.rotation.x = lerp(rForeXIdle, -0.8);
        break;
      case CombatDirection.OVERHEAD:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -2.0);
        this._leftUpperArm.rotation.z = lerp(lArmZIdle, -0.3);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -0.5);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -2.0);
        this._rightUpperArm.rotation.z = lerp(rArmZIdle, 0.3);
        this._rightForearm.rotation.x = lerp(rForeXIdle, -0.5);
        break;
      case CombatDirection.STAB:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -1.2);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -0.8);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -1.2);
        this._rightForearm.rotation.x = lerp(rForeXIdle, -0.8);
        break;
    }
  }

  private _animateStagger(_fighter: WarbandFighter): void {
    // Recoil animation
    this._spine.rotation.x = -0.3;
    this._spine.rotation.y = (Math.random() - 0.5) * 0.2;
    this._headBone.rotation.x = -0.2;
    this._rightUpperArm.rotation.x = 0.5;
    this._leftUpperArm.rotation.x = 0.3;
  }

  private _animateDrawBow(_fighter: WarbandFighter): void {
    // Left arm forward holding bow, right arm pulling string back
    this._leftUpperArm.rotation.x = -1.4;
    this._leftUpperArm.rotation.z = -0.2;
    this._leftForearm.rotation.x = -0.1;
    this._rightUpperArm.rotation.x = -1.4;
    this._rightUpperArm.rotation.z = 0.3;
    this._rightForearm.rotation.x = -2.0;
  }

  private _animateDead(): void {
    // Fallen pose
    this._root.rotation.x = -Math.PI / 2;
    this._root.position.y = 0.15;
    this._leftUpperArm.rotation.x = -0.5;
    this._rightUpperArm.rotation.x = 0.3;
    this._leftThigh.rotation.x = 0.2;
    this._rightThigh.rotation.x = -0.1;
  }

  /** Clean up all Three.js resources */
  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
