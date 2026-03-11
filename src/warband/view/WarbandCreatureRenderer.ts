// ---------------------------------------------------------------------------
// Warband mode – procedural creature renderer
// Builds large non-humanoid creatures (troll, cyclops) from Three.js primitives
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { WarbandFighter } from "../state/WarbandState";
import { FighterCombatState } from "../state/WarbandState";
import { CREATURE_DEFS, type CreatureType } from "../config/CreatureDefs";

// ---- Helpers ---------------------------------------------------------------

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...opts });
}

function cyl(rTop: number, rBot: number, h: number, seg = 8): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg);
}

// ---- CreatureMesh class ----------------------------------------------------

export class CreatureMesh {
  group: THREE.Group;
  fighterId: string;

  private _body: THREE.Group;
  private _leftArm: THREE.Group;
  private _rightArm: THREE.Group;
  private _leftLeg: THREE.Group;
  private _rightLeg: THREE.Group;
  private _head: THREE.Group;

  private _hpBarBg: THREE.Mesh;
  private _hpBarFill: THREE.Mesh;

  private _creatureType: CreatureType;

  constructor(fighter: WarbandFighter) {
    this.fighterId = fighter.id;
    this._creatureType = fighter.creatureType!;

    const def = CREATURE_DEFS[this._creatureType];
    this.group = new THREE.Group();
    this._body = new THREE.Group();
    this._leftArm = new THREE.Group();
    this._rightArm = new THREE.Group();
    this._leftLeg = new THREE.Group();
    this._rightLeg = new THREE.Group();
    this._head = new THREE.Group();

    this.group.add(this._body);

    switch (this._creatureType) {
      case "troll":
        this._buildTroll();
        break;
      case "cyclops":
        this._buildCyclops();
        break;
      case "spider":
        this._buildSpider();
        break;
      case "giant_frog":
        this._buildGiantFrog();
        break;
      case "rhino":
        this._buildRhino();
        break;
      case "vampire_bat":
        this._buildVampireBat();
        break;
      case "red_dragon":
        this._buildRedDragon();
        break;
      case "fire_elemental":
        this._buildFireElemental();
        break;
      case "ice_elemental":
        this._buildIceElemental();
        break;
      case "earth_elemental":
        this._buildEarthElemental();
        break;
      case "battering_ram":
        this._buildBatteringRam();
        break;
      case "catapult":
        this._buildCatapult();
        break;
      case "trebuchet":
        this._buildTrebuchet();
        break;
      case "ballista":
        this._buildBallista();
        break;
      case "cannon":
        this._buildCannon();
        break;
      case "giant_siege":
        this._buildGiantSiege();
        break;
    }

    // ---- HP bar ----
    const hpY = def.height + 0.4;
    const barW = def.radius * 2;
    const bgGeo = new THREE.PlaneGeometry(barW, 0.1);
    this._hpBarBg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 }));
    this._hpBarBg.position.set(0, hpY, 0);
    this.group.add(this._hpBarBg);

    const fillGeo = new THREE.PlaneGeometry(barW - 0.04, 0.07);
    this._hpBarFill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xcc3333 }));
    this._hpBarFill.position.set(0, hpY, 0.001);
    this.group.add(this._hpBarFill);
  }

  // ---- Troll builder -------------------------------------------------------

  private _buildTroll(): void {
    const skinMat = mat(0x5a6b3a); // mossy green-brown
    const darkMat = mat(0x3a4a2a);
    const boneMat = mat(0xc8b890);
    const eyeMat = mat(0xcc2200, { emissive: 0x441100 });

    // Torso — hunched, barrel-shaped
    const torsoGeo = new THREE.SphereGeometry(1, 10, 8);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.55, 0.7, 0.45);
    torso.position.y = 2.2;
    this._body.add(torso);

    // Belly — potbelly
    const bellyGeo = new THREE.SphereGeometry(1, 8, 6);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.5, 0.5, 0.42);
    belly.position.set(0, 1.8, 0.15);
    this._body.add(belly);

    // Hunch / upper back
    const hunchGeo = new THREE.SphereGeometry(1, 8, 6);
    const hunch = new THREE.Mesh(hunchGeo, skinMat);
    hunch.scale.set(0.48, 0.35, 0.4);
    hunch.position.set(0, 2.7, -0.15);
    this._body.add(hunch);

    // Head — small relative to body, jutting forward
    this._head.position.set(0, 2.8, 0.25);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.22, 0.25, 0.24);
    this._head.add(headMesh);

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 6, 4);
    const brow = new THREE.Mesh(browGeo, darkMat);
    brow.scale.set(0.24, 0.08, 0.12);
    brow.position.set(0, 0.12, 0.14);
    this._head.add(brow);

    // Eyes — small, red
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 0.08, 0.2);
      this._head.add(eye);
    }

    // Jaw / underbite
    const jawGeo = new THREE.SphereGeometry(1, 6, 4);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.scale.set(0.2, 0.12, 0.16);
    jaw.position.set(0, -0.1, 0.12);
    this._head.add(jaw);

    // Tusks
    for (const side of [-1, 1]) {
      const tuskGeo = new THREE.ConeGeometry(0.025, 0.1, 5);
      const tusk = new THREE.Mesh(tuskGeo, boneMat);
      tusk.position.set(side * 0.1, -0.08, 0.18);
      tusk.rotation.x = -0.3;
      this._head.add(tusk);
    }

    // Ears — ragged, pointed
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.22, 0.05, 0.0);
      ear.rotation.z = side * 0.6;
      this._head.add(ear);
    }

    // ---- Arms — long, ape-like ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.6, 2.5, 0.0);
      this._body.add(arm);

      // Upper arm
      const upperGeo = cyl(0.14, 0.12, 0.7, 7);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.35;
      arm.add(upper);

      // Forearm — thicker
      const foreGeo = cyl(0.12, 0.1, 0.65, 7);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -0.9;
      arm.add(fore);

      // Fist — large, clublike
      const fistGeo = new THREE.SphereGeometry(0.14, 6, 6);
      const fist = new THREE.Mesh(fistGeo, darkMat);
      fist.position.y = -1.3;
      arm.add(fist);
    }

    // Club in right hand
    const clubGeo = cyl(0.06, 0.1, 1.0, 6);
    const club = new THREE.Mesh(clubGeo, mat(0x5c3317));
    club.position.y = -1.7;
    this._rightArm.add(club);

    // Club knob
    const knobGeo = new THREE.SphereGeometry(0.13, 6, 6);
    const knob = new THREE.Mesh(knobGeo, mat(0x4a2810));
    knob.position.y = -2.2;
    this._rightArm.add(knob);

    // ---- Legs — stumpy, thick ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.28, 1.3, 0.0);
      this._body.add(leg);

      // Thigh
      const thighGeo = cyl(0.18, 0.14, 0.65, 7);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.32;
      leg.add(thigh);

      // Shin
      const shinGeo = cyl(0.14, 0.1, 0.55, 7);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.8;
      leg.add(shin);

      // Foot
      const footGeo = new THREE.SphereGeometry(1, 6, 5);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.scale.set(0.13, 0.08, 0.18);
      foot.position.set(0, -1.12, 0.06);
      leg.add(foot);
    }

    // Warts / skin detail
    for (let i = 0; i < 6; i++) {
      const wartGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 5, 5);
      const wart = new THREE.Mesh(wartGeo, darkMat);
      const angle = Math.random() * Math.PI * 2;
      wart.position.set(
        Math.cos(angle) * (0.35 + Math.random() * 0.15),
        1.8 + Math.random() * 1.0,
        Math.sin(angle) * (0.3 + Math.random() * 0.1),
      );
      this._body.add(wart);
    }
  }

  // ---- Cyclops builder -----------------------------------------------------

  private _buildCyclops(): void {
    const skinMat = mat(0x8b7355); // sandy/stone
    const darkMat = mat(0x6b5335);
    const boneMat = mat(0xd4c4a0);
    const eyeMat = mat(0xffcc00, { emissive: 0x884400 });

    // Torso — massive, broad-shouldered
    const torsoGeo = new THREE.SphereGeometry(1, 12, 10);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.75, 0.9, 0.6);
    torso.position.y = 3.0;
    this._body.add(torso);

    // Chest muscles
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 6, 5);
      const pect = new THREE.Mesh(pectGeo, skinMat);
      pect.scale.set(0.3, 0.2, 0.2);
      pect.position.set(side * 0.25, 3.2, 0.4);
      this._body.add(pect);
    }

    // Belly
    const bellyGeo = new THREE.SphereGeometry(1, 8, 6);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.6, 0.55, 0.5);
    belly.position.set(0, 2.4, 0.1);
    this._body.add(belly);

    // Head — large, single-eyed
    this._head.position.set(0, 4.0, 0.15);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 10, 8);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.35, 0.38, 0.33);
    this._head.add(headMesh);

    // Single great eye — centered
    const eyeSocketGeo = new THREE.SphereGeometry(1, 8, 6);
    const eyeSocket = new THREE.Mesh(eyeSocketGeo, darkMat);
    eyeSocket.scale.set(0.15, 0.12, 0.08);
    eyeSocket.position.set(0, 0.08, 0.28);
    this._head.add(eyeSocket);

    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.08, 0.3);
    this._head.add(eye);

    // Pupil
    const pupilGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const pupil = new THREE.Mesh(pupilGeo, mat(0x111111));
    pupil.position.set(0, 0.08, 0.38);
    this._head.add(pupil);

    // Brow ridge — heavy
    const browGeo = new THREE.SphereGeometry(1, 8, 4);
    const brow = new THREE.Mesh(browGeo, skinMat);
    brow.scale.set(0.36, 0.1, 0.15);
    brow.position.set(0, 0.2, 0.2);
    this._head.add(brow);

    // Nose — broad
    const noseGeo = new THREE.SphereGeometry(1, 5, 5);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.scale.set(0.08, 0.1, 0.1);
    nose.position.set(0, -0.05, 0.3);
    this._head.add(nose);

    // Jaw — heavy, wide
    const jawGeo = new THREE.SphereGeometry(1, 7, 5);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.scale.set(0.32, 0.18, 0.22);
    jaw.position.set(0, -0.2, 0.1);
    this._head.add(jaw);

    // Teeth
    for (let i = -2; i <= 2; i++) {
      const toothGeo = new THREE.ConeGeometry(0.02, 0.06, 4);
      const tooth = new THREE.Mesh(toothGeo, boneMat);
      tooth.position.set(i * 0.06, -0.28, 0.18);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // Ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(1, 5, 4);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.scale.set(0.06, 0.12, 0.1);
      ear.position.set(side * 0.33, 0.05, 0.0);
      this._head.add(ear);
    }

    // ---- Arms — massive ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.8, 3.5, 0.0);
      this._body.add(arm);

      // Shoulder
      const shoulderGeo = new THREE.SphereGeometry(0.2, 7, 6);
      const shoulder = new THREE.Mesh(shoulderGeo, skinMat);
      arm.add(shoulder);

      // Upper arm
      const upperGeo = cyl(0.18, 0.15, 0.9, 8);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.45;
      arm.add(upper);

      // Forearm
      const foreGeo = cyl(0.15, 0.12, 0.85, 7);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -1.2;
      arm.add(fore);

      // Hand
      const handGeo = new THREE.SphereGeometry(0.16, 6, 6);
      const hand = new THREE.Mesh(handGeo, darkMat);
      hand.position.y = -1.7;
      arm.add(hand);
    }

    // Boulder in right hand
    const boulderGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const boulder = new THREE.Mesh(boulderGeo, mat(0x888888, { roughness: 0.9 }));
    boulder.position.y = -1.95;
    this._rightArm.add(boulder);

    // ---- Legs — tree-trunk thick ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.7, 0.0);
      this._body.add(leg);

      // Thigh
      const thighGeo = cyl(0.22, 0.18, 0.85, 8);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.42;
      leg.add(thigh);

      // Shin
      const shinGeo = cyl(0.18, 0.13, 0.75, 7);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -1.1;
      leg.add(shin);

      // Foot
      const footGeo = new THREE.SphereGeometry(1, 6, 5);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.scale.set(0.16, 0.1, 0.24);
      foot.position.set(0, -1.55, 0.08);
      leg.add(foot);

      // Toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.04, 4, 4);
        const toe = new THREE.Mesh(toeGeo, darkMat);
        toe.position.set(t * 0.06, -1.58, 0.22);
        leg.add(toe);
      }
    }

    // Loincloth
    const clothGeo = new THREE.PlaneGeometry(0.6, 0.5);
    const clothMat = mat(0x6b4226);
    const clothFront = new THREE.Mesh(clothGeo, clothMat);
    clothFront.position.set(0, 1.85, 0.35);
    this._body.add(clothFront);
    const clothBack = new THREE.Mesh(clothGeo.clone(), clothMat);
    clothBack.position.set(0, 1.85, -0.35);
    this._body.add(clothBack);

    // Necklace of bones
    for (let i = 0; i < 5; i++) {
      const angle = -0.4 + i * 0.2;
      const boneGeo = new THREE.ConeGeometry(0.025, 0.12, 4);
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set(Math.sin(angle) * 0.55, 3.6, Math.cos(angle) * 0.45);
      bone.rotation.z = Math.sin(angle) * 0.3;
      this._body.add(bone);
    }
  }

  // ---- Spider builder ------------------------------------------------------

  private _buildSpider(): void {
    const blackMat = mat(0x1a1a2e);
    const purpleMat = mat(0x2d1b4e);
    const darkLegMat = mat(0x222233);
    const eyeMat = mat(0xcc1111, { emissive: 0x881111 });
    const fangMat = mat(0x332211);
    const bristleMat = mat(0x111118);

    // ---- Abdomen — large, bulbous rear section ----
    const abdomenGeo = new THREE.SphereGeometry(1, 12, 10);
    const abdomen = new THREE.Mesh(abdomenGeo, blackMat);
    abdomen.scale.set(0.55, 0.45, 0.7);
    abdomen.position.set(0, 1.2, -0.6);
    this._body.add(abdomen);

    // Abdomen markings (hourglass / chevron shapes)
    for (let i = 0; i < 3; i++) {
      const markGeo = new THREE.SphereGeometry(1, 5, 4);
      const mark = new THREE.Mesh(markGeo, purpleMat);
      mark.scale.set(0.12 - i * 0.02, 0.04, 0.06);
      mark.position.set(0, 1.38, -0.45 - i * 0.22);
      this._body.add(mark);
    }

    // Abdomen underside pattern
    const underMarkGeo = new THREE.SphereGeometry(1, 5, 4);
    const underMark = new THREE.Mesh(underMarkGeo, mat(0x441133));
    underMark.scale.set(0.15, 0.03, 0.12);
    underMark.position.set(0, 0.88, -0.6);
    this._body.add(underMark);

    // Spinnerets at back
    for (let i = -1; i <= 1; i++) {
      const spinGeo = new THREE.ConeGeometry(0.03, 0.1, 5);
      const spin = new THREE.Mesh(spinGeo, purpleMat);
      spin.position.set(i * 0.06, 1.0, -1.22);
      spin.rotation.x = Math.PI * 0.6;
      this._body.add(spin);
    }

    // ---- Cephalothorax — front body section ----
    const cephGeo = new THREE.SphereGeometry(1, 10, 8);
    const ceph = new THREE.Mesh(cephGeo, blackMat);
    ceph.scale.set(0.4, 0.32, 0.4);
    ceph.position.set(0, 1.3, 0.2);
    this._body.add(ceph);

    // Narrow waist connecting cephalothorax and abdomen
    const waistGeo = cyl(0.1, 0.12, 0.2, 6);
    const waist = new THREE.Mesh(waistGeo, blackMat);
    waist.position.set(0, 1.2, -0.15);
    waist.rotation.x = Math.PI / 2;
    this._body.add(waist);

    // ---- Head ----
    this._head.position.set(0, 1.5, 0.5);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, blackMat);
    headMesh.scale.set(0.18, 0.16, 0.18);
    this._head.add(headMesh);

    // Eye cluster — 8 eyes in a menacing pattern
    const eyePositions = [
      { x: -0.06, y: 0.06, z: 0.14, r: 0.035 },
      { x: 0.06, y: 0.06, z: 0.14, r: 0.035 },
      { x: -0.1, y: 0.09, z: 0.1, r: 0.025 },
      { x: 0.1, y: 0.09, z: 0.1, r: 0.025 },
      { x: -0.12, y: 0.11, z: 0.05, r: 0.018 },
      { x: 0.12, y: 0.11, z: 0.05, r: 0.018 },
      { x: -0.04, y: 0.14, z: 0.08, r: 0.015 },
      { x: 0.04, y: 0.14, z: 0.08, r: 0.015 },
    ];
    for (const ep of eyePositions) {
      const eGeo = new THREE.SphereGeometry(ep.r, 6, 6);
      const eMesh = new THREE.Mesh(eGeo, eyeMat);
      eMesh.position.set(ep.x, ep.y, ep.z);
      this._head.add(eMesh);
    }

    // ---- Fangs / chelicerae — on _rightArm for attack animation ----
    this._rightArm.position.set(0, 1.35, 0.55);
    this._body.add(this._rightArm);

    for (const side of [-1, 1]) {
      // Fang base segment
      const baseGeo = cyl(0.04, 0.035, 0.15, 6);
      const base = new THREE.Mesh(baseGeo, blackMat);
      base.position.set(side * 0.08, -0.05, 0.05);
      base.rotation.x = 0.3;
      this._rightArm.add(base);

      // Fang tip — curved, pointed
      const tipGeo = new THREE.ConeGeometry(0.025, 0.14, 5);
      const tip = new THREE.Mesh(tipGeo, fangMat);
      tip.position.set(side * 0.08, -0.18, 0.08);
      tip.rotation.x = 0.2;
      this._rightArm.add(tip);

      // Fang venom drop — tiny glowing bead
      const venomGeo = new THREE.SphereGeometry(0.012, 5, 5);
      const venom = new THREE.Mesh(venomGeo, mat(0x33cc33, { emissive: 0x115511, transparent: true, opacity: 0.8 }));
      venom.position.set(side * 0.08, -0.26, 0.09);
      this._rightArm.add(venom);
    }

    // Pedipalps (small feelers beside fangs)
    for (const side of [-1, 1]) {
      const palpGeo = cyl(0.015, 0.02, 0.1, 5);
      const palp = new THREE.Mesh(palpGeo, darkLegMat);
      palp.position.set(side * 0.14, -0.02, 0.08);
      palp.rotation.x = 0.5;
      palp.rotation.z = side * 0.3;
      this._rightArm.add(palp);
    }

    // ---- Left arm (not used visually, park it inside body) ----
    this._leftArm.position.set(0, 1.3, 0.2);
    this._body.add(this._leftArm);

    // ---- Legs — 4 per side, each with 3 segments ----
    const legAnglesLeft = [
      { x: -0.35, z: 0.25, spreadZ: 0.5, spreadX: -0.6 },
      { x: -0.38, z: 0.05, spreadZ: 0.2, spreadX: -0.8 },
      { x: -0.35, z: -0.15, spreadZ: -0.2, spreadX: -0.7 },
      { x: -0.30, z: -0.35, spreadZ: -0.5, spreadX: -0.5 },
    ];
    const legAnglesRight = legAnglesLeft.map((l) => ({
      x: -l.x,
      z: l.z,
      spreadZ: l.spreadZ,
      spreadX: -l.spreadX,
    }));

    for (const sideData of [
      { group: this._leftLeg, legs: legAnglesLeft, side: -1 },
      { group: this._rightLeg, legs: legAnglesRight, side: 1 },
    ]) {
      sideData.group.position.set(0, 1.3, 0.0);
      this._body.add(sideData.group);

      for (const lp of sideData.legs) {
        const legGroup = new THREE.Group();
        legGroup.position.set(lp.x, 0, lp.z);
        sideData.group.add(legGroup);

        // Coxa — short segment near body
        const coxaGeo = cyl(0.04, 0.035, 0.2, 6);
        const coxa = new THREE.Mesh(coxaGeo, darkLegMat);
        coxa.rotation.z = lp.spreadX * 0.8;
        coxa.rotation.x = lp.spreadZ * 0.3;
        coxa.position.set(sideData.side * 0.1, 0, lp.spreadZ * 0.05);
        legGroup.add(coxa);

        // Femur — long, angled outward and upward
        const femurGeo = cyl(0.032, 0.025, 0.55, 6);
        const femur = new THREE.Mesh(femurGeo, blackMat);
        femur.position.set(sideData.side * 0.35, 0.25, lp.spreadZ * 0.25);
        femur.rotation.z = lp.spreadX * 0.55;
        femur.rotation.x = lp.spreadZ * 0.4;
        legGroup.add(femur);

        // Tibia — angled downward to ground
        const tibiaGeo = cyl(0.022, 0.01, 0.65, 6);
        const tibia = new THREE.Mesh(tibiaGeo, darkLegMat);
        tibia.position.set(sideData.side * 0.6, -0.2, lp.spreadZ * 0.45);
        tibia.rotation.z = -sideData.side * 0.6;
        tibia.rotation.x = lp.spreadZ * 0.3;
        legGroup.add(tibia);

        // Pointed tip
        const tipGeo = new THREE.ConeGeometry(0.015, 0.06, 4);
        const tip = new THREE.Mesh(tipGeo, fangMat);
        tip.position.set(sideData.side * 0.7, -0.55, lp.spreadZ * 0.55);
        tip.rotation.z = -sideData.side * 0.3;
        legGroup.add(tip);

        // Bristles / hair on femur and tibia
        for (let b = 0; b < 3; b++) {
          const bristleGeo = new THREE.ConeGeometry(0.006, 0.05, 3);
          const bristle = new THREE.Mesh(bristleGeo, bristleMat);
          bristle.position.set(
            sideData.side * (0.3 + b * 0.12),
            0.22 - b * 0.2,
            lp.spreadZ * (0.2 + b * 0.08) + (b % 2 === 0 ? 0.02 : -0.02),
          );
          bristle.rotation.z = -sideData.side * 0.8;
          legGroup.add(bristle);
        }
      }
    }

    // Abdomen bristles — scattered tiny spines
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const bGeo = new THREE.ConeGeometry(0.008, 0.06, 3);
      const b = new THREE.Mesh(bGeo, bristleMat);
      b.position.set(
        Math.cos(angle) * (0.25 + Math.random() * 0.2),
        1.2 + Math.random() * 0.3,
        -0.6 + Math.sin(angle) * (0.3 + Math.random() * 0.2),
      );
      b.rotation.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5);
      this._body.add(b);
    }
  }

  // ---- Giant Frog builder ---------------------------------------------------

  private _buildGiantFrog(): void {
    const skinMat = mat(0x2d5a27);
    const darkSkinMat = mat(0x1e4a1a);
    const bellyMat = mat(0x8b9a3b);
    const eyeMat = mat(0xccdd11, { emissive: 0x667700 });
    const pupilMat = mat(0x111111);
    const tongueMat = mat(0xcc5566);
    const mouthMat = mat(0x3a1a1a);

    // ---- Body — wide, squat, flattened sphere ----
    const bodyGeo = new THREE.SphereGeometry(1, 14, 10);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.scale.set(0.7, 0.45, 0.6);
    body.position.set(0, 1.0, 0.0);
    this._body.add(body);

    // Belly — lighter underside
    const bellyGeo = new THREE.SphereGeometry(1, 10, 8);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.6, 0.35, 0.5);
    belly.position.set(0, 0.85, 0.08);
    this._body.add(belly);

    // Throat pouch — bulging underneath
    const throatGeo = new THREE.SphereGeometry(1, 8, 6);
    const throat = new THREE.Mesh(throatGeo, mat(0x9aaa4b));
    throat.scale.set(0.3, 0.2, 0.28);
    throat.position.set(0, 0.6, 0.35);
    this._body.add(throat);

    // Bumpy / warty skin texture — random warts on body
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const yOff = Math.random() * 0.5;
      const wartGeo = new THREE.SphereGeometry(0.025 + Math.random() * 0.025, 5, 5);
      const wart = new THREE.Mesh(wartGeo, darkSkinMat);
      wart.position.set(
        Math.cos(angle) * (0.45 + Math.random() * 0.2),
        0.85 + yOff,
        Math.sin(angle) * (0.35 + Math.random() * 0.15),
      );
      this._body.add(wart);
    }

    // Back ridges — line of bumps along spine
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.SphereGeometry(0.03 + i * 0.005, 5, 4);
      const ridge = new THREE.Mesh(ridgeGeo, darkSkinMat);
      ridge.position.set(0, 1.3, -0.1 + i * -0.1);
      this._body.add(ridge);
    }

    // ---- Head — wide, flat, with prominent jaw line ----
    this._head.position.set(0, 1.15, 0.55);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 10, 8);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.35, 0.2, 0.25);
    this._head.add(headMesh);

    // Wide mouth / jaw line — dark seam
    const mouthGeo = new THREE.PlaneGeometry(0.5, 0.04);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.04, 0.2);
    mouth.rotation.x = -0.1;
    this._head.add(mouth);

    // Nostrils — two small bumps
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 5, 5);
      const nostril = new THREE.Mesh(nostrilGeo, darkSkinMat);
      nostril.position.set(side * 0.06, 0.06, 0.22);
      this._head.add(nostril);
    }

    // ---- Eyes — large, bulging, on top of head ----
    for (const side of [-1, 1]) {
      // Eye dome — protruding bump
      const eyeDomeGeo = new THREE.SphereGeometry(1, 8, 6);
      const eyeDome = new THREE.Mesh(eyeDomeGeo, skinMat);
      eyeDome.scale.set(0.1, 0.1, 0.1);
      eyeDome.position.set(side * 0.18, 0.18, 0.1);
      this._head.add(eyeDome);

      // Eyeball
      const eyeGeo = new THREE.SphereGeometry(0.075, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.18, 0.22, 0.13);
      this._head.add(eye);

      // Pupil — horizontal slit
      const pupilGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.scale.set(0.4, 1.0, 0.5);
      pupil.position.set(side * 0.18, 0.22, 0.2);
      this._head.add(pupil);

      // Eyelid ridge
      const lidGeo = new THREE.SphereGeometry(1, 6, 4);
      const lid = new THREE.Mesh(lidGeo, darkSkinMat);
      lid.scale.set(0.1, 0.04, 0.08);
      lid.position.set(side * 0.18, 0.28, 0.12);
      this._head.add(lid);
    }

    // Tongue — long cylinder from mouth, on _head so it extends with head motion
    const tongueBase = new THREE.Group();
    tongueBase.position.set(0, -0.06, 0.2);
    tongueBase.rotation.x = 0.25;
    this._head.add(tongueBase);

    const tongueCylGeo = cyl(0.025, 0.015, 0.6, 6);
    const tongueCyl = new THREE.Mesh(tongueCylGeo, tongueMat);
    tongueCyl.position.y = -0.3;
    tongueBase.add(tongueCyl);

    // Tongue tip — forked / sticky blob
    const tongueTipGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const tongueTip = new THREE.Mesh(tongueTipGeo, mat(0xdd6677));
    tongueTip.scale.set(1.5, 0.8, 1.0);
    tongueTip.position.y = -0.6;
    tongueBase.add(tongueTip);

    // ---- Back legs — powerful, bent ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.45, 0.8, -0.25);
      this._body.add(leg);

      // Thigh — thick, angled back
      const thighGeo = cyl(0.16, 0.12, 0.5, 8);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.set(side * 0.1, -0.15, -0.1);
      thigh.rotation.z = side * 0.3;
      thigh.rotation.x = -0.4;
      leg.add(thigh);

      // Knee joint — bulge
      const kneeGeo = new THREE.SphereGeometry(0.1, 6, 6);
      const knee = new THREE.Mesh(kneeGeo, skinMat);
      knee.position.set(side * 0.2, -0.4, -0.3);
      leg.add(knee);

      // Shin — bent down from knee
      const shinGeo = cyl(0.1, 0.07, 0.5, 7);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.set(side * 0.2, -0.7, -0.15);
      shin.rotation.x = 0.5;
      leg.add(shin);

      // Foot — wide, webbed disc
      const footGeo = new THREE.SphereGeometry(1, 8, 5);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.14, 0.04, 0.2);
      foot.position.set(side * 0.2, -1.0, -0.02);
      leg.add(foot);

      // Webbed toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(1, 5, 4);
        const toe = new THREE.Mesh(toeGeo, darkSkinMat);
        toe.scale.set(0.04, 0.02, 0.1);
        toe.position.set(side * 0.2 + t * 0.06, -1.02, 0.12);
        leg.add(toe);
      }

      // Webbing between toes
      const webGeo = new THREE.PlaneGeometry(0.16, 0.1);
      const web = new THREE.Mesh(webGeo, mat(0x3a6a33, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      web.position.set(side * 0.2, -1.01, 0.08);
      web.rotation.x = -Math.PI / 2;
      leg.add(web);

      // Warts on thigh
      for (let w = 0; w < 3; w++) {
        const wGeo = new THREE.SphereGeometry(0.018 + Math.random() * 0.01, 4, 4);
        const wart = new THREE.Mesh(wGeo, darkSkinMat);
        wart.position.set(
          side * (0.08 + Math.random() * 0.15),
          -0.1 - Math.random() * 0.3,
          -0.05 + Math.random() * 0.1,
        );
        leg.add(wart);
      }
    }

    // ---- Front legs — smaller, on _leftArm / _rightArm ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.45, 0.75, 0.3);
      this._body.add(arm);

      // Upper arm — short
      const upperGeo = cyl(0.08, 0.065, 0.3, 6);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.set(side * 0.05, -0.15, 0.0);
      upper.rotation.z = side * 0.25;
      arm.add(upper);

      // Forearm
      const foreGeo = cyl(0.06, 0.045, 0.28, 6);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.set(side * 0.1, -0.42, 0.0);
      arm.add(fore);

      // Small webbed foot
      const footGeo = new THREE.SphereGeometry(1, 6, 4);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.08, 0.025, 0.1);
      foot.position.set(side * 0.1, -0.6, 0.03);
      arm.add(foot);

      // Small toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.015, 4, 4);
        const toe = new THREE.Mesh(toeGeo, darkSkinMat);
        toe.position.set(side * 0.1 + t * 0.03, -0.61, 0.08);
        arm.add(toe);
      }

      // Webbing on front foot
      const webGeo = new THREE.PlaneGeometry(0.08, 0.06);
      const web = new THREE.Mesh(webGeo, mat(0x3a6a33, { transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      web.position.set(side * 0.1, -0.605, 0.05);
      web.rotation.x = -Math.PI / 2;
      arm.add(web);
    }

    // Spots / color variation on back
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spotGeo = new THREE.SphereGeometry(0.035 + Math.random() * 0.03, 5, 4);
      const spot = new THREE.Mesh(spotGeo, mat(0x1e4a1a));
      spot.position.set(
        Math.cos(angle) * (0.3 + Math.random() * 0.25),
        1.2 + Math.random() * 0.15,
        Math.sin(angle) * (0.25 + Math.random() * 0.2),
      );
      spot.scale.y = 0.4;
      this._body.add(spot);
    }
  }

  // ---- Rhino builder -------------------------------------------------------

  private _buildRhino(): void {
    const hideMat = mat(0x5a5a5a);         // dark grey hide
    const bellyMat = mat(0x7a7a7a);        // lighter underside
    const hornMat = mat(0xd4c8a8);         // bone-colored horn
    const armorMat = mat(0x4a4a4a);        // darker armor plates
    const eyeMat = mat(0x221100);          // dark beady eyes
    const hoofMat = mat(0x2a2a2a);         // dark hooves

    // ---- Main body — massive barrel torso ----
    const torsoGeo = new THREE.SphereGeometry(1, 12, 10);
    const torso = new THREE.Mesh(torsoGeo, hideMat);
    torso.scale.set(0.75, 0.6, 1.1);
    torso.position.set(0, 1.4, 0);
    this._body.add(torso);

    // Belly — lighter underside, slightly protruding
    const bellyGeo = new THREE.SphereGeometry(1, 10, 8);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.6, 0.4, 0.9);
    belly.position.set(0, 1.1, 0.05);
    this._body.add(belly);

    // Rear haunch — heavy rump
    const haunchGeo = new THREE.SphereGeometry(1, 8, 6);
    const haunch = new THREE.Mesh(haunchGeo, hideMat);
    haunch.scale.set(0.65, 0.55, 0.5);
    haunch.position.set(0, 1.5, -0.7);
    this._body.add(haunch);

    // Shoulder hump — muscular mass above forelegs
    const shoulderGeo = new THREE.SphereGeometry(1, 8, 6);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, hideMat);
    shoulderMesh.scale.set(0.65, 0.5, 0.5);
    shoulderMesh.position.set(0, 1.7, 0.65);
    this._body.add(shoulderMesh);

    // ---- Armor plates — overlapping on shoulders and flanks ----
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const plateGeo = new THREE.SphereGeometry(1, 6, 4);
        const plate = new THREE.Mesh(plateGeo, armorMat);
        plate.scale.set(0.22, 0.12, 0.2);
        plate.position.set(side * 0.5, 1.8 - i * 0.15, 0.55 - i * 0.2);
        this._body.add(plate);
      }
    }

    // Spine ridges — armored crest along the back
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.SphereGeometry(1, 5, 4);
      const ridge = new THREE.Mesh(ridgeGeo, armorMat);
      ridge.scale.set(0.35, 0.08, 0.12);
      ridge.position.set(0, 2.0, 0.5 - i * 0.3);
      this._body.add(ridge);
    }

    // ---- Skin detail — bumps and wrinkles ----
    for (let i = 0; i < 10; i++) {
      const bumpGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 4, 4);
      const bump = new THREE.Mesh(bumpGeo, armorMat);
      const angle = Math.random() * Math.PI * 2;
      const zOff = -0.8 + Math.random() * 1.6;
      bump.position.set(
        Math.cos(angle) * (0.5 + Math.random() * 0.2),
        1.2 + Math.random() * 0.6,
        zOff,
      );
      this._body.add(bump);
    }

    // Wrinkle folds on sides
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const foldGeo = cyl(0.02, 0.02, 0.3, 4);
        const fold = new THREE.Mesh(foldGeo, armorMat);
        fold.position.set(side * 0.6, 1.3 + i * 0.15, 0.1 - i * 0.1);
        fold.rotation.z = Math.PI / 2;
        fold.rotation.y = side * 0.3;
        this._body.add(fold);
      }
    }

    // ---- Neck — thick, angled forward ----
    const neckGeo = cyl(0.35, 0.4, 0.5, 8);
    const neck = new THREE.Mesh(neckGeo, hideMat);
    neck.position.set(0, 1.6, 0.9);
    neck.rotation.x = 0.5;
    this._body.add(neck);

    // ---- Head — heavy, elongated ----
    this._head.position.set(0, 1.4, 1.3);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, hideMat);
    headMesh.scale.set(0.3, 0.25, 0.4);
    this._head.add(headMesh);

    // Snout — elongated front of the face
    const snoutGeo = new THREE.SphereGeometry(1, 7, 5);
    const snout = new THREE.Mesh(snoutGeo, hideMat);
    snout.scale.set(0.22, 0.18, 0.25);
    snout.position.set(0, -0.05, 0.3);
    this._head.add(snout);

    // Jaw — heavy underjaw
    const jawGeo = new THREE.SphereGeometry(1, 6, 4);
    const jaw = new THREE.Mesh(jawGeo, hideMat);
    jaw.scale.set(0.2, 0.1, 0.28);
    jaw.position.set(0, -0.15, 0.15);
    this._head.add(jaw);

    // ---- Great horn — large cone on the nose (attack weapon) ----
    const mainHornGeo = new THREE.ConeGeometry(0.1, 0.55, 6);
    const mainHorn = new THREE.Mesh(mainHornGeo, hornMat);
    mainHorn.position.set(0, 0.2, 0.5);
    mainHorn.rotation.x = -0.6;
    this._head.add(mainHorn);

    // Second smaller horn behind the main one
    const smallHornGeo = new THREE.ConeGeometry(0.06, 0.25, 5);
    const smallHorn = new THREE.Mesh(smallHornGeo, hornMat);
    smallHorn.position.set(0, 0.22, 0.2);
    smallHorn.rotation.x = -0.4;
    this._head.add(smallHorn);

    // ---- Eyes — small, beady, on sides of head ----
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.22, 0.05, 0.18);
      this._head.add(eye);
    }

    // ---- Ears — small, thick stubs ----
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.04, 0.1, 4);
      const ear = new THREE.Mesh(earGeo, hideMat);
      ear.position.set(side * 0.2, 0.2, -0.05);
      ear.rotation.z = side * 0.3;
      this._head.add(ear);
    }

    // Nostrils — dark pits at snout tip
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const nostril = new THREE.Mesh(nostrilGeo, armorMat);
      nostril.position.set(side * 0.07, -0.06, 0.5);
      this._head.add(nostril);
    }

    // ---- Legs — 4 sturdy columns with hooves ----
    // Left pair (front-left + back-left) on _leftLeg
    // Right pair (front-right + back-right) on _rightLeg
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.4, 1.0, 0);
      this._body.add(leg);

      // Front leg — upper
      const frontUpperGeo = cyl(0.16, 0.14, 0.5, 7);
      const frontUpper = new THREE.Mesh(frontUpperGeo, hideMat);
      frontUpper.position.set(0, -0.15, 0.55);
      leg.add(frontUpper);

      // Front leg — lower
      const frontLowerGeo = cyl(0.14, 0.12, 0.45, 7);
      const frontLower = new THREE.Mesh(frontLowerGeo, hideMat);
      frontLower.position.set(0, -0.55, 0.55);
      leg.add(frontLower);

      // Front knee joint
      const frontKneeGeo = new THREE.SphereGeometry(0.13, 5, 5);
      const frontKnee = new THREE.Mesh(frontKneeGeo, hideMat);
      frontKnee.position.set(0, -0.38, 0.55);
      leg.add(frontKnee);

      // Front hoof — flat cylinder
      const frontHoofGeo = cyl(0.14, 0.15, 0.06, 6);
      const frontHoof = new THREE.Mesh(frontHoofGeo, hoofMat);
      frontHoof.position.set(0, -0.8, 0.55);
      leg.add(frontHoof);

      // Back leg — upper (thicker haunches)
      const backUpperGeo = cyl(0.18, 0.15, 0.5, 7);
      const backUpper = new THREE.Mesh(backUpperGeo, hideMat);
      backUpper.position.set(0, -0.15, -0.5);
      leg.add(backUpper);

      // Back leg — lower
      const backLowerGeo = cyl(0.15, 0.13, 0.45, 7);
      const backLower = new THREE.Mesh(backLowerGeo, hideMat);
      backLower.position.set(0, -0.55, -0.5);
      leg.add(backLower);

      // Back knee joint
      const backKneeGeo = new THREE.SphereGeometry(0.14, 5, 5);
      const backKnee = new THREE.Mesh(backKneeGeo, hideMat);
      backKnee.position.set(0, -0.38, -0.5);
      leg.add(backKnee);

      // Back hoof
      const backHoofGeo = cyl(0.15, 0.16, 0.06, 6);
      const backHoof = new THREE.Mesh(backHoofGeo, hoofMat);
      backHoof.position.set(0, -0.8, -0.5);
      leg.add(backHoof);
    }

    // ---- Tail — short with tuft ----
    const tailGeo = cyl(0.06, 0.03, 0.35, 5);
    const tail = new THREE.Mesh(tailGeo, hideMat);
    tail.position.set(0, 1.5, -1.15);
    tail.rotation.x = -0.7;
    this._body.add(tail);

    // Tail tuft
    const tuftGeo = new THREE.SphereGeometry(0.06, 5, 5);
    const tuft = new THREE.Mesh(tuftGeo, armorMat);
    tuft.position.set(0, 1.35, -1.35);
    this._body.add(tuft);
  }

  // ---- Vampire Bat builder --------------------------------------------------

  private _buildVampireBat(): void {
    const skinMat = mat(0x2a2233);         // dark charcoal skin
    const membraneMat = mat(0x4a1133, {    // deep red-purple wing membrane
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const veinMat = mat(0x1a0a22);         // dark wing veins
    const eyeMat = mat(0xff2200, { emissive: 0xff2200 });  // glowing red eyes
    const fangMat = mat(0xeeeeee);         // white fangs
    const clawMat = mat(0x111111);         // dark claws
    const darkSkinMat = mat(0x1a1522);     // darker accent skin

    // ---- Torso — humanoid but hunched and lean ----
    const torsoGeo = new THREE.SphereGeometry(1, 10, 8);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.35, 0.55, 0.28);
    torso.position.y = 2.0;
    this._body.add(torso);

    // Chest — gaunt, muscular pectorals
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 6, 5);
      const pect = new THREE.Mesh(pectGeo, skinMat);
      pect.scale.set(0.15, 0.12, 0.1);
      pect.position.set(side * 0.12, 2.2, 0.2);
      this._body.add(pect);
    }

    // Ribcage detail — visible ribs on the gaunt frame
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const ribGeo = cyl(0.015, 0.015, 0.15, 4);
        const rib = new THREE.Mesh(ribGeo, darkSkinMat);
        rib.position.set(side * 0.22, 1.7 + i * 0.12, 0.12);
        rib.rotation.z = Math.PI / 2;
        rib.rotation.y = side * 0.4;
        this._body.add(rib);
      }
    }

    // Hunched upper back
    const hunchGeo = new THREE.SphereGeometry(1, 7, 5);
    const hunch = new THREE.Mesh(hunchGeo, skinMat);
    hunch.scale.set(0.32, 0.25, 0.25);
    hunch.position.set(0, 2.45, -0.15);
    this._body.add(hunch);

    // Spine ridge — bony protrusions along back
    for (let i = 0; i < 5; i++) {
      const spineGeo = new THREE.ConeGeometry(0.02, 0.06, 4);
      const spineBump = new THREE.Mesh(spineGeo, darkSkinMat);
      spineBump.position.set(0, 2.5 - i * 0.2, -0.25);
      spineBump.rotation.x = 0.4;
      this._body.add(spineBump);
    }

    // ---- Head ----
    this._head.position.set(0, 2.75, 0.15);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.2, 0.22, 0.2);
    this._head.add(headMesh);

    // Bat snout — flattened, upturned nose
    const snoutGeo = new THREE.SphereGeometry(1, 6, 4);
    const snout = new THREE.Mesh(snoutGeo, skinMat);
    snout.scale.set(0.1, 0.08, 0.1);
    snout.position.set(0, -0.04, 0.17);
    this._head.add(snout);

    // Nostrils — wide bat-like slits
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.015, 4, 4);
      const nostril = new THREE.Mesh(nostrilGeo, darkSkinMat);
      nostril.position.set(side * 0.04, -0.02, 0.25);
      this._head.add(nostril);
    }

    // Brow ridge — heavy, bat-like
    const browGeo = new THREE.SphereGeometry(1, 6, 4);
    const brow = new THREE.Mesh(browGeo, darkSkinMat);
    brow.scale.set(0.22, 0.06, 0.1);
    brow.position.set(0, 0.1, 0.14);
    this._head.add(brow);

    // ---- Large glowing red eyes ----
    for (const side of [-1, 1]) {
      // Eye socket
      const socketGeo = new THREE.SphereGeometry(1, 6, 5);
      const socket = new THREE.Mesh(socketGeo, darkSkinMat);
      socket.scale.set(0.07, 0.06, 0.04);
      socket.position.set(side * 0.1, 0.06, 0.16);
      this._head.add(socket);

      // Glowing eye
      const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 0.06, 0.18);
      this._head.add(eye);

      // Pupil — vertical slit
      const pupilGeo = new THREE.SphereGeometry(0.02, 4, 4);
      const pupil = new THREE.Mesh(pupilGeo, mat(0x110000));
      pupil.scale.set(0.4, 1.2, 1.0);
      pupil.position.set(side * 0.1, 0.06, 0.22);
      this._head.add(pupil);
    }

    // ---- Pointed bat ears — tall cones ----
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.06, 0.25, 5);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.15, 0.28, -0.02);
      ear.rotation.z = side * 0.2;
      this._head.add(ear);

      // Inner ear — darker membrane
      const innerEarGeo = new THREE.ConeGeometry(0.035, 0.18, 4);
      const innerEar = new THREE.Mesh(innerEarGeo, membraneMat);
      innerEar.position.set(side * 0.15, 0.26, 0.0);
      innerEar.rotation.z = side * 0.2;
      this._head.add(innerEar);
    }

    // ---- Fanged mouth ----
    const mouthGeo = new THREE.SphereGeometry(1, 5, 4);
    const mouth = new THREE.Mesh(mouthGeo, darkSkinMat);
    mouth.scale.set(0.1, 0.04, 0.08);
    mouth.position.set(0, -0.1, 0.16);
    this._head.add(mouth);

    // Large fangs — two prominent canines pointing down
    for (const side of [-1, 1]) {
      const fangGeo = new THREE.ConeGeometry(0.012, 0.08, 4);
      const fang = new THREE.Mesh(fangGeo, fangMat);
      fang.position.set(side * 0.04, -0.16, 0.18);
      fang.rotation.x = Math.PI;
      this._head.add(fang);
    }

    // Smaller teeth between fangs
    for (const xOff of [-0.06, -0.02, 0.02, 0.06]) {
      const toothGeo = new THREE.ConeGeometry(0.006, 0.03, 3);
      const tooth = new THREE.Mesh(toothGeo, fangMat);
      tooth.position.set(xOff, -0.13, 0.18);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // ---- Wings — _leftArm = left wing, _rightArm = right wing ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.35, 2.4, -0.05);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.08, 6, 5);
      const shoulderJoint = new THREE.Mesh(shoulderGeo, skinMat);
      wing.add(shoulderJoint);

      // Upper arm bone
      const upperBoneGeo = cyl(0.04, 0.035, 0.6, 6);
      const upperBone = new THREE.Mesh(upperBoneGeo, skinMat);
      upperBone.position.set(side * 0.3, 0.0, 0.0);
      upperBone.rotation.z = side * 1.2;
      wing.add(upperBone);

      // Elbow joint
      const elbowGeo = new THREE.SphereGeometry(0.045, 5, 5);
      const elbow = new THREE.Mesh(elbowGeo, skinMat);
      elbow.position.set(side * 0.55, -0.15, 0.0);
      wing.add(elbow);

      // Forearm bone
      const foreBoneGeo = cyl(0.035, 0.025, 0.7, 6);
      const foreBone = new THREE.Mesh(foreBoneGeo, skinMat);
      foreBone.position.set(side * 0.85, -0.5, 0.0);
      foreBone.rotation.z = side * 0.6;
      wing.add(foreBone);

      // Finger bones — 3 long fingers radiating outward
      for (let f = 0; f < 3; f++) {
        const fingerAngle = side * (0.3 + f * 0.4);
        const fingerLen = 0.5 - f * 0.1;
        const fingerGeo = cyl(0.02, 0.012, fingerLen, 4);
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        const baseX = side * 1.1;
        const baseY = -0.75;
        finger.position.set(
          baseX + Math.sin(fingerAngle) * fingerLen * 0.5,
          baseY - Math.cos(fingerAngle) * fingerLen * 0.5,
          0.0,
        );
        finger.rotation.z = fingerAngle;
        wing.add(finger);
      }

      // Wing membrane — main panel
      const membraneGeo = new THREE.PlaneGeometry(1.2, 1.0, 1, 1);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 0.8, -0.5, 0.0);
      membrane.scale.set(side * 1, 1, 1);
      wing.add(membrane);

      // Lower membrane — connects wing to body
      const lowerMemGeo = new THREE.PlaneGeometry(0.7, 0.6, 1, 1);
      const lowerMem = new THREE.Mesh(lowerMemGeo, membraneMat);
      lowerMem.position.set(side * 0.4, -0.6, 0.0);
      lowerMem.scale.set(side * 1, 1, 1);
      wing.add(lowerMem);

      // Wing veins — thin dark cylinders across membrane
      for (let v = 0; v < 4; v++) {
        const veinLen = 0.6 + v * 0.15;
        const veinGeo = cyl(0.008, 0.005, veinLen, 3);
        const vein = new THREE.Mesh(veinGeo, veinMat);
        const veinAngle = side * (0.2 + v * 0.35);
        vein.position.set(
          side * (0.5 + v * 0.15),
          -0.3 - v * 0.12,
          0.005,
        );
        vein.rotation.z = veinAngle;
        wing.add(vein);
      }

      // Cross veins — horizontal connections between main veins
      for (let cv = 0; cv < 3; cv++) {
        const crossVeinGeo = cyl(0.005, 0.005, 0.3 + cv * 0.1, 3);
        const crossVein = new THREE.Mesh(crossVeinGeo, veinMat);
        crossVein.position.set(side * (0.6 + cv * 0.1), -0.35 - cv * 0.2, 0.005);
        crossVein.rotation.z = Math.PI / 2;
        wing.add(crossVein);
      }

      // Wing claw — small hook at the wing's wrist
      const wingClawGeo = new THREE.ConeGeometry(0.015, 0.06, 4);
      const wingClaw = new THREE.Mesh(wingClawGeo, clawMat);
      wingClaw.position.set(side * 0.55, 0.05, 0.0);
      wingClaw.rotation.z = side * 0.5;
      wing.add(wingClaw);
    }

    // ---- Legs — clawed, digitigrade ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.2, 1.3, 0.0);
      this._body.add(leg);

      // Thigh — lean but muscular
      const thighGeo = cyl(0.1, 0.08, 0.55, 6);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.28;
      leg.add(thigh);

      // Shin — thin, angled forward (digitigrade stance)
      const shinGeo = cyl(0.07, 0.05, 0.5, 6);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.set(0, -0.7, 0.08);
      shin.rotation.x = -0.2;
      leg.add(shin);

      // Ankle joint
      const ankleGeo = new THREE.SphereGeometry(0.055, 5, 5);
      const ankle = new THREE.Mesh(ankleGeo, skinMat);
      ankle.position.set(0, -0.95, 0.12);
      leg.add(ankle);

      // Foot — elongated toe pad
      const footGeo = new THREE.SphereGeometry(1, 5, 4);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.08, 0.04, 0.14);
      foot.position.set(0, -1.02, 0.18);
      leg.add(foot);

      // Claws — 3 forward-pointing talons
      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.012, 0.07, 4);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.03, -1.04, 0.28);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);
      }

      // Rear talon
      const rearClawGeo = new THREE.ConeGeometry(0.01, 0.05, 4);
      const rearClaw = new THREE.Mesh(rearClawGeo, clawMat);
      rearClaw.position.set(0, -1.03, 0.06);
      rearClaw.rotation.x = -Math.PI / 2;
      leg.add(rearClaw);
    }

    // ---- Vestigial tail ----
    const tailGeo = cyl(0.04, 0.015, 0.35, 5);
    const tail = new THREE.Mesh(tailGeo, skinMat);
    tail.position.set(0, 1.4, -0.3);
    tail.rotation.x = -0.8;
    this._body.add(tail);

    // Tail tip — pointed
    const tailTipGeo = new THREE.ConeGeometry(0.018, 0.08, 4);
    const tailTip = new THREE.Mesh(tailTipGeo, darkSkinMat);
    tailTip.position.set(0, 1.2, -0.5);
    tailTip.rotation.x = Math.PI - 0.8;
    this._body.add(tailTip);
  }

  // ---- Earth Elemental builder ----------------------------------------------

  private _buildEarthElemental(): void {
    const stoneMat = mat(0x6b6355, { roughness: 0.95 });
    const darkStoneMat = mat(0x4a4a3a, { roughness: 1.0 });
    const mossMat = mat(0x4a6b3a, { roughness: 0.9 });
    const crystalMat = mat(0x44cc66, { emissive: 0x44cc66, emissiveIntensity: 0.8, roughness: 0.3 });
    const eyeMat = mat(0x55dd77, { emissive: 0x55dd77, emissiveIntensity: 1.0 });
    const boulderWeaponMat = mat(0x888888, { roughness: 0.9 });

    // ---- Torso — stacked overlapping boulders forming massive chest ----
    const mainTorsoGeo = new THREE.SphereGeometry(1, 10, 8);
    const mainTorso = new THREE.Mesh(mainTorsoGeo, stoneMat);
    mainTorso.scale.set(0.7, 0.85, 0.55);
    mainTorso.position.y = 2.5;
    this._body.add(mainTorso);

    // Upper chest boulder
    const upperChestGeo = new THREE.SphereGeometry(1, 8, 7);
    const upperChest = new THREE.Mesh(upperChestGeo, darkStoneMat);
    upperChest.scale.set(0.6, 0.45, 0.5);
    upperChest.position.set(0, 3.1, 0.1);
    this._body.add(upperChest);

    // Left shoulder ridge boulder
    const lShoulderRidgeGeo = new THREE.SphereGeometry(1, 7, 6);
    const lShoulderRidge = new THREE.Mesh(lShoulderRidgeGeo, stoneMat);
    lShoulderRidge.scale.set(0.3, 0.25, 0.3);
    lShoulderRidge.position.set(-0.55, 3.3, 0.0);
    this._body.add(lShoulderRidge);

    // Right shoulder ridge boulder
    const rShoulderRidgeGeo = new THREE.SphereGeometry(1, 7, 6);
    const rShoulderRidge = new THREE.Mesh(rShoulderRidgeGeo, stoneMat);
    rShoulderRidge.scale.set(0.3, 0.25, 0.3);
    rShoulderRidge.position.set(0.55, 3.3, 0.0);
    this._body.add(rShoulderRidge);

    // Lower belly boulder
    const bellyGeo = new THREE.SphereGeometry(1, 8, 6);
    const belly = new THREE.Mesh(bellyGeo, darkStoneMat);
    belly.scale.set(0.55, 0.45, 0.45);
    belly.position.set(0, 1.9, 0.12);
    this._body.add(belly);

    // Mid-back rock plate
    const backPlateGeo = new THREE.SphereGeometry(1, 7, 5);
    const backPlate = new THREE.Mesh(backPlateGeo, stoneMat);
    backPlate.scale.set(0.5, 0.4, 0.3);
    backPlate.position.set(0, 2.8, -0.35);
    this._body.add(backPlate);

    // Crystal veins on chest
    for (let i = 0; i < 4; i++) {
      const crystalGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 5, 5);
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.scale.set(1, 0.5 + Math.random() * 0.5, 0.6);
      crystal.position.set(
        -0.2 + Math.random() * 0.4,
        2.3 + Math.random() * 0.8,
        0.4 + Math.random() * 0.1,
      );
      crystal.rotation.z = Math.random() * Math.PI;
      this._body.add(crystal);
    }

    // ---- Head — rough boulder with glowing eyes ----
    this._head.position.set(0, 3.6, 0.2);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 8, 7);
    const headMesh = new THREE.Mesh(headGeo, stoneMat);
    headMesh.scale.set(0.3, 0.32, 0.28);
    this._head.add(headMesh);

    // Heavy brow ridge
    const browGeo = new THREE.SphereGeometry(1, 7, 4);
    const brow = new THREE.Mesh(browGeo, darkStoneMat);
    brow.scale.set(0.33, 0.1, 0.15);
    brow.position.set(0, 0.15, 0.15);
    this._head.add(brow);

    // Craggy forehead protrusion
    const foreheadGeo = new THREE.SphereGeometry(1, 6, 5);
    const forehead = new THREE.Mesh(foreheadGeo, darkStoneMat);
    forehead.scale.set(0.2, 0.15, 0.12);
    forehead.position.set(0, 0.25, 0.1);
    this._head.add(forehead);

    // Glowing green eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.12, 0.08, 0.24);
      this._head.add(eye);
    }

    // Jaw — craggy lower stones
    const jawGeo = new THREE.SphereGeometry(1, 6, 5);
    const jaw = new THREE.Mesh(jawGeo, darkStoneMat);
    jaw.scale.set(0.26, 0.14, 0.18);
    jaw.position.set(0, -0.15, 0.08);
    this._head.add(jaw);

    // Moss patch on head
    const headMossGeo = new THREE.SphereGeometry(0.08, 5, 5);
    const headMoss = new THREE.Mesh(headMossGeo, mossMat);
    headMoss.scale.set(1.5, 0.5, 1.0);
    headMoss.position.set(0.05, 0.3, -0.05);
    this._head.add(headMoss);

    // ---- Arms — segmented stone limbs ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.75, 3.2, 0.0);
      this._body.add(arm);

      // Shoulder boulder
      const shoulderGeo = new THREE.SphereGeometry(0.22, 7, 6);
      const shoulder = new THREE.Mesh(shoulderGeo, stoneMat);
      shoulder.scale.set(1.0, 0.85, 0.9);
      arm.add(shoulder);

      // Upper arm rock
      const upperGeo = cyl(0.16, 0.14, 0.7, 7);
      const upper = new THREE.Mesh(upperGeo, darkStoneMat);
      upper.position.y = -0.4;
      arm.add(upper);

      // Elbow boulder
      const elbowGeo = new THREE.SphereGeometry(0.15, 6, 5);
      const elbow = new THREE.Mesh(elbowGeo, stoneMat);
      elbow.position.y = -0.75;
      arm.add(elbow);

      // Forearm boulder
      const foreGeo = cyl(0.14, 0.12, 0.65, 7);
      const fore = new THREE.Mesh(foreGeo, darkStoneMat);
      fore.position.y = -1.15;
      arm.add(fore);

      // Fist — large rough sphere
      const fistGeo = new THREE.SphereGeometry(0.18, 7, 6);
      const fist = new THREE.Mesh(fistGeo, stoneMat);
      fist.scale.set(1.0, 0.9, 0.95);
      fist.position.y = -1.55;
      arm.add(fist);

      // Crystal vein on upper arm
      const armCrystalGeo = new THREE.SphereGeometry(0.03, 5, 5);
      const armCrystal = new THREE.Mesh(armCrystalGeo, crystalMat);
      armCrystal.position.set(side * 0.1, -0.5, 0.08);
      arm.add(armCrystal);

      // Moss on shoulder
      const shoulderMossGeo = new THREE.SphereGeometry(0.07, 5, 4);
      const shoulderMoss = new THREE.Mesh(shoulderMossGeo, mossMat);
      shoulderMoss.scale.set(1.3, 0.4, 1.0);
      shoulderMoss.position.set(0, 0.18, 0.05);
      arm.add(shoulderMoss);
    }

    // Massive boulder weapon in right hand
    const weaponBoulderGeo = new THREE.SphereGeometry(0.3, 8, 7);
    const weaponBoulder = new THREE.Mesh(weaponBoulderGeo, boulderWeaponMat);
    weaponBoulder.scale.set(1.0, 0.85, 0.9);
    weaponBoulder.position.y = -1.95;
    this._rightArm.add(weaponBoulder);

    // Smaller rocks on the weapon boulder surface
    for (let i = 0; i < 3; i++) {
      const chipGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 5, 4);
      const chip = new THREE.Mesh(chipGeo, darkStoneMat);
      const chipAngle = (i / 3) * Math.PI * 2;
      chip.position.set(
        Math.cos(chipAngle) * 0.2,
        -1.95 + Math.sin(chipAngle) * 0.15,
        Math.sin(chipAngle) * 0.2,
      );
      this._rightArm.add(chip);
    }

    // ---- Legs — thick stone pillars ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.5, 0.0);
      this._body.add(leg);

      // Upper thigh — thick stone pillar
      const thighGeo = cyl(0.22, 0.2, 0.75, 8);
      const thigh = new THREE.Mesh(thighGeo, stoneMat);
      thigh.position.y = -0.35;
      leg.add(thigh);

      // Knee boulder
      const kneeGeo = new THREE.SphereGeometry(0.18, 6, 5);
      const knee = new THREE.Mesh(kneeGeo, darkStoneMat);
      knee.position.y = -0.75;
      leg.add(knee);

      // Shin pillar
      const shinGeo = cyl(0.2, 0.16, 0.65, 8);
      const shin = new THREE.Mesh(shinGeo, stoneMat);
      shin.position.y = -1.15;
      leg.add(shin);

      // Foot — flat wide stone
      const footGeo = new THREE.SphereGeometry(1, 7, 5);
      const foot = new THREE.Mesh(footGeo, darkStoneMat);
      foot.scale.set(0.18, 0.08, 0.24);
      foot.position.set(0, -1.52, 0.06);
      leg.add(foot);

      // Craggy detail — small rock protrusions on shin
      for (let ci = 0; ci < 2; ci++) {
        const cragGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 5, 4);
        const crag = new THREE.Mesh(cragGeo, stoneMat);
        crag.position.set(
          side * (0.12 + Math.random() * 0.05),
          -0.9 - ci * 0.3,
          0.08,
        );
        leg.add(crag);
      }
    }

    // Moss patches on back and shoulders
    const mossPositions = [
      { x: 0.0, y: 3.0, z: -0.4 },
      { x: -0.3, y: 2.7, z: -0.3 },
      { x: 0.25, y: 3.2, z: -0.25 },
      { x: 0.0, y: 2.2, z: -0.35 },
    ];
    for (const pos of mossPositions) {
      const mGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 5, 4);
      const mMesh = new THREE.Mesh(mGeo, mossMat);
      mMesh.scale.set(1.4, 0.5, 1.2);
      mMesh.position.set(pos.x, pos.y, pos.z);
      this._body.add(mMesh);
    }

    // Rubble at base — small rock spheres near feet
    for (let ri = 0; ri < 5; ri++) {
      const rubbleGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 5, 4);
      const rubble = new THREE.Mesh(rubbleGeo, darkStoneMat);
      rubble.position.set(
        -0.4 + Math.random() * 0.8,
        -0.02,
        -0.3 + Math.random() * 0.6,
      );
      this._body.add(rubble);
    }
  }

  // ---- Battering Ram builder ------------------------------------------------

  private _buildBatteringRam(): void {
    const woodMat = mat(0x6b4226, { roughness: 0.85 });
    const ironMat = mat(0x3a3a3a, { roughness: 0.4, metalness: 0.5 });
    const ironHeadMat = mat(0x555555, { roughness: 0.3, metalness: 0.6 });
    const wheelMat = mat(0x4a3018, { roughness: 0.9 });
    const ropeMat = mat(0x8b7355, { roughness: 0.95 });

    // ---- Body — rectangular wooden frame ----
    const frameGeo = new THREE.BoxGeometry(1.2, 0.3, 2.4);
    const frame = new THREE.Mesh(frameGeo, woodMat);
    frame.position.set(0, 0.8, 0);
    this._body.add(frame);

    // Side rails — left and right
    for (const side of [-1, 1]) {
      const railGeo = new THREE.BoxGeometry(0.1, 0.8, 2.4);
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(side * 0.6, 1.2, 0);
      this._body.add(rail);
    }

    // Crossbeams on the frame
    for (let i = -1; i <= 1; i++) {
      const crossGeo = new THREE.BoxGeometry(1.2, 0.08, 0.08);
      const cross = new THREE.Mesh(crossGeo, woodMat);
      cross.position.set(0, 0.95, i * 0.9);
      this._body.add(cross);
    }

    // ---- Overhead A-frame canopy/roof ----
    // Vertical posts at front and back corners
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const postGeo = cyl(0.04, 0.04, 1.0, 6);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(side * 0.55, 1.6, fb * 1.0);
        this._body.add(post);
      }
    }

    // A-frame angled roof beams (left slope and right slope)
    for (const side of [-1, 1]) {
      const roofBeamGeo = new THREE.BoxGeometry(0.06, 0.06, 2.2);
      const roofBeam = new THREE.Mesh(roofBeamGeo, woodMat);
      roofBeam.position.set(side * 0.3, 2.25, 0);
      roofBeam.rotation.z = side * -0.45;
      this._body.add(roofBeam);
    }

    // Ridge beam along the top
    const ridgeGeo = new THREE.BoxGeometry(0.06, 0.06, 2.4);
    const ridge = new THREE.Mesh(ridgeGeo, woodMat);
    ridge.position.set(0, 2.35, 0);
    this._body.add(ridge);

    // Roof panels (angled planes forming A-frame)
    for (const side of [-1, 1]) {
      const roofPanelGeo = new THREE.PlaneGeometry(0.7, 2.3);
      const roofPanel = new THREE.Mesh(
        roofPanelGeo,
        mat(0x7b5230, { side: THREE.DoubleSide, roughness: 0.9 }),
      );
      roofPanel.position.set(side * 0.28, 2.2, 0);
      roofPanel.rotation.z = side * -0.45;
      this._body.add(roofPanel);
    }

    // Side shields (plane geometry along sides)
    for (const side of [-1, 1]) {
      const shieldGeo = new THREE.PlaneGeometry(2.2, 0.7);
      const shield = new THREE.Mesh(
        shieldGeo,
        mat(0x6b4226, { side: THREE.DoubleSide }),
      );
      shield.rotation.y = Math.PI / 2;
      shield.position.set(side * 0.62, 1.5, 0);
      this._body.add(shield);
    }

    // Iron bands across the frame (thin dark cylinders)
    for (let i = -1; i <= 1; i++) {
      const bandGeo = new THREE.BoxGeometry(1.24, 0.04, 0.04);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.position.set(0, 0.82, i * 0.8);
      this._body.add(band);
    }

    // ---- The ram — on _rightArm so it swings for attack ----
    this._rightArm.position.set(0, 1.0, 0);
    this._body.add(this._rightArm);

    // Ram beam — long horizontal cylinder
    const ramBeamGeo = cyl(0.1, 0.1, 2.8, 8);
    const ramBeam = new THREE.Mesh(ramBeamGeo, woodMat);
    ramBeam.rotation.x = Math.PI / 2;
    ramBeam.position.set(0, 0.0, 1.5);
    this._rightArm.add(ramBeam);

    // Iron-banded ram head (tip)
    const ramHeadGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const ramHead = new THREE.Mesh(ramHeadGeo, ironHeadMat);
    ramHead.scale.set(0.8, 0.8, 1.3);
    ramHead.position.set(0, 0.0, 2.9);
    this._rightArm.add(ramHead);

    // Iron cap ring behind ram head
    const capGeo = cyl(0.18, 0.18, 0.06, 10);
    const capMesh = new THREE.Mesh(capGeo, ironMat);
    capMesh.rotation.x = Math.PI / 2;
    capMesh.position.set(0, 0.0, 2.6);
    this._rightArm.add(capMesh);

    // Iron bands along the ram beam
    for (let i = 0; i < 4; i++) {
      const rBandGeo = cyl(0.12, 0.12, 0.04, 8);
      const rBand = new THREE.Mesh(rBandGeo, ironMat);
      rBand.rotation.x = Math.PI / 2;
      rBand.position.set(0, 0.0, 0.6 + i * 0.55);
      this._rightArm.add(rBand);
    }

    // Rope hangers (suspension ropes from frame to ram)
    for (const zOff of [-0.4, 0.4]) {
      const ropeGeo = cyl(0.015, 0.015, 0.6, 4);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(0, 0.3, 1.0 + zOff);
      this._rightArm.add(rope);
    }

    // _leftArm — empty, just position it
    this._leftArm.position.set(0, 1.0, 0);
    this._body.add(this._leftArm);

    // ---- Wheels — _leftLeg for left pair, _rightLeg for right pair ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.7, 0.4, 0);
      this._body.add(leg);

      // Two wheels per side (front and back)
      for (const fb of [-1, 1]) {
        // Wheel disc (cylinder)
        const wheelGeo = cyl(0.35, 0.35, 0.08, 12);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, -0.05, fb * 0.75);
        leg.add(wheel);

        // Iron rim
        const rimGeo = cyl(0.37, 0.37, 0.04, 14);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, -0.05, fb * 0.75);
        leg.add(rim);

        // Hub
        const hubGeo = cyl(0.06, 0.06, 0.1, 8);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(0, -0.05, fb * 0.75);
        leg.add(hub);

        // Spokes
        for (let s = 0; s < 4; s++) {
          const spokeGeo = new THREE.BoxGeometry(0.03, 0.28, 0.03);
          const spoke = new THREE.Mesh(spokeGeo, wheelMat);
          spoke.position.set(0, -0.05, fb * 0.75);
          spoke.rotation.z = Math.PI / 2;
          spoke.rotation.x = (s / 4) * Math.PI;
          leg.add(spoke);
        }
      }

      // Axle connecting front and back wheels
      const axleGeo = cyl(0.03, 0.03, 1.5, 6);
      const axle = new THREE.Mesh(axleGeo, ironMat);
      axle.rotation.x = Math.PI / 2;
      axle.position.set(0, -0.05, 0);
      leg.add(axle);
    }

    // Small pennant/flag on top
    const flagPoleGeo = cyl(0.015, 0.015, 0.5, 4);
    const flagPole = new THREE.Mesh(flagPoleGeo, ironMat);
    flagPole.position.set(0, 2.6, -0.8);
    this._body.add(flagPole);

    const flagGeo = new THREE.PlaneGeometry(0.25, 0.15);
    const flag = new THREE.Mesh(
      flagGeo,
      mat(0xaa2222, { side: THREE.DoubleSide }),
    );
    flag.position.set(0.13, 2.75, -0.8);
    this._body.add(flag);
  }

  // ---- Catapult builder -----------------------------------------------------

  private _buildCatapult(): void {
    const woodMat = mat(0x7b5230, { roughness: 0.85 });
    const ropeMat = mat(0x8b7355, { roughness: 0.95 });
    const ironMat = mat(0x444444, { roughness: 0.4, metalness: 0.5 });
    const boulderMat = mat(0x888888, { roughness: 0.95 });
    const darkWoodMat = mat(0x5a3a1e, { roughness: 0.9 });

    // ---- Body — sturdy wooden base frame ----
    const baseGeo = new THREE.BoxGeometry(1.4, 0.25, 2.0);
    const baseMesh = new THREE.Mesh(baseGeo, woodMat);
    baseMesh.position.set(0, 0.6, 0);
    this._body.add(baseMesh);

    // Side beams (raised rails for the arm track)
    for (const side of [-1, 1]) {
      const sideBeamGeo = new THREE.BoxGeometry(0.12, 0.5, 2.0);
      const sideBeam = new THREE.Mesh(sideBeamGeo, woodMat);
      sideBeam.position.set(side * 0.6, 0.85, 0);
      this._body.add(sideBeam);
    }

    // Crossbeams for structural support
    for (let i = -1; i <= 1; i++) {
      const crossGeo = new THREE.BoxGeometry(1.2, 0.08, 0.1);
      const cross = new THREE.Mesh(crossGeo, woodMat);
      cross.position.set(0, 0.55, i * 0.8);
      this._body.add(cross);
    }

    // Vertical pivot uprights (the A-frame that holds the pivot)
    for (const side of [-1, 1]) {
      const uprightGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
      const upright = new THREE.Mesh(uprightGeo, darkWoodMat);
      upright.position.set(side * 0.45, 1.5, 0);
      upright.rotation.z = side * -0.1; // slight angle inward
      this._body.add(upright);
    }

    // Pivot crossbar at top of uprights
    const pivotBarGeo = cyl(0.05, 0.05, 1.0, 8);
    const pivotBar = new THREE.Mesh(pivotBarGeo, ironMat);
    pivotBar.rotation.z = Math.PI / 2;
    pivotBar.position.set(0, 2.0, 0);
    this._body.add(pivotBar);

    // Support struts (diagonal braces from base to uprights)
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const strutGeo = new THREE.BoxGeometry(0.05, 0.8, 0.05);
        const strut = new THREE.Mesh(strutGeo, woodMat);
        strut.position.set(side * 0.4, 1.1, fb * 0.25);
        strut.rotation.z = side * 0.35;
        strut.rotation.x = fb * -0.2;
        this._body.add(strut);
      }
    }

    // Winch mechanism at base (small cylinder)
    const winchGeo = cyl(0.08, 0.08, 0.6, 8);
    const winch = new THREE.Mesh(winchGeo, darkWoodMat);
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, 0.65, -0.75);
    this._body.add(winch);

    // Winch handles
    for (const side of [-1, 1]) {
      const handleGeo = cyl(0.02, 0.02, 0.2, 4);
      const handle = new THREE.Mesh(handleGeo, ironMat);
      handle.position.set(side * 0.35, 0.65, -0.75);
      handle.rotation.z = Math.PI / 2;
      this._body.add(handle);
    }

    // ---- Throwing arm — on _rightArm for attack animation ----
    this._rightArm.position.set(0, 2.0, 0);
    this._body.add(this._rightArm);

    // Long beam
    const armBeamGeo = new THREE.BoxGeometry(0.1, 0.12, 3.0);
    const armBeam = new THREE.Mesh(armBeamGeo, darkWoodMat);
    armBeam.position.set(0, 0.0, 0.8);
    this._rightArm.add(armBeam);

    // Iron pivot sleeve
    const sleeveGeo = cyl(0.08, 0.08, 0.15, 8);
    const sleeve = new THREE.Mesh(sleeveGeo, ironMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(0, 0.0, 0);
    this._rightArm.add(sleeve);

    // Sling/basket at the tip
    const basketGeo = new THREE.SphereGeometry(0.15, 6, 4);
    const basket = new THREE.Mesh(basketGeo, ropeMat);
    basket.scale.set(1.0, 0.5, 1.0);
    basket.position.set(0, -0.08, 2.2);
    this._rightArm.add(basket);

    // Boulder in the basket
    const boulderGeo = new THREE.SphereGeometry(0.12, 7, 6);
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.position.set(0, 0.02, 2.2);
    this._rightArm.add(boulder);

    // Sling ropes from arm tip to basket
    for (const side of [-1, 1]) {
      const slingRopeGeo = cyl(0.012, 0.012, 0.35, 4);
      const slingRope = new THREE.Mesh(slingRopeGeo, ropeMat);
      slingRope.position.set(side * 0.06, -0.04, 2.05);
      slingRope.rotation.x = 0.3;
      this._rightArm.add(slingRope);
    }

    // Rope from winch to short end of arm
    const winchRopeGeo = cyl(0.015, 0.015, 1.2, 4);
    const winchRope = new THREE.Mesh(winchRopeGeo, ropeMat);
    winchRope.position.set(0, -0.6, -0.5);
    winchRope.rotation.x = 0.2;
    this._rightArm.add(winchRope);

    // Short end hook/latch
    const hookGeo = cyl(0.03, 0.02, 0.15, 5);
    const hook = new THREE.Mesh(hookGeo, ironMat);
    hook.position.set(0, -0.08, -0.7);
    this._rightArm.add(hook);

    // _leftArm — unused, just position
    this._leftArm.position.set(0, 2.0, 0);
    this._body.add(this._leftArm);

    // ---- Wheels — _leftLeg left wheel, _rightLeg right wheel ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.75, 0.4, 0);
      this._body.add(leg);

      // Main wheel disc
      const wheelGeo = cyl(0.4, 0.4, 0.1, 14);
      const wheel = new THREE.Mesh(wheelGeo, darkWoodMat);
      wheel.rotation.z = Math.PI / 2;
      leg.add(wheel);

      // Iron rim
      const rimGeo = cyl(0.42, 0.42, 0.05, 16);
      const rim = new THREE.Mesh(rimGeo, ironMat);
      rim.rotation.z = Math.PI / 2;
      leg.add(rim);

      // Hub
      const hubGeo = cyl(0.06, 0.06, 0.12, 8);
      const hub = new THREE.Mesh(hubGeo, ironMat);
      hub.rotation.z = Math.PI / 2;
      leg.add(hub);

      // Spokes
      for (let s = 0; s < 6; s++) {
        const spokeGeo = new THREE.BoxGeometry(0.03, 0.34, 0.03);
        const spoke = new THREE.Mesh(spokeGeo, darkWoodMat);
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.x = (s / 6) * Math.PI;
        leg.add(spoke);
      }

      // Axle stub connecting to frame
      const axleGeo = cyl(0.03, 0.03, 0.2, 6);
      const axle = new THREE.Mesh(axleGeo, ironMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(-side * 0.1, 0, 0);
      leg.add(axle);
    }
  }

  // ---- Trebuchet builder ----------------------------------------------------

  private _buildTrebuchet(): void {
    const woodMat = mat(0x6b4226, { roughness: 0.85 });
    const darkWoodMat = mat(0x4a2e15, { roughness: 0.9 });
    const ironMat = mat(0x333333, { roughness: 0.35, metalness: 0.5 });
    const counterweightMat = mat(0x555555, { roughness: 0.6, metalness: 0.3 });
    const ropeMat = mat(0x998866, { roughness: 0.95 });
    const boulderMat = mat(0x777777, { roughness: 0.95 });

    // ---- Body — wide wooden base platform ----
    const basePlatformGeo = new THREE.BoxGeometry(2.0, 0.2, 3.0);
    const basePlatform = new THREE.Mesh(basePlatformGeo, woodMat);
    basePlatform.position.set(0, 0.5, 0);
    this._body.add(basePlatform);

    // Secondary cross-planks on base
    for (let i = -1; i <= 1; i++) {
      const plankGeo = new THREE.BoxGeometry(2.0, 0.08, 0.12);
      const plank = new THREE.Mesh(plankGeo, darkWoodMat);
      plank.position.set(0, 0.42, i * 1.1);
      this._body.add(plank);
    }

    // ---- Tall A-frame tower structure ----
    // Two angled beams meeting at top (left and right)
    for (const side of [-1, 1]) {
      const towerBeamGeo = new THREE.BoxGeometry(0.14, 3.8, 0.14);
      const towerBeam = new THREE.Mesh(towerBeamGeo, darkWoodMat);
      towerBeam.position.set(side * 0.35, 2.5, 0);
      towerBeam.rotation.z = side * -0.09; // slight inward angle
      this._body.add(towerBeam);
    }

    // Crossbar at top of A-frame
    const topCrossbarGeo = new THREE.BoxGeometry(0.9, 0.12, 0.12);
    const topCrossbar = new THREE.Mesh(topCrossbarGeo, darkWoodMat);
    topCrossbar.position.set(0, 4.3, 0);
    this._body.add(topCrossbar);

    // Mid crossbar for bracing
    const midCrossbarGeo = new THREE.BoxGeometry(0.7, 0.08, 0.08);
    const midCrossbar = new THREE.Mesh(midCrossbarGeo, woodMat);
    midCrossbar.position.set(0, 2.6, 0);
    this._body.add(midCrossbar);

    // Lower crossbar
    const lowCrossbarGeo = new THREE.BoxGeometry(0.85, 0.08, 0.08);
    const lowCrossbar = new THREE.Mesh(lowCrossbarGeo, woodMat);
    lowCrossbar.position.set(0, 1.2, 0);
    this._body.add(lowCrossbar);

    // Diagonal braces from base to tower beams (front and back)
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const braceGeo = new THREE.BoxGeometry(0.06, 1.6, 0.06);
        const brace = new THREE.Mesh(braceGeo, woodMat);
        brace.position.set(side * 0.5, 1.5, fb * 0.5);
        brace.rotation.z = side * 0.3;
        brace.rotation.x = fb * -0.15;
        this._body.add(brace);
      }
    }

    // Pivot axle at top of tower
    const pivotAxleGeo = cyl(0.06, 0.06, 1.0, 8);
    const pivotAxle = new THREE.Mesh(pivotAxleGeo, ironMat);
    pivotAxle.rotation.z = Math.PI / 2;
    pivotAxle.position.set(0, 4.3, 0);
    this._body.add(pivotAxle);

    // Iron pivot brackets
    for (const side of [-1, 1]) {
      const bracketGeo = new THREE.BoxGeometry(0.04, 0.2, 0.12);
      const bracket = new THREE.Mesh(bracketGeo, ironMat);
      bracket.position.set(side * 0.35, 4.35, 0);
      this._body.add(bracket);
    }

    // ---- Throwing arm — on _rightArm: long beam with counterweight and sling ----
    this._rightArm.position.set(0, 4.3, 0);
    this._body.add(this._rightArm);

    // Main throwing beam (long arm)
    const throwBeamGeo = new THREE.BoxGeometry(0.12, 0.14, 4.5);
    const throwBeam = new THREE.Mesh(throwBeamGeo, darkWoodMat);
    throwBeam.position.set(0, 0.0, 0.5); // offset so short end is behind pivot
    this._rightArm.add(throwBeam);

    // Iron sleeve at pivot point
    const pivotSleeveGeo = cyl(0.1, 0.1, 0.18, 8);
    const pivotSleeve = new THREE.Mesh(pivotSleeveGeo, ironMat);
    pivotSleeve.rotation.z = Math.PI / 2;
    pivotSleeve.position.set(0, 0, 0);
    this._rightArm.add(pivotSleeve);

    // ---- Counterweight on the short end (negative z) ----
    const cwBoxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const cwBox = new THREE.Mesh(cwBoxGeo, counterweightMat);
    cwBox.position.set(0, -0.3, -1.5);
    this._rightArm.add(cwBox);

    // Counterweight iron bands
    for (let ci = 0; ci < 2; ci++) {
      const cwBandGeo = new THREE.BoxGeometry(0.54, 0.04, 0.54);
      const cwBand = new THREE.Mesh(cwBandGeo, ironMat);
      cwBand.position.set(0, -0.15 + ci * 0.3, -1.5);
      this._rightArm.add(cwBand);
    }

    // Counterweight hanging chains (short cylinders)
    for (const side of [-1, 1]) {
      const chainGeo = cyl(0.02, 0.02, 0.25, 4);
      const chain = new THREE.Mesh(chainGeo, ironMat);
      chain.position.set(side * 0.15, -0.08, -1.5);
      this._rightArm.add(chain);
    }

    // ---- Sling on the long end (positive z) ----
    // Sling ropes
    for (const side of [-1, 1]) {
      const slingGeo = cyl(0.012, 0.012, 0.8, 4);
      const sling = new THREE.Mesh(slingGeo, ropeMat);
      sling.position.set(side * 0.06, -0.35, 2.5);
      sling.rotation.x = 0.2;
      this._rightArm.add(sling);
    }

    // Sling pouch
    const pouchGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const pouch = new THREE.Mesh(pouchGeo, ropeMat);
    pouch.scale.set(1.2, 0.4, 1.2);
    pouch.position.set(0, -0.7, 2.7);
    this._rightArm.add(pouch);

    // Boulder in sling
    const boulderGeo = new THREE.SphereGeometry(0.14, 7, 6);
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.position.set(0, -0.6, 2.7);
    this._rightArm.add(boulder);

    // _leftArm — unused
    this._leftArm.position.set(0, 4.3, 0);
    this._body.add(this._leftArm);

    // ---- Support guy ropes (thin cylinders at angles from tower to base) ----
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const guyGeo = cyl(0.012, 0.012, 2.8, 4);
        const guy = new THREE.Mesh(guyGeo, ropeMat);
        guy.position.set(side * 0.5, 2.4, fb * 1.0);
        guy.rotation.z = side * 0.4;
        guy.rotation.x = fb * -0.3;
        this._body.add(guy);
      }
    }

    // ---- Winch drum at base ----
    const winchDrumGeo = cyl(0.1, 0.1, 0.8, 8);
    const winchDrum = new THREE.Mesh(winchDrumGeo, darkWoodMat);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(0, 0.65, -1.2);
    this._body.add(winchDrum);

    // Winch handles
    for (const side of [-1, 1]) {
      const handleGeo = cyl(0.02, 0.02, 0.25, 4);
      const handle = new THREE.Mesh(handleGeo, ironMat);
      handle.position.set(side * 0.5, 0.65, -1.2);
      this._body.add(handle);
    }

    // Rope from winch up to arm
    const winchRopeGeo = cyl(0.015, 0.015, 3.2, 4);
    const winchRope = new THREE.Mesh(winchRopeGeo, ropeMat);
    winchRope.position.set(0, 2.5, -0.8);
    winchRope.rotation.x = 0.15;
    this._body.add(winchRope);

    // Iron fittings on the base corners
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const fittingGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const fitting = new THREE.Mesh(fittingGeo, ironMat);
        fitting.position.set(side * 0.9, 0.6, fb * 1.35);
        this._body.add(fitting);
      }
    }

    // ---- Wheels at base corners ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.9, 0.35, 0);
      this._body.add(leg);

      // Two wheels per side (front and back)
      for (const fb of [-1, 1]) {
        // Wheel disc
        const wheelGeo = cyl(0.35, 0.35, 0.1, 12);
        const wheel = new THREE.Mesh(wheelGeo, woodMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0, fb * 1.15);
        leg.add(wheel);

        // Iron rim
        const rimGeo = cyl(0.37, 0.37, 0.05, 14);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, 0, fb * 1.15);
        leg.add(rim);

        // Hub
        const hubGeo = cyl(0.06, 0.06, 0.12, 8);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(0, 0, fb * 1.15);
        leg.add(hub);

        // Spokes
        for (let s = 0; s < 5; s++) {
          const spokeGeo = new THREE.BoxGeometry(0.03, 0.28, 0.03);
          const spoke = new THREE.Mesh(spokeGeo, woodMat);
          spoke.rotation.z = Math.PI / 2;
          spoke.rotation.x = (s / 5) * Math.PI;
          spoke.position.set(0, 0, fb * 1.15);
          leg.add(spoke);
        }
      }

      // Axle connecting front and back wheels
      const axleGeo = cyl(0.035, 0.035, 2.3, 6);
      const axle = new THREE.Mesh(axleGeo, ironMat);
      axle.rotation.x = Math.PI / 2;
      axle.position.set(0, 0, 0);
      leg.add(axle);
    }
  }

  // ---- Ballista builder ----------------------------------------------------

  private _buildBallista(): void {
    const woodMat = mat(0x7b5230);
    const ironMat = mat(0x444444, { metalness: 0.6, roughness: 0.4 });
    const boltShaftMat = mat(0x5a4020);
    const boltHeadMat = mat(0x555555, { metalness: 0.5 });
    const stringMat = mat(0x8b7355);
    const wheelMat = mat(0x4a3018);

    // ---- Body: wooden frame / carriage ----
    const frameGeo = new THREE.BoxGeometry(1.4, 0.3, 0.8);
    const frame = new THREE.Mesh(frameGeo, woodMat);
    frame.position.set(0, 0.6, 0);
    this._body.add(frame);

    // Side rails of the carriage
    for (const side of [-1, 1]) {
      const railGeo = new THREE.BoxGeometry(1.6, 0.15, 0.08);
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(0, 0.72, side * 0.38);
      this._body.add(rail);
    }

    // Iron reinforcement bands on frame (3 bands)
    for (let i = -1; i <= 1; i++) {
      const bandGeo = cyl(0.42, 0.42, 0.04, 12);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(i * 0.45, 0.6, 0);
      this._body.add(band);
    }

    // Central channel / rail for the bolt (long narrow box on top)
    const channelGeo = new THREE.BoxGeometry(1.5, 0.08, 0.12);
    const channel = new THREE.Mesh(channelGeo, woodMat);
    channel.position.set(0.05, 0.82, 0);
    this._body.add(channel);

    // Channel side lips
    for (const side of [-1, 1]) {
      const lipGeo = new THREE.BoxGeometry(1.5, 0.06, 0.02);
      const lip = new THREE.Mesh(lipGeo, ironMat);
      lip.position.set(0.05, 0.85, side * 0.07);
      this._body.add(lip);
    }

    // Giant bolt loaded in channel
    const boltGeo = cyl(0.025, 0.025, 1.3, 6);
    const bolt = new THREE.Mesh(boltGeo, boltShaftMat);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.15, 0.87, 0);
    this._body.add(bolt);

    // Bolt head — iron cone tip
    const boltTipGeo = new THREE.ConeGeometry(0.05, 0.18, 6);
    const boltTip = new THREE.Mesh(boltTipGeo, boltHeadMat);
    boltTip.rotation.z = -Math.PI / 2;
    boltTip.position.set(0.9, 0.87, 0);
    this._body.add(boltTip);

    // Bolt flights (fins at rear)
    for (const side of [-1, 1]) {
      const flightGeo = new THREE.PlaneGeometry(0.12, 0.06);
      const flight = new THREE.Mesh(flightGeo, mat(0x8b6040));
      flight.position.set(-0.45, 0.87, side * 0.03);
      flight.rotation.y = side * 0.3;
      this._body.add(flight);
    }
    // Top and bottom flights
    for (const vside of [-1, 1]) {
      const flightGeo = new THREE.PlaneGeometry(0.12, 0.06);
      const flight = new THREE.Mesh(flightGeo, mat(0x8b6040));
      flight.position.set(-0.45, 0.87 + vside * 0.03, 0);
      flight.rotation.x = Math.PI / 2;
      this._body.add(flight);
    }

    // Pivot mechanism — small cylinder joint under channel
    const pivotGeo = cyl(0.06, 0.06, 0.15, 8);
    const pivot = new THREE.Mesh(pivotGeo, ironMat);
    pivot.position.set(-0.1, 0.72, 0);
    this._body.add(pivot);

    // Pivot base plate
    const pivotBaseGeo = cyl(0.1, 0.1, 0.03, 8);
    const pivotBase = new THREE.Mesh(pivotBaseGeo, ironMat);
    pivotBase.position.set(-0.1, 0.62, 0);
    this._body.add(pivotBase);

    // Bowstring — thin cylinder connecting the two arm tips, passes through body
    const bowstringGeo = cyl(0.008, 0.008, 1.6, 4);
    const bowstring = new THREE.Mesh(bowstringGeo, stringMat);
    bowstring.rotation.x = Math.PI / 2;
    bowstring.position.set(0.4, 0.87, 0);
    this._body.add(bowstring);

    // Small toolbox / bolt quiver on side
    const quiverGeo = new THREE.BoxGeometry(0.3, 0.2, 0.12);
    const quiver = new THREE.Mesh(quiverGeo, woodMat);
    quiver.position.set(-0.35, 0.55, 0.5);
    this._body.add(quiver);

    // Extra bolts in quiver
    for (let i = 0; i < 3; i++) {
      const extraBoltGeo = cyl(0.015, 0.015, 0.35, 4);
      const extraBolt = new THREE.Mesh(extraBoltGeo, boltShaftMat);
      extraBolt.rotation.z = Math.PI / 2;
      extraBolt.position.set(-0.35 + i * 0.06, 0.65, 0.5);
      this._body.add(extraBolt);
    }

    // Iron axle through body
    const axleGeo = cyl(0.035, 0.035, 1.2, 8);
    const axle = new THREE.Mesh(axleGeo, ironMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(-0.3, 0.35, 0);
    this._body.add(axle);

    // ---- Arms: bow limbs (flex during attack) ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(0.55, 0.82, side * 0.4);
      this._body.add(arm);

      // Main bow limb — angled beam
      const limbGeo = new THREE.BoxGeometry(0.06, 0.6, 0.05);
      const limb = new THREE.Mesh(limbGeo, woodMat);
      limb.position.set(0, side * 0.3, 0);
      limb.rotation.x = side * 0.3;
      arm.add(limb);

      // Curved tip of bow limb
      const tipGeo = new THREE.BoxGeometry(0.05, 0.2, 0.04);
      const tip = new THREE.Mesh(tipGeo, woodMat);
      tip.position.set(0, side * 0.6, side * 0.1);
      tip.rotation.x = side * 0.6;
      arm.add(tip);

      // Iron cap at limb tip
      const capGeo = cyl(0.035, 0.035, 0.04, 6);
      const cap = new THREE.Mesh(capGeo, ironMat);
      cap.position.set(0, side * 0.72, side * 0.15);
      arm.add(cap);

      // Iron reinforcement wraps on limb
      for (let b = 0; b < 2; b++) {
        const wrapGeo = cyl(0.04, 0.04, 0.02, 6);
        const wrap = new THREE.Mesh(wrapGeo, ironMat);
        wrap.position.set(0, side * (0.15 + b * 0.25), side * b * 0.04);
        arm.add(wrap);
      }
    }

    // ---- Legs: spoked wooden wheels ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(-0.3, 0.35, side * 0.55);
      this._body.add(leg);

      // Wheel rim
      const rimGeo = cyl(0.35, 0.35, 0.06, 16);
      const rim = new THREE.Mesh(rimGeo, wheelMat);
      rim.rotation.x = Math.PI / 2;
      leg.add(rim);

      // Iron tire band
      const tireGeo = cyl(0.37, 0.37, 0.04, 16);
      const tire = new THREE.Mesh(tireGeo, ironMat);
      tire.rotation.x = Math.PI / 2;
      leg.add(tire);

      // Hub
      const hubGeo = cyl(0.06, 0.06, 0.08, 8);
      const hub = new THREE.Mesh(hubGeo, ironMat);
      hub.rotation.x = Math.PI / 2;
      leg.add(hub);

      // Spokes (8 spokes radiating out)
      for (let s = 0; s < 8; s++) {
        const angle = (s / 8) * Math.PI * 2;
        const spokeGeo = cyl(0.015, 0.015, 0.3, 4);
        const spoke = new THREE.Mesh(spokeGeo, wheelMat);
        spoke.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0);
        spoke.rotation.z = angle + Math.PI / 2;
        leg.add(spoke);
      }
    }

    // Head group unused for ballista — keep empty at origin
    this._head.position.set(0, 0.9, 0);
    this._body.add(this._head);
  }

  // ---- Cannon builder ------------------------------------------------------

  private _buildCannon(): void {
    const bronzeMat = mat(0x8b6914, { metalness: 0.7, roughness: 0.3 });
    const darkIronMat = mat(0x333333, { metalness: 0.6, roughness: 0.35 });
    const woodMat = mat(0x5a3a1a);
    const wheelMat = mat(0x4a3018);
    const cannonballMat = mat(0x222222, { metalness: 0.4, roughness: 0.5 });
    const ropeMat = mat(0x998866);

    // ---- Body: wooden gun carriage / base ----
    const carriageGeo = new THREE.BoxGeometry(1.2, 0.25, 0.7);
    const carriage = new THREE.Mesh(carriageGeo, woodMat);
    carriage.position.set(0, 0.55, 0);
    this._body.add(carriage);

    // Angled cheek pieces (side walls that hold the barrel)
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.BoxGeometry(1.0, 0.4, 0.06);
      const cheek = new THREE.Mesh(cheekGeo, woodMat);
      cheek.position.set(0.05, 0.72, side * 0.28);
      this._body.add(cheek);

      // Top taper of cheek — angled upward at front
      const taperGeo = new THREE.BoxGeometry(0.5, 0.15, 0.06);
      const taper = new THREE.Mesh(taperGeo, woodMat);
      taper.position.set(0.3, 0.9, side * 0.28);
      taper.rotation.z = -0.15;
      this._body.add(taper);
    }

    // Rear transom (back plate)
    const transomGeo = new THREE.BoxGeometry(0.06, 0.35, 0.56);
    const transom = new THREE.Mesh(transomGeo, woodMat);
    transom.position.set(-0.5, 0.7, 0);
    this._body.add(transom);

    // Trail (the tail that drags on ground for recoil)
    const trailGeo = new THREE.BoxGeometry(0.6, 0.1, 0.3);
    const trail = new THREE.Mesh(trailGeo, woodMat);
    trail.position.set(-0.85, 0.42, 0);
    this._body.add(trail);

    // Trail end plate (ground contact)
    const trailEndGeo = new THREE.BoxGeometry(0.08, 0.2, 0.35);
    const trailEnd = new THREE.Mesh(trailEndGeo, darkIronMat);
    trailEnd.position.set(-1.15, 0.38, 0);
    this._body.add(trailEnd);

    // Iron axle connecting wheels
    const axleGeo = cyl(0.04, 0.04, 1.1, 8);
    const axle = new THREE.Mesh(axleGeo, darkIronMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(0.1, 0.4, 0);
    this._body.add(axle);

    // Elevation wedge under barrel rear
    const wedgeGeo = new THREE.BoxGeometry(0.15, 0.12, 0.15);
    const wedge = new THREE.Mesh(wedgeGeo, woodMat);
    wedge.position.set(-0.2, 0.75, 0);
    this._body.add(wedge);

    // Small pile of cannonballs beside carriage (pyramid of 4)
    const ballPositions = [
      [0.45, 0.15, 0.55],
      [0.55, 0.15, 0.5],
      [0.5, 0.15, 0.6],
      [0.5, 0.25, 0.55],
    ] as const;
    for (const [bx, by, bz] of ballPositions) {
      const ballGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const ball = new THREE.Mesh(ballGeo, cannonballMat);
      ball.position.set(bx, by, bz);
      this._body.add(ball);
    }

    // Powder barrel nearby
    const powderBarrelGeo = cyl(0.08, 0.08, 0.18, 8);
    const powderBarrel = new THREE.Mesh(powderBarrelGeo, mat(0x4a3018));
    powderBarrel.position.set(-0.6, 0.2, 0.5);
    this._body.add(powderBarrel);

    // Powder barrel bands
    for (const yOff of [-0.05, 0.05]) {
      const pbBandGeo = cyl(0.085, 0.085, 0.015, 8);
      const pbBand = new THREE.Mesh(pbBandGeo, darkIronMat);
      pbBand.position.set(-0.6, 0.2 + yOff, 0.5);
      this._body.add(pbBand);
    }

    // Fuse / linstock — angled stick with slow-match
    const linstockGeo = cyl(0.012, 0.012, 0.5, 4);
    const linstock = new THREE.Mesh(linstockGeo, mat(0x6b5230));
    linstock.position.set(-0.7, 0.5, 0.35);
    linstock.rotation.z = 0.3;
    linstock.rotation.x = -0.2;
    this._body.add(linstock);

    // Slow-match tip (glowing ember)
    const matchGeo = new THREE.SphereGeometry(0.02, 5, 5);
    const matchMesh = new THREE.Mesh(matchGeo, mat(0xff4400, { emissive: 0x882200 }));
    matchMesh.position.set(-0.58, 0.72, 0.3);
    this._body.add(matchMesh);

    // Rope coil detail on carriage
    const ropeGeo = cyl(0.06, 0.06, 0.03, 10);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(-0.3, 0.7, -0.35);
    rope.rotation.x = Math.PI / 2;
    this._body.add(rope);

    // ---- Head: cannon barrel ----
    this._head.position.set(0.1, 0.95, 0);
    this._body.add(this._head);

    // Main barrel — long cylinder with slight taper
    const barrelGeo = cyl(0.12, 0.1, 1.2, 12);
    const barrel = new THREE.Mesh(barrelGeo, bronzeMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.3, 0, 0);
    this._head.add(barrel);

    // Muzzle flare at front — wider ring
    const muzzleGeo = cyl(0.15, 0.14, 0.08, 12);
    const muzzle = new THREE.Mesh(muzzleGeo, bronzeMat);
    muzzle.rotation.z = Math.PI / 2;
    muzzle.position.set(0.9, 0, 0);
    this._head.add(muzzle);

    // Muzzle bore (dark interior)
    const boreGeo = cyl(0.08, 0.08, 0.06, 10);
    const bore = new THREE.Mesh(boreGeo, mat(0x111111));
    bore.rotation.z = Math.PI / 2;
    bore.position.set(0.94, 0, 0);
    this._head.add(bore);

    // Decorative bands around barrel (3 raised rings)
    const bandPositions = [0.05, 0.35, 0.65];
    for (const bx of bandPositions) {
      const bandGeo = cyl(0.135, 0.135, 0.03, 12);
      const band = new THREE.Mesh(bandGeo, bronzeMat);
      band.rotation.z = Math.PI / 2;
      band.position.set(bx, 0, 0);
      this._head.add(band);
    }

    // Cascabel (knob at rear of barrel)
    const cascabelGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const cascabel = new THREE.Mesh(cascabelGeo, bronzeMat);
    cascabel.position.set(-0.32, 0, 0);
    this._head.add(cascabel);

    // Touch hole at rear (small dark cylinder on top)
    const touchHoleGeo = cyl(0.015, 0.015, 0.04, 6);
    const touchHole = new THREE.Mesh(touchHoleGeo, darkIronMat);
    touchHole.position.set(-0.15, 0.11, 0);
    this._head.add(touchHole);

    // Trunnions (barrel mounting pegs on sides)
    for (const side of [-1, 1]) {
      const trunnionGeo = cyl(0.035, 0.035, 0.08, 6);
      const trunnion = new THREE.Mesh(trunnionGeo, bronzeMat);
      trunnion.rotation.x = Math.PI / 2;
      trunnion.position.set(0.1, -0.05, side * 0.15);
      this._head.add(trunnion);
    }

    // ---- Legs: large spoked wheels ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(0.1, 0.4, side * 0.6);
      this._body.add(leg);

      // Wheel rim
      const rimGeo = cyl(0.42, 0.42, 0.07, 18);
      const rim = new THREE.Mesh(rimGeo, wheelMat);
      rim.rotation.x = Math.PI / 2;
      leg.add(rim);

      // Iron tire band
      const tireGeo = cyl(0.44, 0.44, 0.05, 18);
      const tire = new THREE.Mesh(tireGeo, darkIronMat);
      tire.rotation.x = Math.PI / 2;
      leg.add(tire);

      // Thick hub
      const hubGeo = cyl(0.08, 0.08, 0.1, 10);
      const hub = new THREE.Mesh(hubGeo, darkIronMat);
      hub.rotation.x = Math.PI / 2;
      leg.add(hub);

      // Hub cap
      const hubCapGeo = new THREE.SphereGeometry(0.045, 6, 6);
      const hubCap = new THREE.Mesh(hubCapGeo, darkIronMat);
      hubCap.position.set(0, 0, side * 0.06);
      leg.add(hubCap);

      // Spokes (10 spokes radiating out)
      for (let s = 0; s < 10; s++) {
        const angle = (s / 10) * Math.PI * 2;
        const spokeGeo = cyl(0.018, 0.018, 0.34, 4);
        const spoke = new THREE.Mesh(spokeGeo, wheelMat);
        spoke.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0);
        spoke.rotation.z = angle + Math.PI / 2;
        leg.add(spoke);
      }
    }

    // Arms unused for cannon — minimal presence
    this._leftArm.position.set(0, 0.9, -0.3);
    this._body.add(this._leftArm);
    this._rightArm.position.set(0, 0.9, 0.3);
    this._body.add(this._rightArm);
  }

  // ---- Giant Siege builder -------------------------------------------------

  private _buildGiantSiege(): void {
    const skinMat = mat(0x7a7065, { roughness: 0.85 }); // stone-grey skin
    const darkSkinMat = mat(0x5a5045, { roughness: 0.85 });
    const ironMat = mat(0x3a3a3a, { metalness: 0.5, roughness: 0.4 });
    const eyeMat = mat(0xff6600, { emissive: 0x883300 });
    const tuskMat = mat(0xc8b890);
    const hideMat = mat(0x6b4226);
    const boulderMat = mat(0x888888, { roughness: 0.9 });
    const chainMat = mat(0x555555, { metalness: 0.45, roughness: 0.45 });
    const scarMat = mat(0x3a3530);

    // ---- Torso — massive, stooped, muscular ----
    const torsoGeo = new THREE.SphereGeometry(1, 12, 10);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.95, 1.1, 0.75);
    torso.position.set(0, 3.6, 0.1);
    this._body.add(torso);

    // Upper back hunch (stooped posture)
    const hunchGeo = new THREE.SphereGeometry(1, 10, 8);
    const hunch = new THREE.Mesh(hunchGeo, skinMat);
    hunch.scale.set(0.8, 0.5, 0.65);
    hunch.position.set(0, 4.3, -0.3);
    this._body.add(hunch);

    // Chest muscles — massive pectorals
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 7, 6);
      const pect = new THREE.Mesh(pectGeo, skinMat);
      pect.scale.set(0.38, 0.28, 0.3);
      pect.position.set(side * 0.32, 3.9, 0.5);
      this._body.add(pect);
    }

    // Belly — huge and muscular
    const bellyGeo = new THREE.SphereGeometry(1, 10, 8);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.78, 0.65, 0.6);
    belly.position.set(0, 2.9, 0.15);
    this._body.add(belly);

    // Iron armor bands wrapped around torso (3 bands)
    for (let i = 0; i < 3; i++) {
      const bandY = 3.0 + i * 0.5;
      const bandGeo = cyl(0.82 - i * 0.05, 0.82 - i * 0.05, 0.06, 14);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.position.set(0, bandY, 0.05);
      this._body.add(band);
    }

    // Scars / battle damage on torso — thin dark lines
    for (let i = 0; i < 5; i++) {
      const scarGeo = new THREE.BoxGeometry(0.02, 0.25 + Math.random() * 0.2, 0.01);
      const scar = new THREE.Mesh(scarGeo, scarMat);
      const scarAngle = -0.6 + Math.random() * 1.2;
      scar.position.set(
        Math.sin(scarAngle) * 0.7,
        3.0 + Math.random() * 1.2,
        Math.cos(scarAngle) * 0.55 + 0.1,
      );
      scar.rotation.z = (Math.random() - 0.5) * 0.5;
      this._body.add(scar);
    }

    // ---- Head — heavy brow, small eyes, tusks ----
    this._head.position.set(0, 4.7, 0.35);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 10, 8);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.4, 0.42, 0.38);
    this._head.add(headMesh);

    // Heavy brow ridge
    const browGeo = new THREE.SphereGeometry(1, 8, 5);
    const brow = new THREE.Mesh(browGeo, darkSkinMat);
    brow.scale.set(0.42, 0.12, 0.2);
    brow.position.set(0, 0.22, 0.22);
    this._head.add(brow);

    // Small orange glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.14, 0.14, 0.3);
      this._head.add(eye);
    }

    // Nose — broad, brutish
    const noseGeo = new THREE.SphereGeometry(1, 5, 5);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.scale.set(0.1, 0.12, 0.12);
    nose.position.set(0, 0.0, 0.33);
    this._head.add(nose);

    // Massive jaw
    const jawGeo = new THREE.SphereGeometry(1, 8, 6);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.scale.set(0.38, 0.2, 0.26);
    jaw.position.set(0, -0.2, 0.12);
    this._head.add(jaw);

    // Tusks — large, upward-curving
    for (const side of [-1, 1]) {
      const tuskGeo = new THREE.ConeGeometry(0.04, 0.2, 5);
      const tusk = new THREE.Mesh(tuskGeo, tuskMat);
      tusk.position.set(side * 0.15, -0.18, 0.22);
      tusk.rotation.x = -0.5;
      tusk.rotation.z = side * 0.15;
      this._head.add(tusk);
    }

    // Ears — small, thick
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(1, 5, 4);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.scale.set(0.08, 0.14, 0.1);
      ear.position.set(side * 0.38, 0.08, 0.0);
      this._head.add(ear);
    }

    // ---- Right arm — holds MASSIVE boulder ----
    this._rightArm.position.set(1.0, 4.1, 0.0);
    this._body.add(this._rightArm);

    // Shoulder
    const rShoulderGeo = new THREE.SphereGeometry(0.28, 8, 7);
    const rShoulder = new THREE.Mesh(rShoulderGeo, skinMat);
    this._rightArm.add(rShoulder);

    // Upper arm — massive
    const rUpperGeo = cyl(0.24, 0.2, 1.1, 8);
    const rUpper = new THREE.Mesh(rUpperGeo, skinMat);
    rUpper.position.y = -0.55;
    this._rightArm.add(rUpper);

    // Iron band on upper arm
    const rArmBandGeo = cyl(0.25, 0.25, 0.06, 10);
    const rArmBand = new THREE.Mesh(rArmBandGeo, ironMat);
    rArmBand.position.y = -0.3;
    this._rightArm.add(rArmBand);

    // Forearm
    const rForeGeo = cyl(0.2, 0.16, 1.0, 8);
    const rFore = new THREE.Mesh(rForeGeo, skinMat);
    rFore.position.y = -1.4;
    this._rightArm.add(rFore);

    // Iron wrist cuff
    const rWristGeo = cyl(0.19, 0.19, 0.1, 10);
    const rWrist = new THREE.Mesh(rWristGeo, ironMat);
    rWrist.position.y = -1.85;
    this._rightArm.add(rWrist);

    // Hand
    const rHandGeo = new THREE.SphereGeometry(0.2, 7, 6);
    const rHand = new THREE.Mesh(rHandGeo, darkSkinMat);
    rHand.position.y = -2.0;
    this._rightArm.add(rHand);

    // MASSIVE boulder in right hand
    const boulderGeo = new THREE.SphereGeometry(0.55, 10, 8);
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.position.y = -2.5;
    this._rightArm.add(boulder);

    // Boulder cracks / texture detail
    for (let i = 0; i < 4; i++) {
      const crackGeo = new THREE.BoxGeometry(0.01, 0.2 + Math.random() * 0.15, 0.01);
      const crack = new THREE.Mesh(crackGeo, mat(0x666666));
      const a = Math.random() * Math.PI * 2;
      crack.position.set(
        Math.cos(a) * 0.45,
        -2.5 + (Math.random() - 0.5) * 0.4,
        Math.sin(a) * 0.45,
      );
      crack.rotation.z = (Math.random() - 0.5) * 0.8;
      this._rightArm.add(crack);
    }

    // ---- Left arm — iron chain wrapped around it ----
    this._leftArm.position.set(-1.0, 4.1, 0.0);
    this._body.add(this._leftArm);

    // Shoulder
    const lShoulderGeo = new THREE.SphereGeometry(0.28, 8, 7);
    const lShoulder = new THREE.Mesh(lShoulderGeo, skinMat);
    this._leftArm.add(lShoulder);

    // Upper arm
    const lUpperGeo = cyl(0.24, 0.2, 1.1, 8);
    const lUpper = new THREE.Mesh(lUpperGeo, skinMat);
    lUpper.position.y = -0.55;
    this._leftArm.add(lUpper);

    // Iron band on upper arm
    const lArmBandGeo = cyl(0.25, 0.25, 0.06, 10);
    const lArmBand = new THREE.Mesh(lArmBandGeo, ironMat);
    lArmBand.position.y = -0.3;
    this._leftArm.add(lArmBand);

    // Forearm
    const lForeGeo = cyl(0.2, 0.16, 1.0, 8);
    const lFore = new THREE.Mesh(lForeGeo, skinMat);
    lFore.position.y = -1.4;
    this._leftArm.add(lFore);

    // Iron wrist cuff
    const lWristGeo = cyl(0.19, 0.19, 0.1, 10);
    const lWrist = new THREE.Mesh(lWristGeo, ironMat);
    lWrist.position.y = -1.85;
    this._leftArm.add(lWrist);

    // Hand
    const lHandGeo = new THREE.SphereGeometry(0.2, 7, 6);
    const lHand = new THREE.Mesh(lHandGeo, darkSkinMat);
    lHand.position.y = -2.0;
    this._leftArm.add(lHand);

    // Iron chain wrapped in spiral around left arm
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      const chainAngle = t * Math.PI * 5;
      const chainY = -0.2 - t * 1.6;
      const chainR = 0.22 - t * 0.04;
      const linkGeo = cyl(0.025, 0.025, 0.08, 5);
      const link = new THREE.Mesh(linkGeo, chainMat);
      link.position.set(Math.cos(chainAngle) * chainR, chainY, Math.sin(chainAngle) * chainR);
      link.rotation.x = chainAngle;
      link.rotation.z = Math.PI / 2;
      this._leftArm.add(link);
    }

    // Dangling chain end
    for (let i = 0; i < 4; i++) {
      const dGeo = cyl(0.022, 0.022, 0.07, 5);
      const dLink = new THREE.Mesh(dGeo, chainMat);
      dLink.position.set(-0.12, -2.1 - i * 0.09, 0.05);
      dLink.rotation.z = (i % 2 === 0) ? 0.3 : -0.3;
      this._leftArm.add(dLink);
    }

    // ---- Legs — enormous tree-trunk thick ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.45, 2.0, 0.0);
      this._body.add(leg);

      // Thigh — enormous
      const thighGeo = cyl(0.3, 0.25, 1.0, 10);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.5;
      leg.add(thigh);

      // Shin — tree-trunk thick
      const shinGeo = cyl(0.25, 0.18, 0.9, 9);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -1.3;
      leg.add(shin);

      // Iron ankle band / cuff
      const ankleBandGeo = cyl(0.22, 0.22, 0.1, 10);
      const ankleBand = new THREE.Mesh(ankleBandGeo, ironMat);
      ankleBand.position.y = -1.72;
      leg.add(ankleBand);

      // Foot — huge, flat
      const footGeo = new THREE.SphereGeometry(1, 7, 6);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.22, 0.12, 0.3);
      foot.position.set(0, -1.88, 0.1);
      leg.add(foot);

      // Toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.055, 5, 5);
        const toe = new THREE.Mesh(toeGeo, darkSkinMat);
        toe.position.set(t * 0.09, -1.92, 0.3);
        leg.add(toe);
      }
    }

    // Animal hide loincloth
    const clothGeo = new THREE.PlaneGeometry(0.8, 0.65);
    const clothFront = new THREE.Mesh(clothGeo, hideMat);
    clothFront.position.set(0, 2.15, 0.5);
    this._body.add(clothFront);
    const clothBack = new THREE.Mesh(clothGeo.clone(), hideMat);
    clothBack.position.set(0, 2.15, -0.5);
    this._body.add(clothBack);

    // Side flaps of loincloth
    for (const side of [-1, 1]) {
      const flapGeo = new THREE.PlaneGeometry(0.3, 0.5);
      const flap = new THREE.Mesh(flapGeo, hideMat);
      flap.position.set(side * 0.42, 2.2, 0);
      flap.rotation.y = Math.PI / 2;
      this._body.add(flap);
    }

    // Rubble / broken stones at feet — scattered small spheres near ground
    for (let i = 0; i < 8; i++) {
      const rubbleSize = 0.04 + Math.random() * 0.06;
      const rubbleGeo = new THREE.SphereGeometry(rubbleSize, 5, 4);
      const rubble = new THREE.Mesh(rubbleGeo, boulderMat);
      const rubbleAngle = Math.random() * Math.PI * 2;
      const dist = 0.5 + Math.random() * 0.5;
      rubble.position.set(
        Math.cos(rubbleAngle) * dist,
        rubbleSize * 0.5,
        Math.sin(rubbleAngle) * dist,
      );
      rubble.scale.set(1, 0.6 + Math.random() * 0.4, 1);
      this._body.add(rubble);
    }
  }

  // ---- Red Dragon builder ---------------------------------------------------

  private _buildRedDragon(): void {
    const scaleMat = mat(0x8b1a1a);           // deep crimson scales
    const darkScaleMat = mat(0x5a0d0d);       // darker back scales
    const bellyMat = mat(0xcc8833);           // gold-orange belly plates
    const eyeMat = mat(0xff6600, { emissive: 0xff6600 });
    const hornMat = mat(0x332211);
    const clawMat = mat(0x222211);
    const membraneMat = mat(0x661111, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const nostrilGlow = mat(0xff4400, { emissive: 0xff2200 });

    // ---- Torso — muscular, reptilian, upright ----
    const torsoGeo = new THREE.SphereGeometry(1, 12, 10);
    const torso = new THREE.Mesh(torsoGeo, scaleMat);
    torso.scale.set(0.65, 0.85, 0.55);
    torso.position.y = 2.6;
    this._body.add(torso);

    // Upper back musculature
    const backGeo = new THREE.SphereGeometry(1, 10, 8);
    const back = new THREE.Mesh(backGeo, darkScaleMat);
    back.scale.set(0.6, 0.7, 0.5);
    back.position.set(0, 2.8, -0.15);
    this._body.add(back);

    // Chest / belly plates — lighter gold-orange
    const chestGeo = new THREE.SphereGeometry(1, 8, 6);
    const chest = new THREE.Mesh(chestGeo, bellyMat);
    chest.scale.set(0.45, 0.55, 0.3);
    chest.position.set(0, 2.5, 0.3);
    this._body.add(chest);

    // Lower belly plate
    const lowerBellyGeo = new THREE.SphereGeometry(1, 8, 6);
    const lowerBelly = new THREE.Mesh(lowerBellyGeo, bellyMat);
    lowerBelly.scale.set(0.38, 0.35, 0.25);
    lowerBelly.position.set(0, 1.9, 0.25);
    this._body.add(lowerBelly);

    // ---- Neck — long, serpentine (chain of segments) ----
    const neckSegments = 5;
    for (let i = 0; i < neckSegments; i++) {
      const t = i / neckSegments;
      const radius = 0.18 - t * 0.04;
      const segGeo = new THREE.SphereGeometry(radius, 8, 6);
      const seg = new THREE.Mesh(segGeo, scaleMat);
      seg.position.set(0, 3.3 + t * 0.8, 0.15 + t * 0.35);
      seg.scale.set(1, 1.2, 0.9);
      this._body.add(seg);
    }

    // ---- Head — elongated snout, horns, eyes ----
    this._head.position.set(0, 4.1, 0.55);
    this._body.add(this._head);

    // Skull
    const skullGeo = new THREE.SphereGeometry(1, 10, 8);
    const skull = new THREE.Mesh(skullGeo, scaleMat);
    skull.scale.set(0.22, 0.2, 0.24);
    this._head.add(skull);

    // Elongated snout
    const snoutGeo = cyl(0.1, 0.06, 0.35, 8);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.28);
    this._head.add(snout);

    // Upper jaw ridge
    const jawRidgeGeo = new THREE.SphereGeometry(1, 6, 4);
    const jawRidge = new THREE.Mesh(jawRidgeGeo, darkScaleMat);
    jawRidge.scale.set(0.14, 0.06, 0.2);
    jawRidge.position.set(0, 0.08, 0.18);
    this._head.add(jawRidge);

    // Lower jaw
    const lowerJawGeo = new THREE.SphereGeometry(1, 7, 5);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, scaleMat);
    lowerJaw.scale.set(0.16, 0.08, 0.22);
    lowerJaw.position.set(0, -0.12, 0.12);
    this._head.add(lowerJaw);

    // Glowing orange eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.13, 0.08, 0.16);
      this._head.add(eye);
    }

    // Nostrils with faint glow
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const nostril = new THREE.Mesh(nostrilGeo, nostrilGlow);
      nostril.position.set(side * 0.04, 0.0, 0.42);
      this._head.add(nostril);
    }

    // Two swept-back horns
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.04, 0.35, 6);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.14, 0.15, -0.1);
      horn.rotation.x = -0.8;
      horn.rotation.z = side * 0.2;
      this._head.add(horn);
    }

    // Row of small spikes along jaw
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.015, 0.06, 4);
      const spike = new THREE.Mesh(spikeGeo, hornMat);
      spike.position.set(0, -0.1, 0.3 - i * 0.08);
      spike.rotation.x = -0.3;
      this._head.add(spike);
    }

    // ---- Wings on _leftArm / _rightArm — bat-like ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.65, 3.2, -0.2);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.12, 7, 6);
      const shoulder = new THREE.Mesh(shoulderGeo, scaleMat);
      wing.add(shoulder);

      // Upper arm bone
      const upperBoneGeo = cyl(0.06, 0.04, 0.8, 6);
      const upperBone = new THREE.Mesh(upperBoneGeo, darkScaleMat);
      upperBone.position.set(side * 0.3, 0.1, -0.15);
      upperBone.rotation.z = side * 0.8;
      wing.add(upperBone);

      // Forearm bone
      const foreBoneGeo = cyl(0.04, 0.03, 0.7, 6);
      const foreBone = new THREE.Mesh(foreBoneGeo, darkScaleMat);
      foreBone.position.set(side * 0.7, -0.1, -0.2);
      foreBone.rotation.z = side * 1.2;
      wing.add(foreBone);

      // Wing finger bones (three)
      for (let f = 0; f < 3; f++) {
        const fingerGeo = cyl(0.025, 0.01, 0.6 - f * 0.1, 5);
        const finger = new THREE.Mesh(fingerGeo, darkScaleMat);
        const fAngle = side * (0.9 + f * 0.35);
        finger.position.set(side * 1.0 + Math.sin(fAngle) * 0.2, -0.15 - f * 0.2, -0.25);
        finger.rotation.z = fAngle;
        wing.add(finger);
      }

      // Wing membrane — semi-transparent deep red
      const membraneGeo = new THREE.PlaneGeometry(1.2, 1.0, 3, 2);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 0.6, -0.15, -0.22);
      membrane.rotation.y = side * 0.2;
      membrane.rotation.x = -0.15;
      wing.add(membrane);
    }

    // ---- Legs — digitigrade (reverse-knee) with 3 claws ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.5, 0.0);
      this._body.add(leg);

      // Upper thigh
      const thighGeo = cyl(0.18, 0.14, 0.6, 8);
      const thigh = new THREE.Mesh(thighGeo, scaleMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Reverse-knee joint
      const kneeGeo = new THREE.SphereGeometry(0.1, 6, 6);
      const knee = new THREE.Mesh(kneeGeo, scaleMat);
      knee.position.set(0, -0.65, 0.08);
      leg.add(knee);

      // Lower shin — angled forward (digitigrade)
      const shinGeo = cyl(0.12, 0.08, 0.55, 7);
      const shin = new THREE.Mesh(shinGeo, scaleMat);
      shin.position.set(0, -0.95, 0.2);
      shin.rotation.x = 0.4;
      leg.add(shin);

      // Ankle
      const ankleGeo = new THREE.SphereGeometry(0.07, 6, 6);
      const ankle = new THREE.Mesh(ankleGeo, scaleMat);
      ankle.position.set(0, -1.2, 0.3);
      leg.add(ankle);

      // Foot pad
      const footGeo = new THREE.SphereGeometry(1, 6, 5);
      const foot = new THREE.Mesh(footGeo, darkScaleMat);
      foot.scale.set(0.12, 0.05, 0.15);
      foot.position.set(0, -1.3, 0.35);
      leg.add(foot);

      // 3 claws
      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.025, 0.12, 5);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.06, -1.32, 0.46);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);
      }
    }

    // ---- Tail — chain of decreasing segments from lower back ----
    const tailSegs = 8;
    for (let i = 0; i < tailSegs; i++) {
      const t = i / tailSegs;
      const radius = 0.14 * (1 - t * 0.7);
      const segGeo = new THREE.SphereGeometry(radius, 7, 5);
      const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? scaleMat : darkScaleMat);
      seg.position.set(0, 1.6 - i * 0.15, -0.4 - i * 0.22);
      this._body.add(seg);
    }

    // Tail tip — pointed
    const tailTipGeo = new THREE.ConeGeometry(0.04, 0.18, 5);
    const tailTip = new THREE.Mesh(tailTipGeo, darkScaleMat);
    tailTip.position.set(0, 1.6 - tailSegs * 0.15, -0.4 - tailSegs * 0.22);
    tailTip.rotation.x = -Math.PI / 2;
    this._body.add(tailTip);

    // ---- Spinal ridge — row of triangular spines down the back ----
    const spineCount = 10;
    for (let i = 0; i < spineCount; i++) {
      const t = i / spineCount;
      const height = 0.12 * (1 - Math.abs(t - 0.3) * 1.2);
      const spineGeo = new THREE.ConeGeometry(0.03, Math.max(0.04, height), 4);
      const spine = new THREE.Mesh(spineGeo, darkScaleMat);
      spine.position.set(0, 3.5 - i * 0.3, -0.35 - t * 0.3);
      this._body.add(spine);
    }
  }

  // ---- Fire Elemental builder -----------------------------------------------

  private _buildFireElemental(): void {
    const coreMat = mat(0xff4400, { emissive: 0xff2200 });
    const outerFlameMat = mat(0xffaa00, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const innerFlameMat = mat(0xff6611, { emissive: 0xcc3300, transparent: true, opacity: 0.7 });
    const emberMat = mat(0xffcc00, { emissive: 0xffcc00 });
    const eyeMat = mat(0xffffff, { emissive: 0xffff88 });
    const magmaMat = mat(0x220000, { emissive: 0x110000 });
    const armMat = mat(0xff6611, { emissive: 0xcc3300 });
    const legMat = mat(0xff6611, { emissive: 0xcc3300, transparent: true, opacity: 0.85 });
    const redWispMat = mat(0xcc2200, { emissive: 0x881100, transparent: true, opacity: 0.45 });

    // ---- Core body — glowing heart of the flame ----
    const coreGeo = new THREE.SphereGeometry(0.5, 12, 10);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    this._body.add(core);

    // Magma cracks on core (dark lines between glowing orange)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const crackGeo = new THREE.PlaneGeometry(0.04, 0.3 + Math.random() * 0.2);
      const crack = new THREE.Mesh(crackGeo, magmaMat);
      crack.position.set(
        Math.cos(angle) * 0.48,
        2.3 + Math.random() * 0.3,
        Math.sin(angle) * 0.48,
      );
      crack.lookAt(0, crack.position.y, 0);
      this._body.add(crack);
    }

    // ---- Outer flame layers — semi-transparent wisps ----
    // Orange outer layer
    const outerGeo = new THREE.SphereGeometry(0.65, 10, 8);
    const outer = new THREE.Mesh(outerGeo, outerFlameMat);
    outer.position.y = 2.4;
    outer.scale.set(1, 1.15, 1);
    this._body.add(outer);

    // Red inner wisp layer
    const redWispGeo = new THREE.SphereGeometry(0.55, 8, 7);
    const redWisp = new THREE.Mesh(redWispGeo, redWispMat);
    redWisp.position.y = 2.5;
    redWisp.scale.set(0.9, 1.2, 0.9);
    this._body.add(redWisp);

    // Upper flame wisps — rising tendrils
    for (let i = 0; i < 4; i++) {
      const wAngle = (i / 4) * Math.PI * 2 + 0.3;
      const wispGeo = new THREE.ConeGeometry(0.12 + Math.random() * 0.06, 0.5 + Math.random() * 0.3, 6);
      const wisp = new THREE.Mesh(wispGeo, outerFlameMat);
      wisp.position.set(
        Math.cos(wAngle) * 0.25,
        3.0 + Math.random() * 0.2,
        Math.sin(wAngle) * 0.25,
      );
      wisp.rotation.z = Math.sin(wAngle) * 0.3;
      this._body.add(wisp);
    }

    // ---- Head — floating flame crown above shoulders ----
    this._head.position.set(0, 3.4, 0.0);
    this._body.add(this._head);

    // Crown base (ring of flame)
    const crownBaseGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const crownBase = new THREE.Mesh(crownBaseGeo, innerFlameMat);
    crownBase.scale.set(1, 0.6, 1);
    this._head.add(crownBase);

    // Crown spikes (upward-pointing flames)
    for (let i = 0; i < 6; i++) {
      const csAngle = (i / 6) * Math.PI * 2;
      const spikeH = 0.2 + Math.random() * 0.15;
      const spikeGeo = new THREE.ConeGeometry(0.04, spikeH, 5);
      const spike = new THREE.Mesh(spikeGeo, outerFlameMat);
      spike.position.set(
        Math.cos(csAngle) * 0.18,
        0.12 + spikeH / 2,
        Math.sin(csAngle) * 0.18,
      );
      spike.rotation.z = Math.sin(csAngle) * 0.2;
      this._head.add(spike);
    }

    // Eyes — bright white-yellow spots
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, -0.02, 0.18);
      this._head.add(eye);
    }

    // ---- Arms — flowing tendril-like fire arms ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.55, 2.8, 0.0);
      this._body.add(arm);

      // Shoulder flare
      const shoulderGeo = new THREE.SphereGeometry(0.15, 7, 6);
      const shoulder = new THREE.Mesh(shoulderGeo, armMat);
      arm.add(shoulder);

      // Upper arm — thicker
      const upperGeo = cyl(0.12, 0.09, 0.6, 7);
      const upper = new THREE.Mesh(upperGeo, armMat);
      upper.position.y = -0.35;
      arm.add(upper);

      // Forearm — thinning
      const foreGeo = cyl(0.09, 0.05, 0.55, 6);
      const fore = new THREE.Mesh(foreGeo, innerFlameMat);
      fore.position.y = -0.85;
      arm.add(fore);

      // Flame tip "hand"
      const tipGeo = new THREE.ConeGeometry(0.07, 0.25, 6);
      const tip = new THREE.Mesh(tipGeo, outerFlameMat);
      tip.position.y = -1.2;
      tip.rotation.x = Math.PI;
      arm.add(tip);

      // Small flame wisps around forearm
      for (let w = 0; w < 3; w++) {
        const fwAngle = (w / 3) * Math.PI * 2;
        const fwGeo = new THREE.ConeGeometry(0.03, 0.12, 4);
        const flamelet = new THREE.Mesh(fwGeo, outerFlameMat);
        flamelet.position.set(
          Math.cos(fwAngle) * 0.1,
          -0.6 - w * 0.15,
          Math.sin(fwAngle) * 0.1,
        );
        arm.add(flamelet);
      }
    }

    // ---- Legs — pillars of flame, wider at base ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25, 1.4, 0.0);
      this._body.add(leg);

      // Upper leg — wide
      const upperLegGeo = cyl(0.16, 0.2, 0.6, 8);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.3;
      leg.add(upperLeg);

      // Lower leg — widening toward base
      const lowerLegGeo = cyl(0.2, 0.28, 0.55, 8);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.8;
      leg.add(lowerLeg);

      // Flame pool at bottom — flat disc with emissive orange
      const poolGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.05, 12);
      const pool = new THREE.Mesh(poolGeo, mat(0xff6600, { emissive: 0xff4400, transparent: true, opacity: 0.7 }));
      pool.position.y = -1.1;
      leg.add(pool);
    }

    // ---- Ember particles — scattered glowing spheres ----
    for (let i = 0; i < 12; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const emberGeo = new THREE.SphereGeometry(size, 5, 5);
      const isYellow = Math.random() > 0.5;
      const ember = new THREE.Mesh(emberGeo, isYellow
        ? emberMat
        : mat(0xff8800, { emissive: 0xff6600 }),
      );
      const eAngle = Math.random() * Math.PI * 2;
      const eRadius = 0.5 + Math.random() * 0.6;
      ember.position.set(
        Math.cos(eAngle) * eRadius,
        1.6 + Math.random() * 2.2,
        Math.sin(eAngle) * eRadius,
      );
      this._body.add(ember);
    }

    // Larger floating flame chunks
    for (let i = 0; i < 5; i++) {
      const chunkGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 6, 6);
      const chunk = new THREE.Mesh(chunkGeo, coreMat);
      const cAngle = Math.random() * Math.PI * 2;
      chunk.position.set(
        Math.cos(cAngle) * (0.6 + Math.random() * 0.3),
        2.0 + Math.random() * 1.2,
        Math.sin(cAngle) * (0.6 + Math.random() * 0.3),
      );
      this._body.add(chunk);
    }
  }

  // ---- Ice Elemental builder ------------------------------------------------

  private _buildIceElemental(): void {
    const iceMat = mat(0x8ec8d8, { transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.3 });
    const deepBlueMat = mat(0x3a7ca5, { transparent: true, opacity: 0.9, roughness: 0.15, metalness: 0.4 });
    const whiteMat = mat(0xddeeff, { roughness: 0.1, metalness: 0.2 });
    const eyeMat = mat(0x66ccff, { emissive: 0x3399cc });
    const darkCoreMat = mat(0x1a4466, { transparent: true, opacity: 0.75 });
    const shardMat = mat(0x8ec8d8, { transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.5 });

    // ---- Core body — angular crystalline cluster ----
    const coreGeo = new THREE.BoxGeometry(0.9, 1.2, 0.7, 1, 1, 1);
    const core = new THREE.Mesh(coreGeo, iceMat);
    core.position.y = 2.5;
    core.rotation.y = 0.15;
    this._body.add(core);

    // Dark inner core visible through translucent ice
    const innerGeo = new THREE.BoxGeometry(0.5, 0.8, 0.4);
    const inner = new THREE.Mesh(innerGeo, darkCoreMat);
    inner.position.y = 2.5;
    inner.rotation.y = 0.4;
    this._body.add(inner);

    // Upper chest crystal slab
    const upperChestGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
    const upperChest = new THREE.Mesh(upperChestGeo, deepBlueMat);
    upperChest.position.set(0, 3.1, 0.05);
    upperChest.rotation.z = 0.05;
    this._body.add(upperChest);

    // Lower torso crystal
    const lowerTorsoGeo = new THREE.BoxGeometry(0.7, 0.5, 0.55);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, iceMat);
    lowerTorso.position.set(0, 1.85, 0.0);
    lowerTorso.rotation.y = -0.2;
    this._body.add(lowerTorso);

    // Side crystal facets
    for (const side of [-1, 1]) {
      const facetGeo = new THREE.BoxGeometry(0.2, 0.6, 0.4);
      const facet = new THREE.Mesh(facetGeo, deepBlueMat);
      facet.position.set(side * 0.5, 2.5, 0.0);
      facet.rotation.z = side * 0.2;
      this._body.add(facet);
    }

    // ---- Head — angular crown of ice spikes ----
    this._head.position.set(0, 3.7, 0.1);
    this._body.add(this._head);

    // Head block
    const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.35);
    const headMesh = new THREE.Mesh(headGeo, iceMat);
    this._head.add(headMesh);

    // Crown spikes — large upward ice crystals
    const crownAngles = [-0.5, -0.15, 0.15, 0.5];
    for (let i = 0; i < crownAngles.length; i++) {
      const h = 0.25 + (i % 2 === 0 ? 0.1 : 0.0);
      const spikeGeo = new THREE.ConeGeometry(0.05, h, 4);
      const spike = new THREE.Mesh(spikeGeo, whiteMat);
      spike.position.set(crownAngles[i] * 0.4, 0.2 + h / 2, 0.0);
      spike.rotation.z = crownAngles[i] * 0.3;
      this._head.add(spike);
    }

    // Center crown spike (tallest)
    const centerSpikeGeo = new THREE.ConeGeometry(0.06, 0.4, 4);
    const centerSpike = new THREE.Mesh(centerSpikeGeo, deepBlueMat);
    centerSpike.position.set(0, 0.38, 0.0);
    this._head.add(centerSpike);

    // Cold blue glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 0.0, 0.17);
      this._head.add(eye);
    }

    // Icicle beard / stalactites hanging from chin
    for (let i = 0; i < 5; i++) {
      const len = 0.12 + Math.random() * 0.1;
      const icicleGeo = new THREE.ConeGeometry(0.02, len, 4);
      const icicle = new THREE.Mesh(icicleGeo, whiteMat);
      icicle.position.set(-0.1 + i * 0.05, -0.18 - len / 2, 0.12);
      icicle.rotation.x = Math.PI;
      this._head.add(icicle);
    }

    // ---- Shoulder spikes — large ice crystals jutting upward ----
    for (const side of [-1, 1]) {
      // Main shoulder spike
      const mainSpikeGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
      const mainSpike = new THREE.Mesh(mainSpikeGeo, deepBlueMat);
      mainSpike.position.set(side * 0.55, 3.4, -0.05);
      mainSpike.rotation.z = side * 0.4;
      this._body.add(mainSpike);

      // Secondary smaller spike
      const secSpikeGeo = new THREE.ConeGeometry(0.05, 0.3, 4);
      const secSpike = new THREE.Mesh(secSpikeGeo, iceMat);
      secSpike.position.set(side * 0.45, 3.25, 0.1);
      secSpike.rotation.z = side * 0.6;
      this._body.add(secSpike);
    }

    // ---- Arms — jagged ice limbs, segmented ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.6, 3.1, 0.0);
      this._body.add(arm);

      // Shoulder joint — angular
      const shoulderGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const shoulder = new THREE.Mesh(shoulderGeo, deepBlueMat);
      shoulder.rotation.y = 0.3;
      arm.add(shoulder);

      // Upper arm segment
      const upperArmGeo = new THREE.BoxGeometry(0.16, 0.65, 0.14);
      const upperArm = new THREE.Mesh(upperArmGeo, iceMat);
      upperArm.position.set(0, -0.4, 0);
      upperArm.rotation.z = side * 0.1;
      arm.add(upperArm);

      // Elbow crystal
      const elbowGeo = new THREE.BoxGeometry(0.18, 0.18, 0.16);
      const elbow = new THREE.Mesh(elbowGeo, deepBlueMat);
      elbow.position.y = -0.8;
      elbow.rotation.y = 0.5;
      arm.add(elbow);

      // Elbow spike jutting outward
      const elbowSpikeGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
      const elbowSpike = new THREE.Mesh(elbowSpikeGeo, whiteMat);
      elbowSpike.position.set(side * 0.12, -0.8, -0.08);
      elbowSpike.rotation.z = side * 1.2;
      arm.add(elbowSpike);

      // Forearm
      const foreGeo = new THREE.BoxGeometry(0.14, 0.6, 0.12);
      const fore = new THREE.Mesh(foreGeo, iceMat);
      fore.position.y = -1.2;
      fore.rotation.z = side * -0.08;
      arm.add(fore);

      // Ice blade hand — pointed
      const bladeGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
      const blade = new THREE.Mesh(bladeGeo, whiteMat);
      blade.position.y = -1.6;
      blade.rotation.x = Math.PI;
      arm.add(blade);

      // Secondary blade prong
      const prongGeo = new THREE.ConeGeometry(0.04, 0.25, 4);
      const prong = new THREE.Mesh(prongGeo, shardMat);
      prong.position.set(side * 0.06, -1.5, 0.05);
      prong.rotation.x = Math.PI;
      prong.rotation.z = side * 0.3;
      arm.add(prong);
    }

    // ---- Legs — thick ice pillars with geometric facets ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 1.55, 0.0);
      this._body.add(leg);

      // Upper leg block
      const thighGeo = new THREE.BoxGeometry(0.24, 0.6, 0.22);
      const thigh = new THREE.Mesh(thighGeo, iceMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Knee facet
      const kneeGeo = new THREE.BoxGeometry(0.26, 0.2, 0.24);
      const knee = new THREE.Mesh(kneeGeo, deepBlueMat);
      knee.position.y = -0.65;
      knee.rotation.y = 0.2;
      leg.add(knee);

      // Shin block
      const shinGeo = new THREE.BoxGeometry(0.22, 0.55, 0.2);
      const shin = new THREE.Mesh(shinGeo, iceMat);
      shin.position.y = -1.0;
      leg.add(shin);

      // Foot — flat ice slab
      const footGeo = new THREE.BoxGeometry(0.28, 0.1, 0.35);
      const foot = new THREE.Mesh(footGeo, deepBlueMat);
      foot.position.set(0, -1.32, 0.05);
      leg.add(foot);

      // Small ice spike on knee
      const kneeSpikeGeo = new THREE.ConeGeometry(0.035, 0.15, 4);
      const kneeSpike = new THREE.Mesh(kneeSpikeGeo, whiteMat);
      kneeSpike.position.set(0, -0.6, 0.14);
      kneeSpike.rotation.x = -0.5;
      leg.add(kneeSpike);
    }

    // ---- Frost details — small floating ice shards (tiny rotated cubes) ----
    for (let i = 0; i < 10; i++) {
      const size = 0.03 + Math.random() * 0.04;
      const shardGeo = new THREE.BoxGeometry(size, size, size);
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = 0.6 + Math.random() * 0.7;
      shard.position.set(
        Math.cos(sAngle) * sRadius,
        1.6 + Math.random() * 2.4,
        Math.sin(sAngle) * sRadius,
      );
      shard.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      this._body.add(shard);
    }

    // Back crystal formation
    for (let i = 0; i < 3; i++) {
      const crystalGeo = new THREE.ConeGeometry(0.06 - i * 0.01, 0.35 - i * 0.08, 4);
      const crystal = new THREE.Mesh(crystalGeo, deepBlueMat);
      crystal.position.set(0, 2.8 - i * 0.35, -0.35 - i * 0.05);
      crystal.rotation.x = -0.3;
      this._body.add(crystal);
    }
  }

  // ---- Update --------------------------------------------------------------

  update(fighter: WarbandFighter, dt: number, camera: THREE.Camera): void {
    this.group.position.set(fighter.position.x, fighter.position.y, fighter.position.z);
    this.group.rotation.y = fighter.rotation;

    const isDead = fighter.combatState === FighterCombatState.DEAD;

    // Walk animation
    const speed = Math.sqrt(fighter.velocity.x ** 2 + fighter.velocity.z ** 2);
    if (speed > 0.3 && !isDead) {
      fighter.walkCycle = (fighter.walkCycle + speed * 0.012 * dt * 60) % 1;
      const t = fighter.walkCycle * Math.PI * 2;
      const amp = Math.min(speed * 0.08, 0.4);

      this._leftLeg.rotation.x = Math.sin(t) * amp;
      this._rightLeg.rotation.x = -Math.sin(t) * amp;
      this._leftArm.rotation.x = -Math.sin(t) * amp * 0.6;
      this._rightArm.rotation.x = Math.sin(t) * amp * 0.6;

      // Body sway
      this._body.rotation.z = Math.sin(t) * 0.03;
      this._body.position.y = Math.abs(Math.sin(t * 2)) * 0.04;
    } else if (!isDead) {
      // Idle breathing
      const breathe = Math.sin(Date.now() * 0.0015);
      this._body.position.y = breathe * 0.02;
      this._body.rotation.z = 0;
      this._leftLeg.rotation.x = 0;
      this._rightLeg.rotation.x = 0;
      this._leftArm.rotation.x = 0;
      this._rightArm.rotation.x = 0;
    }

    // Attack animation
    if (fighter.combatState === FighterCombatState.WINDING) {
      // Wind up — raise right arm
      this._rightArm.rotation.x = -1.2;
      this._body.rotation.z = 0.1;
    } else if (fighter.combatState === FighterCombatState.RELEASING) {
      // Smash down
      this._rightArm.rotation.x = 0.8;
      this._body.rotation.z = -0.05;
      this._body.rotation.x = 0.1;
    } else if (fighter.combatState === FighterCombatState.RECOVERY) {
      this._rightArm.rotation.x *= 0.9;
      this._body.rotation.x *= 0.9;
    } else if (fighter.combatState === FighterCombatState.STAGGERED) {
      this._body.rotation.z = Math.sin(Date.now() * 0.01) * 0.15;
    }

    // Death
    if (isDead) {
      this.group.rotation.z = Math.PI / 2;
      this.group.position.y = -0.5;
      this._hpBarBg.visible = false;
      this._hpBarFill.visible = false;
      return;
    }

    // HP bar
    this._hpBarBg.lookAt(camera.position);
    this._hpBarFill.lookAt(camera.position);
    const hpPct = Math.max(0, fighter.hp / fighter.maxHp);
    this._hpBarFill.scale.x = hpPct;
    this._hpBarFill.position.x = -(1 - hpPct) * (CREATURE_DEFS[this._creatureType].radius - 0.02);
    this._hpBarBg.visible = true;
    this._hpBarFill.visible = true;
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
    });
  }
}
