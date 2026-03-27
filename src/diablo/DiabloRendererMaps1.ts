import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { VendorType } from './DiabloTypes';
import { VENDOR_DEFS } from './DiabloConfig';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildForest(mctx: MapBuildContext, w: number, d: number, propMult: number = 1.0): void {
    mctx.scene.fog = new THREE.FogExp2(0x2a4a2a, 0.015);
    mctx.applyTerrainColors(0x2a4a1a, 0x4b6a3b);
    mctx.dirLight.color.setHex(0xffe8b0);
    mctx.dirLight.intensity = 1.5;
    mctx.ambientLight.color.setHex(0x354525);
    mctx.hemiLight.color.setHex(0x88aa66);
    mctx.hemiLight.groundColor.setHex(0x443322);

    const hw = w / 2;

    // Trees (130 * propMult) - varied types: oak, pine, birch, willow with detailed bark, knots, branches, roots
    const treeTypes = ['oak', 'pine', 'birch', 'willow'] as const;
    for (let i = 0; i < Math.round(130 * propMult); i++) {
      const tree = new THREE.Group();
      const tType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      const trunkH = tType === 'pine' ? 2.5 + Math.random() * 3.5 : tType === 'willow' ? 2.0 + Math.random() * 2.0 : 1.5 + Math.random() * 2.5;
      const trunkR = tType === 'oak' ? 0.2 + Math.random() * 0.2 : tType === 'birch' ? 0.08 + Math.random() * 0.08 : 0.15 + Math.random() * 0.15;
      const trunkGeo = new THREE.CylinderGeometry(trunkR, trunkR * 1.3, trunkH, 27);
      const barkBases: Record<string, number> = { oak: 0x5c3a1e, pine: 0x4a2a0e, birch: 0xccbbaa, willow: 0x6a4a2a };
      const barkColor = (barkBases[tType] || 0x5c3a1e) + Math.floor(Math.random() * 0x111100);
      const trunkMat = new THREE.MeshStandardMaterial({ color: barkColor, roughness: 0.92, metalness: 0.02 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Bark rings along trunk
      const barkRingCount = 2 + Math.floor(Math.random() * 3);
      for (let br = 0; br < barkRingCount; br++) {
        const ringY = 0.4 + (br / barkRingCount) * trunkH * 0.6;
        const ringGeo = new THREE.TorusGeometry(trunkR * 1.15, trunkR * 0.2, 23, 27);
        const ring = new THREE.Mesh(ringGeo, trunkMat);
        ring.position.y = ringY;
        ring.rotation.x = Math.PI / 2;
        tree.add(ring);
      }

      // Bark knots (wood detail bumps)
      for (let k = 0; k < Math.floor(Math.random() * 3); k++) {
        const knotGeo = new THREE.SphereGeometry(trunkR * 0.3, 20, 17);
        const knot = new THREE.Mesh(knotGeo, new THREE.MeshStandardMaterial({ color: barkColor - 0x111100, roughness: 0.95 }));
        const kAng = Math.random() * Math.PI * 2;
        knot.position.set(Math.cos(kAng) * trunkR * 0.9, 0.5 + Math.random() * trunkH * 0.6, Math.sin(kAng) * trunkR * 0.9);
        knot.scale.set(0.8, 1.2, 0.8);
        tree.add(knot);
      }

      // Exposed roots at base
      const rootCount = 2 + Math.floor(Math.random() * 4);
      for (let r = 0; r < rootCount; r++) {
        const rootAngle = (r / rootCount) * Math.PI * 2 + Math.random() * 0.5;
        const rootLen = 0.3 + Math.random() * 0.5;
        const rootGeo = new THREE.CylinderGeometry(trunkR * 0.3, trunkR * 0.12, rootLen, 20);
        const root = new THREE.Mesh(rootGeo, trunkMat);
        root.position.set(Math.cos(rootAngle) * trunkR * 0.8, rootLen * 0.2, Math.sin(rootAngle) * trunkR * 0.8);
        root.rotation.z = Math.cos(rootAngle) * 0.8;
        root.rotation.x = Math.sin(rootAngle) * 0.8;
        tree.add(root);
      }

      // Horizontal branches for oak/willow
      if (tType === 'oak' || tType === 'willow') {
        for (let br = 0; br < 2 + Math.floor(Math.random() * 3); br++) {
          const brAng = Math.random() * Math.PI * 2;
          const brLen = 0.8 + Math.random() * 1.2;
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.2, trunkR * 0.35, brLen, 20), trunkMat);
          branch.position.set(Math.cos(brAng) * trunkR * 0.5, trunkH * 0.5 + Math.random() * trunkH * 0.4, Math.sin(brAng) * trunkR * 0.5);
          branch.rotation.z = (Math.random() - 0.5) * 1.2 + (brAng > Math.PI ? 0.5 : -0.5);
          branch.rotation.y = brAng;
          tree.add(branch);
        }
      }

      // Type-specific foliage
      if (tType === 'pine') {
        const pineGreen = 0x1a5a1a + Math.floor(Math.random() * 0x113300);
        for (let li = 0; li < 5; li++) {
          const layerR = (1.8 - li * 0.3) * (0.8 + Math.random() * 0.2);
          const layerGeo = new THREE.ConeGeometry(layerR, 1.2 - li * 0.1, 27);
          const layer = new THREE.Mesh(layerGeo, new THREE.MeshStandardMaterial({ color: pineGreen + li * 0x050500, roughness: 0.85 }));
          layer.position.y = trunkH * 0.3 + li * 0.9;
          layer.castShadow = true;
          tree.add(layer);
        }
      } else if (tType === 'birch') {
        const birchGreen = 0x55aa44 + Math.floor(Math.random() * 0x224400);
        for (let li = 0; li < 2; li++) {
          const layerR = 0.8 + Math.random() * 0.6;
          const layer = new THREE.Mesh(new THREE.SphereGeometry(layerR, 23, 20),
            new THREE.MeshStandardMaterial({ color: birchGreen + li * 0x112200, roughness: 0.75, transparent: true, opacity: 0.85 }));
          layer.position.y = trunkH + 0.5 + li * 0.8;
          layer.castShadow = true;
          tree.add(layer);
        }
      } else if (tType === 'willow') {
        const willowGreen = 0x3a8a3a + Math.floor(Math.random() * 0x224400);
        const willowCrown = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 0.5, 23, 20),
          new THREE.MeshStandardMaterial({ color: willowGreen, roughness: 0.8 }));
        willowCrown.position.y = trunkH + 0.8;
        willowCrown.castShadow = true;
        tree.add(willowCrown);
        for (let f = 0; f < 12; f++) {
          const fAng = (f / 12) * Math.PI * 2;
          const fLen = 1.5 + Math.random() * 1.5;
          const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.08, fLen),
            new THREE.MeshStandardMaterial({ color: willowGreen + 0x112200, roughness: 0.8, side: THREE.DoubleSide }));
          frond.position.set(Math.cos(fAng) * 1.2, trunkH - fLen * 0.3, Math.sin(fAng) * 1.2);
          frond.rotation.x = 0.2;
          tree.add(frond);
        }
      } else {
        // Oak: 4 dense cone layers + sphere cap
        const baseGreenShade = 0x228b22 + Math.floor(Math.random() * 0x224400);
        const leafCols = [baseGreenShade, baseGreenShade + 0x112200, baseGreenShade - 0x001100, baseGreenShade + 0x003300];
        const layerCfgs = [
          { rM: 1.0, hM: 0.9, yO: -0.3 }, { rM: 0.82, hM: 0.8, yO: 0.3 },
          { rM: 0.6, hM: 0.7, yO: 0.8 }, { rM: 0.4, hM: 0.55, yO: 1.2 },
        ];
        const crownR = 1.2 + Math.random() * 1.4;
        const crownH = 2.0 + Math.random() * 2.0;
        for (let li = 0; li < 4; li++) {
          const lc = layerCfgs[li];
          const layerGeo = new THREE.ConeGeometry(crownR * lc.rM, crownH * lc.hM, 27);
          const layer = new THREE.Mesh(layerGeo, new THREE.MeshStandardMaterial({ color: leafCols[li], roughness: 0.8 }));
          layer.position.y = trunkH + crownH * 0.3 + lc.yO;
          layer.castShadow = true;
          tree.add(layer);
        }
        // Sphere cap
        const capMesh = new THREE.Mesh(new THREE.SphereGeometry(crownR * 0.4, 23, 20),
          new THREE.MeshStandardMaterial({ color: baseGreenShade + 0x112200, roughness: 0.75 }));
        capMesh.position.y = trunkH + crownH * 0.3 + 1.5;
        capMesh.castShadow = true;
        tree.add(capMesh);
      }


      // Small branch stubs along trunk
      for (let bs = 0; bs < 3; bs++) {
        const stubAng = Math.random() * Math.PI * 2;
        const stubLen = 0.15 + Math.random() * 0.2;
        const stubGeo = new THREE.CylinderGeometry(trunkR * 0.08, trunkR * 0.15, stubLen, 27);
        const stub = new THREE.Mesh(stubGeo, trunkMat);
        stub.position.set(
          Math.cos(stubAng) * trunkR * 0.95,
          0.8 + Math.random() * trunkH * 0.5,
          Math.sin(stubAng) * trunkR * 0.95
        );
        stub.rotation.z = Math.cos(stubAng) * 1.2;
        stub.rotation.x = Math.sin(stubAng) * 1.2;
        tree.add(stub);
      }

      // Bark texture bumps - small sphere clusters on trunk surface with color variation
      const barkBumpCount = 4 + Math.floor(Math.random() * 5);
      const barkColorVariants = [barkColor - 0x080800, barkColor - 0x0a0a00, barkColor - 0x050500, barkColor + 0x030300];
      for (let bb = 0; bb < barkBumpCount; bb++) {
        const bumpAng = Math.random() * Math.PI * 2;
        const bumpY = 0.3 + Math.random() * trunkH * 0.7;
        const bumpGeo = new THREE.SphereGeometry(trunkR * 0.15 + Math.random() * trunkR * 0.1, 14, 12);
        const bumpColorPick = barkColorVariants[Math.floor(Math.random() * barkColorVariants.length)];
        const bump = new THREE.Mesh(bumpGeo, new THREE.MeshStandardMaterial({ color: bumpColorPick, roughness: 0.98 }));
        bump.position.set(Math.cos(bumpAng) * trunkR * 0.95, bumpY, Math.sin(bumpAng) * trunkR * 0.95);
        // Elongate some bumps vertically for organic look
        const bumpElongation = 0.8 + Math.random() * 0.8;
        bump.scale.set(0.6, bumpElongation, 0.6);
        tree.add(bump);
      }

      // Mushroom clusters near tree base
      if (Math.random() > 0.5) {
        const mushClusterCount = 2 + Math.floor(Math.random() * 3);
        for (let mc = 0; mc < mushClusterCount; mc++) {
          const mcAng = Math.random() * Math.PI * 2;
          const mcDist = trunkR * 1.2 + Math.random() * 0.2;
          const mcStemH = 0.05 + Math.random() * 0.06;
          const mcStemX = Math.cos(mcAng) * mcDist;
          const mcStemZ = Math.sin(mcAng) * mcDist;
          const mcStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, mcStemH, 12),
            new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.8 }));
          mcStem.position.set(mcStemX, mcStemH / 2, mcStemZ);
          tree.add(mcStem);
          const mcCapR = 0.03 + Math.random() * 0.03;
          const mcCapColor = [0xaa7744, 0xcc8855, 0x886633][mc % 3];
          const mcCap = new THREE.Mesh(new THREE.SphereGeometry(mcCapR, 16, 14, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: mcCapColor, roughness: 0.65 }));
          mcCap.position.set(mcStemX, mcStemH, mcStemZ);
          tree.add(mcCap);
          // Gill detail underneath cap (thin disc)
          const mcGillDisc = new THREE.Mesh(
            new THREE.CircleGeometry(mcCapR * 0.85, 16),
            new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.9, side: THREE.DoubleSide }));
          mcGillDisc.rotation.x = Math.PI / 2;
          mcGillDisc.position.set(mcStemX, mcStemH - 0.003, mcStemZ);
          tree.add(mcGillDisc);
          // Gill radial lines underneath cap
          for (let gl = 0; gl < 6; gl++) {
            const gillAng = (gl / 6) * Math.PI * 2;
            const gillLine = new THREE.Mesh(
              new THREE.BoxGeometry(mcCapR * 0.8, 0.002, 0.002),
              new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.9 }));
            gillLine.position.set(
              mcStemX + Math.cos(gillAng) * mcCapR * 0.35,
              mcStemH - 0.005,
              mcStemZ + Math.sin(gillAng) * mcCapR * 0.35);
            gillLine.rotation.y = gillAng;
            tree.add(gillLine);
          }
          // Spots on cap (tiny dots)
          const mcSpotCount = 2 + Math.floor(Math.random() * 3);
          for (let msp = 0; msp < mcSpotCount; msp++) {
            const spotAng = Math.random() * Math.PI * 2;
            const spotDist = mcCapR * 0.3 + Math.random() * mcCapR * 0.4;
            const mcSpotDot = new THREE.Mesh(
              new THREE.CircleGeometry(0.004 + Math.random() * 0.003, 8),
              new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.5, side: THREE.DoubleSide }));
            mcSpotDot.position.set(
              mcStemX + Math.cos(spotAng) * spotDist,
              mcStemH + mcCapR * 0.25 + Math.random() * mcCapR * 0.15,
              mcStemZ + Math.sin(spotAng) * spotDist);
            mcSpotDot.lookAt(mcStemX, mcStemH, mcStemZ);
            tree.add(mcSpotDot);
          }
          // Skirt/ring where cap meets stem
          const mcSkirtRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.018, 0.003, 8, 12),
            new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
          mcSkirtRing.rotation.x = Math.PI / 2;
          mcSkirtRing.position.set(mcStemX, mcStemH - 0.002, mcStemZ);
          tree.add(mcSkirtRing);
        }
      }

      // Bird nest in tree canopy (rare)
      if (Math.random() > 0.8) {
        const nestGrp = new THREE.Group();
        const nestBase = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 10, 16),
          new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.95 }));
        nestBase.rotation.x = Math.PI / 2;
        nestGrp.add(nestBase);
        // Twigs in nest
        for (let tw = 0; tw < 4; tw++) {
          const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.95 }));
          twig.rotation.z = Math.random() * Math.PI;
          twig.rotation.y = Math.random() * Math.PI;
          twig.position.y = 0.01;
          nestGrp.add(twig);
        }
        // Tiny eggs
        for (let eg = 0; eg < 2; eg++) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xddeedd, roughness: 0.6 }));
          egg.scale.y = 1.3;
          egg.position.set((eg - 0.5) * 0.03, 0.015, 0);
          nestGrp.add(egg);
        }
        const branchAng = Math.random() * Math.PI * 2;
        nestGrp.position.set(Math.cos(branchAng) * trunkR * 2, trunkH * 0.6 + Math.random() * trunkH * 0.3, Math.sin(branchAng) * trunkR * 2);
        tree.add(nestGrp);
      }

      // Cobweb between branches (rare)
      if (Math.random() > 0.75) {
        const webGeo = new THREE.PlaneGeometry(0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.3);
        const webMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.3, side: THREE.DoubleSide,
        });
        const web = new THREE.Mesh(webGeo, webMat);
        const webAng = Math.random() * Math.PI * 2;
        web.position.set(Math.cos(webAng) * trunkR * 1.5, trunkH * 0.3 + Math.random() * trunkH * 0.4, Math.sin(webAng) * trunkR * 1.5);
        web.rotation.y = webAng;
        web.rotation.x = (Math.random() - 0.5) * 0.3;
        tree.add(web);
      }

      // Fallen leaves/debris at tree base
      const leafDebrisCount = 3 + Math.floor(Math.random() * 4);
      for (let ld = 0; ld < leafDebrisCount; ld++) {
        const ldAng = Math.random() * Math.PI * 2;
        const ldDist = trunkR * 0.8 + Math.random() * 0.6;
        const ldSize = 0.04 + Math.random() * 0.06;
        const ldGeo = new THREE.CircleGeometry(ldSize, 6);
        const ldColors = [0x886622, 0x995533, 0xaa7744, 0x664411, 0x3a6a2a];
        const leafDebris = new THREE.Mesh(ldGeo,
          new THREE.MeshStandardMaterial({ color: ldColors[ld % ldColors.length], roughness: 1.0, side: THREE.DoubleSide }));
        leafDebris.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.15;
        leafDebris.rotation.z = Math.random() * Math.PI * 2;
        leafDebris.position.set(Math.cos(ldAng) * ldDist, 0.01, Math.sin(ldAng) * ldDist);
        tree.add(leafDebris);
      }

      // Ground shadow circle under tree
      const shadowR = tType === 'pine' ? 1.8 : tType === 'oak' ? 2.2 : 1.5;
      const shadowGeo = new THREE.CircleGeometry(shadowR + Math.random() * 0.5, 36);
      const shadowMat = new THREE.MeshStandardMaterial({ color: 0x111a11, transparent: true, opacity: 0.18, roughness: 1.0, side: THREE.DoubleSide });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      tree.add(shadow);
      const tx = (Math.random() - 0.5) * w;
      const tz = (Math.random() - 0.5) * d;
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      mctx.envGroup.add(tree);
    }

    // Rocks (55) - varied sizes, shapes with moss
    for (let i = 0; i < 55; i++) {
      const rockGrp = new THREE.Group();
      const rSize = 0.1 + Math.random() * 0.35;
      const rockGeo = i % 3 === 0 ? new THREE.IcosahedronGeometry(rSize, 2) : new THREE.DodecahedronGeometry(rSize, 2);
      const greyBrown = [0x666655, 0x777766, 0x888877, 0x5a5a4a][i % 4] + Math.floor(Math.random() * 0x111100);
      const rockMat = new THREE.MeshStandardMaterial({ color: greyBrown, roughness: 0.95, metalness: 0.05 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.scale.y = 0.5 + Math.random() * 0.5;
      rock.castShadow = true;
      rockGrp.add(rock);
      if (Math.random() > 0.4) {
        const mossGeo = new THREE.SphereGeometry(rSize * 0.5, 17, 16);
        const moss = new THREE.Mesh(mossGeo, new THREE.MeshStandardMaterial({ color: 0x3a6a2a + Math.floor(Math.random() * 0x112200), roughness: 1.0 }));
        moss.scale.y = 0.3;
        moss.position.y = rSize * 0.3;
        rockGrp.add(moss);
      }
      // Additional moss patches on rock sides (flattened spheres)
      if (Math.random() > 0.5) {
        const sideMossCount = 1 + Math.floor(Math.random() * 2);
        for (let sm = 0; sm < sideMossCount; sm++) {
          const smAng = Math.random() * Math.PI * 2;
          const sideMoss = new THREE.Mesh(new THREE.SphereGeometry(rSize * 0.25 + Math.random() * rSize * 0.15, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0x2a5a1a + Math.floor(Math.random() * 0x112200), roughness: 1.0 }));
          sideMoss.scale.set(1, 0.25, 1);
          sideMoss.position.set(Math.cos(smAng) * rSize * 0.4, rSize * 0.1 + Math.random() * rSize * 0.2, Math.sin(smAng) * rSize * 0.4);
          rockGrp.add(sideMoss);
        }
      }
      // Small vegetation around rock base (fern/plant cone+sphere combos)
      if (Math.random() > 0.6) {
        const vegCount = 1 + Math.floor(Math.random() * 2);
        for (let vg = 0; vg < vegCount; vg++) {
          const vgAng = Math.random() * Math.PI * 2;
          const vgDist = rSize * 1.1 + Math.random() * 0.1;
          const vgStem = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08 + Math.random() * 0.06, 6),
            new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.9 }));
          vgStem.position.set(Math.cos(vgAng) * vgDist, 0.04, Math.sin(vgAng) * vgDist);
          rockGrp.add(vgStem);
          const vgLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a9a4a, roughness: 0.85 }));
          vgLeaf.scale.y = 0.5;
          vgLeaf.position.set(Math.cos(vgAng) * vgDist, 0.09, Math.sin(vgAng) * vgDist);
          rockGrp.add(vgLeaf);
        }
      }
      const rx = (Math.random() - 0.5) * w;
      const rz = (Math.random() - 0.5) * d;
      rockGrp.position.set(rx, getTerrainHeight(rx, rz) + 0.05 + Math.random() * 0.08, rz);
      rockGrp.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.envGroup.add(rockGrp);
    }

    // Path segments (20)
    for (let i = 0; i < 20; i++) {
      const segGeo = new THREE.BoxGeometry(2.5, 0.05, 3.0);
      const segMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 });
      const seg = new THREE.Mesh(segGeo, segMat);
      const sx = i * 2.4 - 24;
      const sz = Math.sin(i * 0.4) * 3;
      seg.position.set(sx, getTerrainHeight(sx, sz) + 0.02, sz);
      seg.rotation.y = Math.sin(i * 0.3) * 0.15;
      mctx.envGroup.add(seg);
    }

    // Grass tufts (100) - varied heights and greens
    const grassGreens = [0x44aa22, 0x3a9922, 0x55bb33, 0x2a8822, 0x4aaa2a];
    for (let i = 0; i < 100; i++) {
      const tuft = new THREE.Group();
      const bladeCount = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < bladeCount; j++) {
        const grassGeo = new THREE.ConeGeometry(0.05 + Math.random() * 0.05, 0.25 + Math.random() * 0.25, 17);
        const blade = new THREE.Mesh(grassGeo, new THREE.MeshStandardMaterial({ color: grassGreens[j % grassGreens.length], roughness: 0.9 }));
        blade.position.set((Math.random() - 0.5) * 0.25, 0.15, (Math.random() - 0.5) * 0.25);
        blade.rotation.z = (Math.random() - 0.5) * 0.5;
        blade.rotation.x = (Math.random() - 0.5) * 0.2;
        tuft.add(blade);
      }
      const tuftX = (Math.random() - 0.5) * w;
      const tuftZ = (Math.random() - 0.5) * d;
      tuft.position.set(tuftX, getTerrainHeight(tuftX, tuftZ), tuftZ);
      mctx.envGroup.add(tuft);
    }

    // Fallen logs (15) with fungus and moss detail
    for (let i = 0; i < 15; i++) {
      const logGrp = new THREE.Group();
      const logLen = 2.0 + Math.random() * 3.0;
      const logR = 0.12 + Math.random() * 0.15;
      const logColor = [0x4a3520, 0x3a2510, 0x5a4530][i % 3];
      const logGeo = new THREE.CylinderGeometry(logR * 0.9, logR * 1.15, logLen, 27);
      const logMat = new THREE.MeshStandardMaterial({ color: logColor, roughness: 0.95 });
      const logMesh = new THREE.Mesh(logGeo, logMat);
      logMesh.rotation.z = Math.PI / 2;
      logMesh.position.y = logR;
      logGrp.add(logMesh);
      // Cross-section ring at end
      const endRing = new THREE.Mesh(new THREE.RingGeometry(0, logR * 0.9, 16),
        new THREE.MeshStandardMaterial({ color: 0x8a7560, roughness: 0.8, side: THREE.DoubleSide }));
      endRing.rotation.y = Math.PI / 2;
      endRing.position.set(logLen * 0.5, logR, 0);
      logGrp.add(endRing);
      // Moss patches
      for (let m = 0; m < 4; m++) {
        const mossPatch = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 17, 16),
          new THREE.MeshStandardMaterial({ color: 0x3a7733 + Math.floor(Math.random() * 0x112200), roughness: 1.0 }));
        mossPatch.scale.y = 0.3;
        mossPatch.position.set((Math.random() - 0.5) * logLen * 0.7, logR * 1.4, (Math.random() - 0.5) * 0.1);
        logGrp.add(mossPatch);
      }
      // Bark texture rings along log
      for (let br = 0; br < 2; br++) {
        const ringPos = (Math.random() - 0.5) * logLen * 0.6;
        const barkRing = new THREE.Mesh(
          new THREE.TorusGeometry(logR * 1.05, logR * 0.12, 20, 27),
          logMat
        );
        barkRing.position.set(ringPos, logR, 0);
        barkRing.rotation.y = Math.PI / 2;
        logGrp.add(barkRing);
      }
      // Shelf fungus
      if (Math.random() > 0.4) {
        for (let sf = 0; sf < 2; sf++) {
          const fungus = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xaa8855, roughness: 0.7 }));
          fungus.scale.y = 0.3;
          fungus.position.set((Math.random() - 0.5) * logLen * 0.5, logR * 0.7, logR * (Math.random() > 0.5 ? 1 : -1));
          logGrp.add(fungus);
        }
      }
      // Wood grain detail lines along log
      const grainCount = 3 + Math.floor(Math.random() * 3);
      for (let wg = 0; wg < grainCount; wg++) {
        const grainAng = (wg / grainCount) * Math.PI * 2;
        const grainLen = logLen * 0.6 + Math.random() * logLen * 0.3;
        const grainGeo = new THREE.BoxGeometry(grainLen, logR * 0.04, logR * 0.06);
        const grain = new THREE.Mesh(grainGeo,
          new THREE.MeshStandardMaterial({ color: logColor - 0x0a0a00, roughness: 0.98 }));
        grain.position.set(0, logR + Math.cos(grainAng) * logR * 0.85, Math.sin(grainAng) * logR * 0.85);
        logGrp.add(grain);
      }
      // Cross-section growth rings at cut end
      for (let gr = 1; gr <= 3; gr++) {
        const ringR = logR * 0.9 * (gr / 4);
        const growthRing = new THREE.Mesh(new THREE.RingGeometry(ringR - 0.005, ringR, 16),
          new THREE.MeshStandardMaterial({ color: 0x7a6550, roughness: 0.85, side: THREE.DoubleSide }));
        growthRing.rotation.y = Math.PI / 2;
        growthRing.position.set(logLen * 0.5 + 0.001, logR, 0);
        logGrp.add(growthRing);
      }
      const logX = (Math.random() - 0.5) * w * 0.85;
      const logZ = (Math.random() - 0.5) * d * 0.85;
      logGrp.position.set(logX, getTerrainHeight(logX, logZ), logZ);
      logGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(logGrp);
    }

    // Mushrooms (28) - varied cap colors and spotted detail
    const mushCapColors = [0xcc3333, 0xdd8844, 0xeedd88, 0x886644, 0xddddcc];
    for (let i = 0; i < 28; i++) {
      const mush = new THREE.Group();
      const stemH = 0.1 + Math.random() * 0.15;
      const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, stemH, 23);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.8 }));
      stem.position.y = stemH / 2;
      mush.add(stem);
      const capR = 0.06 + Math.random() * 0.08;
      const capColor = mushCapColors[Math.floor(Math.random() * mushCapColors.length)];
      const capGeo = new THREE.SphereGeometry(capR, 44, 23, 0, Math.PI * 2, 0, Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.6 }));
      cap.position.y = stemH;
      mush.add(cap);
      // Spots on red/orange caps
      if (capColor === 0xcc3333 || capColor === 0xdd8844) {
        for (let sp = 0; sp < 4; sp++) {
          const spot = new THREE.Mesh(new THREE.CircleGeometry(0.01, 17),
            new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.5, side: THREE.DoubleSide }));
          const spAng = Math.random() * Math.PI * 2;
          spot.position.set(Math.cos(spAng) * capR * 0.5, stemH + capR * 0.3, Math.sin(spAng) * capR * 0.5);
          spot.lookAt(new THREE.Vector3(0, stemH, 0));
          mush.add(spot);
        }
      }
      const mushX = (Math.random() - 0.5) * w;
      const mushZ = (Math.random() - 0.5) * d;
      mush.position.set(mushX, getTerrainHeight(mushX, mushZ), mushZ);
      mctx.envGroup.add(mush);
    }

    // Winding stream with transparent water, riverbed stones and sparkles
    const streamSegs = 14;
    const streamBaseX = hw * 0.35;
    for (let si = 0; si < streamSegs; si++) {
      const sz = -d * 0.4 + si * (d * 0.8 / streamSegs);
      const sx = streamBaseX + Math.sin(si * 0.5) * 2.5;
      const segW = 1.8 + Math.sin(si * 0.8) * 0.6;
      const streamSeg = new THREE.Mesh(
        new THREE.PlaneGeometry(segW, d * 0.8 / streamSegs + 0.5),
        new THREE.MeshStandardMaterial({ color: 0x2277aa, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.15 })
      );
      streamSeg.rotation.x = -Math.PI / 2;
      streamSeg.position.set(sx, getTerrainHeight(sx, sz) + 0.02, sz);
      mctx.envGroup.add(streamSeg);
      // Riverbed stones with varied shapes and detail
      for (let rs = 0; rs < 5; rs++) {
        const riverStoneSize = 0.04 + Math.random() * 0.06;
        const riverStoneGeo = rs % 2 === 0
          ? new THREE.SphereGeometry(riverStoneSize, 20, 18)
          : new THREE.IcosahedronGeometry(riverStoneSize, 2);
        const riverStoneColor = [0x777788, 0x6a6a7a, 0x888899, 0x5a5a6a][rs % 4];
        const rStone = new THREE.Mesh(riverStoneGeo,
          new THREE.MeshStandardMaterial({ color: riverStoneColor, roughness: 0.7 }));
        // Varied flattening for different stone shapes
        rStone.scale.set(0.8 + Math.random() * 0.5, 0.3 + Math.random() * 0.25, 0.8 + Math.random() * 0.5);
        const rsSubmerge = Math.random() > 0.6 ? -0.01 : 0.01;
        rStone.position.set(sx + (Math.random() - 0.5) * segW * 0.8, getTerrainHeight(sx, sz) + rsSubmerge, sz + (Math.random() - 0.5) * 1.5);
        mctx.envGroup.add(rStone);
      }
      // Water plants/reeds along stream banks
      for (let reedIdx = 0; reedIdx < 2; reedIdx++) {
        const reedSide = reedIdx === 0 ? 1 : -1;
        const reedX = sx + reedSide * (segW * 0.45 + 0.1 + Math.random() * 0.3);
        const reedZ = sz + (Math.random() - 0.5) * 1.0;
        const reedH = 0.15 + Math.random() * 0.2;
        const reedStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.008, reedH, 6),
          new THREE.MeshStandardMaterial({ color: 0x446633, roughness: 0.85 }));
        reedStem.position.set(reedX, getTerrainHeight(sx, sz) + reedH / 2, reedZ);
        reedStem.rotation.z = (Math.random() - 0.5) * 0.15;
        reedStem.rotation.x = (Math.random() - 0.5) * 0.1;
        mctx.envGroup.add(reedStem);
        // Reed leaf/blade at top
        const reedLeaf = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.06, 0.003),
          new THREE.MeshStandardMaterial({ color: 0x558844, roughness: 0.8 }));
        reedLeaf.position.set(reedX, getTerrainHeight(sx, sz) + reedH, reedZ);
        reedLeaf.rotation.z = (Math.random() - 0.5) * 0.4;
        mctx.envGroup.add(reedLeaf);
      }
    }
    // Stream sparkle highlights
    for (let sp = 0; sp < 10; sp++) {
      const sparkle = new THREE.Mesh(new THREE.CircleGeometry(0.06, 17),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaddff, emissiveIntensity: 0.5, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      sparkle.rotation.x = -Math.PI / 2;
      const spSz = -d * 0.35 + Math.random() * d * 0.7;
      const spSx = streamBaseX + Math.sin(spSz * 0.04) * 2.5;
      sparkle.position.set(spSx + (Math.random() - 0.5) * 1, getTerrainHeight(spSx, spSz) + 0.04, spSz);
      mctx.envGroup.add(sparkle);
    }

    // Flower patches (40) - with proper petals, pistils, and variety
    const flowerColors = [0xcc3344, 0xddcc22, 0x8833aa, 0xeeeedd, 0xff6688, 0xffaa33];
    for (let i = 0; i < 40; i++) {
      const patch = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < count; j++) {
        const stemGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.22 + Math.random() * 0.15, 17);
        const fStem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x33aa22, roughness: 0.8 }));
        const fsx = (Math.random() - 0.5) * 0.4;
        const fsz = (Math.random() - 0.5) * 0.4;
        fStem.position.set(fsx, 0.12, fsz);
        fStem.rotation.z = (Math.random() - 0.5) * 0.15;
        patch.add(fStem);
        const fColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        // Petals in a ring
        const petalCount = 4 + Math.floor(Math.random() * 3);
        for (let p = 0; p < petalCount; p++) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.02, 17, 16),
            new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.5, emissive: fColor, emissiveIntensity: 0.05 }));
          const pAng = (p / petalCount) * Math.PI * 2;
          petal.scale.set(1.2, 0.5, 1);
          petal.position.set(fsx + Math.cos(pAng) * 0.02, 0.26, fsz + Math.sin(pAng) * 0.02);
          patch.add(petal);
        }
        // Pistil center
        const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.01, 17, 16),
          new THREE.MeshStandardMaterial({ color: 0xffff44, roughness: 0.4 }));
        pistil.position.set(fsx, 0.27, fsz);
        patch.add(pistil);
      }
      const patchX = (Math.random() - 0.5) * w;
      const patchZ = (Math.random() - 0.5) * d;
      patch.position.set(patchX, getTerrainHeight(patchX, patchZ), patchZ);
      mctx.envGroup.add(patch);
    }

    // Boulders (14) - with moss, lichen, and varied rock tones
    for (let i = 0; i < 14; i++) {
      const boulderGroup = new THREE.Group();
      const bRadius = 0.25 + Math.random() * 0.35;
      const boulderGeo = new THREE.SphereGeometry(bRadius, 23, 20);
      const boulderColor = [0x777766, 0x888877, 0x666655, 0x7a7a6a][i % 4];
      const boulderMat = new THREE.MeshStandardMaterial({ color: boulderColor, roughness: 0.95, metalness: 0.05 });
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.scale.y = 0.45 + Math.random() * 0.15;
      boulder.position.y = bRadius * 0.2;
      boulder.castShadow = true;
      boulderGroup.add(boulder);
      // Multiple moss patches
      const mossCount = 1 + Math.floor(Math.random() * 3);
      for (let m = 0; m < mossCount; m++) {
        const mossGeo = new THREE.SphereGeometry(bRadius * (0.2 + Math.random() * 0.2), 20, 17);
        const moss = new THREE.Mesh(mossGeo, new THREE.MeshStandardMaterial({ color: 0x3a6a2a + Math.floor(Math.random() * 0x112200), roughness: 1.0 }));
        moss.scale.y = 0.3;
        const mAng = Math.random() * Math.PI * 2;
        moss.position.set(Math.cos(mAng) * bRadius * 0.3, bRadius * 0.35, Math.sin(mAng) * bRadius * 0.3);
        boulderGroup.add(moss);
      }
      // Lichen patches
      if (Math.random() > 0.5) {
        const lichen = new THREE.Mesh(new THREE.CircleGeometry(bRadius * 0.3, 20),
          new THREE.MeshStandardMaterial({ color: 0xbbaa66, roughness: 0.9, side: THREE.DoubleSide }));
        lichen.position.set(0, bRadius * 0.4, bRadius * 0.3);
        lichen.lookAt(new THREE.Vector3(0, bRadius, bRadius));
        boulderGroup.add(lichen);
      }
      // Pebbles at base of boulder
      for (let pb = 0; pb < 3; pb++) {
        const pebbleAng = Math.random() * Math.PI * 2;
        const pebbleDist = bRadius * 0.9 + Math.random() * 0.15;
        const pebbleGeo = new THREE.IcosahedronGeometry(0.04 + Math.random() * 0.03, 2);
        const pebble = new THREE.Mesh(pebbleGeo, boulderMat);
        pebble.position.set(Math.cos(pebbleAng) * pebbleDist, 0.02, Math.sin(pebbleAng) * pebbleDist);
        pebble.scale.y = 0.5 + Math.random() * 0.3;
        boulderGroup.add(pebble);
      }
      const bx2 = (Math.random() - 0.5) * w;
      const bz2 = (Math.random() - 0.5) * d;
      boulderGroup.position.set(bx2, getTerrainHeight(bx2, bz2), bz2);
      mctx.envGroup.add(boulderGroup);
    }

    // Animal bones (5)
    for (let i = 0; i < 5; i++) {
      const bonesGroup = new THREE.Group();
      for (let b = 0; b < 4; b++) {
        const abGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.3 + Math.random() * 0.2, 20);
        const abMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.9 });
        const ab = new THREE.Mesh(abGeo, abMat);
        ab.position.set((Math.random() - 0.5) * 0.5, 0.04, (Math.random() - 0.5) * 0.5);
        ab.rotation.z = Math.random() * Math.PI;
        ab.rotation.y = Math.random() * Math.PI;
        bonesGroup.add(ab);
      }
      const boneX = (Math.random() - 0.5) * w;
      const boneZ = (Math.random() - 0.5) * d;
      bonesGroup.position.set(boneX, getTerrainHeight(boneX, boneZ), boneZ);
      mctx.envGroup.add(bonesGroup);
    }

    // Wooden bridge over stream
    const wBridgeGeo = new THREE.BoxGeometry(3, 0.15, 1.5);
    const wBridgeMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const wBridge = new THREE.Mesh(wBridgeGeo, wBridgeMat);
    wBridge.position.set(hw * 0.4, getTerrainHeight(hw * 0.4, 0) + 0.1, 0);
    wBridge.castShadow = true;
    mctx.envGroup.add(wBridge);
    for (let side = -1; side <= 1; side += 2) {
      for (let pi = 0; pi < 2; pi++) {
        const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 20);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(hw * 0.4 + (pi === 0 ? -1.2 : 1.2), 0.4, side * 0.65);
        mctx.envGroup.add(rail);
      }
    }

    // Campfire remains (3) with charcoal, embers, soot, and cooking tripod
    for (let i = 0; i < 3; i++) {
      const campfire = new THREE.Group();
      // Stone ring with increased segments and soot variation
      for (let s = 0; s < 7; s++) {
        const cfStoneGeo = new THREE.SphereGeometry(0.1, 24, 20);
        const cfSootDarken = Math.random() > 0.5 ? 0x111111 : 0x000000;
        const cfStoneMat = new THREE.MeshStandardMaterial({ color: 0x444444 - cfSootDarken, roughness: 0.95 });
        const cfStone = new THREE.Mesh(cfStoneGeo, cfStoneMat);
        const cfStoneAng = (s / 7) * Math.PI * 2;
        cfStone.position.set(Math.cos(cfStoneAng) * 0.4, 0.08, Math.sin(cfStoneAng) * 0.4);
        cfStone.scale.set(0.9 + Math.random() * 0.3, 0.7 + Math.random() * 0.3, 0.9 + Math.random() * 0.3);
        campfire.add(cfStone);
        // Ash/soot marks on some stones
        if (Math.random() > 0.4) {
          const sootMark = new THREE.Mesh(
            new THREE.CircleGeometry(0.04, 8),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0, side: THREE.DoubleSide }));
          sootMark.rotation.x = -Math.PI / 2;
          sootMark.position.set(Math.cos(cfStoneAng) * 0.4, 0.14, Math.sin(cfStoneAng) * 0.4);
          campfire.add(sootMark);
        }
      }
      // Charred ground
      const charGeo = new THREE.PlaneGeometry(0.6, 0.6);
      const charMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
      const charred = new THREE.Mesh(charGeo, charMat);
      charred.rotation.x = -Math.PI / 2;
      charred.position.y = 0.01;
      campfire.add(charred);
      // Half-burned log
      const hLogGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.5, 23);
      const hLogMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.95 });
      const hLog = new THREE.Mesh(hLogGeo, hLogMat);
      hLog.rotation.z = Math.PI / 2;
      hLog.position.y = 0.08;
      campfire.add(hLog);
      // Charcoal pieces inside the ring
      for (let ch = 0; ch < 4; ch++) {
        const charcoalPiece = new THREE.Mesh(
          new THREE.BoxGeometry(0.04 + Math.random() * 0.04, 0.03, 0.03 + Math.random() * 0.03),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 }));
        const chAng = Math.random() * Math.PI * 2;
        const chDist = Math.random() * 0.25;
        charcoalPiece.position.set(Math.cos(chAng) * chDist, 0.03, Math.sin(chAng) * chDist);
        charcoalPiece.rotation.y = Math.random() * Math.PI;
        campfire.add(charcoalPiece);
      }
      // Ember glow particles (small emissive spheres)
      for (let em = 0; em < 5; em++) {
        const emberGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.012 + Math.random() * 0.01, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5, roughness: 0.5 }));
        const emAng = Math.random() * Math.PI * 2;
        const emDist = Math.random() * 0.2;
        emberGlow.position.set(Math.cos(emAng) * emDist, 0.02 + Math.random() * 0.04, Math.sin(emAng) * emDist);
        campfire.add(emberGlow);
      }
      // Cooking tripod over fire
      const tripodMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
      for (let tl = 0; tl < 3; tl++) {
        const tripodLegAng = (tl / 3) * Math.PI * 2;
        const tripodLeg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.015, 0.6, 8),
          tripodMat);
        tripodLeg.position.set(Math.cos(tripodLegAng) * 0.18, 0.28, Math.sin(tripodLegAng) * 0.18);
        tripodLeg.rotation.x = Math.sin(tripodLegAng) * 0.25;
        tripodLeg.rotation.z = -Math.cos(tripodLegAng) * 0.25;
        campfire.add(tripodLeg);
      }
      // Cooking pot hanging from tripod
      const cookingPot = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.5 }));
      cookingPot.rotation.x = Math.PI;
      cookingPot.position.y = 0.35;
      campfire.add(cookingPot);
      // Pot handle
      const potHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.006, 6, 12, Math.PI),
        tripodMat);
      potHandle.position.y = 0.38;
      campfire.add(potHandle);
      const cfX = (Math.random() - 0.5) * w * 0.7;
      const cfZ = (Math.random() - 0.5) * d * 0.7;
      campfire.position.set(cfX, getTerrainHeight(cfX, cfZ), cfZ);
      mctx.envGroup.add(campfire);
    }

    // Beehives (2) with layered construction bands, entrance ledge, and bees
    for (let i = 0; i < 2; i++) {
      const hiveGroup = new THREE.Group();
      const hiveGeo = new THREE.SphereGeometry(0.3, 27, 23);
      const hiveMat = new THREE.MeshStandardMaterial({ color: 0xaa8833, roughness: 0.8 });
      const hive = new THREE.Mesh(hiveGeo, hiveMat);
      hiveGroup.add(hive);
      // Horizontal ring bands for layered construction look
      for (let hb = 0; hb < 5; hb++) {
        const hiveBandY = -0.18 + hb * 0.09;
        const hiveBandR = Math.sqrt(Math.max(0, 0.3 * 0.3 - hiveBandY * hiveBandY));
        const hiveBand = new THREE.Mesh(
          new THREE.TorusGeometry(hiveBandR, 0.012, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0x997722, roughness: 0.85 }));
        hiveBand.rotation.x = Math.PI / 2;
        hiveBand.position.y = hiveBandY;
        hiveGroup.add(hiveBand);
      }
      // Entrance hole
      const holeGeo = new THREE.CircleGeometry(0.06, 23);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x111100, side: THREE.DoubleSide });
      const hiveHole = new THREE.Mesh(holeGeo, holeMat);
      hiveHole.position.set(0, -0.1, 0.29);
      hiveGroup.add(hiveHole);
      // Small entrance ledge beneath hole
      const hiveLedge = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.015, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x997722, roughness: 0.85 }));
      hiveLedge.position.set(0, -0.16, 0.3);
      hiveGroup.add(hiveLedge);
      // Tiny bee-like dots near entrance
      for (let bee = 0; bee < 4; bee++) {
        const beeDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.008, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xddaa00, roughness: 0.6, emissive: 0x443300, emissiveIntensity: 0.2 }));
        beeDot.position.set(
          (Math.random() - 0.5) * 0.15,
          -0.1 + (Math.random() - 0.5) * 0.12,
          0.32 + Math.random() * 0.1);
        hiveGroup.add(beeDot);
      }
      const hiveX = (Math.random() - 0.5) * w * 0.6;
      const hiveY = 3.0 + Math.random();
      const hiveZ = (Math.random() - 0.5) * d * 0.6;
      hiveGroup.position.set(hiveX, hiveY, hiveZ);
      mctx.envGroup.add(hiveGroup);
    }

    // Spider webs between trees (4)
    for (let i = 0; i < 4; i++) {
      const webGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const webMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      const web = new THREE.Mesh(webGeo, webMat);
      web.position.set((Math.random() - 0.5) * w * 0.5, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * d * 0.5);
      web.rotation.y = Math.random() * Math.PI;
      web.rotation.x = (Math.random() - 0.5) * 0.4;
      mctx.envGroup.add(web);
    }

    // Fog ground layer
    const fogGeo = new THREE.PlaneGeometry(w, d);
    const fogMat = new THREE.MeshStandardMaterial({
      color: 0xccddcc,
      transparent: true,
      opacity: 0.08,
      roughness: 1.0,
      side: THREE.DoubleSide,
    });
    const fogPlane = new THREE.Mesh(fogGeo, fogMat);
    fogPlane.rotation.x = -Math.PI / 2;
    fogPlane.position.y = 0.3;
    mctx.envGroup.add(fogPlane);

    // Puddles on the ground (12) - flat reflective circles
    for (let i = 0; i < 12; i++) {
      const puddleR = 0.3 + Math.random() * 0.5;
      const puddleGeo = new THREE.CircleGeometry(puddleR, 24);
      const puddleMat = new THREE.MeshStandardMaterial({
        color: 0x334455, transparent: true, opacity: 0.35,
        roughness: 0.05, metalness: 0.4, side: THREE.DoubleSide,
      });
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      const pdX = (Math.random() - 0.5) * w * 0.85;
      const pdZ = (Math.random() - 0.5) * d * 0.85;
      puddle.position.set(pdX, getTerrainHeight(pdX, pdZ) + 0.012, pdZ);
      mctx.envGroup.add(puddle);
      // Slight rim of mud around puddle
      const rimGeo = new THREE.RingGeometry(puddleR - 0.02, puddleR + 0.04, 24);
      const rim = new THREE.Mesh(rimGeo,
        new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0, side: THREE.DoubleSide }));
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(pdX, getTerrainHeight(pdX, pdZ) + 0.011, pdZ);
      mctx.envGroup.add(rim);
    }

    // Small ground-level vegetation patches (20) - ferns, small plants using cone/sphere combos
    for (let i = 0; i < 20; i++) {
      const vegGrp = new THREE.Group();
      const vegType = Math.random();
      if (vegType < 0.5) {
        // Small fern: multiple cone leaves
        const fLeafCount = 3 + Math.floor(Math.random() * 3);
        const fColor = [0x3a8a3a, 0x2a7a2a, 0x4a9a4a][i % 3];
        for (let fl = 0; fl < fLeafCount; fl++) {
          const fLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15 + Math.random() * 0.1, 6),
            new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.85 }));
          fLeaf.position.y = 0.08;
          fLeaf.rotation.y = (fl / fLeafCount) * Math.PI * 2;
          fLeaf.rotation.x = -0.4 - Math.random() * 0.3;
          vegGrp.add(fLeaf);
        }
      } else {
        // Small plant: sphere top + cone stem
        const pStem = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 6),
          new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.9 }));
        pStem.position.y = 0.05;
        vegGrp.add(pStem);
        const pTop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x55aa44, roughness: 0.8 }));
        pTop.scale.y = 0.6;
        pTop.position.y = 0.11;
        vegGrp.add(pTop);
      }
      const vX = (Math.random() - 0.5) * w * 0.9;
      const vZ = (Math.random() - 0.5) * d * 0.9;
      vegGrp.position.set(vX, getTerrainHeight(vX, vZ), vZ);
      mctx.envGroup.add(vegGrp);
    }

    // Light shafts (12) - volumetric god rays with dust motes
    for (let i = 0; i < 12; i++) {
      const shaftR = 0.15 + Math.random() * 0.35;
      const shaftH = 12 + Math.random() * 6;
      const shaftGeo = new THREE.CylinderGeometry(shaftR * 0.6, shaftR, shaftH, 27);
      const shaftMat = new THREE.MeshStandardMaterial({
        color: 0xffffdd, transparent: true,
        opacity: 0.02 + Math.random() * 0.02,
        roughness: 0.5, side: THREE.DoubleSide,
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set((Math.random() - 0.5) * w * 0.65, shaftH * 0.4, (Math.random() - 0.5) * d * 0.65);
      mctx.envGroup.add(shaft);
      // Dust motes in shaft
      for (let dm = 0; dm < 4; dm++) {
        const mote = new THREE.Mesh(new THREE.SphereGeometry(0.01, 16, 8),
          new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.8, transparent: true, opacity: 0.3 }));
        mote.position.set(shaft.position.x + (Math.random() - 0.5) * shaftR, Math.random() * shaftH * 0.6 + 1, shaft.position.z + (Math.random() - 0.5) * shaftR);
        mctx.envGroup.add(mote);
      }
    }

    // Forest ambient point lights (8) - warm dappled lighting
    for (let i = 0; i < 8; i++) {
      const dappleLight = new THREE.PointLight(0xffeeaa, 0.3 + Math.random() * 0.2, 8);
      dappleLight.position.set((Math.random() - 0.5) * w * 0.7, 3 + Math.random() * 2, (Math.random() - 0.5) * d * 0.7);
      mctx.scene.add(dappleLight);
    }

    // Deer / animal silhouettes (4)
    for (let i = 0; i < 4; i++) {
      const deerGrp = new THREE.Group();
      const deerMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.2), deerMat);
      body.position.y = 0.5;
      deerGrp.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 23, 20), deerMat);
      head.position.set(0.35, 0.7, 0);
      deerGrp.add(head);
      for (const lz of [-0.07, 0.07]) {
        for (const lx of [-0.15, 0.15]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 17), deerMat);
          leg.position.set(lx, 0.2, lz);
          deerGrp.add(leg);
        }
      }
      // Antlers
      for (const ax of [-0.04, 0.04]) {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.25, 17), deerMat);
        antler.position.set(0.35 + ax, 0.85, 0);
        antler.rotation.z = ax < 0 ? 0.4 : -0.4;
        deerGrp.add(antler);
      }
      const deerX = (Math.random() - 0.5) * w * 0.8;
      const deerZ = (Math.random() - 0.5) * d * 0.8;
      deerGrp.position.set(deerX, getTerrainHeight(deerX, deerZ), deerZ);
      deerGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(deerGrp);
    }

    // Berry bushes (12)
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.9 });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xcc2244, roughness: 0.5, emissive: 0x440011, emissiveIntensity: 0.1 });
    for (let i = 0; i < 12; i++) {
      const bushGrp = new THREE.Group();
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 23, 20), bushMat);
      bush.scale.y = 0.6;
      bush.position.y = 0.2;
      bushGrp.add(bush);
      for (let b = 0; b < 5; b++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16), berryMat);
        const bAngle = Math.random() * Math.PI * 2;
        berry.position.set(Math.cos(bAngle) * 0.3, 0.25 + Math.random() * 0.15, Math.sin(bAngle) * 0.3);
        bushGrp.add(berry);
      }
      // Extra leaf detail clusters on bush surface
      for (let lc = 0; lc < 3; lc++) {
        const lcAng = Math.random() * Math.PI * 2;
        const lcR = 0.25 + Math.random() * 0.15;
        const leafCluster = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 36, 27),
          new THREE.MeshStandardMaterial({ color: 0x2a6a2a + Math.floor(Math.random() * 0x112200), roughness: 0.85 })
        );
        leafCluster.position.set(Math.cos(lcAng) * lcR, 0.22 + Math.random() * 0.12, Math.sin(lcAng) * lcR);
        leafCluster.scale.y = 0.6;
        bushGrp.add(leafCluster);
      }
      const bushX = (Math.random() - 0.5) * w * 0.85;
      const bushZ = (Math.random() - 0.5) * d * 0.85;
      bushGrp.position.set(bushX, getTerrainHeight(bushX, bushZ), bushZ);
      mctx.envGroup.add(bushGrp);
    }

    // Toadstools / colorful mushroom clusters (8)
    const toadColors = [0xff3322, 0xffaa22, 0x8833aa, 0x22aaff];
    for (let i = 0; i < 8; i++) {
      const toadGrp = new THREE.Group();
      const numShrooms = 3 + Math.floor(Math.random() * 3);
      for (let m = 0; m < numShrooms; m++) {
        const stemH = 0.1 + Math.random() * 0.15;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, stemH, 20),
          new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
        const mx = (Math.random() - 0.5) * 0.3;
        const mz = (Math.random() - 0.5) * 0.3;
        stem.position.set(mx, stemH / 2, mz);
        toadGrp.add(stem);
        const capColor = toadColors[Math.floor(Math.random() * toadColors.length)];
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.6 }));
        cap.position.set(mx, stemH, mz);
        toadGrp.add(cap);
      }
      const toadX = (Math.random() - 0.5) * w * 0.8;
      const toadZ = (Math.random() - 0.5) * d * 0.8;
      toadGrp.position.set(toadX, getTerrainHeight(toadX, toadZ), toadZ);
      mctx.envGroup.add(toadGrp);
    }

    // Old wooden signpost (2)
    for (let i = 0; i < 2; i++) {
      const signGrp = new THREE.Group();
      const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.0, 20);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.0;
      signGrp.add(post);
      for (let s = 0; s < 2; s++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
        board.position.set(0.25, 1.6 - s * 0.25, 0);
        board.rotation.z = (Math.random() - 0.5) * 0.15;
        signGrp.add(board);
      }
      const signX = (Math.random() - 0.5) * w * 0.5;
      const signZ = (Math.random() - 0.5) * d * 0.5;
      signGrp.position.set(signX, getTerrainHeight(signX, signZ), signZ);
      signGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(signGrp);
    }

    // Fern patches (40) - denser, varied
    const fernColors = [0x3a8a3a, 0x2a7a2a, 0x4a9a4a, 0x358535];
    for (let i = 0; i < 40; i++) {
      const fernGrp = new THREE.Group();
      const numFronds = 5 + Math.floor(Math.random() * 4);
      const fernMat = new THREE.MeshStandardMaterial({ color: fernColors[i % fernColors.length], roughness: 0.85, side: THREE.DoubleSide });
      for (let f = 0; f < numFronds; f++) {
        const frondH = 0.35 + Math.random() * 0.25;
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + Math.random() * 0.08, frondH), fernMat);
        frond.position.y = frondH * 0.4;
        frond.rotation.y = (f / numFronds) * Math.PI * 2;
        frond.rotation.x = -0.5 - Math.random() * 0.3;
        fernGrp.add(frond);
      }
      const fernX = (Math.random() - 0.5) * w * 0.9;
      const fernZ = (Math.random() - 0.5) * d * 0.9;
      fernGrp.position.set(fernX, getTerrainHeight(fernX, fernZ), fernZ);
      mctx.envGroup.add(fernGrp);
    }

    // Hollow tree stump (3)
    for (let i = 0; i < 3; i++) {
      const stumpGrp = new THREE.Group();
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.5, 27),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 }));
      stump.position.y = 0.25;
      stumpGrp.add(stump);
      const hollow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 27),
        new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0 }));
      hollow.position.y = 0.5;
      stumpGrp.add(hollow);
      // Growth rings on stump top
      for (let sgr = 1; sgr <= 3; sgr++) {
        const stRingR = 0.3 * (sgr / 4);
        const stGrowthRing = new THREE.Mesh(new THREE.RingGeometry(stRingR - 0.008, stRingR, 20),
          new THREE.MeshStandardMaterial({ color: 0x7a6550, roughness: 0.85, side: THREE.DoubleSide }));
        stGrowthRing.rotation.x = -Math.PI / 2;
        stGrowthRing.position.y = 0.501;
        stumpGrp.add(stGrowthRing);
      }
      // Bark texture on stump sides
      for (let sb = 0; sb < 4; sb++) {
        const sbAng = (sb / 4) * Math.PI * 2;
        const barkStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.98 }));
        barkStrip.position.set(Math.cos(sbAng) * 0.33, 0.25, Math.sin(sbAng) * 0.33);
        barkStrip.lookAt(new THREE.Vector3(0, 0.25, 0));
        stumpGrp.add(barkStrip);
      }
      // Small roots at base
      for (let sr = 0; sr < 3; sr++) {
        const srAng = (sr / 3) * Math.PI * 2 + Math.random() * 0.5;
        const stRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.3, 8),
          new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 }));
        stRoot.position.set(Math.cos(srAng) * 0.3, 0.08, Math.sin(srAng) * 0.3);
        stRoot.rotation.z = Math.cos(srAng) * 0.7;
        stRoot.rotation.x = Math.sin(srAng) * 0.7;
        stumpGrp.add(stRoot);
      }
      // Moss on stump
      if (Math.random() > 0.4) {
        const stMoss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 1.0 }));
        stMoss.scale.y = 0.25;
        stMoss.position.set(0.1, 0.48, 0.05);
        stumpGrp.add(stMoss);
      }
      const stumpX = (Math.random() - 0.5) * w * 0.7;
      const stumpZ = (Math.random() - 0.5) * d * 0.7;
      stumpGrp.position.set(stumpX, getTerrainHeight(stumpX, stumpZ), stumpZ);
      mctx.envGroup.add(stumpGrp);
    }

    // Fireflies / glowing particles (35) - varied glow
    const fireflyColors = [0xddff44, 0xccee33, 0xeeff66, 0xbbdd22];
    for (let i = 0; i < 35; i++) {
      const ffColor = fireflyColors[Math.floor(Math.random() * fireflyColors.length)];
      const fly = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 17, 16),
        new THREE.MeshStandardMaterial({ color: ffColor, emissive: ffColor, emissiveIntensity: 1.0 + Math.random() * 0.8 }));
      fly.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.3 + Math.random() * 3.0,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(fly);
    }

    // Fallen logs (5)
    for (let i = 0; i < 5; i++) {
      const logGrp = new THREE.Group();
      const logLen = 1.5 + Math.random() * 2.0;
      const logR = 0.08 + Math.random() * 0.06;
      const logMesh = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR * 1.1, logLen, 23),
        new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.95 }));
      logMesh.rotation.z = Math.PI / 2;
      logMesh.position.y = logR;
      logGrp.add(logMesh);
      // Moss patches on log
      for (let m = 0; m < 3; m++) {
        const mossPatch = new THREE.Mesh(new THREE.SphereGeometry(0.06, 30, 16),
          new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 1.0 }));
        mossPatch.scale.y = 0.4;
        mossPatch.position.set((Math.random() - 0.5) * logLen * 0.6, logR * 1.5, (Math.random() - 0.5) * 0.1);
        logGrp.add(mossPatch);
      }
      const logGX = (Math.random() - 0.5) * w * 0.7;
      const logGZ = (Math.random() - 0.5) * d * 0.7;
      logGrp.position.set(logGX, getTerrainHeight(logGX, logGZ), logGZ);
      logGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(logGrp);
    }

    // Woodland flowers (25) - small ground-level color spots
    const woodFlowerColors = [0xffee55, 0xff88cc, 0xaa66ff, 0x66ccff, 0xff6644];
    for (let i = 0; i < 25; i++) {
      const flGrp = new THREE.Group();
      const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.15, 17),
        new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.9 }));
      stemMesh.position.y = 0.075;
      flGrp.add(stemMesh);
      const petalColor = woodFlowerColors[Math.floor(Math.random() * woodFlowerColors.length)];
      const petalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 36, 17),
        new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.5, emissive: petalColor, emissiveIntensity: 0.1 }));
      petalMesh.scale.y = 0.5;
      petalMesh.position.y = 0.16;
      flGrp.add(petalMesh);
      const flGX = (Math.random() - 0.5) * w * 0.9;
      const flGZ = (Math.random() - 0.5) * d * 0.9;
      flGrp.position.set(flGX, getTerrainHeight(flGX, flGZ), flGZ);
      mctx.envGroup.add(flGrp);
    }

    // Hanging vines from trees (10) - thin green strands
    for (let i = 0; i < 10; i++) {
      const vineLen = 1.0 + Math.random() * 1.5;
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, vineLen, 17),
        new THREE.MeshStandardMaterial({ color: 0x338833, roughness: 0.9 }));
      vine.position.set(
        (Math.random() - 0.5) * w * 0.7,
        2.5 + Math.random() * 1.5,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(vine);
    }

    // Owl nests in trees (3)
    for (let i = 0; i < 3; i++) {
      const nestGrp = new THREE.Group();
      const nestBase = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 20, 27),
        new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.95 }));
      nestBase.rotation.x = Math.PI / 2;
      nestGrp.add(nestBase);
      // Tiny eggs
      for (let e = 0; e < 2; e++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.025, 20, 17),
          new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.7 }));
        egg.scale.y = 1.3;
        egg.position.set((e - 0.5) * 0.05, 0.02, 0);
        nestGrp.add(egg);
      }
      nestGrp.position.set((Math.random() - 0.5) * w * 0.5, 2.5 + Math.random(), (Math.random() - 0.5) * d * 0.5);
      mctx.envGroup.add(nestGrp);
    }

    // Leaf litter on ground (30) - varied leaf shapes and colors
    const leafColors = [0x886622, 0x995533, 0xaa7744, 0x664411, 0x553300, 0xbb8844, 0x775522];
    for (let i = 0; i < 30; i++) {
      const leafR = 0.15 + Math.random() * 0.3;
      const leafGeo = Math.random() > 0.5 ? new THREE.CircleGeometry(leafR, 20) : new THREE.PlaneGeometry(leafR * 1.5, leafR);
      const leafPile = new THREE.Mesh(leafGeo,
        new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)], roughness: 1.0, side: THREE.DoubleSide }));
      leafPile.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.1;
      leafPile.rotation.z = Math.random() * Math.PI * 2;
      const lpX = (Math.random() - 0.5) * w * 0.9;
      const lpZ = (Math.random() - 0.5) * d * 0.9;
      leafPile.position.set(lpX, getTerrainHeight(lpX, lpZ) + 0.015, lpZ);
      mctx.envGroup.add(leafPile);
    }

    // Moss patches on ground (25) - varied green tones
    const mossPatchColors = [0x3a6a2a, 0x2a5a1a, 0x4a7a3a, 0x336633];
    for (let i = 0; i < 25; i++) {
      const mossR = 0.3 + Math.random() * 0.6;
      const mossPatch = new THREE.Mesh(new THREE.CircleGeometry(mossR, 23),
        new THREE.MeshStandardMaterial({ color: mossPatchColors[i % mossPatchColors.length], roughness: 1.0, side: THREE.DoubleSide }));
      mossPatch.rotation.x = -Math.PI / 2;
      const mpX = (Math.random() - 0.5) * w * 0.9;
      const mpZ = (Math.random() - 0.5) * d * 0.9;
      mossPatch.position.set(mpX, getTerrainHeight(mpX, mpZ) + 0.015, mpZ);
      mctx.envGroup.add(mossPatch);
    }

    // Wildflower meadow spots (15)
    const meadowColors = [0xffee55, 0xff88cc, 0xaa66ff, 0x66ccff, 0xff6644, 0xffffff];
    for (let i = 0; i < 15; i++) {
      const meadowGrp = new THREE.Group();
      const numFlowers = 8 + Math.floor(Math.random() * 8);
      for (let f = 0; f < numFlowers; f++) {
        const fColor = meadowColors[Math.floor(Math.random() * meadowColors.length)];
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 17, 16),
          new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.5, emissive: fColor, emissiveIntensity: 0.05 }));
        flower.scale.y = 0.5;
        flower.position.set((Math.random() - 0.5) * 0.8, 0.15 + Math.random() * 0.08, (Math.random() - 0.5) * 0.8);
        meadowGrp.add(flower);
        const fStem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.12, 16),
          new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.9 }));
        fStem.position.set(flower.position.x, 0.06, flower.position.z);
        meadowGrp.add(fStem);
      }
      const mX = (Math.random() - 0.5) * w * 0.85;
      const mZ = (Math.random() - 0.5) * d * 0.85;
      meadowGrp.position.set(mX, getTerrainHeight(mX, mZ), mZ);
      mctx.envGroup.add(meadowGrp);
    }

    // Butterflies (10)
    const butterflyColors = [0xff8844, 0x4488ff, 0xffdd44, 0xff44aa, 0x44ddff];
    for (let i = 0; i < 10; i++) {
      const bfGrp = new THREE.Group();
      const bfColor = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
      const bfMat = new THREE.MeshStandardMaterial({ color: bfColor, emissive: bfColor, emissiveIntensity: 0.1, roughness: 0.4, side: THREE.DoubleSide });
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.03), bfMat);
        wing.position.set(side * 0.02, 0, 0);
        wing.rotation.z = side * 0.4;
        bfGrp.add(wing);
      }
      bfGrp.position.set((Math.random() - 0.5) * w * 0.7, 0.5 + Math.random() * 2.5, (Math.random() - 0.5) * d * 0.7);
      bfGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(bfGrp);
    }

    // Rabbits (4)
    for (let i = 0; i < 4; i++) {
      const rabbitGrp = new THREE.Group();
      const rabbitMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8 });
      const rbBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 17), rabbitMat);
      rbBody.scale.set(1.3, 0.9, 1);
      rbBody.position.y = 0.1;
      rabbitGrp.add(rbBody);
      const rbHead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 17), rabbitMat);
      rbHead.position.set(0.1, 0.15, 0);
      rabbitGrp.add(rbHead);
      for (const ez of [-0.02, 0.02]) {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.08, 17), rabbitMat);
        ear.position.set(0.08, 0.22, ez);
        ear.rotation.z = 0.2;
        rabbitGrp.add(ear);
      }
      const rbTail = new THREE.Mesh(new THREE.SphereGeometry(0.025, 17, 16),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
      rbTail.position.set(-0.1, 0.1, 0);
      rabbitGrp.add(rbTail);
      const rbX = (Math.random() - 0.5) * w * 0.7;
      const rbZ = (Math.random() - 0.5) * d * 0.7;
      rabbitGrp.position.set(rbX, getTerrainHeight(rbX, rbZ), rbZ);
      rabbitGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(rabbitGrp);
    }

    // ── Dense ground grass ──
    const grassShades = [
      new THREE.MeshStandardMaterial({ color: 0x2a5518, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x3a6628, roughness: 0.6, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x446622, roughness: 0.65, side: THREE.DoubleSide }),
    ];
    for (let gi = 0; gi < 200; gi++) {
      const grassClump = new THREE.Group();
      const bladeCount = 5 + Math.floor(Math.random() * 6);
      for (let bl = 0; bl < bladeCount; bl++) {
        const bladeH = 0.3 + Math.random() * 0.3;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05 + Math.random() * 0.03, bladeH),
          grassShades[Math.floor(Math.random() * 3)],
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
}

export function buildElvenVillage(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x334466, 0.01);
    mctx.applyTerrainColors(0x3a5a3a, 0x5a7a5a);
    mctx.dirLight.color.setHex(0xaabbdd);
    mctx.dirLight.intensity = 0.9;
    mctx.ambientLight.color.setHex(0x3a4a6a);
    mctx.hemiLight.color.setHex(0x6688bb);
    mctx.hemiLight.groundColor.setHex(0x223322);

    // 18 elven buildings with ornate details
    for (let i = 0; i < 18; i++) {
      const building = new THREE.Group();
      const bh = 3 + Math.random() * 3;
      const br = 1.2 + Math.random() * 0.8;
      const baseGeo = new THREE.CylinderGeometry(br, br * 1.1, bh, 27);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.6, metalness: 0.1 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = bh / 2;
      base.castShadow = true;
      building.add(base);

      // Decorative trim bands around building
      for (let tb = 0; tb < 2; tb++) {
        const trimBand = new THREE.Mesh(new THREE.TorusGeometry(br * 1.02, 0.04, 17, 36),
          new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.4, roughness: 0.3 }));
        trimBand.rotation.x = Math.PI / 2;
        trimBand.position.y = bh * 0.3 + tb * bh * 0.4;
        building.add(trimBand);
      }

      const roofH = 2.0 + Math.random();
      const roofGeo = new THREE.ConeGeometry(br * 1.3, roofH, 27);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x336699, roughness: 0.4, metalness: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = bh + roofH / 2;
      roof.castShadow = true;
      building.add(roof);

      // Roof spire finial
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 17),
        new THREE.MeshStandardMaterial({ color: 0xddddee, metalness: 0.6, roughness: 0.2, emissive: 0x4488ff, emissiveIntensity: 0.3 }));
      spire.position.y = bh + roofH + 0.2;
      building.add(spire);

      // Roof eaves/trim ring along the base of the roof
      const eavesTrim = new THREE.Mesh(
        new THREE.TorusGeometry(br * 1.32, 0.05, 12, 36),
        new THREE.MeshStandardMaterial({ color: 0x2a5588, metalness: 0.4, roughness: 0.3 }),
      );
      eavesTrim.rotation.x = Math.PI / 2;
      eavesTrim.position.y = bh;
      building.add(eavesTrim);

      // Glowing blue windows with frames, sills, shutters, and flower boxes
      const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4 });
      for (let wi = 0; wi < 4; wi++) {
        const winGeo = new THREE.BoxGeometry(0.3, 0.5, 0.1);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0x44aaff, emissive: 0x44aaff, emissiveIntensity: 0.8,
        });
        const win = new THREE.Mesh(winGeo, winMat);
        const angle = (wi / 4) * Math.PI * 2;
        win.position.set(
          Math.cos(angle) * (br + 0.05),
          bh * 0.4 + wi * 0.4,
          Math.sin(angle) * (br + 0.05),
        );
        win.lookAt(building.position.x, win.position.y, building.position.z);
        building.add(win);
        // Window arch top (increased polygon count)
        const winArch = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 24, 0, Math.PI * 2, 0, Math.PI / 2), winMat);
        winArch.position.copy(win.position);
        winArch.position.y += 0.25;
        winArch.scale.y = 0.5;
        building.add(winArch);
        // Window frame pieces (top, bottom, left, right)
        const winOutR = br + 0.07;
        const frameThick = 0.03;
        const wfTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, frameThick, 0.04), winFrameMat);
        wfTop.position.set(Math.cos(angle) * winOutR, bh * 0.4 + wi * 0.4 + 0.26, Math.sin(angle) * winOutR);
        wfTop.lookAt(building.position.x, wfTop.position.y, building.position.z);
        building.add(wfTop);
        const wfBot = new THREE.Mesh(new THREE.BoxGeometry(0.36, frameThick, 0.04), winFrameMat);
        wfBot.position.set(Math.cos(angle) * winOutR, bh * 0.4 + wi * 0.4 - 0.26, Math.sin(angle) * winOutR);
        wfBot.lookAt(building.position.x, wfBot.position.y, building.position.z);
        building.add(wfBot);
        const wfLeft = new THREE.Mesh(new THREE.BoxGeometry(frameThick, 0.56, 0.04), winFrameMat);
        wfLeft.position.set(Math.cos(angle + 0.08) * winOutR, bh * 0.4 + wi * 0.4, Math.sin(angle + 0.08) * winOutR);
        wfLeft.lookAt(building.position.x, wfLeft.position.y, building.position.z);
        building.add(wfLeft);
        const wfRight = new THREE.Mesh(new THREE.BoxGeometry(frameThick, 0.56, 0.04), winFrameMat);
        wfRight.position.set(Math.cos(angle - 0.08) * winOutR, bh * 0.4 + wi * 0.4, Math.sin(angle - 0.08) * winOutR);
        wfRight.lookAt(building.position.x, wfRight.position.y, building.position.z);
        building.add(wfRight);
        // Window sill
        const winSill = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.08), winFrameMat);
        winSill.position.set(Math.cos(angle) * (br + 0.09), bh * 0.4 + wi * 0.4 - 0.28, Math.sin(angle) * (br + 0.09));
        winSill.lookAt(building.position.x, winSill.position.y, building.position.z);
        building.add(winSill);
        // Shutters on alternating windows
        if (wi % 2 === 0) {
          const shutterMat = new THREE.MeshStandardMaterial({ color: 0x3a5577, roughness: 0.7 });
          for (const shutSide of [-1, 1]) {
            const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.02), shutterMat);
            shutter.position.set(
              Math.cos(angle + shutSide * 0.12) * (br + 0.1),
              bh * 0.4 + wi * 0.4,
              Math.sin(angle + shutSide * 0.12) * (br + 0.1),
            );
            shutter.lookAt(building.position.x, shutter.position.y, building.position.z);
            building.add(shutter);
          }
        }
        // Flower box under some windows
        if (Math.random() > 0.5) {
          const fboxMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
          const fbox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), fboxMat);
          fbox.position.set(Math.cos(angle) * (br + 0.1), bh * 0.4 + wi * 0.4 - 0.32, Math.sin(angle) * (br + 0.1));
          fbox.lookAt(building.position.x, fbox.position.y, building.position.z);
          building.add(fbox);
          const fbColors = [0xff6688, 0xffaa33, 0xddaaff, 0x88ffbb];
          for (let fb = 0; fb < 2 + Math.floor(Math.random() * 3); fb++) {
            const flowerCenterX = Math.cos(angle) * (br + 0.12) + (fb - 1) * 0.06 * Math.cos(angle + Math.PI / 2);
            const flowerCenterY = bh * 0.4 + wi * 0.4 - 0.28;
            const flowerCenterZ = Math.sin(angle) * (br + 0.12) + (fb - 1) * 0.06 * Math.sin(angle + Math.PI / 2);
            const fbColor = fbColors[fb % fbColors.length];
            // Flower stem
            const flowerStem = new THREE.Mesh(
              new THREE.CylinderGeometry(0.003, 0.004, 0.06, 6),
              new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.8 }));
            flowerStem.position.set(flowerCenterX, flowerCenterY - 0.02, flowerCenterZ);
            building.add(flowerStem);
            // Flower center pistil
            const flowerPistil = new THREE.Mesh(
              new THREE.SphereGeometry(0.006, 8, 8),
              new THREE.MeshStandardMaterial({ color: 0xffdd44, roughness: 0.5 }));
            flowerPistil.position.set(flowerCenterX, flowerCenterY + 0.01, flowerCenterZ);
            building.add(flowerPistil);
            // 4-5 petals arranged around center
            const fbPetalCount = 4 + Math.floor(Math.random() * 2);
            for (let fp = 0; fp < fbPetalCount; fp++) {
              const petalAng = (fp / fbPetalCount) * Math.PI * 2;
              const fbPetal = new THREE.Mesh(
                new THREE.SphereGeometry(0.008, 10, 8),
                new THREE.MeshStandardMaterial({ color: fbColor, roughness: 0.5, emissive: fbColor, emissiveIntensity: 0.15 }));
              fbPetal.scale.set(1.4, 0.5, 1.0);
              fbPetal.position.set(
                flowerCenterX + Math.cos(petalAng) * 0.012,
                flowerCenterY + 0.01,
                flowerCenterZ + Math.sin(petalAng) * 0.012);
              building.add(fbPetal);
            }
          }
        }
      }

      // Door with elvish arch, frame, doorstep, and handle
      const doorAngle = Math.random() * Math.PI * 2;
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 }));
      door.position.set(Math.cos(doorAngle) * (br + 0.05), 0.4, Math.sin(doorAngle) * (br + 0.05));
      door.lookAt(building.position.x, 0.4, building.position.z);
      building.add(door);
      // Door frame (U-shape)
      const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.7, metalness: 0.15 });
      const dfOutR = br + 0.08;
      const dfTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.05), doorFrameMat);
      dfTop.position.set(Math.cos(doorAngle) * dfOutR, 0.82, Math.sin(doorAngle) * dfOutR);
      dfTop.lookAt(building.position.x, dfTop.position.y, building.position.z);
      building.add(dfTop);
      for (const dfSide of [-1, 1]) {
        const dfBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.84, 0.05), doorFrameMat);
        dfBar.position.set(Math.cos(doorAngle + dfSide * 0.12) * dfOutR, 0.42, Math.sin(doorAngle + dfSide * 0.12) * dfOutR);
        dfBar.lookAt(building.position.x, dfBar.position.y, building.position.z);
        building.add(dfBar);
      }
      // Door arch top
      const doorArch = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        doorFrameMat,
      );
      doorArch.position.set(Math.cos(doorAngle) * (br + 0.06), 0.82, Math.sin(doorAngle) * (br + 0.06));
      doorArch.scale.y = 0.4;
      building.add(doorArch);
      // Doorstep
      const doorstep = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.04, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.7 }),
      );
      doorstep.position.set(Math.cos(doorAngle) * (br + 0.12), 0.02, Math.sin(doorAngle) * (br + 0.12));
      doorstep.lookAt(building.position.x, doorstep.position.y, building.position.z);
      building.add(doorstep);
      // Door handle - ring/lever with plate and keyhole
      const handleOutR = br + 0.11;
      const handlePosX = Math.cos(doorAngle + 0.06) * handleOutR;
      const handlePosZ = Math.sin(doorAngle + 0.06) * handleOutR;
      const handleMetalMat = new THREE.MeshStandardMaterial({ color: 0xddddbb, metalness: 0.6, roughness: 0.2 });
      // Door plate behind handle
      const doorPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, 0.008),
        new THREE.MeshStandardMaterial({ color: 0xccccaa, metalness: 0.5, roughness: 0.3 }));
      doorPlate.position.set(handlePosX, 0.4, handlePosZ);
      doorPlate.lookAt(building.position.x, 0.4, building.position.z);
      building.add(doorPlate);
      // Ring handle (torus)
      const doorHandleRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.02, 0.004, 8, 12),
        handleMetalMat);
      doorHandleRing.position.set(
        Math.cos(doorAngle + 0.06) * (handleOutR + 0.01),
        0.4,
        Math.sin(doorAngle + 0.06) * (handleOutR + 0.01));
      doorHandleRing.lookAt(building.position.x, 0.4, building.position.z);
      building.add(doorHandleRing);
      // Keyhole (tiny dark box below handle)
      const doorKeyhole = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.018, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
      doorKeyhole.position.set(handlePosX, 0.36, handlePosZ);
      doorKeyhole.lookAt(building.position.x, 0.36, building.position.z);
      building.add(doorKeyhole);

      // Chimney on some buildings
      if (Math.random() > 0.4) {
        const chimAngle = doorAngle + Math.PI * (0.3 + Math.random() * 0.4);
        const chimDist = br * 0.6;
        const chimH = 1.2 + Math.random() * 0.6;
        const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.85 });
        const chimBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, chimH, 0.2), chimneyMat);
        chimBody.position.set(Math.cos(chimAngle) * chimDist, bh + roofH * 0.3 + chimH / 2, Math.sin(chimAngle) * chimDist);
        building.add(chimBody);
        const chimCap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.26), chimneyMat);
        chimCap.position.set(Math.cos(chimAngle) * chimDist, bh + roofH * 0.3 + chimH + 0.02, Math.sin(chimAngle) * chimDist);
        building.add(chimCap);
        // Chimney smoke wisps
        for (let cSmoke = 0; cSmoke < 3; cSmoke++) {
          const smokeWisp = new THREE.Mesh(
            new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.15 + Math.random() * 0.1, roughness: 1.0 }));
          smokeWisp.position.set(
            Math.cos(chimAngle) * chimDist + (Math.random() - 0.5) * 0.1,
            bh + roofH * 0.3 + chimH + 0.1 + cSmoke * 0.12,
            Math.sin(chimAngle) * chimDist + (Math.random() - 0.5) * 0.1);
          smokeWisp.scale.set(1 + cSmoke * 0.3, 0.6, 1 + cSmoke * 0.3);
          building.add(smokeWisp);
        }
        // Chimney inner dark opening
        const chimInner = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.02, 0.14),
          new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }));
        chimInner.position.set(Math.cos(chimAngle) * chimDist, bh + roofH * 0.3 + chimH + 0.03, Math.sin(chimAngle) * chimDist);
        building.add(chimInner);
        for (let cb = 0; cb < 3; cb++) {
          const brickLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.01, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9 }),
          );
          brickLine.position.set(Math.cos(chimAngle) * chimDist, bh + roofH * 0.3 + cb * chimH * 0.3 + 0.15, Math.sin(chimAngle) * chimDist);
          building.add(brickLine);
        }
      }

      // Wall texture variation overlays
      const wallOverlayCount = 3 + Math.floor(Math.random() * 3);
      for (let wo = 0; wo < wallOverlayCount; wo++) {
        const woAngle = Math.random() * Math.PI * 2;
        const woH = 0.3 + Math.random() * 0.5;
        const woW = 0.4 + Math.random() * 0.4;
        const overlay = new THREE.Mesh(
          new THREE.BoxGeometry(woW, woH, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xbbbbaa + Math.floor(Math.random() * 0x111100), roughness: 0.65, metalness: 0.05 }),
        );
        overlay.position.set(Math.cos(woAngle) * (br + 0.06), 0.5 + Math.random() * (bh - 1), Math.sin(woAngle) * (br + 0.06));
        overlay.lookAt(building.position.x, overlay.position.y, building.position.z);
        building.add(overlay);
      }

      // Small hanging sign near door (some buildings)
      if (Math.random() > 0.6) {
        const signAngle = doorAngle + 0.2;
        const signPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8),
          new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.3 }),
        );
        signPost.rotation.z = Math.PI / 2;
        signPost.position.set(Math.cos(signAngle) * (br + 0.15), 1.2, Math.sin(signAngle) * (br + 0.15));
        building.add(signPost);
        const signBoard = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.12, 0.015),
          new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 }),
        );
        signBoard.position.set(Math.cos(signAngle) * (br + 0.3), 1.1, Math.sin(signAngle) * (br + 0.3));
        signBoard.lookAt(building.position.x, signBoard.position.y, building.position.z);
        building.add(signBoard);
      }

      // --- Ornate elven window arches with keystone and mullions ---
      const archGoldMat = new THREE.MeshStandardMaterial({ color: 0xddc866, metalness: 0.5, roughness: 0.25, emissive: 0x665522, emissiveIntensity: 0.1 });
      for (let wi = 0; wi < 4; wi++) {
        const wAngle = (wi / 4) * Math.PI * 2;
        const archTorus = new THREE.Mesh(
          new THREE.TorusGeometry(0.16, 0.015, 14, 28, Math.PI),
          archGoldMat,
        );
        const archPosX = Math.cos(wAngle) * (br + 0.07);
        const archPosY = bh * 0.4 + wi * 0.4 + 0.30;
        const archPosZ = Math.sin(wAngle) * (br + 0.07);
        archTorus.position.set(archPosX, archPosY, archPosZ);
        archTorus.lookAt(building.position.x, archTorus.position.y, building.position.z);
        archTorus.rotateX(Math.PI / 2);
        building.add(archTorus);
        // Keystone at the top of the arch
        const archKeystone = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.05, 0.025),
          new THREE.MeshStandardMaterial({ color: 0xeedd88, metalness: 0.4, roughness: 0.3 }));
        archKeystone.position.set(archPosX, archPosY + 0.15, archPosZ);
        archKeystone.lookAt(building.position.x, archKeystone.position.y, building.position.z);
        building.add(archKeystone);
        // Window mullions/dividers (thin cross pieces inside window)
        const mullionOutR = br + 0.06;
        const mullionMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4 });
        // Vertical mullion
        const vertMullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.44, 0.012),
          mullionMat);
        vertMullion.position.set(
          Math.cos(wAngle) * mullionOutR,
          bh * 0.4 + wi * 0.4,
          Math.sin(wAngle) * mullionOutR);
        vertMullion.lookAt(building.position.x, vertMullion.position.y, building.position.z);
        building.add(vertMullion);
        // Horizontal mullion
        const horizMullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.012, 0.012),
          mullionMat);
        horizMullion.position.set(
          Math.cos(wAngle) * mullionOutR,
          bh * 0.4 + wi * 0.4 + 0.05,
          Math.sin(wAngle) * mullionOutR);
        horizMullion.lookAt(building.position.x, horizMullion.position.y, building.position.z);
        building.add(horizMullion);
      }

      // --- Balconies on taller buildings (bh > 4.5) ---
      if (bh > 4.5) {
        const balconyAngle = doorAngle + Math.PI;
        const balconyOutR = br + 0.25;
        const balconyFloor = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.04, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.6, metalness: 0.1 }),
        );
        balconyFloor.position.set(
          Math.cos(balconyAngle) * balconyOutR,
          bh * 0.55,
          Math.sin(balconyAngle) * balconyOutR,
        );
        balconyFloor.lookAt(building.position.x, balconyFloor.position.y, building.position.z);
        building.add(balconyFloor);
        const railMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.4, roughness: 0.3 });
        for (let rp = -2; rp <= 2; rp++) {
          const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), railMat);
          const rpOffset = rp * 0.18;
          railPost.position.set(
            Math.cos(balconyAngle) * (balconyOutR + 0.14) + Math.cos(balconyAngle + Math.PI / 2) * rpOffset,
            bh * 0.55 + 0.13,
            Math.sin(balconyAngle) * (balconyOutR + 0.14) + Math.sin(balconyAngle + Math.PI / 2) * rpOffset,
          );
          building.add(railPost);
        }
        const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 6), railMat);
        railBar.position.set(
          Math.cos(balconyAngle) * (balconyOutR + 0.14),
          bh * 0.55 + 0.24,
          Math.sin(balconyAngle) * (balconyOutR + 0.14),
        );
        railBar.lookAt(building.position.x, railBar.position.y, building.position.z);
        railBar.rotateZ(Math.PI / 2);
        building.add(railBar);
      }

      // --- Timber framing detail on building walls ---
      const timberFrameMat = new THREE.MeshStandardMaterial({ color: 0x5c4a3e, roughness: 0.85 });
      for (let tf = 0; tf < 4; tf++) {
        const tfAngle = (tf / 4) * Math.PI * 2 + Math.PI / 8;
        // Vertical timber strip
        const timberVertStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, bh * 0.6, 0.02),
          timberFrameMat);
        timberVertStrip.position.set(
          Math.cos(tfAngle) * (br + 0.02),
          bh * 0.4,
          Math.sin(tfAngle) * (br + 0.02));
        timberVertStrip.lookAt(building.position.x, timberVertStrip.position.y, building.position.z);
        building.add(timberVertStrip);
        // Diagonal timber brace
        const timberDiagStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, bh * 0.35, 0.02),
          timberFrameMat);
        timberDiagStrip.position.set(
          Math.cos(tfAngle + 0.06) * (br + 0.02),
          bh * 0.35,
          Math.sin(tfAngle + 0.06) * (br + 0.02));
        timberDiagStrip.lookAt(building.position.x, timberDiagStrip.position.y, building.position.z);
        timberDiagStrip.rotation.z = 0.35;
        building.add(timberDiagStrip);
      }
      // Horizontal timber band midway
      const timberHorizBand = new THREE.Mesh(
        new THREE.TorusGeometry(br * 1.01, 0.02, 6, 28),
        timberFrameMat);
      timberHorizBand.rotation.x = Math.PI / 2;
      timberHorizBand.position.y = bh * 0.5;
      building.add(timberHorizBand);

      // --- Hanging lanterns from building eaves ---
      const lanternCount = 1 + Math.floor(Math.random() * 2);
      for (let lni = 0; lni < lanternCount; lni++) {
        const lnAngle = doorAngle + Math.PI * 0.5 + lni * Math.PI;
        const lnOutR = br * 1.3 + 0.1;
        const chain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4),
          new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.3 }),
        );
        chain.position.set(Math.cos(lnAngle) * lnOutR, bh - 0.18, Math.sin(lnAngle) * lnOutR);
        building.add(chain);
        const lanternBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.1, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 1.2 }),
        );
        lanternBody.position.set(Math.cos(lnAngle) * lnOutR, bh - 0.4, Math.sin(lnAngle) * lnOutR);
        building.add(lanternBody);
        const lanternPt = new THREE.PointLight(0xffcc66, 0.3, 3);
        lanternPt.position.set(Math.cos(lnAngle) * lnOutR, bh - 0.4, Math.sin(lnAngle) * lnOutR);
        building.add(lanternPt);
      }

      // --- Vine/ivy climbing walls (~30% of buildings) ---
      if (Math.random() < 0.3) {
        const vineWallMat = new THREE.MeshStandardMaterial({ color: 0x337733, roughness: 0.85 });
        const vineLeafMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.7 });
        const vineAngle = Math.random() * Math.PI * 2;
        const vineSegments = 5 + Math.floor(Math.random() * 4);
        for (let vs = 0; vs < vineSegments; vs++) {
          const vineSeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.015, 0.4, 5),
            vineWallMat,
          );
          vineSeg.position.set(
            Math.cos(vineAngle + vs * 0.04) * (br + 0.04),
            0.2 + vs * 0.38,
            Math.sin(vineAngle + vs * 0.04) * (br + 0.04),
          );
          vineSeg.rotation.z = (Math.random() - 0.5) * 0.15;
          building.add(vineSeg);
          if (vs % 2 === 0) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), vineLeafMat);
            leaf.position.set(
              Math.cos(vineAngle + vs * 0.04) * (br + 0.08) + (Math.random() - 0.5) * 0.04,
              0.2 + vs * 0.38 + 0.1,
              Math.sin(vineAngle + vs * 0.04) * (br + 0.08) + (Math.random() - 0.5) * 0.04,
            );
            leaf.scale.y = 0.6;
            building.add(leaf);
          }
        }
      }

      // --- Ornate doorway pillars with finials ---
      const doorPillarMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.5, metalness: 0.15 });
      const doorFinialMat = new THREE.MeshStandardMaterial({ color: 0xddc866, metalness: 0.5, roughness: 0.25 });
      for (const dpSide of [-1, 1]) {
        const dpAngleOffset = dpSide * 0.15;
        const dpX = Math.cos(doorAngle + dpAngleOffset) * (br + 0.13);
        const dpZ = Math.sin(doorAngle + dpAngleOffset) * (br + 0.13);
        const dpPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.9, 8), doorPillarMat);
        dpPillar.position.set(dpX, 0.45, dpZ);
        building.add(dpPillar);
        const dpFinial = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), doorFinialMat);
        dpFinial.position.set(dpX, 0.92, dpZ);
        building.add(dpFinial);
      }

      // --- Elven banner/tapestry on some building fronts ---
      if (Math.random() > 0.5) {
        const bannerAngle = doorAngle + Math.PI * (0.4 + Math.random() * 0.2);
        const bannerOutR = br + 0.06;
        const bannerCloth = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.7),
          new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x5533aa : 0xaabbcc,
            roughness: 0.8,
            side: THREE.DoubleSide,
            metalness: 0.15,
          }),
        );
        bannerCloth.position.set(
          Math.cos(bannerAngle) * bannerOutR,
          bh * 0.55,
          Math.sin(bannerAngle) * bannerOutR,
        );
        bannerCloth.lookAt(building.position.x, bannerCloth.position.y, building.position.z);
        building.add(bannerCloth);
      }

      // --- Roof ornament finial (sphere or cone at peak) ---
      const roofOrnMat = new THREE.MeshStandardMaterial({ color: 0xddddee, metalness: 0.6, roughness: 0.2, emissive: 0x4488ff, emissiveIntensity: 0.2 });
      if (Math.random() > 0.5) {
        const roofSphere = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), roofOrnMat);
        roofSphere.position.y = bh + roofH + 0.47;
        building.add(roofSphere);
      } else {
        const roofConeOrn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 8), roofOrnMat);
        roofConeOrn.position.y = bh + roofH + 0.5;
        building.add(roofConeOrn);
      }

      // Building glow light
      const bldgLight = new THREE.PointLight(0x4488cc, 0.3, 6);
      bldgLight.position.y = bh * 0.5;
      building.add(bldgLight);

      const bx = (Math.random() - 0.5) * w * 0.8;
      const bz = (Math.random() - 0.5) * d * 0.8;
      building.position.set(bx, getTerrainHeight(bx, bz), bz);

      // --- Stepping stones from door outward (3-4 stones) ---
      const stoneCount = 3 + Math.floor(Math.random() * 2);
      const bldgStoneMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85 });
      for (let si = 1; si <= stoneCount; si++) {
        const stoneX = bx + Math.cos(doorAngle) * (br + 0.2 + si * 0.4);
        const stoneZ = bz + Math.sin(doorAngle) * (br + 0.2 + si * 0.4);
        const stone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12 + Math.random() * 0.05, 0.14 + Math.random() * 0.05, 0.04, 10),
          bldgStoneMat,
        );
        stone.position.set(stoneX, getTerrainHeight(stoneX, stoneZ) + 0.02, stoneZ);
        mctx.envGroup.add(stone);
      }

      // --- Garden plot near building with paving, borders, and varied plants ---
      if (Math.random() > 0.4) {
        const gardenAngle = doorAngle + Math.PI * (0.6 + Math.random() * 0.8);
        const gardenDist = br + 0.6;
        const gardenGX = bx + Math.cos(gardenAngle) * gardenDist;
        const gardenGZ = bz + Math.sin(gardenAngle) * gardenDist;
        const gardenTerrainY = getTerrainHeight(gardenGX, gardenGZ);
        const dirtPatch = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.04, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.95 }),
        );
        dirtPatch.position.set(gardenGX, gardenTerrainY + 0.02, gardenGZ);
        dirtPatch.rotation.y = gardenAngle;
        mctx.envGroup.add(dirtPatch);
        // Decorative border stones around garden
        const gardenBorderMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.8 });
        for (let gb = 0; gb < 8; gb++) {
          const gbAngle2 = (gb / 8) * Math.PI * 2;
          const gbStone = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.04, 0.04),
            gardenBorderMat);
          gbStone.position.set(
            gardenGX + Math.cos(gardenAngle + gbAngle2) * 0.32,
            gardenTerrainY + 0.03,
            gardenGZ + Math.sin(gardenAngle + gbAngle2) * 0.22);
          gbStone.rotation.y = gardenAngle + gbAngle2;
          mctx.envGroup.add(gbStone);
        }
        // Paving stones (small stepping path to garden)
        for (let gp = 0; gp < 2; gp++) {
          const gardenPaver = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.07, 0.02, 8),
            gardenBorderMat);
          gardenPaver.position.set(
            gardenGX - Math.cos(gardenAngle) * (0.35 + gp * 0.2),
            gardenTerrainY + 0.02,
            gardenGZ - Math.sin(gardenAngle) * (0.35 + gp * 0.2));
          mctx.envGroup.add(gardenPaver);
        }
        // Varied plants: vegetables, flowers, leafy greens
        const vegColors = [0x44aa33, 0xaa3322, 0xddaa22, 0x8844cc, 0xff6633];
        for (let vg = 0; vg < 4 + Math.floor(Math.random() * 3); vg++) {
          const vegX = gardenGX + (Math.random() - 0.5) * 0.45;
          const vegZ = gardenGZ + (Math.random() - 0.5) * 0.3;
          const vegColor = vegColors[vg % vegColors.length];
          if (vg % 3 === 0) {
            // Leafy plant (cluster of small spheres)
            for (let lf = 0; lf < 3; lf++) {
              const gardenLeaf = new THREE.Mesh(
                new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x44aa33 + Math.floor(Math.random() * 0x112200), roughness: 0.7 }));
              gardenLeaf.scale.y = 0.5;
              gardenLeaf.position.set(
                vegX + (Math.random() - 0.5) * 0.03,
                gardenTerrainY + 0.05 + lf * 0.01,
                vegZ + (Math.random() - 0.5) * 0.03);
              mctx.envGroup.add(gardenLeaf);
            }
          } else {
            // Fruit/vegetable sphere
            const veg = new THREE.Mesh(
              new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 10, 8),
              new THREE.MeshStandardMaterial({ color: vegColor, roughness: 0.7 }));
            veg.position.set(vegX, gardenTerrainY + 0.06, vegZ);
            mctx.envGroup.add(veg);
            // Small stem on top
            const vegStemlet = new THREE.Mesh(
              new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4),
              new THREE.MeshStandardMaterial({ color: 0x33aa22, roughness: 0.8 }));
            vegStemlet.position.set(vegX, gardenTerrainY + 0.08, vegZ);
            mctx.envGroup.add(vegStemlet);
          }
        }
      }

      mctx.envGroup.add(building);

    }

    // Crystal lanterns (18) with ornate metalwork
    for (let i = 0; i < 18; i++) {
      const lantern = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.3 });
      const postGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.5, 23);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.25;
      lantern.add(post);

      // Ornate bracket at top
      const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 30, 27, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6, roughness: 0.2 }));
      bracket.position.y = 2.45;
      bracket.rotation.z = Math.PI;
      lantern.add(bracket);

      // Hanging crystal with filigree cage
      const crystalColor = [0x66ccff, 0x88aaff, 0x44ddff][i % 3];
      const crystalGeo = i % 2 === 0 ? new THREE.IcosahedronGeometry(0.18, 2) : new THREE.OctahedronGeometry(0.18, 2);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: crystalColor, emissive: crystalColor, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.85,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 2.6;
      lantern.add(crystal);

      // Cage wires around crystal
      for (let cw = 0; cw < 4; cw++) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4, 16), postMat);
        const cwAng = (cw / 4) * Math.PI * 2;
        wire.position.set(Math.cos(cwAng) * 0.12, 2.6, Math.sin(cwAng) * 0.12);
        lantern.add(wire);
      }

      const ptLight = new THREE.PointLight(crystalColor, 0.8, 10);
      ptLight.position.y = 2.6;
      lantern.add(ptLight);

      const lanX = (Math.random() - 0.5) * w * 0.9;
      const lanZ = (Math.random() - 0.5) * d * 0.9;
      lantern.position.set(lanX, getTerrainHeight(lanX, lanZ), lanZ);
      mctx.envGroup.add(lantern);
    }

    // Crystalline spires (8) - tall glowing crystal formations
    const spireColors = [0x4466ff, 0x66aaff, 0x88ccff, 0xaa88ff];
    for (let i = 0; i < 8; i++) {
      const spireGrp = new THREE.Group();
      const spireColor = spireColors[i % spireColors.length];
      const mainH = 3 + Math.random() * 4;
      const mainSpire = new THREE.Mesh(new THREE.ConeGeometry(0.3 + Math.random() * 0.2, mainH, 20),
        new THREE.MeshStandardMaterial({ color: spireColor, emissive: spireColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.7, metalness: 0.3, roughness: 0.1 }));
      mainSpire.position.y = mainH / 2;
      mainSpire.castShadow = true;
      spireGrp.add(mainSpire);
      // Smaller satellite crystals
      for (let sc = 0; sc < 3; sc++) {
        const scH = 1 + Math.random() * 1.5;
        const scAng = (sc / 3) * Math.PI * 2 + Math.random() * 0.5;
        const satCrystal = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.1, scH, 17),
          new THREE.MeshStandardMaterial({ color: spireColor, emissive: spireColor, emissiveIntensity: 0.3, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.3 }));
        satCrystal.position.set(Math.cos(scAng) * 0.4, scH / 2, Math.sin(scAng) * 0.4);
        satCrystal.rotation.z = (Math.random() - 0.5) * 0.3;
        spireGrp.add(satCrystal);
      }
      // Glow light at base
      const spireLight = new THREE.PointLight(spireColor, 1.0, 8);
      spireLight.position.y = mainH * 0.5;
      spireGrp.add(spireLight);
      const spX = (Math.random() - 0.5) * w * 0.7;
      const spZ = (Math.random() - 0.5) * d * 0.7;
      spireGrp.position.set(spX, getTerrainHeight(spX, spZ), spZ);
      mctx.envGroup.add(spireGrp);
    }

    // Ancient trees (25) with glowing roots
    for (let i = 0; i < 25; i++) {
      const tree = new THREE.Group();
      const trunkH = 4 + Math.random() * 3;
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, trunkH, 27);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4a3e, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Multi-layered canopy
      const crownR = 2.0 + Math.random();
      const crownGeo = new THREE.SphereGeometry(crownR, 44, 23);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = trunkH + 1.0;
      crown.castShadow = true;
      tree.add(crown);
      // Second canopy layer
      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(crownR * 0.7, 23, 20),
        new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.75 }));
      crown2.position.set((Math.random() - 0.5) * 0.5, trunkH + 1.8, (Math.random() - 0.5) * 0.5);
      crown2.castShadow = true;
      tree.add(crown2);

      // Glowing sap/runes on trunk (elven enchantment)
      if (Math.random() > 0.5) {
        for (let sr = 0; sr < 3; sr++) {
          const sapRune = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.03),
            new THREE.MeshStandardMaterial({ color: 0x44ddaa, emissive: 0x22aa77, emissiveIntensity: 0.8 }));
          const srAng = (sr / 3) * Math.PI * 2;
          sapRune.position.set(Math.cos(srAng) * 0.35, trunkH * 0.3 + sr * 0.5, Math.sin(srAng) * 0.35);
          sapRune.lookAt(new THREE.Vector3(0, sapRune.position.y, 0));
          tree.add(sapRune);
        }
      }

      // Exposed glowing roots
      for (let r = 0; r < 3; r++) {
        const rootAng = (r / 3) * Math.PI * 2 + Math.random() * 0.5;
        const rootLen = 0.5 + Math.random() * 0.6;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, rootLen, 20), trunkMat);
        root.position.set(Math.cos(rootAng) * 0.3, rootLen * 0.2, Math.sin(rootAng) * 0.3);
        root.rotation.z = Math.cos(rootAng) * 0.7;
        root.rotation.x = Math.sin(rootAng) * 0.7;
        tree.add(root);
      }

      const etX = (Math.random() - 0.5) * w;
      const etZ = (Math.random() - 0.5) * d;
      tree.position.set(etX, getTerrainHeight(etX, etZ), etZ);
      mctx.envGroup.add(tree);
    }

    // Stone bridge over moonlit pond
    const pondGeo = new THREE.PlaneGeometry(8, 6);
    const pondMat = new THREE.MeshStandardMaterial({
      color: 0x224488,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
    });
    const pond = new THREE.Mesh(pondGeo, pondMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(5, getTerrainHeight(5, -5) + 0.02, -5);
    mctx.envGroup.add(pond);

    const bridgeGeo = new THREE.BoxGeometry(2, 0.3, 8);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(5, getTerrainHeight(5, -5) + 0.5, -5);
    bridge.castShadow = true;
    mctx.envGroup.add(bridge);

    // Railings with elven-style decorative arches
    const bridgeRailGoldMat = new THREE.MeshStandardMaterial({ color: 0xddc866, metalness: 0.5, roughness: 0.25 });
    for (let side = -1; side <= 1; side += 2) {
      for (let pi = 0; pi < 5; pi++) {
        const pillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 23);
        const pillar = new THREE.Mesh(pillarGeo, bridgeMat);
        pillar.position.set(5 + side * 0.9, 0.9, -5 - 3 + pi * 1.5);
        mctx.envGroup.add(pillar);
        // Decorative elven curved torus arch between railing posts
        if (pi < 4) {
          const railArch = new THREE.Mesh(
            new THREE.TorusGeometry(0.35, 0.02, 8, 16, Math.PI),
            bridgeRailGoldMat,
          );
          railArch.position.set(5 + side * 0.9, 1.3, -5 - 3 + pi * 1.5 + 0.75);
          railArch.rotation.y = Math.PI / 2;
          railArch.rotation.z = Math.PI;
          mctx.envGroup.add(railArch);
        }
      }
      // Horizontal top rail bar
      const topRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 7.5, 8),
        bridgeMat,
      );
      topRail.position.set(5 + side * 0.9, 1.32, -5);
      topRail.rotation.x = Math.PI / 2;
      mctx.envGroup.add(topRail);
    }

    // Ruins with moss (8 pillars) - detailed fluted columns with capitals, bases, damage
    for (let i = 0; i < 8; i++) {
      const ruin = new THREE.Group();
      const pH = 2 + Math.random() * 3;
      const pilR = 0.35;
      const pilRBot = 0.4;
      const pilMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.8 });
      const pilMatDark = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85 });
      const isBroken = i % 3 === 0;
      const tiltAngle = isBroken ? (Math.random() * 0.3 + 0.1) * (Math.random() > 0.5 ? 1 : -1) : 0;

      // Base plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 1.0), pilMat);
      plinth.position.y = 0.125;
      ruin.add(plinth);
      const plinthTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), pilMatDark);
      plinthTop.position.y = 0.3;
      ruin.add(plinthTop);

      // Main column body
      const pilGeo = new THREE.CylinderGeometry(pilR, pilRBot, pH, 27);
      const pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.y = 0.35 + pH / 2;
      if (isBroken) pil.rotation.z = tiltAngle;
      ruin.add(pil);

      // Fluted grooves (vertical strips along column surface)
      const numFlutes = 10;
      for (let f = 0; f < numFlutes; f++) {
        const fluteAng = (f / numFlutes) * Math.PI * 2;
        const fluteGeo = new THREE.BoxGeometry(0.04, pH * 0.9, 0.06);
        const flute = new THREE.Mesh(fluteGeo, pilMatDark);
        const fluteR = pilR * 0.95;
        flute.position.set(
          Math.cos(fluteAng) * fluteR,
          0.35 + pH / 2,
          Math.sin(fluteAng) * fluteR
        );
        flute.rotation.y = -fluteAng;
        if (isBroken) flute.rotation.z = tiltAngle;
        ruin.add(flute);
      }

      // Capital (top piece with scroll detail)
      if (!isBroken || Math.random() > 0.5) {
        const capY = 0.35 + pH;
        const capitalBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, pilR, 0.2, 27), pilMat);
        capitalBase.position.y = capY + 0.1;
        if (isBroken) capitalBase.rotation.z = tiltAngle;
        ruin.add(capitalBase);
        const capitalTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), pilMat);
        capitalTop.position.y = capY + 0.26;
        if (isBroken) capitalTop.rotation.z = tiltAngle;
        ruin.add(capitalTop);
        // Scroll/volute decorations on capital
        for (const vs of [-1, 1]) {
          const volute = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 12, Math.PI * 1.5), pilMatDark);
          volute.position.set(vs * 0.35, capY + 0.15, 0);
          volute.rotation.y = vs * Math.PI / 2;
          ruin.add(volute);
        }
      }

      // Damage - missing chunks from top edge
      for (let d = 0; d < 2 + Math.floor(Math.random() * 3); d++) {
        const chunkAng = Math.random() * Math.PI * 2;
        const chunkGeo = new THREE.BoxGeometry(0.12 + Math.random() * 0.1, 0.15 + Math.random() * 0.2, 0.12);
        const chunk = new THREE.Mesh(chunkGeo, pilMatDark);
        chunk.position.set(
          Math.cos(chunkAng) * pilR * 0.6,
          0.35 + pH - 0.1 + Math.random() * 0.2,
          Math.sin(chunkAng) * pilR * 0.6
        );
        chunk.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5);
        ruin.add(chunk);
      }

      // Debris at base (scattered dodecahedrons)
      for (let db = 0; db < 4 + Math.floor(Math.random() * 4); db++) {
        const debrisSize = 0.05 + Math.random() * 0.12;
        const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(debrisSize, 1), pilMat);
        const debrisAng = Math.random() * Math.PI * 2;
        const debrisDist = 0.5 + Math.random() * 0.8;
        debris.position.set(
          Math.cos(debrisAng) * debrisDist,
          debrisSize * 0.5,
          Math.sin(debrisAng) * debrisDist
        );
        debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        ruin.add(debris);
      }

      // Moss patches - varied sizes
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 1.0 });
      const mossMatLight = new THREE.MeshStandardMaterial({ color: 0x448844, roughness: 0.95 });
      for (let m = 0; m < 5 + Math.floor(Math.random() * 4); m++) {
        const mossSize = 0.06 + Math.random() * 0.18;
        const mossGeo = new THREE.SphereGeometry(mossSize, 8, 6);
        const moss = new THREE.Mesh(mossGeo, Math.random() > 0.5 ? mossMat : mossMatLight);
        const mossAng = Math.random() * Math.PI * 2;
        moss.position.set(
          Math.cos(mossAng) * pilR * (0.8 + Math.random() * 0.3),
          0.35 + Math.random() * pH,
          Math.sin(mossAng) * pilR * (0.8 + Math.random() * 0.3)
        );
        moss.scale.set(1, 0.5 + Math.random() * 0.5, 1);
        ruin.add(moss);
      }

      // Hanging vine strips (PlaneGeometry)
      const vineMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.9, side: THREE.DoubleSide });
      for (let v = 0; v < 2 + Math.floor(Math.random() * 3); v++) {
        const vineH = 0.4 + Math.random() * 0.8;
        const vine = new THREE.Mesh(new THREE.PlaneGeometry(0.06, vineH), vineMat);
        const vineAng = Math.random() * Math.PI * 2;
        vine.position.set(
          Math.cos(vineAng) * pilR * 1.05,
          0.35 + pH * 0.5 + Math.random() * pH * 0.3,
          Math.sin(vineAng) * pilR * 1.05
        );
        vine.rotation.y = vineAng;
        vine.rotation.z = (Math.random() - 0.5) * 0.3;
        ruin.add(vine);
      }

      const ruinX = -15 + (Math.random() - 0.5) * 10;
      const ruinZ = 10 + (Math.random() - 0.5) * 8;
      ruin.position.set(ruinX, getTerrainHeight(ruinX, ruinZ), ruinZ);
      mctx.envGroup.add(ruin);
    }

    // Elvish rune patterns on ground (15) - glowing geometric patterns
    const elRuneMat = new THREE.MeshStandardMaterial({ color: 0x66aaff, emissive: 0x4488dd, emissiveIntensity: 0.6, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    for (let i = 0; i < 15; i++) {
      const runeGrp = new THREE.Group();
      const runeR = 0.8 + Math.random() * 1.2;
      // Outer ring
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(runeR - 0.05, runeR, 16), elRuneMat);
      outerRing.rotation.x = -Math.PI / 2;
      runeGrp.add(outerRing);
      // Inner symbol (star pattern)
      const innerRing = new THREE.Mesh(new THREE.RingGeometry(runeR * 0.3, runeR * 0.4, 12), elRuneMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.rotation.z = Math.PI / 6;
      innerRing.position.y = 0.01;
      runeGrp.add(innerRing);
      // Connecting lines
      for (let ln = 0; ln < 4; ln++) {
        const lineAng = (ln / 4) * Math.PI * 2;
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.04, runeR * 0.6), elRuneMat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = lineAng;
        line.position.y = 0.015;
        runeGrp.add(line);
      }
      const rnX = (Math.random() - 0.5) * w * 0.8;
      const rnZ = (Math.random() - 0.5) * d * 0.8;
      runeGrp.position.set(rnX, getTerrainHeight(rnX, rnZ) + 0.02, rnZ);
      mctx.envGroup.add(runeGrp);
    }

    // Enchanted garden flowers (35) - luminescent magical flora
    const gardenColors = [0x4488ff, 0xff44aa, 0xaaddff, 0x88ffbb, 0xddaaff];
    for (let i = 0; i < 35; i++) {
      const flowerGroup = new THREE.Group();
      const fCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < fCount; j++) {
        const fStemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 17);
        const fStemMat = new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.8 });
        const fStem = new THREE.Mesh(fStemGeo, fStemMat);
        fStem.position.set((Math.random() - 0.5) * 0.3, 0.125, (Math.random() - 0.5) * 0.3);
        flowerGroup.add(fStem);
        const gc = gardenColors[Math.floor(Math.random() * gardenColors.length)];
        const glowGeo = new THREE.SphereGeometry(0.05, 23, 20);
        const glowMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: 0.8, roughness: 0.3 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(fStem.position.x, 0.27, fStem.position.z);
        flowerGroup.add(glow);
      }
      const fgX = (Math.random() - 0.5) * w * 0.8;
      const fgZ = (Math.random() - 0.5) * d * 0.8;
      flowerGroup.position.set(fgX, getTerrainHeight(fgX, fgZ), fgZ);
      mctx.envGroup.add(flowerGroup);
    }

    // Vine-covered archways (4) - detailed with carved stone, keystone, runes, realistic ivy
    for (let i = 0; i < 4; i++) {
      const archGroup = new THREE.Group();
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });
      const pillarMatWeathered = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.85 });
      const pillarMatDark = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });

      for (let side = -1; side <= 1; side += 2) {
        // Main pillar body
        const pillarGeo = new THREE.CylinderGeometry(0.15, 0.17, 3.5, 27);
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(side * 1.2, 1.75, 0);
        pillar.castShadow = true;
        archGroup.add(pillar);

        // Horizontal ring bands on pillars (carved stone detail)
        for (let rb = 0; rb < 4; rb++) {
          const ringY = 0.5 + rb * 0.9;
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 18), pillarMatDark);
          ring.position.set(side * 1.2, ringY, 0);
          ring.rotation.x = Math.PI / 2;
          archGroup.add(ring);
        }

        // Carved rune/pattern insets on pillars (small recessed boxes)
        for (let rn = 0; rn < 3; rn++) {
          const runeY = 0.8 + rn * 1.0;
          const runeInset = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), pillarMatDark);
          runeInset.position.set(side * 1.2, runeY, 0.16);
          archGroup.add(runeInset);
          // Inner glyph detail
          const glyphLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.01),
            new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6 }));
          glyphLine.position.set(side * 1.2, runeY, 0.17);
          archGroup.add(glyphLine);
        }

        // Pillar base (wider foot)
        const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), pillarMat);
        pillarBase.position.set(side * 1.2, 0.075, 0);
        archGroup.add(pillarBase);

        // Pillar capital (wider top)
        const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.38), pillarMat);
        pillarCap.position.set(side * 1.2, 3.5, 0);
        archGroup.add(pillarCap);
      }

      // Main arch (torus)
      const archGeo = new THREE.TorusGeometry(1.2, 0.12, 27, 36, Math.PI);
      const arch = new THREE.Mesh(archGeo, pillarMat);
      arch.position.y = 3.5;
      arch.rotation.z = Math.PI;
      archGroup.add(arch);

      // Keystone at arch top (protruding center stone)
      const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), pillarMatWeathered);
      keystone.position.set(0, 3.5 + 1.2, 0);
      archGroup.add(keystone);
      // Keystone decorative face
      const keystoneFace = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.05), pillarMatDark);
      keystoneFace.position.set(0, 3.5 + 1.2, 0.12);
      archGroup.add(keystoneFace);

      // Realistic ivy with individual leaf pieces trailing down
      const ivyLeafMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.9, side: THREE.DoubleSide });
      const ivyLeafMatLight = new THREE.MeshStandardMaterial({ color: 0x448844, roughness: 0.85, side: THREE.DoubleSide });
      // Ivy cluster blobs along the arch
      for (let iv = 0; iv < 10; iv++) {
        const ivAng = Math.random() * Math.PI;
        const ivX = Math.cos(ivAng) * 1.2;
        const ivY = 3.5 - Math.sin(ivAng) * 1.2;
        const ivyBlob = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 6, 5),
          Math.random() > 0.5 ? ivyLeafMat : ivyLeafMatLight);
        ivyBlob.position.set(ivX, ivY, (Math.random() - 0.5) * 0.2);
        archGroup.add(ivyBlob);
      }
      // Trailing vine strips with leaf planes
      for (let tv = 0; tv < 6; tv++) {
        const trailAng = Math.random() * Math.PI;
        const trailX = Math.cos(trailAng) * 1.2;
        const trailYTop = 3.5 - Math.sin(trailAng) * 1.2;
        const vineLen = 0.5 + Math.random() * 1.5;
        // Vine stem
        const vineStem = new THREE.Mesh(new THREE.PlaneGeometry(0.03, vineLen),
          new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.9, side: THREE.DoubleSide }));
        vineStem.position.set(trailX, trailYTop - vineLen / 2, 0.13);
        archGroup.add(vineStem);
        // Individual leaves along the vine
        for (let lf = 0; lf < 3 + Math.floor(Math.random() * 4); lf++) {
          const leafY = trailYTop - (lf / 5) * vineLen;
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), ivyLeafMat);
          leaf.position.set(trailX + (Math.random() - 0.5) * 0.1, leafY, 0.14);
          leaf.rotation.z = (Math.random() - 0.5) * 0.8;
          archGroup.add(leaf);
        }
      }

      // Fallen stones / rubble at base
      for (let rb = 0; rb < 5 + Math.floor(Math.random() * 4); rb++) {
        const rubSize = 0.06 + Math.random() * 0.12;
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(rubSize, 1), pillarMatWeathered);
        rubble.position.set(
          (Math.random() - 0.5) * 2.4,
          rubSize * 0.4,
          (Math.random() - 0.5) * 0.8
        );
        rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        archGroup.add(rubble);
      }

      // Weathering color variation patches on arch
      for (let wp = 0; wp < 4; wp++) {
        const wpAng = Math.random() * Math.PI;
        const weatherPatch = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4),
          new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.95 }));
        weatherPatch.position.set(Math.cos(wpAng) * 1.2, 3.5 - Math.sin(wpAng) * 1.2, (Math.random() - 0.5) * 0.15);
        weatherPatch.scale.set(1.5, 0.5, 1);
        archGroup.add(weatherPatch);
      }

      const archX = (Math.random() - 0.5) * w * 0.6;
      const archZ = (Math.random() - 0.5) * d * 0.6;
      archGroup.position.set(archX, getTerrainHeight(archX, archZ), archZ);
      archGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(archGroup);
    }

    // Fountain - central feature with decorative detail
    const fountainGroup = new THREE.Group();
    const basinGeo = new THREE.TorusGeometry(1.5, 0.2, 27, 46);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, metalness: 0.2 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.rotation.x = -Math.PI / 2;
    basin.position.y = 0.3;
    fountainGroup.add(basin);
    // Decorative rim segments on basin
    for (let fRim = 0; fRim < 12; fRim++) {
      const fRimAng = (fRim / 12) * Math.PI * 2;
      const fRimStone = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.08, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.55, metalness: 0.2 }));
      fRimStone.position.set(Math.cos(fRimAng) * 1.5, 0.35, Math.sin(fRimAng) * 1.5);
      fRimStone.rotation.y = fRimAng;
      fountainGroup.add(fRimStone);
    }
    // Inner basin step
    const innerBasinRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.1, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.65, metalness: 0.15 }));
    innerBasinRim.rotation.x = -Math.PI / 2;
    innerBasinRim.position.y = 0.15;
    fountainGroup.add(innerBasinRim);
    const waterGeo = new THREE.CircleGeometry(1.3, 44);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.3 });
    const waterSurf = new THREE.Mesh(waterGeo, waterMat);
    waterSurf.rotation.x = -Math.PI / 2;
    waterSurf.position.y = 0.25;
    fountainGroup.add(waterSurf);
    // Central pedestal column
    const fountPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5, metalness: 0.2 }));
    fountPedestal.position.y = 0.6;
    fountainGroup.add(fountPedestal);
    // Decorative rings on pedestal
    for (let pr = 0; pr < 2; pr++) {
      const pedestalRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.02, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xddc866, metalness: 0.5, roughness: 0.25 }));
      pedestalRing.rotation.x = Math.PI / 2;
      pedestalRing.position.y = 0.4 + pr * 0.4;
      fountainGroup.add(pedestalRing);
    }
    const jetGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 23);
    const jetMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 });
    const jet = new THREE.Mesh(jetGeo, jetMat);
    jet.position.y = 1.3;
    fountainGroup.add(jet);
    // Water splash droplets at base of jet
    for (let fSplash = 0; fSplash < 6; fSplash++) {
      const splashAng = (fSplash / 6) * Math.PI * 2;
      const splashDrop = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 }));
      splashDrop.position.set(Math.cos(splashAng) * 0.2, 0.3 + Math.random() * 0.15, Math.sin(splashAng) * 0.2);
      fountainGroup.add(splashDrop);
    }
    // Paving stones around fountain base
    for (let fp = 0; fp < 16; fp++) {
      const fpAng = (fp / 16) * Math.PI * 2;
      const fpDist = 1.8 + Math.random() * 0.2;
      const fountPaver = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.16, 0.03, 8),
        new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85 }));
      fountPaver.position.set(Math.cos(fpAng) * fpDist, 0.015, Math.sin(fpAng) * fpDist);
      fountainGroup.add(fountPaver);
    }
    fountainGroup.position.set(0, getTerrainHeight(0, 0), 0);
    mctx.envGroup.add(fountainGroup);

    // Statues (3)
    for (let i = 0; i < 3; i++) {
      const statueGroup = new THREE.Group();
      const pedGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.1 });
      const pedestal = new THREE.Mesh(pedGeo, pedMat);
      pedestal.position.y = 0.25;
      statueGroup.add(pedestal);
      const stBodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 27);
      const stMat = new THREE.MeshStandardMaterial({ color: 0x999999, emissive: 0x112244, emissiveIntensity: 0.3, roughness: 0.5 });
      const stBody = new THREE.Mesh(stBodyGeo, stMat);
      stBody.position.y = 1.1;
      statueGroup.add(stBody);
      const stHeadGeo = new THREE.SphereGeometry(0.14, 27, 23);
      const stHead = new THREE.Mesh(stHeadGeo, stMat);
      stHead.position.y = 1.85;
      statueGroup.add(stHead);
      const stArmGeo = new THREE.ConeGeometry(0.06, 0.5, 20);
      const stArm = new THREE.Mesh(stArmGeo, stMat);
      stArm.position.set(0.3, 1.5, 0.1);
      stArm.rotation.z = -0.8;
      statueGroup.add(stArm);
      const stX = (Math.random() - 0.5) * w * 0.5;
      const stZ = (Math.random() - 0.5) * d * 0.5;
      statueGroup.position.set(stX, getTerrainHeight(stX, stZ), stZ);
      mctx.envGroup.add(statueGroup);
    }

    // Floating crystals (14) with particle trails
    const crystalColors = [0x4466ff, 0x8844cc, 0x44cc66, 0x66aaff, 0xaa44ff];
    for (let i = 0; i < 14; i++) {
      const cc = crystalColors[i % crystalColors.length];
      const fcGrp = new THREE.Group();
      const fcGeo = i % 3 === 0 ? new THREE.IcosahedronGeometry(0.2, 2) : i % 3 === 1 ? new THREE.OctahedronGeometry(0.2, 2) : new THREE.TetrahedronGeometry(0.2, 2);
      const fcMat = new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 1.2, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.5 });
      const fc = new THREE.Mesh(fcGeo, fcMat);
      fcGrp.add(fc);
      // Orbiting smaller shards
      for (let sh = 0; sh < 3; sh++) {
        const shardGeo = new THREE.OctahedronGeometry(0.05 + Math.random() * 0.04, 2);
        const shard = new THREE.Mesh(shardGeo, new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }));
        const shAng = (sh / 3) * Math.PI * 2;
        shard.position.set(Math.cos(shAng) * 0.35, Math.sin(sh) * 0.15, Math.sin(shAng) * 0.35);
        fcGrp.add(shard);
      }
      // Sparkle trail below
      for (let sp = 0; sp < 3; sp++) {
        const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 8),
          new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 - sp * 0.08 }));
        sparkle.position.y = -0.2 - sp * 0.15;
        sparkle.position.x = (Math.random() - 0.5) * 0.1;
        fcGrp.add(sparkle);
      }
      fcGrp.position.set((Math.random() - 0.5) * w * 0.7, 2.0 + Math.random() * 3.0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(fcGrp);
      const cPt = new THREE.PointLight(cc, 0.5, 7);
      cPt.position.copy(fcGrp.position);
      mctx.envGroup.add(cPt);
    }

    // Mushroom circle (fairy ring)
    const fairyRingGroup = new THREE.Group();
    for (let m = 0; m < 12; m++) {
      const mStemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.15, 23);
      const mStemMat = new THREE.MeshStandardMaterial({ color: 0xaaddcc, emissive: 0x225544, emissiveIntensity: 0.5 });
      const mStem = new THREE.Mesh(mStemGeo, mStemMat);
      const mAng = (m / 12) * Math.PI * 2;
      mStem.position.set(Math.cos(mAng) * 1.5, 0.075, Math.sin(mAng) * 1.5);
      fairyRingGroup.add(mStem);
      const mCapGeo = new THREE.SphereGeometry(0.08, 23, 20, 0, Math.PI * 2, 0, Math.PI / 2);
      const mCapMat = new THREE.MeshStandardMaterial({ color: 0x44ddaa, emissive: 0x22aa77, emissiveIntensity: 0.8 });
      const mCap = new THREE.Mesh(mCapGeo, mCapMat);
      mCap.position.set(Math.cos(mAng) * 1.5, 0.15, Math.sin(mAng) * 1.5);
      fairyRingGroup.add(mCap);
    }
    const frX = (Math.random() - 0.5) * w * 0.4;
    const frZ = (Math.random() - 0.5) * d * 0.4;
    fairyRingGroup.position.set(frX, getTerrainHeight(frX, frZ), frZ);
    mctx.envGroup.add(fairyRingGroup);

    // Fallen leaves (15)
    const leafColors = [0xddaa33, 0xcc7722, 0xbb3322];
    for (let i = 0; i < 15; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.12, 0.08);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)], roughness: 0.9, side: THREE.DoubleSide });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      leaf.rotation.z = Math.random() * Math.PI * 2;
      const lfX = (Math.random() - 0.5) * w * 0.8;
      const lfZ = (Math.random() - 0.5) * d * 0.8;
      leaf.position.set(lfX, getTerrainHeight(lfX, lfZ) + 0.02, lfZ);
      mctx.envGroup.add(leaf);
    }

    // Benches (3)
    for (let i = 0; i < 3; i++) {
      const benchGroup = new THREE.Group();
      const seatGeo = new THREE.BoxGeometry(1.2, 0.08, 0.35);
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
      const seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.y = 0.4;
      benchGroup.add(seat);
      for (let leg = -1; leg <= 1; leg += 2) {
        const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.3);
        const legM = new THREE.Mesh(legGeo, benchMat);
        legM.position.set(leg * 0.5, 0.2, 0);
        benchGroup.add(legM);
      }
      const benchX = (Math.random() - 0.5) * w * 0.6;
      const benchZ = (Math.random() - 0.5) * d * 0.6;
      benchGroup.position.set(benchX, getTerrainHeight(benchX, benchZ), benchZ);
      benchGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(benchGroup);
    }

    // Stepping stone paths (3 paths of 8 stones each)
    for (let p = 0; p < 3; p++) {
      const startX = (Math.random() - 0.5) * w * 0.5;
      const startZ = (Math.random() - 0.5) * d * 0.5;
      const dirX = (Math.random() - 0.5) * 0.8;
      const dirZ = (Math.random() - 0.5) * 0.8;
      for (let s = 0; s < 8; s++) {
        const ssGeo = new THREE.CylinderGeometry(0.2 + Math.random() * 0.1, 0.22 + Math.random() * 0.1, 0.06, 23);
        const ssMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85 });
        const ss = new THREE.Mesh(ssGeo, ssMat);
        const ssX = startX + dirX * s * 1.2;
        const ssZ = startZ + dirZ * s * 1.2;
        ss.position.set(ssX, getTerrainHeight(ssX, ssZ) + 0.03, ssZ);
        mctx.envGroup.add(ss);
      }
    }

    // Bookshelf ruins (2)
    for (let i = 0; i < 2; i++) {
      const shelfGroup = new THREE.Group();
      const frameGeo = new THREE.BoxGeometry(1.0, 2.0, 0.3);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 1.0;
      shelfGroup.add(frame);
      for (let b = 0; b < 6; b++) {
        const bookGeo = new THREE.BoxGeometry(0.08 + Math.random() * 0.05, 0.2 + Math.random() * 0.1, 0.2);
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x224466 + Math.floor(Math.random() * 0x443322), roughness: 0.8 });
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(-0.3 + b * 0.12, 0.5 + Math.floor(b / 3) * 0.6, 0);
        if (Math.random() > 0.6) book.rotation.z = (Math.random() - 0.5) * 0.5;
        shelfGroup.add(book);
      }
      const fallenGeo = new THREE.BoxGeometry(0.1, 0.22, 0.18);
      const fallenMat = new THREE.MeshStandardMaterial({ color: 0x663322, roughness: 0.85 });
      const fallen = new THREE.Mesh(fallenGeo, fallenMat);
      fallen.position.set(0.3, 0.05, 0.3);
      fallen.rotation.z = Math.PI / 2;
      shelfGroup.add(fallen);
      const shX = (Math.random() - 0.5) * w * 0.5;
      const shZ = (Math.random() - 0.5) * d * 0.5;
      shelfGroup.position.set(shX, getTerrainHeight(shX, shZ), shZ);
      shelfGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(shelfGroup);
    }

    // Elven banners (4)
    for (let i = 0; i < 4; i++) {
      const bannerGroup = new THREE.Group();
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 4.0, 23);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4, roughness: 0.5 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.0;
      bannerGroup.add(pole);
      const clothGeo = new THREE.BoxGeometry(0.6, 1.2, 0.02);
      const clothMat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x3355aa : 0xaabbcc, roughness: 0.8, side: THREE.DoubleSide });
      const cloth = new THREE.Mesh(clothGeo, clothMat);
      cloth.position.set(0.32, 3.2, 0);
      bannerGroup.add(cloth);
      const bnX = (Math.random() - 0.5) * w * 0.7;
      const bnZ = (Math.random() - 0.5) * d * 0.7;
      bannerGroup.position.set(bnX, getTerrainHeight(bnX, bnZ), bnZ);
      mctx.envGroup.add(bannerGroup);
    }

    // Moonwell / enchanted pool (1)
    const moonwellGrp = new THREE.Group();
    const mwRim = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 27, 44),
      new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.4, metalness: 0.3 }));
    mwRim.rotation.x = -Math.PI / 2;
    mwRim.position.y = 0.2;
    moonwellGrp.add(mwRim);
    const mwWater = new THREE.Mesh(new THREE.CircleGeometry(1.8, 44),
      new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 }));
    mwWater.rotation.x = -Math.PI / 2;
    mwWater.position.y = 0.1;
    moonwellGrp.add(mwWater);
    const mwLight = new THREE.PointLight(0x4488ff, 2, 12);
    mwLight.position.y = 1;
    moonwellGrp.add(mwLight);
    mctx.torchLights.push(mwLight);
    // Rune symbols around the rim
    for (let r = 0; r < 8; r++) {
      const runeAng = (r / 8) * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 1.0 }));
      rune.position.set(Math.cos(runeAng) * 2.2, 0.35, Math.sin(runeAng) * 2.2);
      rune.lookAt(new THREE.Vector3(0, 0.35, 0));
      moonwellGrp.add(rune);
    }
    moonwellGrp.position.set(w * 0.15, getTerrainHeight(w * 0.15, -d * 0.15), -d * 0.15);
    mctx.envGroup.add(moonwellGrp);

    // Glowing vines on trees (10)
    const vineGlowMat = new THREE.MeshStandardMaterial({ color: 0x44dd88, emissive: 0x22aa44, emissiveIntensity: 0.5, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const vineGrp = new THREE.Group();
      const vineLen = 1.5 + Math.random() * 2;
      for (let v = 0; v < 6; v++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, vineLen / 6, 17), vineGlowMat);
        seg.position.y = 3 - v * (vineLen / 6);
        seg.position.x = Math.sin(v * 0.5) * 0.1;
        vineGrp.add(seg);
      }
      // Glowing bud at end
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.04, 36, 17),
        new THREE.MeshStandardMaterial({ color: 0x88ffbb, emissive: 0x44dd88, emissiveIntensity: 1.5 }));
      bud.position.y = 3 - vineLen;
      vineGrp.add(bud);
      vineGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(vineGrp);
    }

    // Elven gazebo / pavilion (1)
    const gazGrp = new THREE.Group();
    const gazPillarMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.2 });
    for (let p = 0; p < 6; p++) {
      const gazAng = (p / 6) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 23), gazPillarMat);
      pillar.position.set(Math.cos(gazAng) * 2, 1.5, Math.sin(gazAng) * 2);
      pillar.castShadow = true;
      gazGrp.add(pillar);
    }
    const gazRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 23),
      new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.5, transparent: true, opacity: 0.7 }));
    gazRoof.position.y = 3.75;
    gazGrp.add(gazRoof);
    const gazFloor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 36),
      new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.5 }));
    gazFloor.rotation.x = -Math.PI / 2;
    gazFloor.position.y = 0.02;
    gazGrp.add(gazFloor);
    gazGrp.position.set(-w * 0.2, 0, d * 0.15);
    mctx.envGroup.add(gazGrp);

    // Butterflies / pixie lights (20) with trails
    for (let i = 0; i < 20; i++) {
      const pixieColor = [0xffdd44, 0xff88dd, 0x44ddff, 0xaaffaa, 0xddaaff][i % 5];
      const pixieEmissive = [0xaa8822, 0xaa4488, 0x2288aa, 0x55aa55, 0x8855aa][i % 5];
      const pixieGrp = new THREE.Group();
      const pixie = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16),
        new THREE.MeshStandardMaterial({
          color: pixieColor, emissive: pixieEmissive,
          emissiveIntensity: 1.2, transparent: true, opacity: 0.7,
        }));
      pixieGrp.add(pixie);
      // Tiny wings
      for (const ws of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02),
          new THREE.MeshStandardMaterial({ color: pixieColor, emissive: pixieEmissive, emissiveIntensity: 0.5, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
        wing.position.set(ws * 0.03, 0.01, 0);
        wing.rotation.z = ws * 0.5;
        pixieGrp.add(wing);
      }
      // Sparkle trail
      for (let t = 0; t < 3; t++) {
        const trail = new THREE.Mesh(new THREE.SphereGeometry(0.01, 16, 8),
          new THREE.MeshStandardMaterial({ color: pixieColor, emissive: pixieEmissive, emissiveIntensity: 0.8, transparent: true, opacity: 0.3 - t * 0.08 }));
        trail.position.set((Math.random() - 0.5) * 0.1, -t * 0.08, (Math.random() - 0.5) * 0.1);
        pixieGrp.add(trail);
      }
      pixieGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(pixieGrp);
    }

    // Ethereal mist layers (8) - floating at various heights
    for (let i = 0; i < 8; i++) {
      const mistGeo = new THREE.PlaneGeometry(5 + Math.random() * 6, 5 + Math.random() * 6);
      const mistMat = new THREE.MeshStandardMaterial({ color: 0x6688bb, transparent: true, opacity: 0.04 + Math.random() * 0.03, roughness: 1.0, side: THREE.DoubleSide });
      const mist = new THREE.Mesh(mistGeo, mistMat);
      mist.rotation.x = -Math.PI / 2;
      mist.position.set((Math.random() - 0.5) * w * 0.7, 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(mist);
    }

    // Floating magical particles (25) - ambient sparkles
    for (let i = 0; i < 25; i++) {
      const sparkColor = [0x88ccff, 0xaaddff, 0x66bbee, 0xccddff][i % 4];
      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 8),
        new THREE.MeshStandardMaterial({ color: sparkColor, emissive: sparkColor, emissiveIntensity: 1.0, transparent: true, opacity: 0.4 }));
      sparkle.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.5 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(sparkle);
    }

    // Ancient tree roots above ground (10)
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
      const rootGrp = new THREE.Group();
      const numRoots = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < numRoots; r++) {
        const rootLen = 1 + Math.random() * 2;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, rootLen, 20), rootMat);
        root.rotation.z = Math.PI / 2 - 0.3;
        root.rotation.y = (r / numRoots) * Math.PI * 2;
        root.position.y = 0.1;
        rootGrp.add(root);
      }
      rootGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(rootGrp);
    }

    // Elvish wind chimes (4)
    for (let i = 0; i < 4; i++) {
      const chimeGrp = new THREE.Group();
      const chimeMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.6, roughness: 0.2 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 17, 27), chimeMat);
      chimeGrp.add(ring);
      for (let c = 0; c < 5; c++) {
        const chime = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15 + c * 0.03, 17), chimeMat);
        chime.position.set((c - 2) * 0.05, -0.12, 0);
        chimeGrp.add(chime);
      }
      chimeGrp.position.set(
        (Math.random() - 0.5) * w * 0.6,
        3 + Math.random() * 1.5,
        (Math.random() - 0.5) * d * 0.6
      );
      mctx.envGroup.add(chimeGrp);
    }
}

export function buildNecropolis(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x110815, 0.025);
    mctx.applyTerrainColors(0x121218, 0x22222c, 0.4);
    mctx.dirLight.color.setHex(0x554466);
    mctx.dirLight.intensity = 0.3;
    mctx.ambientLight.color.setHex(0x130a18);
    mctx.ambientLight.intensity = 0.35;
    mctx.hemiLight.color.setHex(0x221133);
    mctx.hemiLight.groundColor.setHex(0x110808);

    // Pillars (28) with capitals, bases, and crack details
    for (let i = 0; i < 28; i++) {
      const pilGrp = new THREE.Group();
      const pilH = 4 + Math.random() * 3;
      const pilR = 0.35 + Math.random() * 0.15;
      const pilMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7, metalness: 0.1 });
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(pilR * 0.9, pilR, pilH, 27), pilMat);
      pil.position.y = pilH / 2;
      pil.castShadow = true;
      pilGrp.add(pil);
      // Capital
      const capM = new THREE.Mesh(new THREE.CylinderGeometry(pilR * 1.3, pilR * 0.9, 0.3, 27), pilMat);
      capM.position.y = pilH;
      pilGrp.add(capM);
      // Base
      const baseM = new THREE.Mesh(new THREE.CylinderGeometry(pilR, pilR * 1.3, 0.3, 27), pilMat);
      baseM.position.y = 0.15;
      pilGrp.add(baseM);
      // Crack detail
      if (Math.random() > 0.4) {
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.05, pilH * 0.4),
          new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 1.0, side: THREE.DoubleSide }));
        const crAng = Math.random() * Math.PI * 2;
        crack.position.set(Math.cos(crAng) * pilR * 0.95, pilH * 0.3 + Math.random() * pilH * 0.3, Math.sin(crAng) * pilR * 0.95);
        crack.lookAt(new THREE.Vector3(0, crack.position.y, 0));
        pilGrp.add(crack);
      }
      const px = (Math.random() - 0.5) * w * 0.8;
      const pz = (Math.random() - 0.5) * d * 0.8;
      pilGrp.position.set(px, getTerrainHeight(px, pz, 0.4), pz);
      mctx.envGroup.add(pilGrp);
    }

    // Walls with exposed brickwork (20 segments)
    for (let i = 0; i < 20; i++) {
      const wallGrp = new THREE.Group();
      const wallH = 3 + Math.random() * 2;
      const wallW = 4 + Math.random() * 4;
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.8 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 0.5), wallMat);
      wall.position.y = wallH / 2;
      wall.castShadow = true;
      wallGrp.add(wall);
      // Exposed brickwork patches
      for (let bk = 0; bk < 3 + Math.floor(Math.random() * 4); bk++) {
        const brick = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.15, 0.1 + Math.random() * 0.05, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x553333 + Math.floor(Math.random() * 0x111100), roughness: 0.9 }));
        brick.position.set((Math.random() - 0.5) * wallW * 0.7, Math.random() * wallH, 0.28);
        wallGrp.add(brick);
      }
      // Dripping water stains
      if (Math.random() > 0.6) {
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.8 + Math.random() * 0.5),
          new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.3, roughness: 0.5, side: THREE.DoubleSide }));
        stain.position.set((Math.random() - 0.5) * wallW * 0.5, wallH * 0.3, 0.26);
        wallGrp.add(stain);
      }
      // Cracked stone detail - thin overlapping dark boxes on wall surface
      const crackStoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 1.0 });
      for (let cs = 0; cs < 4 + Math.floor(Math.random() * 3); cs++) {
        const crackW2 = 0.08 + Math.random() * 0.12;
        const crackH2 = 0.3 + Math.random() * 0.5;
        const crackStone = new THREE.Mesh(new THREE.BoxGeometry(crackW2, crackH2, 0.04), crackStoneMat);
        crackStone.position.set(
          (Math.random() - 0.5) * wallW * 0.8,
          0.3 + Math.random() * (wallH - 0.6),
          0.27 + Math.random() * 0.02
        );
        crackStone.rotation.z = (Math.random() - 0.5) * 0.4;
        wallGrp.add(crackStone);
      }
      // Iron gate bars inset into wall gaps
      if (Math.random() > 0.5) {
        const gateBarMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7, roughness: 0.3 });
        const gateOffset = (Math.random() - 0.5) * wallW * 0.4;
        for (let gb = 0; gb < 4; gb++) {
          const gateBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, wallH * 0.6, 12), gateBarMat);
          gateBar.position.set(gateOffset + gb * 0.08 - 0.12, wallH * 0.35, 0.27);
          wallGrp.add(gateBar);
        }
        const gateHBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 12), gateBarMat);
        gateHBar.rotation.z = Math.PI / 2;
        gateHBar.position.set(gateOffset, wallH * 0.4, 0.27);
        wallGrp.add(gateHBar);
      }
      // Gargoyle perch on wall (sphere head + cone body)
      if (Math.random() > 0.6) {
        const gargoyleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.8 });
        const gargX = (Math.random() - 0.5) * wallW * 0.5;
        const gargY = wallH * 0.8;
        const gargDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 });
        // Detailed head (higher poly sphere)
        const gargHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 18), gargoyleMat);
        gargHead.position.set(gargX, gargY + 0.15, 0.38);
        gargHead.rotation.x = -0.15;
        wallGrp.add(gargHead);
        // Horns
        for (const necroHornSide of [-1, 1]) {
          const necroHorn = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 8), gargoyleMat);
          necroHorn.position.set(gargX + necroHornSide * 0.04, gargY + 0.22, 0.36);
          necroHorn.rotation.z = necroHornSide * 0.4;
          necroHorn.rotation.x = -0.2;
          wallGrp.add(necroHorn);
        }
        // Pointed ears
        for (const necroEarSide of [-1, 1]) {
          const necroEar = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), gargoyleMat);
          necroEar.position.set(gargX + necroEarSide * 0.07, gargY + 0.17, 0.37);
          necroEar.rotation.z = necroEarSide * 0.7;
          wallGrp.add(necroEar);
        }
        // Snout/beak
        const gargSnout = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 8), gargoyleMat);
        gargSnout.position.set(gargX, gargY + 0.13, 0.44);
        gargSnout.rotation.x = -Math.PI / 2;
        wallGrp.add(gargSnout);
        // Eye sockets
        for (const necroEyeSide of [-1, 1]) {
          const necroEye = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), gargDarkMat);
          necroEye.position.set(gargX + necroEyeSide * 0.03, gargY + 0.17, 0.42);
          wallGrp.add(necroEye);
        }
        // Body (higher poly, hunched)
        const gargBody = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 16), gargoyleMat);
        gargBody.position.set(gargX, gargY, 0.35);
        gargBody.rotation.x = -0.1;
        wallGrp.add(gargBody);
        // Folded wings
        for (const necroWingSide of [-1, 1]) {
          const necroWing = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), gargoyleMat);
          necroWing.position.set(gargX + necroWingSide * 0.08, gargY + 0.06, 0.34);
          necroWing.rotation.y = necroWingSide * 0.3;
          necroWing.rotation.z = necroWingSide * 0.5;
          wallGrp.add(necroWing);
          const necroWingRidge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.015), gargoyleMat);
          necroWingRidge.position.set(gargX + necroWingSide * 0.1, gargY + 0.08, 0.34);
          necroWingRidge.rotation.z = necroWingSide * 0.6;
          wallGrp.add(necroWingRidge);
        }
        // Clawed feet
        for (const necroFootSide of [-1, 1]) {
          for (let necroClawIdx = 0; necroClawIdx < 3; necroClawIdx++) {
            const necroClaw = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 6), gargoyleMat);
            necroClaw.position.set(gargX + necroFootSide * 0.04 + (necroClawIdx - 1) * 0.012, gargY - 0.11, 0.36 + necroClawIdx * 0.005);
            necroClaw.rotation.x = Math.PI;
            wallGrp.add(necroClaw);
          }
        }
        const perchBracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.12), gargoyleMat);
        perchBracket.position.set(gargX, gargY - 0.08, 0.32);
        wallGrp.add(perchBracket);
      }
      // Crumbling edges - varied size blocks, dust piles, exposed brick, hanging pieces
      const crumbleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.9 });
      const crumbleMatLight = new THREE.MeshStandardMaterial({ color: 0x353540, roughness: 0.85 });
      // Larger fallen blocks at wall top
      for (let ce = 0; ce < 2 + Math.floor(Math.random() * 2); ce++) {
        const bigBlock = new THREE.Mesh(new THREE.BoxGeometry(0.18 + Math.random() * 0.15, 0.12 + Math.random() * 0.1, 0.14),
          crumbleMat);
        bigBlock.position.set(
          (Math.random() - 0.5) * wallW * 0.9,
          wallH + (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.3
        );
        bigBlock.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
        wallGrp.add(bigBlock);
      }
      // Smaller debris pieces scattered on top and falling
      for (let sd = 0; sd < 4 + Math.floor(Math.random() * 4); sd++) {
        const smallDebris = new THREE.Mesh(new THREE.BoxGeometry(0.06 + Math.random() * 0.06, 0.04 + Math.random() * 0.04, 0.06),
          crumbleMatLight);
        smallDebris.position.set(
          (Math.random() - 0.5) * wallW * 0.9,
          wallH + (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.35
        );
        smallDebris.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
        wallGrp.add(smallDebris);
      }
      // Pieces still partially attached (angled, hanging from wall top)
      for (let ha = 0; ha < 1 + Math.floor(Math.random() * 2); ha++) {
        const hangBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.12), crumbleMat);
        hangBlock.position.set(
          (Math.random() - 0.5) * wallW * 0.8,
          wallH - 0.05,
          0.28 + Math.random() * 0.1
        );
        hangBlock.rotation.z = 0.3 + Math.random() * 0.4;
        hangBlock.rotation.x = Math.random() * 0.3;
        wallGrp.add(hangBlock);
      }
      // Fallen blocks at base of wall
      for (let fb = 0; fb < 3 + Math.floor(Math.random() * 3); fb++) {
        const fallenSize = 0.06 + Math.random() * 0.12;
        const fallen = new THREE.Mesh(new THREE.BoxGeometry(fallenSize * 1.3, fallenSize, fallenSize), crumbleMat);
        fallen.position.set(
          (Math.random() - 0.5) * wallW * 0.6,
          fallenSize * 0.4,
          0.3 + Math.random() * 0.5
        );
        fallen.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
        wallGrp.add(fallen);
      }
      // Dust pile effect (higher poly, with debris particles and cobwebs)
      const necro_dustColors = [0x444450, 0x3d3d48, 0x4a4a56, 0x404048, 0x484855];
      for (let dp = 0; dp < 2; dp++) {
        const necro_dustColor = necro_dustColors[Math.floor(Math.random() * necro_dustColors.length)];
        const dustPile = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 16, 12),
          new THREE.MeshStandardMaterial({ color: necro_dustColor, roughness: 1.0, transparent: true, opacity: 0.35 }));
        const necro_dustX = (Math.random() - 0.5) * wallW * 0.5;
        const necro_dustZ = 0.3 + Math.random() * 0.3;
        dustPile.position.set(necro_dustX, 0.03, necro_dustZ);
        dustPile.scale.set(1.5, 0.2, 1.0);
        wallGrp.add(dustPile);
        // Scattered smaller debris particles around the main pile
        for (let necro_di = 0; necro_di < 4 + Math.floor(Math.random() * 3); necro_di++) {
          const necro_debrisSize = 0.02 + Math.random() * 0.03;
          const necro_debris = new THREE.Mesh(new THREE.SphereGeometry(necro_debrisSize, 8, 6),
            new THREE.MeshStandardMaterial({ color: necro_dustColors[Math.floor(Math.random() * necro_dustColors.length)], roughness: 1.0, transparent: true, opacity: 0.3 + Math.random() * 0.15 }));
          necro_debris.position.set(
            necro_dustX + (Math.random() - 0.5) * 0.35,
            0.01 + Math.random() * 0.02,
            necro_dustZ + (Math.random() - 0.5) * 0.25
          );
          necro_debris.scale.set(1.0 + Math.random() * 0.5, 0.3, 1.0 + Math.random() * 0.3);
          wallGrp.add(necro_debris);
        }
        // Cobweb strand connecting dust pile to wall
        if (Math.random() > 0.4) {
          const necro_webMat = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.12, side: THREE.DoubleSide, roughness: 0.3 });
          const necro_webW = 0.15 + Math.random() * 0.15;
          const necro_webH = 0.2 + Math.random() * 0.15;
          const necro_web = new THREE.Mesh(new THREE.PlaneGeometry(necro_webW, necro_webH), necro_webMat);
          necro_web.position.set(necro_dustX + (Math.random() - 0.5) * 0.1, 0.1 + Math.random() * 0.1, 0.27);
          necro_web.rotation.x = -0.3 + Math.random() * 0.6;
          wallGrp.add(necro_web);
          // Cross strand
          const necro_web2 = new THREE.Mesh(new THREE.PlaneGeometry(necro_webW * 0.6, necro_webH * 1.2), necro_webMat);
          necro_web2.position.set(necro_dustX + (Math.random() - 0.5) * 0.05, 0.12 + Math.random() * 0.08, 0.27);
          necro_web2.rotation.z = 0.5 + Math.random() * 0.5;
          wallGrp.add(necro_web2);
        }
      }
      // Exposed brick pattern on the crumble face
      for (let eb = 0; eb < 3 + Math.floor(Math.random() * 3); eb++) {
        const expBrick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.04), crumbleMatLight);
        expBrick.position.set(
          (Math.random() - 0.5) * wallW * 0.4,
          wallH - 0.1 - Math.random() * 0.2,
          0.27
        );
        wallGrp.add(expBrick);
      }
      const wx = (Math.random() - 0.5) * w * 0.7;
      const wz = (Math.random() - 0.5) * d * 0.7;
      wallGrp.position.set(wx, getTerrainHeight(wx, wz, 0.4), wz);
      wallGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(wallGrp);
    }

    // Rune-engraved floor tiles (18)
    const runeFloorMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.4, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    for (let i = 0; i < 18; i++) {
      const tileGrp = new THREE.Group();
      const tileSize = 1.5 + Math.random() * 1.0;
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), runeFloorMat);
      tile.rotation.x = -Math.PI / 2;
      tileGrp.add(tile);
      for (let r = 0; r < 4; r++) {
        const runeSymbol = new THREE.Mesh(new THREE.PlaneGeometry(0.06, tileSize * 0.3),
          new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x33cc33, emissiveIntensity: 0.6, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
        runeSymbol.rotation.x = -Math.PI / 2;
        runeSymbol.rotation.z = (r / 4) * Math.PI;
        runeSymbol.position.y = 0.01;
        tileGrp.add(runeSymbol);
      }
      const tX = (Math.random() - 0.5) * w * 0.8;
      const tZ = (Math.random() - 0.5) * d * 0.8;
      tileGrp.position.set(tX, getTerrainHeight(tX, tZ, 0.4) + 0.02, tZ);
      tileGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(tileGrp);
    }

    // Dripping water pools (6)
    for (let i = 0; i < 6; i++) {
      const poolGrp = new THREE.Group();
      const poolR = 0.3 + Math.random() * 0.4;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(poolR, 27),
        new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide }));
      pool.rotation.x = -Math.PI / 2;
      poolGrp.add(pool);
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.03, 17, 16),
        new THREE.MeshStandardMaterial({ color: 0x335566, transparent: true, opacity: 0.5, roughness: 0.1 }));
      droplet.position.y = 0.3 + Math.random() * 1.0;
      poolGrp.add(droplet);
      const dpX = (Math.random() - 0.5) * w * 0.7;
      const dpZ = (Math.random() - 0.5) * d * 0.7;
      poolGrp.position.set(dpX, getTerrainHeight(dpX, dpZ, 0.4), dpZ);
      mctx.envGroup.add(poolGrp);
    }

    // Skull piles (18)
    for (let i = 0; i < 18; i++) {
      const pile = new THREE.Group();
      const skullCount = 3 + Math.floor(Math.random() * 5);
      for (let s = 0; s < skullCount; s++) {
        const skullGeo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 23, 20);
        const skullMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.8 });
        const skull = new THREE.Mesh(skullGeo, skullMat);
        skull.position.set(
          (Math.random() - 0.5) * 0.6,
          0.1 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.6
        );
        pile.add(skull);
      }
      const pileX = (Math.random() - 0.5) * w * 0.8;
      const pileZ = (Math.random() - 0.5) * d * 0.8;
      pile.position.set(pileX, getTerrainHeight(pileX, pileZ, 0.4), pileZ);
      mctx.envGroup.add(pile);
    }

    // Glowing rune circles (12)
    for (let i = 0; i < 12; i++) {
      const runeColor = Math.random() > 0.5 ? 0x44ff44 : 0x9944ff;
      const torusGeo = new THREE.TorusGeometry(1.0 + Math.random() * 0.5, 0.05, 27, 44);
      const torusMat = new THREE.MeshStandardMaterial({
        color: runeColor,
        emissive: runeColor,
        emissiveIntensity: 1.5,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = -Math.PI / 2;
      const torusX = (Math.random() - 0.5) * w * 0.7;
      const torusZ = (Math.random() - 0.5) * d * 0.7;
      torus.position.set(torusX, getTerrainHeight(torusX, torusZ, 0.4) + 0.05, torusZ);
      mctx.envGroup.add(torus);
    }

    // Bone piles (15)
    for (let i = 0; i < 15; i++) {
      const bonePile = new THREE.Group();
      for (let b = 0; b < 6; b++) {
        const boneGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5 + Math.random() * 0.3, 20);
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.9 });
        const bone = new THREE.Mesh(boneGeo, boneMat);
        bone.position.set(
          (Math.random() - 0.5) * 0.5,
          0.1,
          (Math.random() - 0.5) * 0.5
        );
        bone.rotation.z = Math.random() * Math.PI;
        bone.rotation.y = Math.random() * Math.PI;
        bonePile.add(bone);
      }
      // Extra bone fragments scattered around the pile
      for (let f = 0; f < 3; f++) {
        const fragGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.15 + Math.random() * 0.12, 27);
        const fragMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.9 });
        const frag = new THREE.Mesh(fragGeo, fragMat);
        frag.position.set(
          (Math.random() - 0.5) * 0.8,
          0.02,
          (Math.random() - 0.5) * 0.8
        );
        frag.rotation.z = Math.random() * Math.PI;
        frag.rotation.x = Math.random() * 0.4;
        bonePile.add(frag);
      }
      // Detailed bone pile: small spheres as joint knobs and skull fragments
      for (let bk = 0; bk < 2 + Math.floor(Math.random() * 3); bk++) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.015, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.9 }));
        knob.position.set(
          (Math.random() - 0.5) * 0.6,
          0.03 + Math.random() * 0.08,
          (Math.random() - 0.5) * 0.6
        );
        bonePile.add(knob);
      }
      // Rib-cage arcs near bones
      if (Math.random() > 0.5) {
        for (let rb = 0; rb < 3; rb++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 10, Math.PI * 0.7),
            new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.9 }));
          rib.position.set((Math.random() - 0.5) * 0.3, 0.04, (Math.random() - 0.5) * 0.3);
          rib.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
          bonePile.add(rib);
        }
      }
      const bpX = (Math.random() - 0.5) * w * 0.8;
      const bpZ = (Math.random() - 0.5) * d * 0.8;
      bonePile.position.set(bpX, getTerrainHeight(bpX, bpZ, 0.4), bpZ);
      mctx.envGroup.add(bonePile);
    }

    // Coffins (12) with lid details, carved borders, handles, cracks
    const necro_coffinHandleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 12; i++) {
      const coffin = new THREE.Group();
      const baseGeo = new THREE.BoxGeometry(0.8, 0.4, 2.0);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
      const cBase = new THREE.Mesh(baseGeo, baseMat);
      cBase.position.y = 0.2;
      coffin.add(cBase);
      // Carved border around base
      const necro_cofBorderMat = new THREE.MeshStandardMaterial({ color: 0x2e2010, roughness: 0.85 });
      for (const necro_bdrZ of [-1.0, 1.0]) {
        const necro_borderEndH = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.04), necro_cofBorderMat);
        necro_borderEndH.position.set(0, 0.38, necro_bdrZ);
        coffin.add(necro_borderEndH);
      }
      for (const necro_bdrX of [-0.4, 0.4]) {
        const necro_borderSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 2.04), necro_cofBorderMat);
        necro_borderSide.position.set(necro_bdrX, 0.38, 0);
        coffin.add(necro_borderSide);
      }

      const lidGeo = new THREE.BoxGeometry(0.85, 0.1, 2.05);
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.85 });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.y = 0.45;
      if (Math.random() > 0.5) {
        lid.rotation.z = 0.3;
        lid.position.x = 0.2;
      }
      coffin.add(lid);
      // Coffin lid rune/cross detail (raised thin boxes)
      const cofRuneMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8, metalness: 0.15 });
      const cofCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.8), cofRuneMat);
      cofCrossV.position.set(lid.position.x, 0.52, 0);
      coffin.add(cofCrossV);
      const cofCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), cofRuneMat);
      cofCrossH.position.set(lid.position.x, 0.52, -0.15);
      coffin.add(cofCrossH);
      // Coffin nail heads (more)
      for (let cn = 0; cn < 4; cn++) {
        const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), necro_coffinHandleMat);
        nail.position.set((cn < 2 ? -0.35 : 0.35), 0.46, cn % 2 === 0 ? -0.7 : 0.7);
        coffin.add(nail);
      }
      // Handles on sides
      for (const necro_handleSide of [-1, 1]) {
        const necro_handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI), necro_coffinHandleMat);
        necro_handle.position.set(necro_handleSide * 0.42, 0.25, 0);
        necro_handle.rotation.y = Math.PI / 2;
        necro_handle.rotation.z = Math.PI / 2;
        coffin.add(necro_handle);
        // Handle mount plate
        const necro_handlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.06), necro_coffinHandleMat);
        necro_handlePlate.position.set(necro_handleSide * 0.41, 0.25, 0);
        coffin.add(necro_handlePlate);
      }
      // Cracks on coffin body
      for (let necro_crackIdx = 0; necro_crackIdx < 1 + Math.floor(Math.random() * 2); necro_crackIdx++) {
        const necro_crackMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1.0 });
        const necro_crackLen = 0.15 + Math.random() * 0.2;
        const necro_crack = new THREE.Mesh(new THREE.PlaneGeometry(0.01, necro_crackLen), necro_crackMat);
        necro_crack.position.set(
          (Math.random() > 0.5 ? 0.405 : -0.405),
          0.15 + Math.random() * 0.2,
          (Math.random() - 0.5) * 1.5
        );
        necro_crack.rotation.y = Math.PI / 2;
        necro_crack.rotation.z = (Math.random() - 0.5) * 0.4;
        coffin.add(necro_crack);
      }

      const cofX = (Math.random() - 0.5) * w * 0.7;
      const cofZ = (Math.random() - 0.5) * d * 0.7;
      coffin.position.set(cofX, getTerrainHeight(cofX, cofZ, 0.4), cofZ);
      coffin.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(coffin);
    }

    // Torch brackets with flickering point lights (14)
    for (let i = 0; i < 14; i++) {
      const torch = new THREE.Group();
      const bracketGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 23);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.y = 2.0;
      torch.add(bracket);

      // Torch sconce bracket detail - wall mount plate and arm
      const sconcePlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.03), bracketMat);
      sconcePlate.position.set(0, 1.7, 0);
      torch.add(sconcePlate);
      const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), bracketMat);
      sconceArm.rotation.z = Math.PI / 3;
      sconceArm.position.set(0.08, 1.85, 0);
      torch.add(sconceArm);
      // Iron ring at top of bracket
      const sconceRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 12), bracketMat);
      sconceRing.position.set(0, 2.32, 0);
      torch.add(sconceRing);
      const flameGeo = new THREE.SphereGeometry(0.12, 31, 20);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 2.0,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 2.35;
      torch.add(flame);

      const tLight = new THREE.PointLight(0xff6622, 1.2, 12);
      tLight.position.set(
        (Math.random() - 0.5) * w * 0.8,
        2.35,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.scene.add(tLight);
      mctx.torchLights.push(tLight);

      // Soot marks around the torch bracket
      for (let sm = 0; sm < 2; sm++) {
        const sootGeo = new THREE.CircleGeometry(0.08 + Math.random() * 0.06, 27);
        const sootMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.3, roughness: 1.0, side: THREE.DoubleSide });
        const soot = new THREE.Mesh(sootGeo, sootMat);
        soot.position.set(
          (Math.random() - 0.5) * 0.2,
          2.0 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.15
        );
        soot.rotation.x = (Math.random() - 0.5) * 0.5;
        soot.rotation.y = Math.random() * Math.PI;
        torch.add(soot);
      }
      torch.position.set(tLight.position.x, getTerrainHeight(tLight.position.x, tLight.position.z, 0.4), tLight.position.z);
      mctx.envGroup.add(torch);
    }

    // Iron maidens (2)
    for (let i = 0; i < 2; i++) {
      const imGroup = new THREE.Group();
      const imBodyGeo = new THREE.BoxGeometry(0.8, 2.0, 0.6);
      const imMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6, roughness: 0.4 });
      const imBody = new THREE.Mesh(imBodyGeo, imMat);
      imBody.position.y = 1.0;
      imGroup.add(imBody);
      const imDoorGeo = new THREE.BoxGeometry(0.7, 1.8, 0.05);
      const imDoor = new THREE.Mesh(imDoorGeo, imMat);
      imDoor.position.set(0.35, 1.0, 0.3);
      imDoor.rotation.y = 0.4;
      imGroup.add(imDoor);
      for (let sp = 0; sp < 5; sp++) {
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.15, 17);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.7, roughness: 0.3 });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set((Math.random() - 0.5) * 0.5, 0.5 + sp * 0.3, -0.25);
        spike.rotation.x = Math.PI / 2;
        imGroup.add(spike);
      }
      const imX = (Math.random() - 0.5) * w * 0.6;
      const imZ = (Math.random() - 0.5) * d * 0.6;
      imGroup.position.set(imX, getTerrainHeight(imX, imZ, 0.4), imZ);
      imGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(imGroup);
    }

    // Chains hanging from ceiling (16)
    for (let i = 0; i < 16; i++) {
      const chainGroup = new THREE.Group();
      const chainLen = 2 + Math.random() * 3;
      const segments = 4 + Math.floor(Math.random() * 4);
      const segH = chainLen / segments;
      // Anchor plate at ceiling attachment point
      const anchorGeo = new THREE.BoxGeometry(0.14, 0.04, 0.14);
      const anchorMat = new THREE.MeshStandardMaterial({ color: 0x554433, metalness: 0.5, roughness: 0.7 });
      const anchor = new THREE.Mesh(anchorGeo, anchorMat);
      anchor.position.y = 6;
      chainGroup.add(anchor);
      // Alternating chain links: vertical torus + horizontal torus with rusty color variation
      const rustColors = [0x7a6655, 0x6b5544, 0x886655, 0x554433, 0x998877];
      for (let s = 0; s < segments; s++) {
        const linkColor = rustColors[Math.floor(Math.random() * rustColors.length)];
        const linkMat = new THREE.MeshStandardMaterial({ color: linkColor, metalness: 0.55, roughness: 0.65 });
        const linkGeo = new THREE.TorusGeometry(0.045, 0.014, 8, 14);
        const link = new THREE.Mesh(linkGeo, linkMat);
        link.position.y = 6 - (s + 0.5) * segH;
        // Alternate between vertical and horizontal orientation
        if (s % 2 === 0) {
          link.rotation.x = Math.PI / 2;
        } else {
          link.rotation.y = Math.PI / 2;
        }
        chainGroup.add(link);
      }
      // Shackle at bottom: sphere + cone hook
      const shackleSphGeo = new THREE.SphereGeometry(0.055, 10, 8);
      const shackleMat = new THREE.MeshStandardMaterial({ color: 0x554433, metalness: 0.5, roughness: 0.7 });
      const shackleSph = new THREE.Mesh(shackleSphGeo, shackleMat);
      shackleSph.position.y = 6 - chainLen - 0.06;
      chainGroup.add(shackleSph);
      const hookGeo = new THREE.ConeGeometry(0.03, 0.12, 8);
      const hook = new THREE.Mesh(hookGeo, shackleMat);
      hook.position.y = 6 - chainLen - 0.18;
      hook.rotation.z = Math.PI / 6;
      chainGroup.add(hook);
      const chX = (Math.random() - 0.5) * w * 0.7;
      const chZ = (Math.random() - 0.5) * d * 0.7;
      chainGroup.position.set(chX, getTerrainHeight(chX, chZ, 0.4), chZ);
      mctx.envGroup.add(chainGroup);
    }

    // Rat swarms (5)
    for (let i = 0; i < 5; i++) {
      const ratGroup = new THREE.Group();
      const ratCount = 3 + Math.floor(Math.random() * 2);
      const ratBodyColors = [0x2a1a0a, 0x3a3030, 0x1a1a1a, 0x2a2218, 0x181010];
      for (let r = 0; r < ratCount; r++) {
        const ratSingleGroup = new THREE.Group();
        const rOffX = (Math.random() - 0.5) * 0.5;
        const rOffZ = (Math.random() - 0.5) * 0.5;
        const bodyColor = ratBodyColors[Math.floor(Math.random() * ratBodyColors.length)];
        const ratMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
        // Elongated body
        const bodyGeo = new THREE.SphereGeometry(0.06, 10, 8);
        const body = new THREE.Mesh(bodyGeo, ratMat);
        body.scale.set(1, 0.55, 1.7);
        body.position.set(rOffX, 0.033, rOffZ);
        ratSingleGroup.add(body);
        // Small head with snout (cone)
        const headGeo = new THREE.SphereGeometry(0.038, 8, 7);
        const head = new THREE.Mesh(headGeo, ratMat);
        head.position.set(rOffX, 0.05, rOffZ + 0.09);
        ratSingleGroup.add(head);
        const snoutGeo = new THREE.ConeGeometry(0.016, 0.035, 6);
        const snout = new THREE.Mesh(snoutGeo, ratMat);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(rOffX, 0.048, rOffZ + 0.126);
        ratSingleGroup.add(snout);
        // Tiny ears
        const earGeo = new THREE.SphereGeometry(0.012, 6, 5);
        const earL = new THREE.Mesh(earGeo, ratMat);
        earL.position.set(rOffX - 0.022, 0.075, rOffZ + 0.068);
        ratSingleGroup.add(earL);
        const earR = new THREE.Mesh(earGeo, ratMat);
        earR.position.set(rOffX + 0.022, 0.075, rOffZ + 0.068);
        ratSingleGroup.add(earR);
        // Long thin tail (tapered cylinder, slightly offset for curve illusion)
        const tailGeo = new THREE.CylinderGeometry(0.004, 0.009, 0.12, 5);
        const tail = new THREE.Mesh(tailGeo, ratMat);
        tail.rotation.x = Math.PI / 2;
        tail.rotation.z = (Math.random() - 0.5) * 0.4;
        tail.position.set(rOffX + (Math.random() - 0.5) * 0.02, 0.022, rOffZ - 0.14);
        ratSingleGroup.add(tail);
        // 4 tiny leg nubs
        const legPositions = [[-0.03, -0.05], [0.03, -0.05], [-0.03, 0.04], [0.03, 0.04]];
        const legGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.028, 5);
        for (const [lx, lz] of legPositions) {
          const leg = new THREE.Mesh(legGeo, ratMat);
          leg.position.set(rOffX + lx, 0.006, rOffZ + lz);
          ratSingleGroup.add(leg);
        }
        ratSingleGroup.rotation.y = Math.random() * Math.PI * 2;
        ratGroup.add(ratSingleGroup);
      }
      const ratX = (Math.random() - 0.5) * w * 0.8;
      const ratZ = (Math.random() - 0.5) * d * 0.8;
      ratGroup.position.set(ratX, getTerrainHeight(ratX, ratZ, 0.4), ratZ);
      mctx.envGroup.add(ratGroup);
    }

    // Blood pools (6)
    for (let i = 0; i < 6; i++) {
      const bpRadius = 0.5 + Math.random();
      const bpGroup = new THREE.Group();
      const bpX2 = (Math.random() - 0.5) * w * 0.7;
      const bpZ2 = (Math.random() - 0.5) * d * 0.7;
      const bpY = getTerrainHeight(bpX2, bpZ2, 0.4) + 0.01;
      bpGroup.position.set(bpX2, bpY, bpZ2);
      // Irregular shape via multiple overlapping circles at slightly offset positions
      const poolOffsets = [
        [0, 0, bpRadius, 0x660000, 0.85],
        [(Math.random() - 0.5) * bpRadius * 0.5, (Math.random() - 0.5) * bpRadius * 0.5, bpRadius * 0.8, 0x770000, 0.75],
        [(Math.random() - 0.5) * bpRadius * 0.4, (Math.random() - 0.5) * bpRadius * 0.4, bpRadius * 0.6, 0x550000, 0.9],
      ];
      for (const [ox, oz, rad, col, op] of poolOffsets) {
        const circGeo = new THREE.CircleGeometry(rad as number, 30);
        const circMat = new THREE.MeshStandardMaterial({ color: col as number, transparent: true, opacity: op as number, roughness: 0.95, depthWrite: false });
        const circ = new THREE.Mesh(circGeo, circMat);
        circ.rotation.x = -Math.PI / 2;
        circ.position.set(ox as number, 0.002, oz as number);
        bpGroup.add(circ);
      }
      // Darker center circle
      const centerGeo = new THREE.CircleGeometry(bpRadius * 0.35, 20);
      const centerMat = new THREE.MeshStandardMaterial({ color: 0x330000, transparent: true, opacity: 0.95, roughness: 0.99, depthWrite: false });
      const centerCirc = new THREE.Mesh(centerGeo, centerMat);
      centerCirc.rotation.x = -Math.PI / 2;
      centerCirc.position.set(0, 0.004, 0);
      bpGroup.add(centerCirc);
      // Congealing edge torus ring
      const edgeTorusGeo = new THREE.TorusGeometry(bpRadius * 0.9, 0.035, 5, 28);
      const edgeTorusMat = new THREE.MeshStandardMaterial({ color: 0x440000, transparent: true, opacity: 0.45, roughness: 0.99, depthWrite: false });
      const edgeTorus = new THREE.Mesh(edgeTorusGeo, edgeTorusMat);
      edgeTorus.rotation.x = Math.PI / 2;
      edgeTorus.position.y = 0.005;
      bpGroup.add(edgeTorus);
      // Blood splatter trails (thin elongated boxes at varied angles)
      for (let sp = 0; sp < 3; sp++) {
        const splAngle = Math.random() * Math.PI * 2;
        const splLen = 0.3 + Math.random() * 0.5;
        const splGeo = new THREE.BoxGeometry(0.04, 0.003, splLen);
        const splMat = new THREE.MeshStandardMaterial({ color: 0x660000, transparent: true, opacity: 0.7, roughness: 0.95, depthWrite: false });
        const spl = new THREE.Mesh(splGeo, splMat);
        spl.rotation.y = splAngle;
        spl.position.set(Math.cos(splAngle) * (bpRadius + splLen * 0.4), 0.003, Math.sin(splAngle) * (bpRadius + splLen * 0.4));
        bpGroup.add(spl);
      }
      // Occasional bloody handprint (5 tiny finger cylinders in arc + small palm sphere)
      if (Math.random() < 0.5) {
        const handAngle = Math.random() * Math.PI * 2;
        const handDist = bpRadius * 0.7;
        const palmGeo = new THREE.SphereGeometry(0.045, 6, 5);
        const palmMat = new THREE.MeshStandardMaterial({ color: 0x770000, transparent: true, opacity: 0.8, roughness: 0.95 });
        const palm = new THREE.Mesh(palmGeo, palmMat);
        palm.scale.set(1, 0.15, 1);
        palm.position.set(Math.cos(handAngle) * handDist, 0.005, Math.sin(handAngle) * handDist);
        bpGroup.add(palm);
        for (let fi = 0; fi < 5; fi++) {
          const fingerAngle = handAngle + (fi - 2) * 0.22;
          const fingerGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5);
          const finger = new THREE.Mesh(fingerGeo, palmMat);
          finger.rotation.x = Math.PI / 2;
          finger.rotation.z = fingerAngle;
          finger.position.set(
            Math.cos(handAngle) * handDist + Math.cos(fingerAngle) * 0.07,
            0.005,
            Math.sin(handAngle) * handDist + Math.sin(fingerAngle) * 0.07
          );
          bpGroup.add(finger);
        }
      }
      mctx.envGroup.add(bpGroup);
    }

    // Skeleton remains (8) - decorative
    for (let i = 0; i < 8; i++) {
      const skelGroup = new THREE.Group();
      const skelMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
      const skelMatDark = new THREE.MeshStandardMaterial({ color: 0x111108, roughness: 0.95 });
      // Skull (upper sphere)
      const skullGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const sk = new THREE.Mesh(skullGeo, skelMat);
      sk.position.set(0, 0.1, 0);
      skelGroup.add(sk);
      // Jaw (lower half-sphere, flattened)
      const jawGeo = new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const jaw = new THREE.Mesh(jawGeo, skelMat);
      jaw.position.set(0, 0.052, 0.01);
      jaw.rotation.x = 0.2;
      skelGroup.add(jaw);
      // Eye socket indentations (dark small spheres)
      const eyeGeo = new THREE.SphereGeometry(0.022, 6, 5);
      const eyeL = new THREE.Mesh(eyeGeo, skelMatDark);
      eyeL.position.set(-0.038, 0.11, 0.082);
      skelGroup.add(eyeL);
      const eyeR = new THREE.Mesh(eyeGeo, skelMatDark);
      eyeR.position.set(0.038, 0.11, 0.082);
      skelGroup.add(eyeR);
      // Nose hole (tiny dark sphere)
      const noseGeo = new THREE.SphereGeometry(0.012, 5, 4);
      const nose = new THREE.Mesh(noseGeo, skelMatDark);
      nose.position.set(0, 0.087, 0.094);
      skelGroup.add(nose);
      // Spine column (series of small cylinders)
      for (let sp = 0; sp < 5; sp++) {
        const vertebraGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.045, 7);
        const vertebra = new THREE.Mesh(vertebraGeo, skelMat);
        vertebra.position.set(0, 0.04 - sp * 0.048, -0.02);
        vertebra.rotation.z = (Math.random() - 0.5) * 0.12;
        skelGroup.add(vertebra);
      }
      // Pelvis (flattened sphere)
      const pelvisGeo = new THREE.SphereGeometry(0.1, 8, 6);
      const pelvis = new THREE.Mesh(pelvisGeo, skelMat);
      pelvis.scale.set(1.1, 0.35, 0.75);
      pelvis.position.set(0, 0.02, -0.28);
      skelGroup.add(pelvis);
      // Ribs (angled slightly for realism)
      for (let rb = 0; rb < 4; rb++) {
        const ribGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.28 - rb * 0.02, 6);
        const rib = new THREE.Mesh(ribGeo, skelMat);
        rib.position.set(0.14, 0.04 - rb * 0.046, -0.06 - rb * 0.04);
        rib.rotation.z = Math.PI / 2;
        rib.rotation.x = (Math.random() - 0.5) * 0.25;
        skelGroup.add(rib);
      }
      // Scattered hand bones (tiny cylinders in fan pattern)
      const handBaseAngle = Math.random() * Math.PI * 2;
      for (let fn = 0; fn < 5; fn++) {
        const fingerBoneGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.07 + Math.random() * 0.04, 5);
        const fingerBone = new THREE.Mesh(fingerBoneGeo, skelMat);
        const fAngle = handBaseAngle + (fn - 2) * 0.28;
        const fDist = 0.35 + Math.random() * 0.1;
        fingerBone.position.set(Math.cos(fAngle) * fDist, 0.01, Math.sin(fAngle) * fDist);
        fingerBone.rotation.z = fAngle + Math.PI / 2;
        fingerBone.rotation.x = (Math.random() - 0.5) * 0.3;
        skelGroup.add(fingerBone);
      }
      // Random scattered bones (some broken/angled)
      for (let bn = 0; bn < 3; bn++) {
        const bnLen = 0.2 + Math.random() * 0.15;
        const bnGeo = new THREE.CylinderGeometry(0.018, Math.random() < 0.4 ? 0.009 : 0.018, bnLen, 6);
        const bnM = new THREE.Mesh(bnGeo, skelMat);
        bnM.position.set((Math.random() - 0.5) * 0.5, 0.02, (Math.random() - 0.5) * 0.5);
        bnM.rotation.z = Math.random() * Math.PI;
        bnM.rotation.x = (Math.random() - 0.5) * 0.5;
        skelGroup.add(bnM);
      }
      // Occasional rusted weapon nearby (~50% chance)
      if (Math.random() < 0.5) {
        const weaponGroup = new THREE.Group();
        const rustMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, metalness: 0.4, roughness: 0.85 });
        if (Math.random() < 0.6) {
          // Sword: thin box blade + small box guard
          const bladeGeo = new THREE.BoxGeometry(0.03, 0.008, 0.5);
          const blade = new THREE.Mesh(bladeGeo, rustMat);
          weaponGroup.add(blade);
          const guardGeo = new THREE.BoxGeometry(0.12, 0.012, 0.03);
          const guard = new THREE.Mesh(guardGeo, rustMat);
          guard.position.z = -0.22;
          weaponGroup.add(guard);
        } else {
          // Shield: flattened sphere
          const shieldGeo = new THREE.SphereGeometry(0.18, 8, 6);
          const shield = new THREE.Mesh(shieldGeo, rustMat);
          shield.scale.set(1, 0.15, 1);
          weaponGroup.add(shield);
        }
        weaponGroup.position.set((Math.random() - 0.5) * 0.5, 0.005, (Math.random() - 0.5) * 0.5);
        weaponGroup.rotation.y = Math.random() * Math.PI;
        skelGroup.add(weaponGroup);
      }
      const skX = (Math.random() - 0.5) * w * 0.7;
      const skZ = (Math.random() - 0.5) * d * 0.7;
      skelGroup.position.set(skX, getTerrainHeight(skX, skZ, 0.4), skZ);
      mctx.envGroup.add(skelGroup);
    }

    // Cobweb curtains (10) - between pillars and walls
    for (let i = 0; i < 10; i++) {
      const cwGroup = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const cwGeo = new THREE.PlaneGeometry(2.0 + Math.random(), 2.5 + Math.random());
        const cwMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.08, roughness: 0.5, side: THREE.DoubleSide });
        const cw = new THREE.Mesh(cwGeo, cwMat);
        cw.position.set((Math.random() - 0.5) * 0.3, 3.0 + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2);
        cw.rotation.y = (Math.random() - 0.5) * 0.3;
        cwGroup.add(cw);
      }
      // Cobweb string threads - thin cylinders between points
      for (let ct = 0; ct < 4; ct++) {
        const threadLen = 1.5 + Math.random() * 2.0;
        const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, threadLen, 4),
          new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.12, roughness: 0.5 }));
        thread.position.set((Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.5);
        thread.rotation.z = (Math.random() - 0.5) * 1.0;
        thread.rotation.x = (Math.random() - 0.5) * 0.5;
        cwGroup.add(thread);
      }
      const cwX = (Math.random() - 0.5) * w * 0.7;
      const cwZ = (Math.random() - 0.5) * d * 0.7;
      cwGroup.position.set(cwX, getTerrainHeight(cwX, cwZ, 0.4), cwZ);
      cwGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(cwGroup);
    }

    // Braziers (4)
    for (let i = 0; i < 4; i++) {
      const brazierGroup = new THREE.Group();
      const pedGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 27);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = 0.5;
      brazierGroup.add(ped);
      const bowlGeo = new THREE.SphereGeometry(0.3, 27, 23, 0, Math.PI * 2, 0, Math.PI / 2);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.rotation.x = Math.PI;
      bowl.position.y = 1.0;
      brazierGroup.add(bowl);
      const emberGeo = new THREE.SphereGeometry(0.15, 23, 20);
      const emberMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.y = 1.1;
      brazierGroup.add(ember);
      const bx = (Math.random() - 0.5) * w * 0.7;
      const bz = (Math.random() - 0.5) * d * 0.7;
      // Soot marks on the ground around the brazier
      for (let sm = 0; sm < 2; sm++) {
        const bSootGeo = new THREE.CircleGeometry(0.12 + Math.random() * 0.08, 27);
        const bSootMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.25, roughness: 1.0, side: THREE.DoubleSide });
        const bSoot = new THREE.Mesh(bSootGeo, bSootMat);
        bSoot.rotation.x = -Math.PI / 2;
        bSoot.position.set(
          (Math.random() - 0.5) * 0.5,
          0.01,
          (Math.random() - 0.5) * 0.5
        );
        brazierGroup.add(bSoot);
      }
      brazierGroup.position.set(bx, getTerrainHeight(bx, bz, 0.4), bz);
      mctx.envGroup.add(brazierGroup);
      const bLight = new THREE.PointLight(0xff4422, 1.0, 10);
      bLight.position.set(bx, 1.2, bz);
      mctx.scene.add(bLight);
      mctx.torchLights.push(bLight);
    }

    // Sarcophagus with lid ajar (3)
    for (let i = 0; i < 3; i++) {
      const sarcGroup = new THREE.Group();
      const sarcBaseGeo = new THREE.BoxGeometry(1.0, 0.6, 2.2);
      const sarcMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7, metalness: 0.1 });
      const sarcBase = new THREE.Mesh(sarcBaseGeo, sarcMat);
      sarcBase.position.y = 0.3;
      sarcGroup.add(sarcBase);
      const trimGeo = new THREE.BoxGeometry(1.05, 0.05, 2.25);
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.6, metalness: 0.2 });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.y = 0.62;
      sarcGroup.add(trim);
      const sarcLidGeo = new THREE.BoxGeometry(1.05, 0.12, 2.25);
      const sarcLid = new THREE.Mesh(sarcLidGeo, sarcMat);
      sarcLid.position.set(0.25, 0.68, 0.15);
      sarcLid.rotation.z = 0.15;
      sarcLid.rotation.y = 0.1;
      sarcGroup.add(sarcLid);
      // Sarcophagus lid detail - raised rune cross pattern
      const sarcRuneMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.65, metalness: 0.15 });
      const sarcCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 1.5), sarcRuneMat);
      sarcCrossV.position.set(0.25, 0.76, 0);
      sarcGroup.add(sarcCrossV);
      const sarcCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), sarcRuneMat);
      sarcCrossH.position.set(0.25, 0.76, -0.3);
      sarcGroup.add(sarcCrossH);
      // Corner rune marks on sarcophagus lid
      for (const [srx, srz] of [[-0.4, -0.9], [0.4, -0.9], [-0.4, 0.9], [0.4, 0.9]]) {
        const srMark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), sarcRuneMat);
        srMark.position.set(0.25 + srx * 0.5, 0.76, srz);
        sarcGroup.add(srMark);
      }
      // Carved border trim around base
      const necro_sarcBorderMat = new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 0.7, metalness: 0.15 });
      for (const necro_sarcBdrZ of [-1.1, 1.1]) {
        const necro_sarcBdrEnd = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.04), necro_sarcBorderMat);
        necro_sarcBdrEnd.position.set(0, 0.15, necro_sarcBdrZ);
        sarcGroup.add(necro_sarcBdrEnd);
      }
      for (const necro_sarcBdrX of [-0.5, 0.5]) {
        const necro_sarcBdrSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 2.24), necro_sarcBorderMat);
        necro_sarcBdrSide.position.set(necro_sarcBdrX, 0.15, 0);
        sarcGroup.add(necro_sarcBdrSide);
      }
      // Handles on sarcophagus sides
      const necro_sarcHandleMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.5, roughness: 0.4 });
      for (const necro_sarcHandleSide of [-1, 1]) {
        const necro_sarcHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 10, Math.PI), necro_sarcHandleMat);
        necro_sarcHandle.position.set(necro_sarcHandleSide * 0.53, 0.3, 0);
        necro_sarcHandle.rotation.y = Math.PI / 2;
        necro_sarcHandle.rotation.z = Math.PI / 2;
        sarcGroup.add(necro_sarcHandle);
      }
      // Crumbling edges on sarcophagus
      for (let se = 0; se < 4; se++) {
        const sEdge = new THREE.Mesh(new THREE.BoxGeometry(0.08 + Math.random() * 0.06, 0.05, 0.08 + Math.random() * 0.06),
          new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.9 }));
        sEdge.position.set(
          (Math.random() - 0.5) * 0.9,
          0.62 + Math.random() * 0.05,
          (Math.random() > 0.5 ? 1 : -1) * 1.1
        );
        sEdge.rotation.set(Math.random() * 0.3, Math.random() * 0.3, 0);
        sarcGroup.add(sEdge);
      }
      // Cracks on sarcophagus body
      for (let necro_sarcCrackIdx = 0; necro_sarcCrackIdx < 2 + Math.floor(Math.random() * 2); necro_sarcCrackIdx++) {
        const necro_sarcCrackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 1.0 });
        const necro_sarcCrack = new THREE.Mesh(new THREE.PlaneGeometry(0.015, 0.15 + Math.random() * 0.2), necro_sarcCrackMat);
        necro_sarcCrack.position.set(
          (Math.random() > 0.5 ? 0.505 : -0.505),
          0.15 + Math.random() * 0.3,
          (Math.random() - 0.5) * 1.8
        );
        necro_sarcCrack.rotation.y = Math.PI / 2;
        necro_sarcCrack.rotation.z = (Math.random() - 0.5) * 0.5;
        sarcGroup.add(necro_sarcCrack);
      }
      const darkGeo = new THREE.BoxGeometry(0.8, 0.1, 2.0);
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
      const darkInside = new THREE.Mesh(darkGeo, darkMat);
      darkInside.position.y = 0.55;
      sarcGroup.add(darkInside);
      const sarcX = (Math.random() - 0.5) * w * 0.6;
      const sarcZ = (Math.random() - 0.5) * d * 0.6;
      sarcGroup.position.set(sarcX, getTerrainHeight(sarcX, sarcZ, 0.4), sarcZ);
      sarcGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(sarcGroup);
    }

    // Altar (1) - central
    const altarGroup = new THREE.Group();
    const altarGeo = new THREE.BoxGeometry(2.0, 1.0, 1.2);
    const altarMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7, metalness: 0.1 });
    const altar = new THREE.Mesh(altarGeo, altarMat);
    altar.position.y = 0.5;
    altar.castShadow = true;
    altarGroup.add(altar);
    for (let c = 0; c < 4; c++) {
      const candleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 20);
      const candleMat = new THREE.MeshStandardMaterial({ color: 0xdddd88, roughness: 0.8 });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(-0.6 + c * 0.4, 1.1, 0);
      altarGroup.add(candle);
      const cfGeo = new THREE.SphereGeometry(0.03, 20, 17);
      const cfMat = new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff8800, emissiveIntensity: 2.0 });
      const cf = new THREE.Mesh(cfGeo, cfMat);
      cf.position.set(-0.6 + c * 0.4, 1.22, 0);
      altarGroup.add(cf);
    }
    const daggerGeo = new THREE.BoxGeometry(0.03, 0.01, 0.25);
    const daggerMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.8, roughness: 0.1 });
    const dagger = new THREE.Mesh(daggerGeo, daggerMat);
    dagger.position.set(0, 1.02, 0.3);
    altarGroup.add(dagger);
    altarGroup.position.set(0, getTerrainHeight(0, 0, 0.4), 0);
    mctx.envGroup.add(altarGroup);

    // Crumbling archways (3)
    for (let i = 0; i < 3; i++) {
      const caGroup = new THREE.Group();
      for (let side = -1; side <= 1; side += 2) {
        const cPilGeo = new THREE.CylinderGeometry(0.25, 0.3, 3.5, 27);
        const cPilMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.8 });
        const cPil = new THREE.Mesh(cPilGeo, cPilMat);
        cPil.position.set(side * 1.5, 1.75, 0);
        cPil.castShadow = true;
        caGroup.add(cPil);
      }
      const caArchGeo = new THREE.TorusGeometry(1.5, 0.15, 27, 27, Math.PI * 0.6);
      const caArchMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.8 });
      const caArch = new THREE.Mesh(caArchGeo, caArchMat);
      caArch.position.y = 3.5;
      caArch.rotation.z = Math.PI * 0.7;
      caGroup.add(caArch);
      for (let rb = 0; rb < 4; rb++) {
        const rubGeo = new THREE.BoxGeometry(0.2 + Math.random() * 0.2, 0.15, 0.2 + Math.random() * 0.2);
        const rubMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.9 });
        const rub = new THREE.Mesh(rubGeo, rubMat);
        rub.position.set(1.5 + (Math.random() - 0.5) * 0.8, 0.08, (Math.random() - 0.5) * 0.5);
        rub.rotation.y = Math.random() * Math.PI;
        caGroup.add(rub);
      }
      const caX = (Math.random() - 0.5) * w * 0.6;
      const caZ = (Math.random() - 0.5) * d * 0.6;
      caGroup.position.set(caX, getTerrainHeight(caX, caZ, 0.4), caZ);
      caGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(caGroup);
    }

    // Dungeon grate/drain (4)
    for (let i = 0; i < 4; i++) {
      const grateGroup = new THREE.Group();
      const holeGeo = new THREE.CircleGeometry(0.4, 30);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
      const grateHole = new THREE.Mesh(holeGeo, holeMat);
      grateHole.rotation.x = -Math.PI / 2;
      grateHole.position.y = 0.01;
      grateGroup.add(grateHole);
      for (let b = 0; b < 4; b++) {
        const barGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 20);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(-0.3 + b * 0.2, 0.02, 0);
        grateGroup.add(bar);
      }
      const grX = (Math.random() - 0.5) * w * 0.7;
      const grZ = (Math.random() - 0.5) * d * 0.7;
      grateGroup.position.set(grX, getTerrainHeight(grX, grZ, 0.4), grZ);
      mctx.envGroup.add(grateGroup);
    }

    // Poison gas vents (3)
    for (let i = 0; i < 3; i++) {
      const ventGroup = new THREE.Group();
      const ventGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 27);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.y = 0.025;
      ventGroup.add(vent);
      const gasGeo = new THREE.SphereGeometry(0.4, 44, 23);
      const gasMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.5, transparent: true, opacity: 0.15 });
      const gas = new THREE.Mesh(gasGeo, gasMat);
      gas.position.y = 0.5;
      ventGroup.add(gas);
      const ventX = (Math.random() - 0.5) * w * 0.7;
      const ventZ = (Math.random() - 0.5) * d * 0.7;
      ventGroup.position.set(ventX, getTerrainHeight(ventX, ventZ, 0.4), ventZ);
      mctx.envGroup.add(ventGroup);
    }

    // Caged skeletons (2)
    for (let i = 0; i < 2; i++) {
      const cageGroup = new THREE.Group();
      const cBarMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 });
      for (let side = 0; side < 8; side++) {
        const cBarGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.0, 20);
        const cBar = new THREE.Mesh(cBarGeo, cBarMat);
        const cbAng = (side / 8) * Math.PI * 2;
        cBar.position.set(Math.cos(cbAng) * 0.5, 1.0, Math.sin(cbAng) * 0.5);
        cageGroup.add(cBar);
      }
      const cTopGeo = new THREE.CircleGeometry(0.5, 27);
      const cTop = new THREE.Mesh(cTopGeo, cBarMat);
      cTop.rotation.x = -Math.PI / 2;
      cTop.position.y = 2.0;
      cageGroup.add(cTop);
      for (let bn = 0; bn < 3; bn++) {
        const cBoneGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2 + Math.random() * 0.1, 20);
        const cBoneMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
        const cBone = new THREE.Mesh(cBoneGeo, cBoneMat);
        cBone.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3);
        cBone.rotation.z = Math.random() * Math.PI;
        cageGroup.add(cBone);
      }
      // Cage door hinges
      for (let h = 0; h < 2; h++) {
        const hingeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 27);
        const hingeMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.6, roughness: 0.4 });
        const hinge = new THREE.Mesh(hingeGeo, hingeMat);
        hinge.position.set(0.5, 0.5 + h * 1.0, 0);
        hinge.rotation.x = Math.PI / 2;
        cageGroup.add(hinge);
      }
      const cgX = (Math.random() - 0.5) * w * 0.6;
      const cgZ = (Math.random() - 0.5) * d * 0.6;
      cageGroup.position.set(cgX, getTerrainHeight(cgX, cgZ, 0.4), cgZ);
      mctx.envGroup.add(cageGroup);
    }

    // Additional wall-mounted torches at varying heights (6)
    for (let i = 0; i < 6; i++) {
      const wtGroup = new THREE.Group();
      const wtBracketGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 20);
      const isExtinguished = i < 2;
      const wtBracketMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 });
      const wtBracket = new THREE.Mesh(wtBracketGeo, wtBracketMat);
      const wallY = 1.5 + Math.random() * 2.5;
      wtBracket.position.y = wallY;
      wtBracket.rotation.z = Math.PI / 4;
      wtGroup.add(wtBracket);
      if (!isExtinguished) {
        const wtFlameGeo = new THREE.SphereGeometry(0.08, 20, 17);
        const wtFlameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0 });
        const wtFlame = new THREE.Mesh(wtFlameGeo, wtFlameMat);
        wtFlame.position.y = wallY + 0.25;
        wtGroup.add(wtFlame);
        const wtx = (Math.random() - 0.5) * w * 0.8;
        const wtz = (Math.random() - 0.5) * d * 0.8;
        wtGroup.position.set(wtx, getTerrainHeight(wtx, wtz, 0.4), wtz);
        const wtLight = new THREE.PointLight(0xff6622, 0.8, 8);
        wtLight.position.set(wtx, wallY + 0.25, wtz);
        mctx.scene.add(wtLight);
        mctx.torchLights.push(wtLight);
      } else {
        const wtCharGeo = new THREE.SphereGeometry(0.06, 20, 17);
        const wtCharMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 });
        const wtChar = new THREE.Mesh(wtCharGeo, wtCharMat);
        wtChar.position.y = wallY + 0.2;
        wtGroup.add(wtChar);
        const wtx2 = (Math.random() - 0.5) * w * 0.8;
        const wtz2 = (Math.random() - 0.5) * d * 0.8;
        wtGroup.position.set(wtx2, getTerrainHeight(wtx2, wtz2, 0.4), wtz2);
      }
      // Soot marks around wall-mounted torch brackets
      for (let ws = 0; ws < 2; ws++) {
        const wtSootGeo = new THREE.CircleGeometry(0.06 + Math.random() * 0.04, 27);
        const wtSootMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.3, roughness: 1.0, side: THREE.DoubleSide });
        const wtSoot = new THREE.Mesh(wtSootGeo, wtSootMat);
        wtSoot.position.set(
          (Math.random() - 0.5) * 0.15,
          wallY + 0.1 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.1
        );
        wtSoot.rotation.y = Math.random() * Math.PI;
        wtGroup.add(wtSoot);
      }
      mctx.envGroup.add(wtGroup);
    }

    // Ghostly wisp trails (14)
    const wispGhostMat = new THREE.MeshStandardMaterial({
      color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.2,
    });
    for (let i = 0; i < 14; i++) {
      const wispGrp = new THREE.Group();
      for (let s = 0; s < 5; s++) {
        const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.06 - s * 0.008, 20, 17), wispGhostMat);
        wisp.position.set(s * 0.3, 1.5 + Math.sin(s) * 0.3, s * 0.1);
        wispGrp.add(wisp);
      }
      const wiX = (Math.random() - 0.5) * w * 0.7;
      const wiZ = (Math.random() - 0.5) * d * 0.7;
      wispGrp.position.set(wiX, getTerrainHeight(wiX, wiZ, 0.4), wiZ);
      wispGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(wispGrp);
    }

    // Broken statues (4) - detailed with anatomical torso, drapery, weapon fragments, broken head
    const brokenStatMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7 });
    const brokenStatMatDark = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.8 });
    const brokenStatMatLight = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.65 });
    const statMossMat = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 1.0 });
    for (let i = 0; i < 4; i++) {
      const statGrp = new THREE.Group();

      // Pedestal - carved with edges and inscribed face
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), brokenStatMat);
      ped.position.y = 0.25;
      statGrp.add(ped);
      // Pedestal top molding
      const pedTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), brokenStatMatLight);
      pedTop.position.y = 0.54;
      statGrp.add(pedTop);
      // Pedestal bottom molding
      const pedBot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), brokenStatMatLight);
      pedBot.position.y = 0.05;
      statGrp.add(pedBot);
      // Carved edge detail on pedestal sides
      for (let pe = 0; pe < 4; pe++) {
        const edgeAng = (pe / 4) * Math.PI * 2;
        const pedEdge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.03), brokenStatMatDark);
        pedEdge.position.set(Math.cos(edgeAng) * 0.46, 0.35, Math.sin(edgeAng) * 0.46);
        pedEdge.rotation.y = edgeAng;
        statGrp.add(pedEdge);
      }
      // Inscribed face on pedestal front (recessed plane)
      const inscribedFace = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x3a3a45, roughness: 0.9 }));
      inscribedFace.position.set(0, 0.3, 0.46);
      statGrp.add(inscribedFace);

      // Torso with anatomical detail
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.85, 23), brokenStatMat);
      torso.position.y = 1.05;
      statGrp.add(torso);
      // Shoulders (sphere geometry)
      for (const ss of [-1, 1]) {
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), brokenStatMat);
        shoulder.position.set(ss * 0.22, 1.4, 0);
        shoulder.scale.set(1.2, 0.8, 0.9);
        statGrp.add(shoulder);
      }
      // Neck stump
      const neckStump = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), brokenStatMatDark);
      neckStump.position.y = 1.54;
      statGrp.add(neckStump);

      // Partial leg stump on pedestal
      const legStump = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 14), brokenStatMat);
      legStump.position.set(0.15, 0.72, 0);
      statGrp.add(legStump);

      // Carved drapery/robe folds on torso (overlapping thin box ridges)
      for (let dr = 0; dr < 5; dr++) {
        const drapeY = 0.7 + dr * 0.14;
        const drapeAng = dr * 0.3;
        const drape = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), brokenStatMatLight);
        drape.position.set(Math.sin(drapeAng) * 0.08, drapeY, 0.18);
        drape.rotation.z = (Math.random() - 0.5) * 0.2;
        statGrp.add(drape);
      }
      // Back drapery folds
      for (let dr = 0; dr < 3; dr++) {
        const drapeY = 0.75 + dr * 0.18;
        const drape = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), brokenStatMatLight);
        drape.position.set(0, drapeY, -0.18);
        drape.rotation.z = (Math.random() - 0.5) * 0.15;
        statGrp.add(drape);
      }

      // Broken arm with weapon fragment
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 20), brokenStatMat);
      arm.position.set(0.28, 1.15, 0);
      arm.rotation.z = -0.6;
      statGrp.add(arm);
      // Hand/fist at end of arm
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), brokenStatMat);
      fist.position.set(0.5, 0.95, 0);
      statGrp.add(fist);
      // Weapon fragment - sword hilt or staff piece
      if (i % 2 === 0) {
        // Sword hilt
        const hiltGuard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), brokenStatMatDark);
        hiltGuard.position.set(0.55, 0.93, 0);
        hiltGuard.rotation.z = -0.6;
        statGrp.add(hiltGuard);
        const hiltGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8), brokenStatMatDark);
        hiltGrip.position.set(0.6, 0.88, 0);
        hiltGrip.rotation.z = -0.6;
        statGrp.add(hiltGrip);
      } else {
        // Staff piece
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), brokenStatMatDark);
        staff.position.set(0.55, 0.88, 0);
        staff.rotation.z = -0.5;
        statGrp.add(staff);
      }

      // Broken head piece nearby (sphere with flat cut)
      const headDist = 0.6 + Math.random() * 0.5;
      const headAng = Math.random() * Math.PI * 2;
      const brokenHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), brokenStatMat);
      brokenHead.position.set(
        Math.cos(headAng) * headDist,
        0.1,
        Math.sin(headAng) * headDist
      );
      brokenHead.rotation.x = Math.PI * 0.6;
      brokenHead.rotation.z = Math.random() * Math.PI;
      statGrp.add(brokenHead);
      // Flat cut face on head
      const headCut = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), brokenStatMatDark);
      headCut.position.set(
        Math.cos(headAng) * headDist,
        0.12,
        Math.sin(headAng) * headDist
      );
      headCut.rotation.x = -Math.PI / 2;
      statGrp.add(headCut);

      // Rubble around base - varied sizes
      for (let r = 0; r < 6 + Math.floor(Math.random() * 4); r++) {
        const rubSize = 0.04 + Math.random() * 0.14;
        const rub = new THREE.Mesh(new THREE.DodecahedronGeometry(rubSize, 2), brokenStatMat);
        const rubAng = Math.random() * Math.PI * 2;
        const rubDist = 0.4 + Math.random() * 0.8;
        rub.position.set(Math.cos(rubAng) * rubDist, rubSize * 0.4, Math.sin(rubAng) * rubDist);
        rub.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        statGrp.add(rub);
      }

      // Extra crumbling stone debris
      for (let cd = 0; cd < 5; cd++) {
        const debrisGeo = new THREE.DodecahedronGeometry(0.03 + Math.random() * 0.05, 1);
        const debris = new THREE.Mesh(debrisGeo, brokenStatMat);
        debris.position.set(
          (Math.random() - 0.5) * 1.4,
          0.02 + Math.random() * 0.03,
          (Math.random() - 0.5) * 1.4
        );
        debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        statGrp.add(debris);
      }

      // Moss/lichen in crevices
      for (let ml = 0; ml < 4 + Math.floor(Math.random() * 3); ml++) {
        const lichenSize = 0.04 + Math.random() * 0.08;
        const lichen = new THREE.Mesh(new THREE.SphereGeometry(lichenSize, 6, 5), statMossMat);
        lichen.position.set(
          (Math.random() - 0.5) * 0.3,
          0.6 + Math.random() * 0.8,
          (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.05)
        );
        lichen.scale.y = 0.4;
        statGrp.add(lichen);
      }

      statGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      mctx.envGroup.add(statGrp);
    }

    // Crypt entrances (3)
    for (let i = 0; i < 3; i++) {
      const cryptGrp = new THREE.Group();
      const cryptMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.8 });
      // Frame
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), cryptMat);
        pillar.position.set(side * 0.7, 1, 0);
        pillar.castShadow = true;
        cryptGrp.add(pillar);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.35), cryptMat);
      lintel.position.y = 2.1;
      cryptGrp.add(lintel);
      // Dark entrance
      const entrance = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2),
        new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1.0 }));
      entrance.position.set(0, 1, -0.1);
      cryptGrp.add(entrance);
      // Skull above entrance
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 23, 20),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.7 }));
      skull.position.set(0, 2.35, 0.1);
      skull.scale.set(1, 0.8, 0.8);
      cryptGrp.add(skull);
      // Crypt archway keystone detail - wedge-shaped stone at arch top
      const keystoneMat = new THREE.MeshStandardMaterial({ color: 0x3d3d48, roughness: 0.75 });
      const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.38), keystoneMat);
      keystone.position.set(0, 2.25, 0.05);
      keystone.rotation.z = 0;
      cryptGrp.add(keystone);
      // Arch curve using small boxes to simulate stone arch above lintel
      for (let ak = 0; ak < 6; ak++) {
        const archAngle = (ak / 5) * Math.PI;
        const archStone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.36), cryptMat);
        archStone.position.set(Math.cos(archAngle) * 0.65, 2.1 + Math.sin(archAngle) * 0.4, 0);
        archStone.rotation.z = archAngle - Math.PI / 2;
        cryptGrp.add(archStone);
      }
      // Iron gate bars across crypt entrance
      const cryptBarMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7, roughness: 0.3 });
      for (let cb = 0; cb < 5; cb++) {
        const cBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 8), cryptBarMat);
        cBar.position.set(-0.4 + cb * 0.2, 0.9, -0.05);
        cryptGrp.add(cBar);
      }
      // Crumbling stone debris around the crypt entrance
      for (let cd = 0; cd < 3; cd++) {
        const cDebrisGeo = new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.06, 2);
        const cDebris = new THREE.Mesh(cDebrisGeo, cryptMat);
        cDebris.position.set(
          (Math.random() - 0.5) * 1.6,
          0.03,
          0.2 + Math.random() * 0.4
        );
        cDebris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        cryptGrp.add(cDebris);
      }
      cryptGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      cryptGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(cryptGrp);
    }

    // Ethereal mist layers (8) - eerie green fog wisps
    for (let i = 0; i < 8; i++) {
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(6 + Math.random() * 8, 6 + Math.random() * 8),
        new THREE.MeshStandardMaterial({ color: 0x224433, emissive: 0x113322, emissiveIntensity: 0.2, transparent: true, opacity: 0.08, roughness: 1.0, side: THREE.DoubleSide })
      );
      mist.rotation.x = -Math.PI / 2;
      mist.position.set((Math.random() - 0.5) * w * 0.8, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * d * 0.8);
      mctx.envGroup.add(mist);
    }

    // Cursed tombstones (18) with inscriptions, weathering, ornaments
    const tombMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.8 });
    const necro_tombInscMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.95 });
    for (let i = 0; i < 18; i++) {
      const tombGrp = new THREE.Group();
      const tombH = 0.5 + Math.random() * 0.5;
      const necro_tombTilt = (Math.random() - 0.5) * 0.25;
      const tombstone = new THREE.Mesh(new THREE.BoxGeometry(0.4, tombH, 0.1), tombMat);
      tombstone.position.y = tombH / 2;
      tombstone.rotation.z = necro_tombTilt;
      tombGrp.add(tombstone);
      // Rounded top
      const topRound = new THREE.Mesh(new THREE.SphereGeometry(0.2, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2), tombMat);
      topRound.position.y = tombH;
      topRound.scale.x = 1;
      tombGrp.add(topRound);
      // Inscribed lines (weathered text lines)
      for (let necro_inscIdx = 0; necro_inscIdx < 2 + Math.floor(Math.random() * 3); necro_inscIdx++) {
        const necro_inscLine = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.1, 0.015, 0.02), necro_tombInscMat);
        necro_inscLine.position.set(0, tombH * 0.25 + necro_inscIdx * 0.06, 0.055);
        necro_inscLine.rotation.z = necro_tombTilt;
        tombGrp.add(necro_inscLine);
      }
      // Cross or angel ornament on top (random choice)
      if (Math.random() > 0.4) {
        if (Math.random() > 0.5) {
          // Cross ornament
          const necro_crossV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), tombMat);
          necro_crossV.position.set(0, tombH + 0.2, 0);
          tombGrp.add(necro_crossV);
          const necro_crossH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), tombMat);
          necro_crossH.position.set(0, tombH + 0.22, 0);
          tombGrp.add(necro_crossH);
        } else {
          // Angel/winged ornament
          const necro_angelBody = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), tombMat);
          necro_angelBody.position.set(0, tombH + 0.17, 0);
          tombGrp.add(necro_angelBody);
          for (const necro_angelWingSide of [-1, 1]) {
            const necro_angelWing = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.05),
              new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.8, side: THREE.DoubleSide }));
            necro_angelWing.position.set(necro_angelWingSide * 0.04, tombH + 0.19, 0);
            necro_angelWing.rotation.z = necro_angelWingSide * 0.5;
            tombGrp.add(necro_angelWing);
          }
        }
      }
      // Crumbling edges on tombstone
      for (let te = 0; te < 2 + Math.floor(Math.random() * 2); te++) {
        const tCrumble = new THREE.Mesh(new THREE.BoxGeometry(0.06 + Math.random() * 0.04, 0.05 + Math.random() * 0.04, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x4a4a54, roughness: 0.9 }));
        tCrumble.position.set(
          (Math.random() - 0.5) * 0.35,
          tombH * 0.3 + Math.random() * tombH * 0.5,
          0.06 + Math.random() * 0.02
        );
        tCrumble.rotation.set(Math.random() * 0.3, 0, Math.random() * 0.3);
        tombGrp.add(tCrumble);
      }
      // Weathering stains (dark splotches)
      for (let necro_stainIdx = 0; necro_stainIdx < 1 + Math.floor(Math.random() * 2); necro_stainIdx++) {
        const necro_stain = new THREE.Mesh(new THREE.PlaneGeometry(0.08 + Math.random() * 0.06, 0.12 + Math.random() * 0.08),
          new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 1.0, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
        necro_stain.position.set((Math.random() - 0.5) * 0.15, tombH * 0.15 + Math.random() * tombH * 0.5, 0.056);
        tombGrp.add(necro_stain);
      }
      // Moss patches on tombstones (more varied, lower sections)
      if (Math.random() > 0.3) {
        for (let necro_mossIdx = 0; necro_mossIdx < 1 + Math.floor(Math.random() * 2); necro_mossIdx++) {
          const mossPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + Math.random() * 0.1, 0.1 + Math.random() * 0.08),
            new THREE.MeshStandardMaterial({ color: 0x2a4a1a + Math.floor(Math.random() * 0x0a1a0a), roughness: 0.95, transparent: true, opacity: 0.6 + Math.random() * 0.2, side: THREE.DoubleSide }));
          mossPatch.position.set((Math.random() - 0.5) * 0.15, tombH * 0.1 + necro_mossIdx * 0.08, 0.06);
          tombGrp.add(mossPatch);
        }
      }
      tombGrp.position.set((Math.random() - 0.5) * w * 0.75, 0, (Math.random() - 0.5) * d * 0.75);
      tombGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(tombGrp);
    }

    // Pentagram on ground (1)
    const pentaMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222, emissive: 0x881111, emissiveIntensity: 0.5,
      transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const pentaRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.7, 10), pentaMat);
    pentaRing.rotation.x = -Math.PI / 2;
    pentaRing.position.set(w * 0.2, 0.03, d * 0.2);
    mctx.envGroup.add(pentaRing);
    const pentaInner = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 10), pentaMat);
    pentaInner.rotation.x = -Math.PI / 2;
    pentaInner.rotation.z = Math.PI / 5;
    pentaInner.position.set(w * 0.2, 0.04, d * 0.2);
    mctx.envGroup.add(pentaInner);
}

