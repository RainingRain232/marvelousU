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

    // ---- Body (barrel) ----
    this._body = new THREE.Group();
    this.group.add(this._body);

    const bodyGeo = new THREE.SphereGeometry(1, 12, 8);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.scale.set(BODY_RADIUS, BODY_RADIUS * 0.9, BODY_LEN / 2);
    bodyMesh.position.y = UPPER_LEG_LEN + LOWER_LEG_LEN + HOOF_RADIUS * 2;
    this._body.add(bodyMesh);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(1, 8, 6);
    const bellyMesh = new THREE.Mesh(bellyGeo, bodyMat);
    bellyMesh.scale.set(BODY_RADIUS * 0.85, BODY_RADIUS * 0.55, BODY_LEN * 0.35);
    bellyMesh.position.y = bodyMesh.position.y - BODY_RADIUS * 0.35;
    this._body.add(bellyMesh);

    const bodyY = bodyMesh.position.y;

    // ---- Neck ----
    this._neckGroup = new THREE.Group();
    this._neckGroup.position.set(0, bodyY + BODY_RADIUS * 0.3, BODY_LEN / 2 - 0.05);
    this._body.add(this._neckGroup);

    const neckGeo = cyl(NECK_RADIUS * 0.85, NECK_RADIUS, NECK_LEN, 8);
    const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
    neckMesh.position.y = NECK_LEN / 2;
    this._neckGroup.add(neckMesh);
    this._neckGroup.rotation.x = -0.45; // angled forward

    // Mane along top of neck
    for (let i = 0; i < 5; i++) {
      const maneGeo = new THREE.BoxGeometry(0.02, 0.08, 0.06);
      const manePiece = new THREE.Mesh(maneGeo, maneMat);
      manePiece.position.set(0, NECK_LEN * 0.2 + i * (NECK_LEN * 0.15), NECK_RADIUS * 0.2);
      manePiece.rotation.x = -0.3;
      this._neckGroup.add(manePiece);
    }

    // ---- Head ----
    this._headGroup = new THREE.Group();
    this._headGroup.position.set(0, NECK_LEN, 0);
    this._neckGroup.add(this._headGroup);

    // Skull
    const skullGeo = new THREE.BoxGeometry(HEAD_W * 2, HEAD_H * 2, HEAD_LEN);
    const skullMesh = new THREE.Mesh(skullGeo, bodyMat);
    skullMesh.position.z = HEAD_LEN / 2;
    this._headGroup.add(skullMesh);

    // Snout (tapered front)
    const snoutGeo = cyl(HEAD_W * 0.6, HEAD_W * 0.9, HEAD_LEN * 0.35, 6);
    const snoutMesh = new THREE.Mesh(snoutGeo, bodyMat);
    snoutMesh.rotation.x = Math.PI / 2;
    snoutMesh.position.set(0, -HEAD_H * 0.2, HEAD_LEN * 0.8);
    this._headGroup.add(snoutMesh);

    // Nostrils
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 4, 4);
      const nostrilMesh = new THREE.Mesh(nostrilGeo, makeMat(0x222222));
      nostrilMesh.position.set(HEAD_W * 0.4 * side, -HEAD_H * 0.3, HEAD_LEN * 0.95);
      this._headGroup.add(nostrilMesh);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const eyeMesh = new THREE.Mesh(eyeGeo, makeMat(0x1a1a1a));
      eyeMesh.position.set(HEAD_W * 0.9 * side, HEAD_H * 0.3, HEAD_LEN * 0.35);
      this._headGroup.add(eyeMesh);
    }

    // Ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.025, 0.08, 4);
      const earMesh = new THREE.Mesh(earGeo, bodyMat);
      earMesh.position.set(HEAD_W * 0.5 * side, HEAD_H + 0.04, HEAD_LEN * 0.15);
      earMesh.rotation.z = side * 0.2;
      this._headGroup.add(earMesh);
    }

    this._headGroup.rotation.x = 0.45; // tilt head level

    // ---- Legs (4 legs, each with upper, lower, hoof) ----
    const legPositions = [
      { x: BODY_RADIUS * 0.5,  z: BODY_LEN / 2 - 0.12, name: "frontLeft" },
      { x: -BODY_RADIUS * 0.5, z: BODY_LEN / 2 - 0.12, name: "frontRight" },
      { x: BODY_RADIUS * 0.5,  z: -BODY_LEN / 2 + 0.12, name: "rearLeft" },
      { x: -BODY_RADIUS * 0.5, z: -BODY_LEN / 2 + 0.12, name: "rearRight" },
    ];

    const legGroups: { upper: THREE.Group; lower: THREE.Group }[] = [];

    for (const lp of legPositions) {
      // Upper leg
      const upper = new THREE.Group();
      upper.position.set(lp.x, bodyY - BODY_RADIUS * 0.6, lp.z);
      this._body.add(upper);

      const upperMesh = new THREE.Mesh(cyl(LEG_RADIUS, LEG_RADIUS * 1.1, UPPER_LEG_LEN, 6), bodyMat);
      upperMesh.position.y = -UPPER_LEG_LEN / 2;
      upper.add(upperMesh);

      // Knee joint
      const kneeGeo = new THREE.SphereGeometry(LEG_RADIUS * 1.2, 6, 6);
      const kneeMesh = new THREE.Mesh(kneeGeo, bodyMat);
      kneeMesh.position.y = -UPPER_LEG_LEN;
      upper.add(kneeMesh);

      // Lower leg
      const lower = new THREE.Group();
      lower.position.y = -UPPER_LEG_LEN;
      upper.add(lower);

      const lowerMesh = new THREE.Mesh(cyl(LEG_RADIUS * 0.9, LEG_RADIUS * 0.7, LOWER_LEG_LEN, 6), bodyMat);
      lowerMesh.position.y = -LOWER_LEG_LEN / 2;
      lower.add(lowerMesh);

      // Hoof
      const hoofGeo = cyl(HOOF_RADIUS, HOOF_RADIUS * 1.1, HOOF_RADIUS * 2, 6);
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
    this._tailGroup.position.set(0, bodyY + BODY_RADIUS * 0.3, -BODY_LEN / 2 + 0.05);
    this._body.add(this._tailGroup);

    const tailGeo = cyl(0.03, 0.015, TAIL_LEN, 4);
    const tailMesh = new THREE.Mesh(tailGeo, maneMat);
    tailMesh.position.y = -TAIL_LEN / 2;
    this._tailGroup.add(tailMesh);
    this._tailGroup.rotation.x = 0.5; // hang down-back

    // Tail hair strands
    for (let i = 0; i < 3; i++) {
      const strandGeo = new THREE.BoxGeometry(0.01, TAIL_LEN * 0.3, 0.01);
      const strand = new THREE.Mesh(strandGeo, maneMat);
      strand.position.set((i - 1) * 0.015, -TAIL_LEN * 0.85, 0);
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
      // Leather peytral (chest plate)
      const peytralGeo = new THREE.BoxGeometry(BODY_RADIUS * 1.6, BODY_RADIUS * 0.8, 0.15);
      const peytral = new THREE.Mesh(peytralGeo, armorMat(0x8b6914, 0.1));
      peytral.position.set(0, bodyY, BODY_LEN / 2 + 0.05);
      this._body.add(peytral);
      this._armorMeshes.push(peytral);
    }

    if (tier === "medium" || tier === "heavy") {
      // Chain peytral
      const peytralGeo = new THREE.BoxGeometry(BODY_RADIUS * 1.8, BODY_RADIUS * 1.0, 0.12);
      const peytral = new THREE.Mesh(peytralGeo, armorMat(0xaaaaaa, 0.5));
      peytral.position.set(0, bodyY, BODY_LEN / 2 + 0.06);
      this._body.add(peytral);
      this._armorMeshes.push(peytral);

      // Flanchards (side armor)
      for (const side of [-1, 1]) {
        const flGeo = new THREE.BoxGeometry(0.06, BODY_RADIUS * 1.2, BODY_LEN * 0.5);
        const fl = new THREE.Mesh(flGeo, armorMat(0xaaaaaa, 0.5));
        fl.position.set(BODY_RADIUS * 0.85 * side, bodyY, 0);
        this._body.add(fl);
        this._armorMeshes.push(fl);
      }
    }

    if (tier === "heavy") {
      // Full plate barding
      // Crinet (neck armor)
      const crinetGeo = cyl(NECK_RADIUS * 1.3, NECK_RADIUS * 1.5, NECK_LEN * 0.7, 8);
      const crinet = new THREE.Mesh(crinetGeo, armorMat(0xbbbbbb, 0.6));
      crinet.position.y = NECK_LEN * 0.35;
      this._neckGroup.add(crinet);
      this._armorMeshes.push(crinet);

      // Chanfron (face plate)
      const chanfronGeo = new THREE.BoxGeometry(HEAD_W * 1.8, HEAD_H * 1.5, HEAD_LEN * 0.6);
      const chanfron = new THREE.Mesh(chanfronGeo, armorMat(0xbbbbbb, 0.6));
      chanfron.position.set(0, HEAD_H * 0.2, HEAD_LEN * 0.4);
      this._headGroup.add(chanfron);
      this._armorMeshes.push(chanfron);

      // Eye guards (small ridges)
      for (const side of [-1, 1]) {
        const guardGeo = new THREE.BoxGeometry(0.03, 0.04, 0.06);
        const guard = new THREE.Mesh(guardGeo, armorMat(0xdddddd, 0.7));
        guard.position.set(HEAD_W * 0.9 * side, HEAD_H * 0.5, HEAD_LEN * 0.35);
        this._headGroup.add(guard);
        this._armorMeshes.push(guard);
      }

      // Crupper (rump armor)
      const crupperGeo = new THREE.SphereGeometry(1, 8, 6);
      const crupper = new THREE.Mesh(crupperGeo, armorMat(0xbbbbbb, 0.6));
      crupper.scale.set(BODY_RADIUS * 1.1, BODY_RADIUS * 0.7, BODY_LEN * 0.25);
      crupper.position.set(0, bodyY, -BODY_LEN / 2 + 0.1);
      this._body.add(crupper);
      this._armorMeshes.push(crupper);

      // Leg guards (upper leg plates)
      const legUppers = [this._frontLeftUpper, this._frontRightUpper, this._rearLeftUpper, this._rearRightUpper];
      for (const leg of legUppers) {
        const plateGeo = cyl(LEG_RADIUS * 2, LEG_RADIUS * 2, UPPER_LEG_LEN * 0.5, 6);
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
