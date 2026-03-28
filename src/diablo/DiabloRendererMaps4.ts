import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { VendorType } from './DiabloTypes';
import { VENDOR_DEFS } from './DiabloConfig';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildCrystalCaverns(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x223344, 0.02);
    mctx.applyTerrainColors(0x2a2a3a, 0x3a3a4a, 0.6);
    mctx.dirLight.color.setHex(0x6677aa);
    mctx.dirLight.intensity = 0.3;
    mctx.ambientLight.color.setHex(0x334466);
    mctx.ambientLight.intensity = 0.3;
    mctx.hemiLight.color.setHex(0x445577);
    mctx.hemiLight.groundColor.setHex(0x222233);

    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.9 });
    const caveStoneMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.85 });
    const caveMossMat = new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.9, side: THREE.DoubleSide });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.8 });
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.7, metalness: 0.3 });
    const streamMat = new THREE.MeshStandardMaterial({ color: 0x3355aa, roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    const dripMat = new THREE.MeshStandardMaterial({ color: 0x88aadd, roughness: 0.1, transparent: true, opacity: 0.5 });
    const batMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const crystalColors = [
      { color: 0x44ffee, emissive: 0x22ddcc },
      { color: 0xaa44ff, emissive: 0x8822dd },
      { color: 0xff66aa, emissive: 0xdd4488 },
      { color: 0xffffff, emissive: 0xcccccc },
      { color: 0xffdd44, emissive: 0xddbb22 },
    ];

    // ── Crystal formations (large + small, with glow) ──
    for (let i = 0; i < 55; i++) {
      const cluster = new THREE.Group();
      const crystalCount = 1 + Math.floor(Math.random() * 4);
      const colorChoice = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const crystMat = new THREE.MeshStandardMaterial({
        color: colorChoice.color,
        emissive: colorChoice.emissive,
        emissiveIntensity: 0.5 + Math.random() * 0.5,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.75,
      });
      for (let c = 0; c < crystalCount; c++) {
        const cH = 0.5 + Math.random() * 3;
        const cR = 0.1 + Math.random() * 0.4;
        const crystal = new THREE.Mesh(
          new THREE.ConeGeometry(cR, cH, 20),
          crystMat,
        );
        crystal.position.set(
          (Math.random() - 0.5) * 1.5,
          cH / 2,
          (Math.random() - 0.5) * 1.5,
        );
        crystal.rotation.z = (Math.random() - 0.5) * 0.3;
        crystal.rotation.x = (Math.random() - 0.5) * 0.3;
        cluster.add(crystal);
      }
      // Point light for glow
      if (Math.random() > 0.4) {
        const cLight = new THREE.PointLight(colorChoice.color, 0.5 + Math.random() * 0.5, 6);
        cLight.position.set(0, 1, 0);
        cluster.add(cLight);
        mctx.torchLights.push(cLight);
      }
      const cx = (Math.random() - 0.5) * w * 0.9;
      const cz = (Math.random() - 0.5) * d * 0.9;
      cluster.position.set(cx, getTerrainHeight(cx, cz, 0.6), cz);
      mctx.scene.add(cluster);
    }

    // ── Stalactites (hanging from ceiling) ──
    for (let i = 0; i < 25; i++) {
      const stalH = 1 + Math.random() * 3;
      const stalR = 0.15 + Math.random() * 0.3;
      const stalactite = new THREE.Mesh(
        new THREE.ConeGeometry(stalR, stalH, 20),
        darkStoneMat,
      );
      stalactite.rotation.x = Math.PI; // Inverted
      stalactite.position.set(
        (Math.random() - 0.5) * w * 0.85,
        8 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.85,
      );
      mctx.scene.add(stalactite);
    }

    // ── Stalagmites (rising from ground) ──
    for (let i = 0; i < 28; i++) {
      const stagH = 0.5 + Math.random() * 2.5;
      const stagR = 0.15 + Math.random() * 0.4;
      const stalagmite = new THREE.Mesh(
        new THREE.ConeGeometry(stagR, stagH, 20),
        caveStoneMat,
      );
      const stX = (Math.random() - 0.5) * w * 0.85;
      const stZ = (Math.random() - 0.5) * d * 0.85;
      stalagmite.position.set(stX, getTerrainHeight(stX, stZ, 0.6) + stagH / 2, stZ);
      mctx.scene.add(stalagmite);
    }

    // ── Glowing crystal pools ──
    for (let i = 0; i < 16; i++) {
      const poolR = 1.5 + Math.random() * 3;
      const poolColor = Math.random() > 0.5 ? 0x4466cc : 0x7744aa;
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(poolR, 16),
        new THREE.MeshStandardMaterial({ color: poolColor, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }),
      );
      pool.rotation.x = -Math.PI / 2;
      const px = (Math.random() - 0.5) * w * 0.75;
      const pz = (Math.random() - 0.5) * d * 0.75;
      pool.position.set(px, 0.02, pz);
      mctx.scene.add(pool);
      const poolLight = new THREE.PointLight(poolColor, 0.6, 5);
      poolLight.position.set(px, -0.2, pz);
      mctx.scene.add(poolLight);
      mctx.torchLights.push(poolLight);
    }

    // ── Rock pillars (floor to ceiling) ──
    for (let i = 0; i < 14; i++) {
      const pillarH = 10 + Math.random() * 4;
      const pillarR = 0.5 + Math.random() * 1;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(pillarR * 0.7, pillarR, pillarH, 12),
        darkStoneMat,
      );
      const piX = (Math.random() - 0.5) * w * 0.8;
      const piZ = (Math.random() - 0.5) * d * 0.8;
      pillar.position.set(piX, pillarH / 2, piZ);
      mctx.scene.add(pillar);
    }

    // ── Scattered gemstones ──
    const gemColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
    for (let i = 0; i < 22; i++) {
      const gemColor = gemColors[Math.floor(Math.random() * gemColors.length)];
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 23, 17),
        new THREE.MeshStandardMaterial({ color: gemColor, emissive: gemColor, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.1 }),
      );
      const gx = (Math.random() - 0.5) * w * 0.85;
      const gz = (Math.random() - 0.5) * d * 0.85;
      gem.position.set(gx, getTerrainHeight(gx, gz, 0.6) + 0.05, gz);
      mctx.scene.add(gem);
    }

    // ── Crystal bridges ──
    for (let i = 0; i < 9; i++) {
      const bLen = 4 + Math.random() * 6;
      const colorChoice = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.3, bLen),
        new THREE.MeshStandardMaterial({
          color: colorChoice.color,
          emissive: colorChoice.emissive,
          emissiveIntensity: 0.3,
          roughness: 0.15,
          metalness: 0.3,
          transparent: true,
          opacity: 0.6,
        }),
      );
      bridge.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0.8 + Math.random() * 2,
        (Math.random() - 0.5) * d * 0.6,
      );
      bridge.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(bridge);
    }

    // ── Cave moss patches ──
    for (let i = 0; i < 18; i++) {
      const mossSize = 1 + Math.random() * 3;
      const moss = new THREE.Mesh(
        new THREE.PlaneGeometry(mossSize, mossSize),
        caveMossMat,
      );
      moss.rotation.x = -Math.PI / 2;
      const moX = (Math.random() - 0.5) * w * 0.85;
      const moZ = (Math.random() - 0.5) * d * 0.85;
      moss.position.set(moX, getTerrainHeight(moX, moZ, 0.6) + 0.02, moZ);
      mctx.scene.add(moss);
    }

    // ── Dripping water features ──
    for (let i = 0; i < 8; i++) {
      const dripH = 3 + Math.random() * 5;
      const drip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, dripH, 16),
        dripMat,
      );
      drip.position.set(
        (Math.random() - 0.5) * w * 0.75,
        8 + Math.random() * 2,
        (Math.random() - 0.5) * d * 0.75,
      );
      mctx.scene.add(drip);
    }

    // ── Minecart rails and carts ──
    for (let i = 0; i < 12; i++) {
      const railGroup = new THREE.Group();
      const railLen = 3 + Math.random() * 6;
      // Left rail
      const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, railLen), railMat);
      leftRail.position.set(-0.3, 0.05, 0);
      railGroup.add(leftRail);
      // Right rail
      const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, railLen), railMat);
      rightRail.position.set(0.3, 0.05, 0);
      railGroup.add(rightRail);
      // Cross ties
      const tieCount = Math.floor(railLen / 0.5);
      for (let t = 0; t < tieCount; t++) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.1), railMat);
        tie.position.set(0, 0.02, -railLen / 2 + t * 0.5 + 0.25);
        railGroup.add(tie);
      }
      const rX = (Math.random() - 0.5) * w * 0.7;
      const rZ = (Math.random() - 0.5) * d * 0.7;
      railGroup.position.set(rX, getTerrainHeight(rX, rZ, 0.6), rZ);
      railGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(railGroup);
      // Occasional cart
      if (i < 4) {
        const cart = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), cartMat);
        cart.position.set(rX, getTerrainHeight(rX, rZ, 0.6) + 0.25, rZ);
        cart.rotation.y = railGroup.rotation.y;
        mctx.scene.add(cart);
      }
    }

    // ── Underground streams ──
    for (let i = 0; i < 5; i++) {
      const streamLen = 15 + Math.random() * 20;
      const stream = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5 + Math.random() * 1.5, streamLen),
        streamMat,
      );
      stream.rotation.x = -Math.PI / 2;
      stream.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0.03,
        (Math.random() - 0.5) * d * 0.6,
      );
      stream.rotation.z = Math.random() * Math.PI;
      mctx.scene.add(stream);
    }

    // ── Bat nesting areas ──
    for (let i = 0; i < 10; i++) {
      const batCluster = new THREE.Group();
      const batCount = 3 + Math.floor(Math.random() * 6);
      for (let b = 0; b < batCount; b++) {
        const bat = new THREE.Mesh(
          new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 17, 16),
          batMat,
        );
        bat.position.set(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1.5,
        );
        batCluster.add(bat);
      }
      batCluster.position.set(
        (Math.random() - 0.5) * w * 0.8,
        9 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(batCluster);
    }

    // ── Loose boulder clusters ──
    for (let i = 0; i < 18; i++) {
      const boulderGroup = new THREE.Group();
      const cnt = 1 + Math.floor(Math.random() * 3);
      for (let b = 0; b < cnt; b++) {
        const bR = 0.3 + Math.random() * 0.8;
        const boulder = new THREE.Mesh(
          new THREE.DodecahedronGeometry(bR, 2),
          darkStoneMat,
        );
        boulder.scale.set(0.7 + Math.random() * 0.6, 0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.6);
        boulder.position.set((Math.random() - 0.5) * 2, bR * 0.3, (Math.random() - 0.5) * 2);
        boulderGroup.add(boulder);
      }
      const bgX = (Math.random() - 0.5) * w * 0.85;
      const bgZ = (Math.random() - 0.5) * d * 0.85;
      boulderGroup.position.set(bgX, getTerrainHeight(bgX, bgZ, 0.6), bgZ);
      mctx.scene.add(boulderGroup);
    }

    // ── Massive crystal clusters (varying colors, multi-shard formations) ──
    for (let i = 0; i < 20; i++) {
      const megaCluster = new THREE.Group();
      const shardCount = 5 + Math.floor(Math.random() * 8);
      const clrChoice = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const megaCrystMat = new THREE.MeshStandardMaterial({
        color: clrChoice.color,
        emissive: clrChoice.emissive,
        emissiveIntensity: 0.6 + Math.random() * 0.6,
        roughness: 0.05,
        metalness: 0.4,
        transparent: true,
        opacity: 0.7,
      });
      for (let s = 0; s < shardCount; s++) {
        const sH = 1 + Math.random() * 5;
        const sR = 0.15 + Math.random() * 0.6;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(sR, sH, 10), megaCrystMat);
        shard.position.set(
          (Math.random() - 0.5) * 3,
          sH / 2,
          (Math.random() - 0.5) * 3,
        );
        shard.rotation.z = (Math.random() - 0.5) * 0.5;
        shard.rotation.x = (Math.random() - 0.5) * 0.5;
        megaCluster.add(shard);
      }
      // Strong glow light
      const clusterLight = new THREE.PointLight(clrChoice.color, 0.8 + Math.random() * 0.5, 10);
      clusterLight.position.set(0, 2, 0);
      megaCluster.add(clusterLight);
      mctx.torchLights.push(clusterLight);
      const mcx = (Math.random() - 0.5) * w * 0.85;
      const mcz = (Math.random() - 0.5) * d * 0.85;
      megaCluster.position.set(mcx, getTerrainHeight(mcx, mcz, 0.6), mcz);
      mctx.scene.add(megaCluster);
    }

    // ── Bioluminescent mushroom gardens ──
    const bioMushroomColors = [
      { cap: 0x44ddff, glow: 0x22bbdd },
      { cap: 0x88ff44, glow: 0x66dd22 },
      { cap: 0xff88dd, glow: 0xdd66bb },
      { cap: 0xffaa22, glow: 0xdd8800 },
    ];
    for (let i = 0; i < 30; i++) {
      const mushGroup = new THREE.Group();
      const mushColor = bioMushroomColors[Math.floor(Math.random() * bioMushroomColors.length)];
      const mushCount = 2 + Math.floor(Math.random() * 5);
      for (let m = 0; m < mushCount; m++) {
        const mStemH = 0.15 + Math.random() * 0.5;
        const mCapR = 0.08 + Math.random() * 0.2;
        // Stem
        const mStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.035, mStemH, 10),
          new THREE.MeshStandardMaterial({ color: 0xbbbbaa, emissive: mushColor.glow, emissiveIntensity: 0.15, roughness: 0.6 }),
        );
        mStem.position.set((Math.random() - 0.5) * 0.5, mStemH / 2, (Math.random() - 0.5) * 0.5);
        mushGroup.add(mStem);
        // Cap
        const mCap = new THREE.Mesh(
          new THREE.SphereGeometry(mCapR, 27, 20, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({
            color: mushColor.cap,
            emissive: mushColor.glow,
            emissiveIntensity: 0.9,
            roughness: 0.2,
            transparent: true,
            opacity: 0.85,
          }),
        );
        mCap.position.set(mStem.position.x, mStemH, mStem.position.z);
        mushGroup.add(mCap);
        // Gills under cap (ring)
        const gills = new THREE.Mesh(
          new THREE.RingGeometry(mCapR * 0.3, mCapR * 0.9, 16),
          new THREE.MeshStandardMaterial({ color: mushColor.glow, emissive: mushColor.glow, emissiveIntensity: 0.5, side: THREE.DoubleSide }),
        );
        gills.rotation.x = Math.PI / 2;
        gills.position.set(mStem.position.x, mStemH - 0.01, mStem.position.z);
        mushGroup.add(gills);
      }
      // Glow light
      const mushLight = new THREE.PointLight(mushColor.glow, 0.4, 5);
      mushLight.position.set(0, 0.3, 0);
      mushGroup.add(mushLight);
      mctx.torchLights.push(mushLight);
      const mgx = (Math.random() - 0.5) * w * 0.85;
      const mgz = (Math.random() - 0.5) * d * 0.85;
      mushGroup.position.set(mgx, getTerrainHeight(mgx, mgz, 0.6), mgz);
      mctx.scene.add(mushGroup);
    }

    // ── Geode formations (hollow rock with crystal interior) ──
    for (let i = 0; i < 8; i++) {
      const geode = new THREE.Group();
      const geodeR = 1 + Math.random() * 1.5;
      // Outer rock shell (half sphere)
      const outerShell = new THREE.Mesh(
        new THREE.SphereGeometry(geodeR, 27, 23, 0, Math.PI * 2, 0, Math.PI / 2),
        darkStoneMat,
      );
      outerShell.rotation.x = Math.PI;
      outerShell.position.y = geodeR * 0.3;
      geode.add(outerShell);
      // Inner crystal lining
      const geodeCrystColor = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const innerShell = new THREE.Mesh(
        new THREE.SphereGeometry(geodeR * 0.85, 27, 23, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: geodeCrystColor.color,
          emissive: geodeCrystColor.emissive,
          emissiveIntensity: 0.7,
          roughness: 0.1,
          metalness: 0.4,
          side: THREE.DoubleSide,
        }),
      );
      innerShell.rotation.x = Math.PI;
      innerShell.position.y = geodeR * 0.3;
      geode.add(innerShell);
      // Mini crystals inside geode
      for (let c = 0; c < 6; c++) {
        const miniCryst = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.3 + Math.random() * 0.3, 17),
          new THREE.MeshStandardMaterial({
            color: geodeCrystColor.color,
            emissive: geodeCrystColor.emissive,
            emissiveIntensity: 0.8,
            roughness: 0.05,
          }),
        );
        const cAng = Math.random() * Math.PI * 2;
        const cDist = geodeR * 0.4 * Math.random();
        miniCryst.position.set(Math.cos(cAng) * cDist, geodeR * 0.35, Math.sin(cAng) * cDist);
        miniCryst.rotation.x = Math.PI;
        miniCryst.rotation.z = (Math.random() - 0.5) * 0.4;
        geode.add(miniCryst);
      }
      // Geode glow
      const geodeLight = new THREE.PointLight(geodeCrystColor.color, 0.6, 6);
      geodeLight.position.set(0, geodeR * 0.4, 0);
      geode.add(geodeLight);
      mctx.torchLights.push(geodeLight);
      const gdx = (Math.random() - 0.5) * w * 0.75;
      const gdz = (Math.random() - 0.5) * d * 0.75;
      geode.position.set(gdx, getTerrainHeight(gdx, gdz, 0.6), gdz);
      geode.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(geode);
    }

    // ── Mineral veins on ground (colored streaks) ──
    const veinColors = [0x886633, 0xaaaa44, 0x6688aa, 0x884488, 0xcc6633];
    for (let i = 0; i < 20; i++) {
      const veinColor = veinColors[Math.floor(Math.random() * veinColors.length)];
      const veinLen = 3 + Math.random() * 6;
      const vein = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 + Math.random() * 0.1, 0.02, veinLen),
        new THREE.MeshStandardMaterial({ color: veinColor, roughness: 0.4, metalness: 0.5, emissive: veinColor, emissiveIntensity: 0.15 }),
      );
      const vx = (Math.random() - 0.5) * w * 0.85;
      const vz = (Math.random() - 0.5) * d * 0.85;
      vein.position.set(vx, getTerrainHeight(vx, vz, 0.6) + 0.01, vz);
      vein.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(vein);
    }

    // ── Dripping water pools (ground level puddles with ripple rings) ──
    for (let i = 0; i < 12; i++) {
      const dripPool = new THREE.Group();
      const poolR = 0.5 + Math.random() * 1;
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(poolR, 16),
        new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5 }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.01;
      dripPool.add(pool);
      // Ripple rings
      for (let r = 0; r < 3; r++) {
        const ripple = new THREE.Mesh(
          new THREE.RingGeometry(poolR * (0.3 + r * 0.2), poolR * (0.35 + r * 0.2), 20),
          new THREE.MeshStandardMaterial({ color: 0x6688cc, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
        );
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.y = 0.015;
        dripPool.add(ripple);
      }
      // Drip line from above
      const dripLine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 4 + Math.random() * 4, 16),
        dripMat,
      );
      dripLine.position.y = 4;
      dripPool.add(dripLine);
      const dpx = (Math.random() - 0.5) * w * 0.75;
      const dpz = (Math.random() - 0.5) * d * 0.75;
      dripPool.position.set(dpx, getTerrainHeight(dpx, dpz, 0.6), dpz);
      mctx.scene.add(dripPool);
    }

    // ── Light refraction effects (colored point lights scattered) ──
    const refractionColors = [0xff4466, 0x44ff88, 0x4488ff, 0xffaa22, 0xaa44ff, 0x44ffff];
    for (let i = 0; i < 15; i++) {
      const refColor = refractionColors[Math.floor(Math.random() * refractionColors.length)];
      const refLight = new THREE.PointLight(refColor, 0.3 + Math.random() * 0.4, 8);
      refLight.position.set(
        (Math.random() - 0.5) * w * 0.8,
        1 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.8,
      );
      mctx.scene.add(refLight);
      // Visible light source (tiny crystal)
      const refCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08, 2),
        new THREE.MeshStandardMaterial({ color: refColor, emissive: refColor, emissiveIntensity: 1.0, transparent: true, opacity: 0.8 }),
      );
      refCrystal.position.copy(refLight.position);
      mctx.scene.add(refCrystal);
    }

    // ── Crystal bridge improvements (with railings and glow) ──
    for (let i = 0; i < 5; i++) {
      const detailedBridge = new THREE.Group();
      const bLen = 6 + Math.random() * 8;
      const bClr = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const bridgeMat = new THREE.MeshStandardMaterial({
        color: bClr.color,
        emissive: bClr.emissive,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.35,
        transparent: true,
        opacity: 0.55,
      });
      // Main deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, bLen), bridgeMat);
      deck.position.y = 0;
      detailedBridge.add(deck);
      // Crystal railings (pillars along edges)
      for (let p = 0; p < Math.floor(bLen / 1.5); p++) {
        const pillar1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 17), bridgeMat);
        pillar1.position.set(-1.1, 0.4, -bLen / 2 + p * 1.5 + 0.75);
        detailedBridge.add(pillar1);
        const pillar2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 17), bridgeMat);
        pillar2.position.set(1.1, 0.4, -bLen / 2 + p * 1.5 + 0.75);
        detailedBridge.add(pillar2);
      }
      // Underglow
      const underLight = new THREE.PointLight(bClr.color, 0.5, 6);
      underLight.position.set(0, -0.5, 0);
      detailedBridge.add(underLight);
      mctx.torchLights.push(underLight);
      detailedBridge.position.set(
        (Math.random() - 0.5) * w * 0.55,
        1.5 + Math.random() * 2.5,
        (Math.random() - 0.5) * d * 0.55,
      );
      detailedBridge.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(detailedBridge);
    }

    // ── Underground river with translucent water ──
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x2244aa,
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const river = new THREE.Group();
      const segments = 8 + Math.floor(Math.random() * 5);
      let rx = (Math.random() - 0.5) * w * 0.3;
      let rz = -d * 0.4;
      for (let s = 0; s < segments; s++) {
        const segW = 3 + Math.random() * 2;
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(segW, 8), riverMat);
        seg.rotation.x = -Math.PI / 2;
        seg.position.set(rx, 0.025, rz);
        river.add(seg);
        rx += (Math.random() - 0.5) * 4;
        rz += 7;
        // River bank rocks
        for (let rb = 0; rb < 2; rb++) {
          const bankRock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3, 2),
            darkStoneMat,
          );
          bankRock.position.set(rx + (rb === 0 ? -segW / 2 - 0.3 : segW / 2 + 0.3), 0.15, rz - 3);
          bankRock.scale.y = 0.5;
          river.add(bankRock);
        }
      }
      // River glow
      const riverLight = new THREE.PointLight(0x2244aa, 0.3, 12);
      riverLight.position.set(rx, 0.5, rz - segments * 3);
      river.add(riverLight);
      mctx.scene.add(river);
    }

    // ── Ceiling crystal chandeliers ──
    for (let i = 0; i < 6; i++) {
      const chandelier = new THREE.Group();
      const chanClr = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      // Central chain/stalk
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 2, 16),
        darkStoneMat,
      );
      stalk.position.y = 1;
      chandelier.add(stalk);
      // Ring of hanging crystals
      const ringCount = 6 + Math.floor(Math.random() * 4);
      for (let r = 0; r < ringCount; r++) {
        const rAngle = (r / ringCount) * Math.PI * 2;
        const hangCryst = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.5 + Math.random() * 0.5, 17),
          new THREE.MeshStandardMaterial({
            color: chanClr.color,
            emissive: chanClr.emissive,
            emissiveIntensity: 0.7,
            roughness: 0.05,
            transparent: true,
            opacity: 0.75,
          }),
        );
        hangCryst.rotation.x = Math.PI;
        hangCryst.position.set(Math.cos(rAngle) * 0.6, -0.3, Math.sin(rAngle) * 0.6);
        chandelier.add(hangCryst);
      }
      // Glow
      const chanLight = new THREE.PointLight(chanClr.color, 0.7, 8);
      chanLight.position.set(0, -0.5, 0);
      chandelier.add(chanLight);
      mctx.torchLights.push(chanLight);
      chandelier.position.set(
        (Math.random() - 0.5) * w * 0.7,
        9 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(chandelier);
    }


    // ── Crystal cluster formations (groups of pointed hexagonal prisms) ──
    for (let i = 0; i < 15; i++) {
      const hexCluster = new THREE.Group();
      const hClrChoice = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const hexCrystMat = new THREE.MeshStandardMaterial({
        color: hClrChoice.color,
        emissive: hClrChoice.emissive,
        emissiveIntensity: 0.55,
        roughness: 0.08,
        metalness: 0.35,
        transparent: true,
        opacity: 0.72,
      });
      const prismCount = 4 + Math.floor(Math.random() * 6);
      for (let p = 0; p < prismCount; p++) {
        const prismH = 0.8 + Math.random() * 2.5;
        const prismR = 0.1 + Math.random() * 0.3;
        const prism = new THREE.Mesh(new THREE.CylinderGeometry(prismR * 0.3, prismR, prismH, 6), hexCrystMat);
        prism.position.set((Math.random() - 0.5) * 2, prismH / 2, (Math.random() - 0.5) * 2);
        prism.rotation.z = (Math.random() - 0.5) * 0.4;
        prism.rotation.x = (Math.random() - 0.5) * 0.4;
        hexCluster.add(prism);
      }
      if (Math.random() > 0.3) {
        const hcLight = new THREE.PointLight(hClrChoice.color, 0.5, 7);
        hcLight.position.set(0, 1.5, 0);
        hexCluster.add(hcLight);
        mctx.torchLights.push(hcLight);
      }
      const hcX = (Math.random() - 0.5) * w * 0.85;
      const hcZ = (Math.random() - 0.5) * d * 0.85;
      hexCluster.position.set(hcX, getTerrainHeight(hcX, hcZ, 0.6), hcZ);
      mctx.scene.add(hexCluster);
    }

    // ── Reflective pool surfaces with crystal reflections ──
    for (let i = 0; i < 8; i++) {
      const refPool = new THREE.Group();
      const rpR = 2 + Math.random() * 3;
      const rpClr = Math.random() > 0.5 ? 0x4466cc : 0x7744aa;
      const rpSurface = new THREE.Mesh(
        new THREE.CircleGeometry(rpR, 16),
        new THREE.MeshStandardMaterial({ color: rpClr, roughness: 0.02, metalness: 0.6, transparent: true, opacity: 0.6, depthWrite: false }),
      );
      rpSurface.rotation.x = -Math.PI / 2;
      rpSurface.position.y = 0.015;
      refPool.add(rpSurface);
      // Crystal reflections (inverted crystal shards beneath surface)
      const refCount = 3 + Math.floor(Math.random() * 4);
      const refClr = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      for (let rc = 0; rc < refCount; rc++) {
        const refShard = new THREE.Mesh(
          new THREE.ConeGeometry(0.08 + Math.random() * 0.15, 0.5 + Math.random() * 0.8, 6),
          new THREE.MeshStandardMaterial({
            color: refClr.color,
            emissive: refClr.emissive,
            emissiveIntensity: 0.3,
            roughness: 0.05,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
          }),
        );
        refShard.rotation.x = Math.PI;
        const rsAng = Math.random() * Math.PI * 2;
        const rsDist = Math.random() * rpR * 0.6;
        refShard.position.set(Math.cos(rsAng) * rsDist, -0.3, Math.sin(rsAng) * rsDist);
        refPool.add(refShard);
      }
      const rpGlow = new THREE.PointLight(rpClr, 0.35, 5);
      rpGlow.position.set(0, -0.5, 0);
      refPool.add(rpGlow);
      const rpX = (Math.random() - 0.5) * w * 0.7;
      const rpZ = (Math.random() - 0.5) * d * 0.7;
      refPool.position.set(rpX, 0.01, rpZ);
      mctx.scene.add(refPool);
    }

    // ── Stalactite/stalagmite pairs with drip detail ──
    for (let i = 0; i < 12; i++) {
      const pairGroup = new THREE.Group();
      const pairH = 1.5 + Math.random() * 2.5;
      const pairR = 0.2 + Math.random() * 0.3;
      // Stalagmite (ground)
      const smite = new THREE.Mesh(new THREE.ConeGeometry(pairR, pairH, 10), caveStoneMat);
      smite.position.y = pairH / 2;
      pairGroup.add(smite);
      // Stalactite (ceiling, aligned above)
      const stiteH = 1 + Math.random() * 2;
      const stite = new THREE.Mesh(new THREE.ConeGeometry(pairR * 0.8, stiteH, 10), darkStoneMat);
      stite.rotation.x = Math.PI;
      stite.position.y = 9 + Math.random() * 2;
      pairGroup.add(stite);
      // Drip line between them
      const dripLineH = stite.position.y - pairH;
      if (dripLineH > 0) {
        const dripStream = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, dripLineH, 8),
          dripMat,
        );
        dripStream.position.y = pairH + dripLineH / 2;
        pairGroup.add(dripStream);
        // Drip droplet at bottom
        const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), dripMat);
        droplet.position.y = pairH + 0.1;
        droplet.scale.y = 1.5;
        pairGroup.add(droplet);
      }
      // Small splash pool at base
      const splashPool = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0x6688cc, roughness: 0.05, transparent: true, opacity: 0.4 }),
      );
      splashPool.rotation.x = -Math.PI / 2;
      splashPool.position.y = 0.01;
      pairGroup.add(splashPool);
      const spX = (Math.random() - 0.5) * w * 0.8;
      const spZ = (Math.random() - 0.5) * d * 0.8;
      pairGroup.position.set(spX, getTerrainHeight(spX, spZ, 0.6), spZ);
      mctx.scene.add(pairGroup);
    }

    // ── Mineral vein lines on cave walls (thin colored strips) ──
    const mineralVeinColors = [0xcc8833, 0x88cc44, 0x4488cc, 0xcc44aa, 0xdddd44];
    for (let i = 0; i < 25; i++) {
      const veinGroup = new THREE.Group();
      const mvColor = mineralVeinColors[Math.floor(Math.random() * mineralVeinColors.length)];
      const mvMat = new THREE.MeshStandardMaterial({ color: mvColor, roughness: 0.3, metalness: 0.6, emissive: mvColor, emissiveIntensity: 0.2 });
      const segCount = 4 + Math.floor(Math.random() * 5);
      let vx = 0, vy = 0;
      for (let s = 0; s < segCount; s++) {
        const segLen = 0.5 + Math.random() * 1.5;
        const segW = 0.03 + Math.random() * 0.05;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, segW, 0.01), mvMat);
        seg.position.set(vx + segLen / 2, vy, 0);
        seg.rotation.z = (Math.random() - 0.5) * 0.4;
        veinGroup.add(seg);
        vx += segLen * 0.8;
        vy += (Math.random() - 0.5) * 0.3;
        // Branch veins
        if (Math.random() > 0.5) {
          const branchLen = 0.3 + Math.random() * 0.5;
          const branchVein = new THREE.Mesh(new THREE.BoxGeometry(branchLen, segW * 0.6, 0.01), mvMat);
          branchVein.position.set(vx - 0.2, vy + (Math.random() > 0.5 ? 0.15 : -0.15), 0);
          branchVein.rotation.z = (Math.random() - 0.5) * 0.8;
          veinGroup.add(branchVein);
        }
      }
      const mvX = (Math.random() - 0.5) * w * 0.8;
      const mvZ = (Math.random() - 0.5) * d * 0.8;
      veinGroup.position.set(mvX, 1 + Math.random() * 5, mvZ);
      veinGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(veinGroup);
    }

    // ── Fossil imprints on ground ──
    const fossilMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.7, metalness: 0.1 });
    for (let i = 0; i < 8; i++) {
      const fossil = new THREE.Group();
      // Spiral ammonite shape
      for (let s = 0; s < 12; s++) {
        const segAngle = s * 0.5;
        const segDist = 0.05 + s * 0.03;
        const fossilSeg = new THREE.Mesh(new THREE.SphereGeometry(0.03 + s * 0.005, 17, 16), fossilMat);
        fossilSeg.position.set(Math.cos(segAngle) * segDist, 0.01, Math.sin(segAngle) * segDist);
        fossil.add(fossilSeg);
      }
      const fsx = (Math.random() - 0.5) * w * 0.8;
      const fsz = (Math.random() - 0.5) * d * 0.8;
      fossil.position.set(fsx, getTerrainHeight(fsx, fsz, 0.6) + 0.01, fsz);
      fossil.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fossil);
    }
}

export function buildFrozenTundra(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0xbbccdd, 0.018);
    mctx.applyTerrainColors(0xccddee, 0xaabbcc, 1.4);
    mctx.dirLight.color.setHex(0xddeeff);
    mctx.dirLight.intensity = 1.4;
    mctx.ambientLight.color.setHex(0x8899bb);
    mctx.ambientLight.intensity = 0.7;
    mctx.hemiLight.color.setHex(0xccddff);
    mctx.hemiLight.groundColor.setHex(0x99aacc);

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.8 });
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.7 });
    const iceOpaqueMat = new THREE.MeshStandardMaterial({ color: 0x99ccee, roughness: 0.15, metalness: 0.3 });
    const frozenWoodMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.85 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.85 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.7 });
    const tentMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9, side: THREE.DoubleSide });
    const frostMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.3, transparent: true, opacity: 0.4, depthWrite: false });
    const frozenFallMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const snowPineMat = new THREE.MeshStandardMaterial({ color: 0xccddcc, roughness: 0.7 });

    // ── Ice formations (prisms and blocks) ──
    for (let i = 0; i < 35; i++) {
      const iceGroup = new THREE.Group();
      const cnt = 1 + Math.floor(Math.random() * 3);
      for (let c = 0; c < cnt; c++) {
        const iH = 0.5 + Math.random() * 3;
        const iW = 0.3 + Math.random() * 1.5;
        const iD = 0.3 + Math.random() * 1.5;
        const ice = new THREE.Mesh(
          new THREE.BoxGeometry(iW, iH, iD),
          iceMat,
        );
        ice.position.set(
          (Math.random() - 0.5) * 2,
          iH / 2,
          (Math.random() - 0.5) * 2,
        );
        ice.rotation.y = Math.random() * 0.5;
        ice.rotation.z = (Math.random() - 0.5) * 0.15;
        iceGroup.add(ice);
      }
      const ix = (Math.random() - 0.5) * w * 0.9;
      const iz = (Math.random() - 0.5) * d * 0.9;
      iceGroup.position.set(ix, getTerrainHeight(ix, iz, 1.4), iz);
      mctx.scene.add(iceGroup);
    }

    // ── Snow drifts ──
    for (let i = 0; i < 24; i++) {
      const sx = 3 + Math.random() * 8;
      const sy = 0.4 + Math.random() * 0.8;
      const sz = 3 + Math.random() * 8;
      const drift = new THREE.Mesh(
        new THREE.SphereGeometry(1, 14, 10),
        snowMat,
      );
      drift.scale.set(sx, sy, sz);
      const driftX = (Math.random() - 0.5) * w * 0.85;
      const driftZ = (Math.random() - 0.5) * d * 0.85;
      drift.position.set(driftX, sy * 0.3, driftZ);
      mctx.scene.add(drift);
    }

    // ── Frozen trees (bare trunks with ice coating) ──
    for (let i = 0; i < 18; i++) {
      const tree = new THREE.Group();
      const trunkH = 3 + Math.random() * 3;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.2, trunkH, 10),
        frozenWoodMat,
      );
      trunk.position.y = trunkH / 2;
      tree.add(trunk);
      // Ice coating on trunk
      const iceCoat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, trunkH * 0.7, 10),
        new THREE.MeshStandardMaterial({ color: 0xaaddee, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.3 }),
      );
      iceCoat.position.y = trunkH * 0.4;
      tree.add(iceCoat);
      // Bare branches
      for (let b = 0; b < 3 + Math.floor(Math.random() * 3); b++) {
        const brLen = 1 + Math.random() * 1.5;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.05, brLen, 16),
          frozenWoodMat,
        );
        const bAngle = Math.random() * Math.PI * 2;
        branch.position.set(
          Math.cos(bAngle) * brLen * 0.3,
          trunkH * (0.5 + Math.random() * 0.4),
          Math.sin(bAngle) * brLen * 0.3,
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.8;
        tree.add(branch);
      }
      const tx = (Math.random() - 0.5) * w * 0.85;
      const tz = (Math.random() - 0.5) * d * 0.85;
      tree.position.set(tx, getTerrainHeight(tx, tz, 1.4), tz);
      mctx.scene.add(tree);
    }

    // ── Frozen lakes ──
    for (let i = 0; i < 12; i++) {
      const lakeR = 4 + Math.random() * 8;
      const lake = new THREE.Mesh(
        new THREE.CircleGeometry(lakeR, 16),
        new THREE.MeshStandardMaterial({ color: 0xaaccee, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.8 }),
      );
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.01,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(lake);
    }

    // ── Aurora borealis pillars ──
    for (let i = 0; i < 10; i++) {
      const auroraH = 12 + Math.random() * 8;
      const auroraColor = Math.random() > 0.5 ? 0x44ff88 : 0x8844ff;
      const aurora = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 + Math.random() * 1.5, auroraH, 0.1),
        new THREE.MeshStandardMaterial({
          color: auroraColor,
          emissive: auroraColor,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      aurora.position.set(
        (Math.random() - 0.5) * w * 0.9,
        auroraH / 2 + 5,
        (Math.random() - 0.5) * d * 0.9,
      );
      aurora.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(aurora);
    }

    // ── Snow-covered rocks ──
    for (let i = 0; i < 28; i++) {
      const rGroup = new THREE.Group();
      const rH = 0.5 + Math.random() * 1.5;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rH, 2),
        rockMat,
      );
      rock.scale.set(0.8 + Math.random() * 0.4, 0.5 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
      rGroup.add(rock);
      // Snow cap on top
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(rH * 0.7, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2),
        snowMat,
      );
      cap.position.y = rH * 0.35;
      rGroup.add(cap);
      const rx = (Math.random() - 0.5) * w * 0.85;
      const rz = (Math.random() - 0.5) * d * 0.85;
      rGroup.position.set(rx, getTerrainHeight(rx, rz, 1.4), rz);
      mctx.scene.add(rGroup);
    }

    // ── Ice spikes ──
    for (let i = 0; i < 14; i++) {
      const spikeH = 2 + Math.random() * 4;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.15 + Math.random() * 0.2, spikeH, 20),
        iceMat,
      );
      const spX = (Math.random() - 0.5) * w * 0.85;
      const spZ = (Math.random() - 0.5) * d * 0.85;
      spike.position.set(spX, getTerrainHeight(spX, spZ, 1.4) + spikeH / 2, spZ);
      mctx.scene.add(spike);
    }

    // ── Abandoned camps ──
    for (let i = 0; i < 7; i++) {
      const camp = new THREE.Group();
      // Torn tent
      const tent = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 2, 17),
        tentMat,
      );
      tent.position.y = 1;
      tent.rotation.y = Math.PI / 4;
      camp.add(tent);
      // Cold fire pit
      const pitRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.12, 20, 27),
        rockMat,
      );
      pitRing.rotation.x = Math.PI / 2;
      pitRing.position.set(2, 0.12, 0);
      camp.add(pitRing);
      // Charred logs
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.6, 17),
          new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 1.0 }),
        );
        log.position.set(2 + (Math.random() - 0.5) * 0.4, 0.06, (Math.random() - 0.5) * 0.4);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = Math.random() * Math.PI;
        camp.add(log);
      }
      const cpX = (Math.random() - 0.5) * w * 0.7;
      const cpZ = (Math.random() - 0.5) * d * 0.7;
      camp.position.set(cpX, getTerrainHeight(cpX, cpZ, 1.4), cpZ);
      camp.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(camp);
    }

    // ── Animal skeletons ──
    for (let i = 0; i < 10; i++) {
      const skeleton = new THREE.Group();
      // Ribcage (scattered bones)
      for (let b = 0; b < 4 + Math.floor(Math.random() * 4); b++) {
        const boneLen = 0.3 + Math.random() * 0.5;
        const bone = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, boneLen),
          boneMat,
        );
        bone.position.set(
          (Math.random() - 0.5) * 0.8,
          0.02,
          (Math.random() - 0.5) * 0.8,
        );
        bone.rotation.y = Math.random() * Math.PI;
        bone.rotation.x = (Math.random() - 0.5) * 0.3;
        skeleton.add(bone);
      }
      // Skull
      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 20, 17),
        boneMat,
      );
      skull.scale.set(1, 0.8, 1.2);
      skull.position.set(0, 0.1, 0.5);
      skeleton.add(skull);
      const skX = (Math.random() - 0.5) * w * 0.8;
      const skZ = (Math.random() - 0.5) * d * 0.8;
      skeleton.position.set(skX, getTerrainHeight(skX, skZ, 1.4), skZ);
      skeleton.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(skeleton);
    }

    // ── Ice caves (arches) ──
    for (let i = 0; i < 5; i++) {
      const cave = new THREE.Group();
      const archH = 3 + Math.random() * 2;
      const archW = 3 + Math.random() * 2;
      // Left wall
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, archH, 3), iceOpaqueMat);
      leftWall.position.set(-archW / 2, archH / 2, 0);
      cave.add(leftWall);
      // Right wall
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, archH, 3), iceOpaqueMat);
      rightWall.position.set(archW / 2, archH / 2, 0);
      cave.add(rightWall);
      // Top arch
      const topArch = new THREE.Mesh(new THREE.BoxGeometry(archW + 0.5, 0.5, 3), iceOpaqueMat);
      topArch.position.y = archH;
      cave.add(topArch);
      const cvX = (Math.random() - 0.5) * w * 0.6;
      const cvZ = (Math.random() - 0.5) * d * 0.6;
      cave.position.set(cvX, getTerrainHeight(cvX, cvZ, 1.4), cvZ);
      cave.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(cave);
    }

    // ── Snow particles (floating) ──
    for (let i = 0; i < 18; i++) {
      const snowflake = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 16, 16),
        snowMat,
      );
      snowflake.position.set(
        (Math.random() - 0.5) * w * 0.85,
        1 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.85,
      );
      mctx.scene.add(snowflake);
    }

    // ── Frost patterns on ground ──
    for (let i = 0; i < 12; i++) {
      const frostR = 1 + Math.random() * 2;
      const frost = new THREE.Mesh(
        new THREE.CircleGeometry(frostR, 23),
        frostMat,
      );
      frost.rotation.x = -Math.PI / 2;
      const frX = (Math.random() - 0.5) * w * 0.8;
      const frZ = (Math.random() - 0.5) * d * 0.8;
      frost.position.set(frX, getTerrainHeight(frX, frZ, 1.4) + 0.02, frZ);
      mctx.scene.add(frost);
    }

    // ── Frozen waterfalls ──
    for (let i = 0; i < 6; i++) {
      const fallH = 4 + Math.random() * 5;
      const fallW = 2 + Math.random() * 3;
      const fall = new THREE.Mesh(
        new THREE.PlaneGeometry(fallW, fallH),
        frozenFallMat,
      );
      const ffX = (Math.random() - 0.5) * w * 0.7;
      const ffZ = (Math.random() - 0.5) * d * 0.7;
      fall.position.set(ffX, fallH / 2 + 1, ffZ);
      fall.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fall);
    }

    // ── Snow-covered pine trees ──
    for (let i = 0; i < 10; i++) {
      const pine = new THREE.Group();
      const trunkH = 2 + Math.random() * 2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.18, trunkH, 10),
        frozenWoodMat,
      );
      trunk.position.y = trunkH / 2;
      pine.add(trunk);
      // Snow-covered foliage layers
      for (let layer = 0; layer < 3; layer++) {
        const layerR = 1.5 - layer * 0.4;
        const layerY = trunkH * 0.4 + layer * 1.2;
        const foliage = new THREE.Mesh(
          new THREE.ConeGeometry(layerR, 1.2, 10),
          snowPineMat,
        );
        foliage.position.y = layerY;
        pine.add(foliage);
        // Snow cap
        const snowCap = new THREE.Mesh(
          new THREE.ConeGeometry(layerR * 0.9, 0.3, 10),
          snowMat,
        );
        snowCap.position.y = layerY + 0.5;
        pine.add(snowCap);
      }
      const ptx = (Math.random() - 0.5) * w * 0.85;
      const ptz = (Math.random() - 0.5) * d * 0.85;
      pine.position.set(ptx, getTerrainHeight(ptx, ptz, 1.4), ptz);
      mctx.scene.add(pine);
    }

    // ── Icicle clusters hanging from edges ──
    for (let i = 0; i < 25; i++) {
      const icGrp = new THREE.Group();
      const icN = 3 + Math.floor(Math.random() * 6);
      for (let c = 0; c < icN; c++) {
        const icH2 = 0.3 + Math.random() * 1.5;
        const icMesh = new THREE.Mesh(new THREE.ConeGeometry(0.03 + Math.random() * 0.05, icH2, 17), iceMat);
        icMesh.rotation.x = Math.PI;
        icMesh.position.set((Math.random() - 0.5) * 1, 0, (Math.random() - 0.5) * 1);
        icGrp.add(icMesh);
      }
      icGrp.position.set((Math.random() - 0.5) * w * 0.85, 3 + Math.random() * 5, (Math.random() - 0.5) * d * 0.85);
      mctx.scene.add(icGrp);
    }

    // ── Deep sculpted snow drifts ──
    for (let i = 0; i < 15; i++) {
      const ddGrp = new THREE.Group();
      const dW = 6 + Math.random() * 12, dH = 0.08 + Math.random() * 0.12, dD = 5 + Math.random() * 10;
      const dMain = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), snowMat);
      dMain.scale.set(dW, dH, dD);
      ddGrp.add(dMain);
      const ovhng = new THREE.Mesh(new THREE.SphereGeometry(1, 27, 23), snowMat);
      ovhng.scale.set(dW * 0.5, dH * 0.3, dD * 0.4);
      ovhng.position.set(dW * 0.3, dH * 0.7, 0);
      ddGrp.add(ovhng);
      const ddX = (Math.random() - 0.5) * w * 0.9, ddZ = (Math.random() - 0.5) * d * 0.9;
      ddGrp.position.set(ddX, getTerrainHeight(ddX, ddZ, 1.4) - 0.3, ddZ);
      ddGrp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(ddGrp);
    }

    // ── Frozen trees with heavy ice coating ──
    for (let i = 0; i < 12; i++) {
      const frzT = new THREE.Group();
      const frzH = 3 + Math.random() * 4;
      const frzTrk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, frzH, 10), frozenWoodMat);
      frzTrk.position.y = frzH / 2;
      frzT.add(frzTrk);
      const icShell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, frzH * 0.85, 10),
        new THREE.MeshStandardMaterial({ color: 0xaaddee, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.35 }));
      icShell.position.y = frzH * 0.45;
      frzT.add(icShell);
      for (let b = 0; b < 4 + Math.floor(Math.random() * 3); b++) {
        const bLen = 1.2 + Math.random() * 2, bAng = Math.random() * Math.PI * 2;
        const brch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.06, bLen, 16), frozenWoodMat);
        brch.position.set(Math.cos(bAng) * bLen * 0.3, frzH * (0.4 + Math.random() * 0.4), Math.sin(bAng) * bLen * 0.3);
        brch.rotation.z = Math.cos(bAng) * 0.8; brch.rotation.x = Math.sin(bAng) * 0.8;
        frzT.add(brch);
        for (let j = 0; j < 2; j++) {
          const bIc = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2 + Math.random() * 0.3, 16), iceMat);
          bIc.rotation.x = Math.PI;
          bIc.position.set(Math.cos(bAng) * (bLen * 0.3 + j * 0.3), frzH * (0.35 + Math.random() * 0.3), Math.sin(bAng) * (bLen * 0.3 + j * 0.3));
          frzT.add(bIc);
        }
      }
      const ftX = (Math.random() - 0.5) * w * 0.85, ftZ = (Math.random() - 0.5) * d * 0.85;
      frzT.position.set(ftX, getTerrainHeight(ftX, ftZ, 1.4), ftZ);
      mctx.scene.add(frzT);
    }

    // ── Aurora borealis curtains ──
    const aurClrs = [{ c: 0x44ff88, o: 0.18 }, { c: 0x8844ff, o: 0.15 }, { c: 0x44ddff, o: 0.12 }, { c: 0xff44aa, o: 0.1 }, { c: 0x88ff44, o: 0.14 }];
    for (let i = 0; i < 15; i++) {
      const ac = aurClrs[i % aurClrs.length];
      const aW = 3 + Math.random() * 8, aH = 8 + Math.random() * 12;
      const aPanel = new THREE.Mesh(new THREE.PlaneGeometry(aW, aH),
        new THREE.MeshStandardMaterial({ color: ac.c, emissive: ac.c, emissiveIntensity: 0.7, transparent: true, opacity: ac.o, side: THREE.DoubleSide, depthWrite: false }));
      aPanel.position.set((Math.random() - 0.5) * w * 0.95, aH / 2 + 6, (Math.random() - 0.5) * d * 0.95);
      aPanel.rotation.y = Math.random() * Math.PI;
      aPanel.rotation.x = (Math.random() - 0.5) * 0.3;
      mctx.scene.add(aPanel);
    }

    // ── Ice bridges ──
    for (let i = 0; i < 6; i++) {
      const ibGrp = new THREE.Group();
      const ibLen = 5 + Math.random() * 8, ibWid = 1.5 + Math.random();
      ibGrp.add(new THREE.Mesh(new THREE.BoxGeometry(ibWid, 0.3, ibLen), iceOpaqueMat));
      const ibLR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, ibLen), iceMat); ibLR.position.set(-ibWid / 2, 0.45, 0); ibGrp.add(ibLR);
      const ibRR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, ibLen), iceMat); ibRR.position.set(ibWid / 2, 0.45, 0); ibGrp.add(ibRR);
      const ibLP = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.4), iceOpaqueMat); ibLP.position.set(0, -1, -ibLen / 2); ibGrp.add(ibLP);
      const ibRP = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.4), iceOpaqueMat); ibRP.position.set(0, -1, ibLen / 2); ibGrp.add(ibRP);
      ibGrp.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      ibGrp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(ibGrp);
    }

    // ── Frost patterns on ground ──
    for (let i = 0; i < 18; i++) {
      const fpGrp = new THREE.Group();
      const fpR = 1.5 + Math.random() * 2.5;
      const fpBase = new THREE.Mesh(new THREE.CircleGeometry(fpR, 27), frostMat);
      fpBase.rotation.x = -Math.PI / 2; fpBase.position.y = 0.02; fpGrp.add(fpBase);
      for (let b = 0; b < 6; b++) {
        const bAngle = (b / 6) * Math.PI * 2;
        const fpBranch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, fpR * 0.8),
          new THREE.MeshStandardMaterial({ color: 0xccddff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 }));
        fpBranch.position.set(Math.cos(bAngle) * fpR * 0.4, 0.025, Math.sin(bAngle) * fpR * 0.4);
        fpBranch.rotation.y = bAngle; fpGrp.add(fpBranch);
        for (let sb = 0; sb < 2; sb++) {
          const subBr = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, fpR * 0.3),
            new THREE.MeshStandardMaterial({ color: 0xccddff, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }));
          subBr.position.set(Math.cos(bAngle) * fpR * (0.3 + sb * 0.25) + Math.cos(bAngle + 0.5) * 0.15, 0.025, Math.sin(bAngle) * fpR * (0.3 + sb * 0.25) + Math.sin(bAngle + 0.5) * 0.15);
          subBr.rotation.y = bAngle + 0.4; fpGrp.add(subBr);
        }
      }
      const fpX = (Math.random() - 0.5) * w * 0.8, fpZ = (Math.random() - 0.5) * d * 0.8;
      fpGrp.position.set(fpX, getTerrainHeight(fpX, fpZ, 1.4), fpZ);
      mctx.scene.add(fpGrp);
    }

    // ── Frozen mammoth skeletons ──
    for (let i = 0; i < 3; i++) {
      const skelGrp = new THREE.Group();
      const iceEncasement = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 4),
        new THREE.MeshStandardMaterial({ color: 0x99ccee, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.25 }));
      iceEncasement.position.y = 1; skelGrp.add(iceEncasement);
      const skelSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 3, 17), boneMat);
      skelSpine.rotation.z = Math.PI / 2; skelSpine.position.y = 1; skelGrp.add(skelSpine);
      for (let r = 0; r < 5; r++) {
        const skelRib = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 30, 23, Math.PI), boneMat);
        skelRib.position.set(-1 + r * 0.4, 0.8, 0); skelRib.rotation.y = Math.PI / 2; skelGrp.add(skelRib);
      }
      const skelSkull = new THREE.Mesh(new THREE.SphereGeometry(0.4, 23, 20), boneMat);
      skelSkull.scale.set(0.8, 0.7, 1.3); skelSkull.position.set(1.8, 1.2, 0); skelGrp.add(skelSkull);
      for (let t = 0; t < 2; t++) {
        const tuskMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1, 17), boneMat);
        tuskMesh.position.set(2.1, 0.8, t === 0 ? 0.3 : -0.3);
        tuskMesh.rotation.z = 0.8; tuskMesh.rotation.x = t === 0 ? 0.3 : -0.3; skelGrp.add(tuskMesh);
      }
      const skX = (Math.random() - 0.5) * w * 0.6, skZ = (Math.random() - 0.5) * d * 0.6;
      skelGrp.position.set(skX, getTerrainHeight(skX, skZ, 1.4), skZ);
      skelGrp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(skelGrp);
    }

    // ── Frozen waterfalls (detailed) ──
    for (let i = 0; i < 4; i++) {
      const fallGrp = new THREE.Group();
      const fallH = 6 + Math.random() * 6, fallW = 3 + Math.random() * 4;
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(fallW, fallH), frozenFallMat);
      curtain.position.y = fallH / 2; fallGrp.add(curtain);
      for (let b = 0; b < 4; b++) {
        const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 23, 17),
          new THREE.MeshStandardMaterial({ color: 0xbbddff, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.5 }));
        bulge.scale.set(1, 0.5 + Math.random(), 0.3);
        bulge.position.set((Math.random() - 0.5) * fallW * 0.6, fallH * Math.random(), 0.15); fallGrp.add(bulge);
      }
      for (let j = 0; j < 6; j++) {
        const fallIcicle = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.5 + Math.random() * 0.5, 16), iceMat);
        fallIcicle.rotation.x = Math.PI; fallIcicle.position.set(-fallW / 2 + j * fallW / 5, -0.3, 0.1); fallGrp.add(fallIcicle);
      }
      const basePool = new THREE.Mesh(new THREE.CircleGeometry(fallW * 0.6, 16),
        new THREE.MeshStandardMaterial({ color: 0xaaccee, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.7 }));
      basePool.rotation.x = -Math.PI / 2; basePool.position.set(0, 0.02, 0.8); fallGrp.add(basePool);
      const fallX = (Math.random() - 0.5) * w * 0.65, fallZ = (Math.random() - 0.5) * d * 0.65;
      fallGrp.position.set(fallX, getTerrainHeight(fallX, fallZ, 1.4), fallZ);
      fallGrp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fallGrp);
    }

    // ── Ice cave entrances (atmospheric) ──
    for (let i = 0; i < 4; i++) {
      const caveGrp = new THREE.Group();
      const caveH = 4 + Math.random() * 3, caveW = 4 + Math.random() * 3;
      const caveLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, caveH, 4), iceOpaqueMat); caveLeft.position.set(-caveW / 2, caveH / 2, 0); caveGrp.add(caveLeft);
      const caveRight = new THREE.Mesh(new THREE.BoxGeometry(0.6, caveH, 4), iceOpaqueMat); caveRight.position.set(caveW / 2, caveH / 2, 0); caveGrp.add(caveRight);
      const caveTop = new THREE.Mesh(new THREE.BoxGeometry(caveW + 0.6, 0.6, 4), iceOpaqueMat); caveTop.position.y = caveH; caveGrp.add(caveTop);
      const caveBack = new THREE.Mesh(new THREE.BoxGeometry(caveW, caveH, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.3 }));
      caveBack.position.set(0, caveH / 2, -2); caveGrp.add(caveBack);
      const caveGlow = new THREE.PointLight(0x88bbff, 0.5, 8); caveGlow.position.set(0, caveH * 0.5, -1); caveGrp.add(caveGlow);
      for (let j = 0; j < 5; j++) {
        const caveIcicle = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.6 + Math.random() * 0.8, 16), iceMat);
        caveIcicle.rotation.x = Math.PI; caveIcicle.position.set(-caveW / 2 + j * caveW / 4, caveH - 0.1, 2); caveGrp.add(caveIcicle);
      }
      const caveX = (Math.random() - 0.5) * w * 0.6, caveZ = (Math.random() - 0.5) * d * 0.6;
      caveGrp.position.set(caveX, getTerrainHeight(caveX, caveZ, 1.4), caveZ);
      caveGrp.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(caveGrp);
    }

    // ── More snow particles ──
    for (let i = 0; i < 50; i++) {
      const snowParticle = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 16, 16), snowMat);
      snowParticle.position.set((Math.random() - 0.5) * w * 0.9, 0.5 + Math.random() * 8, (Math.random() - 0.5) * d * 0.9);
      mctx.scene.add(snowParticle);
    }

    // ── Frozen ponds with cracks ──
    for (let i = 0; i < 4; i++) {
      const pondGrp = new THREE.Group();
      const pondRadius = 4 + Math.random() * 5;
      const pondSurf = new THREE.Mesh(new THREE.CircleGeometry(pondRadius, 16),
        new THREE.MeshStandardMaterial({ color: 0xaaccee, roughness: 0.02, metalness: 0.6, transparent: true, opacity: 0.85 }));
      pondSurf.rotation.x = -Math.PI / 2; pondSurf.position.y = 0.01; pondGrp.add(pondSurf);
      const crackMtl = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.1, transparent: true, opacity: 0.6 });
      for (let c = 0; c < 8; c++) {
        const crLen = 1 + Math.random() * pondRadius * 0.7;
        const crMesh = new THREE.Mesh(new THREE.BoxGeometry(crLen, 0.005, 0.02), crackMtl);
        crMesh.rotation.y = Math.random() * Math.PI;
        crMesh.position.set((Math.random() - 0.5) * pondRadius * 0.6, 0.015, (Math.random() - 0.5) * pondRadius * 0.6); pondGrp.add(crMesh);
      }
      const snowRim = new THREE.Mesh(new THREE.RingGeometry(pondRadius - 0.3, pondRadius + 0.5, 23), snowMat);
      snowRim.rotation.x = -Math.PI / 2; snowRim.position.y = 0.03; pondGrp.add(snowRim);
      const pondX = (Math.random() - 0.5) * w * 0.65, pondZ = (Math.random() - 0.5) * d * 0.65;
      pondGrp.position.set(pondX, getTerrainHeight(pondX, pondZ, 1.4), pondZ);
      mctx.scene.add(pondGrp);
    }


    // ── Ice spike formations (transparent cones) ──
    for (let i = 0; i < 20; i++) {
      const spikeCluster = new THREE.Group();
      const spikeCnt = 3 + Math.floor(Math.random() * 5);
      for (let s = 0; s < spikeCnt; s++) {
        const spkH = 1 + Math.random() * 3;
        const spkR = 0.08 + Math.random() * 0.15;
        const spk = new THREE.Mesh(new THREE.ConeGeometry(spkR, spkH, 17), iceMat);
        spk.position.set((Math.random() - 0.5) * 1.5, spkH / 2, (Math.random() - 0.5) * 1.5);
        spk.rotation.z = (Math.random() - 0.5) * 0.2;
        spk.rotation.x = (Math.random() - 0.5) * 0.2;
        spikeCluster.add(spk);
      }
      const scX = (Math.random() - 0.5) * w * 0.85;
      const scZ = (Math.random() - 0.5) * d * 0.85;
      spikeCluster.position.set(scX, getTerrainHeight(scX, scZ, 1.4), scZ);
      mctx.scene.add(spikeCluster);
    }

    // ── Snow drift mounds (white flattened spheres) ──
    for (let i = 0; i < 30; i++) {
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + Math.random() * 1.5, 23, 17),
        snowMat,
      );
      mound.scale.set(1 + Math.random() * 2, 0.2 + Math.random() * 0.3, 1 + Math.random() * 1.5);
      const mdX = (Math.random() - 0.5) * w * 0.85;
      const mdZ = (Math.random() - 0.5) * d * 0.85;
      mound.position.set(mdX, getTerrainHeight(mdX, mdZ, 1.4) + 0.1, mdZ);
      mound.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(mound);
    }

    // ── Frozen waterfall detail (translucent stacked cylinders) ──
    for (let i = 0; i < 5; i++) {
      const frozenFall = new THREE.Group();
      const ffHeight = 5 + Math.random() * 5;
      const ffWidth = 2 + Math.random() * 3;
      // Stacked translucent cylinder segments for icy texture
      const segCount = 6 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segCount; s++) {
        const segH = ffHeight / segCount;
        const segR = ffWidth * 0.3 * (0.7 + Math.random() * 0.6);
        const fallSeg = new THREE.Mesh(
          new THREE.CylinderGeometry(segR * 0.85, segR, segH, 16),
          frozenFallMat,
        );
        fallSeg.position.y = s * segH + segH / 2;
        fallSeg.scale.z = 0.3;
        frozenFall.add(fallSeg);
      }
      // Ice bulges
      for (let b = 0; b < 4; b++) {
        const bulge = new THREE.Mesh(
          new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xbbddff, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.45 }),
        );
        bulge.scale.set(0.8, 0.5 + Math.random() * 0.5, 0.3);
        bulge.position.set((Math.random() - 0.5) * ffWidth * 0.3, Math.random() * ffHeight, 0.15);
        frozenFall.add(bulge);
      }
      // Icicles at bottom
      for (let ic = 0; ic < 5; ic++) {
        const icLen = 0.3 + Math.random() * 0.6;
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.03, icLen, 12), iceMat);
        icicle.rotation.x = Math.PI;
        icicle.position.set(-ffWidth * 0.25 + ic * ffWidth * 0.125, -0.2, 0.1);
        frozenFall.add(icicle);
      }
      // Frozen splash pool at base
      const splashR = ffWidth * 0.5;
      const splashBase = new THREE.Mesh(new THREE.CircleGeometry(splashR, 24),
        new THREE.MeshStandardMaterial({ color: 0xaaccee, roughness: 0.03, metalness: 0.5, transparent: true, opacity: 0.75 }));
      splashBase.rotation.x = -Math.PI / 2;
      splashBase.position.set(0, 0.02, 0.6);
      frozenFall.add(splashBase);
      const ffX2 = (Math.random() - 0.5) * w * 0.65;
      const ffZ2 = (Math.random() - 0.5) * d * 0.65;
      frozenFall.position.set(ffX2, getTerrainHeight(ffX2, ffZ2, 1.4), ffZ2);
      frozenFall.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(frozenFall);
    }

    // ── Aurora prop lights (curved translucent colored planes) ──
    const auroraColors = [
      { color: 0x44ff88, opacity: 0.12 },
      { color: 0x8844ff, opacity: 0.1 },
      { color: 0x44ddff, opacity: 0.09 },
      { color: 0xff44aa, opacity: 0.08 },
      { color: 0xaaff44, opacity: 0.11 },
    ];
    for (let i = 0; i < 12; i++) {
      const auroraGroup = new THREE.Group();
      const aC = auroraColors[i % auroraColors.length];
      const auroraWidth = 5 + Math.random() * 10;
      const auroraHeight = 3 + Math.random() * 6;
      // Multiple curved layers for depth
      for (let layer = 0; layer < 3; layer++) {
        const curvedPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(auroraWidth * (0.8 + layer * 0.15), auroraHeight * (0.7 + layer * 0.2)),
          new THREE.MeshStandardMaterial({
            color: aC.color,
            emissive: aC.color,
            emissiveIntensity: 0.6 - layer * 0.15,
            transparent: true,
            opacity: aC.opacity - layer * 0.02,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        curvedPlane.position.y = layer * 0.5;
        curvedPlane.position.z = layer * 0.3;
        curvedPlane.rotation.x = (Math.random() - 0.5) * 0.2;
        auroraGroup.add(curvedPlane);
      }
      auroraGroup.position.set(
        (Math.random() - 0.5) * w * 0.9,
        auroraHeight / 2 + 8 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.9,
      );
      auroraGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(auroraGroup);
    }

    // ── Atmospheric cold lighting ──
    for (let i = 0; i < 6; i++) {
      const coldColor = [0x88aaff, 0xaaccff, 0x99bbee][i % 3];
      const coldPt = new THREE.PointLight(coldColor, 0.3, 15);
      coldPt.position.set((Math.random() - 0.5) * w * 0.7, 2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(coldPt);
    }

    // ── Ice cave entrance ──
    for (let i = 0; i < 2; i++) {
      const iceCave = new THREE.Group();
      const caveOpenR = 2 + Math.random();
      // Arch opening in ice blue
      const iceArch = new THREE.Mesh(new THREE.TorusGeometry(caveOpenR, 0.3, 12, 20, Math.PI), iceOpaqueMat);
      iceCave.add(iceArch);
      // Dark interior
      const darkInterior = new THREE.Mesh(new THREE.CircleGeometry(caveOpenR - 0.1, 20),
        new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 1.0 }));
      darkInterior.position.z = -0.05; iceCave.add(darkInterior);
      // Icicle stalactites along top edge
      for (let j = 0; j < 8; j++) {
        const icicleA = (j / 8) * Math.PI;
        const icicleLen = 0.3 + Math.random() * 0.6;
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.04, icicleLen, 8), iceMat);
        icicle.rotation.x = Math.PI;
        icicle.position.set(Math.cos(icicleA) * caveOpenR, Math.sin(icicleA) * caveOpenR - icicleLen / 2, 0.1);
        iceCave.add(icicle);
      }
      // Cool blue PointLight inside
      const caveGlow2 = new THREE.PointLight(0x4488cc, 0.6, 10);
      caveGlow2.position.set(0, 0, -1); iceCave.add(caveGlow2);
      const icX = (Math.random() - 0.5) * w * 0.5;
      const icZ = (Math.random() - 0.5) * d * 0.5;
      iceCave.position.set(icX, getTerrainHeight(icX, icZ, 1.4) + caveOpenR, icZ);
      iceCave.rotation.y = Math.random() * Math.PI; mctx.scene.add(iceCave);
    }

    // ── Frozen lake surface ──
    {
      const frozenLake = new THREE.Group();
      const lakeR = Math.min(w, d) * 0.2;
      const lakeSurface = new THREE.Mesh(
        new THREE.CircleGeometry(lakeR, 16),
        new THREE.MeshStandardMaterial({ color: 0xaaddee, metalness: 0.7, roughness: 0.05, transparent: true, opacity: 0.9 }),
      );
      lakeSurface.rotation.x = -Math.PI / 2; lakeSurface.position.y = 0.02; frozenLake.add(lakeSurface);
      // Crack line details
      const crackMat2 = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.2 });
      for (let c = 0; c < 15; c++) {
        const crLen2 = 0.5 + Math.random() * lakeR * 0.4;
        const crLine = new THREE.Mesh(new THREE.BoxGeometry(crLen2, 0.003, 0.015), crackMat2);
        crLine.rotation.y = Math.random() * Math.PI;
        crLine.position.set((Math.random() - 0.5) * lakeR * 0.7, 0.025, (Math.random() - 0.5) * lakeR * 0.7);
        frozenLake.add(crLine);
        // Branch cracks
        if (Math.random() > 0.5) {
          const branchCr = new THREE.Mesh(new THREE.BoxGeometry(crLen2 * 0.4, 0.003, 0.01), crackMat2);
          branchCr.rotation.y = crLine.rotation.y + 0.5 + Math.random() * 0.5;
          branchCr.position.copy(crLine.position); branchCr.position.y = 0.026;
          frozenLake.add(branchCr);
        }
      }
      // Trapped bubble spheres beneath surface
      for (let b = 0; b < 12; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xeeeeff, transparent: true, opacity: 0.5 }));
        bubble.position.set((Math.random() - 0.5) * lakeR * 0.6, -0.02, (Math.random() - 0.5) * lakeR * 0.6);
        frozenLake.add(bubble);
      }
      const flX = w * 0.1, flZ = d * 0.1;
      frozenLake.position.set(flX, getTerrainHeight(flX, flZ, 1.4), flZ);
      mctx.scene.add(frozenLake);
    }

    // ── Mammoth skeleton ──
    for (let i = 0; i < 2; i++) {
      const mammoth = new THREE.Group();
      // Skull
      const mSkull = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), boneMat);
      mSkull.scale.set(1, 0.8, 1.2); mSkull.position.set(0, 1.2, 1.5); mammoth.add(mSkull);
      // Tusks
      for (const tSide of [-1, 1]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.5, 10), boneMat);
        tusk.position.set(tSide * 0.5, 0.8, 2.0);
        tusk.rotation.z = tSide * 0.6;
        tusk.rotation.x = 0.3; mammoth.add(tusk);
      }
      // Ribcage
      for (let r = 0; r < 6; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 12, Math.PI), boneMat);
        rib.position.set(0, 0.8, -0.5 + r * 0.4);
        rib.rotation.y = Math.PI / 2; mammoth.add(rib);
      }
      // Leg bones
      for (let lb = 0; lb < 3; lb++) {
        const legBone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 10), boneMat);
        legBone2.position.set((Math.random() - 0.5) * 1.5, 0.3, (Math.random() - 0.5) * 2);
        legBone2.rotation.set(Math.random() * 0.5, 0, (Math.random() - 0.5) * 0.5);
        mammoth.add(legBone2);
      }
      const mmX = (Math.random() - 0.5) * w * 0.4;
      const mmZ = (Math.random() - 0.5) * d * 0.4;
      mammoth.position.set(mmX, getTerrainHeight(mmX, mmZ, 1.4), mmZ);
      mammoth.rotation.y = Math.random() * Math.PI; mctx.scene.add(mammoth);
    }

    // ── Ice fishing hole ──
    for (let i = 0; i < 3; i++) {
      const fishHole = new THREE.Group();
      const holeSurface = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.3 }));
      holeSurface.rotation.x = -Math.PI / 2; holeSurface.position.y = 0.01; fishHole.add(holeSurface);
      // Ice block cubes around edge
      for (let ib = 0; ib < 5; ib++) {
        const iceBlock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), iceOpaqueMat);
        const ibAngle = (ib / 5) * Math.PI * 2;
        iceBlock.position.set(Math.cos(ibAngle) * 0.35, 0.05, Math.sin(ibAngle) * 0.35);
        iceBlock.rotation.y = Math.random(); fishHole.add(iceBlock);
      }
      // Fishing line
      const fishLine = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.0, 4), rockMat);
      fishLine.position.y = -0.5; fishHole.add(fishLine);
      const fhX = (Math.random() - 0.5) * w * 0.3;
      const fhZ = (Math.random() - 0.5) * d * 0.3;
      fishHole.position.set(fhX, getTerrainHeight(fhX, fhZ, 1.4) + 0.05, fhZ);
      mctx.scene.add(fishHole);
    }

    // ── Snowman props ──
    const snowmanTwigMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff6622, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const snowman = new THREE.Group();
      // 3 stacked spheres
      const bottomBall = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), snowMat);
      bottomBall.position.y = 0.4; snowman.add(bottomBall);
      const midBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), snowMat);
      midBall.position.y = 1.0; snowman.add(midBall);
      const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), snowMat);
      topBall.position.y = 1.45; snowman.add(topBall);
      // Twig arms
      for (const aSide of [-1, 1]) {
        const twigArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), snowmanTwigMat);
        twigArm.position.set(aSide * 0.35, 1.0, 0);
        twigArm.rotation.z = aSide * 1.2; snowman.add(twigArm);
      }
      // Coal eyes
      for (const eSide of [-0.06, 0.06]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), coalMat);
        eye.position.set(eSide, 1.5, 0.18); snowman.add(eye);
      }
      // Carrot nose
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.15, 8), carrotMat);
      nose.position.set(0, 1.43, 0.22);
      nose.rotation.x = -Math.PI / 2; snowman.add(nose);
      const smX = (Math.random() - 0.5) * w * 0.5;
      const smZ = (Math.random() - 0.5) * d * 0.5;
      snowman.position.set(smX, getTerrainHeight(smX, smZ, 1.4), smZ);
      mctx.scene.add(snowman);
    }

    // ── Aurora borealis enhancement ──
    const enhancedAuroraColors = [
      { color: 0x44ff88, opacity: 0.06 },
      { color: 0x8844ff, opacity: 0.05 },
      { color: 0x4488ff, opacity: 0.06 },
    ];
    for (let i = 0; i < 3; i++) {
      const eAurora = new THREE.Group();
      const eaC = enhancedAuroraColors[i];
      for (let layer = 0; layer < 4; layer++) {
        const aPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(12 + Math.random() * 8, 5 + Math.random() * 4),
          new THREE.MeshStandardMaterial({
            color: eaC.color, emissive: eaC.color, emissiveIntensity: 0.4,
            transparent: true, opacity: eaC.opacity - layer * 0.01,
            side: THREE.DoubleSide, depthWrite: false,
          }),
        );
        aPlane.position.set(layer * 0.8, layer * 0.4, layer * 0.5);
        aPlane.rotation.x = (Math.random() - 0.5) * 0.3;
        eAurora.add(aPlane);
      }
      eAurora.position.set(
        (Math.random() - 0.5) * w * 0.8,
        14 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.8,
      );
      eAurora.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(eAurora);
    }

    // ── Frost-covered pine trees ──
    const pineGreenMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.8 });
    const frostOverlayMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const pine = new THREE.Group();
      const pTrunkH = 1.5 + Math.random() * 1.5;
      const pTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, pTrunkH, 10), frozenWoodMat);
      pTrunk.position.y = pTrunkH / 2; pine.add(pTrunk);
      // Stacked cones decreasing upward
      const tiers = 3 + Math.floor(Math.random() * 2);
      for (let t = 0; t < tiers; t++) {
        const coneR = 0.8 - t * 0.15;
        const coneH = 1.0 - t * 0.1;
        const greenCone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 12), pineGreenMat);
        greenCone.position.y = pTrunkH + t * 0.7; pine.add(greenCone);
        // Frost overlay (slightly larger translucent white cone)
        const frostCone = new THREE.Mesh(new THREE.ConeGeometry(coneR + 0.05, coneH + 0.05, 12), frostOverlayMat);
        frostCone.position.y = pTrunkH + t * 0.7; pine.add(frostCone);
      }
      const ptX = (Math.random() - 0.5) * w * 0.7;
      const ptZ = (Math.random() - 0.5) * d * 0.7;
      pine.position.set(ptX, getTerrainHeight(ptX, ptZ, 1.4), ptZ);
      mctx.scene.add(pine);
    }
}

export function buildHauntedCathedral(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x332244, 0.03);
    mctx.applyTerrainColors(0x2a2233, 0x3a3344, 0.4);
    mctx.dirLight.color.setHex(0x665577);
    mctx.dirLight.intensity = 0.3;
    mctx.ambientLight.color.setHex(0x443355);
    mctx.ambientLight.intensity = 0.25;
    mctx.hemiLight.color.setHex(0x554466);
    mctx.hemiLight.groundColor.setHex(0x221133);

    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.9 });
    const lightStoneMat = new THREE.MeshStandardMaterial({ color: 0x666677, roughness: 0.85 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.5 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.7 });
    const webMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const coffinMat = new THREE.MeshStandardMaterial({ color: 0x3a2211, roughness: 0.9 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.85 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.5, metalness: 0.4 });
    const stainedGlassColors = [0xff4444, 0x4444ff, 0x44ff44, 0xffaa22, 0xaa44ff, 0xff44aa];

    // ── Gothic arches (tall pillars with arch tops) ──
    for (let i = 0; i < 14; i++) {
      const arch = new THREE.Group();
      const pillarH = 6 + Math.random() * 4;
      const pillarW = 0.6 + Math.random() * 0.4;
      const archSpan = 3 + Math.random() * 3;
      // Left pillar
      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(pillarW, pillarH, pillarW), darkStoneMat);
      leftPillar.position.set(-archSpan / 2, pillarH / 2, 0);
      arch.add(leftPillar);
      // Right pillar
      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(pillarW, pillarH, pillarW), darkStoneMat);
      rightPillar.position.set(archSpan / 2, pillarH / 2, 0);
      arch.add(rightPillar);
      // Arch top (pointed gothic arch using two angled boxes)
      const archBlock = new THREE.Mesh(
        new THREE.BoxGeometry(archSpan + pillarW, pillarW * 0.8, pillarW),
        darkStoneMat,
      );
      archBlock.position.y = pillarH;
      arch.add(archBlock);
      // Peaked top
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(archSpan * 0.4, 1.5, 17),
        darkStoneMat,
      );
      peak.position.y = pillarH + 1;
      peak.rotation.y = Math.PI / 4;
      arch.add(peak);
      const ax = (Math.random() - 0.5) * w * 0.7;
      const az = (Math.random() - 0.5) * d * 0.7;
      arch.position.set(ax, getTerrainHeight(ax, az, 0.4), az);
      arch.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(arch);
    }

    // ── Stained glass windows ──
    for (let i = 0; i < 10; i++) {
      const glassColor = stainedGlassColors[Math.floor(Math.random() * stainedGlassColors.length)];
      const glassH = 2 + Math.random() * 3;
      const glassW = 1 + Math.random() * 1.5;
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(glassW, glassH),
        new THREE.MeshStandardMaterial({
          color: glassColor,
          emissive: glassColor,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        }),
      );
      const gx = (Math.random() - 0.5) * w * 0.7;
      const gz = (Math.random() - 0.5) * d * 0.7;
      glass.position.set(gx, 3 + Math.random() * 4, gz);
      glass.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(glass);
      // Light behind window
      const windowLight = new THREE.PointLight(glassColor, 0.4, 6);
      windowLight.position.set(gx, glass.position.y, gz);
      mctx.scene.add(windowLight);
      mctx.torchLights.push(windowLight);
    }

    // ── Broken pews ──
    for (let i = 0; i < 22; i++) {
      const pew = new THREE.Group();
      const pewLen = 2 + Math.random() * 2;
      // Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(pewLen, 0.1, 0.5), woodMat);
      seat.position.y = 0.5;
      pew.add(seat);
      // Back
      const back = new THREE.Mesh(new THREE.BoxGeometry(pewLen, 0.8, 0.08), woodMat);
      back.position.set(0, 0.9, -0.2);
      pew.add(back);
      // Legs
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), woodMat);
      leg1.position.set(-pewLen / 2 + 0.1, 0.25, 0.15);
      pew.add(leg1);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), woodMat);
      leg2.position.set(pewLen / 2 - 0.1, 0.25, 0.15);
      pew.add(leg2);
      const px = (Math.random() - 0.5) * w * 0.5;
      const pz = (Math.random() - 0.5) * d * 0.5;
      pew.position.set(px, getTerrainHeight(px, pz, 0.4), pz);
      pew.rotation.y = Math.floor(Math.random() * 2) * Math.PI + (Math.random() - 0.5) * 0.3;
      pew.rotation.z = (Math.random() - 0.5) * 0.15;
      mctx.scene.add(pew);
    }

    // ── Candelabras ──
    for (let i = 0; i < 8; i++) {
      const candelabra = new THREE.Group();
      const baseH = 1.5 + Math.random() * 1;
      // Main pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, baseH, 10), ironMat);
      pole.position.y = baseH / 2;
      candelabra.add(pole);
      // Base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.1, 10), ironMat);
      base.position.y = 0.05;
      candelabra.add(base);
      // Arms and candles
      const armCount = 3 + Math.floor(Math.random() * 3);
      for (let a = 0; a < armCount; a++) {
        const armAngle = (a / armCount) * Math.PI * 2;
        const armLen = 0.3 + Math.random() * 0.2;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, armLen, 16), ironMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(Math.cos(armAngle) * armLen * 0.5, baseH, Math.sin(armAngle) * armLen * 0.5);
        candelabra.add(arm);
        // Candle flame light
        const candleLight = new THREE.PointLight(0xffaa44, 0.5, 5);
        candleLight.position.set(Math.cos(armAngle) * armLen, baseH + 0.3, Math.sin(armAngle) * armLen);
        candelabra.add(candleLight);
        mctx.torchLights.push(candleLight);
      }
      const cx = (Math.random() - 0.5) * w * 0.6;
      const cz = (Math.random() - 0.5) * d * 0.6;
      candelabra.position.set(cx, getTerrainHeight(cx, cz, 0.4), cz);
      mctx.scene.add(candelabra);
    }

    // ── Tombstones ──
    for (let i = 0; i < 18; i++) {
      const tombH = 0.8 + Math.random() * 1.2;
      const tombW = 0.5 + Math.random() * 0.4;
      const tomb = new THREE.Mesh(
        new THREE.BoxGeometry(tombW, tombH, 0.15),
        lightStoneMat,
      );
      const tX = (Math.random() - 0.5) * w * 0.8;
      const tZ = (Math.random() - 0.5) * d * 0.8;
      tomb.position.set(tX, getTerrainHeight(tX, tZ, 0.4) + tombH / 2, tZ);
      tomb.rotation.y = (Math.random() - 0.5) * 0.3;
      tomb.rotation.z = (Math.random() - 0.5) * 0.1;
      mctx.scene.add(tomb);
      // Small cross on top (some)
      if (Math.random() > 0.5) {
        const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), lightStoneMat);
        cross1.position.set(tX, getTerrainHeight(tX, tZ, 0.4) + tombH + 0.15, tZ);
        mctx.scene.add(cross1);
        const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), lightStoneMat);
        cross2.position.set(tX, getTerrainHeight(tX, tZ, 0.4) + tombH + 0.2, tZ);
        mctx.scene.add(cross2);
      }
    }

    // ── Flying buttresses ──
    for (let i = 0; i < 10; i++) {
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 5 + Math.random() * 3, 0.4),
        darkStoneMat,
      );
      const bx = (Math.random() - 0.5) * w * 0.75;
      const bz = (Math.random() - 0.5) * d * 0.75;
      buttress.position.set(bx, 2.5, bz);
      buttress.rotation.z = (Math.random() - 0.5) * 0.6;
      buttress.rotation.x = (Math.random() - 0.5) * 0.3;
      mctx.scene.add(buttress);
    }

    // ── Grand altars ──
    for (let i = 0; i < 5; i++) {
      const altar = new THREE.Group();
      // Platform base
      const platform = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 2), darkStoneMat);
      platform.position.y = 0.2;
      altar.add(platform);
      // Upper slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 1.5), lightStoneMat);
      slab.position.y = 0.5;
      altar.add(slab);
      // Candles on altar
      for (let c = 0; c < 4; c++) {
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 17), new THREE.MeshStandardMaterial({ color: 0xeeeecc }));
        candle.position.set(-1 + c * 0.6, 0.75, 0);
        altar.add(candle);
      }
      const altarLight = new THREE.PointLight(0xffaa44, 0.4, 5);
      altarLight.position.set(0, 1.2, 0);
      altar.add(altarLight);
      mctx.torchLights.push(altarLight);
      const altX = (Math.random() - 0.5) * w * 0.5;
      const altZ = (Math.random() - 0.5) * d * 0.5;
      altar.position.set(altX, getTerrainHeight(altX, altZ, 0.4), altZ);
      altar.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(altar);
    }

    // ── Hanging chains ──
    for (let i = 0; i < 12; i++) {
      const chainH = 3 + Math.random() * 5;
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, chainH, 16),
        ironMat,
      );
      chain.position.set(
        (Math.random() - 0.5) * w * 0.7,
        8 + Math.random() * 2,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(chain);
    }

    // ── Scattered bones and skulls ──
    for (let i = 0; i < 28; i++) {
      if (Math.random() > 0.3) {
        // Bone
        const boneLen = 0.2 + Math.random() * 0.4;
        const bone = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.03, boneLen),
          boneMat,
        );
        const boneX = (Math.random() - 0.5) * w * 0.8;
        const boneZ = (Math.random() - 0.5) * d * 0.8;
        bone.position.set(boneX, getTerrainHeight(boneX, boneZ, 0.4) + 0.02, boneZ);
        bone.rotation.y = Math.random() * Math.PI;
        mctx.scene.add(bone);
      } else {
        // Skull
        const skull = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 20, 17),
          boneMat,
        );
        skull.scale.set(1, 0.85, 1.1);
        const skX = (Math.random() - 0.5) * w * 0.8;
        const skZ = (Math.random() - 0.5) * d * 0.8;
        skull.position.set(skX, getTerrainHeight(skX, skZ, 0.4) + 0.08, skZ);
        mctx.scene.add(skull);
      }
    }

    // ── Wall sconces with purple fire ──
    for (let i = 0; i < 10; i++) {
      const sconce = new THREE.Group();
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.15), ironMat);
      sconce.add(bracket);
      const scLight = new THREE.PointLight(0xaa44ff, 0.6, 8);
      scLight.position.set(0, 0.3, 0.1);
      sconce.add(scLight);
      mctx.torchLights.push(scLight);
      // Flame visual
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 17, 17),
        new THREE.MeshStandardMaterial({ color: 0xbb55ff, emissive: 0xaa44ff, emissiveIntensity: 1.0 }),
      );
      flame.position.set(0, 0.25, 0.1);
      sconce.add(flame);
      sconce.position.set(
        (Math.random() - 0.5) * w * 0.7,
        3 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(sconce);
    }

    // ── Collapsed wall sections ──
    for (let i = 0; i < 8; i++) {
      const wallH = 2 + Math.random() * 3;
      const wallW = 3 + Math.random() * 4;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(wallW, wallH, 0.4),
        darkStoneMat,
      );
      const wX = (Math.random() - 0.5) * w * 0.7;
      const wZ = (Math.random() - 0.5) * d * 0.7;
      wall.position.set(wX, wallH * 0.3, wZ);
      wall.rotation.z = (Math.random() - 0.5) * 0.5;
      wall.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(wall);
    }

    // ── Bell towers ──
    for (let i = 0; i < 5; i++) {
      const tower = new THREE.Group();
      const towerH = 8 + Math.random() * 4;
      const towerR = 1 + Math.random() * 0.5;
      const towerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(towerR * 0.8, towerR, towerH, 10),
        darkStoneMat,
      );
      towerBody.position.y = towerH / 2;
      tower.add(towerBody);
      // Bell
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 14, 10),
        ironMat,
      );
      bell.scale.y = 0.7;
      bell.position.y = towerH - 0.5;
      tower.add(bell);
      // Roof
      const towerRoof = new THREE.Mesh(
        new THREE.ConeGeometry(towerR * 1.1, 2, 10),
        darkStoneMat,
      );
      towerRoof.position.y = towerH + 1;
      tower.add(towerRoof);
      const twX = (Math.random() - 0.5) * w * 0.7;
      const twZ = (Math.random() - 0.5) * d * 0.7;
      tower.position.set(twX, getTerrainHeight(twX, twZ, 0.4), twZ);
      mctx.scene.add(tower);
    }

    // ── Cracked floor tiles ──
    for (let i = 0; i < 18; i++) {
      const tileSize = 1 + Math.random() * 1.5;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, 0.08, tileSize),
        tileMat,
      );
      const tiX = (Math.random() - 0.5) * w * 0.7;
      const tiZ = (Math.random() - 0.5) * d * 0.7;
      tile.position.set(tiX, getTerrainHeight(tiX, tiZ, 0.4) + 0.04, tiZ);
      tile.rotation.y = Math.random() * 0.3;
      mctx.scene.add(tile);
    }

    // ── Cobwebs ──
    for (let i = 0; i < 12; i++) {
      const webSize = 1 + Math.random() * 2;
      const web = new THREE.Mesh(
        new THREE.PlaneGeometry(webSize, webSize),
        webMat,
      );
      web.position.set(
        (Math.random() - 0.5) * w * 0.7,
        2 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.7,
      );
      web.rotation.y = Math.random() * Math.PI;
      web.rotation.x = (Math.random() - 0.5) * 0.5;
      mctx.scene.add(web);
    }

    // ── Ghostly wisps ──
    for (let i = 0; i < 6; i++) {
      const wisp = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 23, 17),
        new THREE.MeshStandardMaterial({
          color: 0x88aaff,
          emissive: 0x6688dd,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.35,
        }),
      );
      const wx = (Math.random() - 0.5) * w * 0.7;
      const wz = (Math.random() - 0.5) * d * 0.7;
      wisp.position.set(wx, 1 + Math.random() * 3, wz);
      mctx.scene.add(wisp);
      const wispLight = new THREE.PointLight(0x6688dd, 0.3, 5);
      wispLight.position.copy(wisp.position);
      mctx.scene.add(wispLight);
      mctx.torchLights.push(wispLight);
    }

    // ── Coffins ──
    for (let i = 0; i < 5; i++) {
      const coffin = new THREE.Group();
      // Box
      const coffinBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 2), coffinMat);
      coffinBox.position.y = 0.2;
      coffin.add(coffinBox);
      // Lid (some open / tilted)
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 2.05), coffinMat);
      if (Math.random() > 0.5) {
        // Open lid, tilted
        lid.position.set(0.4, 0.5, 0);
        lid.rotation.z = -0.7;
      } else {
        lid.position.y = 0.44;
      }
      coffin.add(lid);
      const coX = (Math.random() - 0.5) * w * 0.6;
      const coZ = (Math.random() - 0.5) * d * 0.6;
      coffin.position.set(coX, getTerrainHeight(coX, coZ, 0.4), coZ);
      coffin.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(coffin);
    }

    // ── Organ pipes ──
    for (let i = 0; i < 4; i++) {
      const organ = new THREE.Group();
      const pipeCount = 5 + Math.floor(Math.random() * 5);
      for (let p = 0; p < pipeCount; p++) {
        const pH = 2 + Math.random() * 4;
        const pR = 0.06 + Math.random() * 0.08;
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(pR, pR, pH, 10),
          pipeMat,
        );
        pipe.position.set(p * 0.25 - pipeCount * 0.125, pH / 2, 0);
        organ.add(pipe);
      }
      const ogX = (Math.random() - 0.5) * w * 0.5;
      const ogZ = (Math.random() - 0.5) * d * 0.5;
      organ.position.set(ogX, getTerrainHeight(ogX, ogZ, 0.4), ogZ);
      organ.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(organ);
    }

    // ── Larger organ pipe wall (grand organ) ──
    const grandOrgan = new THREE.Group();
    const goX = (Math.random() - 0.5) * w * 0.3, goZ = (Math.random() - 0.5) * d * 0.3;
    // Back panel
    const organBack = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 0.3), darkStoneMat);
    organBack.position.y = 4;
    grandOrgan.add(organBack);
    // Pipes in rows
    for (let row = 0; row < 3; row++) {
      const rowPipes = 8 + row * 3;
      for (let p = 0; p < rowPipes; p++) {
        const pHeight = 2 + (rowPipes - p) * 0.3 + Math.random() * 0.5;
        const pRadius = 0.04 + (rowPipes - p) * 0.005;
        const gPipe = new THREE.Mesh(new THREE.CylinderGeometry(pRadius, pRadius, pHeight, 10), pipeMat);
        gPipe.position.set(-2.5 + p * (5 / rowPipes), pHeight / 2 + 1.5 + row * 2, -0.1 + row * 0.15);
        grandOrgan.add(gPipe);
      }
    }
    // Ornamental top
    const organCrown = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 17), darkStoneMat);
    organCrown.position.set(0, 8.5, 0);
    organCrown.rotation.y = Math.PI / 4;
    grandOrgan.add(organCrown);
    grandOrgan.position.set(goX, getTerrainHeight(goX, goZ, 0.4), goZ);
    grandOrgan.rotation.y = Math.random() * Math.PI;
    mctx.scene.add(grandOrgan);

    // ── Stained glass rose window (circular) ──
    for (let i = 0; i < 4; i++) {
      const roseWindow = new THREE.Group();
      const rwR = 2 + Math.random() * 1.5;
      // Outer frame
      const frame = new THREE.Mesh(new THREE.TorusGeometry(rwR, 0.15, 23, 44), darkStoneMat);
      roseWindow.add(frame);
      // Inner spokes
      for (let s = 0; s < 8; s++) {
        const sAngle = (s / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, rwR * 1.8, 0.06), darkStoneMat);
        spoke.rotation.z = sAngle;
        roseWindow.add(spoke);
      }
      // Colored glass panels between spokes
      for (let p = 0; p < 8; p++) {
        const pAngle = (p / 8) * Math.PI * 2 + Math.PI / 8;
        const glassClr = stainedGlassColors[p % stainedGlassColors.length];
        const pane = new THREE.Mesh(
          new THREE.CircleGeometry(rwR * 0.4, 17),
          new THREE.MeshStandardMaterial({ color: glassClr, emissive: glassClr, emissiveIntensity: 0.5, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
        );
        pane.position.set(Math.cos(pAngle) * rwR * 0.5, Math.sin(pAngle) * rwR * 0.5, 0);
        roseWindow.add(pane);
      }
      // Light from window
      const rwLight = new THREE.PointLight(stainedGlassColors[i % stainedGlassColors.length], 0.5, 8);
      rwLight.position.set(0, 0, 0.5);
      roseWindow.add(rwLight);
      mctx.torchLights.push(rwLight);
      roseWindow.position.set(
        (Math.random() - 0.5) * w * 0.65, 5 + Math.random() * 4, (Math.random() - 0.5) * d * 0.65,
      );
      roseWindow.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(roseWindow);
    }

    // ── More detailed broken pews (scattered debris) ──
    for (let i = 0; i < 15; i++) {
      const debris = new THREE.Group();
      const debrisCount = 3 + Math.floor(Math.random() * 4);
      for (let d2 = 0; d2 < debrisCount; d2++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(0.3 + Math.random() * 0.8, 0.06, 0.1 + Math.random() * 0.2),
          woodMat,
        );
        plank.position.set((Math.random() - 0.5) * 1.5, 0.03, (Math.random() - 0.5) * 1.5);
        plank.rotation.y = Math.random() * Math.PI;
        plank.rotation.z = (Math.random() - 0.5) * 0.3;
        debris.add(plank);
      }
      const dbX = (Math.random() - 0.5) * w * 0.6;
      const dbZ = (Math.random() - 0.5) * d * 0.6;
      debris.position.set(dbX, getTerrainHeight(dbX, dbZ, 0.4), dbZ);
      mctx.scene.add(debris);
    }

    // ── Spectral mist (purple/blue haze layers) ──
    const spectralMistMat = new THREE.MeshStandardMaterial({
      color: 0x6644aa, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 10; i++) {
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(6 + Math.random() * 8, 4 + Math.random() * 4),
        spectralMistMat,
      );
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(
        (Math.random() - 0.5) * w * 0.7, 0.2 + Math.random() * 0.5, (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(mist);
    }

    // ── Floating candles (hovering with warm light) ──
    for (let i = 0; i < 18; i++) {
      const floatCandle = new THREE.Group();
      const candleH = 0.2 + Math.random() * 0.15;
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, candleH, 17),
        new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.6 }));
      floatCandle.add(candle);
      // Flame
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xffaa33, emissiveIntensity: 1.2 }));
      flame.position.y = candleH / 2 + 0.02;
      flame.scale.y = 1.5;
      floatCandle.add(flame);
      // Candle light
      const cndLight = new THREE.PointLight(0xffaa44, 0.3, 4);
      cndLight.position.y = candleH / 2 + 0.1;
      floatCandle.add(cndLight);
      mctx.torchLights.push(cndLight);
      floatCandle.position.set(
        (Math.random() - 0.5) * w * 0.6, 1.5 + Math.random() * 4, (Math.random() - 0.5) * d * 0.6,
      );
      mctx.scene.add(floatCandle);
    }

    // ── Gargoyle statues ──
    for (let i = 0; i < 8; i++) {
      const gargoyle = new THREE.Group();
      // Body (crouched)
      const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), darkStoneMat);
      gBody.position.y = 0.25;
      gargoyle.add(gBody);
      // Head
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 20), darkStoneMat);
      gHead.position.set(0, 0.6, 0.35);
      gargoyle.add(gHead);
      // Horns
      const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 16), darkStoneMat);
      horn1.position.set(-0.12, 0.8, 0.35);
      horn1.rotation.z = 0.3;
      gargoyle.add(horn1);
      const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 16), darkStoneMat);
      horn2.position.set(0.12, 0.8, 0.35);
      horn2.rotation.z = -0.3;
      gargoyle.add(horn2);
      // Wings (folded)
      const wing1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.9, side: THREE.DoubleSide }));
      wing1.position.set(-0.4, 0.4, 0);
      wing1.rotation.y = 0.5;
      gargoyle.add(wing1);
      const wing2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.9, side: THREE.DoubleSide }));
      wing2.position.set(0.4, 0.4, 0);
      wing2.rotation.y = -0.5;
      gargoyle.add(wing2);
      // Glowing eyes
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.0 }));
      eye1.position.set(-0.07, 0.62, 0.5);
      gargoyle.add(eye1);
      const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.0 }));
      eye2.position.set(0.07, 0.62, 0.5);
      gargoyle.add(eye2);
      const grgX = (Math.random() - 0.5) * w * 0.7;
      const grgZ = (Math.random() - 0.5) * d * 0.7;
      gargoyle.position.set(grgX, 4 + Math.random() * 4, grgZ);
      gargoyle.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(gargoyle);
    }


    // ── Stained glass window detail (colored circle segments in arched frames) ──
    for (let i = 0; i < 6; i++) {
      const sgWindow = new THREE.Group();
      const sgW = 1.5 + Math.random() * 1;
      const sgH = 3 + Math.random() * 2;
      // Stone frame
      const sgFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, sgH, 0.15), darkStoneMat);
      sgFrameLeft.position.set(-sgW / 2, sgH / 2, 0);
      sgWindow.add(sgFrameLeft);
      const sgFrameRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, sgH, 0.15), darkStoneMat);
      sgFrameRight.position.set(sgW / 2, sgH / 2, 0);
      sgWindow.add(sgFrameRight);
      const sgFrameTop = new THREE.Mesh(new THREE.BoxGeometry(sgW + 0.15, 0.15, 0.15), darkStoneMat);
      sgFrameTop.position.y = sgH;
      sgWindow.add(sgFrameTop);
      // Pointed arch top
      const sgPeak = new THREE.Mesh(new THREE.ConeGeometry(sgW * 0.35, 0.8, 3), darkStoneMat);
      sgPeak.position.y = sgH + 0.4;
      sgPeak.rotation.y = Math.PI / 6;
      sgWindow.add(sgPeak);
      // Colored glass segments
      const segCount = 6 + Math.floor(Math.random() * 4);
      for (let sg = 0; sg < segCount; sg++) {
        const segColor = stainedGlassColors[sg % stainedGlassColors.length];
        const segY = 0.5 + sg * (sgH / segCount);
        const segPane = new THREE.Mesh(
          new THREE.PlaneGeometry(sgW * 0.85 / 2, sgH / segCount * 0.85),
          new THREE.MeshStandardMaterial({ color: segColor, emissive: segColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
        );
        segPane.position.set(sg % 2 === 0 ? -sgW * 0.2 : sgW * 0.2, segY, 0);
        sgWindow.add(segPane);
      }
      // Central medallion (circular)
      const medallion = new THREE.Mesh(
        new THREE.CircleGeometry(sgW * 0.2, 20),
        new THREE.MeshStandardMaterial({ color: stainedGlassColors[i % stainedGlassColors.length], emissive: stainedGlassColors[i % stainedGlassColors.length], emissiveIntensity: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      medallion.position.set(0, sgH * 0.6, 0.01);
      sgWindow.add(medallion);
      // Dividing mullions
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, sgH * 0.8, 0.04), darkStoneMat);
      mullion.position.y = sgH * 0.45;
      sgWindow.add(mullion);
      const sgLight = new THREE.PointLight(stainedGlassColors[i % stainedGlassColors.length], 0.4, 7);
      sgLight.position.set(0, sgH * 0.5, 0.5);
      sgWindow.add(sgLight);
      mctx.torchLights.push(sgLight);
      sgWindow.position.set(
        (Math.random() - 0.5) * w * 0.65,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.65,
      );
      sgWindow.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(sgWindow);
    }

    // ── Broken pew rows (boxes with gaps) ──
    for (let i = 0; i < 4; i++) {
      const pewRow = new THREE.Group();
      const rowLen = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < rowLen; p++) {
        if (Math.random() > 0.15) {
          const rowPew = new THREE.Group();
          const pewL = 1.5 + Math.random() * 0.5;
          const pewSeat = new THREE.Mesh(new THREE.BoxGeometry(pewL, 0.08, 0.45), woodMat);
          pewSeat.position.y = 0.45;
          rowPew.add(pewSeat);
          const pewBack = new THREE.Mesh(new THREE.BoxGeometry(pewL, 0.7, 0.06), woodMat);
          pewBack.position.set(0, 0.8, -0.19);
          rowPew.add(pewBack);
          const pewLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), woodMat);
          pewLeg1.position.set(-pewL / 2 + 0.08, 0.225, 0.12);
          rowPew.add(pewLeg1);
          const pewLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), woodMat);
          pewLeg2.position.set(pewL / 2 - 0.08, 0.225, 0.12);
          rowPew.add(pewLeg2);
          // Armrest detail
          if (p === 0 || p === rowLen - 1) {
            const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), woodMat);
            armrest.position.set(p === 0 ? -pewL / 2 - 0.03 : pewL / 2 + 0.03, 0.55, 0);
            rowPew.add(armrest);
          }
          rowPew.position.set(p * 1.8, 0, 0);
          rowPew.rotation.z = (Math.random() - 0.5) * 0.08;
          pewRow.add(rowPew);
        }
      }
      const prX = (Math.random() - 0.5) * w * 0.45;
      const prZ = (Math.random() - 0.5) * d * 0.45;
      pewRow.position.set(prX, getTerrainHeight(prX, prZ, 0.4), prZ);
      pewRow.rotation.y = (Math.random() - 0.5) * 0.2;
      mctx.scene.add(pewRow);
    }

    // ── Candelabra detail (branching cylinders with small spheres on top) ──
    for (let i = 0; i < 6; i++) {
      const detailedCandelabra = new THREE.Group();
      const dcBaseH = 1.8 + Math.random() * 0.8;
      // Ornate base
      const dcBase1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.1, 10), ironMat);
      dcBase1.position.y = 0.05;
      detailedCandelabra.add(dcBase1);
      const dcBase2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.08, 10), ironMat);
      dcBase2.position.y = 0.14;
      detailedCandelabra.add(dcBase2);
      // Main stem
      const dcStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, dcBaseH, 17), ironMat);
      dcStem.position.y = dcBaseH / 2 + 0.18;
      detailedCandelabra.add(dcStem);
      // Decorative node
      const dcNode = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), ironMat);
      dcNode.position.y = dcBaseH * 0.5 + 0.18;
      detailedCandelabra.add(dcNode);
      // Branching arms with candles
      const dcArmCount = 5 + Math.floor(Math.random() * 3);
      for (let a = 0; a < dcArmCount; a++) {
        const dcArmAngle = (a / dcArmCount) * Math.PI * 2;
        const dcArmLen = 0.25 + Math.random() * 0.15;
        // Curved arm
        const dcArm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, dcArmLen, 12), ironMat);
        dcArm.rotation.z = Math.PI / 2;
        dcArm.position.set(Math.cos(dcArmAngle) * dcArmLen * 0.5, dcBaseH + 0.18, Math.sin(dcArmAngle) * dcArmLen * 0.5);
        detailedCandelabra.add(dcArm);
        // Up-turn at end
        const dcUpArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.12, 10), ironMat);
        dcUpArm.position.set(Math.cos(dcArmAngle) * dcArmLen, dcBaseH + 0.24, Math.sin(dcArmAngle) * dcArmLen);
        detailedCandelabra.add(dcUpArm);
        // Candle cup
        const dcCup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.02, 12), ironMat);
        dcCup.position.set(Math.cos(dcArmAngle) * dcArmLen, dcBaseH + 0.31, Math.sin(dcArmAngle) * dcArmLen);
        detailedCandelabra.add(dcCup);
        // Candle
        const dcCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0xeeeecc }));
        dcCandle.position.set(Math.cos(dcArmAngle) * dcArmLen, dcBaseH + 0.39, Math.sin(dcArmAngle) * dcArmLen);
        detailedCandelabra.add(dcCandle);
        // Flame sphere
        const dcFlame = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xffaa33, emissiveIntensity: 1.0 }));
        dcFlame.scale.y = 1.5;
        dcFlame.position.set(Math.cos(dcArmAngle) * dcArmLen, dcBaseH + 0.48, Math.sin(dcArmAngle) * dcArmLen);
        detailedCandelabra.add(dcFlame);
      }
      const dcLight = new THREE.PointLight(0xffaa44, 0.6, 6);
      dcLight.position.set(0, dcBaseH + 0.5, 0);
      detailedCandelabra.add(dcLight);
      mctx.torchLights.push(dcLight);
      const dcX = (Math.random() - 0.5) * w * 0.55;
      const dcZ = (Math.random() - 0.5) * d * 0.55;
      detailedCandelabra.position.set(dcX, getTerrainHeight(dcX, dcZ, 0.4), dcZ);
      mctx.scene.add(detailedCandelabra);
    }

    // ── Fallen chandelier wreckage ──
    for (let i = 0; i < 3; i++) {
      const fallenChand = new THREE.Group();
      // Bent main ring
      const fcRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 16, 27), ironMat);
      fcRing.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      fcRing.rotation.z = (Math.random() - 0.5) * 0.3;
      fcRing.position.y = 0.15;
      fallenChand.add(fcRing);
      // Inner ring
      const fcInner = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 12, 20), ironMat);
      fcInner.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      fcInner.position.set(0.2, 0.12, 0.1);
      fallenChand.add(fcInner);
      // Broken chain segments
      for (let ch = 0; ch < 3; ch++) {
        const chainSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5 + Math.random() * 0.5, 10), ironMat);
        chainSeg.position.set((Math.random() - 0.5) * 1, 0.3, (Math.random() - 0.5) * 1);
        chainSeg.rotation.z = Math.random() * Math.PI;
        fallenChand.add(chainSeg);
      }
      // Scattered candle stubs
      for (let cs = 0; cs < 5; cs++) {
        const candStub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 12),
          new THREE.MeshStandardMaterial({ color: 0xeeeecc }));
        candStub.position.set((Math.random() - 0.5) * 2, 0.03, (Math.random() - 0.5) * 2);
        candStub.rotation.z = (Math.random() - 0.5) * 1.2;
        fallenChand.add(candStub);
      }
      // Wax puddle
      const waxPuddle = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.6 }));
      waxPuddle.rotation.x = -Math.PI / 2;
      waxPuddle.position.set((Math.random() - 0.5) * 0.5, 0.01, (Math.random() - 0.5) * 0.5);
      fallenChand.add(waxPuddle);
      // Broken ornamental arms
      for (let oa = 0; oa < 4; oa++) {
        const ornArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.4, 10), ironMat);
        const oaAngle = (oa / 4) * Math.PI * 2;
        ornArm.position.set(Math.cos(oaAngle) * 1, 0.08, Math.sin(oaAngle) * 1);
        ornArm.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        ornArm.rotation.y = oaAngle;
        fallenChand.add(ornArm);
      }
      const fcX = (Math.random() - 0.5) * w * 0.5;
      const fcZ = (Math.random() - 0.5) * d * 0.5;
      fallenChand.position.set(fcX, getTerrainHeight(fcX, fcZ, 0.4), fcZ);
      fallenChand.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(fallenChand);
    }

    // ── Altar with cloth draping detail ──
    for (let i = 0; i < 3; i++) {
      const detailedAltar = new THREE.Group();
      // Stone base with steps
      const altBase1 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 3), darkStoneMat);
      altBase1.position.y = 0.15;
      detailedAltar.add(altBase1);
      const altBase2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.25, 2.5), lightStoneMat);
      altBase2.position.y = 0.42;
      detailedAltar.add(altBase2);
      const altTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 2), lightStoneMat);
      altTop.position.y = 0.65;
      detailedAltar.add(altTop);
      // Cloth draping over edges
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x662244, roughness: 0.7, side: THREE.DoubleSide });
      const clothTop = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), clothMat);
      clothTop.rotation.x = -Math.PI / 2;
      clothTop.position.y = 0.76;
      detailedAltar.add(clothTop);
      // Cloth draping down front
      const clothFront = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), clothMat);
      clothFront.position.set(0, 0.5, 1.01);
      detailedAltar.add(clothFront);
      // Gold trim on cloth
      const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.3, metalness: 0.6 });
      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.03), goldTrimMat);
      trim.position.set(0, 0.27, 1.01);
      detailedAltar.add(trim);
      // Candles on altar
      for (let c = 0; c < 6; c++) {
        const altCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.25 + Math.random() * 0.1, 12),
          new THREE.MeshStandardMaterial({ color: 0xeeeecc }));
        altCandle.position.set(-1.2 + c * 0.5, 0.88, (Math.random() - 0.5) * 0.5);
        detailedAltar.add(altCandle);
        const altFlame = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xffaa33, emissiveIntensity: 1.0 }));
        altFlame.scale.y = 1.5;
        altFlame.position.set(altCandle.position.x, 1.02, altCandle.position.z);
        detailedAltar.add(altFlame);
      }
      // Sacred object (chalice)
      const chalice = new THREE.Group();
      const chaliceBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.02, 16), goldTrimMat);
      chalice.add(chaliceBase);
      const chaliceStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 12), goldTrimMat);
      chaliceStem.position.y = 0.07;
      chalice.add(chaliceStem);
      const chaliceCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.06, 16), goldTrimMat);
      chaliceCup.position.y = 0.16;
      chalice.add(chaliceCup);
      chalice.position.set(0, 0.77, 0);
      detailedAltar.add(chalice);
      const daLight = new THREE.PointLight(0xffaa44, 0.5, 6);
      daLight.position.set(0, 1.3, 0);
      detailedAltar.add(daLight);
      mctx.torchLights.push(daLight);
      const daX = (Math.random() - 0.5) * w * 0.45;
      const daZ = (Math.random() - 0.5) * d * 0.45;
      detailedAltar.position.set(daX, getTerrainHeight(daX, daZ, 0.4), daZ);
      detailedAltar.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(detailedAltar);
    }

    // ── Cracked floor tiles pattern ──
    for (let i = 0; i < 8; i++) {
      const tilePattern = new THREE.Group();
      const gridSize = 3 + Math.floor(Math.random() * 3);
      const tileW = 0.8 + Math.random() * 0.3;
      for (let tx = 0; tx < gridSize; tx++) {
        for (let tz = 0; tz < gridSize; tz++) {
          if (Math.random() > 0.1) {
            const floorTile = new THREE.Mesh(
              new THREE.BoxGeometry(tileW * 0.95, 0.06, tileW * 0.95),
              (tx + tz) % 2 === 0 ? tileMat : darkStoneMat,
            );
            floorTile.position.set(tx * tileW, 0.03, tz * tileW);
            floorTile.position.y += (Math.random() - 0.5) * 0.02;
            floorTile.rotation.y = (Math.random() - 0.5) * 0.05;
            tilePattern.add(floorTile);
            // Crack lines on some tiles
            if (Math.random() > 0.5) {
              const crackLine = new THREE.Mesh(
                new THREE.BoxGeometry(tileW * 0.7 * Math.random(), 0.004, 0.015),
                new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 }),
              );
              crackLine.position.set(tx * tileW + (Math.random() - 0.5) * 0.2, 0.065, tz * tileW + (Math.random() - 0.5) * 0.2);
              crackLine.rotation.y = Math.random() * Math.PI;
              tilePattern.add(crackLine);
            }
          }
        }
      }
      const tpX = (Math.random() - 0.5) * w * 0.6;
      const tpZ = (Math.random() - 0.5) * d * 0.6;
      tilePattern.position.set(tpX, getTerrainHeight(tpX, tpZ, 0.4), tpZ);
      tilePattern.rotation.y = Math.random() * Math.PI * 0.5;
      mctx.scene.add(tilePattern);
    }

    // ── Crumbling pillars with ivy ──
    const ivyMat = new THREE.MeshStandardMaterial({ color: 0x335522, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const ivyPillar = new THREE.Group();
      const pillarH = 4 + Math.random() * 5;
      const pillarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, pillarH, 12), lightStoneMat);
      pillarBody.position.y = pillarH / 2;
      pillarBody.rotation.z = (Math.random() - 0.5) * 0.1;
      ivyPillar.add(pillarBody);
      // Crumbled top
      const crumble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 2), lightStoneMat);
      crumble.position.y = pillarH;
      crumble.scale.y = 0.5;
      ivyPillar.add(crumble);
      // Ivy climbing up
      for (let v = 0; v < 5 + Math.floor(Math.random() * 4); v++) {
        const ivyH = 0.8 + Math.random() * 1.5;
        const ivyStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.15, ivyH), ivyMat);
        const ivyAngle = Math.random() * Math.PI * 2;
        ivyStrip.position.set(
          Math.cos(ivyAngle) * 0.45, pillarH * Math.random(), Math.sin(ivyAngle) * 0.45,
        );
        ivyStrip.rotation.y = ivyAngle + Math.PI / 2;
        ivyPillar.add(ivyStrip);
        // Ivy leaves
        for (let lf = 0; lf < 3; lf++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), ivyMat);
          leaf.position.set(
            Math.cos(ivyAngle) * 0.5, pillarH * Math.random(), Math.sin(ivyAngle) * 0.5,
          );
          leaf.rotation.y = Math.random() * Math.PI;
          ivyPillar.add(leaf);
        }
      }
      // Fallen stone debris at base
      for (let d2 = 0; d2 < 3; d2++) {
        const debris2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.1, 2), lightStoneMat);
        debris2.position.set((Math.random() - 0.5) * 1, 0.1, (Math.random() - 0.5) * 1);
        ivyPillar.add(debris2);
      }
      const ipX = (Math.random() - 0.5) * w * 0.65;
      const ipZ = (Math.random() - 0.5) * d * 0.65;
      ivyPillar.position.set(ipX, getTerrainHeight(ipX, ipZ, 0.4), ipZ);
      mctx.scene.add(ivyPillar);
    }

    // ── Chandelier remnants (hanging broken) ──
    for (let i = 0; i < 5; i++) {
      const chandelier = new THREE.Group();
      // Chain
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3 + Math.random() * 2, 16), ironMat);
      chain.position.y = 2;
      chandelier.add(chain);
      // Ring frame
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 20, 36), ironMat);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = (Math.random() - 0.5) * 0.3;
      chandelier.add(ring);
      // Candle holders (some missing)
      for (let c = 0; c < 6; c++) {
        if (Math.random() > 0.3) {
          const cAngle = (c / 6) * Math.PI * 2;
          const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 16), ironMat);
          holder.position.set(Math.cos(cAngle) * 0.8, -0.1, Math.sin(cAngle) * 0.8);
          chandelier.add(holder);
          // Candle stub
          if (Math.random() > 0.4) {
            const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 17),
              new THREE.MeshStandardMaterial({ color: 0xeeeecc }));
            stub.position.set(Math.cos(cAngle) * 0.8, -0.02, Math.sin(cAngle) * 0.8);
            chandelier.add(stub);
          }
        }
      }
      chandelier.position.set(
        (Math.random() - 0.5) * w * 0.5, 6 + Math.random() * 3, (Math.random() - 0.5) * d * 0.5,
      );
      mctx.scene.add(chandelier);
    }

    // ── Tombstones (more varied styles) ──
    for (let i = 0; i < 12; i++) {
      const tombGroup = new THREE.Group();
      const style = Math.floor(Math.random() * 3);
      if (style === 0) {
        // Cross tombstone
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), lightStoneMat);
        crossV.position.y = 0.6;
        tombGroup.add(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), lightStoneMat);
        crossH.position.y = 0.95;
        tombGroup.add(crossH);
      } else if (style === 1) {
        // Rounded top
        const roundBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.12), lightStoneMat);
        roundBase.position.y = 0.4;
        tombGroup.add(roundBase);
        const roundTop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2), lightStoneMat);
        roundTop.position.y = 0.8;
        tombGroup.add(roundTop);
      } else {
        // Obelisk
        const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.5, 17), lightStoneMat);
        obelisk.position.y = 0.75;
        tombGroup.add(obelisk);
        const oBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), lightStoneMat);
        oBase.position.y = 0.075;
        tombGroup.add(oBase);
      }
      const tbX = (Math.random() - 0.5) * w * 0.8;
      const tbZ = (Math.random() - 0.5) * d * 0.8;
      tombGroup.position.set(tbX, getTerrainHeight(tbX, tbZ, 0.4), tbZ);
      tombGroup.rotation.y = Math.random() * Math.PI;
      tombGroup.rotation.z = (Math.random() - 0.5) * 0.1;
      mctx.scene.add(tombGroup);
    }

    // ── More ghostly wisps with trails ──
    for (let i = 0; i < 10; i++) {
      const wispGrp = new THREE.Group();
      const wispClr = Math.random() > 0.5 ? 0x88aaff : 0xaa88ff;
      const wispCore = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 23, 17),
        new THREE.MeshStandardMaterial({ color: wispClr, emissive: wispClr, emissiveIntensity: 0.9, transparent: true, opacity: 0.4 }));
      wispGrp.add(wispCore);
      // Trail
      for (let t = 0; t < 4; t++) {
        const trail = new THREE.Mesh(new THREE.SphereGeometry(0.04 - t * 0.008, 17, 16),
          new THREE.MeshStandardMaterial({ color: wispClr, emissive: wispClr, emissiveIntensity: 0.4, transparent: true, opacity: 0.2 - t * 0.04, depthWrite: false }));
        trail.position.set((Math.random() - 0.5) * 0.3, -(t + 1) * 0.15, (Math.random() - 0.5) * 0.3);
        wispGrp.add(trail);
      }
      const wLight = new THREE.PointLight(wispClr, 0.4, 5);
      wispGrp.add(wLight);
      mctx.torchLights.push(wLight);
      wispGrp.position.set(
        (Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7,
      );
      mctx.scene.add(wispGrp);
    }

    // ── More purple fire sconces ──
    for (let i = 0; i < 8; i++) {
      const sc = new THREE.Group();
      const scBrk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.18), ironMat);
      sc.add(scBrk);
      const scLight = new THREE.PointLight(0xaa44ff, 0.5, 7);
      scLight.position.set(0, 0.35, 0.12);
      sc.add(scLight);
      mctx.torchLights.push(scLight);
      const scFlame = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 17),
        new THREE.MeshStandardMaterial({ color: 0xbb55ff, emissive: 0xaa44ff, emissiveIntensity: 1.0 }));
      scFlame.position.set(0, 0.3, 0.12);
      scFlame.scale.y = 1.3;
      sc.add(scFlame);
      sc.position.set((Math.random() - 0.5) * w * 0.7, 2.5 + Math.random() * 3.5, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(sc);
    }

    // ── Cracked mosaic floor patterns ──
    const mosaicColors = [0x553344, 0x445566, 0x665544, 0x554455];
    for (let i = 0; i < 8; i++) {
      const mosaic = new THREE.Group();
      const mR = 2 + Math.random() * 2;
      // Center medallion
      const medallion = new THREE.Mesh(new THREE.CircleGeometry(mR, 27),
        new THREE.MeshStandardMaterial({ color: mosaicColors[i % 4], roughness: 0.8 }));
      medallion.rotation.x = -Math.PI / 2;
      medallion.position.y = 0.015;
      mosaic.add(medallion);
      // Border ring
      const border = new THREE.Mesh(new THREE.RingGeometry(mR - 0.1, mR + 0.1, 17),
        new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.7 }));
      border.rotation.x = -Math.PI / 2;
      border.position.y = 0.02;
      mosaic.add(border);
      const mX = (Math.random() - 0.5) * w * 0.5;
      const mZ = (Math.random() - 0.5) * d * 0.5;
      mosaic.position.set(mX, getTerrainHeight(mX, mZ, 0.4), mZ);
      mctx.scene.add(mosaic);
    }

    // ── Atmospheric eerie lighting ──
    const eerieColors = [0x6644aa, 0x443388, 0x554477];
    for (let i = 0; i < 6; i++) {
      const eerie = new THREE.PointLight(eerieColors[i % 3], 0.25, 12);
      eerie.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(eerie);
    }

    // ── 1. Flying buttresses (angled supports on exterior walls) ──
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 5; i++) {
        const buttressGrp = new THREE.Group();
        const buttressH = 5 + Math.random() * 2;
        const buttressAngle = 0.75 + Math.random() * 0.15;
        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, buttressH, 12),
          darkStoneMat,
        );
        strut.rotation.z = side === 0 ? buttressAngle : -buttressAngle;
        strut.position.y = buttressH * 0.35;
        buttressGrp.add(strut);
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.5, 0.6), darkStoneMat);
        pier.position.set(side === 0 ? -buttressH * 0.4 : buttressH * 0.4, 1.75, 0);
        buttressGrp.add(pier);
        const pierCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 4), darkStoneMat);
        pierCap.position.set(pier.position.x, 3.7, 0);
        pierCap.rotation.y = Math.PI / 4;
        buttressGrp.add(pierCap);
        const archDeco = new THREE.Mesh(
          new THREE.TorusGeometry(1.2, 0.08, 8, 12, Math.PI * 0.4),
          darkStoneMat,
        );
        archDeco.position.set(side === 0 ? -1.0 : 1.0, buttressH * 0.5, 0);
        archDeco.rotation.z = side === 0 ? 0.3 : -0.3;
        buttressGrp.add(archDeco);
        const fbX = (side === 0 ? -1 : 1) * w * 0.3;
        const fbZ = -d * 0.35 + i * (d * 0.7 / 4);
        buttressGrp.position.set(fbX, getTerrainHeight(fbX, fbZ, 0.4), fbZ);
        mctx.scene.add(buttressGrp);
      }
    }

    // ── 2. Rose window (large circular stained glass on front facade) ──
    for (let rw = 0; rw < 2; rw++) {
      const roseWin = new THREE.Group();
      const rwRadius = 2.5 + Math.random() * 1.0;
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(rwRadius, 0.2, 16, 40), darkStoneMat);
      roseWin.add(outerRing);
      const midRing = new THREE.Mesh(new THREE.TorusGeometry(rwRadius * 0.65, 0.12, 12, 32), darkStoneMat);
      roseWin.add(midRing);
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(rwRadius * 0.3, 0.08, 10, 24), darkStoneMat);
      roseWin.add(innerRing);
      const petalCount = 12;
      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * Math.PI * 2;
        const divider = new THREE.Mesh(new THREE.BoxGeometry(0.06, rwRadius * 1.9, 0.06), darkStoneMat);
        divider.rotation.z = angle;
        roseWin.add(divider);
      }
      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * Math.PI * 2 + Math.PI / petalCount;
        const petalColor = stainedGlassColors[p % stainedGlassColors.length];
        const outerPetal = new THREE.Mesh(
          new THREE.CircleGeometry(rwRadius * 0.28, 6),
          new THREE.MeshStandardMaterial({ color: petalColor, emissive: petalColor, emissiveIntensity: 0.5, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
        );
        outerPetal.position.set(Math.cos(angle) * rwRadius * 0.5, Math.sin(angle) * rwRadius * 0.5, 0.01);
        roseWin.add(outerPetal);
        const innerPetalColor = stainedGlassColors[(p + 3) % stainedGlassColors.length];
        const innerPetal = new THREE.Mesh(
          new THREE.CircleGeometry(rwRadius * 0.15, 6),
          new THREE.MeshStandardMaterial({ color: innerPetalColor, emissive: innerPetalColor, emissiveIntensity: 0.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        );
        innerPetal.position.set(Math.cos(angle) * rwRadius * 0.22, Math.sin(angle) * rwRadius * 0.22, 0.01);
        roseWin.add(innerPetal);
      }
      const centerMed = new THREE.Mesh(
        new THREE.CircleGeometry(rwRadius * 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xffaa22, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      centerMed.position.z = 0.02;
      roseWin.add(centerMed);
      const roseLight = new THREE.PointLight(0xffaa44, 0.6, 10);
      roseLight.position.set(0, 0, 1.0);
      roseWin.add(roseLight);
      mctx.torchLights.push(roseLight);
      const rwX = (Math.random() - 0.5) * w * 0.3;
      const rwZ2 = rw === 0 ? -d * 0.35 : d * 0.35;
      roseWin.position.set(rwX, 7 + Math.random() * 2, rwZ2);
      roseWin.rotation.y = rw === 0 ? 0 : Math.PI;
      mctx.scene.add(roseWin);
    }

    // ── 3. Bell tower detail (bells, ropes, arched openings) ──
    for (let i = 0; i < 3; i++) {
      const bellTower = new THREE.Group();
      const btH = 10 + Math.random() * 4;
      const btR = 1.2 + Math.random() * 0.4;
      const btBody = new THREE.Mesh(new THREE.BoxGeometry(btR * 2, btH, btR * 2), darkStoneMat);
      btBody.position.y = btH / 2;
      bellTower.add(btBody);
      for (let s = 0; s < 4; s++) {
        const archOpening = new THREE.Group();
        const archPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.15), lightStoneMat);
        archPillarL.position.set(-0.5, 0, 0);
        archOpening.add(archPillarL);
        const archPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.15), lightStoneMat);
        archPillarR.position.set(0.5, 0, 0);
        archOpening.add(archPillarR);
        const archTop2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.15, 0.15), lightStoneMat);
        archTop2.position.y = 1.0;
        archOpening.add(archTop2);
        const archTip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 3), lightStoneMat);
        archTip.position.y = 1.35;
        archOpening.add(archTip);
        const voidPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.85, 1.8),
          new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 1.0 }),
        );
        voidPlane.position.z = -0.05;
        archOpening.add(voidPlane);
        const sAngle = (s / 4) * Math.PI * 2;
        archOpening.position.set(Math.sin(sAngle) * (btR + 0.08), btH - 2.5, Math.cos(sAngle) * (btR + 0.08));
        archOpening.rotation.y = sAngle;
        bellTower.add(archOpening);
      }
      const bell2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.7), ironMat);
      bell2.scale.y = 0.8;
      bell2.position.y = btH - 2.0;
      bellTower.add(bell2);
      const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), ironMat);
      clapper.position.y = btH - 2.5;
      bellTower.add(clapper);
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, btH * 0.7, 8),
        new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.9 }),
      );
      rope.position.y = btH * 0.35;
      bellTower.add(rope);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(btR * 0.9, 3.0, 4), darkStoneMat);
      spire.position.y = btH + 1.5;
      spire.rotation.y = Math.PI / 4;
      bellTower.add(spire);
      const spireV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), ironMat);
      spireV.position.y = btH + 3.3;
      bellTower.add(spireV);
      const spireH = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), ironMat);
      spireH.position.y = btH + 3.4;
      bellTower.add(spireH);
      const btX = (Math.random() - 0.5) * w * 0.5;
      const btZ = (Math.random() - 0.5) * d * 0.5;
      bellTower.position.set(btX, getTerrainHeight(btX, btZ, 0.4), btZ);
      mctx.scene.add(bellTower);
    }

    // ── 4. Gargoyle rainspouts (on building corners) ──
    for (let i = 0; i < 6; i++) {
      const grgSpout = new THREE.Group();
      const gargStoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.8, metalness: 0.05 });
      const gargDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.95 });
      const gargEyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6 });

      // Haunched body (torso + hunched back)
      const spTorso = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 20), gargStoneMat);
      spTorso.scale.set(1, 0.8, 1.3);
      spTorso.position.set(0, 0.25, 0.15);
      grgSpout.add(spTorso);
      // Spine ridge along the back
      for (let sp = 0; sp < 5; sp++) {
        const spineKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), gargStoneMat);
        spineKnob.position.set(0, 0.38 - sp * 0.04, -0.05 + sp * 0.06);
        grgSpout.add(spineKnob);
      }
      // Neck
      const spNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16), gargStoneMat);
      spNeck.position.set(0, 0.4, 0.35);
      spNeck.rotation.x = -0.4;
      grgSpout.add(spNeck);
      // Head (detailed, angular)
      const spHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 20), gargStoneMat);
      spHead.scale.set(1, 0.85, 1.2);
      spHead.position.set(0, 0.5, 0.45);
      grgSpout.add(spHead);
      // Brow ridge
      const browRidge = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), gargStoneMat);
      browRidge.position.set(0, 0.55, 0.52);
      browRidge.rotation.x = 0.3;
      grgSpout.add(browRidge);
      // Glowing eyes
      for (const eSide of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), gargEyeMat);
        eye.position.set(eSide * 0.06, 0.52, 0.58);
        grgSpout.add(eye);
      }
      // Snout / jaw
      const spSnout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 12), gargStoneMat);
      spSnout.position.set(0, 0.46, 0.6);
      spSnout.rotation.x = -Math.PI / 2;
      grgSpout.add(spSnout);
      // Open mouth
      const spMouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), gargDarkMat);
      spMouth.position.set(0, 0.44, 0.68);
      grgSpout.add(spMouth);
      // Lower jaw
      const lowerJaw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 10), gargStoneMat);
      lowerJaw.position.set(0, 0.41, 0.62);
      lowerJaw.rotation.x = -Math.PI / 2 + 0.3;
      grgSpout.add(lowerJaw);
      // Horns (curved using torus segments)
      for (const hSide of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 12), gargStoneMat);
        horn.position.set(hSide * 0.1, 0.6, 0.38);
        horn.rotation.z = hSide * 0.5;
        horn.rotation.x = -0.3;
        grgSpout.add(horn);
        // Horn ridges
        for (let hr = 0; hr < 3; hr++) {
          const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.025 - hr * 0.005, 0.005, 6, 12), gargStoneMat);
          ridge.position.set(hSide * (0.1 + hr * 0.015 * hSide), 0.6 + hr * 0.04, 0.38 - hr * 0.01);
          ridge.rotation.z = hSide * 0.5;
          grgSpout.add(ridge);
        }
      }
      // Pointed ears
      for (const eSide of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 10), gargStoneMat);
        ear.position.set(eSide * 0.15, 0.52, 0.42);
        ear.rotation.z = eSide * 0.8;
        grgSpout.add(ear);
      }
      // Wings (folded, with membrane and finger bones)
      for (const wSide of [-1, 1]) {
        // Wing membrane
        const wingMembrane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45, 4, 3), gargStoneMat);
        wingMembrane.position.set(wSide * 0.5, 0.35, 0.05);
        wingMembrane.rotation.y = wSide * 0.6;
        wingMembrane.rotation.z = wSide * 0.5;
        wingMembrane.rotation.x = 0.15;
        grgSpout.add(wingMembrane);
        // Wing bone spars
        for (let wb = 0; wb < 3; wb++) {
          const boneSpar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.45, 8), gargStoneMat);
          boneSpar.position.set(wSide * (0.25 + wb * 0.12), 0.38, 0.05 - wb * 0.02);
          boneSpar.rotation.z = wSide * (0.4 + wb * 0.15);
          boneSpar.rotation.x = 0.1;
          grgSpout.add(boneSpar);
        }
        // Wing claw tip
        const wingClaw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 8), gargStoneMat);
        wingClaw.position.set(wSide * 0.8, 0.55, 0.02);
        wingClaw.rotation.z = wSide * 1.2;
        grgSpout.add(wingClaw);
      }
      // Muscular arms gripping the ledge
      for (const aSide of [-1, 1]) {
        // Upper arm
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.2, 12), gargStoneMat);
        upperArm.position.set(aSide * 0.2, 0.15, 0.3);
        upperArm.rotation.z = aSide * 0.5;
        upperArm.rotation.x = -0.4;
        grgSpout.add(upperArm);
        // Forearm
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.18, 12), gargStoneMat);
        forearm.position.set(aSide * 0.25, 0.04, 0.4);
        forearm.rotation.x = -0.8;
        grgSpout.add(forearm);
        // Clawed hand
        for (let cl = 0; cl < 4; cl++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 8), gargStoneMat);
          claw.position.set(aSide * 0.25 + (cl - 1.5) * 0.015, -0.02, 0.48 + cl * 0.008);
          claw.rotation.x = -0.5;
          grgSpout.add(claw);
        }
      }
      // Legs (crouched)
      for (const lSide of [-1, 1]) {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.2, 12), gargStoneMat);
        thigh.position.set(lSide * 0.12, 0.08, 0.1);
        thigh.rotation.x = 0.6;
        thigh.rotation.z = lSide * 0.2;
        grgSpout.add(thigh);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.18, 12), gargStoneMat);
        shin.position.set(lSide * 0.14, -0.02, 0.2);
        shin.rotation.x = -0.3;
        grgSpout.add(shin);
        // Taloned feet
        for (let tl = 0; tl < 3; tl++) {
          const talon = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 8), gargStoneMat);
          talon.position.set(lSide * 0.14 + (tl - 1) * 0.02, -0.08, 0.28 + tl * 0.005);
          talon.rotation.x = -0.6;
          grgSpout.add(talon);
        }
      }
      // Tail (segmented, curling)
      let tailX = 0, tailY = 0.15, tailZ = -0.2;
      for (let tSeg = 0; tSeg < 6; tSeg++) {
        const tailSeg = new THREE.Mesh(new THREE.SphereGeometry(0.035 - tSeg * 0.004, 10, 8), gargStoneMat);
        tailSeg.position.set(tailX, tailY - tSeg * 0.02, tailZ - tSeg * 0.08);
        grgSpout.add(tailSeg);
      }
      // Tail spike
      const tailSpike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 8), gargStoneMat);
      tailSpike.position.set(0, 0.03, -0.7);
      tailSpike.rotation.x = Math.PI / 2;
      grgSpout.add(tailSpike);
      // Water channel from mouth
      const waterChannel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 12), darkStoneMat);
      waterChannel.rotation.x = Math.PI / 2;
      waterChannel.position.set(0, 0.4, 0.95);
      grgSpout.add(waterChannel);
      // Water drip
      const drip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x556688, transparent: true, opacity: 0.4 }));
      drip.position.set(0, 0.34, 1.25);
      grgSpout.add(drip);

      const gAngle = (i / 6) * Math.PI * 2;
      const grgSpX = Math.cos(gAngle) * w * 0.32;
      const grgSpZ = Math.sin(gAngle) * d * 0.32;
      grgSpout.position.set(grgSpX, 5 + Math.random() * 3, grgSpZ);
      grgSpout.rotation.y = gAngle + Math.PI;
      mctx.scene.add(grgSpout);
    }

    // ── 5. Ribbed vault ceiling hints (X-pattern arches overhead) ──
    for (let i = 0; i < 8; i++) {
      const vaultGrp = new THREE.Group();
      const vSpan = 3 + Math.random() * 3;
      const vHeight = 1.5 + Math.random() * 1.0;
      const rib1 = new THREE.Mesh(new THREE.TorusGeometry(vSpan * 0.7, 0.06, 8, 16, Math.PI), darkStoneMat);
      rib1.rotation.y = Math.PI / 4;
      rib1.rotation.x = Math.PI / 2;
      rib1.position.y = vHeight;
      vaultGrp.add(rib1);
      const rib2 = new THREE.Mesh(new THREE.TorusGeometry(vSpan * 0.7, 0.06, 8, 16, Math.PI), darkStoneMat);
      rib2.rotation.y = -Math.PI / 4;
      rib2.rotation.x = Math.PI / 2;
      rib2.position.y = vHeight;
      vaultGrp.add(rib2);
      const keystone = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), lightStoneMat);
      keystone.position.y = vHeight + vSpan * 0.7;
      vaultGrp.add(keystone);
      const transRib = new THREE.Mesh(new THREE.TorusGeometry(vSpan * 0.7, 0.05, 8, 16, Math.PI), darkStoneMat);
      transRib.rotation.x = Math.PI / 2;
      transRib.position.y = vHeight;
      vaultGrp.add(transRib);
      const vX = (Math.random() - 0.5) * w * 0.55;
      const vZ = (Math.random() - 0.5) * d * 0.55;
      vaultGrp.position.set(vX, 7 + Math.random() * 2, vZ);
      mctx.scene.add(vaultGrp);
    }

    // ── 6. Crypt entrance (descending stairway with iron gate) ──
    for (let ce = 0; ce < 2; ce++) {
      const cryptEntrance = new THREE.Group();
      const cryptArchL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), darkStoneMat);
      cryptArchL.position.set(-1.2, 1.25, 0);
      cryptEntrance.add(cryptArchL);
      const cryptArchR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), darkStoneMat);
      cryptArchR.position.set(1.2, 1.25, 0);
      cryptEntrance.add(cryptArchR);
      const cryptArchTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 0.4), darkStoneMat);
      cryptArchTop.position.y = 2.5;
      cryptEntrance.add(cryptArchTop);
      const archSkull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), boneMat);
      archSkull.scale.set(1, 0.85, 1.1);
      archSkull.position.set(0, 2.65, 0.15);
      cryptEntrance.add(archSkull);
      const stairCount = 8;
      for (let st = 0; st < stairCount; st++) {
        const stair = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 0.2, 0.5),
          st % 2 === 0 ? darkStoneMat : lightStoneMat,
        );
        stair.position.set(0, -st * 0.25, -st * 0.5);
        cryptEntrance.add(stair);
      }
      const stairWallL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, stairCount * 0.5), darkStoneMat);
      stairWallL.position.set(-1.1, 0, -stairCount * 0.25);
      stairWallL.rotation.x = Math.atan2(stairCount * 0.25, stairCount * 0.5) * 0.5;
      cryptEntrance.add(stairWallL);
      const stairWallR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, stairCount * 0.5), darkStoneMat);
      stairWallR.position.set(1.1, 0, -stairCount * 0.25);
      stairWallR.rotation.x = Math.atan2(stairCount * 0.25, stairCount * 0.5) * 0.5;
      cryptEntrance.add(stairWallR);
      const barCount = 7;
      for (let b = 0; b < barCount; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), ironMat);
        bar.position.set(-0.9 + b * (1.8 / (barCount - 1)), 1.1, 0.15);
        cryptEntrance.add(bar);
      }
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8), ironMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(0, 1.6, 0.15);
      cryptEntrance.add(hBar);
      const hBar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8), ironMat);
      hBar2.rotation.z = Math.PI / 2;
      hBar2.position.set(0, 0.6, 0.15);
      cryptEntrance.add(hBar2);
      const cryptLight = new THREE.PointLight(0x44ff66, 0.3, 6);
      cryptLight.position.set(0, -1.0, -2.0);
      cryptEntrance.add(cryptLight);
      mctx.torchLights.push(cryptLight);
      const ceX = (Math.random() - 0.5) * w * 0.4;
      const ceZ = (Math.random() - 0.5) * d * 0.4;
      cryptEntrance.position.set(ceX, getTerrainHeight(ceX, ceZ, 0.4), ceZ);
      cryptEntrance.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(cryptEntrance);
    }

    // ── 7. Cemetery expansion (varied gravestones + iron fence) ──
    {
      const cemeteryGrp = new THREE.Group();
      const cemX = (Math.random() - 0.5) * w * 0.3;
      const cemZ = d * 0.3;
      const cemW = 12, cemD2 = 8;
      const fencePostSpacing = 1.2;
      for (let side2 = 0; side2 < 4; side2++) {
        const fLen = side2 < 2 ? cemW : cemD2;
        const postCount = Math.floor(fLen / fencePostSpacing);
        for (let fp = 0; fp <= postCount; fp++) {
          const fPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), ironMat);
          let fpX = 0, fpZ = 0;
          const t = -fLen / 2 + fp * fencePostSpacing;
          if (side2 === 0) { fpX = t; fpZ = -cemD2 / 2; }
          else if (side2 === 1) { fpX = t; fpZ = cemD2 / 2; }
          else if (side2 === 2) { fpX = -cemW / 2; fpZ = t; }
          else { fpX = cemW / 2; fpZ = t; }
          fPost.position.set(fpX, 0.7, fpZ);
          cemeteryGrp.add(fPost);
          const fTip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), ironMat);
          fTip.position.set(fpX, 1.45, fpZ);
          cemeteryGrp.add(fTip);
        }
        for (let rail = 0; rail < 2; rail++) {
          const railY = 0.4 + rail * 0.6;
          const railMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, fLen, 8), ironMat);
          railMesh.rotation.z = Math.PI / 2;
          if (side2 === 0) { railMesh.position.set(0, railY, -cemD2 / 2); }
          else if (side2 === 1) { railMesh.position.set(0, railY, cemD2 / 2); }
          else if (side2 === 2) { railMesh.position.set(-cemW / 2, railY, 0); railMesh.rotation.z = 0; railMesh.rotation.x = Math.PI / 2; }
          else { railMesh.position.set(cemW / 2, railY, 0); railMesh.rotation.z = 0; railMesh.rotation.x = Math.PI / 2; }
          cemeteryGrp.add(railMesh);
        }
      }
      for (let gs = 0; gs < 20; gs++) {
        const gsType = Math.floor(Math.random() * 4);
        const gsGrp = new THREE.Group();
        if (gsType === 0) {
          const crossV2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), lightStoneMat);
          crossV2.position.y = 0.5;
          gsGrp.add(crossV2);
          const crossH2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), lightStoneMat);
          crossH2.position.y = 0.8;
          gsGrp.add(crossH2);
        } else if (gsType === 1) {
          const obel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), lightStoneMat);
          obel.position.y = 0.8;
          gsGrp.add(obel);
          const obelTop = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), lightStoneMat);
          obelTop.position.y = 1.8;
          obelTop.rotation.y = Math.PI / 4;
          gsGrp.add(obelTop);
        } else if (gsType === 2) {
          const angelBody = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.0, 12), lightStoneMat);
          angelBody.position.y = 0.5;
          gsGrp.add(angelBody);
          const angelHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), lightStoneMat);
          angelHead.position.y = 1.15;
          gsGrp.add(angelHead);
          const angelWingL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.03), lightStoneMat);
          angelWingL.position.set(-0.35, 0.8, 0);
          angelWingL.rotation.z = 0.3;
          angelWingL.rotation.y = 0.2;
          gsGrp.add(angelWingL);
          const angelWingR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.03), lightStoneMat);
          angelWingR.position.set(0.35, 0.8, 0);
          angelWingR.rotation.z = -0.3;
          angelWingR.rotation.y = -0.2;
          gsGrp.add(angelWingR);
          const angelBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), lightStoneMat);
          angelBase.position.y = 0.075;
          gsGrp.add(angelBase);
        } else {
          const slab2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9 + Math.random() * 0.4, 0.12), lightStoneMat);
          slab2.position.y = 0.45;
          gsGrp.add(slab2);
          const rndTop = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lightStoneMat);
          rndTop.position.y = 0.9;
          gsGrp.add(rndTop);
        }
        gsGrp.position.set((Math.random() - 0.5) * (cemW - 2), 0, (Math.random() - 0.5) * (cemD2 - 2));
        gsGrp.rotation.y = (Math.random() - 0.5) * 0.3;
        gsGrp.rotation.z = (Math.random() - 0.5) * 0.08;
        cemeteryGrp.add(gsGrp);
      }
      for (let bm = 0; bm < 8; bm++) {
        const mound = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: 0x3a3322, roughness: 0.95 }),
        );
        mound.position.set((Math.random() - 0.5) * (cemW - 2), 0, (Math.random() - 0.5) * (cemD2 - 2));
        mound.scale.set(1.2, 0.4, 0.8);
        cemeteryGrp.add(mound);
      }
      cemeteryGrp.position.set(cemX, getTerrainHeight(cemX, cemZ, 0.4), cemZ);
      mctx.scene.add(cemeteryGrp);
    }

    // ── 8. Organ pipes (grand wall of graduated pipes with console) ──
    for (let op = 0; op < 2; op++) {
      const organWall = new THREE.Group();
      const opBack = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.25), darkStoneMat);
      opBack.position.y = 3.5;
      organWall.add(opBack);
      const opPipeCount = 18;
      for (let p = 0; p < opPipeCount; p++) {
        const centerDist = Math.abs(p - opPipeCount / 2) / (opPipeCount / 2);
        const pH2 = 6 - centerDist * 3.5 + Math.random() * 0.3;
        const pR2 = 0.03 + (1 - centerDist) * 0.04;
        const opPipe = new THREE.Mesh(new THREE.CylinderGeometry(pR2, pR2, pH2, 10), pipeMat);
        opPipe.position.set(-2.2 + p * (4.4 / (opPipeCount - 1)), pH2 / 2 + 0.5, 0.15);
        organWall.add(opPipe);
        const pipeMouth = new THREE.Mesh(new THREE.BoxGeometry(pR2 * 3, 0.04, pR2 * 2), pipeMat);
        pipeMouth.position.set(opPipe.position.x, pH2 + 0.52, 0.15);
        organWall.add(pipeMouth);
      }
      const opCrown = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 0.35), darkStoneMat);
      opCrown.position.y = 7.15;
      organWall.add(opCrown);
      for (let fi = 0; fi < 3; fi++) {
        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), darkStoneMat);
        finial.position.set(-2 + fi * 2, 7.55, 0);
        organWall.add(finial);
      }
      const consoleGrp = new THREE.Group();
      const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.8), woodMat);
      consoleBody.position.y = 0.5;
      consoleGrp.add(consoleBody);
      const keyboard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.5 }));
      keyboard.position.set(0, 1.05, 0.05);
      keyboard.rotation.x = -0.3;
      consoleGrp.add(keyboard);
      const musicStand = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.04), woodMat);
      musicStand.position.set(0, 1.5, -0.15);
      musicStand.rotation.x = -0.15;
      consoleGrp.add(musicStand);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35), woodMat);
      bench.position.set(0, 0.5, 0.7);
      consoleGrp.add(bench);
      const benchLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), woodMat);
      benchLeg1.position.set(-0.5, 0.25, 0.7);
      consoleGrp.add(benchLeg1);
      const benchLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), woodMat);
      benchLeg2.position.set(0.5, 0.25, 0.7);
      consoleGrp.add(benchLeg2);
      consoleGrp.position.set(0, 0, 1.0);
      organWall.add(consoleGrp);
      const opX = (Math.random() - 0.5) * w * 0.35;
      const opZ = (Math.random() - 0.5) * d * 0.35;
      organWall.position.set(opX, getTerrainHeight(opX, opZ, 0.4), opZ);
      organWall.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(organWall);
    }

    // ── 9. Torn curtains/tapestries ──
    const tapestryMats = [
      new THREE.MeshStandardMaterial({ color: 0x661133, roughness: 0.7, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
      new THREE.MeshStandardMaterial({ color: 0x441155, roughness: 0.7, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }),
      new THREE.MeshStandardMaterial({ color: 0x552244, roughness: 0.7, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    ];
    for (let tc = 0; tc < 10; tc++) {
      const tapestry = new THREE.Group();
      const tapH = 2.5 + Math.random() * 2.5;
      const tapW2 = 1.0 + Math.random() * 1.5;
      const tapMat2 = tapestryMats[tc % tapestryMats.length];
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, tapW2 + 0.4, 8), ironMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.y = tapH;
      tapestry.add(rod);
      const fabric = new THREE.Mesh(new THREE.PlaneGeometry(tapW2, tapH), tapMat2);
      fabric.position.y = tapH / 2;
      fabric.rotation.y = (Math.random() - 0.5) * 0.15;
      fabric.rotation.x = (Math.random() - 0.5) * 0.08;
      tapestry.add(fabric);
      const stripCount = 2 + Math.floor(Math.random() * 3);
      for (let ts = 0; ts < stripCount; ts++) {
        const stripW = tapW2 * (0.2 + Math.random() * 0.3);
        const stripH = 0.3 + Math.random() * 0.6;
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(stripW, stripH), tapMat2);
        strip.position.set((Math.random() - 0.5) * tapW2 * 0.6, -stripH * 0.3, (Math.random() - 0.5) * 0.1);
        strip.rotation.z = (Math.random() - 0.5) * 0.4;
        strip.rotation.x = (Math.random() - 0.5) * 0.2;
        tapestry.add(strip);
      }
      const fringe = new THREE.Mesh(
        new THREE.BoxGeometry(tapW2 * 0.8, 0.04, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xaa8833, roughness: 0.4, metalness: 0.3 }),
      );
      fringe.position.y = tapH - 0.02;
      tapestry.add(fringe);
      const tcX = (Math.random() - 0.5) * w * 0.65;
      const tcZ = (Math.random() - 0.5) * d * 0.65;
      tapestry.position.set(tcX, 2 + Math.random() * 3, tcZ);
      tapestry.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(tapestry);
    }

    // ── 10. Scattered debris (broken planks, shattered pottery, fallen books) ──
    for (let sd = 0; sd < 12; sd++) {
      const debrisGrp = new THREE.Group();
      const plankCount = 3 + Math.floor(Math.random() * 4);
      for (let pl = 0; pl < plankCount; pl++) {
        const plank2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.4 + Math.random() * 0.8, 0.04, 0.08 + Math.random() * 0.06),
          woodMat,
        );
        plank2.position.set((Math.random() - 0.5) * 2, 0.02 + Math.random() * 0.1, (Math.random() - 0.5) * 2);
        plank2.rotation.y = Math.random() * Math.PI;
        plank2.rotation.z = (Math.random() - 0.5) * 0.5;
        plank2.rotation.x = (Math.random() - 0.5) * 0.3;
        debrisGrp.add(plank2);
      }
      const potCount = 2 + Math.floor(Math.random() * 3);
      for (let pot = 0; pot < potCount; pot++) {
        const shard = new THREE.Mesh(
          new THREE.SphereGeometry(0.05 + Math.random() * 0.08, 6, 5),
          new THREE.MeshStandardMaterial({ color: 0x885544, roughness: 0.8 }),
        );
        shard.scale.set(1 + Math.random() * 0.5, 0.3 + Math.random() * 0.4, 1 + Math.random() * 0.5);
        shard.position.set((Math.random() - 0.5) * 1.5, 0.03, (Math.random() - 0.5) * 1.5);
        shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        debrisGrp.add(shard);
      }
      const bookCount = 2 + Math.floor(Math.random() * 3);
      const bookColors = [0x663322, 0x332244, 0x443311, 0x224433, 0x553322];
      for (let bk = 0; bk < bookCount; bk++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.15 + Math.random() * 0.08, 0.03 + Math.random() * 0.02, 0.2 + Math.random() * 0.06),
          new THREE.MeshStandardMaterial({ color: bookColors[bk % bookColors.length], roughness: 0.85 }),
        );
        if (Math.random() > 0.5) {
          book.position.set((Math.random() - 0.5) * 0.8, 0.02 + bk * 0.04, (Math.random() - 0.5) * 0.8);
        } else {
          book.position.set((Math.random() - 0.5) * 2, 0.02, (Math.random() - 0.5) * 2);
          book.rotation.y = Math.random() * Math.PI;
          book.rotation.z = (Math.random() - 0.5) * 0.2;
        }
        debrisGrp.add(book);
        if (Math.random() > 0.6) {
          const pages = new THREE.Mesh(
            new THREE.PlaneGeometry(0.13, 0.18),
            new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.6, side: THREE.DoubleSide }),
          );
          pages.position.set(book.position.x, book.position.y + 0.025, book.position.z);
          pages.rotation.x = -Math.PI / 2;
          pages.rotation.z = book.rotation.y;
          debrisGrp.add(pages);
        }
      }
      const sdX = (Math.random() - 0.5) * w * 0.6;
      const sdZ = (Math.random() - 0.5) * d * 0.6;
      debrisGrp.position.set(sdX, getTerrainHeight(sdX, sdZ, 0.4), sdZ);
      mctx.scene.add(debrisGrp);
    }
}

export function buildThornwoodThicket(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x443322, 0.022);
    mctx.applyTerrainColors(0x3a2a1a, 0x2a3a22, 1.0);
    mctx.dirLight.color.setHex(0xaa8855);
    mctx.dirLight.intensity = 0.5;
    mctx.ambientLight.color.setHex(0x554422);
    mctx.ambientLight.intensity = 0.35;
    mctx.hemiLight.color.setHex(0x776644);
    mctx.hemiLight.groundColor.setHex(0x332211);

    const darkBarkMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.95 });
    const thornMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 });
    const poisonCapMat = new THREE.MeshStandardMaterial({ color: 0x33dd44, emissive: 0x22bb33, emissiveIntensity: 0.5, roughness: 0.3 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.95 });
    const fungusMat = new THREE.MeshStandardMaterial({ color: 0x998844, roughness: 0.7 });
    const blightMat = new THREE.MeshStandardMaterial({ color: 0x442255, roughness: 0.3, transparent: true, opacity: 0.6, depthWrite: false });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.8, side: THREE.DoubleSide });
    const webMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false });
    const totemMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.9 });
    const sporeMat = new THREE.MeshStandardMaterial({ color: 0x55dd44, transparent: true, opacity: 0.2, depthWrite: false });
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
    const deadFlowerMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
    const shelterMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9, side: THREE.DoubleSide });
    const corruptionMat = new THREE.MeshStandardMaterial({ color: 0x331144, emissive: 0x220033, emissiveIntensity: 0.6, roughness: 0.2 });

    // ── Twisted thorny trees ──
    for (let i = 0; i < 65; i++) {
      const tree = new THREE.Group();
      const trunkH = 3 + Math.random() * 5;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1 + Math.random() * 0.15, 0.2 + Math.random() * 0.2, trunkH, 10),
        darkBarkMat,
      );
      trunk.position.y = trunkH / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      trunk.rotation.x = (Math.random() - 0.5) * 0.15;
      tree.add(trunk);
      // Thorns on trunk
      const thornCount = 4 + Math.floor(Math.random() * 6);
      for (let t = 0; t < thornCount; t++) {
        const thorn = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.15 + Math.random() * 0.1, 16),
          thornMat,
        );
        const tAngle = Math.random() * Math.PI * 2;
        const tY = Math.random() * trunkH;
        thorn.position.set(
          Math.cos(tAngle) * 0.15,
          tY,
          Math.sin(tAngle) * 0.15,
        );
        thorn.rotation.z = Math.cos(tAngle) * 1.2;
        thorn.rotation.x = Math.sin(tAngle) * 1.2;
        tree.add(thorn);
      }
      // Dark branches (no foliage)
      const branchCount = 2 + Math.floor(Math.random() * 4);
      for (let b = 0; b < branchCount; b++) {
        const brLen = 1 + Math.random() * 2;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.06, brLen, 17),
          darkBarkMat,
        );
        const bAngle = Math.random() * Math.PI * 2;
        branch.position.set(
          Math.cos(bAngle) * brLen * 0.25,
          trunkH * (0.5 + Math.random() * 0.4),
          Math.sin(bAngle) * brLen * 0.25,
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.8;
        tree.add(branch);
        // Thorns on branches
        if (Math.random() > 0.5) {
          const brThorn = new THREE.Mesh(
            new THREE.ConeGeometry(0.02, 0.1, 16),
            thornMat,
          );
          brThorn.position.set(
            Math.cos(bAngle) * brLen * 0.5,
            trunkH * (0.5 + Math.random() * 0.4) + 0.1,
            Math.sin(bAngle) * brLen * 0.5,
          );
          brThorn.rotation.z = Math.random() * Math.PI;
          tree.add(brThorn);
        }
      }
      const tx = (Math.random() - 0.5) * w * 0.9;
      const tz = (Math.random() - 0.5) * d * 0.9;
      tree.position.set(tx, getTerrainHeight(tx, tz, 1.0), tz);
      mctx.scene.add(tree);
    }

    // ── Thorn bushes ──
    for (let i = 0; i < 32; i++) {
      const bush = new THREE.Group();
      const bushR = 0.3 + Math.random() * 0.5;
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(bushR, 23, 20),
        bushMat,
      );
      bush.add(body);
      // Spikes
      const spikeCount = 6 + Math.floor(Math.random() * 6);
      for (let s = 0; s < spikeCount; s++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.2 + Math.random() * 0.15, 16),
          thornMat,
        );
        const sAngle1 = Math.random() * Math.PI * 2;
        const sAngle2 = Math.random() * Math.PI;
        spike.position.set(
          Math.cos(sAngle1) * Math.sin(sAngle2) * bushR,
          Math.cos(sAngle2) * bushR,
          Math.sin(sAngle1) * Math.sin(sAngle2) * bushR,
        );
        spike.lookAt(spike.position.clone().multiplyScalar(2));
        bush.add(spike);
      }
      const bx = (Math.random() - 0.5) * w * 0.85;
      const bz = (Math.random() - 0.5) * d * 0.85;
      bush.position.set(bx, getTerrainHeight(bx, bz, 1.0) + bushR * 0.5, bz);
      mctx.scene.add(bush);
    }

    // ── Poison mushrooms (glowing green) ──
    for (let i = 0; i < 22; i++) {
      const mush = new THREE.Group();
      const stemH = 0.15 + Math.random() * 0.25;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, stemH, 17),
        new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.7 }),
      );
      stem.position.y = stemH / 2;
      mush.add(stem);
      const capR = 0.1 + Math.random() * 0.15;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(capR, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2),
        poisonCapMat,
      );
      cap.position.y = stemH;
      mush.add(cap);
      const mx = (Math.random() - 0.5) * w * 0.85;
      const mz = (Math.random() - 0.5) * d * 0.85;
      mush.position.set(mx, getTerrainHeight(mx, mz, 1.0), mz);
      mctx.scene.add(mush);
    }

    // ── Fallen rotting logs with fungus ──
    for (let i = 0; i < 18; i++) {
      const logGroup = new THREE.Group();
      const logLen = 2 + Math.random() * 4;
      const logR = 0.15 + Math.random() * 0.2;
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(logR, logR * 1.1, logLen, 10),
        logMat,
      );
      log.rotation.z = Math.PI / 2;
      log.position.y = logR;
      logGroup.add(log);
      // Fungus growths
      const fungusCount = 2 + Math.floor(Math.random() * 4);
      for (let f = 0; f < fungusCount; f++) {
        const fungus = new THREE.Mesh(
          new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          fungusMat,
        );
        fungus.position.set(
          (Math.random() - 0.5) * logLen * 0.6,
          logR + 0.05,
          (Math.random() - 0.5) * logR,
        );
        logGroup.add(fungus);
      }
      const lx = (Math.random() - 0.5) * w * 0.85;
      const lz = (Math.random() - 0.5) * d * 0.85;
      logGroup.position.set(lx, getTerrainHeight(lx, lz, 1.0), lz);
      logGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(logGroup);
    }

    // ── Blight pools ──
    for (let i = 0; i < 10; i++) {
      const poolR = 1.5 + Math.random() * 3;
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(poolR, 16),
        blightMat,
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(
        (Math.random() - 0.5) * w * 0.75,
        0.02,
        (Math.random() - 0.5) * d * 0.75,
      );
      mctx.scene.add(pool);
    }

    // ── Creeping vine patches ──
    for (let i = 0; i < 28; i++) {
      const vineSize = 1 + Math.random() * 2.5;
      const vine = new THREE.Mesh(
        new THREE.PlaneGeometry(vineSize, vineSize),
        vineMat,
      );
      vine.rotation.x = -Math.PI / 2;
      const vx = (Math.random() - 0.5) * w * 0.85;
      const vz = (Math.random() - 0.5) * d * 0.85;
      vine.position.set(vx, getTerrainHeight(vx, vz, 1.0) + 0.02, vz);
      vine.rotation.z = Math.random() * Math.PI;
      mctx.scene.add(vine);
    }

    // ── Web cocoons ──
    for (let i = 0; i < 12; i++) {
      const cocoon = new THREE.Group();
      const cocoonR = 0.15 + Math.random() * 0.15;
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(cocoonR, 23, 20),
        webMat,
      );
      body.scale.y = 1.3;
      cocoon.add(body);
      // Web strands
      for (let s = 0; s < 3; s++) {
        const strand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, 0.5 + Math.random() * 1, 8),
          webMat,
        );
        strand.position.y = cocoonR + 0.3;
        strand.rotation.z = (Math.random() - 0.5) * 0.3;
        cocoon.add(strand);
      }
      const cx = (Math.random() - 0.5) * w * 0.8;
      const cz = (Math.random() - 0.5) * d * 0.8;
      cocoon.position.set(cx, 1 + Math.random() * 3, cz);
      mctx.scene.add(cocoon);
    }

    // ── Ancient blighted totems ──
    for (let i = 0; i < 7; i++) {
      const totem = new THREE.Group();
      const totemH = 1.5 + Math.random() * 2;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, totemH, 10),
        totemMat,
      );
      pole.position.y = totemH / 2;
      totem.add(pole);
      // Skull on top
      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.7 }),
      );
      skull.scale.set(1, 0.85, 1.1);
      skull.position.y = totemH + 0.1;
      totem.add(skull);
      // Glow
      const totemLight = new THREE.PointLight(0x44ff33, 0.3, 4);
      totemLight.position.set(0, totemH + 0.3, 0);
      totem.add(totemLight);
      mctx.torchLights.push(totemLight);
      const ttx = (Math.random() - 0.5) * w * 0.7;
      const ttz = (Math.random() - 0.5) * d * 0.7;
      totem.position.set(ttx, getTerrainHeight(ttx, ttz, 1.0), ttz);
      mctx.scene.add(totem);
    }

    // ── Root bridges ──
    for (let i = 0; i < 16; i++) {
      const bridgeGroup = new THREE.Group();
      const spanLen = 3 + Math.random() * 4;
      const archH = 1 + Math.random() * 1.5;
      // Main root arch
      const segments = 6;
      for (let s = 0; s < segments; s++) {
        const t = s / (segments - 1);
        const segLen = spanLen / segments;
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, segLen * 1.2, 17),
          rootMat,
        );
        const angle = t * Math.PI;
        seg.position.set(
          (t - 0.5) * spanLen,
          Math.sin(angle) * archH,
          0,
        );
        seg.rotation.z = Math.PI / 2 - Math.cos(angle) * 0.5;
        bridgeGroup.add(seg);
      }
      const rbx = (Math.random() - 0.5) * w * 0.75;
      const rbz = (Math.random() - 0.5) * d * 0.75;
      bridgeGroup.position.set(rbx, getTerrainHeight(rbx, rbz, 1.0), rbz);
      bridgeGroup.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(bridgeGroup);
    }

    // ── Spore clouds ──
    for (let i = 0; i < 22; i++) {
      const sporeR = 0.3 + Math.random() * 0.6;
      const spore = new THREE.Mesh(
        new THREE.SphereGeometry(sporeR, 23, 17),
        sporeMat,
      );
      spore.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.3 + Math.random() * 2.5,
        (Math.random() - 0.5) * d * 0.85,
      );
      mctx.scene.add(spore);
    }

    // ── Petrified animals ──
    for (let i = 0; i < 10; i++) {
      const animal = new THREE.Group();
      // Simple body shape
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 + Math.random() * 0.2, 0.2, 0.5 + Math.random() * 0.3),
        greyMat,
      );
      body.position.y = 0.2;
      animal.add(body);
      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 17, 16),
        greyMat,
      );
      head.position.set(0, 0.25, 0.3);
      animal.add(head);
      // Legs
      for (let l = 0; l < 4; l++) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.15, 16),
          greyMat,
        );
        leg.position.set(
          (l < 2 ? -0.1 : 0.1),
          0.075,
          (l % 2 === 0 ? 0.15 : -0.15),
        );
        animal.add(leg);
      }
      const ax = (Math.random() - 0.5) * w * 0.8;
      const az = (Math.random() - 0.5) * d * 0.8;
      animal.position.set(ax, getTerrainHeight(ax, az, 1.0), az);
      animal.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(animal);
    }

    // ── Gnarled root networks ──
    for (let i = 0; i < 14; i++) {
      const rootNet = new THREE.Group();
      const rootCount = 2 + Math.floor(Math.random() * 4);
      for (let r = 0; r < rootCount; r++) {
        const rootLen = 1 + Math.random() * 2;
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.06, rootLen, 17),
          rootMat,
        );
        root.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        root.position.set(
          (Math.random() - 0.5) * 1.5,
          0.05,
          (Math.random() - 0.5) * 1.5,
        );
        root.rotation.y = Math.random() * Math.PI;
        rootNet.add(root);
      }
      const rnx = (Math.random() - 0.5) * w * 0.85;
      const rnz = (Math.random() - 0.5) * d * 0.85;
      rootNet.position.set(rnx, getTerrainHeight(rnx, rnz, 1.0), rnz);
      mctx.scene.add(rootNet);
    }

    // ── Corruption nodes ──
    for (let i = 0; i < 6; i++) {
      const nodeR = 0.2 + Math.random() * 0.3;
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(nodeR, 27, 23),
        corruptionMat,
      );
      const nx = (Math.random() - 0.5) * w * 0.7;
      const nz = (Math.random() - 0.5) * d * 0.7;
      node.position.set(nx, getTerrainHeight(nx, nz, 1.0) + nodeR + 0.5, nz);
      mctx.scene.add(node);
      const nodeLight = new THREE.PointLight(0x6622aa, 0.5, 6);
      nodeLight.position.copy(node.position);
      mctx.scene.add(nodeLight);
      mctx.torchLights.push(nodeLight);
    }

    // ── Dead flower patches ──
    for (let i = 0; i < 12; i++) {
      const flowerGroup = new THREE.Group();
      const stemCount = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < stemCount; s++) {
        const stemH = 0.2 + Math.random() * 0.3;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.015, stemH, 16),
          deadFlowerMat,
        );
        stem.position.set(
          (Math.random() - 0.5) * 0.3,
          stemH / 2,
          (Math.random() - 0.5) * 0.3,
        );
        stem.rotation.z = (Math.random() - 0.5) * 0.4;
        flowerGroup.add(stem);
        // Dead head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 1.0 }),
        );
        head.position.set(stem.position.x, stemH, stem.position.z);
        flowerGroup.add(head);
      }
      const dfx = (Math.random() - 0.5) * w * 0.85;
      const dfz = (Math.random() - 0.5) * d * 0.85;
      flowerGroup.position.set(dfx, getTerrainHeight(dfx, dfz, 1.0), dfz);
      mctx.scene.add(flowerGroup);
    }

    // ── Abandoned hunter camps ──
    for (let i = 0; i < 5; i++) {
      const camp = new THREE.Group();
      // Broken lean-to shelter
      const shelterBack = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1.5),
        shelterMat,
      );
      shelterBack.position.set(0, 0.75, -0.5);
      shelterBack.rotation.x = -0.3;
      camp.add(shelterBack);
      // Support sticks
      const stick1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 16), logMat);
      stick1.position.set(-0.8, 0.9, 0);
      stick1.rotation.z = 0.2;
      camp.add(stick1);
      const stick2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 16), logMat);
      stick2.position.set(0.8, 0.9, 0);
      stick2.rotation.z = -0.2;
      camp.add(stick2);
      // Cold fire ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 17, 23), greyMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.08, 1);
      camp.add(ring);
      const cpx = (Math.random() - 0.5) * w * 0.6;
      const cpz = (Math.random() - 0.5) * d * 0.6;
      camp.position.set(cpx, getTerrainHeight(cpx, cpz, 1.0), cpz);
      camp.rotation.y = Math.random() * Math.PI * 2;
      mctx.scene.add(camp);
    }

    // ── Spider webs between branches ──
    const webStrandMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.4, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 20; i++) {
      const webGrp = new THREE.Group();
      const webR = 0.8 + Math.random() * 1.5;
      const strands = 6 + Math.floor(Math.random() * 4);
      for (let s = 0; s < strands; s++) {
        const angle = (s / strands) * Math.PI * 2;
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, webR, 8), webStrandMat);
        strand.position.set(Math.cos(angle) * webR * 0.5, 0, Math.sin(angle) * webR * 0.5);
        strand.rotation.z = Math.PI / 2; strand.rotation.y = angle;
        webGrp.add(strand);
      }
      for (let r = 0; r < 3; r++) {
        const wr = new THREE.Mesh(new THREE.TorusGeometry(webR * (0.3 + r * 0.25), 0.003, 3, strands), webStrandMat);
        webGrp.add(wr);
      }
      if (Math.random() > 0.6) webGrp.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })));
      webGrp.position.set((Math.random() - 0.5) * w * 0.8, 1.5 + Math.random() * 4, (Math.random() - 0.5) * d * 0.8);
      webGrp.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.scene.add(webGrp);
    }

    // ── Carnivorous plants ──
    const carnMouthMat = new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.4, emissive: 0x331111, emissiveIntensity: 0.3 });
    const carnBodyMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.6 });
    for (let i = 0; i < 14; i++) {
      const cpGrp = new THREE.Group();
      const cpStemH = 0.3 + Math.random() * 0.5;
      cpGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, cpStemH, 10), new THREE.MeshStandardMaterial({ color: 0x446622 })));
      (cpGrp.children[0] as THREE.Mesh).position.y = cpStemH / 2;
      const jR = 0.08 + Math.random() * 0.06;
      const tJ = new THREE.Mesh(new THREE.SphereGeometry(jR, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), carnMouthMat);
      tJ.position.y = cpStemH + jR * 0.2; tJ.rotation.x = -0.3; cpGrp.add(tJ);
      const bJ = new THREE.Mesh(new THREE.SphereGeometry(jR, 23, 17, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), carnBodyMat);
      bJ.position.y = cpStemH - jR * 0.1; cpGrp.add(bJ);
      for (let t = 0; t < 5; t++) {
        const ta = (t / 5) * Math.PI;
        const tth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xeeddcc }));
        tth.position.set(Math.cos(ta) * jR * 0.7, cpStemH + 0.01, Math.sin(ta) * jR * 0.7); cpGrp.add(tth);
      }
      const cpx2 = (Math.random() - 0.5) * w * 0.8; const cpz2 = (Math.random() - 0.5) * d * 0.8;
      cpGrp.position.set(cpx2, getTerrainHeight(cpx2, cpz2, 1.0), cpz2); mctx.scene.add(cpGrp);
    }

    // ── Thorny vines climbing vertical surfaces ──
    for (let i = 0; i < 25; i++) {
      const vc = new THREE.Group(); const vLen = 1.5 + Math.random() * 3; const vSegs = 4 + Math.floor(Math.random() * 4);
      let vOff = 0;
      for (let s = 0; s < vSegs; s++) {
        const sH = vLen / vSegs;
        const vs = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, sH, 17), vineMat);
        vs.position.set((Math.random() - 0.5) * 0.15, vOff + sH / 2, 0); vs.rotation.z = (Math.random() - 0.5) * 0.3; vc.add(vs);
        vOff += sH * 0.85;
        if (Math.random() > 0.4) { const vt = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 16), thornMat); vt.position.set(vs.position.x + 0.03, vOff - sH * 0.3, 0); vt.rotation.z = Math.PI / 2; vc.add(vt); }
        if (Math.random() > 0.5) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), vineMat); lf.position.set(vs.position.x - 0.04, vOff - sH * 0.5, 0); lf.rotation.z = Math.random() * Math.PI; vc.add(lf); }
      }
      const vcx = (Math.random() - 0.5) * w * 0.85; const vcz = (Math.random() - 0.5) * d * 0.85;
      vc.position.set(vcx, getTerrainHeight(vcx, vcz, 1.0), vcz); mctx.scene.add(vc);
    }

    // ── Poison berry clusters ──
    const berryMat = new THREE.MeshStandardMaterial({ color: 0x990066, emissive: 0x440033, emissiveIntensity: 0.3, roughness: 0.4 });
    for (let i = 0; i < 18; i++) {
      const bc = new THREE.Group();
      for (let b = 0; b < 3 + Math.floor(Math.random() * 5); b++) {
        const by = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 20, 17), berryMat);
        by.position.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08); bc.add(by);
      }
      bc.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.15, 16), darkBarkMat));
      (bc.children[bc.children.length - 1] as THREE.Mesh).position.y = 0.08;
      const bx2 = (Math.random() - 0.5) * w * 0.85; const bz2 = (Math.random() - 0.5) * d * 0.85;
      bc.position.set(bx2, getTerrainHeight(bx2, bz2, 1.0) + 0.5 + Math.random() * 2.5, bz2); mctx.scene.add(bc);
    }

    // ── Fallen/broken branches scattered on ground ──
    for (let i = 0; i < 30; i++) {
      const bg = new THREE.Group(); const ml = 0.4 + Math.random() * 1.2;
      const mbr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, ml, 17), darkBarkMat);
      mbr.rotation.z = Math.PI / 2; mbr.position.y = 0.03; bg.add(mbr);
      for (let s = 0; s < 1 + Math.floor(Math.random() * 3); s++) {
        const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.15 + Math.random() * 0.3, 16), darkBarkMat);
        sb.position.set((Math.random() - 0.5) * ml * 0.6, 0.05, (Math.random() - 0.5) * 0.1); sb.rotation.z = (Math.random() - 0.5) * 1.5; bg.add(sb);
      }
      const fbx = (Math.random() - 0.5) * w * 0.9; const fbz = (Math.random() - 0.5) * d * 0.9;
      bg.position.set(fbx, getTerrainHeight(fbx, fbz, 1.0), fbz); bg.rotation.y = Math.random() * Math.PI; mctx.scene.add(bg);
    }

    // ── Mushroom fairy rings ──
    const fCapMat = new THREE.MeshStandardMaterial({ color: 0xcc4433, roughness: 0.5 });
    const fStemMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const rg = new THREE.Group(); const rrR = 0.8 + Math.random() * 1.5; const mCt = 6 + Math.floor(Math.random() * 6);
      for (let m = 0; m < mCt; m++) {
        const ma = (m / mCt) * Math.PI * 2; const mg = new THREE.Group();
        const sh = 0.08 + Math.random() * 0.12;
        const mst = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, sh, 17), fStemMat); mst.position.y = sh / 2; mg.add(mst);
        const mcap = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), fCapMat); mcap.position.y = sh; mg.add(mcap);
        mg.position.set(Math.cos(ma) * rrR, 0, Math.sin(ma) * rrR); rg.add(mg);
      }
      const rl = new THREE.PointLight(0x44ff44, 0.15, 3); rl.position.y = 0.1; rg.add(rl); mctx.torchLights.push(rl);
      const rgx = (Math.random() - 0.5) * w * 0.7; const rgz = (Math.random() - 0.5) * d * 0.7;
      rg.position.set(rgx, getTerrainHeight(rgx, rgz, 1.0), rgz); mctx.scene.add(rg);
    }

    // ── Dark undergrowth ──
    const ugMat = new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 40; i++) {
      const ug = new THREE.Group();
      for (let b = 0; b < 3 + Math.floor(Math.random() * 5); b++) {
        const bh = 0.15 + Math.random() * 0.25;
        const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.05 + Math.random() * 0.04, bh), ugMat);
        bl.position.set((Math.random() - 0.5) * 0.2, bh / 2, (Math.random() - 0.5) * 0.2);
        bl.rotation.y = Math.random() * Math.PI; bl.rotation.z = (Math.random() - 0.5) * 0.3; ug.add(bl);
      }
      const ugx = (Math.random() - 0.5) * w * 0.9; const ugz = (Math.random() - 0.5) * d * 0.9;
      ug.position.set(ugx, getTerrainHeight(ugx, ugz, 1.0), ugz); mctx.scene.add(ug);
    }

    // ── Dead animal skeletons ──
    const skelBoneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const sk = new THREE.Group();
      for (let r = 0; r < 5; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 17, 27, Math.PI), skelBoneMat);
        rib.position.set(0, 0.12, -0.12 + r * 0.06); rib.rotation.y = Math.PI / 2; sk.add(rib);
      }
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 17), skelBoneMat);
      sp.rotation.x = Math.PI / 2; sp.position.set(0, 0.12, 0); sk.add(sp);
      const skl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 17), new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.7 }));
      skl.position.set(0, 0.1, 0.22); skl.scale.set(1, 0.8, 1.2); sk.add(skl);
      const skx = (Math.random() - 0.5) * w * 0.75; const skz = (Math.random() - 0.5) * d * 0.75;
      sk.position.set(skx, getTerrainHeight(skx, skz, 1.0), skz); sk.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(sk);
    }

    // ── Atmospheric firefly lights ──
    for (let i = 0; i < 10; i++) {
      const ffL = new THREE.PointLight(0x33ff33, 0.15, 3);
      ffL.position.set((Math.random() - 0.5) * w * 0.8, 0.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.8);
      mctx.scene.add(ffL); mctx.torchLights.push(ffL);
      const ffS = new THREE.Mesh(new THREE.SphereGeometry(0.015, 17, 16), new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x44ff44, emissiveIntensity: 1.0 }));
      ffS.position.copy(ffL.position); mctx.scene.add(ffS);
    }

    // ── Exposed root systems ──
    for (let i = 0; i < 20; i++) {
      const rs = new THREE.Group(); const rc = 3 + Math.floor(Math.random() * 4);
      for (let r = 0; r < rc; r++) {
        const ra = (r / rc) * Math.PI * 2 + Math.random() * 0.5; const rl2 = 0.5 + Math.random() * 1.2;
        const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, rl2, 17), rootMat);
        rt.position.set(Math.cos(ra) * rl2 * 0.3, 0.05, Math.sin(ra) * rl2 * 0.3);
        rt.rotation.z = Math.PI / 2 - 0.3; rt.rotation.y = ra; rs.add(rt);
      }
      const rsx = (Math.random() - 0.5) * w * 0.85; const rsz = (Math.random() - 0.5) * d * 0.85;
      rs.position.set(rsx, getTerrainHeight(rsx, rsz, 1.0), rsz); mctx.scene.add(rs);
    }

    // ── Thorny vine spirals wrapped around trees ──
    for (let i = 0; i < 20; i++) {
      const vineSpiral = new THREE.Group();
      const spiralH = 2 + Math.random() * 4; const spiralR = 0.15 + Math.random() * 0.1;
      const spiralSegs = 12 + Math.floor(Math.random() * 8);
      for (let s = 0; s < spiralSegs; s++) {
        const t = s / spiralSegs;
        const segLen = spiralH / spiralSegs * 1.2;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, segLen, 8), vineMat);
        const angle = t * Math.PI * 4;
        seg.position.set(Math.cos(angle) * spiralR, t * spiralH, Math.sin(angle) * spiralR);
        seg.rotation.z = Math.cos(angle) * 0.3; seg.rotation.x = Math.sin(angle) * 0.3;
        vineSpiral.add(seg);
        if (Math.random() > 0.5) {
          const vThorn = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 6), thornMat);
          vThorn.position.set(Math.cos(angle) * (spiralR + 0.02), t * spiralH, Math.sin(angle) * (spiralR + 0.02));
          vThorn.rotation.z = Math.cos(angle) * 1.2; vThorn.rotation.x = Math.sin(angle) * 1.2;
          vineSpiral.add(vThorn);
        }
      }
      const vsx = (Math.random() - 0.5) * w * 0.85; const vsz = (Math.random() - 0.5) * d * 0.85;
      vineSpiral.position.set(vsx, getTerrainHeight(vsx, vsz, 1.0), vsz); mctx.scene.add(vineSpiral);
    }

    // ── Spider web radial patterns between branches ──
    for (let i = 0; i < 15; i++) {
      const webDetail = new THREE.Group();
      const wR2 = 0.5 + Math.random() * 1.0;
      const radials = 8 + Math.floor(Math.random() * 4);
      for (let r = 0; r < radials; r++) {
        const rAngle = (r / radials) * Math.PI * 2;
        const radLine = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, wR2, 4), webMat);
        radLine.position.set(Math.cos(rAngle) * wR2 * 0.5, 0, Math.sin(rAngle) * wR2 * 0.5);
        radLine.rotation.z = Math.PI / 2; radLine.rotation.y = rAngle;
        webDetail.add(radLine);
      }
      for (let c = 1; c <= 4; c++) {
        const cR = wR2 * c * 0.2;
        const cRing = new THREE.Mesh(new THREE.TorusGeometry(cR, 0.002, 3, radials), webMat);
        webDetail.add(cRing);
      }
      webDetail.position.set((Math.random() - 0.5) * w * 0.8, 2 + Math.random() * 4, (Math.random() - 0.5) * d * 0.8);
      webDetail.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      mctx.scene.add(webDetail);
    }

    // ── Poisonous berry clusters on bushes ──
    const poisonBerryMat = new THREE.MeshStandardMaterial({ color: 0xcc0044, emissive: 0x660022, emissiveIntensity: 0.4, roughness: 0.3 });
    for (let i = 0; i < 22; i++) {
      const berryCluster = new THREE.Group();
      const berryCount = 4 + Math.floor(Math.random() * 6);
      for (let b = 0; b < berryCount; b++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 12, 10), poisonBerryMat);
        berry.position.set((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06);
        berryCluster.add(berry);
      }
      const bStem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.08, 6), darkBarkMat);
      bStem.position.y = 0.05; berryCluster.add(bStem);
      const bLeaf = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02), vineMat);
      bLeaf.position.set(0.015, 0.04, 0); bLeaf.rotation.z = 0.3; berryCluster.add(bLeaf);
      const bcx2 = (Math.random() - 0.5) * w * 0.85; const bcz2 = (Math.random() - 0.5) * d * 0.85;
      berryCluster.position.set(bcx2, getTerrainHeight(bcx2, bcz2, 1.0) + 0.3 + Math.random() * 1.5, bcz2);
      mctx.scene.add(berryCluster);
    }

    // ── Gnarled root systems breaking through ground ──
    for (let i = 0; i < 16; i++) {
      const rootSys = new THREE.Group();
      const rootArms = 4 + Math.floor(Math.random() * 4);
      for (let r = 0; r < rootArms; r++) {
        const rAngle = (r / rootArms) * Math.PI * 2 + Math.random() * 0.5;
        const rLen = 0.8 + Math.random() * 1.5;
        const archSegs = 4;
        for (let s = 0; s < archSegs; s++) {
          const t = s / (archSegs - 1);
          const segLen2 = rLen / archSegs * 1.2;
          const rSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015 + (1 - t) * 0.02, 0.02 + (1 - t) * 0.03, segLen2, 8), rootMat);
          const archY = Math.sin(t * Math.PI) * 0.2;
          rSeg.position.set(Math.cos(rAngle) * rLen * t, archY, Math.sin(rAngle) * rLen * t);
          rSeg.rotation.z = Math.PI / 2 - Math.cos(t * Math.PI) * 0.4; rSeg.rotation.y = rAngle;
          rootSys.add(rSeg);
        }
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 12, 10), rootMat);
      knot.position.y = 0.03; knot.scale.y = 0.6; rootSys.add(knot);
      const rsx2 = (Math.random() - 0.5) * w * 0.85; const rsz2 = (Math.random() - 0.5) * d * 0.85;
      rootSys.position.set(rsx2, getTerrainHeight(rsx2, rsz2, 1.0), rsz2); mctx.scene.add(rootSys);
    }

    // ── Dead animal skeleton props (detailed) ──
    for (let i = 0; i < 8; i++) {
      const skel2 = new THREE.Group();
      const spineLen2 = 0.3 + Math.random() * 0.2;
      const vertebrae = 6 + Math.floor(Math.random() * 4);
      for (let v = 0; v < vertebrae; v++) {
        const vert = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), skelBoneMat);
        vert.position.set(0, 0.04, (v / vertebrae) * spineLen2 - spineLen2 / 2);
        skel2.add(vert);
      }
      for (let r = 0; r < 4; r++) {
        for (const side of [-1, 1]) {
          const rib2 = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.003, 6, 12, Math.PI * 0.7), skelBoneMat);
          rib2.position.set(side * 0.01, 0.04, (r / 4) * spineLen2 * 0.6 - spineLen2 * 0.15);
          rib2.rotation.y = side * Math.PI / 2; rib2.rotation.x = 0.3;
          skel2.add(rib2);
        }
      }
      const miniSkull = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skelBoneMat);
      miniSkull.position.set(0, 0.04, spineLen2 / 2 + 0.02); miniSkull.scale.set(0.8, 0.7, 1.1);
      skel2.add(miniSkull);
      for (let l = 0; l < 4; l++) {
        const legBone = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.06 + Math.random() * 0.04, 6), skelBoneMat);
        legBone.position.set((Math.random() - 0.5) * 0.08, 0.015, (Math.random() - 0.5) * spineLen2);
        legBone.rotation.set(Math.random() * 0.5, 0, Math.random() * Math.PI);
        skel2.add(legBone);
      }
      const skx2 = (Math.random() - 0.5) * w * 0.8; const skz2 = (Math.random() - 0.5) * d * 0.8;
      skel2.position.set(skx2, getTerrainHeight(skx2, skz2, 1.0), skz2);
      skel2.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(skel2);
    }

    // ── Dense ground grass ──
    const thornGrassShades = [
      new THREE.MeshStandardMaterial({ color: 0x3a4422, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x445533, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x334418, roughness: 0.65, side: THREE.DoubleSide }),
    ];
    for (let gi = 0; gi < 180; gi++) {
      const grassClump = new THREE.Group();
      const bladeCount = 5 + Math.floor(Math.random() * 6);
      for (let bl = 0; bl < bladeCount; bl++) {
        const bladeH = 0.3 + Math.random() * 0.4;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05 + Math.random() * 0.03, bladeH),
          thornGrassShades[Math.floor(Math.random() * 3)],
        );
        blade.position.set((Math.random() - 0.5) * 0.3, bladeH / 2, (Math.random() - 0.5) * 0.3);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        grassClump.add(blade);
      }
      const gx = (Math.random() - 0.5) * w * 0.9;
      const gz = (Math.random() - 0.5) * d * 0.9;
      grassClump.position.set(gx, getTerrainHeight(gx, gz, 1.0), gz);
      mctx.scene.add(grassClump);
    }
}

