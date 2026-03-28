import * as THREE from 'three';
import { EnemyType } from './DiabloTypes';

/** Build enemy mesh for volcanic/abyssal enemies. Returns true if type was handled. */
export function createHellEnemyMesh(type: EnemyType, _scale: number, group: THREE.Group): boolean {
    switch (type) {
      // ── Volcanic Wastes enemies ──
      // --- FIRE_IMP | Estimated polygons: ~54000 triangles ---
      case EnemyType.FIRE_IMP: {
        const fiBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, emissive: 0x661100, emissiveIntensity: 0.3, roughness: 0.6 });
        const fiScaleMat = new THREE.MeshStandardMaterial({ color: 0xaa2200, emissive: 0x440800, emissiveIntensity: 0.2, roughness: 0.75 });
        const fiBellyMat = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0x882200, emissiveIntensity: 0.15, roughness: 0.65 });
        const fiHornMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
        const fiEyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 2.0 });
        const fiFlameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5 });
        const fiFlameYellowMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.8 });
        const fiMouthMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 1.0 });
        const fiWingMat = new THREE.MeshStandardMaterial({ color: 0x881100, roughness: 0.7, transparent: true, opacity: 0.85 });

        // Pot-belly body: larger lower sphere, smaller upper chest
        const fiLowerBody = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), fiBodyMat);
        fiLowerBody.scale.set(1.0, 0.85, 1.0);
        fiLowerBody.position.y = 0.45;
        fiLowerBody.castShadow = true;
        group.add(fiLowerBody);
        const fiUpperChest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), fiBodyMat);
        fiUpperChest.position.y = 0.72;
        group.add(fiUpperChest);
        // Belly scales - different colored material patches
        for (let bs = 0; bs < 8; bs++) {
          const bsAngle = (bs / 8) * Math.PI * 1.6 - 0.8;
          const bsScale = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), fiBellyMat);
          bsScale.position.set(Math.sin(bsAngle) * 0.2, 0.38 + Math.cos(bsAngle) * 0.12, 0.28);
          bsScale.rotation.x = -0.2;
          group.add(bsScale);
        }
        // Scale-like plates on torso sides
        for (let sc = 0; sc < 6; sc++) {
          const scAngle = (sc / 6) * Math.PI - 0.3;
          for (const scSide of [-1, 1]) {
            const scPlate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.025), fiScaleMat);
            scPlate.position.set(scSide * (0.22 + Math.sin(scAngle) * 0.06), 0.48 + sc * 0.06, Math.cos(scAngle) * 0.08);
            scPlate.rotation.z = scSide * 0.3;
            group.add(scPlate);
          }
        }

        // Head
        const fiHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), fiBodyMat);
        fiHead.position.y = 0.98;
        group.add(fiHead);
        // Pointy ears
        for (const ex of [-1, 1]) {
          const fiEar = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), fiBodyMat);
          fiEar.position.set(ex * 0.19, 1.04, 0);
          fiEar.rotation.z = ex * 0.6;
          group.add(fiEar);
        }
        // Curved horns - two segments each
        for (const hx of [-1, 1]) {
          const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 12), fiHornMat);
          hornBase.position.set(hx * 0.1, 1.16, 0.02);
          hornBase.rotation.z = hx * 0.4;
          group.add(hornBase);
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 10), fiHornMat);
          hornTip.position.set(hx * 0.155, 1.235, -0.04);
          hornTip.rotation.z = hx * 0.9;
          hornTip.rotation.x = -0.4;
          group.add(hornTip);
        }
        // Glowing eyes
        for (const ex of [-0.065, 0.065]) {
          const fiEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), fiEyeMat);
          fiEye.position.set(ex, 1.02, 0.18);
          group.add(fiEye);
        }
        // Wicked grinning mouth
        const fiMouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.02), fiMouthMat);
        fiMouth.position.set(0, 0.93, 0.18);
        fiMouth.rotation.x = 0.1;
        group.add(fiMouth);
        // Teeth (small white boxes)
        for (let t = 0; t < 5; t++) {
          const fiTooth = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.015), new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.4 }));
          fiTooth.position.set(-0.048 + t * 0.024, 0.943, 0.185);
          group.add(fiTooth);
        }

        // Enhanced flame crown - more flames, varying heights and colors
        const fiFlameHeights = [0.12, 0.09, 0.14, 0.08, 0.11, 0.1, 0.13];
        for (let f = 0; f < 7; f++) {
          const flAngle = (f / 7) * Math.PI * 2;
          const flR = 0.1;
          const flMat = f % 2 === 0 ? fiFlameMat : fiFlameYellowMat;
          const fiFlame = new THREE.Mesh(new THREE.ConeGeometry(0.025, fiFlameHeights[f], 8), flMat);
          fiFlame.position.set(Math.cos(flAngle) * flR, 1.19 + fiFlameHeights[f] / 2, Math.sin(flAngle) * flR);
          group.add(fiFlame);
        }
        // Center tall flame
        const fiCenterFlame = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.18, 8), fiFlameYellowMat);
        fiCenterFlame.position.set(0, 1.28, 0);
        group.add(fiCenterFlame);

        // Arms with upper arm, forearm, clawed hands
        for (const ax of [-1, 1]) {
          const fiArmGroup = new THREE.Group();
          fiArmGroup.name = ax < 0 ? 'anim_la' : 'anim_ra';
          fiArmGroup.position.set(ax * 0.3, 0.72, 0);
          // Upper arm
          const fiUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.22, 12), fiBodyMat);
          fiUpperArm.position.y = -0.11;
          fiUpperArm.rotation.z = ax * 0.35;
          fiArmGroup.add(fiUpperArm);
          // Forearm
          const fiForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.2, 12), fiBodyMat);
          fiForearm.position.set(ax * 0.04, -0.27, 0);
          fiForearm.rotation.z = ax * 0.5;
          fiArmGroup.add(fiForearm);
          // Hand
          const fiHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), fiBodyMat);
          fiHand.position.set(ax * 0.08, -0.38, 0);
          fiArmGroup.add(fiHand);
          // Claw fingers (3 per hand)
          for (let cf = 0; cf < 3; cf++) {
            const cfOffset = (cf - 1) * 0.03;
            const fiClaw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 8), fiHornMat);
            fiClaw.position.set(ax * 0.11 + cfOffset, -0.42, 0.02);
            fiClaw.rotation.z = ax * 0.2;
            fiClaw.rotation.x = 0.3;
            fiArmGroup.add(fiClaw);
          }
          group.add(fiArmGroup);
        }

        // Fire orb floating between hands
        const fiOrb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.0, transparent: true, opacity: 0.85 }));
        fiOrb.position.set(0, 0.35, 0.25);
        group.add(fiOrb);

        // Legs with thigh, shin, and cloven hooves
        for (const lx of [-1, 1]) {
          const fiLegGroup = new THREE.Group();
          fiLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          fiLegGroup.position.set(lx * 0.14, 0.38, 0);
          // Thigh
          const fiThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.24, 12), fiBodyMat);
          fiThigh.position.y = -0.12;
          fiLegGroup.add(fiThigh);
          // Shin (angled)
          const fiShin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12), fiBodyMat);
          fiShin.position.set(lx * 0.02, -0.3, 0.02);
          fiShin.rotation.z = lx * 0.1;
          fiLegGroup.add(fiShin);
          // Cloven hoof - two wedge halves
          for (const hh of [-1, 1]) {
            const fiHoof = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.08), fiHornMat);
            fiHoof.position.set(hh * 0.022, -0.435, 0.01);
            group.add(fiHoof); // add to group directly so position is in world space relative to leg
            fiLegGroup.add(fiHoof);
          }
          group.add(fiLegGroup);
        }

        // Small claw toes
        for (const lx of [-1, 1]) {
          for (let t = 0; t < 2; t++) {
            const fiToe = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 12), fiHornMat);
            fiToe.position.set(lx * 0.14 + (t - 0.5) * 0.03, 0.0, 0.06);
            fiToe.rotation.x = -0.5;
            group.add(fiToe);
          }
        }

        // Spaded tail with segments
        const fiTailGroup = new THREE.Group();
        fiTailGroup.name = 'anim_tail';
        fiTailGroup.position.set(0, 0.38, -0.3);
        const fiTailSegs = [
          { r: 0.03, h: 0.14, y: 0, rx: -0.5 },
          { r: 0.025, h: 0.12, y: -0.1, rx: -0.8 },
          { r: 0.018, h: 0.1, y: -0.19, rx: -1.1 },
        ];
        for (const seg of fiTailSegs) {
          const fiTailSeg = new THREE.Mesh(new THREE.CylinderGeometry(seg.r * 0.8, seg.r, seg.h, 10), fiBodyMat);
          fiTailSeg.position.y = seg.y;
          fiTailSeg.rotation.x = seg.rx;
          fiTailGroup.add(fiTailSeg);
        }
        // Spade tip
        const fiSpade = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), fiHornMat);
        fiSpade.scale.set(0.5, 1.2, 0.3);
        fiSpade.position.set(0, -0.28, -0.22);
        fiTailGroup.add(fiSpade);
        group.add(fiTailGroup);

        // Small bat-like wings
        for (const wx of [-1, 1]) {
          // Wing bone
          const fiWingBone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.22, 8), fiHornMat);
          fiWingBone.position.set(wx * 0.28, 0.72, -0.05);
          fiWingBone.rotation.z = wx * 0.8;
          fiWingBone.rotation.x = -0.2;
          group.add(fiWingBone);
          // Wing membrane (thin plane)
          const fiWingMem = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), fiWingMat);
          fiWingMem.position.set(wx * 0.33, 0.7, -0.07);
          fiWingMem.rotation.y = wx * 0.4;
          fiWingMem.rotation.z = wx * 0.5;
          group.add(fiWingMem);
          // Second wing membrane panel
          const fiWingMem2 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), fiWingMat);
          fiWingMem2.position.set(wx * 0.38, 0.62, -0.1);
          fiWingMem2.rotation.y = wx * 0.5;
          fiWingMem2.rotation.z = wx * 0.7;
          group.add(fiWingMem2);
        }
        break;
      }
      // --- LAVA_ELEMENTAL | Estimated polygons: ~52000 triangles ---
      case EnemyType.LAVA_ELEMENTAL: {
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.3 });
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95, metalness: 0.0 });
        const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 });
        const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.2, roughness: 0.2 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.0 });
        const leHover = new THREE.Group();
        leHover.name = 'anim_hover';
        // Main torso - layered craggy dodecahedrons
        const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 3), rockMat);
        torso.position.y = 0.85;
        torso.castShadow = true;
        leHover.add(torso);
        const torsoLayer2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 2), darkRockMat);
        torsoLayer2.position.set(0.06, 0.82, 0.04);
        torsoLayer2.rotation.set(0.4, 0.6, 0.2);
        leHover.add(torsoLayer2);
        const torsoLayer3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 2), rockMat);
        torsoLayer3.position.set(-0.04, 0.88, -0.05);
        torsoLayer3.rotation.set(0.2, 1.0, 0.3);
        leHover.add(torsoLayer3);
        // Glowing magma core (emissive sphere inside chest)
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), magmaMat);
        core.position.set(0, 0.85, 0);
        leHover.add(core);
        // Head - lumpy rock sphere + dodecahedron overlay
        const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 3), rockMat);
        head.position.y = 1.45;
        leHover.add(head);
        const headOverlay = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 2), darkRockMat);
        headOverlay.position.set(0.02, 1.47, 0.03);
        headOverlay.rotation.set(0.5, 0.3, 0.1);
        leHover.add(headOverlay);
        // Emissive eyes
        for (const ex of [-0.1, 0.1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), eyeMat);
          eye.position.set(ex, 1.48, 0.22);
          leHover.add(eye);
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), magmaMat);
          eyeGlow.position.set(ex, 1.48, 0.25);
          leHover.add(eyeGlow);
        }
        // Shoulder boulders
        for (const sx of [-0.52, 0.52]) {
          const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 2), rockMat);
          shoulder.position.set(sx, 1.1, 0);
          leHover.add(shoulder);
          const shoulderSmall = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 2), darkRockMat);
          shoulderSmall.position.set(sx * 1.1, 1.18, 0.05);
          shoulderSmall.rotation.set(0.3, 0.5, 0.2);
          leHover.add(shoulderSmall);
        }
        // Molten lava veins across body - cylinders and torus rings
        const veinPositions: [number, number, number, number, number, number][] = [
          [-0.15, 0.9, 0.42, 0, 0, 0],
          [0.18, 0.8, 0.38, 0.2, 0, 0.3],
          [-0.05, 1.05, 0.44, -0.2, 0.1, 0],
          [0.12, 0.72, 0.35, 0.1, -0.2, 0.1],
          [-0.2, 0.95, 0.3, 0.3, 0, -0.2],
          [0.05, 1.1, 0.36, -0.1, 0.2, 0.1],
        ];
        for (const [px, py, pz, rx, ry, rz] of veinPositions) {
          const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.2, 8), lavaMat);
          vein.position.set(px, py, pz);
          vein.rotation.set(rx, ry, rz);
          leHover.add(vein);
        }
        // Lava torus rings on torso
        for (let t = 0; t < 3; t++) {
          const torus = new THREE.Mesh(new THREE.TorusGeometry(0.12 + t * 0.04, 0.012, 8, 16), lavaMat);
          torus.position.set((t - 1) * 0.08, 0.8 + t * 0.1, 0);
          torus.rotation.x = Math.PI / 2 + t * 0.3;
          torus.rotation.z = t * 0.4;
          leHover.add(torus);
        }
        // Left arm group with upper arm, forearm, rocky fist
        {
          const laGroup = new THREE.Group();
          laGroup.name = 'anim_la';
          laGroup.position.set(-0.55, 1.05, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.32, 16), rockMat);
          upperArm.position.set(-0.12, -0.08, 0);
          upperArm.rotation.z = 0.4;
          laGroup.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.28, 16), darkRockMat);
          forearm.position.set(-0.26, -0.28, 0.02);
          forearm.rotation.z = 0.5;
          laGroup.add(forearm);
          const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 2), rockMat);
          fist.position.set(-0.38, -0.48, 0.04);
          laGroup.add(fist);
          // Lava drip from left arm
          for (let d = 0; d < 3; d++) {
            const drip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), magmaMat);
            drip.position.set(-0.35 - d * 0.02, -0.55 - d * 0.06, 0.02);
            drip.scale.y = 1.4;
            laGroup.add(drip);
          }
          leHover.add(laGroup);
        }
        // Right arm group
        {
          const raGroup = new THREE.Group();
          raGroup.name = 'anim_ra';
          raGroup.position.set(0.55, 1.05, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.32, 16), rockMat);
          upperArm.position.set(0.12, -0.08, 0);
          upperArm.rotation.z = -0.4;
          raGroup.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.28, 16), darkRockMat);
          forearm.position.set(0.26, -0.28, 0.02);
          forearm.rotation.z = -0.5;
          raGroup.add(forearm);
          const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 2), rockMat);
          fist.position.set(0.38, -0.48, 0.04);
          raGroup.add(fist);
          // Lava drip from right arm
          for (let d = 0; d < 3; d++) {
            const drip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), magmaMat);
            drip.position.set(0.35 + d * 0.02, -0.55 - d * 0.06, 0.02);
            drip.scale.y = 1.4;
            raGroup.add(drip);
          }
          leHover.add(raGroup);
        }
        // Legs with rocky knee joints
        for (const lx of [-0.18, 0.18]) {
          const legGroup = new THREE.Group();
          legGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(lx, 0.55, 0);
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.28, 16), rockMat);
          thigh.position.y = -0.1;
          legGroup.add(thigh);
          const knee = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 2), darkRockMat);
          knee.position.y = -0.26;
          legGroup.add(knee);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.24, 16), rockMat);
          shin.position.y = -0.44;
          legGroup.add(shin);
          const foot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 1), darkRockMat);
          foot.position.set(0, -0.6, 0.04);
          legGroup.add(foot);
          leHover.add(legGroup);
        }
        // Floating rock fragments orbiting the body
        const floatAngles = [0, 1.05, 2.1, 3.15, 4.2, 5.25];
        for (let f = 0; f < floatAngles.length; f++) {
          const ang = floatAngles[f];
          const radius = 0.62 + (f % 3) * 0.08;
          const yOff = 0.7 + (f % 2) * 0.3;
          const frag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045 + (f % 3) * 0.02, 1), f % 2 === 0 ? darkRockMat : rockMat);
          frag.position.set(Math.cos(ang) * radius, yOff, Math.sin(ang) * radius);
          frag.rotation.set(ang, ang * 0.5, ang * 0.3);
          leHover.add(frag);
        }
        // Steam / heat vents on the back (small cone arrays)
        for (let v = 0; v < 5; v++) {
          const vent = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 8), darkRockMat);
          vent.position.set(-0.1 + v * 0.05, 0.9 + (v % 2) * 0.08, -0.44);
          vent.rotation.x = -0.2;
          leHover.add(vent);
          const ventGlow = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 12), lavaMat);
          ventGlow.position.set(-0.1 + v * 0.05, 0.97 + (v % 2) * 0.08, -0.44);
          ventGlow.rotation.x = -0.2;
          leHover.add(ventGlow);
        }
        // Rocky armor plates on chest
        const platePosArr: [number, number, number, number][] = [
          [-0.2, 1.0, 0.44, -0.1],
          [0.2, 1.0, 0.44, 0.1],
          [0, 0.78, 0.46, 0],
          [-0.15, 0.68, 0.4, -0.15],
          [0.15, 0.68, 0.4, 0.15],
        ];
        for (const [px, py, pz, rz] of platePosArr) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.03), darkRockMat);
          plate.position.set(px, py, pz);
          plate.rotation.z = rz;
          leHover.add(plate);
        }
        group.add(leHover);
        break;
      }
      // --- INFERNAL_KNIGHT | Estimated polygons: ~48000 triangles ---
      case EnemyType.INFERNAL_KNIGHT: {
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x2a0000, metalness: 0.8, roughness: 0.25 });
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x1a0000, metalness: 0.9, roughness: 0.2 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0 });
        const brightFireMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.5 });
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x3a0000, metalness: 0.85, roughness: 0.2 });
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x1a0008, roughness: 0.9, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
        // Layered armor torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.28), armorMat);
        torso.position.y = 0.92;
        torso.castShadow = true;
        group.add(torso);
        // Chest plate overlay
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.04), darkArmorMat);
        chestPlate.position.set(0, 1.02, 0.16);
        group.add(chestPlate);
        // Ab plate overlay
        const abPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.04), darkArmorMat);
        abPlate.position.set(0, 0.78, 0.16);
        group.add(abPlate);
        // Ab segment lines
        for (let ab = 0; ab < 2; ab++) {
          const abLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.05), fireMat);
          abLine.position.set(0, 0.83 + ab * 0.1, 0.16);
          group.add(abLine);
        }
        // Belt with buckle
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.3), darkArmorMat);
        belt.position.set(0, 0.66, 0);
        group.add(belt);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), armorMat);
        buckle.position.set(0, 0.66, 0.16);
        group.add(buckle);
        const buckleGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), fireMat);
        buckleGlow.position.set(0, 0.66, 0.18);
        group.add(buckleGlow);
        // Gorget (neck armor)
        const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 16), darkArmorMat);
        gorget.position.set(0, 1.22, 0);
        group.add(gorget);
        // Helmet
        const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.26), armorMat);
        helmet.position.y = 1.42;
        group.add(helmet);
        const helmetTop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), darkArmorMat);
        helmetTop.position.y = 1.54;
        helmetTop.scale.set(1, 0.6, 1);
        group.add(helmetTop);
        // Visor slit (emissive fire)
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.02), fireMat);
        visor.position.set(0, 1.42, 0.14);
        group.add(visor);
        const visorCenter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.02), brightFireMat);
        visorCenter.position.set(0, 1.42, 0.15);
        group.add(visorCenter);
        // Chin guard
        const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), darkArmorMat);
        chinGuard.position.set(0, 1.32, 0.13);
        group.add(chinGuard);
        // Helmet crest / plume
        const crestBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.22), darkArmorMat);
        crestBase.position.set(0, 1.62, 0);
        group.add(crestBase);
        for (let cp = 0; cp < 5; cp++) {
          const plumeFeather = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), fireMat);
          plumeFeather.position.set((cp - 2) * 0.025, 1.72 + Math.abs(cp - 2) * 0.02, 0);
          group.add(plumeFeather);
        }
        // Fire particles around helmet
        for (let fp = 0; fp < 6; fp++) {
          const ang = (fp / 6) * Math.PI * 2;
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 12), brightFireMat);
          flame.position.set(Math.cos(ang) * 0.15, 1.62, Math.sin(ang) * 0.13);
          flame.rotation.x = -0.3;
          flame.rotation.y = ang;
          group.add(flame);
        }
        // Enhanced pauldrons with spikes
        for (const sx of [-0.32, 0.32]) {
          const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), armorMat);
          pauldron.position.set(sx, 1.17, 0);
          group.add(pauldron);
          const pauldronRim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.05, 16), darkArmorMat);
          pauldronRim.position.set(sx, 1.1, 0);
          group.add(pauldronRim);
          // Spikes on pauldron
          for (let sp = 0; sp < 3; sp++) {
            const spikeAng = (sp / 3) * Math.PI + (sx < 0 ? Math.PI : 0);
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 8), darkArmorMat);
            spike.position.set(sx + Math.cos(spikeAng) * 0.1, 1.22 + sp * 0.03, Math.sin(spikeAng) * 0.08);
            spike.rotation.z = sx < 0 ? -0.6 - sp * 0.2 : 0.6 + sp * 0.2;
            group.add(spike);
          }
        }
        // Emissive glow strips between armor plates
        const glowStrips: [number, number, number, number, number][] = [
          [-0.24, 0.98, 0.16, 0.02, 0.18],
          [0.24, 0.98, 0.16, 0.02, 0.18],
          [-0.24, 0.82, 0.16, 0.02, 0.14],
          [0.24, 0.82, 0.16, 0.02, 0.14],
        ];
        for (const [gx, gy, gz, gw, gh] of glowStrips) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, 0.02), fireMat);
          strip.position.set(gx, gy, gz);
          group.add(strip);
        }
        // Left arm group with upper arm, gauntlet, hand + shield
        {
          const laGroup = new THREE.Group();
          laGroup.name = 'anim_la';
          laGroup.position.set(-0.36, 1.12, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.26, 16), armorMat);
          upperArm.position.set(-0.06, -0.1, 0);
          upperArm.rotation.z = 0.2;
          laGroup.add(upperArm);
          const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), darkArmorMat);
          elbow.position.set(-0.1, -0.26, 0);
          laGroup.add(elbow);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.24, 16), armorMat);
          forearm.position.set(-0.14, -0.42, 0);
          forearm.rotation.z = 0.15;
          laGroup.add(forearm);
          const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), darkArmorMat);
          gauntlet.position.set(-0.18, -0.58, 0);
          laGroup.add(gauntlet);
          // Shield
          const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), shieldMat);
          shield.position.set(-0.28, -0.6, 0.04);
          shield.rotation.z = Math.PI / 2;
          shield.rotation.x = 0.3;
          laGroup.add(shield);
          const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), darkArmorMat);
          shieldBoss.position.set(-0.3, -0.6, 0.1);
          laGroup.add(shieldBoss);
          const shieldEmblem = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 12), fireMat);
          shieldEmblem.position.set(-0.3, -0.6, 0.14);
          shieldEmblem.rotation.x = Math.PI / 2;
          laGroup.add(shieldEmblem);
          // Shield rim detail
          const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 16), armorMat);
          shieldRim.position.set(-0.28, -0.6, 0.04);
          shieldRim.rotation.z = Math.PI / 2;
          shieldRim.rotation.x = 0.3;
          laGroup.add(shieldRim);
          group.add(laGroup);
        }
        // Right arm group with flaming sword
        {
          const raGroup = new THREE.Group();
          raGroup.name = 'anim_ra';
          raGroup.position.set(0.36, 1.12, 0);
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.26, 16), armorMat);
          upperArm.position.set(0.06, -0.1, 0);
          upperArm.rotation.z = -0.2;
          raGroup.add(upperArm);
          const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), darkArmorMat);
          elbow.position.set(0.1, -0.26, 0);
          raGroup.add(elbow);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.24, 16), armorMat);
          forearm.position.set(0.14, -0.42, 0);
          forearm.rotation.z = -0.15;
          raGroup.add(forearm);
          const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), darkArmorMat);
          gauntlet.position.set(0.18, -0.58, 0);
          raGroup.add(gauntlet);
          // Sword pommel
          const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), darkArmorMat);
          pommel.position.set(0.2, -0.72, 0);
          raGroup.add(pommel);
          // Sword grip
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12), darkArmorMat);
          grip.position.set(0.2, -0.86, 0);
          raGroup.add(grip);
          // Crossguard
          const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), armorMat);
          crossguard.position.set(0.2, -0.96, 0);
          raGroup.add(crossguard);
          const crossguardTips = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), darkArmorMat);
          for (const cx of [-0.1, 0.1]) {
            const tip = crossguardTips.clone();
            tip.position.set(0.2 + cx, -0.96, 0);
            raGroup.add(tip);
          }
          // Sword blade (emissive fire material)
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.58, 0.015), fireMat);
          blade.position.set(0.2, -1.27, 0);
          raGroup.add(blade);
          const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 0.02), brightFireMat);
          bladeEdge.position.set(0.2, -1.27, 0);
          raGroup.add(bladeEdge);
          // Blade tip
          const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), brightFireMat);
          bladeTip.position.set(0.2, -1.58, 0);
          bladeTip.rotation.z = Math.PI;
          raGroup.add(bladeTip);
          // Flame wisps along blade
          for (let fw = 0; fw < 5; fw++) {
            const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), brightFireMat);
            wisp.position.set(0.2 + (fw % 2 === 0 ? 0.04 : -0.04), -1.05 - fw * 0.1, 0.02);
            wisp.scale.y = 1.6;
            raGroup.add(wisp);
          }
          group.add(raGroup);
        }
        // Articulated legs with thigh armor, knee guard, greaves, boots
        for (const lx of [-0.14, 0.14]) {
          const legGroup = new THREE.Group();
          legGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          legGroup.position.set(lx, 0.62, 0);
          // Thigh
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.26, 16), armorMat);
          thigh.position.y = -0.1;
          legGroup.add(thigh);
          const thighPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.04), darkArmorMat);
          thighPlate.position.set(0, -0.1, 0.08);
          legGroup.add(thighPlate);
          // Knee guard
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), darkArmorMat);
          knee.position.y = -0.26;
          legGroup.add(knee);
          const kneeCap = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 8), armorMat);
          kneeCap.position.set(0, -0.26, 0.08);
          kneeCap.rotation.x = Math.PI / 2;
          legGroup.add(kneeCap);
          // Greave (shin)
          const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.065, 0.26, 16), armorMat);
          greave.position.y = -0.44;
          legGroup.add(greave);
          const greavePlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.04), darkArmorMat);
          greavePlate.position.set(0, -0.44, 0.08);
          legGroup.add(greavePlate);
          // Armored boot
          const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.18), armorMat);
          boot.position.set(0, -0.6, 0.04);
          legGroup.add(boot);
          const bootToe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), darkArmorMat);
          bootToe.position.set(0, -0.63, 0.14);
          legGroup.add(bootToe);
          group.add(legGroup);
        }
        // Flowing cape - multiple overlapping thin box layers
        const capeLayerDefs: [number, number, number, number][] = [
          [0, 0.85, -0.16, 0.5],
          [0, 0.72, -0.18, 0.46],
          [0.04, 0.6, -0.2, 0.42],
          [-0.04, 0.48, -0.22, 0.38],
          [0, 0.36, -0.23, 0.34],
        ];
        for (let cl = 0; cl < capeLayerDefs.length; cl++) {
          const [cx, cy, cz, cw] = capeLayerDefs[cl];
          const capeLayer = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.01, 0.2 + cl * 0.04), capeMat);
          capeLayer.position.set(cx, cy, cz);
          capeLayer.rotation.x = 0.1 + cl * 0.05;
          group.add(capeLayer);
        }
        // Back plate
        const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.04), darkArmorMat);
        backPlate.position.set(0, 0.95, -0.16);
        group.add(backPlate);
        break;
      }
      // --- MAGMA_SERPENT | Estimated polygons: ~44968 triangles ---
      case EnemyType.MAGMA_SERPENT: {
        // --- MAGMA_SERPENT | Estimated polygons: ~70,000 triangles ---
        const serpMat = new THREE.MeshStandardMaterial({ color: 0x882200, emissive: 0x441100, emissiveIntensity: 0.3, roughness: 0.5 });
        const serpScaleMat = new THREE.MeshStandardMaterial({ color: 0x6b1a00, roughness: 0.55 });
        const serpBellyMat = new THREE.MeshStandardMaterial({ color: 0xcc5522, roughness: 0.45 });
        const headMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, emissive: 0x661100, emissiveIntensity: 0.4, roughness: 0.45 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 1.5 });
        const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x110000, roughness: 0.9 });
        const eyeGlowMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.0, transparent: true, opacity: 0.28 });
        const finMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, emissive: 0x661100, emissiveIntensity: 0.5, roughness: 0.4 });
        const lavaVeinMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.4 });
        const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc0000, emissiveIntensity: 0.6 });
        const rattleMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 2.0 });
        const heatMat = new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff6622, emissiveIntensity: 0.4, transparent: true, opacity: 0.1 });
        const droolMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2, transparent: true, opacity: 0.7 });
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0xbb2200, emissive: 0x550800, emissiveIntensity: 0.35, roughness: 0.48 });

        const msHover = new THREE.Group();
        msHover.name = 'anim_hover';

        // === BODY SEGMENTS (14 segments in sinuous S-curve) ===
        // Body radiuses taper from head to tail
        const segCount = 14;
        const segRadii = [0.16, 0.155, 0.155, 0.15, 0.148, 0.145, 0.14, 0.135, 0.13, 0.122, 0.112, 0.098, 0.082, 0.065];
        // S-curve positions: amplitude on X varies with depth along body
        for (let s = 0; s < segCount; s++) {
          const sx = Math.sin(s * 0.72 + 0.3) * 0.28;
          const sy = 0.22 + Math.sin(s * 0.45) * 0.14;
          const sz = -s * 0.22;
          const r = segRadii[s];

          // Main body sphere
          const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), serpMat);
          seg.position.set(sx, sy, sz);
          if (s === 0) seg.castShadow = true;
          msHover.add(seg);

          // Underbelly plate (lighter flat box underneath each segment)
          const belly = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, r * 0.35, r * 0.9), serpBellyMat);
          belly.position.set(sx, sy - r * 0.78, sz);
          msHover.add(belly);

          // Scale overlay plates on top (2-3 per segment)
          const plateCount = s < 5 ? 3 : 2;
          for (let p = 0; p < plateCount; p++) {
            const pa = (p / plateCount - 0.5) * Math.PI * 0.55;
            const plate = new THREE.Mesh(new THREE.BoxGeometry(r * 0.65, r * 0.14, r * 0.55), serpScaleMat);
            plate.position.set(
              sx + Math.sin(pa) * r * 0.6,
              sy + r * 0.72,
              sz + (p - Math.floor(plateCount / 2)) * r * 0.45
            );
            plate.rotation.z = pa * 0.6;
            msHover.add(plate);
          }

          // Lava vein strip between segments (thin emissive cylinder linking to next)
          if (s < segCount - 1) {
            const nx = Math.sin((s + 1) * 0.72 + 0.3) * 0.28;
            const ny = 0.22 + Math.sin((s + 1) * 0.45) * 0.14;
            const nz = -(s + 1) * 0.22;
            const mid = new THREE.Vector3((sx + nx) / 2, (sy + ny) / 2, (sz + nz) / 2);
            const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), lavaVeinMat);
            vein.position.copy(mid);
            vein.rotation.x = Math.atan2(ny - sy, nz - sz) + Math.PI / 2;
            msHover.add(vein);
          }
        }

        // === ENHANCED HEAD ===
        const headPosX = Math.sin(0.3) * 0.28;
        const headPosY = 0.33;
        const headPosZ = 0.22;
        const msHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 24), headMat);
        msHead.scale.set(1.05, 0.72, 1.4);
        msHead.position.set(headPosX, headPosY, headPosZ);
        msHover.add(msHead);

        // Brow ridges (dark boxes above eyes)
        for (const bx of [-0.07, 0.07]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.055), serpScaleMat);
          brow.position.set(headPosX + bx, headPosY + 0.1, headPosZ + 0.16);
          brow.rotation.z = bx > 0 ? -0.25 : 0.25;
          msHover.add(brow);
        }

        // Flared cobra-like hood (2 wide flat cones either side of head)
        for (const hx of [-1, 1]) {
          const hood = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.06, 16), hoodMat);
          hood.scale.set(1, 0.3, 2.2);
          hood.rotation.z = hx * (Math.PI / 2 - 0.18);
          hood.position.set(headPosX + hx * 0.26, headPosY + 0.04, headPosZ - 0.05);
          msHover.add(hood);
        }

        // Nostril details
        for (const nx of [-0.055, 0.055]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), serpScaleMat);
          nostril.position.set(headPosX + nx, headPosY + 0.04, headPosZ + 0.27);
          msHover.add(nostril);
        }

        // === ENHANCED EYES (with pupils and glow halos) ===
        for (const ex of [-0.075, 0.075]) {
          // Main yellow eye
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 32, 24), eyeMat);
          eye.position.set(headPosX + ex, headPosY + 0.06, headPosZ + 0.2);
          msHover.add(eye);
          // Dark pupil
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), eyePupilMat);
          pupil.position.set(headPosX + ex, headPosY + 0.06, headPosZ + 0.235);
          msHover.add(pupil);
          // Fire glow halo
          const glow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), eyeGlowMat);
          glow.position.set(headPosX + ex, headPosY + 0.06, headPosZ + 0.196);
          msHover.add(glow);
        }

        // === JAW GROUP (anim_jaw) ===
        {
          const jawGroup = new THREE.Group();
          jawGroup.name = 'anim_jaw';
          jawGroup.position.set(headPosX, headPosY - 0.07, headPosZ + 0.1);

          // Lower jaw
          const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.26), headMat);
          lowerJaw.position.set(0, -0.02, 0.06);
          jawGroup.add(lowerJaw);

          // Lower teeth (5 cones)
          for (let t = 0; t < 5; t++) {
            const tx = (t / 4 - 0.5) * 0.18;
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 8), serpBellyMat);
            tooth.rotation.x = Math.PI;
            tooth.position.set(tx, 0.02, 0.14);
            jawGroup.add(tooth);
          }

          // Forked tongue (enhanced: 3 segments + fork tips)
          const tongBase = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.08, 8), tongueMat);
          tongBase.rotation.x = Math.PI / 2 - 0.15;
          tongBase.position.set(0, -0.025, 0.2);
          jawGroup.add(tongBase);
          for (const tfx of [-0.022, 0.022]) {
            const tFork = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.055, 8), tongueMat);
            tFork.rotation.x = Math.PI / 2 - 0.1;
            tFork.position.set(tfx, -0.028, 0.27);
            jawGroup.add(tFork);
          }

          // Lava drool (thin emissive cylinders hanging from jaw)
          for (let d = 0; d < 3; d++) {
            const dx = (d / 2 - 0.5) * 0.12;
            const drool = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, 0.06, 12), droolMat);
            drool.position.set(dx, -0.058, 0.1 + d * 0.02);
            jawGroup.add(drool);
          }

          msHover.add(jawGroup);
        }

        // === UPPER TEETH ROW (5 cones on upper jaw) ===
        for (let t = 0; t < 5; t++) {
          const tx = (t / 4 - 0.5) * 0.18;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.042, 8), serpBellyMat);
          tooth.position.set(headPosX + tx, headPosY - 0.08, headPosZ + 0.24);
          msHover.add(tooth);
        }

        // === DORSAL FINS (9 fins of varying heights along spine) ===
        // Fin heights: larger near head, smaller near tail
        const finHeights = [0.22, 0.28, 0.32, 0.28, 0.24, 0.2, 0.16, 0.12, 0.09];
        const finBaseWidths = [0.045, 0.052, 0.058, 0.052, 0.046, 0.038, 0.03, 0.024, 0.018];
        for (let f = 0; f < 9; f++) {
          const fs = f * (segCount / 9);
          const fi = Math.min(Math.floor(fs), segCount - 1);
          const sx = Math.sin(fi * 0.72 + 0.3) * 0.28;
          const sy = 0.22 + Math.sin(fi * 0.45) * 0.14;
          const sz = -fi * 0.22;

          // Main dorsal fin cone
          const fin = new THREE.Mesh(new THREE.ConeGeometry(finBaseWidths[f], finHeights[f], 16), finMat);
          fin.position.set(sx, sy + segRadii[fi] + finHeights[f] * 0.5, sz);
          fin.rotation.z = Math.sin(fi * 0.72) * 0.12;
          msHover.add(fin);

          // Dorsal fin membrane between adjacent fins (thin plane)
          if (f < 8) {
            const nfi = Math.min(Math.floor((f + 1) * (segCount / 9)), segCount - 1);
            const nsx = Math.sin(nfi * 0.72 + 0.3) * 0.28;
            const nsy = 0.22 + Math.sin(nfi * 0.45) * 0.14;
            const nsz = -nfi * 0.22;
            const membMid = new THREE.Vector3((sx + nsx) / 2, (sy + nsy) / 2 + segRadii[fi] * 0.9, (sz + nsz) / 2);
            const membH = (finHeights[f] + finHeights[f + 1]) * 0.3;
            const memb = new THREE.Mesh(new THREE.BoxGeometry(0.015, membH, Math.abs(nsz - sz) * 0.85), finMat);
            memb.position.copy(membMid);
            msHover.add(memb);
          }
        }

        // === TAIL TIP (tapered last 3 sub-segments + flame rattle) ===
        const tailBaseZ = -(segCount - 1) * 0.22;
        const tailBaseX = Math.sin((segCount - 1) * 0.72 + 0.3) * 0.28;
        const tailBaseY = 0.22 + Math.sin((segCount - 1) * 0.45) * 0.14;
        for (let tt = 0; tt < 3; tt++) {
          const tr = 0.05 - tt * 0.012;
          const tailSeg = new THREE.Mesh(new THREE.SphereGeometry(tr, 16, 12), serpMat);
          tailSeg.position.set(tailBaseX + tt * 0.04, tailBaseY - tt * 0.02, tailBaseZ - tt * 0.16);
          msHover.add(tailSeg);
        }
        // Flame-tipped rattle (emissive sphere + thin rattle cones)
        const rattleSphere = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), rattleMat);
        rattleSphere.position.set(tailBaseX + 0.12, tailBaseY - 0.06, tailBaseZ - 0.5);
        msHover.add(rattleSphere);
        for (let rc = 0; rc < 3; rc++) {
          const rattleCone = new THREE.Mesh(new THREE.ConeGeometry(0.018 - rc * 0.004, 0.04, 8), rattleMat);
          rattleCone.rotation.x = Math.PI / 2;
          rattleCone.position.set(tailBaseX + 0.12, tailBaseY - 0.06, tailBaseZ - 0.46 + rc * 0.04);
          msHover.add(rattleCone);
        }

        // === HEAT SHIMMER PLANES (3 transparent wavering planes rising from body) ===
        for (let h = 0; h < 3; h++) {
          const hsi = Math.floor(h * segCount / 3);
          const hsx = Math.sin(hsi * 0.72 + 0.3) * 0.28;
          const hsy = 0.22 + Math.sin(hsi * 0.45) * 0.14;
          const hsz = -hsi * 0.22;
          const heatPlane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.012), heatMat);
          heatPlane.position.set(hsx, hsy + 0.26, hsz);
          heatPlane.rotation.y = h * 0.6;
          msHover.add(heatPlane);
        }

        group.add(msHover);
        break;
      }
      // --- MOLTEN_COLOSSUS | Estimated polygons: ~65000 triangles ---
      case EnemyType.MOLTEN_COLOSSUS: {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
        const rockDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.98 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.9 });
        const lavaCoreMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.0 });
        const lavaSeamMat = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.2 });
        const lavaTransMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.5 });
        const mcPoolMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff1100, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 });

        // Main rocky torso - multiple overlapping shapes for craggy look
        const torsoCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), rockMat);
        torsoCore.scale.set(1.0, 1.1, 0.8);
        torsoCore.position.y = 1.55;
        torsoCore.castShadow = true;
        group.add(torsoCore);
        // Overlapping rock plates on torso
        const mcTorsoRockData: [number, number, number, number, number, number][] = [
          [-0.28, 1.8, 0.2, 0.25, 0.2, 0.18],
          [0.28, 1.8, 0.2, 0.25, 0.2, 0.18],
          [0, 2.05, 0.25, 0.3, 0.18, 0.22],
          [-0.38, 1.55, 0.1, 0.22, 0.24, 0.2],
          [0.38, 1.55, 0.1, 0.22, 0.24, 0.2],
          [0, 1.35, 0.2, 0.35, 0.2, 0.25],
          [-0.2, 1.6, 0.28, 0.2, 0.18, 0.16],
          [0.2, 1.6, 0.28, 0.2, 0.18, 0.16],
          [0, 1.7, -0.22, 0.28, 0.22, 0.18],
        ];
        for (const [ptx, pty, ptz, psx, psy, psz] of mcTorsoRockData) {
          const plate = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), rockDarkMat);
          plate.scale.set(psx / 0.3, psy / 0.3, psz / 0.3);
          plate.position.set(ptx, pty, ptz);
          group.add(plate);
        }
        // Lava core glow (visible through chest gaps)
        const lavaCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), lavaCoreMat);
        lavaCore.position.set(0, 1.62, 0.05);
        group.add(lavaCore);
        // Lava seams criss-crossing torso
        const mcTorsoSeams: [number, number, number, number, number, number, number][] = [
          [0.05, 1.9, 0.28, 0.02, 0.35, 0.02, 0.3],
          [-0.12, 1.6, 0.3, 0.02, 0.28, 0.02, -0.2],
          [0.22, 1.5, 0.2, 0.02, 0.22, 0.02, 0.5],
          [-0.2, 1.75, 0.22, 0.02, 0.3, 0.02, -0.4],
          [0, 1.45, 0.25, 0.32, 0.02, 0.02, 0],
          [0, 1.8, 0.28, 0.28, 0.02, 0.02, 0.1],
        ];
        for (const [stx, sty, stz, ssw, ssh, ssd, srx] of mcTorsoSeams) {
          const seam = new THREE.Mesh(new THREE.BoxGeometry(ssw, ssh, ssd), lavaSeamMat);
          seam.position.set(stx, sty, stz);
          seam.rotation.z = srx;
          group.add(seam);
        }

        // Rocky head with craggy features
        const mcHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), rockMat);
        mcHead.position.set(0, 2.38, 0);
        group.add(mcHead);
        // Rocky brow ridges
        for (const bx of [-0.14, 0.14]) {
          const brow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), rockDarkMat);
          brow.scale.set(1.2, 0.6, 0.8);
          brow.position.set(bx, 2.55, 0.26);
          group.add(brow);
        }
        // Head side rocks
        for (const hsx of [-0.28, 0.28]) {
          const sideRock = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), rockDarkMat);
          sideRock.position.set(hsx, 2.38, 0);
          group.add(sideRock);
        }
        // Jaw with molten drool
        const mcJaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.28), rockDarkMat);
        mcJaw.position.set(0, 2.12, 0.22);
        group.add(mcJaw);
        const jawDrool = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.18, 8), lavaMat);
        jawDrool.position.set(0.06, 2.0, 0.3);
        group.add(jawDrool);
        const jawDrool2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.12, 8), lavaMat);
        jawDrool2.position.set(-0.08, 2.02, 0.28);
        group.add(jawDrool2);
        // Lava eyes in dark sockets
        for (const ex of [-0.15, 0.15]) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), rockDarkMat);
          socket.position.set(ex, 2.45, 0.28);
          group.add(socket);
          const mcEye = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 12), lavaMat);
          mcEye.position.set(ex, 2.45, 0.33);
          group.add(mcEye);
          const eyeCore2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), lavaCoreMat);
          eyeCore2.position.set(ex, 2.45, 0.37);
          group.add(eyeCore2);
        }

        // Left arm - rocky upper arm, elbow, forearm, boulder fist with 3 finger shapes
        const mcLAGroup = new THREE.Group();
        mcLAGroup.name = 'anim_la';
        mcLAGroup.position.set(-0.65, 1.85, 0);
        const laUpperArm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), rockMat);
        laUpperArm.scale.set(0.9, 1.6, 0.9);
        laUpperArm.position.set(-0.12, -0.18, 0);
        mcLAGroup.add(laUpperArm);
        const laElbow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), rockDarkMat);
        laElbow.position.set(-0.2, -0.5, 0);
        mcLAGroup.add(laElbow);
        const laArmSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), lavaSeamMat);
        laArmSeam.position.set(-0.08, -0.22, 0.12);
        mcLAGroup.add(laArmSeam);
        const laForearm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), rockMat);
        laForearm.scale.set(0.85, 1.5, 0.85);
        laForearm.position.set(-0.28, -0.82, 0);
        mcLAGroup.add(laForearm);
        const laFist = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), rockDarkMat);
        laFist.position.set(-0.35, -1.18, 0);
        mcLAGroup.add(laFist);
        for (let fi = 0; fi < 3; fi++) {
          const laFinger = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), rockMat);
          laFinger.position.set(-0.22 + fi * 0.04 - 0.35, -1.32, 0.1);
          mcLAGroup.add(laFinger);
          const laFingerLava = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), lavaSeamMat);
          laFingerLava.position.set(-0.22 + fi * 0.04 - 0.35, -1.28, 0.14);
          mcLAGroup.add(laFingerLava);
        }
        const laDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.006, 0.22, 8), lavaMat);
        laDrip.position.set(-0.38, -1.48, 0.05);
        mcLAGroup.add(laDrip);
        group.add(mcLAGroup);

        // Right arm
        const mcRAGroup = new THREE.Group();
        mcRAGroup.name = 'anim_ra';
        mcRAGroup.position.set(0.65, 1.85, 0);
        const raUpperArm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), rockMat);
        raUpperArm.scale.set(0.9, 1.6, 0.9);
        raUpperArm.position.set(0.12, -0.18, 0);
        mcRAGroup.add(raUpperArm);
        const raElbow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), rockDarkMat);
        raElbow.position.set(0.2, -0.5, 0);
        mcRAGroup.add(raElbow);
        const raArmSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), lavaSeamMat);
        raArmSeam.position.set(0.08, -0.22, 0.12);
        mcRAGroup.add(raArmSeam);
        const raForearm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), rockMat);
        raForearm.scale.set(0.85, 1.5, 0.85);
        raForearm.position.set(0.28, -0.82, 0);
        mcRAGroup.add(raForearm);
        const raFist = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), rockDarkMat);
        raFist.position.set(0.35, -1.18, 0);
        mcRAGroup.add(raFist);
        for (let fi = 0; fi < 3; fi++) {
          const raFinger = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), rockMat);
          raFinger.position.set(0.22 - fi * 0.04 + 0.35, -1.32, 0.1);
          mcRAGroup.add(raFinger);
          const raFingerLava = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), lavaSeamMat);
          raFingerLava.position.set(0.22 - fi * 0.04 + 0.35, -1.28, 0.14);
          mcRAGroup.add(raFingerLava);
        }
        const raDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.006, 0.22, 8), lavaMat);
        raDrip.position.set(0.38, -1.48, 0.05);
        mcRAGroup.add(raDrip);
        group.add(mcRAGroup);

        // Shoulder boulders with lava seams
        for (const shx of [-0.72, 0.72]) {
          const shoulderBoulder = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), rockDarkMat);
          shoulderBoulder.position.set(shx, 2.12, 0);
          group.add(shoulderBoulder);
          const sSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.02), lavaSeamMat);
          sSeam.position.set(shx, 2.12, 0.16);
          group.add(sSeam);
        }

        // Left leg - thick rocky thigh, knee boulder, shin, massive flat foot
        const mcLLGroup = new THREE.Group();
        mcLLGroup.name = 'anim_ll';
        mcLLGroup.position.set(-0.32, 1.05, 0);
        const llThigh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), rockMat);
        llThigh.scale.set(1, 1.5, 1);
        llThigh.position.y = -0.22;
        mcLLGroup.add(llThigh);
        const llKnee = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), rockDarkMat);
        llKnee.position.y = -0.55;
        mcLLGroup.add(llKnee);
        const llShin = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), rockMat);
        llShin.scale.set(0.9, 1.4, 0.9);
        llShin.position.y = -0.88;
        mcLLGroup.add(llShin);
        const llFoot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.5), rockDarkMat);
        llFoot.position.set(0.04, -1.15, 0.08);
        mcLLGroup.add(llFoot);
        group.add(mcLLGroup);

        // Right leg
        const mcRLGroup = new THREE.Group();
        mcRLGroup.name = 'anim_rl';
        mcRLGroup.position.set(0.32, 1.05, 0);
        const rlThigh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), rockMat);
        rlThigh.scale.set(1, 1.5, 1);
        rlThigh.position.y = -0.22;
        mcRLGroup.add(rlThigh);
        const rlKnee = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), rockDarkMat);
        rlKnee.position.y = -0.55;
        mcRLGroup.add(rlKnee);
        const rlShin = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), rockMat);
        rlShin.scale.set(0.9, 1.4, 0.9);
        rlShin.position.y = -0.88;
        mcRLGroup.add(rlShin);
        const rlFoot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.5), rockDarkMat);
        rlFoot.position.set(-0.04, -1.15, 0.08);
        mcRLGroup.add(rlFoot);
        group.add(mcRLGroup);

        // Back volcanic vents (3 cone arrays with emissive tips)
        const mcVentPos: [number, number, number][] = [[-0.15, 2.1, -0.32], [0.15, 2.0, -0.35], [0, 1.62, -0.42]];
        for (const [vx, vy, vz] of mcVentPos) {
          const ventBase = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 12), rockDarkMat);
          ventBase.position.set(vx, vy, vz);
          group.add(ventBase);
          const ventGlow = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), lavaCoreMat);
          ventGlow.position.set(vx, vy + 0.1, vz);
          group.add(ventGlow);
          for (let v = 0; v < 2; v++) {
            const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.015 - v * 0.004, 0.1, 12), lavaTransMat);
            wisp.position.set(vx + (v - 0.5) * 0.06, vy + 0.18 + v * 0.08, vz);
            group.add(wisp);
          }
        }

        // Floating rock debris (6 small rocks orbiting the body)
        const mcDebrisAngles = [0, 1.05, 2.09, 3.14, 4.19, 5.24];
        for (let d = 0; d < 6; d++) {
          const dAng = mcDebrisAngles[d];
          const dR = 0.82 + (d % 2) * 0.12;
          const dY = 1.4 + (d % 3) * 0.22;
          const debris = new THREE.Mesh(new THREE.SphereGeometry(0.065 + (d % 3) * 0.018, 16, 12), d % 2 === 0 ? rockMat : rockDarkMat);
          debris.position.set(Math.cos(dAng) * dR, dY, Math.sin(dAng) * dR);
          group.add(debris);
          if (d % 2 === 0) {
            const dCrack = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), lavaSeamMat);
            dCrack.position.set(Math.cos(dAng) * dR, dY, Math.sin(dAng) * dR + 0.05);
            group.add(dCrack);
          }
        }

        // Lava pool at feet (flat emissive disc)
        const lavaPool = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.04, 24), mcPoolMat);
        lavaPool.position.set(0, 0.02, 0);
        group.add(lavaPool);
        // Ground impact crack lines radiating from feet
        for (let gc = 0; gc < 5; gc++) {
          const gcAng = (gc / 5) * Math.PI * 2;
          const gcCrack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.45), lavaSeamMat);
          gcCrack.position.set(Math.cos(gcAng) * 0.5, 0.03, Math.sin(gcAng) * 0.5);
          gcCrack.rotation.y = gcAng;
          group.add(gcCrack);
        }

        // Additional lava seams across body
        const mcBodySeams2: [number, number, number, number, number, number][] = [
          [0.3, 1.85, 0.3, 0.018, 0.45, 0.018],
          [-0.25, 1.7, 0.32, 0.018, 0.38, 0.018],
          [0.08, 2.15, 0.28, 0.018, 0.3, 0.018],
          [-0.4, 1.5, 0.12, 0.018, 0.32, 0.018],
          [0.42, 1.62, 0.15, 0.018, 0.28, 0.018],
        ];
        for (const [bsx, bsy, bsz, bsw, bsh, bsd] of mcBodySeams2) {
          const bs = new THREE.Mesh(new THREE.BoxGeometry(bsw, bsh, bsd), lavaSeamMat);
          bs.position.set(bsx, bsy, bsz);
          group.add(bs);
        }
        break;
      }

      // ── Abyssal Rift enemies ──
      // --- VOID_STALKER | Estimated polygons: ~56000 triangles ---
      case EnemyType.VOID_STALKER: {
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.3, roughness: 0.5 });
        const voidDarkMat = new THREE.MeshStandardMaterial({ color: 0x110033, emissive: 0x080018, emissiveIntensity: 0.2, roughness: 0.6 });
        const voidEyeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822cc, emissiveIntensity: 2.5 });
        const voidChitinMat = new THREE.MeshStandardMaterial({ color: 0x1a0033, emissive: 0x0a0018, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.4 });
        const voidEnergyMat = new THREE.MeshStandardMaterial({ color: 0x6600cc, emissive: 0x4400aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.4 });
        const voidParticleMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822cc, emissiveIntensity: 2.0 });

        // Elongated hunched torso
        const vsTorso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), voidMat);
        vsTorso.scale.set(1.1, 0.85, 1.3);
        vsTorso.position.y = 0.62;
        vsTorso.castShadow = true;
        group.add(vsTorso);
        // Hunched upper back bump
        const vsHunch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), voidMat);
        vsHunch.scale.set(0.9, 0.75, 1.1);
        vsHunch.position.set(0, 0.88, -0.12);
        group.add(vsHunch);

        // Chitinous shoulder plates
        for (const sx of [-1, 1]) {
          const vsShoulderPlate = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), voidChitinMat);
          vsShoulderPlate.scale.set(1.2, 0.55, 0.9);
          vsShoulderPlate.position.set(sx * 0.32, 0.85, -0.04);
          group.add(vsShoulderPlate);
          // Shoulder plate ridge
          const vsShoulderRidge = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), voidChitinMat);
          vsShoulderRidge.position.set(sx * 0.35, 0.92, -0.04);
          vsShoulderRidge.rotation.z = sx * 0.5;
          group.add(vsShoulderRidge);
        }

        // Spiny ridges along the back
        for (let sr = 0; sr < 6; sr++) {
          const vsSpine = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08 + sr * 0.01, 12), voidChitinMat);
          vsSpine.position.set(0, 0.72 + sr * 0.06, -0.24 - sr * 0.01);
          vsSpine.rotation.x = -0.4 - sr * 0.05;
          group.add(vsSpine);
        }

        // Head - angular/alien, stretched/squashed sphere
        const vsHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), voidMat);
        vsHead.scale.set(0.85, 0.75, 1.1);
        vsHead.position.set(0, 1.08, 0.06);
        group.add(vsHead);

        // Multiple glowing purple eyes (4-6 eyes, different sizes)
        const vsEyePositions = [
          { x: -0.07, y: 1.12, z: 0.18, r: 0.028 },
          { x: 0.07, y: 1.12, z: 0.18, r: 0.028 },
          { x: -0.04, y: 1.06, z: 0.19, r: 0.02 },
          { x: 0.04, y: 1.06, z: 0.19, r: 0.02 },
          { x: -0.1, y: 1.08, z: 0.14, r: 0.016 },
          { x: 0.1, y: 1.08, z: 0.14, r: 0.016 },
        ];
        for (const ep of vsEyePositions) {
          const vsEye = new THREE.Mesh(new THREE.SphereGeometry(ep.r, 16, 12), voidEyeMat);
          vsEye.position.set(ep.x, ep.y, ep.z);
          group.add(vsEye);
        }

        // Void tendrils hanging from body
        for (let td = 0; td < 6; td++) {
          const tdAngle = (td / 6) * Math.PI * 2;
          const tdR = 0.18;
          const vsTendril = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.35, 8), voidDarkMat);
          vsTendril.position.set(Math.cos(tdAngle) * tdR, 0.36, Math.sin(tdAngle) * tdR * 0.6);
          vsTendril.rotation.x = 0.3 + Math.random() * 0.3;
          vsTendril.rotation.z = (Math.cos(tdAngle)) * 0.3;
          group.add(vsTendril);
          const vsTendrilTip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), voidEyeMat);
          vsTendrilTip.position.set(Math.cos(tdAngle) * tdR, 0.18 + Math.sin(tdAngle) * 0.04, Math.sin(tdAngle) * tdR * 0.6);
          group.add(vsTendrilTip);
        }

        // Dark energy wisps (semi-transparent torus geometries)
        for (let ew = 0; ew < 4; ew++) {
          const ewAngle = (ew / 4) * Math.PI * 2;
          const vsWisp = new THREE.Mesh(new THREE.TorusGeometry(0.18 + ew * 0.04, 0.012, 8, 16), voidEnergyMat);
          vsWisp.position.set(0, 0.62 + ew * 0.08, 0);
          vsWisp.rotation.x = ewAngle * 0.5;
          vsWisp.rotation.y = ewAngle;
          group.add(vsWisp);
        }

        // Void particles/fragments floating around
        for (let vp = 0; vp < 8; vp++) {
          const vpAngle = (vp / 8) * Math.PI * 2;
          const vpR = 0.35 + (vp % 3) * 0.05;
          const vsParticle = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), voidParticleMat);
          vsParticle.position.set(
            Math.cos(vpAngle) * vpR,
            0.55 + (vp % 4) * 0.15,
            Math.sin(vpAngle) * vpR
          );
          vsParticle.rotation.set(vpAngle, vpAngle * 0.7, 0);
          group.add(vsParticle);
        }

        // Digitigrade legs (reverse-jointed)
        for (const lx of [-1, 1]) {
          const vsLegGroup = new THREE.Group();
          vsLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          vsLegGroup.position.set(lx * 0.18, 0.56, 0);
          // Thigh
          const vsThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.28, 12), voidMat);
          vsThigh.position.y = -0.14;
          vsLegGroup.add(vsThigh);
          // Knee joint
          const vsKnee = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), voidChitinMat);
          vsKnee.position.y = -0.3;
          vsLegGroup.add(vsKnee);
          // Shin angled backwards (digitigrade)
          const vsShin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 12), voidMat);
          vsShin.position.set(lx * 0.04, -0.47, 0.08);
          vsShin.rotation.x = 0.5;
          vsShin.rotation.z = lx * 0.15;
          vsLegGroup.add(vsShin);
          // Ankle/heel spike
          const vsHeel = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 8), voidChitinMat);
          vsHeel.position.set(0, -0.62, -0.06);
          vsHeel.rotation.x = -0.8;
          vsLegGroup.add(vsHeel);
          // Clawed foot - 3 claw cones
          for (let cl = 0; cl < 3; cl++) {
            const vsClaw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 8), voidChitinMat);
            vsClaw.position.set(lx * 0.02 + (cl - 1) * 0.03, -0.67, 0.06);
            vsClaw.rotation.x = -0.5;
            vsLegGroup.add(vsClaw);
          }
          group.add(vsLegGroup);
        }

        // Long multi-jointed arms with clawed hands
        for (const lx of [-1, 1]) {
          const vsArmGroup = new THREE.Group();
          vsArmGroup.name = lx < 0 ? 'anim_la' : 'anim_ra';
          vsArmGroup.position.set(lx * 0.34, 0.88, 0);
          // Upper arm
          const vsUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.32, 12), voidMat);
          vsUpperArm.position.y = -0.16;
          vsUpperArm.rotation.z = lx * 0.4;
          vsArmGroup.add(vsUpperArm);
          // Elbow joint
          const vsElbow = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), voidChitinMat);
          vsElbow.position.set(lx * 0.06, -0.34, 0);
          vsArmGroup.add(vsElbow);
          // Forearm
          const vsForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.3, 12), voidMat);
          vsForearm.position.set(lx * 0.1, -0.52, 0.02);
          vsForearm.rotation.z = lx * 0.6;
          vsArmGroup.add(vsForearm);
          // Wrist
          const vsWrist = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), voidChitinMat);
          vsWrist.position.set(lx * 0.16, -0.7, 0.04);
          vsArmGroup.add(vsWrist);
          // Claw fingers - 3 per hand
          for (let cf = 0; cf < 3; cf++) {
            const cfSpread = (cf - 1) * 0.04;
            const vsFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.1, 8), voidMat);
            vsFinger.position.set(lx * 0.19 + cfSpread, -0.78, 0.04);
            vsArmGroup.add(vsFinger);
            const vsClawTip = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.06, 12), voidChitinMat);
            vsClawTip.position.set(lx * 0.21 + cfSpread, -0.865, 0.04);
            vsClawTip.rotation.z = lx * 0.2;
            vsArmGroup.add(vsClawTip);
          }
          group.add(vsArmGroup);
        }

        // Tail-like appendage with segments
        const vsTailGroup = new THREE.Group();
        vsTailGroup.name = 'anim_tail';
        vsTailGroup.position.set(0, 0.58, -0.34);
        const vsTailData = [
          { r: 0.04, h: 0.18, y: 0, rx: -0.4 },
          { r: 0.033, h: 0.16, y: -0.13, rx: -0.7 },
          { r: 0.025, h: 0.14, y: -0.24, rx: -1.0 },
          { r: 0.018, h: 0.11, y: -0.33, rx: -1.3 },
        ];
        for (const td of vsTailData) {
          const vsTailSeg = new THREE.Mesh(new THREE.CylinderGeometry(td.r * 0.75, td.r, td.h, 10), voidDarkMat);
          vsTailSeg.position.y = td.y;
          vsTailSeg.rotation.x = td.rx;
          vsTailGroup.add(vsTailSeg);
          // Segment joint glow
          const vsTailJoint = new THREE.Mesh(new THREE.SphereGeometry(td.r * 0.9, 16, 12), voidEnergyMat);
          vsTailJoint.position.y = td.y - td.h / 2;
          vsTailGroup.add(vsTailJoint);
        }
        group.add(vsTailGroup);
        break;
      }
      // --- SHADOW_WEAVER | Estimated polygons: ~55000 triangles ---
      case EnemyType.SHADOW_WEAVER: {
        const swShadowMat = new THREE.MeshStandardMaterial({ color: 0x1a0033, emissive: 0x0a0015, emissiveIntensity: 0.2, roughness: 0.7 });
        const swRobeMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.8 });
        const swPurpleMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5 });
        const swEyeMat = new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0xaa22ff, emissiveIntensity: 2.0 });
        const swAuraMat = new THREE.MeshStandardMaterial({ color: 0x330066, emissive: 0x220044, emissiveIntensity: 0.4, transparent: true, opacity: 0.18 });
        const swRuneMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844ee, emissiveIntensity: 1.8, transparent: true, opacity: 0.7 });
        const swBoneMat = new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.9 });
        const swHover = new THREE.Group();
        swHover.name = 'anim_hover';
        // Dark aura surrounding entire figure
        const swDarkAura = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 24), swAuraMat);
        swDarkAura.position.y = 0.85;
        swHover.add(swDarkAura);
        // Inner robe - narrower cone
        const swInnerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 24), swRobeMat);
        swInnerRobe.position.y = 0.58;
        swInnerRobe.castShadow = true;
        swHover.add(swInnerRobe);
        // Outer robe - wider, slightly taller cone
        const swOuterRobe = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 24), swShadowMat);
        swOuterRobe.position.y = 0.55;
        swHover.add(swOuterRobe);
        // Tattered robe edge strips at various angles
        const swTatterAngles = [0, 0.63, 1.26, 1.88, 2.51, 3.14, 3.77, 4.40, 5.03, 5.66];
        for (let ti = 0; ti < 10; ti++) {
          const swTatter = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.025), swShadowMat);
          const tAng = swTatterAngles[ti];
          swTatter.position.set(Math.cos(tAng) * 0.3, 0.1, Math.sin(tAng) * 0.3);
          swTatter.rotation.y = tAng;
          swTatter.rotation.z = (Math.sin(tAng * 2) * 0.3);
          swHover.add(swTatter);
        }
        // Shoulder bumps through robe
        for (const sx of [-0.22, 0.22]) {
          const swShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), swShadowMat);
          swShoulder.position.set(sx, 1.0, 0.0);
          swHover.add(swShoulder);
        }
        // Hood (head sphere)
        const swHood = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), swShadowMat);
        swHood.position.y = 1.15;
        swHover.add(swHood);
        // Skull face - recessed eye sockets
        for (const ex of [-0.07, 0.07]) {
          const swSocket = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), swBoneMat);
          swSocket.position.set(ex, 1.15, 0.16);
          swHover.add(swSocket);
          // Glowing purple eye deep in socket
          const swEye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), swEyeMat);
          swEye.position.set(ex, 1.15, 0.17);
          swHover.add(swEye);
        }
        // Faint cheekbone ridges
        for (const cx of [-0.09, 0.09]) {
          const swCheek = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.025), swBoneMat);
          swCheek.position.set(cx, 1.1, 0.17);
          swCheek.rotation.z = cx < 0 ? 0.3 : -0.3;
          swHover.add(swCheek);
        }
        // Wisps of shadow energy trailing upward from hood
        const swWispPositions = [[-0.06, 0.0], [0.0, 0.05], [0.06, -0.03], [-0.03, -0.05], [0.04, 0.04]];
        for (let wi = 0; wi < 5; wi++) {
          const swWisp = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.14, 8), swAuraMat);
          swWisp.position.set(swWispPositions[wi][0], 1.38 + wi * 0.04, swWispPositions[wi][1]);
          swHover.add(swWisp);
        }
        // Left arm group
        const swLA = new THREE.Group();
        swLA.name = 'anim_la';
        swLA.position.set(-0.26, 1.02, 0);
        const swLUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 12), swShadowMat);
        swLUpperArm.position.set(0, -0.11, 0);
        swLUpperArm.rotation.z = 0.45;
        swLA.add(swLUpperArm);
        const swLForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.2, 12), swBoneMat);
        swLForearm.position.set(-0.12, -0.26, 0.06);
        swLForearm.rotation.z = 0.6;
        swLA.add(swLForearm);
        // Left skeletal hand - 4 finger bones
        const swLHandBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), swBoneMat);
        swLHandBase.position.set(-0.22, -0.35, 0.08);
        swLA.add(swLHandBase);
        for (let fi = 0; fi < 4; fi++) {
          const swFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.01, 0.06, 8), swBoneMat);
          swFinger.position.set(-0.23 + fi * 0.015, -0.40, 0.09);
          swFinger.rotation.z = 0.1 * (fi - 1.5);
          swLA.add(swFinger);
        }
        // Left shadow orb
        const swLOrb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), swPurpleMat);
        swLOrb.position.set(-0.27, -0.44, 0.1);
        swLA.add(swLOrb);
        const swLOrbAura = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), swAuraMat);
        swLOrbAura.position.set(-0.27, -0.44, 0.1);
        swLA.add(swLOrbAura);
        swHover.add(swLA);
        // Right arm group
        const swRA = new THREE.Group();
        swRA.name = 'anim_ra';
        swRA.position.set(0.26, 1.02, 0);
        const swRUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 12), swShadowMat);
        swRUpperArm.position.set(0, -0.11, 0);
        swRUpperArm.rotation.z = -0.45;
        swRA.add(swRUpperArm);
        const swRForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.2, 12), swBoneMat);
        swRForearm.position.set(0.12, -0.26, 0.06);
        swRForearm.rotation.z = -0.6;
        swRA.add(swRForearm);
        const swRHandBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), swBoneMat);
        swRHandBase.position.set(0.22, -0.35, 0.08);
        swRA.add(swRHandBase);
        for (let fi = 0; fi < 4; fi++) {
          const swFinger2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.01, 0.06, 8), swBoneMat);
          swFinger2.position.set(0.23 - fi * 0.015, -0.40, 0.09);
          swFinger2.rotation.z = -0.1 * (fi - 1.5);
          swRA.add(swFinger2);
        }
        // Right shadow orb
        const swROrb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), swPurpleMat);
        swROrb.position.set(0.27, -0.44, 0.1);
        swRA.add(swROrb);
        const swROrbAura = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), swAuraMat);
        swROrbAura.position.set(0.27, -0.44, 0.1);
        swRA.add(swROrbAura);
        swHover.add(swRA);
        // Shadow tendrils - 12, multi-segment with decreasing radius
        const swTendrilBaseAngles = [0, 0.52, 1.05, 1.57, 2.09, 2.62, 3.14, 3.67, 4.19, 4.71, 5.24, 5.76];
        for (let t = 0; t < 12; t++) {
          const tAng = swTendrilBaseAngles[t];
          const tR = 0.28 + (t % 3) * 0.04;
          // Segment 1 (base)
          const swT1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.32, 12), swShadowMat);
          swT1.position.set(Math.cos(tAng) * tR, 0.16, Math.sin(tAng) * tR);
          swT1.rotation.set(Math.cos(tAng) * 0.6, tAng, Math.sin(tAng) * 0.3);
          swHover.add(swT1);
          // Segment 2 (mid)
          const swT2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.013, 0.26, 8), swShadowMat);
          swT2.position.set(Math.cos(tAng) * (tR + 0.12), -0.04, Math.sin(tAng) * (tR + 0.12));
          swT2.rotation.set(Math.cos(tAng) * 0.9, tAng, Math.sin(tAng) * 0.5);
          swHover.add(swT2);
          // Segment 3 (tip)
          const swT3 = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.008, 0.18, 8), swShadowMat);
          swT3.position.set(Math.cos(tAng) * (tR + 0.22), -0.18, Math.sin(tAng) * (tR + 0.22));
          swT3.rotation.set(Math.cos(tAng) * 1.2, tAng, Math.sin(tAng) * 0.7);
          swHover.add(swT3);
        }
        // Floating rune symbols - small torus rings at various angles
        const swRuneData = [
          { y: 0.7, rx: 0.4, rz: 0.2, r: 0.14 },
          { y: 1.0, rx: -0.3, rz: 0.6, r: 0.11 },
          { y: 1.3, rx: 0.7, rz: -0.4, r: 0.10 },
          { y: 0.5, rx: -0.6, rz: 0.3, r: 0.12 },
          { y: 0.85, rx: 0.2, rz: -0.8, r: 0.09 },
        ];
        for (const rd of swRuneData) {
          const swRune = new THREE.Mesh(new THREE.TorusGeometry(rd.r, 0.008, 8, 24), swRuneMat);
          swRune.position.set(0.42, rd.y, 0.0);
          swRune.rotation.set(rd.rx, 0, rd.rz);
          swHover.add(swRune);
        }
        group.add(swHover);
        break;
      }
      // --- ABYSSAL_HORROR | Estimated polygons: ~60000 triangles ---
      case EnemyType.ABYSSAL_HORROR: {
        const ahBodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, emissive: 0x0a0015, emissiveIntensity: 0.2, roughness: 0.6, transparent: true, opacity: 0.92 });
        const ahCoreMat = new THREE.MeshStandardMaterial({ color: 0x9933ff, emissive: 0x7711cc, emissiveIntensity: 1.8 });
        const ahEyeMat = new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0xaa22dd, emissiveIntensity: 2.0 });
        const ahPupilMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.9 });
        const ahTentMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3e, roughness: 0.7 });
        const ahToothMat = new THREE.MeshStandardMaterial({ color: 0xddccee, roughness: 0.5 });
        const ahVoidMat = new THREE.MeshStandardMaterial({ color: 0x440077, emissive: 0x330055, emissiveIntensity: 1.2, transparent: true, opacity: 0.5 });
        const ahOozeMat = new THREE.MeshStandardMaterial({ color: 0x3a1a5e, emissive: 0x220033, emissiveIntensity: 0.8 });
        const ahHover = new THREE.Group();
        ahHover.name = 'anim_hover';
        // Main body sphere - lumpy organic mass
        const ahBody = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), ahBodyMat);
        ahBody.position.y = 0.8;
        ahBody.scale.set(1.2, 0.85, 1.0);
        ahBody.castShadow = true;
        ahHover.add(ahBody);
        // Overlapping lumps for organic feel
        const ahLumpData = [
          { x: 0.3, y: 0.95, z: 0.2, r: 0.22 },
          { x: -0.28, y: 1.0, z: 0.15, r: 0.19 },
          { x: 0.1, y: 1.1, z: -0.25, r: 0.21 },
          { x: -0.2, y: 0.65, z: -0.2, r: 0.18 },
          { x: 0.25, y: 0.6, z: 0.28, r: 0.16 },
        ];
        for (const ld of ahLumpData) {
          const ahLump = new THREE.Mesh(new THREE.SphereGeometry(ld.r, 16, 12), ahBodyMat);
          ahLump.position.set(ld.x, ld.y, ld.z);
          ahHover.add(ahLump);
        }
        // Pulsating emissive core (slightly transparent outer was set above)
        const ahCore = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), ahCoreMat);
        ahCore.position.y = 0.8;
        ahHover.add(ahCore);
        // 9 eyes with eyeball, pupil, eyelid at specific body positions
        const ahEyePositions = [
          { x: 0.35, y: 0.9, z: 0.38 },
          { x: -0.3, y: 0.95, z: 0.42 },
          { x: 0.05, y: 1.1, z: 0.5 },
          { x: 0.42, y: 0.65, z: 0.25 },
          { x: -0.4, y: 0.7, z: 0.3 },
          { x: 0.18, y: 0.55, z: 0.44 },
          { x: -0.15, y: 0.85, z: 0.46 },
          { x: 0.28, y: 1.02, z: 0.36 },
          { x: -0.22, y: 0.62, z: 0.4 },
        ];
        for (const ep of ahEyePositions) {
          const ahEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), ahEyeMat);
          ahEyeball.position.set(ep.x, ep.y, ep.z);
          ahHover.add(ahEyeball);
          const ahPupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), ahPupilMat);
          ahPupil.position.set(ep.x * 1.02, ep.y * 1.01, ep.z * 1.02);
          ahHover.add(ahPupil);
          const ahEyelid = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8), ahBodyMat);
          ahEyelid.position.set(ep.x, ep.y + 0.025, ep.z);
          ahEyelid.scale.y = 0.35;
          ahHover.add(ahEyelid);
        }
        // Gaping maw on underside - ring of 10 teeth, inner cavity, tongue
        for (let mi = 0; mi < 10; mi++) {
          const mAng = (mi / 10) * Math.PI * 2;
          const ahTooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 8), ahToothMat);
          ahTooth.position.set(Math.cos(mAng) * 0.2, 0.38, Math.sin(mAng) * 0.2);
          ahTooth.rotation.set(Math.cos(mAng) * 0.7 + Math.PI, 0, Math.sin(mAng) * 0.7);
          ahHover.add(ahTooth);
        }
        const ahMawCavity = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), ahPupilMat);
        ahMawCavity.position.set(0, 0.35, 0);
        ahHover.add(ahMawCavity);
        const ahTongueMat = new THREE.MeshStandardMaterial({ color: 0xcc3355, roughness: 0.7 });
        const ahTongue = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.14, 12), ahTongueMat);
        ahTongue.position.set(0, 0.3, 0.1);
        ahTongue.rotation.x = 0.4;
        ahHover.add(ahTongue);
        // Bony ridges/spines on top - 6 cones
        for (let si = 0; si < 6; si++) {
          const sAng = (si / 6) * Math.PI * 2;
          const sR = 0.18 + (si % 2) * 0.08;
          const ahSpine = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.22 + (si % 3) * 0.06, 8), ahToothMat);
          ahSpine.position.set(Math.cos(sAng) * sR, 1.18, Math.sin(sAng) * sR);
          ahHover.add(ahSpine);
        }
        // 10 enhanced tentacles - 3-4 segments with decreasing radius + suction cups
        for (let t = 0; t < 10; t++) {
          const angle = (t / 10) * Math.PI * 2;
          const tR = 0.38 + (t % 3) * 0.06;
          // Seg1 base
          const ahT1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.32, 12), ahTentMat);
          ahT1.position.set(Math.cos(angle) * tR, 0.5, Math.sin(angle) * tR);
          ahT1.rotation.set(Math.cos(angle) * 0.7, angle, Math.sin(angle) * 0.5);
          ahHover.add(ahT1);
          // Seg2
          const ahT2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.28, 10), ahTentMat);
          ahT2.position.set(Math.cos(angle) * (tR + 0.18), 0.22, Math.sin(angle) * (tR + 0.18));
          ahT2.rotation.set(Math.cos(angle) * 1.0, angle, Math.sin(angle) * 0.75);
          ahHover.add(ahT2);
          // Seg3
          const ahT3 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.023, 0.24, 10), ahTentMat);
          ahT3.position.set(Math.cos(angle) * (tR + 0.34), -0.08, Math.sin(angle) * (tR + 0.34));
          ahT3.rotation.set(Math.cos(angle) * 1.3, angle, Math.sin(angle) * 1.0);
          ahHover.add(ahT3);
          // Pointed tip cone
          const ahTTip = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.08, 8), ahTentMat);
          ahTTip.position.set(Math.cos(angle) * (tR + 0.47), -0.25, Math.sin(angle) * (tR + 0.47));
          ahTTip.rotation.set(Math.cos(angle) * 1.5, angle, Math.sin(angle) * 1.1);
          ahHover.add(ahTTip);
          // Suction cups (4 small tori along tentacle)
          for (let sc = 0; sc < 4; sc++) {
            const scT = 0.08 + sc * 0.1;
            const ahSuction = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 12, 12), ahTentMat);
            ahSuction.position.set(
              Math.cos(angle) * (tR + scT * 1.0),
              0.5 - sc * 0.15,
              Math.sin(angle) * (tR + scT * 1.0)
            );
            ahSuction.rotation.set(Math.cos(angle) * (0.5 + sc * 0.2), angle, Math.sin(angle) * 0.5);
            ahHover.add(ahSuction);
          }
        }
        // Oozing tendrils dripping down
        for (let oi = 0; oi < 6; oi++) {
          const oAng = (oi / 6) * Math.PI * 2;
          const ahOoze = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, 0.2, 8), ahOozeMat);
          ahOoze.position.set(Math.cos(oAng) * 0.22, 0.25, Math.sin(oAng) * 0.22);
          ahHover.add(ahOoze);
          const ahOozeTip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), ahCoreMat);
          ahOozeTip.position.set(Math.cos(oAng) * 0.22, 0.13, Math.sin(oAng) * 0.22);
          ahHover.add(ahOozeTip);
        }
        // Void membrane patches between tentacles - thin transparent planes
        for (let vm = 0; vm < 4; vm++) {
          const vmAng = (vm / 4) * Math.PI * 2 + 0.3;
          const ahMembrane = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.01), ahVoidMat);
          ahMembrane.position.set(Math.cos(vmAng) * 0.45, 0.45, Math.sin(vmAng) * 0.45);
          ahMembrane.rotation.y = vmAng;
          ahHover.add(ahMembrane);
        }
        // Dark energy crackling - 4 small octahedrons orbiting
        for (let oc = 0; oc < 4; oc++) {
          const ocAng = (oc / 4) * Math.PI * 2;
          const ahCrackle = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), ahCoreMat);
          ahCrackle.position.set(Math.cos(ocAng) * 0.7, 0.8, Math.sin(ocAng) * 0.7);
          ahHover.add(ahCrackle);
        }
        group.add(ahHover);
        break;
      }
      // --- RIFT_WALKER | Estimated polygons: ~55000 triangles ---
      case EnemyType.RIFT_WALKER: {
        const rwBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a1a4e, emissive: 0x110033, emissiveIntensity: 0.3, roughness: 0.5 });
        const rwRiftMat = new THREE.MeshStandardMaterial({ color: 0x4422aa, emissive: 0x2200cc, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.3 });
        const rwEyeMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x2299ff, emissiveIntensity: 2.2 });
        const rwCrackMat = new THREE.MeshStandardMaterial({ color: 0x66aaff, emissive: 0x3388ff, emissiveIntensity: 2.0 });
        const rwPhaseMat = new THREE.MeshStandardMaterial({ color: 0x7744ff, emissive: 0x5522cc, emissiveIntensity: 0.6, transparent: true, opacity: 0.28 });
        const rwBladeMat = new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x44aaff, emissiveIntensity: 1.5, metalness: 0.6 });
        const rwCrystalMat = new THREE.MeshStandardMaterial({ color: 0x5533bb, emissive: 0x331199, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.5 });
        const rwAuraMat = new THREE.MeshStandardMaterial({ color: 0x3311aa, emissive: 0x220088, emissiveIntensity: 0.8, transparent: true, opacity: 0.35 });
        // Main torso
        const rwTorso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.26), rwBodyMat);
        rwTorso.position.y = 0.82;
        rwTorso.castShadow = true;
        group.add(rwTorso);
        // Crystalline armor plates overlapping torso
        const rwPlateData = [
          { x: 0.0, y: 0.9, z: 0.14, rx: 0.2, ry: 0, rz: 0, w: 0.22, h: 0.18, d: 0.04 },
          { x: 0.0, y: 0.72, z: 0.14, rx: -0.15, ry: 0, rz: 0, w: 0.26, h: 0.14, d: 0.04 },
          { x: 0.14, y: 0.82, z: 0.1, rx: 0, ry: 0.4, rz: 0.15, w: 0.12, h: 0.28, d: 0.04 },
          { x: -0.14, y: 0.82, z: 0.1, rx: 0, ry: -0.4, rz: -0.15, w: 0.12, h: 0.28, d: 0.04 },
        ];
        for (const pd of rwPlateData) {
          const rwPlate = new THREE.Mesh(new THREE.BoxGeometry(pd.w, pd.h, pd.d), rwRiftMat);
          rwPlate.position.set(pd.x, pd.y, pd.z);
          rwPlate.rotation.set(pd.rx, pd.ry, pd.rz);
          group.add(rwPlate);
        }
        // Phase-shifted semi-transparent duplicate torso (slightly offset and larger)
        const rwPhaseTorso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.66, 0.29), rwPhaseMat);
        rwPhaseTorso.position.set(0.04, 0.84, -0.03);
        group.add(rwPhaseTorso);
        // Dimensional cracks on torso - emissive strips
        const rwCrackData = [
          { x: 0.0, y: 0.88, z: 0.14, rx: 0.1, rz: 0.3, w: 0.18, h: 0.02 },
          { x: 0.05, y: 0.76, z: 0.14, rx: -0.05, rz: -0.2, w: 0.14, h: 0.02 },
          { x: -0.06, y: 0.98, z: 0.14, rx: 0.0, rz: 0.5, w: 0.12, h: 0.015 },
        ];
        for (const cd of rwCrackData) {
          const rwCrack = new THREE.Mesh(new THREE.BoxGeometry(cd.w, cd.h, 0.005), rwCrackMat);
          rwCrack.position.set(cd.x, cd.y, cd.z);
          rwCrack.rotation.set(cd.rx, 0, cd.rz);
          group.add(rwCrack);
        }
        // Crystalline shoulder pads
        for (const sx of [-0.22, 0.22]) {
          const rwShould = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.16), rwCrystalMat);
          rwShould.position.set(sx, 1.08, 0);
          rwShould.rotation.z = sx < 0 ? 0.2 : -0.2;
          group.add(rwShould);
          // Shoulder crystal spike
          const rwShoulSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 8), rwCrackMat);
          rwShoulSpike.position.set(sx, 1.18, 0);
          group.add(rwShoulSpike);
        }
        // Head - icosahedron-based geometric/crystalline
        const rwHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.155, 1), rwBodyMat);
        rwHead.position.y = 1.26;
        group.add(rwHead);
        // Emissive crack strips on head
        for (let hc = 0; hc < 3; hc++) {
          const hcAng = (hc / 3) * Math.PI;
          const rwHCrack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.005), rwCrackMat);
          rwHCrack.position.set(Math.cos(hcAng) * 0.14, 1.26, Math.sin(hcAng) * 0.14);
          rwHCrack.rotation.y = hcAng;
          group.add(rwHCrack);
        }
        // Two bright emissive rift-blue eyes
        for (const ex of [-0.055, 0.055]) {
          const rwEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), rwEyeMat);
          rwEye.position.set(ex, 1.27, 0.14);
          group.add(rwEye);
        }
        // Rift energy aura torus ring around waist
        const rwWaistTorus = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 24), rwCrackMat);
        rwWaistTorus.position.y = 0.82;
        rwWaistTorus.rotation.x = Math.PI / 2;
        group.add(rwWaistTorus);
        // Rift energy particles - 8 octahedrons/tetrahedra floating around
        for (let rp = 0; rp < 8; rp++) {
          const rpAng = (rp / 8) * Math.PI * 2;
          const rpR = 0.38 + (rp % 2) * 0.06;
          const rwParticle = new THREE.Mesh(new THREE.OctahedronGeometry(0.038), rwCrackMat);
          rwParticle.position.set(Math.cos(rpAng) * rpR, 0.65 + (rp % 3) * 0.22, Math.sin(rpAng) * rpR);
          group.add(rwParticle);
        }
        // Phase trail - 4 progressively transparent box copies behind
        for (let pt = 0; pt < 4; pt++) {
          const ptOpacity = 0.18 - pt * 0.04;
          const rwTrailMat = new THREE.MeshStandardMaterial({ color: 0x5533cc, emissive: 0x3311aa, emissiveIntensity: 0.5, transparent: true, opacity: ptOpacity });
          const rwTrail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.58, 0.04), rwTrailMat);
          rwTrail.position.set(0, 0.82, -0.15 - pt * 0.08);
          group.add(rwTrail);
        }
        // Left arm group
        const rwLA = new THREE.Group();
        rwLA.name = 'anim_la';
        rwLA.position.set(-0.22, 1.0, 0);
        const rwLUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.24, 12), rwBodyMat);
        rwLUpperArm.position.set(0, -0.12, 0);
        rwLUpperArm.rotation.z = 0.35;
        rwLA.add(rwLUpperArm);
        const rwLForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.040, 0.22, 12), rwRiftMat);
        rwLForearm.position.set(-0.1, -0.3, 0);
        rwLForearm.rotation.z = 0.5;
        rwLA.add(rwLForearm);
        // Left hand (holds rift portal - small torus)
        const rwLHandBox = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.04), rwBodyMat);
        rwLHandBox.position.set(-0.18, -0.44, 0);
        rwLA.add(rwLHandBox);
        for (let lf = 0; lf < 4; lf++) {
          const rwLFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.010, 0.055, 8), rwBodyMat);
          rwLFinger.position.set(-0.19 + lf * 0.014, -0.49, 0);
          rwLA.add(rwLFinger);
        }
        // Rift portal in left hand
        const rwPortal = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), rwCrackMat);
        rwPortal.position.set(-0.22, -0.54, 0);
        rwLA.add(rwPortal);
        const rwPortalFill = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), rwAuraMat);
        rwPortalFill.position.set(-0.22, -0.54, 0);
        rwLA.add(rwPortalFill);
        group.add(rwLA);
        // Right arm group
        const rwRA = new THREE.Group();
        rwRA.name = 'anim_ra';
        rwRA.position.set(0.22, 1.0, 0);
        const rwRUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.24, 12), rwBodyMat);
        rwRUpperArm.position.set(0, -0.12, 0);
        rwRUpperArm.rotation.z = -0.35;
        rwRA.add(rwRUpperArm);
        const rwRForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.040, 0.22, 12), rwRiftMat);
        rwRForearm.position.set(0.1, -0.3, 0);
        rwRForearm.rotation.z = -0.5;
        rwRA.add(rwRForearm);
        // Right hand (holds rift blade)
        const rwRHandBox = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.04), rwBodyMat);
        rwRHandBox.position.set(0.18, -0.44, 0);
        rwRA.add(rwRHandBox);
        for (let rf = 0; rf < 4; rf++) {
          const rwRFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.010, 0.055, 8), rwBodyMat);
          rwRFinger.position.set(0.19 - rf * 0.014, -0.49, 0);
          rwRA.add(rwRFinger);
        }
        // Rift blade - flat box with emissive edges
        const rwBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.008), rwBladeMat);
        rwBlade.position.set(0.22, -0.64, 0.0);
        rwRA.add(rwBlade);
        const rwBladeEdgeL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.26, 0.005), rwCrackMat);
        rwBladeEdgeL.position.set(0.20, -0.64, 0.0);
        rwRA.add(rwBladeEdgeL);
        const rwBladeEdgeR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.26, 0.005), rwCrackMat);
        rwBladeEdgeR.position.set(0.24, -0.64, 0.0);
        rwRA.add(rwBladeEdgeR);
        group.add(rwRA);
        // Legs
        for (const lx of [-0.1, 0.1]) {
          const rwLegGroup = new THREE.Group();
          rwLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          rwLegGroup.position.set(lx, 0.52, 0);
          // Thigh
          const rwThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.28, 12), rwBodyMat);
          rwThigh.position.y = -0.14;
          rwLegGroup.add(rwThigh);
          // Knee guard
          const rwKnee = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 8), rwCrystalMat);
          rwKnee.position.y = -0.3;
          rwLegGroup.add(rwKnee);
          // Shin
          const rwShin = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.26, 12), rwBodyMat);
          rwShin.position.y = -0.46;
          rwLegGroup.add(rwShin);
          // Angular boot
          const rwBoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.14), rwCrystalMat);
          rwBoot.position.set(0, -0.62, 0.03);
          rwLegGroup.add(rwBoot);
          // Boot crystal trim
          const rwBootTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.15), rwCrackMat);
          rwBootTrim.position.set(0, -0.58, 0.03);
          rwLegGroup.add(rwBootTrim);
          group.add(rwLegGroup);
        }
        break;
      }
      // --- ENTROPY_LORD | Estimated polygons: ~65000 triangles ---
      case EnemyType.ENTROPY_LORD: {
        // Boss - 1.5x scale applied via positioning and sizes
        const elLordMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3e, emissive: 0x0a0020, emissiveIntensity: 0.3, roughness: 0.5 });
        const elVoidMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.0 });
        const elCrownMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 1.8 });
        const elArmorMat = new THREE.MeshStandardMaterial({ color: 0x2a1a5e, emissive: 0x110033, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.4 });
        const elCrackMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822ee, emissiveIntensity: 2.0 });

        const elEyeMat = new THREE.MeshStandardMaterial({ color: 0xdd44ff, emissive: 0xcc22ee, emissiveIntensity: 2.5 });
        const elGemMat = new THREE.MeshStandardMaterial({ color: 0x9955ff, emissive: 0x7733dd, emissiveIntensity: 1.6 });
        const elShieldMat = new THREE.MeshStandardMaterial({ color: 0x4422aa, emissive: 0x2200cc, emissiveIntensity: 1.0, transparent: true, opacity: 0.75 });
        const elBeltMat = new THREE.MeshStandardMaterial({ color: 0x3a1a5e, emissive: 0x220044, emissiveIntensity: 0.5, metalness: 0.5 });
        // Main torso (1.5x scale)
        const elTorso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.75), elLordMat);
        elTorso.position.y = 1.75;
        elTorso.castShadow = true;
        group.add(elTorso);
        // Outer void armor plates with gaps showing emissive void beneath
        const elArmorPlates = [
          { x: 0.0, y: 2.1, z: 0.39, rx: 0.15, ry: 0, rz: 0, w: 0.9, h: 0.38, d: 0.06 },
          { x: 0.0, y: 1.72, z: 0.39, rx: 0, ry: 0, rz: 0, w: 1.0, h: 0.32, d: 0.06 },
          { x: 0.0, y: 1.38, z: 0.39, rx: -0.1, ry: 0, rz: 0, w: 0.88, h: 0.3, d: 0.06 },
          { x: 0.42, y: 1.75, z: 0.3, rx: 0, ry: 0.35, rz: 0.1, w: 0.18, h: 0.78, d: 0.06 },
          { x: -0.42, y: 1.75, z: 0.3, rx: 0, ry: -0.35, rz: -0.1, w: 0.18, h: 0.78, d: 0.06 },
        ];
        for (const ap of elArmorPlates) {
          const elAP = new THREE.Mesh(new THREE.BoxGeometry(ap.w, ap.h, ap.d), elArmorMat);
          elAP.position.set(ap.x, ap.y, ap.z);
          elAP.rotation.set(ap.rx, ap.ry, ap.rz);
          group.add(elAP);
        }
        // Void energy cracks on torso
        const elTorsoCracks = [
          { x: 0.0, y: 2.0, z: 0.4, rz: 0.3, w: 0.55 },
          { x: 0.1, y: 1.7, z: 0.4, rz: -0.2, w: 0.44 },
          { x: -0.08, y: 1.44, z: 0.4, rz: 0.4, w: 0.38 },
        ];
        for (const tc of elTorsoCracks) {
          const elCrack = new THREE.Mesh(new THREE.BoxGeometry(tc.w, 0.022, 0.006), elCrackMat);
          elCrack.position.set(tc.x, tc.y, tc.z);
          elCrack.rotation.z = tc.rz;
          group.add(elCrack);
        }
        // Chest emblem - large octahedron embedded in chest
        const elChestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), elGemMat);
        elChestGem.position.set(0, 1.88, 0.44);
        group.add(elChestGem);
        // Gorget/neck armor
        const elGorget = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.16, 16), elArmorMat);
        elGorget.position.y = 2.45;
        group.add(elGorget);
        const elGorgetRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 8, 20), elCrackMat);
        elGorgetRim.position.y = 2.53;
        elGorgetRim.rotation.x = Math.PI / 2;
        group.add(elGorgetRim);
        // Head with void-cracked face
        const elHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 24), elLordMat);
        elHead.position.y = 2.92;
        group.add(elHead);
        // Face cracks - emissive strips
        const elFaceCracks = [
          { x: 0.0, y: 2.92, z: 0.36, rz: 0.1, w: 0.28 },
          { x: 0.1, y: 2.82, z: 0.35, rz: -0.3, w: 0.18 },
          { x: -0.09, y: 3.04, z: 0.35, rz: 0.4, w: 0.16 },
        ];
        for (const fc of elFaceCracks) {
          const elFC = new THREE.Mesh(new THREE.BoxGeometry(fc.w, 0.016, 0.006), elCrackMat);
          elFC.position.set(fc.x, fc.y, fc.z);
          elFC.rotation.z = fc.rz;
          group.add(elFC);
        }
        // 4 eyes - 2 main + 2 smaller above
        const elEyeData = [
          { x: -0.12, y: 2.92, z: 0.34, r: 0.038 },
          { x: 0.12, y: 2.92, z: 0.34, r: 0.038 },
          { x: -0.08, y: 3.08, z: 0.33, r: 0.024 },
          { x: 0.08, y: 3.08, z: 0.33, r: 0.024 },
        ];
        for (const ed of elEyeData) {
          const elEye = new THREE.Mesh(new THREE.SphereGeometry(ed.r, 16, 12), elEyeMat);
          elEye.position.set(ed.x, ed.y, ed.z);
          group.add(elEye);
        }
        // Crown - band torus + 8 spikes of varying heights
        const elCrownBand = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.036, 10, 28), elCrownMat);
        elCrownBand.position.y = 3.26;
        elCrownBand.rotation.x = Math.PI / 2;
        group.add(elCrownBand);
        const elCrownSpikeHeights = [0.5, 0.32, 0.44, 0.28, 0.5, 0.32, 0.44, 0.28];
        for (let c = 0; c < 8; c++) {
          const cAng = (c / 8) * Math.PI * 2;
          const elSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, elCrownSpikeHeights[c], 10), elCrownMat);
          elSpike.position.set(Math.cos(cAng) * 0.28, 3.26 + elCrownSpikeHeights[c] / 2, Math.sin(cAng) * 0.28);
          group.add(elSpike);
        }
        // Belt with void gems
        const elBelt = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 10, 24), elBeltMat);
        elBelt.position.y = 1.08;
        elBelt.rotation.x = Math.PI / 2;
        group.add(elBelt);
        for (let bg = 0; bg < 6; bg++) {
          const bgAng = (bg / 6) * Math.PI * 2;
          const elBeltGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), elGemMat);
          elBeltGem.position.set(Math.cos(bgAng) * 0.44, 1.08, Math.sin(bgAng) * 0.44);
          group.add(elBeltGem);
        }
        // Flowing void cape - 5 layered semi-transparent planes
        for (let cp = 0; cp < 5; cp++) {
          const cpOpacity = 0.62 - cp * 0.1;
          const cpMat = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.3, transparent: true, opacity: cpOpacity });
          const elCape = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.01), cpMat);
          elCape.position.set(0, 1.5, -0.42 - cp * 0.1);
          group.add(elCape);
        }
        // Left arm group (holds void shield)
        const elLA = new THREE.Group();
        elLA.name = 'anim_la';
        elLA.position.set(-0.72, 2.1, 0);
        // Pauldron
        const elLPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.22), elArmorMat);
        elLPauldron.position.set(0, 0.1, 0);
        elLA.add(elLPauldron);
        const elLPauldronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 10), elCrownMat);
        elLPauldronSpike.position.set(0, 0.28, 0);
        elLA.add(elLPauldronSpike);
        // Upper arm
        const elLUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.38, 16), elLordMat);
        elLUpperArm.position.set(0, -0.2, 0);
        elLUpperArm.rotation.z = 0.4;
        elLA.add(elLUpperArm);
        // Forearm with bracer
        const elLForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.34, 16), elLordMat);
        elLForearm.position.set(-0.18, -0.44, 0);
        elLForearm.rotation.z = 0.55;
        elLA.add(elLForearm);
        const elLBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.072, 0.1, 12), elArmorMat);
        elLBracer.position.set(-0.22, -0.5, 0);
        elLBracer.rotation.z = 0.55;
        elLA.add(elLBracer);
        // Gauntlet hand
        const elLGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.07), elArmorMat);
        elLGauntlet.position.set(-0.32, -0.64, 0);
        elLA.add(elLGauntlet);
        for (let lf = 0; lf < 4; lf++) {
          const elLFing = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.08, 8), elArmorMat);
          elLFing.position.set(-0.30 + lf * 0.022, -0.72, 0.01);
          elLA.add(elLFing);
        }
        // Void shield in left hand - disc with concentric rings
        const elShieldDisc = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), elShieldMat);
        elShieldDisc.position.set(-0.44, -0.78, 0.05);
        elShieldDisc.rotation.y = 0.3;
        elLA.add(elShieldDisc);
        for (let sr = 0; sr < 3; sr++) {
          const elShieldRing = new THREE.Mesh(new THREE.TorusGeometry(0.07 + sr * 0.07, 0.012, 8, 20), elCrackMat);
          elShieldRing.position.set(-0.44, -0.78, 0.06);
          elShieldRing.rotation.y = 0.3;
          elLA.add(elShieldRing);
        }
        group.add(elLA);
        // Right arm group (holds void scepter)
        const elRA = new THREE.Group();
        elRA.name = 'anim_ra';
        elRA.position.set(0.72, 2.1, 0);
        // Pauldron
        const elRPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.22), elArmorMat);
        elRPauldron.position.set(0, 0.1, 0);
        elRA.add(elRPauldron);
        const elRPauldronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 10), elCrownMat);
        elRPauldronSpike.position.set(0, 0.28, 0);
        elRA.add(elRPauldronSpike);
        // Upper arm
        const elRUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.38, 16), elLordMat);
        elRUpperArm.position.set(0, -0.2, 0);
        elRUpperArm.rotation.z = -0.4;
        elRA.add(elRUpperArm);
        // Forearm with bracer
        const elRForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.34, 16), elLordMat);
        elRForearm.position.set(0.18, -0.44, 0);
        elRForearm.rotation.z = -0.55;
        elRA.add(elRForearm);
        const elRBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.072, 0.1, 12), elArmorMat);
        elRBracer.position.set(0.22, -0.5, 0);
        elRBracer.rotation.z = -0.55;
        elRA.add(elRBracer);
        // Gauntlet hand
        const elRGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.07), elArmorMat);
        elRGauntlet.position.set(0.32, -0.64, 0);
        elRA.add(elRGauntlet);
        for (let rf = 0; rf < 4; rf++) {
          const elRFing = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.08, 8), elArmorMat);
          elRFing.position.set(0.30 - rf * 0.022, -0.72, 0.01);
          elRA.add(elRFing);
        }
        // Void scepter in right hand
        const elScepterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.64, 12), elArmorMat);
        elScepterShaft.position.set(0.44, -0.96, 0);
        elRA.add(elScepterShaft);
        // Scepter head - octahedron gem + torus rings
        const elScepterGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085), elGemMat);
        elScepterGem.position.set(0.44, -1.32, 0);
        elRA.add(elScepterGem);
        for (let st = 0; st < 2; st++) {
          const elScepterRing = new THREE.Mesh(new THREE.TorusGeometry(0.065 + st * 0.035, 0.014, 8, 16), elCrownMat);
          elScepterRing.position.set(0.44, -1.18 - st * 0.08, 0);
          elScepterRing.rotation.x = Math.PI / 2;
          elRA.add(elScepterRing);
        }
        group.add(elRA);
        // Legs (1.5x scale)
        for (const lx of [-0.3, 0.3]) {
          const elLegGroup = new THREE.Group();
          elLegGroup.name = lx < 0 ? 'anim_ll' : 'anim_rl';
          elLegGroup.position.set(lx, 1.0, 0);
          // Thigh with armor plate
          const elThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.44, 16), elLordMat);
          elThigh.position.y = -0.22;
          elLegGroup.add(elThigh);
          const elThighPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.09), elArmorMat);
          elThighPlate.position.set(0, -0.22, 0.1);
          elLegGroup.add(elThighPlate);
          // Knee guard
          const elKnee = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), elArmorMat);
          elKnee.position.y = -0.48;
          elLegGroup.add(elKnee);
          // Greave
          const elGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.4, 16), elLordMat);
          elGreave.position.y = -0.72;
          elLegGroup.add(elGreave);
          const elGreavePlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.08), elArmorMat);
          elGreavePlate.position.set(0, -0.72, 0.1);
          elLegGroup.add(elGreavePlate);
          // Massive armored boot
          const elBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.28), elArmorMat);
          elBoot.position.set(0, -1.0, 0.06);
          elLegGroup.add(elBoot);
          const elBootTrim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.026, 0.3), elCrackMat);
          elBootTrim.position.set(0, -0.93, 0.06);
          elLegGroup.add(elBootTrim);
          group.add(elLegGroup);
        }
        // Void energy swirling around feet - flat torus rings at ground level
        for (let vt = 0; vt < 4; vt++) {
          const vtR = 0.35 + vt * 0.18;
          const elVoidTorus = new THREE.Mesh(new THREE.TorusGeometry(vtR, 0.018, 8, 24), elVoidMat);
          elVoidTorus.position.y = 0.06 + vt * 0.04;
          elVoidTorus.rotation.x = Math.PI / 2;
          group.add(elVoidTorus);
        }
        // Floating void fragments - 10 small dodecahedrons orbiting
        for (let vf = 0; vf < 10; vf++) {
          const vfAng = (vf / 10) * Math.PI * 2;
          const vfR = 0.82 + (vf % 3) * 0.14;
          const elFrag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), elGemMat);
          elFrag.position.set(Math.cos(vfAng) * vfR, 1.0 + (vf % 4) * 0.45, Math.sin(vfAng) * vfR);
          group.add(elFrag);
        }
        break;
      }
      default: return false;
    }
    return true;
}
