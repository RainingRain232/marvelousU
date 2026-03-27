import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { VendorType } from './DiabloTypes';
import { VENDOR_DEFS } from './DiabloConfig';
import { MapBuildContext } from './DiabloRendererMaps';

export function buildCamelot(mctx: MapBuildContext, w: number, d: number): void {
    // ── Lighting / Atmosphere ──
    mctx.scene.fog = new THREE.FogExp2(0x8899aa, 0.008);
    mctx.applyTerrainColors(0x887766, 0xaa9988, 0.8);
    mctx.dirLight.color.setHex(0xffeedd);
    mctx.dirLight.intensity = 1.3;
    mctx.ambientLight.color.setHex(0x556677);
    mctx.ambientLight.intensity = 0.6;
    mctx.hemiLight.color.setHex(0x99bbdd);
    mctx.hemiLight.groundColor.setHex(0x665544);

    const hw = w / 2;
    const hd = d / 2;

    // ── Paved Market Square with cobblestone tiles (center, 30x30) ──
    const pavedGeo = new THREE.BoxGeometry(30, 0.04, 30);
    const pavedMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.85 });
    const paved = new THREE.Mesh(pavedGeo, pavedMat);
    paved.position.set(0, 0.02, 0);
    paved.receiveShadow = true;
    mctx.envGroup.add(paved);

    // Cobblestone tile grid on market square
    const tileColors = [0xaa9988, 0xbbaa99, 0xccbbaa, 0x998877, 0xb0a090, 0xc4b4a4];
    const tileSize = 1.2;
    const tileGeo = new THREE.BoxGeometry(tileSize - 0.06, 0.03, tileSize - 0.06);
    for (let tx = -14; tx <= 14; tx += tileSize) {
      for (let tz = -14; tz <= 14; tz += tileSize) {
        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColors[Math.floor(Math.random() * tileColors.length)],
          roughness: 0.8 + Math.random() * 0.15,
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(tx, 0.055, tz);
        tile.receiveShadow = true;
        mctx.envGroup.add(tile);
      }
    }

    // Cobblestone ground texture - higher poly circles with height variation and mortar
    const cam_cobbleColors = [0x998877, 0x8a7966, 0xa89988, 0x907868, 0xb0a090];
    for (let cbi = 0; cbi < 40; cbi++) {
      const cbR = 0.15 + Math.random() * 0.12;
      const cam_cobbleColor = cam_cobbleColors[Math.floor(Math.random() * cam_cobbleColors.length)];
      const cam_cobbleMat = new THREE.MeshStandardMaterial({ color: cam_cobbleColor, roughness: 0.9 + Math.random() * 0.1, side: THREE.DoubleSide });
      const cobbleCircle = new THREE.Mesh(new THREE.CircleGeometry(cbR, 20 + Math.floor(Math.random() * 6)), cam_cobbleMat);
      cobbleCircle.rotation.x = -Math.PI / 2;
      const cam_cobbleYOffset = 0.065 + Math.random() * 0.012;
      cobbleCircle.position.set(
        (Math.random() - 0.5) * 28,
        cam_cobbleYOffset,
        (Math.random() - 0.5) * 28
      );
      mctx.envGroup.add(cobbleCircle);
      // Mortar line (dark thin box around some cobblestones)
      if (Math.random() > 0.5) {
        const cam_mortarMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 1.0 });
        const cam_mortarAngle = Math.random() * Math.PI * 2;
        const cam_mortar = new THREE.Mesh(new THREE.BoxGeometry(cbR * 1.8, 0.005, 0.015), cam_mortarMat);
        cam_mortar.rotation.x = -Math.PI / 2;
        cam_mortar.rotation.z = cam_mortarAngle;
        cam_mortar.position.set(cobbleCircle.position.x, cam_cobbleYOffset - 0.002, cobbleCircle.position.z);
        mctx.envGroup.add(cam_mortar);
      }
    }
    // Decorative stone border around market square
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9 });
    for (let bi = -15; bi <= 15; bi += 1.5) {
      const borderGeo = new THREE.BoxGeometry(1.4, 0.08, 0.3);
      const bN = new THREE.Mesh(borderGeo, borderMat);
      bN.position.set(bi, 0.06, -15);
      bN.receiveShadow = true;
      mctx.envGroup.add(bN);
      const bS = new THREE.Mesh(borderGeo, borderMat);
      bS.position.set(bi, 0.06, 15);
      bS.receiveShadow = true;
      mctx.envGroup.add(bS);
    }
    for (let bi = -15; bi <= 15; bi += 1.5) {
      const borderGeo = new THREE.BoxGeometry(0.3, 0.08, 1.4);
      const bE = new THREE.Mesh(borderGeo, borderMat);
      bE.position.set(15, 0.06, bi);
      bE.receiveShadow = true;
      mctx.envGroup.add(bE);
      const bW = new THREE.Mesh(borderGeo, borderMat);
      bW.position.set(-15, 0.06, bi);
      bW.receiveShadow = true;
      mctx.envGroup.add(bW);
    }

    // ── City-wide floor tiles (outside market square) ──
    const cityTileGeo = new THREE.BoxGeometry(2.4, 0.03, 2.4);
    const cityTileColors = [0x887766, 0x998877, 0x7a6a5a, 0x8a7a6a, 0x907e6e];
    for (let ctx = -hw + 2; ctx < hw; ctx += 2.5) {
      for (let ctz = -hd + 2; ctz < hd; ctz += 2.5) {
        if (Math.abs(ctx) < 16 && Math.abs(ctz) < 16) continue; // skip market square area
        const ctMat = new THREE.MeshStandardMaterial({
          color: cityTileColors[Math.floor(Math.random() * cityTileColors.length)],
          roughness: 0.85 + Math.random() * 0.1,
        });
        const ct = new THREE.Mesh(cityTileGeo, ctMat);
        ct.position.set(ctx + (Math.random() - 0.5) * 0.1, 0.025, ctz + (Math.random() - 0.5) * 0.1);
        ct.receiveShadow = true;
        mctx.envGroup.add(ct);
      }
    }

    // ── Main road from south gate to castle (stone slabs) ──
    for (let i = 0; i < 12; i++) {
      const roadGeo = new THREE.BoxGeometry(5, 0.05, 4);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(0, 0.035, -30 + 15 + i * 4);
      road.receiveShadow = true;
      mctx.envGroup.add(road);
      // Road detail - individual stone slabs
      for (let rs = -2; rs <= 2; rs += 1.3) {
        for (let rd = -1.5; rd <= 1.5; rd += 1.3) {
          const slabGeo = new THREE.BoxGeometry(1.2, 0.02, 1.2);
          const slabMat = new THREE.MeshStandardMaterial({
            color: 0x887766 + Math.floor(Math.random() * 0x111111),
            roughness: 0.85,
          });
          const slab = new THREE.Mesh(slabGeo, slabMat);
          slab.position.set(rs, 0.065, -30 + 15 + i * 4 + rd);
          slab.receiveShadow = true;
          mctx.envGroup.add(slab);
        }
      }
    }

    // Side streets with cobblestones
    for (let i = 0; i < 8; i++) {
      const sideGeo = new THREE.BoxGeometry(3, 0.05, 3);
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
      const sideRoad = new THREE.Mesh(sideGeo, sideMat);
      const sx = (i < 4 ? -1 : 1) * (5 + (i % 4) * 3);
      sideRoad.position.set(sx, 0.035, (i % 4) * 4 - 6);
      sideRoad.receiveShadow = true;
      mctx.envGroup.add(sideRoad);
    }

    // ═══════════════════════════════════════════════
    // CASTLE / KEEP (center-back, z=-30)
    // ═══════════════════════════════════════════════
    const castleGroup = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.05 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.85 });

    // Main keep
    const keepGeo = new THREE.BoxGeometry(12, 15, 10);
    const keep = new THREE.Mesh(keepGeo, stoneMat);
    keep.position.set(0, 7.5, 0);
    keep.castShadow = true;
    keep.receiveShadow = true;
    castleGroup.add(keep);
    // Arrow slit windows on keep walls
    const arrowSlitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    for (let asi = 0; asi < 6; asi++) {
      for (const asFace of [[0, 1, 5.05], [0, -1, -5.05]] as [number, number, number][]) {
        const arrowSlit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.08), arrowSlitMat);
        arrowSlit.position.set(-4 + asi * 1.6, 8 + (asi % 2) * 2, asFace[2]);
        castleGroup.add(arrowSlit);
      }
      for (const asFace of [[6.05, 0], [-6.05, 0]] as [number, number][]) {
        const arrowSlit2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.12), arrowSlitMat);
        arrowSlit2.position.set(asFace[0], 8 + (asi % 2) * 2, -3 + asi * 1.2);
        castleGroup.add(arrowSlit2);
      }
    }
    // Stone block lines on keep walls (horizontal thin boxes at intervals)
    const stoneLineMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
    for (let sli = 0; sli < 5; sli++) {
      const slY = 2 + sli * 3;
      // Front and back
      for (const slZ of [5.03, -5.03]) {
        const stoneLine = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.04, 0.06), stoneLineMat);
        stoneLine.position.set(0, slY, slZ);
        castleGroup.add(stoneLine);
      }
      // Sides
      for (const slX of [6.03, -6.03]) {
        const stoneLine2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 9.8), stoneLineMat);
        stoneLine2.position.set(slX, slY, 0);
        castleGroup.add(stoneLine2);
      }
    }

    // 4 corner towers
    const towerPositions = [
      [-6, 5], [6, 5], [-6, -5], [6, -5]
    ];
    for (const [tx, tz] of towerPositions) {
      const towerGeo = new THREE.CylinderGeometry(2, 2, 18, 36);
      const tower = new THREE.Mesh(towerGeo, stoneMat);
      tower.position.set(tx, 15, tz);
      tower.castShadow = true;
      castleGroup.add(tower);

      // Cone roof
      const roofGeo = new THREE.ConeGeometry(2.5, 4, 36);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(tx, 20, tz);
      roof.castShadow = true;
      castleGroup.add(roof);

      // Royal banner on each tower
      const bannerGeo = new THREE.PlaneGeometry(0.6, 2.5);
      const bannerMat = new THREE.MeshStandardMaterial({
        color: 0xcc2222, roughness: 0.7, side: THREE.DoubleSide,
        emissive: 0x220000, emissiveIntensity: 0.1
      });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(tx + 0.3, 17, tz);
      castleGroup.add(banner);

      // Gold trim on banner
      const goldTrimGeo = new THREE.PlaneGeometry(0.6, 0.15);
      const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
      const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
      goldTrim.position.set(tx + 0.3, 16, tz);
      castleGroup.add(goldTrim);
      // Banner pole on tower
      const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4, 10),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      bannerPole.position.set(tx + 0.3, 19, tz);
      castleGroup.add(bannerPole);
      // Pennant triangle at top of pole
      const pennantShape = new THREE.Shape();
      pennantShape.moveTo(0, 0);
      pennantShape.lineTo(0.5, -0.15);
      pennantShape.lineTo(0, -0.3);
      pennantShape.closePath();
      const pennantGeo = new THREE.ShapeGeometry(pennantShape);
      const pennant = new THREE.Mesh(pennantGeo, new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.6, side: THREE.DoubleSide }));
      pennant.position.set(tx + 0.3, 21, tz);
      castleGroup.add(pennant);
      // Heraldic shield emblem on banner (higher poly circle with heraldic cross)
      const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24),
        new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
      emblem.position.set(tx + 0.31, 16.5, tz);
      castleGroup.add(emblem);
      // Heraldic cross design on emblem
      const cam_heraldMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, side: THREE.DoubleSide });
      const cam_heraldV = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.18), cam_heraldMat);
      cam_heraldV.position.set(tx + 0.315, 16.5, tz);
      castleGroup.add(cam_heraldV);
      const cam_heraldH = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.03), cam_heraldMat);
      cam_heraldH.position.set(tx + 0.315, 16.5, tz);
      castleGroup.add(cam_heraldH);
      // Emblem border ring
      const cam_emblemRing = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.12, 24),
        new THREE.MeshStandardMaterial({ color: 0xbb9922, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide }));
      cam_emblemRing.position.set(tx + 0.315, 16.5, tz);
      castleGroup.add(cam_emblemRing);
    }

    // Crenellations on top of keep
    for (let ci = 0; ci < 12; ci++) {
      const crenGeo = new THREE.BoxGeometry(1, 1.5, 0.5);
      const cren = new THREE.Mesh(crenGeo, stoneMat);
      const cx = -5.5 + ci * 1;
      cren.position.set(cx, 15.75, 5.25);
      castleGroup.add(cren);
      const cren2 = cren.clone();
      cren2.position.set(cx, 15.75, -5.25);
      castleGroup.add(cren2);
    }
    for (let ci = 0; ci < 10; ci++) {
      const crenGeo = new THREE.BoxGeometry(0.5, 1.5, 1);
      const cren = new THREE.Mesh(crenGeo, stoneMat);
      cren.position.set(6.25, 15.75, -4.5 + ci * 1);
      castleGroup.add(cren);
      const cren2 = cren.clone();
      cren2.position.set(-6.25, 15.75, -4.5 + ci * 1);
      castleGroup.add(cren2);
    }
    // Tower crenellations - ring of merlons around each tower top
    for (const [tcx, tcz] of towerPositions) {
      for (let tci = 0; tci < 8; tci++) {
        const tcAngle = (tci / 8) * Math.PI * 2;
        const tcMerlon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.3), stoneMat);
        tcMerlon.position.set(tcx + Math.cos(tcAngle) * 2.1, 11.5, tcz + Math.sin(tcAngle) * 2.1);
        tcMerlon.rotation.y = tcAngle;
        castleGroup.add(tcMerlon);
      }
    }
    // Keep wall machicolations (stone brackets under crenellations)
    for (let mi = 0; mi < 10; mi++) {
      const machGeo = new THREE.BoxGeometry(0.6, 0.3, 0.3);
      const machFront = new THREE.Mesh(machGeo, darkStoneMat);
      machFront.position.set(-4.5 + mi * 1, 14.85, 5.4);
      castleGroup.add(machFront);
      const machBack = machFront.clone();
      machBack.position.set(-4.5 + mi * 1, 14.85, -5.4);
      castleGroup.add(machBack);
    }

    // Castle gate (archway)
    const gateGeo = new THREE.BoxGeometry(4, 6, 1.5);
    const gate = new THREE.Mesh(gateGeo, darkStoneMat);
    gate.position.set(0, 3, 5.75);
    castleGroup.add(gate);

    // Portcullis bars
    for (let pb = 0; pb < 7; pb++) {
      const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.5, 23);
      const barMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(-1.5 + pb * 0.5, 3, 6.5);
      castleGroup.add(bar);
    }
    // Horizontal portcullis bars
    for (let hb = 0; hb < 5; hb++) {
      const hBarGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.5, 23);
      const hBarMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
      const hBar = new THREE.Mesh(hBarGeo, hBarMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(0, 1 + hb * 1.2, 6.5);
      castleGroup.add(hBar);
    }

    castleGroup.position.set(0, 0, -30);
    mctx.envGroup.add(castleGroup);

    // ═══════════════════════════════════════════════
    // TOWN WALLS
    // ═══════════════════════════════════════════════
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });

    // North wall
    const nWallGeo = new THREE.BoxGeometry(w, 4, 1);
    const nWall = new THREE.Mesh(nWallGeo, wallMat);
    nWall.position.set(0, 2, -hd);
    nWall.castShadow = true;
    mctx.envGroup.add(nWall);
    // South wall (split for gatehouse gap)
    const sWallLeftGeo = new THREE.BoxGeometry(hw - 3, 4, 1);
    const sWallLeft = new THREE.Mesh(sWallLeftGeo, wallMat);
    sWallLeft.position.set(-(hw - 3) / 2 - 3, 2, hd);
    sWallLeft.castShadow = true;
    mctx.envGroup.add(sWallLeft);
    const sWallRight = new THREE.Mesh(sWallLeftGeo, wallMat);
    sWallRight.position.set((hw - 3) / 2 + 3, 2, hd);
    sWallRight.castShadow = true;
    mctx.envGroup.add(sWallRight);
    // East wall
    const eWallGeo = new THREE.BoxGeometry(1, 4, d);
    const eWall = new THREE.Mesh(eWallGeo, wallMat);
    eWall.position.set(hw, 2, 0);
    eWall.castShadow = true;
    mctx.envGroup.add(eWall);
    // West wall
    const wWall = new THREE.Mesh(eWallGeo, wallMat);
    wWall.position.set(-hw, 2, 0);
    wWall.castShadow = true;
    mctx.envGroup.add(wWall);

    // Moss on lower sections of town walls
    const cam_wallMossMat = new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.95, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    for (let cam_mossIdx = 0; cam_mossIdx < 20; cam_mossIdx++) {
      const cam_mossW = 0.4 + Math.random() * 0.6;
      const cam_mossH = 0.2 + Math.random() * 0.3;
      const cam_mossPatch = new THREE.Mesh(new THREE.PlaneGeometry(cam_mossW, cam_mossH), cam_wallMossMat);
      // Place on random wall face
      const cam_mossWall = Math.floor(Math.random() * 4);
      if (cam_mossWall === 0) { // North
        cam_mossPatch.position.set((Math.random() - 0.5) * w * 0.8, 0.3 + Math.random() * 0.8, -hd + 0.52);
      } else if (cam_mossWall === 1) { // South
        cam_mossPatch.position.set((Math.random() - 0.5) * w * 0.8, 0.3 + Math.random() * 0.8, hd - 0.52);
      } else if (cam_mossWall === 2) { // East
        cam_mossPatch.position.set(hw + 0.52, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * d * 0.8);
        cam_mossPatch.rotation.y = Math.PI / 2;
      } else { // West
        cam_mossPatch.position.set(-hw - 0.52, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * d * 0.8);
        cam_mossPatch.rotation.y = Math.PI / 2;
      }
      mctx.envGroup.add(cam_mossPatch);
    }

    // Stone block lines on town walls (horizontal grooves at intervals)
    const wallBlockLineMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
    for (let wbl = 0; wbl < 3; wbl++) {
      const wblY = 1 + wbl * 1.2;
      // North wall block lines
      const nBlockLine = new THREE.Mesh(new THREE.BoxGeometry(w - 2, 0.03, 0.06), wallBlockLineMat);
      nBlockLine.position.set(0, wblY, -hd + 0.53);
      mctx.envGroup.add(nBlockLine);
      // East wall block lines
      const eBlockLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, d - 2), wallBlockLineMat);
      eBlockLine.position.set(hw + 0.53, wblY, 0);
      mctx.envGroup.add(eBlockLine);
      // West wall block lines
      const wBlockLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, d - 2), wallBlockLineMat);
      wBlockLine.position.set(-hw - 0.53, wblY, 0);
      mctx.envGroup.add(wBlockLine);
    }
    // Wall corner towers (4)
    const wallTowerPositions = [
      [-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]
    ];
    for (const [wtx, wtz] of wallTowerPositions) {
      const wtGeo = new THREE.CylinderGeometry(1.5, 1.5, 6, 30);
      const wt = new THREE.Mesh(wtGeo, wallMat);
      wt.position.set(wtx, 8, wtz);
      wt.castShadow = true;
      mctx.envGroup.add(wt);
      const wtRoofGeo = new THREE.ConeGeometry(1.8, 2, 30);
      const wtRoofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
      const wtRoof = new THREE.Mesh(wtRoofGeo, wtRoofMat);
      wtRoof.position.set(wtx, 7, wtz);
      mctx.envGroup.add(wtRoof);
      // Wall tower arrow slit windows
      const wtSlitMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
      for (let wsi = 0; wsi < 2; wsi++) {
        const wtSlitGeo = new THREE.BoxGeometry(0.1, 0.5, 0.06);
        const wtSlit = new THREE.Mesh(wtSlitGeo, wtSlitMat);
        const wsAngle = (wsi / 2) * Math.PI;
        wtSlit.position.set(wtx + Math.cos(wsAngle) * 1.52, 7.5 + wsi * 1.2, wtz + Math.sin(wsAngle) * 1.52);
        mctx.envGroup.add(wtSlit);
      }
      // Wall tower foundation stones
      const wtFoundMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
      for (let wtfi = 0; wtfi < 4; wtfi++) {
        const wtFStoneGeo = new THREE.DodecahedronGeometry(0.13, 1);
        const wtFStone = new THREE.Mesh(wtFStoneGeo, wtFoundMat);
        const wtfAngle = (wtfi / 4) * Math.PI * 2;
        wtFStone.position.set(wtx + Math.cos(wtfAngle) * 1.55, 5.1, wtz + Math.sin(wtfAngle) * 1.55);
        mctx.envGroup.add(wtFStone);
      }
    }

    // Gatehouse towers (south side)
    for (const gSide of [-3, 3]) {
      const ghTowerGeo = new THREE.CylinderGeometry(1.5, 1.5, 7, 30);
      const ghTower = new THREE.Mesh(ghTowerGeo, wallMat);
      ghTower.position.set(gSide, 3.5, hd);
      ghTower.castShadow = true;
      mctx.envGroup.add(ghTower);
      const ghRoofGeo = new THREE.ConeGeometry(1.8, 2.5, 30);
      const ghRoofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
      const ghRoof = new THREE.Mesh(ghRoofGeo, ghRoofMat);
      ghRoof.position.set(gSide, 8, hd);
      mctx.envGroup.add(ghRoof);
      // Gatehouse arrow slit windows
      const ghSlitMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
      for (let ghi = 0; ghi < 3; ghi++) {
        const ghSlitGeo = new THREE.BoxGeometry(0.1, 0.6, 0.06);
        const ghSlit = new THREE.Mesh(ghSlitGeo, ghSlitMat);
        ghSlit.position.set(gSide, 2.5 + ghi * 1.8, hd + 1.52);
        mctx.envGroup.add(ghSlit);
      }
      // Gatehouse foundation stones
      const ghFoundMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
      for (let gfi = 0; gfi < 4; gfi++) {
        const ghFStoneGeo = new THREE.DodecahedronGeometry(0.15, 1);
        const ghFStone = new THREE.Mesh(ghFStoneGeo, ghFoundMat);
        const gfAngle = (gfi / 4) * Math.PI * 2;
        ghFStone.position.set(gSide + Math.cos(gfAngle) * 1.5, 0.12, hd + Math.sin(gfAngle) * 1.5);
        mctx.envGroup.add(ghFStone);
      }
    }

    // ═══════════════════════════════════════════════
    // MARKET SQUARE (center area, around 0,0)
    // ═══════════════════════════════════════════════

    // Market stalls (10)
    const stallColors = [0xcc3333, 0x3344cc, 0xcccc33, 0x33aa33, 0xcc6633, 0x8833aa, 0x33aaaa, 0xaa3366, 0x66aa33, 0xcc8833];
    for (let si = 0; si < 10; si++) {
      const stallGroup = new THREE.Group();
      const angle = (si / 10) * Math.PI * 2;
      const radius = 8 + (si % 2) * 2;

      // 4 poles
      for (let px = -1; px <= 1; px += 2) {
        for (let pz = -1; pz <= 1; pz += 2) {
          const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 23);
          const poleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.set(px * 0.8, 1.25, pz * 0.6);
          pole.castShadow = true;
          stallGroup.add(pole);
        }
      }

      // Canvas roof
      const canvasGeo = new THREE.BoxGeometry(2.0, 0.08, 1.5);
      const canvasMat = new THREE.MeshStandardMaterial({ color: stallColors[si], roughness: 0.7 });
      const canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.set(0, 2.5, 0);
      canvas.castShadow = true;
      stallGroup.add(canvas);

      // Counter
      const counterGeo = new THREE.BoxGeometry(1.6, 0.8, 0.5);
      const counterMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.set(0, 0.4, 0.5);
      counter.castShadow = true;
      stallGroup.add(counter);

      // Wares on counter (small colorful boxes)
      for (let ww = 0; ww < 3; ww++) {
        const wareGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
        const wareMat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.6 });
        const ware = new THREE.Mesh(wareGeo, wareMat);
        ware.position.set(-0.4 + ww * 0.4, 0.88, 0.5);
        stallGroup.add(ware);
      }
      // Canopy support cross-beams (higher poly with brackets and iron rings)
      const canopySupportMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
      const cam_bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
      const canopyBeamFront = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 12), canopySupportMat);
      canopyBeamFront.rotation.z = Math.PI / 2;
      canopyBeamFront.position.set(0, 2.5, 0.6);
      stallGroup.add(canopyBeamFront);
      const canopyBeamBack = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 12), canopySupportMat);
      canopyBeamBack.rotation.z = Math.PI / 2;
      canopyBeamBack.position.set(0, 2.5, -0.6);
      stallGroup.add(canopyBeamBack);
      // Metal brackets where beams meet posts
      for (const cam_beamZ of [0.6, -0.6]) {
        for (const cam_postX of [-0.8, 0.8]) {
          const cam_bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), cam_bracketMat);
          cam_bracket.position.set(cam_postX, 2.5, cam_beamZ);
          stallGroup.add(cam_bracket);
        }
      }
      // Iron rings on beams
      for (const cam_ringZ of [0.6, -0.6]) {
        const cam_ironRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 12), cam_bracketMat);
        cam_ironRing.position.set(0, 2.5, cam_ringZ);
        cam_ironRing.rotation.x = Math.PI / 2;
        stallGroup.add(cam_ironRing);
      }
      // Cloth draping from canopy edges (hanging triangles)
      const drapeMat = new THREE.MeshStandardMaterial({ color: stallColors[si], roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      for (let dr = 0; dr < 4; dr++) {
        const drapeGeo = new THREE.PlaneGeometry(0.4, 0.25);
        const drape = new THREE.Mesh(drapeGeo, drapeMat);
        drape.position.set(-0.75 + dr * 0.5, 2.35, 0.76);
        drape.rotation.x = 0.3;
        stallGroup.add(drape);
      }
      // Canopy scalloped valance on front (higher poly with trim fringe)
      for (let sv = 0; sv < 5; sv++) {
        const valance = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: stallColors[si], roughness: 0.7, side: THREE.DoubleSide }));
        valance.position.set(-0.8 + sv * 0.4, 2.42, 0.76);
        stallGroup.add(valance);
        // Trim/fringe detail along the bottom edge of each scallop
        for (let cam_fringeIdx = 0; cam_fringeIdx < 3; cam_fringeIdx++) {
          const cam_fringe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.01),
            new THREE.MeshStandardMaterial({ color: stallColors[si], roughness: 0.7 }));
          cam_fringe.position.set(-0.8 + sv * 0.4 + (cam_fringeIdx - 1) * 0.05, 2.3, 0.76);
          stallGroup.add(cam_fringe);
        }
      }

      stallGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      stallGroup.rotation.y = -angle + Math.PI;
      mctx.envGroup.add(stallGroup);
    }

    // Central well
    const wellGroup = new THREE.Group();
    const wellBaseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 44);
    const wellBaseMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.85 });
    const wellBase = new THREE.Mesh(wellBaseGeo, wellBaseMat);
    wellBase.position.y = 0.4;
    wellBase.castShadow = true;
    wellGroup.add(wellBase);
    // Inner dark water
    const wellWaterGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 44);
    const wellWaterMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.3, transparent: true, opacity: 0.7 });
    const wellWater = new THREE.Mesh(wellWaterGeo, wellWaterMat);
    wellWater.position.y = 0.75;
    wellGroup.add(wellWater);
    // Two upright posts
    for (const sx of [-0.6, 0.6]) {
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 23);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(sx, 1.65, 0);
      post.castShadow = true;
      wellGroup.add(post);
    }
    // Cross beam
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 23);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 2.9, 0);
    wellGroup.add(beam);
    // Bucket
    const bucketGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.15, 27);
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
    const bucket = new THREE.Mesh(bucketGeo, bucketMat);
    bucket.position.set(0, 2.2, 0);
    wellGroup.add(bucket);
    // Rope
    const ropeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.7, 17);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(0, 2.55, 0);
    wellGroup.add(rope);
    // Well foundation stones around base
    const wellFoundMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
    for (let wfi = 0; wfi < 8; wfi++) {
      const wfStoneGeo = new THREE.DodecahedronGeometry(0.1, 1);
      const wfStone = new THREE.Mesh(wfStoneGeo, wellFoundMat);
      const wfAngle = (wfi / 8) * Math.PI * 2;
      wfStone.position.set(Math.cos(wfAngle) * 1.6, 0.08, Math.sin(wfAngle) * 1.6);
      wellGroup.add(wfStone);
    }
    // Well roof ridge beam
    const wellRidgeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 27);
    const wellRidgeMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const wellRidge = new THREE.Mesh(wellRidgeGeo, wellRidgeMat);
    wellRidge.rotation.z = Math.PI / 2;
    wellRidge.position.set(0, 3.0, 0);
    wellGroup.add(wellRidge);
    // Well capstone trim on top edge
    const wellCapGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.06, 44);
    const wellCapMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.85 });
    const wellCap = new THREE.Mesh(wellCapGeo, wellCapMat);
    wellCap.position.y = 0.83;
    wellGroup.add(wellCap);
    // Well detail - decorative stone rim stones around top edge
    for (let wr = 0; wr < 12; wr++) {
      const rimAngle = (wr / 12) * Math.PI * 2;
      const rimStone = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.85 }));
      rimStone.position.set(Math.cos(rimAngle) * 1.45, 0.86, Math.sin(rimAngle) * 1.45);
      rimStone.rotation.y = rimAngle;
      wellGroup.add(rimStone);
    }
    // Well roof structure (small peaked roof over well)
    const wellRoofMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8, side: THREE.DoubleSide });
    const wellRoofL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), wellRoofMat);
    wellRoofL.position.set(0, 3.3, -0.2);
    wellRoofL.rotation.x = 0.5;
    wellGroup.add(wellRoofL);
    const wellRoofR = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), wellRoofMat);
    wellRoofR.position.set(0, 3.3, 0.2);
    wellRoofR.rotation.x = -0.5;
    wellGroup.add(wellRoofR);
    // Hanging chain from beam to bucket
    const wellChain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 }));
    wellChain.position.set(0.1, 2.5, 0);
    wellGroup.add(wellChain);
    // Moss on well stones
    for (let wm = 0; wm < 4; wm++) {
      const wellMoss = new THREE.Mesh(new THREE.PlaneGeometry(0.15 + Math.random() * 0.1, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.95, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      const wmAngle = (wm / 4) * Math.PI * 2 + Math.random() * 0.5;
      wellMoss.position.set(Math.cos(wmAngle) * 1.52, 0.5 + Math.random() * 0.3, Math.sin(wmAngle) * 1.52);
      wellMoss.rotation.y = wmAngle;
      wellGroup.add(wellMoss);
    }
    wellGroup.position.set(0, 0, 0);
    mctx.envGroup.add(wellGroup);

    // ═══════════════════════════════════════════════
    // BUILDINGS (25 scattered)
    // ═══════════════════════════════════════════════
    const buildingPositions: [number, number, number, number][] = [
      // [x, z, width, depth]
      [-18, -5, 3, 3], [-18, 0, 2.5, 3], [-18, 5, 3, 4], [-18, 10, 2, 3],
      [18, -5, 3, 3], [18, 0, 4, 3], [18, 5, 2.5, 2.5], [18, 10, 3, 3],
      [-12, 15, 3, 3], [-8, 15, 2.5, 3], [-4, 15, 3, 2], [4, 15, 2.5, 3],
      [8, 15, 3, 3], [12, 15, 3, 2.5],
      [-12, -18, 3, 3], [-8, -18, 2.5, 2], [-4, -18, 3, 3],
      [4, -18, 2.5, 3], [8, -18, 3, 3], [12, -18, 3, 2.5],
      [-12, -12, 2, 2], [12, -12, 2.5, 2.5],
      [-12, 8, 3, 3], [12, 8, 2.5, 2.5], [0, 18, 3, 2],
    ];

    const houseColors = [0x998866, 0xaa9977, 0x887755, 0xbb9977, 0x776655, 0x9a8a6a];
    const roofColors = [0x664422, 0x553311, 0x774433, 0x334466, 0x553322, 0x884433];

    for (let bi = 0; bi < buildingPositions.length; bi++) {
      const [bx, bz, bw, bd] = buildingPositions[bi];
      const bh = 3 + Math.random() * 2;
      const buildGroup = new THREE.Group();

      // Base walls
      const baseGeo = new THREE.BoxGeometry(bw, bh, bd);
      const baseMat = new THREE.MeshStandardMaterial({ color: houseColors[bi % houseColors.length], roughness: 0.85 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = bh / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      buildGroup.add(base);

      // Peaked roof (two angled planes) - aligned to walls
      const roofColor = roofColors[bi % roofColors.length];
      const roofW = bw + 0.4;
      const roofD = bd + 0.4;
      const roofH = 1.5 + Math.random() * 0.5;
      const slopeLen = Math.sqrt(roofD * roofD / 4 + roofH * roofH);
      const roofAngle = Math.atan2(roofD / 2, roofH);
      const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide });
      const roofLeft = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
      roofLeft.position.set(0, bh + roofH / 2, -roofD / 4);
      roofLeft.rotation.x = roofAngle;
      buildGroup.add(roofLeft);
      const roofRight = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
      roofRight.position.set(0, bh + roofH / 2, roofD / 4);
      roofRight.rotation.x = -roofAngle;
      buildGroup.add(roofRight);
      // Gable triangles (fill the ends of the roof)
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-roofD / 2, 0);
      gableShape.lineTo(0, roofH);
      gableShape.lineTo(roofD / 2, 0);
      gableShape.closePath();
      const gableGeo = new THREE.ShapeGeometry(gableShape);
      const gableMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide });
      const gableLeft = new THREE.Mesh(gableGeo, gableMat);
      gableLeft.rotation.y = Math.PI / 2;
      gableLeft.position.set(-roofW / 2, bh, 0);
      buildGroup.add(gableLeft);
      const gableRight = new THREE.Mesh(gableGeo, gableMat);
      gableRight.rotation.y = Math.PI / 2;
      gableRight.position.set(roofW / 2, bh, 0);
      buildGroup.add(gableRight);

      // Windows (emissive warm yellow)
      const windowMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffdd88, emissiveIntensity: 0.5, roughness: 0.3 });
      for (let wi = 0; wi < 2; wi++) {
        const winGeo = new THREE.BoxGeometry(0.35, 0.4, 0.05);
        const win = new THREE.Mesh(winGeo, windowMat);
        win.position.set(-bw * 0.2 + wi * bw * 0.4, bh * 0.6, bd / 2 + 0.03);
        buildGroup.add(win);
        // Back side windows
        const winBack = new THREE.Mesh(winGeo, windowMat);
        winBack.position.set(-bw * 0.2 + wi * bw * 0.4, bh * 0.6, -bd / 2 - 0.03);
        buildGroup.add(winBack);
      }

      // Door
      const doorGeo = new THREE.BoxGeometry(0.6, 1.2, 0.06);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.6, bd / 2 + 0.03);
      buildGroup.add(door);

      // Window frames/shutters
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      for (let wfi = 0; wfi < 2; wfi++) {
        const wx = -bw * 0.2 + wfi * bw * 0.4;
        const wy = bh * 0.6;
        // Horizontal sill under window (front)
        const sillGeo = new THREE.BoxGeometry(0.5, 0.04, 0.08);
        const sill = new THREE.Mesh(sillGeo, frameMat);
        sill.position.set(wx, wy - 0.22, bd / 2 + 0.05);
        buildGroup.add(sill);
        // Left shutter (front)
        const shutterGeo = new THREE.PlaneGeometry(0.12, 0.4);
        const shutterL = new THREE.Mesh(shutterGeo, frameMat);
        shutterL.position.set(wx - 0.22, wy, bd / 2 + 0.05);
        buildGroup.add(shutterL);
        // Right shutter (front)
        const shutterR = new THREE.Mesh(shutterGeo, frameMat);
        shutterR.position.set(wx + 0.22, wy, bd / 2 + 0.05);
        buildGroup.add(shutterR);
      }

      // Door frame
      const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
      const doorLintelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 27);
      const doorLintel = new THREE.Mesh(doorLintelGeo, doorFrameMat);
      doorLintel.rotation.z = Math.PI / 2;
      doorLintel.position.set(0, 1.22, bd / 2 + 0.05);
      buildGroup.add(doorLintel);
      const doorPostLGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 27);
      const doorPostL = new THREE.Mesh(doorPostLGeo, doorFrameMat);
      doorPostL.position.set(-0.32, 0.6, bd / 2 + 0.05);
      buildGroup.add(doorPostL);
      const doorPostR = new THREE.Mesh(doorPostLGeo, doorFrameMat);
      doorPostR.position.set(0.32, 0.6, bd / 2 + 0.05);
      buildGroup.add(doorPostR);

      // Foundation stones at base
      const foundationMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
      for (let fi = 0; fi < 6; fi++) {
        const fStoneGeo = new THREE.DodecahedronGeometry(0.12, 1);
        const fStone = new THREE.Mesh(fStoneGeo, foundationMat);
        const fAngle = (fi / 6) * Math.PI * 2;
        fStone.position.set(
          Math.cos(fAngle) * (bw / 2 - 0.05),
          0.1,
          Math.sin(fAngle) * (bd / 2 - 0.05)
        );
        buildGroup.add(fStone);
      }

      // Roof ridge (thin cylinder along the peak)
      const ridgeMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
      const ridgeGeo = new THREE.CylinderGeometry(0.04, 0.04, roofW, 27);
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(0, bh + roofH, 0);
      buildGroup.add(ridge);

      // Cornerstones/quoins on building corners
      const quoinMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.85 });
      const quoinPositions: [number, number][] = [
        [-bw / 2, bd / 2], [bw / 2, bd / 2],
        [-bw / 2, -bd / 2], [bw / 2, -bd / 2],
      ];
      for (const [qx, qz] of quoinPositions) {
        for (let qi = 0; qi < 3; qi++) {
          const quoinGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
          const quoin = new THREE.Mesh(quoinGeo, quoinMat);
          quoin.position.set(qx, 0.2 + qi * (bh / 3), qz);
          buildGroup.add(quoin);
        }
      }

      // Wooden beam supports on building walls (brown cylinders crossing walls)
      const beamSupportMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.85 });
      // Horizontal beam under roofline
      const hBeamSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, bw + 0.3, 10), beamSupportMat);
      hBeamSupport.rotation.z = Math.PI / 2;
      hBeamSupport.position.set(0, bh - 0.1, bd / 2 + 0.04);
      buildGroup.add(hBeamSupport);
      // Diagonal braces from corners
      if (Math.random() > 0.4) {
        for (const bsx of [-1, 1]) {
          const braceLen = Math.sqrt((bw * 0.3) ** 2 + (bh * 0.3) ** 2);
          const braceAngle = Math.atan2(bh * 0.3, bw * 0.3);
          const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, braceLen, 8), beamSupportMat);
          brace.rotation.z = bsx > 0 ? braceAngle : -braceAngle;
          brace.position.set(bsx * bw * 0.25, bh * 0.7, bd / 2 + 0.04);
          buildGroup.add(brace);
        }
      }
      // Vertical beam posts at corners (visible on front face)
      for (const vbx of [-bw / 2 + 0.03, bw / 2 - 0.03]) {
        const vBeamPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, 0.06), beamSupportMat);
        vBeamPost.position.set(vbx, bh / 2, bd / 2 + 0.04);
        buildGroup.add(vBeamPost);
      }
      // Chimney (every other building)
      if (bi % 2 === 0) {
        const chimGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.5, 23);
        const chimMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
        const chim = new THREE.Mesh(chimGeo, chimMat);
        chim.position.set(bw * 0.25, bh + 1.0, -bd * 0.2);
        chim.castShadow = true;
        buildGroup.add(chim);
        // Smoke puff
        const smokeGeo = new THREE.SphereGeometry(0.2, 23, 20);
        const smokeMat = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.25, roughness: 1.0 });
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.position.set(bw * 0.25, bh + 1.9, -bd * 0.2);
        buildGroup.add(smoke);
      }

      buildGroup.position.set(bx, 0, bz);
      mctx.envGroup.add(buildGroup);
    }

    // ── Tavern (larger, near center, x=6, z=5) ──
    const tavernGroup = new THREE.Group();
    const tavernGeo = new THREE.BoxGeometry(5, 5, 4);
    const tavernMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.75 });
    const tavern = new THREE.Mesh(tavernGeo, tavernMat);
    tavern.position.y = 2.5;
    tavern.castShadow = true;
    tavernGroup.add(tavern);
    // Tavern roof
    const tavernRoofGeo = new THREE.BoxGeometry(5.6, 0.3, 4.6);
    const tavernRoofMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
    const tavernRoof = new THREE.Mesh(tavernRoofGeo, tavernRoofMat);
    tavernRoof.position.y = 5.15;
    tavernRoof.rotation.x = 0.1;
    tavernGroup.add(tavernRoof);
    // Hanging sign bracket
    const bracketGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 20);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.rotation.z = Math.PI / 2;
    bracket.position.set(2.8, 4, 2);
    tavernGroup.add(bracket);
    const signGeo = new THREE.BoxGeometry(0.6, 0.4, 0.04);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.6 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(3.2, 3.6, 2);
    tavernGroup.add(sign);
    // Tavern windows emissive
    const tavernWinMat = new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa44, emissiveIntensity: 0.6, roughness: 0.3 });
    for (let twi = 0; twi < 3; twi++) {
      const twGeo = new THREE.BoxGeometry(0.5, 0.5, 0.05);
      const tw = new THREE.Mesh(twGeo, tavernWinMat);
      tw.position.set(-1.5 + twi * 1.5, 3, 2.03);
      tavernGroup.add(tw);
    }
    // Tavern door
    const tavernDoorGeo = new THREE.BoxGeometry(0.8, 1.5, 0.06);
    const tavernDoorMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
    const tavernDoor = new THREE.Mesh(tavernDoorGeo, tavernDoorMat);
    tavernDoor.position.set(0, 0.75, 2.03);
    tavernGroup.add(tavernDoor);
    // Warm interior glow
    const tavernLight = new THREE.PointLight(0xffaa44, 0.8, 12);
    tavernLight.position.set(6, 2, 5);
    mctx.scene.add(tavernLight);
    mctx.torchLights.push(tavernLight);
    // Tavern door frame
    const tvDoorLintelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 27);
    const tvDoorFrameMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
    const tvDoorLintel = new THREE.Mesh(tvDoorLintelGeo, tvDoorFrameMat);
    tvDoorLintel.rotation.z = Math.PI / 2;
    tvDoorLintel.position.set(0, 1.52, 2.05);
    tavernGroup.add(tvDoorLintel);
    // Tavern foundation stones
    const tvFoundMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
    for (let tfi = 0; tfi < 8; tfi++) {
      const tvFStoneGeo = new THREE.DodecahedronGeometry(0.15, 1);
      const tvFStone = new THREE.Mesh(tvFStoneGeo, tvFoundMat);
      tvFStone.position.set(-2.2 + tfi * 0.65, 0.12, 2.05);
      tavernGroup.add(tvFStone);
    }
    // Tavern window shutters
    const tvShutterMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
    for (let tsi = 0; tsi < 3; tsi++) {
      const tvShutLGeo = new THREE.PlaneGeometry(0.15, 0.5);
      const tvShutL = new THREE.Mesh(tvShutLGeo, tvShutterMat);
      tvShutL.position.set(-1.5 + tsi * 1.5 - 0.3, 3, 2.05);
      tavernGroup.add(tvShutL);
      const tvShutR = new THREE.Mesh(tvShutLGeo, tvShutterMat);
      tvShutR.position.set(-1.5 + tsi * 1.5 + 0.3, 3, 2.05);
      tavernGroup.add(tvShutR);
    }
    // Tavern cornerstones/quoins
    const tvQuoinMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.85 });
    for (const [tvqx, tvqz] of [[-2.5, 2], [2.5, 2], [-2.5, -2], [2.5, -2]]) {
      for (let tvqi = 0; tvqi < 3; tvqi++) {
        const tvQuoinGeo = new THREE.BoxGeometry(0.18, 0.3, 0.18);
        const tvQuoin = new THREE.Mesh(tvQuoinGeo, tvQuoinMat);
        tvQuoin.position.set(tvqx, 0.3 + tvqi * 1.6, tvqz);
        tavernGroup.add(tvQuoin);
      }
    }
    tavernGroup.position.set(6, 0, 5);
    mctx.envGroup.add(tavernGroup);

    // ── Chapel (near castle, x=-6, z=-20) ──
    const chapelGroup = new THREE.Group();
    const chapelGeo = new THREE.BoxGeometry(4, 6, 5);
    const chapelMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.75 });
    const chapel = new THREE.Mesh(chapelGeo, chapelMat);
    chapel.position.y = 3;
    chapel.castShadow = true;
    chapelGroup.add(chapel);
    // Pointed roof
    const chapelRoofGeo = new THREE.ConeGeometry(3.5, 3, 17);
    const chapelRoofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
    const chapelRoof = new THREE.Mesh(chapelRoofGeo, chapelRoofMat);
    chapelRoof.position.y = 7.5;
    chapelRoof.rotation.y = Math.PI / 4;
    chapelRoof.castShadow = true;
    chapelGroup.add(chapelRoof);
    // Cross on top (thin cylinders forming +)
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.6, roughness: 0.3 });
    const crossVGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 23);
    const crossV = new THREE.Mesh(crossVGeo, crossMat);
    crossV.position.set(0, 9.75, 0);
    chapelGroup.add(crossV);
    const crossHGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 23);
    const crossH = new THREE.Mesh(crossHGeo, crossMat);
    crossH.rotation.z = Math.PI / 2;
    crossH.position.set(0, 10.2, 0);
    chapelGroup.add(crossH);
    // Stained glass window
    const sgWinGeo = new THREE.BoxGeometry(1.2, 2.0, 0.06);
    const sgWinMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.4, roughness: 0.3, transparent: true, opacity: 0.8 });
    const sgWin = new THREE.Mesh(sgWinGeo, sgWinMat);
    sgWin.position.set(0, 4, 2.53);
    chapelGroup.add(sgWin);
    // Chapel door frame (arched lintel)
    const chDoorLintelGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 27);
    const chDoorFrameMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
    const chDoorLintel = new THREE.Mesh(chDoorLintelGeo, chDoorFrameMat);
    chDoorLintel.rotation.z = Math.PI / 2;
    chDoorLintel.position.set(0, 2.2, 2.55);
    chapelGroup.add(chDoorLintel);
    // Chapel foundation stones
    const chFoundMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 });
    for (let cfi = 0; cfi < 8; cfi++) {
      const chFStoneGeo = new THREE.DodecahedronGeometry(0.14, 1);
      const chFStone = new THREE.Mesh(chFStoneGeo, chFoundMat);
      const cfAngle = (cfi / 8) * Math.PI * 2;
      chFStone.position.set(
        Math.cos(cfAngle) * 1.8,
        0.12,
        Math.sin(cfAngle) * 2.3
      );
      chapelGroup.add(chFStone);
    }
    // Chapel cornerstones/quoins
    const chQuoinMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.8 });
    for (const [cqx, cqz] of [[-2, 2.5], [2, 2.5], [-2, -2.5], [2, -2.5]]) {
      for (let cqi = 0; cqi < 4; cqi++) {
        const chQuoinGeo = new THREE.BoxGeometry(0.18, 0.3, 0.18);
        const chQuoin = new THREE.Mesh(chQuoinGeo, chQuoinMat);
        chQuoin.position.set(cqx, 0.3 + cqi * 1.4, cqz);
        chapelGroup.add(chQuoin);
      }
    }
    // Chapel window frame around stained glass
    const chWinFrameMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
    const chWfTopGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 27);
    const chWfTop = new THREE.Mesh(chWfTopGeo, chWinFrameMat);
    chWfTop.rotation.z = Math.PI / 2;
    chWfTop.position.set(0, 5.05, 2.55);
    chapelGroup.add(chWfTop);
    const chWfBotGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 27);
    const chWfBot = new THREE.Mesh(chWfBotGeo, chWinFrameMat);
    chWfBot.rotation.z = Math.PI / 2;
    chWfBot.position.set(0, 2.95, 2.55);
    chapelGroup.add(chWfBot);
    chapelGroup.position.set(-6, 0, -20);
    mctx.envGroup.add(chapelGroup);

    // ═══════════════════════════════════════════════
    // BLACKSMITH AREA (x=-15, z=-10)
    // ═══════════════════════════════════════════════
    const forgeGroup = new THREE.Group();
    // Open shed roof
    const shedRoofGeo = new THREE.BoxGeometry(4, 0.15, 3);
    const shedRoofMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const shedRoof = new THREE.Mesh(shedRoofGeo, shedRoofMat);
    shedRoof.position.set(0, 2.8, 0);
    shedRoof.castShadow = true;
    forgeGroup.add(shedRoof);
    // Shed poles
    for (const [fpx, fpz] of [[-1.8, -1.3], [1.8, -1.3], [-1.8, 1.3], [1.8, 1.3]]) {
      const fpGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 23);
      const fpMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const fp = new THREE.Mesh(fpGeo, fpMat);
      fp.position.set(fpx, 1.4, fpz);
      forgeGroup.add(fp);
    }
    // Anvil
    const anvilBaseGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const anvilBase = new THREE.Mesh(anvilBaseGeo, anvilMat);
    anvilBase.position.set(0, 0.3, 0);
    forgeGroup.add(anvilBase);
    const anvilTopGeo = new THREE.BoxGeometry(0.7, 0.15, 0.35);
    const anvilTop = new THREE.Mesh(anvilTopGeo, anvilMat);
    anvilTop.position.set(0, 0.68, 0);
    anvilTop.castShadow = true;
    forgeGroup.add(anvilTop);
    // Forge fire
    const forgeFireGeo = new THREE.BoxGeometry(1.0, 0.6, 0.8);
    const forgeFireMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const forgeFire = new THREE.Mesh(forgeFireGeo, forgeFireMat);
    forgeFire.position.set(-1.2, 0.3, 0);
    forgeGroup.add(forgeFire);
    const emberGeo = new THREE.SphereGeometry(0.3, 27, 23);
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 2.0 });
    const forgeEmber = new THREE.Mesh(emberGeo, emberMat);
    forgeEmber.position.set(-1.2, 0.7, 0);
    forgeGroup.add(forgeEmber);
    // Forge point light
    const forgeLight = new THREE.PointLight(0xff6622, 1.0, 10);
    forgeLight.position.set(-15 - 1.2, 1.0, -10);
    mctx.scene.add(forgeLight);
    mctx.torchLights.push(forgeLight);
    // Weapon rack
    const rackGeo = new THREE.BoxGeometry(0.1, 1.5, 1.5);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(1.5, 0.75, 0);
    forgeGroup.add(rack);
    // Weapons on rack
    for (let wri = 0; wri < 3; wri++) {
      const wpGeo = new THREE.BoxGeometry(0.06, 1.0, 0.04);
      const wpMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.7, roughness: 0.2 });
      const wp = new THREE.Mesh(wpGeo, wpMat);
      wp.position.set(1.55, 0.8, -0.4 + wri * 0.4);
      wp.rotation.z = 0.1;
      forgeGroup.add(wp);
    }
    forgeGroup.position.set(-15, 0, -10);
    mctx.envGroup.add(forgeGroup);

    // ═══════════════════════════════════════════════
    // VENDOR MARKERS
    // ═══════════════════════════════════════════════
    const vendorTypeColors: Record<string, number> = {
      [VendorType.BLACKSMITH]: 0xff6600,
      [VendorType.ARCANIST]: 0x8844ff,
      [VendorType.JEWELER]: 0x44ddff,
      [VendorType.ALCHEMIST]: 0x44ff44,
      [VendorType.GENERAL_MERCHANT]: 0xffdd00,
    };

    for (const vdef of VENDOR_DEFS) {
      const vendorMarker = new THREE.Group();
      // Tall post
      const vPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 23);
      const vPostMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const vPost = new THREE.Mesh(vPostGeo, vPostMat);
      vPost.position.y = 1.5;
      vPost.castShadow = true;
      vendorMarker.add(vPost);
      // Sign box
      const vSignGeo = new THREE.BoxGeometry(0.5, 0.35, 0.05);
      const vSignMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
      const vSign = new THREE.Mesh(vSignGeo, vSignMat);
      vSign.position.set(0.3, 2.5, 0);
      vendorMarker.add(vSign);
      // Emissive sphere on top
      const vColor = vendorTypeColors[vdef.type] || 0xffffff;
      const vSphereGeo = new THREE.SphereGeometry(0.2, 27, 23);
      const vSphereMat = new THREE.MeshStandardMaterial({ color: vColor, emissive: vColor, emissiveIntensity: 1.0 });
      const vSphere = new THREE.Mesh(vSphereGeo, vSphereMat);
      vSphere.position.set(0, 3.2, 0);
      vendorMarker.add(vSphere);
      // Point light
      const vLight = new THREE.PointLight(vColor, 0.5, 6);
      vLight.position.set(vdef.x, 3.2, vdef.z);
      mctx.scene.add(vLight);
      mctx.torchLights.push(vLight);

      vendorMarker.position.set(vdef.x, 0, vdef.z);
      mctx.envGroup.add(vendorMarker);
    }

    // ═══════════════════════════════════════════════
    // DECORATIVE ELEMENTS
    // ═══════════════════════════════════════════════

    // Hay bales (6)
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 });
    const hayPositions = [[-10, 2], [-11, 3], [10, -2], [11, -3], [5, 12], [-5, -12]];
    for (const [hx, hz] of hayPositions) {
      const hayGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 30);
      const hay = new THREE.Mesh(hayGeo, hayMat);
      hay.position.set(hx, 0.4, hz);
      hay.rotation.z = Math.PI / 2;
      hay.rotation.y = Math.random() * 0.5;
      hay.castShadow = true;
      mctx.envGroup.add(hay);
    }

    // Barrels (10)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
    for (let bri = 0; bri < 10; bri++) {
      const barrelGeo = new THREE.CylinderGeometry(0.25, 0.22, 0.6, 27);
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      const bAngle = (bri / 10) * Math.PI * 2;
      const bRadius = 13 + (bri % 3);
      barrel.position.set(
        Math.cos(bAngle) * bRadius + (Math.random() - 0.5) * 2,
        0.3,
        Math.sin(bAngle) * bRadius + (Math.random() - 0.5) * 2
      );
      barrel.castShadow = true;
      mctx.envGroup.add(barrel);
      // Band on barrel
      const bandGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.04, 27);
      const bandMtl = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
      const band = new THREE.Mesh(bandGeo, bandMtl);
      band.position.copy(barrel.position);
      band.position.y += 0.1;
      mctx.envGroup.add(band);
      // Extra torus rings on barrel
      for (const ringY of [-0.1, 0.15]) {
        const ringGeo = new THREE.TorusGeometry(0.255, 0.012, 27, 36);
        const ring = new THREE.Mesh(ringGeo, bandMtl);
        ring.position.copy(barrel.position);
        ring.position.y += ringY;
        ring.rotation.x = Math.PI / 2;
        mctx.envGroup.add(ring);
      }
      // Shadow disc under barrel
      const bShadowGeo = new THREE.CircleGeometry(0.32, 36);
      const bShadowMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.3, depthWrite: false });
      const bShadow = new THREE.Mesh(bShadowGeo, bShadowMat);
      bShadow.rotation.x = -Math.PI / 2;
      bShadow.position.set(barrel.position.x, 0.01, barrel.position.z);
      mctx.envGroup.add(bShadow);
    }

    // Carts (3)
    const cartPositions: [number, number, number][] = [[-8, -5, 0.3], [9, 3, -0.5], [2, -14, 0.8]];
    for (const [cx, cz, cRot] of cartPositions) {
      const cartGroup = new THREE.Group();
      // Platform
      const platGeo = new THREE.BoxGeometry(2, 0.12, 1);
      const platMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const plat = new THREE.Mesh(platGeo, platMat);
      plat.position.y = 0.5;
      cartGroup.add(plat);
      // Wheels
      for (const [wx, wz] of [[-0.7, -0.5], [-0.7, 0.5], [0.7, -0.5], [0.7, 0.5]]) {
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 30);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.3, wz);
        cartGroup.add(wheel);
      }
      // Handle
      const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 20);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.rotation.z = Math.PI / 3;
      handle.position.set(-1.4, 0.9, 0);
      cartGroup.add(handle);
      // Cross-bracing under platform
      const braceMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      for (const [bx1, bz1, bx2, bz2] of [[-0.7, -0.5, 0.7, 0.5], [-0.7, 0.5, 0.7, -0.5]]) {
        const braceLen = Math.sqrt((bx2 - bx1) ** 2 + (bz2 - bz1) ** 2);
        const braceGeo = new THREE.CylinderGeometry(0.015, 0.015, braceLen, 27);
        const brace = new THREE.Mesh(braceGeo, braceMat);
        brace.position.set((bx1 + bx2) / 2, 0.44, (bz1 + bz2) / 2);
        brace.rotation.z = Math.PI / 2;
        brace.rotation.x = Math.atan2(bz2 - bz1, bx2 - bx1);
        cartGroup.add(brace);
      }
      // Shadow disc under cart
      const cShadowGeo = new THREE.CircleGeometry(1.1, 36);
      const cShadowMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.25, depthWrite: false });
      const cShadow = new THREE.Mesh(cShadowGeo, cShadowMat);
      cShadow.rotation.x = -Math.PI / 2;
      cShadow.position.y = 0.01;
      cartGroup.add(cShadow);
      cartGroup.position.set(cx, 0, cz);
      cartGroup.rotation.y = cRot;
      mctx.envGroup.add(cartGroup);
    }

    // Trees (8) - small deciduous, placed far from center to not block buildings
    const treeGreens = [0x448833, 0x55aa44, 0x669944, 0x778833, 0xaa8833, 0xcc6622];
    for (let ti = 0; ti < 8; ti++) {
      const treeGroup = new THREE.Group();
      const trunkH = 1.0 + Math.random() * 0.8;
      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, trunkH, 23);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      // Small sphere crown
      const crownR = 0.5 + Math.random() * 0.4;
      const crownGeo = new THREE.SphereGeometry(crownR, 44, 23);
      const crownMat = new THREE.MeshStandardMaterial({ color: treeGreens[ti % treeGreens.length], roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = trunkH + crownR * 0.6;
      crown.castShadow = true;
      treeGroup.add(crown);
      // Extra leaf clusters
      for (let lci = 0; lci < 3; lci++) {
        const lcR = crownR * (0.35 + Math.random() * 0.2);
        const lcGeo = new THREE.SphereGeometry(lcR, 36, 27);
        const lc = new THREE.Mesh(lcGeo, crownMat);
        const lcAngle = (lci / 3) * Math.PI * 2 + Math.random() * 0.5;
        lc.position.set(
          Math.cos(lcAngle) * crownR * 0.6,
          trunkH + crownR * 0.5 + (Math.random() - 0.5) * crownR * 0.4,
          Math.sin(lcAngle) * crownR * 0.6
        );
        lc.castShadow = true;
        treeGroup.add(lc);
      }
      // Shadow disc under tree
      const tShadowGeo = new THREE.CircleGeometry(crownR * 1.2, 36);
      const tShadowMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.25, depthWrite: false });
      const tShadow = new THREE.Mesh(tShadowGeo, tShadowMat);
      tShadow.rotation.x = -Math.PI / 2;
      tShadow.position.y = 0.01;
      treeGroup.add(tShadow);
      // Place at far edges only
      const tAngle = (ti / 8) * Math.PI * 2;
      const tRadius = hw * 0.85 + Math.random() * 3;
      treeGroup.position.set(
        Math.cos(tAngle) * tRadius,
        0,
        Math.sin(tAngle) * tRadius
      );
      mctx.envGroup.add(treeGroup);
    }

    // Flower boxes (8) - near buildings (detailed)
    const flowerColors = [0xff4466, 0xff88aa, 0xffdd44, 0xff6633, 0xaa44ff, 0x44aaff, 0xff44aa, 0xffaa44];
    for (let fi = 0; fi < 8; fi++) {
      const fboxGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5A3520, roughness: 0.85 });

      // Main box shell
      const fbox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.2), woodMat);
      fboxGroup.add(fbox);

      // Wooden plank strips on front/back
      for (let ps = 0; ps < 5; ps++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.005), darkWoodMat);
        plank.position.set(-0.2 + ps * 0.1, 0, 0.101);
        fboxGroup.add(plank);
        const plankBack = plank.clone();
        plankBack.position.z = -0.101;
        fboxGroup.add(plankBack);
      }
      // Side plank strips
      for (let ps = 0; ps < 2; ps++) {
        const sidePlank = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.15, 0.09), darkWoodMat);
        sidePlank.position.set(ps === 0 ? -0.251 : 0.251, 0, -0.05 + ps * 0.1);
        fboxGroup.add(sidePlank);
      }
      // Corner posts
      for (const cx of [-0.24, 0.24]) {
        for (const cz of [-0.09, 0.09]) {
          const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.17, 0.025), darkWoodMat);
          cornerPost.position.set(cx, 0, cz);
          fboxGroup.add(cornerPost);
        }
      }

      // Soil visible inside
      const soil = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x3B2510, roughness: 0.95 }));
      soil.position.y = 0.06;
      fboxGroup.add(soil);

      // Flowers with stems and varied petals
      const petalColors = [flowerColors[fi], flowerColors[(fi + 3) % 8], flowerColors[(fi + 5) % 8]];
      for (let ff = 0; ff < 5; ff++) {
        const stemH = 0.08 + Math.random() * 0.06;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, stemH, 8),
          new THREE.MeshStandardMaterial({ color: 0x2d7a1e, roughness: 0.8 }));
        const fx = -0.18 + ff * 0.09 + (Math.random() - 0.5) * 0.03;
        const fz = (Math.random() - 0.5) * 0.08;
        stem.position.set(fx, 0.08 + stemH / 2, fz);
        fboxGroup.add(stem);

        // Flower center
        const flCenter = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xffee44, roughness: 0.6 }));
        flCenter.position.set(fx, 0.08 + stemH + 0.02, fz);
        fboxGroup.add(flCenter);
        // Petals around center
        const flColor = petalColors[ff % petalColors.length];
        for (let p = 0; p < 5; p++) {
          const petalGeo = new THREE.SphereGeometry(0.022, 8, 6);
          petalGeo.scale(1, 0.5, 1);
          const petal = new THREE.Mesh(petalGeo, new THREE.MeshStandardMaterial({ color: flColor, roughness: 0.5 }));
          const pa = (p / 5) * Math.PI * 2;
          petal.position.set(fx + Math.cos(pa) * 0.03, 0.08 + stemH + 0.02, fz + Math.sin(pa) * 0.03);
          fboxGroup.add(petal);
        }

        // Leaf on stem
        if (ff % 2 === 0) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x3a8a2a, roughness: 0.7, side: THREE.DoubleSide }));
          leaf.position.set(fx + 0.025, 0.08 + stemH * 0.5, fz);
          leaf.rotation.z = -0.4;
          leaf.rotation.y = Math.random() * Math.PI;
          fboxGroup.add(leaf);
        }
      }

      // Trailing vines on front
      for (let vi = 0; vi < 3; vi++) {
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.06 + vi * 0.02, 6),
          new THREE.MeshStandardMaterial({ color: 0x2d6b1e, roughness: 0.8 }));
        vine.position.set(-0.12 + vi * 0.12, -0.04 - vi * 0.015, 0.1);
        vine.rotation.z = (Math.random() - 0.5) * 0.3;
        fboxGroup.add(vine);
        const vLeaf = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.015),
          new THREE.MeshStandardMaterial({ color: 0x3a8a2a, roughness: 0.7, side: THREE.DoubleSide }));
        vLeaf.position.set(vine.position.x + 0.015, vine.position.y - 0.02, 0.1);
        vLeaf.rotation.z = 0.5;
        fboxGroup.add(vLeaf);
      }

      const fbi = fi < buildingPositions.length ? fi : 0;
      const [fbx, fbz] = buildingPositions[fbi];
      fboxGroup.position.set(fbx, 1.5, fbz + 1.8);
      mctx.envGroup.add(fboxGroup);
    }

    // Street lamps (6) with glass panes, decorative metalwork, chain links
    const lampPositions: [number, number][] = [[-5, -3], [5, -3], [-5, 5], [5, 5], [-10, 0], [10, 0]];
    const cam_lampMetalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    for (const [lx, lz] of lampPositions) {
      const lampGroup = new THREE.Group();
      // Pole (higher poly)
      const lampPoleGeo = new THREE.CylinderGeometry(0.04, 0.06, 3.5, 16);
      const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });
      const lampPole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      lampPole.position.y = 1.75;
      lampPole.castShadow = true;
      lampGroup.add(lampPole);
      // Decorative metalwork scroll at top of pole
      const cam_lampScrollArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 10), cam_lampMetalMat);
      cam_lampScrollArm.position.set(0.15, 3.4, 0);
      cam_lampScrollArm.rotation.z = -0.5;
      lampGroup.add(cam_lampScrollArm);
      // Scroll curl at tip
      const cam_lampCurl = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI), cam_lampMetalMat);
      cam_lampCurl.position.set(0.3, 3.55, 0);
      cam_lampCurl.rotation.z = -1.2;
      lampGroup.add(cam_lampCurl);
      // Lantern housing frame (4 vertical bars forming a cage)
      for (let cam_lbi = 0; cam_lbi < 4; cam_lbi++) {
        const cam_lbAngle = (cam_lbi / 4) * Math.PI * 2;
        const cam_lampBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), cam_lampMetalMat);
        cam_lampBar.position.set(Math.cos(cam_lbAngle) * 0.1, 3.6, Math.sin(cam_lbAngle) * 0.1);
        lampGroup.add(cam_lampBar);
      }
      // Glass panes (4 faces of the lantern)
      const cam_glassMat = new THREE.MeshStandardMaterial({ color: 0xffeecc, transparent: true, opacity: 0.3, roughness: 0.1, side: THREE.DoubleSide });
      for (let cam_gpIdx = 0; cam_gpIdx < 4; cam_gpIdx++) {
        const cam_gpAngle = (cam_gpIdx / 4) * Math.PI * 2;
        const cam_glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.25), cam_glassMat);
        cam_glassPane.position.set(Math.cos(cam_gpAngle) * 0.09, 3.6, Math.sin(cam_gpAngle) * 0.09);
        cam_glassPane.rotation.y = cam_gpAngle + Math.PI / 2;
        lampGroup.add(cam_glassPane);
      }
      // Top cap on lantern
      const cam_lampCap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 12), cam_lampMetalMat);
      cam_lampCap.position.y = 3.79;
      lampGroup.add(cam_lampCap);
      // Bottom plate on lantern
      const cam_lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12), cam_lampMetalMat);
      cam_lampBase.position.y = 3.44;
      lampGroup.add(cam_lampBase);
      // Light sphere (inside lantern housing)
      const lampSphGeo = new THREE.SphereGeometry(0.08, 16, 12);
      const lampSphMat = new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xffcc66, emissiveIntensity: 1.0 });
      const lampSph = new THREE.Mesh(lampSphGeo, lampSphMat);
      lampSph.position.y = 3.6;
      lampGroup.add(lampSph);
      // Hanging chain links from scroll arm to lantern
      for (let cam_chainIdx = 0; cam_chainIdx < 3; cam_chainIdx++) {
        const cam_chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.004, 4, 8), cam_lampMetalMat);
        cam_chainLink.position.set(0.28 - cam_chainIdx * 0.05, 3.5 - cam_chainIdx * 0.04, 0);
        cam_chainLink.rotation.x = Math.PI / 2;
        cam_chainLink.rotation.z = cam_chainIdx % 2 === 0 ? 0 : Math.PI / 2;
        lampGroup.add(cam_chainLink);
      }
      // Decorative iron ring around pole mid-section
      const cam_poleRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.01, 6, 12), cam_lampMetalMat);
      cam_poleRing.position.y = 2.5;
      cam_poleRing.rotation.x = Math.PI / 2;
      lampGroup.add(cam_poleRing);
      // Point light
      const lampLight = new THREE.PointLight(0xffcc66, 0.6, 10);
      lampLight.position.set(lx, 3.6, lz);
      mctx.scene.add(lampLight);
      mctx.torchLights.push(lampLight);
      // Shadow disc under lamp post
      const lpShadowGeo = new THREE.CircleGeometry(0.4, 36);
      const lpShadowMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.25, depthWrite: false });
      const lpShadow = new THREE.Mesh(lpShadowGeo, lpShadowMat);
      lpShadow.rotation.x = -Math.PI / 2;
      lpShadow.position.y = 0.01;
      lampGroup.add(lpShadow);
      lampGroup.position.set(lx, 0, lz);
      mctx.envGroup.add(lampGroup);
    }

    // Flags/Pennants (4) on tall poles
    const flagPositions: [number, number, number][] = [[-12, -15, 0xcc2222], [12, -15, 0x2244cc], [-12, 12, 0xcc2222], [12, 12, 0x2244cc]];
    for (const [fx, fz, fColor] of flagPositions) {
      const flagGroup = new THREE.Group();
      const fpGeo = new THREE.CylinderGeometry(0.04, 0.04, 5, 23);
      const fpMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const fpole = new THREE.Mesh(fpGeo, fpMat);
      fpole.position.y = 2.5;
      fpole.castShadow = true;
      flagGroup.add(fpole);
      const flagGeo = new THREE.PlaneGeometry(1.2, 0.8);
      const flagMat = new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.7, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.6, 4.5, 0);
      flagGroup.add(flag);
      flagGroup.position.set(fx, 0, fz);
      mctx.envGroup.add(flagGroup);
    }

    // Horse troughs (2) - detailed wooden plank construction
    const troughPositions: [number, number][] = [[-7, -8], [8, 8]];
    for (const [tx, tz] of troughPositions) {
      const troughGroup = new THREE.Group();
      const woodDark = new THREE.MeshStandardMaterial({ color: 0x5A3520, roughness: 0.9 });
      const woodMid = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      const woodLight = new THREE.MeshStandardMaterial({ color: 0x7B5236, roughness: 0.85 });
      const woodMats = [woodDark, woodMid, woodLight];
      // Bottom planks (3 planks side by side)
      for (let pi = 0; pi < 3; pi++) {
        const plankGeo = new THREE.BoxGeometry(1.4, 0.04, 0.14);
        const plank = new THREE.Mesh(plankGeo, woodMats[pi % 3]);
        plank.position.set(0, 0.22, -0.15 + pi * 0.15);
        troughGroup.add(plank);
      }
      // Side planks (long sides - 2 planks high each side)
      for (const sz of [-0.24, 0.24]) {
        for (let row = 0; row < 2; row++) {
          const sidePlankGeo = new THREE.BoxGeometry(1.5, 0.18, 0.04);
          const sidePlank = new THREE.Mesh(sidePlankGeo, woodMats[(row + (sz > 0 ? 1 : 0)) % 3]);
          sidePlank.position.set(0, 0.31 + row * 0.18, sz);
          troughGroup.add(sidePlank);
        }
      }
      // End planks (short sides)
      for (const ex of [-0.73, 0.73]) {
        for (let row = 0; row < 2; row++) {
          const endPlankGeo = new THREE.BoxGeometry(0.04, 0.18, 0.44);
          const endPlank = new THREE.Mesh(endPlankGeo, woodMats[row % 3]);
          endPlank.position.set(ex, 0.31 + row * 0.18, 0);
          troughGroup.add(endPlank);
        }
      }
      // Metal band hoops (3 around the trough)
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.7 });
      for (const bx of [-0.5, 0, 0.5]) {
        // Front band strip
        const bandFront = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), bandMat);
        bandFront.position.set(bx, 0.42, -0.26); troughGroup.add(bandFront);
        // Back band strip
        const bandBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), bandMat);
        bandBack.position.set(bx, 0.42, 0.26); troughGroup.add(bandBack);
        // Bottom band strip
        const bandBot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.5), bandMat);
        bandBot.position.set(bx, 0.21, 0); troughGroup.add(bandBot);
      }
      // Metal rivet heads on bands
      const rivetMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });
      for (const bx of [-0.5, 0, 0.5]) {
        for (const rz of [-0.26, 0.26]) {
          const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), rivetMat);
          rivet.position.set(bx, 0.44, rz); troughGroup.add(rivet);
        }
      }
      // Legs - sturdier cross-braced
      for (const lsx of [-0.55, 0.55]) {
        const legGeo = new THREE.BoxGeometry(0.1, 0.2, 0.08);
        const legFront = new THREE.Mesh(legGeo, woodDark);
        legFront.position.set(lsx, 0.1, -0.18); troughGroup.add(legFront);
        const legBack = new THREE.Mesh(legGeo, woodDark);
        legBack.position.set(lsx, 0.1, 0.18); troughGroup.add(legBack);
        // Cross brace
        const braceGeo = new THREE.BoxGeometry(0.04, 0.04, 0.36);
        const brace = new THREE.Mesh(braceGeo, woodMid);
        brace.position.set(lsx, 0.1, 0); troughGroup.add(brace);
      }
      // Water with slight transparency and color variation
      const waterGeo = new THREE.BoxGeometry(1.3, 0.06, 0.35);
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x2277aa, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.1 });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = 0.55; troughGroup.add(water);
      // Water surface highlight ripples (small flat discs)
      for (let ri = 0; ri < 4; ri++) {
        const rippleGeo = new THREE.CylinderGeometry(0.06 + Math.random() * 0.04, 0.06 + Math.random() * 0.04, 0.005, 12);
        const rippleMat = new THREE.MeshStandardMaterial({ color: 0x55aacc, transparent: true, opacity: 0.3, roughness: 0.05 });
        const ripple = new THREE.Mesh(rippleGeo, rippleMat);
        ripple.position.set(-0.3 + Math.random() * 0.6, 0.585, -0.08 + Math.random() * 0.16);
        troughGroup.add(ripple);
      }
      // Moss patches on outside
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x3a6b2a, roughness: 0.95 });
      for (let mi = 0; mi < 3; mi++) {
        const mossGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 6);
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.scale.y = 0.3;
        moss.position.set(-0.5 + Math.random() * 1.0, 0.25 + Math.random() * 0.1, (Math.random() > 0.5 ? 0.25 : -0.25));
        troughGroup.add(moss);
      }
      troughGroup.position.set(tx, 0, tz);
      mctx.envGroup.add(troughGroup);
    }

    // Stone benches (4) - detailed with beveled edges, scroll legs, moss
    const benchPositions: [number, number, number][] = [[-3, 4, 0], [3, 4, 0], [-3, -4, Math.PI], [3, -4, Math.PI]];
    for (const [bx, bz, bRot] of benchPositions) {
      const benchGroup = new THREE.Group();
      const stoneDark = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
      const stoneMid = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85 });
      const stoneLight = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.85 });
      // Main seat slab
      const seatGeo = new THREE.BoxGeometry(1.5, 0.12, 0.5);
      const seat = new THREE.Mesh(seatGeo, stoneMid);
      seat.position.y = 0.42; seat.castShadow = true; benchGroup.add(seat);
      // Beveled front edge (rounded cylinder)
      const bevelFrontGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
      const bevelFront = new THREE.Mesh(bevelFrontGeo, stoneLight);
      bevelFront.rotation.z = Math.PI / 2;
      bevelFront.position.set(0, 0.42, 0.25); benchGroup.add(bevelFront);
      // Beveled back edge
      const bevelBack = new THREE.Mesh(bevelFrontGeo.clone(), stoneLight);
      bevelBack.rotation.z = Math.PI / 2;
      bevelBack.position.set(0, 0.42, -0.25); benchGroup.add(bevelBack);
      // Carved scroll-end legs (2)
      for (const blx of [-0.55, 0.55]) {
        // Main leg block
        const legGeo = new THREE.BoxGeometry(0.14, 0.36, 0.5);
        const leg = new THREE.Mesh(legGeo, stoneDark);
        leg.position.set(blx, 0.18, 0); benchGroup.add(leg);
        // Carved arch cutout (decorative inset on each leg)
        const archGeo = new THREE.BoxGeometry(0.04, 0.15, 0.25);
        const archInset = new THREE.Mesh(archGeo, stoneLight);
        archInset.position.set(blx, 0.15, 0); benchGroup.add(archInset);
        // Scroll top (small cylinder roll at top of each leg)
        const scrollGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8);
        const scrollTop = new THREE.Mesh(scrollGeo, stoneMid);
        scrollTop.rotation.x = Math.PI / 2;
        scrollTop.position.set(blx, 0.36, 0.22); benchGroup.add(scrollTop);
        const scrollTop2 = new THREE.Mesh(scrollGeo.clone(), stoneMid);
        scrollTop2.rotation.x = Math.PI / 2;
        scrollTop2.position.set(blx, 0.36, -0.22); benchGroup.add(scrollTop2);
        // Scroll bottom curls
        const curlGeo = new THREE.TorusGeometry(0.04, 0.015, 6, 8, Math.PI);
        const curlMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.85 });
        const curlFront = new THREE.Mesh(curlGeo, curlMat);
        curlFront.position.set(blx, 0.04, 0.22); curlFront.rotation.y = Math.PI / 2;
        benchGroup.add(curlFront);
        const curlBack = new THREE.Mesh(curlGeo.clone(), curlMat);
        curlBack.position.set(blx, 0.04, -0.22); curlBack.rotation.y = Math.PI / 2;
        benchGroup.add(curlBack);
      }
      // Weathering - chipped edge details
      for (let wi = 0; wi < 3; wi++) {
        const chipGeo = new THREE.BoxGeometry(0.06, 0.03, 0.03);
        const chipMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 });
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set(-0.5 + Math.random() * 1.0, 0.47, 0.24);
        benchGroup.add(chip);
      }
      // Moss / lichen patches
      const benchMossMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.95 });
      for (let mi = 0; mi < 4; mi++) {
        const mossGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 6, 5);
        const moss = new THREE.Mesh(mossGeo, benchMossMat);
        moss.scale.y = 0.25;
        if (Math.random() > 0.5) {
          moss.position.set(
            (Math.random() > 0.5 ? -0.55 : 0.55) + (Math.random() - 0.5) * 0.05,
            0.05 + Math.random() * 0.2,
            (Math.random() - 0.5) * 0.4
          );
        } else {
          moss.position.set(-0.6 + Math.random() * 1.2, 0.47, (Math.random() > 0.5 ? 0.24 : -0.24));
        }
        benchGroup.add(moss);
      }
      // Stone color variation streaks on seat
      for (let si = 0; si < 2; si++) {
        const streakGeo = new THREE.BoxGeometry(0.3 + Math.random() * 0.4, 0.005, 0.08);
        const streakMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.9 });
        const streak = new THREE.Mesh(streakGeo, streakMat);
        streak.position.set(-0.3 + Math.random() * 0.6, 0.485, -0.15 + Math.random() * 0.3);
        benchGroup.add(streak);
      }
      benchGroup.position.set(bx, 0, bz);
      benchGroup.rotation.y = bRot;
      mctx.envGroup.add(benchGroup);
    }

    // Additional small rocks / cobblestones scattered (15)
    for (let ri = 0; ri < 15; ri++) {
      const rockGeo = new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.15, 2);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.95 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.08,
        (Math.random() - 0.5) * d * 0.8
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mctx.envGroup.add(rock);
    }

    // Sacks of grain near market (4) - detailed burlap sacks with ties and spilled grain
    for (let si = 0; si < 4; si++) {
      const sackGroup = new THREE.Group();
      const burlap1 = new THREE.MeshStandardMaterial({ color: 0x7a6530, roughness: 0.95 });
      const burlap2 = new THREE.MeshStandardMaterial({ color: 0x6d5a28, roughness: 0.95 });
      const burlap3 = new THREE.MeshStandardMaterial({ color: 0x85703a, roughness: 0.95 });
      const burlapMats = [burlap1, burlap2, burlap3];
      // Main sack body
      const bodyGeo = new THREE.SphereGeometry(0.12, 12, 10);
      const body = new THREE.Mesh(bodyGeo, burlapMats[si % 3]);
      body.scale.set(1, 0.8, 0.8);
      body.castShadow = true; sackGroup.add(body);
      // Fabric folds / wrinkle bumps
      for (let fi = 0; fi < 5; fi++) {
        const foldGeo = new THREE.SphereGeometry(0.025 + Math.random() * 0.015, 6, 5);
        const fold = new THREE.Mesh(foldGeo, burlapMats[(si + fi) % 3]);
        const angle = (fi / 5) * Math.PI * 2;
        fold.position.set(
          Math.cos(angle) * 0.1,
          -0.02 + Math.random() * 0.06,
          Math.sin(angle) * 0.08
        );
        fold.scale.y = 0.5;
        sackGroup.add(fold);
      }
      // Tied-off top (cone shape)
      const tieTopGeo = new THREE.ConeGeometry(0.04, 0.08, 6);
      const tieTop = new THREE.Mesh(tieTopGeo, burlap1);
      tieTop.position.y = 0.1; sackGroup.add(tieTop);
      // Rope ring around tie
      const ropeRingGeo = new THREE.TorusGeometry(0.035, 0.008, 6, 10);
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
      const ropeRing = new THREE.Mesh(ropeRingGeo, ropeMat);
      ropeRing.position.y = 0.07; ropeRing.rotation.x = Math.PI / 2;
      sackGroup.add(ropeRing);
      // Rope binding around middle
      const midRopeGeo = new THREE.TorusGeometry(0.1, 0.006, 6, 12);
      const midRope = new THREE.Mesh(midRopeGeo, ropeMat);
      midRope.position.y = 0.0; midRope.rotation.x = Math.PI / 2;
      sackGroup.add(midRope);
      // Fabric patch detail (on some sacks)
      if (si % 2 === 0) {
        const patchGeo = new THREE.BoxGeometry(0.04, 0.04, 0.005);
        const patchMat = new THREE.MeshStandardMaterial({ color: 0x5a4a20, roughness: 0.95 });
        const patch = new THREE.Mesh(patchGeo, patchMat);
        patch.position.set(0.1, 0.0, 0.06);
        sackGroup.add(patch);
      }
      // Spilled grain on the ground (tiny spheres)
      for (let gi = 0; gi < 6; gi++) {
        const grainGeo = new THREE.SphereGeometry(0.008, 4, 4);
        const grainMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.8 });
        const grain = new THREE.Mesh(grainGeo, grainMat);
        grain.position.set(
          (Math.random() - 0.5) * 0.25,
          -0.09,
          (Math.random() - 0.5) * 0.2
        );
        sackGroup.add(grain);
      }
      sackGroup.position.set(
        -6 + si * 0.4 + (Math.random() - 0.5) * 0.2,
        0.1,
        7 + (Math.random() - 0.5) * 0.3
      );
      mctx.envGroup.add(sackGroup);
    }

    // Wooden crates near blacksmith (5) - detailed with planks, nails, reinforcements
    for (let ci = 0; ci < 5; ci++) {
      const crateGroup = new THREE.Group();
      const cSize = 0.4 + Math.random() * 0.2;
      const hSize = cSize / 2;
      const plankDark = new THREE.MeshStandardMaterial({ color: 0x7a5a10, roughness: 0.85 });
      const plankMid = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const plankLight = new THREE.MeshStandardMaterial({ color: 0x9B7924, roughness: 0.8 });
      const plankMats = [plankDark, plankMid, plankLight];
      // Warp factor for damaged look on some crates
      const warpX = ci === 2 ? 1.04 : 1.0;
      const warpZ = ci === 4 ? 0.97 : 1.0;
      // Face planks - front and back (3 horizontal planks per face)
      for (const fz of [-hSize, hSize]) {
        for (let pi = 0; pi < 3; pi++) {
          const plankH = cSize / 3;
          const plankGeo = new THREE.BoxGeometry(cSize * 0.95, plankH * 0.9, 0.02);
          const plank = new THREE.Mesh(plankGeo, plankMats[pi % 3]);
          plank.position.set(0, -hSize + plankH * 0.5 + pi * plankH, fz);
          crateGroup.add(plank);
        }
      }
      // Face planks - left and right (3 horizontal planks per face)
      for (const fx of [-hSize, hSize]) {
        for (let pi = 0; pi < 3; pi++) {
          const plankH = cSize / 3;
          const plankGeo = new THREE.BoxGeometry(0.02, plankH * 0.9, cSize * 0.95);
          const plank = new THREE.Mesh(plankGeo, plankMats[(pi + 1) % 3]);
          plank.position.set(fx, -hSize + plankH * 0.5 + pi * plankH, 0);
          crateGroup.add(plank);
        }
      }
      // Top planks (3 planks across)
      for (let pi = 0; pi < 3; pi++) {
        const topPlankGeo = new THREE.BoxGeometry(cSize * 0.3, 0.02, cSize * 0.95);
        const topPlank = new THREE.Mesh(topPlankGeo, plankMats[pi % 3]);
        topPlank.position.set(-cSize * 0.3 + pi * cSize * 0.3, hSize, 0);
        crateGroup.add(topPlank);
      }
      // Bottom planks
      const botGeo = new THREE.BoxGeometry(cSize * 0.95, 0.02, cSize * 0.95);
      const bot = new THREE.Mesh(botGeo, plankDark);
      bot.position.y = -hSize; crateGroup.add(bot);
      // Corner reinforcement brackets (dark metal strips on 4 vertical edges)
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 });
      for (const bx of [-hSize, hSize]) {
        for (const bz of [-hSize, hSize]) {
          const bracketGeo = new THREE.BoxGeometry(0.03, cSize * 0.6, 0.03);
          const bracket = new THREE.Mesh(bracketGeo, bracketMat);
          bracket.position.set(bx, 0, bz);
          crateGroup.add(bracket);
        }
      }
      // Nail heads on corners (tiny spheres)
      const nailMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });
      for (const nx of [-hSize, hSize]) {
        for (const nz of [-hSize, hSize]) {
          for (const ny of [-hSize * 0.5, hSize * 0.5]) {
            const nail = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4), nailMat);
            nail.position.set(nx * 1.01, ny, nz * 1.01);
            crateGroup.add(nail);
          }
        }
      }
      // Lid slightly ajar on one crate
      if (ci === 1) {
        const lidGeo = new THREE.BoxGeometry(cSize * 0.95, 0.025, cSize * 0.95);
        const lid = new THREE.Mesh(lidGeo, plankLight);
        lid.position.set(0.02, hSize + 0.02, 0.03);
        lid.rotation.z = 0.08; lid.rotation.x = 0.05;
        crateGroup.add(lid);
      }
      crateGroup.scale.set(warpX, 1, warpZ);
      crateGroup.position.set(-13 + ci * 0.6, 0.25, -8 + (Math.random() - 0.5));
      crateGroup.rotation.y = Math.random() * 0.5;
      crateGroup.castShadow = true;
      mctx.envGroup.add(crateGroup);
    }

    // Potted plants near chapel (4) - detailed
    for (let pi = 0; pi < 4; pi++) {
      const potGroup = new THREE.Group();
      const potMat = new THREE.MeshStandardMaterial({ color: 0xaa6633, roughness: 0.8 });
      const potDarkMat = new THREE.MeshStandardMaterial({ color: 0x8a5228, roughness: 0.85 });

      // Main pot body
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 27), potMat);
      pot.position.y = 0.125;
      potGroup.add(pot);

      // Rim detail (torus ring at top)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.015, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0xbb7744, roughness: 0.7 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.25;
      potGroup.add(rim);

      // Decorative band around pot middle
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 24), potDarkMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.15;
      potGroup.add(band);
      // Second thin band
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.006, 8, 24), potDarkMat);
      band2.rotation.x = Math.PI / 2;
      band2.position.y = 0.1;
      potGroup.add(band2);

      // Base plate / saucer
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.02, 24), potDarkMat);
      saucer.position.y = 0.01;
      potGroup.add(saucer);

      // Drainage hole indicators (dark circles at bottom)
      for (let dh = 0; dh < 3; dh++) {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8),
          new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.95, side: THREE.DoubleSide }));
        const ha = (dh / 3) * Math.PI * 2;
        hole.rotation.x = Math.PI / 2;
        hole.position.set(Math.cos(ha) * 0.06, 0.005, Math.sin(ha) * 0.06);
        potGroup.add(hole);
      }

      // Visible soil
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 20),
        new THREE.MeshStandardMaterial({ color: 0x3B2510, roughness: 0.95 }));
      soil.position.y = 0.24;
      potGroup.add(soil);

      // Multiple leaves (PlaneGeometry, varied angles)
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.8, side: THREE.DoubleSide });
      const darkLeafMat = new THREE.MeshStandardMaterial({ color: 0x337a25, roughness: 0.8, side: THREE.DoubleSide });
      for (let li = 0; li < 8; li++) {
        const la = (li / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const lh = 0.3 + Math.random() * 0.12;
        const lSize = 0.06 + Math.random() * 0.04;
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(lSize, lSize * 1.8),
          li % 2 === 0 ? leafMat : darkLeafMat);
        leaf.position.set(Math.cos(la) * 0.08, lh, Math.sin(la) * 0.08);
        leaf.rotation.y = la;
        leaf.rotation.x = -0.3 - Math.random() * 0.3;
        potGroup.add(leaf);
      }

      // A few flowers with petals on some plants
      if (pi % 2 === 0) {
        const fColors = [0xff6688, 0xffaa44, 0xff44aa];
        for (let fl = 0; fl < 3; fl++) {
          const flAngle = (fl / 3) * Math.PI * 2 + 0.5;
          const flStem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: 0x2d7a1e, roughness: 0.8 }));
          flStem.position.set(Math.cos(flAngle) * 0.06, 0.32, Math.sin(flAngle) * 0.06);
          potGroup.add(flStem);
          // Flower center
          const fc = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0xffee44, roughness: 0.5 }));
          fc.position.set(Math.cos(flAngle) * 0.06, 0.39, Math.sin(flAngle) * 0.06);
          potGroup.add(fc);
          // Petals
          for (let pe = 0; pe < 4; pe++) {
            const peAngle = (pe / 4) * Math.PI * 2;
            const peGeo = new THREE.SphereGeometry(0.015, 6, 5);
            peGeo.scale(1, 0.4, 1);
            const petal = new THREE.Mesh(peGeo,
              new THREE.MeshStandardMaterial({ color: fColors[fl % fColors.length], roughness: 0.5 }));
            petal.position.set(
              Math.cos(flAngle) * 0.06 + Math.cos(peAngle) * 0.02,
              0.39,
              Math.sin(flAngle) * 0.06 + Math.sin(peAngle) * 0.02
            );
            potGroup.add(petal);
          }
        }
      }

      potGroup.position.set(-6 + pi * 0.8, 0, -18);
      mctx.envGroup.add(potGroup);
    }

    // Hanging lanterns on building overhangs (6)
    for (let li = 0; li < 6; li++) {
      const lanternGroup = new THREE.Group();
      const chainGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 17);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.3 });
      const chain = new THREE.Mesh(chainGeo, chainMat);
      chain.position.y = 2.8;
      lanternGroup.add(chain);
      const lanternBodyGeo = new THREE.BoxGeometry(0.15, 0.2, 0.15);
      const lanternBodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 0.8, roughness: 0.4, transparent: true, opacity: 0.8 });
      const lanternBody = new THREE.Mesh(lanternBodyGeo, lanternBodyMat);
      lanternBody.position.y = 2.5;
      lanternGroup.add(lanternBody);
      const bIdx = li * 3;
      if (bIdx < buildingPositions.length) {
        const [blx, blz] = buildingPositions[bIdx];
        lanternGroup.position.set(blx, 0, blz + 1.5);
        mctx.envGroup.add(lanternGroup);
      }
    }

    // Well-worn path stones (cobblestone details, 20)
    for (let pi = 0; pi < 20; pi++) {
      const csGeo = new THREE.CylinderGeometry(0.2 + Math.random() * 0.15, 0.2 + Math.random() * 0.15, 0.03, 23);
      const csMat = new THREE.MeshStandardMaterial({ color: 0x776655 + Math.floor(Math.random() * 0x111111), roughness: 0.95 });
      const cs = new THREE.Mesh(csGeo, csMat);
      cs.position.set(
        (Math.random() - 0.5) * 25,
        0.015,
        (Math.random() - 0.5) * 25
      );
      mctx.envGroup.add(cs);
    }

    // Clotheslines between buildings (3)
    for (let cli = 0; cli < 3; cli++) {
      const clGroup = new THREE.Group();
      const clRopeGeo = new THREE.CylinderGeometry(0.008, 0.008, 4, 17);
      const clRopeMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 });
      const clRope = new THREE.Mesh(clRopeGeo, clRopeMat);
      clRope.rotation.z = Math.PI / 2;
      clRope.position.y = 3.0;
      clGroup.add(clRope);
      // Hanging clothes (small planes)
      const clothColors = [0xeeeeee, 0xcc8844, 0x8844cc, 0xcc4444];
      for (let cc = 0; cc < 3; cc++) {
        const clothGeo = new THREE.PlaneGeometry(0.4, 0.5);
        const clothMat = new THREE.MeshStandardMaterial({ color: clothColors[cc % clothColors.length], roughness: 0.8, side: THREE.DoubleSide });
        const cloth = new THREE.Mesh(clothGeo, clothMat);
        cloth.position.set(-1 + cc * 1, 2.6, 0);
        clGroup.add(cloth);
      }
      const clX = -14 + cli * 14;
      clGroup.position.set(clX, 0, 3 + cli * 3);
      mctx.envGroup.add(clGroup);
    }

    // Stacked logs near buildings (4 piles)
    for (let lpi = 0; lpi < 4; lpi++) {
      const logPile = new THREE.Group();
      for (let lo = 0; lo < 5; lo++) {
        const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 23);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.08 + lo * 0.16, (Math.random() - 0.5) * 0.1);
        logPile.add(log);
      }
      const lpAngle = (lpi / 4) * Math.PI * 2 + 0.5;
      logPile.position.set(Math.cos(lpAngle) * 16, 0, Math.sin(lpAngle) * 16);
      mctx.envGroup.add(logPile);
    }

    // Bird bath / fountain near chapel (1)
    const fountainGroup = new THREE.Group();
    const fPedGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.0, 27);
    const fPedMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.75 });
    const fPed = new THREE.Mesh(fPedGeo, fPedMat);
    fPed.position.y = 0.5;
    fountainGroup.add(fPed);
    const fBowlGeo = new THREE.CylinderGeometry(0.6, 0.4, 0.25, 36);
    const fBowl = new THREE.Mesh(fBowlGeo, fPedMat);
    fBowl.position.y = 1.12;
    fountainGroup.add(fBowl);
    const fWaterGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 36);
    const fWaterMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.5, roughness: 0.2 });
    const fWater = new THREE.Mesh(fWaterGeo, fWaterMat);
    fWater.position.y = 1.22;
    fountainGroup.add(fWater);
    fountainGroup.position.set(-3, 0, -18);
    mctx.envGroup.add(fountainGroup);

    // Notice board near center (1)
    const boardGroup = new THREE.Group();
    const boardPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 2, 23);
    const boardPostMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    for (const bpx of [-0.4, 0.4]) {
      const bp = new THREE.Mesh(boardPostGeo, boardPostMat);
      bp.position.set(bpx, 1, 0);
      bp.castShadow = true;
      boardGroup.add(bp);
    }
    const boardFaceGeo = new THREE.BoxGeometry(1.0, 0.8, 0.06);
    const boardFaceMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const boardFace = new THREE.Mesh(boardFaceGeo, boardFaceMat);
    boardFace.position.y = 1.6;
    boardGroup.add(boardFace);
    // Parchment notes
    for (let ni = 0; ni < 3; ni++) {
      const noteGeo = new THREE.PlaneGeometry(0.2, 0.25);
      const noteMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.7, side: THREE.DoubleSide });
      const note = new THREE.Mesh(noteGeo, noteMat);
      note.position.set(-0.25 + ni * 0.25, 1.6, 0.04);
      note.rotation.z = (Math.random() - 0.5) * 0.2;
      boardGroup.add(note);
    }
    boardGroup.position.set(3, 0, -2);
    mctx.envGroup.add(boardGroup);

    // ═══════════════════════════════════════════════
    // MOAT & DRAWBRIDGE (around castle)
    // ═══════════════════════════════════════════════
    const moatMat = new THREE.MeshStandardMaterial({ color: 0x224466, transparent: true, opacity: 0.6, roughness: 0.15 });
    // North moat (behind castle)
    const moatN = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 2.5), moatMat);
    moatN.position.set(0, 0.04, -38);
    moatN.receiveShadow = true;
    mctx.envGroup.add(moatN);
    // Side moats
    for (const sx of [-10, 10]) {
      const moatSide = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 18), moatMat);
      moatSide.position.set(sx, 0.04, -29);
      moatSide.receiveShadow = true;
      mctx.envGroup.add(moatSide);
    }
    // Drawbridge planks (south of castle gate) - individual plank construction
    const bridgeGrp = new THREE.Group();
    const bridgePlankColors = [0x6B4226, 0x634020, 0x5B3A1C, 0x6E4528, 0x584018, 0x6B4226, 0x604222, 0x6B4226];
    // Individual planks with gaps between them
    for (let bp = 0; bp < 8; bp++) {
      const plankColor = bridgePlankColors[bp % bridgePlankColors.length];
      // Center-worn darker color where walked on
      const isCenter = bp >= 2 && bp <= 5;
      const plankMat = new THREE.MeshStandardMaterial({
        color: isCenter ? plankColor - 0x111111 : plankColor, roughness: isCenter ? 0.9 : 0.85
      });
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 0.3), plankMat);
      plank.position.set(0, 0.08, -24.7 + bp * 0.38);
      plank.castShadow = true; bridgeGrp.add(plank);
      // Nail heads on each plank (4 per plank)
      for (const [nx, nz] of [[-1.3, -0.1], [-1.3, 0.1], [1.3, -0.1], [1.3, 0.1]]) {
        const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6),
          new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 }));
        nail.position.set(nx, 0.125, -24.7 + bp * 0.38 + nz); bridgeGrp.add(nail);
      }
    }
    // Metal hinges at castle end (2 large hinges)
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
    for (const hx of [-1.0, 1.0]) {
      const hingePlate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.15), hingeMat);
      hingePlate.position.set(hx, 0.1, -24.8); bridgeGrp.add(hingePlate);
      const hingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), hingeMat);
      hingePin.rotation.z = Math.PI / 2;
      hingePin.position.set(hx, 0.1, -24.9); bridgeGrp.add(hingePin);
      for (let hk = 0; hk < 3; hk++) {
        const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), hingeMat);
        knuckle.rotation.z = Math.PI / 2;
        knuckle.position.set(hx - 0.06 + hk * 0.06, 0.1, -24.9); bridgeGrp.add(knuckle);
      }
    }
    // Side support beams running lengthwise under planks
    for (const bx of [-1.4, 1.4]) {
      const supportBeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x5B3A1C, roughness: 0.85 }));
      supportBeam.position.set(bx, 0.03, -23.6); bridgeGrp.add(supportBeam);
    }
    mctx.envGroup.add(bridgeGrp);
    // Bridge chains with torus links
    const chainMtl = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    for (const cx of [-1.6, 1.6]) {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.5, 8), chainMtl);
      ch.rotation.x = Math.PI * 0.35;
      ch.position.set(cx, 4, -24);
      mctx.envGroup.add(ch);
      // Chain link detail - torus rings along chain length
      for (let cl = 0; cl < 10; cl++) {
        const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 8), chainMtl);
        const clT = cl / 9;
        chainLink.position.set(cx, 1.8 + clT * 3.5, -24 + clT * 1.4);
        chainLink.rotation.x = cl % 2 === 0 ? 0 : Math.PI / 2;
        chainLink.rotation.y = (Math.random() - 0.5) * 0.15;
        mctx.envGroup.add(chainLink);
      }
      // Chain mount bracket on wall (with bolts)
      const chainBracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), chainMtl);
      chainBracket.position.set(cx, 5.5, -24.5);
      mctx.envGroup.add(chainBracket);
      for (const [bbx, bby] of [[0.05, 0.05], [-0.05, 0.05], [0.05, -0.05], [-0.05, -0.05]]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 6), chainMtl);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(cx + bbx, 5.5 + bby, -24.46);
        mctx.envGroup.add(bolt);
      }
    }

    // ═══════════════════════════════════════════════
    // HEDGE GARDENS (near chapel & east side)
    // ═══════════════════════════════════════════════
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.85 });
    // Rectangular hedge rows (garden east of chapel)
    const hedgeLayout: [number, number, number, number][] = [
      [-10, -16, 4, 0.4], [-10, -14, 4, 0.4], [-10, -15, 0.4, 2.4], [-6.4, -15, 0.4, 2.4],
      // East garden
      [14, 0, 0.4, 5], [14, 0, 3, 0.4], [14, 5, 3, 0.4],
    ];
    for (const [hx, hz, hw2, hd2] of hedgeLayout) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(hw2, 0.8, hd2), hedgeMat);
      hedge.position.set(hx, 0.4, hz);
      hedge.castShadow = true;
      mctx.envGroup.add(hedge);
    }
    // Topiary spheres in gardens
    for (const [tx, tz] of [[-8.5, -15], [-10, -15], [15, 1], [15, 4]] as [number, number][]) {
      const topiary = new THREE.Mesh(new THREE.SphereGeometry(0.5, 27, 23), hedgeMat);
      topiary.position.set(tx, 0.7, tz);
      topiary.castShadow = true;
      mctx.envGroup.add(topiary);
    }
    // Garden flowers inside hedges
    const gardenFlowerColors = [0xff6688, 0xffdd44, 0xaa44ff, 0xff4444, 0x44aaff, 0xffaacc];
    for (let gf = 0; gf < 12; gf++) {
      const gfMat = new THREE.MeshStandardMaterial({ color: gardenFlowerColors[gf % gardenFlowerColors.length], roughness: 0.6 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 17), new THREE.MeshStandardMaterial({ color: 0x338822 }));
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 36, 17), gfMat);
      const fGroup = new THREE.Group();
      stem.position.y = 0.15;
      bloom.position.y = 0.33;
      fGroup.add(stem);
      fGroup.add(bloom);
      fGroup.position.set(
        -9.5 + (gf % 4) * 0.8,
        0,
        -15.5 + Math.floor(gf / 4) * 0.8
      );
      mctx.envGroup.add(fGroup);
    }

    // ═══════════════════════════════════════════════
    // GRAVEYARD (near chapel, west side)
    // ═══════════════════════════════════════════════
    const gravestoneMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
    for (let gi = 0; gi < 8; gi++) {
      const gsGroup = new THREE.Group();
      // Headstone
      const gsGeo = new THREE.BoxGeometry(0.3, 0.6 + Math.random() * 0.3, 0.08);
      const gs = new THREE.Mesh(gsGeo, gravestoneMat);
      gs.position.y = 0.35;
      gsGroup.add(gs);
      // Rounded top
      const gsTop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 23, 17, 0, Math.PI * 2, 0, Math.PI / 2), gravestoneMat);
      gsTop.position.y = 0.65 + (gi % 3) * 0.1;
      gsGroup.add(gsTop);
      // Small cross on some
      if (gi % 3 === 0) {
        const gcV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.03), gravestoneMat);
        gcV.position.set(0, 0.9, 0);
        gsGroup.add(gcV);
        const gcH = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), gravestoneMat);
        gcH.position.set(0, 0.95, 0);
        gsGroup.add(gcH);
      }
      gsGroup.position.set(-9 + (gi % 4) * 1.0, 0, -22 + Math.floor(gi / 4) * 1.2);
      gsGroup.rotation.y = (Math.random() - 0.5) * 0.15;
      mctx.envGroup.add(gsGroup);
    }
    // Iron fence around graveyard
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
    for (let fi = 0; fi < 12; fi++) {
      const fenceBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 17), fenceMat);
      fenceBar.position.set(-10.5 + fi * 0.5, 0.5, -23.5);
      mctx.envGroup.add(fenceBar);
      // Finial on fence post
      const finialGeo = new THREE.ConeGeometry(0.025, 0.06, 27);
      const finial = new THREE.Mesh(finialGeo, fenceMat);
      finial.position.set(-10.5 + fi * 0.5, 1.03, -23.5);
      mctx.envGroup.add(finial);
    }
    const fenceRail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 6, 17), fenceMat);
    fenceRail.rotation.z = Math.PI / 2;
    fenceRail.position.set(-8, 0.8, -23.5);
    mctx.envGroup.add(fenceRail);

    // ═══════════════════════════════════════════════
    // TRAINING GROUNDS (southeast, x=15, z=-15)
    // ═══════════════════════════════════════════════
    // Practice dummies (detailed)
    for (let di = 0; di < 3; di++) {
      const dummyGroup = new THREE.Group();
      const dWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      const dStrawMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 });
      const dStrawDarkMat = new THREE.MeshStandardMaterial({ color: 0xb89930, roughness: 0.92 });

      // Wooden base plate
      const dBasePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 20), dWoodMat);
      dBasePlate.position.y = 0.03;
      dummyGroup.add(dBasePlate);

      // Main pole
      const dPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 23), dWoodMat);
      dPole.position.y = 1.0;
      dummyGroup.add(dPole);

      // Cross arm
      const dArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 20), dWoodMat);
      dArm.rotation.z = Math.PI / 2;
      dArm.position.y = 1.6;
      dummyGroup.add(dArm);

      // Straw body (main)
      const dBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 27), dStrawMat);
      dBody.position.y = 1.3;
      dummyGroup.add(dBody);

      // Visible straw bundles on body
      for (let sb = 0; sb < 6; sb++) {
        const bAngle = (sb / 6) * Math.PI * 2;
        const bundle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.55, 8),
          sb % 2 === 0 ? dStrawMat : dStrawDarkMat);
        bundle.position.set(Math.cos(bAngle) * 0.15, 1.3, Math.sin(bAngle) * 0.15);
        dummyGroup.add(bundle);
      }

      // Rope bindings around body (3 bands)
      const dRopeMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
      for (const ry of [1.15, 1.3, 1.45]) {
        const ropeRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 20), dRopeMat);
        ropeRing.rotation.x = Math.PI / 2;
        ropeRing.position.y = ry;
        dummyGroup.add(ropeRing);
      }

      // Leather patches on body
      const dLeatherMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.75 });
      for (let lp = 0; lp < 2; lp++) {
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.08), dLeatherMat);
        patch.position.set(lp === 0 ? 0.19 : -0.17, 1.25 + lp * 0.15, lp === 0 ? 0.05 : -0.08);
        patch.rotation.y = lp * 1.5;
        dummyGroup.add(patch);
      }

      // Arm stubs made of straw (on cross arm ends)
      for (const ax of [-0.45, 0.45]) {
        const armStub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.15, 12), dStrawMat);
        armStub.position.set(ax, 1.55, 0);
        dummyGroup.add(armStub);
        // Straw wisps at arm ends
        for (let w = 0; w < 3; w++) {
          const wisp = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.003, 0.08, 6), dStrawDarkMat);
          wisp.position.set(ax + (Math.random() - 0.5) * 0.04, 1.48, (Math.random() - 0.5) * 0.04);
          wisp.rotation.z = (Math.random() - 0.5) * 0.6;
          dummyGroup.add(wisp);
        }
      }

      // Straw head (sack)
      const dSackMat = new THREE.MeshStandardMaterial({ color: 0xc4a44a, roughness: 0.9 });
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 31, 20), dSackMat);
      dHead.position.y = 1.85;
      dummyGroup.add(dHead);

      // Rough face drawn on head sack
      const dFaceMat = new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.9, side: THREE.DoubleSide });
      // Eyes
      for (const ex of [-0.045, 0.045]) {
        const eye = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), dFaceMat);
        eye.position.set(ex, 1.88, 0.145);
        dummyGroup.add(eye);
      }
      // Mouth
      const dMouth = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.01), dFaceMat);
      dMouth.position.set(0, 1.82, 0.147);
      dummyGroup.add(dMouth);

      // Straw wisps from head top
      for (let sw = 0; sw < 4; sw++) {
        const headWisp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.08, 6), dStrawDarkMat);
        headWisp.position.set((Math.random() - 0.5) * 0.06, 2.0, (Math.random() - 0.5) * 0.06);
        headWisp.rotation.x = (Math.random() - 0.5) * 0.5;
        headWisp.rotation.z = (Math.random() - 0.5) * 0.5;
        dummyGroup.add(headWisp);
      }

      // Wear marks / cut lines from training
      const dCutMat = new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.95, side: THREE.DoubleSide });
      for (let cm = 0; cm < 3; cm++) {
        const cut = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.008), dCutMat);
        const cAngle = Math.random() * Math.PI * 2;
        cut.position.set(Math.cos(cAngle) * 0.18, 1.15 + cm * 0.12, Math.sin(cAngle) * 0.18);
        cut.rotation.y = cAngle + Math.PI / 2;
        cut.rotation.z = (Math.random() - 0.5) * 0.6;
        dummyGroup.add(cut);
      }

      // Shield target on middle dummy (more detailed)
      if (di === 1) {
        // Shield base (wooden round)
        const dShieldWood = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 24),
          new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 }));
        dShieldWood.rotation.x = Math.PI / 2;
        dShieldWood.position.set(0, 1.3, 0.19);
        dummyGroup.add(dShieldWood);
        // Painted rings on shield
        const sRingColors = [0xcc3333, 0xffffff, 0x3344aa, 0xcc3333];
        for (let sr = 0; sr < 4; sr++) {
          const sRing = new THREE.Mesh(new THREE.RingGeometry(0.04 + sr * 0.05, 0.08 + sr * 0.05, 20),
            new THREE.MeshStandardMaterial({ color: sRingColors[sr], side: THREE.DoubleSide }));
          sRing.position.set(0, 1.3, 0.206);
          dummyGroup.add(sRing);
        }
        // Shield boss (center metal bump)
        const dBoss = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 }));
        dBoss.position.set(0, 1.3, 0.22);
        dummyGroup.add(dBoss);
        // Shield rim (metal edge)
        const dShieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.012, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.5, roughness: 0.4 }));
        dShieldRim.position.set(0, 1.3, 0.2);
        dummyGroup.add(dShieldRim);
      }

      dummyGroup.position.set(14 + di * 1.5, 0, -15);
      dummyGroup.castShadow = true;
      mctx.envGroup.add(dummyGroup);
    }

    // Archery targets (detailed)
    for (let ai = 0; ai < 2; ai++) {
      const targetGroup = new THREE.Group();
      const tWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      const tHayMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 });

      // Thick straw target body (cylindrical with hay look)
      const targetBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 32), tHayMat);
      targetBody.rotation.z = Math.PI / 2;
      targetBody.position.set(0, 0.9, 0);
      targetGroup.add(targetBody);

      // Straw construction detail (visible bundles around edge)
      for (let sb = 0; sb < 12; sb++) {
        const bAngle = (sb / 12) * Math.PI * 2;
        const strawBundle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8),
          new THREE.MeshStandardMaterial({ color: sb % 2 === 0 ? 0xbbaa3a : 0xccaa44, roughness: 0.92 }));
        strawBundle.rotation.z = Math.PI / 2;
        strawBundle.position.set(0, 0.9 + Math.cos(bAngle) * 0.5, Math.sin(bAngle) * 0.5);
        targetGroup.add(strawBundle);
      }

      // Concentric target rings (proper bullseye colors)
      const tRingDefs: [number, number, number][] = [
        [0, 0.06, 0xcc2222],    // Red bullseye center
        [0.06, 0.12, 0xffffff], // White
        [0.12, 0.2, 0x2244aa],  // Blue
        [0.2, 0.32, 0x222222],  // Black
        [0.32, 0.48, 0xffffff], // White outer
      ];
      for (const [rInner, rOuter, rColor] of tRingDefs) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(rInner, rOuter, 32),
          new THREE.MeshStandardMaterial({ color: rColor, side: THREE.DoubleSide, roughness: 0.7 }));
        ring.rotation.y = Math.PI / 2;
        ring.position.set(0.08, 0.9, 0);
        targetGroup.add(ring);
      }

      // Arrows stuck in the target
      const tArrowMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const tArrowTipMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
      const tArrowPositions: [number, number, number][] = [
        [0.02, 0.95, 0.08],
        [-0.03, 0.82, -0.12],
        [0.01, 1.05, 0.05],
      ];
      for (const [aax, aay, aaz] of tArrowPositions) {
        // Arrow shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8), tArrowMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.set(aax + 0.25, aay, aaz);
        targetGroup.add(shaft);
        // Arrow tip (cone)
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 8), tArrowTipMat);
        tip.rotation.z = -Math.PI / 2;
        tip.position.set(aax + 0.06, aay, aaz);
        targetGroup.add(tip);
        // Arrow fletching
        for (let f = 0; f < 3; f++) {
          const fletch = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.015),
            new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.6, side: THREE.DoubleSide }));
          fletch.rotation.y = (f / 3) * Math.PI;
          fletch.rotation.z = Math.PI / 2;
          fletch.position.set(aax + 0.42, aay, aaz);
          targetGroup.add(fletch);
        }
      }

      // Wooden frame / easel legs with cross-bracing
      for (const lz of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 12), tWoodMat);
        leg.rotation.x = (lz > 0 ? -1 : 1) * 0.2;
        leg.position.set(-0.2, 0.65, lz);
        leg.castShadow = true;
        targetGroup.add(leg);
      }
      // Back support leg
      const tBackLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 12), tWoodMat);
      tBackLeg.rotation.x = 0.35;
      tBackLeg.position.set(-0.45, 0.6, 0);
      targetGroup.add(tBackLeg);
      // Cross brace between front legs
      const tCrossBrace = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 10), tWoodMat);
      tCrossBrace.position.set(-0.2, 0.35, 0);
      targetGroup.add(tCrossBrace);
      // Top rail connecting legs
      const tTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 10), tWoodMat);
      tTopRail.position.set(-0.1, 1.35, 0);
      targetGroup.add(tTopRail);

      // Ground wear marks beneath
      const tGroundWear = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16),
        new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.95, side: THREE.DoubleSide }));
      tGroundWear.rotation.x = -Math.PI / 2;
      tGroundWear.position.set(0, 0.01, 0);
      targetGroup.add(tGroundWear);

      targetGroup.position.set(18, 0, -13 + ai * 3);
      targetGroup.rotation.y = -Math.PI / 2;
      mctx.envGroup.add(targetGroup);
    }

    // Weapon racks at training ground (detailed)
    {
      const rackGroup = new THREE.Group();
      const rWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      const rDarkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5A3520, roughness: 0.9 });
      const rMetalMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7, roughness: 0.3 });
      const rSteelMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.7, roughness: 0.2 });

      // Vertical frame posts (left and right)
      for (const pz of [-0.9, 0.9]) {
        const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 12), rWoodMat);
        rPost.position.set(0, 0.7, pz);
        rackGroup.add(rPost);
        // Post cap
        const rCap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), rDarkWoodMat);
        rCap.position.set(0, 1.4, pz);
        rackGroup.add(rCap);
      }

      // Top rail (horizontal)
      const rTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 12), rWoodMat);
      rTopRail.rotation.x = Math.PI / 2;
      rTopRail.position.set(0, 1.2, 0);
      rackGroup.add(rTopRail);

      // Bottom rail
      const rBotRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 12), rWoodMat);
      rBotRail.rotation.x = Math.PI / 2;
      rBotRail.position.set(0, 0.2, 0);
      rackGroup.add(rBotRail);

      // Carved notches on top rail (V-shaped holders)
      for (let ni = 0; ni < 5; ni++) {
        const nz = -0.7 + ni * 0.35;
        for (const nx of [-0.03, 0.03]) {
          const notch = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.015), rDarkWoodMat);
          notch.position.set(nx, 1.25, nz);
          notch.rotation.z = nx < 0 ? 0.3 : -0.3;
          rackGroup.add(notch);
        }
      }

      // Metal brackets at joints
      for (const bz of [-0.9, 0.9]) {
        for (const by of [0.2, 1.2]) {
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), rMetalMat);
          bracket.position.set(0, by, bz);
          rackGroup.add(bracket);
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), rMetalMat);
          bolt.rotation.z = Math.PI / 2;
          bolt.position.set(0.04, by, bz);
          rackGroup.add(bolt);
        }
      }

      // Wood grain detail lines on posts
      for (const pz of [-0.9, 0.9]) {
        for (let gl = 0; gl < 3; gl++) {
          const grain = new THREE.Mesh(new THREE.PlaneGeometry(0.003, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x5A3520, roughness: 0.9, side: THREE.DoubleSide }));
          const ga = (gl / 3) * Math.PI * 2;
          grain.position.set(Math.cos(ga) * 0.05, 0.7, pz + Math.sin(ga) * 0.05);
          grain.rotation.y = ga;
          rackGroup.add(grain);
        }
      }

      // Weapon 1: Sword (blade + guard + handle + pommel)
      const rSword1Blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.7, 0.04), rSteelMat);
      rSword1Blade.position.set(0.04, 0.75, -0.7);
      rSword1Blade.rotation.z = 0.08;
      rackGroup.add(rSword1Blade);
      const rSword1Guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.12), rMetalMat);
      rSword1Guard.position.set(0.04, 0.38, -0.7);
      rackGroup.add(rSword1Guard);
      const rSword1Handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.8 }));
      rSword1Handle.position.set(0.04, 0.27, -0.7);
      rackGroup.add(rSword1Handle);
      const rSword1Pommel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), rMetalMat);
      rSword1Pommel.position.set(0.04, 0.19, -0.7);
      rackGroup.add(rSword1Pommel);

      // Weapon 2: Broader sword
      const rSword2Blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.65, 0.055), rSteelMat);
      rSword2Blade.position.set(0.04, 0.73, -0.35);
      rSword2Blade.rotation.z = 0.06;
      rackGroup.add(rSword2Blade);
      const rSword2Guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.14), rMetalMat);
      rSword2Guard.position.set(0.04, 0.38, -0.35);
      rackGroup.add(rSword2Guard);
      const rSword2Handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.8 }));
      rSword2Handle.position.set(0.04, 0.27, -0.35);
      rackGroup.add(rSword2Handle);

      // Weapon 3: Spear (long shaft + tip)
      const rSpearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 10), rWoodMat);
      rSpearShaft.position.set(0.04, 0.8, 0.0);
      rackGroup.add(rSpearShaft);
      const rSpearTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 8), rSteelMat);
      rSpearTip.position.set(0.04, 1.65, 0.0);
      rackGroup.add(rSpearTip);

      // Weapon 4: Another spear (darker wood)
      const rSpear2Shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 10), rDarkWoodMat);
      rSpear2Shaft.position.set(0.04, 0.75, 0.35);
      rackGroup.add(rSpear2Shaft);
      const rSpear2Tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), rSteelMat);
      rSpear2Tip.position.set(0.04, 1.56, 0.35);
      rackGroup.add(rSpear2Tip);

      // Weapon 5: Mace (shaft + spiked head)
      const rMaceShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 10),
        new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.8 }));
      rMaceShaft.position.set(0.04, 0.55, 0.7);
      rackGroup.add(rMaceShaft);
      const rMaceHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.6, roughness: 0.3 }));
      rMaceHead.position.set(0.04, 0.93, 0.7);
      rackGroup.add(rMaceHead);
      // Mace flanges
      for (let mf = 0; mf < 4; mf++) {
        const flange = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.08), rMetalMat);
        const mAngle = (mf / 4) * Math.PI * 2;
        flange.position.set(0.04 + Math.cos(mAngle) * 0.04, 0.93, 0.7 + Math.sin(mAngle) * 0.04);
        flange.rotation.y = mAngle;
        rackGroup.add(flange);
      }

      rackGroup.position.set(13, 0, -16);
      mctx.envGroup.add(rackGroup);
    }

    // ═══════════════════════════════════════════════
    // ANIMALS
    // ═══════════════════════════════════════════════
    // Horses (2) near troughs
    for (const [hx, hz, hRot] of [[-7, -6.5, 0.3], [8, 6.5, -0.5]] as [number, number, number][]) {
      const horseGroup = new THREE.Group();
      // Body
      const hBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      hBody.position.y = 1.0;
      horseGroup.add(hBody);
      // Neck
      const hNeck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      hNeck.position.set(0.7, 1.4, 0);
      hNeck.rotation.z = -0.4;
      horseGroup.add(hNeck);
      // Head
      const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.8 }));
      hHead.position.set(1.1, 1.6, 0);
      horseGroup.add(hHead);
      // Legs (4)
      for (const [lx, lz] of [[-0.5, -0.25], [-0.5, 0.25], [0.5, -0.25], [0.5, 0.25]]) {
        const hLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.8 }));
        hLeg.position.set(lx, 0.35, lz);
        horseGroup.add(hLeg);
      }
      // Tail
      const hTail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.6, 20),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      hTail.position.set(-0.9, 1.1, 0);
      hTail.rotation.z = 0.6;
      horseGroup.add(hTail);
      // Mane
      const hMane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      hMane.position.set(0.5, 1.55, 0);
      hMane.rotation.z = -0.3;
      horseGroup.add(hMane);
      // Saddle
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.7 }));
      saddle.position.set(0, 1.45, 0);
      horseGroup.add(saddle);
      horseGroup.position.set(hx, 0, hz);
      horseGroup.rotation.y = hRot;
      mctx.envGroup.add(horseGroup);
    }

    // Chickens (5) near market
    for (let ci = 0; ci < 5; ci++) {
      const chickenGroup = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 23, 20),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.85 }));
      cBody.position.y = 0.18;
      cBody.scale.set(1, 0.8, 1.2);
      chickenGroup.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 17),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.85 }));
      cHead.position.set(0.1, 0.28, 0);
      chickenGroup.add(cHead);
      // Beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 17),
        new THREE.MeshStandardMaterial({ color: 0xddaa22 }));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.17, 0.28, 0);
      chickenGroup.add(beak);
      // Comb
      const comb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
      comb.position.set(0.1, 0.34, 0);
      chickenGroup.add(comb);
      chickenGroup.position.set(
        -3 + ci * 1.5 + (Math.random() - 0.5),
        0,
        6 + (Math.random() - 0.5) * 2
      );
      chickenGroup.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(chickenGroup);
    }

    // Cat on barrel (1)
    const catGroup = new THREE.Group();
    const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xdd8833, roughness: 0.8 }));
    catBody.position.y = 0.08;
    catGroup.add(catBody);
    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 23, 20),
      new THREE.MeshStandardMaterial({ color: 0xdd8833, roughness: 0.8 }));
    catHead.position.set(0.18, 0.13, 0);
    catGroup.add(catHead);
    // Ears
    for (const ez of [-0.04, 0.04]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 17),
        new THREE.MeshStandardMaterial({ color: 0xdd8833 }));
      ear.position.set(0.2, 0.22, ez);
      catGroup.add(ear);
    }
    // Tail
    const catTail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.35, 44),
      new THREE.MeshStandardMaterial({ color: 0xdd8833 }));
    catTail.rotation.z = 0.5;
    catTail.position.set(-0.25, 0.15, 0);
    catGroup.add(catTail);
    catGroup.position.set(10, 0.6, -2);
    mctx.envGroup.add(catGroup);

    // ═══════════════════════════════════════════════
    // HALF-TIMBER DETAILS on buildings
    // ═══════════════════════════════════════════════
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x4A2A0A, roughness: 0.85 });
    for (let tbi = 0; tbi < 10; tbi++) {
      const [tbx, tbz, tbw2, tbd] = buildingPositions[tbi];
      const tbh = 3 + ((tbi * 7 + 3) % 5) * 0.4; // approximate building height
      // Horizontal beams
      for (const by of [0.5, tbh * 0.5, tbh * 0.85]) {
        const hBeam = new THREE.Mesh(new THREE.BoxGeometry(tbw2 + 0.05, 0.06, 0.06), timberMat);
        hBeam.position.set(tbx, by, tbz + tbd / 2 + 0.04);
        mctx.envGroup.add(hBeam);
      }
      // Vertical beams at edges
      for (const vx of [-tbw2 / 2, tbw2 / 2]) {
        const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, tbh, 0.06), timberMat);
        vBeam.position.set(tbx + vx, tbh / 2, tbz + tbd / 2 + 0.04);
        mctx.envGroup.add(vBeam);
      }
      // Diagonal cross beam (X pattern)
      const diagLen = Math.sqrt(tbw2 * tbw2 + (tbh * 0.35) * (tbh * 0.35));
      const diagAngle = Math.atan2(tbh * 0.35, tbw2);
      const diag = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.04, 0.04), timberMat);
      diag.rotation.z = diagAngle;
      diag.position.set(tbx, tbh * 0.65, tbz + tbd / 2 + 0.04);
      mctx.envGroup.add(diag);
    }

    // ═══════════════════════════════════════════════
    // WINDOW SHUTTERS on buildings
    // ═══════════════════════════════════════════════
    const shutterColors = [0x334466, 0x446633, 0x663333, 0x553344, 0x336655];
    for (let si = 0; si < 12; si++) {
      const [sx, sz, sw2] = buildingPositions[si];
      const sbh = 3 + ((si * 7 + 3) % 5) * 0.4;
      const shutterMat = new THREE.MeshStandardMaterial({ color: shutterColors[si % shutterColors.length], roughness: 0.8 });
      for (let wi = 0; wi < 2; wi++) {
        const wx = sx - sw2 * 0.2 + wi * sw2 * 0.4;
        // Left shutter
        const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.03), shutterMat);
        shutterL.position.set(wx - 0.22, sbh * 0.6, sz + buildingPositions[si][3] / 2 + 0.06);
        shutterL.rotation.y = 0.3;
        mctx.envGroup.add(shutterL);
        // Right shutter
        const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.03), shutterMat);
        shutterR.position.set(wx + 0.22, sbh * 0.6, sz + buildingPositions[si][3] / 2 + 0.06);
        shutterR.rotation.y = -0.3;
        mctx.envGroup.add(shutterR);
      }
    }

    // ═══════════════════════════════════════════════
    // IVY / MOSS on walls
    // ═══════════════════════════════════════════════
    const ivyMat = new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.9, transparent: true, opacity: 0.85 });
    // Ivy patches on town walls
    for (let iv = 0; iv < 10; iv++) {
      const ivyPatch = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 2, 1.5 + Math.random()),
        ivyMat);
      const side = iv < 3 ? 0 : iv < 5 ? 1 : iv < 7 ? 2 : 3;
      if (side === 0) { // north wall
        ivyPatch.position.set(-hw * 0.5 + iv * 6, 1.5 + Math.random(), -hd + 0.55);
      } else if (side === 1) {
        ivyPatch.position.set(hw - 0.55, 1.5 + Math.random(), -hd * 0.3 + iv * 4);
        ivyPatch.rotation.y = Math.PI / 2;
      } else if (side === 2) {
        ivyPatch.position.set(-hw + 0.55, 1.5 + Math.random(), -hd * 0.3 + iv * 3);
        ivyPatch.rotation.y = -Math.PI / 2;
      } else {
        ivyPatch.position.set(-5 + iv * 3, 1.2 + Math.random(), hd - 0.55);
        ivyPatch.rotation.y = Math.PI;
      }
      mctx.envGroup.add(ivyPatch);
    }

    // ═══════════════════════════════════════════════
    // PUDDLES (after rain effect)
    // ═══════════════════════════════════════════════
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x556677, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 });
    for (let pi = 0; pi < 6; pi++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.5, 62), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(
        (Math.random() - 0.5) * 20,
        0.02,
        (Math.random() - 0.5) * 20
      );
      mctx.envGroup.add(puddle);
    }

    // ═══════════════════════════════════════════════
    // WEATHER VANES on rooftops (6)
    // ═══════════════════════════════════════════════
    const vaneMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
    for (let vi = 0; vi < 6; vi++) {
      const [vx, vz] = buildingPositions[vi * 3];
      const vGroup = new THREE.Group();
      const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 44), vaneMat);
      vPole.position.y = 0.5;
      vGroup.add(vPole);
      // Arrow
      const vArrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 62), vaneMat);
      vArrow.rotation.z = Math.PI / 2;
      vArrow.position.set(0.15, 1.0, 0);
      vGroup.add(vArrow);
      // Tail fin
      const vTail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, side: THREE.DoubleSide }));
      vTail.position.set(-0.15, 1.0, 0);
      vGroup.add(vTail);
      // N-S-E-W indicator bars
      const nsBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 44), vaneMat);
      nsBar.rotation.z = Math.PI / 2;
      nsBar.position.y = 0.85;
      vGroup.add(nsBar);
      const ewBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 44), vaneMat);
      ewBar.rotation.x = Math.PI / 2;
      ewBar.position.y = 0.85;
      vGroup.add(ewBar);
      vGroup.position.set(vx, 5 + Math.random(), vz);
      vGroup.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(vGroup);
    }

    // ═══════════════════════════════════════════════
    // STONE ARCHWAYS in market area (2)
    // ═══════════════════════════════════════════════
    for (const [ax, az, aRot] of [[0, 12, 0], [0, -12, 0]] as [number, number, number][]) {
      const archGroup = new THREE.Group();
      const archStoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.8 });
      // Left pillar
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), archStoneMat);
      pillarL.position.set(-2, 2, 0);
      pillarL.castShadow = true;
      archGroup.add(pillarL);
      // Right pillar
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), archStoneMat);
      pillarR.position.set(2, 2, 0);
      pillarR.castShadow = true;
      archGroup.add(pillarR);
      // Arch top (half torus)
      const archTop = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.3, 44, 62, Math.PI),
        archStoneMat
      );
      archTop.position.set(0, 4, 0);
      archTop.rotation.z = Math.PI;
      archTop.castShadow = true;
      archGroup.add(archTop);
      // Keystone
      const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), archStoneMat);
      keystone.position.set(0, 6, 0);
      archGroup.add(keystone);
      archGroup.position.set(ax, 0, az);
      archGroup.rotation.y = aRot;
      mctx.envGroup.add(archGroup);
    }

    // ═══════════════════════════════════════════════
    // WALL WALKWAY with guard posts
    // ═══════════════════════════════════════════════
    // Walkway planks on top of walls (visible sections)
    const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    // North wall walkway
    const nWalkway = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 0.1, 1.2), walkwayMat);
    nWalkway.position.set(0, 4.05, -hd);
    mctx.envGroup.add(nWalkway);
    // Crenellations on town walls
    for (let ci = 0; ci < 30; ci++) {
      const cren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), wallMat);
      cren.position.set(-hw + 1.5 + ci * (w / 30), 4.4, -hd + 0.4);
      mctx.envGroup.add(cren);
      // Arrow slit in each crenellation merlon
      const crenSlit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      crenSlit.position.set(-hw + 1.5 + ci * (w / 30), 4.4, -hd + 0.55);
      mctx.envGroup.add(crenSlit);
    }
    // Guard torches on walls (4)
    for (const [gtx, gtz] of [[-hw * 0.5, -hd], [hw * 0.5, -hd], [-hw, 0], [hw, 0]] as [number, number][]) {
      const torchGroup = new THREE.Group();
      const tStick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 44),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
      tStick.position.y = 0.4;
      torchGroup.add(tStick);
      const tFlame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 80, 44),
        new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.0 }));
      tFlame.position.y = 0.85;
      torchGroup.add(tFlame);
      torchGroup.position.set(gtx, 4.1, gtz);
      mctx.envGroup.add(torchGroup);
      const gtLight = new THREE.PointLight(0xff8844, 0.4, 8);
      gtLight.position.set(gtx, 5, gtz);
      mctx.scene.add(gtLight);
      mctx.torchLights.push(gtLight);
    }

    // ═══════════════════════════════════════════════
    // DOOR AWNINGS on buildings (8)
    // ═══════════════════════════════════════════════
    const awningColors = [0xcc4444, 0x4444cc, 0x44aa44, 0xccaa44, 0xaa44aa, 0x44aaaa, 0xcc6644, 0xaaaa44];
    for (let awi = 0; awi < 8; awi++) {
      const [awx, awz, , awd] = buildingPositions[awi + 2];
      const awGroup = new THREE.Group();
      const awGeo = new THREE.PlaneGeometry(1.2, 0.8);
      const awMat = new THREE.MeshStandardMaterial({ color: awningColors[awi], roughness: 0.7, side: THREE.DoubleSide });
      const aw = new THREE.Mesh(awGeo, awMat);
      aw.rotation.x = -0.5;
      aw.position.set(0, 1.8, awd / 2 + 0.3);
      awGroup.add(aw);
      // Support rods
      for (const rx of [-0.5, 0.5]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 44),
          new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 }));
        rod.rotation.x = -0.5;
        rod.position.set(rx, 1.6, awd / 2 + 0.2);
        awGroup.add(rod);
      }
      awGroup.position.set(awx, 0, awz);
      mctx.envGroup.add(awGroup);
    }

    // ═══════════════════════════════════════════════
    // WELL-STOCKED MARKET GOODS
    // ═══════════════════════════════════════════════
    // Fruit/vegetable crates near stalls
    const goodColors = [0xff3333, 0xff8833, 0xffff33, 0x33ff33, 0x8833ff, 0xff33aa];
    for (let gi = 0; gi < 8; gi++) {
      const goodsGroup = new THREE.Group();
      // Wooden crate
      const gCrate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 }));
      gCrate.position.y = 0.125;
      goodsGroup.add(gCrate);
      // Small spheres as goods (fruit/vegetables)
      for (let gs = 0; gs < 4; gs++) {
        const good = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
          new THREE.MeshStandardMaterial({ color: goodColors[(gi + gs) % goodColors.length], roughness: 0.6 }));
        good.position.set(-0.08 + gs * 0.06, 0.28, (Math.random() - 0.5) * 0.1);
        goodsGroup.add(good);
      }
      const gAngle = (gi / 8) * Math.PI * 2 + 0.3;
      const gR = 6.5;
      goodsGroup.position.set(Math.cos(gAngle) * gR, 0, Math.sin(gAngle) * gR);
      mctx.envGroup.add(goodsGroup);
    }

    // ═══════════════════════════════════════════════
    // CASTLE HERALDIC BANNERS on walls
    // ═══════════════════════════════════════════════
    const heraldColors = [0xcc2222, 0x2244cc, 0xddaa22];
    for (let hbi = 0; hbi < 6; hbi++) {
      const hBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.5),
        new THREE.MeshStandardMaterial({ color: heraldColors[hbi % heraldColors.length], roughness: 0.7, side: THREE.DoubleSide }));
      // Hang on town walls
      if (hbi < 3) {
        hBanner.position.set(-hw * 0.5 + hbi * hw * 0.5, 2.5, -hd + 0.55);
      } else {
        hBanner.position.set(-hw * 0.5 + (hbi - 3) * hw * 0.5, 2.5, hd - 0.55);
        hBanner.rotation.y = Math.PI;
      }
      mctx.envGroup.add(hBanner);
      // Gold fringe at bottom
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }));
      fringe.position.copy(hBanner.position);
      fringe.position.y -= 1.25;
      fringe.rotation.y = hBanner.rotation.y;
      mctx.envGroup.add(fringe);
    }

    // ═══════════════════════════════════════════════
    // STEPPING STONES path to chapel
    // ═══════════════════════════════════════════════
    for (let ss = 0; ss < 8; ss++) {
      const stepStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 + Math.random() * 0.1, 0.25, 0.04, 44),
        new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 })
      );
      stepStone.position.set(-3 + (Math.random() - 0.5) * 0.3, 0.02, -10 - ss * 1.3);
      mctx.envGroup.add(stepStone);
    }

    // ═══════════════════════════════════════════════
    // SMOKE FROM CHIMNEYS (animated puffs)
    // ═══════════════════════════════════════════════
    const smokeMat2 = new THREE.MeshStandardMaterial({ color: 0x999999, transparent: true, opacity: 0.15, roughness: 1.0 });
    for (let sci = 0; sci < 6; sci++) {
      const [scx, scz, scw] = buildingPositions[sci * 2];
      const scH = 3 + ((sci * 2 * 7 + 3) % 5) * 0.4;
      for (let sp = 0; sp < 3; sp++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.15 + sp * 0.08, 16, 12), smokeMat2);
        puff.position.set(scx + scw * 0.25, scH + 1.8 + sp * 0.4, scz);
        puff.scale.set(1 + sp * 0.3, 1 + sp * 0.2, 1 + sp * 0.3);
        mctx.envGroup.add(puff);
      }
    }

    // Cobblestone path details (12) - small dark circles on ground
    for (let i = 0; i < 12; i++) {
      const cobble = new THREE.Mesh(new THREE.CircleGeometry(0.8 + Math.random() * 0.5, 62),
        new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 1.0, side: THREE.DoubleSide }));
      cobble.rotation.x = -Math.PI / 2;
      cobble.position.set((Math.random() - 0.5) * w * 0.4, 0.02, (Math.random() - 0.5) * d * 0.4);
      mctx.envGroup.add(cobble);
    }

    // Hanging banners on buildings (6)
    const bannerColors = [0xcc2222, 0x2244aa, 0xddaa22, 0x228833, 0x8833aa, 0xcc6622];
    for (let i = 0; i < 6; i++) {
      const bannerGrp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 44),
        new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 }));
      pole.position.y = 0.6;
      bannerGrp.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6),
        new THREE.MeshStandardMaterial({ color: bannerColors[i], roughness: 0.7, side: THREE.DoubleSide }));
      cloth.position.set(0.2, 0.8, 0);
      bannerGrp.add(cloth);
      const bAngle = (i / 6) * Math.PI * 2;
      bannerGrp.position.set(Math.cos(bAngle) * 8, 2.5, Math.sin(bAngle) * 8);
      bannerGrp.rotation.y = bAngle;
      mctx.envGroup.add(bannerGrp);
    }

    // Puddles (5) - flat reflective circles
    for (let i = 0; i < 5; i++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.4, 62),
        new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide }));
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * w * 0.5, 0.01, (Math.random() - 0.5) * d * 0.5);
      mctx.envGroup.add(puddle);
    }

    // Chickens wandering (4)
    for (let i = 0; i < 4; i++) {
      const chickenGrp = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
      cBody.scale.set(1.2, 1, 0.8);
      cBody.position.y = 0.12;
      chickenGrp.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
      cHead.position.set(0.08, 0.2, 0);
      chickenGrp.add(cHead);
      const comb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 }));
      comb.position.set(0.08, 0.25, 0);
      chickenGrp.add(comb);
      chickenGrp.position.set((Math.random() - 0.5) * w * 0.3, 0, (Math.random() - 0.5) * d * 0.3);
      chickenGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(chickenGrp);
    }

    // Wooden barrels (6) - near tavern area
    for (let i = 0; i < 6; i++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 44),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
      barrel.position.set(8 + (i % 3) * 0.5, 0.2, -5 + Math.floor(i / 3) * 0.5);
      barrel.castShadow = true;
      mctx.envGroup.add(barrel);
      // Metal band
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 44, 62),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 }));
      band.position.copy(barrel.position);
      band.position.y += 0.05;
      band.rotation.x = Math.PI / 2;
      mctx.envGroup.add(band);
    }

    // Hanging lanterns (8) - warm glow along pathways
    for (let i = 0; i < 8; i++) {
      const lanternGrp = new THREE.Group();
      const lFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 }));
      lanternGrp.add(lFrame);
      const lGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 1.0 }));
      lanternGrp.add(lGlow);
      const lAngle = (i / 8) * Math.PI * 2;
      lanternGrp.position.set(Math.cos(lAngle) * 6, 2.8, Math.sin(lAngle) * 6);
      mctx.envGroup.add(lanternGrp);
    }

    // ── Central fountain with water ──
    const fountainGrp = new THREE.Group();
    // Base pool
    const fPoolR = 3;
    const fPoolBase = new THREE.Mesh(new THREE.CylinderGeometry(fPoolR, fPoolR + 0.3, 0.5, 44), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.75 }));
    fPoolBase.position.y = 0.25; fountainGrp.add(fPoolBase);
    // Water surface
    const fWater2 = new THREE.Mesh(new THREE.CylinderGeometry(fPoolR - 0.15, fPoolR - 0.15, 0.05, 44), new THREE.MeshStandardMaterial({ color: 0x3399bb, transparent: true, opacity: 0.5, roughness: 0.1 }));
    fWater2.position.y = 0.48; fountainGrp.add(fWater2);
    // Central column
    const fCol = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.5, 44), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 }));
    fCol.position.y = 1.75; fountainGrp.add(fCol);
    // Top bowl
    const fBowl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.3, 44), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 }));
    fBowl2.position.y = 3.15; fountainGrp.add(fBowl2);
    // Water spout (small sphere at top)
    const spout = new THREE.Mesh(new THREE.SphereGeometry(0.15, 80, 44), new THREE.MeshStandardMaterial({ color: 0x55bbdd, emissive: 0x2288aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 }));
    spout.position.y = 3.45; fountainGrp.add(spout);
    // Water streams (cylinders going down)
    for (let ws = 0; ws < 4; ws++) {
      const wAngle = (ws / 4) * Math.PI * 2;
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 1.5, 44), new THREE.MeshStandardMaterial({ color: 0x44aacc, transparent: true, opacity: 0.3 }));
      stream.position.set(Math.cos(wAngle) * 0.4, 2.0, Math.sin(wAngle) * 0.4);
      stream.rotation.z = (Math.random() - 0.5) * 0.3; fountainGrp.add(stream);
    }
    // Fountain light
    const fntLight = new THREE.PointLight(0x4499bb, 0.5, 8);
    fntLight.position.set(5, 1, -8); mctx.scene.add(fntLight); mctx.torchLights.push(fntLight);
    // Fountain decorative detail - carved stone rim segments
    for (let fr = 0; fr < 8; fr++) {
      const fRimAngle = (fr / 8) * Math.PI * 2;
      const fRimStone = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.75 }));
      fRimStone.position.set(Math.cos(fRimAngle) * (fPoolR - 0.1), 0.55, Math.sin(fRimAngle) * (fPoolR - 0.1));
      fRimStone.rotation.y = fRimAngle;
      fountainGrp.add(fRimStone);
    }
    // Fountain column decorative rings
    for (let fcr = 0; fcr < 3; fcr++) {
      const colRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 12, 20),
        new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.6 }));
      colRing.position.y = 1.0 + fcr * 0.8;
      colRing.rotation.x = Math.PI / 2;
      fountainGrp.add(colRing);
    }
    // Water splash particles around base
    for (let fs = 0; fs < 6; fs++) {
      const splash = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x55bbdd, transparent: true, opacity: 0.3 }));
      const fsAngle = (fs / 6) * Math.PI * 2;
      splash.position.set(Math.cos(fsAngle) * 0.6, 0.7 + Math.random() * 0.4, Math.sin(fsAngle) * 0.6);
      fountainGrp.add(splash);
    }
    fountainGrp.position.set(5, 0, -8); mctx.envGroup.add(fountainGrp);

    // ── More detailed market stalls with produce displays ──
    for (let i = 0; i < 6; i++) {
      const stall = new THREE.Group();
      const angle = Math.random() * Math.PI * 2; const radius = 10 + Math.random() * 3;
      // Table
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
      table.position.y = 0.9; stall.add(table);
      // Legs
      for (const [lx, lz] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 44), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
        leg.position.set(lx, 0.45, lz); stall.add(leg);
      }
      // Produce (various fruits/vegetables)
      const produceColors = [0xff3333, 0xff8800, 0xffdd00, 0x33aa33, 0x8844aa, 0xdd6633];
      for (let p = 0; p < 8; p++) {
        const produce = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 8, 6), new THREE.MeshStandardMaterial({ color: produceColors[p % produceColors.length], roughness: 0.6 }));
        produce.position.set(-0.6 + (p % 4) * 0.35, 0.98, -0.3 + Math.floor(p / 4) * 0.4); stall.add(produce);
      }
      // Fabric draped over back
      const drape = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ color: produceColors[i % produceColors.length], roughness: 0.7, side: THREE.DoubleSide }));
      drape.position.set(0, 1.5, -0.65); stall.add(drape);
      stall.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      stall.rotation.y = -angle + Math.PI; mctx.envGroup.add(stall);
    }

    // ── Hanging lanterns along streets ──
    for (let i = 0; i < 12; i++) {
      const lantern = new THREE.Group();
      // Chain
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 44), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 }));
      chain.position.y = 3.25; lantern.add(chain);
      // Lantern body (octagonal)
      const lBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 44), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 }));
      lBody.position.y = 2.9; lantern.add(lBody);
      // Glass panels (emissive)
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.14, 44), new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }));
      glass.position.y = 2.9; lantern.add(glass);
      // Top cap
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 44), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 }));
      cap.position.y = 3.0; lantern.add(cap);
      const lx = (Math.random() - 0.5) * w * 0.6; const lz = (Math.random() - 0.5) * d * 0.6;
      lantern.position.set(lx, 0, lz); mctx.envGroup.add(lantern);
    }

    // ── Flower boxes with varied flowers ──
    const flowerTypes = [0xff4466, 0xffdd44, 0xff88aa, 0xaa44ff, 0x44aaff, 0xff6633, 0xffaacc, 0x44ff88];
    for (let i = 0; i < 12; i++) {
      const fb = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.2), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      fb.add(box);
      // Dirt
      const dirt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.15), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 1.0 }));
      dirt.position.y = 0.08; fb.add(dirt);
      // Flowers (varied shapes)
      for (let f = 0; f < 5; f++) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12 + Math.random() * 0.08, 44), new THREE.MeshStandardMaterial({ color: 0x338822 }));
        const stemH = 0.12 + Math.random() * 0.08;
        stem.position.set(-0.2 + f * 0.1, 0.12 + stemH / 2, 0); fb.add(stem);
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.015, 8, 6), new THREE.MeshStandardMaterial({ color: flowerTypes[(i + f) % flowerTypes.length], roughness: 0.5 }));
        bloom.position.set(-0.2 + f * 0.1, 0.12 + stemH + 0.02, 0); fb.add(bloom);
      }
      const fbAngle = (i / 12) * Math.PI * 2;
      fb.position.set(Math.cos(fbAngle) * 17, 1.8, Math.sin(fbAngle) * 17);
      mctx.envGroup.add(fb);
    }

    // ── Benches around town ──
    for (let i = 0; i < 8; i++) {
      const bench = new THREE.Group();
      // Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
      seat.position.y = 0.45; bench.add(seat);
      // Back rest
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
      back.position.set(0, 0.7, -0.18); bench.add(back);
      // Legs
      for (const [lx, lz] of [[-0.5, -0.15], [0.5, -0.15], [-0.5, 0.15], [0.5, 0.15]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 }));
        leg.position.set(lx, 0.225, lz); bench.add(leg);
      }
      // Arm rests
      for (const ax of [-0.55, 0.55]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 }));
        arm.position.set(ax, 0.6, 0); bench.add(arm);
      }
      const bAngle = (i / 8) * Math.PI * 2; const bR = 7 + (i % 2) * 4;
      bench.position.set(Math.cos(bAngle) * bR, 0, Math.sin(bAngle) * bR);
      bench.rotation.y = -bAngle + Math.PI / 2; mctx.envGroup.add(bench);
    }

    // ── NPC-like figures (simple geometry humans) ──
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbb88, roughness: 0.7 });
    const clothColors2 = [0x884422, 0x445588, 0x558844, 0x885544, 0x666688, 0x886644];
    for (let i = 0; i < 10; i++) {
      const npc = new THREE.Group();
      const clothMat2 = new THREE.MeshStandardMaterial({ color: clothColors2[i % clothColors2.length], roughness: 0.8 });
      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.2), clothMat2);
      body.position.y = 0.9; npc.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skinMat);
      head.position.y = 1.35; npc.add(head);
      // Legs
      for (const lx of [-0.08, 0.08]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), clothMat2);
        leg.position.set(lx, 0.35, 0); npc.add(leg);
      }
      // Arms
      for (const ax of [-0.22, 0.22]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), clothMat2);
        arm.position.set(ax, 0.85, 0); arm.rotation.z = ax > 0 ? -0.15 : 0.15; npc.add(arm);
      }
      // Hair
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.11, 62, 44, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: [0x443322, 0x887744, 0x222222, 0xaa7733][i % 4], roughness: 0.9 }));
      hair.position.y = 1.4; npc.add(hair);
      const nx = (Math.random() - 0.5) * w * 0.5; const nz = (Math.random() - 0.5) * d * 0.5;
      npc.position.set(nx, 0, nz); npc.rotation.y = Math.random() * Math.PI * 2; mctx.envGroup.add(npc);
    }

    // ── Vendor cart with goods ──
    for (let i = 0; i < 3; i++) {
      const cart = new THREE.Group();
      // Body
      const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
      cartBody.position.y = 0.7; cart.add(cartBody);
      // Wheels
      for (const [wx, wz] of [[-0.6, -0.5], [-0.6, 0.5], [0.6, -0.5], [0.6, 0.5]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 44), new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
        wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.25, wz); cart.add(wheel);
        // Wheel spokes
        for (let sp = 0; sp < 4; sp++) {
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 44), new THREE.MeshStandardMaterial({ color: 0x553311 }));
          spoke.rotation.z = (sp / 4) * Math.PI; spoke.position.set(wx, 0.25, wz + 0.03);
          spoke.rotation.x = Math.PI / 2; cart.add(spoke);
        }
      }
      // Goods on cart
      for (let g = 0; g < 4; g++) {
        const good = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.15, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x8B6914 + Math.floor(Math.random() * 0x222222), roughness: 0.8 }));
        good.position.set(-0.4 + g * 0.3, 1.1, (Math.random() - 0.5) * 0.4); cart.add(good);
      }
      // Handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 44), new THREE.MeshStandardMaterial({ color: 0x6B4226 }));
      handle.rotation.z = Math.PI / 3; handle.position.set(-1.1, 0.9, 0); cart.add(handle);
      // Fabric cover
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({ color: [0xcc3333, 0x3366cc, 0x33aa55][i], roughness: 0.7, side: THREE.DoubleSide }));
      cover.position.set(0, 1.5, 0); cover.rotation.x = -0.5; cart.add(cover);
      const cx = (Math.random() - 0.5) * w * 0.4; const cz = (Math.random() - 0.5) * d * 0.4;
      cart.position.set(cx, 0, cz); cart.rotation.y = Math.random() * Math.PI; mctx.envGroup.add(cart);
    }

    // ── Cobblestone path variations ──
    for (let i = 0; i < 25; i++) {
      const cobbleGrp = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < count; c++) {
        const cr = 0.08 + Math.random() * 0.12;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 3), new THREE.MeshStandardMaterial({ color: 0x887766 + Math.floor(Math.random() * 0x111111), roughness: 0.95 }));
        stone.scale.y = 0.3; stone.position.set((Math.random() - 0.5) * 0.5, 0.02, (Math.random() - 0.5) * 0.5);
        cobbleGrp.add(stone);
      }
      cobbleGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(cobbleGrp);
    }

    // ── Stable area ──
    const stableGrp = new THREE.Group();
    const stableWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    const stableWoodDarkMat = new THREE.MeshStandardMaterial({ color: 0x553318, roughness: 0.9 });
    // Support posts with wider bases
    for (const [px, pz] of [[-2.5, -1.5], [2.5, -1.5], [-2.5, 1.5], [2.5, 1.5]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.8, 8), stableWoodMat);
      post.position.set(px, 1.4, pz); stableGrp.add(post);
      // Post base plate
      const postBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.35), stableWoodDarkMat);
      postBase.position.set(px, 0.03, pz); stableGrp.add(postBase);
    }
    // Roof made of overlapping wooden planks (thatch style)
    for (let rp = 0; rp < 8; rp++) {
      const plankW = 0.9 + Math.random() * 0.2;
      const roofPlank = new THREE.Mesh(new THREE.PlaneGeometry(plankW, 4.2),
        new THREE.MeshStandardMaterial({ color: 0x664422 + Math.floor(Math.random() * 0x111100), roughness: 0.85, side: THREE.DoubleSide }));
      roofPlank.position.set(-2.8 + rp * 0.78, 2.82 + Math.random() * 0.02, 0);
      roofPlank.rotation.x = Math.PI / 2; roofPlank.rotation.z = 0.08;
      stableGrp.add(roofPlank);
    }
    // Roof edge trim
    const roofEdgeFront = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 0.12), stableWoodDarkMat);
    roofEdgeFront.position.set(0, 2.75, 2.05); roofEdgeFront.rotation.z = 0.08; stableGrp.add(roofEdgeFront);
    const roofEdgeBack = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 0.12), stableWoodDarkMat);
    roofEdgeBack.position.set(0, 2.75, -2.05); roofEdgeBack.rotation.z = 0.08; stableGrp.add(roofEdgeBack);
    // Visible roof beams/rafters underneath
    for (let rb = 0; rb < 4; rb++) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 4), stableWoodDarkMat);
      rafter.position.set(-2.2 + rb * 1.5, 2.7, 0); rafter.rotation.z = 0.08; stableGrp.add(rafter);
    }
    // Main ridge beam
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 0.1), stableWoodDarkMat);
    ridgeBeam.position.set(0, 2.72, 0); ridgeBeam.rotation.z = 0.08; stableGrp.add(ridgeBeam);
    // Stall dividers (2 inside)
    for (const dz of [-0.5, 0.5]) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 0.06), stableWoodMat);
      divider.position.set(0, 0.7, dz); stableGrp.add(divider);
      const divRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 8), stableWoodDarkMat);
      divRail.rotation.z = Math.PI / 2; divRail.position.set(0, 1.42, dz); stableGrp.add(divRail);
    }
    // Feeding trough
    const troughOuter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.5), stableWoodDarkMat);
    troughOuter.position.set(-1.2, 0.5, -1.0); stableGrp.add(troughOuter);
    const troughInner = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 }));
    troughInner.position.set(-1.2, 0.56, -1.0); stableGrp.add(troughInner);
    const troughHay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.95 }));
    troughHay.position.set(-1.2, 0.65, -1.0); stableGrp.add(troughHay);
    for (const tx of [-1.8, -0.6]) {
      const tLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), stableWoodDarkMat);
      tLeg.position.set(tx, 0.25, -1.0); stableGrp.add(tLeg);
    }
    // Hay bales and loose hay on ground (detailed)
    for (let h = 0; h < 8; h++) {
      const hayGroup = new THREE.Group();
      const hayDark = new THREE.MeshStandardMaterial({ color: 0xb89930, roughness: 0.95 });
      const hayMid = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.95 });
      const hayLight = new THREE.MeshStandardMaterial({ color: 0xddbb55, roughness: 0.95 });
      const hayMats = [hayDark, hayMid, hayLight];
      if (h < 4) {
        // Round bales (cylinder on side)
        const baleGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 10);
        const bale = new THREE.Mesh(baleGeo, hayMats[h % 3]);
        bale.rotation.z = Math.PI / 2;
        bale.castShadow = true; hayGroup.add(bale);
        // Twine wrapping (2 bands around the bale)
        const twineMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.85 });
        for (const tw of [-0.08, 0.08]) {
          const twineGeo = new THREE.TorusGeometry(0.18, 0.007, 6, 14);
          const twine = new THREE.Mesh(twineGeo, twineMat);
          twine.rotation.y = Math.PI / 2;
          twine.position.x = tw; hayGroup.add(twine);
        }
        // Straw pieces sticking out (thin cylinders)
        for (let si = 0; si < 8; si++) {
          const strawGeo = new THREE.CylinderGeometry(0.004, 0.002, 0.07 + Math.random() * 0.05, 3);
          const straw = new THREE.Mesh(strawGeo, hayMats[si % 3]);
          const angle = Math.random() * Math.PI * 2;
          straw.position.set(
            (Math.random() - 0.5) * 0.25,
            Math.cos(angle) * 0.18,
            Math.sin(angle) * 0.18
          );
          straw.rotation.set(Math.random() * 0.8, 0, Math.random() * 0.8);
          hayGroup.add(straw);
        }
      } else {
        // Rectangular bales with rounded edges
        const rectGeo = new THREE.BoxGeometry(0.45, 0.12, 0.3);
        const rect = new THREE.Mesh(rectGeo, hayMats[h % 3]);
        rect.castShadow = true; hayGroup.add(rect);
        // Rounded edge pieces on long edges
        for (const ez of [-0.15, 0.15]) {
          const edgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6);
          const edge = new THREE.Mesh(edgeGeo, hayMats[(h + 1) % 3]);
          edge.rotation.z = Math.PI / 2;
          edge.position.set(0, 0.06, ez); hayGroup.add(edge);
        }
        // Twine binding (2 bands)
        const twineMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.85 });
        for (const tx of [-0.1, 0.1]) {
          const bandV = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.13, 0.31), twineMat);
          bandV.position.set(tx, 0, 0); hayGroup.add(bandV);
          const bandT = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.31), twineMat);
          bandT.position.set(tx, 0.061, 0); hayGroup.add(bandT);
        }
        // Straw pieces sticking out
        for (let si = 0; si < 6; si++) {
          const strawGeo = new THREE.CylinderGeometry(0.004, 0.002, 0.05 + Math.random() * 0.04, 3);
          const straw = new THREE.Mesh(strawGeo, hayMats[si % 3]);
          straw.position.set(
            (Math.random() - 0.5) * 0.4,
            0.06,
            (Math.random() - 0.5) * 0.25
          );
          straw.rotation.set(Math.random() * 0.5 - 0.25, 0, Math.random() * 0.5 - 0.25);
          hayGroup.add(straw);
        }
      }
      // Scattered loose hay on the ground around each bale
      for (let li = 0; li < 5; li++) {
        const looseGeo = new THREE.CylinderGeometry(0.003, 0.001, 0.04 + Math.random() * 0.03, 3);
        const loose = new THREE.Mesh(looseGeo, hayMats[li % 3]);
        loose.position.set(
          (Math.random() - 0.5) * 0.5,
          -0.03,
          (Math.random() - 0.5) * 0.4
        );
        loose.rotation.set(Math.PI / 2 + Math.random() * 0.3, 0, Math.random() * Math.PI);
        hayGroup.add(loose);
      }
      // Color variation - subtle random tint per group
      hayGroup.position.set(-2 + h * 0.65, 0.12, (Math.random() - 0.5) * 2.5);
      hayGroup.rotation.y = Math.random() * 0.3;
      stableGrp.add(hayGroup);
    }
    // Hitching post
    const hitch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 8), stableWoodMat);
    hitch.rotation.z = Math.PI / 2; hitch.position.set(0, 2, 2); stableGrp.add(hitch);
    // Horseshoes hanging on posts
    for (const [hsx, hsz] of [[-2.5, 1.5], [2.5, 1.5]]) {
      const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12, Math.PI * 1.3),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 }));
      horseshoe.position.set(hsx, 1.8 + Math.random() * 0.3, hsz - 0.12);
      horseshoe.rotation.z = Math.PI; stableGrp.add(horseshoe);
    }
    // Saddle on rail
    const saddleBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7 }));
    saddleBase.position.set(1.0, 2.08, 2.0); stableGrp.add(saddleBase);
    const saddlePommel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7 }));
    saddlePommel.position.set(1.0, 2.18, 1.78); stableGrp.add(saddlePommel);
    const saddleCantle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7 }));
    saddleCantle.position.set(1.0, 2.16, 2.24); stableGrp.add(saddleCantle);
    // Bucket near entrance
    const stableBucketMat = new THREE.MeshStandardMaterial({ color: 0x666655, metalness: 0.3, roughness: 0.6 });
    const stableBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8), stableBucketMat);
    stableBucket.position.set(2.8, 0.125, 1.2); stableGrp.add(stableBucket);
    const stableBucketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 6, 12, Math.PI), stableBucketMat);
    stableBucketHandle.position.set(2.8, 0.3, 1.2); stableGrp.add(stableBucketHandle);
    // Stable light
    const stableLight = new THREE.PointLight(0xffaa44, 0.4, 8);
    stableLight.position.set(15, 2.5, 8); mctx.scene.add(stableLight); mctx.torchLights.push(stableLight);
    stableGrp.position.set(15, 0, 8); mctx.envGroup.add(stableGrp);

    // ── Market fruit/vegetable stalls (4) ──
    const stallWoodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const stallWoodDarkMat2 = new THREE.MeshStandardMaterial({ color: 0x6B4A0A, roughness: 0.85 });
    const stallAwningColors = [0xcc3333, 0x3366cc, 0x33aa55, 0xcc9933];
    // Faded/worn versions of awning colors
    const stallAwningFaded = [0x993333, 0x2a5599, 0x2a8844, 0x997733];
    for (let i = 0; i < 4; i++) {
      const stall = new THREE.Group();
      // Wooden frame - four corner posts
      for (const [cpx, cpz] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) {
        const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), stallWoodMat);
        cornerPost.position.set(cpx, 1.15, cpz); stall.add(cornerPost);
      }
      // Top beams connecting posts (front-back)
      for (const bx of [-1.2, 1.2]) {
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), stallWoodDarkMat2);
        topBeam.position.set(bx, 2.28, 0); stall.add(topBeam);
      }
      // Top beams connecting posts (left-right)
      for (const bz of [-0.6, 0.6]) {
        const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.06), stallWoodDarkMat2);
        sideBeam.position.set(0, 2.28, bz); stall.add(sideBeam);
      }
      // Back wall with plank construction
      for (let bk = 0; bk < 5; bk++) {
        const backPlank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x8B6914 + Math.floor(Math.random() * 0x111100), roughness: 0.8 }));
        backPlank.position.set(-1.0 + bk * 0.5, 1, -0.6); stall.add(backPlank);
      }
      // Awning - main fabric with draping folds (multiple angled planes)
      const awningColor = stallAwningColors[i];
      const awningFaded = stallAwningFaded[i];
      const awningMain = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.2),
        new THREE.MeshStandardMaterial({ color: awningFaded, roughness: 0.75, side: THREE.DoubleSide }));
      awningMain.position.set(0, 2.25, 0.15); awningMain.rotation.x = -0.35; stall.add(awningMain);
      // Front drape fold
      const awningDrape = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.35),
        new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.7, side: THREE.DoubleSide }));
      awningDrape.position.set(0, 1.95, 0.65); awningDrape.rotation.x = -0.8; stall.add(awningDrape);
      // Side drapes (scalloped edges)
      for (const sdx of [-1.35, 1.35]) {
        const sideDrape = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.5),
          new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.7, side: THREE.DoubleSide }));
        sideDrape.position.set(sdx, 2.0, 0.2); sideDrape.rotation.x = -0.35; stall.add(sideDrape);
      }
      // Rope ties holding the awning (4 corners)
      for (const [rx, rz] of [[-1.2, 0.5], [1.2, 0.5]]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 }));
        rope.position.set(rx, 2.1, rz); rope.rotation.z = 0.3 * Math.sign(rx); stall.add(rope);
      }
      // Table with visible plank construction
      const tableFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.06), stallWoodDarkMat2);
      tableFrame.position.set(0, 0.82, -0.1); stall.add(tableFrame);
      const tableFrameF = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.06), stallWoodDarkMat2);
      tableFrameF.position.set(0, 0.82, 0.5); stall.add(tableFrameF);
      // Individual table planks with slight color variation
      for (let tp = 0; tp < 5; tp++) {
        const tPlank = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x8B6914 + Math.floor(Math.random() * 0x0a0a00), roughness: 0.8 }));
        tPlank.position.set(0, 0.86, -0.06 + tp * 0.15); stall.add(tPlank);
      }
      // Table legs
      for (const [lx, lz] of [[-1.0, -0.05], [1.0, -0.05], [-1.0, 0.45], [1.0, 0.45]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.84, 0.06), stallWoodMat);
        leg.position.set(lx, 0.42, lz); stall.add(leg);
      }
      // Varied produce: fruits (spheres), cheese blocks, bread loaves
      const produceColors = [0xff3333, 0xff8800, 0x44aa44, 0xffff33, 0xaa3300];
      // Sphere fruits
      for (let p = 0; p < 5; p++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8),
          new THREE.MeshStandardMaterial({ color: produceColors[p % produceColors.length], roughness: 0.6 }));
        fruit.position.set(-0.7 + p * 0.25, 0.95, 0.05 + (Math.random() - 0.5) * 0.2); stall.add(fruit);
      }
      // Cheese blocks (BoxGeometry, yellow)
      for (let cb = 0; cb < 2; cb++) {
        const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xddcc44, roughness: 0.5 }));
        cheese.position.set(0.5 + cb * 0.18, 0.93, 0.25 + (Math.random() - 0.5) * 0.15);
        cheese.rotation.y = Math.random() * 0.3; stall.add(cheese);
      }
      // Bread loaves (CylinderGeometry, brown)
      for (let bl = 0; bl < 2; bl++) {
        const bread = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8),
          new THREE.MeshStandardMaterial({ color: 0xBB8833, roughness: 0.7 }));
        bread.rotation.z = Math.PI / 2;
        bread.position.set(-0.3 + bl * 0.25, 0.93, 0.35); stall.add(bread);
      }
      // Hanging items from awning frame (sausages/dried herbs)
      for (let hi = 0; hi < 3; hi++) {
        const hangStr = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 }));
        hangStr.position.set(-0.6 + hi * 0.6, 2.1, 0.0); stall.add(hangStr);
        const hangItem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.15, 6),
          new THREE.MeshStandardMaterial({ color: [0x993322, 0x336633, 0x884422][hi], roughness: 0.7 }));
        hangItem.position.set(-0.6 + hi * 0.6, 1.88, 0.0); stall.add(hangItem);
      }
      // Price sign (small PlaneGeometry on side post)
      const priceSign = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.6, side: THREE.DoubleSide }));
      priceSign.position.set(1.25, 1.3, 0.6); priceSign.rotation.y = 0.1; stall.add(priceSign);
      // Sign border
      const signBorder = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.02), stallWoodDarkMat2);
      signBorder.position.set(1.25, 1.39, 0.6); stall.add(signBorder);
      const stx = -12 + i * 7 + (Math.random() - 0.5) * 2; const stz = -10 + (Math.random() - 0.5) * 4;
      stall.position.set(stx, 0, stz); stall.rotation.y = (Math.random() - 0.5) * 0.4; mctx.envGroup.add(stall);
    }

    // ── Town fountain enhanced (1) ──
    {
      const fountain = new THREE.Group();
      // Fish statue
      const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, metalness: 0.2 }));
      fishBody.scale.set(1, 0.6, 2); fishBody.position.set(0.5, 1.5, 0); fountain.add(fishBody);
      // Tail fin planes
      const finMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), finMat);
      tail.position.set(0.5, 1.5, -0.35); tail.rotation.y = 0.3; fountain.add(tail);
      // Decorative carved rim stones
      for (let r = 0; r < 12; r++) {
        const rAngle = (r / 12) * Math.PI * 2;
        const rimStone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.7 }));
        rimStone.position.set(Math.cos(rAngle) * 2, 0.4, Math.sin(rAngle) * 2);
        rimStone.rotation.y = rAngle; fountain.add(rimStone);
      }
      // Sitting bench boxes around
      for (let b = 0; b < 3; b++) {
        const bAngle = (b / 3) * Math.PI * 2 + 0.5;
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        bench.position.set(Math.cos(bAngle) * 3, 0.25, Math.sin(bAngle) * 3);
        bench.rotation.y = bAngle + Math.PI / 2; fountain.add(bench);
      }
      fountain.position.set(2, 0, 2); mctx.envGroup.add(fountain);
    }

    // ── Street lamps (8) ──
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 });
    const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa44, emissiveIntensity: 0.8, roughness: 0.3 });
    for (let i = 0; i < 8; i++) {
      const lamp = new THREE.Group();
      // Tall iron post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 3.5, 8), lampPostMat);
      post.position.y = 1.75; lamp.add(post);
      // Curved arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), lampPostMat);
      arm.position.set(0.3, 3.4, 0); arm.rotation.z = -0.6; lamp.add(arm);
      // Hanging lantern box
      const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.2), lampGlowMat);
      lanternBox.position.set(0.55, 3.1, 0); lamp.add(lanternBox);
      const lampLight = new THREE.PointLight(0xffaa44, 0.5, 10);
      lampLight.position.set(0.55, 3.1, 0); lamp.add(lampLight); mctx.torchLights.push(lampLight);
      const lx = (Math.random() - 0.5) * w * 0.6; const lz = (Math.random() - 0.5) * d * 0.6;
      lamp.position.set(lx, 0, lz); mctx.envGroup.add(lamp);
    }

    // ── Blacksmith shop details (1) ──
    {
      const smithy = new THREE.Group();
      // Furnace box with emissive orange interior
      const furnace = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1),
        new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }));
      furnace.position.set(0, 0.6, 0); smithy.add(furnace);
      const furnaceGlow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0, roughness: 0.3 }));
      furnaceGlow.position.set(0, 0.5, 0.51); smithy.add(furnaceGlow);
      // Anvil
      const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.7 }));
      anvilBase.position.set(1.2, 0.2, 0); smithy.add(anvilBase);
      const anvilFace = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.7 }));
      anvilFace.position.set(1.2, 0.45, 0); smithy.add(anvilFace);
      // Hanging tool props on wall
      for (let t = 0; t < 4; t++) {
        const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4),
          new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
        tool.position.set(-0.4, 1.2 + t * 0.15, -0.4); tool.rotation.z = 0.1; smithy.add(tool);
      }
      // Water quench barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 12), stallWoodMat);
      barrel.position.set(1.8, 0.3, 0.3); smithy.add(barrel);
      const barrelWater = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12),
        new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.5, roughness: 0.1 }));
      barrelWater.rotation.x = -Math.PI / 2; barrelWater.position.set(1.8, 0.61, 0.3); smithy.add(barrelWater);
      const forgeLight = new THREE.PointLight(0xff6633, 0.8, 8);
      forgeLight.position.set(0, 1.2, 0.5); smithy.add(forgeLight); mctx.torchLights.push(forgeLight);
      smithy.position.set(-18, 0, 5); mctx.envGroup.add(smithy);
    }

    // ── Horse hitching posts (4) ──
    const hitchPostMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const hitchGrp = new THREE.Group();
      // Two vertical posts
      for (const hx of [-0.6, 0.6]) {
        const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), hitchPostMat);
        vPost.position.set(hx, 0.6, 0); hitchGrp.add(vPost);
      }
      // Horizontal bar
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), hitchPostMat);
      hBar.rotation.z = Math.PI / 2; hBar.position.set(0, 1.0, 0); hitchGrp.add(hBar);
      // Rope loops (small torus)
      for (let r = 0; r < 2; r++) {
        const rope = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0xaa8855, roughness: 0.9 }));
        rope.position.set(-0.3 + r * 0.6, 0.95, 0.04); hitchGrp.add(rope);
      }
      // Water trough
      const trough = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.4), hitchPostMat);
      trough.position.set(0, 0.15, 0.5); hitchGrp.add(trough);
      const troughWater = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x4488aa, transparent: true, opacity: 0.5, roughness: 0.1 }));
      troughWater.rotation.x = -Math.PI / 2; troughWater.position.set(0, 0.28, 0.5); hitchGrp.add(troughWater);
      const hpx = -8 + i * 6 + (Math.random() - 0.5) * 2; const hpz = 12 + (Math.random() - 0.5) * 4;
      hitchGrp.position.set(hpx, 0, hpz); mctx.envGroup.add(hitchGrp);
    }

    // ── Hay carts in street (2) ──
    const cartWoodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const cartHayMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.95 });
    for (let i = 0; i < 2; i++) {
      const hayCart = new THREE.Group();
      // Box cart body
      const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.2), cartWoodMat);
      cartBody.position.y = 0.6; hayCart.add(cartBody);
      // Cylinder wheels
      for (const [wx, wz] of [[-0.7, -0.6], [-0.7, 0.6], [0.7, -0.6], [0.7, 0.6]] as [number, number][]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
        wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.25, wz); hayCart.add(wheel);
      }
      // Hay piled on top
      for (let h = 0; h < 5; h++) {
        const hayBale = new THREE.Mesh(
          Math.random() > 0.5 ? new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6) : new THREE.CylinderGeometry(0.1, 0.1, 0.3, 6),
          cartHayMat);
        hayBale.position.set((Math.random() - 0.5) * 1.2, 0.95 + Math.random() * 0.2, (Math.random() - 0.5) * 0.6);
        hayBale.rotation.set(Math.random(), Math.random(), Math.random()); hayCart.add(hayBale);
      }
      const hcx = 8 + i * 10; const hcz = -5 + i * 8;
      hayCart.position.set(hcx, 0, hcz); hayCart.rotation.y = Math.random() * 0.5; mctx.envGroup.add(hayCart);
    }

    // ── Barrel stacks (6) ──
    const stackBarrelMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const barrelGrp = new THREE.Group();
      const barrelCount = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < barrelCount; b++) {
        const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 12), stackBarrelMat);
        if (b < 2) {
          brl.position.set(b * 0.55, 0.3, 0);
        } else {
          brl.position.set((b - 2) * 0.55 + 0.27, 0.9, 0);
        }
        barrelGrp.add(brl);
      }
      const bsx = (Math.random() - 0.5) * w * 0.5; const bsz = (Math.random() - 0.5) * d * 0.5;
      barrelGrp.position.set(bsx, 0, bsz); barrelGrp.rotation.y = Math.random() * Math.PI; mctx.envGroup.add(barrelGrp);
    }

    // ── Cat/dog props (4) ──
    const animalMats = [
      new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xccaa77, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.8 }),
    ];
    for (let i = 0; i < 4; i++) {
      const animal = new THREE.Group();
      const aMat = animalMats[i];
      const isCat = i < 2;
      const bodyLen = isCat ? 0.25 : 0.35;
      const bodyH = isCat ? 0.1 : 0.15;
      // Box body
      const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, bodyH, 0.12), aMat);
      body.position.y = isCat ? 0.18 : 0.25; animal.add(body);
      // Sphere head
      const headR = isCat ? 0.06 : 0.08;
      const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 6, 6), aMat);
      head.position.set(bodyLen / 2 + headR * 0.6, isCat ? 0.22 : 0.3, 0); animal.add(head);
      // Thin cylinder legs
      const legH = isCat ? 0.12 : 0.18;
      for (const [lx, lz] of [[-bodyLen * 0.3, -0.04], [-bodyLen * 0.3, 0.04], [bodyLen * 0.3, -0.04], [bodyLen * 0.3, 0.04]] as [number, number][]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, legH, 4), aMat);
        leg.position.set(lx, legH / 2, lz); animal.add(leg);
      }
      // Tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, isCat ? 0.2 : 0.15, 4), aMat);
      tail.position.set(-bodyLen / 2 - 0.08, isCat ? 0.25 : 0.3, 0);
      tail.rotation.z = isCat ? 0.8 : -0.5; animal.add(tail);
      const anx = (Math.random() - 0.5) * w * 0.4; const anz = (Math.random() - 0.5) * d * 0.4;
      animal.position.set(anx, 0, anz); animal.rotation.y = Math.random() * Math.PI * 2; mctx.envGroup.add(animal);
    }

    // Register building colliders for Camelot
    mctx.buildingColliders = buildingPositions.map(([x, z, bw, bd]) => [x, z, bw / 2 + 0.5, bd / 2 + 0.5] as [number, number, number, number]);
}

export function buildVolcanicWastes(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x331100, 0.017);
    mctx.applyTerrainColors(0x1a0a00, 0x3a2a1a, 1.6);
    mctx.dirLight.color.setHex(0xff6633);
    mctx.dirLight.intensity = 1.0;
    mctx.ambientLight.color.setHex(0x441100);
    mctx.ambientLight.intensity = 0.5;
    mctx.hemiLight.color.setHex(0xff4400);
    mctx.hemiLight.groundColor.setHex(0x220000);

    // Lava rivers (glowing strips) with enhanced glow
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2,
      roughness: 0.2, metalness: 0.15,
    });
    for (let i = 0; i < 8; i++) {
      const riverW = 1.5 + Math.random() * 2;
      const riverL = 20 + Math.random() * 30;
      const river = new THREE.Mesh(new THREE.PlaneGeometry(riverW, riverL), lavaMat);
      river.rotation.x = -Math.PI / 2;
      const rvX = (Math.random() - 0.5) * w * 0.7;
      const rvZ = (Math.random() - 0.5) * d * 0.7;
      river.position.set(rvX, getTerrainHeight(rvX, rvZ, 1.6) + 0.05, rvZ);
      river.rotation.z = Math.random() * Math.PI;
      mctx.envGroup.add(river);

      // Lava glow light
      const lavaLight = new THREE.PointLight(0xff4400, 2, 15);
      lavaLight.position.set(river.position.x, 1, river.position.z);
      mctx.scene.add(lavaLight);
      mctx.torchLights.push(lavaLight);
      // Heat shimmer particles near lava river
      for (let h = 0; h < 3; h++) {
        const shimmer = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 36, 36),
          new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff6622, emissiveIntensity: 0.6, transparent: true, opacity: 0.15 }));
        shimmer.position.set(rvX + (Math.random() - 0.5) * riverW, getTerrainHeight(rvX, rvZ, 1.6) + 0.4 + Math.random() * 0.8, rvZ + (Math.random() - 0.5) * 2);
        mctx.envGroup.add(shimmer);
      }
      // Ground crack lines near lava river
      for (let cr = 0; cr < 2; cr++) {
        const crackLine = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5 + Math.random() * 2, 36),
          new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 }));
        crackLine.rotation.z = Math.PI / 2;
        crackLine.rotation.y = Math.random() * Math.PI;
        crackLine.position.set(rvX + (Math.random() - 0.5) * riverW * 2, getTerrainHeight(rvX, rvZ, 1.6) + 0.02, rvZ + (Math.random() - 0.5) * 3);
        mctx.envGroup.add(crackLine);
      }
    }

    // Volcanic rocks / boulders (80) with varied materials
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.2, metalness: 0.5 });
    for (let i = 0; i < 80; i++) {
      const mat = Math.random() < 0.3 ? obsidianMat : rockMat;
      const rSize = 0.3 + Math.random() * 1.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 3), mat);
      const vrX = (Math.random() - 0.5) * w * 0.9;
      const vrZ = (Math.random() - 0.5) * d * 0.9;
      rock.position.set(vrX, getTerrainHeight(vrX, vrZ, 1.6) + rSize * 0.3, vrZ);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      mctx.envGroup.add(rock);

      // Lava crust details on rock surface (dark overlapping thin spheres with orange emissive edges)
      for (let lc = 0; lc < 3; lc++) {
        const crustR = rSize * (0.3 + Math.random() * 0.3);
        const crustShell = new THREE.Mesh(new THREE.SphereGeometry(crustR, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x0a0500, roughness: 0.95, transparent: true, opacity: 0.7 }));
        const crustAng = Math.random() * Math.PI * 2;
        const crustElev = (Math.random() - 0.5) * 0.5;
        crustShell.position.set(
          vrX + Math.cos(crustAng) * rSize * 0.4,
          getTerrainHeight(vrX, vrZ, 1.6) + rSize * 0.3 + crustElev,
          vrZ + Math.sin(crustAng) * rSize * 0.4
        );
        crustShell.scale.y = 0.3;
        mctx.envGroup.add(crustShell);
        // Orange emissive edge ring around crust
        const crustEdge = new THREE.Mesh(new THREE.TorusGeometry(crustR * 0.85, 0.015, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 }));
        crustEdge.position.copy(crustShell.position);
        crustEdge.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        mctx.envGroup.add(crustEdge);
      }

      // Ember particles resting on rock surface (tiny emissive spheres)
      for (let ep = 0; ep < 2; ep++) {
        const restEmber = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 1.5 }));
        restEmber.position.set(
          vrX + (Math.random() - 0.5) * rSize * 0.6,
          getTerrainHeight(vrX, vrZ, 1.6) + rSize * 0.5 + Math.random() * rSize * 0.2,
          vrZ + (Math.random() - 0.5) * rSize * 0.6
        );
        mctx.envGroup.add(restEmber);
      }
    }

    // Obsidian shard clusters (12) - faceted crystals with glowing veins and ground scorching
    for (let i = 0; i < 12; i++) {
      const clusterGrp = new THREE.Group();
      const numShards = 3 + Math.floor(Math.random() * 4);

      // Ground scorching dark circle beneath each cluster
      const scorchRadius = 0.4 + Math.random() * 0.3;
      const scorch = new THREE.Mesh(
        new THREE.CircleGeometry(scorchRadius, 12),
        new THREE.MeshStandardMaterial({ color: 0x020105, roughness: 1.0, metalness: 0.0 })
      );
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.set(0, 0.002, 0);
      clusterGrp.add(scorch);

      for (let s = 0; s < numShards; s++) {
        const shH = 0.3 + Math.random() * 0.8;
        const shardMat = new THREE.MeshStandardMaterial({
          color: 0x0a0820,
          roughness: 0.05,
          metalness: 0.9,
          emissive: 0x1a0a2a,
          emissiveIntensity: 0.3,
        });
        const sOffX = (Math.random() - 0.5) * 0.5;
        const sOffZ = (Math.random() - 0.5) * 0.5;
        const shardRotX = (Math.random() - 0.5) * 0.7;
        const shardRotY = Math.random() * Math.PI;
        const shardRotZ = (Math.random() - 0.5) * 0.7;
        let shardMesh: THREE.Mesh;
        if (Math.random() > 0.4) {
          // Faceted box-based crystal shard with non-uniform scale for angular crystal look
          shardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.04 + Math.random() * 0.04, shH, 0.04 + Math.random() * 0.04),
            shardMat
          );
          shardMesh.scale.set(0.5 + Math.random() * 0.8, 1, 0.5 + Math.random() * 0.8);
        } else {
          // Narrow low-segment cone for pointed tip variety
          shardMesh = new THREE.Mesh(
            new THREE.ConeGeometry(0.03 + Math.random() * 0.04, shH, 5),
            shardMat
          );
        }
        shardMesh.position.set(sOffX, shH / 2, sOffZ);
        shardMesh.rotation.set(shardRotX, shardRotY, shardRotZ);
        clusterGrp.add(shardMesh);

        // Small emissive purple/blue vein cylinder running along each shard surface
        const veinH = shH * (0.5 + Math.random() * 0.4);
        const vein = new THREE.Mesh(
          new THREE.CylinderGeometry(0.004, 0.004, veinH, 4),
          new THREE.MeshStandardMaterial({ color: 0x2a0a4a, emissive: 0x5510aa, emissiveIntensity: 0.8 })
        );
        vein.position.set(sOffX + 0.02, shH * 0.5 - (shH - veinH) * 0.3, sOffZ + 0.02);
        vein.rotation.set(shardRotX, shardRotY, shardRotZ);
        clusterGrp.add(vein);
      }

      // Small obsidian fragment chips scattered around base (tiny dodecahedrons)
      const numChips = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < numChips; c++) {
        const chipSize = 0.02 + Math.random() * 0.04;
        const chip = new THREE.Mesh(
          new THREE.DodecahedronGeometry(chipSize, 0),
          new THREE.MeshStandardMaterial({ color: 0x060510, roughness: 0.1, metalness: 0.85 })
        );
        chip.position.set(
          (Math.random() - 0.5) * scorchRadius * 1.6,
          chipSize * 0.5,
          (Math.random() - 0.5) * scorchRadius * 1.6
        );
        chip.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        clusterGrp.add(chip);
      }

      const oscX = (Math.random() - 0.5) * w * 0.85;
      const oscZ = (Math.random() - 0.5) * d * 0.85;
      clusterGrp.position.set(oscX, getTerrainHeight(oscX, oscZ, 1.6), oscZ);
      mctx.envGroup.add(clusterGrp);
    }

    // Cracked ground detail lines (20) - glowing lava-lit cracks with raised edges and steam vents
    for (let i = 0; i < 20; i++) {
      const crackDetailGrp = new THREE.Group();
      const mainLen = 1.5 + Math.random() * 3;
      const crackW = 0.03 + Math.random() * 0.02;

      // Main crack dark surface box
      const mainCrackBox = new THREE.Mesh(
        new THREE.BoxGeometry(mainLen, 0.01, crackW),
        new THREE.MeshStandardMaterial({ color: 0x050200, roughness: 1.0 })
      );
      crackDetailGrp.add(mainCrackBox);

      // Faint lava glow beneath main crack (thinner emissive box just below surface)
      const lavaGlow = new THREE.Mesh(
        new THREE.BoxGeometry(mainLen * 0.9, 0.008, crackW * 0.5),
        new THREE.MeshStandardMaterial({ color: 0x330800, emissive: 0xff3300, emissiveIntensity: 0.6 })
      );
      lavaGlow.position.set(0, -0.004, 0);
      crackDetailGrp.add(lavaGlow);

      // Raised edges along crack borders (very thin boxes slightly above crack on each side)
      for (const side of [-1, 1]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(mainLen, 0.008, 0.008),
          new THREE.MeshStandardMaterial({ color: 0x030100, roughness: 1.0 })
        );
        edge.position.set(0, 0.005, side * (crackW * 0.5 + 0.005));
        crackDetailGrp.add(edge);
      }

      // Branch cracks (4 instead of 2) at varied angles
      for (let bc = 0; bc < 4; bc++) {
        const brLen = 0.5 + Math.random() * 1.0;
        const brW = 0.015 + Math.random() * 0.01;
        const brCrack = new THREE.Mesh(
          new THREE.BoxGeometry(brLen, 0.01, brW),
          new THREE.MeshStandardMaterial({ color: 0x050200, roughness: 1.0 })
        );
        const brOffX = (Math.random() - 0.5) * mainLen * 0.7;
        const brOffZ = (bc < 2 ? 1 : -1) * (0.1 + Math.random() * 0.25);
        brCrack.position.set(brOffX, 0, brOffZ);
        brCrack.rotation.y = (Math.random() - 0.5) * 1.0;
        crackDetailGrp.add(brCrack);

        // Lava glow inside each branch crack
        const brLava = new THREE.Mesh(
          new THREE.BoxGeometry(brLen * 0.85, 0.006, brW * 0.4),
          new THREE.MeshStandardMaterial({ color: 0x220400, emissive: 0xdd2200, emissiveIntensity: 0.5 })
        );
        brLava.position.copy(brCrack.position);
        brLava.position.y -= 0.003;
        brLava.rotation.copy(brCrack.rotation);
        crackDetailGrp.add(brLava);
      }

      // Occasional steam vent at crack intersection (small upward-pointing cone)
      if (Math.random() > 0.4) {
        const steamCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.18, 6),
          new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            emissive: 0xdddddd,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.55,
          })
        );
        steamCone.position.set((Math.random() - 0.5) * mainLen * 0.3, 0.09, 0);
        crackDetailGrp.add(steamCone);
      }

      // Heat distortion placeholder: small transparent emissive sphere above wider cracks
      if (crackW > 0.04) {
        const heatSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.12,
          })
        );
        heatSphere.position.set(0, 0.12, 0);
        crackDetailGrp.add(heatSphere);
      }

      const cgX = (Math.random() - 0.5) * w * 0.85;
      const cgZ = (Math.random() - 0.5) * d * 0.85;
      crackDetailGrp.position.set(cgX, getTerrainHeight(cgX, cgZ, 1.6) + 0.01, cgZ);
      crackDetailGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(crackDetailGrp);
    }

    // Ash pillars / volcanic columns (28) - layered basalt columns with lava veins and rubble
    for (let i = 0; i < 28; i++) {
      const pillarGrp = new THREE.Group();
      const pH = 2 + Math.random() * 5;
      const pR = 0.3 + Math.random() * 0.5;
      const numSegments = 3 + Math.floor(Math.random() * 3); // 3-5 stacked segments
      const segH = pH / numSegments;
      const baseColor = new THREE.Color(0x332211);

      // Build layered ring segments
      let stackY = 0;
      for (let seg = 0; seg < numSegments; seg++) {
        const segRadTop = pR * (0.55 + Math.random() * 0.15) * (1 - seg * 0.04);
        const segRadBot = pR * (0.7 + Math.random() * 0.2) * (1 - seg * 0.04);
        const brightnessShift = (Math.random() - 0.5) * 0.12;
        const segColor = baseColor.clone().addScalar(brightnessShift);
        const segMat = new THREE.MeshStandardMaterial({
          color: segColor,
          roughness: 0.85 + Math.random() * 0.1,
        });
        const segMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(segRadTop, segRadBot, segH, 8),
          segMat
        );
        segMesh.position.set(0, stackY + segH / 2, 0);
        segMesh.castShadow = true;
        pillarGrp.add(segMesh);

        // Horizontal crack band torus ring between segments (except after last)
        if (seg < numSegments - 1) {
          const crackRing = new THREE.Mesh(
            new THREE.TorusGeometry(segRadBot * 0.95, 0.018, 6, 12),
            new THREE.MeshStandardMaterial({ color: 0x110800, roughness: 1.0 })
          );
          crackRing.rotation.x = Math.PI / 2;
          crackRing.position.set(0, stackY + segH, 0);
          pillarGrp.add(crackRing);
        }

        stackY += segH;
      }

      // Embedded glowing lava veins running vertically on pillar surface (2-3 veins)
      const numVeins = 2 + Math.floor(Math.random() * 2);
      for (let v = 0; v < numVeins; v++) {
        const vAngle = (v / numVeins) * Math.PI * 2 + Math.random() * 0.5;
        const veinLen = pH * (0.4 + Math.random() * 0.45);
        const veinMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, veinLen, 4),
          new THREE.MeshStandardMaterial({ color: 0x551100, emissive: 0xff3300, emissiveIntensity: 0.7 })
        );
        veinMesh.position.set(
          Math.cos(vAngle) * pR * 0.92,
          pH * 0.2 + Math.random() * pH * 0.3,
          Math.sin(vAngle) * pR * 0.92
        );
        pillarGrp.add(veinMesh);
      }

      // Rocky cap on top (dodecahedron slightly wider than pillar top)
      const capR = pR * (0.55 + Math.random() * 0.2);
      const cap = new THREE.Mesh(
        new THREE.DodecahedronGeometry(capR, 0),
        new THREE.MeshStandardMaterial({ color: 0x221508, roughness: 0.9 })
      );
      cap.position.set(0, pH + capR * 0.5, 0);
      cap.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      pillarGrp.add(cap);

      // Base rubble: 3-5 small scattered dodecahedrons around the bottom
      const numRubble = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < numRubble; r++) {
        const rubR = 0.06 + Math.random() * 0.12;
        const rubble = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rubR, 0),
          new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 })
        );
        const rubAngle = Math.random() * Math.PI * 2;
        const rubDist = pR * (1.0 + Math.random() * 0.8);
        rubble.position.set(
          Math.cos(rubAngle) * rubDist,
          rubR * 0.5,
          Math.sin(rubAngle) * rubDist
        );
        rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        pillarGrp.add(rubble);
      }

      const pX = (Math.random() - 0.5) * w * 0.85;
      const pZ = (Math.random() - 0.5) * d * 0.85;
      pillarGrp.position.set(pX, getTerrainHeight(pX, pZ, 1.6), pZ);
      mctx.envGroup.add(pillarGrp);
    }

    // Ember particles (60 ground + 30 floating)
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 60; i++) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 8, 6), emberMat);
      ember.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.1 + Math.random() * 0.3,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(ember);
    }
    // Floating ember particles rising in air
    const floatEmberMat = new THREE.MeshStandardMaterial({
      color: 0xff8822, emissive: 0xff4400, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.5,
    });
    for (let i = 0; i < 30; i++) {
      const fEmber = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 8, 6), floatEmberMat);
      fEmber.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.5 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(fEmber);
    }

    // Ruined structures (8) - brick construction, collapsed sections, scorch marks, openings
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const ruinMatDark = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.95 });
    const ruinMatScorched = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1.0 });
    const ruinMatInner = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.85 });
    for (let i = 0; i < 8; i++) {
      const ruinGroup = new THREE.Group();
      const wallH = 1.5 + Math.random() * 3;
      const wallW = 2 + Math.random() * 2;

      // Main wall body (slightly recessed to allow brick overlay)
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 0.25), ruinMat);
      wall.position.y = wallH / 2;
      wall.castShadow = true;
      ruinGroup.add(wall);

      // Individual stone block construction (brick rows with mortar gaps)
      const brickH = 0.12;
      const brickW = 0.25;
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.9 });
      void new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 1.0 }); // mortarMat reserved
      const numRows = Math.floor(wallH / (brickH + 0.02));
      for (let row = 0; row < Math.min(numRows, 12); row++) {
        const rowY = row * (brickH + 0.02) + brickH / 2;
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        const numBricks = Math.floor(wallW / (brickW + 0.02));
        for (let b = 0; b < numBricks; b++) {
          // Skip some bricks randomly for weathered look
          if (Math.random() < 0.15) continue;
          const bx = -wallW / 2 + offset + b * (brickW + 0.02) + brickW / 2;
          if (bx > wallW / 2 - brickW / 2) continue;
          const brick = new THREE.Mesh(new THREE.BoxGeometry(brickW, brickH, 0.04), brickMat);
          brick.position.set(bx, rowY, 0.15);
          ruinGroup.add(brick);
        }
      }

      // Partially collapsed section (one side shorter)
      const collapseX = (Math.random() > 0.5 ? 1 : -1) * wallW * 0.3;
      void (wallH * (0.3 + Math.random() * 0.3)); // collapseH reserved
      // Jagged top edge pieces
      for (let jt = 0; jt < 3 + Math.floor(Math.random() * 3); jt++) {
        const jagW = 0.15 + Math.random() * 0.2;
        const jagH = 0.1 + Math.random() * 0.25;
        const jag = new THREE.Mesh(new THREE.BoxGeometry(jagW, jagH, 0.3), ruinMat);
        jag.position.set(
          collapseX + (Math.random() - 0.5) * wallW * 0.3,
          wallH + (Math.random() - 0.5) * 0.2,
          0
        );
        jag.rotation.z = (Math.random() - 0.5) * 0.4;
        ruinGroup.add(jag);
      }

      // Fallen blocks scattered below the collapsed section
      for (let fb = 0; fb < 4 + Math.floor(Math.random() * 4); fb++) {
        const fbSize = 0.08 + Math.random() * 0.15;
        const fallenBlock = new THREE.Mesh(new THREE.BoxGeometry(fbSize * 1.5, fbSize, fbSize), ruinMat);
        fallenBlock.position.set(
          collapseX + (Math.random() - 0.5) * 1.5,
          fbSize / 2,
          0.3 + Math.random() * 0.8
        );
        fallenBlock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
        ruinGroup.add(fallenBlock);
      }

      // Charred/scorched marks (darker material patches on wall)
      for (let sc = 0; sc < 2 + Math.floor(Math.random() * 3); sc++) {
        const scorchW = 0.3 + Math.random() * 0.5;
        const scorchH = 0.3 + Math.random() * 0.6;
        const scorch = new THREE.Mesh(new THREE.PlaneGeometry(scorchW, scorchH), ruinMatScorched);
        scorch.position.set(
          (Math.random() - 0.5) * wallW * 0.7,
          0.3 + Math.random() * (wallH - 0.6),
          0.16
        );
        scorch.rotation.z = (Math.random() - 0.5) * 0.3;
        ruinGroup.add(scorch);
      }

      // Window/doorway openings (dark recessed gaps)
      if (wallH > 2.5 && wallW > 2.5) {
        const openingMat = new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 1.0 });
        if (Math.random() > 0.5) {
          // Window opening
          const winW = 0.4 + Math.random() * 0.3;
          const winH = 0.5 + Math.random() * 0.3;
          const window2 = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), openingMat);
          window2.position.set((Math.random() - 0.5) * wallW * 0.4, wallH * 0.65, 0.14);
          ruinGroup.add(window2);
          // Window frame (thin boxes)
          const frameMat = ruinMatDark;
          for (const fs of [-1, 1]) {
            const vFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, winH + 0.06, 0.06), frameMat);
            vFrame.position.set(window2.position.x + fs * (winW / 2 + 0.025), window2.position.y, 0.16);
            ruinGroup.add(vFrame);
          }
          const hFrameTop = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.1, 0.06, 0.06), frameMat);
          hFrameTop.position.set(window2.position.x, window2.position.y + winH / 2 + 0.03, 0.16);
          ruinGroup.add(hFrameTop);
        } else {
          // Doorway opening
          const doorW = 0.6 + Math.random() * 0.3;
          const doorH = 1.2 + Math.random() * 0.5;
          const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), openingMat);
          door.position.set((Math.random() - 0.5) * wallW * 0.3, doorH / 2, 0.14);
          ruinGroup.add(door);
        }
      }

      // Exposed inner wall texture (different color on broken edges)
      const innerEdge = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallH * 0.3, 0.28), ruinMatInner);
      innerEdge.position.set(wallW / 2 - 0.05, wallH * 0.7, 0);
      ruinGroup.add(innerEdge);
      const innerEdge2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallH * 0.25, 0.28), ruinMatInner);
      innerEdge2.position.set(-wallW / 2 + 0.05, wallH * 0.8, 0);
      ruinGroup.add(innerEdge2);

      // Rubble pile at base (multiple DodecahedronGeometry)
      for (let rp = 0; rp < 6 + Math.floor(Math.random() * 5); rp++) {
        const rpSize = 0.05 + Math.random() * 0.12;
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(rpSize, 1), ruinMat);
        rubble.position.set(
          (Math.random() - 0.5) * wallW * 0.8,
          rpSize * 0.4,
          0.2 + Math.random() * 0.6
        );
        rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        ruinGroup.add(rubble);
      }

      const ruX = (Math.random() - 0.5) * w * 0.7;
      const ruZ = (Math.random() - 0.5) * d * 0.7;
      ruinGroup.position.set(ruX, getTerrainHeight(ruX, ruZ, 1.6), ruZ);
      ruinGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(ruinGroup);
    }

    // Steam vents (16) with heat haze effect
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x444444, transparent: true, opacity: 0.2, roughness: 1.0,
    });
    for (let i = 0; i < 16; i++) {
      const ventGroup = new THREE.Group();
      const ventHole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.2, 44), rockMat);
      ventGroup.add(ventHole);
      // Rim rocks around vent
      for (let r = 0; r < 5; r++) {
        const rimRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.1, 4), rockMat);
        const rimAng = (r / 5) * Math.PI * 2;
        rimRock.position.set(Math.cos(rimAng) * 0.45, 0.1, Math.sin(rimAng) * 0.45);
        rimRock.scale.y = 0.5;
        ventGroup.add(rimRock);
      }
      // Steam puffs (more layers)
      for (let s = 0; s < 5; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2 + s * 0.12, 16, 12), smokeMat);
        puff.position.y = 0.5 + s * 0.5;
        puff.scale.set(1 + s * 0.3, 1, 1 + s * 0.3);
        ventGroup.add(puff);
      }
      // Heat haze shimmer (transparent plane)
      const hazeGeo = new THREE.PlaneGeometry(1.5, 3);
      const hazeMat = new THREE.MeshStandardMaterial({
        color: 0xffaa44, transparent: true, opacity: 0.03,
        roughness: 0.5, side: THREE.DoubleSide,
      });
      const haze = new THREE.Mesh(hazeGeo, hazeMat);
      haze.position.y = 2;
      haze.rotation.y = Math.random() * Math.PI;
      ventGroup.add(haze);
      // Volcanic vent steam column - stacked translucent spheres rising high
      for (let sc = 0; sc < 8; sc++) {
        const steamSphere = new THREE.Mesh(new THREE.SphereGeometry(0.15 + sc * 0.08, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.08 - sc * 0.007, roughness: 1.0 }));
        steamSphere.position.y = 3 + sc * 0.6;
        steamSphere.scale.set(1 + sc * 0.2, 0.8, 1 + sc * 0.2);
        ventGroup.add(steamSphere);
      }
      const svX = (Math.random() - 0.5) * w * 0.8;
      const svZ = (Math.random() - 0.5) * d * 0.8;
      ventGroup.position.set(svX, getTerrainHeight(svX, svZ, 1.6), svZ);
      mctx.envGroup.add(ventGroup);
    }

    // Bone piles (15)
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 });
    for (let i = 0; i < 15; i++) {
      const boneGroup = new THREE.Group();
      for (let b = 0; b < 5; b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3 + Math.random() * 0.2, 44), boneMat);
        bone.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3);
        bone.rotation.set(Math.random(), Math.random(), Math.random());
        boneGroup.add(bone);
      }
      // Ash deposit beneath bone pile
      const boneAsh = new THREE.Mesh(new THREE.CircleGeometry(0.25 + Math.random() * 0.2, 36),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 1.0, transparent: true, opacity: 0.4 }));
      boneAsh.rotation.x = -Math.PI / 2;
      boneAsh.position.y = 0.01;
      boneGroup.add(boneAsh);
      const bgX = (Math.random() - 0.5) * w * 0.8;
      const bgZ = (Math.random() - 0.5) * d * 0.8;
      boneGroup.position.set(bgX, getTerrainHeight(bgX, bgZ, 1.6), bgZ);
      mctx.envGroup.add(boneGroup);
    }

    // Cracked ground patches (30)
    const crackMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00, roughness: 1.0, transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 30; i++) {
      const crack = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.8 + Math.random() * 0.5, 12),
        crackMat
      );
      crack.rotation.x = -Math.PI / 2;
      crack.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.02,
        (Math.random() - 0.5) * d * 0.85
      );
      mctx.envGroup.add(crack);
    }

    // Charred dead trees (22) with more detailed branches
    const charredMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    for (let i = 0; i < 22; i++) {
      const treeGrp = new THREE.Group();
      const trunkH = 2 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, trunkH, 44), charredMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGrp.add(trunk);
      // Bare branches
      const numBranches = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < numBranches; b++) {
        const branchLen = 0.5 + Math.random() * 1.0;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, branchLen, 44), charredMat);
        const branchY = trunkH * 0.5 + Math.random() * trunkH * 0.4;
        const branchAngle = Math.random() * Math.PI * 2;
        branch.position.set(Math.cos(branchAngle) * 0.1, branchY, Math.sin(branchAngle) * 0.1);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.5;
        treeGrp.add(branch);
      }
      // Ash deposits around base of charred tree
      for (let ad = 0; ad < 2; ad++) {
        const ashDeposit = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.4, 36),
          new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1.0, transparent: true, opacity: 0.45 }));
        ashDeposit.rotation.x = -Math.PI / 2;
        ashDeposit.position.set((Math.random() - 0.5) * 0.6, 0.01, (Math.random() - 0.5) * 0.6);
        treeGrp.add(ashDeposit);
      }
      // Floating ember sparks rising from charred tree
      for (let te = 0; te < 2; te++) {
        const treeEmber = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 36, 36),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.2, transparent: true, opacity: 0.5 }));
        treeEmber.position.set((Math.random() - 0.5) * 0.3, trunkH * 0.6 + Math.random() * trunkH * 0.3, (Math.random() - 0.5) * 0.3);
        treeGrp.add(treeEmber);
      }
      // Scorched stump detail - charred root knobs at base
      const stumpR = 0.15 + Math.random() * 0.08;
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(stumpR, stumpR * 1.3, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0 }));
      stump.position.y = 0.07;
      treeGrp.add(stump);
      // Charred bark texture rings on trunk
      for (let br = 0; br < 3; br++) {
        const barkRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12),
          new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }));
        barkRing.position.y = 0.3 + br * (trunkH * 0.25);
        barkRing.rotation.x = Math.PI / 2;
        treeGrp.add(barkRing);
      }
      // Charred hollow detail at broken top
      const hollowTop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 }));
      hollowTop.position.y = trunkH + 0.02;
      treeGrp.add(hollowTop);
      const ctX = (Math.random() - 0.5) * w * 0.85;
      const ctZ = (Math.random() - 0.5) * d * 0.85;
      treeGrp.position.set(ctX, getTerrainHeight(ctX, ctZ, 1.6), ctZ);
      mctx.envGroup.add(treeGrp);
    }

    // Scorched dead tree stumps (10) with charred detail
    for (let i = 0; i < 10; i++) {
      const stumpGrp = new THREE.Group();
      const stH = 0.3 + Math.random() * 0.6;
      const stR = 0.15 + Math.random() * 0.15;
      const stumpBody = new THREE.Mesh(new THREE.CylinderGeometry(stR * 0.8, stR, stH, 10),
        new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 1.0 }));
      stumpBody.position.y = stH / 2;
      stumpGrp.add(stumpBody);
      // Exposed root stubs
      for (let rt = 0; rt < 3; rt++) {
        const rootAng = (rt / 3) * Math.PI * 2 + Math.random() * 0.5;
        const rootLen = 0.2 + Math.random() * 0.3;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, rootLen, 6),
          new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0 }));
        root.position.set(Math.cos(rootAng) * stR * 0.8, 0.05, Math.sin(rootAng) * stR * 0.8);
        root.rotation.z = Math.PI / 2;
        root.rotation.y = rootAng;
        stumpGrp.add(root);
      }
      // Charred hollow in center of stump top
      const stumpHollow = new THREE.Mesh(new THREE.CylinderGeometry(stR * 0.3, stR * 0.2, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 1.0 }));
      stumpHollow.position.y = stH + 0.02;
      stumpGrp.add(stumpHollow);
      // Tiny embers on stump surface
      for (let se = 0; se < 2; se++) {
        const stEmber = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.0 }));
        stEmber.position.set((Math.random() - 0.5) * stR, stH + 0.03, (Math.random() - 0.5) * stR);
        stumpGrp.add(stEmber);
      }
      const tsX = (Math.random() - 0.5) * w * 0.8;
      const tsZ = (Math.random() - 0.5) * d * 0.8;
      stumpGrp.position.set(tsX, getTerrainHeight(tsX, tsZ, 1.6), tsZ);
      mctx.envGroup.add(stumpGrp);
    }

    // Lava pools (circular, bubbling) (7) with cooling formations
    const lavaPoolMat = new THREE.MeshStandardMaterial({
      color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const lavaRimMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const poolGrp = new THREE.Group();
      const poolR = 1.5 + Math.random() * 2;
      // Rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(poolR, 0.3, 44, 62), lavaRimMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.1;
      poolGrp.add(rim);
      // Lava surface
      const pool = new THREE.Mesh(new THREE.CircleGeometry(poolR - 0.1, 62), lavaPoolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.08;
      poolGrp.add(pool);
      // Bubbles
      for (let b = 0; b < 4; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xff7700, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 }));
        const bAngle = Math.random() * Math.PI * 2;
        const bR = Math.random() * (poolR - 0.5);
        bubble.position.set(Math.cos(bAngle) * bR, 0.15, Math.sin(bAngle) * bR);
        poolGrp.add(bubble);
      }
      // Pool light
      const poolLight = new THREE.PointLight(0xff4400, 3, 12);
      poolLight.position.y = 1;
      poolGrp.add(poolLight);
      mctx.torchLights.push(poolLight);
      // Heat shimmer particles above lava pool
      for (let hs = 0; hs < 3; hs++) {
        const poolShimmer = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 36, 36),
          new THREE.MeshStandardMaterial({ color: 0xff9944, emissive: 0xff6622, emissiveIntensity: 0.7, transparent: true, opacity: 0.12 }));
        const shimAngle = Math.random() * Math.PI * 2;
        const shimR = Math.random() * (poolR - 0.3);
        poolShimmer.position.set(Math.cos(shimAngle) * shimR, 0.3 + Math.random() * 0.6, Math.sin(shimAngle) * shimR);
        poolGrp.add(poolShimmer);
      }
      // Ground crack lines radiating from pool edge
      for (let pc = 0; pc < 2; pc++) {
        const poolCrack = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, poolR * 0.8 + Math.random() * 1.0, 36),
          new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.4, transparent: true, opacity: 0.35 }));
        poolCrack.rotation.z = Math.PI / 2;
        const pcAngle = Math.random() * Math.PI * 2;
        poolCrack.position.set(Math.cos(pcAngle) * (poolR + 0.3), 0.02, Math.sin(pcAngle) * (poolR + 0.3));
        poolCrack.rotation.y = pcAngle;
        poolGrp.add(poolCrack);
      }
      const plX = (Math.random() - 0.5) * w * 0.65;
      const plZ = (Math.random() - 0.5) * d * 0.65;
      poolGrp.position.set(plX, getTerrainHeight(plX, plZ, 1.6), plZ);
      mctx.envGroup.add(poolGrp);
    }

    // Volcanic caldera (center-ish) - large terrain feature
    const calderaGrp = new THREE.Group();
    const calderaR = 6;
    const calderaRim = new THREE.Mesh(new THREE.TorusGeometry(calderaR, 1.5, 44, 62), rockMat);
    calderaRim.rotation.x = -Math.PI / 2;
    calderaRim.position.y = 0.5;
    calderaGrp.add(calderaRim);
    // Inner lava
    const calderaLava = new THREE.Mesh(new THREE.CircleGeometry(calderaR - 1, 62), lavaPoolMat);
    calderaLava.rotation.x = -Math.PI / 2;
    calderaLava.position.y = -0.2;
    calderaGrp.add(calderaLava);
    const calderaLight = new THREE.PointLight(0xff4400, 5, 25);
    calderaLight.position.y = 2;
    calderaGrp.add(calderaLight);
    mctx.torchLights.push(calderaLight);
    calderaGrp.position.set(w * 0.15, getTerrainHeight(w * 0.15, -d * 0.15, 1.6), -d * 0.15);
    mctx.envGroup.add(calderaGrp);

    // Obsidian shards (sharp crystals) (30)
    const obsidianShardMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.1, metalness: 0.7 });
    for (let i = 0; i < 30; i++) {
      const shardH = 0.5 + Math.random() * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.12, shardH, 44), obsidianShardMat);
      shard.position.set(
        (Math.random() - 0.5) * w * 0.85,
        shardH / 2,
        (Math.random() - 0.5) * d * 0.85
      );
      shard.rotation.z = (Math.random() - 0.5) * 0.4;
      shard.rotation.x = (Math.random() - 0.5) * 0.4;
      shard.castShadow = true;
      mctx.envGroup.add(shard);
      // Obsidian fragment chips scattered at base
      for (let oc = 0; oc < 2; oc++) {
        const chip = new THREE.Mesh(new THREE.OctahedronGeometry(0.04 + Math.random() * 0.05, 2),
          obsidianShardMat);
        chip.position.set(
          shard.position.x + (Math.random() - 0.5) * 0.4,
          0.03,
          shard.position.z + (Math.random() - 0.5) * 0.4
        );
        chip.rotation.set(Math.random(), Math.random(), Math.random());
        mctx.envGroup.add(chip);
      }
    }

    // Ash drifts (ground cover patches) (15)
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1.0, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 15; i++) {
      const ash = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2, 62), ashMat);
      ash.rotation.x = -Math.PI / 2;
      ash.position.set(
        (Math.random() - 0.5) * w * 0.9,
        0.03,
        (Math.random() - 0.5) * d * 0.9
      );
      mctx.envGroup.add(ash);
    }

    // Fallen demonic statues (4)
    const demonStoneMat = new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const statGrp = new THREE.Group();
      // Torso (fallen on side)
      const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.5), demonStoneMat);
      sTorso.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      sTorso.position.y = 0.3;
      statGrp.add(sTorso);
      // Head
      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), demonStoneMat);
      sHead.position.set(0.8, 0.2, 0);
      statGrp.add(sHead);
      // Horns
      for (const hx of [-0.15, 0.15]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 44), demonStoneMat);
        horn.position.set(0.8 + hx, 0.5, 0);
        horn.rotation.z = hx < 0 ? 0.3 : -0.3;
        statGrp.add(horn);
      }
      statGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0,
        (Math.random() - 0.5) * d * 0.7
      );
      statGrp.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(statGrp);
    }

    // Fire geysers (8) - tall erupting columns
    for (let i = 0; i < 8; i++) {
      const geyserGrp = new THREE.Group();
      const geyserBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.3, 44),
        new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
      geyserBase.position.y = 0.15;
      geyserGrp.add(geyserBase);
      // Fire column
      const fireMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 2.0,
        transparent: true, opacity: 0.5,
      });
      const fireH = 2 + Math.random() * 3;
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, fireH, 44), fireMat);
      fire.position.y = fireH / 2 + 0.3;
      geyserGrp.add(fire);
      const gLight = new THREE.PointLight(0xff4400, 3, 15);
      gLight.position.y = fireH / 2;
      geyserGrp.add(gLight);
      mctx.torchLights.push(gLight);
      // Rising ember particles from geyser
      for (let em = 0; em < 3; em++) {
        const gEmber = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 36, 36),
          new THREE.MeshStandardMaterial({ color: 0xff8822, emissive: 0xff4400, emissiveIntensity: 1.8, transparent: true, opacity: 0.6 }));
        gEmber.position.set((Math.random() - 0.5) * 0.5, fireH * 0.3 + Math.random() * fireH * 0.6, (Math.random() - 0.5) * 0.5);
        geyserGrp.add(gEmber);
      }
      geyserGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(geyserGrp);
    }

    // Scorched earth patches (15)
    for (let i = 0; i < 15; i++) {
      const scorchR = 1 + Math.random() * 2;
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(scorchR, 62),
        new THREE.MeshStandardMaterial({ color: 0x0a0500, roughness: 1.0, transparent: true, opacity: 0.7 }));
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.set((Math.random() - 0.5) * w * 0.85, 0.02, (Math.random() - 0.5) * d * 0.85);
      mctx.envGroup.add(scorch);
    }

    // Magma rock formations (10) - stacked boulders
    for (let i = 0; i < 10; i++) {
      const formGrp = new THREE.Group();
      const numRocks = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < numRocks; r++) {
        const rSize = 0.5 + Math.random() * 0.8;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 3),
          new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
        rock.position.set((Math.random() - 0.5) * 1.5, r * 0.8, (Math.random() - 0.5) * 1.5);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        formGrp.add(rock);
      }
      // Glowing cracks between rocks
      const crackGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      crackGlow.position.y = 0.5;
      crackGlow.rotation.y = Math.random() * Math.PI;
      formGrp.add(crackGlow);
      formGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      mctx.envGroup.add(formGrp);
    }

    // Demon summoning circles (5) with more detail
    for (let i = 0; i < 5; i++) {
      const circGrp = new THREE.Group();
      const circMat = new THREE.MeshStandardMaterial({
        color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      });
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 16), circMat);
      outerRing.rotation.x = -Math.PI / 2;
      circGrp.add(outerRing);
      const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 10), circMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.rotation.z = Math.PI / 5;
      innerRing.position.y = 0.01;
      circGrp.add(innerRing);
      // Rune symbols at cardinal points
      for (let r = 0; r < 8; r++) {
        const runeAng = (r / 8) * Math.PI * 2;
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0 }));
        rune.position.set(Math.cos(runeAng) * 2.1, 0.04, Math.sin(runeAng) * 2.1);
        rune.rotation.x = -Math.PI / 2;
        circGrp.add(rune);
      }
      // Glow light
      const circLight = new THREE.PointLight(0xff2200, 0.5, 5);
      circLight.position.y = 0.5;
      circGrp.add(circLight);
      circGrp.position.set((Math.random() - 0.5) * w * 0.6, 0.03, (Math.random() - 0.5) * d * 0.6);
      mctx.envGroup.add(circGrp);
    }

    // Cooling lava formations (8) - dark rock with glowing cracks
    for (let i = 0; i < 8; i++) {
      const coolGrp = new THREE.Group();
      const coolR = 0.5 + Math.random() * 1.0;
      const coolRock = new THREE.Mesh(new THREE.DodecahedronGeometry(coolR, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.95 }));
      coolRock.scale.y = 0.3;
      coolGrp.add(coolRock);
      // Glowing cracks on surface
      for (let c = 0; c < 4; c++) {
        const crackGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.05, coolR * 0.8),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        crackGlow.rotation.x = -Math.PI / 2;
        crackGlow.rotation.z = (c / 4) * Math.PI + Math.random() * 0.3;
        crackGlow.position.y = coolR * 0.15;
        coolGrp.add(crackGlow);
      }
      const clX = (Math.random() - 0.5) * w * 0.8;
      const clZ = (Math.random() - 0.5) * d * 0.8;
      coolGrp.position.set(clX, getTerrainHeight(clX, clZ, 1.6), clZ);
      mctx.envGroup.add(coolGrp);
    }

    // Charred skeleton remains (6)
    const charBoneMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const skelGrp = new THREE.Group();
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), charBoneMat);
      skull.position.y = 0.08;
      skelGrp.add(skull);
      for (let b = 0; b < 5; b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.25 + Math.random() * 0.15, 44), charBoneMat);
        bone.position.set((Math.random() - 0.5) * 0.4, 0.03, (Math.random() - 0.5) * 0.4);
        bone.rotation.z = Math.random() * Math.PI;
        bone.rotation.y = Math.random() * Math.PI;
        skelGrp.add(bone);
      }
      const csX = (Math.random() - 0.5) * w * 0.8;
      const csZ = (Math.random() - 0.5) * d * 0.8;
      skelGrp.position.set(csX, getTerrainHeight(csX, csZ, 1.6), csZ);
      mctx.envGroup.add(skelGrp);
    }

    // Heat haze ambient planes (6)
    for (let i = 0; i < 6; i++) {
      const hazeGeo = new THREE.PlaneGeometry(4 + Math.random() * 4, 5 + Math.random() * 3);
      const hazeMat = new THREE.MeshStandardMaterial({
        color: 0xff8844, transparent: true, opacity: 0.02,
        roughness: 0.5, side: THREE.DoubleSide,
      });
      const haze = new THREE.Mesh(hazeGeo, hazeMat);
      haze.position.set((Math.random() - 0.5) * w * 0.6, 2 + Math.random() * 2, (Math.random() - 0.5) * d * 0.6);
      haze.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(haze);
    }

    // ── Volcanic bomb rocks (8) ──
    for (let i = 0; i < 8; i++) {
      const bombGrp = new THREE.Group();
      const bombR = 0.6 + Math.random() * 0.8;
      const bombRock = new THREE.Mesh(new THREE.DodecahedronGeometry(bombR, 2), rockMat);
      bombRock.position.y = -bombR * 0.3; bombGrp.add(bombRock);
      // Impact crater circle
      const crater = new THREE.Mesh(new THREE.RingGeometry(bombR * 0.8, bombR * 1.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0, side: THREE.DoubleSide }));
      crater.rotation.x = -Math.PI / 2; crater.position.y = 0.01; bombGrp.add(crater);
      const vbx = (Math.random() - 0.5) * w * 0.8; const vbz = (Math.random() - 0.5) * d * 0.8;
      bombGrp.position.set(vbx, getTerrainHeight(vbx, vbz, 1.6), vbz);
      mctx.envGroup.add(bombGrp);
    }

    // ── Lava tubes (3) ──
    for (let i = 0; i < 3; i++) {
      const tube = new THREE.Group();
      const tubeLen = 6 + Math.random() * 8;
      // Outer cylinder shell
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, tubeLen, 12, 1, true), rockMat);
      outer.rotation.z = Math.PI / 2; tube.add(outer);
      // Orange emissive interior
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, tubeLen + 0.2, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.3, side: THREE.BackSide }));
      inner.rotation.z = Math.PI / 2; tube.add(inner);
      // Open end glow
      const endGlow = new THREE.PointLight(0xff4400, 1.0, 10);
      endGlow.position.set(tubeLen / 2, 0, 0); tube.add(endGlow); mctx.torchLights.push(endGlow);
      const ltx = (Math.random() - 0.5) * w * 0.6; const ltz = (Math.random() - 0.5) * d * 0.6;
      tube.position.set(ltx, getTerrainHeight(ltx, ltz, 1.6) + 0.5, ltz);
      tube.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(tube);
    }

    // ── Petrified victims (5) ──
    const petrifiedMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.95 });
    for (let i = 0; i < 5; i++) {
      const victim = new THREE.Group();
      // Box torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.2), petrifiedMat);
      torso.position.y = 0.9; victim.add(torso);
      // Sphere head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), petrifiedMat);
      head.position.y = 1.3; victim.add(head);
      // Cylinder arms in shielding pose
      for (const ax of [-0.22, 0.22]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 6), petrifiedMat);
        arm.position.set(ax, 1.05, 0.1);
        arm.rotation.z = ax > 0 ? -0.8 : 0.8; arm.rotation.x = -0.4;
        victim.add(arm);
      }
      // Cylinder legs in running pose
      for (const [lx, rot] of [[-0.08, 0.3], [0.08, -0.3]] as [number, number][]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), petrifiedMat);
        leg.position.set(lx, 0.35, 0); leg.rotation.x = rot; victim.add(leg);
      }
      const pvx = (Math.random() - 0.5) * w * 0.7; const pvz = (Math.random() - 0.5) * d * 0.7;
      victim.position.set(pvx, getTerrainHeight(pvx, pvz, 1.6), pvz);
      victim.rotation.y = Math.random() * Math.PI * 2;
      mctx.envGroup.add(victim);
    }

    // ── Sulfur crystal clusters (10) ──
    const sulfurMat = new THREE.MeshStandardMaterial({ color: 0xaacc33, emissive: 0x667711, emissiveIntensity: 0.3, roughness: 0.4 });
    for (let i = 0; i < 10; i++) {
      const cluster = new THREE.Group();
      const coneCount = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < coneCount; c++) {
        const cH = 0.2 + Math.random() * 0.4;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04 + Math.random() * 0.03, cH, 6), sulfurMat);
        cone.position.set((Math.random() - 0.5) * 0.2, cH / 2, (Math.random() - 0.5) * 0.2);
        cone.rotation.x = (Math.random() - 0.5) * 0.3; cone.rotation.z = (Math.random() - 0.5) * 0.3;
        cluster.add(cone);
      }
      const sLight = new THREE.PointLight(0xaacc33, 0.2, 3);
      sLight.position.y = 0.3; cluster.add(sLight); mctx.torchLights.push(sLight);
      const scx = (Math.random() - 0.5) * w * 0.8; const scz = (Math.random() - 0.5) * d * 0.8;
      cluster.position.set(scx, getTerrainHeight(scx, scz, 1.6), scz);
      mctx.envGroup.add(cluster);
    }

    // ── Volcanic rock formations / basalt columns (6) ──
    for (let i = 0; i < 6; i++) {
      const formation = new THREE.Group();
      const colCount = 4 + Math.floor(Math.random() * 5);
      for (let c = 0; c < colCount; c++) {
        const colH = 1.5 + Math.random() * 3;
        const colR = 0.2 + Math.random() * 0.15;
        const column = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR, colH, 6), rockMat);
        column.position.set((Math.random() - 0.5) * 1.2, colH / 2, (Math.random() - 0.5) * 1.2);
        formation.add(column);
      }
      const bfx = (Math.random() - 0.5) * w * 0.75; const bfz = (Math.random() - 0.5) * d * 0.75;
      formation.position.set(bfx, getTerrainHeight(bfx, bfz, 1.6), bfz);
      mctx.envGroup.add(formation);
    }

    // ── Heat shimmer markers (4) ──
    for (let i = 0; i < 4; i++) {
      const shimmerH = 4 + Math.random() * 3;
      const shimmerW = 2 + Math.random() * 2;
      const shimmerGeo = new THREE.PlaneGeometry(shimmerW, shimmerH);
      // Wavy distortion - displace vertices
      const posAttr = shimmerGeo.attributes.position;
      for (let v = 0; v < posAttr.count; v++) {
        const y = posAttr.getY(v);
        posAttr.setX(v, posAttr.getX(v) + Math.sin(y * 3) * 0.15);
      }
      posAttr.needsUpdate = true;
      const shimmer = new THREE.Mesh(shimmerGeo,
        new THREE.MeshStandardMaterial({ color: 0xff8844, transparent: true, opacity: 0.03, roughness: 0.5, side: THREE.DoubleSide }));
      const smx = (Math.random() - 0.5) * w * 0.6; const smz = (Math.random() - 0.5) * d * 0.6;
      shimmer.position.set(smx, getTerrainHeight(smx, smz, 1.6) + shimmerH / 2, smz);
      shimmer.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(shimmer);
    }
}

export function buildAbyssalRift(mctx: MapBuildContext, w: number, d: number): void {
    mctx.scene.fog = new THREE.FogExp2(0x0a0020, 0.03);
    mctx.applyTerrainColors(0x080616, 0x120e26, 0.5);
    mctx.dirLight.color.setHex(0x6644aa);
    mctx.dirLight.intensity = 0.6;
    mctx.ambientLight.color.setHex(0x110033);
    mctx.ambientLight.intensity = 0.4;
    mctx.hemiLight.color.setHex(0x4422aa);
    mctx.hemiLight.groundColor.setHex(0x000011);

    // Floating stone islands (30) with more crystals and chains
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
    for (let i = 0; i < 30; i++) {
      const islandGroup = new THREE.Group();
      const iSize = 1 + Math.random() * 3;
      const island = new THREE.Mesh(new THREE.DodecahedronGeometry(iSize, 4), stoneMat);
      island.scale.y = 0.4;
      island.castShadow = true;
      islandGroup.add(island);
      // Crystals on top of some islands
      if (Math.random() < 0.4) {
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x4422aa, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.8,
        });
        const cH = 0.5 + Math.random() * 1.0;
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.15, cH, 44), crystalMat);
        crystal.position.y = iSize * 0.3;
        islandGroup.add(crystal);
      }
      islandGroup.position.set(
        (Math.random() - 0.5) * w * 0.9,
        -1 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.9
      );
      mctx.envGroup.add(islandGroup);
    }

    // Floating platform chains (10) - connecting islands
    const fChainMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      const fChainGrp = new THREE.Group();
      const chainSegs = 6 + Math.floor(Math.random() * 6);
      for (let c = 0; c < chainSegs; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 44, 62), fChainMat);
        link.position.set(0, 0, c * 0.15);
        link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2;
        fChainGrp.add(link);
      }
      fChainGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        -0.5 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7
      );
      fChainGrp.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.envGroup.add(fChainGrp);
    }

    // Crystalline fragments (15) - small glowing shards scattered
    const fragColors = [0x8844ff, 0x6622cc, 0xaa66ff, 0x4422aa];
    for (let i = 0; i < 15; i++) {
      const fragGrp = new THREE.Group();
      const numFrags = 3 + Math.floor(Math.random() * 4);
      for (let f = 0; f < numFrags; f++) {
        const fragColor = fragColors[Math.floor(Math.random() * fragColors.length)];
        const frag = new THREE.Mesh(new THREE.OctahedronGeometry(0.05 + Math.random() * 0.08, 3),
          new THREE.MeshStandardMaterial({ color: fragColor, emissive: fragColor, emissiveIntensity: 0.5, transparent: true, opacity: 0.7, roughness: 0.1 }));
        frag.position.set((Math.random() - 0.5) * 0.5, Math.random() * 0.3, (Math.random() - 0.5) * 0.5);
        frag.rotation.set(Math.random(), Math.random(), Math.random());
        fragGrp.add(frag);
      }
      fragGrp.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.05,
        (Math.random() - 0.5) * d * 0.85
      );
      mctx.envGroup.add(fragGrp);
    }

    // Pulsing energy veins on ground (12) - branching patterns
    const veinMat = new THREE.MeshStandardMaterial({
      color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 12; i++) {
      const veinGrp = new THREE.Group();
      const mainLen = 3 + Math.random() * 5;
      const mainVein = new THREE.Mesh(new THREE.PlaneGeometry(0.08, mainLen), veinMat);
      mainVein.rotation.x = -Math.PI / 2;
      veinGrp.add(mainVein);
      // Branch veins
      for (let b = 0; b < 3; b++) {
        const branchLen = 1 + Math.random() * 2;
        const branch = new THREE.Mesh(new THREE.PlaneGeometry(0.05, branchLen), veinMat);
        branch.rotation.x = -Math.PI / 2;
        branch.rotation.z = (Math.random() - 0.5) * 1.0;
        branch.position.set((Math.random() - 0.5) * mainLen * 0.3, 0.01, (Math.random() - 0.5) * mainLen * 0.3);
        veinGrp.add(branch);
      }
      const vX = (Math.random() - 0.5) * w * 0.8;
      const vZ = (Math.random() - 0.5) * d * 0.8;
      veinGrp.position.set(vX, getTerrainHeight(vX, vZ, 0.5) + 0.02, vZ);
      veinGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(veinGrp);
    }

    // Dark matter formations (8) - amorphous dark objects
    for (let i = 0; i < 8; i++) {
      const darkGrp = new THREE.Group();
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.3, metalness: 0.8, emissive: 0x110022, emissiveIntensity: 0.2 });
      const numBlobs = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < numBlobs; b++) {
        const blobR = 0.3 + Math.random() * 0.5;
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(blobR, 4), darkMat);
        blob.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        blob.position.set((Math.random() - 0.5) * 1, b * 0.5, (Math.random() - 0.5) * 1);
        darkGrp.add(blob);
      }
      darkGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(darkGrp);
    }

    // Floating debris (15) - small rock chunks orbiting
    for (let i = 0; i < 15; i++) {
      const debrisGrp = new THREE.Group();
      const numChunks = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < numChunks; c++) {
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15, 3),
          new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 }));
        const cAng = (c / numChunks) * Math.PI * 2;
        const cR = 0.3 + Math.random() * 0.4;
        chunk.position.set(Math.cos(cAng) * cR, (Math.random() - 0.5) * 0.3, Math.sin(cAng) * cR);
        chunk.rotation.set(Math.random(), Math.random(), Math.random());
        debrisGrp.add(chunk);
      }
      debrisGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        1 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(debrisGrp);
    }

    // Floating debris/rock fragments (20) - small boxes/spheres at various heights
    for (let i = 0; i < 20; i++) {
      const fragType = Math.random();
      let fragMesh: THREE.Mesh;
      if (fragType < 0.5) {
        fragMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08 + Math.random() * 0.12, 0.06 + Math.random() * 0.1, 0.08 + Math.random() * 0.1),
          new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 }));
      } else {
        fragMesh = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.08, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.7 }));
      }
      fragMesh.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.5 + Math.random() * 6,
        (Math.random() - 0.5) * d * 0.85
      );
      fragMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mctx.envGroup.add(fragMesh);
    }

    // Void cracks in the ground (glowing purple fissures) (18)
    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 18; i++) {
      const fissureW = 0.3 + Math.random() * 0.5;
      const fissureL = 5 + Math.random() * 15;
      const fissure = new THREE.Mesh(new THREE.PlaneGeometry(fissureW, fissureL), voidMat);
      fissure.rotation.x = -Math.PI / 2;
      const fiX = (Math.random() - 0.5) * w * 0.8;
      const fiZ = (Math.random() - 0.5) * d * 0.8;
      fissure.position.set(fiX, getTerrainHeight(fiX, fiZ, 0.5) + 0.03, fiZ);
      fissure.rotation.z = Math.random() * Math.PI;
      mctx.envGroup.add(fissure);
    }

    // Void lights
    for (let i = 0; i < 8; i++) {
      const voidLight = new THREE.PointLight(0x6622ff, 3, 20);
      voidLight.position.set(
        (Math.random() - 0.5) * w * 0.7,
        2,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.scene.add(voidLight);
      mctx.torchLights.push(voidLight);
    }

    // Twisted spires (15)
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7, metalness: 0.3 });
    for (let i = 0; i < 15; i++) {
      const spireGroup = new THREE.Group();
      const sH = 3 + Math.random() * 8;
      const sR = 0.2 + Math.random() * 0.4;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(sR, sH, 44), spireMat);
      spire.position.y = sH / 2;
      spire.rotation.z = (Math.random() - 0.5) * 0.3;
      spire.rotation.x = (Math.random() - 0.5) * 0.3;
      spire.castShadow = true;
      spireGroup.add(spire);
      const spX = (Math.random() - 0.5) * w * 0.85;
      const spZ = (Math.random() - 0.5) * d * 0.85;
      spireGroup.position.set(spX, getTerrainHeight(spX, spZ, 0.5), spZ);
      mctx.envGroup.add(spireGroup);
    }

    // Eldritch runes on ground (20 glowing circles)
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xaa44ff, emissive: 0x6622cc, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.4,
    });
    for (let i = 0; i < 20; i++) {
      const rune = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.6 + Math.random() * 0.3, 16),
        runeMat
      );
      rune.rotation.x = -Math.PI / 2;
      const rnX = (Math.random() - 0.5) * w * 0.8;
      const rnZ = (Math.random() - 0.5) * d * 0.8;
      rune.position.set(rnX, getTerrainHeight(rnX, rnZ, 0.5) + 0.02, rnZ);
      mctx.envGroup.add(rune);
    }

    // Shattered pillars (12) - fractured tops, visible core, cracks, fallen fragments, glowing runes
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const pillarMatCore = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.6 });
    const pillarCrackMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 1.0 });
    const pillarRuneGlowMat = new THREE.MeshStandardMaterial({
      color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 12; i++) {
      const pillarGroup = new THREE.Group();
      const pH = 2 + Math.random() * 4;
      const pilR = 0.3;
      const pilRBot = 0.4;

      // Main pillar body
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(pilR, pilRBot, pH, 44), pillarMat);
      pillar.position.y = pH / 2;
      pillar.castShadow = true;
      pillarGroup.add(pillar);

      // Fractured top with jagged edges (multiple cone/box pieces at angles)
      for (let jg = 0; jg < 4 + Math.floor(Math.random() * 3); jg++) {
        const jagAng = (jg / 6) * Math.PI * 2 + Math.random() * 0.5;
        const jagH = 0.15 + Math.random() * 0.25;
        const jagR = 0.05 + Math.random() * 0.1;
        const jag = new THREE.Mesh(new THREE.ConeGeometry(jagR, jagH, 6), pillarMat);
        jag.position.set(
          Math.cos(jagAng) * pilR * 0.5,
          pH + jagH * 0.3,
          Math.sin(jagAng) * pilR * 0.5
        );
        jag.rotation.set(
          (Math.random() - 0.5) * 0.6,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.8
        );
        pillarGroup.add(jag);
      }
      // Jagged box fragments at top
      for (let jb = 0; jb < 2 + Math.floor(Math.random() * 2); jb++) {
        const jagBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.12 + Math.random() * 0.15, 0.06),
          pillarMat
        );
        const jbAng = Math.random() * Math.PI * 2;
        jagBox.position.set(
          Math.cos(jbAng) * pilR * 0.4,
          pH + 0.05 + Math.random() * 0.1,
          Math.sin(jbAng) * pilR * 0.4
        );
        jagBox.rotation.set(Math.random() * 0.8, Math.random(), Math.random() * 0.5);
        pillarGroup.add(jagBox);
      }

      // Visible internal structure (different colored core)
      const core = new THREE.Mesh(new THREE.CylinderGeometry(pilR * 0.4, pilR * 0.4, 0.3, 12), pillarMatCore);
      core.position.y = pH + 0.05;
      pillarGroup.add(core);

      // Cracks running down the surface (thin dark lines)
      for (let cr = 0; cr < 3 + Math.floor(Math.random() * 3); cr++) {
        const crackAng = Math.random() * Math.PI * 2;
        const crackH = pH * (0.2 + Math.random() * 0.5);
        const crackY = pH * 0.3 + Math.random() * pH * 0.4;
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.02, crackH), pillarCrackMat);
        crack.position.set(
          Math.cos(crackAng) * (pilR + 0.01),
          crackY,
          Math.sin(crackAng) * (pilR + 0.01)
        );
        crack.rotation.y = -crackAng + Math.PI / 2;
        crack.rotation.z = (Math.random() - 0.5) * 0.15;
        pillarGroup.add(crack);
        // Branching crack
        if (Math.random() > 0.5) {
          const branchCrack = new THREE.Mesh(new THREE.PlaneGeometry(0.015, crackH * 0.3), pillarCrackMat);
          branchCrack.position.set(
            Math.cos(crackAng + 0.1) * (pilR + 0.01),
            crackY + crackH * 0.2,
            Math.sin(crackAng + 0.1) * (pilR + 0.01)
          );
          branchCrack.rotation.y = -crackAng + Math.PI / 2;
          branchCrack.rotation.z = 0.4;
          pillarGroup.add(branchCrack);
        }
      }

      // Fallen pillar fragments nearby (cylinder sections on their side)
      if (Math.random() > 0.4) {
        const fragLen = 0.5 + Math.random() * 1.0;
        const fragR = pilR * (0.6 + Math.random() * 0.3);
        const frag = new THREE.Mesh(new THREE.CylinderGeometry(fragR, fragR * 1.1, fragLen, 16), pillarMat);
        const fragAng = Math.random() * Math.PI * 2;
        const fragDist = 0.8 + Math.random() * 1.0;
        frag.position.set(
          Math.cos(fragAng) * fragDist,
          fragR * 0.8,
          Math.sin(fragAng) * fragDist
        );
        frag.rotation.z = Math.PI / 2;
        frag.rotation.y = fragAng;
        pillarGroup.add(frag);
        // Broken end of fragment
        const fragEnd = new THREE.Mesh(new THREE.CircleGeometry(fragR, 10), pillarMatCore);
        fragEnd.position.set(
          Math.cos(fragAng) * (fragDist + fragLen / 2),
          fragR * 0.8,
          Math.sin(fragAng) * (fragDist + fragLen / 2)
        );
        fragEnd.rotation.y = fragAng + Math.PI / 2;
        pillarGroup.add(fragEnd);
      }

      // Glowing rune inscriptions (emissive planes wrapping around)
      for (let rs = 0; rs < 3; rs++) {
        const runeStoneAng = (rs / 3) * Math.PI * 2 + Math.random() * 0.5;
        const runeStoneY = pH * 0.2 + rs * (pH * 0.25);
        // Rune plate backing
        const runePlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.6 }));
        runePlate.position.set(Math.cos(runeStoneAng) * 0.38, runeStoneY, Math.sin(runeStoneAng) * 0.38);
        runePlate.lookAt(new THREE.Vector3(0, runeStoneY, 0));
        pillarGroup.add(runePlate);
        // Glowing carved inset
        const carvedInset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 0.8 }));
        carvedInset.position.set(Math.cos(runeStoneAng) * 0.4, runeStoneY, Math.sin(runeStoneAng) * 0.4);
        carvedInset.lookAt(new THREE.Vector3(0, runeStoneY, 0));
        pillarGroup.add(carvedInset);
      }

      // Glowing rune bands wrapping around pillar
      for (let rb = 0; rb < 2; rb++) {
        const bandY = pH * 0.15 + rb * pH * 0.4;
        const band = new THREE.Mesh(new THREE.TorusGeometry(pilR + 0.02, 0.015, 6, 24), pillarRuneGlowMat);
        band.position.y = bandY;
        band.rotation.x = Math.PI / 2;
        pillarGroup.add(band);
      }

      // Base cracking with radiating fracture lines
      const baseCrackMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 1.0, side: THREE.DoubleSide });
      for (let fc = 0; fc < 5 + Math.floor(Math.random() * 3); fc++) {
        const fracAng = (fc / 7) * Math.PI * 2 + Math.random() * 0.3;
        const fracLen = 0.4 + Math.random() * 0.6;
        const fracLine = new THREE.Mesh(new THREE.PlaneGeometry(fracLen, 0.02), baseCrackMat);
        fracLine.position.set(
          Math.cos(fracAng) * fracLen * 0.5,
          0.01,
          Math.sin(fracAng) * fracLen * 0.5
        );
        fracLine.rotation.x = -Math.PI / 2;
        fracLine.rotation.z = -fracAng;
        pillarGroup.add(fracLine);
      }

      // Small debris around base
      for (let db = 0; db < 4 + Math.floor(Math.random() * 3); db++) {
        const dbSize = 0.04 + Math.random() * 0.08;
        const debris2 = new THREE.Mesh(new THREE.DodecahedronGeometry(dbSize, 1), pillarMat);
        const dbAng = Math.random() * Math.PI * 2;
        debris2.position.set(
          Math.cos(dbAng) * (0.5 + Math.random() * 0.5),
          dbSize * 0.4,
          Math.sin(dbAng) * (0.5 + Math.random() * 0.5)
        );
        debris2.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        pillarGroup.add(debris2);
      }

      const piX = (Math.random() - 0.5) * w * 0.8;
      const piZ = (Math.random() - 0.5) * d * 0.8;
      pillarGroup.position.set(piX, getTerrainHeight(piX, piZ, 0.5), piZ);
      pillarGroup.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(pillarGroup);
    }

    // Chains hanging from nothing (8)
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 8; i++) {
      const chainGroup = new THREE.Group();
      const links = 8 + Math.floor(Math.random() * 8);
      for (let c = 0; c < links; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 44, 62), chainMat);
        link.position.y = -c * 0.12;
        link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2;
        chainGroup.add(link);
      }
      chainGroup.position.set(
        (Math.random() - 0.5) * w * 0.7,
        6 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(chainGroup);
    }

    // Entropy orbs (floating glowing spheres) (15)
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xcc66ff, emissive: 0x8833cc, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.5,
    });
    for (let i = 0; i < 15; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 16, 12), orbMat);
      orb.position.set(
        (Math.random() - 0.5) * w * 0.8,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(orb);
    }

    // Dark fog patches (15)
    const darkFogMat = new THREE.MeshStandardMaterial({
      color: 0x110022, transparent: true, opacity: 0.2, roughness: 1.0,
    });
    for (let i = 0; i < 15; i++) {
      const fog = new THREE.Mesh(
        new THREE.PlaneGeometry(3 + Math.random() * 4, 3 + Math.random() * 4),
        darkFogMat
      );
      fog.rotation.x = -Math.PI / 2;
      fog.position.set(
        (Math.random() - 0.5) * w * 0.9,
        0.3 + Math.random() * 0.5,
        (Math.random() - 0.5) * d * 0.9
      );
      mctx.envGroup.add(fog);
    }

    // Void tentacles (12) - curved segmented cylinders reaching up
    const tentacleMat = new THREE.MeshStandardMaterial({
      color: 0x220044, roughness: 0.6, emissive: 0x110022, emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 12; i++) {
      const tentGrp = new THREE.Group();
      const segs = 8 + Math.floor(Math.random() * 6);
      const baseAngle = Math.random() * Math.PI * 2;
      let tx = 0, ty = 0, tz = 0;
      for (let s = 0; s < segs; s++) {
        const segR = 0.12 - (s / segs) * 0.08;
        const seg = new THREE.Mesh(new THREE.SphereGeometry(segR, 16, 12), tentacleMat);
        ty += 0.25;
        tx += Math.sin(baseAngle + s * 0.4) * 0.15;
        tz += Math.cos(baseAngle + s * 0.4) * 0.15;
        seg.position.set(tx, ty, tz);
        tentGrp.add(seg);
      }
      const tnX = (Math.random() - 0.5) * w * 0.8;
      const tnZ = (Math.random() - 0.5) * d * 0.8;
      tentGrp.position.set(tnX, getTerrainHeight(tnX, tnZ, 0.5), tnZ);
      mctx.envGroup.add(tentGrp);
    }

    // Void tendrils (10) - curved cylinder chains with dark purple material
    const tendrilMat = new THREE.MeshStandardMaterial({
      color: 0x1a0033, roughness: 0.5, emissive: 0x220044, emissiveIntensity: 0.4,
    });
    for (let i = 0; i < 10; i++) {
      const tendrilGrp = new THREE.Group();
      const tendrilSegs = 10 + Math.floor(Math.random() * 8);
      const tendrilBaseAng = Math.random() * Math.PI * 2;
      let tdx = 0, tdy = 0, tdz = 0;
      for (let s = 0; s < tendrilSegs; s++) {
        const segR = 0.06 - (s / tendrilSegs) * 0.04;
        const segLen = 0.2 + Math.random() * 0.1;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(segR, segR * 1.1, segLen, 8), tendrilMat);
        tdy += segLen * 0.7;
        tdx += Math.sin(tendrilBaseAng + s * 0.5) * 0.12;
        tdz += Math.cos(tendrilBaseAng + s * 0.5) * 0.12;
        seg.position.set(tdx, tdy, tdz);
        seg.rotation.set(Math.sin(s * 0.3) * 0.3, 0, Math.cos(s * 0.4) * 0.3);
        tendrilGrp.add(seg);
      }
      // Glowing tip
      const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5 }));
      tipGlow.position.set(tdx, tdy + 0.1, tdz);
      tendrilGrp.add(tipGlow);
      const tdX = (Math.random() - 0.5) * w * 0.75;
      const tdZ = (Math.random() - 0.5) * d * 0.75;
      tendrilGrp.position.set(tdX, getTerrainHeight(tdX, tdZ, 0.5), tdZ);
      mctx.envGroup.add(tendrilGrp);
    }

    // Rift edge crystal formations (14) - pointed cones with emissive glow
    for (let i = 0; i < 14; i++) {
      const riftCrystalGrp = new THREE.Group();
      const numCrystals = 2 + Math.floor(Math.random() * 4);
      for (let c = 0; c < numCrystals; c++) {
        const rcH = 0.4 + Math.random() * 1.2;
        const rcColor = [0x8844ff, 0x6622cc, 0xaa66ff, 0x9955dd][Math.floor(Math.random() * 4)];
        const rcCrystal = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.08, rcH, 6),
          new THREE.MeshStandardMaterial({ color: rcColor, emissive: rcColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.8, roughness: 0.1 }));
        rcCrystal.position.set((Math.random() - 0.5) * 0.4, rcH / 2, (Math.random() - 0.5) * 0.4);
        rcCrystal.rotation.z = (Math.random() - 0.5) * 0.5;
        rcCrystal.rotation.x = (Math.random() - 0.5) * 0.5;
        riftCrystalGrp.add(rcCrystal);
      }
      const rcX = (Math.random() - 0.5) * w * 0.85;
      const rcZ = (Math.random() - 0.5) * d * 0.85;
      riftCrystalGrp.position.set(rcX, getTerrainHeight(rcX, rcZ, 0.5), rcZ);
      mctx.envGroup.add(riftCrystalGrp);
    }

    // Unstable portals (6) with portal energy effects - torus rings with glowing center
    for (let i = 0; i < 6; i++) {
      const portalGrp = new THREE.Group();
      const portalR = 1.5 + Math.random() * 1;
      const portalTorus = new THREE.Mesh(
        new THREE.TorusGeometry(portalR, 0.15, 44, 62),
        new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 1.0, metalness: 0.3, roughness: 0.4 })
      );
      portalGrp.add(portalTorus);
      // Swirling center
      const portalCenter = new THREE.Mesh(
        new THREE.CircleGeometry(portalR - 0.2, 62),
        new THREE.MeshStandardMaterial({
          color: 0x3311aa, emissive: 0x2200cc, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        })
      );
      portalGrp.add(portalCenter);
      // Inner ring
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(portalR * 0.6, 0.06, 44, 62),
        new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 0.6 })
      );
      portalGrp.add(innerRing);
      // Portal rim detail - torus segments with energy effects
      for (let pr = 0; pr < 6; pr++) {
        const rimSegAng = (pr / 6) * Math.PI * 2;
        const rimSeg = new THREE.Mesh(
          new THREE.TorusGeometry(portalR * 1.05, 0.04, 8, 12, Math.PI * 0.25),
          new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.6 }));
        rimSeg.rotation.z = rimSegAng;
        portalGrp.add(rimSeg);
      }
      // Energy sparks orbiting portal rim
      for (let es = 0; es < 4; es++) {
        const sparkAng = (es / 4) * Math.PI * 2;
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xddaaff, emissive: 0xbb88ff, emissiveIntensity: 2.0 }));
        spark.position.set(Math.cos(sparkAng) * portalR, Math.sin(sparkAng) * portalR, 0.1);
        portalGrp.add(spark);
      }
      // Portal light
      const portalLight = new THREE.PointLight(0x6622ff, 4, 15);
      portalGrp.add(portalLight);
      mctx.torchLights.push(portalLight);
      portalGrp.position.set(
        (Math.random() - 0.5) * w * 0.6,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.6
      );
      portalGrp.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      mctx.envGroup.add(portalGrp);
    }

    // Corrupted altar (centerpiece)
    const altarGrp = new THREE.Group();
    const altarBaseMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.7 });
    // Platform steps
    for (let step = 0; step < 3; step++) {
      const stepSize = 3 - step * 0.8;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepSize, 0.25, stepSize), altarBaseMat);
      stepMesh.position.y = step * 0.25 + 0.125;
      stepMesh.castShadow = true;
      altarGrp.add(stepMesh);
    }
    // Central obelisk
    const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), altarBaseMat);
    obelisk.position.y = 2.25;
    obelisk.castShadow = true;
    altarGrp.add(obelisk);
    // Obelisk top - pyramid
    const obeliskTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.6, 44),
      new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 1.5 })
    );
    obeliskTop.position.y = 3.9;
    obeliskTop.rotation.y = Math.PI / 4;
    altarGrp.add(obeliskTop);
    // Rune circles around altar
    for (let r = 0; r < 3; r++) {
      const runeRing = new THREE.Mesh(
        new THREE.RingGeometry(1.8 + r * 0.8, 2 + r * 0.8, 20),
        new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x6622cc, emissiveIntensity: 0.6, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      runeRing.rotation.x = -Math.PI / 2;
      runeRing.position.y = 0.05;
      altarGrp.add(runeRing);
    }
    // Altar light
    const altarLight = new THREE.PointLight(0x8844ff, 5, 20);
    altarLight.position.y = 4.5;
    altarGrp.add(altarLight);
    mctx.torchLights.push(altarLight);
    altarGrp.position.set(0, 0, 0);
    mctx.envGroup.add(altarGrp);

    // Soul wisps (30) - small ghostly floating lights
    const wispMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, emissive: 0x88bbff, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.3,
    });
    for (let i = 0; i < 30; i++) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 6), wispMat);
      wisp.position.set(
        (Math.random() - 0.5) * w * 0.85,
        1 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.85
      );
      mctx.envGroup.add(wisp);
      // Wisp trail
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.005, 0.3, 44),
        new THREE.MeshStandardMaterial({ color: 0x8899ff, emissive: 0x6677cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.2 })
      );
      trail.position.copy(wisp.position);
      trail.position.y -= 0.2;
      mctx.envGroup.add(trail);
    }

    // Dimensional tears (6) - vertical glowing cracks in space
    for (let i = 0; i < 6; i++) {
      const tearGrp = new THREE.Group();
      const tearH = 3 + Math.random() * 4;
      // Main tear - thin glowing strip
      const tear = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, tearH),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: 0xccaaff, emissiveIntensity: 2.0,
          transparent: true, opacity: 0.7, side: THREE.DoubleSide,
        })
      );
      tear.position.y = tearH / 2 + 1;
      tearGrp.add(tear);
      // Glow aura around tear
      const aura = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, tearH + 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x6622ff, emissive: 0x4411aa, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.15, side: THREE.DoubleSide,
        })
      );
      aura.position.y = tearH / 2 + 1;
      tearGrp.add(aura);
      // Tear light
      const tearLight = new THREE.PointLight(0xaa88ff, 2, 10);
      tearLight.position.y = tearH / 2 + 1;
      tearGrp.add(tearLight);
      mctx.torchLights.push(tearLight);
      tearGrp.position.set(
        (Math.random() - 0.5) * w * 0.75,
        0,
        (Math.random() - 0.5) * d * 0.75
      );
      tearGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(tearGrp);
    }

    // Corrupted growth / void coral (18)
    const coralMat = new THREE.MeshStandardMaterial({ color: 0x2a1144, roughness: 0.6, emissive: 0x110033, emissiveIntensity: 0.2 });
    for (let i = 0; i < 18; i++) {
      const coralGrp = new THREE.Group();
      const branches = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < branches; b++) {
        const bH = 0.5 + Math.random() * 1.5;
        const branch = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.08, bH, 44), coralMat);
        branch.position.set((Math.random() - 0.5) * 0.3, bH / 2, (Math.random() - 0.5) * 0.3);
        branch.rotation.z = (Math.random() - 0.5) * 0.6;
        branch.rotation.x = (Math.random() - 0.5) * 0.6;
        coralGrp.add(branch);
      }
      coralGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
      mctx.envGroup.add(coralGrp);
    }

    // Gravity-defying rock arches (4)
    for (let i = 0; i < 4; i++) {
      const archGrp = new THREE.Group();
      const archMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
      for (const side of [-1, 1]) {
        const archPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 5, 44), archMat);
        archPillar.position.set(side * 2, 2.5, 0);
        archPillar.castShadow = true;
        archGrp.add(archPillar);
      }
      const archTop = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 44, 62, Math.PI), archMat);
      archTop.position.y = 5;
      archTop.rotation.z = Math.PI;
      archGrp.add(archTop);
      // Void energy under arch
      const voidEnergy = new THREE.Mesh(new THREE.PlaneGeometry(3, 4),
        new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
      voidEnergy.position.y = 3;
      archGrp.add(voidEnergy);
      archGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      archGrp.rotation.y = Math.random() * Math.PI;
      mctx.envGroup.add(archGrp);
    }

    // Abyssal eye formations (5) - watching from the void
    for (let i = 0; i < 5; i++) {
      const eyeGrp = new THREE.Group();
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x331155, emissive: 0x220044, emissiveIntensity: 0.5, roughness: 0.3 }));
      eyeGrp.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xcc00cc, emissiveIntensity: 2.0 }));
      pupil.position.z = 0.22;
      eyeGrp.add(pupil);
      eyeGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        3 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.7
      );
      eyeGrp.lookAt(0, 0, 0);
      mctx.envGroup.add(eyeGrp);
    }

    // Fractured ground platforms (8)
    for (let i = 0; i < 8; i++) {
      const platSize = 2 + Math.random() * 3;
      const plat = new THREE.Mesh(new THREE.DodecahedronGeometry(platSize, 3),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }));
      plat.scale.y = 0.15;
      plat.position.set(
        (Math.random() - 0.5) * w * 0.85,
        -0.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * d * 0.85
      );
      plat.rotation.y = Math.random() * Math.PI;
      plat.receiveShadow = true;
      mctx.envGroup.add(plat);
    }

    // Void lightning bolts (frozen) (6)
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 6; i++) {
      const boltGrp = new THREE.Group();
      let bx = 0, by = 0;
      for (let s = 0; s < 8; s++) {
        const segLen = 0.5 + Math.random() * 0.8;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, segLen, 44), boltMat);
        bx += (Math.random() - 0.5) * 0.6;
        by += segLen * 0.8;
        seg.position.set(bx, by, 0);
        seg.rotation.z = (Math.random() - 0.5) * 0.8;
        boltGrp.add(seg);
      }
      boltGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1,
        (Math.random() - 0.5) * d * 0.7
      );
      mctx.envGroup.add(boltGrp);
    }
}

