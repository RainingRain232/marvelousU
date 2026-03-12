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

/** Create a bat-wing–shaped membrane geometry (scalloped outer edge, tapered). */
function wingShape(width: number, height: number): THREE.ShapeGeometry {
  const w = width / 2;
  const h = height / 2;
  const s = new THREE.Shape();
  // Start near body (top-inner)
  s.moveTo(-w * 0.9, h * 0.7);
  // Top edge – rises toward wing tip
  s.quadraticCurveTo(-w * 0.2, h * 1.05, w * 0.5, h * 0.8);
  s.quadraticCurveTo(w * 0.85, h * 0.6, w, h * 0.35);
  // Outer scalloped edge (3 scallops between finger bones)
  s.quadraticCurveTo(w * 1.05, h * 0.05, w * 0.82, -h * 0.15);
  s.quadraticCurveTo(w * 0.95, -h * 0.35, w * 0.65, -h * 0.5);
  s.quadraticCurveTo(w * 0.75, -h * 0.7, w * 0.4, -h * 0.8);
  // Bottom edge – curves back toward body
  s.quadraticCurveTo(w * 0.1, -h * 0.95, -w * 0.4, -h * 0.6);
  s.quadraticCurveTo(-w * 0.7, -h * 0.45, -w * 0.9, -h * 0.2);
  // Close along body side
  s.lineTo(-w * 0.9, h * 0.7);
  return new THREE.ShapeGeometry(s, 8);
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
      case "frost_dragon":
        this._buildFrostDragon();
        break;
      case "fire_dragon":
        this._buildFireDragon();
        break;
      case "ice_dragon":
        this._buildIceDragon();
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
      case "lightning_elemental":
        this._buildLightningElemental();
        break;
      case "distortion_elemental":
        this._buildDistortionElemental();
        break;
      case "minor_fire_elemental":
        this._buildMinorFireElemental();
        break;
      case "minor_ice_elemental":
        this._buildMinorIceElemental();
        break;
      case "minor_lightning_elemental":
        this._buildMinorLightningElemental();
        break;
      case "minor_distortion_elemental":
        this._buildMinorDistortionElemental();
        break;
      case "minor_earth_elemental":
        this._buildMinorEarthElemental();
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
      case "bolt_thrower":
        this._buildBoltThrowerSiege();
        break;
      case "siege_catapult":
        this._buildSiegeCatapult();
        break;
      case "war_wagon":
        this._buildWarWagon();
        break;
      case "bombard":
        this._buildBombard();
        break;
      case "siege_tower":
        this._buildSiegeTower();
        break;
      case "hellfire_mortar":
        this._buildHellfireMortar();
        break;
      case "fire_imp":
        this._buildFireImp();
        break;
      case "ice_imp":
        this._buildIceImp();
        break;
      case "lightning_imp":
        this._buildLightningImp();
        break;
      case "distortion_imp":
        this._buildDistortionImp();
        break;
      case "void_snail":
        this._buildVoidSnail();
        break;
      case "faery_queen":
        this._buildFaeryQueen();
        break;
      case "devourer":
        this._buildDevourer();
        break;
      case "pixie":
        this._buildPixie();
        break;
      case "bat":
        this._buildBat();
        break;
      // Faction creatures
      case "treant":
        this._buildTreant();
        break;
      case "siege_troll":
        this._buildSiegeTroll();
        break;
      case "mana_wraith":
        this._buildManaWraith();
        break;
      case "elemental_avatar":
        this._buildElementalAvatar();
        break;
      case "storm_conduit":
        this._buildStormConduit();
        break;
      case "frost_wyrm":
        this._buildFrostWyrm();
        break;
      case "magma_titan":
        this._buildMagmaTitan();
        break;
      case "stone_fist":
        this._buildStoneFist();
        break;
      case "magma_golem":
        this._buildMagmaGolem();
        break;
      case "obsidian_sentinel":
        this._buildObsidianSentinel();
        break;
      case "cinder_wraith":
        this._buildCinderWraith();
        break;
      case "volcanic_behemoth":
        this._buildVolcanicBehemoth();
        break;
      case "bone_colossus":
        this._buildBoneColossus();
        break;
      case "wraith_lord":
        this._buildWraithLord();
        break;
      case "banshee":
        this._buildBanshee();
        break;
      case "pit_lord":
        this._buildPitLord();
        break;
      case "doom_guard":
        this._buildDoomGuard();
        break;
      case "succubus":
        this._buildSuccubus();
        break;
      case "imp_overlord":
        this._buildImpOverlord();
        break;
      case "seraphim":
        this._buildSeraphim();
        break;
      case "archon":
        this._buildArchon();
        break;
      case "alpha_wolf":
        this._buildAlphaWolf();
        break;
      case "thunderhawk":
        this._buildThunderhawk();
        break;
      case "dire_bear":
        this._buildDireBear();
        break;
      case "war_golem":
        this._buildWarGolem();
        break;
      case "rune_core":
        this._buildRuneCore();
        break;
      case "siege_automaton":
        this._buildSiegeAutomaton();
        break;
      case "crystal_golem":
        this._buildCrystalGolem();
        break;
      case "iron_colossus":
        this._buildIronColossus();
        break;
    }

    // ---- Scale large creatures 2× ----
    const _bigCreatures: CreatureType[] = [
      "red_dragon", "frost_dragon", "fire_dragon", "ice_dragon",
      "troll", "siege_troll", "cyclops", "giant_siege",
    ];
    if (_bigCreatures.includes(this._creatureType)) {
      this._body.scale.set(2, 2, 2);
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
    const scarMat = mat(0x4a5a2a);
    const veinMat = mat(0x4e5c34);

    // Torso — hunched, barrel-shaped
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.55, 0.7, 0.45);
    torso.position.y = 2.2;
    this._body.add(torso);

    // Belly — potbelly
    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.5, 0.5, 0.42);
    belly.position.set(0, 1.8, 0.15);
    this._body.add(belly);

    // Belly fold detail — skin crease under the gut
    const bellyFoldGeo = new THREE.SphereGeometry(1, 16, 12);
    const bellyFold = new THREE.Mesh(bellyFoldGeo, darkMat);
    bellyFold.scale.set(0.48, 0.06, 0.4);
    bellyFold.position.set(0, 1.55, 0.18);
    this._body.add(bellyFold);

    // Hunch / upper back
    const hunchGeo = new THREE.SphereGeometry(1, 18, 14);
    const hunch = new THREE.Mesh(hunchGeo, skinMat);
    hunch.scale.set(0.48, 0.35, 0.4);
    hunch.position.set(0, 2.7, -0.15);
    this._body.add(hunch);

    // Spine bumps along back
    for (let i = 0; i < 4; i++) {
      const spineGeo = new THREE.SphereGeometry(0.04 + i * 0.005, 10, 8);
      const spine = new THREE.Mesh(spineGeo, darkMat);
      spine.position.set(0, 2.8 - i * 0.25, -0.25);
      this._body.add(spine);
    }

    // Chest muscle definition
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 16, 12);
      const pect = new THREE.Mesh(pectGeo, veinMat);
      pect.scale.set(0.18, 0.12, 0.1);
      pect.position.set(side * 0.2, 2.35, 0.3);
      this._body.add(pect);
    }

    // Head — small relative to body, jutting forward
    this._head.position.set(0, 2.8, 0.25);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 18, 14);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.22, 0.25, 0.24);
    this._head.add(headMesh);

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const brow = new THREE.Mesh(browGeo, darkMat);
    brow.scale.set(0.24, 0.08, 0.12);
    brow.position.set(0, 0.12, 0.14);
    this._head.add(brow);

    // Eyes — small, red
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 0.08, 0.2);
      this._head.add(eye);
    }

    // Nostrils — dark pits on face
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 10, 8);
      const nostril = new THREE.Mesh(nostrilGeo, darkMat);
      nostril.position.set(side * 0.04, 0.0, 0.23);
      this._head.add(nostril);
    }

    // Jaw / underbite
    const jawGeo = new THREE.SphereGeometry(1, 16, 12);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.scale.set(0.2, 0.12, 0.16);
    jaw.position.set(0, -0.1, 0.12);
    this._head.add(jaw);

    // Chin wart
    const chinWartGeo = new THREE.SphereGeometry(0.025, 10, 8);
    const chinWart = new THREE.Mesh(chinWartGeo, darkMat);
    chinWart.position.set(0.03, -0.16, 0.15);
    this._head.add(chinWart);

    // Tusks
    for (const side of [-1, 1]) {
      const tuskGeo = new THREE.ConeGeometry(0.025, 0.1, 12);
      const tusk = new THREE.Mesh(tuskGeo, boneMat);
      tusk.position.set(side * 0.1, -0.08, 0.18);
      tusk.rotation.x = -0.3;
      this._head.add(tusk);
    }

    // Ears — ragged, pointed
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.06, 0.15, 12);
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

      // Shoulder muscle
      const shoulderGeo = new THREE.SphereGeometry(0.16, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, skinMat);
      shoulder.position.set(0, 0.05, 0);
      arm.add(shoulder);

      // Upper arm
      const upperGeo = cyl(0.14, 0.12, 0.7, 14);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.35;
      arm.add(upper);

      // Bicep bulge
      const bicepGeo = new THREE.SphereGeometry(0.08, 12, 10);
      const bicep = new THREE.Mesh(bicepGeo, veinMat);
      bicep.scale.set(1.0, 0.7, 0.8);
      bicep.position.set(0, -0.25, 0.06);
      arm.add(bicep);

      // Forearm — thicker
      const foreGeo = cyl(0.12, 0.1, 0.65, 14);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -0.9;
      arm.add(fore);

      // Tendon detail on forearm
      const tendonGeo = new THREE.SphereGeometry(1, 12, 10);
      const tendon = new THREE.Mesh(tendonGeo, veinMat);
      tendon.scale.set(0.04, 0.2, 0.03);
      tendon.position.set(side * 0.06, -0.85, 0.05);
      arm.add(tendon);

      // Fist — large, clublike
      const fistGeo = new THREE.SphereGeometry(0.14, 16, 12);
      const fist = new THREE.Mesh(fistGeo, darkMat);
      fist.position.y = -1.3;
      arm.add(fist);

      // Knuckle bumps
      for (let k = -1; k <= 1; k++) {
        const knuckleGeo = new THREE.SphereGeometry(0.03, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkMat);
        knuckle.position.set(k * 0.05, -1.35, 0.1);
        arm.add(knuckle);
      }
    }

    // Club in right hand
    const clubGeo = cyl(0.06, 0.1, 1.0, 12);
    const club = new THREE.Mesh(clubGeo, mat(0x5c3317));
    club.position.y = -1.7;
    this._rightArm.add(club);

    // Club knob
    const knobGeo = new THREE.SphereGeometry(0.13, 16, 12);
    const knob = new THREE.Mesh(knobGeo, mat(0x4a2810));
    knob.position.y = -2.2;
    this._rightArm.add(knob);

    // ---- Legs — stumpy, thick ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.28, 1.3, 0.0);
      this._body.add(leg);

      // Thigh
      const thighGeo = cyl(0.18, 0.14, 0.65, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.32;
      leg.add(thigh);

      // Knee bump
      const kneeGeo = new THREE.SphereGeometry(0.09, 12, 10);
      const knee = new THREE.Mesh(kneeGeo, skinMat);
      knee.position.set(0, -0.6, 0.06);
      leg.add(knee);

      // Shin
      const shinGeo = cyl(0.14, 0.1, 0.55, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.8;
      leg.add(shin);

      // Calf muscle
      const calfGeo = new THREE.SphereGeometry(0.07, 12, 10);
      const calf = new THREE.Mesh(calfGeo, veinMat);
      calf.scale.set(0.8, 1.2, 0.8);
      calf.position.set(0, -0.75, -0.06);
      leg.add(calf);

      // Foot
      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.scale.set(0.13, 0.08, 0.18);
      foot.position.set(0, -1.12, 0.06);
      leg.add(foot);
    }

    // Warts / skin detail
    for (let i = 0; i < 6; i++) {
      const wartGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 10, 8);
      const wart = new THREE.Mesh(wartGeo, darkMat);
      const angle = Math.random() * Math.PI * 2;
      wart.position.set(
        Math.cos(angle) * (0.35 + Math.random() * 0.15),
        1.8 + Math.random() * 1.0,
        Math.sin(angle) * (0.3 + Math.random() * 0.1),
      );
      this._body.add(wart);
    }

    // Scar lines on torso — color-shifted overlays for depth
    for (let i = 0; i < 3; i++) {
      const scarGeo = new THREE.SphereGeometry(1, 12, 10);
      const scar = new THREE.Mesh(scarGeo, scarMat);
      scar.scale.set(0.03, 0.15, 0.02);
      const ang = -0.4 + i * 0.4;
      scar.position.set(Math.sin(ang) * 0.4, 2.0 + i * 0.2, Math.cos(ang) * 0.35);
      scar.rotation.z = 0.3 + i * 0.2;
      this._body.add(scar);
    }
  }

  // ---- Cyclops builder -----------------------------------------------------

  private _buildCyclops(): void {
    const skinMat = mat(0x8b7355); // sandy/stone
    const darkMat = mat(0x6b5335);
    const boneMat = mat(0xd4c4a0);
    const eyeMat = mat(0xffcc00, { emissive: 0x884400 });
    const wrinkleMat = mat(0x7a6345);
    const veinMat = mat(0x7b6040);

    // Torso — massive, broad-shouldered
    const torsoGeo = new THREE.SphereGeometry(1, 22, 18);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.75, 0.9, 0.6);
    torso.position.y = 3.0;
    this._body.add(torso);

    // Chest muscles
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 18, 14);
      const pect = new THREE.Mesh(pectGeo, skinMat);
      pect.scale.set(0.3, 0.2, 0.2);
      pect.position.set(side * 0.25, 3.2, 0.4);
      this._body.add(pect);
    }

    // Abdominal muscle ridges
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const abGeo = new THREE.SphereGeometry(1, 14, 10);
        const ab = new THREE.Mesh(abGeo, wrinkleMat);
        ab.scale.set(0.12, 0.08, 0.06);
        ab.position.set(side * 0.12, 2.7 - i * 0.2, 0.42);
        this._body.add(ab);
      }
    }

    // Belly
    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.6, 0.55, 0.5);
    belly.position.set(0, 2.4, 0.1);
    this._body.add(belly);

    // Head — large, single-eyed
    this._head.position.set(0, 4.0, 0.15);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.35, 0.38, 0.33);
    this._head.add(headMesh);

    // Single great eye — centered
    const eyeSocketGeo = new THREE.SphereGeometry(1, 18, 14);
    const eyeSocket = new THREE.Mesh(eyeSocketGeo, darkMat);
    eyeSocket.scale.set(0.15, 0.12, 0.08);
    eyeSocket.position.set(0, 0.08, 0.28);
    this._head.add(eyeSocket);

    const eyeGeo = new THREE.SphereGeometry(0.09, 18, 14);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.08, 0.3);
    this._head.add(eye);

    // Pupil
    const pupilGeo = new THREE.SphereGeometry(0.04, 14, 12);
    const pupil = new THREE.Mesh(pupilGeo, mat(0x111111));
    pupil.position.set(0, 0.08, 0.38);
    this._head.add(pupil);

    // Brow ridge — heavy
    const browGeo = new THREE.SphereGeometry(1, 18, 12);
    const brow = new THREE.Mesh(browGeo, skinMat);
    brow.scale.set(0.36, 0.1, 0.15);
    brow.position.set(0, 0.2, 0.2);
    this._head.add(brow);

    // Brow wrinkle lines
    for (let i = 0; i < 3; i++) {
      const wrinkleGeo = new THREE.SphereGeometry(1, 12, 10);
      const wrinkle = new THREE.Mesh(wrinkleGeo, wrinkleMat);
      wrinkle.scale.set(0.28 - i * 0.04, 0.015, 0.04);
      wrinkle.position.set(0, 0.26 + i * 0.04, 0.22);
      this._head.add(wrinkle);
    }

    // Nose — broad
    const noseGeo = new THREE.SphereGeometry(1, 16, 12);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.scale.set(0.08, 0.1, 0.1);
    nose.position.set(0, -0.05, 0.3);
    this._head.add(nose);

    // Nostrils
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 10, 8);
      const nostril = new THREE.Mesh(nostrilGeo, darkMat);
      nostril.position.set(side * 0.04, -0.08, 0.35);
      this._head.add(nostril);
    }

    // Jaw — heavy, wide
    const jawGeo = new THREE.SphereGeometry(1, 18, 14);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.scale.set(0.32, 0.18, 0.22);
    jaw.position.set(0, -0.2, 0.1);
    this._head.add(jaw);

    // Teeth
    for (let i = -2; i <= 2; i++) {
      const toothGeo = new THREE.ConeGeometry(0.02, 0.06, 10);
      const tooth = new THREE.Mesh(toothGeo, boneMat);
      tooth.position.set(i * 0.06, -0.28, 0.18);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // Ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(1, 16, 12);
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
      const shoulderGeo = new THREE.SphereGeometry(0.2, 16, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, skinMat);
      arm.add(shoulder);

      // Upper arm
      const upperGeo = cyl(0.18, 0.15, 0.9, 14);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.45;
      arm.add(upper);

      // Bicep muscle bulge
      const bicepGeo = new THREE.SphereGeometry(0.1, 14, 12);
      const bicep = new THREE.Mesh(bicepGeo, veinMat);
      bicep.scale.set(1.0, 0.7, 0.8);
      bicep.position.set(0, -0.35, 0.08);
      arm.add(bicep);

      // Forearm
      const foreGeo = cyl(0.15, 0.12, 0.85, 14);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -1.2;
      arm.add(fore);

      // Forearm vein detail
      const foreVeinGeo = new THREE.SphereGeometry(1, 12, 10);
      const foreVein = new THREE.Mesh(foreVeinGeo, veinMat);
      foreVein.scale.set(0.03, 0.25, 0.02);
      foreVein.position.set(side * 0.07, -1.1, 0.06);
      arm.add(foreVein);

      // Elbow bump
      const elbowGeo = new THREE.SphereGeometry(0.08, 12, 10);
      const elbow = new THREE.Mesh(elbowGeo, skinMat);
      elbow.position.set(0, -0.85, -0.06);
      arm.add(elbow);

      // Hand
      const handGeo = new THREE.SphereGeometry(0.16, 16, 12);
      const hand = new THREE.Mesh(handGeo, darkMat);
      hand.position.y = -1.7;
      arm.add(hand);

      // Knuckle ridges
      for (let k = -1; k <= 1; k++) {
        const knuckleGeo = new THREE.SphereGeometry(0.035, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkMat);
        knuckle.position.set(k * 0.06, -1.76, 0.1);
        arm.add(knuckle);
      }
    }

    // Boulder in right hand
    const boulderGeo = new THREE.SphereGeometry(0.25, 18, 14);
    const boulder = new THREE.Mesh(boulderGeo, mat(0x888888, { roughness: 0.9 }));
    boulder.position.y = -1.95;
    this._rightArm.add(boulder);

    // Boulder cracks / texture detail
    for (let i = 0; i < 4; i++) {
      const crackGeo = new THREE.SphereGeometry(1, 10, 8);
      const crack = new THREE.Mesh(crackGeo, mat(0x666666, { roughness: 1.0 }));
      const a = (i / 4) * Math.PI * 2;
      crack.scale.set(0.02, 0.08, 0.02);
      crack.position.set(Math.cos(a) * 0.15, -1.95 + Math.sin(a) * 0.1, Math.sin(a) * 0.15);
      this._rightArm.add(crack);
    }

    // ---- Legs — tree-trunk thick ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.7, 0.0);
      this._body.add(leg);

      // Thigh
      const thighGeo = cyl(0.22, 0.18, 0.85, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.42;
      leg.add(thigh);

      // Quad muscle bulge
      const quadGeo = new THREE.SphereGeometry(0.1, 14, 10);
      const quad = new THREE.Mesh(quadGeo, veinMat);
      quad.scale.set(1.0, 0.8, 0.7);
      quad.position.set(0, -0.35, 0.1);
      leg.add(quad);

      // Knee cap
      const kneeGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const knee = new THREE.Mesh(kneeGeo, skinMat);
      knee.position.set(0, -0.8, 0.08);
      leg.add(knee);

      // Shin
      const shinGeo = cyl(0.18, 0.13, 0.75, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -1.1;
      leg.add(shin);

      // Calf muscle
      const calfGeo = new THREE.SphereGeometry(0.09, 14, 10);
      const calfMuscle = new THREE.Mesh(calfGeo, veinMat);
      calfMuscle.scale.set(0.8, 1.2, 0.8);
      calfMuscle.position.set(0, -1.0, -0.08);
      leg.add(calfMuscle);

      // Foot
      const footGeo = new THREE.SphereGeometry(1, 18, 14);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.scale.set(0.16, 0.1, 0.24);
      foot.position.set(0, -1.55, 0.08);
      leg.add(foot);

      // Toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.04, 10, 8);
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
      const boneGeo = new THREE.ConeGeometry(0.025, 0.12, 10);
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set(Math.sin(angle) * 0.55, 3.6, Math.cos(angle) * 0.45);
      bone.rotation.z = Math.sin(angle) * 0.3;
      this._body.add(bone);
    }

    // Skin wrinkle folds on sides
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const foldGeo = new THREE.SphereGeometry(1, 12, 10);
        const fold = new THREE.Mesh(foldGeo, wrinkleMat);
        fold.scale.set(0.04, 0.18, 0.02);
        fold.position.set(side * 0.6, 2.6 + i * 0.25, 0.0);
        this._body.add(fold);
      }
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
    const glossMat = mat(0x252540);
    const textureMat = mat(0x1e1e30);

    // ---- Abdomen — large, bulbous rear section ----
    const abdomenGeo = new THREE.SphereGeometry(1, 22, 18);
    const abdomen = new THREE.Mesh(abdomenGeo, blackMat);
    abdomen.scale.set(0.55, 0.45, 0.7);
    abdomen.position.set(0, 1.2, -0.6);
    this._body.add(abdomen);

    // Abdomen surface gloss highlights — slight color-shifted overlays
    for (const side of [-1, 1]) {
      const glossGeo = new THREE.SphereGeometry(1, 16, 12);
      const gloss = new THREE.Mesh(glossGeo, glossMat);
      gloss.scale.set(0.25, 0.2, 0.35);
      gloss.position.set(side * 0.2, 1.3, -0.6);
      this._body.add(gloss);
    }

    // Abdomen markings (hourglass / chevron shapes)
    for (let i = 0; i < 3; i++) {
      const markGeo = new THREE.SphereGeometry(1, 16, 12);
      const mark = new THREE.Mesh(markGeo, purpleMat);
      mark.scale.set(0.12 - i * 0.02, 0.04, 0.06);
      mark.position.set(0, 1.38, -0.45 - i * 0.22);
      this._body.add(mark);
    }

    // Abdomen underside pattern
    const underMarkGeo = new THREE.SphereGeometry(1, 16, 12);
    const underMark = new THREE.Mesh(underMarkGeo, mat(0x441133));
    underMark.scale.set(0.15, 0.03, 0.12);
    underMark.position.set(0, 0.88, -0.6);
    this._body.add(underMark);

    // Abdomen texture dimples — subtle surface variation
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const dimpleGeo = new THREE.SphereGeometry(0.03, 10, 8);
      const dimple = new THREE.Mesh(dimpleGeo, textureMat);
      dimple.position.set(
        Math.cos(ang) * 0.35,
        1.2 + Math.sin(ang) * 0.15,
        -0.6 + Math.sin(ang) * 0.4,
      );
      this._body.add(dimple);
    }

    // Spinnerets at back
    for (let i = -1; i <= 1; i++) {
      const spinGeo = new THREE.ConeGeometry(0.03, 0.1, 12);
      const spin = new THREE.Mesh(spinGeo, purpleMat);
      spin.position.set(i * 0.06, 1.0, -1.22);
      spin.rotation.x = Math.PI * 0.6;
      this._body.add(spin);
    }

    // ---- Cephalothorax — front body section ----
    const cephGeo = new THREE.SphereGeometry(1, 20, 16);
    const ceph = new THREE.Mesh(cephGeo, blackMat);
    ceph.scale.set(0.4, 0.32, 0.4);
    ceph.position.set(0, 1.3, 0.2);
    this._body.add(ceph);

    // Cephalothorax carapace ridge — dorsal line
    const carapaceGeo = new THREE.SphereGeometry(1, 14, 10);
    const carapace = new THREE.Mesh(carapaceGeo, textureMat);
    carapace.scale.set(0.05, 0.06, 0.3);
    carapace.position.set(0, 1.48, 0.2);
    this._body.add(carapace);

    // Narrow waist connecting cephalothorax and abdomen
    const waistGeo = cyl(0.1, 0.12, 0.2, 14);
    const waist = new THREE.Mesh(waistGeo, blackMat);
    waist.position.set(0, 1.2, -0.15);
    waist.rotation.x = Math.PI / 2;
    this._body.add(waist);

    // ---- Head ----
    this._head.position.set(0, 1.5, 0.5);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 18, 14);
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
      const eGeo = new THREE.SphereGeometry(ep.r, 14, 12);
      const eMesh = new THREE.Mesh(eGeo, eyeMat);
      eMesh.position.set(ep.x, ep.y, ep.z);
      this._head.add(eMesh);
    }

    // ---- Fangs / chelicerae — on _rightArm for attack animation ----
    this._rightArm.position.set(0, 1.35, 0.55);
    this._body.add(this._rightArm);

    for (const side of [-1, 1]) {
      // Fang base segment
      const baseGeo = cyl(0.04, 0.035, 0.15, 12);
      const base = new THREE.Mesh(baseGeo, blackMat);
      base.position.set(side * 0.08, -0.05, 0.05);
      base.rotation.x = 0.3;
      this._rightArm.add(base);

      // Fang tip — curved, pointed
      const tipGeo = new THREE.ConeGeometry(0.025, 0.14, 12);
      const tip = new THREE.Mesh(tipGeo, fangMat);
      tip.position.set(side * 0.08, -0.18, 0.08);
      tip.rotation.x = 0.2;
      this._rightArm.add(tip);

      // Fang venom drop — tiny glowing bead
      const venomGeo = new THREE.SphereGeometry(0.012, 12, 10);
      const venom = new THREE.Mesh(venomGeo, mat(0x33cc33, { emissive: 0x115511, transparent: true, opacity: 0.8 }));
      venom.position.set(side * 0.08, -0.26, 0.09);
      this._rightArm.add(venom);

      // Fang ridge / serration detail
      const ridgeGeo = new THREE.SphereGeometry(1, 10, 8);
      const ridge = new THREE.Mesh(ridgeGeo, fangMat);
      ridge.scale.set(0.008, 0.04, 0.008);
      ridge.position.set(side * 0.08, -0.12, 0.09);
      this._rightArm.add(ridge);
    }

    // Pedipalps (small feelers beside fangs)
    for (const side of [-1, 1]) {
      const palpGeo = cyl(0.015, 0.02, 0.1, 10);
      const palp = new THREE.Mesh(palpGeo, darkLegMat);
      palp.position.set(side * 0.14, -0.02, 0.08);
      palp.rotation.x = 0.5;
      palp.rotation.z = side * 0.3;
      this._rightArm.add(palp);

      // Pedipalp tip bulb
      const palpTipGeo = new THREE.SphereGeometry(0.018, 10, 8);
      const palpTip = new THREE.Mesh(palpTipGeo, darkLegMat);
      palpTip.position.set(side * 0.15, -0.1, 0.12);
      this._rightArm.add(palpTip);
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
        const coxaGeo = cyl(0.04, 0.035, 0.2, 12);
        const coxa = new THREE.Mesh(coxaGeo, darkLegMat);
        coxa.rotation.z = lp.spreadX * 0.8;
        coxa.rotation.x = lp.spreadZ * 0.3;
        coxa.position.set(sideData.side * 0.1, 0, lp.spreadZ * 0.05);
        legGroup.add(coxa);

        // Femur — long, angled outward and upward
        const femurGeo = cyl(0.032, 0.025, 0.55, 12);
        const femur = new THREE.Mesh(femurGeo, blackMat);
        femur.position.set(sideData.side * 0.35, 0.25, lp.spreadZ * 0.25);
        femur.rotation.z = lp.spreadX * 0.55;
        femur.rotation.x = lp.spreadZ * 0.4;
        legGroup.add(femur);

        // Joint knob between femur and tibia
        const jointGeo = new THREE.SphereGeometry(0.028, 10, 8);
        const joint = new THREE.Mesh(jointGeo, darkLegMat);
        joint.position.set(sideData.side * 0.48, 0.02, lp.spreadZ * 0.35);
        legGroup.add(joint);

        // Tibia — angled downward to ground
        const tibiaGeo = cyl(0.022, 0.01, 0.65, 12);
        const tibia = new THREE.Mesh(tibiaGeo, darkLegMat);
        tibia.position.set(sideData.side * 0.6, -0.2, lp.spreadZ * 0.45);
        tibia.rotation.z = -sideData.side * 0.6;
        tibia.rotation.x = lp.spreadZ * 0.3;
        legGroup.add(tibia);

        // Pointed tip
        const tipGeo = new THREE.ConeGeometry(0.015, 0.06, 10);
        const tip = new THREE.Mesh(tipGeo, fangMat);
        tip.position.set(sideData.side * 0.7, -0.55, lp.spreadZ * 0.55);
        tip.rotation.z = -sideData.side * 0.3;
        legGroup.add(tip);

        // Bristles / hair on femur and tibia
        for (let b = 0; b < 3; b++) {
          const bristleGeo = new THREE.ConeGeometry(0.006, 0.05, 6);
          const bristle = new THREE.Mesh(bristleGeo, bristleMat);
          bristle.position.set(
            sideData.side * (0.3 + b * 0.12),
            0.22 - b * 0.2,
            lp.spreadZ * (0.2 + b * 0.08) + (b % 2 === 0 ? 0.02 : -0.02),
          );
          bristle.rotation.z = -sideData.side * 0.8;
          legGroup.add(bristle);
        }

        // Extra bristle pairs for more hairy appearance
        for (let b = 0; b < 2; b++) {
          const extraBristleGeo = new THREE.ConeGeometry(0.005, 0.04, 5);
          const extraBristle = new THREE.Mesh(extraBristleGeo, bristleMat);
          extraBristle.position.set(
            sideData.side * (0.25 + b * 0.2),
            0.1 - b * 0.25,
            lp.spreadZ * (0.15 + b * 0.12) + 0.03,
          );
          extraBristle.rotation.z = -sideData.side * 1.0;
          legGroup.add(extraBristle);
        }
      }
    }

    // Abdomen bristles — scattered tiny spines
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const bGeo = new THREE.ConeGeometry(0.008, 0.06, 6);
      const b = new THREE.Mesh(bGeo, bristleMat);
      b.position.set(
        Math.cos(angle) * (0.25 + Math.random() * 0.2),
        1.2 + Math.random() * 0.3,
        -0.6 + Math.sin(angle) * (0.3 + Math.random() * 0.2),
      );
      b.rotation.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5);
      this._body.add(b);
    }

    // Silk gland bumps on abdomen rear
    for (let i = 0; i < 3; i++) {
      const glandGeo = new THREE.SphereGeometry(0.025, 10, 8);
      const gland = new THREE.Mesh(glandGeo, purpleMat);
      const a = -0.3 + i * 0.3;
      gland.position.set(Math.sin(a) * 0.15, 0.95, -1.1 + Math.cos(a) * 0.05);
      this._body.add(gland);
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
    const moistMat = mat(0x357a2f);
    const veinMat = mat(0x245220);

    // ---- Body — wide, squat, flattened sphere ----
    const bodyGeo = new THREE.SphereGeometry(1, 22, 18);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.scale.set(0.7, 0.45, 0.6);
    body.position.set(0, 1.0, 0.0);
    this._body.add(body);

    // Belly — lighter underside
    const bellyGeo = new THREE.SphereGeometry(1, 20, 16);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.6, 0.35, 0.5);
    belly.position.set(0, 0.85, 0.08);
    this._body.add(belly);

    // Belly fold wrinkles — skin creases
    for (let i = 0; i < 3; i++) {
      const foldGeo = new THREE.SphereGeometry(1, 14, 10);
      const fold = new THREE.Mesh(foldGeo, veinMat);
      fold.scale.set(0.4, 0.015, 0.3);
      fold.position.set(0, 0.72 + i * 0.06, 0.05 + i * 0.03);
      this._body.add(fold);
    }

    // Throat pouch — bulging underneath
    const throatGeo = new THREE.SphereGeometry(1, 18, 14);
    const throat = new THREE.Mesh(throatGeo, mat(0x9aaa4b));
    throat.scale.set(0.3, 0.2, 0.28);
    throat.position.set(0, 0.6, 0.35);
    this._body.add(throat);

    // Throat pouch wrinkle lines
    for (let i = 0; i < 4; i++) {
      const twGeo = new THREE.SphereGeometry(1, 12, 10);
      const tw = new THREE.Mesh(twGeo, mat(0x889a3b));
      tw.scale.set(0.2 - i * 0.03, 0.01, 0.02);
      tw.position.set(0, 0.52 + i * 0.04, 0.42);
      this._body.add(tw);
    }

    // Bumpy / warty skin texture — random warts on body
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const yOff = Math.random() * 0.5;
      const wartGeo = new THREE.SphereGeometry(0.025 + Math.random() * 0.025, 10, 8);
      const wart = new THREE.Mesh(wartGeo, darkSkinMat);
      wart.position.set(
        Math.cos(angle) * (0.45 + Math.random() * 0.2),
        0.85 + yOff,
        Math.sin(angle) * (0.35 + Math.random() * 0.15),
      );
      this._body.add(wart);
    }

    // Moisture sheen spots — slight color-shifted overlays for wet look
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const moistGeo = new THREE.SphereGeometry(1, 14, 10);
      const moist = new THREE.Mesh(moistGeo, moistMat);
      moist.scale.set(0.12, 0.04, 0.1);
      moist.position.set(
        Math.cos(ang) * 0.4,
        1.05 + Math.sin(ang) * 0.1,
        Math.sin(ang) * 0.35,
      );
      this._body.add(moist);
    }

    // Back ridges — line of bumps along spine
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.SphereGeometry(0.03 + i * 0.005, 10, 8);
      const ridge = new THREE.Mesh(ridgeGeo, darkSkinMat);
      ridge.position.set(0, 1.3, -0.1 + i * -0.1);
      this._body.add(ridge);
    }

    // ---- Head — wide, flat, with prominent jaw line ----
    this._head.position.set(0, 1.15, 0.55);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.35, 0.2, 0.25);
    this._head.add(headMesh);

    // Wide mouth / jaw line — dark seam
    const mouthGeo = new THREE.PlaneGeometry(0.5, 0.04);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.04, 0.2);
    mouth.rotation.x = -0.1;
    this._head.add(mouth);

    // Jawline ridges — subtle muscle definition
    for (const side of [-1, 1]) {
      const jawRidgeGeo = new THREE.SphereGeometry(1, 14, 10);
      const jawRidge = new THREE.Mesh(jawRidgeGeo, darkSkinMat);
      jawRidge.scale.set(0.08, 0.03, 0.12);
      jawRidge.position.set(side * 0.15, -0.06, 0.1);
      this._head.add(jawRidge);
    }

    // Nostrils — two small bumps
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 10, 8);
      const nostril = new THREE.Mesh(nostrilGeo, darkSkinMat);
      nostril.position.set(side * 0.06, 0.06, 0.22);
      this._head.add(nostril);
    }

    // Head warts
    for (let i = 0; i < 3; i++) {
      const hwGeo = new THREE.SphereGeometry(0.015, 8, 6);
      const hw = new THREE.Mesh(hwGeo, darkSkinMat);
      hw.position.set(-0.1 + i * 0.1, 0.12, 0.18 - i * 0.04);
      this._head.add(hw);
    }

    // ---- Eyes — large, bulging, on top of head ----
    for (const side of [-1, 1]) {
      // Eye dome — protruding bump
      const eyeDomeGeo = new THREE.SphereGeometry(1, 18, 14);
      const eyeDome = new THREE.Mesh(eyeDomeGeo, skinMat);
      eyeDome.scale.set(0.1, 0.1, 0.1);
      eyeDome.position.set(side * 0.18, 0.18, 0.1);
      this._head.add(eyeDome);

      // Eyeball
      const eyeGeo = new THREE.SphereGeometry(0.075, 18, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.18, 0.22, 0.13);
      this._head.add(eye);

      // Pupil — horizontal slit
      const pupilGeo = new THREE.SphereGeometry(0.03, 14, 12);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.scale.set(0.4, 1.0, 0.5);
      pupil.position.set(side * 0.18, 0.22, 0.2);
      this._head.add(pupil);

      // Eyelid ridge
      const lidGeo = new THREE.SphereGeometry(1, 16, 12);
      const lid = new THREE.Mesh(lidGeo, darkSkinMat);
      lid.scale.set(0.1, 0.04, 0.08);
      lid.position.set(side * 0.18, 0.28, 0.12);
      this._head.add(lid);

      // Lower eyelid crease
      const lowerLidGeo = new THREE.SphereGeometry(1, 12, 10);
      const lowerLid = new THREE.Mesh(lowerLidGeo, veinMat);
      lowerLid.scale.set(0.08, 0.02, 0.06);
      lowerLid.position.set(side * 0.18, 0.16, 0.14);
      this._head.add(lowerLid);
    }

    // Tongue — long cylinder from mouth, on _head so it extends with head motion
    const tongueBase = new THREE.Group();
    tongueBase.position.set(0, -0.06, 0.2);
    tongueBase.rotation.x = 0.25;
    this._head.add(tongueBase);

    const tongueCylGeo = cyl(0.025, 0.015, 0.6, 12);
    const tongueCyl = new THREE.Mesh(tongueCylGeo, tongueMat);
    tongueCyl.position.y = -0.3;
    tongueBase.add(tongueCyl);

    // Tongue tip — forked / sticky blob
    const tongueTipGeo = new THREE.SphereGeometry(0.03, 14, 12);
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
      const thighGeo = cyl(0.16, 0.12, 0.5, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.set(side * 0.1, -0.15, -0.1);
      thigh.rotation.z = side * 0.3;
      thigh.rotation.x = -0.4;
      leg.add(thigh);

      // Thigh muscle bulge
      const thighMuscleGeo = new THREE.SphereGeometry(0.08, 14, 10);
      const thighMuscle = new THREE.Mesh(thighMuscleGeo, moistMat);
      thighMuscle.scale.set(1.0, 0.7, 0.8);
      thighMuscle.position.set(side * 0.12, -0.1, -0.05);
      leg.add(thighMuscle);

      // Knee joint — bulge
      const kneeGeo = new THREE.SphereGeometry(0.1, 16, 12);
      const knee = new THREE.Mesh(kneeGeo, skinMat);
      knee.position.set(side * 0.2, -0.4, -0.3);
      leg.add(knee);

      // Shin — bent down from knee
      const shinGeo = cyl(0.1, 0.07, 0.5, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.set(side * 0.2, -0.7, -0.15);
      shin.rotation.x = 0.5;
      leg.add(shin);

      // Shin tendon ridge
      const tendonGeo = new THREE.SphereGeometry(1, 12, 10);
      const tendon = new THREE.Mesh(tendonGeo, veinMat);
      tendon.scale.set(0.02, 0.15, 0.02);
      tendon.position.set(side * 0.2, -0.65, -0.2);
      leg.add(tendon);

      // Foot — wide, webbed disc
      const footGeo = new THREE.SphereGeometry(1, 18, 12);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.14, 0.04, 0.2);
      foot.position.set(side * 0.2, -1.0, -0.02);
      leg.add(foot);

      // Webbed toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(1, 12, 10);
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
        const wGeo = new THREE.SphereGeometry(0.018 + Math.random() * 0.01, 8, 6);
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
      const upperGeo = cyl(0.08, 0.065, 0.3, 12);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.set(side * 0.05, -0.15, 0.0);
      upper.rotation.z = side * 0.25;
      arm.add(upper);

      // Forearm
      const foreGeo = cyl(0.06, 0.045, 0.28, 12);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.set(side * 0.1, -0.42, 0.0);
      arm.add(fore);

      // Elbow bump
      const elbowGeo = new THREE.SphereGeometry(0.04, 10, 8);
      const elbow = new THREE.Mesh(elbowGeo, skinMat);
      elbow.position.set(side * 0.08, -0.3, -0.03);
      arm.add(elbow);

      // Small webbed foot
      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.08, 0.025, 0.1);
      foot.position.set(side * 0.1, -0.6, 0.03);
      arm.add(foot);

      // Small toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.015, 10, 8);
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
      const spotGeo = new THREE.SphereGeometry(0.035 + Math.random() * 0.03, 12, 10);
      const spot = new THREE.Mesh(spotGeo, mat(0x1e4a1a));
      spot.position.set(
        Math.cos(angle) * (0.3 + Math.random() * 0.25),
        1.2 + Math.random() * 0.15,
        Math.sin(angle) * (0.25 + Math.random() * 0.2),
      );
      spot.scale.y = 0.4;
      this._body.add(spot);
    }

    // Flank skin folds — lateral wrinkle detail
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const flankGeo = new THREE.SphereGeometry(1, 12, 10);
        const flank = new THREE.Mesh(flankGeo, veinMat);
        flank.scale.set(0.04, 0.12, 0.02);
        flank.position.set(side * 0.55, 0.9 + i * 0.12, -0.1);
        this._body.add(flank);
      }
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
    const wrinkleMat = mat(0x505050);      // wrinkle fold color
    const scarMat = mat(0x525258);         // battle scar overlay

    // ---- Main body — massive barrel torso ----
    const torsoGeo = new THREE.SphereGeometry(1, 22, 18);
    const torso = new THREE.Mesh(torsoGeo, hideMat);
    torso.scale.set(0.75, 0.6, 1.1);
    torso.position.set(0, 1.4, 0);
    this._body.add(torso);

    // Belly — lighter underside, slightly protruding
    const bellyGeo = new THREE.SphereGeometry(1, 20, 16);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.6, 0.4, 0.9);
    belly.position.set(0, 1.1, 0.05);
    this._body.add(belly);

    // Rib cage hints — subtle surface bumps along flanks
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const ribGeo = new THREE.SphereGeometry(1, 12, 10);
        const rib = new THREE.Mesh(ribGeo, wrinkleMat);
        rib.scale.set(0.04, 0.08, 0.18);
        rib.position.set(side * 0.55, 1.3 + i * 0.08, 0.2 - i * 0.15);
        this._body.add(rib);
      }
    }

    // Rear haunch — heavy rump
    const haunchGeo = new THREE.SphereGeometry(1, 18, 14);
    const haunch = new THREE.Mesh(haunchGeo, hideMat);
    haunch.scale.set(0.65, 0.55, 0.5);
    haunch.position.set(0, 1.5, -0.7);
    this._body.add(haunch);

    // Shoulder hump — muscular mass above forelegs
    const shoulderGeo = new THREE.SphereGeometry(1, 18, 14);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, hideMat);
    shoulderMesh.scale.set(0.65, 0.5, 0.5);
    shoulderMesh.position.set(0, 1.7, 0.65);
    this._body.add(shoulderMesh);

    // Shoulder muscle definition — trapezius overlay
    const trapGeo = new THREE.SphereGeometry(1, 16, 12);
    const trap = new THREE.Mesh(trapGeo, wrinkleMat);
    trap.scale.set(0.5, 0.15, 0.3);
    trap.position.set(0, 1.9, 0.65);
    this._body.add(trap);

    // ---- Armor plates — overlapping on shoulders and flanks ----
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const plateGeo = new THREE.SphereGeometry(1, 16, 12);
        const plate = new THREE.Mesh(plateGeo, armorMat);
        plate.scale.set(0.22, 0.12, 0.2);
        plate.position.set(side * 0.5, 1.8 - i * 0.15, 0.55 - i * 0.2);
        this._body.add(plate);
      }
    }

    // Spine ridges — armored crest along the back
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.SphereGeometry(1, 16, 12);
      const ridge = new THREE.Mesh(ridgeGeo, armorMat);
      ridge.scale.set(0.35, 0.08, 0.12);
      ridge.position.set(0, 2.0, 0.5 - i * 0.3);
      this._body.add(ridge);
    }

    // ---- Skin detail — bumps and wrinkles ----
    for (let i = 0; i < 10; i++) {
      const bumpGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 10, 8);
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
        const foldGeo = cyl(0.02, 0.02, 0.3, 10);
        const fold = new THREE.Mesh(foldGeo, armorMat);
        fold.position.set(side * 0.6, 1.3 + i * 0.15, 0.1 - i * 0.1);
        fold.rotation.z = Math.PI / 2;
        fold.rotation.y = side * 0.3;
        this._body.add(fold);
      }
    }

    // Battle scars — color-shifted surface marks
    for (let i = 0; i < 4; i++) {
      const scarGeo = new THREE.SphereGeometry(1, 12, 10);
      const scar = new THREE.Mesh(scarGeo, scarMat);
      scar.scale.set(0.03, 0.12, 0.02);
      const ang = (i / 4) * Math.PI * 2;
      scar.position.set(
        Math.cos(ang) * 0.55,
        1.4 + Math.sin(ang) * 0.2,
        0.1 + i * 0.15,
      );
      scar.rotation.z = 0.2 + i * 0.3;
      this._body.add(scar);
    }

    // ---- Neck — thick, angled forward ----
    const neckGeo = cyl(0.35, 0.4, 0.5, 14);
    const neck = new THREE.Mesh(neckGeo, hideMat);
    neck.position.set(0, 1.6, 0.9);
    neck.rotation.x = 0.5;
    this._body.add(neck);

    // Neck skin folds
    for (let i = 0; i < 3; i++) {
      const nfGeo = new THREE.SphereGeometry(1, 14, 10);
      const nf = new THREE.Mesh(nfGeo, wrinkleMat);
      nf.scale.set(0.3, 0.02, 0.25);
      nf.position.set(0, 1.5 + i * 0.08, 0.85 + i * 0.05);
      this._body.add(nf);
    }

    // ---- Head — heavy, elongated ----
    this._head.position.set(0, 1.4, 1.3);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, hideMat);
    headMesh.scale.set(0.3, 0.25, 0.4);
    this._head.add(headMesh);

    // Snout — elongated front of the face
    const snoutGeo = new THREE.SphereGeometry(1, 18, 14);
    const snout = new THREE.Mesh(snoutGeo, hideMat);
    snout.scale.set(0.22, 0.18, 0.25);
    snout.position.set(0, -0.05, 0.3);
    this._head.add(snout);

    // Jaw — heavy underjaw
    const jawGeo = new THREE.SphereGeometry(1, 16, 12);
    const jaw = new THREE.Mesh(jawGeo, hideMat);
    jaw.scale.set(0.2, 0.1, 0.28);
    jaw.position.set(0, -0.15, 0.15);
    this._head.add(jaw);

    // Cheek / jowl bulges
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.SphereGeometry(1, 14, 10);
      const cheek = new THREE.Mesh(cheekGeo, hideMat);
      cheek.scale.set(0.08, 0.08, 0.12);
      cheek.position.set(side * 0.2, -0.08, 0.2);
      this._head.add(cheek);
    }

    // Snout wrinkle lines
    for (let i = 0; i < 3; i++) {
      const swGeo = new THREE.SphereGeometry(1, 12, 10);
      const sw = new THREE.Mesh(swGeo, wrinkleMat);
      sw.scale.set(0.16 - i * 0.03, 0.01, 0.03);
      sw.position.set(0, 0.02 + i * 0.04, 0.4 + i * 0.04);
      this._head.add(sw);
    }

    // ---- Great horn — large cone on the nose (attack weapon) ----
    const mainHornGeo = new THREE.ConeGeometry(0.1, 0.55, 14);
    const mainHorn = new THREE.Mesh(mainHornGeo, hornMat);
    mainHorn.position.set(0, 0.2, 0.5);
    mainHorn.rotation.x = -0.6;
    this._head.add(mainHorn);

    // Horn texture ridges — growth ring lines
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.SphereGeometry(1, 12, 10);
      const ring = new THREE.Mesh(ringGeo, mat(0xc4b898));
      ring.scale.set(0.06 - i * 0.01, 0.01, 0.06 - i * 0.01);
      ring.position.set(0, 0.08 + i * 0.1, 0.52 - i * 0.03);
      ring.rotation.x = -0.6;
      this._head.add(ring);
    }

    // Second smaller horn behind the main one
    const smallHornGeo = new THREE.ConeGeometry(0.06, 0.25, 12);
    const smallHorn = new THREE.Mesh(smallHornGeo, hornMat);
    smallHorn.position.set(0, 0.22, 0.2);
    smallHorn.rotation.x = -0.4;
    this._head.add(smallHorn);

    // ---- Eyes — small, beady, on sides of head ----
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.035, 14, 12);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.22, 0.05, 0.18);
      this._head.add(eye);

      // Eyelid fold
      const eyeLidGeo = new THREE.SphereGeometry(1, 12, 10);
      const eyeLid = new THREE.Mesh(eyeLidGeo, hideMat);
      eyeLid.scale.set(0.04, 0.02, 0.04);
      eyeLid.position.set(side * 0.22, 0.08, 0.19);
      this._head.add(eyeLid);
    }

    // ---- Ears — small, thick stubs ----
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.04, 0.1, 10);
      const ear = new THREE.Mesh(earGeo, hideMat);
      ear.position.set(side * 0.2, 0.2, -0.05);
      ear.rotation.z = side * 0.3;
      this._head.add(ear);
    }

    // Nostrils — dark pits at snout tip
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.03, 10, 8);
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
      const frontUpperGeo = cyl(0.16, 0.14, 0.5, 14);
      const frontUpper = new THREE.Mesh(frontUpperGeo, hideMat);
      frontUpper.position.set(0, -0.15, 0.55);
      leg.add(frontUpper);

      // Front leg — lower
      const frontLowerGeo = cyl(0.14, 0.12, 0.45, 14);
      const frontLower = new THREE.Mesh(frontLowerGeo, hideMat);
      frontLower.position.set(0, -0.55, 0.55);
      leg.add(frontLower);

      // Front knee joint
      const frontKneeGeo = new THREE.SphereGeometry(0.13, 14, 12);
      const frontKnee = new THREE.Mesh(frontKneeGeo, hideMat);
      frontKnee.position.set(0, -0.38, 0.55);
      leg.add(frontKnee);

      // Front hoof — flat cylinder
      const frontHoofGeo = cyl(0.14, 0.15, 0.06, 14);
      const frontHoof = new THREE.Mesh(frontHoofGeo, hoofMat);
      frontHoof.position.set(0, -0.8, 0.55);
      leg.add(frontHoof);

      // Front leg muscle bulge
      const frontMuscleGeo = new THREE.SphereGeometry(0.07, 12, 10);
      const frontMuscle = new THREE.Mesh(frontMuscleGeo, wrinkleMat);
      frontMuscle.scale.set(1.0, 0.8, 0.8);
      frontMuscle.position.set(0, -0.22, 0.6);
      leg.add(frontMuscle);

      // Back leg — upper (thicker haunches)
      const backUpperGeo = cyl(0.18, 0.15, 0.5, 14);
      const backUpper = new THREE.Mesh(backUpperGeo, hideMat);
      backUpper.position.set(0, -0.15, -0.5);
      leg.add(backUpper);

      // Back leg — lower
      const backLowerGeo = cyl(0.15, 0.13, 0.45, 14);
      const backLower = new THREE.Mesh(backLowerGeo, hideMat);
      backLower.position.set(0, -0.55, -0.5);
      leg.add(backLower);

      // Back knee joint
      const backKneeGeo = new THREE.SphereGeometry(0.14, 14, 12);
      const backKnee = new THREE.Mesh(backKneeGeo, hideMat);
      backKnee.position.set(0, -0.38, -0.5);
      leg.add(backKnee);

      // Back hoof
      const backHoofGeo = cyl(0.15, 0.16, 0.06, 14);
      const backHoof = new THREE.Mesh(backHoofGeo, hoofMat);
      backHoof.position.set(0, -0.8, -0.5);
      leg.add(backHoof);

      // Back leg haunch muscle
      const haunchMuscleGeo = new THREE.SphereGeometry(0.08, 12, 10);
      const haunchMuscle = new THREE.Mesh(haunchMuscleGeo, wrinkleMat);
      haunchMuscle.scale.set(1.0, 0.8, 0.9);
      haunchMuscle.position.set(0, -0.1, -0.45);
      leg.add(haunchMuscle);

      // Ankle wrinkle folds
      for (const zPos of [0.55, -0.5]) {
        const ankleGeo = new THREE.SphereGeometry(1, 10, 8);
        const ankle = new THREE.Mesh(ankleGeo, wrinkleMat);
        ankle.scale.set(0.1, 0.015, 0.1);
        ankle.position.set(0, -0.7, zPos);
        leg.add(ankle);
      }
    }

    // ---- Tail — short with tuft ----
    const tailGeo = cyl(0.06, 0.03, 0.35, 12);
    const tail = new THREE.Mesh(tailGeo, hideMat);
    tail.position.set(0, 1.5, -1.15);
    tail.rotation.x = -0.7;
    this._body.add(tail);

    // Tail tuft
    const tuftGeo = new THREE.SphereGeometry(0.06, 12, 10);
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
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.35, 0.55, 0.28);
    torso.position.y = 2.0;
    this._body.add(torso);

    // Chest — gaunt, muscular pectorals
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 16, 12);
      const pect = new THREE.Mesh(pectGeo, skinMat);
      pect.scale.set(0.15, 0.12, 0.1);
      pect.position.set(side * 0.12, 2.2, 0.2);
      this._body.add(pect);
    }

    // Muscle definition — subtle deltoid/trapezius bulges
    for (const side of [-1, 1]) {
      const deltGeo = new THREE.SphereGeometry(1, 14, 10);
      const delt = new THREE.Mesh(deltGeo, skinMat);
      delt.scale.set(0.08, 0.1, 0.07);
      delt.position.set(side * 0.28, 2.35, 0.05);
      this._body.add(delt);
    }

    // Ribcage detail — visible ribs on the gaunt frame
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const ribGeo = cyl(0.015, 0.015, 0.15, 12);
        const rib = new THREE.Mesh(ribGeo, darkSkinMat);
        rib.position.set(side * 0.22, 1.7 + i * 0.12, 0.12);
        rib.rotation.z = Math.PI / 2;
        rib.rotation.y = side * 0.4;
        this._body.add(rib);
      }
    }

    // Abdominal definition — lean sinew lines
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const absGeo = new THREE.SphereGeometry(1, 12, 10);
        const abs = new THREE.Mesh(absGeo, skinMat);
        abs.scale.set(0.06, 0.05, 0.04);
        abs.position.set(side * 0.07, 1.65 + i * 0.13, 0.22);
        this._body.add(abs);
      }
    }

    // Hunched upper back
    const hunchGeo = new THREE.SphereGeometry(1, 18, 14);
    const hunch = new THREE.Mesh(hunchGeo, skinMat);
    hunch.scale.set(0.32, 0.25, 0.25);
    hunch.position.set(0, 2.45, -0.15);
    this._body.add(hunch);

    // Spine ridge — bony protrusions along back
    for (let i = 0; i < 5; i++) {
      const spineGeo = new THREE.ConeGeometry(0.02, 0.06, 10);
      const spineBump = new THREE.Mesh(spineGeo, darkSkinMat);
      spineBump.position.set(0, 2.5 - i * 0.2, -0.25);
      spineBump.rotation.x = 0.4;
      this._body.add(spineBump);
    }

    // Back muscle ridges
    for (const side of [-1, 1]) {
      const backMuscleGeo = new THREE.SphereGeometry(1, 14, 10);
      const backMuscle = new THREE.Mesh(backMuscleGeo, darkSkinMat);
      backMuscle.scale.set(0.12, 0.3, 0.08);
      backMuscle.position.set(side * 0.15, 2.2, -0.2);
      this._body.add(backMuscle);
    }

    // ---- Head ----
    this._head.position.set(0, 2.75, 0.15);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.2, 0.22, 0.2);
    this._head.add(headMesh);

    // Bat snout — flattened, upturned nose
    const snoutGeo = new THREE.SphereGeometry(1, 16, 12);
    const snout = new THREE.Mesh(snoutGeo, skinMat);
    snout.scale.set(0.1, 0.08, 0.1);
    snout.position.set(0, -0.04, 0.17);
    this._head.add(snout);

    // Nostrils — wide bat-like slits
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.015, 10, 10);
      const nostril = new THREE.Mesh(nostrilGeo, darkSkinMat);
      nostril.position.set(side * 0.04, -0.02, 0.25);
      this._head.add(nostril);
    }

    // Nose wrinkle folds
    for (let i = 0; i < 3; i++) {
      const wrinkleGeo = cyl(0.004, 0.004, 0.06, 8);
      const wrinkle = new THREE.Mesh(wrinkleGeo, darkSkinMat);
      wrinkle.position.set(0, -0.01 + i * 0.015, 0.24);
      wrinkle.rotation.z = Math.PI / 2;
      this._head.add(wrinkle);
    }

    // Brow ridge — heavy, bat-like
    const browGeo = new THREE.SphereGeometry(1, 18, 12);
    const brow = new THREE.Mesh(browGeo, darkSkinMat);
    brow.scale.set(0.22, 0.06, 0.1);
    brow.position.set(0, 0.1, 0.14);
    this._head.add(brow);

    // ---- Large glowing red eyes ----
    for (const side of [-1, 1]) {
      // Eye socket
      const socketGeo = new THREE.SphereGeometry(1, 16, 12);
      const socket = new THREE.Mesh(socketGeo, darkSkinMat);
      socket.scale.set(0.07, 0.06, 0.04);
      socket.position.set(side * 0.1, 0.06, 0.16);
      this._head.add(socket);

      // Glowing eye
      const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 0.06, 0.18);
      this._head.add(eye);

      // Pupil — vertical slit
      const pupilGeo = new THREE.SphereGeometry(0.02, 12, 12);
      const pupil = new THREE.Mesh(pupilGeo, mat(0x110000));
      pupil.scale.set(0.4, 1.2, 1.0);
      pupil.position.set(side * 0.1, 0.06, 0.22);
      this._head.add(pupil);
    }

    // ---- Pointed bat ears — tall cones ----
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.06, 0.25, 12);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.15, 0.28, -0.02);
      ear.rotation.z = side * 0.2;
      this._head.add(ear);

      // Inner ear — darker membrane
      const innerEarGeo = new THREE.ConeGeometry(0.035, 0.18, 10);
      const innerEar = new THREE.Mesh(innerEarGeo, membraneMat);
      innerEar.position.set(side * 0.15, 0.26, 0.0);
      innerEar.rotation.z = side * 0.2;
      this._head.add(innerEar);

      // Ear vein detail
      const earVeinGeo = cyl(0.003, 0.003, 0.12, 6);
      const earVein = new THREE.Mesh(earVeinGeo, veinMat);
      earVein.position.set(side * 0.15, 0.24, 0.01);
      earVein.rotation.z = side * 0.2;
      this._head.add(earVein);
    }

    // ---- Fanged mouth ----
    const mouthGeo = new THREE.SphereGeometry(1, 16, 12);
    const mouth = new THREE.Mesh(mouthGeo, darkSkinMat);
    mouth.scale.set(0.1, 0.04, 0.08);
    mouth.position.set(0, -0.1, 0.16);
    this._head.add(mouth);

    // Large fangs — two prominent canines pointing down
    for (const side of [-1, 1]) {
      const fangGeo = new THREE.ConeGeometry(0.012, 0.08, 10);
      const fang = new THREE.Mesh(fangGeo, fangMat);
      fang.position.set(side * 0.04, -0.16, 0.18);
      fang.rotation.x = Math.PI;
      this._head.add(fang);
    }

    // Smaller teeth between fangs
    for (const xOff of [-0.06, -0.02, 0.02, 0.06]) {
      const toothGeo = new THREE.ConeGeometry(0.006, 0.03, 8);
      const tooth = new THREE.Mesh(toothGeo, fangMat);
      tooth.position.set(xOff, -0.13, 0.18);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // Chin wrinkles
    for (let i = 0; i < 2; i++) {
      const chinGeo = cyl(0.003, 0.003, 0.05, 8);
      const chin = new THREE.Mesh(chinGeo, darkSkinMat);
      chin.position.set(0, -0.12 - i * 0.02, 0.13);
      chin.rotation.z = Math.PI / 2;
      this._head.add(chin);
    }

    // ---- Wings — _leftArm = left wing, _rightArm = right wing ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.35, 2.4, -0.05);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.08, 16, 12);
      const shoulderJoint = new THREE.Mesh(shoulderGeo, skinMat);
      wing.add(shoulderJoint);

      // Upper arm bone
      const upperBoneGeo = cyl(0.04, 0.035, 0.6, 14);
      const upperBone = new THREE.Mesh(upperBoneGeo, skinMat);
      upperBone.position.set(side * 0.3, 0.0, 0.0);
      upperBone.rotation.z = side * 1.2;
      wing.add(upperBone);

      // Elbow joint
      const elbowGeo = new THREE.SphereGeometry(0.045, 14, 12);
      const elbow = new THREE.Mesh(elbowGeo, skinMat);
      elbow.position.set(side * 0.55, -0.15, 0.0);
      wing.add(elbow);

      // Forearm bone
      const foreBoneGeo = cyl(0.035, 0.025, 0.7, 14);
      const foreBone = new THREE.Mesh(foreBoneGeo, skinMat);
      foreBone.position.set(side * 0.85, -0.5, 0.0);
      foreBone.rotation.z = side * 0.6;
      wing.add(foreBone);

      // Tendon detail on upper arm
      const tendonGeo = cyl(0.006, 0.004, 0.4, 8);
      const tendon = new THREE.Mesh(tendonGeo, darkSkinMat);
      tendon.position.set(side * 0.32, 0.02, 0.03);
      tendon.rotation.z = side * 1.2;
      wing.add(tendon);

      // Finger bones — 3 long fingers radiating outward
      for (let f = 0; f < 3; f++) {
        const fingerAngle = side * (0.3 + f * 0.4);
        const fingerLen = 0.5 - f * 0.1;
        const fingerGeo = cyl(0.02, 0.012, fingerLen, 12);
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

        // Finger joint knuckle
        const knuckleGeo = new THREE.SphereGeometry(0.018, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, skinMat);
        knuckle.position.set(baseX, baseY, 0.0);
        wing.add(knuckle);
      }

      // Wing membrane — main panel (higher subdivisions for organic feel)
      const membraneGeo = new THREE.PlaneGeometry(1.2, 1.0, 4, 3);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 0.8, -0.5, 0.0);
      membrane.scale.set(side * 1, 1, 1);
      wing.add(membrane);

      // Lower membrane — connects wing to body
      const lowerMemGeo = new THREE.PlaneGeometry(0.7, 0.6, 3, 2);
      const lowerMem = new THREE.Mesh(lowerMemGeo, membraneMat);
      lowerMem.position.set(side * 0.4, -0.6, 0.0);
      lowerMem.scale.set(side * 1, 1, 1);
      wing.add(lowerMem);

      // Wing veins — thin dark cylinders across membrane
      for (let v = 0; v < 4; v++) {
        const veinLen = 0.6 + v * 0.15;
        const veinGeo = cyl(0.008, 0.005, veinLen, 8);
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
        const crossVeinGeo = cyl(0.005, 0.005, 0.3 + cv * 0.1, 8);
        const crossVein = new THREE.Mesh(crossVeinGeo, veinMat);
        crossVein.position.set(side * (0.6 + cv * 0.1), -0.35 - cv * 0.2, 0.005);
        crossVein.rotation.z = Math.PI / 2;
        wing.add(crossVein);
      }

      // Secondary vein branches — finer capillary detail
      for (let sv = 0; sv < 3; sv++) {
        const subVeinGeo = cyl(0.003, 0.002, 0.15, 6);
        const subVein = new THREE.Mesh(subVeinGeo, veinMat);
        subVein.position.set(
          side * (0.55 + sv * 0.12),
          -0.5 - sv * 0.08,
          0.006,
        );
        subVein.rotation.z = side * (0.5 + sv * 0.3);
        wing.add(subVein);
      }

      // Wing claw — small hook at the wing's wrist
      const wingClawGeo = new THREE.ConeGeometry(0.015, 0.06, 10);
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
      const thighGeo = cyl(0.1, 0.08, 0.55, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.28;
      leg.add(thigh);

      // Thigh muscle bulge
      const thighMuscleGeo = new THREE.SphereGeometry(1, 14, 10);
      const thighMuscle = new THREE.Mesh(thighMuscleGeo, skinMat);
      thighMuscle.scale.set(0.06, 0.1, 0.05);
      thighMuscle.position.set(0, -0.2, 0.06);
      leg.add(thighMuscle);

      // Shin — thin, angled forward (digitigrade stance)
      const shinGeo = cyl(0.07, 0.05, 0.5, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.set(0, -0.7, 0.08);
      shin.rotation.x = -0.2;
      leg.add(shin);

      // Ankle joint
      const ankleGeo = new THREE.SphereGeometry(0.055, 14, 12);
      const ankle = new THREE.Mesh(ankleGeo, skinMat);
      ankle.position.set(0, -0.95, 0.12);
      leg.add(ankle);

      // Ankle tendon detail
      const ankleTendonGeo = cyl(0.005, 0.003, 0.12, 8);
      const ankleTendon = new THREE.Mesh(ankleTendonGeo, darkSkinMat);
      ankleTendon.position.set(0, -0.88, 0.06);
      leg.add(ankleTendon);

      // Foot — elongated toe pad
      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.08, 0.04, 0.14);
      foot.position.set(0, -1.02, 0.18);
      leg.add(foot);

      // Claws — 3 forward-pointing talons
      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.012, 0.07, 10);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.03, -1.04, 0.28);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);
      }

      // Rear talon
      const rearClawGeo = new THREE.ConeGeometry(0.01, 0.05, 10);
      const rearClaw = new THREE.Mesh(rearClawGeo, clawMat);
      rearClaw.position.set(0, -1.03, 0.06);
      rearClaw.rotation.x = -Math.PI / 2;
      leg.add(rearClaw);
    }

    // ---- Vestigial tail ----
    const tailGeo = cyl(0.04, 0.015, 0.35, 12);
    const tail = new THREE.Mesh(tailGeo, skinMat);
    tail.position.set(0, 1.4, -0.3);
    tail.rotation.x = -0.8;
    this._body.add(tail);

    // Tail tip — pointed
    const tailTipGeo = new THREE.ConeGeometry(0.018, 0.08, 10);
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
    const mainTorsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const mainTorso = new THREE.Mesh(mainTorsoGeo, stoneMat);
    mainTorso.scale.set(0.7, 0.85, 0.55);
    mainTorso.position.y = 2.5;
    this._body.add(mainTorso);

    // Upper chest boulder
    const upperChestGeo = new THREE.SphereGeometry(1, 18, 14);
    const upperChest = new THREE.Mesh(upperChestGeo, darkStoneMat);
    upperChest.scale.set(0.6, 0.45, 0.5);
    upperChest.position.set(0, 3.1, 0.1);
    this._body.add(upperChest);

    // Left shoulder ridge boulder
    const lShoulderRidgeGeo = new THREE.SphereGeometry(1, 16, 12);
    const lShoulderRidge = new THREE.Mesh(lShoulderRidgeGeo, stoneMat);
    lShoulderRidge.scale.set(0.3, 0.25, 0.3);
    lShoulderRidge.position.set(-0.55, 3.3, 0.0);
    this._body.add(lShoulderRidge);

    // Right shoulder ridge boulder
    const rShoulderRidgeGeo = new THREE.SphereGeometry(1, 16, 12);
    const rShoulderRidge = new THREE.Mesh(rShoulderRidgeGeo, stoneMat);
    rShoulderRidge.scale.set(0.3, 0.25, 0.3);
    rShoulderRidge.position.set(0.55, 3.3, 0.0);
    this._body.add(rShoulderRidge);

    // Lower belly boulder
    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, darkStoneMat);
    belly.scale.set(0.55, 0.45, 0.45);
    belly.position.set(0, 1.9, 0.12);
    this._body.add(belly);

    // Mid-back rock plate
    const backPlateGeo = new THREE.SphereGeometry(1, 16, 12);
    const backPlate = new THREE.Mesh(backPlateGeo, stoneMat);
    backPlate.scale.set(0.5, 0.4, 0.3);
    backPlate.position.set(0, 2.8, -0.35);
    this._body.add(backPlate);

    // Rock crack / fissure details on torso
    for (let i = 0; i < 3; i++) {
      const crackGeo = cyl(0.005, 0.003, 0.25 + i * 0.1, 6);
      const crack = new THREE.Mesh(crackGeo, mat(0x2a2a20));
      crack.position.set(-0.15 + i * 0.15, 2.2 + i * 0.3, 0.42);
      crack.rotation.z = 0.3 + i * 0.5;
      this._body.add(crack);
    }

    // Small embedded pebbles on surface
    for (let i = 0; i < 5; i++) {
      const pebbleGeo = new THREE.SphereGeometry(0.03, 10, 8);
      const pebble = new THREE.Mesh(pebbleGeo, darkStoneMat);
      pebble.position.set(
        -0.3 + i * 0.15,
        2.0 + (i % 3) * 0.4,
        0.38 + (i % 2) * 0.05,
      );
      this._body.add(pebble);
    }

    // Crystal veins on chest
    for (let i = 0; i < 4; i++) {
      const crystalGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 12, 10);
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

    // Crystal vein connecting lines between crystal clusters
    for (let i = 0; i < 3; i++) {
      const veinLineGeo = cyl(0.006, 0.004, 0.2, 8);
      const veinLine = new THREE.Mesh(veinLineGeo, crystalMat);
      veinLine.position.set(
        -0.1 + i * 0.12,
        2.4 + i * 0.25,
        0.43,
      );
      veinLine.rotation.z = 0.5 + i * 0.4;
      this._body.add(veinLine);
    }

    // ---- Head — rough boulder with glowing eyes ----
    this._head.position.set(0, 3.6, 0.2);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, stoneMat);
    headMesh.scale.set(0.3, 0.32, 0.28);
    this._head.add(headMesh);

    // Heavy brow ridge
    const browGeo = new THREE.SphereGeometry(1, 18, 12);
    const brow = new THREE.Mesh(browGeo, darkStoneMat);
    brow.scale.set(0.33, 0.1, 0.15);
    brow.position.set(0, 0.15, 0.15);
    this._head.add(brow);

    // Craggy forehead protrusion
    const foreheadGeo = new THREE.SphereGeometry(1, 16, 12);
    const forehead = new THREE.Mesh(foreheadGeo, darkStoneMat);
    forehead.scale.set(0.2, 0.15, 0.12);
    forehead.position.set(0, 0.25, 0.1);
    this._head.add(forehead);

    // Head cracks and weathering
    for (let i = 0; i < 2; i++) {
      const headCrackGeo = cyl(0.004, 0.003, 0.15, 6);
      const headCrack = new THREE.Mesh(headCrackGeo, mat(0x2a2a20));
      headCrack.position.set(-0.08 + i * 0.16, 0.05, 0.26);
      headCrack.rotation.z = 0.4 + i * 0.8;
      this._head.add(headCrack);
    }

    // Glowing green eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.05, 16, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.12, 0.08, 0.24);
      this._head.add(eye);

      // Eye glow halo
      const haloGeo = new THREE.SphereGeometry(0.06, 14, 12);
      const halo = new THREE.Mesh(haloGeo, mat(0x44cc66, { emissive: 0x44cc66, emissiveIntensity: 0.3, transparent: true, opacity: 0.3 }));
      halo.position.set(side * 0.12, 0.08, 0.23);
      this._head.add(halo);
    }

    // Jaw — craggy lower stones
    const jawGeo = new THREE.SphereGeometry(1, 16, 12);
    const jaw = new THREE.Mesh(jawGeo, darkStoneMat);
    jaw.scale.set(0.26, 0.14, 0.18);
    jaw.position.set(0, -0.15, 0.08);
    this._head.add(jaw);

    // Moss patch on head
    const headMossGeo = new THREE.SphereGeometry(0.08, 14, 12);
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
      const shoulderGeo = new THREE.SphereGeometry(0.22, 16, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, stoneMat);
      shoulder.scale.set(1.0, 0.85, 0.9);
      arm.add(shoulder);

      // Upper arm rock
      const upperGeo = cyl(0.16, 0.14, 0.7, 14);
      const upper = new THREE.Mesh(upperGeo, darkStoneMat);
      upper.position.y = -0.4;
      arm.add(upper);

      // Rocky protrusion on upper arm
      const armProtrGeo = new THREE.SphereGeometry(0.05, 10, 8);
      const armProtr = new THREE.Mesh(armProtrGeo, stoneMat);
      armProtr.position.set(side * 0.12, -0.3, 0.06);
      arm.add(armProtr);

      // Elbow boulder
      const elbowGeo = new THREE.SphereGeometry(0.15, 16, 12);
      const elbow = new THREE.Mesh(elbowGeo, stoneMat);
      elbow.position.y = -0.75;
      arm.add(elbow);

      // Forearm boulder
      const foreGeo = cyl(0.14, 0.12, 0.65, 14);
      const fore = new THREE.Mesh(foreGeo, darkStoneMat);
      fore.position.y = -1.15;
      arm.add(fore);

      // Fist — large rough sphere
      const fistGeo = new THREE.SphereGeometry(0.18, 16, 14);
      const fist = new THREE.Mesh(fistGeo, stoneMat);
      fist.scale.set(1.0, 0.9, 0.95);
      fist.position.y = -1.55;
      arm.add(fist);

      // Knuckle stones on fist
      for (let k = 0; k < 3; k++) {
        const knuckleGeo = new THREE.SphereGeometry(0.04, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkStoneMat);
        knuckle.position.set(-0.08 + k * 0.08, -1.55, 0.14);
        arm.add(knuckle);
      }

      // Crystal vein on upper arm
      const armCrystalGeo = new THREE.SphereGeometry(0.03, 12, 10);
      const armCrystal = new THREE.Mesh(armCrystalGeo, crystalMat);
      armCrystal.position.set(side * 0.1, -0.5, 0.08);
      arm.add(armCrystal);

      // Crystal vein line connecting to shoulder
      const armVeinGeo = cyl(0.005, 0.003, 0.2, 8);
      const armVein = new THREE.Mesh(armVeinGeo, crystalMat);
      armVein.position.set(side * 0.08, -0.35, 0.1);
      armVein.rotation.z = side * 0.2;
      arm.add(armVein);

      // Moss on shoulder
      const shoulderMossGeo = new THREE.SphereGeometry(0.07, 14, 10);
      const shoulderMoss = new THREE.Mesh(shoulderMossGeo, mossMat);
      shoulderMoss.scale.set(1.3, 0.4, 1.0);
      shoulderMoss.position.set(0, 0.18, 0.05);
      arm.add(shoulderMoss);
    }

    // Massive boulder weapon in right hand
    const weaponBoulderGeo = new THREE.SphereGeometry(0.3, 18, 14);
    const weaponBoulder = new THREE.Mesh(weaponBoulderGeo, boulderWeaponMat);
    weaponBoulder.scale.set(1.0, 0.85, 0.9);
    weaponBoulder.position.y = -1.95;
    this._rightArm.add(weaponBoulder);

    // Smaller rocks on the weapon boulder surface
    for (let i = 0; i < 3; i++) {
      const chipGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 12, 10);
      const chip = new THREE.Mesh(chipGeo, darkStoneMat);
      const chipAngle = (i / 3) * Math.PI * 2;
      chip.position.set(
        Math.cos(chipAngle) * 0.2,
        -1.95 + Math.sin(chipAngle) * 0.15,
        Math.sin(chipAngle) * 0.2,
      );
      this._rightArm.add(chip);
    }

    // Impact cracks on weapon boulder
    for (let i = 0; i < 2; i++) {
      const impactGeo = cyl(0.004, 0.003, 0.12, 6);
      const impact = new THREE.Mesh(impactGeo, mat(0x2a2a20));
      const impactAngle = i * 1.5;
      impact.position.set(
        Math.cos(impactAngle) * 0.22,
        -1.95,
        Math.sin(impactAngle) * 0.22,
      );
      impact.rotation.z = 0.5 + i;
      this._rightArm.add(impact);
    }

    // ---- Legs — thick stone pillars ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.5, 0.0);
      this._body.add(leg);

      // Upper thigh — thick stone pillar
      const thighGeo = cyl(0.22, 0.2, 0.75, 16);
      const thigh = new THREE.Mesh(thighGeo, stoneMat);
      thigh.position.y = -0.35;
      leg.add(thigh);

      // Knee boulder
      const kneeGeo = new THREE.SphereGeometry(0.18, 16, 12);
      const knee = new THREE.Mesh(kneeGeo, darkStoneMat);
      knee.position.y = -0.75;
      leg.add(knee);

      // Shin pillar
      const shinGeo = cyl(0.2, 0.16, 0.65, 16);
      const shin = new THREE.Mesh(shinGeo, stoneMat);
      shin.position.y = -1.15;
      leg.add(shin);

      // Foot — flat wide stone
      const footGeo = new THREE.SphereGeometry(1, 18, 14);
      const foot = new THREE.Mesh(footGeo, darkStoneMat);
      foot.scale.set(0.18, 0.08, 0.24);
      foot.position.set(0, -1.52, 0.06);
      leg.add(foot);

      // Toe-like stone segments on foot
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.04, 10, 8);
        const toe = new THREE.Mesh(toeGeo, darkStoneMat);
        toe.position.set(t * 0.08, -1.54, 0.2);
        leg.add(toe);
      }

      // Craggy detail — small rock protrusions on shin
      for (let ci = 0; ci < 2; ci++) {
        const cragGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 12, 10);
        const crag = new THREE.Mesh(cragGeo, stoneMat);
        crag.position.set(
          side * (0.12 + Math.random() * 0.05),
          -0.9 - ci * 0.3,
          0.08,
        );
        leg.add(crag);
      }

      // Crystal vein on shin
      const shinCrystalGeo = new THREE.SphereGeometry(0.025, 10, 8);
      const shinCrystal = new THREE.Mesh(shinCrystalGeo, crystalMat);
      shinCrystal.position.set(side * 0.1, -1.0, 0.1);
      leg.add(shinCrystal);
    }

    // Moss patches on back and shoulders
    const mossPositions = [
      { x: 0.0, y: 3.0, z: -0.4 },
      { x: -0.3, y: 2.7, z: -0.3 },
      { x: 0.25, y: 3.2, z: -0.25 },
      { x: 0.0, y: 2.2, z: -0.35 },
    ];
    for (const pos of mossPositions) {
      const mGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 14, 10);
      const mMesh = new THREE.Mesh(mGeo, mossMat);
      mMesh.scale.set(1.4, 0.5, 1.2);
      mMesh.position.set(pos.x, pos.y, pos.z);
      this._body.add(mMesh);
    }

    // Rubble at base — small rock spheres near feet
    for (let ri = 0; ri < 5; ri++) {
      const rubbleGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 12, 10);
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

    // ---- Body — rounded wooden frame ----
    const frameGeo = cyl(0.6, 0.6, 0.3, 16);
    const frame = new THREE.Mesh(frameGeo, woodMat);
    frame.position.set(0, 0.8, 0);
    frame.scale.set(1.0, 1.0, 2.4 / 1.2); // stretch along Z to match original proportions
    this._body.add(frame);

    // Wood grain planks on frame top
    for (let i = 0; i < 5; i++) {
      const plankGeo = new THREE.BoxGeometry(1.18, 0.02, 0.42);
      const plank = new THREE.Mesh(plankGeo, mat(0x5f3a20, { roughness: 0.9 }));
      plank.position.set(0, 0.96, -0.9 + i * 0.45);
      this._body.add(plank);
    }

    // Side rails — left and right (round timber beams)
    for (const side of [-1, 1]) {
      const railGeo = cyl(0.05, 0.05, 2.4, 8);
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(side * 0.6, 1.2, 0);
      rail.rotation.x = Math.PI / 2;
      this._body.add(rail);

      // Wood grain lines on side rails
      for (let g = 0; g < 3; g++) {
        const grainGeo = new THREE.BoxGeometry(0.005, 0.7, 0.02);
        const grain = new THREE.Mesh(grainGeo, mat(0x5a3518));
        grain.position.set(side * 0.655, 1.2, -0.6 + g * 0.6);
        this._body.add(grain);
      }
    }

    // Crossbeams on the frame (round timber)
    for (let i = -1; i <= 1; i++) {
      const crossGeo = cyl(0.04, 0.04, 1.2, 6);
      const cross = new THREE.Mesh(crossGeo, woodMat);
      cross.position.set(0, 0.95, i * 0.9);
      cross.rotation.z = Math.PI / 2;
      this._body.add(cross);
    }

    // ---- Enclosed box housing (plank shed) ----
    const housingW = 1.3; // width
    const housingH = 1.1; // height of walls
    const housingD = 2.2; // depth (front to back)
    const wallY = 1.55; // center Y of walls
    const plankMat = mat(0x6b4226, { side: THREE.DoubleSide, roughness: 0.9 });
    const darkPlankMat = mat(0x5a3518, { side: THREE.DoubleSide, roughness: 0.9 });

    // Corner posts (vertical round timber at each corner)
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const postGeo = cyl(0.05, 0.05, housingH, 10);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(side * housingW * 0.5, wallY, fb * housingD * 0.5);
        this._body.add(post);

        // Rope binding at post base
        const bindingGeo = new THREE.TorusGeometry(0.06, 0.008, 8, 12);
        const binding = new THREE.Mesh(bindingGeo, ropeMat);
        binding.position.set(side * housingW * 0.5, wallY - housingH * 0.45, fb * housingD * 0.5);
        this._body.add(binding);
      }
    }

    // Side walls — vertical planks on left and right
    for (const side of [-1, 1]) {
      for (let p = 0; p < 6; p++) {
        const pw = housingD / 6;
        const plankGeo = new THREE.PlaneGeometry(pw - 0.02, housingH);
        const plank = new THREE.Mesh(plankGeo, p % 2 === 0 ? plankMat : darkPlankMat);
        plank.rotation.y = Math.PI / 2;
        plank.position.set(side * housingW * 0.5, wallY, -housingD * 0.5 + pw * 0.5 + p * pw);
        this._body.add(plank);
      }

      // Iron reinforcement band across side wall
      const bandGeo = cyl(0.02, 0.02, housingD, 8);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(side * (housingW * 0.5 + 0.01), wallY, 0);
      this._body.add(band);
    }

    // Back wall — vertical planks across the back
    for (let p = 0; p < 4; p++) {
      const pw = housingW / 4;
      const plankGeo = new THREE.PlaneGeometry(pw - 0.02, housingH);
      const plank = new THREE.Mesh(plankGeo, p % 2 === 0 ? plankMat : darkPlankMat);
      plank.position.set(-housingW * 0.5 + pw * 0.5 + p * pw, wallY, -housingD * 0.5);
      this._body.add(plank);
    }

    // Front wall — planks with opening for the ram beam
    for (let p = 0; p < 4; p++) {
      const pw = housingW / 4;
      const cx = -housingW * 0.5 + pw * 0.5 + p * pw;
      // Skip center planks to leave a gap for the ram
      if (Math.abs(cx) < 0.2) continue;
      const plankGeo = new THREE.PlaneGeometry(pw - 0.02, housingH);
      const plank = new THREE.Mesh(plankGeo, p % 2 === 0 ? plankMat : darkPlankMat);
      plank.position.set(cx, wallY, housingD * 0.5);
      this._body.add(plank);
    }

    // Iron ring around front opening for the ram
    const ringGeo = new THREE.TorusGeometry(0.18, 0.02, 10, 16);
    const ring = new THREE.Mesh(ringGeo, ironMat);
    ring.position.set(0, wallY - 0.05, housingD * 0.5 + 0.01);
    this._body.add(ring);

    // Flat roof — planks across the top
    for (let p = 0; p < 6; p++) {
      const pw = housingD / 6;
      const roofPlankGeo = new THREE.PlaneGeometry(housingW, pw - 0.02);
      const roofPlank = new THREE.Mesh(roofPlankGeo, p % 2 === 0 ? plankMat : darkPlankMat);
      roofPlank.rotation.x = -Math.PI / 2;
      roofPlank.position.set(0, wallY + housingH * 0.5, -housingD * 0.5 + pw * 0.5 + p * pw);
      this._body.add(roofPlank);
    }

    // Iron bands across the roof
    for (let i = 0; i < 3; i++) {
      const roofBandGeo = cyl(0.02, 0.02, housingW, 8);
      const roofBand = new THREE.Mesh(roofBandGeo, ironMat);
      roofBand.rotation.z = Math.PI / 2;
      roofBand.position.set(0, wallY + housingH * 0.5 + 0.01, -0.7 + i * 0.7);
      this._body.add(roofBand);
    }

    // Iron rivets on roof bands
    for (let r = 0; r < 6; r++) {
      const rivetGeo = new THREE.SphereGeometry(0.012, 8, 8);
      const rivet = new THREE.Mesh(rivetGeo, ironMat);
      rivet.position.set(-0.5 + r * 0.2, wallY + housingH * 0.5 + 0.02, 0);
      this._body.add(rivet);
    }

    // ---- The ram — on _rightArm so it swings for attack ----
    this._rightArm.position.set(0, 1.0, 0);
    this._body.add(this._rightArm);

    // Ram beam — long horizontal cylinder
    const ramBeamGeo = cyl(0.1, 0.1, 2.8, 16);
    const ramBeam = new THREE.Mesh(ramBeamGeo, woodMat);
    ramBeam.rotation.x = Math.PI / 2;
    ramBeam.position.set(0, 0.0, 1.5);
    this._rightArm.add(ramBeam);

    // Wood grain detail on ram beam
    for (let g = 0; g < 3; g++) {
      const grainGeo = cyl(0.005, 0.005, 2.7, 6);
      const grain = new THREE.Mesh(grainGeo, mat(0x5a3518));
      grain.rotation.x = Math.PI / 2;
      grain.position.set(Math.cos(g * 2.1) * 0.08, Math.sin(g * 2.1) * 0.08, 1.5);
      this._rightArm.add(grain);
    }

    // Iron-banded ram head (tip)
    const ramHeadGeo = new THREE.SphereGeometry(0.2, 18, 14);
    const ramHead = new THREE.Mesh(ramHeadGeo, ironHeadMat);
    ramHead.scale.set(0.8, 0.8, 1.3);
    ramHead.position.set(0, 0.0, 2.9);
    this._rightArm.add(ramHead);

    // Impact dents on ram head
    for (let d = 0; d < 3; d++) {
      const dentGeo = new THREE.SphereGeometry(0.03, 10, 8);
      const dent = new THREE.Mesh(dentGeo, mat(0x444444, { roughness: 0.5, metalness: 0.4 }));
      dent.position.set(
        Math.cos(d * 2.1) * 0.08,
        Math.sin(d * 2.1) * 0.08,
        3.05,
      );
      this._rightArm.add(dent);
    }

    // Iron cap ring behind ram head
    const capGeo = cyl(0.18, 0.18, 0.06, 16);
    const capMesh = new THREE.Mesh(capGeo, ironMat);
    capMesh.rotation.x = Math.PI / 2;
    capMesh.position.set(0, 0.0, 2.6);
    this._rightArm.add(capMesh);

    // Iron bands along the ram beam
    for (let i = 0; i < 4; i++) {
      const rBandGeo = cyl(0.12, 0.12, 0.04, 14);
      const rBand = new THREE.Mesh(rBandGeo, ironMat);
      rBand.rotation.x = Math.PI / 2;
      rBand.position.set(0, 0.0, 0.6 + i * 0.55);
      this._rightArm.add(rBand);
    }

    // Rope hangers (suspension ropes from frame to ram)
    for (const zOff of [-0.4, 0.4]) {
      const ropeGeo = cyl(0.015, 0.015, 0.6, 12);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(0, 0.3, 1.0 + zOff);
      this._rightArm.add(rope);

      // Rope binding knots
      const knotGeo = new THREE.SphereGeometry(0.025, 10, 8);
      const knot = new THREE.Mesh(knotGeo, ropeMat);
      knot.position.set(0, 0.6, 1.0 + zOff);
      this._rightArm.add(knot);
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
        const wheelGeo = cyl(0.35, 0.35, 0.08, 20);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, -0.05, fb * 0.75);
        leg.add(wheel);

        // Iron rim
        const rimGeo = cyl(0.37, 0.37, 0.04, 22);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, -0.05, fb * 0.75);
        leg.add(rim);

        // Hub
        const hubGeo = cyl(0.06, 0.06, 0.1, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(0, -0.05, fb * 0.75);
        leg.add(hub);

        // Hub cap rivet
        const hubCapGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const hubCap = new THREE.Mesh(hubCapGeo, ironMat);
        hubCap.position.set(side * 0.06, -0.05, fb * 0.75);
        leg.add(hubCap);

        // Spokes
        for (let s = 0; s < 6; s++) {
          const spokeGeo = new THREE.BoxGeometry(0.03, 0.28, 0.03);
          const spoke = new THREE.Mesh(spokeGeo, wheelMat);
          spoke.position.set(0, -0.05, fb * 0.75);
          spoke.rotation.z = Math.PI / 2;
          spoke.rotation.x = (s / 6) * Math.PI;
          leg.add(spoke);
        }
      }

      // Axle connecting front and back wheels
      const axleGeo = cyl(0.03, 0.03, 1.5, 12);
      const axle = new THREE.Mesh(axleGeo, ironMat);
      axle.rotation.x = Math.PI / 2;
      axle.position.set(0, -0.05, 0);
      leg.add(axle);
    }

    // Small pennant/flag on top
    const flagPoleGeo = cyl(0.015, 0.015, 0.5, 10);
    const flagPole = new THREE.Mesh(flagPoleGeo, ironMat);
    flagPole.position.set(0, 2.6, -0.8);
    this._body.add(flagPole);

    // Flag pole finial
    const finialGeo = new THREE.SphereGeometry(0.02, 10, 8);
    const finial = new THREE.Mesh(finialGeo, ironMat);
    finial.position.set(0, 2.86, -0.8);
    this._body.add(finial);

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

    // ---- Body — sturdy wooden base frame (rounded) ----
    const baseGeo = cyl(0.7, 0.7, 0.25, 16);
    const baseMesh = new THREE.Mesh(baseGeo, woodMat);
    baseMesh.position.set(0, 0.6, 0);
    baseMesh.scale.set(1.0, 1.0, 2.0 / 1.4); // stretch along Z to match original proportions
    this._body.add(baseMesh);

    // Side beams (raised rails for the arm track, round timber)
    for (const side of [-1, 1]) {
      const sideBeamGeo = cyl(0.06, 0.06, 2.0, 6);
      const sideBeam = new THREE.Mesh(sideBeamGeo, woodMat);
      sideBeam.position.set(side * 0.6, 0.85, 0);
      sideBeam.rotation.x = Math.PI / 2;
      this._body.add(sideBeam);
    }

    // Crossbeams for structural support (round timber)
    for (let i = -1; i <= 1; i++) {
      const crossGeo = cyl(0.04, 0.04, 1.2, 6);
      const cross = new THREE.Mesh(crossGeo, woodMat);
      cross.position.set(0, 0.55, i * 0.8);
      cross.rotation.z = Math.PI / 2;
      this._body.add(cross);
    }

    // Vertical pivot uprights (the A-frame that holds the pivot, round timber)
    for (const side of [-1, 1]) {
      const uprightGeo = cyl(0.05, 0.05, 1.2, 6);
      const upright = new THREE.Mesh(uprightGeo, darkWoodMat);
      upright.position.set(side * 0.45, 1.5, 0);
      upright.rotation.z = side * -0.1; // slight angle inward
      this._body.add(upright);

      // Iron bracket at upright top (small cylinder)
      const bracketGeo = cyl(0.07, 0.07, 0.06, 8);
      const bracket = new THREE.Mesh(bracketGeo, ironMat);
      bracket.position.set(side * 0.42, 2.05, 0);
      this._body.add(bracket);

      // Rope binding at upright base
      const bindGeo = new THREE.TorusGeometry(0.06, 0.008, 8, 12);
      const bind = new THREE.Mesh(bindGeo, ropeMat);
      bind.position.set(side * 0.47, 0.95, 0);
      this._body.add(bind);
    }

    // Pivot crossbar at top of uprights
    const pivotBarGeo = cyl(0.05, 0.05, 1.0, 14);
    const pivotBar = new THREE.Mesh(pivotBarGeo, ironMat);
    pivotBar.rotation.z = Math.PI / 2;
    pivotBar.position.set(0, 2.0, 0);
    this._body.add(pivotBar);

    // Support struts (diagonal braces from base to uprights, round timber)
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const strutGeo = cyl(0.025, 0.025, 0.8, 6);
        const strut = new THREE.Mesh(strutGeo, woodMat);
        strut.position.set(side * 0.4, 1.1, fb * 0.25);
        strut.rotation.z = side * 0.35;
        strut.rotation.x = fb * -0.2;
        this._body.add(strut);
      }
    }

    // Winch mechanism at base (small cylinder)
    const winchGeo = cyl(0.08, 0.08, 0.6, 14);
    const winch = new THREE.Mesh(winchGeo, darkWoodMat);
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, 0.65, -0.75);
    this._body.add(winch);

    // Winch rope wrap detail
    for (let w = 0; w < 4; w++) {
      const wrapGeo = new THREE.TorusGeometry(0.085, 0.006, 6, 14);
      const wrap = new THREE.Mesh(wrapGeo, ropeMat);
      wrap.rotation.y = Math.PI / 2;
      wrap.position.set(-0.12 + w * 0.08, 0.65, -0.75);
      this._body.add(wrap);
    }

    // Winch handles
    for (const side of [-1, 1]) {
      const handleGeo = cyl(0.02, 0.02, 0.2, 10);
      const handle = new THREE.Mesh(handleGeo, ironMat);
      handle.position.set(side * 0.35, 0.65, -0.75);
      handle.rotation.z = Math.PI / 2;
      this._body.add(handle);

      // Handle grip
      const gripGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const grip = new THREE.Mesh(gripGeo, ironMat);
      grip.position.set(side * 0.35, 0.65, -0.75);
      this._body.add(grip);
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
    const sleeveGeo = cyl(0.08, 0.08, 0.15, 14);
    const sleeve = new THREE.Mesh(sleeveGeo, ironMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(0, 0.0, 0);
    this._rightArm.add(sleeve);

    // Iron reinforcement plates on throwing arm
    for (let p = 0; p < 3; p++) {
      const plateGeo = new THREE.BoxGeometry(0.14, 0.03, 0.14);
      const plate = new THREE.Mesh(plateGeo, ironMat);
      plate.position.set(0, 0.07, 0.5 + p * 0.7);
      this._rightArm.add(plate);
    }

    // Sling/basket at the tip
    const basketGeo = new THREE.SphereGeometry(0.15, 16, 12);
    const basket = new THREE.Mesh(basketGeo, ropeMat);
    basket.scale.set(1.0, 0.5, 1.0);
    basket.position.set(0, -0.08, 2.2);
    this._rightArm.add(basket);

    // Boulder in the basket
    const boulderGeo = new THREE.SphereGeometry(0.12, 16, 14);
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.position.set(0, 0.02, 2.2);
    this._rightArm.add(boulder);

    // Sling ropes from arm tip to basket
    for (const side of [-1, 1]) {
      const slingRopeGeo = cyl(0.012, 0.012, 0.35, 10);
      const slingRope = new THREE.Mesh(slingRopeGeo, ropeMat);
      slingRope.position.set(side * 0.06, -0.04, 2.05);
      slingRope.rotation.x = 0.3;
      this._rightArm.add(slingRope);
    }

    // Rope from winch to short end of arm
    const winchRopeGeo = cyl(0.015, 0.015, 1.2, 10);
    const winchRope = new THREE.Mesh(winchRopeGeo, ropeMat);
    winchRope.position.set(0, -0.6, -0.5);
    winchRope.rotation.x = 0.2;
    this._rightArm.add(winchRope);

    // Short end hook/latch
    const hookGeo = cyl(0.03, 0.02, 0.15, 12);
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
      const wheelGeo = cyl(0.4, 0.4, 0.1, 22);
      const wheel = new THREE.Mesh(wheelGeo, darkWoodMat);
      wheel.rotation.z = Math.PI / 2;
      leg.add(wheel);

      // Iron rim
      const rimGeo = cyl(0.42, 0.42, 0.05, 24);
      const rim = new THREE.Mesh(rimGeo, ironMat);
      rim.rotation.z = Math.PI / 2;
      leg.add(rim);

      // Hub
      const hubGeo = cyl(0.06, 0.06, 0.12, 14);
      const hub = new THREE.Mesh(hubGeo, ironMat);
      hub.rotation.z = Math.PI / 2;
      leg.add(hub);

      // Hub cap
      const hubCapGeo = new THREE.SphereGeometry(0.035, 10, 8);
      const hubCap = new THREE.Mesh(hubCapGeo, ironMat);
      hubCap.position.set(side * 0.07, 0, 0);
      leg.add(hubCap);

      // Spokes
      for (let s = 0; s < 8; s++) {
        const spokeGeo = new THREE.BoxGeometry(0.03, 0.34, 0.03);
        const spoke = new THREE.Mesh(spokeGeo, darkWoodMat);
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.x = (s / 8) * Math.PI;
        leg.add(spoke);
      }

      // Axle stub connecting to frame
      const axleGeo = cyl(0.03, 0.03, 0.2, 12);
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
    const pivotAxleGeo = cyl(0.06, 0.06, 1.0, 16);
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

      // Bracket rivets
      for (const yOff of [-0.06, 0.06]) {
        const rivetGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const rivet = new THREE.Mesh(rivetGeo, ironMat);
        rivet.position.set(side * 0.35, 4.35 + yOff, 0.07);
        this._body.add(rivet);
      }
    }

    // Rope bindings at A-frame joints
    for (const side of [-1, 1]) {
      const ropeBindGeo = new THREE.TorusGeometry(0.08, 0.008, 8, 12);
      const ropeBind = new THREE.Mesh(ropeBindGeo, ropeMat);
      ropeBind.position.set(side * 0.35, 4.2, 0);
      this._body.add(ropeBind);
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
    const pivotSleeveGeo = cyl(0.1, 0.1, 0.18, 16);
    const pivotSleeve = new THREE.Mesh(pivotSleeveGeo, ironMat);
    pivotSleeve.rotation.z = Math.PI / 2;
    pivotSleeve.position.set(0, 0, 0);
    this._rightArm.add(pivotSleeve);

    // Iron reinforcement plates along beam
    for (let p = 0; p < 4; p++) {
      const plateGeo = new THREE.BoxGeometry(0.16, 0.03, 0.16);
      const plate = new THREE.Mesh(plateGeo, ironMat);
      plate.position.set(0, 0.08, -0.8 + p * 1.1);
      this._rightArm.add(plate);
    }

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

    // Counterweight corner rivets
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cwRivetGeo = new THREE.SphereGeometry(0.015, 8, 8);
        const cwRivet = new THREE.Mesh(cwRivetGeo, ironMat);
        cwRivet.position.set(sx * 0.22, -0.06, -1.5 + sz * 0.22);
        this._rightArm.add(cwRivet);
      }
    }

    // Counterweight hanging chains (short cylinders)
    for (const side of [-1, 1]) {
      const chainGeo = cyl(0.02, 0.02, 0.25, 10);
      const chain = new THREE.Mesh(chainGeo, ironMat);
      chain.position.set(side * 0.15, -0.08, -1.5);
      this._rightArm.add(chain);

      // Chain link detail
      for (let cl = 0; cl < 3; cl++) {
        const linkGeo = new THREE.TorusGeometry(0.018, 0.005, 6, 8);
        const link = new THREE.Mesh(linkGeo, ironMat);
        link.position.set(side * 0.15, -0.02 + cl * -0.07, -1.5);
        this._rightArm.add(link);
      }
    }

    // ---- Sling on the long end (positive z) ----
    // Sling ropes
    for (const side of [-1, 1]) {
      const slingGeo = cyl(0.012, 0.012, 0.8, 10);
      const sling = new THREE.Mesh(slingGeo, ropeMat);
      sling.position.set(side * 0.06, -0.35, 2.5);
      sling.rotation.x = 0.2;
      this._rightArm.add(sling);
    }

    // Sling pouch
    const pouchGeo = new THREE.SphereGeometry(0.12, 16, 12);
    const pouch = new THREE.Mesh(pouchGeo, ropeMat);
    pouch.scale.set(1.2, 0.4, 1.2);
    pouch.position.set(0, -0.7, 2.7);
    this._rightArm.add(pouch);

    // Boulder in sling
    const boulderGeo = new THREE.SphereGeometry(0.14, 18, 14);
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.position.set(0, -0.6, 2.7);
    this._rightArm.add(boulder);

    // _leftArm — unused
    this._leftArm.position.set(0, 4.3, 0);
    this._body.add(this._leftArm);

    // ---- Support guy ropes (thin cylinders at angles from tower to base) ----
    for (const side of [-1, 1]) {
      for (const fb of [-1, 1]) {
        const guyGeo = cyl(0.012, 0.012, 2.8, 10);
        const guy = new THREE.Mesh(guyGeo, ropeMat);
        guy.position.set(side * 0.5, 2.4, fb * 1.0);
        guy.rotation.z = side * 0.4;
        guy.rotation.x = fb * -0.3;
        this._body.add(guy);

        // Rope tension knot at base
        const knotGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const knot = new THREE.Mesh(knotGeo, ropeMat);
        knot.position.set(side * 0.8, 1.1, fb * 1.3);
        this._body.add(knot);
      }
    }

    // ---- Winch drum at base ----
    const winchDrumGeo = cyl(0.1, 0.1, 0.8, 16);
    const winchDrum = new THREE.Mesh(winchDrumGeo, darkWoodMat);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(0, 0.65, -1.2);
    this._body.add(winchDrum);

    // Winch rope wrapping detail
    for (let w = 0; w < 5; w++) {
      const wrapGeo = new THREE.TorusGeometry(0.105, 0.006, 6, 14);
      const wrap = new THREE.Mesh(wrapGeo, ropeMat);
      wrap.rotation.y = Math.PI / 2;
      wrap.position.set(-0.2 + w * 0.1, 0.65, -1.2);
      this._body.add(wrap);
    }

    // Winch handles
    for (const side of [-1, 1]) {
      const handleGeo = cyl(0.02, 0.02, 0.25, 10);
      const handle = new THREE.Mesh(handleGeo, ironMat);
      handle.position.set(side * 0.5, 0.65, -1.2);
      this._body.add(handle);

      // Handle grip knob
      const gripGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const grip = new THREE.Mesh(gripGeo, ironMat);
      grip.position.set(side * 0.5, 0.78, -1.2);
      this._body.add(grip);
    }

    // Rope from winch up to arm
    const winchRopeGeo = cyl(0.015, 0.015, 3.2, 10);
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

        // Corner rivet
        const cornerRivetGeo = new THREE.SphereGeometry(0.015, 8, 8);
        const cornerRivet = new THREE.Mesh(cornerRivetGeo, ironMat);
        cornerRivet.position.set(side * 0.9, 0.65, fb * 1.35);
        this._body.add(cornerRivet);
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
        const wheelGeo = cyl(0.35, 0.35, 0.1, 20);
        const wheel = new THREE.Mesh(wheelGeo, woodMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0, fb * 1.15);
        leg.add(wheel);

        // Iron rim
        const rimGeo = cyl(0.37, 0.37, 0.05, 22);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, 0, fb * 1.15);
        leg.add(rim);

        // Hub
        const hubGeo = cyl(0.06, 0.06, 0.12, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(0, 0, fb * 1.15);
        leg.add(hub);

        // Hub cap
        const hubCapGeo = new THREE.SphereGeometry(0.03, 10, 8);
        const hubCap = new THREE.Mesh(hubCapGeo, ironMat);
        hubCap.position.set(side * 0.07, 0, fb * 1.15);
        leg.add(hubCap);

        // Spokes
        for (let s = 0; s < 7; s++) {
          const spokeGeo = new THREE.BoxGeometry(0.03, 0.28, 0.03);
          const spoke = new THREE.Mesh(spokeGeo, woodMat);
          spoke.rotation.z = Math.PI / 2;
          spoke.rotation.x = (s / 7) * Math.PI;
          spoke.position.set(0, 0, fb * 1.15);
          leg.add(spoke);
        }
      }

      // Axle connecting front and back wheels
      const axleGeo = cyl(0.035, 0.035, 2.3, 12);
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

    // ---- Body: wooden frame / carriage (rounded) ----
    const frameGeo = cyl(0.4, 0.4, 0.3, 16);
    const frame = new THREE.Mesh(frameGeo, woodMat);
    frame.position.set(0, 0.6, 0);
    frame.scale.set(1.4 / 0.8, 1.0, 1.0); // stretch along X to match original proportions
    this._body.add(frame);

    // Side rails of the carriage (round timber)
    for (const side of [-1, 1]) {
      const railGeo = cyl(0.04, 0.04, 1.6, 6);
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(0, 0.72, side * 0.38);
      rail.rotation.z = Math.PI / 2;
      this._body.add(rail);
    }

    // Iron reinforcement bands on frame (3 bands)
    for (let i = -1; i <= 1; i++) {
      const bandGeo = cyl(0.42, 0.42, 0.04, 20);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(i * 0.45, 0.6, 0);
      this._body.add(band);

      // Rivets on bands
      for (const side of [-1, 1]) {
        const rivetGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const rivet = new THREE.Mesh(rivetGeo, ironMat);
        rivet.position.set(i * 0.45, 0.6, side * 0.4);
        this._body.add(rivet);
      }
    }

    // Central channel / rail for the bolt (half-cylinder trough on top)
    const channelGeo = cyl(0.06, 0.06, 1.5, 8);
    const channel = new THREE.Mesh(channelGeo, woodMat);
    channel.position.set(0.05, 0.82, 0);
    channel.rotation.z = Math.PI / 2;
    this._body.add(channel);

    // Channel side lips (thin cylinders)
    for (const side of [-1, 1]) {
      const lipGeo = cyl(0.01, 0.01, 1.5, 6);
      const lip = new THREE.Mesh(lipGeo, ironMat);
      lip.position.set(0.05, 0.85, side * 0.07);
      lip.rotation.z = Math.PI / 2;
      this._body.add(lip);
    }

    // Giant bolt loaded in channel
    const boltGeo = cyl(0.025, 0.025, 1.3, 14);
    const bolt = new THREE.Mesh(boltGeo, boltShaftMat);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.15, 0.87, 0);
    this._body.add(bolt);

    // Bolt head — iron cone tip
    const boltTipGeo = new THREE.ConeGeometry(0.05, 0.18, 14);
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
    const pivotGeo = cyl(0.06, 0.06, 0.15, 14);
    const pivot = new THREE.Mesh(pivotGeo, ironMat);
    pivot.position.set(-0.1, 0.72, 0);
    this._body.add(pivot);

    // Pivot base plate
    const pivotBaseGeo = cyl(0.1, 0.1, 0.03, 14);
    const pivotBase = new THREE.Mesh(pivotBaseGeo, ironMat);
    pivotBase.position.set(-0.1, 0.62, 0);
    this._body.add(pivotBase);

    // Bowstring — thin cylinder connecting the two arm tips, passes through body
    const bowstringGeo = cyl(0.008, 0.008, 1.6, 10);
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
      const extraBoltGeo = cyl(0.015, 0.015, 0.35, 10);
      const extraBolt = new THREE.Mesh(extraBoltGeo, boltShaftMat);
      extraBolt.rotation.z = Math.PI / 2;
      extraBolt.position.set(-0.35 + i * 0.06, 0.65, 0.5);
      this._body.add(extraBolt);

      // Extra bolt tips
      const extraTipGeo = new THREE.ConeGeometry(0.025, 0.06, 10);
      const extraTip = new THREE.Mesh(extraTipGeo, boltHeadMat);
      extraTip.rotation.z = -Math.PI / 2;
      extraTip.position.set(-0.16 + i * 0.06, 0.65, 0.5);
      this._body.add(extraTip);
    }

    // Iron axle through body
    const axleGeo = cyl(0.035, 0.035, 1.2, 14);
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
      const capGeo = cyl(0.035, 0.035, 0.04, 14);
      const cap = new THREE.Mesh(capGeo, ironMat);
      cap.position.set(0, side * 0.72, side * 0.15);
      arm.add(cap);

      // Iron reinforcement wraps on limb
      for (let b = 0; b < 2; b++) {
        const wrapGeo = cyl(0.04, 0.04, 0.02, 14);
        const wrap = new THREE.Mesh(wrapGeo, ironMat);
        wrap.position.set(0, side * (0.15 + b * 0.25), side * b * 0.04);
        arm.add(wrap);
      }

      // Rope binding between wraps
      const limbBindGeo = new THREE.TorusGeometry(0.035, 0.006, 6, 10);
      const limbBind = new THREE.Mesh(limbBindGeo, stringMat);
      limbBind.position.set(0, side * 0.05, 0);
      arm.add(limbBind);
    }

    // ---- Legs: spoked wooden wheels ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(-0.3, 0.35, side * 0.55);
      this._body.add(leg);

      // Wheel rim
      const rimGeo = cyl(0.35, 0.35, 0.06, 22);
      const rim = new THREE.Mesh(rimGeo, wheelMat);
      rim.rotation.x = Math.PI / 2;
      leg.add(rim);

      // Iron tire band
      const tireGeo = cyl(0.37, 0.37, 0.04, 24);
      const tire = new THREE.Mesh(tireGeo, ironMat);
      tire.rotation.x = Math.PI / 2;
      leg.add(tire);

      // Hub
      const hubGeo = cyl(0.06, 0.06, 0.08, 14);
      const hub = new THREE.Mesh(hubGeo, ironMat);
      hub.rotation.x = Math.PI / 2;
      leg.add(hub);

      // Hub cap
      const hubCapGeo = new THREE.SphereGeometry(0.035, 10, 8);
      const hubCap = new THREE.Mesh(hubCapGeo, ironMat);
      hubCap.position.set(0, 0, side * 0.05);
      leg.add(hubCap);

      // Spokes (10 spokes radiating out)
      for (let s = 0; s < 10; s++) {
        const angle = (s / 10) * Math.PI * 2;
        const spokeGeo = cyl(0.015, 0.015, 0.3, 8);
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
    const axleGeo = cyl(0.04, 0.04, 1.1, 14);
    const axle = new THREE.Mesh(axleGeo, darkIronMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(0.1, 0.4, 0);
    this._body.add(axle);

    // Wood grain lines on carriage top
    for (let g = 0; g < 4; g++) {
      const grainGeo = new THREE.BoxGeometry(1.1, 0.005, 0.02);
      const grain = new THREE.Mesh(grainGeo, mat(0x4a2e14));
      grain.position.set(0, 0.68, -0.25 + g * 0.16);
      this._body.add(grain);
    }

    // Iron rivets on carriage edges
    for (const side of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        const rivetGeo = new THREE.SphereGeometry(0.01, 8, 8);
        const rivet = new THREE.Mesh(rivetGeo, darkIronMat);
        rivet.position.set(-0.3 + r * 0.35, 0.72, side * 0.29);
        this._body.add(rivet);
      }
    }

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
      const ballGeo = new THREE.SphereGeometry(0.06, 16, 14);
      const ball = new THREE.Mesh(ballGeo, cannonballMat);
      ball.position.set(bx, by, bz);
      this._body.add(ball);
    }

    // Powder barrel nearby
    const powderBarrelGeo = cyl(0.08, 0.08, 0.18, 16);
    const powderBarrel = new THREE.Mesh(powderBarrelGeo, mat(0x4a3018));
    powderBarrel.position.set(-0.6, 0.2, 0.5);
    this._body.add(powderBarrel);

    // Powder barrel bands
    for (const yOff of [-0.05, 0.05]) {
      const pbBandGeo = cyl(0.085, 0.085, 0.015, 16);
      const pbBand = new THREE.Mesh(pbBandGeo, darkIronMat);
      pbBand.position.set(-0.6, 0.2 + yOff, 0.5);
      this._body.add(pbBand);
    }

    // Powder barrel stave lines
    for (let s = 0; s < 6; s++) {
      const staveAngle = (s / 6) * Math.PI * 2;
      const staveGeo = cyl(0.003, 0.003, 0.16, 4);
      const stave = new THREE.Mesh(staveGeo, mat(0x3a2010));
      stave.position.set(
        -0.6 + Math.cos(staveAngle) * 0.078,
        0.2,
        0.5 + Math.sin(staveAngle) * 0.078,
      );
      this._body.add(stave);
    }

    // Fuse / linstock — angled stick with slow-match
    const linstockGeo = cyl(0.012, 0.012, 0.5, 10);
    const linstock = new THREE.Mesh(linstockGeo, mat(0x6b5230));
    linstock.position.set(-0.7, 0.5, 0.35);
    linstock.rotation.z = 0.3;
    linstock.rotation.x = -0.2;
    this._body.add(linstock);

    // Slow-match tip (glowing ember)
    const matchGeo = new THREE.SphereGeometry(0.02, 12, 10);
    const matchMesh = new THREE.Mesh(matchGeo, mat(0xff4400, { emissive: 0x882200 }));
    matchMesh.position.set(-0.58, 0.72, 0.3);
    this._body.add(matchMesh);

    // Ember glow halo
    const glowGeo = new THREE.SphereGeometry(0.035, 10, 8);
    const glow = new THREE.Mesh(glowGeo, mat(0xff4400, { emissive: 0xff4400, emissiveIntensity: 0.3, transparent: true, opacity: 0.25 }));
    glow.position.set(-0.58, 0.72, 0.3);
    this._body.add(glow);

    // Rope coil detail on carriage
    const ropeGeo = cyl(0.06, 0.06, 0.03, 16);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(-0.3, 0.7, -0.35);
    rope.rotation.x = Math.PI / 2;
    this._body.add(rope);

    // Inner rope coil
    const innerRopeGeo = cyl(0.04, 0.04, 0.03, 14);
    const innerRope = new THREE.Mesh(innerRopeGeo, ropeMat);
    innerRope.position.set(-0.3, 0.7, -0.35);
    innerRope.rotation.x = Math.PI / 2;
    this._body.add(innerRope);

    // ---- Head: cannon barrel ----
    this._head.position.set(0.1, 0.95, 0);
    this._body.add(this._head);

    // Main barrel — long cylinder with slight taper
    const barrelGeo = cyl(0.12, 0.1, 1.2, 20);
    const barrel = new THREE.Mesh(barrelGeo, bronzeMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.3, 0, 0);
    this._head.add(barrel);

    // Muzzle flare at front — wider ring
    const muzzleGeo = cyl(0.15, 0.14, 0.08, 20);
    const muzzle = new THREE.Mesh(muzzleGeo, bronzeMat);
    muzzle.rotation.z = Math.PI / 2;
    muzzle.position.set(0.9, 0, 0);
    this._head.add(muzzle);

    // Muzzle lip detail
    const muzzleLipGeo = cyl(0.155, 0.15, 0.02, 20);
    const muzzleLip = new THREE.Mesh(muzzleLipGeo, bronzeMat);
    muzzleLip.rotation.z = Math.PI / 2;
    muzzleLip.position.set(0.94, 0, 0);
    this._head.add(muzzleLip);

    // Muzzle bore (dark interior)
    const boreGeo = cyl(0.08, 0.08, 0.06, 16);
    const bore = new THREE.Mesh(boreGeo, mat(0x111111));
    bore.rotation.z = Math.PI / 2;
    bore.position.set(0.94, 0, 0);
    this._head.add(bore);

    // Decorative bands around barrel (3 raised rings)
    const bandPositions = [0.05, 0.35, 0.65];
    for (const bx of bandPositions) {
      const bandGeo = cyl(0.135, 0.135, 0.03, 20);
      const band = new THREE.Mesh(bandGeo, bronzeMat);
      band.rotation.z = Math.PI / 2;
      band.position.set(bx, 0, 0);
      this._head.add(band);
    }

    // Decorative raised seam line along barrel top
    const seamGeo = cyl(0.005, 0.005, 1.1, 6);
    const seam = new THREE.Mesh(seamGeo, bronzeMat);
    seam.rotation.z = Math.PI / 2;
    seam.position.set(0.3, 0.11, 0);
    this._head.add(seam);

    // Cascabel (knob at rear of barrel)
    const cascabelGeo = new THREE.SphereGeometry(0.06, 16, 14);
    const cascabel = new THREE.Mesh(cascabelGeo, bronzeMat);
    cascabel.position.set(-0.32, 0, 0);
    this._head.add(cascabel);

    // Cascabel button (small knob on top)
    const cascBtnGeo = new THREE.SphereGeometry(0.025, 10, 8);
    const cascBtn = new THREE.Mesh(cascBtnGeo, bronzeMat);
    cascBtn.position.set(-0.36, 0, 0);
    this._head.add(cascBtn);

    // Touch hole at rear (small dark cylinder on top)
    const touchHoleGeo = cyl(0.015, 0.015, 0.04, 12);
    const touchHole = new THREE.Mesh(touchHoleGeo, darkIronMat);
    touchHole.position.set(-0.15, 0.11, 0);
    this._head.add(touchHole);

    // Trunnions (barrel mounting pegs on sides)
    for (const side of [-1, 1]) {
      const trunnionGeo = cyl(0.035, 0.035, 0.08, 14);
      const trunnion = new THREE.Mesh(trunnionGeo, bronzeMat);
      trunnion.rotation.x = Math.PI / 2;
      trunnion.position.set(0.1, -0.05, side * 0.15);
      this._head.add(trunnion);

      // Trunnion cap
      const trCapGeo = new THREE.SphereGeometry(0.035, 10, 8);
      const trCap = new THREE.Mesh(trCapGeo, bronzeMat);
      trCap.position.set(0.1, -0.05, side * 0.19);
      this._head.add(trCap);
    }

    // ---- Legs: large spoked wheels ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(0.1, 0.4, side * 0.6);
      this._body.add(leg);

      // Wheel rim
      const rimGeo = cyl(0.42, 0.42, 0.07, 24);
      const rim = new THREE.Mesh(rimGeo, wheelMat);
      rim.rotation.x = Math.PI / 2;
      leg.add(rim);

      // Iron tire band
      const tireGeo = cyl(0.44, 0.44, 0.05, 24);
      const tire = new THREE.Mesh(tireGeo, darkIronMat);
      tire.rotation.x = Math.PI / 2;
      leg.add(tire);

      // Thick hub
      const hubGeo = cyl(0.08, 0.08, 0.1, 16);
      const hub = new THREE.Mesh(hubGeo, darkIronMat);
      hub.rotation.x = Math.PI / 2;
      leg.add(hub);

      // Hub cap
      const hubCapGeo = new THREE.SphereGeometry(0.045, 12, 10);
      const hubCap = new THREE.Mesh(hubCapGeo, darkIronMat);
      hubCap.position.set(0, 0, side * 0.06);
      leg.add(hubCap);

      // Spokes (12 spokes radiating out)
      for (let s = 0; s < 12; s++) {
        const angle = (s / 12) * Math.PI * 2;
        const spokeGeo = cyl(0.018, 0.018, 0.34, 8);
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
    const ropeMat = mat(0x8b7355, { roughness: 0.95 });
    const woodGrainMat = mat(0x5a4020, { roughness: 0.9 });

    // ---- Torso — massive, stooped, muscular ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.95, 1.1, 0.75);
    torso.position.set(0, 3.6, 0.1);
    this._body.add(torso);

    // Upper back hunch (stooped posture)
    const hunchGeo = new THREE.SphereGeometry(1, 18, 14);
    const hunch = new THREE.Mesh(hunchGeo, skinMat);
    hunch.scale.set(0.8, 0.5, 0.65);
    hunch.position.set(0, 4.3, -0.3);
    this._body.add(hunch);

    // Torso-to-hunch transition (smoother connection)
    const transGeo = new THREE.SphereGeometry(1, 16, 12);
    const trans = new THREE.Mesh(transGeo, skinMat);
    trans.scale.set(0.85, 0.35, 0.68);
    trans.position.set(0, 4.0, -0.1);
    this._body.add(trans);

    // Chest muscles — massive pectorals
    for (const side of [-1, 1]) {
      const pectGeo = new THREE.SphereGeometry(1, 16, 12);
      const pect = new THREE.Mesh(pectGeo, skinMat);
      pect.scale.set(0.38, 0.28, 0.3);
      pect.position.set(side * 0.32, 3.9, 0.5);
      this._body.add(pect);
    }

    // Belly — huge and muscular
    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.78, 0.65, 0.6);
    belly.position.set(0, 2.9, 0.15);
    this._body.add(belly);

    // Belly-to-torso transition
    const bellyTransGeo = new THREE.SphereGeometry(1, 14, 10);
    const bellyTrans = new THREE.Mesh(bellyTransGeo, skinMat);
    bellyTrans.scale.set(0.82, 0.3, 0.62);
    bellyTrans.position.set(0, 3.25, 0.12);
    this._body.add(bellyTrans);

    // Iron armor bands wrapped around torso (3 bands)
    for (let i = 0; i < 3; i++) {
      const bandY = 3.0 + i * 0.5;
      const bandGeo = cyl(0.82 - i * 0.05, 0.82 - i * 0.05, 0.06, 16);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.position.set(0, bandY, 0.05);
      this._body.add(band);
    }

    // Metal rivets on armor bands
    for (let i = 0; i < 3; i++) {
      const bandY = 3.0 + i * 0.5;
      for (let r = 0; r < 6; r++) {
        const rivetAngle = (r / 6) * Math.PI * 2;
        const rivetGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const rivet = new THREE.Mesh(rivetGeo, ironMat);
        rivet.position.set(
          Math.cos(rivetAngle) * (0.83 - i * 0.05),
          bandY,
          Math.sin(rivetAngle) * (0.83 - i * 0.05),
        );
        this._body.add(rivet);
      }
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

    // Wood grain detail — wooden splint reinforcements on torso
    for (let i = 0; i < 3; i++) {
      const splintGeo = new THREE.BoxGeometry(0.04, 0.6, 0.02);
      const splint = new THREE.Mesh(splintGeo, woodGrainMat);
      splint.position.set(-0.3 + i * 0.3, 3.3, 0.6);
      splint.rotation.z = (i - 1) * 0.1;
      this._body.add(splint);
    }

    // Rope bindings around torso
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const ropeAngle = t * Math.PI * 3;
      const ropeY = 3.0 + t * 0.8;
      const ropeR = 0.76 - t * 0.02;
      const ropeGeo = cyl(0.015, 0.015, 0.06, 8);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(Math.cos(ropeAngle) * ropeR, ropeY, Math.sin(ropeAngle) * ropeR);
      rope.rotation.x = ropeAngle;
      rope.rotation.z = Math.PI / 2;
      this._body.add(rope);
    }

    // ---- Head — heavy brow, small eyes, tusks ----
    this._head.position.set(0, 4.7, 0.35);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 18, 14);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.4, 0.42, 0.38);
    this._head.add(headMesh);

    // Heavy brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const brow = new THREE.Mesh(browGeo, darkSkinMat);
    brow.scale.set(0.42, 0.12, 0.2);
    brow.position.set(0, 0.22, 0.22);
    this._head.add(brow);

    // Small orange glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 14, 12);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.14, 0.14, 0.3);
      this._head.add(eye);

      // Eyelid ridge detail
      const lidGeo = new THREE.SphereGeometry(0.05, 10, 8);
      const lid = new THREE.Mesh(lidGeo, darkSkinMat);
      lid.scale.set(1, 0.4, 0.6);
      lid.position.set(side * 0.14, 0.17, 0.3);
      this._head.add(lid);
    }

    // Nose — broad, brutish
    const noseGeo = new THREE.SphereGeometry(1, 14, 12);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.scale.set(0.1, 0.12, 0.12);
    nose.position.set(0, 0.0, 0.33);
    this._head.add(nose);

    // Nostril holes
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.025, 10, 8);
      const nostril = new THREE.Mesh(nostrilGeo, darkSkinMat);
      nostril.position.set(side * 0.04, -0.03, 0.38);
      this._head.add(nostril);
    }

    // Massive jaw
    const jawGeo = new THREE.SphereGeometry(1, 16, 12);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.scale.set(0.38, 0.2, 0.26);
    jaw.position.set(0, -0.2, 0.12);
    this._head.add(jaw);

    // Chin detail
    const chinGeo = new THREE.SphereGeometry(1, 12, 10);
    const chin = new THREE.Mesh(chinGeo, darkSkinMat);
    chin.scale.set(0.15, 0.08, 0.1);
    chin.position.set(0, -0.3, 0.18);
    this._head.add(chin);

    // Tusks — large, upward-curving
    for (const side of [-1, 1]) {
      const tuskGeo = new THREE.ConeGeometry(0.04, 0.2, 12);
      const tusk = new THREE.Mesh(tuskGeo, tuskMat);
      tusk.position.set(side * 0.15, -0.18, 0.22);
      tusk.rotation.x = -0.5;
      tusk.rotation.z = side * 0.15;
      this._head.add(tusk);

      // Tusk ridge detail
      const ridgeGeo = new THREE.ConeGeometry(0.015, 0.12, 10);
      const ridge = new THREE.Mesh(ridgeGeo, mat(0xb8a880));
      ridge.position.set(side * 0.15, -0.12, 0.24);
      ridge.rotation.x = -0.5;
      ridge.rotation.z = side * 0.15;
      this._head.add(ridge);
    }

    // Ears — small, thick
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(1, 12, 10);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.scale.set(0.08, 0.14, 0.1);
      ear.position.set(side * 0.38, 0.08, 0.0);
      this._head.add(ear);
    }

    // ---- Right arm — holds MASSIVE boulder ----
    this._rightArm.position.set(1.0, 4.1, 0.0);
    this._body.add(this._rightArm);

    // Shoulder
    const rShoulderGeo = new THREE.SphereGeometry(0.28, 16, 14);
    const rShoulder = new THREE.Mesh(rShoulderGeo, skinMat);
    this._rightArm.add(rShoulder);

    // Shoulder-to-arm transition
    const rShTransGeo = new THREE.SphereGeometry(0.22, 14, 10);
    const rShTrans = new THREE.Mesh(rShTransGeo, skinMat);
    rShTrans.position.y = -0.2;
    this._rightArm.add(rShTrans);

    // Upper arm — massive
    const rUpperGeo = cyl(0.24, 0.2, 1.1, 14);
    const rUpper = new THREE.Mesh(rUpperGeo, skinMat);
    rUpper.position.y = -0.55;
    this._rightArm.add(rUpper);

    // Bicep muscle bulge
    const rBicepGeo = new THREE.SphereGeometry(0.15, 12, 10);
    const rBicep = new THREE.Mesh(rBicepGeo, skinMat);
    rBicep.scale.set(1, 1.3, 0.8);
    rBicep.position.set(0, -0.4, 0.1);
    this._rightArm.add(rBicep);

    // Iron band on upper arm
    const rArmBandGeo = cyl(0.25, 0.25, 0.06, 16);
    const rArmBand = new THREE.Mesh(rArmBandGeo, ironMat);
    rArmBand.position.y = -0.3;
    this._rightArm.add(rArmBand);

    // Forearm
    const rForeGeo = cyl(0.2, 0.16, 1.0, 14);
    const rFore = new THREE.Mesh(rForeGeo, skinMat);
    rFore.position.y = -1.4;
    this._rightArm.add(rFore);

    // Iron wrist cuff
    const rWristGeo = cyl(0.19, 0.19, 0.1, 16);
    const rWrist = new THREE.Mesh(rWristGeo, ironMat);
    rWrist.position.y = -1.85;
    this._rightArm.add(rWrist);

    // Hand
    const rHandGeo = new THREE.SphereGeometry(0.2, 16, 12);
    const rHand = new THREE.Mesh(rHandGeo, darkSkinMat);
    rHand.position.y = -2.0;
    this._rightArm.add(rHand);

    // Finger stubs gripping boulder
    for (let f = 0; f < 4; f++) {
      const fingerAngle = -0.4 + f * 0.27;
      const fingerGeo = cyl(0.04, 0.03, 0.12, 8);
      const finger = new THREE.Mesh(fingerGeo, darkSkinMat);
      finger.position.set(Math.sin(fingerAngle) * 0.15, -2.1, Math.cos(fingerAngle) * 0.15);
      finger.rotation.x = 0.3;
      this._rightArm.add(finger);
    }

    // MASSIVE boulder in right hand
    const boulderGeo = new THREE.SphereGeometry(0.55, 18, 14);
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

    // Boulder surface bumps for texture
    for (let i = 0; i < 6; i++) {
      const bumpAngle = Math.random() * Math.PI * 2;
      const bumpPhi = Math.random() * Math.PI;
      const bumpGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 6);
      const bump = new THREE.Mesh(bumpGeo, boulderMat);
      bump.position.set(
        Math.cos(bumpAngle) * Math.sin(bumpPhi) * 0.48,
        -2.5 + Math.cos(bumpPhi) * 0.48,
        Math.sin(bumpAngle) * Math.sin(bumpPhi) * 0.48,
      );
      bump.scale.set(1, 0.6, 1);
      this._rightArm.add(bump);
    }

    // ---- Left arm — iron chain wrapped around it ----
    this._leftArm.position.set(-1.0, 4.1, 0.0);
    this._body.add(this._leftArm);

    // Shoulder
    const lShoulderGeo = new THREE.SphereGeometry(0.28, 16, 14);
    const lShoulder = new THREE.Mesh(lShoulderGeo, skinMat);
    this._leftArm.add(lShoulder);

    // Shoulder-to-arm transition
    const lShTransGeo = new THREE.SphereGeometry(0.22, 14, 10);
    const lShTrans = new THREE.Mesh(lShTransGeo, skinMat);
    lShTrans.position.y = -0.2;
    this._leftArm.add(lShTrans);

    // Upper arm
    const lUpperGeo = cyl(0.24, 0.2, 1.1, 14);
    const lUpper = new THREE.Mesh(lUpperGeo, skinMat);
    lUpper.position.y = -0.55;
    this._leftArm.add(lUpper);

    // Iron band on upper arm
    const lArmBandGeo = cyl(0.25, 0.25, 0.06, 16);
    const lArmBand = new THREE.Mesh(lArmBandGeo, ironMat);
    lArmBand.position.y = -0.3;
    this._leftArm.add(lArmBand);

    // Forearm
    const lForeGeo = cyl(0.2, 0.16, 1.0, 14);
    const lFore = new THREE.Mesh(lForeGeo, skinMat);
    lFore.position.y = -1.4;
    this._leftArm.add(lFore);

    // Iron wrist cuff
    const lWristGeo = cyl(0.19, 0.19, 0.1, 16);
    const lWrist = new THREE.Mesh(lWristGeo, ironMat);
    lWrist.position.y = -1.85;
    this._leftArm.add(lWrist);

    // Hand
    const lHandGeo = new THREE.SphereGeometry(0.2, 16, 12);
    const lHand = new THREE.Mesh(lHandGeo, darkSkinMat);
    lHand.position.y = -2.0;
    this._leftArm.add(lHand);

    // Iron chain wrapped in spiral around left arm
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      const chainAngle = t * Math.PI * 5;
      const chainY = -0.2 - t * 1.6;
      const chainR = 0.22 - t * 0.04;
      const linkGeo = cyl(0.025, 0.025, 0.08, 10);
      const link = new THREE.Mesh(linkGeo, chainMat);
      link.position.set(Math.cos(chainAngle) * chainR, chainY, Math.sin(chainAngle) * chainR);
      link.rotation.x = chainAngle;
      link.rotation.z = Math.PI / 2;
      this._leftArm.add(link);
    }

    // Dangling chain end
    for (let i = 0; i < 4; i++) {
      const dGeo = cyl(0.022, 0.022, 0.07, 10);
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
      const thighGeo = cyl(0.3, 0.25, 1.0, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.5;
      leg.add(thigh);

      // Thigh muscle bulge
      const thighBulgeGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const thighBulge = new THREE.Mesh(thighBulgeGeo, skinMat);
      thighBulge.scale.set(1, 1.2, 0.8);
      thighBulge.position.set(0, -0.35, 0.1);
      leg.add(thighBulge);

      // Knee joint transition
      const kneeGeo = new THREE.SphereGeometry(0.22, 14, 10);
      const knee = new THREE.Mesh(kneeGeo, skinMat);
      knee.position.y = -0.95;
      leg.add(knee);

      // Shin — tree-trunk thick
      const shinGeo = cyl(0.25, 0.18, 0.9, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -1.3;
      leg.add(shin);

      // Iron ankle band / cuff
      const ankleBandGeo = cyl(0.22, 0.22, 0.1, 16);
      const ankleBand = new THREE.Mesh(ankleBandGeo, ironMat);
      ankleBand.position.y = -1.72;
      leg.add(ankleBand);

      // Foot — huge, flat
      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkSkinMat);
      foot.scale.set(0.22, 0.12, 0.3);
      foot.position.set(0, -1.88, 0.1);
      leg.add(foot);

      // Toes
      for (let t = -1; t <= 1; t++) {
        const toeGeo = new THREE.SphereGeometry(0.055, 10, 8);
        const toe = new THREE.Mesh(toeGeo, darkSkinMat);
        toe.position.set(t * 0.09, -1.92, 0.3);
        leg.add(toe);

        // Toenail
        const nailGeo = new THREE.ConeGeometry(0.02, 0.04, 8);
        const nail = new THREE.Mesh(nailGeo, mat(0x4a4035));
        nail.position.set(t * 0.09, -1.92, 0.34);
        nail.rotation.x = Math.PI / 2;
        leg.add(nail);
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

    // Rope binding on loincloth waist
    const waistRopeGeo = cyl(0.52, 0.52, 0.04, 16);
    const waistRope = new THREE.Mesh(waistRopeGeo, ropeMat);
    waistRope.position.set(0, 2.4, 0);
    this._body.add(waistRope);

    // Rubble / broken stones at feet — scattered small spheres near ground
    for (let i = 0; i < 8; i++) {
      const rubbleSize = 0.04 + Math.random() * 0.06;
      const rubbleGeo = new THREE.SphereGeometry(rubbleSize, 10, 8);
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
    const veinMat = mat(0x440808, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });

    // ---- Torso — muscular, reptilian, upright ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, scaleMat);
    torso.scale.set(0.65, 0.85, 0.55);
    torso.position.y = 2.6;
    this._body.add(torso);

    // Upper back musculature
    const backGeo = new THREE.SphereGeometry(1, 18, 14);
    const back = new THREE.Mesh(backGeo, darkScaleMat);
    back.scale.set(0.6, 0.7, 0.5);
    back.position.set(0, 2.8, -0.15);
    this._body.add(back);

    // Chest / belly plates — lighter gold-orange
    const chestGeo = new THREE.SphereGeometry(1, 18, 14);
    const chest = new THREE.Mesh(chestGeo, bellyMat);
    chest.scale.set(0.45, 0.55, 0.3);
    chest.position.set(0, 2.5, 0.3);
    this._body.add(chest);

    // Lower belly plate
    const lowerBellyGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerBelly = new THREE.Mesh(lowerBellyGeo, bellyMat);
    lowerBelly.scale.set(0.38, 0.35, 0.25);
    lowerBelly.position.set(0, 1.9, 0.25);
    this._body.add(lowerBelly);

    // Belly scale segments — horizontal ridges
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.SphereGeometry(1, 14, 6);
      const ridge = new THREE.Mesh(ridgeGeo, bellyMat);
      ridge.scale.set(0.4, 0.04, 0.22);
      ridge.position.set(0, 2.05 + i * 0.18, 0.35);
      this._body.add(ridge);
    }

    // ---- Neck — long, serpentine (chain of segments) ----
    const neckSegments = 5;
    for (let i = 0; i < neckSegments; i++) {
      const t = i / neckSegments;
      const radius = 0.18 - t * 0.04;
      const segGeo = new THREE.SphereGeometry(radius, 16, 12);
      const seg = new THREE.Mesh(segGeo, scaleMat);
      seg.position.set(0, 3.3 + t * 0.8, 0.15 + t * 0.35);
      seg.scale.set(1, 1.2, 0.9);
      this._body.add(seg);
    }

    // Neck scale detail — small overlapping cones along neck
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const neckScaleGeo = new THREE.ConeGeometry(0.03, 0.06, 10);
      const neckScale = new THREE.Mesh(neckScaleGeo, darkScaleMat);
      neckScale.position.set(0, 3.35 + t * 0.75, 0.25 + t * 0.33);
      neckScale.rotation.x = -0.6;
      this._body.add(neckScale);
    }

    // ---- Head — elongated snout, horns, eyes ----
    this._head.position.set(0, 4.1, 0.55);
    this._body.add(this._head);

    // Skull
    const skullGeo = new THREE.SphereGeometry(1, 18, 14);
    const skull = new THREE.Mesh(skullGeo, scaleMat);
    skull.scale.set(0.22, 0.2, 0.24);
    this._head.add(skull);

    // Elongated snout
    const snoutGeo = cyl(0.1, 0.06, 0.35, 14);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.28);
    this._head.add(snout);

    // Snout bridge detail
    const snoutBridgeGeo = new THREE.SphereGeometry(1, 12, 10);
    const snoutBridge = new THREE.Mesh(snoutBridgeGeo, darkScaleMat);
    snoutBridge.scale.set(0.08, 0.04, 0.16);
    snoutBridge.position.set(0, 0.06, 0.25);
    this._head.add(snoutBridge);

    // Upper jaw ridge
    const jawRidgeGeo = new THREE.SphereGeometry(1, 14, 10);
    const jawRidge = new THREE.Mesh(jawRidgeGeo, darkScaleMat);
    jawRidge.scale.set(0.14, 0.06, 0.2);
    jawRidge.position.set(0, 0.08, 0.18);
    this._head.add(jawRidge);

    // Lower jaw
    const lowerJawGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, scaleMat);
    lowerJaw.scale.set(0.16, 0.08, 0.22);
    lowerJaw.position.set(0, -0.12, 0.12);
    this._head.add(lowerJaw);

    // Glowing orange eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 16, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.13, 0.08, 0.16);
      this._head.add(eye);

      // Eye socket ridge
      const socketGeo = new THREE.SphereGeometry(0.055, 12, 10);
      const socket = new THREE.Mesh(socketGeo, darkScaleMat);
      socket.scale.set(1, 0.5, 0.7);
      socket.position.set(side * 0.13, 0.1, 0.15);
      this._head.add(socket);
    }

    // Nostrils with faint glow — deeper nostril holes
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 12, 10);
      const nostril = new THREE.Mesh(nostrilGeo, nostrilGlow);
      nostril.position.set(side * 0.04, 0.0, 0.42);
      this._head.add(nostril);

      // Nostril rim
      const rimGeo = new THREE.SphereGeometry(0.028, 10, 8);
      const rim = new THREE.Mesh(rimGeo, scaleMat);
      rim.scale.set(1, 0.6, 0.6);
      rim.position.set(side * 0.04, 0.01, 0.41);
      this._head.add(rim);
    }

    // Two swept-back horns
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.04, 0.35, 12);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.14, 0.15, -0.1);
      horn.rotation.x = -0.8;
      horn.rotation.z = side * 0.2;
      this._head.add(horn);

      // Horn ridges (ring details)
      for (let r = 0; r < 3; r++) {
        const ringGeo = cyl(0.035 - r * 0.006, 0.035 - r * 0.006, 0.01, 10);
        const ring = new THREE.Mesh(ringGeo, mat(0x443322));
        ring.position.set(side * 0.14, 0.15 + (r + 1) * 0.06, -0.1);
        ring.rotation.x = -0.8;
        ring.rotation.z = side * 0.2;
        this._head.add(ring);
      }
    }

    // Row of small spikes along jaw
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.015, 0.06, 10);
      const spike = new THREE.Mesh(spikeGeo, hornMat);
      spike.position.set(0, -0.1, 0.3 - i * 0.08);
      spike.rotation.x = -0.3;
      this._head.add(spike);
    }

    // Small teeth along jaw edge
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        const toothGeo = new THREE.ConeGeometry(0.008, 0.03, 8);
        const tooth = new THREE.Mesh(toothGeo, mat(0xeeeecc));
        tooth.position.set(side * (0.08 - i * 0.005), -0.14, 0.1 + i * 0.05);
        tooth.rotation.x = Math.PI;
        this._head.add(tooth);
      }
    }

    // ---- Wings on _leftArm / _rightArm — bat-like ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.65, 3.2, -0.2);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, scaleMat);
      wing.add(shoulder);

      // Upper arm bone
      const upperBoneGeo = cyl(0.06, 0.04, 0.8, 12);
      const upperBone = new THREE.Mesh(upperBoneGeo, darkScaleMat);
      upperBone.position.set(side * 0.3, 0.1, -0.15);
      upperBone.rotation.z = side * 0.8;
      wing.add(upperBone);

      // Forearm bone
      const foreBoneGeo = cyl(0.04, 0.03, 0.7, 12);
      const foreBone = new THREE.Mesh(foreBoneGeo, darkScaleMat);
      foreBone.position.set(side * 0.7, -0.1, -0.2);
      foreBone.rotation.z = side * 1.2;
      wing.add(foreBone);

      // Elbow joint detail
      const elbowGeo = new THREE.SphereGeometry(0.05, 12, 10);
      const elbow = new THREE.Mesh(elbowGeo, scaleMat);
      elbow.position.set(side * 0.5, 0.0, -0.18);
      wing.add(elbow);

      // Wing finger bones (three)
      for (let f = 0; f < 3; f++) {
        const fingerGeo = cyl(0.025, 0.01, 0.6 - f * 0.1, 10);
        const finger = new THREE.Mesh(fingerGeo, darkScaleMat);
        const fAngle = side * (0.9 + f * 0.35);
        finger.position.set(side * 1.0 + Math.sin(fAngle) * 0.2, -0.15 - f * 0.2, -0.25);
        finger.rotation.z = fAngle;
        wing.add(finger);

        // Claw at finger tip
        const fClawGeo = new THREE.ConeGeometry(0.015, 0.05, 8);
        const fClaw = new THREE.Mesh(fClawGeo, clawMat);
        fClaw.position.set(
          side * 1.0 + Math.sin(fAngle) * 0.2 + Math.sin(fAngle) * 0.3,
          -0.15 - f * 0.2 - 0.1,
          -0.25,
        );
        fClaw.rotation.z = fAngle;
        wing.add(fClaw);
      }

      // Wing membrane — semi-transparent deep red (bat-wing shape)
      const membraneGeo = wingShape(1.2, 1.0);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 0.6, -0.15, -0.22);
      membrane.rotation.y = side * 0.2;
      membrane.rotation.x = -0.15;
      membrane.scale.x = side;
      wing.add(membrane);

      // Wing membrane veins — thin cylinders
      for (let v = 0; v < 3; v++) {
        const veinGeo = cyl(0.008, 0.004, 0.7 - v * 0.12, 6);
        const vein = new THREE.Mesh(veinGeo, veinMat);
        vein.position.set(side * (0.35 + v * 0.2), -0.15 - v * 0.08, -0.21);
        vein.rotation.z = side * (0.6 + v * 0.2);
        wing.add(vein);
      }
    }

    // ---- Legs — digitigrade (reverse-knee) with 3 claws ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.5, 0.0);
      this._body.add(leg);

      // Upper thigh
      const thighGeo = cyl(0.18, 0.14, 0.6, 14);
      const thigh = new THREE.Mesh(thighGeo, scaleMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Thigh muscle detail
      const thighMuscleGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const thighMuscle = new THREE.Mesh(thighMuscleGeo, scaleMat);
      thighMuscle.scale.set(1, 1.3, 0.7);
      thighMuscle.position.set(0, -0.25, 0.06);
      leg.add(thighMuscle);

      // Reverse-knee joint
      const kneeGeo = new THREE.SphereGeometry(0.1, 14, 12);
      const knee = new THREE.Mesh(kneeGeo, scaleMat);
      knee.position.set(0, -0.65, 0.08);
      leg.add(knee);

      // Lower shin — angled forward (digitigrade)
      const shinGeo = cyl(0.12, 0.08, 0.55, 12);
      const shin = new THREE.Mesh(shinGeo, scaleMat);
      shin.position.set(0, -0.95, 0.2);
      shin.rotation.x = 0.4;
      leg.add(shin);

      // Ankle
      const ankleGeo = new THREE.SphereGeometry(0.07, 14, 12);
      const ankle = new THREE.Mesh(ankleGeo, scaleMat);
      ankle.position.set(0, -1.2, 0.3);
      leg.add(ankle);

      // Foot pad
      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkScaleMat);
      foot.scale.set(0.12, 0.05, 0.15);
      foot.position.set(0, -1.3, 0.35);
      leg.add(foot);

      // 3 claws with knuckle detail
      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.025, 0.12, 10);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.06, -1.32, 0.46);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);

        // Claw base / knuckle
        const knuckleGeo = new THREE.SphereGeometry(0.03, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkScaleMat);
        knuckle.position.set(c * 0.06, -1.31, 0.4);
        leg.add(knuckle);
      }
    }

    // ---- Tail — chain of decreasing segments from lower back ----
    const tailSegs = 8;
    for (let i = 0; i < tailSegs; i++) {
      const t = i / tailSegs;
      const radius = 0.14 * (1 - t * 0.7);
      const segGeo = new THREE.SphereGeometry(radius, 14, 10);
      const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? scaleMat : darkScaleMat);
      seg.position.set(0, 1.6 - i * 0.15, -0.4 - i * 0.22);
      this._body.add(seg);
    }

    // Tail tip — pointed
    const tailTipGeo = new THREE.ConeGeometry(0.04, 0.18, 12);
    const tailTip = new THREE.Mesh(tailTipGeo, darkScaleMat);
    tailTip.position.set(0, 1.6 - tailSegs * 0.15, -0.4 - tailSegs * 0.22);
    tailTip.rotation.x = -Math.PI / 2;
    this._body.add(tailTip);

    // ---- Spinal ridge — row of triangular spines down the back ----
    const spineCount = 10;
    for (let i = 0; i < spineCount; i++) {
      const t = i / spineCount;
      const height = 0.12 * (1 - Math.abs(t - 0.3) * 1.2);
      const spineGeo = new THREE.ConeGeometry(0.03, Math.max(0.04, height), 10);
      const spine = new THREE.Mesh(spineGeo, darkScaleMat);
      spine.position.set(0, 3.5 - i * 0.3, -0.35 - t * 0.3);
      this._body.add(spine);
    }

    // Individual scales along spine/neck — overlapping small cones
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      for (const side of [-1, 1]) {
        const scaleGeo = new THREE.ConeGeometry(0.025, 0.04, 8);
        const scale = new THREE.Mesh(scaleGeo, darkScaleMat);
        scale.position.set(side * 0.08, 3.4 - i * 0.22, -0.3 - t * 0.28);
        scale.rotation.x = -0.8;
        this._body.add(scale);
      }
    }
  }

  // ---- Frost Dragon builder --------------------------------------------------

  private _buildFrostDragon(): void {
    const scaleMat = mat(0x4a7a9a);               // icy blue scales
    const darkScaleMat = mat(0x3a6080);            // darker blue-grey back scales
    const bellyMat = mat(0xc8d8e8);               // silver-white belly plates
    const eyeMat = mat(0x88ccff, { emissive: 0x4488cc });
    const hornMat = mat(0xddeeff);                 // ice-white horns
    const clawMat = mat(0xbbccdd);
    const membraneMat = mat(0x3a6688, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const nostrilGlow = mat(0x88ccff, { emissive: 0x4488cc });
    const icicleMat = mat(0xccddee, { transparent: true, opacity: 0.8 });
    const crystalMat = mat(0xaabbcc, { transparent: true, opacity: 0.75 });
    const veinMat = mat(0x2a4a60, { transparent: true, opacity: 0.5, side: THREE.DoubleSide });

    // ---- Torso — muscular, reptilian, upright ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, scaleMat);
    torso.scale.set(0.65, 0.85, 0.55);
    torso.position.y = 2.6;
    this._body.add(torso);

    // Upper back
    const backGeo = new THREE.SphereGeometry(1, 18, 14);
    const back = new THREE.Mesh(backGeo, darkScaleMat);
    back.scale.set(0.6, 0.7, 0.5);
    back.position.set(0, 2.8, -0.15);
    this._body.add(back);

    // Chest / belly plates — silver-white
    const chestGeo = new THREE.SphereGeometry(1, 18, 14);
    const chest = new THREE.Mesh(chestGeo, bellyMat);
    chest.scale.set(0.45, 0.55, 0.3);
    chest.position.set(0, 2.5, 0.3);
    this._body.add(chest);

    // Lower belly plate
    const lowerBellyGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerBelly = new THREE.Mesh(lowerBellyGeo, bellyMat);
    lowerBelly.scale.set(0.38, 0.35, 0.25);
    lowerBelly.position.set(0, 1.9, 0.25);
    this._body.add(lowerBelly);

    // Belly scale segments — horizontal ridges
    for (let i = 0; i < 5; i++) {
      const ridgeGeo = new THREE.SphereGeometry(1, 14, 6);
      const ridge = new THREE.Mesh(ridgeGeo, bellyMat);
      ridge.scale.set(0.4, 0.04, 0.22);
      ridge.position.set(0, 2.05 + i * 0.18, 0.35);
      this._body.add(ridge);
    }

    // ---- Neck — long, serpentine ----
    const neckSegments = 5;
    for (let i = 0; i < neckSegments; i++) {
      const t = i / neckSegments;
      const radius = 0.18 - t * 0.04;
      const segGeo = new THREE.SphereGeometry(radius, 16, 12);
      const seg = new THREE.Mesh(segGeo, scaleMat);
      seg.position.set(0, 3.3 + t * 0.8, 0.15 + t * 0.35);
      seg.scale.set(1, 1.2, 0.9);
      this._body.add(seg);
    }

    // Frost scales along neck
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const neckScaleGeo = new THREE.ConeGeometry(0.03, 0.06, 10);
      const neckScale = new THREE.Mesh(neckScaleGeo, icicleMat);
      neckScale.position.set(0, 3.35 + t * 0.75, 0.25 + t * 0.33);
      neckScale.rotation.x = -0.6;
      this._body.add(neckScale);
    }

    // ---- Head — elongated snout, horns, eyes ----
    this._head.position.set(0, 4.1, 0.55);
    this._body.add(this._head);

    // Skull
    const skullGeo = new THREE.SphereGeometry(1, 18, 14);
    const skull = new THREE.Mesh(skullGeo, scaleMat);
    skull.scale.set(0.22, 0.2, 0.24);
    this._head.add(skull);

    // Elongated snout
    const snoutGeo = cyl(0.1, 0.06, 0.35, 14);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.28);
    this._head.add(snout);

    // Snout bridge detail
    const snoutBridgeGeo = new THREE.SphereGeometry(1, 12, 10);
    const snoutBridge = new THREE.Mesh(snoutBridgeGeo, darkScaleMat);
    snoutBridge.scale.set(0.08, 0.04, 0.16);
    snoutBridge.position.set(0, 0.06, 0.25);
    this._head.add(snoutBridge);

    // Upper jaw ridge
    const jawRidgeGeo = new THREE.SphereGeometry(1, 14, 10);
    const jawRidge = new THREE.Mesh(jawRidgeGeo, darkScaleMat);
    jawRidge.scale.set(0.14, 0.06, 0.2);
    jawRidge.position.set(0, 0.08, 0.18);
    this._head.add(jawRidge);

    // Lower jaw
    const lowerJawGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, scaleMat);
    lowerJaw.scale.set(0.16, 0.08, 0.22);
    lowerJaw.position.set(0, -0.12, 0.12);
    this._head.add(lowerJaw);

    // Icicles hanging from jaw (4 small cones pointing down)
    for (let i = 0; i < 4; i++) {
      const icicleGeo = new THREE.ConeGeometry(0.015, 0.08 + i * 0.01, 10);
      const icicle = new THREE.Mesh(icicleGeo, icicleMat);
      icicle.position.set(-0.05 + i * 0.035, -0.18, 0.15 + i * 0.04);
      icicle.rotation.x = Math.PI; // point downward
      this._head.add(icicle);
    }

    // Pale blue eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 16, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.13, 0.08, 0.16);
      this._head.add(eye);

      // Eye socket ridge
      const socketGeo = new THREE.SphereGeometry(0.055, 12, 10);
      const socket = new THREE.Mesh(socketGeo, darkScaleMat);
      socket.scale.set(1, 0.5, 0.7);
      socket.position.set(side * 0.13, 0.1, 0.15);
      this._head.add(socket);
    }

    // Nostrils with faint icy glow
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.02, 12, 10);
      const nostril = new THREE.Mesh(nostrilGeo, nostrilGlow);
      nostril.position.set(side * 0.04, 0.0, 0.42);
      this._head.add(nostril);

      // Nostril rim
      const rimGeo = new THREE.SphereGeometry(0.028, 10, 8);
      const rim = new THREE.Mesh(rimGeo, scaleMat);
      rim.scale.set(1, 0.6, 0.6);
      rim.position.set(side * 0.04, 0.01, 0.41);
      this._head.add(rim);
    }

    // Two swept-back ice-white horns
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.04, 0.35, 12);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.14, 0.15, -0.1);
      horn.rotation.x = -0.8;
      horn.rotation.z = side * 0.2;
      this._head.add(horn);

      // Horn ridges
      for (let r = 0; r < 3; r++) {
        const ringGeo = cyl(0.035 - r * 0.006, 0.035 - r * 0.006, 0.01, 10);
        const ring = new THREE.Mesh(ringGeo, crystalMat);
        ring.position.set(side * 0.14, 0.15 + (r + 1) * 0.06, -0.1);
        ring.rotation.x = -0.8;
        ring.rotation.z = side * 0.2;
        this._head.add(ring);
      }
    }

    // Row of small spikes along jaw
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.015, 0.06, 10);
      const spike = new THREE.Mesh(spikeGeo, hornMat);
      spike.position.set(0, -0.1, 0.3 - i * 0.08);
      spike.rotation.x = -0.3;
      this._head.add(spike);
    }

    // ---- Wings — bat-like ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.65, 3.2, -0.2);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, scaleMat);
      wing.add(shoulder);

      // Upper arm bone
      const upperBoneGeo = cyl(0.06, 0.04, 0.8, 12);
      const upperBone = new THREE.Mesh(upperBoneGeo, darkScaleMat);
      upperBone.position.set(side * 0.3, 0.1, -0.15);
      upperBone.rotation.z = side * 0.8;
      wing.add(upperBone);

      // Forearm bone
      const foreBoneGeo = cyl(0.04, 0.03, 0.7, 12);
      const foreBone = new THREE.Mesh(foreBoneGeo, darkScaleMat);
      foreBone.position.set(side * 0.7, -0.1, -0.2);
      foreBone.rotation.z = side * 1.2;
      wing.add(foreBone);

      // Elbow joint detail
      const elbowGeo = new THREE.SphereGeometry(0.05, 12, 10);
      const elbow = new THREE.Mesh(elbowGeo, scaleMat);
      elbow.position.set(side * 0.5, 0.0, -0.18);
      wing.add(elbow);

      // Wing finger bones (three)
      for (let f = 0; f < 3; f++) {
        const fingerGeo = cyl(0.025, 0.01, 0.6 - f * 0.1, 10);
        const finger = new THREE.Mesh(fingerGeo, darkScaleMat);
        const fAngle = side * (0.9 + f * 0.35);
        finger.position.set(side * 1.0 + Math.sin(fAngle) * 0.2, -0.15 - f * 0.2, -0.25);
        finger.rotation.z = fAngle;
        wing.add(finger);
      }

      // Wing membrane — pale blue semi-transparent (bat-wing shape)
      const membraneGeo = wingShape(1.2, 1.0);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 0.6, -0.15, -0.22);
      membrane.rotation.y = side * 0.2;
      membrane.rotation.x = -0.15;
      membrane.scale.x = side;
      wing.add(membrane);

      // Wing membrane veins — thin cylinders
      for (let v = 0; v < 3; v++) {
        const veinGeo = cyl(0.008, 0.004, 0.7 - v * 0.12, 6);
        const vein = new THREE.Mesh(veinGeo, veinMat);
        vein.position.set(side * (0.35 + v * 0.2), -0.15 - v * 0.08, -0.21);
        vein.rotation.z = side * (0.6 + v * 0.2);
        wing.add(vein);
      }
    }

    // ---- Legs — digitigrade with 3 claws ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.5, 0.0);
      this._body.add(leg);

      const thighGeo = cyl(0.18, 0.14, 0.6, 14);
      const thigh = new THREE.Mesh(thighGeo, scaleMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Thigh muscle detail
      const thighMuscleGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const thighMuscle = new THREE.Mesh(thighMuscleGeo, scaleMat);
      thighMuscle.scale.set(1, 1.3, 0.7);
      thighMuscle.position.set(0, -0.25, 0.06);
      leg.add(thighMuscle);

      const kneeGeo = new THREE.SphereGeometry(0.1, 14, 12);
      const knee = new THREE.Mesh(kneeGeo, scaleMat);
      knee.position.set(0, -0.65, 0.08);
      leg.add(knee);

      const shinGeo = cyl(0.12, 0.08, 0.55, 12);
      const shin = new THREE.Mesh(shinGeo, scaleMat);
      shin.position.set(0, -0.95, 0.2);
      shin.rotation.x = 0.4;
      leg.add(shin);

      const ankleGeo = new THREE.SphereGeometry(0.07, 14, 12);
      const ankle = new THREE.Mesh(ankleGeo, scaleMat);
      ankle.position.set(0, -1.2, 0.3);
      leg.add(ankle);

      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkScaleMat);
      foot.scale.set(0.12, 0.05, 0.15);
      foot.position.set(0, -1.3, 0.35);
      leg.add(foot);

      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.025, 0.12, 10);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.06, -1.32, 0.46);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);

        // Claw base / knuckle
        const knuckleGeo = new THREE.SphereGeometry(0.03, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkScaleMat);
        knuckle.position.set(c * 0.06, -1.31, 0.4);
        leg.add(knuckle);
      }
    }

    // ---- Tail — chain of decreasing segments ----
    const tailSegs = 8;
    for (let i = 0; i < tailSegs; i++) {
      const t = i / tailSegs;
      const radius = 0.14 * (1 - t * 0.7);
      const segGeo = new THREE.SphereGeometry(radius, 14, 10);
      const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? scaleMat : darkScaleMat);
      seg.position.set(0, 1.6 - i * 0.15, -0.4 - i * 0.22);
      this._body.add(seg);
    }

    // Tail tip
    const tailTipGeo = new THREE.ConeGeometry(0.04, 0.18, 12);
    const tailTip = new THREE.Mesh(tailTipGeo, darkScaleMat);
    tailTip.position.set(0, 1.6 - tailSegs * 0.15, -0.4 - tailSegs * 0.22);
    tailTip.rotation.x = -Math.PI / 2;
    this._body.add(tailTip);

    // ---- Spinal ridge — frost crystals (box geometry instead of cones) ----
    const spineCount = 10;
    for (let i = 0; i < spineCount; i++) {
      const t = i / spineCount;
      const height = 0.12 * (1 - Math.abs(t - 0.3) * 1.2);
      const crystalH = Math.max(0.04, height);
      const spineGeo = new THREE.BoxGeometry(0.04, crystalH, 0.04);
      const spine = new THREE.Mesh(spineGeo, crystalMat);
      spine.position.set(0, 3.5 - i * 0.3, -0.35 - t * 0.3);
      spine.rotation.z = ((i % 2) * 2 - 1) * 0.15; // slight alternating tilt
      this._body.add(spine);
    }

    // Individual scales along spine — overlapping frost cones
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      for (const side of [-1, 1]) {
        const scaleGeo = new THREE.ConeGeometry(0.025, 0.04, 8);
        const scale = new THREE.Mesh(scaleGeo, icicleMat);
        scale.position.set(side * 0.08, 3.4 - i * 0.22, -0.3 - t * 0.28);
        scale.rotation.x = -0.8;
        this._body.add(scale);
      }
    }
  }

  // ---- Fire Dragon builder ---------------------------------------------------

  private _buildFireDragon(): void {
    const scaleMat = mat(0x6b0f0f);               // deep volcanic red scales
    const darkScaleMat = mat(0x440808);            // darker back scales
    const bellyMat = mat(0xff8833);               // molten orange belly plates
    const eyeMat = mat(0xff8800, { emissive: 0xff4400 });
    const hornMat = mat(0x221111);                 // dark horns
    const clawMat = mat(0x1a0a0a);
    const membraneMat = mat(0x551111, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const nostrilGlow = mat(0xff4400, { emissive: 0xff2200 });
    const lavaCrackMat = mat(0xff6600, { emissive: 0xff4400, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const armorMat = mat(0x440808);
    const veinMat = mat(0x330505, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });

    // ---- Torso — muscular, reptilian, upright (~20% bigger) ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, scaleMat);
    torso.scale.set(0.78, 1.02, 0.66);
    torso.position.y = 2.6;
    this._body.add(torso);

    // Upper back musculature
    const backGeo = new THREE.SphereGeometry(1, 18, 14);
    const back = new THREE.Mesh(backGeo, darkScaleMat);
    back.scale.set(0.72, 0.84, 0.6);
    back.position.set(0, 2.8, -0.15);
    this._body.add(back);

    // Chest / belly plates — molten orange
    const chestGeo = new THREE.SphereGeometry(1, 18, 14);
    const chest = new THREE.Mesh(chestGeo, bellyMat);
    chest.scale.set(0.54, 0.66, 0.36);
    chest.position.set(0, 2.5, 0.3);
    this._body.add(chest);

    // Lower belly plate
    const lowerBellyGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerBelly = new THREE.Mesh(lowerBellyGeo, bellyMat);
    lowerBelly.scale.set(0.46, 0.42, 0.3);
    lowerBelly.position.set(0, 1.9, 0.25);
    this._body.add(lowerBelly);

    // Belly scale segments — horizontal ridges
    for (let i = 0; i < 6; i++) {
      const ridgeGeo = new THREE.SphereGeometry(1, 14, 6);
      const ridge = new THREE.Mesh(ridgeGeo, bellyMat);
      ridge.scale.set(0.48, 0.04, 0.26);
      ridge.position.set(0, 1.95 + i * 0.18, 0.38);
      this._body.add(ridge);
    }

    // Glowing lava cracks on torso (emissive orange/red planes)
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 1.5 + 0.3;
      const crackGeo = new THREE.PlaneGeometry(0.03, 0.4 + i * 0.05);
      const crack = new THREE.Mesh(crackGeo, lavaCrackMat);
      crack.position.set(
        Math.cos(angle) * 0.55,
        2.4 + i * 0.15,
        Math.sin(angle) * 0.55,
      );
      crack.lookAt(0, crack.position.y, 0);
      this._body.add(crack);
    }

    // Armor plates on chest (overlapping sphere scales)
    for (let row = 0; row < 3; row++) {
      for (let col = -1; col <= 1; col++) {
        const plateGeo = new THREE.SphereGeometry(0.08, 14, 10);
        const plate = new THREE.Mesh(plateGeo, armorMat);
        plate.scale.set(1.2, 0.5, 0.8);
        plate.position.set(col * 0.12, 2.2 + row * 0.18, 0.42);
        this._body.add(plate);
      }
    }

    // ---- Neck — long, serpentine ----
    const neckSegments = 5;
    for (let i = 0; i < neckSegments; i++) {
      const t = i / neckSegments;
      const radius = 0.22 - t * 0.05; // thicker neck
      const segGeo = new THREE.SphereGeometry(radius, 16, 12);
      const seg = new THREE.Mesh(segGeo, scaleMat);
      seg.position.set(0, 3.3 + t * 0.8, 0.15 + t * 0.35);
      seg.scale.set(1, 1.2, 0.9);
      this._body.add(seg);
    }

    // Neck scale detail — small overlapping cones
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const neckScaleGeo = new THREE.ConeGeometry(0.035, 0.07, 10);
      const neckScale = new THREE.Mesh(neckScaleGeo, darkScaleMat);
      neckScale.position.set(0, 3.35 + t * 0.75, 0.25 + t * 0.33);
      neckScale.rotation.x = -0.6;
      this._body.add(neckScale);
    }

    // ---- Head — elongated snout, horns, eyes ----
    this._head.position.set(0, 4.1, 0.55);
    this._body.add(this._head);

    // Skull (slightly larger)
    const skullGeo = new THREE.SphereGeometry(1, 18, 14);
    const skull = new THREE.Mesh(skullGeo, scaleMat);
    skull.scale.set(0.26, 0.24, 0.29);
    this._head.add(skull);

    // Elongated snout
    const snoutGeo = cyl(0.12, 0.07, 0.4, 14);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.3);
    this._head.add(snout);

    // Snout bridge detail
    const snoutBridgeGeo = new THREE.SphereGeometry(1, 12, 10);
    const snoutBridge = new THREE.Mesh(snoutBridgeGeo, darkScaleMat);
    snoutBridge.scale.set(0.1, 0.05, 0.18);
    snoutBridge.position.set(0, 0.06, 0.27);
    this._head.add(snoutBridge);

    // Upper jaw ridge
    const jawRidgeGeo = new THREE.SphereGeometry(1, 14, 10);
    const jawRidge = new THREE.Mesh(jawRidgeGeo, darkScaleMat);
    jawRidge.scale.set(0.17, 0.07, 0.24);
    jawRidge.position.set(0, 0.08, 0.18);
    this._head.add(jawRidge);

    // Lower jaw
    const lowerJawGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, scaleMat);
    lowerJaw.scale.set(0.19, 0.1, 0.26);
    lowerJaw.position.set(0, -0.12, 0.12);
    this._head.add(lowerJaw);

    // Bright orange eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.045, 16, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.15, 0.08, 0.16);
      this._head.add(eye);

      // Eye socket ridge
      const socketGeo = new THREE.SphereGeometry(0.06, 12, 10);
      const socket = new THREE.Mesh(socketGeo, darkScaleMat);
      socket.scale.set(1, 0.5, 0.7);
      socket.position.set(side * 0.15, 0.1, 0.15);
      this._head.add(socket);
    }

    // Nostrils with fiery glow
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.025, 12, 10);
      const nostril = new THREE.Mesh(nostrilGeo, nostrilGlow);
      nostril.position.set(side * 0.05, 0.0, 0.48);
      this._head.add(nostril);

      // Nostril rim
      const rimGeo = new THREE.SphereGeometry(0.032, 10, 8);
      const rim = new THREE.Mesh(rimGeo, scaleMat);
      rim.scale.set(1, 0.6, 0.6);
      rim.position.set(side * 0.05, 0.01, 0.47);
      this._head.add(rim);
    }

    // Two swept-back dark horns
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.05, 0.4, 12);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.16, 0.17, -0.1);
      horn.rotation.x = -0.8;
      horn.rotation.z = side * 0.2;
      this._head.add(horn);

      // Horn ridges
      for (let r = 0; r < 3; r++) {
        const ringGeo = cyl(0.04 - r * 0.007, 0.04 - r * 0.007, 0.012, 10);
        const ring = new THREE.Mesh(ringGeo, mat(0x331111));
        ring.position.set(side * 0.16, 0.17 + (r + 1) * 0.07, -0.1);
        ring.rotation.x = -0.8;
        ring.rotation.z = side * 0.2;
        this._head.add(ring);
      }
    }

    // Row of small spikes along jaw
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.018, 0.07, 10);
      const spike = new THREE.Mesh(spikeGeo, hornMat);
      spike.position.set(0, -0.1, 0.3 - i * 0.08);
      spike.rotation.x = -0.3;
      this._head.add(spike);
    }

    // Small teeth along jaw edge
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        const toothGeo = new THREE.ConeGeometry(0.009, 0.035, 8);
        const tooth = new THREE.Mesh(toothGeo, mat(0xeeeecc));
        tooth.position.set(side * (0.09 - i * 0.005), -0.15, 0.1 + i * 0.06);
        tooth.rotation.x = Math.PI;
        this._head.add(tooth);
      }
    }

    // ---- Wings — massive bat-like ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.85, 3.2, -0.2);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.2, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, scaleMat);
      wing.add(shoulder);

      // Upper arm bone
      const upperBoneGeo = cyl(0.09, 0.065, 1.6, 12);
      const upperBone = new THREE.Mesh(upperBoneGeo, darkScaleMat);
      upperBone.position.set(side * 0.6, 0.15, -0.2);
      upperBone.rotation.z = side * 0.8;
      wing.add(upperBone);

      // Forearm bone
      const foreBoneGeo = cyl(0.065, 0.045, 1.4, 12);
      const foreBone = new THREE.Mesh(foreBoneGeo, darkScaleMat);
      foreBone.position.set(side * 1.4, -0.15, -0.25);
      foreBone.rotation.z = side * 1.2;
      wing.add(foreBone);

      // Elbow joint detail
      const elbowGeo = new THREE.SphereGeometry(0.07, 12, 10);
      const elbow = new THREE.Mesh(elbowGeo, scaleMat);
      elbow.position.set(side * 1.0, 0.0, -0.22);
      wing.add(elbow);

      // Wing finger bones (four, longer)
      for (let f = 0; f < 4; f++) {
        const fingerGeo = cyl(0.04, 0.015, 1.2 - f * 0.18, 10);
        const finger = new THREE.Mesh(fingerGeo, darkScaleMat);
        const fAngle = side * (0.8 + f * 0.3);
        finger.position.set(side * 2.0 + Math.sin(fAngle) * 0.4, -0.2 - f * 0.35, -0.3);
        finger.rotation.z = fAngle;
        wing.add(finger);
      }

      // Wing membrane — large dark crimson (bat-wing shape)
      const membraneGeo = wingShape(2.8, 2.2);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 1.2, -0.3, -0.25);
      membrane.rotation.y = side * 0.2;
      membrane.rotation.x = -0.15;
      membrane.scale.x = side;
      wing.add(membrane);

      // Wing membrane veins — thin cylinders
      for (let v = 0; v < 4; v++) {
        const veinGeo = cyl(0.01, 0.005, 1.2 - v * 0.2, 6);
        const vein = new THREE.Mesh(veinGeo, veinMat);
        vein.position.set(side * (0.5 + v * 0.35), -0.3 - v * 0.12, -0.24);
        vein.rotation.z = side * (0.5 + v * 0.18);
        wing.add(vein);
      }

      // Secondary lower membrane (bat-wing shape)
      const lowerMemGeo = wingShape(1.8, 1.0);
      const lowerMem = new THREE.Mesh(lowerMemGeo, membraneMat);
      lowerMem.position.set(side * 0.6, -1.1, -0.2);
      lowerMem.rotation.y = side * 0.15;
      lowerMem.rotation.x = -0.1;
      lowerMem.scale.x = side;
      wing.add(lowerMem);
    }

    // ---- Legs — digitigrade, thicker ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.42, 1.5, 0.0);
      this._body.add(leg);

      const thighGeo = cyl(0.22, 0.17, 0.72, 14);
      const thigh = new THREE.Mesh(thighGeo, scaleMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Thigh muscle detail
      const thighMuscleGeo = new THREE.SphereGeometry(0.12, 12, 10);
      const thighMuscle = new THREE.Mesh(thighMuscleGeo, scaleMat);
      thighMuscle.scale.set(1, 1.3, 0.7);
      thighMuscle.position.set(0, -0.25, 0.07);
      leg.add(thighMuscle);

      const kneeGeo = new THREE.SphereGeometry(0.12, 14, 12);
      const knee = new THREE.Mesh(kneeGeo, scaleMat);
      knee.position.set(0, -0.65, 0.08);
      leg.add(knee);

      const shinGeo = cyl(0.14, 0.1, 0.66, 12);
      const shin = new THREE.Mesh(shinGeo, scaleMat);
      shin.position.set(0, -0.95, 0.2);
      shin.rotation.x = 0.4;
      leg.add(shin);

      const ankleGeo = new THREE.SphereGeometry(0.08, 14, 12);
      const ankle = new THREE.Mesh(ankleGeo, scaleMat);
      ankle.position.set(0, -1.2, 0.3);
      leg.add(ankle);

      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkScaleMat);
      foot.scale.set(0.14, 0.06, 0.18);
      foot.position.set(0, -1.3, 0.35);
      leg.add(foot);

      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.03, 0.14, 10);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.07, -1.32, 0.46);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);

        // Claw base / knuckle
        const knuckleGeo = new THREE.SphereGeometry(0.035, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkScaleMat);
        knuckle.position.set(c * 0.07, -1.31, 0.4);
        leg.add(knuckle);
      }
    }

    // ---- Tail — thicker, more segments (10 instead of 8) ----
    const tailSegs = 10;
    for (let i = 0; i < tailSegs; i++) {
      const t = i / tailSegs;
      const radius = 0.17 * (1 - t * 0.7);
      const segGeo = new THREE.SphereGeometry(radius, 14, 10);
      const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? scaleMat : darkScaleMat);
      seg.position.set(0, 1.6 - i * 0.14, -0.4 - i * 0.2);
      this._body.add(seg);
    }

    // Tail tip — pointed
    const tailTipGeo = new THREE.ConeGeometry(0.05, 0.22, 12);
    const tailTip = new THREE.Mesh(tailTipGeo, darkScaleMat);
    tailTip.position.set(0, 1.6 - tailSegs * 0.14, -0.4 - tailSegs * 0.2);
    tailTip.rotation.x = -Math.PI / 2;
    this._body.add(tailTip);

    // ---- Spinal ridge — more spines (14 instead of 10) ----
    const spineCount = 14;
    for (let i = 0; i < spineCount; i++) {
      const t = i / spineCount;
      const height = 0.14 * (1 - Math.abs(t - 0.3) * 1.2);
      const spineGeo = new THREE.ConeGeometry(0.035, Math.max(0.04, height), 10);
      const spine = new THREE.Mesh(spineGeo, darkScaleMat);
      spine.position.set(0, 3.5 - i * 0.22, -0.35 - t * 0.3);
      this._body.add(spine);
    }

    // Individual scales along spine — overlapping cones
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      for (const side of [-1, 1]) {
        const scaleGeo = new THREE.ConeGeometry(0.028, 0.045, 8);
        const scale = new THREE.Mesh(scaleGeo, darkScaleMat);
        scale.position.set(side * 0.09, 3.4 - i * 0.2, -0.3 - t * 0.26);
        scale.rotation.x = -0.8;
        this._body.add(scale);
      }
    }
  }

  // ---- Ice Dragon builder ----------------------------------------------------

  private _buildIceDragon(): void {
    const scaleMat = mat(0x3a6688);               // glacial blue scales
    const darkScaleMat = mat(0x2a4a60);            // darker glacial scales
    const bellyMat = mat(0xddeeff);               // crystalline white belly plates
    const eyeMat = mat(0x44ffff, { emissive: 0x22aaaa });
    const hornMat = mat(0x88bbdd, { transparent: true, opacity: 0.85 });  // translucent blue horns
    const clawMat = mat(0x99aabb);
    const membraneMat = mat(0x4488aa, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const nostrilGlow = mat(0x44ffff, { emissive: 0x22aaaa });
    const icicleMat = mat(0xccddee, { transparent: true, opacity: 0.8 });
    const crystalMat = mat(0x88bbdd, { transparent: true, opacity: 0.75 });
    const iceArmorMat = mat(0xaaccdd, { transparent: true, opacity: 0.7 });
    const veinMat = mat(0x2a4a60, { transparent: true, opacity: 0.5, side: THREE.DoubleSide });

    // ---- Torso — muscular, ~20% bigger (like fire_dragon) ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, scaleMat);
    torso.scale.set(0.78, 1.02, 0.66);
    torso.position.y = 2.6;
    this._body.add(torso);

    // Upper back
    const backGeo = new THREE.SphereGeometry(1, 18, 14);
    const back = new THREE.Mesh(backGeo, darkScaleMat);
    back.scale.set(0.72, 0.84, 0.6);
    back.position.set(0, 2.8, -0.15);
    this._body.add(back);

    // Chest / belly plates — crystalline white
    const chestGeo = new THREE.SphereGeometry(1, 18, 14);
    const chest = new THREE.Mesh(chestGeo, bellyMat);
    chest.scale.set(0.54, 0.66, 0.36);
    chest.position.set(0, 2.5, 0.3);
    this._body.add(chest);

    // Lower belly plate
    const lowerBellyGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerBelly = new THREE.Mesh(lowerBellyGeo, bellyMat);
    lowerBelly.scale.set(0.46, 0.42, 0.3);
    lowerBelly.position.set(0, 1.9, 0.25);
    this._body.add(lowerBelly);

    // Belly scale segments — horizontal ridges
    for (let i = 0; i < 6; i++) {
      const ridgeGeo = new THREE.SphereGeometry(1, 14, 6);
      const ridge = new THREE.Mesh(ridgeGeo, bellyMat);
      ridge.scale.set(0.48, 0.04, 0.26);
      ridge.position.set(0, 1.95 + i * 0.18, 0.38);
      this._body.add(ridge);
    }

    // Frost crystal growths on shoulders (box geometry clusters)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const cSize = 0.06 + i * 0.02;
        const cGeo = new THREE.BoxGeometry(cSize, cSize * 1.8, cSize);
        const crystal = new THREE.Mesh(cGeo, crystalMat);
        crystal.position.set(side * (0.5 + i * 0.06), 3.0 + i * 0.08, -0.1 + i * 0.03);
        crystal.rotation.z = side * (0.2 + i * 0.15);
        crystal.rotation.x = i * 0.1;
        this._body.add(crystal);
      }
    }

    // Translucent ice armor plates on chest (transparent overlapping spheres)
    for (let row = 0; row < 3; row++) {
      for (let col = -1; col <= 1; col++) {
        const plateGeo = new THREE.SphereGeometry(0.09, 14, 10);
        const plate = new THREE.Mesh(plateGeo, iceArmorMat);
        plate.scale.set(1.2, 0.5, 0.8);
        plate.position.set(col * 0.13, 2.2 + row * 0.18, 0.44);
        this._body.add(plate);
      }
    }

    // ---- Neck — long, serpentine ----
    const neckSegments = 5;
    for (let i = 0; i < neckSegments; i++) {
      const t = i / neckSegments;
      const radius = 0.22 - t * 0.05;
      const segGeo = new THREE.SphereGeometry(radius, 16, 12);
      const seg = new THREE.Mesh(segGeo, scaleMat);
      seg.position.set(0, 3.3 + t * 0.8, 0.15 + t * 0.35);
      seg.scale.set(1, 1.2, 0.9);
      this._body.add(seg);
    }

    // Frost scales along neck
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const neckScaleGeo = new THREE.ConeGeometry(0.035, 0.07, 10);
      const neckScale = new THREE.Mesh(neckScaleGeo, icicleMat);
      neckScale.position.set(0, 3.35 + t * 0.75, 0.25 + t * 0.33);
      neckScale.rotation.x = -0.6;
      this._body.add(neckScale);
    }

    // ---- Head — elongated snout, horns, eyes ----
    this._head.position.set(0, 4.1, 0.55);
    this._body.add(this._head);

    // Skull (slightly larger)
    const skullGeo = new THREE.SphereGeometry(1, 18, 14);
    const skull = new THREE.Mesh(skullGeo, scaleMat);
    skull.scale.set(0.26, 0.24, 0.29);
    this._head.add(skull);

    // Elongated snout
    const snoutGeo = cyl(0.12, 0.07, 0.4, 14);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.3);
    this._head.add(snout);

    // Snout bridge detail
    const snoutBridgeGeo = new THREE.SphereGeometry(1, 12, 10);
    const snoutBridge = new THREE.Mesh(snoutBridgeGeo, darkScaleMat);
    snoutBridge.scale.set(0.1, 0.05, 0.18);
    snoutBridge.position.set(0, 0.06, 0.27);
    this._head.add(snoutBridge);

    // Upper jaw ridge
    const jawRidgeGeo = new THREE.SphereGeometry(1, 14, 10);
    const jawRidge = new THREE.Mesh(jawRidgeGeo, darkScaleMat);
    jawRidge.scale.set(0.17, 0.07, 0.24);
    jawRidge.position.set(0, 0.08, 0.18);
    this._head.add(jawRidge);

    // Lower jaw
    const lowerJawGeo = new THREE.SphereGeometry(1, 16, 12);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, scaleMat);
    lowerJaw.scale.set(0.19, 0.1, 0.26);
    lowerJaw.position.set(0, -0.12, 0.12);
    this._head.add(lowerJaw);

    // Icicles hanging from jaw
    for (let i = 0; i < 4; i++) {
      const icicleGeo = new THREE.ConeGeometry(0.018, 0.1 + i * 0.012, 10);
      const icicle = new THREE.Mesh(icicleGeo, icicleMat);
      icicle.position.set(-0.06 + i * 0.04, -0.2, 0.15 + i * 0.04);
      icicle.rotation.x = Math.PI;
      this._head.add(icicle);
    }

    // Bright cyan eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.045, 16, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.15, 0.08, 0.16);
      this._head.add(eye);

      // Eye socket ridge
      const socketGeo = new THREE.SphereGeometry(0.06, 12, 10);
      const socket = new THREE.Mesh(socketGeo, darkScaleMat);
      socket.scale.set(1, 0.5, 0.7);
      socket.position.set(side * 0.15, 0.1, 0.15);
      this._head.add(socket);
    }

    // Nostrils with icy glow
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.025, 12, 10);
      const nostril = new THREE.Mesh(nostrilGeo, nostrilGlow);
      nostril.position.set(side * 0.05, 0.0, 0.48);
      this._head.add(nostril);

      // Nostril rim
      const rimGeo = new THREE.SphereGeometry(0.032, 10, 8);
      const rim = new THREE.Mesh(rimGeo, scaleMat);
      rim.scale.set(1, 0.6, 0.6);
      rim.position.set(side * 0.05, 0.01, 0.47);
      this._head.add(rim);
    }

    // Two swept-back translucent blue horns
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.05, 0.4, 12);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.16, 0.17, -0.1);
      horn.rotation.x = -0.8;
      horn.rotation.z = side * 0.2;
      this._head.add(horn);

      // Horn ridges
      for (let r = 0; r < 3; r++) {
        const ringGeo = cyl(0.04 - r * 0.007, 0.04 - r * 0.007, 0.012, 10);
        const ring = new THREE.Mesh(ringGeo, crystalMat);
        ring.position.set(side * 0.16, 0.17 + (r + 1) * 0.07, -0.1);
        ring.rotation.x = -0.8;
        ring.rotation.z = side * 0.2;
        this._head.add(ring);
      }
    }

    // Row of small spikes along jaw
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.018, 0.07, 10);
      const spike = new THREE.Mesh(spikeGeo, hornMat);
      spike.position.set(0, -0.1, 0.3 - i * 0.08);
      spike.rotation.x = -0.3;
      this._head.add(spike);
    }

    // ---- Wings — massive glacial bat-like, with icicles ----
    for (const side of [-1, 1]) {
      const wing = side === -1 ? this._leftArm : this._rightArm;
      wing.position.set(side * 0.85, 3.2, -0.2);
      this._body.add(wing);

      // Shoulder joint
      const shoulderGeo = new THREE.SphereGeometry(0.2, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, scaleMat);
      wing.add(shoulder);

      // Upper arm bone
      const upperBoneGeo = cyl(0.09, 0.065, 1.6, 12);
      const upperBone = new THREE.Mesh(upperBoneGeo, darkScaleMat);
      upperBone.position.set(side * 0.6, 0.15, -0.2);
      upperBone.rotation.z = side * 0.8;
      wing.add(upperBone);

      // Forearm bone
      const foreBoneGeo = cyl(0.065, 0.045, 1.4, 12);
      const foreBone = new THREE.Mesh(foreBoneGeo, darkScaleMat);
      foreBone.position.set(side * 1.4, -0.15, -0.25);
      foreBone.rotation.z = side * 1.2;
      wing.add(foreBone);

      // Elbow joint detail
      const elbowGeo = new THREE.SphereGeometry(0.07, 12, 10);
      const elbow = new THREE.Mesh(elbowGeo, scaleMat);
      elbow.position.set(side * 1.0, 0.0, -0.22);
      wing.add(elbow);

      // Wing finger bones (four, longer)
      for (let f = 0; f < 4; f++) {
        const fingerGeo = cyl(0.04, 0.015, 1.2 - f * 0.18, 10);
        const finger = new THREE.Mesh(fingerGeo, darkScaleMat);
        const fAngle = side * (0.8 + f * 0.3);
        finger.position.set(side * 2.0 + Math.sin(fAngle) * 0.4, -0.2 - f * 0.35, -0.3);
        finger.rotation.z = fAngle;
        wing.add(finger);
      }

      // Wing membrane — large pale translucent (bat-wing shape)
      const membraneGeo = wingShape(2.8, 2.2);
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 1.2, -0.3, -0.25);
      membrane.rotation.y = side * 0.2;
      membrane.rotation.x = -0.15;
      membrane.scale.x = side;
      wing.add(membrane);

      // Wing membrane veins — thin cylinders
      for (let v = 0; v < 4; v++) {
        const veinGeo = cyl(0.01, 0.005, 1.2 - v * 0.2, 6);
        const vein = new THREE.Mesh(veinGeo, veinMat);
        vein.position.set(side * (0.5 + v * 0.35), -0.3 - v * 0.12, -0.24);
        vein.rotation.z = side * (0.5 + v * 0.18);
        wing.add(vein);
      }

      // Secondary lower membrane (bat-wing shape)
      const lowerMemGeo = wingShape(1.8, 1.0);
      const lowerMem = new THREE.Mesh(lowerMemGeo, membraneMat);
      lowerMem.position.set(side * 0.6, -1.1, -0.2);
      lowerMem.rotation.y = side * 0.15;
      lowerMem.rotation.x = -0.1;
      lowerMem.scale.x = side;
      wing.add(lowerMem);

      // Icicles on wing edges (more, larger)
      for (let ic = 0; ic < 5; ic++) {
        const iceGeo = new THREE.ConeGeometry(0.02, 0.15 + ic * 0.02, 10);
        const ice = new THREE.Mesh(iceGeo, icicleMat);
        ice.position.set(side * (0.3 + ic * 0.45), -1.0 - ic * 0.12, -0.25);
        ice.rotation.x = Math.PI;
        wing.add(ice);
      }
    }

    // ---- Legs — digitigrade, thicker ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.42, 1.5, 0.0);
      this._body.add(leg);

      const thighGeo = cyl(0.22, 0.17, 0.72, 14);
      const thigh = new THREE.Mesh(thighGeo, scaleMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Thigh muscle detail
      const thighMuscleGeo = new THREE.SphereGeometry(0.12, 12, 10);
      const thighMuscle = new THREE.Mesh(thighMuscleGeo, scaleMat);
      thighMuscle.scale.set(1, 1.3, 0.7);
      thighMuscle.position.set(0, -0.25, 0.07);
      leg.add(thighMuscle);

      const kneeGeo = new THREE.SphereGeometry(0.12, 14, 12);
      const knee = new THREE.Mesh(kneeGeo, scaleMat);
      knee.position.set(0, -0.65, 0.08);
      leg.add(knee);

      const shinGeo = cyl(0.14, 0.1, 0.66, 12);
      const shin = new THREE.Mesh(shinGeo, scaleMat);
      shin.position.set(0, -0.95, 0.2);
      shin.rotation.x = 0.4;
      leg.add(shin);

      const ankleGeo = new THREE.SphereGeometry(0.08, 14, 12);
      const ankle = new THREE.Mesh(ankleGeo, scaleMat);
      ankle.position.set(0, -1.2, 0.3);
      leg.add(ankle);

      const footGeo = new THREE.SphereGeometry(1, 16, 12);
      const foot = new THREE.Mesh(footGeo, darkScaleMat);
      foot.scale.set(0.14, 0.06, 0.18);
      foot.position.set(0, -1.3, 0.35);
      leg.add(foot);

      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.03, 0.14, 10);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c * 0.07, -1.32, 0.46);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);

        // Claw base / knuckle
        const knuckleGeo = new THREE.SphereGeometry(0.035, 10, 8);
        const knuckle = new THREE.Mesh(knuckleGeo, darkScaleMat);
        knuckle.position.set(c * 0.07, -1.31, 0.4);
        leg.add(knuckle);
      }
    }

    // ---- Tail — thicker, more segments (10 like fire_dragon) ----
    const tailSegs = 10;
    for (let i = 0; i < tailSegs; i++) {
      const t = i / tailSegs;
      const radius = 0.17 * (1 - t * 0.7);
      const segGeo = new THREE.SphereGeometry(radius, 14, 10);
      const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? scaleMat : darkScaleMat);
      seg.position.set(0, 1.6 - i * 0.14, -0.4 - i * 0.2);
      this._body.add(seg);
    }

    // Tail tip
    const tailTipGeo = new THREE.ConeGeometry(0.05, 0.22, 12);
    const tailTip = new THREE.Mesh(tailTipGeo, darkScaleMat);
    tailTip.position.set(0, 1.6 - tailSegs * 0.14, -0.4 - tailSegs * 0.2);
    tailTip.rotation.x = -Math.PI / 2;
    this._body.add(tailTip);

    // ---- Spinal ridge — frost crystals (box geometry) ----
    const spineCount = 14;
    for (let i = 0; i < spineCount; i++) {
      const t = i / spineCount;
      const height = 0.14 * (1 - Math.abs(t - 0.3) * 1.2);
      const crystalH = Math.max(0.04, height);
      const spineGeo = new THREE.BoxGeometry(0.04, crystalH, 0.04);
      const spine = new THREE.Mesh(spineGeo, crystalMat);
      spine.position.set(0, 3.5 - i * 0.22, -0.35 - t * 0.3);
      spine.rotation.z = ((i % 2) * 2 - 1) * 0.15;
      this._body.add(spine);
    }

    // Individual scales along spine — overlapping frost cones
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      for (const side of [-1, 1]) {
        const scaleGeo = new THREE.ConeGeometry(0.028, 0.045, 8);
        const scale = new THREE.Mesh(scaleGeo, icicleMat);
        scale.position.set(side * 0.09, 3.4 - i * 0.2, -0.3 - t * 0.26);
        scale.rotation.x = -0.8;
        this._body.add(scale);
      }
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
    const innerGlowMat = mat(0xffee44, { emissive: 0xffcc22, transparent: true, opacity: 0.35 });
    const tendrilMat = mat(0xff5500, { emissive: 0xcc3300, transparent: true, opacity: 0.5 });

    // ---- Core body — glowing heart of the flame ----
    const coreGeo = new THREE.SphereGeometry(0.5, 20, 16);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    this._body.add(core);

    // Inner glow layer — bright yellow-white center
    const innerGlowGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.y = 2.4;
    this._body.add(innerGlow);

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
    const outerGeo = new THREE.SphereGeometry(0.65, 18, 14);
    const outer = new THREE.Mesh(outerGeo, outerFlameMat);
    outer.position.y = 2.4;
    outer.scale.set(1, 1.15, 1);
    this._body.add(outer);

    // Red inner wisp layer
    const redWispGeo = new THREE.SphereGeometry(0.55, 16, 12);
    const redWisp = new THREE.Mesh(redWispGeo, redWispMat);
    redWisp.position.y = 2.5;
    redWisp.scale.set(0.9, 1.2, 0.9);
    this._body.add(redWisp);

    // Swirling energy tendrils — spiral flame ribbons
    for (let i = 0; i < 5; i++) {
      const tAngle = (i / 5) * Math.PI * 2;
      const tendrilGeo = cyl(0.025, 0.01, 0.5, 8);
      const tendril = new THREE.Mesh(tendrilGeo, tendrilMat);
      tendril.position.set(
        Math.cos(tAngle) * 0.55,
        2.2 + i * 0.15,
        Math.sin(tAngle) * 0.55,
      );
      tendril.rotation.z = tAngle + Math.PI / 4;
      tendril.rotation.x = 0.5;
      this._body.add(tendril);
    }

    // Upper flame wisps — rising tendrils
    for (let i = 0; i < 4; i++) {
      const wAngle = (i / 4) * Math.PI * 2 + 0.3;
      const wispGeo = new THREE.ConeGeometry(0.12 + Math.random() * 0.06, 0.5 + Math.random() * 0.3, 12);
      const wisp = new THREE.Mesh(wispGeo, outerFlameMat);
      wisp.position.set(
        Math.cos(wAngle) * 0.25,
        3.0 + Math.random() * 0.2,
        Math.sin(wAngle) * 0.25,
      );
      wisp.rotation.z = Math.sin(wAngle) * 0.3;
      this._body.add(wisp);
    }

    // Crackling detail elements — jagged small spikes around core
    for (let i = 0; i < 8; i++) {
      const crAngle = (i / 8) * Math.PI * 2;
      const crGeo = new THREE.ConeGeometry(0.02, 0.15 + Math.random() * 0.1, 6);
      const crackle = new THREE.Mesh(crGeo, coreMat);
      crackle.position.set(
        Math.cos(crAngle) * 0.5,
        2.4 + (Math.random() - 0.5) * 0.4,
        Math.sin(crAngle) * 0.5,
      );
      crackle.rotation.z = crAngle;
      crackle.rotation.x = (Math.random() - 0.5) * 1.0;
      this._body.add(crackle);
    }

    // ---- Head — floating flame crown above shoulders ----
    this._head.position.set(0, 3.4, 0.0);
    this._body.add(this._head);

    // Crown base (ring of flame)
    const crownBaseGeo = new THREE.SphereGeometry(0.22, 16, 12);
    const crownBase = new THREE.Mesh(crownBaseGeo, innerFlameMat);
    crownBase.scale.set(1, 0.6, 1);
    this._head.add(crownBase);

    // Crown spikes (upward-pointing flames)
    for (let i = 0; i < 6; i++) {
      const csAngle = (i / 6) * Math.PI * 2;
      const spikeH = 0.2 + Math.random() * 0.15;
      const spikeGeo = new THREE.ConeGeometry(0.04, spikeH, 10);
      const spike = new THREE.Mesh(spikeGeo, outerFlameMat);
      spike.position.set(
        Math.cos(csAngle) * 0.18,
        0.12 + spikeH / 2,
        Math.sin(csAngle) * 0.18,
      );
      spike.rotation.z = Math.sin(csAngle) * 0.2;
      this._head.add(spike);
    }

    // Face glow — inner light behind eyes
    const faceGlowGeo = new THREE.SphereGeometry(0.12, 12, 10);
    const faceGlow = new THREE.Mesh(faceGlowGeo, innerGlowMat);
    faceGlow.position.set(0, -0.02, 0.1);
    this._head.add(faceGlow);

    // Eyes — bright white-yellow spots
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 14, 12);
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
      const shoulderGeo = new THREE.SphereGeometry(0.15, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, armMat);
      arm.add(shoulder);

      // Shoulder-to-arm transition
      const shTransGeo = new THREE.SphereGeometry(0.12, 12, 10);
      const shTrans = new THREE.Mesh(shTransGeo, armMat);
      shTrans.position.y = -0.15;
      arm.add(shTrans);

      // Upper arm — thicker
      const upperGeo = cyl(0.12, 0.09, 0.6, 12);
      const upper = new THREE.Mesh(upperGeo, armMat);
      upper.position.y = -0.35;
      arm.add(upper);

      // Forearm — thinning
      const foreGeo = cyl(0.09, 0.05, 0.55, 12);
      const fore = new THREE.Mesh(foreGeo, innerFlameMat);
      fore.position.y = -0.85;
      arm.add(fore);

      // Flame tip "hand"
      const tipGeo = new THREE.ConeGeometry(0.07, 0.25, 12);
      const tip = new THREE.Mesh(tipGeo, outerFlameMat);
      tip.position.y = -1.2;
      tip.rotation.x = Math.PI;
      arm.add(tip);

      // Small flame wisps around forearm
      for (let w = 0; w < 3; w++) {
        const fwAngle = (w / 3) * Math.PI * 2;
        const fwGeo = new THREE.ConeGeometry(0.03, 0.12, 10);
        const flamelet = new THREE.Mesh(fwGeo, outerFlameMat);
        flamelet.position.set(
          Math.cos(fwAngle) * 0.1,
          -0.6 - w * 0.15,
          Math.sin(fwAngle) * 0.1,
        );
        arm.add(flamelet);
      }

      // Swirling tendril around arm
      for (let st = 0; st < 4; st++) {
        const stAngle = (st / 4) * Math.PI * 3;
        const stY = -0.2 - st * 0.25;
        const stR = 0.13 - st * 0.015;
        const stGeo = new THREE.SphereGeometry(0.02, 8, 6);
        const stMesh = new THREE.Mesh(stGeo, tendrilMat);
        stMesh.position.set(Math.cos(stAngle) * stR, stY, Math.sin(stAngle) * stR);
        arm.add(stMesh);
      }
    }

    // ---- Legs — pillars of flame, wider at base ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25, 1.4, 0.0);
      this._body.add(leg);

      // Upper leg — wide
      const upperLegGeo = cyl(0.16, 0.2, 0.6, 14);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.3;
      leg.add(upperLeg);

      // Lower leg — widening toward base
      const lowerLegGeo = cyl(0.2, 0.28, 0.55, 14);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.8;
      leg.add(lowerLeg);

      // Leg-to-body transition
      const legTransGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const legTrans = new THREE.Mesh(legTransGeo, legMat);
      legTrans.position.y = 0.0;
      leg.add(legTrans);

      // Flame pool at bottom — flat disc with emissive orange
      const poolGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.05, 16);
      const pool = new THREE.Mesh(poolGeo, mat(0xff6600, { emissive: 0xff4400, transparent: true, opacity: 0.7 }));
      pool.position.y = -1.1;
      leg.add(pool);

      // Small flame licks around base
      for (let fl = 0; fl < 4; fl++) {
        const flAngle = (fl / 4) * Math.PI * 2;
        const flickGeo = new THREE.ConeGeometry(0.025, 0.1, 8);
        const flick = new THREE.Mesh(flickGeo, outerFlameMat);
        flick.position.set(Math.cos(flAngle) * 0.28, -1.05, Math.sin(flAngle) * 0.28);
        leg.add(flick);
      }
    }

    // ---- Ember particles — scattered glowing spheres ----
    for (let i = 0; i < 12; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const emberGeo = new THREE.SphereGeometry(size, 10, 8);
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

    // Larger floating flame chunks (floating debris)
    for (let i = 0; i < 5; i++) {
      const chunkGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 12, 10);
      const chunk = new THREE.Mesh(chunkGeo, coreMat);
      const cAngle = Math.random() * Math.PI * 2;
      chunk.position.set(
        Math.cos(cAngle) * (0.6 + Math.random() * 0.3),
        2.0 + Math.random() * 1.2,
        Math.sin(cAngle) * (0.6 + Math.random() * 0.3),
      );
      this._body.add(chunk);
    }

    // Floating debris particles — small angular shapes
    for (let i = 0; i < 6; i++) {
      const debrisGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
      const debris = new THREE.Mesh(debrisGeo, mat(0x331100, { emissive: 0x220800 }));
      const dAngle = Math.random() * Math.PI * 2;
      debris.position.set(
        Math.cos(dAngle) * (0.7 + Math.random() * 0.4),
        1.8 + Math.random() * 2.0,
        Math.sin(dAngle) * (0.7 + Math.random() * 0.4),
      );
      debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this._body.add(debris);
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
    const innerGlowMat = mat(0x66bbdd, { emissive: 0x2288aa, transparent: true, opacity: 0.3 });
    const frostMistMat = mat(0xccddee, { transparent: true, opacity: 0.2 });

    // ---- Core body — angular crystalline cluster ----
    const coreGeo = new THREE.OctahedronGeometry(0.6);
    const core = new THREE.Mesh(coreGeo, iceMat);
    core.position.y = 2.5;
    core.rotation.y = 0.15;
    core.scale.set(0.75, 1.0, 0.58);
    this._body.add(core);

    // Dark inner core visible through translucent ice
    const innerGeo = new THREE.OctahedronGeometry(0.4);
    const inner = new THREE.Mesh(innerGeo, darkCoreMat);
    inner.position.y = 2.5;
    inner.rotation.y = 0.4;
    inner.scale.set(0.63, 1.0, 0.5);
    this._body.add(inner);

    // Inner glow layer — blue energy at center
    const innerGlowGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.y = 2.5;
    this._body.add(innerGlow);

    // Upper chest crystal slab
    const upperChestGeo = new THREE.OctahedronGeometry(0.4);
    const upperChest = new THREE.Mesh(upperChestGeo, deepBlueMat);
    upperChest.position.set(0, 3.1, 0.05);
    upperChest.rotation.z = 0.05;
    upperChest.scale.set(1.0, 0.63, 0.75);
    this._body.add(upperChest);

    // Lower torso crystal
    const lowerTorsoGeo = new THREE.OctahedronGeometry(0.35);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, iceMat);
    lowerTorso.position.set(0, 1.85, 0.0);
    lowerTorso.rotation.y = -0.2;
    lowerTorso.scale.set(1.0, 0.71, 0.79);
    this._body.add(lowerTorso);

    // Side crystal facets
    for (const side of [-1, 1]) {
      const facetGeo = new THREE.TetrahedronGeometry(0.3);
      const facet = new THREE.Mesh(facetGeo, deepBlueMat);
      facet.scale.set(0.33, 1.0, 0.67);
      facet.position.set(side * 0.5, 2.5, 0.0);
      facet.rotation.z = side * 0.2;
      this._body.add(facet);
    }

    // Frost mist aura — large translucent sphere
    const mistGeo = new THREE.SphereGeometry(1.0, 16, 12);
    const mist = new THREE.Mesh(mistGeo, frostMistMat);
    mist.position.y = 2.5;
    this._body.add(mist);

    // Crackling ice detail — small angular shards on body surface
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const crackSize = 0.06 + Math.random() * 0.04;
      const crackGeo = new THREE.TetrahedronGeometry(crackSize);
      const crack = new THREE.Mesh(crackGeo, whiteMat);
      crack.position.set(
        Math.cos(angle) * 0.45,
        2.3 + Math.random() * 0.5,
        Math.sin(angle) * 0.45,
      );
      crack.lookAt(0, crack.position.y, 0);
      this._body.add(crack);
    }

    // ---- Head — angular crown of ice spikes ----
    this._head.position.set(0, 3.7, 0.1);
    this._body.add(this._head);

    // Head block
    const headGeo = new THREE.OctahedronGeometry(0.22);
    const headMesh = new THREE.Mesh(headGeo, iceMat);
    headMesh.scale.set(0.91, 0.8, 0.8);
    this._head.add(headMesh);

    // Crown spikes — large upward ice crystals
    const crownAngles = [-0.5, -0.15, 0.15, 0.5];
    for (let i = 0; i < crownAngles.length; i++) {
      const h = 0.25 + (i % 2 === 0 ? 0.1 : 0.0);
      const spikeGeo = new THREE.ConeGeometry(0.05, h, 10);
      const spike = new THREE.Mesh(spikeGeo, whiteMat);
      spike.position.set(crownAngles[i] * 0.4, 0.2 + h / 2, 0.0);
      spike.rotation.z = crownAngles[i] * 0.3;
      this._head.add(spike);
    }

    // Center crown spike (tallest)
    const centerSpikeGeo = new THREE.ConeGeometry(0.06, 0.4, 10);
    const centerSpike = new THREE.Mesh(centerSpikeGeo, deepBlueMat);
    centerSpike.position.set(0, 0.38, 0.0);
    this._head.add(centerSpike);

    // Cold blue glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 14, 12);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 0.0, 0.17);
      this._head.add(eye);

      // Eye glow halo
      const haloGeo = new THREE.SphereGeometry(0.06, 10, 8);
      const halo = new THREE.Mesh(haloGeo, innerGlowMat);
      halo.position.set(side * 0.1, 0.0, 0.16);
      this._head.add(halo);
    }

    // Icicle beard / stalactites hanging from chin
    for (let i = 0; i < 5; i++) {
      const len = 0.12 + Math.random() * 0.1;
      const icicleGeo = new THREE.ConeGeometry(0.02, len, 10);
      const icicle = new THREE.Mesh(icicleGeo, whiteMat);
      icicle.position.set(-0.1 + i * 0.05, -0.18 - len / 2, 0.12);
      icicle.rotation.x = Math.PI;
      this._head.add(icicle);
    }

    // ---- Shoulder spikes — large ice crystals jutting upward ----
    for (const side of [-1, 1]) {
      // Main shoulder spike
      const mainSpikeGeo = new THREE.ConeGeometry(0.08, 0.5, 10);
      const mainSpike = new THREE.Mesh(mainSpikeGeo, deepBlueMat);
      mainSpike.position.set(side * 0.55, 3.4, -0.05);
      mainSpike.rotation.z = side * 0.4;
      this._body.add(mainSpike);

      // Secondary smaller spike
      const secSpikeGeo = new THREE.ConeGeometry(0.05, 0.3, 10);
      const secSpike = new THREE.Mesh(secSpikeGeo, iceMat);
      secSpike.position.set(side * 0.45, 3.25, 0.1);
      secSpike.rotation.z = side * 0.6;
      this._body.add(secSpike);

      // Tertiary tiny spike
      const terSpikeGeo = new THREE.ConeGeometry(0.03, 0.18, 8);
      const terSpike = new THREE.Mesh(terSpikeGeo, whiteMat);
      terSpike.position.set(side * 0.5, 3.15, -0.12);
      terSpike.rotation.z = side * 0.5;
      this._body.add(terSpike);
    }

    // ---- Arms — jagged ice limbs, segmented ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.6, 3.1, 0.0);
      this._body.add(arm);

      // Shoulder joint — angular
      const shoulderGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 5);
      const shoulder = new THREE.Mesh(shoulderGeo, deepBlueMat);
      shoulder.rotation.y = 0.3;
      arm.add(shoulder);

      // Upper arm segment
      const upperArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 5);
      const upperArm = new THREE.Mesh(upperArmGeo, iceMat);
      upperArm.position.set(0, -0.4, 0);
      upperArm.rotation.z = side * 0.1;
      arm.add(upperArm);

      // Elbow crystal
      const elbowGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 5);
      const elbow = new THREE.Mesh(elbowGeo, deepBlueMat);
      elbow.position.y = -0.8;
      elbow.rotation.y = 0.5;
      arm.add(elbow);

      // Elbow spike jutting outward
      const elbowSpikeGeo = new THREE.ConeGeometry(0.04, 0.2, 10);
      const elbowSpike = new THREE.Mesh(elbowSpikeGeo, whiteMat);
      elbowSpike.position.set(side * 0.12, -0.8, -0.08);
      elbowSpike.rotation.z = side * 1.2;
      arm.add(elbowSpike);

      // Forearm
      const foreGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 5);
      const fore = new THREE.Mesh(foreGeo, iceMat);
      fore.position.y = -1.2;
      fore.rotation.z = side * -0.08;
      arm.add(fore);

      // Forearm frost ridge
      const frostRidgeGeo = new THREE.ConeGeometry(0.02, 0.3, 4);
      const frostRidge = new THREE.Mesh(frostRidgeGeo, whiteMat);
      frostRidge.position.set(0, -1.1, 0.07);
      arm.add(frostRidge);

      // Ice blade hand — pointed
      const bladeGeo = new THREE.ConeGeometry(0.08, 0.4, 10);
      const blade = new THREE.Mesh(bladeGeo, whiteMat);
      blade.position.y = -1.6;
      blade.rotation.x = Math.PI;
      arm.add(blade);

      // Secondary blade prong
      const prongGeo = new THREE.ConeGeometry(0.04, 0.25, 10);
      const prong = new THREE.Mesh(prongGeo, shardMat);
      prong.position.set(side * 0.06, -1.5, 0.05);
      prong.rotation.x = Math.PI;
      prong.rotation.z = side * 0.3;
      arm.add(prong);

      // Swirling frost tendril around arm
      for (let ft = 0; ft < 4; ft++) {
        const ftAngle = (ft / 4) * Math.PI * 3;
        const ftY = -0.3 - ft * 0.3;
        const ftR = 0.12;
        const ftGeo = new THREE.SphereGeometry(0.02, 8, 6);
        const ftMesh = new THREE.Mesh(ftGeo, frostMistMat);
        ftMesh.position.set(Math.cos(ftAngle) * ftR, ftY, Math.sin(ftAngle) * ftR);
        arm.add(ftMesh);
      }
    }

    // ---- Legs — thick ice pillars with geometric facets ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 1.55, 0.0);
      this._body.add(leg);

      // Upper leg block
      const thighGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6);
      const thigh = new THREE.Mesh(thighGeo, iceMat);
      thigh.position.y = -0.3;
      leg.add(thigh);

      // Knee facet
      const kneeGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.2, 6);
      const knee = new THREE.Mesh(kneeGeo, deepBlueMat);
      knee.position.y = -0.65;
      knee.rotation.y = 0.2;
      leg.add(knee);

      // Shin block
      const shinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.55, 6);
      const shin = new THREE.Mesh(shinGeo, iceMat);
      shin.position.y = -1.0;
      leg.add(shin);

      // Foot — flat hexagonal ice slab
      const footGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 6);
      const foot = new THREE.Mesh(footGeo, deepBlueMat);
      foot.position.set(0, -1.32, 0.05);
      foot.scale.set(0.88, 1.0, 1.09);
      leg.add(foot);

      // Small ice spike on knee
      const kneeSpikeGeo = new THREE.ConeGeometry(0.035, 0.15, 10);
      const kneeSpike = new THREE.Mesh(kneeSpikeGeo, whiteMat);
      kneeSpike.position.set(0, -0.6, 0.14);
      kneeSpike.rotation.x = -0.5;
      leg.add(kneeSpike);

      // Shin frost ridge detail
      const shinRidgeGeo = new THREE.ConeGeometry(0.02, 0.25, 4);
      const shinRidge = new THREE.Mesh(shinRidgeGeo, whiteMat);
      shinRidge.position.set(0, -0.9, 0.11);
      leg.add(shinRidge);
    }

    // ---- Frost details — small floating ice shards (tiny rotated cubes) ----
    for (let i = 0; i < 10; i++) {
      const size = 0.03 + Math.random() * 0.04;
      const shardGeo = new THREE.OctahedronGeometry(size * 0.7);
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

    // Floating debris — larger frozen rock pieces
    for (let i = 0; i < 4; i++) {
      const dAngle = Math.random() * Math.PI * 2;
      const dSize = 0.04 + Math.random() * 0.03;
      const debrisGeo = new THREE.OctahedronGeometry(dSize * 0.7);
      // scale applied after mesh to get elongated shape
      const debris = new THREE.Mesh(debrisGeo, deepBlueMat);
      debris.scale.set(1.0, 1.3, 0.8);
      debris.position.set(
        Math.cos(dAngle) * (0.8 + Math.random() * 0.5),
        1.8 + Math.random() * 2.0,
        Math.sin(dAngle) * (0.8 + Math.random() * 0.5),
      );
      debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this._body.add(debris);
    }

    // Back crystal formation
    for (let i = 0; i < 3; i++) {
      const crystalGeo = new THREE.ConeGeometry(0.06 - i * 0.01, 0.35 - i * 0.08, 10);
      const crystal = new THREE.Mesh(crystalGeo, deepBlueMat);
      crystal.position.set(0, 2.8 - i * 0.35, -0.35 - i * 0.05);
      crystal.rotation.x = -0.3;
      this._body.add(crystal);
    }
  }

  // ---- Fire Imp builder -----------------------------------------------------

  private _buildFireImp(): void {
    const skinMat = mat(0xcc3311);
    const darkSkinMat = mat(0x881100);
    const wingMat = mat(0xaa2211, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const eyeMat = mat(0xffaa00, { emissive: 0xffaa00 });
    const boneMat = mat(0xddaa88);
    const fireMat = mat(0xff6600, { emissive: 0xff6600 });
    const clawMat = mat(0x331100);
    const glowMat = mat(0xff4400, { emissive: 0xff2200, transparent: true, opacity: 0.4 });

    // ---- Body — small hunched torso ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.15, 0.2, 0.12);
    torso.position.y = 0.2;
    this._body.add(torso);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.12, 0.12, 0.1);
    belly.position.set(0, 0.12, 0.04);
    this._body.add(belly);

    // Shoulder blades — transitional shapes
    for (const side of [-1, 1]) {
      const shoulderGeo = new THREE.SphereGeometry(1, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, darkSkinMat);
      shoulder.scale.set(0.05, 0.06, 0.04);
      shoulder.position.set(side * 0.1, 0.28, -0.04);
      this._body.add(shoulder);
    }

    // ---- Head ----
    this._head.position.set(0, 0.35, 0.06);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.1, 0.1, 0.09);
    this._head.add(headMesh);

    // Pointed horns with ridged segments
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.02, 0.1, 12);
      const horn = new THREE.Mesh(hornGeo, boneMat);
      horn.position.set(side * 0.05, 0.1, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
      // Horn ring detail
      const hornRingGeo = new THREE.SphereGeometry(0.022, 12, 10);
      const hornRing = new THREE.Mesh(hornRingGeo, darkSkinMat);
      hornRing.scale.set(1, 0.3, 1);
      hornRing.position.set(side * 0.048, 0.065, 0);
      this._head.add(hornRing);
    }

    // Glowing yellow eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.04, 0.02, 0.08);
      this._head.add(eye);
    }

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const brow = new THREE.Mesh(browGeo, darkSkinMat);
    brow.scale.set(0.09, 0.025, 0.04);
    brow.position.set(0, 0.045, 0.07);
    this._head.add(brow);

    // Sharp teeth — small cones along jaw
    for (let i = -2; i <= 2; i++) {
      const toothGeo = new THREE.ConeGeometry(0.008, 0.02, 10);
      const tooth = new THREE.Mesh(toothGeo, boneMat);
      tooth.position.set(i * 0.015, -0.05, 0.07);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // ---- Bat wings on arms ----
    this._leftArm.position.set(-0.15, 0.25, 0);
    this._body.add(this._leftArm);
    const lWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const lWing = new THREE.Mesh(lWingGeo, wingMat);
    lWing.position.set(-0.08, 0, -0.02);
    lWing.rotation.y = 0.3;
    this._leftArm.add(lWing);

    // Wing membrane veins (left)
    for (let i = 0; i < 3; i++) {
      const veinGeo = cyl(0.003, 0.001, 0.14, 12);
      const vein = new THREE.Mesh(veinGeo, darkSkinMat);
      vein.position.set(-0.04 - i * 0.05, 0.02 - i * 0.02, -0.01);
      vein.rotation.z = 0.3 + i * 0.15;
      this._leftArm.add(vein);
    }

    this._rightArm.position.set(0.15, 0.25, 0);
    this._body.add(this._rightArm);
    const rWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const rWing = new THREE.Mesh(rWingGeo, wingMat);
    rWing.position.set(0.08, 0, -0.02);
    rWing.rotation.y = -0.3;
    this._rightArm.add(rWing);

    // Wing membrane veins (right)
    for (let i = 0; i < 3; i++) {
      const veinGeo = cyl(0.003, 0.001, 0.14, 12);
      const vein = new THREE.Mesh(veinGeo, darkSkinMat);
      vein.position.set(0.04 + i * 0.05, 0.02 - i * 0.02, -0.01);
      vein.rotation.z = -(0.3 + i * 0.15);
      this._rightArm.add(vein);
    }

    // Fire glow in hands
    const lFireGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const lFire = new THREE.Mesh(lFireGeo, fireMat);
    lFire.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lFire);
    // Outer fire glow (left)
    const lFireGlowGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const lFireGlow = new THREE.Mesh(lFireGlowGeo, glowMat);
    lFireGlow.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lFireGlow);

    const rFireGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const rFire = new THREE.Mesh(rFireGeo, fireMat);
    rFire.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rFire);
    // Outer fire glow (right)
    const rFireGlowGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const rFireGlow = new THREE.Mesh(rFireGlowGeo, glowMat);
    rFireGlow.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rFireGlow);

    // ---- Legs with clawed feet ----
    this._leftLeg.position.set(-0.07, 0.0, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const lLeg = new THREE.Mesh(lLegGeo, skinMat);
    lLeg.position.y = -0.06;
    this._leftLeg.add(lLeg);
    // Clawed foot
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._leftLeg.add(claw);
    }

    this._rightLeg.position.set(0.07, 0.0, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const rLeg = new THREE.Mesh(rLegGeo, skinMat);
    rLeg.position.y = -0.06;
    this._rightLeg.add(rLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._rightLeg.add(claw);
    }

    // ---- Forked tail ----
    const tailGeo = cyl(0.02, 0.008, 0.18, 14);
    const tail = new THREE.Mesh(tailGeo, darkSkinMat);
    tail.position.set(0, 0.08, -0.15);
    tail.rotation.x = 0.8;
    this._body.add(tail);
    // Tail barb — glowing ember at mid-tail
    const tailBarbGeo = new THREE.SphereGeometry(0.012, 12, 12);
    const tailBarb = new THREE.Mesh(tailBarbGeo, fireMat);
    tailBarb.position.set(0, 0.04, -0.19);
    this._body.add(tailBarb);
    // Fork tips
    for (const side of [-1, 1]) {
      const forkGeo = new THREE.ConeGeometry(0.01, 0.04, 10);
      const fork = new THREE.Mesh(forkGeo, darkSkinMat);
      fork.position.set(side * 0.02, 0.0, -0.24);
      fork.rotation.x = 1.2;
      this._body.add(fork);
    }

    // Glowing body markings — emissive spots along torso
    const markingPositions = [
      { x: 0.06, y: 0.22, z: 0.08 },
      { x: -0.05, y: 0.18, z: 0.09 },
      { x: 0.0, y: 0.14, z: 0.1 },
    ];
    for (const pos of markingPositions) {
      const markGeo = new THREE.SphereGeometry(0.01, 12, 12);
      const mark = new THREE.Mesh(markGeo, fireMat);
      mark.position.set(pos.x, pos.y, pos.z);
      this._body.add(mark);
    }
  }

  // ---- Ice Imp builder ------------------------------------------------------

  private _buildIceImp(): void {
    const skinMat = mat(0x7799bb);
    const darkSkinMat = mat(0x556688);
    const wingMat = mat(0x88bbdd, { side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const eyeMat = mat(0x66ccff, { emissive: 0x66ccff });
    const boneMat = mat(0xccddee);
    const frostMat = mat(0xaaddff, { emissive: 0x4488cc });
    const clawMat = mat(0x334455);
    const iceGlowMat = mat(0x88ddff, { emissive: 0x44aacc, transparent: true, opacity: 0.35 });

    // ---- Body — small hunched torso ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.15, 0.2, 0.12);
    torso.position.y = 0.2;
    this._body.add(torso);

    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.12, 0.12, 0.1);
    belly.position.set(0, 0.12, 0.04);
    this._body.add(belly);

    // Frost rime on shoulders
    for (const side of [-1, 1]) {
      const rimeGeo = new THREE.SphereGeometry(1, 16, 12);
      const rime = new THREE.Mesh(rimeGeo, boneMat);
      rime.scale.set(0.04, 0.05, 0.035);
      rime.position.set(side * 0.1, 0.28, -0.03);
      this._body.add(rime);
    }

    // ---- Head ----
    this._head.position.set(0, 0.35, 0.06);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.1, 0.1, 0.09);
    this._head.add(headMesh);

    // Pointed horns (icy) with frost tips
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.02, 0.1, 12);
      const horn = new THREE.Mesh(hornGeo, boneMat);
      horn.position.set(side * 0.05, 0.1, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
      // Frost crystal at horn tip
      const tipGeo = new THREE.OctahedronGeometry(0.012, 0);
      const tip = new THREE.Mesh(tipGeo, frostMat);
      tip.position.set(side * 0.04, 0.155, 0);
      this._head.add(tip);
    }

    // Blue glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.04, 0.02, 0.08);
      this._head.add(eye);
    }

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const browMesh = new THREE.Mesh(browGeo, darkSkinMat);
    browMesh.scale.set(0.09, 0.025, 0.04);
    browMesh.position.set(0, 0.045, 0.07);
    this._head.add(browMesh);

    // Sharp teeth
    for (let i = -2; i <= 2; i++) {
      const toothGeo = new THREE.ConeGeometry(0.008, 0.02, 10);
      const tooth = new THREE.Mesh(toothGeo, boneMat);
      tooth.position.set(i * 0.015, -0.05, 0.07);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // ---- Ice crystal wings ----
    this._leftArm.position.set(-0.15, 0.25, 0);
    this._body.add(this._leftArm);
    const lWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const lWing = new THREE.Mesh(lWingGeo, wingMat);
    lWing.position.set(-0.08, 0, -0.02);
    lWing.rotation.y = 0.3;
    this._leftArm.add(lWing);

    // Ice crystal spines on left wing
    for (let i = 0; i < 3; i++) {
      const spineGeo = new THREE.ConeGeometry(0.005, 0.06, 10);
      const spine = new THREE.Mesh(spineGeo, boneMat);
      spine.position.set(-0.04 - i * 0.05, 0.02 - i * 0.01, -0.01);
      spine.rotation.z = 0.3 + i * 0.15;
      this._leftArm.add(spine);
    }

    this._rightArm.position.set(0.15, 0.25, 0);
    this._body.add(this._rightArm);
    const rWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const rWing = new THREE.Mesh(rWingGeo, wingMat);
    rWing.position.set(0.08, 0, -0.02);
    rWing.rotation.y = -0.3;
    this._rightArm.add(rWing);

    // Ice crystal spines on right wing
    for (let i = 0; i < 3; i++) {
      const spineGeo = new THREE.ConeGeometry(0.005, 0.06, 10);
      const spine = new THREE.Mesh(spineGeo, boneMat);
      spine.position.set(0.04 + i * 0.05, 0.02 - i * 0.01, -0.01);
      spine.rotation.z = -(0.3 + i * 0.15);
      this._rightArm.add(spine);
    }

    // Frost crystals in hands
    const lFrostGeo = new THREE.OctahedronGeometry(0.03, 1);
    const lFrost = new THREE.Mesh(lFrostGeo, frostMat);
    lFrost.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lFrost);
    // Frost glow (left)
    const lFrostGlowGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const lFrostGlow = new THREE.Mesh(lFrostGlowGeo, iceGlowMat);
    lFrostGlow.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lFrostGlow);

    const rFrostGeo = new THREE.OctahedronGeometry(0.03, 1);
    const rFrost = new THREE.Mesh(rFrostGeo, frostMat);
    rFrost.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rFrost);
    // Frost glow (right)
    const rFrostGlowGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const rFrostGlow = new THREE.Mesh(rFrostGlowGeo, iceGlowMat);
    rFrostGlow.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rFrostGlow);

    // ---- Legs with clawed feet ----
    this._leftLeg.position.set(-0.07, 0.0, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const lLeg = new THREE.Mesh(lLegGeo, skinMat);
    lLeg.position.y = -0.06;
    this._leftLeg.add(lLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._leftLeg.add(claw);
    }

    this._rightLeg.position.set(0.07, 0.0, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const rLeg = new THREE.Mesh(rLegGeo, skinMat);
    rLeg.position.y = -0.06;
    this._rightLeg.add(rLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._rightLeg.add(claw);
    }

    // ---- Forked tail ----
    const tailGeo = cyl(0.02, 0.008, 0.18, 14);
    const tail = new THREE.Mesh(tailGeo, darkSkinMat);
    tail.position.set(0, 0.08, -0.15);
    tail.rotation.x = 0.8;
    this._body.add(tail);
    // Ice barb on tail
    const tailBarbGeo = new THREE.OctahedronGeometry(0.012, 0);
    const tailBarb = new THREE.Mesh(tailBarbGeo, frostMat);
    tailBarb.position.set(0, 0.04, -0.19);
    this._body.add(tailBarb);
    for (const side of [-1, 1]) {
      const forkGeo = new THREE.ConeGeometry(0.01, 0.04, 10);
      const fork = new THREE.Mesh(forkGeo, darkSkinMat);
      fork.position.set(side * 0.02, 0.0, -0.24);
      fork.rotation.x = 1.2;
      this._body.add(fork);
    }

    // Frost markings on body
    const frostMarkPositions = [
      { x: 0.07, y: 0.22, z: 0.08 },
      { x: -0.06, y: 0.16, z: 0.09 },
      { x: 0.0, y: 0.25, z: 0.1 },
    ];
    for (const pos of frostMarkPositions) {
      const markGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const mark = new THREE.Mesh(markGeo, frostMat);
      mark.position.set(pos.x, pos.y, pos.z);
      this._body.add(mark);
    }
  }

  // ---- Lightning Imp builder ------------------------------------------------

  private _buildLightningImp(): void {
    const skinMat = mat(0x5544aa);
    const darkSkinMat = mat(0x332277);
    const wingMat = mat(0x6644cc, { side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const eyeMat = mat(0xaaccff, { emissive: 0xaaccff });
    const boneMat = mat(0xbbaadd);
    const sparkMat = mat(0x88ccff, { emissive: 0x88ccff });
    const clawMat = mat(0x221144);
    const arcGlowMat = mat(0x88ccff, { emissive: 0x4488ff, transparent: true, opacity: 0.4 });

    // ---- Body ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.15, 0.2, 0.12);
    torso.position.y = 0.2;
    this._body.add(torso);

    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.12, 0.12, 0.1);
    belly.position.set(0, 0.12, 0.04);
    this._body.add(belly);

    // Shoulder bumps
    for (const side of [-1, 1]) {
      const shoulderGeo = new THREE.SphereGeometry(1, 16, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, darkSkinMat);
      shoulder.scale.set(0.05, 0.06, 0.04);
      shoulder.position.set(side * 0.1, 0.28, -0.04);
      this._body.add(shoulder);
    }

    // ---- Head ----
    this._head.position.set(0, 0.35, 0.06);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.1, 0.1, 0.09);
    this._head.add(headMesh);

    // Pointed horns with spark tips
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.02, 0.1, 12);
      const horn = new THREE.Mesh(hornGeo, boneMat);
      horn.position.set(side * 0.05, 0.1, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
      // Spark at horn tip
      const sparkTipGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const sparkTip = new THREE.Mesh(sparkTipGeo, sparkMat);
      sparkTip.position.set(side * 0.04, 0.155, 0);
      this._head.add(sparkTip);
    }

    // White-blue glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.04, 0.02, 0.08);
      this._head.add(eye);
    }

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const browMesh = new THREE.Mesh(browGeo, darkSkinMat);
    browMesh.scale.set(0.09, 0.025, 0.04);
    browMesh.position.set(0, 0.045, 0.07);
    this._head.add(browMesh);

    // Sharp teeth
    for (let i = -2; i <= 2; i++) {
      const toothGeo = new THREE.ConeGeometry(0.008, 0.02, 10);
      const tooth = new THREE.Mesh(toothGeo, boneMat);
      tooth.position.set(i * 0.015, -0.05, 0.07);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // ---- Electric wings ----
    this._leftArm.position.set(-0.15, 0.25, 0);
    this._body.add(this._leftArm);
    const lWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const lWing = new THREE.Mesh(lWingGeo, wingMat);
    lWing.position.set(-0.08, 0, -0.02);
    lWing.rotation.y = 0.3;
    this._leftArm.add(lWing);

    // Lightning arc veins on left wing
    for (let i = 0; i < 3; i++) {
      const arcGeo = cyl(0.003, 0.001, 0.12, 12);
      const arc = new THREE.Mesh(arcGeo, sparkMat);
      arc.position.set(-0.04 - i * 0.05, 0.02 - i * 0.02, -0.01);
      arc.rotation.z = 0.3 + i * 0.15;
      this._leftArm.add(arc);
    }

    this._rightArm.position.set(0.15, 0.25, 0);
    this._body.add(this._rightArm);
    const rWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const rWing = new THREE.Mesh(rWingGeo, wingMat);
    rWing.position.set(0.08, 0, -0.02);
    rWing.rotation.y = -0.3;
    this._rightArm.add(rWing);

    // Lightning arc veins on right wing
    for (let i = 0; i < 3; i++) {
      const arcGeo = cyl(0.003, 0.001, 0.12, 12);
      const arc = new THREE.Mesh(arcGeo, sparkMat);
      arc.position.set(0.04 + i * 0.05, 0.02 - i * 0.02, -0.01);
      arc.rotation.z = -(0.3 + i * 0.15);
      this._rightArm.add(arc);
    }

    // Sparking hands
    const lSparkGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const lSpark = new THREE.Mesh(lSparkGeo, sparkMat);
    lSpark.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lSpark);
    // Outer arc glow (left)
    const lArcGlowGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const lArcGlow = new THREE.Mesh(lArcGlowGeo, arcGlowMat);
    lArcGlow.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lArcGlow);

    const rSparkGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const rSpark = new THREE.Mesh(rSparkGeo, sparkMat);
    rSpark.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rSpark);
    // Outer arc glow (right)
    const rArcGlowGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const rArcGlow = new THREE.Mesh(rArcGlowGeo, arcGlowMat);
    rArcGlow.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rArcGlow);

    // ---- Legs ----
    this._leftLeg.position.set(-0.07, 0.0, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const lLeg = new THREE.Mesh(lLegGeo, skinMat);
    lLeg.position.y = -0.06;
    this._leftLeg.add(lLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._leftLeg.add(claw);
    }

    this._rightLeg.position.set(0.07, 0.0, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const rLeg = new THREE.Mesh(rLegGeo, skinMat);
    rLeg.position.y = -0.06;
    this._rightLeg.add(rLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._rightLeg.add(claw);
    }

    // ---- Forked tail ----
    const tailGeo = cyl(0.02, 0.008, 0.18, 14);
    const tail = new THREE.Mesh(tailGeo, darkSkinMat);
    tail.position.set(0, 0.08, -0.15);
    tail.rotation.x = 0.8;
    this._body.add(tail);
    // Spark barb on tail
    const tailSparkGeo = new THREE.SphereGeometry(0.01, 12, 12);
    const tailSpark = new THREE.Mesh(tailSparkGeo, sparkMat);
    tailSpark.position.set(0, 0.04, -0.19);
    this._body.add(tailSpark);
    for (const side of [-1, 1]) {
      const forkGeo = new THREE.ConeGeometry(0.01, 0.04, 10);
      const fork = new THREE.Mesh(forkGeo, darkSkinMat);
      fork.position.set(side * 0.02, 0.0, -0.24);
      fork.rotation.x = 1.2;
      this._body.add(fork);
    }

    // Electric markings on body
    const sparkMarkPositions = [
      { x: 0.06, y: 0.24, z: 0.08 },
      { x: -0.05, y: 0.17, z: 0.09 },
      { x: 0.0, y: 0.13, z: 0.1 },
    ];
    for (const pos of sparkMarkPositions) {
      const markGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const mark = new THREE.Mesh(markGeo, sparkMat);
      mark.position.set(pos.x, pos.y, pos.z);
      this._body.add(mark);
    }
  }

  // ---- Distortion Imp builder -----------------------------------------------

  private _buildDistortionImp(): void {
    const skinMat = mat(0x2a1a3e);
    const darkSkinMat = mat(0x1a0a2e);
    const wingMat = mat(0x1a0a2e, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const eyeMat = mat(0xaa44ff, { emissive: 0xaa44ff });
    const boneMat = mat(0x6a4a8e);
    const voidMat = mat(0x110022, { emissive: 0x6622aa });
    const clawMat = mat(0x0a0018);
    const voidGlowMat = mat(0x6622aa, { emissive: 0x4411aa, transparent: true, opacity: 0.35 });

    // ---- Body ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.15, 0.2, 0.12);
    torso.position.y = 0.2;
    this._body.add(torso);

    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, skinMat);
    belly.scale.set(0.12, 0.12, 0.1);
    belly.position.set(0, 0.12, 0.04);
    this._body.add(belly);

    // Shoulder wisps
    for (const side of [-1, 1]) {
      const wispGeo = new THREE.SphereGeometry(1, 16, 12);
      const wisp = new THREE.Mesh(wispGeo, darkSkinMat);
      wisp.scale.set(0.05, 0.06, 0.04);
      wisp.position.set(side * 0.1, 0.28, -0.04);
      this._body.add(wisp);
    }

    // ---- Head ----
    this._head.position.set(0, 0.35, 0.06);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.1, 0.1, 0.09);
    this._head.add(headMesh);

    // Pointed horns with void tips
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.02, 0.1, 12);
      const horn = new THREE.Mesh(hornGeo, boneMat);
      horn.position.set(side * 0.05, 0.1, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
      // Void wisp at horn tip
      const voidTipGeo = new THREE.SphereGeometry(0.01, 12, 12);
      const voidTip = new THREE.Mesh(voidTipGeo, voidMat);
      voidTip.position.set(side * 0.04, 0.155, 0);
      this._head.add(voidTip);
    }

    // Purple glowing eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.04, 0.02, 0.08);
      this._head.add(eye);
    }

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const browMesh = new THREE.Mesh(browGeo, darkSkinMat);
    browMesh.scale.set(0.09, 0.025, 0.04);
    browMesh.position.set(0, 0.045, 0.07);
    this._head.add(browMesh);

    // Sharp teeth
    for (let i = -2; i <= 2; i++) {
      const toothGeo = new THREE.ConeGeometry(0.008, 0.02, 10);
      const tooth = new THREE.Mesh(toothGeo, boneMat);
      tooth.position.set(i * 0.015, -0.05, 0.07);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // ---- Shadowy wings ----
    this._leftArm.position.set(-0.15, 0.25, 0);
    this._body.add(this._leftArm);
    const lWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const lWing = new THREE.Mesh(lWingGeo, wingMat);
    lWing.position.set(-0.08, 0, -0.02);
    lWing.rotation.y = 0.3;
    this._leftArm.add(lWing);

    // Shadow tendrils on left wing
    for (let i = 0; i < 3; i++) {
      const tendrilGeo = cyl(0.003, 0.001, 0.12, 12);
      const tendril = new THREE.Mesh(tendrilGeo, darkSkinMat);
      tendril.position.set(-0.04 - i * 0.05, 0.02 - i * 0.02, -0.01);
      tendril.rotation.z = 0.3 + i * 0.15;
      this._leftArm.add(tendril);
    }

    this._rightArm.position.set(0.15, 0.25, 0);
    this._body.add(this._rightArm);
    const rWingGeo = new THREE.PlaneGeometry(0.2, 0.15, 4, 3);
    const rWing = new THREE.Mesh(rWingGeo, wingMat);
    rWing.position.set(0.08, 0, -0.02);
    rWing.rotation.y = -0.3;
    this._rightArm.add(rWing);

    // Shadow tendrils on right wing
    for (let i = 0; i < 3; i++) {
      const tendrilGeo = cyl(0.003, 0.001, 0.12, 12);
      const tendril = new THREE.Mesh(tendrilGeo, darkSkinMat);
      tendril.position.set(0.04 + i * 0.05, 0.02 - i * 0.02, -0.01);
      tendril.rotation.z = -(0.3 + i * 0.15);
      this._rightArm.add(tendril);
    }

    // Void wisp in hands — dark sphere with purple emissive
    const lVoidGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const lVoid = new THREE.Mesh(lVoidGeo, voidMat);
    lVoid.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lVoid);
    // Outer void glow (left)
    const lVoidGlowGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const lVoidGlow = new THREE.Mesh(lVoidGlowGeo, voidGlowMat);
    lVoidGlow.position.set(-0.06, -0.08, 0.04);
    this._leftArm.add(lVoidGlow);

    const rVoidGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const rVoid = new THREE.Mesh(rVoidGeo, voidMat);
    rVoid.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rVoid);
    // Outer void glow (right)
    const rVoidGlowGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const rVoidGlow = new THREE.Mesh(rVoidGlowGeo, voidGlowMat);
    rVoidGlow.position.set(0.06, -0.08, 0.04);
    this._rightArm.add(rVoidGlow);

    // ---- Legs ----
    this._leftLeg.position.set(-0.07, 0.0, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const lLeg = new THREE.Mesh(lLegGeo, skinMat);
    lLeg.position.y = -0.06;
    this._leftLeg.add(lLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._leftLeg.add(claw);
    }

    this._rightLeg.position.set(0.07, 0.0, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.025, 0.02, 0.12, 14);
    const rLeg = new THREE.Mesh(rLegGeo, skinMat);
    rLeg.position.y = -0.06;
    this._rightLeg.add(rLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.008, 0.03, 10);
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(t * 0.015, -0.13, 0.015);
      claw.rotation.x = 0.3;
      this._rightLeg.add(claw);
    }

    // ---- Forked tail ----
    const tailGeo = cyl(0.02, 0.008, 0.18, 14);
    const tail = new THREE.Mesh(tailGeo, darkSkinMat);
    tail.position.set(0, 0.08, -0.15);
    tail.rotation.x = 0.8;
    this._body.add(tail);
    // Void barb on tail
    const tailVoidGeo = new THREE.SphereGeometry(0.012, 12, 12);
    const tailVoidOrb = new THREE.Mesh(tailVoidGeo, voidMat);
    tailVoidOrb.position.set(0, 0.04, -0.19);
    this._body.add(tailVoidOrb);
    for (const side of [-1, 1]) {
      const forkGeo = new THREE.ConeGeometry(0.01, 0.04, 10);
      const fork = new THREE.Mesh(forkGeo, darkSkinMat);
      fork.position.set(side * 0.02, 0.0, -0.24);
      fork.rotation.x = 1.2;
      this._body.add(fork);
    }

    // Glowing void markings on body
    const voidMarkPositions = [
      { x: 0.06, y: 0.22, z: 0.08 },
      { x: -0.05, y: 0.17, z: 0.09 },
      { x: 0.0, y: 0.14, z: 0.1 },
    ];
    for (const pos of voidMarkPositions) {
      const markGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const mark = new THREE.Mesh(markGeo, voidMat);
      mark.position.set(pos.x, pos.y, pos.z);
      this._body.add(mark);
    }
  }

  // ---- Void Snail builder ---------------------------------------------------

  private _buildVoidSnail(): void {
    const shellMat = mat(0x1a0a2e);
    const bodyMat = mat(0x6a5a7a);
    const eyeMat = mat(0x8844cc, { emissive: 0x8844cc });
    const starMat = mat(0xaaaaff, { emissive: 0xaaaaff });
    const slimeMat = mat(0x5a4a6a, { transparent: true, opacity: 0.5 });
    const voidOrbMat = mat(0x0a0018, { emissive: 0x4422aa });
    const stalkMat = mat(0x7a6a8a);
    const ridgeMat = mat(0x2a1a3e);
    const suckerMat = mat(0x8a7a9a, { emissive: 0x221133 });

    // ---- Slug body — soft elongated form ----
    const bodyGeo = new THREE.SphereGeometry(1, 20, 16);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(0.3, 0.15, 0.5);
    body.position.set(0, 0.15, 0.1);
    this._body.add(body);

    // Muscular foot undersurface
    const footGeo = new THREE.SphereGeometry(1, 18, 12);
    const foot = new THREE.Mesh(footGeo, bodyMat);
    foot.scale.set(0.28, 0.05, 0.48);
    foot.position.set(0, 0.03, 0.1);
    this._body.add(foot);

    // Mantle ridge — transition between body and shell
    const mantleGeo = new THREE.SphereGeometry(1, 18, 14);
    const mantle = new THREE.Mesh(mantleGeo, bodyMat);
    mantle.scale.set(0.28, 0.08, 0.2);
    mantle.position.set(0, 0.25, -0.05);
    this._body.add(mantle);

    // ---- Spiral shell — overlapping spheres getting smaller ----
    const shellSegments = 7;
    for (let i = 0; i < shellSegments; i++) {
      const t = i / shellSegments;
      const radius = 0.25 - t * 0.03;
      const angle = t * Math.PI * 2.5;
      const spiralR = 0.12 - t * 0.015;
      const shellGeo = new THREE.SphereGeometry(radius, 18, 14);
      const shellPiece = new THREE.Mesh(shellGeo, shellMat);
      shellPiece.position.set(
        Math.cos(angle) * spiralR,
        0.35 + t * 0.15 + Math.sin(angle) * 0.05,
        -0.1 - t * 0.04
      );
      this._body.add(shellPiece);

      // Spiral ridge detail on each shell segment
      const ridgeGeo = new THREE.SphereGeometry(radius * 0.4, 14, 10);
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.scale.set(1, 0.2, 1);
      ridge.position.set(
        shellPiece.position.x,
        shellPiece.position.y + radius * 0.15,
        shellPiece.position.z
      );
      this._body.add(ridge);

      // Star-like emissive flecks on shell
      if (i % 2 === 0) {
        const starGeo = new THREE.SphereGeometry(0.012, 12, 12);
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(
          shellPiece.position.x + (Math.random() - 0.5) * 0.08,
          shellPiece.position.y + (Math.random() - 0.5) * 0.06,
          shellPiece.position.z + 0.2
        );
        this._body.add(star);
      }
    }

    // Additional star flecks on shell
    for (let i = 0; i < 5; i++) {
      const starGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 0.3,
        0.35 + Math.random() * 0.2,
        -0.1 + Math.random() * 0.15
      );
      this._body.add(star);
    }

    // ---- Head with eye stalks ----
    this._head.position.set(0, 0.22, 0.5);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.scale.set(0.12, 0.1, 0.12);
    this._head.add(headMesh);

    // Eye stalks — two thin cylinders with sphere eyes
    for (const side of [-1, 1]) {
      const stalkGeo = cyl(0.01, 0.012, 0.18, 14);
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.set(side * 0.05, 0.12, 0.02);
      stalk.rotation.z = side * -0.3;
      this._head.add(stalk);

      const eyeGeo = new THREE.SphereGeometry(0.025, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.08, 0.22, 0.02);
      this._head.add(eye);
    }

    // Mouth tentacles
    for (let i = -1; i <= 1; i++) {
      const tentGeo = cyl(0.006, 0.003, 0.06, 12);
      const tent = new THREE.Mesh(tentGeo, stalkMat);
      tent.position.set(i * 0.03, -0.06, 0.08);
      tent.rotation.x = 0.4;
      this._head.add(tent);
    }

    // ---- Flat spread feet (leg groups) ----
    this._leftLeg.position.set(-0.15, 0.0, 0.1);
    this._body.add(this._leftLeg);
    const lFootGeo = new THREE.SphereGeometry(1, 18, 12);
    const lFoot = new THREE.Mesh(lFootGeo, bodyMat);
    lFoot.scale.set(0.1, 0.03, 0.15);
    this._leftLeg.add(lFoot);

    this._rightLeg.position.set(0.15, 0.0, 0.1);
    this._body.add(this._rightLeg);
    const rFootGeo = new THREE.SphereGeometry(1, 18, 12);
    const rFoot = new THREE.Mesh(rFootGeo, bodyMat);
    rFoot.scale.set(0.1, 0.03, 0.15);
    this._rightLeg.add(rFoot);

    // ---- Arms (tentacle feelers) with suckers ----
    this._leftArm.position.set(-0.12, 0.18, 0.4);
    this._body.add(this._leftArm);
    const lFeelerGeo = cyl(0.015, 0.005, 0.2, 14);
    const lFeeler = new THREE.Mesh(lFeelerGeo, stalkMat);
    lFeeler.rotation.z = 0.6;
    this._leftArm.add(lFeeler);
    // Suckers on left feeler
    for (let i = 0; i < 3; i++) {
      const suckerGeo = new THREE.SphereGeometry(0.006, 10, 10);
      const sucker = new THREE.Mesh(suckerGeo, suckerMat);
      sucker.position.set(-0.04 - i * 0.03, -0.02 + i * 0.02, 0.01);
      this._leftArm.add(sucker);
    }

    this._rightArm.position.set(0.12, 0.18, 0.4);
    this._body.add(this._rightArm);
    const rFeelerGeo = cyl(0.015, 0.005, 0.2, 14);
    const rFeeler = new THREE.Mesh(rFeelerGeo, stalkMat);
    rFeeler.rotation.z = -0.6;
    this._rightArm.add(rFeeler);
    // Suckers on right feeler
    for (let i = 0; i < 3; i++) {
      const suckerGeo = new THREE.SphereGeometry(0.006, 10, 10);
      const sucker = new THREE.Mesh(suckerGeo, suckerMat);
      sucker.position.set(0.04 + i * 0.03, -0.02 + i * 0.02, 0.01);
      this._rightArm.add(sucker);
    }

    // ---- Slime trail — multiple overlapping discs for detail ----
    const slimeGeo = new THREE.CircleGeometry(0.15, 16);
    const slime = new THREE.Mesh(slimeGeo, slimeMat);
    slime.rotation.x = -Math.PI / 2;
    slime.position.set(0, 0.01, -0.35);
    this._body.add(slime);
    // Secondary smaller slime droplets
    const slimeDripGeo = new THREE.CircleGeometry(0.06, 12);
    const slimeDrip1 = new THREE.Mesh(slimeDripGeo, slimeMat);
    slimeDrip1.rotation.x = -Math.PI / 2;
    slimeDrip1.position.set(0.08, 0.01, -0.22);
    this._body.add(slimeDrip1);
    const slimeDrip2 = new THREE.Mesh(slimeDripGeo.clone(), slimeMat);
    slimeDrip2.rotation.x = -Math.PI / 2;
    slimeDrip2.position.set(-0.06, 0.01, -0.28);
    this._body.add(slimeDrip2);

    // ---- Void distortion — floating dark spheres around shell ----
    const voidPositions = [
      { x: 0.3, y: 0.5, z: -0.05 },
      { x: -0.25, y: 0.6, z: -0.15 },
      { x: 0.1, y: 0.7, z: -0.2 },
      { x: -0.1, y: 0.4, z: 0.1 },
    ];
    for (const pos of voidPositions) {
      const orbGeo = new THREE.SphereGeometry(0.03, 16, 16);
      const orb = new THREE.Mesh(orbGeo, voidOrbMat);
      orb.position.set(pos.x, pos.y, pos.z);
      this._body.add(orb);
    }
  }

  // ---- Faery Queen builder --------------------------------------------------

  private _buildFaeryQueen(): void {
    const skinMat = mat(0xeeddcc, { emissive: 0x221100 });
    const hairMat = mat(0xffcc66);
    const wingMat = mat(0x88ddaa, { side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const dotPinkMat = mat(0xff88cc, { emissive: 0xff88cc });
    const dotBlueMat = mat(0x88ccff, { emissive: 0x88ccff });
    const dotYellowMat = mat(0xffcc44, { emissive: 0xffcc44 });
    const eyeMat = mat(0x44ddaa, { emissive: 0x228855 });
    const flowerRedMat = mat(0xff5577);
    const flowerBlueMat = mat(0x77aaff);
    const flowerYellowMat = mat(0xffdd44);
    const sparkleMat = mat(0xffeedd, { emissive: 0xffeedd });
    const dressMat = mat(0x88ddaa, { transparent: true, opacity: 0.5 });
    const veinMat = mat(0x66bb88, { emissive: 0x44aa66, transparent: true, opacity: 0.6 });
    const crownGoldMat = mat(0xffdd88, { emissive: 0xccaa44 });

    // ---- Slender torso ----
    const torsoGeo = new THREE.SphereGeometry(1, 22, 18);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.18, 0.35, 0.12);
    torso.position.y = 1.2;
    this._body.add(torso);

    // Waist
    const waistGeo = cyl(0.1, 0.12, 0.15, 16);
    const waist = new THREE.Mesh(waistGeo, skinMat);
    waist.position.set(0, 0.9, 0);
    this._body.add(waist);

    // Flowing dress layer — semi-transparent skirt
    const dressUpperGeo = cyl(0.12, 0.22, 0.3, 16);
    const dressUpper = new THREE.Mesh(dressUpperGeo, dressMat);
    dressUpper.position.set(0, 0.75, 0);
    this._body.add(dressUpper);

    const dressLowerGeo = cyl(0.22, 0.28, 0.2, 16);
    const dressLower = new THREE.Mesh(dressLowerGeo, dressMat);
    dressLower.position.set(0, 0.55, 0);
    this._body.add(dressLower);

    // ---- Head ----
    this._head.position.set(0, 1.7, 0.04);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 22, 18);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.12, 0.14, 0.11);
    this._head.add(headMesh);

    // Pointed ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.02, 0.08, 12);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.12, 0.04, 0);
      ear.rotation.z = side * Math.PI / 3;
      this._head.add(ear);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.045, 0.02, 0.1);
      this._head.add(eye);
    }

    // Crown of flowers — small colored spheres in ring with gold band
    const crownBandGeo = new THREE.SphereGeometry(0.1, 18, 14);
    const crownBand = new THREE.Mesh(crownBandGeo, crownGoldMat);
    crownBand.scale.set(1, 0.15, 1);
    crownBand.position.set(0, 0.13, 0);
    this._head.add(crownBand);

    const flowerMats = [flowerRedMat, flowerBlueMat, flowerYellowMat, flowerRedMat, flowerBlueMat, flowerYellowMat];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const flowerGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const flower = new THREE.Mesh(flowerGeo, flowerMats[i]);
      flower.position.set(Math.cos(angle) * 0.1, 0.14, Math.sin(angle) * 0.1);
      this._head.add(flower);
      // Petal detail around each flower
      const petalGeo = new THREE.SphereGeometry(0.012, 12, 10);
      const petal = new THREE.Mesh(petalGeo, flowerMats[i]);
      petal.position.set(Math.cos(angle) * 0.1, 0.16, Math.sin(angle) * 0.1);
      petal.scale.set(1.3, 0.4, 1.3);
      this._head.add(petal);
    }

    // Long flowing hair — cascade of elongated spheres down back
    for (let i = 0; i < 6; i++) {
      const hairGeo = new THREE.SphereGeometry(1, 18, 14);
      const hairPiece = new THREE.Mesh(hairGeo, hairMat);
      hairPiece.scale.set(0.06 - i * 0.005, 0.1, 0.04);
      hairPiece.position.set(
        (Math.random() - 0.5) * 0.06,
        -0.05 - i * 0.12,
        -0.1
      );
      this._head.add(hairPiece);
    }

    // ---- Gossamer butterfly wings ----
    this._leftArm.position.set(-0.18, 1.35, -0.05);
    this._body.add(this._leftArm);

    const lWingUpperGeo = new THREE.PlaneGeometry(0.4, 0.45, 6, 6);
    const lWingUpper = new THREE.Mesh(lWingUpperGeo, wingMat);
    lWingUpper.position.set(-0.18, 0.1, -0.02);
    lWingUpper.rotation.y = 0.4;
    this._leftArm.add(lWingUpper);

    const lWingLowerGeo = new THREE.PlaneGeometry(0.3, 0.3, 5, 5);
    const lWingLower = new THREE.Mesh(lWingLowerGeo, wingMat);
    lWingLower.position.set(-0.14, -0.15, -0.02);
    lWingLower.rotation.y = 0.5;
    this._leftArm.add(lWingLower);

    // Wing vein details (left)
    for (let i = 0; i < 3; i++) {
      const wingVeinGeo = cyl(0.003, 0.001, 0.2 + i * 0.05, 12);
      const wingVein = new THREE.Mesh(wingVeinGeo, veinMat);
      wingVein.position.set(-0.1 - i * 0.05, 0.1 - i * 0.06, -0.01);
      wingVein.rotation.z = 0.2 + i * 0.15;
      this._leftArm.add(wingVein);
    }

    // Wing pattern dots (left)
    const dotMats = [dotPinkMat, dotBlueMat, dotYellowMat];
    for (let i = 0; i < 3; i++) {
      const dotGeo = new THREE.SphereGeometry(0.015, 12, 12);
      const dot = new THREE.Mesh(dotGeo, dotMats[i]);
      dot.position.set(-0.12 - i * 0.06, 0.1 - i * 0.08, 0);
      this._leftArm.add(dot);
    }

    this._rightArm.position.set(0.18, 1.35, -0.05);
    this._body.add(this._rightArm);

    const rWingUpperGeo = new THREE.PlaneGeometry(0.4, 0.45, 6, 6);
    const rWingUpper = new THREE.Mesh(rWingUpperGeo, wingMat);
    rWingUpper.position.set(0.18, 0.1, -0.02);
    rWingUpper.rotation.y = -0.4;
    this._rightArm.add(rWingUpper);

    const rWingLowerGeo = new THREE.PlaneGeometry(0.3, 0.3, 5, 5);
    const rWingLower = new THREE.Mesh(rWingLowerGeo, wingMat);
    rWingLower.position.set(0.14, -0.15, -0.02);
    rWingLower.rotation.y = -0.5;
    this._rightArm.add(rWingLower);

    // Wing vein details (right)
    for (let i = 0; i < 3; i++) {
      const wingVeinGeo = cyl(0.003, 0.001, 0.2 + i * 0.05, 12);
      const wingVein = new THREE.Mesh(wingVeinGeo, veinMat);
      wingVein.position.set(0.1 + i * 0.05, 0.1 - i * 0.06, -0.01);
      wingVein.rotation.z = -(0.2 + i * 0.15);
      this._rightArm.add(wingVein);
    }

    // Wing pattern dots (right)
    for (let i = 0; i < 3; i++) {
      const dotGeo = new THREE.SphereGeometry(0.015, 12, 12);
      const dot = new THREE.Mesh(dotGeo, dotMats[i]);
      dot.position.set(0.12 + i * 0.06, 0.1 - i * 0.08, 0);
      this._rightArm.add(dot);
    }

    // ---- Graceful legs ----
    this._leftLeg.position.set(-0.08, 0.75, 0);
    this._body.add(this._leftLeg);
    const lThighGeo = cyl(0.05, 0.04, 0.35, 14);
    const lThigh = new THREE.Mesh(lThighGeo, skinMat);
    lThigh.position.y = -0.2;
    this._leftLeg.add(lThigh);
    const lShinGeo = cyl(0.04, 0.03, 0.35, 14);
    const lShin = new THREE.Mesh(lShinGeo, skinMat);
    lShin.position.y = -0.5;
    this._leftLeg.add(lShin);
    // Bare foot
    const lFootGeo = new THREE.SphereGeometry(1, 18, 12);
    const lFoot = new THREE.Mesh(lFootGeo, skinMat);
    lFoot.scale.set(0.035, 0.02, 0.06);
    lFoot.position.set(0, -0.68, 0.02);
    this._leftLeg.add(lFoot);

    this._rightLeg.position.set(0.08, 0.75, 0);
    this._body.add(this._rightLeg);
    const rThighGeo = cyl(0.05, 0.04, 0.35, 14);
    const rThigh = new THREE.Mesh(rThighGeo, skinMat);
    rThigh.position.y = -0.2;
    this._rightLeg.add(rThigh);
    const rShinGeo = cyl(0.04, 0.03, 0.35, 14);
    const rShin = new THREE.Mesh(rShinGeo, skinMat);
    rShin.position.y = -0.5;
    this._rightLeg.add(rShin);
    const rFootGeo = new THREE.SphereGeometry(1, 18, 12);
    const rFoot = new THREE.Mesh(rFootGeo, skinMat);
    rFoot.scale.set(0.035, 0.02, 0.06);
    rFoot.position.set(0, -0.68, 0.02);
    this._rightLeg.add(rFoot);

    // ---- Magical aura — floating sparkle particles ----
    const sparklePositions = [
      { x: 0.3, y: 1.6, z: 0.15 },
      { x: -0.25, y: 1.3, z: 0.2 },
      { x: 0.15, y: 1.9, z: -0.1 },
      { x: -0.35, y: 1.5, z: -0.15 },
      { x: 0.2, y: 1.0, z: 0.25 },
      { x: -0.1, y: 1.8, z: 0.3 },
    ];
    for (const pos of sparklePositions) {
      const sparkGeo = new THREE.SphereGeometry(0.012, 12, 12);
      const spark = new THREE.Mesh(sparkGeo, sparkleMat);
      spark.position.set(pos.x, pos.y, pos.z);
      this._body.add(spark);
    }
  }

  // ---- Devourer builder -----------------------------------------------------

  private _buildDevourer(): void {
    const skinMat = mat(0x3a4a3a);
    const darkSkinMat = mat(0x2a3a2a);
    const toothMat = mat(0xddddcc);
    const eyeMat = mat(0xcc2200, { emissive: 0xcc2200 });
    const tongueMat = mat(0xcc5566);
    const bumpMat = mat(0x4a5a4a);
    const salivaMat = mat(0xaabb99, { transparent: true, opacity: 0.4 });
    const foldMat = mat(0x3a4a3a, { roughness: 1.0 });
    const gumMat = mat(0x884444);

    // ---- Low wide body / lower jaw ----
    const lowerJawGeo = new THREE.SphereGeometry(1, 22, 18);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, skinMat);
    lowerJaw.scale.set(0.6, 0.25, 0.5);
    lowerJaw.position.y = 0.4;
    this._body.add(lowerJaw);

    // Stomach folds — wrinkle ridges along belly
    for (let i = 0; i < 3; i++) {
      const foldGeo = new THREE.SphereGeometry(1, 18, 14);
      const fold = new THREE.Mesh(foldGeo, foldMat);
      fold.scale.set(0.55, 0.04, 0.3);
      fold.position.set(0, 0.3 + i * 0.06, -0.1 - i * 0.05);
      this._body.add(fold);
    }

    // Lower teeth — row of cones along front edge (double row)
    for (let i = -4; i <= 4; i++) {
      const toothGeo = new THREE.ConeGeometry(0.03, 0.12, 12);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(i * 0.12, 0.55, 0.4 - Math.abs(i) * 0.03);
      this._body.add(tooth);
    }
    // Inner row of smaller teeth
    for (let i = -3; i <= 3; i++) {
      const innerToothGeo = new THREE.ConeGeometry(0.018, 0.06, 10);
      const innerTooth = new THREE.Mesh(innerToothGeo, toothMat);
      innerTooth.position.set(i * 0.12, 0.52, 0.32 - Math.abs(i) * 0.02);
      this._body.add(innerTooth);
    }

    // Gum line
    const gumGeo = new THREE.SphereGeometry(1, 18, 12);
    const gum = new THREE.Mesh(gumGeo, gumMat);
    gum.scale.set(0.52, 0.04, 0.08);
    gum.position.set(0, 0.56, 0.35);
    this._body.add(gum);

    // Tongue
    const tongueGeo = cyl(0.06, 0.04, 0.35, 14);
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.38, 0.15);
    tongue.rotation.x = 0.3;
    this._body.add(tongue);

    // Saliva drips hanging from jaw
    for (let i = -1; i <= 1; i++) {
      const dripGeo = cyl(0.008, 0.003, 0.08, 12);
      const drip = new THREE.Mesh(dripGeo, salivaMat);
      drip.position.set(i * 0.15, 0.48, 0.35);
      this._body.add(drip);
    }

    // Warty bumps on body
    for (let i = 0; i < 10; i++) {
      const bumpGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 14, 12);
      const bump = new THREE.Mesh(bumpGeo, bumpMat);
      bump.position.set(
        (Math.random() - 0.5) * 0.9,
        0.3 + Math.random() * 0.15,
        (Math.random() - 0.5) * 0.7
      );
      this._body.add(bump);
    }

    // ---- Head / upper jaw ----
    this._head.position.set(0, 0.6, 0);
    this._body.add(this._head);

    const upperJawGeo = new THREE.SphereGeometry(1, 22, 18);
    const upperJaw = new THREE.Mesh(upperJawGeo, skinMat);
    upperJaw.scale.set(0.58, 0.2, 0.48);
    this._head.add(upperJaw);

    // Upper teeth (double row)
    for (let i = -4; i <= 4; i++) {
      const toothGeo = new THREE.ConeGeometry(0.03, 0.12, 12);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(i * 0.12, -0.1, 0.38 - Math.abs(i) * 0.03);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }
    // Inner row upper
    for (let i = -3; i <= 3; i++) {
      const innerToothGeo = new THREE.ConeGeometry(0.018, 0.06, 10);
      const innerTooth = new THREE.Mesh(innerToothGeo, toothMat);
      innerTooth.position.set(i * 0.12, -0.07, 0.3 - Math.abs(i) * 0.02);
      innerTooth.rotation.x = Math.PI;
      this._head.add(innerTooth);
    }

    // Upper gum line
    const upperGumGeo = new THREE.SphereGeometry(1, 18, 12);
    const upperGum = new THREE.Mesh(upperGumGeo, gumMat);
    upperGum.scale.set(0.5, 0.04, 0.08);
    upperGum.position.set(0, -0.09, 0.33);
    this._head.add(upperGum);

    // Multiple eyes around the rim of the mouth
    const eyeAngles = [-0.6, -0.3, 0, 0.3, 0.6, 0.9, -0.9];
    for (const a of eyeAngles) {
      const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(
        Math.sin(a) * 0.55,
        0.15,
        Math.cos(a) * 0.45
      );
      this._head.add(eye);
    }

    // ---- Tentacle arms ----
    this._leftArm.position.set(-0.55, 0.45, 0.1);
    this._body.add(this._leftArm);
    for (let i = 0; i < 4; i++) {
      const segGeo = cyl(0.06 - i * 0.012, 0.05 - i * 0.01, 0.2, 14);
      const seg = new THREE.Mesh(segGeo, darkSkinMat);
      seg.position.set(-i * 0.08, -i * 0.05, i * 0.04);
      seg.rotation.z = 0.3;
      this._leftArm.add(seg);
    }
    // Hook at end
    const lHookGeo = new THREE.ConeGeometry(0.025, 0.08, 12);
    const lHook = new THREE.Mesh(lHookGeo, toothMat);
    lHook.position.set(-0.32, -0.2, 0.16);
    lHook.rotation.z = 0.5;
    this._leftArm.add(lHook);

    this._rightArm.position.set(0.55, 0.45, 0.1);
    this._body.add(this._rightArm);
    for (let i = 0; i < 4; i++) {
      const segGeo = cyl(0.06 - i * 0.012, 0.05 - i * 0.01, 0.2, 14);
      const seg = new THREE.Mesh(segGeo, darkSkinMat);
      seg.position.set(i * 0.08, -i * 0.05, i * 0.04);
      seg.rotation.z = -0.3;
      this._rightArm.add(seg);
    }
    const rHookGeo = new THREE.ConeGeometry(0.025, 0.08, 12);
    const rHook = new THREE.Mesh(rHookGeo, toothMat);
    rHook.position.set(0.32, -0.2, 0.16);
    rHook.rotation.z = -0.5;
    this._rightArm.add(rHook);

    // ---- Short stumpy legs ----
    this._leftLeg.position.set(-0.35, 0.15, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.08, 0.1, 0.2, 14);
    const lLeg = new THREE.Mesh(lLegGeo, skinMat);
    lLeg.position.y = -0.1;
    this._leftLeg.add(lLeg);

    this._rightLeg.position.set(0.35, 0.15, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.08, 0.1, 0.2, 14);
    const rLeg = new THREE.Mesh(rLegGeo, skinMat);
    rLeg.position.y = -0.1;
    this._rightLeg.add(rLeg);
  }

  // ---- Pixie builder --------------------------------------------------------

  private _buildPixie(): void {
    const skinMat = mat(0xddffdd, { emissive: 0x44aa44 });
    const wingMat = mat(0xaaffcc, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const eyeMat = mat(0x44ff88, { emissive: 0x44ff88 });
    const sparkleMat = mat(0xffffff, { emissive: 0xffffff });
    const veinMat = mat(0x66cc88, { emissive: 0x44aa66, transparent: true, opacity: 0.5 });

    // ---- Tiny body ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.06, 0.1, 0.05);
    torso.position.y = 0.1;
    this._body.add(torso);

    // ---- Head ----
    this._head.position.set(0, 0.18, 0.02);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.055, 0.06, 0.05);
    this._head.add(headMesh);

    // Large eyes relative to head
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.025, 0.01, 0.04);
      this._head.add(eye);
    }

    // Tiny pointed ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.01, 0.03, 12);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.05, 0.02, 0);
      ear.rotation.z = side * Math.PI / 3;
      this._head.add(ear);
    }

    // Tiny antennae
    for (const side of [-1, 1]) {
      const antennaGeo = cyl(0.002, 0.001, 0.03, 12);
      const antenna = new THREE.Mesh(antennaGeo, skinMat);
      antenna.position.set(side * 0.015, 0.065, 0.02);
      antenna.rotation.z = side * -0.3;
      this._head.add(antenna);
      // Antenna tip glow
      const tipGeo = new THREE.SphereGeometry(0.004, 10, 10);
      const tip = new THREE.Mesh(tipGeo, sparkleMat);
      tip.position.set(side * 0.02, 0.08, 0.02);
      this._head.add(tip);
    }

    // ---- Delicate dragonfly wings ----
    this._leftArm.position.set(-0.06, 0.14, 0);
    this._body.add(this._leftArm);

    const lWingUpperGeo = new THREE.PlaneGeometry(0.1, 0.06, 4, 3);
    const lWingUpper = new THREE.Mesh(lWingUpperGeo, wingMat);
    lWingUpper.position.set(-0.04, 0.02, -0.01);
    lWingUpper.rotation.y = 0.3;
    this._leftArm.add(lWingUpper);

    const lWingLowerGeo = new THREE.PlaneGeometry(0.08, 0.05, 3, 3);
    const lWingLower = new THREE.Mesh(lWingLowerGeo, wingMat);
    lWingLower.position.set(-0.03, -0.02, -0.01);
    lWingLower.rotation.y = 0.4;
    this._leftArm.add(lWingLower);

    // Wing vein (left)
    const lVeinGeo = cyl(0.001, 0.0005, 0.08, 12);
    const lVein = new THREE.Mesh(lVeinGeo, veinMat);
    lVein.position.set(-0.04, 0.01, -0.005);
    lVein.rotation.z = 0.3;
    this._leftArm.add(lVein);

    this._rightArm.position.set(0.06, 0.14, 0);
    this._body.add(this._rightArm);

    const rWingUpperGeo = new THREE.PlaneGeometry(0.1, 0.06, 4, 3);
    const rWingUpper = new THREE.Mesh(rWingUpperGeo, wingMat);
    rWingUpper.position.set(0.04, 0.02, -0.01);
    rWingUpper.rotation.y = -0.3;
    this._rightArm.add(rWingUpper);

    const rWingLowerGeo = new THREE.PlaneGeometry(0.08, 0.05, 3, 3);
    const rWingLower = new THREE.Mesh(rWingLowerGeo, wingMat);
    rWingLower.position.set(0.03, -0.02, -0.01);
    rWingLower.rotation.y = -0.4;
    this._rightArm.add(rWingLower);

    // Wing vein (right)
    const rVeinGeo = cyl(0.001, 0.0005, 0.08, 12);
    const rVein = new THREE.Mesh(rVeinGeo, veinMat);
    rVein.position.set(0.04, 0.01, -0.005);
    rVein.rotation.z = -0.3;
    this._rightArm.add(rVein);

    // ---- Tiny legs ----
    this._leftLeg.position.set(-0.025, 0.04, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.01, 0.008, 0.05, 12);
    const lLeg = new THREE.Mesh(lLegGeo, skinMat);
    lLeg.position.y = -0.03;
    this._leftLeg.add(lLeg);

    this._rightLeg.position.set(0.025, 0.04, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.01, 0.008, 0.05, 12);
    const rLeg = new THREE.Mesh(rLegGeo, skinMat);
    rLeg.position.y = -0.03;
    this._rightLeg.add(rLeg);

    // ---- Sparkle trail behind ----
    const sparkleOffsets = [
      { x: 0, y: 0.12, z: -0.08 },
      { x: 0.03, y: 0.1, z: -0.14 },
      { x: -0.02, y: 0.08, z: -0.2 },
      { x: 0.01, y: 0.06, z: -0.26 },
    ];
    for (const pos of sparkleOffsets) {
      const sparkGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const spark = new THREE.Mesh(sparkGeo, sparkleMat);
      spark.position.set(pos.x, pos.y, pos.z);
      this._body.add(spark);
    }
  }

  // ---- Bat builder ----------------------------------------------------------

  private _buildBat(): void {
    const furMat = mat(0x1a1511);
    const darkFurMat = mat(0x0f0b08);
    const membraneMat = mat(0x2a2018, { side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const eyeMat = mat(0x331100, { emissive: 0x221100 });
    const fangMat = mat(0xddddcc);
    const earMat = mat(0x1a1511);
    const noseMat = mat(0x2a1a11);
    const fleshMat = mat(0x3a2a1a);

    // ---- Small body ----
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, furMat);
    torso.scale.set(0.12, 0.15, 0.1);
    torso.position.y = 0.2;
    this._body.add(torso);

    // Belly fur (slightly lighter patch)
    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, darkFurMat);
    belly.scale.set(0.09, 0.1, 0.08);
    belly.position.set(0, 0.16, 0.04);
    this._body.add(belly);

    // Fur tufts on back
    for (let i = 0; i < 4; i++) {
      const tuftGeo = new THREE.SphereGeometry(0.015, 12, 10);
      const tuft = new THREE.Mesh(tuftGeo, furMat);
      tuft.scale.set(1, 1.5, 0.8);
      tuft.position.set(
        (Math.random() - 0.5) * 0.08,
        0.22 + Math.random() * 0.06,
        -0.06 + Math.random() * 0.02
      );
      this._body.add(tuft);
    }

    // ---- Head ----
    this._head.position.set(0, 0.32, 0.06);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, furMat);
    headMesh.scale.set(0.08, 0.07, 0.07);
    this._head.add(headMesh);

    // Large pointed ears with inner membrane
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.03, 0.08, 12);
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(side * 0.05, 0.07, 0);
      ear.rotation.z = side * -0.2;
      this._head.add(ear);
      // Inner ear membrane
      const innerEarGeo = new THREE.ConeGeometry(0.018, 0.05, 10);
      const innerEar = new THREE.Mesh(innerEarGeo, fleshMat);
      innerEar.position.set(side * 0.05, 0.065, 0.005);
      innerEar.rotation.z = side * -0.2;
      this._head.add(innerEar);
    }

    // Tiny eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.03, 0.01, 0.06);
      this._head.add(eye);
    }

    // Small fangs
    for (const side of [-1, 1]) {
      const fangGeo = new THREE.ConeGeometry(0.006, 0.025, 10);
      const fang = new THREE.Mesh(fangGeo, fangMat);
      fang.position.set(side * 0.015, -0.045, 0.05);
      fang.rotation.x = Math.PI;
      this._head.add(fang);
    }

    // Nose leaf detail — tiny triangle on snout
    const noseGeo = new THREE.ConeGeometry(0.015, 0.025, 10);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.01, 0.07);
    nose.rotation.x = -0.3;
    this._head.add(nose);

    // Snout detail
    const snoutGeo = new THREE.SphereGeometry(1, 16, 12);
    const snout = new THREE.Mesh(snoutGeo, furMat);
    snout.scale.set(0.035, 0.025, 0.03);
    snout.position.set(0, -0.02, 0.06);
    this._head.add(snout);

    // ---- Membranous wings ----
    this._leftArm.position.set(-0.12, 0.22, 0);
    this._body.add(this._leftArm);

    // Wing membrane — multi-segment for bat-like shape
    const lWingGeo = new THREE.PlaneGeometry(0.3, 0.2, 6, 4);
    const lWing = new THREE.Mesh(lWingGeo, membraneMat);
    lWing.position.set(-0.12, 0, -0.02);
    lWing.rotation.y = 0.2;
    this._leftArm.add(lWing);

    // Wing finger bones
    for (let i = 0; i < 3; i++) {
      const boneGeo = cyl(0.005, 0.003, 0.2, 12);
      const bone = new THREE.Mesh(boneGeo, darkFurMat);
      bone.position.set(-0.06 - i * 0.06, 0.03 - i * 0.03, -0.01);
      bone.rotation.z = 0.3 + i * 0.15;
      this._leftArm.add(bone);
    }

    // Wing membrane scallop between fingers (left)
    for (let i = 0; i < 2; i++) {
      const scallGeo = new THREE.PlaneGeometry(0.06, 0.04, 3, 2);
      const scall = new THREE.Mesh(scallGeo, membraneMat);
      scall.position.set(-0.09 - i * 0.06, -0.03 - i * 0.02, -0.015);
      scall.rotation.y = 0.2;
      this._leftArm.add(scall);
    }

    this._rightArm.position.set(0.12, 0.22, 0);
    this._body.add(this._rightArm);

    const rWingGeo = new THREE.PlaneGeometry(0.3, 0.2, 6, 4);
    const rWing = new THREE.Mesh(rWingGeo, membraneMat);
    rWing.position.set(0.12, 0, -0.02);
    rWing.rotation.y = -0.2;
    this._rightArm.add(rWing);

    for (let i = 0; i < 3; i++) {
      const boneGeo = cyl(0.005, 0.003, 0.2, 12);
      const bone = new THREE.Mesh(boneGeo, darkFurMat);
      bone.position.set(0.06 + i * 0.06, 0.03 - i * 0.03, -0.01);
      bone.rotation.z = -(0.3 + i * 0.15);
      this._rightArm.add(bone);
    }

    // Wing membrane scallop between fingers (right)
    for (let i = 0; i < 2; i++) {
      const scallGeo = new THREE.PlaneGeometry(0.06, 0.04, 3, 2);
      const scall = new THREE.Mesh(scallGeo, membraneMat);
      scall.position.set(0.09 + i * 0.06, -0.03 - i * 0.02, -0.015);
      scall.rotation.y = -0.2;
      this._rightArm.add(scall);
    }

    // ---- Tiny clawed feet ----
    this._leftLeg.position.set(-0.05, 0.07, 0);
    this._body.add(this._leftLeg);
    const lLegGeo = cyl(0.015, 0.012, 0.08, 12);
    const lLeg = new THREE.Mesh(lLegGeo, furMat);
    lLeg.position.y = -0.04;
    this._leftLeg.add(lLeg);
    // Claws
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.005, 0.02, 10);
      const claw = new THREE.Mesh(clawGeo, darkFurMat);
      claw.position.set(t * 0.01, -0.09, 0.01);
      claw.rotation.x = 0.3;
      this._leftLeg.add(claw);
    }

    this._rightLeg.position.set(0.05, 0.07, 0);
    this._body.add(this._rightLeg);
    const rLegGeo = cyl(0.015, 0.012, 0.08, 12);
    const rLeg = new THREE.Mesh(rLegGeo, furMat);
    rLeg.position.y = -0.04;
    this._rightLeg.add(rLeg);
    for (let t = -1; t <= 1; t++) {
      const clawGeo = new THREE.ConeGeometry(0.005, 0.02, 10);
      const claw = new THREE.Mesh(clawGeo, darkFurMat);
      claw.position.set(t * 0.01, -0.09, 0.01);
      claw.rotation.x = 0.3;
      this._rightLeg.add(claw);
    }
  }


  // ---- Lightning Elemental builder ------------------------------------------

  private _buildLightningElemental(): void {
    const coreMat = mat(0x4488ff, { emissive: 0x2266cc });
    const arcMat = mat(0x88ccff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const sparkMat = mat(0xeeeeff, { emissive: 0xeeeeff });
    const purpleMat = mat(0x6644cc, { emissive: 0x4422aa });
    const eyeMat = mat(0xffffff, { emissive: 0xeeeeff });
    const boltMat = mat(0x4488ff, { emissive: 0x2266cc, transparent: true, opacity: 0.85 });
    const legMat = mat(0x4488ff, { emissive: 0x2266cc, transparent: true, opacity: 0.8 });
    const innerGlowMat = mat(0xaaddff, { emissive: 0x88ccff, transparent: true, opacity: 0.3 });

    // ---- Core body — bright electric blue sphere ----
    const coreGeo = new THREE.SphereGeometry(0.5, 24, 20);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    this._body.add(core);

    // Inner glow layer
    const innerGlowGeo = new THREE.SphereGeometry(0.42, 20, 18);
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.y = 2.4;
    this._body.add(innerGlow);

    // Outer crackling layer — semi-transparent electric arcs (thin cylinders at random angles)
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const tilt = Math.random() * Math.PI - Math.PI / 2;
      const arcGeo = cyl(0.015, 0.015, 0.4 + Math.random() * 0.3, 12);
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.position.set(
        Math.cos(angle) * 0.45,
        2.3 + Math.random() * 0.3,
        Math.sin(angle) * 0.45,
      );
      arc.rotation.set(tilt, angle, Math.random() * Math.PI);
      this._body.add(arc);
    }

    // Purple energy wisps around core
    for (let i = 0; i < 4; i++) {
      const wAngle = (i / 4) * Math.PI * 2 + 0.2;
      const wispGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 16, 16);
      const wisp = new THREE.Mesh(wispGeo, purpleMat);
      wisp.position.set(
        Math.cos(wAngle) * 0.55,
        2.3 + Math.random() * 0.4,
        Math.sin(wAngle) * 0.55,
      );
      this._body.add(wisp);
    }

    // Floating energy particles around core
    for (let i = 0; i < 6; i++) {
      const particleGeo = new THREE.SphereGeometry(0.02, 12, 12);
      const particle = new THREE.Mesh(particleGeo, sparkMat);
      const pAngle = (i / 6) * Math.PI * 2;
      particle.position.set(
        Math.cos(pAngle) * 0.7,
        2.2 + Math.random() * 0.5,
        Math.sin(pAngle) * 0.7,
      );
      this._body.add(particle);
    }

    // ---- Head — floating electric crown with spark tips ----
    this._head.position.set(0, 3.4, 0.0);
    this._body.add(this._head);

    // Crown base — electric ring
    const crownBaseGeo = new THREE.SphereGeometry(0.22, 20, 16);
    const crownBase = new THREE.Mesh(crownBaseGeo, coreMat);
    crownBase.scale.set(1, 0.6, 1);
    this._head.add(crownBase);

    // Crown spikes — upward-pointing electric prongs with spark tips
    for (let i = 0; i < 6; i++) {
      const csAngle = (i / 6) * Math.PI * 2;
      const spikeH = 0.2 + Math.random() * 0.15;
      const spikeGeo = cyl(0.03, 0.01, spikeH, 12);
      const spike = new THREE.Mesh(spikeGeo, boltMat);
      spike.position.set(
        Math.cos(csAngle) * 0.18,
        0.12 + spikeH / 2,
        Math.sin(csAngle) * 0.18,
      );
      spike.rotation.z = Math.sin(csAngle) * 0.2;
      this._head.add(spike);

      // Spark tip on each prong
      const sparkTipGeo = new THREE.SphereGeometry(0.025, 14, 14);
      const sparkTip = new THREE.Mesh(sparkTipGeo, sparkMat);
      sparkTip.position.set(
        Math.cos(csAngle) * 0.18,
        0.12 + spikeH + 0.02,
        Math.sin(csAngle) * 0.18,
      );
      this._head.add(sparkTip);
    }

    // Eyes — bright white emissive spots
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, -0.02, 0.18);
      this._head.add(eye);
    }

    // ---- Arms — segmented lightning bolt shapes (zigzag cylinders) ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.55, 2.8, 0.0);
      this._body.add(arm);

      // Shoulder flare
      const shoulderGeo = new THREE.SphereGeometry(0.15, 18, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, coreMat);
      arm.add(shoulder);

      // Upper arm — zigzag segment 1
      const seg1Geo = cyl(0.1, 0.08, 0.35, 14);
      const seg1 = new THREE.Mesh(seg1Geo, boltMat);
      seg1.position.set(side * 0.08, -0.2, 0);
      seg1.rotation.z = side * 0.4;
      arm.add(seg1);

      // Zigzag segment 2
      const seg2Geo = cyl(0.08, 0.07, 0.35, 14);
      const seg2 = new THREE.Mesh(seg2Geo, boltMat);
      seg2.position.set(side * -0.06, -0.55, 0);
      seg2.rotation.z = side * -0.4;
      arm.add(seg2);

      // Zigzag segment 3 (forearm)
      const seg3Geo = cyl(0.07, 0.05, 0.35, 14);
      const seg3 = new THREE.Mesh(seg3Geo, arcMat);
      seg3.position.set(side * 0.05, -0.9, 0);
      seg3.rotation.z = side * 0.3;
      arm.add(seg3);

      // Ball lightning hand
      const handGeo = new THREE.SphereGeometry(0.1, 18, 18);
      const hand = new THREE.Mesh(handGeo, sparkMat);
      hand.position.y = -1.2;
      arm.add(hand);

      // Outer glow on hand
      const handGlowGeo = new THREE.SphereGeometry(0.14, 16, 16);
      const handGlow = new THREE.Mesh(handGlowGeo, mat(0x88ccff, { transparent: true, opacity: 0.35 }));
      handGlow.position.y = -1.2;
      arm.add(handGlow);
    }

    // ---- Legs — pillars of crackling energy, wider at base ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25, 1.4, 0.0);
      this._body.add(leg);

      // Upper leg — wide
      const upperLegGeo = cyl(0.16, 0.2, 0.6, 16);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.3;
      leg.add(upperLeg);

      // Lower leg — widening toward base
      const lowerLegGeo = cyl(0.2, 0.28, 0.55, 16);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.8;
      leg.add(lowerLeg);

      // Electric pool at bottom
      const poolGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.05, 20);
      const pool = new THREE.Mesh(poolGeo, mat(0x4488ff, { emissive: 0x2266cc, transparent: true, opacity: 0.7 }));
      pool.position.y = -1.1;
      leg.add(pool);

      // Small crackling arcs on legs
      for (let a = 0; a < 2; a++) {
        const lArcGeo = cyl(0.012, 0.012, 0.15, 12);
        const lArc = new THREE.Mesh(lArcGeo, arcMat);
        lArc.position.set(
          side * (0.1 + Math.random() * 0.08),
          -0.4 - a * 0.35,
          0.1,
        );
        lArc.rotation.z = Math.random() * Math.PI;
        leg.add(lArc);
      }
    }

    // ---- Floating arc sparks around body (small thin cylinders) ----
    for (let i = 0; i < 10; i++) {
      const sparkLen = 0.08 + Math.random() * 0.12;
      const sparkGeo = cyl(0.01, 0.01, sparkLen, 12);
      const isWhite = Math.random() > 0.5;
      const spark = new THREE.Mesh(sparkGeo, isWhite ? sparkMat : purpleMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = 0.5 + Math.random() * 0.6;
      spark.position.set(
        Math.cos(sAngle) * sRadius,
        1.6 + Math.random() * 2.2,
        Math.sin(sAngle) * sRadius,
      );
      spark.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      this._body.add(spark);
    }
  }

  // ---- Distortion Elemental builder -----------------------------------------

  private _buildDistortionElemental(): void {
    const coreMat = mat(0x1a0a2e, { emissive: 0x0a0518 });
    const shellMat = mat(0x3a1a5e, { transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const glowMat = mat(0x6622aa, { emissive: 0x6622aa });
    const eyeMat = mat(0xaa44ff, { emissive: 0xaa44ff });
    const smokeMat = mat(0x2a1a3e, { transparent: true, opacity: 0.4 });
    const shardMat = mat(0x1a0a2e, { emissive: 0x331166 });
    const tendrilMat = mat(0x2a1a3e, { transparent: true, opacity: 0.7 });
    const fadeMat = mat(0x2a1a3e, { transparent: true, opacity: 0.25 });
    const legMat = mat(0x1a0a2e, { emissive: 0x110822, transparent: true, opacity: 0.8 });
    const innerVoidMat = mat(0x0a0018, { emissive: 0x220044, transparent: true, opacity: 0.5 });

    // ---- Core body — dark purple-black sphere ----
    const coreGeo = new THREE.SphereGeometry(0.5, 24, 20);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    this._body.add(core);

    // Inner void layer
    const innerVoidGeo = new THREE.SphereGeometry(0.38, 20, 18);
    const innerVoid = new THREE.Mesh(innerVoidGeo, innerVoidMat);
    innerVoid.position.y = 2.4;
    this._body.add(innerVoid);

    // Semi-transparent outer shell
    const shellGeo = new THREE.SphereGeometry(0.65, 22, 18);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.y = 2.4;
    shell.scale.set(1, 1.1, 1);
    this._body.add(shell);

    // Smoke wisps around core
    for (let i = 0; i < 4; i++) {
      const wAngle = (i / 4) * Math.PI * 2 + 0.5;
      const wispGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.06, 16, 16);
      const wisp = new THREE.Mesh(wispGeo, smokeMat);
      wisp.position.set(
        Math.cos(wAngle) * 0.5,
        2.3 + Math.random() * 0.4,
        Math.sin(wAngle) * 0.5,
      );
      this._body.add(wisp);
    }

    // Distortion ripple rings around core
    for (let i = 0; i < 3; i++) {
      const rippleGeo = new THREE.SphereGeometry(0.55 + i * 0.1, 20, 16);
      const ripple = new THREE.Mesh(rippleGeo, mat(0x3a1a5e, { transparent: true, opacity: 0.12 - i * 0.03, side: THREE.DoubleSide }));
      ripple.scale.set(1, 0.05, 1);
      ripple.position.y = 2.4;
      this._body.add(ripple);
    }

    // ---- Floating void shards around body (small rotated boxes) ----
    for (let i = 0; i < 8; i++) {
      const size = 0.04 + Math.random() * 0.05;
      const voidShardGeo = new THREE.BoxGeometry(size, size * 1.5, size);
      const voidShard = new THREE.Mesh(voidShardGeo, shardMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = 0.6 + Math.random() * 0.6;
      voidShard.position.set(
        Math.cos(sAngle) * sRadius,
        1.6 + Math.random() * 2.2,
        Math.sin(sAngle) * sRadius,
      );
      voidShard.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      this._body.add(voidShard);
    }

    // ---- Head — faceless void with glowing purple eye slits ----
    this._head.position.set(0, 3.4, 0.0);
    this._body.add(this._head);

    // Featureless void head
    const headGeo = new THREE.SphereGeometry(0.24, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, coreMat);
    headMesh.scale.set(1, 1.1, 0.9);
    this._head.add(headMesh);

    // Outer smoky halo
    const haloGeo = new THREE.SphereGeometry(0.3, 18, 14);
    const halo = new THREE.Mesh(haloGeo, smokeMat);
    halo.scale.set(1, 0.8, 1);
    this._head.add(halo);

    // Glowing purple eye slits
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.BoxGeometry(0.06, 0.02, 0.02);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.09, 0.02, 0.2);
      this._head.add(eye);
    }

    // ---- Arms — wispy tendril-like limbs that fade to near-transparent at tips ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.55, 2.8, 0.0);
      this._body.add(arm);

      // Shoulder wisp
      const shoulderGeo = new THREE.SphereGeometry(0.14, 18, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, tendrilMat);
      arm.add(shoulder);

      // Upper tendril — thicker
      const upperGeo = cyl(0.1, 0.07, 0.6, 14);
      const upper = new THREE.Mesh(upperGeo, tendrilMat);
      upper.position.y = -0.35;
      arm.add(upper);

      // Mid tendril — thinning
      const midGeo = cyl(0.07, 0.04, 0.5, 14);
      const mid = new THREE.Mesh(midGeo, smokeMat);
      mid.position.y = -0.75;
      arm.add(mid);

      // Tip tendril — near-transparent
      const tipGeo = cyl(0.04, 0.015, 0.4, 12);
      const tip = new THREE.Mesh(tipGeo, fadeMat);
      tip.position.y = -1.1;
      arm.add(tip);

      // Faint glow at fingertip
      const glowTipGeo = new THREE.SphereGeometry(0.03, 14, 14);
      const glowTip = new THREE.Mesh(glowTipGeo, glowMat);
      glowTip.position.y = -1.35;
      arm.add(glowTip);
    }

    // ---- Legs — shadowy pillars ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25, 1.4, 0.0);
      this._body.add(leg);

      // Upper leg
      const upperLegGeo = cyl(0.16, 0.2, 0.6, 16);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.3;
      leg.add(upperLeg);

      // Lower leg — widening toward base
      const lowerLegGeo = cyl(0.2, 0.28, 0.55, 16);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.8;
      leg.add(lowerLeg);

      // Shadow pool at bottom
      const poolGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.05, 20);
      const pool = new THREE.Mesh(poolGeo, mat(0x1a0a2e, { emissive: 0x110822, transparent: true, opacity: 0.6 }));
      pool.position.y = -1.1;
      leg.add(pool);
    }

    // Larger void chunks floating nearby
    for (let i = 0; i < 4; i++) {
      const chunkGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 16, 16);
      const chunk = new THREE.Mesh(chunkGeo, glowMat);
      const cAngle = Math.random() * Math.PI * 2;
      chunk.position.set(
        Math.cos(cAngle) * (0.6 + Math.random() * 0.3),
        2.0 + Math.random() * 1.2,
        Math.sin(cAngle) * (0.6 + Math.random() * 0.3),
      );
      this._body.add(chunk);
    }
  }

  // ---- Minor Fire Elemental builder -----------------------------------------

  private _buildMinorFireElemental(): void {
    const s = 0.6; // scale factor
    const coreMat = mat(0xff4400, { emissive: 0xff2200 });
    const outerFlameMat = mat(0xffaa00, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const innerFlameMat = mat(0xff6611, { emissive: 0xcc3300, transparent: true, opacity: 0.7 });
    const emberMat = mat(0xffcc00, { emissive: 0xffcc00 });
    const eyeMat = mat(0xffffff, { emissive: 0xffff88 });
    const armMat = mat(0xff6611, { emissive: 0xcc3300 });
    const legMat = mat(0xff6611, { emissive: 0xcc3300, transparent: true, opacity: 0.85 });

    // ---- Core body ----
    const coreGeo = new THREE.SphereGeometry(0.5 * s, 22, 18);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4 * s;
    this._body.add(core);

    // Inner glow layer
    const innerGlowGeo = new THREE.SphereGeometry(0.4 * s, 18, 16);
    const innerGlow = new THREE.Mesh(innerGlowGeo, mat(0xffcc00, { emissive: 0xff8800, transparent: true, opacity: 0.3 }));
    innerGlow.position.y = 2.4 * s;
    this._body.add(innerGlow);

    // Outer flame layer
    const outerGeo = new THREE.SphereGeometry(0.65 * s, 20, 16);
    const outer = new THREE.Mesh(outerGeo, outerFlameMat);
    outer.position.y = 2.4 * s;
    outer.scale.set(1, 1.15, 1);
    this._body.add(outer);

    // Upper flame wisps
    for (let i = 0; i < 3; i++) {
      const wAngle = (i / 3) * Math.PI * 2 + 0.3;
      const wispGeo = new THREE.ConeGeometry((0.1 + Math.random() * 0.05) * s, (0.4 + Math.random() * 0.2) * s, 12);
      const wisp = new THREE.Mesh(wispGeo, outerFlameMat);
      wisp.position.set(
        Math.cos(wAngle) * 0.25 * s,
        3.0 * s + Math.random() * 0.15 * s,
        Math.sin(wAngle) * 0.25 * s,
      );
      wisp.rotation.z = Math.sin(wAngle) * 0.3;
      this._body.add(wisp);
    }

    // ---- Head ----
    this._head.position.set(0, 3.4 * s, 0.0);
    this._body.add(this._head);

    const crownBaseGeo = new THREE.SphereGeometry(0.22 * s, 18, 14);
    const crownBase = new THREE.Mesh(crownBaseGeo, innerFlameMat);
    crownBase.scale.set(1, 0.6, 1);
    this._head.add(crownBase);

    // Crown spikes — fewer
    for (let i = 0; i < 4; i++) {
      const csAngle = (i / 4) * Math.PI * 2;
      const spikeH = (0.15 + Math.random() * 0.1) * s;
      const spikeGeo = new THREE.ConeGeometry(0.04 * s, spikeH, 12);
      const spike = new THREE.Mesh(spikeGeo, outerFlameMat);
      spike.position.set(
        Math.cos(csAngle) * 0.18 * s,
        0.1 * s + spikeH / 2,
        Math.sin(csAngle) * 0.18 * s,
      );
      this._head.add(spike);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.03 * s, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1 * s, -0.02 * s, 0.18 * s);
      this._head.add(eye);
    }

    // ---- Arms — simpler ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.55 * s, 2.8 * s, 0.0);
      this._body.add(arm);

      const shoulderGeo = new THREE.SphereGeometry(0.12 * s, 16, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, armMat);
      arm.add(shoulder);

      const upperGeo = cyl(0.09 * s, 0.06 * s, 0.5 * s, 14);
      const upper = new THREE.Mesh(upperGeo, armMat);
      upper.position.y = -0.3 * s;
      arm.add(upper);

      const tipGeo = new THREE.ConeGeometry(0.06 * s, 0.2 * s, 12);
      const tip = new THREE.Mesh(tipGeo, outerFlameMat);
      tip.position.y = -0.7 * s;
      tip.rotation.x = Math.PI;
      arm.add(tip);
    }

    // ---- Legs — simpler ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25 * s, 1.4 * s, 0.0);
      this._body.add(leg);

      const upperLegGeo = cyl(0.14 * s, 0.18 * s, 0.5 * s, 14);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.25 * s;
      leg.add(upperLeg);

      const lowerLegGeo = cyl(0.18 * s, 0.24 * s, 0.45 * s, 14);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.65 * s;
      leg.add(lowerLeg);

      const poolGeo = new THREE.CylinderGeometry(0.26 * s, 0.28 * s, 0.04, 18);
      const pool = new THREE.Mesh(poolGeo, mat(0xff6600, { emissive: 0xff4400, transparent: true, opacity: 0.7 }));
      pool.position.y = -0.9 * s;
      leg.add(pool);
    }

    // ---- Embers — fewer (6 instead of 12) ----
    for (let i = 0; i < 6; i++) {
      const size = (0.02 + Math.random() * 0.025) * s;
      const emberGeo = new THREE.SphereGeometry(size, 14, 14);
      const isYellow = Math.random() > 0.5;
      const ember = new THREE.Mesh(emberGeo, isYellow
        ? emberMat
        : mat(0xff8800, { emissive: 0xff6600 }),
      );
      const eAngle = Math.random() * Math.PI * 2;
      const eRadius = (0.5 + Math.random() * 0.5) * s;
      ember.position.set(
        Math.cos(eAngle) * eRadius,
        (1.6 + Math.random() * 2.0) * s,
        Math.sin(eAngle) * eRadius,
      );
      this._body.add(ember);
    }
  }

  // ---- Minor Ice Elemental builder ------------------------------------------

  private _buildMinorIceElemental(): void {
    const s = 0.6; // scale factor
    const iceMat = mat(0x8ec8d8, { transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.3 });
    const deepBlueMat = mat(0x3a7ca5, { transparent: true, opacity: 0.9, roughness: 0.15, metalness: 0.4 });
    const whiteMat = mat(0xddeeff, { roughness: 0.1, metalness: 0.2 });
    const eyeMat = mat(0x66ccff, { emissive: 0x3399cc });
    const darkCoreMat = mat(0x1a4466, { transparent: true, opacity: 0.75 });
    const shardMat = mat(0x8ec8d8, { transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.5 });

    // ---- Core body — angular crystalline cluster ----
    const coreGeo = new THREE.DodecahedronGeometry(0.5 * s, 0);
    const core = new THREE.Mesh(coreGeo, iceMat);
    core.scale.set(0.9, 1.2, 0.7);
    core.position.y = 2.5 * s;
    core.rotation.y = 0.15;
    this._body.add(core);

    // Dark inner core
    const innerGeo = new THREE.OctahedronGeometry(0.3 * s, 0);
    const inner = new THREE.Mesh(innerGeo, darkCoreMat);
    inner.scale.set(0.85, 1.35, 0.7);
    inner.position.y = 2.5 * s;
    inner.rotation.y = 0.4;
    this._body.add(inner);

    // Upper chest slab
    const upperChestGeo = new THREE.OctahedronGeometry(0.35 * s, 0);
    const upperChest = new THREE.Mesh(upperChestGeo, deepBlueMat);
    upperChest.scale.set(1.15, 0.7, 0.85);
    upperChest.position.set(0, 3.1 * s, 0.05 * s);
    this._body.add(upperChest);

    // Frost veins on chest — glowing blue lines
    for (let i = 0; i < 3; i++) {
      const veinGeo = cyl(0.01 * s, 0.005 * s, 0.3 * s, 12);
      const vein = new THREE.Mesh(veinGeo, mat(0x66ccff, { emissive: 0x3399cc, transparent: true, opacity: 0.6 }));
      vein.position.set((-0.15 + i * 0.15) * s, 2.7 * s, 0.35 * s);
      vein.rotation.z = (Math.random() - 0.5) * 0.4;
      this._body.add(vein);
    }

    // ---- Head — angular crown of ice spikes (simpler: 3 spikes instead of 5) ----
    this._head.position.set(0, 3.7 * s, 0.1 * s);
    this._body.add(this._head);

    const headGeo = new THREE.OctahedronGeometry(0.2 * s, 1);
    const headMesh = new THREE.Mesh(headGeo, iceMat);
    headMesh.scale.set(1.0, 0.88, 0.88);
    this._head.add(headMesh);

    // Crown spikes — 3 instead of 5
    const crownAngles = [-0.35, 0, 0.35];
    for (let i = 0; i < crownAngles.length; i++) {
      const h = (0.2 + (i % 2 === 0 ? 0.08 : 0.0)) * s;
      const spikeGeo = new THREE.ConeGeometry(0.05 * s, h, 10);
      const spike = new THREE.Mesh(spikeGeo, whiteMat);
      spike.position.set(crownAngles[i] * 0.4 * s, 0.2 * s + h / 2, 0.0);
      spike.rotation.z = crownAngles[i] * 0.3;
      this._head.add(spike);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.035 * s, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1 * s, 0.0, 0.17 * s);
      this._head.add(eye);
    }

    // Icicle beard — 3 instead of 5
    for (let i = 0; i < 3; i++) {
      const len = (0.1 + Math.random() * 0.08) * s;
      const icicleGeo = new THREE.ConeGeometry(0.018 * s, len, 10);
      const icicle = new THREE.Mesh(icicleGeo, whiteMat);
      icicle.position.set((-0.06 + i * 0.06) * s, -0.15 * s - len / 2, 0.12 * s);
      icicle.rotation.x = Math.PI;
      this._head.add(icicle);
    }

    // ---- Arms — simpler ice limbs ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.6 * s, 3.1 * s, 0.0);
      this._body.add(arm);

      const shoulderGeo = new THREE.OctahedronGeometry(0.09 * s, 0);
      const shoulder = new THREE.Mesh(shoulderGeo, deepBlueMat);
      arm.add(shoulder);

      const upperArmGeo = cyl(0.07 * s, 0.06 * s, 0.55 * s, 6);
      const upperArm = new THREE.Mesh(upperArmGeo, iceMat);
      upperArm.position.set(0, -0.35 * s, 0);
      arm.add(upperArm);

      const foreGeo = cyl(0.06 * s, 0.05 * s, 0.5 * s, 6);
      const fore = new THREE.Mesh(foreGeo, iceMat);
      fore.position.y = -0.8 * s;
      arm.add(fore);

      // Ice blade hand
      const bladeGeo = new THREE.ConeGeometry(0.07 * s, 0.3 * s, 10);
      const blade = new THREE.Mesh(bladeGeo, whiteMat);
      blade.position.y = -1.15 * s;
      blade.rotation.x = Math.PI;
      arm.add(blade);
    }

    // ---- Legs — simpler ice pillars ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3 * s, 1.55 * s, 0.0);
      this._body.add(leg);

      const thighGeo = cyl(0.11 * s, 0.09 * s, 0.5 * s, 6);
      const thigh = new THREE.Mesh(thighGeo, iceMat);
      thigh.position.y = -0.25 * s;
      leg.add(thigh);

      const shinGeo = cyl(0.1 * s, 0.08 * s, 0.45 * s, 6);
      const shin = new THREE.Mesh(shinGeo, iceMat);
      shin.position.y = -0.7 * s;
      leg.add(shin);

      const footGeo = new THREE.OctahedronGeometry(0.12 * s, 0);
      const foot = new THREE.Mesh(footGeo, deepBlueMat);
      foot.scale.set(1.05, 0.35, 1.25);
      foot.position.set(0, -1.0 * s, 0.04 * s);
      leg.add(foot);
    }

    // ---- Floating ice shards — fewer (5 instead of 10) ----
    for (let i = 0; i < 5; i++) {
      const size = (0.025 + Math.random() * 0.035) * s;
      const fShardGeo = new THREE.OctahedronGeometry(size * 0.7, 0);
      const fShard = new THREE.Mesh(fShardGeo, shardMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = (0.5 + Math.random() * 0.6) * s;
      fShard.position.set(
        Math.cos(sAngle) * sRadius,
        (1.6 + Math.random() * 2.0) * s,
        Math.sin(sAngle) * sRadius,
      );
      fShard.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      this._body.add(fShard);
    }
  }

  // ---- Minor Lightning Elemental builder ------------------------------------

  private _buildMinorLightningElemental(): void {
    const s = 0.6; // scale factor
    const coreMat = mat(0x4488ff, { emissive: 0x2266cc });
    const arcMat = mat(0x88ccff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const sparkMat = mat(0xeeeeff, { emissive: 0xeeeeff });
    const purpleMat = mat(0x6644cc, { emissive: 0x4422aa });
    const eyeMat = mat(0xffffff, { emissive: 0xeeeeff });
    const boltMat = mat(0x4488ff, { emissive: 0x2266cc, transparent: true, opacity: 0.85 });
    const legMat = mat(0x4488ff, { emissive: 0x2266cc, transparent: true, opacity: 0.8 });

    // ---- Core body ----
    const coreGeo = new THREE.SphereGeometry(0.5 * s, 22, 18);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4 * s;
    this._body.add(core);

    // Inner glow layer
    const innerGlowGeo = new THREE.SphereGeometry(0.4 * s, 18, 16);
    const innerGlow = new THREE.Mesh(innerGlowGeo, mat(0xaaddff, { emissive: 0x88ccff, transparent: true, opacity: 0.25 }));
    innerGlow.position.y = 2.4 * s;
    this._body.add(innerGlow);

    // Outer arcs — fewer (5 instead of 8)
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const tilt = Math.random() * Math.PI - Math.PI / 2;
      const arcGeo = cyl(0.012 * s, 0.012 * s, (0.3 + Math.random() * 0.2) * s, 12);
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.position.set(
        Math.cos(angle) * 0.45 * s,
        (2.3 + Math.random() * 0.3) * s,
        Math.sin(angle) * 0.45 * s,
      );
      arc.rotation.set(tilt, angle, Math.random() * Math.PI);
      this._body.add(arc);
    }

    // ---- Head ----
    this._head.position.set(0, 3.4 * s, 0.0);
    this._body.add(this._head);

    const crownBaseGeo = new THREE.SphereGeometry(0.22 * s, 18, 14);
    const crownBase = new THREE.Mesh(crownBaseGeo, coreMat);
    crownBase.scale.set(1, 0.6, 1);
    this._head.add(crownBase);

    // Crown spikes — fewer (4 instead of 6)
    for (let i = 0; i < 4; i++) {
      const csAngle = (i / 4) * Math.PI * 2;
      const spikeH = (0.15 + Math.random() * 0.1) * s;
      const spikeGeo = cyl(0.025 * s, 0.008 * s, spikeH, 12);
      const spike = new THREE.Mesh(spikeGeo, boltMat);
      spike.position.set(
        Math.cos(csAngle) * 0.18 * s,
        0.1 * s + spikeH / 2,
        Math.sin(csAngle) * 0.18 * s,
      );
      this._head.add(spike);

      const sparkTipGeo = new THREE.SphereGeometry(0.02 * s, 12, 12);
      const sparkTip = new THREE.Mesh(sparkTipGeo, sparkMat);
      sparkTip.position.set(
        Math.cos(csAngle) * 0.18 * s,
        0.1 * s + spikeH + 0.015 * s,
        Math.sin(csAngle) * 0.18 * s,
      );
      this._head.add(sparkTip);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.03 * s, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1 * s, -0.02 * s, 0.18 * s);
      this._head.add(eye);
    }

    // ---- Arms — simpler zigzag ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.55 * s, 2.8 * s, 0.0);
      this._body.add(arm);

      const shoulderGeo = new THREE.SphereGeometry(0.12 * s, 16, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, coreMat);
      arm.add(shoulder);

      // Two zigzag segments instead of three
      const seg1Geo = cyl(0.08 * s, 0.06 * s, 0.35 * s, 14);
      const seg1 = new THREE.Mesh(seg1Geo, boltMat);
      seg1.position.set(side * 0.06 * s, -0.2 * s, 0);
      seg1.rotation.z = side * 0.4;
      arm.add(seg1);

      const seg2Geo = cyl(0.06 * s, 0.04 * s, 0.35 * s, 14);
      const seg2 = new THREE.Mesh(seg2Geo, boltMat);
      seg2.position.set(side * -0.04 * s, -0.55 * s, 0);
      seg2.rotation.z = side * -0.4;
      arm.add(seg2);

      // Ball lightning hand
      const handGeo = new THREE.SphereGeometry(0.08 * s, 16, 16);
      const hand = new THREE.Mesh(handGeo, sparkMat);
      hand.position.y = -0.85 * s;
      arm.add(hand);
    }

    // ---- Legs ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25 * s, 1.4 * s, 0.0);
      this._body.add(leg);

      const upperLegGeo = cyl(0.14 * s, 0.18 * s, 0.5 * s, 14);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.25 * s;
      leg.add(upperLeg);

      const lowerLegGeo = cyl(0.18 * s, 0.24 * s, 0.45 * s, 14);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.65 * s;
      leg.add(lowerLeg);

      const poolGeo = new THREE.CylinderGeometry(0.26 * s, 0.28 * s, 0.04, 18);
      const pool = new THREE.Mesh(poolGeo, mat(0x4488ff, { emissive: 0x2266cc, transparent: true, opacity: 0.7 }));
      pool.position.y = -0.9 * s;
      leg.add(pool);
    }

    // ---- Floating sparks — fewer (6 instead of 10) ----
    for (let i = 0; i < 6; i++) {
      const sparkLen = (0.06 + Math.random() * 0.1) * s;
      const fSparkGeo = cyl(0.008 * s, 0.008 * s, sparkLen, 12);
      const isWhite = Math.random() > 0.5;
      const fSpark = new THREE.Mesh(fSparkGeo, isWhite ? sparkMat : purpleMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = (0.4 + Math.random() * 0.5) * s;
      fSpark.position.set(
        Math.cos(sAngle) * sRadius,
        (1.6 + Math.random() * 2.0) * s,
        Math.sin(sAngle) * sRadius,
      );
      fSpark.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      this._body.add(fSpark);
    }
  }

  // ---- Minor Distortion Elemental builder -----------------------------------

  private _buildMinorDistortionElemental(): void {
    const s = 0.6; // scale factor
    const coreMat = mat(0x1a0a2e, { emissive: 0x0a0518 });
    const shellMat = mat(0x3a1a5e, { transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const glowMat = mat(0x6622aa, { emissive: 0x6622aa });
    const eyeMat = mat(0xaa44ff, { emissive: 0xaa44ff });
    const smokeMat = mat(0x2a1a3e, { transparent: true, opacity: 0.4 });
    const shardMat = mat(0x1a0a2e, { emissive: 0x331166 });
    const tendrilMat = mat(0x2a1a3e, { transparent: true, opacity: 0.7 });
    const fadeMat = mat(0x2a1a3e, { transparent: true, opacity: 0.25 });
    const legMat = mat(0x1a0a2e, { emissive: 0x110822, transparent: true, opacity: 0.8 });

    // ---- Core body ----
    const coreGeo = new THREE.SphereGeometry(0.5 * s, 22, 18);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4 * s;
    this._body.add(core);

    // Inner void layer
    const innerVoidGeo = new THREE.SphereGeometry(0.35 * s, 18, 16);
    const innerVoid = new THREE.Mesh(innerVoidGeo, mat(0x0a0018, { emissive: 0x220044, transparent: true, opacity: 0.4 }));
    innerVoid.position.y = 2.4 * s;
    this._body.add(innerVoid);

    // Outer shell
    const shellGeo = new THREE.SphereGeometry(0.65 * s, 20, 16);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.y = 2.4 * s;
    shell.scale.set(1, 1.1, 1);
    this._body.add(shell);

    // Distortion ripple rings
    for (let i = 0; i < 2; i++) {
      const rippleGeo = new THREE.SphereGeometry((0.5 + i * 0.1) * s, 18, 14);
      const ripple = new THREE.Mesh(rippleGeo, mat(0x3a1a5e, { transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
      ripple.scale.set(1, 0.05, 1);
      ripple.position.y = 2.4 * s;
      this._body.add(ripple);
    }

    // ---- Void shards — fewer (5 instead of 8) ----
    for (let i = 0; i < 5; i++) {
      const size = (0.035 + Math.random() * 0.04) * s;
      const voidShardGeo = new THREE.BoxGeometry(size, size * 1.5, size);
      const voidShard = new THREE.Mesh(voidShardGeo, shardMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = (0.5 + Math.random() * 0.5) * s;
      voidShard.position.set(
        Math.cos(sAngle) * sRadius,
        (1.6 + Math.random() * 2.0) * s,
        Math.sin(sAngle) * sRadius,
      );
      voidShard.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      this._body.add(voidShard);
    }

    // ---- Head ----
    this._head.position.set(0, 3.4 * s, 0.0);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(0.24 * s, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, coreMat);
    headMesh.scale.set(1, 1.1, 0.9);
    this._head.add(headMesh);

    const haloGeo = new THREE.SphereGeometry(0.3 * s, 18, 14);
    const halo = new THREE.Mesh(haloGeo, smokeMat);
    halo.scale.set(1, 0.8, 1);
    this._head.add(halo);

    // Eye slits
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.BoxGeometry(0.05 * s, 0.015 * s, 0.015 * s);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.09 * s, 0.02 * s, 0.2 * s);
      this._head.add(eye);
    }

    // ---- Arms — simpler tendrils ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.55 * s, 2.8 * s, 0.0);
      this._body.add(arm);

      const shoulderGeo = new THREE.SphereGeometry(0.12 * s, 16, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, tendrilMat);
      arm.add(shoulder);

      const upperGeo = cyl(0.08 * s, 0.05 * s, 0.5 * s, 14);
      const upper = new THREE.Mesh(upperGeo, tendrilMat);
      upper.position.y = -0.3 * s;
      arm.add(upper);

      const tipGeo = cyl(0.04 * s, 0.015 * s, 0.35 * s, 12);
      const tip = new THREE.Mesh(tipGeo, fadeMat);
      tip.position.y = -0.7 * s;
      arm.add(tip);

      const glowTipGeo = new THREE.SphereGeometry(0.025 * s, 12, 12);
      const glowTip = new THREE.Mesh(glowTipGeo, glowMat);
      glowTip.position.y = -0.95 * s;
      arm.add(glowTip);
    }

    // ---- Legs ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25 * s, 1.4 * s, 0.0);
      this._body.add(leg);

      const upperLegGeo = cyl(0.14 * s, 0.18 * s, 0.5 * s, 14);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -0.25 * s;
      leg.add(upperLeg);

      const lowerLegGeo = cyl(0.18 * s, 0.24 * s, 0.45 * s, 14);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.65 * s;
      leg.add(lowerLeg);

      const poolGeo = new THREE.CylinderGeometry(0.26 * s, 0.28 * s, 0.04, 18);
      const pool = new THREE.Mesh(poolGeo, mat(0x1a0a2e, { emissive: 0x110822, transparent: true, opacity: 0.6 }));
      pool.position.y = -0.9 * s;
      leg.add(pool);
    }

    // Floating void chunks — fewer (3 instead of 4)
    for (let i = 0; i < 3; i++) {
      const chunkGeo = new THREE.SphereGeometry((0.04 + Math.random() * 0.03) * s, 14, 14);
      const chunk = new THREE.Mesh(chunkGeo, glowMat);
      const cAngle = Math.random() * Math.PI * 2;
      chunk.position.set(
        Math.cos(cAngle) * (0.5 + Math.random() * 0.3) * s,
        (2.0 + Math.random() * 1.0) * s,
        Math.sin(cAngle) * (0.5 + Math.random() * 0.3) * s,
      );
      this._body.add(chunk);
    }
  }

  // ---- Minor Earth Elemental builder ----------------------------------------

  private _buildMinorEarthElemental(): void {
    const s = 0.6; // scale factor
    const stoneMat = mat(0x6b6355, { roughness: 0.95 });
    const darkStoneMat = mat(0x4a4a3a, { roughness: 1.0 });
    const mossMat = mat(0x4a6b3a, { roughness: 0.9 });
    const crystalMat = mat(0x44cc66, { emissive: 0x44cc66, emissiveIntensity: 0.8, roughness: 0.3 });
    const eyeMat = mat(0x55dd77, { emissive: 0x55dd77, emissiveIntensity: 1.0 });

    // ---- Torso — stacked boulders (simpler) ----
    const mainTorsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const mainTorso = new THREE.Mesh(mainTorsoGeo, stoneMat);
    mainTorso.scale.set(0.7 * s, 0.85 * s, 0.55 * s);
    mainTorso.position.y = 2.5 * s;
    this._body.add(mainTorso);

    const upperChestGeo = new THREE.SphereGeometry(1, 18, 14);
    const upperChest = new THREE.Mesh(upperChestGeo, darkStoneMat);
    upperChest.scale.set(0.6 * s, 0.45 * s, 0.5 * s);
    upperChest.position.set(0, 3.1 * s, 0.1 * s);
    this._body.add(upperChest);

    const bellyGeo = new THREE.SphereGeometry(1, 18, 14);
    const belly = new THREE.Mesh(bellyGeo, darkStoneMat);
    belly.scale.set(0.55 * s, 0.45 * s, 0.45 * s);
    belly.position.set(0, 1.9 * s, 0.12 * s);
    this._body.add(belly);

    // Stone crack detail on torso
    for (let i = 0; i < 3; i++) {
      const crackGeo = cyl(0.008 * s, 0.004 * s, 0.25 * s, 12);
      const crack = new THREE.Mesh(crackGeo, darkStoneMat);
      crack.position.set(
        (-0.15 + i * 0.15) * s,
        (2.3 + i * 0.2) * s,
        0.35 * s,
      );
      crack.rotation.z = (Math.random() - 0.5) * 0.5;
      this._body.add(crack);
    }

    // Crystal veins — fewer (2 instead of 4)
    for (let i = 0; i < 2; i++) {
      const cvGeo = new THREE.SphereGeometry(0.035 + Math.random() * 0.025, 14, 14);
      const cv = new THREE.Mesh(cvGeo, crystalMat);
      cv.scale.set(1, 0.5 + Math.random() * 0.5, 0.6);
      cv.position.set(
        (-0.15 + Math.random() * 0.3) * s,
        (2.3 + Math.random() * 0.6) * s,
        0.35 * s,
      );
      this._body.add(cv);
    }

    // ---- Head ----
    this._head.position.set(0, 3.6 * s, 0.2 * s);
    this._body.add(this._head);

    const headGeo = new THREE.SphereGeometry(1, 18, 14);
    const headMesh = new THREE.Mesh(headGeo, stoneMat);
    headMesh.scale.set(0.3 * s, 0.32 * s, 0.28 * s);
    this._head.add(headMesh);

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(1, 16, 12);
    const brow = new THREE.Mesh(browGeo, darkStoneMat);
    brow.scale.set(0.33 * s, 0.1 * s, 0.15 * s);
    brow.position.set(0, 0.15 * s, 0.15 * s);
    this._head.add(brow);

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04 * s, 14, 14);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.12 * s, 0.08 * s, 0.24 * s);
      this._head.add(eye);
    }

    // ---- Arms — simpler stone limbs ----
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.75 * s, 3.2 * s, 0.0);
      this._body.add(arm);

      const shoulderGeo = new THREE.SphereGeometry(0.18 * s, 16, 14);
      const shoulder = new THREE.Mesh(shoulderGeo, stoneMat);
      arm.add(shoulder);

      const upperGeo = cyl(0.14 * s, 0.11 * s, 0.6 * s, 14);
      const upper = new THREE.Mesh(upperGeo, darkStoneMat);
      upper.position.y = -0.35 * s;
      arm.add(upper);

      const foreGeo = cyl(0.11 * s, 0.09 * s, 0.55 * s, 14);
      const fore = new THREE.Mesh(foreGeo, darkStoneMat);
      fore.position.y = -0.8 * s;
      arm.add(fore);

      const fistGeo = new THREE.SphereGeometry(0.14 * s, 16, 14);
      const fist = new THREE.Mesh(fistGeo, stoneMat);
      fist.position.y = -1.15 * s;
      arm.add(fist);
    }

    // ---- Legs — simpler stone pillars ----
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35 * s, 1.5 * s, 0.0);
      this._body.add(leg);

      const thighGeo = cyl(0.2 * s, 0.18 * s, 0.65 * s, 14);
      const thigh = new THREE.Mesh(thighGeo, stoneMat);
      thigh.position.y = -0.3 * s;
      leg.add(thigh);

      const shinGeo = cyl(0.18 * s, 0.14 * s, 0.55 * s, 14);
      const shin = new THREE.Mesh(shinGeo, stoneMat);
      shin.position.y = -0.8 * s;
      leg.add(shin);

      const footGeo = new THREE.SphereGeometry(1, 18, 12);
      const foot = new THREE.Mesh(footGeo, darkStoneMat);
      foot.scale.set(0.16 * s, 0.07 * s, 0.2 * s);
      foot.position.set(0, -1.12 * s, 0.05 * s);
      leg.add(foot);
    }

    // Moss patches — fewer (2 instead of 4)
    const mossPositions = [
      { x: 0.0, y: 3.0, z: -0.35 },
      { x: -0.25, y: 2.5, z: -0.28 },
    ];
    for (const pos of mossPositions) {
      const mGeo = new THREE.SphereGeometry((0.05 + Math.random() * 0.03) * s, 14, 12);
      const mMesh = new THREE.Mesh(mGeo, mossMat);
      mMesh.scale.set(1.3, 0.5, 1.1);
      mMesh.position.set(pos.x * s, pos.y * s, pos.z * s);
      this._body.add(mMesh);
    }

    // Rubble — fewer (3 instead of 5)
    for (let ri = 0; ri < 3; ri++) {
      const rubbleGeo = new THREE.SphereGeometry((0.03 + Math.random() * 0.04) * s, 14, 12);
      const rubble = new THREE.Mesh(rubbleGeo, darkStoneMat);
      rubble.position.set(
        (-0.3 + Math.random() * 0.6) * s,
        -0.02,
        (-0.2 + Math.random() * 0.4) * s,
      );
      this._body.add(rubble);
    }
  }

  // ---- Update --------------------------------------------------------------

  update(fighter: WarbandFighter, dt: number, camera: THREE.Camera): void {
    this.group.position.set(fighter.position.x, fighter.position.y, fighter.position.z);
    this.group.rotation.y = fighter.rotation;

    const isDead = fighter.combatState === FighterCombatState.DEAD;

    // Walk animation
    const isSiegeRam = this._creatureType === "battering_ram";
    const speed = Math.sqrt(fighter.velocity.x ** 2 + fighter.velocity.z ** 2);
    if (speed > 0.3 && !isDead) {
      fighter.walkCycle = (fighter.walkCycle + speed * 0.012 * dt * 60) % 1;
      const t = fighter.walkCycle * Math.PI * 2;
      const amp = Math.min(speed * 0.08, 0.4);

      this._leftLeg.rotation.x = Math.sin(t) * amp;
      this._rightLeg.rotation.x = -Math.sin(t) * amp;
      this._leftArm.rotation.x = -Math.sin(t) * amp * 0.6;
      if (!isSiegeRam) {
        this._rightArm.rotation.x = Math.sin(t) * amp * 0.6;
      }

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
      if (!isSiegeRam) {
        this._rightArm.rotation.x = 0;
      }
    }

    // Attack animation
    if (isSiegeRam) {
      // Battering ram: horizontal thrust along Z axis
      if (fighter.combatState === FighterCombatState.WINDING) {
        this._rightArm.position.z = -0.6; // pull ram back
      } else if (fighter.combatState === FighterCombatState.RELEASING) {
        this._rightArm.position.z = 0.8; // thrust ram forward
      } else if (fighter.combatState === FighterCombatState.RECOVERY) {
        this._rightArm.position.z *= 0.9; // ease back to center
      } else if (fighter.combatState === FighterCombatState.STAGGERED) {
        this._body.rotation.z = Math.sin(Date.now() * 0.01) * 0.15;
      }
    } else if (fighter.combatState === FighterCombatState.WINDING) {
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

  // ---- Bolt Thrower --------------------------------------------------------

  private _buildBoltThrowerSiege(): void {
    const woodMat = mat(0x5a3a18);
    const ironMat = mat(0x3a3a3a, { metalness: 0.7, roughness: 0.3 });
    const stringMat = mat(0x998866);
    const wheelMat = mat(0x3a2810);
    const rivetMat = mat(0x555555, { metalness: 0.6 });
    const ropeMat = mat(0x887755);

    // Base carriage — long and heavy
    const basGeo = new THREE.BoxGeometry(1.8, 0.3, 1.0);
    const bas = new THREE.Mesh(basGeo, woodMat);
    bas.position.set(0, 0.6, 0);
    this._body.add(bas);

    // Wood grain lines on base
    for (let i = 0; i < 5; i++) {
      const grainGeo = new THREE.BoxGeometry(1.78, 0.015, 0.008);
      const grain = new THREE.Mesh(grainGeo, mat(0x4a2a10));
      grain.position.set(0, 0.61, -0.4 + i * 0.2);
      this._body.add(grain);
    }

    // Iron reinforcement bands (4 bands along carriage length)
    for (let i = -1; i <= 1; i += 0.66) {
      const bandGeo = new THREE.BoxGeometry(0.04, 0.35, 1.05);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.position.set(i * 0.75, 0.6, 0);
      this._body.add(band);
      // Rivets on each band
      for (const zr of [-0.4, 0, 0.4]) {
        const rvGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const rv = new THREE.Mesh(rvGeo, rivetMat);
        rv.position.set(i * 0.75, 0.78, zr);
        this._body.add(rv);
      }
    }

    // Central trough / channel for bolt
    const troughGeo = new THREE.BoxGeometry(1.9, 0.1, 0.16);
    const trough = new THREE.Mesh(troughGeo, woodMat);
    trough.position.set(0, 0.84, 0);
    this._body.add(trough);

    // Iron channel lips
    for (const s of [-1, 1]) {
      const lipGeo = new THREE.BoxGeometry(1.9, 0.06, 0.025);
      const lip = new THREE.Mesh(lipGeo, ironMat);
      lip.position.set(0, 0.87, s * 0.09);
      this._body.add(lip);
    }

    // Double bow arms (two stacked crossbow arms)
    for (const yOff of [0.88, 1.05]) {
      for (const s of [-1, 1]) {
        const armGeo = new THREE.BoxGeometry(0.08, 0.06, 0.85);
        const arm = new THREE.Mesh(armGeo, woodMat);
        arm.position.set(0.55, yOff, s * 0.38);
        arm.rotation.z = s * 0.12;
        this._body.add(arm);
        // Iron arm tip caps
        const capGeo = new THREE.BoxGeometry(0.06, 0.1, 0.06);
        const cap = new THREE.Mesh(capGeo, ironMat);
        cap.position.set(0.55, yOff + 0.04, s * 0.76);
        this._body.add(cap);
      }
      // Bowstrings
      const strGeo = new THREE.CylinderGeometry(0.009, 0.009, 1.55, 12);
      const str = new THREE.Mesh(strGeo, stringMat);
      str.rotation.x = Math.PI / 2;
      str.position.set(0.55, yOff, 0);
      this._body.add(str);
    }

    // Rope wrapping at bow arm base
    for (let r = 0; r < 4; r++) {
      const ropeGeo = new THREE.TorusGeometry(0.06, 0.008, 8, 16);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(0.55, 0.86 + r * 0.05, 0);
      rope.rotation.x = Math.PI / 2;
      this._body.add(rope);
    }

    // Heavy bolt loaded in channel
    const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 14);
    const bolt = new THREE.Mesh(boltGeo, mat(0x5a4020));
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.1, 0.9, 0);
    this._body.add(bolt);
    const tipGeo = new THREE.ConeGeometry(0.06, 0.2, 12);
    const tip = new THREE.Mesh(tipGeo, ironMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(1.0, 0.9, 0);
    this._body.add(tip);
    // Bolt fletching
    for (const s of [-1, 1]) {
      const fletchGeo = new THREE.PlaneGeometry(0.08, 0.15);
      const fletch = new THREE.Mesh(fletchGeo, mat(0x884433, { side: THREE.DoubleSide }));
      fletch.position.set(-0.55, 0.9, s * 0.03);
      fletch.rotation.y = Math.PI / 2;
      this._body.add(fletch);
    }

    // Pivot post
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 14);
    const post = new THREE.Mesh(postGeo, ironMat);
    post.position.set(0.2, 0.72, 0);
    this._body.add(post);

    // Four wheels
    for (const xOff of [-0.7, 0.7]) {
      for (const zOff of [-0.55, 0.55]) {
        const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.09, 20);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(xOff, 0.28, zOff);
        this._body.add(wheel);
        // Iron rim
        const rimGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.04, 20);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(xOff, 0.28, zOff);
        this._body.add(rim);
        const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.12, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(xOff, 0.28, zOff);
        this._body.add(hub);
        // Spokes
        for (let sp = 0; sp < 6; sp++) {
          const spokeGeo = new THREE.BoxGeometry(0.03, 0.46, 0.03);
          const spoke = new THREE.Mesh(spokeGeo, wheelMat);
          spoke.rotation.z = (sp * Math.PI) / 6;
          spoke.position.set(xOff, 0.28, zOff + (zOff > 0 ? 0.05 : -0.05));
          this._body.add(spoke);
        }
      }
    }
  }

  // ---- Siege Catapult ------------------------------------------------------

  private _buildSiegeCatapult(): void {
    const woodMat = mat(0x5a3010, { roughness: 0.9 });
    const darkWoodMat = mat(0x3a2008, { roughness: 0.9 });
    const ironMat = mat(0x333333, { metalness: 0.55, roughness: 0.4 });
    const ropeMat = mat(0x998855);
    const boulderMat = mat(0x777777, { roughness: 0.95 });
    const wheelMat = mat(0x3a2010);
    const rivetMat = mat(0x555555, { metalness: 0.6 });

    // Wide reinforced base platform
    const baseGeo = new THREE.BoxGeometry(2.4, 0.25, 2.8);
    const base = new THREE.Mesh(baseGeo, woodMat);
    base.position.set(0, 0.55, 0);
    this._body.add(base);

    // Wood grain lines on base
    for (let i = 0; i < 6; i++) {
      const grainGeo = new THREE.BoxGeometry(2.38, 0.012, 0.008);
      const grain = new THREE.Mesh(grainGeo, mat(0x4a2008));
      grain.position.set(0, 0.56, -1.2 + i * 0.48);
      this._body.add(grain);
    }

    // Heavy cross-planks
    for (let i = -1; i <= 1; i++) {
      const plankGeo = new THREE.BoxGeometry(2.4, 0.1, 0.16);
      const plank = new THREE.Mesh(plankGeo, darkWoodMat);
      plank.position.set(0, 0.45, i * 1.0);
      this._body.add(plank);
    }

    // Vertical A-frame uprights (left and right, two pairs)
    for (const side of [-1, 1]) {
      for (const fb of [-0.4, 0.4]) {
        const upGeo = new THREE.BoxGeometry(0.18, 2.2, 0.18);
        const up = new THREE.Mesh(upGeo, darkWoodMat);
        up.position.set(side * 0.4, 1.75, fb);
        up.rotation.z = side * -0.04;
        this._body.add(up);
      }
      // Diagonal A-frame braces
      const diagGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
      const diag = new THREE.Mesh(diagGeo, woodMat);
      diag.position.set(side * 0.4, 1.3, 0);
      diag.rotation.x = 0.5;
      this._body.add(diag);
    }

    // Horizontal axle brace at top of frame
    const axleGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.2, 14);
    const axle = new THREE.Mesh(axleGeo, ironMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 2.85, 0);
    this._body.add(axle);

    // Cross-braces at mid height
    for (const s of [-1, 1]) {
      const braceGeo = new THREE.BoxGeometry(0.85, 0.12, 0.12);
      const brace = new THREE.Mesh(braceGeo, woodMat);
      brace.position.set(0, 1.6, s * 0.35);
      this._body.add(brace);
    }

    // Throwing arm (on _rightArm group)
    this._rightArm.position.set(0, 2.85, 0);
    this._body.add(this._rightArm);

    const armGeo = new THREE.BoxGeometry(0.15, 0.18, 3.8);
    const arm = new THREE.Mesh(armGeo, darkWoodMat);
    arm.position.set(0, 0, 0.4);
    this._rightArm.add(arm);

    // Iron bands on throwing arm
    for (const zz of [-0.6, 0, 0.6, 1.2]) {
      const abGeo = new THREE.BoxGeometry(0.17, 0.04, 0.19);
      const ab = new THREE.Mesh(abGeo, ironMat);
      ab.position.set(0, 0, zz);
      this._rightArm.add(ab);
    }

    // Counterweight box on short end
    const cwGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const cw = new THREE.Mesh(cwGeo, ironMat);
    cw.position.set(0, -0.35, -1.2);
    this._rightArm.add(cw);
    // Counterweight chain/rope
    for (let i = 0; i < 3; i++) {
      const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 12);
      const chain = new THREE.Mesh(chainGeo, ironMat);
      chain.position.set(0, -0.05 - i * 0.18, -1.2);
      this._rightArm.add(chain);
    }

    // Sling rope on long end
    const slingGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.7, 12);
    const sling = new THREE.Mesh(slingGeo, ropeMat);
    sling.position.set(0, -0.35, 2.3);
    this._rightArm.add(sling);

    // Boulder in sling cup
    const boulderGeo = new THREE.SphereGeometry(0.32, 16, 12);
    const boulder = new THREE.Mesh(boulderGeo, boulderMat);
    boulder.position.set(0, -0.9, 2.3);
    this._rightArm.add(boulder);
    // Boulder surface cracks
    for (let i = 0; i < 3; i++) {
      const crGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
      const cr = new THREE.Mesh(crGeo, mat(0x555555));
      const a = (i / 3) * Math.PI * 2;
      cr.position.set(Math.cos(a) * 0.28, -0.9 + Math.sin(a) * 0.1, 2.3 + Math.sin(a) * 0.28);
      this._rightArm.add(cr);
    }

    // Iron pivot brackets
    for (const s of [-1, 1]) {
      const bracketGeo = new THREE.BoxGeometry(0.05, 0.22, 0.14);
      const bracket = new THREE.Mesh(bracketGeo, ironMat);
      bracket.position.set(s * 0.4, 2.9, 0);
      this._body.add(bracket);
    }

    // Iron reinforcement bands on base
    for (const zOff of [-1.0, 0, 1.0]) {
      const bandGeo = new THREE.BoxGeometry(2.45, 0.07, 0.055);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.position.set(0, 0.67, zOff);
      this._body.add(band);
      // Rivets along bands
      for (const xr of [-0.9, -0.3, 0.3, 0.9]) {
        const rvGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const rv = new THREE.Mesh(rvGeo, rivetMat);
        rv.position.set(xr, 0.71, zOff);
        this._body.add(rv);
      }
    }

    // Six large wheels (3 axles)
    for (const zOff of [-1.1, 0, 1.1]) {
      for (const xOff of [-1.4, 1.4]) {
        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 20);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(xOff, 0.38, zOff);
        this._body.add(wheel);
        // Iron rim
        const rimGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.05, 20);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(xOff, 0.38, zOff);
        this._body.add(rim);
        // Spokes (6 planks)
        for (let s = 0; s < 6; s++) {
          const spokeGeo = new THREE.BoxGeometry(0.04, 0.65, 0.04);
          const spoke = new THREE.Mesh(spokeGeo, darkWoodMat);
          spoke.rotation.z = (s * Math.PI) / 6;
          spoke.position.set(xOff, 0.38, zOff + (xOff < 0 ? -0.06 : 0.06));
          this._body.add(spoke);
        }
        const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(xOff, 0.38, zOff);
        this._body.add(hub);
      }
    }
  }

  // ---- War Wagon -----------------------------------------------------------

  private _buildWarWagon(): void {
    const woodMat = mat(0x5a3810);
    const darkWoodMat = mat(0x3a2208);
    const ironMat = mat(0x3a3a3a, { metalness: 0.65, roughness: 0.35 });
    const wheelMat = mat(0x3a2810);
    const rivetMat = mat(0x555555, { metalness: 0.6 });

    // Main wagon body — tall armored box
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.4, 2.6);
    const body = new THREE.Mesh(bodyGeo, woodMat);
    body.position.set(0, 1.3, 0);
    this._body.add(body);

    // Iron plating on sides (overlapping bands)
    for (let y = 0.7; y <= 1.9; y += 0.35) {
      for (const s of [-1, 1]) {
        const plateGeo = new THREE.BoxGeometry(0.04, 0.3, 2.65);
        const plate = new THREE.Mesh(plateGeo, ironMat);
        plate.position.set(s * 0.92, y, 0);
        this._body.add(plate);
      }
    }
    // Iron plating on front/back
    for (let y = 0.7; y <= 1.9; y += 0.35) {
      for (const s of [-1, 1]) {
        const plateGeo = new THREE.BoxGeometry(1.85, 0.3, 0.04);
        const plate = new THREE.Mesh(plateGeo, ironMat);
        plate.position.set(0, y, s * 1.32);
        this._body.add(plate);
      }
    }

    // Rivets on iron plating
    for (const s of [-1, 1]) {
      for (let y = 0.8; y <= 1.8; y += 0.35) {
        for (const zr of [-1.0, -0.5, 0, 0.5, 1.0]) {
          const rvGeo = new THREE.SphereGeometry(0.016, 8, 8);
          const rv = new THREE.Mesh(rvGeo, rivetMat);
          rv.position.set(s * 0.94, y, zr);
          this._body.add(rv);
        }
      }
    }

    // Roof with slight overhang
    const roofGeo = new THREE.BoxGeometry(2.0, 0.14, 2.8);
    const roof = new THREE.Mesh(roofGeo, darkWoodMat);
    roof.position.set(0, 2.07, 0);
    this._body.add(roof);

    // Roof edge trim
    for (const s of [-1, 1]) {
      const trimZGeo = new THREE.BoxGeometry(2.02, 0.06, 0.04);
      const trimZ = new THREE.Mesh(trimZGeo, ironMat);
      trimZ.position.set(0, 2.1, s * 1.4);
      this._body.add(trimZ);
      const trimXGeo = new THREE.BoxGeometry(0.04, 0.06, 2.82);
      const trimX = new THREE.Mesh(trimXGeo, ironMat);
      trimX.position.set(s * 1.0, 2.1, 0);
      this._body.add(trimX);
    }

    // Bolt launcher protruding from front
    const launcherBaseGeo = new THREE.BoxGeometry(0.5, 0.3, 0.14);
    const launcherBase = new THREE.Mesh(launcherBaseGeo, ironMat);
    launcherBase.position.set(0, 1.2, 1.45);
    this._body.add(launcherBase);

    for (const xOff of [-0.15, 0.15]) {
      const barrelGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.7, 14);
      const barrel = new THREE.Mesh(barrelGeo, ironMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(xOff, 1.2, 1.82);
      this._body.add(barrel);
    }

    // Embrasure slits on sides (narrow iron-framed openings)
    for (const s of [-1, 1]) {
      for (const zOff of [-0.7, 0, 0.7]) {
        const slitGeo = new THREE.BoxGeometry(0.04, 0.12, 0.22);
        const slit = new THREE.Mesh(slitGeo, mat(0x111111));
        slit.position.set(s * 0.91, 1.3, zOff);
        this._body.add(slit);
        // Iron frame around slit
        const frameGeo = new THREE.BoxGeometry(0.045, 0.15, 0.25);
        const frame = new THREE.Mesh(frameGeo, ironMat);
        frame.position.set(s * 0.91, 1.3, zOff);
        this._body.add(frame);
      }
    }

    // Corner iron straps
    for (const xs of [-1, 1]) {
      for (const zs of [-1, 1]) {
        const strapGeo = new THREE.BoxGeometry(0.06, 1.5, 0.06);
        const strap = new THREE.Mesh(strapGeo, ironMat);
        strap.position.set(xs * 0.88, 1.3, zs * 1.27);
        this._body.add(strap);
      }
    }

    // Axles and four large wheels
    for (const zOff of [-1.0, 1.0]) {
      const axleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 14);
      const axle = new THREE.Mesh(axleGeo, ironMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, 0.42, zOff);
      this._body.add(axle);

      for (const xOff of [-1.15, 1.15]) {
        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 22);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(xOff, 0.42, zOff);
        this._body.add(wheel);
        // Iron rim
        const rimGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.05, 22);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(xOff, 0.42, zOff);
        this._body.add(rim);
        for (let s = 0; s < 8; s++) {
          const spokeGeo = new THREE.BoxGeometry(0.035, 0.76, 0.035);
          const spoke = new THREE.Mesh(spokeGeo, darkWoodMat);
          spoke.rotation.z = (s * Math.PI) / 8;
          spoke.position.set(xOff, 0.42, zOff + (xOff < 0 ? -0.07 : 0.07));
          this._body.add(spoke);
        }
        const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(xOff, 0.42, zOff);
        this._body.add(hub);
      }
    }
  }

  // ---- Bombard -------------------------------------------------------------

  private _buildBombard(): void {
    const bronzeMat = mat(0x7a5800, { metalness: 0.75, roughness: 0.28 });
    const woodMat = mat(0x5a3210);
    const ironMat = mat(0x2e2e2e, { metalness: 0.65, roughness: 0.35 });
    const wheelMat = mat(0x3a2010);
    const cannonballMat = mat(0x1a1a1a, { metalness: 0.4 });
    const rivetMat = mat(0x555555, { metalness: 0.6 });

    // Very wide, massive bronze barrel — fat and short
    const barrelGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.8, 22);
    const barrel = new THREE.Mesh(barrelGeo, bronzeMat);
    barrel.rotation.x = -Math.PI / 2;
    barrel.rotation.z = -0.18;
    barrel.position.set(0.3, 1.1, 0);
    this._body.add(barrel);

    // Muzzle ring (wide decorative iron band at muzzle)
    const muzzleGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.12, 22);
    const muzzle = new THREE.Mesh(muzzleGeo, ironMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(1.2, 1.1, 0);
    this._body.add(muzzle);

    // Decorative muzzle lip
    const lipGeo = new THREE.CylinderGeometry(0.54, 0.5, 0.06, 22);
    const lip = new THREE.Mesh(lipGeo, bronzeMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(1.24, 1.1, 0);
    this._body.add(lip);

    // Reinforcement rings along barrel (3 rings)
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.CylinderGeometry(0.52 - i * 0.04, 0.52 - i * 0.04, 0.09, 22);
      const ring = new THREE.Mesh(ringGeo, ironMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0.4 + i * 0.32, 1.05, 0);
      this._body.add(ring);
    }

    // Touch hole and priming pan on top
    const panGeo = new THREE.BoxGeometry(0.1, 0.06, 0.14);
    const pan = new THREE.Mesh(panGeo, ironMat);
    pan.position.set(-0.1, 1.55, 0);
    this._body.add(pan);
    // Fuse hole
    const fuseGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 12);
    const fuse = new THREE.Mesh(fuseGeo, mat(0x111111));
    fuse.position.set(-0.1, 1.59, 0);
    this._body.add(fuse);

    // Iron cascabel (knob at breech end)
    const cascGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const casc = new THREE.Mesh(cascGeo, bronzeMat);
    casc.position.set(-0.72, 1.05, 0);
    this._body.add(casc);

    // Massive wooden bed carriage
    const bedGeo = new THREE.BoxGeometry(2.0, 0.3, 1.0);
    const bed = new THREE.Mesh(bedGeo, woodMat);
    bed.position.set(0, 0.55, 0);
    this._body.add(bed);

    // Wood grain on bed
    for (let i = 0; i < 4; i++) {
      const grainGeo = new THREE.BoxGeometry(1.98, 0.012, 0.008);
      const grain = new THREE.Mesh(grainGeo, mat(0x4a2a08));
      grain.position.set(0, 0.56, -0.35 + i * 0.23);
      this._body.add(grain);
    }

    // Side cheeks of carriage (tall iron-banded walls)
    for (const s of [-1, 1]) {
      const cheekGeo = new THREE.BoxGeometry(1.9, 0.65, 0.1);
      const cheek = new THREE.Mesh(cheekGeo, woodMat);
      cheek.position.set(0, 0.88, s * 0.48);
      this._body.add(cheek);
      // Iron band on cheek
      const bandGeo = new THREE.BoxGeometry(1.92, 0.08, 0.04);
      const band = new THREE.Mesh(bandGeo, ironMat);
      band.position.set(0, 1.05, s * 0.49);
      this._body.add(band);
      // Rivets along cheek bands
      for (const xr of [-0.7, -0.3, 0.1, 0.5]) {
        const rvGeo = new THREE.SphereGeometry(0.016, 8, 8);
        const rv = new THREE.Mesh(rvGeo, rivetMat);
        rv.position.set(xr, 1.09, s * 0.5);
        this._body.add(rv);
      }
    }

    // Iron trunnion brackets holding barrel
    for (const s of [-1, 1]) {
      const trunGeo = new THREE.BoxGeometry(0.06, 0.4, 0.2);
      const trun = new THREE.Mesh(trunGeo, ironMat);
      trun.position.set(-0.1, 0.95, s * 0.45);
      this._body.add(trun);
    }

    // Cannonball stack beside carriage
    for (const [x, z] of [[-0.6, 0.7], [0, 0.72], [0.6, 0.7], [-0.3, 0.65]]) {
      const cbGeo = new THREE.SphereGeometry(0.16, 16, 12);
      const cb = new THREE.Mesh(cbGeo, cannonballMat);
      cb.position.set(x, 0.55, z);
      this._body.add(cb);
    }

    // Two very large wheels
    for (const s of [-1, 1]) {
      const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.14, 22);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0.52, s * 0.6);
      this._body.add(wheel);
      // Iron rim
      const rimGeo = new THREE.CylinderGeometry(0.53, 0.53, 0.06, 22);
      const rim = new THREE.Mesh(rimGeo, ironMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.52, s * 0.6);
      this._body.add(rim);
      for (let sp = 0; sp < 10; sp++) {
        const spokeGeo = new THREE.BoxGeometry(0.035, 0.9, 0.035);
        const spoke = new THREE.Mesh(spokeGeo, woodMat);
        spoke.rotation.z = (sp * Math.PI) / 10;
        spoke.position.set(0, 0.52, s * 0.6 + (s > 0 ? 0.08 : -0.08));
        this._body.add(spoke);
      }
      const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 14);
      const hub = new THREE.Mesh(hubGeo, ironMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(0, 0.52, s * 0.6);
      this._body.add(hub);
    }

    // Front trail spade
    const spadeGeo = new THREE.BoxGeometry(0.12, 0.3, 0.3);
    const spade = new THREE.Mesh(spadeGeo, ironMat);
    spade.position.set(-1.0, 0.38, 0);
    this._body.add(spade);
  }

  // ---- Siege Tower ---------------------------------------------------------

  private _buildSiegeTower(): void {
    const woodMat = mat(0x5a3a10, { roughness: 0.9 });
    const darkWoodMat = mat(0x3a2408, { roughness: 0.9 });
    const ironMat = mat(0x333333, { metalness: 0.55, roughness: 0.4 });
    const wheelMat = mat(0x3a2810);

    // ---- Massive base platform ----
    const basGeo = new THREE.BoxGeometry(2.6, 0.3, 2.6);
    const bas = new THREE.Mesh(basGeo, darkWoodMat);
    bas.position.set(0, 0.55, 0);
    this._body.add(bas);

    // Iron-shod base skirt
    for (const s of [-1, 1]) {
      const skirtXGeo = new THREE.BoxGeometry(2.65, 0.22, 0.07);
      const skirtX = new THREE.Mesh(skirtXGeo, ironMat);
      skirtX.position.set(0, 0.42, s * 1.32);
      this._body.add(skirtX);
      const skirtZGeo = new THREE.BoxGeometry(0.07, 0.22, 2.65);
      const skirtZ = new THREE.Mesh(skirtZGeo, ironMat);
      skirtZ.position.set(s * 1.32, 0.42, 0);
      this._body.add(skirtZ);
    }

    // Main tower body — 4 vertical corner posts running full height
    for (const xs of [-1, 1]) {
      for (const zs of [-1, 1]) {
        const postGeo = new THREE.BoxGeometry(0.22, 6.2, 0.22);
        const post = new THREE.Mesh(postGeo, darkWoodMat);
        post.position.set(xs * 1.1, 3.75, zs * 1.1);
        this._body.add(post);
      }
    }

    // Floor panels at 3 levels
    for (const yFloor of [1.0, 2.8, 4.6]) {
      const floorGeo = new THREE.BoxGeometry(2.2, 0.14, 2.2);
      const floor = new THREE.Mesh(floorGeo, woodMat);
      floor.position.set(0, yFloor, 0);
      this._body.add(floor);
    }

    // Wall panels (plank walls between floors, gaps for arrow slits)
    for (const [y, h] of [[1.9, 1.6], [3.7, 1.6]]) {
      for (const s of [-1, 1]) {
        // Side walls (z-facing)
        const wallGeo = new THREE.BoxGeometry(2.2, h, 0.12);
        const wall = new THREE.Mesh(wallGeo, woodMat);
        wall.position.set(0, y, s * 1.1);
        this._body.add(wall);
        // Arrow slits in side walls
        for (const xOff of [-0.55, 0, 0.55]) {
          const slitGeo = new THREE.BoxGeometry(0.12, 0.35, 0.14);
          const slit = new THREE.Mesh(slitGeo, mat(0x0a0a0a));
          slit.position.set(xOff, y, s * 1.1);
          this._body.add(slit);
        }
        // Front/back walls (x-facing)
        const wallXGeo = new THREE.BoxGeometry(0.12, h, 2.2);
        const wallX = new THREE.Mesh(wallXGeo, woodMat);
        wallX.position.set(s * 1.1, y, 0);
        this._body.add(wallX);
        for (const zOff of [-0.55, 0, 0.55]) {
          const slitXGeo = new THREE.BoxGeometry(0.14, 0.35, 0.12);
          const slitX = new THREE.Mesh(slitXGeo, mat(0x0a0a0a));
          slitX.position.set(s * 1.1, y, zOff);
          this._body.add(slitX);
        }
      }
    }

    // Iron cross-braces at mid height on exterior
    for (const ys of [-1, 1]) {
      const braceGeo = new THREE.BoxGeometry(2.4, 0.08, 0.07);
      const brace = new THREE.Mesh(braceGeo, ironMat);
      brace.position.set(0, 2.8 + ys * 0.8, 1.14);
      this._body.add(brace);
      const braceZGeo = new THREE.BoxGeometry(0.07, 0.08, 2.4);
      const braceZ = new THREE.Mesh(braceZGeo, ironMat);
      braceZ.position.set(1.14, 2.8 + ys * 0.8, 0);
      this._body.add(braceZ);
    }

    // Top battle platform with crenellations
    const topPlatGeo = new THREE.BoxGeometry(2.4, 0.16, 2.4);
    const topPlat = new THREE.Mesh(topPlatGeo, darkWoodMat);
    topPlat.position.set(0, 6.5, 0);
    this._body.add(topPlat);

    // Crenellations (merlons) around top
    for (let i = -1; i <= 1; i++) {
      for (const s of [-1, 1]) {
        const merlonXGeo = new THREE.BoxGeometry(0.35, 0.45, 0.18);
        const merlonX = new THREE.Mesh(merlonXGeo, darkWoodMat);
        merlonX.position.set(i * 0.7, 6.8, s * 1.12);
        this._body.add(merlonX);
        const merlonZGeo = new THREE.BoxGeometry(0.18, 0.45, 0.35);
        const merlonZ = new THREE.Mesh(merlonZGeo, darkWoodMat);
        merlonZ.position.set(s * 1.12, 6.8, i * 0.7);
        this._body.add(merlonZ);
      }
    }

    // Corner iron brackets at each floor level
    for (const yFloor of [1.0, 2.8, 4.6]) {
      for (const xs of [-1, 1]) {
        for (const zs of [-1, 1]) {
          const bracketGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
          const bracket = new THREE.Mesh(bracketGeo, ironMat);
          bracket.position.set(xs * 1.08, yFloor + 0.08, zs * 1.08);
          this._body.add(bracket);
        }
      }
    }

    // Iron-shod wheels (6 large wheels, 3 axles)
    for (const zOff of [-1.1, 0, 1.1]) {
      for (const xOff of [-1.45, 1.45]) {
        const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.14, 22);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(xOff, 0.45, zOff);
        this._body.add(wheel);
        // Iron rim
        const rimGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.06, 22);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(xOff, 0.45, zOff);
        this._body.add(rim);
        for (let sp = 0; sp < 8; sp++) {
          const spokeGeo = new THREE.BoxGeometry(0.035, 0.78, 0.035);
          const spoke = new THREE.Mesh(spokeGeo, darkWoodMat);
          spoke.rotation.z = (sp * Math.PI) / 8;
          spoke.position.set(xOff, 0.45, zOff + (xOff < 0 ? -0.08 : 0.08));
          this._body.add(spoke);
        }
        const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(xOff, 0.45, zOff);
        this._body.add(hub);
      }
    }
  }

  // ---- Hellfire Mortar -----------------------------------------------------

  private _buildHellfireMortar(): void {
    const ironMat = mat(0x2a2a2a, { metalness: 0.7, roughness: 0.3 });
    const hotIronMat = mat(0x8b3300, { metalness: 0.5, roughness: 0.4, emissive: 0x3a1000 });
    const woodMat = mat(0x4a2e0e);
    const wheelMat = mat(0x3a2010);
    const coalMat = mat(0x1a1010);

    // Low squat wheeled platform base
    const platGeo = new THREE.BoxGeometry(2.0, 0.25, 1.8);
    const plat = new THREE.Mesh(platGeo, woodMat);
    plat.position.set(0, 0.5, 0);
    this._body.add(plat);

    // Iron plating on base
    for (const s of [-1, 1]) {
      const plateGeo = new THREE.BoxGeometry(0.05, 0.3, 1.82);
      const plate = new THREE.Mesh(plateGeo, ironMat);
      plate.position.set(s * 1.0, 0.5, 0);
      this._body.add(plate);
    }

    // Mortar breech block — thick squat iron cylinder
    const breechGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.55, 22);
    const breech = new THREE.Mesh(breechGeo, ironMat);
    breech.position.set(0, 0.93, 0);
    this._body.add(breech);

    // Reinforcement bands on breech (2 rings)
    for (const yOff of [0.72, 1.08]) {
      const ringGeo = new THREE.CylinderGeometry(0.67, 0.67, 0.09, 22);
      const ring = new THREE.Mesh(ringGeo, ironMat);
      ring.position.set(0, yOff, 0);
      this._body.add(ring);
    }

    // Rivets on breech
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rvGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const rv = new THREE.Mesh(rvGeo, mat(0x444444, { metalness: 0.6 }));
      rv.position.set(Math.cos(a) * 0.56, 0.93, Math.sin(a) * 0.56);
      this._body.add(rv);
    }

    // Main mortar barrel — very wide, angled upward sharply
    const barrelGeo = new THREE.CylinderGeometry(0.38, 0.5, 0.9, 22);
    const barrel = new THREE.Mesh(barrelGeo, ironMat);
    barrel.rotation.x = -0.7;
    barrel.position.set(0, 1.45, -0.2);
    this._body.add(barrel);

    // Massive muzzle ring
    const muzzleGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.1, 22);
    const muzzle = new THREE.Mesh(muzzleGeo, hotIronMat);
    muzzle.rotation.x = -0.7;
    muzzle.position.set(0, 1.92, -0.52);
    this._body.add(muzzle);

    // Glowing interior (the mouth)
    const glowGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 18);
    const glow = new THREE.Mesh(glowGeo, mat(0xff4400, { emissive: 0xcc2200 }));
    glow.rotation.x = -0.7;
    glow.position.set(0, 1.95, -0.55);
    this._body.add(glow);

    // Iron trunnion pins on sides
    for (const s of [-1, 1]) {
      const trunGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8);
      const trun = new THREE.Mesh(trunGeo, ironMat);
      trun.rotation.z = Math.PI / 2;
      trun.position.set(s * 0.68, 1.2, 0);
      this._body.add(trun);
    }

    // Coal/ember pile under mortar on base
    for (let i = 0; i < 5; i++) {
      const coalGeo = new THREE.SphereGeometry(0.07 + Math.random() * 0.04, 10, 8);
      const coal = new THREE.Mesh(coalGeo, coalMat);
      coal.position.set((i - 2) * 0.12, 0.65, 0.3 + i * 0.04);
      this._body.add(coal);
    }
    // Glowing embers in coal pile
    for (let i = 0; i < 3; i++) {
      const embGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const emb = new THREE.Mesh(embGeo, mat(0xff4400, { emissive: 0xcc2200 }));
      emb.position.set((i - 1) * 0.14, 0.68, 0.32 + i * 0.03);
      this._body.add(emb);
    }

    // Rope/chain lashing on sides (iron loops)
    for (const s of [-1, 1]) {
      for (const yOff of [0.7, 1.0]) {
        const loopGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12);
        const loop = new THREE.Mesh(loopGeo, ironMat);
        loop.rotation.z = Math.PI / 2;
        loop.position.set(s * 0.55, yOff, 0.3);
        this._body.add(loop);
      }
    }

    // Four squat heavy wheels
    for (const xOff of [-0.95, 0.95]) {
      for (const zOff of [-0.75, 0.75]) {
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.14, 20);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(xOff, 0.35, zOff);
        this._body.add(wheel);
        const rimGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.06, 20);
        const rim = new THREE.Mesh(rimGeo, ironMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(xOff, 0.35, zOff);
        this._body.add(rim);
        // Spokes
        for (let sp = 0; sp < 6; sp++) {
          const spkGeo = new THREE.BoxGeometry(0.03, 0.58, 0.03);
          const spk = new THREE.Mesh(spkGeo, wheelMat);
          spk.rotation.z = (sp * Math.PI) / 6;
          spk.position.set(xOff, 0.35, zOff + (zOff > 0 ? 0.06 : -0.06));
          this._body.add(spk);
        }
        const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 14);
        const hub = new THREE.Mesh(hubGeo, ironMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(xOff, 0.35, zOff);
        this._body.add(hub);
      }
    }
  }

  // ---- Treant builder --------------------------------------------------------

  private _buildTreant(): void {
    const barkMat = mat(0x4a3520);
    const darkBarkMat = mat(0x2e2015);
    const leafMat = mat(0x2d6e1e, { emissive: 0x0a2208 });
    const eyeMat = mat(0x88cc44, { emissive: 0x446622 });
    const rootMat = mat(0x3a2a18);
    const lightLeafMat = mat(0x44882a, { emissive: 0x0c2a0a });
    const mossMat = mat(0x3a6828);

    // Trunk body
    const trunkGeo = cyl(0.35, 0.55, 2.5, 14);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.position.y = 1.8;
    this._body.add(trunk);

    // Bark texture ridges — vertical grooves
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ridgeGeo = new THREE.BoxGeometry(0.04, 2.3, 0.06);
      const ridge = new THREE.Mesh(ridgeGeo, darkBarkMat);
      ridge.position.set(Math.cos(a) * 0.42, 1.8, Math.sin(a) * 0.42);
      ridge.rotation.y = -a;
      this._body.add(ridge);
    }

    // Bark texture bumps (knotholes)
    for (let i = 0; i < 8; i++) {
      const bumpGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 10, 10);
      const bump = new THREE.Mesh(bumpGeo, darkBarkMat);
      const angle = Math.random() * Math.PI * 2;
      bump.position.set(Math.cos(angle) * 0.4, 1.0 + Math.random() * 2.0, Math.sin(angle) * 0.4);
      this._body.add(bump);
    }

    // Knothole details
    for (let i = 0; i < 3; i++) {
      const khGeo = new THREE.SphereGeometry(0.05, 10, 10);
      const kh = new THREE.Mesh(khGeo, mat(0x1a1008));
      const a = (i / 3) * Math.PI * 2 + 0.5;
      kh.position.set(Math.cos(a) * 0.44, 1.5 + i * 0.6, Math.sin(a) * 0.44);
      kh.scale.set(1, 1.3, 0.5);
      this._body.add(kh);
    }

    // Moss patches on trunk
    for (let i = 0; i < 4; i++) {
      const mGeo = new THREE.SphereGeometry(0.08, 10, 8);
      const moss = new THREE.Mesh(mGeo, mossMat);
      const a = Math.random() * Math.PI * 2;
      moss.position.set(Math.cos(a) * 0.43, 0.8 + Math.random() * 1.5, Math.sin(a) * 0.43);
      moss.scale.set(1.5, 0.5, 1.5);
      this._body.add(moss);
    }

    // Canopy / head — cluster of leaf spheres
    this._head.position.set(0, 3.4, 0);
    this._body.add(this._head);
    for (let i = 0; i < 5; i++) {
      const lGeo = new THREE.SphereGeometry(0.4 + Math.random() * 0.25, 16, 12);
      const leaf = new THREE.Mesh(lGeo, leafMat);
      leaf.position.set((Math.random() - 0.5) * 0.5, Math.random() * 0.4, (Math.random() - 0.5) * 0.5);
      this._head.add(leaf);
    }
    // Smaller leaf clusters for detail
    for (let i = 0; i < 4; i++) {
      const slGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 12, 10);
      const sl = new THREE.Mesh(slGeo, lightLeafMat);
      sl.position.set((Math.random() - 0.5) * 0.7, -0.1 + Math.random() * 0.6, (Math.random() - 0.5) * 0.7);
      this._head.add(sl);
    }

    // Eyes — glowing green knotholes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.15, 2.9, 0.35);
      this._body.add(eye);
      // Dark socket around eye
      const sockGeo = new THREE.SphereGeometry(0.08, 10, 10);
      const sock = new THREE.Mesh(sockGeo, mat(0x1a1008));
      sock.position.set(side * 0.15, 2.9, 0.33);
      sock.scale.set(1, 1.2, 0.5);
      this._body.add(sock);
    }

    // Branch arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.45, 2.6, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.1, 0.08, 1.0, 12);
      const upper = new THREE.Mesh(upperGeo, barkMat);
      upper.position.y = -0.5;
      upper.rotation.z = side * 0.3;
      arm.add(upper);
      const foreGeo = cyl(0.08, 0.05, 0.8, 12);
      const fore = new THREE.Mesh(foreGeo, barkMat);
      fore.position.set(side * 0.2, -1.1, 0);
      arm.add(fore);
      // Small branch offshoots
      const branchGeo = cyl(0.03, 0.015, 0.25, 8);
      const branch = new THREE.Mesh(branchGeo, darkBarkMat);
      branch.position.set(side * 0.1, -0.7, 0.05);
      branch.rotation.z = side * 0.6;
      arm.add(branch);
      // Twig fingers
      for (let t = 0; t < 3; t++) {
        const twigGeo = cyl(0.02, 0.01, 0.3, 8);
        const twig = new THREE.Mesh(twigGeo, darkBarkMat);
        twig.position.set(side * (0.25 + t * 0.05), -1.5 + t * 0.05, (t - 1) * 0.05);
        twig.rotation.z = side * (0.4 + t * 0.2);
        arm.add(twig);
      }
      // Small leaf cluster on arm
      const armLeafGeo = new THREE.SphereGeometry(0.12, 10, 8);
      const armLeaf = new THREE.Mesh(armLeafGeo, leafMat);
      armLeaf.position.set(side * 0.15, -0.3, 0.08);
      arm.add(armLeaf);
    }

    // Root legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 0.6, 0);
      this._body.add(leg);
      const rootGeo = cyl(0.15, 0.1, 0.8, 12);
      const root = new THREE.Mesh(rootGeo, rootMat);
      root.position.y = -0.4;
      leg.add(root);
      const footGeo = new THREE.SphereGeometry(0.15, 12, 10);
      const foot = new THREE.Mesh(footGeo, rootMat);
      foot.scale.set(1, 0.5, 1.3);
      foot.position.set(0, -0.85, 0.05);
      leg.add(foot);
      // Root tendrils
      for (let t = 0; t < 2; t++) {
        const tendrilGeo = cyl(0.025, 0.01, 0.3, 8);
        const tendril = new THREE.Mesh(tendrilGeo, rootMat);
        tendril.position.set((t - 0.5) * 0.08, -0.9, 0.08);
        tendril.rotation.x = -0.4;
        tendril.rotation.z = (t - 0.5) * 0.3;
        leg.add(tendril);
      }
    }
  }

  // ---- Siege Troll builder ---------------------------------------------------

  private _buildSiegeTroll(): void {
    const skinMat = mat(0x6a5b3a);
    const darkMat = mat(0x4a3a2a);
    const boneMat = mat(0xc8b890);
    const eyeMat = mat(0xcc4400, { emissive: 0x662200 });
    const rockMat = mat(0x666666);
    const scarMat = mat(0x5a4a30);

    // Barrel torso
    const torsoGeo = new THREE.SphereGeometry(1, 18, 14);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.65, 0.75, 0.55);
    torso.position.y = 2.4;
    this._body.add(torso);

    // Muscle definition on torso
    for (const s of [-1, 1]) {
      const muscGeo = new THREE.SphereGeometry(0.2, 12, 10);
      const musc = new THREE.Mesh(muscGeo, skinMat);
      musc.position.set(s * 0.3, 2.7, 0.25);
      musc.scale.set(1, 1.3, 0.6);
      this._body.add(musc);
    }

    // Belly
    const bellyGeo = new THREE.SphereGeometry(1, 16, 12);
    const belly = new THREE.Mesh(bellyGeo, darkMat);
    belly.scale.set(0.55, 0.55, 0.48);
    belly.position.set(0, 2.0, 0.18);
    this._body.add(belly);

    // Head
    this._head.position.set(0, 3.1, 0.25);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(1, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.25, 0.28, 0.26);
    this._head.add(headMesh);

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(0.12, 12, 8);
    const brow = new THREE.Mesh(browGeo, darkMat);
    brow.position.set(0, 0.12, 0.16);
    brow.scale.set(2.0, 0.5, 0.8);
    this._head.add(brow);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.12, 0.08, 0.2);
      this._head.add(eye);
    }

    // Tusks
    for (const side of [-1, 1]) {
      const tGeo = new THREE.ConeGeometry(0.03, 0.14, 10);
      const tusk = new THREE.Mesh(tGeo, boneMat);
      tusk.position.set(side * 0.12, -0.1, 0.2);
      tusk.rotation.x = -0.3;
      this._head.add(tusk);
    }

    // Scars on body
    for (let i = 0; i < 3; i++) {
      const scGeo = new THREE.BoxGeometry(0.02, 0.2, 0.01);
      const sc = new THREE.Mesh(scGeo, scarMat);
      sc.position.set(0.2, 2.3 + i * 0.25, 0.42);
      sc.rotation.z = 0.3;
      this._body.add(sc);
    }

    // Arms — massive
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.7, 2.7, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.18, 0.14, 0.8, 14);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.4;
      arm.add(upper);
      const foreGeo = cyl(0.14, 0.12, 0.7, 14);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -1.0;
      arm.add(fore);
      // Knuckle detail
      const fistGeo = new THREE.SphereGeometry(0.16, 12, 12);
      const fist = new THREE.Mesh(fistGeo, darkMat);
      fist.position.y = -1.4;
      arm.add(fist);
      for (let k = 0; k < 3; k++) {
        const knGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const kn = new THREE.Mesh(knGeo, darkMat);
        kn.position.set((k - 1) * 0.05, -1.38, 0.12);
        arm.add(kn);
      }
    }

    // Boulder in right hand
    const boulderGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const boulder = new THREE.Mesh(boulderGeo, rockMat);
    boulder.position.y = -1.8;
    this._rightArm.add(boulder);

    // Legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.32, 1.4, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.2, 0.16, 0.7, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.35;
      leg.add(thigh);
      const shinGeo = cyl(0.16, 0.12, 0.6, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.85;
      leg.add(shin);
      const footGeo = new THREE.SphereGeometry(1, 12, 10);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.scale.set(0.15, 0.08, 0.2);
      foot.position.set(0, -1.2, 0.06);
      leg.add(foot);
      // Toenails
      for (let t = -1; t <= 1; t++) {
        const tnGeo = new THREE.ConeGeometry(0.015, 0.04, 8);
        const tn = new THREE.Mesh(tnGeo, boneMat);
        tn.position.set(t * 0.04, -1.22, 0.14);
        tn.rotation.x = Math.PI / 2;
        leg.add(tn);
      }
    }
  }

  // ---- Mana Wraith builder ---------------------------------------------------

  private _buildManaWraith(): void {
    const ghostMat = mat(0x6644aa, { transparent: true, opacity: 0.6, emissive: 0x332266 });
    const coreMat = mat(0xaa88ff, { emissive: 0x6644cc });
    const eyeMat = mat(0xeeddff, { emissive: 0xaa88ff });
    const wispMat = mat(0x8866cc, { transparent: true, opacity: 0.35, emissive: 0x443366 });

    // Spectral body — tapered column
    const bodyGeo = cyl(0.15, 0.4, 2.0, 16);
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 1.2;
    this._body.add(body);

    // Ethereal wisps around body
    for (let i = 0; i < 4; i++) {
      const wGeo = cyl(0.03, 0.01, 0.4, 8);
      const wisp = new THREE.Mesh(wGeo, wispMat);
      const a = (i / 4) * Math.PI * 2;
      wisp.position.set(Math.cos(a) * 0.3, 1.0 + i * 0.3, Math.sin(a) * 0.3);
      wisp.rotation.z = (i - 2) * 0.3;
      this._body.add(wisp);
    }

    // Core orb
    const coreGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.8;
    this._body.add(core);

    // Core inner glow
    const innerGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const inner = new THREE.Mesh(innerGeo, mat(0xddbbff, { emissive: 0xaa88ff }));
    inner.position.y = 1.8;
    this._body.add(inner);

    // Head — hooded shape
    this._head.position.set(0, 2.4, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.22, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, ghostMat);
    this._head.add(headMesh);

    // Hood
    const hoodGeo = new THREE.ConeGeometry(0.28, 0.3, 14);
    const hood = new THREE.Mesh(hoodGeo, ghostMat);
    hood.position.y = 0.15;
    this._head.add(hood);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.08, 0, 0.18);
      this._head.add(eye);
    }

    // Spectral arms — wispy
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.3, 2.0, 0);
      this._body.add(arm);
      const armGeo = cyl(0.06, 0.03, 0.9, 12);
      const armMesh = new THREE.Mesh(armGeo, ghostMat);
      armMesh.position.y = -0.45;
      arm.add(armMesh);
      // Wispy fingers
      for (let t = 0; t < 3; t++) {
        const fGeo = cyl(0.015, 0.005, 0.2, 8);
        const finger = new THREE.Mesh(fGeo, ghostMat);
        finger.position.set((t - 1) * 0.03, -0.95, 0);
        finger.rotation.z = (t - 1) * 0.2;
        arm.add(finger);
      }
    }

    // Trailing tail instead of legs
    this._leftLeg.position.set(-0.1, 0.3, 0);
    this._body.add(this._leftLeg);
    this._rightLeg.position.set(0.1, 0.3, 0);
    this._body.add(this._rightLeg);
    const tailGeo = cyl(0.25, 0.02, 0.6, 12);
    const tail = new THREE.Mesh(tailGeo, ghostMat);
    tail.position.y = -0.1;
    this._leftLeg.add(tail);

    // Floating rune particles
    for (let i = 0; i < 6; i++) {
      const pGeo = new THREE.SphereGeometry(0.03, 10, 10);
      const p = new THREE.Mesh(pGeo, coreMat);
      const a = (i / 6) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.5, 1.5 + Math.sin(a) * 0.3, Math.sin(a) * 0.5);
      this._body.add(p);
    }
  }

  // ---- Elemental Avatar builder ----------------------------------------------

  private _buildElementalAvatar(): void {
    const fireMat = mat(0xff4400, { emissive: 0xcc2200 });
    const coreMat = mat(0xffaa00, { emissive: 0xff6600 });
    const darkMat = mat(0x661100, { emissive: 0x330800 });
    const eyeMat = mat(0xffffaa, { emissive: 0xffff88 });

    // Massive fire core body
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, fireMat);
    torso.scale.set(0.7, 0.9, 0.6);
    torso.position.y = 2.8;
    this._body.add(torso);

    // Inner core glow
    const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.8;
    this._body.add(core);

    // Swirling flame tendrils on torso
    for (let i = 0; i < 4; i++) {
      const tGeo = cyl(0.06, 0.02, 0.6, 10);
      const tendril = new THREE.Mesh(tGeo, coreMat);
      const a = (i / 4) * Math.PI * 2;
      tendril.position.set(Math.cos(a) * 0.5, 2.5 + i * 0.2, Math.sin(a) * 0.4);
      tendril.rotation.z = (i - 2) * 0.4;
      this._body.add(tendril);
    }

    // Head — flame crown
    this._head.position.set(0, 3.8, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, fireMat);
    this._head.add(headMesh);

    // Crown flames
    for (let i = 0; i < 8; i++) {
      const fGeo = new THREE.ConeGeometry(0.07, 0.3 + Math.random() * 0.15, 10);
      const flame = new THREE.Mesh(fGeo, coreMat);
      const a = (i / 8) * Math.PI * 2;
      flame.position.set(Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2);
      flame.rotation.z = Math.cos(a) * 0.3;
      this._head.add(flame);
    }

    // Eyes — blazing white
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.12, 0.0, 0.25);
      this._head.add(eye);
    }

    // Massive flame arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.75, 3.2, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.18, 0.14, 1.0, 14);
      const upper = new THREE.Mesh(upperGeo, fireMat);
      upper.position.y = -0.5;
      arm.add(upper);
      const foreGeo = cyl(0.14, 0.1, 0.9, 14);
      const fore = new THREE.Mesh(foreGeo, darkMat);
      fore.position.y = -1.2;
      arm.add(fore);
      // Flame fists
      const fistGeo = new THREE.SphereGeometry(0.18, 14, 12);
      const fist = new THREE.Mesh(fistGeo, coreMat);
      fist.position.y = -1.7;
      arm.add(fist);
      // Flame licks on arms
      for (let fi = 0; fi < 2; fi++) {
        const flGeo = new THREE.ConeGeometry(0.04, 0.18, 8);
        const fl = new THREE.Mesh(flGeo, coreMat);
        fl.position.set(side * 0.08, -0.6 - fi * 0.5, 0.1);
        arm.add(fl);
      }
    }

    // Legs — molten columns
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 1.5, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.2, 0.16, 0.8, 14);
      const thigh = new THREE.Mesh(thighGeo, fireMat);
      thigh.position.y = -0.4;
      leg.add(thigh);
      const shinGeo = cyl(0.16, 0.2, 0.7, 14);
      const shin = new THREE.Mesh(shinGeo, darkMat);
      shin.position.y = -1.0;
      leg.add(shin);
    }

    // Floating embers
    for (let i = 0; i < 8; i++) {
      const eGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const ember = new THREE.Mesh(eGeo, coreMat);
      ember.position.set((Math.random() - 0.5) * 1.2, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.0);
      this._body.add(ember);
    }
  }

  // ---- Storm Conduit builder -------------------------------------------------

  private _buildStormConduit(): void {
    const boltMat = mat(0x4488ff, { emissive: 0x2266dd });
    const coreMat = mat(0xaaccff, { emissive: 0x88aaff });
    const darkMat = mat(0x222244, { emissive: 0x111133 });
    const sparkMat = mat(0xeeeeff, { emissive: 0xeeeeff });
    const arcMat = mat(0x6699ff, { emissive: 0x4477dd, transparent: true, opacity: 0.6 });

    // Crackling energy body
    const torsoGeo = cyl(0.25, 0.35, 2.2, 16);
    const torso = new THREE.Mesh(torsoGeo, boltMat);
    torso.position.y = 2.2;
    this._body.add(torso);

    // Energy arcs spiraling around body
    for (let i = 0; i < 3; i++) {
      const arcGeo = new THREE.TorusGeometry(0.35, 0.015, 8, 20);
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.position.y = 1.5 + i * 0.6;
      arc.rotation.x = Math.PI / 2 + i * 0.3;
      arc.rotation.z = i * 0.5;
      this._body.add(arc);
    }

    // Core
    const coreGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    this._body.add(core);

    // Head — crackling sphere
    this._head.position.set(0, 3.3, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.25, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, boltMat);
    this._head.add(headMesh);

    // Lightning horns
    for (const side of [-1, 1]) {
      const hGeo = cyl(0.03, 0.01, 0.4, 10);
      const horn = new THREE.Mesh(hGeo, sparkMat);
      horn.position.set(side * 0.15, 0.25, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const eye = new THREE.Mesh(eGeo, sparkMat);
      eye.position.set(side * 0.1, 0, 0.2);
      this._head.add(eye);
    }

    // Arc arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.4, 2.8, 0);
      this._body.add(arm);
      const aGeo = cyl(0.08, 0.05, 0.9, 12);
      const armMesh = new THREE.Mesh(aGeo, boltMat);
      armMesh.position.y = -0.45;
      arm.add(armMesh);
      const orbGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const orb = new THREE.Mesh(orbGeo, sparkMat);
      orb.position.y = -1.0;
      arm.add(orb);
      // Lightning bolt from hand
      const lbGeo = cyl(0.015, 0.008, 0.25, 6);
      const lb = new THREE.Mesh(lbGeo, sparkMat);
      lb.position.set(0, -1.15, 0.05);
      lb.rotation.z = side * 0.3;
      arm.add(lb);
    }

    // Energy legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.2, 1.0, 0);
      this._body.add(leg);
      const lGeo = cyl(0.1, 0.08, 0.8, 12);
      const legMesh = new THREE.Mesh(lGeo, darkMat);
      legMesh.position.y = -0.4;
      leg.add(legMesh);
    }

    // Floating sparks
    for (let i = 0; i < 10; i++) {
      const sGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const spark = new THREE.Mesh(sGeo, sparkMat);
      spark.position.set((Math.random() - 0.5) * 1.0, 1.0 + Math.random() * 2.5, (Math.random() - 0.5) * 1.0);
      this._body.add(spark);
    }
  }

  // ---- War Golem builder -----------------------------------------------------

  private _buildWarGolem(): void {
    const stoneMat = mat(0x6a6a5a, { metalness: 0.2 });
    const darkStoneMat = mat(0x4a4a3a);
    const runeMat = mat(0x44aaff, { emissive: 0x2266cc });
    const eyeMat = mat(0x44ccff, { emissive: 0x2288aa });
    const crackMat = mat(0x3a3a2a);

    // Massive rounded torso
    const torsoGeo = cyl(0.5, 0.45, 1.5, 16);
    const torso = new THREE.Mesh(torsoGeo, stoneMat);
    torso.position.y = 2.8;
    torso.scale.set(1.0, 1.0, 0.8);
    this._body.add(torso);

    // Stone crack lines on torso
    for (let i = 0; i < 3; i++) {
      const clGeo = new THREE.BoxGeometry(0.015, 0.4 + Math.random() * 0.3, 0.01);
      const cl = new THREE.Mesh(clGeo, crackMat);
      cl.position.set(-0.3 + i * 0.3, 2.5 + Math.random() * 0.5, 0.42);
      cl.rotation.z = (Math.random() - 0.5) * 0.4;
      this._body.add(cl);
    }

    // Rune on chest
    const runeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.02);
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.position.set(0, 2.8, 0.42);
    this._body.add(rune);

    // Rune engraving lines around chest rune
    const runeFrameGeo = new THREE.BoxGeometry(0.24, 0.24, 0.015);
    const runeFrame = new THREE.Mesh(runeFrameGeo, runeMat);
    runeFrame.position.set(0, 2.8, 0.42);
    this._body.add(runeFrame);

    // Head — carved stone
    this._head.position.set(0, 3.8, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.22, 14, 12);
    const headMesh = new THREE.Mesh(headGeo, stoneMat);
    headMesh.scale.set(0.9, 0.8, 0.8);
    this._head.add(headMesh);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.1, 0.02, 0.18);
      this._head.add(eye);
    }

    // Massive arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.6, 3.2, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.13, 0.11, 0.9, 12);
      const upper = new THREE.Mesh(upperGeo, stoneMat);
      upper.position.y = -0.45;
      arm.add(upper);
      const foreGeo = cyl(0.12, 0.14, 0.8, 12);
      const fore = new THREE.Mesh(foreGeo, darkStoneMat);
      fore.position.y = -1.2;
      arm.add(fore);
      // Joint detail
      const jGeo = new THREE.SphereGeometry(0.14, 12, 10);
      const j = new THREE.Mesh(jGeo, darkStoneMat);
      j.position.y = -0.85;
      arm.add(j);
      const fistGeo = new THREE.SphereGeometry(0.2, 14, 12);
      const fist = new THREE.Mesh(fistGeo, stoneMat);
      fist.position.y = -1.7;
      arm.add(fist);
    }

    // Legs — stone pillars
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 1.8, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.13, 0.11, 0.8, 12);
      const thigh = new THREE.Mesh(thighGeo, stoneMat);
      thigh.position.y = -0.4;
      leg.add(thigh);
      // Knee joint detail
      const knGeo = new THREE.SphereGeometry(0.13, 12, 10);
      const kn = new THREE.Mesh(knGeo, darkStoneMat);
      kn.position.y = -0.8;
      leg.add(kn);
      const shinGeo = cyl(0.12, 0.14, 0.75, 12);
      const shin = new THREE.Mesh(shinGeo, darkStoneMat);
      shin.position.y = -1.05;
      leg.add(shin);
      const footGeo = new THREE.SphereGeometry(0.2, 12, 10);
      const foot = new THREE.Mesh(footGeo, stoneMat);
      foot.scale.set(0.8, 0.38, 1.0);
      foot.position.set(0, -1.48, 0.04);
      leg.add(foot);
    }

    // Rune accents on body
    for (let i = 0; i < 6; i++) {
      const rGeo = new THREE.SphereGeometry(0.04, 10, 10);
      const r = new THREE.Mesh(rGeo, runeMat);
      r.position.set((Math.random() - 0.5) * 0.7, 2.2 + i * 0.25, (Math.random() > 0.5 ? 0.42 : -0.42));
      this._body.add(r);
    }
  }

  // ---- Rune Core builder -----------------------------------------------------

  private _buildRuneCore(): void {
    const shellMat = mat(0x5555aa, { transparent: true, opacity: 0.7, emissive: 0x222255 });
    const coreMat = mat(0xaa88ff, { emissive: 0x8866dd });
    const runeMat = mat(0xddbbff, { emissive: 0xaa88ff });
    const ringMat = mat(0x6666aa, { transparent: true, opacity: 0.5 });

    // Central orb
    const orbGeo = new THREE.SphereGeometry(0.4, 20, 16);
    const orb = new THREE.Mesh(orbGeo, coreMat);
    orb.position.y = 1.5;
    this._body.add(orb);

    // Inner glow pulse
    const innerGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const innerGlow = new THREE.Mesh(innerGeo, mat(0xddbbff, { emissive: 0xccaaff }));
    innerGlow.position.y = 1.5;
    this._body.add(innerGlow);

    // Outer shell — icosahedron
    const shellGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.y = 1.5;
    this._body.add(shell);

    // Orbiting rune rings
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(0.7 + r * 0.15, 0.018, 12, 24);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 1.5;
      ring.rotation.x = r * Math.PI / 3;
      ring.rotation.y = r * Math.PI / 4;
      this._body.add(ring);
    }

    // Floating rune nodes
    for (let i = 0; i < 8; i++) {
      const nGeo = new THREE.SphereGeometry(0.04, 10, 10);
      const node = new THREE.Mesh(nGeo, runeMat);
      const a = (i / 8) * Math.PI * 2;
      node.position.set(Math.cos(a) * 0.65, 1.5 + Math.sin(a * 2) * 0.3, Math.sin(a) * 0.65);
      this._body.add(node);
    }

    // Head group — top of orb (for animation compatibility)
    this._head.position.set(0, 2.1, 0);
    this._body.add(this._head);
    const crownGeo = new THREE.ConeGeometry(0.15, 0.2, 12);
    const crown = new THREE.Mesh(crownGeo, coreMat);
    this._head.add(crown);

    // Arms — energy tendrils
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.5, 1.5, 0);
      this._body.add(arm);
      const tGeo = cyl(0.04, 0.02, 0.6, 10);
      const tendril = new THREE.Mesh(tGeo, runeMat);
      tendril.position.y = -0.3;
      tendril.rotation.z = side * 0.3;
      arm.add(tendril);
      // Energy tip
      const tipGeo = new THREE.SphereGeometry(0.035, 10, 10);
      const tip = new THREE.Mesh(tipGeo, coreMat);
      tip.position.set(side * 0.15, -0.55, 0);
      arm.add(tip);
    }

    // Legs — energy pillars (minimal)
    this._leftLeg.position.set(-0.15, 0.6, 0);
    this._body.add(this._leftLeg);
    this._rightLeg.position.set(0.15, 0.6, 0);
    this._body.add(this._rightLeg);
    const pillarGeo = cyl(0.06, 0.04, 0.5, 10);
    const pillar = new THREE.Mesh(pillarGeo, shellMat);
    pillar.position.y = -0.15;
    this._leftLeg.add(pillar);
    const pillar2Geo = cyl(0.06, 0.04, 0.5, 10);
    const pillar2 = new THREE.Mesh(pillar2Geo, shellMat);
    pillar2.position.y = -0.15;
    this._rightLeg.add(pillar2);
  }

  // ---- Siege Automaton builder -----------------------------------------------

  private _buildSiegeAutomaton(): void {
    const ironMat = mat(0x555566, { metalness: 0.7, roughness: 0.3 });
    const darkIronMat = mat(0x333344, { metalness: 0.6 });
    const brassMAT = mat(0xaa8833, { metalness: 0.5 });
    const eyeMat = mat(0xff4400, { emissive: 0xcc2200 });
    const pipeMat = mat(0x444444, { metalness: 0.5 });

    // Massive iron torso
    const torsoGeo = cyl(0.6, 0.55, 1.8, 16);
    const torso = new THREE.Mesh(torsoGeo, ironMat);
    torso.position.y = 3.5;
    torso.scale.set(1.0, 1.0, 0.75);
    this._body.add(torso);

    // Boiler on back
    const boilerGeo = cyl(0.35, 0.35, 1.0, 16);
    const boiler = new THREE.Mesh(boilerGeo, darkIronMat);
    boiler.position.set(0, 3.8, -0.5);
    this._body.add(boiler);

    // Boiler rivets
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rvGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const rv = new THREE.Mesh(rvGeo, brassMAT);
      rv.position.set(Math.cos(a) * 0.36, 3.5, -0.5 + Math.sin(a) * 0.36);
      this._body.add(rv);
    }

    // Smokestack
    const stackGeo = cyl(0.08, 0.06, 0.6, 12);
    const stack = new THREE.Mesh(stackGeo, pipeMat);
    stack.position.set(0, 4.5, -0.5);
    this._body.add(stack);
    // Smokestack cap
    const capGeo = cyl(0.1, 0.08, 0.06, 12);
    const cap = new THREE.Mesh(capGeo, pipeMat);
    cap.position.set(0, 4.82, -0.5);
    this._body.add(cap);

    // Head — mechanical
    this._head.position.set(0, 4.7, 0.1);
    this._body.add(this._head);
    const headGeo = cyl(0.2, 0.18, 0.3, 14);
    const headMesh = new THREE.Mesh(headGeo, ironMat);
    headMesh.scale.set(1.0, 1.0, 0.88);
    this._head.add(headMesh);

    // Eyes — glowing vents
    for (const side of [-1, 1]) {
      const eGeo = cyl(0.02, 0.02, 0.08, 8);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.1, 0.02, 0.18);
      eye.rotation.y = Math.PI / 2;
      this._head.add(eye);
    }

    // Arms — pistons
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.7, 3.8, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.14, 0.12, 1.1, 14);
      const upper = new THREE.Mesh(upperGeo, ironMat);
      upper.position.y = -0.55;
      arm.add(upper);
      const pistonGeo = cyl(0.08, 0.08, 0.3, 12);
      const piston = new THREE.Mesh(pistonGeo, brassMAT);
      piston.position.y = -0.9;
      arm.add(piston);
      const foreGeo = cyl(0.12, 0.15, 1.0, 14);
      const fore = new THREE.Mesh(foreGeo, darkIronMat);
      fore.position.y = -1.5;
      arm.add(fore);
      const fistGeo = new THREE.SphereGeometry(0.2, 14, 12);
      const fist = new THREE.Mesh(fistGeo, ironMat);
      fist.position.y = -2.1;
      arm.add(fist);
      // Pipe detail on arm
      const pipeGeo = cyl(0.025, 0.025, 0.6, 10);
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(side * 0.1, -0.8, 0.08);
      arm.add(pipe);
    }

    // Legs — mechanical pillars
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 2.3, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.15, 0.12, 1.0, 14);
      const thigh = new THREE.Mesh(thighGeo, ironMat);
      thigh.position.y = -0.5;
      leg.add(thigh);
      const kneeGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const knee = new THREE.Mesh(kneeGeo, brassMAT);
      knee.position.y = -1.0;
      leg.add(knee);
      const shinGeo = cyl(0.12, 0.14, 0.9, 14);
      const shin = new THREE.Mesh(shinGeo, darkIronMat);
      shin.position.y = -1.6;
      leg.add(shin);
      // Piston on shin
      const spGeo = cyl(0.03, 0.03, 0.4, 8);
      const sp = new THREE.Mesh(spGeo, brassMAT);
      sp.position.set(side * 0.08, -1.4, 0.1);
      leg.add(sp);
      const footGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const foot = new THREE.Mesh(footGeo, ironMat);
      foot.scale.set(0.85, 0.35, 1.0);
      foot.position.set(0, -2.1, 0.04);
      leg.add(foot);
    }

    // Gears/rivets detail
    for (let i = 0; i < 8; i++) {
      const gGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const gear = new THREE.Mesh(gGeo, brassMAT);
      gear.position.set((Math.random() - 0.5) * 0.8, 2.8 + Math.random() * 1.2, 0.47);
      this._body.add(gear);
    }
    // Gear wheels on torso sides
    for (const s of [-1, 1]) {
      const gwGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 12);
      const gw = new THREE.Mesh(gwGeo, brassMAT);
      gw.position.set(s * 0.62, 3.3, 0);
      gw.rotation.y = Math.PI / 2;
      this._body.add(gw);
    }
  }

  // ---- Crystal Golem builder -------------------------------------------------

  private _buildCrystalGolem(): void {
    const crystalMat = mat(0x88aadd, { transparent: true, opacity: 0.75, emissive: 0x334466 });
    const darkCrystalMat = mat(0x5577aa, { transparent: true, opacity: 0.8, emissive: 0x223344 });
    const amethystMat = mat(0x9966cc, { transparent: true, opacity: 0.7, emissive: 0x442266 });
    const roseMat = mat(0xcc8899, { transparent: true, opacity: 0.65, emissive: 0x664444 });
    const coreMat = mat(0xaaddff, { emissive: 0x6699cc });
    const sparkMat = mat(0xeeeeff, { emissive: 0xccddff });
    const veinMat = mat(0xbbddff, { emissive: 0x88aadd, transparent: true, opacity: 0.5 });
    const internalMat = mat(0x6699cc, { transparent: true, opacity: 0.4, emissive: 0x445577 });

    // --- Torso (geode-like chest with visible interior) ---
    // Main crystalline body — faceted dodecahedron
    const torsoGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const torso = new THREE.Mesh(torsoGeo, crystalMat);
    torso.position.y = 2.2;
    torso.scale.set(0.7, 1.1, 0.6);
    torso.rotation.y = Math.PI / 6;
    this._body.add(torso);

    // Geode cavity in chest (darker internal layer visible through translucent body)
    const cavGeo = new THREE.SphereGeometry(0.25, 14, 12);
    const cav = new THREE.Mesh(cavGeo, internalMat);
    cav.position.set(0, 2.3, 0.1);
    this._body.add(cav);
    // Inner core (bright energy)
    const cGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const core = new THREE.Mesh(cGeo, coreMat);
    core.position.y = 2.3;
    this._body.add(core);

    // Major crystal formations growing from body (varied materials for prismatic effect)
    const shardDefs: [number, number, number, number, number, THREE.MeshStandardMaterial][] = [
      [0.07, 0.3, 0.25, 2.6, 0.3, darkCrystalMat],
      [0.06, 0.25, -0.3, 2.8, 0.15, amethystMat],
      [0.08, 0.35, 0.35, 2.0, -0.1, crystalMat],
      [0.05, 0.2, -0.25, 1.9, 0.25, roseMat],
      [0.07, 0.28, 0.15, 2.7, -0.25, darkCrystalMat],
      [0.04, 0.18, -0.1, 2.9, 0.3, amethystMat],
      [0.06, 0.22, 0.3, 1.75, 0.15, crystalMat],
      [0.05, 0.2, -0.35, 2.4, -0.2, roseMat],
      [0.09, 0.32, 0.0, 2.85, 0.0, darkCrystalMat],
    ];
    for (const [r, h, x, y, z, m] of shardDefs) {
      const sGeo = new THREE.ConeGeometry(r, h, 6);
      const shard = new THREE.Mesh(sGeo, m);
      shard.position.set(x, y, z);
      shard.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8);
      this._body.add(shard);
    }

    // Crystal veins running through body surface
    for (let i = 0; i < 6; i++) {
      const vGeo = new THREE.BoxGeometry(0.01, 0.2 + Math.random() * 0.15, 0.008);
      const vein = new THREE.Mesh(vGeo, veinMat);
      const a = (i / 6) * Math.PI * 2;
      vein.position.set(Math.cos(a) * 0.32, 1.9 + Math.random() * 0.8, Math.sin(a) * 0.28);
      vein.rotation.z = (Math.random() - 0.5) * 0.6;
      this._body.add(vein);
    }

    // --- Head (faceted crystal with multiple prismatic layers) ---
    this._head.position.set(0, 3.1, 0);
    this._body.add(this._head);
    // Outer faceted shell
    const headGeo = new THREE.OctahedronGeometry(0.24, 1);
    const headMesh = new THREE.Mesh(headGeo, crystalMat);
    this._head.add(headMesh);
    // Inner head core
    const ihGeo = new THREE.OctahedronGeometry(0.14, 0);
    const ih = new THREE.Mesh(ihGeo, internalMat);
    this._head.add(ih);
    // Crown crystals (cluster of smaller shards on top)
    for (let i = 0; i < 5; i++) {
      const ccGeo = new THREE.ConeGeometry(0.025 + i * 0.005, 0.1 + i * 0.02, 5);
      const cc = new THREE.Mesh(ccGeo, i % 2 === 0 ? darkCrystalMat : amethystMat);
      const a = (i / 5) * Math.PI * 2;
      cc.position.set(Math.cos(a) * 0.1, 0.2, Math.sin(a) * 0.1);
      cc.rotation.z = (Math.random() - 0.5) * 0.3;
      this._head.add(cc);
    }
    // Face facets (angled planes suggesting features)
    for (const side of [-1, 1]) {
      const ffGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
      const ff = new THREE.Mesh(ffGeo, darkCrystalMat);
      ff.position.set(side * 0.1, 0.03, 0.18);
      ff.rotation.y = side * 0.2;
      this._head.add(ff);
    }
    // Eyes (bright spark within face facets)
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const eye = new THREE.Mesh(eGeo, sparkMat);
      eye.position.set(side * 0.09, 0.03, 0.2);
      this._head.add(eye);
      // Eye refraction halo
      const ehGeo = new THREE.RingGeometry(0.025, 0.04, 10);
      const eh = new THREE.Mesh(ehGeo, veinMat);
      eh.position.set(side * 0.09, 0.03, 0.21);
      this._head.add(eh);
    }

    // --- Arms (angular crystal segments with prismatic growth) ---
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.48, 2.7, 0);
      this._body.add(arm);

      // Shoulder crystal cluster
      const scGeo = new THREE.OctahedronGeometry(0.1, 0);
      const sc = new THREE.Mesh(scGeo, crystalMat);
      sc.rotation.y = Math.PI / 4;
      arm.add(sc);
      // Shoulder shard
      const ssGeo = new THREE.ConeGeometry(0.04, 0.15, 5);
      const ss = new THREE.Mesh(ssGeo, amethystMat);
      ss.position.set(side * 0.06, 0.1, 0);
      arm.add(ss);

      // Upper arm (hexagonal prism)
      const upperGeo = cyl(0.07, 0.07, 0.7, 6);
      const upper = new THREE.Mesh(upperGeo, crystalMat);
      upper.position.y = -0.38;
      upper.rotation.y = Math.PI / 6;
      arm.add(upper);
      // Facet growth on upper arm
      const fGeo = new THREE.ConeGeometry(0.035, 0.12, 5);
      const facet = new THREE.Mesh(fGeo, side === -1 ? roseMat : amethystMat);
      facet.position.set(side * 0.06, -0.3, 0.06);
      facet.rotation.z = side * 0.4;
      arm.add(facet);
      const f2Geo = new THREE.ConeGeometry(0.03, 0.1, 5);
      const facet2 = new THREE.Mesh(f2Geo, darkCrystalMat);
      facet2.position.set(-side * 0.04, -0.5, -0.04);
      facet2.rotation.z = -side * 0.3;
      arm.add(facet2);

      // Crystal joint (elbow)
      const ejGeo = new THREE.OctahedronGeometry(0.07, 0);
      const ej = new THREE.Mesh(ejGeo, sparkMat);
      ej.position.y = -0.72;
      arm.add(ej);

      // Forearm
      const foreGeo = cyl(0.06, 0.06, 0.55, 6);
      const fore = new THREE.Mesh(foreGeo, darkCrystalMat);
      fore.position.y = -1.0;
      fore.rotation.y = -Math.PI / 6;
      arm.add(fore);
      // Forearm crystal vein
      const fvGeo = cyl(0.005, 0.005, 0.3, 4);
      const fv = new THREE.Mesh(fvGeo, veinMat);
      fv.position.set(0.05, -0.95, 0.06);
      arm.add(fv);

      // Crystal blade hand (multi-prong)
      const bladeGeo = new THREE.ConeGeometry(0.06, 0.25, 6);
      const blade = new THREE.Mesh(bladeGeo, coreMat);
      blade.position.y = -1.35;
      blade.rotation.x = Math.PI;
      arm.add(blade);
      // Secondary blade prongs
      for (let p = -1; p <= 1; p += 2) {
        const pbGeo = new THREE.ConeGeometry(0.03, 0.15, 5);
        const pb = new THREE.Mesh(pbGeo, darkCrystalMat);
        pb.position.set(p * 0.05, -1.3, 0.03);
        pb.rotation.x = Math.PI;
        pb.rotation.z = p * 0.3;
        arm.add(pb);
      }
    }

    // --- Legs (angular crystal columns with growth clusters) ---
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.24, 1.5, 0);
      this._body.add(leg);

      // Thigh
      const thighGeo = cyl(0.08, 0.08, 0.65, 6);
      const thigh = new THREE.Mesh(thighGeo, crystalMat);
      thigh.position.y = -0.32;
      thigh.rotation.y = side * Math.PI / 8;
      leg.add(thigh);

      // Knee crystal cluster
      const kcGeo = new THREE.OctahedronGeometry(0.06, 0);
      const kc = new THREE.Mesh(kcGeo, sparkMat);
      kc.position.set(0, -0.62, 0.08);
      leg.add(kc);
      // Knee shard growth
      const ksGeo = new THREE.ConeGeometry(0.035, 0.12, 5);
      const ks = new THREE.Mesh(ksGeo, amethystMat);
      ks.position.set(0.04, -0.58, 0.1);
      ks.rotation.z = 0.3;
      leg.add(ks);

      // Shin
      const shinGeo = cyl(0.07, 0.07, 0.6, 6);
      const shin = new THREE.Mesh(shinGeo, darkCrystalMat);
      shin.position.y = -0.9;
      shin.rotation.y = -side * Math.PI / 8;
      leg.add(shin);
      // Shin facet growth
      const sfGeo = new THREE.ConeGeometry(0.03, 0.1, 5);
      const sf = new THREE.Mesh(sfGeo, roseMat);
      sf.position.set(-0.05, -0.85, 0.06);
      sf.rotation.z = -0.25;
      leg.add(sf);

      // Foot (crystal slab with small growth cluster)
      const footGeo = new THREE.OctahedronGeometry(0.12, 0);
      const foot = new THREE.Mesh(footGeo, darkCrystalMat);
      foot.scale.set(0.85, 0.35, 1.05);
      foot.position.set(0, -1.25, 0.03);
      leg.add(foot);
      // Toe crystal growth
      for (let t = 0; t < 2; t++) {
        const tGeo = new THREE.ConeGeometry(0.02, 0.06, 5);
        const tc = new THREE.Mesh(tGeo, crystalMat);
        tc.position.set((t - 0.5) * 0.08, -1.22, 0.14);
        tc.rotation.x = Math.PI / 3;
        leg.add(tc);
      }
    }

    // --- Floating crystal motes (orbiting fragments) ---
    for (let i = 0; i < 6; i++) {
      const mGeo = new THREE.OctahedronGeometry(0.025 + Math.random() * 0.015, 0);
      const mote = new THREE.Mesh(mGeo, i % 2 === 0 ? sparkMat : amethystMat);
      const a = (i / 6) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.15;
      mote.position.set(Math.cos(a) * r, 1.8 + Math.sin(a * 2) * 0.5, Math.sin(a) * r);
      mote.rotation.set(Math.random(), Math.random(), Math.random());
      this._body.add(mote);
    }

    // Light refraction beams (thin bright lines radiating from core)
    for (let i = 0; i < 4; i++) {
      const beamGeo = new THREE.BoxGeometry(0.005, 0.5, 0.005);
      const beam = new THREE.Mesh(beamGeo, veinMat);
      const a = (i / 4) * Math.PI * 2;
      beam.position.set(Math.cos(a) * 0.15, 2.3, Math.sin(a) * 0.15);
      beam.rotation.z = Math.cos(a) * 0.6;
      beam.rotation.x = Math.sin(a) * 0.6;
      this._body.add(beam);
    }
  }

  // ---- Iron Colossus builder -------------------------------------------------

  private _buildIronColossus(): void {
    const ironMat = mat(0x4a4a4a, { metalness: 0.8, roughness: 0.25 });
    const darkIronMat = mat(0x2a2a2a, { metalness: 0.7, roughness: 0.3 });
    const wornIronMat = mat(0x3a3a3a, { metalness: 0.75, roughness: 0.35 });
    const rivetMat = mat(0x888888, { metalness: 0.6 });
    const eyeMat = mat(0xff6600, { emissive: 0xcc4400 });
    const runeMat = mat(0xff8800, { emissive: 0xcc5500, transparent: true, opacity: 0.8 });
    const steamMat = mat(0xcccccc, { transparent: true, opacity: 0.3 });
    const copperMat = mat(0x8a5c2a, { metalness: 0.7, roughness: 0.3 });
    const brassMat = mat(0x7a6a2a, { metalness: 0.65, roughness: 0.35 });

    // --- Torso (layered armor plates) ---
    // Core torso — rounded barrel shape
    const torsoGeo = cyl(0.6, 0.55, 1.8, 16);
    const torso = new THREE.Mesh(torsoGeo, ironMat);
    torso.position.y = 3.8;
    torso.scale.set(1.0, 1.0, 0.75);
    this._body.add(torso);

    // Chest armor plate (curved front overlay)
    const chestGeo = new THREE.SphereGeometry(0.6, 14, 10);
    const chest = new THREE.Mesh(chestGeo, darkIronMat);
    chest.scale.set(0.92, 0.85, 0.12);
    chest.position.set(0, 4.0, 0.5);
    this._body.add(chest);
    // Belly plate
    const bellyGeo = new THREE.SphereGeometry(0.5, 12, 10);
    const belly = new THREE.Mesh(bellyGeo, wornIronMat);
    belly.scale.set(0.9, 0.7, 0.1);
    belly.position.set(0, 3.2, 0.48);
    this._body.add(belly);
    // Back plate
    const backGeo = new THREE.SphereGeometry(0.55, 12, 10);
    const back = new THREE.Mesh(backGeo, darkIronMat);
    back.scale.set(0.9, 1.3, 0.1);
    back.position.set(0, 3.7, -0.48);
    this._body.add(back);

    // Plate seams (horizontal and vertical dividers)
    for (const yy of [3.1, 3.5, 3.9, 4.3]) {
      const seamGeo = new THREE.BoxGeometry(1.22, 0.025, 0.012);
      const seam = new THREE.Mesh(seamGeo, darkIronMat);
      seam.position.set(0, yy, 0.52);
      this._body.add(seam);
    }
    // Vertical center seam
    const vsGeo = new THREE.BoxGeometry(0.02, 1.8, 0.012);
    const vs = new THREE.Mesh(vsGeo, darkIronMat);
    vs.position.set(0, 3.8, 0.52);
    this._body.add(vs);

    // Rivets along plate edges (structured placement)
    const rivetPositions = [
      // Top row
      ...[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map(x => [x, 4.55, 0.52] as const),
      // Bottom row
      ...[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map(x => [x, 3.05, 0.52] as const),
      // Left edge
      ...[3.2, 3.6, 4.0, 4.4].map(y => [-0.58, y, 0.52] as const),
      // Right edge
      ...[3.2, 3.6, 4.0, 4.4].map(y => [0.58, y, 0.52] as const),
    ];
    for (const [rx, ry, rz] of rivetPositions) {
      const rGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const rivet = new THREE.Mesh(rGeo, rivetMat);
      rivet.position.set(rx, ry, rz);
      this._body.add(rivet);
    }

    // Rune engravings on chest plate
    for (let i = 0; i < 3; i++) {
      const runeGeo = new THREE.BoxGeometry(0.15, 0.03, 0.01);
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(-0.2 + i * 0.2, 4.1, 0.55);
      this._body.add(rune);
      const runeV = new THREE.BoxGeometry(0.03, 0.12, 0.01);
      const rv = new THREE.Mesh(runeV, runeMat);
      rv.position.set(-0.2 + i * 0.2, 4.05, 0.55);
      this._body.add(rv);
    }

    // --- Shoulder pauldrons ---
    for (const side of [-1, 1]) {
      // Main pauldron
      const pauldGeo = new THREE.SphereGeometry(0.3, 16, 12);
      const pauld = new THREE.Mesh(pauldGeo, ironMat);
      pauld.scale.set(1.2, 0.7, 1.0);
      pauld.position.set(side * 0.75, 4.7, 0);
      this._body.add(pauld);
      // Pauldron rim
      const rimGeo = new THREE.TorusGeometry(0.25, 0.025, 8, 16);
      const rim = new THREE.Mesh(rimGeo, darkIronMat);
      rim.position.set(side * 0.75, 4.5, 0);
      rim.rotation.x = Math.PI / 2;
      this._body.add(rim);
      // Pauldron rivets
      for (let r = 0; r < 4; r++) {
        const prGeo = new THREE.SphereGeometry(0.02, 6, 6);
        const pr = new THREE.Mesh(prGeo, rivetMat);
        const a = (r / 4) * Math.PI;
        pr.position.set(side * 0.75 + Math.cos(a) * side * 0.22, 4.5, Math.sin(a) * 0.22);
        this._body.add(pr);
      }
      // Spike on pauldron
      const spkGeo = new THREE.ConeGeometry(0.04, 0.2, 8);
      const spk = new THREE.Mesh(spkGeo, darkIronMat);
      spk.position.set(side * 0.85, 4.85, 0);
      this._body.add(spk);
    }

    // --- Head (armored helm with furnace interior) ---
    this._head.position.set(0, 5.1, 0.1);
    this._body.add(this._head);
    // Helm base — barrel shape
    const helmGeo = cyl(0.22, 0.2, 0.4, 14);
    const helm = new THREE.Mesh(helmGeo, ironMat);
    helm.scale.set(1.0, 1.0, 0.9);
    this._head.add(helm);
    // Helm dome top
    const domeGeo = new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, ironMat);
    dome.position.y = 0.2;
    this._head.add(dome);
    // Helm crest/ridge
    const crestGeo = cyl(0.03, 0.03, 0.35, 6);
    const crest = new THREE.Mesh(crestGeo, darkIronMat);
    crest.position.set(0, 0.25, 0);
    crest.rotation.x = Math.PI / 2;
    this._head.add(crest);
    // Visor plate — curved
    const visorGeo = new THREE.SphereGeometry(0.22, 12, 8, -Math.PI / 2.5, Math.PI / 1.25, Math.PI / 3, Math.PI / 5);
    const visor = new THREE.Mesh(visorGeo, darkIronMat);
    visor.position.set(0, -0.02, 0.02);
    this._head.add(visor);
    // Visor slit — horizontal eye slot
    const slitBgGeo = new THREE.TorusGeometry(0.17, 0.015, 6, 16, Math.PI * 0.8);
    const slitBg = new THREE.Mesh(slitBgGeo, mat(0x0a0500));
    slitBg.position.set(0, 0.0, 0.2);
    slitBg.rotation.y = Math.PI;
    slitBg.rotation.z = Math.PI / 2;
    this._head.add(slitBg);
    // Eyes — furnace glow behind visor
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.03, 10, 10);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.scale.set(1.6, 0.6, 0.5);
      eye.position.set(side * 0.1, 0.0, 0.22);
      this._head.add(eye);
    }
    // Chin guard
    const chinGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const chinG = new THREE.Mesh(chinGeo, wornIronMat);
    chinG.scale.set(0.95, 0.35, 0.5);
    chinG.position.set(0, -0.2, 0.12);
    this._head.add(chinG);
    // Helm cheek plates
    for (const side of [-1, 1]) {
      const cpGeo = cyl(0.08, 0.06, 0.25, 10);
      const cp = new THREE.Mesh(cpGeo, darkIronMat);
      cp.scale.set(0.5, 1.0, 0.8);
      cp.position.set(side * 0.2, -0.05, 0.1);
      this._head.add(cp);
    }

    // --- Arms (articulated armor with hydraulic pistons) ---
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.8, 4.35, 0);
      this._body.add(arm);

      // Upper arm armor (segmented)
      const upperGeo = cyl(0.2, 0.17, 0.6, 14);
      const upper = new THREE.Mesh(upperGeo, ironMat);
      upper.position.y = -0.35;
      arm.add(upper);
      const upper2Geo = cyl(0.18, 0.2, 0.55, 14);
      const upper2 = new THREE.Mesh(upper2Geo, wornIronMat);
      upper2.position.y = -0.85;
      arm.add(upper2);
      // Armor band between upper segments
      const bandGeo = new THREE.TorusGeometry(0.19, 0.02, 8, 14);
      const band = new THREE.Mesh(bandGeo, darkIronMat);
      band.position.y = -0.6;
      band.rotation.x = Math.PI / 2;
      arm.add(band);

      // Elbow joint (gear mechanism)
      const elbowGeo = new THREE.SphereGeometry(0.17, 14, 12);
      const elbow = new THREE.Mesh(elbowGeo, darkIronMat);
      elbow.position.y = -1.2;
      arm.add(elbow);
      // Gear cog on elbow
      const cogGeo = new THREE.TorusGeometry(0.13, 0.02, 6, 12);
      const cog = new THREE.Mesh(cogGeo, copperMat);
      cog.position.set(side * 0.12, -1.2, 0);
      cog.rotation.y = Math.PI / 2;
      arm.add(cog);
      // Gear teeth on cog
      for (let g = 0; g < 8; g++) {
        const gtGeo = new THREE.BoxGeometry(0.04, 0.025, 0.02);
        const gt = new THREE.Mesh(gtGeo, copperMat);
        const a = (g / 8) * Math.PI * 2;
        gt.position.set(side * 0.12, -1.2 + Math.sin(a) * 0.14, Math.cos(a) * 0.14);
        arm.add(gt);
      }

      // Hydraulic piston (upper arm to forearm)
      const pistonGeo = cyl(0.025, 0.025, 0.5, 8);
      const piston = new THREE.Mesh(pistonGeo, brassMat);
      piston.position.set(side * 0.14, -0.9, 0.1);
      arm.add(piston);
      const pistonRodGeo = cyl(0.015, 0.015, 0.45, 8);
      const pistonRod = new THREE.Mesh(pistonRodGeo, copperMat);
      pistonRod.position.set(side * 0.14, -1.55, 0.1);
      arm.add(pistonRod);

      // Forearm armor
      const foreGeo = cyl(0.18, 0.22, 1.1, 14);
      const fore = new THREE.Mesh(foreGeo, darkIronMat);
      fore.position.y = -1.95;
      arm.add(fore);
      // Forearm plate overlay
      const fpGeo = new THREE.BoxGeometry(0.15, 0.5, 0.06);
      const fp = new THREE.Mesh(fpGeo, ironMat);
      fp.position.set(0, -1.9, 0.18);
      arm.add(fp);

      // Wrist joint
      const wristGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 14);
      const wrist = new THREE.Mesh(wristGeo, darkIronMat);
      wrist.position.y = -2.5;
      wrist.rotation.x = Math.PI / 2;
      arm.add(wrist);

      // Mechanical fist (articulated clamp fingers)
      const palmGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const palm = new THREE.Mesh(palmGeo, ironMat);
      palm.scale.set(1.0, 0.75, 0.75);
      palm.position.y = -2.7;
      arm.add(palm);
      // Fingers (3 mechanical digits)
      for (let f = -1; f <= 1; f++) {
        // Proximal segment
        const f1Geo = cyl(0.025, 0.02, 0.12, 8);
        const f1 = new THREE.Mesh(f1Geo, darkIronMat);
        f1.position.set(f * 0.07, -2.85, 0.03);
        arm.add(f1);
        // Knuckle rivet
        const fkGeo = new THREE.SphereGeometry(0.02, 6, 6);
        const fk = new THREE.Mesh(fkGeo, rivetMat);
        fk.position.set(f * 0.07, -2.91, 0.06);
        arm.add(fk);
        // Distal segment
        const f2Geo = cyl(0.02, 0.015, 0.1, 8);
        const f2 = new THREE.Mesh(f2Geo, wornIronMat);
        f2.position.set(f * 0.07, -2.98, 0.04);
        arm.add(f2);
      }
      // Thumb
      const thGeo = cyl(0.025, 0.02, 0.1, 8);
      const th = new THREE.Mesh(thGeo, darkIronMat);
      th.position.set(side * 0.12, -2.78, 0.06);
      th.rotation.z = side * 0.5;
      arm.add(th);

      // Arm rivets along seam lines
      for (let rv = 0; rv < 5; rv++) {
        const rvGeo = new THREE.SphereGeometry(0.02, 6, 6);
        const rivet = new THREE.Mesh(rvGeo, rivetMat);
        rivet.position.set(side * 0.15, -0.3 - rv * 0.4, 0.14);
        arm.add(rivet);
      }
    }

    // --- Legs (armored pistons with heavy feet) ---
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.4, 2.6, 0);
      this._body.add(leg);

      // Thigh armor (segmented)
      const thighGeo = cyl(0.22, 0.18, 0.55, 14);
      const thigh = new THREE.Mesh(thighGeo, ironMat);
      thigh.position.y = -0.3;
      leg.add(thigh);
      const thigh2Geo = cyl(0.19, 0.22, 0.45, 14);
      const thigh2 = new THREE.Mesh(thigh2Geo, wornIronMat);
      thigh2.position.y = -0.7;
      leg.add(thigh2);

      // Knee gear joint
      const kneeGeo = new THREE.SphereGeometry(0.18, 14, 12);
      const knee = new THREE.Mesh(kneeGeo, darkIronMat);
      knee.position.y = -1.0;
      leg.add(knee);
      // Knee cap plate
      const kcGeo = new THREE.SphereGeometry(0.08, 10, 8);
      const kc = new THREE.Mesh(kcGeo, ironMat);
      kc.scale.set(0.95, 0.95, 0.4);
      kc.position.set(0, -1.0, 0.15);
      leg.add(kc);
      // Knee gear
      const kgGeo = new THREE.TorusGeometry(0.1, 0.015, 6, 10);
      const kg = new THREE.Mesh(kgGeo, copperMat);
      kg.position.set(side * 0.14, -1.0, 0);
      kg.rotation.y = Math.PI / 2;
      leg.add(kg);

      // Shin with hydraulic piston
      const shinGeo = cyl(0.18, 0.22, 0.9, 14);
      const shin = new THREE.Mesh(shinGeo, darkIronMat);
      shin.position.y = -1.6;
      leg.add(shin);
      const lPistonGeo = cyl(0.02, 0.02, 0.4, 8);
      const lPiston = new THREE.Mesh(lPistonGeo, brassMat);
      lPiston.position.set(0, -1.3, 0.15);
      leg.add(lPiston);

      // Ankle ring
      const ankGeo = new THREE.TorusGeometry(0.18, 0.02, 8, 14);
      const ank = new THREE.Mesh(ankGeo, darkIronMat);
      ank.position.y = -2.1;
      ank.rotation.x = Math.PI / 2;
      leg.add(ank);

      // Heavy armored foot
      const footGeo = new THREE.SphereGeometry(0.22, 12, 10);
      const foot = new THREE.Mesh(footGeo, ironMat);
      foot.scale.set(0.8, 0.35, 1.05);
      foot.position.set(0, -2.3, 0.06);
      leg.add(foot);
      // Toe cap plate
      const tcGeo = new THREE.SphereGeometry(0.16, 10, 8);
      const tc = new THREE.Mesh(tcGeo, darkIronMat);
      tc.scale.set(0.95, 0.4, 0.3);
      tc.position.set(0, -2.3, 0.3);
      leg.add(tc);
      // Sole rivets
      for (let r = 0; r < 3; r++) {
        const srGeo = new THREE.SphereGeometry(0.02, 6, 6);
        const sr = new THREE.Mesh(srGeo, rivetMat);
        sr.position.set((r - 1) * 0.1, -2.25, 0.3);
        leg.add(sr);
      }
    }

    // --- Exhaust system on back ---
    // Main smoke stacks
    for (const s of [-1, 1]) {
      // Pipe
      const pGeo = cyl(0.06, 0.06, 1.0, 12);
      const pipe = new THREE.Mesh(pGeo, darkIronMat);
      pipe.position.set(s * 0.4, 4.4, -0.52);
      this._body.add(pipe);
      // Pipe collar ring
      const collarGeo = new THREE.TorusGeometry(0.065, 0.015, 8, 12);
      const collar = new THREE.Mesh(collarGeo, wornIronMat);
      collar.position.set(s * 0.4, 4.9, -0.52);
      collar.rotation.x = Math.PI / 2;
      this._body.add(collar);
      // Flared exhaust top
      const flareGeo = cyl(0.05, 0.09, 0.12, 12);
      const flare = new THREE.Mesh(flareGeo, ironMat);
      flare.position.set(s * 0.4, 5.0, -0.52);
      this._body.add(flare);
      // Steam puffs
      for (let p = 0; p < 2; p++) {
        const spGeo = new THREE.SphereGeometry(0.06 + p * 0.03, 10, 10);
        const sp = new THREE.Mesh(spGeo, steamMat);
        sp.position.set(s * 0.4, 5.1 + p * 0.12, -0.52);
        this._body.add(sp);
      }
    }
    // Cross-brace between stacks
    const braceGeo = new THREE.BoxGeometry(0.6, 0.04, 0.04);
    const brace = new THREE.Mesh(braceGeo, darkIronMat);
    brace.position.set(0, 4.1, -0.52);
    this._body.add(brace);

    // Furnace grate on lower back
    const grateGeo = new THREE.BoxGeometry(0.5, 0.4, 0.04);
    const grate = new THREE.Mesh(grateGeo, darkIronMat);
    grate.position.set(0, 3.3, -0.5);
    this._body.add(grate);
    // Grate bars
    for (let b = 0; b < 4; b++) {
      const barGeo = new THREE.BoxGeometry(0.02, 0.35, 0.02);
      const bar = new THREE.Mesh(barGeo, wornIronMat);
      bar.position.set(-0.15 + b * 0.1, 3.3, -0.48);
      this._body.add(bar);
    }
    // Furnace glow behind grate
    const glowGeo = new THREE.BoxGeometry(0.4, 0.3, 0.01);
    const glow = new THREE.Mesh(glowGeo, mat(0xff4400, { emissive: 0xcc2200, transparent: true, opacity: 0.4 }));
    glow.position.set(0, 3.3, -0.47);
    this._body.add(glow);
  }

  // ---- Bone Colossus builder --------------------------------------------------

  private _buildBoneColossus(): void {
    const boneMat = mat(0xd8c8a0);
    const darkBoneMat = mat(0xa89870);
    const wornBoneMat = mat(0xc4b490);
    const eyeMat = mat(0x44ff44, { emissive: 0x22aa22 });
    const jointMat = mat(0x887760);
    const cavityMat = mat(0x1a1510);
    const tendrilMat = mat(0x44ff44, { emissive: 0x22aa22, transparent: true, opacity: 0.35 });

    // --- Spine column (individual vertebrae) ---
    for (let i = 0; i < 10; i++) {
      const vSize = 0.08 + (i < 5 ? i * 0.012 : (9 - i) * 0.012);
      const vGeo = new THREE.SphereGeometry(vSize, 12, 10);
      const vert = new THREE.Mesh(vGeo, darkBoneMat);
      vert.scale.set(1.3, 0.6, 1.0);
      vert.position.set(0, 2.6 + i * 0.22, -0.38);
      this._body.add(vert);
      // Spinous process (dorsal spike on each vertebra)
      const spGeo = new THREE.ConeGeometry(0.02, 0.1 + i * 0.005, 6);
      const sp = new THREE.Mesh(spGeo, wornBoneMat);
      sp.position.set(0, 2.6 + i * 0.22, -0.48);
      sp.rotation.x = -0.3;
      this._body.add(sp);
      // Transverse processes (lateral wings on vertebrae)
      for (const side of [-1, 1]) {
        const tpGeo = new THREE.BoxGeometry(0.12, 0.02, 0.03);
        const tp = new THREE.Mesh(tpGeo, darkBoneMat);
        tp.position.set(side * 0.1, 2.6 + i * 0.22, -0.4);
        this._body.add(tp);
      }
    }

    // --- Ribcage (curved ribs wrapping around torso) ---
    for (let i = 0; i < 6; i++) {
      const ribY = 3.0 + i * 0.28;
      const ribLen = 0.5 + (i < 3 ? i * 0.08 : (5 - i) * 0.08);
      for (const side of [-1, 1]) {
        // Each rib = 3 segments curving from spine to front
        const ribGroup = new THREE.Group();
        ribGroup.position.set(0, ribY, 0);
        this._body.add(ribGroup);
        // Posterior segment (near spine)
        const r1Geo = cyl(0.035, 0.03, ribLen * 0.4, 10);
        const r1 = new THREE.Mesh(r1Geo, i % 2 === 0 ? boneMat : wornBoneMat);
        r1.position.set(side * 0.15, 0, -0.2);
        r1.rotation.z = side * 1.2;
        r1.rotation.x = 0.2;
        ribGroup.add(r1);
        // Lateral segment (side)
        const r2Geo = cyl(0.03, 0.028, ribLen * 0.35, 10);
        const r2 = new THREE.Mesh(r2Geo, boneMat);
        r2.position.set(side * 0.4, -0.05, 0.0);
        r2.rotation.z = side * 0.5;
        r2.rotation.x = 0.1;
        ribGroup.add(r2);
        // Anterior segment (front, curving inward)
        const r3Geo = cyl(0.028, 0.02, ribLen * 0.3, 10);
        const r3 = new THREE.Mesh(r3Geo, wornBoneMat);
        r3.position.set(side * 0.35, -0.08, 0.25);
        r3.rotation.z = side * -0.4;
        r3.rotation.x = -0.3;
        ribGroup.add(r3);
      }
    }

    // Sternum (front plate connecting ribs)
    const sternGeo = new THREE.BoxGeometry(0.06, 1.2, 0.03);
    const sternum = new THREE.Mesh(sternGeo, darkBoneMat);
    sternum.position.set(0, 3.4, 0.35);
    this._body.add(sternum);
    // Xiphoid process (bottom tip of sternum)
    const xiphGeo = new THREE.ConeGeometry(0.025, 0.12, 6);
    const xiph = new THREE.Mesh(xiphGeo, wornBoneMat);
    xiph.position.set(0, 2.75, 0.35);
    xiph.rotation.x = Math.PI;
    this._body.add(xiph);

    // --- Pelvis ---
    const pelvisGeo = new THREE.TorusGeometry(0.35, 0.08, 10, 16, Math.PI);
    const pelvis = new THREE.Mesh(pelvisGeo, boneMat);
    pelvis.position.set(0, 2.4, 0);
    pelvis.rotation.x = Math.PI / 2;
    pelvis.rotation.z = Math.PI;
    this._body.add(pelvis);
    // Iliac crests (hip wings)
    for (const side of [-1, 1]) {
      const ilGeo = new THREE.SphereGeometry(0.15, 12, 10);
      const il = new THREE.Mesh(ilGeo, wornBoneMat);
      il.scale.set(1.2, 0.5, 0.8);
      il.position.set(side * 0.35, 2.5, -0.05);
      this._body.add(il);
    }
    // Sacrum
    const sacGeo = new THREE.BoxGeometry(0.12, 0.2, 0.06);
    const sac = new THREE.Mesh(sacGeo, darkBoneMat);
    sac.position.set(0, 2.3, -0.32);
    this._body.add(sac);

    // --- Scapulae (shoulder blades on back) ---
    for (const side of [-1, 1]) {
      const scapGeo = new THREE.SphereGeometry(0.18, 14, 10);
      const scap = new THREE.Mesh(scapGeo, wornBoneMat);
      scap.scale.set(0.8, 1.2, 0.25);
      scap.position.set(side * 0.4, 4.3, -0.3);
      this._body.add(scap);
      // Scapular spine ridge
      const srGeo = new THREE.BoxGeometry(0.2, 0.025, 0.04);
      const sr = new THREE.Mesh(srGeo, darkBoneMat);
      sr.position.set(side * 0.4, 4.4, -0.35);
      sr.rotation.z = side * 0.15;
      this._body.add(sr);
    }

    // --- Clavicles (collar bones) ---
    for (const side of [-1, 1]) {
      const clavGeo = cyl(0.035, 0.03, 0.45, 10);
      const clav = new THREE.Mesh(clavGeo, boneMat);
      clav.position.set(side * 0.25, 4.65, 0.15);
      clav.rotation.z = side * 0.9;
      this._body.add(clav);
    }

    // Bone cracks and weathering on torso area
    for (let i = 0; i < 5; i++) {
      const crGeo = new THREE.BoxGeometry(0.012, 0.2 + Math.random() * 0.15, 0.008);
      const cr = new THREE.Mesh(crGeo, jointMat);
      const a = (i / 5) * Math.PI * 2;
      cr.position.set(Math.cos(a) * 0.32, 3.0 + i * 0.3, Math.sin(a) * 0.3);
      cr.rotation.z = (Math.random() - 0.5) * 0.6;
      this._body.add(cr);
    }

    // --- Skull (anatomical detail) ---
    this._head.position.set(0, 4.85, 0.1);
    this._body.add(this._head);

    // Cranium (main skull dome)
    const cranGeo = new THREE.SphereGeometry(0.34, 18, 14);
    const cranium = new THREE.Mesh(cranGeo, boneMat);
    cranium.scale.set(1.0, 0.95, 0.88);
    cranium.position.y = 0.06;
    this._head.add(cranium);

    // Brow ridges (supraorbital ridge)
    for (const side of [-1, 1]) {
      const browGeo = cyl(0.04, 0.03, 0.14, 10);
      const brow = new THREE.Mesh(browGeo, darkBoneMat);
      brow.position.set(side * 0.12, 0.08, 0.27);
      brow.rotation.z = Math.PI / 2;
      this._head.add(brow);
    }

    // Cheekbones (zygomatic arches)
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.SphereGeometry(0.06, 10, 8);
      const cheek = new THREE.Mesh(cheekGeo, wornBoneMat);
      cheek.scale.set(1.2, 0.7, 0.8);
      cheek.position.set(side * 0.22, -0.04, 0.2);
      this._head.add(cheek);
    }

    // Nasal cavity (triangular hole)
    const nasalGeo = new THREE.ConeGeometry(0.04, 0.08, 3);
    const nasal = new THREE.Mesh(nasalGeo, cavityMat);
    nasal.position.set(0, -0.06, 0.3);
    nasal.rotation.x = Math.PI;
    this._head.add(nasal);
    // Nasal bone (bridge)
    const nbGeo = new THREE.BoxGeometry(0.035, 0.07, 0.03);
    const nb = new THREE.Mesh(nbGeo, boneMat);
    nb.position.set(0, 0.0, 0.31);
    this._head.add(nb);

    // Temporal bones (sides of skull)
    for (const side of [-1, 1]) {
      const tempGeo = new THREE.SphereGeometry(0.08, 10, 8);
      const temp = new THREE.Mesh(tempGeo, wornBoneMat);
      temp.scale.set(0.5, 0.8, 0.6);
      temp.position.set(side * 0.3, -0.02, 0.05);
      this._head.add(temp);
    }

    // Suture lines (3 cranial sutures)
    const sut1Geo = new THREE.BoxGeometry(0.008, 0.28, 0.008);
    const sut1 = new THREE.Mesh(sut1Geo, darkBoneMat);
    sut1.position.set(0, 0.12, 0.28);
    this._head.add(sut1);
    // Coronal suture (horizontal)
    const sut2Geo = new THREE.BoxGeometry(0.25, 0.008, 0.008);
    const sut2 = new THREE.Mesh(sut2Geo, darkBoneMat);
    sut2.position.set(0, 0.18, 0.2);
    this._head.add(sut2);
    // Lambdoid suture (back)
    const sut3Geo = new THREE.BoxGeometry(0.2, 0.008, 0.008);
    const sut3 = new THREE.Mesh(sut3Geo, darkBoneMat);
    sut3.position.set(0, 0.1, -0.15);
    sut3.rotation.y = 0.2;
    this._head.add(sut3);

    // Eye sockets (deep recessed with orbital rim)
    for (const side of [-1, 1]) {
      // Orbital rim
      const rimGeo = new THREE.TorusGeometry(0.07, 0.015, 8, 14);
      const rim = new THREE.Mesh(rimGeo, darkBoneMat);
      rim.position.set(side * 0.13, 0.02, 0.26);
      this._head.add(rim);
      // Socket cavity
      const socketGeo = new THREE.SphereGeometry(0.065, 12, 12);
      const socket = new THREE.Mesh(socketGeo, cavityMat);
      socket.position.set(side * 0.13, 0.02, 0.27);
      this._head.add(socket);
      // Glowing eye orb
      const eGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.13, 0.02, 0.3);
      this._head.add(eye);
      // Eye glow halo
      const haloGeo = new THREE.RingGeometry(0.03, 0.055, 14);
      const halo = new THREE.Mesh(haloGeo, tendrilMat);
      halo.position.set(side * 0.13, 0.02, 0.31);
      this._head.add(halo);
    }

    // Jaw (mandible with ramus)
    const jawGeo = new THREE.SphereGeometry(0.2, 14, 10);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.scale.set(1.1, 0.45, 0.75);
    jaw.position.set(0, -0.2, 0.1);
    this._head.add(jaw);
    // Mandibular rami (upward extensions connecting jaw to skull)
    for (const side of [-1, 1]) {
      const ramusGeo = new THREE.BoxGeometry(0.03, 0.15, 0.05);
      const ramus = new THREE.Mesh(ramusGeo, darkBoneMat);
      ramus.position.set(side * 0.18, -0.1, 0.02);
      this._head.add(ramus);
    }
    // Chin prominence
    const chinGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const chin = new THREE.Mesh(chinGeo, boneMat);
    chin.position.set(0, -0.28, 0.18);
    this._head.add(chin);

    // Upper teeth (maxillary)
    for (let t = -3; t <= 3; t++) {
      const toothGeo = new THREE.ConeGeometry(t === 0 ? 0 : (Math.abs(t) <= 1 ? 0.012 : 0.015), Math.abs(t) <= 1 ? 0.04 : 0.06, 6);
      if (t === 0) continue;
      const tooth = new THREE.Mesh(toothGeo, mat(0xe8dcc0));
      tooth.position.set(t * 0.033, -0.1, 0.25);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }
    // Lower teeth (mandibular)
    for (let t = -2; t <= 2; t++) {
      if (t === 0) continue;
      const toothGeo = new THREE.ConeGeometry(0.011, 0.04, 6);
      const tooth = new THREE.Mesh(toothGeo, mat(0xe8dcc0));
      tooth.position.set(t * 0.035, -0.25, 0.2);
      this._head.add(tooth);
    }
    // Fangs (canines, longer)
    for (const side of [-1, 1]) {
      const fangGeo = new THREE.ConeGeometry(0.015, 0.09, 6);
      const fang = new THREE.Mesh(fangGeo, mat(0xeee8d0));
      fang.position.set(side * 0.1, -0.12, 0.24);
      fang.rotation.x = Math.PI;
      fang.rotation.z = side * 0.1;
      this._head.add(fang);
    }

    // --- Arms (humerus, radius/ulna, wrist, phalanges) ---
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.65, 4.3, 0);
      this._body.add(arm);

      // Shoulder ball joint
      const shGeo = new THREE.SphereGeometry(0.11, 14, 12);
      const sh = new THREE.Mesh(shGeo, jointMat);
      arm.add(sh);

      // Humerus (upper arm bone — slight taper)
      const humGeo = cyl(0.09, 0.07, 1.1, 12);
      const hum = new THREE.Mesh(humGeo, boneMat);
      hum.position.y = -0.6;
      arm.add(hum);
      // Deltoid tuberosity (bump on humerus)
      const dtGeo = new THREE.SphereGeometry(0.03, 8, 6);
      const dt = new THREE.Mesh(dtGeo, wornBoneMat);
      dt.position.set(side * 0.06, -0.35, 0.03);
      arm.add(dt);

      // Elbow joint (olecranon process)
      const elbowGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const elbow = new THREE.Mesh(elbowGeo, jointMat);
      elbow.position.y = -1.15;
      arm.add(elbow);
      const olecGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const olec = new THREE.Mesh(olecGeo, darkBoneMat);
      olec.position.set(0, -1.15, -0.08);
      arm.add(olec);

      // Forearm (radius and ulna as two parallel bones)
      const radGeo = cyl(0.045, 0.035, 0.95, 10);
      const rad = new THREE.Mesh(radGeo, boneMat);
      rad.position.set(0.025, -1.65, 0);
      arm.add(rad);
      const ulnGeo = cyl(0.04, 0.03, 0.95, 10);
      const uln = new THREE.Mesh(ulnGeo, wornBoneMat);
      uln.position.set(-0.025, -1.65, 0);
      arm.add(uln);

      // Wrist (carpals cluster)
      const wristGeo = new THREE.SphereGeometry(0.06, 10, 8);
      const wrist = new THREE.Mesh(wristGeo, jointMat);
      wrist.position.y = -2.15;
      arm.add(wrist);

      // Hand — metacarpals and phalanges (4 skeletal fingers + thumb)
      for (let f = 0; f < 4; f++) {
        const fAngle = ((f - 1.5) / 3) * 0.6;
        // Metacarpal
        const mcGeo = cyl(0.02, 0.018, 0.15, 8);
        const mc = new THREE.Mesh(mcGeo, boneMat);
        mc.position.set(Math.sin(fAngle) * 0.05, -2.3, Math.cos(fAngle) * 0.02);
        mc.rotation.z = fAngle * 0.5;
        arm.add(mc);
        // Proximal phalanx
        const ppGeo = cyl(0.015, 0.013, 0.12, 8);
        const pp = new THREE.Mesh(ppGeo, wornBoneMat);
        pp.position.set(Math.sin(fAngle) * 0.08, -2.45, Math.cos(fAngle) * 0.03);
        pp.rotation.z = fAngle * 0.7;
        arm.add(pp);
        // Claw tip (distal phalanx)
        const clGeo = new THREE.ConeGeometry(0.015, 0.1, 6);
        const cl = new THREE.Mesh(clGeo, darkBoneMat);
        cl.position.set(Math.sin(fAngle) * 0.12, -2.58, Math.cos(fAngle) * 0.04);
        cl.rotation.x = Math.PI;
        cl.rotation.z = fAngle * 0.8;
        arm.add(cl);
      }
      // Thumb
      const thGeo = cyl(0.02, 0.015, 0.1, 8);
      const th = new THREE.Mesh(thGeo, boneMat);
      th.position.set(side * 0.06, -2.25, 0.05);
      th.rotation.z = side * 0.8;
      arm.add(th);
      const thClGeo = new THREE.ConeGeometry(0.014, 0.07, 6);
      const thCl = new THREE.Mesh(thClGeo, darkBoneMat);
      thCl.position.set(side * 0.1, -2.32, 0.06);
      thCl.rotation.x = Math.PI;
      arm.add(thCl);
    }

    // --- Legs (femur, patella, tibia/fibula, ankle, foot bones) ---
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.35, 2.3, 0);
      this._body.add(leg);

      // Hip joint
      const hipGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const hip = new THREE.Mesh(hipGeo, jointMat);
      leg.add(hip);

      // Femur (thigh bone with slight bow)
      const femGeo = cyl(0.11, 0.09, 1.05, 12);
      const fem = new THREE.Mesh(femGeo, boneMat);
      fem.position.y = -0.55;
      leg.add(fem);
      // Greater trochanter (bump near hip)
      const gtGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const gt = new THREE.Mesh(gtGeo, wornBoneMat);
      gt.position.set(side * 0.08, -0.15, 0);
      leg.add(gt);

      // Patella (kneecap)
      const patGeo = new THREE.SphereGeometry(0.065, 10, 10);
      const pat = new THREE.Mesh(patGeo, boneMat);
      pat.scale.set(0.8, 1.0, 0.6);
      pat.position.set(0, -1.08, 0.08);
      leg.add(pat);
      // Knee joint behind patella
      const kGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const knee = new THREE.Mesh(kGeo, jointMat);
      knee.position.y = -1.08;
      leg.add(knee);

      // Tibia and fibula (two lower leg bones)
      const tibGeo = cyl(0.065, 0.05, 0.95, 12);
      const tib = new THREE.Mesh(tibGeo, boneMat);
      tib.position.set(0.015, -1.6, 0.01);
      leg.add(tib);
      const fibGeo = cyl(0.035, 0.025, 0.85, 10);
      const fib = new THREE.Mesh(fibGeo, wornBoneMat);
      fib.position.set(-0.025, -1.55, -0.01);
      leg.add(fib);

      // Ankle (malleolus bumps)
      const ankGeo = new THREE.SphereGeometry(0.06, 10, 8);
      const ank = new THREE.Mesh(ankGeo, jointMat);
      ank.position.y = -2.1;
      leg.add(ank);
      // Lateral malleolus
      const lmGeo = new THREE.SphereGeometry(0.03, 8, 6);
      const lm = new THREE.Mesh(lmGeo, darkBoneMat);
      lm.position.set(side * 0.05, -2.1, 0);
      leg.add(lm);

      // Foot (calcaneus heel + metatarsals + toe claws)
      const heelGeo = new THREE.SphereGeometry(0.05, 10, 8);
      const heel = new THREE.Mesh(heelGeo, boneMat);
      heel.position.set(0, -2.2, -0.05);
      leg.add(heel);
      // Metatarsals
      for (let t = 0; t < 3; t++) {
        const mtGeo = cyl(0.02, 0.015, 0.12, 8);
        const mt = new THREE.Mesh(mtGeo, wornBoneMat);
        mt.position.set((t - 1) * 0.035, -2.22, 0.08);
        mt.rotation.x = Math.PI / 2.5;
        leg.add(mt);
        // Toe claw
        const tcGeo = new THREE.ConeGeometry(0.012, 0.06, 6);
        const tc = new THREE.Mesh(tcGeo, darkBoneMat);
        tc.position.set((t - 1) * 0.035, -2.25, 0.15);
        tc.rotation.x = Math.PI / 2;
        leg.add(tc);
      }
    }

    // --- Ethereal green energy tendrils threading through skeleton ---
    for (let i = 0; i < 6; i++) {
      const wGeo = new THREE.SphereGeometry(0.035 + Math.random() * 0.02, 10, 10);
      const wisp = new THREE.Mesh(wGeo, tendrilMat);
      const a = (i / 6) * Math.PI * 2;
      wisp.position.set(Math.cos(a) * 0.45, 2.8 + i * 0.35, Math.sin(a) * 0.35);
      this._body.add(wisp);
    }
    // Green energy strands connecting through ribcage
    for (let i = 0; i < 4; i++) {
      const strandGeo = new THREE.BoxGeometry(0.015, 0.4, 0.015);
      const strand = new THREE.Mesh(strandGeo, tendrilMat);
      strand.position.set((Math.random() - 0.5) * 0.3, 3.0 + i * 0.35, (Math.random() - 0.5) * 0.2);
      strand.rotation.z = (Math.random() - 0.5) * 0.5;
      this._body.add(strand);
    }
    // Soul wisps orbiting head
    for (let i = 0; i < 3; i++) {
      const swGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const sw = new THREE.Mesh(swGeo, mat(0x66ff66, { emissive: 0x33cc33, transparent: true, opacity: 0.6 }));
      const a = (i / 3) * Math.PI * 2;
      sw.position.set(Math.cos(a) * 0.4, 4.9 + Math.sin(a) * 0.2, Math.sin(a) * 0.3);
      this._body.add(sw);
    }
  }

  // ---- Wraith Lord builder ---------------------------------------------------

  private _buildWraithLord(): void {
    const ghostMat = mat(0x334455, { transparent: true, opacity: 0.55, emissive: 0x112233 });
    const darkMat = mat(0x1a2233, { transparent: true, opacity: 0.7, emissive: 0x0a1122 });
    const eyeMat = mat(0x44ddff, { emissive: 0x22aacc });
    const crownMat = mat(0x8888aa, { metalness: 0.6 });
    const wispMat = mat(0x3355aa, { transparent: true, opacity: 0.3, emissive: 0x223377 });

    // Spectral body
    const bodyGeo = cyl(0.2, 0.45, 2.0, 16);
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 1.4;
    this._body.add(body);

    // Dark cloak
    const cloakGeo = cyl(0.25, 0.5, 2.2, 16);
    const cloak = new THREE.Mesh(cloakGeo, darkMat);
    cloak.position.y = 1.5;
    this._body.add(cloak);

    // Ethereal wisps trailing from cloak
    for (let i = 0; i < 4; i++) {
      const wGeo = cyl(0.04, 0.01, 0.4, 8);
      const wisp = new THREE.Mesh(wGeo, wispMat);
      const a = (i / 4) * Math.PI * 2;
      wisp.position.set(Math.cos(a) * 0.35, 0.5 + i * 0.15, Math.sin(a) * 0.35);
      wisp.rotation.z = (i - 2) * 0.3;
      this._body.add(wisp);
    }

    // Head
    this._head.position.set(0, 2.8, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.22, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, ghostMat);
    this._head.add(headMesh);

    // Skull-like features — hollow cheeks
    for (const side of [-1, 1]) {
      const chGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const ch = new THREE.Mesh(chGeo, darkMat);
      ch.position.set(side * 0.1, -0.06, 0.15);
      this._head.add(ch);
    }

    // Crown
    for (let i = 0; i < 5; i++) {
      const spGeo = new THREE.ConeGeometry(0.03, 0.12, 8);
      const spike = new THREE.Mesh(spGeo, crownMat);
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.18, 0.2, Math.sin(a) * 0.18);
      this._head.add(spike);
    }
    // Crown band
    const bandGeo = new THREE.TorusGeometry(0.18, 0.015, 8, 20);
    const band = new THREE.Mesh(bandGeo, crownMat);
    band.position.y = 0.15;
    band.rotation.x = Math.PI / 2;
    this._head.add(band);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.08, 0, 0.18);
      this._head.add(eye);
    }

    // Arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.35, 2.3, 0);
      this._body.add(arm);
      const aGeo = cyl(0.07, 0.04, 0.9, 12);
      const armMesh = new THREE.Mesh(aGeo, ghostMat);
      armMesh.position.y = -0.45;
      arm.add(armMesh);
      const handGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const hand = new THREE.Mesh(handGeo, eyeMat);
      hand.position.y = -1.0;
      arm.add(hand);
    }

    // Trailing lower body
    this._leftLeg.position.set(-0.1, 0.4, 0);
    this._body.add(this._leftLeg);
    this._rightLeg.position.set(0.1, 0.4, 0);
    this._body.add(this._rightLeg);
    const tailGeo = cyl(0.3, 0.02, 0.7, 12);
    const tail = new THREE.Mesh(tailGeo, ghostMat);
    tail.position.y = -0.15;
    this._leftLeg.add(tail);
  }

  // ---- Banshee builder -------------------------------------------------------

  private _buildBanshee(): void {
    const ghostMat = mat(0x9999bb, { transparent: true, opacity: 0.5, emissive: 0x445566 });
    const hairMat = mat(0xaaaacc, { transparent: true, opacity: 0.6 });
    const eyeMat = mat(0xffffff, { emissive: 0xccccff });
    const mouthMat = mat(0x222244);
    const wispMat = mat(0x8888aa, { transparent: true, opacity: 0.3, emissive: 0x445566 });

    // Ethereal body — flowing shape
    const bodyGeo = cyl(0.12, 0.35, 1.6, 16);
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 1.0;
    this._body.add(body);

    // Ethereal wisps around body
    for (let i = 0; i < 3; i++) {
      const wGeo = cyl(0.03, 0.008, 0.35, 8);
      const wisp = new THREE.Mesh(wGeo, wispMat);
      const a = (i / 3) * Math.PI * 2;
      wisp.position.set(Math.cos(a) * 0.25, 0.8 + i * 0.2, Math.sin(a) * 0.25);
      wisp.rotation.z = (i - 1) * 0.4;
      this._body.add(wisp);
    }

    // Head
    this._head.position.set(0, 2.0, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.2, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, ghostMat);
    this._head.add(headMesh);

    // Flowing hair
    for (let i = 0; i < 7; i++) {
      const hGeo = cyl(0.018, 0.008, 0.4 + Math.random() * 0.3, 8);
      const hair = new THREE.Mesh(hGeo, hairMat);
      hair.position.set((Math.random() - 0.5) * 0.15, -0.1, -0.1 + (Math.random() - 0.5) * 0.1);
      hair.rotation.x = 0.3 + Math.random() * 0.3;
      hair.rotation.z = (Math.random() - 0.5) * 0.4;
      this._head.add(hair);
    }

    // Eyes — hollow white with tear streaks
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.08, 0, 0.16);
      this._head.add(eye);
      // Tear streak
      const tearGeo = cyl(0.008, 0.005, 0.12, 6);
      const tear = new THREE.Mesh(tearGeo, eyeMat);
      tear.position.set(side * 0.08, -0.08, 0.16);
      this._head.add(tear);
    }

    // Open mouth — wailing
    const mGeo = new THREE.SphereGeometry(0.06, 12, 10);
    const mouth = new THREE.Mesh(mGeo, mouthMat);
    mouth.scale.set(1, 1.5, 0.8);
    mouth.position.set(0, -0.1, 0.14);
    this._head.add(mouth);

    // Arms — outstretched, wispy
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.2, 1.7, 0);
      this._body.add(arm);
      const aGeo = cyl(0.04, 0.02, 0.7, 12);
      const armMesh = new THREE.Mesh(aGeo, ghostMat);
      armMesh.position.y = -0.35;
      armMesh.rotation.z = side * 0.3;
      arm.add(armMesh);
      // Wispy fingers
      for (let f = 0; f < 3; f++) {
        const fGeo = cyl(0.01, 0.004, 0.15, 6);
        const finger = new THREE.Mesh(fGeo, ghostMat);
        finger.position.set((f - 1) * 0.02, -0.72, 0);
        finger.rotation.z = (f - 1) * 0.15;
        arm.add(finger);
      }
    }

    // Trailing lower body
    this._leftLeg.position.set(0, 0.3, 0);
    this._body.add(this._leftLeg);
    this._rightLeg.position.set(0, 0.3, 0);
    this._body.add(this._rightLeg);
    const tailGeo = cyl(0.22, 0.01, 0.5, 12);
    const tail = new THREE.Mesh(tailGeo, ghostMat);
    tail.position.y = -0.1;
    this._leftLeg.add(tail);
  }

  // ---- Pit Lord builder ------------------------------------------------------

  private _buildPitLord(): void {
    const skinMat = mat(0x661122);
    const darkMat = mat(0x3a0a11);
    const hornMat = mat(0x222222);
    const eyeMat = mat(0xff4400, { emissive: 0xcc2200 });
    const wingMat = mat(0x440a0a, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const muscleMat = mat(0x771528);

    // Massive demon torso
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.7, 0.9, 0.6);
    torso.position.y = 3.2;
    this._body.add(torso);

    // Muscle definition on chest
    for (const s of [-1, 1]) {
      const pcGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const pc = new THREE.Mesh(pcGeo, muscleMat);
      pc.position.set(s * 0.25, 3.5, 0.35);
      pc.scale.set(1, 1.2, 0.5);
      this._body.add(pc);
    }
    // Abs ridge
    for (let i = 0; i < 3; i++) {
      const abGeo = new THREE.BoxGeometry(0.2, 0.08, 0.02);
      const ab = new THREE.Mesh(abGeo, muscleMat);
      ab.position.set(0, 2.9 + i * 0.15, 0.42);
      this._body.add(ab);
    }

    // Head — horned
    this._head.position.set(0, 4.2, 0.2);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this._head.add(headMesh);

    // Horns with ridges
    for (const side of [-1, 1]) {
      const hGeo = new THREE.ConeGeometry(0.06, 0.5, 12);
      const horn = new THREE.Mesh(hGeo, hornMat);
      horn.position.set(side * 0.2, 0.25, -0.05);
      horn.rotation.z = side * -0.5;
      horn.rotation.x = -0.2;
      this._head.add(horn);
      // Horn ridges
      for (let r = 0; r < 3; r++) {
        const rgGeo = new THREE.TorusGeometry(0.04 - r * 0.008, 0.008, 6, 10);
        const rg = new THREE.Mesh(rgGeo, mat(0x333333));
        rg.position.set(side * (0.2 - r * side * 0.04), 0.12 + r * 0.1, -0.05);
        rg.rotation.x = Math.PI / 2;
        rg.rotation.z = side * -0.5;
        this._head.add(rg);
      }
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.12, 0.02, 0.24);
      this._head.add(eye);
    }

    // Wings (on arms) with membrane veins
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.8, 3.8, -0.2);
      this._body.add(arm);
      const wingBoneGeo = cyl(0.06, 0.04, 1.4, 12);
      const wingBone = new THREE.Mesh(wingBoneGeo, darkMat);
      wingBone.position.y = -0.5;
      wingBone.rotation.z = side * 0.6;
      arm.add(wingBone);
      const memGeo = new THREE.PlaneGeometry(1.2, 1.0);
      const membrane = new THREE.Mesh(memGeo, wingMat);
      membrane.position.set(side * 0.5, -0.5, 0);
      arm.add(membrane);
      // Wing membrane veins
      for (let v = 0; v < 3; v++) {
        const vGeo = cyl(0.012, 0.006, 0.8, 6);
        const vein = new THREE.Mesh(vGeo, darkMat);
        vein.position.set(side * (0.3 + v * 0.15), -0.4 - v * 0.1, 0.01);
        vein.rotation.z = side * (0.3 + v * 0.15);
        arm.add(vein);
      }
    }

    // Tail
    const tailGeo = cyl(0.08, 0.03, 1.2, 12);
    const tail = new THREE.Mesh(tailGeo, darkMat);
    tail.position.set(0, 2.5, -0.5);
    tail.rotation.x = 0.8;
    this._body.add(tail);
    // Tail barb
    const barbGeo = new THREE.ConeGeometry(0.05, 0.12, 8);
    const barb = new THREE.Mesh(barbGeo, hornMat);
    barb.position.set(0, 1.8, -1.15);
    barb.rotation.x = 0.8;
    this._body.add(barb);

    // Legs — cloven hooves
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.4, 2.0, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.2, 0.16, 0.9, 14);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.45;
      leg.add(thigh);
      const shinGeo = cyl(0.14, 0.08, 0.8, 14);
      const shin = new THREE.Mesh(shinGeo, darkMat);
      shin.position.y = -1.15;
      leg.add(shin);
      // Hooves
      const hoofGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const hoof = new THREE.Mesh(hoofGeo, hornMat);
      hoof.scale.set(1, 0.5, 1.3);
      hoof.position.set(0, -1.6, 0.04);
      leg.add(hoof);
    }
  }

  // ---- Doom Guard builder ----------------------------------------------------

  private _buildDoomGuard(): void {
    const armorMat = mat(0x2a1a1a, { metalness: 0.5, roughness: 0.4 });
    const skinMat = mat(0x551122);
    const spikeMat = mat(0x333333, { metalness: 0.7 });
    const eyeMat = mat(0xff2200, { emissive: 0xcc0000 });

    // Armored demon torso
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.scale.set(0.6, 0.8, 0.5);
    torso.position.y = 2.8;
    this._body.add(torso);

    // Armor plate lines on torso
    for (const yy of [2.5, 2.9, 3.3]) {
      const plGeo = new THREE.BoxGeometry(0.5, 0.02, 0.01);
      const pl = new THREE.Mesh(plGeo, spikeMat);
      pl.position.set(0, yy, 0.38);
      this._body.add(pl);
    }

    // Shoulder spikes (multiple per shoulder)
    for (const side of [-1, 1]) {
      const sGeo = new THREE.ConeGeometry(0.08, 0.35, 10);
      const spike = new THREE.Mesh(sGeo, spikeMat);
      spike.position.set(side * 0.6, 3.3, 0);
      spike.rotation.z = side * 0.4;
      this._body.add(spike);
      // Additional smaller spike
      const s2Geo = new THREE.ConeGeometry(0.05, 0.2, 8);
      const spike2 = new THREE.Mesh(s2Geo, spikeMat);
      spike2.position.set(side * 0.55, 3.15, 0.1);
      spike2.rotation.z = side * 0.5;
      this._body.add(spike2);
    }

    // Head — horned helm
    this._head.position.set(0, 3.7, 0.1);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.25, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    this._head.add(headMesh);

    // Horns
    for (const side of [-1, 1]) {
      const hGeo = new THREE.ConeGeometry(0.04, 0.3, 10);
      const horn = new THREE.Mesh(hGeo, spikeMat);
      horn.position.set(side * 0.18, 0.18, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
    }

    // Helm visor ridge
    const visorGeo = new THREE.BoxGeometry(0.3, 0.03, 0.02);
    const visor = new THREE.Mesh(visorGeo, spikeMat);
    visor.position.set(0, 0.06, 0.22);
    this._head.add(visor);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.1, 0, 0.2);
      this._head.add(eye);
    }

    // Arms — armored
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.65, 3.2, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.14, 0.12, 0.9, 14);
      const upper = new THREE.Mesh(upperGeo, armorMat);
      upper.position.y = -0.45;
      arm.add(upper);
      const foreGeo = cyl(0.12, 0.1, 0.8, 14);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -1.1;
      arm.add(fore);
      // Claw detail
      const fistGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const fist = new THREE.Mesh(fistGeo, armorMat);
      fist.position.y = -1.55;
      arm.add(fist);
      // Armor spikes on forearm
      const aspGeo = new THREE.ConeGeometry(0.025, 0.1, 6);
      const asp = new THREE.Mesh(aspGeo, spikeMat);
      asp.position.set(side * 0.08, -0.9, 0.08);
      asp.rotation.z = side * 0.3;
      arm.add(asp);
    }

    // Greatsword in right hand
    const bladeGeo = new THREE.BoxGeometry(0.06, 1.2, 0.02);
    const blade = new THREE.Mesh(bladeGeo, mat(0x444444, { metalness: 0.8 }));
    blade.position.y = -2.2;
    this._rightArm.add(blade);
    // Sword crossguard
    const guardGeo = new THREE.BoxGeometry(0.2, 0.04, 0.04);
    const guard = new THREE.Mesh(guardGeo, spikeMat);
    guard.position.y = -1.6;
    this._rightArm.add(guard);

    // Legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 1.8, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.16, 0.13, 0.8, 14);
      const thigh = new THREE.Mesh(thighGeo, armorMat);
      thigh.position.y = -0.4;
      leg.add(thigh);
      const shinGeo = cyl(0.13, 0.1, 0.7, 14);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -1.0;
      leg.add(shin);
      const hoofGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const hoof = new THREE.Mesh(hoofGeo, spikeMat);
      hoof.scale.set(1, 0.5, 1.3);
      hoof.position.set(0, -1.4, 0.04);
      leg.add(hoof);
    }
  }

  // ---- Succubus builder ------------------------------------------------------

  private _buildSuccubus(): void {
    const skinMat = mat(0x8844aa);
    const wingMat = mat(0x552266, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const hairMat = mat(0x220022);
    const eyeMat = mat(0xff44ff, { emissive: 0xcc22cc });
    const hornMat = mat(0x222222);

    // Slender body
    const torsoGeo = cyl(0.15, 0.2, 1.4, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.position.y = 1.8;
    this._body.add(torso);

    // Head
    this._head.position.set(0, 2.6, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.16, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this._head.add(headMesh);

    // Small horns with ridges
    for (const side of [-1, 1]) {
      const hGeo = new THREE.ConeGeometry(0.02, 0.12, 8);
      const horn = new THREE.Mesh(hGeo, hornMat);
      horn.position.set(side * 0.1, 0.14, 0);
      horn.rotation.z = side * -0.3;
      this._head.add(horn);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.06, 0.02, 0.13);
      this._head.add(eye);
    }

    // Hair
    for (let i = 0; i < 4; i++) {
      const hGeo = cyl(0.015, 0.008, 0.3, 4);
      const hair = new THREE.Mesh(hGeo, hairMat);
      hair.position.set((Math.random() - 0.5) * 0.12, -0.05, -0.08);
      hair.rotation.x = 0.3;
      this._head.add(hair);
    }

    // Wing arms with membrane veins
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.25, 2.2, -0.1);
      this._body.add(arm);
      const wingBoneGeo = cyl(0.03, 0.02, 0.7, 10);
      const wingBone = new THREE.Mesh(wingBoneGeo, skinMat);
      wingBone.position.y = -0.2;
      wingBone.rotation.z = side * 0.5;
      arm.add(wingBone);
      const memGeo = new THREE.PlaneGeometry(0.6, 0.5);
      const membrane = new THREE.Mesh(memGeo, wingMat);
      membrane.position.set(side * 0.25, -0.3, 0);
      arm.add(membrane);
      // Wing veins
      for (let v = 0; v < 2; v++) {
        const vGeo = cyl(0.008, 0.004, 0.4, 6);
        const vein = new THREE.Mesh(vGeo, mat(0x662244));
        vein.position.set(side * (0.15 + v * 0.12), -0.25, 0.01);
        vein.rotation.z = side * (0.2 + v * 0.15);
        arm.add(vein);
      }
    }

    // Tail
    const tailGeo = cyl(0.03, 0.015, 0.8, 10);
    const tail = new THREE.Mesh(tailGeo, skinMat);
    tail.position.set(0, 1.2, -0.2);
    tail.rotation.x = 0.6;
    this._body.add(tail);
    // Tail tip (heart-shaped)
    const tipGeo = new THREE.ConeGeometry(0.04, 0.08, 8);
    const tip = new THREE.Mesh(tipGeo, hornMat);
    tip.position.set(0, 0.8, -0.65);
    this._body.add(tip);

    // Legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.12, 1.0, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.08, 0.06, 0.55, 12);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.28;
      leg.add(thigh);
      const shinGeo = cyl(0.06, 0.04, 0.5, 12);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.7;
      leg.add(shin);
      // Clawed feet
      for (let t = -1; t <= 1; t++) {
        const clGeo = new THREE.ConeGeometry(0.008, 0.04, 6);
        const claw = new THREE.Mesh(clGeo, hornMat);
        claw.position.set(t * 0.02, -0.95, 0.03);
        claw.rotation.x = 0.3;
        leg.add(claw);
      }
    }
  }

  // ---- Imp Overlord builder --------------------------------------------------

  private _buildImpOverlord(): void {
    const skinMat = mat(0xcc4422);
    const darkMat = mat(0x882211);
    const hornMat = mat(0x222222);
    const eyeMat = mat(0xffcc00, { emissive: 0xff8800 });
    const wingMat = mat(0x993311, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 });

    // Stocky imp body — larger than regular imp
    const torsoGeo = new THREE.SphereGeometry(1, 16, 12);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.scale.set(0.25, 0.3, 0.22);
    torso.position.y = 1.0;
    this._body.add(torso);

    // Head — large relative to body
    this._head.position.set(0, 1.4, 0.05);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this._head.add(headMesh);

    // Large horns
    for (const side of [-1, 1]) {
      const hGeo = new THREE.ConeGeometry(0.03, 0.2, 10);
      const horn = new THREE.Mesh(hGeo, hornMat);
      horn.position.set(side * 0.12, 0.16, 0);
      horn.rotation.z = side * -0.4;
      this._head.add(horn);
    }

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(0.06, 10, 8);
    const brow = new THREE.Mesh(browGeo, darkMat);
    brow.position.set(0, 0.08, 0.1);
    brow.scale.set(2.2, 0.5, 0.8);
    this._head.add(brow);

    // Eyes — glowing
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.07, 0.03, 0.14);
      this._head.add(eye);
    }

    // Ears — pointed
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.04, 0.1, 8);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.16, 0.06, 0);
      ear.rotation.z = side * 0.5;
      this._head.add(ear);
    }

    // Small bat wings
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.22, 1.2, -0.05);
      this._body.add(arm);
      const wingBoneGeo = cyl(0.02, 0.015, 0.4, 5);
      const wingBone = new THREE.Mesh(wingBoneGeo, darkMat);
      wingBone.position.y = -0.1;
      wingBone.rotation.z = side * 0.5;
      arm.add(wingBone);
      const memGeo = new THREE.PlaneGeometry(0.35, 0.25);
      const membrane = new THREE.Mesh(memGeo, wingMat);
      membrane.position.set(side * 0.15, -0.15, 0);
      arm.add(membrane);
    }

    // Tail
    const tailGeo = cyl(0.025, 0.01, 0.4, 5);
    const tail = new THREE.Mesh(tailGeo, darkMat);
    tail.position.set(0, 0.7, -0.15);
    tail.rotation.x = 0.6;
    this._body.add(tail);

    // Legs — short, clawed
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.1, 0.6, 0);
      this._body.add(leg);
      const lGeo = cyl(0.05, 0.04, 0.35, 6);
      const legMesh = new THREE.Mesh(lGeo, skinMat);
      legMesh.position.y = -0.18;
      leg.add(legMesh);
      const footGeo = new THREE.SphereGeometry(0.05, 5, 5);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.scale.set(1, 0.5, 1.3);
      foot.position.set(0, -0.38, 0.02);
      leg.add(foot);
    }

    // Fire orb in front (commanding)
    const orbGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const orb = new THREE.Mesh(orbGeo, mat(0xff6600, { emissive: 0xcc4400 }));
    orb.position.set(0, 1.2, 0.3);
    this._body.add(orb);
  }

  // ---- Seraphim builder ------------------------------------------------------

  private _buildSeraphim(): void {
    const glowMat = mat(0xffffcc, { emissive: 0xccaa44 });
    const robeMat = mat(0xeeeecc);
    const wingMat = mat(0xffffee, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const eyeMat = mat(0xffffaa, { emissive: 0xffff66 });
    const haloMat = mat(0xffdd44, { emissive: 0xccaa22 });

    // Robed body
    const bodyGeo = cyl(0.15, 0.35, 2.0, 16);
    const body = new THREE.Mesh(bodyGeo, robeMat);
    body.position.y = 1.4;
    this._body.add(body);

    // Robe fold lines
    for (let i = 0; i < 4; i++) {
      const foldGeo = new THREE.BoxGeometry(0.01, 1.8, 0.015);
      const fold = new THREE.Mesh(foldGeo, mat(0xddddbb));
      const a = (i / 4) * Math.PI * 2;
      fold.position.set(Math.cos(a) * 0.22, 1.4, Math.sin(a) * 0.22);
      fold.rotation.y = -a;
      this._body.add(fold);
    }

    // Inner glow
    const coreGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const core = new THREE.Mesh(coreGeo, glowMat);
    core.position.y = 2.2;
    this._body.add(core);

    // Head
    this._head.position.set(0, 2.8, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.2, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, robeMat);
    this._head.add(headMesh);

    // Halo with glow detail
    const haloGeo = new THREE.TorusGeometry(0.22, 0.025, 12, 24);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 0.3;
    halo.rotation.x = Math.PI / 2;
    this._head.add(halo);
    // Halo outer glow ring
    const hgGeo = new THREE.TorusGeometry(0.24, 0.01, 8, 24);
    const hg = new THREE.Mesh(hgGeo, mat(0xffee88, { emissive: 0xccaa44, transparent: true, opacity: 0.5 }));
    hg.position.y = 0.3;
    hg.rotation.x = Math.PI / 2;
    this._head.add(hg);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.07, 0.02, 0.16);
      this._head.add(eye);
    }

    // Three pairs of wings (6 total — seraphim style)
    for (let pair = 0; pair < 3; pair++) {
      const yOff = 2.4 - pair * 0.4;
      const wingSize = 0.7 - pair * 0.1;
      for (const side of [-1, 1]) {
        const arm = pair === 0 ? (side === -1 ? this._leftArm : this._rightArm) : new THREE.Group();
        if (pair === 0) {
          arm.position.set(side * 0.25, yOff, -0.1);
          this._body.add(arm);
        } else {
          arm.position.set(side * 0.2, yOff, -0.1);
          this._body.add(arm);
        }
        const boneGeo = cyl(0.02, 0.015, wingSize * 0.8, 5);
        const bone = new THREE.Mesh(boneGeo, robeMat);
        bone.rotation.z = side * 0.6;
        bone.position.set(side * 0.15, 0, 0);
        arm.add(bone);
        const memGeo = new THREE.PlaneGeometry(wingSize, wingSize * 0.6);
        const mem = new THREE.Mesh(memGeo, wingMat);
        mem.position.set(side * (wingSize * 0.4), -0.05, 0);
        arm.add(mem);
      }
    }

    // Floating lower body (no legs visible — robed)
    this._leftLeg.position.set(-0.08, 0.4, 0);
    this._body.add(this._leftLeg);
    this._rightLeg.position.set(0.08, 0.4, 0);
    this._body.add(this._rightLeg);
    const hemGeo = cyl(0.3, 0.05, 0.5, 6);
    const hem = new THREE.Mesh(hemGeo, robeMat);
    hem.position.y = -0.1;
    this._leftLeg.add(hem);
  }

  // ---- Archon builder --------------------------------------------------------

  private _buildArchon(): void {
    const armorMat = mat(0xddddaa, { metalness: 0.6, roughness: 0.3 });
    const skinMat = mat(0xeeddbb);
    const wingMat = mat(0xeeeeee, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const eyeMat = mat(0xffffaa, { emissive: 0xffff66 });
    const swordMat = mat(0xccccaa, { metalness: 0.8, roughness: 0.2 });
    const haloMat = mat(0xffdd44, { emissive: 0xccaa22 });

    // Armored torso
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.scale.set(0.45, 0.6, 0.35);
    torso.position.y = 2.5;
    this._body.add(torso);

    // Armor engraving lines
    for (let i = 0; i < 3; i++) {
      const egGeo = new THREE.BoxGeometry(0.25, 0.01, 0.01);
      const eg = new THREE.Mesh(egGeo, mat(0xcccc88, { metalness: 0.5 }));
      eg.position.set(0, 2.3 + i * 0.15, 0.26);
      this._body.add(eg);
    }

    // Shoulder guards
    for (const side of [-1, 1]) {
      const sGeo = new THREE.SphereGeometry(0.15, 14, 10);
      const shoulder = new THREE.Mesh(sGeo, armorMat);
      shoulder.position.set(side * 0.45, 2.9, 0);
      this._body.add(shoulder);
      // Shoulder edge trim
      const stGeo = new THREE.TorusGeometry(0.14, 0.01, 6, 14);
      const st = new THREE.Mesh(stGeo, mat(0xcccc88, { metalness: 0.5 }));
      st.position.set(side * 0.45, 2.9, 0);
      st.rotation.x = Math.PI / 2;
      this._body.add(st);
    }

    // Head
    this._head.position.set(0, 3.2, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this._head.add(headMesh);

    // Helm
    const helmGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const helm = new THREE.Mesh(helmGeo, armorMat);
    helm.scale.set(1, 1.1, 1);
    helm.position.y = 0.03;
    this._head.add(helm);

    // Halo with glow
    const haloGeo = new THREE.TorusGeometry(0.24, 0.02, 12, 24);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 0.32;
    halo.rotation.x = Math.PI / 2;
    this._head.add(halo);
    // Halo outer glow
    const hogGeo = new THREE.TorusGeometry(0.26, 0.008, 8, 24);
    const hog = new THREE.Mesh(hogGeo, mat(0xffee88, { emissive: 0xccaa44, transparent: true, opacity: 0.5 }));
    hog.position.y = 0.32;
    hog.rotation.x = Math.PI / 2;
    this._head.add(hog);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.03, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.08, 0.02, 0.18);
      this._head.add(eye);
    }

    // Wing arms — large feathered with layered feathers
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.5, 2.8, -0.15);
      this._body.add(arm);
      // Wing bone
      const bGeo = cyl(0.04, 0.03, 1.0, 12);
      const bone = new THREE.Mesh(bGeo, skinMat);
      bone.rotation.z = side * 0.5;
      bone.position.set(side * 0.2, 0, 0);
      arm.add(bone);
      // Wing membrane
      const memGeo = new THREE.PlaneGeometry(1.0, 0.8);
      const mem = new THREE.Mesh(memGeo, wingMat);
      mem.position.set(side * 0.45, -0.1, 0);
      arm.add(mem);
      // Primary feather layers
      for (let i = 0; i < 5; i++) {
        const fGeo = new THREE.PlaneGeometry(0.12, 0.4);
        const feather = new THREE.Mesh(fGeo, wingMat);
        feather.position.set(side * (0.25 + i * 0.12), -0.35, 0.01);
        feather.rotation.z = side * (0.1 + i * 0.08);
        arm.add(feather);
      }
      // Secondary feather layer (shorter, closer to body)
      for (let i = 0; i < 3; i++) {
        const sfGeo = new THREE.PlaneGeometry(0.1, 0.25);
        const sf = new THREE.Mesh(sfGeo, wingMat);
        sf.position.set(side * (0.15 + i * 0.12), -0.15, -0.01);
        sf.rotation.z = side * (0.05 + i * 0.06);
        arm.add(sf);
      }
    }

    // Sword in right
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.9, 0.015);
    const blade = new THREE.Mesh(bladeGeo, swordMat);
    blade.position.set(0.3, -0.6, 0.2);
    this._rightArm.add(blade);

    // Legs — armored
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.2, 1.8, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.1, 0.08, 0.7, 6);
      const thigh = new THREE.Mesh(thighGeo, armorMat);
      thigh.position.y = -0.35;
      leg.add(thigh);
      const shinGeo = cyl(0.08, 0.09, 0.65, 6);
      const shin = new THREE.Mesh(shinGeo, armorMat);
      shin.position.y = -0.9;
      leg.add(shin);
      const footGeo = new THREE.SphereGeometry(0.1, 6, 5);
      const foot = new THREE.Mesh(footGeo, armorMat);
      foot.scale.set(1, 0.5, 1.3);
      foot.position.set(0, -1.3, 0.03);
      leg.add(foot);
    }
  }

  // ---- Alpha Wolf builder ----------------------------------------------------

  private _buildAlphaWolf(): void {
    const furMat = mat(0x555555);
    const darkFurMat = mat(0x333333);
    const bellyMat = mat(0x888888);
    const eyeMat = mat(0xffcc00, { emissive: 0xcc8800 });
    const noseMat = mat(0x111111);

    // Elongated body — quadruped
    const torsoGeo = new THREE.SphereGeometry(1, 18, 14);
    const torso = new THREE.Mesh(torsoGeo, furMat);
    torso.scale.set(0.25, 0.22, 0.45);
    torso.position.y = 0.8;
    this._body.add(torso);

    // Belly
    const bGeo = new THREE.SphereGeometry(1, 16, 12);
    const belly = new THREE.Mesh(bGeo, bellyMat);
    belly.scale.set(0.18, 0.15, 0.35);
    belly.position.set(0, 0.65, 0);
    this._body.add(belly);

    // Fur tufts on back/shoulders
    for (let i = 0; i < 4; i++) {
      const tfGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const tuft = new THREE.Mesh(tfGeo, darkFurMat);
      tuft.position.set((Math.random() - 0.5) * 0.15, 0.95 + i * 0.02, -0.1 + i * 0.08);
      tuft.scale.set(1.5, 0.6, 1.5);
      this._body.add(tuft);
    }

    // Head
    this._head.position.set(0, 1.0, 0.4);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(1, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, furMat);
    headMesh.scale.set(0.14, 0.12, 0.16);
    this._head.add(headMesh);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(1, 12, 10);
    const snout = new THREE.Mesh(snoutGeo, darkFurMat);
    snout.scale.set(0.08, 0.06, 0.12);
    snout.position.set(0, -0.02, 0.14);
    this._head.add(snout);

    // Nose
    const nGeo = new THREE.SphereGeometry(0.025, 10, 10);
    const nose = new THREE.Mesh(nGeo, noseMat);
    nose.position.set(0, 0, 0.22);
    this._head.add(nose);

    // Cheek fur tufts
    for (const side of [-1, 1]) {
      const cfGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const cheek = new THREE.Mesh(cfGeo, furMat);
      cheek.position.set(side * 0.1, -0.02, 0.04);
      cheek.scale.set(0.8, 1.2, 0.6);
      this._head.add(cheek);
    }

    // Ears — pointed
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.04, 0.1, 10);
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(side * 0.08, 0.12, -0.02);
      this._head.add(ear);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.02, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.07, 0.04, 0.1);
      this._head.add(eye);
    }

    // Front legs (arms)
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.15, 0.55, 0.25);
      this._body.add(arm);
      const upperGeo = cyl(0.05, 0.04, 0.35, 12);
      const upper = new THREE.Mesh(upperGeo, furMat);
      upper.position.y = -0.18;
      arm.add(upper);
      const lowerGeo = cyl(0.04, 0.03, 0.3, 12);
      const lower = new THREE.Mesh(lowerGeo, furMat);
      lower.position.y = -0.45;
      arm.add(lower);
      const pawGeo = new THREE.SphereGeometry(0.04, 10, 10);
      const paw = new THREE.Mesh(pawGeo, darkFurMat);
      paw.scale.set(1, 0.5, 1.2);
      paw.position.set(0, -0.6, 0.01);
      arm.add(paw);
      // Claws
      for (let t = -1; t <= 1; t++) {
        const clGeo = new THREE.ConeGeometry(0.006, 0.03, 6);
        const claw = new THREE.Mesh(clGeo, mat(0x222222));
        claw.position.set(t * 0.015, -0.63, 0.025);
        claw.rotation.x = 0.3;
        arm.add(claw);
      }
    }

    // Hind legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.15, 0.6, -0.25);
      this._body.add(leg);
      const upperGeo = cyl(0.06, 0.05, 0.35, 12);
      const upper = new THREE.Mesh(upperGeo, furMat);
      upper.position.y = -0.18;
      leg.add(upper);
      const lowerGeo = cyl(0.04, 0.035, 0.3, 12);
      const lower = new THREE.Mesh(lowerGeo, furMat);
      lower.position.y = -0.45;
      leg.add(lower);
      const pawGeo = new THREE.SphereGeometry(0.045, 10, 10);
      const paw = new THREE.Mesh(pawGeo, darkFurMat);
      paw.scale.set(1, 0.5, 1.2);
      paw.position.set(0, -0.6, 0.01);
      leg.add(paw);
    }

    // Bushy tail with fur layers
    const tailGeo = cyl(0.06, 0.03, 0.4, 12);
    const tail = new THREE.Mesh(tailGeo, darkFurMat);
    tail.position.set(0, 0.85, -0.45);
    tail.rotation.x = 0.8;
    this._body.add(tail);
    // Tail fur tuft
    const ttGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const tt = new THREE.Mesh(ttGeo, furMat);
    tt.position.set(0, 0.68, -0.6);
    tt.scale.set(1, 0.7, 1.5);
    this._body.add(tt);
  }

  // ---- Thunderhawk builder ---------------------------------------------------

  private _buildThunderhawk(): void {
    const featherMat = mat(0x554422);
    const darkMat = mat(0x332211);
    const breastMat = mat(0xaa9966);
    const beakMat = mat(0xccaa33);
    const eyeMat = mat(0xffcc00, { emissive: 0xcc8800 });
    const talonMat = mat(0x333333);
    const wingMat = mat(0x443322, { side: THREE.DoubleSide });

    // Compact body
    const torsoGeo = new THREE.SphereGeometry(1, 18, 14);
    const torso = new THREE.Mesh(torsoGeo, featherMat);
    torso.scale.set(0.2, 0.22, 0.3);
    torso.position.y = 1.2;
    this._body.add(torso);

    // Breast with feather layers
    const bGeo = new THREE.SphereGeometry(1, 16, 12);
    const breast = new THREE.Mesh(bGeo, breastMat);
    breast.scale.set(0.15, 0.16, 0.22);
    breast.position.set(0, 1.1, 0.08);
    this._body.add(breast);

    // Breast feather detail
    for (let i = 0; i < 3; i++) {
      const bfGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const bf = new THREE.Mesh(bfGeo, breastMat);
      bf.position.set((i - 1) * 0.04, 1.05 - i * 0.02, 0.18);
      bf.scale.set(1, 0.5, 0.8);
      this._body.add(bf);
    }

    // Head
    this._head.position.set(0, 1.5, 0.15);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.12, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, featherMat);
    this._head.add(headMesh);

    // Beak (sharper)
    const beakGeo = new THREE.ConeGeometry(0.03, 0.12, 10);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, -0.02, 0.12);
    beak.rotation.x = Math.PI / 2;
    this._head.add(beak);
    // Beak hook
    const hookGeo = new THREE.ConeGeometry(0.015, 0.03, 6);
    const hook = new THREE.Mesh(hookGeo, beakMat);
    hook.position.set(0, -0.035, 0.17);
    hook.rotation.x = Math.PI * 0.7;
    this._head.add(hook);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.06, 0.03, 0.08);
      this._head.add(eye);
    }

    // Wings (arms)
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.2, 1.3, 0);
      this._body.add(arm);
      const boneGeo = cyl(0.03, 0.02, 0.6, 5);
      const bone = new THREE.Mesh(boneGeo, darkMat);
      bone.rotation.z = side * 0.5;
      bone.position.set(side * 0.15, 0, 0);
      arm.add(bone);
      const memGeo = new THREE.PlaneGeometry(0.7, 0.4);
      const mem = new THREE.Mesh(memGeo, wingMat);
      mem.position.set(side * 0.3, -0.05, 0);
      arm.add(mem);
      // Flight feathers
      for (let i = 0; i < 5; i++) {
        const fGeo = new THREE.PlaneGeometry(0.08, 0.25);
        const feather = new THREE.Mesh(fGeo, wingMat);
        feather.position.set(side * (0.15 + i * 0.1), -0.2, 0.01);
        feather.rotation.z = side * (0.05 + i * 0.05);
        arm.add(feather);
      }
    }

    // Tail feathers
    for (let i = 0; i < 3; i++) {
      const fGeo = new THREE.PlaneGeometry(0.06, 0.2);
      const feather = new THREE.Mesh(fGeo, darkMat);
      feather.position.set((i - 1) * 0.04, 1.0, -0.3);
      feather.rotation.x = 0.5;
      this._body.add(feather);
    }

    // Taloned legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.1, 0.85, 0);
      this._body.add(leg);
      const lGeo = cyl(0.025, 0.02, 0.4, 10);
      const legMesh = new THREE.Mesh(lGeo, beakMat);
      legMesh.position.y = -0.2;
      leg.add(legMesh);
      // Talons (4 per foot)
      for (let t = -1; t <= 1; t++) {
        const clGeo = new THREE.ConeGeometry(0.008, 0.06, 8);
        const claw = new THREE.Mesh(clGeo, talonMat);
        claw.position.set(t * 0.015, -0.43, 0.02);
        claw.rotation.x = 0.3;
        leg.add(claw);
      }
      // Rear talon
      const rtGeo = new THREE.ConeGeometry(0.006, 0.04, 6);
      const rt = new THREE.Mesh(rtGeo, talonMat);
      rt.position.set(0, -0.42, -0.02);
      rt.rotation.x = -0.3;
      leg.add(rt);
    }

    // Lightning sparks around body
    for (let i = 0; i < 6; i++) {
      const sGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const spark = new THREE.Mesh(sGeo, mat(0x88ccff, { emissive: 0x4488ff }));
      spark.position.set((Math.random() - 0.5) * 0.4, 1.0 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
      this._body.add(spark);
    }
  }

  // ---- Dire Bear builder -----------------------------------------------------

  private _buildDireBear(): void {
    const furMat = mat(0x4a3322);
    const darkFurMat = mat(0x2a1a11);
    const snoutMat = mat(0x5a4433);
    const eyeMat = mat(0x332211);
    const noseMat = mat(0x111111);
    const clawMat = mat(0xccccbb);

    // Massive body — quadruped/semi-upright
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, furMat);
    torso.scale.set(0.55, 0.6, 0.7);
    torso.position.y = 1.5;
    this._body.add(torso);

    // Hump (shoulder mass)
    const humpGeo = new THREE.SphereGeometry(0.35, 16, 12);
    const hump = new THREE.Mesh(humpGeo, darkFurMat);
    hump.position.set(0, 2.0, 0.1);
    this._body.add(hump);

    // Fur tufts on back
    for (let i = 0; i < 5; i++) {
      const tfGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const tuft = new THREE.Mesh(tfGeo, darkFurMat);
      tuft.position.set((Math.random() - 0.5) * 0.3, 1.9 + Math.random() * 0.3, -0.2 + Math.random() * 0.3);
      tuft.scale.set(1.3, 0.5, 1.3);
      this._body.add(tuft);
    }

    // Head
    this._head.position.set(0, 2.1, 0.5);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(1, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, furMat);
    headMesh.scale.set(0.22, 0.2, 0.22);
    this._head.add(headMesh);

    // Snout
    const sGeo = new THREE.SphereGeometry(1, 12, 10);
    const snout = new THREE.Mesh(sGeo, snoutMat);
    snout.scale.set(0.12, 0.1, 0.14);
    snout.position.set(0, -0.04, 0.18);
    this._head.add(snout);

    // Nose
    const nGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const nose = new THREE.Mesh(nGeo, noseMat);
    nose.position.set(0, 0, 0.28);
    this._head.add(nose);

    // Small ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(0.05, 10, 10);
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(side * 0.14, 0.14, -0.02);
      this._head.add(ear);
    }

    // Brow ridge
    const browGeo = new THREE.SphereGeometry(0.08, 10, 8);
    const brow = new THREE.Mesh(browGeo, darkFurMat);
    brow.position.set(0, 0.08, 0.1);
    brow.scale.set(2.0, 0.5, 0.8);
    this._head.add(brow);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.1, 0.06, 0.14);
      this._head.add(eye);
    }

    // Front legs (arms) — massive
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.35, 1.0, 0.3);
      this._body.add(arm);
      const upperGeo = cyl(0.12, 0.1, 0.5, 7);
      const upper = new THREE.Mesh(upperGeo, furMat);
      upper.position.y = -0.25;
      arm.add(upper);
      const lowerGeo = cyl(0.1, 0.08, 0.45, 7);
      const lower = new THREE.Mesh(lowerGeo, furMat);
      lower.position.y = -0.6;
      arm.add(lower);
      const pawGeo = new THREE.SphereGeometry(0.1, 6, 5);
      const paw = new THREE.Mesh(pawGeo, darkFurMat);
      paw.scale.set(1.2, 0.5, 1.3);
      paw.position.set(0, -0.85, 0.02);
      arm.add(paw);
      // Claws
      for (let t = -1; t <= 1; t++) {
        const clGeo = new THREE.ConeGeometry(0.012, 0.06, 4);
        const claw = new THREE.Mesh(clGeo, clawMat);
        claw.position.set(t * 0.03, -0.9, 0.06);
        claw.rotation.x = 0.3;
        arm.add(claw);
      }
    }

    // Hind legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 1.0, -0.3);
      this._body.add(leg);
      const upperGeo = cyl(0.11, 0.09, 0.45, 7);
      const upper = new THREE.Mesh(upperGeo, furMat);
      upper.position.y = -0.22;
      leg.add(upper);
      const lowerGeo = cyl(0.09, 0.08, 0.4, 7);
      const lower = new THREE.Mesh(lowerGeo, furMat);
      lower.position.y = -0.55;
      leg.add(lower);
      const pawGeo = new THREE.SphereGeometry(0.09, 6, 5);
      const paw = new THREE.Mesh(pawGeo, darkFurMat);
      paw.scale.set(1.1, 0.5, 1.2);
      paw.position.set(0, -0.8, 0.02);
      leg.add(paw);
    }
  }

  // ---- Magma Titan builder ----------------------------------------------------

  private _buildMagmaTitan(): void {
    const rockMat = mat(0x3a2a1a);
    const darkRockMat = mat(0x221510);
    const obsidianMat = mat(0x1a1018, { metalness: 0.4, roughness: 0.15 });
    const lavaMat = mat(0xff4400, { emissive: 0xcc2200 });
    const lavaDeepMat = mat(0xff2200, { emissive: 0xdd1100 });
    const lavaGlowMat = mat(0xffaa00, { emissive: 0xff6600, transparent: true, opacity: 0.6 });
    const eyeMat = mat(0xffaa00, { emissive: 0xff6600 });
    const smokeMat = mat(0x444444, { transparent: true, opacity: 0.2 });
    const ashMat = mat(0x2a2020);

    // --- Torso (layered igneous rock formations) ---
    // Inner molten core
    const coreGeo = new THREE.SphereGeometry(0.6, 16, 14);
    const core = new THREE.Mesh(coreGeo, lavaDeepMat);
    core.position.y = 3.5;
    this._body.add(core);
    // Outer rock shell (fragmented plates around the core)
    for (let i = 0; i < 8; i++) {
      const plateSize = 0.25 + Math.random() * 0.15;
      const plGeo = new THREE.SphereGeometry(plateSize, 10, 8);
      const plate = new THREE.Mesh(plGeo, i % 3 === 0 ? darkRockMat : rockMat);
      const a = (i / 8) * Math.PI * 2;
      const r = 0.55 + Math.random() * 0.1;
      plate.scale.set(1.4, 0.6, 1.2);
      plate.position.set(Math.cos(a) * r, 3.2 + (i % 4) * 0.3, Math.sin(a) * r * 0.8);
      plate.rotation.set(Math.random() * 0.3, a, Math.random() * 0.2);
      this._body.add(plate);
    }
    // Obsidian patches (cooled shiny black rock)
    for (let i = 0; i < 4; i++) {
      const obGeo = new THREE.SphereGeometry(0.12, 8, 6);
      const ob = new THREE.Mesh(obGeo, obsidianMat);
      ob.scale.set(1.8, 0.4, 1.5);
      const a = (i / 4) * Math.PI * 2 + 0.4;
      ob.position.set(Math.cos(a) * 0.65, 3.6 + i * 0.15, Math.sin(a) * 0.55);
      this._body.add(ob);
    }

    // Lava channels (flowing between rock plates)
    for (let i = 0; i < 10; i++) {
      const crLen = 0.2 + Math.random() * 0.25;
      const crackGeo = new THREE.BoxGeometry(0.035, crLen, 0.025);
      const crack = new THREE.Mesh(crackGeo, lavaMat);
      const a = (i / 10) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.15;
      crack.position.set(Math.cos(a) * r, 2.9 + Math.random() * 1.4, Math.sin(a) * r * 0.8);
      crack.rotation.z = (Math.random() - 0.5) * 0.6;
      crack.rotation.y = a;
      this._body.add(crack);
    }
    // Branching sub-cracks
    for (let i = 0; i < 5; i++) {
      const scGeo = new THREE.BoxGeometry(0.15, 0.02, 0.015);
      const sc = new THREE.Mesh(scGeo, lavaGlowMat);
      const a = Math.random() * Math.PI * 2;
      sc.position.set(Math.cos(a) * 0.58, 3.1 + Math.random() * 1.0, Math.sin(a) * 0.48);
      sc.rotation.z = Math.random() * 0.5;
      this._body.add(sc);
    }

    // Volcanic vents / fumaroles on shoulders
    for (const side of [-1, 1]) {
      // Vent chimney
      const vGeo = cyl(0.08, 0.06, 0.25, 10);
      const vent = new THREE.Mesh(vGeo, darkRockMat);
      vent.position.set(side * 0.65, 4.3, -0.2);
      this._body.add(vent);
      // Vent rim
      const vrGeo = new THREE.TorusGeometry(0.07, 0.02, 8, 10);
      const vr = new THREE.Mesh(vrGeo, rockMat);
      vr.position.set(side * 0.65, 4.45, -0.2);
      vr.rotation.x = Math.PI / 2;
      this._body.add(vr);
      // Interior glow
      const vgGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const vg = new THREE.Mesh(vgGeo, lavaMat);
      vg.position.set(side * 0.65, 4.42, -0.2);
      this._body.add(vg);
      // Smoke wisps
      for (let s = 0; s < 3; s++) {
        const smGeo = new THREE.SphereGeometry(0.04 + s * 0.02, 8, 8);
        const sm = new THREE.Mesh(smGeo, smokeMat);
        sm.position.set(side * 0.65 + (Math.random() - 0.5) * 0.06, 4.5 + s * 0.1, -0.2);
        this._body.add(sm);
      }
    }

    // Rising ember particles
    for (let i = 0; i < 8; i++) {
      const emGeo = new THREE.SphereGeometry(0.02 + Math.random() * 0.025, 8, 8);
      const em = new THREE.Mesh(emGeo, mat(0xffaa00, { emissive: 0xff6600 }));
      em.position.set((Math.random() - 0.5) * 1.0, 4.2 + Math.random() * 1.5, (Math.random() - 0.5) * 0.7);
      this._body.add(em);
    }

    // --- Head (craggy rock skull with magma interior) ---
    this._head.position.set(0, 4.7, 0.2);
    this._body.add(this._head);
    // Rock cranium (irregular)
    const cranGeo = new THREE.SphereGeometry(0.38, 14, 12);
    const cran = new THREE.Mesh(cranGeo, rockMat);
    cran.scale.set(1.0, 0.85, 0.9);
    this._head.add(cran);
    // Brow ridge (heavy, craggy)
    const browGeo = new THREE.BoxGeometry(0.5, 0.08, 0.12);
    const browR = new THREE.Mesh(browGeo, darkRockMat);
    browR.position.set(0, 0.12, 0.25);
    this._head.add(browR);
    // Rock protrusions on crown (horn-like crags)
    for (let i = 0; i < 3; i++) {
      const hGeo = new THREE.ConeGeometry(0.04, 0.15 + i * 0.03, 6);
      const horn = new THREE.Mesh(hGeo, darkRockMat);
      horn.position.set(-0.1 + i * 0.1, 0.3, -0.05);
      horn.rotation.z = (i - 1) * 0.15;
      this._head.add(horn);
    }
    // Jaw (rock mandible with magma drool)
    const jawGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const jaw = new THREE.Mesh(jawGeo, darkRockMat);
    jaw.scale.set(1.1, 0.45, 0.8);
    jaw.position.set(0, -0.18, 0.1);
    this._head.add(jaw);
    // Magma drool from jaw
    const droolGeo = cyl(0.025, 0.01, 0.15, 8);
    const drool = new THREE.Mesh(droolGeo, lavaMat);
    drool.position.set(0.05, -0.3, 0.15);
    this._head.add(drool);
    const drool2Geo = cyl(0.02, 0.008, 0.12, 8);
    const drool2 = new THREE.Mesh(drool2Geo, lavaMat);
    drool2.position.set(-0.08, -0.28, 0.12);
    this._head.add(drool2);
    // Rock teeth (jagged)
    for (let t = -3; t <= 3; t++) {
      if (t === 0) continue;
      const tGeo = new THREE.ConeGeometry(0.02, 0.06 + Math.random() * 0.03, 5);
      const tooth = new THREE.Mesh(tGeo, rockMat);
      tooth.position.set(t * 0.035, -0.08, 0.28);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }
    // Head lava cracks (multiple)
    for (let c = 0; c < 3; c++) {
      const hcGeo = new THREE.BoxGeometry(0.02, 0.18, 0.012);
      const hc = new THREE.Mesh(hcGeo, lavaMat);
      hc.position.set(-0.1 + c * 0.12, 0.05, 0.3);
      hc.rotation.z = (c - 1) * 0.3;
      this._head.add(hc);
    }
    // Eyes — deep molten pools in rock sockets
    for (const side of [-1, 1]) {
      // Socket cavity
      const sockGeo = new THREE.SphereGeometry(0.065, 10, 8);
      const sock = new THREE.Mesh(sockGeo, ashMat);
      sock.position.set(side * 0.15, 0.04, 0.27);
      this._head.add(sock);
      // Molten eye core
      const eGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.15, 0.04, 0.3);
      this._head.add(eye);
      // Heat haze ring
      const hrGeo = new THREE.RingGeometry(0.04, 0.06, 12);
      const hr = new THREE.Mesh(hrGeo, lavaGlowMat);
      hr.position.set(side * 0.15, 0.04, 0.32);
      this._head.add(hr);
    }

    // --- Arms (rock segments with lava veins between them) ---
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.9, 3.9, 0);
      this._body.add(arm);

      // Shoulder rock boulder
      const shGeo = new THREE.SphereGeometry(0.2, 12, 10);
      const sh = new THREE.Mesh(shGeo, rockMat);
      sh.scale.set(1.3, 0.8, 1.1);
      arm.add(sh);

      // Upper arm (two rock segments with lava joint between)
      const u1Geo = cyl(0.2, 0.17, 0.6, 14);
      const u1 = new THREE.Mesh(u1Geo, rockMat);
      u1.position.y = -0.4;
      arm.add(u1);
      // Lava band (exposed between rock segments)
      const lbGeo = new THREE.TorusGeometry(0.17, 0.03, 8, 12);
      const lb = new THREE.Mesh(lbGeo, lavaMat);
      lb.position.y = -0.72;
      lb.rotation.x = Math.PI / 2;
      arm.add(lb);
      const u2Geo = cyl(0.18, 0.2, 0.5, 14);
      const u2 = new THREE.Mesh(u2Geo, darkRockMat);
      u2.position.y = -1.0;
      arm.add(u2);

      // Forearm
      const foreGeo = cyl(0.18, 0.2, 0.9, 14);
      const fore = new THREE.Mesh(foreGeo, darkRockMat);
      fore.position.y = -1.55;
      arm.add(fore);
      // Lava veins running down forearm
      for (let v = 0; v < 3; v++) {
        const avGeo = new THREE.BoxGeometry(0.02, 0.25 + v * 0.05, 0.012);
        const av = new THREE.Mesh(avGeo, lavaMat);
        const va = (v / 3) * Math.PI * 2;
        av.position.set(Math.cos(va) * 0.14, -1.4 - v * 0.1, Math.sin(va) * 0.14);
        av.rotation.y = va;
        arm.add(av);
      }

      // Rock fist with magma knuckles
      const fistGeo = new THREE.SphereGeometry(0.28, 14, 12);
      const fist = new THREE.Mesh(fistGeo, rockMat);
      fist.scale.set(1.0, 0.8, 0.9);
      fist.position.y = -2.1;
      arm.add(fist);
      // Magma knuckle cracks
      for (let k = 0; k < 3; k++) {
        const kkGeo = new THREE.BoxGeometry(0.02, 0.08, 0.01);
        const kk = new THREE.Mesh(kkGeo, lavaMat);
        kk.position.set((k - 1) * 0.08, -2.05, 0.22);
        arm.add(kk);
      }
      // Obsidian knuckle spikes
      for (let s = 0; s < 2; s++) {
        const spGeo = new THREE.ConeGeometry(0.03, 0.1, 6);
        const sp = new THREE.Mesh(spGeo, obsidianMat);
        sp.position.set((s - 0.5) * 0.12, -1.95, 0.2);
        arm.add(sp);
      }
    }

    // --- Legs (basalt columns with lava veins) ---
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.45, 2.3, 0);
      this._body.add(leg);

      // Thigh (chunky basalt)
      const thighGeo = cyl(0.25, 0.2, 0.55, 14);
      const thigh = new THREE.Mesh(thighGeo, rockMat);
      thigh.position.y = -0.3;
      leg.add(thigh);
      // Lava knee band
      const lkGeo = new THREE.TorusGeometry(0.19, 0.025, 8, 12);
      const lk = new THREE.Mesh(lkGeo, lavaMat);
      lk.position.y = -0.6;
      lk.rotation.x = Math.PI / 2;
      leg.add(lk);
      // Shin (darker rock with lava veins)
      const shinGeo = cyl(0.2, 0.25, 0.85, 14);
      const shin = new THREE.Mesh(shinGeo, darkRockMat);
      shin.position.y = -1.1;
      leg.add(shin);
      // Lava veins on shin
      for (let v = 0; v < 2; v++) {
        const svGeo = new THREE.BoxGeometry(0.02, 0.3, 0.012);
        const sv = new THREE.Mesh(svGeo, lavaMat);
        sv.position.set(v === 0 ? 0.12 : -0.1, -1.1, v === 0 ? 0.12 : -0.12);
        sv.rotation.z = (v - 0.5) * 0.2;
        leg.add(sv);
      }
      // Ankle — molten joint
      const ankGeo = new THREE.SphereGeometry(0.14, 12, 10);
      const ank = new THREE.Mesh(ankGeo, lavaMat);
      ank.position.y = -1.6;
      leg.add(ank);
      // Foot (volcanic rock slab with glowing underside)
      const footGeo = new THREE.SphereGeometry(0.3, 12, 10);
      const foot = new THREE.Mesh(footGeo, rockMat);
      foot.scale.set(1.0, 0.35, 1.3);
      foot.position.set(0, -1.78, 0.05);
      leg.add(foot);
      // Glowing lava cracks on foot
      for (let c = 0; c < 2; c++) {
        const fcGeo = new THREE.BoxGeometry(0.12, 0.01, 0.02);
        const fc = new THREE.Mesh(fcGeo, lavaMat);
        fc.position.set((c - 0.5) * 0.1, -1.7, 0.08);
        leg.add(fc);
      }
      // Stalagmite-like protrusions on shins
      for (let s = 0; s < 2; s++) {
        const stGeo = new THREE.ConeGeometry(0.03, 0.12, 6);
        const st = new THREE.Mesh(stGeo, darkRockMat);
        st.position.set(side * 0.15, -0.8 - s * 0.35, 0.12);
        leg.add(st);
      }
    }

    // Ground lava pool beneath
    const poolGeo = new THREE.SphereGeometry(0.6, 16, 8);
    const pool = new THREE.Mesh(poolGeo, lavaGlowMat);
    pool.scale.set(1.5, 0.08, 1.5);
    pool.position.y = 0.05;
    this._body.add(pool);
  }

  // ---- Stone Fist builder ----------------------------------------------------

  private _buildStoneFist(): void {
    const stoneMat = mat(0x7a7a6a);
    const darkStoneMat = mat(0x555548);
    const lightStoneMat = mat(0x8e8e7e);
    const sedimentMat = mat(0x6a6858);
    const mossMat = mat(0x4a6a3a);
    const lichMat = mat(0x8a9a5a, { roughness: 0.9 });
    const runeMat = mat(0x88cc44, { emissive: 0x446622, transparent: true, opacity: 0.7 });
    const eyeMat = mat(0x88cc44, { emissive: 0x446622 });
    const crackMat = mat(0x444438);
    const dirtMat = mat(0x5a4a3a);

    // --- Torso (layered sedimentary stone) ---
    // Lower torso — rounded stone mass
    const lowerGeo = cyl(0.42, 0.4, 0.55, 14);
    const lower = new THREE.Mesh(lowerGeo, stoneMat);
    lower.scale.set(1.0, 1.0, 0.77);
    lower.position.y = 1.6;
    this._body.add(lower);
    // Middle torso (slightly offset for natural look)
    const midGeo = cyl(0.45, 0.43, 0.5, 14);
    const mid = new THREE.Mesh(midGeo, darkStoneMat);
    mid.scale.set(1.0, 1.0, 0.78);
    mid.position.set(0.02, 2.1, 0);
    this._body.add(mid);
    // Upper torso
    const upperGeo = cyl(0.4, 0.38, 0.45, 14);
    const upper = new THREE.Mesh(upperGeo, lightStoneMat);
    upper.scale.set(1.0, 1.0, 0.75);
    upper.position.set(-0.02, 2.55, 0);
    this._body.add(upper);

    // Sediment layer lines between blocks
    for (const ly of [1.85, 2.35]) {
      const layGeo = new THREE.BoxGeometry(0.92, 0.025, 0.72);
      const lay = new THREE.Mesh(layGeo, sedimentMat);
      lay.position.y = ly;
      this._body.add(lay);
    }

    // Weathered erosion detail (irregular chips missing from edges)
    for (let i = 0; i < 6; i++) {
      const eGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 8, 6);
      const erosion = new THREE.Mesh(eGeo, dirtMat);
      erosion.scale.set(1.5, 0.8, 1.0);
      const edgeSide = i % 2 === 0 ? 1 : -1;
      erosion.position.set(edgeSide * 0.42, 1.5 + i * 0.2, (Math.random() - 0.5) * 0.3);
      this._body.add(erosion);
    }

    // Stone crack network on torso
    for (let i = 0; i < 5; i++) {
      const crGeo = new THREE.BoxGeometry(0.012, 0.3 + Math.random() * 0.15, 0.008);
      const cr = new THREE.Mesh(crGeo, crackMat);
      cr.position.set(-0.25 + i * 0.12, 1.6 + Math.random() * 0.8, 0.36);
      cr.rotation.z = (Math.random() - 0.5) * 0.4;
      this._body.add(cr);
      // Branching cracks
      if (i % 2 === 0) {
        const brGeo = new THREE.BoxGeometry(0.1, 0.01, 0.008);
        const br = new THREE.Mesh(brGeo, crackMat);
        br.position.set(cr.position.x + 0.05, cr.position.y + 0.1, 0.36);
        br.rotation.z = (Math.random() - 0.5) * 0.5;
        this._body.add(br);
      }
    }

    // Ancient carved rune on chest
    // Rune circle
    const rcGeo = new THREE.TorusGeometry(0.12, 0.012, 8, 16);
    const rc = new THREE.Mesh(rcGeo, runeMat);
    rc.position.set(0, 2.2, 0.36);
    this._body.add(rc);
    // Rune inner glyph (cross pattern)
    const rvGeo = new THREE.BoxGeometry(0.01, 0.18, 0.008);
    const rv = new THREE.Mesh(rvGeo, runeMat);
    rv.position.set(0, 2.2, 0.36);
    this._body.add(rv);
    const rhGeo = new THREE.BoxGeometry(0.18, 0.01, 0.008);
    const rh = new THREE.Mesh(rhGeo, runeMat);
    rh.position.set(0, 2.2, 0.36);
    this._body.add(rh);
    // Diagonal rune strokes
    const rd1Geo = new THREE.BoxGeometry(0.01, 0.12, 0.008);
    const rd1 = new THREE.Mesh(rd1Geo, runeMat);
    rd1.position.set(0, 2.2, 0.36);
    rd1.rotation.z = Math.PI / 4;
    this._body.add(rd1);
    const rd2Geo = new THREE.BoxGeometry(0.01, 0.12, 0.008);
    const rd2 = new THREE.Mesh(rd2Geo, runeMat);
    rd2.position.set(0, 2.2, 0.36);
    rd2.rotation.z = -Math.PI / 4;
    this._body.add(rd2);

    // --- Shoulder boulders (larger, more natural) ---
    for (const side of [-1, 1]) {
      const sGeo = new THREE.SphereGeometry(0.28, 14, 10);
      const shoulder = new THREE.Mesh(sGeo, darkStoneMat);
      shoulder.scale.set(1.2, 0.8, 1.0);
      shoulder.position.set(side * 0.55, 2.6, 0);
      this._body.add(shoulder);
      // Secondary boulder on top
      const s2Geo = new THREE.SphereGeometry(0.12, 10, 8);
      const s2 = new THREE.Mesh(s2Geo, lightStoneMat);
      s2.position.set(side * 0.6, 2.8, -0.05);
      this._body.add(s2);
      // Crack line on shoulder
      const scGeo = new THREE.BoxGeometry(0.01, 0.15, 0.008);
      const sc = new THREE.Mesh(scGeo, crackMat);
      sc.position.set(side * 0.5, 2.6, 0.2);
      sc.rotation.z = side * 0.3;
      this._body.add(sc);
    }

    // --- Head (weathered stone block with carved face) ---
    this._head.position.set(0, 2.9, 0);
    this._body.add(this._head);
    // Main head — weathered stone
    const headGeo = new THREE.SphereGeometry(0.2, 14, 12);
    const headMesh = new THREE.Mesh(headGeo, stoneMat);
    headMesh.scale.set(0.95, 0.8, 0.8);
    this._head.add(headMesh);
    // Brow ridge
    const browGeo = new THREE.SphereGeometry(0.2, 12, 8);
    const brow = new THREE.Mesh(browGeo, darkStoneMat);
    brow.scale.set(1.0, 0.3, 0.5);
    brow.position.set(0, 0.1, 0.14);
    this._head.add(brow);
    // Eye sockets (carved recesses)
    for (const side of [-1, 1]) {
      const sockGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const sock = new THREE.Mesh(sockGeo, crackMat);
      sock.position.set(side * 0.1, 0.02, 0.15);
      this._head.add(sock);
      // Glowing eyes
      const eGeo = new THREE.SphereGeometry(0.03, 12, 12);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.1, 0.02, 0.17);
      this._head.add(eye);
    }
    // Carved mouth line
    const mouthGeo = new THREE.BoxGeometry(0.15, 0.02, 0.03);
    const mouth = new THREE.Mesh(mouthGeo, crackMat);
    mouth.position.set(0, -0.08, 0.15);
    this._head.add(mouth);
    // Head erosion
    const heGeo = new THREE.SphereGeometry(0.05, 8, 6);
    const he = new THREE.Mesh(heGeo, dirtMat);
    he.position.set(0.15, 0.1, 0.1);
    this._head.add(he);

    // --- Arms (stone segments with massive fists) ---
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.58, 2.45, 0);
      this._body.add(arm);

      // Upper arm (two stone segments)
      const u1Geo = cyl(0.13, 0.11, 0.35, 12);
      const u1 = new THREE.Mesh(u1Geo, stoneMat);
      u1.position.y = -0.2;
      arm.add(u1);
      const u2Geo = cyl(0.11, 0.12, 0.3, 12);
      const u2 = new THREE.Mesh(u2Geo, darkStoneMat);
      u2.position.y = -0.5;
      arm.add(u2);

      // Elbow boulder joint
      const jGeo = new THREE.SphereGeometry(0.12, 12, 10);
      const j = new THREE.Mesh(jGeo, darkStoneMat);
      j.position.y = -0.65;
      arm.add(j);

      // Forearm (thickening toward fist)
      const foreGeo = cyl(0.1, 0.16, 0.55, 12);
      const fore = new THREE.Mesh(foreGeo, stoneMat);
      fore.position.y = -0.95;
      arm.add(fore);
      // Crack on forearm
      const fcGeo = new THREE.BoxGeometry(0.01, 0.2, 0.008);
      const fc = new THREE.Mesh(fcGeo, crackMat);
      fc.position.set(0.08, -0.9, 0.05);
      arm.add(fc);

      // --- Massive stone fist (detailed knuckles and fingers) ---
      // Fist base
      const fistGeo = new THREE.SphereGeometry(0.24, 14, 12);
      const fist = new THREE.Mesh(fistGeo, stoneMat);
      fist.scale.set(1.0, 0.85, 0.9);
      fist.position.y = -1.3;
      arm.add(fist);
      // Knuckle ridges (individual bumps)
      for (let k = 0; k < 4; k++) {
        const krGeo = new THREE.SphereGeometry(0.04, 8, 6);
        const kr = new THREE.Mesh(krGeo, darkStoneMat);
        kr.position.set((k - 1.5) * 0.05, -1.25, 0.18);
        arm.add(kr);
      }
      // Thumb
      const thGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const th = new THREE.Mesh(thGeo, lightStoneMat);
      th.scale.set(0.7, 1.0, 0.7);
      th.position.set(side * 0.15, -1.32, 0.1);
      arm.add(th);
      // Fist cracks
      const fcrGeo = new THREE.BoxGeometry(0.008, 0.12, 0.006);
      const fcr = new THREE.Mesh(fcrGeo, crackMat);
      fcr.position.set(0.05, -1.28, 0.2);
      fcr.rotation.z = 0.2;
      arm.add(fcr);
    }

    // --- Legs (squat stone pillars with big feet) ---
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.28, 1.25, 0);
      this._body.add(leg);

      // Thigh
      const thGeo = cyl(0.15, 0.13, 0.35, 12);
      const thigh = new THREE.Mesh(thGeo, stoneMat);
      thigh.position.y = -0.2;
      leg.add(thigh);
      // Knee boulder
      const kGeo = new THREE.SphereGeometry(0.1, 10, 8);
      const knee = new THREE.Mesh(kGeo, darkStoneMat);
      knee.position.set(0, -0.4, 0.05);
      leg.add(knee);
      // Shin
      const shGeo = cyl(0.13, 0.14, 0.35, 12);
      const shin = new THREE.Mesh(shGeo, darkStoneMat);
      shin.position.y = -0.6;
      leg.add(shin);
      // Crack on shin
      const lcGeo = new THREE.BoxGeometry(0.01, 0.15, 0.008);
      const lc = new THREE.Mesh(lcGeo, crackMat);
      lc.position.set(0.06, -0.55, 0.1);
      leg.add(lc);

      // Foot (wide stone slab)
      const footGeo = new THREE.BoxGeometry(0.28, 0.1, 0.35);
      const foot = new THREE.Mesh(footGeo, darkStoneMat);
      foot.position.set(0, -0.82, 0.04);
      leg.add(foot);
      // Toe bumps
      for (let t = 0; t < 3; t++) {
        const tGeo = new THREE.SphereGeometry(0.03, 8, 6);
        const toe = new THREE.Mesh(tGeo, stoneMat);
        toe.position.set((t - 1) * 0.08, -0.82, 0.2);
        leg.add(toe);
      }
    }

    // --- Moss and lichen (natural weathering details) ---
    // Moss patches (varied sizes, concentrated on upper surfaces)
    const mossPositions: [number, number, number, number][] = [
      [0.3, 2.8, 0.15, 0.07], [-0.2, 2.7, -0.2, 0.05],
      [0.4, 2.1, 0.3, 0.06], [-0.35, 1.8, 0.2, 0.05],
      [0.0, 2.85, -0.1, 0.04], [0.2, 1.6, -0.25, 0.06],
    ];
    for (const [mx, my, mz, mr] of mossPositions) {
      const mGeo = new THREE.SphereGeometry(mr, 10, 8);
      const moss = new THREE.Mesh(mGeo, mossMat);
      moss.scale.set(1.5, 0.4, 1.3);
      moss.position.set(mx, my, mz);
      this._body.add(moss);
    }
    // Lichen patches (flatter, different color)
    for (let i = 0; i < 4; i++) {
      const lGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const lich = new THREE.Mesh(lGeo, lichMat);
      lich.scale.set(2.0, 0.2, 1.5);
      lich.position.set((Math.random() - 0.5) * 0.5, 1.4 + Math.random() * 1.0, 0.3 + Math.random() * 0.1);
      this._body.add(lich);
    }

    // Small rubble/pebbles at base
    for (let i = 0; i < 4; i++) {
      const pGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 6, 6);
      const peb = new THREE.Mesh(pGeo, sedimentMat);
      peb.position.set((Math.random() - 0.5) * 0.6, 0.03, (Math.random() - 0.5) * 0.4);
      this._body.add(peb);
    }
  }

  // ---- Magma Golem builder ---------------------------------------------------

  private _buildMagmaGolem(): void {
    const rockMat = mat(0x4a3020);
    const darkMat = mat(0x2a1a10);
    const obsidianMat = mat(0x1a1018, { metalness: 0.4, roughness: 0.15 });
    const lavaMat = mat(0xff5500, { emissive: 0xcc3300 });
    const lavaGlowMat = mat(0xff8800, { emissive: 0xff5500, transparent: true, opacity: 0.5 });
    const eyeMat = mat(0xffcc00, { emissive: 0xff8800 });
    const ashMat = mat(0x2a2020);

    // --- Torso (molten core with fragmented rock shell) ---
    // Inner lava core
    const coreGeo = new THREE.SphereGeometry(0.35, 14, 12);
    const core = new THREE.Mesh(coreGeo, lavaMat);
    core.position.y = 2.2;
    this._body.add(core);
    // Rock shell plates (fragmenting away from core)
    for (let i = 0; i < 6; i++) {
      const plSize = 0.14 + Math.random() * 0.08;
      const plGeo = new THREE.SphereGeometry(plSize, 8, 6);
      const plate = new THREE.Mesh(plGeo, i % 2 === 0 ? rockMat : darkMat);
      const a = (i / 6) * Math.PI * 2;
      plate.scale.set(1.5, 0.55, 1.3);
      plate.position.set(Math.cos(a) * 0.4, 1.9 + (i % 3) * 0.25, Math.sin(a) * 0.35);
      plate.rotation.set(0, a, Math.random() * 0.2);
      this._body.add(plate);
    }
    // Obsidian patches (cooled glossy rock)
    for (let i = 0; i < 3; i++) {
      const obGeo = new THREE.SphereGeometry(0.08, 8, 6);
      const ob = new THREE.Mesh(obGeo, obsidianMat);
      ob.scale.set(1.5, 0.4, 1.3);
      const a = (i / 3) * Math.PI * 2 + 0.5;
      ob.position.set(Math.cos(a) * 0.45, 2.3 + i * 0.12, Math.sin(a) * 0.38);
      this._body.add(ob);
    }

    // Lava veins (branching network)
    for (let i = 0; i < 8; i++) {
      const vGeo = new THREE.BoxGeometry(0.025, 0.2 + Math.random() * 0.12, 0.015);
      const vein = new THREE.Mesh(vGeo, lavaMat);
      const a = (i / 8) * Math.PI * 2;
      vein.position.set(Math.cos(a) * 0.42, 1.75 + Math.random() * 0.9, Math.sin(a) * 0.36);
      vein.rotation.z = (Math.random() - 0.5) * 0.5;
      this._body.add(vein);
    }
    // Sub-veins
    for (let i = 0; i < 4; i++) {
      const svGeo = new THREE.BoxGeometry(0.1, 0.015, 0.01);
      const sv = new THREE.Mesh(svGeo, lavaGlowMat);
      const a = Math.random() * Math.PI * 2;
      sv.position.set(Math.cos(a) * 0.4, 2.0 + Math.random() * 0.6, Math.sin(a) * 0.35);
      this._body.add(sv);
    }

    // Ember particles
    for (let i = 0; i < 5; i++) {
      const emGeo = new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 8, 8);
      const em = new THREE.Mesh(emGeo, lavaGlowMat);
      em.position.set((Math.random() - 0.5) * 0.6, 2.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
      this._body.add(em);
    }

    // --- Head (craggy with magma glow from within) ---
    this._head.position.set(0, 3.05, 0.1);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.27, 12, 10);
    const headMesh = new THREE.Mesh(headGeo, rockMat);
    headMesh.scale.set(1.0, 0.9, 0.9);
    this._head.add(headMesh);
    // Brow crag
    const browGeo = new THREE.BoxGeometry(0.35, 0.05, 0.08);
    const brow = new THREE.Mesh(browGeo, darkMat);
    brow.position.set(0, 0.1, 0.18);
    this._head.add(brow);
    // Head cracks (glowing)
    for (let c = 0; c < 2; c++) {
      const hcGeo = new THREE.BoxGeometry(0.015, 0.15, 0.01);
      const hc = new THREE.Mesh(hcGeo, lavaMat);
      hc.position.set(-0.05 + c * 0.12, 0.05, 0.22);
      hc.rotation.z = (c - 0.5) * 0.4;
      this._head.add(hc);
    }
    // Eyes (deep molten sockets)
    for (const side of [-1, 1]) {
      const sockGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const sock = new THREE.Mesh(sockGeo, ashMat);
      sock.position.set(side * 0.1, 0.02, 0.2);
      this._head.add(sock);
      const eGeo = new THREE.SphereGeometry(0.03, 10, 10);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.1, 0.02, 0.22);
      this._head.add(eye);
    }
    // Jaw
    const jawGeo = new THREE.SphereGeometry(0.15, 10, 8);
    const jaw = new THREE.Mesh(jawGeo, darkMat);
    jaw.scale.set(1.1, 0.45, 0.8);
    jaw.position.set(0, -0.12, 0.06);
    this._head.add(jaw);
    // Magma drool
    const drGeo = cyl(0.015, 0.008, 0.08, 6);
    const dr = new THREE.Mesh(drGeo, lavaMat);
    dr.position.set(0.03, -0.2, 0.1);
    this._head.add(dr);

    // --- Arms (segmented rock with lava joints) ---
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.6, 2.65, 0);
      this._body.add(arm);
      // Shoulder rock
      const shGeo = new THREE.SphereGeometry(0.12, 10, 8);
      const sh = new THREE.Mesh(shGeo, rockMat);
      sh.scale.set(1.2, 0.8, 1.0);
      arm.add(sh);
      // Upper arm
      const upperGeo = cyl(0.14, 0.11, 0.4, 12);
      const upper = new THREE.Mesh(upperGeo, rockMat);
      upper.position.y = -0.3;
      arm.add(upper);
      // Lava elbow joint
      const elbGeo = new THREE.SphereGeometry(0.1, 10, 8);
      const elb = new THREE.Mesh(elbGeo, lavaMat);
      elb.position.y = -0.55;
      arm.add(elb);
      // Forearm
      const foreGeo = cyl(0.12, 0.15, 0.45, 12);
      const fore = new THREE.Mesh(foreGeo, darkMat);
      fore.position.y = -0.85;
      arm.add(fore);
      // Lava veins on forearm
      const avGeo = new THREE.BoxGeometry(0.015, 0.2, 0.008);
      const av = new THREE.Mesh(avGeo, lavaMat);
      av.position.set(side * 0.08, -0.8, 0.08);
      arm.add(av);
      // Molten fist
      const fistGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const fist = new THREE.Mesh(fistGeo, lavaMat);
      fist.scale.set(1.0, 0.85, 0.9);
      fist.position.y = -1.2;
      arm.add(fist);
      // Rock knuckle crust on fist
      for (let k = 0; k < 3; k++) {
        const kkGeo = new THREE.SphereGeometry(0.035, 6, 6);
        const kk = new THREE.Mesh(kkGeo, darkMat);
        kk.position.set((k - 1) * 0.05, -1.15, 0.12);
        arm.add(kk);
      }
    }

    // --- Legs (stocky basalt pillars) ---
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.28, 1.35, 0);
      this._body.add(leg);
      // Thigh
      const thighGeo = cyl(0.16, 0.13, 0.35, 12);
      const thigh = new THREE.Mesh(thighGeo, rockMat);
      thigh.position.y = -0.2;
      leg.add(thigh);
      // Lava knee
      const kGeo = new THREE.SphereGeometry(0.09, 10, 8);
      const knee = new THREE.Mesh(kGeo, lavaMat);
      knee.position.y = -0.4;
      leg.add(knee);
      // Shin
      const shinGeo = cyl(0.14, 0.17, 0.35, 12);
      const shin = new THREE.Mesh(shinGeo, darkMat);
      shin.position.y = -0.62;
      leg.add(shin);
      // Lava vein on shin
      const svGeo = new THREE.BoxGeometry(0.012, 0.15, 0.008);
      const sv = new THREE.Mesh(svGeo, lavaMat);
      sv.position.set(0.08, -0.6, 0.08);
      leg.add(sv);
      // Foot
      const footGeo = new THREE.SphereGeometry(0.18, 10, 8);
      const foot = new THREE.Mesh(footGeo, rockMat);
      foot.scale.set(1.0, 0.35, 1.2);
      foot.position.set(0, -0.85, 0.03);
      leg.add(foot);
    }
  }

  // ---- Obsidian Sentinel builder ---------------------------------------------

  private _buildObsidianSentinel(): void {
    const obsidianMat = mat(0x1a1a2a, { metalness: 0.8, roughness: 0.15 });
    const edgeMat = mat(0x3a3a5a, { metalness: 0.6 });
    const glowMat = mat(0x6644aa, { emissive: 0x4422aa });
    const eyeMat = mat(0xaa66ff, { emissive: 0x8844dd });

    // Angular torso — faceted obsidian
    const torsoGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const torso = new THREE.Mesh(torsoGeo, obsidianMat);
    torso.scale.set(0.73, 1.27, 0.55);
    torso.position.y = 2.4;
    torso.rotation.y = Math.PI / 8;
    this._body.add(torso);

    // Crystal shards on shoulders (multiple)
    for (const side of [-1, 1]) {
      const shardGeo = new THREE.ConeGeometry(0.1, 0.4, 6);
      const shard = new THREE.Mesh(shardGeo, edgeMat);
      shard.position.set(side * 0.5, 3.0, 0);
      shard.rotation.z = side * 0.3;
      this._body.add(shard);
      const s2Geo = new THREE.ConeGeometry(0.06, 0.25, 5);
      const s2 = new THREE.Mesh(s2Geo, edgeMat);
      s2.position.set(side * 0.45, 2.85, 0.1);
      s2.rotation.z = side * 0.4;
      this._body.add(s2);
    }

    // Head — angular faceted
    this._head.position.set(0, 3.3, 0);
    this._body.add(this._head);
    const headGeo = new THREE.OctahedronGeometry(0.2, 0);
    const headMesh = new THREE.Mesh(headGeo, obsidianMat);
    headMesh.scale.set(0.75, 0.88, 0.75);
    headMesh.rotation.y = Math.PI / 6;
    this._head.add(headMesh);

    // Visor glow
    const visorGeo = new THREE.TorusGeometry(0.12, 0.015, 6, 12, Math.PI * 0.7);
    const visor = new THREE.Mesh(visorGeo, eyeMat);
    visor.position.set(0, 0.02, 0.12);
    visor.rotation.y = Math.PI;
    visor.rotation.z = Math.PI / 2;
    this._head.add(visor);

    // Arms — segmented obsidian
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.5, 2.8, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.075, 0.065, 0.7, 6);
      const upper = new THREE.Mesh(upperGeo, obsidianMat);
      upper.position.y = -0.35;
      arm.add(upper);
      const foreGeo = cyl(0.065, 0.06, 0.6, 6);
      const fore = new THREE.Mesh(foreGeo, edgeMat);
      fore.position.y = -0.9;
      arm.add(fore);
      // Blade hand — angular shard
      const bladeGeo = new THREE.TetrahedronGeometry(0.15, 0);
      const blade = new THREE.Mesh(bladeGeo, obsidianMat);
      blade.scale.set(0.4, 1.4, 1.0);
      blade.position.y = -1.3;
      arm.add(blade);
    }

    // Legs
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.25, 1.5, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.08, 0.07, 0.7, 6);
      const thigh = new THREE.Mesh(thighGeo, obsidianMat);
      thigh.position.y = -0.35;
      leg.add(thigh);
      const shinGeo = cyl(0.07, 0.065, 0.6, 6);
      const shin = new THREE.Mesh(shinGeo, edgeMat);
      shin.position.y = -0.85;
      leg.add(shin);
    }

    // Glow runes (more)
    for (let i = 0; i < 5; i++) {
      const rGeo = new THREE.SphereGeometry(0.03, 10, 10);
      const rune = new THREE.Mesh(rGeo, glowMat);
      rune.position.set((Math.random() - 0.5) * 0.5, 1.8 + i * 0.3, 0.35);
      this._body.add(rune);
    }
    // Rune lines connecting runes
    for (let i = 0; i < 2; i++) {
      const rlGeo = new THREE.BoxGeometry(0.01, 0.25, 0.005);
      const rl = new THREE.Mesh(rlGeo, glowMat);
      rl.position.set(0, 2.0 + i * 0.5, 0.36);
      rl.rotation.z = (i - 0.5) * 0.3;
      this._body.add(rl);
    }
  }

  // ---- Cinder Wraith builder -------------------------------------------------

  private _buildCinderWraith(): void {
    const fireMat = mat(0xff6600, { emissive: 0xcc4400, transparent: true, opacity: 0.7 });
    const coreMat = mat(0xffaa00, { emissive: 0xff6600 });
    const smokeMat = mat(0x333333, { transparent: true, opacity: 0.4 });
    const eyeMat = mat(0xffffaa, { emissive: 0xffff66 });

    // Burning spectral body
    const bodyGeo = cyl(0.1, 0.3, 1.5, 16);
    const body = new THREE.Mesh(bodyGeo, fireMat);
    body.position.y = 1.0;
    this._body.add(body);

    // Core ember
    const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.5;
    this._body.add(core);

    // Flame licks around body
    for (let i = 0; i < 4; i++) {
      const flGeo = new THREE.ConeGeometry(0.03, 0.2, 8);
      const fl = new THREE.Mesh(flGeo, coreMat);
      const a = (i / 4) * Math.PI * 2;
      fl.position.set(Math.cos(a) * 0.2, 0.8 + i * 0.2, Math.sin(a) * 0.2);
      this._body.add(fl);
    }

    // Head
    this._head.position.set(0, 2.0, 0);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, fireMat);
    this._head.add(headMesh);

    // Flame wisps on head
    for (let i = 0; i < 4; i++) {
      const fGeo = new THREE.ConeGeometry(0.035, 0.18 + Math.random() * 0.08, 8);
      const flame = new THREE.Mesh(fGeo, coreMat);
      flame.position.set((Math.random() - 0.5) * 0.15, 0.15 + i * 0.04, (Math.random() - 0.5) * 0.1);
      this._head.add(flame);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.07, 0, 0.14);
      this._head.add(eye);
    }

    // Wispy arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.2, 1.6, 0);
      this._body.add(arm);
      const aGeo = cyl(0.05, 0.02, 0.7, 6);
      const armMesh = new THREE.Mesh(aGeo, fireMat);
      armMesh.position.y = -0.35;
      arm.add(armMesh);
    }

    // Smoke trail legs
    this._leftLeg.position.set(-0.08, 0.3, 0);
    this._body.add(this._leftLeg);
    this._rightLeg.position.set(0.08, 0.3, 0);
    this._body.add(this._rightLeg);
    const tailGeo = cyl(0.2, 0.01, 0.5, 6);
    const tail = new THREE.Mesh(tailGeo, smokeMat);
    tail.position.y = -0.1;
    this._leftLeg.add(tail);
  }

  // ---- Volcanic Behemoth builder ---------------------------------------------

  private _buildVolcanicBehemoth(): void {
    const rockMat = mat(0x3a2210);
    const lavaMat = mat(0xff4400, { emissive: 0xdd2200 });
    const darkMat = mat(0x1a1108);
    const eyeMat = mat(0xff6600, { emissive: 0xcc4400 });

    // Massive rocky body
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, rockMat);
    torso.scale.set(0.9, 1.1, 0.8);
    torso.position.y = 3.8;
    this._body.add(torso);

    // Cooling rock plates
    for (let i = 0; i < 5; i++) {
      const plGeo = new THREE.SphereGeometry(0.18, 8, 6);
      const plate = new THREE.Mesh(plGeo, darkMat);
      const a = (i / 5) * Math.PI * 2;
      plate.position.set(Math.cos(a) * 0.65, 3.3 + i * 0.2, Math.sin(a) * 0.55);
      plate.scale.set(1.5, 0.5, 1.5);
      this._body.add(plate);
    }

    // Lava vents
    for (let i = 0; i < 5; i++) {
      const vGeo = new THREE.SphereGeometry(0.12, 12, 10);
      const vent = new THREE.Mesh(vGeo, lavaMat);
      const a = (i / 5) * Math.PI * 2;
      vent.position.set(Math.cos(a) * 0.7, 3.5 + Math.random() * 0.8, Math.sin(a) * 0.6);
      this._body.add(vent);
    }

    // Lava flow lines on body
    for (let i = 0; i < 4; i++) {
      const lfGeo = new THREE.BoxGeometry(0.03, 0.4, 0.015);
      const lf = new THREE.Mesh(lfGeo, lavaMat);
      const a = (i / 4) * Math.PI * 2;
      lf.position.set(Math.cos(a) * 0.65, 3.2 + i * 0.2, Math.sin(a) * 0.55);
      lf.rotation.z = (Math.random() - 0.5) * 0.4;
      this._body.add(lf);
    }

    // Ember particles
    for (let i = 0; i < 4; i++) {
      const emGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const em = new THREE.Mesh(emGeo, mat(0xffaa00, { emissive: 0xff6600 }));
      em.position.set((Math.random() - 0.5) * 1.0, 4.5 + Math.random() * 1.0, (Math.random() - 0.5) * 0.8);
      this._body.add(em);
    }

    // Head — small relative to body
    this._head.position.set(0, 5.0, 0.3);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, rockMat);
    this._head.add(headMesh);

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.05, 6, 6);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.13, 0.02, 0.24);
      this._head.add(eye);
    }

    // Horn crags
    for (const side of [-1, 1]) {
      const hGeo = new THREE.ConeGeometry(0.08, 0.3, 5);
      const horn = new THREE.Mesh(hGeo, darkMat);
      horn.position.set(side * 0.2, 0.2, -0.05);
      horn.rotation.z = side * -0.3;
      this._head.add(horn);
    }

    // Arms — massive
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 1.0, 4.2, 0);
      this._body.add(arm);
      const upperGeo = cyl(0.25, 0.2, 1.3, 7);
      const upper = new THREE.Mesh(upperGeo, rockMat);
      upper.position.y = -0.65;
      arm.add(upper);
      const foreGeo = cyl(0.2, 0.22, 1.1, 7);
      const fore = new THREE.Mesh(foreGeo, darkMat);
      fore.position.y = -1.5;
      arm.add(fore);
      const fistGeo = new THREE.SphereGeometry(0.28, 6, 6);
      const fist = new THREE.Mesh(fistGeo, lavaMat);
      fist.position.y = -2.1;
      arm.add(fist);
    }

    // Legs — pillars
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.5, 2.5, 0);
      this._body.add(leg);
      const thighGeo = cyl(0.28, 0.22, 1.1, 7);
      const thigh = new THREE.Mesh(thighGeo, rockMat);
      thigh.position.y = -0.55;
      leg.add(thigh);
      const shinGeo = cyl(0.22, 0.28, 1.0, 7);
      const shin = new THREE.Mesh(shinGeo, darkMat);
      shin.position.y = -1.3;
      leg.add(shin);
      const footGeo = new THREE.SphereGeometry(0.32, 6, 5);
      const foot = new THREE.Mesh(footGeo, rockMat);
      foot.scale.set(1, 0.4, 1.2);
      foot.position.set(0, -1.9, 0.05);
      leg.add(foot);
    }
  }

  // ---- Frost Wyrm builder ----------------------------------------------------

  private _buildFrostWyrm(): void {
    const scaleMat = mat(0x88aacc);
    const bellyMat = mat(0xaaccdd);
    const iceMat = mat(0xccddff, { emissive: 0x4466aa, transparent: true, opacity: 0.8 });
    const eyeMat = mat(0x88ddff, { emissive: 0x44aadd });
    const fangMat = mat(0xeeeeff);
    const darkScaleMat = mat(0x667799);
    const frostMat = mat(0xddeeff, { emissive: 0x6688bb, transparent: true, opacity: 0.6 });

    // Serpentine body — elongated
    const torsoGeo = new THREE.SphereGeometry(1, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, scaleMat);
    torso.scale.set(0.45, 0.7, 0.8);
    torso.position.y = 2.2;
    this._body.add(torso);

    // Scale ridge lines along the back
    for (let i = 0; i < 6; i++) {
      const ridgeGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const ridge = new THREE.Mesh(ridgeGeo, darkScaleMat);
      ridge.scale.set(1, 0.5, 1.5);
      ridge.position.set(0, 1.8 + i * 0.15, -0.35);
      this._body.add(ridge);
    }

    // Belly scales
    const bGeo = new THREE.SphereGeometry(1, 16, 12);
    const belly = new THREE.Mesh(bGeo, bellyMat);
    belly.scale.set(0.35, 0.5, 0.65);
    belly.position.set(0, 1.8, 0.2);
    this._body.add(belly);

    // Belly scale texture ridges
    for (let i = 0; i < 4; i++) {
      const bsGeo = new THREE.BoxGeometry(0.2, 0.01, 0.04);
      const bs = new THREE.Mesh(bsGeo, bellyMat);
      bs.position.set(0, 1.65 + i * 0.12, 0.42);
      this._body.add(bs);
    }

    // Head — dragon snout
    this._head.position.set(0, 3.0, 0.4);
    this._body.add(this._head);
    const headGeo = new THREE.SphereGeometry(1, 16, 12);
    const headMesh = new THREE.Mesh(headGeo, scaleMat);
    headMesh.scale.set(0.22, 0.18, 0.28);
    this._head.add(headMesh);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(1, 12, 10);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.scale.set(0.14, 0.1, 0.18);
    snout.position.set(0, -0.04, 0.22);
    this._head.add(snout);

    // Nostril details
    for (const side of [-1, 1]) {
      const nGeo = new THREE.SphereGeometry(0.015, 8, 6);
      const nostril = new THREE.Mesh(nGeo, darkScaleMat);
      nostril.position.set(side * 0.04, -0.02, 0.35);
      this._head.add(nostril);
    }

    // Ice horns
    for (const side of [-1, 1]) {
      const hGeo = new THREE.ConeGeometry(0.04, 0.3, 12);
      const horn = new THREE.Mesh(hGeo, iceMat);
      horn.position.set(side * 0.15, 0.15, -0.05);
      horn.rotation.z = side * -0.3;
      this._head.add(horn);
      // Horn ridge rings
      for (let i = 0; i < 3; i++) {
        const rrGeo = new THREE.TorusGeometry(0.035 - i * 0.005, 0.005, 6, 10);
        const rr = new THREE.Mesh(rrGeo, frostMat);
        const t = (i + 1) * 0.08;
        rr.position.set(side * (0.15 + Math.sin(side * -0.3) * t * side * -0.3), 0.15 + t * 0.9, -0.05 - t * 0.15);
        rr.rotation.x = Math.PI / 2;
        rr.rotation.z = side * -0.3;
        this._head.add(rr);
      }
    }

    // Brow ridges
    for (const side of [-1, 1]) {
      const brGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const brow = new THREE.Mesh(brGeo, darkScaleMat);
      brow.scale.set(1.5, 0.5, 0.8);
      brow.position.set(side * 0.1, 0.1, 0.14);
      this._head.add(brow);
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const eye = new THREE.Mesh(eGeo, eyeMat);
      eye.position.set(side * 0.12, 0.05, 0.2);
      this._head.add(eye);
      // Pupil slit
      const pGeo = new THREE.SphereGeometry(0.02, 8, 6);
      const pupil = new THREE.Mesh(pGeo, mat(0x224466));
      pupil.scale.set(0.3, 1, 0.3);
      pupil.position.set(side * 0.12, 0.05, 0.235);
      this._head.add(pupil);
    }

    // Fangs
    for (const side of [-1, 1]) {
      const fGeo = new THREE.ConeGeometry(0.015, 0.08, 10);
      const fang = new THREE.Mesh(fGeo, fangMat);
      fang.position.set(side * 0.06, -0.12, 0.28);
      fang.rotation.x = Math.PI;
      this._head.add(fang);
      // Smaller inner teeth
      const tGeo = new THREE.ConeGeometry(0.008, 0.04, 8);
      const tooth = new THREE.Mesh(tGeo, fangMat);
      tooth.position.set(side * 0.03, -0.1, 0.3);
      tooth.rotation.x = Math.PI;
      this._head.add(tooth);
    }

    // Wing arms
    for (const side of [-1, 1]) {
      const arm = side === -1 ? this._leftArm : this._rightArm;
      arm.position.set(side * 0.5, 2.6, 0);
      this._body.add(arm);
      const wingBoneGeo = cyl(0.06, 0.04, 1.2, 14);
      const wingBone = new THREE.Mesh(wingBoneGeo, scaleMat);
      wingBone.position.y = -0.4;
      wingBone.rotation.z = side * 0.5;
      arm.add(wingBone);
      const membraneGeo = new THREE.PlaneGeometry(1.0, 0.8);
      const membraneMat = mat(0x7799bb, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.position.set(side * 0.4, -0.6, 0);
      arm.add(membrane);
      // Wing membrane veins
      for (let i = 0; i < 4; i++) {
        const vGeo = new THREE.BoxGeometry(0.18 + i * 0.05, 0.008, 0.005);
        const vein = new THREE.Mesh(vGeo, mat(0x6688aa, { side: THREE.DoubleSide }));
        vein.position.set(side * (0.25 + i * 0.05), -0.45 - i * 0.04, 0.01);
        vein.rotation.z = side * (0.1 + i * 0.08);
        arm.add(vein);
      }
      // Wing claw at tip
      const wcGeo = new THREE.ConeGeometry(0.02, 0.08, 8);
      const wc = new THREE.Mesh(wcGeo, fangMat);
      wc.position.set(side * 0.7, -0.75, 0);
      wc.rotation.z = side * 0.3;
      arm.add(wc);
    }

    // Tail
    const tailGeo = cyl(0.2, 0.04, 1.5, 14);
    const tail = new THREE.Mesh(tailGeo, scaleMat);
    tail.position.set(0, 1.5, -0.6);
    tail.rotation.x = 0.8;
    this._body.add(tail);

    // Tail fin
    const finGeo = new THREE.PlaneGeometry(0.15, 0.2);
    const fin = new THREE.Mesh(finGeo, mat(0x7799bb, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
    fin.position.set(0, 0.65, -1.0);
    fin.rotation.x = 0.8;
    this._body.add(fin);

    // Tail scale ridges
    for (let i = 0; i < 4; i++) {
      const tsGeo = new THREE.ConeGeometry(0.025, 0.06, 8);
      const ts = new THREE.Mesh(tsGeo, darkScaleMat);
      const t = i * 0.25;
      ts.position.set(0, 1.4 - t * 0.5, -0.65 - t * 0.3);
      this._body.add(ts);
    }

    // Legs — short, reptilian
    for (const side of [-1, 1]) {
      const leg = side === -1 ? this._leftLeg : this._rightLeg;
      leg.position.set(side * 0.3, 1.2, 0.1);
      this._body.add(leg);
      const lGeo = cyl(0.12, 0.08, 0.7, 14);
      const legMesh = new THREE.Mesh(lGeo, scaleMat);
      legMesh.position.y = -0.35;
      leg.add(legMesh);
      const clawGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const claw = new THREE.Mesh(clawGeo, bellyMat);
      claw.scale.set(1, 0.5, 1.3);
      claw.position.set(0, -0.75, 0.05);
      leg.add(claw);
      // Toe claws
      for (let i = 0; i < 3; i++) {
        const tcGeo = new THREE.ConeGeometry(0.012, 0.05, 8);
        const tc = new THREE.Mesh(tcGeo, fangMat);
        tc.position.set((i - 1) * 0.04, -0.8, 0.1);
        tc.rotation.x = Math.PI * 0.8;
        leg.add(tc);
      }
    }

    // Ice crystals on back — more and varied
    for (let i = 0; i < 6; i++) {
      const cGeo = new THREE.ConeGeometry(0.05, 0.2 + Math.random() * 0.15, 10);
      const crystal = new THREE.Mesh(cGeo, iceMat);
      crystal.position.set((Math.random() - 0.5) * 0.3, 2.3 + i * 0.15, -0.2);
      this._body.add(crystal);
    }

    // Frost aura particles
    for (let i = 0; i < 5; i++) {
      const fpGeo = new THREE.OctahedronGeometry(0.03, 0);
      const fp = new THREE.Mesh(fpGeo, frostMat);
      fp.position.set(
        (Math.random() - 0.5) * 0.8,
        1.5 + Math.random() * 1.8,
        (Math.random() - 0.5) * 0.6
      );
      this._body.add(fp);
    }
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
