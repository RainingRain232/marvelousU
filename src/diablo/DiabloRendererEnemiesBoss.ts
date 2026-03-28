import * as THREE from 'three';
import { EnemyType, EnemyBehavior } from './DiabloTypes';
import { ENEMY_DEFS } from './DiabloConfig';

/** Build enemy mesh for night bosses + default fallback. Always handles the type. */
export function createBossEnemyMesh(type: EnemyType, _scale: number, group: THREE.Group): boolean {
    switch (type) {
      // ── NIGHT BOSSES ────────────────────────────────────────────
      case EnemyType.NIGHT_FOREST_WENDIGO: {
        // --- NIGHT_FOREST_WENDIGO | Estimated polygons: ~185000 triangles ---
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 });
        const boneDarkMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const darkSkinMat = new THREE.MeshStandardMaterial({ color: 0x2a2222, roughness: 0.85 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22ff22, emissiveIntensity: 2.0 });
        const glowDimMat = new THREE.MeshStandardMaterial({ color: 0x33cc33, emissive: 0x11aa11, emissiveIntensity: 1.0 });
        const bloodMat = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x330000, emissiveIntensity: 0.3, roughness: 0.4 });
        const bloodDarkMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0x220000, emissiveIntensity: 0.2, roughness: 0.5 });
        const sinewMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.6 });
        const mossGreenMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.9 });
        const iceMat = new THREE.MeshStandardMaterial({ color: 0x88ffcc, emissive: 0x44eeaa, emissiveIntensity: 0.6, transparent: true, opacity: 0.55 });
        const darkMiasmaMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: 0x0a0a18, emissiveIntensity: 0.3, transparent: true, opacity: 0.35 });
        const peltiMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 1.0 });
        const crackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
        // Tall gaunt torso (deeply emaciated)
        const wTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.88, 0.22), darkMat);
        wTorso.position.y = 1.35;
        wTorso.castShadow = true;
        group.add(wTorso);
        // Patchy dark skin overlays for ragged appearance
        for (let sk = 0; sk < 6; sk++) {
          const skinPatch = new THREE.Mesh(new THREE.BoxGeometry(0.28 - sk * 0.02, 0.12, 0.005), darkSkinMat);
          skinPatch.position.set(sk % 2 === 0 ? 0.04 : -0.04, 1.1 + sk * 0.1, 0.115);
          skinPatch.rotation.z = sk % 2 === 0 ? 0.06 : -0.06;
          group.add(skinPatch);
        }
        // Deep hollow chest cavity recess
        const chestRecess = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
        chestRecess.position.set(0, 1.4, 0.12);
        group.add(chestRecess);
        // Emaciated belly (deeply sunken)
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), darkSkinMat);
        belly.scale.set(1, 1.15, 0.5);
        belly.position.set(0, 1.1, 0.04);
        group.add(belly);
        // Muscle sinew running across chest (thin dark red cylinders)
        for (let ms = 0; ms < 5; ms++) {
          const sinew = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.28 + ms * 0.02, 8), sinewMat);
          sinew.position.set(ms % 2 === 0 ? 0.06 : -0.06, 1.3 + ms * 0.07, 0.1);
          sinew.rotation.z = ms % 2 === 0 ? 0.7 : -0.7;
          group.add(sinew);
        }
        // Rib cage — 8 pairs, some protruding further, some cracked/broken
        for (let r = 0; r < 8; r++) {
          const isProtruding = r === 2 || r === 5;
          const isCracked = r === 3 || r === 6;
          const ribRadius = isProtruding ? 0.17 : 0.14;
          const rib = new THREE.Mesh(new THREE.TorusGeometry(ribRadius, 0.014, 16, 24, Math.PI), boneMat);
          rib.position.set(0, 0.98 + r * 0.115, 0.1);
          group.add(rib);
          const ribBack = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.09, 8), boneDarkMat);
          ribBack.position.set(0, 0.98 + r * 0.115, -0.09);
          ribBack.rotation.x = Math.PI / 2;
          group.add(ribBack);
          if (r < 7) {
            const ribSinew = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 12), sinewMat);
            ribSinew.position.set(ribRadius * 0.7, 1.04 + r * 0.115, 0.1);
            ribSinew.rotation.x = Math.PI / 2 - 0.3;
            group.add(ribSinew);
          }
          if (isCracked) {
            const crack = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.05, 0.005), crackMat);
            crack.position.set(ribRadius * 0.6, 0.98 + r * 0.115, 0.12);
            crack.rotation.z = 0.3;
            group.add(crack);
          }
        }
        // Spine — 11 vertebrae with large spinous processes forming a ridge
        for (let v = 0; v < 11; v++) {
          const vert = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.042, 0.045), boneMat);
          vert.position.set(0, 0.88 + v * 0.12, -0.12);
          group.add(vert);
          const proc = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 8), boneDarkMat);
          proc.position.set(0, 0.9 + v * 0.12, -0.17);
          proc.rotation.x = 0.35;
          group.add(proc);
          for (const side of [-1, 1]) {
            const transProc = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.035, 12), boneDarkMat);
            transProc.position.set(side * 0.04, 0.88 + v * 0.12, -0.12);
            transProc.rotation.z = Math.PI / 2;
            group.add(transProc);
          }
        }
        // Skull head (elongated deer skull with crack details)
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), boneMat);
        skull.scale.set(0.85, 1.3, 1.05);
        skull.position.y = 2.04;
        group.add(skull);
        for (let sc = 0; sc < 3; sc++) {
          const skullCrack = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.07 + sc * 0.02, 0.004), crackMat);
          skullCrack.position.set((sc - 1) * 0.06, 2.1, 0.18);
          skullCrack.rotation.z = (sc - 1) * 0.4;
          group.add(skullCrack);
        }
        // Deep hollow eye sockets
        for (const ex of [-0.07, 0.07]) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshStandardMaterial({ color: 0x080808 }));
          socket.scale.z = 0.4;
          socket.position.set(ex, 2.06, 0.16);
          group.add(socket);
        }
        // Elongated snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.22), boneMat);
        snout.position.set(0, 1.96, 0.24);
        group.add(snout);
        // Nasal cavity — two dark nostrils
        for (const nx of [-0.025, 0.025]) {
          const nasal = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
          nasal.scale.z = 0.4;
          nasal.position.set(nx, 1.94, 0.35);
          group.add(nasal);
        }
        // Upper and lower jaw
        const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.032, 0.17), boneMat);
        upperJaw.position.set(0, 1.9, 0.22);
        group.add(upperJaw);
        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.15), boneDarkMat);
        lowerJaw.position.set(0, 1.865, 0.21);
        lowerJaw.rotation.x = 0.2;
        group.add(lowerJaw);
        // 10 teeth — varied sizes, some broken
        for (let t = 0; t < 10; t++) {
          const isLarge = t === 0 || t === 9;
          const isBroken = t === 4 || t === 6;
          const toothH = isLarge ? 0.065 : isBroken ? 0.025 : 0.042;
          const toothR = isLarge ? 0.013 : 0.008;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(toothR, toothH, 8), boneMat);
          tooth.position.set((t - 4.5) * 0.022, 1.88, 0.29);
          tooth.rotation.x = 0.2;
          group.add(tooth);
        }
        // Blood stains around mouth (dense)
        for (let bs = 0; bs < 6; bs++) {
          const stain = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), bloodMat);
          stain.position.set((bs - 2.5) * 0.03, 1.86 + (bs % 2) * 0.025, 0.28);
          stain.scale.set(1.6, 0.4, 0.4);
          group.add(stain);
        }
        // Blood smears on chest
        for (let bch = 0; bch < 3; bch++) {
          const smear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), bloodDarkMat);
          smear.scale.set(2.0, 0.3, 0.3);
          smear.position.set((bch - 1) * 0.1, 1.5 - bch * 0.1, 0.12);
          smear.rotation.z = (bch - 1) * 0.5;
          group.add(smear);
        }
        // Icy breath mist cone in front of mouth
        const breathMist = new THREE.Mesh(
          new THREE.ConeGeometry(0.07, 0.28, 12),
          new THREE.MeshStandardMaterial({ color: 0xaaffee, emissive: 0x55ddcc, emissiveIntensity: 0.4, transparent: true, opacity: 0.22 })
        );
        breathMist.rotation.x = -Math.PI / 2;
        breathMist.position.set(0, 1.87, 0.52);
        group.add(breathMist);
        // Massive branching antlers — 6 branches per side, taller
        for (const ax of [-0.15, 0.15]) {
          const antlerMain = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.042, 0.65, 16), boneMat);
          antlerMain.position.set(ax * 1.05, 2.35, 0);
          antlerMain.rotation.z = ax > 0 ? -0.22 : 0.22;
          group.add(antlerMain);
          const antlerBase = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), boneDarkMat);
          antlerBase.position.set(ax, 2.08, 0);
          group.add(antlerBase);
          for (let su = 0; su < 3; su++) {
            const suture = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.03, 0.005), crackMat);
            suture.position.set(ax * (1.0 + su * 0.03), 2.1 + su * 0.01, 0.04);
            group.add(suture);
          }
          const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.28, 12), boneMat);
          branch1.position.set(ax * 1.35, 2.4, 0.09);
          branch1.rotation.z = ax > 0 ? -0.65 : 0.65;
          branch1.rotation.x = -0.3;
          group.add(branch1);
          const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.24, 12), boneDarkMat);
          branch2.position.set(ax * 1.15, 2.55, -0.07);
          branch2.rotation.z = ax > 0 ? -0.95 : 0.95;
          group.add(branch2);
          const branch3 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.22, 12), boneMat);
          branch3.position.set(ax * 0.95, 2.7, 0.05);
          branch3.rotation.z = ax > 0 ? -0.42 : 0.42;
          group.add(branch3);
          const branch4 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.014, 0.2, 10), boneMat);
          branch4.position.set(ax * 1.25, 2.62, 0.12);
          branch4.rotation.z = ax > 0 ? -0.55 : 0.55;
          branch4.rotation.x = -0.5;
          group.add(branch4);
          const branch5 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 10), boneDarkMat);
          branch5.position.set(ax * 0.8, 2.82, -0.04);
          branch5.rotation.z = ax > 0 ? -0.3 : 0.3;
          branch5.rotation.x = 0.2;
          group.add(branch5);
          const branch6 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, 0.16, 10), boneMat);
          branch6.position.set(ax * 1.45, 2.48, -0.05);
          branch6.rotation.z = ax > 0 ? -1.1 : 1.1;
          group.add(branch6);
          for (let tn = 0; tn < 4; tn++) {
            const tine = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.1 + tn * 0.02, 8), boneMat);
            tine.position.set(ax * (1.4 + tn * 0.15), 2.52 + tn * 0.1, tn * 0.04);
            tine.rotation.z = ax > 0 ? -0.5 : 0.5;
            tine.rotation.x = tn * 0.1;
            group.add(tine);
          }
          // Moss/lichen on antlers (tiny green spheres)
          for (let mo = 0; mo < 5; mo++) {
            const moss = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), mossGreenMat);
            moss.position.set(ax * (1.0 + mo * 0.1), 2.35 + mo * 0.08, mo % 2 === 0 ? 0.04 : -0.03);
            group.add(moss);
          }
          // Hanging tendons from antlers
          for (let te = 0; te < 3; te++) {
            const tendon = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.08 + te * 0.03, 12), sinewMat);
            tendon.position.set(ax * (1.2 + te * 0.12), 2.44 + te * 0.07, 0.06);
            tendon.rotation.x = 0.15;
            group.add(tendon);
          }
        }
        // Green glowing eyes — intense, deep in hollow sockets, with trails
        for (const ex of [-0.07, 0.07]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), glowDimMat);
          eyeGlow.position.set(ex, 2.06, 0.14);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), glowMat);
          eye.position.set(ex, 2.06, 0.16);
          group.add(eye);
          for (let et = 0; et < 2; et++) {
            const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.007 - et * 0.002, 0.002, 0.1 + et * 0.04, 8), glowDimMat);
            trail.position.set(ex * (1.2 + et * 0.2), 2.12 + et * 0.03, 0.1);
            trail.rotation.z = ex > 0 ? -(0.5 + et * 0.15) : 0.5 + et * 0.15;
            group.add(trail);
          }
        }
        // Tattered fur pelt hanging from one shoulder
        for (let pl = 0; pl < 4; pl++) {
          const pelt = new THREE.Mesh(new THREE.BoxGeometry(0.14 - pl * 0.02, 0.3 + pl * 0.04, 0.006), peltiMat);
          pelt.position.set(-0.22 + pl * 0.03, 1.48 - pl * 0.04, 0.08);
          pelt.rotation.z = -0.2 + pl * 0.08;
          group.add(pelt);
        }
        // Long emaciated arms
        for (const ax of [-0.35, 0.35]) {
          const wdArmGroup = new THREE.Group();
          wdArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          wdArmGroup.position.set(ax, 1.6, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.048, 0.46, 16), darkMat);
          upperArm.position.y = -0.23;
          upperArm.rotation.z = ax < 0 ? 0.15 : -0.15;
          wdArmGroup.add(upperArm);
          for (let ams = 0; ams < 2; ams++) {
            const armSinew = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.38, 12), sinewMat);
            armSinew.position.set(ax * 0.06 * (ams + 1), -0.22, 0.015);
            armSinew.rotation.z = ax < 0 ? 0.1 : -0.1;
            wdArmGroup.add(armSinew);
          }
          const elbow = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 8), boneMat);
          elbow.position.set(ax * 0.1, -0.5, -0.06);
          elbow.rotation.z = ax > 0 ? 0.5 : -0.5;
          wdArmGroup.add(elbow);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.038, 0.46, 16), darkSkinMat);
          forearm.position.set(ax * 0.2, -0.75, 0.05);
          forearm.rotation.z = ax < 0 ? 0.25 : -0.25;
          wdArmGroup.add(forearm);
          const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.055), boneMat);
          hand.position.set(ax * 0.37, -1.0, 0.08);
          wdArmGroup.add(hand);
          // 5 long curved claws — some bloodstained
          for (let c = 0; c < 5; c++) {
            const isBloody = c === 0 || c === 2 || c === 4;
            const clawMat = isBloody ? bloodDarkMat : boneMat;
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.18, 8), clawMat);
            claw.position.set(ax * 0.37 + (c - 2) * 0.02, -1.08, 0.1);
            claw.rotation.x = 0.4 + c * 0.04;
            claw.rotation.z = ax < 0 ? (c - 2) * 0.08 : -(c - 2) * 0.08;
            wdArmGroup.add(claw);
          }
          group.add(wdArmGroup);
        }
        // Digitigrade legs (bent backward at knee)
        for (const lx of [-0.12, 0.12]) {
          const wdLegGroup = new THREE.Group();
          wdLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          wdLegGroup.position.set(lx, 0.9, 0.05);
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.047, 0.36, 16), darkMat);
          thigh.position.set(0, -0.18, 0);
          thigh.rotation.x = 0.2;
          wdLegGroup.add(thigh);
          for (let lms = 0; lms < 2; lms++) {
            const legSinew = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 12), sinewMat);
            legSinew.position.set((lms - 0.5) * 0.04, -0.18, 0.02);
            legSinew.rotation.x = 0.18;
            wdLegGroup.add(legSinew);
          }
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), darkSkinMat);
          knee.position.set(0, -0.38, 0.06);
          wdLegGroup.add(knee);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.36, 16), darkSkinMat);
          shin.position.set(0, -0.58, -0.07);
          shin.rotation.x = -0.3;
          wdLegGroup.add(shin);
          const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.044, 0.11), darkMat);
          hoof.position.set(0, -0.78, -0.14);
          wdLegGroup.add(hoof);
          const hoofCrack = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.04, 0.004), crackMat);
          hoofCrack.position.set(0, -0.775, -0.1);
          wdLegGroup.add(hoofCrack);
          const split = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.044, 0.09), boneDarkMat);
          split.position.set(0, -0.78, -0.14);
          wdLegGroup.add(split);
          const dewclaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.05, 12), boneDarkMat);
          dewclaw.position.set(0, -0.75, -0.22);
          dewclaw.rotation.x = -0.6;
          wdLegGroup.add(dewclaw);
          group.add(wdLegGroup);
        }
        // Victim bone fragments near feet
        for (let bf = 0; bf < 4; bf++) {
          const boneFrag = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.06 + bf * 0.02, 12), boneDarkMat);
          boneFrag.position.set((bf - 1.5) * 0.14, 0.04, 0.15 + bf * 0.04);
          boneFrag.rotation.z = bf % 2 === 0 ? 0.6 : -0.4;
          boneFrag.rotation.x = 0.3;
          group.add(boneFrag);
        }
        // Frost particles — 12, varying sizes, creating cold aura
        for (let fp = 0; fp < 12; fp++) {
          const frostSize = 0.015 + (fp % 3) * 0.012;
          const frost = new THREE.Mesh(new THREE.OctahedronGeometry(frostSize, 2), iceMat);
          frost.position.set(fp % 2 === 0 ? 0.2 + (fp % 4) * 0.1 : -(0.2 + (fp % 4) * 0.1), 0.4 + fp * 0.18, fp % 3 === 0 ? 0.15 : -0.12);
          group.add(frost);
        }
        // Dark miasma spheres floating around body
        for (let dm = 0; dm < 5; dm++) {
          const miasmaSize = 0.06 + dm * 0.02;
          const miasma = new THREE.Mesh(new THREE.SphereGeometry(miasmaSize, 12, 8), darkMiasmaMat);
          const ang = (dm / 5) * Math.PI * 2;
          miasma.position.set(Math.sin(ang) * (0.45 + dm * 0.05), 1.0 + dm * 0.35, Math.cos(ang) * 0.35);
          group.add(miasma);
        }
        // Blood drips from jaw (multiple drips)
        for (let bd = 0; bd < 4; bd++) {
          const bloodDrip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.05 + bd * 0.015, 8), bloodMat);
          bloodDrip.position.set((bd - 1.5) * 0.03, 1.83, 0.24);
          bloodDrip.rotation.x = Math.PI;
          group.add(bloodDrip);
        }
        // Blood drips from claw tips
        for (let cd = 0; cd < 3; cd++) {
          const clawDrip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.04, 12), bloodMat);
          clawDrip.position.set(cd % 2 === 0 ? -0.38 : 0.38, 0.48 - cd * 0.05, 0.1);
          clawDrip.rotation.x = Math.PI;
          group.add(clawDrip);
        }
        break;
      }

      case EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN: {
        // --- NIGHT_ELVEN_BANSHEE_QUEEN | Estimated polygons: ~182000 triangles ---
        const ghostMat = new THREE.MeshStandardMaterial({ color: 0x6644aa, transparent: true, opacity: 0.65, roughness: 0.3 });
        const ghostDarkMat = new THREE.MeshStandardMaterial({ color: 0x442288, transparent: true, opacity: 0.5, roughness: 0.2 });
        const ghostLightMat = new THREE.MeshStandardMaterial({ color: 0x9977cc, transparent: true, opacity: 0.45, roughness: 0.15 });
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x6644ff, emissiveIntensity: 1.2 });
        const runeGlowMat = new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa44ff, emissiveIntensity: 1.5 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x8866cc, transparent: true, opacity: 0.6, roughness: 0.2 });
        const hairEnergyMat = new THREE.MeshStandardMaterial({ color: 0xccaaff, emissive: 0xaa66ff, emissiveIntensity: 1.0, transparent: true, opacity: 0.4 });
        const scepterMat = new THREE.MeshStandardMaterial({ color: 0xddccff, emissive: 0xaa88ff, emissiveIntensity: 0.8 });
        const screamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaff, emissiveIntensity: 0.6, transparent: true, opacity: 0.15 });
        const tearMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x88bbff, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 });
        const bqMistMat = new THREE.MeshStandardMaterial({ color: 0x8866cc, transparent: true, opacity: 0.18, roughness: 0.0 });
        const bqHover = new THREE.Group();
        bqHover.name = 'anim_hover';
        // Spectral ground mist disc beneath
        const groundMist = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), bqMistMat);
        groundMist.rotation.x = -Math.PI / 2;
        groundMist.position.y = 0.04;
        bqHover.add(groundMist);
        const groundMistInner = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshStandardMaterial({ color: 0xaa88ff, transparent: true, opacity: 0.1 }));
        groundMistInner.rotation.x = -Math.PI / 2;
        groundMistInner.position.y = 0.05;
        bqHover.add(groundMistInner);
        // Triple-layered flowing ghostly dress
        const bqDressOuter = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.35, 24), ghostDarkMat);
        bqDressOuter.position.y = 0.65;
        bqHover.add(bqDressOuter);
        const bqDress = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.38, 24), ghostMat);
        bqDress.position.y = 0.7;
        bqDress.castShadow = true;
        bqHover.add(bqDress);
        const bqDressInner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.42, 20), ghostLightMat);
        bqDressInner.position.y = 0.75;
        bqHover.add(bqDressInner);
        // Ethereal dress train extending behind (3 long thin planes)
        for (let tr = 0; tr < 3; tr++) {
          const train = new THREE.Mesh(new THREE.BoxGeometry(0.18 - tr * 0.04, 0.55 + tr * 0.1, 0.008), ghostDarkMat);
          train.position.set((tr - 1) * 0.12, 0.32 - tr * 0.05, -0.35 - tr * 0.08);
          train.rotation.x = 0.25 + tr * 0.05;
          bqHover.add(train);
        }
        // 14 tattered dress edges with ghostly energy at tips
        for (let e = 0; e < 14; e++) {
          const ang = (e / 14) * Math.PI * 2;
          const tatter = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.012), ghostDarkMat);
          tatter.position.set(Math.sin(ang) * 0.42, 0.14, Math.cos(ang) * 0.42);
          tatter.rotation.y = ang;
          tatter.rotation.x = 0.3 + (e % 3) * 0.1;
          bqHover.add(tatter);
          const tatterEnergy = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), runeGlowMat);
          tatterEnergy.position.set(Math.sin(ang) * 0.44, 0.02, Math.cos(ang) * 0.44);
          bqHover.add(tatterEnergy);
        }
        // Dual concentric floating rune circles at base
        const runeCircleOuter = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.014, 12, 32), runeGlowMat);
        runeCircleOuter.rotation.x = Math.PI / 2;
        runeCircleOuter.position.y = 0.1;
        bqHover.add(runeCircleOuter);
        const runeCircleInner = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.012, 10, 28), runeGlowMat);
        runeCircleInner.rotation.x = Math.PI / 2;
        runeCircleInner.rotation.y = Math.PI / 8;
        runeCircleInner.position.y = 0.1;
        bqHover.add(runeCircleInner);
        // 8 rune symbols on outer circle with connecting energy lines
        for (let rs = 0; rs < 8; rs++) {
          const ang = (rs / 8) * Math.PI * 2;
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 2), runeGlowMat);
          rune.position.set(Math.sin(ang) * 0.55, 0.1, Math.cos(ang) * 0.55);
          bqHover.add(rune);
          if (rs < 7) {
            const nextAng = ((rs + 1) / 8) * Math.PI * 2;
            const midX = (Math.sin(ang) + Math.sin(nextAng)) * 0.275;
            const midZ = (Math.cos(ang) + Math.cos(nextAng)) * 0.275;
            const energyLine = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.43, 12), runeGlowMat);
            energyLine.position.set(midX, 0.1, midZ);
            energyLine.rotation.y = ang + Math.PI / 16;
            energyLine.rotation.z = Math.PI / 2;
            bqHover.add(energyLine);
          }
        }
        // Upper torso — elegant corseted form
        const bqTorso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), ghostMat);
        bqTorso.scale.set(1, 1.12, 0.8);
        bqTorso.position.y = 1.52;
        bqHover.add(bqTorso);
        const bqWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 16), ghostDarkMat);
        bqWaist.position.y = 1.28;
        bqHover.add(bqWaist);
        // Spectral jewelry chains across chest
        for (let jc = 0; jc < 3; jc++) {
          const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.32 - jc * 0.06, 12), crownMat);
          chain.position.set(0, 1.62 - jc * 0.06, 0.14);
          chain.rotation.z = Math.PI / 2;
          bqHover.add(chain);
          const chainGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 1), new THREE.MeshStandardMaterial({ color: 0xff88ff, emissive: 0xdd44ff, emissiveIntensity: 1.5 }));
          chainGem.position.set((jc - 1) * 0.09, 1.61 - jc * 0.06, 0.16);
          bqHover.add(chainGem);
        }
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 12, 28), crownMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 1.63;
        bqHover.add(collar);
        const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 2), new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xcc00cc, emissiveIntensity: 1.5 }));
        pendant.position.set(0, 1.55, 0.17);
        bqHover.add(pendant);
        // Arms — elegant with wrist ornaments and 5 fingers each
        for (const ax of [-0.3, 0.3]) {
          const bqArmGroup = new THREE.Group();
          bqArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          bqArmGroup.position.set(ax, 1.46, 0.05);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.3, 16), ghostMat);
          upperArm.rotation.z = ax < 0 ? 0.5 : -0.5;
          bqArmGroup.add(upperArm);
          const elbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), ghostDarkMat);
          elbowSphere.position.set(ax * 0.22, -0.06, 0);
          bqArmGroup.add(elbowSphere);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.28, 14), ghostMat);
          forearm.position.set(ax * 0.5, -0.17, 0.05);
          forearm.rotation.z = ax < 0 ? 0.7 : -0.7;
          bqArmGroup.add(forearm);
          const wristRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.008, 8, 16), crownMat);
          wristRing.rotation.x = Math.PI / 2;
          wristRing.position.set(ax * 0.38, -0.12, 0.03);
          bqArmGroup.add(wristRing);
          const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.007, 8, 16), crownMat);
          bracelet.rotation.x = Math.PI / 2;
          bracelet.position.set(ax * 0.4, -0.14, 0.04);
          bqArmGroup.add(bracelet);
          for (let f = 0; f < 5; f++) {
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.09, 8), ghostMat);
            finger.position.set(ax * 0.68 + (f - 2) * 0.014, -0.33 + f * 0.008, 0.07);
            finger.rotation.x = 0.2;
            bqArmGroup.add(finger);
            const fingerEnergy = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), runeGlowMat);
            fingerEnergy.position.set(ax * 0.68 + (f - 2) * 0.014, -0.42 + f * 0.008, 0.08);
            bqArmGroup.add(fingerEnergy);
          }
          bqHover.add(bqArmGroup);
        }
        // Right arm holds a spectral scepter with crystal octahedron
        {
          const raGroup = bqHover.getObjectByName('anim_ra') as THREE.Group;
          const scepterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.55, 10), scepterMat);
          scepterShaft.position.set(0.55, -0.65, 0.08);
          scepterShaft.rotation.z = 0.35;
          raGroup.add(scepterShaft);
          const scepterCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 2), new THREE.MeshStandardMaterial({ color: 0xff88ff, emissive: 0xff44ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.85 }));
          scepterCrystal.position.set(0.72, -0.32, 0.12);
          raGroup.add(scepterCrystal);
          const scepterAura = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xdd22ff, emissiveIntensity: 1.5, transparent: true, opacity: 0.25 }));
          scepterAura.position.set(0.72, -0.32, 0.12);
          raGroup.add(scepterAura);
        }
        // Left arm channels energy orb
        {
          const laGroup = bqHover.getObjectByName('anim_la') as THREE.Group;
          const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa44ff, emissiveIntensity: 2.0, transparent: true, opacity: 0.8 }));
          orbCore.position.set(-0.7, -0.42, 0.1);
          laGroup.add(orbCore);
          const orbAura = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ color: 0x9933ff, emissive: 0x7722cc, emissiveIntensity: 1.0, transparent: true, opacity: 0.2 }));
          orbAura.position.set(-0.7, -0.42, 0.1);
          laGroup.add(orbAura);
        }
        // Head — elven features with nose and cheekbones
        const bqHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), ghostMat);
        bqHead.scale.set(1, 1.08, 0.97);
        bqHead.position.y = 1.89;
        bqHover.add(bqHead);
        const bqNose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 8), ghostMat);
        bqNose.rotation.x = Math.PI / 2;
        bqNose.position.set(0, 1.87, 0.167);
        bqHover.add(bqNose);
        for (const cx of [-0.08, 0.08]) {
          const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 7), ghostLightMat);
          cheek.position.set(cx, 1.875, 0.13);
          bqHover.add(cheek);
        }
        // Larger pointed elven ears with ornaments
        for (const ex of [-0.155, 0.155]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.13, 8), ghostMat);
          ear.position.set(ex, 1.92, 0.02);
          ear.rotation.z = ex > 0 ? -0.75 : 0.75;
          bqHover.add(ear);
          const earGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 1), crownMat);
          earGem.position.set(ex * 1.08, 1.96, 0.01);
          bqHover.add(earGem);
        }
        // Spectral tears trailing from eyes
        for (const ex of [-0.055, 0.055]) {
          for (let te = 0; te < 2; te++) {
            const tear = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), tearMat);
            tear.scale.set(0.5, 1.5, 0.5);
            tear.position.set(ex, 1.84 - te * 0.04, 0.155);
            bqHover.add(tear);
          }
        }
        // Spectral hair — 14 strands flowing outward defying gravity
        for (let h = 0; h < 14; h++) {
          const strandLen = 0.32 + h * 0.03;
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, strandLen, 8), hairMat);
          const ang = (h / 14) * Math.PI * 1.8 + Math.PI * 0.1;
          strand.position.set(Math.sin(ang) * 0.13, 1.74 - h * 0.015, -0.04 + Math.cos(ang) * 0.09);
          strand.rotation.x = -0.4 + Math.sin(h) * 0.15;
          strand.rotation.z = Math.cos(h * 0.8) * 0.3;
          bqHover.add(strand);
          if (h % 3 === 0) {
            const strandEnergy = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), hairEnergyMat);
            strandEnergy.position.set(Math.sin(ang) * (0.14 + strandLen * 0.3), 1.78 + strandLen * 0.4 - h * 0.015, -0.04 + Math.cos(ang) * 0.12);
            bqHover.add(strandEnergy);
          }
        }
        // Ornate crown — filigree band, 7 spikes, gems between spikes
        const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.022, 12, 32), crownMat);
        crownBase.rotation.x = Math.PI / 2;
        crownBase.position.y = 1.995;
        bqHover.add(crownBase);
        for (let fi = 0; fi < 8; fi++) {
          const fiAng = (fi / 8) * Math.PI * 2;
          const filigree = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 12), crownMat);
          filigree.position.set(Math.sin(fiAng) * 0.13, 2.0, Math.cos(fiAng) * 0.13);
          filigree.rotation.x = 0.4;
          filigree.rotation.y = fiAng;
          bqHover.add(filigree);
        }
        for (let i = 0; i < 7; i++) {
          const spikeH = 0.12 + (i === 3 ? 0.1 : 0) + (i === 1 || i === 5 ? 0.04 : 0);
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.014, spikeH, 10), crownMat);
          const ang = (i / 7) * Math.PI * 2;
          spike.position.set(Math.sin(ang) * 0.145, 2.07 + spikeH * 0.35, Math.cos(ang) * 0.145);
          bqHover.add(spike);
          if (i < 6) {
            const gemAng = ang + Math.PI / 7;
            const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.016, 1), new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xdd22ff, emissiveIntensity: 2.0 }));
            gem.position.set(Math.sin(gemAng) * 0.145, 2.04, Math.cos(gemAng) * 0.145);
            bqHover.add(gem);
          }
        }
        const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 2), new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff22ff, emissiveIntensity: 2.5 }));
        centerGem.position.set(0, 2.02, 0.155);
        bqHover.add(centerGem);
        // Glowing eyes (intense magenta)
        const bqEyeMat = new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xff00ff, emissiveIntensity: 2.0 });
        for (const ex of [-0.055, 0.055]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), new THREE.MeshStandardMaterial({ color: 0xcc44cc, emissive: 0xaa22aa, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 }));
          eyeGlow.position.set(ex, 1.895, 0.12);
          bqHover.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), bqEyeMat);
          eye.position.set(ex, 1.895, 0.142);
          bqHover.add(eye);
        }
        // Mouth open in perpetual scream
        const bqMouth = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 12), new THREE.MeshStandardMaterial({ color: 0x220033, emissive: 0x110022, emissiveIntensity: 0.5 }));
        bqMouth.scale.set(1.3, 0.6, 0.6);
        bqMouth.position.set(0, 1.818, 0.148);
        bqHover.add(bqMouth);
        // Banshee Scream — expanding semi-transparent cone (sonic wave)
        const screamCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 16), screamMat);
        screamCone.rotation.x = -Math.PI / 2;
        screamCone.position.set(0, 1.818, 0.44);
        bqHover.add(screamCone);
        const screamRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 18), new THREE.MeshStandardMaterial({ color: 0xccccff, emissive: 0x8888ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.25 }));
        screamRing.rotation.x = Math.PI / 2;
        screamRing.position.set(0, 1.818, 0.62);
        bqHover.add(screamRing);
        // 10 orbiting soul wisps — some with anguished faces
        for (let sw = 0; sw < 10; sw++) {
          const ang = (sw / 10) * Math.PI * 2;
          const wispSize = 0.02 + (sw % 3) * 0.008;
          const wisp = new THREE.Mesh(
            new THREE.SphereGeometry(wispSize, 12, 8),
            new THREE.MeshStandardMaterial({ color: 0xaa88ff, emissive: 0x6644cc, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 })
          );
          wisp.position.set(Math.sin(ang) * (0.52 + (sw % 3) * 0.06), 0.75 + sw * 0.2, Math.cos(ang) * (0.52 + (sw % 3) * 0.06));
          bqHover.add(wisp);
          const wispTrail = new THREE.Mesh(new THREE.CylinderGeometry(wispSize * 0.5, 0.002, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0x9977cc, emissive: 0x6644aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.3 }));
          wispTrail.position.set(Math.sin(ang) * (0.52 + (sw % 3) * 0.06), 0.71 + sw * 0.2, Math.cos(ang) * (0.52 + (sw % 3) * 0.06));
          bqHover.add(wispTrail);
          if (sw % 3 === 0) {
            for (const fe of [-0.01, 0.01]) {
              const faceEye = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 10), new THREE.MeshStandardMaterial({ color: 0x000000 }));
              faceEye.position.set(Math.sin(ang) * (0.52 + (sw % 3) * 0.06) + fe, 0.755 + sw * 0.2, Math.cos(ang) * (0.52 + (sw % 3) * 0.06) + 0.02);
              bqHover.add(faceEye);
            }
          }
        }
        // Enhanced ghostly veil — larger, multiple layers
        for (let vl = 0; vl < 3; vl++) {
          const veilW = 0.32 + vl * 0.08;
          const veilH = 0.38 + vl * 0.06;
          const veil = new THREE.Mesh(
            new THREE.BoxGeometry(veilW, veilH, 0.006),
            new THREE.MeshStandardMaterial({ color: 0xaabbff, transparent: true, opacity: 0.1 - vl * 0.025 })
          );
          veil.position.set((vl - 1) * 0.04, 1.86, -0.13 - vl * 0.02);
          veil.rotation.y = (vl - 1) * 0.06;
          bqHover.add(veil);
        }
        // Spectral butterflies/moths
        for (let bt = 0; bt < 3; bt++) {
          const bAng = (bt / 3) * Math.PI * 2 + Math.PI / 4;
          const bwMat = new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0x9944ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.35 });
          const bWing1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055, 0.004), bwMat);
          bWing1.position.set(Math.sin(bAng) * 0.38 - 0.03, 1.35 + bt * 0.32, Math.cos(bAng) * 0.3);
          bWing1.rotation.y = bAng;
          bWing1.rotation.z = 0.25;
          bqHover.add(bWing1);
          const bWing2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055, 0.004), bwMat);
          bWing2.position.set(Math.sin(bAng) * 0.38 + 0.03, 1.35 + bt * 0.32, Math.cos(bAng) * 0.3);
          bWing2.rotation.y = bAng;
          bWing2.rotation.z = -0.25;
          bqHover.add(bWing2);
        }
        group.add(bqHover);
        break;
      }

      case EnemyType.NIGHT_NECRO_DEATH_KNIGHT: {
        // --- NIGHT_NECRO_DEATH_KNIGHT | Estimated polygons: ~120000 triangles ---
        const dkArmorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.8, roughness: 0.3 });
        const dkArmorDarkMat = new THREE.MeshStandardMaterial({ color: 0x0e0e1a, metalness: 0.9, roughness: 0.2 });
        const dkGlowMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 1.5 });
        const dkGlowDimMat = new THREE.MeshStandardMaterial({ color: 0x33cc88, emissive: 0x11aa66, emissiveIntensity: 0.8 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.6 });
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 });
        const chainMailEdgeMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.85 });
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, transparent: true, opacity: 0.82, roughness: 0.9, side: THREE.DoubleSide });
        const capeGlowEdgeMat = new THREE.MeshStandardMaterial({ color: 0x22ff88, emissive: 0x11cc44, emissiveIntensity: 1.0, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const runeCircleMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 1.8, transparent: true, opacity: 0.7 });
        const soulGemMat = new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x33ff33, emissiveIntensity: 1.0 });
        const necroFlameMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 2.0, transparent: true, opacity: 0.55 });
        const trophyBoneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.65 });
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x0e0e1a, metalness: 0.85, roughness: 0.25 });
        const shieldTrimMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 0.9 });
        const featherMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1.0 });

        // === TORSO (layered armor) ===
        const dkTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), dkArmorMat);
        dkTorso.position.y = 1.22;
        dkTorso.castShadow = true;
        group.add(dkTorso);
        // Inner chainmail visible at edges
        const chainMailLayer = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.77, 0.30), chainMailEdgeMat);
        chainMailLayer.position.y = 1.22;
        group.add(chainMailLayer);
        // Ab section articulated plates (3 horizontal strips)
        for (let ab = 0; ab < 3; ab++) {
          const abPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.04), dkArmorDarkMat);
          abPlate.position.set(0, 0.97 + ab * 0.1, 0.17);
          group.add(abPlate);
        }
        // Chest plate with skull emblem + rune circle
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.04), dkArmorDarkMat);
        chestPlate.position.set(0, 1.32, 0.18);
        group.add(chestPlate);
        // Skull emblem
        const emblemSkull = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), boneMat);
        emblemSkull.scale.set(1, 1.2, 0.5);
        emblemSkull.position.set(0, 1.42, 0.22);
        group.add(emblemSkull);
        for (const ex of [-0.025, 0.025]) {
          const embEye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), dkGlowMat);
          embEye.position.set(ex, 1.435, 0.245);
          group.add(embEye);
        }
        // Rune circle torus around skull emblem
        const emblemRune = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 8, 24), runeCircleMat);
        emblemRune.position.set(0, 1.42, 0.225);
        group.add(emblemRune);

        // === GORGET (neck armor enhanced with rune engravings) ===
        const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 24), dkArmorMat);
        gorget.position.y = 1.67;
        group.add(gorget);
        // Rune engravings on gorget (thin emissive lines)
        for (let gr = 0; gr < 4; gr++) {
          const grAngle = (gr / 4) * Math.PI * 2;
          const gorgetRune = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.06, 0.016), dkGlowDimMat);
          gorgetRune.position.set(Math.sin(grAngle) * 0.21, 1.67, Math.cos(grAngle) * 0.21);
          gorgetRune.rotation.y = grAngle;
          group.add(gorgetRune);
        }

        // === TASSETS: 6 overlapping waist plates ===
        for (let t = 0; t < 6; t++) {
          const ang = (t / 6) * Math.PI * 2 - Math.PI / 6;
          const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.035), dkArmorMat);
          tasset.position.set(Math.sin(ang) * 0.24, 0.76, Math.cos(ang) * 0.13);
          tasset.rotation.y = ang;
          group.add(tasset);
          // Chain link between tassets
          const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 12, 10), chainMat);
          chainLink.position.set(Math.sin(ang + 0.52) * 0.22, 0.82, Math.cos(ang + 0.52) * 0.12);
          chainLink.rotation.y = ang;
          group.add(chainLink);
        }
        // Chain mail skirt
        const chainSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.14, 24), chainMat);
        chainSkirt.position.y = 0.82;
        group.add(chainSkirt);

        // === PAULDRONS (dramatically enhanced, 3 spikes each) ===
        for (const sx of [-0.38, 0.38]) {
          // Pauldron base (large)
          const padBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.26), dkArmorMat);
          padBase.position.set(sx, 1.68, 0);
          group.add(padBase);
          const padTop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), dkArmorDarkMat);
          padTop.scale.set(1.4, 0.65, 1.1);
          padTop.position.set(sx, 1.74, 0);
          group.add(padTop);
          // 3 spikes per pauldron
          for (let sp = 0; sp < 3; sp++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.14, 10), dkArmorMat);
            spike.position.set(sx * 1.18, 1.78 + sp * 0.045, (sp - 1) * 0.08);
            spike.rotation.z = sx > 0 ? -0.55 : 0.55;
            group.add(spike);
          }
          // Skull mounted on one pauldron (left side)
          if (sx < 0) {
            const padSkull = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), boneMat);
            padSkull.position.set(sx * 0.75, 1.78, 0.15);
            group.add(padSkull);
            for (const pex of [-0.02, 0.02]) {
              const pskEye = new THREE.Mesh(new THREE.SphereGeometry(0.01, 16, 12), dkGlowMat);
              pskEye.position.set(sx * 0.75 + pex, 1.785, 0.19);
              group.add(pskEye);
            }
          }
          // Multiple glow rune strips on pauldron surface
          for (let pr = 0; pr < 3; pr++) {
            const padRune = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.014), dkGlowMat);
            padRune.position.set(sx * 0.88, 1.65 + pr * 0.06, 0.12);
            group.add(padRune);
          }
        }

        // === CAPE (3 layered tattered planes behind) ===
        for (let cl = 0; cl < 4; cl++) {
          const capeLayer = new THREE.Mesh(new THREE.BoxGeometry(0.42 - cl * 0.05, 0.72 + cl * 0.06, 0.007), capeMat);
          capeLayer.position.set((cl - 1.5) * 0.03, 1.0 - cl * 0.02, -0.18 - cl * 0.012);
          capeLayer.rotation.z = (cl - 1.5) * 0.04;
          group.add(capeLayer);
          // Glowing green edge on cape
          const capeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.42 - cl * 0.05, 0.012, 0.007), capeGlowEdgeMat);
          capeEdge.position.set((cl - 1.5) * 0.03, 0.63 - cl * 0.02, -0.18 - cl * 0.012);
          group.add(capeEdge);
        }

        // === HELMET (full great helm, enhanced) ===
        const dkHelm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 24), dkArmorMat);
        dkHelm.position.y = 1.85;
        group.add(dkHelm);
        const helmTop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), dkArmorDarkMat);
        helmTop.scale.y = 0.52;
        helmTop.position.y = 1.99;
        group.add(helmTop);
        // Nose guard
        const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.025), dkArmorMat);
        noseGuard.position.set(0, 1.84, 0.22);
        group.add(noseGuard);
        // Visor slit with glow + glow trail planes
        const dkVisor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.022), dkGlowMat);
        dkVisor.position.set(0, 1.88, 0.22);
        group.add(dkVisor);
        // Visor glow trail planes extending outward
        for (const vx of [-1, 1]) {
          const visorTrail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 2.0, transparent: true, opacity: 0.55 }));
          visorTrail.position.set(vx * 0.14, 1.88, 0.24);
          group.add(visorTrail);
        }
        // Ventail (air holes pattern)
        for (let bh = 0; bh < 3; bh++) {
          for (let bv = 0; bv < 2; bv++) {
            const ventHole = new THREE.Mesh(new THREE.CircleGeometry(0.008, 8), dkGlowDimMat);
            ventHole.position.set(-0.03 + bh * 0.03, 1.79 - bv * 0.025, 0.222);
            group.add(ventHole);
          }
        }
        // Helm crest with plume feathers
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.18), dkArmorMat);
        crest.position.set(0, 2.04, 0);
        group.add(crest);
        // Dark feathers from crest (3-4 thin boxes)
        for (let pf = 0; pf < 4; pf++) {
          const feather = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.18 - pf * 0.02, 0.008), featherMat);
          feather.position.set((pf - 1.5) * 0.025, 2.16 + pf * 0.015, -0.02);
          feather.rotation.z = (pf - 1.5) * 0.12;
          group.add(feather);
        }
        // Necromantic flame rising from helm (cone shapes)
        for (let nf = 0; nf < 3; nf++) {
          const helmFlame = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 12), necroFlameMat);
          helmFlame.position.set((nf - 1) * 0.04, 2.12, 0.04);
          helmFlame.rotation.z = (nf - 1) * 0.2;
          group.add(helmFlame);
        }

        // === ARMS (anim_la, anim_ra) - full articulated ===
        for (const ax of [-0.38, 0.38]) {
          const dkArmGroup = new THREE.Group();
          dkArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          dkArmGroup.position.set(ax, 1.6, 0);
          // Upper arm cylinder + vambrace detail
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.3, 16), dkArmorMat);
          upperArm.position.y = -0.15;
          upperArm.rotation.z = ax < 0 ? 0.15 : -0.15;
          dkArmGroup.add(upperArm);
          // Elbow cop (rerebrace)
          const elbowCop = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), dkArmorDarkMat);
          elbowCop.position.set(ax * 0.06, -0.34, 0);
          dkArmGroup.add(elbowCop);
          // Elbow spike
          const elbowSpike = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.1, 8), dkArmorMat);
          elbowSpike.position.set(ax * 0.06, -0.3, -0.07);
          elbowSpike.rotation.x = 0.5;
          dkArmGroup.add(elbowSpike);
          // Forearm + vambrace
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.27, 16), dkArmorMat);
          forearm.position.set(ax * 0.11, -0.52, 0);
          dkArmGroup.add(forearm);
          // Gauntlet with articulated finger plates
          const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.08), dkArmorDarkMat);
          gauntlet.position.set(ax * 0.16, -0.68, 0);
          dkArmGroup.add(gauntlet);
          // 4 finger plate segments
          for (let fp = 0; fp < 4; fp++) {
            const fingerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.04, 0.06), dkArmorDarkMat);
            fingerPlate.position.set(ax * 0.17 + (fp - 1.5) * 0.018, -0.73, 0.02);
            dkArmGroup.add(fingerPlate);
          }
          group.add(dkArmGroup);
        }

        // === RIGHT ARM: Enhanced Greatsword ===
        {
          const dkRaGroup = group.getObjectByName('anim_ra') as THREE.Group;
          // Hilt (wrapped grip)
          const gsHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.7 }));
          gsHilt.position.set(0.12, -1.08, 0);
          dkRaGroup.add(gsHilt);
          // Crossguard with skull motif
          const gsGuard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.045), dkArmorMat);
          gsGuard.position.set(0.12, -0.96, 0);
          dkRaGroup.add(gsGuard);
          // Skull on crossguard
          const guardSkull = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), boneMat);
          guardSkull.scale.set(1, 1.1, 0.7);
          guardSkull.position.set(0.12, -0.96, 0.04);
          dkRaGroup.add(guardSkull);
          // Blade with blood groove
          const gsBlade = new THREE.Mesh(new THREE.BoxGeometry(0.058, 1.2, 0.019), dkArmorDarkMat);
          gsBlade.position.set(0.12, -0.34, 0);
          dkRaGroup.add(gsBlade);
          // Blood groove (recessed strip)
          const bloodGroove = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.0, 0.021), new THREE.MeshStandardMaterial({ color: 0x080810, metalness: 0.95, roughness: 0.15 }));
          bloodGroove.position.set(0.12, -0.34, 0);
          dkRaGroup.add(bloodGroove);
          // Blade rune glow lines (6 lines)
          for (let rl = 0; rl < 6; rl++) {
            const runeLine = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.055, 0.022), dkGlowMat);
            runeLine.position.set(0.12, -0.82 + rl * 0.2, 0.011);
            dkRaGroup.add(runeLine);
          }
          // Rune pattern cross-lines
          for (let rc = 0; rc < 3; rc++) {
            const runeCross = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.012, 0.022), dkGlowDimMat);
            runeCross.position.set(0.12, -0.72 + rc * 0.3, 0.011);
            dkRaGroup.add(runeCross);
          }
          // Blade tip
          const gsTip = new THREE.Mesh(new THREE.ConeGeometry(0.029, 0.095, 8), dkArmorDarkMat);
          gsTip.position.set(0.12, 0.3, 0);
          dkRaGroup.add(gsTip);
          // Pommel gem (emissive octahedron)
          const gsPommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 2.5 }));
          gsPommel.position.set(0.12, -1.21, 0);
          dkRaGroup.add(gsPommel);
        }

        // === LEFT ARM: Kite Shield ===
        {
          const dkLaGroup = group.getObjectByName('anim_la') as THREE.Group;
          // Kite shield (elongated box)
          const shield = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.52, 0.04), shieldMat);
          shield.position.set(-0.22, -0.45, 0.1);
          dkLaGroup.add(shield);
          // Shield rim trim
          const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.54, 0.02), shieldTrimMat);
          shieldRim.position.set(-0.22, -0.45, 0.08);
          dkLaGroup.add(shieldRim);
          // Skull heraldry on shield
          const shieldSkull = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 10), boneMat);
          shieldSkull.scale.set(1, 1.2, 0.45);
          shieldSkull.position.set(-0.22, -0.38, 0.13);
          dkLaGroup.add(shieldSkull);
          for (const sex of [-0.018, 0.018]) {
            const shSkEye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), dkGlowMat);
            shSkEye.position.set(-0.22 + sex, -0.37, 0.155);
            dkLaGroup.add(shSkEye);
          }
          // Green glow trim lines on shield
          for (let sl = 0; sl < 3; sl++) {
            const shieldGlow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.014, 0.022), capeGlowEdgeMat);
            shieldGlow.position.set(-0.22, -0.6 + sl * 0.1, 0.125);
            dkLaGroup.add(shieldGlow);
          }
        }

        // === LEGS enhanced (anim_ll, anim_rl) ===
        for (const lx of [-0.14, 0.14]) {
          const dkLegGroup = new THREE.Group();
          dkLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          dkLegGroup.position.set(lx, 0.77, 0);
          // Cuisses (thigh armor)
          const cuisses = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.32, 16), dkArmorMat);
          cuisses.position.y = -0.16;
          dkLegGroup.add(cuisses);
          // Chainmail visible between plates
          const thighChain = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.075, 0.1, 14), chainMat);
          thighChain.position.y = -0.31;
          dkLegGroup.add(thighChain);
          // Poleyn (knee cop)
          const kneeCop = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), dkArmorDarkMat);
          kneeCop.position.set(0, -0.36, 0.04);
          dkLegGroup.add(kneeCop);
          // Knee spike
          const kneeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.09, 8), dkArmorMat);
          kneeSpike.position.set(0, -0.32, 0.1);
          kneeSpike.rotation.x = -0.4;
          dkLegGroup.add(kneeSpike);
          // Greaves (shin armor)
          const greaves = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.084, 0.3, 16), dkArmorMat);
          greaves.position.y = -0.52;
          dkLegGroup.add(greaves);
          // Chainmail at ankle
          const ankleChain = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.06, 14), chainMat);
          ankleChain.position.y = -0.67;
          dkLegGroup.add(ankleChain);
          // Sabaton (foot armor, pointed toe)
          const sabaton = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.16), dkArmorDarkMat);
          sabaton.position.set(0, -0.72, 0.03);
          dkLegGroup.add(sabaton);
          // Pointed toe extension
          const sabatonToe = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 12), dkArmorDarkMat);
          sabatonToe.rotation.x = -Math.PI / 2;
          sabatonToe.position.set(0, -0.72, 0.11);
          dkLegGroup.add(sabatonToe);
          group.add(dkLegGroup);
        }

        // === AURA WISPS (10 necromantic wisps) ===
        for (let aw = 0; aw < 10; aw++) {
          const wispRadius = aw < 6 ? 0.6 : 0.35;
          const wispY = aw < 6 ? 0.7 + aw * 0.25 : 1.8 + (aw - 6) * 0.2;
          const wispAngle = (aw / 10) * Math.PI * 2;
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.028 + (aw % 3) * 0.008, 16, 12), new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22cc88, emissiveIntensity: 1.2, transparent: true, opacity: 0.45 }));
          wisp.position.set(Math.sin(wispAngle) * wispRadius, wispY, Math.cos(wispAngle) * wispRadius * 0.75);
          group.add(wisp);
        }

        // === SOUL GEMS (5 embedded in armor) ===
        const soulGemPositions: [number, number, number][] = [
          [-0.06, 1.42, 0.265], [0.06, 1.42, 0.265],
          [0, 1.6, 0.24], [-0.28, 1.3, 0.18], [0.28, 1.3, 0.18],
        ];
        for (const [gx, gy, gz] of soulGemPositions) {
          const soulGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), soulGemMat);
          soulGem.position.set(gx, gy, gz);
          group.add(soulGem);
        }

        // === UNHOLY GROUND EFFECT: runic circle torus ===
        const runicCircle = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.022, 8, 32), runeCircleMat);
        runicCircle.rotation.x = -Math.PI / 2;
        runicCircle.position.y = 0.02;
        group.add(runicCircle);
        // 4 rune markers at cardinal points
        const cardinalAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        for (const ca of cardinalAngles) {
          const runeMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.04), dkGlowMat);
          runeMarker.position.set(Math.sin(ca) * 0.7, 0.04, Math.cos(ca) * 0.7);
          group.add(runeMarker);
        }

        // === HANGING TROPHIES from belt (3 small skulls) ===
        const trophyOffsets: [number, number, number][] = [
          [-0.12, 0.7, 0.12], [0, 0.68, 0.15], [0.12, 0.7, 0.12],
        ];
        for (const [tx, ty, tz] of trophyOffsets) {
          const trophySkull = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), trophyBoneMat);
          trophySkull.position.set(tx, ty, tz);
          group.add(trophySkull);
          // Hanging string
          const trophyString = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 }));
          trophyString.position.set(tx, ty + 0.06, tz);
          group.add(trophyString);
        }

        // === NECROMANTIC FLAME from joints (cone shapes) ===
        const flameJointOffsets: [number, number, number][] = [
          [-0.38, 1.7, 0.05], [0.38, 1.7, 0.05], [0, 1.87, 0.18],
        ];
        for (const [fx, fy, fz] of flameJointOffsets) {
          for (let fl = 0; fl < 3; fl++) {
            const jFlame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08 - fl * 0.015, 10), necroFlameMat);
            jFlame.position.set(fx + (fl - 1) * 0.025, fy + 0.04 + fl * 0.04, fz);
            jFlame.rotation.z = (fl - 1) * 0.3;
            group.add(jFlame);
          }
        }
        break;
      }

      case EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN: {
        // --- NIGHT_VOLCANIC_INFERNO_TITAN | Estimated polygons: ~284000 triangles ---
        const titanRock = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 });
        const titanRockLight = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
        const titanRockDark = new THREE.MeshStandardMaterial({ color: 0x1a0e0e, roughness: 0.95 });
        const titanLava = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2 });
        const titanLavaBright = new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff6600, emissiveIntensity: 2.0 });
        const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
        const ashMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1.0, transparent: true, opacity: 0.65 });
        const smokeMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.18 });
        const lavaCrystalMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff1100, emissiveIntensity: 1.8 });
        const eruption = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0, transparent: true, opacity: 0.3 });
        // Massive torso (layered volcanic rock — 7 overlapping craggy plates)
        const ttTorso = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.42, 0.78), titanRock);
        ttTorso.position.y = 1.85;
        ttTorso.castShadow = true;
        group.add(ttTorso);
        for (let rp = 0; rp < 7; rp++) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.95 - rp * 0.08, 0.14, 0.82 - rp * 0.06), rp % 2 === 0 ? titanRockLight : titanRockDark);
          plate.position.set((rp % 3 - 1) * 0.04, 1.28 + rp * 0.3, 0);
          plate.rotation.y = rp * 0.09;
          plate.rotation.z = (rp % 2 === 0 ? 0.02 : -0.02);
          group.add(plate);
        }
        // 22 lava veins running through body
        for (let lv = 0; lv < 22; lv++) {
          const veinLen = 0.25 + (lv % 5) * 0.12;
          const vein = new THREE.Mesh(new THREE.BoxGeometry(0.022, veinLen, 0.022), lv % 4 === 0 ? titanLavaBright : titanLava);
          vein.position.set((lv % 7 - 3) * 0.13, 1.15 + (lv % 5) * 0.28, (lv % 3 - 1) * 0.25);
          vein.rotation.z = (lv % 3 - 1) * 0.4;
          vein.rotation.x = (lv % 2 === 0 ? 0.1 : -0.1);
          group.add(vein);
        }
        // Larger magma core crack + glow
        const coreCrack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.045), titanLavaBright);
        coreCrack.position.set(0, 1.9, 0.4);
        group.add(coreCrack);
        const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), magmaMat);
        coreGlow.position.set(0, 1.9, 0.37);
        group.add(coreGlow);
        const coreAura = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.4, transparent: true, opacity: 0.18 }));
        coreAura.position.set(0, 1.9, 0.35);
        group.add(coreAura);
        // Head — craggy boulder with brow ridges, rocky jaw, volcanic horn crown
        const ttHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 3), titanRock);
        ttHead.position.y = 2.98;
        group.add(ttHead);
        // Brow ridge (two heavy rock ledges)
        for (const bx of [-0.18, 0.18]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14), titanRockLight);
          brow.position.set(bx, 3.18, 0.32);
          brow.rotation.z = bx > 0 ? -0.15 : 0.15;
          group.add(brow);
        }
        // Rocky jaw with lava drool
        const rockJaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.3), titanRockDark);
        rockJaw.position.set(0, 2.72, 0.28);
        group.add(rockJaw);
        // Lava drool from jaw
        for (let ld = 0; ld < 3; ld++) {
          const drool = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, 0.18 + ld * 0.06, 8), titanLava);
          drool.position.set((ld - 1) * 0.1, 2.58 - ld * 0.04, 0.42);
          group.add(drool);
        }
        // Crown of volcanic horns — 5 rock cones with lava-tipped peaks
        for (let vh = 0; vh < 5; vh++) {
          const hAng = (vh / 5) * Math.PI * 2;
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07 - vh * 0.006, 0.28 + (vh === 0 ? 0.1 : 0), 8), titanRockLight);
          horn.position.set(Math.sin(hAng) * 0.32, 3.22, Math.cos(hAng) * 0.22);
          group.add(horn);
          const hornLavaTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 7), titanLavaBright);
          hornLavaTip.position.set(Math.sin(hAng) * 0.32, 3.5 + (vh === 0 ? 0.1 : 0), Math.cos(hAng) * 0.22);
          group.add(hornLavaTip);
        }
        // Lava eyes — larger, with fire trails behind
        for (const ex of [-0.16, 0.16]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          eyeSocket.position.set(ex, 3.02, 0.37);
          eyeSocket.scale.z = 0.5;
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 24), titanLavaBright);
          eye.position.set(ex, 3.02, 0.4);
          group.add(eye);
          // Fire trail behind eye (thin emissive cone)
          const eyeTrail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 1.5, transparent: true, opacity: 0.45 }));
          eyeTrail.rotation.z = ex > 0 ? -Math.PI / 2 : Math.PI / 2;
          eyeTrail.position.set(ex * 1.5, 3.02, 0.35);
          group.add(eyeTrail);
        }
        // Mouth lava glow
        const lmouthBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.065), titanLavaBright);
        lmouthBox.position.set(0, 2.86, 0.42);
        group.add(lmouthBox);
        // 6 volcanic vents on head and shoulders — each with ember column + smoke cone
        const ventPositions: [number, number, number][] = [
          [0.28, 3.26, 0.14], [-0.26, 3.24, 0.1], [0, 3.38, -0.12],
          [0.65, 2.62, 0.18], [-0.62, 2.6, 0.16], [0.1, 3.1, 0.28],
        ];
        for (const [vx, vy, vz] of ventPositions) {
          const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.09, 10), titanRockLight);
          vent.position.set(vx, vy, vz);
          group.add(vent);
          // Stack of embers above vent
          for (let ve = 0; ve < 3; ve++) {
            const ventEmber = new THREE.Mesh(new THREE.SphereGeometry(0.025 - ve * 0.006, 16, 12), magmaMat);
            ventEmber.position.set(vx, vy + 0.1 + ve * 0.065, vz);
            group.add(ventEmber);
          }
          // Transparent smoke cone above vent
          const smokeCone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), smokeMat);
          smokeCone.position.set(vx, vy + 0.3, vz);
          group.add(smokeCone);
        }
        // Larger shoulder boulders with 3 lava torus seams + volcanic crystals
        for (const sx of [-0.72, 0.72]) {
          const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 3), titanRock);
          boulder.position.set(sx, 2.58, 0);
          group.add(boulder);
          for (let sm = 0; sm < 3; sm++) {
            const seam = new THREE.Mesh(new THREE.TorusGeometry(0.22 + sm * 0.04, 0.018, 8, 20), titanLava);
            seam.position.set(sx, 2.58, 0);
            seam.rotation.set(sm * 0.55, sm * 0.4, 0);
            group.add(seam);
          }
          // Volcanic crystals growing from boulders
          for (let vc = 0; vc < 4; vc++) {
            const crystalAng = (vc / 4) * Math.PI * 2;
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.045 - vc * 0.005, 1), lavaCrystalMat);
            crystal.position.set(sx + Math.sin(crystalAng) * 0.22, 2.62 + Math.cos(crystalAng) * 0.15, Math.cos(crystalAng) * 0.18);
            crystal.rotation.z = crystalAng * 0.5;
            group.add(crystal);
          }
        }
        // Arms — massive, rocky texture with dodecahedron bumps
        for (const ax of [-0.8, 0.8]) {
          const ttArmGroup = new THREE.Group();
          ttArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          ttArmGroup.position.set(ax, 2.4, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.56, 16), titanRock);
          upperArm.position.y = -0.28;
          upperArm.rotation.z = ax < 0 ? 0.25 : -0.25;
          ttArmGroup.add(upperArm);
          // Rocky bumps on upper arm (small dodecahedron)
          for (let rb = 0; rb < 3; rb++) {
            const bump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06, 1), titanRockLight);
            bump.position.set(ax * 0.1, -0.12 - rb * 0.15, 0.15);
            ttArmGroup.add(bump);
          }
          // Elbow lava joint
          const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.155, 32, 24), titanLava);
          elbowJoint.position.set(ax * 0.16, -0.65, 0);
          ttArmGroup.add(elbowJoint);
          // Elbow lava drip
          const elbowDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.12, 12), titanLava);
          elbowDrip.position.set(ax * 0.16, -0.78, 0);
          ttArmGroup.add(elbowDrip);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.19, 0.52, 16), titanRock);
          forearm.position.set(ax * 0.22, -1.02, 0);
          forearm.rotation.z = ax < 0 ? 0.15 : -0.15;
          ttArmGroup.add(forearm);
          // Wrist lava joint
          const wristJoint = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), titanLava);
          wristJoint.position.set(ax * 0.3, -1.3, 0);
          ttArmGroup.add(wristJoint);
          // Massive fist with 4 rocky finger shapes
          const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 3), titanRock);
          fist.position.set(ax * 0.32, -1.38, 0);
          ttArmGroup.add(fist);
          for (let fi = 0; fi < 4; fi++) {
            const finger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.07), titanRockDark);
            finger.position.set(ax * 0.32 + (fi - 1.5) * 0.07, -1.52, 0.08);
            ttArmGroup.add(finger);
          }
          // Lava cracks across fist and knuckles
          for (let k = 0; k < 3; k++) {
            const knuckCrack = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.09, 0.022), titanLava);
            knuckCrack.position.set(ax * 0.32 + (k - 1) * 0.09, -1.42, 0.14);
            ttArmGroup.add(knuckCrack);
          }
          // Lava dripping from fists
          for (let fd = 0; fd < 2; fd++) {
            const fistDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.006, 0.1 + fd * 0.04, 12), titanLava);
            fistDrip.position.set(ax * 0.32 + (fd - 0.5) * 0.1, -1.65, 0.08);
            ttArmGroup.add(fistDrip);
          }
          group.add(ttArmGroup);
        }
        // Right arm: volcanic pillar weapon
        {
          const raGroup = group.getObjectByName('anim_ra') as THREE.Group;
          const pillarShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 12), titanRock);
          pillarShaft.position.set(0.6, -2.05, 0.1);
          pillarShaft.rotation.z = 0.22;
          raGroup.add(pillarShaft);
          // Rock mass at top with embedded lava
          const pillarTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 2), titanRockLight);
          pillarTop.position.set(0.72, -1.55, 0.14);
          raGroup.add(pillarTop);
          for (let pl = 0; pl < 4; pl++) {
            const pillarLava = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), titanLavaBright);
            pillarLava.position.set(0.72 + (pl % 2 - 0.5) * 0.18, -1.52 + (Math.floor(pl / 2) - 0.5) * 0.14, 0.22);
            raGroup.add(pillarLava);
          }
        }
        // Legs — more rocky mass, knee guards, larger feet with crack lines
        for (const lx of [-0.3, 0.3]) {
          const ttLegGroup = new THREE.Group();
          ttLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          ttLegGroup.position.set(lx, 1.15, 0);
          const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.46, 16), titanRock);
          upperLeg.position.y = -0.23;
          ttLegGroup.add(upperLeg);
          // Rock plate on thigh
          const thighPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.18), titanRockLight);
          thighPlate.position.set(0, -0.18, 0.18);
          ttLegGroup.add(thighPlate);
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), titanLava);
          knee.position.set(0, -0.5, 0.05);
          ttLegGroup.add(knee);
          // Knee guard (rock plate)
          const kneeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.12), titanRockDark);
          kneeGuard.position.set(0, -0.46, 0.18);
          ttLegGroup.add(kneeGuard);
          const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.46, 16), titanRock);
          lowerLeg.position.y = -0.8;
          ttLegGroup.add(lowerLeg);
          // Larger foot
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.32), titanRockLight);
          foot.position.set(0, -1.08, 0.06);
          ttLegGroup.add(foot);
          // Ground-cracking impact lines radiating from each foot
          for (let cr = 0; cr < 4; cr++) {
            const crackAng = (cr / 4) * Math.PI * 2;
            const groundCrack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.006, 0.22), titanLava);
            groundCrack.position.set(Math.sin(crackAng) * 0.15, -1.12, Math.cos(crackAng) * 0.15);
            groundCrack.rotation.y = crackAng;
            ttLegGroup.add(groundCrack);
          }
          group.add(ttLegGroup);
        }
        // Larger ground lava pool with bubbling detail
        const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(0.88, 32), new THREE.MeshStandardMaterial({
          color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6, transparent: true, opacity: 0.4
        }));
        lavaPool.rotation.x = -Math.PI / 2;
        lavaPool.position.y = 0.02;
        group.add(lavaPool);
        const lavaPoolInner = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshStandardMaterial({
          color: 0xffaa22, emissive: 0xff6600, emissiveIntensity: 1.0, transparent: true, opacity: 0.55
        }));
        lavaPoolInner.rotation.x = -Math.PI / 2;
        lavaPoolInner.position.y = 0.025;
        group.add(lavaPoolInner);
        // Lava pool bubbles
        for (let bb = 0; bb < 8; bb++) {
          const bubbleAng = (bb / 8) * Math.PI * 2;
          const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.04 + (bb % 3) * 0.015, 16, 12), magmaMat);
          bubble.position.set(Math.sin(bubbleAng) * 0.5, 0.04, Math.cos(bubbleAng) * 0.4);
          group.add(bubble);
        }
        // 18 ember particles — varying sizes, creating heat cloud
        for (let em = 0; em < 18; em++) {
          const emberSize = 0.01 + (em % 4) * 0.01;
          const ember = new THREE.Mesh(new THREE.SphereGeometry(emberSize, 16, 12), titanLavaBright);
          ember.position.set(
            (em % 7 - 3) * 0.22,
            0.4 + em * 0.18,
            (em % 5 - 2) * 0.18
          );
          group.add(ember);
        }
        // Volcanic eruption effect — emissive column rising from back/head
        const eruptionColumn = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2, 12), eruption);
        eruptionColumn.position.set(0, 3.9, -0.15);
        group.add(eruptionColumn);
        const eruptionCore = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 0.8, transparent: true, opacity: 0.4 }));
        eruptionCore.position.set(0, 3.8, -0.15);
        group.add(eruptionCore);
        // Rock debris orbiting body (8 dodecahedrons)
        for (let rd = 0; rd < 8; rd++) {
          const debrisAng = (rd / 8) * Math.PI * 2;
          const debrisSize = 0.06 + (rd % 3) * 0.025;
          const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(debrisSize, 1), rd % 2 === 0 ? titanRockLight : titanRockDark);
          debris.position.set(Math.sin(debrisAng) * (0.75 + (rd % 3) * 0.1), 1.5 + rd * 0.28, Math.cos(debrisAng) * (0.55 + (rd % 3) * 0.08));
          group.add(debris);
        }
        // Ash particles — 12 tiny grey spheres drifting around
        for (let ap = 0; ap < 12; ap++) {
          const ash = new THREE.Mesh(new THREE.SphereGeometry(0.015 + (ap % 3) * 0.008, 12, 10), ashMat);
          ash.position.set(
            (ap % 5 - 2) * 0.28,
            1.2 + ap * 0.2,
            (ap % 4 - 1.5) * 0.22
          );
          group.add(ash);
        }
        // Heat shimmer particles above shoulders
        for (let hs = 0; hs < 4; hs++) {
          const shimmer = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({
            color: 0xff6600, transparent: true, opacity: 0.25
          }));
          shimmer.position.set((hs - 1.5) * 0.38, 2.82 + hs * 0.05, 0.12);
          group.add(shimmer);
        }
        break;
      }

      case EnemyType.NIGHT_RIFT_VOID_EMPEROR: {
        // --- NIGHT_RIFT_VOID_EMPEROR | Estimated polygons: ~210000 triangles ---
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.3 });
        const voidDarkMat = new THREE.MeshStandardMaterial({ color: 0x080012, roughness: 0.2 });
        const voidGlow = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822ff, emissiveIntensity: 2.0 });
        const voidGlowDim = new THREE.MeshStandardMaterial({ color: 0x7722cc, emissive: 0x5511aa, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 });
        const riftMat = new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ff, emissiveIntensity: 1.5, transparent: true, opacity: 0.5 });
        const voidCrackMat = new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xcc44ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.8 });
        const voidTearMat = new THREE.MeshStandardMaterial({ color: 0x330055, emissive: 0x220033, emissiveIntensity: 0.4, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const scepterMat = new THREE.MeshStandardMaterial({ color: 0x221133, metalness: 0.6, roughness: 0.2 });
        const veHover = new THREE.Group();
        veHover.name = 'anim_hover';
        // === ENHANCED RIFT PORTAL (dual-ring with energy bridge) ===
        const riftOuter = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 24, 120), riftMat);
        riftOuter.rotation.x = Math.PI / 2;
        riftOuter.position.y = 0.08;
        veHover.add(riftOuter);
        const riftMiddle = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 20, 100), new THREE.MeshStandardMaterial({ color: 0xbb55ee, emissive: 0x9933cc, emissiveIntensity: 1.8, transparent: true, opacity: 0.7 }));
        riftMiddle.rotation.x = Math.PI / 2;
        riftMiddle.position.y = 0.1;
        veHover.add(riftMiddle);
        const riftInner = new THREE.Mesh(new THREE.CircleGeometry(0.8, 96), new THREE.MeshStandardMaterial({
          color: 0x220044, emissive: 0x110033, emissiveIntensity: 0.6, transparent: true, opacity: 0.45, side: THREE.DoubleSide
        }));
        riftInner.rotation.x = -Math.PI / 2;
        riftInner.position.y = 0.06;
        veHover.add(riftInner);
        // Energy bridge spokes connecting rings
        for (let rb = 0; rb < 12; rb++) {
          const rbAng = (rb / 12) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 8), voidGlowDim);
          spoke.position.set(Math.sin(rbAng) * 0.75, 0.09, Math.cos(rbAng) * 0.75);
          spoke.rotation.z = Math.PI / 2;
          spoke.rotation.y = rbAng;
          veHover.add(spoke);
        }
        // Emissive pattern strips inside portal
        for (let ep = 0; ep < 6; ep++) {
          const epAng = (ep / 6) * Math.PI * 2;
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.003, 0.5), voidCrackMat);
          strip.rotation.x = -Math.PI / 2;
          strip.rotation.z = epAng;
          strip.position.y = 0.07;
          veHover.add(strip);
        }
        // === TRIPLE-LAYERED CRYSTALLINE BODY ===
        const veBodyOuter = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 3), voidMat);
        veBodyOuter.position.y = 1.55;
        veBodyOuter.castShadow = true;
        veHover.add(veBodyOuter);
        const veBodyMid = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 4), voidDarkMat);
        veBodyMid.position.y = 1.55;
        veBodyMid.rotation.y = Math.PI / 5;
        veHover.add(veBodyMid);
        const veBodyInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 3), new THREE.MeshStandardMaterial({ color: 0x1a0033, roughness: 0.15 }));
        veBodyInner.position.y = 1.55;
        veBodyInner.rotation.y = Math.PI / 3;
        veHover.add(veBodyInner);
        // Void crack strips visible between body layers
        for (let vc = 0; vc < 8; vc++) {
          const vcAng = (vc / 8) * Math.PI * 2;
          const crack = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.55, 0.008), voidCrackMat);
          crack.position.set(Math.sin(vcAng) * 0.45, 1.55, Math.cos(vcAng) * 0.45);
          crack.rotation.y = vcAng;
          veHover.add(crack);
        }
        // === MULTI-LAYER VOID CORE ===
        const voidCore1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), voidGlow);
        voidCore1.position.y = 1.55;
        veHover.add(voidCore1);
        const voidCore2 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 18), new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xee99ff, emissiveIntensity: 3.0, transparent: true, opacity: 0.8 }));
        voidCore2.position.y = 1.55;
        veHover.add(voidCore2);
        const voidCore3 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.0 }));
        voidCore3.position.y = 1.55;
        veHover.add(voidCore3);
        // Energy tendrils reaching from core to body edges
        for (let el = 0; el < 8; el++) {
          const elAng = (el / 8) * Math.PI * 2;
          const elVert = el % 2 === 0 ? 0.3 : -0.3;
          const tendrilRay = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, 0.5, 8), voidGlow);
          tendrilRay.position.set(Math.sin(elAng) * 0.25, 1.55 + elVert * 0.15, Math.cos(elAng) * 0.25);
          tendrilRay.rotation.z = Math.sin(elAng) * Math.PI / 2;
          tendrilRay.rotation.x = Math.cos(elAng) * Math.PI / 2;
          veHover.add(tendrilRay);
        }
        // === DRAMATICALLY ENHANCED CROWN (triple-ring + 8 spires + gems) ===
        const crownRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.035, 24, 120), voidGlow);
        crownRing1.rotation.x = Math.PI / 2;
        crownRing1.position.y = 2.28;
        veHover.add(crownRing1);
        const crownRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 20, 100), voidGlowDim);
        crownRing2.rotation.x = Math.PI / 2;
        crownRing2.rotation.z = Math.PI / 7;
        crownRing2.position.y = 2.25;
        veHover.add(crownRing2);
        const crownRing3 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 16, 80), new THREE.MeshStandardMaterial({ color: 0x9933dd, emissive: 0x7711bb, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }));
        crownRing3.rotation.x = Math.PI / 3;
        crownRing3.rotation.z = Math.PI / 4;
        crownRing3.position.y = 2.22;
        veHover.add(crownRing3);
        // 8 tall crown spires with void gems between
        for (let cs = 0; cs < 8; cs++) {
          const csAng = (cs / 8) * Math.PI * 2;
          const spireH = 0.18 + (cs % 2) * 0.08;
          const spire = new THREE.Mesh(new THREE.ConeGeometry(0.022, spireH, 8), voidGlow);
          spire.position.set(Math.sin(csAng) * 0.4, 2.38 + spireH * 0.3, Math.cos(csAng) * 0.4);
          veHover.add(spire);
          if (cs % 2 === 0) {
            const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 2), new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa55ff, emissiveIntensity: 2.0 }));
            gem.position.set(Math.sin(csAng + Math.PI / 8) * 0.4, 2.35, Math.cos(csAng + Math.PI / 8) * 0.4);
            veHover.add(gem);
          }
        }
        // Central large crown gem
        const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 3), new THREE.MeshStandardMaterial({ color: 0xeeddff, emissive: 0xcc88ff, emissiveIntensity: 3.0 }));
        crownGem.position.set(0, 2.62, 0);
        veHover.add(crownGem);
        // === ENHANCED ALL-SEEING EYE with concentric rings ===
        const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), voidDarkMat);
        eyeSocket.position.set(0, 1.78, 0.45);
        eyeSocket.scale.z = 0.55;
        veHover.add(eyeSocket);
        const veEye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), voidGlow);
        veEye.position.set(0, 1.78, 0.49);
        veHover.add(veEye);
        const eyeIris = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 18), new THREE.MeshStandardMaterial({ color: 0xff88ff, emissive: 0xff44ee, emissiveIntensity: 3.0 }));
        eyeIris.position.set(0, 1.78, 0.53);
        veHover.add(eyeIris);
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        pupil.position.set(0, 1.78, 0.57);
        veHover.add(pupil);
        // Concentric torus rings around eye
        for (let er = 0; er < 3; er++) {
          const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(0.2 + er * 0.07, 0.008 - er * 0.001, 12, 60), voidGlowDim);
          eyeRing.position.set(0, 1.78, 0.44 - er * 0.02);
          veHover.add(eyeRing);
        }
        // Void energy trails leaking from eye
        for (let et = 0; et < 5; et++) {
          const trailPiece = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.001, 0.12 + et * 0.04, 12), voidGlowDim);
          trailPiece.position.set((et - 2) * 0.04, 1.78 - et * 0.06, 0.46);
          trailPiece.rotation.z = 0.6 + et * 0.15;
          veHover.add(trailPiece);
        }
        // === ENHANCED ARMS (anim_la, anim_ra) with armored void-plates, 5 claws, special weapons ===
        for (const ax of [-0.55, 0.55]) {
          const veArmGroup = new THREE.Group();
          veArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          veArmGroup.position.set(ax, 1.55, 0.1);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.45, 16), voidMat);
          upperArm.rotation.z = ax < 0 ? 0.6 : -0.6;
          veArmGroup.add(upperArm);
          const armPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.08), voidDarkMat);
          armPlate.position.set(ax * 0.15, 0, 0);
          armPlate.rotation.z = ax < 0 ? 0.6 : -0.6;
          veArmGroup.add(armPlate);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.4, 16), voidDarkMat);
          forearm.position.set(ax * 0.42, -0.28, 0.05);
          forearm.rotation.z = ax < 0 ? 0.8 : -0.8;
          veArmGroup.add(forearm);
          const foreArmPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.06), voidMat);
          foreArmPlate.position.set(ax * 0.42, -0.28, 0.06);
          foreArmPlate.rotation.z = ax < 0 ? 0.8 : -0.8;
          veArmGroup.add(foreArmPlate);
          for (let f = 0; f < 5; f++) {
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.14, 12), voidGlowDim);
            finger.position.set(ax * 0.65 + (f - 2) * 0.022, -0.5, 0.08);
            finger.rotation.x = 0.25;
            veArmGroup.add(finger);
          }
          if (ax < 0) {
            const voidSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), new THREE.MeshStandardMaterial({ color: 0xcc55ff, emissive: 0xaa33ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.85 }));
            voidSphere.position.set(ax * 0.85, -0.5, 0.1);
            veArmGroup.add(voidSphere);
            const voidAura = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9911cc, emissive: 0x7700aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.35 }));
            voidAura.position.set(ax * 0.85, -0.5, 0.1);
            veArmGroup.add(voidAura);
          }
          if (ax > 0) {
            const scepterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 12), scepterMat);
            scepterShaft.position.set(ax * 0.85, -0.42, 0.1);
            scepterShaft.rotation.z = ax * 0.25;
            veArmGroup.add(scepterShaft);
            for (let sh = 0; sh < 6; sh++) {
              const shAng = (sh / 6) * Math.PI * 2;
              const sArm = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, 0.1, 12), voidGlow);
              sArm.position.set(ax * 0.85 + Math.sin(shAng) * 0.055, -0.15 + Math.cos(shAng) * 0.055, 0.1);
              sArm.rotation.z = shAng;
              veArmGroup.add(sArm);
            }
            const scepterGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 2), new THREE.MeshStandardMaterial({ color: 0xeeccff, emissive: 0xddaaff, emissiveIntensity: 3.0 }));
            scepterGem.position.set(ax * 0.85, -0.15, 0.1);
            veArmGroup.add(scepterGem);
          }
          for (let dp = 0; dp < 5; dp++) {
            const dpParticle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), voidGlowDim);
            dpParticle.position.set(ax * (0.2 + dp * 0.12), -0.25 + (dp - 2) * 0.1, dp * 0.03);
            dpParticle.rotation.set(dp * 0.8, dp * 0.5, dp * 0.3);
            veArmGroup.add(dpParticle);
          }
          veHover.add(veArmGroup);
        }
        // === VOID TENDRILS (12, each with 3 segments + glowing tips + trails) ===
        for (let t = 0; t < 12; t++) {
          const tAng = (t / 12) * Math.PI * 2;
          const tR = 0.3 + (t % 3) * 0.08;
          const tSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.018, 0.38, 10), voidMat);
          tSeg1.position.set(Math.sin(tAng) * tR, 0.85, Math.cos(tAng) * tR);
          tSeg1.rotation.z = Math.sin(tAng) * 0.55;
          tSeg1.rotation.x = Math.cos(tAng) * 0.35;
          veHover.add(tSeg1);
          const tSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.32, 8), voidDarkMat);
          tSeg2.position.set(Math.sin(tAng) * (tR + 0.12), 0.52, Math.cos(tAng) * (tR + 0.12));
          tSeg2.rotation.z = Math.sin(tAng) * 0.7;
          tSeg2.rotation.x = Math.cos(tAng) * 0.5;
          veHover.add(tSeg2);
          const tSeg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.004, 0.22, 12), voidGlowDim);
          tSeg3.position.set(Math.sin(tAng) * (tR + 0.24), 0.25, Math.cos(tAng) * (tR + 0.24));
          tSeg3.rotation.z = Math.sin(tAng) * 0.9;
          tSeg3.rotation.x = Math.cos(tAng) * 0.65;
          veHover.add(tSeg3);
          const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), voidGlow);
          tipGlow.position.set(Math.sin(tAng) * (tR + 0.35), 0.12, Math.cos(tAng) * (tR + 0.35));
          veHover.add(tipGlow);
          const tendrilTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.001, 0.1, 12), voidGlowDim);
          tendrilTrail.position.set(Math.sin(tAng) * (tR + 0.4), 0.08, Math.cos(tAng) * (tR + 0.4));
          veHover.add(tendrilTrail);
        }
        // === ORBITING SYSTEM (10 orbs at varying distances, connected by beams) ===
        const veOrbPositions: THREE.Vector3[] = [];
        for (let i = 0; i < 10; i++) {
          const oAng = (i / 10) * Math.PI * 2;
          const oR = 0.6 + (i % 3) * 0.15;
          const orbY = 1.1 + Math.sin(oAng * 2.5) * 0.4;
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (i % 2) * 0.02, 16, 12), voidGlow);
          orb.position.set(Math.sin(oAng) * oR, orbY, Math.cos(oAng) * oR);
          veHover.add(orb);
          veOrbPositions.push(orb.position.clone());
          const orbTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.018, 0.14, 8), voidGlowDim);
          orbTrail.position.set(Math.sin(oAng) * (oR - 0.1), orbY + 0.09, Math.cos(oAng) * (oR - 0.1));
          veHover.add(orbTrail);
        }
        for (let ob = 0; ob < 10; ob += 2) {
          const pA = veOrbPositions[ob];
          const pB = veOrbPositions[(ob + 2) % 10];
          const beamMid = pA.clone().add(pB).multiplyScalar(0.5);
          const beamDist = pA.distanceTo(pB);
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, beamDist, 12), voidGlowDim);
          beam.position.copy(beamMid);
          beam.lookAt(pB);
          beam.rotateX(Math.PI / 2);
          veHover.add(beam);
        }
        // === VOID LIGHTNING ARCS (8, longer with branching) ===
        for (let vl = 0; vl < 8; vl++) {
          const vlAng = (vl / 8) * Math.PI * 2;
          const arcLen = 0.55 + (vl % 3) * 0.18;
          const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, arcLen, 8), new THREE.MeshStandardMaterial({ color: 0x8800ff, emissive: 0x6600cc, emissiveIntensity: 2.0 }));
          arc.position.set(Math.sin(vlAng) * 0.45, 1.5 + vl * 0.12, Math.cos(vlAng) * 0.45);
          arc.rotation.z = vlAng * 0.6;
          arc.rotation.x = vlAng * 0.3;
          veHover.add(arc);
          const arcBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.001, arcLen * 0.5, 12), new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822ee, emissiveIntensity: 1.8, transparent: true, opacity: 0.75 }));
          arcBranch.position.set(Math.sin(vlAng) * 0.55, 1.5 + vl * 0.12 + 0.15, Math.cos(vlAng) * 0.55);
          arcBranch.rotation.z = vlAng * 0.8;
          arcBranch.rotation.x = -vlAng * 0.4;
          veHover.add(arcBranch);
        }
        // === DIMENSIONAL TEARS (4 flat emissive planes at various angles) ===
        const veTearAngles = [0, Math.PI / 3, Math.PI * 0.6, Math.PI * 0.9];
        for (let dt = 0; dt < 4; dt++) {
          const tear = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12, 4, 2), voidTearMat);
          tear.position.set(Math.sin(veTearAngles[dt]) * 0.55, 1.2 + dt * 0.25, Math.cos(veTearAngles[dt]) * 0.55);
          tear.rotation.y = veTearAngles[dt];
          tear.rotation.z = 0.3 + dt * 0.2;
          veHover.add(tear);
          const tearEdge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.006, 0.003), voidCrackMat);
          tearEdge.position.copy(tear.position);
          tearEdge.rotation.copy(tear.rotation);
          veHover.add(tearEdge);
        }
        // === SPECTRAL CAPE (5 transparent planes trailing back) ===
        for (let cp = 0; cp < 5; cp++) {
          const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.55 - cp * 0.06, 0.6 - cp * 0.05, 3, 4), new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.5, transparent: true, opacity: Math.max(0.04, 0.22 - cp * 0.03), side: THREE.DoubleSide }));
          cape.position.set(0, 1.4 - cp * 0.05, -0.35 - cp * 0.12);
          cape.rotation.x = 0.35 + cp * 0.08;
          veHover.add(cape);
        }
        // === VOID PARTICLE FIELD (16 particles) ===
        for (let vp = 0; vp < 16; vp++) {
          const vpAng = (vp / 16) * Math.PI * 2;
          const vpR = 0.3 + (vp % 4) * 0.2;
          const vParticle = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 2), new THREE.MeshStandardMaterial({ color: 0x8844cc, emissive: 0x6622aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.45 }));
          vParticle.position.set(Math.sin(vpAng) * vpR, 0.25 + vp * 0.14, Math.cos(vpAng) * vpR);
          veHover.add(vParticle);
        }
        group.add(veHover);
        break;
      }

      case EnemyType.NIGHT_DRAGON_SHADOW_WYRM: {
        // --- NIGHT_DRAGON_SHADOW_WYRM | Estimated polygons: ~205000 triangles ---
        const shadowMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.5 });
        const shadowDarkMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.6 });
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x121225, roughness: 0.4, metalness: 0.2 });
        const purpleGlow = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622ff, emissiveIntensity: 1.5 });
        const purpleGlowDim = new THREE.MeshStandardMaterial({ color: 0x6633cc, emissive: 0x4411aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.3, roughness: 0.3 });
        const scuteMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.1 });
        const shadowAuraMat = new THREE.MeshStandardMaterial({ color: 0x0a0010, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        // === MASSIVE ENHANCED DRAGON BODY with muscle definition ===
        const swBody = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 24), shadowMat);
        swBody.scale.set(0.85, 0.65, 1.7);
        swBody.position.y = 1.25;
        swBody.castShadow = true;
        group.add(swBody);
        // Muscle sphere overlays for definition
        for (let ms = 0; ms < 6; ms++) {
          const msAng = (ms / 6) * Math.PI * 2;
          const muscleBulge = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), shadowMat);
          muscleBulge.scale.set(0.6, 0.4, 0.8);
          muscleBulge.position.set(Math.sin(msAng) * 0.38, 1.25 + Math.cos(msAng) * 0.1, Math.sin(ms * 0.4) * 0.5);
          group.add(muscleBulge);
        }
        // === SCALE ROWS (12 rows along body) ===
        for (let sr = 0; sr < 12; sr++) {
          const scaleRow = new THREE.Mesh(new THREE.BoxGeometry(0.65 - sr * 0.03, 0.025, 0.12), scaleMat);
          scaleRow.position.set(0, 1.5, -0.8 + sr * 0.18);
          group.add(scaleRow);
        }
        // Scale texture on flanks (small overlapping boxes)
        for (let fx = 0; fx < 2; fx++) {
          const side = fx === 0 ? -1 : 1;
          for (let fs = 0; fs < 16; fs++) {
            const flankScale = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.08), scaleMat);
            flankScale.position.set(side * (0.35 + (fs % 2) * 0.05), 1.05 + Math.floor(fs / 4) * 0.18, -0.5 + (fs % 4) * 0.22);
            flankScale.rotation.z = side * 0.15;
            group.add(flankScale);
          }
        }
        // === DORSAL SPINES (14, varying heights with shadow energy tips) ===
        for (let ds = 0; ds < 14; ds++) {
          const spineH = 0.1 + Math.sin(ds * 0.45) * 0.06 + (ds % 3 === 0 ? 0.04 : 0);
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.022, spineH, 8), shadowDarkMat);
          spine.position.set(0, 1.58 + Math.sin(ds * 0.35) * 0.04, -0.75 + ds * 0.16);
          group.add(spine);
          if (ds % 3 === 0) {
            const spineTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12), purpleGlowDim);
            spineTip.position.set(0, 1.58 + Math.sin(ds * 0.35) * 0.04 + spineH, -0.75 + ds * 0.16);
            group.add(spineTip);
          }
        }
        // === NECK (7 segments, thicker, with scale rings and throat scutes) ===
        for (let ns = 0; ns < 7; ns++) {
          const neckSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - ns * 0.018, 0.22 - ns * 0.015, 0.18, 16), shadowMat);
          neckSeg.position.set(0, 1.58 + ns * 0.16, 0.72 + ns * 0.14);
          neckSeg.rotation.x = -0.42;
          group.add(neckSeg);
          const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.21 - ns * 0.018, 0.012, 12, 40), scaleMat);
          neckRing.rotation.x = Math.PI / 2;
          neckRing.position.set(0, 1.55 + ns * 0.16, 0.72 + ns * 0.14);
          group.add(neckRing);
          // Throat scutes (lighter plates underneath)
          const scute = new THREE.Mesh(new THREE.BoxGeometry(0.16 - ns * 0.01, 0.015, 0.12), scuteMat);
          scute.position.set(0, 1.46 + ns * 0.14, 0.9 + ns * 0.14);
          scute.rotation.x = -0.42;
          group.add(scute);
        }
        // === DRAMATICALLY ENHANCED HEAD ===
        const swHead = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.58), shadowMat);
        swHead.position.set(0, 2.3, 1.4);
        group.add(swHead);
        // Skull structure overlays
        const skullTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), shadowDarkMat);
        skullTop.scale.set(1, 0.55, 1.1);
        skullTop.position.set(0, 2.42, 1.32);
        group.add(skullTop);
        // Elongated snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.45), shadowMat);
        snout.position.set(0, 2.28, 1.62);
        group.add(snout);
        const snoutRidge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.35), scaleMat);
        snoutRidge.position.set(0, 2.38, 1.6);
        group.add(snoutRidge);
        // Nostrils
        for (const nx of [-0.07, 0.07]) {
          const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.04, 8), shadowDarkMat);
          nostril.rotation.x = Math.PI / 2;
          nostril.position.set(nx, 2.33, 1.82);
          group.add(nostril);
        }
        // Head crest (row of spines along skull top)
        for (let hc = 0; hc < 5; hc++) {
          const crestSpine = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07 + hc * 0.01, 12), scaleMat);
          crestSpine.position.set(0, 2.52, 1.55 - hc * 0.1);
          group.add(crestSpine);
        }
        // === ARTICULATED JAW GROUP (anim_jaw) ===
        const jawGroup = new THREE.Group();
        jawGroup.name = 'anim_jaw';
        jawGroup.position.set(0, 2.18, 1.38);
        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.42), shadowDarkMat);
        lowerJaw.position.set(0, -0.04, 0.04);
        jawGroup.add(lowerJaw);
        // Upper teeth (10, varying sizes)
        for (let ft = 0; ft < 10; ft++) {
          const fangH = 0.06 + (ft % 3) * 0.025;
          const fang = new THREE.Mesh(new THREE.ConeGeometry(0.01, fangH, 12), new THREE.MeshStandardMaterial({ color: 0xddddee }));
          fang.position.set((ft - 4.5) * 0.035, 0.04, 0.2);
          fang.rotation.x = Math.PI;
          jawGroup.add(fang);
        }
        // Lower teeth (10, varying sizes)
        for (let lt = 0; lt < 10; lt++) {
          const ltH = 0.05 + (lt % 3) * 0.02;
          const lTooth = new THREE.Mesh(new THREE.ConeGeometry(0.009, ltH, 12), new THREE.MeshStandardMaterial({ color: 0xccccdd }));
          lTooth.position.set((lt - 4.5) * 0.035, -0.1, 0.2);
          jawGroup.add(lTooth);
        }
        group.add(jawGroup);
        // === 3 PAIRS OF HORNS ===
        for (const hx of [-0.18, 0.18]) {
          // Main large horns
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.18, 12), scaleMat);
          hornBase.position.set(hx, 2.42, 1.22);
          hornBase.rotation.x = 0.55;
          hornBase.rotation.z = hx > 0 ? -0.2 : 0.2;
          group.add(hornBase);
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.28, 10), purpleGlowDim);
          hornTip.position.set(hx * 1.12, 2.46, 1.05);
          hornTip.rotation.x = 0.75;
          hornTip.rotation.z = hx > 0 ? -0.25 : 0.25;
          group.add(hornTip);
          // Secondary mid horns
          const hornMid = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.14, 8), scaleMat);
          hornMid.position.set(hx * 0.85, 2.48, 1.18);
          hornMid.rotation.x = 0.35;
          hornMid.rotation.z = hx > 0 ? -0.35 : 0.35;
          group.add(hornMid);
          // Small rear horns
          const hornRear = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09, 12), shadowDarkMat);
          hornRear.position.set(hx * 0.6, 2.38, 1.08);
          hornRear.rotation.x = 0.8;
          group.add(hornRear);
          // Brow ridges
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), shadowDarkMat);
          brow.position.set(hx, 2.38, 1.52);
          group.add(brow);
        }
        // === LARGER, MORE MENACING EYES with shadow trails ===
        for (const ex of [-0.12, 0.12]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0x050505 }));
          eyeSocket.position.set(ex, 2.34, 1.56);
          eyeSocket.scale.z = 0.5;
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), purpleGlow);
          eye.position.set(ex, 2.34, 1.59);
          group.add(eye);
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.075, 0.01), new THREE.MeshStandardMaterial({ color: 0x000000 }));
          slit.position.set(ex, 2.34, 1.62);
          group.add(slit);
          // Shadow trails streaming behind eyes
          for (let st = 0; st < 4; st++) {
            const shadowTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.008 - st * 0.001, 0.003, 0.1 + st * 0.04, 12), purpleGlowDim);
            shadowTrail.position.set(ex, 2.34 - st * 0.02, 1.48 - st * 0.06);
            shadowTrail.rotation.x = 0.5;
            group.add(shadowTrail);
          }
        }
        // === DRAMATICALLY ENHANCED WINGS (anim_lw, anim_rw) ===
        for (const wx of [-1, 1]) {
          const swWingGroup = new THREE.Group();
          swWingGroup.name = wx < 0 ? 'anim_lw' : 'anim_rw';
          swWingGroup.position.set(wx * 0.32, 1.55, 0.22);
          // Wing shoulder muscle
          const wingMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), shadowMat);
          wingMuscle.position.set(wx * 0.08, 0, 0);
          swWingGroup.add(wingMuscle);
          // Wing arm bone
          const wingArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.9, 12), shadowMat);
          wingArm.position.set(wx * 0.35, 0.05, 0);
          wingArm.rotation.z = wx * 0.3;
          swWingGroup.add(wingArm);
          // Wing forearm
          const wingFore = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 12), shadowMat);
          wingFore.position.set(wx * 0.8, -0.06, -0.35);
          wingFore.rotation.z = wx * 0.5;
          swWingGroup.add(wingFore);
          // 5 wing finger bones
          for (let wf = 0; wf < 5; wf++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.014, 0.4 + wf * 0.05, 8), scaleMat);
            finger.position.set(wx * (0.55 + wf * 0.12), -0.08, -0.45 + wf * 0.18);
            finger.rotation.z = wx * (0.25 + wf * 0.08);
            swWingGroup.add(finger);
          }
          // 5 membrane panels between finger bones
          for (let mp = 0; mp < 5; mp++) {
            const membW = 0.38 - mp * 0.02;
            const membrane = new THREE.Mesh(new THREE.BoxGeometry(membW, 0.01, 0.38 - mp * 0.01), shadowDarkMat);
            membrane.position.set(wx * (0.35 + mp * 0.1), -0.09 - mp * 0.02, -0.25 - mp * 0.1);
            membrane.rotation.z = wx * (0.18 + mp * 0.06);
            swWingGroup.add(membrane);
          }
          // Wing membrane tears (small transparent spots)
          for (let mt = 0; mt < 3; mt++) {
            const memTear = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
            memTear.position.set(wx * (0.5 + mt * 0.15), -0.08, -0.3 - mt * 0.1);
            swWingGroup.add(memTear);
          }
          // Large wing claw at joint
          const wingClaw = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 8), clawMat);
          wingClaw.position.set(wx * 0.15, 0.06, 0.35);
          wingClaw.rotation.z = wx * -0.55;
          swWingGroup.add(wingClaw);
          group.add(swWingGroup);
        }
        // === TAIL (9 segments, thicker at base, dorsal spines, large spade tip) ===
        const swTailGroup = new THREE.Group();
        swTailGroup.name = 'anim_tail';
        swTailGroup.position.set(0, 1.05, -0.85);
        for (let ts = 0; ts < 9; ts++) {
          const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - ts * 0.012, 0.15 - ts * 0.012, 0.22, 12), shadowMat);
          tailSeg.position.set(Math.sin(ts * 0.28) * 0.12, -ts * 0.04, -ts * 0.2);
          tailSeg.rotation.x = -0.18 + ts * 0.025;
          swTailGroup.add(tailSeg);
          // Dorsal spines on tail
          if (ts < 6) {
            const tSpine = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.07 + ts * 0.01, 12), shadowDarkMat);
            tSpine.position.set(0, 0.08, -ts * 0.2);
            tSpine.position.y -= ts * 0.04;
            swTailGroup.add(tSpine);
          }
        }
        // Tail spade tip (large, with prong detail)
        const tailSpade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.25), shadowDarkMat);
        tailSpade.position.set(0, -0.36, -1.82);
        tailSpade.rotation.x = -0.28;
        swTailGroup.add(tailSpade);
        const spadeCenter = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), shadowMat);
        spadeCenter.position.set(0, -0.38, -2.0);
        spadeCenter.rotation.x = Math.PI / 2;
        swTailGroup.add(spadeCenter);
        // Spade prongs
        for (const px of [-0.1, 0.1]) {
          const prong = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 12), shadowDarkMat);
          prong.position.set(px, -0.36, -1.96);
          prong.rotation.x = Math.PI / 2;
          prong.rotation.z = px > 0 ? 0.4 : -0.4;
          swTailGroup.add(prong);
        }
        group.add(swTailGroup);
        // === LEGS with knee joints, 4 claws each, larger ===
        for (let li = 0; li < 2; li++) {
          for (const side of [-1, 1]) {
            const swLegGroup = new THREE.Group();
            swLegGroup.name = li === 1 ? (side === -1 ? 'anim_fll' : 'anim_frl') : (side === -1 ? 'anim_bll' : 'anim_brl');
            swLegGroup.position.set(side * 0.4, 1.0, li * 1.1 - 0.3);
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.095, 0.42, 12), shadowMat);
            thigh.position.y = -0.21;
            swLegGroup.add(thigh);
            // Knee joint sphere
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), scaleMat);
            knee.position.y = -0.44;
            swLegGroup.add(knee);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.42, 12), shadowMat);
            shin.position.y = -0.66;
            swLegGroup.add(shin);
            // 4 claws per foot
            for (let cl = 0; cl < 4; cl++) {
              const claw = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 8), clawMat);
              claw.position.set((cl - 1.5) * 0.045, -0.92, 0.05);
              claw.rotation.x = Math.PI * 0.88;
              swLegGroup.add(claw);
            }
            group.add(swLegGroup);
          }
        }
        // === ENHANCED SHADOW BREATH (multi-layer) ===
        const breathCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 18), purpleGlow);
        breathCore.position.set(0, 2.22, 1.72);
        group.add(breathCore);
        const breathCone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 16), purpleGlowDim);
        breathCone.position.set(0, 2.2, 1.86);
        breathCone.rotation.x = Math.PI / 2;
        group.add(breathCone);
        const breathAura = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), purpleGlowDim);
        breathAura.position.set(0, 2.22, 1.7);
        group.add(breathAura);
        // === SHADOW AURA encompassing the whole creature ===
        const shadowAura = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), shadowAuraMat);
        shadowAura.scale.set(0.9, 0.7, 1.6);
        shadowAura.position.set(0, 1.2, 0.2);
        group.add(shadowAura);
        // === SHADOW WISPS (12, with trails) ===
        for (let sw = 0; sw < 12; sw++) {
          const wispAng = (sw / 12) * Math.PI * 2;
          const wispR = 0.5 + (sw % 3) * 0.3;
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), purpleGlowDim);
          wisp.position.set(Math.sin(wispAng) * wispR, 0.8 + Math.sin(wispAng * 2) * 0.6, Math.cos(wispAng) * wispR);
          group.add(wisp);
          const wispTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, 0.1, 12), purpleGlowDim);
          wispTrail.position.copy(wisp.position);
          wispTrail.position.y -= 0.06;
          group.add(wispTrail);
        }
        // === SHADOW PUDDLE beneath body ===
        const shadowPuddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({
          color: 0x050005, transparent: true, opacity: 0.5, side: THREE.DoubleSide
        }));
        shadowPuddle.rotation.x = -Math.PI / 2;
        shadowPuddle.position.y = 0.01;
        group.add(shadowPuddle);
        // Shadow drips under wings
        for (let sd = 0; sd < 6; sd++) {
          const sdSide = sd < 3 ? -1 : 1;
          const shadowDrip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 12), new THREE.MeshStandardMaterial({ color: 0x110011, transparent: true, opacity: 0.45 }));
          shadowDrip.position.set(sdSide * (0.4 + (sd % 3) * 0.22), 1.35, 0.1 + (sd % 2) * 0.2);
          shadowDrip.rotation.x = Math.PI;
          group.add(shadowDrip);
        }
        break;
      }

      case EnemyType.NIGHT_DESERT_SANDSTORM_DJINN: {
        // --- NIGHT_DESERT_SANDSTORM_DJINN | Estimated polygons: ~285000 triangles ---
        const djinnMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, transparent: true, opacity: 0.7, roughness: 0.3 });
        const djinnDarkMat = new THREE.MeshStandardMaterial({ color: 0xaa8822, transparent: true, opacity: 0.55, roughness: 0.2 });
        const djinnGlow = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffcc00, emissiveIntensity: 1.5 });
        const djinnGlowDim = new THREE.MeshStandardMaterial({ color: 0xddbb22, emissive: 0xccaa00, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2, emissive: 0xaa8800, emissiveIntensity: 0.3 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xcc0000, emissiveIntensity: 0.8 });
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xc8a870, transparent: true, opacity: 0.4 });
        const sandSheetMat = new THREE.MeshStandardMaterial({ color: 0xd4aa55, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
        const crackMat = new THREE.MeshStandardMaterial({ color: 0x885500, roughness: 0.9 });
        const djHover = new THREE.Group();
        djHover.name = 'anim_hover';

        // === GROUND EFFECT: massive sand disturbance + cracked earth ===
        const sandDisturbance = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ color: 0xc8a860, transparent: true, opacity: 0.5 }));
        sandDisturbance.rotation.x = -Math.PI / 2;
        sandDisturbance.position.y = 0.01;
        djHover.add(sandDisturbance);
        // Cracked earth pattern (radial crack lines)
        for (let cr = 0; cr < 8; cr++) {
          const crAng = (cr / 8) * Math.PI * 2;
          const crackLine = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.005, 0.9), crackMat);
          crackLine.rotation.x = -Math.PI / 2;
          crackLine.rotation.z = crAng;
          crackLine.position.set(Math.sin(crAng) * 0.45, 0.012, Math.cos(crAng) * 0.45);
          djHover.add(crackLine);
        }
        // Secondary crack lines
        for (let cr2 = 0; cr2 < 12; cr2++) {
          const cr2Ang = (cr2 / 12) * Math.PI * 2;
          const crackLine2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 0.55), crackMat);
          crackLine2.rotation.x = -Math.PI / 2;
          crackLine2.rotation.z = cr2Ang;
          crackLine2.position.set(Math.sin(cr2Ang) * 0.75, 0.011, Math.cos(cr2Ang) * 0.75);
          djHover.add(crackLine2);
        }

        // === MASSIVE SWIRLING SAND VORTEX LOWER BODY ===
        // Multiple nested cone/cylinder layers
        const vortexOuter = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.45, 24), djinnDarkMat);
        vortexOuter.position.y = 0.73;
        djHover.add(vortexOuter);
        const vortexMid = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.55, 20), djinnMat);
        vortexMid.position.y = 0.78;
        vortexMid.castShadow = true;
        djHover.add(vortexMid);
        const vortexInner = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.6, 16), new THREE.MeshStandardMaterial({ color: 0xddbb66, transparent: true, opacity: 0.35, roughness: 0.2 }));
        vortexInner.position.y = 0.82;
        djHover.add(vortexInner);
        // Inner dense core cylinder
        const vortexCore = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 1.5, 16), new THREE.MeshStandardMaterial({ color: 0xaa8833, transparent: true, opacity: 0.6 }));
        vortexCore.position.y = 0.78;
        djHover.add(vortexCore);

        // === TORUS RINGS at different heights and angles (vortex rings) ===
        const torusAngles = [
          { rx: Math.PI / 2, rz: 0, r: 0.62, y: 0.2 },
          { rx: Math.PI / 2, rz: 0.8, r: 0.72, y: 0.45 },
          { rx: Math.PI / 2, rz: 1.5, r: 0.78, y: 0.7 },
          { rx: Math.PI / 3, rz: 0.3, r: 0.65, y: 1.0 },
          { rx: Math.PI / 4, rz: 1.2, r: 0.55, y: 1.25 },
          { rx: Math.PI / 6, rz: 0.6, r: 0.45, y: 1.45 },
          { rx: Math.PI / 2, rz: 2.1, r: 0.82, y: 0.12 },
          { rx: Math.PI / 2.5, rz: 1.8, r: 0.7, y: 0.85 },
        ];
        for (let tr = 0; tr < torusAngles.length; tr++) {
          const ta = torusAngles[tr];
          const vortexRing = new THREE.Mesh(new THREE.TorusGeometry(ta.r, 0.022, 16, 80), djinnDarkMat);
          vortexRing.rotation.x = ta.rx;
          vortexRing.rotation.z = ta.rz;
          vortexRing.position.y = ta.y;
          djHover.add(vortexRing);
        }

        // === SAND SHEETS (flat transparent planes) ===
        for (let ss = 0; ss < 6; ss++) {
          const ssAng = (ss / 6) * Math.PI * 2;
          const sandSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.2, 3, 6), sandSheetMat);
          sandSheet.position.set(Math.sin(ssAng) * 0.4, 0.7, Math.cos(ssAng) * 0.4);
          sandSheet.rotation.y = ssAng + Math.PI / 2;
          sandSheet.rotation.z = 0.2 + ss * 0.1;
          djHover.add(sandSheet);
        }

        // === SAND PARTICLES spiraling around vortex ===
        for (let sp = 0; sp < 24; sp++) {
          const spAng = (sp / 24) * Math.PI * 2;
          const spR = 0.3 + (sp % 5) * 0.1;
          const spDebris = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.028), sandMat);
          spDebris.position.set(Math.sin(spAng) * spR, 0.15 + sp * 0.065, Math.cos(spAng) * spR);
          spDebris.rotation.set(spAng * 0.7, spAng, spAng * 0.5);
          djHover.add(spDebris);
        }

        // === IMPOSING MUSCULAR TORSO ===
        const djTorso = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), djinnMat);
        djTorso.scale.set(1, 1.15, 0.88);
        djTorso.position.y = 1.6;
        djHover.add(djTorso);
        // Muscular pec definition
        for (const px of [-0.12, 0.12]) {
          const pec = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), djinnMat);
          pec.scale.set(0.75, 0.5, 0.6);
          pec.position.set(px, 1.65, 0.18);
          djHover.add(pec);
        }
        // Ab detail
        for (let ab = 0; ab < 3; ab++) {
          for (const abx of [-0.07, 0.07]) {
            const abMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), djinnDarkMat);
            abMuscle.scale.set(0.8, 0.55, 0.5);
            abMuscle.position.set(abx, 1.5 - ab * 0.1, 0.22);
            djHover.add(abMuscle);
          }
        }

        // === ANCIENT ARMOR REMNANTS on torso ===
        // Central chest plate
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.05), goldMat);
        chestPlate.position.set(0, 1.62, 0.24);
        djHover.add(chestPlate);
        // Chest plate gem
        const chestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 2), gemMat);
        chestGem.position.set(0, 1.68, 0.27);
        djHover.add(chestGem);
        // Armor side plates
        for (const spx of [-0.22, 0.22]) {
          const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.04), goldMat);
          sidePlate.position.set(spx, 1.6, 0.2);
          sidePlate.rotation.z = spx > 0 ? -0.15 : 0.15;
          djHover.add(sidePlate);
        }
        // Golden harness torus
        const harness = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.016, 16, 80), goldMat);
        harness.rotation.x = Math.PI / 2;
        harness.position.y = 1.62;
        djHover.add(harness);
        // Cross straps
        for (const sx of [-1, 1]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.45, 0.014), goldMat);
          strap.position.set(sx * 0.09, 1.6, 0.17);
          strap.rotation.z = sx * 0.22;
          djHover.add(strap);
          // Chain detail along strap
          for (let ch = 0; ch < 3; ch++) {
            const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 8, 20), goldMat);
            chainLink.position.set(sx * (0.09 + ch * 0.02), 1.45 + ch * 0.1, 0.17);
            chainLink.rotation.x = ch * 0.5;
            djHover.add(chainLink);
          }
        }
        // Central amulet
        const amulet = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 3), gemMat);
        amulet.position.set(0, 1.57, 0.26);
        djHover.add(amulet);

        // === ORNATE GOLDEN PAULDRONS with gem insets ===
        for (const px of [-0.38, 0.38]) {
          const pauldronBase = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), goldMat);
          pauldronBase.scale.set(1, 0.7, 0.9);
          pauldronBase.position.set(px, 1.72, 0.06);
          djHover.add(pauldronBase);
          // Pauldron plates
          for (let pp = 0; pp < 3; pp++) {
            const ppAng = (pp / 3) * Math.PI - Math.PI / 2;
            const pPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.12), goldMat);
            pPlate.position.set(px + Math.sin(ppAng) * 0.1, 1.72 + Math.cos(ppAng) * 0.06, 0.06);
            pPlate.rotation.z = px > 0 ? -ppAng * 0.3 : ppAng * 0.3;
            djHover.add(pPlate);
          }
          // Pauldron gem
          const pGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 2), gemMat);
          pGem.position.set(px, 1.78, 0.1);
          djHover.add(pGem);
        }

        // === POWERFUL ARMS with golden bracers (anim_la, anim_ra) ===
        for (const ax of [-0.42, 0.42]) {
          const djArmGroup = new THREE.Group();
          djArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          djArmGroup.position.set(ax, 1.52, 0.06);
          // Upper arm (muscular)
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.085, 0.35, 16), djinnMat);
          upperArm.rotation.z = ax < 0 ? 0.38 : -0.38;
          djArmGroup.add(upperArm);
          // Golden armband upper
          const armbandUp = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.014, 12, 40), goldMat);
          armbandUp.rotation.x = Math.PI / 2;
          armbandUp.position.set(ax * 0.06, 0.06, 0);
          djArmGroup.add(armbandUp);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.072, 0.3, 16), djinnMat);
          forearm.position.set(ax * 0.22, -0.22, 0.06);
          forearm.rotation.z = ax < 0 ? 0.52 : -0.52;
          djArmGroup.add(forearm);
          // Golden bracer (thick)
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.1, 16), goldMat);
          bracer.position.set(ax * 0.18, -0.16, 0.04);
          bracer.rotation.z = ax < 0 ? 0.52 : -0.52;
          djArmGroup.add(bracer);
          // Bracer gem
          const bracerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.016, 2), gemMat);
          bracerGem.position.set(ax * 0.18 + ax * 0.06, -0.16, 0.1);
          djArmGroup.add(bracerGem);
          // Left arm: scimitar of solid gold
          if (ax < 0) {
            // Scimitar blade (curved box approximation)
            const scimitarBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.01), goldMat);
            scimitarBlade.position.set(ax * 0.5, -0.42, 0.1);
            scimitarBlade.rotation.z = ax * 0.35;
            djArmGroup.add(scimitarBlade);
            // Blade tip
            const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 12), goldMat);
            bladeTip.position.set(ax * 0.52, -0.72, 0.1);
            bladeTip.rotation.z = ax * 0.5;
            djArmGroup.add(bladeTip);
            // Scimitar guard
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.025), goldMat);
            guard.position.set(ax * 0.48, -0.14, 0.1);
            djArmGroup.add(guard);
            // Guard gems
            for (const gx of [-0.07, 0.07]) {
              const guardGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.014, 2), gemMat);
              guardGem.position.set(ax * 0.48 + gx, -0.14, 0.12);
              djArmGroup.add(guardGem);
            }
            // Pommel gem
            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x2288dd, emissiveIntensity: 1.2 }));
            pommel.position.set(ax * 0.46, -0.08, 0.1);
            djArmGroup.add(pommel);
          }
          // Right arm: channeling sandstorm (cone of sand particles)
          if (ax > 0) {
            const sandChannel = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 16), new THREE.MeshStandardMaterial({ color: 0xccaa44, transparent: true, opacity: 0.4 }));
            sandChannel.position.set(ax * 0.5, -0.48, 0.12);
            sandChannel.rotation.z = ax * -0.6;
            djArmGroup.add(sandChannel);
            // Sand particles in channel
            for (let scp = 0; scp < 8; scp++) {
              const scpAng = (scp / 8) * Math.PI * 2;
              const scParticle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, 0.02), sandMat);
              scParticle.position.set(ax * 0.5 + Math.sin(scpAng) * 0.08, -0.48 + Math.cos(scpAng) * 0.08, 0.12);
              djArmGroup.add(scParticle);
            }
          }
          // Pointed fingers (5)
          for (let f = 0; f < 5; f++) {
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.09, 12), djinnMat);
            finger.position.set(ax * 0.4 + (f - 2) * 0.016, -0.38, 0.08);
            finger.rotation.x = 0.2;
            djArmGroup.add(finger);
          }
          djHover.add(djArmGroup);
        }

        // === REGAL HEAD with ancient features ===
        const djHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), djinnMat);
        djHead.position.y = 2.02;
        djHover.add(djHead);
        // Face structure: strong brow, cheekbones
        const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.06), djinnDarkMat);
        browRidge.position.set(0, 2.1, 0.14);
        djHover.add(browRidge);
        for (const cx of [-0.1, 0.1]) {
          const cheekBone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.05), djinnDarkMat);
          cheekBone.position.set(cx, 2.0, 0.16);
          djHover.add(cheekBone);
        }
        // Nose bridge
        const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.04), djinnMat);
        noseBridge.position.set(0, 2.04, 0.17);
        djHover.add(noseBridge);

        // === GOLDEN CROWN/HEADPIECE with gems ===
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.08, 20), goldMat);
        crownBase.position.y = 2.14;
        djHover.add(crownBase);
        // Crown torus
        const crownTorus = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 12, 60), goldMat);
        crownTorus.rotation.x = Math.PI / 2;
        crownTorus.position.y = 2.18;
        djHover.add(crownTorus);
        // Crown spires (5)
        for (let csp = 0; csp < 5; csp++) {
          const cspAng = (csp / 5) * Math.PI * 2;
          const cSpire = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.1 + (csp % 2) * 0.04, 6), goldMat);
          cSpire.position.set(Math.sin(cspAng) * 0.2, 2.24 + (csp % 2) * 0.02, Math.cos(cspAng) * 0.2);
          djHover.add(cSpire);
          // Crown gem between spires
          const cGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 2), new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xdd6600, emissiveIntensity: 1.5 }));
          cGem.position.set(Math.sin(cspAng + Math.PI / 5) * 0.2, 2.2, Math.cos(cspAng + Math.PI / 5) * 0.2);
          djHover.add(cGem);
        }
        // Central large crown gem
        const largeCrownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 3), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 2.5, metalness: 0.6 }));
        largeCrownGem.position.set(0, 2.2, 0.19);
        djHover.add(largeCrownGem);
        // Turban wrap behind crown
        const turbanWrap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), djinnDarkMat);
        turbanWrap.scale.set(1, 0.55, 0.85);
        turbanWrap.position.y = 2.13;
        djHover.add(turbanWrap);

        // === BEARD MADE OF FLOWING SAND (thin sand-colored cylinders) ===
        for (let bd = 0; bd < 8; bd++) {
          const bdAng = -Math.PI / 6 + (bd / 7) * (Math.PI / 3);
          const beardStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.12 + bd * 0.01, 12), djinnDarkMat);
          beardStrand.position.set(Math.sin(bdAng) * 0.1, 1.88 - bd * 0.008, Math.cos(bdAng) * 0.14);
          beardStrand.rotation.z = bdAng * 0.4;
          beardStrand.rotation.x = 0.2;
          djHover.add(beardStrand);
        }
        // Beard tip
        const beardTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 12), djinnDarkMat);
        beardTip.position.set(0, 1.83, 0.1);
        beardTip.rotation.x = 0.25;
        djHover.add(beardTip);

        // === GLOWING EYES (amber/gold emissive) with sand trails ===
        for (const ex of [-0.075, 0.075]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), djinnGlowDim);
          eyeGlow.position.set(ex, 2.04, 0.16);
          djHover.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), djinnGlow);
          eye.position.set(ex, 2.04, 0.18);
          djHover.add(eye);
          // Sand trails behind eyes
          for (let es = 0; es < 3; es++) {
            const eyeSandTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.006 - es * 0.001, 0.002, 0.07 + es * 0.03, 12), djinnGlowDim);
            eyeSandTrail.position.set(ex, 2.04 - es * 0.02, 0.12 - es * 0.04);
            eyeSandTrail.rotation.x = 0.4;
            djHover.add(eyeSandTrail);
          }
        }

        // === GOLDEN LIGHTNING ARCS within the sandstorm (5-6 thin emissive arcs) ===
        for (let gl = 0; gl < 6; gl++) {
          const glAng = (gl / 6) * Math.PI * 2;
          const glLen = 0.5 + (gl % 3) * 0.15;
          const goldenArc = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.002, glLen, 12), new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffbb00, emissiveIntensity: 2.5, transparent: true, opacity: 0.8 }));
          goldenArc.position.set(Math.sin(glAng) * 0.38, 0.5 + gl * 0.14, Math.cos(glAng) * 0.38);
          goldenArc.rotation.z = glAng * 0.7;
          goldenArc.rotation.x = glAng * 0.35;
          djHover.add(goldenArc);
          // Lightning branch
          const arcBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, glLen * 0.45, 10), new THREE.MeshStandardMaterial({ color: 0xffee55, emissive: 0xffdd22, emissiveIntensity: 2.0, transparent: true, opacity: 0.65 }));
          arcBranch.position.set(Math.sin(glAng) * 0.5, 0.5 + gl * 0.14 + 0.12, Math.cos(glAng) * 0.5);
          arcBranch.rotation.z = glAng * 1.0;
          arcBranch.rotation.x = -glAng * 0.45;
          djHover.add(arcBranch);
        }

        // === ANCIENT RELICS ORBITING (4 treasure shapes) ===
        const relicTypes = [
          { geo: new THREE.OctahedronGeometry(0.045, 3), pos: [0.72, 1.4, 0] },
          { geo: new THREE.BoxGeometry(0.06, 0.04, 0.05), pos: [-0.68, 1.1, 0.2] },
          { geo: new THREE.OctahedronGeometry(0.038, 2), pos: [0.2, 1.6, 0.7] },
          { geo: new THREE.BoxGeometry(0.05, 0.07, 0.04), pos: [-0.3, 0.9, -0.65] },
        ];
        for (let rl = 0; rl < 4; rl++) {
          const relicAng = (rl / 4) * Math.PI * 2;
          const relic = new THREE.Mesh(relicTypes[rl].geo, goldMat);
          relic.position.set(relicTypes[rl].pos[0], relicTypes[rl].pos[1], relicTypes[rl].pos[2]);
          relic.rotation.set(relicAng, relicAng * 0.5, relicAng * 0.3);
          djHover.add(relic);
          // Relic glow aura
          const relicAura = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8, transparent: true, opacity: 0.3 }));
          relicAura.position.set(relicTypes[rl].pos[0], relicTypes[rl].pos[1], relicTypes[rl].pos[2]);
          djHover.add(relicAura);
        }

        // === SAND DEBRIS CLOUD (many small boxes) ===
        for (let sd = 0; sd < 20; sd++) {
          const sdAng = (sd / 20) * Math.PI * 2;
          const sdR = 0.25 + (sd % 5) * 0.16;
          const debris = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.028, 0.026), new THREE.MeshStandardMaterial({ color: 0xc8a870, transparent: true, opacity: 0.28 + (sd % 3) * 0.08 }));
          debris.position.set(Math.sin(sdAng) * sdR, 0.18 + sd * 0.08, Math.cos(sdAng) * sdR);
          debris.rotation.set(sd * 0.6, sd * 0.4, sd * 0.7);
          djHover.add(debris);
        }

        // === GOLDEN CHAIN LINKS (decorative, hanging) ===
        for (let cl = 0; cl < 6; cl++) {
          const clAng = (cl / 6) * Math.PI * 2;
          const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.6 }));
          chainLink.position.set(Math.sin(clAng) * 0.24, 1.44 + cl * 0.06, Math.cos(clAng) * 0.15);
          chainLink.rotation.x = cl * 0.45;
          chainLink.rotation.z = clAng * 0.3;
          djHover.add(chainLink);
        }

        // === ETHEREAL SEMI-TRANSPARENT TORSO OVERLAY (storm showing through) ===
        const torsoEthereal = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshStandardMaterial({ color: 0xddbb55, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
        torsoEthereal.scale.set(1.15, 1.2, 1.0);
        torsoEthereal.position.y = 1.58;
        djHover.add(torsoEthereal);

        group.add(djHover);
        break;
      }

      case EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING: {
        // --- NIGHT_GRASSLAND_STAMPEDE_KING | Estimated polygons: ~353676 triangles ---
        const skMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.7 });
        const skDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a1510, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.8, metalness: 0.6 });
        const goldDarkMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.5, roughness: 0.4 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.6 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
        const furMat = new THREE.MeshStandardMaterial({ color: 0x3a2515, roughness: 0.9 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc0000, emissiveIntensity: 1.0 });
        // Massive beast body (muscular)
        const skBody = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), skMat);
        skBody.scale.set(0.85, 0.6, 1.4);
        skBody.position.y = 0.92;
        skBody.castShadow = true;
        group.add(skBody);
        // Barrel sides
        for (const sx of [-1, 1]) {
          const barrel = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skMat);
          barrel.scale.set(0.5, 0.55, 1.1);
          barrel.position.set(sx * 0.32, 0.82, 0);
          group.add(barrel);
        }
        // Golden battle armor on beast body
        const bodyArmor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 1.2), goldDarkMat);
        bodyArmor.position.set(0, 1.15, 0);
        group.add(bodyArmor);
        // Armor trim
        for (const sx of [-0.44, 0.44]) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 1.25), goldMat);
          trim.position.set(sx, 1.14, 0);
          group.add(trim);
        }
        // Armor chain links (decorative)
        for (let ch = 0; ch < 4; ch++) {
          const chain = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 66, 98), goldMat);
          chain.position.set(0.35, 1.08, -0.3 + ch * 0.25);
          chain.rotation.y = Math.PI / 2;
          group.add(chain);
        }
        // Muscular transition / human torso
        const skTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), goldMat);
        skTorso.position.set(0, 1.72, 0.35);
        group.add(skTorso);
        // Chest muscle definition
        for (const cx of [-0.1, 0.1]) {
          const pec = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), goldDarkMat);
          pec.scale.set(1.2, 0.8, 0.5);
          pec.position.set(cx, 1.78, 0.5);
          group.add(pec);
        }
        // Belly plate
        const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.04), goldDarkMat);
        bellyPlate.position.set(0, 1.5, 0.5);
        group.add(bellyPlate);
        // Massive shoulder pauldrons
        for (const sx of [-0.35, 0.35]) {
          const padBase = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), goldMat);
          padBase.scale.set(1.3, 0.7, 1.1);
          padBase.position.set(sx, 2.05, 0.35);
          group.add(padBase);
          // Pauldron spikes (3 each)
          for (let sp = 0; sp < 3; sp++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 44), goldMat);
            spike.position.set(sx * (1.1 + sp * 0.05), 2.1 + sp * 0.03, 0.35 + (sp - 1) * 0.06);
            spike.rotation.z = sx > 0 ? -0.5 - sp * 0.1 : 0.5 + sp * 0.1;
            group.add(spike);
          }
          // Pauldron gem
          const padGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 4), gemMat);
          padGem.position.set(sx * 0.95, 2.05, 0.45);
          group.add(padGem);
        }
        // Arms
        for (const ax of [-0.35, 0.35]) {
          const skArmGroup = new THREE.Group();
          skArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          skArmGroup.position.set(ax, 1.96, 0.35);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 44), skinMat);
          upperArm.position.y = -0.14;
          upperArm.rotation.z = ax < 0 ? 0.2 : -0.2;
          skArmGroup.add(upperArm);
          // Golden bracer
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.08, 44), goldMat);
          bracer.position.set(ax * 0.05, -0.24, 0);
          skArmGroup.add(bracer);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.25, 44), skinMat);
          forearm.position.set(ax * 0.1, -0.38, 0);
          skArmGroup.add(forearm);
          // Gauntlet
          const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), goldDarkMat);
          gauntlet.position.set(ax * 0.15, -0.54, 0);
          skArmGroup.add(gauntlet);
          group.add(skArmGroup);
        }
        // Head (fierce, bull-like with crown)
        const skHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skMat);
        skHead.scale.set(1, 0.95, 0.95);
        skHead.position.set(0, 2.22, 0.35);
        group.add(skHead);
        // Bull muzzle
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skMat);
        muzzle.scale.set(1.1, 0.7, 1);
        muzzle.position.set(0, 2.15, 0.52);
        group.add(muzzle);
        // Nostrils (flared with steam)
        for (const nx of [-0.04, 0.04]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), new THREE.MeshStandardMaterial({ color: 0x331111 }));
          nostril.position.set(nx, 2.14, 0.6);
          group.add(nostril);
          // Steam
          const steam = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12), new THREE.MeshStandardMaterial({
            color: 0xcccccc, transparent: true, opacity: 0.2
          }));
          steam.position.set(nx, 2.12, 0.65);
          group.add(steam);
        }
        // Massive bull horns
        for (const hx of [-0.18, 0.18]) {
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 44), new THREE.MeshStandardMaterial({ color: 0x666644 }));
          hornBase.position.set(hx, 2.32, 0.3);
          hornBase.rotation.z = hx > 0 ? -0.5 : 0.5;
          group.add(hornBase);
          const hornMid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.15, 44), new THREE.MeshStandardMaterial({ color: 0x777755 }));
          hornMid.position.set(hx * 1.5, 2.36, 0.28);
          hornMid.rotation.z = hx > 0 ? -0.9 : 0.9;
          group.add(hornMid);
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 44), goldMat);
          hornTip.position.set(hx * 1.8, 2.38, 0.3);
          hornTip.rotation.z = hx > 0 ? -1.2 : 1.2;
          group.add(hornTip);
        }
        // Grand golden crown
        const skCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.12, 44), goldMat);
        skCrown.position.set(0, 2.38, 0.35);
        group.add(skCrown);
        // Crown filigree band
        const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 66, 98), goldMat);
        crownBand.rotation.x = Math.PI / 2;
        crownBand.position.set(0, 2.35, 0.35);
        group.add(crownBand);
        // Crown spires with gems
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const isMain = i % 2 === 0;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(isMain ? 0.022 : 0.015, isMain ? 0.12 : 0.08, 44), goldMat);
          spike.position.set(Math.sin(ang) * 0.15, 2.47, 0.35 + Math.cos(ang) * 0.15);
          group.add(spike);
          if (isMain) {
            const gem = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), gemMat);
            gem.position.set(Math.sin(ang) * 0.15, 2.44, 0.35 + Math.cos(ang) * 0.15);
            group.add(gem);
          }
        }
        // Fierce glowing eyes
        const skEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 });
        for (const ex of [-0.065, 0.065]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({
            color: 0xff6622, emissive: 0xff3300, emissiveIntensity: 1.0, transparent: true, opacity: 0.5
          }));
          eyeGlow.position.set(ex, 2.24, 0.48);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), skEyeMat);
          eye.position.set(ex, 2.24, 0.5);
          group.add(eye);
        }
        // Beard (braided)
        const beardMain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.15, 44), skDarkMat);
        beardMain.position.set(0, 2.05, 0.48);
        beardMain.rotation.x = 0.2;
        group.add(beardMain);
        // Beard bead
        const beardBead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12), goldMat);
        beardBead.position.set(0, 1.97, 0.5);
        group.add(beardBead);
        // War hammer (massive, ornate) - added to right arm group
        const skRaGroup = group.getObjectByName('anim_ra') as THREE.Group;
        const hamShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 1.4, 44), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
        hamShaft.position.set(0.13, -0.41, 0);
        skRaGroup.add(hamShaft);
        // Shaft grip wraps
        for (let gw = 0; gw < 4; gw++) {
          const grip = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 66, 98), new THREE.MeshStandardMaterial({ color: 0x553311 }));
          grip.rotation.x = Math.PI / 2;
          grip.position.set(0.13, -0.96 + gw * 0.1, 0);
          skRaGroup.add(grip);
        }
        // Massive hammer head
        const hamHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), goldMat);
        hamHead.position.set(0.13, 0.29, 0);
        skRaGroup.add(hamHead);
        // Hammer face detail (impact surface)
        for (const fz of [-0.1, 0.1]) {
          const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.02), goldDarkMat);
          face.position.set(0.13, 0.29, fz);
          skRaGroup.add(face);
        }
        // Hammer rune glow
        const hamRune = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.2), new THREE.MeshStandardMaterial({
          color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8, transparent: true, opacity: 0.5
        }));
        hamRune.position.set(0.13, 0.29, 0);
        skRaGroup.add(hamRune);
        // Hammer pommel
        const hamPommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), goldMat);
        hamPommel.position.set(0.13, -1.14, 0);
        skRaGroup.add(hamPommel);
        // Beast legs (powerful, muscular with hooves)
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const legName = (i === 0 ? 'anim_f' : 'anim_b') + (side < 0 ? 'll' : 'rl');
            const skLegGroup = new THREE.Group();
            skLegGroup.name = legName;
            const legZ = i * 1.02 - 0.3;
            skLegGroup.position.set(side * 0.36, 0.74, legZ);
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.28, 44), skMat);
            thigh.position.y = -0.14;
            skLegGroup.add(thigh);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), skDarkMat);
            knee.position.y = -0.3;
            skLegGroup.add(knee);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.25, 44), skMat);
            shin.position.y = -0.46;
            skLegGroup.add(shin);
            // Fetlock fur tuft
            const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), furMat);
            fetlock.scale.y = 1.3;
            fetlock.position.y = -0.6;
            skLegGroup.add(fetlock);
            // Golden hoof
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 44), hoofMat);
            hoof.position.y = -0.7;
            skLegGroup.add(hoof);
            // Golden hoof band
            const hoofBand = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 66, 98), goldMat);
            hoofBand.rotation.x = Math.PI / 2;
            hoofBand.position.y = -0.66;
            skLegGroup.add(hoofBand);
            group.add(skLegGroup);
          }
        }
        // Flowing tail with golden ring
        const skTailGroup = new THREE.Group();
        skTailGroup.name = 'anim_tail';
        skTailGroup.position.set(0, 0.78, -0.7);
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.35, 44), skDarkMat);
        tailBase.rotation.x = 0.5;
        skTailGroup.add(tailBase);
        const tailRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 66, 98), goldMat);
        tailRing.position.set(0, -0.13, -0.1);
        skTailGroup.add(tailRing);
        for (let tt = 0; tt < 5; tt++) {
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.2, 44), skDarkMat);
          strand.position.set((tt - 2) * 0.015, -0.28, -0.18);
          strand.rotation.x = 0.3 + tt * 0.04;
          skTailGroup.add(strand);
        }
        group.add(skTailGroup);
        // Dust cloud at hooves
        for (let dc = 0; dc < 6; dc++) {
          const dust = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({
            color: 0x998866, transparent: true, opacity: 0.2
          }));
          dust.position.set(
            (Math.random() - 0.5) * 0.8,
            0.05,
            (Math.random() - 0.5) * 1.2
          );
          dust.scale.y = 0.4;
          group.add(dust);
        }
        // Dust cloud
        const dustCloudMat = new THREE.MeshStandardMaterial({ color: 0x998866, transparent: true, opacity: 0.25 });
        const dustCloud = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), dustCloudMat);
        dustCloud.scale.set(1, 0.1, 1);
        dustCloud.position.y = 0.05;
        group.add(dustCloud);
        break;
      }

      // ── DEFAULT ENEMY MESH — Generated from enemy def properties ──
      default: {
        const def = ENEMY_DEFS[type];
        const isBoss = def.isBoss;
        const enemyName = (type as string).toLowerCase();

        // Determine color theme from enemy type name
        let bodyColor = 0x885566;
        let accentColor = 0xaa6688;
        let eyeColor = 0xff4444;
        let emissiveColor = 0x441111;

        if (enemyName.indexOf('stone') >= 0 || enemyName.indexOf('granite') >= 0 || enemyName.indexOf('petrified') >= 0 || enemyName.indexOf('calcified') >= 0 || enemyName.indexOf('moss_basilisk') >= 0) {
          bodyColor = 0x777766; accentColor = 0x999988; eyeColor = 0xffff44; emissiveColor = 0x444400;
        } else if (enemyName.indexOf('spectral') >= 0 || enemyName.indexOf('ghost') >= 0 || enemyName.indexOf('phantom') >= 0 || enemyName.indexOf('spirit') >= 0 || enemyName.indexOf('ethereal') >= 0 || enemyName.indexOf('phase') >= 0 || enemyName.indexOf('ether') >= 0) {
          bodyColor = 0x8888cc; accentColor = 0xaaaaee; eyeColor = 0x88ccff; emissiveColor = 0x224488;
        } else if (enemyName.indexOf('drowned') >= 0 || enemyName.indexOf('depth') >= 0 || enemyName.indexOf('tidal') >= 0 || enemyName.indexOf('coral') >= 0 || enemyName.indexOf('abyssal') >= 0 || enemyName.indexOf('barnacle') >= 0 || enemyName.indexOf('kelp') >= 0 || enemyName.indexOf('pressure') >= 0) {
          bodyColor = 0x225566; accentColor = 0x338877; eyeColor = 0x44ffaa; emissiveColor = 0x114433;
        } else if (enemyName.indexOf('fire') >= 0 || enemyName.indexOf('scorch') >= 0 || enemyName.indexOf('drake') >= 0 || enemyName.indexOf('wyrm') >= 0 || enemyName.indexOf('magma') >= 0 || enemyName.indexOf('flame') >= 0 || enemyName.indexOf('ember') >= 0 || enemyName.indexOf('infernal') >= 0 || enemyName.indexOf('brimstone') >= 0) {
          bodyColor = 0x883311; accentColor = 0xcc5522; eyeColor = 0xff6600; emissiveColor = 0x662200;
        } else if (enemyName.indexOf('plague') >= 0 || enemyName.indexOf('sewer') >= 0 || enemyName.indexOf('bile') >= 0 || enemyName.indexOf('afflict') >= 0 || enemyName.indexOf('pestil') >= 0 || enemyName.indexOf('bloat') >= 0 || enemyName.indexOf('rot') >= 0 || enemyName.indexOf('toxic') >= 0 || enemyName.indexOf('fungal') >= 0 || enemyName.indexOf('spore') >= 0 || enemyName.indexOf('blight') >= 0 || enemyName.indexOf('cordyceps') >= 0) {
          bodyColor = 0x445511; accentColor = 0x668822; eyeColor = 0xaaff22; emissiveColor = 0x334400;
        } else if (enemyName.indexOf('rust') >= 0 || enemyName.indexOf('scrap') >= 0 || enemyName.indexOf('iron') >= 0 || enemyName.indexOf('siege') >= 0 || enemyName.indexOf('war_engine') >= 0 || enemyName.indexOf('junk') >= 0 || enemyName.indexOf('automaton') >= 0 || enemyName.indexOf('clockwork') >= 0 || enemyName.indexOf('piston') >= 0 || enemyName.indexOf('gear') >= 0 || enemyName.indexOf('brass') >= 0) {
          bodyColor = 0x665544; accentColor = 0x887766; eyeColor = 0xffaa44; emissiveColor = 0x443322;
        } else if (enemyName.indexOf('corrupt') >= 0 || enemyName.indexOf('dark') >= 0 || enemyName.indexOf('throne') >= 0 || enemyName.indexOf('herald') >= 0 || enemyName.indexOf('noble') >= 0 || enemyName.indexOf('royal') >= 0 || enemyName.indexOf('courtier') >= 0 || enemyName.indexOf('knight') >= 0 && enemyName.indexOf('plague') >= 0) {
          bodyColor = 0x442244; accentColor = 0x663366; eyeColor = 0xcc44ff; emissiveColor = 0x331133;
        } else if (enemyName.indexOf('temporal') >= 0 || enemyName.indexOf('chrono') >= 0 || enemyName.indexOf('paradox') >= 0 || enemyName.indexOf('time') >= 0 || enemyName.indexOf('timelost') >= 0 || enemyName.indexOf('entropy') >= 0) {
          bodyColor = 0x334488; accentColor = 0x4466aa; eyeColor = 0x66ccff; emissiveColor = 0x223366;
        } else if (enemyName.indexOf('eldritch') >= 0 || enemyName.indexOf('mind') >= 0 || enemyName.indexOf('nexus') >= 0 || enemyName.indexOf('dimensional') >= 0 || enemyName.indexOf('tentacle') >= 0 || enemyName.indexOf('gibbering') >= 0 || enemyName.indexOf('psychic') >= 0) {
          bodyColor = 0x330033; accentColor = 0x660066; eyeColor = 0xff00ff; emissiveColor = 0x440044;
        } else if (enemyName.indexOf('arena') >= 0 || enemyName.indexOf('gladiator') >= 0 || enemyName.indexOf('champion') >= 0 || enemyName.indexOf('colosseum') >= 0 || enemyName.indexOf('lion') >= 0 || enemyName.indexOf('pit_fighter') >= 0 || enemyName.indexOf('mirmillo') >= 0) {
          bodyColor = 0x886644; accentColor = 0xaa8866; eyeColor = 0xff8844; emissiveColor = 0x553322;
        } else if (enemyName.indexOf('canyon') >= 0 || enemyName.indexOf('raptor') >= 0 || enemyName.indexOf('cliff') >= 0 || enemyName.indexOf('nest') >= 0 || enemyName.indexOf('wyvern') >= 0) {
          bodyColor = 0x664422; accentColor = 0x885533; eyeColor = 0xff6622; emissiveColor = 0x442211;
        } else if (enemyName.indexOf('moon') >= 0 || enemyName.indexOf('lunar') >= 0 || enemyName.indexOf('fae') >= 0 || enemyName.indexOf('shadow_stag') >= 0 || enemyName.indexOf('nocturnal') >= 0 || enemyName.indexOf('thorn_fairy') >= 0) {
          bodyColor = 0x445588; accentColor = 0x6677aa; eyeColor = 0xaaccff; emissiveColor = 0x223355;
        } else if (enemyName.indexOf('reef') >= 0 || enemyName.indexOf('siren') >= 0 || enemyName.indexOf('angler') >= 0 || enemyName.indexOf('leviathan') >= 0 || enemyName.indexOf('tide') >= 0 || enemyName.indexOf('pearl') >= 0 || enemyName.indexOf('deep_sea') >= 0) {
          bodyColor = 0x115544; accentColor = 0x227766; eyeColor = 0x44ffcc; emissiveColor = 0x113322;
        } else if (enemyName.indexOf('tome') >= 0 || enemyName.indexOf('ink') >= 0 || enemyName.indexOf('scroll') >= 0 || enemyName.indexOf('curator') >= 0 || enemyName.indexOf('grimoire') >= 0 || enemyName.indexOf('quill') >= 0 || enemyName.indexOf('paper') >= 0 || enemyName.indexOf('rune') >= 0) {
          bodyColor = 0x554433; accentColor = 0x776655; eyeColor = 0x44aaff; emissiveColor = 0x332211;
        } else if (enemyName.indexOf('jade') >= 0 || enemyName.indexOf('temple') >= 0 || enemyName.indexOf('vine') >= 0 || enemyName.indexOf('jungle') >= 0 || enemyName.indexOf('idol') >= 0) {
          bodyColor = 0x336633; accentColor = 0x448844; eyeColor = 0x44ff88; emissiveColor = 0x224422;
        } else if (enemyName.indexOf('fallen') >= 0 || enemyName.indexOf('war_specter') >= 0 || enemyName.indexOf('siege_wraith') >= 0 || enemyName.indexOf('ashen') >= 0 || enemyName.indexOf('dread') >= 0 || enemyName.indexOf('carrion') >= 0 || enemyName.indexOf('war_drum') >= 0) {
          bodyColor = 0x554444; accentColor = 0x776666; eyeColor = 0xff4444; emissiveColor = 0x332222;
        } else if (enemyName.indexOf('obsidian') >= 0 || enemyName.indexOf('hellfire') >= 0 || enemyName.indexOf('inquisitor') >= 0 || enemyName.indexOf('doom') >= 0) {
          bodyColor = 0x111111; accentColor = 0x333333; eyeColor = 0xff4400; emissiveColor = 0x220000;
        } else if (enemyName.indexOf('star') >= 0 || enemyName.indexOf('astral') >= 0 || enemyName.indexOf('comet') >= 0 || enemyName.indexOf('void_monk') >= 0 || enemyName.indexOf('celestial') >= 0 || enemyName.indexOf('nova') >= 0 || enemyName.indexOf('constellation') >= 0 || enemyName.indexOf('gravity') >= 0) {
          bodyColor = 0x222255; accentColor = 0x4444aa; eyeColor = 0xffffaa; emissiveColor = 0x222266;
        } else if (enemyName.indexOf('pit_fiend') >= 0 || enemyName.indexOf('hellborn') >= 0 || enemyName.indexOf('soul_collector') >= 0 || enemyName.indexOf('demon') >= 0 || enemyName.indexOf('chain_devil') >= 0 || enemyName.indexOf('wrath') >= 0) {
          bodyColor = 0x551111; accentColor = 0x882222; eyeColor = 0xff2200; emissiveColor = 0x440000;
        } else if (enemyName.indexOf('reality') >= 0 || enemyName.indexOf('dimension') >= 0 || enemyName.indexOf('void_titan') >= 0 || enemyName.indexOf('antimatter') >= 0 || enemyName.indexOf('fracture') >= 0 || enemyName.indexOf('paradox_shade') >= 0) {
          bodyColor = 0x110022; accentColor = 0x330044; eyeColor = 0xcc44ff; emissiveColor = 0x220033;
        } else if (enemyName.indexOf('bog') >= 0 || enemyName.indexOf('marsh') >= 0 || enemyName.indexOf('swamp') >= 0 || enemyName.indexOf('toad') >= 0 || enemyName.indexOf('hydra') >= 0 || enemyName.indexOf('fen') >= 0 || enemyName.indexOf('mire') >= 0 || enemyName.indexOf('leech') >= 0) {
          bodyColor = 0x334422; accentColor = 0x556633; eyeColor = 0xaaff44; emissiveColor = 0x223311;
        } else if (enemyName.indexOf('crystal') >= 0 || enemyName.indexOf('gem') >= 0 || enemyName.indexOf('cave_bat') >= 0 || enemyName.indexOf('quartz') >= 0 || enemyName.indexOf('prismatic') >= 0 || enemyName.indexOf('shard') >= 0 || enemyName.indexOf('geode') >= 0) {
          bodyColor = 0x556688; accentColor = 0x7788aa; eyeColor = 0x88ddff; emissiveColor = 0x334466;
        } else if (enemyName.indexOf('frost') >= 0 || enemyName.indexOf('ice') >= 0 || enemyName.indexOf('yeti') >= 0 || enemyName.indexOf('frozen') >= 0 || enemyName.indexOf('glacial') >= 0 || enemyName.indexOf('permafrost') >= 0 || enemyName.indexOf('blizzard') >= 0 || enemyName.indexOf('troll') >= 0) {
          bodyColor = 0x667788; accentColor = 0x88aacc; eyeColor = 0x88eeff; emissiveColor = 0x334455;
        } else if (enemyName.indexOf('gargoyle') >= 0 || enemyName.indexOf('cursed_priest') >= 0 || enemyName.indexOf('shadow_acolyte') >= 0 || enemyName.indexOf('cathedral') >= 0 || enemyName.indexOf('bell') >= 0 || enemyName.indexOf('desecrated') >= 0 || enemyName.indexOf('stained_glass') >= 0) {
          bodyColor = 0x444455; accentColor = 0x666677; eyeColor = 0xffaa44; emissiveColor = 0x222233;
        } else if (enemyName.indexOf('thorn') >= 0 || enemyName.indexOf('blight_sprite') >= 0 || enemyName.indexOf('rotwood') >= 0 || enemyName.indexOf('briar') >= 0 || enemyName.indexOf('nettle') >= 0) {
          bodyColor = 0x443322; accentColor = 0x665544; eyeColor = 0x88ff44; emissiveColor = 0x332211;
        } else if (enemyName.indexOf('blood') >= 0 || enemyName.indexOf('crimson') >= 0 || enemyName.indexOf('scarlet') >= 0 || enemyName.indexOf('vampire') >= 0) {
          bodyColor = 0x551122; accentColor = 0x882244; eyeColor = 0xff2244; emissiveColor = 0x440011;
        } else if (enemyName.indexOf('storm') >= 0 || enemyName.indexOf('thunder') >= 0 || enemyName.indexOf('lightning') >= 0 || enemyName.indexOf('wind') >= 0 || enemyName.indexOf('tempest') >= 0 || enemyName.indexOf('gale') >= 0 || enemyName.indexOf('static') >= 0) {
          bodyColor = 0x334466; accentColor = 0x5566aa; eyeColor = 0x44ccff; emissiveColor = 0x223344;
        } else if (enemyName.indexOf('nightmare') >= 0 || enemyName.indexOf('dread') >= 0 || enemyName.indexOf('shadow') >= 0 || enemyName.indexOf('fear') >= 0 || enemyName.indexOf('umbral') >= 0 || enemyName.indexOf('void_echo') >= 0) {
          bodyColor = 0x111122; accentColor = 0x222244; eyeColor = 0x8844ff; emissiveColor = 0x110022;
        } else if (enemyName.indexOf('abyss') >= 0 || enemyName.indexOf('void') >= 0 || enemyName.indexOf('chaos') >= 0 || enemyName.indexOf('primordial') >= 0 || enemyName.indexOf('null') >= 0 || enemyName.indexOf('genesis') >= 0) {
          bodyColor = 0x0a0a1a; accentColor = 0x222244; eyeColor = 0xff44ff; emissiveColor = 0x110022;
        }

        // Night boss color overrides
        if (enemyName.indexOf('night_') === 0) {
          emissiveColor = 0x440000;
          eyeColor = 0xff0000;
        }

        // --- Upgraded PBR materials for realistic look ---
        const bodyMat = new THREE.MeshPhysicalMaterial({
          color: bodyColor, roughness: 0.65, metalness: 0.05,
          sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(accentColor),
          clearcoat: 0.1, clearcoatRoughness: 0.8,
        });
        const accentMat = new THREE.MeshPhysicalMaterial({
          color: accentColor, roughness: 0.5, metalness: 0.25,
          clearcoat: 0.3, clearcoatRoughness: 0.4,
          sheen: 0.2, sheenRoughness: 0.5, sheenColor: new THREE.Color(eyeColor),
        });
        const armorMat = new THREE.MeshPhysicalMaterial({
          color: accentColor, roughness: 0.3, metalness: 0.7,
          clearcoat: 0.5, clearcoatRoughness: 0.2,
          reflectivity: 0.8,
        });
        const eyeMat = new THREE.MeshPhysicalMaterial({
          color: eyeColor, emissive: eyeColor, emissiveIntensity: 2.0,
          roughness: 0.05, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.0,
        });
        const emissiveMat = new THREE.MeshPhysicalMaterial({
          color: accentColor, emissive: emissiveColor, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.35, roughness: 0.3,
          transmission: 0.4, thickness: 0.5,
        });
        const skinMat = new THREE.MeshPhysicalMaterial({
          color: bodyColor, roughness: 0.7, metalness: 0.0,
          sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(bodyColor).offsetHSL(0, 0, 0.2),
          clearcoat: 0.05, clearcoatRoughness: 0.9,
        });

        if (isBoss) {
          // --- Large imposing boss with detailed anatomy ---
          // Muscular torso with layered geometry
          const torso = new THREE.Mesh(new THREE.SphereGeometry(0.5, 83, 57), bodyMat);
          torso.scale.set(1.0, 1.3, 0.75);
          torso.position.y = 1.2;
          torso.castShadow = true;
          group.add(torso);

          // Ribcage/chest definition plates
          for (let r = 0; r < 4; r++) {
            const ribGeo = new THREE.TorusGeometry(0.35 - r * 0.03, 0.018, 66, 98, Math.PI);
            const rib = new THREE.Mesh(ribGeo, skinMat);
            rib.position.set(0, 1.35 - r * 0.08, 0.02);
            rib.rotation.y = Math.PI;
            group.add(rib);
          }

          // Abdomen
          const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 59), bodyMat);
          abdomen.position.y = 0.88;
          abdomen.castShadow = true;
          group.add(abdomen);

          // Shoulder guards with layered plates
          for (const sx of [-0.45, 0.45]) {
            const pad = new THREE.Mesh(new THREE.SphereGeometry(0.2, 106, 57), armorMat);
            pad.scale.set(1.3, 0.7, 1.1);
            pad.position.set(sx, 1.6, 0);
            pad.castShadow = true;
            group.add(pad);
            // Layered pauldron plates
            for (let pl = 0; pl < 3; pl++) {
              const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12 - pl * 0.02, 0.02, 0.14 - pl * 0.02), armorMat);
              plate.position.set(sx * (1.0 + pl * 0.04), 1.65 - pl * 0.04, 0);
              plate.rotation.z = sx > 0 ? -0.4 : 0.4;
              group.add(plate);
            }
            // Shoulder spikes with tapered tips
            for (let sp = 0; sp < 3; sp++) {
              const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035 - sp * 0.005, 0.2 - sp * 0.03, 59), accentMat);
              spike.position.set(sx * (1.1 + sp * 0.08), 1.72 + sp * 0.04, (sp - 1) * 0.08);
              spike.rotation.z = sx > 0 ? -0.6 : 0.6;
              spike.castShadow = true;
              group.add(spike);
            }
          }

          // Neck muscles
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 59), bodyMat);
          neck.position.set(0, 1.75, 0);
          group.add(neck);

          // Head with jaw
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 83, 57), bodyMat);
          head.position.set(0, 1.95, 0);
          head.castShadow = true;
          group.add(head);
          // Jaw
          const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.16), skinMat);
          jaw.position.set(0, 1.82, 0.08);
          group.add(jaw);
          // Brow ridge
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.08), bodyMat);
          brow.position.set(0, 2.02, 0.14);
          group.add(brow);

          // Crown/horns with ridges
          for (const hx of [-0.15, 0.15]) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 59), accentMat);
            horn.position.set(hx, 2.2, 0);
            horn.rotation.z = hx > 0 ? -0.3 : 0.3;
            horn.castShadow = true;
            group.add(horn);
            // Horn ridges
            for (let hr = 0; hr < 4; hr++) {
              const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.04 - hr * 0.006, 0.006, 66, 98), accentMat);
              ridge.position.set(hx + (hx > 0 ? -1 : 1) * hr * 0.015, 2.08 + hr * 0.06, 0);
              ridge.rotation.x = Math.PI / 2;
              group.add(ridge);
            }
          }

          // Eyes with inner glow
          for (const ex of [-0.08, 0.08]) {
            const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 39, 36), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.9 }));
            eyeSocket.position.set(ex, 1.97, 0.16);
            group.add(eyeSocket);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 39, 36), eyeMat);
            eye.position.set(ex, 1.97, 0.19);
            group.add(eye);
            // Pupil slit
            const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.005), new THREE.MeshPhysicalMaterial({ color: 0x000000 }));
            pupil.position.set(ex, 1.97, 0.23);
            group.add(pupil);
          }

          // Muscular arms with forearm wraps
          for (const ax of [-0.5, 0.5]) {
            // Upper arm
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 39), bodyMat);
            upperArm.position.set(ax, 1.35, 0);
            upperArm.rotation.z = ax > 0 ? -0.2 : 0.2;
            upperArm.castShadow = true;
            group.add(upperArm);
            // Elbow joint
            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 36, 30), skinMat);
            elbow.position.set(ax * 1.05, 1.15, 0);
            group.add(elbow);
            // Forearm
            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 39), bodyMat);
            forearm.position.set(ax * 1.1, 0.95, 0);
            forearm.rotation.z = ax > 0 ? -0.1 : 0.1;
            group.add(forearm);
            // Forearm wraps
            for (let w = 0; w < 3; w++) {
              const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 27, 35), accentMat);
              wrap.position.set(ax * 1.1, 0.85 + w * 0.06, 0);
              wrap.rotation.x = Math.PI / 2;
              group.add(wrap);
            }
            // Fists with knuckle detail
            const fist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 39, 36), skinMat);
            fist.position.set(ax * 1.15, 0.78, 0);
            group.add(fist);
            for (let k = 0; k < 4; k++) {
              const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.02, 27, 27), skinMat);
              knuckle.position.set(ax * 1.15 + (k - 1.5) * 0.025, 0.78, 0.07);
              group.add(knuckle);
            }
          }

          // Legs with knee guards
          for (const lx of [-0.2, 0.2]) {
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 39), bodyMat);
            thigh.position.set(lx, 0.58, 0);
            thigh.castShadow = true;
            group.add(thigh);
            // Knee guard
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 36, 30), armorMat);
            knee.position.set(lx, 0.42, 0.06);
            knee.scale.set(0.8, 1, 0.6);
            group.add(knee);
            // Shin
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 39), bodyMat);
            shin.position.set(lx, 0.25, 0);
            group.add(shin);
            // Armored boot
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.22), armorMat);
            boot.position.set(lx, 0.08, 0.03);
            boot.castShadow = true;
            group.add(boot);
            // Boot toe guard
            const toeGuard = new THREE.Mesh(new THREE.SphereGeometry(0.05, 36, 27, 0, Math.PI), armorMat);
            toeGuard.position.set(lx, 0.08, 0.14);
            toeGuard.rotation.x = -Math.PI / 2;
            group.add(toeGuard);
          }

          // Belt with skull buckle
          const belt = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 33, 66), armorMat);
          belt.rotation.x = Math.PI / 2;
          belt.position.y = 0.88;
          group.add(belt);
          const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 2), eyeMat);
          buckle.position.set(0, 0.88, 0.32);
          group.add(buckle);

          // Back spines
          for (let s = 0; s < 5; s++) {
            const spine = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12 + s * 0.02, 30), accentMat);
            spine.position.set(0, 1.0 + s * 0.15, -0.28);
            spine.rotation.x = 0.4;
            group.add(spine);
          }

          // Aura glow (layered for depth)
          const aura = new THREE.Mesh(new THREE.SphereGeometry(0.9, 46, 39), emissiveMat);
          aura.position.y = 1.2;
          group.add(aura);
          const innerAura = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshPhysicalMaterial({
            color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.15, transmission: 0.6,
          }));
          innerAura.position.y = 1.2;
          group.add(innerAura);

          // Boss point light
          const bLight = new THREE.PointLight(eyeColor, 1.5, 10);
          bLight.position.set(0, 1.5, 0);
          group.add(bLight);
        } else {
          // --- Standard enemy with improved anatomy ---
          // Torso with subtle chest shape
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.48, 39), bodyMat);
          body.position.y = 0.72;
          body.castShadow = true;
          group.add(body);
          // Chest plate / armor layer
          const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.04), accentMat);
          chestPlate.position.set(0, 0.82, 0.08);
          group.add(chestPlate);

          // Neck
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.08, 36), skinMat);
          neck.position.y = 0.98;
          group.add(neck);

          // Head with features
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 62, 39), skinMat);
          head.position.y = 1.12;
          head.castShadow = true;
          group.add(head);
          // Brow ridge
          const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.04), bodyMat);
          browRidge.position.set(0, 1.17, 0.09);
          group.add(browRidge);

          // Eyes with sockets
          for (const ex of [-0.04, 0.04]) {
            const socket = new THREE.Mesh(new THREE.SphereGeometry(0.03, 36, 30), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.9 }));
            socket.position.set(ex, 1.14, 0.09);
            group.add(socket);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 36, 30), eyeMat);
            eye.position.set(ex, 1.14, 0.11);
            group.add(eye);
          }

          // Nose hint
          const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 27), skinMat);
          nose.position.set(0, 1.1, 0.13);
          nose.rotation.x = -0.3;
          group.add(nose);

          // Arms with elbows
          for (const ax of [-0.2, 0.2]) {
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.2, 36), bodyMat);
            upperArm.position.set(ax, 0.82, 0);
            upperArm.rotation.z = ax > 0 ? -0.15 : 0.15;
            upperArm.castShadow = true;
            group.add(upperArm);
            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 30, 27), skinMat);
            elbow.position.set(ax * 1.1, 0.7, 0);
            group.add(elbow);
            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.18, 36), skinMat);
            forearm.position.set(ax * 1.1, 0.58, 0);
            group.add(forearm);
            // Hand
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 30, 27), skinMat);
            hand.position.set(ax * 1.1, 0.48, 0);
            group.add(hand);
          }

          // Legs with knees and boots
          for (const lx of [-0.07, 0.07]) {
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.2, 36), bodyMat);
            thigh.position.set(lx, 0.38, 0);
            thigh.castShadow = true;
            group.add(thigh);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.04, 30, 27), accentMat);
            knee.position.set(lx, 0.28, 0.02);
            group.add(knee);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.18, 36), bodyMat);
            shin.position.set(lx, 0.16, 0);
            group.add(shin);
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), accentMat);
            boot.position.set(lx, 0.06, 0.02);
            boot.castShadow = true;
            group.add(boot);
          }

          // Weapon indicator based on behavior
          if (def.behavior === EnemyBehavior.RANGED || (def.attackRange && def.attackRange > 5)) {
            // Detailed staff/wand
            const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.65, 36), new THREE.MeshPhysicalMaterial({
              color: 0x553322, roughness: 0.85, metalness: 0.0,
            }));
            staff.position.set(0.22, 0.72, 0);
            group.add(staff);
            const staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 39, 36), eyeMat);
            staffOrb.position.set(0.22, 1.06, 0);
            group.add(staffOrb);
            // Orb glow
            const orbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 36, 30), new THREE.MeshPhysicalMaterial({
              color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.4,
              transparent: true, opacity: 0.2, transmission: 0.5,
            }));
            orbGlow.position.set(0.22, 1.06, 0);
            group.add(orbGlow);
            // Staff wrappings
            for (let sw = 0; sw < 2; sw++) {
              const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 27, 35), accentMat);
              wrap.position.set(0.22, 0.5 + sw * 0.15, 0);
              wrap.rotation.x = Math.PI / 2;
              group.add(wrap);
            }
          } else if (def.behavior === EnemyBehavior.SHIELDED) {
            // Detailed shield with boss/emblem
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.17), armorMat);
            shield.position.set(-0.24, 0.72, 0.05);
            group.add(shield);
            const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.04, 39), eyeMat);
            emblem.position.set(-0.265, 0.72, 0.14);
            group.add(emblem);
            const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 27, 49), armorMat);
            shieldRim.position.set(-0.265, 0.72, 0.14);
            group.add(shieldRim);
            // Sword with guard and pommel
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.025), new THREE.MeshPhysicalMaterial({ color: 0xbbbbcc, metalness: 0.8, roughness: 0.15, clearcoat: 0.6 }));
            blade.position.set(0.24, 0.78, 0);
            group.add(blade);
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), armorMat);
            guard.position.set(0.24, 0.6, 0);
            group.add(guard);
            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 30, 27), accentMat);
            pommel.position.set(0.24, 0.56, 0);
            group.add(pommel);
          } else if (def.behavior === EnemyBehavior.HEALER) {
            // Glowing orb hands with energy tendrils
            for (const hx of [-0.22, 0.22]) {
              const healOrb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 39, 36), emissiveMat);
              healOrb.position.set(hx, 0.48, 0);
              group.add(healOrb);
              const healGlow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 36, 30), new THREE.MeshPhysicalMaterial({
                color: emissiveColor, emissive: emissiveColor, emissiveIntensity: 0.5,
                transparent: true, opacity: 0.15, transmission: 0.6,
              }));
              healGlow.position.set(hx, 0.48, 0);
              group.add(healGlow);
            }
            // Healer circlet
            const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.01, 27, 49), eyeMat);
            circlet.position.y = 1.22;
            circlet.rotation.x = Math.PI / 2;
            group.add(circlet);
          } else {
            // Detailed melee weapon
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.025), new THREE.MeshPhysicalMaterial({
              color: 0xbbbbcc, metalness: 0.8, roughness: 0.15, clearcoat: 0.5,
            }));
            blade.position.set(0.24, 0.72, 0);
            group.add(blade);
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 36), new THREE.MeshPhysicalMaterial({
              color: 0x553322, roughness: 0.8,
            }));
            hilt.position.set(0.24, 0.55, 0);
            group.add(hilt);
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.025), accentMat);
            guard.position.set(0.24, 0.57, 0);
            group.add(guard);
          }

          // Accent belt/waist with buckle
          const belt = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 33, 49), accentMat);
          belt.rotation.x = Math.PI / 2;
          belt.position.y = 0.52;
          group.add(belt);
          const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.015), armorMat);
          beltBuckle.position.set(0, 0.52, 0.15);
          group.add(beltBuckle);

          // Subtle enemy point light for visibility
          const ePt = new THREE.PointLight(eyeColor, 0.3, 4);
          ePt.position.set(0, 1.0, 0);
          group.add(ePt);
        }
        break;
      }
    }
    return true;
}
