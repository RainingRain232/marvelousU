import * as THREE from 'three';
import { EnemyType } from './DiabloTypes';

/** Build enemy mesh for dragon/desert/grassland enemies. Returns true if type was handled. */
export function createWildEnemyMesh(type: EnemyType, _scale: number, group: THREE.Group): boolean {
    switch (type) {
      // ── Dragon's Sanctum enemies ──
      // --- DRAGONKIN_WARRIOR | Estimated polygons: ~55000 triangles ---
      case EnemyType.DRAGONKIN_WARRIOR: {
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.6, metalness: 0.2 });
        const scaleDetailMat = new THREE.MeshStandardMaterial({ color: 0x334411, roughness: 0.65, metalness: 0.15 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x554422, metalness: 0.55, roughness: 0.35 });
        const armorDetailMat = new THREE.MeshStandardMaterial({ color: 0x888866, metalness: 0.7, roughness: 0.25 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xcc8800, emissiveIntensity: 1.5 });
        const weapMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x111100, roughness: 0.3, metalness: 0.4 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0x6a7744, roughness: 0.55 });
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.85 });

        // Muscular reptilian torso: main box + chest armor plate
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.32), scaleMat);
        torso.position.y = 0.9;
        torso.castShadow = true;
        group.add(torso);
        // Chest armor plate (metallic)
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.08), armorMat);
        chestPlate.position.set(0, 0.95, 0.18);
        group.add(chestPlate);
        // Chest plate trim
        const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.06), armorDetailMat);
        chestTrim.position.set(0, 1.15, 0.18);
        group.add(chestTrim);
        // Belly scales (lighter colored small boxes)
        for (let bs2 = 0; bs2 < 4; bs2++) {
          for (let bsc = 0; bsc < 3; bsc++) {
            const bellyScale = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), bellyMat);
            bellyScale.position.set(-0.1 + bsc * 0.1, 0.72 + bs2 * 0.1, 0.16);
            group.add(bellyScale);
          }
        }
        // Leather straps across chest (X pattern)
        for (const [stx, sty, stz, srz] of [[-0.12, 1.0, 0.2, 0.5], [0.12, 1.0, 0.2, -0.5]] as [number, number, number, number][]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), leatherMat);
          strap.position.set(stx, sty, stz);
          strap.rotation.z = srz;
          group.add(strap);
        }

        // Thick neck with scale detail
        const dkwNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 16), scaleMat);
        dkwNeck.position.set(0, 1.22, 0);
        group.add(dkwNeck);
        // Neck scales
        for (let ns = 0; ns < 4; ns++) {
          const nsAng = (ns / 4) * Math.PI * 2;
          const nScale = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), scaleDetailMat);
          nScale.position.set(Math.cos(nsAng) * 0.1, 1.18 + ns * 0.04, Math.sin(nsAng) * 0.1);
          group.add(nScale);
        }

        // Proper reptilian head: elongated sphere
        const dkwHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), scaleMat);
        dkwHead.scale.set(1, 0.88, 1.25);
        dkwHead.position.set(0, 1.42, 0);
        group.add(dkwHead);
        // Head crest (row of small cones along skull top)
        for (let hc = 0; hc < 5; hc++) {
          const crestCone = new THREE.Mesh(new THREE.ConeGeometry(0.018 - hc * 0.001, 0.06 + hc * 0.005, 8), scaleDetailMat);
          crestCone.position.set(0, 1.62 - hc * 0.015, 0.04 - hc * 0.04);
          group.add(crestCone);
        }
        // Cone snout with nostrils
        const dkwSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.2, 16), scaleMat);
        dkwSnout.position.set(0, 1.36, 0.22);
        dkwSnout.rotation.x = Math.PI / 2;
        group.add(dkwSnout);
        const snoutTip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), scaleDetailMat);
        snoutTip.position.set(0, 1.36, 0.34);
        group.add(snoutTip);
        for (const nx of [-0.03, 0.03]) {
          const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.015, 6), scaleDetailMat);
          nostril.position.set(nx, 1.38, 0.33);
          nostril.rotation.x = Math.PI / 2;
          group.add(nostril);
        }
        // Upper teeth row
        for (let t = 0; t < 6; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.035, 6), bellyMat);
          tooth.position.set(-0.08 + t * 0.032, 1.28, 0.2 + (t % 2) * 0.05);
          group.add(tooth);
        }
        // Amber emissive eyes with dark slit pupils
        for (const ex of [-0.09, 0.09]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), scaleDetailMat);
          eyeSocket.position.set(ex, 1.44, 0.17);
          group.add(eyeSocket);
          const dkwEye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), eyeMat);
          dkwEye.position.set(ex, 1.44, 0.2);
          group.add(dkwEye);
          // Slit pupil (small dark vertical box)
          const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.005), new THREE.MeshStandardMaterial({ color: 0x000000 }));
          pupil.position.set(ex, 1.44, 0.225);
          group.add(pupil);
        }

        // Jaw group (anim_jaw) with lower jaw and teeth
        {
          const dkwJawGroup = new THREE.Group();
          dkwJawGroup.name = 'anim_jaw';
          dkwJawGroup.position.set(0, 1.3, 0.14);
          const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.22), scaleDetailMat);
          lowerJaw.position.set(0, -0.04, 0.06);
          dkwJawGroup.add(lowerJaw);
          for (let jt = 0; jt < 5; jt++) {
            const jTooth = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.032, 6), bellyMat);
            jTooth.position.set(-0.08 + jt * 0.04, 0.0, 0.05 + (jt % 2) * 0.04);
            jTooth.rotation.z = Math.PI;
            dkwJawGroup.add(jTooth);
          }
          group.add(dkwJawGroup);
        }

        // Right arm with enhanced halberd
        const dkwRAGroup = new THREE.Group();
        dkwRAGroup.name = 'anim_ra';
        dkwRAGroup.position.set(0.3, 1.15, 0);
        // Upper arm
        const raUA = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.3, 16), scaleMat);
        raUA.position.set(0.08, -0.05, 0);
        raUA.rotation.z = -0.35;
        dkwRAGroup.add(raUA);
        // Bracer/forearm
        const raFA = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.28, 16), scaleMat);
        raFA.position.set(0.16, -0.38, 0);
        raFA.rotation.z = -0.25;
        dkwRAGroup.add(raFA);
        const raBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.08, 12), armorMat);
        raBracer.position.set(0.16, -0.38, 0);
        raBracer.rotation.z = -0.25;
        dkwRAGroup.add(raBracer);
        // Clawed hand
        const raHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), scaleMat);
        raHand.position.set(0.22, -0.62, 0);
        dkwRAGroup.add(raHand);
        // Halberd: longer shaft with carved notches
        const halbShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.3, 16), weapMat);
        halbShaft.position.set(0.28, -0.15, 0);
        dkwRAGroup.add(halbShaft);
        // Carved notches on shaft
        for (let hn = 0; hn < 3; hn++) {
          const notch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.025, 8), armorDetailMat);
          notch.position.set(0.28, -0.35 + hn * 0.15, 0);
          dkwRAGroup.add(notch);
        }
        // Axe blade (box geometry)
        const halbBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.025), weapMat);
        halbBlade.position.set(0.38, 0.5, 0);
        halbBlade.rotation.z = -0.25;
        dkwRAGroup.add(halbBlade);
        // Spear point cone on top
        const halbPoint = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.18, 12), weapMat);
        halbPoint.position.set(0.28, 0.75, 0);
        dkwRAGroup.add(halbPoint);
        // Counterweight on bottom
        const halbWeight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), armorDetailMat);
        halbWeight.position.set(0.28, -0.82, 0);
        dkwRAGroup.add(halbWeight);
        group.add(dkwRAGroup);

        // Left arm with clawed fist and wrist guard
        const dkwLAGroup = new THREE.Group();
        dkwLAGroup.name = 'anim_la';
        dkwLAGroup.position.set(-0.3, 1.15, 0);
        const laUA = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.3, 16), scaleMat);
        laUA.position.set(-0.08, -0.05, 0);
        laUA.rotation.z = 0.35;
        dkwLAGroup.add(laUA);
        const laFA = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.28, 16), scaleMat);
        laFA.position.set(-0.16, -0.38, 0);
        laFA.rotation.z = 0.25;
        dkwLAGroup.add(laFA);
        const laWristGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 12), armorMat);
        laWristGuard.position.set(-0.2, -0.56, 0);
        laWristGuard.rotation.z = 0.25;
        dkwLAGroup.add(laWristGuard);
        const laHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), scaleMat);
        laHand.position.set(-0.24, -0.68, 0);
        dkwLAGroup.add(laHand);
        // 3 cone claws per hand
        for (let cl = 0; cl < 3; cl++) {
          const clawAng = (cl - 1) * 0.35;
          const laClaw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 6), clawMat);
          laClaw.position.set(-0.24 + Math.sin(clawAng) * 0.05, -0.78, 0.04);
          laClaw.rotation.x = -0.5;
          laClaw.rotation.z = clawAng;
          dkwLAGroup.add(laClaw);
        }
        group.add(dkwLAGroup);

        // Shoulder pauldrons with spike details
        for (const [pax, paz] of [[-0.28, 0], [0.28, 0]] as [number, number][]) {
          const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), armorMat);
          pauldron.scale.set(1.2, 0.7, 1.0);
          pauldron.position.set(pax, 1.22, paz);
          group.add(pauldron);
          // Spikes on pauldron
          for (let sp = 0; sp < 3; sp++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 6), clawMat);
            spike.position.set(pax + (sp - 1) * 0.04, 1.3, paz);
            group.add(spike);
          }
        }

        // Proper legs (anim_ll, anim_rl): muscular thigh, knee guard, shin, clawed feet
        for (const lx of [-0.14, 0.14]) {
          const legGroup = new THREE.Group();
          legGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(lx, 0.58, 0);
          // Thigh
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.28, 16), scaleMat);
          thigh.position.y = -0.1;
          legGroup.add(thigh);
          // Knee guard (armor plate)
          const kneeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.07), armorMat);
          kneeGuard.position.y = -0.28;
          legGroup.add(kneeGuard);
          // Shin with greave
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.26, 16), scaleMat);
          shin.position.y = -0.46;
          legGroup.add(shin);
          const greave = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.07), armorMat);
          greave.position.set(0, -0.46, 0.02);
          legGroup.add(greave);
          // Clawed foot
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), scaleDetailMat);
          foot.position.set(0, -0.62, 0.04);
          legGroup.add(foot);
          // 3 claws per foot
          for (let cl = 0; cl < 3; cl++) {
            const cang = (cl - 1) * 0.3;
            const footClaw = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 6), clawMat);
            footClaw.position.set(Math.sin(cang) * 0.04, -0.68, 0.06);
            footClaw.rotation.x = -0.5;
            footClaw.rotation.z = cang;
            legGroup.add(footClaw);
          }
          group.add(legGroup);
        }

        // Tail (anim_tail): 3 segments of decreasing cylinders
        {
          const dkwTailGroup = new THREE.Group();
          dkwTailGroup.name = 'anim_tail';
          dkwTailGroup.position.set(0, 0.72, -0.2);
          const tailSegs: [number, number, number, number, number][] = [
            [0, 0, -0.12, 0.07, 0.22],
            [0, -0.04, -0.32, 0.055, 0.2],
            [0, -0.1, -0.5, 0.038, 0.18],
          ];
          for (const [ttx, tty, ttz, ttr, ttl] of tailSegs) {
            const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(ttr, ttr * 0.8, ttl, 12), scaleMat);
            tailSeg.position.set(ttx, tty, ttz);
            tailSeg.rotation.x = -0.35;
            dkwTailGroup.add(tailSeg);
          }
          group.add(dkwTailGroup);
        }

        // Belt with weapon holster (small dagger)
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), leatherMat);
        belt.position.set(0, 0.62, 0);
        group.add(belt);
        const holster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), leatherMat);
        holster.position.set(-0.2, 0.54, 0.06);
        group.add(holster);
        const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.015), weapMat);
        dagger.position.set(-0.2, 0.52, 0.05);
        group.add(dagger);

        // Back scales/ridge (row of small cones along spine)
        for (let sp = 0; sp < 5; sp++) {
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.018 - sp * 0.002, 0.05 + sp * 0.01, 8), scaleDetailMat);
          spine.position.set(0, 1.16 - sp * 0.08, -0.16);
          spine.rotation.x = 0.2;
          group.add(spine);
        }
        break;
      }
      // --- WYRM_PRIEST | Estimated polygons: ~55000 triangles ---
      case EnemyType.WYRM_PRIEST: {
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 });
        const robeTrimMat = new THREE.MeshStandardMaterial({ color: 0x773300, roughness: 0.75 });
        const robeHemMat = new THREE.MeshStandardMaterial({ color: 0xaa5500, roughness: 0.7 });
        const stoleMatWP = new THREE.MeshStandardMaterial({ color: 0x221144, roughness: 0.7 });
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.6 });
        const scaleDetailMat = new THREE.MeshStandardMaterial({ color: 0x3d4a22, roughness: 0.65 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2 });
        const fireAuraMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.8, transparent: true, opacity: 0.4 });
        const eyeMatWP = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xcc7700, emissiveIntensity: 1.5 });
        const hornMatWP = new THREE.MeshStandardMaterial({ color: 0x1a1100, roughness: 0.4, metalness: 0.3 });
        const staffMatWP = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7 });
        const clawMatWP = new THREE.MeshStandardMaterial({ color: 0x111100, roughness: 0.3, metalness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xcc9900, metalness: 0.8, roughness: 0.2 });
        const runeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0, transparent: true, opacity: 0.7 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 });
        const smokeMat = new THREE.MeshStandardMaterial({ color: 0x886644, emissive: 0x443322, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 });

        // Inner cone robe
        const innerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.92, 24), robeMat);
        innerRobe.position.y = 0.5;
        innerRobe.castShadow = true;
        group.add(innerRobe);
        // Outer wider cone robe with different color trim
        const outerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.88, 24), robeTrimMat);
        outerRobe.position.y = 0.46;
        group.add(outerRobe);
        // Decorative hem detail (thin boxes at bottom in a ring)
        for (let h = 0; h < 12; h++) {
          const hAng = (h / 12) * Math.PI * 2;
          const hemBox = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.03), robeHemMat);
          hemBox.position.set(Math.cos(hAng) * 0.3, 0.06, Math.sin(hAng) * 0.3);
          hemBox.rotation.y = hAng;
          group.add(hemBox);
        }
        // Belt with ceremonial pouches
        const wpBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), hornMatWP);
        wpBelt.position.y = 0.62;
        group.add(wpBelt);
        for (let p = 0; p < 3; p++) {
          const pAng = (p / 3) * Math.PI * 2 + 0.4;
          const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.05), robeMat);
          pouch.position.set(Math.cos(pAng) * 0.2, 0.58, Math.sin(pAng) * 0.2);
          group.add(pouch);
        }
        // Shoulder drape/stole (thin boxes over shoulders)
        for (const sx2 of [-0.22, 0.22]) {
          const stole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.04), stoleMatWP);
          stole.position.set(sx2, 0.98, 0.02);
          stole.rotation.z = sx2 < 0 ? 0.2 : -0.2;
          group.add(stole);
        }

        // Neck with scales (small overlapping boxes)
        const wpNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.18, 16), scaleMat);
        wpNeck.position.set(0, 1.02, 0);
        group.add(wpNeck);
        for (let ns = 0; ns < 6; ns++) {
          const nsAng = (ns / 6) * Math.PI * 2;
          const nScale = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), scaleDetailMat);
          nScale.position.set(Math.cos(nsAng) * 0.09, 0.98 + ns * 0.025, Math.sin(nsAng) * 0.09);
          group.add(nScale);
        }

        // Proper reptilian head: elongated sphere with snout
        const wpHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 18), scaleMat);
        wpHead.scale.set(1, 0.92, 1.2);
        wpHead.position.set(0, 1.2, 0);
        group.add(wpHead);
        // Snout
        const wpSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.082, 0.18, 16), scaleMat);
        wpSnout.position.set(0, 1.16, 0.2);
        wpSnout.rotation.x = Math.PI / 2;
        group.add(wpSnout);
        // Reptilian eyes (amber emissive, slit pupils)
        for (const ex of [-0.08, 0.08]) {
          const wpEye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), eyeMatWP);
          wpEye.position.set(ex, 1.26, 0.15);
          group.add(wpEye);
          const wpPupil = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.004), new THREE.MeshStandardMaterial({ color: 0x000000 }));
          wpPupil.position.set(ex, 1.26, 0.178);
          group.add(wpPupil);
        }
        // Small horns (2) on head
        for (const hx of [-0.1, 0.1]) {
          const wpHorn = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.1, 8), hornMatWP);
          wpHorn.position.set(hx, 1.37, 0.04);
          wpHorn.rotation.z = hx < 0 ? -0.35 : 0.35;
          wpHorn.rotation.x = -0.15;
          group.add(wpHorn);
        }
        // Head crest/frill (row of small flat planes on back of head)
        for (let cr = 0; cr < 4; cr++) {
          const crestPiece = new THREE.Mesh(new THREE.BoxGeometry(0.06 - cr * 0.01, 0.055 + cr * 0.005, 0.015), scaleDetailMat);
          crestPiece.position.set(0, 1.36 + cr * 0.02, -0.12 - cr * 0.02);
          group.add(crestPiece);
        }

        // Ritual necklace with dragon teeth (torus ring + small cones)
        const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 24), goldMat);
        necklace.position.set(0, 1.06, 0);
        necklace.rotation.x = Math.PI / 2 + 0.2;
        group.add(necklace);
        for (let nt = 0; nt < 8; nt++) {
          const ntAng = (nt / 8) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.035, 6), boneMat);
          tooth.position.set(Math.cos(ntAng) * 0.12, 1.02, Math.sin(ntAng) * 0.12);
          group.add(tooth);
        }

        // Right arm group with ornate staff
        {
          const wpRaGroup = new THREE.Group();
          wpRaGroup.name = 'anim_ra';
          wpRaGroup.position.set(0.25, 1.12, 0);
          // Scaly upper arm
          const raUA = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.26, 16), scaleMat);
          raUA.position.set(0.06, -0.06, 0);
          raUA.rotation.z = -0.3;
          wpRaGroup.add(raUA);
          // Ceremonial bracer
          const raBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 12), goldMat);
          raBracer.position.set(0.12, -0.32, 0);
          raBracer.rotation.z = -0.2;
          wpRaGroup.add(raBracer);
          const raFA = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 0.22, 16), scaleMat);
          raFA.position.set(0.14, -0.32, 0);
          raFA.rotation.z = -0.2;
          wpRaGroup.add(raFA);
          // Clawed hand (3 cone claws)
          const raHand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 8), scaleMat);
          raHand.position.set(0.18, -0.54, 0);
          wpRaGroup.add(raHand);
          for (let cl = 0; cl < 3; cl++) {
            const ca = (cl - 1) * 0.3;
            const wpClaw = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.045, 6), clawMatWP);
            wpClaw.position.set(0.18 + Math.sin(ca) * 0.04, -0.62, 0.03);
            wpClaw.rotation.x = -0.5;
            wpClaw.rotation.z = ca;
            wpRaGroup.add(wpClaw);
          }
          // Thicker staff shaft with carved notches
          const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 1.3, 16), staffMatWP);
          staffShaft.position.set(0.3, -0.2, 0);
          wpRaGroup.add(staffShaft);
          for (let sn = 0; sn < 4; sn++) {
            const notch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 10), scaleDetailMat);
            notch.position.set(0.3, -0.45 + sn * 0.18, 0);
            wpRaGroup.add(notch);
          }
          // Ornate staff head: dragon skull motif (sphere + cone snout)
          const skullSphere = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), hornMatWP);
          skullSphere.position.set(0.3, 0.48, 0);
          wpRaGroup.add(skullSphere);
          const skullSnout = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 10), hornMatWP);
          skullSnout.position.set(0.3, 0.52, 0.06);
          skullSnout.rotation.x = Math.PI / 2;
          wpRaGroup.add(skullSnout);
          // Dragon eye sockets on skull
          for (const sex of [-0.03, 0.03]) {
            const skullEye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), fireMat);
            skullEye.position.set(0.3 + sex, 0.52, 0.04);
            wpRaGroup.add(skullEye);
          }
          // Flame orb (larger) with aura
          const flameOrb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), fireMat);
          flameOrb.position.set(0.3, 0.7, 0);
          wpRaGroup.add(flameOrb);
          const flameAura = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), fireAuraMat);
          flameAura.position.set(0.3, 0.7, 0);
          wpRaGroup.add(flameAura);
          // Incense smoke wisps (2 thin semi-transparent cones rising from staff)
          for (let sw = 0; sw < 2; sw++) {
            const smokeWisp = new THREE.Mesh(new THREE.ConeGeometry(0.016 - sw * 0.004, 0.14 + sw * 0.04, 6), smokeMat);
            smokeWisp.position.set(0.28 + (sw - 0.5) * 0.06, 0.85 + sw * 0.06, 0.02);
            wpRaGroup.add(smokeWisp);
          }
          group.add(wpRaGroup);
        }

        // Left arm holds a tome/scroll
        {
          const wpLaGroup = new THREE.Group();
          wpLaGroup.name = 'anim_la';
          wpLaGroup.position.set(-0.25, 1.12, 0);
          const laUA = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.26, 16), scaleMat);
          laUA.position.set(-0.06, -0.06, 0);
          laUA.rotation.z = 0.3;
          wpLaGroup.add(laUA);
          const laBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 12), goldMat);
          laBracer.position.set(-0.12, -0.32, 0);
          laBracer.rotation.z = 0.2;
          wpLaGroup.add(laBracer);
          const laFA = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 0.22, 16), scaleMat);
          laFA.position.set(-0.14, -0.32, 0);
          laFA.rotation.z = 0.2;
          wpLaGroup.add(laFA);
          const laHand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 8), scaleMat);
          laHand.position.set(-0.18, -0.54, 0);
          wpLaGroup.add(laHand);
          for (let cl = 0; cl < 3; cl++) {
            const ca = (cl - 1) * 0.3;
            const wpClaw = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.045, 6), clawMatWP);
            wpClaw.position.set(-0.18 + Math.sin(ca) * 0.04, -0.62, 0.03);
            wpClaw.rotation.x = -0.5;
            wpClaw.rotation.z = ca;
            wpLaGroup.add(wpClaw);
          }
          // Tome (small box with pages detail)
          const tomeBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), new THREE.MeshStandardMaterial({ color: 0x331100, roughness: 0.85 }));
          tomeBody.position.set(-0.24, -0.54, 0.06);
          wpLaGroup.add(tomeBody);
          const tomePages = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.032), new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.9 }));
          tomePages.position.set(-0.25, -0.54, 0.08);
          wpLaGroup.add(tomePages);
          // Page lines detail
          for (let pg = 0; pg < 4; pg++) {
            const pageLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.005), new THREE.MeshStandardMaterial({ color: 0x888866 }));
            pageLine.position.set(-0.25, -0.49 + pg * 0.03, 0.095);
            wpLaGroup.add(pageLine);
          }
          group.add(wpLaGroup);
        }

        // Legs visible beneath robes: scaly thighs, shins, clawed feet
        for (const lx of [-0.1, 0.1]) {
          const wpLegGroup = new THREE.Group();
          wpLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          wpLegGroup.position.set(lx, 0.18, 0.06);
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.2, 16), scaleMat);
          thigh.position.y = -0.06;
          wpLegGroup.add(thigh);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.044, 0.18, 16), scaleDetailMat);
          shin.position.y = -0.26;
          wpLegGroup.add(shin);
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 8), scaleDetailMat);
          foot.position.set(0, -0.38, 0.03);
          wpLegGroup.add(foot);
          for (let cl = 0; cl < 3; cl++) {
            const ca = (cl - 1) * 0.28;
            const footClaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 6), clawMatWP);
            footClaw.position.set(Math.sin(ca) * 0.03, -0.43, 0.04);
            footClaw.rotation.x = -0.45;
            footClaw.rotation.z = ca;
            wpLegGroup.add(footClaw);
          }
          group.add(wpLegGroup);
        }

        // Mystical runes floating around the figure (5 small flat torus rings with emissive fire material)
        const wpRuneData: [number, number, number, number, number, number][] = [
          [0.42, 0.65, 0, 0.3, 0, 0.2],
          [-0.44, 0.85, 0, -0.2, 0, 0.5],
          [0.38, 1.1, 0, 0.5, 0, -0.3],
          [-0.35, 0.5, 0, 0.1, 0, 0.8],
          [0.3, 1.35, 0, -0.4, 0, 0.1],
        ];
        for (const [rwx, rwy, rwz, rrx, rry, rrz] of wpRuneData) {
          const rune = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 20), runeMat);
          rune.position.set(rwx, rwy, rwz);
          rune.rotation.set(rrx, rry, rrz);
          group.add(rune);
        }
        break;
      }
      // --- DRAKE_GUARDIAN | Estimated polygons: ~54000 triangles ---
      case EnemyType.DRAKE_GUARDIAN: {
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.5, metalness: 0.3 });
        const scaleDetailMat = new THREE.MeshStandardMaterial({ color: 0x6a4f22, roughness: 0.6, metalness: 0.25 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xccaa66, roughness: 0.55, metalness: 0.15 });
        const drakeWingMat = new THREE.MeshStandardMaterial({ color: 0x5a3a10, roughness: 0.65, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
        const wingBoneMat = new THREE.MeshStandardMaterial({ color: 0x3a2a0a, roughness: 0.7, metalness: 0.15 });
        const drakeEyeMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 1.8 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x2a1a00, roughness: 0.4, metalness: 0.5 });
        // Main body - sphere for bulk + boxes for underbelly plating
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), scaleMat);
        body.position.set(0, 0.62, -0.06);
        body.scale.set(1, 0.75, 1.3);
        body.castShadow = true;
        group.add(body);
        // Underbelly plates (lighter colored)
        for (let bp = 0; bp < 5; bp++) {
          const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32 - bp * 0.02, 0.07, 0.1), bellyMat);
          bellyPlate.position.set(0, 0.42 + bp * 0.03, 0.26 - bp * 0.02);
          bellyPlate.rotation.x = -0.15 * bp;
          group.add(bellyPlate);
        }
        // Scale texture detail on back - small overlapping plates
        const dScaleRows = 4;
        const dScaleCols = 5;
        for (let sr = 0; sr < dScaleRows; sr++) {
          for (let sc2 = 0; sc2 < dScaleCols; sc2++) {
            const scaleX = (sc2 - (dScaleCols - 1) / 2) * 0.1 + (sr % 2 === 0 ? 0.05 : 0);
            const scaleZ = -0.1 - sr * 0.12;
            const scaleY = 0.78 + Math.sin(scaleX * 2) * 0.04;
            const scPlate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.08), sr % 2 === 0 ? scaleMat : scaleDetailMat);
            scPlate.position.set(scaleX, scaleY, scaleZ);
            scPlate.rotation.x = -0.25;
            group.add(scPlate);
          }
        }
        // Neck connecting head to body
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 16), scaleMat);
        neck.position.set(0, 0.84, 0.24);
        neck.rotation.x = 0.45;
        group.add(neck);
        // Detailed head
        const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), scaleMat);
        headBase.scale.set(1, 0.78, 1.2);
        headBase.position.set(0, 0.98, 0.46);
        group.add(headBase);
        // Snout (elongated cone)
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.26, 16), scaleMat);
        snout.position.set(0, 0.92, 0.68);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);
        const snoutTip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), scaleDetailMat);
        snoutTip.position.set(0, 0.92, 0.82);
        group.add(snoutTip);
        // Nostril details
        for (const nx of [-0.04, 0.04]) {
          const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.02, 8), scaleDetailMat);
          nostril.position.set(nx, 0.95, 0.8);
          nostril.rotation.x = Math.PI / 2;
          group.add(nostril);
        }
        // Jaw group (anim_jaw)
        {
          const jawGroup = new THREE.Group();
          jawGroup.name = 'anim_jaw';
          jawGroup.position.set(0, 0.88, 0.52);
          const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.28), scaleDetailMat);
          jaw.position.set(0, -0.04, 0.08);
          jawGroup.add(jaw);
          const jawTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), scaleDetailMat);
          jawTip.position.set(0, -0.04, 0.24);
          jawGroup.add(jawTip);
          for (let t = 0; t < 6; t++) {
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), bellyMat);
            tooth.position.set(-0.1 + t * 0.04, 0.0, 0.06 + (t % 2) * 0.08);
            tooth.rotation.z = Math.PI;
            jawGroup.add(tooth);
          }
          group.add(jawGroup);
        }
        // Upper teeth
        for (let t = 0; t < 6; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), bellyMat);
          tooth.position.set(-0.1 + t * 0.04, 0.86, 0.58 + (t % 2) * 0.08);
          group.add(tooth);
        }
        // Eyes with emissive glow
        for (const ex of [-0.1, 0.1]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), scaleDetailMat);
          eyeSocket.position.set(ex, 1.02, 0.6);
          group.add(eyeSocket);
          const drakeEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), drakeEyeMat);
          drakeEye.position.set(ex, 1.02, 0.63);
          group.add(drakeEye);
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), drakeEyeMat);
          eyeGlow.position.set(ex, 1.02, 0.66);
          group.add(eyeGlow);
        }
        // Head ridge / crest on top
        for (let cr = 0; cr < 5; cr++) {
          const crestSpike = new THREE.Mesh(new THREE.ConeGeometry(0.022 - cr * 0.002, 0.07 + cr * 0.01, 8), scaleDetailMat);
          crestSpike.position.set(0, 1.14 + cr * 0.01, 0.35 + cr * 0.04);
          group.add(crestSpike);
        }
        // Horns
        for (const hx of [-0.12, 0.12]) {
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.035, 0.14, 10), scaleDetailMat);
          hornBase.position.set(hx, 1.12, 0.46);
          hornBase.rotation.z = hx < 0 ? -0.35 : 0.35;
          hornBase.rotation.x = -0.2;
          group.add(hornBase);
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.12, 8), clawMat);
          hornTip.position.set(hx * 1.1, 1.22, 0.38);
          hornTip.rotation.z = hx < 0 ? -0.5 : 0.5;
          hornTip.rotation.x = -0.3;
          group.add(hornTip);
        }
        // Multi-segment wings with bone structure and membrane panels
        for (const wx of [-1, 1]) {
          const drakeWingGroup = new THREE.Group();
          drakeWingGroup.name = wx < 0 ? 'anim_lw' : 'anim_rw';
          drakeWingGroup.position.set(wx * 0.36, 0.82, -0.04);
          const mainBone = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.58, 12), wingBoneMat);
          mainBone.position.set(wx * 0.24, 0.06, -0.04);
          mainBone.rotation.z = wx < 0 ? 0.5 : -0.5;
          mainBone.rotation.x = 0.15;
          drakeWingGroup.add(mainBone);
          const leadBone = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.44, 12), wingBoneMat);
          leadBone.position.set(wx * 0.34, -0.06, -0.08);
          leadBone.rotation.z = wx < 0 ? 0.7 : -0.7;
          leadBone.rotation.x = 0.25;
          drakeWingGroup.add(leadBone);
          for (let wb = 0; wb < 3; wb++) {
            const wBone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.28 + wb * 0.06, 8), wingBoneMat);
            wBone.position.set(wx * (0.2 + wb * 0.08), 0.04 - wb * 0.05, -0.06 - wb * 0.04);
            wBone.rotation.z = wx < 0 ? (0.3 + wb * 0.15) : -(0.3 + wb * 0.15);
            wBone.rotation.x = 0.2 + wb * 0.1;
            drakeWingGroup.add(wBone);
          }
          for (let wp = 0; wp < 4; wp++) {
            const panelW = 0.22 - wp * 0.02;
            const panelH = 0.24 + wp * 0.04;
            const membrane = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH, 3, 3), drakeWingMat);
            membrane.position.set(wx * (0.24 + wp * 0.1), 0.0 - wp * 0.06, -0.06 - wp * 0.03);
            membrane.rotation.y = wx < 0 ? -(0.45 + wp * 0.1) : (0.45 + wp * 0.1);
            membrane.rotation.z = wx < 0 ? (0.2 + wp * 0.05) : -(0.2 + wp * 0.05);
            drakeWingGroup.add(membrane);
          }
          group.add(drakeWingGroup);
        }
        // Articulated legs with thigh, shin, clawed feet
        for (const [lx, lz] of [[-0.22, 0.22], [0.22, 0.22], [-0.22, -0.32], [0.22, -0.32]]) {
          const drakeLegGroup = new THREE.Group();
          drakeLegGroup.name = lz > 0 ? (lx < 0 ? 'anim_fll' : 'anim_frl') : (lx < 0 ? 'anim_bll' : 'anim_brl');
          drakeLegGroup.position.set(lx, 0.42, lz);
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.06, 0.22, 16), scaleMat);
          thigh.position.y = -0.08;
          drakeLegGroup.add(thigh);
          const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), scaleDetailMat);
          kneeJoint.position.y = -0.2;
          drakeLegGroup.add(kneeJoint);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.2, 16), scaleMat);
          shin.position.y = -0.33;
          drakeLegGroup.add(shin);
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), scaleDetailMat);
          foot.position.set(0, -0.45, 0.04);
          drakeLegGroup.add(foot);
          for (let cl = 0; cl < 3; cl++) {
            const clawAng = (cl - 1) * 0.35;
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 6), clawMat);
            claw.position.set(Math.sin(clawAng) * 0.04, -0.48, 0.06 + Math.cos(clawAng) * 0.02);
            claw.rotation.x = -0.4;
            claw.rotation.z = clawAng;
            drakeLegGroup.add(claw);
          }
          group.add(drakeLegGroup);
        }
        // Multi-segment tail with spade tip
        {
          const drakeTailGroup = new THREE.Group();
          drakeTailGroup.name = 'anim_tail';
          drakeTailGroup.position.set(0, 0.56, -0.42);
          const tailSegData: [number, number, number, number, number][] = [
            [0, 0, -0.1, 0.095, 0.18],
            [0, -0.02, -0.28, 0.078, 0.17],
            [0, -0.06, -0.46, 0.062, 0.16],
            [0, -0.12, -0.62, 0.046, 0.15],
            [0, -0.18, -0.76, 0.032, 0.13],
          ];
          for (const [tx, ty, tz, tr, tl] of tailSegData) {
            const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr * 0.82, tl, 12), scaleMat);
            tailSeg.position.set(tx, ty, tz);
            tailSeg.rotation.x = -0.35;
            drakeTailGroup.add(tailSeg);
          }
          for (let ts = 0; ts < 4; ts++) {
            const tailSpine = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 8), scaleDetailMat);
            tailSpine.position.set(0, 0.02 - ts * 0.02, -0.12 - ts * 0.16);
            tailSpine.rotation.x = 0.15;
            drakeTailGroup.add(tailSpine);
          }
          const spadeBase = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.1, 8), scaleDetailMat);
          spadeBase.position.set(0, -0.22, -0.88);
          spadeBase.rotation.x = -Math.PI / 2 + 0.3;
          drakeTailGroup.add(spadeBase);
          const spadeL = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 6), clawMat);
          spadeL.position.set(-0.06, -0.22, -0.95);
          spadeL.rotation.z = -0.5;
          spadeL.rotation.x = -Math.PI / 2 + 0.2;
          drakeTailGroup.add(spadeL);
          const spadeR = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 6), clawMat);
          spadeR.position.set(0.06, -0.22, -0.95);
          spadeR.rotation.z = 0.5;
          spadeR.rotation.x = -Math.PI / 2 + 0.2;
          drakeTailGroup.add(spadeR);
          group.add(drakeTailGroup);
        }
        break;
      }
      // --- DRAGON_WHELP | Estimated polygons: ~50000 triangles ---
      case EnemyType.DRAGON_WHELP: {
        const whelpMat = new THREE.MeshStandardMaterial({ color: 0xcc5533, emissive: 0x441100, emissiveIntensity: 0.2, roughness: 0.5 });
        const whelpBellyMat = new THREE.MeshStandardMaterial({ color: 0xee7755, emissive: 0x552200, emissiveIntensity: 0.15, roughness: 0.45 });
        const whelpScaleMat = new THREE.MeshStandardMaterial({ color: 0xaa3322, roughness: 0.55 });
        const whelpWingMat = new THREE.MeshStandardMaterial({ color: 0xaa4422, side: THREE.DoubleSide, transparent: true, opacity: 0.82, roughness: 0.55 });
        const whelpWingBoneMat = new THREE.MeshStandardMaterial({ color: 0x5a2010, roughness: 0.7 });
        const whelpEyeMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xcc6600, emissiveIntensity: 1.8 });
        const whelpHornMat = new THREE.MeshStandardMaterial({ color: 0x1a1100, roughness: 0.4, metalness: 0.3 });
        const whelpClawMat = new THREE.MeshStandardMaterial({ color: 0x0a0800, roughness: 0.35, metalness: 0.45 });
        const whelpFireMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 2.2 });

        // Chubby rounded body (sphere with slight oblong scale)
        const whelpBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), whelpMat);
        whelpBody.position.y = 0.5;
        whelpBody.scale.set(1.05, 0.85, 1.25);
        whelpBody.castShadow = true;
        group.add(whelpBody);
        // Belly plates (lighter material small boxes underneath)
        for (let bp = 0; bp < 5; bp++) {
          const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18 - bp * 0.02, 0.06, 0.08), whelpBellyMat);
          bellyPlate.position.set(0, 0.32 + bp * 0.04, 0.22 - bp * 0.02);
          bellyPlate.rotation.x = 0.12 * bp;
          group.add(bellyPlate);
        }
        // Scale texture on back (small overlapping plates)
        for (let sr = 0; sr < 3; sr++) {
          for (let sc2 = 0; sc2 < 4; sc2++) {
            const scX = (sc2 - 1.5) * 0.08 + (sr % 2 === 0 ? 0.04 : 0);
            const scPlate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.06), sr % 2 === 0 ? whelpMat : whelpScaleMat);
            scPlate.position.set(scX, 0.62 + sr * 0.04, -0.12 - sr * 0.06);
            scPlate.rotation.x = -0.2;
            group.add(scPlate);
          }
        }
        // Back ridge of tiny spines (9 small cones from neck to tail)
        for (let sp = 0; sp < 9; sp++) {
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.016 - sp * 0.001, 0.055 - sp * 0.003, 6), whelpScaleMat);
          spine.position.set(0, 0.72 - sp * 0.04, -0.05 - sp * 0.05);
          spine.rotation.x = 0.15 + sp * 0.04;
          group.add(spine);
        }

        // Neck scales
        const whelpNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.14, 14), whelpMat);
        whelpNeck.position.set(0, 0.72, 0.12);
        whelpNeck.rotation.x = 0.35;
        group.add(whelpNeck);
        for (let ns = 0; ns < 4; ns++) {
          const nsAng = (ns / 4) * Math.PI * 2;
          const nScale = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.025), whelpScaleMat);
          nScale.position.set(Math.cos(nsAng) * 0.075, 0.7 + ns * 0.02, 0.12 + Math.sin(nsAng) * 0.075);
          group.add(nScale);
        }

        // Cute but fierce head: sphere with small snout
        const whelpHead = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), whelpMat);
        whelpHead.position.set(0, 0.78, 0.18);
        whelpHead.scale.set(1, 1.05, 1);
        group.add(whelpHead);
        // Small snout (cone)
        const whelpSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.072, 0.15, 14), whelpMat);
        whelpSnout.position.set(0, 0.74, 0.31);
        whelpSnout.rotation.x = Math.PI / 2;
        group.add(whelpSnout);
        // Tiny nostrils
        for (const nx of [-0.025, 0.025]) {
          const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.012, 6), whelpScaleMat);
          nostril.position.set(nx, 0.755, 0.395);
          nostril.rotation.x = Math.PI / 2;
          group.add(nostril);
        }
        // Wide eyes (large for cute factor) with dark pupils
        for (const ex of [-0.07, 0.07]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), whelpScaleMat);
          eyeSocket.position.set(ex, 0.82, 0.29);
          group.add(eyeSocket);
          const whelpEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), whelpEyeMat);
          whelpEye.position.set(ex, 0.82, 0.32);
          group.add(whelpEye);
          const eyePupil = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.004), new THREE.MeshStandardMaterial({ color: 0x000000 }));
          eyePupil.position.set(ex, 0.82, 0.35);
          group.add(eyePupil);
        }
        // 2 main horns + 2 smaller nubs
        for (const [hx, hy, hz, hs, ha] of [[-0.07, 0.94, 0.17, 1, 0.3], [0.07, 0.94, 0.17, 1, -0.3], [-0.04, 0.9, 0.14, 0.6, 0.2], [0.04, 0.9, 0.14, 0.6, -0.2]] as [number, number, number, number, number][]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.014 * hs, 0.07 * hs, 8), whelpHornMat);
          horn.position.set(hx, hy, hz);
          horn.rotation.z = ha;
          horn.rotation.x = -0.15;
          group.add(horn);
        }
        // Jaw group (anim_jaw) with small teeth
        {
          const whelpJawGroup = new THREE.Group();
          whelpJawGroup.name = 'anim_jaw';
          whelpJawGroup.position.set(0, 0.68, 0.26);
          const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.16), whelpScaleMat);
          jaw.position.set(0, -0.03, 0.04);
          whelpJawGroup.add(jaw);
          for (let jt = 0; jt < 4; jt++) {
            const jTooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 6), whelpBellyMat);
            jTooth.position.set(-0.05 + jt * 0.033, 0.0, 0.04 + (jt % 2) * 0.03);
            jTooth.rotation.z = Math.PI;
            whelpJawGroup.add(jTooth);
          }
          group.add(whelpJawGroup);
        }
        // Ear frills (small triangular planes on sides of head)
        for (const frillX of [-0.16, 0.16]) {
          const frill = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.08), whelpWingMat);
          frill.position.set(frillX, 0.85, 0.17);
          frill.rotation.y = frillX < 0 ? -0.5 : 0.5;
          frill.rotation.z = frillX < 0 ? 0.3 : -0.3;
          group.add(frill);
        }
        // Small fire breath glow in front of mouth
        const breathGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), whelpFireMat);
        breathGlow.position.set(0, 0.72, 0.45);
        group.add(breathGlow);

        // Small but detailed wings (anim_lw, anim_rw): bone structure + membrane panels
        for (const wx of [-1, 1]) {
          const whelpWingGroup = new THREE.Group();
          whelpWingGroup.name = wx < 0 ? 'anim_lw' : 'anim_rw';
          whelpWingGroup.position.set(wx * 0.24, 0.62, 0.02);
          // Main wing bone
          const mainBone = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.42, 10), whelpWingBoneMat);
          mainBone.position.set(wx * 0.18, 0.05, -0.04);
          mainBone.rotation.z = wx < 0 ? 0.5 : -0.5;
          mainBone.rotation.x = 0.1;
          whelpWingGroup.add(mainBone);
          // Secondary bone
          const secBone = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.32, 8), whelpWingBoneMat);
          secBone.position.set(wx * 0.25, -0.04, -0.06);
          secBone.rotation.z = wx < 0 ? 0.7 : -0.7;
          secBone.rotation.x = 0.2;
          whelpWingGroup.add(secBone);
          // Small wing claws at tips
          const wingClaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 6), whelpClawMat);
          wingClaw.position.set(wx * 0.36, 0.08, -0.04);
          wingClaw.rotation.z = wx < 0 ? 1.2 : -1.2;
          whelpWingGroup.add(wingClaw);
          // 2 membrane panels
          for (let wp2 = 0; wp2 < 2; wp2++) {
            const membrane = new THREE.Mesh(new THREE.PlaneGeometry(0.2 - wp2 * 0.04, 0.18 + wp2 * 0.04, 2, 2), whelpWingMat);
            membrane.position.set(wx * (0.2 + wp2 * 0.1), -0.02 - wp2 * 0.04, -0.05 - wp2 * 0.02);
            membrane.rotation.y = wx < 0 ? -(0.5 + wp2 * 0.1) : (0.5 + wp2 * 0.1);
            membrane.rotation.z = wx < 0 ? (0.2 + wp2 * 0.05) : -(0.2 + wp2 * 0.05);
            whelpWingGroup.add(membrane);
          }
          group.add(whelpWingGroup);
        }

        // Proper legs: chubby thigh, shin, small clawed feet (3 claws each)
        for (const [lx, lz, lgn] of [[-0.12, 0.1, 'anim_fll'], [0.12, 0.1, 'anim_frl'], [-0.12, -0.12, 'anim_bll'], [0.12, -0.12, 'anim_brl']] as [number, number, string][]) {
          const whelpLegGroup = new THREE.Group();
          whelpLegGroup.name = lgn;
          whelpLegGroup.position.set(lx, 0.33, lz);
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.16, 14), whelpMat);
          thigh.position.y = -0.06;
          whelpLegGroup.add(thigh);
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), whelpScaleMat);
          knee.position.y = -0.14;
          whelpLegGroup.add(knee);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 12), whelpMat);
          shin.position.y = -0.24;
          whelpLegGroup.add(shin);
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), whelpScaleMat);
          foot.position.set(0, -0.34, 0.03);
          whelpLegGroup.add(foot);
          for (let cl = 0; cl < 3; cl++) {
            const ca = (cl - 1) * 0.28;
            const footClaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 6), whelpClawMat);
            footClaw.position.set(Math.sin(ca) * 0.025, -0.39, 0.03);
            footClaw.rotation.x = -0.45;
            footClaw.rotation.z = ca;
            whelpLegGroup.add(footClaw);
          }
          group.add(whelpLegGroup);
        }

        // Enhanced tail (anim_tail): 3 segments getting thinner, small diamond tip
        {
          const whelpTailGroup = new THREE.Group();
          whelpTailGroup.name = 'anim_tail';
          whelpTailGroup.position.set(0, 0.46, -0.2);
          const tailSegs: [number, number, number, number, number][] = [
            [0, 0, -0.1, 0.065, 0.18],
            [0, -0.03, -0.27, 0.05, 0.16],
            [0, -0.08, -0.42, 0.034, 0.14],
          ];
          for (const [ttx, tty, ttz, ttr, ttl] of tailSegs) {
            const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(ttr, ttr * 0.78, ttl, 12), whelpMat);
            tailSeg.position.set(ttx, tty, ttz);
            tailSeg.rotation.x = -0.35;
            whelpTailGroup.add(tailSeg);
          }
          // Diamond/spade tip
          const spadeTip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.08, 8), whelpScaleMat);
          spadeTip.position.set(0, -0.12, -0.56);
          spadeTip.rotation.x = -Math.PI / 2 + 0.25;
          whelpTailGroup.add(spadeTip);
          const spadeL2 = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.065, 6), whelpHornMat);
          spadeL2.position.set(-0.04, -0.12, -0.62);
          spadeL2.rotation.z = -0.45;
          spadeL2.rotation.x = -Math.PI / 2 + 0.2;
          whelpTailGroup.add(spadeL2);
          const spadeR2 = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.065, 6), whelpHornMat);
          spadeR2.position.set(0.04, -0.12, -0.62);
          spadeR2.rotation.z = 0.45;
          spadeR2.rotation.x = -Math.PI / 2 + 0.2;
          whelpTailGroup.add(spadeR2);
          group.add(whelpTailGroup);
        }
        break;
      }
            // --- ELDER_DRAGON | Estimated polygons: ~90000 triangles ---
      case EnemyType.ELDER_DRAGON: {
        const dragonMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.42, metalness: 0.28 });
        const dragonDarkMat = new THREE.MeshStandardMaterial({ color: 0x5a2a11, roughness: 0.5, metalness: 0.2 });
        const dragonBellyMat = new THREE.MeshStandardMaterial({ color: 0xcc7755, roughness: 0.45, metalness: 0.15 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.9 });
        const fireCoreMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.5 });
        const fireAuraEDMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.45 });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x663311, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
        const wingBoneMatED = new THREE.MeshStandardMaterial({ color: 0x3a1a08, roughness: 0.7, metalness: 0.15 });
        const hornMatED = new THREE.MeshStandardMaterial({ color: 0x1a1100, roughness: 0.35, metalness: 0.4 });
        const clawMatED = new THREE.MeshStandardMaterial({ color: 0x0a0800, roughness: 0.3, metalness: 0.5 });
        const scarMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff1100, emissiveIntensity: 1.8, transparent: true, opacity: 0.6 });
        const groundGlowMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff1100, emissiveIntensity: 0.7, transparent: true, opacity: 0.55 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 });

        // Massive scaled body: main sphere + overlapping scale plates on back
        const edBody = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), dragonMat);
        edBody.scale.set(1.1, 0.78, 1.4);
        edBody.position.set(0, 1.08, -0.05);
        edBody.castShadow = true;
        group.add(edBody);
        // 20+ back scale plates
        for (let sr = 0; sr < 5; sr++) {
          for (let sc2 = 0; sc2 < 5; sc2++) {
            const scX = (sc2 - 2) * 0.2 + (sr % 2 === 0 ? 0.1 : 0);
            const scPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.15), sr % 2 === 0 ? dragonMat : dragonDarkMat);
            scPlate.position.set(scX, 1.42 + sr * 0.02, -0.25 - sr * 0.12);
            scPlate.rotation.x = -0.2 - sr * 0.04;
            group.add(scPlate);
          }
        }
        // 10+ lighter belly plates underneath
        for (let bp = 0; bp < 6; bp++) {
          const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52 - bp * 0.04, 0.1, 0.14), dragonBellyMat);
          bellyPlate.position.set(0, 0.72 + bp * 0.04, 0.52 - bp * 0.04);
          bellyPlate.rotation.x = -0.12 * bp;
          group.add(bellyPlate);
        }
        // Chest scar/wound (battle damage) with emissive glow
        const scar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), scarMat);
        scar.position.set(0.12, 1.12, 0.55);
        scar.rotation.z = 0.3;
        group.add(scar);
        const scarCore = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.04), fireCoreMat);
        scarCore.position.set(0.12, 1.12, 0.57);
        scarCore.rotation.z = 0.3;
        group.add(scarCore);
        // Spine ridge from head to tail (15 cones of varying size)
        for (let sp = 0; sp < 15; sp++) {
          const spH = sp < 4 ? 0.18 - sp * 0.01 : sp < 10 ? 0.14 - (sp - 4) * 0.006 : 0.08 - (sp - 10) * 0.005;
          const spR = sp < 4 ? 0.04 : sp < 10 ? 0.032 - (sp - 4) * 0.002 : 0.018;
          const spine = new THREE.Mesh(new THREE.ConeGeometry(spR, spH, 8), dragonDarkMat);
          spine.position.set(0, 1.52 - sp * 0.04, 0.28 - sp * 0.12);
          spine.rotation.x = 0.1 + sp * 0.03;
          group.add(spine);
        }

        // Powerful neck: 3 cylinder segments
        const neckData: [number, number, number, number, number, number, number][] = [
          [0, 1.5, 0.55, 0.22, 0.28, 0.28, -0.4],
          [0, 1.72, 0.82, 0.18, 0.24, 0.22, -0.5],
          [0, 1.88, 1.05, 0.15, 0.2, 0.18, -0.55],
        ];
        for (const [nx, ny, nz, nrt, nrb, nl, nrx] of neckData) {
          const neckSeg = new THREE.Mesh(new THREE.CylinderGeometry(nrt, nrb, nl, 16), dragonMat);
          neckSeg.position.set(nx, ny, nz);
          neckSeg.rotation.x = nrx;
          group.add(neckSeg);
        }
        // Neck scale ridges
        for (let nr = 0; nr < 3; nr++) {
          const nRidge = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 8), dragonDarkMat);
          nRidge.position.set(0, 1.56 + nr * 0.18, 0.62 + nr * 0.25);
          nRidge.rotation.x = 0.3;
          group.add(nRidge);
        }

        // Imposing head (anim_head): elongated skull, jaws, horns, crest, nostril, brow
        const elderHeadGroup = new THREE.Group();
        elderHeadGroup.name = 'anim_head';
        elderHeadGroup.position.set(0, 1.98, 1.22);
        // Skull: box + sphere
        const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.56), dragonMat);
        headBox.position.set(0, 0, 0);
        elderHeadGroup.add(headBox);
        const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), dragonMat);
        headSphere.scale.set(1, 0.9, 1.2);
        headSphere.position.set(0, 0.04, -0.1);
        elderHeadGroup.add(headSphere);
        // Brow ridges above each eye
        for (const brx of [-0.15, 0.15]) {
          const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.1), dragonDarkMat);
          browRidge.position.set(brx, 0.16, 0.18);
          browRidge.rotation.z = brx < 0 ? 0.2 : -0.2;
          elderHeadGroup.add(browRidge);
        }
        // 2 large horns + 2 smaller horns curving backward
        const hornData: [number, number, number, number, number, number, number, number][] = [
          [-0.18, 0.22, -0.08, 0.055, 0.42, -0.3, 0.3, -0.15],
          [0.18, 0.22, -0.08, 0.055, 0.42, 0.3, -0.3, -0.15],
          [-0.12, 0.16, -0.02, 0.03, 0.24, -0.2, 0.18, -0.1],
          [0.12, 0.16, -0.02, 0.03, 0.24, 0.2, -0.18, -0.1],
        ];
        for (const [hx, hy, hz, hr, hl, _hrzx, hrz, hrxx] of hornData) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(hr, hl, 10), hornMatED);
          horn.position.set(hx, hy, hz);
          horn.rotation.x = hrxx;
          horn.rotation.z = hrz;
          elderHeadGroup.add(horn);
        }
        // Head crest/frill
        for (let hcr = 0; hcr < 5; hcr++) {
          const crestSpike = new THREE.Mesh(new THREE.ConeGeometry(0.028 - hcr * 0.003, 0.1 + hcr * 0.01, 8), dragonDarkMat);
          crestSpike.position.set(0, 0.22 + hcr * 0.02, -0.12 - hcr * 0.04);
          elderHeadGroup.add(crestSpike);
        }
        // Fiery eyes with brow ridge
        const eyeMatED = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.5 });
        for (const ex of [-0.14, 0.14]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 8), dragonDarkMat);
          eyeSocket.position.set(ex, 0.08, 0.22);
          elderHeadGroup.add(eyeSocket);
          const edEye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), eyeMatED);
          edEye.position.set(ex, 0.08, 0.26);
          elderHeadGroup.add(edEye);
          const edEyeCore = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), fireCoreMat);
          edEyeCore.position.set(ex, 0.08, 0.3);
          elderHeadGroup.add(edEyeCore);
        }
        // Nostril detail
        for (const nx of [-0.08, 0.08]) {
          const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.025, 8), dragonDarkMat);
          nostril.position.set(nx, -0.04, 0.28);
          nostril.rotation.x = Math.PI / 2;
          elderHeadGroup.add(nostril);
        }
        // Upper teeth row
        for (let t = 0; t < 8; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.055, 6), boneMat);
          tooth.position.set(-0.16 + t * 0.045, -0.1, 0.2 + (t % 2) * 0.06);
          elderHeadGroup.add(tooth);
        }
        group.add(elderHeadGroup);

        // Jaw group (anim_jaw): functional lower jaw with teeth + tongue
        {
          const elderJawGroup = new THREE.Group();
          elderJawGroup.name = 'anim_jaw';
          elderJawGroup.position.set(0, 1.86, 1.28);
          const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.5), dragonDarkMat);
          jaw.position.set(0, -0.06, 0.1);
          elderJawGroup.add(jaw);
          const jawTip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.12), dragonDarkMat);
          jawTip.position.set(0, -0.05, 0.36);
          elderJawGroup.add(jawTip);
          for (let jt = 0; jt < 8; jt++) {
            const jTooth = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.048, 6), boneMat);
            jTooth.position.set(-0.16 + jt * 0.045, -0.02, 0.06 + (jt % 2) * 0.06);
            jTooth.rotation.z = Math.PI;
            elderJawGroup.add(jTooth);
          }
          // Tongue
          const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: 0xcc2200, emissive: 0x880000, emissiveIntensity: 0.4 }));
          tongue.position.set(0, -0.02, 0.2);
          elderJawGroup.add(tongue);
          group.add(elderJawGroup);
        }

        // Massive wings (anim_lw, anim_rw): multi-bone with 5 finger bones and membrane panels
        for (const wx of [-1, 1]) {
          const elderWingGroup = new THREE.Group();
          elderWingGroup.name = wx < 0 ? 'anim_lw' : 'anim_rw';
          elderWingGroup.position.set(wx * 0.44, 1.38, -0.04);
          // Wing muscle at shoulder
          const wingMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), dragonDarkMat);
          wingMuscle.position.set(wx * 0.08, 0, 0);
          elderWingGroup.add(wingMuscle);
          // Main arm bone
          const mainBone = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.72, 14), wingBoneMatED);
          mainBone.position.set(wx * 0.3, 0.08, -0.06);
          mainBone.rotation.z = wx < 0 ? 0.45 : -0.45;
          mainBone.rotation.x = 0.12;
          elderWingGroup.add(mainBone);
          // Wing claw at the bend
          const wingClaw = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 8), clawMatED);
          wingClaw.position.set(wx * 0.58, 0.22, -0.04);
          wingClaw.rotation.z = wx < 0 ? 1.4 : -1.4;
          elderWingGroup.add(wingClaw);
          // 4 finger bones radiating outward
          for (let fb = 0; fb < 4; fb++) {
            const fingerBone = new THREE.Mesh(new THREE.CylinderGeometry(0.022 - fb * 0.003, 0.016 - fb * 0.002, 0.55 + fb * 0.06, 10), wingBoneMatED);
            fingerBone.position.set(wx * (0.42 + fb * 0.05), 0.1 - fb * 0.04, -0.08 - fb * 0.04);
            fingerBone.rotation.z = wx < 0 ? (0.35 + fb * 0.12) : -(0.35 + fb * 0.12);
            fingerBone.rotation.x = 0.18 + fb * 0.06;
            elderWingGroup.add(fingerBone);
          }
          // 4 membrane panels between finger bones
          for (let wp2 = 0; wp2 < 4; wp2++) {
            const panelW = 0.38 - wp2 * 0.04;
            const panelH = 0.52 + wp2 * 0.06;
            const membrane = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH, 4, 4), wingMat);
            membrane.position.set(wx * (0.48 + wp2 * 0.12), 0.05 - wp2 * 0.06, -0.08 - wp2 * 0.03);
            membrane.rotation.y = wx < 0 ? -(0.42 + wp2 * 0.08) : (0.42 + wp2 * 0.08);
            membrane.rotation.z = wx < 0 ? (0.18 + wp2 * 0.04) : -(0.18 + wp2 * 0.04);
            elderWingGroup.add(membrane);
          }
          group.add(elderWingGroup);
        }

        // Powerful legs (anim_fll, anim_frl, anim_bll, anim_brl): thick thigh, knee, shin, 4 claws
        for (const [lx, lz, lgn] of [[-0.45, 0.45, 'anim_fll'], [0.45, 0.45, 'anim_frl'], [-0.45, -0.55, 'anim_bll'], [0.45, -0.55, 'anim_brl']] as [number, number, string][]) {
          const elderLegGroup = new THREE.Group();
          elderLegGroup.name = lgn;
          elderLegGroup.position.set(lx, 0.8, lz);
          // Thick thigh
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.38, 18), dragonMat);
          thigh.position.y = -0.14;
          elderLegGroup.add(thigh);
          // Knee joint
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), dragonDarkMat);
          knee.position.y = -0.36;
          elderLegGroup.add(knee);
          // Shin
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.36, 16), dragonMat);
          shin.position.y = -0.6;
          elderLegGroup.add(shin);
          // Massive clawed foot (4 claws)
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), dragonDarkMat);
          foot.position.set(0, -0.82, 0.06);
          elderLegGroup.add(foot);
          for (let cl = 0; cl < 4; cl++) {
            const ca = (cl - 1.5) * 0.28;
            const legClaw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), clawMatED);
            legClaw.position.set(Math.sin(ca) * 0.07, -0.92, 0.08);
            legClaw.rotation.x = -0.6;
            legClaw.rotation.z = ca;
            elderLegGroup.add(legClaw);
          }
          group.add(elderLegGroup);
        }

        // Long segmented tail (anim_tail): 5 segments with dorsal spines and tail club
        {
          const elderTailGroup = new THREE.Group();
          elderTailGroup.name = 'anim_tail';
          elderTailGroup.position.set(0, 0.92, -0.8);
          const tailSegData: [number, number, number, number, number][] = [
            [0, 0, -0.14, 0.14, 0.28],
            [0, -0.03, -0.4, 0.118, 0.26],
            [0, -0.09, -0.64, 0.095, 0.24],
            [0, -0.18, -0.86, 0.072, 0.22],
            [0, -0.3, -1.06, 0.05, 0.2],
          ];
          for (const [ttx, tty, ttz, ttr, ttl] of tailSegData) {
            const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(ttr, ttr * 0.82, ttl, 14), dragonMat);
            tailSeg.position.set(ttx, tty, ttz);
            tailSeg.rotation.x = -0.32;
            elderTailGroup.add(tailSeg);
          }
          // Dorsal spines along top of tail
          for (let ts = 0; ts < 5; ts++) {
            const tSpine = new THREE.Mesh(new THREE.ConeGeometry(0.028 - ts * 0.004, 0.1 - ts * 0.01, 8), dragonDarkMat);
            tSpine.position.set(0, 0.02 - ts * 0.03, -0.2 - ts * 0.18);
            tSpine.rotation.x = 0.2;
            elderTailGroup.add(tSpine);
          }
          // Tail club/blade at end
          const tailClub = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), dragonDarkMat);
          tailClub.position.set(0, -0.38, -1.2);
          elderTailGroup.add(tailClub);
          const clubSpike = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.15, 8), hornMatED);
          clubSpike.position.set(0, -0.38, -1.34);
          clubSpike.rotation.x = -Math.PI / 2 + 0.22;
          elderTailGroup.add(clubSpike);
          for (const csx of [-0.065, 0.065]) {
            const sideSpike = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 6), hornMatED);
            sideSpike.position.set(csx, -0.38, -1.22);
            sideSpike.rotation.z = csx < 0 ? -0.7 : 0.7;
            sideSpike.rotation.x = -Math.PI / 2 + 0.2;
            elderTailGroup.add(sideSpike);
          }
          group.add(elderTailGroup);
        }

        // Fire breath: enhanced with multiple overlapping emissive shapes
        const breathCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), fireCoreMat);
        breathCore.position.set(0, 1.88, 1.78);
        group.add(breathCore);
        const breathCone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 16), fireMat);
        breathCone.position.set(0, 1.88, 2.02);
        breathCone.rotation.x = Math.PI / 2;
        group.add(breathCone);
        const breathAura = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), fireAuraEDMat);
        breathAura.position.set(0, 1.88, 1.78);
        group.add(breathAura);
        // Ember particles around breath
        for (let em = 0; em < 5; em++) {
          const emAng = (em / 5) * Math.PI * 2;
          const ember = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), fireCoreMat);
          ember.position.set(Math.cos(emAng) * 0.14, 1.88 + Math.sin(emAng) * 0.12, 1.92);
          group.add(ember);
        }

        // Ground scorching beneath (emissive circle)
        const groundScorch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.85, 0.03, 24), groundGlowMat);
        groundScorch.position.set(0, 0.02, 0);
        group.add(groundScorch);
        break;
      }


      // ── DESERT ENEMIES ──────────────────────────────────────────
      case EnemyType.SAND_SCORPION: {
        // --- SAND_SCORPION | Estimated polygons: ~210000 triangles ---
        const shellMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7, metalness: 0.1 });
        const underMat = new THREE.MeshStandardMaterial({ color: 0xa09070, roughness: 0.6 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x6b5335, roughness: 0.5, metalness: 0.2 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0, metalness: 0.5 });
        const venomMat = new THREE.MeshStandardMaterial({ color: 0x44ff22, emissive: 0x22aa00, emissiveIntensity: 1.2, transparent: true, opacity: 0.7 });
        const stingerMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0x661100, emissiveIntensity: 0.8 });
        const sandDebrisMat = new THREE.MeshStandardMaterial({ color: 0xc8b090, roughness: 0.95 });

        // --- Segmented carapace: 4 overlapping plates ---
        const plateSizes: [number, number, number, number][] = [
          [0.52, 0.09, 0.36, 0.0],
          [0.48, 0.085, 0.32, 0.18],
          [0.42, 0.08, 0.28, 0.34],
          [0.34, 0.075, 0.24, 0.46],
        ];
        for (const [pw, ph, pz, pzOff] of plateSizes) {
          const plate = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), shellMat);
          plate.scale.set(pw / 0.28, ph / 0.28, pz / 0.28);
          plate.position.set(0, 0.29 + ph * 0.5, -0.05 + pzOff);
          plate.castShadow = true;
          group.add(plate);
        }
        // Ridge boxes in pattern (9 ridges across plates)
        for (let r = 0; r < 9; r++) {
          const col = r % 3;
          const row = Math.floor(r / 3);
          const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.38 - col * 0.06, 0.018, 0.035), shellMat);
          ridge.position.set((col - 1) * 0.12, 0.43 - row * 0.02, -0.05 + row * 0.22);
          group.add(ridge);
        }
        // Edge serrations along carapace perimeter (tiny cones)
        for (let e = 0; e < 16; e++) {
          const ang = (e / 16) * Math.PI * 2;
          const ser = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 8), shellMat);
          ser.position.set(Math.cos(ang) * 0.44, 0.3, Math.sin(ang) * 0.52 - 0.05);
          ser.rotation.z = Math.cos(ang) * 0.6;
          ser.rotation.x = -Math.sin(ang) * 0.3;
          group.add(ser);
        }

        // Underbelly
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), underMat);
        belly.scale.set(1.1, 0.3, 1.4);
        belly.position.y = 0.18;
        group.add(belly);
        // Pectines (comb-like sensory organs — row of tiny cylinders)
        for (let pc = 0; pc < 10; pc++) {
          const pec = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.06, 8), underMat);
          pec.position.set(-0.22 + pc * 0.05, 0.14, 0.1);
          pec.rotation.x = Math.PI / 2;
          group.add(pec);
        }
        // Book lung slits
        for (let bl = 0; bl < 4; bl++) {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.008, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a4520 }));
          slit.position.set(-0.12 + bl * 0.08, 0.16, -0.08 + bl * 0.04);
          group.add(slit);
        }

        // --- Chelicerae (mouth parts) ---
        for (const side of [-1, 1]) {
          const chelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 12), clawMat);
          chelBase.position.set(side * 0.06, 0.3, 0.5);
          chelBase.rotation.z = side * 0.4;
          group.add(chelBase);
          const chelClaw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 12), stingerMat);
          chelClaw.position.set(side * 0.09, 0.26, 0.57);
          chelClaw.rotation.x = 0.5;
          group.add(chelClaw);
        }

        // --- 6 eyes: median pair + 2 lateral pairs ---
        const eyePositions6 = [
          [-0.025, 0.44, 0.44], [0.025, 0.44, 0.44],  // median
          [-0.07, 0.42, 0.41], [0.07, 0.42, 0.41],     // lateral inner
          [-0.11, 0.40, 0.38], [0.11, 0.40, 0.38],     // lateral outer
        ];
        for (const ep of eyePositions6) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), eyeMat);
          eye.position.set(ep[0], ep[1], ep[2]);
          group.add(eye);
        }

        // --- Tail: 9 segments curving up and over ---
        const scTailGroup = new THREE.Group();
        scTailGroup.name = 'anim_tail';
        scTailGroup.position.set(0, 0.35, -0.4);
        for (let s = 0; s < 9; s++) {
          const r = 0.1 - s * 0.007;
          const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), shellMat);
          const t = s / 8;
          seg.position.set(0, t * t * 1.35, -t * 0.58 + t * t * 0.42);
          seg.castShadow = true;
          scTailGroup.add(seg);
          // Joint ring between segments
          if (s > 0) {
            const joint = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.008, 16, 24), underMat);
            joint.rotation.x = Math.PI / 2;
            joint.position.copy(seg.position);
            scTailGroup.add(joint);
          }
          // Dorsal ridge box on each segment
          const dRidge = new THREE.Mesh(new THREE.BoxGeometry(r * 0.6, r * 0.35, r * 0.5), shellMat);
          dRidge.position.set(0, seg.position.y + r * 0.85, seg.position.z);
          scTailGroup.add(dRidge);
        }
        // Vesicle (bulbous segment before stinger)
        const vesicle = new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 24), shellMat);
        vesicle.position.set(0, 1.18, 0.0);
        scTailGroup.add(vesicle);
        // Stinger
        const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 16), stingerMat);
        stinger.position.set(0, 1.3, 0.06);
        stinger.rotation.x = 0.6;
        scTailGroup.add(stinger);
        // Venom channel groove (thin dark strip along stinger)
        const venomGroove = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.18, 0.004), new THREE.MeshStandardMaterial({ color: 0x002200 }));
        venomGroove.position.set(0, 1.3, 0.035);
        venomGroove.rotation.x = 0.6;
        scTailGroup.add(venomGroove);
        // 3 venom drops
        for (let vd = 0; vd < 3; vd++) {
          const vDrop = new THREE.Mesh(new THREE.SphereGeometry(0.012 + vd * 0.004, 12, 8), venomMat);
          vDrop.position.set((vd - 1) * 0.018, 1.1 - vd * 0.04, 0.14 + vd * 0.01);
          scTailGroup.add(vDrop);
        }
        group.add(scTailGroup);

        // --- Enhanced Pedipalps / Claws ---
        for (const side of [-1, 1]) {
          const pincerGroup = new THREE.Group();
          pincerGroup.name = side === -1 ? 'anim_la' : 'anim_ra';
          pincerGroup.position.set(side * 0.3, 0.28, 0.35);
          // Upper arm
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.32, 16), clawMat);
          upperArm.rotation.z = side * 0.5;
          upperArm.castShadow = true;
          pincerGroup.add(upperArm);
          // Forearm
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.26, 16), clawMat);
          forearm.position.set(side * 0.19, -0.03, 0.13);
          forearm.rotation.z = side * 0.3;
          pincerGroup.add(forearm);
          // Wrist joint sphere
          const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), clawMat);
          wrist.position.set(side * 0.29, -0.03, 0.22);
          pincerGroup.add(wrist);
          // Claw base
          const clawBase = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), clawMat);
          clawBase.scale.set(1, 0.62, 1.25);
          clawBase.position.set(side * 0.30, -0.03, 0.28);
          pincerGroup.add(clawBase);
          // Upper pincer (thicker)
          const upperP = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.028, 0.2), clawMat);
          upperP.position.set(side * 0.30, 0.022, 0.38);
          upperP.rotation.y = side * 0.15;
          pincerGroup.add(upperP);
          // Upper pincer hook tip
          const upperHook = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 12), stingerMat);
          upperHook.position.set(side * 0.30, 0.018, 0.49);
          upperHook.rotation.x = 0.5;
          pincerGroup.add(upperHook);
          // Lower pincer
          const lowerP = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.17), clawMat);
          lowerP.position.set(side * 0.30, -0.065, 0.36);
          lowerP.rotation.y = side * -0.1;
          pincerGroup.add(lowerP);
          // Serrated inner edge: 5 tiny cones on each pincer
          for (let sc2 = 0; sc2 < 5; sc2++) {
            const serr = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.022, 8), clawMat);
            serr.position.set(side * 0.30, 0.005, 0.29 + sc2 * 0.04);
            serr.rotation.x = -Math.PI / 2;
            pincerGroup.add(serr);
          }
          group.add(pincerGroup);
        }

        // --- 8 segmented legs with tarsus claws and hair bristles ---
        for (let i = 0; i < 4; i++) {
          for (const side of [-1, 1]) {
            const scLegGroup = new THREE.Group();
            scLegGroup.name = i === 0 ? (side === -1 ? 'anim_fll' : 'anim_frl') : i === 3 ? (side === -1 ? 'anim_bll' : 'anim_brl') : ('anim_leg_' + (i * 2 + (side === 1 ? 1 : 0)));
            scLegGroup.position.set(side * (0.33 + i * 0.04), 0.28, 0.15 - i * 0.18);
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.22, 16), shellMat);
            upper.position.y = -0.06;
            upper.rotation.z = side * 0.7;
            scLegGroup.add(upper);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), shellMat);
            knee.position.set(side * 0.11, -0.17, 0);
            scLegGroup.add(knee);
            const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.17, 16), shellMat);
            lower.position.set(side * 0.15, -0.24, 0);
            lower.rotation.z = side * 0.22;
            scLegGroup.add(lower);
            // Tarsus (foot segment)
            const tarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, 0.1, 12), shellMat);
            tarsus.position.set(side * 0.19, -0.33, 0.02);
            tarsus.rotation.z = side * 0.1;
            scLegGroup.add(tarsus);
            // Foot claw
            const footClaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 8), stingerMat);
            footClaw.position.set(side * 0.21, -0.39, 0.04);
            footClaw.rotation.x = 0.4;
            scLegGroup.add(footClaw);
            // Hair bristles (3 cones per leg)
            for (let br = 0; br < 3; br++) {
              const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.022, 6), shellMat);
              bristle.position.set(side * (0.13 + br * 0.02), -0.16 - br * 0.06, (br - 1) * 0.02);
              bristle.rotation.z = side * (0.8 + br * 0.2);
              scLegGroup.add(bristle);
            }
            group.add(scLegGroup);
          }
        }

        // --- Sand debris scattered around body ---
        for (let sd = 0; sd < 8; sd++) {
          const ang = (sd / 8) * Math.PI * 2;
          const debris = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.025, 8, 6), sandDebrisMat);
          debris.position.set(Math.cos(ang) * (0.45 + sd * 0.04), 0.04, Math.sin(ang) * 0.5);
          group.add(debris);
        }
        break;
      }

      case EnemyType.DESERT_BANDIT: {
        // --- DESERT_BANDIT | Estimated polygons: ~165000 triangles ---
        const robesMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.8 });
        const robeTrimMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.7 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.6 });
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.75 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
        const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.6, roughness: 0.3 });
        const embroideryMat = new THREE.MeshStandardMaterial({ color: 0xcc8822, metalness: 0.2, roughness: 0.5 });
        const tattooMat = new THREE.MeshStandardMaterial({ color: 0x3a1a0a, emissive: 0x220800, emissiveIntensity: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const turbanMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.7 });

        // --- Torso with layered robes ---
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.22), robesMat);
        torso.position.y = 0.92;
        torso.castShadow = true;
        group.add(torso);
        // Inner shirt visible at neck (slightly lighter)
        const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xddbb88, roughness: 0.7 }));
        innerShirt.position.set(0, 1.12, 0.08);
        group.add(innerShirt);
        // Outer robe flap (front)
        const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.03), robeTrimMat);
        robeFront.position.set(0, 0.78, 0.12);
        robeFront.rotation.x = 0.1;
        group.add(robeFront);
        // Embroidered trim rows along robe edges (8 small colored boxes)
        for (let em = 0; em < 8; em++) {
          const emb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.012), embroideryMat);
          emb.position.set(-0.14 + em * 0.04, 0.62, 0.14);
          group.add(emb);
        }
        for (let em2 = 0; em2 < 5; em2++) {
          const emb2 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.012), embroideryMat);
          emb2.position.set(-0.148, 0.68 + em2 * 0.04, 0.12);
          group.add(emb2);
          const emb3 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.012), embroideryMat);
          emb3.position.set(0.148, 0.68 + em2 * 0.04, 0.12);
          group.add(emb3);
        }
        // Robe skirt
        const robeSkirt = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 24), robesMat);
        robeSkirt.position.y = 0.58;
        group.add(robeSkirt);

        // --- Wide sash/belt with multiple pouches ---
        const belt = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 16, 32), leatherMat);
        belt.rotation.x = Math.PI / 2;
        belt.position.y = 0.72;
        group.add(belt);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), goldTrimMat);
        buckle.position.set(0, 0.72, 0.21);
        group.add(buckle);
        // 4 pouches on belt
        const pouchOffsets = [[-0.18, 0.1], [-0.12, 0.1], [0.14, 0.1], [0.19, 0.08]];
        for (const [px, pz] of pouchOffsets) {
          const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.068, 0.048), leatherMat);
          pouch.position.set(px, 0.69, pz);
          group.add(pouch);
        }
        // Coin purse (small sphere)
        const coinPurse = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), leatherMat);
        coinPurse.position.set(0.08, 0.68, 0.18);
        group.add(coinPurse);
        // Throwing daggers (2 small blade boxes on belt)
        for (let dg = 0; dg < 2; dg++) {
          const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.008), metalMat);
          dagger.position.set(-0.06 + dg * 0.04, 0.71, 0.19);
          dagger.rotation.z = 0.15;
          group.add(dagger);
        }

        // --- Shoulder wraps ---
        for (const sx of [-0.22, 0.22]) {
          const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 32, 24), robeTrimMat);
          wrap.scale.set(1, 0.6, 1);
          wrap.position.set(sx, 1.15, 0);
          group.add(wrap);
          // Shoulder cape/cloak flowing behind (2 thin planes per shoulder)
          for (let cp = 0; cp < 2; cp++) {
            const cape = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22 + cp * 0.06, 0.014), new THREE.MeshStandardMaterial({ color: 0x997733, transparent: true, opacity: 0.75, roughness: 0.8 }));
            cape.position.set(sx * (0.9 + cp * 0.05), 0.98 - cp * 0.04, -0.1 - cp * 0.02);
            cape.rotation.z = sx > 0 ? -0.12 - cp * 0.08 : 0.12 + cp * 0.08;
            group.add(cape);
          }
        }

        // --- Neck scarf/shemagh ---
        const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), robesMat);
        scarf.position.set(0, 1.22, 0.02);
        group.add(scarf);
        // Neck chain with pendant
        const neckChain = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.005, 8, 24), goldTrimMat);
        neckChain.rotation.x = Math.PI / 2;
        neckChain.position.set(0, 1.2, 0.06);
        group.add(neckChain);
        const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), goldTrimMat);
        pendant.position.set(0, 1.15, 0.1);
        group.add(pendant);

        // --- Head ---
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), skinMat);
        head.position.y = 1.35;
        group.add(head);
        // Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 16), skinMat);
        nose.position.set(0, 1.34, 0.14);
        nose.rotation.x = -0.3;
        group.add(nose);
        // Beard stubble (small dark dots)
        for (let bs = 0; bs < 8; bs++) {
          const ang = (bs / 8) * Math.PI * 0.9 + Math.PI * 0.55;
          const stubble = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), darkMat);
          stubble.position.set(Math.cos(ang) * 0.095, 1.3, Math.sin(ang) * 0.095 + 0.07);
          group.add(stubble);
        }
        // Gold earring (tiny torus)
        const earring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 16), goldTrimMat);
        earring.position.set(-0.13, 1.33, 0.02);
        earring.rotation.y = Math.PI / 2;
        group.add(earring);

        // --- Turban with 6 folds ---
        const turbanBase = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), turbanMat);
        turbanBase.scale.set(1, 0.65, 1);
        turbanBase.position.y = 1.45;
        group.add(turbanBase);
        for (let t = 0; t < 6; t++) {
          const fold = new THREE.Mesh(new THREE.TorusGeometry(0.145 - t * 0.012, 0.016, 16, 24), new THREE.MeshStandardMaterial({ color: 0xbbaa44, roughness: 0.6 }));
          fold.rotation.x = Math.PI / 2 + t * 0.12;
          fold.position.y = 1.41 + t * 0.035;
          group.add(fold);
        }
        // Turban jewel
        const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 4), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 0.5 }));
        jewel.position.set(0, 1.46, 0.16);
        group.add(jewel);
        // Shemagh tail longer with decorative end
        const shemagTail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.04), turbanMat);
        shemagTail.position.set(0.05, 1.1, -0.15);
        shemagTail.rotation.z = 0.12;
        group.add(shemagTail);
        const shemagEnd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.04), embroideryMat);
        shemagEnd.position.set(0.06, 0.92, -0.16);
        group.add(shemagEnd);
        // Face veil (thin box covering lower face)
        const veil = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.01), new THREE.MeshStandardMaterial({ color: 0xccaa55, transparent: true, opacity: 0.6, roughness: 0.5 }));
        veil.position.set(0, 1.3, 0.135);
        group.add(veil);

        // --- Eyes with dark liner ---
        const dbEyeMat = new THREE.MeshStandardMaterial({ color: 0x332200 });
        const linerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        for (const ex of [-0.05, 0.05]) {
          const liner = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), linerMat);
          liner.position.set(ex, 1.37, 0.12);
          liner.scale.set(1.2, 0.6, 0.5);
          group.add(liner);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), dbEyeMat);
          eye.position.set(ex, 1.37, 0.13);
          group.add(eye);
        }

        // --- Arms ---
        {
          // Left arm (with shield)
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.22, 1.145, 0);
          const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.25, 16), robesMat);
          leftUpperArm.position.y = -0.125;
          leftUpperArm.rotation.z = 0.15;
          leftArmGroup.add(leftUpperArm);
          const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 16), skinMat);
          leftForearm.position.set(-0.033, -0.325, 0);
          leftForearm.rotation.z = 0.2;
          leftArmGroup.add(leftForearm);
          const leftBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.08, 16), leatherMat);
          leftBracer.position.set(-0.022, -0.265, 0);
          leftArmGroup.add(leftBracer);
          // Arm band
          const lArmBand = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.005, 8, 16), goldTrimMat);
          lArmBand.rotation.x = Math.PI / 2;
          lArmBand.position.set(-0.01, -0.08, 0);
          leftArmGroup.add(lArmBand);
          // Henna tattoos (2 thin emissive strips on forearm)
          for (let ht = 0; ht < 2; ht++) {
            const henna = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.06, 0.048), tattooMat);
            henna.position.set(-0.025 + ht * 0.012, -0.3 + ht * 0.04, 0);
            leftArmGroup.add(henna);
          }
          // 3 finger stubs on left hand
          for (let f = 0; f < 3; f++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.06, 8), skinMat);
            finger.position.set(-0.045 + f * 0.018, -0.455, 0.01);
            finger.rotation.x = 0.2;
            leftArmGroup.add(finger);
          }
          // Ring on finger
          const lRing = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.003, 6, 12), goldTrimMat);
          lRing.rotation.x = Math.PI / 2;
          lRing.position.set(-0.027, -0.445, 0.01);
          leftArmGroup.add(lRing);

          // Shield on left arm
          const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, metalness: 0.4, roughness: 0.5 });
          const shield = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), shieldMat);
          shield.position.set(-0.16, -0.22, 0.1);
          shield.rotation.y = 0.3;
          leftArmGroup.add(shield);
          // Shield boss
          const boss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), metalMat);
          boss.position.set(-0.16, -0.22, 0.26);
          boss.scale.z = 0.4;
          leftArmGroup.add(boss);
          // Shield rim rivets (8 small spheres)
          for (let rv = 0; rv < 8; rv++) {
            const ang = (rv / 8) * Math.PI * 2;
            const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), metalMat);
            rivet.position.set(-0.16 + Math.cos(ang) * 0.13, -0.22 + Math.sin(ang) * 0.13, 0.14);
            leftArmGroup.add(rivet);
          }
          // Shield painted design (colored box shapes)
          const shieldDesign = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.005), new THREE.MeshStandardMaterial({ color: 0xcc4422 }));
          shieldDesign.position.set(-0.16, -0.22, 0.16);
          leftArmGroup.add(shieldDesign);
          group.add(leftArmGroup);

          // Right arm with scimitar
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.22, 1.145, 0);
          const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.25, 16), robesMat);
          rightUpperArm.position.y = -0.125;
          rightUpperArm.rotation.z = -0.15;
          rightArmGroup.add(rightUpperArm);
          const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 16), skinMat);
          rightForearm.position.set(0.033, -0.325, 0);
          rightForearm.rotation.z = -0.2;
          rightArmGroup.add(rightForearm);
          const rightBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.08, 16), leatherMat);
          rightBracer.position.set(0.022, -0.265, 0);
          rightArmGroup.add(rightBracer);
          // Arm band right
          const rArmBand = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.005, 8, 16), goldTrimMat);
          rArmBand.rotation.x = Math.PI / 2;
          rArmBand.position.set(0.01, -0.08, 0);
          rightArmGroup.add(rArmBand);
          // Henna tattoos right arm
          for (let ht2 = 0; ht2 < 3; ht2++) {
            const henna2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.05, 0.046), tattooMat);
            henna2.position.set(0.022 + ht2 * 0.012, -0.29 + ht2 * 0.05, 0);
            rightArmGroup.add(henna2);
          }
          // 3 finger stubs right hand
          for (let f2 = 0; f2 < 3; f2++) {
            const finger2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.06, 8), skinMat);
            finger2.position.set(0.027 + f2 * 0.018, -0.455, 0.01);
            finger2.rotation.x = 0.2;
            rightArmGroup.add(finger2);
          }
          // Ring right
          const rRing = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.003, 6, 12), goldTrimMat);
          rRing.rotation.x = Math.PI / 2;
          rRing.position.set(0.036, -0.445, 0.01);
          rightArmGroup.add(rRing);

          // Scimitar enhanced
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.46, 0.015), metalMat);
          blade.position.set(0.08, -0.295, 0);
          blade.rotation.z = -0.2;
          rightArmGroup.add(blade);
          // Damascus pattern strips on blade (4 alternating)
          for (let dm = 0; dm < 4; dm++) {
            const damascus = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.09, 0.003), new THREE.MeshStandardMaterial({ color: dm % 2 === 0 ? 0xaaaaaa : 0x666666, metalness: 0.9, roughness: 0.1 }));
            damascus.position.set(0.08, -0.18 + dm * 0.09, 0.009);
            damascus.rotation.z = -0.2;
            rightArmGroup.add(damascus);
          }
          // Blade curve tip
          const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 16), metalMat);
          bladeTip.position.set(0.04, -0.065, 0);
          bladeTip.rotation.z = -0.5;
          rightArmGroup.add(bladeTip);
          // Edge glow
          const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.42, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.3, metalness: 1.0 }));
          edgeGlow.position.set(0.095, -0.295, 0);
          edgeGlow.rotation.z = -0.2;
          rightArmGroup.add(edgeGlow);
          // Guard
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.026, 0.042), goldTrimMat);
          guard.position.set(0.1, -0.525, 0);
          rightArmGroup.add(guard);
          // Hilt wrap
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.1, 16), leatherMat);
          hilt.position.set(0.11, -0.595, 0);
          rightArmGroup.add(hilt);
          // Pommel
          const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), goldTrimMat);
          pommel.position.set(0.12, -0.655, 0);
          rightArmGroup.add(pommel);
          // Tassel on pommel (thin cylinder strips)
          for (let ts = 0; ts < 4; ts++) {
            const ang = (ts / 4) * Math.PI * 2;
            const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, 0.055, 6), new THREE.MeshStandardMaterial({ color: 0xcc3333 }));
            tassel.position.set(0.12 + Math.cos(ang) * 0.012, -0.69, Math.sin(ang) * 0.012);
            rightArmGroup.add(tassel);
          }
          group.add(rightArmGroup);
        }

        // --- Legs with ankle wraps and detailed sandals ---
        for (const lx of [-0.1, 0.1]) {
          const legGroup = new THREE.Group();
          legGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(lx, 0.575, 0);
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 16), robesMat);
          leg.position.y = -0.225;
          legGroup.add(leg);
          // Ankle wraps
          for (let aw = 0; aw < 2; aw++) {
            const ankleWrap = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16), leatherMat);
            ankleWrap.rotation.x = Math.PI / 2;
            ankleWrap.position.set(0, -0.42 + aw * 0.04, 0);
            legGroup.add(ankleWrap);
          }
          // Sandal sole
          const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.025, 0.13), leatherMat);
          sandal.position.set(0, -0.475, 0.02);
          legGroup.add(sandal);
          // Crisscross straps up calf (3 pairs)
          for (let ss = 0; ss < 3; ss++) {
            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.009, 0.007), leatherMat);
            strap.position.set(0, -0.44 + ss * 0.025, 0.03);
            strap.rotation.x = (ss % 2 === 0 ? 0.15 : -0.15);
            legGroup.add(strap);
          }
          group.add(legGroup);
        }
        break;
      }

      case EnemyType.SAND_WURM: {
        // --- SAND_WURM | Estimated polygons: ~205000 triangles ---
        const wurmMat = new THREE.MeshStandardMaterial({ color: 0x9b8060, roughness: 0.7 });
        const wurmDarkMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 0.8 });
        const innerMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, emissive: 0x881111, emissiveIntensity: 0.5 });
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3 });
        const slimeMat = new THREE.MeshStandardMaterial({ color: 0x88aa44, transparent: true, opacity: 0.6, roughness: 0.2 });
        const sandEncrust = new THREE.MeshStandardMaterial({ color: 0xc8b090, roughness: 0.95 });
        const tongueMat = new THREE.MeshStandardMaterial({ color: 0xcc3355, emissive: 0x661122, emissiveIntensity: 0.3 });
        const barnacleMatW = new THREE.MeshStandardMaterial({ color: 0x6a5538, roughness: 0.9 });
        const swHoverGroup = new THREE.Group();
        swHoverGroup.name = 'anim_hover';

        // --- 13 body segments sinuous body ---
        const segCount = 13;
        const segPositions: THREE.Vector3[] = [];
        for (let s = 0; s < segCount; s++) {
          const radius = 0.28 - s * 0.012;
          const seg = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), s % 2 === 0 ? wurmMat : wurmDarkMat);
          seg.scale.set(1, 0.7, 1);
          const px = Math.sin(s * 0.55) * 0.32;
          const py = 0.15 + s * 0.21;
          const pz = -s * 0.16;
          seg.position.set(px, py, pz);
          seg.castShadow = true;
          swHoverGroup.add(seg);
          segPositions.push(seg.position.clone());

          // Segment ridge ring
          const ridge = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.013, 16, 24), wurmDarkMat);
          ridge.rotation.y = Math.PI / 2;
          ridge.position.copy(seg.position);
          swHoverGroup.add(ridge);

          // Dorsal plate on top of each segment
          const dorsalPlate = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.9, radius * 0.3, radius * 0.7), wurmDarkMat);
          dorsalPlate.position.set(px, py + radius * 0.72, pz);
          swHoverGroup.add(dorsalPlate);

          // Ventral ridge underneath
          const ventralRidge = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.5, radius * 0.18, radius * 0.6), wurmMat);
          ventralRidge.position.set(px, py - radius * 0.6, pz);
          swHoverGroup.add(ventralRidge);

          // 5 spines per segment
          for (let sp = 0; sp < 5; sp++) {
            const ang = (sp / 5) * Math.PI * 1.4 - Math.PI * 0.7;
            const spine = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.065, 8), wurmDarkMat);
            spine.position.set(
              px + Math.cos(ang) * radius * 0.82,
              py + 0.04,
              pz + Math.sin(ang) * radius * 0.5
            );
            spine.rotation.z = ang;
            swHoverGroup.add(spine);
          }

          // Lateral texture bumps (2 per side)
          for (const lSide of [-1, 1]) {
            const bump = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 8, 6), wurmDarkMat);
            bump.position.set(px + lSide * radius * 0.88, py, pz);
            swHoverGroup.add(bump);
          }

          // Sandy encrustation patches
          if (s % 3 === 1) {
            const crust = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.7, radius * 0.12, radius * 0.5), sandEncrust);
            crust.position.set(px + 0.02, py + radius * 0.5, pz + 0.02);
            swHoverGroup.add(crust);
          }
        }

        // --- Tail: last 2 segments taper, with a tail fin ---
        const tailBase = segPositions[segCount - 1];
        for (let tf = 0; tf < 2; tf++) {
          const tr = 0.07 - tf * 0.025;
          const tSeg = new THREE.Mesh(new THREE.SphereGeometry(tr, 16, 12), wurmDarkMat);
          tSeg.position.set(tailBase.x, tailBase.y - 0.18 - tf * 0.16, tailBase.z - 0.12 - tf * 0.1);
          swHoverGroup.add(tSeg);
        }
        const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.004, 0.14), wurmDarkMat);
        tailFin.position.set(tailBase.x, tailBase.y - 0.52, tailBase.z - 0.32);
        tailFin.rotation.x = 0.3;
        swHoverGroup.add(tailFin);

        // --- Parasite barnacles on body (4 clusters) ---
        const barnacleSlots = [1, 4, 7, 10];
        for (const bs of barnacleSlots) {
          if (bs < segPositions.length) {
            const bp = segPositions[bs];
            for (let bc = 0; bc < 3; bc++) {
              const barn = new THREE.Mesh(new THREE.SphereGeometry(0.028 + bc * 0.008, 8, 6), barnacleMatW);
              barn.position.set(bp.x + (bc - 1) * 0.06, bp.y + 0.12, bp.z - 0.05);
              swHoverGroup.add(barn);
            }
          }
        }

        // --- Sand burst at ground level (12 pieces + 4 cloud spheres) ---
        for (let d = 0; d < 12; d++) {
          const ang = (d / 12) * Math.PI * 2;
          const debris = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.055), new THREE.MeshStandardMaterial({ color: 0xc8a870, roughness: 0.9 }));
          debris.position.set(Math.sin(ang) * (0.38 + (d % 3) * 0.08), 0.04, Math.cos(ang) * (0.38 + (d % 3) * 0.08));
          swHoverGroup.add(debris);
        }
        for (let sc3 = 0; sc3 < 4; sc3++) {
          const ang = (sc3 / 4) * Math.PI * 2;
          const sandCloud = new THREE.Mesh(new THREE.SphereGeometry(0.12 + sc3 * 0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd4b880, transparent: true, opacity: 0.22, roughness: 0.9 }));
          sandCloud.position.set(Math.sin(ang) * 0.25, 0.07, Math.cos(ang) * 0.25);
          sandCloud.scale.y = 0.4;
          swHoverGroup.add(sandCloud);
        }

        // --- Head (larger, armored) ---
        const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), wurmMat);
        wHead.scale.set(1, 1.12, 0.9);
        wHead.position.set(Math.sin(7.5 * 0.55) * 0.32, 1.9, -0.1);
        swHoverGroup.add(wHead);
        // 6 overlapping brow plates
        for (let p = 0; p < 6; p++) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22 - p * 0.025, 0.055, 0.22 - p * 0.02), wurmDarkMat);
          plate.position.set(wHead.position.x + (p % 2 === 0 ? 0.01 : -0.01), wHead.position.y + 0.08 + p * 0.065, wHead.position.z - 0.04);
          swHoverGroup.add(plate);
        }
        // Lateral sensor pits (dark sphere indentations)
        for (const lSide of [-1, 1]) {
          const pit = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 8), new THREE.MeshStandardMaterial({ color: 0x221100 }));
          pit.position.set(wHead.position.x + lSide * 0.28, wHead.position.y + 0.05, wHead.position.z + 0.08);
          pit.scale.z = 0.4;
          swHoverGroup.add(pit);
        }
        // Nostril heat pits
        for (const nx of [-0.07, 0.07]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: 0x331100 }));
          nostril.position.set(wHead.position.x + nx, wHead.position.y + 0.1, wHead.position.z + 0.3);
          nostril.scale.z = 0.4;
          swHoverGroup.add(nostril);
        }

        // --- Enhanced maw (3 rings of teeth) ---
        const mawOuter = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.27, 20), innerMat);
        mawOuter.position.set(wHead.position.x, wHead.position.y + 0.05, wHead.position.z + 0.32);
        swHoverGroup.add(mawOuter);
        const mawInner = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshStandardMaterial({ color: 0x441111, roughness: 0.9 }));
        mawInner.position.set(wHead.position.x, wHead.position.y + 0.05, wHead.position.z + 0.27);
        swHoverGroup.add(mawInner);
        // 3 rings of teeth (10/8/6)
        const toothRingData = [[10, 0.22, 0.11], [8, 0.15, 0.075], [6, 0.09, 0.05]];
        for (let ring = 0; ring < 3; ring++) {
          const [cnt, r2, h2] = toothRingData[ring];
          for (let t = 0; t < cnt; t++) {
            const ang = (t / cnt) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.015 - ring * 0.003, h2, 8), toothMat);
            tooth.position.set(
              wHead.position.x + Math.cos(ang) * r2,
              wHead.position.y + 0.05 + Math.sin(ang) * r2,
              wHead.position.z + 0.29 + ring * 0.02
            );
            tooth.rotation.x = -Math.PI / 2;
            swHoverGroup.add(tooth);
          }
        }
        // Tongue appendage inside maw
        const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.2, 12), tongueMat);
        tongue.position.set(wHead.position.x, wHead.position.y + 0.02, wHead.position.z + 0.18);
        tongue.rotation.x = Math.PI / 2;
        swHoverGroup.add(tongue);
        // Throat (dark cylinder receding)
        const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x220800, roughness: 0.95 }));
        throat.position.set(wHead.position.x, wHead.position.y + 0.05, wHead.position.z + 0.08);
        throat.rotation.x = Math.PI / 2;
        swHoverGroup.add(throat);

        // --- Jaw flaps (4 flaps around maw) ---
        for (let jf = 0; jf < 4; jf++) {
          const isUpper = jf < 2;
          const jAng = (jf % 2 === 0 ? -0.2 : 0.2);
          const jFlap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.16), wurmDarkMat);
          jFlap.position.set(
            wHead.position.x + (jf % 2 === 0 ? -0.18 : 0.18),
            wHead.position.y + 0.05 + (isUpper ? 0.18 : -0.18),
            wHead.position.z + 0.3
          );
          jFlap.rotation.z = jAng;
          jFlap.rotation.x = isUpper ? -0.35 : 0.35;
          swHoverGroup.add(jFlap);
        }

        // --- 8 sensory tendrils with barbed tips ---
        for (let ten = 0; ten < 8; ten++) {
          const ang = (ten / 8) * Math.PI * 2;
          const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, 0.22, 8), wurmMat);
          tendril.position.set(
            wHead.position.x + Math.cos(ang) * 0.29,
            wHead.position.y + Math.sin(ang) * 0.29,
            wHead.position.z + 0.22
          );
          tendril.rotation.x = -Math.PI / 3;
          tendril.rotation.z = ang;
          swHoverGroup.add(tendril);
          // Barbed tip (small cone)
          if (ten % 2 === 0) {
            const barb = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.025, 6), wurmDarkMat);
            barb.position.set(
              wHead.position.x + Math.cos(ang) * 0.36,
              wHead.position.y + Math.sin(ang) * 0.36,
              wHead.position.z + 0.16
            );
            barb.rotation.z = ang;
            swHoverGroup.add(barb);
          }
        }

        // --- Slime/acid: 6 drips + pools ---
        for (let sl = 0; sl < 6; sl++) {
          const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.002, 0.09 + sl * 0.03, 8), slimeMat);
          drip.position.set(
            wHead.position.x + (sl - 2.5) * 0.045,
            wHead.position.y - 0.09 - sl * 0.025,
            wHead.position.z + 0.26
          );
          swHoverGroup.add(drip);
        }
        // Slime pools (flat transparent spheres below)
        for (let sp2 = 0; sp2 < 3; sp2++) {
          const pool = new THREE.Mesh(new THREE.SphereGeometry(0.06 + sp2 * 0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0x99bb33, transparent: true, opacity: 0.35, roughness: 0.1 }));
          pool.scale.y = 0.12;
          pool.position.set(wHead.position.x + (sp2 - 1) * 0.1, 0.01, wHead.position.z + 0.15);
          swHoverGroup.add(pool);
        }

        group.add(swHoverGroup);
        break;
      }

      case EnemyType.DUST_WRAITH: {
        // --- DUST_WRAITH | Estimated polygons: ~255000 triangles ---
        const wraithMat = new THREE.MeshStandardMaterial({ color: 0xc8a870, transparent: true, opacity: 0.55, roughness: 0.3 });
        const wraithDarkMat = new THREE.MeshStandardMaterial({ color: 0xa08050, transparent: true, opacity: 0.4, roughness: 0.2 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 1.8 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, transparent: true, opacity: 0.7, roughness: 0.5 });
        const rustedMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, metalness: 0.3, roughness: 0.9 });
        const runeMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xddaa00, emissiveIntensity: 2.2, transparent: true, opacity: 0.85 });
        const dwHover = new THREE.Group();
        dwHover.name = 'anim_hover';

        // --- 8 swirling sand vortex torus rings ---
        for (let v = 0; v < 8; v++) {
          const vortex = new THREE.Mesh(new THREE.TorusGeometry(0.22 + v * 0.055, 0.025, 16, 32), wraithDarkMat);
          vortex.rotation.x = Math.PI / 2;
          vortex.rotation.z = v * 0.38;
          vortex.position.y = 0.12 + v * 0.1;
          dwHover.add(vortex);
          // Sand particles between vortex rings (4 per ring)
          for (let vp = 0; vp < 4; vp++) {
            const vAng = (vp / 4) * Math.PI * 2 + v * 0.4;
            const vPart = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), wraithDarkMat);
            vPart.position.set(
              Math.cos(vAng) * (0.22 + v * 0.055),
              0.12 + v * 0.1 + 0.015,
              Math.sin(vAng) * (0.22 + v * 0.055)
            );
            dwHover.add(vPart);
          }
        }

        // --- Triple-layered flowing body ---
        const dwBodyOuter = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.15, 24), wraithDarkMat);
        dwBodyOuter.position.y = 0.65;
        dwHover.add(dwBodyOuter);
        const dwBodyMid = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.05, 24), new THREE.MeshStandardMaterial({ color: 0xb89860, transparent: true, opacity: 0.48, roughness: 0.25 }));
        dwBodyMid.position.y = 0.68;
        dwHover.add(dwBodyMid);
        const dwBodyInner = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 24), wraithMat);
        dwBodyInner.position.y = 0.72;
        dwBodyInner.castShadow = true;
        dwHover.add(dwBodyInner);
        // Sand cylinder strips swirling between layers
        for (let cs = 0; cs < 8; cs++) {
          const cAng = (cs / 8) * Math.PI * 2;
          const strip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xd4b880, transparent: true, opacity: 0.35 }));
          strip.position.set(Math.cos(cAng) * 0.28, 0.62, Math.sin(cAng) * 0.28);
          strip.rotation.z = cAng * 0.3;
          dwHover.add(strip);
        }

        // --- 14 tattered robe edges (varying lengths, some with sand particles at tips) ---
        for (let e = 0; e < 14; e++) {
          const ang = (e / 14) * Math.PI * 2;
          const len = 0.16 + (e % 3) * 0.07;
          const tatter = new THREE.Mesh(new THREE.BoxGeometry(0.055, len, 0.018), wraithDarkMat);
          tatter.position.set(Math.sin(ang) * 0.33, 0.18, Math.cos(ang) * 0.33);
          tatter.rotation.y = ang;
          tatter.rotation.x = 0.28 + (e % 2) * 0.15;
          dwHover.add(tatter);
          // Sand particle at tip (every other)
          if (e % 2 === 0) {
            const tipPart = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), wraithDarkMat);
            tipPart.position.set(Math.sin(ang) * 0.33, 0.18 - len * 0.5, Math.cos(ang) * 0.33);
            dwHover.add(tipPart);
          }
        }

        // --- Enhanced skeleton: 6 ribs, vertebrae spine, scapulae, pelvis hint ---
        for (let r = 0; r < 6; r++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.009, 12, 24, Math.PI), boneMat);
          rib.position.set(0, 0.82 + r * 0.1, 0.07);
          dwHover.add(rib);
        }
        // Spine with 12 vertebrae boxes
        for (let sv = 0; sv < 12; sv++) {
          const vert = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.03, 0.028), boneMat);
          vert.position.set(0, 0.72 + sv * 0.07, -0.04);
          dwHover.add(vert);
        }
        // Scapulae (shoulder blade hints)
        for (const ssx of [-0.12, 0.12]) {
          const scap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.018), boneMat);
          scap.position.set(ssx, 1.18, -0.06);
          dwHover.add(scap);
        }
        // Pelvis hint
        const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 16, Math.PI), boneMat);
        pelvis.rotation.x = Math.PI / 2;
        pelvis.position.set(0, 0.68, 0);
        dwHover.add(pelvis);

        // --- Head ---
        const dwHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), wraithMat);
        dwHead.position.y = 1.38;
        dwHover.add(dwHead);
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 32, 24), boneMat);
        skull.position.y = 1.36;
        dwHover.add(skull);
        // Cheekbones
        for (const cx of [-0.1, 0.1]) {
          const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.04), boneMat);
          cheek.position.set(cx, 1.35, 0.1);
          dwHover.add(cheek);
        }
        // Nasal cavity
        const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.025), new THREE.MeshStandardMaterial({ color: 0x221100 }));
        nasal.position.set(0, 1.355, 0.135);
        dwHover.add(nasal);
        // Eye sockets (deeper)
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x110800 });
        for (const ex of [-0.065, 0.065]) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), socketMat);
          socket.position.set(ex, 1.39, 0.12);
          socket.scale.z = 0.45;
          dwHover.add(socket);
          // Brighter ember eyes
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), glowMat);
          eye.position.set(ex, 1.39, 0.14);
          dwHover.add(eye);
          // Longer wisp trails
          for (let wt = 0; wt < 3; wt++) {
            const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.012 - wt * 0.003, 0.002, 0.1 + wt * 0.05, 8), glowMat);
            trail.position.set(ex + (ex > 0 ? 0.02 + wt * 0.025 : -0.02 - wt * 0.025), 1.42 + wt * 0.02, 0.13);
            trail.rotation.z = ex > 0 ? -0.5 - wt * 0.18 : 0.5 + wt * 0.18;
            dwHover.add(trail);
          }
        }
        // Jaw with teeth (8 small cones)
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.065), boneMat);
        jaw.position.set(0, 1.28, 0.1);
        jaw.rotation.x = 0.18;
        dwHover.add(jaw);
        for (let jt = 0; jt < 8; jt++) {
          const jawTooth = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.022, 6), new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.3 }));
          jawTooth.position.set(-0.035 + jt * 0.01, 1.265, 0.12);
          jawTooth.rotation.x = -Math.PI;
          dwHover.add(jawTooth);
        }

        // --- Enhanced arms (keep anim_la, anim_ra) ---
        for (const ax of [-0.3, 0.3]) {
          const dwArmGroup = new THREE.Group();
          dwArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          dwArmGroup.position.set(ax, 1.1, 0.1);
          // Skeletal upper arm
          const upperBone = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.22, 12), boneMat);
          upperBone.rotation.z = ax < 0 ? 0.55 : -0.55;
          upperBone.rotation.x = -0.25;
          dwArmGroup.add(upperBone);
          // Elbow sphere
          const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), boneMat);
          elbow.position.set(ax * 0.2, -0.12, 0.06);
          dwArmGroup.add(elbow);
          // Forearm (translucent)
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.22, 12), wraithMat);
          arm.position.set(ax * 0.22, -0.22, 0.1);
          arm.rotation.z = ax < 0 ? 0.7 : -0.7;
          arm.rotation.x = -0.35;
          dwArmGroup.add(arm);
          // Sand torus ring on each arm
          const armRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 16), wraithDarkMat);
          armRing.rotation.x = Math.PI / 2;
          armRing.position.set(ax * 0.1, -0.05, 0.03);
          dwArmGroup.add(armRing);
          // 5 finger bones per hand
          for (let f = 0; f < 5; f++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.085, 6), boneMat);
            finger.position.set(ax * 0.4 + (f - 2) * 0.016, -0.32, 0.12);
            finger.rotation.x = -0.45;
            finger.rotation.z = (f - 2) * 0.08;
            dwArmGroup.add(finger);
          }
          dwHover.add(dwArmGroup);
        }

        // --- Ancient warrior artifacts ---
        // Rusted spear/sword through the body (long box)
        const ancientSpear = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.1, 0.015), rustedMat);
        ancientSpear.position.set(0.1, 0.85, -0.08);
        ancientSpear.rotation.z = 0.2;
        dwHover.add(ancientSpear);
        // Spear tip
        const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 12), rustedMat);
        spearTip.position.set(0.12, 1.42, -0.08);
        spearTip.rotation.z = 0.2;
        dwHover.add(spearTip);
        // Broken shield fragment
        const shardMat = new THREE.MeshStandardMaterial({ color: 0x4a3010, metalness: 0.25, roughness: 0.85 });
        const shieldShard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.02), shardMat);
        shieldShard.position.set(-0.28, 0.9, 0.04);
        shieldShard.rotation.z = 0.6;
        shieldShard.rotation.y = 0.3;
        dwHover.add(shieldShard);
        // Tattered cloak remnant (thin plane)
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x663311, transparent: true, opacity: 0.5, roughness: 0.9 });
        const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.008), cloakMat);
        cloak.position.set(-0.08, 0.88, -0.18);
        cloak.rotation.z = 0.12;
        dwHover.add(cloak);

        // --- 18 orbiting sand wisps with trail cylinders ---
        for (let w = 0; w < 18; w++) {
          const wSize = 0.018 + (w % 4) * 0.012;
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(wSize, 12, 8), new THREE.MeshStandardMaterial({
            color: 0xd4b896, transparent: true, opacity: 0.22 + (w % 3) * 0.1
          }));
          const wAng = (w / 18) * Math.PI * 2;
          const wRad = 0.28 + (w % 5) * 0.1;
          wisp.position.set(Math.sin(wAng) * wRad, 0.25 + w * 0.1, Math.cos(wAng) * wRad);
          dwHover.add(wisp);
          // Trail cylinder behind each wisp
          const wispTrail = new THREE.Mesh(new THREE.CylinderGeometry(wSize * 0.5, wSize * 0.15, 0.08 + (w % 3) * 0.04, 6), new THREE.MeshStandardMaterial({
            color: 0xd4b896, transparent: true, opacity: 0.15
          }));
          wispTrail.position.set(Math.sin(wAng + 0.25) * (wRad + 0.04), wisp.position.y + 0.015, Math.cos(wAng + 0.25) * (wRad + 0.04));
          wispTrail.rotation.z = -wAng * 0.5;
          dwHover.add(wispTrail);
        }

        // --- Enhanced sand storm base ---
        for (let dc = 0; dc < 8; dc++) {
          const ang = (dc / 8) * Math.PI * 2;
          const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (dc % 3) * 0.03, 16, 12), new THREE.MeshStandardMaterial({
            color: 0xc8a870, transparent: true, opacity: 0.18
          }));
          cloud.position.set(Math.sin(ang) * (0.2 + dc * 0.02), 0.07, Math.cos(ang) * (0.2 + dc * 0.02));
          cloud.scale.y = 0.38;
          dwHover.add(cloud);
        }
        // Sand sheets (flat transparent planes at angles)
        for (let sh = 0; sh < 4; sh++) {
          const shAng = (sh / 4) * Math.PI * 2;
          const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.004), new THREE.MeshStandardMaterial({
            color: 0xd4b880, transparent: true, opacity: 0.14, roughness: 0.9
          }));
          sheet.position.set(Math.sin(shAng) * 0.35, 0.22, Math.cos(shAng) * 0.35);
          sheet.rotation.y = shAng;
          sheet.rotation.x = 0.2 + sh * 0.1;
          dwHover.add(sheet);
        }

        // --- Ancient runes: 3 floating octahedrons with emissive glow ---
        for (let rn = 0; rn < 3; rn++) {
          const runeAng = (rn / 3) * Math.PI * 2;
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), runeMat);
          rune.position.set(Math.cos(runeAng) * 0.6, 0.85 + rn * 0.28, Math.sin(runeAng) * 0.6);
          rune.rotation.y = runeAng;
          dwHover.add(rune);
        }

        group.add(dwHover);
        break;
      }

      case EnemyType.SAND_GOLEM: {
        // --- SAND_GOLEM | Estimated polygons: ~185000 triangles ---
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.9 });
        const sandDarkMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.95 });
        const sandLightMat = new THREE.MeshStandardMaterial({ color: 0xd4bc8a, roughness: 0.85 });
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 0.6, metalness: 0.3 });
        const crystalBrightMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc22, emissiveIntensity: 1.0, transparent: true, opacity: 0.8 });
        const crackedMat = new THREE.MeshStandardMaterial({ color: 0x665530, roughness: 1.0 });
        const runeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xd4a800, emissiveIntensity: 0.9, metalness: 0.6 });
        const goldenArtifactMat = new THREE.MeshStandardMaterial({ color: 0xffc000, emissive: 0xff9900, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.2 });
        const sandFlowMat = new THREE.MeshStandardMaterial({ color: 0xc8a860, transparent: true, opacity: 0.55, roughness: 0.8 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
        const sandCloudMat = new THREE.MeshStandardMaterial({ color: 0xd4b870, transparent: true, opacity: 0.25, roughness: 1.0 });
        // ── TORSO ─────────────────────────────────────────────────────────────
        const sgTorso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.55), sandMat);
        sgTorso.position.y = 1.25;
        sgTorso.castShadow = true;
        group.add(sgTorso);
        // Enhanced rock slab layers (6–8 layers with rotational variation)
        const slabConfigs = [
          { y: 0.88, w: 0.80, h: 0.09, d: 0.60, ry: 0.00 },
          { y: 1.00, w: 0.77, h: 0.08, d: 0.57, ry: 0.07 },
          { y: 1.12, w: 0.79, h: 0.09, d: 0.58, ry: -0.05 },
          { y: 1.24, w: 0.76, h: 0.08, d: 0.56, ry: 0.10 },
          { y: 1.36, w: 0.78, h: 0.09, d: 0.57, ry: -0.08 },
          { y: 1.48, w: 0.74, h: 0.08, d: 0.55, ry: 0.06 },
          { y: 1.60, w: 0.72, h: 0.07, d: 0.53, ry: -0.04 },
          { y: 1.70, w: 0.70, h: 0.07, d: 0.51, ry: 0.09 },
        ];
        for (const sc of slabConfigs) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(sc.w, sc.h, sc.d), sandDarkMat);
          slab.position.set(0, sc.y, 0);
          slab.rotation.y = sc.ry;
          group.add(slab);
        }
        // Sand flowing between slab cracks (thin sand-coloured cylinders)
        for (let sf = 0; sf < 8; sf++) {
          const sandFlow = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), sandFlowMat);
          sandFlow.position.set(
            (Math.random() - 0.5) * 0.55,
            0.94 + sf * 0.1,
            (Math.random() - 0.5) * 0.38
          );
          group.add(sandFlow);
        }
        // Ancient hieroglyphic rune marks on torso surface (8–10 small emissive golden boxes)
        const runePositions = [
          [-0.22, 1.15, 0.28], [0.18, 1.22, 0.28], [-0.10, 1.38, 0.28],
          [0.28, 1.44, 0.28], [-0.28, 1.52, 0.28], [0.08, 1.58, 0.28],
          [-0.18, 1.65, 0.28], [0.22, 1.30, 0.28], [0.00, 1.08, 0.28], [-0.06, 1.72, 0.28],
        ] as const;
        for (const [rx, ry, rz] of runePositions) {
          const rune = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.008), runeMat);
          rune.position.set(rx, ry, rz);
          group.add(rune);
        }
        // Glowing energy core visible through the largest chest crack
        const energyCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 24), coreMat);
        energyCore.position.set(0, 1.28, 0.0);
        group.add(energyCore);
        // Ancient golden artifact embedded in chest
        const artifact = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 2), goldenArtifactMat);
        artifact.position.set(0.05, 1.22, 0.22);
        artifact.rotation.y = 0.4;
        group.add(artifact);
        // ── ENERGY CRACKS (10–12, some branching Y-shapes) ───────────────────
        const crackDefs = [
          { x: -0.22, y: 1.05, z:  0.28, h: 0.30, rz:  0.15, branch: true  },
          { x:  0.18, y: 1.18, z:  0.28, h: 0.28, rz: -0.20, branch: false },
          { x: -0.08, y: 1.35, z:  0.28, h: 0.35, rz:  0.08, branch: true  },
          { x:  0.28, y: 1.40, z:  0.28, h: 0.26, rz: -0.10, branch: false },
          { x: -0.30, y: 1.55, z:  0.28, h: 0.29, rz:  0.22, branch: false },
          { x:  0.05, y: 1.60, z:  0.28, h: 0.32, rz: -0.05, branch: true  },
          { x: -0.18, y: 1.20, z: -0.28, h: 0.27, rz:  0.18, branch: false },
          { x:  0.22, y: 1.10, z: -0.28, h: 0.31, rz: -0.12, branch: true  },
          { x:  0.12, y: 1.48, z:  0.20, h: 0.25, rz:  0.30, branch: false },
          { x: -0.10, y: 0.98, z:  0.10, h: 0.22, rz: -0.25, branch: false },
          { x:  0.30, y: 1.62, z:  0.10, h: 0.28, rz:  0.05, branch: true  },
          { x: -0.25, y: 1.70, z: -0.15, h: 0.20, rz:  0.14, branch: false },
        ];
        for (const cd of crackDefs) {
          const crack = new THREE.Mesh(new THREE.BoxGeometry(0.014, cd.h, 0.014), crystalBrightMat);
          crack.position.set(cd.x, cd.y, cd.z);
          crack.rotation.z = cd.rz;
          group.add(crack);
          if (cd.branch) {
            // Y-branch A
            const branchA = new THREE.Mesh(new THREE.BoxGeometry(0.010, cd.h * 0.5, 0.010), crystalBrightMat);
            branchA.position.set(cd.x + 0.04, cd.y + cd.h * 0.3, cd.z);
            branchA.rotation.z = cd.rz + 0.45;
            group.add(branchA);
            // Y-branch B
            const branchB = new THREE.Mesh(new THREE.BoxGeometry(0.010, cd.h * 0.5, 0.010), crystalBrightMat);
            branchB.position.set(cd.x - 0.04, cd.y + cd.h * 0.3, cd.z);
            branchB.rotation.z = cd.rz - 0.45;
            group.add(branchB);
          }
        }
        // ── HEAD ──────────────────────────────────────────────────────────────
        const sgHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 4), sandMat);
        sgHead.scale.set(0.9, 0.8, 0.85);
        sgHead.position.y = 2.0;
        group.add(sgHead);
        // Extra craggy detail blobs on head
        const headBlobOffsets: [number, number, number, number, number][] = [
          [-0.14, 2.14,  0.12, 0.10, 2],
          [ 0.16, 2.12,  0.10, 0.09, 2],
          [-0.05, 2.18, -0.08, 0.08, 2],
          [ 0.08, 2.06, -0.14, 0.07, 2],
          [-0.18, 1.96,  0.08, 0.08, 2],
        ];
        for (const [hx, hy, hz, hr, hd] of headBlobOffsets) {
          const blob = new THREE.Mesh(new THREE.DodecahedronGeometry(hr, hd), sandDarkMat);
          blob.position.set(hx, hy, hz);
          group.add(blob);
        }
        // Brow ridge
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.22), sandDarkMat);
        brow.position.set(0, 2.09, 0.13);
        group.add(brow);
        // Brow rune marks
        for (const brx of [-0.12, 0, 0.12]) {
          const browRune = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.006), runeMat);
          browRune.position.set(brx, 2.10, 0.245);
          group.add(browRune);
        }
        // Crystal eyes — larger, more intense glow halos
        for (const ex of [-0.11, 0.11]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 24), crystalBrightMat);
          eyeGlow.position.set(ex, 2.03, 0.22);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 4), crystalMat);
          eye.position.set(ex, 2.03, 0.245);
          group.add(eye);
          // Light beam cone projecting forward from each eye
          const beam = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.18, 12), crystalBrightMat);
          beam.position.set(ex, 2.03, 0.36);
          beam.rotation.x = Math.PI / 2;
          group.add(beam);
          // Sand pouring from eye socket (thin cylinder drips)
          for (let ed = 0; ed < 2; ed++) {
            const eyeDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.10, 8), sandFlowMat);
            eyeDrip.position.set(ex + (ed - 0.5) * 0.025, 1.96, 0.22);
            group.add(eyeDrip);
          }
        }
        // Mouth opening (dark recessed box)
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), crackedMat);
        mouth.position.set(0, 1.88, 0.26);
        group.add(mouth);
        // Ancient runes glowing around mouth
        for (let mr = 0; mr < 4; mr++) {
          const mRune = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.020, 0.006), runeMat);
          mRune.position.set((mr - 1.5) * 0.07, 1.88, 0.275);
          group.add(mRune);
        }
        // Articulated jaw group
        const sgJaw = new THREE.Group();
        sgJaw.name = 'anim_jaw';
        sgJaw.position.set(0, 1.83, 0.08);
        const jawBlock = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.16), sandDarkMat);
        jawBlock.position.set(0, 0, 0);
        sgJaw.add(jawBlock);
        // Tooth-like protrusions on jaw
        for (let t = 0; t < 5; t++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.04, 0.028), sandLightMat);
          tooth.position.set(-0.10 + t * 0.05, -0.05, 0.05);
          sgJaw.add(tooth);
        }
        group.add(sgJaw);
        // ── SHOULDER BOULDERS ─────────────────────────────────────────────────
        for (const sx of [-0.52, 0.52]) {
          const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 4), sandMat);
          shoulder.position.set(sx, 1.72, 0);
          group.add(shoulder);
          // Secondary boulder overlapping
          const shoulder2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 3), sandDarkMat);
          shoulder2.position.set(sx * 1.1, 1.85, 0.06);
          group.add(shoulder2);
          // 3–4 crystal shards per shoulder
          const shardAngles = [-0.5, 0.0, 0.5, 0.9];
          for (let si = 0; si < 4; si++) {
            const shard = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.13, 12), crystalMat);
            shard.position.set(sx * (0.88 + si * 0.04), 1.83 + si * 0.04, si * 0.04 - 0.06);
            shard.rotation.z = sx > 0 ? -0.3 - shardAngles[si] * 0.2 : 0.3 + shardAngles[si] * 0.2;
            group.add(shard);
          }
          // Sand cascading off shoulder (thin cylinder drips)
          for (let sd = 0; sd < 3; sd++) {
            const sDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 8), sandFlowMat);
            sDrip.position.set(sx * (0.78 + sd * 0.05), 1.62 + sd * 0.02, (sd - 1) * 0.05);
            group.add(sDrip);
          }
          // Small crystal clusters on shoulder
          for (let cc = 0; cc < 3; cc++) {
            const clust = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 8), crystalBrightMat);
            clust.position.set(sx * (0.70 + cc * 0.03), 1.68 + cc * 0.03, 0.06 - cc * 0.03);
            clust.rotation.z = sx > 0 ? -0.6 : 0.6;
            group.add(clust);
          }
        }
        // ── ARMS ──────────────────────────────────────────────────────────────
        for (const ax of [-0.60, 0.60]) {
          const sgArmGroup = new THREE.Group();
          sgArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          sgArmGroup.position.set(ax, 1.58, 0);
          // Upper arm — multiple overlapping rock slabs
          const uaSlabs: [number, number, number, number, number, number][] = [
            [0.19, 0.36, 0.17, 0, -0.18, 0],
            [0.14, 0.30, 0.13, ax < 0 ? 0.10 : -0.10, -0.16, 0.04],
            [0.12, 0.26, 0.12, ax < 0 ? -0.06 : 0.06, -0.22, -0.03],
          ];
          for (const [sw, sh, sd, ox, oy, oz] of uaSlabs) {
            const uaSlab = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), sandMat);
            uaSlab.position.set(ox, oy, oz);
            uaSlab.rotation.z = ax < 0 ? 0.25 : -0.25;
            sgArmGroup.add(uaSlab);
          }
          // Sand joint ring between upper arm and elbow
          const uaRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 12, 24), sandFlowMat);
          uaRing.position.set(ax * 0.05, -0.39, 0);
          uaRing.rotation.x = Math.PI / 2;
          sgArmGroup.add(uaRing);
          // Elbow energy joint sphere
          const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 24), crystalBrightMat);
          elbow.position.set(ax * 0.10, -0.46, 0);
          sgArmGroup.add(elbow);
          // Elbow torus ring
          const elbowTorus = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.016, 12, 24), crystalMat);
          elbowTorus.position.set(ax * 0.10, -0.46, 0);
          elbowTorus.rotation.x = Math.PI / 2;
          sgArmGroup.add(elbowTorus);
          // Small crystal clusters on elbow
          for (let ec = 0; ec < 3; ec++) {
            const eClust = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 8), crystalMat);
            eClust.position.set(ax * 0.10 + (ec - 1) * 0.05, -0.50, 0.08);
            eClust.rotation.x = -0.5;
            sgArmGroup.add(eClust);
          }
          // Forearm — segmented rock slabs
          const forearmSlabDefs: [number, number, number, number][] = [
            [0.17, 0.16, 0.15, -0.60],
            [0.14, 0.14, 0.13, -0.72],
          ];
          for (const [fw, fh, fd, fy] of forearmSlabDefs) {
            const fSlab = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), sandDarkMat);
            fSlab.position.set(ax * 0.16, fy, 0);
            fSlab.rotation.z = ax < 0 ? 0.15 : -0.15;
            sgArmGroup.add(fSlab);
          }
          // Golden rune bands on forearm (thin torus rings)
          for (let rb = 0; rb < 2; rb++) {
            const runeBand = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.010, 10, 20), runeMat);
            runeBand.position.set(ax * 0.16, -0.58 - rb * 0.12, 0);
            runeBand.rotation.x = Math.PI / 2;
            sgArmGroup.add(runeBand);
          }
          // Large fist
          const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 4), sandMat);
          fist.position.set(ax * 0.28, -0.97, 0);
          sgArmGroup.add(fist);
          // 4 blocky finger shapes
          for (let fi = 0; fi < 4; fi++) {
            const finger = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.09, 0.048), sandDarkMat);
            finger.position.set(ax * 0.28 + (fi - 1.5) * 0.055, -1.07, 0.13);
            sgArmGroup.add(finger);
          }
          // Crystal shards / cones protruding from knuckles
          for (let k = 0; k < 4; k++) {
            const knuckleCone = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 10), crystalMat);
            knuckleCone.position.set(ax * 0.28 + (k - 1.5) * 0.055, -0.94, 0.18);
            knuckleCone.rotation.x = -0.8;
            sgArmGroup.add(knuckleCone);
          }
          // Sand dripping from fists
          for (let fd = 0; fd < 3; fd++) {
            const fDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.13, 8), sandFlowMat);
            fDrip.position.set(ax * 0.28 + (fd - 1) * 0.06, -1.10, 0.04);
            sgArmGroup.add(fDrip);
          }
          group.add(sgArmGroup);
        }
        // ── LEGS ──────────────────────────────────────────────────────────────
        for (const lx of [-0.23, 0.23]) {
          const sgLegGroup = new THREE.Group();
          sgLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          sgLegGroup.position.set(lx, 0.80, 0);
          // Thigh — segmented rock slabs
          for (let tsl = 0; tsl < 2; tsl++) {
            const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.20 - tsl * 0.03, 0.16, 0.18 - tsl * 0.02), sandMat);
            thigh.position.set(tsl * 0.02, -0.13 - tsl * 0.10, 0);
            sgLegGroup.add(thigh);
          }
          // Energy band on thigh
          const thighBand = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.010, 10, 20), runeMat);
          thighBand.position.set(0, -0.20, 0);
          thighBand.rotation.x = Math.PI / 2;
          sgLegGroup.add(thighBand);
          // Knee energy sphere
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.10, 32, 24), crystalBrightMat);
          knee.position.set(0, -0.34, 0.04);
          sgLegGroup.add(knee);
          // Knee torus ring
          const kneeTorus = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 12, 24), crystalMat);
          kneeTorus.position.set(0, -0.34, 0.04);
          kneeTorus.rotation.x = Math.PI / 2;
          sgLegGroup.add(kneeTorus);
          // Crystal clusters on knee
          for (let kc = 0; kc < 2; kc++) {
            const kClust = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 8), crystalMat);
            kClust.position.set((kc - 0.5) * 0.08, -0.36, 0.12);
            kClust.rotation.x = -0.5;
            sgLegGroup.add(kClust);
          }
          // Shin — layered rock with rune markings
          const shin = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.30, 0.19), sandDarkMat);
          shin.position.y = -0.54;
          sgLegGroup.add(shin);
          const shin2 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.22, 0.15), sandMat);
          shin2.position.set(0.02, -0.55, 0.02);
          sgLegGroup.add(shin2);
          // Rune marks on shin
          for (let sr = 0; sr < 3; sr++) {
            const shinRune = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.006), runeMat);
            shinRune.position.set((sr - 1) * 0.06, -0.50 - sr * 0.06, 0.10);
            sgLegGroup.add(shinRune);
          }
          // Wide foot with toe protrusions
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.26), sandMat);
          foot.position.set(0, -0.71, 0.04);
          sgLegGroup.add(foot);
          // 3 toe-like rock protrusions at front of foot
          for (let to = 0; to < 3; to++) {
            const toe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.07), sandDarkMat);
            toe.position.set((to - 1) * 0.085, -0.72, 0.17);
            sgLegGroup.add(toe);
          }
          // Ground impact crack emissive lines radiating from foot
          for (let cr = 0; cr < 4; cr++) {
            const impactCrack = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.007, 0.09 + cr * 0.02), crystalBrightMat);
            const angle = (cr / 4) * Math.PI * 2;
            impactCrack.position.set(Math.cos(angle) * 0.14, -0.745, Math.sin(angle) * 0.10 + 0.04);
            impactCrack.rotation.y = angle;
            sgLegGroup.add(impactCrack);
          }
          group.add(sgLegGroup);
        }
        // ── BACK CRYSTALS (6–8 varying sizes) ────────────────────────────────
        const backCrystalDefs: [number, number, number, number, number, boolean][] = [
          [-0.28, 1.42, -0.30, 0.05, 0.22, false],
          [-0.12, 1.58, -0.32, 0.04, 0.19, true ],
          [ 0.00, 1.68, -0.31, 0.06, 0.26, true ],
          [ 0.14, 1.55, -0.32, 0.04, 0.18, false],
          [ 0.28, 1.44, -0.29, 0.05, 0.21, true ],
          [-0.20, 1.72, -0.28, 0.035,0.15, false],
          [ 0.20, 1.70, -0.28, 0.035,0.16, true ],
          [ 0.06, 1.30, -0.30, 0.045,0.17, false],
        ];
        for (const [bx, by, bz, br, bh, glow] of backCrystalDefs) {
          const bCryst = new THREE.Mesh(new THREE.ConeGeometry(br, bh, 16), glow ? crystalBrightMat : crystalMat);
          bCryst.position.set(bx, by, bz);
          bCryst.rotation.x = 0.4;
          group.add(bCryst);
        }
        // ── SAND WATERFALL — continuous stream from back crack ────────────────
        for (let sw = 0; sw < 7; sw++) {
          const streamSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), sandFlowMat);
          streamSeg.position.set(-0.04 + (sw % 2) * 0.04, 1.70 - sw * 0.22, -0.34);
          group.add(streamSeg);
        }
        // ── ORBITING ROCK DEBRIS ──────────────────────────────────────────────
        const orbitAngles = [0, 1.05, 2.09, 3.14, 4.19, 5.24];
        for (let od = 0; od < 6; od++) {
          const orbitR = 0.62 + (od % 2) * 0.12;
          const orbitY = 1.10 + od * 0.14;
          const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045 + (od % 3) * 0.015, 1), sandDarkMat);
          debris.position.set(Math.cos(orbitAngles[od]) * orbitR, orbitY, Math.sin(orbitAngles[od]) * orbitR);
          group.add(debris);
        }
        // ── SAND CLOUD AT FEET (4–5 flat transparent spheres) ────────────────
        for (let sc = 0; sc < 5; sc++) {
          const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(0.14 + sc * 0.04, 16, 12), sandCloudMat);
          cloudSphere.scale.set(1, 0.28, 1);
          cloudSphere.position.set(
            (sc - 2) * 0.16,
            0.04,
            (sc % 2) * 0.12 - 0.08
          );
          group.add(cloudSphere);
        }
        // ── FLOATING SAND PARTICLES (10–12) with sand stream cylinders ────────
        for (let fp = 0; fp < 12; fp++) {
          const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.016, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xc8a870, transparent: true, opacity: 0.45 })
          );
          particle.position.set(
            (Math.random() - 0.5) * 0.8,
            0.25 + Math.random() * 1.2,
            (Math.random() - 0.5) * 0.6
          );
          group.add(particle);
          // Thin vertical cylinder showing sand falling from body
          if (fp < 6) {
            const sandStream = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), sandFlowMat);
            sandStream.position.set(
              (Math.random() - 0.5) * 0.7,
              0.22 + Math.random() * 0.9,
              (Math.random() - 0.5) * 0.5
            );
            group.add(sandStream);
          }
        }
        break;
      }

      // ── GRASSLAND ENEMIES ───────────────────────────────────────
      case EnemyType.WILD_BOAR: {
        // ~65,000 triangles — enhanced muscular wild boar with battle scars, cloven hooves, bristle mane, and jaw group
        const furMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
        const furDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2820, roughness: 0.9 });
        const furLightMat = new THREE.MeshStandardMaterial({ color: 0x7a5a43, roughness: 0.8 });
        const tuskMat = new THREE.MeshStandardMaterial({ color: 0xddd8aa, roughness: 0.3, metalness: 0.1 });
        const tuskOldMat = new THREE.MeshStandardMaterial({ color: 0xbba866, roughness: 0.35, metalness: 0.05 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xcc8888, roughness: 0.6 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
        const mudMat = new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.95 });
        const scarMat = new THREE.MeshStandardMaterial({ color: 0x9a6a5a, roughness: 0.5 });
        const bloodshotMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.4 });
        const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xd48080, roughness: 0.6 });
        const breathMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 1.0 });
        const wbEyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 1.3 });
        // Main barrel body
        const wbBody = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), furMat);
        wbBody.scale.set(0.88, 0.74, 1.38);
        wbBody.position.y = 0.47;
        wbBody.castShadow = true;
        group.add(wbBody);
        // Secondary hip sphere for rear bulk
        const hipSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), furMat);
        hipSphere.scale.set(0.9, 0.7, 0.8);
        hipSphere.position.set(0, 0.44, -0.28);
        group.add(hipSphere);
        // Belly — sagging, pendulous, lighter fur
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), furLightMat);
        belly.scale.set(1.3, 0.45, 1.6);
        belly.position.set(0, 0.27, 0.04);
        group.add(belly);
        // Mud/dirt patches on belly
        for (let m = 0; m < 4; m++) {
          const mud = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mudMat);
          mud.scale.set(1.4, 0.3, 1.1);
          mud.position.set((m % 2 === 0 ? -1 : 1) * 0.1, 0.25, -0.15 + m * 0.1);
          group.add(mud);
        }
        // Prominent spine ridge
        const spineRidge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.85), furDarkMat);
        spineRidge.position.set(0, 0.74, -0.02);
        group.add(spineRidge);
        // Dense bristle mane around neck/shoulders
        for (let b = 0; b < 10; b++) {
          const maneTuft = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 8), furDarkMat);
          const maneAng = (b / 10) * Math.PI;
          maneTuft.position.set(Math.sin(maneAng) * 0.14, 0.72 + Math.cos(maneAng) * 0.04, 0.12 + b * 0.01);
          maneTuft.rotation.x = -0.35;
          maneTuft.rotation.z = Math.sin(maneAng) * 0.4;
          group.add(maneTuft);
        }
        // 22 bristle tufts along spine and flanks (varying sizes and angles)
        for (let b = 0; b < 22; b++) {
          const isFlank = b >= 12;
          const flankSide = isFlank ? (b % 2 === 0 ? -1 : 1) : 0;
          const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.013 + (b % 3) * 0.003, 0.07 + (b % 4) * 0.02, 8), furDarkMat);
          bristle.position.set(
            flankSide * (isFlank ? 0.3 + (b % 2) * 0.04 : (b % 3 - 1) * 0.04),
            0.74 - (isFlank ? 0.08 : 0),
            -0.26 + (b % 12) * 0.075
          );
          bristle.rotation.x = isFlank ? -0.1 : -0.2;
          bristle.rotation.z = flankSide * 0.5;
          group.add(bristle);
        }
        // Shoulder hump — layered muscle
        const hump = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), furMat);
        hump.position.set(0, 0.65, 0.22);
        group.add(hump);
        const humpLayer2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), furDarkMat);
        humpLayer2.scale.set(1, 0.6, 1.2);
        humpLayer2.position.set(0, 0.73, 0.18);
        group.add(humpLayer2);
        // Side shoulder muscle bulges
        for (const sx of [-1, 1]) {
          const shoulderMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), furMat);
          shoulderMuscle.scale.set(0.7, 0.6, 0.9);
          shoulderMuscle.position.set(sx * 0.26, 0.6, 0.18);
          group.add(shoulderMuscle);
        }
        // Head — wider with pronounced jaw muscles
        const wbHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 24), furMat);
        wbHead.scale.set(1.05, 0.88, 1.18);
        wbHead.position.set(0, 0.51, 0.54);
        group.add(wbHead);
        // Jaw muscle spheres on sides of head
        for (const jx of [-0.1, 0.1]) {
          const jawMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), furMat);
          jawMuscle.scale.set(0.8, 0.7, 0.9);
          jawMuscle.position.set(jx, 0.47, 0.56);
          group.add(jawMuscle);
        }
        // Heavy brow ridges
        for (const bx of [-0.08, 0.08]) {
          const browR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), furDarkMat);
          browR.scale.set(1.25, 0.5, 1.05);
          browR.position.set(bx, 0.58, 0.59);
          group.add(browR);
        }
        // Scarred snout
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.15, 16), noseMat);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, 0.455, 0.71);
        group.add(snout);
        // Nostril flare detail with breath mist cones
        for (const nx of [-0.033, 0.033]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshStandardMaterial({ color: 0x331111 }));
          nostril.position.set(nx, 0.455, 0.79);
          group.add(nostril);
          const mist = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 8), breathMat);
          mist.rotation.x = Math.PI / 2;
          mist.position.set(nx, 0.455, 0.84);
          group.add(mist);
        }
        // Jaw group (anim_jaw) — lower jaw with 5 teeth
        const jawGroup = new THREE.Group();
        jawGroup.name = 'anim_jaw';
        jawGroup.position.set(0, 0.43, 0.6);
        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), furMat);
        lowerJaw.position.set(0, -0.02, 0.02);
        jawGroup.add(lowerJaw);
        for (let t = 0; t < 5; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 8), new THREE.MeshStandardMaterial({ color: 0xddddb0 }));
          tooth.position.set(-0.04 + t * 0.02, 0.015, 0.09);
          tooth.rotation.x = Math.PI;
          jawGroup.add(tooth);
        }
        group.add(jawGroup);
        // Enhanced 3-segment curved tusks with yellowing at tips
        for (const tx of [-0.09, 0.09]) {
          const tuskSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.07, 12), tuskMat);
          tuskSeg1.position.set(tx, 0.43, 0.73);
          tuskSeg1.rotation.x = -0.15;
          group.add(tuskSeg1);
          const tuskSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.08, 12), tuskOldMat);
          tuskSeg2.position.set(tx * 1.08, 0.40, 0.78);
          tuskSeg2.rotation.x = -0.5;
          tuskSeg2.rotation.z = tx > 0 ? -0.2 : 0.2;
          group.add(tuskSeg2);
          const tuskTip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 12), tuskOldMat);
          tuskTip.position.set(tx * 1.18, 0.36, 0.82);
          tuskTip.rotation.x = -0.85;
          tuskTip.rotation.z = tx > 0 ? -0.32 : 0.32;
          group.add(tuskTip);
        }
        // Eyes with deep sockets and bloodshot vein cylinders
        for (const ex of [-0.1, 0.1]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), furDarkMat);
          eyeSocket.position.set(ex, 0.555, 0.565);
          eyeSocket.scale.z = 0.5;
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), wbEyeMat);
          eye.position.set(ex, 0.555, 0.582);
          group.add(eye);
          for (let v = 0; v < 4; v++) {
            const veinAngle = (v / 4) * Math.PI * 2;
            const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.022, 4), bloodshotMat);
            vein.position.set(ex + Math.sin(veinAngle) * 0.028, 0.555 + Math.cos(veinAngle) * 0.018, 0.573);
            vein.rotation.z = veinAngle + Math.PI / 2;
            group.add(vein);
          }
        }
        // Ears with inner ear (pink/flesh) detail
        for (const ex of [-0.13, 0.13]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.075, 12), furMat);
          ear.position.set(ex, 0.66, 0.43);
          ear.rotation.x = -0.3;
          ear.rotation.z = ex > 0 ? -0.35 : 0.35;
          group.add(ear);
          const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 8), innerEarMat);
          innerEar.position.set(ex, 0.665, 0.435);
          innerEar.rotation.x = -0.3;
          innerEar.rotation.z = ex > 0 ? -0.35 : 0.35;
          group.add(innerEar);
        }
        // Battle scars — 4 thin lighter-colored boxes across flanks
        const wbScarData = [
          [-0.28, 0.52, 0.1, 0.0], [0.3, 0.48, -0.05, 0.3],
          [-0.2, 0.58, -0.15, -0.2], [0.22, 0.44, 0.2, 0.15],
        ];
        for (const [sx, sy, sz, rz] of wbScarData) {
          const scar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.018), scarMat);
          scar.position.set(sx, sy, sz);
          scar.rotation.z = rz;
          group.add(scar);
        }
        // Legs with thigh bulge, mud patches, dewclaws on back legs, and cloven hooves
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const boarLegGroup = new THREE.Group();
            boarLegGroup.name = i === 1 ? (side === -1 ? 'anim_fll' : 'anim_frl') : (side === -1 ? 'anim_bll' : 'anim_brl');
            boarLegGroup.position.set(side * 0.21, 0.36, i * 0.43 - 0.11);
            const thighBulge = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), furMat);
            thighBulge.position.set(0, -0.04, 0);
            boarLegGroup.add(thighBulge);
            const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.16, 12), furMat);
            upperLeg.position.y = -0.08;
            boarLegGroup.add(upperLeg);
            const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.16, 12), furLightMat);
            lowerLeg.position.y = -0.23;
            boarLegGroup.add(lowerLeg);
            const legMud = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mudMat);
            legMud.scale.set(1.3, 0.4, 1.2);
            legMud.position.set(0.01, -0.28, 0);
            boarLegGroup.add(legMud);
            // Cloven hoof — two halves with visible gap
            const hoofHalfL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.042, 12), hoofMat);
            hoofHalfL.position.set(-0.013, -0.322, 0);
            boarLegGroup.add(hoofHalfL);
            const hoofHalfR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.042, 12), hoofMat);
            hoofHalfR.position.set(0.013, -0.322, 0);
            boarLegGroup.add(hoofHalfR);
            // Dewclaws on back legs only
            if (i === 0) {
              for (const ds of [-1, 1]) {
                const dewclaw = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.022, 8), hoofMat);
                dewclaw.position.set(ds * 0.026, -0.27, -0.02);
                dewclaw.rotation.x = 0.5;
                boarLegGroup.add(dewclaw);
              }
            }
            group.add(boarLegGroup);
          }
        }
        // Curly tail — 3 coiled segments (anim_tail)
        const boarTailGroup = new THREE.Group();
        boarTailGroup.name = 'anim_tail';
        boarTailGroup.position.set(0, 0.52, -0.42);
        const tailLoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.013, 12, 24, Math.PI), furMat);
        tailLoop1.rotation.y = Math.PI / 2;
        boarTailGroup.add(tailLoop1);
        const tailLoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 10, 20, Math.PI * 1.3), furMat);
        tailLoop2.rotation.y = Math.PI / 2;
        tailLoop2.position.set(0, 0.04, 0.02);
        boarTailGroup.add(tailLoop2);
        const tailLoop3 = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.008, 8, 16, Math.PI), furDarkMat);
        tailLoop3.rotation.y = Math.PI / 2;
        tailLoop3.position.set(0, 0.07, 0.03);
        boarTailGroup.add(tailLoop3);
        group.add(boarTailGroup);
        break;
      }

      case EnemyType.PLAINS_RAIDER: {
        // ~70,000 triangles — heavily detailed tribal warrior with topknot, buckler, trophy belt, and feathered spear
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.7 });
        const leatherDarkMat = new THREE.MeshStandardMaterial({ color: 0x5a3c1a, roughness: 0.8 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.6 });
        const paintMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0x881111, emissiveIntensity: 0.4 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });
        const furTrimMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.4 });
        const bloodMat = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.6 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.9 });
        const featherDecMat = new THREE.MeshStandardMaterial({ color: 0x884400, roughness: 0.7 });
        const necklaceMat = new THREE.MeshStandardMaterial({ color: 0xccaa66, roughness: 0.3, metalness: 0.2 });
        // Torso with leather armor and side plates
        const prTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), leatherMat);
        prTorso.position.y = 0.97;
        prTorso.castShadow = true;
        group.add(prTorso);
        // Side armor plates
        for (const sx of [-1, 1]) {
          const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.04), leatherDarkMat);
          sidePlate.position.set(sx * 0.24, 0.97, 0);
          group.add(sidePlate);
        }
        // Leather layering strips on torso
        for (let ls = 0; ls < 3; ls++) {
          const layer = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.03), leatherDarkMat);
          layer.position.set(0, 0.78 + ls * 0.12, 0.14);
          group.add(layer);
        }
        // Chest plate (hardened leather) with stitching
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.35, 0.04), leatherDarkMat);
        chestPlate.position.set(0, 1.0, 0.14);
        group.add(chestPlate);
        // Stitching detail rows along chest plate seams
        for (let s = 0; s < 5; s++) {
          const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.005), leatherMat);
          stitch.position.set(-0.17 + s * 0.085, 1.17, 0.17);
          group.add(stitch);
        }
        // Leather straps crossing chest
        const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), leatherDarkMat);
        strap1.position.set(-0.08, 1.0, 0.16);
        strap1.rotation.z = 0.3;
        group.add(strap1);
        const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), leatherDarkMat);
        strap2.position.set(0.08, 1.0, 0.16);
        strap2.rotation.z = -0.3;
        group.add(strap2);
        // Fur collar with individual fur tufts
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 16, 24), furTrimMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 1.22;
        group.add(collar);
        for (let ft = 0; ft < 8; ft++) {
          const furTuft = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 6), furTrimMat);
          const ang = (ft / 8) * Math.PI * 2;
          furTuft.position.set(Math.sin(ang) * 0.18, 1.26, Math.cos(ang) * 0.18);
          furTuft.rotation.x = Math.sin(ang) * 0.5;
          furTuft.rotation.z = -Math.cos(ang) * 0.5;
          group.add(furTuft);
        }
        // Enhanced shoulder pads with 3 bone spikes each and leather wrapping
        for (const sx of [-0.26, 0.26]) {
          const pad = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), leatherDarkMat);
          pad.scale.set(1.4, 0.65, 1.1);
          pad.position.set(sx, 1.18, 0);
          group.add(pad);
          // Leather wrap detail on pad
          const padWrap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 16), leatherMat);
          padWrap.position.set(sx, 1.18, 0);
          padWrap.rotation.z = sx > 0 ? -0.4 : 0.4;
          group.add(padWrap);
          // 3 bone spikes per shoulder
          for (let sp = 0; sp < 3; sp++) {
            const boneSpike = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.085, 8), boneMat);
            boneSpike.position.set(sx * (1.1 + sp * 0.08), 1.24 + sp * 0.02, sp * 0.03 - 0.03);
            boneSpike.rotation.z = sx > 0 ? -0.5 - sp * 0.1 : 0.5 + sp * 0.1;
            group.add(boneSpike);
          }
        }
        // Head
        const prHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), skinMat);
        prHead.position.y = 1.42;
        group.add(prHead);
        // Topknot/mohawk — row of cones along skull top
        for (let mk = 0; mk < 6; mk++) {
          const mohawkTuft = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.065 + mk * 0.005, 8), hairMat);
          mohawkTuft.position.set(0, 1.56 + mk * 0.01, 0.02 - mk * 0.02);
          mohawkTuft.rotation.x = 0.1 + mk * 0.05;
          group.add(mohawkTuft);
        }
        // 4 war braids (2 per side) with beads and feather tips
        for (const bx of [-0.12, -0.09, 0.09, 0.12]) {
          const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.01, 0.16, 8), hairMat);
          braid.position.set(bx, 1.31, -0.05);
          group.add(braid);
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), metalMat);
          bead.position.set(bx, 1.23, -0.05);
          group.add(bead);
          const bead2 = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.4 }));
          bead2.position.set(bx, 1.2, -0.055);
          group.add(bead2);
          // Feather tip at braid end
          const featherTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.006), featherDecMat);
          featherTip.position.set(bx, 1.16, -0.055);
          featherTip.rotation.z = bx > 0 ? 0.1 : -0.1;
          group.add(featherTip);
        }
        // Necklace — torus ring with small cone teeth hanging from it
        const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 20), necklaceMat);
        necklace.rotation.x = Math.PI / 2;
        necklace.position.y = 1.3;
        group.add(necklace);
        for (let nt = 0; nt < 6; nt++) {
          const nTooth = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.025, 6), boneMat);
          const ntAng = ((nt - 2.5) / 5) * Math.PI * 0.7;
          nTooth.position.set(Math.sin(ntAng) * 0.1, 1.27, Math.cos(ntAng) * 0.1);
          nTooth.rotation.x = Math.PI;
          group.add(nTooth);
        }
        // War paint stripes on face
        const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.02), paintMat);
        stripe1.position.set(0, 1.42, 0.14);
        group.add(stripe1);
        const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.02), paintMat);
        stripe2.position.set(0, 1.45, 0.14);
        group.add(stripe2);
        const chinPaint = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), paintMat);
        chinPaint.position.set(0, 1.34, 0.13);
        group.add(chinPaint);
        // Nose ring (tiny torus)
        const noseRing = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.003, 6, 12), metalMat);
        noseRing.position.set(0, 1.38, 0.15);
        noseRing.rotation.x = Math.PI / 2;
        group.add(noseRing);
        // Facial scar
        const faceScar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.008, 0.015), new THREE.MeshStandardMaterial({ color: 0x8a5040, roughness: 0.5 }));
        faceScar.position.set(-0.04, 1.44, 0.14);
        faceScar.rotation.z = 0.3;
        group.add(faceScar);
        // Fierce eyes
        for (const ex of [-0.045, 0.045]) {
          const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
          eyeWhite.position.set(ex, 1.43, 0.12);
          eyeWhite.scale.z = 0.5;
          group.add(eyeWhite);
          const iris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.0 }));
          iris.position.set(ex, 1.43, 0.135);
          group.add(iris);
        }
        // Nose
        const prNose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 8), skinMat);
        prNose.position.set(0, 1.39, 0.14);
        prNose.rotation.x = -0.2;
        group.add(prNose);
        // Arms
        {
          // Left arm with buckler shield and bicep band
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.24, 1.16, 0);
          const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 16), skinMat);
          leftUpperArm.position.y = -0.11;
          leftUpperArm.rotation.z = 0.15;
          leftArmGroup.add(leftUpperArm);
          // Bicep band (torus)
          const bicepBand = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 8, 16), metalMat);
          bicepBand.rotation.x = Math.PI / 2;
          bicepBand.position.set(0, -0.05, 0);
          leftArmGroup.add(bicepBand);
          const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 16), skinMat);
          leftForearm.position.set(-0.024, -0.3, 0);
          leftArmGroup.add(leftForearm);
          // War paint stripes on forearm
          for (let ws = 0; ws < 3; ws++) {
            const armStripe = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.045), paintMat);
            armStripe.position.set(-0.012, -0.22 - ws * 0.04, 0);
            leftArmGroup.add(armStripe);
          }
          const leftArmWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.06, 16), leatherDarkMat);
          leftArmWrap.position.set(-0.012, -0.24, 0);
          leftArmGroup.add(leftArmWrap);
          // Hand with 3 finger hints
          for (let f = 0; f < 3; f++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.04, 6), skinMat);
            finger.position.set(-0.024 + (f - 1) * 0.015, -0.41, 0.01);
            leftArmGroup.add(finger);
          }
          // Small buckler/arm shield (circle with boss)
          const buckler = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 16), leatherDarkMat);
          buckler.rotation.x = Math.PI / 2;
          buckler.position.set(-0.015, -0.32, 0.08);
          leftArmGroup.add(buckler);
          const bucklerBoss = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), metalMat);
          bucklerBoss.position.set(-0.015, -0.32, 0.095);
          leftArmGroup.add(bucklerBoss);
          group.add(leftArmGroup);

          // Right arm with spear
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.24, 1.16, 0);
          const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 16), skinMat);
          rightUpperArm.position.y = -0.11;
          rightUpperArm.rotation.z = -0.15;
          rightArmGroup.add(rightUpperArm);
          const bicepBandR = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 8, 16), metalMat);
          bicepBandR.rotation.x = Math.PI / 2;
          bicepBandR.position.set(0, -0.05, 0);
          rightArmGroup.add(bicepBandR);
          const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 16), skinMat);
          rightForearm.position.set(0.024, -0.3, 0);
          rightArmGroup.add(rightForearm);
          // War paint on right forearm
          for (let ws = 0; ws < 3; ws++) {
            const armStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.045), paintMat);
            armStripeR.position.set(0.012, -0.22 - ws * 0.04, 0);
            rightArmGroup.add(armStripeR);
          }
          const rightArmWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.06, 16), leatherDarkMat);
          rightArmWrap.position.set(0.012, -0.24, 0);
          rightArmGroup.add(rightArmWrap);
          // Hand with 3 finger hints
          for (let f = 0; f < 3; f++) {
            const fingerR = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.04, 6), skinMat);
            fingerR.position.set(0.024 + (f - 1) * 0.015, -0.41, 0.01);
            rightArmGroup.add(fingerR);
          }
          // Enhanced spear — leather grip, feathers, blood-stained tip
          const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 1.3, 16), woodMat);
          spearShaft.position.set(0.06, -0.21, 0);
          rightArmGroup.add(spearShaft);
          // Leather grip wraps (more dense)
          for (let w = 0; w < 6; w++) {
            const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 16), leatherDarkMat);
            wrap.rotation.x = Math.PI / 2;
            wrap.position.set(0.06, -0.48 + w * 0.075, 0);
            rightArmGroup.add(wrap);
          }
          // Spear head with blood-stained tip
          const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 16), metalMat);
          spearHead.position.set(0.06, 0.46, 0);
          rightArmGroup.add(spearHead);
          const spearTipBlood = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 12), bloodMat);
          spearTipBlood.position.set(0.06, 0.53, 0);
          rightArmGroup.add(spearTipBlood);
          // Longer feather decorations on spear
          for (let f = 0; f < 3; f++) {
            const feather = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.005), featherDecMat);
            feather.position.set(0.06 + (f % 2 === 0 ? 0.02 : -0.02), 0.28 + f * 0.05, 0.03);
            feather.rotation.z = f === 0 ? 0.25 : f === 2 ? -0.25 : 0;
            rightArmGroup.add(feather);
          }
          group.add(rightArmGroup);
        }
        // Legs with thigh muscle, 3-4 wraps, and fur-trimmed moccasins
        for (const lx of [-0.1, 0.1]) {
          const legGroup = new THREE.Group();
          legGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(lx, 0.595, 0);
          // Thigh muscle definition
          const thighMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), skinMat);
          thighMuscle.position.set(0, -0.06, 0);
          legGroup.add(thighMuscle);
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 16), leatherMat);
          leg.position.y = -0.225;
          legGroup.add(leg);
          // Knee wrap
          const kWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.06, 16), leatherDarkMat);
          kWrap.position.y = -0.115;
          legGroup.add(kWrap);
          // 4 wraps along leg
          for (let w = 0; w < 4; w++) {
            const legWrap = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.007, 6, 14), leatherDarkMat);
            legWrap.rotation.x = Math.PI / 2;
            legWrap.position.set(0, -0.3 - w * 0.03, 0);
            legGroup.add(legWrap);
          }
          // Moccasin with fur trim top
          const moccasin = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.04, 0.11), leatherDarkMat);
          moccasin.position.set(0, -0.475, 0.02);
          legGroup.add(moccasin);
          const moccFur = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), furTrimMat);
          moccFur.rotation.x = -Math.PI / 2;
          moccFur.position.set(0, -0.453, 0.02);
          legGroup.add(moccFur);
          group.add(legGroup);
        }
        // Loincloth front and back panels
        const loincFront = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.01), leatherMat);
        loincFront.position.set(0, 0.64, 0.14);
        loincFront.rotation.x = 0.1;
        group.add(loincFront);
        const loincBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.01), leatherDarkMat);
        loincBack.position.set(0, 0.64, -0.14);
        loincBack.rotation.x = -0.1;
        group.add(loincBack);
        // Belt with trophy scalps/bones and dagger loop
        const prBelt = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 22), leatherDarkMat);
        prBelt.rotation.x = Math.PI / 2;
        prBelt.position.y = 0.73;
        group.add(prBelt);
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), leatherMat);
        pouch.position.set(0.18, 0.72, 0.08);
        group.add(pouch);
        // Trophy hanging bones (2 small shapes on belt)
        for (let tr = 0; tr < 2; tr++) {
          const trophyBone = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), boneMat);
          trophyBone.position.set(-0.1 + tr * 0.08, 0.68, 0.12);
          trophyBone.rotation.x = 0.3;
          group.add(trophyBone);
        }
        // Secondary dagger in weapon loop
        const daggerLoop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.02), leatherDarkMat);
        daggerLoop.position.set(-0.18, 0.72, 0.08);
        group.add(daggerLoop);
        const daggerHilt = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.015), metalMat);
        daggerHilt.position.set(-0.18, 0.67, 0.08);
        group.add(daggerHilt);
        break;
      }

      case EnemyType.GIANT_HAWK: {
        // ~75,000 triangles — enhanced giant raptor with alula, primary flight feathers, feathered trousers, hallux talon, and anim_jaw beak
        const featherMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.7 });
        const featherDarkMat = new THREE.MeshStandardMaterial({ color: 0x5b3914, roughness: 0.75 });
        const featherLightMat = new THREE.MeshStandardMaterial({ color: 0xab8934, roughness: 0.65 });
        const featherBarMat = new THREE.MeshStandardMaterial({ color: 0x3a2808, roughness: 0.7 });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x6b4914, roughness: 0.6 });
        const wingTipMat = new THREE.MeshStandardMaterial({ color: 0x3a2808, roughness: 0.7 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.4 });
        const talonMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.2 });
        const scarDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.8 });
        const tongueMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });
        const nictMat = new THREE.MeshStandardMaterial({ color: 0xccddcc, transparent: true, opacity: 0.35, roughness: 0.2 });

        // Streamlined body
        const hawkBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), featherMat);
        hawkBody.scale.set(0.78, 0.68, 1.25);
        hawkBody.position.y = 1.2;
        hawkBody.castShadow = true;
        group.add(hawkBody);
        // Breast — 3 rows of overlapping feather boxes (5-6 per row)
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 5; col++) {
            const breastFeather = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.025, 0.1), row % 2 === 0 ? featherLightMat : featherMat);
            breastFeather.position.set((col - 2) * 0.06, 1.08 + row * 0.06, 0.2 - row * 0.02);
            breastFeather.rotation.x = 0.15 + row * 0.05;
            group.add(breastFeather);
          }
        }
        // Battle scar/chest wound — thin dark stripe across breast
        const chestScar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.015), scarDarkMat);
        chestScar.position.set(0.04, 1.13, 0.26);
        chestScar.rotation.z = 0.15;
        group.add(chestScar);
        // Back feather layers (overlapping rows)
        for (let bf = 0; bf < 5; bf++) {
          const backF = new THREE.Mesh(new THREE.BoxGeometry(0.22 - bf * 0.02, 0.015, 0.1), bf % 2 === 0 ? featherDarkMat : featherMat);
          backF.position.set(0, 1.3 - bf * 0.035, -0.12 - bf * 0.06);
          backF.rotation.x = 0.1;
          group.add(backF);
        }
        // Neck ruff — ring of small feather planes
        for (let rf = 0; rf < 10; rf++) {
          const ruffAng = (rf / 10) * Math.PI * 2;
          const ruffFeather = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.07), featherLightMat);
          ruffFeather.position.set(Math.sin(ruffAng) * 0.14, 1.38, 0.25 + Math.cos(ruffAng) * 0.08);
          ruffFeather.rotation.y = ruffAng;
          ruffFeather.rotation.x = -0.3;
          group.add(ruffFeather);
        }
        // Head — slightly larger with layered crown feathers
        const hawkHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), featherMat);
        hawkHead.scale.set(1.0, 0.95, 1.1);
        hawkHead.position.set(0, 1.52, 0.28);
        group.add(hawkHead);
        // Crown feather layering (6 crest feathers)
        for (let c = 0; c < 6; c++) {
          const crest = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.065 + c * 0.008, 0.04), c % 2 === 0 ? featherDarkMat : featherMat);
          crest.position.set(c % 2 === 0 ? 0.01 : -0.01, 1.63 + c * 0.015, 0.2 - c * 0.04);
          crest.rotation.x = -0.3 - c * 0.08;
          group.add(crest);
        }
        // Intimidating brow ridges
        for (const ex of [-0.06, 0.06]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.022, 0.03), featherDarkMat);
          brow.position.set(ex, 1.57, 0.37);
          brow.rotation.z = ex > 0 ? -0.22 : 0.22;
          group.add(brow);
        }

        // Beak — anim_jaw group for open/close
        const jawGrp = new THREE.Group();
        jawGrp.name = 'anim_jaw';
        jawGrp.position.set(0, 1.5, 0.4);
        const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.15, 16), beakMat);
        upperBeak.rotation.x = -Math.PI / 2;
        upperBeak.position.set(0, 0, 0.04);
        jawGrp.add(upperBeak);
        // Beak serration bumps along upper edge
        for (let bs = 0; bs < 4; bs++) {
          const bump = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), beakMat);
          bump.position.set(0, 0.01, 0.02 + bs * 0.025);
          jawGrp.add(bump);
        }
        const beakHook = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), beakMat);
        beakHook.position.set(0, -0.01, 0.1);
        jawGrp.add(beakHook);
        const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 12), beakMat);
        lowerBeak.rotation.x = -Math.PI / 2 + 0.2;
        lowerBeak.position.set(0, -0.03, 0.01);
        jawGrp.add(lowerBeak);
        // Tongue hint inside beak
        const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 6), tongueMat);
        tongue.rotation.x = -Math.PI / 2 + 0.3;
        tongue.position.set(0, -0.01, 0.02);
        jawGrp.add(tongue);
        group.add(jawGrp);

        // Eyes — larger with golden iris, fierce pupil, and nictitating membrane
        const hawkEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 });
        for (const ex of [-0.065, 0.065]) {
          const eyeBase = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffdd44 }));
          eyeBase.position.set(ex, 1.535, 0.356);
          eyeBase.scale.z = 0.5;
          group.add(eyeBase);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), hawkEyeMat);
          pupil.position.set(ex, 1.535, 0.375);
          group.add(pupil);
          // Nictitating membrane (thin semi-transparent plane)
          const nict = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.002), nictMat);
          nict.position.set(ex, 1.535, 0.372);
          group.add(nict);
        }

        // Wings — enhanced with alula, 8 primary feathers, secondary row underneath, shoulder muscle
        for (const wx of [-1, 1]) {
          const hawkWingGroup = new THREE.Group();
          hawkWingGroup.name = wx < 0 ? 'anim_lw' : 'anim_rw';
          hawkWingGroup.position.set(wx * 0.15, 1.25, 0);
          // Wing shoulder muscle sphere at base
          const wingShoulderMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), featherMat);
          wingShoulderMuscle.position.set(wx * 0.06, 0, 0);
          hawkWingGroup.add(wingShoulderMuscle);
          // Inner wing panel (secondary feathers)
          const innerWing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.36), featherMat);
          innerWing.position.set(wx * 0.22, 0, 0.02);
          innerWing.rotation.z = wx * 0.15;
          hawkWingGroup.add(innerWing);
          // Secondary feather row underneath inner wing
          for (let sf = 0; sf < 5; sf++) {
            const secFeather = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.12), featherLightMat);
            secFeather.position.set(wx * (0.08 + sf * 0.08), -0.014, -0.05 + sf * 0.01);
            secFeather.rotation.z = wx * 0.15;
            hawkWingGroup.add(secFeather);
          }
          // Outer wing (primary feather base)
          const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.015, 0.3), wingMat);
          outerWing.position.set(wx * 0.57, -0.03, -0.02);
          outerWing.rotation.z = wx * 0.25;
          hawkWingGroup.add(outerWing);
          // 8 individual primary flight feathers (thin long boxes)
          for (let ft = 0; ft < 8; ft++) {
            const tipFeather = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.055 + ft * 0.006), ft < 2 ? wingTipMat : wingMat);
            tipFeather.position.set(wx * (0.72 + ft * 0.035), -0.07 - ft * 0.018, -0.06 - ft * 0.04);
            tipFeather.rotation.z = wx * (0.3 + ft * 0.045);
            tipFeather.rotation.y = wx * ft * 0.04;
            hawkWingGroup.add(tipFeather);
          }
          // Alula — small feather group at wing bend
          for (let al = 0; al < 3; al++) {
            const alulaFeather = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.04), featherDarkMat);
            alulaFeather.position.set(wx * (0.5 + al * 0.025), 0.01, 0.12 - al * 0.02);
            alulaFeather.rotation.z = wx * 0.3;
            hawkWingGroup.add(alulaFeather);
          }
          // Wing coverts (small overlapping feathers)
          for (let cv = 0; cv < 4; cv++) {
            const covert = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.08), cv % 2 === 0 ? featherLightMat : featherMat);
            covert.position.set(wx * (0.12 + cv * 0.14), 0.025, 0.09 - cv * 0.025);
            covert.rotation.z = wx * 0.1;
            hawkWingGroup.add(covert);
          }
          group.add(hawkWingGroup);
        }

        // Tail — 8 feathers with barring pattern and under-tail coverts
        const hawkTailGroup = new THREE.Group();
        hawkTailGroup.name = 'anim_tail';
        hawkTailGroup.position.set(0, 1.14, -0.22);
        for (let tf = 0; tf < 8; tf++) {
          const tailFeather = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.01, 0.22), tf % 2 === 0 ? featherDarkMat : wingMat);
          tailFeather.position.set((tf - 3.5) * 0.045, 0, -0.11 - Math.abs(tf - 3.5) * 0.025);
          tailFeather.rotation.y = (tf - 3.5) * 0.07;
          hawkTailGroup.add(tailFeather);
          // Barring stripe on each feather
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.012, 0.015), featherBarMat);
          bar.position.set((tf - 3.5) * 0.045, 0.004, -0.07 - Math.abs(tf - 3.5) * 0.025);
          bar.rotation.y = (tf - 3.5) * 0.07;
          hawkTailGroup.add(bar);
        }
        // Under-tail coverts
        for (let uc = 0; uc < 4; uc++) {
          const underCovert = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.1), featherLightMat);
          underCovert.position.set((uc - 1.5) * 0.05, -0.012, -0.04);
          hawkTailGroup.add(underCovert);
        }
        group.add(hawkTailGroup);

        // Legs — feathered trousers on thigh, 6+ scale rings, toe pads, hallux talon
        for (const tx of [-0.1, 0.1]) {
          const hawkLegGroup = new THREE.Group();
          hawkLegGroup.name = tx < 0 ? 'anim_fll' : 'anim_frl';
          hawkLegGroup.position.set(tx, 1.1, 0.1);
          // Feathered "trousers" on upper thigh — fluffy feather ring
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.16, 16), featherMat);
          thigh.position.y = -0.08;
          hawkLegGroup.add(thigh);
          for (let tf2 = 0; tf2 < 7; tf2++) {
            const trouser = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 6), featherLightMat);
            const ang = (tf2 / 7) * Math.PI * 2;
            trouser.position.set(Math.sin(ang) * 0.055, -0.04, Math.cos(ang) * 0.055);
            trouser.rotation.x = Math.cos(ang) * 0.5;
            trouser.rotation.z = -Math.sin(ang) * 0.5;
            hawkLegGroup.add(trouser);
          }
          // Scaled tarsus
          const tarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.22, 16), beakMat);
          tarsus.position.set(0, -0.24, 0.02);
          hawkLegGroup.add(tarsus);
          // 6 scale rings on tarsus
          for (let sr = 0; sr < 6; sr++) {
            const scaleRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 14), beakMat);
            scaleRing.rotation.x = Math.PI / 2;
            scaleRing.position.set(0, -0.15 + sr * (-0.04), 0.02);
            hawkLegGroup.add(scaleRing);
          }
          // 3 forward talons with toe pads
          for (let tc = 0; tc < 3; tc++) {
            const toePad = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), beakMat);
            toePad.position.set((tc - 1) * 0.028, -0.355, 0.03 + tc * 0.008);
            hawkLegGroup.add(toePad);
            const talon = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09, 10), talonMat);
            talon.position.set((tc - 1) * 0.028, -0.37, 0.05 + tc * 0.01);
            talon.rotation.x = Math.PI * 0.82;
            hawkLegGroup.add(talon);
          }
          // Hallux (rear killing talon) — notably larger
          const halToe = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), beakMat);
          halToe.position.set(0, -0.35, -0.025);
          hawkLegGroup.add(halToe);
          const halluxTalon = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.13, 12), talonMat);
          halluxTalon.position.set(0, -0.37, -0.04);
          halluxTalon.rotation.x = Math.PI * 1.18;
          hawkLegGroup.add(halluxTalon);
          group.add(hawkLegGroup);
        }
        break;
      }

      case EnemyType.BISON_BEAST: {
        // --- BISON_BEAST | Estimated polygons: ~75,000 triangles ---
        const bisonMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
        const bisonDarkMat = new THREE.MeshStandardMaterial({ color: 0x221510, roughness: 0.9 });
        const bisonLightMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.8 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x888866, roughness: 0.4, metalness: 0.1 });
        const hornDarkMat = new THREE.MeshStandardMaterial({ color: 0x666644, roughness: 0.5 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
        const bisonScarMat = new THREE.MeshStandardMaterial({ color: 0x7a5a4a, roughness: 0.9 });
        const bisonBreathMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, transparent: true, opacity: 0.25 });
        const bisonDustMat = new THREE.MeshStandardMaterial({ color: 0x8a6a40, transparent: true, opacity: 0.18 });
        const bisonGlowEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xcc2200, emissiveIntensity: 1.2 });
        // Massive body (rounded, muscular)
        const biBody = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), bisonMat);
        biBody.scale.set(0.85, 0.65, 1.1);
        biBody.position.y = 0.82;
        biBody.castShadow = true;
        group.add(biBody);
        // Ribcage bulge on sides
        for (const sx of [-1, 1]) {
          const ribs = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 24), bisonMat);
          ribs.scale.set(0.4, 0.62, 1.05);
          ribs.position.set(sx * 0.35, 0.75, -0.05);
          group.add(ribs);
          // Secondary lower rib detail
          const ribLow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), bisonMat);
          ribLow.scale.set(0.38, 0.55, 0.9);
          ribLow.position.set(sx * 0.34, 0.64, 0.1);
          group.add(ribLow);
        }
        // Belly hanging woolly fur (underside)
        for (let bv = 0; bv < 7; bv++) {
          const bellyTuft = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 12), bisonDarkMat);
          bellyTuft.position.set((bv - 3) * 0.11, 0.55, -0.05);
          bellyTuft.rotation.z = Math.PI;
          group.add(bellyTuft);
        }
        // Spine ridge bumps along back
        for (let sp = 0; sp < 6; sp++) {
          const spineBump = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), bisonDarkMat);
          spineBump.scale.set(0.7, 1.2, 0.7);
          spineBump.position.set(0, 1.07 + sp * 0.005, 0.28 - sp * 0.12);
          group.add(spineBump);
        }
        // Flank fur tufts (15 across flanks and belly)
        const bisonFlankPos: [number, number, number][] = [
          [-0.48, 0.85, 0.25], [0.48, 0.85, 0.25], [-0.45, 0.78, -0.1], [0.45, 0.78, -0.1],
          [-0.47, 0.70, 0.05], [0.47, 0.70, 0.05], [-0.43, 0.90, 0.45], [0.43, 0.90, 0.45],
          [-0.44, 0.72, -0.3], [0.44, 0.72, -0.3], [-0.40, 0.80, -0.45], [0.40, 0.80, -0.45],
          [-0.38, 0.68, 0.35], [0.38, 0.68, 0.35], [0, 0.55, -0.2]
        ];
        bisonFlankPos.forEach(([fx, fy, fz], fi) => {
          const flankTuft = new THREE.Mesh(new THREE.ConeGeometry(0.035 + (fi % 3) * 0.01, 0.1 + (fi % 4) * 0.015, 10), bisonDarkMat);
          flankTuft.position.set(fx, fy, fz);
          flankTuft.rotation.set((fi % 3) * 0.2 - 0.2, fi * 0.7, (fx < 0 ? 0.4 : -0.4) + (fi % 3) * 0.1);
          group.add(flankTuft);
        });
        // Massive shoulder hump (bigger, more layered)
        const hump = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 24), bisonDarkMat);
        hump.scale.set(1.0, 1.0, 0.88);
        hump.position.set(0, 1.3, 0.18);
        group.add(hump);
        // Hump matted fur overlay sphere
        const humpOverlay = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), bisonDarkMat);
        humpOverlay.scale.set(0.85, 0.7, 0.75);
        humpOverlay.position.set(0, 1.38, 0.22);
        group.add(humpOverlay);
        // Hump shaggy cones (18 — overlapping, tangled appearance)
        for (let ft = 0; ft < 18; ft++) {
          const ang = (ft / 18) * Math.PI * 2;
          const r = 0.15 + (ft % 3) * 0.06;
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.025 + (ft % 4) * 0.008, 0.1 + (ft % 5) * 0.02, 10), bisonDarkMat);
          tuft.position.set(Math.sin(ang) * r, 1.47 + Math.sin(ft) * 0.07, 0.18 + Math.cos(ang) * r * 0.7);
          tuft.rotation.set(Math.sin(ft) * 0.6, ang, Math.cos(ft) * 0.5);
          group.add(tuft);
        }
        // Chest wool sphere
        const chestWool = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), bisonDarkMat);
        chestWool.scale.set(1.1, 0.85, 0.9);
        chestWool.position.set(0, 0.78, 0.52);
        group.add(chestWool);
        // Chest wool fuzzy cone tufts (9 overlapping)
        for (let cw = 0; cw < 9; cw++) {
          const ang = (cw / 9) * Math.PI * 2;
          const cwTuft = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 10), bisonDarkMat);
          cwTuft.position.set(Math.sin(ang) * 0.14, 0.78 + Math.cos(ang) * 0.1, 0.52 + 0.12);
          cwTuft.rotation.x = -0.5;
          cwTuft.rotation.z = Math.sin(ang) * 0.5;
          group.add(cwTuft);
        }
        // Thick woolly beard — 11 cones in two rows
        for (let bf = 0; bf < 11; bf++) {
          const bRow = Math.floor(bf / 6);
          const bCol = bf % 6;
          const bisonBeard = new THREE.Mesh(new THREE.ConeGeometry(0.022 + bRow * 0.006, 0.12 + bRow * 0.04, 10), bisonDarkMat);
          bisonBeard.position.set((bCol - 2.5) * 0.06, 0.63 - bRow * 0.06, 0.62 + bRow * 0.04);
          bisonBeard.rotation.x = 0.3 + bRow * 0.15;
          group.add(bisonBeard);
        }
        // Head (broad, lowered, battle-scarred)
        const biHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), bisonMat);
        biHead.scale.set(1.1, 0.80, 0.97);
        biHead.position.set(0, 0.78, 0.72);
        group.add(biHead);
        // Brow plate (battle-scarred flat box between horns)
        const browPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.1), bisonDarkMat);
        browPlate.position.set(0, 0.9, 0.75);
        group.add(browPlate);
        // Battle scars on body (thin lighter boxes)
        const bisonScarData: [number, number, number, number, number, number, number][] = [
          [0.32, 0.92, 0.2, 0.10, 0.008, 0.06, 0.15],
          [-0.38, 0.85, -0.1, 0.08, 0.008, 0.05, -0.1],
          [0.10, 0.88, -0.35, 0.12, 0.008, 0.04, 0.2],
          [-0.15, 1.15, 0.08, 0.09, 0.008, 0.03, -0.05]
        ];
        for (const [sx, sy, sz, sw, sh, sd, srot] of bisonScarData) {
          const scar = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), bisonScarMat);
          scar.position.set(sx, sy, sz);
          scar.rotation.z = srot;
          group.add(scar);
        }
        // Broad nose/muzzle (wider, with lip detail)
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), bisonLightMat);
        muzzle.scale.set(1.25, 0.72, 1.0);
        muzzle.position.set(0, 0.70, 0.91);
        group.add(muzzle);
        // Lip ridge
        const lipRidge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.018, 0.04), bisonMat);
        lipRidge.position.set(0, 0.695, 0.97);
        group.add(lipRidge);
        // Mouth opening (dark box)
        const mouthOpen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.05), new THREE.MeshStandardMaterial({ color: 0x110808 }));
        mouthOpen.position.set(0, 0.668, 0.96);
        group.add(mouthOpen);
        // Jaw group (anim_jaw) — lower jaw with teeth hints
        const bisonJawGroup = new THREE.Group();
        bisonJawGroup.name = 'anim_jaw';
        bisonJawGroup.position.set(0, 0.65, 0.88);
        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.1), bisonMat);
        lowerJaw.position.set(0, -0.025, 0);
        bisonJawGroup.add(lowerJaw);
        for (let t = 0; t < 5; t++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.015), new THREE.MeshStandardMaterial({ color: 0xddddcc }));
          tooth.position.set((t - 2) * 0.038, 0.01, 0.04);
          bisonJawGroup.add(tooth);
        }
        group.add(bisonJawGroup);
        // Nostrils (flared)
        for (const nx of [-0.055, 0.055]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), new THREE.MeshStandardMaterial({ color: 0x331111 }));
          nostril.scale.z = 0.5;
          nostril.position.set(nx, 0.695, 0.99);
          group.add(nostril);
        }
        // Nostril breath effect (warm transparent cone)
        const breathCone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 12), bisonBreathMat);
        breathCone.rotation.x = -Math.PI / 2;
        breathCone.position.set(0, 0.695, 1.05);
        group.add(breathCone);
        // Orbital bone ridges above eyes + deep-set eyes with enraged glow
        for (const ex of [-0.12, 0.12]) {
          const orbRidge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.04), bisonDarkMat);
          orbRidge.position.set(ex, 0.865, 0.875);
          orbRidge.rotation.z = ex > 0 ? -0.15 : 0.15;
          group.add(orbRidge);
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), bisonDarkMat);
          eyeSocket.scale.z = 0.48;
          eyeSocket.position.set(ex, 0.825, 0.872);
          group.add(eyeSocket);
          const biEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), bisonGlowEyeMat);
          biEye.position.set(ex, 0.825, 0.895);
          group.add(biEye);
          // Glow halo around eye
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff3300, emissiveIntensity: 0.6, transparent: true, opacity: 0.45 }));
          eyeGlow.position.set(ex, 0.825, 0.892);
          group.add(eyeGlow);
        }
        // Ears (tattered edges with inner detail)
        for (const ex of [-0.22, 0.22]) {
          const ear = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.07, 0.032), bisonMat);
          ear.position.set(ex, 0.935, 0.62);
          ear.rotation.z = ex > 0 ? -0.45 : 0.45;
          group.add(ear);
          const earInner = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.012), new THREE.MeshStandardMaterial({ color: 0x6a3a2a }));
          earInner.position.set(ex * 0.93, 0.935, 0.635);
          earInner.rotation.z = ex > 0 ? -0.45 : 0.45;
          group.add(earInner);
          // Tattered notch
          const earNotch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.04), bisonDarkMat);
          earNotch.position.set(ex + (ex > 0 ? 0.02 : -0.02), 0.96, 0.62);
          group.add(earNotch);
        }
        // Horns (enhanced — thicker bases, 4-5 ridges per horn, battle damage on left)
        for (const hx of [-0.23, 0.23]) {
          const isLeftHorn = hx < 0;
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.13, 16), hornDarkMat);
          hornBase.position.set(hx, 0.935, 0.715);
          hornBase.rotation.z = hx > 0 ? -0.42 : 0.42;
          group.add(hornBase);
          const hornMid = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.16, 16), hornMat);
          hornMid.position.set(hx * 1.32, 0.995, 0.735);
          hornMid.rotation.z = hx > 0 ? -0.85 : 0.85;
          group.add(hornMid);
          // Left horn slightly shorter (broken tip) for battle damage
          const tipLength = isLeftHorn ? 0.09 : 0.13;
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(isLeftHorn ? 0.022 : 0.026, tipLength, 16), hornMat);
          hornTip.position.set(hx * 1.52, 1.095, 0.755);
          hornTip.rotation.z = hx > 0 ? -1.25 : 1.25;
          group.add(hornTip);
          // Jagged broken stub on left horn
          if (isLeftHorn) {
            const brokenStub = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.022, 0.022), hornDarkMat);
            brokenStub.position.set(hx * 1.64, 1.12, 0.76);
            brokenStub.rotation.z = 0.7;
            group.add(brokenStub);
          }
          // 4-5 ridges per horn
          const ridgeCount = isLeftHorn ? 4 : 5;
          for (let hr = 0; hr < ridgeCount; hr++) {
            const ridgeR = 0.048 - hr * 0.004;
            const ridge = new THREE.Mesh(new THREE.TorusGeometry(ridgeR, 0.007, 8, 16), hornDarkMat);
            ridge.rotation.x = Math.PI / 2;
            ridge.position.set(hx * (1.08 + hr * 0.14), 0.95 + hr * 0.045, 0.725);
            group.add(ridge);
          }
        }
        // Legs (thick, muscular — shaggy thigh fur, knee, enhanced hooves)
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const bisonLegGroup = new THREE.Group();
            bisonLegGroup.name = i === 1 ? (side === -1 ? 'anim_fll' : 'anim_frl') : (side === -1 ? 'anim_bll' : 'anim_brl');
            bisonLegGroup.position.set(side * 0.33, 0.625, i * 0.72 - 0.15);
            // Thigh muscle
            const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), bisonMat);
            thigh.scale.set(0.9, 0.85, 0.8);
            thigh.position.y = -0.06;
            bisonLegGroup.add(thigh);
            // Thigh shaggy fur tufts (5 per leg)
            for (let tf = 0; tf < 5; tf++) {
              const tAng = (tf / 5) * Math.PI * 2;
              const thighTuft = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.075, 8), bisonDarkMat);
              thighTuft.position.set(Math.sin(tAng) * 0.075, -0.05 + Math.cos(tAng) * 0.04, Math.cos(tAng) * 0.04);
              thighTuft.rotation.set(Math.cos(tAng) * 0.5, 0, Math.sin(tAng) * 0.5);
              bisonLegGroup.add(thighTuft);
            }
            const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.26, 16), bisonMat);
            upperLeg.position.y = -0.135;
            bisonLegGroup.add(upperLeg);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), bisonMat);
            knee.position.y = -0.258;
            bisonLegGroup.add(knee);
            const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.23, 16), bisonLightMat);
            lowerLeg.position.y = -0.42;
            bisonLegGroup.add(lowerLeg);
            // Hoof (larger)
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.088, 0.055, 16), hoofMat);
            hoof.position.y = -0.562;
            bisonLegGroup.add(hoof);
            // Hoof split
            const split = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.06, 0.065), bisonDarkMat);
            split.position.y = -0.562;
            bisonLegGroup.add(split);
            // Hoof impact crack (emissive line at ground level)
            const impactCrack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.06), new THREE.MeshStandardMaterial({ color: 0x553311, emissive: 0x331100, emissiveIntensity: 0.4 }));
            impactCrack.position.set(0, -0.592, 0);
            bisonLegGroup.add(impactCrack);
            group.add(bisonLegGroup);
          }
        }
        // Dust clouds near hooves (3-4 transparent brownish spheres)
        const bisonDustPos: [number, number, number][] = [
          [0.33, 0.06, 0.57], [-0.33, 0.06, 0.57], [0.28, 0.05, -0.57], [-0.28, 0.05, -0.57]
        ];
        bisonDustPos.forEach(([dx, dy, dz]) => {
          const dust = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), bisonDustMat);
          dust.scale.set(1.3, 0.5, 1.1);
          dust.position.set(dx, dy, dz);
          group.add(dust);
        });
        // Tail (longer, with 7 flowing hair strands)
        const bisonTailGroup = new THREE.Group();
        bisonTailGroup.name = 'anim_tail';
        bisonTailGroup.position.set(0, 0.78, -0.57);
        const bisonTailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.4, 16), bisonMat);
        bisonTailBase.rotation.x = 0.42;
        bisonTailGroup.add(bisonTailBase);
        const tailTuftSphere = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), bisonDarkMat);
        tailTuftSphere.scale.y = 1.4;
        tailTuftSphere.position.set(0, -0.2, -0.18);
        bisonTailGroup.add(tailTuftSphere);
        // 7 hair strands in tuft
        for (let ts = 0; ts < 7; ts++) {
          const tAng = (ts / 7) * Math.PI * 2;
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, 0.14 + ts * 0.012, 8), bisonDarkMat);
          strand.position.set(Math.sin(tAng) * 0.03, -0.28 - ts * 0.008, -0.18 + Math.cos(tAng) * 0.025);
          strand.rotation.set(0.3 + Math.cos(tAng) * 0.2, 0, Math.sin(tAng) * 0.3);
          bisonTailGroup.add(strand);
        }
        group.add(bisonTailGroup);
        break;
      }

      case EnemyType.CENTAUR_WARCHIEF: {
        // --- CENTAUR_WARCHIEF | Estimated polygons: ~92,000 triangles ---
        const horseMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 });
        const horseDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.8 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.5, roughness: 0.4 });
        const armorTrimMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.7, roughness: 0.3 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.6 });
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.5, metalness: 0.2 });
        const runeMat = new THREE.MeshStandardMaterial({ color: 0x88ffcc, emissive: 0x44ddaa, emissiveIntensity: 0.8 });
        const bannerMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.8 });
        const skullMat = new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.7 });
        const metalHoofMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.2 });
        const cEyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2 });
        // Horse body (muscular, rounded)
        const hBody = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 24), horseMat);
        hBody.scale.set(0.7, 0.55, 1.4);
        hBody.position.y = 0.68;
        hBody.castShadow = true;
        group.add(hBody);
        // Muscle groups (haunches, chest, withers)
        const haunchL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), horseMat);
        haunchL.scale.set(0.6, 0.7, 0.8);
        haunchL.position.set(-0.2, 0.72, -0.42);
        group.add(haunchL);
        const haunchR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), horseMat);
        haunchR.scale.set(0.6, 0.7, 0.8);
        haunchR.position.set(0.2, 0.72, -0.42);
        group.add(haunchR);
        const chestMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), horseMat);
        chestMuscle.scale.set(0.7, 0.6, 0.7);
        chestMuscle.position.set(0, 0.7, 0.5);
        group.add(chestMuscle);
        const withers = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), horseMat);
        withers.scale.set(0.9, 0.6, 0.7);
        withers.position.set(0, 0.85, 0.28);
        group.add(withers);
        // Horse barrel (side bulge) + vein detail
        for (const sx of [-1, 1]) {
          const barrel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), horseMat);
          barrel.scale.set(0.5, 0.5, 1);
          barrel.position.set(sx * 0.25, 0.6, 0);
          group.add(barrel);
          const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x3a1a08, roughness: 0.9 }));
          vein.position.set(sx * 0.28, 0.62, 0.1);
          vein.rotation.z = Math.PI / 2;
          vein.rotation.y = 0.3;
          group.add(vein);
        }
        // Segmented barding armor plates (4 per flank with trim + rivets)
        for (const sx of [-1, 1]) {
          for (let bp = 0; bp < 4; bp++) {
            const bardPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), armorMat);
            bardPlate.position.set(sx * 0.3, 0.82 - bp * 0.02, -0.02 + bp * 0.18 - 0.25);
            bardPlate.rotation.z = sx > 0 ? -0.08 : 0.08;
            group.add(bardPlate);
            const bardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.065, 0.2), armorTrimMat);
            bardTrim.position.set(sx * (0.33 + bp * 0.002), 0.82 - bp * 0.02, -0.02 + bp * 0.18 - 0.25);
            group.add(bardTrim);
            for (const rv of [0.06, -0.06]) {
              const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), metalHoofMat);
              rivet.position.set(sx * 0.305, 0.84 - bp * 0.02, rv + bp * 0.18 - 0.25);
              group.add(rivet);
            }
          }
        }
        // Horse neck (muscular)
        const hNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.35, 16), horseMat);
        hNeck.position.set(0, 0.9, 0.45);
        hNeck.rotation.x = -0.5;
        group.add(hNeck);
        // Horse head
        const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), horseMat);
        hHead.scale.set(0.8, 0.7, 1.3);
        hHead.position.set(0, 0.85, 0.7);
        group.add(hHead);
        // Chamfron (face armor plate with eye holes)
        const chamfron = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.03), armorMat);
        chamfron.position.set(0, 0.87, 0.75);
        group.add(chamfron);
        const chamfronTrimTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.035), armorTrimMat);
        chamfronTrimTop.position.set(0, 0.96, 0.76);
        group.add(chamfronTrimTop);
        for (const ex of [-0.055, 0.055]) {
          const eyeHole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          eyeHole.position.set(ex, 0.89, 0.77);
          group.add(eyeHole);
        }
        // Bridle reins
        const bridleL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8), horseDarkMat);
        bridleL.position.set(-0.1, 0.87, 0.7);
        bridleL.rotation.z = 0.4;
        bridleL.rotation.x = 0.2;
        group.add(bridleL);
        const bridleR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8), horseDarkMat);
        bridleR.position.set(0.1, 0.87, 0.7);
        bridleR.rotation.z = -0.4;
        bridleR.rotation.x = 0.2;
        group.add(bridleR);
        // Horse muzzle
        const hMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16), horseMat);
        hMuzzle.rotation.x = Math.PI / 2;
        hMuzzle.position.set(0, 0.82, 0.82);
        group.add(hMuzzle);
        // Horse ears
        for (const ex of [-0.06, 0.06]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 12), horseMat);
          ear.position.set(ex, 0.98, 0.65);
          group.add(ear);
        }
        // Mane (10+ strands, some braided with bead spheres)
        for (let m = 0; m < 10; m++) {
          const maneW = 0.04 + (m % 3) * 0.008;
          const mane = new THREE.Mesh(new THREE.BoxGeometry(maneW, 0.06 + m * 0.01, 0.03), horseDarkMat);
          mane.position.set((m % 2 === 0 ? 0.015 : -0.015), 0.96 - m * 0.018, 0.5 - m * 0.055);
          mane.rotation.x = -0.2 - m * 0.02;
          group.add(mane);
        }
        for (let br = 0; br < 3; br++) {
          const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.1, 8), horseDarkMat);
          braid.position.set(br * 0.022 - 0.022, 0.9 - br * 0.04, 0.4 - br * 0.07);
          braid.rotation.x = 0.4;
          group.add(braid);
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), armorTrimMat);
          bead.position.set(br * 0.022 - 0.022, 0.86 - br * 0.04, 0.45 - br * 0.07);
          group.add(bead);
        }
        // Human torso (layered armor — chainmail edges + plate strips)
        const hTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.28), armorMat);
        hTorso.position.set(0, 1.28, 0.25);
        group.add(hTorso);
        const chainEdgeL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.28), chainMat);
        chainEdgeL.position.set(-0.222, 1.28, 0.25);
        group.add(chainEdgeL);
        const chainEdgeR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.28), chainMat);
        chainEdgeR.position.set(0.222, 1.28, 0.25);
        group.add(chainEdgeR);
        const torsoPlateT = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.018, 0.28), armorTrimMat);
        torsoPlateT.position.set(0, 1.52, 0.25);
        group.add(torsoPlateT);
        const torsoPlateM = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.018, 0.28), armorTrimMat);
        torsoPlateM.position.set(0, 1.3, 0.25);
        group.add(torsoPlateM);
        // Chest emblem (larger with surrounding filigree)
        const chestEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 4), armorTrimMat);
        chestEmblem.position.set(0, 1.32, 0.4);
        chestEmblem.scale.z = 0.3;
        group.add(chestEmblem);
        for (let fg = 0; fg < 6; fg++) {
          const fAng = (fg / 6) * Math.PI * 2;
          const filigree = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.1, 8), armorTrimMat);
          filigree.position.set(Math.sin(fAng) * 0.1, 1.32 + Math.cos(fAng) * 0.07, 0.4);
          filigree.rotation.z = fAng + Math.PI / 2;
          group.add(filigree);
        }
        // Battle standard/banner (pole + flag + emblem)
        const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.55, 8), woodMat);
        bannerPole.position.set(0.05, 1.68, 0.1);
        group.add(bannerPole);
        const bannerFlag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.01), bannerMat);
        bannerFlag.position.set(0.16, 1.88, 0.1);
        group.add(bannerFlag);
        const bannerEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.015), armorTrimMat);
        bannerEmblem.position.set(0.16, 1.88, 0.11);
        group.add(bannerEmblem);
        // Chain mail skirt
        const chainSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 16), chainMat);
        chainSkirt.position.set(0, 0.98, 0.25);
        group.add(chainSkirt);
        // Shoulder pauldrons (enhanced — larger, 3 spikes, fur trim, trophy skull on right)
        for (const sx of [-0.28, 0.28]) {
          const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), armorMat);
          pauldron.scale.set(1.35, 0.75, 1.05);
          pauldron.position.set(sx, 1.54, 0.25);
          group.add(pauldron);
          const pTrim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.013, 8, 16, Math.PI), armorTrimMat);
          pTrim.position.set(sx, 1.5, 0.25);
          pTrim.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
          group.add(pTrim);
          for (let ps = 0; ps < 3; ps++) {
            const spikeAng = sx > 0 ? (-0.3 + ps * 0.3) : (0.3 - ps * 0.3);
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 12), armorTrimMat);
            spike.position.set(sx * (1.15 + ps * 0.04), 1.62 + ps * 0.02, 0.25 + ps * 0.03);
            spike.rotation.z = spikeAng;
            group.add(spike);
          }
          for (let ft = 0; ft < 5; ft++) {
            const furTuft = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 8), horseDarkMat);
            furTuft.position.set(sx * 0.98, 1.44 + (ft % 2) * 0.02, 0.25 + (ft - 2) * 0.04);
            furTuft.rotation.z = sx > 0 ? -0.4 : 0.4;
            group.add(furTuft);
          }
          if (sx > 0) {
            const trophySkull = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), skullMat);
            trophySkull.scale.set(0.9, 0.8, 0.95);
            trophySkull.position.set(sx * 1.22, 1.54, 0.1);
            group.add(trophySkull);
            for (const eox of [-0.014, 0.014]) {
              const skullEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
              skullEye.position.set(sx * 1.22 + eox, 1.555, 0.14);
              group.add(skullEye);
            }
          }
        }
        // Belt trophy skulls
        for (let bs = 0; bs < 2; bs++) {
          const beltSkull = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), skullMat);
          beltSkull.position.set((bs === 0 ? -0.14 : 0.14), 0.98, 0.42);
          group.add(beltSkull);
          for (const eox of [-0.01, 0.01]) {
            const bse = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            bse.position.set((bs === 0 ? -0.14 : 0.14) + eox, 0.99, 0.455);
            group.add(bse);
          }
        }
        // Arms (bicep ring, rune bracers, 3 finger cylinders)
        for (const ax of [-0.28, 0.28]) {
          const centaurArmGroup = new THREE.Group();
          centaurArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          centaurArmGroup.position.set(ax, 1.475, 0.25);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.26, 16), skinMat);
          upperArm.position.y = -0.13;
          upperArm.rotation.z = ax < 0 ? 0.2 : -0.2;
          centaurArmGroup.add(upperArm);
          const bicepRing = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 8, 16), armorTrimMat);
          bicepRing.position.y = -0.07;
          bicepRing.rotation.z = ax < 0 ? 0.2 : -0.2;
          centaurArmGroup.add(bicepRing);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.23, 16), skinMat);
          forearm.position.set((ax > 0 ? 1 : -1) * 0.044, -0.335, 0);
          centaurArmGroup.add(forearm);
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.053, 0.09, 16), armorMat);
          bracer.position.set((ax > 0 ? 1 : -1) * 0.03, -0.285, 0);
          centaurArmGroup.add(bracer);
          for (let rn = 0; rn < 3; rn++) {
            const runeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.065), runeMat);
            runeStrip.position.set((ax > 0 ? 1 : -1) * 0.03 + (rn - 1) * 0.022, -0.285, 0.055);
            centaurArmGroup.add(runeStrip);
          }
          for (let f = 0; f < 3; f++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.07, 8), skinMat);
            finger.position.set((ax > 0 ? 1 : -1) * 0.044 + (f - 1) * 0.018, -0.47, 0);
            finger.rotation.x = 0.3;
            centaurArmGroup.add(finger);
          }
          group.add(centaurArmGroup);
        }
        // Great axe in right hand (enhanced — larger double blade, runic engravings)
        const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 1.2, 16), woodMat);
        axeShaft.position.set(0.42, 1.25, 0.25);
        group.add(axeShaft);
        const axeCapT = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.04, 12), armorTrimMat);
        axeCapT.position.set(0.42, 1.85, 0.25);
        group.add(axeCapT);
        const axeCapB = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.04, 12), armorTrimMat);
        axeCapB.position.set(0.42, 0.65, 0.25);
        group.add(axeCapB);
        for (let gw = 0; gw < 5; gw++) {
          const grip = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.006, 8, 16), new THREE.MeshStandardMaterial({ color: 0x443322 }));
          grip.rotation.x = Math.PI / 2;
          grip.position.set(0.42, 0.78 + gw * 0.1, 0.25);
          group.add(grip);
        }
        for (const side of [-1, 1]) {
          const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.03), chainMat);
          axeBlade.position.set(0.42 + side * 0.1, 1.84, 0.25);
          group.add(axeBlade);
          const edgeCurve = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.09, 0.26, 16), chainMat);
          edgeCurve.position.set(0.42 + side * 0.19, 1.84, 0.25);
          group.add(edgeCurve);
          for (let rs = 0; rs < 3; rs++) {
            const runeBladeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.035), runeMat);
            runeBladeStrip.position.set(0.42 + side * (0.06 + rs * 0.03), 1.84 + (rs - 1) * 0.06, 0.27);
            group.add(runeBladeStrip);
          }
        }
        const axePommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), armorTrimMat);
        axePommel.position.set(0.42, 0.63, 0.25);
        group.add(axePommel);
        // War shield in left hand (round — disc + rim + boss + cross emblem)
        const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 24), shieldMat);
        shieldDisc.rotation.x = Math.PI / 2;
        shieldDisc.position.set(-0.52, 1.2, 0.25);
        group.add(shieldDisc);
        const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 24), armorMat);
        shieldRim.position.set(-0.52, 1.2, 0.25);
        group.add(shieldRim);
        const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), armorTrimMat);
        shieldBoss.position.set(-0.52, 1.2, 0.275);
        group.add(shieldBoss);
        for (let se = 0; se < 4; se++) {
          const sAng = (se / 4) * Math.PI * 2;
          const sEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.03), armorTrimMat);
          sEmblem.position.set(-0.52 + Math.sin(sAng) * 0.12, 1.2 + Math.cos(sAng) * 0.12, 0.277);
          sEmblem.rotation.z = sAng;
          group.add(sEmblem);
        }
        const shCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.03), armorTrimMat);
        shCrossH.position.set(-0.52, 1.2, 0.277);
        group.add(shCrossH);
        const shCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.32, 0.03), armorTrimMat);
        shCrossV.position.set(-0.52, 1.2, 0.277);
        group.add(shCrossV);
        // Head (strong jaw, nose cone, facial scars)
        const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), skinMat);
        cHead.position.set(0, 1.72, 0.25);
        group.add(cHead);
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.18), skinMat);
        jaw.position.set(0, 1.66, 0.26);
        group.add(jaw);
        const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 10), skinMat);
        noseCone.rotation.x = -Math.PI / 2;
        noseCone.position.set(0, 1.73, 0.405);
        group.add(noseCone);
        const faceScar1 = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.008, 0.02), new THREE.MeshStandardMaterial({ color: 0x7a4030 }));
        faceScar1.position.set(0.07, 1.74, 0.405);
        faceScar1.rotation.z = 0.4;
        group.add(faceScar1);
        const faceScar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.02), new THREE.MeshStandardMaterial({ color: 0x7a4030 }));
        faceScar2.position.set(-0.055, 1.72, 0.405);
        faceScar2.rotation.z = -0.3;
        group.add(faceScar2);
        // Eyes
        for (const ex of [-0.055, 0.055]) {
          const cEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), cEyeMat);
          cEye.position.set(ex, 1.73, 0.4);
          group.add(cEye);
        }
        // Beard (fuller — 4 cones)
        for (let bd = 0; bd < 4; bd++) {
          const beardCone = new THREE.Mesh(new THREE.ConeGeometry(0.03 + bd * 0.006, 0.1 + bd * 0.025, 12), horseDarkMat);
          beardCone.position.set((bd - 1.5) * 0.045, 1.62 - bd * 0.012, 0.36);
          beardCone.rotation.x = 0.2 + bd * 0.05;
          group.add(beardCone);
        }
        // Full helm with nose guard, cheek guards, plume
        const helmBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.175, 0.11, 16), armorMat);
        helmBase.position.set(0, 1.83, 0.25);
        group.add(helmBase);
        const helmDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), armorMat);
        helmDome.scale.set(0.95, 0.7, 0.95);
        helmDome.position.set(0, 1.88, 0.25);
        group.add(helmDome);
        const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.02), armorMat);
        noseGuard.position.set(0, 1.78, 0.39);
        group.add(noseGuard);
        for (const cx of [-0.12, 0.12]) {
          const cheekGuard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), armorMat);
          cheekGuard.position.set(cx, 1.77, 0.33);
          cheekGuard.rotation.y = cx > 0 ? -0.3 : 0.3;
          group.add(cheekGuard);
        }
        for (let pl = 0; pl < 7; pl++) {
          const plume = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08 + pl * 0.01, 0.025), new THREE.MeshStandardMaterial({ color: pl % 2 === 0 ? 0xcc2222 : 0xeeeeee }));
          plume.position.set(0, 1.97 + pl * 0.01, 0.25 - pl * 0.012 + 0.04);
          plume.rotation.x = -0.1 - pl * 0.04;
          group.add(plume);
        }
        for (let cs = 0; cs < 5; cs++) {
          const csAng = (cs / 5) * Math.PI * 2;
          const helmSpike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.09, 12), armorTrimMat);
          helmSpike.position.set(Math.sin(csAng) * 0.13, 1.93, 0.25 + Math.cos(csAng) * 0.13);
          group.add(helmSpike);
        }
        const helmTrimRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.01, 8, 24), armorTrimMat);
        helmTrimRing.position.set(0, 1.83, 0.25);
        group.add(helmTrimRing);
        // Horse legs (muscular, front greaves, fetlock tufts, metallic horseshoes)
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const centaurLegGroup = new THREE.Group();
            centaurLegGroup.name = i === 1 ? (side === -1 ? 'anim_fll' : 'anim_frl') : (side === -1 ? 'anim_bll' : 'anim_brl');
            centaurLegGroup.position.set(side * 0.25, 0.52, i * 0.82 - 0.22);
            const legThigh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), horseMat);
            legThigh.scale.set(0.85, 0.9, 0.8);
            legThigh.position.y = -0.04;
            centaurLegGroup.add(legThigh);
            const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.22, 16), horseMat);
            upperLeg.position.y = -0.11;
            centaurLegGroup.add(upperLeg);
            const legVein = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.003, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0x3a1a08, roughness: 0.9 }));
            legVein.position.set(side * 0.055, -0.1, 0.02);
            legVein.rotation.z = 0.12;
            centaurLegGroup.add(legVein);
            const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.054, 0.24, 16), horseMat);
            lowerLeg.position.y = -0.34;
            centaurLegGroup.add(lowerLeg);
            if (i === 1) {
              const greave = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.055), armorMat);
              greave.position.set(0, -0.32, 0.045);
              centaurLegGroup.add(greave);
              const greaveTrimT = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.012, 0.058), armorTrimMat);
              greaveTrimT.position.set(0, -0.24, 0.045);
              centaurLegGroup.add(greaveTrimT);
              const greaveTrimB = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.012, 0.058), armorTrimMat);
              greaveTrimB.position.set(0, -0.4, 0.045);
              centaurLegGroup.add(greaveTrimB);
            }
            const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), horseDarkMat);
            fetlock.position.y = -0.45;
            centaurLegGroup.add(fetlock);
            for (let ff = 0; ff < 5; ff++) {
              const ffAng = (ff / 5) * Math.PI * 2;
              const fetTuft = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 8), horseDarkMat);
              fetTuft.position.set(Math.sin(ffAng) * 0.038, -0.46, Math.cos(ffAng) * 0.038);
              fetTuft.rotation.set(Math.cos(ffAng) * 0.5, 0, Math.sin(ffAng) * 0.5);
              centaurLegGroup.add(fetTuft);
            }
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.045, 16), hoofMat);
            hoof.position.y = -0.525;
            centaurLegGroup.add(hoof);
            const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 16, Math.PI * 1.7), metalHoofMat);
            horseshoe.rotation.x = Math.PI / 2;
            horseshoe.position.y = -0.548;
            centaurLegGroup.add(horseshoe);
            group.add(centaurLegGroup);
          }
        }
        // Horse tail (tail wrap ribbon + 8 flowing strands)
        const centaurTailGroup = new THREE.Group();
        centaurTailGroup.name = 'anim_tail';
        centaurTailGroup.position.set(0, 0.62, -0.62);
        const tailWrap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.04), armorTrimMat);
        tailWrap.position.set(0, 0.015, 0);
        tailWrap.rotation.x = 0.3;
        centaurTailGroup.add(tailWrap);
        const centaurTailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.32, 16), horseDarkMat);
        centaurTailBase.rotation.x = 0.5;
        centaurTailGroup.add(centaurTailBase);
        for (let tt = 0; tt < 8; tt++) {
          const ttAng = (tt / 8) * Math.PI * 2;
          const tLen = 0.2 + (tt % 3) * 0.04;
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.005, tLen, 8), horseDarkMat);
          strand.position.set(Math.sin(ttAng) * 0.02, -0.19 - (tt % 3) * 0.015, -0.14 + Math.cos(ttAng) * 0.025);
          strand.rotation.x = 0.3 + tt * 0.04;
          strand.rotation.z = Math.sin(ttAng) * 0.25;
          centaurTailGroup.add(strand);
        }
        group.add(centaurTailGroup);
        break;
      }
      default: return false;
    }
    return true;
}
