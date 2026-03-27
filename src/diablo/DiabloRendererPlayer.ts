import * as THREE from 'three';
import { DiabloClass } from './DiabloTypes';

export interface PlayerBuildContext {
  playerGroup: THREE.Group;
  scene: THREE.Scene;
  aimLine: THREE.Line | null;
}

export interface PlayerBuildResult {
  weaponMesh: THREE.Mesh | null;
  weaponArmGroup: THREE.Group | null;
  leftLegGroup: THREE.Group | null;
  rightLegGroup: THREE.Group | null;
  leftArmGroup: THREE.Group | null;
  aimLine: THREE.Line | null;
  playerLantern: THREE.PointLight | null;
}

export function buildPlayerMesh(ctx: PlayerBuildContext, cls: DiabloClass): PlayerBuildResult {
    const result: PlayerBuildResult = {
      weaponMesh: null,
      weaponArmGroup: null,
      leftLegGroup: null,
      rightLegGroup: null,
      leftArmGroup: null,
      aimLine: ctx.aimLine,
      playerLantern: null,
    };
    // --- PLAYER CHARACTER BASE | Estimated polygons: ~37884 triangles ---
    while (ctx.playerGroup.children.length > 0) {
      ctx.playerGroup.remove(ctx.playerGroup.children[0]);
    }
    result.weaponMesh = null;
    result.weaponArmGroup = null;
    result.leftLegGroup = null;
    result.rightLegGroup = null;
    result.leftArmGroup = null;
    if (result.aimLine) { ctx.scene.remove(result.aimLine); result.aimLine = null; }

    const skinColor = 0xdeb887;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const skinDarkMat = new THREE.MeshStandardMaterial({ color: 0xb8925a, roughness: 0.7 });
    const skinLightMat = new THREE.MeshStandardMaterial({ color: 0xeecca0, roughness: 0.65 });

    // Head (higher poly)
    const headGeo = new THREE.SphereGeometry(0.18, 24, 20);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.6;
    head.castShadow = true;
    ctx.playerGroup.add(head);

    // Jaw / lower face (gives more angular face shape)
    const jawGeo = new THREE.SphereGeometry(0.14, 20, 16);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.position.set(0, 1.52, 0.04);
    jaw.scale.set(1, 0.6, 0.9);
    ctx.playerGroup.add(jaw);

    // Cheekbones
    for (let side = -1; side <= 1; side += 2) {
      const cheekGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const cheek = new THREE.Mesh(cheekGeo, skinMat);
      cheek.position.set(side * 0.1, 1.56, 0.12);
      ctx.playerGroup.add(cheek);
    }

    // Nose (more detailed: bridge + tip)
    const noseBridgeGeo = new THREE.BoxGeometry(0.03, 0.06, 0.04);
    const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMat);
    noseBridge.position.set(0, 1.6, 0.16);
    ctx.playerGroup.add(noseBridge);
    const noseTipGeo = new THREE.SphereGeometry(0.025, 12, 10);
    const noseTip = new THREE.Mesh(noseTipGeo, skinMat);
    noseTip.position.set(0, 1.57, 0.18);
    ctx.playerGroup.add(noseTip);

    // Chin (rounded)
    const chinGeo = new THREE.SphereGeometry(0.04, 12, 10);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, 1.48, 0.13);
    ctx.playerGroup.add(chin);

    // Ears
    for (let side = -1; side <= 1; side += 2) {
      const earGeo = new THREE.SphereGeometry(0.03, 10, 8);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.17, 1.6, 0.0);
      ear.scale.set(0.5, 1, 0.8);
      ctx.playerGroup.add(ear);
    }

    // Eyebrows (thicker, more prominent)
    for (let side = -1; side <= 1; side += 2) {
      const browGeo = new THREE.BoxGeometry(0.07, 0.02, 0.025);
      const brow = new THREE.Mesh(browGeo, skinDarkMat);
      brow.position.set(side * 0.06, 1.655, 0.15);
      brow.rotation.z = side * -0.1;
      ctx.playerGroup.add(brow);
    }

    // Eyes (higher poly, with iris detail)
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x446688, roughness: 0.4 });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 16, 12);
      const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eye.position.set(side * 0.06, 1.62, 0.15);
      ctx.playerGroup.add(eye);

      // Iris
      const irisGeo = new THREE.SphereGeometry(0.025, 12, 10);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(side * 0.06, 1.62, 0.18);
      ctx.playerGroup.add(iris);

      // Pupil
      const pupilGeo = new THREE.SphereGeometry(0.015, 12, 10);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.06, 1.62, 0.19);
      ctx.playerGroup.add(pupil);

      // Eyelid (half-sphere cap above eye)
      const lidGeo = new THREE.SphereGeometry(0.045, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4);
      const lid = new THREE.Mesh(lidGeo, skinMat);
      lid.position.set(side * 0.06, 1.625, 0.15);
      lid.rotation.x = -0.15;
      ctx.playerGroup.add(lid);
    }

    // Lips (subtle)
    const lipGeo = new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI);
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xcc9977, roughness: 0.6 });
    const lips = new THREE.Mesh(lipGeo, lipMat);
    lips.position.set(0, 1.52, 0.155);
    lips.rotation.x = Math.PI * 0.1;
    ctx.playerGroup.add(lips);

    // Neck (cylinder connecting head to torso)
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.12, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.46;
    ctx.playerGroup.add(neck);

    // Neck tendons (subtle side detail)
    for (let side = -1; side <= 1; side += 2) {
      const tendonGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.1, 8);
      const tendon = new THREE.Mesh(tendonGeo, skinDarkMat);
      tendon.position.set(side * 0.05, 1.46, 0.02);
      tendon.rotation.z = side * 0.1;
      ctx.playerGroup.add(tendon);
    }

    // Hair (class-dependent style, but base layer for all)
    const hairColors: Record<DiabloClass, number> = {
      [DiabloClass.WARRIOR]: 0x443322,
      [DiabloClass.MAGE]: 0xaaaaaa,
      [DiabloClass.RANGER]: 0x553322,
      [DiabloClass.PALADIN]: 0xccaa66,
      [DiabloClass.NECROMANCER]: 0x111122,
      [DiabloClass.ASSASSIN]: 0x1a1a1a,
    };
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColors[cls] || 0x443322, roughness: 0.9 });
    // Top hair volume
    const hairTopGeo = new THREE.SphereGeometry(0.17, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, 1.66, -0.02);
    ctx.playerGroup.add(hairTop);
    // Back of hair
    const hairBackGeo = new THREE.SphereGeometry(0.15, 18, 14);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 1.58, -0.08);
    hairBack.scale.set(1, 1, 0.7);
    ctx.playerGroup.add(hairBack);
    // Side hair tufts
    for (let side = -1; side <= 1; side += 2) {
      const sideHairGeo = new THREE.SphereGeometry(0.06, 12, 10);
      const sideHair = new THREE.Mesh(sideHairGeo, hairMat);
      sideHair.position.set(side * 0.14, 1.58, -0.03);
      sideHair.scale.set(0.6, 1, 0.8);
      ctx.playerGroup.add(sideHair);
    }

    let torsoColor: number;
    let torsoMetalness: number;
    let torsoRoughness: number;

    switch (cls) {
      case DiabloClass.WARRIOR:
        torsoColor = 0x888899;
        torsoMetalness = 0.7;
        torsoRoughness = 0.3;
        break;
      case DiabloClass.MAGE:
        torsoColor = 0x2a1a4a;
        torsoMetalness = 0.0;
        torsoRoughness = 0.8;
        break;
      case DiabloClass.RANGER:
        torsoColor = 0x6b4226;
        torsoMetalness = 0.0;
        torsoRoughness = 0.8;
        break;
      case DiabloClass.PALADIN:
        torsoColor = 0xcccc88;  // Holy gold/white plate
        torsoMetalness = 0.8;
        torsoRoughness = 0.2;
        break;
      case DiabloClass.NECROMANCER:
        torsoColor = 0x1a1a2e;  // Dark midnight blue/black robes
        torsoMetalness = 0.0;
        torsoRoughness = 0.9;
        break;
      case DiabloClass.ASSASSIN:
        torsoColor = 0x2a2a2a;  // Dark charcoal leather
        torsoMetalness = 0.1;
        torsoRoughness = 0.7;
        break;
      default:
        torsoColor = 0x888899;
        torsoMetalness = 0.7;
        torsoRoughness = 0.3;
        break;
    }

    const torsoMat = new THREE.MeshStandardMaterial({
      color: torsoColor,
      metalness: torsoMetalness,
      roughness: torsoRoughness,
    });

    // Torso - tapered cylinder for more organic shape (wider at shoulders, narrower at waist)
    const torsoUpperGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.28, 16);
    const torsoUpper = new THREE.Mesh(torsoUpperGeo, torsoMat);
    torsoUpper.position.y = 1.32;
    torsoUpper.scale.set(1.15, 1, 0.85);
    torsoUpper.castShadow = true;
    ctx.playerGroup.add(torsoUpper);

    const torsoLowerGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.28, 16);
    const torsoLower = new THREE.Mesh(torsoLowerGeo, torsoMat);
    torsoLower.position.y = 1.06;
    torsoLower.scale.set(1.05, 1, 0.8);
    torsoLower.castShadow = true;
    ctx.playerGroup.add(torsoLower);

    // Pectoral / chest definition
    for (let side = -1; side <= 1; side += 2) {
      const pecGeo = new THREE.SphereGeometry(0.09, 14, 12);
      const pec = new THREE.Mesh(pecGeo, torsoMat);
      pec.position.set(side * 0.08, 1.34, 0.12);
      pec.scale.set(1, 0.7, 0.5);
      ctx.playerGroup.add(pec);
    }

    // Collarbone ridge
    const collarboneGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.36, 8);
    const collarbone = new THREE.Mesh(collarboneGeo, skinDarkMat);
    collarbone.position.set(0, 1.42, 0.1);
    collarbone.rotation.z = Math.PI / 2;
    ctx.playerGroup.add(collarbone);

    // Back muscles / scapula (visible from behind)
    for (let side = -1; side <= 1; side += 2) {
      // Scapula (shoulder blade)
      const scapulaGeo = new THREE.SphereGeometry(0.08, 14, 12);
      const scapula = new THREE.Mesh(scapulaGeo, torsoMat);
      scapula.position.set(side * 0.1, 1.3, -0.12);
      scapula.scale.set(0.8, 1.2, 0.4);
      ctx.playerGroup.add(scapula);

      // Trapezius muscle ridge
      const trapGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.15, 10);
      const trap = new THREE.Mesh(trapGeo, torsoMat);
      trap.position.set(side * 0.06, 1.42, -0.06);
      trap.rotation.z = side * 0.4;
      trap.rotation.x = 0.2;
      ctx.playerGroup.add(trap);

      // Deltoid (shoulder muscle cap)
      const deltoidGeo = new THREE.SphereGeometry(0.06, 12, 10);
      const deltoid = new THREE.Mesh(deltoidGeo, torsoMat);
      deltoid.position.set(side * 0.25, 1.38, 0);
      deltoid.scale.set(0.7, 1, 0.8);
      ctx.playerGroup.add(deltoid);
    }

    // Spine ridge
    for (let sp = 0; sp < 4; sp++) {
      const spineGeo = new THREE.SphereGeometry(0.012, 8, 6);
      const spine = new THREE.Mesh(spineGeo, torsoMat);
      spine.position.set(0, 1.35 - sp * 0.08, -0.14);
      ctx.playerGroup.add(spine);
    }

    // Abdominal definition (subtle)
    for (let row = 0; row < 3; row++) {
      for (let side = -1; side <= 1; side += 2) {
        const abGeo = new THREE.SphereGeometry(0.035, 10, 8);
        const ab = new THREE.Mesh(abGeo, torsoMat);
        ab.position.set(side * 0.04, 1.12 - row * 0.06, 0.13);
        ab.scale.set(1, 0.7, 0.4);
        ctx.playerGroup.add(ab);
      }
    }

    // Belt (rounded)
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
    const beltGeo = new THREE.TorusGeometry(0.2, 0.03, 10, 20);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.92;
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.1, 0.85, 1);
    ctx.playerGroup.add(belt);

    // Belt buckle (more detailed)
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
    const buckleGeo = new THREE.BoxGeometry(0.06, 0.06, 0.03);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.92, 0.18);
    ctx.playerGroup.add(buckle);
    // Buckle gem
    const buckleGemGeo = new THREE.SphereGeometry(0.015, 10, 8);
    const buckleGemMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0x441111, roughness: 0.2 });
    const buckleGem = new THREE.Mesh(buckleGemGeo, buckleGemMat);
    buckleGem.position.set(0, 0.92, 0.2);
    ctx.playerGroup.add(buckleGem);

    // Legs — in groups for walk animation (pivot at hip)
    const legMat = torsoMat.clone();
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.85 });
    const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0x222218, roughness: 0.95 });
    const legGroups: THREE.Group[] = [];
    for (let side = -1; side <= 1; side += 2) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.12, 0.9, 0);  // pivot at hip

      // Hip joint
      const hipGeo = new THREE.SphereGeometry(0.065, 14, 12);
      const hip = new THREE.Mesh(hipGeo, legMat);
      hip.position.y = -0.02;
      legGroup.add(hip);

      // Thigh (tapered)
      const thighGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.4, 14);
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.position.y = -0.17;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Knee joint
      const kneeGeo = new THREE.SphereGeometry(0.058, 14, 12);
      const knee = new THREE.Mesh(kneeGeo, legMat);
      knee.position.y = -0.37;
      legGroup.add(knee);

      // Kneecap
      const kneecapGeo = new THREE.SphereGeometry(0.035, 12, 10);
      const kneecap = new THREE.Mesh(kneecapGeo, legMat);
      kneecap.position.set(0, -0.37, 0.04);
      legGroup.add(kneecap);

      // Shin (tapered)
      const shinGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.4, 14);
      const shin = new THREE.Mesh(shinGeo, legMat);
      shin.position.y = -0.57;
      shin.castShadow = true;
      legGroup.add(shin);

      // Calf muscle (bulge at back of shin)
      const calfGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const calf = new THREE.Mesh(calfGeo, legMat);
      calf.position.set(0, -0.48, -0.03);
      calf.scale.set(0.8, 1.3, 0.9);
      legGroup.add(calf);

      // Shin guard (front armor plate)
      const shinGuardGeo = new THREE.BoxGeometry(0.06, 0.18, 0.02);
      const shinGuard = new THREE.Mesh(shinGuardGeo, bootMat);
      shinGuard.position.set(0, -0.56, 0.05);
      legGroup.add(shinGuard);

      // Ankle joint
      const ankleGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const ankle = new THREE.Mesh(ankleGeo, bootMat);
      ankle.position.y = -0.77;
      legGroup.add(ankle);

      // Boot (more shaped than a box)
      const bootGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.12, 12);
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(0, -0.83, 0.0);
      legGroup.add(boot);

      // Boot toe
      const bootToeGeo = new THREE.SphereGeometry(0.055, 12, 10);
      const bootToe = new THREE.Mesh(bootToeGeo, bootMat);
      bootToe.position.set(0, -0.87, 0.05);
      bootToe.scale.set(1, 0.5, 1.3);
      legGroup.add(bootToe);

      // Boot sole
      const soleGeo = new THREE.BoxGeometry(0.13, 0.02, 0.2);
      const sole = new THREE.Mesh(soleGeo, bootSoleMat);
      sole.position.set(0, -0.9, 0.03);
      legGroup.add(sole);

      // Boot strap
      const strapGeo = new THREE.TorusGeometry(0.06, 0.008, 8, 16);
      const strap = new THREE.Mesh(strapGeo, buckleMat);
      strap.position.set(0, -0.8, 0);
      strap.rotation.x = Math.PI / 2;
      legGroup.add(strap);

      ctx.playerGroup.add(legGroup);
      legGroups.push(legGroup);
    }
    result.leftLegGroup = legGroups[0];
    result.rightLegGroup = legGroups[1];

    // Arms
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 1.35, 0);
    ctx.playerGroup.add(rightArmGroup);
    result.weaponArmGroup = rightArmGroup;

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 1.35, 0);
    ctx.playerGroup.add(leftArmGroup);
    result.leftArmGroup = leftArmGroup;

    for (const armGroup of [rightArmGroup, leftArmGroup]) {
      // Shoulder ball joint
      const shoulderGeo = new THREE.SphereGeometry(0.06, 14, 12);
      const shoulder = new THREE.Mesh(shoulderGeo, skinMat);
      shoulder.position.y = 0.0;
      armGroup.add(shoulder);

      // Upper arm (bicep)
      const upperGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.3, 14);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.15;
      armGroup.add(upper);

      // Bicep muscle bulge
      const bicepGeo = new THREE.SphereGeometry(0.035, 12, 10);
      const bicep = new THREE.Mesh(bicepGeo, skinMat);
      bicep.position.set(0, -0.12, 0.02);
      bicep.scale.set(0.8, 1.2, 0.7);
      armGroup.add(bicep);

      // Elbow joint
      const elbowGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const elbow = new THREE.Mesh(elbowGeo, skinMat);
      elbow.position.y = -0.32;
      armGroup.add(elbow);

      // Forearm
      const foreGeo = new THREE.CylinderGeometry(0.035, 0.048, 0.28, 14);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -0.45;
      armGroup.add(fore);

      // Forearm muscle bulk
      const foreMusGeo = new THREE.SphereGeometry(0.03, 10, 8);
      const foreMus = new THREE.Mesh(foreMusGeo, skinMat);
      foreMus.position.set(0, -0.38, 0.015);
      foreMus.scale.set(0.8, 1.4, 0.7);
      armGroup.add(foreMus);

      // Wrist
      const wristGeo = new THREE.SphereGeometry(0.03, 10, 8);
      const wrist = new THREE.Mesh(wristGeo, skinMat);
      wrist.position.y = -0.6;
      armGroup.add(wrist);

      // Palm (flattened sphere)
      const palmGeo = new THREE.SphereGeometry(0.035, 12, 10);
      const palm = new THREE.Mesh(palmGeo, skinMat);
      palm.position.y = -0.64;
      palm.scale.set(1.1, 0.6, 0.8);
      armGroup.add(palm);

      // Fingers (4 fingers + thumb)
      for (let f = 0; f < 4; f++) {
        const fingerGeo = new THREE.CylinderGeometry(0.007, 0.009, 0.045, 8);
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        finger.position.set(-0.02 + f * 0.014, -0.68, 0);
        armGroup.add(finger);
      }
      // Thumb (offset to side)
      const thumbGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.035, 8);
      const thumb = new THREE.Mesh(thumbGeo, skinMat);
      thumb.position.set(armGroup === rightArmGroup ? 0.025 : -0.025, -0.655, 0.015);
      thumb.rotation.z = armGroup === rightArmGroup ? 0.5 : -0.5;
      armGroup.add(thumb);
    }

    // Muscle definition for warrior (chest armor plates)
    if (cls === DiabloClass.WARRIOR) {
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x999aab, metalness: 0.75, roughness: 0.25 });
      for (let side = -1; side <= 1; side += 2) {
        const plateGeo = new THREE.BoxGeometry(0.14, 0.16, 0.04);
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(side * 0.1, 1.32, 0.17);
        ctx.playerGroup.add(plate);
      }
    }

    // Class-specific gear
    switch (cls) {
      case DiabloClass.WARRIOR: {
        // --- WARRIOR CLASS GEAR | Estimated polygons: ~45766 triangles (total with base: ~83650) ---
        const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.8, roughness: 0.2 });

        // Layered shoulder pauldrons
        for (let side = -1; side <= 1; side += 2) {
          // Main sphere
          const pauldronGeo = new THREE.SphereGeometry(0.14, 16, 12);
          const pauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
          pauldron.position.set(side * 0.35, 1.42, 0);
          pauldron.castShadow = true;
          ctx.playerGroup.add(pauldron);

          // Spike on top (cone pointing up)
          const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 44);
          const spike = new THREE.Mesh(spikeGeo, pauldronMat);
          spike.position.set(side * 0.35, 1.58, 0);
          ctx.playerGroup.add(spike);

          // Decorative rim (torus around base)
          const rimGeo = new THREE.TorusGeometry(0.13, 0.02, 44, 62);
          const rim = new THREE.Mesh(rimGeo, pauldronMat);
          rim.position.set(side * 0.35, 1.38, 0);
          rim.rotation.x = Math.PI / 2;
          ctx.playerGroup.add(rim);
        }

        // Chest plate with cross/emblem
        const chestPlateGeo = new THREE.BoxGeometry(0.36, 0.3, 0.04);
        const chestPlateMat = new THREE.MeshStandardMaterial({ color: 0x8888aa, metalness: 0.8, roughness: 0.2 });
        const chestPlate = new THREE.Mesh(chestPlateGeo, chestPlateMat);
        chestPlate.position.set(0, 1.28, 0.18);
        ctx.playerGroup.add(chestPlate);

        // Cross emblem on chest plate
        const emblemMat = new THREE.MeshStandardMaterial({ color: 0xcccc44, metalness: 0.7, roughness: 0.2 });
        const emblemV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), emblemMat);
        emblemV.position.set(0, 1.28, 0.21);
        ctx.playerGroup.add(emblemV);
        const emblemH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), emblemMat);
        emblemH.position.set(0, 1.30, 0.21);
        ctx.playerGroup.add(emblemH);

        // Arm bracers (thin cylinders around forearms)
        for (const armGroup of [rightArmGroup, leftArmGroup]) {
          const bracerGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.12, 44);
          const bracer = new THREE.Mesh(bracerGeo, pauldronMat);
          bracer.position.y = -0.42;
          armGroup.add(bracer);
        }

        // Helmet: half sphere on top + nose guard + cheek guards
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.8, roughness: 0.2 });
        const helmetGeo = new THREE.SphereGeometry(0.2, 62, 44, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.y = 1.62;
        ctx.playerGroup.add(helmet);

        // Nose guard (thin box going down front)
        const noseGuardGeo = new THREE.BoxGeometry(0.03, 0.16, 0.02);
        const noseGuard = new THREE.Mesh(noseGuardGeo, helmetMat);
        noseGuard.position.set(0, 1.58, 0.18);
        ctx.playerGroup.add(noseGuard);

        // Cheek guards (two small boxes on sides)
        for (let side = -1; side <= 1; side += 2) {
          const cheekGeo = new THREE.BoxGeometry(0.03, 0.1, 0.1);
          const cheek = new THREE.Mesh(cheekGeo, helmetMat);
          cheek.position.set(side * 0.17, 1.56, 0.06);
          ctx.playerGroup.add(cheek);
        }

        // Cape (flat box hanging from upper back)
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.9 });
        const capeGeo = new THREE.BoxGeometry(0.4, 0.01, 0.5);
        const cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 1.1, -0.25);
        ctx.playerGroup.add(cape);

        // Sword with fuller, grip, crossguard
        const swordGroup = new THREE.Group();
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.9, roughness: 0.1 });
        const bladeGeo = new THREE.BoxGeometry(0.06, 0.8, 0.02);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = -0.4;
        swordGroup.add(blade);

        // Fuller line (thin box down blade center)
        const fullerGeo = new THREE.BoxGeometry(0.02, 0.65, 0.025);
        const fullerMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.85, roughness: 0.15 });
        const fuller = new THREE.Mesh(fullerGeo, fullerMat);
        fuller.position.y = -0.38;
        swordGroup.add(fuller);

        // Crossguard
        const guardGeo = new THREE.BoxGeometry(0.22, 0.035, 0.045);
        const guard = new THREE.Mesh(guardGeo, bladeMat);
        guard.position.y = -0.02;
        swordGroup.add(guard);

        // Leather-wrapped grip
        const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.1, 44);
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.9 });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.position.y = 0.0;
        swordGroup.add(grip);

        const pommelGeo = new THREE.SphereGeometry(0.04, 62, 36);
        const pommelMat = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.5 });
        const pommel = new THREE.Mesh(pommelGeo, pommelMat);
        pommel.position.y = 0.06;
        swordGroup.add(pommel);

        swordGroup.position.y = -0.62;
        rightArmGroup.add(swordGroup);
        result.weaponMesh = blade;

        // Shield
        const shieldGeo = new THREE.CircleGeometry(0.25, 62);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x666688,
          metalness: 0.6,
          roughness: 0.3,
          side: THREE.DoubleSide,
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.y = -0.4;
        shield.position.z = 0.1;
        shield.rotation.y = Math.PI / 6;
        leftArmGroup.add(shield);

        // Shield boss (center sphere)
        const bossGeo = new THREE.SphereGeometry(0.06, 8, 6);
        const bossMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.2 });
        const shieldBoss = new THREE.Mesh(bossGeo, bossMat);
        shieldBoss.position.set(0, -0.4, 0.13);
        leftArmGroup.add(shieldBoss);

        // Shield rivets (4 tiny spheres around edge)
        const rivetMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.1 });
        for (let ri = 0; ri < 4; ri++) {
          const riAngle = (ri / 4) * Math.PI * 2;
          const rivetGeo = new THREE.SphereGeometry(0.02, 8, 6);
          const rivet = new THREE.Mesh(rivetGeo, rivetMat);
          rivet.position.set(Math.cos(riAngle) * 0.2, -0.4 + Math.sin(riAngle) * 0.2, 0.12);
          leftArmGroup.add(rivet);
        }
        break;
      }

      case DiabloClass.MAGE: {
        // --- MAGE CLASS GEAR | Estimated polygons: ~26678 triangles (total with base: ~64562) ---
        // Robe cone from waist
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.9 });
        const robeGeo = new THREE.ConeGeometry(0.4, 0.8, 44);
        const robe = new THREE.Mesh(robeGeo, robeMat);
        robe.position.y = 0.5;
        ctx.playerGroup.add(robe);

        // Outer robe flap (thin box on front, slightly offset)
        const flapGeo = new THREE.BoxGeometry(0.3, 0.7, 0.02);
        const flap = new THREE.Mesh(flapGeo, robeMat);
        flap.position.set(0.05, 0.55, 0.18);
        ctx.playerGroup.add(flap);

        // Sleeve cones around upper arms
        const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.85 });
        for (const armGrp of [rightArmGroup, leftArmGroup]) {
          const sleeveGeo = new THREE.ConeGeometry(0.1, 0.25, 44);
          const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
          sleeve.position.y = -0.1;
          sleeve.rotation.x = Math.PI;
          armGrp.add(sleeve);
        }

        // High collar (raised box behind neck)
        const collarGeo = new THREE.BoxGeometry(0.2, 0.12, 0.06);
        const collar = new THREE.Mesh(collarGeo, robeMat);
        collar.position.set(0, 1.52, -0.12);
        ctx.playerGroup.add(collar);

        // Rune glow on robe (small emissive circles on robe front)
        const runeMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.8,
        });
        for (let r = 0; r < 3; r++) {
          const runeGeo = new THREE.CircleGeometry(0.03, 62);
          const runeM = new THREE.Mesh(runeGeo, runeMat);
          runeM.position.set(0, 1.15 - r * 0.12, 0.16);
          ctx.playerGroup.add(runeM);
        }

        // Beard (small cone under chin, grey/white)
        const beardMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
        const beardGeo = new THREE.ConeGeometry(0.06, 0.12, 44);
        const beard = new THREE.Mesh(beardGeo, beardMat);
        beard.position.set(0, 1.44, 0.1);
        beard.rotation.x = Math.PI;
        ctx.playerGroup.add(beard);

        // Book on belt (spellbook)
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x3a1a0a, roughness: 0.9 });
        const bookGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(-0.22, 0.92, 0.1);
        ctx.playerGroup.add(book);

        // Pointed hat
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.8 });
        const hatGeo = new THREE.ConeGeometry(0.2, 0.4, 44);
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.9;
        ctx.playerGroup.add(hat);

        const brimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03, 44);
        const brim = new THREE.Mesh(brimGeo, hatMat);
        brim.position.y = 1.72;
        ctx.playerGroup.add(brim);

        // Staff with glowing orb
        const staffGroup = new THREE.Group();
        const staffGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 44);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.y = -0.5;
        staffGroup.add(staff);

        // Staff rings (3 thin torus rings along the shaft)
        for (let ri = 0; ri < 3; ri++) {
          const sRingGeo = new THREE.TorusGeometry(0.045, 0.008, 44, 62);
          const sRingMat = new THREE.MeshStandardMaterial({ color: 0x886644, metalness: 0.5, roughness: 0.3 });
          const sRing = new THREE.Mesh(sRingGeo, sRingMat);
          sRing.position.y = -0.15 + ri * 0.4;
          sRing.rotation.x = Math.PI / 2;
          staffGroup.add(sRing);
        }

        const orbGeo = new THREE.SphereGeometry(0.1, 16, 12);
        const orbMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.9,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.y = 0.45;
        staffGroup.add(orb);

        // Orbiting small crystals (3 tiny icosahedrons around main orb)
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0xaa66ff, emissive: 0x8844dd, emissiveIntensity: 1.2,
          transparent: true, opacity: 0.8,
        });
        for (let ci = 0; ci < 3; ci++) {
          const cAngle = (ci / 3) * Math.PI * 2;
          const crystalGeo = new THREE.IcosahedronGeometry(0.03, 3);
          const crystal = new THREE.Mesh(crystalGeo, crystalMat);
          crystal.position.set(
            Math.cos(cAngle) * 0.16,
            0.45 + Math.sin(cAngle) * 0.08,
            Math.sin(cAngle) * 0.16
          );
          staffGroup.add(crystal);
        }

        staffGroup.position.y = -0.62;
        rightArmGroup.add(staffGroup);
        result.weaponMesh = staff;
        break;
      }

      case DiabloClass.RANGER: {
        // --- RANGER CLASS GEAR | Estimated polygons: ~5272 triangles (total with base: ~43156) ---
        // Hood
        const hoodGeo = new THREE.ConeGeometry(0.2, 0.25, 44);
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, 1.72, -0.05);
        ctx.playerGroup.add(hood);

        // Face mask/scarf (small box covering lower face)
        const scarfMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        const scarfGeo = new THREE.BoxGeometry(0.18, 0.08, 0.08);
        const scarf = new THREE.Mesh(scarfGeo, scarfMat);
        scarf.position.set(0, 1.52, 0.1);
        ctx.playerGroup.add(scarf);

        // Cloak (larger draped plane from shoulders down back)
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x2a4a22, roughness: 0.9 });
        const cloakGeo = new THREE.BoxGeometry(0.45, 0.01, 0.6);
        const cloak = new THREE.Mesh(cloakGeo, cloakMat);
        cloak.position.set(0, 1.05, -0.2);
        ctx.playerGroup.add(cloak);

        // Arm guards / leather bracers
        const bracerMat = new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 });
        for (const armGrp of [rightArmGroup, leftArmGroup]) {
          const bracerGeo = new THREE.CylinderGeometry(0.062, 0.068, 0.14, 44);
          const bracer = new THREE.Mesh(bracerGeo, bracerMat);
          bracer.position.y = -0.42;
          armGrp.add(bracer);
        }

        // Knee pads (small flattened boxes on front of knees)
        for (let side = -1; side <= 1; side += 2) {
          const kneePadGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
          const kneePad = new THREE.Mesh(kneePadGeo, bracerMat);
          kneePad.position.set(side * 0.12, 0.53, 0.06);
          ctx.playerGroup.add(kneePad);
        }

        // Bandolier (thin cylinder diagonal across chest + pouches)
        const bandolierGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 44);
        const bandolierMat = new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 });
        const bandolier = new THREE.Mesh(bandolierGeo, bandolierMat);
        bandolier.position.set(0, 1.2, 0.16);
        bandolier.rotation.z = 0.6;
        ctx.playerGroup.add(bandolier);

        // Pouches on bandolier
        for (let p = 0; p < 3; p++) {
          const pouchGeo = new THREE.BoxGeometry(0.05, 0.04, 0.03);
          const pouch = new THREE.Mesh(pouchGeo, bracerMat);
          pouch.position.set(-0.08 + p * 0.08, 1.12 + p * 0.06, 0.18);
          ctx.playerGroup.add(pouch);
        }

        // Bow (torus segment)
        const bowGeo = new THREE.TorusGeometry(0.4, 0.02, 44, 62, Math.PI);
        const bowMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.y = -0.3;
        bow.rotation.z = Math.PI / 2;
        leftArmGroup.add(bow);

        // Bowstring
        const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.8, 44);
        const stringMat = new THREE.MeshStandardMaterial({ color: 0xccccaa });
        const bowString = new THREE.Mesh(stringGeo, stringMat);
        bowString.position.y = -0.3;
        leftArmGroup.add(bowString);

        // Quiver on back
        const quiverGeo = new THREE.BoxGeometry(0.12, 0.5, 0.08);
        const quiverMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
        const quiver = new THREE.Mesh(quiverGeo, quiverMat);
        quiver.position.set(0.15, 1.25, -0.2);
        ctx.playerGroup.add(quiver);

        // 6 arrows in quiver with arrowhead tips and feathers
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
        const arrowHeadMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.7, roughness: 0.2 });
        const featherMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.9 });
        for (let a = 0; a < 6; a++) {
          const arrowGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.55, 44);
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          const ax = 0.15 + (a - 2.5) * 0.02;
          arrow.position.set(ax, 1.35, -0.2);
          ctx.playerGroup.add(arrow);

          // Arrowhead tip (tiny cone, metallic)
          const tipGeo = new THREE.ConeGeometry(0.018, 0.05, 44);
          const tip = new THREE.Mesh(tipGeo, arrowHeadMat);
          tip.position.set(ax, 1.63, -0.2);
          ctx.playerGroup.add(tip);

          // Feathers at nock end (tiny plane)
          const featherGeo = new THREE.BoxGeometry(0.025, 0.04, 0.005);
          const feather = new THREE.Mesh(featherGeo, featherMat);
          feather.position.set(ax, 1.08, -0.2);
          ctx.playerGroup.add(feather);
        }

        result.weaponMesh = bow;
        break;
      }
      case DiabloClass.PALADIN: {
        // --- PALADIN CLASS GEAR ---
        const palGoldMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.9, roughness: 0.15, emissive: 0x332200, emissiveIntensity: 0.3 });
        const palSteelMat = new THREE.MeshStandardMaterial({ color: 0xbbbbcc, metalness: 0.85, roughness: 0.2 });
        const palLeatherMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.7 });
        const palHolyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 0.8 });
        const palGlowMat = new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xffcc44, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 });

        // Golden pauldrons with layered plates and rim spikes
        for (const side of [-1, 1]) {
          // Main dome
          const paulMain = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), palGoldMat);
          paulMain.position.set(side * 0.32, 1.45, 0);
          paulMain.scale.set(1.2, 0.8, 1.0);
          paulMain.castShadow = true;
          ctx.playerGroup.add(paulMain);
          // Edge rim
          const paulRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 16, 32), palGoldMat);
          paulRim.position.set(side * 0.32, 1.42, 0);
          paulRim.rotation.x = Math.PI / 2;
          paulRim.scale.set(1.2, 1.0, 0.8);
          ctx.playerGroup.add(paulRim);
          // Under-plate armor layer
          const paulUnder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), palSteelMat);
          paulUnder.position.set(side * 0.32, 1.44, 0);
          paulUnder.scale.set(1.3, 0.5, 1.1);
          ctx.playerGroup.add(paulUnder);
          // Ornamental spike on top
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 16), palGoldMat);
          spike.position.set(side * 0.32, 1.52, 0);
          ctx.playerGroup.add(spike);
          // Holy gem inset
          const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 2), palGlowMat);
          gem.position.set(side * 0.34, 1.47, 0.08);
          ctx.playerGroup.add(gem);
        }

        // Chest plate with layered armor
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.06), palSteelMat);
        chestPlate.position.set(0, 1.28, 0.12);
        ctx.playerGroup.add(chestPlate);
        // Rounded breastplate contour over chest
        const breastContour = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), palSteelMat);
        breastContour.position.set(0, 1.3, 0.1);
        breastContour.rotation.x = -0.2;
        ctx.playerGroup.add(breastContour);
        // Cross emblem on chest (raised)
        const chestCrossMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffcc88, emissiveIntensity: 0.4 });
        const cv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.015), chestCrossMat);
        cv.position.set(0, 1.28, 0.16);
        ctx.playerGroup.add(cv);
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.015), chestCrossMat);
        ch.position.set(0, 1.32, 0.16);
        ctx.playerGroup.add(ch);
        // Holy glow behind cross
        const crossGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), palGlowMat);
        crossGlow.position.set(0, 1.3, 0.15);
        ctx.playerGroup.add(crossGlow);

        // Tassets (hip armor plates)
        for (const side of [-1, 0, 1]) {
          const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.04), palSteelMat);
          tasset.position.set(side * 0.1, 0.95, 0.1);
          tasset.rotation.x = 0.15;
          ctx.playerGroup.add(tasset);
          // Gold trim on bottom edge
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.045), palGoldMat);
          trim.position.set(side * 0.1, 0.885, 0.1);
          ctx.playerGroup.add(trim);
        }

        // Belt with ornate buckle
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.28), palLeatherMat);
        belt.position.set(0, 1.02, 0);
        ctx.playerGroup.add(belt);
        const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 24), palGoldMat);
        buckle.position.set(0, 1.02, 0.14);
        buckle.rotation.x = Math.PI / 2;
        ctx.playerGroup.add(buckle);
        // Buckle gem
        const buckleGem = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), palGlowMat);
        buckleGem.position.set(0, 1.02, 0.155);
        ctx.playerGroup.add(buckleGem);

        // Knee guards
        for (const side of [-1, 1]) {
          const kneeGuard = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), palSteelMat);
          kneeGuard.position.set(side * 0.12, 0.62, 0.08);
          kneeGuard.rotation.x = -0.3;
          ctx.playerGroup.add(kneeGuard);
        }

        // Holy mace (weapon arm) — high-poly
        const maceHeadMat = new THREE.MeshStandardMaterial({ color: 0xddcc55, metalness: 0.9, roughness: 0.1, emissive: 0xffcc00, emissiveIntensity: 0.5 });
        // Handle with grip wrapping
        const maceHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.7, 24), palLeatherMat);
        maceHandle.position.set(0, -0.1, 0);
        result.weaponArmGroup.add(maceHandle);
        // Leather grip wraps
        for (let g = 0; g < 5; g++) {
          const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 8, 16), palLeatherMat);
          wrap.position.set(0, 0.05 - g * 0.06, 0);
          wrap.rotation.x = Math.PI / 2;
          result.weaponArmGroup.add(wrap);
        }
        // Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 16), palGoldMat);
        pommel.position.set(0, 0.26, 0);
        result.weaponArmGroup.add(pommel);
        // Mace head — smooth sphere
        const maceHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 24), maceHeadMat);
        maceHead.position.set(0, -0.5, 0);
        maceHead.castShadow = true;
        result.weaponArmGroup.add(maceHead);
        // Crown ring around mace head
        const maceCrown = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 12, 32), maceHeadMat);
        maceCrown.position.set(0, -0.5, 0);
        maceCrown.rotation.x = Math.PI / 2;
        result.weaponArmGroup.add(maceCrown);
        // 6 smooth flanges radiating outward
        for (let i = 0; i < 6; i++) {
          const flangeAngle = (i / 6) * Math.PI * 2;
          // Each flange: tapered cylinder
          const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.025, 0.12, 12), maceHeadMat);
          flange.position.set(
            Math.cos(flangeAngle) * 0.06, -0.5, Math.sin(flangeAngle) * 0.06
          );
          flange.rotation.z = Math.PI / 2;
          flange.rotation.y = flangeAngle;
          result.weaponArmGroup.add(flange);
        }
        // Holy glow orb inside mace head
        const maceGlow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), palGlowMat);
        maceGlow.position.set(0, -0.5, 0);
        result.weaponArmGroup.add(maceGlow);

        // Golden shield on left arm — rounded kite shape
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0xddcc55, metalness: 0.8, roughness: 0.2, emissive: 0x554400, emissiveIntensity: 0.2 });
        // Shield body (rounded box)
        const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.35, 6, 1), shieldMat);
        shieldBody.position.set(0.02, -0.15, 0.08);
        shieldBody.rotation.x = Math.PI / 2;
        shieldBody.rotation.z = Math.PI / 6;
        shieldBody.castShadow = true;
        result.leftArmGroup!.add(shieldBody);
        // Shield boss (central dome)
        const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), palGoldMat);
        shieldBoss.position.set(0.04, -0.15, 0.2);
        shieldBoss.rotation.x = -Math.PI / 2;
        result.leftArmGroup!.add(shieldBoss);
        // Shield rim
        const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 8, 32), palGoldMat);
        shieldRim.position.set(0.02, -0.13, 0.08);
        result.leftArmGroup!.add(shieldRim);
        // Cross emblem on shield (raised 3D)
        const sCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.18, 0.03), palHolyMat);
        sCrossV.position.set(0.04, -0.15, 0.17);
        result.leftArmGroup!.add(sCrossV);
        const sCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.12), palHolyMat);
        sCrossH.position.set(0.04, -0.12, 0.17);
        result.leftArmGroup!.add(sCrossH);
        // Rivets around shield
        for (let r = 0; r < 6; r++) {
          const ra = (r / 6) * Math.PI * 2;
          const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), palGoldMat);
          rivet.position.set(0.02, -0.15 + Math.sin(ra) * 0.11, 0.08 + Math.cos(ra) * 0.11);
          result.leftArmGroup!.add(rivet);
        }

        // Short cape from back of neck
        const capeMat = new THREE.MeshStandardMaterial({ color: 0xddddff, roughness: 0.6, side: THREE.DoubleSide });
        const cape = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.02), capeMat);
        cape.position.set(0, 1.1, -0.16);
        cape.rotation.x = 0.15;
        ctx.playerGroup.add(cape);
        // Gold trim at cape bottom
        const capeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.025), palGoldMat);
        capeTrim.position.set(0, 0.88, -0.16);
        ctx.playerGroup.add(capeTrim);

        result.weaponMesh = maceHead;
        break;
      }
      case DiabloClass.NECROMANCER: {
        // --- NECROMANCER CLASS GEAR ---
        const necClothMat = new THREE.MeshStandardMaterial({ color: 0x220033, roughness: 0.95, side: THREE.DoubleSide });
        const necBoneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.6 });
        const necStaffMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
        const necGlowMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22cc22, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
        const necDarkMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.95 });
        const necShadowMat = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110033, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 });

        // Tattered shoulder cloth with layered panels
        for (const side of [-1, 1]) {
          // Main cloth piece
          const capeMain = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.11), necClothMat);
          capeMain.position.set(side * 0.28, 1.3, -0.05);
          capeMain.rotation.z = side * 0.3;
          ctx.playerGroup.add(capeMain);
          // Tattered lower fringe (3 dangling strips)
          for (let f = 0; f < 3; f++) {
            const fringeLen = 0.1 + Math.random() * 0.08;
            const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.04, fringeLen, 0.02), necClothMat);
            fringe.position.set(side * 0.28 + (f - 1) * 0.04, 1.15 - fringeLen * 0.5, -0.05);
            fringe.rotation.z = side * (0.2 + f * 0.1);
            ctx.playerGroup.add(fringe);
          }
          // Bone clasp on shoulder
          const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), necBoneMat);
          clasp.position.set(side * 0.3, 1.44, 0.02);
          ctx.playerGroup.add(clasp);
        }

        // Hood — smooth high-poly
        const hood = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.7),
          necDarkMat
        );
        hood.position.set(0, 1.62, -0.02);
        ctx.playerGroup.add(hood);
        // Hood brim overhang (shadowy front)
        const hoodBrim = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 12, -Math.PI * 0.4, Math.PI * 0.8, 0, Math.PI * 0.35), necDarkMat);
        hoodBrim.position.set(0, 1.64, 0.06);
        hoodBrim.rotation.x = 0.3;
        ctx.playerGroup.add(hoodBrim);
        // Shadow veil under hood
        const veil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), necShadowMat);
        veil.position.set(0, 1.58, 0.04);
        ctx.playerGroup.add(veil);

        // Robe (long tattered skirt)
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 24, 1, true), necClothMat);
        robe.position.set(0, 0.75, 0);
        ctx.playerGroup.add(robe);
        // Robe tattered bottom edges
        for (let t = 0; t < 8; t++) {
          const ta = (t / 8) * Math.PI * 2;
          const tLen = 0.06 + Math.random() * 0.06;
          const tatter = new THREE.Mesh(new THREE.BoxGeometry(0.05, tLen, 0.015), necClothMat);
          tatter.position.set(Math.cos(ta) * 0.2, 0.52 - tLen * 0.5, Math.sin(ta) * 0.2);
          ctx.playerGroup.add(tatter);
        }

        // Bone necklace — proper bones with joints
        for (let i = 0; i < 7; i++) {
          const boneAngle = (i / 7) * Math.PI * 1.2 - Math.PI * 0.6;
          // Bone shaft
          const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.04, 12), necBoneMat);
          bone.position.set(Math.sin(boneAngle) * 0.19, 1.4, Math.cos(boneAngle) * 0.15 + 0.05);
          bone.rotation.z = boneAngle;
          ctx.playerGroup.add(bone);
          // Joint knobs on each bone end
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), necBoneMat);
          knob.position.set(
            Math.sin(boneAngle) * 0.19 + Math.cos(boneAngle) * 0.02,
            1.4 + 0.02, Math.cos(boneAngle) * 0.15 + 0.05
          );
          ctx.playerGroup.add(knob);
        }
        // Central skull pendant on necklace
        const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), necBoneMat);
        pendant.position.set(0, 1.37, 0.2);
        pendant.scale.set(1.0, 1.2, 0.8);
        ctx.playerGroup.add(pendant);
        // Pendant eye sockets
        for (const sx of [-0.008, 0.008]) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), necGlowMat);
          socket.position.set(sx, 1.375, 0.22);
          ctx.playerGroup.add(socket);
        }

        // Belt with vials
        const necBeltMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
        const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.26), necBeltMat);
        beltMesh.position.set(0, 1.0, 0);
        ctx.playerGroup.add(beltMesh);
        // Potion vials on belt
        const vialMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
        for (let v = 0; v < 3; v++) {
          const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 12), vialMat);
          vial.position.set(-0.06 + v * 0.06, 0.98, 0.13);
          ctx.playerGroup.add(vial);
          // Cork
          const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.015, 8), necBeltMat);
          cork.position.set(-0.06 + v * 0.06, 1.015, 0.13);
          ctx.playerGroup.add(cork);
        }

        // Skull staff (weapon arm) — high-poly
        const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.4, 24), necStaffMat);
        staffPole.position.set(0, -0.25, 0);
        result.weaponArmGroup.add(staffPole);
        // Gnarled grip rings
        for (let g = 0; g < 4; g++) {
          const grip = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 8, 16), necStaffMat);
          grip.position.set(0, 0.0 - g * 0.08, 0);
          grip.rotation.x = Math.PI / 2;
          result.weaponArmGroup.add(grip);
        }

        // Skull on top — smooth, anatomical
        const skullMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.5 });
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 24), skullMat);
        skull.position.set(0, -0.95, 0);
        skull.scale.set(1.0, 1.15, 0.9);
        result.weaponArmGroup.add(skull);
        // Jaw
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4), skullMat);
        jaw.position.set(0, -0.98, 0.02);
        result.weaponArmGroup.add(jaw);
        // Teeth
        for (let t = 0; t < 5; t++) {
          const ta = (t / 5) * Math.PI * 0.8 - Math.PI * 0.4;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.015, 8), skullMat);
          tooth.position.set(Math.sin(ta) * 0.035, -0.985, Math.cos(ta) * 0.035 + 0.015);
          tooth.rotation.x = Math.PI;
          result.weaponArmGroup.add(tooth);
        }
        // Glowing eyes in skull sockets
        for (const sx of [-0.025, 0.025]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12), necGlowMat);
          eyeSocket.position.set(sx, -0.93, 0.045);
          result.weaponArmGroup.add(eyeSocket);
          // Glow haze around eye
          const eyeHaze = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshStandardMaterial({
            color: 0x44ff44, emissive: 0x22ff22, emissiveIntensity: 1.0, transparent: true, opacity: 0.2
          }));
          eyeHaze.position.set(sx, -0.93, 0.05);
          result.weaponArmGroup.add(eyeHaze);
        }

        // Glowing orb above skull with inner crystal
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 18), necGlowMat);
        orb.position.set(0, -1.06, 0);
        result.weaponArmGroup.add(orb);
        const orbInner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 2), new THREE.MeshStandardMaterial({
          color: 0x88ff88, emissive: 0x44ff44, emissiveIntensity: 3.0
        }));
        orbInner.position.set(0, -1.06, 0);
        result.weaponArmGroup.add(orbInner);
        // Spectral wisps rising from orb
        for (let w = 0; w < 3; w++) {
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({
            color: 0x66ff66, emissive: 0x44ff44, emissiveIntensity: 2.0, transparent: true, opacity: 0.35
          }));
          const wa = (w / 3) * Math.PI * 2;
          wisp.position.set(Math.cos(wa) * 0.03, -1.12 - w * 0.03, Math.sin(wa) * 0.03);
          result.weaponArmGroup.add(wisp);
        }
        // Bone prongs cradling the orb (3 curved)
        for (let p = 0; p < 3; p++) {
          const pa = (p / 3) * Math.PI * 2;
          const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.08, 10), skullMat);
          prong.position.set(Math.cos(pa) * 0.035, -1.02, Math.sin(pa) * 0.035);
          prong.rotation.z = Math.cos(pa) * 0.4;
          prong.rotation.x = Math.sin(pa) * 0.4;
          result.weaponArmGroup.add(prong);
        }

        result.weaponMesh = staffPole;
        break;
      }
      case DiabloClass.ASSASSIN: {
        // --- ASSASSIN CLASS GEAR ---
        const assLeatherMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.75 });
        const assMetalMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.8, roughness: 0.25 });
        const assBladeMat = new THREE.MeshStandardMaterial({ color: 0x99aabc, metalness: 0.95, roughness: 0.05 });
        const assHiltMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 });
        const assPoisonMat = new THREE.MeshStandardMaterial({ color: 0x66ff66, emissive: 0x22aa22, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
        const assDarkLeather = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });

        // Layered leather shoulder guards with studs and buckles
        for (const side of [-1, 1]) {
          // Main shoulder plate
          const shoulderMain = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.11), assLeatherMat);
          shoulderMain.position.set(side * 0.3, 1.43, 0);
          shoulderMain.castShadow = true;
          ctx.playerGroup.add(shoulderMain);
          // Under-layer
          const shoulderUnder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.12), assDarkLeather);
          shoulderUnder.position.set(side * 0.3, 1.40, 0);
          ctx.playerGroup.add(shoulderUnder);
          // Metal studs — 3 per shoulder, smooth spheres
          for (let s = 0; s < 3; s++) {
            const stud = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), assMetalMat);
            stud.position.set(side * 0.3 + (s - 1) * 0.04, 1.46, 0.05);
            ctx.playerGroup.add(stud);
          }
          // Buckle strap running down from shoulder
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.015), assLeatherMat);
          strap.position.set(side * 0.26, 1.32, 0.1);
          ctx.playerGroup.add(strap);
          const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 16), assMetalMat);
          buckle.position.set(side * 0.26, 1.25, 0.11);
          buckle.rotation.x = Math.PI / 2;
          ctx.playerGroup.add(buckle);
        }

        // Chest harness with crossing leather straps
        const strapCross1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.35, 0.015), assLeatherMat);
        strapCross1.position.set(0, 1.2, 0.14);
        strapCross1.rotation.z = 0.3;
        ctx.playerGroup.add(strapCross1);
        const strapCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.35, 0.015), assLeatherMat);
        strapCross2.position.set(0, 1.2, 0.14);
        strapCross2.rotation.z = -0.3;
        ctx.playerGroup.add(strapCross2);
        // Center clasp where straps cross
        const centerClasp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 20), assMetalMat);
        centerClasp.position.set(0, 1.2, 0.15);
        centerClasp.rotation.x = Math.PI / 2;
        ctx.playerGroup.add(centerClasp);

        // Face mask / cowl — smooth wrap around lower face
        const cowl = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 24, 16, -Math.PI * 0.5, Math.PI, Math.PI * 0.35, Math.PI * 0.35),
          assDarkLeather
        );
        cowl.position.set(0, 1.55, 0.05);
        ctx.playerGroup.add(cowl);
        // Eye slit opening
        const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.01), new THREE.MeshStandardMaterial({
          color: 0x000000, roughness: 1.0
        }));
        eyeSlit.position.set(0, 1.58, 0.13);
        ctx.playerGroup.add(eyeSlit);

        // Belt with pouches and vials
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.04, 0.27), assLeatherMat);
        belt.position.set(0, 0.95, 0);
        ctx.playerGroup.add(belt);
        // Belt pouches — rounded
        for (const side of [-1, 1]) {
          const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), assLeatherMat);
          pouch.position.set(side * 0.22, 0.93, 0.12);
          pouch.scale.set(0.9, 0.8, 0.7);
          ctx.playerGroup.add(pouch);
          // Pouch flap
          const flap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.04), assLeatherMat);
          flap.position.set(side * 0.22, 0.96, 0.12);
          ctx.playerGroup.add(flap);
        }
        // Poison vial on belt
        const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 12), assPoisonMat);
        vial.position.set(0.08, 0.93, 0.13);
        ctx.playerGroup.add(vial);
        const vialCork = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.012, 8), assHiltMat);
        vialCork.position.set(0.08, 0.96, 0.13);
        ctx.playerGroup.add(vialCork);

        // Throwing knives on belt (back) — proper blade shapes
        for (let i = 0; i < 4; i++) {
          // Blade
          const knife = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.012, 0.1, 12), assBladeMat);
          knife.position.set(-0.12 + i * 0.055, 0.93, -0.14);
          knife.rotation.z = 0.1;
          ctx.playerGroup.add(knife);
          // Mini grip
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8), assHiltMat);
          grip.position.set(-0.12 + i * 0.055, 0.99, -0.14);
          grip.rotation.z = 0.1;
          ctx.playerGroup.add(grip);
        }

        // Leg wraps / shin guards
        for (const side of [-1, 1]) {
          const shinGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.15, 16, 1, true), assLeatherMat);
          shinGuard.position.set(side * 0.12, 0.45, 0.02);
          ctx.playerGroup.add(shinGuard);
          // Straps on shin guards
          for (let s = 0; s < 2; s++) {
            const shinStrap = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.005, 6, 16), assLeatherMat);
            shinStrap.position.set(side * 0.12, 0.4 + s * 0.1, 0.02);
            shinStrap.rotation.x = Math.PI / 2;
            ctx.playerGroup.add(shinStrap);
          }
        }

        // Main dagger (weapon arm) — detailed curved blade
        const daggerBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.02, 0.35, 16), assBladeMat);
        daggerBlade.position.set(0, -0.3, 0);
        daggerBlade.castShadow = true;
        result.weaponArmGroup.add(daggerBlade);
        // Blade edge highlight
        const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.3, 0.035), new THREE.MeshStandardMaterial({
          color: 0xddeeff, metalness: 1.0, roughness: 0.0
        }));
        bladeEdge.position.set(0, -0.28, 0);
        result.weaponArmGroup.add(bladeEdge);
        // Poison drip on blade
        const drip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), assPoisonMat);
        drip.position.set(0, -0.46, 0.01);
        drip.scale.set(0.8, 1.5, 0.8);
        result.weaponArmGroup.add(drip);
        // Hilt — wrapped grip
        const daggerHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.1, 20), assHiltMat);
        daggerHilt.position.set(0, -0.1, 0);
        result.weaponArmGroup.add(daggerHilt);
        // Grip wraps
        for (let g = 0; g < 3; g++) {
          const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.003, 6, 12), assHiltMat);
          wrap.position.set(0, -0.07 - g * 0.03, 0);
          wrap.rotation.x = Math.PI / 2;
          result.weaponArmGroup.add(wrap);
        }
        // Cross-guard with swept curves
        const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.07, 12), assMetalMat);
        guard.position.set(0, -0.15, 0);
        guard.rotation.z = Math.PI / 2;
        result.weaponArmGroup.add(guard);
        // Pommel
        const daggerPommel = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), assMetalMat);
        daggerPommel.position.set(0, -0.05, 0);
        result.weaponArmGroup.add(daggerPommel);

        // Off-hand dagger (left arm) — matching style
        const offBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.018, 0.3, 16), assBladeMat);
        offBlade.position.set(0, -0.25, 0);
        offBlade.castShadow = true;
        result.leftArmGroup!.add(offBlade);
        const offEdge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.25, 0.03), new THREE.MeshStandardMaterial({
          color: 0xddeeff, metalness: 1.0, roughness: 0.0
        }));
        offEdge.position.set(0, -0.23, 0);
        result.leftArmGroup!.add(offEdge);
        const offHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.08, 20), assHiltMat);
        offHilt.position.set(0, -0.08, 0);
        result.leftArmGroup!.add(offHilt);
        const offGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.06, 12), assMetalMat);
        offGuard.position.set(0, -0.12, 0);
        offGuard.rotation.z = Math.PI / 2;
        result.leftArmGroup!.add(offGuard);

        // Short shadow cloak from back
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9, side: THREE.DoubleSide });
        const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.35, 0.015), cloakMat);
        cloak.position.set(0, 1.15, -0.15);
        cloak.rotation.x = 0.1;
        ctx.playerGroup.add(cloak);
        // Tattered cloak edges
        for (let t = 0; t < 5; t++) {
          const tLen = 0.04 + Math.random() * 0.06;
          const tatter = new THREE.Mesh(new THREE.BoxGeometry(0.04, tLen, 0.01), cloakMat);
          tatter.position.set(-0.1 + t * 0.05, 0.97 - tLen * 0.5, -0.15);
          ctx.playerGroup.add(tatter);
        }

        result.weaponMesh = daggerBlade;
        break;
      }
    }

    ctx.playerGroup.castShadow = true;

    // Player lantern – warm point light for dark maps
    const lantern = new THREE.PointLight(0xffaa55, 0, 12, 1.5);
    lantern.position.set(0.3, 1.2, 0.3);
    ctx.playerGroup.add(lantern);
    result.playerLantern = lantern;
    return result;
}
