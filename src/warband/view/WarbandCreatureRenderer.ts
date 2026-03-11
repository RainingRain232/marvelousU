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
