import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { VendorType } from './DiabloTypes';
import { VENDOR_DEFS } from './DiabloConfig';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildMoonlitGrove(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x112244, 0.014);
    mctx.applyTerrainColors(0x1a3322, 0x2a4433, 1.2);
    mctx.dirLight.color.setHex(0x8899cc);
    mctx.dirLight.intensity = 0.8;
    mctx.ambientLight.color.setHex(0x223355);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x6677aa);
    mctx.hemiLight.groundColor.setHex(0x112211);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.5, transparent: true, opacity: 0.7 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xccddff, emissive: 0x6688cc, emissiveIntensity: 0.5 });
    const silverBarkMat = new THREE.MeshStandardMaterial({ color: 0x99aabb, roughness: 0.5, metalness: 0.3 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, emissive: 0x224466, emissiveIntensity: 0.2, roughness: 0.8 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4466aa, emissive: 0x223366, emissiveIntensity: 0.3, transparent: true, opacity: 0.5, metalness: 0.4, roughness: 0.1 });
    const willowLeafMat = new THREE.MeshStandardMaterial({ color: 0x335577, roughness: 0.4, transparent: true, opacity: 0.5 });
    const moonflowerMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, emissive: 0x8899dd, emissiveIntensity: 0.6 });
    // Silver-barked trees with luminescent bark
    for (let i = 0; i < 50; i++) {
      const tree = new THREE.Group();
      const h = 3 + Math.random() * 5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h, 23), silverBarkMat);
      trunk.position.y = h / 2; trunk.castShadow = true; tree.add(trunk);
      for (let p = 0; p < 3; p++) {
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3 + Math.random() * 0.4), glowMat);
        const angle = Math.random() * Math.PI * 2;
        patch.position.set(Math.cos(angle) * 0.15, h * 0.2 + p * h * 0.25, Math.sin(angle) * 0.15);
        patch.rotation.y = angle; tree.add(patch);
      }
      for (let c = 0; c < 3 + Math.floor(Math.random() * 2); c++) {
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.0 + Math.random() * 0.8, 23, 20), leafMat);
        canopy.position.set((Math.random()-0.5)*1.0, h + (Math.random()-0.5)*0.6, (Math.random()-0.5)*1.0);
        canopy.castShadow = true; tree.add(canopy);
      }
      for (let r = 0; r < 2; r++) {
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.0 + Math.random() * 0.8, 17), silverBarkMat);
        const ra = Math.random() * Math.PI * 2;
        root.position.set(Math.cos(ra) * 0.4, 0.1, Math.sin(ra) * 0.4);
        root.rotation.z = 0.8 + Math.random() * 0.4; root.rotation.y = ra; tree.add(root);
      }
      const tx = (Math.random()-0.5)*w*0.85, tz = (Math.random()-0.5)*d*0.85;
      tree.position.set(tx, getTerrainHeight(tx, tz, 1.2), tz);
      mctx.scene.add(tree);
    }
    // Weeping willow trees
    for (let i = 0; i < 8; i++) {
      const willow = new THREE.Group();
      const wh = 5 + Math.random() * 3;
      const wtrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, wh, 23), silverBarkMat);
      wtrunk.position.y = wh / 2; wtrunk.castShadow = true; willow.add(wtrunk);
      for (let b = 0; b < 12; b++) {
        const bAngle = (b / 12) * Math.PI * 2;
        for (let s = 0; s < 6; s++) {
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.6, 16), willowLeafMat);
          strand.position.set(Math.cos(bAngle) * (0.8 + s * 0.3), wh - s * 0.45, Math.sin(bAngle) * (0.8 + s * 0.3));
          strand.rotation.z = 0.1 * s; willow.add(strand);
        }
      }
      const wx = (Math.random()-0.5)*w*0.6, wz = (Math.random()-0.5)*d*0.6;
      willow.position.set(wx, getTerrainHeight(wx, wz, 1.2), wz);
      mctx.scene.add(willow);
    }
    // Moonflowers with petals
    for (let i = 0; i < 35; i++) {
      const flower = new THREE.Group();
      const stemH = 0.2 + Math.random() * 0.3;
      const fstem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, stemH, 17), new THREE.MeshStandardMaterial({ color: 0x446644 }));
      fstem.position.y = stemH / 2; flower.add(fstem);
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 30, 16), moonflowerMat);
        const pa = (p / 5) * Math.PI * 2;
        petal.position.set(Math.cos(pa) * 0.06, stemH + 0.02, Math.sin(pa) * 0.06);
        petal.scale.set(1, 0.4, 1); flower.add(petal);
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16), glowMat);
      center.position.y = stemH + 0.03; flower.add(center);
      const fx = (Math.random()-0.5)*w*0.8, fz = (Math.random()-0.5)*d*0.8;
      flower.position.set(fx, getTerrainHeight(fx, fz, 1.2), fz);
      mctx.scene.add(flower);
    }
    // Moonbeam shafts (translucent cylinders from above)
    for (let i = 0; i < 12; i++) {
      const beamH = 8 + Math.random() * 5;
      const beamR = 0.4 + Math.random() * 0.6;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(beamR * 0.3, beamR, beamH, 27),
        new THREE.MeshStandardMaterial({ color: 0xaabbdd, emissive: 0x667799, emissiveIntensity: 0.4, transparent: true, opacity: 0.08 }));
      const bx = (Math.random()-0.5)*w*0.7, bz = (Math.random()-0.5)*d*0.7;
      beam.position.set(bx, beamH / 2 + 1, bz); mctx.scene.add(beam);
      const spot = new THREE.Mesh(new THREE.CircleGeometry(beamR, 30), new THREE.MeshStandardMaterial({ color: 0x99aacc, emissive: 0x556688, emissiveIntensity: 0.5, transparent: true, opacity: 0.25 }));
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(bx, getTerrainHeight(bx, bz, 1.2) + 0.02, bz); mctx.scene.add(spot);
    }
    // Mushroom fairy rings
    for (let i = 0; i < 6; i++) {
      const ringX = (Math.random()-0.5)*w*0.6, ringZ = (Math.random()-0.5)*d*0.6;
      const ringR = 1.0 + Math.random() * 1.5;
      const mushCount = 8 + Math.floor(Math.random() * 6);
      for (let m = 0; m < mushCount; m++) {
        const mush = new THREE.Group();
        const mAngle = (m / mushCount) * Math.PI * 2;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12 + Math.random() * 0.08, 17), new THREE.MeshStandardMaterial({ color: 0x887788 }));
        stem.position.y = 0.06; mush.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 36, 17), glowMat);
        cap.scale.y = 0.5; cap.position.y = 0.14; mush.add(cap);
        const mmx = ringX + Math.cos(mAngle) * ringR, mmz = ringZ + Math.sin(mAngle) * ringR;
        mush.position.set(mmx, getTerrainHeight(mmx, mmz, 1.2), mmz); mctx.scene.add(mush);
      }
    }
    // Scattered mushrooms
    for (let i = 0; i < 25; i++) {
      const mush = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.15, 17), new THREE.MeshStandardMaterial({ color: 0x887788 }));
      stem.position.y = 0.075; mush.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 36, 17), glowMat);
      cap.scale.y = 0.5; cap.position.y = 0.17; mush.add(cap);
      const mx = (Math.random()-0.5)*w*0.8, mz = (Math.random()-0.5)*d*0.8;
      mush.position.set(mx, getTerrainHeight(mx, mz, 1.2), mz); mctx.scene.add(mush);
    }
    // Crystal clear ponds
    for (let i = 0; i < 5; i++) {
      const pondR = 1.5 + Math.random() * 2.5;
      const pond = new THREE.Mesh(new THREE.CircleGeometry(pondR, 44), waterMat);
      pond.rotation.x = -Math.PI / 2;
      const px = (Math.random()-0.5)*w*0.5, pz = (Math.random()-0.5)*d*0.5;
      pond.position.set(px, getTerrainHeight(px, pz, 1.2) - 0.05, pz); mctx.scene.add(pond);
      const shimmer = new THREE.Mesh(new THREE.CircleGeometry(pondR * 0.3, 27), new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0xaabbdd, emissiveIntensity: 0.6, transparent: true, opacity: 0.3 }));
      shimmer.rotation.x = -Math.PI / 2;
      shimmer.position.set(px + (Math.random()-0.5)*pondR*0.4, getTerrainHeight(px, pz, 1.2) - 0.04, pz + (Math.random()-0.5)*pondR*0.4);
      mctx.scene.add(shimmer);
      for (let l = 0; l < 3; l++) {
        const lily = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 27), new THREE.MeshStandardMaterial({ color: 0x336644, roughness: 0.6 }));
        lily.rotation.x = -Math.PI / 2;
        lily.position.set(px + (Math.random()-0.5)*pondR, getTerrainHeight(px, pz, 1.2) - 0.03, pz + (Math.random()-0.5)*pondR);
        mctx.scene.add(lily);
      }
    }
    // Owl nests in trees
    for (let i = 0; i < 6; i++) {
      const nest = new THREE.Group();
      const nestBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.1, 27), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 }));
      nest.add(nestBase);
      for (let e = 0; e < 2; e++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 30, 16), new THREE.MeshStandardMaterial({ color: 0xeeeedd }));
        egg.scale.y = 1.3; egg.position.set((Math.random()-0.5)*0.12, 0.06, (Math.random()-0.5)*0.12); nest.add(egg);
      }
      const nx = (Math.random()-0.5)*w*0.6, nz = (Math.random()-0.5)*d*0.6;
      nest.position.set(nx, getTerrainHeight(nx, nz, 1.2) + 3 + Math.random() * 3, nz); mctx.scene.add(nest);
    }
    // Silver moss patches
    for (let i = 0; i < 40; i++) {
      const moss = new THREE.Mesh(new THREE.CircleGeometry(0.2 + Math.random() * 0.4, 23), mossMat);
      moss.rotation.x = -Math.PI / 2;
      const mx = (Math.random()-0.5)*w*0.85, mz = (Math.random()-0.5)*d*0.85;
      moss.position.set(mx, getTerrainHeight(mx, mz, 1.2) + 0.01, mz); mctx.scene.add(moss);
    }
    // Moonlit stones
    for (let i = 0; i < 25; i++) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3+Math.random()*0.5, 2), moonMat);
      const sx = (Math.random()-0.5)*w*0.7, sz = (Math.random()-0.5)*d*0.7;
      stone.position.set(sx, getTerrainHeight(sx, sz, 1.2)+0.15, sz);
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true; mctx.scene.add(stone);
    }
    // Fallen logs with moss
    for (let i = 0; i < 10; i++) {
      const log = new THREE.Group();
      const logLen = 1.5 + Math.random() * 3;
      const logMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, logLen, 23), silverBarkMat);
      logMesh.rotation.z = Math.PI / 2; logMesh.position.y = 0.12; log.add(logMesh);
      for (let m = 0; m < 3; m++) {
        const mPatch = new THREE.Mesh(new THREE.SphereGeometry(0.08, 30, 16), mossMat);
        mPatch.position.set((Math.random()-0.5)*logLen*0.6, 0.2, (Math.random()-0.5)*0.1);
        mPatch.scale.y = 0.4; log.add(mPatch);
      }
      const lx = (Math.random()-0.5)*w*0.7, lz = (Math.random()-0.5)*d*0.7;
      log.position.set(lx, getTerrainHeight(lx, lz, 1.2), lz);
      log.rotation.y = Math.random() * Math.PI; mctx.scene.add(log);
    }
    // Fireflies with glow spheres
    for (let i = 0; i < 12; i++) {
      const flyGroup = new THREE.Group();
      flyGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16), new THREE.MeshStandardMaterial({ color: 0xccffcc, emissive: 0x88ff88, emissiveIntensity: 2.0 })));
      const fly = new THREE.PointLight(0x88ccaa, 0.4, 6);
      flyGroup.add(fly);
      flyGroup.position.set((Math.random()-0.5)*w*0.7, 0.5+Math.random()*4, (Math.random()-0.5)*d*0.7);
      mctx.scene.add(flyGroup); mctx.torchLights.push(fly);
    }
    // Flower patches
    for (let i = 0; i < 30; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 17, 16), new THREE.MeshStandardMaterial({ color: [0xcc88ff, 0x88aaff, 0xffffff][i%3], emissive: 0x4444aa, emissiveIntensity: 0.3 }));
      const fx = (Math.random()-0.5)*w*0.8, fz = (Math.random()-0.5)*d*0.8;
      fl.position.set(fx, getTerrainHeight(fx, fz, 1.2)+0.08, fz); mctx.scene.add(fl);
    }
    // Fern clusters
    for (let i = 0; i < 20; i++) {
      const fern = new THREE.Group();
      for (let f = 0; f < 4; f++) {
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x224433, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
        frond.rotation.y = f * Math.PI / 2; frond.rotation.x = -0.3; frond.position.y = 0.2; fern.add(frond);
      }
      const fx = (Math.random()-0.5)*w*0.8, fz = (Math.random()-0.5)*d*0.8;
      fern.position.set(fx, getTerrainHeight(fx, fz, 1.2), fz); mctx.scene.add(fern);
    }
    // Ground mist
    for (let i = 0; i < 15; i++) {
      const mist = new THREE.Mesh(new THREE.CircleGeometry(1.5 + Math.random() * 2.5, 27),
        new THREE.MeshStandardMaterial({ color: 0x8899cc, emissive: 0x334466, emissiveIntensity: 0.2, transparent: true, opacity: 0.06 }));
      mist.rotation.x = -Math.PI / 2;
      const mx = (Math.random()-0.5)*w*0.7, mz = (Math.random()-0.5)*d*0.7;
      mist.position.set(mx, getTerrainHeight(mx, mz, 1.2) + 0.15, mz); mctx.scene.add(mist);
    }
    // ── Glowing moonflower petal detail ──
    for (let i = 0; i < 20; i++) {
      const petalGrp = new THREE.Group();
      const petalCount = 7 + Math.floor(Math.random() * 4);
      for (let p = 0; p < petalCount; p++) {
        const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x99aadd, emissiveIntensity: 0.9, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        const pa = (p / petalCount) * Math.PI * 2;
        petal.position.set(Math.cos(pa) * 0.09, 0, Math.sin(pa) * 0.09);
        petal.rotation.set(-0.4, pa, 0); petalGrp.add(petal);
      }
      const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 17, 16), new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xddcc66, emissiveIntensity: 1.2 }));
      petalGrp.add(pistil);
      const pfx = (Math.random()-0.5)*w*0.75, pfz = (Math.random()-0.5)*d*0.75;
      petalGrp.position.set(pfx, getTerrainHeight(pfx, pfz, 1.2) + 0.25 + Math.random() * 0.15, pfz);
      mctx.scene.add(petalGrp);
    }
    // ── Firefly clusters (tiny emissive spheres in groups) ──
    for (let i = 0; i < 10; i++) {
      const cluster = new THREE.Group();
      const count = 5 + Math.floor(Math.random() * 6);
      for (let f = 0; f < count; f++) {
        const fly = new THREE.Mesh(new THREE.SphereGeometry(0.012 + Math.random() * 0.008, 16, 8), new THREE.MeshStandardMaterial({ color: 0xeeffaa, emissive: 0xaaff44, emissiveIntensity: 2.5 }));
        fly.position.set((Math.random()-0.5)*1.2, (Math.random()-0.5)*0.8, (Math.random()-0.5)*1.2);
        cluster.add(fly);
      }
      cluster.position.set((Math.random()-0.5)*w*0.7, 1.0 + Math.random()*3.5, (Math.random()-0.5)*d*0.7);
      mctx.scene.add(cluster);
    }
    // ── Ancient druid stone circles ──
    for (let i = 0; i < 4; i++) {
      const circleX = (Math.random()-0.5)*w*0.5, circleZ = (Math.random()-0.5)*d*0.5;
      const circleR = 2.0 + Math.random() * 1.5;
      const stoneCount = 8 + Math.floor(Math.random() * 4);
      for (let s = 0; s < stoneCount; s++) {
        const sAngle = (s / stoneCount) * Math.PI * 2;
        const stoneH = 0.8 + Math.random() * 1.2;
        const standing = new THREE.Mesh(new THREE.BoxGeometry(0.25 + Math.random() * 0.15, stoneH, 0.12 + Math.random() * 0.1), moonMat);
        const sx2 = circleX + Math.cos(sAngle) * circleR, sz2 = circleZ + Math.sin(sAngle) * circleR;
        standing.position.set(sx2, getTerrainHeight(sx2, sz2, 1.2) + stoneH / 2, sz2);
        standing.rotation.y = sAngle + Math.PI / 2;
        standing.rotation.z = (Math.random()-0.5)*0.1;
        standing.castShadow = true; mctx.scene.add(standing);
      }
      const capA1 = 0, capA2 = (1 / stoneCount) * Math.PI * 2;
      const capstone = new THREE.Mesh(new THREE.BoxGeometry(circleR * 0.4, 0.15, 0.3), moonMat);
      capstone.position.set(circleX + Math.cos((capA1+capA2)/2)*circleR, getTerrainHeight(circleX, circleZ, 1.2) + 1.6, circleZ + Math.sin((capA1+capA2)/2)*circleR);
      capstone.rotation.y = (capA1+capA2)/2 + Math.PI/2; mctx.scene.add(capstone);
    }
    // ── Silvery vine tendrils hanging from trees ──
    for (let i = 0; i < 25; i++) {
      const vine = new THREE.Group();
      const vineLen = 1.5 + Math.random() * 2.5;
      for (let s = 0; s < 5; s++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, vineLen / 5, 16), new THREE.MeshStandardMaterial({ color: 0xaabbcc, emissive: 0x445566, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 }));
        seg.position.y = -s * vineLen / 5;
        seg.rotation.z = Math.sin(s * 1.2) * 0.15; vine.add(seg);
        if (s > 0 && Math.random() > 0.4) {
          const tinyLeaf = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x88aacc, emissive: 0x446688, emissiveIntensity: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
          tinyLeaf.position.set(0.03, -s * vineLen / 5, 0); vine.add(tinyLeaf);
        }
      }
      const vx = (Math.random()-0.5)*w*0.8, vz = (Math.random()-0.5)*d*0.8;
      vine.position.set(vx, getTerrainHeight(vx, vz, 1.2) + 3 + Math.random() * 4, vz);
      mctx.scene.add(vine);
    }

    // ── Dense ground grass ──
    const groveGrassShades = [
      new THREE.MeshStandardMaterial({ color: 0x336644, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x447755, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x2a5533, roughness: 0.65, side: THREE.DoubleSide }),
    ];
    for (let gi = 0; gi < 150; gi++) {
      const grassClump = new THREE.Group();
      const bladeCount = 5 + Math.floor(Math.random() * 6);
      for (let bl = 0; bl < bladeCount; bl++) {
        const bladeH = 0.3 + Math.random() * 0.2;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05 + Math.random() * 0.03, bladeH),
          groveGrassShades[Math.floor(Math.random() * 3)],
        );
        blade.position.set((Math.random() - 0.5) * 0.3, bladeH / 2, (Math.random() - 0.5) * 0.3);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        grassClump.add(blade);
      }
      const gx = (Math.random() - 0.5) * w * 0.9;
      const gz = (Math.random() - 0.5) * d * 0.9;
      grassClump.position.set(gx, getTerrainHeight(gx, gz, 1.2), gz);
      mctx.scene.add(grassClump);
    }
    // ── Ancient druid stone circles (detailed) ──
    for (let i = 0; i < 3; i++) {
      const scX = (Math.random()-0.5)*w*0.5, scZ = (Math.random()-0.5)*d*0.5;
      const scR = 2.5 + Math.random() * 1.5;
      const stoneN = 8 + Math.floor(Math.random() * 5);
      for (let s = 0; s < stoneN; s++) {
        const sA = (s / stoneN) * Math.PI * 2;
        const sH = 1.2 + Math.random() * 1.0;
        const standing = new THREE.Mesh(new THREE.BoxGeometry(0.3 + Math.random() * 0.2, sH, 0.15 + Math.random() * 0.1), moonMat);
        const stX = scX + Math.cos(sA) * scR, stZ = scZ + Math.sin(sA) * scR;
        standing.position.set(stX, getTerrainHeight(stX, stZ, 1.2) + sH / 2, stZ);
        standing.rotation.y = sA + Math.PI / 2;
        standing.rotation.z = (Math.random()-0.5)*0.08;
        standing.castShadow = true; mctx.scene.add(standing);
        // Moss/lichen patches on stones
        for (let lp = 0; lp < 2; lp++) {
          const lichen = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.06, 16), mossMat);
          lichen.position.set(stX + (Math.random()-0.5)*0.1, getTerrainHeight(stX, stZ, 1.2) + sH * (0.3 + Math.random()*0.4), stZ + (Math.random()-0.5)*0.1);
          lichen.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(lichen);
        }
        // Capstones on some pairs
        if (s % 3 === 0 && s + 1 < stoneN) {
          const nA = ((s+1) / stoneN) * Math.PI * 2;
          const capX = scX + Math.cos((sA+nA)/2) * scR;
          const capZ = scZ + Math.sin((sA+nA)/2) * scR;
          const cap = new THREE.Mesh(new THREE.BoxGeometry(scR * 0.35, 0.15, 0.3), moonMat);
          cap.position.set(capX, getTerrainHeight(capX, capZ, 1.2) + sH + 0.1, capZ);
          cap.rotation.y = (sA+nA)/2 + Math.PI/2; mctx.scene.add(cap);
        }
      }
    }
    // ── Moonflower bushes ──
    for (let i = 0; i < 10; i++) {
      const bush = new THREE.Group();
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 20, 16), leafMat);
      canopy.position.y = 0.4; bush.add(canopy);
      for (let f = 0; f < 6 + Math.floor(Math.random()*4); f++) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random()*0.02, 16, 8), moonflowerMat);
        const fA = Math.random() * Math.PI * 2, fPhi = Math.random() * Math.PI * 0.6;
        flower.position.set(Math.cos(fA)*Math.sin(fPhi)*0.5, 0.4 + Math.cos(fPhi)*0.4, Math.sin(fA)*Math.sin(fPhi)*0.5);
        bush.add(flower);
      }
      const bLight = new THREE.PointLight(0xeeeeff, 0.2, 4);
      bLight.position.y = 0.5; bush.add(bLight); mctx.torchLights.push(bLight);
      const bx = (Math.random()-0.5)*w*0.7, bz = (Math.random()-0.5)*d*0.7;
      bush.position.set(bx, getTerrainHeight(bx, bz, 1.2), bz); mctx.scene.add(bush);
    }
    // ── Firefly swarms ──
    for (let i = 0; i < 12; i++) {
      const swarm = new THREE.Group();
      const flyCount = 8 + Math.floor(Math.random() * 8);
      for (let f = 0; f < flyCount; f++) {
        const fly = new THREE.Mesh(new THREE.SphereGeometry(0.01 + Math.random()*0.008, 8, 6),
          new THREE.MeshStandardMaterial({ color: [0xeeffaa, 0xccffcc][f%2], emissive: [0xaaff44, 0x88ff88][f%2], emissiveIntensity: 2.5 }));
        fly.position.set((Math.random()-0.5)*1.5, (Math.random()-0.5)*1.2, (Math.random()-0.5)*1.5);
        swarm.add(fly);
      }
      swarm.position.set((Math.random()-0.5)*w*0.7, 1.0 + Math.random()*3.0, (Math.random()-0.5)*d*0.7);
      mctx.scene.add(swarm);
    }
    // ── Silver birch trees ──
    for (let i = 0; i < 8; i++) {
      const birch = new THREE.Group();
      const bH = 4 + Math.random() * 3;
      const birchBarkMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.5, metalness: 0.1 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, bH, 20), birchBarkMat);
      trunk.position.y = bH / 2; trunk.castShadow = true; birch.add(trunk);
      // Peeling bark detail
      for (let p = 0; p < 4; p++) {
        const peel = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.15 + Math.random()*0.1),
          new THREE.MeshStandardMaterial({ color: 0xeeeeDD, roughness: 0.4, side: THREE.DoubleSide }));
        const pAngle = Math.random() * Math.PI * 2;
        peel.position.set(Math.cos(pAngle)*0.1, bH * (0.2 + Math.random()*0.5), Math.sin(pAngle)*0.1);
        peel.rotation.set(0.2, pAngle, 0.3 + Math.random()*0.2); birch.add(peel);
      }
      // Silver-green leaf canopy
      const silverLeafMat = new THREE.MeshStandardMaterial({ color: 0x88aa88, roughness: 0.5, transparent: true, opacity: 0.7, metalness: 0.2 });
      for (let c = 0; c < 3; c++) {
        const can = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random()*0.5, 20, 16), silverLeafMat);
        can.position.set((Math.random()-0.5)*0.6, bH + (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.6);
        can.castShadow = true; birch.add(can);
      }
      const bx = (Math.random()-0.5)*w*0.75, bz = (Math.random()-0.5)*d*0.75;
      birch.position.set(bx, getTerrainHeight(bx, bz, 1.2), bz); mctx.scene.add(birch);
    }
    // ── Fairy ring mushrooms ──
    for (let i = 0; i < 6; i++) {
      const frX = (Math.random()-0.5)*w*0.6, frZ = (Math.random()-0.5)*d*0.6;
      const frR = 0.6 + Math.random() * 0.8;
      const frCount = 10 + Math.floor(Math.random() * 6);
      for (let m = 0; m < frCount; m++) {
        const mA = (m / frCount) * Math.PI * 2;
        const mush = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.08 + Math.random()*0.05, 12), new THREE.MeshStandardMaterial({ color: 0x887788 }));
        stem.position.y = 0.04; mush.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random()*0.02, 16, 12), glowMat);
        cap.scale.y = 0.5; cap.position.y = 0.1; mush.add(cap);
        const mx = frX + Math.cos(mA) * frR, mz = frZ + Math.sin(mA) * frR;
        mush.position.set(mx, getTerrainHeight(mx, mz, 1.2), mz); mctx.scene.add(mush);
      }
    }
    // ── Moonlit pools ──
    for (let i = 0; i < 4; i++) {
      const poolR = 1.0 + Math.random() * 1.5;
      const px = (Math.random()-0.5)*w*0.5, pz = (Math.random()-0.5)*d*0.5;
      const poolSurface = new THREE.Mesh(new THREE.CircleGeometry(poolR, 36),
        new THREE.MeshStandardMaterial({ color: 0x8899bb, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.5 }));
      poolSurface.rotation.x = -Math.PI / 2;
      poolSurface.position.set(px, getTerrainHeight(px, pz, 1.2) - 0.04, pz); mctx.scene.add(poolSurface);
      // Moss ring around pool
      const mossRing = new THREE.Mesh(new THREE.TorusGeometry(poolR + 0.1, 0.15, 8, 32), mossMat);
      mossRing.rotation.x = -Math.PI / 2;
      mossRing.position.set(px, getTerrainHeight(px, pz, 1.2) + 0.01, pz); mctx.scene.add(mossRing);
      // Moonbeam shaft from above
      const moonShaft = new THREE.Mesh(new THREE.CylinderGeometry(poolR * 0.4, poolR * 0.8, 10, 20),
        new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x8899cc, emissiveIntensity: 0.3, transparent: true, opacity: 0.05 }));
      moonShaft.position.set(px, 5, pz); mctx.scene.add(moonShaft);
    }
    // ── Ancient tree stumps with carvings ──
    for (let i = 0; i < 5; i++) {
      const stump = new THREE.Group();
      const stumpR = 0.3 + Math.random() * 0.3;
      const stumpH = 0.3 + Math.random() * 0.2;
      const stumpBody = new THREE.Mesh(new THREE.CylinderGeometry(stumpR, stumpR + 0.05, stumpH, 20), silverBarkMat);
      stumpBody.position.y = stumpH / 2; stump.add(stumpBody);
      // Spiral carving groove on top
      for (let g = 0; g < 3; g++) {
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, stumpR * 0.6),
          new THREE.MeshStandardMaterial({ color: 0x2a2a22, roughness: 0.9 }));
        groove.position.set(0, stumpH + 0.01, 0);
        groove.rotation.y = g * Math.PI / 3; stump.add(groove);
      }
      // Moss covering portions
      const stumpMoss = new THREE.Mesh(new THREE.SphereGeometry(stumpR * 0.6, 16, 12), mossMat);
      stumpMoss.scale.y = 0.3;
      stumpMoss.position.set((Math.random()-0.5)*stumpR*0.5, stumpH + 0.02, (Math.random()-0.5)*stumpR*0.5);
      stump.add(stumpMoss);
      const stX = (Math.random()-0.5)*w*0.7, stZ = (Math.random()-0.5)*d*0.7;
      stump.position.set(stX, getTerrainHeight(stX, stZ, 1.2), stZ); mctx.scene.add(stump);
    }
    // ── Glowing crystal outcrops ──
    for (let i = 0; i < 8; i++) {
      const crystalGroup = new THREE.Group();
      const crystalMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x8899cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
      const crystalCount = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < crystalCount; c++) {
        const cH = 0.15 + Math.random() * 0.25;
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.03 + Math.random()*0.03, cH, 6), crystalMat);
        crystal.position.set((Math.random()-0.5)*0.2, cH / 2, (Math.random()-0.5)*0.2);
        crystal.rotation.set((Math.random()-0.5)*0.3, 0, (Math.random()-0.5)*0.3);
        crystalGroup.add(crystal);
      }
      const cLight = new THREE.PointLight(0xaabbdd, 0.2, 3);
      cLight.position.y = 0.15; crystalGroup.add(cLight); mctx.torchLights.push(cLight);
      const cx = (Math.random()-0.5)*w*0.7, cz = (Math.random()-0.5)*d*0.7;
      crystalGroup.position.set(cx, getTerrainHeight(cx, cz, 1.2), cz); mctx.scene.add(crystalGroup);
    }
}

export function buildCoralDepths(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x0a2233, 0.02);
    mctx.applyTerrainColors(0x0a2a3a, 0x1a3a4a, 0.8);
    mctx.dirLight.color.setHex(0x44aacc);
    mctx.dirLight.intensity = 0.6;
    mctx.ambientLight.color.setHex(0x113344);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x337788);
    mctx.hemiLight.groundColor.setHex(0x0a1a22);

    const coralColors = [0xff4466, 0xff8844, 0xffcc44, 0xcc44ff, 0x44ccff, 0xff66aa, 0x44aaff];
    const kelpMat = new THREE.MeshStandardMaterial({ color: 0x226633, roughness: 0.5 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4, metalness: 0.2 });
    const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.25 });
    const shipWoodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    // Branching coral formations
    for (let i = 0; i < 45; i++) {
      const coral = new THREE.Group();
      const color = coralColors[i % coralColors.length];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      for (let b = 0; b < 3 + Math.floor(Math.random()*4); b++) {
        const bH = 0.5 + Math.random() * 1.2;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, bH, 20), mat);
        branch.position.set((Math.random()-0.5)*0.5, bH*0.4+Math.random()*0.3, (Math.random()-0.5)*0.5);
        branch.rotation.set((Math.random()-0.5)*0.6, 0, (Math.random()-0.5)*0.6);
        branch.castShadow = true; coral.add(branch);
        // Sub-branches on larger corals
        if (Math.random() > 0.5) {
          const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, bH*0.5, 17), mat);
          sub.position.set((Math.random()-0.5)*0.15, bH*0.3, (Math.random()-0.5)*0.15);
          sub.rotation.set((Math.random()-0.5)*0.8, 0, (Math.random()-0.5)*0.8);
          branch.add(sub);
        }
      }
      const cx = (Math.random()-0.5)*w*0.85, cz = (Math.random()-0.5)*d*0.85;
      coral.position.set(cx, getTerrainHeight(cx, cz, 0.8), cz); mctx.scene.add(coral);
    }
    // Brain corals (round, textured)
    for (let i = 0; i < 12; i++) {
      const brain = new THREE.Mesh(new THREE.SphereGeometry(0.3+Math.random()*0.5, 27, 23),
        new THREE.MeshStandardMaterial({ color: coralColors[i%coralColors.length], roughness: 0.8 }));
      brain.scale.y = 0.6;
      const bx = (Math.random()-0.5)*w*0.7, bz = (Math.random()-0.5)*d*0.7;
      brain.position.set(bx, getTerrainHeight(bx, bz, 0.8)+0.15, bz); mctx.scene.add(brain);
    }
    // Sea anemones (clusters of tentacle-like cylinders)
    for (let i = 0; i < 20; i++) {
      const anemone = new THREE.Group();
      const aBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.1, 27),
        new THREE.MeshStandardMaterial({ color: 0xaa3366, roughness: 0.5 }));
      anemone.add(aBase);
      const tentCount = 8 + Math.floor(Math.random()*6);
      const aColor = [0xff66aa, 0xaa44ff, 0xff8844, 0x44ccaa][i%4];
      for (let t = 0; t < tentCount; t++) {
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.2+Math.random()*0.15, 17),
          new THREE.MeshStandardMaterial({ color: aColor, emissive: aColor, emissiveIntensity: 0.2 }));
        const tA = (t / tentCount) * Math.PI * 2;
        tent.position.set(Math.cos(tA)*0.1, 0.12, Math.sin(tA)*0.1);
        tent.rotation.x = (Math.random()-0.5)*0.4; tent.rotation.z = (Math.random()-0.5)*0.4;
        anemone.add(tent);
      }
      const ax = (Math.random()-0.5)*w*0.75, az = (Math.random()-0.5)*d*0.75;
      anemone.position.set(ax, getTerrainHeight(ax, az, 0.8), az); mctx.scene.add(anemone);
    }
    // Kelp forests (taller, with leaf blades)
    for (let i = 0; i < 35; i++) {
      const kelp = new THREE.Group();
      const kh = 2+Math.random()*5;
      for (let s = 0; s < 7; s++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, kh/7, 17), kelpMat);
        seg.position.y = s * kh/7; seg.rotation.z = Math.sin(s*0.8)*0.15; kelp.add(seg);
        if (s > 1 && Math.random() > 0.4) {
          const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.3), new THREE.MeshStandardMaterial({ color: 0x338844, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
          blade.position.set(0.08, s*kh/7, 0); blade.rotation.z = 0.3; kelp.add(blade);
        }
      }
      const kx = (Math.random()-0.5)*w*0.8, kz = (Math.random()-0.5)*d*0.8;
      kelp.position.set(kx, getTerrainHeight(kx, kz, 0.8), kz); mctx.scene.add(kelp);
    }
    // Sea fans (flat fan-shaped coral)
    for (let i = 0; i < 15; i++) {
      const fan = new THREE.Mesh(new THREE.CircleGeometry(0.4+Math.random()*0.6, 27),
        new THREE.MeshStandardMaterial({ color: [0xff4488, 0xcc66ff, 0xff8844][i%3], side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
      const fx = (Math.random()-0.5)*w*0.7, fz = (Math.random()-0.5)*d*0.7;
      fan.position.set(fx, getTerrainHeight(fx, fz, 0.8)+0.4+Math.random()*0.5, fz);
      fan.rotation.y = Math.random()*Math.PI; fan.rotation.x = -0.1; mctx.scene.add(fan);
    }
    // Sunken ship remains
    for (let i = 0; i < 2; i++) {
      const ship = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 1.2), shipWoodMat);
      hull.position.y = 0.4; hull.castShadow = true; ship.add(hull);
      const keel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 0.3), shipWoodMat);
      keel.position.y = -0.2; ship.add(keel);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 20), shipWoodMat);
      mast.position.set(0, 1.8, 0); mast.rotation.z = 0.3; ship.add(mast);
      // Broken planks
      for (let p = 0; p < 4; p++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.8+Math.random()*0.5, 0.05, 0.15), shipWoodMat);
        plank.position.set((Math.random()-0.5)*3, Math.random()*0.3, 1+Math.random()*1.5);
        plank.rotation.set(Math.random()*0.3, Math.random(), Math.random()*0.3); ship.add(plank);
      }
      const sx = (Math.random()-0.5)*w*0.4, sz = (Math.random()-0.5)*d*0.4;
      ship.position.set(sx, getTerrainHeight(sx, sz, 0.8)-0.3, sz);
      ship.rotation.y = Math.random()*Math.PI; ship.rotation.z = (Math.random()-0.5)*0.3;
      mctx.scene.add(ship);
    }
    // Treasure chests
    for (let i = 0; i < 4; i++) {
      const chest = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 }));
      box.position.y = 0.125; chest.add(box);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 }));
      lid.position.y = 0.29; chest.add(lid);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.34), new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.6 }));
      band.position.y = 0.15; chest.add(band);
      const chx = (Math.random()-0.5)*w*0.5, chz = (Math.random()-0.5)*d*0.5;
      chest.position.set(chx, getTerrainHeight(chx, chz, 0.8), chz);
      chest.rotation.y = Math.random()*Math.PI; mctx.scene.add(chest);
    }
    // Sea shells
    for (let i = 0; i < 25; i++) {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.06+Math.random()*0.08, 23, 17), shellMat);
      shell.scale.y = 0.4;
      const shx = (Math.random()-0.5)*w*0.8, shz = (Math.random()-0.5)*d*0.8;
      shell.position.set(shx, getTerrainHeight(shx, shz, 0.8)+0.03, shz); mctx.scene.add(shell);
    }
    // Bubble columns
    for (let i = 0; i < 8; i++) {
      const bcX = (Math.random()-0.5)*w*0.6, bcZ = (Math.random()-0.5)*d*0.6;
      for (let b = 0; b < 8; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.02+Math.random()*0.04, 20, 17), bubbleMat);
        bubble.position.set(bcX+(Math.random()-0.5)*0.2, getTerrainHeight(bcX, bcZ, 0.8)+0.3+b*0.5+Math.random()*0.3, bcZ+(Math.random()-0.5)*0.2);
        mctx.scene.add(bubble);
      }
    }
    // Bioluminescent jellyfish forms
    for (let i = 0; i < 10; i++) {
      const jelly = new THREE.Group();
      const jellyColor = [0x44ffcc, 0xff44aa, 0x8844ff, 0x44aaff][i%4];
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.2+Math.random()*0.15, 23, 20),
        new THREE.MeshStandardMaterial({ color: jellyColor, emissive: jellyColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 }));
      bell.scale.y = 0.6; jelly.add(bell);
      for (let t = 0; t < 6; t++) {
        const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.01, 0.4+Math.random()*0.3, 16),
          new THREE.MeshStandardMaterial({ color: jellyColor, emissive: jellyColor, emissiveIntensity: 0.3, transparent: true, opacity: 0.3 }));
        tentacle.position.set((Math.random()-0.5)*0.15, -0.25-Math.random()*0.15, (Math.random()-0.5)*0.15);
        jelly.add(tentacle);
      }
      jelly.position.set((Math.random()-0.5)*w*0.6, 1.5+Math.random()*4, (Math.random()-0.5)*d*0.6);
      mctx.scene.add(jelly);
      const jLight = new THREE.PointLight(jellyColor, 0.3, 5);
      jLight.position.copy(jelly.position); mctx.scene.add(jLight); mctx.torchLights.push(jLight);
    }
    // Sandy patches on ocean floor
    for (let i = 0; i < 20; i++) {
      const sand = new THREE.Mesh(new THREE.CircleGeometry(0.5+Math.random()*1.5, 27), sandMat);
      sand.rotation.x = -Math.PI / 2;
      const sx = (Math.random()-0.5)*w*0.8, sz = (Math.random()-0.5)*d*0.8;
      sand.position.set(sx, getTerrainHeight(sx, sz, 0.8)+0.01, sz); mctx.scene.add(sand);
    }
    // Sea floor rocks
    for (let i = 0; i < 20; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4+Math.random()*0.6, 2), new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.9 }));
      const rx = (Math.random()-0.5)*w*0.8, rz = (Math.random()-0.5)*d*0.8;
      rock.position.set(rx, getTerrainHeight(rx, rz, 0.8)+0.1, rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(rock);
    }
    // Underwater light rays
    for (let i = 0; i < 6; i++) {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 10, 23),
        new THREE.MeshStandardMaterial({ color: 0x44aacc, emissive: 0x226688, emissiveIntensity: 0.3, transparent: true, opacity: 0.04 }));
      ray.position.set((Math.random()-0.5)*w*0.5, 5, (Math.random()-0.5)*d*0.5);
      ray.rotation.z = (Math.random()-0.5)*0.3; mctx.scene.add(ray);
    }
    // ── Detailed branching coral trees ──
    for (let i = 0; i < 12; i++) {
      const coralTree = new THREE.Group();
      const trunkH = 0.8 + Math.random() * 1.2;
      const cColor = coralColors[i % coralColors.length];
      const cMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.5 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, trunkH, 17), cMat);
      trunk.position.y = trunkH / 2; coralTree.add(trunk);
      for (let b = 0; b < 4 + Math.floor(Math.random() * 3); b++) {
        const bLen = 0.3 + Math.random() * 0.5;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, bLen, 16), cMat);
        branch.position.set((Math.random()-0.5)*0.15, trunkH * 0.4 + b * 0.15, (Math.random()-0.5)*0.15);
        branch.rotation.set((Math.random()-0.5)*0.8, 0, (Math.random()-0.5)*0.8); coralTree.add(branch);
        for (let t = 0; t < 2; t++) {
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 16, 8), cMat);
          tip.position.copy(branch.position); tip.position.y += bLen * 0.4; coralTree.add(tip);
        }
      }
      const ctx = (Math.random()-0.5)*w*0.7, ctz = (Math.random()-0.5)*d*0.7;
      coralTree.position.set(ctx, getTerrainHeight(ctx, ctz, 0.8), ctz); mctx.scene.add(coralTree);
    }
    // ── Pearl-bearing clam shells ──
    for (let i = 0; i < 10; i++) {
      const clam = new THREE.Group();
      const shellR = 0.1 + Math.random() * 0.08;
      const bottom = new THREE.Mesh(new THREE.SphereGeometry(shellR, 20, 17, 0, Math.PI * 2, 0, Math.PI * 0.5), shellMat);
      bottom.rotation.x = Math.PI; clam.add(bottom);
      const top = new THREE.Mesh(new THREE.SphereGeometry(shellR, 20, 17, 0, Math.PI * 2, 0, Math.PI * 0.5), shellMat);
      top.position.y = shellR * 0.3; top.rotation.x = -0.4; clam.add(top);
      if (Math.random() > 0.4) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(shellR * 0.25, 20, 17), new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xddccbb, emissiveIntensity: 0.3, metalness: 0.4, roughness: 0.2 }));
        pearl.position.y = shellR * 0.05; clam.add(pearl);
      }
      const clx = (Math.random()-0.5)*w*0.6, clz = (Math.random()-0.5)*d*0.6;
      clam.position.set(clx, getTerrainHeight(clx, clz, 0.8) + 0.02, clz);
      clam.rotation.y = Math.random() * Math.PI; mctx.scene.add(clam);
    }
    // ── Shipwreck debris (scattered planks, rope, anchor) ──
    for (let i = 0; i < 15; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12 + Math.random() * 0.2, 0.03, 0.6 + Math.random() * 0.8), shipWoodMat);
      const plx = (Math.random()-0.5)*w*0.7, plz = (Math.random()-0.5)*d*0.7;
      plank.position.set(plx, getTerrainHeight(plx, plz, 0.8) + 0.02, plz);
      plank.rotation.set(Math.random()*0.2, Math.random()*Math.PI, Math.random()*0.2); mctx.scene.add(plank);
    }
    for (let i = 0; i < 3; i++) {
      const anchor = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 17), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.6 }));
      anchor.add(shaft);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.6 }));
      bar.rotation.z = Math.PI / 2; bar.position.y = -0.25; anchor.add(bar);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 17, 20), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.6 }));
      ring.position.y = 0.35; anchor.add(ring);
      const anx = (Math.random()-0.5)*w*0.5, anz = (Math.random()-0.5)*d*0.5;
      anchor.position.set(anx, getTerrainHeight(anx, anz, 0.8) + 0.1, anz);
      anchor.rotation.set(Math.random()*0.3, Math.random()*Math.PI, Math.random()*0.5); mctx.scene.add(anchor);
    }
    // ── Coral reef walls ──
    for (let i = 0; i < 6; i++) {
      const reefWall = new THREE.Group();
      // Branching coral arrangement (cylinder trees with sphere tips)
      for (let b = 0; b < 5 + Math.floor(Math.random()*3); b++) {
        const bColor = [0xff6688, 0xff9955, 0xbb55dd][b % 3];
        const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.6 });
        const bH = 0.6 + Math.random() * 1.0;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, bH, 16), bMat);
        branch.position.set((Math.random()-0.5)*1.5, bH / 2, (Math.random()-0.5)*0.5);
        branch.rotation.set((Math.random()-0.5)*0.4, 0, (Math.random()-0.5)*0.4);
        reefWall.add(branch);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random()*0.03, 12, 8), bMat);
        tip.position.set(branch.position.x, bH + 0.02, branch.position.z); reefWall.add(tip);
      }
      // Fan coral (flat plane circles with vein detail)
      for (let fc = 0; fc < 2; fc++) {
        const fanMat = new THREE.MeshStandardMaterial({ color: [0xff4488, 0xcc66ff][fc % 2], side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        const fan = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random()*0.4, 24), fanMat);
        fan.position.set((Math.random()-0.5)*1.2, 0.4 + Math.random()*0.6, (Math.random()-0.5)*0.3);
        fan.rotation.y = Math.random() * Math.PI; fan.rotation.x = -0.1; reefWall.add(fan);
        // Vein lines on fan
        for (let v = 0; v < 3; v++) {
          const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.25, 8), fanMat);
          vein.position.copy(fan.position);
          vein.rotation.set(Math.random()*0.3, Math.random()*Math.PI, Math.PI/2 + (Math.random()-0.5)*0.4);
          reefWall.add(vein);
        }
      }
      // Brain coral (large textured spheres)
      const brainMat = new THREE.MeshStandardMaterial({ color: coralColors[i % coralColors.length], roughness: 0.8 });
      const brain = new THREE.Mesh(new THREE.SphereGeometry(0.25 + Math.random()*0.3, 24, 20), brainMat);
      brain.scale.y = 0.6; brain.position.set((Math.random()-0.5)*0.8, 0.15, (Math.random()-0.5)*0.3);
      reefWall.add(brain);
      const rwx = (Math.random()-0.5)*w*0.7, rwz = (Math.random()-0.5)*d*0.7;
      reefWall.position.set(rwx, getTerrainHeight(rwx, rwz, 0.8), rwz);
      reefWall.rotation.y = Math.random() * Math.PI; mctx.scene.add(reefWall);
    }
    // ── Underwater current indicators ──
    for (let i = 0; i < 10; i++) {
      const current = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3 + Math.random()*4, 12),
        new THREE.MeshStandardMaterial({ color: 0x4488cc, emissive: 0x224466, emissiveIntensity: 0.2, transparent: true, opacity: 0.12 }));
      current.rotation.z = Math.PI / 2;
      current.rotation.y = Math.random() * Math.PI;
      current.position.set((Math.random()-0.5)*w*0.7, 0.8 + Math.random()*3, (Math.random()-0.5)*d*0.7);
      mctx.scene.add(current);
    }
    // ── Sunken treasure scattered ──
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.7, roughness: 0.3 });
    const gemColors = [0xff2244, 0x2244ff, 0x22ff44, 0xffff22, 0xff44ff];
    for (let i = 0; i < 15; i++) {
      const tx = (Math.random()-0.5)*w*0.7, tz = (Math.random()-0.5)*d*0.7;
      const tY = getTerrainHeight(tx, tz, 0.8) + 0.02;
      if (i < 6) {
        // Gold coins
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.005, 16), goldMat);
        coin.rotation.x = Math.PI / 2 + (Math.random()-0.5)*0.3;
        coin.position.set(tx, tY, tz); mctx.scene.add(coin);
      } else if (i < 11) {
        // Gem icosahedrons
        const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02 + Math.random()*0.015, 0),
          new THREE.MeshStandardMaterial({ color: gemColors[i % gemColors.length], emissive: gemColors[i % gemColors.length], emissiveIntensity: 0.3, metalness: 0.3 }));
        gem.position.set(tx, tY + 0.01, tz); mctx.scene.add(gem);
      } else {
        // Goblet cylinders lying on floor
        const goblet = new THREE.Group();
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.05, 12), goldMat);
        goblet.add(cup);
        const gobletBase = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.015, 12), goldMat);
        gobletBase.position.y = -0.03; goblet.add(gobletBase);
        goblet.position.set(tx, tY + 0.02, tz);
        goblet.rotation.z = Math.PI / 2 + (Math.random()-0.5)*0.3; mctx.scene.add(goblet);
      }
    }
    // ── Sea urchin props ──
    for (let i = 0; i < 10; i++) {
      const urchin = new THREE.Group();
      const urchinMat = new THREE.MeshStandardMaterial({ color: 0x331144, roughness: 0.7 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random()*0.03, 16, 12), urchinMat);
      urchin.add(body);
      for (let s = 0; s < 18; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.08 + Math.random()*0.04, 6), urchinMat);
        const phi = Math.random() * Math.PI;
        const theta = Math.random() * Math.PI * 2;
        spine.position.set(Math.sin(phi)*Math.cos(theta)*0.06, Math.cos(phi)*0.06, Math.sin(phi)*Math.sin(theta)*0.06);
        spine.lookAt(spine.position.clone().multiplyScalar(2));
        urchin.add(spine);
      }
      const ux = (Math.random()-0.5)*w*0.7, uz = (Math.random()-0.5)*d*0.7;
      urchin.position.set(ux, getTerrainHeight(ux, uz, 0.8) + 0.06, uz); mctx.scene.add(urchin);
    }
    // ── Jellyfish props ──
    for (let i = 0; i < 8; i++) {
      const jf = new THREE.Group();
      const jfColor = [0x88ddff, 0xff88cc, 0xaa88ff, 0x88ffaa][i % 4];
      const jfMat = new THREE.MeshStandardMaterial({ color: jfColor, emissive: jfColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.35 });
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random()*0.1, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), jfMat);
      jf.add(bell);
      for (let t = 0; t < 8; t++) {
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.3 + Math.random()*0.25, 8),
          new THREE.MeshStandardMaterial({ color: jfColor, emissive: jfColor, emissiveIntensity: 0.2, transparent: true, opacity: 0.25 }));
        tent.position.set((Math.random()-0.5)*0.12, -0.2 - Math.random()*0.15, (Math.random()-0.5)*0.12);
        jf.add(tent);
      }
      const jfLight = new THREE.PointLight(jfColor, 0.15, 3);
      jf.add(jfLight); mctx.torchLights.push(jfLight);
      jf.position.set((Math.random()-0.5)*w*0.6, 1.5 + Math.random()*3.5, (Math.random()-0.5)*d*0.6);
      mctx.scene.add(jf);
    }
    // ── Barnacle clusters on structures ──
    for (let i = 0; i < 20; i++) {
      const barnacleGroup = new THREE.Group();
      const barnMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.9 });
      const bCount = 4 + Math.floor(Math.random() * 5);
      for (let b = 0; b < bCount; b++) {
        const barnacle = new THREE.Mesh(new THREE.ConeGeometry(0.015 + Math.random()*0.01, 0.02 + Math.random()*0.015, 8), barnMat);
        barnacle.position.set((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.08, (Math.random()-0.5)*0.1);
        barnacleGroup.add(barnacle);
      }
      const bx = (Math.random()-0.5)*w*0.75, bz = (Math.random()-0.5)*d*0.75;
      barnacleGroup.position.set(bx, getTerrainHeight(bx, bz, 0.8) + 0.5 + Math.random()*2, bz);
      barnacleGroup.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(barnacleGroup);
    }
    // ── Underwater ruins archways ──
    for (let i = 0; i < 3; i++) {
      const archway = new THREE.Group();
      const archStoneMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.9 });
      const pillarH = 2 + Math.random() * 1.5;
      // Left pillar
      const lPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, pillarH, 0.4), archStoneMat);
      lPillar.position.set(-1, pillarH / 2, 0); archway.add(lPillar);
      // Right pillar
      const rPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, pillarH, 0.4), archStoneMat);
      rPillar.position.set(1, pillarH / 2, 0); archway.add(rPillar);
      // Torus arch on top
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1, 0.15, 12, 24, Math.PI), archStoneMat);
      arch.position.y = pillarH; arch.rotation.z = Math.PI; archway.add(arch);
      // Coral growths on archway
      for (let cg = 0; cg < 6; cg++) {
        const coralGrowth = Math.random() > 0.5
          ? new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random()*0.04, 12, 8), new THREE.MeshStandardMaterial({ color: coralColors[cg % coralColors.length], roughness: 0.6 }))
          : new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.1 + Math.random()*0.08, 8), new THREE.MeshStandardMaterial({ color: coralColors[cg % coralColors.length], roughness: 0.6 }));
        coralGrowth.position.set((Math.random()-0.5)*2, Math.random() * pillarH, (Math.random()-0.5)*0.3);
        archway.add(coralGrowth);
      }
      const ax = (Math.random()-0.5)*w*0.5, az = (Math.random()-0.5)*d*0.5;
      archway.position.set(ax, getTerrainHeight(ax, az, 0.8), az);
      archway.rotation.y = Math.random() * Math.PI; mctx.scene.add(archway);
    }
    // ── Air bubble columns ──
    for (let i = 0; i < 6; i++) {
      const colX = (Math.random()-0.5)*w*0.6, colZ = (Math.random()-0.5)*d*0.6;
      const colBase = getTerrainHeight(colX, colZ, 0.8);
      for (let b = 0; b < 10; b++) {
        const bSize = 0.01 + b * 0.004 + Math.random() * 0.005;
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(bSize, 12, 8), bubbleMat);
        bubble.position.set(colX + (Math.random()-0.5)*0.1, colBase + 0.2 + b * 0.4 + Math.random()*0.15, colZ + (Math.random()-0.5)*0.1);
        mctx.scene.add(bubble);
      }
    }
}

export function buildAncientLibrary(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x1a1511, 0.016);
    mctx.applyTerrainColors(0x2a2218, 0x3a3228, 0.4);
    mctx.dirLight.color.setHex(0xffddaa);
    mctx.dirLight.intensity = 0.7;
    mctx.ambientLight.color.setHex(0x332211);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x886644);
    mctx.hemiLight.groundColor.setHex(0x221100);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
    const bookColors = [0x882222, 0x224488, 0x228844, 0x884422, 0x442288, 0x886622, 0x228888, 0x664422];
    // Pre-create book materials (reused across all shelves)
    const bookMats = bookColors.map(c => new THREE.MeshStandardMaterial({ color: c }));
    const parchmentMat = new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.7 });
    const stonePillarMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.8 });
    const inkMat = new THREE.MeshStandardMaterial({ color: 0x111133, roughness: 0.3 });
    const magicMat = new THREE.MeshStandardMaterial({ color: 0x4466ff, emissive: 0x2244cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xeeddaa });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.6 });
    const dustMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, transparent: true, opacity: 0.3, depthWrite: false });
    // Towering bookshelves arranged in rows
    const bookGeo = new THREE.BoxGeometry(0.12, 0.3, 0.22);
    for (let i = 0; i < 18; i++) {
      const shelf = new THREE.Group();
      const shelfH = 3 + Math.random() * 3;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, shelfH, 0.45), woodMat);
      frame.position.y = shelfH / 2; frame.castShadow = true; shelf.add(frame);
      // Side panels
      for (const side of [-1.1, 1.1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, shelfH, 0.45), woodMat);
        panel.position.set(side, shelfH/2, 0); shelf.add(panel);
      }
      // Shelf dividers and books
      for (let r = 0; r < Math.floor(shelfH / 0.5); r++) {
        const divider = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.45), woodMat);
        divider.position.y = r * 0.5 + 0.1; shelf.add(divider);
        for (let b = 0; b < 4+Math.floor(Math.random()*2); b++) {
          const book = new THREE.Mesh(bookGeo, bookMats[Math.floor(Math.random()*bookMats.length)]);
          book.position.set(-0.7+b*0.3, r*0.5+0.27, 0);
          if (Math.random() > 0.85) book.rotation.z = 0.3;
          shelf.add(book);
        }
      }
      // Crown molding on top
      const crown = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.5), woodMat);
      crown.position.y = shelfH + 0.05; shelf.add(crown);
      const sx = (Math.random()-0.5)*w*0.8, sz = (Math.random()-0.5)*d*0.8;
      shelf.position.set(sx, getTerrainHeight(sx, sz, 0.4), sz);
      shelf.rotation.y = Math.random() * Math.PI; mctx.scene.add(shelf);
    }
    // Reading desks with candles and open books
    for (let i = 0; i < 10; i++) {
      const desk = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.8), woodMat);
      top.position.y = 0.75; desk.add(top);
      for (const lx of [-0.5, 0.5]) { for (const lz of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.72, 17), woodMat);
        leg.position.set(lx, 0.36, lz); desk.add(leg);
      }}
      // Candle with holder
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 23), ironMat);
      holder.position.set(0.35, 0.79, 0.2); desk.add(holder);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.15, 17), candleMat);
      candle.position.set(0.35, 0.87, 0.2); desk.add(candle);
      const flame = new THREE.PointLight(0xff8833, 0.5, 5);
      flame.position.set(0.35, 0.98, 0.2); desk.add(flame); mctx.torchLights.push(flame);
      const flameVis = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 8), candleMat);
      flameVis.position.set(0.35, 0.96, 0.2); desk.add(flameVis);
      // Open book on desk
      const openBook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.25), bookMats[i%bookMats.length]);
      openBook.position.set(-0.1, 0.79, 0); desk.add(openBook);
      const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.22), parchmentMat);
      pages.rotation.x = -Math.PI/2; pages.position.set(-0.1, 0.8, 0); desk.add(pages);
      // Quill pen
      const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 0.2, 8), woodMat);
      quill.position.set(0.15, 0.8, -0.1); quill.rotation.z = 0.3; desk.add(quill);
      // Chair
      const chair = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), woodMat);
      seat.position.y = 0.45; chair.add(seat);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.04), woodMat);
      backrest.position.set(0, 0.7, -0.18); chair.add(backrest);
      for (const clx of [-0.15, 0.15]) { for (const clz of [-0.15, 0.15]) {
        const cleg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.43, 17), woodMat);
        cleg.position.set(clx, 0.22, clz); chair.add(cleg);
      }}
      chair.position.set(0, 0, 0.5); desk.add(chair);
      const dx = (Math.random()-0.5)*w*0.6, dz = (Math.random()-0.5)*d*0.6;
      desk.position.set(dx, getTerrainHeight(dx, dz, 0.4), dz);
      desk.rotation.y = Math.random()*Math.PI; mctx.scene.add(desk);
    }
    // Floating magical tomes
    for (let i = 0; i < 8; i++) {
      const tome = new THREE.Group();
      const tomeBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.15), bookMats[i%bookMats.length]);
      tome.add(tomeBody);
      // Glow aura around tome
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), magicMat);
      aura.scale.y = 0.3; tome.add(aura);
      const sparkle = new THREE.PointLight([0x4466ff, 0xff6644, 0x44ff66][i%3], 0.3, 4);
      sparkle.position.y = 0.1; tome.add(sparkle); mctx.torchLights.push(sparkle);
      tome.position.set((Math.random()-0.5)*w*0.5, 2+Math.random()*3, (Math.random()-0.5)*d*0.5);
      tome.rotation.set((Math.random()-0.5)*0.2, Math.random()*Math.PI, (Math.random()-0.5)*0.1);
      mctx.scene.add(tome);
    }
    // Scattered scrolls and books on floor
    for (let i = 0; i < 30; i++) {
      const item = Math.random() > 0.5;
      if (item) {
        const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.25+Math.random()*0.15, 23), parchmentMat);
        scroll.rotation.z = Math.PI / 2;
        const scx = (Math.random()-0.5)*w*0.7, scz = (Math.random()-0.5)*d*0.7;
        scroll.position.set(scx, getTerrainHeight(scx, scz, 0.4)+0.03, scz);
        scroll.rotation.y = Math.random()*Math.PI; mctx.scene.add(scroll);
      } else {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.12+Math.random()*0.08, 0.03, 0.15+Math.random()*0.05),
          new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(Math.random()*bookColors.length)] }));
        const bx = (Math.random()-0.5)*w*0.7, bz = (Math.random()-0.5)*d*0.7;
        book.position.set(bx, getTerrainHeight(bx, bz, 0.4)+0.02, bz);
        book.rotation.y = Math.random()*Math.PI; mctx.scene.add(book);
      }
    }
    // Ink spills on floor
    for (let i = 0; i < 10; i++) {
      const spill = new THREE.Mesh(new THREE.CircleGeometry(0.1+Math.random()*0.15, 23), inkMat);
      spill.rotation.x = -Math.PI/2;
      const ix = (Math.random()-0.5)*w*0.6, iz = (Math.random()-0.5)*d*0.6;
      spill.position.set(ix, getTerrainHeight(ix, iz, 0.4)+0.01, iz); mctx.scene.add(spill);
    }
    // Ladders leaning against shelves
    for (let i = 0; i < 6; i++) {
      const ladder = new THREE.Group();
      const ladH = 2.5+Math.random()*2;
      for (const lside of [-0.15, 0.15]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ladH, 17), woodMat);
        rail.position.x = lside; ladder.add(rail);
      }
      for (let rung = 0; rung < Math.floor(ladH/0.35); rung++) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 17), woodMat);
        r.rotation.z = Math.PI/2; r.position.y = -ladH/2+rung*0.35+0.2; ladder.add(r);
      }
      const lx = (Math.random()-0.5)*w*0.7, lz = (Math.random()-0.5)*d*0.7;
      ladder.position.set(lx, getTerrainHeight(lx, lz, 0.4)+ladH/2, lz);
      ladder.rotation.z = 0.15+Math.random()*0.1;
      ladder.rotation.y = Math.random()*Math.PI; mctx.scene.add(ladder);
    }
    // Globe on a stand
    for (let i = 0; i < 3; i++) {
      const globeGroup = new THREE.Group();
      const gStand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.8, 23), woodMat);
      gStand.position.y = 0.4; globeGroup.add(gStand);
      const gBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.05, 27), woodMat);
      globeGroup.add(gBase);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 46, 27),
        new THREE.MeshStandardMaterial({ color: 0x446688, roughness: 0.4, metalness: 0.2 }));
      globe.position.y = 0.95; globeGroup.add(globe);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 17, 44), ironMat);
      ring.position.y = 0.95; ring.rotation.x = 0.3; globeGroup.add(ring);
      const gx = (Math.random()-0.5)*w*0.4, gz = (Math.random()-0.5)*d*0.4;
      globeGroup.position.set(gx, getTerrainHeight(gx, gz, 0.4), gz); mctx.scene.add(globeGroup);
    }
    // Astrolabe
    for (let i = 0; i < 2; i++) {
      const astro = new THREE.Group();
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12+r*0.05, 0.005, 17, 44), ironMat);
        ring.rotation.x = r*0.5; ring.rotation.y = r*0.7; astro.add(ring);
      }
      const ax = (Math.random()-0.5)*w*0.3, az = (Math.random()-0.5)*d*0.3;
      astro.position.set(ax, getTerrainHeight(ax, az, 0.4)+0.8, az); mctx.scene.add(astro);
    }
    // Magic circles on floor
    for (let i = 0; i < 4; i++) {
      const circle = new THREE.Mesh(new THREE.TorusGeometry(1.2+Math.random()*0.8, 0.02, 17, 46), magicMat);
      circle.rotation.x = -Math.PI/2;
      const cx = (Math.random()-0.5)*w*0.4, cz = (Math.random()-0.5)*d*0.4;
      circle.position.set(cx, getTerrainHeight(cx, cz, 0.4)+0.02, cz); mctx.scene.add(circle);
      // Inner symbols
      const inner = new THREE.Mesh(new THREE.TorusGeometry(0.5+Math.random()*0.3, 0.015, 17, 36), magicMat);
      inner.rotation.x = -Math.PI/2;
      inner.position.set(cx, getTerrainHeight(cx, cz, 0.4)+0.025, cz); mctx.scene.add(inner);
    }
    // Stone pillars with ornate capitals
    for (let i = 0; i < 14; i++) {
      const pillar = new THREE.Group();
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 5, 27), stonePillarMat);
      col.position.y = 2.5; col.castShadow = true; pillar.add(col);
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.2, 27), stonePillarMat);
      capital.position.y = 5.1; pillar.add(capital);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.2, 27), stonePillarMat);
      base.position.y = 0.1; pillar.add(base);
      const px = (Math.random()-0.5)*w*0.75, pz = (Math.random()-0.5)*d*0.75;
      pillar.position.set(px, getTerrainHeight(px, pz, 0.4), pz); mctx.scene.add(pillar);
    }
    // Dust particles (tiny floating specks — shared geometry and material)
    const dustGlowMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, emissive: 0x886644, emissiveIntensity: 0.3 });
    const dustGeo = new THREE.SphereGeometry(0.01, 6, 4);
    for (let i = 0; i < 40; i++) {
      const dust = new THREE.Mesh(dustGeo, dustGlowMat);
      dust.position.set((Math.random()-0.5)*w*0.6, 0.5+Math.random()*4, (Math.random()-0.5)*d*0.6);
      mctx.scene.add(dust);
    }
    // ── Scroll racks (vertical slotted shelves) ──
    for (let i = 0; i < 6; i++) {
      const rack = new THREE.Group();
      const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.3), woodMat);
      rackFrame.position.y = 0.75; rack.add(rackFrame);
      for (let s = 0; s < 6; s++) {
        const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.25, 16), parchmentMat);
        scroll.position.set(-0.25 + s * 0.1, 0.4 + Math.floor(s / 3) * 0.5, 0);
        scroll.rotation.z = Math.PI / 2 + (Math.random()-0.5)*0.15; rack.add(scroll);
      }
      const rrx = (Math.random()-0.5)*w*0.6, rrz = (Math.random()-0.5)*d*0.6;
      rack.position.set(rrx, getTerrainHeight(rrx, rrz, 0.4), rrz);
      rack.rotation.y = Math.random() * Math.PI; mctx.scene.add(rack);
    }
    // ── Reading lecterns ──
    for (let i = 0; i < 5; i++) {
      const lectern = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 17), woodMat);
      post.position.y = 0.6; lectern.add(post);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 23), woodMat);
      lectern.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.35), woodMat);
      top.position.set(0, 1.22, 0.05); top.rotation.x = -0.3; lectern.add(top);
      const openBook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.25), new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length] }));
      openBook.position.set(0, 1.26, 0.05); openBook.rotation.x = -0.3; lectern.add(openBook);
      const lex = (Math.random()-0.5)*w*0.5, lez = (Math.random()-0.5)*d*0.5;
      lectern.position.set(lex, getTerrainHeight(lex, lez, 0.4), lez);
      lectern.rotation.y = Math.random() * Math.PI; mctx.scene.add(lectern);
    }
    // ── Ink well props ──
    for (let i = 0; i < 8; i++) {
      const inkwell = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.04, 17), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      pot.position.y = 0.02; inkwell.add(pot);
      const inkSurface = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), inkMat);
      inkSurface.rotation.x = -Math.PI / 2; inkSurface.position.y = 0.04; inkwell.add(inkSurface);
      const iwx = (Math.random()-0.5)*w*0.5, iwz = (Math.random()-0.5)*d*0.5;
      inkwell.position.set(iwx, getTerrainHeight(iwx, iwz, 0.4) + 0.78, iwz); mctx.scene.add(inkwell);
    }
    // ── Candle holders along walls ──
    for (let i = 0; i < 12; i++) {
      const holder = new THREE.Group();
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.15), ironMat);
      holder.add(bracket);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 20), ironMat);
      plate.position.z = 0.08; plate.rotation.x = Math.PI / 2; holder.add(plate);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.12, 16), candleMat);
      candle.position.set(0, 0.03, 0.08); holder.add(candle);
      const flameVis = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8800, emissiveIntensity: 2.0 }));
      flameVis.position.set(0, 0.1, 0.08); holder.add(flameVis);
      const chx = (Math.random()-0.5)*w*0.75, chz = (Math.random()-0.5)*d*0.75;
      holder.position.set(chx, getTerrainHeight(chx, chz, 0.4) + 2.0 + Math.random(), chz);
      holder.rotation.y = Math.random() * Math.PI; mctx.scene.add(holder);
    }
    // ── Fallen book piles ──
    for (let i = 0; i < 10; i++) {
      const pile = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 5);
      for (let b = 0; b < count; b++) {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.12 + Math.random() * 0.08, 0.025, 0.16 + Math.random() * 0.06), new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(Math.random() * bookColors.length)] }));
        book.position.y = b * 0.028; book.rotation.y = (Math.random()-0.5)*0.3; pile.add(book);
      }
      const fpx = (Math.random()-0.5)*w*0.65, fpz = (Math.random()-0.5)*d*0.65;
      pile.position.set(fpx, getTerrainHeight(fpx, fpz, 0.4) + 0.01, fpz); mctx.scene.add(pile);
    }
    // ── Tall bookshelf walls ──
    for (let i = 0; i < 8; i++) {
      const bsWall = new THREE.Group();
      const bsH = 4 + Math.random() * 3;
      const bsW2 = 2.5 + Math.random() * 1.5;
      const bsFrame = new THREE.Mesh(new THREE.BoxGeometry(bsW2, bsH, 0.5), woodMat);
      bsFrame.position.y = bsH / 2; bsFrame.castShadow = true; bsWall.add(bsFrame);
      const bsShelfN = Math.floor(bsH / 0.45);
      for (let sh = 0; sh < bsShelfN; sh++) {
        const shDiv = new THREE.Mesh(new THREE.BoxGeometry(bsW2, 0.03, 0.5), woodMat);
        shDiv.position.y = sh * 0.45 + 0.15; bsWall.add(shDiv);
        const bkN = 6 + Math.floor(Math.random() * 5);
        for (let b = 0; b < bkN; b++) {
          const bkH = 0.2 + Math.random() * 0.18;
          const bk = new THREE.Mesh(new THREE.BoxGeometry(0.04 + Math.random()*0.04, bkH, 0.18 + Math.random()*0.06),
            new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(Math.random()*bookColors.length)] }));
          bk.position.set(-bsW2*0.4 + b * (bsW2*0.8/bkN), sh * 0.45 + 0.15 + bkH/2 + 0.02, 0);
          if (Math.random() > 0.9) bk.rotation.z = 0.2 + Math.random()*0.2;
          bsWall.add(bk);
        }
        if (Math.random() > 0.7) {
          const fBk = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.12),
            new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(Math.random()*bookColors.length)] }));
          fBk.position.set((Math.random()-0.5)*bsW2*0.3, sh * 0.45 + 0.18, 0.2);
          fBk.rotation.y = Math.random() * 0.5; bsWall.add(fBk);
        }
      }
      const bsx2 = (Math.random()-0.5)*w*0.75, bsz2 = (Math.random()-0.5)*d*0.75;
      bsWall.position.set(bsx2, getTerrainHeight(bsx2, bsz2, 0.4), bsz2);
      bsWall.rotation.y = Math.random() * Math.PI; mctx.scene.add(bsWall);
    }
    // ── Reading alcoves ──
    for (let i = 0; i < 4; i++) {
      const alcv = new THREE.Group();
      const alcDsk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), woodMat);
      alcDsk.position.y = 0.7; alcv.add(alcDsk);
      for (const alx of [-0.35, 0.35]) { for (const alz of [-0.2, 0.2]) {
        const aLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.68, 12), woodMat);
        aLeg.position.set(alx, 0.34, alz); alcv.add(aLeg);
      }}
      const alcChr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), woodMat);
      alcChr.position.set(0, 0.4, 0.45); alcv.add(alcChr);
      const alcBk = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.04), woodMat);
      alcBk.position.set(0, 0.6, 0.6); alcv.add(alcBk);
      const alcHld = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.02, 16), ironMat);
      alcHld.position.set(0.25, 0.73, -0.1); alcv.add(alcHld);
      const alcCnd = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.1, 12), candleMat);
      alcCnd.position.set(0.25, 0.79, -0.1); alcv.add(alcCnd);
      const alcFlm = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xff8800, emissiveIntensity: 2.0 }));
      alcFlm.position.set(0.25, 0.86, -0.1); alcv.add(alcFlm);
      const alcPt = new THREE.PointLight(0xff8833, 0.4, 4);
      alcPt.position.set(0.25, 0.88, -0.1); alcv.add(alcPt); mctx.torchLights.push(alcPt);
      const alcLP = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.16), parchmentMat);
      alcLP.position.set(-0.07, 0.74, 0); alcLP.rotation.set(-Math.PI/2, 0, 0.1); alcv.add(alcLP);
      const alcRP = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.16), parchmentMat);
      alcRP.position.set(0.07, 0.74, 0); alcRP.rotation.set(-Math.PI/2, 0, -0.1); alcv.add(alcRP);
      const alcX = (Math.random()-0.5)*w*0.5, alcZ = (Math.random()-0.5)*d*0.5;
      alcv.position.set(alcX, getTerrainHeight(alcX, alcZ, 0.4), alcZ);
      alcv.rotation.y = Math.random() * Math.PI; mctx.scene.add(alcv);
    }
    // ── Scroll storage racks ──
    for (let i = 0; i < 6; i++) {
      const sRk = new THREE.Group();
      for (const rpx of [-0.4, 0.4]) { for (const rpz of [-0.15, 0.15]) {
        const rPst = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.05), woodMat);
        rPst.position.set(rpx, 0.7, rpz); sRk.add(rPst);
      }}
      for (let rr = 0; rr < 4; rr++) {
        const rRl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.03), woodMat);
        rRl.position.set(0, 0.2 + rr * 0.35, 0); sRk.add(rRl);
      }
      for (let rr = 0; rr < 3; rr++) {
        for (let rc = 0; rc < 4; rc++) {
          const rScr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.25, 12), parchmentMat);
          rScr.rotation.z = Math.PI / 2;
          rScr.position.set(-0.25 + rc * 0.18, 0.3 + rr * 0.35, 0);
          sRk.add(rScr);
        }
      }
      const uScr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 12), parchmentMat);
      uScr.rotation.z = Math.PI / 2;
      uScr.position.set(0.1, 0.3, 0.12); sRk.add(uScr);
      const sTrl = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.18), parchmentMat);
      sTrl.position.set(0.1, 0.22, 0.15); sTrl.rotation.x = -0.3; sRk.add(sTrl);
      const srx2 = (Math.random()-0.5)*w*0.6, srz2 = (Math.random()-0.5)*d*0.6;
      sRk.position.set(srx2, getTerrainHeight(srx2, srz2, 0.4), srz2);
      sRk.rotation.y = Math.random() * Math.PI; mctx.scene.add(sRk);
    }
    // ── Floating magical tomes (detailed) ──
    for (let i = 0; i < 8; i++) {
      const fTm = new THREE.Group();
      const ftClr = [0x882244, 0x224488, 0x448822][i % 3];
      const ftBd = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16),
        new THREE.MeshStandardMaterial({ color: ftClr, emissive: 0x222244, emissiveIntensity: 0.3 }));
      fTm.add(ftBd);
      const ftL = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), parchmentMat);
      ftL.position.set(-0.06, 0.03, 0); ftL.rotation.set(0, 0, 0.15); fTm.add(ftL);
      const ftR = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), parchmentMat);
      ftR.position.set(0.06, 0.03, 0); ftR.rotation.set(0, 0, -0.15); fTm.add(ftR);
      for (let fp = 0; fp < 5; fp++) {
        const fPrt = new THREE.Mesh(new THREE.SphereGeometry(0.008 + Math.random()*0.005, 8, 6), magicMat);
        fPrt.position.set((Math.random()-0.5)*0.1, -0.1 - fp * 0.08 - Math.random()*0.05, (Math.random()-0.5)*0.1);
        fTm.add(fPrt);
      }
      fTm.position.set((Math.random()-0.5)*w*0.5, 2 + Math.random()*3, (Math.random()-0.5)*d*0.5);
      fTm.rotation.set((Math.random()-0.5)*0.15, Math.random()*Math.PI, (Math.random()-0.5)*0.1);
      mctx.scene.add(fTm);
    }
    // ── Astronomy globes ──
    for (let i = 0; i < 2; i++) {
      const aGlb = new THREE.Group();
      const agTbl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), woodMat);
      agTbl.position.y = 0.7; aGlb.add(agTbl);
      for (const atx of [-0.3, 0.3]) { for (const atz of [-0.2, 0.2]) {
        const atLg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.68, 12), woodMat);
        atLg.position.set(atx, 0.34, atz); aGlb.add(atLg);
      }}
      const agSt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 16), ironMat);
      agSt.position.y = 0.88; aGlb.add(agSt);
      const agBR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 12, 24), ironMat);
      agBR.rotation.x = -Math.PI / 2; agBR.position.y = 0.73; aGlb.add(agBR);
      const agSph = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0x335566, roughness: 0.4, metalness: 0.2 }));
      agSph.position.y = 1.1; aGlb.add(agSph);
      for (let cl = 0; cl < 6; cl++) {
        const cLn = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.06 + Math.random()*0.04),
          new THREE.MeshStandardMaterial({ color: 0xddddaa, emissive: 0x888855, emissiveIntensity: 0.5 }));
        const cph = Math.random() * Math.PI;
        const cth = Math.random() * Math.PI * 2;
        cLn.position.set(Math.sin(cph)*Math.cos(cth)*0.12, 1.1 + Math.cos(cph)*0.12, Math.sin(cph)*Math.sin(cth)*0.12);
        cLn.rotation.set(Math.random(), Math.random(), Math.random()); aGlb.add(cLn);
      }
      const agx2 = (Math.random()-0.5)*w*0.4, agz2 = (Math.random()-0.5)*d*0.4;
      aGlb.position.set(agx2, getTerrainHeight(agx2, agz2, 0.4), agz2);
      aGlb.rotation.y = Math.random() * Math.PI; mctx.scene.add(aGlb);
    }
    // ── Card catalog cabinets ──
    for (let i = 0; i < 4; i++) {
      const catl = new THREE.Group();
      const catBd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.35), woodMat);
      catBd.position.y = 0.5; catl.add(catBd);
      for (let dR = 0; dR < 4; dR++) {
        for (let dC = 0; dC < 3; dC++) {
          const drwr = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.7 }));
          drwr.position.set(-0.18 + dC * 0.18, 0.2 + dR * 0.2, 0.18); catl.add(drwr);
          const knb = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), ironMat);
          knb.position.set(-0.18 + dC * 0.18, 0.2 + dR * 0.2, 0.2); catl.add(knb);
        }
      }
      const catX2 = (Math.random()-0.5)*w*0.5, catZ2 = (Math.random()-0.5)*d*0.5;
      catl.position.set(catX2, getTerrainHeight(catX2, catZ2, 0.4), catZ2);
      catl.rotation.y = Math.random() * Math.PI; mctx.scene.add(catl);
    }
    // ── Ladder on rails ──
    for (let i = 0; i < 3; i++) {
      const rLdr = new THREE.Group();
      const rlH2 = 3 + Math.random() * 2;
      for (const rlS of [-0.12, 0.12]) {
        const rlR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, rlH2, 12), woodMat);
        rlR.position.x = rlS; rLdr.add(rlR);
      }
      const rlRN = Math.floor(rlH2 / 0.3);
      for (let rr = 0; rr < rlRN; rr++) {
        const rlRg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.03), woodMat);
        rlRg.position.y = -rlH2/2 + rr * 0.3 + 0.15; rLdr.add(rlRg);
      }
      const rlBR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2 + Math.random(), 12), ironMat);
      rlBR.rotation.z = Math.PI / 2;
      rlBR.position.y = -rlH2 / 2; rLdr.add(rlBR);
      const rlx2 = (Math.random()-0.5)*w*0.65, rlz2 = (Math.random()-0.5)*d*0.65;
      rLdr.position.set(rlx2, getTerrainHeight(rlx2, rlz2, 0.4) + rlH2 / 2, rlz2);
      rLdr.rotation.z = 0.12 + Math.random()*0.08;
      rLdr.rotation.y = Math.random() * Math.PI; mctx.scene.add(rLdr);
    }
    // ── Chandeliers with candles ──
    for (let i = 0; i < 4; i++) {
      const chnd = new THREE.Group();
      const chRR = 0.4 + Math.random() * 0.2;
      const chRg = new THREE.Mesh(new THREE.TorusGeometry(chRR, 0.015, 12, 24), ironMat);
      chnd.add(chRg);
      for (let ch = 0; ch < 4; ch++) {
        const chA = (ch / 4) * Math.PI * 2;
        const chCh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.5, 8), ironMat);
        chCh.position.set(Math.cos(chA) * chRR * 0.7, 0.75, Math.sin(chA) * chRR * 0.7);
        chnd.add(chCh);
      }
      const chCN = 6 + Math.floor(Math.random() * 3);
      for (let cc = 0; cc < chCN; cc++) {
        const ccA = (cc / chCN) * Math.PI * 2;
        const chCd = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.08, 10), candleMat);
        chCd.position.set(Math.cos(ccA) * chRR, 0.04, Math.sin(ccA) * chRR); chnd.add(chCd);
        const chFl = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xff8800, emissiveIntensity: 2.0 }));
        chFl.position.set(Math.cos(ccA) * chRR, 0.1, Math.sin(ccA) * chRR); chnd.add(chFl);
      }
      const chPL = new THREE.PointLight(0xff8833, 0.6, 8);
      chnd.add(chPL); mctx.torchLights.push(chPL);
      chnd.position.set((Math.random()-0.5)*w*0.5, 4 + Math.random()*1.5, (Math.random()-0.5)*d*0.5);
      mctx.scene.add(chnd);
    }
    // ── Ink stain details ──
    for (let i = 0; i < 10; i++) {
      const ikSt = new THREE.Mesh(new THREE.CircleGeometry(0.06 + Math.random()*0.1, 16), inkMat);
      ikSt.rotation.x = -Math.PI / 2;
      const isX2 = (Math.random()-0.5)*w*0.6, isZ2 = (Math.random()-0.5)*d*0.6;
      ikSt.position.set(isX2, getTerrainHeight(isX2, isZ2, 0.4) + 0.01, isZ2); mctx.scene.add(ikSt);
      const iwPr = new THREE.Group();
      const iwPt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.035, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      iwPt.position.y = 0.018; iwPr.add(iwPt);
      const iwQl = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x443322 }));
      iwQl.position.set(0.03, 0.05, 0); iwQl.rotation.z = 0.4; iwPr.add(iwQl);
      iwPr.position.set(isX2 + 0.1, getTerrainHeight(isX2, isZ2, 0.4) + 0.78, isZ2 + 0.05);
      mctx.scene.add(iwPr);
    }

}

export function buildJadeTemple(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x1a3322, 0.012);
    mctx.applyTerrainColors(0x2a4422, 0x3a5533, 1.0);
    mctx.dirLight.color.setHex(0xddffcc);
    mctx.dirLight.intensity = 1.2;
    mctx.ambientLight.color.setHex(0x224422);
    mctx.ambientLight.intensity = 0.6;
    mctx.hemiLight.color.setHex(0x66aa44);
    mctx.hemiLight.groundColor.setHex(0x223311);

    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x44aa66, roughness: 0.3, metalness: 0.3 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.8 });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.6 });
    const redWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.6, roughness: 0.3 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x336655, transparent: true, opacity: 0.5, metalness: 0.3, roughness: 0.1 });
    const blossomMat = new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.5 });
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.08 });
    // Jade pillars with ornate capitals
    for (let i = 0; i < 18; i++) {
      const pillar = new THREE.Group();
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 4, 27), jadeMat);
      col.position.y = 2; col.castShadow = true; pillar.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.8), jadeMat);
      cap.position.y = 4.1; pillar.add(cap);
      const capOrn = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.1, 27), goldMat);
      capOrn.position.y = 4.0; pillar.add(capOrn);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), stoneMat);
      base.position.y = 0.08; pillar.add(base);
      for (let v = 0; v < 3; v++) {
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.5, 17), vineMat);
        vine.position.set(Math.sin(v*2.1)*0.28, 1+v*1.0, Math.cos(v*2.1)*0.28);
        vine.rotation.z = 0.3; pillar.add(vine);
      }
      const px = (Math.random()-0.5)*w*0.75, pz = (Math.random()-0.5)*d*0.75;
      pillar.position.set(px, getTerrainHeight(px, pz, 1.0), pz); mctx.scene.add(pillar);
    }
    // Ornate temple roof structures (pagoda tiers)
    for (let i = 0; i < 4; i++) {
      const pagoda = new THREE.Group();
      for (let tier = 0; tier < 3; tier++) {
        const roofSize = 2.5 - tier * 0.6;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(roofSize, 0.4, 17), redWoodMat);
        roof.position.y = tier * 1.8 + 1.5; roof.rotation.y = Math.PI/4; pagoda.add(roof);
        const walls = new THREE.Mesh(new THREE.BoxGeometry(roofSize*0.7, 1.4, roofSize*0.7), stoneMat);
        walls.position.y = tier * 1.8 + 0.7; pagoda.add(walls);
      }
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 23, 20), goldMat);
      finial.position.y = 6; pagoda.add(finial);
      const pgx = (Math.random()-0.5)*w*0.5, pgz = (Math.random()-0.5)*d*0.5;
      pagoda.position.set(pgx, getTerrainHeight(pgx, pgz, 1.0), pgz); mctx.scene.add(pagoda);
    }
    // Jade statues with dragon carvings
    for (let i = 0; i < 8; i++) {
      const statue = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 23), jadeMat);
      body.position.y = 0.75; statue.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 31, 20), jadeMat);
      head.position.y = 1.6; statue.add(head);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), stoneMat);
      base.position.y = 0.1; statue.add(base);
      // Arms
      for (const ax of [-0.25, 0.25]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 17), jadeMat);
        arm.position.set(ax, 1.0, 0.15); arm.rotation.z = ax > 0 ? -0.5 : 0.5; statue.add(arm);
      }
      const stx = (Math.random()-0.5)*w*0.6, stz = (Math.random()-0.5)*d*0.6;
      statue.position.set(stx, getTerrainHeight(stx, stz, 1.0), stz); mctx.scene.add(statue);
    }
    // Dragon carvings (stylized serpentine forms)
    for (let i = 0; i < 5; i++) {
      const dragon = new THREE.Group();
      for (let s = 0; s < 8; s++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.12-s*0.01, 20, 17), jadeMat);
        seg.position.set(Math.sin(s*0.8)*0.5, 0.8+s*0.15, Math.cos(s*0.8)*0.5);
        dragon.add(seg);
      }
      const dHead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 20), jadeMat);
      dHead.position.set(Math.sin(6.4)*0.5, 2.0, Math.cos(6.4)*0.5);
      dHead.rotation.z = 0.5; dragon.add(dHead);
      const dx = (Math.random()-0.5)*w*0.5, dz = (Math.random()-0.5)*d*0.5;
      dragon.position.set(dx, getTerrainHeight(dx, dz, 1.0), dz); mctx.scene.add(dragon);
    }
    // Incense burners with smoke
    for (let i = 0; i < 8; i++) {
      const burner = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.15, 27), goldMat);
      bowl.position.y = 0.6; burner.add(bowl);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 23), goldMat);
      stand.position.y = 0.3; burner.add(stand);
      const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 27), goldMat);
      burner.add(bBase);
      // Smoke wisps
      for (let s = 0; s < 4; s++) {
        const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.08+s*0.04, 36, 17), smokeMat);
        smoke.position.set((Math.random()-0.5)*0.1, 0.75+s*0.3, (Math.random()-0.5)*0.1); burner.add(smoke);
      }
      const incLight = new THREE.PointLight(0xff6633, 0.15, 3);
      incLight.position.y = 0.7; burner.add(incLight);
      const bx = (Math.random()-0.5)*w*0.6, bz = (Math.random()-0.5)*d*0.6;
      burner.position.set(bx, getTerrainHeight(bx, bz, 1.0), bz); mctx.scene.add(burner);
    }
    // Prayer mats
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.0),
        new THREE.MeshStandardMaterial({ color: [0x882222, 0xcc6633, 0x883388][i%3], roughness: 0.8, side: THREE.DoubleSide }));
      mat.rotation.x = -Math.PI/2;
      const mx = (Math.random()-0.5)*w*0.5, mz = (Math.random()-0.5)*d*0.5;
      mat.position.set(mx, getTerrainHeight(mx, mz, 1.0)+0.02, mz);
      mat.rotation.z = Math.random()*Math.PI; mctx.scene.add(mat);
    }
    // Gong
    for (let i = 0; i < 2; i++) {
      const gongGroup = new THREE.Group();
      const gFrame1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 17), redWoodMat);
      gFrame1.position.set(-0.6, 2, 0); gongGroup.add(gFrame1);
      const gFrame2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 17), redWoodMat);
      gFrame2.position.set(0.6, 2, 0); gongGroup.add(gFrame2);
      const gBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 17), redWoodMat);
      gBar.rotation.z = Math.PI/2; gBar.position.y = 1.8; gongGroup.add(gBar);
      const gDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 44), goldMat);
      gDisc.position.y = 1.2; gongGroup.add(gDisc);
      const gx = (Math.random()-0.5)*w*0.3, gz = (Math.random()-0.5)*d*0.3;
      gongGroup.position.set(gx, getTerrainHeight(gx, gz, 1.0), gz);
      gongGroup.rotation.y = Math.random()*Math.PI; mctx.scene.add(gongGroup);
    }
    // Koi pond
    for (let i = 0; i < 3; i++) {
      const pondR = 1.5+Math.random()*2;
      const pond = new THREE.Mesh(new THREE.CircleGeometry(pondR, 31), waterMat);
      pond.rotation.x = -Math.PI/2;
      const kx = (Math.random()-0.5)*w*0.4, kz = (Math.random()-0.5)*d*0.4;
      pond.position.set(kx, getTerrainHeight(kx, kz, 1.0)-0.05, kz); mctx.scene.add(pond);
      const border = new THREE.Mesh(new THREE.TorusGeometry(pondR, 0.08, 17, 46), stoneMat);
      border.rotation.x = -Math.PI/2;
      border.position.set(kx, getTerrainHeight(kx, kz, 1.0)+0.02, kz); mctx.scene.add(border);
      // Koi fish (simple colored ovals)
      for (let f = 0; f < 3; f++) {
        const fish = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 17),
          new THREE.MeshStandardMaterial({ color: [0xff6633, 0xffffff, 0xff4444][f%3] }));
        fish.scale.set(1, 0.4, 2);
        fish.position.set(kx+(Math.random()-0.5)*pondR*0.6, getTerrainHeight(kx, kz, 1.0)-0.03, kz+(Math.random()-0.5)*pondR*0.6);
        mctx.scene.add(fish);
      }
    }
    // Cherry blossom trees
    for (let i = 0; i < 12; i++) {
      const tree = new THREE.Group();
      const h = 3+Math.random()*3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 23), new THREE.MeshStandardMaterial({ color: 0x5a3a2a }));
      trunk.position.y = h/2; trunk.castShadow = true; tree.add(trunk);
      // Branches with blossoms
      for (let b = 0; b < 5; b++) {
        const bLen = 0.8+Math.random()*1.2;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, bLen, 17), new THREE.MeshStandardMaterial({ color: 0x5a3a2a }));
        const bAngle = (b/5)*Math.PI*2;
        branch.position.set(Math.cos(bAngle)*0.3, h*0.6+b*0.15, Math.sin(bAngle)*0.3);
        branch.rotation.z = 0.5+Math.random()*0.3; branch.rotation.y = bAngle; tree.add(branch);
        for (let bl = 0; bl < 4; bl++) {
          const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.04+Math.random()*0.03, 17, 16), blossomMat);
          blossom.position.set(Math.cos(bAngle)*(0.5+bl*0.25), h*0.6+b*0.15+0.1, Math.sin(bAngle)*(0.5+bl*0.25));
          tree.add(blossom);
        }
      }
      // Fallen petals
      for (let p = 0; p < 3; p++) {
        const petal = new THREE.Mesh(new THREE.CircleGeometry(0.02, 17), blossomMat);
        petal.rotation.x = -Math.PI/2;
        petal.position.set((Math.random()-0.5)*1.5, 0.01, (Math.random()-0.5)*1.5); tree.add(petal);
      }
      const tx = (Math.random()-0.5)*w*0.8, tz = (Math.random()-0.5)*d*0.8;
      tree.position.set(tx, getTerrainHeight(tx, tz, 1.0), tz); mctx.scene.add(tree);
    }
    // Additional vegetation
    for (let i = 0; i < 20; i++) {
      const tree = new THREE.Group();
      const h = 4+Math.random()*3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, h, 23), new THREE.MeshStandardMaterial({ color: 0x6a4a2a }));
      trunk.position.y = h/2; tree.add(trunk);
      for (let l = 0; l < 5; l++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.8+Math.random()*0.5, 0.3, 36), vineMat);
        leaf.position.set((Math.random()-0.5)*0.5, h-0.2, (Math.random()-0.5)*0.5);
        leaf.rotation.set(0.3+Math.random()*0.5, l*1.3, 0); tree.add(leaf);
      }
      const tx = (Math.random()-0.5)*w*0.85, tz = (Math.random()-0.5)*d*0.85;
      tree.position.set(tx, getTerrainHeight(tx, tz, 1.0), tz); mctx.scene.add(tree);
    }
    // Stone lanterns
    for (let i = 0; i < 12; i++) {
      const lantern = new THREE.Group();
      const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.25), stoneMat);
      lantern.add(lBase);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 17), stoneMat);
      post.position.y = 0.55; lantern.add(post);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), stoneMat);
      housing.position.y = 1.1; lantern.add(housing);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 17), stoneMat);
      top.position.y = 1.35; lantern.add(top);
      const light = new THREE.PointLight(0xffaa44, 0.4, 6);
      light.position.y = 1.1; lantern.add(light); mctx.torchLights.push(light);
      const lx = (Math.random()-0.5)*w*0.7, lz = (Math.random()-0.5)*d*0.7;
      lantern.position.set(lx, getTerrainHeight(lx, lz, 1.0), lz); mctx.scene.add(lantern);
    }
    // Stepping stones (paths)
    for (let i = 0; i < 20; i++) {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.2+Math.random()*0.1, 0.25+Math.random()*0.1, 0.08, 23), stoneMat);
      const sx = (Math.random()-0.5)*w*0.6, sz = (Math.random()-0.5)*d*0.6;
      step.position.set(sx, getTerrainHeight(sx, sz, 1.0)+0.02, sz); mctx.scene.add(step);
    }
    // ── Temple pillar carvings (inset box patterns) ──
    for (let i = 0; i < 12; i++) {
      const carvGrp = new THREE.Group();
      for (let c = 0; c < 4; c++) {
        const inset = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.03), goldMat);
        inset.position.y = 0.8 + c * 0.5;
        carvGrp.add(inset);
        const innerInset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), jadeMat);
        innerInset.position.y = 0.8 + c * 0.5; innerInset.position.z = 0.01;
        carvGrp.add(innerInset);
      }
      const cvx = (Math.random()-0.5)*w*0.7, cvz = (Math.random()-0.5)*d*0.7;
      carvGrp.position.set(cvx, getTerrainHeight(cvx, cvz, 1.0), cvz);
      carvGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(carvGrp);
    }
    // ── Prayer bell props ──
    for (let i = 0; i < 6; i++) {
      const bellGrp = new THREE.Group();
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 16), goldMat);
      bellGrp.add(hanger);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 23), goldMat);
      bell.position.y = -0.24; bell.rotation.x = Math.PI; bellGrp.add(bell);
      const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 16), goldMat);
      clapper.position.y = -0.3; bellGrp.add(clapper);
      bellGrp.position.set((Math.random()-0.5)*w*0.5, getTerrainHeight(0, 0, 1.0) + 3 + Math.random() * 2, (Math.random()-0.5)*d*0.5);
      mctx.scene.add(bellGrp);
    }
    // ── Ceremonial weapon displays ──
    for (let i = 0; i < 4; i++) {
      const display = new THREE.Group();
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.05), redWoodMat);
      display.add(backboard);
      const katana = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.01), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.2 }));
      katana.position.set(-0.15, 0, 0.04); katana.rotation.z = 0.1; display.add(katana);
      const katanaHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x443322 }));
      katanaHandle.position.set(-0.15, -0.45, 0.04); display.add(katanaHandle);
      const naginata = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.0, 0.01), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.2 }));
      naginata.position.set(0.15, 0, 0.04); naginata.rotation.z = -0.1; display.add(naginata);
      const dpx = (Math.random()-0.5)*w*0.5, dpz = (Math.random()-0.5)*d*0.5;
      display.position.set(dpx, getTerrainHeight(dpx, dpz, 1.0) + 1.5, dpz);
      display.rotation.y = Math.random() * Math.PI; mctx.scene.add(display);
    }
    // ── Roof tile layers on pagodas ──
    for (let i = 0; i < 8; i++) {
      const tileRow = new THREE.Group();
      for (let t = 0; t < 10; t++) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.3), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
        tile.position.set(-0.9 + t * 0.2, 0, 0);
        tile.rotation.x = -0.15; tileRow.add(tile);
      }
      const trx = (Math.random()-0.5)*w*0.5, trz = (Math.random()-0.5)*d*0.5;
      tileRow.position.set(trx, getTerrainHeight(trx, trz, 1.0) + 2 + Math.random() * 3, trz);
      tileRow.rotation.y = Math.random() * Math.PI; mctx.scene.add(tileRow);
    }
    // ── Temple pillar carvings detail (spiral grooves + dragon wrap) ──
    for (let i = 0; i < 8; i++) {
      const carvPillar = new THREE.Group();
      const cpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 5, 27), jadeMat);
      cpBody.position.y = 2.5; cpBody.castShadow = true; carvPillar.add(cpBody);
      for (let r = 0; r < 8; r++) {
        const groove = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.015, 16, 30), goldMat);
        groove.rotation.x = -Math.PI / 2;
        groove.position.y = 0.5 + r * 0.55; carvPillar.add(groove);
      }
      for (let s = 0; s < 16; s++) {
        const dragonSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.35, 12), jadeMat);
        const dAngle = s * 0.45;
        dragonSeg.position.set(Math.cos(dAngle) * 0.34, 0.3 + s * 0.28, Math.sin(dAngle) * 0.34);
        dragonSeg.rotation.z = Math.cos(dAngle) * 0.3;
        dragonSeg.rotation.x = Math.sin(dAngle) * 0.3; carvPillar.add(dragonSeg);
      }
      const cpx = (Math.random() - 0.5) * w * 0.7, cpz = (Math.random() - 0.5) * d * 0.7;
      carvPillar.position.set(cpx, getTerrainHeight(cpx, cpz, 1.0), cpz); mctx.scene.add(carvPillar);
    }
    // ── Incense burner stations (ornate with smoke column) ──
    for (let i = 0; i < 6; i++) {
      const incStn = new THREE.Group();
      const incBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.25, 23), goldMat);
      incBody.position.y = 0.55; incStn.add(incBody);
      const incBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.35), goldMat);
      incBox.position.y = 0.42; incStn.add(incBox);
      for (let l = 0; l < 3; l++) {
        const la = (l / 3) * Math.PI * 2;
        const tripLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.4, 12), goldMat);
        tripLeg.position.set(Math.cos(la) * 0.15, 0.2, Math.sin(la) * 0.15);
        tripLeg.rotation.z = Math.cos(la) * 0.15;
        tripLeg.rotation.x = -Math.sin(la) * 0.15; incStn.add(tripLeg);
      }
      for (let s = 0; s < 10; s++) {
        const smkOrb = new THREE.Mesh(new THREE.SphereGeometry(0.06 + s * 0.015, 16, 12), smokeMat);
        smkOrb.position.set((Math.random() - 0.5) * 0.08, 0.7 + s * 0.25, (Math.random() - 0.5) * 0.08);
        incStn.add(smkOrb);
      }
      const incLt = new THREE.PointLight(0xff6633, 0.25, 4);
      incLt.position.y = 0.65; incStn.add(incLt); mctx.torchLights.push(incLt);
      const isx = (Math.random() - 0.5) * w * 0.55, isz = (Math.random() - 0.5) * d * 0.55;
      incStn.position.set(isx, getTerrainHeight(isx, isz, 1.0), isz); mctx.scene.add(incStn);
    }
    // ── Jade statue pedestals (lion/dragon statues) ──
    for (let i = 0; i < 4; i++) {
      const jsPed = new THREE.Group();
      const jsPedBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), stoneMat);
      jsPedBase.position.y = 0.15; jsPed.add(jsPedBase);
      const jsTrimT = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), goldMat);
      jsTrimT.position.y = 0.33; jsPed.add(jsTrimT);
      const jsTrimB = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), goldMat);
      jsTrimB.position.y = 0.03; jsPed.add(jsTrimB);
      const jsBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), jadeMat);
      jsBody.position.y = 0.6; jsPed.add(jsBody);
      const jsHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 23, 20), jadeMat);
      jsHead.position.set(0, 0.9, 0.35); jsPed.add(jsHead);
      for (let sp = 0; sp < 6; sp++) {
        const jsSpk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 8), jadeMat);
        const spa = (sp / 6) * Math.PI * 2;
        jsSpk.position.set(Math.cos(spa) * 0.18, 1.0, 0.35 + Math.sin(spa) * 0.18);
        jsSpk.rotation.x = Math.sin(spa) * 0.5;
        jsSpk.rotation.z = Math.cos(spa) * 0.5; jsPed.add(jsSpk);
      }
      const jsx = (Math.random() - 0.5) * w * 0.5, jsz = (Math.random() - 0.5) * d * 0.5;
      jsPed.position.set(jsx, getTerrainHeight(jsx, jsz, 1.0), jsz);
      jsPed.rotation.y = Math.random() * Math.PI; mctx.scene.add(jsPed);
    }
    // ── Prayer bell props (large bells on wooden frames) ──
    for (let i = 0; i < 5; i++) {
      const pbFrm = new THREE.Group();
      const pbP1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 17), redWoodMat);
      pbP1.position.set(-0.5, 1.25, 0); pbFrm.add(pbP1);
      const pbP2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 17), redWoodMat);
      pbP2.position.set(0.5, 1.25, 0); pbFrm.add(pbP2);
      const pbCrs = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 17), redWoodMat);
      pbCrs.rotation.z = Math.PI / 2; pbCrs.position.y = 2.5; pbFrm.add(pbCrs);
      const pbBell = new THREE.Mesh(new THREE.SphereGeometry(0.25, 23, 20, 0, Math.PI * 2, 0, Math.PI * 0.7),
        new THREE.MeshStandardMaterial({ color: 0xbb8844, metalness: 0.6, roughness: 0.3 }));
      pbBell.position.y = 2.1; pbBell.rotation.x = Math.PI; pbFrm.add(pbBell);
      const pbRope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8 }));
      pbRope.position.set(0, 1.3, 0.2); pbFrm.add(pbRope);
      const pbx = (Math.random() - 0.5) * w * 0.5, pbz = (Math.random() - 0.5) * d * 0.5;
      pbFrm.position.set(pbx, getTerrainHeight(pbx, pbz, 1.0), pbz);
      pbFrm.rotation.y = Math.random() * Math.PI; mctx.scene.add(pbFrm);
    }
    // ── Ceremonial weapon displays (wall mounts with crossed polearms) ──
    for (let i = 0; i < 4; i++) {
      const cwD = new THREE.Group();
      const cwMnt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.08), redWoodMat);
      cwD.add(cwMnt);
      const cwMtl = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6, roughness: 0.3 });
      const cwPl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 12), cwMtl);
      cwPl1.rotation.z = 0.3; cwPl1.position.z = 0.06; cwD.add(cwPl1);
      const cwTp1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), cwMtl);
      cwTp1.position.set(Math.sin(0.3) * 0.7, Math.cos(0.3) * 0.7, 0.06); cwD.add(cwTp1);
      const cwPl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 12), cwMtl);
      cwPl2.rotation.z = -0.3; cwPl2.position.z = 0.06; cwD.add(cwPl2);
      const cwTp2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.02), cwMtl);
      cwTp2.position.set(-Math.sin(0.3) * 0.7, Math.cos(0.3) * 0.7, 0.06); cwD.add(cwTp2);
      const cwShld = new THREE.Mesh(new THREE.CircleGeometry(0.2, 23),
        new THREE.MeshStandardMaterial({ color: 0x884422, metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide }));
      cwShld.position.set(0, -0.2, 0.06); cwD.add(cwShld);
      const cwBoss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), goldMat);
      cwBoss.position.set(0, -0.2, 0.1); cwD.add(cwBoss);
      const cwx = (Math.random() - 0.5) * w * 0.5, cwz = (Math.random() - 0.5) * d * 0.5;
      cwD.position.set(cwx, getTerrainHeight(cwx, cwz, 1.0) + 1.8, cwz);
      cwD.rotation.y = Math.random() * Math.PI; mctx.scene.add(cwD);
    }
    // ── Roof tile layers (overlapping thin box rows) ──
    for (let i = 0; i < 4; i++) {
      const rtGrp = new THREE.Group();
      for (let row = 0; row < 6; row++) {
        for (let t = 0; t < 14; t++) {
          const rtTl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.25),
            new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
          rtTl.position.set(-1.2 + t * 0.18 + (row % 2) * 0.09, row * 0.12, row * 0.18);
          rtTl.rotation.x = -0.2; rtGrp.add(rtTl);
        }
      }
      const rtgx = (Math.random() - 0.5) * w * 0.45, rtgz = (Math.random() - 0.5) * d * 0.45;
      rtGrp.position.set(rtgx, getTerrainHeight(rtgx, rtgz, 1.0) + 3 + Math.random() * 2, rtgz);
      rtGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(rtGrp);
    }
    // ── Zen garden ──
    for (let i = 0; i < 2; i++) {
      const zenG = new THREE.Group();
      const zenSand = new THREE.Mesh(new THREE.BoxGeometry(4, 0.06, 3),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.9 }));
      zenG.add(zenSand);
      for (let ln = 0; ln < 20; ln++) {
        const rkLn = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.01, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.9 }));
        rkLn.position.set(0, 0.035, -1.4 + ln * 0.15); zenG.add(rkLn);
      }
      const zenRP: number[][] = [[-0.8, 0], [0.5, 0.6], [1.0, -0.5], [-0.3, -0.8], [0.2, 0.2]];
      for (const rp of zenRP) {
        const zRk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.1, 1), stoneMat);
        zRk.position.set(rp[0], 0.08, rp[1]);
        zRk.rotation.set(Math.random(), Math.random(), Math.random()); zenG.add(zRk);
      }
      const zenBrg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), redWoodMat);
      zenBrg.position.set(1.5, 0.2, 0); zenG.add(zenBrg);
      const zenArc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 12, 20, Math.PI), redWoodMat);
      zenArc.rotation.z = Math.PI / 2; zenArc.rotation.y = Math.PI / 2;
      zenArc.position.set(1.5, 0.12, 0); zenG.add(zenArc);
      const zgx = (Math.random() - 0.5) * w * 0.4, zgz = (Math.random() - 0.5) * d * 0.4;
      zenG.position.set(zgx, getTerrainHeight(zgx, zgz, 1.0) + 0.03, zgz);
      zenG.rotation.y = Math.random() * Math.PI; mctx.scene.add(zenG);
    }
    // ── Koi pond (detailed) ──
    for (let i = 0; i < 2; i++) {
      const kpG = new THREE.Group();
      const kpR = 1.8 + Math.random() * 1.5;
      const kpSf = new THREE.Mesh(new THREE.CircleGeometry(kpR, 36), waterMat);
      kpSf.rotation.x = -Math.PI / 2; kpSf.position.y = -0.05; kpG.add(kpSf);
      const kpRm = new THREE.Mesh(new THREE.TorusGeometry(kpR, 0.1, 17, 40), stoneMat);
      kpRm.rotation.x = -Math.PI / 2; kpRm.position.y = 0.02; kpG.add(kpRm);
      for (let lp = 0; lp < 5; lp++) {
        const lpd = new THREE.Mesh(new THREE.CircleGeometry(0.1 + Math.random() * 0.06, 16), vineMat);
        lpd.rotation.x = -Math.PI / 2;
        lpd.position.set((Math.random() - 0.5) * kpR * 0.8, -0.02, (Math.random() - 0.5) * kpR * 0.8);
        kpG.add(lpd);
      }
      const kCols = [0xff6633, 0xffffff, 0xff4444, 0xffaa22];
      for (let f = 0; f < 4; f++) {
        const kFsh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12),
          new THREE.MeshStandardMaterial({ color: kCols[f % 4] }));
        kFsh.scale.set(1, 0.5, 2.2);
        const kfx = (Math.random() - 0.5) * kpR * 0.6, kfz = (Math.random() - 0.5) * kpR * 0.6;
        kFsh.position.set(kfx, -0.04, kfz); kpG.add(kFsh);
        const kTl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8),
          new THREE.MeshStandardMaterial({ color: kCols[f % 4] }));
        kTl.position.set(kfx, -0.04, kfz - 0.12); kTl.rotation.x = Math.PI / 2; kpG.add(kTl);
      }
      const kpgx = (Math.random() - 0.5) * w * 0.4, kpgz = (Math.random() - 0.5) * d * 0.4;
      kpG.position.set(kpgx, getTerrainHeight(kpgx, kpgz, 1.0), kpgz); mctx.scene.add(kpG);
    }
    // ── Torii gate entrance ──
    for (let i = 0; i < 2; i++) {
      const tGt = new THREE.Group();
      const tgM = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
      const tgP1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 20), tgM);
      tgP1.position.set(-1.2, 2, 0); tGt.add(tgP1);
      const tgP2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 20), tgM);
      tgP2.position.set(1.2, 2, 0); tGt.add(tgP2);
      const tgTp = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.2), tgM);
      tgTp.position.y = 4.0; tGt.add(tgTp);
      const tgCL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), tgM);
      tgCL.position.set(-1.5, 4.1, 0); tgCL.rotation.z = 0.25; tGt.add(tgCL);
      const tgCR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), tgM);
      tgCR.position.set(1.5, 4.1, 0); tgCR.rotation.z = -0.25; tGt.add(tgCR);
      const tgLw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.15), tgM);
      tgLw.position.y = 3.4; tGt.add(tgLw);
      const tgx = (Math.random() - 0.5) * w * 0.5, tgz = (Math.random() - 0.5) * d * 0.5;
      tGt.position.set(tgx, getTerrainHeight(tgx, tgz, 1.0), tgz);
      tGt.rotation.y = Math.random() * Math.PI; mctx.scene.add(tGt);
    }
}

export function buildAshenBattlefield(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x332222, 0.014);
    mctx.applyTerrainColors(0x3a2a22, 0x4a3a33, 1.0);
    mctx.dirLight.color.setHex(0xcc8866);
    mctx.dirLight.intensity = 0.9;
    mctx.ambientLight.color.setHex(0x332211);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x886655);
    mctx.hemiLight.groundColor.setHex(0x221111);

    const ashMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.7 });
    const scorchMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.95 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.06 });
    // Embedded swords in ground
    for (let i = 0; i < 30; i++) {
      const sword = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7+Math.random()*0.5, 0.12), metalMat);
      blade.position.y = 0.3; sword.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), metalMat);
      guard.position.y = 0.05; sword.add(guard);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 17), leatherMat);
      grip.position.y = -0.08; sword.add(grip);
      const wx = (Math.random()-0.5)*w*0.85, wz = (Math.random()-0.5)*d*0.85;
      sword.position.set(wx, getTerrainHeight(wx, wz, 1.0), wz);
      sword.rotation.z = (Math.random()-0.5)*0.5; sword.rotation.x = (Math.random()-0.5)*0.3;
      mctx.scene.add(sword);
    }
    // Embedded shields
    for (let i = 0; i < 15; i++) {
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.2+Math.random()*0.15, 23),
        new THREE.MeshStandardMaterial({ color: [0x884422, 0x444466, 0x446644][i%3], metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide }));
      const sx = (Math.random()-0.5)*w*0.8, sz = (Math.random()-0.5)*d*0.8;
      shield.position.set(sx, getTerrainHeight(sx, sz, 1.0)+0.1+Math.random()*0.2, sz);
      shield.rotation.set(Math.random()*0.5-1.2, Math.random()*Math.PI, Math.random()*0.5);
      mctx.scene.add(shield);
    }
    // Destroyed catapults
    for (let i = 0; i < 3; i++) {
      const catapult = new THREE.Group();
      const cBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1.2), woodMat);
      cBase.position.y = 0.3; catapult.add(cBase);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), woodMat);
      arm.position.set(0, 0.8, 0.5); arm.rotation.x = 0.4+Math.random()*0.3; catapult.add(arm);
      for (const side of [-0.5, 0.5]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 23, 36), woodMat);
        wheel.rotation.y = Math.PI/2; wheel.position.set(side, 0.4, -0.4); catapult.add(wheel);
      }
      // Broken crossbeam
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), woodMat);
      cross.position.y = 1.0; cross.rotation.z = (Math.random()-0.5)*0.5; catapult.add(cross);
      const cx = (Math.random()-0.5)*w*0.6, cz = (Math.random()-0.5)*d*0.6;
      catapult.position.set(cx, getTerrainHeight(cx, cz, 1.0), cz);
      catapult.rotation.y = Math.random()*Math.PI; catapult.rotation.z = (Math.random()-0.5)*0.15;
      mctx.scene.add(catapult);
    }
    // Siege tower remains
    for (let i = 0; i < 2; i++) {
      const tower = new THREE.Group();
      // Frame posts
      for (const tx of [-0.6, 0.6]) { for (const tz of [-0.6, 0.6]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3+Math.random()*2, 0.15), woodMat);
        post.position.set(tx, 1.5, tz); post.rotation.z = (Math.random()-0.5)*0.1; tower.add(post);
      }}
      // Platforms
      for (let p = 0; p < 2; p++) {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), woodMat);
        plat.position.y = 1+p*1.5; tower.add(plat);
      }
      // Broken ladder
      const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 2), woodMat);
      ladder.position.set(0, 1, 1); ladder.rotation.x = 0.5; tower.add(ladder);
      const twx = (Math.random()-0.5)*w*0.5, twz = (Math.random()-0.5)*d*0.5;
      tower.position.set(twx, getTerrainHeight(twx, twz, 1.0), twz);
      tower.rotation.y = Math.random()*Math.PI; tower.rotation.z = (Math.random()-0.5)*0.15;
      mctx.scene.add(tower);
    }
    // Craters with scorched rims
    for (let i = 0; i < 12; i++) {
      const craterR = 1+Math.random()*2;
      const crater = new THREE.Mesh(new THREE.SphereGeometry(craterR, 27, 23), ashMat);
      crater.scale.y = 0.15;
      const crx = (Math.random()-0.5)*w*0.8, crz = (Math.random()-0.5)*d*0.8;
      crater.position.set(crx, getTerrainHeight(crx, crz, 1.0)-0.1, crz); mctx.scene.add(crater);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(craterR, 0.08, 17, 36), scorchMat);
      rim.rotation.x = -Math.PI/2;
      rim.position.set(crx, getTerrainHeight(crx, crz, 1.0)+0.01, crz); mctx.scene.add(rim);
    }
    // Scorched earth patches
    for (let i = 0; i < 20; i++) {
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.5+Math.random()*1.5, 23), scorchMat);
      scorch.rotation.x = -Math.PI/2;
      const sx = (Math.random()-0.5)*w*0.8, sz = (Math.random()-0.5)*d*0.8;
      scorch.position.set(sx, getTerrainHeight(sx, sz, 1.0)+0.01, sz); mctx.scene.add(scorch);
    }
    // Makeshift barricades
    for (let i = 0; i < 8; i++) {
      const barricade = new THREE.Group();
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5+Math.random(), 20), woodMat);
        log.rotation.z = Math.PI/2; log.position.y = 0.15+l*0.2;
        log.position.x = (Math.random()-0.5)*0.3; barricade.add(log);
      }
      // Stakes
      for (let s = 0; s < 2; s++) {
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.0, 17), woodMat);
        stake.position.set(-0.5+s*1.0, 0.5, 0); barricade.add(stake);
      }
      const bx = (Math.random()-0.5)*w*0.7, bz = (Math.random()-0.5)*d*0.7;
      barricade.position.set(bx, getTerrainHeight(bx, bz, 1.0), bz);
      barricade.rotation.y = Math.random()*Math.PI; mctx.scene.add(barricade);
    }
    // Bone piles and fallen warriors
    for (let i = 0; i < 20; i++) {
      const bones = new THREE.Group();
      for (let b = 0; b < 5+Math.floor(Math.random()*4); b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 17), boneMat);
        bone.position.set((Math.random()-0.5)*0.4, 0.05, (Math.random()-0.5)*0.4);
        bone.rotation.set(Math.random(), Math.random(), Math.random()); bones.add(bone);
      }
      // Skull
      if (Math.random() > 0.5) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 17), boneMat);
        skull.position.set((Math.random()-0.5)*0.2, 0.08, (Math.random()-0.5)*0.2); bones.add(skull);
      }
      const bx = (Math.random()-0.5)*w*0.8, bz = (Math.random()-0.5)*d*0.8;
      bones.position.set(bx, getTerrainHeight(bx, bz, 1.0), bz); mctx.scene.add(bones);
    }
    // Fallen warriors (simple geometry)
    for (let i = 0; i < 6; i++) {
      const body = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.8, 20), metalMat);
      torso.rotation.z = Math.PI/2; torso.position.y = 0.1; body.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 36, 17), boneMat);
      head.position.set(0.45, 0.1, 0); body.add(head);
      const fx = (Math.random()-0.5)*w*0.7, fz = (Math.random()-0.5)*d*0.7;
      body.position.set(fx, getTerrainHeight(fx, fz, 1.0), fz);
      body.rotation.y = Math.random()*Math.PI; mctx.scene.add(body);
    }
    // Smoke columns
    for (let i = 0; i < 8; i++) {
      const smokeCol = new THREE.Group();
      for (let s = 0; s < 6; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.3+s*0.15, 20, 17), smokeMat);
        puff.position.y = 0.5+s*0.8; smokeCol.add(puff);
      }
      const sx = (Math.random()-0.5)*w*0.7, sz = (Math.random()-0.5)*d*0.7;
      smokeCol.position.set(sx, getTerrainHeight(sx, sz, 1.0), sz); mctx.scene.add(smokeCol);
    }
    // Smoldering fires with ember beds
    for (let i = 0; i < 10; i++) {
      const fire = new THREE.PointLight(0xff4400, 0.6, 8);
      const fx = (Math.random()-0.5)*w*0.6, fz = (Math.random()-0.5)*d*0.6;
      fire.position.set(fx, getTerrainHeight(fx, fz, 1.0)+0.5, fz);
      mctx.scene.add(fire); mctx.torchLights.push(fire);
      const embers = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 17), emberMat);
      embers.position.copy(fire.position); embers.position.y -= 0.3; mctx.scene.add(embers);
      // Charred logs around fire
      for (let l = 0; l < 3; l++) {
        const cLog = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 17), scorchMat);
        cLog.rotation.z = Math.PI/2;
        cLog.position.set(fx+(Math.random()-0.5)*0.4, getTerrainHeight(fx, fz, 1.0)+0.05, fz+(Math.random()-0.5)*0.4);
        cLog.rotation.y = Math.random()*Math.PI; mctx.scene.add(cLog);
      }
    }
    // Tattered banners
    for (let i = 0; i < 12; i++) {
      const banner = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 17), woodMat);
      pole.position.y = 1.5; banner.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: [0x882222, 0x222288, 0x228822, 0x888822][i%4], side: THREE.DoubleSide, roughness: 0.8 }));
      cloth.position.set(0.35, 2.5, 0); banner.add(cloth);
      // Torn lower edge
      const torn = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3),
        new THREE.MeshStandardMaterial({ color: [0x882222, 0x222288, 0x228822, 0x888822][i%4], side: THREE.DoubleSide, roughness: 0.8 }));
      torn.position.set(0.35, 2.0, 0.05); torn.rotation.z = 0.1; banner.add(torn);
      const bnx = (Math.random()-0.5)*w*0.7, bnz = (Math.random()-0.5)*d*0.7;
      banner.position.set(bnx, getTerrainHeight(bnx, bnz, 1.0), bnz);
      banner.rotation.y = Math.random()*Math.PI; banner.rotation.z = (Math.random()-0.5)*0.25;
      mctx.scene.add(banner);
    }
    // Weapon debris scattered
    for (let i = 0; i < 25; i++) {
      const debris = new THREE.Mesh(new THREE.BoxGeometry(0.05+Math.random()*0.15, 0.02, 0.05+Math.random()*0.1), metalMat);
      const dx = (Math.random()-0.5)*w*0.85, dz = (Math.random()-0.5)*d*0.85;
      debris.position.set(dx, getTerrainHeight(dx, dz, 1.0)+0.02, dz);
      debris.rotation.y = Math.random()*Math.PI; mctx.scene.add(debris);
    }
    // ── Broken weapon fragments (sword/shield pieces) ──
    for (let i = 0; i < 20; i++) {
      const frag = new THREE.Group();
      const bladeFragment = new THREE.Mesh(new THREE.BoxGeometry(0.04 + Math.random()*0.06, 0.02, 0.15 + Math.random()*0.2), metalMat);
      frag.add(bladeFragment);
      if (Math.random() > 0.5) {
        const shieldFrag = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random()*0.1, 0.02, 0.12 + Math.random()*0.08), new THREE.MeshStandardMaterial({ color: 0x664433, metalness: 0.2, roughness: 0.7 }));
        shieldFrag.position.set(0.12, 0, 0.08); shieldFrag.rotation.y = Math.random()*0.5; frag.add(shieldFrag);
      }
      const frx = (Math.random()-0.5)*w*0.8, frz = (Math.random()-0.5)*d*0.8;
      frag.position.set(frx, getTerrainHeight(frx, frz, 1.0) + 0.02, frz);
      frag.rotation.y = Math.random() * Math.PI; mctx.scene.add(frag);
    }
    // ── Siege equipment ruins (battering ram pieces) ──
    for (let i = 0; i < 2; i++) {
      const ram = new THREE.Group();
      const logBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3, 20), woodMat);
      logBody.rotation.z = Math.PI / 2; logBody.position.y = 0.3; ram.add(logBody);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 20), metalMat);
      cap.rotation.z = -Math.PI / 2; cap.position.set(1.7, 0.3, 0); ram.add(cap);
      for (let r = 0; r < 3; r++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 16, 20), metalMat);
        band.rotation.y = Math.PI / 2; band.position.set(-0.8 + r * 0.8, 0.3, 0); ram.add(band);
      }
      const rmx = (Math.random()-0.5)*w*0.5, rmz = (Math.random()-0.5)*d*0.5;
      ram.position.set(rmx, getTerrainHeight(rmx, rmz, 1.0), rmz);
      ram.rotation.y = Math.random() * Math.PI; ram.rotation.z = (Math.random()-0.5)*0.15; mctx.scene.add(ram);
    }
    // ── Crater detail (inner rubble, heat shimmer) ──
    for (let i = 0; i < 8; i++) {
      const crDetail = new THREE.Group();
      for (let r = 0; r < 4; r++) {
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + Math.random()*0.15, 1), ashMat);
        rubble.position.set((Math.random()-0.5)*0.6, 0.05, (Math.random()-0.5)*0.6);
        rubble.rotation.set(Math.random(), Math.random(), Math.random()); crDetail.add(rubble);
      }
      const shimmer = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0xff8844, transparent: true, opacity: 0.04, emissive: 0xff4422, emissiveIntensity: 0.3 }));
      shimmer.position.y = 0.4; crDetail.add(shimmer);
      const cdx = (Math.random()-0.5)*w*0.7, cdz = (Math.random()-0.5)*d*0.7;
      crDetail.position.set(cdx, getTerrainHeight(cdx, cdz, 1.0), cdz); mctx.scene.add(crDetail);
    }

    // ── Dense ground grass ──
    const ashenGrassShades = [
      new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.65, side: THREE.DoubleSide }),
    ];
    for (let gi = 0; gi < 100; gi++) {
      const grassClump = new THREE.Group();
      const bladeCount = 5 + Math.floor(Math.random() * 6);
      for (let bl = 0; bl < bladeCount; bl++) {
        const bladeH = 0.2 + Math.random() * 0.2;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05 + Math.random() * 0.03, bladeH),
          ashenGrassShades[Math.floor(Math.random() * 3)],
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
    // ── Siege engine wreckage ──
    for (let i = 0; i < 3; i++) {
      const siege = new THREE.Group();
      // Frame beams at angles
      for (let b = 0; b < 4; b++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2 + Math.random(), 0.15), woodMat);
        beam.position.set((Math.random()-0.5)*1.5, 0.8, (Math.random()-0.5)*1.0);
        beam.rotation.set((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.6); siege.add(beam);
      }
      // Catapult arm
      const catArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.5), woodMat);
      catArm.position.set(0, 1.2, 0.3); catArm.rotation.x = 0.4; siege.add(catArm);
      // Pivot cylinder
      const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16), metalMat);
      pivot.rotation.z = Math.PI / 2; pivot.position.set(0, 1.0, 0); siege.add(pivot);
      // Scattered stone ammo
      for (let s = 0; s < 4; s++) {
        const stone = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random()*0.1, 12, 10), ashMat);
        stone.position.set((Math.random()-0.5)*3, 0.1, (Math.random()-0.5)*3); siege.add(stone);
      }
      const sgx = (Math.random()-0.5)*w*0.5, sgz = (Math.random()-0.5)*d*0.5;
      siege.position.set(sgx, getTerrainHeight(sgx, sgz, 1.0), sgz);
      siege.rotation.y = Math.random() * Math.PI; mctx.scene.add(siege);
    }
    // ── Defensive trench lines ──
    for (let i = 0; i < 4; i++) {
      const trench = new THREE.Group();
      const trLen = 3 + Math.random() * 4;
      // Trench cut
      const trBox = new THREE.Mesh(new THREE.BoxGeometry(trLen, 0.4, 0.6), scorchMat);
      trBox.position.y = -0.15; trench.add(trBox);
      // Wooden stake defenses
      for (let s = 0; s < 6; s++) {
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.6, 8), woodMat);
        stake.position.set(-trLen/2 + s * trLen/6 + Math.random()*0.2, 0.2, 0.35);
        stake.rotation.x = -0.4; trench.add(stake);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 8), woodMat);
        tip.position.copy(stake.position); tip.position.y += 0.3; tip.rotation.x = -0.4; trench.add(tip);
      }
      // Sandbag walls
      for (let sb = 0; sb < 3; sb++) {
        for (let sr = 0; sr < 2; sr++) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), ashMat);
          bag.position.set(-0.3 + sb * 0.32, 0.06 + sr * 0.13, -0.4); trench.add(bag);
        }
      }
      const trx = (Math.random()-0.5)*w*0.7, trz = (Math.random()-0.5)*d*0.7;
      trench.position.set(trx, getTerrainHeight(trx, trz, 1.0), trz);
      trench.rotation.y = Math.random() * Math.PI; mctx.scene.add(trench);
    }
    // ── War banner remnants ──
    for (let i = 0; i < 8; i++) {
      const wBanner = new THREE.Group();
      const poleH = 1 + Math.random() * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, poleH, 12), woodMat);
      pole.position.y = poleH / 2; wBanner.add(pole);
      const clothW = 0.4 + Math.random() * 0.3;
      const clothH = 0.3 + Math.random() * 0.4;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(clothW, clothH),
        new THREE.MeshStandardMaterial({ color: [0x993333, 0x333399][i % 2], side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.8 }));
      cloth.position.set(clothW/2, poleH * 0.7, 0); wBanner.add(cloth);
      const bx2 = (Math.random()-0.5)*w*0.75, bz2 = (Math.random()-0.5)*d*0.75;
      wBanner.position.set(bx2, getTerrainHeight(bx2, bz2, 1.0), bz2);
      wBanner.rotation.y = Math.random() * Math.PI;
      wBanner.rotation.z = (Math.random()-0.5)*0.4; mctx.scene.add(wBanner);
    }
    // ── Shield wall debris ──
    for (let i = 0; i < 6; i++) {
      const shieldPile = new THREE.Group();
      const shN = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < shN; s++) {
        const sh = new THREE.Group();
        const shFace = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random()*0.08, 20),
          new THREE.MeshStandardMaterial({ color: [0x884422, 0x444466, 0x446644][s % 3], metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide }));
        sh.add(shFace);
        const shHandle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), leatherMat);
        shHandle.position.z = -0.02; sh.add(shHandle);
        const shBoss = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), metalMat);
        shBoss.position.z = 0.02; sh.add(shBoss);
        sh.position.set((Math.random()-0.5)*0.5, 0.05 + Math.random()*0.15, (Math.random()-0.5)*0.5);
        sh.rotation.set(Math.random()-0.5, Math.random() * Math.PI, Math.random()-0.5);
        shieldPile.add(sh);
      }
      const spx = (Math.random()-0.5)*w*0.7, spz = (Math.random()-0.5)*d*0.7;
      shieldPile.position.set(spx, getTerrainHeight(spx, spz, 1.0), spz); mctx.scene.add(shieldPile);
    }
    // ── Scorched earth craters (detailed) ──
    for (let i = 0; i < 10; i++) {
      const crGrp = new THREE.Group();
      const crR = 0.5 + Math.random() * 1.0;
      const crPatch = new THREE.Mesh(new THREE.CircleGeometry(crR, 20), scorchMat);
      crPatch.rotation.x = -Math.PI / 2; crGrp.add(crPatch);
      const crRim = new THREE.Mesh(new THREE.TorusGeometry(crR, 0.06, 10, 24), scorchMat);
      crRim.rotation.x = -Math.PI / 2; crRim.position.y = 0.02; crGrp.add(crRim);
      for (let r = 0; r < 4; r++) {
        const rubble = Math.random() > 0.5
          ? new THREE.Mesh(new THREE.BoxGeometry(0.06+Math.random()*0.08, 0.04, 0.06+Math.random()*0.06), ashMat)
          : new THREE.Mesh(new THREE.SphereGeometry(0.03+Math.random()*0.04, 8, 6), ashMat);
        rubble.position.set((Math.random()-0.5)*crR, 0.03, (Math.random()-0.5)*crR); crGrp.add(rubble);
      }
      if (Math.random() > 0.5) {
        const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random()*0.1, 12, 8), smokeMat);
        smoke.position.y = 0.2; crGrp.add(smoke);
      }
      const crx2 = (Math.random()-0.5)*w*0.75, crz2 = (Math.random()-0.5)*d*0.75;
      crGrp.position.set(crx2, getTerrainHeight(crx2, crz2, 1.0), crz2); mctx.scene.add(crGrp);
    }
    // ── Weapon graveyard ──
    for (let i = 0; i < 4; i++) {
      const wpnGrp = new THREE.Group();
      // Swords stuck in ground
      for (let s = 0; s < 5; s++) {
        const swrd = new THREE.Group();
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5+Math.random()*0.3, 0.08), metalMat);
        bl.position.y = 0.2; swrd.add(bl);
        const grd = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.025), metalMat);
        grd.position.y = 0.02; swrd.add(grd);
        swrd.position.set((Math.random()-0.5)*1.0, 0, (Math.random()-0.5)*1.0);
        swrd.rotation.z = (Math.random()-0.5)*0.2; wpnGrp.add(swrd);
      }
      // Spears at angles
      for (let s = 0; s < 3; s++) {
        const spr = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 1.5, 8), woodMat);
        spr.position.set((Math.random()-0.5)*1.2, 0.5, (Math.random()-0.5)*1.0);
        spr.rotation.set((Math.random()-0.5)*0.8, 0, (Math.random()-0.5)*0.6); wpnGrp.add(spr);
      }
      // Broken axes
      for (let a = 0; a < 2; a++) {
        const axGrp = new THREE.Group();
        const axHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.6, 8), woodMat);
        axGrp.add(axHandle);
        const axHead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.03), metalMat);
        axHead.position.y = 0.25; axGrp.add(axHead);
        axGrp.position.set((Math.random()-0.5)*0.8, 0.05, (Math.random()-0.5)*0.8);
        axGrp.rotation.z = Math.PI/2 + (Math.random()-0.5)*0.3; wpnGrp.add(axGrp);
      }
      const wgx = (Math.random()-0.5)*w*0.6, wgz = (Math.random()-0.5)*d*0.6;
      wpnGrp.position.set(wgx, getTerrainHeight(wgx, wgz, 1.0), wgz); mctx.scene.add(wpnGrp);
    }
    // ── Fallen war horse props ──
    for (let i = 0; i < 3; i++) {
      const horse = new THREE.Group();
      // Box body
      const hBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.4), leatherMat);
      hBody.position.y = 0.15; horse.add(hBody);
      // Cylinder legs
      for (let l = 0; l < 4; l++) {
        const hLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 10), leatherMat);
        hLeg.position.set(-0.4 + (l%2)*0.8, 0, -0.12 + Math.floor(l/2)*0.24);
        hLeg.rotation.z = 0.3 + Math.random()*0.3; horse.add(hLeg);
      }
      // Sphere head
      const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), leatherMat);
      hHead.position.set(0.7, 0.2, 0); horse.add(hHead);
      // Armor plates
      for (let ap = 0; ap < 3; ap++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.35), metalMat);
        plate.position.set(-0.3 + ap * 0.3, 0.42, 0); horse.add(plate);
      }
      const hx = (Math.random()-0.5)*w*0.5, hz = (Math.random()-0.5)*d*0.5;
      horse.position.set(hx, getTerrainHeight(hx, hz, 1.0), hz);
      horse.rotation.y = Math.random() * Math.PI;
      horse.rotation.z = 0.1; mctx.scene.add(horse);
    }
    // ── Watchtower ruins ──
    for (let i = 0; i < 2; i++) {
      const tower2 = new THREE.Group();
      const tH = 4 + Math.random() * 2;
      // Cylinder tower (broken top)
      const tBody = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, tH, 20), ashMat);
      tBody.position.y = tH / 2; tBody.castShadow = true; tower2.add(tBody);
      // Spiral stairs inside
      for (let st = 0; st < 8; st++) {
        const stA = (st / 8) * Math.PI * 2;
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.2), ashMat);
        step.position.set(Math.cos(stA)*0.4, st * tH/10 + 0.5, Math.sin(stA)*0.4);
        step.rotation.y = stA; tower2.add(step);
      }
      // Remaining platform
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 20), ashMat);
      plat.position.y = tH * 0.7; tower2.add(plat);
      // Fallen rubble around base
      for (let rb = 0; rb < 8; rb++) {
        const rub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random()*0.2, 1), ashMat);
        rub.position.set((Math.random()-0.5)*2.5, 0.1, (Math.random()-0.5)*2.5);
        rub.rotation.set(Math.random(), Math.random(), Math.random()); tower2.add(rub);
      }
      const tw2x = (Math.random()-0.5)*w*0.4, tw2z = (Math.random()-0.5)*d*0.4;
      tower2.position.set(tw2x, getTerrainHeight(tw2x, tw2z, 1.0), tw2z);
      tower2.rotation.y = Math.random() * Math.PI; mctx.scene.add(tower2);
    }

}

export function buildFungalDepths(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x112211, 0.02);
    mctx.applyTerrainColors(0x1a2a11, 0x2a3a22, 0.6);
    mctx.dirLight.color.setHex(0x88aa44);
    mctx.dirLight.intensity = 0.5;
    mctx.ambientLight.color.setHex(0x223311);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x558833);
    mctx.hemiLight.groundColor.setHex(0x111a00);

    const sporeMat = new THREE.MeshStandardMaterial({ color: 0xaaff44, emissive: 0x44aa00, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 });
    const acidMat = new THREE.MeshStandardMaterial({ color: 0x88ff22, emissive: 0x44cc00, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
    const myceliumMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, transparent: true, opacity: 0.3 });
    const glowFungMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22cc66, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
    const mushCapColors = [0xcc4444, 0x44aacc, 0xaa44cc, 0xccaa44, 0x44cc88, 0xcc6644];
    // Giant mushrooms (varied types)
    for (let i = 0; i < 30; i++) {
      const mush = new THREE.Group();
      const h = 2+Math.random()*5;
      const stemR = 0.15+Math.random()*0.15;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(stemR*0.7, stemR, h, 23), stemMat);
      stem.position.y = h/2; stem.castShadow = true; mush.add(stem);
      // Texture bumps on stem
      for (let b = 0; b < 3; b++) {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(stemR*0.4, 30, 16), stemMat);
        const bA = Math.random()*Math.PI*2;
        bump.position.set(Math.cos(bA)*stemR*0.9, h*0.2+b*h*0.25, Math.sin(bA)*stemR*0.9);
        bump.scale.set(1, 0.6, 1); mush.add(bump);
      }
      const capR = 0.5+Math.random()*1.8;
      const capColor = mushCapColors[i % mushCapColors.length];
      const cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 27, 23),
        new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.4 }));
      cap.scale.y = 0.35; cap.position.y = h; mush.add(cap);
      // Spots on cap
      for (let s = 0; s < 4; s++) {
        const spot = new THREE.Mesh(new THREE.CircleGeometry(capR*0.08, 20),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
        const sA = Math.random()*Math.PI*2;
        spot.position.set(Math.cos(sA)*capR*0.5, h+0.12, Math.sin(sA)*capR*0.5);
        spot.rotation.x = -Math.PI/2; mush.add(spot);
      }
      // Gills underneath cap
      const gills = new THREE.Mesh(new THREE.CylinderGeometry(capR*0.8, capR*0.3, 0.1, 36),
        new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.6 }));
      gills.position.y = h-0.08; mush.add(gills);
      const mx = (Math.random()-0.5)*w*0.85, mz = (Math.random()-0.5)*d*0.85;
      mush.position.set(mx, getTerrainHeight(mx, mz, 0.6), mz); mctx.scene.add(mush);
    }
    // Small bioluminescent fungi clusters
    for (let i = 0; i < 40; i++) {
      const cluster = new THREE.Group();
      const count = 2+Math.floor(Math.random()*4);
      for (let c = 0; c < count; c++) {
        const tiny = new THREE.Group();
        const tH = 0.08+Math.random()*0.12;
        const tStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, tH, 16), stemMat);
        tStem.position.y = tH/2; tiny.add(tStem);
        const tCap = new THREE.Mesh(new THREE.SphereGeometry(0.03+Math.random()*0.02, 30, 16), glowFungMat);
        tCap.scale.y = 0.5; tCap.position.y = tH; tiny.add(tCap);
        tiny.position.set((Math.random()-0.5)*0.15, 0, (Math.random()-0.5)*0.15);
        cluster.add(tiny);
      }
      const cx = (Math.random()-0.5)*w*0.8, cz = (Math.random()-0.5)*d*0.8;
      cluster.position.set(cx, getTerrainHeight(cx, cz, 0.6), cz); mctx.scene.add(cluster);
    }
    // Mushroom bridges (connecting large caps)
    for (let i = 0; i < 4; i++) {
      const bridge = new THREE.Group();
      const bLen = 3+Math.random()*3;
      const bStem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 23), stemMat);
      bStem1.position.set(-bLen/2, 2, 0); bridge.add(bStem1);
      const bStem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 23), stemMat);
      bStem2.position.set(bLen/2, 2, 0); bridge.add(bStem2);
      const bCap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, bLen, 23), stemMat);
      bCap.rotation.z = Math.PI/2; bCap.position.y = 2.2; bridge.add(bCap);
      const bx = (Math.random()-0.5)*w*0.5, bz = (Math.random()-0.5)*d*0.5;
      bridge.position.set(bx, getTerrainHeight(bx, bz, 0.6), bz);
      bridge.rotation.y = Math.random()*Math.PI; mctx.scene.add(bridge);
    }
    // Spore clouds (floating clusters)
    for (let i = 0; i < 20; i++) {
      const cloud = new THREE.Group();
      for (let s = 0; s < 3+Math.floor(Math.random()*3); s++) {
        const spore = new THREE.Mesh(new THREE.SphereGeometry(0.15+Math.random()*0.25, 20, 17), sporeMat);
        spore.position.set((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.5);
        cloud.add(spore);
      }
      cloud.position.set((Math.random()-0.5)*w*0.7, 0.5+Math.random()*4, (Math.random()-0.5)*d*0.7);
      mctx.scene.add(cloud);
    }
    // Fungal growths on walls (vertical shelf fungi)
    for (let i = 0; i < 25; i++) {
      const shelf = new THREE.Mesh(new THREE.SphereGeometry(0.15+Math.random()*0.2, 20, 17),
        new THREE.MeshStandardMaterial({ color: mushCapColors[i%mushCapColors.length], roughness: 0.5 }));
      shelf.scale.set(1, 0.3, 1);
      const sx = (Math.random()-0.5)*w*0.8, sz = (Math.random()-0.5)*d*0.8;
      shelf.position.set(sx, getTerrainHeight(sx, sz, 0.6)+0.5+Math.random()*2, sz);
      shelf.rotation.z = (Math.random()-0.5)*0.5; mctx.scene.add(shelf);
    }
    // Acid pools
    for (let i = 0; i < 5; i++) {
      const acidR = 0.8+Math.random()*1.5;
      const acid = new THREE.Mesh(new THREE.CircleGeometry(acidR, 30), acidMat);
      acid.rotation.x = -Math.PI/2;
      const ax = (Math.random()-0.5)*w*0.5, az = (Math.random()-0.5)*d*0.5;
      acid.position.set(ax, getTerrainHeight(ax, az, 0.6)+0.02, az); mctx.scene.add(acid);
      // Bubbling
      for (let b = 0; b < 3; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.03+Math.random()*0.03, 17, 16), acidMat);
        bubble.position.set(ax+(Math.random()-0.5)*acidR, getTerrainHeight(ax, az, 0.6)+0.06, az+(Math.random()-0.5)*acidR);
        mctx.scene.add(bubble);
      }
    }
    // Bioluminescent pools
    for (let i = 0; i < 6; i++) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1+Math.random()*2, 36),
        new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22aa44, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 }));
      pool.rotation.x = -Math.PI/2;
      const px = (Math.random()-0.5)*w*0.6, pz = (Math.random()-0.5)*d*0.6;
      pool.position.set(px, getTerrainHeight(px, pz, 0.6)+0.02, pz); mctx.scene.add(pool);
      const pLight = new THREE.PointLight(0x44ff88, 0.4, 6);
      pLight.position.set(px, getTerrainHeight(px, pz, 0.6)+0.3, pz);
      mctx.scene.add(pLight); mctx.torchLights.push(pLight);
    }
    // Mycelium network on ground
    for (let i = 0; i < 35; i++) {
      const web = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 1+Math.random()*2, 16), myceliumMat);
      const wx = (Math.random()-0.5)*w*0.8, wz = (Math.random()-0.5)*d*0.8;
      web.position.set(wx, getTerrainHeight(wx, wz, 0.6)+0.02, wz);
      web.rotation.x = Math.PI/2; web.rotation.y = Math.random()*Math.PI; mctx.scene.add(web);
    }
    // Hanging mycelium strands (aerial)
    for (let i = 0; i < 20; i++) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 1.5+Math.random()*3, 16), myceliumMat);
      strand.position.set((Math.random()-0.5)*w*0.7, 2+Math.random()*3, (Math.random()-0.5)*d*0.7);
      strand.rotation.set(Math.random()*0.3, Math.random(), Math.random()*0.3); mctx.scene.add(strand);
    }
    // Mushroom colonies (dense clusters)
    for (let i = 0; i < 6; i++) {
      const colX = (Math.random()-0.5)*w*0.6, colZ = (Math.random()-0.5)*d*0.6;
      for (let m = 0; m < 6+Math.floor(Math.random()*4); m++) {
        const mush = new THREE.Group();
        const h = 0.3+Math.random()*1.0;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h, 17), stemMat);
        stem.position.y = h/2; mush.add(stem);
        const capR = 0.1+Math.random()*0.2;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 36, 17),
          new THREE.MeshStandardMaterial({ color: mushCapColors[Math.floor(Math.random()*mushCapColors.length)], roughness: 0.4 }));
        cap.scale.y = 0.4; cap.position.y = h; mush.add(cap);
        const mmx = colX+(Math.random()-0.5)*1.5, mmz = colZ+(Math.random()-0.5)*1.5;
        mush.position.set(mmx, getTerrainHeight(mmx, mmz, 0.6), mmz); mctx.scene.add(mush);
      }
    }
    // ── Giant mushroom cap gill detail (radial thin planes underneath) ──
    for (let i = 0; i < 15; i++) {
      const gillGrp = new THREE.Group();
      const gillR = 0.5 + Math.random() * 1.0;
      const gillCount = 12 + Math.floor(Math.random() * 8);
      for (let g = 0; g < gillCount; g++) {
        const gill = new THREE.Mesh(new THREE.PlaneGeometry(gillR, 0.08), new THREE.MeshStandardMaterial({ color: 0xddccbb, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
        gill.rotation.y = (g / gillCount) * Math.PI;
        gillGrp.add(gill);
      }
      const gmx = (Math.random()-0.5)*w*0.7, gmz = (Math.random()-0.5)*d*0.7;
      gillGrp.position.set(gmx, getTerrainHeight(gmx, gmz, 0.6) + 2 + Math.random() * 3, gmz);
      mctx.scene.add(gillGrp);
    }
    // ── Bioluminescent vein patterns on ground ──
    for (let i = 0; i < 20; i++) {
      const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 1.5 + Math.random() * 2.5, 16), glowFungMat);
      const vx = (Math.random()-0.5)*w*0.8, vz = (Math.random()-0.5)*d*0.8;
      vein.position.set(vx, getTerrainHeight(vx, vz, 0.6) + 0.02, vz);
      vein.rotation.x = Math.PI / 2; vein.rotation.y = Math.random() * Math.PI; mctx.scene.add(vein);
      if (Math.random() > 0.5) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.5 + Math.random() * 0.8, 16), glowFungMat);
        branch.position.set(vx + (Math.random()-0.5)*0.3, getTerrainHeight(vx, vz, 0.6) + 0.02, vz + (Math.random()-0.5)*0.3);
        branch.rotation.x = Math.PI / 2; branch.rotation.y = Math.random() * Math.PI; mctx.scene.add(branch);
      }
    }
    // ── Fungal shelf brackets on walls ──
    for (let i = 0; i < 18; i++) {
      const shelf = new THREE.Group();
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.12 + Math.random()*0.1, 0.06, 0.04, 20), new THREE.MeshStandardMaterial({ color: mushCapColors[i % mushCapColors.length], roughness: 0.5 }));
      bracket.rotation.x = -0.3; shelf.add(bracket);
      const underRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 16, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.6 }));
      underRim.position.y = -0.02; underRim.rotation.x = Math.PI / 2; shelf.add(underRim);
      const sfx = (Math.random()-0.5)*w*0.8, sfz = (Math.random()-0.5)*d*0.8;
      shelf.position.set(sfx, getTerrainHeight(sfx, sfz, 0.6) + 0.8 + Math.random() * 2.5, sfz);
      shelf.rotation.y = Math.random() * Math.PI; mctx.scene.add(shelf);
    }
    // ── Giant mushroom trees (tall thick stalks with large caps, gills, bioluminescent spots) ──
    for (let i = 0; i < 8; i++) {
      const giantTree = new THREE.Group();
      const treeH = 4 + Math.random() * 4;
      const trunkR = 0.3 + Math.random() * 0.2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.8, trunkR, treeH, 24), stemMat);
      trunk.position.y = treeH / 2; trunk.castShadow = true; giantTree.add(trunk);
      // Bark texture bumps along trunk
      for (let b = 0; b < 6; b++) {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(trunkR * 0.35, 16, 12), stemMat);
        const kA = Math.random() * Math.PI * 2;
        knot.position.set(Math.cos(kA) * trunkR * 0.85, treeH * 0.15 + b * treeH * 0.13, Math.sin(kA) * trunkR * 0.85);
        knot.scale.set(1, 0.5, 1); giantTree.add(knot);
      }
      // Large half-sphere cap
      const capR = 1.5 + Math.random() * 2.0;
      const capColor = mushCapColors[i % mushCapColors.length];
      const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.35 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      cap.position.y = treeH; giantTree.add(cap);
      // Gill detail underneath cap (radial thin planes hanging from cap edge)
      const gillCount = 16 + Math.floor(Math.random() * 8);
      for (let g = 0; g < gillCount; g++) {
        const gillPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(capR * 0.85, 0.15 + Math.random() * 0.1),
          new THREE.MeshStandardMaterial({ color: 0xddccbb, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
        );
        gillPlane.rotation.y = (g / gillCount) * Math.PI;
        gillPlane.position.y = treeH - 0.1; giantTree.add(gillPlane);
      }
      // Bioluminescent spots on cap surface (small emissive spheres)
      for (let s = 0; s < 6 + Math.floor(Math.random() * 5); s++) {
        const spotA = Math.random() * Math.PI * 2;
        const spotR = Math.random() * capR * 0.7;
        const spotElev = Math.sqrt(Math.max(0, capR * capR - spotR * spotR)) * 0.5;
        const bioSpot = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 12, 8), glowFungMat);
        bioSpot.position.set(Math.cos(spotA) * spotR, treeH + spotElev, Math.sin(spotA) * spotR);
        giantTree.add(bioSpot);
      }
      const gtx = (Math.random() - 0.5) * w * 0.75, gtz = (Math.random() - 0.5) * d * 0.75;
      giantTree.position.set(gtx, getTerrainHeight(gtx, gtz, 0.6), gtz); mctx.scene.add(giantTree);
    }
    // ── Mycelium web networks on ground (branching cylinder networks with node spheres) ──
    for (let i = 0; i < 15; i++) {
      const webNet = new THREE.Group();
      const nodeCount = 4 + Math.floor(Math.random() * 4);
      const nodes: THREE.Vector3[] = [];
      for (let n = 0; n < nodeCount; n++) {
        const nx = (Math.random() - 0.5) * 2.5, nz = (Math.random() - 0.5) * 2.5;
        nodes.push(new THREE.Vector3(nx, 0, nz));
        const nodeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.5 }));
        nodeSphere.position.set(nx, 0.01, nz); webNet.add(nodeSphere);
      }
      // Connect nodes with thin cylinders
      for (let n = 0; n < nodeCount - 1; n++) {
        const a = nodes[n], b = nodes[n + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, dist, 8), myceliumMat);
        strand.position.set((a.x + b.x) / 2, 0.01, (a.z + b.z) / 2);
        strand.rotation.x = Math.PI / 2;
        strand.rotation.y = Math.atan2(dx, dz);
        webNet.add(strand);
      }
      const wnx = (Math.random() - 0.5) * w * 0.8, wnz = (Math.random() - 0.5) * d * 0.8;
      webNet.position.set(wnx, getTerrainHeight(wnx, wnz, 0.6) + 0.01, wnz); mctx.scene.add(webNet);
    }
    // ── Spore cloud clusters (floating translucent emissive spheres with glow) ──
    for (let i = 0; i < 12; i++) {
      const sporeCluster = new THREE.Group();
      const sporeCount = 8 + Math.floor(Math.random() * 10);
      for (let s = 0; s < sporeCount; s++) {
        const sp = new THREE.Mesh(
          new THREE.SphereGeometry(0.02 + Math.random() * 0.04, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xccff66, emissive: 0x88cc22, emissiveIntensity: 0.8, transparent: true, opacity: 0.3 + Math.random() * 0.3 })
        );
        sp.position.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.2);
        sporeCluster.add(sp);
      }
      const spLight = new THREE.PointLight(0x88cc22, 0.2, 3);
      sporeCluster.add(spLight); mctx.torchLights.push(spLight);
      sporeCluster.position.set((Math.random() - 0.5) * w * 0.7, 1.0 + Math.random() * 4, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(sporeCluster);
    }
    // ── Fungal shelf brackets on walls/trees (half-circle shelves, varied colors) ──
    for (let i = 0; i < 20; i++) {
      const shelfBracket = new THREE.Group();
      const bracketR = 0.12 + Math.random() * 0.15;
      const shelfColors = [0x8B4513, 0xCC6633, 0xA0522D, 0xD2691E, 0x996633];
      const bracketBody = new THREE.Mesh(
        new THREE.SphereGeometry(bracketR, 20, 16, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: shelfColors[i % shelfColors.length], roughness: 0.6 })
      );
      bracketBody.scale.y = 0.3;
      bracketBody.rotation.y = Math.PI / 2;
      shelfBracket.add(bracketBody);
      // Underside rings
      const underTorus = new THREE.Mesh(new THREE.TorusGeometry(bracketR * 0.7, 0.006, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.5 }));
      underTorus.position.y = -bracketR * 0.12; underTorus.rotation.x = Math.PI / 2; shelfBracket.add(underTorus);
      const sbx = (Math.random() - 0.5) * w * 0.85, sbz = (Math.random() - 0.5) * d * 0.85;
      shelfBracket.position.set(sbx, getTerrainHeight(sbx, sbz, 0.6) + 0.6 + Math.random() * 3, sbz);
      shelfBracket.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(shelfBracket);
    }
    // ── Bioluminescent pools (flat glowing water with surrounding small mushrooms) ──
    for (let i = 0; i < 6; i++) {
      const bioPool = new THREE.Group();
      const poolR = 0.8 + Math.random() * 1.5;
      const poolSurface = new THREE.Mesh(new THREE.CircleGeometry(poolR, 36),
        new THREE.MeshStandardMaterial({ color: 0x22ffaa, emissive: 0x11cc88, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 }));
      poolSurface.rotation.x = -Math.PI / 2; bioPool.add(poolSurface);
      // Surrounding small glowing mushrooms
      const surroundCount = 5 + Math.floor(Math.random() * 5);
      for (let m = 0; m < surroundCount; m++) {
        const angle = (m / surroundCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = poolR + 0.1 + Math.random() * 0.3;
        const smallMush = new THREE.Group();
        const smH = 0.06 + Math.random() * 0.1;
        const smStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, smH, 8), stemMat);
        smStem.position.y = smH / 2; smallMush.add(smStem);
        const smCap = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.015, 12, 8), glowFungMat);
        smCap.scale.y = 0.5; smCap.position.y = smH; smallMush.add(smCap);
        smallMush.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        bioPool.add(smallMush);
      }
      const bpLight = new THREE.PointLight(0x22ffaa, 0.5, 5);
      bpLight.position.y = 0.2; bioPool.add(bpLight); mctx.torchLights.push(bpLight);
      const bpx = (Math.random() - 0.5) * w * 0.55, bpz = (Math.random() - 0.5) * d * 0.55;
      bioPool.position.set(bpx, getTerrainHeight(bpx, bpz, 0.6) + 0.01, bpz); mctx.scene.add(bioPool);
    }
    // ── Rotting log bridges (horizontal cylinders with mushroom growths and moss) ──
    for (let i = 0; i < 4; i++) {
      const logBridge = new THREE.Group();
      const logLen = 4 + Math.random() * 4;
      const logR = 0.2 + Math.random() * 0.15;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(logR * 0.9, logR, logLen, 20), new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8 }));
      log.rotation.z = Math.PI / 2; log.position.y = logR + 0.5; log.castShadow = true; logBridge.add(log);
      // Mushroom growths on log
      for (let m = 0; m < 4 + Math.floor(Math.random() * 4); m++) {
        const logMush = new THREE.Group();
        const lmH = 0.05 + Math.random() * 0.08;
        const lmStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, lmH, 8), stemMat);
        lmStem.position.y = lmH / 2; logMush.add(lmStem);
        const lmCap = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 12, 8),
          new THREE.MeshStandardMaterial({ color: mushCapColors[Math.floor(Math.random() * mushCapColors.length)], roughness: 0.4 }));
        lmCap.scale.y = 0.4; lmCap.position.y = lmH; logMush.add(lmCap);
        logMush.position.set((Math.random() - 0.5) * logLen * 0.8, logR + 0.5 + logR * 0.6, (Math.random() - 0.5) * logR * 0.8);
        logBridge.add(logMush);
      }
      // Moss patches (flat green cylinders)
      for (let p = 0; p < 3; p++) {
        const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.08 + Math.random() * 0.06, 0.1, 0.01, 12),
          new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.9 }));
        moss.position.set((Math.random() - 0.5) * logLen * 0.6, logR + 0.5 + logR * 0.65, (Math.random() - 0.5) * logR * 0.6);
        logBridge.add(moss);
      }
      const lbx = (Math.random() - 0.5) * w * 0.5, lbz = (Math.random() - 0.5) * d * 0.5;
      logBridge.position.set(lbx, getTerrainHeight(lbx, lbz, 0.6), lbz);
      logBridge.rotation.y = Math.random() * Math.PI; mctx.scene.add(logBridge);
    }
    // ── Toxic gas vents (cylinder openings with translucent green clouds and green PointLight) ──
    for (let i = 0; i < 8; i++) {
      const vent = new THREE.Group();
      const ventPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.7 }));
      ventPipe.position.y = 0.07; vent.add(ventPipe);
      // Translucent green gas cloud above
      for (let g = 0; g < 5 + Math.floor(Math.random() * 4); g++) {
        const gasBall = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0x66ff22, emissive: 0x44aa11, emissiveIntensity: 0.4, transparent: true, opacity: 0.15 + Math.random() * 0.15 }));
        gasBall.position.set((Math.random() - 0.5) * 0.2, 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 0.2);
        vent.add(gasBall);
      }
      const ventLight = new THREE.PointLight(0x44aa11, 0.25, 3);
      ventLight.position.y = 0.4; vent.add(ventLight); mctx.torchLights.push(ventLight);
      const vx = (Math.random() - 0.5) * w * 0.7, vz = (Math.random() - 0.5) * d * 0.7;
      vent.position.set(vx, getTerrainHeight(vx, vz, 0.6), vz); mctx.scene.add(vent);
    }
}

export function buildObsidianFortress(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x0a0505, 0.018);
    mctx.applyTerrainColors(0x111111, 0x222222, 0.5);
    mctx.dirLight.color.setHex(0xff6633);
    mctx.dirLight.intensity = 0.6;
    mctx.ambientLight.color.setHex(0x110505);
    mctx.ambientLight.intensity = 0.3;
    mctx.hemiLight.color.setHex(0x442222);
    mctx.hemiLight.groundColor.setHex(0x0a0000);

    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.5 });
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 });
    const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x221133, emissive: 0x110022, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.4 });
    const shadowFlameMat = new THREE.MeshStandardMaterial({ color: 0x6622cc, emissive: 0x4411aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 });
    const darkPoolMat = new THREE.MeshStandardMaterial({ color: 0x0a0015, emissive: 0x050008, emissiveIntensity: 0.3, transparent: true, opacity: 0.7, metalness: 0.5, roughness: 0.1 });
    // Obsidian walls with angular shapes
    for (let i = 0; i < 25; i++) {
      const wall = new THREE.Group();
      const blockH = 2+Math.random()*4;
      const blockW = 1+Math.random()*2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(blockW, blockH, 0.8+Math.random()*1.5), obsidianMat);
      block.position.y = blockH/2; block.castShadow = true; wall.add(block);
      // Beveled top edge
      const bevel = new THREE.Mesh(new THREE.BoxGeometry(blockW*0.8, 0.2, 0.6), obsidianMat);
      bevel.position.y = blockH+0.1; bevel.rotation.z = 0.05; wall.add(bevel);
      // Reflective edge highlight
      if (Math.random() > 0.5) {
        const edge = new THREE.Mesh(new THREE.PlaneGeometry(blockW, blockH),
          new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.8, roughness: 0.1 }));
        edge.position.set(0, blockH/2, 0.42+Math.random()*0.3); wall.add(edge);
      }
      const bx = (Math.random()-0.5)*w*0.8, bz = (Math.random()-0.5)*d*0.8;
      wall.position.set(bx, getTerrainHeight(bx, bz, 0.5), bz);
      wall.rotation.y = Math.random()*Math.PI; mctx.scene.add(wall);
    }
    // Dark crystal formations
    for (let i = 0; i < 18; i++) {
      const cluster = new THREE.Group();
      const crystalCount = 3+Math.floor(Math.random()*4);
      for (let c = 0; c < crystalCount; c++) {
        const cH = 0.5+Math.random()*2;
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.08+Math.random()*0.12, cH, 20), crystalMat);
        crystal.position.set((Math.random()-0.5)*0.4, cH/2, (Math.random()-0.5)*0.4);
        crystal.rotation.z = (Math.random()-0.5)*0.3; cluster.add(crystal);
      }
      const cx = (Math.random()-0.5)*w*0.7, cz = (Math.random()-0.5)*d*0.7;
      cluster.position.set(cx, getTerrainHeight(cx, cz, 0.5), cz); mctx.scene.add(cluster);
    }
    // Shadow flame sconces
    for (let i = 0; i < 12; i++) {
      const sconce = new THREE.Group();
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), darkIronMat);
      bracket.position.y = 1.5; sconce.add(bracket);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.1, 23), darkIronMat);
      bowl.position.y = 1.75; sconce.add(bowl);
      // Purple/shadow flame
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 36), shadowFlameMat);
      flame.position.y = 1.95; sconce.add(flame);
      const fLight = new THREE.PointLight(0x6622cc, 0.6, 7);
      fLight.position.y = 2.0; sconce.add(fLight); mctx.torchLights.push(fLight);
      const sx = (Math.random()-0.5)*w*0.7, sz = (Math.random()-0.5)*d*0.7;
      sconce.position.set(sx, getTerrainHeight(sx, sz, 0.5), sz); mctx.scene.add(sconce);
    }
    // Black iron gates
    for (let i = 0; i < 4; i++) {
      const gate = new THREE.Group();
      // Posts
      for (const gx of [-1.2, 1.2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), darkIronMat);
        post.position.set(gx, 2, 0); post.castShadow = true; gate.add(post);
        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 17), darkIronMat);
        finial.position.set(gx, 4.15, 0); gate.add(finial);
      }
      // Bars
      for (let b = 0; b < 6; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5, 17), darkIronMat);
        bar.position.set(-0.9+b*0.36, 1.75, 0); gate.add(bar);
      }
      // Top arch bar
      const archBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), darkIronMat);
      archBar.position.y = 3.5; gate.add(archBar);
      const gtx = (Math.random()-0.5)*w*0.5, gtz = (Math.random()-0.5)*d*0.5;
      gate.position.set(gtx, getTerrainHeight(gtx, gtz, 0.5), gtz);
      gate.rotation.y = Math.random()*Math.PI; mctx.scene.add(gate);
    }
    // Obsidian spikes
    for (let i = 0; i < 25; i++) {
      const spikeH = 0.5+Math.random()*2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06+Math.random()*0.1, spikeH, 17), obsidianMat);
      const sx = (Math.random()-0.5)*w*0.85, sz = (Math.random()-0.5)*d*0.85;
      spike.position.set(sx, getTerrainHeight(sx, sz, 0.5)+spikeH/2, sz);
      spike.rotation.z = (Math.random()-0.5)*0.2; spike.castShadow = true; mctx.scene.add(spike);
    }
    // Dark pools
    for (let i = 0; i < 5; i++) {
      const poolR = 1+Math.random()*2;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(poolR, 36), darkPoolMat);
      pool.rotation.x = -Math.PI/2;
      const px = (Math.random()-0.5)*w*0.5, pz = (Math.random()-0.5)*d*0.5;
      pool.position.set(px, getTerrainHeight(px, pz, 0.5)+0.02, pz); mctx.scene.add(pool);
    }
    // Carved obsidian statues
    for (let i = 0; i < 6; i++) {
      const statue = new THREE.Group();
      const sBase = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), obsidianMat);
      sBase.position.y = 0.15; statue.add(sBase);
      const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 23), obsidianMat);
      sBody.position.y = 1.3; sBody.castShadow = true; statue.add(sBody);
      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 31, 20), obsidianMat);
      sHead.position.y = 2.5; statue.add(sHead);
      // Glowing eyes
      for (const ex of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16),
          new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 2.0 }));
        eye.position.set(ex, 2.53, 0.17); statue.add(eye);
      }
      const stx = (Math.random()-0.5)*w*0.55, stz = (Math.random()-0.5)*d*0.55;
      statue.position.set(stx, getTerrainHeight(stx, stz, 0.5), stz); mctx.scene.add(statue);
    }
    // Volcanic glass shards scattered on ground
    for (let i = 0; i < 30; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.03+Math.random()*0.05, 0.1+Math.random()*0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.1, metalness: 0.6 }));
      const shx = (Math.random()-0.5)*w*0.8, shz = (Math.random()-0.5)*d*0.8;
      shard.position.set(shx, getTerrainHeight(shx, shz, 0.5)+0.03, shz);
      shard.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(shard);
    }
    // Lava channels with glow
    for (let i = 0; i < 5; i++) {
      const channel = new THREE.Mesh(new THREE.PlaneGeometry(1, w*0.3+Math.random()*10), lavaMat);
      channel.rotation.x = -Math.PI/2;
      const cx = (Math.random()-0.5)*w*0.5, cz = (Math.random()-0.5)*d*0.5;
      channel.position.set(cx, getTerrainHeight(cx, cz, 0.5)+0.03, cz);
      channel.rotation.z = Math.random()*Math.PI; mctx.scene.add(channel);
      const lLight = new THREE.PointLight(0xff4400, 0.8, 10);
      lLight.position.set(cx, getTerrainHeight(cx, cz, 0.5)+0.5, cz);
      mctx.scene.add(lLight); mctx.torchLights.push(lLight);
    }
    // Dark pillars
    for (let i = 0; i < 12; i++) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 5+Math.random()*3, 23), obsidianMat);
      const px = (Math.random()-0.5)*w*0.7, pz = (Math.random()-0.5)*d*0.7;
      pil.position.set(px, getTerrainHeight(px, pz, 0.5)+pil.geometry.parameters.height/2, pz);
      pil.castShadow = true; mctx.scene.add(pil);
    }
    // ── Obsidian blade wall spikes ──
    for (let i = 0; i < 20; i++) {
      const bladeSpike = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8 + Math.random() * 0.6, 0.15), obsidianMat);
      bladeSpike.add(blade);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 16), obsidianMat);
      tip.position.y = 0.5; bladeSpike.add(tip);
      const bsx = (Math.random()-0.5)*w*0.8, bsz = (Math.random()-0.5)*d*0.8;
      bladeSpike.position.set(bsx, getTerrainHeight(bsx, bsz, 0.5) + 1.5 + Math.random() * 2, bsz);
      bladeSpike.rotation.set((Math.random()-0.5)*0.3, Math.random()*Math.PI, (Math.random()-0.5)*0.3); mctx.scene.add(bladeSpike);
    }
    // ── Magma channel floor details ──
    for (let i = 0; i < 8; i++) {
      const magmaDetail = new THREE.Group();
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.5, 20), lavaMat);
      pool.rotation.x = -Math.PI / 2; magmaDetail.add(pool);
      for (let b = 0; b < 3; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 16, 8), new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0 }));
        bubble.position.set((Math.random()-0.5)*0.3, 0.03, (Math.random()-0.5)*0.3); magmaDetail.add(bubble);
      }
      const mdx = (Math.random()-0.5)*w*0.6, mdz = (Math.random()-0.5)*d*0.6;
      magmaDetail.position.set(mdx, getTerrainHeight(mdx, mdz, 0.5) + 0.02, mdz); mctx.scene.add(magmaDetail);
    }
    // ── Skull trophy mounts ──
    for (let i = 0; i < 10; i++) {
      const trophy = new THREE.Group();
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), darkIronMat);
      trophy.add(mount);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 17), new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 }));
      skull.position.z = 0.06; trophy.add(skull);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 }));
      jaw.position.set(0, -0.06, 0.08); trophy.add(jaw);
      const tmx = (Math.random()-0.5)*w*0.7, tmz = (Math.random()-0.5)*d*0.7;
      trophy.position.set(tmx, getTerrainHeight(tmx, tmz, 0.5) + 2 + Math.random() * 2, tmz);
      trophy.rotation.y = Math.random() * Math.PI; mctx.scene.add(trophy);
    }
    // ── Molten metal crucible props ──
    for (let i = 0; i < 4; i++) {
      const crucible = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.25, 20), darkIronMat);
      bowl.position.y = 0.12; crucible.add(bowl);
      const molten = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), lavaMat);
      molten.rotation.x = -Math.PI / 2; molten.position.y = 0.25; crucible.add(molten);
      const tripod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.4, 16), darkIronMat);
      tripod1.position.set(0.12, 0.05, 0); tripod1.rotation.z = 0.2; crucible.add(tripod1);
      const tripod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.4, 16), darkIronMat);
      tripod2.position.set(-0.06, 0.05, 0.1); tripod2.rotation.z = -0.2; crucible.add(tripod2);
      const crx = (Math.random()-0.5)*w*0.5, crz = (Math.random()-0.5)*d*0.5;
      crucible.position.set(crx, getTerrainHeight(crx, crz, 0.5), crz); mctx.scene.add(crucible);
    }
    // ── Obsidian blade wall spikes (sharp glossy cones from walls) ──
    for (let i = 0; i < 20; i++) {
      const wallSpike = new THREE.Group();
      const spikeLen = 0.6 + Math.random() * 0.8;
      const spikeCone = new THREE.Mesh(new THREE.ConeGeometry(0.04 + Math.random() * 0.03, spikeLen, 12),
        new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.08, metalness: 0.9 }));
      wallSpike.add(spikeCone);
      // Blade edge (thin flat plane for sharpness)
      const bladeEdge = new THREE.Mesh(new THREE.PlaneGeometry(0.01, spikeLen * 0.8),
        new THREE.MeshStandardMaterial({ color: 0x111120, metalness: 0.95, roughness: 0.05, side: THREE.DoubleSide }));
      bladeEdge.position.z = 0.02; wallSpike.add(bladeEdge);
      const wsx = (Math.random() - 0.5) * w * 0.85, wsz = (Math.random() - 0.5) * d * 0.85;
      wallSpike.position.set(wsx, getTerrainHeight(wsx, wsz, 0.5) + 1.5 + Math.random() * 3, wsz);
      wallSpike.rotation.set((Math.random() - 0.5) * 1.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.8);
      mctx.scene.add(wallSpike);
    }
    // ── Magma channel floor details (trenches with orange emissive interior) ──
    for (let i = 0; i < 6; i++) {
      const magmaChan = new THREE.Group();
      const chanLen = 3 + Math.random() * 5;
      const chanW = 0.3 + Math.random() * 0.2;
      // Trench interior (orange emissive)
      const trench = new THREE.Mesh(new THREE.BoxGeometry(chanW, 0.15, chanLen), lavaMat);
      trench.position.y = -0.05; magmaChan.add(trench);
      // Stone edges on each side
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
      const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, chanLen), edgeMat);
      leftEdge.position.set(-chanW / 2 - 0.06, 0, 0); magmaChan.add(leftEdge);
      const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, chanLen), edgeMat);
      rightEdge.position.set(chanW / 2 + 0.06, 0, 0); magmaChan.add(rightEdge);
      // Glow light along channel
      const chanLight = new THREE.PointLight(0xff4400, 0.6, 6);
      chanLight.position.y = 0.2; magmaChan.add(chanLight); mctx.torchLights.push(chanLight);
      const mcx = (Math.random() - 0.5) * w * 0.6, mcz = (Math.random() - 0.5) * d * 0.6;
      magmaChan.position.set(mcx, getTerrainHeight(mcx, mcz, 0.5) + 0.05, mcz);
      magmaChan.rotation.y = Math.random() * Math.PI; mctx.scene.add(magmaChan);
    }
    // ── Dark iron portcullis gates (grid of cylinders with frame and winch) ──
    for (let i = 0; i < 4; i++) {
      const portcullis = new THREE.Group();
      const gateW = 2.0, gateH = 3.5;
      // Frame
      const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, gateH, 0.2), darkIronMat);
      frameLeft.position.set(-gateW / 2, gateH / 2, 0); frameLeft.castShadow = true; portcullis.add(frameLeft);
      const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, gateH, 0.2), darkIronMat);
      frameRight.position.set(gateW / 2, gateH / 2, 0); frameRight.castShadow = true; portcullis.add(frameRight);
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(gateW + 0.2, 0.2, 0.2), darkIronMat);
      frameTop.position.set(0, gateH, 0); portcullis.add(frameTop);
      // Vertical bars
      const barCount = 8;
      for (let b = 0; b < barCount; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, gateH - 0.2, 12), darkIronMat);
        bar.position.set(-gateW / 2 + 0.15 + b * (gateW - 0.3) / (barCount - 1), gateH / 2, 0);
        portcullis.add(bar);
      }
      // Horizontal cross bars
      for (let h = 0; h < 4; h++) {
        const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, gateW - 0.3, 12), darkIronMat);
        hBar.rotation.z = Math.PI / 2;
        hBar.position.set(0, 0.5 + h * 0.8, 0); portcullis.add(hBar);
      }
      // Winch mechanism above
      const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), darkIronMat);
      winchDrum.rotation.z = Math.PI / 2; winchDrum.position.set(0, gateH + 0.2, 0); portcullis.add(winchDrum);
      // Chain (thin cylinder segments)
      for (let c = 0; c < 3; c++) {
        const chainLink = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), darkIronMat);
        chainLink.position.set(0, gateH + 0.4 + c * 0.25, 0); portcullis.add(chainLink);
      }
      const pcx = (Math.random() - 0.5) * w * 0.5, pcz = (Math.random() - 0.5) * d * 0.5;
      portcullis.position.set(pcx, getTerrainHeight(pcx, pcz, 0.5), pcz);
      portcullis.rotation.y = Math.random() * Math.PI; mctx.scene.add(portcullis);
    }
    // ── Skull trophy mounts (sphere skulls on wall plaques with crossed bones) ──
    for (let i = 0; i < 12; i++) {
      const skullMount = new THREE.Group();
      const boneMaterial = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 });
      // Wall plaque
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.04), darkIronMat);
      skullMount.add(plaque);
      // Skull
      const skullHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), boneMaterial);
      skullHead.scale.set(1, 1.1, 0.9); skullHead.position.z = 0.06; skullMount.add(skullHead);
      // Eye sockets
      for (const ex of [-0.03, 0.03]) {
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x111111 }));
        socket.position.set(ex, 0.02, 0.14); skullMount.add(socket);
      }
      // Crossed bones behind
      const bone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), boneMaterial);
      bone1.rotation.z = Math.PI / 4; bone1.position.z = 0.02; skullMount.add(bone1);
      const bone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), boneMaterial);
      bone2.rotation.z = -Math.PI / 4; bone2.position.z = 0.02; skullMount.add(bone2);
      const smx = (Math.random() - 0.5) * w * 0.75, smz = (Math.random() - 0.5) * d * 0.75;
      skullMount.position.set(smx, getTerrainHeight(smx, smz, 0.5) + 1.5 + Math.random() * 2.5, smz);
      skullMount.rotation.y = Math.random() * Math.PI; mctx.scene.add(skullMount);
    }
    // ── Molten metal crucibles (bowl on tripod with emissive surface and steam) ──
    for (let i = 0; i < 6; i++) {
      const crucibleLg = new THREE.Group();
      const bowlR = 0.25 + Math.random() * 0.1;
      // Bowl (half-sphere)
      const crucBowl = new THREE.Mesh(new THREE.SphereGeometry(bowlR, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), darkIronMat);
      crucBowl.rotation.x = Math.PI; crucBowl.position.y = 0.5; crucibleLg.add(crucBowl);
      // Molten surface inside
      const moltenSurface = new THREE.Mesh(new THREE.CircleGeometry(bowlR * 0.85, 24), lavaMat);
      moltenSurface.rotation.x = -Math.PI / 2; moltenSurface.position.y = 0.5; crucibleLg.add(moltenSurface);
      // Tripod legs (3 angled cylinders)
      for (let leg = 0; leg < 3; leg++) {
        const legAngle = (leg / 3) * Math.PI * 2;
        const tripodLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.6, 8), darkIronMat);
        tripodLeg.position.set(Math.cos(legAngle) * bowlR * 0.6, 0.25, Math.sin(legAngle) * bowlR * 0.6);
        tripodLeg.rotation.z = Math.cos(legAngle) * 0.2;
        tripodLeg.rotation.x = Math.sin(legAngle) * 0.2;
        crucibleLg.add(tripodLeg);
      }
      // Steam (translucent spheres above)
      for (let s = 0; s < 4; s++) {
        const steam = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.1 + Math.random() * 0.1 }));
        steam.position.set((Math.random() - 0.5) * 0.15, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.15);
        crucibleLg.add(steam);
      }
      const clx = (Math.random() - 0.5) * w * 0.5, clz = (Math.random() - 0.5) * d * 0.5;
      crucibleLg.position.set(clx, getTerrainHeight(clx, clz, 0.5), clz); mctx.scene.add(crucibleLg);
    }
    // ── Obsidian pillars with rune carvings (tall box pillars with emissive rune insets) ──
    for (let i = 0; i < 8; i++) {
      const runePillar = new THREE.Group();
      const pilH = 4 + Math.random() * 3;
      const pilW = 0.4 + Math.random() * 0.15;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(pilW, pilH, pilW), obsidianMat);
      pillar.position.y = pilH / 2; pillar.castShadow = true; runePillar.add(pillar);
      // Rune patterns on each face (thin emissive boxes inset)
      const runeGlowMat = new THREE.MeshStandardMaterial({ color: 0xff4422, emissive: 0xff2200, emissiveIntensity: 1.5 });
      for (let face = 0; face < 4; face++) {
        const runeCount = 3 + Math.floor(Math.random() * 3);
        for (let r = 0; r < runeCount; r++) {
          const runeH = 0.08 + Math.random() * 0.12;
          const runeW = 0.06 + Math.random() * 0.1;
          const rune = new THREE.Mesh(new THREE.BoxGeometry(runeW, runeH, 0.01), runeGlowMat);
          const ry = pilH * 0.15 + r * (pilH * 0.6 / runeCount);
          const offset = pilW / 2 + 0.006;
          if (face === 0) rune.position.set(0, ry, offset);
          else if (face === 1) rune.position.set(0, ry, -offset);
          else if (face === 2) { rune.position.set(offset, ry, 0); rune.rotation.y = Math.PI / 2; }
          else { rune.position.set(-offset, ry, 0); rune.rotation.y = Math.PI / 2; }
          runePillar.add(rune);
        }
      }
      const rpx = (Math.random() - 0.5) * w * 0.65, rpz = (Math.random() - 0.5) * d * 0.65;
      runePillar.position.set(rpx, getTerrainHeight(rpx, rpz, 0.5), rpz); mctx.scene.add(runePillar);
    }
    // ── Guard post stations (raised platforms with railings, weapon racks, torch) ──
    for (let i = 0; i < 4; i++) {
      const guardPost = new THREE.Group();
      // Raised platform
      const platW = 1.5 + Math.random() * 0.5;
      const platform = new THREE.Mesh(new THREE.BoxGeometry(platW, 0.3, platW), obsidianMat);
      platform.position.y = 0.8; platform.castShadow = true; guardPost.add(platform);
      // Steps
      const step = new THREE.Mesh(new THREE.BoxGeometry(platW * 0.4, 0.15, 0.3), obsidianMat);
      step.position.set(0, 0.4, platW / 2 + 0.1); guardPost.add(step);
      // Railing posts (4 corners)
      for (const rx of [-platW / 2 + 0.1, platW / 2 - 0.1]) {
        for (const rz of [-platW / 2 + 0.1, platW / 2 - 0.1]) {
          const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), darkIronMat);
          railPost.position.set(rx, 1.3, rz); guardPost.add(railPost);
        }
      }
      // Weapon rack (box frame + cylinder weapons)
      const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.06), darkIronMat);
      rackFrame.position.set(-platW / 2 + 0.35, 1.4, 0); guardPost.add(rackFrame);
      for (let wp = 0; wp < 2; wp++) {
        const weapon = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), darkIronMat);
        weapon.position.set(-platW / 2 + 0.2 + wp * 0.3, 1.4, 0.04); weapon.rotation.z = 0.1; guardPost.add(weapon);
      }
      // Torch bracket with PointLight
      const torchBracket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), darkIronMat);
      torchBracket.position.set(platW / 2 - 0.1, 1.5, 0); guardPost.add(torchBracket);
      const torchFlame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 12), lavaMat);
      torchFlame.position.set(platW / 2 - 0.1, 1.72, 0); guardPost.add(torchFlame);
      const gpLight = new THREE.PointLight(0xff4400, 0.5, 5);
      gpLight.position.set(platW / 2 - 0.1, 1.8, 0); guardPost.add(gpLight); mctx.torchLights.push(gpLight);
      const gpx = (Math.random() - 0.5) * w * 0.55, gpz = (Math.random() - 0.5) * d * 0.55;
      guardPost.position.set(gpx, getTerrainHeight(gpx, gpz, 0.5), gpz);
      guardPost.rotation.y = Math.random() * Math.PI; mctx.scene.add(guardPost);
    }
    // ── Lava falls (vertical streams of stacked orange emissive spheres/cylinders into pools) ──
    for (let i = 0; i < 3; i++) {
      const lavaFall = new THREE.Group();
      const fallH = 4 + Math.random() * 4;
      // Vertical stream of stacked emissive elements
      const segCount = Math.floor(fallH / 0.3);
      for (let s = 0; s < segCount; s++) {
        const usesSphere = Math.random() > 0.5;
        if (usesSphere) {
          const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 12, 8), lavaMat);
          droplet.position.y = s * 0.3; lavaFall.add(droplet);
        } else {
          const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.25, 10), lavaMat);
          stream.position.y = s * 0.3; lavaFall.add(stream);
        }
      }
      // Pool at bottom
      const poolR = 0.5 + Math.random() * 0.5;
      const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(poolR, 24), lavaMat);
      lavaPool.rotation.x = -Math.PI / 2; lavaPool.position.y = -0.02; lavaFall.add(lavaPool);
      // Glow
      const lfLight = new THREE.PointLight(0xff4400, 0.7, 8);
      lfLight.position.y = fallH / 2; lavaFall.add(lfLight); mctx.torchLights.push(lfLight);
      const lfx = (Math.random() - 0.5) * w * 0.6, lfz = (Math.random() - 0.5) * d * 0.6;
      lavaFall.position.set(lfx, getTerrainHeight(lfx, lfz, 0.5) + 0.5, lfz); mctx.scene.add(lavaFall);
    }
}

export function buildCelestialRuins(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x0a0a22, 0.012);
    mctx.applyTerrainColors(0x1a1a3a, 0x2a2a4a, 0.8);
    mctx.dirLight.color.setHex(0xaabbff);
    mctx.dirLight.intensity = 1.0;
    mctx.ambientLight.color.setHex(0x222244);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0x6666aa);
    mctx.hemiLight.groundColor.setHex(0x111133);

    const starMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffdd88, emissiveIntensity: 1.0 });
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x8888aa, roughness: 0.6, metalness: 0.3 });
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.4, metalness: 0.2 });
    const goldLightMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, emissive: 0xffaa44, emissiveIntensity: 1.0, transparent: true, opacity: 0.3 });
    const divineMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, emissive: 0xaabbff, emissiveIntensity: 0.5, roughness: 0.3 });
    const holyWaterMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 0.4, transparent: true, opacity: 0.5, metalness: 0.3 });
    const arcaneMat = new THREE.MeshStandardMaterial({ color: 0x8888ff, emissive: 0x4444ff, emissiveIntensity: 0.8 });
    // Floating marble columns
    for (let i = 0; i < 18; i++) {
      const col = new THREE.Group();
      const colH = 2+Math.random()*4;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, colH, 27), marbleMat);
      shaft.castShadow = true; col.add(shaft);
      // Fluted grooves
      for (let g = 0; g < 6; g++) {
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.02, colH, 0.02), ruinMat);
        const gA = (g/6)*Math.PI*2;
        groove.position.set(Math.cos(gA)*0.28, 0, Math.sin(gA)*0.28); col.add(groove);
      }
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.2, 27), marbleMat);
      capital.position.y = colH/2+0.1; col.add(capital);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 27), marbleMat);
      base.position.y = -colH/2-0.08; col.add(base);
      const isFloating = Math.random() > 0.4;
      if (isFloating) {
        col.position.set((Math.random()-0.5)*w*0.7, 2+Math.random()*5, (Math.random()-0.5)*d*0.7);
        col.rotation.z = (Math.random()-0.5)*0.3;
      } else {
        const cx = (Math.random()-0.5)*w*0.8, cz = (Math.random()-0.5)*d*0.8;
        col.position.set(cx, getTerrainHeight(cx, cz, 0.8)+colH/2, cz);
      }
      mctx.scene.add(col);
    }
    // Floating ruins/platforms
    for (let i = 0; i < 15; i++) {
      const ruin = new THREE.Mesh(new THREE.BoxGeometry(1+Math.random()*3, 0.4+Math.random()*0.6, 1+Math.random()*3), ruinMat);
      ruin.position.set((Math.random()-0.5)*w*0.7, 2+Math.random()*6, (Math.random()-0.5)*d*0.7);
      ruin.rotation.set((Math.random()-0.5)*0.2, Math.random(), (Math.random()-0.5)*0.2);
      ruin.castShadow = true; mctx.scene.add(ruin);
    }
    // Golden light beams from above
    for (let i = 0; i < 8; i++) {
      const beamH = 10+Math.random()*5;
      const beamR = 0.3+Math.random()*0.5;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(beamR*0.2, beamR, beamH, 23), goldLightMat);
      const bx = (Math.random()-0.5)*w*0.5, bz = (Math.random()-0.5)*d*0.5;
      beam.position.set(bx, beamH/2, bz); mctx.scene.add(beam);
      const gLight = new THREE.PointLight(0xffddaa, 0.4, 8);
      gLight.position.set(bx, 1, bz); mctx.scene.add(gLight); mctx.torchLights.push(gLight);
    }
    // Celestial murals (large decorated panels)
    for (let i = 0; i < 6; i++) {
      const mural = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), marbleMat);
      mural.add(panel);
      // Decorative border
      const border = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xccaa66, metalness: 0.4, roughness: 0.5 }));
      border.position.z = -0.01; mural.add(border);
      // Stars on mural
      for (let s = 0; s < 5; s++) {
        const mStar = new THREE.Mesh(new THREE.SphereGeometry(0.04, 17, 16), starMat);
        mStar.position.set((Math.random()-0.5)*2.5, (Math.random()-0.5)*1.5, 0.02); mural.add(mStar);
      }
      mural.position.set((Math.random()-0.5)*w*0.6, 3+Math.random()*3, (Math.random()-0.5)*d*0.6);
      mural.rotation.y = Math.random()*Math.PI; mctx.scene.add(mural);
    }
    // Star map patterns on floor
    for (let i = 0; i < 5; i++) {
      const mapR = 2+Math.random()*2;
      const starMap = new THREE.Mesh(new THREE.CircleGeometry(mapR, 44),
        new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.7 }));
      starMap.rotation.x = -Math.PI/2;
      const mx = (Math.random()-0.5)*w*0.4, mz = (Math.random()-0.5)*d*0.4;
      starMap.position.set(mx, getTerrainHeight(mx, mz, 0.8)+0.02, mz); mctx.scene.add(starMap);
      // Constellation dots
      for (let c = 0; c < 8; c++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16), starMat);
        const cA = Math.random()*Math.PI*2, cR = Math.random()*mapR*0.8;
        dot.position.set(mx+Math.cos(cA)*cR, getTerrainHeight(mx, mz, 0.8)+0.04, mz+Math.sin(cA)*cR);
        mctx.scene.add(dot);
      }
      // Connecting lines
      for (let l = 0; l < 4; l++) {
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1+Math.random()*1.5, 16), arcaneMat);
        line.rotation.x = Math.PI/2;
        line.position.set(mx+(Math.random()-0.5)*mapR, getTerrainHeight(mx, mz, 0.8)+0.035, mz+(Math.random()-0.5)*mapR);
        line.rotation.y = Math.random()*Math.PI; mctx.scene.add(line);
      }
    }
    // Broken halos
    for (let i = 0; i < 8; i++) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3+Math.random()*0.2, 0.02, 17, 36),
        new THREE.MeshStandardMaterial({ color: 0xffddaa, emissive: 0xffaa44, emissiveIntensity: 0.6, metalness: 0.4 }));
      halo.position.set((Math.random()-0.5)*w*0.7, 1+Math.random()*5, (Math.random()-0.5)*d*0.7);
      halo.rotation.set(Math.random()*0.5, Math.random(), Math.random()*0.5); mctx.scene.add(halo);
    }
    // Feather decorations
    for (let i = 0; i < 20; i++) {
      const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.2+Math.random()*0.15),
        new THREE.MeshStandardMaterial({ color: 0xeeeeff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
      feather.position.set((Math.random()-0.5)*w*0.7, 0.5+Math.random()*5, (Math.random()-0.5)*d*0.7);
      feather.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(feather);
    }
    // Divine symbol markers
    for (let i = 0; i < 6; i++) {
      const symbol = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 17, 36), divineMat);
      symbol.add(ring);
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), divineMat);
      symbol.add(cross1);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), divineMat);
      symbol.add(cross2);
      symbol.position.set((Math.random()-0.5)*w*0.5, 2+Math.random()*4, (Math.random()-0.5)*d*0.5);
      symbol.rotation.set(Math.random()*0.3, Math.random(), Math.random()*0.3); mctx.scene.add(symbol);
    }
    // Holy water fonts
    for (let i = 0; i < 4; i++) {
      const font = new THREE.Group();
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 23), marbleMat);
      pedestal.position.y = 0.4; font.add(pedestal);
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.15, 27), marbleMat);
      basin.position.y = 0.85; font.add(basin);
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.25, 44), holyWaterMat);
      water.rotation.x = -Math.PI/2; water.position.y = 0.9; font.add(water);
      const fLight = new THREE.PointLight(0x88aaff, 0.3, 4);
      fLight.position.y = 1.0; font.add(fLight);
      const fx = (Math.random()-0.5)*w*0.4, fz = (Math.random()-0.5)*d*0.4;
      font.position.set(fx, getTerrainHeight(fx, fz, 0.8), fz); mctx.scene.add(font);
    }
    // Angelic statues
    for (let i = 0; i < 5; i++) {
      const angel = new THREE.Group();
      const aBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 27), marbleMat);
      aBase.position.y = 0.15; angel.add(aBase);
      const aBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.8, 23), divineMat);
      aBody.position.y = 1.2; aBody.castShadow = true; angel.add(aBody);
      const aHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 31, 20), divineMat);
      aHead.position.y = 2.2; angel.add(aHead);
      // Wings
      for (const wx of [-0.3, 0.3]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2),
          new THREE.MeshStandardMaterial({ color: 0xeeeeff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
        wing.position.set(wx, 1.8, -0.1); wing.rotation.y = wx > 0 ? -0.4 : 0.4; angel.add(wing);
      }
      const ax = (Math.random()-0.5)*w*0.5, az = (Math.random()-0.5)*d*0.5;
      angel.position.set(ax, getTerrainHeight(ax, az, 0.8), az); mctx.scene.add(angel);
    }
    // Star wisps
    for (let i = 0; i < 40; i++) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.03+Math.random()*0.08, 20, 17), starMat);
      wisp.position.set((Math.random()-0.5)*w*0.8, Math.random()*8, (Math.random()-0.5)*d*0.8);
      mctx.scene.add(wisp);
    }
    // Arcane circles on ground
    for (let i = 0; i < 6; i++) {
      const circle = new THREE.Mesh(new THREE.TorusGeometry(1.5+Math.random(), 0.03, 17, 44), arcaneMat);
      circle.rotation.x = -Math.PI/2;
      const ax = (Math.random()-0.5)*w*0.5, az = (Math.random()-0.5)*d*0.5;
      circle.position.set(ax, getTerrainHeight(ax, az, 0.8)+0.05, az); mctx.scene.add(circle);
    }
    // Constellation lights
    for (let i = 0; i < 10; i++) {
      const light = new THREE.PointLight([0xffffcc, 0x88aaff, 0xffaacc][i%3], 0.4, 8);
      light.position.set((Math.random()-0.5)*w*0.6, 3+Math.random()*5, (Math.random()-0.5)*d*0.6);
      mctx.scene.add(light); mctx.torchLights.push(light);
    }
    // ── Floating platform fragments ──
    for (let i = 0; i < 12; i++) {
      const fragment = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5, 2), ruinMat);
      fragment.position.set((Math.random()-0.5)*w*0.7, 1 + Math.random() * 7, (Math.random()-0.5)*d*0.7);
      fragment.rotation.set(Math.random(), Math.random(), Math.random()); mctx.scene.add(fragment);
    }
    // ── Star map floor engravings (circle + line patterns) ──
    for (let i = 0; i < 4; i++) {
      const engrave = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.015, 16, 44), arcaneMat);
      outer.rotation.x = -Math.PI / 2; engrave.add(outer);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.01, 16, 36), arcaneMat);
      inner.rotation.x = -Math.PI / 2; engrave.add(inner);
      for (let l = 0; l < 8; l++) {
        const lineA = (l / 8) * Math.PI * 2;
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.5, 16), arcaneMat);
        line.rotation.x = Math.PI / 2; line.rotation.y = lineA;
        line.position.set(Math.cos(lineA)*0.75, 0, Math.sin(lineA)*0.75); engrave.add(line);
      }
      const enx = (Math.random()-0.5)*w*0.4, enz = (Math.random()-0.5)*d*0.4;
      engrave.position.set(enx, getTerrainHeight(enx, enz, 0.8) + 0.03, enz); mctx.scene.add(engrave);
    }
    // ── Broken celestial sphere armillary ──
    for (let i = 0; i < 3; i++) {
      const armillary = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 17), marbleMat);
      stand.position.y = 0.3; armillary.add(stand);
      for (let r = 0; r < 4; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25 + r * 0.06, 0.008, 16, 36), new THREE.MeshStandardMaterial({ color: 0xccaa66, metalness: 0.5, roughness: 0.3 }));
        ring.position.y = 0.7; ring.rotation.set(r * 0.4, r * 0.7, r * 0.3); armillary.add(ring);
      }
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 17), starMat);
      sphere.position.y = 0.7; armillary.add(sphere);
      const arx = (Math.random()-0.5)*w*0.4, arz = (Math.random()-0.5)*d*0.4;
      armillary.position.set(arx, getTerrainHeight(arx, arz, 0.8), arz); mctx.scene.add(armillary);
    }
    // ── Divine statue fragments ──
    for (let i = 0; i < 8; i++) {
      const statFrag = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 20), divineMat);
      statFrag.add(torso);
      if (Math.random() > 0.5) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 16), divineMat);
        arm.position.set(0.15, 0.1, 0); arm.rotation.z = -0.6; statFrag.add(arm);
      }
      if (Math.random() > 0.5) {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 17), divineMat);
        head.position.y = 0.4; statFrag.add(head);
      }
      statFrag.position.set((Math.random()-0.5)*w*0.6, 0.5 + Math.random() * 4, (Math.random()-0.5)*d*0.6);
      statFrag.rotation.set(Math.random()*0.5, Math.random(), Math.random()*0.5); mctx.scene.add(statFrag);
    }
    // ── Floating platform fragments (box platforms with broken edges, glow underneath, connected by beams) ──
    for (let i = 0; i < 12; i++) {
      const floatPlat = new THREE.Group();
      const platW = 0.8 + Math.random() * 1.5;
      const platD = 0.8 + Math.random() * 1.5;
      const platH = 0.2 + Math.random() * 0.15;
      const mainPlat = new THREE.Mesh(new THREE.BoxGeometry(platW, platH, platD), ruinMat);
      mainPlat.castShadow = true; floatPlat.add(mainPlat);
      // Broken edge fragments (offset small boxes)
      for (let e = 0; e < 3 + Math.floor(Math.random() * 3); e++) {
        const edgeFrag = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.2, platH * 0.7, 0.15 + Math.random() * 0.2), ruinMat);
        edgeFrag.position.set(
          (Math.random() - 0.5) * platW * 1.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * platD * 1.1
        );
        edgeFrag.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
        floatPlat.add(edgeFrag);
      }
      // Faint glow underneath
      const underLight = new THREE.PointLight(0xaabbff, 0.3, 4);
      underLight.position.y = -platH; floatPlat.add(underLight); mctx.torchLights.push(underLight);
      const fpY = 1.5 + Math.random() * 6;
      floatPlat.position.set((Math.random() - 0.5) * w * 0.7, fpY, (Math.random() - 0.5) * d * 0.7);
      floatPlat.rotation.set((Math.random() - 0.5) * 0.15, Math.random(), (Math.random() - 0.5) * 0.15);
      mctx.scene.add(floatPlat);
      // Connecting light beam cylinder to nearby area
      if (i > 0 && Math.random() > 0.4) {
        const beamCon = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2 + Math.random() * 3, 8),
          new THREE.MeshStandardMaterial({ color: 0xaabbff, emissive: 0x6688cc, emissiveIntensity: 0.6, transparent: true, opacity: 0.3 }));
        beamCon.position.copy(floatPlat.position);
        beamCon.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5);
        mctx.scene.add(beamCon);
      }
    }
    // ── Star map floor engravings (concentric rings, radial lines, star spheres) ──
    for (let i = 0; i < 4; i++) {
      const starMapEng = new THREE.Group();
      const mapR = 2.0 + Math.random() * 1.5;
      // Large circle base
      const baseDisc = new THREE.Mesh(new THREE.CircleGeometry(mapR, 48),
        new THREE.MeshStandardMaterial({ color: 0x1a1a3a, roughness: 0.6 }));
      baseDisc.rotation.x = -Math.PI / 2; starMapEng.add(baseDisc);
      // Concentric ring tori
      for (let r = 1; r <= 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(mapR * r / 3.5, 0.01, 8, 48), arcaneMat);
        ring.rotation.x = -Math.PI / 2; starMapEng.add(ring);
      }
      // Radial line boxes forming constellation patterns
      const radialCount = 8 + Math.floor(Math.random() * 4);
      for (let r = 0; r < radialCount; r++) {
        const radA = (r / radialCount) * Math.PI * 2;
        const radLine = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.005, mapR * 0.8), arcaneMat);
        radLine.rotation.y = radA; radLine.position.y = 0.005;
        starMapEng.add(radLine);
      }
      // Small sphere stars at intersections
      for (let s = 0; s < 10 + Math.floor(Math.random() * 6); s++) {
        const starA = Math.random() * Math.PI * 2;
        const starR = Math.random() * mapR * 0.85;
        const starDot = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xeeeeff, emissive: 0xaabbff, emissiveIntensity: 1.2 }));
        starDot.position.set(Math.cos(starA) * starR, 0.015, Math.sin(starA) * starR);
        starMapEng.add(starDot);
      }
      const smex = (Math.random() - 0.5) * w * 0.4, smez = (Math.random() - 0.5) * d * 0.4;
      starMapEng.position.set(smex, getTerrainHeight(smex, smez, 0.8) + 0.02, smez); mctx.scene.add(starMapEng);
    }
    // ── Broken celestial armillary sphere (torus rings at different angles, central sphere, pedestal) ──
    for (let i = 0; i < 3; i++) {
      const armillarySph = new THREE.Group();
      // Pedestal box
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), marbleMat);
      pedestal.position.y = 0.4; pedestal.castShadow = true; armillarySph.add(pedestal);
      const armR = 0.6 + Math.random() * 0.3;
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xccaa66, metalness: 0.5, roughness: 0.3 });
      // Celestial rings at different angles, partially broken (using arc)
      for (let r = 0; r < 3; r++) {
        const arcAngle = Math.PI * (1.2 + Math.random() * 0.7); // partial ring (broken)
        const celestRing = new THREE.Mesh(new THREE.TorusGeometry(armR + r * 0.08, 0.012, 12, 36, arcAngle), ringMat);
        celestRing.position.y = 1.2;
        celestRing.rotation.set(r * 0.8 + Math.random() * 0.3, r * 1.2, r * 0.5 + Math.random() * 0.2);
        armillarySph.add(celestRing);
      }
      // Central sphere
      const centralSphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), starMat);
      centralSphere.position.y = 1.2; armillarySph.add(centralSphere);
      // Faint glow
      const armLight = new THREE.PointLight(0xffddaa, 0.3, 4);
      armLight.position.y = 1.2; armillarySph.add(armLight); mctx.torchLights.push(armLight);
      const arsx = (Math.random() - 0.5) * w * 0.45, arsz = (Math.random() - 0.5) * d * 0.45;
      armillarySph.position.set(arsx, getTerrainHeight(arsx, arsz, 0.8), arsz); mctx.scene.add(armillarySph);
    }
    // ── Divine statue fragments (partial humanoid forms, white marble with gold trim) ──
    for (let i = 0; i < 8; i++) {
      const divFrag = new THREE.Group();
      const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.6, roughness: 0.3 });
      // Torso box
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.25), marbleMat);
      torso.castShadow = true; divFrag.add(torso);
      // Gold trim on torso
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.26), goldTrimMat);
      trim.position.y = 0.2; divFrag.add(trim);
      // Head sphere (sometimes)
      if (Math.random() > 0.3) {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), marbleMat);
        head.position.y = 0.42; divFrag.add(head);
      }
      // One arm cylinder (sometimes)
      if (Math.random() > 0.4) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.5, 12), marbleMat);
        const armSide = Math.random() > 0.5 ? 1 : -1;
        arm.position.set(armSide * 0.22, 0.05, 0);
        arm.rotation.z = armSide * (-0.5 - Math.random() * 0.5);
        divFrag.add(arm);
      }
      // Some fallen over
      const isFallen = Math.random() > 0.5;
      const dsx = (Math.random() - 0.5) * w * 0.6, dsz = (Math.random() - 0.5) * d * 0.6;
      if (isFallen) {
        divFrag.position.set(dsx, getTerrainHeight(dsx, dsz, 0.8) + 0.15, dsz);
        divFrag.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        divFrag.rotation.y = Math.random() * Math.PI;
      } else {
        divFrag.position.set(dsx, getTerrainHeight(dsx, dsz, 0.8) + 0.3 + Math.random() * 2, dsz);
        divFrag.rotation.set(Math.random() * 0.3, Math.random(), Math.random() * 0.3);
      }
      mctx.scene.add(divFrag);
    }
    // ── Light beam shafts (tall thin translucent columns with PointLight inside) ──
    for (let i = 0; i < 10; i++) {
      const beamShaft = new THREE.Group();
      const shaftH = 8 + Math.random() * 6;
      const shaftR = 0.06 + Math.random() * 0.04;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR * 1.2, shaftH, 16),
        new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffcc88, emissiveIntensity: 0.6, transparent: true, opacity: 0.2 }));
      shaft.position.y = shaftH / 2; beamShaft.add(shaft);
      const shaftLight = new THREE.PointLight(0xffddaa, 0.35, 6);
      shaftLight.position.y = shaftH / 3; beamShaft.add(shaftLight); mctx.torchLights.push(shaftLight);
      const lbx = (Math.random() - 0.5) * w * 0.7, lbz = (Math.random() - 0.5) * d * 0.7;
      beamShaft.position.set(lbx, getTerrainHeight(lbx, lbz, 0.8), lbz); mctx.scene.add(beamShaft);
    }
    // ── Celestial fountain (tiered circular platforms with cascading water) ──
    for (let i = 0; i < 2; i++) {
      const fountain = new THREE.Group();
      const tiers = 3 + Math.floor(Math.random() * 2);
      for (let t = 0; t < tiers; t++) {
        const tierR = 1.2 - t * 0.3;
        const tierH = 0.25;
        const tierPlat = new THREE.Mesh(new THREE.CylinderGeometry(tierR, tierR + 0.05, tierH, 28), marbleMat);
        tierPlat.position.y = t * 0.6; tierPlat.castShadow = true; fountain.add(tierPlat);
        // Water surface on each tier
        const waterSurf = new THREE.Mesh(new THREE.CircleGeometry(tierR - 0.05, 28), holyWaterMat);
        waterSurf.rotation.x = -Math.PI / 2; waterSurf.position.y = t * 0.6 + tierH / 2 + 0.01; fountain.add(waterSurf);
        // Cascading water (translucent spheres falling down sides)
        if (t > 0) {
          for (let c = 0; c < 4; c++) {
            const cascA = (c / 4) * Math.PI * 2 + Math.random() * 0.5;
            const cascR = tierR + 0.05;
            for (let drop = 0; drop < 3; drop++) {
              const waterDrop = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 }));
              waterDrop.position.set(Math.cos(cascA) * cascR, t * 0.6 - 0.1 - drop * 0.15, Math.sin(cascA) * cascR);
              fountain.add(waterDrop);
            }
          }
        }
      }
      // Glowing blue light
      const fountLight = new THREE.PointLight(0x88aaff, 0.5, 6);
      fountLight.position.y = tiers * 0.6; fountain.add(fountLight); mctx.torchLights.push(fountLight);
      const ftx = (Math.random() - 0.5) * w * 0.35, ftz = (Math.random() - 0.5) * d * 0.35;
      fountain.position.set(ftx, getTerrainHeight(ftx, ftz, 0.8), ftz); mctx.scene.add(fountain);
    }
    // ── Runic archways (two pillar boxes with torus arch, emissive rune symbols) ──
    for (let i = 0; i < 6; i++) {
      const archway = new THREE.Group();
      const archW = 1.5 + Math.random() * 0.5;
      const archH = 3 + Math.random() * 1.5;
      // Two pillar boxes
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, archH, 0.3), marbleMat);
        pillar.position.set(side * archW / 2, archH / 2, 0); pillar.castShadow = true; archway.add(pillar);
        // Small emissive rune symbols on pillars
        for (let r = 0; r < 3; r++) {
          const runeBox = new THREE.Mesh(new THREE.BoxGeometry(0.06 + Math.random() * 0.04, 0.06 + Math.random() * 0.04, 0.01), arcaneMat);
          runeBox.position.set(side * archW / 2, archH * 0.2 + r * archH * 0.25, 0.16);
          archway.add(runeBox);
        }
      }
      // Torus arch on top
      const arch = new THREE.Mesh(new THREE.TorusGeometry(archW / 2, 0.08, 12, 24, Math.PI), marbleMat);
      arch.position.y = archH; arch.rotation.z = Math.PI; archway.add(arch);
      // Rune symbols on arch
      for (let r = 0; r < 4; r++) {
        const runeA = (r / 4) * Math.PI;
        const runeOnArch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), arcaneMat);
        runeOnArch.position.set(Math.cos(runeA) * archW / 2, archH + Math.sin(runeA) * archW / 2, 0.09);
        archway.add(runeOnArch);
      }
      const awx = (Math.random() - 0.5) * w * 0.55, awz = (Math.random() - 0.5) * d * 0.55;
      archway.position.set(awx, getTerrainHeight(awx, awz, 0.8), awz);
      archway.rotation.y = Math.random() * Math.PI; mctx.scene.add(archway);
    }
    // ── Starfield ground particles (tiny emissive spheres scattered like fallen stars) ──
    for (let i = 0; i < 40; i++) {
      const starColors = [0xeeeeff, 0xaabbff, 0xffeedd, 0xccddff];
      const starParticle = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 8, 6),
        new THREE.MeshStandardMaterial({ color: starColors[i % starColors.length], emissive: starColors[i % starColors.length], emissiveIntensity: 0.8 + Math.random() * 0.5 }));
      const spx = (Math.random() - 0.5) * w * 0.85, spz = (Math.random() - 0.5) * d * 0.85;
      starParticle.position.set(spx, getTerrainHeight(spx, spz, 0.8) + 0.02 + Math.random() * 0.05, spz);
      mctx.scene.add(starParticle);
    }
}

export function buildInfernalThrone(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x1a0505, 0.018);
    mctx.applyTerrainColors(0x1a0a0a, 0x2a1111, 0.6);
    mctx.dirLight.color.setHex(0xff4422);
    mctx.dirLight.intensity = 0.8;
    mctx.ambientLight.color.setHex(0x220505);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x662222);
    mctx.hemiLight.groundColor.setHex(0x110000);

    const demonMat = new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.7 });
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.6 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x330000, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 });
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 });
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.6 });
    // Massive demon throne (centerpiece)
    {
      const throne = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2), demonMat);
      seat.position.y = 0.75; seat.castShadow = true; throne.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.5), demonMat);
      back.position.set(0, 3.5, -0.75); back.castShadow = true; throne.add(back);
      // Armrests
      for (const ax of [-1.1, 1.1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 2), demonMat);
        arm.position.set(ax, 1.9, 0); throne.add(arm);
      }
      // Skull decorations on top
      for (let s = 0; s < 5; s++) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 17), skullMat);
        skull.position.set(-1+s*0.5, 5.7, -0.75); throne.add(skull);
      }
      // Horn-like spires
      for (const hx of [-0.8, 0.8]) {
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.15, 2, 20), demonMat);
        spire.position.set(hx, 6.5, -0.75); spire.rotation.z = hx > 0 ? -0.15 : 0.15; throne.add(spire);
      }
      // Steps
      for (let step = 0; step < 3; step++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(3+step*0.5, 0.2, 1), demonMat);
        s.position.set(0, -0.1-step*0.2, 1.5+step*0.5); throne.add(s);
      }
      const throneLight = new THREE.PointLight(0xff2200, 0.8, 12);
      throneLight.position.y = 3; throne.add(throneLight); mctx.torchLights.push(throneLight);
      throne.position.set(0, getTerrainHeight(0, 0, 0.6), 0); mctx.scene.add(throne);
    }
    // Chains and hooks hanging from above
    for (let i = 0; i < 15; i++) {
      const chain = new THREE.Group();
      const chainLen = 2+Math.random()*5;
      for (let l = 0; l < Math.floor(chainLen/0.2); l++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 17, 23), chainMat);
        link.position.y = -l*0.15;
        link.rotation.y = l%2===0 ? 0 : Math.PI/2; chain.add(link);
      }
      // Hook at bottom
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 17), chainMat);
      hook.position.y = -chainLen+0.1; hook.rotation.z = Math.PI; chain.add(hook);
      chain.position.set((Math.random()-0.5)*w*0.7, 6+Math.random()*3, (Math.random()-0.5)*d*0.7);
      mctx.scene.add(chain);
    }
    // Lava moat (ring around center)
    const moatR = Math.min(w, d) * 0.2;
    const moat = new THREE.Mesh(new THREE.TorusGeometry(moatR, 1.5, 17, 44), fireMat);
    moat.rotation.x = -Math.PI/2;
    moat.position.y = getTerrainHeight(0, 0, 0.6)+0.03; mctx.scene.add(moat);
    const moatLight = new THREE.PointLight(0xff4400, 1.0, moatR*2);
    moatLight.position.y = getTerrainHeight(0, 0, 0.6)+0.5;
    mctx.scene.add(moatLight); mctx.torchLights.push(moatLight);
    // Fire pillars
    for (let i = 0; i < 14; i++) {
      const pil = new THREE.Group();
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 5, 23), demonMat);
      col.position.y = 2.5; col.castShadow = true; pil.add(col);
      const fire = new THREE.PointLight(0xff2200, 0.6, 14);
      fire.position.y = 5.2; pil.add(fire); mctx.torchLights.push(fire);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 20), fireMat);
      flame.position.y = 5.3; pil.add(flame);
      const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 17), fireMat);
      flame2.position.set(0.05, 5.5, 0); pil.add(flame2);
      const px = (Math.random()-0.5)*w*0.75, pz = (Math.random()-0.5)*d*0.75;
      pil.position.set(px, getTerrainHeight(px, pz, 0.6), pz); mctx.scene.add(pil);
    }
    // Soul cages
    for (let i = 0; i < 6; i++) {
      const cage = new THREE.Group();
      // Vertical bars
      for (let b = 0; b < 8; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 17), cageMat);
        const bA = (b/8)*Math.PI*2;
        bar.position.set(Math.cos(bA)*0.25, 0, Math.sin(bA)*0.25); cage.add(bar);
      }
      // Top and bottom rings
      for (const ry of [-0.75, 0.75]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 17, 27), cageMat);
        ring.position.y = ry; cage.add(ring);
      }
      // Ghostly glow inside
      const soul = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 17),
        new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22cc44, emissiveIntensity: 1.0, transparent: true, opacity: 0.3 }));
      cage.add(soul);
      const cx = (Math.random()-0.5)*w*0.6, cz = (Math.random()-0.5)*d*0.6;
      cage.position.set(cx, getTerrainHeight(cx, cz, 0.6)+2+Math.random()*3, cz); mctx.scene.add(cage);
    }
    // Blood rivers (narrow channels)
    for (let i = 0; i < 4; i++) {
      const river = new THREE.Mesh(new THREE.PlaneGeometry(0.6, w*0.25+Math.random()*8), bloodMat);
      river.rotation.x = -Math.PI/2;
      const rx = (Math.random()-0.5)*w*0.6, rz = (Math.random()-0.5)*d*0.6;
      river.position.set(rx, getTerrainHeight(rx, rz, 0.6)+0.02, rz);
      river.rotation.z = Math.random()*Math.PI; mctx.scene.add(river);
    }
    // Hellfire braziers (larger, ornate)
    for (let i = 0; i < 8; i++) {
      const brazier = new THREE.Group();
      const bStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 23), chainMat);
      bStand.position.y = 0.6; brazier.add(bStand);
      const bBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.25, 27), chainMat);
      bBowl.position.y = 1.25; brazier.add(bBowl);
      const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.1, 27), chainMat);
      brazier.add(bBase);
      const bFlame1 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 36), fireMat);
      bFlame1.position.y = 1.55; brazier.add(bFlame1);
      const bFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 17), fireMat);
      bFlame2.position.set(0.05, 1.65, 0.03); brazier.add(bFlame2);
      const bLight = new THREE.PointLight(0xff4400, 0.7, 8);
      bLight.position.y = 1.6; brazier.add(bLight); mctx.torchLights.push(bLight);
      const brx = (Math.random()-0.5)*w*0.65, brz = (Math.random()-0.5)*d*0.65;
      brazier.position.set(brx, getTerrainHeight(brx, brz, 0.6), brz); mctx.scene.add(brazier);
    }
    // Skull piles
    for (let i = 0; i < 10; i++) {
      const pile = new THREE.Group();
      const count = 4+Math.floor(Math.random()*6);
      for (let s = 0; s < count; s++) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.06+Math.random()*0.04, 20, 17), skullMat);
        skull.position.set((Math.random()-0.5)*0.3, Math.random()*0.15, (Math.random()-0.5)*0.3); pile.add(skull);
      }
      const px = (Math.random()-0.5)*w*0.75, pz = (Math.random()-0.5)*d*0.75;
      pile.position.set(px, getTerrainHeight(px, pz, 0.6), pz); mctx.scene.add(pile);
    }
    // Bone piles
    for (let i = 0; i < 15; i++) {
      const pile = new THREE.Group();
      for (let b = 0; b < 6; b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3+Math.random()*0.2, 17), boneMat);
        bone.position.set((Math.random()-0.5)*0.5, 0.05, (Math.random()-0.5)*0.5);
        bone.rotation.set(Math.random(), Math.random(), Math.random()); pile.add(bone);
      }
      const bx = (Math.random()-0.5)*w*0.8, bz = (Math.random()-0.5)*d*0.8;
      pile.position.set(bx, getTerrainHeight(bx, bz, 0.6), bz); mctx.scene.add(pile);
    }
    // Demon statues with glowing eyes
    for (let i = 0; i < 6; i++) {
      const statue = new THREE.Group();
      const sBase = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), demonMat);
      sBase.position.y = 0.15; statue.add(sBase);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 23), demonMat);
      body.position.y = 1.5; body.castShadow = true; statue.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 31, 20), demonMat);
      head.position.y = 2.95; statue.add(head);
      for (const hx of [-0.2, 0.2]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 17), demonMat);
        horn.position.set(hx, 3.3, 0); horn.rotation.z = hx > 0 ? -0.3 : 0.3; statue.add(horn);
      }
      // Glowing eyes
      for (const ex of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 17, 16),
          new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 3.0 }));
        eye.position.set(ex, 3.0, 0.2); statue.add(eye);
      }
      // Wings
      for (const wx of [-0.4, 0.4]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x331111, side: THREE.DoubleSide, roughness: 0.8 }));
        wing.position.set(wx, 2.2, -0.2); wing.rotation.y = wx > 0 ? -0.5 : 0.5; statue.add(wing);
      }
      const sx = (Math.random()-0.5)*w*0.55, sz = (Math.random()-0.5)*d*0.55;
      statue.position.set(sx, getTerrainHeight(sx, sz, 0.6), sz); mctx.scene.add(statue);
    }
    // Lava pools (additional)
    for (let i = 0; i < 6; i++) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.8+Math.random()*1.5, 30), fireMat);
      pool.rotation.x = -Math.PI/2;
      const px = (Math.random()-0.5)*w*0.6, pz = (Math.random()-0.5)*d*0.6;
      pool.position.set(px, getTerrainHeight(px, pz, 0.6)+0.02, pz); mctx.scene.add(pool);
    }
    // ── Lava fountain centerpieces ──
    for (let i = 0; i < 3; i++) {
      const fountain = new THREE.Group();
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.3, 27), chainMat);
      basin.position.y = 0.15; fountain.add(basin);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 20), chainMat);
      pillar.position.y = 0.65; fountain.add(pillar);
      const lavaTop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 17), fireMat);
      lavaTop.position.y = 1.2; fountain.add(lavaTop);
      for (let s = 0; s < 3; s++) {
        const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.6, 16), fireMat);
        const sa = (s / 3) * Math.PI * 2;
        stream.position.set(Math.cos(sa)*0.15, 0.9, Math.sin(sa)*0.15);
        stream.rotation.z = 0.3 * Math.cos(sa); fountain.add(stream);
      }
      const lfx = (Math.random()-0.5)*w*0.4, lfz = (Math.random()-0.5)*d*0.4;
      fountain.position.set(lfx, getTerrainHeight(lfx, lfz, 0.6), lfz); mctx.scene.add(fountain);
    }
    // ── Chain suspension bridge segments ──
    for (let i = 0; i < 3; i++) {
      const bridgeGrp = new THREE.Group();
      const bridgeLen = 3 + Math.random() * 4;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, bridgeLen), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }));
      bridgeGrp.add(plank);
      for (const side of [-0.4, 0.4]) {
        for (let c = 0; c < 6; c++) {
          const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 16, 16), chainMat);
          link.position.set(side, 0.1 + c * 0.08, (Math.random()-0.5)*bridgeLen*0.8);
          link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2; bridgeGrp.add(link);
        }
      }
      const bx = (Math.random()-0.5)*w*0.4, bz = (Math.random()-0.5)*d*0.4;
      bridgeGrp.position.set(bx, getTerrainHeight(bx, bz, 0.6) + 1 + Math.random() * 2, bz);
      bridgeGrp.rotation.y = Math.random() * Math.PI; mctx.scene.add(bridgeGrp);
    }
    // ── Tortured soul relief carvings on walls ──
    for (let i = 0; i < 8; i++) {
      const relief = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), demonMat);
      relief.add(panel);
      for (let f = 0; f < 3; f++) {
        const figure = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.8 }));
        figure.position.set(-0.3 + f * 0.3, -0.1, 0.06); relief.add(figure);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.8 }));
        head.position.set(-0.3 + f * 0.3, 0.25, 0.06); relief.add(head);
      }
      const rlx = (Math.random()-0.5)*w*0.6, rlz = (Math.random()-0.5)*d*0.6;
      relief.position.set(rlx, getTerrainHeight(rlx, rlz, 0.6) + 2, rlz);
      relief.rotation.y = Math.random() * Math.PI; mctx.scene.add(relief);
    }
    // ── Demon skull throne detail (elaborate secondary thrones) ──
    for (let i = 0; i < 2; i++) {
      const dThrone = new THREE.Group();
      for (let step = 0; step < 4; step++) {
        const platStep = new THREE.Mesh(new THREE.BoxGeometry(2.5 + step * 0.6, 0.25, 2 + step * 0.4), demonMat);
        platStep.position.y = -step * 0.25; platStep.castShadow = true; dThrone.add(platStep);
      }
      const dSeat = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.8), demonMat);
      dSeat.position.y = 0.85; dSeat.castShadow = true; dThrone.add(dSeat);
      const dBack = new THREE.Mesh(new THREE.BoxGeometry(2, 3.5, 0.4), demonMat);
      dBack.position.set(0, 3.2, -0.7); dBack.castShadow = true; dThrone.add(dBack);
      for (const ax of [-0.9, 0.9]) {
        const dtArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 1.8), demonMat);
        dtArm.position.set(ax, 1.8, 0); dThrone.add(dtArm);
        const dtArmSkull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 17), skullMat);
        dtArmSkull.position.set(ax, 2.3, 0.7); dThrone.add(dtArmSkull);
        for (const ex of [-0.06, 0.06]) {
          const dtEyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0 }));
          dtEyeSocket.position.set(ax + ex, 2.35, 0.85); dThrone.add(dtEyeSocket);
        }
      }
      for (let s = 0; s < 3; s++) {
        const dtBSkull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 17), skullMat);
        dtBSkull.position.set(-0.5 + s * 0.5, 4.5, -0.7); dThrone.add(dtBSkull);
        for (const ex of [-0.05, 0.05]) {
          const dtBEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0 }));
          dtBEye.position.set(-0.5 + s * 0.5 + ex, 4.55, -0.55); dThrone.add(dtBEye);
        }
      }
      for (const hx of [-0.7, 0.7]) {
        const dtHorn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.5, 20), demonMat);
        dtHorn.position.set(hx, 5.5, -0.7); dtHorn.rotation.z = hx > 0 ? -0.2 : 0.2; dThrone.add(dtHorn);
      }
      const dtx = (i === 0 ? -1 : 1) * w * 0.25;
      dThrone.position.set(dtx, getTerrainHeight(dtx, 0, 0.6), 0);
      dThrone.rotation.y = i === 0 ? 0.3 : -0.3; mctx.scene.add(dThrone);
    }
    // ── Lava fountain centerpieces (enhanced) ──
    for (let i = 0; i < 4; i++) {
      const lavFount = new THREE.Group();
      const lfBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 23), chainMat);
      lfBase.position.y = 1.25; lfBase.castShadow = true; lavFount.add(lfBase);
      const lfBowl = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 17, 0, Math.PI * 2, 0, Math.PI / 2), chainMat);
      lfBowl.rotation.x = Math.PI; lfBowl.position.y = 2.8; lavFount.add(lfBowl);
      const lfLavaSurf = new THREE.Mesh(new THREE.CircleGeometry(0.65, 27), fireMat);
      lfLavaSurf.rotation.x = -Math.PI / 2; lfLavaSurf.position.y = 2.6; lavFount.add(lfLavaSurf);
      for (let s = 0; s < 5; s++) {
        const lfStreamA = (s / 5) * Math.PI * 2;
        const lfStream = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 2.0, 16), fireMat);
        lfStream.position.set(Math.cos(lfStreamA) * 0.55, 1.6, Math.sin(lfStreamA) * 0.55);
        lfStream.rotation.z = Math.cos(lfStreamA) * 0.15; lavFount.add(lfStream);
      }
      const lfSplash = new THREE.Mesh(new THREE.CircleGeometry(1.2, 27), fireMat);
      lfSplash.rotation.x = -Math.PI / 2; lfSplash.position.y = 0.02; lavFount.add(lfSplash);
      const lfLight = new THREE.PointLight(0xff4400, 0.9, 12);
      lfLight.position.y = 2.8; lavFount.add(lfLight); mctx.torchLights.push(lfLight);
      const lfpx = (Math.random() - 0.5) * w * 0.5, lfpz = (Math.random() - 0.5) * d * 0.5;
      lavFount.position.set(lfpx, getTerrainHeight(lfpx, lfpz, 0.6), lfpz); mctx.scene.add(lavFount);
    }
    // ── Chain suspension bridges (enhanced with sag) ──
    for (let i = 0; i < 3; i++) {
      const csBridge = new THREE.Group();
      const csLen = 6 + Math.random() * 5;
      const csPlankCount = Math.floor(csLen / 0.4);
      for (let p = 0; p < csPlankCount; p++) {
        const csT = p / csPlankCount;
        const csSagY = -Math.sin(csT * Math.PI) * 0.6;
        const csPlank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }));
        csPlank.position.set(0, csSagY, -csLen / 2 + p * 0.4); csBridge.add(csPlank);
      }
      for (const csEndZ of [-csLen / 2 - 0.3, csLen / 2 + 0.3]) {
        const csPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 17), chainMat);
        csPost.position.set(0, 1.0, csEndZ); csPost.castShadow = true; csBridge.add(csPost);
        for (let c = 0; c < 8; c++) {
          const csLink = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 16, 16), chainMat);
          const csLinkT = c / 8;
          csLink.position.set(0, 2.0 - csLinkT * 1.5, csEndZ + (csEndZ > 0 ? -1 : 1) * csLinkT * 1.5);
          csLink.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2; csBridge.add(csLink);
        }
      }
      const csBx = (Math.random() - 0.5) * w * 0.4, csBz = (Math.random() - 0.5) * d * 0.4;
      csBridge.position.set(csBx, getTerrainHeight(csBx, csBz, 0.6) + 1.5 + Math.random() * 2, csBz);
      csBridge.rotation.y = Math.random() * Math.PI; mctx.scene.add(csBridge);
    }
    // ── Tortured soul relief carvings (enhanced with hands) ──
    for (let i = 0; i < 10; i++) {
      const tsRelief = new THREE.Group();
      const tsBg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.08), demonMat);
      tsRelief.add(tsBg);
      for (let f = 0; f < 2 + Math.floor(Math.random() * 2); f++) {
        const tsFace = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 17), new THREE.MeshStandardMaterial({ color: 0x554444, roughness: 0.8 }));
        tsFace.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.2, 0.06);
        tsFace.scale.z = 0.5; tsRelief.add(tsFace);
        for (let finger = 0; finger < 4; finger++) {
          const tsFing = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x554444, roughness: 0.8 }));
          tsFing.position.set(tsFace.position.x + (finger - 1.5) * 0.025, tsFace.position.y - 0.2, 0.06);
          tsFing.rotation.z = (Math.random() - 0.5) * 0.3; tsRelief.add(tsFing);
        }
        const tsPalm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.03), new THREE.MeshStandardMaterial({ color: 0x554444, roughness: 0.8 }));
        tsPalm.position.set(tsFace.position.x, tsFace.position.y - 0.15, 0.06); tsRelief.add(tsPalm);
      }
      const tspx = (Math.random() - 0.5) * w * 0.7, tspz = (Math.random() - 0.5) * d * 0.7;
      tsRelief.position.set(tspx, getTerrainHeight(tspx, tspz, 0.6) + 2 + Math.random() * 1.5, tspz);
      tsRelief.rotation.y = Math.random() * Math.PI; mctx.scene.add(tsRelief);
    }
    // ── Hellfire brazier stands (tripod style) ──
    for (let i = 0; i < 8; i++) {
      const tripodBrazier = new THREE.Group();
      for (let leg = 0; leg < 3; leg++) {
        const tripodLegA = (leg / 3) * Math.PI * 2;
        const tripodLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.8, 17), chainMat);
        tripodLeg.position.set(Math.cos(tripodLegA) * 0.15, 0.8, Math.sin(tripodLegA) * 0.15);
        tripodLeg.rotation.x = Math.sin(tripodLegA) * 0.2;
        tripodLeg.rotation.z = -Math.cos(tripodLegA) * 0.2; tripodBrazier.add(tripodLeg);
      }
      const tripodBowl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 17, 0, Math.PI * 2, 0, Math.PI / 2), chainMat);
      tripodBowl.rotation.x = Math.PI; tripodBowl.position.y = 1.7; tripodBrazier.add(tripodBowl);
      for (let f = 0; f < 4; f++) {
        const tripodFire = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 16, 16), fireMat);
        tripodFire.position.set((Math.random() - 0.5) * 0.15, 1.75 + Math.random() * 0.15, (Math.random() - 0.5) * 0.15);
        tripodBrazier.add(tripodFire);
      }
      const tripodLight = new THREE.PointLight(0xff4400, 0.6, 10);
      tripodLight.position.y = 1.8; tripodBrazier.add(tripodLight); mctx.torchLights.push(tripodLight);
      const tripodX = (Math.random() - 0.5) * w * 0.65, tripodZ = (Math.random() - 0.5) * d * 0.65;
      tripodBrazier.position.set(tripodX, getTerrainHeight(tripodX, tripodZ, 0.6), tripodZ); mctx.scene.add(tripodBrazier);
    }
    // ── Bone cage gibbets ──
    for (let i = 0; i < 6; i++) {
      const gibbet = new THREE.Group();
      const gibBarCount = 10;
      for (let b = 0; b < gibBarCount; b++) {
        const gibBarA = (b / gibBarCount) * Math.PI * 2;
        const gibBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 16), boneMat);
        gibBar.position.set(Math.cos(gibBarA) * 0.25, 0, Math.sin(gibBarA) * 0.25); gibbet.add(gibBar);
      }
      const gibTopRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 16, 24), boneMat);
      gibTopRing.position.y = 0.7; gibbet.add(gibTopRing);
      const gibBotRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 16, 24), boneMat);
      gibBotRing.position.y = -0.7; gibbet.add(gibBotRing);
      const gibChainLen = 2 + Math.random() * 3;
      for (let c = 0; c < Math.floor(gibChainLen / 0.15); c++) {
        const gibLink = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 16, 16), chainMat);
        gibLink.position.y = 0.7 + c * 0.12;
        gibLink.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2; gibbet.add(gibLink);
      }
      const gibX = (Math.random() - 0.5) * w * 0.6, gibZ = (Math.random() - 0.5) * d * 0.6;
      gibbet.position.set(gibX, getTerrainHeight(gibX, gibZ, 0.6) + 3 + Math.random() * 2, gibZ); mctx.scene.add(gibbet);
    }
    // ── Blood rivers (winding channels) ──
    for (let i = 0; i < 3; i++) {
      const bldRiver = new THREE.Group();
      const bldSegCount = 5 + Math.floor(Math.random() * 4);
      let bldRx = 0, bldRz = 0;
      for (let s = 0; s < bldSegCount; s++) {
        const bldSeg = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + Math.random() * 0.4, 2 + Math.random() * 2), bloodMat);
        bldSeg.rotation.x = -Math.PI / 2;
        bldRx += (Math.random() - 0.5) * 1.5;
        bldRz += 1.5 + Math.random();
        bldSeg.position.set(bldRx, 0.02, bldRz - bldSegCount);
        bldSeg.rotation.z = Math.atan2((Math.random() - 0.5), 1); bldRiver.add(bldSeg);
      }
      const bldPx = (Math.random() - 0.5) * w * 0.5, bldPz = (Math.random() - 0.5) * d * 0.5;
      bldRiver.position.set(bldPx, getTerrainHeight(bldPx, bldPz, 0.6), bldPz);
      bldRiver.rotation.y = Math.random() * Math.PI; mctx.scene.add(bldRiver);
    }
    // ── Demon statues (imposing figures) ──
    for (let i = 0; i < 4; i++) {
      const demonStat = new THREE.Group();
      const dsPed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), demonMat);
      dsPed.position.y = 0.3; dsPed.castShadow = true; demonStat.add(dsPed);
      for (const dsLx of [-0.2, 0.2]) {
        const dsLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), demonMat);
        dsLeg.position.set(dsLx, 1.35, 0); dsLeg.castShadow = true; demonStat.add(dsLeg);
      }
      const dsTorso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), demonMat);
      dsTorso.position.y = 2.7; dsTorso.castShadow = true; demonStat.add(dsTorso);
      const dsHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 17), demonMat);
      dsHead.position.y = 3.55; demonStat.add(dsHead);
      for (const dsHx of [-0.2, 0.2]) {
        const dsHorn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.7, 17), demonMat);
        dsHorn.position.set(dsHx, 3.9, 0); dsHorn.rotation.z = dsHx > 0 ? -0.25 : 0.25; demonStat.add(dsHorn);
      }
      for (const dsArmSide of [-0.5, 0.5]) {
        const dsArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 17), demonMat);
        dsArm.position.set(dsArmSide, 2.7, 0.3); dsArm.rotation.x = 0.5; demonStat.add(dsArm);
      }
      const dsShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 16), chainMat);
      dsShaft.position.set(0.5, 2.8, 0.8); dsShaft.rotation.x = 0.7; demonStat.add(dsShaft);
      const dsTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 17), chainMat);
      dsTip.position.set(0.5, 3.7, 1.5); dsTip.rotation.x = 0.7; demonStat.add(dsTip);
      const dsPx = (Math.random() - 0.5) * w * 0.55, dsPz = (Math.random() - 0.5) * d * 0.55;
      demonStat.position.set(dsPx, getTerrainHeight(dsPx, dsPz, 0.6), dsPz);
      demonStat.rotation.y = Math.random() * Math.PI * 2; mctx.scene.add(demonStat);
    }
}

