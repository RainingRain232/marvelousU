// ---------------------------------------------------------------------------
// Tekken mode – 3D skeleton-based fighter renderer (32 bones)
// Procedural meshes: cylinders, spheres, boxes — no external models.
// Enhanced bone hierarchy for fluid martial arts animation.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { TekkenFighterState } from "../../types";
import type { TekkenFighter } from "../state/TekkenState";
import type { TekkenCharacterDef } from "../state/TekkenState";
import type { TekkenSceneManager } from "./TekkenSceneManager";

// ---- Bone constants -------------------------------------------------------

const HEAD_RADIUS = 0.13;
const NECK_LEN = 0.07;
const NECK_RADIUS = 0.04;
const CHEST_WIDTH = 0.34;
const CHEST_HEIGHT = 0.24;
const CHEST_DEPTH = 0.18;
const LOWER_TORSO_HEIGHT = 0.16;
const LOWER_TORSO_WIDTH = 0.28;
const CLAVICLE_LEN = 0.10;
const UPPER_ARM_LEN = 0.26;
const FOREARM_LEN = 0.24;
const HAND_LEN = 0.09;
const FINGER_LEN = 0.05;
const THIGH_LEN = 0.38;
const SHIN_LEN = 0.36;
const ANKLE_LEN = 0.04;
const FOOT_LEN = 0.20;
const FOOT_HEIGHT = 0.05;
const TOE_LEN = 0.07;
const LIMB_THICKNESS = 0.05;
const JOINT_RADIUS = 0.032;

// ---- Materials helper -----------------------------------------------------

function makeMat(color: number, metalness = 0, roughness = 0.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

// ---- Limb helper ----------------------------------------------------------

function makeLimb(len: number, thickness: number, mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(thickness, thickness * 0.9, len, 8);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function makeJoint(radius: number, mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), mat);
  mesh.castShadow = true;
  return mesh;
}

// ---- Fighter Mesh ---------------------------------------------------------

export class TekkenFighterRenderer {
  group: THREE.Group;

  // Bone hierarchy (32 bones)
  private _root: THREE.Group;
  private _hips: THREE.Group;
  private _spineLower: THREE.Group;
  private _spineUpper: THREE.Group;
  private _chest: THREE.Group;
  private _neck: THREE.Group;
  private _head: THREE.Group;
  private _jaw: THREE.Group;

  // Left arm chain
  private _leftClavicle: THREE.Group;
  private _leftUpperArm: THREE.Group;
  private _leftForearm: THREE.Group;
  private _leftHand: THREE.Group;
  private _leftFingers: THREE.Group;
  private _leftThumb: THREE.Group;

  // Right arm chain
  private _rightClavicle: THREE.Group;
  private _rightUpperArm: THREE.Group;
  private _rightForearm: THREE.Group;
  private _rightHand: THREE.Group;
  private _rightFingers: THREE.Group;
  private _rightThumb: THREE.Group;

  // Left leg chain
  private _leftThigh: THREE.Group;
  private _leftShin: THREE.Group;
  private _leftAnkle: THREE.Group;
  private _leftFoot: THREE.Group;
  private _leftToes: THREE.Group;

  // Right leg chain
  private _rightThigh: THREE.Group;
  private _rightShin: THREE.Group;
  private _rightAnkle: THREE.Group;
  private _rightFoot: THREE.Group;
  private _rightToes: THREE.Group;

  // Materials
  private _skinMat: THREE.MeshStandardMaterial;
  private _armorMat: THREE.MeshStandardMaterial;
  private _clothMat: THREE.MeshStandardMaterial;
  private _accentMat: THREE.MeshStandardMaterial;
  private _hairMat: THREE.MeshStandardMaterial;
  private _leatherMat: THREE.MeshStandardMaterial;

  // Animation state
  private _blendSpeed = 0.15;
  private _lastState: TekkenFighterState = TekkenFighterState.IDLE;
  private _idleTime = 0;
  private _walkCycle = 0;
  private _attackFrame = 0;

  constructor(sceneManager: TekkenSceneManager, charDef: TekkenCharacterDef, _playerIndex: number) {
    this.group = new THREE.Group();

    // Create materials based on character colors
    this._skinMat = makeMat(charDef.colors.skin, 0, 0.55);
    this._armorMat = new THREE.MeshStandardMaterial({
      color: charDef.colors.primary, metalness: 0.8, roughness: 0.25,
      envMapIntensity: 1.5,
    });
    this._clothMat = makeMat(charDef.colors.secondary, 0, 0.85);
    this._accentMat = makeMat(charDef.colors.accent, 0.5, 0.4);
    this._hairMat = makeMat(charDef.colors.hair, 0, 0.9);
    this._leatherMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e, metalness: 0.1, roughness: 0.7,
    });

    // Build skeleton hierarchy
    this._root = new THREE.Group();
    this.group.add(this._root);

    // Hips (base of skeleton)
    this._hips = new THREE.Group();
    this._root.add(this._hips);
    this._hips.position.y = THIGH_LEN + SHIN_LEN + ANKLE_LEN + FOOT_HEIGHT;

    // Lower spine
    this._spineLower = new THREE.Group();
    this._hips.add(this._spineLower);
    this._spineLower.position.y = 0.02;

    // Upper spine
    this._spineUpper = new THREE.Group();
    this._spineLower.add(this._spineUpper);
    this._spineUpper.position.y = LOWER_TORSO_HEIGHT;

    // Chest
    this._chest = new THREE.Group();
    this._spineUpper.add(this._chest);

    // Neck
    this._neck = new THREE.Group();
    this._chest.add(this._neck);
    this._neck.position.y = CHEST_HEIGHT;

    // Head
    this._head = new THREE.Group();
    this._neck.add(this._head);
    this._head.position.y = NECK_LEN;

    // Jaw (sub-bone of head for hit reactions)
    this._jaw = new THREE.Group();
    this._head.add(this._jaw);
    this._jaw.position.y = -HEAD_RADIUS * 0.3;

    // ---- Arms ----
    // Left clavicle
    this._leftClavicle = new THREE.Group();
    this._chest.add(this._leftClavicle);
    this._leftClavicle.position.set(CHEST_WIDTH * 0.45, CHEST_HEIGHT * 0.9, 0);

    this._leftUpperArm = new THREE.Group();
    this._leftClavicle.add(this._leftUpperArm);
    this._leftUpperArm.position.x = CLAVICLE_LEN;

    this._leftForearm = new THREE.Group();
    this._leftUpperArm.add(this._leftForearm);
    this._leftForearm.position.y = -UPPER_ARM_LEN;

    this._leftHand = new THREE.Group();
    this._leftForearm.add(this._leftHand);
    this._leftHand.position.y = -FOREARM_LEN;

    this._leftFingers = new THREE.Group();
    this._leftHand.add(this._leftFingers);
    this._leftFingers.position.y = -HAND_LEN * 0.7;

    this._leftThumb = new THREE.Group();
    this._leftHand.add(this._leftThumb);
    this._leftThumb.position.set(0.02, -HAND_LEN * 0.3, 0.02);

    // Right clavicle
    this._rightClavicle = new THREE.Group();
    this._chest.add(this._rightClavicle);
    this._rightClavicle.position.set(-CHEST_WIDTH * 0.45, CHEST_HEIGHT * 0.9, 0);

    this._rightUpperArm = new THREE.Group();
    this._rightClavicle.add(this._rightUpperArm);
    this._rightUpperArm.position.x = -CLAVICLE_LEN;

    this._rightForearm = new THREE.Group();
    this._rightUpperArm.add(this._rightForearm);
    this._rightForearm.position.y = -UPPER_ARM_LEN;

    this._rightHand = new THREE.Group();
    this._rightForearm.add(this._rightHand);
    this._rightHand.position.y = -FOREARM_LEN;

    this._rightFingers = new THREE.Group();
    this._rightHand.add(this._rightFingers);
    this._rightFingers.position.y = -HAND_LEN * 0.7;

    this._rightThumb = new THREE.Group();
    this._rightHand.add(this._rightThumb);
    this._rightThumb.position.set(-0.02, -HAND_LEN * 0.3, 0.02);

    // ---- Legs ----
    const hipWidth = LOWER_TORSO_WIDTH * 0.35;

    // Left leg
    this._leftThigh = new THREE.Group();
    this._hips.add(this._leftThigh);
    this._leftThigh.position.set(hipWidth, -0.02, 0);

    this._leftShin = new THREE.Group();
    this._leftThigh.add(this._leftShin);
    this._leftShin.position.y = -THIGH_LEN;

    this._leftAnkle = new THREE.Group();
    this._leftShin.add(this._leftAnkle);
    this._leftAnkle.position.y = -SHIN_LEN;

    this._leftFoot = new THREE.Group();
    this._leftAnkle.add(this._leftFoot);
    this._leftFoot.position.y = -ANKLE_LEN;

    this._leftToes = new THREE.Group();
    this._leftFoot.add(this._leftToes);
    this._leftToes.position.z = FOOT_LEN * 0.5;

    // Right leg
    this._rightThigh = new THREE.Group();
    this._hips.add(this._rightThigh);
    this._rightThigh.position.set(-hipWidth, -0.02, 0);

    this._rightShin = new THREE.Group();
    this._rightThigh.add(this._rightShin);
    this._rightShin.position.y = -THIGH_LEN;

    this._rightAnkle = new THREE.Group();
    this._rightShin.add(this._rightAnkle);
    this._rightAnkle.position.y = -SHIN_LEN;

    this._rightFoot = new THREE.Group();
    this._rightAnkle.add(this._rightFoot);
    this._rightFoot.position.y = -ANKLE_LEN;

    this._rightToes = new THREE.Group();
    this._rightFoot.add(this._rightToes);
    this._rightToes.position.z = FOOT_LEN * 0.5;

    // ---- Build meshes on bones ----
    this._buildMeshes();

    sceneManager.scene.add(this.group);
  }

  private _buildMeshes(): void {
    // Head sphere
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS, 12, 10),
      this._skinMat,
    );
    headMesh.castShadow = true;
    headMesh.position.y = HEAD_RADIUS * 0.7;
    this._head.add(headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.018, 6, 4);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilGeo = new THREE.SphereGeometry(0.01, 6, 4);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.04, HEAD_RADIUS * 0.8, HEAD_RADIUS * 0.75);
      this._head.add(eye);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.04, HEAD_RADIUS * 0.8, HEAD_RADIUS * 0.78);
      this._head.add(pupil);

      // Eyebrow ridge
      const browGeo = new THREE.BoxGeometry(0.03, 0.008, 0.015);
      const browMesh = new THREE.Mesh(browGeo, this._skinMat);
      browMesh.position.set(side * 0.04, HEAD_RADIUS * 0.92, HEAD_RADIUS * 0.78);
      browMesh.castShadow = true;
      this._head.add(browMesh);

      // Ear (flattened sphere on side of head)
      const earGeo = new THREE.SphereGeometry(0.025, 6, 5);
      const earMesh = new THREE.Mesh(earGeo, this._skinMat);
      earMesh.position.set(side * HEAD_RADIUS * 0.95, HEAD_RADIUS * 0.7, 0);
      earMesh.scale.set(0.35, 1, 0.7);
      earMesh.castShadow = true;
      this._head.add(earMesh);
    }

    // Nose (small box protruding from face)
    const noseGeo = new THREE.BoxGeometry(0.018, 0.03, 0.025);
    const noseMesh = new THREE.Mesh(noseGeo, this._skinMat);
    noseMesh.position.set(0, HEAD_RADIUS * 0.65, HEAD_RADIUS * 0.88);
    noseMesh.castShadow = true;
    this._head.add(noseMesh);

    // Jaw with chin point
    const jawMesh = new THREE.Mesh(
      new THREE.BoxGeometry(HEAD_RADIUS * 1.2, HEAD_RADIUS * 0.35, HEAD_RADIUS * 0.9),
      this._skinMat,
    );
    jawMesh.castShadow = true;
    this._jaw.add(jawMesh);

    // Chin point (small tapered box)
    const chinGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.03, 6);
    const chinMesh = new THREE.Mesh(chinGeo, this._skinMat);
    chinMesh.position.set(0, -HEAD_RADIUS * 0.15, HEAD_RADIUS * 0.3);
    chinMesh.rotation.x = 0.3;
    chinMesh.castShadow = true;
    this._jaw.add(chinMesh);

    // Hair (half-sphere on top of head)
    const hairMesh = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS * 1.05, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      this._hairMat,
    );
    hairMesh.position.y = HEAD_RADIUS * 0.75;
    hairMesh.castShadow = true;
    this._head.add(hairMesh);

    // Neck cylinder
    const neckMesh = makeLimb(NECK_LEN, NECK_RADIUS, this._skinMat);
    neckMesh.position.y = 0;
    this._neck.add(neckMesh);

    // Gorget / neck guard
    const gorgetGeo = new THREE.TorusGeometry(NECK_RADIUS * 1.6, 0.015, 6, 12, Math.PI * 1.5);
    const gorgetMesh = new THREE.Mesh(gorgetGeo, this._armorMat);
    gorgetMesh.rotation.x = Math.PI / 2;
    gorgetMesh.rotation.z = -Math.PI * 0.25;
    gorgetMesh.position.set(0, -NECK_LEN * 0.3, 0);
    gorgetMesh.castShadow = true;
    this._neck.add(gorgetMesh);

    // Chest (tapered box shape using cylinder)
    const chestGeo = new THREE.CylinderGeometry(
      CHEST_WIDTH * 0.48, // top radius (shoulders)
      CHEST_WIDTH * 0.38, // bottom radius
      CHEST_HEIGHT,
      8,
    );
    chestGeo.translate(0, CHEST_HEIGHT / 2, 0);
    const chestMesh = new THREE.Mesh(chestGeo, this._armorMat);
    chestMesh.castShadow = true;
    chestMesh.receiveShadow = true;
    this._chest.add(chestMesh);

    // Chest plate detail (front plate overlay)
    const plateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(CHEST_WIDTH * 0.7, CHEST_HEIGHT * 0.8, 0.02),
      this._accentMat,
    );
    plateMesh.position.set(0, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.5 + 0.01);
    plateMesh.castShadow = true;
    this._chest.add(plateMesh);

    // Pectoral definition (two subtle bumps on chest)
    for (const side of [-1, 1]) {
      const pecGeo = new THREE.SphereGeometry(0.05, 8, 6);
      const pecMesh = new THREE.Mesh(pecGeo, this._armorMat);
      pecMesh.position.set(side * 0.06, CHEST_HEIGHT * 0.65, CHEST_DEPTH * 0.38);
      pecMesh.scale.set(1, 0.6, 0.45);
      pecMesh.castShadow = true;
      this._chest.add(pecMesh);
    }

    // Medallion / emblem on chest plate (accent color circle)
    const medallionGeo = new THREE.CircleGeometry(0.025, 12);
    const medallionMesh = new THREE.Mesh(medallionGeo, this._accentMat);
    medallionMesh.position.set(0, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.5 + 0.025);
    medallionMesh.castShadow = true;
    this._chest.add(medallionMesh);

    // Lower torso
    const lowerGeo = new THREE.CylinderGeometry(
      LOWER_TORSO_WIDTH * 0.42,
      LOWER_TORSO_WIDTH * 0.35,
      LOWER_TORSO_HEIGHT,
      8,
    );
    lowerGeo.translate(0, LOWER_TORSO_HEIGHT / 2, 0);
    const lowerMesh = new THREE.Mesh(lowerGeo, this._clothMat);
    lowerMesh.castShadow = true;
    this._spineLower.add(lowerMesh);

    // Abdominal segments (3 horizontal ridges on lower torso)
    for (let i = 0; i < 3; i++) {
      const abGeo = new THREE.BoxGeometry(LOWER_TORSO_WIDTH * 0.55, 0.008, 0.02);
      const abMesh = new THREE.Mesh(abGeo, this._armorMat);
      abMesh.position.set(0, LOWER_TORSO_HEIGHT * (0.25 + i * 0.22), LOWER_TORSO_WIDTH * 0.32);
      abMesh.castShadow = true;
      this._spineLower.add(abMesh);
    }

    // Pelvis/hip area
    const pelvisMesh = new THREE.Mesh(
      new THREE.SphereGeometry(LOWER_TORSO_WIDTH * 0.38, 8, 6),
      this._clothMat,
    );
    pelvisMesh.scale.set(1, 0.6, 0.8);
    pelvisMesh.castShadow = true;
    this._hips.add(pelvisMesh);

    // Layered shoulder pauldrons (3 overlapping plates)
    for (const side of [-1, 1]) {
      const clavicle = side > 0 ? this._leftClavicle : this._rightClavicle;
      const px = side * (CHEST_WIDTH * 0.45 + CLAVICLE_LEN * 0.5);
      for (let layer = 0; layer < 3; layer++) {
        const radius = 0.06 - layer * 0.012;
        const plateGeo = new THREE.SphereGeometry(radius, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const plateMat = layer === 0 ? this._armorMat : this._accentMat;
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(px, 0.01 + layer * 0.015, -layer * 0.01);
        plate.scale.set(1.3, 0.8, 1);
        plate.castShadow = true;
        clavicle.add(plate);
      }
    }

    // Arms
    for (const [upperArm, forearm, hand, fingers, thumb] of [
      [this._leftUpperArm, this._leftForearm, this._leftHand, this._leftFingers, this._leftThumb],
      [this._rightUpperArm, this._rightForearm, this._rightHand, this._rightFingers, this._rightThumb],
    ] as [THREE.Group, THREE.Group, THREE.Group, THREE.Group, THREE.Group][]) {
      // Upper arm
      upperArm.add(makeLimb(UPPER_ARM_LEN, LIMB_THICKNESS, this._skinMat));
      upperArm.add(makeJoint(JOINT_RADIUS, this._skinMat));

      // Elbow guard (small sphere at elbow joint)
      const elbowGuard = new THREE.Mesh(
        new THREE.SphereGeometry(JOINT_RADIUS * 1.4, 8, 6),
        this._armorMat,
      );
      elbowGuard.position.y = -UPPER_ARM_LEN;
      elbowGuard.scale.set(1, 0.8, 1.2);
      elbowGuard.castShadow = true;
      upperArm.add(elbowGuard);

      // Forearm
      forearm.add(makeLimb(FOREARM_LEN, LIMB_THICKNESS * 0.9, this._skinMat));
      forearm.add(makeJoint(JOINT_RADIUS * 0.9, this._skinMat));

      // Bracer (armor on forearm)
      const bracerMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(LIMB_THICKNESS * 1.3, LIMB_THICKNESS * 1.2, FOREARM_LEN * 0.6, 8),
        this._armorMat,
      );
      bracerMesh.position.y = -FOREARM_LEN * 0.35;
      bracerMesh.castShadow = true;
      forearm.add(bracerMesh);

      // Wrist wrap (torus ring at wrist)
      const wristWrap = new THREE.Mesh(
        new THREE.TorusGeometry(LIMB_THICKNESS * 1.1, 0.008, 6, 12),
        this._leatherMat,
      );
      wristWrap.rotation.x = Math.PI / 2;
      wristWrap.position.y = -FOREARM_LEN * 0.9;
      wristWrap.castShadow = true;
      forearm.add(wristWrap);

      // Hand (box for fist)
      const handMesh = new THREE.Mesh(
        new THREE.BoxGeometry(HAND_LEN * 0.8, HAND_LEN, HAND_LEN * 0.7),
        this._skinMat,
      );
      handMesh.position.y = -HAND_LEN * 0.4;
      handMesh.castShadow = true;
      hand.add(handMesh);

      // Knuckle detail (4 small bumps on fist)
      for (let k = 0; k < 4; k++) {
        const knuckle = new THREE.Mesh(
          new THREE.SphereGeometry(0.007, 5, 4),
          this._skinMat,
        );
        knuckle.position.set(
          -0.02 + k * 0.013,
          -HAND_LEN * 0.15,
          HAND_LEN * 0.35,
        );
        knuckle.castShadow = true;
        hand.add(knuckle);
      }

      // Fingers (small box)
      const fingerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FINGER_LEN * 0.6, FINGER_LEN, FINGER_LEN * 0.5),
        this._skinMat,
      );
      fingers.add(fingerMesh);

      // Thumb (small cylinder)
      const thumbMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.01, FINGER_LEN * 0.8, 4),
        this._skinMat,
      );
      thumb.add(thumbMesh);
    }

    // Legs
    for (const [thigh, shin, _ankle, foot, toes] of [
      [this._leftThigh, this._leftShin, this._leftAnkle, this._leftFoot, this._leftToes],
      [this._rightThigh, this._rightShin, this._rightAnkle, this._rightFoot, this._rightToes],
    ] as [THREE.Group, THREE.Group, THREE.Group, THREE.Group, THREE.Group][]) {
      // Thigh
      thigh.add(makeLimb(THIGH_LEN, LIMB_THICKNESS * 1.15, this._clothMat));
      thigh.add(makeJoint(JOINT_RADIUS * 1.1, this._clothMat));

      // Knee pad (half-sphere on front of knee)
      const kneePad = new THREE.Mesh(
        new THREE.SphereGeometry(JOINT_RADIUS * 1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
        this._armorMat,
      );
      kneePad.position.set(0, -THIGH_LEN, LIMB_THICKNESS * 0.5);
      kneePad.rotation.x = -Math.PI / 2;
      kneePad.castShadow = true;
      thigh.add(kneePad);

      // Shin
      shin.add(makeLimb(SHIN_LEN, LIMB_THICKNESS, this._clothMat));
      shin.add(makeJoint(JOINT_RADIUS, this._clothMat));

      // Shin guard (armor)
      const guardMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(LIMB_THICKNESS * 1.2, LIMB_THICKNESS * 1.1, SHIN_LEN * 0.5, 8),
        this._armorMat,
      );
      guardMesh.position.y = -SHIN_LEN * 0.3;
      guardMesh.castShadow = true;
      shin.add(guardMesh);

      // Boot (tapered box for more defined shape)
      const bootGeo = new THREE.BoxGeometry(FOOT_LEN * 0.48, FOOT_HEIGHT * 1.2, FOOT_LEN);
      bootGeo.translate(0, 0, 0);
      const footMesh = new THREE.Mesh(bootGeo, this._armorMat);
      footMesh.position.set(0, -FOOT_HEIGHT / 2, FOOT_LEN * 0.2);
      footMesh.scale.set(1, 1, 1);
      footMesh.castShadow = true;
      foot.add(footMesh);

      // Boot cuff (torus at top of foot / ankle area)
      const bootCuff = new THREE.Mesh(
        new THREE.TorusGeometry(FOOT_LEN * 0.24, 0.012, 6, 12),
        this._leatherMat,
      );
      bootCuff.rotation.x = Math.PI / 2;
      bootCuff.position.set(0, FOOT_HEIGHT * 0.3, FOOT_LEN * 0.05);
      bootCuff.castShadow = true;
      foot.add(bootCuff);

      // Toes
      const toeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FOOT_LEN * 0.4, FOOT_HEIGHT * 0.7, TOE_LEN),
        this._armorMat,
      );
      toeMesh.position.z = TOE_LEN * 0.3;
      toes.add(toeMesh);
    }

    // Belt/waist accent
    const beltMesh = new THREE.Mesh(
      new THREE.TorusGeometry(LOWER_TORSO_WIDTH * 0.38, 0.02, 6, 16),
      this._leatherMat,
    );
    beltMesh.rotation.x = Math.PI / 2;
    beltMesh.position.y = 0.01;
    beltMesh.castShadow = true;
    this._hips.add(beltMesh);

    // Belt buckle (box on front of belt)
    const buckleGeo = new THREE.BoxGeometry(0.04, 0.035, 0.015);
    const buckleMesh = new THREE.Mesh(buckleGeo, this._accentMat);
    buckleMesh.position.set(0, 0.01, LOWER_TORSO_WIDTH * 0.38 + 0.01);
    buckleMesh.castShadow = true;
    this._hips.add(buckleMesh);

    // Short cape / cloak (2-3 flat planes hanging from back of chest)
    for (let c = 0; c < 3; c++) {
      const capeGeo = new THREE.PlaneGeometry(CHEST_WIDTH * 0.5 - c * 0.03, 0.15 + c * 0.06);
      const capeMesh = new THREE.Mesh(capeGeo, this._clothMat);
      capeMesh.position.set(0, CHEST_HEIGHT * 0.3 - c * 0.1, -CHEST_DEPTH * 0.5 - 0.01 - c * 0.005);
      capeMesh.rotation.x = 0.1 + c * 0.05;
      capeMesh.castShadow = true;
      this._chest.add(capeMesh);
    }
  }

  // ---- UPDATE (called every frame) ----

  update(fighter: TekkenFighter): void {
    // Position and facing
    this.group.position.set(fighter.position.x, fighter.position.y, fighter.position.z);
    this.group.rotation.y = fighter.facingRight ? 0 : Math.PI;

    // State change detection
    if (fighter.state !== this._lastState) {
      this._lastState = fighter.state;
      this._attackFrame = 0;
    }

    this._idleTime += 0.016;

    // Animate based on state
    switch (fighter.state) {
      case TekkenFighterState.IDLE:
        this._animateIdle();
        break;
      case TekkenFighterState.WALK_FORWARD:
        this._animateWalk(1);
        break;
      case TekkenFighterState.WALK_BACK:
        this._animateWalk(-1);
        break;
      case TekkenFighterState.CROUCH:
      case TekkenFighterState.CROUCH_IDLE:
        this._animateCrouch();
        break;
      case TekkenFighterState.BLOCK_STAND:
        this._animateBlockStand();
        break;
      case TekkenFighterState.BLOCK_CROUCH:
        this._animateBlockCrouch();
        break;
      case TekkenFighterState.ATTACK:
        this._animateAttack(fighter);
        break;
      case TekkenFighterState.HIT_STUN_HIGH:
        this._animateHitStunHigh();
        break;
      case TekkenFighterState.HIT_STUN_MID:
        this._animateHitStunMid();
        break;
      case TekkenFighterState.HIT_STUN_LOW:
        this._animateHitStunLow();
        break;
      case TekkenFighterState.JUGGLE:
        this._animateJuggle(fighter);
        break;
      case TekkenFighterState.KNOCKDOWN:
        this._animateKnockdown();
        break;
      case TekkenFighterState.GET_UP:
        this._animateGetUp();
        break;
      case TekkenFighterState.DASH_FORWARD:
        this._animateDashForward();
        break;
      case TekkenFighterState.DASH_BACK:
        this._animateDashBack();
        break;
      case TekkenFighterState.VICTORY:
        this._animateVictory();
        break;
      case TekkenFighterState.DEFEAT:
        this._animateDefeat();
        break;
      default:
        this._animateIdle();
        break;
    }
  }

  // ---- ANIMATION METHODS ----

  // Helper: smoothly blend bone rotation toward target
  private _lerpBone(bone: THREE.Group, tx: number, ty: number, tz: number, speed?: number): void {
    const s = speed ?? this._blendSpeed;
    bone.rotation.x += (tx - bone.rotation.x) * s;
    bone.rotation.y += (ty - bone.rotation.y) * s;
    bone.rotation.z += (tz - bone.rotation.z) * s;
  }

  private _animateIdle(): void {
    const t = this._idleTime;
    const breathe = Math.sin(t * 2.2) * 0.015;
    const sway = Math.sin(t * 1.5) * 0.02;

    // Subtle weight shift
    this._lerpBone(this._hips, 0, 0, sway);
    this._lerpBone(this._spineLower, breathe * 0.5, 0, -sway * 0.5);
    this._lerpBone(this._spineUpper, breathe, 0, 0);
    this._lerpBone(this._chest, 0.03, 0, 0);
    this._lerpBone(this._neck, -0.05, 0, 0);
    this._lerpBone(this._head, 0, 0, 0);
    this._lerpBone(this._jaw, 0, 0, 0);

    // Fighting stance arms - guard position
    // Left arm forward (lead hand)
    this._lerpBone(this._leftClavicle, 0, 0, 0.1);
    this._lerpBone(this._leftUpperArm, -0.3, 0, 0.8);
    this._lerpBone(this._leftForearm, -1.4, 0, 0);
    this._lerpBone(this._leftHand, -0.2, 0, 0);
    this._lerpBone(this._leftFingers, -0.5, 0, 0);

    // Right arm back (rear hand)
    this._lerpBone(this._rightClavicle, 0, 0, -0.1);
    this._lerpBone(this._rightUpperArm, -0.4, 0, -0.9);
    this._lerpBone(this._rightForearm, -1.5, 0, 0);
    this._lerpBone(this._rightHand, -0.2, 0, 0);
    this._lerpBone(this._rightFingers, -0.5, 0, 0);

    // Legs - slightly bent fighting stance
    const stanceShift = Math.sin(t * 1.5) * 0.02;
    this._lerpBone(this._leftThigh, -0.15 + stanceShift, 0, 0.12);
    this._lerpBone(this._leftShin, 0.3, 0, 0);
    this._lerpBone(this._leftAnkle, -0.1, 0, 0);
    this._lerpBone(this._leftFoot, 0, 0, 0);
    this._lerpBone(this._leftToes, 0, 0, 0);

    this._lerpBone(this._rightThigh, -0.1 - stanceShift, 0, -0.15);
    this._lerpBone(this._rightShin, 0.25, 0, 0);
    this._lerpBone(this._rightAnkle, -0.1, 0, 0);
    this._lerpBone(this._rightFoot, 0, 0, 0);
    this._lerpBone(this._rightToes, 0, 0, 0);
  }

  private _animateWalk(dir: number): void {
    this._walkCycle += 0.08 * dir;
    const phase = this._walkCycle;
    const legSwing = Math.sin(phase) * 0.4;
    const armSwing = Math.sin(phase) * 0.25;
    const bounce = Math.abs(Math.sin(phase)) * 0.02;

    // Hips bob and slight rotation
    this._lerpBone(this._hips, 0, Math.sin(phase) * 0.03, 0);
    this._hips.position.y = THIGH_LEN + SHIN_LEN + ANKLE_LEN + FOOT_HEIGHT + bounce;

    this._lerpBone(this._spineLower, 0.02, -Math.sin(phase) * 0.04, 0);
    this._lerpBone(this._spineUpper, 0.02, 0, 0);
    this._lerpBone(this._chest, 0.03, 0, 0);

    // Arms counter-swing
    this._lerpBone(this._leftUpperArm, -0.3 + armSwing, 0, 0.6);
    this._lerpBone(this._leftForearm, -1.2, 0, 0);
    this._lerpBone(this._rightUpperArm, -0.3 - armSwing, 0, -0.7);
    this._lerpBone(this._rightForearm, -1.3, 0, 0);

    // Legs walk cycle
    this._lerpBone(this._leftThigh, legSwing - 0.1, 0, 0.1);
    this._lerpBone(this._leftShin, Math.max(0, -Math.sin(phase + 0.5)) * 0.8 + 0.15, 0, 0);
    this._lerpBone(this._rightThigh, -legSwing - 0.1, 0, -0.1);
    this._lerpBone(this._rightShin, Math.max(0, Math.sin(phase + 0.5)) * 0.8 + 0.15, 0, 0);
  }

  private _animateCrouch(): void {
    // Deep crouch - hips drop, knees bend heavily
    this._lerpBone(this._hips, 0, 0, 0);
    this._lerpBone(this._spineLower, 0.15, 0, 0);
    this._lerpBone(this._spineUpper, 0.1, 0, 0);
    this._lerpBone(this._chest, 0.1, 0, 0);

    // Arms in low guard
    this._lerpBone(this._leftUpperArm, -0.2, 0, 0.6);
    this._lerpBone(this._leftForearm, -1.6, 0, 0);
    this._lerpBone(this._rightUpperArm, -0.3, 0, -0.7);
    this._lerpBone(this._rightForearm, -1.7, 0, 0);

    // Deep knee bend
    this._lerpBone(this._leftThigh, -0.8, 0, 0.2);
    this._lerpBone(this._leftShin, 1.4, 0, 0);
    this._lerpBone(this._leftAnkle, -0.4, 0, 0);
    this._lerpBone(this._rightThigh, -0.7, 0, -0.25);
    this._lerpBone(this._rightShin, 1.3, 0, 0);
    this._lerpBone(this._rightAnkle, -0.4, 0, 0);
  }

  private _animateBlockStand(): void {
    // Standing block - arms crossed in front
    this._lerpBone(this._spineLower, 0.05, 0, 0);
    this._lerpBone(this._spineUpper, -0.05, 0, 0);
    this._lerpBone(this._chest, -0.08, 0, 0);

    // Arms up in guard
    this._lerpBone(this._leftUpperArm, -0.6, 0.3, 0.5);
    this._lerpBone(this._leftForearm, -1.8, 0, 0);
    this._lerpBone(this._rightUpperArm, -0.7, -0.3, -0.5);
    this._lerpBone(this._rightForearm, -1.8, 0, 0);

    // Slight backward lean
    this._lerpBone(this._leftThigh, -0.1, 0, 0.1);
    this._lerpBone(this._leftShin, 0.2, 0, 0);
    this._lerpBone(this._rightThigh, -0.15, 0, -0.12);
    this._lerpBone(this._rightShin, 0.3, 0, 0);
  }

  private _animateBlockCrouch(): void {
    // Crouching block
    this._lerpBone(this._spineLower, 0.2, 0, 0);
    this._lerpBone(this._spineUpper, 0.05, 0, 0);
    this._lerpBone(this._chest, -0.05, 0, 0);

    this._lerpBone(this._leftUpperArm, -0.4, 0.2, 0.5);
    this._lerpBone(this._leftForearm, -1.6, 0, 0);
    this._lerpBone(this._rightUpperArm, -0.5, -0.2, -0.5);
    this._lerpBone(this._rightForearm, -1.6, 0, 0);

    this._lerpBone(this._leftThigh, -0.9, 0, 0.2);
    this._lerpBone(this._leftShin, 1.5, 0, 0);
    this._lerpBone(this._rightThigh, -0.8, 0, -0.25);
    this._lerpBone(this._rightShin, 1.4, 0, 0);
  }

  private _animateAttack(fighter: TekkenFighter): void {
    this._attackFrame++;
    const f = this._attackFrame;
    const moveDef = fighter.currentMove;

    // Determine attack animation based on move phase and limb
    // For now, use a generic punch/kick system based on move ID patterns
    if (!moveDef) { this._animateIdle(); return; }

    const phase = fighter.movePhase;
    const progress = phase === "startup" ? Math.min(f / 10, 1) :
                     phase === "active" ? 1 :
                     phase === "recovery" ? Math.max(1 - f / 12, 0) : 0;

    // Detect if this is a punch or kick move, high/mid/low
    const isKick = moveDef.includes("kick") || moveDef.includes("3") || moveDef.includes("4") || moveDef.includes("lk") || moveDef.includes("rk");
    const isLow = moveDef.includes("d+3") || moveDef.includes("d+4") || moveDef.includes("d/b") || moveDef.includes("ankle") || moveDef.includes("sweep") || moveDef.includes("low");
    const isLauncher = moveDef.includes("uppercut") || moveDef.includes("hopkick") || moveDef.includes("d+2") || moveDef.includes("d/f+2") || moveDef.includes("u/f");
    const isRight = moveDef.includes("rp") || moveDef.includes("rk") || moveDef.includes("2") || moveDef.includes("4") || moveDef.includes("straight") || moveDef.includes("roundhouse");

    if (isKick) {
      this._animateKickAttack(progress, isLow, isLauncher, isRight);
    } else {
      this._animatePunchAttack(progress, isLow, isLauncher, isRight);
    }
  }

  private _animatePunchAttack(progress: number, isLow: boolean, isLauncher: boolean, isRight: boolean): void {
    const p = progress;

    // Spine twist into punch
    this._lerpBone(this._spineLower, isLow ? 0.2 : 0, isRight ? -0.3 * p : 0.3 * p, 0, 0.25);
    this._lerpBone(this._spineUpper, isLauncher ? -0.2 * p : 0, isRight ? -0.2 * p : 0.2 * p, 0, 0.25);
    this._lerpBone(this._chest, isLauncher ? -0.3 * p : 0.05, 0, 0, 0.25);

    if (isRight) {
      // Right punch extends, left guards
      this._lerpBone(this._rightClavicle, 0, 0, -0.15 * p, 0.25);
      this._lerpBone(this._rightUpperArm, -0.8 * p, -0.4 * p, -0.3 * (1 - p), 0.25);
      this._lerpBone(this._rightForearm, -0.5 * (1 - p), 0, 0, 0.25);
      this._lerpBone(this._rightHand, -0.3, 0, 0, 0.25);
      this._lerpBone(this._rightFingers, -0.8, 0, 0, 0.25); // tight fist

      // Left arm guard
      this._lerpBone(this._leftUpperArm, -0.4, 0, 0.7, 0.15);
      this._lerpBone(this._leftForearm, -1.4, 0, 0, 0.15);
    } else {
      // Left punch extends
      this._lerpBone(this._leftClavicle, 0, 0, 0.15 * p, 0.25);
      this._lerpBone(this._leftUpperArm, -0.8 * p, 0.4 * p, 0.3 * (1 - p), 0.25);
      this._lerpBone(this._leftForearm, -0.5 * (1 - p), 0, 0, 0.25);
      this._lerpBone(this._leftHand, -0.3, 0, 0, 0.25);
      this._lerpBone(this._leftFingers, -0.8, 0, 0, 0.25);

      // Right arm guard
      this._lerpBone(this._rightUpperArm, -0.4, 0, -0.7, 0.15);
      this._lerpBone(this._rightForearm, -1.4, 0, 0, 0.15);
    }

    // Legs: step forward with punch
    if (isLauncher) {
      // Rising uppercut - back leg pushes up
      this._lerpBone(this._leftThigh, -0.1, 0, 0.15, 0.2);
      this._lerpBone(this._leftShin, 0.2, 0, 0, 0.2);
      this._lerpBone(this._rightThigh, -0.3 * p, 0, -0.1, 0.2);
      this._lerpBone(this._rightShin, 0.6 * p, 0, 0, 0.2);
    } else if (isLow) {
      // Low punch - crouch forward
      this._lerpBone(this._leftThigh, -0.6, 0, 0.2, 0.2);
      this._lerpBone(this._leftShin, 1.0, 0, 0, 0.2);
      this._lerpBone(this._rightThigh, -0.5, 0, -0.2, 0.2);
      this._lerpBone(this._rightShin, 0.9, 0, 0, 0.2);
    } else {
      // Normal stance
      this._lerpBone(this._leftThigh, -0.2, 0, 0.12, 0.15);
      this._lerpBone(this._leftShin, 0.35, 0, 0, 0.15);
      this._lerpBone(this._rightThigh, -0.15 - 0.1 * p, 0, -0.12, 0.15);
      this._lerpBone(this._rightShin, 0.3, 0, 0, 0.15);
    }
  }

  private _animateKickAttack(progress: number, isLow: boolean, isLauncher: boolean, isRight: boolean): void {
    const p = progress;

    // Lean back for balance during kick
    this._lerpBone(this._spineLower, isLow ? 0.15 : -0.1 * p, 0, 0, 0.25);
    this._lerpBone(this._spineUpper, isLauncher ? -0.15 * p : -0.05 * p, 0, 0, 0.25);
    this._lerpBone(this._chest, -0.1 * p, 0, 0, 0.25);

    // Arms for balance
    this._lerpBone(this._leftUpperArm, -0.5, 0.2 * p, 0.6, 0.2);
    this._lerpBone(this._leftForearm, -1.3, 0, 0, 0.2);
    this._lerpBone(this._rightUpperArm, -0.5, -0.2 * p, -0.6, 0.2);
    this._lerpBone(this._rightForearm, -1.3, 0, 0, 0.2);

    if (isRight) {
      // Right leg kicks
      if (isLauncher) {
        // Hopkick - jumping kick upward
        this._lerpBone(this._rightThigh, -1.2 * p, 0, -0.1, 0.3);
        this._lerpBone(this._rightShin, 0.2 * (1 - p), 0, 0, 0.3);
        this._lerpBone(this._rightAnkle, 0.3 * p, 0, 0, 0.3);
        this._lerpBone(this._rightToes, -0.3 * p, 0, 0, 0.3);
      } else if (isLow) {
        // Low kick - leg sweeps low
        this._lerpBone(this._rightThigh, 0.3 * p, 0, -0.3 * p, 0.3);
        this._lerpBone(this._rightShin, 0.2, 0, 0, 0.3);
        this._lerpBone(this._rightAnkle, -0.2, 0, 0, 0.3);
      } else {
        // Mid/high kick
        this._lerpBone(this._rightThigh, -1.0 * p, 0, -0.15, 0.3);
        this._lerpBone(this._rightShin, 0.5 * (1 - p), 0, 0, 0.3);
        this._lerpBone(this._rightAnkle, 0.2 * p, 0, 0, 0.3);
        this._lerpBone(this._rightToes, -0.2, 0, 0, 0.3);
      }
      // Plant leg
      this._lerpBone(this._leftThigh, -0.2, 0, 0.15, 0.15);
      this._lerpBone(this._leftShin, 0.4, 0, 0, 0.15);
    } else {
      // Left leg kicks
      if (isLauncher) {
        this._lerpBone(this._leftThigh, -1.2 * p, 0, 0.1, 0.3);
        this._lerpBone(this._leftShin, 0.2 * (1 - p), 0, 0, 0.3);
        this._lerpBone(this._leftAnkle, 0.3 * p, 0, 0, 0.3);
        this._lerpBone(this._leftToes, -0.3 * p, 0, 0, 0.3);
      } else if (isLow) {
        this._lerpBone(this._leftThigh, 0.3 * p, 0, 0.3 * p, 0.3);
        this._lerpBone(this._leftShin, 0.2, 0, 0, 0.3);
        this._lerpBone(this._leftAnkle, -0.2, 0, 0, 0.3);
      } else {
        this._lerpBone(this._leftThigh, -1.0 * p, 0, 0.15, 0.3);
        this._lerpBone(this._leftShin, 0.5 * (1 - p), 0, 0, 0.3);
        this._lerpBone(this._leftAnkle, 0.2 * p, 0, 0, 0.3);
        this._lerpBone(this._leftToes, -0.2, 0, 0, 0.3);
      }
      // Plant leg
      this._lerpBone(this._rightThigh, -0.2, 0, -0.15, 0.15);
      this._lerpBone(this._rightShin, 0.4, 0, 0, 0.15);
    }
  }

  private _animateHitStunHigh(): void {
    // Head snaps back, upper body recoils
    this._lerpBone(this._head, -0.3, 0.1, 0, 0.3);
    this._lerpBone(this._jaw, 0.15, 0, 0, 0.3);
    this._lerpBone(this._neck, -0.2, 0, 0, 0.25);
    this._lerpBone(this._chest, -0.15, 0, 0, 0.2);
    this._lerpBone(this._spineUpper, -0.1, 0, 0, 0.2);

    // Arms fling outward
    this._lerpBone(this._leftUpperArm, -0.2, 0.3, 1.0, 0.2);
    this._lerpBone(this._leftForearm, -0.5, 0, 0, 0.2);
    this._lerpBone(this._rightUpperArm, -0.2, -0.3, -1.0, 0.2);
    this._lerpBone(this._rightForearm, -0.5, 0, 0, 0.2);

    // Stagger back
    this._lerpBone(this._leftThigh, -0.2, 0, 0.1, 0.15);
    this._lerpBone(this._leftShin, 0.4, 0, 0, 0.15);
    this._lerpBone(this._rightThigh, -0.15, 0, -0.1, 0.15);
    this._lerpBone(this._rightShin, 0.3, 0, 0, 0.15);
  }

  private _animateHitStunMid(): void {
    // Torso folds forward, arms fling outward
    this._lerpBone(this._chest, 0.25, 0, 0, 0.3);
    this._lerpBone(this._spineUpper, 0.2, 0, 0.05, 0.25);
    this._lerpBone(this._spineLower, 0.1, 0, 0, 0.2);
    this._lerpBone(this._head, 0.15, 0, 0, 0.25);

    this._lerpBone(this._leftUpperArm, 0.1, 0.5, 1.2, 0.2);
    this._lerpBone(this._leftForearm, -0.3, 0, 0, 0.2);
    this._lerpBone(this._rightUpperArm, 0.1, -0.5, -1.2, 0.2);
    this._lerpBone(this._rightForearm, -0.3, 0, 0, 0.2);

    this._lerpBone(this._leftThigh, -0.3, 0, 0.1, 0.15);
    this._lerpBone(this._leftShin, 0.5, 0, 0, 0.15);
    this._lerpBone(this._rightThigh, -0.25, 0, -0.1, 0.15);
    this._lerpBone(this._rightShin, 0.45, 0, 0, 0.15);
  }

  private _animateHitStunLow(): void {
    // Legs buckle, hips drop
    this._lerpBone(this._hips, 0, 0, 0.1, 0.2);
    this._lerpBone(this._spineLower, 0.1, 0, -0.05, 0.2);

    this._lerpBone(this._leftUpperArm, -0.3, 0, 0.8, 0.15);
    this._lerpBone(this._leftForearm, -1.3, 0, 0, 0.15);
    this._lerpBone(this._rightUpperArm, -0.3, 0, -0.8, 0.15);
    this._lerpBone(this._rightForearm, -1.3, 0, 0, 0.15);

    this._lerpBone(this._leftThigh, -0.6, 0, 0.2, 0.25);
    this._lerpBone(this._leftShin, 1.0, 0, 0, 0.25);
    this._lerpBone(this._rightThigh, -0.5, 0, -0.2, 0.25);
    this._lerpBone(this._rightShin, 0.9, 0, 0, 0.25);
  }

  private _animateJuggle(fighter: TekkenFighter): void {
    // Airborne - body arcs in the air
    const spin = fighter.juggle.hitCount * 0.5;
    this._lerpBone(this._spineLower, -0.4 + spin * 0.1, 0, 0, 0.15);
    this._lerpBone(this._spineUpper, -0.3, 0, 0, 0.15);
    this._lerpBone(this._chest, -0.2, 0, 0, 0.15);
    this._lerpBone(this._head, 0.1, 0, 0, 0.15);

    // Limbs trail
    this._lerpBone(this._leftUpperArm, 0.3, 0.2, 1.0, 0.1);
    this._lerpBone(this._leftForearm, -0.4, 0, 0, 0.1);
    this._lerpBone(this._rightUpperArm, 0.3, -0.2, -1.0, 0.1);
    this._lerpBone(this._rightForearm, -0.4, 0, 0, 0.1);

    this._lerpBone(this._leftThigh, 0.5, 0, 0.1, 0.1);
    this._lerpBone(this._leftShin, -0.3, 0, 0, 0.1);
    this._lerpBone(this._rightThigh, 0.3, 0, -0.1, 0.1);
    this._lerpBone(this._rightShin, -0.2, 0, 0, 0.1);
  }

  private _animateKnockdown(): void {
    // Flat on the ground
    this._lerpBone(this._spineLower, 1.4, 0, 0, 0.08);
    this._lerpBone(this._spineUpper, 0.1, 0, 0, 0.08);
    this._lerpBone(this._chest, 0.1, 0, 0, 0.08);
    this._lerpBone(this._head, -0.1, 0, 0, 0.08);

    this._lerpBone(this._leftUpperArm, 0.5, 0.5, 1.2, 0.08);
    this._lerpBone(this._leftForearm, -0.2, 0, 0, 0.08);
    this._lerpBone(this._rightUpperArm, 0.5, -0.5, -1.2, 0.08);
    this._lerpBone(this._rightForearm, -0.2, 0, 0, 0.08);

    this._lerpBone(this._leftThigh, 0.2, 0, 0.3, 0.08);
    this._lerpBone(this._leftShin, 0.1, 0, 0, 0.08);
    this._lerpBone(this._rightThigh, 0.1, 0, -0.2, 0.08);
    this._lerpBone(this._rightShin, 0.15, 0, 0, 0.08);
  }

  private _animateGetUp(): void {
    // Transition from knockdown to standing
    this._animateIdle(); // blend back to idle
  }

  private _animateDashForward(): void {
    // Lean forward aggressively
    this._lerpBone(this._spineLower, 0.15, 0, 0, 0.3);
    this._lerpBone(this._spineUpper, 0.1, 0, 0, 0.3);
    this._lerpBone(this._chest, 0.12, 0, 0, 0.3);

    this._lerpBone(this._leftUpperArm, -0.5, 0, 0.5, 0.2);
    this._lerpBone(this._leftForearm, -1.5, 0, 0, 0.2);
    this._lerpBone(this._rightUpperArm, -0.6, 0, -0.5, 0.2);
    this._lerpBone(this._rightForearm, -1.6, 0, 0, 0.2);

    this._lerpBone(this._leftThigh, -0.4, 0, 0.1, 0.2);
    this._lerpBone(this._leftShin, 0.6, 0, 0, 0.2);
    this._lerpBone(this._rightThigh, -0.2, 0, -0.1, 0.2);
    this._lerpBone(this._rightShin, 0.3, 0, 0, 0.2);
  }

  private _animateDashBack(): void {
    // Lean backward, push off
    this._lerpBone(this._spineLower, -0.1, 0, 0, 0.3);
    this._lerpBone(this._spineUpper, -0.08, 0, 0, 0.3);

    this._lerpBone(this._leftUpperArm, -0.3, 0, 0.8, 0.2);
    this._lerpBone(this._leftForearm, -1.3, 0, 0, 0.2);
    this._lerpBone(this._rightUpperArm, -0.4, 0, -0.8, 0.2);
    this._lerpBone(this._rightForearm, -1.4, 0, 0, 0.2);

    this._lerpBone(this._leftThigh, 0.1, 0, 0.1, 0.2);
    this._lerpBone(this._leftShin, 0.15, 0, 0, 0.2);
    this._lerpBone(this._rightThigh, -0.35, 0, -0.1, 0.2);
    this._lerpBone(this._rightShin, 0.8, 0, 0, 0.2);
  }

  private _animateVictory(): void {
    const t = this._idleTime;
    // Triumphant pose - arms raised
    this._lerpBone(this._spineLower, -0.05, 0, 0, 0.08);
    this._lerpBone(this._spineUpper, -0.1, 0, 0, 0.08);
    this._lerpBone(this._chest, -0.15, 0, 0, 0.08);
    this._lerpBone(this._head, -0.1, 0, Math.sin(t * 2) * 0.05, 0.08);

    // Right fist raised high
    this._lerpBone(this._rightUpperArm, -2.8, 0, -0.3, 0.08);
    this._lerpBone(this._rightForearm, -0.4, 0, 0, 0.08);
    this._lerpBone(this._rightFingers, -0.8, 0, 0, 0.08);

    // Left arm on hip
    this._lerpBone(this._leftUpperArm, 0, 0, 0.8, 0.08);
    this._lerpBone(this._leftForearm, -1.8, 0, 0, 0.08);

    // Standing tall
    this._lerpBone(this._leftThigh, -0.05, 0, 0.15, 0.08);
    this._lerpBone(this._leftShin, 0.1, 0, 0, 0.08);
    this._lerpBone(this._rightThigh, -0.05, 0, -0.15, 0.08);
    this._lerpBone(this._rightShin, 0.1, 0, 0, 0.08);
  }

  private _animateDefeat(): void {
    // Collapse to knees, then fall forward
    this._lerpBone(this._spineLower, 0.6, 0, 0.1, 0.05);
    this._lerpBone(this._spineUpper, 0.4, 0, 0, 0.05);
    this._lerpBone(this._chest, 0.3, 0, 0, 0.05);
    this._lerpBone(this._head, 0.3, 0, 0.15, 0.05);
    this._lerpBone(this._jaw, 0.2, 0, 0, 0.05);

    // Arms dangle
    this._lerpBone(this._leftUpperArm, 0.4, 0, 0.5, 0.05);
    this._lerpBone(this._leftForearm, -0.1, 0, 0, 0.05);
    this._lerpBone(this._rightUpperArm, 0.4, 0, -0.5, 0.05);
    this._lerpBone(this._rightForearm, -0.1, 0, 0, 0.05);

    // Knees buckle
    this._lerpBone(this._leftThigh, -0.9, 0, 0.2, 0.05);
    this._lerpBone(this._leftShin, 1.6, 0, 0, 0.05);
    this._lerpBone(this._rightThigh, -0.8, 0, -0.2, 0.05);
    this._lerpBone(this._rightShin, 1.5, 0, 0, 0.05);
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
  }
}
