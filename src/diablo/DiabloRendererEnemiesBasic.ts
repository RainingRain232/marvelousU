import * as THREE from 'three';
import { EnemyType } from './DiabloTypes';

/** Build enemy mesh for basic/forest/undead enemies. Returns true if type was handled. */
export function createBasicEnemyMesh(type: EnemyType, _scale: number, group: THREE.Group): boolean {
    switch (type) {
      case EnemyType.WOLF: {
        // --- WOLF | Estimated polygons: ~52000 triangles ---
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.8 });
        const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.85 });
        const wolfToothMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
        const wolfNoseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
        const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xcc8888, roughness: 0.7 });
        const wolfEyeMat = new THREE.MeshStandardMaterial({ color: 0x99ff44, emissive: 0x99ff44, emissiveIntensity: 1.0 });
        const wolfPupilMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
        const wolfClawMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.4, metalness: 0.2 });

        // Organic body: ribcage sphere
        const ribcage = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), bodyMat);
        ribcage.position.set(0, 0.52, 0.18);
        ribcage.scale.set(1.0, 0.85, 1.2);
        ribcage.castShadow = true;
        group.add(ribcage);

        // Hip sphere
        const hipSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), bodyMat);
        hipSphere.position.set(0, 0.48, -0.28);
        hipSphere.scale.set(0.9, 0.8, 1.0);
        group.add(hipSphere);

        // Spine connector cylinder
        const wolfSpineGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.5, 16);
        const wolfSpine = new THREE.Mesh(wolfSpineGeo, bodyMat);
        wolfSpine.position.set(0, 0.5, -0.05);
        wolfSpine.rotation.x = Math.PI / 2;
        group.add(wolfSpine);

        // Shoulder muscles
        for (let side = -1; side <= 1; side += 2) {
          const shoulderMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), bodyMat);
          shoulderMuscle.position.set(side * 0.28, 0.58, 0.22);
          group.add(shoulderMuscle);
        }

        // Thigh muscles
        for (let side = -1; side <= 1; side += 2) {
          const thighMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), bodyMat);
          thighMuscle.position.set(side * 0.22, 0.5, -0.3);
          group.add(thighMuscle);
        }

        // Neck
        const wolfNeckGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.25, 16);
        const wolfNeck = new THREE.Mesh(wolfNeckGeo, bodyMat);
        wolfNeck.position.set(0, 0.62, 0.38);
        wolfNeck.rotation.x = -0.35;
        group.add(wolfNeck);

        // Neck ruff — ring of angled fur planes
        for (let ri = 0; ri < 12; ri++) {
          const ruffAngle = (ri / 12) * Math.PI * 2;
          const ruffGeo = new THREE.BoxGeometry(0.06, 0.14, 0.02);
          const ruff = new THREE.Mesh(ruffGeo, darkFurMat);
          ruff.position.set(Math.cos(ruffAngle) * 0.17, 0.62, 0.38 + Math.sin(ruffAngle) * 0.14);
          ruff.rotation.z = ruffAngle;
          ruff.rotation.y = ruffAngle * 0.3;
          group.add(ruff);
        }

        // Fur tufts along spine and body (22 tufts)
        const wolfFurData: [number, number, number, number][] = [
          [0, 0.82, 0.22, 0], [0.06, 0.83, 0.1, 0.15], [-0.06, 0.83, 0.1, -0.15],
          [0, 0.80, 0.0, 0], [0.05, 0.79, -0.1, 0.1], [-0.05, 0.79, -0.1, -0.1],
          [0, 0.78, -0.2, 0], [0.04, 0.77, -0.3, 0.08], [-0.04, 0.77, -0.3, -0.08],
          [0.14, 0.75, 0.2, 0.3], [-0.14, 0.75, 0.2, -0.3],
          [0.12, 0.74, 0.0, 0.25], [-0.12, 0.74, 0.0, -0.25],
          [0.10, 0.73, -0.15, 0.2], [-0.10, 0.73, -0.15, -0.2],
          [0.18, 0.70, 0.15, 0.35], [-0.18, 0.70, 0.15, -0.35],
          [0, 0.84, 0.35, 0], [0.08, 0.82, 0.28, 0.12], [-0.08, 0.82, 0.28, -0.12],
          [0, 0.76, -0.38, 0], [0, 0.75, -0.45, 0.05],
        ];
        for (const [fx, fy, fz, frz] of wolfFurData) {
          const fh = 0.06 + Math.abs(frz) * 0.04;
          const furGeo = new THREE.BoxGeometry(0.025, fh, 0.015);
          const fur = new THREE.Mesh(furGeo, darkFurMat);
          fur.position.set(fx, fy, fz);
          fur.rotation.z = frz;
          group.add(fur);
        }

        // Head (wider skull)
        const wolfSkull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), bodyMat);
        wolfSkull.position.set(0, 0.68, 0.52);
        wolfSkull.scale.set(1.1, 0.95, 1.0);
        group.add(wolfSkull);

        // Snout
        const wolfSnoutGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.25, 16);
        const wolfSnout = new THREE.Mesh(wolfSnoutGeo, bodyMat);
        wolfSnout.position.set(0, 0.64, 0.7);
        wolfSnout.rotation.x = Math.PI / 2;
        group.add(wolfSnout);

        // Nose
        const wolfNoseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), wolfNoseMat);
        wolfNoseMesh.position.set(0, 0.64, 0.83);
        group.add(wolfNoseMesh);

        // Nostrils
        for (let side = -1; side <= 1; side += 2) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), wolfNoseMat);
          nostril.position.set(side * 0.025, 0.635, 0.82);
          group.add(nostril);
        }

        // Upper teeth (5)
        for (let t = 0; t < 5; t++) {
          const toothH = (t === 1 || t === 3) ? 0.07 : 0.05;
          const upperTooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, toothH, 8), wolfToothMat);
          upperTooth.position.set(-0.06 + t * 0.03, 0.615, 0.77);
          upperTooth.rotation.x = Math.PI;
          group.add(upperTooth);
        }

        // Lower jaw group with teeth
        const wolfJawGroup = new THREE.Group();
        wolfJawGroup.name = 'anim_jaw_wolf';
        wolfJawGroup.position.set(0, 0.63, 0.7);
        const wolfLowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.2), bodyMat);
        wolfLowerJaw.position.set(0, -0.03, 0.04);
        wolfJawGroup.add(wolfLowerJaw);
        for (let t = 0; t < 5; t++) {
          const ltoothH = (t === 1 || t === 3) ? 0.065 : 0.045;
          const lowerTooth = new THREE.Mesh(new THREE.ConeGeometry(0.011, ltoothH, 8), wolfToothMat);
          lowerTooth.position.set(-0.06 + t * 0.03, 0.0, 0.1);
          wolfJawGroup.add(lowerTooth);
        }
        group.add(wolfJawGroup);

        // Ears with inner cone detail
        for (let side = -1; side <= 1; side += 2) {
          const wolfEarGeo = new THREE.ConeGeometry(0.07, 0.16, 12);
          const wolfEar = new THREE.Mesh(wolfEarGeo, bodyMat);
          wolfEar.position.set(side * 0.13, 0.85, 0.48);
          wolfEar.rotation.z = side * 0.15;
          group.add(wolfEar);
          const innerEarGeo = new THREE.ConeGeometry(0.04, 0.10, 12);
          const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
          innerEar.position.set(side * 0.13, 0.85, 0.485);
          innerEar.rotation.z = side * 0.15;
          group.add(innerEar);
        }

        // Glowing eyes with pupils
        for (let side = -1; side <= 1; side += 2) {
          const wolfEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), wolfEyeMat);
          wolfEye.position.set(side * 0.1, 0.70, 0.66);
          group.add(wolfEye);
          const wolfPupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), wolfPupilMat);
          wolfPupil.position.set(side * 0.1, 0.70, 0.693);
          group.add(wolfPupil);
        }

        // Bushy tail with 6 segments and fur tufts
        const wolfTailGroup = new THREE.Group();
        wolfTailGroup.name = 'anim_tail';
        wolfTailGroup.position.set(0, 0.48, -0.52);
        for (let ti = 0; ti < 6; ti++) {
          const tr0 = Math.max(0.055 - ti * 0.006, 0.01);
          const tr1 = Math.max(0.045 - ti * 0.005, 0.01);
          const tailSegGeo = new THREE.CylinderGeometry(tr0, tr1, 0.22, 12);
          const tailSeg = new THREE.Mesh(tailSegGeo, bodyMat);
          tailSeg.position.set(0, 0.06 + ti * 0.05, -ti * 0.07);
          tailSeg.rotation.x = -0.5 - ti * 0.18;
          wolfTailGroup.add(tailSeg);
          // Three fur tufts per segment
          for (let tf = 0; tf < 3; tf++) {
            const tfAngle = (tf / 3) * Math.PI * 2;
            const tFurGeo = new THREE.BoxGeometry(0.018, 0.07, 0.012);
            const tFur = new THREE.Mesh(tFurGeo, darkFurMat);
            tFur.position.set(Math.cos(tfAngle) * (tr0 + 0.015), 0.06 + ti * 0.05, -ti * 0.07 + Math.sin(tfAngle) * 0.02);
            tFur.rotation.z = tfAngle;
            wolfTailGroup.add(tFur);
          }
        }
        group.add(wolfTailGroup);

        // Enhanced legs: upper + lower + paw with toe bumps + claws
        const wolfLegNames = ['anim_fll', 'anim_frl', 'anim_bll', 'anim_brl'];
        const wolfLegPos: [number, number, number][] = [
          [-0.22, 0.38, 0.28], [0.22, 0.38, 0.28],
          [-0.20, 0.38, -0.28], [0.20, 0.38, -0.28],
        ];
        for (let li = 0; li < 4; li++) {
          const wolfLegGroup = new THREE.Group();
          wolfLegGroup.name = wolfLegNames[li];
          wolfLegGroup.position.set(...wolfLegPos[li]);

          const wolfUpperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.22, 12), bodyMat);
          wolfUpperLeg.position.y = -0.11;
          wolfLegGroup.add(wolfUpperLeg);

          const wolfLowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.2, 12), bodyMat);
          wolfLowerLeg.position.y = -0.32;
          wolfLegGroup.add(wolfLowerLeg);

          const wolfPaw = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.12), bodyMat);
          wolfPaw.position.set(0, -0.44, 0.025);
          wolfLegGroup.add(wolfPaw);

          // Toe bumps and claws (3 per paw)
          for (let toe = -1; toe <= 1; toe++) {
            const toeBump = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), bodyMat);
            toeBump.position.set(toe * 0.028, -0.43, 0.07);
            wolfLegGroup.add(toeBump);
            const wolfClaw = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.025, 12), wolfClawMat);
            wolfClaw.position.set(toe * 0.028, -0.445, 0.1);
            wolfClaw.rotation.x = Math.PI / 2;
            wolfLegGroup.add(wolfClaw);
          }
          group.add(wolfLegGroup);
        }
        break;
      }

      case EnemyType.BANDIT: {
        // --- BANDIT | Estimated polygons: ~48000 triangles ---
        const bMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
        const bHeadMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
        const bCapMat = new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 });
        const bScarMat = new THREE.MeshStandardMaterial({ color: 0xaa3333, roughness: 0.9 });
        const bBeltMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
        const bBootMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.9 });
        const bMetalMat = new THREE.MeshStandardMaterial({ color: 0x888877, metalness: 0.5, roughness: 0.4 });
        const bDaggerMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.8, roughness: 0.2 });
        const bVestMat = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.9 });
        const bCloakMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.95, side: THREE.DoubleSide });
        const bWrapMat = new THREE.MeshStandardMaterial({ color: 0x7a5535, roughness: 0.9 });
        const bStubbleMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.95 });

        // Inner shirt
        const bShirt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.23), bMat);
        bShirt.position.y = 1.1;
        bShirt.castShadow = true;
        group.add(bShirt);

        // Outer leather vest (slightly wider)
        const bVest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.25), bVestMat);
        bVest.position.y = 1.1;
        group.add(bVest);

        // Vest shoulder straps
        for (let side = -1; side <= 1; side += 2) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.26), bVestMat);
          strap.position.set(side * 0.175, 1.33, 0);
          group.add(strap);
        }

        // Head
        const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), bHeadMat);
        bHead.position.y = 1.5;
        group.add(bHead);

        // Ears
        for (let side = -1; side <= 1; side += 2) {
          const bEar = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), bHeadMat);
          bEar.position.set(side * 0.148, 1.5, 0.0);
          group.add(bEar);
        }

        // Nose
        const bNoseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 8), bHeadMat);
        bNoseMesh.position.set(0, 1.49, 0.145);
        bNoseMesh.rotation.x = Math.PI / 2;
        group.add(bNoseMesh);

        // Stubble (small dark dots on chin)
        for (let si = 0; si < 8; si++) {
          const sx = (Math.random() - 0.5) * 0.1;
          const sy = 1.42 + Math.random() * 0.04;
          const sz = 0.13 + Math.random() * 0.02;
          const stubble = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), bStubbleMat);
          stubble.position.set(sx, sy, sz);
          group.add(stubble);
        }

        // Leather cap with brim
        const bCapGeo = new THREE.SphereGeometry(0.16, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
        const bCap = new THREE.Mesh(bCapGeo, bCapMat);
        bCap.position.y = 1.52;
        group.add(bCap);
        // Cap brim
        const bBrimGeo = new THREE.CylinderGeometry(0.195, 0.19, 0.025, 20);
        const bBrim = new THREE.Mesh(bBrimGeo, bCapMat);
        bBrim.position.y = 1.51;
        group.add(bBrim);
        // Cap stitching lines (thin boxes)
        for (let si = 0; si < 4; si++) {
          const sAngle = (si / 4) * Math.PI;
          const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.1, 0.005), bBeltMat);
          stitch.position.set(Math.cos(sAngle) * 0.145, 1.6, Math.sin(sAngle) * 0.1);
          stitch.rotation.z = sAngle + Math.PI / 2;
          group.add(stitch);
        }

        // Scar (more prominent, double line)
        const bScar1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.012), bScarMat);
        bScar1.position.set(0, 1.52, 0.14);
        bScar1.rotation.z = 0.3;
        group.add(bScar1);
        const bScar2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.01), bScarMat);
        bScar2.position.set(0.01, 1.50, 0.142);
        bScar2.rotation.z = 0.3;
        group.add(bScar2);

        // Bandana/necklace detail
        const bBandana = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.155, 0.03, 16), bBeltMat);
        bBandana.position.y = 1.35;
        group.add(bBandana);

        // Belt with buckle and 4 pouches + throwing knives
        const bBelt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.055, 0.27), bBeltMat);
        bBelt.position.y = 0.86;
        group.add(bBelt);
        // Belt buckle (small metallic box)
        const bBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), bMetalMat);
        bBuckle.position.set(0, 0.86, 0.145);
        group.add(bBuckle);
        // 4 pouches
        for (let bp = 0; bp < 4; bp++) {
          const bpx = -0.18 + bp * 0.12;
          const bPouch = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.055), bBeltMat);
          bPouch.position.set(bpx, 0.85, 0.15);
          group.add(bPouch);
        }
        // Throwing knife handles visible on belt
        for (let kn = -1; kn <= 1; kn += 2) {
          const kHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), bBeltMat);
          kHandle.position.set(kn * 0.21, 0.88, 0.14);
          kHandle.rotation.z = 0.2 * kn;
          group.add(kHandle);
        }

        // Legs with wrappings and knee pads
        for (let side = -1; side <= 1; side += 2) {
          const bLegGroup = new THREE.Group();
          bLegGroup.name = side === -1 ? 'anim_ll' : 'anim_rl';
          bLegGroup.position.set(side * 0.1, 0.85, 0);

          const bLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.072, 0.7, 16), bMat);
          bLeg.position.y = -0.35;
          bLegGroup.add(bLeg);

          // Leg wrappings (3 thin cylinder strips on upper leg)
          for (let wr = 0; wr < 3; wr++) {
            const wrapGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14);
            const wrap = new THREE.Mesh(wrapGeo, bWrapMat);
            wrap.position.y = -0.12 - wr * 0.07;
            bLegGroup.add(wrap);
          }

          // Knee pad
          const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), bMetalMat);
          kneePad.position.set(0, -0.42, 0.04);
          bLegGroup.add(kneePad);

          // Boot with sole and turned-down top
          const bBoot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.18), bBootMat);
          bBoot.position.set(0, -0.77, 0.025);
          bLegGroup.add(bBoot);
          // Boot sole
          const bSole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.02, 0.19), bBeltMat);
          bSole.position.set(0, -0.825, 0.025);
          bLegGroup.add(bSole);
          // Boot top turned down
          const bBootTop = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.07, 0.04, 14), bBootMat);
          bBootTop.position.set(0, -0.7, 0);
          bLegGroup.add(bBootTop);
          // Boot laces (small cylinders)
          for (let lc = 0; lc < 3; lc++) {
            const lace = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.095, 12), bWrapMat);
            lace.position.set(0, -0.74 + lc * 0.022, 0.093);
            lace.rotation.z = Math.PI / 2;
            bLegGroup.add(lace);
          }
          group.add(bLegGroup);
        }

        // Left arm: upper + forearm + hand + enhanced buckler
        {
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.28, 1.35, 0);

          // Upper arm
          const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.28, 14), bHeadMat);
          lUpperArm.position.y = -0.14;
          leftArmGroup.add(lUpperArm);
          // Wrist wrap
          const lWristWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), bWrapMat);
          lWristWrap.position.y = -0.32;
          leftArmGroup.add(lWristWrap);
          // Forearm
          const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.033, 0.22, 14), bHeadMat);
          lForearm.position.y = -0.39;
          leftArmGroup.add(lForearm);
          // Hand hint
          const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), bHeadMat);
          lHand.position.y = -0.52;
          leftArmGroup.add(lHand);

          // Enhanced buckler: disc + boss + rim
          const bBucklerGeo = new THREE.CircleGeometry(0.13, 24);
          const bBucklerMat = new THREE.MeshStandardMaterial({ color: 0x666655, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
          const bBuckler = new THREE.Mesh(bBucklerGeo, bBucklerMat);
          bBuckler.position.set(-0.07, -0.45, 0.1);
          leftArmGroup.add(bBuckler);
          // Boss (central raised sphere)
          const bBoss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), bMetalMat);
          bBoss.position.set(-0.07, -0.45, 0.115);
          leftArmGroup.add(bBoss);
          // Rim
          const bRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 8, 20), bMetalMat);
          bRim.position.set(-0.07, -0.45, 0.1);
          leftArmGroup.add(bRim);
          // Strap
          const bStrap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.012), bBeltMat);
          bStrap.position.set(-0.07, -0.45, 0.105);
          leftArmGroup.add(bStrap);

          group.add(leftArmGroup);
        }

        // Right arm: upper + forearm + hand + enhanced dagger
        {
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.28, 1.35, 0);

          // Upper arm
          const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.28, 14), bHeadMat);
          rUpperArm.position.y = -0.14;
          rightArmGroup.add(rUpperArm);
          // Wrist wrap
          const rWristWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), bWrapMat);
          rWristWrap.position.y = -0.32;
          rightArmGroup.add(rWristWrap);
          // Forearm
          const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.033, 0.22, 14), bHeadMat);
          rForearm.position.y = -0.39;
          rightArmGroup.add(rForearm);
          // Hand hint
          const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), bHeadMat);
          rHand.position.y = -0.52;
          rightArmGroup.add(rHand);

          // Enhanced dagger: blade + crossguard + wrapped handle
          const bBlade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.012), bDaggerMat);
          bBlade.position.set(0.07, -0.48, 0);
          rightArmGroup.add(bBlade);
          // Crossguard
          const bCrossguard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.016), bMetalMat);
          bCrossguard.position.set(0.07, -0.36, 0);
          rightArmGroup.add(bCrossguard);
          // Wrapped handle
          const bHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 10), bWrapMat);
          bHandle.position.set(0.07, -0.29, 0);
          rightArmGroup.add(bHandle);
          // Pommel
          const bPommel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), bMetalMat);
          bPommel.position.set(0.07, -0.235, 0);
          rightArmGroup.add(bPommel);

          group.add(rightArmGroup);
        }

        // Layered cloak/cape (3 layered thin planes, tattered look)
        for (let cl = 0; cl < 3; cl++) {
          const capeH = 0.38 - cl * 0.04;
          const capeGeo = new THREE.BoxGeometry(0.28 - cl * 0.03, 0.01, capeH);
          const cape = new THREE.Mesh(capeGeo, bCloakMat);
          cape.position.set(0, 1.05 - cl * 0.04, -0.145 - cl * 0.012);
          cape.rotation.x = 0.08 * cl;
          group.add(cape);
        }

        break;
      }

      case EnemyType.BEAR: {
        // --- BEAR | Estimated polygons: ~60000 triangles ---
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 });
        const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
        const lightFurMat = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.9 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.5 });

        const fleshMat = new THREE.MeshStandardMaterial({ color: 0xaa3322, roughness: 0.8 });
        const nostrillMat = new THREE.MeshStandardMaterial({ color: 0x221108, roughness: 0.95 });
        const eyeAmberMat = new THREE.MeshStandardMaterial({ color: 0xcc8800, roughness: 0.3 });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xcc7777, roughness: 0.8 });

        // Main muscular body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), mat);
        body.position.y = 0.9;
        body.scale.set(1, 0.85, 1.2);
        body.castShadow = true;
        group.add(body);

        // Powerful hindquarters
        const hindBody = new THREE.Mesh(new THREE.SphereGeometry(0.58, 32, 24), mat);
        hindBody.position.set(0, 0.82, -0.45);
        hindBody.scale.set(1, 0.9, 1);
        group.add(hindBody);

        // Shoulder hump (powerful shoulder muscles)
        const humpGeo = new THREE.SphereGeometry(0.32, 32, 24);
        const hump = new THREE.Mesh(humpGeo, mat);
        hump.position.set(0, 1.45, 0.2);
        hump.scale.set(1.2, 0.7, 1);
        group.add(hump);

        // Thick neck
        const neckGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.38, 20);
        const neckMesh = new THREE.Mesh(neckGeo, mat);
        neckMesh.position.set(0, 1.25, 0.5);
        neckMesh.rotation.x = -0.45;
        group.add(neckMesh);

        // Neck muscle ridge
        const neckRidgeGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
        const neckRidge = new THREE.Mesh(neckRidgeGeo, darkFurMat);
        neckRidge.position.set(0, 1.3, 0.35);
        neckRidge.rotation.x = -0.4;
        group.add(neckRidge);

        // Neck fur mane (ring of fur pieces around neck)
        for (let nm = 0; nm < 10; nm++) {
          const nmAngle = (nm / 10) * Math.PI * 2;
          const furTuftGeo = new THREE.BoxGeometry(0.06, 0.12, 0.04);
          const furTuft = new THREE.Mesh(furTuftGeo, darkFurMat);
          furTuft.position.set(
            Math.cos(nmAngle) * 0.3,
            1.22 + Math.sin(nmAngle) * 0.05,
            0.52 + Math.sin(nmAngle) * 0.05
          );
          furTuft.rotation.z = nmAngle * 0.3;
          group.add(furTuft);
        }

        // Wider skull head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 24), mat);
        head.position.set(0, 1.35, 0.72);
        head.scale.set(1.1, 0.95, 1);
        group.add(head);

        // Detailed snout
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), mat);
        snout.position.set(0, 1.23, 1.08);
        snout.scale.set(1, 0.85, 1.1);
        group.add(snout);

        // Nostrils (dark small spheres)
        for (let ns = -1; ns <= 1; ns += 2) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), nostrillMat);
          nostril.position.set(ns * 0.05, 1.23, 1.19);
          group.add(nostril);
        }

        // Breath cone (small transparent cone in front of nose)
        const breathMat = new THREE.MeshStandardMaterial({ color: 0xddddee, transparent: true, opacity: 0.12 });
        const breathGeo = new THREE.ConeGeometry(0.06, 0.2, 10);
        const breath = new THREE.Mesh(breathGeo, breathMat);
        breath.position.set(0, 1.23, 1.34);
        breath.rotation.x = Math.PI / 2;
        group.add(breath);

        // Jaw group (animated jaw)
        const jawGroup = new THREE.Group();
        jawGroup.name = 'anim_jaw';
        jawGroup.position.set(0, 1.15, 1.05);

        // Lower jaw base
        const jawBaseMat = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.9 });
        const jawBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), jawBaseMat);
        jawBase.position.y = -0.02;
        jawGroup.add(jawBase);

        // Lower teeth (5 cones)
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.5 });
        for (let t = 0; t < 5; t++) {
          const toothGeo = new THREE.ConeGeometry(0.018, 0.065, 8);
          const tooth = new THREE.Mesh(toothGeo, toothMat);
          tooth.position.set(-0.08 + t * 0.04, 0.03, 0.06);
          tooth.rotation.x = -0.2;
          jawGroup.add(tooth);
        }
        group.add(jawGroup);

        // Upper teeth (5 cones on fixed snout)
        for (let t = 0; t < 5; t++) {
          const upToothGeo = new THREE.ConeGeometry(0.018, 0.065, 8);
          const upTooth = new THREE.Mesh(upToothGeo, toothMat);
          upTooth.position.set(-0.08 + t * 0.04, 1.14, 1.12);
          upTooth.rotation.x = Math.PI + 0.2;
          group.add(upTooth);
        }

        // Brow ridges
        for (let side = -1; side <= 1; side += 2) {
          const browGeo = new THREE.BoxGeometry(0.12, 0.04, 0.06);
          const brow = new THREE.Mesh(browGeo, darkFurMat);
          brow.position.set(side * 0.13, 1.52, 0.95);
          brow.rotation.z = side * 0.15;
          group.add(brow);
        }

        // Eyes: amber sphere + dark pupil sphere
        for (let side = -1; side <= 1; side += 2) {
          const eyeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), eyeAmberMat);
          eyeSphere.position.set(side * 0.14, 1.46, 0.99);
          group.add(eyeSphere);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pupilMat);
          pupil.position.set(side * 0.14, 1.46, 1.04);
          group.add(pupil);
        }

        // Ears: outer cone + inner pink cone
        for (let side = -1; side <= 1; side += 2) {
          const outerEar = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 12), mat);
          outerEar.position.set(side * 0.3, 1.7, 0.65);
          outerEar.rotation.z = side * 0.15;
          group.add(outerEar);
          const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.1, 12), innerEarMat);
          innerEar.position.set(side * 0.3, 1.71, 0.67);
          innerEar.rotation.z = side * 0.15;
          group.add(innerEar);
        }

        // Spine fur ridges along back
        for (let ri = 0; ri < 12; ri++) {
          const ridgeGeo = new THREE.ConeGeometry(0.035, 0.09, 8);
          const ridge = new THREE.Mesh(ridgeGeo, darkFurMat);
          ridge.position.set(0, 1.52 - ri * 0.04, 0.15 + ri * 0.07);
          ridge.rotation.x = -0.2;
          group.add(ridge);
        }

        // Flank fur tufts (sides of body)
        for (let fi = 0; fi < 10; fi++) {
          for (let side = -1; side <= 1; side += 2) {
            const tuftGeo = new THREE.BoxGeometry(0.04, 0.08, 0.03);
            const tuft = new THREE.Mesh(tuftGeo, darkFurMat);
            tuft.position.set(side * (0.55 + fi * 0.01), 0.7 + fi * 0.07, -0.2 + fi * 0.05);
            tuft.rotation.z = side * (0.4 + fi * 0.03);
            group.add(tuft);
          }
        }

        // Belly fur (lighter tufts underneath)
        for (let bi = 0; bi < 8; bi++) {
          const bellyTuftGeo = new THREE.BoxGeometry(0.05, 0.07, 0.03);
          const bellyTuft = new THREE.Mesh(bellyTuftGeo, lightFurMat);
          bellyTuft.position.set(-0.15 + bi * 0.04, 0.42, 0.3 + bi * 0.04);
          bellyTuft.rotation.x = 0.5;
          group.add(bellyTuft);
        }

        // Scars with exposed flesh underneath
        const scarMat2 = new THREE.MeshStandardMaterial({ color: 0x8a6a50, roughness: 0.7 });
        const scarPositions = [
          { x: 0.2, y: 1.0, z: 0.55, rz: 0.3 },
          { x: -0.15, y: 0.88, z: 0.6, rz: -0.4 },
          { x: 0.35, y: 1.1, z: 0.3, rz: 0.6 },
          { x: -0.3, y: 1.25, z: 0.4, rz: 0.2 },
          { x: 0.05, y: 0.72, z: 0.5, rz: -0.15 },
        ];
        for (const sp of scarPositions) {
          const fleshUnder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.005), fleshMat);
          fleshUnder.position.set(sp.x, sp.y, sp.z - 0.002);
          fleshUnder.rotation.z = sp.rz;
          group.add(fleshUnder);
          const scarOver = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.018, 0.012), scarMat2);
          scarOver.position.set(sp.x, sp.y, sp.z);
          scarOver.rotation.z = sp.rz;
          group.add(scarOver);
        }

        // Stubby tail
        const tailGroup = new THREE.Group();
        tailGroup.name = 'anim_tail';
        tailGroup.position.set(0, 1.05, -0.88);
        const tailConeGeo = new THREE.ConeGeometry(0.06, 0.15, 10);
        const tailCone = new THREE.Mesh(tailConeGeo, mat);
        tailCone.rotation.x = Math.PI / 2;
        tailGroup.add(tailCone);
        group.add(tailGroup);

        // All 4 legs with full anatomy
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const bearLegGroup = new THREE.Group();
            bearLegGroup.name = lz === 1 ? (lx === -1 ? 'anim_fll' : 'anim_frl') : (lx === -1 ? 'anim_bll' : 'anim_brl');
            bearLegGroup.position.set(lx * 0.38, 0.65, lz * 0.52);

            // Thigh (upper leg)
            const thighGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.36, 16);
            const thigh = new THREE.Mesh(thighGeo, mat);
            thigh.position.y = -0.18;
            bearLegGroup.add(thigh);

            // Knee joint sphere
            const kneeGeo = new THREE.SphereGeometry(0.1, 16, 12);
            const knee = new THREE.Mesh(kneeGeo, mat);
            knee.position.y = -0.38;
            bearLegGroup.add(knee);

            // Lower leg
            const lowerLegGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.32, 16);
            const lowerLeg = new THREE.Mesh(lowerLegGeo, mat);
            lowerLeg.position.y = -0.56;
            bearLegGroup.add(lowerLeg);

            // Massive paw
            const pawGeo = new THREE.SphereGeometry(0.1, 16, 12);
            const paw = new THREE.Mesh(pawGeo, mat);
            paw.position.set(0, -0.73, 0.05);
            paw.scale.set(1.4, 0.6, 1.3);
            bearLegGroup.add(paw);

            // 4 toe bumps per paw
            for (let toe = 0; toe < 4; toe++) {
              const toeGeo = new THREE.SphereGeometry(0.035, 10, 8);
              const toeMesh = new THREE.Mesh(toeGeo, mat);
              toeMesh.position.set(-0.06 + toe * 0.04, -0.74, 0.12);
              bearLegGroup.add(toeMesh);
            }

            // 4 claws per paw (all 4 feet)
            for (let cl = 0; cl < 4; cl++) {
              const clawGeo = new THREE.ConeGeometry(0.022, 0.09, 8);
              const claw = new THREE.Mesh(clawGeo, clawMat);
              claw.position.set(-0.06 + cl * 0.04, -0.74, 0.18);
              claw.rotation.x = -Math.PI / 2.2;
              bearLegGroup.add(claw);
            }
            group.add(bearLegGroup);
          }
        }
        break;
      }

      case EnemyType.FOREST_SPIDER: {
        // --- FOREST_SPIDER | Estimated polygons: ~112000 triangles ---
        const spiderMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.75 });
        const spiderCarapaceMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.6 });
        const spiderMarkingMat = new THREE.MeshStandardMaterial({ color: 0xdd3300, roughness: 0.6 });
        const spiderOrangeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6 });
        const spiderEyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 0.8 });
        const spiderVenomMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, transparent: true, opacity: 0.7, emissive: 0x22aa22, emissiveIntensity: 0.4 });
        const spiderSilkMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.35, roughness: 0.3 });
        const spiderSternumMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });

        // === CEPHALOTHORAX (main body / head+thorax) ===
        const cephGeo = new THREE.SphereGeometry(0.27, 32, 24);
        const ceph = new THREE.Mesh(cephGeo, spiderMat);
        ceph.position.set(0, 0.5, 0);
        ceph.castShadow = true;
        group.add(ceph);

        // Carapace overlay (darker flattened dome on top)
        const carapaceGeo = new THREE.SphereGeometry(0.29, 32, 24);
        const carapace = new THREE.Mesh(carapaceGeo, spiderCarapaceMat);
        carapace.scale.set(1.0, 0.55, 1.0);
        carapace.position.set(0, 0.62, 0);
        group.add(carapace);

        // === PEDICEL (narrow waist connecting ceph to abdomen) ===
        const pedicelGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.13, 16);
        const pedicel = new THREE.Mesh(pedicelGeo, spiderMat);
        pedicel.position.set(0, 0.445, -0.26);
        group.add(pedicel);

        // === ABDOMEN ===
        const abdGeo = new THREE.SphereGeometry(0.38, 32, 24);
        const abd = new THREE.Mesh(abdGeo, spiderMat);
        abd.scale.set(1.0, 1.15, 1.3);
        abd.position.set(0, 0.47, -0.58);
        abd.castShadow = true;
        group.add(abd);

        // Hourglass pattern on abdomen (5 markings: red/orange)
        const hourglassShapes = [
          { color: spiderMarkingMat, x: 0, y: 0.62, z: -0.37, rx: 0.0, ry: 0.0, s: 0.06 },
          { color: spiderOrangeMat,  x: 0, y: 0.57, z: -0.32, rx: 0.0, ry: 0.0, s: 0.04 },
          { color: spiderMarkingMat, x: 0, y: 0.52, z: -0.29, rx: 0.1, ry: 0.0, s: 0.055 },
          { color: spiderOrangeMat,  x: 0, y: 0.47, z: -0.28, rx: 0.1, ry: 0.0, s: 0.038 },
          { color: spiderMarkingMat, x: 0, y: 0.42, z: -0.30, rx: 0.1, ry: 0.0, s: 0.048 },
          { color: spiderOrangeMat,  x: 0, y: 0.37, z: -0.33, rx: 0.0, ry: 0.0, s: 0.032 },
        ];
        for (const hg of hourglassShapes) {
          const hgMesh = new THREE.Mesh(new THREE.SphereGeometry(hg.s, 16, 12), hg.color);
          hgMesh.position.set(hg.x, hg.y, hg.z);
          hgMesh.rotation.x = hg.rx;
          group.add(hgMesh);
        }

        // Abdomen bristles (15 hair cones on abdomen surface)
        for (let bi = 0; bi < 15; bi++) {
          const bAngle = (bi / 15) * Math.PI * 2;
          const bbristleGeo = new THREE.ConeGeometry(0.008, 0.065, 8);
          const bristle = new THREE.Mesh(bbristleGeo, spiderMat);
          const bR = 0.33 + (bi % 3) * 0.025;
          bristle.position.set(
            Math.cos(bAngle) * bR * 0.7,
            0.52 + Math.sin(bAngle * 0.5) * 0.08,
            -0.58 + Math.sin(bAngle) * bR
          );
          bristle.rotation.z = Math.cos(bAngle) * 0.6;
          bristle.rotation.x = Math.sin(bAngle) * 0.4;
          group.add(bristle);
        }

        // Silk glands / spinnerets at rear (3 small sphere clusters)
        const spinneret1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), spiderMat);
        spinneret1.position.set(-0.035, 0.38, -0.94);
        group.add(spinneret1);
        const spinneret2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), spiderMat);
        spinneret2.position.set(0.035, 0.38, -0.94);
        group.add(spinneret2);
        const spinneret3 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), spiderMat);
        spinneret3.position.set(0, 0.43, -0.97);
        group.add(spinneret3);

        // Web silk strand trailing from spinnerets
        const silkGeo = new THREE.CylinderGeometry(0.007, 0.004, 0.9, 8);
        const silk = new THREE.Mesh(silkGeo, spiderSilkMat);
        silk.position.set(0, 0.02, -1.42);
        silk.rotation.x = 0.15;
        group.add(silk);

        // Sternum plate (flat box on underside)
        const sternumGeo = new THREE.BoxGeometry(0.22, 0.04, 0.28);
        const sternum = new THREE.Mesh(sternumGeo, spiderSternumMat);
        sternum.position.set(0, 0.36, 0);
        group.add(sternum);

        // Book lungs hint (2 thin slit boxes on abdomen underside)
        for (let bl = -1; bl <= 1; bl += 2) {
          const lungGeo = new THREE.BoxGeometry(0.07, 0.018, 0.12);
          const lung = new THREE.Mesh(lungGeo, spiderSternumMat);
          lung.position.set(bl * 0.09, 0.3, -0.55);
          group.add(lung);
        }

        // === CHELICERAE / FANGS (2 segments each, venom drip) ===
        for (let side = -1; side <= 1; side += 2) {
          // Base cylinder segment
          const chelBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.028, 0.022, 0.13, 12),
            new THREE.MeshStandardMaterial({ color: 0x330000, roughness: 0.6 })
          );
          chelBase.position.set(side * 0.075, 0.42, 0.23);
          chelBase.rotation.x = -0.5;
          chelBase.rotation.z = side * 0.12;
          group.add(chelBase);

          // Fang cone
          const fangGeo = new THREE.ConeGeometry(0.018, 0.14, 12);
          const fang = new THREE.Mesh(fangGeo, new THREE.MeshStandardMaterial({ color: 0x550000, roughness: 0.5 }));
          fang.position.set(side * 0.082, 0.31, 0.33);
          fang.rotation.x = -1.1;
          fang.rotation.z = side * 0.15;
          group.add(fang);

          // Venom drip (tiny transparent green cylinder at fang tip)
          const venomGeo = new THREE.CylinderGeometry(0.006, 0.003, 0.05, 8);
          const venom = new THREE.Mesh(venomGeo, spiderVenomMat);
          venom.position.set(side * 0.086, 0.225, 0.4);
          venom.rotation.x = -1.1;
          group.add(venom);
        }

        // === PEDIPALPS (2 small segmented appendages near mouth) ===
        for (let side = -1; side <= 1; side += 2) {
          // Seg 1
          const palp1 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.013, 0.1, 10), spiderMat);
          palp1.position.set(side * 0.04, 0.48, 0.24);
          palp1.rotation.x = -0.3;
          palp1.rotation.z = side * 0.25;
          group.add(palp1);
          // Seg 2
          const palp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, 0.085, 10), spiderMat);
          palp2.position.set(side * 0.052, 0.44, 0.32);
          palp2.rotation.x = -0.55;
          palp2.rotation.z = side * 0.3;
          group.add(palp2);
          // Claw cone at tip
          const clawGeo = new THREE.ConeGeometry(0.009, 0.04, 8);
          const claw = new THREE.Mesh(clawGeo, spiderCarapaceMat);
          claw.position.set(side * 0.06, 0.4, 0.39);
          claw.rotation.x = -1.0;
          group.add(claw);
        }

        // === 8 EYES (2 large main + 6 smaller, with emissive material) ===
        const eyeData = [
          // [x, y, z, radius] — 2 large main eyes
          [-0.085, 0.575, 0.245, 0.033],
          [ 0.085, 0.575, 0.245, 0.033],
          // 3 mid-row smaller
          [-0.045, 0.615, 0.255, 0.022],
          [ 0.045, 0.615, 0.255, 0.022],
          [ 0.0,   0.635, 0.240, 0.020],
          // 3 lower-row smallest
          [-0.115, 0.555, 0.225, 0.018],
          [ 0.115, 0.555, 0.225, 0.018],
          [ 0.0,   0.545, 0.250, 0.017],
        ];
        for (const ed of eyeData) {
          const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(ed[3], 16, 12), spiderEyeMat);
          eyeMesh.position.set(ed[0], ed[1], ed[2]);
          group.add(eyeMesh);
          // Reflective aura (tiny transparent sphere around each eye)
          const aura = new THREE.Mesh(
            new THREE.SphereGeometry(ed[3] * 1.35, 12, 8),
            new THREE.MeshStandardMaterial({ color: 0xff4400, transparent: true, opacity: 0.18, emissive: 0xff2200, emissiveIntensity: 0.25 })
          );
          aura.position.set(ed[0], ed[1], ed[2]);
          group.add(aura);
        }

        // === 8 LEGS — dramatically enhanced with full segment anatomy ===
        const spiderLegsLeft = new THREE.Group();
        spiderLegsLeft.name = 'anim_legs_left';
        spiderLegsLeft.position.set(0, 0, 0);
        const spiderLegsRight = new THREE.Group();
        spiderLegsRight.name = 'anim_legs_right';
        spiderLegsRight.position.set(0, 0, 0);

        for (let i = 0; i < 8; i++) {
          // Legs arranged in pairs along the sides of the cephalothorax
          const side = i < 4 ? -1 : 1;  // left/right
          const pairIdx = i < 4 ? i : i - 4; // 0..3 per side
          const forwardOffset = (pairIdx - 1.5) * 0.14; // spread front-to-back

          const spiderLegGroup = new THREE.Group();
          spiderLegGroup.name = 'anim_leg_' + i;
          // Root at cephalothorax side
          spiderLegGroup.position.set(side * 0.24, 0.5, forwardOffset);

          const spreadZ = (pairIdx - 1.5) * 0.18;

          // COXA — short thick base segment
          const coxa = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.1, 12), spiderMat);
          coxa.position.set(side * 0.06, -0.03, 0);
          coxa.rotation.z = side * 0.6;
          coxa.rotation.x = spreadZ * 0.4;
          spiderLegGroup.add(coxa);

          // TROCHANTER — small sphere joint
          const trochanter = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), spiderMat);
          trochanter.position.set(side * 0.13, -0.04, spreadZ * 0.18);
          spiderLegGroup.add(trochanter);

          // FEMUR — longer thick cylinder
          const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.020, 0.32, 12), spiderMat);
          femur.position.set(side * 0.22, -0.04, spreadZ * 0.35);
          femur.rotation.z = side * 0.9;
          femur.rotation.x = spreadZ * 0.5;
          spiderLegGroup.add(femur);

          // Femur bristles (3 small cones)
          for (let fb = 0; fb < 3; fb++) {
            const fbristle = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.04, 8), spiderMat);
            fbristle.position.set(side * (0.14 + fb * 0.06), -0.00 + fb * 0.01, spreadZ * 0.2 + fb * 0.02);
            fbristle.rotation.z = side * (1.2 + fb * 0.1);
            spiderLegGroup.add(fbristle);
          }

          // PATELLA — knee joint sphere
          const patella = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), spiderMat);
          patella.position.set(side * 0.37, -0.1, spreadZ * 0.55);
          spiderLegGroup.add(patella);

          // TIBIA — medium cylinder, slightly thinner
          const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.28, 12), spiderMat);
          tibia.position.set(side * 0.46, -0.22, spreadZ * 0.65);
          tibia.rotation.z = side * 1.25;
          tibia.rotation.x = spreadZ * 0.3;
          spiderLegGroup.add(tibia);

          // Tibia bristles (2 small cones)
          for (let tb = 0; tb < 2; tb++) {
            const tbristle = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.035, 8), spiderMat);
            tbristle.position.set(side * (0.41 + tb * 0.07), -0.18 - tb * 0.04, spreadZ * 0.55 + tb * 0.03);
            tbristle.rotation.z = side * (1.4 + tb * 0.1);
            spiderLegGroup.add(tbristle);
          }

          // METATARSUS — thin cylinder
          const metatarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, 0.22, 10), spiderMat);
          metatarsus.position.set(side * 0.52, -0.4, spreadZ * 0.72);
          metatarsus.rotation.z = side * 1.55;
          metatarsus.rotation.x = spreadZ * 0.2;
          spiderLegGroup.add(metatarsus);

          // TARSUS — foot with 2 claw cones
          const tarsus = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), spiderMat);
          tarsus.position.set(side * 0.56, -0.56, spreadZ * 0.78);
          spiderLegGroup.add(tarsus);

          for (let cl = -1; cl <= 1; cl += 2) {
            const clawCone = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.035, 8), spiderCarapaceMat);
            clawCone.position.set(side * 0.565 + cl * 0.01, -0.595, spreadZ * 0.80);
            clawCone.rotation.z = side * 1.7;
            clawCone.rotation.x = cl * 0.3;
            spiderLegGroup.add(clawCone);
          }

          if (side < 0) {
            spiderLegsLeft.add(spiderLegGroup);
          } else {
            spiderLegsRight.add(spiderLegGroup);
          }
        }
        group.add(spiderLegsLeft);
        group.add(spiderLegsRight);
        break;
      }

      case EnemyType.TREANT: {
        // --- TREANT | Estimated polygons: ~78440 triangles ---
        const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 44), barkMat);
        trunk.position.y = 1.25;
        trunk.castShadow = true;
        group.add(trunk);

        // Branches as arms
        for (let side = -1; side <= 1; side += 2) {
          const treantArmGroup = new THREE.Group();
          treantArmGroup.name = side === -1 ? 'anim_la' : 'anim_ra';
          treantArmGroup.position.set(side * 0.5, 2.0, 0);
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.2, 44), barkMat);
          branch.position.set(side * 0.2, 0, 0);
          branch.rotation.z = side * 0.8;
          treantArmGroup.add(branch);

          // Sub-branches
          for (let j = 0; j < 3; j++) {
            const subBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 44), barkMat);
            subBranch.position.set(side * (0.4 + j * 0.15), 0.2 + j * 0.2, (Math.random() - 0.5) * 0.3);
            subBranch.rotation.z = side * (1.0 + j * 0.2);
            treantArmGroup.add(subBranch);
          }
          group.add(treantArmGroup);
        }

        // Leaf crown
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a6a22, roughness: 0.8 });
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), leafMat);
        crown.position.y = 3.2;
        crown.castShadow = true;
        group.add(crown);

        // Face (eyes)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xaa6600, emissiveIntensity: 0.5 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), eyeMat);
          eye.position.set(side * 0.2, 2.2, 0.45);
          group.add(eye);
        }

        // Bark detail (multiple thin boxes on trunk surface)
        for (let bi = 0; bi < 6; bi++) {
          const barkPlateGeo = new THREE.BoxGeometry(0.15, 0.3, 0.06);
          const barkPlate = new THREE.Mesh(barkPlateGeo, barkMat);
          const bAngle = (bi / 6) * Math.PI * 2;
          barkPlate.position.set(Math.cos(bAngle) * 0.55, 0.8 + bi * 0.3, Math.sin(bAngle) * 0.55);
          group.add(barkPlate);
        }

        // Moss patches (small green spheres on trunk)
        const mossMat2 = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 1.0 });
        for (let mi = 0; mi < 5; mi++) {
          const mossGeo2 = new THREE.SphereGeometry(0.1, 16, 12);
          const moss2 = new THREE.Mesh(mossGeo2, mossMat2);
          moss2.position.set((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 2.0, (Math.random() - 0.5) * 0.6);
          group.add(moss2);
        }

        // Bird nest (small brown box in branches with tiny sphere eggs)
        const nestGeo = new THREE.BoxGeometry(0.25, 0.08, 0.25);
        const nestMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95 });
        const nest = new THREE.Mesh(nestGeo, nestMat);
        nest.position.set(0.6, 2.5, 0.2);
        group.add(nest);
        const eggMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.6 });
        for (let ei = 0; ei < 3; ei++) {
          const eggGeo = new THREE.SphereGeometry(0.03, 8, 6);
          const egg = new THREE.Mesh(eggGeo, eggMat);
          egg.position.set(0.55 + ei * 0.05, 2.55, 0.18 + (Math.random() - 0.5) * 0.1);
          group.add(egg);
        }

        // Roots visible at base (thick cylinders spreading from base)
        for (let ri = 0; ri < 4; ri++) {
          const rootAngle = (ri / 4) * Math.PI * 2 + 0.3;
          const rootGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.0, 44);
          const root = new THREE.Mesh(rootGeo, barkMat);
          root.position.set(Math.cos(rootAngle) * 0.6, 0.05, Math.sin(rootAngle) * 0.6);
          root.rotation.z = Math.cos(rootAngle) * 1.2;
          root.rotation.x = Math.sin(rootAngle) * 0.3;
          group.add(root);
        }

        // Glowing sap (small emissive yellow-green planes in trunk cracks)
        const sapMat = new THREE.MeshStandardMaterial({ color: 0xaaff44, emissive: 0x88cc22, emissiveIntensity: 1.0 });
        for (let si = 0; si < 3; si++) {
          const sapGeo = new THREE.BoxGeometry(0.04, 0.12, 0.01);
          const sap = new THREE.Mesh(sapGeo, sapMat);
          sap.position.set((Math.random() - 0.5) * 0.4, 1.0 + si * 0.5, 0.55);
          group.add(sap);
        }

        // Hanging vines (thin green cylinders from branches)
        const vineMat = new THREE.MeshStandardMaterial({ color: 0x337722, roughness: 0.9 });
        for (let vi = 0; vi < 4; vi++) {
          const vineGeo = new THREE.CylinderGeometry(0.015, 0.01, 1.0 + Math.random() * 0.5, 44);
          const vine = new THREE.Mesh(vineGeo, vineMat);
          vine.position.set((Math.random() - 0.5) * 1.5, 2.5, (Math.random() - 0.5) * 1.0);
          group.add(vine);
        }

        // More leaf clusters (additional smaller spheres in crown)
        for (let li = 0; li < 4; li++) {
          const leafClusterGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 16, 12);
          const leafCluster = new THREE.Mesh(leafClusterGeo, leafMat);
          leafCluster.position.set(
            (Math.random() - 0.5) * 1.5,
            3.0 + Math.random() * 0.6,
            (Math.random() - 0.5) * 1.5
          );
          group.add(leafCluster);
        }

        // Leg trunks
        for (let side = -1; side <= 1; side += 2) {
          const treantLegGroup = new THREE.Group();
          treantLegGroup.name = side === -1 ? 'anim_ll' : 'anim_rl';
          treantLegGroup.position.set(side * 0.3, 0.6, 0);
          const legTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 44), barkMat);
          legTrunk.position.y = -0.4;
          treantLegGroup.add(legTrunk);
          group.add(treantLegGroup);
        }
        break;
      }

      case EnemyType.CORRUPTED_ELF: {
        // --- CORRUPTED_ELF | Estimated polygons: ~60000 triangles ---
        const darkPurple = new THREE.MeshStandardMaterial({ color: 0x3a1a4a, roughness: 0.6 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x8866aa, roughness: 0.5 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, metalness: 0.5, roughness: 0.4 });
        const tiaraMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.7, roughness: 0.3 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.9 });
        const hairTipMat = new THREE.MeshStandardMaterial({ color: 0x9922cc, emissive: 0x6611aa, emissiveIntensity: 0.6, roughness: 0.9 });
        const veinMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
        const eyeOuterMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
        const eyeInnerMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0x9900ff, emissive: 0x7700dd, emissiveIntensity: 2.0, roughness: 0.1 });
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.8, roughness: 0.2 });
        const bladeEdgeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 1.5 });
        const wispMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, transparent: true, opacity: 0.3, roughness: 0.5 });

        // Inner body (slender torso base)
        const innerTorso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.16), skinMat);
        innerTorso.position.y = 1.15;
        group.add(innerTorso);

        // Outer corruption-veined armor (dark with emissive cracks)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.2), armorMat);
        torso.position.y = 1.15;
        torso.castShadow = true;
        group.add(torso);

        // Corruption veins on armor surface (emissive purple strips)
        const veinPositions = [
          { x: 0.0, y: 1.25, z: 0.11, w: 0.22, h: 0.04 },
          { x: 0.06, y: 1.1, z: 0.11, w: 0.04, h: 0.18 },
          { x: -0.07, y: 1.05, z: 0.11, w: 0.03, h: 0.22 },
          { x: 0.0, y: 0.98, z: 0.11, w: 0.18, h: 0.03 },
        ];
        for (const vp of veinPositions) {
          const veinGeo = new THREE.BoxGeometry(vp.w, vp.h, 0.005);
          const vein = new THREE.Mesh(veinGeo, veinMat);
          vein.position.set(vp.x, vp.y, vp.z);
          group.add(vein);
        }

        // Chest corruption gem (octahedron)
        const chestGemGeo = new THREE.OctahedronGeometry(0.045);
        const chestGem = new THREE.Mesh(chestGemGeo, gemMat);
        chestGem.position.set(0, 1.28, 0.115);
        group.add(chestGem);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), skinMat);
        head.position.y = 1.55;
        group.add(head);

        // Nose (small cone)
        const noseGeo = new THREE.ConeGeometry(0.018, 0.04, 8);
        const nose = new THREE.Mesh(noseGeo, skinMat);
        nose.position.set(0, 1.54, 0.135);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);

        // Corrupted face markings (emissive purple strips)
        for (let fm = 0; fm < 3; fm++) {
          const markGeo = new THREE.BoxGeometry(0.025, 0.005, 0.06);
          const mark = new THREE.Mesh(markGeo, veinMat);
          mark.position.set((fm - 1) * 0.045, 1.575, 0.12);
          group.add(mark);
        }

        // Pointed ears (longer with corruption vein detail)
        for (let side = -1; side <= 1; side += 2) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.22, 12), skinMat);
          ear.position.set(side * 0.17, 1.6, 0);
          ear.rotation.z = side * 0.5;
          group.add(ear);
          // Ear vein
          const earVeinGeo = new THREE.BoxGeometry(0.008, 0.14, 0.005);
          const earVein = new THREE.Mesh(earVeinGeo, veinMat);
          earVein.position.set(side * 0.17, 1.64, 0.01);
          earVein.rotation.z = side * 0.5;
          group.add(earVein);
        }

        // Eyes: black outer + red inner emissive
        for (let side = -1; side <= 1; side += 2) {
          const eyeOuter = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), eyeOuterMat);
          eyeOuter.position.set(side * 0.055, 1.565, 0.115);
          group.add(eyeOuter);
          const eyeInner = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), eyeInnerMat);
          eyeInner.position.set(side * 0.055, 1.565, 0.128);
          group.add(eyeInner);
        }

        // Enhanced crown/tiara (wider torus band + 6 spikes + void gems)
        const tiaraGeo = new THREE.TorusGeometry(0.155, 0.02, 16, 48);
        const tiara = new THREE.Mesh(tiaraGeo, tiaraMat);
        tiara.position.y = 1.65;
        tiara.rotation.x = Math.PI / 2;
        group.add(tiara);
        // 6 tiara spikes of varying heights
        const spikeHeights = [0.14, 0.1, 0.07, 0.07, 0.1, 0.14];
        for (let sp = 0; sp < 6; sp++) {
          const spAngle = (sp / 6) * Math.PI * 2;
          const tiaraSpikeGeo = new THREE.ConeGeometry(0.018, spikeHeights[sp], 8);
          const tiaraSpike = new THREE.Mesh(tiaraSpikeGeo, tiaraMat);
          tiaraSpike.position.set(
            Math.cos(spAngle) * 0.155,
            1.65 + spikeHeights[sp] / 2,
            Math.sin(spAngle) * 0.155
          );
          group.add(tiaraSpike);
          // Void gem between spikes
          if (sp % 2 === 0) {
            const voidGemGeo = new THREE.OctahedronGeometry(0.018);
            const voidGem = new THREE.Mesh(voidGemGeo, gemMat);
            const vgAngle = spAngle + Math.PI / 6;
            voidGem.position.set(Math.cos(vgAngle) * 0.155, 1.67, Math.sin(vgAngle) * 0.155);
            group.add(voidGem);
          }
        }
        // Crown front jewel
        const crownJewelGeo = new THREE.OctahedronGeometry(0.03);
        const crownJewel = new THREE.Mesh(crownJewelGeo, gemMat);
        crownJewel.position.set(0, 1.74, 0.155);
        group.add(crownJewel);

        // Flowing hair (8 strands down back, some with purple tips)
        for (let hi = 0; hi < 8; hi++) {
          const hx = -0.1 + hi * 0.028;
          const hlen = 0.28 + (hi % 3) * 0.06;
          const hairGeo = new THREE.BoxGeometry(0.04, hlen, 0.015);
          const hair = new THREE.Mesh(hairGeo, hairMat);
          hair.position.set(hx, 1.4 - hlen * 0.5 + 0.04, -0.12);
          hair.rotation.z = (hx) * 0.2;
          group.add(hair);
          // Purple-tipped ends on alternating strands
          if (hi % 2 === 0) {
            const tipGeo = new THREE.BoxGeometry(0.04, 0.06, 0.015);
            const tip = new THREE.Mesh(tipGeo, hairTipMat);
            tip.position.set(hx, 1.4 - hlen - 0.01, -0.12);
            group.add(tip);
          }
        }

        // Enhanced pauldrons with spike and corruption veins
        for (let side = -1; side <= 1; side += 2) {
          const pauldBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.14), armorMat);
          pauldBase.position.set(side * 0.22, 1.44, 0);
          pauldBase.rotation.z = side * 0.3;
          group.add(pauldBase);
          const pauldSpikeGeo = new THREE.ConeGeometry(0.015, 0.09, 8);
          const pauldSpike = new THREE.Mesh(pauldSpikeGeo, tiaraMat);
          pauldSpike.position.set(side * 0.24, 1.52, 0);
          group.add(pauldSpike);
          // Pauldron vein
          const pvGeo = new THREE.BoxGeometry(0.07, 0.01, 0.005);
          const pv = new THREE.Mesh(pvGeo, veinMat);
          pv.position.set(side * 0.22, 1.46, 0.072);
          group.add(pv);
        }

        // Belt with dark gem buckle
        const beltGeo = new THREE.BoxGeometry(0.34, 0.05, 0.015);
        const belt = new THREE.Mesh(beltGeo, armorMat);
        belt.position.set(0, 0.93, 0.11);
        group.add(belt);
        const buckleGeo = new THREE.OctahedronGeometry(0.025);
        const buckle = new THREE.Mesh(buckleGeo, gemMat);
        buckle.position.set(0, 0.93, 0.122);
        group.add(buckle);

        // Cape (4 layered semi-transparent dark panels behind)
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
        for (let cl = 0; cl < 4; cl++) {
          const capeGeo = new THREE.BoxGeometry(0.28 - cl * 0.03, 0.55 - cl * 0.04, 0.01);
          const cape = new THREE.Mesh(capeGeo, capeMat);
          cape.position.set(0, 1.1 - cl * 0.02, -0.14 - cl * 0.01);
          cape.rotation.x = 0.08 * cl;
          group.add(cape);
        }

        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const armGroup = new THREE.Group();
          armGroup.name = side === -1 ? 'anim_la' : 'anim_ra';
          armGroup.position.set(side * 0.23, 1.42, 0);

          // Upper arm with armor plate
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 0.28, 16), skinMat);
          upperArm.position.y = -0.14;
          armGroup.add(upperArm);

          // Bracer (armor segment)
          const bracerGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.14, 16);
          const bracer = new THREE.Mesh(bracerGeo, armorMat);
          bracer.position.y = -0.36;
          armGroup.add(bracer);

          // Glowing runes at multiple positions on bracer
          for (let rn = 0; rn < 3; rn++) {
            const runeGeo = new THREE.BoxGeometry(0.025, 0.045, 0.005);
            const rune = new THREE.Mesh(runeGeo, veinMat);
            rune.position.set(0, -0.31 - rn * 0.04, 0.046);
            armGroup.add(rune);
          }

          // Elegant but clawed hand (4 finger cones)
          const handGeo = new THREE.SphereGeometry(0.035, 12, 8);
          const handMesh = new THREE.Mesh(handGeo, skinMat);
          handMesh.position.y = -0.52;
          armGroup.add(handMesh);
          for (let fn = 0; fn < 4; fn++) {
            const fingerGeo = new THREE.ConeGeometry(0.01, 0.06, 12);
            const finger = new THREE.Mesh(fingerGeo, skinMat);
            finger.position.set(-0.03 + fn * 0.02, -0.585, 0.015);
            finger.rotation.x = 0.3;
            armGroup.add(finger);
          }

          if (side === -1) {
            // Left hand: corruption orb (inner emissive + outer transparent dark sphere)
            const orbInnerGeo = new THREE.SphereGeometry(0.04, 16, 12);
            const orbInner = new THREE.Mesh(orbInnerGeo, gemMat);
            orbInner.position.set(0, -0.65, 0.04);
            armGroup.add(orbInner);
            const orbOuterMat = new THREE.MeshStandardMaterial({ color: 0x220033, transparent: true, opacity: 0.35 });
            const orbOuterGeo = new THREE.SphereGeometry(0.065, 16, 12);
            const orbOuter = new THREE.Mesh(orbOuterGeo, orbOuterMat);
            orbOuter.position.set(0, -0.65, 0.04);
            armGroup.add(orbOuter);
          } else {
            // Right hand: corrupted blade (thin box + emissive edge strips)
            const bladeGeo = new THREE.BoxGeometry(0.018, 0.22, 0.055);
            const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
            bladeMesh.position.set(0, -0.75, 0.03);
            armGroup.add(bladeMesh);
            for (let be = 0; be < 2; be++) {
              const beGeo = new THREE.BoxGeometry(0.004, 0.22, 0.005);
              const beEdge = new THREE.Mesh(beGeo, bladeEdgeMat);
              beEdge.position.set((be === 0 ? -0.009 : 0.009), -0.75, 0.056);
              armGroup.add(beEdge);
            }
          }

          group.add(armGroup);
        }

        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const legGroup = new THREE.Group();
          legGroup.name = side === -1 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(side * 0.09, 0.88, 0);

          // Thigh with armor plate
          const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 16), darkPurple);
          thighMesh.position.y = -0.16;
          legGroup.add(thighMesh);
          const thighPlateMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, metalness: 0.5, roughness: 0.4 });
          const thighPlateGeo = new THREE.BoxGeometry(0.09, 0.12, 0.005);
          const thighPlate = new THREE.Mesh(thighPlateGeo, thighPlateMat);
          thighPlate.position.set(0, -0.1, 0.062);
          legGroup.add(thighPlate);

          // Knee guard
          const kneeGuardGeo = new THREE.SphereGeometry(0.048, 14, 10);
          const kneeGuard = new THREE.Mesh(kneeGuardGeo, armorMat);
          kneeGuard.position.y = -0.33;
          legGroup.add(kneeGuard);

          // Shin with greave
          const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.3, 16), darkPurple);
          shinMesh.position.y = -0.5;
          legGroup.add(shinMesh);
          const greaveGeo = new THREE.BoxGeometry(0.072, 0.22, 0.005);
          const greave = new THREE.Mesh(greaveGeo, armorMat);
          greave.position.set(0, -0.5, 0.05);
          legGroup.add(greave);

          // Elegant boot with pointed toe
          const bootGeo = new THREE.BoxGeometry(0.07, 0.08, 0.18);
          const boot = new THREE.Mesh(bootGeo, darkPurple);
          boot.position.set(0, -0.68, 0.04);
          legGroup.add(boot);
          const toeGeo = new THREE.ConeGeometry(0.025, 0.1, 8);
          const toe = new THREE.Mesh(toeGeo, darkPurple);
          toe.position.set(0, -0.68, 0.15);
          toe.rotation.x = Math.PI / 2;
          legGroup.add(toe);

          group.add(legGroup);
        }

        // Corruption tendrils from shoulders/back
        for (let tn = 0; tn < 5; tn++) {
          const tnAngle = (tn / 5) * Math.PI;
          const tnGeo = new THREE.CylinderGeometry(0.012, 0.005, 0.18, 8);
          const tendril = new THREE.Mesh(tnGeo, new THREE.MeshStandardMaterial({ color: 0x220033, roughness: 0.8 }));
          tendril.position.set(Math.cos(tnAngle) * 0.22, 1.4 + Math.sin(tnAngle) * 0.1, -0.05);
          tendril.rotation.z = Math.cos(tnAngle) * 0.8;
          tendril.rotation.x = 0.4;
          group.add(tendril);
        }

        // Shadow wisps (5-6 translucent dark spheres)
        for (let wi = 0; wi < 6; wi++) {
          const wispSize = 0.055 + (wi % 3) * 0.022;
          const wispGeo = new THREE.SphereGeometry(wispSize, 16, 12);
          const wisp = new THREE.Mesh(wispGeo, wispMat);
          const wAngle = (wi / 6) * Math.PI * 2;
          wisp.position.set(
            Math.cos(wAngle) * 0.38,
            0.85 + Math.sin(wAngle * 0.7) * 0.5,
            Math.sin(wAngle) * 0.25
          );
          group.add(wisp);
        }
        break;
      }

      case EnemyType.DARK_RANGER: {
        // --- DARK_RANGER | Estimated polygons: ~52800 triangles ---
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.9 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x7766aa, roughness: 0.5 });
        const drLeatherMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.85 });
        const drMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.4, metalness: 0.6 });
        const drEyeGlowMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844dd, emissiveIntensity: 2.5 });
        const drPurpleTipMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.0 });
        const drFletchMat = new THREE.MeshStandardMaterial({ color: 0x332255, roughness: 0.8 });

        // Torso with chest plate and belt
        const drTorso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.22), cloakMat);
        drTorso.position.y = 1.15;
        drTorso.castShadow = true;
        group.add(drTorso);
        const drChestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), drLeatherMat);
        drChestPlate.position.set(0, 1.22, 0.12);
        group.add(drChestPlate);
        const drChestRidge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.04), drMetalMat);
        drChestRidge.position.set(0, 1.22, 0.14);
        group.add(drChestRidge);
        const drBelt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.24), drLeatherMat);
        drBelt.position.set(0, 0.93, 0);
        group.add(drBelt);
        const drBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), drMetalMat);
        drBuckle.position.set(0, 0.93, 0.13);
        group.add(drBuckle);
        for (const bx of [-0.14, 0.14]) {
          const drPouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.05), drLeatherMat);
          drPouch.position.set(bx, 0.89, 0.12);
          group.add(drPouch);
        }
        // Shoulder pads
        for (const sx of [-0.22, 0.22]) {
          const drShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), drLeatherMat);
          drShoulder.scale.set(1.0, 0.6, 0.8);
          drShoulder.position.set(sx, 1.38, 0);
          group.add(drShoulder);
          const drShoulderRim = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), drMetalMat);
          drShoulderRim.rotation.x = Math.PI / 2;
          drShoulderRim.position.set(sx, 1.35, 0);
          group.add(drShoulderRim);
        }
        // Dagger sheath on belt
        const drSheath = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), drLeatherMat);
        drSheath.position.set(-0.16, 0.84, 0.1);
        drSheath.rotation.z = 0.2;
        group.add(drSheath);
        const drDaggerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), drMetalMat);
        drDaggerHandle.position.set(-0.155, 0.92, 0.1);
        drDaggerHandle.rotation.z = 0.2;
        group.add(drDaggerHandle);

        // Cloak - layered for flowing effect
        const drCloak = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.85, 24), cloakMat);
        drCloak.position.set(0, 0.88, -0.08);
        group.add(drCloak);
        const drInnerCloak = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 20), new THREE.MeshStandardMaterial({ color: 0x22223a, roughness: 0.9 }));
        drInnerCloak.position.set(0, 0.9, -0.05);
        group.add(drInnerCloak);
        for (let cl = 0; cl < 4; cl++) {
          const drapeW = 0.18 - cl * 0.03;
          const drapeH = 0.6 - cl * 0.06;
          const drDrape = new THREE.Mesh(new THREE.BoxGeometry(drapeW, drapeH, 0.015), new THREE.MeshStandardMaterial({ color: 0x14142a, roughness: 0.95, transparent: true, opacity: 0.85 + cl * 0.04 }));
          drDrape.position.set((cl - 1.5) * 0.08, 0.7, -0.28 - cl * 0.02);
          drDrape.rotation.x = -0.15 + cl * 0.05;
          group.add(drDrape);
        }
        const drClasp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), drMetalMat);
        drClasp.position.set(0, 1.33, 0.12);
        group.add(drClasp);

        // Head with facial features
        const drHead = new THREE.Mesh(new THREE.SphereGeometry(0.145, 32, 24), skinMat);
        drHead.position.y = 1.56;
        group.add(drHead);
        const drNoseRidge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.035), skinMat);
        drNoseRidge.position.set(0, 1.555, 0.14);
        group.add(drNoseRidge);
        const drChin = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), skinMat);
        drChin.scale.set(1.0, 0.6, 0.8);
        drChin.position.set(0, 1.44, 0.1);
        group.add(drChin);
        for (const ex of [-0.05, 0.05]) {
          const drEyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), drEyeGlowMat);
          drEyeGlow.position.set(ex, 1.575, 0.12);
          group.add(drEyeGlow);
        }

        // Hood - layered
        const drMainHood = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.24, 24), cloakMat);
        drMainHood.position.y = 1.695;
        group.add(drMainHood);
        const drHoodDrapeFront = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.18, 20), cloakMat);
        drHoodDrapeFront.position.set(0, 1.62, 0.04);
        drHoodDrapeFront.rotation.x = 0.2;
        group.add(drHoodDrapeFront);
        const drHoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.015), cloakMat);
        drHoodBack.position.set(0, 1.56, -0.16);
        drHoodBack.rotation.x = -0.3;
        group.add(drHoodBack);
        const drVeil = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.065, 0.02), cloakMat);
        drVeil.position.set(0, 1.535, 0.135);
        group.add(drVeil);

        // Legs with thigh wraps, knee guards, and boots
        for (let drSide = -1; drSide <= 1; drSide += 2) {
          const drLegGroup = new THREE.Group();
          drLegGroup.name = drSide === -1 ? 'anim_ll' : 'anim_rl';
          drLegGroup.position.set(drSide * 0.09, 0.86, 0);
          const drThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.38, 16), cloakMat);
          drThigh.position.y = -0.19;
          drLegGroup.add(drThigh);
          for (let tw = 0; tw < 3; tw++) {
            const drStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.067, 0.018, 16), drLeatherMat);
            drStrap.position.y = -0.08 - tw * 0.12;
            drLegGroup.add(drStrap);
          }
          const drKnee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), drMetalMat);
          drKnee.scale.set(1.0, 0.7, 1.1);
          drKnee.position.y = -0.4;
          drLegGroup.add(drKnee);
          const drShin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.35, 16), cloakMat);
          drShin.position.y = -0.595;
          drLegGroup.add(drShin);
          const drBootUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.065, 0.18, 16), drLeatherMat);
          drBootUpper.position.y = -0.81;
          drLegGroup.add(drBootUpper);
          const drBootSole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.16), drLeatherMat);
          drBootSole.position.set(0, -0.92, 0.02);
          drLegGroup.add(drBootSole);
          const drBootBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), drMetalMat);
          drBootBuckle.position.set(0, -0.76, 0.065);
          drLegGroup.add(drBootBuckle);
          group.add(drLegGroup);
        }

        // Arms
        {
          // Left arm with detailed bow
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.26, 1.4, 0);
          const laUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.28, 16), skinMat);
          laUpperArm.position.y = -0.14;
          leftArmGroup.add(laUpperArm);
          const laBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.14, 16), drLeatherMat);
          laBracer.position.y = -0.35;
          leftArmGroup.add(laBracer);
          const laBracerBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.02), drMetalMat);
          laBracerBuckle.position.set(0, -0.35, 0.044);
          leftArmGroup.add(laBracerBuckle);
          const laHand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), drLeatherMat);
          laHand.scale.set(1.0, 0.85, 0.75);
          laHand.position.y = -0.46;
          leftArmGroup.add(laHand);
          // Detailed dark bow
          const dBowMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: 0x4422aa, emissiveIntensity: 0.5, roughness: 0.6 });
          const dBowArc = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 16, 32, Math.PI), dBowMat);
          dBowArc.position.set(-0.12, -0.42, 0.16);
          dBowArc.rotation.z = Math.PI / 2;
          leftArmGroup.add(dBowArc);
          const dBowGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), drLeatherMat);
          dBowGrip.position.set(-0.12, -0.42, 0.16);
          dBowGrip.rotation.z = Math.PI / 2;
          leftArmGroup.add(dBowGrip);
          const dBowString = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.72, 8), new THREE.MeshStandardMaterial({ color: 0x8888cc, roughness: 0.3 }));
          dBowString.position.set(-0.12, -0.42, 0.16);
          dBowString.rotation.z = Math.PI / 2;
          leftArmGroup.add(dBowString);
          for (const dby of [-0.355, 0.355]) {
            const dBowTip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), drMetalMat);
            dBowTip.position.set(-0.12 + dby, -0.42, 0.16);
            leftArmGroup.add(dBowTip);
          }
          group.add(leftArmGroup);

          // Right arm - reaching for arrow
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.26, 1.4, 0);
          const raUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.28, 16), skinMat);
          raUpperArm.position.y = -0.14;
          rightArmGroup.add(raUpperArm);
          const raForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 16), skinMat);
          raForearm.position.y = -0.37;
          rightArmGroup.add(raForearm);
          const raBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.14, 16), drLeatherMat);
          raBracer.position.y = -0.37;
          rightArmGroup.add(raBracer);
          const raHand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), skinMat);
          raHand.position.y = -0.51;
          rightArmGroup.add(raHand);
          for (let fi = 0; fi < 3; fi++) {
            const raFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.055, 8), skinMat);
            raFinger.position.set(-0.015 + fi * 0.015, -0.56, 0.02);
            raFinger.rotation.x = 0.3;
            rightArmGroup.add(raFinger);
          }
          group.add(rightArmGroup);
        }

        // Quiver with detailed arrow fletching
        const drQuiverBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.42, 16), drLeatherMat);
        drQuiverBody.position.set(0.14, 1.2, -0.14);
        drQuiverBody.rotation.x = 0.15;
        group.add(drQuiverBody);
        const drQuiverCap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.045, 0.03, 16), drMetalMat);
        drQuiverCap.position.set(0.14, 1.0, -0.13);
        group.add(drQuiverCap);
        const drQuiverStrap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), drLeatherMat);
        drQuiverStrap.position.set(0.08, 1.15, -0.1);
        drQuiverStrap.rotation.z = -0.2;
        group.add(drQuiverStrap);
        for (let da = 0; da < 7; da++) {
          const daAngle = (da / 7) * Math.PI * 1.8 - 0.3;
          const daR = 0.028;
          const daShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.46, 8), cloakMat);
          daShaft.position.set(0.14 + Math.cos(daAngle) * daR, 1.32, -0.14 + Math.sin(daAngle) * daR);
          group.add(daShaft);
          const daTip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 8), drPurpleTipMat);
          daTip.position.set(0.14 + Math.cos(daAngle) * daR, 1.565, -0.14 + Math.sin(daAngle) * daR);
          group.add(daTip);
          for (let fl = 0; fl < 2; fl++) {
            const daFletch = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.04, 0.003), drFletchMat);
            daFletch.position.set(0.14 + Math.cos(daAngle) * daR + (fl === 0 ? 0.01 : -0.01), 1.09, -0.14 + Math.sin(daAngle) * daR);
            daFletch.rotation.y = fl === 0 ? 0.4 : -0.4;
            group.add(daFletch);
          }
        }

        // Enhanced shadow trail
        const drTrailMat1 = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, transparent: true, opacity: 0.25, roughness: 0.5 });
        const drTrailMat2 = new THREE.MeshStandardMaterial({ color: 0x110033, transparent: true, opacity: 0.15, roughness: 0.5 });
        const drTrailMat3 = new THREE.MeshStandardMaterial({ color: 0x220044, transparent: true, opacity: 0.08, roughness: 0.5 });
        const drTrail1 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 20), drTrailMat1);
        drTrail1.position.set(0, 0.62, -0.38);
        drTrail1.rotation.x = Math.PI / 2;
        group.add(drTrail1);
        const drTrail2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 16), drTrailMat2);
        drTrail2.position.set(0, 0.55, -0.55);
        drTrail2.rotation.x = Math.PI / 2;
        group.add(drTrail2);
        const drTrail3 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 14), drTrailMat3);
        drTrail3.position.set(0, 0.5, -0.75);
        drTrail3.rotation.x = Math.PI / 2;
        group.add(drTrail3);
        for (let tw = 0; tw < 5; tw++) {
          const drWispAngle = (tw / 5) * Math.PI * 2;
          const drWisp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), drTrailMat2);
          drWisp.position.set(Math.cos(drWispAngle) * 0.18, 0.5 + tw * 0.06, -0.35 - tw * 0.08);
          drWisp.rotation.x = Math.PI / 2 + 0.3;
          group.add(drWisp);
        }
        break;
      }

      case EnemyType.SHADOW_BEAST: {
        // --- SHADOW_BEAST | Estimated polygons: ~110000 triangles ---
        const shadowMat = new THREE.MeshStandardMaterial({
          color: 0x1a0a2a, transparent: true, opacity: 0.72, roughness: 0.5,
        });

        const shadowDarkMat = new THREE.MeshStandardMaterial({
          color: 0x0d0518, transparent: true, opacity: 0.85, roughness: 0.5,
        });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xcc55ff, emissive: 0xaa22ee, emissiveIntensity: 2.5 });
        const eyeAuraMat = new THREE.MeshStandardMaterial({ color: 0xbb44ff, transparent: true, opacity: 0.22, emissive: 0x9900cc, emissiveIntensity: 0.7 });
        const mawMat = new THREE.MeshStandardMaterial({ color: 0x220000, roughness: 0.8 });
        const mawCavityMat = new THREE.MeshStandardMaterial({ color: 0x0a0000, roughness: 1.0 });
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.5 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x7733cc, emissive: 0x5511aa, emissiveIntensity: 2.5, transparent: true, opacity: 0.85 });
        const coreMidMat = new THREE.MeshStandardMaterial({ color: 0x5522aa, emissive: 0x3308aa, emissiveIntensity: 1.2, transparent: true, opacity: 0.55 });
        const coreOuterMat = new THREE.MeshStandardMaterial({ color: 0x3311aa, transparent: true, opacity: 0.28 });
        const tendrilMat = new THREE.MeshStandardMaterial({ color: 0x140a24, transparent: true, opacity: 0.8, roughness: 0.6 });
        const tendrilTipMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822cc, emissiveIntensity: 1.8 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x0a0518, roughness: 0.7 });
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x08030f, roughness: 0.8 });
        const droolMat = new THREE.MeshStandardMaterial({ color: 0x330033, transparent: true, opacity: 0.55 });
        const soulMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.25, emissive: 0x88bbff, emissiveIntensity: 0.6 });
        const soulEyeMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 });
        const wisp = new THREE.MeshStandardMaterial({ color: 0x4a1a8a, transparent: true, opacity: 0.18, roughness: 0.4 });
        const particleMat = new THREE.MeshStandardMaterial({ color: 0x080310, roughness: 0.9 });
        const shadowPlaneMat = new THREE.MeshStandardMaterial({ color: 0x050208, transparent: true, opacity: 0.22, roughness: 1.0, side: THREE.DoubleSide });

        const sbHover = new THREE.Group();
        sbHover.name = 'anim_hover';

        // === DENSER BODY MASS — 9 overlapping translucent spheres ===
        // Outer/lower spheres (more transparent)
        const bodySpheresOuter = [
          [0,    0.55, 0,    0.62, 0.42],
          [0.08, 0.90, 0.06, 0.52, 0.50],
          [-0.1, 1.25, 0.04, 0.50, 0.55],
          [0.05, 1.60, -0.05,0.48, 0.52],
          [0,    1.95, 0.06, 0.42, 0.48],
          [0.09, 2.30, 0,    0.34, 0.43],
        ];
        for (const bs of bodySpheresOuter) {
          const bMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, transparent: true, opacity: bs[4], roughness: 0.5 });
          const bSphere = new THREE.Mesh(new THREE.SphereGeometry(bs[3], 32, 24), bMat);
          bSphere.position.set(bs[0], bs[1], bs[2]);
          bSphere.castShadow = true;
          sbHover.add(bSphere);
        }
        // Inner denser spheres
        const bodySpheresInner = [
          [-0.06, 0.80, 0,    0.38, shadowMat],
          [0.05,  1.35, 0.03, 0.42, shadowMat],
          [-0.04, 1.80, -0.04,0.35, shadowMat],
        ];
        for (const bs of bodySpheresInner) {
          const bSphere = new THREE.Mesh(new THREE.SphereGeometry(bs[3] as number, 32, 24), bs[4] as THREE.MeshStandardMaterial);
          bSphere.position.set(bs[0] as number, bs[1] as number, bs[2] as number);
          sbHover.add(bSphere);
        }

        // === DEFINED "HEAD" REGION — cluster of 4 darker spheres at top ===
        const headPositions = [
          [0,    2.50, 0,    0.30],
          [-0.1, 2.40, 0.05, 0.22],
          [0.1,  2.42, 0.04, 0.21],
          [0,    2.62, -0.04,0.18],
        ];
        for (const hp of headPositions) {
          const hSphere = new THREE.Mesh(new THREE.SphereGeometry(hp[3], 24, 16), shadowDarkMat);
          hSphere.position.set(hp[0], hp[1], hp[2]);
          sbHover.add(hSphere);
        }

        // === ENHANCED MAW ===
        // Gaping mouth cavity (dark sphere)
        const mawCavity = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), mawCavityMat);
        mawCavity.scale.set(1.8, 0.7, 0.55);
        mawCavity.position.set(0, 1.82, 0.38);
        sbHover.add(mawCavity);

        // Outer maw rim
        const mawRim = new THREE.Mesh(new THREE.SphereGeometry(0.165, 24, 16), mawMat);
        mawRim.scale.set(2.0, 0.6, 0.5);
        mawRim.position.set(0, 1.82, 0.36);
        sbHover.add(mawRim);

        // Teeth ring — 9 cone teeth pointing inward
        for (let ti = 0; ti < 9; ti++) {
          const tAngle = (ti / 9) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.085, 8), toothMat);
          tooth.position.set(
            Math.cos(tAngle) * 0.28,
            1.82 + Math.sin(tAngle) * 0.1,
            0.36 + Math.abs(Math.cos(tAngle)) * 0.04
          );
          tooth.rotation.z = Math.cos(tAngle) * -1.2 + Math.PI;
          tooth.rotation.x = Math.sin(tAngle) * -0.6 + 0.3;
          sbHover.add(tooth);
        }

        // Drool tendrils (4 thin hanging cylinders from mouth edges)
        const droolPositions = [[-0.22, 1.73, 0.40], [0.22, 1.73, 0.40], [-0.1, 1.70, 0.44], [0.1, 1.70, 0.44]];
        for (const dp of droolPositions) {
          const drool = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.18, 8), droolMat);
          drool.position.set(dp[0], dp[1], dp[2]);
          drool.rotation.x = 0.15;
          sbHover.add(drool);
        }

        // === 4 EYES — 2 large + 2 smaller above, with aura spheres ===
        const sbEyeData = [
          [-0.16, 2.05, 0.32, 0.075],  // large left
          [ 0.16, 2.05, 0.32, 0.075],  // large right
          [-0.09, 2.22, 0.30, 0.048],  // small upper left
          [ 0.09, 2.22, 0.30, 0.048],  // small upper right
        ];
        for (const ed of sbEyeData) {
          const eyeSphere = new THREE.Mesh(new THREE.SphereGeometry(ed[3], 24, 16), eyeMat);
          eyeSphere.position.set(ed[0], ed[1], ed[2]);
          sbHover.add(eyeSphere);
          const aura = new THREE.Mesh(new THREE.SphereGeometry(ed[3] * 1.7, 16, 12), eyeAuraMat);
          aura.position.set(ed[0], ed[1], ed[2]);
          sbHover.add(aura);
        }

        // === GLOWING CORE — 3 layered spheres ===
        const coreInner = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), coreMat);
        coreInner.position.y = 1.35;
        sbHover.add(coreInner);
        const coreMid = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), coreMidMat);
        coreMid.position.y = 1.35;
        sbHover.add(coreMid);
        const coreOuter = new THREE.Mesh(new THREE.SphereGeometry(0.40, 20, 14), coreOuterMat);
        coreOuter.position.y = 1.35;
        sbHover.add(coreOuter);

        // === ENHANCED TENDRILS — 9 multi-segment tendrils with glowing tips ===
        for (let ti = 0; ti < 9; ti++) {
          const tAngle = (ti / 9) * Math.PI * 2;
          const tBaseX = Math.cos(tAngle) * 0.45;
          const tBaseZ = Math.sin(tAngle) * 0.45;
          const tBaseY = 0.85 + (ti % 3) * 0.35;
          // Segment 1 (thick base)
          const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.38, 10), tendrilMat);
          seg1.position.set(tBaseX * 0.5, tBaseY, tBaseZ * 0.5);
          seg1.rotation.z = Math.cos(tAngle) * 0.7;
          seg1.rotation.x = Math.sin(tAngle) * 0.5;
          sbHover.add(seg1);
          // Segment 2
          const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.32, 10), tendrilMat);
          seg2.position.set(tBaseX * 0.85, tBaseY - 0.12, tBaseZ * 0.85);
          seg2.rotation.z = Math.cos(tAngle) * 1.1;
          seg2.rotation.x = Math.sin(tAngle) * 0.7;
          sbHover.add(seg2);
          // Segment 3 (thin tip)
          const seg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.008, 0.28, 8), tendrilMat);
          seg3.position.set(tBaseX * 1.25, tBaseY - 0.32, tBaseZ * 1.25);
          seg3.rotation.z = Math.cos(tAngle) * 1.45;
          seg3.rotation.x = Math.sin(tAngle) * 0.9;
          sbHover.add(seg3);
          // Glowing tip sphere
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), tendrilTipMat);
          tip.position.set(tBaseX * 1.55, tBaseY - 0.5, tBaseZ * 1.55);
          sbHover.add(tip);
        }

        // === SHADOW CLAWS — 2 large front tendrils (anim_la / anim_ra) with claw fingers ===
        for (let side = -1; side <= 1; side += 2) {
          const clawGroup = new THREE.Group();
          clawGroup.name = side === -1 ? 'anim_la' : 'anim_ra';
          clawGroup.position.set(side * 0.35, 1.1, 0.2);
          sbHover.add(clawGroup);

          // Claw arm — 2 thick cylinders
          const clawArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.5, 12), shadowDarkMat);
          clawArm1.position.set(side * 0.15, -0.05, 0.1);
          clawArm1.rotation.z = side * 0.55;
          clawArm1.rotation.x = 0.3;
          clawGroup.add(clawArm1);
          const clawArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.030, 0.42, 12), shadowDarkMat);
          clawArm2.position.set(side * 0.32, -0.28, 0.28);
          clawArm2.rotation.z = side * 0.85;
          clawArm2.rotation.x = 0.55;
          clawGroup.add(clawArm2);

          // 3 claw fingers (cone shaped)
          for (let fi = 0; fi < 3; fi++) {
            const fAngle = (fi - 1) * 0.28;
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.18, 8), clawMat);
            finger.position.set(side * (0.44 + fi * 0.02), -0.52 + fi * 0.02, 0.42);
            finger.rotation.z = side * (1.15 + fAngle);
            finger.rotation.x = 0.7 + fi * 0.1;
            clawGroup.add(finger);
          }
        }

        // === SPINY PROTRUSIONS — 7 dark cone spikes at various angles from body ===
        const spikeData = [
          [0.5,  1.0, 0.2,   0.3],
          [-0.5, 1.15, 0.1,  0.28],
          [0.3,  1.6, 0.5,   0.24],
          [-0.4, 1.7, 0.4,   0.22],
          [0.05, 0.6, 0.5,   0.26],
          [0.45, 2.0, -0.15, 0.20],
          [-0.42,1.4, -0.2,  0.21],
        ];
        for (const sd of spikeData) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, sd[3], 10), spikeMat);
          spike.position.set(sd[0], sd[1], sd[2]);
          spike.rotation.z = sd[0] * 1.4;
          spike.rotation.x = sd[2] * 1.2;
          sbHover.add(spike);
        }

        // === SHADOW PARTICLES — 9 small dark octahedrons orbiting body ===
        for (let pi = 0; pi < 9; pi++) {
          const pAngle = (pi / 9) * Math.PI * 2;
          const pR = 0.9 + (pi % 3) * 0.22;
          const pY = 0.7 + (pi % 4) * 0.45;
          const particle = new THREE.Mesh(new THREE.OctahedronGeometry(0.045 + (pi % 3) * 0.012, 0), particleMat);
          particle.position.set(Math.cos(pAngle) * pR, pY, Math.sin(pAngle) * pR);
          particle.rotation.set(pAngle * 0.7, pAngle * 1.1, pAngle * 0.4);
          sbHover.add(particle);
        }

        // === DARK ENERGY WISPS — 6 semi-transparent torus rings ===
        for (let wi = 0; wi < 6; wi++) {
          const wR = 0.55 + (wi % 3) * 0.18;
          const wY = 0.65 + wi * 0.32;
          const wispRing = new THREE.Mesh(new THREE.TorusGeometry(wR, 0.022, 8, 24), wisp);
          wispRing.position.y = wY;
          wispRing.rotation.x = (wi % 3) * 0.55;
          wispRing.rotation.z = wi * 0.42;
          sbHover.add(wispRing);
        }

        // === ENHANCED GROUND SHADOW — larger circle + shadow tendril planes ===
        const gShadowGeo = new THREE.CircleGeometry(1.5, 32);
        const gShadowMat = new THREE.MeshStandardMaterial({ color: 0x050208, transparent: true, opacity: 0.45, roughness: 1.0 });
        const gShadow = new THREE.Mesh(gShadowGeo, gShadowMat);
        gShadow.rotation.x = -Math.PI / 2;
        gShadow.position.y = 0.02;
        sbHover.add(gShadow);

        // Shadow tendril planes radiating outward
        for (let sp = 0; sp < 6; sp++) {
          const spAngle = (sp / 6) * Math.PI * 2;
          const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.1), shadowPlaneMat);
          shadowPlane.rotation.x = -Math.PI / 2;
          shadowPlane.rotation.z = spAngle;
          shadowPlane.position.set(Math.cos(spAngle) * 1.3, 0.022, Math.sin(spAngle) * 1.3);
          sbHover.add(shadowPlane);
        }

        // === ABSORBED SOULS — 4 tiny ghostly face shapes trapped in body ===
        const soulPositions = [
          [0.18, 1.05, 0.12],
          [-0.22, 1.55, 0.08],
          [0.12, 2.10, -0.1],
          [-0.1, 0.85, -0.15],
        ];
        for (const sp of soulPositions) {
          // Ghost head sphere
          const soulHead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), soulMat);
          soulHead.position.set(sp[0], sp[1], sp[2]);
          sbHover.add(soulHead);
          // 2 tiny dark eye dots
          for (let se = -1; se <= 1; se += 2) {
            const soulEye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), soulEyeMat);
            soulEye.position.set(sp[0] + se * 0.018, sp[1] + 0.01, sp[2] + 0.048);
            sbHover.add(soulEye);
          }
        }

        group.add(sbHover);
        break;
      }

      case EnemyType.SKELETON_WARRIOR: {
        // --- SKELETON_WARRIOR | Estimated polygons: ~100000 triangles ---
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 });
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const soulFireMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22cc44, emissiveIntensity: 2.5, transparent: true, opacity: 0.85 });
        const rustMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, metalness: 0.4, roughness: 0.9 });
        const swordMetalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.8, side: THREE.DoubleSide });
        const tatteredMat = new THREE.MeshStandardMaterial({ color: 0x444433, transparent: true, opacity: 0.5, roughness: 0.9, side: THREE.DoubleSide });
        const cobwebMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, transparent: true, opacity: 0.25, roughness: 1.0, side: THREE.DoubleSide });
        const necroGlowMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22cc22, emissiveIntensity: 1.2, transparent: true, opacity: 0.45 });
        const darkLineMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 });

        // === SKULL ===
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), boneMat);
        skull.position.y = 1.55;
        skull.castShadow = true;
        group.add(skull);
        // Brow ridge
        const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.04), boneMat);
        browRidge.position.set(0, 1.585, 0.13);
        group.add(browRidge);
        // Cheekbones
        for (const sx of [-1, 1]) {
          const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), boneMat);
          cheek.position.set(sx * 0.12, 1.535, 0.12);
          group.add(cheek);
        }
        // Nasal cavity
        const nasalCone = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 8), darkLineMat);
        nasalCone.rotation.x = Math.PI;
        nasalCone.position.set(0, 1.545, 0.155);
        group.add(nasalCone);
        // Temporal bones
        for (const sx of [-1, 1]) {
          const temporal = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), boneMat);
          temporal.position.set(sx * 0.155, 1.565, 0.02);
          group.add(temporal);
        }
        // Cracked skull line
        const skullCrack = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.1, 0.005), darkLineMat);
        skullCrack.position.set(0.04, 1.575, 0.15);
        skullCrack.rotation.z = 0.3;
        group.add(skullCrack);

        // === EYE SOCKETS with soul fire ===
        for (const sx of [-1, 1]) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), socketMat);
          socket.position.set(sx * 0.063, 1.565, 0.12);
          group.add(socket);
          const soulFire = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), soulFireMat);
          soulFire.position.set(sx * 0.063, 1.565, 0.105);
          group.add(soulFire);
        }

        // === JAW (articulated group with teeth) ===
        const jawGroup = new THREE.Group();
        jawGroup.name = 'anim_jaw';
        jawGroup.position.set(0, 1.44, 0.08);
        jawGroup.rotation.x = 0.18;
        const jawBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.07), boneMat);
        jawGroup.add(jawBase);
        // Lower jaw teeth
        for (let t = 0; t < 7; t++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.012), boneMat);
          tooth.position.set(-0.042 + t * 0.014, 0.033, 0.025);
          jawGroup.add(tooth);
        }
        group.add(jawGroup);
        // Upper jaw teeth (attached to skull base)
        for (let t = 0; t < 7; t++) {
          const upperTooth = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.012), boneMat);
          upperTooth.position.set(-0.042 + t * 0.014, 1.43, 0.12);
          group.add(upperTooth);
        }

        // === NECK VERTEBRAE ===
        for (let nv = 0; nv < 3; nv++) {
          const neckVert = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), boneMat);
          neckVert.position.set(0, 1.47 - nv * 0.065, -0.02);
          group.add(neckVert);
        }

        // === SPINE: individual vertebrae with spinous processes ===
        for (let sv = 0; sv < 9; sv++) {
          const vertBox = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.042, 0.048), boneMat);
          vertBox.position.set(0, 1.35 - sv * 0.065, 0);
          group.add(vertBox);
          const spinProcess = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 8), boneMat);
          spinProcess.rotation.x = -Math.PI / 2;
          spinProcess.position.set(0, 1.35 - sv * 0.065, -0.038);
          group.add(spinProcess);
        }

        // === SCAPULAE ===
        for (const sx of [-1, 1]) {
          const scapula = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.015), boneMat);
          scapula.position.set(sx * 0.16, 1.28, -0.07);
          scapula.rotation.z = sx * 0.3;
          group.add(scapula);
        }

        // === RIBS: 6 pairs, varying sizes, some broken ===
        for (let r = 0; r < 6; r++) {
          const ribRadius = 0.17 - r * 0.018;
          const ribArcLeft = r === 2 || r === 4 ? Math.PI * 0.6 : Math.PI;
          const ribGeoL = new THREE.TorusGeometry(ribRadius, 0.012, 12, 32, ribArcLeft);
          const ribL = new THREE.Mesh(ribGeoL, boneMat);
          ribL.position.y = 1.32 - r * 0.075;
          ribL.rotation.y = Math.PI;
          group.add(ribL);
          const ribGeoR = new THREE.TorusGeometry(ribRadius, 0.012, 12, 32, Math.PI);
          const ribR = new THREE.Mesh(ribGeoR, boneMat);
          ribR.position.y = 1.32 - r * 0.075;
          ribR.rotation.y = 0;
          group.add(ribR);
        }

        // === COBWEBS between ribs ===
        for (let cw = 0; cw < 3; cw++) {
          const cobweb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.005), cobwebMat);
          cobweb.position.set((cw - 1) * 0.1, 1.22 - cw * 0.06, 0.1);
          cobweb.rotation.z = (cw - 1) * 0.25;
          group.add(cobweb);
        }

        // === PELVIS enhanced ===
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.14), boneMat);
        pelvis.position.y = 0.85;
        group.add(pelvis);
        // Iliac crests
        for (const sx of [-1, 1]) {
          const iliac = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), boneMat);
          iliac.position.set(sx * 0.16, 0.9, 0.02);
          iliac.rotation.z = sx * 0.25;
          group.add(iliac);
        }

        // === LEFT ARM (anim_la) with enhanced broken shield ===
        {
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.22, 1.375, 0);
          // Humerus
          const leftHumerus = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.35, 16), boneMat);
          leftHumerus.position.y = -0.175;
          leftArmGroup.add(leftHumerus);
          // Muscle bump on humerus
          const humBump = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), boneMat);
          humBump.position.set(-0.025, -0.1, 0.01);
          leftArmGroup.add(humBump);
          // Elbow joint
          const leftElbow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), boneMat);
          leftElbow.position.set(-0.02, -0.365, 0);
          leftArmGroup.add(leftElbow);
          // Radius
          const leftRadius = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.28, 12), boneMat);
          leftRadius.position.set(-0.05, -0.515, 0.01);
          leftArmGroup.add(leftRadius);
          // Ulna
          const leftUlna = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.28, 12), boneMat);
          leftUlna.position.set(-0.02, -0.515, -0.01);
          leftArmGroup.add(leftUlna);
          // Wrist cluster
          for (let wc = 0; wc < 3; wc++) {
            const wristBone = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), boneMat);
            wristBone.position.set(-0.035 + wc * 0.014, -0.665, 0);
            leftArmGroup.add(wristBone);
          }
          // 4 finger bones (one missing - battle damage)
          for (let fb = 0; fb < 4; fb++) {
            const fingerP = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 8), boneMat);
            fingerP.position.set(-0.065 + fb * 0.018, -0.715, 0.01);
            leftArmGroup.add(fingerP);
            const fingerD = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.045, 8), boneMat);
            fingerD.position.set(-0.065 + fb * 0.018, -0.765, 0.01);
            leftArmGroup.add(fingerD);
          }
          // Enhanced broken shield
          const shieldMain = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24, 0, Math.PI * 1.3), shieldMat);
          shieldMain.position.set(-0.1, -0.48, 0.09);
          shieldMain.rotation.y = 0.2;
          leftArmGroup.add(shieldMain);
          const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), rustMat);
          shieldBoss.position.set(-0.1, -0.48, 0.11);
          leftArmGroup.add(shieldBoss);
          const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 8, 20, Math.PI * 1.1), rustMat);
          shieldRim.position.set(-0.1, -0.48, 0.09);
          shieldRim.rotation.y = 0.2;
          leftArmGroup.add(shieldRim);
          const shieldStrap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.01), rustMat);
          shieldStrap.position.set(-0.1, -0.42, 0.09);
          leftArmGroup.add(shieldStrap);
          group.add(leftArmGroup);
        }

        // === RIGHT ARM (anim_ra) with enhanced sword ===
        {
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.22, 1.375, 0);
          // Humerus
          const rightHumerus = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.35, 16), boneMat);
          rightHumerus.position.y = -0.175;
          rightArmGroup.add(rightHumerus);
          const humBumpR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), boneMat);
          humBumpR.position.set(0.025, -0.1, 0.01);
          rightArmGroup.add(humBumpR);
          // Elbow joint
          const rightElbow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), boneMat);
          rightElbow.position.set(0.02, -0.365, 0);
          rightArmGroup.add(rightElbow);
          // Radius + Ulna
          const rightRadius = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.28, 12), boneMat);
          rightRadius.position.set(0.05, -0.515, 0.01);
          rightArmGroup.add(rightRadius);
          const rightUlna = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.28, 12), boneMat);
          rightUlna.position.set(0.02, -0.515, -0.01);
          rightArmGroup.add(rightUlna);
          // Wrist cluster
          for (let wc = 0; wc < 3; wc++) {
            const wristBone = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), boneMat);
            wristBone.position.set(0.025 + wc * 0.014, -0.665, 0);
            rightArmGroup.add(wristBone);
          }
          // 5 finger bones
          for (let fb = 0; fb < 5; fb++) {
            const fingerP = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 8), boneMat);
            fingerP.position.set(0.01 + fb * 0.017, -0.715, 0.01);
            rightArmGroup.add(fingerP);
            const fingerD = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.045, 8), boneMat);
            fingerD.position.set(0.01 + fb * 0.017, -0.765, 0.01);
            rightArmGroup.add(fingerD);
          }
          // Sword blade with fuller groove
          const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.65, 0.016), swordMetalMat);
          swordBlade.position.set(0.09, -0.55, 0);
          rightArmGroup.add(swordBlade);
          const swordFuller = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.55, 0.018), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.2 }));
          swordFuller.position.set(0.09, -0.55, 0);
          rightArmGroup.add(swordFuller);
          // Crossguard
          const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.022), swordMetalMat);
          crossguard.position.set(0.09, -0.245, 0);
          rightArmGroup.add(crossguard);
          // Grip
          const swordGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 }));
          swordGrip.position.set(0.09, -0.33, 0);
          rightArmGroup.add(swordGrip);
          // Pommel
          const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), swordMetalMat);
          pommel.position.set(0.09, -0.415, 0);
          rightArmGroup.add(pommel);
          // Blade tip
          const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.021, 0.07, 8), swordMetalMat);
          bladeTip.position.set(0.09, -0.195, 0);
          rightArmGroup.add(bladeTip);
          group.add(rightArmGroup);
        }

        // === LEGS enhanced (anim_ll, anim_rl) ===
        for (const side of [-1, 1]) {
          const legGroup = new THREE.Group();
          legGroup.name = side === -1 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(side * 0.09, 0.82, 0);
          // Hip ball joint
          const hipBall = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), boneMat);
          hipBall.position.y = 0.035;
          legGroup.add(hipBall);
          // Femur
          const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.036, 0.42, 16), boneMat);
          femur.position.y = -0.215;
          legGroup.add(femur);
          // Patella (kneecap)
          const patella = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), boneMat);
          patella.scale.y = 0.6;
          patella.position.set(0, -0.44, 0.03);
          legGroup.add(patella);
          // Tibia
          const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.38, 12), boneMat);
          tibia.position.set(0.01, -0.64, 0);
          legGroup.add(tibia);
          // Fibula
          const fibula = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.34, 10), boneMat);
          fibula.position.set(side * 0.028, -0.64, -0.01);
          legGroup.add(fibula);
          // Ankle
          const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 8), boneMat);
          ankle.position.set(0, -0.845, 0);
          legGroup.add(ankle);
          // Foot
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.1), boneMat);
          foot.position.set(0, -0.875, 0.035);
          legGroup.add(foot);
          // Toe bones
          for (let t = 0; t < 3; t++) {
            const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8), boneMat);
            toe.rotation.x = Math.PI / 2;
            toe.position.set(-0.02 + t * 0.02, -0.875, 0.085);
            legGroup.add(toe);
          }
          group.add(legGroup);
        }

        // === TATTERED CLOTH (multiple strips at waist) ===
        for (let tc = 0; tc < 4; tc++) {
          const stripGeo = new THREE.BoxGeometry(0.06 + tc * 0.02, 0.22 + tc * 0.04, 0.008);
          const strip = new THREE.Mesh(stripGeo, tatteredMat);
          strip.position.set(-0.08 + tc * 0.06, 0.7, 0.08 + tc * 0.01);
          strip.rotation.z = (tc - 1.5) * 0.12;
          group.add(strip);
        }

        // === ARMOR REMNANTS: rusted chest plate fragment ===
        const chestFrag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), rustMat);
        chestFrag.position.set(0.1, 1.2, 0.12);
        chestFrag.rotation.z = 0.3;
        group.add(chestFrag);

        // === TATTERED CAPE strips from shoulder ===
        for (let cp = 0; cp < 3; cp++) {
          const capePlane = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3 + cp * 0.06, 0.006), tatteredMat);
          capePlane.position.set(-0.14 + cp * 0.06, 1.15 - cp * 0.04, -0.08);
          capePlane.rotation.z = (cp - 1) * 0.18;
          group.add(capePlane);
        }

        // === NECROMANTIC GLOW at joints ===
        const swJointPositions: [number, number, number][] = [
          [0, 1.375, 0], [-0.22, 1.375, 0], [0.22, 1.375, 0],
          [-0.09, 0.82, 0], [0.09, 0.82, 0],
        ];
        for (const [jx, jy, jz] of swJointPositions) {
          const jGlow = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), necroGlowMat);
          jGlow.position.set(jx, jy, jz);
          group.add(jGlow);
        }
        break;
      }

      case EnemyType.ZOMBIE: {
        // --- ZOMBIE | Estimated polygons: ~55000 triangles ---
        const zombieSkin = new THREE.MeshStandardMaterial({ color: 0x667755, roughness: 0.9 });
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.95 });
        const woundMat = new THREE.MeshStandardMaterial({ color: 0xaa3344, roughness: 0.8 });
        const boneMat2 = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 });
        const tornMat = new THREE.MeshStandardMaterial({ color: 0x333322, transparent: true, opacity: 0.6, roughness: 1.0, side: THREE.DoubleSide });
        const greenDripMat = new THREE.MeshStandardMaterial({ color: 0x33aa33, emissive: 0x116611, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
        const goreMat = new THREE.MeshStandardMaterial({ color: 0xcc7788, roughness: 0.9 });
        const greenAuraMat = new THREE.MeshStandardMaterial({ color: 0x22aa22, transparent: true, opacity: 0.08, emissive: 0x115511, emissiveIntensity: 0.3 });
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.4 });

        // Hunched torso (main box + shoulder bone protrusion)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.3), clothMat);
        torso.position.set(0, 1.0, 0.05);
        torso.rotation.x = 0.22;
        torso.castShadow = true;
        group.add(torso);

        // Visible rib cage through torn shirt (thin cylinder ribs)
        for (let rb = 0; rb < 4; rb++) {
          const ribGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.28, 8);
          const rib = new THREE.Mesh(ribGeo, boneMat2);
          rib.position.set(0, 1.14 - rb * 0.07, 0.14);
          rib.rotation.z = Math.PI / 2;
          rib.rotation.y = 0.15;
          group.add(rib);
        }

        // Shoulder bone protrusion (asymmetric)
        const shoulderBoneGeo = new THREE.SphereGeometry(0.045, 12, 8);
        const shoulderBone = new THREE.Mesh(shoulderBoneGeo, boneMat2);
        shoulderBone.position.set(-0.24, 1.36, 0.05);
        group.add(shoulderBone);

        // Torn clothing patches layered
        const patchOffsets = [
          { x: 0.08, y: 0.92, rz: 0.2 },
          { x: -0.1, y: 1.05, rz: -0.15 },
          { x: 0.0, y: 1.18, rz: 0.1 },
          { x: 0.12, y: 1.12, rz: 0.35 },
          { x: -0.14, y: 0.88, rz: -0.3 },
        ];
        for (const po of patchOffsets) {
          const patchGeo = new THREE.BoxGeometry(0.13, 0.1, 0.01);
          const patch = new THREE.Mesh(patchGeo, tornMat);
          patch.position.set(po.x, po.y, 0.16);
          patch.rotation.z = po.rz;
          group.add(patch);
        }

        // Exposed ribs on left side (3 thin white cylinders through torn clothing)
        for (let er = 0; er < 3; er++) {
          const expRibGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.22, 8);
          const expRib = new THREE.Mesh(expRibGeo, boneMat2);
          expRib.position.set(-0.19, 1.08 - er * 0.07, 0.06);
          expRib.rotation.z = Math.PI / 2 + 0.3;
          group.add(expRib);
        }

        // Intestine/gore detail (small pinkish cylinders hanging from belly)
        for (let gd = 0; gd < 3; gd++) {
          const goreGeo = new THREE.CylinderGeometry(0.018, 0.014, 0.14, 8);
          const goreStrand = new THREE.Mesh(goreGeo, goreMat);
          goreStrand.position.set(-0.04 + gd * 0.04, 0.75, 0.14);
          goreStrand.rotation.x = 0.3 + gd * 0.1;
          group.add(goreStrand);
        }

        // Head (sphere with asymmetric decay features)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), zombieSkin);
        head.position.set(0.05, 1.4, 0.08);
        head.scale.set(1.0, 1.05, 0.98);
        group.add(head);

        // Missing skull chunk (dark recessed sphere on decayed side)
        const chunkMat = new THREE.MeshStandardMaterial({ color: 0x223322, roughness: 1.0 });
        const chunkGeo = new THREE.SphereGeometry(0.06, 12, 8);
        const chunk = new THREE.Mesh(chunkGeo, chunkMat);
        chunk.position.set(-0.1, 1.48, 0.04);
        chunk.scale.set(0.7, 0.7, 0.5);
        group.add(chunk);

        // Sparse hair strands (thin cylinders hanging from scalp)
        for (let hs = 0; hs < 5; hs++) {
          const hairSkinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
          const hairStrandGeo = new THREE.CylinderGeometry(0.004, 0.003, 0.1 + hs * 0.02, 12);
          const hairStrand = new THREE.Mesh(hairStrandGeo, hairSkinMat);
          hairStrand.position.set(-0.08 + hs * 0.03, 1.5, -0.1);
          hairStrand.rotation.x = 0.4 + hs * 0.1;
          group.add(hairStrand);
        }

        // Good eye (pale glowing green)
        const goodEyeMat = new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x44cc44, emissiveIntensity: 1.5 });
        const goodEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), goodEyeMat);
        goodEye.position.set(0.065, 1.43, 0.155);
        group.add(goodEye);

        // Empty eye socket (dark recessed sphere)
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), socketMat);
        socket.position.set(-0.04, 1.44, 0.148);
        group.add(socket);

        // Hanging lower jaw (anim_jaw group)
        const zJawGroup = new THREE.Group();
        zJawGroup.name = 'anim_jaw';
        zJawGroup.position.set(0.05, 1.33, 0.14);
        const zJawBase = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.07), zombieSkin);
        zJawBase.position.set(0, 0, 0);
        zJawGroup.add(zJawBase);
        // Jaw bone detail
        const jawBoneGeo = new THREE.BoxGeometry(0.09, 0.015, 0.005);
        const jawBone = new THREE.Mesh(jawBoneGeo, boneMat2);
        jawBone.position.set(0, -0.01, 0.038);
        zJawGroup.add(jawBone);
        group.add(zJawGroup);

        // Hunched back sphere
        const hunchGeo = new THREE.SphereGeometry(0.13, 32, 24);
        const hunch = new THREE.Mesh(hunchGeo, zombieSkin);
        hunch.position.set(0, 1.22, -0.12);
        group.add(hunch);

        // 8 wounds on torso, some with green drips
        const woundPositions = [
          { x: 0.1, y: 1.15, z: 0.16 }, { x: -0.12, y: 0.98, z: 0.16 },
          { x: 0.16, y: 0.88, z: 0.14 }, { x: -0.05, y: 1.22, z: 0.16 },
          { x: 0.08, y: 0.82, z: 0.15 }, { x: -0.18, y: 1.08, z: 0.14 },
          { x: 0.02, y: 1.05, z: 0.16 }, { x: 0.14, y: 1.28, z: 0.13 },
        ];
        for (let wi = 0; wi < woundPositions.length; wi++) {
          const wp = woundPositions[wi];
          const wGeo = new THREE.SphereGeometry(0.035 + (wi % 3) * 0.008, 14, 10);
          const wMesh = new THREE.Mesh(wGeo, woundMat);
          wMesh.position.set(wp.x, wp.y, wp.z);
          group.add(wMesh);
          // Every other wound has green drip
          if (wi % 2 === 0) {
            const dripGeo = new THREE.CylinderGeometry(0.006, 0.003, 0.09, 12);
            const drip = new THREE.Mesh(dripGeo, greenDripMat);
            drip.position.set(wp.x, wp.y - 0.065, wp.z);
            group.add(drip);
          }
        }

        // Arms
        {
          // Left arm (longer/drooping)
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.26, 1.27, 0.1);
          const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.32, 16), zombieSkin);
          leftUpperArm.position.y = -0.16;
          leftUpperArm.rotation.z = -0.18;
          leftArmGroup.add(leftUpperArm);
          // Exposed bone section on forearm
          const lExpBoneGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.15, 10);
          const lExpBone = new THREE.Mesh(lExpBoneGeo, boneMat2);
          lExpBone.position.set(-0.02, -0.38, 0.01);
          leftArmGroup.add(lExpBone);
          const lForearmGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.28, 16);
          const lForearm = new THREE.Mesh(lForearmGeo, zombieSkin);
          lForearm.position.y = -0.44;
          leftArmGroup.add(lForearm);
          // Left hand with 3 bent finger cylinders
          for (let fn = 0; fn < 3; fn++) {
            const lFingerGeo = new THREE.CylinderGeometry(0.012, 0.009, 0.07, 12);
            const lFinger = new THREE.Mesh(lFingerGeo, zombieSkin);
            lFinger.position.set(-0.025 + fn * 0.025, -0.61, 0.03);
            lFinger.rotation.x = 0.5;
            leftArmGroup.add(lFinger);
          }
          group.add(leftArmGroup);

          // Right arm (reaching forward, asymmetric)
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.26, 1.18, 0.1);
          const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.3, 16), zombieSkin);
          rightUpperArm.position.y = -0.15;
          rightUpperArm.rotation.z = 0.18;
          rightUpperArm.rotation.x = 0.5;
          rightArmGroup.add(rightUpperArm);
          const rForearmGeo = new THREE.CylinderGeometry(0.042, 0.048, 0.3, 16);
          const rForearm = new THREE.Mesh(rForearmGeo, zombieSkin);
          rForearm.position.y = -0.44;
          rightArmGroup.add(rForearm);
          // Chains on right wrist (torus ring chain links)
          for (let ch = 0; ch < 3; ch++) {
            const chainGeo = new THREE.TorusGeometry(0.032 - ch * 0.004, 0.006, 8, 16);
            const chainLink = new THREE.Mesh(chainGeo, chainMat);
            chainLink.position.set(0, -0.56 - ch * 0.014, 0);
            chainLink.rotation.y = ch * 0.7;
            rightArmGroup.add(chainLink);
          }
          // Right hand with 3 grasping finger cylinders
          for (let fn = 0; fn < 3; fn++) {
            const rFingerGeo = new THREE.CylinderGeometry(0.012, 0.009, 0.07, 12);
            const rFinger = new THREE.Mesh(rFingerGeo, zombieSkin);
            rFinger.position.set(-0.025 + fn * 0.025, -0.62, 0.04);
            rFinger.rotation.x = 0.6;
            rightArmGroup.add(rFinger);
          }
          group.add(rightArmGroup);
        }

        // Legs
        {
          // Left leg (normal stance)
          const leftLegGroup = new THREE.Group();
          leftLegGroup.name = 'anim_ll';
          leftLegGroup.position.set(-0.1, 0.73, 0);
          const lThighGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.34, 16);
          const lThigh = new THREE.Mesh(lThighGeo, clothMat);
          lThigh.position.y = -0.17;
          leftLegGroup.add(lThigh);
          // Torn pants detail on left thigh
          const lPantsTornGeo = new THREE.BoxGeometry(0.1, 0.08, 0.005);
          const lPantsTorn = new THREE.Mesh(lPantsTornGeo, tornMat);
          lPantsTorn.position.set(0, -0.12, 0.068);
          leftLegGroup.add(lPantsTorn);
          // Left knee (normal)
          const lKneeGeo = new THREE.SphereGeometry(0.05, 14, 10);
          const lKnee = new THREE.Mesh(lKneeGeo, zombieSkin);
          lKnee.position.y = -0.36;
          leftLegGroup.add(lKnee);
          const lShinGeo = new THREE.CylinderGeometry(0.052, 0.06, 0.3, 16);
          const lShin = new THREE.Mesh(lShinGeo, clothMat);
          lShin.position.y = -0.53;
          leftLegGroup.add(lShin);
          group.add(leftLegGroup);

          // Right leg (dragging foot, angled)
          const rightLegGroup = new THREE.Group();
          rightLegGroup.name = 'anim_rl';
          rightLegGroup.position.set(0.1, 0.63, 0);
          const rThighGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.3, 16);
          const rThigh = new THREE.Mesh(rThighGeo, clothMat);
          rThigh.position.y = -0.15;
          rightLegGroup.add(rThigh);
          // Right knee with exposed bone
          const rKneeGeo = new THREE.SphereGeometry(0.048, 12, 8);
          const rKnee = new THREE.Mesh(rKneeGeo, boneMat2);
          rKnee.position.set(0, -0.32, 0.04);
          rightLegGroup.add(rKnee);
          const rShinGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.28, 16);
          const rShin = new THREE.Mesh(rShinGeo, clothMat);
          rShin.position.y = -0.48;
          rShin.rotation.x = 0.18;
          rightLegGroup.add(rShin);
          // Foot drag mark (flat box trailing behind)
          const dragGeo = new THREE.BoxGeometry(0.08, 0.01, 0.22);
          const dragMat2 = new THREE.MeshStandardMaterial({ color: 0x333322, transparent: true, opacity: 0.4 });
          const drag = new THREE.Mesh(dragGeo, dragMat2);
          drag.position.set(0, -0.65, -0.1);
          rightLegGroup.add(drag);
          group.add(rightLegGroup);
        }

        // Green toxic aura (large semi-transparent sphere around body)
        const aura = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), greenAuraMat);
        aura.position.set(0, 1.0, 0);
        aura.scale.set(1, 0.85, 0.9);
        group.add(aura);
        break;
      }

      case EnemyType.NECROMANCER: {
        // --- NECROMANCER | Estimated polygons: ~65,000 triangles ---
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.8 });
        const robeOuterMat = new THREE.MeshStandardMaterial({ color: 0x120718, roughness: 0.85 });
        const robeTrimMat = new THREE.MeshStandardMaterial({ color: 0x2a0a3a, roughness: 0.75 });
        const skinGauntMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.65 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 });
        const staffWoodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 2.0 });
        const eyeGlowMat = new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ee, emissiveIntensity: 1.2, transparent: true, opacity: 0.35 });
        const greenSoulMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22cc55, emissiveIntensity: 2.5 });
        const greenSoulAuraMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22cc55, emissiveIntensity: 1.0, transparent: true, opacity: 0.25 });
        const runicMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.5 });
        const runicInnerMat = new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x44cc44, emissiveIntensity: 2.0 });
        const orbMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 });
        const orbAuraMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844dd, emissiveIntensity: 0.6, transparent: true, opacity: 0.2 });
        const ghostMat = new THREE.MeshStandardMaterial({ color: 0x88ffcc, emissive: 0x44cc88, emissiveIntensity: 1.2, transparent: true, opacity: 0.4 });
        const fogMat = new THREE.MeshStandardMaterial({ color: 0x334433, emissive: 0x112211, emissiveIntensity: 0.3, transparent: true, opacity: 0.18 });
        const skullEyeMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22cc22, emissiveIntensity: 2.0 });
        const buckleSkullMat = new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.6 });
        const grimPageMat = new THREE.MeshStandardMaterial({ color: 0xd4c89a, roughness: 0.8 });
        const grimRuneMat = new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x44cc44, emissiveIntensity: 1.8 });
        const necklaceMat = new THREE.MeshStandardMaterial({ color: 0xb8a080, roughness: 0.5 });

        // === INNER ROBE (tall cone, base layer) ===
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 24), robeMat);
        robe.position.y = 0.75;
        robe.castShadow = true;
        group.add(robe);

        // === OUTER ROBE (wider cone over inner, darker) ===
        const outerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.45, 24), robeOuterMat);
        outerRobe.position.y = 0.72;
        group.add(outerRobe);

        // === TATTERED BOTTOM EDGES (thin boxes fanning outward at robe hem) ===
        for (let t = 0; t < 10; t++) {
          const angle = (t / 10) * Math.PI * 2;
          const tatGeo = new THREE.BoxGeometry(0.06, 0.14, 0.018);
          const tat = new THREE.Mesh(tatGeo, robeOuterMat);
          tat.position.set(Math.cos(angle) * 0.48, 0.07, Math.sin(angle) * 0.48);
          tat.rotation.y = angle;
          tat.rotation.z = Math.sin(angle * 2.1) * 0.18;
          group.add(tat);
        }

        // === ROBE TRIM STRIPS (dark vertical strips on front robe) ===
        for (let tr = -1; tr <= 1; tr++) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.1, 0.015), robeTrimMat);
          trim.position.set(tr * 0.12, 0.75, 0.5);
          group.add(trim);
        }

        // === BELT / SASH ===
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.07, 24), robeTrimMat);
        belt.position.y = 1.1;
        group.add(belt);
        // Belt skull buckle
        const beltSkull = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), buckleSkullMat);
        beltSkull.scale.set(1, 0.8, 0.7);
        beltSkull.position.set(0, 1.1, 0.38);
        group.add(beltSkull);

        // === UPPER TORSO ===
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.2), robeMat);
        torso.position.y = 1.3;
        group.add(torso);

        // === SHOULDER BONE BUMPS (slight spheres through robe) ===
        for (const sx of [-0.22, 0.22]) {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), robeMat);
          shoulder.scale.set(1.1, 0.75, 0.9);
          shoulder.position.set(sx, 1.44, 0);
          group.add(shoulder);
        }

        // === INNER HOOD ===
        const innerHood = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.22, 24), robeMat);
        innerHood.position.y = 1.79;
        group.add(innerHood);

        // === OUTER HOOD (wider, layered over inner) ===
        const outerHood = new THREE.Mesh(new THREE.ConeGeometry(0.235, 0.28, 24), robeOuterMat);
        outerHood.position.y = 1.78;
        group.add(outerHood);

        // === HOOD PEAK / POINT (thin tip) ===
        const hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 12), robeOuterMat);
        hoodPeak.position.y = 1.955;
        group.add(hoodPeak);

        // === DEEP HOOD SHADOW (dark sphere inside hood cavity) ===
        const hoodShadow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0x020104, roughness: 1.0 }));
        hoodShadow.position.set(0, 1.65, 0.04);
        group.add(hoodShadow);

        // === FACE / HEAD (gaunt skin beneath hood) ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), skinGauntMat);
        head.scale.set(0.9, 1.05, 0.88);
        head.position.y = 1.65;
        group.add(head);

        // Sunken cheek shadows
        for (const cx of [-0.055, 0.055]) {
          const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 }));
          cheek.position.set(cx, 1.635, 0.09);
          group.add(cheek);
        }

        // Nose hint
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.025, 8), skinGauntMat);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 1.648, 0.135);
        group.add(nose);

        // === GLOWING PURPLE EYES ===
        for (const ex of [-0.048, 0.048]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 32, 24), eyeMat);
          eye.position.set(ex, 1.665, 0.115);
          group.add(eye);
          // Larger glow halo around each eye
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), eyeGlowMat);
          eyeGlow.position.set(ex, 1.665, 0.112);
          group.add(eyeGlow);
        }

        // === NECKLACE (torus ring + tiny skull pendant) ===
        const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 24), necklaceMat);
        necklace.rotation.x = Math.PI / 2 - 0.3;
        necklace.position.set(0, 1.52, 0.06);
        group.add(necklace);
        const pendantSkull = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), buckleSkullMat);
        pendantSkull.position.set(0, 1.42, 0.12);
        group.add(pendantSkull);

        // === LEFT ARM GROUP (grimoire hand) ===
        {
          const leftArmGroup = new THREE.Group();
          leftArmGroup.name = 'anim_la';
          leftArmGroup.position.set(-0.28, 1.42, 0);

          // Sleeve (robe material)
          const laSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.28, 16), robeMat);
          laSleeve.position.y = -0.14;
          leftArmGroup.add(laSleeve);

          // Forearm (skin material)
          const laForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.22, 16), skinGauntMat);
          laForearm.position.y = -0.39;
          leftArmGroup.add(laForearm);

          // Skeletal hand fingers (4 bones)
          for (let fi = 0; fi < 4; fi++) {
            const fx = (fi - 1.5) * 0.018;
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.07, 8), boneMat);
            finger.position.set(fx, -0.55, 0.01);
            leftArmGroup.add(finger);
          }

          // === GRIMOIRE / ENHANCED BOOK ===
          const grimCover = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.045), new THREE.MeshStandardMaterial({ color: 0x1a0d05, roughness: 0.92 }));
          grimCover.position.set(-0.06, -0.52, 0.09);
          grimCover.rotation.z = 0.2;
          leftArmGroup.add(grimCover);
          // Book spine
          const grimSpine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.045), new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.88 }));
          grimSpine.position.set(-0.117, -0.52, 0.09);
          grimSpine.rotation.z = 0.2;
          leftArmGroup.add(grimSpine);
          // Page edges
          const grimPages = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.13, 0.04), grimPageMat);
          grimPages.position.set(-0.055, -0.52, 0.092);
          grimPages.rotation.z = 0.2;
          leftArmGroup.add(grimPages);
          // Glowing runes on cover (small emissive squares)
          for (let r = 0; r < 4; r++) {
            const rune = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.005), grimRuneMat);
            rune.position.set(-0.06 + (r % 2 - 0.5) * 0.03, -0.515 + (Math.floor(r / 2) - 0.5) * 0.04, 0.115);
            rune.rotation.z = 0.2;
            leftArmGroup.add(rune);
          }
          // Book clasp
          const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.01), necklaceMat);
          clasp.position.set(-0.002, -0.52, 0.116);
          clasp.rotation.z = 0.2;
          leftArmGroup.add(clasp);

          group.add(leftArmGroup);
        }

        // === RIGHT ARM GROUP (skull staff hand) ===
        {
          const rightArmGroup = new THREE.Group();
          rightArmGroup.name = 'anim_ra';
          rightArmGroup.position.set(0.28, 1.42, 0);

          // Sleeve
          const raSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.28, 16), robeMat);
          raSleeve.position.y = -0.14;
          rightArmGroup.add(raSleeve);

          // Forearm
          const raForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.22, 16), skinGauntMat);
          raForearm.position.y = -0.39;
          rightArmGroup.add(raForearm);

          // Skeletal hand fingers (5 bones)
          for (let fi = 0; fi < 5; fi++) {
            const fx = (fi - 2) * 0.016;
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.07, 8), boneMat);
            finger.position.set(fx, -0.55, 0.01);
            rightArmGroup.add(finger);
          }

          // === GNARLED STAFF SHAFT ===
          const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 1.9, 16), staffWoodMat);
          staff.position.set(0.06, -0.35, 0);
          rightArmGroup.add(staff);
          // Knobs / bumps along shaft
          for (let k = 0; k < 5; k++) {
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), staffWoodMat);
            knob.position.set(0.06, -0.35 + k * 0.28 - 0.56, 0);
            rightArmGroup.add(knob);
          }

          // Staff skull (top)
          const staffSkull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), boneMat);
          staffSkull.scale.set(1, 0.95, 0.88);
          staffSkull.position.set(0.06, 0.62, 0);
          rightArmGroup.add(staffSkull);
          // Skull jaw
          const staffJaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.07), boneMat);
          staffJaw.position.set(0.06, 0.535, 0.03);
          rightArmGroup.add(staffJaw);
          // Skull eye sockets
          for (const se of [-0.038, 0.038]) {
            const skullEye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), skullEyeMat);
            skullEye.position.set(0.06 + se, 0.638, 0.085);
            rightArmGroup.add(skullEye);
          }

          // === GREEN SOUL FLAME (emissive sphere above skull) ===
          const soulFlame = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), greenSoulMat);
          soulFlame.position.set(0.06, 0.77, 0);
          rightArmGroup.add(soulFlame);
          // Soul flame aura
          const soulAura = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), greenSoulAuraMat);
          soulAura.position.set(0.06, 0.77, 0);
          rightArmGroup.add(soulAura);
          // Soul wisps (thin translucent rising cones)
          for (let w = 0; w < 3; w++) {
            const wispAngle = (w / 3) * Math.PI * 2;
            const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.09, 8), greenSoulAuraMat);
            wisp.position.set(0.06 + Math.cos(wispAngle) * 0.035, 0.86 + w * 0.04, Math.sin(wispAngle) * 0.035);
            rightArmGroup.add(wisp);
          }

          group.add(rightArmGroup);
        }

        // === HIDDEN LEG GROUPS (beneath robe) ===
        {
          const llGroup = new THREE.Group();
          llGroup.name = 'anim_ll';
          llGroup.position.set(-0.1, 0.9, 0);
          const llLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.6, 12), robeMat);
          llLeg.position.y = -0.3;
          llGroup.add(llLeg);
          group.add(llGroup);

          const rlGroup = new THREE.Group();
          rlGroup.name = 'anim_rl';
          rlGroup.position.set(0.1, 0.9, 0);
          const rlLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.6, 12), robeMat);
          rlLeg.position.y = -0.3;
          rlGroup.add(rlLeg);
          group.add(rlGroup);
        }

        // === 4 FLOATING ORBS (with aura spheres + trail cylinders) ===
        for (let fo = 0; fo < 4; fo++) {
          const foAngle = (fo / 4) * Math.PI * 2;
          const foR = 0.52;
          const foY = 1.45 + Math.sin(fo * 1.1) * 0.12;
          // Core orb
          const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.055, 32, 24), orbMat);
          orbCore.position.set(Math.cos(foAngle) * foR, foY, Math.sin(foAngle) * foR);
          group.add(orbCore);
          // Aura sphere around orb
          const orbAura = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), orbAuraMat);
          orbAura.position.copy(orbCore.position);
          group.add(orbAura);
          // Trail cylinder behind each orb
          const trailAngle = foAngle + Math.PI * 0.9;
          const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.14, 8), orbAuraMat);
          trail.position.set(
            Math.cos(trailAngle) * (foR + 0.07),
            foY,
            Math.sin(trailAngle) * (foR + 0.07)
          );
          trail.rotation.z = Math.PI / 2;
          trail.rotation.y = trailAngle;
          group.add(trail);
        }

        // === RUNIC CIRCLE AT FEET (main torus + inner smaller torus + 4 rune octahedrons) ===
        const runicCircle = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 16, 64), runicMat);
        runicCircle.rotation.x = -Math.PI / 2;
        runicCircle.position.y = 0.03;
        group.add(runicCircle);
        // Inner smaller torus
        const runicInner = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.016, 12, 48), runicInnerMat);
        runicInner.rotation.x = -Math.PI / 2;
        runicInner.position.y = 0.03;
        group.add(runicInner);
        // 4 rune symbols at cardinal points
        for (let r = 0; r < 4; r++) {
          const ra = (r / 4) * Math.PI * 2;
          const runeSymbol = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), runicInnerMat);
          runeSymbol.rotation.x = Math.PI / 2;
          runeSymbol.position.set(Math.cos(ra) * 0.62, 0.05, Math.sin(ra) * 0.62);
          group.add(runeSymbol);
        }

        // === SUMMONED SPIRITS (2-3 small ghostly figures near necromancer) ===
        const spiritPositions = [[-0.9, 0, 0.3], [0.85, 0, -0.2], [-0.1, 0, -0.95]];
        for (const sp of spiritPositions) {
          const spiritHead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), ghostMat);
          spiritHead.position.set(sp[0], 0.72, sp[2]);
          group.add(spiritHead);
          const spiritBody = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 12), ghostMat);
          spiritBody.position.set(sp[0], 0.5, sp[2]);
          group.add(spiritBody);
        }

        // === GROUND FOG (flat transparent spheres at ground level) ===
        for (let fg = 0; fg < 4; fg++) {
          const fgAngle = (fg / 4) * Math.PI * 2 + 0.4;
          const fogSphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 6), fogMat);
          fogSphere.scale.set(1, 0.2, 1);
          fogSphere.position.set(Math.cos(fgAngle) * 0.42, 0.04, Math.sin(fgAngle) * 0.42);
          group.add(fogSphere);
        }
        break;
      }

      case EnemyType.BONE_GOLEM: {
        // --- BONE_GOLEM | Estimated polygons: ~150000 triangles ---

        // --- Materials ---
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 });
        const boneOldMat = new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.8 });
        const boneDarkMat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.85 });
        const boneGlowMat = new THREE.MeshStandardMaterial({
          color: 0x44ff44, emissive: 0x44ff44, emissiveIntensity: 1.0,
          transparent: true, opacity: 0.6,
        });
        const boneCrackMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 1.0 });

        // --- Body cluster with mixed materials, spikes, and crack details ---
        const bodyParts = [
          { r: 0.8, y: 1.2, x: 0, z: 0, mat: boneMat },
          { r: 0.6, y: 2.0, x: 0.1, z: 0, mat: boneOldMat },
          { r: 0.5, y: 0.6, x: -0.1, z: 0.1, mat: boneOldMat },
          { r: 0.4, y: 2.5, x: 0, z: 0, mat: boneMat },
        ];
        for (const part of bodyParts) {
          const geo = new THREE.SphereGeometry(part.r, 16, 12);
          const mesh = new THREE.Mesh(geo, part.mat);
          mesh.position.set(part.x, part.y, part.z);
          mesh.castShadow = true;
          group.add(mesh);
        }

        // Bone shard spikes protruding from body
        const spikeAngles = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6];
        for (let si = 0; si < spikeAngles.length; si++) {
          const ang = spikeAngles[si];
          const spikeGeo = new THREE.ConeGeometry(0.06, 0.38, 8);
          const spike = new THREE.Mesh(spikeGeo, si % 2 === 0 ? boneMat : boneOldMat);
          const radius = 0.72 + (si % 3) * 0.06;
          const yOff = 0.9 + (si % 4) * 0.35;
          spike.position.set(Math.cos(ang) * radius, yOff, Math.sin(ang) * radius);
          spike.rotation.z = Math.cos(ang) * 1.1;
          spike.rotation.x = Math.sin(ang) * 1.1;
          group.add(spike);
        }

        // Crack detail lines across the largest body sphere
        for (let cr = 0; cr < 4; cr++) {
          const crLineGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45 + cr * 0.08, 12);
          const crLine = new THREE.Mesh(crLineGeo, boneCrackMat);
          crLine.position.set(
            (cr % 2 === 0 ? 0.2 : -0.25) + cr * 0.07,
            1.15 + cr * 0.1,
            0.6
          );
          crLine.rotation.set(cr * 0.4, cr * 0.5, cr * 0.3);
          group.add(crLine);
        }

        // --- Enhanced skull ---
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), boneMat);
        skull.position.y = 3.0;
        skull.scale.z = 0.85;
        group.add(skull);

        // Brow ridge
        const browGeo = new THREE.BoxGeometry(0.34, 0.07, 0.1);
        const brow = new THREE.Mesh(browGeo, boneOldMat);
        brow.position.set(0, 3.1, 0.24);
        group.add(brow);

        // Nasal cavity
        const nasalGeo = new THREE.ConeGeometry(0.055, 0.1, 8);
        const nasal = new THREE.Mesh(nasalGeo, boneDarkMat);
        nasal.position.set(0, 2.97, 0.27);
        nasal.rotation.x = Math.PI; // inverted cone pointing inward
        group.add(nasal);

        // Jaw (lower sphere flattened)
        const jawGeo = new THREE.SphereGeometry(0.22, 44, 32);
        const jaw = new THREE.Mesh(jawGeo, boneOldMat);
        jaw.position.set(0, 2.75, 0.06);
        jaw.scale.set(1.0, 0.45, 0.85);
        group.add(jaw);

        // Teeth on jaw (small cones)
        for (let t = 0; t < 5; t++) {
          const toothGeo = new THREE.ConeGeometry(0.028, 0.09, 12);
          const tooth = new THREE.Mesh(toothGeo, boneMat);
          tooth.position.set(-0.12 + t * 0.06, 2.67, 0.22);
          tooth.rotation.x = Math.PI * 0.1; // slight forward lean
          group.add(tooth);
        }

        // Cranial suture lines across top of skull
        for (let sl = 0; sl < 3; sl++) {
          const sutureGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28 - sl * 0.04, 12);
          const suture = new THREE.Mesh(sutureGeo, boneCrackMat);
          suture.position.set(-0.06 + sl * 0.06, 3.22 - sl * 0.06, sl * 0.05);
          suture.rotation.z = Math.PI * 0.5 + sl * 0.3;
          group.add(suture);
        }

        // Eye sockets
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0x330000, emissiveIntensity: 1.0 });
        for (let side = -1; side <= 1; side += 2) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), socketMat);
          socket.position.set(side * 0.12, 3.05, 0.25);
          group.add(socket);
        }

        // --- Arms ---
        for (let side = -1; side <= 1; side += 2) {
          const bgArmGroup = new THREE.Group();
          bgArmGroup.name = side === -1 ? 'anim_la' : 'anim_ra';
          bgArmGroup.position.set(side * 0.6, 2.4, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.8, 44), boneMat);
          upperArm.position.set(side * 0.4, -0.4, 0);
          upperArm.rotation.z = side * 0.5;
          bgArmGroup.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 44), boneMat);
          forearm.position.set(side * 0.8, -1.0, 0);
          bgArmGroup.add(forearm);
          // Fist
          const fist = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), boneMat);
          fist.position.set(side * 0.9, -1.5, 0);
          bgArmGroup.add(fist);
          group.add(bgArmGroup);
        }

        // --- Enhanced ribcage with sternum and floating bone fragments ---
        for (let rb = 0; rb < 4; rb++) {
          const ribGeo2 = new THREE.TorusGeometry(0.4 - rb * 0.03, 0.03, 44, 62, Math.PI);
          const rib2 = new THREE.Mesh(ribGeo2, rb % 2 === 0 ? boneMat : boneOldMat);
          rib2.position.set(0, 1.8 - rb * 0.15, 0);
          rib2.rotation.y = Math.PI;
          group.add(rib2);
        }

        // Sternum connecting ribs down the center front
        const sternumGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 10);
        const sternum = new THREE.Mesh(sternumGeo, boneOldMat);
        sternum.position.set(0, 1.62, 0.38);
        group.add(sternum);

        // Small floating bone fragments near ribcage
        const ribFragOffsets = [
          [0.52, 2.0, 0.1], [-0.55, 1.85, 0.05], [0.46, 1.55, -0.12],
          [-0.42, 1.65, 0.15], [0.38, 2.1, -0.08],
        ];
        for (const rfo of ribFragOffsets) {
          const fragGeo = new THREE.SphereGeometry(0.055 + (rfo[0] % 0.03), 16, 12);
          const frag = new THREE.Mesh(fragGeo, boneOldMat);
          frag.position.set(rfo[0], rfo[1], rfo[2]);
          group.add(frag);
        }

        // --- Massive bone club arm (one arm much larger - part of right arm) ---
        const bgRaGroup = group.getObjectByName('anim_ra') as THREE.Group;
        const clubGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.0, 44);
        const club = new THREE.Mesh(clubGeo, boneMat);
        club.position.set(0.9, -1.5, 0);
        bgRaGroup.add(club);
        const clubEndGeo = new THREE.SphereGeometry(0.35, 16, 12);
        const clubEnd = new THREE.Mesh(clubEndGeo, boneMat);
        clubEnd.position.set(0.9, -2.05, 0);
        bgRaGroup.add(clubEnd);

        // --- Visible joints (green/purple glowing spheres at connections) ---
        const jointGlowMat = new THREE.MeshStandardMaterial({
          color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.7,
        });
        const jointPositions = [
          [0, 2.6, 0], [1.0, 2.0, 0], [-1.0, 2.0, 0],
          [0.4, 0.7, 0], [-0.4, 0.7, 0],
        ];
        for (const jp of jointPositions) {
          const jGeo = new THREE.SphereGeometry(0.08, 16, 12);
          const jMesh = new THREE.Mesh(jGeo, jointGlowMat);
          jMesh.position.set(jp[0], jp[1], jp[2]);
          group.add(jMesh);
        }

        // --- Ground cracks (small dark planes around feet) ---
        const crackMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.4, roughness: 1.0 });
        for (let ci = 0; ci < 4; ci++) {
          const crackGeo = new THREE.BoxGeometry(0.3 + (ci * 0.05), 0.01, 0.05);
          const crack = new THREE.Mesh(crackGeo, crackMat);
          crack.position.set((ci % 2 === 0 ? 0.3 : -0.25) * (1 + ci * 0.1), 0.01, (ci % 2 === 0 ? 0.2 : -0.3) * (1 + ci * 0.05));
          crack.rotation.y = ci * 0.8;
          group.add(crack);
        }

        // --- More varied bone pieces (mix of shapes) ---
        for (let bv = 0; bv < 5; bv++) {
          const bvType = bv % 3;
          let bvMesh: THREE.Mesh;
          if (bvType === 0) {
            bvMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.1), boneOldMat);
          } else if (bvType === 1) {
            bvMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 44), boneMat);
          } else {
            bvMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 80, 44), boneOldMat);
          }
          bvMesh.position.set(
            (bv % 2 === 0 ? 0.3 : -0.2) * (1 + bv * 0.1),
            0.5 + bv * 0.3,
            (bv % 3 === 0 ? 0.25 : -0.15) * (1 + bv * 0.05)
          );
          bvMesh.rotation.set(bv * 0.6, bv * 0.4, bv * 0.5);
          group.add(bvMesh);
        }

        // --- Soul wisps: small emissive green cones floating near body ---
        const wispOffsets = [
          [0.65, 2.3, 0.3], [-0.6, 1.9, 0.25], [0.2, 2.8, 0.35], [-0.3, 1.5, -0.3],
        ];
        for (const wo of wispOffsets) {
          const wispGeo = new THREE.ConeGeometry(0.05, 0.18, 8);
          const wisp = new THREE.Mesh(wispGeo, boneGlowMat);
          wisp.position.set(wo[0], wo[1], wo[2]);
          wisp.rotation.set(wo[2] * 1.5, wo[0], wo[1] * 0.4);
          group.add(wisp);
        }

        // --- Bone dust: tiny semi-transparent spheres scattered around feet ---
        const boneDustMat = new THREE.MeshStandardMaterial({ color: 0xd0c8b0, transparent: true, opacity: 0.45 });
        const dustPositions = [
          [0.5, 0.06, 0.3], [-0.4, 0.06, 0.4], [0.2, 0.06, -0.4], [-0.6, 0.06, -0.25],
          [0.7, 0.06, -0.1], [-0.2, 0.06, 0.55], [0.35, 0.06, 0.6], [-0.55, 0.06, 0.1],
        ];
        for (const dp of dustPositions) {
          const dustGeo = new THREE.SphereGeometry(0.03 + (Math.abs(dp[0]) % 0.02), 8, 6);
          const dust = new THREE.Mesh(dustGeo, boneDustMat);
          dust.position.set(dp[0], dp[1], dp[2]);
          group.add(dust);
        }

        // --- Enhanced legs with knee joints and foot structures ---
        for (let side = -1; side <= 1; side += 2) {
          const bgLegGroup = new THREE.Group();
          bgLegGroup.name = side === -1 ? 'anim_ll' : 'anim_rl';
          bgLegGroup.position.set(side * 0.4, 0.7, 0);

          // Thigh cylinder
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.45, 44), boneMat);
          thigh.position.y = -0.22;
          bgLegGroup.add(thigh);

          // Knee joint sphere
          const kneeGeo = new THREE.SphereGeometry(0.13, 32, 24);
          const knee = new THREE.Mesh(kneeGeo, boneDarkMat);
          knee.position.y = -0.5;
          bgLegGroup.add(knee);

          // Lower leg cylinder
          const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.42, 44), boneOldMat);
          lowerLeg.position.y = -0.75;
          bgLegGroup.add(lowerLeg);

          // Foot (flattened box)
          const footGeo = new THREE.BoxGeometry(0.22, 0.1, 0.38);
          const foot = new THREE.Mesh(footGeo, boneMat);
          foot.position.set(0, -1.02, 0.1);
          bgLegGroup.add(foot);

          group.add(bgLegGroup);
        }
        break;
      }

      case EnemyType.WRAITH: {
        // --- WRAITH | Estimated polygons: ~60000 triangles ---
        const wraithMat = new THREE.MeshStandardMaterial({
          color: 0x2244aa,
          transparent: true,
          opacity: 0.52,
          emissive: 0x1122aa,
          emissiveIntensity: 0.8,
          roughness: 0.3,
        });
        const wraithFadeMat = new THREE.MeshStandardMaterial({
          color: 0x2244aa, transparent: true, opacity: 0.28,
          emissive: 0x1122aa, emissiveIntensity: 0.5, roughness: 0.4,
        });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 3.0 });
        const eyeHaloMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, transparent: true, opacity: 0.22, emissive: 0x22aacc, emissiveIntensity: 1.2 });
        const crownMat2 = new THREE.MeshStandardMaterial({ color: 0x4466aa, emissive: 0x2244aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
        const crownGemMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x44aaff, emissiveIntensity: 2.5 });
        const soulMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 2.0 });
        const chainMat2 = new THREE.MeshStandardMaterial({ color: 0x8899bb, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.7 });
        const faceMat = new THREE.MeshStandardMaterial({ color: 0x6688cc, emissive: 0x4466aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.35 });
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x050a15, roughness: 1.0 });
        const ribTransMat = new THREE.MeshStandardMaterial({ color: 0x4466aa, transparent: true, opacity: 0.32, emissive: 0x2244aa, emissiveIntensity: 0.4 });
        const energyMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 1.8, transparent: true, opacity: 0.6 });
        const shadowDiscMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1a, transparent: true, opacity: 0.45, roughness: 1.0 });

        const wraithHover = new THREE.Group();
        wraithHover.name = 'anim_hover';

        // Ground shadow disc
        const shadowDiscGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.012, 24);
        const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
        shadowDisc.position.y = 0.02;
        wraithHover.add(shadowDisc);

        // Inner spectral robe
        const innerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.7, 24), wraithMat);
        innerRobe.position.y = 1.15;
        innerRobe.castShadow = true;
        wraithHover.add(innerRobe);

        // Outer wider robe cone
        const outerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.66, 1.6, 24), wraithFadeMat);
        outerRobe.position.y = 1.0;
        wraithHover.add(outerRobe);

        // 12 tattered strips at the bottom of robe
        for (let te = 0; te < 12; te++) {
          const teAngle = (te / 12) * Math.PI * 2;
          const teLen = 0.26 + (te % 3) * 0.07;
          const tatEdgeGeo = new THREE.BoxGeometry(0.1, teLen, 0.008);
          const tatEdge = new THREE.Mesh(tatEdgeGeo, wraithFadeMat);
          tatEdge.position.set(
            Math.cos(teAngle) * 0.52,
            0.28 - teLen * 0.5,
            Math.sin(teAngle) * 0.52
          );
          tatEdge.rotation.y = teAngle + 0.2;
          tatEdge.rotation.z = (te % 2 === 0 ? 0.12 : -0.12);
          wraithHover.add(tatEdge);
        }

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), wraithMat);
        head.position.y = 2.2;
        wraithHover.add(head);

        // Ghostly face features
        // Nose
        const noseGhostGeo = new THREE.ConeGeometry(0.022, 0.055, 8);
        const noseGhost = new THREE.Mesh(noseGhostGeo, faceMat);
        noseGhost.position.set(0, 2.18, 0.17);
        noseGhost.rotation.x = -Math.PI / 2;
        wraithHover.add(noseGhost);

        // Cheekbone bumps
        for (let side = -1; side <= 1; side += 2) {
          const cheekGeo = new THREE.SphereGeometry(0.045, 12, 8);
          const cheek = new THREE.Mesh(cheekGeo, faceMat);
          cheek.position.set(side * 0.1, 2.2, 0.12);
          cheek.scale.set(1.2, 0.7, 0.6);
          wraithHover.add(cheek);
        }

        // Gaping mouth (dark recessed sphere)
        const mouthGapGeo = new THREE.SphereGeometry(0.055, 12, 8);
        const mouthGap = new THREE.Mesh(mouthGapGeo, voidMat);
        mouthGap.position.set(0, 2.13, 0.15);
        mouthGap.scale.set(1.2, 0.6, 0.55);
        wraithHover.add(mouthGap);

        // Eyes: emissive core + transparent halo sphere
        for (let side = -1; side <= 1; side += 2) {
          const eyeCore = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeMat);
          eyeCore.position.set(side * 0.075, 2.24, 0.155);
          wraithHover.add(eyeCore);
          const eyeHalo = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), eyeHaloMat);
          eyeHalo.position.set(side * 0.075, 2.24, 0.14);
          wraithHover.add(eyeHalo);
        }

        // Spectral crown (wider torus + 5 ornate spikes + gem settings)
        const crownGeo = new THREE.TorusGeometry(0.22, 0.02, 16, 48);
        const crownMesh = new THREE.Mesh(crownGeo, crownMat2);
        crownMesh.position.y = 2.36;
        crownMesh.rotation.x = Math.PI / 2;
        wraithHover.add(crownMesh);

        const crownSpikeHeights = [0.18, 0.12, 0.09, 0.12, 0.18];
        for (let cs = 0; cs < 5; cs++) {
          const csAngle = (cs / 5) * Math.PI * 2;
          const csgGeo = new THREE.ConeGeometry(0.022, crownSpikeHeights[cs], 8);
          const csg = new THREE.Mesh(csgGeo, crownMat2);
          csg.position.set(
            Math.cos(csAngle) * 0.22,
            2.36 + crownSpikeHeights[cs] / 2,
            Math.sin(csAngle) * 0.22
          );
          wraithHover.add(csg);
          // Gem setting between spikes
          const gemAngle = csAngle + Math.PI / 5;
          const gemGeo = new THREE.SphereGeometry(0.016, 10, 8);
          const gem = new THREE.Mesh(gemGeo, crownGemMat);
          gem.position.set(Math.cos(gemAngle) * 0.22, 2.37, Math.sin(gemAngle) * 0.22);
          wraithHover.add(gem);
        }

        // Crown front jewel (octahedron)
        const crownFrontGemGeo = new THREE.OctahedronGeometry(0.035);
        const crownFrontGem = new THREE.Mesh(crownFrontGemGeo, crownGemMat);
        crownFrontGem.position.set(0, 2.46, 0.22);
        wraithHover.add(crownFrontGem);

        // Visible rib cage through robe (translucent curved cylinder ribs, 7 of them)
        for (let rb = 0; rb < 7; rb++) {
          const rbGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.38 - rb * 0.02, 8);
          const rbMesh = new THREE.Mesh(rbGeo, ribTransMat);
          rbMesh.position.set(0, 1.85 - rb * 0.1, 0.05);
          rbMesh.rotation.z = Math.PI / 2;
          rbMesh.rotation.y = rb * 0.04;
          wraithHover.add(rbMesh);
        }

        // Dark hollow in chest (void where heart was)
        const voidHeartGeo = new THREE.SphereGeometry(0.07, 14, 10);
        const voidHeart = new THREE.Mesh(voidHeartGeo, voidMat);
        voidHeart.position.set(0, 1.88, 0.12);
        voidHeart.scale.set(1, 1.1, 0.6);
        wraithHover.add(voidHeart);

        // Ethereal arms
        for (let side = -1; side <= 1; side += 2) {
          const wraithArmGroup = new THREE.Group();
          wraithArmGroup.name = side === -1 ? 'anim_la' : 'anim_ra';
          wraithArmGroup.position.set(side * 0.52, 1.82, 0);

          // Upper arm
          const upperArmGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.38, 16);
          const upperArm = new THREE.Mesh(upperArmGeo, wraithMat);
          upperArm.position.y = -0.19;
          upperArm.rotation.z = side * 0.55;
          wraithArmGroup.add(upperArm);

          // Forearm
          const forearmGeo = new THREE.CylinderGeometry(0.03, 0.038, 0.34, 16);
          const forearm = new THREE.Mesh(forearmGeo, wraithMat);
          forearm.position.y = -0.52;
          forearm.rotation.z = side * 0.2;
          wraithArmGroup.add(forearm);

          // Skeletal hand with 4 thin finger bones
          for (let fn = 0; fn < 4; fn++) {
            const fBoneGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.08, 12);
            const fBone = new THREE.Mesh(fBoneGeo, wraithFadeMat);
            fBone.position.set(-0.03 + fn * 0.02, -0.74, 0.02);
            fBone.rotation.x = 0.5;
            wraithArmGroup.add(fBone);
          }

          // Chains on wrists (3-4 torus ring links + 1 broken half)
          for (let ch = 0; ch < 4; ch++) {
            const chainGeo2 = new THREE.TorusGeometry(0.028 - ch * 0.002, 0.007, 8, 14);
            const chainLink = new THREE.Mesh(chainGeo2, chainMat2);
            chainLink.position.set(side * 0.04, -0.62 - ch * 0.016, 0);
            chainLink.rotation.y = ch * 0.8;
            wraithArmGroup.add(chainLink);
          }

          wraithHover.add(wraithArmGroup);
        }

        // Spectral energy connecting hands (thin emissive cylinder between hand positions)
        const energyBeamGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.04, 8);
        const energyBeam = new THREE.Mesh(energyBeamGeo, energyMat);
        energyBeam.position.set(0, 1.3, 0);
        energyBeam.rotation.z = Math.PI / 2;
        wraithHover.add(energyBeam);

        // Multi-layered spectral trail (5 layers at different lengths/opacities)
        const trailOpacities = [0.22, 0.17, 0.13, 0.09, 0.06];
        const trailLengths = [0.85, 0.7, 0.6, 0.5, 0.4];
        for (let tl = 0; tl < 5; tl++) {
          const trailGeo2 = new THREE.BoxGeometry(0.32 + tl * 0.06, 0.01, trailLengths[tl]);
          const trailMat2 = new THREE.MeshStandardMaterial({
            color: 0x2244aa, emissive: 0x1122aa, emissiveIntensity: 0.5,
            transparent: true, opacity: trailOpacities[tl],
          });
          const trailMesh = new THREE.Mesh(trailGeo2, trailMat2);
          trailMesh.position.set(0, 0.72 - tl * 0.04, -0.45 - tl * 0.08);
          wraithHover.add(trailMesh);
        }

        // Soul orbs (6, varying sizes, with tiny cylinder trails)
        for (let so = 0; so < 6; so++) {
          const soAngle = (so / 6) * Math.PI * 2;
          const soRadius = 0.6 + (so % 2) * 0.12;
          const soSize = 0.028 + (so % 3) * 0.01;
          const soulGeo = new THREE.SphereGeometry(soSize, 14, 10);
          const soul = new THREE.Mesh(soulGeo, soulMat);
          soul.position.set(
            Math.cos(soAngle) * soRadius,
            1.45 + Math.sin(soAngle * 0.7) * 0.35,
            Math.sin(soAngle) * soRadius
          );
          wraithHover.add(soul);
          // Tiny trail behind each soul orb
          const sTrailGeo = new THREE.CylinderGeometry(0.005, 0.002, 0.1, 12);
          const sTrail = new THREE.Mesh(sTrailGeo, eyeHaloMat);
          sTrail.position.set(
            Math.cos(soAngle) * (soRadius + 0.07),
            1.45 + Math.sin(soAngle * 0.7) * 0.35,
            Math.sin(soAngle) * (soRadius + 0.07)
          );
          sTrail.rotation.y = soAngle + Math.PI / 2;
          sTrail.rotation.z = Math.PI / 2;
          wraithHover.add(sTrail);
        }

        // Wisps rising from body (7 thin translucent cones pointing upward)
        const wispRiseMat = new THREE.MeshStandardMaterial({ color: 0x4466cc, transparent: true, opacity: 0.18, emissive: 0x2244aa, emissiveIntensity: 0.6 });
        const wispPositions2 = [
          { x: 0.0, y: 2.3, z: 0.0 }, { x: 0.35, y: 1.8, z: 0.15 },
          { x: -0.3, y: 1.75, z: -0.1 }, { x: 0.15, y: 1.5, z: 0.35 },
          { x: -0.2, y: 1.55, z: -0.3 }, { x: 0.38, y: 1.2, z: -0.15 },
          { x: -0.12, y: 1.3, z: 0.4 },
        ];
        for (let wp2 = 0; wp2 < wispPositions2.length; wp2++) {
          const wpr = wispPositions2[wp2];
          const wispConeGeo = new THREE.ConeGeometry(0.022, 0.14 + wp2 * 0.01, 8);
          const wispCone = new THREE.Mesh(wispConeGeo, wispRiseMat);
          wispCone.position.set(wpr.x, wpr.y, wpr.z);
          wraithHover.add(wispCone);
        }

        // Floating glow underneath
        const glowGeo = new THREE.SphereGeometry(0.32, 24, 16);
        const glowMat = new THREE.MeshStandardMaterial({
          color: 0x2244aa, emissive: 0x1122aa, emissiveIntensity: 1.0,
          transparent: true, opacity: 0.3,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 0.32;
        glow.scale.set(1, 0.28, 1);
        wraithHover.add(glow);

        group.add(wraithHover);
        break;
      }

      case EnemyType.TREASURE_MIMIC: {
        // --- TREASURE_MIMIC | Estimated polygons: ~55000 triangles ---
        const mChestMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6, metalness: 0.3 });
        const mBandMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.2 });
        const mTeethMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.5 });
        const mTongueMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 });
        const mEyeMat = new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xaaaa00, emissiveIntensity: 1.0 });
        const mPupilMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
        const mLiningMat = new THREE.MeshStandardMaterial({ color: 0x9933aa, roughness: 0.7 });
        const mGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
        const mGemMat = new THREE.MeshStandardMaterial({ color: 0x33ccff, metalness: 0.3, roughness: 0.1, emissive: 0x0055aa, emissiveIntensity: 0.3 });
        const mSalivaMat = new THREE.MeshStandardMaterial({ color: 0xaaffaa, roughness: 0.2, transparent: true, opacity: 0.7 });
        const mClawMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.4, roughness: 0.4 });
        const mWartMat = new THREE.MeshStandardMaterial({ color: 0x7a5a10, roughness: 0.9 });
        const mLockMat = new THREE.MeshStandardMaterial({ color: 0x888866, metalness: 0.7, roughness: 0.3 });

        // Base chest body
        const mBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mChestMat);
        mBase.position.y = 0.25;
        mBase.castShadow = true;
        group.add(mBase);

        // Wood plank detail: thin horizontal boxes across the front and sides
        for (let pl = 0; pl < 5; pl++) {
          const mPlankY = 0.04 + pl * 0.085;
          const frontPlank = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.015, 0.01), mWartMat);
          frontPlank.position.set(0, mPlankY, 0.302);
          group.add(frontPlank);
          for (let side = -1; side <= 1; side += 2) {
            const sidePlank = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.58), mWartMat);
            sidePlank.position.set(side * 0.402, mPlankY, 0);
            group.add(sidePlank);
          }
        }

        // Metal corner reinforcements (L-shaped: 2 boxes per corner)
        const mCornerPos: [number, number][] = [[-0.38, -0.28], [-0.38, 0.28], [0.38, -0.28], [0.38, 0.28]];
        for (const [cx, cz] of mCornerPos) {
          const cSgnX = cx < 0 ? -1 : 1;
          const cSgnZ = cz < 0 ? -1 : 1;
          const mCornerA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.015), mBandMat);
          mCornerA.position.set(cx, 0.25, cz + cSgnZ * 0.015);
          group.add(mCornerA);
          const mCornerB = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.52, 0.06), mBandMat);
          mCornerB.position.set(cx + cSgnX * 0.015, 0.25, cz);
          group.add(mCornerB);
        }

        // Enhanced metal bands on base with rivets
        for (let b = 0; b < 3; b++) {
          const mBandY = 0.08 + b * 0.18;
          const mFrontBand = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.01), mBandMat);
          mFrontBand.position.set(0, mBandY, 0.305);
          group.add(mFrontBand);
          const mBackBand = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.01), mBandMat);
          mBackBand.position.set(0, mBandY, -0.305);
          group.add(mBackBand);
          for (let rv = 0; rv < 7; rv++) {
            const mRivetX = -0.33 + rv * 0.11;
            const mRivet = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), mBandMat);
            mRivet.position.set(mRivetX, mBandY, 0.317);
            group.add(mRivet);
            const mRivetBack = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), mBandMat);
            mRivetBack.position.set(mRivetX, mBandY, -0.317);
            group.add(mRivetBack);
          }
        }

        // Padlock on the front
        const mLockBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), mLockMat);
        mLockBox.position.set(0, 0.25, 0.322);
        group.add(mLockBox);
        const mKeyhole = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mWartMat);
        mKeyhole.position.set(0, 0.26, 0.344);
        group.add(mKeyhole);
        const mShackle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 12, Math.PI), mBandMat);
        mShackle.position.set(0, 0.328, 0.322);
        mShackle.rotation.z = Math.PI / 2;
        group.add(mShackle);

        // Lid jaw group (anim_jaw) with inner lining + lid body
        const mimicJaw = new THREE.Group();
        mimicJaw.name = 'anim_jaw';
        mimicJaw.position.set(0, 0.5, -0.31);

        const mLid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.15, 0.62), mChestMat);
        mLid.position.y = 0.05;
        mLid.position.z = 0.31;
        mimicJaw.add(mLid);

        // Inner lining (red/purple, visible when lid is open)
        const mLining = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.04, 0.54), mLiningMat);
        mLining.position.set(0, -0.01, 0.31);
        mimicJaw.add(mLining);

        // Lid wood plank strips
        for (let pl = 0; pl < 3; pl++) {
          const mLidPlank = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.58), mWartMat);
          mLidPlank.position.set(-0.3 + pl * 0.3, 0.05, 0.31);
          mimicJaw.add(mLidPlank);
        }

        // Lid metal bands with rivets
        for (let b = -1; b <= 1; b += 2) {
          const mLidBand = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.01), mBandMat);
          mLidBand.position.set(0, 0.04, b * 0.29 + 0.31);
          mimicJaw.add(mLidBand);
          for (let rv = 0; rv < 6; rv++) {
            const mLidRivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mBandMat);
            mLidRivet.position.set(-0.3 + rv * 0.12, 0.04, b * 0.305 + 0.31);
            mimicJaw.add(mLidRivet);
          }
        }

        // Hinges on back of lid
        for (let side = -1; side <= 1; side += 2) {
          const mHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 10), mBandMat);
          mHinge.position.set(side * 0.28, 0.0, 0.02);
          mHinge.rotation.z = Math.PI / 2;
          mimicJaw.add(mHinge);
        }

        // Varied top teeth (10) — some longer fangs
        const mTopTeeth: [number, number][] = [
          [-0.35, 0.07], [-0.25, 0.10], [-0.15, 0.065], [-0.05, 0.09], [0.05, 0.065],
          [0.15, 0.095], [0.25, 0.065], [0.35, 0.08], [-0.3, 0.05], [0.3, 0.05],
        ];
        for (const [tx, th] of mTopTeeth) {
          const mTopTooth = new THREE.Mesh(new THREE.ConeGeometry(0.018 + th * 0.05, th, 8), mTeethMat);
          mTopTooth.position.set(tx, -0.02, 0.62);
          mTopTooth.rotation.x = Math.PI;
          mimicJaw.add(mTopTooth);
        }

        // Varied bottom teeth (10) — pointing up from jaw line
        const mBotTeeth: [number, number][] = [
          [-0.32, 0.065], [-0.22, 0.08], [-0.12, 0.055], [-0.02, 0.075], [0.08, 0.055],
          [0.18, 0.08], [0.28, 0.06], [0.35, 0.07], [-0.4, 0.045], [0.4, 0.045],
        ];
        for (const [bx, bh] of mBotTeeth) {
          const mBotTooth = new THREE.Mesh(new THREE.ConeGeometry(0.016 + bh * 0.04, bh, 8), mTeethMat);
          mBotTooth.position.set(bx, -0.26, 0.62);
          mimicJaw.add(mBotTooth);
        }

        // Saliva drips from 4 teeth
        for (let sd = 0; sd < 4; sd++) {
          const mSalivaGeo = new THREE.CylinderGeometry(0.007, 0.003, 0.07, 12);
          const mSaliva = new THREE.Mesh(mSalivaGeo, mSalivaMat);
          mSaliva.position.set(-0.25 + sd * 0.17, -0.1, 0.62);
          mimicJaw.add(mSaliva);
        }

        // Segmented tongue with forked tip (4 segments)
        const mTBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 10), mTongueMat);
        mTBase.position.set(0, -0.12, 0.48);
        mTBase.rotation.x = 0.4;
        mimicJaw.add(mTBase);
        const mTMid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 10), mTongueMat);
        mTMid.position.set(0, -0.2, 0.54);
        mTMid.rotation.x = 0.5;
        mimicJaw.add(mTMid);
        const mTTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.09, 10), mTongueMat);
        mTTip.position.set(0, -0.28, 0.59);
        mTTip.rotation.x = 0.6;
        mimicJaw.add(mTTip);
        for (let fk = -1; fk <= 1; fk += 2) {
          const mFork = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.055, 8), mTongueMat);
          mFork.position.set(fk * 0.022, -0.35, 0.63);
          mFork.rotation.x = 0.7;
          mFork.rotation.z = fk * 0.15;
          mimicJaw.add(mFork);
        }

        // Gold coins and gems visible inside when open
        for (let gc = 0; gc < 6; gc++) {
          const mCoin = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mGoldMat);
          mCoin.position.set(-0.22 + gc * 0.09, -0.28, 0.35 + (gc % 2) * 0.06);
          mimicJaw.add(mCoin);
        }
        for (let gm = 0; gm < 3; gm++) {
          const mGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), mGemMat);
          mGem.position.set(-0.12 + gm * 0.13, -0.27, 0.38 + gm * 0.04);
          mimicJaw.add(mGem);
        }

        // Eye stalks: two-part stalks + eyeball + eyelid + pupil
        for (let side = -1; side <= 1; side += 2) {
          const mStalkBot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 12), mChestMat);
          mStalkBot.position.set(side * 0.2, 0.13, 0.46);
          mimicJaw.add(mStalkBot);
          const mStalkTop = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.025, 0.12, 12), mChestMat);
          mStalkTop.position.set(side * 0.2, 0.25, 0.46);
          mimicJaw.add(mStalkTop);
          const mEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), mEyeMat);
          mEyeball.position.set(side * 0.2, 0.37, 0.46);
          mimicJaw.add(mEyeball);
          // Eyelid hint (half sphere)
          const mEyelidGeo = new THREE.SphereGeometry(0.052, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
          const mEyelid = new THREE.Mesh(mEyelidGeo, mChestMat);
          mEyelid.position.set(side * 0.2, 0.37, 0.46);
          mimicJaw.add(mEyelid);
          const mPupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), mPupilMat);
          mPupil.position.set(side * 0.2, 0.37, 0.515);
          mimicJaw.add(mPupil);
        }
        group.add(mimicJaw);

        // Monster feet (4) with toe shapes, claws, and warts
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const mFootCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.14, 12), mChestMat);
            mFootCyl.position.set(lx * 0.27, 0.07, lz * 0.2);
            group.add(mFootCyl);
            const mToePad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.1), mChestMat);
            mToePad.position.set(lx * 0.27, 0.01, lz * 0.2 + lz * 0.025);
            group.add(mToePad);
            // Warts on leg (3)
            for (let wt = 0; wt < 3; wt++) {
              const mWartAngle = (wt / 3) * Math.PI * 2;
              const mWart = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mWartMat);
              mWart.position.set(lx * 0.27 + Math.cos(mWartAngle) * 0.065, 0.06 + wt * 0.03, lz * 0.2 + Math.sin(mWartAngle) * 0.05);
              group.add(mWart);
            }
            // Toes with claws (3 per foot)
            for (let toe = -1; toe <= 1; toe++) {
              const mToeX = lx * 0.27 + toe * 0.035;
              const mToeZ = lz * 0.2 + lz * 0.06;
              const mToeBump = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mChestMat);
              mToeBump.position.set(mToeX, 0.025, mToeZ);
              group.add(mToeBump);
              const mClaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 12), mClawMat);
              mClaw.position.set(mToeX, 0.01, mToeZ + lz * 0.03);
              mClaw.rotation.x = (Math.PI / 2) * lz;
              group.add(mClaw);
            }
          }
        }

        // Multiple chain links (4 interlocking tori)
        const mChainMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });
        for (let cl = 0; cl < 4; cl++) {
          const mLink = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), mChainMat);
          mLink.position.set(0.43, 0.22 + cl * 0.07, 0);
          mLink.rotation.y = (cl % 2 === 0) ? Math.PI / 2 : 0;
          group.add(mLink);
        }

        break;
      }
      default: return false;
    }
    return true;
}
