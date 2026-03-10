// ---------------------------------------------------------------------------
// Warband mode – procedural horse renderer
// Builds a realistic horse from Three.js primitives with 3 armor tiers
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { HorseState } from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";

// ---- Horse coat palettes ---------------------------------------------------

const HORSE_COATS = [
  { body: 0x8b4513, mane: 0x3b2005 }, // brown
  { body: 0x5c3317, mane: 0x1a0d05 }, // dark brown
  { body: 0xa0522d, mane: 0x4a2010 }, // bay
  { body: 0x2f2f2f, mane: 0x111111 }, // black
  { body: 0xc4a882, mane: 0x8b7355 }, // palomino
];

// ---- Horse dimensions (body-length ~2m) -----------------------------------

const BODY_LEN = 1.2;
const BODY_RADIUS = 0.32;
const NECK_LEN = 0.55;
const NECK_RADIUS = 0.14;
const HEAD_LEN = 0.38;
const HEAD_W = 0.11;
const HEAD_H = 0.13;
const UPPER_LEG_LEN = 0.42;
const LOWER_LEG_LEN = 0.38;
const LEG_RADIUS = 0.045;
const HOOF_RADIUS = 0.05;
const TAIL_LEN = 0.45;

// How high the saddle sits (rider Y offset)
export const HORSE_SADDLE_Y = BODY_RADIUS + UPPER_LEG_LEN + LOWER_LEG_LEN + HOOF_RADIUS * 2;

// ---- Helper ----------------------------------------------------------------

function makeMat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...opts });
}

function cyl(rTop: number, rBot: number, h: number, seg = 8): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg);
}

// ---- HorseMesh class -------------------------------------------------------

export class HorseMesh {
  group: THREE.Group;
  horseId: string;

  // Bone groups for animation
  private _body: THREE.Group;
  private _neckGroup: THREE.Group;
  private _headGroup: THREE.Group;

  private _frontLeftUpper: THREE.Group;
  private _frontLeftLower: THREE.Group;
  private _frontRightUpper: THREE.Group;
  private _frontRightLower: THREE.Group;
  private _rearLeftUpper: THREE.Group;
  private _rearLeftLower: THREE.Group;
  private _rearRightUpper: THREE.Group;
  private _rearRightLower: THREE.Group;

  private _tailGroup: THREE.Group;

  // HP bar
  private _hpBarBg: THREE.Mesh;
  private _hpBarFill: THREE.Mesh;

  // Armor meshes (for disposal)
  private _armorMeshes: THREE.Mesh[] = [];

  constructor(horse: HorseState) {
    this.horseId = horse.id;
    this.group = new THREE.Group();

    // Pick coat color deterministically from horse id
    let hash = 0;
    for (let i = 0; i < horse.id.length; i++) hash = (hash * 31 + horse.id.charCodeAt(i)) | 0;
    const coat = HORSE_COATS[Math.abs(hash) % HORSE_COATS.length];
    const bodyMat = makeMat(coat.body);
    const maneMat = makeMat(coat.mane);
    const hoofMat = makeMat(0x333333, { roughness: 0.9 });

    // ---- Body (barrel + anatomical masses) ----
    this._body = new THREE.Group();
    this.group.add(this._body);

    const bodyY = UPPER_LEG_LEN + LOWER_LEG_LEN + HOOF_RADIUS * 2;

    // Main barrel (ribcage) – slightly flattened vertically
    const barrelGeo = new THREE.SphereGeometry(1, 14, 10);
    const barrelMesh = new THREE.Mesh(barrelGeo, bodyMat);
    barrelMesh.scale.set(BODY_RADIUS, BODY_RADIUS * 0.88, BODY_LEN / 2);
    barrelMesh.position.y = bodyY;
    this._body.add(barrelMesh);

    // Chest / breast – broad mass at front of barrel
    const chestGeo = new THREE.SphereGeometry(1, 10, 8);
    const chestMesh = new THREE.Mesh(chestGeo, bodyMat);
    chestMesh.scale.set(BODY_RADIUS * 1.05, BODY_RADIUS * 0.85, BODY_RADIUS * 0.55);
    chestMesh.position.set(0, bodyY - BODY_RADIUS * 0.05, BODY_LEN / 2 - 0.06);
    this._body.add(chestMesh);

    // Hindquarters / croup – large rounded mass at rear
    const haunchGeo = new THREE.SphereGeometry(1, 10, 8);
    const haunchMesh = new THREE.Mesh(haunchGeo, bodyMat);
    haunchMesh.scale.set(BODY_RADIUS * 1.02, BODY_RADIUS * 0.92, BODY_RADIUS * 0.65);
    haunchMesh.position.set(0, bodyY + BODY_RADIUS * 0.05, -BODY_LEN / 2 + 0.12);
    this._body.add(haunchMesh);

    // Withers – bump above the shoulder area
    const withersGeo = new THREE.SphereGeometry(1, 8, 6);
    const withersMesh = new THREE.Mesh(withersGeo, bodyMat);
    withersMesh.scale.set(BODY_RADIUS * 0.5, BODY_RADIUS * 0.35, BODY_RADIUS * 0.65);
    withersMesh.position.set(0, bodyY + BODY_RADIUS * 0.75, BODY_LEN / 2 - 0.18);
    this._body.add(withersMesh);

    // Shoulder muscles – fill the gap between front legs and body
    for (const side of [-1, 1]) {
      const shoulderGeo = new THREE.SphereGeometry(1, 8, 6);
      const shoulderMesh = new THREE.Mesh(shoulderGeo, bodyMat);
      shoulderMesh.scale.set(BODY_RADIUS * 0.42, BODY_RADIUS * 0.7, BODY_RADIUS * 0.55);
      shoulderMesh.position.set(
        BODY_RADIUS * 0.38 * side,
        bodyY - BODY_RADIUS * 0.45,
        BODY_LEN / 2 - 0.14
      );
      this._body.add(shoulderMesh);
    }

    // Hip / stifle muscles – fill the gap between rear legs and body
    for (const side of [-1, 1]) {
      const hipGeo = new THREE.SphereGeometry(1, 8, 6);
      const hipMesh = new THREE.Mesh(hipGeo, bodyMat);
      hipMesh.scale.set(BODY_RADIUS * 0.4, BODY_RADIUS * 0.65, BODY_RADIUS * 0.5);
      hipMesh.position.set(
        BODY_RADIUS * 0.38 * side,
        bodyY - BODY_RADIUS * 0.4,
        -BODY_LEN / 2 + 0.14
      );
      this._body.add(hipMesh);
    }

    // Belly – softer underside curve
    const bellyGeo = new THREE.SphereGeometry(1, 10, 6);
    const bellyMesh = new THREE.Mesh(bellyGeo, bodyMat);
    bellyMesh.scale.set(BODY_RADIUS * 0.82, BODY_RADIUS * 0.45, BODY_LEN * 0.38);
    bellyMesh.position.y = bodyY - BODY_RADIUS * 0.4;
    this._body.add(bellyMesh);

    // ---- Neck ----
    this._neckGroup = new THREE.Group();
    this._neckGroup.position.set(0, bodyY + BODY_RADIUS * 0.3, BODY_LEN / 2 - 0.05);
    this._body.add(this._neckGroup);

    // Main neck cylinder – tapers toward the poll
    const neckGeo = cyl(NECK_RADIUS * 0.8, NECK_RADIUS * 1.1, NECK_LEN, 10);
    const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
    neckMesh.position.y = NECK_LEN / 2;
    this._neckGroup.add(neckMesh);
    this._neckGroup.rotation.x = -0.45; // angled forward

    // Neck base – smooth transition bulge where neck meets chest
    const neckBaseGeo = new THREE.SphereGeometry(1, 8, 6);
    const neckBaseMesh = new THREE.Mesh(neckBaseGeo, bodyMat);
    neckBaseMesh.scale.set(NECK_RADIUS * 1.3, NECK_RADIUS * 1.1, NECK_RADIUS * 1.3);
    neckBaseMesh.position.set(0, 0.02, 0);
    this._neckGroup.add(neckBaseMesh);

    // Throat latch – underside of upper neck near the head
    const throatGeo = new THREE.SphereGeometry(1, 6, 5);
    const throatMesh = new THREE.Mesh(throatGeo, bodyMat);
    throatMesh.scale.set(NECK_RADIUS * 0.65, NECK_RADIUS * 0.5, NECK_RADIUS * 0.7);
    throatMesh.position.set(0, NECK_LEN * 0.78, NECK_RADIUS * 0.35);
    this._neckGroup.add(throatMesh);

    // Crest – top-line ridge of the neck
    const crestGeo = new THREE.SphereGeometry(1, 6, 5);
    const crestMesh = new THREE.Mesh(crestGeo, bodyMat);
    crestMesh.scale.set(NECK_RADIUS * 0.35, NECK_LEN * 0.45, NECK_RADIUS * 0.3);
    crestMesh.position.set(0, NECK_LEN * 0.5, -NECK_RADIUS * 0.35);
    this._neckGroup.add(crestMesh);

    // Mane along top of neck – more pieces, flowing
    for (let i = 0; i < 7; i++) {
      const h = 0.06 + i * 0.008;
      const maneGeo = new THREE.BoxGeometry(0.015, h, 0.04);
      const manePiece = new THREE.Mesh(maneGeo, maneMat);
      manePiece.position.set(0, NECK_LEN * 0.12 + i * (NECK_LEN * 0.12), -NECK_RADIUS * 0.15);
      manePiece.rotation.x = -0.25 + i * 0.03;
      this._neckGroup.add(manePiece);
    }

    // ---- Head ----
    this._headGroup = new THREE.Group();
    this._headGroup.position.set(0, NECK_LEN, 0);
    this._neckGroup.add(this._headGroup);

    // Cranium – wider, rounder top of the head
    const craniumGeo = new THREE.SphereGeometry(1, 10, 8);
    const craniumMesh = new THREE.Mesh(craniumGeo, bodyMat);
    craniumMesh.scale.set(HEAD_W * 1.15, HEAD_H * 1.05, HEAD_LEN * 0.42);
    craniumMesh.position.set(0, HEAD_H * 0.15, HEAD_LEN * 0.18);
    this._headGroup.add(craniumMesh);

    // Nasal bone / upper face – tapers from cranium toward muzzle
    const nasalGeo = new THREE.SphereGeometry(1, 8, 6);
    const nasalMesh = new THREE.Mesh(nasalGeo, bodyMat);
    nasalMesh.scale.set(HEAD_W * 0.9, HEAD_H * 0.85, HEAD_LEN * 0.38);
    nasalMesh.position.set(0, HEAD_H * 0.05, HEAD_LEN * 0.52);
    this._headGroup.add(nasalMesh);

    // Muzzle – soft rounded end
    const muzzleGeo = new THREE.SphereGeometry(1, 8, 6);
    const muzzleMesh = new THREE.Mesh(muzzleGeo, bodyMat);
    muzzleMesh.scale.set(HEAD_W * 0.78, HEAD_H * 0.65, HEAD_LEN * 0.22);
    muzzleMesh.position.set(0, -HEAD_H * 0.15, HEAD_LEN * 0.85);
    this._headGroup.add(muzzleMesh);

    // Lower jaw – subtle jaw mass
    const jawGeo = new THREE.SphereGeometry(1, 6, 5);
    const jawMesh = new THREE.Mesh(jawGeo, bodyMat);
    jawMesh.scale.set(HEAD_W * 0.72, HEAD_H * 0.45, HEAD_LEN * 0.5);
    jawMesh.position.set(0, -HEAD_H * 0.55, HEAD_LEN * 0.35);
    this._headGroup.add(jawMesh);

    // Cheek bulges
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.SphereGeometry(1, 6, 5);
      const cheekMesh = new THREE.Mesh(cheekGeo, bodyMat);
      cheekMesh.scale.set(HEAD_W * 0.35, HEAD_H * 0.5, HEAD_LEN * 0.28);
      cheekMesh.position.set(HEAD_W * 0.85 * side, -HEAD_H * 0.1, HEAD_LEN * 0.28);
      this._headGroup.add(cheekMesh);
    }

    // Nostrils – larger, rounder
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.022, 5, 5);
      const nostrilMesh = new THREE.Mesh(nostrilGeo, makeMat(0x1a1a1a));
      nostrilMesh.position.set(HEAD_W * 0.45 * side, -HEAD_H * 0.2, HEAD_LEN * 0.97);
      this._headGroup.add(nostrilMesh);
    }

    // Eyes – slightly larger, with a brow ridge
    for (const side of [-1, 1]) {
      // Brow ridge
      const browGeo = new THREE.SphereGeometry(1, 5, 4);
      const browMesh = new THREE.Mesh(browGeo, bodyMat);
      browMesh.scale.set(0.03, 0.02, 0.04);
      browMesh.position.set(HEAD_W * 0.95 * side, HEAD_H * 0.5, HEAD_LEN * 0.3);
      this._headGroup.add(browMesh);

      const eyeGeo = new THREE.SphereGeometry(0.027, 7, 7);
      const eyeMesh = new THREE.Mesh(eyeGeo, makeMat(0x1a1a1a));
      eyeMesh.position.set(HEAD_W * 0.95 * side, HEAD_H * 0.32, HEAD_LEN * 0.32);
      this._headGroup.add(eyeMesh);
    }

    // Ears – taller, more pointed
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.022, 0.1, 5);
      const earMesh = new THREE.Mesh(earGeo, bodyMat);
      earMesh.position.set(HEAD_W * 0.5 * side, HEAD_H * 1.05 + 0.04, HEAD_LEN * 0.1);
      earMesh.rotation.z = side * 0.15;
      earMesh.rotation.x = -0.1;
      this._headGroup.add(earMesh);
    }

    // Forelock – small tuft of mane between ears
    const forelockGeo = new THREE.BoxGeometry(0.03, 0.06, 0.04);
    const forelockMesh = new THREE.Mesh(forelockGeo, maneMat);
    forelockMesh.position.set(0, HEAD_H * 0.85, HEAD_LEN * 0.05);
    this._headGroup.add(forelockMesh);

    this._headGroup.rotation.x = 0.45; // tilt head level

    // ---- Legs (4 legs, each with upper thigh, lower cannon, hoof) ----
    const isFront = (i: number) => i < 2;
    const legPositions = [
      { x: BODY_RADIUS * 0.5,  z: BODY_LEN / 2 - 0.12 },   // frontLeft
      { x: -BODY_RADIUS * 0.5, z: BODY_LEN / 2 - 0.12 },   // frontRight
      { x: BODY_RADIUS * 0.5,  z: -BODY_LEN / 2 + 0.12 },  // rearLeft
      { x: -BODY_RADIUS * 0.5, z: -BODY_LEN / 2 + 0.12 },  // rearRight
    ];

    const legGroups: { upper: THREE.Group; lower: THREE.Group }[] = [];

    for (let li = 0; li < legPositions.length; li++) {
      const lp = legPositions[li];
      const front = isFront(li);

      // Upper leg group – attach higher up so it overlaps with body
      const upper = new THREE.Group();
      upper.position.set(lp.x, bodyY - BODY_RADIUS * 0.5, lp.z);
      this._body.add(upper);

      // Thigh / forearm – tapers from thick top to narrower knee
      const thighTopR = front ? LEG_RADIUS * 1.8 : LEG_RADIUS * 2.0;
      const thighBotR = LEG_RADIUS * 1.1;
      const upperMesh = new THREE.Mesh(cyl(thighTopR, thighBotR, UPPER_LEG_LEN, 8), bodyMat);
      upperMesh.position.y = -UPPER_LEG_LEN / 2;
      upper.add(upperMesh);

      // Inner thigh muscle – fills remaining gap toward barrel
      const muscleBulge = new THREE.Mesh(
        new THREE.SphereGeometry(1, 6, 5),
        bodyMat
      );
      const mw = front ? LEG_RADIUS * 1.5 : LEG_RADIUS * 1.7;
      muscleBulge.scale.set(mw, UPPER_LEG_LEN * 0.35, mw);
      muscleBulge.position.y = -UPPER_LEG_LEN * 0.15;
      upper.add(muscleBulge);

      // Knee / hock joint
      const kneeGeo = new THREE.SphereGeometry(LEG_RADIUS * 1.3, 7, 7);
      const kneeMesh = new THREE.Mesh(kneeGeo, bodyMat);
      kneeMesh.position.y = -UPPER_LEG_LEN;
      upper.add(kneeMesh);

      // Lower leg (cannon bone) – slender
      const lower = new THREE.Group();
      lower.position.y = -UPPER_LEG_LEN;
      upper.add(lower);

      const lowerMesh = new THREE.Mesh(cyl(LEG_RADIUS * 0.85, LEG_RADIUS * 0.65, LOWER_LEG_LEN, 7), bodyMat);
      lowerMesh.position.y = -LOWER_LEG_LEN / 2;
      lower.add(lowerMesh);

      // Fetlock joint – slight bulge above hoof
      const fetlockGeo = new THREE.SphereGeometry(LEG_RADIUS * 0.9, 5, 5);
      const fetlockMesh = new THREE.Mesh(fetlockGeo, bodyMat);
      fetlockMesh.position.y = -LOWER_LEG_LEN + HOOF_RADIUS * 0.5;
      lower.add(fetlockMesh);

      // Hoof – slightly angled, wider at base
      const hoofGeo = cyl(HOOF_RADIUS, HOOF_RADIUS * 1.15, HOOF_RADIUS * 2, 7);
      const hoofMesh = new THREE.Mesh(hoofGeo, hoofMat);
      hoofMesh.position.y = -LOWER_LEG_LEN;
      lower.add(hoofMesh);

      legGroups.push({ upper, lower });
    }

    this._frontLeftUpper = legGroups[0].upper;
    this._frontLeftLower = legGroups[0].lower;
    this._frontRightUpper = legGroups[1].upper;
    this._frontRightLower = legGroups[1].lower;
    this._rearLeftUpper = legGroups[2].upper;
    this._rearLeftLower = legGroups[2].lower;
    this._rearRightUpper = legGroups[3].upper;
    this._rearRightLower = legGroups[3].lower;

    // ---- Tail ----
    this._tailGroup = new THREE.Group();
    this._tailGroup.position.set(0, bodyY + BODY_RADIUS * 0.4, -BODY_LEN / 2 + 0.05);
    this._body.add(this._tailGroup);

    // Dock (fleshy base)
    const dockGeo = cyl(0.04, 0.025, TAIL_LEN * 0.35, 6);
    const dockMesh = new THREE.Mesh(dockGeo, bodyMat);
    dockMesh.position.y = -TAIL_LEN * 0.17;
    this._tailGroup.add(dockMesh);

    // Main tail hair – thick, flowing
    const tailGeo = cyl(0.035, 0.012, TAIL_LEN, 6);
    const tailMesh = new THREE.Mesh(tailGeo, maneMat);
    tailMesh.position.y = -TAIL_LEN / 2;
    this._tailGroup.add(tailMesh);
    this._tailGroup.rotation.x = 0.5; // hang down-back

    // Tail hair strands – more and spread out
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI / 2;
      const strandGeo = new THREE.BoxGeometry(0.012, TAIL_LEN * 0.35, 0.012);
      const strand = new THREE.Mesh(strandGeo, maneMat);
      strand.position.set(
        Math.cos(angle) * 0.018,
        -TAIL_LEN * 0.82 - i * 0.01,
        Math.sin(angle) * 0.01
      );
      this._tailGroup.add(strand);
    }

    // ---- Saddle ----
    const saddleGeo = new THREE.BoxGeometry(BODY_RADIUS * 1.5, 0.06, 0.3);
    const saddleMesh = new THREE.Mesh(saddleGeo, makeMat(0x5c3317, { roughness: 0.85 }));
    saddleMesh.position.set(0, bodyY + BODY_RADIUS * 0.85, 0.05);
    this._body.add(saddleMesh);

    // Saddle blanket
    const blanketGeo = new THREE.BoxGeometry(BODY_RADIUS * 1.7, 0.03, 0.4);
    const blanketMesh = new THREE.Mesh(blanketGeo, makeMat(0x882222));
    blanketMesh.position.set(0, bodyY + BODY_RADIUS * 0.8, 0.05);
    this._body.add(blanketMesh);

    // Stirrups
    for (const side of [-1, 1]) {
      const stirrupGeo = new THREE.TorusGeometry(0.03, 0.008, 4, 6);
      const stirrup = new THREE.Mesh(stirrupGeo, makeMat(0x888888, { metalness: 0.7 }));
      stirrup.position.set(BODY_RADIUS * 0.8 * side, bodyY - BODY_RADIUS * 0.2, 0.05);
      this._body.add(stirrup);

      // Stirrup leather
      const strapGeo = new THREE.BoxGeometry(0.01, BODY_RADIUS * 0.8, 0.015);
      const strap = new THREE.Mesh(strapGeo, makeMat(0x5c3317));
      strap.position.set(BODY_RADIUS * 0.8 * side, bodyY + BODY_RADIUS * 0.3, 0.05);
      this._body.add(strap);
    }

    // Reins (simple lines from head to saddle area)
    const reinMat = new THREE.LineBasicMaterial({ color: 0x3b2005 });
    for (const side of [-1, 1]) {
      const reinPts = [
        new THREE.Vector3(HEAD_W * side * 0.8, bodyY + BODY_RADIUS + NECK_LEN * 0.7, BODY_LEN / 2 + NECK_LEN * 0.5),
        new THREE.Vector3(BODY_RADIUS * 0.3 * side, bodyY + BODY_RADIUS * 0.9, 0.2),
      ];
      const reinGeo = new THREE.BufferGeometry().setFromPoints(reinPts);
      const rein = new THREE.Line(reinGeo, reinMat);
      this._body.add(rein);
    }

    // ---- Armor ----
    this._addArmor(horse.armorTier, bodyY);

    // ---- HP bar ----
    const hpY = bodyY + BODY_RADIUS + 0.7;
    const bgGeo = new THREE.PlaneGeometry(0.6, 0.06);
    this._hpBarBg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 }));
    this._hpBarBg.position.set(0, hpY, 0);
    this.group.add(this._hpBarBg);

    const fillGeo = new THREE.PlaneGeometry(0.58, 0.04);
    this._hpBarFill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xcc8800 }));
    this._hpBarFill.position.set(0, hpY, 0.001);
    this.group.add(this._hpBarFill);
  }

  private _addArmor(tier: string, bodyY: number): void {
    const armorMat = (color: number, metalness = 0.4) =>
      makeMat(color, { roughness: 0.5, metalness });

    if (tier === "light") {
      // Leather peytral – sits on the chest, wrapping around the breast
      const peytralGeo = new THREE.SphereGeometry(1, 8, 6);
      const peytral = new THREE.Mesh(peytralGeo, armorMat(0x8b6914, 0.1));
      peytral.scale.set(BODY_RADIUS * 1.15, BODY_RADIUS * 0.7, 0.12);
      peytral.position.set(0, bodyY, BODY_LEN / 2 + 0.02);
      this._body.add(peytral);
      this._armorMeshes.push(peytral);

      // Light blanket over barrel (caparison)
      const blanketGeo = new THREE.SphereGeometry(1, 10, 8);
      const blanket = new THREE.Mesh(blanketGeo, armorMat(0x8b6914, 0.08));
      blanket.scale.set(BODY_RADIUS * 1.08, BODY_RADIUS * 0.95, BODY_LEN * 0.42);
      blanket.position.set(0, bodyY + BODY_RADIUS * 0.05, 0);
      this._body.add(blanket);
      this._armorMeshes.push(blanket);
    }

    if (tier === "medium" || tier === "heavy") {
      // Chain peytral – over the chest/breast area
      const peytralGeo = new THREE.SphereGeometry(1, 10, 8);
      const peytral = new THREE.Mesh(peytralGeo, armorMat(0xaaaaaa, 0.5));
      peytral.scale.set(BODY_RADIUS * 1.2, BODY_RADIUS * 0.85, 0.14);
      peytral.position.set(0, bodyY, BODY_LEN / 2 + 0.03);
      this._body.add(peytral);
      this._armorMeshes.push(peytral);

      // Flanchards – side plates that drape over the barrel flanks
      for (const side of [-1, 1]) {
        const flGeo = new THREE.SphereGeometry(1, 8, 6);
        const fl = new THREE.Mesh(flGeo, armorMat(0xaaaaaa, 0.5));
        fl.scale.set(0.05, BODY_RADIUS * 1.0, BODY_LEN * 0.38);
        fl.position.set(BODY_RADIUS * 0.92 * side, bodyY - BODY_RADIUS * 0.1, 0);
        this._body.add(fl);
        this._armorMeshes.push(fl);
      }

      // Crupper (rump guard) – for medium too
      const crupGeo = new THREE.SphereGeometry(1, 8, 6);
      const crup = new THREE.Mesh(crupGeo, armorMat(0xaaaaaa, 0.45));
      crup.scale.set(BODY_RADIUS * 1.08, BODY_RADIUS * 0.75, BODY_LEN * 0.22);
      crup.position.set(0, bodyY + BODY_RADIUS * 0.05, -BODY_LEN / 2 + 0.1);
      this._body.add(crup);
      this._armorMeshes.push(crup);
    }

    if (tier === "heavy") {
      // Full plate barding

      // Crinet (neck armor) – segmented plates along the neck
      const crinetGeo = cyl(NECK_RADIUS * 1.25, NECK_RADIUS * 1.45, NECK_LEN * 0.65, 10);
      const crinet = new THREE.Mesh(crinetGeo, armorMat(0xbbbbbb, 0.6));
      crinet.position.y = NECK_LEN * 0.35;
      this._neckGroup.add(crinet);
      this._armorMeshes.push(crinet);

      // Crinet ridge (top reinforcement)
      const crinetRidgeGeo = new THREE.BoxGeometry(0.025, NECK_LEN * 0.55, 0.03);
      const crinetRidge = new THREE.Mesh(crinetRidgeGeo, armorMat(0xcccccc, 0.65));
      crinetRidge.position.set(0, NECK_LEN * 0.35, -NECK_RADIUS * 1.2);
      this._neckGroup.add(crinetRidge);
      this._armorMeshes.push(crinetRidge);

      // Chanfron (face plate) – follows the head profile
      const chanfronGeo = new THREE.SphereGeometry(1, 8, 6);
      const chanfron = new THREE.Mesh(chanfronGeo, armorMat(0xbbbbbb, 0.6));
      chanfron.scale.set(HEAD_W * 1.25, HEAD_H * 1.15, HEAD_LEN * 0.55);
      chanfron.position.set(0, HEAD_H * 0.25, HEAD_LEN * 0.38);
      this._headGroup.add(chanfron);
      this._armorMeshes.push(chanfron);

      // Nasal strip – raised ridge down the face
      const nasalStripGeo = new THREE.BoxGeometry(0.02, 0.025, HEAD_LEN * 0.5);
      const nasalStrip = new THREE.Mesh(nasalStripGeo, armorMat(0xdddddd, 0.7));
      nasalStrip.position.set(0, HEAD_H * 0.55, HEAD_LEN * 0.42);
      this._headGroup.add(nasalStrip);
      this._armorMeshes.push(nasalStrip);

      // Eye guards – circular bosses around each eye
      for (const side of [-1, 1]) {
        const guardGeo = new THREE.TorusGeometry(0.03, 0.01, 4, 6);
        const guard = new THREE.Mesh(guardGeo, armorMat(0xdddddd, 0.7));
        guard.position.set(HEAD_W * 0.95 * side, HEAD_H * 0.35, HEAD_LEN * 0.33);
        guard.rotation.y = Math.PI / 2;
        this._headGroup.add(guard);
        this._armorMeshes.push(guard);
      }

      // Shoulder guards – plate caps over the shoulder area
      for (const side of [-1, 1]) {
        const sGeo = new THREE.SphereGeometry(1, 7, 5);
        const sPlate = new THREE.Mesh(sGeo, armorMat(0xbbbbbb, 0.6));
        sPlate.scale.set(BODY_RADIUS * 0.3, BODY_RADIUS * 0.55, BODY_RADIUS * 0.45);
        sPlate.position.set(
          BODY_RADIUS * 0.55 * side,
          bodyY - BODY_RADIUS * 0.3,
          BODY_LEN / 2 - 0.14
        );
        this._body.add(sPlate);
        this._armorMeshes.push(sPlate);
      }

      // Leg guards – on the upper thighs/forearms
      const legUppers = [this._frontLeftUpper, this._frontRightUpper, this._rearLeftUpper, this._rearRightUpper];
      for (const leg of legUppers) {
        const plateGeo = cyl(LEG_RADIUS * 2.5, LEG_RADIUS * 1.8, UPPER_LEG_LEN * 0.5, 8);
        const plate = new THREE.Mesh(plateGeo, armorMat(0xbbbbbb, 0.6));
        plate.position.y = -UPPER_LEG_LEN * 0.25;
        leg.add(plate);
        this._armorMeshes.push(plate);
      }
    }
  }

  update(horse: HorseState, riderSpeed: number, dt: number, camera: THREE.Camera): void {
    // Position and rotation
    this.group.position.set(horse.position.x, horse.position.y, horse.position.z);
    this.group.rotation.y = horse.rotation;

    // Walk animation
    const speed = riderSpeed;
    if (speed > 0.5 && horse.alive) {
      horse.walkCycle = (horse.walkCycle + speed * 0.015 * dt * 60) % 1;
      const t = horse.walkCycle * Math.PI * 2;
      const amp = Math.min(speed * 0.06, 0.5);
      const isTrot = speed > WB.HORSE_WALK_SPEED;

      // Diagonal gait: front-left + rear-right, then front-right + rear-left
      this._frontLeftUpper.rotation.x = Math.sin(t) * amp;
      this._frontLeftLower.rotation.x = Math.max(0, -Math.sin(t) * amp * 0.6) - 0.05;
      this._rearRightUpper.rotation.x = Math.sin(t) * amp * 0.8;
      this._rearRightLower.rotation.x = Math.max(0, -Math.sin(t) * amp * 0.5) - 0.05;

      this._frontRightUpper.rotation.x = -Math.sin(t) * amp;
      this._frontRightLower.rotation.x = Math.max(0, Math.sin(t) * amp * 0.6) - 0.05;
      this._rearLeftUpper.rotation.x = -Math.sin(t) * amp * 0.8;
      this._rearLeftLower.rotation.x = Math.max(0, Math.sin(t) * amp * 0.5) - 0.05;

      // Body bob
      this._body.position.y = Math.abs(Math.sin(t * 2)) * (isTrot ? 0.04 : 0.015);

      // Head bob
      this._headGroup.rotation.x = 0.45 + Math.sin(t) * 0.05;

      // Tail sway
      this._tailGroup.rotation.z = Math.sin(t * 0.5) * 0.15;
    } else {
      // Idle: slight ear-twitch / tail sway
      this._tailGroup.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
      this._headGroup.rotation.x = 0.45 + Math.sin(Date.now() * 0.001) * 0.02;

      // Reset legs
      this._frontLeftUpper.rotation.x = 0;
      this._frontLeftLower.rotation.x = -0.05;
      this._frontRightUpper.rotation.x = 0;
      this._frontRightLower.rotation.x = -0.05;
      this._rearLeftUpper.rotation.x = 0;
      this._rearLeftLower.rotation.x = -0.05;
      this._rearRightUpper.rotation.x = 0;
      this._rearRightLower.rotation.x = -0.05;
      this._body.position.y = 0;
    }

    // Death pose
    if (!horse.alive) {
      this.group.rotation.z = Math.PI / 2; // fall to side
      this.group.position.y = -0.3;
    }

    // HP bar
    this._hpBarBg.lookAt(camera.position);
    this._hpBarFill.lookAt(camera.position);
    const hpPct = Math.max(0, horse.hp / horse.maxHp);
    this._hpBarFill.scale.x = hpPct;
    this._hpBarFill.position.x = -(1 - hpPct) * 0.29;
    this._hpBarBg.visible = horse.alive;
    this._hpBarFill.visible = horse.alive;
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
