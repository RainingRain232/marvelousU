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
const JOINT_RADIUS = 0.038;
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

  // HP bar
  private _hpBarBg: THREE.Mesh;
  private _hpBarFill: THREE.Mesh;

  // Armor overlays
  private _armorMeshes: THREE.Mesh[] = [];

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
    this._hips.position.y = THIGH_LEN + SHIN_LEN + FOOT_HEIGHT; // hip height

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

    // ---- Torso: tapered shape (wider at shoulders, narrower at waist) ----
    // Use a custom geometry for a more natural shape
    const torsoGeo = new THREE.CylinderGeometry(
      TORSO_WIDTH * 0.52, // top radius (shoulders)
      TORSO_WIDTH * 0.4,  // bottom radius (waist)
      TORSO_HEIGHT, 8,
    );
    const torsoMesh = new THREE.Mesh(torsoGeo, tunicMat);
    torsoMesh.position.y = TORSO_HEIGHT / 2;
    torsoMesh.castShadow = true;
    this._chest.add(torsoMesh);

    // Chest detail: slight front pectoral bulge
    const chestDetailGeo = new THREE.SphereGeometry(TORSO_WIDTH * 0.38, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const chestDetailMesh = new THREE.Mesh(chestDetailGeo, tunicMat);
    chestDetailMesh.position.set(0, TORSO_HEIGHT * 0.7, TORSO_DEPTH * 0.15);
    chestDetailMesh.scale.set(1, 0.6, 0.5);
    this._chest.add(chestDetailMesh);

    // Shoulder caps (rounded balls at shoulder joints)
    for (const side of [-1, 1]) {
      const capGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS, 6, 5);
      const cap = new THREE.Mesh(capGeo, tunicMat);
      cap.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT - 0.01, 0);
      cap.castShadow = true;
      this._chest.add(cap);
    }

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

    // Hair (cap on top)
    const hairGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.06, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMat = new THREE.MeshStandardMaterial({
      color: this._colors.hair,
      roughness: 0.9,
    });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = HEAD_RADIUS;
    hairMesh.scale.set(1, 1.12, 0.95);
    this._headBone.add(hairMesh);

    // Ears (small bumps)
    const earGeo = new THREE.SphereGeometry(0.025, 4, 3);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * HEAD_RADIUS * 0.92, HEAD_RADIUS * 0.95, 0);
      ear.scale.set(0.5, 0.7, 0.6);
      this._headBone.add(ear);
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
      const eyePupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      eyePupil.position.set(side * 0.038, HEAD_RADIUS * 1.0, HEAD_RADIUS * 0.84);
      this._headBone.add(eyePupil);
    }

    // Nose (small cone)
    const noseGeo = new THREE.ConeGeometry(0.015, 0.03, 4);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0, HEAD_RADIUS * 0.82, HEAD_RADIUS * 0.9);
    noseMesh.rotation.x = Math.PI * 0.6;
    this._headBone.add(noseMesh);

    // ---- Arms ----
    // Left arm
    this._leftUpperArm = this._makeBoneGroup();
    this._leftUpperArm.position.set(-SHOULDER_WIDTH, TORSO_HEIGHT - 0.02, 0);
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

    // Right arm
    this._rightUpperArm = this._makeBoneGroup();
    this._rightUpperArm.position.set(SHOULDER_WIDTH, TORSO_HEIGHT - 0.02, 0);
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
    this._leftThigh.add(this._leftFoot);
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
    this._rightThigh.add(this._rightFoot);
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

    // Fingers (tiny cylinder group)
    const fingerGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.04, 3);
    const fingerMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.set((i - 1.5) * 0.016, -HAND_SIZE * 0.5, 0.02);
      finger.rotation.x = 0.3;
      parent.add(finger);
    }
  }

  private _addFoot(parent: THREE.Group, color: number): void {
    // Ankle joint
    this._addJoint(parent, color);
    // Boot shape: rounded box, slightly pointed at front
    const geo = new THREE.BoxGeometry(0.075, FOOT_HEIGHT, FOOT_LEN);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -FOOT_HEIGHT / 2, FOOT_LEN * 0.2);
    mesh.castShadow = true;
    parent.add(mesh);
    // Toe cap (rounded front)
    const toeGeo = new THREE.SphereGeometry(0.035, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const toeMesh = new THREE.Mesh(toeGeo, mat);
    toeMesh.rotation.x = -Math.PI / 2;
    toeMesh.position.set(0, -FOOT_HEIGHT * 0.4, FOOT_LEN * 0.58);
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

      // Handle
      const handleGeo = new THREE.CylinderGeometry(0.02, 0.025, handleLen, 6);
      const handleMat = new THREE.MeshStandardMaterial({
        color: wpn.accentColor ?? 0x654321,
        roughness: 0.7,
      });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.y = handleLen / 2;
      weaponGroup.add(handle);

      // Blade
      let bladeGeo: THREE.BufferGeometry;
      if (wpn.category === "polearm") {
        // Long shaft + small head
        const shaftGeo = new THREE.CylinderGeometry(0.018, 0.018, bladeLen * 0.8, 6);
        const shaft = new THREE.Mesh(shaftGeo, handleMat);
        shaft.position.y = handleLen + bladeLen * 0.4;
        weaponGroup.add(shaft);

        bladeGeo = new THREE.ConeGeometry(0.04, bladeLen * 0.2, 4);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: wpn.color,
          roughness: 0.3,
          metalness: 0.7,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = handleLen + bladeLen * 0.9;
        blade.castShadow = true;
        weaponGroup.add(blade);
      } else {
        // Sword/axe/mace blade
        const isAxeOrMace = wpn.id.includes("axe") || wpn.id.includes("mace") || wpn.id.includes("hammer") || wpn.id.includes("morning");
        if (isAxeOrMace) {
          bladeGeo = new THREE.BoxGeometry(0.08, bladeLen * 0.3, 0.02);
        } else {
          bladeGeo = new THREE.BoxGeometry(0.035, bladeLen, 0.01);
        }
        const bladeMat = new THREE.MeshStandardMaterial({
          color: wpn.color,
          roughness: 0.3,
          metalness: 0.7,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = handleLen + bladeLen / 2;
        blade.castShadow = true;
        weaponGroup.add(blade);
      }

      // Cross guard for swords
      if (wpn.id.includes("sword") || wpn.id.includes("falchion")) {
        const guardGeo = new THREE.BoxGeometry(0.1, 0.015, 0.025);
        const guardMat = new THREE.MeshStandardMaterial({
          color: 0xaaaa55,
          roughness: 0.4,
          metalness: 0.6,
        });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = handleLen;
        weaponGroup.add(guard);
      }

      // Use the group as a single mesh wrapper
      const dummyGeo = new THREE.BufferGeometry();
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      this._weaponMesh = new THREE.Mesh(dummyGeo, dummyMat);
      this._weaponMesh.add(weaponGroup);
      this._rightHand.add(this._weaponMesh);
    } else if (isRangedWeapon(wpn)) {
      // Bow: curved shape
      const bowGeo = new THREE.TorusGeometry(wpn.length * 0.4, 0.015, 4, 8, Math.PI);
      const bowMat = new THREE.MeshStandardMaterial({
        color: wpn.color,
        roughness: 0.7,
      });
      this._weaponMesh = new THREE.Mesh(bowGeo, bowMat);
      this._weaponMesh.rotation.z = Math.PI / 2;
      this._weaponMesh.position.y = 0.1;
      this._weaponMesh.castShadow = true;
      this._rightHand.add(this._weaponMesh);

      // Bow string
      const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, wpn.length * 0.7, 2);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0xddddcc });
      const string = new THREE.Mesh(stringGeo, stringMat);
      string.position.y = 0.1;
      this._weaponMesh.add(string);
    }

    // Shield on left hand
    if (this._shieldMesh) {
      this._leftHand.remove(this._shieldMesh);
      this._shieldMesh.geometry.dispose();
      (this._shieldMesh.material as THREE.Material).dispose();
      this._shieldMesh = null;
    }

    const shield = fighter.equipment.offHand;
    if (shield && shield.category === "shield") {
      const shieldGeo = new THREE.CircleGeometry(shield.length, 8);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: shield.color,
        roughness: 0.6,
        metalness: 0.3,
        side: THREE.DoubleSide,
      });
      this._shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      this._shieldMesh.position.set(0, 0, 0.1);
      this._shieldMesh.castShadow = true;
      this._leftHand.add(this._shieldMesh);

      // Shield boss
      if (shield.accentColor) {
        const bossGeo = new THREE.SphereGeometry(shield.length * 0.2, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        const bossMat = new THREE.MeshStandardMaterial({
          color: shield.accentColor,
          roughness: 0.3,
          metalness: 0.7,
        });
        const boss = new THREE.Mesh(bossGeo, bossMat);
        boss.position.z = 0.1;
        this._shieldMesh.add(boss);
      }
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

    // Head armor (helm wraps over the oval head)
    if (armor.head) {
      const helmGeo = new THREE.SphereGeometry(HEAD_RADIUS * 1.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7);
      const helmMat = new THREE.MeshStandardMaterial({
        color: armor.head.color,
        roughness: 0.4,
        metalness: 0.6,
      });
      const helm = new THREE.Mesh(helmGeo, helmMat);
      helm.position.y = HEAD_RADIUS;
      helm.scale.set(1, 1.12, 0.95); // match head oval
      helm.castShadow = true;
      this._headBone.add(helm);
      this._armorMeshes.push(helm);

      // Nose guard for heavier helms
      if (armor.head.defense >= 14) {
        const noseGuardGeo = new THREE.BoxGeometry(0.015, 0.08, 0.02);
        const noseGuard = new THREE.Mesh(noseGuardGeo, helmMat);
        noseGuard.position.set(0, HEAD_RADIUS * 0.85, HEAD_RADIUS * 0.92);
        this._headBone.add(noseGuard);
        this._armorMeshes.push(noseGuard);
      }
    }

    // Torso armor (cylindrical, slightly larger than body)
    if (armor.torso) {
      const armorGeo = new THREE.CylinderGeometry(
        TORSO_WIDTH * 0.56, // top (shoulders)
        TORSO_WIDTH * 0.44, // bottom (waist)
        TORSO_HEIGHT + 0.02, 8,
      );
      const armorMat = new THREE.MeshStandardMaterial({
        color: armor.torso.color,
        roughness: 0.4,
        metalness: 0.5,
      });
      const armorMesh = new THREE.Mesh(armorGeo, armorMat);
      armorMesh.position.y = TORSO_HEIGHT / 2;
      armorMesh.castShadow = true;
      this._chest.add(armorMesh);
      this._armorMeshes.push(armorMesh);

      // Shoulder pauldrons for heavier armor
      if (armor.torso.defense >= 18) {
        for (const side of [-1, 1]) {
          const pauldronGeo = new THREE.SphereGeometry(SHOULDER_CAP_RADIUS * 1.4, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.6);
          const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
          pauldron.position.set(side * SHOULDER_WIDTH, TORSO_HEIGHT, 0);
          pauldron.castShadow = true;
          this._chest.add(pauldron);
          this._armorMeshes.push(pauldron);
        }
      }
    }

    // Gauntlets (cover forearm and hand)
    if (armor.gauntlets) {
      for (const [forearm, hand] of [[this._leftForearm, this._leftHand], [this._rightForearm, this._rightHand]]) {
        // Forearm guard
        const fGeo = new THREE.CylinderGeometry(LIMB_THICKNESS + 0.012, LIMB_THICKNESS + 0.008, FOREARM_LEN * 0.7, 6);
        const fMat = new THREE.MeshStandardMaterial({
          color: armor.gauntlets.color,
          roughness: 0.4,
          metalness: 0.5,
        });
        const fMesh = new THREE.Mesh(fGeo, fMat);
        fMesh.position.y = -FOREARM_LEN * 0.35;
        forearm.add(fMesh);
        this._armorMeshes.push(fMesh);

        // Hand cover
        const gGeo = new THREE.SphereGeometry(HAND_SIZE * 1.25, 5, 4);
        const gMesh = new THREE.Mesh(gGeo, fMat);
        gMesh.position.y = -HAND_SIZE * 0.3;
        gMesh.scale.set(1, 0.7, 1.1);
        gMesh.castShadow = true;
        hand.add(gMesh);
        this._armorMeshes.push(gMesh);
      }
    }

    // Leg armor (thigh + shin guards)
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
      for (const shin of [this._leftShin, this._rightShin]) {
        const sGeo = new THREE.CylinderGeometry(LIMB_THICKNESS + 0.008, LIMB_THICKNESS * 0.85 + 0.006, SHIN_LEN * 0.8, 7);
        const sMesh = new THREE.Mesh(sGeo, lMat);
        sMesh.position.y = -SHIN_LEN * 0.4;
        shin.add(sMesh);
        this._armorMeshes.push(sMesh);
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
        const bGeo = new THREE.BoxGeometry(0.09, FOOT_HEIGHT + 0.02, FOOT_LEN + 0.03);
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(0, -FOOT_HEIGHT / 2, FOOT_LEN * 0.2);
        bMesh.castShadow = true;
        foot.add(bMesh);
        this._armorMeshes.push(bMesh);
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

    // Arms resting at sides
    this._leftUpperArm.rotation.x = 0.1;
    this._leftUpperArm.rotation.z = 0.15;
    this._leftForearm.rotation.x = -0.3;
    this._rightUpperArm.rotation.x = 0.1;
    this._rightUpperArm.rotation.z = -0.15;
    this._rightForearm.rotation.x = -0.3;

    // Weapon ready position
    if (this._weaponMesh) {
      this._rightUpperArm.rotation.x = -0.4;
      this._rightUpperArm.rotation.z = -0.3;
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
    const progress = 1 - fighter.stateTimer / WB.WINDUP_TICKS_BASE;

    // Torso twist for windup
    switch (dir) {
      case CombatDirection.TOP_LEFT:
        this._spine.rotation.y = -0.4 * progress;
        this._rightUpperArm.rotation.x = -1.5 * progress;
        this._rightUpperArm.rotation.z = -0.8 * progress;
        this._rightForearm.rotation.x = -1.0 * progress;
        break;
      case CombatDirection.TOP_RIGHT:
        this._spine.rotation.y = 0.4 * progress;
        this._rightUpperArm.rotation.x = -1.5 * progress;
        this._rightUpperArm.rotation.z = 0.4 * progress;
        this._rightForearm.rotation.x = -1.0 * progress;
        break;
      case CombatDirection.BOTTOM_LEFT:
        this._spine.rotation.y = -0.3 * progress;
        this._spine.rotation.x = 0.2 * progress;
        this._rightUpperArm.rotation.x = 0.5 * progress;
        this._rightUpperArm.rotation.z = -0.6 * progress;
        this._rightForearm.rotation.x = -0.5 * progress;
        break;
      case CombatDirection.BOTTOM_RIGHT:
        this._spine.rotation.y = 0.3 * progress;
        this._spine.rotation.x = 0.2 * progress;
        this._rightUpperArm.rotation.x = 0.5 * progress;
        this._rightUpperArm.rotation.z = 0.6 * progress;
        this._rightForearm.rotation.x = -0.5 * progress;
        break;
    }
  }

  private _animateRelease(fighter: WarbandFighter): void {
    const dir = fighter.attackDirection;
    const progress = 1 - fighter.stateTimer / WB.RELEASE_TICKS_BASE;

    // Fast swing in attack direction
    switch (dir) {
      case CombatDirection.TOP_LEFT:
        this._spine.rotation.y = -0.4 + 1.0 * progress;
        this._rightUpperArm.rotation.x = -1.5 + 2.5 * progress;
        this._rightUpperArm.rotation.z = -0.8 + 1.2 * progress;
        this._rightForearm.rotation.x = -1.0 + 1.5 * progress;
        break;
      case CombatDirection.TOP_RIGHT:
        this._spine.rotation.y = 0.4 - 1.0 * progress;
        this._rightUpperArm.rotation.x = -1.5 + 2.5 * progress;
        this._rightUpperArm.rotation.z = 0.4 - 1.2 * progress;
        this._rightForearm.rotation.x = -1.0 + 1.5 * progress;
        break;
      case CombatDirection.BOTTOM_LEFT:
        this._spine.rotation.y = -0.3 + 0.8 * progress;
        this._rightUpperArm.rotation.x = 0.5 - 1.5 * progress;
        this._rightUpperArm.rotation.z = -0.6 + 1.0 * progress;
        this._rightForearm.rotation.x = -0.5 - 0.5 * progress;
        break;
      case CombatDirection.BOTTOM_RIGHT:
        this._spine.rotation.y = 0.3 - 0.8 * progress;
        this._rightUpperArm.rotation.x = 0.5 - 1.5 * progress;
        this._rightUpperArm.rotation.z = 0.6 - 1.0 * progress;
        this._rightForearm.rotation.x = -0.5 - 0.5 * progress;
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

    // Raise shield/weapon to block in direction
    switch (dir) {
      case CombatDirection.TOP_LEFT:
        this._leftUpperArm.rotation.x = -1.3;
        this._leftUpperArm.rotation.z = 0.5;
        this._leftForearm.rotation.x = -0.8;
        this._rightUpperArm.rotation.x = -1.0;
        this._rightForearm.rotation.x = -1.2;
        break;
      case CombatDirection.TOP_RIGHT:
        this._leftUpperArm.rotation.x = -1.0;
        this._leftForearm.rotation.x = -1.2;
        this._rightUpperArm.rotation.x = -1.3;
        this._rightUpperArm.rotation.z = -0.5;
        this._rightForearm.rotation.x = -0.8;
        break;
      case CombatDirection.BOTTOM_LEFT:
        this._leftUpperArm.rotation.x = 0.3;
        this._leftUpperArm.rotation.z = 0.4;
        this._leftForearm.rotation.x = -0.5;
        this._rightUpperArm.rotation.x = 0.2;
        this._rightForearm.rotation.x = -0.5;
        break;
      case CombatDirection.BOTTOM_RIGHT:
        this._leftUpperArm.rotation.x = 0.2;
        this._leftForearm.rotation.x = -0.5;
        this._rightUpperArm.rotation.x = 0.3;
        this._rightUpperArm.rotation.z = -0.4;
        this._rightForearm.rotation.x = -0.5;
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
    this._leftUpperArm.rotation.z = 0.2;
    this._leftForearm.rotation.x = -0.1;
    this._rightUpperArm.rotation.x = -1.4;
    this._rightUpperArm.rotation.z = -0.3;
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
