import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildAstralVoid(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x050511, 0.042);
    mctx.applyTerrainColors(0x0a0a1a, 0x111122, 0.5);
    mctx.dirLight.color.setHex(0x8866cc);
    mctx.dirLight.intensity = 0.5;
    mctx.ambientLight.color.setHex(0x110022);
    mctx.ambientLight.intensity = 0.3;
    mctx.hemiLight.color.setHex(0x443366);
    mctx.hemiLight.groundColor.setHex(0x050011);

    const voidMat = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.5 });
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const nebulaMat1 = new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x6622aa, emissiveIntensity: 0.4, transparent: true, opacity: 0.06 });
    const nebulaMat2 = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.4, transparent: true, opacity: 0.06 });
    const nebulaMat3 = new THREE.MeshStandardMaterial({ color: 0xff4488, emissive: 0xaa2244, emissiveIntensity: 0.4, transparent: true, opacity: 0.05 });
    const riftMat = new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x8822cc, emissiveIntensity: 1.5 });
    const crystalVoidMat = new THREE.MeshStandardMaterial({ color: 0x4422aa, emissive: 0x3311aa, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.4 });
    const cosmicDustMat = new THREE.MeshStandardMaterial({ color: 0x8866cc, emissive: 0x4422aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.4 });
    // Floating asteroids (irregular rocks)
    for (let i = 0; i < 20; i++) {
      const asteroid = new THREE.Group();
      const mainR = 0.5+Math.random()*2;
      const main = new THREE.Mesh(new THREE.DodecahedronGeometry(mainR, 3), asteroidMat);
      main.scale.set(1, 0.6+Math.random()*0.4, 1); asteroid.add(main);
      // Surface details
      for (let d = 0; d < 3; d++) {
        const bump = new THREE.Mesh(new THREE.DodecahedronGeometry(mainR*0.3, 2), asteroidMat);
        const bA = Math.random()*Math.PI*2, bE = Math.random()*Math.PI;
        bump.position.set(Math.cos(bA)*Math.sin(bE)*mainR*0.7, Math.cos(bE)*mainR*0.5, Math.sin(bA)*Math.sin(bE)*mainR*0.7);
        asteroid.add(bump);
      }
      // Some have glowing veins
      if (Math.random() > 0.5) {
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, mainR*1.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622dd, emissiveIntensity: 1.0 }));
        vein.rotation.set(Math.random(), Math.random(), Math.random()); asteroid.add(vein);
      }
      asteroid.position.set((Math.random()-0.5)*w*0.8, -1+Math.random()*10, (Math.random()-0.5)*d*0.8);
      asteroid.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(asteroid);
    }
    // Floating platforms
    for (let i = 0; i < 20; i++) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*4, 0.3, 2+Math.random()*4), voidMat);
      plat.position.set((Math.random()-0.5)*w*0.7, -0.5+Math.random()*4, (Math.random()-0.5)*d*0.7);
      plat.rotation.set((Math.random()-0.5)*0.2, Math.random(), (Math.random()-0.5)*0.2); mctx.scene.add(plat);
    }
    // Star clusters (denser groups)
    for (let i = 0; i < 8; i++) {
      const clusterX = (Math.random()-0.5)*w*0.6, clusterY = 2+Math.random()*6, clusterZ = (Math.random()-0.5)*d*0.6;
      for (let s = 0; s < 12; s++) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.015+Math.random()*0.03, 17, 16), starMat);
        star.position.set(clusterX+(Math.random()-0.5)*2, clusterY+(Math.random()-0.5)*2, clusterZ+(Math.random()-0.5)*2);
        mctx.scene.add(star);
      }
    }
    // Scattered individual stars
    for (let i = 0; i < 50; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.02+Math.random()*0.04, 17, 16), starMat);
      star.position.set((Math.random()-0.5)*w, Math.random()*10, (Math.random()-0.5)*d); mctx.scene.add(star);
    }
    // Nebula effects (large colored transparent planes at angles)
    for (let i = 0; i < 5; i++) {
      const nebSize = 8+Math.random()*12;
      const nebMats = [nebulaMat1, nebulaMat2, nebulaMat3];
      const nebula = new THREE.Mesh(new THREE.PlaneGeometry(nebSize, nebSize*0.6), nebMats[i%3]);
      nebula.position.set((Math.random()-0.5)*w*0.4, 3+Math.random()*5, (Math.random()-0.5)*d*0.4);
      nebula.rotation.set(Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.3);
      nebula.material.side = THREE.DoubleSide; mctx.scene.add(nebula);
    }
    // Cosmic dust trails
    for (let i = 0; i < 12; i++) {
      const trail = new THREE.Group();
      const trailLen = 5+Math.random()*10;
      for (let p = 0; p < 15; p++) {
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.02+Math.random()*0.03, 16, 8), cosmicDustMat);
        particle.position.set(p*trailLen/15+(Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3);
        trail.add(particle);
      }
      trail.position.set((Math.random()-0.5)*w*0.6, 2+Math.random()*6, (Math.random()-0.5)*d*0.6);
      trail.rotation.set(Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.3); mctx.scene.add(trail);
    }
    // Warp gates (double-ringed portals)
    for (let i = 0; i < 4; i++) {
      const gate = new THREE.Group();
      const outerR = 1.5+Math.random()*1;
      const outer = new THREE.Mesh(new THREE.TorusGeometry(outerR, 0.08, 23, 46), riftMat);
      gate.add(outer);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(outerR*0.7, 0.05, 23, 44), riftMat);
      inner.rotation.z = 0.3; gate.add(inner);
      // Portal fill
      const fill = new THREE.Mesh(new THREE.CircleGeometry(outerR*0.65, 36),
        new THREE.MeshStandardMaterial({ color: 0x4422aa, emissive: 0x3311aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
      gate.add(fill);
      const gLight = new THREE.PointLight(0xcc44ff, 0.6, 10);
      gate.add(gLight); mctx.torchLights.push(gLight);
      gate.position.set((Math.random()-0.5)*w*0.5, 2+Math.random()*5, (Math.random()-0.5)*d*0.5);
      gate.rotation.set(Math.random()*0.5, Math.random(), Math.random()*0.5); mctx.scene.add(gate);
    }
    // Crystalline space structures
    for (let i = 0; i < 10; i++) {
      const crystal = new THREE.Group();
      const cH = 1+Math.random()*3;
      const main = new THREE.Mesh(new THREE.ConeGeometry(0.15+Math.random()*0.15, cH, 20), crystalVoidMat);
      crystal.add(main);
      // Smaller crystals branching off
      for (let b = 0; b < 2; b++) {
        const branch = new THREE.Mesh(new THREE.ConeGeometry(0.06+Math.random()*0.06, cH*0.5, 17), crystalVoidMat);
        branch.position.set((Math.random()-0.5)*0.3, (Math.random()-0.5)*cH*0.3, (Math.random()-0.5)*0.3);
        branch.rotation.set(Math.random()*0.5, Math.random(), Math.random()*0.5); crystal.add(branch);
      }
      crystal.position.set((Math.random()-0.5)*w*0.6, 1+Math.random()*6, (Math.random()-0.5)*d*0.6);
      crystal.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(crystal);
    }
    // Void creatures (simple tentacled forms)
    for (let i = 0; i < 5; i++) {
      const creature = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.3+Math.random()*0.2, 23, 20),
        new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x330055, emissiveIntensity: 0.3, transparent: true, opacity: 0.5 }));
      creature.add(cBody);
      // Eye
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 17),
        new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0xaa22ee, emissiveIntensity: 2.0 }));
      eye.position.z = 0.25; creature.add(eye);
      // Tentacles
      for (let t = 0; t < 5; t++) {
        const tentLen = 0.5+Math.random()*0.5;
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.04, tentLen, 17),
          new THREE.MeshStandardMaterial({ color: 0x330066, emissive: 0x220044, emissiveIntensity: 0.2 }));
        const tA = (t/5)*Math.PI*2;
        tent.position.set(Math.cos(tA)*0.2, -0.3, Math.sin(tA)*0.2);
        tent.rotation.x = 0.3; tent.rotation.z = Math.cos(tA)*0.3; creature.add(tent);
      }
      creature.position.set((Math.random()-0.5)*w*0.5, 2+Math.random()*5, (Math.random()-0.5)*d*0.5);
      mctx.scene.add(creature);
    }
    // Energy streams
    for (let i = 0; i < 10; i++) {
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5+Math.random()*8, 17), cosmicDustMat);
      stream.position.set((Math.random()-0.5)*w*0.6, 8, (Math.random()-0.5)*d*0.6);
      stream.rotation.set(Math.random()*0.5, 0, Math.random()*0.5); mctx.scene.add(stream);
    }
    // Void rifts (additional)
    for (let i = 0; i < 4; i++) {
      const rift = new THREE.Mesh(new THREE.TorusGeometry(0.8+Math.random()*1, 0.04, 23, 31), riftMat);
      rift.position.set((Math.random()-0.5)*w*0.6, 1+Math.random()*6, (Math.random()-0.5)*d*0.6);
      rift.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(rift);
      const rLight = new THREE.PointLight(0xcc44ff, 0.4, 6);
      rLight.position.copy(rift.position); mctx.scene.add(rLight); mctx.torchLights.push(rLight);
    }
    // ── Nebula cloud patches (translucent colored spheres) ──
    for (let i = 0; i < 8; i++) {
      const nebCloud = new THREE.Group();
      const colors = [0xcc44ff, 0x4488ff, 0xff4488];
      for (let s = 0; s < 5 + Math.floor(Math.random() * 4); s++) {
        const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 1.5, 20, 17), new THREE.MeshStandardMaterial({ color: colors[i % 3], emissive: colors[i % 3], emissiveIntensity: 0.2, transparent: true, opacity: 0.04 + Math.random() * 0.03 }));
        cloudSphere.position.set((Math.random()-0.5)*3, (Math.random()-0.5)*2, (Math.random()-0.5)*3);
        nebCloud.add(cloudSphere);
      }
      nebCloud.position.set((Math.random()-0.5)*w*0.6, 2 + Math.random() * 5, (Math.random()-0.5)*d*0.6);
      mctx.scene.add(nebCloud);
    }
    // ── Dimensional rift tears (thin glowing planes) ──
    for (let i = 0; i < 6; i++) {
      const tear = new THREE.Group();
      const tearPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + Math.random() * 0.6, 1.5 + Math.random() * 1.5), new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x8822cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      tear.add(tearPlane);
      for (let j = 0; j < 3; j++) {
        const jagged = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.3), new THREE.MeshStandardMaterial({ color: 0xeeccff, emissive: 0xaa88dd, emissiveIntensity: 1.0, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
        jagged.position.set((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.8, 0.02);
        jagged.rotation.z = (Math.random()-0.5)*0.5; tear.add(jagged);
      }
      tear.position.set((Math.random()-0.5)*w*0.5, 1 + Math.random() * 5, (Math.random()-0.5)*d*0.5);
      tear.rotation.set(Math.random()*0.3, Math.random()*Math.PI, Math.random()*0.3); mctx.scene.add(tear);
    }
    // ── Star constellation markers ──
    for (let i = 0; i < 6; i++) {
      const constellation = new THREE.Group();
      const starCount = 4 + Math.floor(Math.random() * 4);
      const positions: {x: number, y: number, z: number}[] = [];
      for (let s = 0; s < starCount; s++) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 17, 16), starMat);
        const sp = {x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2, z: (Math.random()-0.5)*2};
        star.position.set(sp.x, sp.y, sp.z); constellation.add(star); positions.push(sp);
      }
      for (let l = 0; l < starCount - 1; l++) {
        const p1 = positions[l], p2 = positions[l+1];
        const dx2 = p2.x - p1.x, dy2 = p2.y - p1.y, dz2 = p2.z - p1.z;
        const dist = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, dist, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaff, emissiveIntensity: 0.8, transparent: true, opacity: 0.3 }));
        line.position.set((p1.x+p2.x)/2, (p1.y+p2.y)/2, (p1.z+p2.z)/2);
        line.lookAt(new THREE.Vector3(p2.x, p2.y, p2.z));
        line.rotateX(Math.PI/2); constellation.add(line);
      }
      constellation.position.set((Math.random()-0.5)*w*0.5, 3 + Math.random() * 4, (Math.random()-0.5)*d*0.5);
      mctx.scene.add(constellation);
    }
    // ── Asteroid field debris (clustered rock groups) ──
    for (let i = 0; i < 15; i++) {
      const debris = new THREE.Group();
      const debrisCount = 3 + Math.floor(Math.random() * 4);
      for (let r = 0; r < debrisCount; r++) {
        const rockSize = 0.2 + Math.random() * 0.6;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockSize, 2), asteroidMat);
        rock.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.5);
        rock.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
        debris.add(rock);
      }
      debris.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 7, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(debris);
    }
    // ── Dimensional rift tears (tall thin emissive planes with crackling energy) ──
    for (let i = 0; i < 8; i++) {
      const riftTear = new THREE.Group();
      const riftPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.3 + Math.random() * 0.4, 2.5 + Math.random() * 2),
        new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x8822cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      riftPlane.rotation.z = (Math.random() - 0.5) * 0.3; riftTear.add(riftPlane);
      // Crackling energy (small bright spheres along edges)
      for (let e = 0; e < 8; e++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 16, 16), starMat);
        const edgeY = (Math.random() - 0.5) * 2.5;
        const edgeX = (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.1);
        spark.position.set(edgeX, edgeY, 0.02); riftTear.add(spark);
      }
      const riftLight = new THREE.PointLight(0xcc44ff, 0.5, 8);
      riftTear.add(riftLight); mctx.torchLights.push(riftLight);
      riftTear.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 5, (Math.random() - 0.5) * d * 0.6);
      riftTear.rotation.y = Math.random() * Math.PI; mctx.scene.add(riftTear);
    }
    // ── Star constellation markers (additional) ──
    for (let i = 0; i < 10; i++) {
      const constGrp = new THREE.Group();
      const cStarCount = 4 + Math.floor(Math.random() * 5);
      const cPositions: {x: number, y: number, z: number}[] = [];
      for (let s = 0; s < cStarCount; s++) {
        const cStar = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.025, 17, 16), starMat);
        const csp = {x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 3};
        cStar.position.set(csp.x, csp.y, csp.z); constGrp.add(cStar); cPositions.push(csp);
      }
      for (let l = 0; l < cStarCount - 1; l++) {
        const cp1 = cPositions[l], cp2 = cPositions[l + 1];
        const cdx = cp2.x - cp1.x, cdy = cp2.y - cp1.y, cdz = cp2.z - cp1.z;
        const cDist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
        const cLine = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, cDist, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaff, emissiveIntensity: 0.8, transparent: true, opacity: 0.25 }));
        cLine.position.set((cp1.x + cp2.x) / 2, (cp1.y + cp2.y) / 2, (cp1.z + cp2.z) / 2);
        cLine.lookAt(new THREE.Vector3(cp2.x, cp2.y, cp2.z));
        cLine.rotateX(Math.PI / 2); constGrp.add(cLine);
      }
      constGrp.position.set((Math.random() - 0.5) * w * 0.6, 4 + Math.random() * 5, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(constGrp);
    }
    // ── Cosmic dust clouds (nebulae sphere clusters) ──
    for (let i = 0; i < 12; i++) {
      const dustCloud = new THREE.Group();
      const nebColors = [0xcc44ff, 0x4488ff, 0xff4488];
      const nebColor = nebColors[i % 3];
      for (let s = 0; s < 4 + Math.floor(Math.random() * 5); s++) {
        const cloudSph = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random() * 2.0, 20, 17),
          new THREE.MeshStandardMaterial({ color: nebColor, emissive: nebColor, emissiveIntensity: 0.15, transparent: true, opacity: 0.03 + Math.random() * 0.03 }));
        cloudSph.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4);
        dustCloud.add(cloudSph);
      }
      dustCloud.position.set((Math.random() - 0.5) * w * 0.7, 2 + Math.random() * 6, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(dustCloud);
    }
    // ── Void platforms (hexagonal with bridges and edge glow) ──
    for (let i = 0; i < 6; i++) {
      const voidPlat = new THREE.Group();
      const vpSize = 1.5 + Math.random() * 2;
      const vpDeck = new THREE.Mesh(new THREE.BoxGeometry(vpSize * 1.7, 0.2, vpSize), voidMat);
      voidPlat.add(vpDeck);
      // Edge glow (thin emissive torus rings)
      const vpGlow = new THREE.Mesh(new THREE.TorusGeometry(vpSize * 0.7, 0.02, 16, 6), riftMat);
      vpGlow.rotation.x = -Math.PI / 2; vpGlow.position.y = 0.12; voidPlat.add(vpGlow);
      // Bridge planes connecting to nearby space
      for (let b = 0; b < 2; b++) {
        const vpBridge = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3 + Math.random() * 2),
          new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.3, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
        vpBridge.rotation.x = -Math.PI / 2;
        vpBridge.position.set((b === 0 ? -1 : 1) * vpSize * 0.8, -0.1, 0); voidPlat.add(vpBridge);
      }
      voidPlat.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 5, (Math.random() - 0.5) * d * 0.6);
      voidPlat.rotation.y = Math.random() * Math.PI; mctx.scene.add(voidPlat);
    }
    // ── Ancient void obelisks ──
    for (let i = 0; i < 8; i++) {
      const obelisk = new THREE.Group();
      const obH = 2 + Math.random() * 3;
      const obPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, obH, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.6 }));
      obPillar.position.y = obH / 2; obelisk.add(obPillar);
      // Pyramid top
      const obTop = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.6 }));
      obTop.position.y = obH + 0.3; obTop.rotation.y = Math.PI / 4; obelisk.add(obTop);
      // Glowing rune boxes
      for (let r = 0; r < 4 + Math.floor(Math.random() * 3); r++) {
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x8822cc, emissiveIntensity: 1.5 }));
        const runeA = (r / 6) * Math.PI * 2;
        rune.position.set(Math.cos(runeA) * 0.22, 0.5 + r * obH * 0.15, Math.sin(runeA) * 0.22);
        rune.lookAt(new THREE.Vector3(Math.cos(runeA) * 2, rune.position.y, Math.sin(runeA) * 2));
        obelisk.add(rune);
      }
      obelisk.position.set((Math.random() - 0.5) * w * 0.6, -0.5 + Math.random() * 4, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(obelisk);
    }
    // ── Gravity wells ──
    for (let i = 0; i < 4; i++) {
      const gravWell = new THREE.Group();
      // Large dark central sphere
      const gwCore = new THREE.Mesh(new THREE.SphereGeometry(0.6, 23, 20),
        new THREE.MeshStandardMaterial({ color: 0x050511, roughness: 0.2 }));
      gravWell.add(gwCore);
      // Distortion ring torus
      const gwRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 16, 36),
        new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622dd, emissiveIntensity: 1.2, transparent: true, opacity: 0.5 }));
      gwRing.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3; gravWell.add(gwRing);
      // Orbiting small spheres (positioned in circle)
      for (let o = 0; o < 10; o++) {
        const orbitA = (o / 10) * Math.PI * 2;
        const orbitSph = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 16, 16), cosmicDustMat);
        orbitSph.position.set(Math.cos(orbitA) * 1.0, (Math.random() - 0.5) * 0.3, Math.sin(orbitA) * 1.0);
        gravWell.add(orbitSph);
      }
      const gwLight = new THREE.PointLight(0x6622dd, 0.7, 10);
      gravWell.add(gwLight); mctx.torchLights.push(gwLight);
      gravWell.position.set((Math.random() - 0.5) * w * 0.5, 2 + Math.random() * 5, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(gravWell);
    }
    // ── Energy conduit lines ──
    for (let i = 0; i < 10; i++) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6 + Math.random() * 10, 17),
        new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x8822cc, emissiveIntensity: 1.0 + Math.random() * 0.5, transparent: true, opacity: 0.6 }));
      conduit.position.set((Math.random() - 0.5) * w * 0.5, 2 + Math.random() * 5, (Math.random() - 0.5) * d * 0.5);
      conduit.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.scene.add(conduit);
    }

    // ── Enhanced lighting ──
    mctx.dirLight.intensity = 0.8;
    mctx.ambientLight.intensity = 0.5;
    (mctx.scene.fog as THREE.FogExp2).density = 0.028;

    // ── Dense star field (tiny bright dots scattered high up) ──
    for (let i = 0; i < 200; i++) {
      const starDot = new THREE.Mesh(new THREE.SphereGeometry(0.01 + Math.random() * 0.015, 8, 6), starMat);
      starDot.position.set((Math.random() - 0.5) * w * 1.2, 8 + Math.random() * 12, (Math.random() - 0.5) * d * 1.2);
      mctx.scene.add(starDot);
    }

    // ── Large nebula clouds (translucent colored spheres/discs) ──
    for (let i = 0; i < 10; i++) {
      const nebSize = 4 + Math.random() * 8;
      const nebColors = [0xff66aa, 0x66aaff, 0xaa66ff, 0xff8844, 0x44ffcc];
      const nebCol = nebColors[i % 5];
      const nebSphere = new THREE.Mesh(new THREE.SphereGeometry(nebSize, 24, 20),
        new THREE.MeshStandardMaterial({ color: nebCol, emissive: nebCol, emissiveIntensity: 0.15, transparent: true, opacity: 0.025 + Math.random() * 0.02 }));
      nebSphere.position.set((Math.random() - 0.5) * w * 0.8, 5 + Math.random() * 8, (Math.random() - 0.5) * d * 0.8);
      nebSphere.scale.set(1, 0.4 + Math.random() * 0.3, 1);
      mctx.scene.add(nebSphere);
    }

    // ── Floating rock islands (DodecahedronGeometry clusters) ──
    for (let i = 0; i < 10; i++) {
      const island = new THREE.Group();
      const baseR = 1.5 + Math.random() * 2.5;
      const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(baseR, 2), asteroidMat);
      baseRock.scale.set(1, 0.4 + Math.random() * 0.3, 1);
      island.add(baseRock);
      // Surface rubble
      for (let r = 0; r < 5 + Math.floor(Math.random() * 4); r++) {
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.4, 1), asteroidMat);
        const ra = Math.random() * Math.PI * 2;
        rubble.position.set(Math.cos(ra) * baseR * 0.6, baseR * 0.3 + Math.random() * 0.2, Math.sin(ra) * baseR * 0.6);
        island.add(rubble);
      }
      // Glowing vein on top
      const topGlow = new THREE.Mesh(new THREE.PlaneGeometry(baseR * 0.6, baseR * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622dd, emissiveIntensity: 1.0, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
      topGlow.rotation.x = -Math.PI / 2; topGlow.position.y = baseR * 0.35; island.add(topGlow);
      island.position.set((Math.random() - 0.5) * w * 0.7, 2 + Math.random() * 6, (Math.random() - 0.5) * d * 0.7);
      island.rotation.y = Math.random() * Math.PI; mctx.scene.add(island);
    }

    // ── Crystal formations (emissive cyan/purple cones) ──
    for (let i = 0; i < 18; i++) {
      const crystFormation = new THREE.Group();
      const isCyan = Math.random() > 0.5;
      const crystColor = isCyan ? 0x44ffee : 0xcc44ff;
      const crystEmissive = isCyan ? 0x22aa99 : 0x8822cc;
      const crystMat2 = new THREE.MeshStandardMaterial({ color: crystColor, emissive: crystEmissive, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.3 });
      for (let c = 0; c < 3 + Math.floor(Math.random() * 4); c++) {
        const cH = 0.5 + Math.random() * 1.5;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.1, cH, 6), crystMat2);
        shard.position.set((Math.random() - 0.5) * 0.5, cH / 2, (Math.random() - 0.5) * 0.5);
        shard.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
        crystFormation.add(shard);
      }
      const cfx = (Math.random() - 0.5) * w * 0.6, cfz = (Math.random() - 0.5) * d * 0.6;
      crystFormation.position.set(cfx, -0.5 + Math.random() * 5, cfz);
      mctx.scene.add(crystFormation);
      // Light at base
      const crystLight = new THREE.PointLight(crystColor, 0.4, 6);
      crystLight.position.copy(crystFormation.position);
      mctx.scene.add(crystLight); mctx.torchLights.push(crystLight);
    }

    // ── Energy bridges/pathways (thin glowing planes connecting platforms) ──
    for (let i = 0; i < 12; i++) {
      const bridgeLen = 4 + Math.random() * 8;
      const bridgeW = 0.6 + Math.random() * 0.4;
      const bridge = new THREE.Mesh(new THREE.PlaneGeometry(bridgeW, bridgeLen),
        new THREE.MeshStandardMaterial({ color: 0x6644cc, emissive: 0x4422aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
      bridge.rotation.x = -Math.PI / 2;
      bridge.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 5, (Math.random() - 0.5) * d * 0.6);
      bridge.rotation.z = Math.random() * Math.PI;
      mctx.scene.add(bridge);
      // Edge glow strips
      for (const side of [-1, 1]) {
        const edgeGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.05, bridgeLen),
          new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66dd, emissiveIntensity: 1.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        edgeGlow.rotation.x = -Math.PI / 2;
        edgeGlow.position.copy(bridge.position);
        edgeGlow.position.x += side * bridgeW * 0.5;
        edgeGlow.rotation.z = bridge.rotation.z;
        mctx.scene.add(edgeGlow);
      }
    }

    // ── Cosmic dust motes (tiny floating particles) ──
    for (let i = 0; i < 150; i++) {
      const moteSize = 0.01 + Math.random() * 0.02;
      const moteColors = [0xcc88ff, 0x88ccff, 0xff88cc, 0xffffaa];
      const moteCol = moteColors[Math.floor(Math.random() * 4)];
      const mote = new THREE.Mesh(new THREE.SphereGeometry(moteSize, 6, 4),
        new THREE.MeshStandardMaterial({ color: moteCol, emissive: moteCol, emissiveIntensity: 1.5, transparent: true, opacity: 0.5 + Math.random() * 0.4 }));
      mote.position.set((Math.random() - 0.5) * w, Math.random() * 10, (Math.random() - 0.5) * d);
      mctx.scene.add(mote);
    }

    // ── Alien ground tiles (glowing floor patterns) ──
    for (let i = 0; i < 30; i++) {
      const tileGroup = new THREE.Group();
      const tileSize = 1 + Math.random() * 2;
      // Base tile
      const tile = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.05, tileSize),
        new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.5 }));
      tileGroup.add(tile);
      // Glowing rune lines on surface
      const runeCount = 2 + Math.floor(Math.random() * 3);
      for (let r = 0; r < runeCount; r++) {
        const runeLine = new THREE.Mesh(new THREE.BoxGeometry(tileSize * 0.8, 0.06, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622dd, emissiveIntensity: 1.2 }));
        runeLine.position.set(0, 0.03, (r - runeCount / 2) * 0.15);
        runeLine.rotation.y = (Math.random() - 0.5) * 0.3;
        tileGroup.add(runeLine);
      }
      // Cross line
      const crossLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, tileSize * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622dd, emissiveIntensity: 1.2 }));
      crossLine.position.y = 0.03; tileGroup.add(crossLine);
      const gtx = (Math.random() - 0.5) * w * 0.7, gtz = (Math.random() - 0.5) * d * 0.7;
      tileGroup.position.set(gtx, -0.8 + Math.random() * 2, gtz);
      tileGroup.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
      mctx.scene.add(tileGroup);
    }

    // ── Void portals (ring + inner glow) ──
    for (let i = 0; i < 5; i++) {
      const portal = new THREE.Group();
      const portalR = 1.2 + Math.random() * 1.5;
      // Outer ring
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(portalR, 0.1, 20, 40),
        new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822cc, emissiveIntensity: 1.8 }));
      portal.add(outerRing);
      // Inner glow disc
      const innerGlow = new THREE.Mesh(new THREE.CircleGeometry(portalR * 0.85, 32),
        new THREE.MeshStandardMaterial({ color: 0x220066, emissive: 0x4411aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
      portal.add(innerGlow);
      // Swirl lines inside
      for (let s = 0; s < 4; s++) {
        const swirl = new THREE.Mesh(new THREE.TorusGeometry(portalR * (0.3 + s * 0.15), 0.015, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66dd, emissiveIntensity: 1.2, transparent: true, opacity: 0.3 }));
        swirl.rotation.z = s * 0.4; portal.add(swirl);
      }
      const portalLight = new THREE.PointLight(0xaa44ff, 0.8, 12);
      portal.add(portalLight); mctx.torchLights.push(portalLight);
      portal.position.set((Math.random() - 0.5) * w * 0.5, 2 + Math.random() * 5, (Math.random() - 0.5) * d * 0.5);
      portal.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      mctx.scene.add(portal);
    }

    // ── Additional cosmic-colored point lights ──
    const cosmicLightColors = [0xcc44ff, 0x4488ff, 0xff4488, 0x44ffcc, 0xffaa44, 0x8844ff];
    for (let i = 0; i < 12; i++) {
      const cLight = new THREE.PointLight(cosmicLightColors[i % cosmicLightColors.length], 0.3 + Math.random() * 0.4, 8 + Math.random() * 6);
      cLight.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 7, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(cLight); mctx.torchLights.push(cLight);
    }
}

export function buildShatteredColosseum(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x554e44, 0.01);
    mctx.applyTerrainColors(0x3a3832, 0x4a4842, 1.0);
    mctx.dirLight.color.setHex(0xddccaa);
    mctx.dirLight.intensity = 1.0;
    mctx.ambientLight.color.setHex(0x2a2822);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x998877);
    mctx.hemiLight.groundColor.setHex(0x332211);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.8 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.9 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x551111, roughness: 0.9 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.6, roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
    const torchFireMat = new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.5 });

    // Arena walls - 48 pillars with bases, capitals, rubble, connecting segments
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const radius = Math.min(w, d) * 0.42;
      const pillarH = 3 + Math.random() * 5;
      const broken = Math.random() > 0.4;
      const actualH = broken ? pillarH * (0.3 + Math.random() * 0.5) : pillarH;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, actualH, 12), stoneMat);
      const px = Math.sin(angle) * radius, pz = Math.cos(angle) * radius;
      pillar.position.set(px, getTerrainHeight(px, pz, 1.0) + actualH / 2, pz);
      pillar.castShadow = true; mctx.scene.add(pillar);
      const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 12), darkStoneMat);
      pBase.position.set(px, getTerrainHeight(px, pz, 1.0) + 0.15, pz); mctx.scene.add(pBase);
      if (!broken) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.3, 12), darkStoneMat);
        cap.position.set(px, getTerrainHeight(px, pz, 1.0) + actualH - 0.15, pz); mctx.scene.add(cap);
      }
      if (broken) {
        for (let r = 0; r < 3 + Math.floor(Math.random() * 4); r++) {
          const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.35, 2), stoneMat);
          rubble.position.set(px + (Math.random() - 0.5) * 2, getTerrainHeight(px, pz, 1.0) + 0.1, pz + (Math.random() - 0.5) * 2);
          rubble.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(rubble);
        }
      }
      if (i % 3 === 0) {
        const nextA = ((i + 1) / 48) * Math.PI * 2;
        const wallH = 1.5 + Math.random() * 2;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(radius * Math.PI * 2 / 48, wallH, 0.3), darkStoneMat);
        const mx = Math.sin((angle + nextA) / 2) * radius, mz = Math.cos((angle + nextA) / 2) * radius;
        seg.position.set(mx, getTerrainHeight(mx, mz, 1.0) + wallH / 2, mz);
        seg.rotation.y = -(angle + nextA) / 2 + Math.PI / 2; seg.castShadow = true; mctx.scene.add(seg);
      }
    }

    // Arena floor with marking rings
    const arenaFloor = new THREE.Mesh(new THREE.CircleGeometry(w * 0.25, 32), sandMat);
    arenaFloor.rotation.x = -Math.PI / 2; arenaFloor.position.y = 0.02; mctx.scene.add(arenaFloor);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(w * 0.2, 0.08, 10, 32), darkStoneMat);
    innerRing.rotation.x = -Math.PI / 2; innerRing.position.y = 0.04; mctx.scene.add(innerRing);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(w * 0.25, 0.15, 10, 32), stoneMat);
    outerRing.rotation.x = -Math.PI / 2; outerRing.position.y = 0.06; mctx.scene.add(outerRing);

    // Spectator stands - broken tier blocks with stone seats (shared geometry)
    const seatGeo = new THREE.BoxGeometry(0.4, 0.25, 0.35);
    const blkGeo = new THREE.BoxGeometry(2.2, 0.6, 1.5);
    for (let tier = 0; tier < 4; tier++) {
      const tierR = w * 0.28 + tier * 2.5, tierH = 0.4 + tier * 0.8;
      for (let s = 0; s < 8; s++) {
        const arcA = (s / 8) * Math.PI * 2;
        if (Math.random() > 0.25) {
          const blk = new THREE.Mesh(blkGeo, darkStoneMat);
          const bx = Math.sin(arcA) * tierR, bz = Math.cos(arcA) * tierR;
          blk.position.set(bx, tierH, bz); blk.rotation.y = -arcA; blk.castShadow = true; mctx.scene.add(blk);
          for (let st = 0; st < 1 + Math.floor(Math.random() * 2); st++) {
            const seat = new THREE.Mesh(seatGeo, stoneMat);
            seat.position.set(bx + (Math.random() - 0.5) * 1.5, tierH + 0.42, bz + (Math.random() - 0.5) * 0.6);
            seat.rotation.y = -arcA + (Math.random() - 0.5) * 0.2; mctx.scene.add(seat);
          }
        }
      }
    }

    // Gladiator shields with boss and rim (shared geometry)
    const shieldDiscGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 14);
    const shieldBossGeo = new THREE.SphereGeometry(0.08, 10, 8);
    const shieldRimGeo = new THREE.TorusGeometry(0.3, 0.025, 8, 20);
    for (let i = 0; i < 8; i++) {
      const shield = new THREE.Group();
      const disc = new THREE.Mesh(shieldDiscGeo, bronzeMat);
      disc.rotation.x = Math.PI / 2; shield.add(disc);
      const boss = new THREE.Mesh(shieldBossGeo, ironMat);
      boss.position.z = 0.03; shield.add(boss);
      const rim = new THREE.Mesh(shieldRimGeo, ironMat); shield.add(rim);
      const sx = (Math.random() - 0.5) * w * 0.4, sz = (Math.random() - 0.5) * d * 0.4;
      shield.position.set(sx, getTerrainHeight(sx, sz, 1.0) + 0.05, sz);
      shield.rotation.set((Math.random() - 0.5) * 1.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
      mctx.scene.add(shield);
    }

    // Scattered swords with guard and grip
    for (let i = 0; i < 15; i++) {
      const sword = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7 + Math.random() * 0.3, 0.01), ironMat);
      blade.position.y = 0.35; sword.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), bronzeMat);
      guard.position.y = 0.05; sword.add(guard);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 17), leatherMat);
      grip.position.y = -0.05; sword.add(grip);
      const wx = (Math.random() - 0.5) * w * 0.4, wz = (Math.random() - 0.5) * d * 0.4;
      sword.position.set(wx, getTerrainHeight(wx, wz, 1.0) + 0.1, wz);
      sword.rotation.z = (Math.random() - 0.5) * 2.5; sword.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(sword);
    }

    // Gladiator helmets with crests
    for (let i = 0; i < 8; i++) {
      const helmet = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 27, 23, 0, Math.PI * 2, 0, Math.PI * 0.6), bronzeMat);
      helmet.add(dome);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.18), ironMat);
      visor.position.set(0, -0.05, 0.08); helmet.add(visor);
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.25), bloodMat);
      crest.position.y = 0.12; helmet.add(crest);
      const hx = (Math.random() - 0.5) * w * 0.35, hz = (Math.random() - 0.5) * d * 0.35;
      helmet.position.set(hx, getTerrainHeight(hx, hz, 1.0) + 0.1, hz);
      helmet.rotation.set((Math.random() - 0.5) * 0.8, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
      mctx.scene.add(helmet);
    }

    // Fallen pillars on ground with drum fragments
    for (let i = 0; i < 6; i++) {
      const fallenH = 3 + Math.random() * 3;
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, fallenH, 12), stoneMat);
      const fx = (Math.random() - 0.5) * w * 0.35, fz = (Math.random() - 0.5) * d * 0.35;
      fallen.position.set(fx, getTerrainHeight(fx, fz, 1.0) + 0.35, fz);
      fallen.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      fallen.rotation.y = Math.random() * Math.PI; fallen.castShadow = true; mctx.scene.add(fallen);
      for (let f = 0; f < 2; f++) {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 12), stoneMat);
        drum.position.set(fx + (Math.random() - 0.5) * 2, getTerrainHeight(fx, fz, 1.0) + 0.25, fz + (Math.random() - 0.5) * 2);
        mctx.scene.add(drum);
      }
    }

    // Iron gates at 4 arena entrances
    for (let i = 0; i < 4; i++) {
      const gate = new THREE.Group();
      const gAngle = (i / 4) * Math.PI * 2, gateR = Math.min(w, d) * 0.42;
      const lPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), darkStoneMat);
      lPost.position.set(-1.2, 2, 0); gate.add(lPost);
      const rPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), darkStoneMat);
      rPost.position.set(1.2, 2, 0); gate.add(rPost);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 0.4), darkStoneMat);
      lintel.position.set(0, 4, 0); gate.add(lintel);
      for (let b = 0; b < 6; b++) {
        const barH = 3 + (Math.random() > 0.5 ? 0 : -Math.random() * 1.5);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, barH, 17), ironMat);
        bar.position.set(-0.9 + b * 0.36, barH / 2, 0);
        bar.rotation.z = (Math.random() - 0.5) * 0.15; gate.add(bar);
      }
      const gx = Math.sin(gAngle) * gateR, gz = Math.cos(gAngle) * gateR;
      gate.position.set(gx, getTerrainHeight(gx, gz, 1.0), gz);
      gate.rotation.y = -gAngle; mctx.scene.add(gate);
    }

    // Chariot remains with wheels and spokes
    for (let i = 0; i < 3; i++) {
      const chariot = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2), woodMat);
      frame.position.y = 0.5; chariot.add(frame);
      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 23, 36), ironMat);
        wheel.rotation.y = Math.PI / 2; wheel.position.set(side * 0.8, 0.5, 0); chariot.add(wheel);
        for (let sp = 0; sp < 4; sp++) {
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 16), woodMat);
          spoke.rotation.z = (sp / 4) * Math.PI; spoke.position.set(side * 0.8, 0.5, 0); chariot.add(spoke);
        }
      }
      const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 17), woodMat);
      yoke.rotation.x = Math.PI / 2; yoke.position.set(0, 0.5, 1.8); chariot.add(yoke);
      const cx = (Math.random() - 0.5) * w * 0.3, cz = (Math.random() - 0.5) * d * 0.3;
      chariot.position.set(cx, getTerrainHeight(cx, cz, 1.0), cz);
      chariot.rotation.y = Math.random() * Math.PI; chariot.rotation.z = (Math.random() - 0.5) * 0.2;
      mctx.scene.add(chariot);
    }

    // Victory podium with laurel wreath
    const podium = new THREE.Group();
    const podBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 12), darkStoneMat);
    podBase.position.y = 0.25; podium.add(podBase);
    const podMid = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 0.5, 12), stoneMat);
    podMid.position.y = 0.75; podium.add(podMid);
    const podTop = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.3, 12), stoneMat);
    podTop.position.y = 1.15; podium.add(podTop);
    const wreathMat = new THREE.MeshStandardMaterial({ color: 0x668844 });
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 10, 20), wreathMat);
    wreath.rotation.x = -Math.PI / 2; wreath.position.y = 1.32; podium.add(wreath);
    podium.position.set(w * 0.05, getTerrainHeight(w * 0.05, d * 0.05, 1.0), d * 0.05);
    mctx.scene.add(podium);

    // Chain links scattered
    for (let i = 0; i < 12; i++) {
      const chain = new THREE.Group();
      for (let link = 0; link < 4 + Math.floor(Math.random() * 5); link++) {
        const cl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 17, 23), chainMat);
        cl.position.y = link * 0.1; cl.rotation.x = link % 2 === 0 ? 0 : Math.PI / 2; chain.add(cl);
      }
      const cx = (Math.random() - 0.5) * w * 0.5, cz = (Math.random() - 0.5) * d * 0.5;
      chain.position.set(cx, getTerrainHeight(cx, cz, 1.0) + 0.05, cz);
      chain.rotation.z = (Math.random() - 0.5) * 1.0; mctx.scene.add(chain);
    }

    // Torch brackets with flames
    for (let i = 0; i < 12; i++) {
      const tAngle = (i / 12) * Math.PI * 2, tRadius = Math.min(w, d) * 0.42;
      const bracket = new THREE.Group();
      const bArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), ironMat); bracket.add(bArm);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.15, 10), ironMat);
      cup.position.z = 0.25; cup.rotation.x = Math.PI / 2; bracket.add(cup);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10), torchFireMat);
      flame.position.set(0, 0.08, 0.25); bracket.add(flame);
      const bx = Math.sin(tAngle) * tRadius, bz = Math.cos(tAngle) * tRadius;
      bracket.position.set(bx, getTerrainHeight(bx, bz, 1.0) + 2.5, bz);
      bracket.rotation.y = -tAngle; mctx.scene.add(bracket);
    }

    // Warm torch lights
    for (let i = 0; i < 12; i++) {
      const tAngle = (i / 12) * Math.PI * 2, tRadius = Math.min(w, d) * 0.42;
      const light = new THREE.PointLight(0xff8844, 0.6, 10);
      light.position.set(Math.sin(tAngle) * tRadius, 3.0, Math.cos(tAngle) * tRadius);
      mctx.scene.add(light); mctx.torchLights.push(light);
    }

    // Bloodstains with splatter trails
    for (let i = 0; i < 20; i++) {
      const stain = new THREE.Mesh(new THREE.CircleGeometry(0.2 + Math.random() * 0.6, 27), bloodMat);
      stain.rotation.x = -Math.PI / 2;
      const sx = (Math.random() - 0.5) * w * 0.35, sz = (Math.random() - 0.5) * d * 0.35;
      stain.position.set(sx, getTerrainHeight(sx, sz, 1.0) + 0.01, sz); mctx.scene.add(stain);
      if (Math.random() > 0.5) {
        for (let sp = 0; sp < 3; sp++) {
          const splat = new THREE.Mesh(new THREE.CircleGeometry(0.05 + Math.random() * 0.1, 20), bloodMat);
          splat.rotation.x = -Math.PI / 2;
          splat.position.set(sx + (Math.random() - 0.5), getTerrainHeight(sx, sz, 1.0) + 0.01, sz + (Math.random() - 0.5));
          mctx.scene.add(splat);
        }
      }
    }

    // Detailed champion statues
    for (let i = 0; i < 8; i++) {
      const statue = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.5, 12), stoneMat);
      body.position.y = 0.95; body.castShadow = true; statue.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), stoneMat);
      head.position.y = 1.8; statue.add(head);
      for (const ax of [-0.22, 0.22]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 17), stoneMat);
        arm.position.set(ax, 1.1, 0); arm.rotation.z = ax > 0 ? -0.4 : 0.4; statue.add(arm);
      }
      const sBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.01), ironMat);
      sBlade.position.set(0.35, 1.4, 0); sBlade.rotation.z = -0.3; statue.add(sBlade);
      const sBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.0), darkStoneMat);
      sBase.position.y = 0.2; statue.add(sBase);
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.02), bronzeMat);
      plaque.position.set(0, 0.35, 0.51); statue.add(plaque);
      const sAngle = (i / 8) * Math.PI * 2, sr = w * 0.32;
      statue.position.set(Math.sin(sAngle) * sr, getTerrainHeight(Math.sin(sAngle) * sr, Math.cos(sAngle) * sr, 1.0), Math.cos(sAngle) * sr);
      statue.rotation.y = -sAngle; mctx.scene.add(statue);
    }

    // Sand mounds and drag marks
    for (let i = 0; i < 10; i++) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.5, 23, 17), sandMat);
      mound.scale.y = 0.3;
      const mx = (Math.random() - 0.5) * w * 0.3, mz = (Math.random() - 0.5) * d * 0.3;
      mound.position.set(mx, getTerrainHeight(mx, mz, 1.0) + 0.05, mz); mctx.scene.add(mound);
    }
    const dragMat = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 1.0 });
    for (let i = 0; i < 8; i++) {
      const drag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 2 + Math.random() * 2), dragMat);
      const dx = (Math.random() - 0.5) * w * 0.3, dz = (Math.random() - 0.5) * d * 0.3;
      drag.position.set(dx, getTerrainHeight(dx, dz, 1.0) + 0.015, dz); drag.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(drag);
    }

    // Spectator skeletons
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa });
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xddccbb });
    const ribGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 12);
    const skullGeo = new THREE.SphereGeometry(0.08, 14, 10);
    for (let i = 0; i < 6; i++) {
      const skel = new THREE.Group();
      const ribcage = new THREE.Mesh(ribGeo, boneMat);
      ribcage.position.y = 0.3; skel.add(ribcage);
      const skull = new THREE.Mesh(skullGeo, skullMat);
      skull.position.y = 0.55; skel.add(skull);
      const skAngle = Math.random() * Math.PI * 2, skR = w * 0.32 + Math.random() * 3;
      skel.position.set(Math.sin(skAngle) * skR, getTerrainHeight(Math.sin(skAngle) * skR, Math.cos(skAngle) * skR, 1.0) + 0.5, Math.cos(skAngle) * skR);
      skel.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      mctx.scene.add(skel);
    }

    // Broken crates and rope coils
    for (let i = 0; i < 5; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6 + Math.random() * 0.3, 0.5 + Math.random() * 0.3, 0.6 + Math.random() * 0.3), woodMat);
      const crx = (Math.random() - 0.5) * w * 0.35, crz = (Math.random() - 0.5) * d * 0.35;
      crate.position.set(crx, getTerrainHeight(crx, crz, 1.0) + 0.25, crz);
      crate.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      mctx.scene.add(crate);
    }
    for (let i = 0; i < 6; i++) {
      const rope = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 17, 30), leatherMat);
      rope.rotation.x = -Math.PI / 2;
      const rx = (Math.random() - 0.5) * w * 0.35, rz = (Math.random() - 0.5) * d * 0.35;
      rope.position.set(rx, getTerrainHeight(rx, rz, 1.0) + 0.04, rz); mctx.scene.add(rope);
    }
    // ── Tiered seating rows (stepped boxes) ──
    for (let tier = 0; tier < 3; tier++) {
      const tierR2 = w * 0.35 + tier * 1.5;
      for (let s = 0; s < 16; s++) {
        const seatAngle = (s / 16) * Math.PI * 2;
        if (Math.random() > 0.3) {
          const seatBlock = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.6), stoneMat);
          const stx = Math.sin(seatAngle) * tierR2, stz2 = Math.cos(seatAngle) * tierR2;
          seatBlock.position.set(stx, 0.6 + tier * 0.6, stz2);
          seatBlock.rotation.y = -seatAngle; mctx.scene.add(seatBlock);
        }
      }
    }
    // ── Arena floor sand pit detail ──
    const sandPitMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 1.0 });
    const sandPitGeo = new THREE.CircleGeometry(0.5, 10);
    for (let i = 0; i < 10; i++) {
      const sandPit = new THREE.Mesh(sandPitGeo, sandPitMat);
      sandPit.rotation.x = -Math.PI / 2;
      const spx = (Math.random()-0.5)*w*0.25, spz = (Math.random()-0.5)*d*0.25;
      sandPit.position.set(spx, 0.025, spz); mctx.scene.add(sandPit);
    }
    // ── Gladiator equipment racks ──
    for (let i = 0; i < 4; i++) {
      const rack = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.1), woodMat);
      rack.add(frame);
      for (let h = 0; h < 3; h++) {
        const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.15, 16), ironMat);
        hook.position.set(-0.3 + h * 0.3, 0.3, 0.06);
        hook.rotation.z = -0.5; rack.add(hook);
      }
      const rx2 = (Math.random()-0.5)*w*0.35, rz2 = (Math.random()-0.5)*d*0.35;
      rack.position.set(rx2, getTerrainHeight(rx2, rz2, 1.0) + 0.8, rz2);
      rack.rotation.y = Math.random() * Math.PI; mctx.scene.add(rack);
    }
    // ── Lion cage bars ──
    for (let i = 0; i < 2; i++) {
      const cage = new THREE.Group();
      for (let b = 0; b < 8; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 16), ironMat);
        bar.position.set(-0.7 + b * 0.2, 0.9, 0); cage.add(bar);
      }
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), ironMat);
      topBar.position.y = 1.8; cage.add(topBar);
      const botBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), ironMat);
      cage.add(botBar);
      const cgx = (Math.random()-0.5)*w*0.38, cgz = (Math.random()-0.5)*d*0.38;
      cage.position.set(cgx, getTerrainHeight(cgx, cgz, 1.0), cgz);
      cage.rotation.y = Math.random() * Math.PI; mctx.scene.add(cage);
    }
    // ── Victory arch fragments ──
    for (let i = 0; i < 2; i++) {
      const arch = new THREE.Group();
      const lPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), stoneMat);
      lPillar.position.set(-1.0, 1.5, 0); arch.add(lPillar);
      const rPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), stoneMat);
      rPillar.position.set(1.0, 1.5, 0); arch.add(rPillar);
      const archTop = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.2, 16, 20, Math.PI), stoneMat);
      archTop.position.y = 3; arch.add(archTop);
      const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), darkStoneMat);
      keystone.position.y = 4; arch.add(keystone);
      const aAngle = Math.random() * Math.PI * 2;
      const ar = w * 0.38;
      arch.position.set(Math.sin(aAngle) * ar, getTerrainHeight(Math.sin(aAngle) * ar, Math.cos(aAngle) * ar, 1.0), Math.cos(aAngle) * ar);
      arch.rotation.y = -aAngle; mctx.scene.add(arch);
    }

    // ── Gladiator training dummies ──
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 1.0 });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xbbaa77, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const dummy = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 12), woodMat);
      post.position.y = 0.9; dummy.add(post);
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 10), woodMat);
      crossbar.position.set(0, 1.3, 0); crossbar.rotation.z = Math.PI / 2; dummy.add(crossbar);
      const strawBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.8, 14), hayMat);
      strawBody.position.y = 0.9; dummy.add(strawBody);
      const sackHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), sackMat);
      sackHead.position.y = 1.55; dummy.add(sackHead);
      const shieldTarget = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), ironMat);
      shieldTarget.position.set(0.5, 1.3, 0.02); dummy.add(shieldTarget);
      const dummyX = (Math.random() - 0.5) * w * 0.3, dummyZ = (Math.random() - 0.5) * d * 0.3;
      dummy.position.set(dummyX, getTerrainHeight(dummyX, dummyZ, 1.0), dummyZ);
      dummy.rotation.y = Math.random() * Math.PI; mctx.scene.add(dummy);
    }

    // ── Spectator skeleton remains (seated on tiers) ──
    const skelBoneMat = new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const skelGroup = new THREE.Group();
      const skull2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skelBoneMat);
      skull2.position.y = 0.7; skelGroup.add(skull2);
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 10), skelBoneMat);
      spine.position.y = 0.45; skelGroup.add(spine);
      for (const side of [-1, 1]) {
        const armBone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.35, 8), skelBoneMat);
        armBone.position.set(side * 0.15, 0.4, 0);
        armBone.rotation.z = side * 0.6; skelGroup.add(armBone);
      }
      for (const side of [-1, 1]) {
        const legBone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 8), skelBoneMat);
        legBone.position.set(side * 0.1, 0.15, 0.15);
        legBone.rotation.x = -0.8; skelGroup.add(legBone);
      }
      const skAngle2 = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const skR2 = w * 0.30 + Math.floor(i / 4) * 1.8;
      skelGroup.position.set(Math.sin(skAngle2) * skR2, 0.5 + Math.floor(i / 4) * 0.6, Math.cos(skAngle2) * skR2);
      skelGroup.rotation.y = -skAngle2 + Math.PI; mctx.scene.add(skelGroup);
    }

    // ── Victor's podium ──
    const goldPodiumMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.7, roughness: 0.3 });
    const silverPodiumMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
    const bronzePodiumMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, metalness: 0.5, roughness: 0.4 });
    {
      const podium = new THREE.Group();
      const tier1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.2), bronzePodiumMat);
      tier1.position.y = 0.15; podium.add(tier1);
      const tier2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.0), silverPodiumMat);
      tier2.position.y = 0.45; podium.add(tier2);
      const tier3 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), goldPodiumMat);
      tier3.position.y = 0.75; podium.add(tier3);
      const laurelMat = wreathMat;
      const laurel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), laurelMat);
      laurel.rotation.x = -Math.PI / 2; laurel.position.y = 0.95; podium.add(laurel);
      const podX = w * 0.15, podZ = -d * 0.18;
      podium.position.set(podX, getTerrainHeight(podX, podZ, 1.0), podZ);
      mctx.scene.add(podium);
    }

    // ── Underground tunnel entrances ──
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
    for (let i = 0; i < 4; i++) {
      const tunnel = new THREE.Group();
      const tunnelAngle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const tunnelR = Math.min(w, d) * 0.40;
      const opening = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), darkMat);
      opening.position.z = -0.01; tunnel.add(opening);
      const archFrame = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 12, 16, Math.PI), stoneMat);
      archFrame.position.y = 0; tunnel.add(archFrame);
      for (let b = 0; b < 5; b++) {
        const gateBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8), ironMat);
        gateBar.position.set(-0.6 + b * 0.3, 0, 0.05); tunnel.add(gateBar);
      }
      const tx2 = Math.sin(tunnelAngle) * tunnelR, tz2 = Math.cos(tunnelAngle) * tunnelR;
      tunnel.position.set(tx2, getTerrainHeight(tx2, tz2, 1.0) + 1.0, tz2);
      tunnel.rotation.y = -tunnelAngle; mctx.scene.add(tunnel);
    }

    // ── Fallen column sections ──
    for (let i = 0; i < 8; i++) {
      const colGroup = new THREE.Group();
      const colLen = 1.5 + Math.random() * 2.5;
      const colR = 0.25 + Math.random() * 0.15;
      const colSeg = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR, colLen, 10), stoneMat);
      colSeg.rotation.z = Math.PI / 2; colSeg.position.y = colR; colGroup.add(colSeg);
      if (Math.random() > 0.4) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(colLen * 0.6, 0.01, 0.02), darkStoneMat);
        crack.position.set(0, colR * 2, 0); colGroup.add(crack);
      }
      for (let r = 0; r < 2 + Math.floor(Math.random() * 3); r++) {
        const rubble2 = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.2, 0.1 + Math.random() * 0.15, 0.15 + Math.random() * 0.2), stoneMat);
        rubble2.position.set((Math.random() - 0.5) * colLen, 0.05, (Math.random() - 0.5) * 1.0);
        rubble2.rotation.set(Math.random(), Math.random(), Math.random()); colGroup.add(rubble2);
      }
      const fcx = (Math.random() - 0.5) * w * 0.4, fcz = (Math.random() - 0.5) * d * 0.4;
      colGroup.position.set(fcx, getTerrainHeight(fcx, fcz, 1.0), fcz);
      colGroup.rotation.y = Math.random() * Math.PI; mctx.scene.add(colGroup);
    }

    // ── Sand pit texture (central area) ──
    {
      const sandPitCenter = new THREE.Mesh(new THREE.CircleGeometry(w * 0.22, 48), sandMat);
      sandPitCenter.rotation.x = -Math.PI / 2; sandPitCenter.position.y = 0.015; mctx.scene.add(sandPitCenter);
      const sandRim = new THREE.Mesh(new THREE.TorusGeometry(w * 0.22, 0.1, 10, 48), sandMat);
      sandRim.rotation.x = -Math.PI / 2; sandRim.position.y = 0.04; mctx.scene.add(sandRim);
      for (let i = 0; i < 30; i++) {
        const sandBit = new THREE.Mesh(new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.02, 0.08 + Math.random() * 0.1),
          sackMat);
        const sAngle2 = Math.random() * Math.PI * 2, sDist = Math.random() * w * 0.2;
        sandBit.position.set(Math.cos(sAngle2) * sDist, 0.02, Math.sin(sAngle2) * sDist);
        sandBit.rotation.y = Math.random() * Math.PI; mctx.scene.add(sandBit);
      }
    }

    // ── Chain and manacle props ──
    for (let i = 0; i < 6; i++) {
      const chainGroup = new THREE.Group();
      const linkCount = 4 + Math.floor(Math.random() * 3);
      for (let l = 0; l < linkCount; l++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 8, 12), chainMat);
        link.position.y = -l * 0.08;
        link.rotation.x = l % 2 === 0 ? 0 : Math.PI / 2;
        chainGroup.add(link);
      }
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), ironMat);
      cuff.position.y = -linkCount * 0.08 - 0.04;
      chainGroup.add(cuff);
      const plate = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), ironMat);
      plate.position.y = 0.02; chainGroup.add(plate);
      const chAngle = (i / 6) * Math.PI * 2;
      const chR = Math.min(w, d) * 0.41;
      chainGroup.position.set(Math.sin(chAngle) * chR, getTerrainHeight(Math.sin(chAngle) * chR, Math.cos(chAngle) * chR, 1.0) + 1.8, Math.cos(chAngle) * chR);
      chainGroup.rotation.y = -chAngle; mctx.scene.add(chainGroup);
    }
}

export function buildPetrifiedGarden(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x555550, 0.016);
    mctx.applyTerrainColors(0x3a3a38, 0x4a4a48, 1.0);
    mctx.dirLight.color.setHex(0xccccbb);
    mctx.dirLight.intensity = 1.0;
    mctx.ambientLight.color.setHex(0x2a2a2a);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x888888);
    mctx.hemiLight.groundColor.setHex(0x333333);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.6 });
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x88ccaa, emissive: 0x448866, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
    const crackedMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    const lichMat = new THREE.MeshStandardMaterial({ color: 0x88aa77, roughness: 0.5 });

    // Petrified trees with roots, sub-branches, canopy stubs
    for (let i = 0; i < 40; i++) {
      const tree = new THREE.Group();
      const h = 2 + Math.random() * 4;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 + Math.random() * 0.08, 0.2 + Math.random() * 0.1, h, 12), stoneMat);
      trunk.position.y = h / 2; trunk.castShadow = true; tree.add(trunk);
      for (let r = 0; r < 3; r++) {
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.8 + Math.random() * 0.6, 17), darkStoneMat);
        const rootAngle = (r / 3) * Math.PI * 2 + Math.random() * 0.5;
        root.position.set(Math.sin(rootAngle) * 0.2, 0.15, Math.cos(rootAngle) * 0.2);
        root.rotation.z = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4);
        root.rotation.y = rootAngle; tree.add(root);
      }
      for (let b = 0; b < 4 + Math.floor(Math.random() * 3); b++) {
        const bLen = 0.8 + Math.random() * 1.2;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, bLen, 17), stoneMat);
        branch.position.set((Math.random() - 0.5) * 0.3, h * 0.4 + b * 0.35, (Math.random() - 0.5) * 0.3);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.5; tree.add(branch);
        if (Math.random() > 0.5) {
          const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.4 + Math.random() * 0.3, 16), stoneMat);
          sub.position.copy(branch.position); sub.position.y += 0.2;
          sub.rotation.z = branch.rotation.z + (Math.random() - 0.5) * 0.8; tree.add(sub);
        }
      }
      if (Math.random() > 0.5) {
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 31, 20), darkStoneMat);
        canopy.scale.y = 0.4; canopy.position.y = h + 0.2; tree.add(canopy);
      }
      const tx = (Math.random() - 0.5) * w * 0.85, tz = (Math.random() - 0.5) * d * 0.85;
      tree.position.set(tx, getTerrainHeight(tx, tz, 1.0), tz); mctx.scene.add(tree);
    }

    // Petrified people with legs, arms in varied poses
    for (let i = 0; i < 20; i++) {
      const statue = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 10), stoneMat);
      body.position.y = 0.55; statue.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), stoneMat);
      head.position.y = 1.05; statue.add(head);
      for (const lx of [-0.06, 0.06]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 17), stoneMat);
        leg.position.set(lx, 0.1, 0); statue.add(leg);
      }
      for (const ax of [-0.15, 0.15]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 17), stoneMat);
        arm.position.set(ax, 0.7, 0);
        arm.rotation.z = ax > 0 ? -0.3 - Math.random() * 0.8 : 0.3 + Math.random() * 0.8;
        arm.rotation.x = (Math.random() - 0.5) * 0.6; statue.add(arm);
      }
      if (Math.random() > 0.6) {
        const obj = new THREE.Mesh(new THREE.SphereGeometry(0.06, 17, 16), darkStoneMat);
        obj.position.set(0.25, 0.9, 0.1); statue.add(obj);
      }
      const sx = (Math.random() - 0.5) * w * 0.75, sz = (Math.random() - 0.5) * d * 0.75;
      statue.position.set(sx, getTerrainHeight(sx, sz, 1.0), sz);
      statue.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(statue);
    }

    // Petrified animals (deer, birds)
    for (let i = 0; i < 12; i++) {
      const animal = new THREE.Group();
      if (Math.random() > 0.5) {
        const deerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 10), stoneMat);
        deerBody.rotation.z = Math.PI / 2; deerBody.position.y = 0.35; animal.add(deerBody);
        const deerHead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), stoneMat);
        deerHead.position.set(0.35, 0.45, 0); animal.add(deerHead);
        for (let l = 0; l < 4; l++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 16), stoneMat);
          leg.position.set((l < 2 ? 0.15 : -0.15), 0.1, l % 2 === 0 ? 0.06 : -0.06); animal.add(leg);
        }
        for (const side of [-1, 1]) {
          const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.2, 16), stoneMat);
          antler.position.set(0.35, 0.55, side * 0.05); antler.rotation.z = side * -0.4; animal.add(antler);
        }
      } else {
        const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 17), stoneMat);
        birdBody.scale.x = 1.5; birdBody.position.y = 0.12; animal.add(birdBody);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 16), stoneMat);
        beak.position.set(0.1, 0.14, 0); beak.rotation.z = -Math.PI / 2; animal.add(beak);
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.06), stoneMat);
          wing.position.set(0, 0.14, side * 0.06); wing.rotation.x = side * 0.4; animal.add(wing);
        }
      }
      const ax = (Math.random() - 0.5) * w * 0.7, az = (Math.random() - 0.5) * d * 0.7;
      animal.position.set(ax, getTerrainHeight(ax, az, 1.0), az);
      animal.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(animal);
    }

    // Calcified rose bushes with thorns
    for (let i = 0; i < 30; i++) {
      const bush = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 23, 20), darkStoneMat);
      core.scale.y = 0.7; core.position.y = 0.15; bush.add(core);
      for (let t = 0; t < 3 + Math.floor(Math.random() * 3); t++) {
        const thorn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 0.3 + Math.random() * 0.2, 16), stoneMat);
        thorn.position.set((Math.random() - 0.5) * 0.3, 0.2 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3);
        thorn.rotation.set(Math.random() - 0.5, 0, Math.random() - 0.5); bush.add(thorn);
      }
      const bx = (Math.random() - 0.5) * w * 0.8, bz = (Math.random() - 0.5) * d * 0.8;
      bush.position.set(bx, getTerrainHeight(bx, bz, 1.0), bz); mctx.scene.add(bush);
    }

    // Fossilized fountains with frozen spouts and decorative lips
    for (let i = 0; i < 6; i++) {
      const fountain = new THREE.Group();
      const outerBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 0.3, 30), darkStoneMat);
      outerBasin.position.y = 0.15; fountain.add(outerBasin);
      const innerBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 0.4, 30), stoneMat);
      innerBasin.position.y = 0.3; fountain.add(innerBasin);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.2, 10), stoneMat);
      center.position.y = 0.8; fountain.add(center);
      const spout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 31), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5 }));
      spout.position.y = 1.5; fountain.add(spout);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 17, 44), stoneMat);
      lip.rotation.x = -Math.PI / 2; lip.position.y = 0.32; fountain.add(lip);
      const fx = (Math.random() - 0.5) * w * 0.5, fz = (Math.random() - 0.5) * d * 0.5;
      fountain.position.set(fx, getTerrainHeight(fx, fz, 1.0), fz); mctx.scene.add(fountain);
    }

    // Crystal formations growing from stone
    for (let i = 0; i < 15; i++) {
      const cluster = new THREE.Group();
      for (let c = 0; c < 3 + Math.floor(Math.random() * 4); c++) {
        const crystH = 0.3 + Math.random() * 0.6;
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.04 + Math.random() * 0.06, crystH, 20), crystalMat);
        crystal.position.set((Math.random() - 0.5) * 0.2, crystH / 2, (Math.random() - 0.5) * 0.2);
        crystal.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3); cluster.add(crystal);
      }
      const cx = (Math.random() - 0.5) * w * 0.7, cz = (Math.random() - 0.5) * d * 0.7;
      cluster.position.set(cx, getTerrainHeight(cx, cz, 1.0), cz); mctx.scene.add(cluster);
    }

    // Crystal glow lights
    for (let i = 0; i < 8; i++) {
      const glow = new THREE.PointLight(0x66ccaa, 0.4, 8);
      glow.position.set((Math.random() - 0.5) * w * 0.6, 0.5 + Math.random(), (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(glow); mctx.torchLights.push(glow);
    }

    // Moss patches
    for (let i = 0; i < 30; i++) {
      const moss = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 1.2, 27), mossMat);
      moss.rotation.x = -Math.PI / 2;
      const mx = (Math.random() - 0.5) * w * 0.8, mz = (Math.random() - 0.5) * d * 0.8;
      moss.position.set(mx, getTerrainHeight(mx, mz, 1.0) + 0.02, mz); mctx.scene.add(moss);
    }

    // Lichen on surfaces
    for (let i = 0; i < 15; i++) {
      const lichen = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.2, 23), lichMat);
      lichen.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      const lx = (Math.random() - 0.5) * w * 0.8, lz = (Math.random() - 0.5) * d * 0.8;
      lichen.position.set(lx, getTerrainHeight(lx, lz, 1.0) + 0.3 + Math.random() * 1.5, lz);
      lichen.rotation.y = Math.random() * Math.PI; mctx.scene.add(lichen);
    }

    // Cracked stone paths with crack details
    for (let i = 0; i < 40; i++) {
      const pathStone = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.3, 0.05, 0.5 + Math.random() * 0.3), crackedMat);
      const px = (Math.random() - 0.5) * w * 0.6, pz = (Math.random() - 0.5) * d * 0.6;
      pathStone.position.set(px, getTerrainHeight(px, pz, 1.0) + 0.03, pz);
      pathStone.rotation.y = Math.random() * Math.PI; mctx.scene.add(pathStone);
      if (Math.random() > 0.5) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.3 + Math.random() * 0.2), darkStoneMat);
        crack.position.set(px + (Math.random() - 0.5) * 0.2, getTerrainHeight(px, pz, 1.0) + 0.06, pz + (Math.random() - 0.5) * 0.2);
        crack.rotation.y = Math.random() * Math.PI; mctx.scene.add(crack);
      }
    }

    // Stone benches
    for (let i = 0; i < 8; i++) {
      const bench = new THREE.Group();
      const seatB = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), stoneMat);
      seatB.position.y = 0.4; bench.add(seatB);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.35), darkStoneMat);
      legL.position.set(-0.45, 0.2, 0); bench.add(legL);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.35), darkStoneMat);
      legR.position.set(0.45, 0.2, 0); bench.add(legR);
      const bnx = (Math.random() - 0.5) * w * 0.6, bnz = (Math.random() - 0.5) * d * 0.6;
      bench.position.set(bnx, getTerrainHeight(bnx, bnz, 1.0), bnz);
      bench.rotation.y = Math.random() * Math.PI; mctx.scene.add(bench);
    }

    // Stone garden border edging
    for (let i = 0; i < 20; i++) {
      const edging = new THREE.Mesh(new THREE.BoxGeometry(1.5 + Math.random(), 0.2, 0.12), darkStoneMat);
      const ex = (Math.random() - 0.5) * w * 0.7, ez = (Math.random() - 0.5) * d * 0.7;
      edging.position.set(ex, getTerrainHeight(ex, ez, 1.0) + 0.1, ez);
      edging.rotation.y = Math.random() * Math.PI; mctx.scene.add(edging);
    }
    // ── Petrified tree stone bark texture detail ──
    for (let i = 0; i < 20; i++) {
      const barkDetail = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4 + Math.random() * 0.6, 0.01), darkStoneMat);
        strip.position.set((Math.random()-0.5)*0.15, s * 0.5, (Math.random()-0.5)*0.15);
        strip.rotation.z = (Math.random()-0.5)*0.1; barkDetail.add(strip);
      }
      const bdx = (Math.random()-0.5)*w*0.8, bdz = (Math.random()-0.5)*d*0.8;
      barkDetail.position.set(bdx, getTerrainHeight(bdx, bdz, 1.0) + 0.5 + Math.random() * 2, bdz);
      barkDetail.rotation.y = Math.random() * Math.PI; mctx.scene.add(barkDetail);
    }
    // ── Frozen-in-time bird/animal statues ──
    for (let i = 0; i < 8; i++) {
      const frozen = new THREE.Group();
      if (Math.random() > 0.5) {
        const butterfly = new THREE.Group();
        const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.05, 16), stoneMat);
        butterfly.add(bBody);
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x999999, side: THREE.DoubleSide }));
          wing.position.set(side * 0.03, 0.01, 0); wing.rotation.x = side * 0.3; butterfly.add(wing);
        }
        frozen.add(butterfly);
      } else {
        const squirrel = new THREE.Group();
        const sBody = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), stoneMat);
        sBody.scale.x = 1.3; squirrel.add(sBody);
        const sTail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.08, 16), stoneMat);
        sTail.position.set(-0.05, 0.03, 0); sTail.rotation.z = 0.8; squirrel.add(sTail);
        frozen.add(squirrel);
      }
      const frx = (Math.random()-0.5)*w*0.7, frz = (Math.random()-0.5)*d*0.7;
      frozen.position.set(frx, getTerrainHeight(frx, frz, 1.0) + 0.5 + Math.random() * 2, frz);
      frozen.rotation.y = Math.random() * Math.PI; mctx.scene.add(frozen);
    }
    // ── Stone flower beds ──
    for (let i = 0; i < 10; i++) {
      const bed = new THREE.Group();
      const border = new THREE.Mesh(new THREE.TorusGeometry(0.5 + Math.random() * 0.3, 0.06, 16, 20), darkStoneMat);
      border.rotation.x = -Math.PI / 2; bed.add(border);
      for (let f = 0; f < 4 + Math.floor(Math.random() * 3); f++) {
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1 + Math.random() * 0.08, 16), stoneMat);
        flower.position.set((Math.random()-0.5)*0.4, 0.05, (Math.random()-0.5)*0.4); bed.add(flower);
      }
      const fbx = (Math.random()-0.5)*w*0.6, fbz = (Math.random()-0.5)*d*0.6;
      bed.position.set(fbx, getTerrainHeight(fbx, fbz, 1.0) + 0.02, fbz); mctx.scene.add(bed);
    }
    // ── Vine fossils on walls ──
    for (let i = 0; i < 15; i++) {
      const fossil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.8 + Math.random() * 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.7 }));
      const vfx = (Math.random()-0.5)*w*0.75, vfz = (Math.random()-0.5)*d*0.75;
      fossil.position.set(vfx, getTerrainHeight(vfx, vfz, 1.0) + 0.5 + Math.random() * 2, vfz);
      fossil.rotation.set(Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.5); mctx.scene.add(fossil);
    }

    // ── Dense ground grass ──
    const petrifiedGrassShades = [
      new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x778877, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.65, side: THREE.DoubleSide }),
    ];
    for (let gi = 0; gi < 120; gi++) {
      const grassClump = new THREE.Group();
      const bladeCount = 5 + Math.floor(Math.random() * 6);
      for (let bl = 0; bl < bladeCount; bl++) {
        const bladeH = 0.2 + Math.random() * 0.2;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05 + Math.random() * 0.03, bladeH),
          petrifiedGrassShades[Math.floor(Math.random() * 3)],
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

    // ── Enhanced lighting ──
    mctx.dirLight.intensity = 1.2;
    mctx.ambientLight.intensity = 0.6;
    (mctx.scene.fog as THREE.FogExp2).density = 0.012;

    // ── Additional petrified trees (stone-colored trunks with stone foliage) ──
    for (let i = 0; i < 25; i++) {
      const pTree = new THREE.Group();
      const pH = 3 + Math.random() * 5;
      const pTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 + Math.random() * 0.12, 0.25 + Math.random() * 0.15, pH, 10), stoneMat);
      pTrunk.position.y = pH / 2; pTree.add(pTrunk);
      // Stone foliage clusters
      for (let f = 0; f < 3 + Math.floor(Math.random() * 3); f++) {
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.8, 16, 12), darkStoneMat);
        foliage.scale.y = 0.5 + Math.random() * 0.3;
        const fAngle = (f / 4) * Math.PI * 2 + Math.random() * 0.5;
        foliage.position.set(Math.cos(fAngle) * 0.5, pH * 0.7 + f * 0.3, Math.sin(fAngle) * 0.5);
        pTree.add(foliage);
      }
      // Broken branches
      for (let b = 0; b < 2; b++) {
        const brokenBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.6 + Math.random() * 0.5, 8), stoneMat);
        brokenBranch.position.set((Math.random() - 0.5) * 0.4, pH * 0.3 + b * 0.8, (Math.random() - 0.5) * 0.4);
        brokenBranch.rotation.z = (Math.random() - 0.5) * 1.5; pTree.add(brokenBranch);
      }
      const ptx = (Math.random() - 0.5) * w * 0.85, ptz = (Math.random() - 0.5) * d * 0.85;
      pTree.position.set(ptx, getTerrainHeight(ptx, ptz, 0.5), ptz); mctx.scene.add(pTree);
    }

    // ── Stone statues of people (frozen in various poses) ──
    for (let i = 0; i < 15; i++) {
      const fig = new THREE.Group();
      const poses = ['reaching', 'fleeing', 'crouching', 'shielding'];
      const pose = poses[i % 4];
      // Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 8), stoneMat);
      torso.position.y = 0.6; fig.add(torso);
      // Head
      const figHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), stoneMat);
      figHead.position.y = 1.15; fig.add(figHead);
      // Legs
      for (const lx of [-0.07, 0.07]) {
        const figLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.55, 8), darkStoneMat);
        figLeg.position.set(lx, 0.12, 0);
        if (pose === 'fleeing') figLeg.rotation.x = lx > 0 ? -0.4 : 0.4;
        if (pose === 'crouching') { figLeg.scale.y = 0.7; figLeg.position.y = 0.08; }
        fig.add(figLeg);
      }
      // Arms based on pose
      for (const side of [-1, 1]) {
        const figArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8), stoneMat);
        figArm.position.set(side * 0.17, 0.75, 0);
        if (pose === 'reaching') { figArm.rotation.z = side * -1.2; figArm.rotation.x = -0.3; }
        else if (pose === 'fleeing') { figArm.rotation.z = side * -0.6; figArm.rotation.x = -0.5; }
        else if (pose === 'shielding') { figArm.rotation.z = side > 0 ? -1.5 : 0.3; figArm.rotation.x = side > 0 ? -0.8 : 0; }
        else { figArm.rotation.z = side * -0.2; }
        fig.add(figArm);
      }
      // Crouching lowers the whole figure
      if (pose === 'crouching') fig.scale.y = 0.7;
      // Weathering cracks
      for (let c = 0; c < 2; c++) {
        const figCrack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.3, 0.005), darkStoneMat);
        figCrack.position.set((Math.random() - 0.5) * 0.1, 0.4 + Math.random() * 0.5, 0.13);
        figCrack.rotation.z = (Math.random() - 0.5) * 0.5; fig.add(figCrack);
      }
      const fsx = (Math.random() - 0.5) * w * 0.7, fsz = (Math.random() - 0.5) * d * 0.7;
      fig.position.set(fsx, getTerrainHeight(fsx, fsz, 0.5), fsz);
      fig.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(fig);
    }

    // ── Crumbling stone benches ──
    for (let i = 0; i < 10; i++) {
      const crBench = new THREE.Group();
      const seatLen = 1.0 + Math.random() * 0.8;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatLen, 0.07, 0.35), stoneMat);
      seat.position.y = 0.35;
      // Tilt slightly to show decay
      seat.rotation.z = (Math.random() - 0.5) * 0.15; crBench.add(seat);
      // Legs - one might be broken
      const legH1 = 0.35, legH2 = 0.15 + Math.random() * 0.2;
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, legH1, 0.3), darkStoneMat);
      leg1.position.set(-seatLen * 0.38, legH1 / 2, 0); crBench.add(leg1);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, legH2, 0.3), darkStoneMat);
      leg2.position.set(seatLen * 0.38, legH2 / 2, 0); crBench.add(leg2);
      // Rubble chunks around broken leg
      for (let r = 0; r < 3; r++) {
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.04, 0), darkStoneMat);
        chunk.position.set(seatLen * 0.38 + (Math.random() - 0.5) * 0.2, 0.02, (Math.random() - 0.5) * 0.15);
        crBench.add(chunk);
      }
      const cbx = (Math.random() - 0.5) * w * 0.6, cbz = (Math.random() - 0.5) * d * 0.6;
      crBench.position.set(cbx, getTerrainHeight(cbx, cbz, 0.5), cbz);
      crBench.rotation.y = Math.random() * Math.PI; mctx.scene.add(crBench);
    }

    // ── Crumbling stone fountains ──
    for (let i = 0; i < 4; i++) {
      const crFountain = new THREE.Group();
      // Broken basin
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 0.25, 24, 1, true), stoneMat);
      basin.position.y = 0.12; crFountain.add(basin);
      // Lip with missing section (two arcs)
      const fLip = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 12, 20, Math.PI * 1.5), darkStoneMat);
      fLip.rotation.x = -Math.PI / 2; fLip.position.y = 0.25; crFountain.add(fLip);
      // Broken central pillar
      const pillarH = 0.5 + Math.random() * 0.5;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, pillarH, 8), stoneMat);
      pillar.position.y = pillarH / 2 + 0.1; crFountain.add(pillar);
      // Rubble inside basin
      for (let r = 0; r < 5; r++) {
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.08, 0), darkStoneMat);
        const ra = Math.random() * Math.PI * 2;
        rubble.position.set(Math.cos(ra) * 0.4, 0.05, Math.sin(ra) * 0.4);
        crFountain.add(rubble);
      }
      const cfx = (Math.random() - 0.5) * w * 0.5, cfz = (Math.random() - 0.5) * d * 0.5;
      crFountain.position.set(cfx, getTerrainHeight(cfx, cfz, 0.5), cfz); mctx.scene.add(crFountain);
    }

    // ── Stone flower beds (geometric shapes representing frozen flowers) ──
    for (let i = 0; i < 14; i++) {
      const flowerBed = new THREE.Group();
      const bedR = 0.6 + Math.random() * 0.5;
      const bedBorder = new THREE.Mesh(new THREE.TorusGeometry(bedR, 0.05, 10, 16), darkStoneMat);
      bedBorder.rotation.x = -Math.PI / 2; flowerBed.add(bedBorder);
      // Frozen flowers - cone petals radiating from center
      for (let f = 0; f < 5 + Math.floor(Math.random() * 4); f++) {
        const flowerGrp = new THREE.Group();
        // Stem
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.15 + Math.random() * 0.1, 6), stoneMat);
        stem.position.y = 0.07; flowerGrp.add(stem);
        // Petals (small flat cones arranged in circle)
        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 4), stoneMat);
          const pAngle = (p / 5) * Math.PI * 2;
          petal.position.set(Math.cos(pAngle) * 0.025, 0.15, Math.sin(pAngle) * 0.025);
          petal.rotation.z = Math.cos(pAngle) * 0.8;
          petal.rotation.x = Math.sin(pAngle) * 0.8;
          flowerGrp.add(petal);
        }
        const ffa = Math.random() * Math.PI * 2;
        const ffr = Math.random() * bedR * 0.7;
        flowerGrp.position.set(Math.cos(ffa) * ffr, 0, Math.sin(ffa) * ffr);
        flowerBed.add(flowerGrp);
      }
      const fbx2 = (Math.random() - 0.5) * w * 0.65, fbz2 = (Math.random() - 0.5) * d * 0.65;
      flowerBed.position.set(fbx2, getTerrainHeight(fbx2, fbz2, 0.5) + 0.01, fbz2);
      mctx.scene.add(flowerBed);
    }

    // ── Overgrown cracks with real vegetation breaking through ──
    for (let i = 0; i < 25; i++) {
      const crackVeg = new THREE.Group();
      // Crack in ground
      const crackLine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.8 + Math.random() * 1.2), darkStoneMat);
      crackVeg.add(crackLine);
      // Green shoots growing from crack
      const shootCount = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < shootCount; s++) {
        const shootH = 0.1 + Math.random() * 0.25;
        const shoot = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.01, shootH, 6),
          new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.5 }));
        shoot.position.set(0, shootH / 2, (Math.random() - 0.5) * 0.6);
        shoot.rotation.z = (Math.random() - 0.5) * 0.4; crackVeg.add(shoot);
        // Tiny leaf
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x55bb44, side: THREE.DoubleSide }));
        leaf.position.set(0.015, shootH * 0.7, shoot.position.z);
        leaf.rotation.y = Math.random() * Math.PI; crackVeg.add(leaf);
      }
      const cvx = (Math.random() - 0.5) * w * 0.8, cvz = (Math.random() - 0.5) * d * 0.8;
      crackVeg.position.set(cvx, getTerrainHeight(cvx, cvz, 0.5) + 0.02, cvz);
      crackVeg.rotation.y = Math.random() * Math.PI; mctx.scene.add(crackVeg);
    }

    // ── Fallen petrified leaves on ground ──
    for (let i = 0; i < 60; i++) {
      const leafSize = 0.04 + Math.random() * 0.06;
      const fallenLeaf = new THREE.Mesh(new THREE.PlaneGeometry(leafSize, leafSize * 1.3),
        new THREE.MeshStandardMaterial({ color: 0x777770 + Math.floor(Math.random() * 0x111111), roughness: 0.8, side: THREE.DoubleSide }));
      fallenLeaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
      fallenLeaf.rotation.z = Math.random() * Math.PI;
      const flx = (Math.random() - 0.5) * w * 0.85, flz = (Math.random() - 0.5) * d * 0.85;
      fallenLeaf.position.set(flx, getTerrainHeight(flx, flz, 0.5) + 0.02, flz);
      mctx.scene.add(fallenLeaf);
    }

    // ── Gorgon shrine/altar ──
    for (let i = 0; i < 3; i++) {
      const shrine = new THREE.Group();
      // Stone platform base
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.3, 8), darkStoneMat);
      platform.position.y = 0.15; shrine.add(platform);
      // Second tier
      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.2, 8), stoneMat);
      tier2.position.y = 0.4; shrine.add(tier2);
      // Central altar stone
      const altar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), stoneMat);
      altar.position.y = 0.8; shrine.add(altar);
      // Snake motifs (coiled cylinders around altar)
      for (let s = 0; s < 3; s++) {
        const snakeAngle = (s / 3) * Math.PI * 2;
        const snakeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.5 }));
        snakeCoil.position.set(Math.cos(snakeAngle) * 0.5, 0.5 + s * 0.15, Math.sin(snakeAngle) * 0.5);
        snakeCoil.rotation.set(Math.random() * 0.5, snakeAngle, Math.random() * 0.3);
        shrine.add(snakeCoil);
        // Snake head
        const snakeHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.5 }));
        snakeHead.position.set(Math.cos(snakeAngle) * 0.55, 0.65 + s * 0.15, Math.sin(snakeAngle) * 0.55);
        shrine.add(snakeHead);
      }
      // Gorgon head relief on altar (stylized)
      const gorgonFace = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), stoneMat);
      gorgonFace.scale.z = 0.3; gorgonFace.position.set(0, 1.0, 0.28); shrine.add(gorgonFace);
      // Snake hair
      for (let h = 0; h < 6; h++) {
        const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.2, 6), stoneMat);
        const hAngle = (h / 6) * Math.PI + Math.PI * 0.5;
        hair.position.set(Math.cos(hAngle) * 0.12, 1.1, 0.28);
        hair.rotation.z = Math.cos(hAngle) * 0.6;
        hair.rotation.x = -0.3; shrine.add(hair);
      }
      // Eerie glow
      const shrineLight = new THREE.PointLight(0x88aa77, 0.5, 8);
      shrineLight.position.set(0, 1.5, 0); shrine.add(shrineLight); mctx.torchLights.push(shrineLight);
      const shx = (Math.random() - 0.5) * w * 0.4, shz = (Math.random() - 0.5) * d * 0.4;
      shrine.position.set(shx, getTerrainHeight(shx, shz, 0.5), shz);
      shrine.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(shrine);
    }

    // ── Grey stone tiles (ground detail) ──
    for (let i = 0; i < 50; i++) {
      const tileW = 0.4 + Math.random() * 0.5, tileD = 0.4 + Math.random() * 0.5;
      const sTile = new THREE.Mesh(new THREE.BoxGeometry(tileW, 0.04, tileD), crackedMat);
      const stx = (Math.random() - 0.5) * w * 0.8, stz = (Math.random() - 0.5) * d * 0.8;
      sTile.position.set(stx, getTerrainHeight(stx, stz, 0.5) + 0.02, stz);
      sTile.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2 + (Math.random() - 0.5) * 0.1;
      mctx.scene.add(sTile);
    }

    // ── Mossy patches (ground detail) ──
    for (let i = 0; i < 25; i++) {
      const mossP = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.8, 20),
        new THREE.MeshStandardMaterial({ color: 0x445533, roughness: 0.7 }));
      mossP.rotation.x = -Math.PI / 2;
      const mpx = (Math.random() - 0.5) * w * 0.8, mpz = (Math.random() - 0.5) * d * 0.8;
      mossP.position.set(mpx, getTerrainHeight(mpx, mpz, 0.5) + 0.015, mpz);
      mctx.scene.add(mossP);
    }

    // ── Grey dust motes (atmosphere) ──
    for (let i = 0; i < 100; i++) {
      const dustMote = new THREE.Mesh(new THREE.SphereGeometry(0.008 + Math.random() * 0.012, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, emissive: 0x666666, emissiveIntensity: 0.3, transparent: true, opacity: 0.3 + Math.random() * 0.3 }));
      dustMote.position.set((Math.random() - 0.5) * w * 0.9, 0.2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.9);
      mctx.scene.add(dustMote);
    }

    // ── Dim atmospheric lights ──
    for (let i = 0; i < 8; i++) {
      const dimLight = new THREE.PointLight(0x999988, 0.25, 10);
      dimLight.position.set((Math.random() - 0.5) * w * 0.6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(dimLight); mctx.torchLights.push(dimLight);
    }

    // ── Fog patches (low-lying translucent volumes) ──
    for (let i = 0; i < 12; i++) {
      const fogPatch = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 2.5, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x888880, emissive: 0x444440, emissiveIntensity: 0.1, transparent: true, opacity: 0.04 + Math.random() * 0.03 }));
      fogPatch.scale.y = 0.3;
      const fpx = (Math.random() - 0.5) * w * 0.8, fpz = (Math.random() - 0.5) * d * 0.8;
      fogPatch.position.set(fpx, getTerrainHeight(fpx, fpz, 0.5) + 0.3, fpz);
      mctx.scene.add(fogPatch);
    }
}

export function buildSunkenCitadel(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x1a3344, 0.024);
    mctx.applyTerrainColors(0x153344, 0x1a4455, 0.6);
    mctx.dirLight.color.setHex(0x44aacc);
    mctx.dirLight.intensity = 0.5;
    mctx.ambientLight.color.setHex(0x0a2233);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x336677);
    mctx.hemiLight.groundColor.setHex(0x0a1a22);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x556666, roughness: 0.8 });
    const barnacleMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.1, transparent: true, opacity: 0.5 });
    const bioMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22aa66, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 });
    const coralMat = new THREE.MeshStandardMaterial({ color: 0xcc6655, roughness: 0.7 });
    const kelpMat = new THREE.MeshStandardMaterial({ color: 0x226633, roughness: 0.6 });
    const treasureMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.7, roughness: 0.3 });
    void new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.4, emissive: 0x224466, emissiveIntensity: 0.3 }); // glassMat reserved
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.5 });

    // Flooded fortress walls with barnacle clusters
    for (let i = 0; i < 24; i++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random() * 3, 2 + Math.random() * 3, 0.5 + Math.random()), stoneMat);
      const wx = (Math.random() - 0.5) * w * 0.8, wz = (Math.random() - 0.5) * d * 0.8;
      wall.position.set(wx, getTerrainHeight(wx, wz, 0.6) + wall.geometry.parameters.height / 2, wz);
      wall.rotation.y = Math.random() * Math.PI; wall.castShadow = true; mctx.scene.add(wall);
      for (let b = 0; b < 5 + Math.floor(Math.random() * 4); b++) {
        const barnacle = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.08, 17, 16), barnacleMat);
        barnacle.position.set(wx + (Math.random() - 0.5) * 0.8, getTerrainHeight(wx, wz, 0.6) + Math.random() * 2, wz + (Math.random() - 0.5) * 0.8);
        mctx.scene.add(barnacle);
      }
    }

    // Water surface
    const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, d * 0.9), waterMat);
    waterSurface.rotation.x = -Math.PI / 2; waterSurface.position.y = 0.15; mctx.scene.add(waterSurface);

    // Coral growths (branching formations)
    for (let i = 0; i < 18; i++) {
      const coral = new THREE.Group();
      const cColors = [0xcc6655, 0xcc8844, 0xff7766, 0xaa5577];
      const cMat = new THREE.MeshStandardMaterial({ color: cColors[i % 4], roughness: 0.7 });
      for (let b = 0; b < 3 + Math.floor(Math.random() * 4); b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06 + Math.random() * 0.04, 0.5 + Math.random() * 0.8, 17), cMat);
        branch.position.set((Math.random() - 0.5) * 0.3, 0.2 + b * 0.15, (Math.random() - 0.5) * 0.3);
        branch.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6); coral.add(branch);
        // Sub-branches
        if (Math.random() > 0.4) {
          const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.3, 16), cMat);
          sub.position.copy(branch.position); sub.position.y += 0.15;
          sub.rotation.z = branch.rotation.z + (Math.random() - 0.5) * 0.8; coral.add(sub);
        }
      }
      const cx = (Math.random() - 0.5) * w * 0.7, cz = (Math.random() - 0.5) * d * 0.7;
      coral.position.set(cx, getTerrainHeight(cx, cz, 0.6), cz); mctx.scene.add(coral);
    }

    // Kelp curtains (taller, more segments)
    for (let i = 0; i < 30; i++) {
      const kelp = new THREE.Group();
      const kh = 2 + Math.random() * 4;
      for (let s = 0; s < 6; s++) {
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, kh / 6, 16), kelpMat);
        strand.position.y = s * kh / 6; strand.rotation.z = Math.sin(s * 0.7) * 0.2;
        strand.rotation.x = Math.cos(s * 0.5) * 0.1; kelp.add(strand);
      }
      // Kelp fronds (leaves)
      for (let f = 0; f < 3; f++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kelpMat);
        frond.position.set(0, kh * 0.3 + f * 0.4, 0);
        frond.rotation.z = (Math.random() - 0.5) * 0.8; kelp.add(frond);
      }
      const kx = (Math.random() - 0.5) * w * 0.8, kz = (Math.random() - 0.5) * d * 0.8;
      kelp.position.set(kx, getTerrainHeight(kx, kz, 0.6), kz); mctx.scene.add(kelp);
    }

    // Fish schools (small tetrahedrons in clusters)
    for (let i = 0; i < 8; i++) {
      const school = new THREE.Group();
      for (let f = 0; f < 6 + Math.floor(Math.random() * 8); f++) {
        const fish = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.3 }));
        fish.rotation.z = -Math.PI / 2;
        fish.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.5);
        school.add(fish);
      }
      school.position.set((Math.random() - 0.5) * w * 0.5, 0.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(school);
    }

    // Bubbles rising (clustered groups with varied transparency)
    for (let i = 0; i < 18; i++) {
      const bubbleClusterGrp = new THREE.Group();
      const bubbleClusterCount = 2 + Math.floor(Math.random() * 5);
      for (let bc = 0; bc < bubbleClusterCount; bc++) {
        const bubbleRad = 0.015 + Math.random() * 0.04;
        const bubbleOpacity = 0.15 + Math.random() * 0.3;
        const bubbleMesh = new THREE.Mesh(new THREE.SphereGeometry(bubbleRad, 23, 17),
          new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: bubbleOpacity }));
        bubbleMesh.position.set((Math.random() - 0.5) * 0.15, bc * 0.08 + (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.15);
        bubbleClusterGrp.add(bubbleMesh);
      }
      const bubbleClX = (Math.random() - 0.5) * w * 0.6, bubbleClZ = (Math.random() - 0.5) * d * 0.6;
      bubbleClusterGrp.position.set(bubbleClX, Math.random() * 4, bubbleClZ);
      mctx.scene.add(bubbleClusterGrp);
      // Foam/froth patch at water surface where bubbles rise
      const foamPatch = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xeeffff, transparent: true, opacity: 0.2, emissive: 0x88bbcc, emissiveIntensity: 0.1 }));
      foamPatch.rotation.x = -Math.PI / 2;
      foamPatch.position.set(bubbleClX, 0.16, bubbleClZ);
      mctx.scene.add(foamPatch);
    }
    // Additional scattered single bubbles
    for (let i = 0; i < 12; i++) {
      const scatteredBubble = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 23, 17),
        new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.2 + Math.random() * 0.2 }));
      scatteredBubble.position.set((Math.random() - 0.5) * w * 0.6, Math.random() * 4, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(scatteredBubble);
    }

    // Sunken treasure chests
    for (let i = 0; i < 5; i++) {
      const chest = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      box.position.y = 0.15; chest.add(box);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.37), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      lid.position.set(0, 0.33, 0); chest.add(lid);
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), treasureMat);
      clasp.position.set(0, 0.25, 0.18); chest.add(clasp);
      // Coins spilling out
      for (let c = 0; c < 4; c++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 10), treasureMat);
        coin.position.set((Math.random() - 0.5) * 0.4, 0.02, (Math.random() - 0.5) * 0.3);
        coin.rotation.x = Math.random(); chest.add(coin);
      }
      const chx = (Math.random() - 0.5) * w * 0.5, chz = (Math.random() - 0.5) * d * 0.5;
      chest.position.set(chx, getTerrainHeight(chx, chz, 0.6), chz);
      chest.rotation.y = Math.random() * Math.PI; mctx.scene.add(chest);
    }

    // Broken stained glass fragments
    for (let i = 0; i < 12; i++) {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random() * 0.6, 0.6 + Math.random() * 0.8, 0.03),
        new THREE.MeshStandardMaterial({ color: [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44][i % 4], transparent: true, opacity: 0.5, emissive: [0x224466, 0x662222, 0x226622, 0x666622][i % 4], emissiveIntensity: 0.3 }));
      const gx = (Math.random() - 0.5) * w * 0.6, gz = (Math.random() - 0.5) * d * 0.6;
      glass.position.set(gx, getTerrainHeight(gx, gz, 0.6) + Math.random() * 1.5, gz);
      glass.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(glass);
    }

    // Underwater light rays (tall translucent columns from above)
    for (let i = 0; i < 6; i++) {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 8, 17),
        new THREE.MeshStandardMaterial({ color: 0x88ccee, transparent: true, opacity: 0.08, emissive: 0x44aacc, emissiveIntensity: 0.3 }));
      ray.position.set((Math.random() - 0.5) * w * 0.5, 4, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(ray);
    }

    // Bioluminescent algae patches
    for (let i = 0; i < 15; i++) {
      const algae = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random(), 27), bioMat);
      algae.rotation.x = -Math.PI / 2;
      const ax = (Math.random() - 0.5) * w * 0.7, az = (Math.random() - 0.5) * d * 0.7;
      algae.position.set(ax, 0.16, az); mctx.scene.add(algae);
    }

    // Bioluminescent & underwater lights
    for (let i = 0; i < 12; i++) {
      const light = new THREE.PointLight([0x44ffaa, 0x44aacc, 0x2288aa][i % 3], 0.4, 8);
      light.position.set((Math.random() - 0.5) * w * 0.6, 0.5 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(light); mctx.torchLights.push(light);
    }

    // Sunken columns (tilted, covered)
    for (let i = 0; i < 14; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3, 10), stoneMat);
      const cx = (Math.random() - 0.5) * w * 0.7, cz = (Math.random() - 0.5) * d * 0.7;
      col.position.set(cx, getTerrainHeight(cx, cz, 0.6) + 1.5, cz);
      col.rotation.z = (Math.random() - 0.5) * 0.4; col.castShadow = true; mctx.scene.add(col);
      // Branching coral on columns
      if (Math.random() > 0.3) {
        const colCoralGrp = new THREE.Group();
        const colCoralColors = [0xcc4433, 0xff6644, 0xaa44aa, 0xcc7733, 0xff5555];
        const colCoralColor = colCoralColors[Math.floor(Math.random() * colCoralColors.length)];
        const colCoralBranchMat = new THREE.MeshStandardMaterial({ color: colCoralColor, roughness: 0.7 });
        // Main trunk
        const colCoralTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.25 + Math.random() * 0.15, 16), colCoralBranchMat);
        colCoralGrp.add(colCoralTrunk);
        // Forking branches
        const colCoralBranchCount = 2 + Math.floor(Math.random() * 3);
        for (let cb = 0; cb < colCoralBranchCount; cb++) {
          const colCoralBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.15 + Math.random() * 0.12, 12), colCoralBranchMat);
          colCoralBranch.position.set((Math.random() - 0.5) * 0.06, 0.1 + cb * 0.06, (Math.random() - 0.5) * 0.06);
          colCoralBranch.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8);
          colCoralGrp.add(colCoralBranch);
          // Sphere tip on branch
          const colCoralTip = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 12, 10), colCoralBranchMat);
          colCoralTip.position.copy(colCoralBranch.position);
          colCoralTip.position.y += 0.08; colCoralGrp.add(colCoralTip);
        }
        // Small fish nearby
        if (Math.random() > 0.5) {
          const colCoralFish = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 12),
            new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.3 }));
          colCoralFish.rotation.z = -Math.PI / 2;
          colCoralFish.position.set(0.15 + Math.random() * 0.1, Math.random() * 0.1, (Math.random() - 0.5) * 0.1);
          colCoralGrp.add(colCoralFish);
        }
        colCoralGrp.position.set(cx + 0.2, getTerrainHeight(cx, cz, 0.6) + 1 + Math.random(), cz);
        mctx.scene.add(colCoralGrp);
      }
    }

    // Shells on the seabed
    for (let i = 0; i < 15; i++) {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 23, 17, 0, Math.PI), shellMat);
      const shx = (Math.random() - 0.5) * w * 0.7, shz = (Math.random() - 0.5) * d * 0.7;
      shell.position.set(shx, getTerrainHeight(shx, shz, 0.6) + 0.03, shz);
      shell.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(shell);
    }
    // ── Underwater coral growths on walls ──
    for (let i = 0; i < 15; i++) {
      const wallCoral = new THREE.Group();
      for (let b = 0; b < 3 + Math.floor(Math.random() * 3); b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.3 + Math.random() * 0.4, 16), coralMat);
        branch.position.set((Math.random()-0.5)*0.2, b * 0.1, 0);
        branch.rotation.set((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5); wallCoral.add(branch);
      }
      const wcx = (Math.random()-0.5)*w*0.7, wcz = (Math.random()-0.5)*d*0.7;
      wallCoral.position.set(wcx, getTerrainHeight(wcx, wcz, 0.6) + 0.5 + Math.random() * 2, wcz); mctx.scene.add(wallCoral);
    }
    // ── Barnacle clusters (varied sizes with seaweed and encrustation) ──
    for (let i = 0; i < 20; i++) {
      const barnClGrp = new THREE.Group();
      const barnClColors = [0xccccbb, 0xaaaaaa, 0x99aa88, 0xbbbbaa, 0x888877];
      const barnClCount = 5 + Math.floor(Math.random() * 5);
      for (let bcl = 0; bcl < barnClCount; bcl++) {
        const barnClSize = 0.015 + Math.random() * 0.025;
        const barnClCone = new THREE.Mesh(new THREE.ConeGeometry(barnClSize, 0.03 + Math.random() * 0.04, 16),
          new THREE.MeshStandardMaterial({ color: barnClColors[bcl % barnClColors.length], roughness: 0.8 }));
        barnClCone.position.set((Math.random()-0.5)*0.15, 0, (Math.random()-0.5)*0.15); barnClGrp.add(barnClCone);
      }
      // Seaweed strands hanging from cluster
      const barnClSeaweedCount = Math.floor(Math.random() * 3);
      for (let bcs = 0; bcs < barnClSeaweedCount; bcs++) {
        const barnClSeaweed = new THREE.Mesh(new THREE.PlaneGeometry(0.015, 0.08 + Math.random() * 0.1),
          new THREE.MeshStandardMaterial({ color: 0x336622, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        barnClSeaweed.position.set((Math.random()-0.5)*0.1, -0.04, (Math.random()-0.5)*0.1);
        barnClSeaweed.rotation.z = (Math.random() - 0.5) * 0.4; barnClGrp.add(barnClSeaweed);
      }
      // Encrustation patch
      const barnClEncrust = new THREE.Mesh(new THREE.CircleGeometry(0.04 + Math.random() * 0.03, 12),
        new THREE.MeshStandardMaterial({ color: barnClColors[i % barnClColors.length], roughness: 0.95 }));
      barnClEncrust.rotation.x = -Math.PI / 2; barnClEncrust.position.y = -0.01; barnClGrp.add(barnClEncrust);
      const barnClX = (Math.random()-0.5)*w*0.75, barnClZ = (Math.random()-0.5)*d*0.75;
      barnClGrp.position.set(barnClX, getTerrainHeight(barnClX, barnClZ, 0.6) + Math.random() * 2, barnClZ); mctx.scene.add(barnClGrp);
    }
    // ── Water-logged furniture ──
    for (let i = 0; i < 6; i++) {
      const furn = new THREE.Group();
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 }));
      table.position.y = 0.3; furn.add(table);
      for (const lx of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 }));
        leg.position.set(lx, 0.15, 0); furn.add(leg);
      }
      const furnCoral = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), coralMat);
      furnCoral.position.set(0.2, 0.35, 0.1); furn.add(furnCoral);
      const fnx = (Math.random()-0.5)*w*0.5, fnz = (Math.random()-0.5)*d*0.5;
      furn.position.set(fnx, getTerrainHeight(fnx, fnz, 0.6), fnz);
      furn.rotation.y = Math.random() * Math.PI; furn.rotation.z = (Math.random()-0.5)*0.2; mctx.scene.add(furn);
    }
    // ── Algae streamers (thin green cylinders) ──
    for (let i = 0; i < 25; i++) {
      const algaeStr = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.8 + Math.random() * 1.5, 16), kelpMat);
      const asx = (Math.random()-0.5)*w*0.7, asz = (Math.random()-0.5)*d*0.7;
      algaeStr.position.set(asx, getTerrainHeight(asx, asz, 0.6) + 0.5 + Math.random() * 2, asz);
      algaeStr.rotation.set(Math.random()*0.3, 0, Math.random()*0.3); mctx.scene.add(algaeStr);
    }

    // ── Coral-encrusted pillars ──
    for (let i = 0; i < 10; i++) {
      const pillarGrp = new THREE.Group();
      const pillarH = 2.5 + Math.random() * 2;
      const cpillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, pillarH, 10), stoneMat);
      cpillar.position.y = pillarH / 2; cpillar.castShadow = true; pillarGrp.add(cpillar);
      const coralColors2 = [0xcc6655, 0xff7766, 0xcc8844, 0xaa5577, 0xff9966];
      for (let c = 0; c < 5 + Math.floor(Math.random() * 4); c++) {
        const coralGrowth = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 16, 12),
          new THREE.MeshStandardMaterial({ color: coralColors2[c % coralColors2.length], roughness: 0.7 }));
        const cAng = Math.random() * Math.PI * 2;
        const cHt = 0.3 + Math.random() * (pillarH - 0.6);
        coralGrowth.position.set(Math.cos(cAng) * (0.2 + Math.random() * 0.08), cHt, Math.sin(cAng) * (0.2 + Math.random() * 0.08));
        pillarGrp.add(coralGrowth);
      }
      const cpx2 = (Math.random() - 0.5) * w * 0.7, cpz2 = (Math.random() - 0.5) * d * 0.7;
      pillarGrp.position.set(cpx2, getTerrainHeight(cpx2, cpz2, 0.6), cpz2); mctx.scene.add(pillarGrp);
    }

    // ── Treasure chests with coin spills ──
    for (let i = 0; i < 6; i++) {
      const tChest = new THREE.Group();
      const goldBodyMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.7, roughness: 0.3 });
      const chestBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), goldBodyMat);
      chestBody.position.y = 0.175; tChest.add(chestBody);
      const cLid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.42), goldBodyMat);
      cLid.position.set(0, 0.39, -0.08);
      cLid.rotation.x = -0.3; tChest.add(cLid);
      for (let c = 0; c < 8; c++) {
        const spillCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16), treasureMat);
        spillCoin.position.set((Math.random() - 0.5) * 0.5, 0.01 + Math.random() * 0.05, 0.2 + Math.random() * 0.3);
        spillCoin.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        spillCoin.rotation.z = Math.random() * Math.PI; tChest.add(spillCoin);
      }
      for (let g = 0; g < 2; g++) {
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12),
          new THREE.MeshStandardMaterial({ color: [0x44ff44, 0xff4444, 0x4444ff][g % 3], emissive: [0x228822, 0x882222, 0x222288][g % 3], emissiveIntensity: 0.4 }));
        gem.position.set((Math.random() - 0.5) * 0.3, 0.03, 0.15 + Math.random() * 0.2); tChest.add(gem);
      }
      const tcx2 = (Math.random() - 0.5) * w * 0.5, tcz2 = (Math.random() - 0.5) * d * 0.5;
      tChest.position.set(tcx2, getTerrainHeight(tcx2, tcz2, 0.6), tcz2);
      tChest.rotation.y = Math.random() * Math.PI; mctx.scene.add(tChest);
    }

    // ── Dense kelp forest ──
    for (let i = 0; i < 35; i++) {
      const kelpStalk = new THREE.Group();
      const ksH = 1.5 + Math.random() * 3.5;
      const kSegs = 5 + Math.floor(Math.random() * 4);
      const kSegH = ksH / kSegs;
      for (let s = 0; s < kSegs; s++) {
        const kSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, kSegH, 8),
          new THREE.MeshStandardMaterial({ color: 0x226633 + Math.floor(Math.random() * 0x002200), roughness: 0.6 }));
        kSeg.position.y = s * kSegH + kSegH / 2;
        kSeg.rotation.z = Math.sin(s * 0.8 + i) * 0.15;
        kSeg.rotation.x = Math.cos(s * 0.6 + i) * 0.1;
        kelpStalk.add(kSeg);
        if (Math.random() > 0.5) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.35), kelpMat);
          blade.position.set(0.06, s * kSegH + kSegH / 2, 0);
          blade.rotation.z = (Math.random() - 0.5) * 0.6; kelpStalk.add(blade);
        }
      }
      const ks2x = (Math.random() - 0.5) * w * 0.8, ks2z = (Math.random() - 0.5) * d * 0.8;
      kelpStalk.position.set(ks2x, getTerrainHeight(ks2x, ks2z, 0.6), ks2z); mctx.scene.add(kelpStalk);
    }

    // ── Giant clam shells ──
    for (let i = 0; i < 5; i++) {
      const clam = new THREE.Group();
      const clamSize = 0.3 + Math.random() * 0.25;
      const bottomShell = new THREE.Mesh(new THREE.SphereGeometry(clamSize, 20, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), shellMat);
      bottomShell.rotation.x = Math.PI; clam.add(bottomShell);
      const topShell = new THREE.Mesh(new THREE.SphereGeometry(clamSize, 20, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), shellMat);
      topShell.position.y = 0.05;
      topShell.rotation.x = -0.4;
      topShell.position.z = -Math.sin(0.4) * clamSize * 0.3;
      clam.add(topShell);
      const pearlSphere = new THREE.Mesh(new THREE.SphereGeometry(clamSize * 0.2, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xffeedd, metalness: 0.3, roughness: 0.2, emissive: 0x554433, emissiveIntensity: 0.2 }));
      pearlSphere.position.y = -clamSize * 0.15; clam.add(pearlSphere);
      const innerLip = new THREE.Mesh(new THREE.CircleGeometry(clamSize * 0.8, 20),
        new THREE.MeshStandardMaterial({ color: 0xffaaaa, roughness: 0.4 }));
      innerLip.rotation.x = -Math.PI / 2; innerLip.position.y = -0.02; clam.add(innerLip);
      const cl2x = (Math.random() - 0.5) * w * 0.6, cl2z = (Math.random() - 0.5) * d * 0.6;
      clam.position.set(cl2x, getTerrainHeight(cl2x, cl2z, 0.6) + 0.02, cl2z);
      clam.rotation.y = Math.random() * Math.PI; mctx.scene.add(clam);
    }

    // ── Broken ship hull ──
    for (let i = 0; i < 2; i++) {
      const shipHull = new THREE.Group();
      const hullWood = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
      const keelBeam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 4), hullWood);
      keelBeam.position.y = 0.1; shipHull.add(keelBeam);
      for (let r = 0; r < 8; r++) {
        for (const side of [-1, 1]) {
          const hullRib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2 + Math.random() * 0.4, 0.08), hullWood);
          hullRib.position.set(side * (0.5 + Math.random() * 0.2), 0.7, -1.6 + r * 0.45);
          hullRib.rotation.z = side * (0.3 + Math.random() * 0.15);
          shipHull.add(hullRib);
        }
      }
      for (let p = 0; p < 6; p++) {
        if (Math.random() > 0.3) {
          const hullPlank = new THREE.Mesh(new THREE.BoxGeometry(1.0 + Math.random() * 0.5, 0.04, 0.15), hullWood);
          hullPlank.position.set((Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.6, -1.2 + p * 0.5);
          hullPlank.rotation.z = (Math.random() - 0.5) * 0.1; shipHull.add(hullPlank);
        }
      }
      for (let b = 0; b < 12; b++) {
        const hullBarnCluster = new THREE.Group();
        const hullBarnCount = 2 + Math.floor(Math.random() * 4);
        const hullBarnColorArr = [0xccccbb, 0xaaaaaa, 0x99aa88, 0xbbbbaa];
        for (let hbc = 0; hbc < hullBarnCount; hbc++) {
          const hullBarnSize = 0.02 + Math.random() * 0.04;
          const hullBarnMesh = new THREE.Mesh(new THREE.SphereGeometry(hullBarnSize, 16, 14),
            new THREE.MeshStandardMaterial({ color: hullBarnColorArr[hbc % hullBarnColorArr.length], roughness: 0.8 }));
          hullBarnMesh.position.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08);
          hullBarnCluster.add(hullBarnMesh);
        }
        // Seaweed strands hanging from barnacle clusters
        if (Math.random() > 0.4) {
          const hullSeaweed = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.1 + Math.random() * 0.15),
            new THREE.MeshStandardMaterial({ color: 0x336622, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
          hullSeaweed.position.set(0, -0.06, 0);
          hullSeaweed.rotation.z = (Math.random() - 0.5) * 0.5;
          hullBarnCluster.add(hullSeaweed);
        }
        // Encrustation texture variation patch
        const hullEncrustPatch = new THREE.Mesh(new THREE.CircleGeometry(0.03 + Math.random() * 0.02, 12),
          new THREE.MeshStandardMaterial({ color: hullBarnColorArr[b % hullBarnColorArr.length], roughness: 0.95 }));
        hullEncrustPatch.rotation.set(Math.random(), Math.random(), Math.random());
        hullBarnCluster.add(hullEncrustPatch);
        hullBarnCluster.position.set((Math.random() - 0.5) * 1.2, Math.random() * 0.8, (Math.random() - 0.5) * 3);
        shipHull.add(hullBarnCluster);
      }
      const sh2x = (Math.random() - 0.5) * w * 0.5, sh2z = (Math.random() - 0.5) * d * 0.5;
      shipHull.position.set(sh2x, getTerrainHeight(sh2x, sh2z, 0.6), sh2z);
      shipHull.rotation.y = Math.random() * Math.PI;
      shipHull.rotation.z = (Math.random() - 0.5) * 0.15; mctx.scene.add(shipHull);
    }
}

export function buildWyrmscarCanyon(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x554433, 0.014);
    mctx.applyTerrainColors(0x443322, 0x554433, 1.4);
    mctx.dirLight.color.setHex(0xffaa66);
    mctx.dirLight.intensity = 1.2;
    mctx.ambientLight.color.setHex(0x332211);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0xaa8855);
    mctx.hemiLight.groundColor.setHex(0x221100);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const scorchedMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 });
    const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 0.9 });
    const eggMat = new THREE.MeshStandardMaterial({ color: 0xcc6633, roughness: 0.4, emissive: 0x441100, emissiveIntensity: 0.2 });
    const nestMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.3 });

    // Canyon walls (taller, more varied, with ledges, overhangs, mineral veins, symbols)
    const cwLedgeMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.85 });
    const cwOverhangMat = new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.9 });
    const cwVeinColors = [0x886644, 0x668844, 0xcc8844, 0x448866];
    const cwSymbolMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.7 });
    for (let i = 0; i < 30; i++) {
      const wallH = 4 + Math.random() * 8;
      const cwWallW = 2 + Math.random() * 4;
      const cwWallD = 1 + Math.random() * 3;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(cwWallW, wallH, cwWallD), rockMat);
      const wx = (Math.random() - 0.5) * w * 0.85, wz = (Math.random() - 0.5) * d * 0.85;
      wall.position.set(wx, getTerrainHeight(wx, wz, 1.4) + wallH / 2, wz);
      wall.castShadow = true; mctx.scene.add(wall);

      // Rock face ledges (horizontal protruding boxes)
      const cwLedgeCount = 1 + Math.floor(Math.random() * 3);
      for (let lg = 0; lg < cwLedgeCount; lg++) {
        const cwLedge = new THREE.Mesh(new THREE.BoxGeometry(cwWallW * 0.6 + Math.random() * cwWallW * 0.3, 0.15, 0.4 + Math.random() * 0.3), cwLedgeMat);
        cwLedge.position.set(wx + (Math.random() - 0.5) * 0.5, getTerrainHeight(wx, wz, 1.4) + wallH * 0.2 + lg * wallH * 0.25, wz + cwWallD * 0.5 + 0.15);
        mctx.scene.add(cwLedge);
      }

      // Overhang at top of some walls
      if (Math.random() > 0.6) {
        const cwOverhang = new THREE.Mesh(new THREE.BoxGeometry(cwWallW * 0.8, 0.3, 0.8), cwOverhangMat);
        cwOverhang.position.set(wx, getTerrainHeight(wx, wz, 1.4) + wallH - 0.15, wz + cwWallD * 0.5 + 0.3);
        cwOverhang.rotation.x = 0.1;
        mctx.scene.add(cwOverhang);
      }

      // Mineral vein (colored PlaneGeometry strip on wall face)
      if (Math.random() > 0.5) {
        const cwVeinColor = cwVeinColors[i % cwVeinColors.length];
        const cwVeinMat = new THREE.MeshStandardMaterial({ color: cwVeinColor, emissive: cwVeinColor, emissiveIntensity: 0.15, roughness: 0.5 });
        const cwVein = new THREE.Mesh(new THREE.PlaneGeometry(0.06, wallH * 0.4 + Math.random() * wallH * 0.3), cwVeinMat);
        cwVein.position.set(wx + (Math.random() - 0.5) * cwWallW * 0.4, getTerrainHeight(wx, wz, 1.4) + wallH * 0.4, wz + cwWallD * 0.51);
        cwVein.rotation.z = (Math.random() - 0.5) * 0.4;
        mctx.scene.add(cwVein);
      }

      // Carved ancient symbol on some walls
      if (Math.random() > 0.7) {
        const cwSymbolGrp = new THREE.Group();
        // Circle symbol
        const cwSymCircle = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 16), cwSymbolMat);
        cwSymCircle.position.z = 0.01;
        cwSymbolGrp.add(cwSymCircle);
        // Cross lines through circle
        const cwSymLineH = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.04), cwSymbolMat);
        cwSymLineH.position.z = 0.01;
        cwSymbolGrp.add(cwSymLineH);
        const cwSymLineV = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5), cwSymbolMat);
        cwSymLineV.position.z = 0.01;
        cwSymbolGrp.add(cwSymLineV);
        cwSymbolGrp.position.set(wx, getTerrainHeight(wx, wz, 1.4) + wallH * 0.5, wz + cwWallD * 0.51);
        mctx.scene.add(cwSymbolGrp);
      }

      // Claw marks on some walls (thin dark slashes)
      if (Math.random() > 0.5) {
        for (let c = 0; c < 3; c++) {
          const claw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5 + Math.random(), 0.02), scorchedMat);
          claw.position.set(wx + (c - 1) * 0.2, getTerrainHeight(wx, wz, 1.4) + wallH * 0.4 + Math.random(), wz + 0.3);
          claw.rotation.z = (Math.random() - 0.5) * 0.2; mctx.scene.add(claw);
        }
      }

      // Nest-like alcove in some walls
      if (Math.random() > 0.75) {
        const cwAlcove = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), darkRockMat);
        cwAlcove.rotation.x = Math.PI;
        cwAlcove.position.set(wx + (Math.random() - 0.5) * cwWallW * 0.3, getTerrainHeight(wx, wz, 1.4) + wallH * 0.6, wz + cwWallD * 0.5);
        mctx.scene.add(cwAlcove);
      }
    }

    // Fossilized dragon bones embedded in rock
    for (let i = 0; i < 8; i++) {
      const fossil = new THREE.Group();
      // Ribcage
      for (let r = 0; r < 6; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.8 + Math.random() * 0.4, 0.06, 17, 27, Math.PI), boneMat);
        rib.position.set(0, 0, r * 0.3 - 0.9);
        rib.rotation.y = Math.PI / 2; fossil.add(rib);
      }
      // Spine
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 17), boneMat);
      spine.rotation.x = Math.PI / 2; fossil.add(spine);
      // Skull
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), boneMat);
      skull.scale.x = 1.5; skull.position.set(0, 0, -1.5); fossil.add(skull);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.4), boneMat);
      jaw.position.set(0, -0.15, -1.6); fossil.add(jaw);
      // Teeth
      for (let t = 0; t < 5; t++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 16), boneMat);
        tooth.position.set((t - 2) * 0.08, -0.2, -1.7); tooth.rotation.x = Math.PI; fossil.add(tooth);
      }
      const fx = (Math.random() - 0.5) * w * 0.6, fz = (Math.random() - 0.5) * d * 0.6;
      fossil.position.set(fx, getTerrainHeight(fx, fz, 1.4) + 0.5 + Math.random(), fz);
      fossil.rotation.y = Math.random() * Math.PI; mctx.scene.add(fossil);
    }

    // Scorched ground patches
    for (let i = 0; i < 20; i++) {
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2, 27), scorchedMat);
      scorch.rotation.x = -Math.PI / 2;
      const sx = (Math.random() - 0.5) * w * 0.7, sz = (Math.random() - 0.5) * d * 0.7;
      scorch.position.set(sx, getTerrainHeight(sx, sz, 1.4) + 0.02, sz); mctx.scene.add(scorch);
    }

    // Dragon nests with more eggs, feathers, and bones
    for (let i = 0; i < 6; i++) {
      const nest = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 20, 36), nestMat);
      rim.rotation.x = -Math.PI / 2; nest.add(rim);
      // Nest bedding (rough texture)
      const bed = new THREE.Mesh(new THREE.CircleGeometry(1.2, 27), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1.0 }));
      bed.rotation.x = -Math.PI / 2; bed.position.y = 0.05; nest.add(bed);
      // Eggs with glow
      for (let e = 0; e < 3 + Math.floor(Math.random() * 3); e++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.05, 23, 20), eggMat);
        egg.scale.y = 1.3;
        egg.position.set((Math.random() - 0.5) * 0.8, 0.18, (Math.random() - 0.5) * 0.8); nest.add(egg);
      }
      // Scattered scales
      for (let s = 0; s < 4; s++) {
        const scale = new THREE.Mesh(new THREE.CircleGeometry(0.04, 17), new THREE.MeshStandardMaterial({ color: 0x884422, metalness: 0.4 }));
        scale.position.set((Math.random() - 0.5) * 1.5, 0.02, (Math.random() - 0.5) * 1.5);
        scale.rotation.x = -Math.PI / 2; nest.add(scale);
      }
      const nx = (Math.random() - 0.5) * w * 0.5, nz = (Math.random() - 0.5) * d * 0.5;
      nest.position.set(nx, getTerrainHeight(nx, nz, 1.4), nz); mctx.scene.add(nest);
    }

    // Lava fissures with branching cracks
    for (let i = 0; i < 10; i++) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.25 + Math.random() * 0.15, 3 + Math.random() * 5), lavaMat);
      crack.rotation.x = -Math.PI / 2;
      const cx = (Math.random() - 0.5) * w * 0.6, cz = (Math.random() - 0.5) * d * 0.6;
      crack.position.set(cx, getTerrainHeight(cx, cz, 1.4) + 0.03, cz);
      crack.rotation.z = Math.random() * Math.PI; mctx.scene.add(crack);
      // Branch cracks
      for (let b = 0; b < 2; b++) {
        const branch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1 + Math.random() * 1.5), lavaMat);
        branch.rotation.x = -Math.PI / 2;
        branch.position.set(cx + (Math.random() - 0.5) * 1.5, getTerrainHeight(cx, cz, 1.4) + 0.03, cz + (Math.random() - 0.5) * 1.5);
        branch.rotation.z = Math.random() * Math.PI; mctx.scene.add(branch);
      }
      const cLight = new THREE.PointLight(0xff4400, 0.6, 8);
      cLight.position.set(cx, getTerrainHeight(cx, cz, 1.4) + 0.3, cz);
      mctx.scene.add(cLight); mctx.torchLights.push(cLight);
    }

    // Rocky bridges spanning gaps (with support columns, cracks, rubble)
    for (let i = 0; i < 4; i++) {
      const rockBridgeGrp = new THREE.Group();
      const rbWidth = 1 + Math.random();
      const rbLen = 4 + Math.random() * 4;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(rbWidth, 0.4, rbLen), rockMat);
      bridge.castShadow = true;
      rockBridgeGrp.add(bridge);

      // Support columns underneath
      for (const rbSupportZ of [-rbLen * 0.3, rbLen * 0.3]) {
        const rbSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 12), darkRockMat);
        rbSupport.position.set(0, -1.45, rbSupportZ);
        rockBridgeGrp.add(rbSupport);
      }

      // Crack lines on bridge surface
      const rbCrackMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 1.0 });
      for (let rc = 0; rc < 2 + Math.floor(Math.random() * 2); rc++) {
        const rbCrack = new THREE.Mesh(new THREE.PlaneGeometry(rbWidth * 0.6, 0.03), rbCrackMat);
        rbCrack.rotation.x = -Math.PI / 2;
        rbCrack.position.set((Math.random() - 0.5) * rbWidth * 0.3, 0.21, (Math.random() - 0.5) * rbLen * 0.5);
        rbCrack.rotation.z = Math.random() * Math.PI;
        rockBridgeGrp.add(rbCrack);
      }

      // Small rubble pieces on bridge surface
      for (let rr = 0; rr < 3; rr++) {
        const rbRubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05 + Math.random() * 0.04, 0), rockMat);
        rbRubble.position.set((Math.random() - 0.5) * rbWidth * 0.4, 0.25, (Math.random() - 0.5) * rbLen * 0.4);
        rockBridgeGrp.add(rbRubble);
      }

      const bx = (Math.random() - 0.5) * w * 0.4, bz = (Math.random() - 0.5) * d * 0.4;
      rockBridgeGrp.position.set(bx, getTerrainHeight(bx, bz, 1.4) + 2 + Math.random() * 2, bz);
      rockBridgeGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(rockBridgeGrp);
    }

    // Wind-carved rock formations (hoodoos) with erosion detail and layer bands
    const hoodooLayerColors = [0x554433, 0x665544, 0x776655, 0x443322, 0x887766];
    const hoodooErosionMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1.0 });
    for (let i = 0; i < 10; i++) {
      const hoodoo = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 1.5, 10), rockMat);
      base.position.y = 0.75; hoodoo.add(base);
      const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2, 10), rockMat);
      mid.position.y = 2; hoodoo.add(mid);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.5, 10), darkRockMat);
      cap.position.y = 2.75; hoodoo.add(cap);

      // Horizontal layer bands (sedimentary striping)
      for (let hl = 0; hl < 5; hl++) {
        const hoodooLayerMat = new THREE.MeshStandardMaterial({ color: hoodooLayerColors[hl % hoodooLayerColors.length], roughness: 0.9 });
        const hoodooLayer = new THREE.Mesh(new THREE.TorusGeometry(0.4 + (hl < 3 ? 0.2 : -0.1), 0.03, 8, 16), hoodooLayerMat);
        hoodooLayer.rotation.x = Math.PI / 2;
        hoodooLayer.position.y = 0.3 + hl * 0.5;
        hoodoo.add(hoodooLayer);
      }

      // Wind erosion cavities (small dark indentations)
      for (let we = 0; we < 2 + Math.floor(Math.random() * 2); we++) {
        const hoodooErosion = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 8, 8), hoodooErosionMat);
        hoodooErosion.scale.set(1.5, 0.7, 0.5);
        const hoodooErosionAngle = Math.random() * Math.PI * 2;
        hoodooErosion.position.set(
          Math.cos(hoodooErosionAngle) * 0.35,
          0.8 + Math.random() * 1.5,
          Math.sin(hoodooErosionAngle) * 0.35,
        );
        hoodooErosion.rotation.y = hoodooErosionAngle;
        hoodoo.add(hoodooErosion);
      }

      // Small rubble at base from erosion
      for (let hr = 0; hr < 3 + Math.floor(Math.random() * 3); hr++) {
        const hoodooRubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.06, 0), rockMat);
        hoodooRubble.position.set(
          (Math.random() - 0.5) * 1.2,
          0.03 + Math.random() * 0.03,
          (Math.random() - 0.5) * 1.2,
        );
        hoodoo.add(hoodooRubble);
      }

      const hx = (Math.random() - 0.5) * w * 0.7, hz = (Math.random() - 0.5) * d * 0.7;
      hoodoo.position.set(hx, getTerrainHeight(hx, hz, 1.4), hz); mctx.scene.add(hoodoo);
    }

    // Cave openings (dark recesses with rock framing, stalactites, rubble)
    for (let i = 0; i < 5; i++) {
      const cave = new THREE.Group();
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 17, 32), darkRockMat);
      arch.position.y = 1.2; cave.add(arch);
      const darkness = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshStandardMaterial({ color: 0x000000 }));
      darkness.position.y = 0.6; cave.add(darkness);

      // Irregular rock framing around opening
      const caveFrameCount = 5 + Math.floor(Math.random() * 4);
      for (let cf = 0; cf < caveFrameCount; cf++) {
        const caveFrameSize = 0.2 + Math.random() * 0.3;
        const caveFrameRock = new THREE.Mesh(new THREE.DodecahedronGeometry(caveFrameSize, 1), darkRockMat);
        const caveFrameAngle = (cf / caveFrameCount) * Math.PI;
        caveFrameRock.position.set(
          Math.cos(caveFrameAngle) * 1.3,
          0.6 + Math.sin(caveFrameAngle) * 1.0,
          0.1,
        );
        caveFrameRock.rotation.set(Math.random(), Math.random(), Math.random());
        cave.add(caveFrameRock);
      }

      // Dripping stalactites hanging above opening
      const caveStalCount = 3 + Math.floor(Math.random() * 3);
      for (let cs = 0; cs < caveStalCount; cs++) {
        const caveStalH = 0.2 + Math.random() * 0.4;
        const caveStal = new THREE.Mesh(new THREE.ConeGeometry(0.04 + Math.random() * 0.03, caveStalH, 8), rockMat);
        caveStal.rotation.x = Math.PI;
        caveStal.position.set(
          (Math.random() - 0.5) * 1.5,
          1.8 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.2,
        );
        cave.add(caveStal);
      }

      // Rubble/gravel at threshold
      const caveRubbleCount = 4 + Math.floor(Math.random() * 4);
      for (let cr = 0; cr < caveRubbleCount; cr++) {
        const caveRubbleSize = 0.06 + Math.random() * 0.1;
        const caveRubble = new THREE.Mesh(new THREE.DodecahedronGeometry(caveRubbleSize, 0), rockMat);
        caveRubble.position.set(
          (Math.random() - 0.5) * 1.5,
          caveRubbleSize * 0.5,
          0.3 + Math.random() * 0.5,
        );
        caveRubble.rotation.set(Math.random(), Math.random(), Math.random());
        cave.add(caveRubble);
      }

      const cvx = (Math.random() - 0.5) * w * 0.7, cvz = (Math.random() - 0.5) * d * 0.7;
      cave.position.set(cvx, getTerrainHeight(cvx, cvz, 1.4), cvz);
      cave.rotation.y = Math.random() * Math.PI; mctx.scene.add(cave);
    }

    // Stalactite formations (with drip formations and stalagmite pairs)
    const stalDripMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.7 });
    for (let i = 0; i < 12; i++) {
      const stalGrp = new THREE.Group();
      const stalH = 1 + Math.random() * 2;
      const stal = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.15, stalH, 20), rockMat);
      stal.rotation.x = Math.PI;
      stal.position.y = stalH / 2;
      stalGrp.add(stal);

      // Secondary smaller stalactites nearby
      for (let ss = 0; ss < 2 + Math.floor(Math.random() * 2); ss++) {
        const stalSecH = stalH * (0.3 + Math.random() * 0.4);
        const stalSec = new THREE.Mesh(new THREE.ConeGeometry(0.05 + Math.random() * 0.06, stalSecH, 12), rockMat);
        stalSec.rotation.x = Math.PI;
        stalSec.position.set((Math.random() - 0.5) * 0.5, stalSecH / 2, (Math.random() - 0.5) * 0.5);
        stalGrp.add(stalSec);
      }

      // Drip bulge near tip
      const stalDrip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), stalDripMat);
      stalDrip.position.set(0, -stalH * 0.02, 0);
      stalGrp.add(stalDrip);

      // Matching stalagmite below some stalactites
      if (Math.random() > 0.5) {
        const stalagH = stalH * 0.4 + Math.random() * 0.5;
        const stalagmite = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.1, stalagH, 16), rockMat);
        stalagmite.position.set(0, -5 - Math.random() * 2, 0);
        stalGrp.add(stalagmite);
      }

      const stx = (Math.random() - 0.5) * w * 0.6, stz = (Math.random() - 0.5) * d * 0.6;
      stalGrp.position.set(stx, getTerrainHeight(stx, stz, 1.4) + 6 + Math.random() * 2, stz);
      mctx.scene.add(stalGrp);
    }

    // Bone piles (dragon prey) - detailed with pebbles, fragments, dust
    const bpPebbleMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
    const bpDustMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 1.0, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 15; i++) {
      const bones = new THREE.Group();
      for (let b = 0; b < 6 + Math.floor(Math.random() * 4); b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.035, 0.3 + Math.random() * 0.4, 17), boneMat);
        bone.position.set((Math.random() - 0.5) * 0.5, 0.05, (Math.random() - 0.5) * 0.5);
        bone.rotation.set(Math.random(), Math.random(), Math.random()); bones.add(bone);
        // Joint knob at bone end
        const bpJoint = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), boneMat);
        bpJoint.position.copy(bone.position);
        bpJoint.position.y += 0.02;
        bones.add(bpJoint);
      }
      // Skulls in bone piles
      if (Math.random() > 0.5) {
        const boneSkull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 17), boneMat);
        boneSkull.position.set((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3); bones.add(boneSkull);
        // Eye sockets on skull
        for (const bpEyeSide of [-0.025, 0.025]) {
          const bpEyeSocket = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8),
            new THREE.MeshStandardMaterial({ color: 0x222211 }));
          bpEyeSocket.position.set(boneSkull.position.x + bpEyeSide, boneSkull.position.y + 0.02, boneSkull.position.z + 0.07);
          bones.add(bpEyeSocket);
        }
      }
      // Small pebbles scattered around pile
      for (let pp = 0; pp < 4 + Math.floor(Math.random() * 3); pp++) {
        const bpPebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.02 + Math.random() * 0.02, 0), bpPebbleMat);
        bpPebble.position.set((Math.random() - 0.5) * 0.7, 0.02, (Math.random() - 0.5) * 0.7);
        bones.add(bpPebble);
      }
      // Dust circle underneath pile
      const bpDust = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), bpDustMat);
      bpDust.rotation.x = -Math.PI / 2;
      bpDust.position.y = 0.01;
      bones.add(bpDust);
      const bx = (Math.random() - 0.5) * w * 0.7, bz = (Math.random() - 0.5) * d * 0.7;
      bones.position.set(bx, getTerrainHeight(bx, bz, 1.4), bz); mctx.scene.add(bones);
    }

    // Obsidian shards
    for (let i = 0; i < 10; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.1, 0.5 + Math.random() * 0.5, 17), obsidianMat);
      const shx = (Math.random() - 0.5) * w * 0.6, shz = (Math.random() - 0.5) * d * 0.6;
      shard.position.set(shx, getTerrainHeight(shx, shz, 1.4) + 0.2, shz);
      shard.rotation.set((Math.random() - 0.5) * 0.3, Math.random(), (Math.random() - 0.5) * 0.3);
      mctx.scene.add(shard);
    }
    // ── Canyon wall layer striations (thin colored horizontal boxes) ──
    for (let i = 0; i < 20; i++) {
      const striation = new THREE.Group();
      const colors = [0x664433, 0x553322, 0x776655, 0x443322, 0x887766];
      for (let l = 0; l < 4 + Math.floor(Math.random() * 3); l++) {
        const layer = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 3, 0.06, 0.4 + Math.random() * 0.3), new THREE.MeshStandardMaterial({ color: colors[l % colors.length], roughness: 0.9 }));
        layer.position.y = l * 0.15; striation.add(layer);
      }
      const stx = (Math.random()-0.5)*w*0.8, stz = (Math.random()-0.5)*d*0.8;
      striation.position.set(stx, getTerrainHeight(stx, stz, 1.4) + 1 + Math.random() * 4, stz);
      striation.rotation.y = Math.random() * Math.PI; mctx.scene.add(striation);
    }
    // ── Fossil exposures ──
    for (let i = 0; i < 8; i++) {
      const fossilGrp = new THREE.Group();
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 16), boneMat);
      spine.rotation.z = Math.PI / 2; fossilGrp.add(spine);
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 16, 20, Math.PI * 0.7), boneMat);
        rib.position.set(-0.3 + r * 0.2, 0, 0); rib.rotation.y = Math.PI / 2; fossilGrp.add(rib);
      }
      const fox = (Math.random()-0.5)*w*0.7, foz = (Math.random()-0.5)*d*0.7;
      fossilGrp.position.set(fox, getTerrainHeight(fox, foz, 1.4) + 1 + Math.random() * 3, foz);
      fossilGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(fossilGrp);
    }
    // ── Rope bridge detail (with frayed rope, missing planks, knot details) ──
    const rbFrayedMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.9 });
    const rbKnotMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.85 });
    const rbPlankMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const ropeBridge = new THREE.Group();
      const bLen = 4 + Math.random() * 4;
      const rbPlankTotal = Math.floor(bLen / 0.4);
      for (let p = 0; p < rbPlankTotal; p++) {
        // Some planks are missing
        if (Math.random() > 0.15) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.12), rbPlankMat);
          plank.position.z = -bLen / 2 + p * 0.4;
          // Slight random tilt for worn look
          plank.rotation.x = (Math.random() - 0.5) * 0.08;
          plank.rotation.z = (Math.random() - 0.5) * 0.05;
          ropeBridge.add(plank);
        }
      }
      for (const side of [-0.3, 0.3]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, bLen, 16), new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8 }));
        rope.position.set(side, 0.3, 0); rope.rotation.x = Math.PI / 2; ropeBridge.add(rope);

        // Frayed rope ends dangling from main rope
        for (let fr = 0; fr < 3; fr++) {
          const rbFray = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.1 + Math.random() * 0.1, 4), rbFrayedMat);
          rbFray.position.set(side + (Math.random() - 0.5) * 0.03, 0.2 - Math.random() * 0.15, (Math.random() - 0.5) * bLen * 0.8);
          rbFray.rotation.z = (Math.random() - 0.5) * 0.5;
          ropeBridge.add(rbFray);
        }

        // Knot details at connection points (both ends)
        for (const rbEnd of [-bLen / 2, bLen / 2]) {
          const rbKnot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), rbKnotMat);
          rbKnot.position.set(side, 0.3, rbEnd);
          ropeBridge.add(rbKnot);
          // Wrapped rope around knot
          const rbKnotWrap = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 12, 8), rbKnotMat);
          rbKnotWrap.position.set(side, 0.3, rbEnd);
          rbKnotWrap.rotation.x = Math.PI / 2;
          ropeBridge.add(rbKnotWrap);
        }
      }

      // Vertical rope supports connecting rail to deck
      for (let vs = 0; vs < Math.floor(bLen / 0.8); vs++) {
        for (const side of [-0.3, 0.3]) {
          const rbVertSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 12), rbFrayedMat);
          rbVertSupport.position.set(side, 0.15, -bLen / 2 + vs * 0.8);
          ropeBridge.add(rbVertSupport);
        }
      }

      const rbx = (Math.random() - 0.5) * w * 0.4, rbz = (Math.random() - 0.5) * d * 0.4;
      ropeBridge.position.set(rbx, getTerrainHeight(rbx, rbz, 1.4) + 2 + Math.random() * 2, rbz);
      ropeBridge.rotation.y = Math.random() * Math.PI; mctx.scene.add(ropeBridge);
    }
    // ── Mineral deposit clusters ──
    for (let i = 0; i < 12; i++) {
      const mineral = new THREE.Group();
      const mineralColors = [0xcc8844, 0x44aacc, 0xaacc44, 0xcc4488];
      for (let c = 0; c < 3 + Math.floor(Math.random() * 3); c++) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.03 + Math.random() * 0.04, 0.15 + Math.random() * 0.2, 16), new THREE.MeshStandardMaterial({ color: mineralColors[i % 4], emissive: mineralColors[i % 4], emissiveIntensity: 0.2, roughness: 0.2 }));
        crystal.position.set((Math.random()-0.5)*0.15, 0, (Math.random()-0.5)*0.15);
        crystal.rotation.set((Math.random()-0.5)*0.3, 0, (Math.random()-0.5)*0.3); mineral.add(crystal);
      }
      const mnx = (Math.random()-0.5)*w*0.7, mnz = (Math.random()-0.5)*d*0.7;
      mineral.position.set(mnx, getTerrainHeight(mnx, mnz, 1.4) + 0.5 + Math.random() * 3, mnz); mctx.scene.add(mineral);
    }

    // ── Rope bridges across gaps (with missing planks, frayed rope, swaying supports, knots) ──
    for (let i = 0; i < 5; i++) {
      const ropeBridge2 = new THREE.Group();
      const bridgeLen = 5 + Math.random() * 5;
      const plankCount = Math.floor(bridgeLen / 0.35);
      const plankMat2 = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
      const ropeMat2 = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8 });
      const rb2FrayMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.9 });
      const rb2KnotMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.85 });
      // Deck planks (some missing for worn look)
      for (let p = 0; p < plankCount; p++) {
        if (Math.random() > 0.12) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.1), plankMat2);
          plank.position.set(0, -Math.sin((p / plankCount) * Math.PI) * 0.3, -bridgeLen / 2 + p * 0.35);
          plank.rotation.x = (Math.random() - 0.5) * 0.08;
          plank.rotation.z = (Math.random() - 0.5) * 0.04;
          ropeBridge2.add(plank);
        }
      }
      // Rope rails (thin cylinders)
      for (const side of [-0.35, 0.35]) {
        const ropeRail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, bridgeLen, 8), ropeMat2);
        ropeRail.position.set(side, 0.35, 0); ropeRail.rotation.x = Math.PI / 2; ropeBridge2.add(ropeRail);
        // Vertical string supports with slight angle for swaying look
        for (let v = 0; v < Math.floor(bridgeLen / 0.6); v++) {
          const support = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 12), ropeMat2);
          support.position.set(side, 0.175, -bridgeLen / 2 + v * 0.6);
          support.rotation.z = (Math.random() - 0.5) * 0.1;
          support.rotation.x = (Math.random() - 0.5) * 0.05;
          ropeBridge2.add(support);
        }
        // Frayed rope strands dangling
        for (let fr = 0; fr < 4; fr++) {
          const rb2Fray = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.08 + Math.random() * 0.12, 4), rb2FrayMat);
          rb2Fray.position.set(side + (Math.random() - 0.5) * 0.03, 0.25 - Math.random() * 0.15, (Math.random() - 0.5) * bridgeLen * 0.7);
          rb2Fray.rotation.z = (Math.random() - 0.5) * 0.6;
          ropeBridge2.add(rb2Fray);
        }
        // Knots at bridge endpoints
        for (const rb2End of [-bridgeLen / 2, bridgeLen / 2]) {
          const rb2Knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), rb2KnotMat);
          rb2Knot.position.set(side, 0.35, rb2End);
          ropeBridge2.add(rb2Knot);
        }
      }
      const rb2x = (Math.random() - 0.5) * w * 0.5, rb2z = (Math.random() - 0.5) * d * 0.5;
      ropeBridge2.position.set(rb2x, getTerrainHeight(rb2x, rb2z, 1.4) + 2 + Math.random() * 3, rb2z);
      ropeBridge2.rotation.y = Math.random() * Math.PI; mctx.scene.add(ropeBridge2);
    }

    // ── Fossil bones embedded in canyon walls ──
    for (let i = 0; i < 10; i++) {
      const wallFossil = new THREE.Group();
      // Exposed rib cage (curved cylinders)
      for (let r = 0; r < 5; r++) {
        const fossilRib = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6 + Math.random() * 0.3, 8), boneMat);
        fossilRib.position.set(r * 0.15 - 0.3, 0, 0);
        fossilRib.rotation.z = 0.4 + Math.random() * 0.3;
        wallFossil.add(fossilRib);
      }
      // Skull sphere
      const fossilSkull = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.06, 16, 12), boneMat);
      fossilSkull.position.set(-0.5, 0, 0); fossilSkull.scale.x = 1.3; wallFossil.add(fossilSkull);
      // Eye sockets
      for (const ey of [-0.04, 0.04]) {
        const eyeSocket = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12),
          new THREE.MeshStandardMaterial({ color: 0x222211 }));
        eyeSocket.position.set(-0.5 + ey, 0.03, 0.12); wallFossil.add(eyeSocket);
      }
      const wfx = (Math.random() - 0.5) * w * 0.7, wfz = (Math.random() - 0.5) * d * 0.7;
      wallFossil.position.set(wfx, getTerrainHeight(wfx, wfz, 1.4) + 1 + Math.random() * 4, wfz);
      wallFossil.rotation.y = Math.random() * Math.PI; mctx.scene.add(wallFossil);
    }

    // ── Mining cart props ──
    for (let i = 0; i < 4; i++) {
      const mineCart = new THREE.Group();
      const cartMat = new THREE.MeshStandardMaterial({ color: 0x665544, metalness: 0.3, roughness: 0.7 });
      const rustMat2 = new THREE.MeshStandardMaterial({ color: 0x774433, metalness: 0.2, roughness: 0.8 });
      const rivetMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
      // Cart body - main box with tapered sides
      const cartBottom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.4), cartMat);
      cartBottom.position.set(0, 0.2, 0); mineCart.add(cartBottom);
      // Cart side panels (4 sides, slightly angled outward at top)
      const cartFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.04), cartMat);
      cartFront.position.set(0, 0.37, -0.22); mineCart.add(cartFront);
      const cartBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.04), cartMat);
      cartBack.position.set(0, 0.37, 0.22); mineCart.add(cartBack);
      const cartLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.44), cartMat);
      cartLeft.position.set(-0.28, 0.37, 0); mineCart.add(cartLeft);
      const cartRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.44), cartMat);
      cartRight.position.set(0.28, 0.37, 0); mineCart.add(cartRight);
      // Rust patches (slightly different color overlays)
      const rustPatch1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.045), rustMat2);
      rustPatch1.position.set(0.1, 0.35, -0.225); mineCart.add(rustPatch1);
      const rustPatch2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.045), rustMat2);
      rustPatch2.position.set(-0.15, 0.3, 0.225); mineCart.add(rustPatch2);
      // Reinforced corners (small angle brackets)
      for (const [rcx, rcz] of [[-0.26, -0.2], [0.26, -0.2], [-0.26, 0.2], [0.26, 0.2]]) {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.06), rivetMat);
        corner.position.set(rcx, 0.28, rcz); mineCart.add(corner);
      }
      // Rivet heads along top edges
      for (let rv = 0; rv < 5; rv++) {
        const rivetF = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), rivetMat);
        rivetF.position.set(-0.22 + rv * 0.11, 0.52, -0.23); mineCart.add(rivetF);
        const rivetB = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), rivetMat);
        rivetB.position.set(-0.22 + rv * 0.11, 0.52, 0.23); mineCart.add(rivetB);
      }
      for (let rv = 0; rv < 3; rv++) {
        const rivetL = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), rivetMat);
        rivetL.position.set(-0.29, 0.52, -0.12 + rv * 0.12); mineCart.add(rivetL);
        const rivetR = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), rivetMat);
        rivetR.position.set(0.29, 0.52, -0.12 + rv * 0.12); mineCart.add(rivetR);
      }
      // Ore/rock chunks inside the cart (higher detail, some with mineral glint)
      const mcOreGlintColors = [0xccaa66, 0x66aacc, 0xaacc66, 0xcc8844];
      for (let ore = 0; ore < 4 + Math.floor(Math.random() * 3); ore++) {
        const oreSize = 0.03 + Math.random() * 0.04;
        const oreChunk = new THREE.Mesh(new THREE.DodecahedronGeometry(oreSize, 1),
          new THREE.MeshStandardMaterial({ color: [0x887766, 0x998877, 0x776655, 0xaa8866][ore % 4], roughness: 0.85 }));
        oreChunk.position.set((Math.random() - 0.5) * 0.35, 0.52 + Math.random() * 0.06, (Math.random() - 0.5) * 0.25);
        oreChunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        mineCart.add(oreChunk);
        // Mineral glint spot on some ore chunks
        if (Math.random() > 0.5) {
          const mcGlint = new THREE.Mesh(new THREE.SphereGeometry(oreSize * 0.3, 12, 10),
            new THREE.MeshStandardMaterial({ color: mcOreGlintColors[ore % 4], emissive: mcOreGlintColors[ore % 4], emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.2 }));
          mcGlint.position.copy(oreChunk.position);
          mcGlint.position.y += oreSize * 0.3;
          mineCart.add(mcGlint);
        }
      }
      // Pickaxe leaning against cart
      if (Math.random() > 0.5) {
        const mcPickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.5, 12),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
        mcPickHandle.position.set(0.32, 0.35, 0);
        mcPickHandle.rotation.z = 0.3;
        mineCart.add(mcPickHandle);
        const mcPickHead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 }));
        mcPickHead.position.set(0.42, 0.58, 0);
        mcPickHead.rotation.z = 0.3;
        mineCart.add(mcPickHead);
      }
      // Lantern hanging from cart handle
      if (Math.random() > 0.6) {
        const mcLanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8),
          new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.4, roughness: 0.5 }));
        mcLanternBody.position.set(0.15, 0.42, 0.3);
        mineCart.add(mcLanternBody);
        const mcLanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8),
          new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
        mcLanternGlass.position.set(0.15, 0.42, 0.3);
        mineCart.add(mcLanternGlass);
        const mcLanternHook = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 12, 8, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.5, roughness: 0.4 }));
        mcLanternHook.position.set(0.15, 0.455, 0.3);
        mineCart.add(mcLanternHook);
      }
      // Handle bar at one end
      const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 }));
      handleBar.rotation.z = Math.PI / 2; handleBar.position.set(0, 0.45, 0.3); mineCart.add(handleBar);
      // Handle supports
      for (const hsx of [-0.12, 0.12]) {
        const hSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 12),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 }));
        hSupport.position.set(hsx, 0.39, 0.28); mineCart.add(hSupport);
      }
      // Metal wheel axles visible
      for (const ax of [-0.25, 0.25]) {
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), rivetMat);
        axle.rotation.x = Math.PI / 2; axle.position.set(ax, 0.08, 0); mineCart.add(axle);
      }
      // Wheels (small cylinders with hub detail)
      for (const wx2 of [-0.25, 0.25]) {
        for (const wz2 of [-0.2, 0.2]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), rockMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx2, 0.08, wz2); mineCart.add(wheel);
          // Wheel hub
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), rivetMat);
          hub.rotation.x = Math.PI / 2;
          hub.position.set(wx2, 0.08, wz2); mineCart.add(hub);
        }
      }
      // Rail tracks (thin boxes with proper rail profile)
      const trackLen2 = 3 + Math.random() * 3;
      for (const side of [-0.18, 0.18]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(trackLen2, 0.03, 0.025), rockMat);
        rail.position.set(0, 0.015, side); mineCart.add(rail);
        // Rail top (T-profile)
        const railTop = new THREE.Mesh(new THREE.BoxGeometry(trackLen2, 0.008, 0.04), rockMat);
        railTop.position.set(0, 0.03, side); mineCart.add(railTop);
      }
      // Cross ties with proper spacing and wood grain color variation
      const tieCount = Math.floor(trackLen2 / 0.35);
      for (let t = 0; t < tieCount; t++) {
        const tieColor = 0x443322 + Math.floor(Math.random() * 0x0a0a0a);
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.48),
          new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.9 }));
        tie.position.set(-trackLen2 / 2 + t * 0.35, 0.01, 0); mineCart.add(tie);
      }
      const mcx = (Math.random() - 0.5) * w * 0.5, mcz = (Math.random() - 0.5) * d * 0.5;
      mineCart.position.set(mcx, getTerrainHeight(mcx, mcz, 1.4), mcz);
      mineCart.rotation.y = Math.random() * Math.PI; mctx.scene.add(mineCart);
    }

    // ── Cave entrance archways (with stalactites, rubble, rock framing) ──
    for (let i = 0; i < 6; i++) {
      const caveArch = new THREE.Group();
      // Large torus segment forming arch (higher segment count)
      const archRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.35, 20, 32, Math.PI), darkRockMat);
      archRing.position.y = 1.5; caveArch.add(archRing);
      // Dark circle opening behind
      const darkOpening = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32),
        new THREE.MeshStandardMaterial({ color: 0x050505 }));
      darkOpening.position.y = 0.8; caveArch.add(darkOpening);
      // Pillar supports
      for (const side of [-1.5, 1.5]) {
        const pillar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.5, 16), darkRockMat);
        pillar2.position.set(side, 0.75, 0); caveArch.add(pillar2);
      }

      // Irregular rock pieces framing the entrance
      const caFrameCount = 5 + Math.floor(Math.random() * 4);
      for (let caf = 0; caf < caFrameCount; caf++) {
        const caFrameSize = 0.15 + Math.random() * 0.25;
        const caFrameRock = new THREE.Mesh(new THREE.DodecahedronGeometry(caFrameSize, 1), rockMat);
        const caFrameAngle = (caf / caFrameCount) * Math.PI;
        caFrameRock.position.set(
          Math.cos(caFrameAngle) * 1.6, 0.8 + Math.sin(caFrameAngle) * 1.2, 0.15,
        );
        caFrameRock.rotation.set(Math.random(), Math.random(), Math.random());
        caveArch.add(caFrameRock);
      }

      // Stalactites hanging above entrance
      const caStalCount = 4 + Math.floor(Math.random() * 3);
      for (let cas = 0; cas < caStalCount; cas++) {
        const caStalH = 0.15 + Math.random() * 0.35;
        const caStal = new THREE.Mesh(new THREE.ConeGeometry(0.04 + Math.random() * 0.03, caStalH, 8), rockMat);
        caStal.rotation.x = Math.PI;
        caStal.position.set(
          (Math.random() - 0.5) * 2.0, 2.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2,
        );
        caveArch.add(caStal);
      }

      // Rubble at threshold
      const caRubbleCount = 5 + Math.floor(Math.random() * 4);
      for (let car = 0; car < caRubbleCount; car++) {
        const caRubbleSize = 0.06 + Math.random() * 0.1;
        const caRubble = new THREE.Mesh(new THREE.DodecahedronGeometry(caRubbleSize, 0), rockMat);
        caRubble.position.set(
          (Math.random() - 0.5) * 2.0, caRubbleSize * 0.5, 0.3 + Math.random() * 0.5,
        );
        caRubble.rotation.set(Math.random(), Math.random(), Math.random());
        caveArch.add(caRubble);
      }

      // Dim light inside
      const caveLight = new THREE.PointLight(0xff6622, 0.3, 5);
      caveLight.position.set(0, 1.0, -0.5); caveArch.add(caveLight); mctx.torchLights.push(caveLight);
      const ca2x = (Math.random() - 0.5) * w * 0.7, ca2z = (Math.random() - 0.5) * d * 0.7;
      caveArch.position.set(ca2x, getTerrainHeight(ca2x, ca2z, 1.4), ca2z);
      caveArch.rotation.y = Math.random() * Math.PI; mctx.scene.add(caveArch);
    }

    // ── Glowing mineral veins on walls ──
    for (let i = 0; i < 15; i++) {
      const veinGrp = new THREE.Group();
      const veinColors = [0x44ddff, 0xff8844, 0x44ff88, 0xffdd44, 0xff44aa];
      const veinColor = veinColors[i % veinColors.length];
      const veinMat = new THREE.MeshStandardMaterial({ color: veinColor, emissive: veinColor, emissiveIntensity: 0.8 });
      // Main vein (thin emissive box)
      const mainVein = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0 + Math.random() * 1.5, 0.02), veinMat);
      veinGrp.add(mainVein);
      // Branching veins
      for (let b = 0; b < 2 + Math.floor(Math.random() * 3); b++) {
        const branchVein = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4 + Math.random() * 0.6, 0.02), veinMat);
        branchVein.position.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.8, 0);
        branchVein.rotation.z = (Math.random() - 0.5) * 0.8; veinGrp.add(branchVein);
      }
      // Sub-branches
      for (let sb = 0; sb < 2; sb++) {
        const subBranch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2 + Math.random() * 0.3, 0.015), veinMat);
        subBranch.position.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 1.0, 0);
        subBranch.rotation.z = (Math.random() - 0.5) * 1.2; veinGrp.add(subBranch);
      }
      const vx2 = (Math.random() - 0.5) * w * 0.75, vz2 = (Math.random() - 0.5) * d * 0.75;
      veinGrp.position.set(vx2, getTerrainHeight(vx2, vz2, 1.4) + 1 + Math.random() * 4, vz2);
      veinGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(veinGrp);
    }
}

export function buildPlaguerotSewers(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x334422, 0.018);
    mctx.applyTerrainColors(0x3a4a32, 0x4a5a43, 0.4);
    mctx.dirLight.color.setHex(0x99bb55);
    mctx.dirLight.intensity = 0.8;
    mctx.ambientLight.color.setHex(0x3a4a22);
    mctx.ambientLight.intensity = 0.6;
    mctx.hemiLight.color.setHex(0x778844);
    mctx.hemiLight.groundColor.setHex(0x2a3a11);
    mctx.hemiLight.intensity = 0.6;

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x554444, roughness: 0.9 });
    const slimeMat = new THREE.MeshStandardMaterial({ color: 0x66aa22, emissive: 0x448800, emissiveIntensity: 0.5, roughness: 0.2 });
    const sewageMat = new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.1, transparent: true, opacity: 0.6 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.4, roughness: 0.5 });
    const rustPipeMat = new THREE.MeshStandardMaterial({ color: 0x664433, metalness: 0.3, roughness: 0.7 });
    const mushroomMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.6 });
    const mushroomCapMat = new THREE.MeshStandardMaterial({ color: 0xcc6633, emissive: 0x442200, emissiveIntensity: 0.3 });
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });
    const maskMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.5 });
    const gasMat = new THREE.MeshStandardMaterial({ color: 0x88aa44, transparent: true, opacity: 0.15, emissive: 0x668822, emissiveIntensity: 0.3 });

    // Tunnel walls with arched ceilings
    for (let i = 0; i < 30; i++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random() * 2, 2 + Math.random() * 2, 0.5), brickMat);
      const wx = (Math.random() - 0.5) * w * 0.85, wz = (Math.random() - 0.5) * d * 0.85;
      wall.position.set(wx, getTerrainHeight(wx, wz, 0.4) + wall.geometry.parameters.height / 2, wz);
      wall.rotation.y = Math.random() * Math.PI; wall.castShadow = true; mctx.scene.add(wall);
    }

    // Arched ceiling sections
    for (let i = 0; i < 8; i++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2 + Math.random(), 0.3, 17, 27, Math.PI), brickMat);
      const ax = (Math.random() - 0.5) * w * 0.6, az = (Math.random() - 0.5) * d * 0.6;
      arch.position.set(ax, getTerrainHeight(ax, az, 0.4) + 3, az);
      arch.rotation.y = Math.random() * Math.PI; mctx.scene.add(arch);
    }

    // Sewage channels (flowing toxic waste)
    for (let i = 0; i < 8; i++) {
      const channel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, w * 0.2 + Math.random() * 8), sewageMat);
      channel.rotation.x = -Math.PI / 2;
      const cx = (Math.random() - 0.5) * w * 0.5, cz = (Math.random() - 0.5) * d * 0.5;
      channel.position.set(cx, getTerrainHeight(cx, cz, 0.4) + 0.02, cz);
      channel.rotation.z = Math.random() * Math.PI; mctx.scene.add(channel);
      // Channel walls (raised edges)
      for (const side of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, channel.geometry.parameters.height), brickMat);
        edge.position.set(cx + side * 0.75, getTerrainHeight(cx, cz, 0.4) + 0.1, cz);
        edge.rotation.y = channel.rotation.z; mctx.scene.add(edge);
      }
    }

    // Metal grates
    for (let i = 0; i < 10; i++) {
      const grate = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), grateMat);
      grate.add(frame);
      for (let b = 0; b < 5; b++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.02), grateMat);
        bar.position.set(0, 0, -0.4 + b * 0.2); grate.add(bar);
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 1.1), grateMat);
        crossBar.position.set(-0.4 + b * 0.2, 0, 0); grate.add(crossBar);
      }
      const gx = (Math.random() - 0.5) * w * 0.6, gz = (Math.random() - 0.5) * d * 0.6;
      grate.position.set(gx, getTerrainHeight(gx, gz, 0.4) + 0.02, gz);
      grate.rotation.y = Math.random() * Math.PI; mctx.scene.add(grate);
    }

    // Rat nests (clumps of debris)
    for (let i = 0; i < 8; i++) {
      const ratNest = new THREE.Group();
      const nestBase = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 17), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1.0 }));
      nestBase.scale.y = 0.4; ratNest.add(nestBase);
      for (let d = 0; d < 5; d++) {
        const debris = new THREE.Mesh(new THREE.BoxGeometry(0.05 + Math.random() * 0.08, 0.02, 0.15 + Math.random() * 0.1), woodMat);
        debris.position.set((Math.random() - 0.5) * 0.4, 0.05, (Math.random() - 0.5) * 0.4);
        debris.rotation.y = Math.random() * Math.PI; ratNest.add(debris);
      }
      const rnx = (Math.random() - 0.5) * w * 0.7, rnz = (Math.random() - 0.5) * d * 0.7;
      ratNest.position.set(rnx, getTerrainHeight(rnx, rnz, 0.4), rnz); mctx.scene.add(ratNest);
    }

    // Dripping pipes (detailed with joints, valves, rust streaks, drip formations)
    for (let i = 0; i < 20; i++) {
      const pipeGrp = new THREE.Group();
      const pipeRadius = 0.12 + Math.random() * 0.08;
      const pipeLen = 3 + Math.random() * 4;
      const pipeBody = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeLen, 10), Math.random() > 0.5 ? pipeMat : rustPipeMat);
      pipeGrp.add(pipeBody);
      // Pipe joint collar (TorusGeometry at connections)
      const pipeJointCollar = new THREE.Mesh(new THREE.TorusGeometry(pipeRadius + 0.03, 0.025, 16, 20), pipeMat);
      pipeJointCollar.position.y = pipeLen * 0.3; pipeGrp.add(pipeJointCollar);
      if (Math.random() > 0.4) {
        const pipeJointCollar2 = new THREE.Mesh(new THREE.TorusGeometry(pipeRadius + 0.03, 0.025, 16, 20), pipeMat);
        pipeJointCollar2.position.y = -pipeLen * 0.3; pipeGrp.add(pipeJointCollar2);
      }
      // Drip formations at pipe exit (stalactite-like drips)
      const pipeDripCount = 1 + Math.floor(Math.random() * 3);
      for (let pd = 0; pd < pipeDripCount; pd++) {
        const pipeDripCone = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04 + Math.random() * 0.03, 12), slimeMat);
        pipeDripCone.rotation.x = Math.PI;
        pipeDripCone.position.set((Math.random() - 0.5) * pipeRadius, -pipeLen / 2 - 0.02 - pd * 0.03, (Math.random() - 0.5) * pipeRadius);
        pipeGrp.add(pipeDripCone);
      }
      // Drip drop below
      if (Math.random() > 0.4) {
        const pipeDripDrop = new THREE.Mesh(new THREE.SphereGeometry(0.025, 17, 16), slimeMat);
        pipeDripDrop.position.y = -pipeLen / 2 - 0.12; pipeGrp.add(pipeDripDrop);
      }
      // Rust streaks (dark PlaneGeometry strips)
      if (Math.random() > 0.3) {
        const pipeRustStreak = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.4 + Math.random() * 0.5),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9, side: THREE.DoubleSide }));
        pipeRustStreak.position.set(pipeRadius + 0.005, (Math.random() - 0.5) * pipeLen * 0.5, 0);
        pipeGrp.add(pipeRustStreak);
      }
      // Valve wheel on some pipes
      if (Math.random() > 0.6) {
        const pipeValveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 12, 16), grateMat);
        pipeValveWheel.position.set(pipeRadius + 0.05, 0, 0);
        pipeValveWheel.rotation.y = Math.PI / 2; pipeGrp.add(pipeValveWheel);
        // Valve spokes
        for (let vs = 0; vs < 4; vs++) {
          const pipeValveSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.01), grateMat);
          pipeValveSpoke.position.copy(pipeValveWheel.position);
          pipeValveSpoke.rotation.y = Math.PI / 2;
          pipeValveSpoke.rotation.z = (vs / 4) * Math.PI * 2; pipeGrp.add(pipeValveSpoke);
        }
      }
      const pipeX = (Math.random() - 0.5) * w * 0.7, pipeZ = (Math.random() - 0.5) * d * 0.7;
      pipeGrp.position.set(pipeX, getTerrainHeight(pipeX, pipeZ, 0.4) + 1, pipeZ);
      pipeGrp.rotation.set((Math.random() - 0.5) * 0.5, Math.random(), (Math.random() - 0.5) * 0.5);
      mctx.scene.add(pipeGrp);
    }

    // Mushroom growths (glowing)
    for (let i = 0; i < 15; i++) {
      const mush = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.15 + Math.random() * 0.2, 17), mushroomMat);
      stem.position.y = 0.1; mush.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 31, 17, 0, Math.PI * 2, 0, Math.PI * 0.5), mushroomCapMat);
      cap.position.y = 0.2 + Math.random() * 0.1; mush.add(cap);
      // Cluster - add 2-3 smaller mushrooms
      for (let m = 0; m < 2; m++) {
        const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08 + Math.random() * 0.1, 16), mushroomMat);
        sm.position.set((Math.random() - 0.5) * 0.1, 0.05, (Math.random() - 0.5) * 0.1); mush.add(sm);
        const sc = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), mushroomCapMat);
        sc.position.set(sm.position.x, sm.position.y + 0.06, sm.position.z); mush.add(sc);
      }
      const mx = (Math.random() - 0.5) * w * 0.8, mz = (Math.random() - 0.5) * d * 0.8;
      mush.position.set(mx, getTerrainHeight(mx, mz, 0.4), mz); mctx.scene.add(mush);
    }

    // Rusted ladders
    for (let i = 0; i < 5; i++) {
      const ladder = new THREE.Group();
      const ladH = 2 + Math.random() * 3;
      for (const side of [-0.2, 0.2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, ladH, 0.04), rustPipeMat);
        rail.position.set(side, ladH / 2, 0); ladder.add(rail);
      }
      for (let r = 0; r < Math.floor(ladH / 0.3); r++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 17), rustPipeMat);
        rung.rotation.z = Math.PI / 2; rung.position.y = 0.2 + r * 0.3; ladder.add(rung);
      }
      const lx = (Math.random() - 0.5) * w * 0.6, lz = (Math.random() - 0.5) * d * 0.6;
      ladder.position.set(lx, getTerrainHeight(lx, lz, 0.4), lz);
      ladder.rotation.z = (Math.random() - 0.5) * 0.3; mctx.scene.add(ladder);
    }

    // Broken barrels
    for (let i = 0; i < 8; i++) {
      const barrel = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.6, 12), woodMat);
      body.position.y = 0.3; barrel.add(body);
      const bandT = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.015, 30, 30), grateMat);
      bandT.position.y = 0.5; barrel.add(bandT);
      const bandB = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 17, 30), grateMat);
      bandB.position.y = 0.1; barrel.add(bandB);
      const barx = (Math.random() - 0.5) * w * 0.6, barz = (Math.random() - 0.5) * d * 0.6;
      barrel.position.set(barx, getTerrainHeight(barx, barz, 0.4), barz);
      barrel.rotation.z = Math.random() > 0.5 ? 0 : Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      mctx.scene.add(barrel);
    }

    // Plague doctor masks on ground
    for (let i = 0; i < 4; i++) {
      const mask = new THREE.Group();
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.12, 23, 20, 0, Math.PI), maskMat);
      mask.add(face);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 17), maskMat);
      beak.rotation.x = -Math.PI / 2; beak.position.z = 0.12; mask.add(beak);
      for (const side of [-1, 1]) {
        const eyeHole = new THREE.Mesh(new THREE.CircleGeometry(0.03, 23), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        eyeHole.position.set(side * 0.05, 0.03, 0.11); mask.add(eyeHole);
      }
      const mkx = (Math.random() - 0.5) * w * 0.5, mkz = (Math.random() - 0.5) * d * 0.5;
      mask.position.set(mkx, getTerrainHeight(mkx, mkz, 0.4) + 0.05, mkz);
      mask.rotation.set(Math.random() * 0.5 - 1, Math.random() * Math.PI, 0); mctx.scene.add(mask);
    }

    // Toxic gas vents
    for (let i = 0; i < 6; i++) {
      const vent = new THREE.Group();
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 10), pipeMat);
      pipe.position.y = 0.15; vent.add(pipe);
      const gasCloud = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 31, 17), gasMat);
      gasCloud.scale.y = 0.5; gasCloud.position.y = 0.5; vent.add(gasCloud);
      const vx = (Math.random() - 0.5) * w * 0.6, vz = (Math.random() - 0.5) * d * 0.6;
      vent.position.set(vx, getTerrainHeight(vx, vz, 0.4), vz); mctx.scene.add(vent);
    }

    // Slime patches
    for (let i = 0; i < 20; i++) {
      const slime = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random(), 27), slimeMat);
      slime.rotation.x = -Math.PI / 2;
      const sx = (Math.random() - 0.5) * w * 0.8, sz = (Math.random() - 0.5) * d * 0.8;
      slime.position.set(sx, getTerrainHeight(sx, sz, 0.4) + 0.02, sz); mctx.scene.add(slime);
    }

    // Toxic dripping lights
    for (let i = 0; i < 10; i++) {
      const light = new THREE.PointLight(0x88aa22, 0.4, 6);
      light.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(light); mctx.torchLights.push(light);
    }
    // ── Pipe network detail (various diameter cylinders) ──
    for (let i = 0; i < 10; i++) {
      const pipeNet = new THREE.Group();
      const mainPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2 + Math.random() * 3, 10), pipeMat);
      mainPipe.rotation.z = Math.PI / 2; pipeNet.add(mainPipe);
      const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 16, 20, Math.PI / 2), pipeMat);
      elbow.position.set(1.2, 0.2, 0); pipeNet.add(elbow);
      const vertPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 16), rustPipeMat);
      vertPipe.position.set(1.4, 0.7, 0); pipeNet.add(vertPipe);
      const valve = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 16, 20), grateMat);
      valve.position.set(0, 0, 0.15); pipeNet.add(valve);
      const pnx = (Math.random()-0.5)*w*0.6, pnz = (Math.random()-0.5)*d*0.6;
      pipeNet.position.set(pnx, getTerrainHeight(pnx, pnz, 0.4) + 1 + Math.random() * 2, pnz);
      pipeNet.rotation.y = Math.random() * Math.PI; mctx.scene.add(pipeNet);
    }
    // ── Toxic waste barrels ──
    for (let i = 0; i < 6; i++) {
      const barrel = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x555533, metalness: 0.3, roughness: 0.6 }));
      body.position.y = 0.25; barrel.add(body);
      const symbol = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshStandardMaterial({ color: 0xffcc00, side: THREE.DoubleSide }));
      symbol.position.set(0, 0.25, 0.21); barrel.add(symbol);
      const leak = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.02, 16), slimeMat);
      leak.rotation.x = -Math.PI / 2; leak.position.set(0, 0.05, 0.22); barrel.add(leak);
      const tbx = (Math.random()-0.5)*w*0.6, tbz = (Math.random()-0.5)*d*0.6;
      barrel.position.set(tbx, getTerrainHeight(tbx, tbz, 0.4), tbz);
      barrel.rotation.y = Math.random() * Math.PI; barrel.rotation.z = Math.random() > 0.7 ? (Math.random()-0.5)*0.5 : 0;
      mctx.scene.add(barrel);
    }
    // ── Brick archway detail ──
    for (let i = 0; i < 5; i++) {
      const archway = new THREE.Group();
      const lPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 0.3), brickMat);
      lPillar.position.set(-0.8, 1.25, 0); archway.add(lPillar);
      const rPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 0.3), brickMat);
      rPillar.position.set(0.8, 1.25, 0); archway.add(rPillar);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.15, 16, 20, Math.PI), brickMat);
      arch.position.y = 2.5; archway.add(arch);
      const awx = (Math.random()-0.5)*w*0.6, awz = (Math.random()-0.5)*d*0.6;
      archway.position.set(awx, getTerrainHeight(awx, awz, 0.4), awz);
      archway.rotation.y = Math.random() * Math.PI; mctx.scene.add(archway);
    }
    // ── Dripping stalactites ──
    for (let i = 0; i < 15; i++) {
      const stalactite = new THREE.Group();
      const stH = 0.3 + Math.random() * 0.8;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05 + Math.random() * 0.06, stH, 16), brickMat);
      cone.rotation.x = Math.PI; stalactite.add(cone);
      const drip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 8), new THREE.MeshStandardMaterial({ color: 0x668844, transparent: true, opacity: 0.5 }));
      drip.position.y = -stH / 2 - 0.02; stalactite.add(drip);
      stalactite.position.set((Math.random()-0.5)*w*0.6, getTerrainHeight(0, 0, 0.4) + 3.5 + Math.random(), (Math.random()-0.5)*d*0.6);
      mctx.scene.add(stalactite);
    }

    // ── Pipe outflows ──
    for (let i = 0; i < 12; i++) {
      const outflow = new THREE.Group();
      const outPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8 + Math.random() * 0.5, 16), pipeMat);
      outPipe.rotation.z = Math.PI / 2; outflow.add(outPipe);
      // Pipe flange
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), pipeMat);
      flange.rotation.z = Math.PI / 2; flange.position.x = 0.4; outflow.add(flange);
      // Dripping green translucent sphere drops
      for (let dr = 0; dr < 3 + Math.floor(Math.random() * 3); dr++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0x66aa22, emissive: 0x448800, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 }));
        drop.position.set(0.45, -0.05 - dr * 0.08, (Math.random() - 0.5) * 0.05);
        outflow.add(drop);
      }
      // Stain below pipe
      const stain = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 12), slimeMat);
      stain.rotation.x = -Math.PI / 2; stain.position.set(0.45, -0.3 - Math.random() * 0.3, 0); outflow.add(stain);
      const ofx = (Math.random() - 0.5) * w * 0.7, ofz = (Math.random() - 0.5) * d * 0.7;
      outflow.position.set(ofx, getTerrainHeight(ofx, ofz, 0.4) + 1 + Math.random() * 2, ofz);
      outflow.rotation.y = Math.random() * Math.PI; mctx.scene.add(outflow);
    }

    // ── Rat nest props ──
    for (let i = 0; i < 8; i++) {
      const ratNest2 = new THREE.Group();
      const nestBrown = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1.0 });
      // Cluster of small brown spheres
      for (let s = 0; s < 5 + Math.floor(Math.random() * 4); s++) {
        const nestBall = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 10, 8), nestBrown);
        nestBall.position.set((Math.random() - 0.5) * 0.2, Math.random() * 0.06, (Math.random() - 0.5) * 0.2);
        ratNest2.add(nestBall);
      }
      // Thin cylinder tail shapes
      for (let t = 0; t < 2 + Math.floor(Math.random() * 2); t++) {
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.12 + Math.random() * 0.08, 6), nestBrown);
        tail.position.set((Math.random() - 0.5) * 0.15, 0.02, (Math.random() - 0.5) * 0.15);
        tail.rotation.set(Math.random() * 0.5, Math.random(), Math.PI / 4 + Math.random() * 0.3);
        ratNest2.add(tail);
      }
      const rn2x = (Math.random() - 0.5) * w * 0.7, rn2z = (Math.random() - 0.5) * d * 0.7;
      ratNest2.position.set(rn2x, getTerrainHeight(rn2x, rn2z, 0.4), rn2z); mctx.scene.add(ratNest2);
    }

    // ── Broken grate covers ──
    for (let i = 0; i < 6; i++) {
      const brokenGrate = new THREE.Group();
      // Circular ring frame
      const grateRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 12, 24), grateMat);
      grateRing.rotation.x = -Math.PI / 2; brokenGrate.add(grateRing);
      // Partial grid bars (some missing/bent)
      const totalBars = 6 + Math.floor(Math.random() * 3);
      for (let b = 0; b < totalBars; b++) {
        if (Math.random() > 0.3) { // some bars missing
          const grateBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.02), grateMat);
          grateBar.rotation.y = (b / totalBars) * Math.PI;
          // Some bars bent
          if (Math.random() > 0.6) {
            grateBar.rotation.x = (Math.random() - 0.5) * 0.5;
            grateBar.rotation.z = (Math.random() - 0.5) * 0.3;
          }
          brokenGrate.add(grateBar);
        }
      }
      const bg2x = (Math.random() - 0.5) * w * 0.6, bg2z = (Math.random() - 0.5) * d * 0.6;
      brokenGrate.position.set(bg2x, getTerrainHeight(bg2x, bg2z, 0.4) + 0.02, bg2z); mctx.scene.add(brokenGrate);
    }

    // ── Sewer channel with flowing water, floating debris, scum, drain grates ──
    for (let i = 0; i < 4; i++) {
      const sewerChannel = new THREE.Group();
      const channelLen = 6 + Math.random() * 6;
      // Channel walls (raised box edges)
      for (const side of [-0.6, 0.6]) {
        const channelWall = new THREE.Mesh(new THREE.BoxGeometry(channelLen, 0.3, 0.12), brickMat);
        channelWall.position.set(0, 0.15, side); sewerChannel.add(channelWall);
      }
      // Channel floor
      const channelFloor = new THREE.Mesh(new THREE.BoxGeometry(channelLen, 0.06, 1.08), brickMat);
      channelFloor.position.y = -0.03; sewerChannel.add(channelFloor);
      // Green transparent water surface
      const waterSurf = new THREE.Mesh(new THREE.BoxGeometry(channelLen - 0.2, 0.03, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x446622, transparent: true, opacity: 0.5, emissive: 0x223311, emissiveIntensity: 0.2, roughness: 0.1 }));
      waterSurf.position.y = 0.05; sewerChannel.add(waterSurf);
      // Floating debris - wooden planks
      const chanDebrisCount = 2 + Math.floor(Math.random() * 3);
      for (let cd = 0; cd < chanDebrisCount; cd++) {
        const chanPlank = new THREE.Mesh(new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.015, 0.25 + Math.random() * 0.15),
          new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 }));
        chanPlank.position.set((Math.random() - 0.5) * (channelLen * 0.6), 0.07, (Math.random() - 0.5) * 0.5);
        chanPlank.rotation.y = Math.random() * Math.PI; sewerChannel.add(chanPlank);
      }
      // Floating leaves
      for (let cl = 0; cl < 3; cl++) {
        const chanLeaf = new THREE.Mesh(new THREE.CircleGeometry(0.03 + Math.random() * 0.02, 10),
          new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.7 }));
        chanLeaf.rotation.x = -Math.PI / 2;
        chanLeaf.position.set((Math.random() - 0.5) * (channelLen * 0.5), 0.07, (Math.random() - 0.5) * 0.4);
        sewerChannel.add(chanLeaf);
      }
      // Scum along edges (thin strips on both sides)
      for (const scumSide of [-0.42, 0.42]) {
        const chanScumStrip = new THREE.Mesh(new THREE.BoxGeometry(channelLen * 0.8, 0.01, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x556622, roughness: 0.3, transparent: true, opacity: 0.6 }));
        chanScumStrip.position.set(0, 0.06, scumSide); sewerChannel.add(chanScumStrip);
      }
      // Drain grate detail at one end
      if (Math.random() > 0.3) {
        const chanDrainGrate = new THREE.Group();
        const chanGrateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.9), grateMat);
        chanDrainGrate.add(chanGrateFrame);
        for (let gb = 0; gb < 5; gb++) {
          const chanGrateBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), grateMat);
          chanGrateBar.position.set(0, 0, -0.3 + gb * 0.15); chanDrainGrate.add(chanGrateBar);
        }
        chanDrainGrate.position.set(channelLen * 0.45, 0.15, 0); sewerChannel.add(chanDrainGrate);
      }
      const sc2x = (Math.random() - 0.5) * w * 0.5, sc2z = (Math.random() - 0.5) * d * 0.5;
      sewerChannel.position.set(sc2x, getTerrainHeight(sc2x, sc2z, 0.4) + 0.03, sc2z);
      sewerChannel.rotation.y = Math.random() * Math.PI; mctx.scene.add(sewerChannel);
    }

    // ── Brick archway tunnels ──
    for (let i = 0; i < 6; i++) {
      const brickArch = new THREE.Group();
      const archSpan = 3 + Math.random() * 4;
      const archCount = Math.floor(archSpan / 0.8);
      for (let a = 0; a < archCount; a++) {
        // Arch ring
        const archSection = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.18, 12, 20, Math.PI), brickMat);
        archSection.position.set(a * 0.8 - archSpan / 2, 1.0, 0);
        brickArch.add(archSection);
        // Brick details on arch (small boxes)
        for (let bk = 0; bk < 6; bk++) {
          const brickDetail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), brickMat);
          const bkAngle = (bk / 6) * Math.PI;
          brickDetail.position.set(a * 0.8 - archSpan / 2 + Math.cos(bkAngle) * 0.02, 1.0 + Math.sin(bkAngle) * 1.0, Math.cos(bkAngle) * 1.0);
          brickArch.add(brickDetail);
        }
      }
      const ba2x = (Math.random() - 0.5) * w * 0.6, ba2z = (Math.random() - 0.5) * d * 0.6;
      brickArch.position.set(ba2x, getTerrainHeight(ba2x, ba2z, 0.4), ba2z);
      brickArch.rotation.y = Math.random() * Math.PI; mctx.scene.add(brickArch);
    }

    // ── Torch sconces on walls ──
    for (let i = 0; i < 10; i++) {
      const sconce = new THREE.Group();
      // Wall bracket
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.2), grateMat);
      sconce.add(bracket);
      // Vertical holder
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.25, 8), grateMat);
      holder.position.set(0, 0.125, 0.08); sconce.add(holder);
      // Cup
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.06, 10), grateMat);
      cup.position.set(0, 0.26, 0.08); sconce.add(cup);
      // Flame sphere
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xff8833, emissive: 0xff6611, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 }));
      flame.position.set(0, 0.33, 0.08); flame.scale.y = 1.4; sconce.add(flame);
      // PointLight
      const torchLight = new THREE.PointLight(0xff8833, 0.5, 6);
      torchLight.position.set(0, 0.35, 0.08); sconce.add(torchLight); mctx.torchLights.push(torchLight);
      const ts2x = (Math.random() - 0.5) * w * 0.7, ts2z = (Math.random() - 0.5) * d * 0.7;
      sconce.position.set(ts2x, getTerrainHeight(ts2x, ts2z, 0.4) + 1.5 + Math.random() * 1.5, ts2z);
      sconce.rotation.y = Math.random() * Math.PI; mctx.scene.add(sconce);
    }
}

export function buildEtherealSanctum(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x333355, 0.02);
    mctx.applyTerrainColors(0x2a2a44, 0x3a3a55, 0.6);
    mctx.dirLight.color.setHex(0xaabbff);
    mctx.dirLight.intensity = 0.7;
    mctx.ambientLight.color.setHex(0x1a1a33);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x6666aa);
    mctx.hemiLight.groundColor.setHex(0x111133);

    const etherealMat = new THREE.MeshStandardMaterial({ color: 0x8888cc, emissive: 0x4444aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7777aa, roughness: 0.6 });
    const lightBridgeMat = new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.4 });
    const crystalAltarMat = new THREE.MeshStandardMaterial({ color: 0xbbddff, emissive: 0x88aaff, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
    const runeMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466ff, emissiveIntensity: 1.5 });
    const spiritMat = new THREE.MeshStandardMaterial({ color: 0xccddff, emissive: 0xaabbff, emissiveIntensity: 1.0, transparent: true, opacity: 0.3 });
    const chimeMat = new THREE.MeshStandardMaterial({ color: 0xccccee, metalness: 0.5, roughness: 0.3 });
    const prismaticMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8888ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.3 });

    // Floating platforms at various heights
    for (let i = 0; i < 12; i++) {
      const platform = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5 + Math.random() * 2, 1.8 + Math.random() * 2, 0.4, 12), stoneMat);
      top.castShadow = true; platform.add(top);
      const underside = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.5, 23), stoneMat);
      underside.position.y = -0.9; underside.rotation.x = Math.PI; platform.add(underside);
      // Rune markings on top
      const runeCircle = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.02, 17, 44), runeMat);
      runeCircle.rotation.x = -Math.PI / 2; runeCircle.position.y = 0.21; platform.add(runeCircle);
      const px = (Math.random() - 0.5) * w * 0.7, pz = (Math.random() - 0.5) * d * 0.7;
      platform.position.set(px, getTerrainHeight(px, pz, 0.6) + 0.5 + Math.random() * 3, pz);
      mctx.scene.add(platform);
    }

    // Light bridges connecting platforms
    for (let i = 0; i < 8; i++) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 4 + Math.random() * 6), lightBridgeMat);
      const bx = (Math.random() - 0.5) * w * 0.5, bz = (Math.random() - 0.5) * d * 0.5;
      bridge.position.set(bx, getTerrainHeight(bx, bz, 0.6) + 1 + Math.random() * 2, bz);
      bridge.rotation.y = Math.random() * Math.PI; mctx.scene.add(bridge);
      // Bridge glow light
      const bLight = new THREE.PointLight(0x6688ff, 0.3, 6);
      bLight.position.copy(bridge.position); bLight.position.y += 0.3;
      mctx.scene.add(bLight); mctx.torchLights.push(bLight);
    }

    // Ethereal waterfalls (translucent vertical planes)
    for (let i = 0; i < 6; i++) {
      const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(1 + Math.random(), 4 + Math.random() * 3),
        new THREE.MeshStandardMaterial({ color: 0x88bbff, emissive: 0x4466cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.25 }));
      const wfx = (Math.random() - 0.5) * w * 0.6, wfz = (Math.random() - 0.5) * d * 0.6;
      waterfall.position.set(wfx, getTerrainHeight(wfx, wfz, 0.6) + 3, wfz);
      waterfall.rotation.y = Math.random() * Math.PI; mctx.scene.add(waterfall);
      // Splash pool at base (higher poly, with splash ring, mist, ripples, wet rocks)
      const splashPoolGrp = new THREE.Group();
      const splashPoolCircle = new THREE.Mesh(new THREE.CircleGeometry(0.6, 36), lightBridgeMat);
      splashPoolCircle.rotation.x = -Math.PI / 2; splashPoolGrp.add(splashPoolCircle);
      // Splash ring (TorusGeometry around edge)
      const splashRingTorus = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 16, 36),
        new THREE.MeshStandardMaterial({ color: 0xccddff, emissive: 0x88aaff, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 }));
      splashRingTorus.rotation.x = -Math.PI / 2; splashRingTorus.position.y = 0.01; splashPoolGrp.add(splashRingTorus);
      // Mist effect (semi-transparent sphere above pool)
      const splashMistSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0xbbccff, transparent: true, opacity: 0.08, emissive: 0x6688cc, emissiveIntensity: 0.2 }));
      splashMistSphere.position.y = 0.3; splashMistSphere.scale.y = 0.5; splashPoolGrp.add(splashMistSphere);
      // Ripple rings (concentric RingGeometry)
      for (let rr = 0; rr < 3; rr++) {
        const splashRippleRing = new THREE.Mesh(new THREE.RingGeometry(0.15 + rr * 0.15, 0.17 + rr * 0.15, 36),
          new THREE.MeshStandardMaterial({ color: 0xaaccff, transparent: true, opacity: 0.15 - rr * 0.04, emissive: 0x6688cc, emissiveIntensity: 0.3 }));
        splashRippleRing.rotation.x = -Math.PI / 2; splashRippleRing.position.y = 0.02; splashPoolGrp.add(splashRippleRing);
      }
      // Wet rock patches around pool
      for (let wr = 0; wr < 4; wr++) {
        const splashWetRock = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 14, 10),
          new THREE.MeshStandardMaterial({ color: 0x556688, roughness: 0.3, metalness: 0.1 }));
        const wrAngle = (wr / 4) * Math.PI * 2 + Math.random() * 0.5;
        splashWetRock.position.set(Math.cos(wrAngle) * (0.65 + Math.random() * 0.15), 0, Math.sin(wrAngle) * (0.65 + Math.random() * 0.15));
        splashWetRock.scale.y = 0.5; splashPoolGrp.add(splashWetRock);
      }
      splashPoolGrp.position.set(wfx, getTerrainHeight(wfx, wfz, 0.6) + 0.03, wfz); mctx.scene.add(splashPoolGrp);
    }

    // Crystalline altars
    for (let i = 0; i < 5; i++) {
      const cAltar = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), stoneMat);
      base.position.y = 0.2; cAltar.add(base);
      for (let c = 0; c < 4; c++) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.06, 0.5 + Math.random() * 0.4, 20), crystalAltarMat);
        const cAngle = (c / 4) * Math.PI * 2;
        crystal.position.set(Math.sin(cAngle) * 0.4, 0.6, Math.cos(cAngle) * 0.4); cAltar.add(crystal);
      }
      const centerCryst = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 2), runeMat);
      centerCryst.position.y = 0.8; cAltar.add(centerCryst);
      const cax = (Math.random() - 0.5) * w * 0.5, caz = (Math.random() - 0.5) * d * 0.5;
      cAltar.position.set(cax, getTerrainHeight(cax, caz, 0.6), caz); mctx.scene.add(cAltar);
    }

    // Spirit orbs (floating glowing spheres)
    for (let i = 0; i < 20; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 27, 23), spiritMat);
      orb.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 5, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(orb);
    }

    // Translucent walls (ghostly barriers)
    for (let i = 0; i < 10; i++) {
      const tWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2 + Math.random() * 2, 2 + Math.random() * 3), etherealMat);
      const twx = (Math.random() - 0.5) * w * 0.6, twz = (Math.random() - 0.5) * d * 0.6;
      tWall.position.set(twx, getTerrainHeight(twx, twz, 0.6) + tWall.geometry.parameters.height / 2, twz);
      tWall.rotation.y = Math.random() * Math.PI; mctx.scene.add(tWall);
    }

    // Phasing pillars
    for (let i = 0; i < 16; i++) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3 + Math.random() * 3, 10), etherealMat);
      const ppx = (Math.random() - 0.5) * w * 0.8, ppz = (Math.random() - 0.5) * d * 0.8;
      pillar.position.set(ppx, getTerrainHeight(ppx, ppz, 0.6) + pillar.geometry.parameters.height / 2, ppz);
      pillar.castShadow = true; mctx.scene.add(pillar);
    }

    // Prismatic light effects (rainbow-ish cones)
    for (let i = 0; i < 6; i++) {
      const prism = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 17), prismaticMat);
      prism.position.set((Math.random() - 0.5) * w * 0.4, 4, (Math.random() - 0.5) * d * 0.4);
      mctx.scene.add(prism);
    }

    // Meditation circles (concentric rings on ground)
    for (let i = 0; i < 6; i++) {
      const medCircle = new THREE.Group();
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + r * 0.4, 0.02, 17, 46), runeMat);
        ring.rotation.x = -Math.PI / 2; medCircle.add(ring);
      }
      const mcx = (Math.random() - 0.5) * w * 0.5, mcz = (Math.random() - 0.5) * d * 0.5;
      medCircle.position.set(mcx, getTerrainHeight(mcx, mcz, 0.6) + 0.05, mcz); mctx.scene.add(medCircle);
    }

    // Wind chimes (hanging metallic elements)
    for (let i = 0; i < 8; i++) {
      const chime = new THREE.Group();
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 16), chimeMat);
      chime.add(hanger);
      for (let c = 0; c < 4; c++) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2 + Math.random() * 0.3, 17), chimeMat);
        tube.position.set((Math.random() - 0.5) * 0.15, -0.3 - Math.random() * 0.2, (Math.random() - 0.5) * 0.15);
        chime.add(tube);
      }
      chime.position.set((Math.random() - 0.5) * w * 0.6, 3 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(chime);
    }

    // Celestial symbols (3D star shapes with tapered tips, inner ring, center gem)
    for (let i = 0; i < 8; i++) {
      const celStarGrp = new THREE.Group();
      const celStarPointCount = 5 + Math.floor(Math.random() * 3);
      for (let csp = 0; csp < celStarPointCount; csp++) {
        const celStarAngle = (csp / celStarPointCount) * Math.PI * 2;
        // Tapered tip using ConeGeometry instead of flat BoxGeometry
        const celStarTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.4, 12), runeMat);
        celStarTip.rotation.x = Math.PI / 2;
        celStarTip.position.set(Math.sin(celStarAngle) * 0.2, 0.01, Math.cos(celStarAngle) * 0.2);
        celStarTip.rotation.y = celStarAngle; celStarGrp.add(celStarTip);
      }
      // Inner ring connecting the points (TorusGeometry)
      const celStarInnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 12, 24), runeMat);
      celStarInnerRing.rotation.x = -Math.PI / 2; celStarInnerRing.position.y = 0.01; celStarGrp.add(celStarInnerRing);
      // Emissive center gem (SphereGeometry)
      const celStarCenterGem = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xccddff, emissive: 0x88aaff, emissiveIntensity: 2.0 }));
      celStarCenterGem.position.y = 0.04; celStarGrp.add(celStarCenterGem);
      // Inner geometric pattern (smaller star rotated)
      for (let igp = 0; igp < celStarPointCount; igp++) {
        const celStarInnerAngle = (igp / celStarPointCount) * Math.PI * 2 + Math.PI / celStarPointCount;
        const celStarInnerLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.15), runeMat);
        celStarInnerLine.rotation.y = celStarInnerAngle; celStarInnerLine.position.y = 0.01; celStarGrp.add(celStarInnerLine);
      }
      // Emissive glow effect
      const celStarGlow = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24),
        new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.15 }));
      celStarGlow.rotation.x = -Math.PI / 2; celStarGlow.position.y = 0.005; celStarGrp.add(celStarGlow);
      const celStarX = (Math.random() - 0.5) * w * 0.5, celStarZ = (Math.random() - 0.5) * d * 0.5;
      celStarGrp.position.set(celStarX, getTerrainHeight(celStarX, celStarZ, 0.6) + 0.03, celStarZ); mctx.scene.add(celStarGrp);
    }

    // Floating runes
    for (let i = 0; i < 15; i++) {
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.15 + Math.random() * 0.1, 2), runeMat);
      rune.position.set((Math.random() - 0.5) * w * 0.7, 1 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(rune);
    }

    // Phase lights
    for (let i = 0; i < 12; i++) {
      const light = new THREE.PointLight([0x8888ff, 0xaa88ff, 0x88aaff][i % 3], 0.5, 8);
      light.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(light); mctx.torchLights.push(light);
    }

    // Ethereal mist patches
    for (let i = 0; i < 12; i++) {
      const mist = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * 2, 23, 20), new THREE.MeshStandardMaterial({ color: 0x6666aa, transparent: true, opacity: 0.15 }));
      mist.scale.y = 0.3;
      mist.position.set((Math.random() - 0.5) * w * 0.7, 0.5, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(mist);
    }

    // Central temple altar
    const altar = new THREE.Group();
    const altarBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), stoneMat);
    altarBase.position.y = 0.25; altar.add(altarBase);
    const altarStep = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 2.5), stoneMat);
    altarStep.position.y = 0.1; altar.add(altarStep);
    const altarOrb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 27, 23), new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688ff, emissiveIntensity: 2.0 }));
    altarOrb.position.y = 0.8; altar.add(altarOrb);
    const altarLight = new THREE.PointLight(0x8888ff, 1.0, 12);
    altarLight.position.y = 1.0; altar.add(altarLight); mctx.torchLights.push(altarLight);
    altar.position.set(0, getTerrainHeight(0, 0, 0.6), 0);
    mctx.scene.add(altar);
    // ── Ethereal flame pedestals ──
    for (let i = 0; i < 6; i++) {
      const pedestal = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 10), stoneMat);
      base.position.y = 0.4; pedestal.add(base);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.08, 10), stoneMat);
      bowl.position.y = 0.84; pedestal.add(bowl);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688ff, emissiveIntensity: 2.0, transparent: true, opacity: 0.5 }));
      flame.position.y = 1.05; pedestal.add(flame);
      const pLight = new THREE.PointLight(0x8888ff, 0.4, 6);
      pLight.position.y = 1.1; pedestal.add(pLight); mctx.torchLights.push(pLight);
      const epx = (Math.random()-0.5)*w*0.5, epz = (Math.random()-0.5)*d*0.5;
      pedestal.position.set(epx, getTerrainHeight(epx, epz, 0.6), epz); mctx.scene.add(pedestal);
    }
    // ── Translucent crystal formations (faceted with inner glow and base clusters) ──
    for (let i = 0; i < 10; i++) {
      const crystFormGrp = new THREE.Group();
      const crystFormCount = 3 + Math.floor(Math.random() * 3);
      for (let cf = 0; cf < crystFormCount; cf++) {
        const crystFormH = 0.3 + Math.random() * 0.5;
        const crystFormR = 0.04 + Math.random() * 0.04;
        // Outer crystal (12 segments for faceted look, semi-transparent)
        const crystFormOuter = new THREE.Mesh(new THREE.ConeGeometry(crystFormR, crystFormH, 12), crystalAltarMat);
        crystFormOuter.position.set((Math.random()-0.5)*0.2, crystFormH / 2, (Math.random()-0.5)*0.2);
        crystFormOuter.rotation.set((Math.random()-0.5)*0.2, 0, (Math.random()-0.5)*0.2); crystFormGrp.add(crystFormOuter);
        // Inner glow cone (smaller, emissive)
        const crystFormInner = new THREE.Mesh(new THREE.ConeGeometry(crystFormR * 0.5, crystFormH * 0.7, 12),
          new THREE.MeshStandardMaterial({ color: 0xddddff, emissive: 0xaabbff, emissiveIntensity: 2.0, transparent: true, opacity: 0.4 }));
        crystFormInner.position.copy(crystFormOuter.position);
        crystFormInner.rotation.copy(crystFormOuter.rotation); crystFormGrp.add(crystFormInner);
        // Light refraction effect (small emissive plane near crystal)
        if (Math.random() > 0.5) {
          const crystFormRefract = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.06),
            new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x88aaff, emissiveIntensity: 1.0, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
          crystFormRefract.position.set(crystFormOuter.position.x + 0.06, crystFormOuter.position.y * 0.5, crystFormOuter.position.z);
          crystFormRefract.rotation.y = Math.random() * Math.PI; crystFormGrp.add(crystFormRefract);
        }
      }
      // Crystal base cluster (multiple small angled cones at base)
      for (let cbc = 0; cbc < 2 + Math.floor(Math.random() * 3); cbc++) {
        const crystFormBaseCone = new THREE.Mesh(new THREE.ConeGeometry(0.02 + Math.random() * 0.02, 0.08 + Math.random() * 0.08, 12), crystalAltarMat);
        crystFormBaseCone.position.set((Math.random()-0.5)*0.15, 0.04, (Math.random()-0.5)*0.15);
        crystFormBaseCone.rotation.set((Math.random()-0.5)*0.6, 0, (Math.random()-0.5)*0.6); crystFormGrp.add(crystFormBaseCone);
      }
      const crystFormX = (Math.random()-0.5)*w*0.6, crystFormZ = (Math.random()-0.5)*d*0.6;
      crystFormGrp.position.set(crystFormX, getTerrainHeight(crystFormX, crystFormZ, 0.6), crystFormZ); mctx.scene.add(crystFormGrp);
    }
    // ── Spirit wisp trails (with inner core, outer halo, and tail trail) ──
    for (let i = 0; i < 8; i++) {
      const wispTrailGrp = new THREE.Group();
      const wispTrailCount = 8 + Math.floor(Math.random() * 5);
      for (let wt = 0; wt < wispTrailCount; wt++) {
        const wispTrailSize = Math.max(0.008, 0.03 - wt * 0.002);
        const wispTrailOpacity = Math.max(0.05, 0.3 - wt * 0.025);
        // Main wisp sphere (higher poly)
        const wispTrailSphere = new THREE.Mesh(new THREE.SphereGeometry(wispTrailSize, 20, 14), spiritMat);
        wispTrailSphere.position.set(wt * 0.15 + (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.1);
        wispTrailGrp.add(wispTrailSphere);
        // Inner core glow (smaller bright emissive sphere inside each wisp)
        if (wt < 4) {
          const wispTrailCore = new THREE.Mesh(new THREE.SphereGeometry(wispTrailSize * 0.5, 14, 10),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccddff, emissiveIntensity: 2.5 }));
          wispTrailCore.position.copy(wispTrailSphere.position); wispTrailGrp.add(wispTrailCore);
        }
        // Subtle outer halo (larger transparent sphere around each)
        if (wt < 3) {
          const wispTrailHalo = new THREE.Mesh(new THREE.SphereGeometry(wispTrailSize * 2.5, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xaabbff, emissive: 0x6688cc, emissiveIntensity: 0.3, transparent: true, opacity: wispTrailOpacity * 0.3 }));
          wispTrailHalo.position.copy(wispTrailSphere.position); wispTrailGrp.add(wispTrailHalo);
        }
      }
      wispTrailGrp.position.set((Math.random()-0.5)*w*0.6, 1 + Math.random() * 3, (Math.random()-0.5)*d*0.6);
      wispTrailGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(wispTrailGrp);
    }
    // ── Sacred geometry floor patterns ──
    for (let i = 0; i < 5; i++) {
      const geomPattern = new THREE.Group();
      const hexR = 1.0 + Math.random() * 0.5;
      for (let h = 0; h < 6; h++) {
        const hAngle = (h / 6) * Math.PI * 2;
        const nextAngle = ((h + 1) / 6) * Math.PI * 2;
        const line = new THREE.Mesh(new THREE.BoxGeometry(hexR * 1.0, 0.015, 0.015), runeMat);
        line.position.set(Math.cos((hAngle+nextAngle)/2) * hexR * 0.5, 0, Math.sin((hAngle+nextAngle)/2) * hexR * 0.5);
        line.rotation.y = -(hAngle+nextAngle)/2 + Math.PI/2; geomPattern.add(line);
      }
      const innerHex = new THREE.Mesh(new THREE.TorusGeometry(hexR * 0.5, 0.01, 16, 6), runeMat);
      innerHex.rotation.x = -Math.PI / 2; geomPattern.add(innerHex);
      const gpx = (Math.random()-0.5)*w*0.4, gpz = (Math.random()-0.5)*d*0.4;
      geomPattern.position.set(gpx, getTerrainHeight(gpx, gpz, 0.6) + 0.03, gpz); mctx.scene.add(geomPattern);
    }
    // ── Floating prayer beads ──
    for (let i = 0; i < 8; i++) {
      const beads = new THREE.Group();
      const beadCount = 12 + Math.floor(Math.random() * 8);
      const beadR = 0.3 + Math.random() * 0.2;
      for (let b = 0; b < beadCount; b++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 8), chimeMat);
        const bAngle = (b / beadCount) * Math.PI * 2;
        bead.position.set(Math.cos(bAngle) * beadR, 0, Math.sin(bAngle) * beadR); beads.add(bead);
      }
      beads.position.set((Math.random()-0.5)*w*0.5, 1.5 + Math.random() * 3, (Math.random()-0.5)*d*0.5);
      beads.rotation.set(Math.random()*0.3, Math.random(), Math.random()*0.3); mctx.scene.add(beads);
    }
    // ── Spirit wisp trails (detailed with lead lights) ──
    for (let i = 0; i < 15; i++) {
      const swTrail = new THREE.Group();
      const swCount = 6 + Math.floor(Math.random() * 5);
      for (let s = 0; s < swCount; s++) {
        const swOrb = new THREE.Mesh(new THREE.SphereGeometry(0.05 - s * 0.004, 16, 12), spiritMat);
        const swAng = s * 0.4 + Math.random() * 0.2;
        swOrb.position.set(Math.cos(swAng) * s * 0.2, Math.sin(swAng) * 0.15, s * 0.15);
        swTrail.add(swOrb);
      }
      const swLd = new THREE.PointLight(0xaabbff, 0.2, 4);
      swLd.position.copy(swTrail.children[0].position); swTrail.add(swLd);
      swTrail.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      swTrail.rotation.y = Math.random() * Math.PI; mctx.scene.add(swTrail);
    }
    // ── Sacred geometry floor patterns (large-scale) ──
    for (let i = 0; i < 4; i++) {
      const sgPat = new THREE.Group();
      const sgR = 1.5 + Math.random() * 1.0;
      // Hexagonal arrangement of thin box lines
      for (let h = 0; h < 6; h++) {
        const hA = (h / 6) * Math.PI * 2;
        const nA = ((h + 1) / 6) * Math.PI * 2;
        const sgLine = new THREE.Mesh(new THREE.BoxGeometry(sgR, 0.015, 0.02), runeMat);
        sgLine.position.set(Math.cos((hA + nA) / 2) * sgR * 0.5, 0, Math.sin((hA + nA) / 2) * sgR * 0.5);
        sgLine.rotation.y = -(hA + nA) / 2 + Math.PI / 2; sgPat.add(sgLine);
      }
      // Circle intersections (torus rings)
      for (let c = 0; c < 3; c++) {
        const sgRing = new THREE.Mesh(new THREE.TorusGeometry(sgR * (0.3 + c * 0.2), 0.01, 16, 30), runeMat);
        sgRing.rotation.x = -Math.PI / 2; sgPat.add(sgRing);
      }
      // Triangle formations
      for (let t = 0; t < 3; t++) {
        const tA = (t / 3) * Math.PI * 2;
        const sgTri = new THREE.Mesh(new THREE.BoxGeometry(sgR * 0.8, 0.015, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xccaa66, emissive: 0x886633, emissiveIntensity: 0.5 }));
        sgTri.position.set(Math.cos(tA) * sgR * 0.25, 0, Math.sin(tA) * sgR * 0.25);
        sgTri.rotation.y = tA + Math.PI / 6; sgPat.add(sgTri);
      }
      const sgpx = (Math.random() - 0.5) * w * 0.4, sgpz = (Math.random() - 0.5) * d * 0.4;
      sgPat.position.set(sgpx, getTerrainHeight(sgpx, sgpz, 0.6) + 0.03, sgpz); mctx.scene.add(sgPat);
    }
    // ── Ethereal flame pedestals (stone with ghostly fire) ──
    for (let i = 0; i < 8; i++) {
      const efPed = new THREE.Group();
      const efBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 10), stoneMat);
      efBase.position.y = 0.5; efPed.add(efBase);
      const efBowl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), stoneMat);
      efBowl.position.y = 1.05; efBowl.rotation.x = Math.PI; efPed.add(efBowl);
      // Ghostly blue/white fire (stacked translucent emissive spheres)
      for (let fl = 0; fl < 5; fl++) {
        const flOrb = new THREE.Mesh(new THREE.SphereGeometry(0.08 - fl * 0.012, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688ff, emissiveIntensity: 1.5 + fl * 0.3, transparent: true, opacity: 0.4 - fl * 0.05 }));
        flOrb.position.set((Math.random() - 0.5) * 0.04, 1.15 + fl * 0.1, (Math.random() - 0.5) * 0.04);
        efPed.add(flOrb);
      }
      const efLt = new THREE.PointLight(0x8888ff, 0.5, 6);
      efLt.position.y = 1.3; efPed.add(efLt); mctx.torchLights.push(efLt);
      const efx = (Math.random() - 0.5) * w * 0.5, efz = (Math.random() - 0.5) * d * 0.5;
      efPed.position.set(efx, getTerrainHeight(efx, efz, 0.6), efz); mctx.scene.add(efPed);
    }
    // ── Crystal wind chimes (hanging cone crystals) ──
    for (let i = 0; i < 6; i++) {
      const wcGrp = new THREE.Group();
      const wcHang = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 12), chimeMat);
      wcGrp.add(wcHang);
      const wcColors = [0xaaddff, 0xddaaff, 0xffddaa, 0xaaffdd];
      for (let c = 0; c < 5; c++) {
        const wcChain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15 + Math.random() * 0.2, 8), chimeMat);
        const wcA = (c / 5) * Math.PI * 2;
        wcChain.position.set(Math.cos(wcA) * 0.08, -0.25 - Math.random() * 0.15, Math.sin(wcA) * 0.08);
        wcGrp.add(wcChain);
        const wcCryst = new THREE.Mesh(new THREE.ConeGeometry(0.02 + Math.random() * 0.015, 0.1 + Math.random() * 0.08, 6),
          new THREE.MeshStandardMaterial({ color: wcColors[c % 4], transparent: true, opacity: 0.6, emissive: wcColors[c % 4], emissiveIntensity: 0.3 }));
        wcCryst.position.set(Math.cos(wcA) * 0.08, -0.4 - Math.random() * 0.2, Math.sin(wcA) * 0.08);
        wcCryst.rotation.x = Math.PI; wcGrp.add(wcCryst);
      }
      wcGrp.position.set((Math.random() - 0.5) * w * 0.5, 3 + Math.random() * 2, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(wcGrp);
    }
    // ── Meditation circles (seats around incense burner) ──
    for (let i = 0; i < 4; i++) {
      const mdCirc = new THREE.Group();
      const mdPlat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.08, 30), stoneMat);
      mdCirc.add(mdPlat);
      // Ring of small box cushions/seats
      for (let s = 0; s < 6; s++) {
        const seatA = (s / 6) * Math.PI * 2;
        const mdSeat = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.25),
          new THREE.MeshStandardMaterial({ color: [0x664488, 0x446688, 0x668844][s % 3], roughness: 0.8 }));
        mdSeat.position.set(Math.cos(seatA) * 0.85, 0.08, Math.sin(seatA) * 0.85); mdCirc.add(mdSeat);
      }
      // Central incense burner (cylinder with cone top)
      const mdBurn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16), chimeMat);
      mdBurn.position.y = 0.14; mdCirc.add(mdBurn);
      const mdCone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), chimeMat);
      mdCone.position.y = 0.28; mdCirc.add(mdCone);
      // Tiny smoke trail
      for (let sm = 0; sm < 4; sm++) {
        const mdSmk = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.1 }));
        mdSmk.position.set((Math.random() - 0.5) * 0.03, 0.35 + sm * 0.15, (Math.random() - 0.5) * 0.03);
        mdCirc.add(mdSmk);
      }
      const mdx = (Math.random() - 0.5) * w * 0.4, mdz = (Math.random() - 0.5) * d * 0.4;
      mdCirc.position.set(mdx, getTerrainHeight(mdx, mdz, 0.6) + 0.04, mdz); mctx.scene.add(mdCirc);
    }
    // ── Floating prayer scrolls ──
    for (let i = 0; i < 10; i++) {
      const fpScroll = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, emissive: 0x554422, emissiveIntensity: 0.3, side: THREE.DoubleSide }));
      fpScroll.position.set((Math.random() - 0.5) * w * 0.5, 1.5 + Math.random() * 3, (Math.random() - 0.5) * d * 0.5);
      fpScroll.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.1);
      mctx.scene.add(fpScroll);
    }
    // ── Sanctum archways (ornate with hanging veils) ──
    for (let i = 0; i < 6; i++) {
      const saArch = new THREE.Group();
      // Two pillar cylinders with decorative torus rings
      for (const side of [-0.8, 0.8]) {
        const saPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 10), stoneMat);
        saPillar.position.set(side, 1.5, 0); saArch.add(saPillar);
        for (let r = 0; r < 3; r++) {
          const saRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 12, 20), runeMat);
          saRing.position.set(side, 0.5 + r * 1.0, 0);
          saRing.rotation.x = -Math.PI / 2; saArch.add(saRing);
        }
      }
      // Large torus arch
      const saArc = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 16, 30, Math.PI), stoneMat);
      saArc.position.y = 3.0; saArch.add(saArc);
      // Hanging translucent veil planes
      const saVeil = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xccccee, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
      saVeil.position.y = 1.5; saArch.add(saVeil);
      const sax = (Math.random() - 0.5) * w * 0.5, saz = (Math.random() - 0.5) * d * 0.5;
      saArch.position.set(sax, getTerrainHeight(sax, saz, 0.6), saz);
      saArch.rotation.y = Math.random() * Math.PI; mctx.scene.add(saArch);
    }
    // ── Healing spring pools ──
    for (let i = 0; i < 3; i++) {
      const hsPool = new THREE.Group();
      const hsR = 1.0 + Math.random() * 0.5;
      // Circular water surface (translucent blue)
      const hsSurf = new THREE.Mesh(new THREE.CircleGeometry(hsR, 30),
        new THREE.MeshStandardMaterial({ color: 0x88bbff, transparent: true, opacity: 0.4, emissive: 0x4466aa, emissiveIntensity: 0.3 }));
      hsSurf.rotation.x = -Math.PI / 2; hsSurf.position.y = -0.02; hsPool.add(hsSurf);
      // Stone ring (torus)
      const hsRing = new THREE.Mesh(new THREE.TorusGeometry(hsR, 0.08, 16, 30), stoneMat);
      hsRing.rotation.x = -Math.PI / 2; hsRing.position.y = 0.02; hsPool.add(hsRing);
      // PointLight below for glow
      const hsLt = new THREE.PointLight(0x88aaff, 0.4, 6);
      hsLt.position.y = -0.3; hsPool.add(hsLt); mctx.torchLights.push(hsLt);
      // Water lily pads (small flat circles)
      for (let lp = 0; lp < 4; lp++) {
        const hsLily = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.04, 12),
          new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.6 }));
        hsLily.rotation.x = -Math.PI / 2;
        hsLily.position.set((Math.random() - 0.5) * hsR * 0.7, 0.0, (Math.random() - 0.5) * hsR * 0.7);
        hsPool.add(hsLily);
      }
      const hsx = (Math.random() - 0.5) * w * 0.4, hsz = (Math.random() - 0.5) * d * 0.4;
      hsPool.position.set(hsx, getTerrainHeight(hsx, hsz, 0.6), hsz); mctx.scene.add(hsPool);
    }
}

export function buildIronWastes(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x554444, 0.018);
    mctx.applyTerrainColors(0x3a3333, 0x4a4444, 1.0);
    mctx.dirLight.color.setHex(0xccaa88);
    mctx.dirLight.intensity = 0.8;
    mctx.ambientLight.color.setHex(0x2a2222);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x886655);
    mctx.hemiLight.groundColor.setHex(0x221111);

    const rustMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8, metalness: 0.3 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.4 });
    const scrapMat = new THREE.MeshStandardMaterial({ color: 0x777766, metalness: 0.4, roughness: 0.6 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const oilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.3 });
    const corrodedMat = new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.9, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x445566, transparent: true, opacity: 0.3 });

    // Rusting war machine hulks (more detailed)
    for (let i = 0; i < 12; i++) {
      const hulk = new THREE.Group();
      const bW = 2 + Math.random() * 3, bH = 1 + Math.random() * 2, bD = 2 + Math.random() * 3;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), rustMat);
      body.position.y = bH / 2; body.castShadow = true; hulk.add(body);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2 + Math.random() * 2, 10), metalMat);
      arm.position.set(0.5, bH + 0.5, 0); arm.rotation.z = (Math.random() - 0.5) * 0.8; hulk.add(arm);
      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 23, 30), metalMat);
        wheel.rotation.y = Math.PI / 2; wheel.position.set(side * bW * 0.4, 0.5, 0); hulk.add(wheel);
      }
      // Exhaust pipe
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 17), rustMat);
      exhaust.position.set(-bW * 0.3, bH + 0.3, -bD * 0.3); hulk.add(exhaust);
      // Viewport/window
      const viewport = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.02), glassMat);
      viewport.position.set(0, bH * 0.7, bD / 2 + 0.01); hulk.add(viewport);
      const hx = (Math.random() - 0.5) * w * 0.8, hz = (Math.random() - 0.5) * d * 0.8;
      hulk.position.set(hx, getTerrainHeight(hx, hz, 1.0), hz);
      hulk.rotation.y = Math.random() * Math.PI; mctx.scene.add(hulk);
    }

    // Broken robots/golems
    for (let i = 0; i < 6; i++) {
      const robot = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), metalMat);
      torso.position.y = 0.5; robot.add(torso);
      const rHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), metalMat);
      rHead.position.y = 1.2; robot.add(rHead);
      // One eye (broken, dim glow)
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.06, 23), new THREE.MeshStandardMaterial({ color: 0xff4422, emissive: 0xaa2200, emissiveIntensity: 0.5 }));
      eye.position.set(0.08, 1.25, 0.21); robot.add(eye);
      // Arms (one missing)
      const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), rustMat);
      rArm.position.set(0.5, 0.3, 0); rArm.rotation.z = -0.5; robot.add(rArm);
      // Legs
      for (const lx of [-0.25, 0.25]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), metalMat);
        leg.position.set(lx, -0.1, 0); robot.add(leg);
      }
      // Wires dangling
      for (let w2 = 0; w2 < 3; w2++) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3 + Math.random() * 0.3, 16), cableMat);
        wire.position.set((Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.3);
        wire.rotation.z = (Math.random() - 0.5) * 0.8; robot.add(wire);
      }
      const rx = (Math.random() - 0.5) * w * 0.6, rz = (Math.random() - 0.5) * d * 0.6;
      robot.position.set(rx, getTerrainHeight(rx, rz, 1.0), rz);
      robot.rotation.y = Math.random() * Math.PI;
      robot.rotation.z = (Math.random() - 0.5) * 0.3; mctx.scene.add(robot);
    }

    // Scrap piles (larger, more pieces)
    for (let i = 0; i < 30; i++) {
      const pile = new THREE.Group();
      for (let p = 0; p < 5 + Math.floor(Math.random() * 5); p++) {
        const scrap = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.5, 0.1 + Math.random() * 0.3, 0.2 + Math.random() * 0.5), scrapMat);
        scrap.position.set((Math.random() - 0.5) * 1, Math.random() * 0.4, (Math.random() - 0.5) * 1);
        scrap.rotation.set(Math.random(), Math.random(), Math.random()); pile.add(scrap);
      }
      const px = (Math.random() - 0.5) * w * 0.85, pz = (Math.random() - 0.5) * d * 0.85;
      pile.position.set(px, getTerrainHeight(px, pz, 1.0), pz); mctx.scene.add(pile);
    }

    // Oxidized pipes running along ground
    for (let i = 0; i < 12; i++) {
      const pipeLen = 3 + Math.random() * 6;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, pipeLen, 10), corrodedMat);
      const px = (Math.random() - 0.5) * w * 0.7, pz = (Math.random() - 0.5) * d * 0.7;
      pipe.position.set(px, getTerrainHeight(px, pz, 1.0) + 0.12, pz);
      pipe.rotation.z = Math.PI / 2; pipe.rotation.y = Math.random() * Math.PI; mctx.scene.add(pipe);
      // Pipe joints
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), metalMat);
      joint.position.copy(pipe.position); mctx.scene.add(joint);
    }

    // Corroded tanks
    for (let i = 0; i < 5; i++) {
      const tank = new THREE.Group();
      const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4, 12), rustMat);
      tankBody.rotation.z = Math.PI / 2; tankBody.position.y = 0.8; tank.add(tankBody);
      // End caps
      for (const side of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.8, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2), rustMat);
        cap.rotation.z = side * Math.PI / 2; cap.position.set(side * 1, 0.8, 0); tank.add(cap);
      }
      // Support legs
      for (const pos of [-0.5, 0.5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), metalMat);
        leg.position.set(pos, 0.4, 0.6); tank.add(leg);
        const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), metalMat);
        leg2.position.set(pos, 0.4, -0.6); tank.add(leg2);
      }
      const tx = (Math.random() - 0.5) * w * 0.6, tz = (Math.random() - 0.5) * d * 0.6;
      tank.position.set(tx, getTerrainHeight(tx, tz, 1.0), tz);
      tank.rotation.y = Math.random() * Math.PI; mctx.scene.add(tank);
    }

    // Smokestacks (broken)
    for (let i = 0; i < 8; i++) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4 + Math.random() * 4, 10), rustMat);
      const sx = (Math.random() - 0.5) * w * 0.7, sz = (Math.random() - 0.5) * d * 0.7;
      stack.position.set(sx, getTerrainHeight(sx, sz, 1.0) + stack.geometry.parameters.height / 2, sz);
      stack.rotation.z = (Math.random() - 0.5) * 0.2; stack.castShadow = true; mctx.scene.add(stack);
    }

    // Metal beams (I-beams scattered)
    for (let i = 0; i < 10; i++) {
      const beam = new THREE.Group();
      const beamLen = 2 + Math.random() * 4;
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, beamLen), metalMat); beam.add(web);
      const flangeT = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, beamLen), metalMat);
      flangeT.position.y = 0.1; beam.add(flangeT);
      const flangeB = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, beamLen), metalMat);
      flangeB.position.y = -0.1; beam.add(flangeB);
      const bmx = (Math.random() - 0.5) * w * 0.7, bmz = (Math.random() - 0.5) * d * 0.7;
      beam.position.set(bmx, getTerrainHeight(bmx, bmz, 1.0) + 0.1 + Math.random() * 0.5, bmz);
      beam.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
      mctx.scene.add(beam);
    }

    // Cable remnants (dangling wires)
    for (let i = 0; i < 15; i++) {
      const cable = new THREE.Group();
      const segments = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segments; s++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 16), cableMat);
        seg.position.y = -s * 0.45; seg.rotation.z = Math.sin(s * 1.2) * 0.3; cable.add(seg);
      }
      cable.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 3, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(cable);
    }

    // Abandoned mine cart tracks
    for (let i = 0; i < 4; i++) {
      const track = new THREE.Group();
      const trackLen = 5 + Math.random() * 5;
      for (const side of [-0.3, 0.3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, trackLen), metalMat);
        rail.position.x = side; track.add(rail);
      }
      for (let t = 0; t < Math.floor(trackLen / 0.5); t++) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.08), new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 }));
        tie.position.z = -trackLen / 2 + t * 0.5; track.add(tie);
      }
      const trx = (Math.random() - 0.5) * w * 0.5, trz = (Math.random() - 0.5) * d * 0.5;
      track.position.set(trx, getTerrainHeight(trx, trz, 1.0) + 0.02, trz);
      track.rotation.y = Math.random() * Math.PI; mctx.scene.add(track);
    }

    // Oil puddles
    for (let i = 0; i < 15; i++) {
      const oil = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.5, 27), oilMat);
      oil.rotation.x = -Math.PI / 2;
      const ox = (Math.random() - 0.5) * w * 0.7, oz = (Math.random() - 0.5) * d * 0.7;
      oil.position.set(ox, getTerrainHeight(ox, oz, 1.0) + 0.02, oz); mctx.scene.add(oil);
    }

    // Sparking lights
    for (let i = 0; i < 8; i++) {
      const spark = new THREE.PointLight(0xffaa44, 0.5, 8);
      spark.position.set((Math.random() - 0.5) * w * 0.6, 1 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      mctx.scene.add(spark); mctx.torchLights.push(spark);
    }
    // ── Rusted machinery hulks (gears, pistons) ──
    for (let i = 0; i < 6; i++) {
      const machine = new THREE.Group();
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.0 + Math.random(), 0.8 + Math.random() * 0.5, 0.6), rustMat);
      machine.add(housing);
      const gear = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 10, 8), metalMat);
      gear.position.set(0.3, 0.2, 0.31); machine.add(gear);
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 16), metalMat);
      piston.position.set(-0.3, 0, 0.35); piston.rotation.x = Math.PI / 2; machine.add(piston);
      const mx = (Math.random()-0.5)*w*0.7, mz = (Math.random()-0.5)*d*0.7;
      machine.position.set(mx, getTerrainHeight(mx, mz, 1.0) + 0.4, mz);
      machine.rotation.y = Math.random() * Math.PI; mctx.scene.add(machine);
    }
    // ── Barbed wire fencing (twisted thin cylinders) ──
    for (let i = 0; i < 6; i++) {
      const fence = new THREE.Group();
      const fenceLen = 3 + Math.random() * 4;
      for (let p = 0; p < 2; p++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 16), rustMat);
        post.position.set(p * fenceLen - fenceLen/2, 0.6, 0); fence.add(post);
      }
      for (let w2 = 0; w2 < 3; w2++) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, fenceLen, 16), metalMat);
        wire.rotation.z = Math.PI / 2; wire.position.y = 0.3 + w2 * 0.3; fence.add(wire);
        for (let b = 0; b < Math.floor(fenceLen * 2); b++) {
          const barb = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 8), metalMat);
          barb.position.set(-fenceLen/2 + b * 0.5, 0.3 + w2 * 0.3, 0.01);
          barb.rotation.z = Math.random() * Math.PI; fence.add(barb);
        }
      }
      const fex = (Math.random()-0.5)*w*0.7, fez = (Math.random()-0.5)*d*0.7;
      fence.position.set(fex, getTerrainHeight(fex, fez, 1.0), fez);
      fence.rotation.y = Math.random() * Math.PI; mctx.scene.add(fence);
    }
    // ── Abandoned vehicle frames ──
    for (let i = 0; i < 3; i++) {
      const vehicle = new THREE.Group();
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 2.5), rustMat);
      chassis.position.y = 0.4; vehicle.add(chassis);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.0), rustMat);
      cabin.position.set(0, 0.85, -0.4); vehicle.add(cabin);
      for (let ax2 = 0; ax2 < 2; ax2++) {
        for (const side of [-0.8, 0.8]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 16, 20), metalMat);
          wheel.rotation.y = Math.PI / 2;
          wheel.position.set(side, 0.25, -0.7 + ax2 * 1.4); vehicle.add(wheel);
        }
      }
      const vhx = (Math.random()-0.5)*w*0.6, vhz = (Math.random()-0.5)*d*0.6;
      vehicle.position.set(vhx, getTerrainHeight(vhx, vhz, 1.0), vhz);
      vehicle.rotation.y = Math.random() * Math.PI; vehicle.rotation.z = (Math.random()-0.5)*0.15; mctx.scene.add(vehicle);
    }
    // ── Toxic puddles ──
    for (let i = 0; i < 10; i++) {
      const toxic = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.8, 20), new THREE.MeshStandardMaterial({ color: 0x446622, emissive: 0x334411, emissiveIntensity: 0.3, transparent: true, opacity: 0.6, roughness: 0.1 }));
      toxic.rotation.x = -Math.PI / 2;
      const tpx = (Math.random()-0.5)*w*0.7, tpz = (Math.random()-0.5)*d*0.7;
      toxic.position.set(tpx, getTerrainHeight(tpx, tpz, 1.0) + 0.02, tpz); mctx.scene.add(toxic);
    }

    // ── Rusted tank/vehicle hulks ──
    for (let i = 0; i < 5; i++) {
      const tankHulk = new THREE.Group();
      const oxidizedMat = new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.9, metalness: 0.2 });
      // Large box body
      const tankBodyMain = new THREE.Mesh(new THREE.BoxGeometry(2.5 + Math.random(), 1.2, 3.5 + Math.random()), oxidizedMat);
      tankBodyMain.position.y = 0.8; tankBodyMain.castShadow = true; tankHulk.add(tankBodyMain);
      // Cylinder turret on top
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 16), oxidizedMat);
      turret.position.set(0, 1.65, -0.3); tankHulk.add(turret);
      // Gun barrel
      const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 12), oxidizedMat);
      barrel2.rotation.x = Math.PI / 2; barrel2.position.set(0, 1.65, -1.3); tankHulk.add(barrel2);
      // Track wheels (cylinders)
      for (let tw = 0; tw < 4; tw++) {
        for (const side of [-1.3, 1.3]) {
          const trackWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12), metalMat);
          trackWheel.rotation.x = Math.PI / 2;
          trackWheel.position.set(side, 0.25, -1.2 + tw * 0.8); tankHulk.add(trackWheel);
        }
      }
      // Rust patches (darker spots)
      for (let rp = 0; rp < 4; rp++) {
        const rustPatch = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.2, 12),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 1.0 }));
        rustPatch.position.set((Math.random() - 0.5) * 2, 0.8 + Math.random() * 0.8, 1.76);
        tankHulk.add(rustPatch);
      }
      const th2x = (Math.random() - 0.5) * w * 0.6, th2z = (Math.random() - 0.5) * d * 0.6;
      tankHulk.position.set(th2x, getTerrainHeight(th2x, th2z, 1.0), th2z);
      tankHulk.rotation.y = Math.random() * Math.PI;
      tankHulk.rotation.z = (Math.random() - 0.5) * 0.1; mctx.scene.add(tankHulk);
    }

    // ── Barbed wire coils ──
    for (let i = 0; i < 8; i++) {
      const barbedWire = new THREE.Group();
      const wireLen = 3 + Math.random() * 4;
      // Posts
      for (let p = 0; p < Math.floor(wireLen / 1.5) + 1; p++) {
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.0, 8), rustMat);
        post2.position.set(p * 1.5 - wireLen / 2, 0.5, 0); barbedWire.add(post2);
      }
      // Wire lines with torus coils and cone barbs
      for (let row = 0; row < 3; row++) {
        const wireH = 0.3 + row * 0.25;
        // Small torus rings (coils) along the wire
        for (let c = 0; c < Math.floor(wireLen * 1.5); c++) {
          const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 12, 8), metalMat);
          coilRing.position.set(-wireLen / 2 + c * 0.65 + Math.random() * 0.3, wireH, 0);
          coilRing.rotation.y = Math.random() * Math.PI; barbedWire.add(coilRing);
          // Tiny cone barbs
          for (let bb = 0; bb < 2; bb++) {
            const barb2 = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 10), metalMat);
            barb2.position.set(coilRing.position.x + (Math.random() - 0.5) * 0.04, wireH + (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03);
            barb2.rotation.z = Math.random() * Math.PI; barbedWire.add(barb2);
          }
        }
      }
      const bw2x = (Math.random() - 0.5) * w * 0.7, bw2z = (Math.random() - 0.5) * d * 0.7;
      barbedWire.position.set(bw2x, getTerrainHeight(bw2x, bw2z, 1.0), bw2z);
      barbedWire.rotation.y = Math.random() * Math.PI; mctx.scene.add(barbedWire);
    }

    // ── Shell craters ──
    for (let i = 0; i < 8; i++) {
      const crater = new THREE.Group();
      const craterR = 0.8 + Math.random() * 1.2;
      // Inverted half-sphere depression
      const craterBowl = new THREE.Mesh(new THREE.SphereGeometry(craterR, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 1.0 }));
      craterBowl.rotation.x = Math.PI; craterBowl.position.y = -0.05; crater.add(craterBowl);
      // Crater rim
      const craterRim = new THREE.Mesh(new THREE.TorusGeometry(craterR, 0.08, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.9 }));
      craterRim.rotation.x = -Math.PI / 2; crater.add(craterRim);
      // Scattered box debris
      for (let db = 0; db < 4 + Math.floor(Math.random() * 4); db++) {
        const debris = new THREE.Mesh(new THREE.BoxGeometry(0.1 + Math.random() * 0.2, 0.05 + Math.random() * 0.1, 0.1 + Math.random() * 0.2), scrapMat);
        const debAngle = Math.random() * Math.PI * 2;
        const debDist = craterR * 0.3 + Math.random() * craterR * 0.7;
        debris.position.set(Math.cos(debAngle) * debDist, 0.03, Math.sin(debAngle) * debDist);
        debris.rotation.set(Math.random(), Math.random(), Math.random()); crater.add(debris);
      }
      const cr2x = (Math.random() - 0.5) * w * 0.7, cr2z = (Math.random() - 0.5) * d * 0.7;
      crater.position.set(cr2x, getTerrainHeight(cr2x, cr2z, 1.0) + 0.05, cr2z); mctx.scene.add(crater);
    }

    // ── Rusted pipe sections ──
    for (let i = 0; i < 8; i++) {
      const bigPipe = new THREE.Group();
      const pipeR = 0.3 + Math.random() * 0.4;
      const pipeL = 2 + Math.random() * 3;
      const pipeSection = new THREE.Mesh(new THREE.CylinderGeometry(pipeR, pipeR, pipeL, 10), rustMat);
      pipeSection.rotation.z = Math.PI / 2;
      pipeSection.rotation.y = (Math.random() - 0.5) * 0.3;
      bigPipe.add(pipeSection);
      // Open end rings
      for (const endX of [-pipeL / 2, pipeL / 2]) {
        const endRing = new THREE.Mesh(new THREE.TorusGeometry(pipeR, 0.04, 8, 16), metalMat);
        endRing.rotation.y = Math.PI / 2;
        endRing.position.x = endX; bigPipe.add(endRing);
      }
      const bp2x = (Math.random() - 0.5) * w * 0.7, bp2z = (Math.random() - 0.5) * d * 0.7;
      bigPipe.position.set(bp2x, getTerrainHeight(bp2x, bp2z, 1.0) + pipeR, bp2z);
      bigPipe.rotation.y = Math.random() * Math.PI; mctx.scene.add(bigPipe);
    }

    // ── Warning signs ──
    for (let i = 0; i < 6; i++) {
      const signGrp = new THREE.Group();
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xccaa22, roughness: 0.6 });
      // Cylinder post
      const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 8), metalMat);
      signPost.position.y = 0.75; signGrp.add(signPost);
      // Thin box sign face (yellow)
      const signFace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02), yellowMat);
      signFace.position.set(0, 1.55, 0); signGrp.add(signFace);
      // Dark box stripes (hazard pattern)
      for (let st = 0; st < 3; st++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.025),
          new THREE.MeshStandardMaterial({ color: 0x222222 }));
        stripe.position.set(-0.15 + st * 0.15, 1.55, 0.005);
        stripe.rotation.z = 0.7; signGrp.add(stripe);
      }
      const sg2x = (Math.random() - 0.5) * w * 0.6, sg2z = (Math.random() - 0.5) * d * 0.6;
      signGrp.position.set(sg2x, getTerrainHeight(sg2x, sg2z, 1.0), sg2z);
      signGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(signGrp);
    }
}

export function buildBlightedThrone(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x2a1a2a, 0.015);
    mctx.applyTerrainColors(0x2a1a2a, 0x3a2a3a, 0.5);
    mctx.dirLight.color.setHex(0xbb99dd);
    mctx.dirLight.intensity = 0.9;
    mctx.ambientLight.color.setHex(0x332244);
    mctx.ambientLight.intensity = 0.55;
    mctx.hemiLight.color.setHex(0x886688);
    mctx.hemiLight.groundColor.setHex(0x221122);

    const corruptMat = new THREE.MeshStandardMaterial({ color: 0x442244, roughness: 0.7 });
    const rotMat = new THREE.MeshStandardMaterial({ color: 0x334411, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xaa8822, metalness: 0.5, roughness: 0.4 });
    const throneMat = new THREE.MeshStandardMaterial({ color: 0x332233, roughness: 0.6, metalness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x223311, roughness: 0.7 });
    const toxicMat = new THREE.MeshStandardMaterial({ color: 0x445511, roughness: 0.1, transparent: true, opacity: 0.5 });
    const corruptCrystalMat = new THREE.MeshStandardMaterial({ color: 0x662266, emissive: 0x441144, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
    const tapestryMat = new THREE.MeshStandardMaterial({ color: 0x553344, roughness: 0.8 });

    // Central corrupted throne (more elaborate)
    const throne = new THREE.Group();
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.5, 12), corruptMat);
    dais.position.y = 0.25; throne.add(dais);
    const daisStep = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 10, 0.3, 12), corruptMat);
    daisStep.position.y = 0.1; throne.add(daisStep);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1.5), throneMat);
    seat.position.y = 1.25; throne.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 3.5, 0.3), throneMat);
    back.position.set(0, 3, -0.6); throne.add(back);
    for (const ax of [-0.9, 0.9]) {
      const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 1.2), throneMat);
      armrest.position.set(ax, 1.9, -0.15); throne.add(armrest);
      // Skull on armrest ends
      const armSkull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 23, 20), new THREE.MeshStandardMaterial({ color: 0xccbbaa }));
      armSkull.position.set(ax, 2.1, 0.4); throne.add(armSkull);
    }
    // Corrupted crown
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.3, 12), goldMat);
    crown.position.set(0, 4.9, -0.6); throne.add(crown);
    for (let s = 0; s < 7; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 17), goldMat);
      spike.position.set(Math.sin(s / 7 * Math.PI * 2) * 0.3, 5.15, -0.6 + Math.cos(s / 7 * Math.PI * 2) * 0.3);
      throne.add(spike);
    }
    // Dark vines climbing the throne
    for (let v = 0; v < 6; v++) {
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 2 + Math.random() * 2, 16), vineMat);
      vine.position.set((Math.random() - 0.5) * 1, 2 + Math.random(), -0.5);
      vine.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.5); throne.add(vine);
    }
    throne.position.set(0, getTerrainHeight(0, 0, 0.5), 0);
    mctx.scene.add(throne);

    // Rotting wooden beams (ceiling supports)
    for (let i = 0; i < 12; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 4 + Math.random() * 4), woodMat);
      const bmx = (Math.random() - 0.5) * w * 0.7, bmz = (Math.random() - 0.5) * d * 0.7;
      beam.position.set(bmx, getTerrainHeight(bmx, bmz, 0.5) + 3 + Math.random() * 2, bmz);
      beam.rotation.y = Math.random() * Math.PI;
      beam.rotation.z = (Math.random() - 0.5) * 0.2; mctx.scene.add(beam);
    }

    // Diseased vegetation growing through cracks
    for (let i = 0; i < 25; i++) {
      const plant = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.5 + Math.random() * 0.8, 16), vineMat);
      stem.position.y = 0.3; plant.add(stem);
      // Sickly leaves
      for (let l = 0; l < 2 + Math.floor(Math.random() * 3); l++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 30, 16), rotMat);
        leaf.scale.y = 0.3; leaf.scale.x = 1.5;
        leaf.position.set((Math.random() - 0.5) * 0.15, 0.2 + l * 0.15, (Math.random() - 0.5) * 0.15);
        plant.add(leaf);
      }
      const plx = (Math.random() - 0.5) * w * 0.8, plz = (Math.random() - 0.5) * d * 0.8;
      plant.position.set(plx, getTerrainHeight(plx, plz, 0.5), plz); mctx.scene.add(plant);
    }

    // Dark vines on walls and floor (with branching detail, pulsing nodes, thorns)
    for (let i = 0; i < 35; i++) {
      const corruptVineGrp = new THREE.Group();
      const corruptVineLen = 1 + Math.random() * 3;
      // Main tendril with organic taper
      const corruptVineMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, corruptVineLen, 17), vineMat);
      corruptVineGrp.add(corruptVineMain);
      // Branching sub-tendrils
      const corruptVineBranchCount = 1 + Math.floor(Math.random() * 3);
      for (let cvb = 0; cvb < corruptVineBranchCount; cvb++) {
        const corruptVineBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.3 + Math.random() * 0.4, 12), vineMat);
        corruptVineBranch.position.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * corruptVineLen * 0.4, 0);
        corruptVineBranch.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8);
        corruptVineGrp.add(corruptVineBranch);
      }
      // Pulsing nodes (emissive spheres along vine)
      const corruptVineNodeCount = 1 + Math.floor(Math.random() * 2);
      for (let cvn = 0; cvn < corruptVineNodeCount; cvn++) {
        const corruptVineNode = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 14, 10),
          new THREE.MeshStandardMaterial({ color: 0x668833, emissive: 0x446622, emissiveIntensity: 0.6, roughness: 0.3 }));
        corruptVineNode.position.y = (Math.random() - 0.5) * corruptVineLen * 0.6;
        corruptVineGrp.add(corruptVineNode);
      }
      // Thorns (small ConeGeometry)
      const corruptVineThornCount = 2 + Math.floor(Math.random() * 4);
      for (let cvt = 0; cvt < corruptVineThornCount; cvt++) {
        const corruptVineThorn = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 8), vineMat);
        const cvtY = (Math.random() - 0.5) * corruptVineLen * 0.7;
        const cvtAngle = Math.random() * Math.PI * 2;
        corruptVineThorn.position.set(Math.cos(cvtAngle) * 0.04, cvtY, Math.sin(cvtAngle) * 0.04);
        corruptVineThorn.rotation.z = cvtAngle + Math.PI / 2;
        corruptVineGrp.add(corruptVineThorn);
      }
      const corruptVineX = (Math.random() - 0.5) * w * 0.8, corruptVineZ = (Math.random() - 0.5) * d * 0.8;
      corruptVineGrp.position.set(corruptVineX, getTerrainHeight(corruptVineX, corruptVineZ, 0.5) + 0.5 + Math.random(), corruptVineZ);
      corruptVineGrp.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
      mctx.scene.add(corruptVineGrp);
    }

    // Toxic pools (more varied sizes, with bubbles)
    for (let i = 0; i < 12; i++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.5, 27), toxicMat);
      puddle.rotation.x = -Math.PI / 2;
      const rx = (Math.random() - 0.5) * w * 0.6, rz = (Math.random() - 0.5) * d * 0.6;
      puddle.position.set(rx, getTerrainHeight(rx, rz, 0.5) + 0.02, rz); mctx.scene.add(puddle);
      // Bubbles on surface
      for (let b = 0; b < 3; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 17, 16),
          new THREE.MeshStandardMaterial({ color: 0x668822, transparent: true, opacity: 0.4 }));
        bubble.position.set(rx + (Math.random() - 0.5) * 0.5, getTerrainHeight(rx, rz, 0.5) + 0.04, rz + (Math.random() - 0.5) * 0.5);
        mctx.scene.add(bubble);
      }
    }

    // Corrupted crystals
    for (let i = 0; i < 10; i++) {
      const crystCluster = new THREE.Group();
      for (let c = 0; c < 2 + Math.floor(Math.random() * 3); c++) {
        const cH = 0.4 + Math.random() * 0.6;
        const cryst = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.05, cH, 20), corruptCrystalMat);
        cryst.position.set((Math.random() - 0.5) * 0.2, cH / 2, (Math.random() - 0.5) * 0.2);
        cryst.rotation.set((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2); crystCluster.add(cryst);
      }
      const ccx = (Math.random() - 0.5) * w * 0.6, ccz = (Math.random() - 0.5) * d * 0.6;
      crystCluster.position.set(ccx, getTerrainHeight(ccx, ccz, 0.5), ccz); mctx.scene.add(crystCluster);
    }

    // Decomposing tapestries (hanging cloth-like planes)
    for (let i = 0; i < 8; i++) {
      const tapestry = new THREE.Mesh(new THREE.PlaneGeometry(1 + Math.random(), 2 + Math.random() * 2), tapestryMat);
      const tpx = (Math.random() - 0.5) * w * 0.6, tpz = (Math.random() - 0.5) * d * 0.6;
      tapestry.position.set(tpx, getTerrainHeight(tpx, tpz, 0.5) + 2 + Math.random(), tpz);
      tapestry.rotation.y = Math.random() * Math.PI; mctx.scene.add(tapestry);
    }

    // Corrupted pillars (withered, leaning)
    for (let i = 0; i < 16; i++) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 4, 10), corruptMat);
      const ppx = (Math.random() - 0.5) * w * 0.7, ppz = (Math.random() - 0.5) * d * 0.7;
      pillar.position.set(ppx, getTerrainHeight(ppx, ppz, 0.5) + 2, ppz);
      pillar.rotation.z = (Math.random() - 0.5) * 0.15; pillar.castShadow = true; mctx.scene.add(pillar);
      // Vine wrapping on some
      if (Math.random() > 0.5) {
        const wrapVine = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 16, 27, Math.PI * 1.5), vineMat);
        wrapVine.position.set(ppx, getTerrainHeight(ppx, ppz, 0.5) + 1 + Math.random() * 2, ppz);
        mctx.scene.add(wrapVine);
      }
    }

    // Courtier chairs (fused to ground, covered in growth)
    for (let i = 0; i < 10; i++) {
      const chair = new THREE.Group();
      const cseat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), throneMat);
      cseat.position.y = 0.3; chair.add(cseat);
      const cback = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), throneMat);
      cback.position.set(0, 0.6, -0.21); chair.add(cback);
      // Moss/rot on chair
      const chairMoss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 17, 16), rotMat);
      chairMoss.scale.y = 0.3; chairMoss.position.set(0, 0.52, 0); chair.add(chairMoss);
      const cx = (Math.random() - 0.5) * w * 0.5, cz = (Math.random() - 0.5) * d * 0.5;
      chair.position.set(cx, getTerrainHeight(cx, cz, 0.5), cz);
      chair.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(chair);
    }

    // Plague rats (small shapes)
    for (let i = 0; i < 10; i++) {
      const rat = new THREE.Group();
      const ratBody = new THREE.Mesh(new THREE.SphereGeometry(0.04, 17, 16), new THREE.MeshStandardMaterial({ color: 0x333322 }));
      ratBody.scale.x = 1.5; rat.add(ratBody);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x443333 }));
      tail.position.set(-0.06, 0, 0); tail.rotation.z = Math.PI / 4; rat.add(tail);
      const ratx = (Math.random() - 0.5) * w * 0.6, ratz = (Math.random() - 0.5) * d * 0.6;
      rat.position.set(ratx, getTerrainHeight(ratx, ratz, 0.5) + 0.04, ratz);
      rat.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(rat);
    }

    // Sickly lights
    for (let i = 0; i < 10; i++) {
      const light = new THREE.PointLight([0xaa44aa, 0x884488, 0x664466][i % 3], 0.4, 8);
      light.position.set((Math.random() - 0.5) * w * 0.5, 1 + Math.random() * 2, (Math.random() - 0.5) * d * 0.5);
      mctx.scene.add(light); mctx.torchLights.push(light);
    }

    // Skull piles near throne
    for (let i = 0; i < 4; i++) {
      const skulls = new THREE.Group();
      for (let s = 0; s < 5 + Math.floor(Math.random() * 5); s++) {
        const sk = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 20, 17), new THREE.MeshStandardMaterial({ color: 0xccbbaa }));
        sk.position.set((Math.random() - 0.5) * 0.4, Math.random() * 0.15, (Math.random() - 0.5) * 0.4); skulls.add(sk);
      }
      const skx = (Math.random() - 0.5) * w * 0.2, skz = (Math.random() - 0.5) * d * 0.2;
      skulls.position.set(skx, getTerrainHeight(skx, skz, 0.5), skz); mctx.scene.add(skulls);
    }
    // ── Disease-warped pillars ──
    for (let i = 0; i < 8; i++) {
      const warpedPillar = new THREE.Group();
      const pilH = 2 + Math.random() * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, pilH, 10), corruptMat);
      col.position.y = pilH / 2; warpedPillar.add(col);
      for (let b = 0; b < 3 + Math.floor(Math.random() * 3); b++) {
        const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 16, 16), rotMat);
        const ba = Math.random() * Math.PI * 2;
        bulge.position.set(Math.cos(ba) * 0.22, pilH * 0.2 + b * pilH * 0.2, Math.sin(ba) * 0.22); warpedPillar.add(bulge);
      }
      const wpx = (Math.random()-0.5)*w*0.6, wpz = (Math.random()-0.5)*d*0.6;
      warpedPillar.position.set(wpx, getTerrainHeight(wpx, wpz, 0.5), wpz); mctx.scene.add(warpedPillar);
    }
    // ── Pustule clusters on walls ──
    for (let i = 0; i < 15; i++) {
      const pustules = new THREE.Group();
      for (let p = 0; p < 3 + Math.floor(Math.random() * 4); p++) {
        const pustule = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 16, 16), new THREE.MeshStandardMaterial({ color: 0x668833, emissive: 0x334411, emissiveIntensity: 0.3, roughness: 0.3 }));
        pustule.position.set((Math.random()-0.5)*0.15, (Math.random()-0.5)*0.15, 0);
        pustules.add(pustule);
      }
      const pux = (Math.random()-0.5)*w*0.7, puz = (Math.random()-0.5)*d*0.7;
      pustules.position.set(pux, getTerrainHeight(pux, puz, 0.5) + 1 + Math.random() * 2, puz);
      pustules.rotation.y = Math.random() * Math.PI; mctx.scene.add(pustules);
    }
    // ── Rotting carpet ──
    for (let i = 0; i < 3; i++) {
      const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + Math.random(), 4 + Math.random() * 3), new THREE.MeshStandardMaterial({ color: 0x442233, roughness: 0.9, side: THREE.DoubleSide }));
      carpet.rotation.x = -Math.PI / 2;
      const cpx = (Math.random()-0.5)*w*0.3, cpz = (Math.random()-0.5)*d*0.3;
      carpet.position.set(cpx, getTerrainHeight(cpx, cpz, 0.5) + 0.02, cpz);
      carpet.rotation.z = Math.random() * Math.PI; mctx.scene.add(carpet);
      for (let h = 0; h < 3; h++) {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.1 + Math.random() * 0.15, 16), new THREE.MeshStandardMaterial({ color: 0x1a111a }));
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(cpx + (Math.random()-0.5)*1, getTerrainHeight(cpx, cpz, 0.5) + 0.025, cpz + (Math.random()-0.5)*2);
        mctx.scene.add(hole);
      }
    }
    // ── Broken crown prop near throne ──
    {
      const brokenCrown = new THREE.Group();
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 16, 20, Math.PI * 1.5), goldMat);
      brokenCrown.add(band);
      for (let s = 0; s < 4; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 16), goldMat);
        const sa = (s / 5) * Math.PI * 1.5;
        spike.position.set(Math.cos(sa) * 0.15, Math.sin(sa) * 0.15 + 0.05, 0); brokenCrown.add(spike);
      }
      brokenCrown.position.set((Math.random()-0.5)*2, getTerrainHeight(0, 0, 0.5) + 0.05, (Math.random()-0.5)*2);
      brokenCrown.rotation.set(0.5, Math.random() * Math.PI, 0.3); mctx.scene.add(brokenCrown);
    }
    // ── Disease-warped pillars (irregularly bulging) ──
    for (let i = 0; i < 10; i++) {
      const warpPillar = new THREE.Group();
      const wpH = 2.5 + Math.random() * 2.5;
      const wpSegCount = 4 + Math.floor(Math.random() * 3);
      let wpCurrY = 0;
      for (let seg = 0; seg < wpSegCount; seg++) {
        const segH = wpH / wpSegCount;
        const segR = 0.15 + Math.random() * 0.15;
        const wpSeg = new THREE.Mesh(new THREE.CylinderGeometry(segR, segR + 0.05, segH, 10),
          new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 }));
        wpSeg.position.y = wpCurrY + segH / 2; warpPillar.add(wpSeg);
        wpCurrY += segH;
      }
      // Pustule sphere clusters
      for (let p = 0; p < 3 + Math.floor(Math.random() * 3); p++) {
        const wpPustule = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x668833, emissive: 0x334411, emissiveIntensity: 0.3, roughness: 0.3 }));
        const wpPa = Math.random() * Math.PI * 2;
        wpPustule.position.set(Math.cos(wpPa) * 0.2, Math.random() * wpH, Math.sin(wpPa) * 0.2);
        warpPillar.add(wpPustule);
      }
      const wppx = (Math.random() - 0.5) * w * 0.65, wppz = (Math.random() - 0.5) * d * 0.65;
      warpPillar.position.set(wppx, getTerrainHeight(wppx, wppz, 0.5), wppz); mctx.scene.add(warpPillar);
    }
    // ── Organic growth masses ──
    for (let i = 0; i < 8; i++) {
      const orgGrowth = new THREE.Group();
      for (let s = 0; s < 4 + Math.floor(Math.random() * 4); s++) {
        const orgSph = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.25, 20, 17),
          new THREE.MeshStandardMaterial({ color: 0x556622, emissive: 0x223311, emissiveIntensity: 0.2, transparent: true, opacity: 0.6 }));
        orgSph.position.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4);
        orgGrowth.add(orgSph);
      }
      // Emissive veins (thin emissive cylinders on surface)
      for (let v = 0; v < 3; v++) {
        const orgVein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3 + Math.random() * 0.3, 16),
          new THREE.MeshStandardMaterial({ color: 0x88cc22, emissive: 0x66aa11, emissiveIntensity: 1.0 }));
        orgVein.position.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3);
        orgVein.rotation.set(Math.random(), Math.random(), Math.random()); orgGrowth.add(orgVein);
      }
      const ogx = (Math.random() - 0.5) * w * 0.6, ogz = (Math.random() - 0.5) * d * 0.6;
      orgGrowth.position.set(ogx, getTerrainHeight(ogx, ogz, 0.5) + 0.5 + Math.random() * 2, ogz); mctx.scene.add(orgGrowth);
    }
    // ── Corrupted fountain ──
    for (let i = 0; i < 2; i++) {
      const cFountain = new THREE.Group();
      // Stacked cylinders (former fountain)
      const cfBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.4, 10), corruptMat);
      cfBase.position.y = 0.2; cFountain.add(cfBase);
      const cfMid = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.8, 10), corruptMat);
      cfMid.position.y = 0.8; cFountain.add(cfMid);
      const cfTop = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.5, 10), corruptMat);
      cfTop.position.y = 1.45; cFountain.add(cfTop);
      // Oozing dark fluid (green transparent surface)
      const cfOoze = new THREE.Mesh(new THREE.CircleGeometry(0.8, 27), toxicMat);
      cfOoze.rotation.x = -Math.PI / 2; cfOoze.position.y = 0.42; cFountain.add(cfOoze);
      // Dead vegetation around it
      for (let dv = 0; dv < 6; dv++) {
        const deadVeg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.3 + Math.random() * 0.3, 16),
          new THREE.MeshStandardMaterial({ color: 0x443311, roughness: 0.9 }));
        const dvA = (dv / 6) * Math.PI * 2;
        deadVeg.position.set(Math.cos(dvA) * 1.3, 0.15, Math.sin(dvA) * 1.3);
        deadVeg.rotation.z = (Math.random() - 0.5) * 0.4; cFountain.add(deadVeg);
      }
      const cfx = (i === 0 ? -1 : 1) * w * 0.15 + (Math.random() - 0.5) * 2;
      const cfz = (Math.random() - 0.5) * d * 0.3;
      cFountain.position.set(cfx, getTerrainHeight(cfx, cfz, 0.5), cfz); mctx.scene.add(cFountain);
    }
    // ── Throne of corruption (ornate with skulls, banners, crystal inlays, steps) ──
    {
      const corThrone = new THREE.Group();
      // Steps leading up to throne
      for (let ctStep = 0; ctStep < 3; ctStep++) {
        const ctStepMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.8 - ctStep * 0.4, 3.0 - ctStep * 0.4, 0.15, 12), corruptMat);
        ctStepMesh.position.y = ctStep * 0.15; corThrone.add(ctStepMesh);
      }
      // Raised platform
      const ctPlat = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 0.4, 12), corruptMat);
      ctPlat.position.y = 0.65; corThrone.add(ctPlat);
      // Main throne seat
      const ctSeat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.5), throneMat);
      ctSeat.position.y = 1.35; corThrone.add(ctSeat);
      const ctBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.3), throneMat);
      ctBack.position.set(0, 3.35, -0.6); corThrone.add(ctBack);
      // Armrest detail (ornate with carved ends)
      for (const ctArmSide of [-0.85, 0.85]) {
        const ctArmrest = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 1.2), throneMat);
        ctArmrest.position.set(ctArmSide, 1.95, -0.15); corThrone.add(ctArmrest);
        // Carved skull on armrest end
        const ctArmSkull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 14),
          new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 }));
        ctArmSkull.position.set(ctArmSide, 2.1, 0.4); corThrone.add(ctArmSkull);
        // Eye sockets on skull
        for (const ctEyeSide of [-0.025, 0.025]) {
          const ctEyeSocket = new THREE.Mesh(new THREE.CircleGeometry(0.015, 10),
            new THREE.MeshStandardMaterial({ color: 0x440022, emissive: 0x440022, emissiveIntensity: 0.5 }));
          ctEyeSocket.position.set(ctArmSide + ctEyeSide, 2.13, 0.47); corThrone.add(ctEyeSocket);
        }
      }
      // Skull decorations along throne back
      for (let ctSkd = 0; ctSkd < 5; ctSkd++) {
        const ctSkullDecor = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 }));
        ctSkullDecor.position.set(-0.6 + ctSkd * 0.3, 4.0 + Math.sin(ctSkd) * 0.1, -0.58);
        corThrone.add(ctSkullDecor);
      }
      // Corrupted crystal inlays on throne back
      for (let ctCi = 0; ctCi < 3; ctCi++) {
        const ctCrystalInlay = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 12),
          new THREE.MeshStandardMaterial({ color: 0x662266, emissive: 0x441144, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 }));
        ctCrystalInlay.position.set(-0.4 + ctCi * 0.4, 3.6, -0.43);
        ctCrystalInlay.rotation.x = -0.3; corThrone.add(ctCrystalInlay);
      }
      // Tattered banners on throne sides
      for (const ctBanSide of [-1.0, 1.0]) {
        const ctTatteredBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
        ctTatteredBanner.position.set(ctBanSide, 3.5, -0.55);
        ctTatteredBanner.rotation.z = (Math.random() - 0.5) * 0.15; corThrone.add(ctTatteredBanner);
      }
      // Carved detail lines on throne seat
      for (let ctCarve = 0; ctCarve < 3; ctCarve++) {
        const ctCarveLine = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.015),
          new THREE.MeshStandardMaterial({ color: 0x221122, roughness: 0.5 }));
        ctCarveLine.position.set(0, 1.1 + ctCarve * 0.15, 0.72); corThrone.add(ctCarveLine);
      }
      // Organic growth sphere clusters covering it
      for (let og = 0; og < 8; og++) {
        const ctGrowth = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 16, 16), rotMat);
        ctGrowth.position.set((Math.random() - 0.5) * 1.2, 0.95 + Math.random() * 3, (Math.random() - 0.5) * 0.8);
        corThrone.add(ctGrowth);
      }
      // Pulsing veins (thin emissive cylinders)
      for (let pv = 0; pv < 6; pv++) {
        const ctVein = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1 + Math.random() * 2, 16),
          new THREE.MeshStandardMaterial({ color: 0x88cc22, emissive: 0x66aa11, emissiveIntensity: 1.2 }));
        ctVein.position.set((Math.random() - 0.5) * 0.8, 1.45 + Math.random() * 2, (Math.random() - 0.5) * 0.5);
        ctVein.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5); corThrone.add(ctVein);
      }
      // Dark aura (large translucent sphere)
      const ctAura = new THREE.Mesh(new THREE.SphereGeometry(3, 23, 20),
        new THREE.MeshStandardMaterial({ color: 0x220022, emissive: 0x110011, emissiveIntensity: 0.2, transparent: true, opacity: 0.06 }));
      ctAura.position.y = 2.45; corThrone.add(ctAura);
      const ctLight = new THREE.PointLight(0x66aa22, 0.6, 10);
      ctLight.position.y = 3.45; corThrone.add(ctLight); mctx.torchLights.push(ctLight);
      const ctx = (Math.random() - 0.5) * w * 0.15, ctz = (Math.random() - 0.5) * d * 0.15;
      corThrone.position.set(ctx, getTerrainHeight(ctx, ctz, 0.5), ctz); mctx.scene.add(corThrone);
    }
    // ── Decayed banners ──
    for (let i = 0; i < 8; i++) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.6 + Math.random() * 0.5, 1.5 + Math.random() * 1.5),
        new THREE.MeshStandardMaterial({ color: [0x443322, 0x334411, 0x332211][i % 3], roughness: 0.9, side: THREE.DoubleSide }));
      const bnx = (Math.random() - 0.5) * w * 0.6, bnz = (Math.random() - 0.5) * d * 0.6;
      banner.position.set(bnx, getTerrainHeight(bnx, bnz, 0.5) + 2.5 + Math.random() * 2, bnz);
      banner.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.15);
      mctx.scene.add(banner);
    }
    // ── Spore sacs ──
    for (let i = 0; i < 15; i++) {
      const spore = new THREE.Group();
      const sporeR = 0.1 + Math.random() * 0.2;
      const sporeSac = new THREE.Mesh(new THREE.SphereGeometry(sporeR, 20, 17),
        new THREE.MeshStandardMaterial({ color: 0x667733, emissive: 0x334411, emissiveIntensity: 0.2, transparent: true, opacity: 0.5 }));
      spore.add(sporeSac);
      // Visible internal detail (smaller sphere inside)
      const sporeInner = new THREE.Mesh(new THREE.SphereGeometry(sporeR * 0.5, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x88aa33, emissive: 0x556622, emissiveIntensity: 0.4 }));
      spore.add(sporeInner);
      const spx = (Math.random() - 0.5) * w * 0.7, spz = (Math.random() - 0.5) * d * 0.7;
      spore.position.set(spx, getTerrainHeight(spx, spz, 0.5) + 2 + Math.random() * 4, spz);
      mctx.scene.add(spore);
    }
    // ── Plague pools ──
    for (let i = 0; i < 6; i++) {
      const plaguePool = new THREE.Group();
      const ppRadius = 0.8 + Math.random() * 1.5;
      const ppSurface = new THREE.Mesh(new THREE.CircleGeometry(ppRadius, 27), toxicMat);
      ppSurface.rotation.x = -Math.PI / 2; plaguePool.add(ppSurface);
      // Bubble spheres on surface
      for (let b = 0; b < 4 + Math.floor(Math.random() * 4); b++) {
        const ppBubble = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x668822, transparent: true, opacity: 0.4 }));
        const bA = Math.random() * Math.PI * 2;
        ppBubble.position.set(Math.cos(bA) * ppRadius * 0.6, 0.02, Math.sin(bA) * ppRadius * 0.6);
        plaguePool.add(ppBubble);
      }
      // Gas wisps (translucent spheres above)
      for (let g = 0; g < 3; g++) {
        const ppGas = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x668833, transparent: true, opacity: 0.08 }));
        ppGas.position.set((Math.random() - 0.5) * ppRadius, 0.2 + Math.random() * 0.5, (Math.random() - 0.5) * ppRadius);
        plaguePool.add(ppGas);
      }
      const ppLight = new THREE.PointLight(0x44aa22, 0.3, 6);
      ppLight.position.y = 0.3; plaguePool.add(ppLight); mctx.torchLights.push(ppLight);
      const ppx = (Math.random() - 0.5) * w * 0.6, ppz = (Math.random() - 0.5) * d * 0.6;
      plaguePool.position.set(ppx, getTerrainHeight(ppx, ppz, 0.5) + 0.01, ppz); mctx.scene.add(plaguePool);
    }
    // ── Infected corpse piles ──
    for (let i = 0; i < 4; i++) {
      const corpsePile = new THREE.Group();
      // Groups of small cylinders and spheres in mound arrangement
      for (let c = 0; c < 5 + Math.floor(Math.random() * 4); c++) {
        const cpPart = Math.random() > 0.5
          ? new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2 + Math.random() * 0.15, 16),
              new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.9 }))
          : new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 16, 16),
              new THREE.MeshStandardMaterial({ color: 0x554444, roughness: 0.9 }));
        cpPart.position.set((Math.random() - 0.5) * 0.5, Math.random() * 0.15, (Math.random() - 0.5) * 0.5);
        cpPart.rotation.set(Math.random(), Math.random(), Math.random()); corpsePile.add(cpPart);
      }
      // Organic tendrils wrapped around
      for (let t = 0; t < 3; t++) {
        const cpTendril = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.4 + Math.random() * 0.3, 16), vineMat);
        cpTendril.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3);
        cpTendril.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5); corpsePile.add(cpTendril);
      }
      const cpx = (Math.random() - 0.5) * w * 0.5, cpz = (Math.random() - 0.5) * d * 0.5;
      corpsePile.position.set(cpx, getTerrainHeight(cpx, cpz, 0.5), cpz); mctx.scene.add(corpsePile);
    }

    // ── Corrupted floor rune circles (glowing dark magic on ground) ──
    const floorRuneMat = new THREE.MeshStandardMaterial({
      color: 0x442244, emissive: 0x331133, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide,
    });
    const floorLineMat = new THREE.MeshStandardMaterial({
      color: 0x663366, emissive: 0x441144, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 15; i++) {
      const frx = (Math.random() - 0.5) * w * 0.7, frz = (Math.random() - 0.5) * d * 0.7;
      const fry = getTerrainHeight(frx, frz, 0.5) + 0.03;
      const frR = 1.5 + Math.random() * 2.5;
      const ring = new THREE.Mesh(new THREE.RingGeometry(frR - 0.08, frR + 0.04, 48), floorRuneMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(frx, fry, frz);
      mctx.scene.add(ring);
      // Inner circle
      const inner = new THREE.Mesh(new THREE.RingGeometry(frR * 0.4, frR * 0.45, 36), floorRuneMat);
      inner.rotation.x = -Math.PI / 2; inner.position.set(frx, fry, frz);
      mctx.scene.add(inner);
      // Radial lines
      for (let rl = 0; rl < 6; rl++) {
        const rlA = (rl / 6) * Math.PI;
        const radLine = new THREE.Mesh(new THREE.PlaneGeometry(frR * 2, 0.025), floorLineMat);
        radLine.rotation.x = -Math.PI / 2; radLine.rotation.z = rlA;
        radLine.position.set(frx, fry + 0.003, frz);
        mctx.scene.add(radLine);
      }
    }

    // ── Cracked stone floor tiles ──
    const crackTileMat1 = new THREE.MeshStandardMaterial({ color: 0x3a2a3a, roughness: 0.8 });
    const crackTileMat2 = new THREE.MeshStandardMaterial({ color: 0x2a2230, roughness: 0.85 });
    for (let i = 0; i < 35; i++) {
      const tW = 0.6 + Math.random() * 1.5, tD = 0.6 + Math.random() * 1.5;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(tW, 0.06, tD), Math.random() > 0.5 ? crackTileMat1 : crackTileMat2);
      const tx = (Math.random() - 0.5) * w * 0.75, tz = (Math.random() - 0.5) * d * 0.75;
      tile.position.set(tx, getTerrainHeight(tx, tz, 0.5) + 0.03, tz);
      tile.rotation.y = Math.random() * Math.PI;
      mctx.scene.add(tile);
    }

    // ── Miasma fog patches (low-hanging toxic ground fog) ──
    const miasmaMat = new THREE.MeshStandardMaterial({
      color: 0x334422, emissive: 0x223311, emissiveIntensity: 0.2,
      transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 20; i++) {
      const fogR = 2 + Math.random() * 4;
      const fogPatch = new THREE.Mesh(new THREE.CircleGeometry(fogR, 16), miasmaMat);
      fogPatch.rotation.x = -Math.PI / 2;
      const fx = (Math.random() - 0.5) * w * 0.8, fz = (Math.random() - 0.5) * d * 0.8;
      fogPatch.position.set(fx, getTerrainHeight(fx, fz, 0.5) + 0.1 + Math.random() * 0.3, fz);
      mctx.scene.add(fogPatch);
    }

    // ── Floating corruption motes ──
    const corruptMoteMat = new THREE.MeshStandardMaterial({
      color: 0x88aa44, emissive: 0x668822, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.5,
    });
    const darkMoteMat = new THREE.MeshStandardMaterial({
      color: 0x884488, emissive: 0x662266, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.4,
    });
    for (let i = 0; i < 50; i++) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 6, 4),
        Math.random() > 0.5 ? corruptMoteMat : darkMoteMat);
      mote.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.3 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.scene.add(mote);
    }

    // ── Ruined wall segments (broken stone walls scattered around) ──
    for (let i = 0; i < 10; i++) {
      const wallH = 1.5 + Math.random() * 2;
      const wallW = 2 + Math.random() * 4;
      const rWall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 0.3), corruptMat);
      const rwx = (Math.random() - 0.5) * w * 0.65, rwz = (Math.random() - 0.5) * d * 0.65;
      rWall.position.set(rwx, getTerrainHeight(rwx, rwz, 0.5) + wallH / 2, rwz);
      rWall.rotation.y = Math.random() * Math.PI;
      rWall.castShadow = true;
      mctx.scene.add(rWall);
    }

    // ── Additional lights ──
    for (let i = 0; i < 8; i++) {
      const aLight = new THREE.PointLight([0xaa44aa, 0x66aa22, 0x884488, 0x448844][i % 4], 0.35, 12);
      aLight.position.set(
        (Math.random() - 0.5) * w * 0.6,
        1 + Math.random() * 2.5,
        (Math.random() - 0.5) * d * 0.6
      );
      mctx.scene.add(aLight);
      mctx.torchLights.push(aLight);
    }
}

