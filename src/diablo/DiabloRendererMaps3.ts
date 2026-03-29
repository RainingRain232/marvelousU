import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildDragonsSanctum(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x221100, 0.012);
    mctx.applyTerrainColors(0x2a1a0a, 0x4a3a2a, 1.2);
    mctx.dirLight.color.setHex(0xffaa44);
    mctx.dirLight.intensity = 1.2;
    mctx.ambientLight.color.setHex(0x332200);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0xffcc66);
    mctx.hemiLight.groundColor.setHex(0x221100);

    // Gold piles (45) with more coins and detail
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, metalness: 0.8, roughness: 0.2,
      emissive: 0x664400, emissiveIntensity: 0.2,
    });
    for (let i = 0; i < 45; i++) {
      const pileGroup = new THREE.Group();
      const pileSize = 0.3 + Math.random() * 0.8;
      const pile = new THREE.Mesh(new THREE.SphereGeometry(pileSize, 16, 12), goldMat);
      pile.scale.y = 0.4;
      pile.position.y = pileSize * 0.2;
      pileGroup.add(pile);
      // Individual coins scattered
      for (let c = 0; c < 8; c++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12), goldMat);
        coin.position.set(
          (Math.random() - 0.5) * pileSize,
          0.02,
          (Math.random() - 0.5) * pileSize
        );
        coin.rotation.x = Math.random() * 0.5;
        pileGroup.add(coin);
      }
      // Treasure pile gems (small icosahedrons)
      const tGemColors = [0xff2244, 0x2244ff, 0x22ff44, 0xff44ff, 0x44ffff];
      for (let tg = 0; tg < 3; tg++) {
        const tgColor = tGemColors[Math.floor(Math.random() * tGemColors.length)];
        const tGem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03 + Math.random() * 0.03, 1),
          new THREE.MeshStandardMaterial({ color: tgColor, emissive: tgColor, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.15 }));
        tGem.position.set((Math.random() - 0.5) * pileSize * 0.7, pileSize * 0.3 + Math.random() * pileSize * 0.15, (Math.random() - 0.5) * pileSize * 0.7);
        tGem.rotation.set(Math.random(), Math.random(), Math.random());
        pileGroup.add(tGem);
      }
      // Extra scattered coins (tiny cylinders)
      for (let ec = 0; ec < 5; ec++) {
        const xCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 8), goldMat);
        xCoin.position.set((Math.random() - 0.5) * pileSize * 1.5, 0.01, (Math.random() - 0.5) * pileSize * 1.5);
        xCoin.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        pileGroup.add(xCoin);
      }
      const gpX = (Math.random() - 0.5) * w * 0.85;
      const gpZ = (Math.random() - 0.5) * d * 0.85;
      pileGroup.position.set(gpX, getTerrainHeight(gpX, gpZ, 1.2), gpZ);
      mctx.envGroup.add(pileGroup);
    }

    // Massive stone columns (cavern pillars) (20)
    const cavernMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
    for (let i = 0; i < 20; i++) {
      const colGroup = new THREE.Group();
      const cH = 8 + Math.random() * 6;
      const cR = 0.5 + Math.random() * 0.8;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(cR * 0.8, cR, cH, 12), cavernMat);
      col.position.y = cH / 2;
      col.castShadow = true;
      colGroup.add(col);
      // Capital on top
      const capGeo = new THREE.CylinderGeometry(cR * 1.2, cR * 0.8, 0.5, 12);
      const cap = new THREE.Mesh(capGeo, cavernMat);
      cap.position.y = cH;
      colGroup.add(cap);
      // Claw mark scratches on pillars (angled thin dark boxes)
      for (let cm = 0; cm < 3; cm++) {
        const clawAng = Math.random() * Math.PI * 2;
        const clawY = cH * 0.2 + Math.random() * cH * 0.5;
        for (let cs = 0; cs < 3; cs++) {
          const scratch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4 + Math.random() * 0.3, 0.01),
            new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0, transparent: true, opacity: 0.6 }));
          scratch.position.set(Math.cos(clawAng) * cR * 0.85, clawY + cs * 0.08, Math.sin(clawAng) * cR * 0.85);
          scratch.lookAt(new THREE.Vector3(0, clawY + cs * 0.08, 0));
          scratch.rotation.z = 0.3 + (Math.random() - 0.5) * 0.2;
          colGroup.add(scratch);
        }
      }
      const clX = (Math.random() - 0.5) * w * 0.85;
      const clZ = (Math.random() - 0.5) * d * 0.85;
      colGroup.position.set(clX, getTerrainHeight(clX, clZ, 1.2), clZ);
      mctx.envGroup.add(colGroup);
    }

    // Dragon eggs (14)
    const eggColors = [0xcc4422, 0x22cc44, 0x4422cc, 0xcccc22, 0xcc22cc];
    for (let i = 0; i < 14; i++) {
      const egg = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 12),
        new THREE.MeshStandardMaterial({
          color: eggColors[i % eggColors.length], roughness: 0.4, metalness: 0.3,
          emissive: eggColors[i % eggColors.length], emissiveIntensity: 0.15,
        })
      );
      egg.scale.y = 1.3;
      const egX = (Math.random() - 0.5) * w * 0.6;
      const egZ = (Math.random() - 0.5) * d * 0.6;
      egg.position.set(egX, getTerrainHeight(egX, egZ, 1.2) + 0.2, egZ);
      egg.castShadow = true;
      mctx.envGroup.add(egg);
    }

    // Stalactites (hanging from above) (40)
    const stalMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const sH = 1 + Math.random() * 3;
      const stal = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.2, sH, 12), stalMat);
      stal.rotation.z = Math.PI; // point downward
      stal.position.set(
        (Math.random() - 0.5) * w * 0.9,
        10 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.9
      );
      mctx.envGroup.add(stal);
    }

    // Stalagmites (floor) (35)
    for (let i = 0; i < 35; i++) {
      const sH = 0.5 + Math.random() * 2;
      const stalag = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.25, sH, 12), stalMat);
      stalag.position.set(
        (Math.random() - 0.5) * w * 0.9,
        sH / 2,
        (Math.random() - 0.5) * d * 0.9
      );
      stalag.castShadow = true;
      mctx.envGroup.add(stalag);
    }

    // Fire braziers (12)
    const brazierMat = new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 12; i++) {
      const bGroup = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.4, 12), brazierMat);
      bowl.position.y = 1.2;
      bGroup.add(bowl);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 12), brazierMat);
      stand.position.y = 0.6;
      bGroup.add(stand);
      // Fire
      const fireMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.8,
      });
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 12), fireMat);
      fire.position.y = 1.6;
      bGroup.add(fire);

      const fireLight = new THREE.PointLight(0xff6600, 3, 18);
      fireLight.position.set(0, 2, 0);
      bGroup.add(fireLight);
      mctx.torchLights.push(fireLight);

      const brX = (Math.random() - 0.5) * w * 0.8;
      const brZ = (Math.random() - 0.5) * d * 0.8;
      bGroup.position.set(brX, getTerrainHeight(brX, brZ, 1.2), brZ);
      mctx.envGroup.add(bGroup);
    }

    // Dragon skulls (6)
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const skullGroup = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), skullMat);
      head.scale.set(1.5, 0.8, 1);
      skullGroup.add(head);
      // Snout
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), skullMat);
      snout.position.set(0, -0.1, 0.7);
      skullGroup.add(snout);
      // Horns
      for (const hx of [-0.4, 0.4]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 12), skullMat);
        horn.position.set(hx, 0.5, -0.2);
        horn.rotation.z = hx < 0 ? 0.4 : -0.4;
        skullGroup.add(horn);
      }
      // Eye sockets (dark)
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      for (const ex of [-0.25, 0.25]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), eyeMat);
        eye.position.set(ex, 0.15, 0.55);
        skullGroup.add(eye);
      }
      const dsX = (Math.random() - 0.5) * w * 0.7;
      const dsZ = (Math.random() - 0.5) * d * 0.7;
      skullGroup.position.set(dsX, getTerrainHeight(dsX, dsZ, 1.2) + 0.3, dsZ);
      skullGroup.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(skullGroup);
    }

    // Dragon skull/bone trophy wall displays (8) - mounted on cavern walls
    for (let i = 0; i < 8; i++) {
      const trophyGrp = new THREE.Group();
      // Wall mount plaque
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }));
      trophyGrp.add(plaque);
      // Skull on mount
      const tSkull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 }));
      tSkull.scale.set(1.3, 0.8, 1);
      tSkull.position.z = 0.15;
      trophyGrp.add(tSkull);
      // Jaw bone
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 }));
      jaw.position.set(0, -0.15, 0.25);
      trophyGrp.add(jaw);
      // Horn trophies on sides
      for (const hx of [-0.35, 0.35]) {
        const tHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.4, 8),
          new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.6 }));
        tHorn.position.set(hx, 0.15, 0.1);
        tHorn.rotation.z = hx < 0 ? 0.5 : -0.5;
        trophyGrp.add(tHorn);
      }
      // Crossed bone decoration
      for (const bRot of [-0.4, 0.4]) {
        const crossBone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.6, 12),
          new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 }));
        crossBone.position.set(0, -0.25, 0.08);
        crossBone.rotation.z = bRot;
        trophyGrp.add(crossBone);
      }
      const trAng = (i / 8) * Math.PI * 2;
      const trR = w * 0.39;
      trophyGrp.position.set(Math.cos(trAng) * trR, 4 + Math.random() * 3, Math.sin(trAng) * trR);
      trophyGrp.rotation.y = -trAng + Math.PI;
      mctx.envGroup.add(trophyGrp);
    }

    // Broken weapon piles (14)
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 14; i++) {
      const wpGroup = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6 + Math.random() * 0.4, 0.02), weaponMat);
        sword.position.set((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4);
        sword.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5);
        wpGroup.add(sword);
      }
      const wpX = (Math.random() - 0.5) * w * 0.8;
      const wpZ = (Math.random() - 0.5) * d * 0.8;
      wpGroup.position.set(wpX, getTerrainHeight(wpX, wpZ, 1.2), wpZ);
      mctx.envGroup.add(wpGroup);
    }

    // Molten cracks (12)
    const moltenMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.5,
    });
    for (let i = 0; i < 12; i++) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 8 + Math.random() * 10), moltenMat);
      crack.rotation.x = -Math.PI / 2;
      crack.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.04,
        (Math.random() - 0.5) * d * 0.7
      );
      crack.rotation.z = Math.random() * Math.PI;
      mctx.envGroup.add(crack);
    }

    // Treasure chests (12)
    const chestWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const chestMetalMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.2 });
    for (let i = 0; i < 12; i++) {
      const chestGrp = new THREE.Group();
      const chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), chestWoodMat);
      chestBase.position.y = 0.15;
      chestBase.castShadow = true;
      chestGrp.add(chestBase);
      const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.62, 44, 2, false, 0, Math.PI), chestWoodMat);
      chestLid.rotation.z = Math.PI / 2;
      chestLid.position.y = 0.3;
      chestGrp.add(chestLid);
      // Metal bands
      for (const bz of [-0.12, 0, 0.12]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.03), chestMetalMat);
        band.position.set(0, 0.15, bz);
        chestGrp.add(band);
      }
      // Lock
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), chestMetalMat);
      lock.position.set(0, 0.2, 0.22);
      chestGrp.add(lock);
      const tcX = (Math.random() - 0.5) * w * 0.7;
      const tcZ = (Math.random() - 0.5) * d * 0.7;
      chestGrp.position.set(tcX, getTerrainHeight(tcX, tcZ, 1.2), tcZ);
      chestGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(chestGrp);
    }

    // Gem clusters (18)
    const gemColors = [0xff2244, 0x2244ff, 0x22ff44, 0xff44ff, 0x44ffff, 0xffaa22];
    for (let i = 0; i < 18; i++) {
      const gemGrp = new THREE.Group();
      const numGems = 3 + Math.floor(Math.random() * 4);
      for (let g = 0; g < numGems; g++) {
        const gColor = gemColors[Math.floor(Math.random() * gemColors.length)];
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.06 + Math.random() * 0.1, 3),
          new THREE.MeshStandardMaterial({ color: gColor, emissive: gColor, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.2 })
        );
        gem.position.set((Math.random() - 0.5) * 0.4, Math.random() * 0.15, (Math.random() - 0.5) * 0.4);
        gem.rotation.set(Math.random(), Math.random(), Math.random());
        gemGrp.add(gem);
      }
      gemGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.05,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(gemGrp);
    }

    // Ancient rune-carved pillars (8)
    const runePillarMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const rpGrp = new THREE.Group();
      const rpH = 5 + Math.random() * 4;
      const rpCol = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, rpH, 12), runePillarMat);
      rpCol.position.y = rpH / 2;
      rpCol.castShadow = true;
      rpGrp.add(rpCol);
      // Glowing runes spiraling up
      for (let r = 0; r < 6; r++) {
        const runeAngle = (r / 6) * Math.PI * 4;
        const runeY = (r / 6) * rpH + 0.5;
        const rune = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.15, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff8800, emissiveIntensity: 0.8 })
        );
        rune.position.set(Math.cos(runeAngle) * 0.55, runeY, Math.sin(runeAngle) * 0.55);
        rune.lookAt(new THREE.Vector3(0, runeY, 0));
        rpGrp.add(rune);
      }
      const rpX = (Math.random() - 0.5) * w * 0.75;
      const rpZ = (Math.random() - 0.5) * d * 0.75;
      rpGrp.position.set(rpX, getTerrainHeight(rpX, rpZ, 1.2), rpZ);
      mctx.envGroup.add(rpGrp);
    }

    // Hanging chains with shackles (10)
    const dsChainMat = new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      const chainGrp = new THREE.Group();
      const numLinks = 6 + Math.floor(Math.random() * 6);
      for (let c = 0; c < numLinks; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 10, 24), dsChainMat);
        link.position.y = -c * 0.1;
        link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2;
        chainGrp.add(link);
      }
      // Shackle at bottom
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 44, 62, Math.PI), dsChainMat);
      shackle.position.y = -numLinks * 0.1 - 0.05;
      shackle.rotation.x = Math.PI;
      chainGrp.add(shackle);
      chainGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        8 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(chainGrp);
    }

    // Cavern wall segments (curved backdrop) (6)
    const wallSegMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const wallAngle = (i / 6) * Math.PI * 2;
      const wallR = w * 0.42;
      const wallH = 10 + Math.random() * 5;
      const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(8, wallH, 0.8), wallSegMat);
      wallSeg.position.set(Math.cos(wallAngle) * wallR, wallH / 2, Math.sin(wallAngle) * wallR);
      wallSeg.rotation.y = -wallAngle + Math.PI / 2;
      wallSeg.castShadow = true;
      wallSeg.receiveShadow = true;
      mctx.envGroup.add(wallSeg);
      // Scale-pattern wall decoration using overlapping small flat circles
      for (let sc = 0; sc < 8; sc++) {
        const scaleCirc = new THREE.Mesh(new THREE.CircleGeometry(0.12 + Math.random() * 0.06, 12),
          new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide }));
        const scY = 1 + Math.random() * (wallH - 2);
        const scOff = (Math.random() - 0.5) * 6;
        scaleCirc.position.set(
          Math.cos(wallAngle) * wallR + Math.cos(wallAngle + Math.PI / 2) * scOff,
          scY,
          Math.sin(wallAngle) * wallR + Math.sin(wallAngle + Math.PI / 2) * scOff
        );
        scaleCirc.rotation.y = -wallAngle + Math.PI / 2;
        mctx.envGroup.add(scaleCirc);
      }
    }

    // Nest material (6) - woven cylinder rings on floor
    for (let i = 0; i < 6; i++) {
      const nestGrp = new THREE.Group();
      const nestR = 0.8 + Math.random() * 1.2;
      // Woven ring layers
      for (let nr = 0; nr < 5; nr++) {
        const ringR = nestR - nr * 0.15;
        const nestRing = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.03 + Math.random() * 0.02, 12, 16),
          new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.95 }));
        nestRing.rotation.x = -Math.PI / 2;
        nestRing.position.y = nr * 0.04;
        nestGrp.add(nestRing);
      }
      // Cross-woven strands
      for (let ns = 0; ns < 6; ns++) {
        const strandAng = (ns / 6) * Math.PI * 2;
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, nestR * 1.8, 10),
          new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.95 }));
        strand.rotation.z = Math.PI / 2;
        strand.rotation.y = strandAng;
        strand.position.y = 0.08;
        nestGrp.add(strand);
      }
      const nsX = (Math.random() - 0.5) * w * 0.6;
      const nsZ = (Math.random() - 0.5) * d * 0.6;
      nestGrp.position.set(nsX, getTerrainHeight(nsX, nsZ, 1.2), nsZ);
      mctx.envGroup.add(nestGrp);
    }

    // Ancient weapon racks (6) with weapon silhouettes
    for (let i = 0; i < 6; i++) {
      const rackGrp = new THREE.Group();
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 });
      // Rack frame - two vertical posts
      for (const rx of [-0.6, 0.6]) {
        const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), rackMat);
        rPost.position.set(rx, 1.0, 0);
        rackGrp.add(rPost);
      }
      // Horizontal bars
      for (const ry of [0.5, 1.2, 1.8]) {
        const rBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), rackMat);
        rBar.rotation.z = Math.PI / 2;
        rBar.position.y = ry;
        rackGrp.add(rBar);
      }
      // Weapon silhouettes hanging on rack
      const wpMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 });
      // Sword
      const rSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.015), wpMat);
      rSword.position.set(-0.25, 1.0, 0.03);
      rackGrp.add(rSword);
      const rGuard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.02), wpMat);
      rGuard.position.set(-0.25, 0.6, 0.03);
      rackGrp.add(rGuard);
      // Axe
      const rAxeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 12), rackMat);
      rAxeHandle.position.set(0.1, 1.0, 0.03);
      rackGrp.add(rAxeHandle);
      const rAxeHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.02), wpMat);
      rAxeHead.position.set(0.1, 1.35, 0.03);
      rackGrp.add(rAxeHead);
      // Spear
      const rSpear = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 12), rackMat);
      rSpear.position.set(0.35, 1.0, 0.03);
      rackGrp.add(rSpear);
      const rSpearTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 10), wpMat);
      rSpearTip.position.set(0.35, 1.8, 0.03);
      rackGrp.add(rSpearTip);
      const wrAng = (i / 6) * Math.PI * 2 + 0.3;
      const wrR = w * 0.38;
      rackGrp.position.set(Math.cos(wrAng) * wrR, getTerrainHeight(Math.cos(wrAng) * wrR, Math.sin(wrAng) * wrR, 1.2), Math.sin(wrAng) * wrR);
      rackGrp.rotation.y = -wrAng + Math.PI;
      mctx.envGroup.add(rackGrp);
    }

    // Scattered armor pieces (10)
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      const armorGrp = new THREE.Group();
      // Shield
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), armorMat);
      shield.rotation.x = -0.8;
      shield.position.y = 0.1;
      armorGrp.add(shield);
      // Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), armorMat);
      helmet.scale.y = 0.7;
      helmet.position.set(0.2, 0.08, 0.15);
      armorGrp.add(helmet);
      const arX = (Math.random() - 0.5) * w * 0.75;
      const arZ = (Math.random() - 0.5) * d * 0.75;
      armorGrp.position.set(arX, getTerrainHeight(arX, arZ, 1.2), arZ);
      armorGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(armorGrp);
    }

    // Dragon sleeping mound (1 centerpiece)
    const moundGrp = new THREE.Group();
    const moundMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
    // Large body (elongated sphere)
    const dragonBody = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), moundMat);
    dragonBody.scale.set(2, 0.6, 1);
    dragonBody.position.y = 1.2;
    moundGrp.add(dragonBody);
    // Neck
    const dragonNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 3, 12), moundMat);
    dragonNeck.position.set(4, 1.5, 0);
    dragonNeck.rotation.z = Math.PI / 3;
    moundGrp.add(dragonNeck);
    // Head
    const dragonHead = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), moundMat);
    dragonHead.scale.set(1.5, 0.7, 1);
    dragonHead.position.set(5.5, 2.5, 0);
    moundGrp.add(dragonHead);
    // Snout
    const dragonSnout = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.6), moundMat);
    dragonSnout.position.set(6.5, 2.3, 0);
    moundGrp.add(dragonSnout);
    // Horns
    for (const hz of [-0.3, 0.3]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 12), cavernMat);
      horn.position.set(5.3, 3.2, hz);
      horn.rotation.z = hz < 0 ? 0.3 : -0.3;
      moundGrp.add(horn);
    }
    // Tail
    for (let t = 0; t < 8; t++) {
      const tailSeg = new THREE.Mesh(new THREE.SphereGeometry(0.8 - t * 0.08, 16, 12), moundMat);
      tailSeg.position.set(-3 - t * 1, 0.6 - t * 0.05, Math.sin(t * 0.4) * 0.8);
      moundGrp.add(tailSeg);
    }
    // Wings (folded)
    for (const wz of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(4, 2),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, side: THREE.DoubleSide }));
      wing.position.set(0, 2.5, wz * 2);
      wing.rotation.x = wz * 0.8;
      wing.rotation.z = 0.3;
      moundGrp.add(wing);
    }
    // Sleeping smoke from nostrils
    for (let s = 0; s < 3; s++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.15 + s * 0.1, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.15 - s * 0.04 }));
      smoke.position.set(7.2 + s * 0.3, 2.5 + s * 0.3, 0);
      moundGrp.add(smoke);
    }
    moundGrp.position.set(-w * 0.15, getTerrainHeight(-w * 0.15, d * 0.15, 1.2), d * 0.15);
    mctx.envGroup.add(moundGrp);

    // Jeweled goblets (15)
    const gobletMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.7, roughness: 0.2 });
    for (let i = 0; i < 15; i++) {
      const gobGrp = new THREE.Group();
      const gobBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 12), gobletMat);
      gobGrp.add(gobBase);
      const gobStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 12), gobletMat);
      gobStem.position.y = 0.06;
      gobGrp.add(gobStem);
      const gobCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.06, 12), gobletMat);
      gobCup.position.y = 0.15;
      gobGrp.add(gobCup);
      // Gem on goblet
      const gemColor = [0xff2244, 0x2244ff, 0x22ff44][i % 3];
      const gobGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 3),
        new THREE.MeshStandardMaterial({ color: gemColor, emissive: gemColor, emissiveIntensity: 0.4 }));
      gobGem.position.set(0.05, 0.15, 0);
      gobGrp.add(gobGem);
      gobGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.02,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(gobGrp);
    }

    // Lava veins in cavern floor (15)
    const lavaVeinMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.4,
    });
    for (let i = 0; i < 15; i++) {
      const veinLen = 5 + Math.random() * 10;
      const vein = new THREE.Mesh(new THREE.PlaneGeometry(0.2, veinLen), lavaVeinMat);
      vein.rotation.x = -Math.PI / 2;
      vein.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.03,
        (Math.random() - 0.5) * d * 0.8
      );
      vein.rotation.z = Math.random() * Math.PI;
      mctx.envGroup.add(vein);
    }

    // Cavern ceiling stalactite clusters (6)
    for (let i = 0; i < 6; i++) {
      const clustGrp = new THREE.Group();
      const numStal = 5 + Math.floor(Math.random() * 5);
      for (let s = 0; s < numStal; s++) {
        const sH = 0.5 + Math.random() * 2;
        const stal = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.15, sH, 12), stalMat);
        stal.rotation.z = Math.PI;
        stal.position.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        clustGrp.add(stal);
      }
      clustGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        12 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(clustGrp);
    }

    // Ancient dragon claw marks on ground (14)
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 14; i++) {
      const clawGrp = new THREE.Group();
      for (let c = 0; c < 3; c++) {
        const claw = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2 + Math.random()), clawMat);
        claw.rotation.x = -Math.PI / 2;
        claw.position.set(c * 0.3 - 0.3, 0.02, 0);
        clawGrp.add(claw);
      }
      clawGrp.position.set((Math.random() - 0.5) * w * 0.8, 0, (Math.random() - 0.5) * d * 0.8);
      clawGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(clawGrp);
    }

    // Dragon statues (4) - imposing stone guardians
    for (let i = 0; i < 4; i++) {
      const statGrp = new THREE.Group();
      const statMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.7, metalness: 0.1 });
      // Pedestal
      const ped = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), statMat);
      ped.position.y = 0.4;
      ped.castShadow = true;
      statGrp.add(ped);
      // Body
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), statMat);
      body.scale.set(1.2, 0.8, 1);
      body.position.y = 1.5;
      statGrp.add(body);
      // Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.8, 12), statMat);
      neck.position.set(0.4, 2.0, 0);
      neck.rotation.z = -0.4;
      statGrp.add(neck);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), statMat);
      head.scale.set(1.4, 0.8, 1);
      head.position.set(0.7, 2.4, 0);
      statGrp.add(head);
      // Horns
      for (const hz of [-0.12, 0.12]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 12), statMat);
        horn.position.set(0.6, 2.7, hz);
        horn.rotation.z = hz < 0 ? 0.3 : -0.3;
        statGrp.add(horn);
      }
      // Wings (folded)
      for (const wz of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.7, side: THREE.DoubleSide }));
        wing.position.set(-0.2, 1.8, wz * 0.5);
        wing.rotation.x = wz * 0.6;
        wing.rotation.z = 0.3;
        statGrp.add(wing);
      }
      // Glowing eyes
      for (const ex of [-0.06, 0.06]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 }));
        eye.position.set(0.85, 2.5, ex);
        statGrp.add(eye);
      }
      const stX = (Math.random() - 0.5) * w * 0.6;
      const stZ = (Math.random() - 0.5) * d * 0.6;
      statGrp.position.set(stX, getTerrainHeight(stX, stZ, 1.2), stZ);
      statGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(statGrp);
    }

    // Dragon scales scattered on floor (20)
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.5, metalness: 0.4 });
    for (let i = 0; i < 20; i++) {
      const scale = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.06, 16), scaleMat);
      scale.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      scale.rotation.z = Math.random() * Math.PI * 2;
      const scX = (Math.random() - 0.5) * w * 0.8;
      const scZ = (Math.random() - 0.5) * d * 0.8;
      scale.position.set(scX, getTerrainHeight(scX, scZ, 1.2) + 0.02, scZ);
      mctx.envGroup.add(scale);
    }

    // Ancient dragon murals on walls (6)
    for (let i = 0; i < 6; i++) {
      const muralGrp = new THREE.Group();
      const muralW = 3 + Math.random() * 2;
      const muralH = 2 + Math.random() * 1.5;
      // Background panel
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(muralW, muralH),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, side: THREE.DoubleSide }));
      muralGrp.add(panel);
      // Ornate border
      const borderMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.6, roughness: 0.3 });
      for (const bx of [-muralW / 2, muralW / 2]) {
        const vBorder = new THREE.Mesh(new THREE.BoxGeometry(0.06, muralH, 0.04), borderMat);
        vBorder.position.x = bx;
        muralGrp.add(vBorder);
      }
      for (const by of [-muralH / 2, muralH / 2]) {
        const hBorder = new THREE.Mesh(new THREE.BoxGeometry(muralW, 0.06, 0.04), borderMat);
        hBorder.position.y = by;
        muralGrp.add(hBorder);
      }
      // Dragon silhouette (simplified)
      const dragonSilh = new THREE.Mesh(new THREE.PlaneGeometry(muralW * 0.6, muralH * 0.5),
        new THREE.MeshStandardMaterial({ color: 0xaa7722, emissive: 0x553311, emissiveIntensity: 0.2, side: THREE.DoubleSide }));
      dragonSilh.position.z = 0.02;
      muralGrp.add(dragonSilh);
      const mAng = (i / 6) * Math.PI * 2;
      const mR = w * 0.38;
      muralGrp.position.set(Math.cos(mAng) * mR, 3 + Math.random() * 2, Math.sin(mAng) * mR);
      muralGrp.rotation.y = -mAng + Math.PI;
      mctx.envGroup.add(muralGrp);
    }

    // Lava pools with glow (4) - scattered pools with rim rocks
    for (let i = 0; i < 4; i++) {
      const lpGrp = new THREE.Group();
      const lpR = 1.0 + Math.random() * 1.5;
      const lpRim = new THREE.Mesh(new THREE.TorusGeometry(lpR, 0.25, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
      lpRim.rotation.x = -Math.PI / 2;
      lpRim.position.y = 0.1;
      lpGrp.add(lpRim);
      const lpSurf = new THREE.Mesh(new THREE.CircleGeometry(lpR - 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.0, roughness: 0.2 }));
      lpSurf.rotation.x = -Math.PI / 2;
      lpSurf.position.y = 0.06;
      lpGrp.add(lpSurf);
      // Bubbles
      for (let b = 0; b < 3; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xff7700, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 }));
        const bAng = Math.random() * Math.PI * 2;
        bubble.position.set(Math.cos(bAng) * (lpR - 0.5) * Math.random(), 0.12, Math.sin(bAng) * (lpR - 0.5) * Math.random());
        lpGrp.add(bubble);
      }
      const lpLight = new THREE.PointLight(0xff4400, 2, 10);
      lpLight.position.y = 0.5;
      lpGrp.add(lpLight);
      mctx.torchLights.push(lpLight);
      const lpX = (Math.random() - 0.5) * w * 0.6;
      const lpZ = (Math.random() - 0.5) * d * 0.6;
      lpGrp.position.set(lpX, getTerrainHeight(lpX, lpZ, 1.2), lpZ);
      mctx.envGroup.add(lpGrp);
    }

    // Flame braziers (extra 6 floor-standing)
    for (let i = 0; i < 6; i++) {
      const fbGrp = new THREE.Group();
      const fbBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.5, roughness: 0.4 }));
      fbGrp.add(fbBase);
      const fbBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.5, roughness: 0.4 }));
      fbBowl.position.y = 0.12;
      fbGrp.add(fbBowl);
      const fbFire = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0, transparent: true, opacity: 0.7 }));
      fbFire.position.y = 0.35;
      fbGrp.add(fbFire);
      const fbLight = new THREE.PointLight(0xff6600, 1.5, 8);
      fbLight.position.y = 0.4;
      fbGrp.add(fbLight);
      mctx.torchLights.push(fbLight);
      const fbX = (Math.random() - 0.5) * w * 0.75;
      const fbZ = (Math.random() - 0.5) * d * 0.75;
      fbGrp.position.set(fbX, getTerrainHeight(fbX, fbZ, 1.2), fbZ);
      mctx.envGroup.add(fbGrp);
    }

    // Scattered crown jewels (8)
    for (let i = 0; i < 8; i++) {
      const crownGrp = new THREE.Group();
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.8, roughness: 0.2 });
      const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 10, 24), crownMat);
      crownRing.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      crownGrp.add(crownRing);
      // Crown points
      for (let p = 0; p < 5; p++) {
        const point = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 12), crownMat);
        const pAng = (p / 5) * Math.PI * 2;
        point.position.set(Math.cos(pAng) * 0.08, 0.02, Math.sin(pAng) * 0.08);
        crownGrp.add(point);
      }
      // Gem on crown
      const crGemColor = [0xff2244, 0x2244ff, 0x22ff44][i % 3];
      const crGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 3),
        new THREE.MeshStandardMaterial({ color: crGemColor, emissive: crGemColor, emissiveIntensity: 0.5 }));
      crGem.position.y = 0.03;
      crownGrp.add(crGem);
      const crX = (Math.random() - 0.5) * w * 0.7;
      const crZ = (Math.random() - 0.5) * d * 0.7;
      crownGrp.position.set(crX, getTerrainHeight(crX, crZ, 1.2) + 0.02, crZ);
      mctx.envGroup.add(crownGrp);
    }
}

export function buildSunscorchDesert(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0xddcc99, 0.008);
    mctx.applyTerrainColors(0xbb9955, 0xddbb77, 1.4);
    mctx.dirLight.color.setHex(0xffeebb);
    mctx.dirLight.intensity = 1.8;
    mctx.ambientLight.color.setHex(0x665533);
    mctx.ambientLight.intensity = 0.7;
    mctx.hemiLight.color.setHex(0xeedd99);
    mctx.hemiLight.groundColor.setHex(0x886644);
    const hw = w / 2, hd = d / 2;

    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.95 });
    const darkSandMat = new THREE.MeshStandardMaterial({ color: 0xb89960, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.85 });
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0xaa9970, roughness: 0.8 });
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.7 });
    const cactusFlowerMat = new THREE.MeshStandardMaterial({ color: 0xff5577, roughness: 0.5 });
    const oasisWaterMat = new THREE.MeshStandardMaterial({ color: 0x3399cc, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 });
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x8a9a3a, roughness: 0.6, side: THREE.DoubleSide });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.7 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, side: THREE.DoubleSide });
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.8, side: THREE.DoubleSide });

    // ── Sand dunes (flat ground patches for color variation) ──
    const duneRidgeMat = new THREE.MeshStandardMaterial({ color: 0xe0c888, roughness: 0.88 });
    const duneRippleThinMat = new THREE.MeshStandardMaterial({ color: 0xc8a868, roughness: 0.95 });
    const duneGrassMat = new THREE.MeshStandardMaterial({ color: 0x889944, roughness: 0.8 });
    for (let i = 0; i < 35; i++) {
      const sx = 12 + Math.random() * 24;
      const sy = 0.06 + Math.random() * 0.1;
      const sz = 12 + Math.random() * 24;
      const duneGrp = new THREE.Group();
      const geo = new THREE.SphereGeometry(1, 14, 10);
      geo.scale(sx, sy, sz);
      const dune = new THREE.Mesh(geo, i % 3 === 0 ? darkSandMat : sandMat);
      duneGrp.add(dune);

      // Wind-swept ridge line along dune crest
      const duneRidgeLen = sx * 0.7 + Math.random() * sx * 0.3;
      const duneRidge = new THREE.Mesh(
        new THREE.BoxGeometry(duneRidgeLen, 0.03, 0.08),
        duneRidgeMat,
      );
      duneRidge.position.set(sx * 0.05, sy * 0.95, -sz * 0.05);
      duneRidge.rotation.y = (Math.random() - 0.5) * 0.15;
      duneGrp.add(duneRidge);

      // Sand ripple pattern lines on wind-facing slope
      const duneRippleCount = 4 + Math.floor(Math.random() * 4);
      for (let rp = 0; rp < duneRippleCount; rp++) {
        const duneRippleLine = new THREE.Mesh(
          new THREE.BoxGeometry(sx * 0.3 + Math.random() * sx * 0.2, 0.015, 0.04),
          duneRippleThinMat,
        );
        duneRippleLine.position.set(
          (Math.random() - 0.5) * sx * 0.4,
          sy * 0.3 + rp * sy * 0.08,
          sz * 0.15 + rp * 0.3,
        );
        duneRippleLine.rotation.y = Math.sin(rp * 0.5) * 0.1;
        duneGrp.add(duneRippleLine);
      }

      // Scattered desert grass tufts on some dunes
      if (Math.random() > 0.6) {
        const duneTuftCount = 2 + Math.floor(Math.random() * 3);
        for (let gt = 0; gt < duneTuftCount; gt++) {
          const duneTuftGrp = new THREE.Group();
          for (let gb = 0; gb < 4 + Math.floor(Math.random() * 3); gb++) {
            const duneBlade = new THREE.Mesh(
              new THREE.CylinderGeometry(0.008, 0.02, 0.3 + Math.random() * 0.25, 5),
              duneGrassMat,
            );
            duneBlade.position.set((Math.random() - 0.5) * 0.1, 0.15, (Math.random() - 0.5) * 0.1);
            duneBlade.rotation.x = (Math.random() - 0.5) * 0.5;
            duneBlade.rotation.z = (Math.random() - 0.5) * 0.5;
            duneTuftGrp.add(duneBlade);
          }
          duneTuftGrp.position.set(
            (Math.random() - 0.5) * sx * 0.5,
            sy * 0.5 + Math.random() * sy * 0.3,
            (Math.random() - 0.5) * sz * 0.3,
          );
          duneGrp.add(duneTuftGrp);
        }
      }

      duneGrp.position.set(
        (Math.random() - 0.5) * w * 0.9,
        sy * 0.25,
        (Math.random() - 0.5) * d * 0.9,
      );
      mctx.scene.add(duneGrp);
    }

    // ── Cacti scattered around ──
    for (let i = 0; i < 40; i++) {
      const cactus = new THREE.Group();
      const h = 1.5 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, h, 10), cactusMat);
      trunk.position.y = h / 2;
      cactus.add(trunk);
      // Arms
      if (Math.random() > 0.4) {
        const armH = 0.8 + Math.random() * 1.2;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, armH, 10), cactusMat);
        arm.position.set(0.4, h * 0.5 + armH * 0.3, 0);
        arm.rotation.z = -0.6;
        cactus.add(arm);
        const armUp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, armH * 0.7, 10), cactusMat);
        armUp.position.set(0.65, h * 0.5 + armH * 0.6, 0);
        cactus.add(armUp);
      }
      if (Math.random() > 0.5) {
        const armH = 0.6 + Math.random();
        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, armH, 10), cactusMat);
        arm2.position.set(-0.35, h * 0.4, 0);
        arm2.rotation.z = 0.7;
        cactus.add(arm2);
      }
      // Flower on top
      if (Math.random() > 0.6) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 23), cactusFlowerMat);
        flower.position.y = h + 0.1;
        cactus.add(flower);
      }
      const cacX = (Math.random() - 0.5) * w * 0.85;
      const cacZ = (Math.random() - 0.5) * d * 0.85;
      cactus.position.set(cacX, getTerrainHeight(cacX, cacZ, 1.4), cacZ);
      mctx.scene.add(cactus);
    }

    // ── Ancient ruins (broken pillars, walls, arches) ──
    for (let i = 0; i < 8; i++) {
      const ruin = new THREE.Group();
      const cx = (Math.random() - 0.5) * w * 0.7;
      const cz = (Math.random() - 0.5) * d * 0.7;
      // Broken pillars
      const pillarCount = 3 + Math.floor(Math.random() * 5);
      for (let p = 0; p < pillarCount; p++) {
        const ph = 2 + Math.random() * 4;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, ph, 12), ruinMat);
        pillar.position.set(
          (Math.random() - 0.5) * 8,
          ph / 2,
          (Math.random() - 0.5) * 8,
        );
        pillar.rotation.x = (Math.random() - 0.5) * 0.15;
        pillar.rotation.z = (Math.random() - 0.5) * 0.15;
        ruin.add(pillar);
        // Broken top cap
        if (Math.random() > 0.5) {
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.3, 12), ruinMat);
          cap.position.set(pillar.position.x, ph + 0.15, pillar.position.z);
          ruin.add(cap);
        }
      }
      // Stone slabs on ground
      for (let s = 0; s < 4; s++) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(1 + Math.random() * 2, 0.3, 1 + Math.random() * 2),
          stoneMat,
        );
        slab.position.set(
          (Math.random() - 0.5) * 10,
          0.15,
          (Math.random() - 0.5) * 10,
        );
        slab.rotation.y = Math.random() * Math.PI;
        ruin.add(slab);
      }
      // Arch (sometimes) with brick detail, doorway, pottery
      if (Math.random() > 0.5) {
        const archL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), ruinMat);
        archL.position.set(-2, 2.5, 0);
        ruin.add(archL);
        const archR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), ruinMat);
        archR.position.set(2, 2.5, 0);
        ruin.add(archR);
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 0.8), ruinMat);
        archTop.position.set(0, 5.3, 0);
        ruin.add(archTop);

        // Brick/block lines on arch pillars
        const ruinBrickLineMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.9 });
        for (const ruinPillarSide of [-2, 2]) {
          for (let bl = 0; bl < 8; bl++) {
            const ruinBrickLine = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.62), ruinBrickLineMat);
            ruinBrickLine.position.set(ruinPillarSide, 0.3 + bl * 0.6, 0);
            ruin.add(ruinBrickLine);
          }
        }

        // Doorway opening (dark recessed plane)
        const ruinDoorwayMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1.0 });
        const ruinDoorway = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.5), ruinDoorwayMat);
        ruinDoorway.position.set(0, 1.25, -0.01);
        ruin.add(ruinDoorway);

        // Doorway threshold step
        const ruinThreshold = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.4), stoneMat);
        ruinThreshold.position.set(0, 0.075, 0.3);
        ruin.add(ruinThreshold);

        // Awning shadow (thin dark plane above doorway)
        const ruinAwningShadowMat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.9, side: THREE.DoubleSide });
        const ruinAwning = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), ruinAwningShadowMat);
        ruinAwning.position.set(0, 2.8, 0.4);
        ruinAwning.rotation.x = -0.3;
        ruin.add(ruinAwning);
      }

      // Pottery near ruin entrances
      const ruinPotteryMat = new THREE.MeshStandardMaterial({ color: 0xbb7744, roughness: 0.7 });
      if (Math.random() > 0.4) {
        for (let rp = 0; rp < 2 + Math.floor(Math.random() * 2); rp++) {
          const ruinPotH = 0.2 + Math.random() * 0.2;
          const ruinPot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, ruinPotH, 16), ruinPotteryMat);
          ruinPot.position.set((Math.random() - 0.5) * 3, ruinPotH / 2, (Math.random() - 0.5) * 3);
          ruin.add(ruinPot);
          // Pot rim
          const ruinPotRim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 12), ruinPotteryMat);
          ruinPotRim.position.set(ruinPot.position.x, ruinPotH, ruinPot.position.z);
          ruinPotRim.rotation.x = Math.PI / 2;
          ruin.add(ruinPotRim);
        }
      }

      ruin.position.set(cx, getTerrainHeight(cx, cz, 1.4), cz);
      mctx.scene.add(ruin);
    }

    // ── Oasis (water pool with palm trees, lily pads, ripples, water plants) ──
    const oasisX = -hw * 0.3, oasisZ = -hd * 0.3;
    const oasisPool = new THREE.Mesh(new THREE.CircleGeometry(8, 16), oasisWaterMat);
    oasisPool.rotation.x = -Math.PI / 2;
    oasisPool.position.set(oasisX, getTerrainHeight(oasisX, oasisZ, 1.4) + 0.05, oasisZ);
    mctx.scene.add(oasisPool);
    // Green ring around oasis
    const grassRing = new THREE.Mesh(
      new THREE.RingGeometry(7, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0x558833, roughness: 0.8 }),
    );
    grassRing.rotation.x = -Math.PI / 2;
    grassRing.position.set(oasisX, getTerrainHeight(oasisX, oasisZ, 1.4) + 0.02, oasisZ);
    mctx.scene.add(grassRing);

    // Lily pads floating on oasis surface
    const oasisLilyMat = new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.6, side: THREE.DoubleSide });
    const oasisLilyFlowerMat = new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.5 });
    for (let lp = 0; lp < 8; lp++) {
      const oasisLilyAngle = Math.random() * Math.PI * 2;
      const oasisLilyDist = 1.5 + Math.random() * 5;
      const oasisLilyPad = new THREE.Mesh(new THREE.CircleGeometry(0.25 + Math.random() * 0.2, 16), oasisLilyMat);
      oasisLilyPad.rotation.x = -Math.PI / 2;
      oasisLilyPad.position.set(
        oasisX + Math.cos(oasisLilyAngle) * oasisLilyDist,
        getTerrainHeight(oasisX, oasisZ, 1.4) + 0.07,
        oasisZ + Math.sin(oasisLilyAngle) * oasisLilyDist,
      );
      mctx.scene.add(oasisLilyPad);
      // Flower on some lily pads
      if (Math.random() > 0.5) {
        const oasisLilyFlower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), oasisLilyFlowerMat);
        oasisLilyFlower.scale.y = 0.6;
        oasisLilyFlower.position.set(oasisLilyPad.position.x, oasisLilyPad.position.y + 0.06, oasisLilyPad.position.z);
        mctx.scene.add(oasisLilyFlower);
      }
    }

    // Water ripple rings on oasis surface
    const oasisRippleMat = new THREE.MeshStandardMaterial({ color: 0x4499cc, roughness: 0.1, transparent: true, opacity: 0.25 });
    for (let wr = 0; wr < 5; wr++) {
      const oasisRippleAngle = Math.random() * Math.PI * 2;
      const oasisRippleDist = 1 + Math.random() * 5;
      const oasisRippleRing = new THREE.Mesh(new THREE.RingGeometry(0.3 + Math.random() * 0.4, 0.35 + Math.random() * 0.45, 24), oasisRippleMat);
      oasisRippleRing.rotation.x = -Math.PI / 2;
      oasisRippleRing.position.set(
        oasisX + Math.cos(oasisRippleAngle) * oasisRippleDist,
        getTerrainHeight(oasisX, oasisZ, 1.4) + 0.06,
        oasisZ + Math.sin(oasisRippleAngle) * oasisRippleDist,
      );
      mctx.scene.add(oasisRippleRing);
    }

    // Reeds / water plants at oasis edge
    const oasisReedMat = new THREE.MeshStandardMaterial({ color: 0x557733, roughness: 0.7 });
    const oasisReedTopMat = new THREE.MeshStandardMaterial({ color: 0x665522, roughness: 0.8 });
    for (let rd = 0; rd < 12; rd++) {
      const oasisReedAngle = Math.random() * Math.PI * 2;
      const oasisReedDist = 6.5 + Math.random() * 1.5;
      const oasisReedGrp = new THREE.Group();
      for (let rb = 0; rb < 3 + Math.floor(Math.random() * 3); rb++) {
        const oasisReedH = 0.8 + Math.random() * 1.0;
        const oasisReedStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, oasisReedH, 12), oasisReedMat);
        oasisReedStalk.position.set((Math.random() - 0.5) * 0.2, oasisReedH / 2, (Math.random() - 0.5) * 0.2);
        oasisReedStalk.rotation.x = (Math.random() - 0.5) * 0.15;
        oasisReedStalk.rotation.z = (Math.random() - 0.5) * 0.15;
        oasisReedGrp.add(oasisReedStalk);
        // Cattail top on some reeds
        if (Math.random() > 0.5) {
          const oasisCattail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.12, 8), oasisReedTopMat);
          oasisCattail.position.set(oasisReedStalk.position.x, oasisReedH + 0.06, oasisReedStalk.position.z);
          oasisReedGrp.add(oasisCattail);
        }
      }
      const oasisReedX = oasisX + Math.cos(oasisReedAngle) * oasisReedDist;
      const oasisReedZ = oasisZ + Math.sin(oasisReedAngle) * oasisReedDist;
      oasisReedGrp.position.set(oasisReedX, getTerrainHeight(oasisReedX, oasisReedZ, 1.4), oasisReedZ);
      mctx.scene.add(oasisReedGrp);
    }
    // Palm trees around oasis (detailed trunks with ring bumps, fronds, coconuts)
    const palmCoconutMat = new THREE.MeshStandardMaterial({ color: 0x885522, roughness: 0.6 });
    const palmRingMat = new THREE.MeshStandardMaterial({ color: 0x7a5a10, roughness: 0.85 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const palm = new THREE.Group();
      const trunkH = 4 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, trunkH, 10), palmTrunkMat);
      trunk.position.y = trunkH / 2;
      trunk.rotation.x = (Math.random() - 0.5) * 0.2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      palm.add(trunk);

      // Trunk ring bumps (horizontal torus rings along trunk)
      const palmRingCount = Math.floor(trunkH / 0.5);
      for (let pr = 0; pr < palmRingCount; pr++) {
        const palmTrunkRing = new THREE.Mesh(new THREE.TorusGeometry(0.17 + (pr / palmRingCount) * 0.06, 0.02, 8, 16), palmRingMat);
        palmTrunkRing.position.y = 0.3 + pr * (trunkH / (palmRingCount + 1));
        palmTrunkRing.rotation.x = Math.PI / 2;
        palm.add(palmTrunkRing);
      }

      // Crown bulge at top of trunk where fronds emerge
      const crownBulge = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), palmTrunkMat);
      crownBulge.position.y = trunkH;
      crownBulge.scale.set(1, 0.6, 1);
      palm.add(crownBulge);

      // Fronds emanating from crown top
      const palmFrondCount = 8 + Math.floor(Math.random() * 4);
      for (let l = 0; l < palmFrondCount; l++) {
        const leafAngle = (l / palmFrondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const palmFrondLen = 2.5 + Math.random() * 1.5;
        const frondGroup = new THREE.Group();
        frondGroup.position.set(0, trunkH, 0);
        frondGroup.rotation.y = leafAngle;
        // Droop angle — inner fronds more upright, outer ring droops more
        const droopBase = 0.15 + Math.random() * 0.25;

        // Rachis (central spine) built from segments that curve outward and down
        const rachisSegs = 8;
        for (let s = 0; s < rachisSegs; s++) {
          const t = s / rachisSegs;
          const segLen = palmFrondLen / rachisSegs;
          // Curve: starts going up/out, then droops with gravity
          const outDist = t * palmFrondLen * 0.9;
          const yOff = t * 0.5 - t * t * (1.5 + droopBase * 3);
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025 * (1 - t * 0.7), 0.025 * (1 - (t + 1/rachisSegs) * 0.7), segLen * 1.1, 6),
            new THREE.MeshStandardMaterial({ color: 0x6a7a2a, roughness: 0.7 })
          );
          seg.position.set(0, yOff, outDist);
          // Angle segment to follow the curve
          const nextT = (s + 1) / rachisSegs;
          const nextY = nextT * 0.5 - nextT * nextT * (1.5 + droopBase * 3);
          const segAngle = Math.atan2(nextY - yOff, segLen);
          seg.rotation.x = Math.PI / 2 - segAngle;
          frondGroup.add(seg);

          // Leaflets on both sides of the rachis
          if (s > 0) {
            for (const side of [-1, 1]) {
              const leafletLen = 0.3 + (1 - t) * 0.4;
              const leaflet = new THREE.Mesh(
                new THREE.PlaneGeometry(leafletLen, 0.06 + (1 - t) * 0.04),
                palmLeafMat
              );
              leaflet.position.set(side * leafletLen * 0.35, yOff - 0.02, outDist);
              leaflet.rotation.y = leafAngle + side * 0.3;
              leaflet.rotation.z = side * (0.3 + t * 0.4);
              leaflet.rotation.x = -0.1 - t * 0.3;
              frondGroup.add(leaflet);
            }
          }
        }
        palm.add(frondGroup);
      }

      // Dead/dried hanging fronds (2-3 brown ones drooping along trunk)
      const deadFrondMat = new THREE.MeshStandardMaterial({ color: 0x8a7a3a, roughness: 0.9, side: THREE.DoubleSide });
      const deadCount = 1 + Math.floor(Math.random() * 3);
      for (let df = 0; df < deadCount; df++) {
        const dfAngle = Math.random() * Math.PI * 2;
        const deadFrond = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.2 + Math.random() * 0.8), deadFrondMat);
        deadFrond.position.set(Math.cos(dfAngle) * 0.2, trunkH - 0.5, Math.sin(dfAngle) * 0.2);
        deadFrond.rotation.y = dfAngle;
        deadFrond.rotation.x = 0.2;
        palm.add(deadFrond);
      }

      // Coconut cluster (2-4 coconuts)
      const palmCoconutCount = 1 + Math.floor(Math.random() * 3);
      for (let cc = 0; cc < palmCoconutCount; cc++) {
        const palmCoconut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), palmCoconutMat);
        palmCoconut.position.set(
          (Math.random() - 0.5) * 0.2,
          trunkH - 0.15 - Math.random() * 0.15,
          (Math.random() - 0.5) * 0.2,
        );
        palm.add(palmCoconut);
      }

      // Fallen coconut on ground sometimes
      if (Math.random() > 0.6) {
        const palmFallenCoconut = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), palmCoconutMat);
        palmFallenCoconut.position.set((Math.random() - 0.5) * 1.5, 0.1, (Math.random() - 0.5) * 1.5);
        palm.add(palmFallenCoconut);
      }

      const palmX = oasisX + Math.cos(angle) * (8 + Math.random() * 2);
      const palmZ = oasisZ + Math.sin(angle) * (8 + Math.random() * 2);
      palm.position.set(palmX, getTerrainHeight(palmX, palmZ, 1.4), palmZ);
      mctx.scene.add(palm);
    }

    // ── Bones and skulls (scattered) ──
    for (let i = 0; i < 25; i++) {
      const bone = new THREE.Group();
      const boneLen = 0.5 + Math.random() * 1.5;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, boneLen, 17), boneMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.y = 0.1;
      bone.add(shaft);
      const end1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), boneMat);
      end1.position.set(boneLen / 2, 0.1, 0);
      bone.add(end1);
      const end2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 17, 17), boneMat);
      end2.position.set(-boneLen / 2, 0.1, 0);
      bone.add(end2);
      const bnX2 = (Math.random() - 0.5) * w * 0.8;
      const bnZ2 = (Math.random() - 0.5) * d * 0.8;
      bone.position.set(bnX2, getTerrainHeight(bnX2, bnZ2, 1.4), bnZ2);
      bone.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(bone);
    }
    // Skulls
    for (let i = 0; i < 12; i++) {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 23), boneMat);
      skull.scale.set(1, 0.8, 1.1);
      skull.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.15,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(skull);
    }

    // ── Bandit camp (tents, fire pit, flags) ──
    const campX = hw * 0.35, campZ = hd * 0.3;
    // Tents
    for (let t = 0; t < 3; t++) {
      const tent = new THREE.Group();
      const tShape = new THREE.ConeGeometry(2.5, 3, 17);
      const tMesh = new THREE.Mesh(tShape, tentMat);
      tMesh.position.y = 1.5;
      tent.add(tMesh);
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 17), new THREE.MeshStandardMaterial({ color: 0x664422 }));
      pole.position.y = 1.75;
      tent.add(pole);
      const tentX = campX + (t - 1) * 6;
      const tentZ = campZ + (Math.random() - 0.5) * 4;
      tent.position.set(tentX, getTerrainHeight(tentX, tentZ, 1.4), tentZ);
      mctx.scene.add(tent);
    }
    // Fire pit
    const pitRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 23, 36), stoneMat);
    pitRing.rotation.x = Math.PI / 2;
    pitRing.position.set(campX, 0.25, campZ);
    mctx.scene.add(pitRing);
    // Ember glow
    const campFire = new THREE.PointLight(0xff6622, 1.5, 12);
    campFire.position.set(campX, 1.5, campZ);
    mctx.scene.add(campFire);
    // Flag poles
    for (let f = 0; f < 2; f++) {
      const flagGroup = new THREE.Group();
      const poleH = 5;
      const fPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 17), new THREE.MeshStandardMaterial({ color: 0x664422 }));
      fPole.position.y = poleH / 2;
      flagGroup.add(fPole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), flagMat);
      flag.position.set(0.75, poleH - 0.5, 0);
      flagGroup.add(flag);
      const fgX2 = campX + (f === 0 ? -8 : 8);
      flagGroup.position.set(fgX2, getTerrainHeight(fgX2, campZ, 1.4), campZ);
      mctx.scene.add(flagGroup);
    }

    // ── Rock formations (high detail with sedimentary layers, sand bases, desert plants) ──
    const rfSedimentColors = [0x998866, 0x887755, 0xaa9977, 0x776644, 0xbbaa88];
    const rfPlantGreenMat = new THREE.MeshStandardMaterial({ color: 0x557733, roughness: 0.7 });
    const rfPlantDarkMat = new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.75 });
    const rfSandBaseMat = new THREE.MeshStandardMaterial({ color: 0xd8c080, roughness: 0.95 });
    for (let i = 0; i < 18; i++) {
      const rockGroup = new THREE.Group();
      const count = 2 + Math.floor(Math.random() * 4);
      for (let r = 0; r < count; r++) {
        const rh = 1 + Math.random() * 3;
        const rfMainRock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rh, 3),
          stoneMat,
        );
        rfMainRock.scale.set(0.8 + Math.random() * 0.5, 0.6 + Math.random() * 0.8, 0.8 + Math.random() * 0.5);
        rfMainRock.position.set((Math.random() - 0.5) * 3, rh * 0.3, (Math.random() - 0.5) * 3);
        rfMainRock.rotation.set(Math.random(), Math.random(), Math.random());
        rockGroup.add(rfMainRock);

        // Sedimentary layer lines (thin horizontal stripes in varying earth tones)
        const rfLayerCount = 3 + Math.floor(Math.random() * 4);
        for (let sl = 0; sl < rfLayerCount; sl++) {
          const rfLayerColor = rfSedimentColors[sl % rfSedimentColors.length];
          const rfLayerMat = new THREE.MeshStandardMaterial({ color: rfLayerColor, roughness: 0.9 });
          const rfLayerWidth = rh * (0.6 + Math.random() * 0.4);
          const rfLayer = new THREE.Mesh(
            new THREE.BoxGeometry(rfLayerWidth, 0.04, rfLayerWidth * 0.8),
            rfLayerMat,
          );
          rfLayer.position.set(
            rfMainRock.position.x,
            rh * 0.1 + sl * (rh * 0.15),
            rfMainRock.position.z,
          );
          rfLayer.rotation.y = rfMainRock.rotation.y;
          rockGroup.add(rfLayer);
        }

        // Sand accumulation at base (flattened sphere, sand-colored)
        const rfSandBase = new THREE.Mesh(
          new THREE.SphereGeometry(rh * 0.7, 20, 12),
          rfSandBaseMat,
        );
        rfSandBase.scale.set(1.2, 0.15, 1.2);
        rfSandBase.position.set(rfMainRock.position.x, 0.05, rfMainRock.position.z);
        rockGroup.add(rfSandBase);

        // Small cacti or desert plants growing from cracks (on some rocks)
        if (Math.random() > 0.5) {
          const rfCactusH = 0.3 + Math.random() * 0.5;
          const rfSmallCactus = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, rfCactusH, 10),
            rfPlantGreenMat,
          );
          rfSmallCactus.position.set(
            rfMainRock.position.x + (Math.random() - 0.5) * 0.5,
            rh * 0.4 + Math.random() * 0.3,
            rfMainRock.position.z + (Math.random() - 0.5) * 0.5,
          );
          rockGroup.add(rfSmallCactus);
          // Tiny flower bud on cactus
          if (Math.random() > 0.6) {
            const rfCactusBud = new THREE.Mesh(
              new THREE.SphereGeometry(0.04, 8, 8),
              cactusFlowerMat,
            );
            rfCactusBud.position.set(
              rfSmallCactus.position.x,
              rfSmallCactus.position.y + rfCactusH * 0.5,
              rfSmallCactus.position.z,
            );
            rockGroup.add(rfCactusBud);
          }
        }
        // Dry grass tuft growing from crack
        if (Math.random() > 0.6) {
          for (let gt = 0; gt < 3 + Math.floor(Math.random() * 3); gt++) {
            const rfGrassBlade = new THREE.Mesh(
              new THREE.CylinderGeometry(0.005, 0.015, 0.25 + Math.random() * 0.2, 6),
              rfPlantDarkMat,
            );
            rfGrassBlade.position.set(
              rfMainRock.position.x + (Math.random() - 0.5) * 0.3,
              rh * 0.15,
              rfMainRock.position.z + (Math.random() - 0.5) * 0.3,
            );
            rfGrassBlade.rotation.x = (Math.random() - 0.5) * 0.4;
            rfGrassBlade.rotation.z = (Math.random() - 0.5) * 0.4;
            rockGroup.add(rfGrassBlade);
          }
        }
      }
      const rgX = (Math.random() - 0.5) * w * 0.85;
      const rgZ = (Math.random() - 0.5) * d * 0.85;
      rockGroup.position.set(rgX, getTerrainHeight(rgX, rgZ, 1.4), rgZ);
      mctx.scene.add(rockGroup);
    }

    // ── Cracked earth patterns (network of thin dark lines) ──
    const crackedEarthDarkMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 1.0 });
    for (let ce = 0; ce < 10; ce++) {
      const crackedEarthGrp = new THREE.Group();
      const crackedEarthLineCount = 6 + Math.floor(Math.random() * 6);
      for (let cl = 0; cl < crackedEarthLineCount; cl++) {
        const crackedEarthLen = 1.0 + Math.random() * 2.5;
        const crackedEarthLine = new THREE.Mesh(
          new THREE.PlaneGeometry(crackedEarthLen, 0.03),
          crackedEarthDarkMat,
        );
        crackedEarthLine.rotation.x = -Math.PI / 2;
        crackedEarthLine.position.set(
          (Math.random() - 0.5) * 2, 0.012, (Math.random() - 0.5) * 2,
        );
        crackedEarthLine.rotation.z = Math.random() * Math.PI;
        crackedEarthGrp.add(crackedEarthLine);
        if (Math.random() > 0.5) {
          const crackedEarthBranch = new THREE.Mesh(
            new THREE.PlaneGeometry(crackedEarthLen * 0.4, 0.02), crackedEarthDarkMat,
          );
          crackedEarthBranch.rotation.x = -Math.PI / 2;
          crackedEarthBranch.position.set(
            crackedEarthLine.position.x + (Math.random() - 0.5) * 0.5, 0.012,
            crackedEarthLine.position.z + (Math.random() - 0.5) * 0.5,
          );
          crackedEarthBranch.rotation.z = Math.random() * Math.PI;
          crackedEarthGrp.add(crackedEarthBranch);
        }
      }
      const crackedEarthX = (Math.random() - 0.5) * w * 0.75;
      const crackedEarthZ = (Math.random() - 0.5) * d * 0.75;
      crackedEarthGrp.position.set(crackedEarthX, getTerrainHeight(crackedEarthX, crackedEarthZ, 1.4), crackedEarthZ);
      mctx.scene.add(crackedEarthGrp);
    }

    // ── Dried shrubs (small branching cylinders) ──
    const driedShrubBranchMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
    const driedShrubTwigMat = new THREE.MeshStandardMaterial({ color: 0x776040, roughness: 0.95 });
    for (let ds = 0; ds < 15; ds++) {
      const driedShrubGrp = new THREE.Group();
      const driedShrubBranchCount = 3 + Math.floor(Math.random() * 4);
      for (let db = 0; db < driedShrubBranchCount; db++) {
        const driedShrubH = 0.3 + Math.random() * 0.5;
        const driedShrubBranch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.025, driedShrubH, 12), driedShrubBranchMat,
        );
        driedShrubBranch.position.set(
          (Math.random() - 0.5) * 0.2, driedShrubH / 2, (Math.random() - 0.5) * 0.2,
        );
        driedShrubBranch.rotation.x = (Math.random() - 0.5) * 0.6;
        driedShrubBranch.rotation.z = (Math.random() - 0.5) * 0.6;
        driedShrubGrp.add(driedShrubBranch);
        for (let st = 0; st < 2; st++) {
          const driedShrubTwig = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.01, driedShrubH * 0.5, 10), driedShrubTwigMat,
          );
          driedShrubTwig.position.set(
            driedShrubBranch.position.x + (Math.random() - 0.5) * 0.1,
            driedShrubH * 0.6 + st * 0.1,
            driedShrubBranch.position.z + (Math.random() - 0.5) * 0.1,
          );
          driedShrubTwig.rotation.x = (Math.random() - 0.5) * 0.8;
          driedShrubTwig.rotation.z = (Math.random() - 0.5) * 0.8;
          driedShrubGrp.add(driedShrubTwig);
        }
      }
      const driedShrubX = (Math.random() - 0.5) * w * 0.8;
      const driedShrubZ = (Math.random() - 0.5) * d * 0.8;
      driedShrubGrp.position.set(driedShrubX, getTerrainHeight(driedShrubX, driedShrubZ, 1.4), driedShrubZ);
      mctx.scene.add(driedShrubGrp);
    }

    // ── Quicksand patches (dark circles) ──
    const qsMat = new THREE.MeshStandardMaterial({ color: 0x997744, roughness: 1.0, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 6; i++) {
      const qs = new THREE.Mesh(new THREE.CircleGeometry(2 + Math.random() * 3, 16), qsMat);
      qs.rotation.x = -Math.PI / 2;
      qs.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.03,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(qs);
    }

    // ── Desert sand trails (paths) ──
    const trailMat = new THREE.MeshStandardMaterial({ color: 0xc8a55a, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const trail = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5 + Math.random(), 20 + Math.random() * 30),
        trailMat,
      );
      trail.rotation.x = -Math.PI / 2;
      trail.rotation.z = Math.random() * Math.PI;
      trail.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0.01,
        (Math.random() - 0.5) * d * 0.6,
      );
      mctx.scene.add(trail);
    }

    // ── Dry tumbleweed bushes ──
    const dryBushMat = new THREE.MeshStandardMaterial({ color: 0x997744, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 20, 17), dryBushMat);
      bush.scale.y = 0.6;
      bush.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.15,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(bush);
    }

    // ── Sand ripple patterns ──
    const rippleMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.95 });
    for (let i = 0; i < 12; i++) {
      const rippleGroup = new THREE.Group();
      for (let r = 0; r < 6; r++) {
        const ripple = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 0.02, 0.06), rippleMat);
        ripple.position.set(0, 0.01, r * 0.3);
        rippleGroup.add(ripple);
      }
      const riX = (Math.random() - 0.5) * w * 0.7;
      const riZ = (Math.random() - 0.5) * d * 0.7;
      rippleGroup.position.set(riX, getTerrainHeight(riX, riZ, 1.4), riZ);
      rippleGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(rippleGroup);
    }


    // ── Sand dune ripple details (wavy thin boxes) ──
    const wavyRippleMat = new THREE.MeshStandardMaterial({ color: 0xc8a868, roughness: 0.92 });
    for (let i = 0; i < 20; i++) {
      const wavyGroup = new THREE.Group();
      const wavyRippleCount = 12 + Math.floor(Math.random() * 8);
      const groupWidth = 5 + Math.random() * 6;
      for (let r = 0; r < wavyRippleCount; r++) {
        const rWidth = groupWidth * (0.5 + Math.random() * 0.5);
        const waviness = Math.sin(r * 0.6) * 0.15;
        const wavyLine = new THREE.Mesh(
          new THREE.BoxGeometry(rWidth, 0.012, 0.035),
          r % 3 === 0 ? darkSandMat : wavyRippleMat,
        );
        wavyLine.position.set(waviness, 0.006, r * 0.18);
        wavyLine.rotation.y = Math.sin(r * 0.4) * 0.08;
        wavyGroup.add(wavyLine);
      }
      const wrX = (Math.random() - 0.5) * w * 0.85;
      const wrZ = (Math.random() - 0.5) * d * 0.85;
      wavyGroup.position.set(wrX, getTerrainHeight(wrX, wrZ, 1.4), wrZ);
      wavyGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(wavyGroup);
    }

    // ── Oasis palm tree frond detail (multiple thin cones fanning out) ──
    for (let i = 0; i < 6; i++) {
      const frondPalm = new THREE.Group();
      const fpAngle = (i / 6) * Math.PI * 2;
      const fpTrunkH = 5 + Math.random() * 2;
      const fpTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, fpTrunkH, 10), palmTrunkMat);
      fpTrunk.position.y = fpTrunkH / 2;
      frondPalm.add(fpTrunk);
      for (let tr = 0; tr < 6; tr++) {
        const trRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 16), palmTrunkMat);
        trRing.position.y = 0.5 + tr * (fpTrunkH / 7);
        trRing.rotation.x = Math.PI / 2;
        frondPalm.add(trRing);
      }
      // Crown bulge
      const fpCrown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), palmTrunkMat);
      fpCrown.position.y = fpTrunkH;
      fpCrown.scale.set(1, 0.6, 1);
      frondPalm.add(fpCrown);

      const frondCount = 10 + Math.floor(Math.random() * 5);
      for (let f = 0; f < frondCount; f++) {
        const fAngle = (f / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const frondLen = 2.5 + Math.random() * 1.5;
        const fGrp = new THREE.Group();
        fGrp.position.set(0, fpTrunkH, 0);
        fGrp.rotation.y = fAngle;
        const droopBase = 0.15 + Math.random() * 0.3;

        const rachisSegs = 8;
        for (let s = 0; s < rachisSegs; s++) {
          const t = s / rachisSegs;
          const segLen = frondLen / rachisSegs;
          const outDist = t * frondLen * 0.9;
          const yOff = t * 0.5 - t * t * (1.5 + droopBase * 3);
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * (1 - t * 0.7), 0.02 * (1 - (t + 1/rachisSegs) * 0.7), segLen * 1.1, 6),
            new THREE.MeshStandardMaterial({ color: 0x6a7a2a, roughness: 0.7 })
          );
          seg.position.set(0, yOff, outDist);
          const nextT = (s + 1) / rachisSegs;
          const nextY = nextT * 0.5 - nextT * nextT * (1.5 + droopBase * 3);
          const segAngle = Math.atan2(nextY - yOff, segLen);
          seg.rotation.x = Math.PI / 2 - segAngle;
          fGrp.add(seg);

          if (s > 0) {
            for (const side of [-1, 1]) {
              const lfLen = 0.3 + (1 - t) * 0.4;
              const leaflet = new THREE.Mesh(new THREE.PlaneGeometry(lfLen, 0.06 + (1 - t) * 0.04), palmLeafMat);
              leaflet.position.set(side * lfLen * 0.35, yOff - 0.02, outDist);
              leaflet.rotation.y = fAngle + side * 0.3;
              leaflet.rotation.z = side * (0.3 + t * 0.4);
              leaflet.rotation.x = -0.1 - t * 0.3;
              fGrp.add(leaflet);
            }
          }
        }
        frondPalm.add(fGrp);
      }
      const fpX = oasisX + Math.cos(fpAngle) * (9.5 + Math.random() * 2);
      const fpZ = oasisZ + Math.sin(fpAngle) * (9.5 + Math.random() * 2);
      frondPalm.position.set(fpX, getTerrainHeight(fpX, fpZ, 1.4), fpZ);
      mctx.scene.add(frondPalm);
    }

    // ── Ancient ruin column fragments (broken cylinders at varying heights) ──
    for (let i = 0; i < 10; i++) {
      const fragGroup = new THREE.Group();
      const fragCount = 3 + Math.floor(Math.random() * 4);
      for (let f = 0; f < fragCount; f++) {
        const fragH = 0.3 + Math.random() * 1.5;
        const fragR = 0.2 + Math.random() * 0.25;
        const frag = new THREE.Mesh(new THREE.CylinderGeometry(fragR * 0.9, fragR, fragH, 10), ruinMat);
        frag.position.set((Math.random() - 0.5) * 3, fragH / 2, (Math.random() - 0.5) * 3);
        frag.rotation.x = (Math.random() - 0.5) * 0.25;
        frag.rotation.z = (Math.random() - 0.5) * 0.25;
        fragGroup.add(frag);
        for (let fl = 0; fl < 6; fl++) {
          const fluteAngle = (fl / 6) * Math.PI * 2;
          const flute = new THREE.Mesh(new THREE.BoxGeometry(0.02, fragH * 0.8, 0.02), stoneMat);
          flute.position.set(
            frag.position.x + Math.cos(fluteAngle) * fragR * 0.95,
            fragH * 0.4,
            frag.position.z + Math.sin(fluteAngle) * fragR * 0.95,
          );
          fragGroup.add(flute);
        }
      }
      if (Math.random() > 0.4) {
        const drumR = 0.25 + Math.random() * 0.15;
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, 0.5, 10), ruinMat);
        drum.rotation.z = Math.PI / 2;
        drum.position.set((Math.random() - 0.5) * 2, drumR, (Math.random() - 0.5) * 2);
        fragGroup.add(drum);
      }
      const cfgX = (Math.random() - 0.5) * w * 0.7;
      const cfgZ = (Math.random() - 0.5) * d * 0.7;
      fragGroup.position.set(cfgX, getTerrainHeight(cfgX, cfgZ, 1.4), cfgZ);
      fragGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fragGroup);
    }

    // ── Desert shrine details with carved stone patterns ──
    for (let i = 0; i < 5; i++) {
      const shrine = new THREE.Group();
      const shrineBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 3), stoneMat);
      shrineBase.position.y = 0.2;
      shrine.add(shrineBase);
      const shrineStep = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), ruinMat);
      shrineStep.position.y = 0.55;
      shrine.add(shrineStep);
      const obeliskH = 2.5 + Math.random() * 1.5;
      const obeliskMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, obeliskH, 0.5), ruinMat);
      obeliskMesh.position.y = 0.7 + obeliskH / 2;
      shrine.add(obeliskMesh);
      const pyramidion = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.3, metalness: 0.5 }));
      pyramidion.position.y = 0.7 + obeliskH + 0.3;
      pyramidion.rotation.y = Math.PI / 4;
      shrine.add(pyramidion);
      for (let b = 0; b < 5; b++) {
        const bandY = 1.2 + b * (obeliskH / 5);
        for (let side = 0; side < 4; side++) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.02), darkSandMat);
          const sAngle = (side / 4) * Math.PI * 2;
          band.position.set(Math.cos(sAngle) * 0.26, bandY, Math.sin(sAngle) * 0.26);
          band.rotation.y = sAngle;
          shrine.add(band);
        }
      }
      const shrBowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16, 0, Math.PI * 2, Math.PI / 2), stoneMat);
      shrBowl.position.set(0.8, 0.75, 0);
      shrBowl.rotation.x = Math.PI;
      shrine.add(shrBowl);
      for (let c = 0; c < 4; c++) {
        const cAngle = (c / 4) * Math.PI * 2 + Math.PI / 4;
        const cornerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 16), ruinMat);
        cornerPillar.position.set(Math.cos(cAngle) * 1.3, 1.05, Math.sin(cAngle) * 1.3);
        shrine.add(cornerPillar);
      }
      const shX = (Math.random() - 0.5) * w * 0.65;
      const shZ = (Math.random() - 0.5) * d * 0.65;
      shrine.position.set(shX, getTerrainHeight(shX, shZ, 1.4), shZ);
      shrine.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(shrine);
    }

    // ── Sun-bleached bone fragments scattered on ground ──
    const bleachedBoneMat = new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.75 });
    for (let i = 0; i < 30; i++) {
      const boneFragGroup = new THREE.Group();
      const fragType = Math.floor(Math.random() * 4);
      if (fragType === 0) {
        const ribFrag = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 16, 20, Math.PI * 0.6), bleachedBoneMat);
        ribFrag.position.y = 0.02;
        ribFrag.rotation.x = Math.PI / 2;
        boneFragGroup.add(ribFrag);
      } else if (fragType === 1) {
        const vertFrag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 16), bleachedBoneMat);
        vertFrag.position.y = 0.015;
        boneFragGroup.add(vertFrag);
        const spinous = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.03), bleachedBoneMat);
        spinous.position.set(0, 0.035, -0.02);
        boneFragGroup.add(spinous);
      } else if (fragType === 2) {
        const longBoneFrag = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.3 + Math.random() * 0.2, 12), bleachedBoneMat);
        longBoneFrag.rotation.z = Math.PI / 2;
        longBoneFrag.position.y = 0.025;
        boneFragGroup.add(longBoneFrag);
      } else {
        const jawFrag = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 12, 16, Math.PI * 0.8), bleachedBoneMat);
        jawFrag.position.y = 0.02;
        boneFragGroup.add(jawFrag);
        for (let t = 0; t < 3; t++) {
          const toothFrag = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.02, 8), bleachedBoneMat);
          toothFrag.position.set(Math.cos(t * 0.3) * 0.05, 0.02, Math.sin(t * 0.3) * 0.05);
          toothFrag.rotation.x = Math.PI;
          boneFragGroup.add(toothFrag);
        }
      }
      const bfX = (Math.random() - 0.5) * w * 0.85;
      const bfZ = (Math.random() - 0.5) * d * 0.85;
      boneFragGroup.position.set(bfX, getTerrainHeight(bfX, bfZ, 1.4), bfZ);
      boneFragGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(boneFragGroup);
    }

    // ── Vulture perches (dead tree stumps with vultures) ──
    const deadWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const perch = new THREE.Group();
      const stumpH = 2 + Math.random() * 2;
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, stumpH, 10), deadWoodMat);
      stump.position.y = stumpH / 2;
      perch.add(stump);
      // Dead branches
      for (let b = 0; b < 3; b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.8, 17), deadWoodMat);
        branch.position.set((Math.random() - 0.5) * 0.3, stumpH * 0.5 + b * 0.4, 0);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        perch.add(branch);
      }
      // Vulture silhouette on top (simple)
      if (Math.random() > 0.4) {
        const vBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 17), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        vBody.scale.set(0.8, 0.7, 1.2);
        vBody.position.y = stumpH + 0.1;
        perch.add(vBody);
        const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 17, 16), new THREE.MeshStandardMaterial({ color: 0xcc4444 }));
        vHead.position.set(0, stumpH + 0.2, 0.12);
        perch.add(vHead);
      }
      const prX = (Math.random() - 0.5) * w * 0.8;
      const prZ = (Math.random() - 0.5) * d * 0.8;
      perch.position.set(prX, getTerrainHeight(prX, prZ, 1.4), prZ);
      mctx.scene.add(perch);
    }

    // ── Pottery shards (broken urns) ──
    const potteryMat = new THREE.MeshStandardMaterial({ color: 0xbb7744, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const shardGroup = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const shard = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.1, 0.08, 0.12), potteryMat);
        shard.position.set((Math.random() - 0.5) * 0.4, 0.04, (Math.random() - 0.5) * 0.4);
        shard.rotation.set(Math.random(), Math.random(), Math.random());
        shardGroup.add(shard);
      }
      // Intact base of urn sometimes
      if (Math.random() > 0.5) {
        const urnBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.2, 10), potteryMat);
        urnBase.position.y = 0.1;
        shardGroup.add(urnBase);
      }
      const sdX = (Math.random() - 0.5) * w * 0.7;
      const sdZ = (Math.random() - 0.5) * d * 0.7;
      shardGroup.position.set(sdX, getTerrainHeight(sdX, sdZ, 1.4), sdZ);
      mctx.scene.add(shardGroup);
    }

    // ── Scorpion burrow holes ──
    const burrowMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 1.0 });
    for (let i = 0; i < 10; i++) {
      const burrow = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 23), burrowMat);
      burrow.rotation.x = -Math.PI / 2;
      burrow.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.01,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(burrow);
      // Sand mound around burrow
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 17), sandMat);
      mound.scale.y = 0.2;
      mound.position.copy(burrow.position);
      mound.position.y = 0.03;
      mctx.scene.add(mound);
    }

    // ── Sun-bleached wagon wreck ──
    const wagonGroup = new THREE.Group();
    const bleachedMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.9 });
    // Wagon bed (tilted)
    const wBed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), bleachedMat);
    wBed.position.set(0, 0.3, 0);
    wBed.rotation.z = 0.2;
    wagonGroup.add(wBed);
    // Broken wheel
    const wWheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 17, 27), bleachedMat);
    wWheel.position.set(1, 0.4, 0.7);
    wWheel.rotation.x = Math.PI / 2;
    wWheel.rotation.z = 0.3;
    wagonGroup.add(wWheel);
    // Wheel on ground
    const wWheel2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 17, 27), bleachedMat);
    wWheel2.rotation.x = Math.PI / 2;
    wWheel2.position.set(-0.8, 0.06, -0.5);
    wagonGroup.add(wWheel2);
    // Scattered cargo
    for (let c = 0; c < 3; c++) {
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.25), new THREE.MeshStandardMaterial({ color: 0xaa9966 }));
      cargo.position.set((Math.random() - 0.5) * 2, 0.1, (Math.random() - 0.5) * 1.5);
      cargo.rotation.y = Math.random();
      wagonGroup.add(cargo);
    }
    wagonGroup.position.set(hw * 0.2, 0, hd * 0.15);
    mctx.scene.add(wagonGroup);

    // ── Desert rose crystal clusters ──
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xddaa88, roughness: 0.4, metalness: 0.2 });
    for (let i = 0; i < 6; i++) {
      const cluster = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 3);
      for (let c = 0; c < count; c++) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2 + Math.random() * 0.15, 17), crystalMat);
        crystal.position.set((Math.random() - 0.5) * 0.2, 0.08, (Math.random() - 0.5) * 0.2);
        crystal.rotation.z = (Math.random() - 0.5) * 0.5;
        cluster.add(crystal);
      }
      cluster.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(cluster);
    }

    // ── Snake tracks in sand ──
    const trackMat = new THREE.MeshStandardMaterial({ color: 0xb89050, roughness: 0.95 });
    for (let i = 0; i < 5; i++) {
      const track = new THREE.Group();
      for (let s = 0; s < 8; s++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.04), trackMat);
        seg.position.set(s * 0.35, 0.005, Math.sin(s * 0.8) * 0.15);
        seg.rotation.y = Math.cos(s * 0.8) * 0.3;
        track.add(seg);
      }
      track.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0,
        (Math.random() - 0.5) * d * 0.6,
      );
      track.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(track);
    }

    // ── Large sand dune formations with height variation ──
    const duneCrestMat = new THREE.MeshStandardMaterial({ color: 0xe0c48a, roughness: 0.85 });
    const duneValleyMat = new THREE.MeshStandardMaterial({ color: 0xb09050, roughness: 1.0 });
    for (let i = 0; i < 20; i++) {
      const duneGroup = new THREE.Group();
      const mainW = 15 + Math.random() * 25;
      const mainH = 1.2 + Math.random() * 2.5;
      const mainD = 8 + Math.random() * 15;
      const mainDune = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), duneCrestMat);
      mainDune.scale.set(mainW, mainH, mainD);
      duneGroup.add(mainDune);
      // Secondary crest ridge
      const ridge = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), duneCrestMat);
      ridge.scale.set(mainW * 0.8, mainH * 0.4, mainD * 0.3);
      ridge.position.set(mainW * 0.1, mainH * 0.6, -mainD * 0.15);
      duneGroup.add(ridge);
      // Wind shadow (darker side)
      const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), duneValleyMat);
      shadow.scale.set(mainW * 0.6, mainH * 0.3, mainD * 0.5);
      shadow.position.set(-mainW * 0.2, mainH * 0.1, mainD * 0.2);
      duneGroup.add(shadow);
      const duneX = (Math.random() - 0.5) * w * 0.95;
      const duneZ = (Math.random() - 0.5) * d * 0.95;
      duneGroup.position.set(duneX, getTerrainHeight(duneX, duneZ, 1.4) - 0.5, duneZ);
      duneGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(duneGroup);
    }

    // ── Ancient ruins with columns, arches, and inscribed walls ──
    const inscribedMat = new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.75 });
    const darkRuinMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.85 });
    for (let i = 0; i < 6; i++) {
      const temple = new THREE.Group();
      const cx = (Math.random() - 0.5) * w * 0.65;
      const cz = (Math.random() - 0.5) * d * 0.65;
      // Foundation platform
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 10), darkRuinMat);
      foundation.position.y = 0.25;
      temple.add(foundation);
      // Columns in rows
      for (let col = 0; col < 6; col++) {
        for (let row = 0; row < 2; row++) {
          if (Math.random() > 0.2) {
            const colH = 3 + Math.random() * 2.5;
            const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, colH, 30), inscribedMat);
            column.position.set(-5 + col * 2, colH / 2 + 0.5, -3.5 + row * 7);
            column.rotation.x = (Math.random() - 0.5) * 0.08;
            column.rotation.z = (Math.random() - 0.5) * 0.08;
            temple.add(column);
            // Column capital
            const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.25, 12), inscribedMat);
            capital.position.set(column.position.x, colH + 0.5, column.position.z);
            temple.add(capital);
            // Column base
            const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.2, 12), inscribedMat);
            colBase.position.set(column.position.x, 0.6, column.position.z);
            temple.add(colBase);
          }
        }
      }
      // Grand arch entrance
      const archPillarH = 5;
      const archL = new THREE.Mesh(new THREE.BoxGeometry(0.8, archPillarH, 0.8), ruinMat);
      archL.position.set(-2.5, archPillarH / 2 + 0.5, 5);
      temple.add(archL);
      const archR2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, archPillarH, 0.8), ruinMat);
      archR2.position.set(2.5, archPillarH / 2 + 0.5, 5);
      temple.add(archR2);
      const archLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 1), ruinMat);
      archLintel.position.set(0, archPillarH + 0.5, 5);
      temple.add(archLintel);
      // Triangular pediment
      const pediment = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.5, 16), inscribedMat);
      pediment.position.set(0, archPillarH + 1.8, 5);
      pediment.rotation.y = Math.PI / 6;
      temple.add(pediment);
      // Inscribed wall fragment
      const wallFrag = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.3), inscribedMat);
      wallFrag.position.set(0, 1.7, -4.5);
      wallFrag.rotation.y = (Math.random() - 0.5) * 0.2;
      temple.add(wallFrag);
      temple.position.set(cx, getTerrainHeight(cx, cz, 1.4), cz);
      temple.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(temple);
    }

    // ── Oasis reeds and water plants ──
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x669933, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 30; i++) {
      const reedGroup = new THREE.Group();
      const reedCount = 3 + Math.floor(Math.random() * 4);
      for (let r = 0; r < reedCount; r++) {
        const reedH = 1.0 + Math.random() * 1.5;
        const reed = new THREE.Mesh(new THREE.PlaneGeometry(0.1, reedH), reedMat);
        reed.position.set((Math.random() - 0.5) * 0.3, reedH / 2, (Math.random() - 0.5) * 0.3);
        reed.rotation.y = Math.random() * Math.PI;
        reedGroup.add(reed);
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 4;
      const rdX = oasisX + Math.cos(angle) * dist;
      const rdZ = oasisZ + Math.sin(angle) * dist;
      reedGroup.position.set(rdX, getTerrainHeight(rdX, rdZ, 1.4), rdZ);
      mctx.scene.add(reedGroup);
    }

    // ── Desert grass tufts ──
    const desertGrassMat = new THREE.MeshStandardMaterial({ color: 0xaa9944, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 50; i++) {
      const tuft = new THREE.Group();
      const bladeCount = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.3 + Math.random() * 0.3), desertGrassMat);
        blade.position.set((Math.random() - 0.5) * 0.15, 0.15, (Math.random() - 0.5) * 0.15);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        tuft.add(blade);
      }
      const tgX = (Math.random() - 0.5) * w * 0.85;
      const tgZ = (Math.random() - 0.5) * d * 0.85;
      tuft.position.set(tgX, getTerrainHeight(tgX, tgZ, 1.4), tgZ);
      mctx.scene.add(tuft);
    }

    // ── Sun-bleached rock arches and formations ──
    const bleachedRockMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const archGroup = new THREE.Group();
      const aH = 3 + Math.random() * 3;
      const aW = 3 + Math.random() * 4;
      // Left pillar
      const lPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 2), bleachedRockMat);
      lPillar.scale.set(0.6, aH / 2, 0.6);
      lPillar.position.set(-aW / 2, aH / 2, 0);
      archGroup.add(lPillar);
      // Right pillar
      const rPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 2), bleachedRockMat);
      rPillar.scale.set(0.6, aH / 2, 0.6);
      rPillar.position.set(aW / 2, aH / 2, 0);
      archGroup.add(rPillar);
      // Arch span (natural rock bridge)
      const span = new THREE.Mesh(new THREE.DodecahedronGeometry(aW / 2, 2), bleachedRockMat);
      span.scale.set(1, 0.25, 0.4);
      span.position.set(0, aH, 0);
      archGroup.add(span);
      const raX = (Math.random() - 0.5) * w * 0.75;
      const raZ = (Math.random() - 0.5) * d * 0.75;
      archGroup.position.set(raX, getTerrainHeight(raX, raZ, 1.4), raZ);
      archGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(archGroup);
    }

    // ── Mirage shimmer effects (semi-transparent rising planes) ──
    const mirageMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const mirageW = 8 + Math.random() * 12;
      const mirageH = 2 + Math.random() * 3;
      const mirage = new THREE.Mesh(new THREE.PlaneGeometry(mirageW, mirageH), mirageMat);
      mirage.position.set(
        (Math.random() - 0.5) * w * 0.7,
        mirageH / 2 + 0.5,
        (Math.random() - 0.5) * d * 0.7,
      );
      mirage.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(mirage);
    }

    // ── Cracked earth patches ──
    const crackedMat = new THREE.MeshStandardMaterial({ color: 0x9a8055, roughness: 1.0 });
    for (let i = 0; i < 12; i++) {
      const patchGroup = new THREE.Group();
      const patchR = 2 + Math.random() * 3;
      // Base cracked ground
      const base = new THREE.Mesh(new THREE.CircleGeometry(patchR, 27), crackedMat);
      base.rotation.x = -Math.PI / 2;
      base.position.y = 0.02;
      patchGroup.add(base);
      // Crack lines (thin dark strips)
      const crackMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1.0 });
      for (let c = 0; c < 6 + Math.floor(Math.random() * 5); c++) {
        const crackLen = 0.5 + Math.random() * patchR;
        const crack = new THREE.Mesh(new THREE.BoxGeometry(crackLen, 0.005, 0.03), crackMat);
        crack.rotation.y = Math.random() * Math.PI;
        crack.position.set((Math.random() - 0.5) * patchR, 0.025, (Math.random() - 0.5) * patchR);
        patchGroup.add(crack);
      }
      const cpX = (Math.random() - 0.5) * w * 0.75;
      const cpZ = (Math.random() - 0.5) * d * 0.75;
      patchGroup.position.set(cpX, getTerrainHeight(cpX, cpZ, 1.4), cpZ);
      mctx.scene.add(patchGroup);
    }

    // ── Camel skeleton remains ──
    for (let i = 0; i < 4; i++) {
      const camelSkel = new THREE.Group();
      // Spine
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 2.5, 17), boneMat);
      spine.rotation.z = Math.PI / 2;
      spine.position.y = 0.6;
      camelSkel.add(spine);
      // Ribs
      for (let r = 0; r < 6; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 30, 23, Math.PI), boneMat);
        rib.position.set(-0.8 + r * 0.3, 0.5, 0);
        rib.rotation.y = Math.PI / 2;
        camelSkel.add(rib);
      }
      // Skull
      const camelSkull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 20), boneMat);
      camelSkull.scale.set(0.7, 0.8, 1.5);
      camelSkull.position.set(1.5, 0.5, 0);
      camelSkel.add(camelSkull);
      // Leg bones
      for (let l = 0; l < 4; l++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 16), boneMat);
        leg.position.set(-0.5 + (l > 1 ? 1.2 : 0), 0.15, l % 2 === 0 ? 0.3 : -0.3);
        leg.rotation.z = (Math.random() - 0.5) * 0.5;
        camelSkel.add(leg);
      }
      // Hump bone ridge
      const hump = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 17), boneMat);
      hump.scale.set(1, 1.5, 1);
      hump.position.set(0, 0.85, 0);
      camelSkel.add(hump);
      const csX = (Math.random() - 0.5) * w * 0.7;
      const csZ = (Math.random() - 0.5) * d * 0.7;
      camelSkel.position.set(csX, getTerrainHeight(csX, csZ, 1.4), csZ);
      camelSkel.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(camelSkel);
    }

    // ── Atmospheric desert point lights (heat shimmer) ──
    const sunGlowColors = [0xffcc66, 0xffaa33, 0xffddaa];
    for (let i = 0; i < 6; i++) {
      const sunGlow = new THREE.PointLight(sunGlowColors[i % 3], 0.4, 15);
      sunGlow.position.set(
        (Math.random() - 0.5) * w * 0.6,
        3 + Math.random() * 2,
        (Math.random() - 0.5) * d * 0.6,
      );
      mctx.scene.add(sunGlow);
    }

    // ── Large scattered skulls (giant creature remains) ──
    for (let i = 0; i < 3; i++) {
      const giantSkull = new THREE.Group();
      const skullMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 27, 23), boneMat);
      skullMesh.scale.set(1, 0.7, 1.3);
      skullMesh.position.y = 0.5;
      giantSkull.add(skullMesh);
      // Eye sockets
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1.0 });
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), eyeMat);
      eye1.position.set(-0.35, 0.7, 1.1);
      giantSkull.add(eye1);
      const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), eyeMat);
      eye2.position.set(0.35, 0.7, 1.1);
      giantSkull.add(eye2);
      // Jaw
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.8, 23, 17, 0, Math.PI * 2, Math.PI / 2), boneMat);
      jaw.scale.set(0.9, 0.4, 1.1);
      jaw.position.set(0, 0.1, 0.3);
      giantSkull.add(jaw);
      // Teeth
      for (let t = 0; t < 6; t++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 16), boneMat);
        tooth.position.set(-0.3 + t * 0.12, 0.2, 1.0);
        tooth.rotation.x = Math.PI;
        giantSkull.add(tooth);
      }
      const gsX = (Math.random() - 0.5) * w * 0.6;
      const gsZ = (Math.random() - 0.5) * d * 0.6;
      giantSkull.position.set(gsX, getTerrainHeight(gsX, gsZ, 1.4), gsZ);
      giantSkull.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(giantSkull);
    }

    // ── Sand ripple texture patches (larger, more detailed) ──
    const fineRippleMat = new THREE.MeshStandardMaterial({ color: 0xc8aa68, roughness: 0.92 });
    for (let i = 0; i < 15; i++) {
      const ripplePatch = new THREE.Group();
      const rippleCount = 10 + Math.floor(Math.random() * 8);
      const patchWidth = 4 + Math.random() * 4;
      for (let r = 0; r < rippleCount; r++) {
        const rippleLine = new THREE.Mesh(
          new THREE.BoxGeometry(patchWidth * (0.6 + Math.random() * 0.4), 0.015, 0.04),
          r % 2 === 0 ? fineRippleMat : sandMat,
        );
        rippleLine.position.set((Math.random() - 0.5) * 0.3, 0.008, r * 0.2);
        rippleLine.rotation.y = (Math.random() - 0.5) * 0.05;
        ripplePatch.add(rippleLine);
      }
      const rpX = (Math.random() - 0.5) * w * 0.8;
      const rpZ = (Math.random() - 0.5) * d * 0.8;
      ripplePatch.position.set(rpX, getTerrainHeight(rpX, rpZ, 1.4), rpZ);
      ripplePatch.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(ripplePatch);
    }

    // ── Scattered ancient coins and artifacts ──
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.3, metalness: 0.7 });
    for (let i = 0; i < 20; i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 10), goldMat);
      coin.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      const coX = (Math.random() - 0.5) * w * 0.7;
      const coZ = (Math.random() - 0.5) * d * 0.7;
      coin.position.set(coX, getTerrainHeight(coX, coZ, 1.4) + 0.01, coZ);
      mctx.scene.add(coin);
    }

    // ── Second oasis pool (smaller, distant) ──
    const oasis2X = hw * 0.4, oasis2Z = hd * 0.35;
    const oasis2Pool = new THREE.Mesh(new THREE.CircleGeometry(4, 16), oasisWaterMat);
    oasis2Pool.rotation.x = -Math.PI / 2;
    oasis2Pool.position.set(oasis2X, getTerrainHeight(oasis2X, oasis2Z, 1.4) + 0.04, oasis2Z);
    mctx.scene.add(oasis2Pool);
    const grassRing2 = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 5, 27),
      new THREE.MeshStandardMaterial({ color: 0x558833, roughness: 0.8 }),
    );
    grassRing2.rotation.x = -Math.PI / 2;
    grassRing2.position.set(oasis2X, getTerrainHeight(oasis2X, oasis2Z, 1.4) + 0.02, oasis2Z);
    mctx.scene.add(grassRing2);
    // Palm trees for second oasis
    for (let i = 0; i < 5; i++) {
      const angle2 = (i / 5) * Math.PI * 2;
      const palm2 = new THREE.Group();
      const trunkH2 = 3.5 + Math.random() * 2.5;
      const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, trunkH2, 10), palmTrunkMat);
      trunk2.position.y = trunkH2 / 2;
      trunk2.rotation.x = (Math.random() - 0.5) * 0.15;
      trunk2.rotation.z = (Math.random() - 0.5) * 0.15;
      palm2.add(trunk2);
      // Crown bulge
      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), palmTrunkMat);
      crown2.position.y = trunkH2;
      crown2.scale.set(1, 0.6, 1);
      palm2.add(crown2);
      // Fronds from crown
      const fCount2 = 7 + Math.floor(Math.random() * 3);
      for (let l = 0; l < fCount2; l++) {
        const leafAngle2 = (l / fCount2) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const fLen2 = 2 + Math.random() * 1.2;
        const fg2 = new THREE.Group();
        fg2.position.set(0, trunkH2, 0);
        fg2.rotation.y = leafAngle2;
        const droop2 = 0.15 + Math.random() * 0.25;
        const rSegs = 6;
        for (let s = 0; s < rSegs; s++) {
          const t = s / rSegs;
          const segLen = fLen2 / rSegs;
          const outD = t * fLen2 * 0.9;
          const yOff = t * 0.4 - t * t * (1.3 + droop2 * 3);
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * (1 - t * 0.7), 0.02 * (1 - (t + 1/rSegs) * 0.7), segLen * 1.1, 6),
            new THREE.MeshStandardMaterial({ color: 0x6a7a2a, roughness: 0.7 })
          );
          seg.position.set(0, yOff, outD);
          const nT = (s + 1) / rSegs;
          const nY = nT * 0.4 - nT * nT * (1.3 + droop2 * 3);
          seg.rotation.x = Math.PI / 2 - Math.atan2(nY - yOff, segLen);
          fg2.add(seg);
          if (s > 0) {
            for (const side of [-1, 1]) {
              const lfL = 0.25 + (1 - t) * 0.35;
              const lf = new THREE.Mesh(new THREE.PlaneGeometry(lfL, 0.05 + (1 - t) * 0.03), palmLeafMat);
              lf.position.set(side * lfL * 0.35, yOff - 0.02, outD);
              lf.rotation.y = leafAngle2 + side * 0.3;
              lf.rotation.z = side * (0.3 + t * 0.4);
              lf.rotation.x = -0.1 - t * 0.3;
              fg2.add(lf);
            }
          }
        }
        palm2.add(fg2);
      }
      const p2X = oasis2X + Math.cos(angle2) * (4.5 + Math.random() * 1.5);
      const p2Z = oasis2Z + Math.sin(angle2) * (4.5 + Math.random() * 1.5);
      palm2.position.set(p2X, getTerrainHeight(p2X, p2Z, 1.4), p2Z);
      mctx.scene.add(palm2);
    }

    // ── Half-buried statue ──
    const statueMat = new THREE.MeshStandardMaterial({ color: 0xbb9966, roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const statue = new THREE.Group();
      // Torso emerging from sand
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2, 12), statueMat);
      torso.position.y = 0.5;
      torso.rotation.z = (Math.random() - 0.5) * 0.2;
      statue.add(torso);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), statueMat);
      head.position.set(0, 1.8, 0);
      statue.add(head);
      // Extended arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 10), statueMat);
      arm.position.set(0.8, 1.2, 0);
      arm.rotation.z = -0.8;
      statue.add(arm);
      const stX = (Math.random() - 0.5) * w * 0.6;
      const stZ = (Math.random() - 0.5) * d * 0.6;
      statue.position.set(stX, getTerrainHeight(stX, stZ, 1.4) - 0.8, stZ);
      statue.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(statue);
    }

    // ── Mirage shimmer markers ──
    for (let i = 0; i < 5; i++) {
      const shimmer = new THREE.Mesh(
        new THREE.PlaneGeometry(3 + Math.random() * 4, 4 + Math.random() * 3),
        new THREE.MeshStandardMaterial({ color: 0xffeedd, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false }),
      );
      const shX = (Math.random() - 0.5) * w * 0.7;
      const shZ = (Math.random() - 0.5) * d * 0.7;
      shimmer.position.set(shX, 1.5 + Math.random() * 2, shZ);
      shimmer.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(shimmer);
    }

    // ── Scorpion burrow holes ──
    const burrowDarkMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 1.0 });
    for (let i = 0; i < 12; i++) {
      const burrow = new THREE.Group();
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), burrowDarkMat);
      hole.rotation.x = -Math.PI / 2; hole.position.y = 0.01; burrow.add(hole);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), sandMat);
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02; burrow.add(rim);
      for (let t = 0; t < 4; t++) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, 0.02), darkSandMat);
        track.position.set(0.15 + t * 0.08, 0.005, (Math.random() - 0.5) * 0.1);
        burrow.add(track);
      }
      const bX = (Math.random() - 0.5) * w * 0.7;
      const bZ = (Math.random() - 0.5) * d * 0.7;
      burrow.position.set(bX, getTerrainHeight(bX, bZ, 1.4), bZ);
      burrow.rotation.y = Math.random() * Math.PI; mctx.scene.add(burrow);
    }

    // ── Sand-buried statue ──
    for (let i = 0; i < 3; i++) {
      const buriedStatue = new THREE.Group();
      const sandMound = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 16), sandMat);
      sandMound.scale.y = 0.4; buriedStatue.add(sandMound);
      const statHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), statueMat);
      statHead.position.y = 0.5; buriedStatue.add(statHead);
      const statArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 16), statueMat);
      statArm.position.set(0.6, 0.3, 0); statArm.rotation.z = -1.0; buriedStatue.add(statArm);
      const bsX = (Math.random() - 0.5) * w * 0.6;
      const bsZ = (Math.random() - 0.5) * d * 0.6;
      buriedStatue.position.set(bsX, getTerrainHeight(bsX, bsZ, 1.4) - 0.2, bsZ);
      buriedStatue.rotation.y = Math.random() * Math.PI; mctx.scene.add(buriedStatue);
    }

    // ── Desert outpost tower ──
    for (let i = 0; i < 2; i++) {
      const tower = new THREE.Group();
      const towerH = 5 + Math.random() * 2;
      const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, towerH, 10), stoneMat);
      towerBody.position.y = towerH / 2; tower.add(towerBody);
      const platform = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.2), ruinMat);
      platform.position.y = towerH; tower.add(platform);
      // Ladder
      const ladderH = towerH * 0.8;
      for (const lSide of [-0.15, 0.15]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ladderH, 8), palmTrunkMat);
        rail.position.set(lSide, ladderH / 2 + 0.5, 0.9); tower.add(rail);
      }
      for (let rung = 0; rung < 6; rung++) {
        const rungMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), palmTrunkMat);
        rungMesh.position.set(0, 1 + rung * (ladderH / 7), 0.9); tower.add(rungMesh);
      }
      // Tattered awning
      const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), tentMat);
      awning.position.set(0, towerH + 0.8, 0.5);
      awning.rotation.x = -0.3; tower.add(awning);
      const twX = (Math.random() - 0.5) * w * 0.5;
      const twZ = (Math.random() - 0.5) * d * 0.5;
      tower.position.set(twX, getTerrainHeight(twX, twZ, 1.4), twZ);
      mctx.scene.add(tower);
    }

    // ── Dried riverbed ──
    {
      const riverbedGroup = new THREE.Group();
      const rbLen = w * 0.6;
      const rbWidth = 3 + Math.random() * 2;
      const rbTrench = new THREE.Mesh(new THREE.BoxGeometry(rbLen, 0.15, rbWidth), darkSandMat);
      rbTrench.position.y = -0.05; riverbedGroup.add(rbTrench);
      // Cracked mud texture lines
      for (let c = 0; c < 25; c++) {
        const crackLen = 0.5 + Math.random() * 1.5;
        const crackLine = new THREE.Mesh(new THREE.BoxGeometry(crackLen, 0.01, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1.0 }));
        crackLine.position.set((Math.random() - 0.5) * rbLen * 0.8, 0.01, (Math.random() - 0.5) * rbWidth * 0.4);
        crackLine.rotation.y = Math.random() * Math.PI;
        riverbedGroup.add(crackLine);
      }
      // Scattered dry rocks
      for (let r = 0; r < 8; r++) {
        const dryRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 1), stoneMat);
        dryRock.position.set((Math.random() - 0.5) * rbLen * 0.7, 0.05, (Math.random() - 0.5) * rbWidth * 0.4);
        riverbedGroup.add(dryRock);
      }
      riverbedGroup.position.set(0, getTerrainHeight(0, 0, 1.4) - 0.1, d * 0.15);
      riverbedGroup.rotation.y = Math.random() * 0.3;
      mctx.scene.add(riverbedGroup);
    }

    // ── Vulture perch props ──
    for (let i = 0; i < 4; i++) {
      const perch = new THREE.Group();
      const branchH = 2 + Math.random() * 1.5;
      const deadBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, branchH, 10), palmTrunkMat);
      deadBranch.position.y = branchH / 2;
      deadBranch.rotation.z = (Math.random() - 0.5) * 0.2;
      perch.add(deadBranch);
      // Bird silhouette
      const bird = new THREE.Group();
      const birdBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      bird.add(birdBody);
      const birdHead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 0.9 }));
      birdHead.position.set(0, 0.08, 0.15); bird.add(birdHead);
      // Wings
      for (const wSide of [-1, 1]) {
        const wing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, side: THREE.DoubleSide }),
        );
        wing.position.set(wSide * 0.2, 0.02, 0);
        wing.rotation.z = wSide * 0.3;
        bird.add(wing);
      }
      bird.position.y = branchH; perch.add(bird);
      const vpX = (Math.random() - 0.5) * w * 0.6;
      const vpZ = (Math.random() - 0.5) * d * 0.6;
      perch.position.set(vpX, getTerrainHeight(vpX, vpZ, 1.4), vpZ);
      mctx.scene.add(perch);
    }
}

export function buildEmeraldGrasslands(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0xaaccaa, 0.006);
    mctx.applyTerrainColors(0x449922, 0x66bb44, 1.4);
    mctx.dirLight.color.setHex(0xfff5dd);
    mctx.dirLight.intensity = 1.6;
    mctx.ambientLight.color.setHex(0x336622);
    mctx.ambientLight.intensity = 0.7;
    mctx.hemiLight.color.setHex(0xbbdd88);
    mctx.hemiLight.groundColor.setHex(0x445522);
    const hw = w / 2, hd = d / 2;

    const grassDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a7a1e, roughness: 0.88 });
    const grassMidMat = new THREE.MeshStandardMaterial({ color: 0x4e9930, roughness: 0.85 });
    const grassLightMat = new THREE.MeshStandardMaterial({ color: 0x66bb44, roughness: 0.82 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x959085, roughness: 0.82, metalness: 0.03 });
    const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0x7a7568, roughness: 0.9, metalness: 0.02 });
    const stoneLightMat = new THREE.MeshStandardMaterial({ color: 0xb0aa9a, roughness: 0.78, metalness: 0.05 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x44aa22, roughness: 0.5, transparent: true, opacity: 0.7, depthWrite: false });
    const flowerColors = [0xff6688, 0xffdd44, 0xcc88ff, 0xff8844, 0x88ddff, 0xffaacc];
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4488bb, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.65 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9B7653, roughness: 0.8 });
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.8 });

    // ── Gently rolling hills (layered ground patches for natural color variation) ──
    const hillMats = [grassDarkMat, grassMidMat, grassLightMat];
    for (let i = 0; i < 35; i++) {
      const sx = 10 + Math.random() * 25;
      const sy = 0.04 + Math.random() * 0.08;
      const sz = 10 + Math.random() * 25;
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 16),
        hillMats[i % 3],
      );
      hill.scale.set(sx, sy, sz);
      hill.rotation.y = Math.random() * Math.PI;
      const hx = (Math.random() - 0.5) * w * 0.95;
      const hz = (Math.random() - 0.5) * d * 0.95;
      hill.position.set(hx, getTerrainHeight(hx, hz, 1.4) + sy * 0.25, hz);
      hill.receiveShadow = true;
      mctx.scene.add(hill);
    }

    // ── Grass clump tufts scattered on ground ──
    const grassTuftMat = new THREE.MeshStandardMaterial({ color: 0x5aaa35, roughness: 0.8, side: THREE.DoubleSide });
    const grassTuftDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a8820, roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 200; i++) {
      const gx = (Math.random() - 0.5) * w * 0.9;
      const gz = (Math.random() - 0.5) * d * 0.9;
      const gy = getTerrainHeight(gx, gz, 1.4);
      const tuftGroup = new THREE.Group();
      const bladeCount = 4 + Math.floor(Math.random() * 5);
      for (let b = 0; b < bladeCount; b++) {
        const bladeH = 0.15 + Math.random() * 0.25;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.04, bladeH),
          Math.random() > 0.4 ? grassTuftMat : grassTuftDarkMat,
        );
        blade.position.set((Math.random() - 0.5) * 0.12, bladeH * 0.5, (Math.random() - 0.5) * 0.12);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.x = (Math.random() - 0.5) * 0.4;
        tuftGroup.add(blade);
      }
      tuftGroup.position.set(gx, gy, gz);
      mctx.scene.add(tuftGroup);
    }

    // ── Wildflower patches (clustered, with petals and leaves) ──
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x337722, roughness: 0.8 });
    const flowerLeafMat = new THREE.MeshStandardMaterial({ color: 0x44882a, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 30; i++) {
      // Each patch has several flowers clustered together
      const patchX = (Math.random() - 0.5) * w * 0.85;
      const patchZ = (Math.random() - 0.5) * d * 0.85;
      const clusterSize = 3 + Math.floor(Math.random() * 5);
      for (let f = 0; f < clusterSize; f++) {
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const fx = patchX + (Math.random() - 0.5) * 2;
        const fz = patchZ + (Math.random() - 0.5) * 2;
        const fy = getTerrainHeight(fx, fz, 1.4);
        const stemH = 0.15 + Math.random() * 0.2;
        const flowerGrp = new THREE.Group();
        // Stem
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, stemH, 12), stemMat);
        stem.position.y = stemH * 0.5;
        flowerGrp.add(stem);
        // Flower head — multiple small petals around center
        const petalCount = 4 + Math.floor(Math.random() * 3);
        const petalR = 0.04 + Math.random() * 0.03;
        const flowerMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
        for (let p = 0; p < petalCount; p++) {
          const pAngle = (p / petalCount) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(petalR, 8, 6), flowerMat);
          petal.position.set(Math.cos(pAngle) * petalR * 1.2, stemH + 0.02, Math.sin(pAngle) * petalR * 1.2);
          petal.scale.set(1, 0.5, 1);
          flowerGrp.add(petal);
        }
        // Center
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(petalR * 0.6, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xffdd44, roughness: 0.5 }),
        );
        center.position.y = stemH + 0.03;
        flowerGrp.add(center);
        // Small leaf on stem
        if (Math.random() > 0.4) {
          const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), flowerLeafMat);
          lf.position.set(0.03, stemH * 0.4, 0);
          lf.rotation.z = -0.4;
          flowerGrp.add(lf);
        }
        flowerGrp.position.set(fx, fy, fz);
        mctx.scene.add(flowerGrp);
      }
    }

    // ── Deciduous trees (scattered, polished) ──
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.92, metalness: 0.02 });
    const barkDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d2510, roughness: 0.95 });
    const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x338818, roughness: 0.55, transparent: true, opacity: 0.75, depthWrite: false });
    const leafBrightMat = new THREE.MeshStandardMaterial({ color: 0x55cc33, roughness: 0.45, transparent: true, opacity: 0.65, depthWrite: false });

    for (let i = 0; i < 30; i++) {
      const tree = new THREE.Group();
      const trunkH = 3 + Math.random() * 3;
      const trunkRTop = 0.15 + Math.random() * 0.08;
      const trunkRBot = trunkRTop * 1.6 + Math.random() * 0.1;

      // Trunk with taper
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkRTop, trunkRBot, trunkH, 12), barkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Bark rings (subtle wood detail)
      const barkRingCount = 2 + Math.floor(Math.random() * 2);
      for (let br = 0; br < barkRingCount; br++) {
        const ringY = 0.4 + (br / barkRingCount) * trunkH * 0.6;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(trunkRBot * 1.1, trunkRBot * 0.18, 8, 14),
          barkDarkMat,
        );
        ring.position.y = ringY;
        ring.rotation.x = Math.PI / 2;
        tree.add(ring);
      }

      // Exposed roots at base (3-5)
      const rootCount = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < rootCount; r++) {
        const rootAngle = (r / rootCount) * Math.PI * 2 + Math.random() * 0.5;
        const rootLen = 0.4 + Math.random() * 0.6;
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(trunkRBot * 0.25, trunkRBot * 0.1, rootLen, 12),
          barkMat,
        );
        root.position.set(Math.cos(rootAngle) * trunkRBot * 0.7, rootLen * 0.2, Math.sin(rootAngle) * trunkRBot * 0.7);
        root.rotation.z = Math.cos(rootAngle) * 0.9;
        root.rotation.x = Math.sin(rootAngle) * 0.9;
        tree.add(root);
      }

      // Main branches (2-3 splitting from upper trunk)
      const branchCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < branchCount; b++) {
        const brAng = (b / branchCount) * Math.PI * 2 + Math.random() * 0.8;
        const brLen = 1.0 + Math.random() * 1.5;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(trunkRTop * 0.3, trunkRTop * 0.7, brLen, 12),
          barkMat,
        );
        branch.position.set(
          Math.cos(brAng) * trunkRTop * 0.5,
          trunkH * 0.55 + Math.random() * trunkH * 0.35,
          Math.sin(brAng) * trunkRTop * 0.5,
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.2 + (brAng > Math.PI ? 0.5 : -0.5);
        branch.rotation.y = brAng;
        tree.add(branch);
      }

      // Canopy (4-5 overlapping spheres for fuller look)
      const canopyR = 1.5 + Math.random() * 2;
      const leafMats = [leafMat, leafDarkMat, leafBrightMat];
      const canopyCount = 4 + Math.floor(Math.random() * 2);
      for (let c = 0; c < canopyCount; c++) {
        const lr = canopyR * (0.5 + Math.random() * 0.5);
        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(lr, 16, 12),
          leafMats[c % leafMats.length],
        );
        canopy.position.set(
          (Math.random() - 0.5) * canopyR * 0.7,
          trunkH + canopyR * 0.2 + (Math.random() - 0.5) * canopyR * 0.4,
          (Math.random() - 0.5) * canopyR * 0.7,
        );
        canopy.castShadow = true;
        tree.add(canopy);
      }

      // Shadow disc at base
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(canopyR * 1.1, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }),
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.02;
      tree.add(shadowDisc);

      const trX = (Math.random() - 0.5) * w * 0.85;
      const trZ = (Math.random() - 0.5) * d * 0.85;
      tree.position.set(trX, getTerrainHeight(trX, trZ, 1.4), trZ);
      mctx.scene.add(tree);
    }

    // ── Creek / stream (continuous winding water ribbon with banks and reeds) ──
    const streamBankMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.92 });
    const streamBedMat = new THREE.MeshStandardMaterial({ color: 0x3a5566, roughness: 0.4, metalness: 0.1 });
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.85 });
    const reedDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d5a1e, roughness: 0.9 });
    const reedTipMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });

    // Generate stream path points
    const streamParts = 28;
    const streamPath: { x: number; z: number; w: number }[] = [];
    {
      let sX = -hw * 0.5, sZ = -hd * 0.15;
      let sAngle = 0.3;
      streamPath.push({ x: sX, z: sZ, w: 1.4 });
      for (let i = 0; i < streamParts; i++) {
        sAngle += (Math.random() - 0.5) * 0.35;
        const segLen = 3 + Math.random() * 2;
        sX += Math.cos(sAngle) * segLen;
        sZ += Math.sin(sAngle) * segLen;
        const wVar = 1.2 + Math.sin(i * 0.6) * 0.4 + Math.random() * 0.2;
        streamPath.push({ x: sX, z: sZ, w: wVar });
      }
    }

    // Build continuous water ribbon, stream bed, and bank meshes
    const waterVerts: number[] = [], waterIdx: number[] = [];
    const bedVerts: number[] = [], bedIdx: number[] = [];
    const bankLVerts: number[] = [], bankLIdx: number[] = [];
    const bankRVerts: number[] = [], bankRIdx: number[] = [];

    for (let i = 0; i < streamPath.length; i++) {
      const p0 = streamPath[i];
      const pNext = streamPath[Math.min(i + 1, streamPath.length - 1)];
      const pPrev = streamPath[Math.max(i - 1, 0)];
      // Direction and perpendicular
      const dx = pNext.x - pPrev.x, dz = pNext.z - pPrev.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len; // perpendicular
      const ty = getTerrainHeight(p0.x, p0.z, 1.4);
      const hw2 = p0.w / 2;
      const bedHw = hw2 + 0.3;
      const bankW = 0.6;

      // Water ribbon: left and right edge
      waterVerts.push(p0.x + nx * hw2, ty + 0.03, p0.z + nz * hw2);
      waterVerts.push(p0.x - nx * hw2, ty + 0.03, p0.z - nz * hw2);
      // Bed ribbon (wider)
      bedVerts.push(p0.x + nx * bedHw, ty + 0.01, p0.z + nz * bedHw);
      bedVerts.push(p0.x - nx * bedHw, ty + 0.01, p0.z - nz * bedHw);
      // Left bank ribbon
      bankLVerts.push(p0.x + nx * (hw2 + 0.1), ty + 0.02, p0.z + nz * (hw2 + 0.1));
      bankLVerts.push(p0.x + nx * (hw2 + bankW), ty + 0.02, p0.z + nz * (hw2 + bankW));
      // Right bank ribbon
      bankRVerts.push(p0.x - nx * (hw2 + 0.1), ty + 0.02, p0.z - nz * (hw2 + 0.1));
      bankRVerts.push(p0.x - nx * (hw2 + bankW), ty + 0.02, p0.z - nz * (hw2 + bankW));

      if (i > 0) {
        const vi = (i - 1) * 2;
        const quad = [vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3];
        waterIdx.push(...quad);
        bedIdx.push(...quad);
        bankLIdx.push(...quad);
        bankRIdx.push(...quad);
      }
    }

    // Create continuous meshes
    const makeRibbonMesh = (verts: number[], idx: number[], mat: THREE.Material) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mctx.scene.add(mesh);
    };
    makeRibbonMesh(waterVerts, waterIdx, waterMat);
    makeRibbonMesh(bedVerts, bedIdx, streamBedMat);
    makeRibbonMesh(bankLVerts, bankLIdx, streamBankMat);
    makeRibbonMesh(bankRVerts, bankRIdx, streamBankMat);

    // Occasional rocks in stream
    for (let i = 2; i < streamPath.length - 2; i += 2) {
      if (Math.random() > 0.5) {
        const sp = streamPath[i];
        const ty = getTerrainHeight(sp.x, sp.z, 1.4);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.12, 1), stoneMat);
        rock.position.set(sp.x + (Math.random() - 0.5) * sp.w * 0.4, ty + 0.08, sp.z + (Math.random() - 0.5) * sp.w * 0.4);
        rock.scale.y = 0.5;
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        mctx.scene.add(rock);
      }
    }

    // Reeds along stream banks
    for (let i = 1; i < streamPath.length - 1; i++) {
      if (Math.random() > 0.4) continue; // ~60% of points get reeds
      const sp = streamPath[i];
      const pNext = streamPath[Math.min(i + 1, streamPath.length - 1)];
      const pPrev = streamPath[Math.max(i - 1, 0)];
      const dx = pNext.x - pPrev.x, dz = pNext.z - pPrev.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len;
      const ty = getTerrainHeight(sp.x, sp.z, 1.4);

      // Place a cluster of 2-5 reeds on a random side
      const side = Math.random() > 0.5 ? 1 : -1;
      const clusterSize = 2 + Math.floor(Math.random() * 4);
      for (let r = 0; r < clusterSize; r++) {
        const bankDist = sp.w / 2 + 0.2 + Math.random() * 0.6;
        const along = (Math.random() - 0.5) * 1.5;
        const rx = sp.x + nx * side * bankDist + (dx / len) * along;
        const rz = sp.z + nz * side * bankDist + (dz / len) * along;
        const reedH = 0.6 + Math.random() * 0.8;
        const reedLean = (Math.random() - 0.5) * 0.3;
        // Reed stem
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.02, reedH, 5),
          Math.random() > 0.5 ? reedMat : reedDarkMat
        );
        stem.position.set(rx, ty + reedH / 2, rz);
        stem.rotation.z = reedLean;
        stem.rotation.x = (Math.random() - 0.5) * 0.2;
        mctx.scene.add(stem);
        // Reed cattail tip (on taller reeds)
        if (reedH > 0.9) {
          const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.15, 6), reedTipMat);
          tip.position.set(rx + Math.sin(reedLean) * 0.08, ty + reedH + 0.05, rz);
          tip.rotation.z = reedLean;
          mctx.scene.add(tip);
        }
        // Reed leaf blade (occasional)
        if (Math.random() > 0.5) {
          const leaf = new THREE.Mesh(
            new THREE.PlaneGeometry(0.04, reedH * 0.7),
            new THREE.MeshStandardMaterial({ color: 0x4a6b1e, roughness: 0.85, side: THREE.DoubleSide })
          );
          leaf.position.set(rx, ty + reedH * 0.4, rz);
          leaf.rotation.z = reedLean + (Math.random() - 0.5) * 0.5;
          leaf.rotation.y = Math.random() * Math.PI;
          mctx.scene.add(leaf);
        }
      }
    }

    // ── Stone bridge over stream ──
    const bridgeX = 0, bridgeZ = -hd * 0.15;
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 3), stoneMat);
    bridgeDeck.position.set(bridgeX, 1.2, bridgeZ);
    mctx.scene.add(bridgeDeck);
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.2), stoneMat);
    rail1.position.set(bridgeX, 1.8, bridgeZ - 1.4);
    mctx.scene.add(rail1);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.2), stoneMat);
    rail2.position.set(bridgeX, 1.8, bridgeZ + 1.4);
    mctx.scene.add(rail2);
    // Arched support
    const archSupport = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.25, 23, 27, Math.PI), stoneMat);
    archSupport.rotation.y = Math.PI / 2;
    archSupport.position.set(bridgeX, 0.2, bridgeZ);
    mctx.scene.add(archSupport);
    // Brick lines on bridge deck (horizontal mortar lines)
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.95 });
    for (let bRow = 0; bRow < 5; bRow++) {
      const bLine = new THREE.Mesh(new THREE.BoxGeometry(5.02, 0.02, 0.02), mortarMat);
      bLine.position.set(bridgeX, 1.42, bridgeZ - 1.2 + bRow * 0.6);
      mctx.scene.add(bLine);
    }
    // Brick lines on deck (vertical mortar, offset per row)
    for (let bRow = 0; bRow < 5; bRow++) {
      const rowZ = bridgeZ - 1.2 + bRow * 0.6;
      const offset = bRow % 2 === 0 ? 0 : 0.4;
      for (let bCol = -2.4 + offset; bCol <= 2.4; bCol += 0.8) {
        const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.6), mortarMat);
        vLine.position.set(bridgeX + bCol, 1.42, rowZ + 0.3);
        mctx.scene.add(vLine);
      }
    }
    // Brick lines on rails (horizontal mortar)
    for (const railZ of [bridgeZ - 1.4, bridgeZ + 1.4]) {
      for (let rRow = 0; rRow < 3; rRow++) {
        const rLine = new THREE.Mesh(new THREE.BoxGeometry(5.02, 0.02, 0.22), mortarMat);
        rLine.position.set(bridgeX, 1.5 + rRow * 0.28, railZ);
        mctx.scene.add(rLine);
      }
      // Vertical brick joints on rails (offset per row)
      for (let rRow = 0; rRow < 3; rRow++) {
        const rOffset = rRow % 2 === 0 ? 0 : 0.35;
        for (let bCol = -2.4 + rOffset; bCol <= 2.4; bCol += 0.7) {
          const vJoint = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.22), mortarMat);
          vJoint.position.set(bridgeX + bCol, 1.5 + rRow * 0.28 + 0.14, railZ);
          mctx.scene.add(vJoint);
        }
      }
    }
    // Capstones on top of rails
    const capstoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.75 });
    for (const railZ of [bridgeZ - 1.4, bridgeZ + 1.4]) {
      for (let cx2 = -2.2; cx2 <= 2.2; cx2 += 0.55) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.3), capstoneMat);
        cap.position.set(bridgeX + cx2, 2.24, railZ);
        mctx.scene.add(cap);
      }
    }

    // ── Hay bales (round & rectangular with detail) ──
    const hayDarkMat = new THREE.MeshStandardMaterial({ color: 0xb89930, roughness: 0.92 });
    const hayLightMat = new THREE.MeshStandardMaterial({ color: 0xddbb55, roughness: 0.88 });
    const twineMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.8 });
    for (let i = 0; i < 15; i++) {
      const hayX = (Math.random() - 0.5) * w * 0.7;
      const hayZ = (Math.random() - 0.5) * d * 0.7;
      const baseY = getTerrainHeight(hayX, hayZ, 1.4);
      const baleGroup = new THREE.Group();
      if (i % 3 !== 0) {
        // Round bale
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 18), i % 2 === 0 ? hayMat : hayDarkMat);
        bale.rotation.z = Math.PI / 2;
        bale.castShadow = true;
        baleGroup.add(bale);
        // Twine bands
        for (const tx of [-0.2, 0.2]) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 12, 14), twineMat);
          band.position.x = tx;
          band.rotation.y = Math.PI / 2;
          baleGroup.add(band);
        }
        // Straw wisps
        for (let sw = 0; sw < 4; sw++) {
          const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.08 + Math.random() * 0.06, 3), hayLightMat);
          straw.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.5);
          straw.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
          baleGroup.add(straw);
        }
        baleGroup.position.set(hayX, baseY + 0.5, hayZ);
      } else {
        // Rectangular bale
        const bale = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.35), i % 4 === 0 ? hayMat : hayDarkMat);
        bale.castShadow = true;
        baleGroup.add(bale);
        // Twine binding straps
        for (const tx of [-0.15, 0.15]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.31, 0.36), twineMat);
          strap.position.x = tx;
          baleGroup.add(strap);
        }
        // Straw wisps
        for (let sw = 0; sw < 3; sw++) {
          const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.06, 8), hayLightMat);
          straw.position.set((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.3);
          straw.rotation.z = Math.random() * Math.PI;
          baleGroup.add(straw);
        }
        baleGroup.position.set(hayX, baseY + 0.15, hayZ);
      }
      baleGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(baleGroup);
    }

    // ── Farmstead (detailed buildings + fences) ──
    const farmX = hw * 0.3, farmZ = -hd * 0.35;

    // Extra materials for farmstead details
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x5C3A1E, roughness: 0.75 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3B2210, roughness: 0.8 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x8899bb, roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.7 });
    const redPaintMat = new THREE.MeshStandardMaterial({ color: 0x8B2500, roughness: 0.7 });
    const flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xcc2244, roughness: 0.6 });
    const flowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xeedd33, roughness: 0.6 });
    const flowerPinkMat = new THREE.MeshStandardMaterial({ color: 0xee88aa, roughness: 0.6 });
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 1, transparent: true, opacity: 0.25 });
    const chickenWireMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5, metalness: 0.3 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8B7D6B, roughness: 0.9 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 });

    // ─── 1. MAIN FARMHOUSE ───
    // Stone foundation
    const fhFoundation = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 5.5), darkStoneMat);
    fhFoundation.position.set(farmX, 0.3, farmZ);
    mctx.scene.add(fhFoundation);

    // Main walls
    const fhWalls = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 5), new THREE.MeshStandardMaterial({ color: 0xddc89e, roughness: 0.75 }));
    fhWalls.position.set(farmX, 2.2, farmZ);
    mctx.scene.add(fhWalls);

    // Timber frame - horizontal beams
    const hBeamGeo = new THREE.BoxGeometry(5.1, 0.12, 0.12);
    for (const by of [1.0, 2.2, 3.4]) {
      for (const bz of [farmZ - 2.51, farmZ + 2.51]) {
        const hb = new THREE.Mesh(hBeamGeo, timberMat);
        hb.position.set(farmX, by, bz);
        mctx.scene.add(hb);
      }
    }
    const hBeamSideGeo = new THREE.BoxGeometry(0.12, 0.12, 5.1);
    for (const by of [1.0, 2.2, 3.4]) {
      for (const bx of [farmX - 2.51, farmX + 2.51]) {
        const hbs = new THREE.Mesh(hBeamSideGeo, timberMat);
        hbs.position.set(bx, by, farmZ);
        mctx.scene.add(hbs);
      }
    }
    // Timber frame - vertical beams on front/back
    const vBeamGeo = new THREE.BoxGeometry(0.12, 3.2, 0.12);
    for (const vx of [-2.0, -0.8, 0.8, 2.0]) {
      for (const bz of [farmZ - 2.51, farmZ + 2.51]) {
        const vb = new THREE.Mesh(vBeamGeo, timberMat);
        vb.position.set(farmX + vx, 2.2, bz);
        mctx.scene.add(vb);
      }
    }
    // Vertical beams on sides
    for (const vz of [-1.5, 0, 1.5]) {
      for (const bx of [farmX - 2.51, farmX + 2.51]) {
        const vbs = new THREE.Mesh(vBeamGeo, timberMat);
        vbs.position.set(bx, 2.2, farmZ + vz);
        mctx.scene.add(vbs);
      }
    }

    // Front windows (2 windows on +Z face)
    for (const wx of [-1.4, 1.4]) {
      // Window pane
      const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.06), windowMat);
      winPane.position.set(farmX + wx, 2.4, farmZ + 2.53);
      mctx.scene.add(winPane);
      // Window frame (4 thin boxes)
      const wfTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), timberMat);
      wfTop.position.set(farmX + wx, 2.9, farmZ + 2.54);
      mctx.scene.add(wfTop);
      const wfBot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), timberMat);
      wfBot.position.set(farmX + wx, 1.9, farmZ + 2.54);
      mctx.scene.add(wfBot);
      const wfL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.08, 0.08), timberMat);
      wfL.position.set(farmX + wx - 0.46, 2.4, farmZ + 2.54);
      mctx.scene.add(wfL);
      const wfR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.08, 0.08), timberMat);
      wfR.position.set(farmX + wx + 0.46, 2.4, farmZ + 2.54);
      mctx.scene.add(wfR);
      // Cross mullion
      const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.07), timberMat);
      mullionH.position.set(farmX + wx, 2.4, farmZ + 2.55);
      mctx.scene.add(mullionH);
      const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.07), timberMat);
      mullionV.position.set(farmX + wx, 2.4, farmZ + 2.55);
      mctx.scene.add(mullionV);
      // Shutters
      const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.06), timberMat);
      shutterL.position.set(farmX + wx - 0.65, 2.4, farmZ + 2.56);
      mctx.scene.add(shutterL);
      const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.06), timberMat);
      shutterR.position.set(farmX + wx + 0.65, 2.4, farmZ + 2.56);
      mctx.scene.add(shutterR);
      // Flower box under window
      const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.25), timberMat);
      flowerBox.position.set(farmX + wx, 1.8, farmZ + 2.6);
      mctx.scene.add(flowerBox);
      // Flowers (small spheres)
      const flowerMats = [flowerRedMat, flowerYellowMat, flowerPinkMat];
      for (let fi = 0; fi < 5; fi++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), flowerMats[fi % 3]);
        fl.position.set(farmX + wx - 0.3 + fi * 0.15, 1.98, farmZ + 2.6);
        mctx.scene.add(fl);
        // Tiny green leaf
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), greenMat);
        leaf.position.set(farmX + wx - 0.3 + fi * 0.15, 1.92, farmZ + 2.6);
        mctx.scene.add(leaf);
      }
    }

    // Side windows (1 each on +X and -X faces)
    for (const side of [-1, 1]) {
      const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.8), windowMat);
      winPane.position.set(farmX + side * 2.53, 2.4, farmZ);
      mctx.scene.add(winPane);
      const swfTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), timberMat);
      swfTop.position.set(farmX + side * 2.54, 2.9, farmZ);
      mctx.scene.add(swfTop);
      const swfBot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), timberMat);
      swfBot.position.set(farmX + side * 2.54, 1.9, farmZ);
      mctx.scene.add(swfBot);
      const swfL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.08, 0.08), timberMat);
      swfL.position.set(farmX + side * 2.54, 2.4, farmZ - 0.46);
      mctx.scene.add(swfL);
      const swfR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.08, 0.08), timberMat);
      swfR.position.set(farmX + side * 2.54, 2.4, farmZ + 0.46);
      mctx.scene.add(swfR);
      // Shutters on sides
      const sShutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.35), timberMat);
      sShutL.position.set(farmX + side * 2.56, 2.4, farmZ - 0.65);
      mctx.scene.add(sShutL);
      const sShutR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.35), timberMat);
      sShutR.position.set(farmX + side * 2.56, 2.4, farmZ + 0.65);
      mctx.scene.add(sShutR);
    }

    // Front door with frame, handle, doorstep
    const doorStep = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.6), darkStoneMat);
    doorStep.position.set(farmX, 0.68, farmZ + 2.8);
    mctx.scene.add(doorStep);
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.1), darkWoodMat);
    doorPanel.position.set(farmX, 1.7, farmZ + 2.53);
    mctx.scene.add(doorPanel);
    // Door frame
    const dfTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.14), timberMat);
    dfTop.position.set(farmX, 2.86, farmZ + 2.54);
    mctx.scene.add(dfTop);
    const dfL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.14), timberMat);
    dfL.position.set(farmX - 0.58, 1.7, farmZ + 2.54);
    mctx.scene.add(dfL);
    const dfR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.14), timberMat);
    dfR.position.set(farmX + 0.58, 1.7, farmZ + 2.54);
    mctx.scene.add(dfR);
    // Door handle
    const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), metalMat);
    doorHandle.position.set(farmX + 0.35, 1.7, farmZ + 2.62);
    mctx.scene.add(doorHandle);

    // Peaked roof (2 slopes using rotated boxes)
    const roofW = 6.0, roofSlope = 2.0; void 0.6; // roofOverhang reserved
    const roofLen = Math.sqrt(roofSlope * roofSlope + (roofW / 2) * (roofW / 2));
    const roofAngle = Math.atan2(roofSlope, roofW / 2);
    // Left slope
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(roofLen, 0.15, 5.8), roofMat);
    roofL.position.set(farmX - roofW / 4 + 0.2, 3.8 + roofSlope / 2, farmZ);
    roofL.rotation.z = roofAngle;
    mctx.scene.add(roofL);
    // Right slope
    const roofR = new THREE.Mesh(new THREE.BoxGeometry(roofLen, 0.15, 5.8), roofMat);
    roofR.position.set(farmX + roofW / 4 - 0.2, 3.8 + roofSlope / 2, farmZ);
    roofR.rotation.z = -roofAngle;
    mctx.scene.add(roofR);
    // Ridge beam
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 5.9), timberMat);
    ridgeBeam.position.set(farmX, 3.8 + roofSlope, farmZ);
    mctx.scene.add(ridgeBeam);
    // Gable fill (front and back triangular fill with wall material)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-2.5, 0);
    gableShape.lineTo(0, roofSlope);
    gableShape.lineTo(2.5, 0);
    gableShape.lineTo(-2.5, 0);
    const gableGeo = new THREE.ShapeGeometry(gableShape);
    const gableFront = new THREE.Mesh(gableGeo, new THREE.MeshStandardMaterial({ color: 0xddc89e, roughness: 0.75 }));
    gableFront.position.set(farmX, 3.8, farmZ + 2.5);
    mctx.scene.add(gableFront);
    const gableBack = new THREE.Mesh(gableGeo, new THREE.MeshStandardMaterial({ color: 0xddc89e, roughness: 0.75 }));
    gableBack.position.set(farmX, 3.8, farmZ - 2.5);
    gableBack.rotation.y = Math.PI;
    mctx.scene.add(gableBack);

    // Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.7), darkStoneMat);
    chimney.position.set(farmX + 1.5, 4.8, farmZ - 1.0);
    mctx.scene.add(chimney);
    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), darkStoneMat);
    chimneyCap.position.set(farmX + 1.5, 5.86, farmZ - 1.0);
    mctx.scene.add(chimneyCap);
    // Smoke puffs
    for (let si = 0; si < 5; si++) {
      const smokeS = new THREE.Mesh(new THREE.SphereGeometry(0.12 + si * 0.04, 12, 10), smokeMat);
      smokeS.position.set(farmX + 1.5 + (Math.random() - 0.5) * 0.3, 6.0 + si * 0.4, farmZ - 1.0 + (Math.random() - 0.5) * 0.3);
      mctx.scene.add(smokeS);
    }

    // ─── 2. BARN ───
    const barnX = farmX + 9, barnZ = farmZ - 2;
    // Barn body
    const barnBody = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 5), redPaintMat);
    barnBody.position.set(barnX, 2.25, barnZ);
    mctx.scene.add(barnBody);
    // Barn foundation
    const barnFound = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.4, 5.3), darkStoneMat);
    barnFound.position.set(barnX, 0.2, barnZ);
    mctx.scene.add(barnFound);

    // Barn peaked roof
    const barnRoofLen = Math.sqrt(2.0 * 2.0 + 3.5 * 3.5);
    const barnRoofAng = Math.atan2(2.0, 3.5);
    const barnRoofL = new THREE.Mesh(new THREE.BoxGeometry(barnRoofLen, 0.15, 5.6), roofMat);
    barnRoofL.position.set(barnX - 1.6, 4.5 + 1.0, barnZ);
    barnRoofL.rotation.z = barnRoofAng;
    mctx.scene.add(barnRoofL);
    const barnRoofR = new THREE.Mesh(new THREE.BoxGeometry(barnRoofLen, 0.15, 5.6), roofMat);
    barnRoofR.position.set(barnX + 1.6, 4.5 + 1.0, barnZ);
    barnRoofR.rotation.z = -barnRoofAng;
    mctx.scene.add(barnRoofR);
    // Barn ridge
    const barnRidge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 5.7), timberMat);
    barnRidge.position.set(barnX, 4.5 + 2.0, barnZ);
    mctx.scene.add(barnRidge);
    // Barn gable fill
    const barnGableShape = new THREE.Shape();
    barnGableShape.moveTo(-3.5, 0);
    barnGableShape.lineTo(0, 2.0);
    barnGableShape.lineTo(3.5, 0);
    barnGableShape.lineTo(-3.5, 0);
    const barnGableGeo = new THREE.ShapeGeometry(barnGableShape);
    const barnGableFront = new THREE.Mesh(barnGableGeo, redPaintMat);
    barnGableFront.position.set(barnX, 4.5, barnZ + 2.5);
    mctx.scene.add(barnGableFront);
    const barnGableBack = new THREE.Mesh(barnGableGeo, redPaintMat);
    barnGableBack.position.set(barnX, 4.5, barnZ - 2.5);
    barnGableBack.rotation.y = Math.PI;
    mctx.scene.add(barnGableBack);

    // Large barn door (front face, +Z)
    const barnDoor = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.5, 0.1), darkWoodMat);
    barnDoor.position.set(barnX, 1.75, barnZ + 2.51);
    mctx.scene.add(barnDoor);
    // Cross-beam X pattern on door
    const barnXLen = Math.sqrt(3.0 * 3.0 + 3.5 * 3.5);
    const barnXAng = Math.atan2(3.5, 3.0);
    const barnCross1 = new THREE.Mesh(new THREE.BoxGeometry(barnXLen, 0.1, 0.06), timberMat);
    barnCross1.position.set(barnX, 1.75, barnZ + 2.56);
    barnCross1.rotation.z = barnXAng;
    mctx.scene.add(barnCross1);
    const barnCross2 = new THREE.Mesh(new THREE.BoxGeometry(barnXLen, 0.1, 0.06), timberMat);
    barnCross2.position.set(barnX, 1.75, barnZ + 2.56);
    barnCross2.rotation.z = -barnXAng;
    mctx.scene.add(barnCross2);
    // Door frame trim
    const bdFrTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 0.12), timberMat);
    bdFrTop.position.set(barnX, 3.55, barnZ + 2.54);
    mctx.scene.add(bdFrTop);
    const bdFrL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.12), timberMat);
    bdFrL.position.set(barnX - 1.55, 1.75, barnZ + 2.54);
    mctx.scene.add(bdFrL);
    const bdFrR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.12), timberMat);
    bdFrR.position.set(barnX + 1.55, 1.75, barnZ + 2.54);
    mctx.scene.add(bdFrR);

    // Hay loft opening (high on front)
    const hayloftOpening = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.12), darkWoodMat);
    hayloftOpening.position.set(barnX, 4.8, barnZ + 2.52);
    mctx.scene.add(hayloftOpening);
    // Hay visible in loft
    const hayloftHay = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.3), hayMat);
    hayloftHay.position.set(barnX, 4.65, barnZ + 2.4);
    mctx.scene.add(hayloftHay);

    // Weathervane on top of barn
    const wvPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12), metalMat);
    wvPole.position.set(barnX, 7.1, barnZ);
    mctx.scene.add(wvPole);
    const wvArrow = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 12), metalMat);
    wvArrow.position.set(barnX, 7.6, barnZ);
    wvArrow.rotation.z = Math.PI / 2;
    mctx.scene.add(wvArrow);
    // Arrow tip
    const wvTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 10), metalMat);
    wvTip.position.set(barnX + 0.45, 7.6, barnZ);
    wvTip.rotation.z = -Math.PI / 2;
    mctx.scene.add(wvTip);
    // Arrow tail fins
    const wvTail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.15), metalMat);
    wvTail.position.set(barnX - 0.4, 7.6, barnZ);
    mctx.scene.add(wvTail);

    // ─── 3. SILO ───
    const siloX = barnX + 5, siloZ = barnZ - 1;
    const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 16), metalMat);
    siloBody.position.set(siloX, 3.0, siloZ);
    mctx.scene.add(siloBody);
    // Metal ring bands
    for (const ry of [1.0, 2.5, 4.0, 5.5]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 20), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 }));
      ring.position.set(siloX, ry, siloZ);
      ring.rotation.x = Math.PI / 2;
      mctx.scene.add(ring);
    }
    // Silo conical roof
    const siloRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 16), roofMat);
    siloRoof.position.set(siloX, 6.75, siloZ);
    mctx.scene.add(siloRoof);
    // Ladder on silo
    const ladderL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 12), timberMat);
    ladderL.position.set(siloX + 1.0, 3.0, siloZ + 0.55);
    mctx.scene.add(ladderL);
    const ladderR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 12), timberMat);
    ladderR.position.set(siloX + 1.0, 3.0, siloZ - 0.55);
    mctx.scene.add(ladderR);
    // Ladder rungs
    for (let lr = 0; lr < 10; lr++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.8), timberMat);
      rung.position.set(siloX + 1.0, 0.5 + lr * 0.6, siloZ);
      mctx.scene.add(rung);
    }

    // ─── 4. CHICKEN COOP ───
    const coopX = farmX - 4, coopZ = farmZ + 4;
    // Coop body
    const coopBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.5), woodMat);
    coopBody.position.set(coopX, 0.8, coopZ);
    mctx.scene.add(coopBody);
    // Coop roof (slight slope)
    const coopRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.8), roofMat);
    coopRoof.position.set(coopX, 1.5, coopZ);
    coopRoof.rotation.z = 0.15;
    mctx.scene.add(coopRoof);
    // Wire mesh front (grid of thin boxes)
    for (let gx = 0; gx < 6; gx++) {
      const vWire = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.0, 0.02), chickenWireMat);
      vWire.position.set(coopX - 0.8 + gx * 0.32, 0.8, coopZ + 0.76);
      mctx.scene.add(vWire);
    }
    for (let gy = 0; gy < 4; gy++) {
      const hWire = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.02), chickenWireMat);
      hWire.position.set(coopX, 0.45 + gy * 0.3, coopZ + 0.76);
      mctx.scene.add(hWire);
    }
    // Ramp leading in
    const coopRamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.8), woodMat);
    coopRamp.position.set(coopX + 0.6, 0.35, coopZ + 0.9);
    coopRamp.rotation.x = -0.4;
    mctx.scene.add(coopRamp);
    // Nest boxes on side
    for (let nb = 0; nb < 2; nb++) {
      const nestBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), woodMat);
      nestBox.position.set(coopX + 1.1, 0.6, coopZ - 0.3 + nb * 0.5);
      mctx.scene.add(nestBox);
      // Hay in nest
      const nestHay = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), hayMat);
      nestHay.position.set(coopX + 1.1, 0.75, coopZ - 0.3 + nb * 0.5);
      mctx.scene.add(nestHay);
    }

    // ─── 5. WATER WELL ───
    const wellX = farmX - 3, wellZ = farmZ - 4;
    // Stone base (short cylinder)
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.8, 16), darkStoneMat);
    wellBase.position.set(wellX, 0.4, wellZ);
    mctx.scene.add(wellBase);
    // Inner darkness (black cylinder inside)
    const wellInner = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }));
    wellInner.position.set(wellX, 0.5, wellZ);
    mctx.scene.add(wellInner);
    // Wooden frame posts
    const wellPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), woodMat);
    wellPost1.position.set(wellX - 0.7, 1.8, wellZ);
    mctx.scene.add(wellPost1);
    const wellPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), woodMat);
    wellPost2.position.set(wellX + 0.7, 1.8, wellZ);
    mctx.scene.add(wellPost2);
    // Horizontal beam
    const wellBeam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), woodMat);
    wellBeam.position.set(wellX, 2.85, wellZ);
    mctx.scene.add(wellBeam);
    // Well roof (small peaked)
    const wellRoofL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.2), roofMat);
    wellRoofL.position.set(wellX - 0.35, 3.1, wellZ);
    wellRoofL.rotation.z = 0.45;
    mctx.scene.add(wellRoofL);
    const wellRoofR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.2), roofMat);
    wellRoofR.position.set(wellX + 0.35, 3.1, wellZ);
    wellRoofR.rotation.z = -0.45;
    mctx.scene.add(wellRoofR);
    // Rope (thin cylinder from beam down)
    const wellRope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 10), ropeMat);
    wellRope.position.set(wellX, 1.9, wellZ);
    mctx.scene.add(wellRope);
    // Bucket (small cylinder)
    const wellBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8), metalMat);
    wellBucket.position.set(wellX, 1.0, wellZ);
    mctx.scene.add(wellBucket);
    // Bucket handle
    const bucketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 12, 10, Math.PI), metalMat);
    bucketHandle.position.set(wellX, 1.15, wellZ);
    mctx.scene.add(bucketHandle);

    // ─── 6. ANIMAL TROUGH ───
    const troughX = farmX + 3, troughZ = farmZ + 6;
    // U-shape: bottom + two sides
    const troughBottom = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.6), woodMat);
    troughBottom.position.set(troughX, 0.55, troughZ);
    mctx.scene.add(troughBottom);
    const troughSide1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.08), woodMat);
    troughSide1.position.set(troughX, 0.8, troughZ + 0.3);
    mctx.scene.add(troughSide1);
    const troughSide2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.08), woodMat);
    troughSide2.position.set(troughX, 0.8, troughZ - 0.3);
    mctx.scene.add(troughSide2);
    // End caps
    const troughEnd1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.6), woodMat);
    troughEnd1.position.set(troughX - 1.25, 0.8, troughZ);
    mctx.scene.add(troughEnd1);
    const troughEnd2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.6), woodMat);
    troughEnd2.position.set(troughX + 1.25, 0.8, troughZ);
    mctx.scene.add(troughEnd2);
    // Water surface inside
    const troughWater = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 0.5), waterMat);
    troughWater.position.set(troughX, 0.9, troughZ);
    mctx.scene.add(troughWater);
    // Support legs
    const troughLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), woodMat);
    troughLeg1.position.set(troughX - 0.9, 0.25, troughZ);
    mctx.scene.add(troughLeg1);
    const troughLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), woodMat);
    troughLeg2.position.set(troughX + 0.9, 0.25, troughZ);
    mctx.scene.add(troughLeg2);

    // ─── 7. TOOL SHED (lean-to against barn) ───
    const shedX = barnX - 3.8, shedZ = barnZ - 2.8;
    const shedBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), woodMat);
    shedBody.position.set(shedX, 1.0, shedZ);
    mctx.scene.add(shedBody);
    // Sloped single-pitch roof
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), roofMat);
    shedRoof.position.set(shedX, 2.15, shedZ);
    shedRoof.rotation.z = -0.2;
    mctx.scene.add(shedRoof);
    // Shed door
    const shedDoor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.06), darkWoodMat);
    shedDoor.position.set(shedX, 0.75, shedZ + 1.01);
    mctx.scene.add(shedDoor);
    // Garden tools leaning against wall (thin cylinders at angles)
    const toolCyl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 12), woodMat);
    toolCyl1.position.set(shedX + 1.05, 1.0, shedZ + 0.3);
    toolCyl1.rotation.z = -0.2;
    mctx.scene.add(toolCyl1);
    const toolCyl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 12), woodMat);
    toolCyl2.position.set(shedX + 1.05, 0.9, shedZ - 0.2);
    toolCyl2.rotation.z = -0.25;
    mctx.scene.add(toolCyl2);
    const toolCyl3 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 12), woodMat);
    toolCyl3.position.set(shedX + 1.05, 0.95, shedZ - 0.6);
    toolCyl3.rotation.z = -0.18;
    mctx.scene.add(toolCyl3);
    // Rake head on tool 1
    const rakeHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), metalMat);
    rakeHead.position.set(shedX + 1.35, 1.95, shedZ + 0.3);
    mctx.scene.add(rakeHead);
    // Shovel head on tool 2
    const shovelHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.02), metalMat);
    shovelHead.position.set(shedX + 1.35, 1.78, shedZ - 0.2);
    mctx.scene.add(shovelHead);

    // ─── 8. WOODPILE ───
    const wpX = farmX - 5, wpZ = farmZ - 1;
    // Bottom row of logs (5 logs)
    for (let wl = 0; wl < 5; wl++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(wpX, 0.15, wpZ + wl * 0.32 - 0.64);
      mctx.scene.add(log);
    }
    // Middle row (4 logs)
    for (let wl = 0; wl < 4; wl++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(wpX, 0.45, wpZ + wl * 0.32 - 0.48);
      mctx.scene.add(log);
    }
    // Top row (3 logs)
    for (let wl = 0; wl < 3; wl++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(wpX, 0.75, wpZ + wl * 0.32 - 0.32);
      mctx.scene.add(log);
    }
    // Chopping stump
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 12), woodMat);
    stump.position.set(wpX + 1.5, 0.25, wpZ);
    mctx.scene.add(stump);
    // Axe in stump (handle + head)
    const axeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), woodMat);
    axeHandle.position.set(wpX + 1.5, 0.75, wpZ);
    axeHandle.rotation.z = 0.3;
    mctx.scene.add(axeHandle);
    const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.04), metalMat);
    axeHead.position.set(wpX + 1.62, 1.08, wpZ);
    axeHead.rotation.z = 0.3;
    mctx.scene.add(axeHead);

    // ─── Circular fence with gate opening ───
    const fenceR = 14;
    const fenceSegments = 28;
    const gateIndex1 = 7; // Skip this segment for gate opening
    for (let i = 0; i < fenceSegments; i++) {
      if (i === gateIndex1) continue; // Gate opening
      const angle = (i / fenceSegments) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), fenceMat);
      post.position.set(
        farmX + Math.cos(angle) * fenceR,
        0.6,
        farmZ + Math.sin(angle) * fenceR,
      );
      mctx.scene.add(post);
      // Horizontal rails (top and bottom)
      const nextI = (i + 1) % fenceSegments;
      if (nextI !== gateIndex1) {
        const nextAngle = (nextI / fenceSegments) * Math.PI * 2;
        const midX = farmX + Math.cos((angle + nextAngle) / 2) * fenceR;
        const midZ = farmZ + Math.sin((angle + nextAngle) / 2) * fenceR;
        const railLen = 2 * fenceR * Math.sin(Math.PI / fenceSegments);
        const fRail1 = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.08, 0.08), fenceMat);
        fRail1.position.set(midX, 0.9, midZ);
        fRail1.rotation.y = -(angle + nextAngle) / 2 + Math.PI / 2;
        mctx.scene.add(fRail1);
        const fRail2 = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.08, 0.08), fenceMat);
        fRail2.position.set(midX, 0.4, midZ);
        fRail2.rotation.y = -(angle + nextAngle) / 2 + Math.PI / 2;
        mctx.scene.add(fRail2);
      }
    }
    // Gate posts (taller, thicker)
    const gateAngleA = (gateIndex1 / fenceSegments) * Math.PI * 2;
    const gateAngleB = ((gateIndex1 + 1) / fenceSegments) * Math.PI * 2;
    const gatePostA = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.2), timberMat);
    gatePostA.position.set(farmX + Math.cos(gateAngleA) * fenceR, 0.8, farmZ + Math.sin(gateAngleA) * fenceR);
    mctx.scene.add(gatePostA);
    const gatePostB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.2), timberMat);
    gatePostB.position.set(farmX + Math.cos(gateAngleB) * fenceR, 0.8, farmZ + Math.sin(gateAngleB) * fenceR);
    mctx.scene.add(gatePostB);

    // ── Rock outcrops (realistic with varied geometry, moss, lichen, cracks) ──
    const rockDarkMat = new THREE.MeshStandardMaterial({ color: 0x8a8878, roughness: 0.88, metalness: 0.02 });
    const rockMidMat = new THREE.MeshStandardMaterial({ color: 0xa09a8a, roughness: 0.82, metalness: 0.03 });
    const rockLightMat = new THREE.MeshStandardMaterial({ color: 0xbbB5a5, roughness: 0.75, metalness: 0.05 });
    const rockWarmMat = new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: 0.85, metalness: 0.02 });
    const rockCoolMat = new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.8, metalness: 0.04 });
    const rockMossMat = new THREE.MeshStandardMaterial({ color: 0x3d8a28, roughness: 0.7 });
    const rockMossDarkMat = new THREE.MeshStandardMaterial({ color: 0x2d6a1c, roughness: 0.75 });
    const lichenMat = new THREE.MeshStandardMaterial({ color: 0x99bb55, roughness: 0.65, emissive: 0x222200, emissiveIntensity: 0.1 });
    const lichenYellowMat = new THREE.MeshStandardMaterial({ color: 0xbbaa44, roughness: 0.6, emissive: 0x332200, emissiveIntensity: 0.1 });
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x908878, roughness: 0.85 });
    const pebbleLightMat = new THREE.MeshStandardMaterial({ color: 0xaaa898, roughness: 0.8 });
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x4a4840, roughness: 0.95 });

    for (let i = 0; i < 18; i++) {
      const rockGroup = new THREE.Group();
      const cnt = 2 + Math.floor(Math.random() * 4);
      const rockMats = [rockDarkMat, rockMidMat, rockLightMat, rockWarmMat, rockCoolMat];

      for (let r = 0; r < cnt; r++) {
        const rh = 0.4 + Math.random() * 1.8;
        // Lower subdivision for angular, rough rock shapes (not smooth spheres)
        const subdivLevel = rh > 1.2 ? 2 : 1;
        const rockGeo = new THREE.DodecahedronGeometry(rh, subdivLevel);
        // Displace vertices for rough, weathered surface
        const posAttr = rockGeo.getAttribute('position');
        for (let vi = 0; vi < posAttr.count; vi++) {
          const nx = posAttr.getX(vi), ny = posAttr.getY(vi), nz = posAttr.getZ(vi);
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          // Vary displacement: more on top (weathering), less on bottom (ground contact)
          const heightFactor = 0.5 + (ny / len) * 0.5; // 0..1 from bottom to top
          const disp = (Math.random() - 0.4) * rh * 0.15 * (0.6 + heightFactor * 0.4);
          posAttr.setXYZ(vi, nx + (nx / len) * disp, ny + (ny / len) * disp, nz + (nz / len) * disp);
        }
        rockGeo.computeVertexNormals();
        const rock = new THREE.Mesh(
          rockGeo,
          rockMats[Math.floor(Math.random() * rockMats.length)],
        );
        // Varied squashing for more natural shapes — wider than tall
        const yScale = 0.3 + Math.random() * 0.45;
        const xScale = 0.7 + Math.random() * 0.8;
        const zScale = 0.7 + Math.random() * 0.8;
        rock.scale.set(xScale, yScale, zScale);
        rock.position.set((Math.random() - 0.5) * 2.5, rh * yScale * 0.3, (Math.random() - 0.5) * 2.5);
        rock.rotation.set(Math.random() * 0.25, Math.random() * Math.PI, Math.random() * 0.25);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rockGroup.add(rock);

        // Moss patches — multiple on top and sides, more visible
        const mossCount = rh > 1.0 ? 2 + Math.floor(Math.random() * 3) : (Math.random() > 0.3 ? 1 : 0);
        for (let mi = 0; mi < mossCount; mi++) {
          const mossR = rh * 0.3 + Math.random() * rh * 0.3;
          const mossGeo = new THREE.SphereGeometry(mossR, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
          // Displace moss vertices slightly for organic lumpy look
          const mPosAttr = mossGeo.getAttribute('position');
          for (let mvi = 0; mvi < mPosAttr.count; mvi++) {
            const mx = mPosAttr.getX(mvi), my = mPosAttr.getY(mvi), mz = mPosAttr.getZ(mvi);
            const mDisp = (Math.random() - 0.3) * mossR * 0.2;
            const mLen = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
            mPosAttr.setXYZ(mvi, mx + (mx / mLen) * mDisp, my + (my / mLen) * mDisp, mz + (mz / mLen) * mDisp);
          }
          mossGeo.computeVertexNormals();
          const moss = new THREE.Mesh(mossGeo, Math.random() > 0.4 ? rockMossMat : rockMossDarkMat);
          // Place on top or draping down the side
          const mAngle = Math.random() * Math.PI * 2;
          const mSideDist = mi === 0 ? 0 : rh * xScale * 0.25 * Math.random();
          moss.position.set(
            rock.position.x + Math.cos(mAngle) * mSideDist,
            rock.position.y + rh * yScale * 0.25 + Math.random() * rh * yScale * 0.15,
            rock.position.z + Math.sin(mAngle) * mSideDist
          );
          moss.rotation.y = Math.random() * Math.PI;
          // Tilt side moss to drape down
          if (mi > 0) {
            moss.rotation.x = (Math.random() - 0.5) * 0.6;
            moss.rotation.z = (Math.random() - 0.5) * 0.6;
          }
          rockGroup.add(moss);
        }

        // Lichen spots (small flat discs on rock faces)
        if (rh > 0.5 && Math.random() > 0.25) {
          const lichenCount = 2 + Math.floor(Math.random() * 4);
          for (let lc = 0; lc < lichenCount; lc++) {
            const lichen = new THREE.Mesh(
              new THREE.CircleGeometry(0.06 + Math.random() * 0.15, 8),
              Math.random() > 0.5 ? lichenMat : lichenYellowMat,
            );
            const lAngle = Math.random() * Math.PI * 2;
            lichen.position.set(
              rock.position.x + Math.cos(lAngle) * rh * xScale * 0.4,
              rock.position.y + rh * yScale * 0.1 + Math.random() * rh * yScale * 0.3,
              rock.position.z + Math.sin(lAngle) * rh * zScale * 0.4,
            );
            lichen.rotation.set(Math.random() * 0.5, lAngle, 0);
            lichen.lookAt(rock.position.x, rock.position.y + 2, rock.position.z);
            rockGroup.add(lichen);
          }
        }

        // Crack lines on larger rocks
        if (rh > 1.0) {
          const crackCount = 1 + Math.floor(Math.random() * 2);
          for (let c = 0; c < crackCount; c++) {
            const crackLen = rh * 0.5 + Math.random() * rh * 0.4;
            const crack = new THREE.Mesh(
              new THREE.BoxGeometry(0.015, crackLen, 0.005),
              crackMat,
            );
            const cAngle = Math.random() * Math.PI * 2;
            crack.position.set(
              rock.position.x + Math.cos(cAngle) * rh * xScale * 0.35,
              rock.position.y,
              rock.position.z + Math.sin(cAngle) * rh * zScale * 0.35,
            );
            crack.rotation.set(Math.random() * 0.4, cAngle, Math.random() * 0.3);
            rockGroup.add(crack);
          }
        }

        // Sedimentary layer lines on larger rocks
        if (rh > 1.0) {
          const layerCount = 2 + Math.floor(Math.random() * 2);
          for (let l = 0; l < layerCount; l++) {
            const layerY = rock.position.y + (l + 0.3) * rh * yScale * 0.25;
            const layer = new THREE.Mesh(
              new THREE.TorusGeometry(rh * 0.65 + l * 0.02, 0.015, 10, 20),
              rockDarkMat,
            );
            layer.position.set(rock.position.x, layerY, rock.position.z);
            layer.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.15;
            layer.rotation.z = (Math.random() - 0.5) * 0.1;
            rockGroup.add(layer);
          }
        }
      }

      // Scattered pebbles around base (6-12, varied sizes and colors)
      const pebbleCount = 6 + Math.floor(Math.random() * 7);
      for (let p = 0; p < pebbleCount; p++) {
        const pSize = 0.04 + Math.random() * 0.12;
        const pebble = new THREE.Mesh(
          new THREE.DodecahedronGeometry(pSize, pSize > 0.08 ? 2 : 1),
          Math.random() > 0.5 ? pebbleMat : pebbleLightMat,
        );
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = 1 + Math.random() * 2.5;
        pebble.position.set(Math.cos(pAngle) * pDist, pSize * 0.3, Math.sin(pAngle) * pDist);
        pebble.scale.y = 0.35 + Math.random() * 0.3;
        pebble.rotation.y = Math.random() * Math.PI;
        rockGroup.add(pebble);
      }

      // Small plants growing from cracks at base
      if (Math.random() > 0.4) {
        const plantCount = 1 + Math.floor(Math.random() * 3);
        for (let pl = 0; pl < plantCount; pl++) {
          const plAngle = Math.random() * Math.PI * 2;
          const plDist = 0.5 + Math.random() * 1.0;
          const plantGroup = new THREE.Group();
          const blades = 3 + Math.floor(Math.random() * 3);
          for (let b = 0; b < blades; b++) {
            const bladeH = 0.15 + Math.random() * 0.2;
            const blade = new THREE.Mesh(
              new THREE.PlaneGeometry(0.04, bladeH),
              grassTuftMat,
            );
            blade.position.set((Math.random() - 0.5) * 0.08, bladeH * 0.5, (Math.random() - 0.5) * 0.08);
            blade.rotation.y = Math.random() * Math.PI;
            blade.rotation.x = (Math.random() - 0.5) * 0.5;
            plantGroup.add(blade);
          }
          plantGroup.position.set(Math.cos(plAngle) * plDist, 0, Math.sin(plAngle) * plDist);
          rockGroup.add(plantGroup);
        }
      }

      // Ground shadow disc
      const shadowR = cnt * 0.9 + 0.6;
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(shadowR, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      rockGroup.add(shadow);

      const roX = (Math.random() - 0.5) * w * 0.88;
      const roZ = (Math.random() - 0.5) * d * 0.88;
      rockGroup.position.set(roX, getTerrainHeight(roX, roZ, 1.4) - 0.12, roZ);
      mctx.scene.add(rockGroup);
    }

    // ── Dirt paths (curved, textured) ──
    const dirtDarkMat = new THREE.MeshStandardMaterial({ color: 0x6a5535, roughness: 0.95 });
    const dirtEdgeMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.92 });
    const mudMat = new THREE.MeshStandardMaterial({ color: 0x7a6545, roughness: 0.88 });
    const pathGrassMat = new THREE.MeshStandardMaterial({ color: 0x558833, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const pathGroup = new THREE.Group();
      const pathLen = 20 + Math.random() * 18;
      const segments = Math.floor(pathLen / 2);
      const startX = (Math.random() - 0.5) * w * 0.5;
      const startZ = (Math.random() - 0.5) * d * 0.5;
      const baseAngle = Math.random() * Math.PI;
      let curX = startX, curZ = startZ;
      let curAngle = baseAngle;

      for (let s = 0; s < segments; s++) {
        // Curve the path slightly each segment
        curAngle += (Math.random() - 0.5) * 0.35;
        const segLen = 1.8 + Math.random() * 0.8;
        const nextX = curX + Math.cos(curAngle) * segLen;
        const nextZ = curZ + Math.sin(curAngle) * segLen;
        const segWidth = 1.6 + Math.sin(s * 0.7) * 0.4; // width varies
        const midX = (curX + nextX) / 2;
        const midZ = (curZ + nextZ) / 2;
        const ty = getTerrainHeight(midX, midZ, 1.4);

        // Main dirt segment
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(segWidth, segLen + 0.3), dirtMat);
        seg.rotation.x = -Math.PI / 2;
        seg.rotation.z = -curAngle + Math.PI / 2;
        seg.position.set(midX, ty + 0.015, midZ);
        pathGroup.add(seg);

        // Darker center worn line (wheel ruts)
        if (Math.random() > 0.3) {
          for (const rutSide of [-0.25, 0.25]) {
            const rut = new THREE.Mesh(new THREE.PlaneGeometry(0.12, segLen), dirtDarkMat);
            rut.rotation.x = -Math.PI / 2;
            rut.rotation.z = -curAngle + Math.PI / 2;
            const rutOffX = Math.sin(curAngle) * rutSide;
            const rutOffZ = -Math.cos(curAngle) * rutSide;
            rut.position.set(midX + rutOffX, ty + 0.018, midZ + rutOffZ);
            pathGroup.add(rut);
          }
        }

        // Edge weathering (slightly darker/raised edges)
        for (const edgeSide of [-1, 1]) {
          const edgeOff = (segWidth / 2 + 0.05) * edgeSide;
          const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.3, segLen), dirtEdgeMat);
          edge.rotation.x = -Math.PI / 2;
          edge.rotation.z = -curAngle + Math.PI / 2;
          const eOffX = Math.sin(curAngle) * edgeOff;
          const eOffZ = -Math.cos(curAngle) * edgeOff;
          edge.position.set(midX + eOffX, ty + 0.012, midZ + eOffZ);
          pathGroup.add(edge);
        }

        // Scattered pebbles on path (2-3 per segment)
        for (let p = 0; p < 2 + Math.floor(Math.random() * 2); p++) {
          const pebOff = (Math.random() - 0.5) * segWidth * 0.8;
          const pebAlong = (Math.random() - 0.5) * segLen;
          const px = midX + Math.sin(curAngle) * pebOff + Math.cos(curAngle) * pebAlong;
          const pz = midZ - Math.cos(curAngle) * pebOff + Math.sin(curAngle) * pebAlong;
          const peb = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.04, 1),
            stoneMat,
          );
          peb.position.set(px, ty + 0.03, pz);
          peb.scale.y = 0.4;
          pathGroup.add(peb);
        }

        // Occasional mud puddle
        if (Math.random() > 0.75) {
          const puddle = new THREE.Mesh(
            new THREE.CircleGeometry(0.3 + Math.random() * 0.2, 10),
            mudMat,
          );
          puddle.rotation.x = -Math.PI / 2;
          puddle.position.set(midX + (Math.random() - 0.5) * 0.5, ty + 0.02, midZ + (Math.random() - 0.5) * 0.5);
          pathGroup.add(puddle);
        }

        // Grass tufts along edges (every other segment)
        if (s % 2 === 0) {
          for (const grassSide of [-1, 1]) {
            const gOff = (segWidth / 2 + 0.3 + Math.random() * 0.3) * grassSide;
            const gx = midX + Math.sin(curAngle) * gOff;
            const gz = midZ - Math.cos(curAngle) * gOff;
            const tuft = new THREE.Mesh(
              new THREE.ConeGeometry(0.08, 0.2 + Math.random() * 0.1, 6),
              pathGrassMat,
            );
            tuft.position.set(gx, ty + 0.1, gz);
            pathGroup.add(tuft);
          }
        }

        curX = nextX;
        curZ = nextZ;
      }
      mctx.scene.add(pathGroup);
    }

    // ── Windmill ──
    const wmX = -hw * 0.35, wmZ = hd * 0.3;
    const wmY = getTerrainHeight(wmX, wmZ, 1.4);
    const wmWallMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 });
    const wmMortarMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.95 });
    const wmBrickDarkMat = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.8 });
    const wmRoofMat = new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.8 });
    const wmDoorMat = new THREE.MeshStandardMaterial({ color: 0x4a3218, roughness: 0.85 });
    const wmWindowMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.5 });

    // Main body
    const wmBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 6, 10), wmWallMat);
    wmBase.position.set(wmX, wmY + 3, wmZ);
    mctx.scene.add(wmBase);

    // Horizontal brick mortar lines on body
    for (let row = 0; row < 10; row++) {
      const mortarY = wmY + 0.5 + row * 0.55;
      const rowRadius = 2 - (row / 10) * 0.5; // tapers with the cylinder
      const mortar = new THREE.Mesh(new THREE.TorusGeometry(rowRadius, 0.015, 12, 24), wmMortarMat);
      mortar.position.set(wmX, mortarY, wmZ);
      mortar.rotation.x = Math.PI / 2;
      mctx.scene.add(mortar);
    }

    // Vertical brick joints (offset per row)
    for (let row = 0; row < 9; row++) {
      const jY = wmY + 0.75 + row * 0.55;
      const jRadius = 2 - ((row + 0.5) / 10) * 0.5;
      const jointCount = 12 + row % 2 * 2; // alternate count for offset
      for (let j = 0; j < jointCount; j++) {
        const jAngle = (j / jointCount) * Math.PI * 2 + (row % 2) * (Math.PI / jointCount);
        const jx = wmX + Math.cos(jAngle) * (jRadius + 0.01);
        const jz = wmZ + Math.sin(jAngle) * (jRadius + 0.01);
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), wmMortarMat);
        joint.position.set(jx, jY, jz);
        joint.rotation.y = -jAngle;
        mctx.scene.add(joint);
      }
    }

    // Foundation base (wider stone ring)
    const wmFoundation = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.3, 10), stoneMat);
    wmFoundation.position.set(wmX, wmY + 0.15, wmZ);
    mctx.scene.add(wmFoundation);

    // Door
    const wmDoor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.1), wmDoorMat);
    wmDoor.position.set(wmX, wmY + 0.8, wmZ + 1.95);
    mctx.scene.add(wmDoor);
    // Door frame
    const wmDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.05), wmBrickDarkMat);
    wmDoorFrame.position.set(wmX, wmY + 0.85, wmZ + 1.97);
    mctx.scene.add(wmDoorFrame);
    // Door handle
    const wmHandle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0x887744, metalness: 0.5 }));
    wmHandle.position.set(wmX + 0.25, wmY + 0.8, wmZ + 2.01);
    mctx.scene.add(wmHandle);

    // Windows (2 on opposite sides)
    for (const wSide of [0, Math.PI]) {
      const wxOff = Math.sin(wSide) * 1.55;
      const wzOff = Math.cos(wSide) * 1.55;
      // Window opening
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), wmWindowMat);
      win.position.set(wmX + wxOff, wmY + 3.5, wmZ + wzOff);
      win.rotation.y = wSide;
      mctx.scene.add(win);
      // Window frame
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.06), wmBrickDarkMat);
      winFrame.position.set(wmX + wxOff, wmY + 3.5, wmZ + wzOff);
      winFrame.rotation.y = wSide;
      mctx.scene.add(winFrame);
      // Window cross bar
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), wmDoorMat);
      crossV.position.set(wmX + wxOff, wmY + 3.5, wmZ + wzOff + (wSide === 0 ? 0.04 : -0.04));
      mctx.scene.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.03), wmDoorMat);
      crossH.position.set(wmX + wxOff, wmY + 3.5, wmZ + wzOff + (wSide === 0 ? 0.04 : -0.04));
      mctx.scene.add(crossH);
    }

    // Roof — thatched cone with overhang ring and shingle rows
    const wmRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 20), wmRoofMat);
    wmRoof.position.set(wmX, wmY + 7.1, wmZ);
    mctx.scene.add(wmRoof);
    // Roof overhang ring (eave)
    const wmEave = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.08, 8, 24), wmDoorMat);
    wmEave.position.set(wmX, wmY + 6.05, wmZ);
    wmEave.rotation.x = Math.PI / 2;
    mctx.scene.add(wmEave);
    // Roof peak cap
    const wmPeakCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.5 }));
    wmPeakCap.position.set(wmX, wmY + 8.2, wmZ);
    mctx.scene.add(wmPeakCap);
    // Shingle rows (horizontal rings on the cone for texture)
    for (let sr = 0; sr < 5; sr++) {
      const srFrac = (sr + 1) / 6;
      const srRadius = 2.2 * (1 - srFrac) * 0.95;
      const srY = wmY + 6.05 + srFrac * 2.1;
      const shingleRing = new THREE.Mesh(new THREE.TorusGeometry(srRadius, 0.025, 6, 20),
        new THREE.MeshStandardMaterial({ color: 0x775530, roughness: 0.9 }));
      shingleRing.position.set(wmX, srY, wmZ);
      shingleRing.rotation.x = Math.PI / 2;
      mctx.scene.add(shingleRing);
    }

    // Windmill sails — proper sail frames with fabric panels
    const wmSailMat = new THREE.MeshStandardMaterial({ color: 0xeee8d8, roughness: 0.8, side: THREE.DoubleSide });
    const wmFrameMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.85 });
    const wmHubMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.5 });
    // Hub (axle front face)
    const wmBladeHub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 10), wmHubMat);
    wmBladeHub.rotation.x = Math.PI / 2;
    wmBladeHub.position.set(wmX, wmY + 6, wmZ - 1.7);
    mctx.scene.add(wmBladeHub);
    // Hub cap
    const wmHubCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), wmHubMat);
    wmHubCap.position.set(wmX, wmY + 6, wmZ - 1.9);
    mctx.scene.add(wmHubCap);

    for (let b = 0; b < 4; b++) {
      const bladeAngle = b * Math.PI / 2;
      const cos = Math.cos(bladeAngle), sin = Math.sin(bladeAngle);
      // Main spar (the long arm)
      const sparLen = 4.5;
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.1, sparLen, 0.06), wmFrameMat);
      spar.position.set(wmX + cos * (sparLen / 2), wmY + 6 + sin * (sparLen / 2), wmZ - 1.75);
      spar.rotation.z = bladeAngle;
      mctx.scene.add(spar);
      // Cross-bars (rungs) along the spar
      for (let cb = 0; cb < 6; cb++) {
        const cbDist = 0.6 + cb * 0.65;
        const rung = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.04), wmFrameMat);
        rung.position.set(
          wmX + cos * cbDist,
          wmY + 6 + sin * cbDist,
          wmZ - 1.75,
        );
        rung.rotation.z = bladeAngle + Math.PI / 2;
        mctx.scene.add(rung);
      }
      // Outer tip bar (shorter)
      const tipBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), wmFrameMat);
      tipBar.position.set(
        wmX + cos * (sparLen - 0.15),
        wmY + 6 + sin * (sparLen - 0.15),
        wmZ - 1.75,
      );
      tipBar.rotation.z = bladeAngle + Math.PI / 2;
      mctx.scene.add(tipBar);
      // Sail canvas (angled plane on one side of the spar)
      const sailW = 0.8, sailH = 3.6;
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(sailW, sailH), wmSailMat);
      // Offset the sail to one side of the spar, centered along the arm
      sail.position.set(
        wmX + cos * (sparLen / 2 + 0.2) - sin * (sailW / 2 * 0.5),
        wmY + 6 + sin * (sparLen / 2 + 0.2) + cos * (sailW / 2 * 0.5),
        wmZ - 1.76,
      );
      sail.rotation.z = bladeAngle;
      mctx.scene.add(sail);
    }

    // ── Campfire in open field ──
    const cfX = hw * 0.1, cfZ = hd * 0.2;
    const cfY = getTerrainHeight(cfX, cfZ, 1.4);
    const fireRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.2, 23, 30), stoneMat);
    fireRing.rotation.x = Math.PI / 2;
    fireRing.position.set(cfX, cfY + 0.2, cfZ);
    mctx.scene.add(fireRing);
    const fieldFire = new THREE.PointLight(0xff8833, 1.2, 10);
    fieldFire.position.set(cfX, cfY + 1.5, cfZ);
    mctx.scene.add(fieldFire);
    // Log seats
    for (let i = 0; i < 3; i++) {
      const logAngle = (i / 3) * Math.PI * 2 + 0.3;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 10), woodMat);
      log.rotation.z = Math.PI / 2;
      const logX = cfX + Math.cos(logAngle) * 2.5;
      const logZ = cfZ + Math.sin(logAngle) * 2.5;
      log.position.set(logX, getTerrainHeight(logX, logZ, 1.4) + 0.2, logZ);
      log.rotation.y = logAngle;
      mctx.scene.add(log);
    }

    // ── Tall grass tufts ──
    const tGrassMat = new THREE.MeshStandardMaterial({ color: 0x77cc44, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 60; i++) {
      const tuft = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8 + Math.random() * 0.5), tGrassMat);
      tuft.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.3,
        (Math.random() - 0.5) * d * 0.85,
      );
      tuft.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(tuft);
    }

    // ── Dense tall swaying grass clusters ──
    const tallGrassMats = [
      new THREE.MeshStandardMaterial({ color: 0x55aa33, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x66bb44, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x77cc55, roughness: 0.6, side: THREE.DoubleSide }),
    ];
    for (let i = 0; i < 100; i++) {
      const grassCluster = new THREE.Group();
      const bladeCount = 4 + Math.floor(Math.random() * 5);
      for (let b = 0; b < bladeCount; b++) {
        const bladeH = 0.6 + Math.random() * 0.8;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.06, bladeH),
          tallGrassMats[Math.floor(Math.random() * 3)],
        );
        blade.position.set((Math.random() - 0.5) * 0.2, bladeH / 2, (Math.random() - 0.5) * 0.2);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.25;
        grassCluster.add(blade);
      }
      const gcX = (Math.random() - 0.5) * w * 0.9;
      const gcZ = (Math.random() - 0.5) * d * 0.9;
      grassCluster.position.set(gcX, getTerrainHeight(gcX, gcZ, 1.4), gcZ);
      mctx.scene.add(grassCluster);
    }

    // ── Detailed wildflower patches with daisies and poppies ──
    const daisyPetalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const daisyCenterMat = new THREE.MeshStandardMaterial({ color: 0xffdd22, roughness: 0.5 });
    const poppyMat = new THREE.MeshStandardMaterial({ color: 0xee3322, roughness: 0.3 });
    const bluebellMat = new THREE.MeshStandardMaterial({ color: 0x5566dd, roughness: 0.4 });
    const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x9966cc, roughness: 0.4 });
    const gardenStemMat = new THREE.MeshStandardMaterial({ color: 0x337722 });
    // Daisy clusters
    for (let i = 0; i < 35; i++) {
      const daisy = new THREE.Group();
      const stemH = 0.25 + Math.random() * 0.15;
      const dStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, stemH, 16), gardenStemMat);
      dStem.position.y = stemH / 2;
      daisy.add(dStem);
      // Center
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), daisyCenterMat);
      center.position.y = stemH + 0.02;
      daisy.add(center);
      // Petals
      for (let p = 0; p < 6; p++) {
        const pAngle = (p / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), daisyPetalMat);
        petal.position.set(Math.cos(pAngle) * 0.05, stemH + 0.02, Math.sin(pAngle) * 0.05);
        petal.rotation.x = -Math.PI / 2;
        petal.rotation.z = pAngle;
        daisy.add(petal);
      }
      const dX = (Math.random() - 0.5) * w * 0.85;
      const dZ = (Math.random() - 0.5) * d * 0.85;
      daisy.position.set(dX, getTerrainHeight(dX, dZ, 1.4), dZ);
      mctx.scene.add(daisy);
    }
    // Poppy clusters
    for (let i = 0; i < 30; i++) {
      const poppy = new THREE.Group();
      const stemH = 0.3 + Math.random() * 0.2;
      const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, stemH, 16), gardenStemMat);
      pStem.position.y = stemH / 2;
      poppy.add(pStem);
      const poppyHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), poppyMat);
      poppyHead.position.y = stemH;
      poppy.add(poppyHead);
      // Dark center
      const pCenter = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      pCenter.position.y = stemH + 0.04;
      poppy.add(pCenter);
      const ppX = (Math.random() - 0.5) * w * 0.85;
      const ppZ = (Math.random() - 0.5) * d * 0.85;
      poppy.position.set(ppX, getTerrainHeight(ppX, ppZ, 1.4), ppZ);
      mctx.scene.add(poppy);
    }
    // Bluebell & lavender scattered
    for (let i = 0; i < 25; i++) {
      const bell = new THREE.Group();
      const bStemH = 0.2 + Math.random() * 0.15;
      const bStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, bStemH, 16), gardenStemMat);
      bStem.position.y = bStemH / 2;
      bell.add(bStem);
      const bellMat = i % 2 === 0 ? bluebellMat : lavenderMat;
      const bellHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), bellMat);
      bellHead.scale.y = 1.3;
      bellHead.position.y = bStemH;
      bell.add(bellHead);
      const bbX = (Math.random() - 0.5) * w * 0.85;
      const bbZ = (Math.random() - 0.5) * d * 0.85;
      bell.position.set(bbX, getTerrainHeight(bbX, bbZ, 1.4), bbZ);
      mctx.scene.add(bell);
    }

    // ── Scattered boulders with moss ──
    const mossBoulderMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.85 });
    const mossPatchMat = new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.9 });
    for (let i = 0; i < 18; i++) {
      const mossRock = new THREE.Group();
      const rockR = 0.5 + Math.random() * 1.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockR, 2), mossBoulderMat);
      rock.scale.set(0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
      mossRock.add(rock);
      // Moss on top and sides
      const moss1 = new THREE.Mesh(new THREE.SphereGeometry(rockR * 0.6, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2), mossPatchMat);
      moss1.position.y = rockR * 0.35;
      mossRock.add(moss1);
      // Side moss patches
      for (let m = 0; m < 2; m++) {
        const sideMoss = new THREE.Mesh(new THREE.PlaneGeometry(rockR * 0.5, rockR * 0.4), mossPatchMat);
        sideMoss.position.set(Math.cos(m * Math.PI) * rockR * 0.4, rockR * 0.1, Math.sin(m * Math.PI) * rockR * 0.4);
        sideMoss.rotation.y = m * Math.PI;
        mossRock.add(sideMoss);
      }
      const mrX = (Math.random() - 0.5) * w * 0.85;
      const mrZ = (Math.random() - 0.5) * d * 0.85;
      mossRock.position.set(mrX, getTerrainHeight(mrX, mrZ, 1.4), mrZ);
      mctx.scene.add(mossRock);
    }

    // ── Butterflies (small colored planes hovering) ──
    const butterflyColors = [0xff8844, 0xffdd22, 0x88aaff, 0xff66aa, 0x66ddff, 0xffaa88];
    for (let i = 0; i < 20; i++) {
      const butterfly = new THREE.Group();
      const bColor = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
      const bMat = new THREE.MeshStandardMaterial({ color: bColor, emissive: bColor, emissiveIntensity: 0.2, side: THREE.DoubleSide });
      // Left wing
      const lWing = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), bMat);
      lWing.position.set(-0.04, 0, 0);
      lWing.rotation.z = 0.4;
      butterfly.add(lWing);
      // Right wing
      const rWing = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), bMat);
      rWing.position.set(0.04, 0, 0);
      rWing.rotation.z = -0.4;
      butterfly.add(rWing);
      // Body
      const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      bBody.rotation.z = Math.PI / 2;
      butterfly.add(bBody);
      const bfX = (Math.random() - 0.5) * w * 0.8;
      const bfZ = (Math.random() - 0.5) * d * 0.8;
      butterfly.position.set(bfX, 0.8 + Math.random() * 2, bfZ);
      butterfly.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(butterfly);
    }

    // Small winding streams removed — main creek/stream provides water features

    // ── Wooden fences (field dividers) ──
    for (let i = 0; i < 6; i++) {
      const fenceRun = new THREE.Group();
      const fenceLen = 8 + Math.floor(Math.random() * 8);
      for (let p = 0; p < fenceLen; p++) {
        // Post
        const fPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), fenceMat);
        fPost.position.set(p * 1.2, 0.5, 0);
        fenceRun.add(fPost);
        // Rails
        if (p < fenceLen - 1) {
          const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), fenceMat);
          topRail.position.set(p * 1.2 + 0.6, 0.85, 0);
          fenceRun.add(topRail);
          const botRail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), fenceMat);
          botRail.position.set(p * 1.2 + 0.6, 0.4, 0);
          fenceRun.add(botRail);
        }
      }
      const frX = (Math.random() - 0.5) * w * 0.7;
      const frZ = (Math.random() - 0.5) * d * 0.7;
      fenceRun.position.set(frX, getTerrainHeight(frX, frZ, 1.4), frZ);
      fenceRun.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fenceRun);
    }

    // ── Additional hay bales (stacked) ──
    for (let i = 0; i < 5; i++) {
      const stack = new THREE.Group();
      // Bottom row
      for (let r = 0; r < 2; r++) {
        const hay1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 12), hayMat);
        hay1.rotation.x = Math.PI / 2;
        hay1.position.set(r * 1.1, 0.5, 0);
        stack.add(hay1);
      }
      // Top hay
      const hayTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 12), hayMat);
      hayTop.rotation.x = Math.PI / 2;
      hayTop.position.set(0.55, 1.4, 0);
      stack.add(hayTop);
      const stX = (Math.random() - 0.5) * w * 0.6;
      const stZ = (Math.random() - 0.5) * d * 0.6;
      stack.position.set(stX, getTerrainHeight(stX, stZ, 1.4), stZ);
      stack.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(stack);
    }

    // ── Second windmill ──
    const wm2X = hw * 0.4, wm2Z = -hd * 0.45;
    const wm2Y = getTerrainHeight(wm2X, wm2Z, 1.4);
    const wm2Base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 5, 12), new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 }));
    wm2Base.position.set(wm2X, wm2Y + 2.5, wm2Z);
    mctx.scene.add(wm2Base);
    // Roof with eave and shingle rings
    const wm2Roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.8, 16), new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.8 }));
    wm2Roof.position.set(wm2X, wm2Y + 5.9, wm2Z);
    mctx.scene.add(wm2Roof);
    const wm2Eave = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.06, 8, 20), new THREE.MeshStandardMaterial({ color: 0x4a3218, roughness: 0.85 }));
    wm2Eave.position.set(wm2X, wm2Y + 5.05, wm2Z);
    wm2Eave.rotation.x = Math.PI / 2;
    mctx.scene.add(wm2Eave);
    const wm2PeakCap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4 }));
    wm2PeakCap.position.set(wm2X, wm2Y + 6.8, wm2Z);
    mctx.scene.add(wm2PeakCap);
    for (let sr = 0; sr < 4; sr++) {
      const srFrac = (sr + 1) / 5;
      const srR = 1.75 * (1 - srFrac) * 0.95;
      const shR = new THREE.Mesh(new THREE.TorusGeometry(srR, 0.02, 6, 16), new THREE.MeshStandardMaterial({ color: 0x775530, roughness: 0.9 }));
      shR.position.set(wm2X, wm2Y + 5.05 + srFrac * 1.7, wm2Z);
      shR.rotation.x = Math.PI / 2;
      mctx.scene.add(shR);
    }
    // Proper sail structure
    const wm2SailMat = new THREE.MeshStandardMaterial({ color: 0xeee8d8, roughness: 0.8, side: THREE.DoubleSide });
    const wm2FrameMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.85 });
    const wm2HubY = wm2Y + 5;
    // Hub
    const wm2Hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }));
    wm2Hub.rotation.x = Math.PI / 2;
    wm2Hub.position.set(wm2X, wm2HubY, wm2Z - 1.4);
    mctx.scene.add(wm2Hub);
    const wm2HubCap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }));
    wm2HubCap.position.set(wm2X, wm2HubY, wm2Z - 1.55);
    mctx.scene.add(wm2HubCap);
    for (let b = 0; b < 4; b++) {
      const ba = b * Math.PI / 2 + 0.4;
      const cos2 = Math.cos(ba), sin2 = Math.sin(ba);
      const sparL = 3.8;
      const spar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, sparL, 0.05), wm2FrameMat);
      spar2.position.set(wm2X + cos2 * (sparL / 2), wm2HubY + sin2 * (sparL / 2), wm2Z - 1.45);
      spar2.rotation.z = ba;
      mctx.scene.add(spar2);
      for (let cb = 0; cb < 5; cb++) {
        const cbd = 0.5 + cb * 0.6;
        const rung2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.035), wm2FrameMat);
        rung2.position.set(wm2X + cos2 * cbd, wm2HubY + sin2 * cbd, wm2Z - 1.45);
        rung2.rotation.z = ba + Math.PI / 2;
        mctx.scene.add(rung2);
      }
      const sail2 = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 3), wm2SailMat);
      sail2.position.set(
        wm2X + cos2 * (sparL / 2 + 0.15) - sin2 * 0.2,
        wm2HubY + sin2 * (sparL / 2 + 0.15) + cos2 * 0.2,
        wm2Z - 1.46,
      );
      sail2.rotation.z = ba;
      mctx.scene.add(sail2);
    }
    // Windmill door
    const wm2Door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x553311 }));
    wm2Door.position.set(wm2X, wm2Y + 0.75, wm2Z + 1.81);
    mctx.scene.add(wm2Door);
    // Brick mortar lines on second windmill body
    const wm2MortarMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.95 });
    for (let row = 0; row < 8; row++) {
      const mY = wm2Y + 0.4 + row * 0.55;
      const rowR = 1.8 - (row / 8) * 0.6;
      const mortar = new THREE.Mesh(new THREE.TorusGeometry(rowR, 0.012, 12, 20), wm2MortarMat);
      mortar.position.set(wm2X, mY, wm2Z);
      mortar.rotation.x = Math.PI / 2;
      mctx.scene.add(mortar);
    }
    // Vertical brick joints on second windmill
    for (let row = 0; row < 7; row++) {
      const jY = wm2Y + 0.65 + row * 0.55;
      const jR = 1.8 - ((row + 0.5) / 8) * 0.6;
      const jCount = 10 + row % 2;
      for (let j = 0; j < jCount; j++) {
        const jAngle = (j / jCount) * Math.PI * 2 + (row % 2) * (Math.PI / jCount);
        const jx = wm2X + Math.cos(jAngle) * (jR + 0.01);
        const jz = wm2Z + Math.sin(jAngle) * (jR + 0.01);
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), wm2MortarMat);
        joint.position.set(jx, jY, jz);
        joint.rotation.y = -jAngle;
        mctx.scene.add(joint);
      }
    }
    // Window on second windmill
    const wm2Win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.2, transparent: true, opacity: 0.5 }));
    wm2Win.position.set(wm2X, wm2Y + 3, wm2Z + 1.25);
    mctx.scene.add(wm2Win);
    // Foundation
    const wm2Found = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.25, 12), stoneMat);
    wm2Found.position.set(wm2X, wm2Y + 0.12, wm2Z);
    mctx.scene.add(wm2Found);

    // ── Bird nests in trees (small twig bundles) ──
    const twigMat = new THREE.MeshStandardMaterial({ color: 0x8a6940, roughness: 0.9 });
    const eggMat = new THREE.MeshStandardMaterial({ color: 0xddeedd, roughness: 0.5 });
    for (let i = 0; i < 8; i++) {
      const nest = new THREE.Group();
      // Nest base (flattened torus)
      const nestBase = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 20, 27), twigMat);
      nestBase.rotation.x = Math.PI / 2;
      nest.add(nestBase);
      // Inner cup
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16, 0, Math.PI * 2, Math.PI / 2), twigMat);
      cup.position.y = -0.02;
      cup.rotation.x = Math.PI;
      nest.add(cup);
      // Eggs
      for (let e = 0; e < 2 + Math.floor(Math.random() * 2); e++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.025, 17, 16), eggMat);
        egg.scale.y = 1.3;
        egg.position.set((Math.random() - 0.5) * 0.06, 0.02, (Math.random() - 0.5) * 0.06);
        nest.add(egg);
      }
      const nX = (Math.random() - 0.5) * w * 0.8;
      const nZ = (Math.random() - 0.5) * d * 0.8;
      nest.position.set(nX, 4 + Math.random() * 3, nZ);
      mctx.scene.add(nest);
    }

    // ── Rolling hills with wildflower meadow patches ──
    const meadowMat = new THREE.MeshStandardMaterial({ color: 0x55aa33, roughness: 0.85 });
    for (let i = 0; i < 15; i++) {
      const meadow = new THREE.Mesh(new THREE.CircleGeometry(3 + Math.random() * 4, 16), meadowMat);
      meadow.rotation.x = -Math.PI / 2;
      const mX = (Math.random() - 0.5) * w * 0.8;
      const mZ = (Math.random() - 0.5) * d * 0.8;
      meadow.position.set(mX, getTerrainHeight(mX, mZ, 1.4) + 0.03, mZ);
      mctx.scene.add(meadow);
      // Sprinkle tiny flowers on each meadow
      for (let f = 0; f < 10; f++) {
        const fColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const tinyFlower = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 17, 16),
          new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.3 }),
        );
        const fAngle = Math.random() * Math.PI * 2;
        const fDist = Math.random() * 3;
        tinyFlower.position.set(mX + Math.cos(fAngle) * fDist, getTerrainHeight(mX, mZ, 1.4) + 0.08, mZ + Math.sin(fAngle) * fDist);
        mctx.scene.add(tinyFlower);
      }
    }

    // ── Atmospheric warm point lights ──
    const warmLightColors = [0xffeeaa, 0xffddaa, 0xffeebb];
    for (let i = 0; i < 5; i++) {
      const warmLight = new THREE.PointLight(warmLightColors[i % 3], 0.3, 18);
      warmLight.position.set(
        (Math.random() - 0.5) * w * 0.6,
        2.5 + Math.random() * 2,
        (Math.random() - 0.5) * d * 0.6,
      );
      mctx.scene.add(warmLight);
    }

    // ── Wooden cart and barrel near farmstead ──
    const cartGroup = new THREE.Group();
    const wheelR = 0.3;
    const cartBedY = wheelR + 0.05; // bed sits on top of wheels
    const cartBed = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1.2), woodMat);
    cartBed.position.y = cartBedY;
    cartGroup.add(cartBed);
    // Cart sides
    const cSide1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.08), woodMat);
    cSide1.position.set(0, cartBedY + 0.3, -0.6);
    cartGroup.add(cSide1);
    const cSide2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.08), woodMat);
    cSide2.position.set(0, cartBedY + 0.3, 0.6);
    cartGroup.add(cSide2);
    // Back panel
    const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.2), woodMat);
    cBack.position.set(-1.0, cartBedY + 0.3, 0);
    cartGroup.add(cBack);
    // Wheels (4 wheels, properly positioned under the cart)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.7, metalness: 0.1 });
    const wheelAxleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.6 });
    for (const wx of [-0.7, 0.7]) {
      for (const wz of [-0.55, 0.55]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.04, 12, 20), wheelMat);
        wheel.position.set(wx, wheelR, wz);
        wheel.rotation.y = Math.PI / 2;
        cartGroup.add(wheel);
        // Wheel spokes (cross pattern)
        for (let sp = 0; sp < 4; sp++) {
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, wheelR * 1.8, 10), wheelMat);
          spoke.position.set(wx, wheelR, wz);
          spoke.rotation.set(0, 0, (sp / 4) * Math.PI);
          spoke.rotation.y = Math.PI / 2;
          cartGroup.add(spoke);
        }
        // Axle hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), wheelAxleMat);
        hub.position.set(wx, wheelR, wz);
        hub.rotation.x = Math.PI / 2;
        cartGroup.add(hub);
      }
    }
    // Handle (pull bar)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 12), woodMat);
    handle.position.set(1.7, cartBedY - 0.1, 0);
    handle.rotation.z = Math.PI / 2 + 0.2;
    cartGroup.add(handle);
    // Barrels in cart
    for (let b = 0; b < 2; b++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12), woodMat);
      barrel.position.set(-0.4 + b * 0.8, cartBedY + 0.3, 0);
      cartGroup.add(barrel);
    }
    cartGroup.position.set(farmX + 5, getTerrainHeight(farmX + 5, farmZ + 3, 1.4), farmZ + 3);
    cartGroup.rotation.y = 0.3;
    mctx.scene.add(cartGroup);


    // ── Wildflower patches with multi-petal detail (small colored spheres in clusters) ──
    for (let i = 0; i < 25; i++) {
      const petalCluster = new THREE.Group();
      const clusterColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const petalMat = new THREE.MeshStandardMaterial({ color: clusterColor, roughness: 0.3 });
      const petalCount = 5 + Math.floor(Math.random() * 4);
      // Central pistil
      const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffdd22, roughness: 0.5 }));
      pistil.position.y = 0.25;
      petalCluster.add(pistil);
      // Petals arranged around center
      for (let p = 0; p < petalCount; p++) {
        const pAngle = (p / petalCount) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), petalMat);
        petal.scale.set(1.2, 0.5, 0.8);
        petal.position.set(Math.cos(pAngle) * 0.05, 0.25, Math.sin(pAngle) * 0.05);
        petal.rotation.y = pAngle;
        petalCluster.add(petal);
      }
      // Stem
      const pcStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x337722 }));
      pcStem.position.y = 0.125;
      petalCluster.add(pcStem);
      // Leaf
      const pcLeaf = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x44aa22, side: THREE.DoubleSide }));
      pcLeaf.position.set(0.03, 0.12, 0);
      pcLeaf.rotation.z = 0.5;
      petalCluster.add(pcLeaf);
      const pcX = (Math.random() - 0.5) * w * 0.8;
      const pcZ = (Math.random() - 0.5) * d * 0.8;
      petalCluster.position.set(pcX, getTerrainHeight(pcX, pcZ, 1.4), pcZ);
      mctx.scene.add(petalCluster);
    }

    // ── Stone fence/wall segments between fields ──
    const wallStoneColors = [0x777766, 0x888877, 0x6a6a5f, 0x7a7a6e, 0x696960, 0x8a8878];
    for (let i = 0; i < 8; i++) {
      const stoneWall = new THREE.Group();
      const wallLen = 6 + Math.floor(Math.random() * 8);
      for (let s = 0; s < wallLen; s++) {
        const stoneH = 0.3 + Math.random() * 0.3;
        const stoneW = 0.4 + Math.random() * 0.3;
        const stone = new THREE.Mesh(
          new THREE.BoxGeometry(stoneW, stoneH, 0.4),
          new THREE.MeshStandardMaterial({ color: wallStoneColors[Math.floor(Math.random() * wallStoneColors.length)], roughness: 0.85 }),
        );
        stone.position.set(s * 0.45, stoneH / 2, 0);
        stone.rotation.y = (Math.random() - 0.5) * 0.1;
        stoneWall.add(stone);
        // Second layer (some gaps)
        if (Math.random() > 0.3) {
          const stone2H = 0.2 + Math.random() * 0.2;
          const stone2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, stone2H, 0.35),
            stoneMat,
          );
          stone2.position.set(s * 0.45 + (Math.random() - 0.5) * 0.1, stoneH + stone2H / 2, 0);
          stoneWall.add(stone2);
        }
      }
      // Moss on top
      for (let m = 0; m < wallLen / 2; m++) {
        const wallMoss = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.9, side: THREE.DoubleSide }));
        wallMoss.rotation.x = -Math.PI / 2;
        wallMoss.position.set(m * 0.9, 0.55, 0);
        stoneWall.add(wallMoss);
      }
      const swX = (Math.random() - 0.5) * w * 0.7;
      const swZ = (Math.random() - 0.5) * d * 0.7;
      stoneWall.position.set(swX, getTerrainHeight(swX, swZ, 1.4), swZ);
      stoneWall.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(stoneWall);
    }

    // ── Windmill structural braces on body ──
    const wmDetailX = -hw * 0.35, wmDetailZ = hd * 0.3;
    const wmDetailY = getTerrainHeight(wmDetailX, wmDetailZ, 1.4);
    for (let br = 0; br < 4; br++) {
      const brAngle = (br / 4) * Math.PI * 2;
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3, 0.08), woodMat);
      brace.position.set(
        wmDetailX + Math.cos(brAngle) * 1.7,
        wmDetailY + 5.5,
        wmDetailZ + Math.sin(brAngle) * 1.7,
      );
      brace.rotation.z = Math.cos(brAngle) * 0.15;
      brace.rotation.x = Math.sin(brAngle) * 0.15;
      mctx.scene.add(brace);
    }

    // ── Hay bale texture using wrapped cylinder rings ──
    for (let i = 0; i < 8; i++) {
      const detailedHay = new THREE.Group();
      const hayBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.85, 12), hayMat);
      hayBody.rotation.x = Math.PI / 2;
      detailedHay.add(hayBody);
      // Twine wrapping rings
      for (let r = 0; r < 3; r++) {
        const twine = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.015, 8, 20), new THREE.MeshStandardMaterial({ color: 0x997733, roughness: 0.7 }));
        twine.position.z = -0.3 + r * 0.3;
        detailedHay.add(twine);
      }
      // Straw texture strands on face
      for (let s = 0; s < 8; s++) {
        const strandAngle = (s / 8) * Math.PI * 2;
        const strand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.4, 0.01), hayMat);
        strand.position.set(Math.cos(strandAngle) * 0.3, Math.sin(strandAngle) * 0.3, 0.43);
        strand.rotation.z = strandAngle;
        detailedHay.add(strand);
      }
      const dhX = (Math.random() - 0.5) * w * 0.7;
      const dhZ = (Math.random() - 0.5) * d * 0.7;
      detailedHay.position.set(dhX, getTerrainHeight(dhX, dhZ, 1.4) + 0.5, dhZ);
      detailedHay.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(detailedHay);
    }

    // ── Butterfly/insect props (tiny colored planes) ──
    const insectColors = [0xff6633, 0xffcc22, 0x88bbff, 0xff55aa, 0x55ddcc, 0xaaff44];
    for (let i = 0; i < 30; i++) {
      const insect = new THREE.Group();
      const insectColor = insectColors[Math.floor(Math.random() * insectColors.length)];
      const insectMat = new THREE.MeshStandardMaterial({ color: insectColor, emissive: insectColor, emissiveIntensity: 0.15, side: THREE.DoubleSide });
      if (Math.random() > 0.3) {
        // Butterfly with detailed wings
        const lwing = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), insectMat);
        lwing.position.set(-0.035, 0, 0);
        lwing.rotation.z = 0.35;
        insect.add(lwing);
        const rwing = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), insectMat);
        rwing.position.set(0.035, 0, 0);
        rwing.rotation.z = -0.35;
        insect.add(rwing);
        // Lower wings (smaller)
        const llwing = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.05), insectMat);
        llwing.position.set(-0.025, -0.03, 0);
        llwing.rotation.z = 0.5;
        insect.add(llwing);
        const rlwing = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.05), insectMat);
        rlwing.position.set(0.025, -0.03, 0);
        rlwing.rotation.z = -0.5;
        insect.add(rlwing);
        // Body
        const iBody = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        iBody.rotation.z = Math.PI / 2;
        insect.add(iBody);
        // Antennae
        for (let a = 0; a < 2; a++) {
          const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
          antenna.position.set(a === 0 ? -0.008 : 0.008, 0.015, 0.02);
          antenna.rotation.z = a === 0 ? 0.4 : -0.4;
          insect.add(antenna);
        }
      } else {
        // Dragonfly
        const dfBody = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.06, 10), insectMat);
        dfBody.rotation.z = Math.PI / 2;
        insect.add(dfBody);
        for (let dw = 0; dw < 4; dw++) {
          const dfWing = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0xccddee, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
          dfWing.position.set(dw < 2 ? -0.01 : 0.01, 0.01, dw % 2 === 0 ? 0.035 : -0.035);
          dfWing.rotation.x = dw < 2 ? 0.3 : -0.3;
          insect.add(dfWing);
        }
      }
      const inX = (Math.random() - 0.5) * w * 0.8;
      const inZ = (Math.random() - 0.5) * d * 0.8;
      insect.position.set(inX, 0.6 + Math.random() * 2.5, inZ);
      insect.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(insect);
    }

    // ── Scarecrow ──
    const scarecrow = new THREE.Group();
    const scPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3, 17), woodMat);
    scPole.position.y = 1.5;
    scarecrow.add(scPole);
    const scArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 17), woodMat);
    scArm.rotation.z = Math.PI / 2;
    scArm.position.y = 2.3;
    scarecrow.add(scArm);
    // Head (sack)
    const scHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 20), hayMat);
    scHead.position.y = 3.2;
    scarecrow.add(scHead);
    // Hat
    const scHat = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 }));
    scHat.position.y = 3.5;
    scarecrow.add(scHat);
    const scHatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 }));
    scHatBrim.position.y = 3.35;
    scarecrow.add(scHatBrim);
    scarecrow.position.set(farmX - 6, getTerrainHeight(farmX - 6, farmZ + 5, 1.4), farmZ + 5);
    mctx.scene.add(scarecrow);

    // ── Dense ground grass (extra variety layer) ──
    const denseGrassShades = [
      new THREE.MeshStandardMaterial({ color: 0x55aa33, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x66bb44, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x77cc55, roughness: 0.65, side: THREE.DoubleSide }),
    ];
    for (let gi = 0; gi < 250; gi++) {
      const grassClump = new THREE.Group();
      const bladeCount = 5 + Math.floor(Math.random() * 6);
      for (let bl = 0; bl < bladeCount; bl++) {
        const bladeH = 0.4 + Math.random() * 0.5;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05 + Math.random() * 0.03, bladeH),
          denseGrassShades[Math.floor(Math.random() * 3)],
        );
        blade.position.set((Math.random() - 0.5) * 0.3, bladeH / 2, (Math.random() - 0.5) * 0.3);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        grassClump.add(blade);
      }
      const gx = (Math.random() - 0.5) * w * 0.9;
      const gz = (Math.random() - 0.5) * d * 0.9;
      grassClump.position.set(gx, getTerrainHeight(gx, gz, 1.4), gz);
      mctx.scene.add(grassClump);
    }

    // ── Building colliders for player collision ──
    mctx.buildingColliders = [
      [hw * 0.3, -hd * 0.35, 3, 3],                       // Farmhouse
      [hw * 0.3 + 9, -hd * 0.35 - 2, 4, 3],               // Barn
      [hw * 0.3 + 14, -hd * 0.35 - 3, 1.5, 1.5],          // Silo
      [-hw * 0.35, hd * 0.3, 2.2, 2.2],                    // Windmill
      [hw * 0.3 - 4, -hd * 0.35 + 4, 1.2, 1],             // Chicken coop
      [hw * 0.3 + 9 - 3.8, -hd * 0.35 - 2 - 2.8, 1.2, 1.2], // Tool shed
    ];
}

export function buildWhisperingMarsh(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x334422, 0.025);
    mctx.applyTerrainColors(0x2a3a1a, 0x3b4a2b, 0.8);
    mctx.dirLight.color.setHex(0x99aa66);
    mctx.dirLight.intensity = 0.6;
    mctx.ambientLight.color.setHex(0x556633);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x667744);
    mctx.hemiLight.groundColor.setHex(0x2a3a1a);

    const darkBarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    const deadWoodMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.95 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
    const lilyMat = new THREE.MeshStandardMaterial({ color: 0x44bb33, roughness: 0.5 });
    const mossCoverMat = new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.85 });
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x6b5533, roughness: 0.9 });
    const mudMat = new THREE.MeshStandardMaterial({ color: 0x3a2a15, roughness: 1.0 });
    const cattailMat = new THREE.MeshStandardMaterial({ color: 0x5a4422, roughness: 0.8 });
    const boatMat = new THREE.MeshStandardMaterial({ color: 0x7a6644, roughness: 0.85 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x557733, roughness: 0.7, side: THREE.DoubleSide });
    const hangingMossMat = new THREE.MeshStandardMaterial({ color: 0x667744, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const fogPatchMat = new THREE.MeshStandardMaterial({ color: 0x88aa77, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.9 });

    // ── Dead trees with hanging moss ──
    for (let i = 0; i < 45; i++) {
      const tree = new THREE.Group();
      const trunkH = 3 + Math.random() * 4;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 + Math.random() * 0.12, 0.15 + Math.random() * 0.15, trunkH, 10),
        deadWoodMat,
      );
      trunk.position.y = trunkH / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      trunk.rotation.x = (Math.random() - 0.5) * 0.1;
      tree.add(trunk);
      // Sparse branches
      const branchCount = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < branchCount; b++) {
        const branchLen = 1 + Math.random() * 2;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.06, branchLen, 17),
          deadWoodMat,
        );
        const brY = trunkH * (0.5 + Math.random() * 0.4);
        const brAngle = Math.random() * Math.PI * 2;
        branch.position.set(
          Math.cos(brAngle) * branchLen * 0.3,
          brY,
          Math.sin(brAngle) * branchLen * 0.3,
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.8;
        tree.add(branch);
        // Hanging moss from branches
        if (Math.random() > 0.4) {
          const mossH = 0.5 + Math.random() * 1.5;
          const moss = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, mossH),
            hangingMossMat,
          );
          moss.position.set(
            Math.cos(brAngle) * branchLen * 0.5,
            brY - mossH * 0.4,
            Math.sin(brAngle) * branchLen * 0.5,
          );
          moss.rotation.y = Math.random() * Math.PI;
          tree.add(moss);
        }
      }
      const tx = (Math.random() - 0.5) * w * 0.9;
      const tz = (Math.random() - 0.5) * d * 0.9;
      tree.position.set(tx, getTerrainHeight(tx, tz, 0.8), tz);
      mctx.scene.add(tree);
    }

    // ── Stagnant water pools ──
    for (let i = 0; i < 18; i++) {
      const poolR = 2 + Math.random() * 5;
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(poolR, 16),
        waterMat,
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.02 + Math.random() * 0.03,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(pool);
    }

    // ── Lily pads on water ──
    for (let i = 0; i < 35; i++) {
      const lilyR = 0.15 + Math.random() * 0.2;
      const lily = new THREE.Mesh(
        new THREE.CircleGeometry(lilyR, 27),
        lilyMat,
      );
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(
        (Math.random() - 0.5) * w * 0.75,
        0.06,
        (Math.random() - 0.5) * d * 0.75,
      );
      mctx.scene.add(lily);
    }

    // ── Willow trees (drooping branches) ──
    for (let i = 0; i < 10; i++) {
      const willow = new THREE.Group();
      const trunkH = 4 + Math.random() * 2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.35, trunkH, 10),
        darkBarkMat,
      );
      trunk.position.y = trunkH / 2;
      willow.add(trunk);
      // Drooping branches
      const droopCount = 10 + Math.floor(Math.random() * 8);
      for (let b = 0; b < droopCount; b++) {
        const droopLen = 2 + Math.random() * 3;
        const droop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.015, droopLen, 16),
          new THREE.MeshStandardMaterial({ color: 0x557733, roughness: 0.7 }),
        );
        const angle = (b / droopCount) * Math.PI * 2;
        const spreadR = 1 + Math.random() * 1.5;
        droop.position.set(
          Math.cos(angle) * spreadR,
          trunkH - droopLen * 0.3,
          Math.sin(angle) * spreadR,
        );
        droop.rotation.z = Math.cos(angle) * 0.3;
        droop.rotation.x = Math.sin(angle) * 0.3;
        willow.add(droop);
      }
      const wx = (Math.random() - 0.5) * w * 0.8;
      const wz = (Math.random() - 0.5) * d * 0.8;
      willow.position.set(wx, getTerrainHeight(wx, wz, 0.8), wz);
      mctx.scene.add(willow);
    }

    // ── Glowing mushroom clusters (bioluminescent) ──
    const shroomColors = [0x44ff88, 0x88ffaa, 0x33ddaa, 0x55ffcc, 0x66ee77];
    for (let i = 0; i < 28; i++) {
      const cluster = new THREE.Group();
      const cnt = 2 + Math.floor(Math.random() * 4);
      const glowColor = shroomColors[Math.floor(Math.random() * shroomColors.length)];
      for (let s = 0; s < cnt; s++) {
        const capR = 0.08 + Math.random() * 0.15;
        const stemH = 0.1 + Math.random() * 0.25;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.03, stemH, 17),
          new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.7 }),
        );
        stem.position.set((Math.random() - 0.5) * 0.3, stemH / 2, (Math.random() - 0.5) * 0.3);
        cluster.add(stem);
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(capR, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.8, roughness: 0.3 }),
        );
        cap.position.set(stem.position.x, stemH, stem.position.z);
        cluster.add(cap);
      }
      const glow = new THREE.PointLight(glowColor, 0.4, 4);
      glow.position.set(0, 0.3, 0);
      cluster.add(glow);
      mctx.torchLights.push(glow);
      const mx = (Math.random() - 0.5) * w * 0.85;
      const mz = (Math.random() - 0.5) * d * 0.85;
      cluster.position.set(mx, getTerrainHeight(mx, mz, 0.8), mz);
      mctx.scene.add(cluster);
    }

    // ── Cattail reeds ──
    for (let i = 0; i < 25; i++) {
      const reed = new THREE.Group();
      const reedH = 1 + Math.random() * 1.5;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, reedH, 16),
        new THREE.MeshStandardMaterial({ color: 0x558833 }),
      );
      stem.position.y = reedH / 2;
      reed.add(stem);
      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.2, 10),
        cattailMat,
      );
      head.position.y = reedH;
      reed.add(head);
      const rx = (Math.random() - 0.5) * w * 0.8;
      const rz = (Math.random() - 0.5) * d * 0.8;
      reed.position.set(rx, getTerrainHeight(rx, rz, 0.8), rz);
      mctx.scene.add(reed);
    }

    // ── Rickety wooden bridges / walkways ──
    for (let i = 0; i < 7; i++) {
      const bridge = new THREE.Group();
      const plankCount = 6 + Math.floor(Math.random() * 5);
      for (let p = 0; p < plankCount; p++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.08, 0.3),
          plankMat,
        );
        plank.position.set(0, 0.3, p * 0.5 - plankCount * 0.25);
        plank.rotation.z = (Math.random() - 0.5) * 0.05;
        bridge.add(plank);
      }
      // Support posts
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 17), plankMat);
      post1.position.set(-0.8, 0, -plankCount * 0.25);
      bridge.add(post1);
      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 17), plankMat);
      post2.position.set(-0.8, 0, plankCount * 0.25);
      bridge.add(post2);
      const post3 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 17), plankMat);
      post3.position.set(0.8, 0, -plankCount * 0.25);
      bridge.add(post3);
      const post4 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 17), plankMat);
      post4.position.set(0.8, 0, plankCount * 0.25);
      bridge.add(post4);
      const bx = (Math.random() - 0.5) * w * 0.6;
      const bz = (Math.random() - 0.5) * d * 0.6;
      bridge.position.set(bx, 0.05, bz);
      bridge.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(bridge);
    }

    // ── Moss-covered rocks ──
    for (let i = 0; i < 18; i++) {
      const rockGroup = new THREE.Group();
      const rh = 0.4 + Math.random() * 1.2;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rh, 2),
        stoneMat,
      );
      rock.scale.set(0.8 + Math.random() * 0.4, 0.5 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
      rockGroup.add(rock);
      // Moss patches on top
      const mossPatch = new THREE.Mesh(
        new THREE.SphereGeometry(rh * 0.7, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2),
        mossCoverMat,
      );
      mossPatch.position.y = rh * 0.3;
      rockGroup.add(mossPatch);
      const rkX = (Math.random() - 0.5) * w * 0.85;
      const rkZ = (Math.random() - 0.5) * d * 0.85;
      rockGroup.position.set(rkX, getTerrainHeight(rkX, rkZ, 0.8), rkZ);
      mctx.scene.add(rockGroup);
    }

    // ── Fog patches (ground-level haze) ──
    for (let i = 0; i < 12; i++) {
      const fogPatch = new THREE.Mesh(
        new THREE.PlaneGeometry(6 + Math.random() * 8, 6 + Math.random() * 8),
        fogPatchMat,
      );
      fogPatch.rotation.x = -Math.PI / 2;
      fogPatch.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.15 + Math.random() * 0.3,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(fogPatch);
    }

    // ── Twisted root arches ──
    for (let i = 0; i < 10; i++) {
      const arch = new THREE.Group();
      const archH = 1.5 + Math.random() * 2;
      const archW = 1.5 + Math.random() * 2;
      // Left leg
      const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, archH, 10),
        rootMat,
      );
      leftLeg.position.set(-archW / 2, archH / 2, 0);
      leftLeg.rotation.z = 0.2;
      arch.add(leftLeg);
      // Right leg
      const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, archH, 10),
        rootMat,
      );
      rightLeg.position.set(archW / 2, archH / 2, 0);
      rightLeg.rotation.z = -0.2;
      arch.add(rightLeg);
      // Top span
      const topSpan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.1, archW * 1.2, 10),
        rootMat,
      );
      topSpan.rotation.z = Math.PI / 2;
      topSpan.position.y = archH;
      arch.add(topSpan);
      const ax = (Math.random() - 0.5) * w * 0.7;
      const az = (Math.random() - 0.5) * d * 0.7;
      arch.position.set(ax, getTerrainHeight(ax, az, 0.8), az);
      arch.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(arch);
    }

    // ── Ancient stone markers (half-submerged pillars) ──
    for (let i = 0; i < 5; i++) {
      const marker = new THREE.Group();
      const pillarH = 1.5 + Math.random() * 2;
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, pillarH, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x778877, roughness: 0.9 }),
      );
      pillar.position.y = pillarH * 0.3;
      pillar.rotation.z = (Math.random() - 0.5) * 0.2;
      marker.add(pillar);
      // Rune glow
      const rune = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x88ffaa, emissive: 0x44ff66, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 }),
      );
      rune.position.set(0, pillarH * 0.4, 0.16);
      marker.add(rune);
      const smx = (Math.random() - 0.5) * w * 0.7;
      const smz = (Math.random() - 0.5) * d * 0.7;
      marker.position.set(smx, getTerrainHeight(smx, smz, 0.8) - 0.3, smz);
      mctx.scene.add(marker);
    }

    // ── Fireflies (glowing spheres with PointLights) ──
    for (let i = 0; i < 14; i++) {
      const fly = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 17, 17),
        new THREE.MeshStandardMaterial({ color: 0xeeff66, emissive: 0xddff44, emissiveIntensity: 1.0 }),
      );
      const fx = (Math.random() - 0.5) * w * 0.8;
      const fz = (Math.random() - 0.5) * d * 0.8;
      fly.position.set(fx, 0.5 + Math.random() * 2.5, fz);
      mctx.scene.add(fly);
      const flyLight = new THREE.PointLight(0xddff44, 0.3, 3);
      flyLight.position.copy(fly.position);
      mctx.scene.add(flyLight);
      mctx.torchLights.push(flyLight);
    }

    // ── Abandoned rowboats ──
    for (let i = 0; i < 7; i++) {
      const boat = new THREE.Group();
      // Hull
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.3, 2.5),
        boatMat,
      );
      hull.position.y = 0.15;
      boat.add(hull);
      // Sides
      const side1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 2.5), boatMat);
      side1.position.set(-0.6, 0.35, 0);
      boat.add(side1);
      const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 2.5), boatMat);
      side2.position.set(0.6, 0.35, 0);
      boat.add(side2);
      // Bow (front taper)
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), boatMat);
      bow.position.set(0, 0.2, 1.4);
      bow.rotation.x = 0.3;
      boat.add(bow);
      const bkx = (Math.random() - 0.5) * w * 0.7;
      const bkz = (Math.random() - 0.5) * d * 0.7;
      boat.position.set(bkx, 0.02, bkz);
      boat.rotation.y = Math.random() * Math.PI * 2;
      boat.rotation.z = (Math.random() - 0.5) * 0.15;
      mctx.scene.add(boat);
    }

    // ── Swamp grass tufts ──
    for (let i = 0; i < 18; i++) {
      const tuft = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7 + Math.random() * 0.5),
        grassMat,
      );
      tuft.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.25,
        (Math.random() - 0.5) * d * 0.85,
      );
      tuft.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(tuft);
    }

    // ── Bubbling mud patches ──
    for (let i = 0; i < 6; i++) {
      const mudGroup = new THREE.Group();
      const mudR = 1 + Math.random() * 2;
      const mudPool = new THREE.Mesh(
        new THREE.CircleGeometry(mudR, 16),
        new THREE.MeshStandardMaterial({ color: 0x3a2a15, roughness: 1.0 }),
      );
      mudPool.rotation.x = -Math.PI / 2;
      mudPool.position.y = 0.01;
      mudGroup.add(mudPool);
      // Bubbles
      const bubbleCount = 4 + Math.floor(Math.random() * 5);
      for (let b = 0; b < bubbleCount; b++) {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 17, 17),
          mudMat,
        );
        const bAngle = Math.random() * Math.PI * 2;
        const bDist = Math.random() * mudR * 0.7;
        bubble.position.set(
          Math.cos(bAngle) * bDist,
          0.03 + Math.random() * 0.05,
          Math.sin(bAngle) * bDist,
        );
        mudGroup.add(bubble);
      }
      const mpx = (Math.random() - 0.5) * w * 0.7;
      const mpz = (Math.random() - 0.5) * d * 0.7;
      mudGroup.position.set(mpx, getTerrainHeight(mpx, mpz, 0.8), mpz);
      mctx.scene.add(mudGroup);
    }

    // ── Will-o'-wisps (glowing green/blue orbs floating above water) ──
    const wispColors = [0x44ff88, 0x88ffcc, 0x22ddaa, 0x66ffaa, 0x33eebb];
    for (let i = 0; i < 16; i++) {
      const wispGroup = new THREE.Group();
      const wispColor = wispColors[Math.floor(Math.random() * wispColors.length)];
      // Core orb
      const wispCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 23, 20),
        new THREE.MeshStandardMaterial({ color: wispColor, emissive: wispColor, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }),
      );
      wispGroup.add(wispCore);
      // Outer glow halo
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 23, 20),
        new THREE.MeshStandardMaterial({ color: wispColor, emissive: wispColor, emissiveIntensity: 0.3, transparent: true, opacity: 0.15, depthWrite: false }),
      );
      wispGroup.add(halo);
      // Trailing wisps (small fading orbs)
      for (let t = 0; t < 3; t++) {
        const trail = new THREE.Mesh(
          new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 17, 16),
          new THREE.MeshStandardMaterial({ color: wispColor, emissive: wispColor, emissiveIntensity: 0.5, transparent: true, opacity: 0.3 }),
        );
        trail.position.set((Math.random() - 0.5) * 0.3, -(t + 1) * 0.12, (Math.random() - 0.5) * 0.3);
        wispGroup.add(trail);
      }
      const wispLight = new THREE.PointLight(wispColor, 0.6, 6);
      wispLight.position.set(0, 0, 0);
      wispGroup.add(wispLight);
      mctx.torchLights.push(wispLight);
      const wpx = (Math.random() - 0.5) * w * 0.8;
      const wpz = (Math.random() - 0.5) * d * 0.8;
      wispGroup.position.set(wpx, 0.5 + Math.random() * 2.5, wpz);
      mctx.scene.add(wispGroup);
    }

    // ── Rotting wooden walkways (longer, more decrepit) ──
    const rotPlankMat = new THREE.MeshStandardMaterial({ color: 0x5a4428, roughness: 0.95 });
    const mossyPlankMat = new THREE.MeshStandardMaterial({ color: 0x4a5533, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const walkway = new THREE.Group();
      const plankCount = 12 + Math.floor(Math.random() * 10);
      for (let p = 0; p < plankCount; p++) {
        const isMissing = Math.random() > 0.85;
        if (isMissing) continue;
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.06, 0.25),
          Math.random() > 0.4 ? rotPlankMat : mossyPlankMat,
        );
        plank.position.set(0, 0.25, p * 0.4 - plankCount * 0.2);
        plank.rotation.z = (Math.random() - 0.5) * 0.08;
        plank.rotation.y = (Math.random() - 0.5) * 0.03;
        // Some planks sag
        plank.position.y += (Math.random() - 0.5) * 0.06;
        walkway.add(plank);
      }
      // Support stilts
      for (let s = 0; s < 5; s++) {
        const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.8, 17), rotPlankMat);
        stilt.position.set(s % 2 === 0 ? -0.85 : 0.85, -0.1, -plankCount * 0.2 + s * plankCount * 0.1);
        stilt.rotation.z = (Math.random() - 0.5) * 0.1;
        walkway.add(stilt);
      }
      // Handrail (partial, broken)
      for (let h = 0; h < 3; h++) {
        if (Math.random() > 0.4) {
          const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 16), rotPlankMat);
          railPost.position.set(-0.9, 0.55, -plankCount * 0.15 + h * plankCount * 0.15);
          walkway.add(railPost);
        }
      }
      const wkx = (Math.random() - 0.5) * w * 0.65;
      const wkz = (Math.random() - 0.5) * d * 0.65;
      walkway.position.set(wkx, 0.03, wkz);
      walkway.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(walkway);
    }

    // ── More cattails and reeds (dense patches) ──
    for (let i = 0; i < 50; i++) {
      const reedCluster = new THREE.Group();
      const reedCount = 3 + Math.floor(Math.random() * 5);
      for (let r = 0; r < reedCount; r++) {
        const reedH = 0.8 + Math.random() * 1.8;
        const rStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, reedH, 16), new THREE.MeshStandardMaterial({ color: 0x558833 }));
        rStem.position.set((Math.random() - 0.5) * 0.3, reedH / 2, (Math.random() - 0.5) * 0.3);
        rStem.rotation.z = (Math.random() - 0.5) * 0.1;
        reedCluster.add(rStem);
        // Cattail head (brown fuzzy top)
        if (Math.random() > 0.5) {
          const rHead = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), cattailMat);
          rHead.position.set(rStem.position.x, reedH, rStem.position.z);
          reedCluster.add(rHead);
        }
      }
      const rcx = (Math.random() - 0.5) * w * 0.85;
      const rcz = (Math.random() - 0.5) * d * 0.85;
      reedCluster.position.set(rcx, getTerrainHeight(rcx, rcz, 0.8), rcz);
      mctx.scene.add(reedCluster);
    }

    // ── Skeletal remains half-submerged in swamp ──
    for (let i = 0; i < 8; i++) {
      const remains = new THREE.Group();
      const skelBoneMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.8 });
      // Ribcage poking out
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 17, 23, Math.PI * 0.7), skelBoneMat);
        rib.position.set(r * 0.12, 0.1 + r * 0.02, 0);
        rib.rotation.y = Math.PI / 2;
        remains.add(rib);
      }
      // Skull partially visible
      if (Math.random() > 0.4) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 17), skelBoneMat);
        skull.scale.set(1, 0.75, 1.1);
        skull.position.set(-0.2, 0.08, 0);
        remains.add(skull);
      }
      // Arm bone reaching up
      const armBone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.5, 16), skelBoneMat);
      armBone.position.set(0.2, 0.2, 0.1);
      armBone.rotation.z = -0.5;
      remains.add(armBone);
      // Hand bones
      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.1, 16), skelBoneMat);
        finger.position.set(0.35, 0.4, -0.05 + f * 0.05);
        finger.rotation.z = -0.3 + f * 0.15;
        remains.add(finger);
      }
      const rmx = (Math.random() - 0.5) * w * 0.75;
      const rmz = (Math.random() - 0.5) * d * 0.75;
      remains.position.set(rmx, getTerrainHeight(rmx, rmz, 0.8) - 0.1, rmz);
      remains.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(remains);
    }

    // ── Twisted mangrove root systems ──
    for (let i = 0; i < 12; i++) {
      const mangrove = new THREE.Group();
      const rootCount = 5 + Math.floor(Math.random() * 5);
      for (let r = 0; r < rootCount; r++) {
        const rootH = 0.8 + Math.random() * 1.5;
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.08, rootH, 17),
          rootMat,
        );
        const rAngle = (r / rootCount) * Math.PI * 2;
        const rDist = 0.3 + Math.random() * 0.8;
        root.position.set(Math.cos(rAngle) * rDist, rootH * 0.3, Math.sin(rAngle) * rDist);
        root.rotation.z = Math.cos(rAngle) * 0.4;
        root.rotation.x = Math.sin(rAngle) * 0.4;
        mangrove.add(root);
        // Sub-roots
        if (Math.random() > 0.5) {
          const subRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, rootH * 0.5, 16), rootMat);
          subRoot.position.set(Math.cos(rAngle) * (rDist + 0.3), rootH * 0.15, Math.sin(rAngle) * (rDist + 0.3));
          subRoot.rotation.z = Math.cos(rAngle) * 0.6;
          subRoot.rotation.x = Math.sin(rAngle) * 0.6;
          mangrove.add(subRoot);
        }
      }
      // Central trunk rising from roots
      const mTrunkH = 2 + Math.random() * 2;
      const mTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, mTrunkH, 10), darkBarkMat);
      mTrunk.position.y = mTrunkH / 2 + 0.5;
      mangrove.add(mTrunk);
      const mgx = (Math.random() - 0.5) * w * 0.8;
      const mgz = (Math.random() - 0.5) * d * 0.8;
      mangrove.position.set(mgx, getTerrainHeight(mgx, mgz, 0.8), mgz);
      mctx.scene.add(mangrove);
    }

    // ── Additional fireflies (more, with varying heights) ──
    for (let i = 0; i < 25; i++) {
      const ff = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xeeff66, emissive: 0xddff44, emissiveIntensity: 1.2 }),
      );
      const ffx = (Math.random() - 0.5) * w * 0.85;
      const ffz = (Math.random() - 0.5) * d * 0.85;
      ff.position.set(ffx, 0.3 + Math.random() * 3.5, ffz);
      mctx.scene.add(ff);
      if (i < 10) {
        const ffLight = new THREE.PointLight(0xddff44, 0.2, 2.5);
        ffLight.position.copy(ff.position);
        mctx.scene.add(ffLight);
        mctx.torchLights.push(ffLight);
      }
    }

    // ── Larger bubbling mud pots (with steam wisps) ──
    for (let i = 0; i < 4; i++) {
      const mudPot = new THREE.Group();
      const potR = 2 + Math.random() * 2.5;
      const potPool = new THREE.Mesh(
        new THREE.CircleGeometry(potR, 16),
        new THREE.MeshStandardMaterial({ color: 0x332210, roughness: 1.0 }),
      );
      potPool.rotation.x = -Math.PI / 2;
      potPool.position.y = 0.01;
      mudPot.add(potPool);
      // Large bubbles
      for (let b = 0; b < 8; b++) {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.06 + Math.random() * 0.1, 20, 17),
          mudMat,
        );
        const bAng = Math.random() * Math.PI * 2;
        const bDst = Math.random() * potR * 0.6;
        bubble.position.set(Math.cos(bAng) * bDst, 0.04 + Math.random() * 0.08, Math.sin(bAng) * bDst);
        mudPot.add(bubble);
      }
      // Steam wisps (translucent vertical planes)
      for (let s = 0; s < 3; s++) {
        const steam = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 1 + Math.random() * 1),
          new THREE.MeshStandardMaterial({ color: 0xaabb88, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
        );
        steam.position.set((Math.random() - 0.5) * potR * 0.5, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * potR * 0.5);
        steam.rotation.y = Math.random() * Math.PI;
        mudPot.add(steam);
      }
      const mpx2 = (Math.random() - 0.5) * w * 0.65;
      const mpz2 = (Math.random() - 0.5) * d * 0.65;
      mudPot.position.set(mpx2, getTerrainHeight(mpx2, mpz2, 0.8), mpz2);
      mctx.scene.add(mudPot);
    }

    // ── Murky water pools with lily pad clusters ──
    for (let i = 0; i < 10; i++) {
      const lilyCluster = new THREE.Group();
      const padCount = 4 + Math.floor(Math.random() * 6);
      for (let p = 0; p < padCount; p++) {
        const padR = 0.12 + Math.random() * 0.18;
        const pad = new THREE.Mesh(new THREE.CircleGeometry(padR, 27), lilyMat);
        pad.rotation.x = -Math.PI / 2;
        const pAng = Math.random() * Math.PI * 2;
        const pDist = Math.random() * 1.5;
        pad.position.set(Math.cos(pAng) * pDist, 0.065, Math.sin(pAng) * pDist);
        lilyCluster.add(pad);
        // Lily flower on some pads
        if (Math.random() > 0.6) {
          const petalColors = [0xffaacc, 0xffffff, 0xffddee];
          const petalColor = petalColors[Math.floor(Math.random() * 3)];
          const lilyFlower = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.3 }),
          );
          lilyFlower.position.set(pad.position.x, 0.075, pad.position.z);
          lilyCluster.add(lilyFlower);
        }
      }
      const lcx = (Math.random() - 0.5) * w * 0.75;
      const lcz = (Math.random() - 0.5) * d * 0.75;
      lilyCluster.position.set(lcx, 0, lcz);
      mctx.scene.add(lilyCluster);
    }

    // ── Dense fog banks (layered) ──
    for (let i = 0; i < 8; i++) {
      const fogBank = new THREE.Group();
      for (let layer = 0; layer < 3; layer++) {
        const fogSheet = new THREE.Mesh(
          new THREE.PlaneGeometry(8 + Math.random() * 10, 4 + Math.random() * 4),
          new THREE.MeshStandardMaterial({ color: 0x667755, transparent: true, opacity: 0.06 + layer * 0.02, side: THREE.DoubleSide, depthWrite: false }),
        );
        fogSheet.rotation.x = -Math.PI / 2;
        fogSheet.position.y = 0.2 + layer * 0.15;
        fogSheet.rotation.z = Math.random() * Math.PI;
        fogBank.add(fogSheet);
      }
      fogBank.position.set(
        (Math.random() - 0.5) * w * 0.75,
        0,
        (Math.random() - 0.5) * d * 0.75,
      );
      mctx.scene.add(fogBank);
    }

    // ── Atmospheric swamp lighting (eerie green/yellow) ──
    const swampLightColors = [0x446633, 0x557744, 0x335522];
    for (let i = 0; i < 8; i++) {
      const swampGlow = new THREE.PointLight(swampLightColors[i % 3], 0.3, 10);
      swampGlow.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.5 + Math.random() * 1.5,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(swampGlow);
    }

    // ── Fallen logs across water ──
    for (let i = 0; i < 8; i++) {
      const fallenLog = new THREE.Group();
      const logLen = 3 + Math.random() * 5;
      const logR = 0.12 + Math.random() * 0.15;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR * 1.2, logLen, 10), deadWoodMat);
      log.rotation.z = Math.PI / 2;
      log.position.y = logR + 0.05;
      fallenLog.add(log);
      // Moss on log
      const logMoss = new THREE.Mesh(
        new THREE.CylinderGeometry(logR * 0.9, logR * 1.1, logLen * 0.6, 10),
        mossCoverMat,
      );
      logMoss.rotation.z = Math.PI / 2;
      logMoss.position.set(0, logR + 0.1, 0);
      logMoss.scale.y = 0.3;
      fallenLog.add(logMoss);
      // Shelf fungi on log
      for (let f = 0; f < 3; f++) {
        const fungus = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: 0x887744, roughness: 0.7 }),
        );
        fungus.position.set(-logLen * 0.2 + f * logLen * 0.2, logR * 1.2, logR * 0.5);
        fungus.rotation.z = Math.PI / 2;
        fallenLog.add(fungus);
      }
      const flx = (Math.random() - 0.5) * w * 0.75;
      const flz = (Math.random() - 0.5) * d * 0.75;
      fallenLog.position.set(flx, getTerrainHeight(flx, flz, 0.8), flz);
      fallenLog.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fallenLog);
    }


    // ── Dead tree branches extending outward (thin cylinder limbs) ──
    for (let i = 0; i < 15; i++) {
      const deadBranchTree = new THREE.Group();
      const dbTrunkH = 2.5 + Math.random() * 3;
      const dbTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, dbTrunkH, 17), deadWoodMat);
      dbTrunk.position.y = dbTrunkH / 2;
      deadBranchTree.add(dbTrunk);
      const limbCount = 4 + Math.floor(Math.random() * 4);
      for (let l = 0; l < limbCount; l++) {
        const limbLen = 1.5 + Math.random() * 2.5;
        const limbAngle = (l / limbCount) * Math.PI * 2 + Math.random() * 0.5;
        const limbY = dbTrunkH * (0.4 + Math.random() * 0.5);
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, limbLen, 12), deadWoodMat);
        limb.position.set(Math.cos(limbAngle) * limbLen * 0.35, limbY, Math.sin(limbAngle) * limbLen * 0.35);
        limb.rotation.z = Math.cos(limbAngle) * 0.9;
        limb.rotation.x = Math.sin(limbAngle) * 0.9;
        deadBranchTree.add(limb);
        // Sub-branches
        for (let sb = 0; sb < 2; sb++) {
          const subLen = 0.5 + Math.random() * 0.8;
          const subBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.025, subLen, 10), deadWoodMat);
          subBranch.position.set(
            Math.cos(limbAngle) * (limbLen * 0.5 + sb * 0.3),
            limbY + (Math.random() - 0.5) * 0.3,
            Math.sin(limbAngle) * (limbLen * 0.5 + sb * 0.3),
          );
          subBranch.rotation.z = Math.cos(limbAngle + sb) * 1.1;
          subBranch.rotation.x = Math.sin(limbAngle + sb) * 0.8;
          deadBranchTree.add(subBranch);
        }
      }
      const dbtX = (Math.random() - 0.5) * w * 0.85;
      const dbtZ = (Math.random() - 0.5) * d * 0.85;
      deadBranchTree.position.set(dbtX, getTerrainHeight(dbtX, dbtZ, 0.8), dbtZ);
      mctx.scene.add(deadBranchTree);
    }

    // ── Lily pad clusters on water (flat circles with slight curl) ──
    for (let i = 0; i < 15; i++) {
      const lilyPadCluster = new THREE.Group();
      const lpCount = 5 + Math.floor(Math.random() * 5);
      for (let lp = 0; lp < lpCount; lp++) {
        const lpR = 0.1 + Math.random() * 0.15;
        const lilyPad = new THREE.Mesh(new THREE.CircleGeometry(lpR, 20), lilyMat);
        lilyPad.rotation.x = -Math.PI / 2;
        const lpAng = Math.random() * Math.PI * 2;
        const lpDist = Math.random() * 1.2;
        lilyPad.position.set(Math.cos(lpAng) * lpDist, 0.062, Math.sin(lpAng) * lpDist);
        lilyPadCluster.add(lilyPad);
        // Curled edge (thin ring on one side)
        const curl = new THREE.Mesh(new THREE.TorusGeometry(lpR, 0.008, 12, 12, Math.PI * 0.4), lilyMat);
        curl.rotation.x = -Math.PI / 2;
        curl.position.set(Math.cos(lpAng) * lpDist + lpR * 0.5, 0.07, Math.sin(lpAng) * lpDist);
        curl.rotation.z = Math.random() * Math.PI;
        lilyPadCluster.add(curl);
      }
      // Water lily flowers on some clusters
      if (Math.random() > 0.4) {
        const lilyFlowerGrp = new THREE.Group();
        const lfPetalMat = new THREE.MeshStandardMaterial({ color: 0xffccdd, roughness: 0.3 });
        for (let pf = 0; pf < 6; pf++) {
          const pfAngle = (pf / 6) * Math.PI * 2;
          const pfPetal = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), lfPetalMat);
          pfPetal.position.set(Math.cos(pfAngle) * 0.03, 0.075, Math.sin(pfAngle) * 0.03);
          pfPetal.rotation.x = -Math.PI / 3;
          pfPetal.rotation.y = pfAngle;
          lilyFlowerGrp.add(pfPetal);
        }
        const lfCenter = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffee44 }));
        lfCenter.position.y = 0.08;
        lilyFlowerGrp.add(lfCenter);
        lilyPadCluster.add(lilyFlowerGrp);
      }
      const lpcX = (Math.random() - 0.5) * w * 0.75;
      const lpcZ = (Math.random() - 0.5) * d * 0.75;
      lilyPadCluster.position.set(lpcX, 0, lpcZ);
      mctx.scene.add(lilyPadCluster);
    }

    // ── Fog wisps (translucent elongated spheres) ──
    const fogWispMat = new THREE.MeshStandardMaterial({ color: 0x88aa77, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 18; i++) {
      const fogWisp = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + Math.random() * 0.8, 20, 16),
        fogWispMat,
      );
      fogWisp.scale.set(2 + Math.random() * 3, 0.3 + Math.random() * 0.3, 0.8 + Math.random() * 0.5);
      fogWisp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.3 + Math.random() * 1.5,
        (Math.random() - 0.5) * d * 0.8,
      );
      fogWisp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fogWisp);
    }

    // ── Rotting wooden dock/boardwalk planks with gaps ──
    for (let i = 0; i < 4; i++) {
      const dock = new THREE.Group();
      const dockLen = 8 + Math.floor(Math.random() * 6);
      // Support pilings
      for (let sp = 0; sp < 4; sp++) {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 12), plankMat);
        piling.position.set(sp % 2 === 0 ? -0.8 : 0.8, -0.4, sp < 2 ? -dockLen * 0.2 : dockLen * 0.2);
        piling.rotation.z = (Math.random() - 0.5) * 0.1;
        dock.add(piling);
      }
      // Planks with intentional gaps
      for (let dp = 0; dp < dockLen; dp++) {
        if (Math.random() > 0.15) {
          const dPlank = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.06, 0.22),
            Math.random() > 0.5 ? plankMat : new THREE.MeshStandardMaterial({ color: 0x5a4428, roughness: 0.95 }),
          );
          dPlank.position.set(0, 0.32, dp * 0.35 - dockLen * 0.175);
          dPlank.rotation.z = (Math.random() - 0.5) * 0.04;
          dPlank.position.y += (Math.random() - 0.5) * 0.05;
          dock.add(dPlank);
        }
        // Some broken planks hanging
        if (Math.random() > 0.85) {
          const brokenPlank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.2), plankMat);
          brokenPlank.position.set(0.5, 0.15, dp * 0.35 - dockLen * 0.175);
          brokenPlank.rotation.z = -0.6;
          dock.add(brokenPlank);
        }
      }
      // Side rails (partial)
      for (let sr = 0; sr < 2; sr++) {
        if (Math.random() > 0.3) {
          const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.8, 10), plankMat);
          railPost.position.set(-0.75, 0.7, -dockLen * 0.15 + sr * dockLen * 0.3);
          dock.add(railPost);
        }
      }
      const dkX = (Math.random() - 0.5) * w * 0.6;
      const dkZ = (Math.random() - 0.5) * d * 0.6;
      dock.position.set(dkX, 0.05, dkZ);
      dock.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(dock);
    }

    // ── Hanging moss strands (thin drooping cylinders from branches) ──
    for (let i = 0; i < 25; i++) {
      const mossCluster = new THREE.Group();
      const strandCount = 4 + Math.floor(Math.random() * 5);
      for (let ms = 0; ms < strandCount; ms++) {
        const mossLen = 0.8 + Math.random() * 2.5;
        const mossStrand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.015, mossLen, 8),
          hangingMossMat,
        );
        mossStrand.position.set((Math.random() - 0.5) * 0.6, -mossLen / 2, (Math.random() - 0.5) * 0.6);
        mossStrand.rotation.z = (Math.random() - 0.5) * 0.15;
        mossCluster.add(mossStrand);
        // Clumps along strand
        for (let cl = 0; cl < 2; cl++) {
          const clump = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 10, 8), hangingMossMat);
          clump.position.set(mossStrand.position.x, -mossLen * (0.3 + cl * 0.3), mossStrand.position.z);
          mossCluster.add(clump);
        }
      }
      const msX = (Math.random() - 0.5) * w * 0.8;
      const msZ = (Math.random() - 0.5) * d * 0.8;
      mossCluster.position.set(msX, 3 + Math.random() * 4, msZ);
      mctx.scene.add(mossCluster);
    }

    // ── Hanging vine curtains ──
    for (let i = 0; i < 15; i++) {
      const vineGroup = new THREE.Group();
      const vineCount = 3 + Math.floor(Math.random() * 4);
      for (let v = 0; v < vineCount; v++) {
        const vineH = 1.5 + Math.random() * 3;
        const vine = new THREE.Mesh(
          new THREE.PlaneGeometry(0.08, vineH),
          new THREE.MeshStandardMaterial({ color: 0x446622, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
        );
        vine.position.set((Math.random() - 0.5) * 0.5, -vineH / 2, (Math.random() - 0.5) * 0.5);
        vine.rotation.y = Math.random() * Math.PI;
        vineGroup.add(vine);
      }
      vineGroup.position.set(
        (Math.random() - 0.5) * w * 0.8,
        4 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(vineGroup);
    }

    // ── Sunken ruins ──
    for (let i = 0; i < 3; i++) {
      const ruin = new THREE.Group();
      // Box walls half submerged
      const wallH = 1.5 + Math.random() * 1.5;
      const ruinWall1 = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random(), wallH, 0.2), stoneMat);
      ruinWall1.position.y = wallH / 2 - 0.4; ruin.add(ruinWall1);
      const ruinWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallH * 0.8, 1.5), stoneMat);
      ruinWall2.position.set(-0.9, wallH * 0.4 - 0.4, 0.6); ruin.add(ruinWall2);
      // Broken arch segment
      const ruinArch = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.1, 10, 12, Math.PI * 0.6), stoneMat);
      ruinArch.position.set(0, wallH - 0.2, 0); ruin.add(ruinArch);
      // Foundation below waterline
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 2), stoneMat);
      foundation.position.y = -0.3; ruin.add(foundation);
      const rnX = (Math.random() - 0.5) * w * 0.6;
      const rnZ = (Math.random() - 0.5) * d * 0.6;
      ruin.position.set(rnX, getTerrainHeight(rnX, rnZ, 0.8) - 0.2, rnZ);
      ruin.rotation.y = Math.random() * Math.PI; mctx.scene.add(ruin);
    }

    // ── Will-o-wisp clusters ──
    for (let i = 0; i < 8; i++) {
      const wispCluster = new THREE.Group();
      const wispCount = 3 + Math.floor(Math.random() * 3);
      const wispColor = Math.random() > 0.5 ? 0x44ff88 : 0x4488ff;
      for (let w2 = 0; w2 < wispCount; w2++) {
        const wisp = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 12, 8),
          new THREE.MeshStandardMaterial({ color: wispColor, emissive: wispColor, emissiveIntensity: 2.0, transparent: true, opacity: 0.8 }),
        );
        wisp.position.set((Math.random() - 0.5) * 0.8, Math.random() * 1.5, (Math.random() - 0.5) * 0.8);
        wispCluster.add(wisp);
      }
      const wispLight = new THREE.PointLight(wispColor, 0.3, 5);
      wispLight.position.set(0, 0.5, 0); wispCluster.add(wispLight);
      const wcX = (Math.random() - 0.5) * w * 0.7;
      const wcZ = (Math.random() - 0.5) * d * 0.7;
      wispCluster.position.set(wcX, getTerrainHeight(wcX, wcZ, 0.8) + 0.3, wcZ);
      mctx.scene.add(wispCluster);
    }

    // ── Frog/toad props ──
    const frogMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const frog = new THREE.Group();
      const frogBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), frogMat);
      frog.add(frogBody);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), frogMat);
      eyeL.position.set(-0.03, 0.06, 0.03); frog.add(eyeL);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), frogMat);
      eyeR.position.set(0.03, 0.06, 0.03); frog.add(eyeR);
      const fX = (Math.random() - 0.5) * w * 0.7;
      const fZ = (Math.random() - 0.5) * d * 0.7;
      frog.position.set(fX, getTerrainHeight(fX, fZ, 0.8) + 0.06, fZ);
      frog.rotation.y = Math.random() * Math.PI; mctx.scene.add(frog);
    }

    // ── Fishing net remnants ──
    for (let i = 0; i < 4; i++) {
      const netGroup = new THREE.Group();
      const netW = 1.5 + Math.random();
      const netH = 1.0 + Math.random();
      // Grid of thin boxes forming net mesh
      for (let nx = 0; nx < 6; nx++) {
        const hLine = new THREE.Mesh(new THREE.BoxGeometry(netW, 0.01, 0.01), plankMat);
        hLine.position.y = nx * (netH / 6); netGroup.add(hLine);
      }
      for (let ny = 0; ny < 6; ny++) {
        const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.01, netH, 0.01), plankMat);
        vLine.position.set(-netW / 2 + ny * (netW / 6), netH / 2, 0); netGroup.add(vLine);
      }
      const ntX = (Math.random() - 0.5) * w * 0.6;
      const ntZ = (Math.random() - 0.5) * d * 0.6;
      netGroup.position.set(ntX, getTerrainHeight(ntX, ntZ, 0.8) + 1 + Math.random() * 2, ntZ);
      netGroup.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      mctx.scene.add(netGroup);
    }

    // ── Sunken rowboat ──
    for (let i = 0; i < 3; i++) {
      const boat = new THREE.Group();
      const hullLen = 1.5 + Math.random() * 0.5;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, hullLen), boatMat);
      hull.position.y = 0.1; boat.add(hull);
      // Curved sides
      for (const side of [-1, 1]) {
        const boatSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, hullLen * 0.9), boatMat);
        boatSide.position.set(side * 0.3, 0.2, 0);
        boatSide.rotation.z = side * 0.15; boat.add(boatSide);
      }
      // Oar
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), deadWoodMat);
      oar.position.set(0, 0.3, 0); oar.rotation.z = Math.PI / 2; boat.add(oar);
      // Water inside (translucent)
      const innerWater = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, hullLen * 0.7), waterMat);
      innerWater.position.y = 0.15; boat.add(innerWater);
      const btX = (Math.random() - 0.5) * w * 0.5;
      const btZ = (Math.random() - 0.5) * d * 0.5;
      boat.position.set(btX, getTerrainHeight(btX, btZ, 0.8) - 0.1, btZ);
      boat.rotation.y = Math.random() * Math.PI;
      boat.rotation.z = (Math.random() - 0.5) * 0.2; mctx.scene.add(boat);
    }

    // ── Mangrove root arches ──
    for (let i = 0; i < 6; i++) {
      const rootArch = new THREE.Group();
      const archCount = 2 + Math.floor(Math.random() * 3);
      for (let a = 0; a < archCount; a++) {
        const rootCurve = new THREE.Mesh(
          new THREE.TorusGeometry(0.5 + Math.random() * 0.4, 0.04, 8, 12, Math.PI),
          rootMat,
        );
        rootCurve.position.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
        rootCurve.rotation.y = Math.random() * Math.PI;
        rootArch.add(rootCurve);
      }
      // Hanging moss planes
      for (let m = 0; m < 2; m++) {
        const mossDrape = new THREE.Mesh(
          new THREE.PlaneGeometry(0.15, 0.4 + Math.random() * 0.3),
          hangingMossMat,
        );
        mossDrape.position.set((Math.random() - 0.5) * 0.5, 0.3, (Math.random() - 0.5) * 0.5);
        mossDrape.rotation.y = Math.random() * Math.PI;
        rootArch.add(mossDrape);
      }
      const raX = (Math.random() - 0.5) * w * 0.7;
      const raZ = (Math.random() - 0.5) * d * 0.7;
      rootArch.position.set(raX, getTerrainHeight(raX, raZ, 0.8) + 0.3, raZ);
      mctx.scene.add(rootArch);
    }

    // ── Swamp gas vents ──
    for (let i = 0; i < 5; i++) {
      const gasVent = new THREE.Group();
      const ventHole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), mudMat);
      ventHole.rotation.x = -Math.PI / 2; ventHole.position.y = 0.01; gasVent.add(ventHole);
      for (let g = 0; g < 3; g++) {
        const gasBubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x88cc66, transparent: true, opacity: 0.2, depthWrite: false }),
        );
        gasBubble.position.set((Math.random() - 0.5) * 0.2, 0.3 + g * 0.3, (Math.random() - 0.5) * 0.2);
        gasVent.add(gasBubble);
      }
      const gasLight = new THREE.PointLight(0x66aa44, 0.2, 4);
      gasLight.position.y = 0.5; gasVent.add(gasLight);
      const gvX = (Math.random() - 0.5) * w * 0.6;
      const gvZ = (Math.random() - 0.5) * d * 0.6;
      gasVent.position.set(gvX, getTerrainHeight(gvX, gvZ, 0.8), gvZ);
      mctx.scene.add(gasVent);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RIVERSIDE VILLAGE — peaceful hamlet with river, cottages, water mill
// ═══════════════════════════════════════════════════════════════════════════
export function buildRiversideVillage(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x99bbaa, 0.006);
    mctx.applyTerrainColors(0x3a7722, 0x55aa33, 1.2);
    mctx.dirLight.color.setHex(0xffeedd);
    mctx.dirLight.intensity = 1.5;
    mctx.ambientLight.color.setHex(0x446633);
    mctx.ambientLight.intensity = 0.6;
    mctx.hemiLight.color.setHex(0xaacc88);
    mctx.hemiLight.groundColor.setHex(0x445522);
    const hw = w / 2, hd = d / 2;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.8 });
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.9 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.75 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x44aa22, roughness: 0.5, transparent: true, opacity: 0.7 });
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.95 });

    // ── River (winding through the map) ──
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.92 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x3a5566, roughness: 0.4 });
    let rx = -hw * 0.4, rz = -hd * 0.5, rAngle = 0.8;
    for (let seg = 0; seg < 25; seg++) {
      rAngle += (Math.random() - 0.5) * 0.3;
      const segLen = 3 + Math.random() * 2;
      const nx = rx + Math.cos(rAngle) * segLen, nz = rz + Math.sin(rAngle) * segLen;
      const mx = (rx + nx) / 2, mz = (rz + nz) / 2;
      const ty = getTerrainHeight(mx, mz, 1.2);
      const sw = 2.5 + Math.sin(seg * 0.5) * 0.5;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(sw, segLen + 0.5), waterMat);
      water.rotation.x = -Math.PI / 2; water.rotation.z = -rAngle + Math.PI / 2;
      water.position.set(mx, ty + 0.02, mz); mctx.scene.add(water);
      const bed = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.6, segLen + 0.6), bedMat);
      bed.rotation.x = -Math.PI / 2; bed.rotation.z = -rAngle + Math.PI / 2;
      bed.position.set(mx, ty + 0.01, mz); mctx.scene.add(bed);
      for (const side of [-1, 1]) {
        const bOff = (sw / 2 + 0.3) * side;
        const bank = new THREE.Mesh(new THREE.PlaneGeometry(0.6, segLen), bankMat);
        bank.rotation.x = -Math.PI / 2; bank.rotation.z = -rAngle + Math.PI / 2;
        bank.position.set(mx + Math.sin(rAngle) * bOff, ty + 0.015, mz - Math.cos(rAngle) * bOff);
        mctx.scene.add(bank);
      }
      if (Math.random() > 0.6) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 1), stoneMat);
        rock.position.set(mx + (Math.random() - 0.5) * sw * 0.5, ty + 0.08, mz + (Math.random() - 0.5) * sw * 0.5);
        rock.scale.y = 0.5; mctx.scene.add(rock);
      }
      rx = nx; rz = nz;
    }

    // ── Stone bridge over river ──
    const bX = 0, bZ = 0;
    const bDeck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.35, 3.5), stoneMat);
    bDeck.position.set(bX, getTerrainHeight(bX, bZ, 1.2) + 1.0, bZ); mctx.scene.add(bDeck);
    for (const rz2 of [-1.6, 1.6]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 0.2), stoneMat);
      rail.position.set(bX, getTerrainHeight(bX, bZ, 1.2) + 1.5, bZ + rz2); mctx.scene.add(rail);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.2, 8, 16, Math.PI), stoneMat);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(bX, getTerrainHeight(bX, bZ, 1.2) + 0.1, bZ); mctx.scene.add(arch);
    // Brick lines on bridge
    for (let row = 0; row < 5; row++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(6.02, 0.02, 0.02), mortarMat);
      bl.position.set(bX, getTerrainHeight(bX, bZ, 1.2) + 1.2, bZ - 1.2 + row * 0.6);
      mctx.scene.add(bl);
    }

    // ── Cottages (8 small houses) ──
    const cottagePositions: [number, number][] = [
      [-20, -15], [-12, -20], [15, -18], [22, -10],
      [-18, 15], [-8, 22], [12, 20], [25, 12],
    ];
    const roofColors = [0x884433, 0x664422, 0x553311, 0xaa7744];
    for (let ci = 0; ci < cottagePositions.length; ci++) {
      const [cx, cz] = cottagePositions[ci];
      const cy = getTerrainHeight(cx, cz, 1.2);
      const ch = 2.5 + Math.random() * 1;
      const cw = 2.5 + Math.random(), cd = 2 + Math.random();
      // Walls with mortar
      const wall = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), wallMat);
      wall.position.set(cx, cy + ch / 2, cz); wall.castShadow = true; mctx.scene.add(wall);
      for (let row = 0; row < Math.floor(ch / 0.4); row++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.02, 0.015, 0.02), mortarMat);
        m.position.set(cx, cy + 0.2 + row * 0.4, cz + cd / 2 + 0.02); mctx.scene.add(m);
      }
      // Thatched roof
      const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[ci % roofColors.length], roughness: 0.85 });
      const roofH = 1.2 + Math.random() * 0.5;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(cw, cd) * 0.8, roofH, 4), roofMat);
      roof.position.set(cx, cy + ch + roofH / 2, cz); roof.rotation.y = Math.PI / 4; mctx.scene.add(roof);
      // Door
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x4a3218 }));
      door.position.set(cx, cy + 0.6, cz + cd / 2 + 0.02); mctx.scene.add(door);
      // Window
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 }));
      win.position.set(cx + cw * 0.3, cy + ch * 0.6, cz + cd / 2 + 0.02); mctx.scene.add(win);
      // Chimney
      if (ci % 2 === 0) {
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), stoneMat);
        chim.position.set(cx - cw * 0.3, cy + ch + roofH * 0.5, cz); mctx.scene.add(chim);
      }
    }

    // ── Water mill ──
    const wmX = 8, wmZ = -5;
    const wmY = getTerrainHeight(wmX, wmZ, 1.2);
    const wmBody = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 3), wallMat);
    wmBody.position.set(wmX, wmY + 2, wmZ); mctx.scene.add(wmBody);
    const wmRoof = new THREE.Mesh(new THREE.ConeGeometry(3, 2, 10), thatchMat);
    wmRoof.position.set(wmX, wmY + 5, wmZ); wmRoof.rotation.y = Math.PI / 4; mctx.scene.add(wmRoof);
    // Water wheel
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 8, 16), wheelMat);
    wheel.position.set(wmX + 2.2, wmY + 1.5, wmZ); wheel.rotation.y = Math.PI / 2; mctx.scene.add(wheel);
    for (let sp = 0; sp < 6; sp++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 0.06), wheelMat);
      spoke.position.set(wmX + 2.2, wmY + 1.5, wmZ);
      spoke.rotation.set(0, Math.PI / 2, (sp / 6) * Math.PI); mctx.scene.add(spoke);
    }
    // Mortar on mill
    for (let row = 0; row < 6; row++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4.02, 0.015, 0.02), mortarMat);
      m.position.set(wmX, wmY + 0.5 + row * 0.65, wmZ + 1.52); mctx.scene.add(m);
    }

    // ── Trees (20) ──
    for (let i = 0; i < 20; i++) {
      const tx = (Math.random() - 0.5) * w * 0.85, tz = (Math.random() - 0.5) * d * 0.85;
      const tH = 3 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, tH, 8), barkMat);
      trunk.position.set(tx, getTerrainHeight(tx, tz, 1.2) + tH / 2, tz); mctx.scene.add(trunk);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random(), 10, 8), leafMat);
      canopy.position.set(tx, getTerrainHeight(tx, tz, 1.2) + tH + 0.5, tz); mctx.scene.add(canopy);
    }

    // ── Fences (6 runs) ──
    for (let fi = 0; fi < 6; fi++) {
      const fGroup = new THREE.Group();
      const fLen = 5 + Math.floor(Math.random() * 5);
      for (let p = 0; p < fLen; p++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 12), fenceMat);
        post.position.set(p * 1.2, 0.4, 0); fGroup.add(post);
        if (p < fLen - 1) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.04), fenceMat);
          rail.position.set(p * 1.2 + 0.6, 0.6, 0); fGroup.add(rail);
          const rail2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.04), fenceMat);
          rail2.position.set(p * 1.2 + 0.6, 0.35, 0); fGroup.add(rail2);
        }
      }
      const fx = (Math.random() - 0.5) * w * 0.6, fz = (Math.random() - 0.5) * d * 0.6;
      fGroup.position.set(fx, getTerrainHeight(fx, fz, 1.2), fz);
      fGroup.rotation.y = Math.random() * Math.PI; mctx.scene.add(fGroup);
    }

    // ── Market stalls (4) ──
    const stallColors = [0xcc3333, 0x33cc33, 0x3333cc, 0xcccc33];
    for (let si = 0; si < 4; si++) {
      const sx = -6 + si * 4, sz = 8;
      const sy = getTerrainHeight(sx, sz, 1.2);
      // Posts
      for (const px of [-0.8, 0.8]) for (const pz of [-0.5, 0.5]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 12), woodMat);
        p.position.set(sx + px, sy + 1, sz + pz); mctx.scene.add(p);
      }
      // Awning
      const awning = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2),
        new THREE.MeshStandardMaterial({ color: stallColors[si], side: THREE.DoubleSide }));
      awning.position.set(sx, sy + 2, sz); awning.rotation.x = -0.2; mctx.scene.add(awning);
      // Counter
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.8), woodMat);
      counter.position.set(sx, sy + 0.9, sz); mctx.scene.add(counter);
    }

    // ── Hay bales ──
    for (let i = 0; i < 8; i++) {
      const hx = (Math.random() - 0.5) * w * 0.6, hz = (Math.random() - 0.5) * d * 0.6;
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 10), thatchMat);
      bale.rotation.z = Math.PI / 2;
      bale.position.set(hx, getTerrainHeight(hx, hz, 1.2) + 0.4, hz); mctx.scene.add(bale);
    }

    // ── Wildflowers ──
    const flowerColors = [0xff6688, 0xffdd44, 0xcc88ff, 0xff8844];
    for (let i = 0; i < 50; i++) {
      const fx = (Math.random() - 0.5) * w * 0.8, fz = (Math.random() - 0.5) * d * 0.8;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10),
        new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length] }));
      flower.position.set(fx, getTerrainHeight(fx, fz, 1.2) + 0.15, fz); mctx.scene.add(flower);
    }

    // ── Well in village center ──
    const wellY = getTerrainHeight(-3, -3, 1.2);
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.8, 12), stoneMat);
    wellBase.position.set(-3, wellY + 0.4, -3); mctx.scene.add(wellBase);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1, 0.8, 10), thatchMat);
    wellRoof.position.set(-3, wellY + 2, -3); wellRoof.rotation.y = Math.PI / 4; mctx.scene.add(wellRoof);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 12), woodMat);
      post.position.set(-3 + side * 0.6, wellY + 1.25, -3); mctx.scene.add(post);
    }

    // ── Building colliders ──
    mctx.buildingColliders = cottagePositions.map(([x, z]) => [x, z, 2, 2] as [number, number, number, number]);
    mctx.buildingColliders.push([wmX, wmZ, 3, 2.5]); // Mill
    mctx.buildingColliders.push([-3, -3, 1.2, 1.2]); // Well

    // ═══════════════════════════════════════════════════════════════════
    // ── ENHANCED DETAIL BELOW ──
    // ═══════════════════════════════════════════════════════════════════

    // ── Improved lighting ──
    mctx.scene.fog = new THREE.FogExp2(0x99bbaa, 0.004); // Less dense fog
    mctx.dirLight.intensity = 1.8;
    mctx.ambientLight.intensity = 0.75;

    // ── River detail: reeds along the banks ──
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.7 });
    const reedTopMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.6 });
    // Reset river walk for reed/lily placement
    let rrx = -hw * 0.4, rrz = -hd * 0.5, rrAngle = 0.8;
    for (let seg = 0; seg < 25; seg++) {
        rrAngle += (Math.random() - 0.5) * 0.3;
        const segLen = 3 + Math.random() * 2;
        const nnx = rrx + Math.cos(rrAngle) * segLen, nnz = rrz + Math.sin(rrAngle) * segLen;
        const mmx = (rrx + nnx) / 2, mmz = (rrz + nnz) / 2;
        const rty = getTerrainHeight(mmx, mmz, 0.5);
        const rsw = 2.5 + Math.sin(seg * 0.5) * 0.5;
        // Reeds on both banks
        for (const side of [-1, 1]) {
            if (Math.random() > 0.4) {
                const reedCount = 2 + Math.floor(Math.random() * 4);
                for (let r = 0; r < reedCount; r++) {
                    const reedH = 0.6 + Math.random() * 0.8;
                    const rOffX = mmx + Math.sin(rrAngle) * (rsw / 2 + 0.2 + Math.random() * 0.5) * side + (Math.random() - 0.5) * 0.3;
                    const rOffZ = mmz - Math.cos(rrAngle) * (rsw / 2 + 0.2 + Math.random() * 0.5) * side + (Math.random() - 0.5) * 0.3;
                    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, reedH, 4), reedMat);
                    reed.position.set(rOffX, getTerrainHeight(rOffX, rOffZ, 0.5) + reedH / 2, rOffZ);
                    reed.rotation.z = (Math.random() - 0.5) * 0.15;
                    mctx.scene.add(reed);
                    // Reed top tuft
                    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), reedTopMat);
                    tuft.position.set(rOffX, getTerrainHeight(rOffX, rOffZ, 0.5) + reedH + 0.02, rOffZ);
                    tuft.scale.set(1, 2, 1);
                    mctx.scene.add(tuft);
                }
            }
        }
        // Lily pads on the water surface
        if (Math.random() > 0.5) {
            const lilyCount = 1 + Math.floor(Math.random() * 3);
            for (let l = 0; l < lilyCount; l++) {
                const lx = mmx + (Math.random() - 0.5) * rsw * 0.6;
                const lz = mmz + (Math.random() - 0.5) * 1.0;
                const lilyPad = new THREE.Mesh(
                    new THREE.CircleGeometry(0.12 + Math.random() * 0.1, 8),
                    new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.4 })
                );
                lilyPad.rotation.x = -Math.PI / 2;
                lilyPad.position.set(lx, rty + 0.04, lz);
                mctx.scene.add(lilyPad);
                // Small flower on some lily pads
                if (Math.random() > 0.5) {
                    const lilyFlower = new THREE.Mesh(
                        new THREE.SphereGeometry(0.04, 6, 4),
                        new THREE.MeshStandardMaterial({ color: 0xffccee, emissive: 0x331111, emissiveIntensity: 0.3 })
                    );
                    lilyFlower.position.set(lx, rty + 0.07, lz);
                    mctx.scene.add(lilyFlower);
                }
            }
        }
        // Stepping stones in shallow areas
        if (seg === 8 || seg === 18) {
            const stoneCount = 4 + Math.floor(Math.random() * 3);
            for (let s = 0; s < stoneCount; s++) {
                const frac = s / (stoneCount - 1);
                const ssx = mmx + Math.sin(rrAngle) * (rsw * 0.9) * (frac - 0.5);
                const ssz = mmz - Math.cos(rrAngle) * (rsw * 0.9) * (frac - 0.5);
                const stepStone = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2 + Math.random() * 0.1, 0.25, 0.12, 6),
                    new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 })
                );
                stepStone.position.set(ssx, rty + 0.06, ssz);
                stepStone.rotation.y = Math.random() * Math.PI;
                mctx.scene.add(stepStone);
            }
        }
        rrx = nnx; rrz = nnz;
    }

    // ── Wooden dock / pier ──
    const dockX = -hw * 0.4 + 12, dockZ = -hd * 0.5 + 8;
    const dockY = getTerrainHeight(dockX, dockZ, 0.5);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.85 });
    // Pier platform extending over the water
    const pierLen = 5, pierW = 1.8;
    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(pierW, 0.1, pierLen), dockMat);
    pierDeck.position.set(dockX, dockY + 0.6, dockZ + pierLen / 2);
    mctx.scene.add(pierDeck);
    // Pier support pilings
    for (const px of [-0.7, 0.7]) {
        for (let pz = 0; pz < pierLen; pz += 1.5) {
            const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), dockMat);
            piling.position.set(dockX + px, dockY, dockZ + pz);
            mctx.scene.add(piling);
        }
    }
    // Mooring posts at end of pier
    for (const side of [-0.6, 0.6]) {
        const moorPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), dockMat);
        moorPost.position.set(dockX + side, dockY + 0.9, dockZ + pierLen - 0.3);
        mctx.scene.add(moorPost);
    }
    // Rope between mooring posts
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8B7D6B, roughness: 0.9 });
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.015, 4, 12, Math.PI), ropeMat);
    rope.position.set(dockX, dockY + 0.75, dockZ + pierLen - 0.3);
    rope.rotation.x = Math.PI / 2;
    mctx.scene.add(rope);

    // ── Fishing nets draped near dock ──
    const netMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    for (let ni = 0; ni < 3; ni++) {
        const netX = dockX + 2 + ni * 1.5, netZ = dockZ + 1;
        const netY = getTerrainHeight(netX, netZ, 0.5);
        // Net hung between two poles
        const poleA = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), woodMat);
        poleA.position.set(netX - 0.5, netY + 0.8, netZ);
        mctx.scene.add(poleA);
        const poleB = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), woodMat);
        poleB.position.set(netX + 0.5, netY + 0.8, netZ);
        mctx.scene.add(poleB);
        const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.2), netMat);
        netMesh.position.set(netX, netY + 0.9, netZ + 0.02);
        mctx.scene.add(netMesh);
    }

    // ── Additional cottages: burned/ruined buildings ──
    const ruinedWallMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.95 });
    const charredMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.95 });
    const extraCottages: [number, number, boolean][] = [
        [-25, 0, true], [28, -2, true], [-5, -25, false], [18, 25, false],
    ];
    for (const [ecx, ecz, ruined] of extraCottages) {
        const ecy = getTerrainHeight(ecx, ecz, 0.5);
        const ecw = 2.2 + Math.random() * 1.5;
        const ecd = 2 + Math.random() * 1.2;
        const ech = ruined ? 1.2 + Math.random() * 0.8 : 2.5 + Math.random() * 0.8;
        const wMat = ruined ? ruinedWallMat : wallMat;
        // Walls (ruined ones are shorter and jagged)
        const eWall = new THREE.Mesh(new THREE.BoxGeometry(ecw, ech, ecd), wMat);
        eWall.position.set(ecx, ecy + ech / 2, ecz);
        eWall.castShadow = true;
        mctx.scene.add(eWall);
        if (ruined) {
            // Charred beams sticking out
            for (let b = 0; b < 3; b++) {
                const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.5 + Math.random()), charredMat);
                beam.position.set(ecx + (Math.random() - 0.5) * ecw * 0.6, ecy + ech + 0.1, ecz + (Math.random() - 0.5) * ecd * 0.3);
                beam.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.8);
                mctx.scene.add(beam);
            }
            // Rubble around the ruin
            for (let r = 0; r < 6; r++) {
                const rubble = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15, 0),
                    new THREE.MeshStandardMaterial({ color: 0x555544 + Math.floor(Math.random() * 0x111111), roughness: 0.95 })
                );
                rubble.position.set(
                    ecx + (Math.random() - 0.5) * (ecw + 2),
                    ecy + 0.08,
                    ecz + (Math.random() - 0.5) * (ecd + 2)
                );
                mctx.scene.add(rubble);
            }
            // Scorch marks on ground
            const scorch = new THREE.Mesh(
                new THREE.CircleGeometry(1.5 + Math.random(), 8),
                new THREE.MeshStandardMaterial({ color: 0x1a1a11, roughness: 1 })
            );
            scorch.rotation.x = -Math.PI / 2;
            scorch.position.set(ecx, ecy + 0.01, ecz);
            mctx.scene.add(scorch);
        } else {
            // Intact roof
            const rH = 1.2 + Math.random() * 0.4;
            const eRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(ecw, ecd) * 0.8, rH, 4), thatchMat);
            eRoof.position.set(ecx, ecy + ech + rH / 2, ecz);
            eRoof.rotation.y = Math.PI / 4;
            mctx.scene.add(eRoof);
            // Door + window
            const eDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x4a3218 }));
            eDoor.position.set(ecx, ecy + 0.6, ecz + ecd / 2 + 0.02);
            mctx.scene.add(eDoor);
            const eWin = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 }));
            eWin.position.set(ecx + ecw * 0.3, ecy + ech * 0.6, ecz + ecd / 2 + 0.02);
            mctx.scene.add(eWin);
        }
        mctx.buildingColliders.push([ecx, ecz, ecw, ecd]);
    }

    // ── Small chapel with bell ──
    const chapX = 5, chapZ = -18;
    const chapY = getTerrainHeight(chapX, chapZ, 0.5);
    // Chapel body
    const chapBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4, 5), stoneMat);
    chapBody.position.set(chapX, chapY + 2, chapZ);
    chapBody.castShadow = true;
    mctx.scene.add(chapBody);
    // Chapel steep roof
    const chapRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.85 }));
    chapRoof.position.set(chapX, chapY + 5.25, chapZ);
    chapRoof.rotation.y = Math.PI / 4;
    mctx.scene.add(chapRoof);
    // Bell tower (small steeple on top)
    const steepleBase = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1), stoneMat);
    steepleBase.position.set(chapX, chapY + 6.5, chapZ);
    mctx.scene.add(steepleBase);
    const steepleRoof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.85 }));
    steepleRoof.position.set(chapX, chapY + 7.85, chapZ);
    steepleRoof.rotation.y = Math.PI / 4;
    mctx.scene.add(steepleRoof);
    // Bell inside steeple
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.6, roughness: 0.3 });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.7), bellMat);
    bell.position.set(chapX, chapY + 6.8, chapZ);
    mctx.scene.add(bell);
    // Chapel front door (arched)
    const chapDoor = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0x3a2010 }));
    chapDoor.position.set(chapX, chapY + 1, chapZ + 2.52);
    mctx.scene.add(chapDoor);
    // Circular window above door
    const roseWindow = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x6688cc, transparent: true, opacity: 0.6, emissive: 0x223344, emissiveIntensity: 0.3 })
    );
    roseWindow.position.set(chapX, chapY + 3.2, chapZ + 2.52);
    mctx.scene.add(roseWindow);
    // Cross on top
    const crossMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7 });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), crossMat);
    crossV.position.set(chapX, chapY + 8.7, chapZ);
    mctx.scene.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.08), crossMat);
    crossH.position.set(chapX, chapY + 8.6, chapZ);
    mctx.scene.add(crossH);
    mctx.buildingColliders.push([chapX, chapZ, 3, 4]);

    // ── Overturned carts ──
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
    const cartPositions: [number, number, number][] = [
        [-15, 5, 0.4], [10, 12, -0.6], [20, -20, 1.2],
    ];
    for (const [ccx, ccz, rot] of cartPositions) {
        const ccy = getTerrainHeight(ccx, ccz, 0.5);
        const cartGroup = new THREE.Group();
        // Cart bed
        const cartBed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1), cartMat);
        cartGroup.add(cartBed);
        // Cart sides
        const cartSide1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.06), cartMat);
        cartSide1.position.set(0, 0.2, 0.47);
        cartGroup.add(cartSide1);
        const cartSide2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.06), cartMat);
        cartSide2.position.set(0, 0.2, -0.47);
        cartGroup.add(cartSide2);
        const cartBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1), cartMat);
        cartBack.position.set(-0.87, 0.2, 0);
        cartGroup.add(cartBack);
        // Wheels
        for (const [wx, wz] of [[-0.6, 0.55], [-0.6, -0.55], [0.6, 0.55], [0.6, -0.55]] as [number, number][]) {
            const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 12), cartMat);
            wheel.position.set(wx, -0.05, wz);
            wheel.rotation.y = Math.PI / 2;
            cartGroup.add(wheel);
        }
        // Tip the cart over
        cartGroup.position.set(ccx, ccy + 0.5, ccz);
        cartGroup.rotation.set(0.8, rot, 0.3);
        mctx.scene.add(cartGroup);
    }

    // ── Broken barrels ──
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    const barrelBandMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.6 });
    const barrelPositions: [number, number, boolean][] = [
        [-10, 10, false], [-9, 10.5, true], [14, -8, false], [14.5, -7.5, true],
        [20, 15, false], [-20, -10, true], [0, 15, false],
    ];
    for (const [bbx, bbz, broken] of barrelPositions) {
        const bby = getTerrainHeight(bbx, bbz, 0.5);
        if (broken) {
            // Broken barrel on its side
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.7, 8), barrelMat);
            barrel.position.set(bbx, bby + 0.3, bbz);
            barrel.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            barrel.rotation.y = Math.random() * Math.PI;
            mctx.scene.add(barrel);
            // Spilled contents (dark puddle)
            const puddle = new THREE.Mesh(
                new THREE.CircleGeometry(0.4 + Math.random() * 0.3, 8),
                new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.3 })
            );
            puddle.rotation.x = -Math.PI / 2;
            puddle.position.set(bbx + 0.4, bby + 0.01, bbz);
            mctx.scene.add(puddle);
        } else {
            // Upright barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), barrelMat);
            barrel.position.set(bbx, bby + 0.4, bbz);
            mctx.scene.add(barrel);
            // Metal bands
            for (const bandY of [0.15, 0.45]) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.015, 4, 12), barrelBandMat);
                band.position.set(bbx, bby + bandY, bbz);
                band.rotation.x = Math.PI / 2;
                mctx.scene.add(band);
            }
        }
    }

    // ── Scattered tools and abandoned items ──
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.5 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
    // Pitchfork
    {
        const pfx = -14, pfz = 8;
        const pfy = getTerrainHeight(pfx, pfz, 0.5);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4), handleMat);
        handle.position.set(pfx, pfy + 0.2, pfz);
        handle.rotation.z = 1.2;
        mctx.scene.add(handle);
        for (let t = -1; t <= 1; t++) {
            const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), toolMat);
            tine.position.set(pfx + 0.7, pfy + 0.85 + t * 0.04, pfz + t * 0.06);
            tine.rotation.z = 1.2;
            mctx.scene.add(tine);
        }
    }
    // Shovel
    {
        const shx = 16, shz = 5;
        const shy = getTerrainHeight(shx, shz, 0.5);
        const shHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), handleMat);
        shHandle.position.set(shx, shy + 0.15, shz);
        shHandle.rotation.z = 1.4;
        mctx.scene.add(shHandle);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.02), toolMat);
        blade.position.set(shx + 0.65, shy + 0.9, shz);
        blade.rotation.z = 1.4;
        mctx.scene.add(blade);
    }
    // Bucket knocked over
    {
        const bkx = -4, bkz = -5;
        const bky = getTerrainHeight(bkx, bkz, 0.5);
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.35, 8, 1, true), woodMat);
        bucket.position.set(bkx, bky + 0.15, bkz);
        bucket.rotation.z = Math.PI / 2 + 0.3;
        mctx.scene.add(bucket);
        const bucketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 4, 8, Math.PI), toolMat);
        bucketHandle.position.set(bkx, bky + 0.2, bkz);
        bucketHandle.rotation.x = Math.PI / 4;
        mctx.scene.add(bucketHandle);
    }

    // ── Torn banners ──
    const bannerColors = [0x883322, 0x224488, 0x448833];
    const bannerPositions: [number, number][] = [[-8, -12], [12, 8], [-22, 18]];
    for (let bi = 0; bi < bannerPositions.length; bi++) {
        const [bnx, bnz] = bannerPositions[bi];
        const bny = getTerrainHeight(bnx, bnz, 0.5);
        // Banner pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 3, 6), woodMat);
        pole.position.set(bnx, bny + 1.5, bnz);
        mctx.scene.add(pole);
        // Torn banner cloth (plane with uneven look)
        const bannerCloth = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 1.2, 4, 4),
            new THREE.MeshStandardMaterial({ color: bannerColors[bi], roughness: 0.7, side: THREE.DoubleSide })
        );
        bannerCloth.position.set(bnx + 0.4, bny + 2.4, bnz);
        bannerCloth.rotation.y = Math.random() * 0.3;
        // Deform vertices to look torn
        const bannerGeo = bannerCloth.geometry as THREE.PlaneGeometry;
        const posArr = bannerGeo.attributes.position;
        for (let v = 0; v < posArr.count; v++) {
            const vy = posArr.getY(v);
            if (vy < -0.3) {
                posArr.setX(v, posArr.getX(v) + (Math.random() - 0.5) * 0.2);
                posArr.setY(v, posArr.getY(v) + (Math.random() - 0.5) * 0.15);
            }
        }
        posArr.needsUpdate = true;
        bannerGeo.computeVertexNormals();
        mctx.scene.add(bannerCloth);
    }

    // ── Willow trees along the river ──
    const willowPositions: [number, number][] = [
        [-hw * 0.35, -hd * 0.3], [-hw * 0.2, -hd * 0.1], [hw * 0.1, hd * 0.15],
        [hw * 0.25, hd * 0.3], [-hw * 0.05, hd * 0.05],
    ];
    const willowLeafMat = new THREE.MeshStandardMaterial({ color: 0x5a9a2a, roughness: 0.5, transparent: true, opacity: 0.55 });
    const willowBarkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a20, roughness: 0.95 });
    for (const [wtx, wtz] of willowPositions) {
        const wty = getTerrainHeight(wtx, wtz, 0.5);
        const trunkH = 3.5 + Math.random() * 1.5;
        // Thick trunk
        const wTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, trunkH, 8), willowBarkMat);
        wTrunk.position.set(wtx, wty + trunkH / 2, wtz);
        mctx.scene.add(wTrunk);
        // Canopy dome
        const wCanopy = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), willowLeafMat);
        wCanopy.position.set(wtx, wty + trunkH + 0.8, wtz);
        wCanopy.scale.y = 0.6;
        mctx.scene.add(wCanopy);
        // Drooping branches (hanging cylinders around the canopy edge)
        const branchCount = 12 + Math.floor(Math.random() * 8);
        for (let br = 0; br < branchCount; br++) {
            const angle = (br / branchCount) * Math.PI * 2 + Math.random() * 0.3;
            const dist = 1.5 + Math.random() * 0.8;
            const hangLen = 1.5 + Math.random() * 2;
            const bx = wtx + Math.cos(angle) * dist;
            const bz = wtz + Math.sin(angle) * dist;
            const droop = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.005, hangLen, 3),
                willowLeafMat
            );
            droop.position.set(bx, wty + trunkH + 0.5 - hangLen / 2, bz);
            mctx.scene.add(droop);
            // Small leaf clusters on drooping branches
            const leafCluster = new THREE.Mesh(
                new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 4, 3),
                willowLeafMat
            );
            leafCluster.position.set(bx, wty + trunkH - hangLen * 0.3, bz);
            mctx.scene.add(leafCluster);
        }
    }

    // ── Bushes and overgrown gardens ──
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a7a22, roughness: 0.6, transparent: true, opacity: 0.75 });
    const darkBushMat = new THREE.MeshStandardMaterial({ color: 0x2a5a18, roughness: 0.65, transparent: true, opacity: 0.7 });
    for (let bi2 = 0; bi2 < 30; bi2++) {
        const bsx = (Math.random() - 0.5) * w * 0.7;
        const bsz = (Math.random() - 0.5) * d * 0.7;
        const bsy = getTerrainHeight(bsx, bsz, 0.5);
        const bSize = 0.3 + Math.random() * 0.5;
        const bush = new THREE.Mesh(
            new THREE.SphereGeometry(bSize, 6, 5),
            Math.random() > 0.5 ? bushMat : darkBushMat
        );
        bush.position.set(bsx, bsy + bSize * 0.6, bsz);
        bush.scale.y = 0.6 + Math.random() * 0.3;
        mctx.scene.add(bush);
        // Berry clusters on some bushes
        if (Math.random() > 0.6) {
            for (let bb = 0; bb < 3; bb++) {
                const berry = new THREE.Mesh(
                    new THREE.SphereGeometry(0.04, 4, 4),
                    new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.4 })
                );
                berry.position.set(
                    bsx + (Math.random() - 0.5) * bSize,
                    bsy + bSize * 0.5 + Math.random() * bSize * 0.3,
                    bsz + (Math.random() - 0.5) * bSize
                );
                mctx.scene.add(berry);
            }
        }
    }

    // ── Cobblestone paths connecting buildings ──
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    const pathEdgeMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.95 });
    // Main dirt road through the village (E-W)
    for (let px = -hw * 0.7; px < hw * 0.7; px += 0.8) {
        const pz2 = -3 + Math.sin(px * 0.1) * 2; // Gentle curve
        const py = getTerrainHeight(px, pz2, 0.5);
        const pathSeg = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.5), pathMat);
        pathSeg.rotation.x = -Math.PI / 2;
        pathSeg.rotation.z = Math.sin(px * 0.1) * 0.1;
        pathSeg.position.set(px, py + 0.02, pz2);
        mctx.scene.add(pathSeg);
        // Cobblestone bumps
        if (Math.random() > 0.3) {
            const cobble = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.06, 0),
                pathMat
            );
            cobble.position.set(px + (Math.random() - 0.5) * 0.8, py + 0.03, pz2 + (Math.random() - 0.5) * 1);
            cobble.scale.y = 0.4;
            mctx.scene.add(cobble);
        }
    }
    // Paths branching to cottages
    const pathTargets: [number, number][] = [
        [-20, -15], [-12, -20], [15, -18], [-18, 15], [-8, 22], [12, 20],
    ];
    for (const [ptx, ptz] of pathTargets) {
        const steps = Math.floor(Math.sqrt(ptx * ptx + ptz * ptz) / 2);
        for (let s = 0; s < steps; s++) {
            const frac = s / steps;
            const spx = ptx * frac;
            const spz = -3 + (ptz + 3) * frac;
            const spy = getTerrainHeight(spx, spz, 0.5);
            const pathSeg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), pathMat);
            pathSeg.rotation.x = -Math.PI / 2;
            pathSeg.position.set(spx, spy + 0.02, spz);
            mctx.scene.add(pathSeg);
        }
    }

    // ── Ground fog patches ──
    const fogPatchMat = new THREE.MeshStandardMaterial({
        color: 0xccddcc, transparent: true, opacity: 0.15, roughness: 1, depthWrite: false,
    });
    for (let fi2 = 0; fi2 < 18; fi2++) {
        const fgx = (Math.random() - 0.5) * w * 0.8;
        const fgz = (Math.random() - 0.5) * d * 0.8;
        const fgy = getTerrainHeight(fgx, fgz, 0.5);
        const fogSize = 3 + Math.random() * 5;
        const fogPatch = new THREE.Mesh(new THREE.PlaneGeometry(fogSize, fogSize), fogPatchMat);
        fogPatch.rotation.x = -Math.PI / 2;
        fogPatch.position.set(fgx, fgy + 0.15 + Math.random() * 0.2, fgz);
        fogPatch.rotation.z = Math.random() * Math.PI;
        mctx.scene.add(fogPatch);
    }

    // ── Warm lantern lights scattered through village ──
    const lanternColors = [0xffaa44, 0xffcc66, 0xff9933, 0xffbb55];
    const lanternPositions: [number, number][] = [
        [-20, -15], [-12, -20], [15, -18], [22, -10],
        [-18, 15], [-8, 22], [12, 20], [25, 12],
        [bX - 2, bZ], [bX + 2, bZ], // Bridge lanterns
        [wmX, wmZ], // Mill
        [chapX, chapZ], // Chapel
        [-3, -3], // Well
        [dockX, dockZ + pierLen * 0.5], // Pier
    ];
    for (let li = 0; li < lanternPositions.length; li++) {
        const [llx, llz] = lanternPositions[li];
        const lly = getTerrainHeight(llx, llz, 0.5);
        const lanternLight = new THREE.PointLight(lanternColors[li % lanternColors.length], 1.2, 10, 1.5);
        lanternLight.position.set(llx, lly + 2.5, llz);
        mctx.scene.add(lanternLight);
        mctx.torchLights.push(lanternLight);
        // Lantern physical housing
        const lanternBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.25, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
        );
        lanternBody.position.set(llx, lly + 2.5, llz);
        mctx.scene.add(lanternBody);
        // Lantern glow core
        const lanternGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 4),
            new THREE.MeshStandardMaterial({ color: lanternColors[li % lanternColors.length], emissive: lanternColors[li % lanternColors.length], emissiveIntensity: 1.5 })
        );
        lanternGlow.position.set(llx, lly + 2.5, llz);
        mctx.scene.add(lanternGlow);
        // Lantern pole (except for bridge lanterns which sit on the railing)
        if (li >= 10) continue; // Skip poles for non-cottage lanterns
        const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 }));
        lanternPole.position.set(llx + 0.5, lly + 1.25, llz + 0.5);
        mctx.scene.add(lanternPole);
    }

    // ── Firefly-like motes ──
    const moteMat = new THREE.MeshStandardMaterial({
        color: 0xccff88, emissive: 0x88cc44, emissiveIntensity: 2.0, transparent: true, opacity: 0.6,
    });
    for (let mi = 0; mi < 40; mi++) {
        const mx2 = (Math.random() - 0.5) * w * 0.7;
        const mz2 = (Math.random() - 0.5) * d * 0.7;
        const my2 = getTerrainHeight(mx2, mz2, 0.5) + 0.5 + Math.random() * 2.5;
        const mote = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), moteMat);
        mote.position.set(mx2, my2, mz2);
        mctx.scene.add(mote);
    }

    // ── Crates and supply boxes near market area ──
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.85 });
    const cratePositions: [number, number, number][] = [
        [-7, 10, 0.5], [-6.5, 10.3, 0.4], [-7.2, 10.6, 0.35],
        [6, 9, 0.5], [6.3, 9.5, 0.4], [2, 9, 0.55],
    ];
    for (const [crx, crz, crSize] of cratePositions) {
        const cry = getTerrainHeight(crx, crz, 0.5);
        const crate = new THREE.Mesh(new THREE.BoxGeometry(crSize, crSize, crSize), crateMat);
        crate.position.set(crx, cry + crSize / 2, crz);
        crate.rotation.y = Math.random() * 0.5;
        mctx.scene.add(crate);
        // Crate lid line
        const lidLine = new THREE.Mesh(new THREE.BoxGeometry(crSize + 0.02, 0.02, 0.02), woodMat);
        lidLine.position.set(crx, cry + crSize, crz);
        mctx.scene.add(lidLine);
    }

    // ── Signpost at village entrance ──
    {
        const spx = -hw * 0.5, spz2 = -3;
        const spy = getTerrainHeight(spx, spz2, 0.5);
        const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 6), woodMat);
        signPole.position.set(spx, spy + 1.25, spz2);
        mctx.scene.add(signPole);
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.04), woodMat);
        signBoard.position.set(spx + 0.3, spy + 2.2, spz2);
        mctx.scene.add(signBoard);
        // Sign text backing
        const signText = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.25),
            new THREE.MeshStandardMaterial({ color: 0x222211 })
        );
        signText.position.set(spx + 0.3, spy + 2.2, spz2 + 0.025);
        mctx.scene.add(signText);
    }

    // ── Stone well detail: bucket and rope ──
    {
        const wellRopeY = getTerrainHeight(-3, -3, 0.5);
        const wellRope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 4), ropeMat);
        wellRope.position.set(-3, wellRopeY + 1.2, -3);
        mctx.scene.add(wellRope);
        const wellBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 6, 1, true), toolMat);
        wellBucket.position.set(-3, wellRopeY + 0.5, -3);
        mctx.scene.add(wellBucket);
    }

    // ── River rocks and boulders along the bank ──
    for (let ri = 0; ri < 20; ri++) {
        const rkx = (Math.random() - 0.5) * w * 0.4;
        const rkz = (Math.random() - 0.5) * d * 0.4;
        const rky = getTerrainHeight(rkx, rkz, 0.5);
        const rockSize = 0.1 + Math.random() * 0.3;
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rockSize, 1),
            new THREE.MeshStandardMaterial({ color: 0x777766 + Math.floor(Math.random() * 0x111111), roughness: 0.9 })
        );
        rock.position.set(rkx, rky + rockSize * 0.3, rkz);
        rock.scale.y = 0.5 + Math.random() * 0.3;
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        mctx.scene.add(rock);
    }

    // ── Clothesline between cottages ──
    {
        const cl1x = -20, cl1z = -15, cl2x = -12, cl2z = -20;
        const cl1y = getTerrainHeight(cl1x, cl1z, 0.5);
        const cl2y = getTerrainHeight(cl2x, cl2z, 0.5);
        const clY = Math.max(cl1y, cl2y) + 2.5;
        // Rope line
        const clLen = Math.sqrt((cl2x - cl1x) ** 2 + (cl2z - cl1z) ** 2);
        const clAngle = Math.atan2(cl2z - cl1z, cl2x - cl1x);
        const clRope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, clLen, 3), ropeMat);
        clRope.position.set((cl1x + cl2x) / 2, clY, (cl1z + cl2z) / 2);
        clRope.rotation.z = Math.PI / 2;
        clRope.rotation.y = -clAngle;
        mctx.scene.add(clRope);
        // Hanging clothes
        const clothColors = [0xeeeeee, 0x8899aa, 0xaa7755, 0xddccbb];
        for (let ci2 = 0; ci2 < 4; ci2++) {
            const frac2 = 0.2 + ci2 * 0.2;
            const cx2 = cl1x + (cl2x - cl1x) * frac2;
            const cz2 = cl1z + (cl2z - cl1z) * frac2;
            const cloth = new THREE.Mesh(
                new THREE.PlaneGeometry(0.4, 0.5 + Math.random() * 0.3),
                new THREE.MeshStandardMaterial({ color: clothColors[ci2], side: THREE.DoubleSide, roughness: 0.8 })
            );
            cloth.position.set(cx2, clY - 0.3, cz2);
            cloth.rotation.y = clAngle + Math.PI / 2;
            mctx.scene.add(cloth);
        }
    }

    // ── Stacked firewood near cottages ──
    const firewoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    const woodPilePositions: [number, number][] = [[-21, -14], [16, -17], [-19, 16], [13, 21]];
    for (const [wpx, wpz] of woodPilePositions) {
        const wpy = getTerrainHeight(wpx, wpz, 0.5);
        for (let row2 = 0; row2 < 3; row2++) {
            for (let col = 0; col < 4 - row2; col++) {
                const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 5), firewoodMat);
                log.rotation.z = Math.PI / 2;
                log.position.set(wpx, wpy + 0.08 + row2 * 0.15, wpz + col * 0.18 - 0.3);
                mctx.scene.add(log);
            }
        }
    }

    // ── Grave markers behind the chapel ──
    const graveMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.95 });
    for (let gi = 0; gi < 5; gi++) {
        const gx = chapX - 2 + gi * 1;
        const gz = chapZ - 4;
        const gy = getTerrainHeight(gx, gz, 0.5);
        // Headstone
        const headstone = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6 + Math.random() * 0.3, 0.08), graveMat);
        headstone.position.set(gx, gy + 0.3, gz);
        headstone.rotation.y = (Math.random() - 0.5) * 0.15;
        mctx.scene.add(headstone);
        // Small mound
        const mound = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.95 })
        );
        mound.position.set(gx, gy, gz + 0.4);
        mound.scale.set(1, 0.3, 1.5);
        mctx.scene.add(mound);
    }

    // ── Abandoned boat near the river ──
    {
        const boatX = -hw * 0.3, boatZ = -hd * 0.2;
        const boatY = getTerrainHeight(boatX, boatZ, 0.5);
        const boatMat2 = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
        // Hull (elongated box, tilted)
        const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 2.5), boatMat2);
        hull.position.set(boatX, boatY + 0.2, boatZ);
        hull.rotation.z = 0.15;
        hull.rotation.y = 0.4;
        mctx.scene.add(hull);
        // Boat sides
        for (const side2 of [-1, 1]) {
            const boatSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 2.5), boatMat2);
            boatSide.position.set(boatX + side2 * 0.57, boatY + 0.35, boatZ);
            boatSide.rotation.z = 0.15 - side2 * 0.1;
            boatSide.rotation.y = 0.4;
            mctx.scene.add(boatSide);
        }
        // Oar lying nearby
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 4), woodMat);
        oar.position.set(boatX + 1, boatY + 0.1, boatZ + 0.5);
        oar.rotation.z = Math.PI / 2;
        oar.rotation.y = 0.3;
        mctx.scene.add(oar);
        const oarBlade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.3), woodMat);
        oarBlade.position.set(boatX + 1.9, boatY + 0.1, boatZ + 0.5);
        mctx.scene.add(oarBlade);
    }

    // ── Moss patches on buildings and rocks ──
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 0.9, transparent: true, opacity: 0.6 });
    for (let mi2 = 0; mi2 < 15; mi2++) {
        const [mcx, mcz] = cottagePositions[mi2 % cottagePositions.length];
        const mcy = getTerrainHeight(mcx, mcz, 0.5);
        const moss = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 0.3 + Math.random() * 0.3), mossMat);
        const mSide = Math.random() > 0.5 ? 1 : -1;
        moss.position.set(mcx + mSide * 1.3, mcy + Math.random() * 1.5, mcz + (Math.random() - 0.5) * 2);
        moss.rotation.y = mSide > 0 ? Math.PI / 2 : -Math.PI / 2;
        mctx.scene.add(moss);
    }

    // ── Water splash particles near the water mill wheel ──
    const splashMat = new THREE.MeshStandardMaterial({
        color: 0xaaddee, transparent: true, opacity: 0.4, emissive: 0x224455, emissiveIntensity: 0.2,
    });
    for (let si2 = 0; si2 < 12; si2++) {
        const splash = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 4, 3), splashMat);
        splash.position.set(
            wmX + 2.2 + (Math.random() - 0.5) * 0.5,
            wmY + 0.3 + Math.random() * 0.8,
            wmZ + (Math.random() - 0.5) * 0.4
        );
        mctx.scene.add(splash);
    }
}

