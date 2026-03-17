// ---------------------------------------------------------------------------
// Tekken mode – 3D skeleton-based fighter renderer (32 bones)
// Procedural meshes: cylinders, spheres, boxes — no external models.
// Enhanced bone hierarchy for fluid martial arts animation.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { TekkenFighterState, TekkenLimb } from "../../types";
import type { TekkenFighter } from "../state/TekkenState";
import type { TekkenCharacterDef } from "../state/TekkenState";
import type { TekkenSceneManager } from "./TekkenSceneManager";

// ---- Cloth physics types --------------------------------------------------

interface ClothParticle {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  pinned: boolean;
}

interface ClothConstraint {
  p1: number;
  p2: number;
  restLength: number;
}

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
  const geo = new THREE.CylinderGeometry(thickness, thickness * 0.9, len, 24);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function makeJoint(radius: number, mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), mat);
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

  // Character definition
  private _charDef: TekkenCharacterDef;

  // Animation state
  private _blendSpeed = 0.15;
  private _lastState: TekkenFighterState = TekkenFighterState.IDLE;
  private _idleTime = 0;
  private _walkCycle = 0;
  private _attackFrame = 0;

  // Cloth physics (cape/cloak simulation)
  private _capeParticles: ClothParticle[] = [];
  private _capeConstraints: ClothConstraint[] = [];
  private _capeMesh: THREE.Mesh | null = null;
  private _capeGeo: THREE.BufferGeometry | null = null;
  private _stateTransitionFrame = 0;
  private _comboBlendActive = false;

  constructor(sceneManager: TekkenSceneManager, charDef: TekkenCharacterDef, _playerIndex: number) {
    this.group = new THREE.Group();
    this._charDef = charDef;

    // Create materials based on character colors (enhanced PBR)
    this._skinMat = new THREE.MeshStandardMaterial({
      color: charDef.colors.skin, metalness: 0.02, roughness: 0.5,
      envMapIntensity: 0.4,
    });
    this._armorMat = new THREE.MeshStandardMaterial({
      color: charDef.colors.primary, metalness: 0.85, roughness: 0.2,
      envMapIntensity: 2.0,
    });
    this._clothMat = makeMat(charDef.colors.secondary, 0.02, 0.82);
    this._accentMat = new THREE.MeshStandardMaterial({
      color: charDef.colors.accent, metalness: 0.6, roughness: 0.3,
      envMapIntensity: 1.5,
    });
    this._hairMat = makeMat(charDef.colors.hair, 0, 0.85);
    this._leatherMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e, metalness: 0.08, roughness: 0.65,
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
    this._buildArchetypeDetails();

    sceneManager.scene.add(this.group);
  }

  private _buildMeshes(): void {
    // Head sphere (higher poly for smoother look)
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS, 32, 24),
      this._skinMat,
    );
    headMesh.castShadow = true;
    headMesh.position.y = HEAD_RADIUS * 0.7;
    this._head.add(headMesh);

    // Cheekbone definition (subtle bulges on sides of face)
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.SphereGeometry(0.03, 20, 16);
      const cheekMesh = new THREE.Mesh(cheekGeo, this._skinMat);
      cheekMesh.position.set(side * 0.06, HEAD_RADIUS * 0.6, HEAD_RADIUS * 0.6);
      cheekMesh.scale.set(0.9, 0.6, 0.6);
      this._head.add(cheekMesh);
    }

    // Eyes (larger, more detailed)
    const eyeGeo = new THREE.SphereGeometry(0.02, 20, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.15, metalness: 0.05 });
    const irisGeo = new THREE.SphereGeometry(0.013, 20, 16);
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.3, metalness: 0.1 });
    const pupilGeo = new THREE.SphereGeometry(0.007, 20, 16);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.04, HEAD_RADIUS * 0.8, HEAD_RADIUS * 0.74);
      this._head.add(eye);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(side * 0.04, HEAD_RADIUS * 0.8, HEAD_RADIUS * 0.78);
      this._head.add(iris);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.04, HEAD_RADIUS * 0.8, HEAD_RADIUS * 0.80);
      this._head.add(pupil);

      // Eyelid (thin curved mesh over eye for depth)
      const lidGeo = new THREE.SphereGeometry(0.023, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
      const lidMesh = new THREE.Mesh(lidGeo, this._skinMat);
      lidMesh.position.set(side * 0.04, HEAD_RADIUS * 0.83, HEAD_RADIUS * 0.73);
      lidMesh.rotation.x = 0.2;
      this._head.add(lidMesh);

      // Eyebrow ridge (thicker, more prominent)
      const browGeo = new THREE.BoxGeometry(0.035, 0.012, 0.018);
      const browMesh = new THREE.Mesh(browGeo, this._skinMat);
      browMesh.position.set(side * 0.04, HEAD_RADIUS * 0.94, HEAD_RADIUS * 0.76);
      browMesh.rotation.x = -0.15;
      browMesh.rotation.z = side * -0.1; // slight angle
      browMesh.castShadow = true;
      this._head.add(browMesh);

      // Ear (more detailed with inner ear)
      const earGeo = new THREE.SphereGeometry(0.028, 20, 16);
      const earMesh = new THREE.Mesh(earGeo, this._skinMat);
      earMesh.position.set(side * HEAD_RADIUS * 0.96, HEAD_RADIUS * 0.7, 0);
      earMesh.scale.set(0.3, 1, 0.7);
      earMesh.castShadow = true;
      this._head.add(earMesh);
      // Inner ear detail
      const innerEarGeo = new THREE.SphereGeometry(0.015, 20, 16);
      const innerEarMat = new THREE.MeshStandardMaterial({
        color: (this._skinMat.color as THREE.Color).clone().multiplyScalar(0.85),
        roughness: 0.6,
      });
      const innerEarMesh = new THREE.Mesh(innerEarGeo, innerEarMat);
      innerEarMesh.position.set(side * HEAD_RADIUS * 0.93, HEAD_RADIUS * 0.7, 0.005);
      innerEarMesh.scale.set(0.25, 0.7, 0.5);
      this._head.add(innerEarMesh);
    }

    // Nose (more detailed with bridge and nostrils)
    // Nose bridge
    const bridgeGeo = new THREE.BoxGeometry(0.016, 0.035, 0.02);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this._skinMat);
    bridgeMesh.position.set(0, HEAD_RADIUS * 0.72, HEAD_RADIUS * 0.87);
    bridgeMesh.castShadow = true;
    this._head.add(bridgeMesh);
    // Nose tip (rounded)
    const noseTipGeo = new THREE.SphereGeometry(0.014, 20, 16);
    const noseTipMesh = new THREE.Mesh(noseTipGeo, this._skinMat);
    noseTipMesh.position.set(0, HEAD_RADIUS * 0.6, HEAD_RADIUS * 0.91);
    noseTipMesh.scale.set(1, 0.7, 0.8);
    noseTipMesh.castShadow = true;
    this._head.add(noseTipMesh);
    // Nostrils
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.006, 20, 16);
      const nostrilMat = new THREE.MeshStandardMaterial({
        color: (this._skinMat.color as THREE.Color).clone().multiplyScalar(0.7),
        roughness: 0.7,
      });
      const nostrilMesh = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostrilMesh.position.set(side * 0.01, HEAD_RADIUS * 0.57, HEAD_RADIUS * 0.90);
      this._head.add(nostrilMesh);
    }

    // Mouth (lips)
    const upperLipGeo = new THREE.BoxGeometry(0.035, 0.006, 0.012);
    const lipMat = new THREE.MeshStandardMaterial({
      color: (this._skinMat.color as THREE.Color).clone().multiplyScalar(0.85),
      roughness: 0.55,
    });
    const upperLipMesh = new THREE.Mesh(upperLipGeo, lipMat);
    upperLipMesh.position.set(0, HEAD_RADIUS * 0.47, HEAD_RADIUS * 0.88);
    this._head.add(upperLipMesh);
    const lowerLipGeo = new THREE.BoxGeometry(0.03, 0.007, 0.01);
    const lowerLipMesh = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLipMesh.position.set(0, HEAD_RADIUS * 0.43, HEAD_RADIUS * 0.87);
    this._head.add(lowerLipMesh);

    // Teeth (small white box inside mouth area, slightly visible)
    const teethMat = new THREE.MeshStandardMaterial({
      color: 0xfafaf0, metalness: 0.0, roughness: 0.4,
    });
    const upperTeeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.005, 0.008),
      teethMat,
    );
    upperTeeth.position.set(0, HEAD_RADIUS * 0.455, HEAD_RADIUS * 0.85);
    this._head.add(upperTeeth);
    const lowerTeeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.023, 0.004, 0.007),
      teethMat,
    );
    lowerTeeth.position.set(0, HEAD_RADIUS * 0.42, HEAD_RADIUS * 0.85);
    this._head.add(lowerTeeth);

    // Chin definition (small sphere below jaw)
    const chinDefGeo = new THREE.SphereGeometry(0.016, 20, 16);
    const chinDefMesh = new THREE.Mesh(chinDefGeo, this._skinMat);
    chinDefMesh.position.set(0, HEAD_RADIUS * 0.25, HEAD_RADIUS * 0.75);
    chinDefMesh.scale.set(1.2, 0.8, 0.7);
    chinDefMesh.castShadow = true;
    this._head.add(chinDefMesh);

    // Forehead brow ridge (elongated box above eyes)
    const browRidgeGeo = new THREE.BoxGeometry(HEAD_RADIUS * 1.1, 0.015, 0.025);
    const browRidgeMesh = new THREE.Mesh(browRidgeGeo, this._skinMat);
    browRidgeMesh.position.set(0, HEAD_RADIUS * 0.97, HEAD_RADIUS * 0.72);
    browRidgeMesh.castShadow = true;
    this._head.add(browRidgeMesh);

    // Neck muscles (2 angled cylinders from jaw to collarbone area)
    for (const side of [-1, 1]) {
      const neckMuscleGeo = new THREE.CylinderGeometry(0.012, 0.016, NECK_LEN * 1.8, 12);
      const neckMuscleMesh = new THREE.Mesh(neckMuscleGeo, this._skinMat);
      neckMuscleMesh.position.set(side * 0.025, -NECK_LEN * 0.5, 0.01);
      neckMuscleMesh.rotation.z = side * 0.15;
      neckMuscleMesh.rotation.x = -0.1;
      neckMuscleMesh.castShadow = true;
      this._neck.add(neckMuscleMesh);
    }

    // Jaw with chin point
    const jawMesh = new THREE.Mesh(
      new THREE.BoxGeometry(HEAD_RADIUS * 1.2, HEAD_RADIUS * 0.35, HEAD_RADIUS * 0.9),
      this._skinMat,
    );
    jawMesh.castShadow = true;
    this._jaw.add(jawMesh);

    // Chin point (more defined)
    const chinGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.035, 16);
    const chinMesh = new THREE.Mesh(chinGeo, this._skinMat);
    chinMesh.position.set(0, -HEAD_RADIUS * 0.15, HEAD_RADIUS * 0.3);
    chinMesh.rotation.x = 0.3;
    chinMesh.castShadow = true;
    this._jaw.add(chinMesh);

    // Hair (higher poly half-sphere on top of head)
    const hairMesh = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS * 1.06, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55),
      this._hairMat,
    );
    hairMesh.position.y = HEAD_RADIUS * 0.75;
    hairMesh.castShadow = true;
    this._head.add(hairMesh);

    // Hair side strands (framing the face)
    for (const side of [-1, 1]) {
      const strandGeo = new THREE.BoxGeometry(0.02, 0.08, 0.015);
      const strandMesh = new THREE.Mesh(strandGeo, this._hairMat);
      strandMesh.position.set(side * HEAD_RADIUS * 0.85, HEAD_RADIUS * 0.55, HEAD_RADIUS * 0.3);
      strandMesh.rotation.z = side * 0.15;
      strandMesh.castShadow = true;
      this._head.add(strandMesh);
    }

    // Neck cylinder
    const neckMesh = makeLimb(NECK_LEN, NECK_RADIUS, this._skinMat);
    neckMesh.position.y = 0;
    this._neck.add(neckMesh);

    // Gorget / neck guard
    const gorgetGeo = new THREE.TorusGeometry(NECK_RADIUS * 1.6, 0.015, 10, 20, Math.PI * 1.5);
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
      16,
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

    // Engraving lines on chest plate (vertical ridges)
    for (let e = 0; e < 3; e++) {
      const engravingGeo = new THREE.BoxGeometry(0.003, CHEST_HEIGHT * 0.6, 0.005);
      const engravingMat = new THREE.MeshStandardMaterial({
        color: 0x222222, metalness: 0.5, roughness: 0.6, transparent: true, opacity: 0.4,
      });
      const engraving = new THREE.Mesh(engravingGeo, engravingMat);
      engraving.position.set(-0.03 + e * 0.03, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.5 + 0.022);
      this._chest.add(engraving);
    }

    // Pectoral definition (two subtle bumps on chest)
    for (const side of [-1, 1]) {
      const pecGeo = new THREE.SphereGeometry(0.05, 20, 16);
      const pecMesh = new THREE.Mesh(pecGeo, this._armorMat);
      pecMesh.position.set(side * 0.06, CHEST_HEIGHT * 0.65, CHEST_DEPTH * 0.38);
      pecMesh.scale.set(1, 0.6, 0.45);
      pecMesh.castShadow = true;
      this._chest.add(pecMesh);
    }

    // Medallion / emblem on chest plate (accent color circle with gemstone)
    const medallionGeo = new THREE.CircleGeometry(0.028, 14);
    const medallionMesh = new THREE.Mesh(medallionGeo, this._accentMat);
    medallionMesh.position.set(0, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.5 + 0.025);
    medallionMesh.castShadow = true;
    this._chest.add(medallionMesh);

    // Gemstone in center of medallion
    const gemMat = new THREE.MeshStandardMaterial({
      color: this._charDef.colors.accent,
      metalness: 0.1,
      roughness: 0.1,
      emissive: this._charDef.colors.accent,
      emissiveIntensity: 0.3,
      envMapIntensity: 3.0,
    });
    const gemGeo = new THREE.SphereGeometry(0.012, 20, 16);
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.set(0, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.5 + 0.035);
    gemMesh.scale.set(1, 1, 0.5);
    this._chest.add(gemMesh);

    // Medallion rim (gold ring around medallion)
    const rimGeo = new THREE.TorusGeometry(0.028, 0.004, 10, 20);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xddaa22, metalness: 0.85, roughness: 0.25,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.set(0, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.5 + 0.026);
    this._chest.add(rimMesh);

    // Lower torso
    const lowerGeo = new THREE.CylinderGeometry(
      LOWER_TORSO_WIDTH * 0.42,
      LOWER_TORSO_WIDTH * 0.35,
      LOWER_TORSO_HEIGHT,
      16,
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
      new THREE.SphereGeometry(LOWER_TORSO_WIDTH * 0.38, 20, 16),
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
        const plateGeo = new THREE.SphereGeometry(radius, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
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
        new THREE.SphereGeometry(JOINT_RADIUS * 1.4, 20, 16),
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
        new THREE.CylinderGeometry(LIMB_THICKNESS * 1.3, LIMB_THICKNESS * 1.2, FOREARM_LEN * 0.6, 16),
        this._armorMat,
      );
      bracerMesh.position.y = -FOREARM_LEN * 0.35;
      bracerMesh.castShadow = true;
      forearm.add(bracerMesh);

      // Bracer edge trim (gold ring at top and bottom)
      for (const trimY of [-FOREARM_LEN * 0.05, -FOREARM_LEN * 0.65]) {
        const bracerTrim = new THREE.Mesh(
          new THREE.TorusGeometry(LIMB_THICKNESS * 1.32, 0.005, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.85, roughness: 0.25 }),
        );
        bracerTrim.rotation.x = Math.PI / 2;
        bracerTrim.position.y = trimY;
        forearm.add(bracerTrim);
      }

      // Chainmail peek (visible between armor and skin)
      const chainmailMat = new THREE.MeshStandardMaterial({
        color: 0x666677, metalness: 0.7, roughness: 0.4,
      });
      const chainmail = new THREE.Mesh(
        new THREE.CylinderGeometry(LIMB_THICKNESS * 1.05, LIMB_THICKNESS * 1.0, FOREARM_LEN * 0.15, 16),
        chainmailMat,
      );
      chainmail.position.y = -FOREARM_LEN * 0.03;
      forearm.add(chainmail);

      // Wrist wrap (torus ring at wrist)
      const wristWrap = new THREE.Mesh(
        new THREE.TorusGeometry(LIMB_THICKNESS * 1.1, 0.008, 10, 20),
        this._leatherMat,
      );
      wristWrap.rotation.x = Math.PI / 2;
      wristWrap.position.y = -FOREARM_LEN * 0.9;
      wristWrap.castShadow = true;
      forearm.add(wristWrap);

      // Hand (palm with slight taper)
      const handMesh = new THREE.Mesh(
        new THREE.BoxGeometry(HAND_LEN * 0.8, HAND_LEN, HAND_LEN * 0.65),
        this._skinMat,
      );
      handMesh.position.y = -HAND_LEN * 0.4;
      handMesh.castShadow = true;
      hand.add(handMesh);

      // Individual finger segments (4 fingers with knuckle joints)
      for (let k = 0; k < 4; k++) {
        // Knuckle bump
        const knuckle = new THREE.Mesh(
          new THREE.SphereGeometry(0.008, 20, 16),
          this._skinMat,
        );
        knuckle.position.set(
          -0.02 + k * 0.013,
          -HAND_LEN * 0.15,
          HAND_LEN * 0.35,
        );
        knuckle.castShadow = true;
        hand.add(knuckle);

        // Finger cylinder (proximal phalanx)
        const fingerSeg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.004, FINGER_LEN * 0.6, 8),
          this._skinMat,
        );
        fingerSeg.position.set(
          -0.02 + k * 0.013,
          -HAND_LEN * 0.15 - FINGER_LEN * 0.3,
          HAND_LEN * 0.38,
        );
        fingerSeg.rotation.x = -0.3; // slightly curled
        hand.add(fingerSeg);

        // Fingernail (tiny flat box at finger tip with slight metallic sheen)
        const nailMat = new THREE.MeshStandardMaterial({
          color: 0xeeddcc, metalness: 0.15, roughness: 0.35,
        });
        const nail = new THREE.Mesh(
          new THREE.BoxGeometry(0.005, 0.003, 0.004),
          nailMat,
        );
        nail.position.set(
          -0.02 + k * 0.013,
          -HAND_LEN * 0.15 - FINGER_LEN * 0.55,
          HAND_LEN * 0.40,
        );
        nail.rotation.x = -0.3;
        hand.add(nail);

        // Knuckle wrinkle detail (thin torus ring at finger joint)
        const knuckleWrinkle = new THREE.Mesh(
          new THREE.TorusGeometry(0.006, 0.001, 6, 10),
          this._skinMat,
        );
        knuckleWrinkle.position.set(
          -0.02 + k * 0.013,
          -HAND_LEN * 0.15 - FINGER_LEN * 0.1,
          HAND_LEN * 0.36,
        );
        knuckleWrinkle.rotation.x = Math.PI / 2;
        hand.add(knuckleWrinkle);
      }

      // Fingers group (distal phalanges)
      const fingerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FINGER_LEN * 0.6, FINGER_LEN * 0.8, FINGER_LEN * 0.45),
        this._skinMat,
      );
      fingers.add(fingerMesh);

      // Thumb (two segments for more natural look)
      const thumbBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.011, FINGER_LEN * 0.5, 10),
        this._skinMat,
      );
      thumbBase.castShadow = true;
      thumb.add(thumbBase);
      const thumbTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 20, 16),
        this._skinMat,
      );
      thumbTip.position.y = -FINGER_LEN * 0.3;
      thumb.add(thumbTip);

      // Thumbnail
      const thumbNailMat = new THREE.MeshStandardMaterial({
        color: 0xeeddcc, metalness: 0.15, roughness: 0.35,
      });
      const thumbNail = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.003, 0.005),
        thumbNailMat,
      );
      thumbNail.position.set(0, -FINGER_LEN * 0.4, 0.008);
      thumb.add(thumbNail);
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
        new THREE.SphereGeometry(JOINT_RADIUS * 1.5, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
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
        new THREE.CylinderGeometry(LIMB_THICKNESS * 1.2, LIMB_THICKNESS * 1.1, SHIN_LEN * 0.5, 16),
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
        new THREE.TorusGeometry(FOOT_LEN * 0.24, 0.012, 10, 20),
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
      new THREE.TorusGeometry(LOWER_TORSO_WIDTH * 0.38, 0.02, 10, 24),
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

    // ---- MUSCLE DEFINITION ----

    // Deltoid muscles (spheres on top of each shoulder, between arm and chest)
    for (const [clav, side] of [[this._leftClavicle, 1], [this._rightClavicle, -1]] as [THREE.Group, number][]) {
      const deltoidGeo = new THREE.SphereGeometry(0.04, 20, 16);
      const deltoidMesh = new THREE.Mesh(deltoidGeo, this._skinMat);
      deltoidMesh.position.set(side * (CHEST_WIDTH * 0.45 + CLAVICLE_LEN * 0.3), -0.02, 0);
      deltoidMesh.scale.set(0.9, 1.1, 0.8);
      deltoidMesh.castShadow = true;
      clav.add(deltoidMesh);
    }

    // Trapezius muscle (angled box from neck toward shoulders behind the head)
    const trapGeo = new THREE.BoxGeometry(CHEST_WIDTH * 0.5, 0.06, 0.08);
    const trapMesh = new THREE.Mesh(trapGeo, this._skinMat);
    trapMesh.position.set(0, CHEST_HEIGHT * 0.85, -CHEST_DEPTH * 0.25);
    trapMesh.rotation.x = 0.2;
    trapMesh.castShadow = true;
    this._chest.add(trapMesh);

    // Calf muscle bulges (scaled spheres on back of shins)
    for (const shin of [this._leftShin, this._rightShin]) {
      const calfGeo = new THREE.SphereGeometry(0.035, 20, 16);
      const calfMesh = new THREE.Mesh(calfGeo, this._skinMat);
      calfMesh.position.set(0, -SHIN_LEN * 0.3, -LIMB_THICKNESS * 0.6);
      calfMesh.scale.set(0.7, 1.4, 0.8);
      calfMesh.castShadow = true;
      shin.add(calfMesh);
    }

    // Forearm muscle definition (slightly flattened sphere on each forearm)
    for (const forearm of [this._leftForearm, this._rightForearm]) {
      const forearmMuscleGeo = new THREE.SphereGeometry(0.025, 20, 16);
      const forearmMuscleMesh = new THREE.Mesh(forearmMuscleGeo, this._skinMat);
      forearmMuscleMesh.position.set(0, -FOREARM_LEN * 0.25, LIMB_THICKNESS * 0.3);
      forearmMuscleMesh.scale.set(1.0, 1.3, 0.6);
      forearmMuscleMesh.castShadow = true;
      forearm.add(forearmMuscleMesh);
    }

    // ---- ARMOR / CLOTHING DETAIL ----

    // Rivets on chest plate (6 tiny metallic spheres in a pattern)
    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, metalness: 0.9, roughness: 0.15,
    });
    const rivetPositions = [
      [-0.07, CHEST_HEIGHT * 0.7], [-0.07, CHEST_HEIGHT * 0.4],
      [0.07, CHEST_HEIGHT * 0.7], [0.07, CHEST_HEIGHT * 0.4],
      [-0.04, CHEST_HEIGHT * 0.55], [0.04, CHEST_HEIGHT * 0.55],
    ];
    for (const [rx, ry] of rivetPositions) {
      const rivetGeo = new THREE.SphereGeometry(0.004, 8, 6);
      const rivet = new THREE.Mesh(rivetGeo, rivetMat);
      rivet.position.set(rx, ry, CHEST_DEPTH * 0.5 + 0.025);
      this._chest.add(rivet);
    }

    // Seam lines on cloth areas (thin dark boxes running along limb cylinders)
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x222222, metalness: 0.0, roughness: 0.9, transparent: true, opacity: 0.5,
    });
    // Seams on thighs
    for (const thigh of [this._leftThigh, this._rightThigh]) {
      const seamGeo = new THREE.BoxGeometry(0.003, THIGH_LEN * 0.8, 0.003);
      const seam = new THREE.Mesh(seamGeo, seamMat);
      seam.position.set(LIMB_THICKNESS * 0.5, -THIGH_LEN * 0.45, 0);
      thigh.add(seam);
    }
    // Seams on shins
    for (const shin of [this._leftShin, this._rightShin]) {
      const seamGeo = new THREE.BoxGeometry(0.003, SHIN_LEN * 0.7, 0.003);
      const seam = new THREE.Mesh(seamGeo, seamMat);
      seam.position.set(LIMB_THICKNESS * 0.5, -SHIN_LEN * 0.4, 0);
      shin.add(seam);
    }

    // Shoulder pad base (flattened cylinder on top of each shoulder)
    for (const [clav, side] of [[this._leftClavicle, 1], [this._rightClavicle, -1]] as [THREE.Group, number][]) {
      const padBaseGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.015, 16);
      const padBaseMesh = new THREE.Mesh(padBaseGeo, this._armorMat);
      padBaseMesh.position.set(side * (CHEST_WIDTH * 0.45 + CLAVICLE_LEN * 0.5), 0.025, 0);
      padBaseMesh.castShadow = true;
      clav.add(padBaseMesh);
    }

    // Cloth-simulated cape / cloak (built per archetype)
    this._buildClothCape();
  }

  // ---- ARCHETYPE VISUAL IDENTITY ------------------------------------------

  private _buildArchetypeDetails(): void {
    const arch = this._charDef.archetype;
    const colors = this._charDef.colors;

    // Shared metallic material for weapons/armor pieces
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x888899, metalness: 0.9, roughness: 0.2,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xddaa22, metalness: 0.85, roughness: 0.25,
    });
    const darkMat = makeMat(0x111111, 0.1, 0.9);
    const skinTone = makeMat(colors.skin, 0, 0.55);

    switch (arch) {
      // ── Knight (balanced) ────────────────────────────────────────────────
      case "balanced": {
        // Sword on right hip – flat box blade
        const swordBlade = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.7, 0.02),
          metalMat,
        );
        swordBlade.position.set(-0.18, -0.15, 0.05);
        swordBlade.rotation.z = 0.15;
        swordBlade.castShadow = true;
        this._hips.add(swordBlade);

        // Sword guard (cross-piece)
        const swordGuard = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.02, 0.03),
          goldMat,
        );
        swordGuard.position.set(-0.18, 0.2, 0.05);
        swordGuard.rotation.z = 0.15;
        swordGuard.castShadow = true;
        this._hips.add(swordGuard);

        // Sword pommel
        const swordPommel = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 20, 16),
          goldMat,
        );
        swordPommel.position.set(-0.16, 0.32, 0.05);
        swordPommel.castShadow = true;
        this._hips.add(swordPommel);

        // Shield on back – rounded rectangle
        const shieldGeo = new THREE.BoxGeometry(0.28, 0.35, 0.03);
        const shieldMesh = new THREE.Mesh(shieldGeo, this._accentMat);
        shieldMesh.position.set(0, CHEST_HEIGHT * 0.5, -CHEST_DEPTH * 0.5 - 0.04);
        shieldMesh.castShadow = true;
        this._chest.add(shieldMesh);
        // Shield rim
        const shieldRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.16, 0.012, 10, 24),
          metalMat,
        );
        shieldRim.position.set(0, CHEST_HEIGHT * 0.5, -CHEST_DEPTH * 0.5 - 0.055);
        shieldRim.castShadow = true;
        this._chest.add(shieldRim);

        // Helmet visor – small box in front of face
        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(HEAD_RADIUS * 1.4, 0.03, 0.04),
          metalMat,
        );
        visor.position.set(0, HEAD_RADIUS * 0.7, HEAD_RADIUS * 0.95);
        visor.castShadow = true;
        this._head.add(visor);

        // Shoulder pauldrons – enlarged on each clavicle
        for (const clav of [this._leftClavicle, this._rightClavicle]) {
          const pauldron = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.05, 0.08),
            metalMat,
          );
          pauldron.position.set(0, 0.03, 0);
          pauldron.castShadow = true;
          clav.add(pauldron);
        }

        // Chain mail texture on torso (3x3 grid of tiny torus rings on chest)
        const chainMailMat = new THREE.MeshStandardMaterial({
          color: 0x777788, metalness: 0.75, roughness: 0.35,
        });
        for (let cx = 0; cx < 3; cx++) {
          for (let cy = 0; cy < 3; cy++) {
            const chainRing = new THREE.Mesh(
              new THREE.TorusGeometry(0.008, 0.002, 6, 10),
              chainMailMat,
            );
            chainRing.position.set(
              -0.02 + cx * 0.02,
              CHEST_HEIGHT * (0.35 + cy * 0.1),
              CHEST_DEPTH * 0.5 + 0.03,
            );
            chainRing.castShadow = true;
            this._chest.add(chainRing);
          }
        }

        // Sword pommel jewel (small emissive sphere)
        const pommelJewelMat = new THREE.MeshStandardMaterial({
          color: 0xff2222, metalness: 0.1, roughness: 0.1,
          emissive: 0xff2222, emissiveIntensity: 0.5,
        });
        const pommelJewel = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 20, 16),
          pommelJewelMat,
        );
        pommelJewel.position.set(-0.16, 0.32, 0.05);
        this._hips.add(pommelJewel);

        // Gauntlet finger guards (small cone-shaped covers over fingers)
        for (const hand of [this._leftHand, this._rightHand]) {
          for (let gk = 0; gk < 4; gk++) {
            const fingerGuard = new THREE.Mesh(
              new THREE.ConeGeometry(0.007, 0.02, 6),
              metalMat,
            );
            fingerGuard.position.set(
              -0.02 + gk * 0.013,
              -HAND_LEN * 0.15 - FINGER_LEN * 0.2,
              HAND_LEN * 0.42,
            );
            fingerGuard.rotation.x = -Math.PI / 2;
            fingerGuard.castShadow = true;
            hand.add(fingerGuard);
          }
        }

        // Knee guards (half-sphere over each knee)
        for (const thigh of [this._leftThigh, this._rightThigh]) {
          const kneeGuard = new THREE.Mesh(
            new THREE.SphereGeometry(JOINT_RADIUS * 1.8, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
            metalMat,
          );
          kneeGuard.position.set(0, -THIGH_LEN, LIMB_THICKNESS * 0.7);
          kneeGuard.rotation.x = -Math.PI / 2;
          kneeGuard.castShadow = true;
          thigh.add(kneeGuard);
        }
        break;
      }

      // ── Berserker (rushdown) ─────────────────────────────────────────────
      case "rushdown": {
        // Spiked knuckles on each hand – small cone meshes
        for (const hand of [this._leftHand, this._rightHand]) {
          for (let k = 0; k < 3; k++) {
            const spike = new THREE.Mesh(
              new THREE.ConeGeometry(0.01, 0.04, 4),
              metalMat,
            );
            spike.position.set(
              -0.015 + k * 0.015,
              -HAND_LEN * 0.15,
              HAND_LEN * 0.45,
            );
            spike.rotation.x = -Math.PI / 2;
            spike.castShadow = true;
            hand.add(spike);
          }
        }

        // Shoulder spikes – 2-3 cones on each shoulder area
        for (const clav of [this._leftClavicle, this._rightClavicle]) {
          for (let s = 0; s < 3; s++) {
            const shoulderSpike = new THREE.Mesh(
              new THREE.ConeGeometry(0.015, 0.08, 4),
              metalMat,
            );
            shoulderSpike.position.set(
              -0.02 + s * 0.02,
              0.05 + s * 0.01,
              -0.01 + (s % 2) * 0.02,
            );
            shoulderSpike.castShadow = true;
            clav.add(shoulderSpike);
          }
        }

        // War paint stripes on face – thin colored boxes on head
        const warPaintMat = makeMat(0xcc2200, 0, 0.9);
        for (let i = 0; i < 3; i++) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.005, HEAD_RADIUS * 0.5, 0.005),
            warPaintMat,
          );
          stripe.position.set(
            -0.03 + i * 0.03,
            HEAD_RADIUS * 0.65,
            HEAD_RADIUS * 0.9,
          );
          this._head.add(stripe);
        }

        // Bare chest – make torso skin-colored overlay
        const bareTorso = new THREE.Mesh(
          new THREE.CylinderGeometry(
            CHEST_WIDTH * 0.47,
            CHEST_WIDTH * 0.37,
            CHEST_HEIGHT * 0.95,
            16,
          ),
          skinTone,
        );
        bareTorso.position.y = CHEST_HEIGHT * 0.5;
        bareTorso.castShadow = true;
        this._chest.add(bareTorso);

        // Chest strap / belt across torso
        const strapMat = makeMat(0x553322, 0.1, 0.7);
        const strap = new THREE.Mesh(
          new THREE.BoxGeometry(CHEST_WIDTH * 0.9, 0.04, CHEST_DEPTH * 0.7),
          strapMat,
        );
        strap.position.set(0, CHEST_HEIGHT * 0.6, 0);
        strap.rotation.z = 0.4;
        strap.castShadow = true;
        this._chest.add(strap);

        // Fur collar around neck
        const furMat = makeMat(0x664422, 0, 0.95);
        for (let i = 0; i < 8; i++) {
          const tuft = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 20, 16),
            furMat,
          );
          const angle = (i / 8) * Math.PI * 2;
          tuft.position.set(
            Math.cos(angle) * NECK_RADIUS * 2,
            -NECK_LEN * 0.1,
            Math.sin(angle) * NECK_RADIUS * 2,
          );
          tuft.scale.set(1, 0.6, 1);
          tuft.castShadow = true;
          this._neck.add(tuft);
        }

        // Scarred skin marks (thin dark boxes on chest/arms, 3-4 scar lines)
        const scarMat = new THREE.MeshStandardMaterial({
          color: 0x993333, metalness: 0.0, roughness: 0.7, transparent: true, opacity: 0.6,
        });
        // Chest scars
        const scarPositions = [
          { x: -0.05, y: CHEST_HEIGHT * 0.55, rot: 0.3, len: 0.08 },
          { x: 0.04, y: CHEST_HEIGHT * 0.45, rot: -0.2, len: 0.06 },
          { x: 0.02, y: CHEST_HEIGHT * 0.7, rot: 0.5, len: 0.07 },
        ];
        for (const scar of scarPositions) {
          const scarGeo = new THREE.BoxGeometry(0.004, scar.len, 0.004);
          const scarMesh = new THREE.Mesh(scarGeo, scarMat);
          scarMesh.position.set(scar.x, scar.y, CHEST_DEPTH * 0.5 + 0.015);
          scarMesh.rotation.z = scar.rot;
          this._chest.add(scarMesh);
        }
        // Arm scar
        for (const upperArm of [this._leftUpperArm, this._rightUpperArm]) {
          const armScar = new THREE.Mesh(
            new THREE.BoxGeometry(0.004, 0.06, 0.004),
            scarMat,
          );
          armScar.position.set(LIMB_THICKNESS * 0.5, -UPPER_ARM_LEN * 0.4, 0);
          armScar.rotation.z = 0.2;
          upperArm.add(armScar);
        }

        // Tooth necklace (row of small cone teeth hanging from torus around neck)
        const toothNecklaceRing = new THREE.Mesh(
          new THREE.TorusGeometry(NECK_RADIUS * 2.5, 0.005, 6, 16),
          makeMat(0x553322, 0.1, 0.7),
        );
        toothNecklaceRing.rotation.x = Math.PI / 2;
        toothNecklaceRing.position.set(0, -NECK_LEN * 0.6, 0);
        this._neck.add(toothNecklaceRing);
        const toothMat = makeMat(0xeeeedd, 0.05, 0.4);
        for (let ti = 0; ti < 8; ti++) {
          const toothAngle = (ti / 8) * Math.PI * 2;
          const tooth = new THREE.Mesh(
            new THREE.ConeGeometry(0.005, 0.018, 4),
            toothMat,
          );
          tooth.position.set(
            Math.cos(toothAngle) * NECK_RADIUS * 2.5,
            -NECK_LEN * 0.7,
            Math.sin(toothAngle) * NECK_RADIUS * 2.5,
          );
          tooth.rotation.x = Math.PI;
          this._neck.add(tooth);
        }

        // Wrist chain (small torus links on each wrist)
        for (const forearm of [this._leftForearm, this._rightForearm]) {
          for (let wi = 0; wi < 3; wi++) {
            const wristChain = new THREE.Mesh(
              new THREE.TorusGeometry(LIMB_THICKNESS * 1.15, 0.004, 6, 10),
              metalMat,
            );
            wristChain.rotation.x = Math.PI / 2;
            wristChain.position.y = -FOREARM_LEN * (0.85 + wi * 0.04);
            wristChain.castShadow = true;
            forearm.add(wristChain);
          }
        }

        // More shoulder spikes (2 more per shoulder, smaller)
        for (const clav of [this._leftClavicle, this._rightClavicle]) {
          for (let es = 0; es < 2; es++) {
            const extraSpike = new THREE.Mesh(
              new THREE.ConeGeometry(0.01, 0.05, 4),
              metalMat,
            );
            extraSpike.position.set(
              -0.03 + es * 0.06,
              0.06,
              0.02 - es * 0.04,
            );
            extraSpike.rotation.z = (es === 0 ? 0.3 : -0.3);
            extraSpike.castShadow = true;
            clav.add(extraSpike);
          }
        }
        break;
      }

      // ── Monk (mixup) ────────────────────────────────────────────────────
      case "mixup": {
        // Prayer beads – ring of small spheres around neck
        const beadMat = makeMat(0x884422, 0.2, 0.5);
        for (let i = 0; i < 12; i++) {
          const bead = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 20, 16),
            beadMat,
          );
          const angle = (i / 12) * Math.PI * 2;
          bead.position.set(
            Math.cos(angle) * NECK_RADIUS * 2.2,
            -NECK_LEN * 0.5,
            Math.sin(angle) * NECK_RADIUS * 2.2,
          );
          bead.castShadow = true;
          this._neck.add(bead);
        }

        // Sash hanging from waist
        const sashMat = makeMat(colors.accent, 0, 0.85);
        const sash = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.35, 0.015),
          sashMat,
        );
        sash.position.set(0.1, -0.15, LOWER_TORSO_WIDTH * 0.35);
        sash.rotation.x = 0.15;
        sash.castShadow = true;
        this._hips.add(sash);

        // Sash tail (hanging further)
        const sashTail = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.2, 0.012),
          sashMat,
        );
        sashTail.position.set(0.1, -0.38, LOWER_TORSO_WIDTH * 0.32);
        sashTail.rotation.x = 0.25;
        sashTail.castShadow = true;
        this._hips.add(sashTail);

        // Wrapped hands – slightly larger forearm wraps in cloth color
        const wrapMat = makeMat(0xeeddcc, 0, 0.85);
        for (const forearm of [this._leftForearm, this._rightForearm]) {
          const wrap = new THREE.Mesh(
            new THREE.CylinderGeometry(
              LIMB_THICKNESS * 1.15,
              LIMB_THICKNESS * 1.05,
              FOREARM_LEN * 0.7,
              16,
            ),
            wrapMat,
          );
          wrap.position.y = -FOREARM_LEN * 0.4;
          wrap.castShadow = true;
          forearm.add(wrap);
        }
        for (const hand of [this._leftHand, this._rightHand]) {
          const handWrap = new THREE.Mesh(
            new THREE.BoxGeometry(HAND_LEN * 0.9, HAND_LEN * 1.05, HAND_LEN * 0.75),
            wrapMat,
          );
          handWrap.position.y = -HAND_LEN * 0.4;
          handWrap.castShadow = true;
          hand.add(handWrap);
        }

        // Bald head – override hair with skin-colored sphere (covers hair)
        const baldCap = new THREE.Mesh(
          new THREE.SphereGeometry(HEAD_RADIUS * 1.06, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
          skinTone,
        );
        baldCap.position.y = HEAD_RADIUS * 0.75;
        baldCap.castShadow = true;
        this._head.add(baldCap);

        // Robe skirt extension – wider lower mesh
        const robeMat = makeMat(colors.primary, 0, 0.85);
        const robeSkirt = new THREE.Mesh(
          new THREE.CylinderGeometry(
            LOWER_TORSO_WIDTH * 0.5,
            LOWER_TORSO_WIDTH * 0.6,
            LOWER_TORSO_HEIGHT * 1.3,
            16,
          ),
          robeMat,
        );
        robeSkirt.position.y = -0.05;
        robeSkirt.castShadow = true;
        this._hips.add(robeSkirt);

        // Incense holder hanging from belt (tiny cylinder + sphere flame)
        const incenseCylinder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8),
          makeMat(0x886633, 0.3, 0.5),
        );
        incenseCylinder.position.set(0.12, -0.05, LOWER_TORSO_WIDTH * 0.35);
        incenseCylinder.castShadow = true;
        this._hips.add(incenseCylinder);
        const incenseFlame = new THREE.Mesh(
          new THREE.SphereGeometry(0.006, 8, 6),
          new THREE.MeshStandardMaterial({
            color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8,
            metalness: 0.0, roughness: 0.3,
          }),
        );
        incenseFlame.position.set(0.12, -0.03, LOWER_TORSO_WIDTH * 0.35);
        this._hips.add(incenseFlame);

        // Foot wraps (torus rings on each foot)
        for (const foot of [this._leftFoot, this._rightFoot]) {
          for (let fw = 0; fw < 2; fw++) {
            const footWrap = new THREE.Mesh(
              new THREE.TorusGeometry(FOOT_LEN * 0.2, 0.006, 6, 12),
              wrapMat,
            );
            footWrap.rotation.x = Math.PI / 2;
            footWrap.position.set(0, -FOOT_HEIGHT * 0.1, FOOT_LEN * (0.1 + fw * 0.2));
            footWrap.castShadow = true;
            foot.add(footWrap);
          }
        }

        // Meditation beads on wrist (smaller bead ring on left hand)
        const meditationBeadMat = makeMat(0x663311, 0.15, 0.5);
        for (let mb = 0; mb < 8; mb++) {
          const medBead = new THREE.Mesh(
            new THREE.SphereGeometry(0.006, 8, 6),
            meditationBeadMat,
          );
          const mbAngle = (mb / 8) * Math.PI * 2;
          medBead.position.set(
            Math.cos(mbAngle) * LIMB_THICKNESS * 1.2,
            -FOREARM_LEN * 0.88,
            Math.sin(mbAngle) * LIMB_THICKNESS * 1.2,
          );
          this._leftForearm.add(medBead);
        }

        // Embroidered robe edge (gold-colored thin box trim at robe bottom)
        const robeEdgeMat = new THREE.MeshStandardMaterial({
          color: 0xddaa22, metalness: 0.6, roughness: 0.35,
        });
        const robeEdge = new THREE.Mesh(
          new THREE.TorusGeometry(LOWER_TORSO_WIDTH * 0.58, 0.008, 6, 20),
          robeEdgeMat,
        );
        robeEdge.rotation.x = Math.PI / 2;
        robeEdge.position.set(0, -0.05 - LOWER_TORSO_HEIGHT * 0.65, 0);
        robeEdge.castShadow = true;
        this._hips.add(robeEdge);
        break;
      }

      // ── Paladin (defensive) ─────────────────────────────────────────────
      case "defensive": {
        // Tower shield on left forearm
        const towerShieldMat = new THREE.MeshStandardMaterial({
          color: colors.accent, metalness: 0.7, roughness: 0.3,
        });
        const towerShield = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.5, 0.04),
          towerShieldMat,
        );
        towerShield.position.set(0.06, -FOREARM_LEN * 0.5, 0.08);
        towerShield.castShadow = true;
        this._leftForearm.add(towerShield);

        // Shield cross emblem
        const shieldCrossV = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.15, 0.005),
          goldMat,
        );
        shieldCrossV.position.set(0.06, -FOREARM_LEN * 0.5, 0.105);
        shieldCrossV.castShadow = true;
        this._leftForearm.add(shieldCrossV);
        const shieldCrossH = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.02, 0.005),
          goldMat,
        );
        shieldCrossH.position.set(0.06, -FOREARM_LEN * 0.5, 0.105);
        shieldCrossH.castShadow = true;
        this._leftForearm.add(shieldCrossH);

        // Holy symbol on chest – diamond shape (rotated box)
        const holySymbol = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 0.008),
          goldMat,
        );
        holySymbol.position.set(0, CHEST_HEIGHT * 0.7, CHEST_DEPTH * 0.5 + 0.03);
        holySymbol.rotation.z = Math.PI / 4;
        holySymbol.castShadow = true;
        this._chest.add(holySymbol);

        // Crown / circlet on head
        const circlet = new THREE.Mesh(
          new THREE.TorusGeometry(HEAD_RADIUS * 0.8, 0.015, 10, 24),
          goldMat,
        );
        circlet.position.y = HEAD_RADIUS * 1.2;
        circlet.rotation.x = Math.PI / 2;
        circlet.castShadow = true;
        this._head.add(circlet);

        // Full plate armor layers on shoulders and chest
        for (const clav of [this._leftClavicle, this._rightClavicle]) {
          const plateLayer = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
            metalMat,
          );
          plateLayer.position.set(0, 0.02, 0);
          plateLayer.scale.set(1.4, 0.9, 1.1);
          plateLayer.castShadow = true;
          clav.add(plateLayer);
        }
        // Extra chest plate
        const fullPlate = new THREE.Mesh(
          new THREE.BoxGeometry(CHEST_WIDTH * 0.75, CHEST_HEIGHT * 0.85, 0.025),
          metalMat,
        );
        fullPlate.position.set(0, CHEST_HEIGHT * 0.5, CHEST_DEPTH * 0.5 + 0.015);
        fullPlate.castShadow = true;
        this._chest.add(fullPlate);

        // Longer flowing hair behind head
        const longHairMat = makeMat(colors.hair, 0, 0.9);
        const longHair = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.3, 0.04),
          longHairMat,
        );
        longHair.position.set(0, HEAD_RADIUS * 0.2, -HEAD_RADIUS * 0.7);
        longHair.rotation.x = 0.15;
        longHair.castShadow = true;
        this._head.add(longHair);
        // Hair taper
        const hairTaper = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.2, 0.03),
          longHairMat,
        );
        hairTaper.position.set(0, HEAD_RADIUS * -0.1, -HEAD_RADIUS * 0.75);
        hairTaper.rotation.x = 0.2;
        hairTaper.castShadow = true;
        this._head.add(hairTaper);

        // Shield boss (central sphere/cone on the shield)
        const shieldBoss = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
          goldMat,
        );
        shieldBoss.position.set(0.06, -FOREARM_LEN * 0.5, 0.105);
        shieldBoss.rotation.x = -Math.PI / 2;
        shieldBoss.castShadow = true;
        this._leftForearm.add(shieldBoss);
        const shieldBossCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.02, 0.03, 8),
          goldMat,
        );
        shieldBossCone.position.set(0.06, -FOREARM_LEN * 0.5, 0.13);
        shieldBossCone.rotation.x = -Math.PI / 2;
        shieldBossCone.castShadow = true;
        this._leftForearm.add(shieldBossCone);

        // Helmet wings/horns (2 small curved cones on helmet sides)
        for (const side of [-1, 1]) {
          const helmetWing = new THREE.Mesh(
            new THREE.ConeGeometry(0.015, 0.08, 6),
            goldMat,
          );
          helmetWing.position.set(
            side * HEAD_RADIUS * 0.85,
            HEAD_RADIUS * 1.15,
            -HEAD_RADIUS * 0.1,
          );
          helmetWing.rotation.z = side * -0.6;
          helmetWing.rotation.x = -0.2;
          helmetWing.castShadow = true;
          this._head.add(helmetWing);
        }

        // Tabard cloth (flat box hanging from belt, with cross emblem box)
        const tabardMat = makeMat(colors.primary, 0, 0.85);
        const tabard = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.3, 0.01),
          tabardMat,
        );
        tabard.position.set(0, -0.15, LOWER_TORSO_WIDTH * 0.38 + 0.015);
        tabard.castShadow = true;
        this._hips.add(tabard);
        // Tabard cross emblem
        const tabardCrossV = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.08, 0.005),
          goldMat,
        );
        tabardCrossV.position.set(0, -0.1, LOWER_TORSO_WIDTH * 0.38 + 0.025);
        this._hips.add(tabardCrossV);
        const tabardCrossH = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.015, 0.005),
          goldMat,
        );
        tabardCrossH.position.set(0, -0.08, LOWER_TORSO_WIDTH * 0.38 + 0.025);
        this._hips.add(tabardCrossH);

        // Armored boots (extra cylinder layer on feet)
        for (const foot of [this._leftFoot, this._rightFoot]) {
          const armoredBoot = new THREE.Mesh(
            new THREE.CylinderGeometry(FOOT_LEN * 0.28, FOOT_LEN * 0.26, FOOT_HEIGHT * 2.0, 16),
            metalMat,
          );
          armoredBoot.position.set(0, FOOT_HEIGHT * 0.2, FOOT_LEN * 0.1);
          armoredBoot.castShadow = true;
          foot.add(armoredBoot);
        }
        break;
      }

      // ── Assassin (evasive) ──────────────────────────────────────────────
      case "evasive": {
        // Hood – half-sphere / cone covering top-back of head
        const hoodMat = makeMat(colors.secondary, 0, 0.9);
        const hood = new THREE.Mesh(
          new THREE.SphereGeometry(HEAD_RADIUS * 1.3, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
          hoodMat,
        );
        hood.position.set(0, HEAD_RADIUS * 0.8, -HEAD_RADIUS * 0.15);
        hood.castShadow = true;
        this._head.add(hood);

        // Hood drape (back part hangs down)
        const hoodDrape = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.14, 0.02),
          hoodMat,
        );
        hoodDrape.position.set(0, HEAD_RADIUS * 0.1, -HEAD_RADIUS * 1.0);
        hoodDrape.rotation.x = 0.2;
        hoodDrape.castShadow = true;
        this._head.add(hoodDrape);

        // Face mask – small box covering lower face
        const maskMat = makeMat(0x222222, 0, 0.85);
        const faceMask = new THREE.Mesh(
          new THREE.BoxGeometry(HEAD_RADIUS * 1.1, HEAD_RADIUS * 0.45, 0.04),
          maskMat,
        );
        faceMask.position.set(0, HEAD_RADIUS * 0.45, HEAD_RADIUS * 0.82);
        faceMask.castShadow = true;
        this._head.add(faceMask);

        // Dual daggers on each thigh – thin flat boxes
        for (const [thigh, side] of [[this._leftThigh, 1], [this._rightThigh, -1]] as [THREE.Group, number][]) {
          const dagger = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.25, 0.01),
            metalMat,
          );
          dagger.position.set(side * LIMB_THICKNESS * 1.8, -THIGH_LEN * 0.4, 0.02);
          dagger.castShadow = true;
          thigh.add(dagger);

          // Dagger handle
          const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.06, 0.015),
            darkMat,
          );
          handle.position.set(side * LIMB_THICKNESS * 1.8, -THIGH_LEN * 0.22, 0.02);
          handle.castShadow = true;
          thigh.add(handle);
        }

        // Slim build – scale down chest/torso width
        this._chest.scale.set(0.9, 1, 0.92);
        this._spineLower.scale.set(0.9, 1, 0.92);

        // Cloak / cape edges hanging from shoulders
        const cloakMat = makeMat(colors.secondary, 0, 0.9);
        for (const [clav, sx] of [[this._leftClavicle, 1], [this._rightClavicle, -1]] as [THREE.Group, number][]) {
          const cloakEdge = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12, 0.35),
            cloakMat,
          );
          cloakEdge.position.set(sx * 0.04, -0.12, -0.04);
          cloakEdge.rotation.x = 0.1;
          cloakEdge.rotation.y = sx * 0.15;
          cloakEdge.castShadow = true;
          clav.add(cloakEdge);
        }

        // Longer back cloak piece
        const backCloak = new THREE.Mesh(
          new THREE.PlaneGeometry(CHEST_WIDTH * 0.7, 0.5),
          cloakMat,
        );
        backCloak.position.set(0, CHEST_HEIGHT * 0.1, -CHEST_DEPTH * 0.5 - 0.02);
        backCloak.rotation.x = 0.08;
        backCloak.castShadow = true;
        this._chest.add(backCloak);

        // Throwing stars on belt (3 small flat box crosses on hip)
        for (let ts = 0; ts < 3; ts++) {
          const starH = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.004, 0.004),
            metalMat,
          );
          starH.position.set(-0.1 + ts * 0.04, -0.02, LOWER_TORSO_WIDTH * 0.38 + 0.01);
          this._hips.add(starH);
          const starV = new THREE.Mesh(
            new THREE.BoxGeometry(0.004, 0.025, 0.004),
            metalMat,
          );
          starV.position.set(-0.1 + ts * 0.04, -0.02, LOWER_TORSO_WIDTH * 0.38 + 0.01);
          this._hips.add(starV);
        }

        // Poison vial on thigh strap (small sphere + cylinder)
        const vialStrap = new THREE.Mesh(
          new THREE.TorusGeometry(LIMB_THICKNESS * 1.3, 0.005, 6, 12),
          darkMat,
        );
        vialStrap.rotation.x = Math.PI / 2;
        vialStrap.position.set(LIMB_THICKNESS * 1.5, -THIGH_LEN * 0.3, 0);
        this._rightThigh.add(vialStrap);
        const vialBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8),
          new THREE.MeshStandardMaterial({
            color: 0x22aa44, metalness: 0.1, roughness: 0.3,
            transparent: true, opacity: 0.7,
          }),
        );
        vialBody.position.set(LIMB_THICKNESS * 1.8, -THIGH_LEN * 0.3, 0.01);
        this._rightThigh.add(vialBody);
        const vialCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, 8, 6),
          darkMat,
        );
        vialCap.position.set(LIMB_THICKNESS * 1.8, -THIGH_LEN * 0.3 + 0.018, 0.01);
        this._rightThigh.add(vialCap);

        // Wrist blade (thin flat box extending from forearm bracer)
        for (const forearm of [this._leftForearm, this._rightForearm]) {
          const wristBlade = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.12, 0.003),
            metalMat,
          );
          wristBlade.position.set(0, -FOREARM_LEN * 0.75, LIMB_THICKNESS * 1.2);
          wristBlade.castShadow = true;
          forearm.add(wristBlade);
        }

        // Bandolier across chest (angled cylinder with small sphere pouches)
        const bandolierMat = makeMat(0x443322, 0.1, 0.7);
        const bandolier = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, CHEST_WIDTH * 1.1, 12),
          bandolierMat,
        );
        bandolier.position.set(0, CHEST_HEIGHT * 0.55, CHEST_DEPTH * 0.4);
        bandolier.rotation.z = 0.6;
        bandolier.castShadow = true;
        this._chest.add(bandolier);
        // Pouches on bandolier
        for (let bp = 0; bp < 4; bp++) {
          const pouch = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 8, 6),
            bandolierMat,
          );
          pouch.position.set(
            -0.06 + bp * 0.04,
            CHEST_HEIGHT * (0.42 + bp * 0.08),
            CHEST_DEPTH * 0.42,
          );
          pouch.scale.set(1, 0.8, 0.7);
          pouch.castShadow = true;
          this._chest.add(pouch);
        }
        break;
      }

      // ── Warlord (power) ─────────────────────────────────────────────────
      case "power": {
        // Battle axe on back – shaft + blade
        const axeShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.8, 12),
          makeMat(0x553311, 0.1, 0.7),
        );
        axeShaft.position.set(0.05, CHEST_HEIGHT * 0.1, -CHEST_DEPTH * 0.5 - 0.05);
        axeShaft.castShadow = true;
        this._chest.add(axeShaft);

        // Axe blade (flattened box)
        const axeBlade = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.14, 0.02),
          metalMat,
        );
        axeBlade.position.set(0.05, CHEST_HEIGHT * 0.1 + 0.4, -CHEST_DEPTH * 0.5 - 0.05);
        axeBlade.castShadow = true;
        this._chest.add(axeBlade);

        // Second blade (double-headed axe)
        const axeBlade2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.12, 0.02),
          metalMat,
        );
        axeBlade2.position.set(0.05, CHEST_HEIGHT * 0.1 - 0.38, -CHEST_DEPTH * 0.5 - 0.05);
        axeBlade2.castShadow = true;
        this._chest.add(axeBlade2);

        // Horned helmet – two cone meshes pointing up and out
        for (const side of [-1, 1]) {
          const horn = new THREE.Mesh(
            new THREE.ConeGeometry(0.02, 0.14, 6),
            makeMat(0xccbb88, 0.3, 0.5),
          );
          horn.position.set(
            side * HEAD_RADIUS * 0.7,
            HEAD_RADIUS * 1.35,
            -HEAD_RADIUS * 0.1,
          );
          horn.rotation.z = side * -0.4;
          horn.castShadow = true;
          this._head.add(horn);
        }

        // Helmet base (covers top of head)
        const helmetBase = new THREE.Mesh(
          new THREE.SphereGeometry(HEAD_RADIUS * 1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
          metalMat,
        );
        helmetBase.position.y = HEAD_RADIUS * 0.75;
        helmetBase.castShadow = true;
        this._head.add(helmetBase);

        // Helmet nose guard
        const noseGuard = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.1, 0.04),
          metalMat,
        );
        noseGuard.position.set(0, HEAD_RADIUS * 0.7, HEAD_RADIUS * 0.95);
        noseGuard.castShadow = true;
        this._head.add(noseGuard);

        // Fur mantle on shoulders – series of small stretched spheres
        const furMantleMat = makeMat(0x775533, 0, 0.95);
        for (const clav of [this._leftClavicle, this._rightClavicle]) {
          for (let i = 0; i < 5; i++) {
            const tuft = new THREE.Mesh(
              new THREE.SphereGeometry(0.03, 20, 16),
              furMantleMat,
            );
            tuft.position.set(
              -0.03 + i * 0.015,
              0.02 + (i % 2) * 0.01,
              -0.02 + (i % 3) * 0.015,
            );
            tuft.scale.set(1.2, 0.6, 1.4);
            tuft.castShadow = true;
            clav.add(tuft);
          }
        }
        // Fur draping down back of neck
        for (let i = 0; i < 6; i++) {
          const furBack = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 20, 16),
            furMantleMat,
          );
          furBack.position.set(
            -0.04 + i * 0.016,
            -NECK_LEN * 0.3,
            -NECK_RADIUS * 1.5 - (i % 2) * 0.01,
          );
          furBack.scale.set(1, 0.7, 1.3);
          furBack.castShadow = true;
          this._neck.add(furBack);
        }

        // Broader build – scale up chest and shoulders
        this._chest.scale.set(1.15, 1.05, 1.1);
        this._spineLower.scale.set(1.1, 1.0, 1.05);

        // Prominent belt buckle at waist
        const bigBuckle = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.06, 0.025),
          goldMat,
        );
        bigBuckle.position.set(0, 0.01, LOWER_TORSO_WIDTH * 0.38 + 0.02);
        bigBuckle.castShadow = true;
        this._hips.add(bigBuckle);

        // Buckle emblem (smaller centered piece)
        const buckleEmblem = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 12, 8),
          metalMat,
        );
        buckleEmblem.position.set(0, 0.01, LOWER_TORSO_WIDTH * 0.38 + 0.035);
        buckleEmblem.scale.set(1, 1, 0.4);
        buckleEmblem.castShadow = true;
        this._hips.add(buckleEmblem);

        // Trophy skulls on belt (2-3 small spheres with dark eye holes using boxes)
        const skullMat = makeMat(0xddddbb, 0.05, 0.5);
        const eyeHoleMat = makeMat(0x111111, 0.0, 0.9);
        for (let sk = 0; sk < 3; sk++) {
          const skull = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 12, 8),
            skullMat,
          );
          skull.position.set(-0.08 + sk * 0.06, -0.04, LOWER_TORSO_WIDTH * 0.38 + 0.02);
          skull.scale.set(0.8, 1, 0.7);
          skull.castShadow = true;
          this._hips.add(skull);
          // Eye holes
          for (const eSide of [-1, 1]) {
            const eyeHole = new THREE.Mesh(
              new THREE.BoxGeometry(0.005, 0.005, 0.005),
              eyeHoleMat,
            );
            eyeHole.position.set(
              -0.08 + sk * 0.06 + eSide * 0.006,
              -0.035,
              LOWER_TORSO_WIDTH * 0.38 + 0.033,
            );
            this._hips.add(eyeHole);
          }
        }

        // War drum on back (large cylinder)
        const drumMat = makeMat(0x664433, 0.1, 0.7);
        const warDrum = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16),
          drumMat,
        );
        warDrum.position.set(-0.06, CHEST_HEIGHT * 0.3, -CHEST_DEPTH * 0.5 - 0.08);
        warDrum.rotation.x = Math.PI / 2;
        warDrum.castShadow = true;
        this._chest.add(warDrum);
        // Drum skin (top face)
        const drumSkin = new THREE.Mesh(
          new THREE.CircleGeometry(0.078, 16),
          makeMat(0xccbb99, 0.0, 0.7),
        );
        drumSkin.position.set(-0.06, CHEST_HEIGHT * 0.3, -CHEST_DEPTH * 0.5 - 0.03);
        this._chest.add(drumSkin);

        // Extra large gauntlets (cylinder overlays on hands)
        for (const hand of [this._leftHand, this._rightHand]) {
          const gauntlet = new THREE.Mesh(
            new THREE.CylinderGeometry(HAND_LEN * 0.55, HAND_LEN * 0.5, HAND_LEN * 1.2, 16),
            metalMat,
          );
          gauntlet.position.y = -HAND_LEN * 0.4;
          gauntlet.castShadow = true;
          hand.add(gauntlet);
        }

        // Battle standard pole on back (tall thin cylinder with small box flag)
        const poleMat = makeMat(0x553311, 0.1, 0.7);
        const standardPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.9, 8),
          poleMat,
        );
        standardPole.position.set(0.08, CHEST_HEIGHT * 0.5 + 0.2, -CHEST_DEPTH * 0.5 - 0.04);
        standardPole.castShadow = true;
        this._chest.add(standardPole);
        // Flag
        const flagMat = new THREE.MeshStandardMaterial({
          color: colors.accent, metalness: 0.0, roughness: 0.85,
          side: THREE.DoubleSide,
        });
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.08, 0.003),
          flagMat,
        );
        flag.position.set(0.08 + 0.07, CHEST_HEIGHT * 0.5 + 0.58, -CHEST_DEPTH * 0.5 - 0.04);
        flag.castShadow = true;
        this._chest.add(flag);
        break;
      }
    }
  }

  // ---- CLOTH CAPE PHYSICS --------------------------------------------------

  /**
   * Build a Verlet-integrated cloth strip attached to the chest bone.
   * Grid size and material vary per archetype:
   *   balanced (knight), defensive (paladin), power (warlord) => full cape (4x6)
   *   evasive (assassin) => shorter cloak (4x4)
   *   rushdown (berserker) => fur mantle (4x3, rough material)
   *   mixup (monk) => cloth sash (2x5, attached at waist instead)
   */
  private _buildClothCape(): void {
    const arch = this._charDef.archetype;

    // Determine grid dimensions and material per archetype
    let cols: number;
    let rows: number;
    let spacing: number;
    let color: number;
    let roughness: number;
    let metalness: number;
    let attachBone: THREE.Group;
    let attachOffsetY: number;  // vertical offset from bone origin
    let attachOffsetZ: number;  // depth offset (behind body)

    switch (arch) {
      // Knight / Paladin / Warlord => full flowing cape
      case "balanced":
      case "defensive":
      case "power":
        cols = 4;
        rows = 6;
        spacing = 0.08;
        color = this._charDef.colors.primary;
        roughness = 0.8;
        metalness = 0.1;
        attachBone = this._chest;
        attachOffsetY = CHEST_HEIGHT * 0.85;
        attachOffsetZ = -CHEST_DEPTH / 2 - 0.02;
        break;

      // Assassin => shorter cloak
      case "evasive":
        cols = 4;
        rows = 4;
        spacing = 0.08;
        color = this._charDef.colors.secondary;
        roughness = 0.9;
        metalness = 0.0;
        attachBone = this._chest;
        attachOffsetY = CHEST_HEIGHT * 0.85;
        attachOffsetZ = -CHEST_DEPTH / 2 - 0.02;
        break;

      // Berserker => short fur mantle
      case "rushdown":
        cols = 4;
        rows = 3;
        spacing = 0.07;
        color = 0x664422;
        roughness = 0.95;
        metalness = 0.0;
        attachBone = this._chest;
        attachOffsetY = CHEST_HEIGHT * 0.85;
        attachOffsetZ = -CHEST_DEPTH / 2 - 0.02;
        break;

      // Monk => cloth sash from waist
      case "mixup":
        cols = 2;
        rows = 5;
        spacing = 0.07;
        color = this._charDef.colors.accent;
        roughness = 0.85;
        metalness = 0.0;
        attachBone = this._hips;
        attachOffsetY = 0.0;
        attachOffsetZ = -LOWER_TORSO_WIDTH * 0.35 - 0.02;
        break;

      default:
        // Unknown archetype — no cape
        return;
    }

    // Create particles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * spacing;
        const y = attachOffsetY - r * spacing;
        const z = attachOffsetZ;
        this._capeParticles.push({
          position: new THREE.Vector3(x, y, z),
          prevPosition: new THREE.Vector3(x, y, z),
          pinned: r === 0, // top row pinned to bone
        });
      }
    }

    // Create constraints (structural + shear for stability)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;

        // Right neighbor (structural horizontal)
        if (c < cols - 1) {
          this._capeConstraints.push({ p1: idx, p2: idx + 1, restLength: spacing });
        }
        // Bottom neighbor (structural vertical)
        if (r < rows - 1) {
          this._capeConstraints.push({ p1: idx, p2: idx + cols, restLength: spacing });
        }
        // Diagonal bottom-right (shear)
        if (c < cols - 1 && r < rows - 1) {
          this._capeConstraints.push({ p1: idx, p2: idx + cols + 1, restLength: spacing * Math.SQRT2 });
        }
        // Diagonal bottom-left (shear)
        if (c > 0 && r < rows - 1) {
          this._capeConstraints.push({ p1: idx, p2: idx + cols - 1, restLength: spacing * Math.SQRT2 });
        }
      }
    }

    // Build mesh geometry (indexed triangles)
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(cols * rows * 3);
    const indices: number[] = [];

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = r * cols + c;
        const tr = tl + 1;
        const bl = tl + cols;
        const br = bl + 1;
        indices.push(tl, bl, tr, tr, bl, br);
      }
    }

    // Initialize vertex positions from particles
    for (let i = 0; i < this._capeParticles.length; i++) {
      const p = this._capeParticles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      roughness,
      metalness,
    });

    this._capeMesh = new THREE.Mesh(geo, mat);
    this._capeMesh.castShadow = true;
    this._capeGeo = geo;

    // Attach to the correct bone
    attachBone.add(this._capeMesh);
  }

  /**
   * Step the Verlet cloth simulation each frame.
   * Applies gravity, wind from fighter movement / attacks, integrates positions,
   * then satisfies distance constraints and syncs the mesh geometry.
   */
  private _updateClothPhysics(fighter: TekkenFighter): void {
    if (this._capeParticles.length === 0) return;

    const gravity = new THREE.Vector3(0, -0.0004, 0);
    const damping = 0.97;

    // Wind derived from fighter movement (oppose velocity so cape trails behind)
    const windX = -fighter.velocity.x * 0.3;
    const windZ = -0.0002; // slight constant backward push

    const wind = new THREE.Vector3(windX, 0, windZ);

    // Attacks create dramatic turbulence
    if (fighter.state === TekkenFighterState.ATTACK) {
      wind.x += (Math.random() - 0.5) * 0.001;
      wind.z -= 0.0004;
    }

    // Dashes intensify wind
    if (fighter.state === TekkenFighterState.DASH_FORWARD) {
      wind.z -= 0.0006;
    } else if (fighter.state === TekkenFighterState.DASH_BACK) {
      wind.z += 0.0004;
    }

    // Juggle / knockdown — extra gravity
    if (fighter.state === TekkenFighterState.JUGGLE || fighter.state === TekkenFighterState.KNOCKDOWN) {
      gravity.y -= 0.0002;
      wind.x += (Math.random() - 0.5) * 0.0008;
    }

    // Hit-stun reactions — cape flings outward
    if (
      fighter.state === TekkenFighterState.HIT_STUN_HIGH ||
      fighter.state === TekkenFighterState.HIT_STUN_MID ||
      fighter.state === TekkenFighterState.HIT_STUN_LOW
    ) {
      wind.x += (Math.random() - 0.5) * 0.0012;
      wind.z -= 0.0003;
    }

    // Verlet integration
    for (const p of this._capeParticles) {
      if (p.pinned) continue;

      const vel = p.position.clone().sub(p.prevPosition).multiplyScalar(damping);
      p.prevPosition.copy(p.position);
      p.position.add(vel);
      p.position.add(gravity);
      p.position.add(wind);
    }

    // Satisfy distance constraints (3 iterations for stability)
    for (let iter = 0; iter < 3; iter++) {
      for (const c of this._capeConstraints) {
        const p1 = this._capeParticles[c.p1];
        const p2 = this._capeParticles[c.p2];

        const diff = p2.position.clone().sub(p1.position);
        const dist = diff.length();
        if (dist === 0) continue;

        const correction = diff.multiplyScalar((dist - c.restLength) / dist * 0.5);

        if (!p1.pinned) p1.position.add(correction);
        if (!p2.pinned) p2.position.sub(correction);
      }
    }

    // Sync mesh geometry from particle positions
    if (this._capeGeo) {
      const posArr = this._capeGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < this._capeParticles.length; i++) {
        const p = this._capeParticles[i];
        posArr[i * 3] = p.position.x;
        posArr[i * 3 + 1] = p.position.y;
        posArr[i * 3 + 2] = p.position.z;
      }
      this._capeGeo.attributes.position.needsUpdate = true;
      this._capeGeo.computeVertexNormals();
    }
  }

  // ---- UPDATE (called every frame) ----

  update(fighter: TekkenFighter): void {
    // Position and facing
    this.group.position.set(fighter.position.x, fighter.position.y, fighter.position.z);
    this.group.rotation.y = fighter.facingRight ? Math.PI / 2 : -Math.PI / 2;

    // State change detection with combo blend tracking
    if (fighter.state !== this._lastState) {
      const wasAttack = this._lastState === TekkenFighterState.ATTACK;
      const isAttack = fighter.state === TekkenFighterState.ATTACK;
      this._comboBlendActive = wasAttack && isAttack;
      this._stateTransitionFrame = 0;
      this._lastState = fighter.state;
      this._attackFrame = 0;
    }
    this._stateTransitionFrame++;

    // Adaptive blend speed: faster during combo transitions (first 4 frames)
    if (this._comboBlendActive && this._stateTransitionFrame <= 4) {
      this._blendSpeed = 0.35;
    } else {
      this._blendSpeed = 0.15;
    }

    this._idleTime += 0.016;

    // Reset hips to standing height by default; crouch states will override this
    const isCrouchState = fighter.state === TekkenFighterState.CROUCH ||
                          fighter.state === TekkenFighterState.CROUCH_IDLE ||
                          fighter.state === TekkenFighterState.BLOCK_CROUCH;
    if (!isCrouchState) {
      this._lerpPositionY(this._hips, TekkenFighterRenderer.STANDING_HIP_Y);
    }

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

    // Step cloth physics after all bone animation has been applied
    this._updateClothPhysics(fighter);
  }

  // ---- ANIMATION METHODS ----

  // Helper: smoothly blend bone rotation toward target
  private _lerpBone(bone: THREE.Group, tx: number, ty: number, tz: number, speed?: number): void {
    const s = speed ?? this._blendSpeed;
    bone.rotation.x += (tx - bone.rotation.x) * s;
    bone.rotation.y += (ty - bone.rotation.y) * s;
    bone.rotation.z += (tz - bone.rotation.z) * s;
  }

  // Helper: smoothly blend a bone's Y position (used for lowering hips during crouch)
  private _lerpPositionY(bone: THREE.Group, targetY: number, speed?: number): void {
    const s = speed ?? this._blendSpeed;
    bone.position.y += (targetY - bone.position.y) * s;
  }

  // Standing hip height (computed from leg bone lengths)
  private static readonly STANDING_HIP_Y = THIGH_LEN + SHIN_LEN + ANKLE_LEN + FOOT_HEIGHT;
  // Crouching hip height - drops significantly so the character visually ducks
  private static readonly CROUCH_HIP_Y = (THIGH_LEN + SHIN_LEN + ANKLE_LEN + FOOT_HEIGHT) * 0.52;

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
    // Drop the hips down so the character visually lowers to duck under attacks
    this._lerpPositionY(this._hips, TekkenFighterRenderer.CROUCH_HIP_Y);

    // Torso leans forward into a tight crouch
    this._lerpBone(this._hips, 0.1, 0, 0);
    this._lerpBone(this._spineLower, 0.35, 0, 0);
    this._lerpBone(this._spineUpper, 0.25, 0, 0);
    this._lerpBone(this._chest, 0.2, 0, 0);
    this._lerpBone(this._neck, -0.15, 0, 0);
    this._lerpBone(this._head, -0.2, 0, 0);

    // Arms in low guard, tucked close to body
    this._lerpBone(this._leftUpperArm, -0.1, 0.2, 0.7);
    this._lerpBone(this._leftForearm, -1.8, 0, 0);
    this._lerpBone(this._leftHand, -0.3, 0, 0);
    this._lerpBone(this._rightUpperArm, -0.2, -0.2, -0.8);
    this._lerpBone(this._rightForearm, -1.9, 0, 0);
    this._lerpBone(this._rightHand, -0.3, 0, 0);

    // Deep knee bend - legs spread and bent heavily
    this._lerpBone(this._leftThigh, -1.2, 0, 0.35);
    this._lerpBone(this._leftShin, 1.8, 0, 0);
    this._lerpBone(this._leftAnkle, -0.5, 0, 0);
    this._lerpBone(this._rightThigh, -1.1, 0, -0.4);
    this._lerpBone(this._rightShin, 1.7, 0, 0);
    this._lerpBone(this._rightAnkle, -0.5, 0, 0);
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
    // Drop the hips to crouching height
    this._lerpPositionY(this._hips, TekkenFighterRenderer.CROUCH_HIP_Y);

    // Crouching block - torso tucked, leaning back slightly to absorb
    this._lerpBone(this._hips, 0.05, 0, 0);
    this._lerpBone(this._spineLower, 0.3, 0, 0);
    this._lerpBone(this._spineUpper, 0.15, 0, 0);
    this._lerpBone(this._chest, -0.05, 0, 0);
    this._lerpBone(this._neck, -0.1, 0, 0);
    this._lerpBone(this._head, -0.15, 0, 0);

    // Arms up in guard while crouched
    this._lerpBone(this._leftUpperArm, -0.5, 0.3, 0.6);
    this._lerpBone(this._leftForearm, -1.9, 0, 0);
    this._lerpBone(this._rightUpperArm, -0.6, -0.3, -0.6);
    this._lerpBone(this._rightForearm, -1.9, 0, 0);

    // Deep knee bend for crouching block
    this._lerpBone(this._leftThigh, -1.2, 0, 0.3);
    this._lerpBone(this._leftShin, 1.8, 0, 0);
    this._lerpBone(this._leftAnkle, -0.5, 0, 0);
    this._lerpBone(this._rightThigh, -1.1, 0, -0.35);
    this._lerpBone(this._rightShin, 1.7, 0, 0);
    this._lerpBone(this._rightAnkle, -0.5, 0, 0);
  }

  private _animateAttack(fighter: TekkenFighter): void {
    this._attackFrame++;
    const f = this._attackFrame;
    const moveDef = fighter.currentMove;

    if (!moveDef) { this._animateIdle(); return; }

    const phase = fighter.movePhase;
    // Smoother easing curves per phase
    let progress: number;
    if (phase === "startup") {
      const t = Math.min(f / 10, 1);
      progress = t * t * (3 - 2 * t); // smoothstep for windup anticipation
    } else if (phase === "active") {
      progress = 1;
    } else if (phase === "recovery") {
      const t = Math.min(f / 12, 1);
      progress = 1 - t * t; // decel curve for follow-through
    } else {
      progress = 0;
    }

    // Detect move type from ID patterns
    const isKick = moveDef.includes("kick") || moveDef.includes("3") || moveDef.includes("4") || moveDef.includes("lk") || moveDef.includes("rk");
    const isLow = moveDef.includes("d+3") || moveDef.includes("d+4") || moveDef.includes("d/b") || moveDef.includes("ankle") || moveDef.includes("sweep") || moveDef.includes("low") || moveDef.includes("hellsweep");
    const isLauncher = moveDef.includes("uppercut") || moveDef.includes("hopkick") || moveDef.includes("d+2") || moveDef.includes("d/f+2") || moveDef.includes("u/f") || moveDef.includes("jumping");
    const isRight = moveDef.includes("rp") || moveDef.includes("rk") || moveDef.includes("2") || moveDef.includes("4") || moveDef.includes("straight") || moveDef.includes("roundhouse");
    const isElbow = moveDef.includes("elbow");
    const isKnee = moveDef.includes("knee");
    const isSpinning = moveDef.includes("spin") || moveDef.includes("homing") || moveDef.includes("b+4");
    const isGrab = moveDef.includes("throw") || moveDef.includes("grab") || moveDef.includes("1+3") || moveDef.includes("f+1+3");
    const isRage = moveDef.includes("rage");
    const isFlurry = moveDef.includes("flurry") || moveDef.includes("string") || moveDef.includes("rush") || moveDef.includes("1,2");
    const isSlash = moveDef.includes("slash") || moveDef.includes("cleave") || moveDef.includes("cut") || moveDef.includes("rend") || moveDef.includes("arc") || moveDef.includes("scythe");
    const isOverhead = moveDef.includes("smash") || moveDef.includes("slam") || moveDef.includes("crush") || moveDef.includes("hammer") || moveDef.includes("drop") || moveDef.includes("chop") || moveDef.includes("splitter") || moveDef.includes("pound") || moveDef.includes("meteor") || moveDef.includes("smite");
    const isThrust = moveDef.includes("thrust") || moveDef.includes("stab") || moveDef.includes("impale") || moveDef.includes("lance") || moveDef.includes("pierce");
    const isStomp = moveDef.includes("stomp") || moveDef.includes("earthquake") || moveDef.includes("ground_pound");
    const isHeadbutt = moveDef.includes("headbutt");
    const isShield = moveDef.includes("shield") || moveDef.includes("bulwark") || moveDef.includes("aegis");
    const isPalm = moveDef.includes("palm") || moveDef.includes("push") || moveDef.includes("shove");
    const isDive = moveDef.includes("dive") || moveDef.includes("diving") || moveDef.includes("aerial") || moveDef.includes("descent") || moveDef.includes("death_from_above") || moveDef.includes("vault");
    const isBackhand = moveDef.includes("backhand") || moveDef.includes("backfist") || moveDef.includes("backslash");

    if (isGrab) {
      this._animateGrabAttack(progress, isRight);
    } else if (isRage) {
      this._animateRageAttack(progress, f);
    } else if (isHeadbutt) {
      this._animateHeadbuttAttack(progress);
    } else if (isDive) {
      this._animateDiveAttack(progress, f);
    } else if (isShield) {
      this._animateShieldAttack(progress, isRight);
    } else if (isStomp) {
      this._animateStompAttack(progress);
    } else if (isBackhand) {
      this._animateBackhandAttack(progress, isRight);
    } else if (isElbow) {
      this._animateElbowAttack(progress, isRight);
    } else if (isKnee) {
      this._animateKneeAttack(progress, isRight);
    } else if (isSpinning) {
      this._animateSpinningAttack(progress, isLow, isRight);
    } else if (isFlurry) {
      this._animateFlurryAttack(progress, f);
    } else if (isOverhead) {
      this._animateOverheadAttack(progress, isLauncher);
    } else if (isSlash) {
      this._animateSlashAttack(progress, isLow, isRight);
    } else if (isThrust) {
      this._animateThrustAttack(progress, isLow, isRight);
    } else if (isPalm) {
      this._animatePalmAttack(progress, isRight);
    } else if (isKick) {
      this._animateKickAttack(progress, isLow, isLauncher, isRight);
    } else {
      this._animatePunchAttack(progress, isLow, isLauncher, isRight);
    }
  }

  private _animatePunchAttack(progress: number, isLow: boolean, isLauncher: boolean, isRight: boolean): void {
    const p = progress;

    // Spine twist with weight transfer — torso coils before extending
    const coilPhase = Math.min(p * 1.5, 1); // faster coil than extension
    const extensionPhase = Math.max(0, (p - 0.3) / 0.7); // extension starts after coil

    this._lerpBone(this._spineLower, isLow ? 0.25 : -0.04 * p, isRight ? -0.35 * coilPhase : 0.35 * coilPhase, 0.02 * p, 0.3);
    this._lerpBone(this._spineUpper, isLauncher ? -0.25 * p : 0.03, isRight ? -0.25 * coilPhase : 0.25 * coilPhase, 0, 0.3);
    this._lerpBone(this._chest, isLauncher ? -0.35 * p : 0.06, isRight ? -0.1 * p : 0.1 * p, 0, 0.28);
    // Head tracks forward
    this._lerpBone(this._head, isLauncher ? -0.15 * p : 0.04, 0, 0, 0.2);

    if (isRight) {
      // Right punch: shoulder drives, arm snaps out, wrist turns over
      this._lerpBone(this._rightClavicle, -0.05 * p, 0, -0.2 * p, 0.3);
      this._lerpBone(this._rightUpperArm, -0.9 * extensionPhase, -0.5 * extensionPhase, -0.25 * (1 - extensionPhase), 0.3);
      this._lerpBone(this._rightForearm, -0.4 * (1 - extensionPhase), 0, -0.15 * p, 0.3);
      this._lerpBone(this._rightHand, -0.35, 0.1 * p, -0.1 * p, 0.3);
      this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.3); // tight fist
      this._lerpBone(this._rightThumb, -0.5, 0.2, 0, 0.3);

      // Left arm guard — elbow tucked, hand near chin
      this._lerpBone(this._leftClavicle, 0, 0, 0.05, 0.15);
      this._lerpBone(this._leftUpperArm, -0.5, 0.1, 0.8, 0.18);
      this._lerpBone(this._leftForearm, -1.5, 0, 0, 0.18);
      this._lerpBone(this._leftFingers, -0.7, 0, 0, 0.18);
    } else {
      // Left punch
      this._lerpBone(this._leftClavicle, -0.05 * p, 0, 0.2 * p, 0.3);
      this._lerpBone(this._leftUpperArm, -0.9 * extensionPhase, 0.5 * extensionPhase, 0.25 * (1 - extensionPhase), 0.3);
      this._lerpBone(this._leftForearm, -0.4 * (1 - extensionPhase), 0, 0.15 * p, 0.3);
      this._lerpBone(this._leftHand, -0.35, -0.1 * p, 0.1 * p, 0.3);
      this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.3);
      this._lerpBone(this._leftThumb, -0.5, -0.2, 0, 0.3);

      // Right arm guard
      this._lerpBone(this._rightClavicle, 0, 0, -0.05, 0.15);
      this._lerpBone(this._rightUpperArm, -0.5, -0.1, -0.8, 0.18);
      this._lerpBone(this._rightForearm, -1.5, 0, 0, 0.18);
      this._lerpBone(this._rightFingers, -0.7, 0, 0, 0.18);
    }

    // Legs: weight transfer with punch
    if (isLauncher) {
      // Rising uppercut — explosive push from rear leg, body lifts
      this._lerpBone(this._hips, -0.08 * p, 0, 0, 0.25);
      this._lerpBone(this._leftThigh, -0.1 - 0.15 * p, 0, 0.15, 0.25);
      this._lerpBone(this._leftShin, 0.25 + 0.2 * p, 0, 0, 0.25);
      this._lerpBone(this._rightThigh, -0.35 * p, 0, -0.12, 0.25);
      this._lerpBone(this._rightShin, 0.7 * p, 0, 0, 0.25);
      this._lerpBone(this._rightFoot, -0.2 * p, 0, 0, 0.25);
    } else if (isLow) {
      // Low punch — deep crouch, lead hand reaches down
      this._lerpBone(this._hips, 0.08, 0, 0, 0.22);
      this._lerpBone(this._leftThigh, -0.7, 0, 0.22, 0.22);
      this._lerpBone(this._leftShin, 1.1, 0, 0, 0.22);
      this._lerpBone(this._rightThigh, -0.6, 0, -0.22, 0.22);
      this._lerpBone(this._rightShin, 1.0, 0, 0, 0.22);
    } else {
      // Mid stance — lead foot steps, rear foot pivots
      this._lerpBone(this._leftThigh, -0.22, 0, 0.13, 0.18);
      this._lerpBone(this._leftShin, 0.38, 0, 0, 0.18);
      this._lerpBone(this._leftAnkle, -0.05 * p, 0, 0, 0.18);
      this._lerpBone(this._rightThigh, -0.16 - 0.12 * p, 0, -0.13, 0.18);
      this._lerpBone(this._rightShin, 0.32, 0, 0, 0.18);
      this._lerpBone(this._rightAnkle, 0.05 * p, 0, 0, 0.18);
    }
  }

  private _animateKickAttack(progress: number, isLow: boolean, isLauncher: boolean, isRight: boolean): void {
    const p = progress;

    // Dynamic lean — body counterbalances the kicking leg
    const leanBack = isLauncher ? -0.2 * p : isLow ? 0.12 : -0.12 * p;
    const lateralLean = isRight ? 0.08 * p : -0.08 * p; // lean away from kicking leg
    this._lerpBone(this._spineLower, leanBack, 0, lateralLean, 0.28);
    this._lerpBone(this._spineUpper, isLauncher ? -0.18 * p : -0.06 * p, 0, lateralLean * 0.5, 0.28);
    this._lerpBone(this._chest, -0.12 * p, 0, lateralLean * 0.3, 0.28);
    this._lerpBone(this._head, 0.05 * p, 0, 0, 0.2); // head stays level

    // Arms react for balance — opposite to kick direction
    const armSpread = isLauncher ? 0.8 : 0.5;
    this._lerpBone(this._leftUpperArm, -0.45, 0.25 * p, armSpread + 0.15 * p, 0.22);
    this._lerpBone(this._leftForearm, -1.2 - 0.2 * p, 0, 0, 0.22);
    this._lerpBone(this._leftFingers, -0.5, 0, 0, 0.22);
    this._lerpBone(this._rightUpperArm, -0.45, -0.25 * p, -armSpread - 0.15 * p, 0.22);
    this._lerpBone(this._rightForearm, -1.2 - 0.2 * p, 0, 0, 0.22);
    this._lerpBone(this._rightFingers, -0.5, 0, 0, 0.22);

    // Kicking leg and plant leg
    const kickSide = isRight;
    const kickThigh = kickSide ? this._rightThigh : this._leftThigh;
    const kickShin = kickSide ? this._rightShin : this._leftShin;
    const kickAnkle = kickSide ? this._rightAnkle : this._leftAnkle;
    const kickToes = kickSide ? this._rightToes : this._leftToes;
    const plantThigh = kickSide ? this._leftThigh : this._rightThigh;
    const plantShin = kickSide ? this._leftShin : this._rightShin;
    const plantAnkle = kickSide ? this._leftAnkle : this._rightAnkle;
    const sideSign = kickSide ? -1 : 1;

    if (isLauncher) {
      // Hopkick — explosive upward, knee drives high, shin snaps out
      this._lerpBone(this._hips, -0.1 * p, 0, 0, 0.28);
      this._lerpBone(kickThigh, -1.4 * p, 0, sideSign * 0.08, 0.35);
      this._lerpBone(kickShin, 0.15 * (1 - p), 0, 0, 0.35);
      this._lerpBone(kickAnkle, 0.35 * p, 0, 0, 0.35);
      this._lerpBone(kickToes, -0.35 * p, 0, 0, 0.35);
    } else if (isLow) {
      // Low kick — crouch and sweep, ankle turns
      this._lerpBone(this._hips, 0.06, 0, 0, 0.25);
      this._lerpBone(kickThigh, 0.35 * p, 0, sideSign * 0.35 * p, 0.32);
      this._lerpBone(kickShin, 0.15, 0, 0, 0.32);
      this._lerpBone(kickAnkle, -0.25, 0, sideSign * 0.1, 0.32);
    } else {
      // Mid/high kick — hip rotation drives the kick, full extension
      this._lerpBone(this._hips, 0, isRight ? -0.12 * p : 0.12 * p, 0, 0.28);
      this._lerpBone(kickThigh, -1.15 * p, 0, sideSign * 0.12, 0.32);
      this._lerpBone(kickShin, 0.45 * (1 - p), 0, 0, 0.32);
      this._lerpBone(kickAnkle, 0.25 * p, 0, 0, 0.32);
      this._lerpBone(kickToes, -0.22, 0, 0, 0.32);
    }

    // Plant leg — stable base, slight bend for power
    this._lerpBone(plantThigh, -0.22 - 0.05 * p, 0, -sideSign * 0.16, 0.18);
    this._lerpBone(plantShin, 0.42, 0, 0, 0.18);
    this._lerpBone(plantAnkle, -0.04, 0, 0, 0.18);
  }

  private _animateElbowAttack(progress: number, isRight: boolean): void {
    const p = progress;

    // Elbow drives forward from close range - torso twists hard
    this._lerpBone(this._spineLower, 0.05, isRight ? -0.4 * p : 0.4 * p, 0, 0.3);
    this._lerpBone(this._spineUpper, 0.02, isRight ? -0.3 * p : 0.3 * p, 0, 0.3);
    this._lerpBone(this._chest, 0.08, 0, 0, 0.3);

    if (isRight) {
      // Right elbow: upper arm swings forward, forearm tucked tight
      this._lerpBone(this._rightClavicle, 0, 0, -0.2 * p, 0.3);
      this._lerpBone(this._rightUpperArm, -1.2 * p, -0.3 * p, -0.5 * p, 0.3);
      this._lerpBone(this._rightForearm, -2.2 * p, 0, 0, 0.3); // tight fold = elbow forward
      this._lerpBone(this._rightHand, -0.4, 0, 0, 0.3);
      this._lerpBone(this._rightFingers, -0.8, 0, 0, 0.3);
      // Left guard
      this._lerpBone(this._leftUpperArm, -0.4, 0, 0.7, 0.15);
      this._lerpBone(this._leftForearm, -1.4, 0, 0, 0.15);
    } else {
      this._lerpBone(this._leftClavicle, 0, 0, 0.2 * p, 0.3);
      this._lerpBone(this._leftUpperArm, -1.2 * p, 0.3 * p, 0.5 * p, 0.3);
      this._lerpBone(this._leftForearm, -2.2 * p, 0, 0, 0.3);
      this._lerpBone(this._leftHand, -0.4, 0, 0, 0.3);
      this._lerpBone(this._leftFingers, -0.8, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, -0.4, 0, -0.7, 0.15);
      this._lerpBone(this._rightForearm, -1.4, 0, 0, 0.15);
    }

    // Legs: step forward with elbow
    this._lerpBone(this._leftThigh, -0.25 - 0.1 * p, 0, 0.12, 0.2);
    this._lerpBone(this._leftShin, 0.4, 0, 0, 0.2);
    this._lerpBone(this._rightThigh, -0.15, 0, -0.12, 0.2);
    this._lerpBone(this._rightShin, 0.3, 0, 0, 0.2);
  }

  private _animateSpinningAttack(progress: number, isLow: boolean, _isRight: boolean): void {
    const p = progress;

    // Full body spin: hips and spine rotate through
    const spinAngle = p * Math.PI * 1.2;
    this._lerpBone(this._hips, isLow ? 0.15 : 0, spinAngle * 0.3, 0, 0.25);
    this._lerpBone(this._spineLower, isLow ? 0.1 : -0.05, spinAngle * 0.5, 0, 0.25);
    this._lerpBone(this._spineUpper, -0.05 * p, spinAngle * 0.4, 0, 0.25);
    this._lerpBone(this._chest, -0.1 * p, spinAngle * 0.3, 0, 0.25);
    this._lerpBone(this._head, 0, -spinAngle * 0.2, 0, 0.2); // head counter-rotates

    // Arms fling outward during spin
    this._lerpBone(this._leftUpperArm, -0.3, 0.4 * p, 1.2 * p, 0.25);
    this._lerpBone(this._leftForearm, -0.8, 0, 0, 0.25);
    this._lerpBone(this._rightUpperArm, -0.3, -0.4 * p, -1.2 * p, 0.25);
    this._lerpBone(this._rightForearm, -0.8, 0, 0, 0.25);

    if (isLow) {
      // Low spinning sweep: deep crouch, leg extends
      this._lerpBone(this._leftThigh, -0.8, 0, 0.3 * p, 0.3);
      this._lerpBone(this._leftShin, 1.2, 0, 0, 0.3);
      this._lerpBone(this._rightThigh, 0.4 * p, 0, -0.4 * p, 0.3);
      this._lerpBone(this._rightShin, 0.1, 0, 0, 0.3);
    } else {
      // Standing spinning kick
      this._lerpBone(this._leftThigh, -0.2, 0, 0.15, 0.2);
      this._lerpBone(this._leftShin, 0.35, 0, 0, 0.2);
      this._lerpBone(this._rightThigh, -0.8 * p, 0, -0.3 * p, 0.3);
      this._lerpBone(this._rightShin, 0.3 * (1 - p), 0, 0, 0.3);
      this._lerpBone(this._rightAnkle, 0.2 * p, 0, 0, 0.3);
    }
  }

  private _animateGrabAttack(progress: number, _isRight: boolean): void {
    const p = progress;

    // Grab: both arms extend forward to seize opponent
    this._lerpBone(this._spineLower, 0.1 * p, 0, 0, 0.3);
    this._lerpBone(this._spineUpper, 0.08 * p, 0, 0, 0.3);
    this._lerpBone(this._chest, 0.12 * p, 0, 0, 0.3);
    this._lerpBone(this._head, -0.05, 0, 0, 0.2);

    // Both arms reach forward
    this._lerpBone(this._leftClavicle, 0, 0, 0.15 * p, 0.3);
    this._lerpBone(this._leftUpperArm, -0.9 * p, 0.2 * p, 0.3 * p, 0.3);
    this._lerpBone(this._leftForearm, -0.6 * (1 - p), 0, 0, 0.3);
    this._lerpBone(this._leftHand, -0.1 * p, 0, 0, 0.3);
    this._lerpBone(this._leftFingers, -0.3 * p, 0, 0, 0.3); // open hand reaching

    this._lerpBone(this._rightClavicle, 0, 0, -0.15 * p, 0.3);
    this._lerpBone(this._rightUpperArm, -0.9 * p, -0.2 * p, -0.3 * p, 0.3);
    this._lerpBone(this._rightForearm, -0.6 * (1 - p), 0, 0, 0.3);
    this._lerpBone(this._rightHand, -0.1 * p, 0, 0, 0.3);
    this._lerpBone(this._rightFingers, -0.3 * p, 0, 0, 0.3);

    // Step forward aggressively
    this._lerpBone(this._leftThigh, -0.3 * p, 0, 0.12, 0.2);
    this._lerpBone(this._leftShin, 0.5 * p, 0, 0, 0.2);
    this._lerpBone(this._rightThigh, -0.15, 0, -0.12, 0.15);
    this._lerpBone(this._rightShin, 0.25, 0, 0, 0.15);
  }

  private _animateKneeAttack(progress: number, isRight: boolean): void {
    const p = progress;
    const s = isRight ? -1 : 1;

    // Knee strike — hips drive forward, trunk stays upright, rear knee thrusts
    this._lerpBone(this._hips, 0.05 * p, s * 0.1 * p, 0, 0.3);
    this._lerpBone(this._spineLower, 0.08 * p, s * 0.15 * p, 0, 0.28);
    this._lerpBone(this._spineUpper, -0.05, 0, 0, 0.25);
    this._lerpBone(this._chest, 0.1 * p, 0, 0, 0.25);
    this._lerpBone(this._head, -0.08, 0, 0, 0.2);

    // Arms guard close to body, slight forward lean
    this._lerpBone(this._leftUpperArm, -0.6, 0.15, 0.75, 0.22);
    this._lerpBone(this._leftForearm, -1.5, 0, 0, 0.22);
    this._lerpBone(this._rightUpperArm, -0.6, -0.15, -0.75, 0.22);
    this._lerpBone(this._rightForearm, -1.5, 0, 0, 0.22);

    // Kicking leg — knee drives up sharply, shin stays tucked
    const kickThigh = isRight ? this._rightThigh : this._leftThigh;
    const kickShin = isRight ? this._rightShin : this._leftShin;
    const kickAnkle = isRight ? this._rightAnkle : this._leftAnkle;
    const plantThigh = isRight ? this._leftThigh : this._rightThigh;
    const plantShin = isRight ? this._leftShin : this._rightShin;

    this._lerpBone(kickThigh, -1.4 * p, 0, s * 0.1, 0.35);
    this._lerpBone(kickShin, 1.6 * p, 0, 0, 0.35); // tucked shin = knee forward
    this._lerpBone(kickAnkle, -0.3 * p, 0, 0, 0.35);

    // Plant leg — springy push
    this._lerpBone(plantThigh, -0.2 - 0.08 * p, 0, -s * 0.15, 0.2);
    this._lerpBone(plantShin, 0.35 + 0.15 * p, 0, 0, 0.2);
  }

  private _animateRageAttack(progress: number, frame: number): void {
    const p = progress;
    // Rage art: dramatic multi-phase cinematic attack
    const phase = frame < 8 ? 0 : frame < 16 ? 1 : 2; // windup, strike, follow-through

    if (phase === 0) {
      // Windup — crouch, pull both fists back, intense lean
      const wp = Math.min(frame / 8, 1);
      this._lerpBone(this._hips, 0.1 * wp, 0, 0, 0.35);
      this._lerpBone(this._spineLower, 0.15 * wp, 0, 0, 0.35);
      this._lerpBone(this._spineUpper, 0.1 * wp, 0, 0, 0.35);
      this._lerpBone(this._chest, 0.2 * wp, 0, 0, 0.35);
      this._lerpBone(this._head, -0.2 * wp, 0, 0, 0.3);
      this._lerpBone(this._leftUpperArm, 0.3 * wp, 0.3 * wp, 0.8, 0.3);
      this._lerpBone(this._leftForearm, -2.0 * wp, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, 0.3 * wp, -0.3 * wp, -0.8, 0.3);
      this._lerpBone(this._rightForearm, -2.0 * wp, 0, 0, 0.3);
      this._lerpBone(this._leftThigh, -0.5, 0, 0.2, 0.25);
      this._lerpBone(this._leftShin, 0.8, 0, 0, 0.25);
      this._lerpBone(this._rightThigh, -0.5, 0, -0.2, 0.25);
      this._lerpBone(this._rightShin, 0.8, 0, 0, 0.25);
    } else if (phase === 1) {
      // Explosive double punch — both arms thrust forward, body unfurls
      const sp = Math.min((frame - 8) / 8, 1);
      this._lerpBone(this._hips, -0.05 * sp, 0, 0, 0.4);
      this._lerpBone(this._spineLower, -0.1 * sp, 0, 0, 0.4);
      this._lerpBone(this._spineUpper, -0.08 * sp, 0, 0, 0.4);
      this._lerpBone(this._chest, -0.15 * sp, 0, 0, 0.4);
      this._lerpBone(this._head, 0.05, 0, 0, 0.3);
      this._lerpBone(this._leftUpperArm, -1.0 * sp, 0.4 * sp, 0.2 * (1 - sp), 0.4);
      this._lerpBone(this._leftForearm, -0.3 * (1 - sp), 0, 0, 0.4);
      this._lerpBone(this._leftFingers, -1.0, 0, 0, 0.4);
      this._lerpBone(this._rightUpperArm, -1.0 * sp, -0.4 * sp, -0.2 * (1 - sp), 0.4);
      this._lerpBone(this._rightForearm, -0.3 * (1 - sp), 0, 0, 0.4);
      this._lerpBone(this._rightFingers, -1.0, 0, 0, 0.4);
      this._lerpBone(this._leftThigh, -0.25 - 0.1 * sp, 0, 0.14, 0.3);
      this._lerpBone(this._leftShin, 0.4, 0, 0, 0.3);
      this._lerpBone(this._rightThigh, -0.2, 0, -0.14, 0.3);
      this._lerpBone(this._rightShin, 0.35, 0, 0, 0.3);
    } else {
      // Follow-through — arms still extended, body settling
      this._lerpBone(this._spineLower, -0.05 * p, 0, 0, 0.2);
      this._lerpBone(this._chest, -0.1 * p, 0, 0, 0.2);
      this._lerpBone(this._leftUpperArm, -0.9 * p, 0.35 * p, 0.15, 0.25);
      this._lerpBone(this._leftForearm, -0.2, 0, 0, 0.25);
      this._lerpBone(this._rightUpperArm, -0.9 * p, -0.35 * p, -0.15, 0.25);
      this._lerpBone(this._rightForearm, -0.2, 0, 0, 0.25);
      this._lerpBone(this._leftThigh, -0.22, 0, 0.13, 0.18);
      this._lerpBone(this._leftShin, 0.38, 0, 0, 0.18);
      this._lerpBone(this._rightThigh, -0.18, 0, -0.13, 0.18);
      this._lerpBone(this._rightShin, 0.32, 0, 0, 0.18);
    }
  }

  private _animateFlurryAttack(_progress: number, frame: number): void {
    // Rapid alternating punches — left, right, left, right
    const hitIdx = Math.floor(frame / 4) % 4; // cycles through 4 hits
    const hitProgress = (frame % 4) / 4;
    const hp = hitProgress * hitProgress * (3 - 2 * hitProgress); // smoothstep
    const isRightHit = hitIdx % 2 === 1;

    // Body rocks side to side with each hit
    const rockAngle = isRightHit ? -0.15 : 0.15;
    this._lerpBone(this._spineLower, 0.04, rockAngle * hp, 0, 0.35);
    this._lerpBone(this._spineUpper, 0.02, rockAngle * 0.7 * hp, 0, 0.35);
    this._lerpBone(this._chest, 0.06, rockAngle * 0.4 * hp, 0, 0.32);
    this._lerpBone(this._head, 0.03, 0, 0, 0.25);

    // Alternating arms — one extends while other retracts
    if (isRightHit) {
      this._lerpBone(this._rightUpperArm, -0.85 * hp, -0.4 * hp, -0.2 * (1 - hp), 0.4);
      this._lerpBone(this._rightForearm, -0.3 * (1 - hp), 0, 0, 0.4);
      this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.4);
      this._lerpBone(this._leftUpperArm, -0.45, 0.1, 0.75, 0.35);
      this._lerpBone(this._leftForearm, -1.4, 0, 0, 0.35);
    } else {
      this._lerpBone(this._leftUpperArm, -0.85 * hp, 0.4 * hp, 0.2 * (1 - hp), 0.4);
      this._lerpBone(this._leftForearm, -0.3 * (1 - hp), 0, 0, 0.4);
      this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.4);
      this._lerpBone(this._rightUpperArm, -0.45, -0.1, -0.75, 0.35);
      this._lerpBone(this._rightForearm, -1.4, 0, 0, 0.35);
    }

    // Shuffling feet — quick in-place weight shifts
    const footShift = Math.sin(frame * 0.8) * 0.08;
    this._lerpBone(this._leftThigh, -0.22 + footShift, 0, 0.13, 0.2);
    this._lerpBone(this._leftShin, 0.38, 0, 0, 0.2);
    this._lerpBone(this._rightThigh, -0.18 - footShift, 0, -0.13, 0.2);
    this._lerpBone(this._rightShin, 0.34, 0, 0, 0.2);
  }

  private _animateSlashAttack(progress: number, isLow: boolean, isRight: boolean): void {
    const p = progress;
    const s = isRight ? -1 : 1;

    // Wide arcing swing from one side across the body
    const windPhase = Math.min(p * 1.8, 1);
    const swingPhase = Math.max(0, (p - 0.25) / 0.75);

    // Torso rotates dramatically to drive the slash
    this._lerpBone(this._hips, isLow ? 0.12 : 0, s * (-0.25 + 0.5 * swingPhase), 0, 0.3);
    this._lerpBone(this._spineLower, isLow ? 0.15 : -0.05 * p, s * (-0.35 * windPhase + 0.7 * swingPhase), 0.04 * s * p, 0.3);
    this._lerpBone(this._spineUpper, -0.06 * p, s * (-0.25 * windPhase + 0.5 * swingPhase), 0, 0.3);
    this._lerpBone(this._chest, -0.08 * p, s * (-0.15 * windPhase + 0.3 * swingPhase), 0, 0.28);
    this._lerpBone(this._head, 0.04, s * 0.1 * swingPhase, 0, 0.2);

    // Lead arm sweeps in wide arc — extended reach
    if (isRight) {
      this._lerpBone(this._rightClavicle, -0.1 * p, 0, -0.15 * p, 0.3);
      this._lerpBone(this._rightUpperArm, -0.7 * swingPhase - 0.2, -0.6 * windPhase + 0.8 * swingPhase, -0.4 * swingPhase, 0.32);
      this._lerpBone(this._rightForearm, -0.3 * (1 - swingPhase), 0, -0.1 * p, 0.32);
      this._lerpBone(this._rightHand, -0.2 * p, 0, -0.15, 0.3);
      this._lerpBone(this._rightFingers, -0.85, 0, 0, 0.3);
      // Off-hand follows or guards
      this._lerpBone(this._leftUpperArm, -0.4, 0.2, 0.6, 0.18);
      this._lerpBone(this._leftForearm, -1.3, 0, 0, 0.18);
    } else {
      this._lerpBone(this._leftClavicle, -0.1 * p, 0, 0.15 * p, 0.3);
      this._lerpBone(this._leftUpperArm, -0.7 * swingPhase - 0.2, 0.6 * windPhase - 0.8 * swingPhase, 0.4 * swingPhase, 0.32);
      this._lerpBone(this._leftForearm, -0.3 * (1 - swingPhase), 0, 0.1 * p, 0.32);
      this._lerpBone(this._leftHand, -0.2 * p, 0, 0.15, 0.3);
      this._lerpBone(this._leftFingers, -0.85, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, -0.4, -0.2, -0.6, 0.18);
      this._lerpBone(this._rightForearm, -1.3, 0, 0, 0.18);
    }

    // Legs: pivot stance for the swing
    if (isLow) {
      this._lerpBone(this._leftThigh, -0.65, 0, 0.22, 0.22);
      this._lerpBone(this._leftShin, 1.0, 0, 0, 0.22);
      this._lerpBone(this._rightThigh, -0.55, 0, -0.22, 0.22);
      this._lerpBone(this._rightShin, 0.9, 0, 0, 0.22);
    } else {
      this._lerpBone(this._leftThigh, -0.2 - 0.1 * swingPhase, 0, 0.15, 0.2);
      this._lerpBone(this._leftShin, 0.35 + 0.1 * p, 0, 0, 0.2);
      this._lerpBone(this._rightThigh, -0.18 - 0.08 * p, 0, -0.15, 0.2);
      this._lerpBone(this._rightShin, 0.3, 0, 0, 0.2);
      this._lerpBone(this._rightAnkle, 0.06 * swingPhase, 0, 0, 0.2);
    }
  }

  private _animateOverheadAttack(progress: number, isLauncher: boolean): void {
    const p = progress;

    // Overhead smash: arms raise high during windup, slam down during active
    const raisePhase = Math.min(p * 2.0, 1);
    const strikePhase = Math.max(0, (p - 0.35) / 0.65);
    const slamAngle = raisePhase * 0.6 - strikePhase * 1.8; // rises then slams down

    // Body rises then drops weight into strike
    this._lerpBone(this._hips, -0.08 * raisePhase + 0.15 * strikePhase, 0, 0, 0.3);
    this._lerpBone(this._spineLower, -0.15 * raisePhase + 0.25 * strikePhase, 0, 0, 0.3);
    this._lerpBone(this._spineUpper, -0.2 * raisePhase + 0.2 * strikePhase, 0, 0, 0.3);
    this._lerpBone(this._chest, -0.25 * raisePhase + 0.3 * strikePhase, 0, 0, 0.3);
    this._lerpBone(this._head, 0.1 * raisePhase - 0.15 * strikePhase, 0, 0, 0.25);

    // Both arms raise high then slam down together
    const armAngle = slamAngle;
    this._lerpBone(this._leftClavicle, -0.1 * raisePhase, 0, 0.1 * raisePhase, 0.3);
    this._lerpBone(this._leftUpperArm, armAngle - 0.3, 0.2 * raisePhase, 0.3 * (1 - strikePhase), 0.35);
    this._lerpBone(this._leftForearm, -0.8 * raisePhase - 0.3 * strikePhase, 0, 0, 0.35);
    this._lerpBone(this._leftHand, -0.3, 0, 0, 0.3);
    this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.3);

    this._lerpBone(this._rightClavicle, -0.1 * raisePhase, 0, -0.1 * raisePhase, 0.3);
    this._lerpBone(this._rightUpperArm, armAngle - 0.3, -0.2 * raisePhase, -0.3 * (1 - strikePhase), 0.35);
    this._lerpBone(this._rightForearm, -0.8 * raisePhase - 0.3 * strikePhase, 0, 0, 0.35);
    this._lerpBone(this._rightHand, -0.3, 0, 0, 0.3);
    this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.3);

    // Legs: wide stance, drop weight on impact
    if (isLauncher) {
      this._lerpBone(this._leftThigh, -0.3 - 0.15 * strikePhase, 0, 0.2, 0.25);
      this._lerpBone(this._leftShin, 0.5 + 0.3 * strikePhase, 0, 0, 0.25);
      this._lerpBone(this._rightThigh, -0.35 * strikePhase, 0, -0.2, 0.25);
      this._lerpBone(this._rightShin, 0.6 * strikePhase, 0, 0, 0.25);
    } else {
      this._lerpBone(this._leftThigh, -0.25 - 0.2 * strikePhase, 0, 0.18, 0.22);
      this._lerpBone(this._leftShin, 0.45 + 0.25 * strikePhase, 0, 0, 0.22);
      this._lerpBone(this._rightThigh, -0.2 - 0.15 * strikePhase, 0, -0.18, 0.22);
      this._lerpBone(this._rightShin, 0.4 + 0.2 * strikePhase, 0, 0, 0.22);
    }
  }

  private _animateThrustAttack(progress: number, isLow: boolean, isRight: boolean): void {
    const p = progress;

    // Linear forward lunge — arm extends straight ahead like a rapier thrust
    const lungePhase = p * p; // accelerating lunge

    // Minimal torso rotation, strong forward lean
    this._lerpBone(this._hips, isLow ? 0.1 : 0.06 * lungePhase, 0, 0, 0.3);
    this._lerpBone(this._spineLower, isLow ? 0.2 * p : 0.12 * lungePhase, isRight ? -0.08 * p : 0.08 * p, 0, 0.3);
    this._lerpBone(this._spineUpper, isLow ? 0.15 * p : 0.08 * lungePhase, 0, 0, 0.3);
    this._lerpBone(this._chest, 0.1 * lungePhase, 0, 0, 0.28);
    this._lerpBone(this._head, -0.06 * p, 0, 0, 0.2);

    if (isRight) {
      // Right arm thrusts straight forward — shoulder drives, arm fully extends
      this._lerpBone(this._rightClavicle, -0.08 * p, 0, -0.2 * lungePhase, 0.32);
      this._lerpBone(this._rightUpperArm, -1.1 * lungePhase, -0.15 * lungePhase, -0.1 * lungePhase, 0.35);
      this._lerpBone(this._rightForearm, -0.15 * (1 - lungePhase), 0, 0, 0.35);
      this._lerpBone(this._rightHand, -0.1, 0, -0.1, 0.3);
      this._lerpBone(this._rightFingers, -0.7, 0, 0, 0.3);
      // Rear arm pulled back for counterbalance
      this._lerpBone(this._leftUpperArm, 0.2 * p, 0.15, 0.9, 0.2);
      this._lerpBone(this._leftForearm, -1.6, 0, 0, 0.2);
    } else {
      this._lerpBone(this._leftClavicle, -0.08 * p, 0, 0.2 * lungePhase, 0.32);
      this._lerpBone(this._leftUpperArm, -1.1 * lungePhase, 0.15 * lungePhase, 0.1 * lungePhase, 0.35);
      this._lerpBone(this._leftForearm, -0.15 * (1 - lungePhase), 0, 0, 0.35);
      this._lerpBone(this._leftHand, -0.1, 0, 0.1, 0.3);
      this._lerpBone(this._leftFingers, -0.7, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, 0.2 * p, -0.15, -0.9, 0.2);
      this._lerpBone(this._rightForearm, -1.6, 0, 0, 0.2);
    }

    // Legs: deep lunge forward
    if (isLow) {
      this._lerpBone(this._leftThigh, -0.7, 0, 0.2, 0.25);
      this._lerpBone(this._leftShin, 1.1, 0, 0, 0.25);
      this._lerpBone(this._rightThigh, -0.15 - 0.3 * p, 0, -0.18, 0.25);
      this._lerpBone(this._rightShin, 0.2 + 0.3 * p, 0, 0, 0.25);
    } else {
      this._lerpBone(this._leftThigh, -0.35 * lungePhase, 0, 0.14, 0.22);
      this._lerpBone(this._leftShin, 0.3 + 0.25 * lungePhase, 0, 0, 0.22);
      this._lerpBone(this._rightThigh, -0.12 - 0.2 * lungePhase, 0, -0.14, 0.22);
      this._lerpBone(this._rightShin, 0.25 + 0.15 * lungePhase, 0, 0, 0.22);
      this._lerpBone(this._leftAnkle, -0.08 * lungePhase, 0, 0, 0.22);
    }
  }

  private _animateStompAttack(progress: number): void {
    const p = progress;

    // Stomp: leg lifts high then drives straight down
    const liftPhase = Math.min(p * 2.5, 1);
    const slamPhase = Math.max(0, (p - 0.3) / 0.7);
    const legAngle = -1.2 * liftPhase + 0.8 * slamPhase; // raises then drops past neutral

    // Body shifts weight over stomping leg
    this._lerpBone(this._hips, 0.08 * slamPhase, 0, -0.06 * liftPhase, 0.3);
    this._lerpBone(this._spineLower, 0.1 * slamPhase, 0, -0.04 * p, 0.25);
    this._lerpBone(this._spineUpper, -0.05 * liftPhase + 0.12 * slamPhase, 0, 0, 0.25);
    this._lerpBone(this._chest, 0.08 * slamPhase, 0, 0, 0.25);
    this._lerpBone(this._head, -0.1 * slamPhase, 0, 0, 0.2);

    // Arms raise for balance during lift, brace for impact during slam
    this._lerpBone(this._leftUpperArm, -0.3 * liftPhase, 0.2, 0.7 + 0.3 * liftPhase, 0.25);
    this._lerpBone(this._leftForearm, -1.0 - 0.3 * liftPhase, 0, 0, 0.25);
    this._lerpBone(this._rightUpperArm, -0.3 * liftPhase, -0.2, -0.7 - 0.3 * liftPhase, 0.25);
    this._lerpBone(this._rightForearm, -1.0 - 0.3 * liftPhase, 0, 0, 0.25);
    this._lerpBone(this._leftFingers, -0.6, 0, 0, 0.2);
    this._lerpBone(this._rightFingers, -0.6, 0, 0, 0.2);

    // Stomping leg (right) lifts high then drives down
    this._lerpBone(this._rightThigh, legAngle, 0, -0.12, 0.35);
    this._lerpBone(this._rightShin, Math.max(0, 1.2 * liftPhase - 0.8 * slamPhase), 0, 0, 0.35);
    this._lerpBone(this._rightAnkle, 0.3 * liftPhase - 0.5 * slamPhase, 0, 0, 0.35);
    this._lerpBone(this._rightFoot, -0.2 * slamPhase, 0, 0, 0.35);

    // Plant leg — stable, slight bend to absorb impact
    this._lerpBone(this._leftThigh, -0.2 - 0.15 * slamPhase, 0, 0.15, 0.2);
    this._lerpBone(this._leftShin, 0.4 + 0.2 * slamPhase, 0, 0, 0.2);
    this._lerpBone(this._leftAnkle, -0.05, 0, 0, 0.2);
  }

  private _animateHeadbuttAttack(progress: number): void {
    const p = progress;

    // Headbutt: compact body hunches forward, head thrusts
    const crunchPhase = Math.min(p * 2.0, 1);
    const thrustPhase = Math.max(0, (p - 0.3) / 0.7);

    // Shoulders hunch, body compacts then thrusts forward
    this._lerpBone(this._hips, 0.08 * crunchPhase + 0.06 * thrustPhase, 0, 0, 0.35);
    this._lerpBone(this._spineLower, 0.15 * crunchPhase + 0.1 * thrustPhase, 0, 0, 0.35);
    this._lerpBone(this._spineUpper, 0.2 * crunchPhase - 0.05 * thrustPhase, 0, 0, 0.35);
    this._lerpBone(this._chest, 0.25 * crunchPhase - 0.1 * thrustPhase, 0, 0, 0.35);

    // Neck and head: pull back then snap forward
    this._lerpBone(this._neck, 0.2 * crunchPhase - 0.5 * thrustPhase, 0, 0, 0.4);
    this._lerpBone(this._head, 0.15 * crunchPhase - 0.45 * thrustPhase, 0, 0, 0.4);
    this._lerpBone(this._jaw, 0.1 * thrustPhase, 0, 0, 0.3);

    // Arms brace and pull tight to sides
    this._lerpBone(this._leftClavicle, 0.1 * crunchPhase, 0, 0.15, 0.3);
    this._lerpBone(this._leftUpperArm, -0.3, 0.15, 0.5 + 0.2 * crunchPhase, 0.25);
    this._lerpBone(this._leftForearm, -1.8 * crunchPhase, 0, 0, 0.25);
    this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.25);
    this._lerpBone(this._rightClavicle, 0.1 * crunchPhase, 0, -0.15, 0.3);
    this._lerpBone(this._rightUpperArm, -0.3, -0.15, -0.5 - 0.2 * crunchPhase, 0.25);
    this._lerpBone(this._rightForearm, -1.8 * crunchPhase, 0, 0, 0.25);
    this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.25);

    // Legs: aggressive step forward
    this._lerpBone(this._leftThigh, -0.25 - 0.15 * thrustPhase, 0, 0.12, 0.25);
    this._lerpBone(this._leftShin, 0.4 + 0.2 * thrustPhase, 0, 0, 0.25);
    this._lerpBone(this._rightThigh, -0.15 - 0.05 * p, 0, -0.12, 0.2);
    this._lerpBone(this._rightShin, 0.3, 0, 0, 0.2);
  }

  private _animateShieldAttack(progress: number, isRight: boolean): void {
    const p = progress;

    // Shield bash: lead arm forms shield wall, body drives forward behind it
    const chargePhase = p * p; // accelerating charge

    // Body leans into the charge
    this._lerpBone(this._hips, 0.1 * chargePhase, 0, 0, 0.3);
    this._lerpBone(this._spineLower, 0.15 * chargePhase, isRight ? -0.1 * p : 0.1 * p, 0, 0.3);
    this._lerpBone(this._spineUpper, 0.1 * chargePhase, 0, 0, 0.3);
    this._lerpBone(this._chest, 0.12 * chargePhase, 0, 0, 0.28);
    this._lerpBone(this._head, -0.1 * p, 0, 0, 0.22);

    if (isRight) {
      // Right arm holds shield — forearm vertical, bracing for impact
      this._lerpBone(this._rightClavicle, 0.05, 0, -0.2 * p, 0.3);
      this._lerpBone(this._rightUpperArm, -0.8 * chargePhase, -0.4 * chargePhase, -0.5 * chargePhase, 0.32);
      this._lerpBone(this._rightForearm, -1.6, 0, 0, 0.32); // vertical forearm = shield face
      this._lerpBone(this._rightHand, -0.1, 0, -0.2, 0.3);
      this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.3);
      // Left arm braces behind shield
      this._lerpBone(this._leftUpperArm, -0.6 * chargePhase, 0.3, 0.5, 0.2);
      this._lerpBone(this._leftForearm, -1.4, 0, 0, 0.2);
    } else {
      this._lerpBone(this._leftClavicle, 0.05, 0, 0.2 * p, 0.3);
      this._lerpBone(this._leftUpperArm, -0.8 * chargePhase, 0.4 * chargePhase, 0.5 * chargePhase, 0.32);
      this._lerpBone(this._leftForearm, -1.6, 0, 0, 0.32);
      this._lerpBone(this._leftHand, -0.1, 0, 0.2, 0.3);
      this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, -0.6 * chargePhase, -0.3, -0.5, 0.2);
      this._lerpBone(this._rightForearm, -1.4, 0, 0, 0.2);
    }

    // Legs: driving charge forward, wide base
    this._lerpBone(this._leftThigh, -0.3 * chargePhase, 0, 0.16, 0.25);
    this._lerpBone(this._leftShin, 0.4 + 0.25 * chargePhase, 0, 0, 0.25);
    this._lerpBone(this._rightThigh, -0.15 - 0.1 * chargePhase, 0, -0.16, 0.2);
    this._lerpBone(this._rightShin, 0.3 + 0.1 * chargePhase, 0, 0, 0.2);
  }

  private _animatePalmAttack(progress: number, isRight: boolean): void {
    const p = progress;

    // Palm strike: open hand, arm extends from center with wrist extension
    const gatherPhase = Math.min(p * 1.6, 1);
    const strikPhase = Math.max(0, (p - 0.2) / 0.8);

    // Rooted stance, chi gathered then released
    this._lerpBone(this._hips, 0.04 * gatherPhase, 0, 0, 0.28);
    this._lerpBone(this._spineLower, 0.06 * gatherPhase, isRight ? -0.2 * strikPhase : 0.2 * strikPhase, 0, 0.28);
    this._lerpBone(this._spineUpper, 0.04 * p, isRight ? -0.15 * strikPhase : 0.15 * strikPhase, 0, 0.28);
    this._lerpBone(this._chest, 0.08 * strikPhase, 0, 0, 0.25);
    this._lerpBone(this._head, -0.04, 0, 0, 0.2);

    if (isRight) {
      // Right palm — fingers spread, wrist extended back (open hand)
      this._lerpBone(this._rightClavicle, -0.05 * p, 0, -0.15 * strikPhase, 0.3);
      this._lerpBone(this._rightUpperArm, -0.95 * strikPhase, -0.3 * strikPhase, -0.15 * (1 - strikPhase), 0.32);
      this._lerpBone(this._rightForearm, -0.5 * (1 - strikPhase), 0, -0.1 * p, 0.32);
      this._lerpBone(this._rightHand, 0.35 * strikPhase, 0, 0, 0.32); // wrist extends back = palm face
      this._lerpBone(this._rightFingers, 0.1, 0, 0, 0.3); // open fingers, not clenched
      this._lerpBone(this._rightThumb, 0.2, -0.3, 0, 0.3);
      // Guard arm tucked at waist (martial arts style)
      this._lerpBone(this._leftUpperArm, 0.1 * gatherPhase, 0.1, 0.6, 0.2);
      this._lerpBone(this._leftForearm, -1.8, 0, 0, 0.2);
      this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.2);
    } else {
      this._lerpBone(this._leftClavicle, -0.05 * p, 0, 0.15 * strikPhase, 0.3);
      this._lerpBone(this._leftUpperArm, -0.95 * strikPhase, 0.3 * strikPhase, 0.15 * (1 - strikPhase), 0.32);
      this._lerpBone(this._leftForearm, -0.5 * (1 - strikPhase), 0, 0.1 * p, 0.32);
      this._lerpBone(this._leftHand, 0.35 * strikPhase, 0, 0, 0.32);
      this._lerpBone(this._leftFingers, 0.1, 0, 0, 0.3);
      this._lerpBone(this._leftThumb, 0.2, 0.3, 0, 0.3);
      this._lerpBone(this._rightUpperArm, 0.1 * gatherPhase, -0.1, -0.6, 0.2);
      this._lerpBone(this._rightForearm, -1.8, 0, 0, 0.2);
      this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.2);
    }

    // Legs: rooted horse stance, lower center of gravity
    this._lerpBone(this._leftThigh, -0.3 - 0.1 * gatherPhase, 0, 0.22, 0.22);
    this._lerpBone(this._leftShin, 0.55, 0, 0, 0.22);
    this._lerpBone(this._rightThigh, -0.3 - 0.1 * gatherPhase, 0, -0.22, 0.22);
    this._lerpBone(this._rightShin, 0.55, 0, 0, 0.22);
  }

  private _animateDiveAttack(progress: number, frame: number): void {
    // Dive: body rises then crashes down — two-phase cinematic
    const phase = frame < 10 ? 0 : 1; // rise phase, then dive phase

    if (phase === 0) {
      // Rise — body launches upward, arms spread, legs tuck
      const rp = Math.min(frame / 10, 1);
      const rise = rp * rp * (3 - 2 * rp);

      this._lerpBone(this._hips, -0.15 * rise, 0, 0, 0.35);
      this._lerpBone(this._spineLower, -0.2 * rise, 0, 0, 0.35);
      this._lerpBone(this._spineUpper, -0.15 * rise, 0, 0, 0.35);
      this._lerpBone(this._chest, -0.1 * rise, 0, 0, 0.3);
      this._lerpBone(this._head, -0.1 * rise, 0, 0, 0.25);

      // Arms spread wide during ascent
      this._lerpBone(this._leftUpperArm, -0.4 * rise, 0.3 * rise, 1.0 * rise, 0.3);
      this._lerpBone(this._leftForearm, -0.5, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, -0.4 * rise, -0.3 * rise, -1.0 * rise, 0.3);
      this._lerpBone(this._rightForearm, -0.5, 0, 0, 0.3);

      // Legs tuck under body
      this._lerpBone(this._leftThigh, -0.6 * rise, 0, 0.15, 0.3);
      this._lerpBone(this._leftShin, 1.0 * rise, 0, 0, 0.3);
      this._lerpBone(this._rightThigh, -0.6 * rise, 0, -0.15, 0.3);
      this._lerpBone(this._rightShin, 1.0 * rise, 0, 0, 0.3);
    } else {
      // Dive down — body tilts forward, arms drive downward, legs extend
      const dp = Math.min((frame - 10) / 8, 1);
      const dive = dp * dp; // accelerating dive

      this._lerpBone(this._hips, 0.3 * dive, 0, 0, 0.4);
      this._lerpBone(this._spineLower, 0.4 * dive, 0, 0, 0.4);
      this._lerpBone(this._spineUpper, 0.35 * dive, 0, 0, 0.4);
      this._lerpBone(this._chest, 0.3 * dive, 0, 0, 0.38);
      this._lerpBone(this._head, 0.15 * dive, 0, 0, 0.3);

      // Arms drive downward/forward for impact
      this._lerpBone(this._leftUpperArm, -1.2 * dive, 0.2 * (1 - dive), 0.3 * (1 - dive), 0.4);
      this._lerpBone(this._leftForearm, -0.4 * (1 - dive), 0, 0, 0.4);
      this._lerpBone(this._leftFingers, -0.9, 0, 0, 0.4);
      this._lerpBone(this._rightUpperArm, -1.2 * dive, -0.2 * (1 - dive), -0.3 * (1 - dive), 0.4);
      this._lerpBone(this._rightForearm, -0.4 * (1 - dive), 0, 0, 0.4);
      this._lerpBone(this._rightFingers, -0.9, 0, 0, 0.4);

      // Legs extend behind as body dives
      this._lerpBone(this._leftThigh, -0.3 + 0.6 * dive, 0, 0.12, 0.35);
      this._lerpBone(this._leftShin, 0.6 * (1 - dive), 0, 0, 0.35);
      this._lerpBone(this._rightThigh, -0.3 + 0.6 * dive, 0, -0.12, 0.35);
      this._lerpBone(this._rightShin, 0.6 * (1 - dive), 0, 0, 0.35);
    }
  }

  private _animateBackhandAttack(progress: number, isRight: boolean): void {
    const p = progress;
    const s = isRight ? -1 : 1;

    // Backhand: reverse swing — arm goes from front to back across body
    const windPhase = Math.min(p * 1.6, 1);
    const swingPhase = Math.max(0, (p - 0.2) / 0.8);

    // Torso rotates opposite of normal punch — opening up
    this._lerpBone(this._hips, 0, s * 0.15 * swingPhase, 0, 0.3);
    this._lerpBone(this._spineLower, 0.04, s * (0.2 * windPhase + 0.2 * swingPhase), 0, 0.3);
    this._lerpBone(this._spineUpper, 0, s * (0.15 * windPhase + 0.15 * swingPhase), 0, 0.3);
    this._lerpBone(this._chest, 0.05, s * 0.1 * swingPhase, 0, 0.28);
    this._lerpBone(this._head, 0.03, s * -0.1 * swingPhase, 0, 0.2);

    if (isRight) {
      // Right arm crosses body then swings back outward
      this._lerpBone(this._rightClavicle, 0, 0, 0.1 * windPhase - 0.25 * swingPhase, 0.3);
      this._lerpBone(this._rightUpperArm, -0.6 * windPhase - 0.3 * swingPhase, 0.4 * windPhase - 0.8 * swingPhase, -0.3, 0.32);
      this._lerpBone(this._rightForearm, -0.8 * windPhase + 0.3 * swingPhase, 0, 0, 0.32);
      this._lerpBone(this._rightHand, -0.2, -0.15 * swingPhase, 0, 0.3);
      this._lerpBone(this._rightFingers, -0.7, 0, 0, 0.3);
      // Left arm guards
      this._lerpBone(this._leftUpperArm, -0.45, 0.1, 0.75, 0.18);
      this._lerpBone(this._leftForearm, -1.4, 0, 0, 0.18);
    } else {
      this._lerpBone(this._leftClavicle, 0, 0, -0.1 * windPhase + 0.25 * swingPhase, 0.3);
      this._lerpBone(this._leftUpperArm, -0.6 * windPhase - 0.3 * swingPhase, -0.4 * windPhase + 0.8 * swingPhase, 0.3, 0.32);
      this._lerpBone(this._leftForearm, -0.8 * windPhase + 0.3 * swingPhase, 0, 0, 0.32);
      this._lerpBone(this._leftHand, -0.2, 0.15 * swingPhase, 0, 0.3);
      this._lerpBone(this._leftFingers, -0.7, 0, 0, 0.3);
      this._lerpBone(this._rightUpperArm, -0.45, -0.1, -0.75, 0.18);
      this._lerpBone(this._rightForearm, -1.4, 0, 0, 0.18);
    }

    // Legs: pivot stance
    this._lerpBone(this._leftThigh, -0.2 - 0.06 * swingPhase, 0, 0.14, 0.2);
    this._lerpBone(this._leftShin, 0.35, 0, 0, 0.2);
    this._lerpBone(this._rightThigh, -0.18, 0, -0.14, 0.2);
    this._lerpBone(this._rightShin, 0.32 + 0.05 * swingPhase, 0, 0, 0.2);
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
    const poseType = this._charDef.victoryPoseType || "fist_pump";
    switch (poseType) {
      case "weapon_flourish":
        this._animateVictoryWeaponFlourish();
        break;
      case "flex":
        this._animateVictoryFlex();
        break;
      case "bow":
        this._animateVictoryBow();
        break;
      case "kneel":
        this._animateVictoryKneel();
        break;
      case "taunt":
        this._animateVictoryTaunt();
        break;
      case "fist_pump":
      default:
        this._animateVictoryFistPump();
        break;
    }
  }

  private _animateVictoryWeaponFlourish(): void {
    const t = this._idleTime;
    const sweep = Math.sin(t * 3) * 0.5;
    this._lerpBone(this._spineLower, -0.05, 0, 0, 0.08);
    this._lerpBone(this._spineUpper, -0.1, 0, 0, 0.08);
    this._lerpBone(this._chest, -0.15, 0, 0, 0.08);
    this._lerpBone(this._head, -0.05, 0, Math.sin(t * 2) * 0.03, 0.08);
    // Right arm sweeps in an arc
    this._lerpBone(this._rightUpperArm, -2.2 + sweep, 0, -0.5, 0.08);
    this._lerpBone(this._rightForearm, -0.6 + sweep * 0.3, 0, 0, 0.08);
    this._lerpBone(this._rightFingers, -0.5, 0, 0, 0.08);
    // Left arm at hip
    this._lerpBone(this._leftUpperArm, 0.2, 0, 0.8, 0.08);
    this._lerpBone(this._leftForearm, -1.6, 0, 0, 0.08);
    // Legs planted
    this._lerpBone(this._leftThigh, -0.05, 0, 0.15, 0.08);
    this._lerpBone(this._leftShin, 0.1, 0, 0, 0.08);
    this._lerpBone(this._rightThigh, -0.05, 0, -0.15, 0.08);
    this._lerpBone(this._rightShin, 0.1, 0, 0, 0.08);
  }

  private _animateVictoryFlex(): void {
    const t = this._idleTime;
    const bounce = Math.abs(Math.sin(t * 4)) * 0.04;
    this._lerpBone(this._spineLower, -0.1, 0, 0, 0.08);
    this._lerpBone(this._spineUpper, -0.15, 0, 0, 0.08);
    this._lerpBone(this._chest, -0.2, 0, 0, 0.08);
    this._lerpBone(this._head, -0.1, 0, 0, 0.08);
    // Both arms curl up
    this._lerpBone(this._rightUpperArm, -1.8, 0, -0.6, 0.08);
    this._lerpBone(this._rightForearm, -2.0, 0, 0, 0.08);
    this._lerpBone(this._rightFingers, -1.0, 0, 0, 0.08);
    this._lerpBone(this._leftUpperArm, -1.8, 0, 0.6, 0.08);
    this._lerpBone(this._leftForearm, -2.0, 0, 0, 0.08);
    this._lerpBone(this._leftFingers, -1.0, 0, 0, 0.08);
    // Slight bounce
    this._lerpBone(this._leftThigh, -0.05 - bounce, 0, 0.15, 0.08);
    this._lerpBone(this._leftShin, 0.1 + bounce * 2, 0, 0, 0.08);
    this._lerpBone(this._rightThigh, -0.05 - bounce, 0, -0.15, 0.08);
    this._lerpBone(this._rightShin, 0.1 + bounce * 2, 0, 0, 0.08);
  }

  private _animateVictoryBow(): void {
    this._lerpBone(this._spineLower, 0.4, 0, 0, 0.06);
    this._lerpBone(this._spineUpper, 0.3, 0, 0, 0.06);
    this._lerpBone(this._chest, 0.2, 0, 0, 0.06);
    this._lerpBone(this._head, 0.15, 0, 0, 0.06);
    // Arms at sides
    this._lerpBone(this._rightUpperArm, 0.2, 0, -0.1, 0.06);
    this._lerpBone(this._rightForearm, -0.1, 0, 0, 0.06);
    this._lerpBone(this._leftUpperArm, 0.2, 0, 0.1, 0.06);
    this._lerpBone(this._leftForearm, -0.1, 0, 0, 0.06);
    // Legs straight
    this._lerpBone(this._leftThigh, -0.05, 0, 0.1, 0.06);
    this._lerpBone(this._leftShin, 0.05, 0, 0, 0.06);
    this._lerpBone(this._rightThigh, -0.05, 0, -0.1, 0.06);
    this._lerpBone(this._rightShin, 0.05, 0, 0, 0.06);
  }

  private _animateVictoryKneel(): void {
    this._lerpBone(this._spineLower, 0.1, 0, 0, 0.06);
    this._lerpBone(this._spineUpper, 0.15, 0, 0, 0.06);
    this._lerpBone(this._chest, 0.1, 0, 0, 0.06);
    this._lerpBone(this._head, 0.2, 0, 0, 0.06);
    // Arms down
    this._lerpBone(this._rightUpperArm, 0.3, 0, -0.2, 0.06);
    this._lerpBone(this._rightForearm, -0.3, 0, 0, 0.06);
    this._lerpBone(this._leftUpperArm, 0.3, 0, 0.2, 0.06);
    this._lerpBone(this._leftForearm, -0.3, 0, 0, 0.06);
    // One leg bends down (right kneels)
    this._lerpBone(this._leftThigh, -0.3, 0, 0.15, 0.06);
    this._lerpBone(this._leftShin, 0.4, 0, 0, 0.06);
    this._lerpBone(this._rightThigh, -1.2, 0, -0.1, 0.06);
    this._lerpBone(this._rightShin, 1.8, 0, 0, 0.06);
  }

  private _animateVictoryTaunt(): void {
    const t = this._idleTime;
    // Slight turn away
    this._lerpBone(this._spineLower, 0, 0.3, 0, 0.08);
    this._lerpBone(this._spineUpper, 0, 0.2, 0, 0.08);
    this._lerpBone(this._chest, -0.05, 0.15, 0, 0.08);
    this._lerpBone(this._head, 0, -0.3, Math.sin(t * 2) * 0.05, 0.08);
    // Dismissive arm wave
    const wave = Math.sin(t * 5) * 0.3;
    this._lerpBone(this._rightUpperArm, -1.2, 0, -0.4, 0.08);
    this._lerpBone(this._rightForearm, -0.8 + wave, 0, 0, 0.08);
    this._lerpBone(this._rightHand, wave * 0.5, 0, 0, 0.08);
    // Left arm relaxed
    this._lerpBone(this._leftUpperArm, 0.1, 0, 0.5, 0.08);
    this._lerpBone(this._leftForearm, -0.8, 0, 0, 0.08);
    // Casual stance
    this._lerpBone(this._leftThigh, -0.05, 0, 0.15, 0.08);
    this._lerpBone(this._leftShin, 0.1, 0, 0, 0.08);
    this._lerpBone(this._rightThigh, -0.1, 0, -0.2, 0.08);
    this._lerpBone(this._rightShin, 0.15, 0, 0, 0.08);
  }

  private _animateVictoryFistPump(): void {
    const t = this._idleTime;
    const pump = Math.abs(Math.sin(t * 4)) * 0.3;
    this._lerpBone(this._spineLower, -0.05, 0, 0, 0.08);
    this._lerpBone(this._spineUpper, -0.1, 0, 0, 0.08);
    this._lerpBone(this._chest, -0.15, 0, 0, 0.08);
    this._lerpBone(this._head, -0.1, 0, Math.sin(t * 2) * 0.05, 0.08);
    // Both arms pump upward
    this._lerpBone(this._rightUpperArm, -2.8 - pump, 0, -0.3, 0.08);
    this._lerpBone(this._rightForearm, -0.4, 0, 0, 0.08);
    this._lerpBone(this._rightFingers, -0.8, 0, 0, 0.08);
    this._lerpBone(this._leftUpperArm, -2.8 - pump, 0, 0.3, 0.08);
    this._lerpBone(this._leftForearm, -0.4, 0, 0, 0.08);
    this._lerpBone(this._leftFingers, -0.8, 0, 0, 0.08);
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

  getAttackLimbWorldPos(limb: TekkenLimb): THREE.Vector3 {
    const pos = new THREE.Vector3();
    let bone: THREE.Object3D | null = null;
    switch (limb) {
      case TekkenLimb.LEFT_PUNCH: bone = this._leftHand; break;
      case TekkenLimb.RIGHT_PUNCH: bone = this._rightHand; break;
      case TekkenLimb.LEFT_KICK: bone = this._leftFoot; break;
      case TekkenLimb.RIGHT_KICK: bone = this._rightFoot; break;
    }
    if (bone) bone.getWorldPosition(pos);
    return pos;
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
