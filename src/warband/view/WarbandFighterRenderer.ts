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
const SHOULDER_WIDTH = TORSO_WIDTH * 0.65;
const SHOULDER_CAP_RADIUS = 0.055;
const HIP_WIDTH = TORSO_WIDTH * 0.26;
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
  private _isRangedWeapon = false;
  private _bowStringLine: THREE.Line | null = null;
  private _bowStringRestX = 0; // string X position at rest (torus local)
  private _bowR = 0; // bow radius for string animation
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
      TORSO_WIDTH * 0.45, HIP_WIDTH + LIMB_THICKNESS * 1.4 + 0.01, PELVIS_HEIGHT, 8,
    );
    const pantsMat2 = new THREE.MeshStandardMaterial({ color: this._colors.pants, roughness: 0.8 });
    const pelvisMesh = new THREE.Mesh(pelvisGeo, pantsMat2);
    pelvisMesh.position.y = PELVIS_HEIGHT * 0.4;
    pelvisMesh.castShadow = true;
    this._hips.add(pelvisMesh);

    // Waistband (top of pants)
    const waistbandColor = new THREE.Color(this._colors.pants).multiplyScalar(0.85).getHex();
    const waistbandMat = new THREE.MeshStandardMaterial({ color: waistbandColor, roughness: 0.85 });
    const waistbandGeo = new THREE.CylinderGeometry(
      TORSO_WIDTH * 0.46, TORSO_WIDTH * 0.45, 0.025, 8,
    );
    const waistband = new THREE.Mesh(waistbandGeo, waistbandMat);
    waistband.position.y = PELVIS_HEIGHT * 0.85;
    this._hips.add(waistband);

    // Crotch gusset (triangular reinforcement)
    const gussetGeo = new THREE.ConeGeometry(HIP_WIDTH * 0.6, 0.06, 4);
    const gusset = new THREE.Mesh(gussetGeo, pantsMat2);
    gusset.position.set(0, PELVIS_HEIGHT * 0.05, 0);
    gusset.rotation.x = Math.PI;
    this._hips.add(gusset);

    // Buttocks (two rounded masses bridging pelvis to thighs)
    for (const side of [-1, 1]) {
      const gluteGeo = new THREE.SphereGeometry(LIMB_THICKNESS * 1.5, 6, 5);
      const glute = new THREE.Mesh(gluteGeo, pantsMat2);
      glute.position.set(side * HIP_WIDTH, -PELVIS_HEIGHT * 0.1, -LIMB_THICKNESS * 0.4);
      glute.scale.set(1.0, 0.7, 0.8);
      glute.castShadow = true;
      this._hips.add(glute);
    }

    // Spine
    this._spine = this._makeBoneGroup();
    this._spine.position.y = PELVIS_HEIGHT * 0.5;
    this._hips.add(this._spine);

    // Chest
    this._chest = this._makeBoneGroup();
    this._spine.add(this._chest);

    // ---- Torso: organic shape built from multiple sections ----
    const seamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this._colors.tunic).multiplyScalar(0.75).getHex(),
      roughness: 0.9,
    });

    // Lower torso / waist (narrower, tapers to hips)
    const waistW = TORSO_WIDTH * 0.85;
    const waistD = TORSO_DEPTH * 0.9;
    const waistH = TORSO_HEIGHT * 0.35;
    const waistGeo = new THREE.CylinderGeometry(
      TORSO_WIDTH * 0.48, waistW * 0.46, waistH, 8,
    );
    const waistMesh = new THREE.Mesh(waistGeo, tunicMat);
    waistMesh.position.y = waistH / 2;
    waistMesh.scale.set(1, 1, waistD / waistW);
    waistMesh.castShadow = true;
    this._chest.add(waistMesh);

    // Ribcage / mid-torso (wider, barrel-shaped)
    const ribH = TORSO_HEIGHT * 0.35;
    const ribGeo = new THREE.CylinderGeometry(
      TORSO_WIDTH * 0.52, TORSO_WIDTH * 0.48, ribH, 10,
    );
    const ribMesh = new THREE.Mesh(ribGeo, tunicMat);
    ribMesh.position.y = waistH + ribH / 2;
    ribMesh.scale.set(1, 1, TORSO_DEPTH / TORSO_WIDTH * 1.05);
    ribMesh.castShadow = true;
    this._chest.add(ribMesh);

    // Upper chest / shoulder area (widest, tapers up to neck)
    const chestH = TORSO_HEIGHT * 0.3;
    const chestGeo = new THREE.CylinderGeometry(
      TORSO_WIDTH * 0.4, TORSO_WIDTH * 0.53, chestH, 10,
    );
    const chestMesh = new THREE.Mesh(chestGeo, tunicMat);
    chestMesh.position.y = waistH + ribH + chestH / 2;
    chestMesh.scale.set(1, 1, TORSO_DEPTH / TORSO_WIDTH);
    chestMesh.castShadow = true;
    this._chest.add(chestMesh);

    // Pectoral bulge (front chest muscle definition under tunic)
    for (const side of [-1, 1]) {
      const pecGeo = new THREE.SphereGeometry(TORSO_WIDTH * 0.22, 6, 5);
      const pec = new THREE.Mesh(pecGeo, tunicMat);
      pec.position.set(
        side * TORSO_WIDTH * 0.18,
        TORSO_HEIGHT * 0.72,
        TORSO_DEPTH * 0.32,
      );
      pec.scale.set(1, 0.65, 0.45);
      pec.castShadow = true;
      this._chest.add(pec);
    }

    // Back muscle volume (trapezius / lats, broadens the upper back)
    const backGeo = new THREE.SphereGeometry(TORSO_WIDTH * 0.4, 6, 5);
    const back = new THREE.Mesh(backGeo, tunicMat);
    back.position.set(0, TORSO_HEIGHT * 0.68, -TORSO_DEPTH * 0.25);
    back.scale.set(1.1, 0.7, 0.45);
    back.castShadow = true;
    this._chest.add(back);

    // Collarbone / clavicle area (visible through tunic neckline)
    const clavGeo = new THREE.CylinderGeometry(0.012, 0.01, TORSO_WIDTH * 0.45, 4);
    const clavMat = new THREE.MeshStandardMaterial({ color: this._colors.skin, roughness: 0.7 });
    for (const side of [-1, 1]) {
      const clav = new THREE.Mesh(clavGeo, clavMat);
      clav.position.set(
        side * TORSO_WIDTH * 0.2,
        TORSO_HEIGHT - 0.01,
        TORSO_DEPTH * 0.2,
      );
      clav.rotation.z = Math.PI / 2 + side * 0.25;
      clav.rotation.x = -0.15;
      this._chest.add(clav);
    }

    // Tunic center seam (follows the body curve)
    const centerSeamGeo = new THREE.BoxGeometry(0.005, TORSO_HEIGHT * 0.8, 0.002);
    const centerSeam = new THREE.Mesh(centerSeamGeo, seamMat);
    centerSeam.position.set(0, TORSO_HEIGHT * 0.5, TORSO_DEPTH * 0.48);
    this._chest.add(centerSeam);

    // Tunic hem (bottom edge trim)
    const hemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this._colors.tunic).multiplyScalar(0.85).getHex(),
      roughness: 0.85,
    });
    const hemGeo = new THREE.TorusGeometry(waistW * 0.46, 0.01, 4, 10);
    const hem = new THREE.Mesh(hemGeo, hemMat);
    hem.position.y = 0.01;
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(1, TORSO_DEPTH / TORSO_WIDTH * 0.9, 1);
    this._chest.add(hem);

    // Shoulders (deltoid shape bridging torso to arm)
    for (const side of [-1, 1]) {
      // Main deltoid — tapered cylinder wider at torso, narrowing toward arm
      const deltGeo = new THREE.CylinderGeometry(
        LIMB_THICKNESS * 0.9, // top (arm end) — slightly narrower than arm
        SHOULDER_CAP_RADIUS * 1.6, // bottom (torso end) — wider, wraps torso corner
        UPPER_ARM_LEN * 0.35, 6,
      );
      const delt = new THREE.Mesh(deltGeo, tunicMat);
      // Position at shoulder joint, shifted slightly outward and down
      delt.position.set(
        side * (SHOULDER_WIDTH + 0.01),
        TORSO_HEIGHT - UPPER_ARM_LEN * 0.15,
        0,
      );
      // Tilt outward so it follows the arm angle
      delt.rotation.z = side * -0.25;
      delt.scale.set(1, 1, 0.85); // slightly flattened front-to-back
      delt.castShadow = true;
      this._chest.add(delt);

      // Rear deltoid bump (back of shoulder, rounder)
      const rearDeltGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS * 0.8, 5, 4);
      const rearDelt = new THREE.Mesh(rearDeltGeo, tunicMat);
      rearDelt.position.set(
        side * SHOULDER_WIDTH,
        TORSO_HEIGHT - 0.02,
        -TORSO_DEPTH * 0.18,
      );
      rearDelt.scale.set(1.1, 0.8, 0.7);
      this._chest.add(rearDelt);
    }

    // Collar (raised ring around neckline with V opening at front)
    const collarGeo = new THREE.TorusGeometry(NECK_RADIUS * 1.6, 0.018, 4, 10, Math.PI * 1.6);
    const collar = new THREE.Mesh(collarGeo, tunicMat);
    collar.position.y = TORSO_HEIGHT + 0.01;
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI * 0.2;
    collar.castShadow = true;
    this._chest.add(collar);

    // Collar lapel flaps (V-shape at neckline)
    for (const side of [-1, 1]) {
      const lapelGeo = new THREE.BoxGeometry(0.035, 0.04, 0.006);
      const lapel = new THREE.Mesh(lapelGeo, tunicMat);
      lapel.position.set(side * 0.02, TORSO_HEIGHT - 0.005, TORSO_DEPTH * 0.48);
      lapel.rotation.z = side * 0.3;
      this._chest.add(lapel);
    }

    // Belt at waist (follows cylinder shape)
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
    const beltGeo = new THREE.TorusGeometry(TORSO_WIDTH * 0.48, 0.018, 4, 10);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.03;
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1, TORSO_DEPTH / TORSO_WIDTH * 0.95, 1);
    belt.castShadow = true;
    this._chest.add(belt);

    // Belt buckle
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.3, metalness: 0.7 });
    const buckleGeo = new THREE.BoxGeometry(0.03, 0.025, 0.01);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.03, TORSO_DEPTH * 0.44);
    this._chest.add(buckle);

    // Belt pouch (small bag on one side)
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
    const pouchGeo = new THREE.BoxGeometry(0.04, 0.045, 0.03);
    const pouch = new THREE.Mesh(pouchGeo, pouchMat);
    pouch.position.set(TORSO_WIDTH * 0.32, 0.01, TORSO_DEPTH * 0.38);
    this._chest.add(pouch);
    const flapGeo = new THREE.BoxGeometry(0.042, 0.012, 0.032);
    const flap = new THREE.Mesh(flapGeo, pouchMat);
    flap.position.set(TORSO_WIDTH * 0.32, 0.035, TORSO_DEPTH * 0.38);
    this._chest.add(flap);

    // ---- Neck: visible cylinder connecting torso to head ----
    this._neck = this._makeBoneGroup();
    this._neck.position.y = TORSO_HEIGHT;
    this._chest.add(this._neck);

    const neckGeo = new THREE.CylinderGeometry(NECK_RADIUS, NECK_RADIUS * 1.1, NECK_LEN, 8);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = NECK_LEN / 2;
    neckMesh.castShadow = true;
    this._neck.add(neckMesh);

    // Adam's apple (small bump on front of neck)
    const adamsGeo = new THREE.SphereGeometry(0.012, 4, 3);
    const adams = new THREE.Mesh(adamsGeo, skinMat);
    adams.position.set(0, NECK_LEN * 0.45, NECK_RADIUS * 0.85);
    adams.scale.set(0.7, 1, 0.6);
    this._neck.add(adams);

    // Neck tendons (subtle vertical ridges on sides)
    for (const side of [-1, 1]) {
      const tendonGeo = new THREE.CylinderGeometry(0.005, 0.004, NECK_LEN * 0.7, 3);
      const tendon = new THREE.Mesh(tendonGeo, skinMat);
      tendon.position.set(side * NECK_RADIUS * 0.6, NECK_LEN * 0.5, NECK_RADIUS * 0.4);
      tendon.rotation.z = side * 0.1;
      this._neck.add(tendon);
    }

    // ---- Head: angular skull built from multiple shapes ----
    this._headBone = this._makeBoneGroup();
    this._headBone.position.y = NECK_LEN * 0.8;
    this._neck.add(this._headBone);

    // Cranium (upper skull — wider at temples, slightly flatter front-back)
    const craniumGeo = new THREE.SphereGeometry(HEAD_RADIUS, 10, 8);
    const craniumMesh = new THREE.Mesh(craniumGeo, skinMat);
    craniumMesh.position.y = HEAD_RADIUS * 1.1;
    craniumMesh.scale.set(1, 1.0, 0.88);
    craniumMesh.castShadow = true;
    this._headBone.add(craniumMesh);

    // Temple flats (slightly flatten the sides for a less round profile)
    for (const side of [-1, 1]) {
      const templeGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.35, 5, 4);
      const temple = new THREE.Mesh(templeGeo, skinMat);
      temple.position.set(
        side * HEAD_RADIUS * 0.8,
        HEAD_RADIUS * 1.05,
        HEAD_RADIUS * 0.15,
      );
      temple.scale.set(0.3, 0.8, 0.7);
      this._headBone.add(temple);
    }

    // Face plane (flatter front area from brow to chin — gives angular look)
    const facePlaneGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.0, HEAD_RADIUS * 1.1, HEAD_RADIUS * 0.25);
    const facePlane = new THREE.Mesh(facePlaneGeo, skinMat);
    facePlane.position.set(0, HEAD_RADIUS * 0.75, HEAD_RADIUS * 0.55);
    facePlane.castShadow = true;
    this._headBone.add(facePlane);
    this._faceMeshes.push(facePlane);

    // Jaw bone (angular, wider at back, narrower at chin — V-shape)
    const jawGeo = new THREE.CylinderGeometry(
      HEAD_RADIUS * 0.7, HEAD_RADIUS * 0.35, HEAD_RADIUS * 0.55, 6,
    );
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.position.set(0, HEAD_RADIUS * 0.35, HEAD_RADIUS * 0.2);
    jawMesh.scale.set(1, 1, 0.72);
    this._headBone.add(jawMesh);
    this._faceMeshes.push(jawMesh);

    // Jaw angles (wider mandible corners for a strong jaw)
    for (const side of [-1, 1]) {
      const jawAngleGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.18, 4, 3);
      const jawAngle = new THREE.Mesh(jawAngleGeo, skinMat);
      jawAngle.position.set(
        side * HEAD_RADIUS * 0.6,
        HEAD_RADIUS * 0.5,
        HEAD_RADIUS * 0.05,
      );
      jawAngle.scale.set(0.7, 0.6, 0.6);
      this._headBone.add(jawAngle);
      this._faceMeshes.push(jawAngle);
    }

    // Cheekbones (prominent, angled outward)
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.22, 5, 4);
      const cheek = new THREE.Mesh(cheekGeo, skinMat);
      cheek.position.set(
        side * HEAD_RADIUS * 0.65,
        HEAD_RADIUS * 0.88,
        HEAD_RADIUS * 0.5,
      );
      cheek.scale.set(0.6, 0.45, 0.55);
      this._headBone.add(cheek);
      this._faceMeshes.push(cheek);
    }

    // Brow ridge (prominent overhang, gives shadow over eyes)
    const browRidgeGeo = new THREE.CylinderGeometry(0.01, 0.012, HEAD_RADIUS * 1.2, 6);
    const browRidge = new THREE.Mesh(browRidgeGeo, skinMat);
    browRidge.position.set(0, HEAD_RADIUS * 1.12, HEAD_RADIUS * 0.7);
    browRidge.rotation.z = Math.PI / 2;
    browRidge.scale.set(1, 1, 1.2);
    this._headBone.add(browRidge);
    this._faceMeshes.push(browRidge);

    // Chin (angular, projects forward)
    const chinGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.16, 5, 4);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, HEAD_RADIUS * 0.18, HEAD_RADIUS * 0.55);
    chin.scale.set(0.9, 0.7, 0.7);
    this._headBone.add(chin);
    this._faceMeshes.push(chin);

    // Philtrum (vertical groove between nose and upper lip)
    const philtrumGeo = new THREE.BoxGeometry(0.01, 0.025, 0.004);
    const philtrum = new THREE.Mesh(philtrumGeo, skinMat);
    philtrum.position.set(0, HEAD_RADIUS * 0.7, HEAD_RADIUS * 0.82);
    this._headBone.add(philtrum);
    this._faceMeshes.push(philtrum);

    // Nasolabial folds (creases from nose to mouth corners)
    for (const side of [-1, 1]) {
      const foldGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 3);
      const fold = new THREE.Mesh(foldGeo, skinMat);
      fold.position.set(
        side * 0.022,
        HEAD_RADIUS * 0.68,
        HEAD_RADIUS * 0.82,
      );
      fold.rotation.z = side * 0.2;
      fold.rotation.x = 0.1;
      this._headBone.add(fold);
      this._faceMeshes.push(fold);
    }

    // Back of skull (occipital bone — slight bump)
    const occipitalGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.5, 5, 4);
    const occipital = new THREE.Mesh(occipitalGeo, skinMat);
    occipital.position.set(0, HEAD_RADIUS * 0.85, -HEAD_RADIUS * 0.55);
    occipital.scale.set(1, 0.9, 0.7);
    this._headBone.add(occipital);

    // Hair (full cap on top)
    const hairMat = new THREE.MeshStandardMaterial({
      color: this._colors.hair,
      roughness: 0.9,
    });
    const hairGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.08, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = HEAD_RADIUS;
    hairMesh.scale.set(1, 1.12, 0.95);
    this._headBone.add(hairMesh);
    this._hairMeshes.push(hairMesh);

    // Long hair sides — flowing down past ears to shoulder level
    for (const side of [-1, 1]) {
      // Upper side (around ear)
      const sideUpperGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.45, 5, 4);
      const sideUpper = new THREE.Mesh(sideUpperGeo, hairMat);
      sideUpper.position.set(side * HEAD_RADIUS * 0.78, HEAD_RADIUS * 0.6, -HEAD_RADIUS * 0.1);
      sideUpper.scale.set(0.5, 1.1, 0.65);
      this._headBone.add(sideUpper);
      this._hairMeshes.push(sideUpper);

      // Lower side (flowing down to neck/shoulder)
      const sideLowerGeo = new THREE.CylinderGeometry(HEAD_RADIUS * 0.28, HEAD_RADIUS * 0.2, HEAD_RADIUS * 1.2, 5);
      const sideLower = new THREE.Mesh(sideLowerGeo, hairMat);
      sideLower.position.set(side * HEAD_RADIUS * 0.7, HEAD_RADIUS * -0.1, -HEAD_RADIUS * 0.15);
      sideLower.scale.set(0.5, 1, 0.6);
      this._headBone.add(sideLower);
      this._hairMeshes.push(sideLower);
    }

    // Long hair back — flows down to cover the neck
    const backUpperGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.8, 6, 5);
    const backUpper = new THREE.Mesh(backUpperGeo, hairMat);
    backUpper.position.set(0, HEAD_RADIUS * 0.55, -HEAD_RADIUS * 0.55);
    backUpper.scale.set(1.0, 1.2, 0.6);
    this._headBone.add(backUpper);
    this._hairMeshes.push(backUpper);

    // Back hair lower — long section draping down the neck
    const backLowerGeo = new THREE.CylinderGeometry(HEAD_RADIUS * 0.65, HEAD_RADIUS * 0.45, HEAD_RADIUS * 1.5, 6);
    const backLower = new THREE.Mesh(backLowerGeo, hairMat);
    backLower.position.set(0, HEAD_RADIUS * -0.25, -HEAD_RADIUS * 0.55);
    backLower.scale.set(1.0, 1, 0.5);
    this._headBone.add(backLower);
    this._hairMeshes.push(backLower);

    // Ears (with more shape — lobe and helix)
    for (const side of [-1, 1]) {
      // Ear helix (outer rim)
      const earGeo = new THREE.SphereGeometry(0.025, 5, 4);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * HEAD_RADIUS * 0.92, HEAD_RADIUS * 0.95, 0);
      ear.scale.set(0.4, 0.75, 0.55);
      this._headBone.add(ear);
      this._earMeshes.push(ear);

      // Ear lobe (smaller sphere below)
      const lobeGeo = new THREE.SphereGeometry(0.012, 3, 3);
      const lobe = new THREE.Mesh(lobeGeo, skinMat);
      lobe.position.set(side * HEAD_RADIUS * 0.92, HEAD_RADIUS * 0.78, 0.005);
      lobe.scale.set(0.5, 0.6, 0.5);
      this._headBone.add(lobe);
      this._earMeshes.push(lobe);
    }

    // Eyes (proper 3D: socket, eyeball, iris, pupil, eyelids)
    for (const side of [-1, 1]) {
      const eyeX = side * 0.038;
      const eyeY = HEAD_RADIUS * 1.0;
      const eyeZ = HEAD_RADIUS * 0.80;

      // Eye socket (dark recessed area behind the eyeball)
      const socketMat = new THREE.MeshStandardMaterial({ color: 0x8b6b5a, roughness: 0.9 });
      const socketGeo = new THREE.SphereGeometry(0.022, 5, 4);
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.position.set(eyeX, eyeY, eyeZ - 0.002);
      socket.scale.set(1, 0.8, 0.5);
      this._headBone.add(socket);
      this._faceMeshes.push(socket);

      // Eyeball (white, with shading from MeshStandardMaterial)
      const eyeWhiteMat = new THREE.MeshStandardMaterial({
        color: 0xf5f0eb, roughness: 0.3, metalness: 0.0,
      });
      const eyeWhiteGeo = new THREE.SphereGeometry(0.016, 6, 5);
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(eyeX, eyeY, eyeZ + 0.004);
      eyeWhite.scale.set(1, 0.85, 0.7);
      this._headBone.add(eyeWhite);
      this._faceMeshes.push(eyeWhite);

      // Iris (colored disc — slightly larger, sits on front of eyeball)
      const irisMat = new THREE.MeshStandardMaterial({
        color: 0x4477aa, roughness: 0.4, metalness: 0.1,
      });
      const irisGeo = new THREE.SphereGeometry(0.011, 5, 4);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(eyeX, eyeY, eyeZ + 0.012);
      iris.scale.set(1, 1, 0.3);
      this._headBone.add(iris);
      this._faceMeshes.push(iris);

      // Pupil (dark center dot)
      const pupilMat = new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: 0.2, metalness: 0.0,
      });
      const pupilGeo = new THREE.SphereGeometry(0.006, 4, 3);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(eyeX, eyeY, eyeZ + 0.015);
      pupil.scale.set(1, 1, 0.3);
      this._headBone.add(pupil);
      this._faceMeshes.push(pupil);

      // Cornea highlight (tiny bright specular dot)
      const corneaMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.0, metalness: 0.0,
        emissive: 0x444444,
      });
      const corneaGeo = new THREE.SphereGeometry(0.003, 3, 2);
      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.position.set(eyeX + side * 0.003, eyeY + 0.003, eyeZ + 0.016);
      this._headBone.add(cornea);
      this._faceMeshes.push(cornea);

      // Upper eyelid (curved skin over top of eye)
      const upperLidGeo = new THREE.SphereGeometry(0.02, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.35);
      const upperLid = new THREE.Mesh(upperLidGeo, skinMat);
      upperLid.position.set(eyeX, eyeY + 0.005, eyeZ + 0.003);
      upperLid.scale.set(1, 0.5, 0.7);
      this._headBone.add(upperLid);
      this._faceMeshes.push(upperLid);

      // Lower eyelid (subtle ridge below the eye)
      const lowerLidGeo = new THREE.SphereGeometry(0.018, 5, 3, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.3);
      const lowerLid = new THREE.Mesh(lowerLidGeo, skinMat);
      lowerLid.position.set(eyeX, eyeY - 0.006, eyeZ + 0.003);
      lowerLid.scale.set(1, 0.5, 0.6);
      this._headBone.add(lowerLid);
      this._faceMeshes.push(lowerLid);
    }

    // Eyebrows (thicker, more defined ridges)
    const browMat = new THREE.MeshStandardMaterial({ color: this._colors.hair, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const browGeo = new THREE.BoxGeometry(0.035, 0.008, 0.014);
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(side * 0.038, HEAD_RADIUS * 1.08, HEAD_RADIUS * 0.82);
      brow.rotation.z = side * -0.15;
      this._headBone.add(brow);
      this._faceMeshes.push(brow);
    }

    // Nose (more detailed: bridge + tip)
    // Nose bridge
    const noseBridgeGeo = new THREE.BoxGeometry(0.012, 0.03, 0.015);
    const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMat);
    noseBridge.position.set(0, HEAD_RADIUS * 0.92, HEAD_RADIUS * 0.88);
    this._headBone.add(noseBridge);
    this._faceMeshes.push(noseBridge);
    // Nose tip
    const noseGeo = new THREE.SphereGeometry(0.016, 5, 4);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0, HEAD_RADIUS * 0.82, HEAD_RADIUS * 0.92);
    noseMesh.scale.set(1, 0.7, 0.8);
    this._headBone.add(noseMesh);
    this._faceMeshes.push(noseMesh);
    // Nostrils (two tiny dark circles)
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x664444 });
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.005, 3, 2);
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(side * 0.008, HEAD_RADIUS * 0.78, HEAD_RADIUS * 0.92);
      this._headBone.add(nostril);
      this._faceMeshes.push(nostril);
    }

    // Mouth (with proper upper and lower lips)
    // Upper lip
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xbb6666, roughness: 0.6 });
    const upperLipGeo = new THREE.SphereGeometry(0.022, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.position.set(0, HEAD_RADIUS * 0.67, HEAD_RADIUS * 0.89);
    upperLip.scale.set(1, 0.35, 0.45);
    this._headBone.add(upperLip);
    this._faceMeshes.push(upperLip);
    // Lower lip
    const lowerLipGeo = new THREE.SphereGeometry(0.02, 5, 3, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.set(0, HEAD_RADIUS * 0.62, HEAD_RADIUS * 0.88);
    lowerLip.scale.set(1, 0.35, 0.45);
    this._headBone.add(lowerLip);
    this._faceMeshes.push(lowerLip);
    // Mouth line (dark seam between lips)
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x553333 });
    const mouthGeo = new THREE.BoxGeometry(0.03, 0.003, 0.004);
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, HEAD_RADIUS * 0.645, HEAD_RADIUS * 0.895);
    this._headBone.add(mouthMesh);
    this._faceMeshes.push(mouthMesh);

    // ---- Arms ----
    // Left arm (at +X local so it appears on the LEFT when viewed from behind a Math.PI-rotated player)
    this._leftUpperArm = this._makeBoneGroup();
    this._leftUpperArm.position.set(SHOULDER_WIDTH, TORSO_HEIGHT - 0.02, 0);
    this._chest.add(this._leftUpperArm);
    this._addLimb(this._leftUpperArm, UPPER_ARM_LEN, this._colors.tunic);
    this._addSleeveCuff(this._leftUpperArm, this._colors.tunic);

    this._leftForearm = this._makeBoneGroup();
    this._leftForearm.position.y = -UPPER_ARM_LEN;
    this._leftUpperArm.add(this._leftForearm);
    this._addJoint(this._leftForearm, this._colors.skin); // elbow joint
    this._addLimb(this._leftForearm, FOREARM_LEN, this._colors.skin);
    this._addForearmMuscle(this._leftForearm, this._colors.skin);

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
    this._addSleeveCuff(this._rightUpperArm, this._colors.tunic);

    this._rightForearm = this._makeBoneGroup();
    this._rightForearm.position.y = -UPPER_ARM_LEN;
    this._rightUpperArm.add(this._rightForearm);
    this._addJoint(this._rightForearm, this._colors.skin); // elbow joint
    this._addLimb(this._rightForearm, FOREARM_LEN, this._colors.skin);
    this._addForearmMuscle(this._rightForearm, this._colors.skin);

    this._rightHand = this._makeBoneGroup();
    this._rightHand.position.y = -FOREARM_LEN;
    this._rightForearm.add(this._rightHand);
    this._addJoint(this._rightHand, this._colors.skin); // wrist
    this._addHand(this._rightHand, this._colors.skin);

    // ---- Legs ----
    const pantsSeamColor = new THREE.Color(this._colors.pants).multiplyScalar(0.8).getHex();
    const pantsSeamMat = new THREE.MeshStandardMaterial({ color: pantsSeamColor, roughness: 0.9 });

    // Left leg
    this._leftThigh = this._makeBoneGroup();
    this._leftThigh.position.set(-HIP_WIDTH, 0, 0);
    this._hips.add(this._leftThigh);
    this._addJoint(this._leftThigh, this._colors.pants); // hip joint
    this._addLimb(this._leftThigh, THIGH_LEN, this._colors.pants, true);
    this._addPantsDetail(this._leftThigh, pantsSeamMat);

    this._leftShin = this._makeBoneGroup();
    this._leftShin.position.y = -THIGH_LEN;
    this._leftThigh.add(this._leftShin);
    this._addJoint(this._leftShin, this._colors.pants); // knee joint
    this._addLimb(this._leftShin, SHIN_LEN, this._colors.pants);
    this._addCalfMuscle(this._leftShin, this._colors.pants);

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
    this._addPantsDetail(this._rightThigh, pantsSeamMat);

    this._rightShin = this._makeBoneGroup();
    this._rightShin.position.y = -THIGH_LEN;
    this._rightThigh.add(this._rightShin);
    this._addJoint(this._rightShin, this._colors.pants); // knee joint
    this._addLimb(this._rightShin, SHIN_LEN, this._colors.pants);
    this._addCalfMuscle(this._rightShin, this._colors.pants);

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

  /** Sleeve cuff at the end of upper arm (where tunic sleeve ends) */
  private _addSleeveCuff(parent: THREE.Group, color: number): void {
    const cuffColor = new THREE.Color(color).multiplyScalar(0.85).getHex();
    const cuffMat = new THREE.MeshStandardMaterial({ color: cuffColor, roughness: 0.85 });
    const cuffGeo = new THREE.CylinderGeometry(LIMB_THICKNESS + 0.008, LIMB_THICKNESS + 0.004, 0.025, 6);
    const cuff = new THREE.Mesh(cuffGeo, cuffMat);
    cuff.position.y = -UPPER_ARM_LEN + 0.01;
    cuff.castShadow = true;
    parent.add(cuff);

    // Rolled-up edge
    const rollGeo = new THREE.TorusGeometry(LIMB_THICKNESS + 0.006, 0.005, 3, 6);
    const roll = new THREE.Mesh(rollGeo, cuffMat);
    roll.position.y = -UPPER_ARM_LEN + 0.02;
    roll.rotation.x = Math.PI / 2;
    parent.add(roll);
  }

  /** Subtle forearm muscle bulge */
  private _addForearmMuscle(parent: THREE.Group, color: number): void {
    const muscleMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const muscleGeo = new THREE.SphereGeometry(LIMB_THICKNESS * 0.7, 4, 3);
    const muscle = new THREE.Mesh(muscleGeo, muscleMat);
    muscle.position.set(0, -FOREARM_LEN * 0.25, LIMB_THICKNESS * 0.4);
    muscle.scale.set(1, 1.5, 0.8);
    parent.add(muscle);
  }

  /** Pants detail: outer seam and knee patch */
  private _addPantsDetail(parent: THREE.Group, seamMat: THREE.MeshStandardMaterial): void {
    // Outer seam running down the thigh
    const seamGeo = new THREE.BoxGeometry(0.004, THIGH_LEN * 0.8, 0.003);
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.position.set(LIMB_THICKNESS * 0.8, -THIGH_LEN * 0.45, 0);
    parent.add(seam);

    // Inner seam
    const innerSeamGeo = new THREE.BoxGeometry(0.004, THIGH_LEN * 0.8, 0.003);
    const innerSeam = new THREE.Mesh(innerSeamGeo, seamMat);
    innerSeam.position.set(-LIMB_THICKNESS * 0.5, -THIGH_LEN * 0.45, 0);
    parent.add(innerSeam);

    // Knee patch (reinforced area)
    const patchGeo = new THREE.BoxGeometry(LIMB_THICKNESS * 1.5, 0.05, LIMB_THICKNESS * 1.2);
    const patch = new THREE.Mesh(patchGeo, seamMat);
    patch.position.set(0, -THIGH_LEN + 0.01, LIMB_THICKNESS * 0.15);
    parent.add(patch);
  }

  /** Calf muscle bulge on shin */
  private _addCalfMuscle(parent: THREE.Group, color: number): void {
    const muscleMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const muscleGeo = new THREE.SphereGeometry(LIMB_THICKNESS * 0.65, 4, 3);
    const muscle = new THREE.Mesh(muscleGeo, muscleMat);
    muscle.position.set(0, -SHIN_LEN * 0.25, -LIMB_THICKNESS * 0.35);
    muscle.scale.set(0.9, 1.6, 0.8);
    parent.add(muscle);
  }

  /** Add a tapered limb segment (cylinder wider at top, narrower at bottom) */
  private _addLimb(parent: THREE.Group, length: number, color: number, thicker = false): void {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    if (thicker) {
      // Thigh: wider at hip, tapering naturally to knee
      const topR = LIMB_THICKNESS * 1.4;
      const botR = LIMB_THICKNESS * 1.0;
      const geo = new THREE.CylinderGeometry(topR, botR, length, 7);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = -length / 2;
      mesh.castShadow = true;
      parent.add(mesh);
    } else {
      const topR = LIMB_THICKNESS;
      const botR = LIMB_THICKNESS * 0.82;
      const geo = new THREE.CylinderGeometry(topR, botR, length, 7);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = -length / 2;
      mesh.castShadow = true;
      parent.add(mesh);
    }
  }

  private _addHand(parent: THREE.Group, color: number): void {
    const hs = HAND_SIZE * 0.75; // smaller hands
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

    // Palm (flat box, not a ball)
    const palmGeo = new THREE.BoxGeometry(hs * 1.4, hs * 0.5, hs * 1.6);
    const palm = new THREE.Mesh(palmGeo, mat);
    palm.position.set(0, -hs * 0.2, 0.01);
    palm.castShadow = true;
    parent.add(palm);

    // Fingers (4 small cylinders, slightly curled)
    for (let i = 0; i < 4; i++) {
      const fingerGeo = new THREE.CylinderGeometry(0.005, 0.004, 0.032, 3);
      const finger = new THREE.Mesh(fingerGeo, mat);
      finger.position.set((i - 1.5) * 0.012, -hs * 0.45, 0.02);
      finger.rotation.x = 0.5;
      parent.add(finger);
    }

    // Thumb (offset to side)
    const thumbGeo = new THREE.CylinderGeometry(0.006, 0.005, 0.025, 3);
    const thumb = new THREE.Mesh(thumbGeo, mat);
    thumb.position.set(hs * 0.55, -hs * 0.15, 0.02);
    thumb.rotation.x = 0.2;
    thumb.rotation.z = 0.5;
    parent.add(thumb);
  }

  private _addFoot(parent: THREE.Group, color: number): void {
    // Ankle joint
    this._addJoint(parent, color);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 });

    // Main foot — tapers down toward the toes using a wedge shape
    // Back (heel area) is taller, front (toe area) slopes down
    const footGeo = new THREE.BufferGeometry();
    const hw = 0.04; // half width
    const hh = FOOT_HEIGHT; // heel height
    const th = FOOT_HEIGHT * 0.35; // toe height (much lower)
    const bl = FOOT_LEN * 0.2; // back length from ankle
    const fl = FOOT_LEN * 0.7; // front length from ankle
    // 8 vertices: back-bottom, back-top, front-bottom, front-top (left and right)
    const verts = new Float32Array([
      // back-left-bottom, back-left-top
      -hw, -hh, -bl,   -hw, 0, -bl,
      // back-right-bottom, back-right-top
       hw, -hh, -bl,    hw, 0, -bl,
      // front-left-bottom, front-left-top
      -hw * 0.85, -hh, fl,   -hw * 0.85, -hh + th, fl,
      // front-right-bottom, front-right-top
       hw * 0.85, -hh, fl,    hw * 0.85, -hh + th, fl,
    ]);
    const indices = [
      // bottom
      0,4,2, 2,4,6,
      // top (slopes from back-top to front-top)
      1,3,5, 3,7,5,
      // left side
      0,1,5, 0,5,4,
      // right side
      2,6,7, 2,7,3,
      // back
      0,2,3, 0,3,1,
      // front
      4,5,7, 4,7,6,
    ];
    footGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    footGeo.setIndex(indices);
    footGeo.computeVertexNormals();
    const foot = new THREE.Mesh(footGeo, mat);
    foot.castShadow = true;
    parent.add(foot);

    // Sole (flat bottom, slightly wider)
    const soleGeo = new THREE.BoxGeometry(0.085, 0.015, FOOT_LEN * 0.95);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -hh - 0.005, fl * 0.35);
    sole.castShadow = true;
    parent.add(sole);

    // Heel (raised back)
    const heelGeo = new THREE.BoxGeometry(0.065, 0.02, 0.035);
    const heel = new THREE.Mesh(heelGeo, soleMat);
    heel.position.set(0, -hh - 0.008, -bl * 0.6);
    parent.add(heel);

    // Ankle cuff
    const cuffGeo = new THREE.CylinderGeometry(0.042, 0.04, 0.02, 6);
    const cuff = new THREE.Mesh(cuffGeo, mat);
    cuff.position.set(0, -0.005, 0);
    parent.add(cuff);
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

      // Thrown weapon special details
      if (wpn.category === "thrown") {
        if (wpn.id.includes("javelin")) {
          // Javelin: thin shaft with metal head, no guard needed
          // Already gets the spear-like shape from blade code above
        } else if (wpn.id.includes("axe")) {
          // Throwing axe: compact, already handled by axe branch
        } else if (wpn.id.includes("kniv") || wpn.id.includes("knife")) {
          // Throwing knives: add extra blade detail
          const knifeEdgeMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd, roughness: 0.1, metalness: 0.9,
          });
          const knifeEdgeGeo = new THREE.BoxGeometry(0.002, bladeLen * 0.8, 0.008);
          const knifeEdge = new THREE.Mesh(knifeEdgeGeo, knifeEdgeMat);
          knifeEdge.position.set(0.018, handleLen + bladeLen * 0.4, 0);
          weaponGroup.add(knifeEdge);
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

      // Axe beard guard (hook at base of axe head, also serves as hand stop)
      if (wpn.id.includes("axe") && wpn.category !== "thrown") {
        const beardGeo = new THREE.BoxGeometry(0.015, 0.03, 0.015);
        const beard = new THREE.Mesh(beardGeo, bladeMat);
        beard.position.set(0, handleLen + 0.01, 0);
        weaponGroup.add(beard);
      }

      // Mace/hammer guard collar (ring between handle and head)
      if (wpn.id.includes("mace") || wpn.id.includes("hammer") || wpn.id.includes("morning")) {
        const collarGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.015, 6);
        const collar = new THREE.Mesh(collarGeo, guardMat);
        collar.position.y = handleLen;
        weaponGroup.add(collar);
      }

      // Flip weapon so blade extends forward (away from elbow) when arm is raised
      weaponGroup.rotation.x = Math.PI;
      weaponGroup.position.y = handleLen * 0.65; // hand grips upper part of handle

      // Use the group as a single mesh wrapper
      const dummyGeo = new THREE.BufferGeometry();
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      this._weaponMesh = new THREE.Mesh(dummyGeo, dummyMat);
      this._weaponMesh.add(weaponGroup);
      this._rightHand.add(this._weaponMesh);
    } else if (isRangedWeapon(wpn)) {
      this._isRangedWeapon = true;
      const isCrossbow = wpn.category === "crossbow";
      const bowR = wpn.length * 0.55;
      this._bowR = bowR;
      const bowArc = Math.PI * 0.65;

      const bowMat = new THREE.MeshStandardMaterial({ color: wpn.color, roughness: 0.7 });
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });

      // ---------------------------------------------------------------
      // Bow coordinate system (bowGroup local):
      //   +X = forward (toward enemy, where wood/belly faces)
      //   +Y = up (upper limb)
      //   -Y = down (lower limb)
      //   -X = toward archer (where string is)
      //
      // GRIP is at the ORIGIN so the hand holds the center of the bow.
      //
      // Mapping to hand space:
      //   In hand space -Y = forward (same as melee weapons).
      //   So we rotate bowGroup: +X → -Y  via rotation.z = +π/2
      //   And we want +Y (limbs) to stay vertical → need +Y → +Z
      //   rotation.z = π/2 maps: X→Y, Y→-X  (wrong for limbs)
      //   Instead use rotation order: first Rx=π/2 (Y→Z, Z→-Y),
      //   then Rz=-π/2 (X→-Y stays.. let's just compute)
      //
      // Euler XYZ with (x=π/2, y=0, z=-π/2):
      //   Matrix = Rz(-π/2) · Ry(0) · Rx(π/2)
      //   (1,0,0) → Rx:(1,0,0) → Rz:(0,-1,0)   X→-Y (forward) ✓
      //   (0,1,0) → Rx:(0,0,1) → Rz:(0,0,1)     Y→+Z (up)     ✓
      //   (0,0,1) → Rx:(0,-1,0) → Rz:(1,0,0)    Z→+X           ✓
      // ---------------------------------------------------------------
      const bowGroup = new THREE.Group();

      // Torus default: arc in XY plane, outer edge at +X.
      // Center the arc by rotating stave around Z by -bowArc/2.
      // Then outer edge center is at +X, limbs go ±Y symmetrically.
      // Shift stave so outer edge (at x=+bowR) lands at origin (grip).
      const staveGeo = new THREE.TorusGeometry(bowR, 0.012, 5, 12, bowArc);
      const stave = new THREE.Mesh(staveGeo, bowMat);
      stave.rotation.z = -bowArc / 2; // center arc symmetrically
      stave.position.x = -bowR;       // outer edge (wood) at origin = grip
      stave.castShadow = true;
      bowGroup.add(stave);

      // Grip wrap at origin
      const gripGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.06, 5);
      const grip = new THREE.Mesh(gripGeo, gripMat);
      bowGroup.add(grip);

      // String — connects the two nock points (tips of the arc)
      const halfSpan = bowR * Math.sin(bowArc / 2);
      // Nock X in bowGroup = bowR * cos(bowArc/2) - bowR  (negative, toward archer)
      const stringX = bowR * Math.cos(bowArc / 2) - bowR;
      this._bowStringRestX = stringX;

      // V-shape string: two segments meeting at center pull point.
      // Vertices: upper nock → center → lower nock.
      // Only the center X moves during draw animation.
      const strPositions = new Float32Array([
        stringX,  halfSpan, 0,  // upper nock (fixed)
        stringX,  0,        0,  // center pull point (animated)
        stringX, -halfSpan, 0,  // lower nock (fixed)
      ]);
      const strBufGeo = new THREE.BufferGeometry();
      strBufGeo.setAttribute("position", new THREE.BufferAttribute(strPositions, 3));
      const stringMat = new THREE.LineBasicMaterial({ color: 0xddddcc });
      const bowStringLine = new THREE.Line(strBufGeo, stringMat);
      bowGroup.add(bowStringLine);
      this._bowStringLine = bowStringLine;

      // Nocks at limb tips
      for (const side of [-1, 1]) {
        const nockGeo = new THREE.SphereGeometry(0.006, 3, 3);
        const nock = new THREE.Mesh(nockGeo, bowMat);
        nock.position.set(stringX, side * halfSpan, 0);
        bowGroup.add(nock);
      }

      // Arrow — along +X (forward), starting at the string rest position
      const arrowLen = isCrossbow ? 0.2 : 0.35;
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
      const arrowGeo = new THREE.CylinderGeometry(0.004, 0.004, arrowLen, 3);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.z = -Math.PI / 2; // cylinder Y → +X
      arrow.position.set(stringX + arrowLen * 0.5, 0, 0);
      bowGroup.add(arrow);

      // Arrowhead
      const aHeadMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
      const aHeadGeo = new THREE.ConeGeometry(0.009, 0.03, 4);
      const arrowHead = new THREE.Mesh(aHeadGeo, aHeadMat);
      arrowHead.rotation.z = -Math.PI / 2; // cone tip → +X
      arrowHead.position.set(stringX + arrowLen + 0.02, 0, 0);
      bowGroup.add(arrowHead);

      // Fletching
      const fletchMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });
      for (let f = 0; f < 3; f++) {
        const fAngle = (f / 3) * Math.PI * 2;
        const fletchGeo = new THREE.BoxGeometry(0.04, 0.015, 0.001);
        const fletch = new THREE.Mesh(fletchGeo, fletchMat);
        fletch.position.set(
          stringX + 0.03,
          Math.cos(fAngle) * 0.008,
          Math.sin(fAngle) * 0.008,
        );
        fletch.rotation.x = fAngle;
        bowGroup.add(fletch);
      }

      // Arrow nock
      const nockMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
      const arrowNockGeo = new THREE.SphereGeometry(0.005, 3, 3);
      const arrowNock = new THREE.Mesh(arrowNockGeo, nockMat);
      arrowNock.position.set(stringX, 0, 0);
      bowGroup.add(arrowNock);

      // Crossbow stock
      if (isCrossbow) {
        const stockMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
        const stockGeo = new THREE.BoxGeometry(0.25, 0.04, 0.03);
        const stock = new THREE.Mesh(stockGeo, stockMat);
        stock.position.set(-0.12, -0.02, 0);
        bowGroup.add(stock);
      }

      // ---------------------------------------------------------------
      // !! DO NOT CHANGE THIS ROTATION WITHOUT READING THIS FIRST !!
      //
      // CORRECT BOW ORIENTATION: (Math.PI, Math.PI/2, Math.PI/2)
      //   - One limb points UP, one limb points DOWN
      //   - WOOD (belly/outer curve) faces the ENEMY (forward)
      //   - STRING faces the ARCHER (backward, toward body)
      //   - Arrow points toward enemy
      //
      // This was reached after many failed attempts. The key is the
      // POSITIVE Math.PI/2 on Z (not negative). Negating Z flips wood
      // and string. Changing Y rotates the limbs away from vertical.
      // Changing X tilts the whole bow off-axis.
      // ---------------------------------------------------------------
      bowGroup.rotation.set(Math.PI, Math.PI / 2, Math.PI / 2);

      // Wrapper mesh (same pattern as melee weapons)
      const dummyGeo = new THREE.BufferGeometry();
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      this._weaponMesh = new THREE.Mesh(dummyGeo, dummyMat);
      this._weaponMesh.add(bowGroup);
      this._rightHand.add(this._weaponMesh);
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
      // Slightly convex disc — CircleGeometry for flat face + slight z-scale for curvature
      const shieldGeo = new THREE.CircleGeometry(shieldRadius, 16);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: shield.color,
        roughness: 0.6,
        metalness: 0.3,
        side: THREE.DoubleSide,
      });
      this._shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      // Shield face points in +Z (forward from the forearm)
      // Positioned to cover the hand, counter-rotate on X to stay vertical
      this._shieldMesh.position.set(0, -FOREARM_LEN * 0.99, LIMB_THICKNESS + 0.01);
      this._shieldMesh.rotation.x = 0.6;
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

      // Shield boss (center dome) — faces outward (+Z)
      const bossGeo = new THREE.SphereGeometry(shieldRadius * 0.22, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const bossMat = new THREE.MeshStandardMaterial({
        color: shield.accentColor ?? 0x999999,
        roughness: 0.3,
        metalness: 0.7,
      });
      const boss = new THREE.Mesh(bossGeo, bossMat);
      boss.position.z = 0.01;
      this._shieldMesh.add(boss);

      // Shield cross / reinforcing strips (two crossing bars)
      const stripMat = new THREE.MeshStandardMaterial({
        color: shield.accentColor ?? 0x888888,
        roughness: 0.4,
        metalness: 0.5,
      });
      const hStripGeo = new THREE.BoxGeometry(shieldRadius * 1.6, 0.02, 0.008);
      const hStrip = new THREE.Mesh(hStripGeo, stripMat);
      hStrip.position.z = 0.008;
      this._shieldMesh.add(hStrip);
      const vStripGeo = new THREE.BoxGeometry(0.02, shieldRadius * 1.6, 0.008);
      const vStrip = new THREE.Mesh(vStripGeo, stripMat);
      vStrip.position.z = 0.008;
      this._shieldMesh.add(vStrip);

      // Shield back handle (visible from behind, against arm)
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
      const shieldHandleGeo = new THREE.BoxGeometry(0.02, shieldRadius * 0.6, 0.02);
      const shieldHandle = new THREE.Mesh(shieldHandleGeo, handleMat);
      shieldHandle.position.z = -0.012;
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

    // Head armor — full dome with eye holes
    if (armor.head) {
      const helmMat = new THREE.MeshStandardMaterial({
        color: armor.head.color,
        roughness: 0.4,
        metalness: 0.6,
      });
      const darkMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

      // Full helm dome — complete sphere covering the whole head equally on all sides
      const helmR = HEAD_RADIUS * 1.18;
      const helmGeo = new THREE.SphereGeometry(helmR, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.7);
      const helm = new THREE.Mesh(helmGeo, helmMat);
      helm.position.y = HEAD_RADIUS;
      helm.scale.set(1, 1.12, 0.95);
      helm.castShadow = true;
      this._headBone.add(helm);
      this._armorMeshes.push(helm);

      // Eye holes — two dark ellipses on the front of the helm
      for (const side of [-1, 1]) {
        const eyeGeo = new THREE.CircleGeometry(0.022, 8);
        const eye = new THREE.Mesh(eyeGeo, darkMat);
        eye.scale.set(1.3, 0.6, 1); // wider than tall
        eye.position.set(side * HEAD_RADIUS * 0.45, HEAD_RADIUS * 1.02, helmR * 0.94);
        this._headBone.add(eye);
        this._armorMeshes.push(eye);
      }

      // Neck guard (extends down the back of the head/neck)
      const neckGuardGeo = new THREE.CylinderGeometry(HEAD_RADIUS * 1.1, HEAD_RADIUS * 1.25, HEAD_RADIUS * 0.75, 10, 1, true, Math.PI * 0.35, Math.PI * 1.3);
      const neckGuard = new THREE.Mesh(neckGuardGeo, helmMat);
      neckGuard.position.set(0, HEAD_RADIUS * 0.4, -HEAD_RADIUS * 0.1);
      neckGuard.castShadow = true;
      this._headBone.add(neckGuard);
      this._armorMeshes.push(neckGuard);

      // Helm rivets (small dots around the brow line)
      const rivetMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.3, metalness: 0.8 });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const rivetGeo = new THREE.SphereGeometry(0.005, 3, 3);
        const rivet = new THREE.Mesh(rivetGeo, rivetMat);
        rivet.position.set(
          Math.sin(angle) * helmR * 0.98,
          HEAD_RADIUS * 0.92,
          Math.cos(angle) * helmR * 0.93,
        );
        this._headBone.add(rivet);
        this._armorMeshes.push(rivet);
      }

      // Cheek guards (side plates) — for defense >= 10
      if (helmDef >= 10) {
        for (const side of [-1, 1]) {
          const cheekGeo = new THREE.BoxGeometry(0.02, HEAD_RADIUS * 0.7, HEAD_RADIUS * 0.55);
          const cheek = new THREE.Mesh(cheekGeo, helmMat);
          cheek.position.set(side * HEAD_RADIUS * 1.05, HEAD_RADIUS * 0.65, HEAD_RADIUS * 0.15);
          this._headBone.add(cheek);
          this._armorMeshes.push(cheek);
        }

        // Aventail (chain mail curtain hanging from helm)
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
        noseGuard.position.set(0, HEAD_RADIUS * 0.85, helmR * 0.95);
        this._headBone.add(noseGuard);
        this._armorMeshes.push(noseGuard);

        // Helm crest / ridge along the top
        const crestGeo = new THREE.BoxGeometry(0.015, 0.02, HEAD_RADIUS * 1.4);
        const crest = new THREE.Mesh(crestGeo, helmMat);
        crest.position.set(0, HEAD_RADIUS * 1.32, -HEAD_RADIUS * 0.15);
        this._headBone.add(crest);
        this._armorMeshes.push(crest);
      }

      // Bascinet visor (defense >= 18): replace eye holes with a narrow slit
      if (helmDef >= 18 && helmDef < 22) {
        // Cover the eye holes with a visor plate
        const visorGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.6, HEAD_RADIUS * 0.7, 0.015);
        const visor = new THREE.Mesh(visorGeo, helmMat);
        visor.position.set(0, HEAD_RADIUS * 0.95, helmR * 0.96);
        this._headBone.add(visor);
        this._armorMeshes.push(visor);

        // Eye slit (dark strip across visor)
        const slitGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.4, 0.012, 0.005);
        const slit = new THREE.Mesh(slitGeo, darkMat);
        slit.position.set(0, HEAD_RADIUS * 1.0, helmR * 0.97);
        this._headBone.add(slit);
        this._armorMeshes.push(slit);

        // Breathing holes below slit
        for (let i = 0; i < 4; i++) {
          const holeGeo = new THREE.CircleGeometry(0.004, 4);
          const hole = new THREE.Mesh(holeGeo, darkMat);
          hole.position.set((i - 1.5) * 0.018, HEAD_RADIUS * 0.82, helmR * 0.97);
          this._headBone.add(hole);
          this._armorMeshes.push(hole);
        }
      }

      // Great helm (defense >= 22): fully enclosed with flat top
      if (helmDef >= 22) {
        // Cover the eye holes with a full face plate
        const facePlateGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.8, HEAD_RADIUS * 1.2, 0.015);
        const facePlate = new THREE.Mesh(facePlateGeo, helmMat);
        facePlate.position.set(0, HEAD_RADIUS * 0.8, helmR * 0.96);
        facePlate.castShadow = true;
        this._headBone.add(facePlate);
        this._armorMeshes.push(facePlate);

        // Eye slit (horizontal dark strip)
        const slitGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.6, 0.015, 0.005);
        const slit = new THREE.Mesh(slitGeo, darkMat);
        slit.position.set(0, HEAD_RADIUS * 1.02, helmR * 0.97);
        this._headBone.add(slit);
        this._armorMeshes.push(slit);

        // Breathing holes (cross pattern below eye slit)
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 4; col++) {
            const holeGeo = new THREE.CircleGeometry(0.004, 4);
            const hole = new THREE.Mesh(holeGeo, darkMat);
            hole.position.set(
              (col - 1.5) * 0.018,
              HEAD_RADIUS * 0.78 - row * 0.02,
              helmR * 0.97,
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
      const tDef = armor.torso.defense;
      const isPlate = tDef >= 25;
      const isMail = tDef >= 12 && tDef < 25;
      const armorMat = new THREE.MeshStandardMaterial({
        color: armor.torso.color,
        roughness: isPlate ? 0.3 : isMail ? 0.55 : 0.5,
        metalness: isPlate ? 0.65 : isMail ? 0.45 : 0.3,
      });
      const rivetMat = new THREE.MeshStandardMaterial({
        color: 0xccccaa, roughness: 0.3, metalness: 0.8,
      });

      // Main chest armor — 3-section organic shape matching body contour
      const aOff = 0.02; // armor offset (thickness over body)
      const aWaistH = TORSO_HEIGHT * 0.35;
      const aRibH = TORSO_HEIGHT * 0.35;
      const aChestH = TORSO_HEIGHT * 0.3;
      const aWaistW = TORSO_WIDTH * 0.85;
      const aWaistD = TORSO_DEPTH * 0.9;

      // Lower armor / waist section
      const aWaistGeo = new THREE.CylinderGeometry(
        TORSO_WIDTH * 0.48 + aOff, aWaistW * 0.46 + aOff, aWaistH + 0.01, 8,
      );
      const aWaist = new THREE.Mesh(aWaistGeo, armorMat);
      aWaist.position.y = aWaistH / 2;
      aWaist.scale.set(1, 1, aWaistD / aWaistW);
      aWaist.castShadow = true;
      this._chest.add(aWaist);
      this._armorMeshes.push(aWaist);

      // Ribcage armor section
      const aRibGeo = new THREE.CylinderGeometry(
        TORSO_WIDTH * 0.52 + aOff, TORSO_WIDTH * 0.48 + aOff, aRibH + 0.01, 10,
      );
      const aRib = new THREE.Mesh(aRibGeo, armorMat);
      aRib.position.y = aWaistH + aRibH / 2;
      aRib.scale.set(1, 1, TORSO_DEPTH / TORSO_WIDTH * 1.05);
      aRib.castShadow = true;
      this._chest.add(aRib);
      this._armorMeshes.push(aRib);

      // Upper chest / shoulder armor section
      const aChestGeo = new THREE.CylinderGeometry(
        TORSO_WIDTH * 0.4 + aOff, TORSO_WIDTH * 0.53 + aOff, aChestH + 0.01, 10,
      );
      const aChest = new THREE.Mesh(aChestGeo, armorMat);
      aChest.position.y = aWaistH + aRibH + aChestH / 2;
      aChest.scale.set(1, 1, TORSO_DEPTH / TORSO_WIDTH);
      aChest.castShadow = true;
      this._chest.add(aChest);
      this._armorMeshes.push(aChest);

      // Front seam / split line for lighter armors (padded, leather)
      if (tDef < 12) {
        const splitMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(armor.torso.color).multiplyScalar(0.7).getHex(),
          roughness: 0.9,
        });
        const splitGeo = new THREE.CylinderGeometry(0.003, 0.003, TORSO_HEIGHT * 0.85, 4);
        const split = new THREE.Mesh(splitGeo, splitMat);
        split.position.set(0, TORSO_HEIGHT * 0.5, TORSO_DEPTH * 0.45 + 0.025);
        this._chest.add(split);
        this._armorMeshes.push(split);

        // Lacing/ties across the front split
        for (let i = 0; i < 4; i++) {
          const tieGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.025, 4);
          const tie = new THREE.Mesh(tieGeo, splitMat);
          tie.position.set(0, TORSO_HEIGHT * 0.25 + i * 0.08, TORSO_DEPTH * 0.45 + 0.026);
          tie.rotation.z = Math.PI / 2;
          this._chest.add(tie);
          this._armorMeshes.push(tie);
        }
      }

      // Chainmail texture for mail armor (horizontal ring pattern)
      if (isMail) {
        const mailMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(armor.torso.color).multiplyScalar(0.85).getHex(),
          roughness: 0.6, metalness: 0.5,
        });
        // Horizontal mail rings (torus rings following body contour)
        for (let row = 0; row < 6; row++) {
          const t = 0.15 + row * 0.13; // normalized height along torso
          // Interpolate radius to match the 3-section body shape
          let ringR: number;
          if (t < 0.35) ringR = TORSO_WIDTH * (0.46 + (0.48 - 0.46) * (t / 0.35));
          else if (t < 0.7) ringR = TORSO_WIDTH * (0.48 + (0.52 - 0.48) * ((t - 0.35) / 0.35));
          else ringR = TORSO_WIDTH * (0.53 + (0.4 - 0.53) * ((t - 0.7) / 0.3));
          const ringRowGeo = new THREE.TorusGeometry(ringR + 0.015, 0.004, 4, 10);
          const ringRow = new THREE.Mesh(ringRowGeo, mailMat);
          ringRow.position.y = TORSO_HEIGHT * t;
          ringRow.rotation.x = Math.PI / 2;
          ringRow.scale.set(1, TORSO_DEPTH / TORSO_WIDTH * 1.05, 1);
          this._chest.add(ringRow);
          this._armorMeshes.push(ringRow);
        }
      }

      // Chest plate center ridge (for plate armor)
      if (isPlate) {
        const ridgeMat = new THREE.MeshStandardMaterial({
          color: armor.torso.accentColor ?? armor.torso.color,
          roughness: 0.25,
          metalness: 0.7,
        });
        // Center ridge running down the breastplate (follows chest curve)
        const ridgeGeo = new THREE.CylinderGeometry(0.012, 0.008, TORSO_HEIGHT * 0.7, 4);
        const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
        ridge.position.set(0, TORSO_HEIGHT * 0.55, TORSO_DEPTH * 0.35 + 0.025);
        this._chest.add(ridge);
        this._armorMeshes.push(ridge);

        // Plate rivets along edges (front and sides)
        for (let i = 0; i < 4; i++) {
          for (const sideX of [-1, 1]) {
            const rGeo = new THREE.SphereGeometry(0.005, 3, 3);
            const r = new THREE.Mesh(rGeo, rivetMat);
            r.position.set(
              sideX * (TORSO_WIDTH / 2 + 0.015),
              TORSO_HEIGHT * 0.2 + i * 0.1,
              TORSO_DEPTH / 2 + 0.02,
            );
            this._chest.add(r);
            this._armorMeshes.push(r);
          }
        }
      }

      // Gorget (neck protection) for defense >= 15
      if (tDef >= 15) {
        const gorgetGeo = new THREE.CylinderGeometry(NECK_RADIUS * 1.8, TORSO_WIDTH * 0.45, 0.06, 8);
        const gorget = new THREE.Mesh(gorgetGeo, armorMat);
        gorget.position.y = TORSO_HEIGHT + 0.02;
        gorget.castShadow = true;
        this._chest.add(gorget);
        this._armorMeshes.push(gorget);

        // Gorget rim
        const gorgetRimGeo = new THREE.TorusGeometry(NECK_RADIUS * 1.7, 0.006, 3, 8);
        const gorgetRim = new THREE.Mesh(gorgetRimGeo, rivetMat);
        gorgetRim.position.y = TORSO_HEIGHT + 0.05;
        gorgetRim.rotation.x = Math.PI / 2;
        this._chest.add(gorgetRim);
        this._armorMeshes.push(gorgetRim);
      }

      // Fauld (armored skirt below waist) for defense >= 10
      if (tDef >= 10) {
        const fauldH = 0.08;
        const fauldGeo = new THREE.CylinderGeometry(
          TORSO_WIDTH * 0.48, TORSO_WIDTH * 0.55, fauldH, 8,
        );
        const fauld = new THREE.Mesh(fauldGeo, armorMat);
        fauld.position.y = -fauldH * 0.3;
        fauld.castShadow = true;
        this._chest.add(fauld);
        this._armorMeshes.push(fauld);

        // Fauld lames (overlapping curved strips)
        for (let i = 0; i < 3; i++) {
          const lameR = TORSO_WIDTH * 0.48 + 0.01 - i * 0.005;
          const lameGeo = new THREE.TorusGeometry(lameR, 0.005, 4, 10);
          const lame = new THREE.Mesh(lameGeo, armorMat);
          lame.position.y = -0.01 - i * 0.025;
          lame.rotation.x = Math.PI / 2;
          lame.scale.set(1, TORSO_DEPTH / TORSO_WIDTH, 1);
          this._chest.add(lame);
          this._armorMeshes.push(lame);
        }
      }

      // Shoulder pauldrons for heavier armor (defense >= 18)
      if (tDef >= 18) {
        for (const side of [-1, 1]) {
          // Main pauldron dome
          const pauldronGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS * 1.5, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.6);
          const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
          pauldron.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT, 0);
          pauldron.castShadow = true;
          this._chest.add(pauldron);
          this._armorMeshes.push(pauldron);

          // Pauldron rim (raised edge)
          const pauldronRimGeo = new THREE.TorusGeometry(SHOULDER_CAP_RADIUS * 1.4, 0.005, 3, 8);
          const pauldronRim = new THREE.Mesh(pauldronRimGeo, rivetMat);
          pauldronRim.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT - 0.01, 0);
          pauldronRim.rotation.x = Math.PI / 2;
          this._chest.add(pauldronRim);
          this._armorMeshes.push(pauldronRim);

          // Layered pauldron lames (overlapping curved plates below the dome)
          for (let i = 0; i < 3; i++) {
            const lameR = SHOULDER_CAP_RADIUS * 1.3 - i * 0.005;
            const lameGeo = new THREE.CylinderGeometry(
              lameR, lameR + 0.005, 0.018, 8, 1, true, 0, Math.PI,
            );
            const lame = new THREE.Mesh(lameGeo, armorMat);
            lame.position.set(
              side * SHOULDER_WIDTH,
              TORSO_HEIGHT - 0.035 - i * 0.025,
              0,
            );
            lame.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
            this._chest.add(lame);
            this._armorMeshes.push(lame);
          }

          // Upper arm guard (rerebrace) — cylinder wrapping the upper arm
          const rebraceGeo = new THREE.CylinderGeometry(
            LIMB_THICKNESS + 0.015, LIMB_THICKNESS + 0.01,
            UPPER_ARM_LEN * 0.55, 6,
          );
          const rebrace = new THREE.Mesh(rebraceGeo, armorMat);
          rebrace.position.y = -UPPER_ARM_LEN * 0.25;
          const armBone = side === 1 ? this._leftUpperArm : this._rightUpperArm;
          armBone.add(rebrace);
          this._armorMeshes.push(rebrace);
        }
      }

      // Lighter shoulder caps (defense 10-17) — small plates over shoulders
      if (tDef >= 10 && tDef < 18) {
        for (const side of [-1, 1]) {
          const capGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS * 1.2, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
          const cap = new THREE.Mesh(capGeo, armorMat);
          cap.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT, 0);
          cap.castShadow = true;
          this._chest.add(cap);
          this._armorMeshes.push(cap);
        }
      }

      // Armor trim / edge detail (accent color strip along bottom)
      if (armor.torso.accentColor) {
        const trimMat = new THREE.MeshStandardMaterial({
          color: armor.torso.accentColor,
          roughness: 0.3,
          metalness: 0.6,
        });
        // Bottom trim ring (follows waist contour)
        const trimGeo = new THREE.TorusGeometry(TORSO_WIDTH * 0.46 + 0.025, 0.008, 4, 10);
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0.02;
        trim.rotation.x = Math.PI / 2;
        trim.scale.set(1, TORSO_DEPTH / TORSO_WIDTH * 0.9, 1);
        this._chest.add(trim);
        this._armorMeshes.push(trim);

        // Top trim ring along neckline
        const topTrimGeo = new THREE.TorusGeometry(TORSO_WIDTH * 0.4 + 0.02, 0.007, 4, 10);
        const topTrim = new THREE.Mesh(topTrimGeo, trimMat);
        topTrim.position.y = TORSO_HEIGHT;
        topTrim.rotation.x = Math.PI / 2;
        topTrim.scale.set(1, TORSO_DEPTH / TORSO_WIDTH, 1);
        this._chest.add(topTrim);
        this._armorMeshes.push(topTrim);
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
        // Armored boot — slopes down toward toes matching foot shape
        const bootGeo = new THREE.BufferGeometry();
        const bw = 0.046; // half width
        const bh = FOOT_HEIGHT + 0.01; // heel height
        const bt = FOOT_HEIGHT * 0.4; // toe height
        const bbl = FOOT_LEN * 0.22; // back
        const bfl = FOOT_LEN * 0.73; // front
        const bv = new Float32Array([
          -bw, -bh, -bbl,   -bw, 0.01, -bbl,
           bw, -bh, -bbl,    bw, 0.01, -bbl,
          -bw * 0.9, -bh, bfl,   -bw * 0.9, -bh + bt, bfl,
           bw * 0.9, -bh, bfl,    bw * 0.9, -bh + bt, bfl,
        ]);
        const bi = [0,4,2, 2,4,6, 1,3,5, 3,7,5, 0,1,5, 0,5,4, 2,6,7, 2,7,3, 0,2,3, 0,3,1, 4,5,7, 4,7,6];
        bootGeo.setAttribute("position", new THREE.BufferAttribute(bv, 3));
        bootGeo.setIndex(bi);
        bootGeo.computeVertexNormals();
        const bootMesh = new THREE.Mesh(bootGeo, bMat);
        bootMesh.castShadow = true;
        foot.add(bootMesh);
        this._armorMeshes.push(bootMesh);

        // Ankle guard
        const ankleGeo = new THREE.CylinderGeometry(0.048, 0.046, 0.04, 6);
        const ankle = new THREE.Mesh(ankleGeo, bMat);
        ankle.position.set(0, 0.01, 0);
        foot.add(ankle);
        this._armorMeshes.push(ankle);

        // Sole plate (hardened sole)
        if (armor.boots.defense >= 8) {
          const soleMat = new THREE.MeshStandardMaterial({
            color: 0x333333, roughness: 0.6, metalness: 0.3,
          });
          const soleGeo = new THREE.CylinderGeometry(0.048, 0.05, FOOT_LEN + 0.04, 6);
          const sole = new THREE.Mesh(soleGeo, soleMat);
          sole.position.set(0, -FOOT_HEIGHT - 0.01, FOOT_LEN * 0.2);
          sole.rotation.x = Math.PI / 2;
          sole.scale.set(1, 1, 0.15);
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
        if (this._isRangedWeapon) {
          this._animateDrawBow(fighter);
        } else {
          this._animateRelease(fighter);
        }
        break;
      case FighterCombatState.RECOVERY:
        if (this._isRangedWeapon) {
          this._animateDrawBow(fighter);
        } else {
          this._animateRecovery(fighter);
        }
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

      // Remove weapon mesh if looted
      if (!fighter.equipment.mainHand && this._weaponMesh) {
        this._rightHand.remove(this._weaponMesh);
        this._weaponMesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        this._weaponMesh = null;
        this._bowStringLine = null;
        this._isRangedWeapon = false;
      }
      // Remove shield if looted
      if (!fighter.equipment.offHand && this._shieldMesh) {
        this._leftForearm.remove(this._shieldMesh);
        this._shieldMesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        this._shieldMesh = null;
      }
    }
  }

  // ---- Animation methods --------------------------------------------------

  private _animateIdle(_fighter: WarbandFighter, _dt: number): void {
    // Subtle breathing
    const breathe = Math.sin(Date.now() * 0.003) * 0.01;
    this._chest.position.y = breathe;

    // Arms resting at sides — positive z pushes left arm outward (+X), negative z pushes right arm outward (-X)
    this._leftUpperArm.rotation.x = 0.05;
    this._leftUpperArm.rotation.z = 0.35;
    this._leftForearm.rotation.x = -0.2;
    this._rightUpperArm.rotation.x = 0.1;
    this._rightUpperArm.rotation.z = -0.35;
    this._rightForearm.rotation.x = -0.3;

    // Shield arm: held forward to protect body
    if (this._shieldMesh) {
      this._leftUpperArm.rotation.x = -0.4;
      this._leftUpperArm.rotation.z = 0.25;
      this._leftForearm.rotation.x = -0.6;
    }

    // Bow: right arm holds bow forward, left arm hangs naturally
    if (this._isRangedWeapon) {
      this._rightUpperArm.rotation.x = -1.0;
      this._rightUpperArm.rotation.z = -0.2;
      this._rightForearm.rotation.x = -0.1;
      // Left arm just rests at side (no bow involvement)
    } else if (this._weaponMesh) {
      // Melee weapon ready position — arm pushed outward to clear torso
      this._rightUpperArm.rotation.x = -0.4;
      this._rightUpperArm.rotation.z = -0.45;
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

    // Arms counter-swing (if not attacking) — skip left arm if holding shield
    if (!this._shieldMesh) {
      this._leftUpperArm.rotation.x = -Math.sin(t) * amplitude * 0.5 + 0.1;
      this._leftUpperArm.rotation.z = 0.35;
    }
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

    // Idle pose values (match _animateIdle — arms pushed outward)
    const idleArmX = this._weaponMesh ? -0.4 : 0.1;
    const idleArmZ = this._weaponMesh ? -0.45 : -0.35;
    const idleForearmX = this._weaponMesh ? -0.8 : -0.3;

    // Keep off-hand arm at side
    this._leftUpperArm.rotation.x = 0.05;
    this._leftUpperArm.rotation.z = 0.35;
    this._leftForearm.rotation.x = -0.2;

    // Arm pulled back ready to swing — lerp from idle to target
    switch (dir) {
      case CombatDirection.LEFT_SWING:
        this._spine.rotation.y = 0.5 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-1.2 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (0.6 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-1.2 - idleForearmX) * progress;
        break;
      case CombatDirection.RIGHT_SWING:
        this._spine.rotation.y = -0.5 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-1.2 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (-0.8 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-1.2 - idleForearmX) * progress;
        break;
      case CombatDirection.OVERHEAD:
        this._spine.rotation.x = -0.1 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-2.8 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (-0.2 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-0.6 - idleForearmX) * progress;
        break;
      case CombatDirection.STAB:
        this._spine.rotation.y = 0.2 * progress;
        this._rightUpperArm.rotation.x = idleArmX + (-0.6 - idleArmX) * progress;
        this._rightUpperArm.rotation.z = idleArmZ + (-0.3 - idleArmZ) * progress;
        this._rightForearm.rotation.x = idleForearmX + (-2.0 - idleForearmX) * progress;
        break;
    }
  }

  private _animateRelease(fighter: WarbandFighter): void {
    const dir = fighter.attackDirection;
    const progress = 1 - fighter.stateTimer / WB.RELEASE_TICKS_BASE;

    // Keep off-hand arm at side
    this._leftUpperArm.rotation.x = 0.05;
    this._leftUpperArm.rotation.z = 0.35;
    this._leftForearm.rotation.x = -0.2;

    switch (dir) {
      case CombatDirection.LEFT_SWING:
        // Swing from right to left (left swing from attacker's perspective)
        this._spine.rotation.y = 0.5 - 1.2 * progress;
        this._rightUpperArm.rotation.x = -1.2 + 1.8 * progress;
        this._rightUpperArm.rotation.z = 0.6 - 1.6 * progress;
        this._rightForearm.rotation.x = -1.2 + 1.0 * progress;
        break;
      case CombatDirection.RIGHT_SWING:
        // Swing from left to right
        this._spine.rotation.y = -0.5 + 1.2 * progress;
        this._rightUpperArm.rotation.x = -1.2 + 1.8 * progress;
        this._rightUpperArm.rotation.z = -0.8 + 1.6 * progress;
        this._rightForearm.rotation.x = -1.2 + 1.0 * progress;
        break;
      case CombatDirection.OVERHEAD:
        // Chop downward
        this._spine.rotation.x = -0.1 + 0.4 * progress;
        this._rightUpperArm.rotation.x = -2.8 + 3.4 * progress;
        this._rightUpperArm.rotation.z = -0.2;
        this._rightForearm.rotation.x = -0.6 - 0.3 * progress;
        break;
      case CombatDirection.STAB:
        // Thrust forward
        this._spine.rotation.y = 0.2 - 0.2 * progress;
        this._rightUpperArm.rotation.x = -0.6 - 0.8 * progress;
        this._rightUpperArm.rotation.z = -0.3 + 0.3 * progress;
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
    // Keep off-hand arm at side
    this._leftUpperArm.rotation.x = 0.05;
    this._leftUpperArm.rotation.z = 0.35;
    this._leftForearm.rotation.x = -0.2;
  }

  private _animateBlock(fighter: WarbandFighter): void {
    const dir = fighter.blockDirection;
    const b = this._poseBlend; // smooth blend-in

    // Idle reference values (match _animateIdle — arms pushed outward)
    const lArmXIdle = 0.05;
    const lArmZIdle = 0.35;
    const lForeXIdle = -0.2;
    const rArmXIdle = this._weaponMesh ? -0.4 : 0.1;
    const rArmZIdle = this._weaponMesh ? -0.45 : -0.35;
    const rForeXIdle = this._weaponMesh ? -0.8 : -0.3;

    const lerp = (from: number, to: number) => from + (to - from) * b;

    // Raise shield/weapon to block in direction
    switch (dir) {
      case CombatDirection.LEFT_SWING:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -1.3);
        this._leftUpperArm.rotation.z = lerp(lArmZIdle, 0.3);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -0.8);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -1.0);
        this._rightForearm.rotation.x = lerp(rForeXIdle, -1.2);
        break;
      case CombatDirection.RIGHT_SWING:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -1.0);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -1.2);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -1.3);
        this._rightUpperArm.rotation.z = lerp(rArmZIdle, -0.5);
        this._rightForearm.rotation.x = lerp(rForeXIdle, -0.8);
        break;
      case CombatDirection.OVERHEAD:
        this._leftUpperArm.rotation.x = lerp(lArmXIdle, -2.0);
        this._leftUpperArm.rotation.z = lerp(lArmZIdle, 0.2);
        this._leftForearm.rotation.x = lerp(lForeXIdle, -0.5);
        this._rightUpperArm.rotation.x = lerp(rArmXIdle, -2.0);
        this._rightUpperArm.rotation.z = lerp(rArmZIdle, -0.3);
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
    this._leftUpperArm.rotation.z = 0.35;
  }

  private _animateDrawBow(fighter: WarbandFighter): void {
    // Right arm holds bow forward — always the same pose
    this._rightUpperArm.rotation.x = -1.4;
    this._rightUpperArm.rotation.z = -0.2;
    this._rightForearm.rotation.x = -0.1;

    // Left arm hangs naturally — just slight raise, no bow involvement
    this._leftUpperArm.rotation.x = -0.3;
    this._leftUpperArm.rotation.z = 0.35;
    this._leftForearm.rotation.x = -0.3;

    // Animate the bow string V-shape: only the center vertex (index 1) moves along X
    if (this._bowStringLine && this._bowR > 0) {
      const restX = this._bowStringRestX;
      const pullX = restX - this._bowR * 0.45;

      let centerX = restX;
      if (
        fighter.combatState === FighterCombatState.DRAWING ||
        fighter.combatState === FighterCombatState.AIMING
      ) {
        const t = fighter.combatState === FighterCombatState.AIMING
          ? 1
          : Math.min(1, 1 - fighter.stateTimer / 20);
        centerX = restX + (pullX - restX) * t;
      } else if (fighter.combatState === FighterCombatState.RELEASING) {
        const t = Math.min(1, 1 - fighter.stateTimer / 8);
        const overshoot = restX + (restX - pullX) * 0.15 * Math.max(0, 1 - t * 3);
        centerX = pullX + (overshoot - pullX) * t;
      }

      const pos = this._bowStringLine.geometry.attributes.position as THREE.BufferAttribute;
      pos.setX(1, centerX); // only move the center vertex
      pos.needsUpdate = true;
    }
  }

  private _animateDead(): void {
    // Fallen pose
    this._root.rotation.x = -Math.PI / 2;
    this._root.position.y = 0.15;
    this._leftUpperArm.rotation.x = -0.5;
    this._leftUpperArm.rotation.z = 0.35;
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
