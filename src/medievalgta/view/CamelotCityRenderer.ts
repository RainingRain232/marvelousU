// ---------------------------------------------------------------------------
// CamelotCityRenderer — renders the entire medieval world: ground, walls,
// buildings, environment, day/night, and particles.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GTAConfig } from "../config/MedievalGTAConfig";
import type { MedievalGTAState, GTABuilding, GTAParticle } from "../state/MedievalGTAState";

const WW = GTAConfig.WORLD_WIDTH;
const WH = GTAConfig.WORLD_HEIGHT;
const CX = GTAConfig.CITY_X;
const CY = GTAConfig.CITY_Y;
const CW = GTAConfig.CITY_W;
const CH = GTAConfig.CITY_H;
const WT = GTAConfig.WALL_THICKNESS;
// Camera zoom is handled by the parent GTA world container

// seeded pseudo-random for deterministic decoration placement
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = ((seed ^ (seed >>> 15)) * (1 | seed)) | 0;
    t = (t + ((t ^ (t >>> 7)) * (61 | t)) | 0) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CamelotCityRenderer {
  readonly container = new Container();

  // Layers
  private groundLayer = new Container();
  private roadLayer = new Container();
  private buildingLayer = new Container();
  private wallLayer = new Container();
  private decorLayer = new Container();
  private outsideFeatureLayer = new Container();
  private envPropsLayer = new Container();
  private dayNightOverlay = new Graphics();
  private windowLightsLayer = new Graphics();
  private chimneySmoke = new Graphics();
  private particleGfx = new Graphics();

  init(): void {
    this.container.removeChildren();

    this.groundLayer.removeChildren();
    this.roadLayer.removeChildren();
    this.buildingLayer.removeChildren();
    this.wallLayer.removeChildren();
    this.decorLayer.removeChildren();
    this.outsideFeatureLayer.removeChildren();
    this.envPropsLayer.removeChildren();

    this.drawGround();
    this.drawRoads();
    this.drawOutsideFeatures();
    this.drawEnvironmentProps();
    this.drawWalls();

    this.container.addChild(this.groundLayer);
    this.container.addChild(this.roadLayer);
    this.container.addChild(this.outsideFeatureLayer);
    this.container.addChild(this.envPropsLayer);
    this.container.addChild(this.buildingLayer);
    this.container.addChild(this.wallLayer);
    this.container.addChild(this.decorLayer);
    this.container.addChild(this.chimneySmoke);
    this.container.addChild(this.windowLightsLayer);
    this.container.addChild(this.dayNightOverlay);
    this.container.addChild(this.particleGfx);
  }

  // ===================== GROUND =====================
  private drawGround(): void {
    const g = new Graphics();

    // Base grass with richer color
    g.rect(0, 0, WW, WH).fill({ color: 0x3E7A33 });

    // Large grass variation patches for natural look
    const rng = mulberry32(42);
    for (let i = 0; i < 400; i++) {
      const px = rng() * WW;
      const py = rng() * WH;
      if (px > CX + WT && px < CX + CW - WT && py > CY + WT && py < CY + CH - WT) continue;
      const sw = 30 + rng() * 80;
      const sh = 20 + rng() * 60;
      const shades = [0x3d7a34, 0x57a048, 0x4a8c3f, 0x347030, 0x5a9a4a];
      const shade = shades[Math.floor(rng() * shades.length)];
      g.rect(px - sw / 2, py - sh / 2, sw, sh).fill({ color: shade, alpha: 0.35 });
    }

    // Grass tufts outside city (clusters of small strokes)
    for (let i = 0; i < 600; i++) {
      const px = rng() * WW;
      const py = rng() * WH;
      if (px > CX && px < CX + CW && py > CY && py < CY + CH) continue;
      const tufts = [0x2d6b24, 0x3a7a30, 0x468a3c];
      g.circle(px, py, 2 + rng() * 3).fill({ color: tufts[Math.floor(rng() * 3)], alpha: 0.5 });
      // Tiny grass blade
      if (rng() > 0.5) {
        g.moveTo(px, py).lineTo(px + (rng() - 0.5) * 4, py - 3 - rng() * 3).stroke({ color: 0x4a8c3f, width: 0.7, alpha: 0.4 });
      }
    }

    // Dirt patches near roads (outside city)
    const dirtPatches = [
      { x: 1950, y: 300, w: 80, h: 120 },
      { x: 1950, y: 2700, w: 80, h: 120 },
      { x: 500, y: 1400, w: 120, h: 80 },
      { x: 3500, y: 1400, w: 120, h: 80 },
    ];
    for (const dp of dirtPatches) {
      g.ellipse(dp.x, dp.y, dp.w / 2, dp.h / 2).fill({ color: 0x8B7355, alpha: 0.4 });
    }

    // Inside city: cobblestone base
    const cityInnerX = CX + WT;
    const cityInnerY = CY + WT;
    const cityInnerW = CW - WT * 2;
    const cityInnerH = CH - WT * 2;
    g.rect(cityInnerX, cityInnerY, cityInnerW, cityInnerH).fill({ color: 0x7a7a72 });

    // Cobblestone pattern — varied stone sizes for realism
    const stoneSize = 8;
    const gap = 1;
    for (let row = 0; row < Math.ceil(cityInnerH / (stoneSize + gap)); row++) {
      const offsetX = (row % 2) * (stoneSize / 2);
      for (let col = 0; col < Math.ceil(cityInnerW / (stoneSize + gap)) + 1; col++) {
        const sx = cityInnerX + col * (stoneSize + gap) + offsetX;
        const sy = cityInnerY + row * (stoneSize + gap);
        if (sx >= cityInnerX + cityInnerW || sy >= cityInnerY + cityInnerH) continue;
        const r = rng();
        const shade = r < 0.3 ? 0x757568 : r < 0.6 ? 0x858578 : r < 0.85 ? 0x909085 : 0x6a6a60;
        const sizeVar = stoneSize - Math.floor(rng() * 2);
        g.roundRect(sx, sy, sizeVar, sizeVar, 1).fill({ color: shade });
      }
    }

    // Mortar/grout lines between stones (subtle dark grid)
    for (let my = cityInnerY; my < cityInnerY + cityInnerH; my += stoneSize + gap) {
      g.moveTo(cityInnerX, my).lineTo(cityInnerX + cityInnerW, my).stroke({ color: 0x555550, width: 0.5, alpha: 0.15 });
    }

    // Market square: warm sandstone tiles
    const mktX = 1500, mktY = 1200, mktW = 600, mktH = 500;
    g.rect(mktX, mktY, mktW, mktH).fill({ color: 0xBBA898, alpha: 0.7 });
    // Decorative border around market
    g.rect(mktX, mktY, mktW, 3).fill({ color: 0x887766 });
    g.rect(mktX, mktY + mktH - 3, mktW, 3).fill({ color: 0x887766 });
    g.rect(mktX, mktY, 3, mktH).fill({ color: 0x887766 });
    g.rect(mktX + mktW - 3, mktY, 3, mktH).fill({ color: 0x887766 });
    // Finer market tiles with variation
    for (let row = 0; row < Math.ceil(mktH / 10); row++) {
      for (let col = 0; col < Math.ceil(mktW / 10); col++) {
        const r = rng();
        const shade = r < 0.4 ? 0xAA9888 : r < 0.7 ? 0xBBA898 : 0x998878;
        g.roundRect(mktX + col * 10 + 1, mktY + row * 10 + 1, 8, 8, 0.5).fill({ color: shade });
      }
    }

    // Worn paths in the city (darker stone where people walk most)
    // Path from north gate to market
    g.rect(1940, CY + WT, 20, 1200 - CY - WT).fill({ color: 0x706860, alpha: 0.3 });
    // Path from market to tavern
    g.rect(2100, 1380, 100, 20).fill({ color: 0x706860, alpha: 0.3 });
    // Path from castle to market
    g.rect(1088, 1050, 20, 200).fill({ color: 0x706860, alpha: 0.3 });

    // Puddles (small reflective spots on ground)
    const puddleSpots = [
      { x: 1600, y: 1100 }, { x: 2300, y: 1600 }, { x: 1100, y: 1300 },
      { x: 1900, y: 2000 }, { x: 2500, y: 1100 },
    ];
    for (const ps of puddleSpots) {
      g.ellipse(ps.x, ps.y, 8 + rng() * 6, 4 + rng() * 3).fill({ color: 0x6688AA, alpha: 0.15 });
    }

    this.groundLayer.addChild(g);
  }

  // ===================== ROADS =====================
  private drawRoads(): void {
    const g = new Graphics();
    const rng = mulberry32(777);
    const roadColor = 0x9a9080;
    const roadW = 40;

    // Main north-south road through center (inside city)
    g.rect(1950 - roadW / 2, CY, roadW, CH).fill({ color: roadColor });
    // Road edge stones
    g.rect(1950 - roadW / 2, CY, 3, CH).fill({ color: 0x7A7068, alpha: 0.6 });
    g.rect(1950 + roadW / 2 - 3, CY, 3, CH).fill({ color: 0x7A7068, alpha: 0.6 });

    // Main east-west road
    g.rect(CX, 1400 - roadW / 2, CW, roadW).fill({ color: roadColor });
    g.rect(CX, 1400 - roadW / 2, CW, 3).fill({ color: 0x7A7068, alpha: 0.6 });
    g.rect(CX, 1400 + roadW / 2 - 3, CW, 3).fill({ color: 0x7A7068, alpha: 0.6 });

    // Outside dirt roads with ruts
    const drawDirtRoad = (rx: number, ry: number, rw: number, rh: number) => {
      g.rect(rx, ry, rw, rh).fill({ color: 0x8B7355, alpha: 0.8 });
      // Wheel ruts (darker lines)
      if (rw > rh) {
        // Horizontal road
        g.rect(rx, ry + rh * 0.3, rw, 2).fill({ color: 0x6B5335, alpha: 0.3 });
        g.rect(rx, ry + rh * 0.7, rw, 2).fill({ color: 0x6B5335, alpha: 0.3 });
      } else {
        // Vertical road
        g.rect(rx + rw * 0.3, ry, 2, rh).fill({ color: 0x6B5335, alpha: 0.3 });
        g.rect(rx + rw * 0.7, ry, 2, rh).fill({ color: 0x6B5335, alpha: 0.3 });
      }
      // Scattered pebbles
      for (let i = 0; i < Math.max(rw, rh) / 15; i++) {
        const px = rx + rng() * rw;
        const py = ry + rng() * rh;
        g.circle(px, py, 1 + rng() * 1.5).fill({ color: 0x9A8A70, alpha: 0.4 });
      }
    };

    // North gate road
    drawDirtRoad(1950 - roadW / 2, 0, roadW, CY);
    // South gate road
    drawDirtRoad(1950 - roadW / 2, CY + CH, roadW, WH - CY - CH);
    // East gate road
    drawDirtRoad(CX + CW, 1400 - roadW / 2, WW - CX - CW, roadW);
    // West gate road
    drawDirtRoad(0, 1400 - roadW / 2, CX, roadW);

    // Side streets connecting buildings inside city
    // Castle to market
    g.rect(1100 - 14, CY + WT, 28, 1200 - CY - WT).fill({ color: roadColor, alpha: 0.5 });
    // Church area
    g.rect(2050, CY + WT + 350, 28, 300).fill({ color: roadColor, alpha: 0.5 });
    // Tavern street
    g.rect(2100, 1300, 100, 24).fill({ color: roadColor, alpha: 0.45 });
    // Blacksmith alley
    g.rect(CX + WT, 1300, 1100 - CX - WT, 24).fill({ color: roadColor, alpha: 0.4 });
    // South residential street
    g.rect(1400, 1700, 700, 20).fill({ color: roadColor, alpha: 0.35 });

    this.roadLayer.addChild(g);
  }

  // ===================== OUTSIDE FEATURES =====================
  private drawOutsideFeatures(): void {
    const g = new Graphics();
    const rng = mulberry32(123);

    // ---- Forest (north) ----
    for (let i = 0; i < 80; i++) {
      const tx = 100 + rng() * (WW - 200);
      const ty = 30 + rng() * 380;
      // skip near the north gate road
      if (Math.abs(tx - 1950) < 40) continue;
      const radius = 14 + rng() * 18;
      // Shadow
      g.ellipse(tx + 3, ty + radius * 0.7, radius * 0.8, radius * 0.4).fill({ color: 0x1a3a10, alpha: 0.35 });
      // Trunk
      g.rect(tx - 2, ty + radius * 0.2, 4, radius * 0.6).fill({ color: 0x5C3A1E });
      // Canopy layers
      g.circle(tx, ty, radius).fill({ color: 0x2d6b24 });
      g.circle(tx - radius * 0.3, ty + radius * 0.15, radius * 0.7).fill({ color: 0x358030 });
      g.circle(tx + radius * 0.25, ty - radius * 0.1, radius * 0.65).fill({ color: 0x3d8a38 });
      // Light highlight
      g.circle(tx - radius * 0.2, ty - radius * 0.3, radius * 0.3).fill({ color: 0x4da045, alpha: 0.5 });
    }

    // ---- Farm fields (south of city) ----
    const farmBaseY = CY + CH + 80;
    const farmColors = [0x6B8E23, 0x7B9C33, 0x5A7D13, 0x8B9E53];
    for (let fi = 0; fi < 6; fi++) {
      const fx = 400 + fi * 520;
      const fy = farmBaseY + (fi % 2) * 120;
      const fw = 400;
      const fh = 200;
      // skip near south road
      if (fx < 2050 && fx + fw > 1850) continue;
      // Field background
      g.rect(fx, fy, fw, fh).fill({ color: 0x8B7355, alpha: 0.3 });
      // Crop rows
      for (let row = 0; row < 10; row++) {
        const rowColor = farmColors[row % farmColors.length];
        g.rect(fx + 10, fy + 10 + row * (fh / 10), fw - 20, fh / 10 - 4).fill({ color: rowColor, alpha: 0.7 });
      }
      // Fence
      g.rect(fx, fy, fw, 2).fill({ color: 0x8B6914 });
      g.rect(fx, fy + fh - 2, fw, 2).fill({ color: 0x8B6914 });
      g.rect(fx, fy, 2, fh).fill({ color: 0x8B6914 });
      g.rect(fx + fw - 2, fy, 2, fh).fill({ color: 0x8B6914 });
    }

    // Farmhouses
    const farmhouses = [
      { x: 600, y: farmBaseY + 30 },
      { x: 1400, y: farmBaseY + 150 },
      { x: 2800, y: farmBaseY + 60 },
    ];
    for (const fh of farmhouses) {
      g.rect(fh.x, fh.y, 50, 40).fill({ color: 0x8B6914 });
      g.rect(fh.x - 2, fh.y - 2, 54, 4).fill({ color: 0x654321 });
      // Roof
      g.poly([fh.x - 5, fh.y, fh.x + 25, fh.y - 15, fh.x + 55, fh.y]).fill({ color: 0xA08050 });
      // Door
      g.rect(fh.x + 20, fh.y + 20, 10, 20).fill({ color: 0x4A2810 });
    }

    // Mill (windmill)
    const millX = 3200, millY = farmBaseY + 100;
    // Base building
    g.rect(millX - 20, millY - 30, 40, 60).fill({ color: 0x9A8060 });
    g.poly([millX - 25, millY - 30, millX, millY - 55, millX + 25, millY - 30]).fill({ color: 0x705030 });
    // Windmill arms (cross shape)
    g.moveTo(millX, millY - 35).lineTo(millX - 35, millY - 70).stroke({ color: 0x5C3A1E, width: 3 });
    g.moveTo(millX, millY - 35).lineTo(millX + 35, millY - 70).stroke({ color: 0x5C3A1E, width: 3 });
    g.moveTo(millX, millY - 35).lineTo(millX - 35, millY).stroke({ color: 0x5C3A1E, width: 3 });
    g.moveTo(millX, millY - 35).lineTo(millX + 35, millY).stroke({ color: 0x5C3A1E, width: 3 });
    // Sail fabric
    g.poly([millX, millY - 37, millX - 10, millY - 55, millX - 30, millY - 65]).fill({ color: 0xE8DCC8, alpha: 0.7 });
    g.poly([millX, millY - 37, millX + 10, millY - 55, millX + 30, millY - 65]).fill({ color: 0xE8DCC8, alpha: 0.7 });

    // Scattered rocks outside
    for (let i = 0; i < 40; i++) {
      const rx = rng() * WW;
      const ry = rng() * WH;
      if (rx > CX - 30 && rx < CX + CW + 30 && ry > CY - 30 && ry < CY + CH + 30) continue;
      g.circle(rx, ry, 2 + rng() * 4).fill({ color: 0x888880, alpha: 0.5 });
    }

    // Open fields east — wildflowers
    for (let i = 0; i < 60; i++) {
      const fx = CX + CW + 100 + rng() * (WW - CX - CW - 200);
      const fy = 100 + rng() * (WH - 200);
      if (fy < 450 || Math.abs(fy - 1400) < 30) continue;
      const flowerColors = [0xFF6B6B, 0xFFD93D, 0xC084FC, 0xFFF1CC, 0x6EE7B7];
      g.circle(fx, fy, 2).fill({ color: flowerColors[Math.floor(rng() * flowerColors.length)] });
    }

    this.outsideFeatureLayer.addChild(g);
  }

  // ===================== ENVIRONMENT PROPS =====================
  private drawEnvironmentProps(): void {
    const g = new Graphics();
    const rng = mulberry32(456);

    // ---- Street lamps / torches along roads inside city ----
    const torchPositions = [
      { x: 1925, y: 700 }, { x: 1975, y: 700 },
      { x: 1925, y: 1000 }, { x: 1975, y: 1000 },
      { x: 1925, y: 1200 }, { x: 1975, y: 1200 },
      { x: 1925, y: 1600 }, { x: 1975, y: 1600 },
      { x: 1925, y: 1900 }, { x: 1975, y: 1900 },
      { x: 1925, y: 2200 }, { x: 1975, y: 2200 },
      { x: 1100, y: 1380 }, { x: 1400, y: 1380 },
      { x: 1700, y: 1380 }, { x: 2200, y: 1380 },
      { x: 2500, y: 1380 }, { x: 2800, y: 1380 },
    ];
    for (const tp of torchPositions) {
      // Pole
      g.rect(tp.x - 1, tp.y - 8, 2, 10).fill({ color: 0x5C3A1E });
      // Iron bracket
      g.rect(tp.x - 3, tp.y - 9, 6, 2).fill({ color: 0x555555 });
      // Torch flame area (rendered at night via chimneySmoke)
    }

    // ---- Benches along roads ----
    const benchPositions = [
      { x: 1920, y: 800 }, { x: 1920, y: 1100 },
      { x: 1500, y: 1190 }, { x: 1700, y: 1190 },
      { x: 2050, y: 1600 }, { x: 1400, y: 1600 },
    ];
    for (const bp of benchPositions) {
      // Seat
      g.rect(bp.x - 10, bp.y, 20, 5).fill({ color: 0x6B4226 });
      // Legs
      g.rect(bp.x - 9, bp.y + 5, 2, 4).fill({ color: 0x5C3A1E });
      g.rect(bp.x + 7, bp.y + 5, 2, 4).fill({ color: 0x5C3A1E });
    }

    // ---- Barrels and crates scattered near buildings ----
    const barrelPositions = [
      { x: 1350, y: 1090 }, { x: 1360, y: 1100 },
      { x: 2690, y: 1190 }, { x: 2700, y: 1200 },
      { x: 1540, y: 1710 }, { x: 1810, y: 1760 },
      { x: 1000, y: 1490 },
      { x: 2640, y: 1810 }, { x: 2650, y: 1820 }, { x: 2660, y: 1810 },
    ];
    for (const bp of barrelPositions) {
      // Barrel
      g.ellipse(bp.x, bp.y, 5, 6).fill({ color: 0x6B4226 });
      g.ellipse(bp.x, bp.y, 5, 6).stroke({ color: 0x4A2810, width: 0.8 });
      // Metal bands
      g.ellipse(bp.x, bp.y - 2, 5, 1).stroke({ color: 0x666666, width: 0.5 });
      g.ellipse(bp.x, bp.y + 2, 5, 1).stroke({ color: 0x666666, width: 0.5 });
      // Lid
      g.ellipse(bp.x, bp.y - 5, 4, 1.5).fill({ color: 0x5C3A1E });
    }

    // Crates near buildings
    const cratePositions = [
      { x: 1320, y: 1100 }, { x: 2720, y: 1200 },
      { x: 1820, y: 1770 }, { x: 2400, y: 1510 },
      { x: 1050, y: 1510 }, { x: 2590, y: 1830 },
    ];
    for (const cp of cratePositions) {
      g.rect(cp.x - 5, cp.y - 5, 10, 10).fill({ color: 0x8B6914 });
      g.rect(cp.x - 5, cp.y - 5, 10, 10).stroke({ color: 0x6B4226, width: 0.8 });
      g.moveTo(cp.x - 5, cp.y).lineTo(cp.x + 5, cp.y).stroke({ color: 0x6B4226, width: 0.5 });
      g.moveTo(cp.x, cp.y - 5).lineTo(cp.x, cp.y + 5).stroke({ color: 0x6B4226, width: 0.5 });
    }

    // ---- Flower boxes near some houses ----
    const flowerBoxes = [
      { x: 1380, y: 1005 }, { x: 1160, y: 1095 },
      { x: 1580, y: 1705 }, { x: 1830, y: 1755 },
      { x: 2080, y: 1705 }, { x: 2380, y: 1705 },
    ];
    for (const fb of flowerBoxes) {
      // Box
      g.rect(fb.x - 8, fb.y, 16, 5).fill({ color: 0x6B4226 });
      // Flowers
      const flowerColors = [0xFF6B6B, 0xFFD93D, 0xC084FC, 0xFF88AA, 0x6EE7B7];
      for (let fi = 0; fi < 4; fi++) {
        const fx = fb.x - 6 + fi * 4;
        g.circle(fx, fb.y - 2, 2).fill({ color: flowerColors[Math.floor(rng() * flowerColors.length)] });
        g.moveTo(fx, fb.y).lineTo(fx, fb.y - 1).stroke({ color: 0x33AA33, width: 0.5 });
      }
    }

    // ---- Signposts at intersections ----
    const signPosts = [
      { x: 1960, y: 1410, text: "Market" },
      { x: 1130, y: 1050, text: "Castle" },
      { x: 2100, y: 600, text: "Church" },
    ];
    for (const sp of signPosts) {
      // Post
      g.rect(sp.x - 1, sp.y - 10, 2, 14).fill({ color: 0x5C3A1E });
      // Sign board
      g.roundRect(sp.x + 1, sp.y - 10, 24, 8, 1).fill({ color: 0x6B4226 });
      g.roundRect(sp.x + 1, sp.y - 10, 24, 8, 1).stroke({ color: 0x4A2810, width: 0.5 });
      const signLabel = new Text({
        text: sp.text,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 5, fill: 0xEEDDCC }),
      });
      signLabel.anchor.set(0, 0.5);
      signLabel.position.set(sp.x + 3, sp.y - 6);
      this.envPropsLayer.addChild(signLabel);
    }

    // ---- Well near market ----
    const wellX = 1480, wellY = 1430;
    g.circle(wellX, wellY, 14).fill({ color: 0x777770 });
    g.circle(wellX, wellY, 14).stroke({ color: 0x555550, width: 2 });
    g.circle(wellX, wellY, 10).fill({ color: 0x223344 });
    // Wooden frame
    g.rect(wellX - 16, wellY - 2, 32, 4).fill({ color: 0x6B4226 });
    g.rect(wellX - 1, wellY - 14, 2, 12).fill({ color: 0x6B4226 });
    // Bucket
    g.rect(wellX + 2, wellY - 8, 4, 4).fill({ color: 0x5C3A1E });
    // Rope
    g.moveTo(wellX + 1, wellY - 14).lineTo(wellX + 4, wellY - 8).stroke({ color: 0xBBA855, width: 0.8 });

    this.envPropsLayer.addChild(g);
  }

  // ===================== WALLS & TOWERS =====================
  private drawWalls(): void {
    const g = new Graphics();

    const wallBase = 0x776655;
    const wallHighlight = 0x887766;
    const wallDark = 0x665544;
    const gateWidth = 100;

    // Helper: draw stone block pattern on a horizontal wall segment
    const drawHWall = (x: number, y: number, w: number, h: number) => {
      g.rect(x, y, w, h).fill({ color: wallBase });
      // Stone blocks
      const blockW = 20;
      const blockH = h / 2;
      for (let row = 0; row < 2; row++) {
        const offsetX = row % 2 === 0 ? 0 : blockW / 2;
        for (let bx = 0; bx < Math.ceil(w / blockW) + 1; bx++) {
          const px = x + bx * blockW + offsetX;
          if (px >= x + w) break;
          const bw = Math.min(blockW - 1, x + w - px - 1);
          if (bw <= 0) continue;
          g.rect(px, y + row * blockH, bw, blockH - 1).fill({ color: wallHighlight, alpha: 0.3 });
        }
      }
      // Crenellations on top edge
      for (let cx = x; cx < x + w; cx += 20) {
        g.rect(cx, y - 6, 10, 6).fill({ color: wallDark });
      }
    };

    const drawVWall = (x: number, y: number, w: number, h: number) => {
      g.rect(x, y, w, h).fill({ color: wallBase });
      const blockH = 20;
      const blockW = w / 2;
      for (let col = 0; col < 2; col++) {
        const offsetY = col % 2 === 0 ? 0 : blockH / 2;
        for (let by = 0; by < Math.ceil(h / blockH) + 1; by++) {
          const py = y + by * blockH + offsetY;
          if (py >= y + h) break;
          const bh = Math.min(blockH - 1, y + h - py - 1);
          if (bh <= 0) continue;
          g.rect(x + col * blockW, py, blockW - 1, bh).fill({ color: wallHighlight, alpha: 0.3 });
        }
      }
      // Crenellations on outer edge
      for (let cy = y; cy < y + h; cy += 20) {
        g.rect(x - 6, cy, 6, 10).fill({ color: wallDark });
      }
    };

    // North wall (with gate)
    const gateNX = 1950 - gateWidth / 2;
    drawHWall(CX, CY, gateNX - CX, WT);
    drawHWall(gateNX + gateWidth, CY, CX + CW - gateNX - gateWidth, WT);

    // South wall
    const gateSX = 1950 - gateWidth / 2;
    drawHWall(CX, CY + CH - WT, gateSX - CX, WT);
    drawHWall(gateSX + gateWidth, CY + CH - WT, CX + CW - gateSX - gateWidth, WT);

    // West wall
    const gateWY = 1400 - gateWidth / 2;
    drawVWall(CX, CY, WT, gateWY - CY);
    drawVWall(CX, gateWY + gateWidth, WT, CY + CH - gateWY - gateWidth);

    // East wall
    const gateEY = 1400 - gateWidth / 2;
    drawVWall(CX + CW - WT, CY, WT, gateEY - CY);
    drawVWall(CX + CW - WT, gateEY + gateWidth, WT, CY + CH - gateEY - gateWidth);

    // Gate frames (wooden beams)
    const drawGateH = (gx: number, gy: number) => {
      // Wooden frame
      g.rect(gx, gy, gateWidth, 6).fill({ color: 0x4A2810 });
      g.rect(gx, gy + WT - 6, gateWidth, 6).fill({ color: 0x4A2810 });
      // Portcullis lines
      for (let px = gx + 8; px < gx + gateWidth; px += 12) {
        g.moveTo(px, gy).lineTo(px, gy + WT).stroke({ color: 0x555555, width: 2, alpha: 0.6 });
      }
      for (let py = gy + 8; py < gy + WT; py += 10) {
        g.moveTo(gx, py).lineTo(gx + gateWidth, py).stroke({ color: 0x555555, width: 1, alpha: 0.3 });
      }
    };
    const drawGateV = (gx: number, gy: number) => {
      g.rect(gx, gy, 6, gateWidth).fill({ color: 0x4A2810 });
      g.rect(gx + WT - 6, gy, 6, gateWidth).fill({ color: 0x4A2810 });
      for (let py = gy + 8; py < gy + gateWidth; py += 12) {
        g.moveTo(gx, py).lineTo(gx + WT, py).stroke({ color: 0x555555, width: 2, alpha: 0.6 });
      }
      for (let px = gx + 8; px < gx + WT; px += 10) {
        g.moveTo(px, gy).lineTo(px, gy + gateWidth).stroke({ color: 0x555555, width: 1, alpha: 0.3 });
      }
    };

    drawGateH(gateNX, CY);
    drawGateH(gateSX, CY + CH - WT);
    drawGateV(CX, gateWY);
    drawGateV(CX + CW - WT, gateEY);

    // ---- TOWERS ----
    const towerColor = 0x776655;
    const roofColor = 0x4A6680;

    const drawTower = (tx: number, ty: number, r: number) => {
      // Shadow
      g.circle(tx + 3, ty + 3, r).fill({ color: 0x333333, alpha: 0.3 });
      // Base
      g.circle(tx, ty, r).fill({ color: towerColor });
      g.circle(tx, ty, r).stroke({ color: 0x554433, width: 2 });
      // Stone detail rings
      g.circle(tx, ty, r - 4).stroke({ color: 0x887766, width: 1, alpha: 0.5 });
      // Conical roof
      g.circle(tx, ty, r - 3).fill({ color: roofColor, alpha: 0.7 });
      g.circle(tx, ty, r * 0.4).fill({ color: 0x5A7690 });
      // Window slits
      g.rect(tx - 1, ty - r * 0.5, 2, 6).fill({ color: 0x222222 });
      g.rect(tx - 1, ty + r * 0.3, 2, 6).fill({ color: 0x222222 });
      // Battlement nubs around edge
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const bx = tx + Math.cos(a) * (r + 3);
        const by = ty + Math.sin(a) * (r + 3);
        g.rect(bx - 3, by - 3, 6, 6).fill({ color: wallDark });
      }
    };

    // 4 corner towers (radius 30)
    drawTower(CX, CY, 30);
    drawTower(CX + CW, CY, 30);
    drawTower(CX, CY + CH, 30);
    drawTower(CX + CW, CY + CH, 30);

    // Intermediate towers (2 per wall, radius 25)
    // North wall
    drawTower(CX + CW * 0.3, CY, 25);
    drawTower(CX + CW * 0.7, CY, 25);
    // South wall
    drawTower(CX + CW * 0.3, CY + CH, 25);
    drawTower(CX + CW * 0.7, CY + CH, 25);
    // West wall
    drawTower(CX, CY + CH * 0.3, 25);
    drawTower(CX, CY + CH * 0.7, 25);
    // East wall
    drawTower(CX + CW, CY + CH * 0.3, 25);
    drawTower(CX + CW, CY + CH * 0.7, 25);

    this.wallLayer.addChild(g);
  }

  // ===================== BUILDINGS =====================
  drawBuildings(buildings: GTABuilding[]): void {
    this.buildingLayer.removeChildren();
    const g = new Graphics();

    for (const b of buildings) {
      switch (b.type) {
        case 'castle': this.drawCastle(g, b); break;
        case 'barracks': this.drawBarracks(g, b); break;
        case 'church': this.drawChurch(g, b); break;
        case 'tavern': this.drawTavern(g, b); break;
        case 'market_stall': this.drawMarketStall(g, b); break;
        case 'blacksmith_shop': this.drawBlacksmith(g, b); break;
        case 'stable': this.drawStable(g, b); break;
        case 'prison': this.drawPrison(g, b); break;
        case 'house_large': this.drawHouseLarge(g, b); break;
        case 'house_medium': this.drawHouseMedium(g, b); break;
        case 'house_small': this.drawHouseSmall(g, b); break;
        case 'fountain': this.drawFountain(g, b); break;
        case 'well': this.drawWell(g, b); break;
        case 'tree_cluster': this.drawTreeCluster(g, b); break;
        case 'cart': this.drawCart(g, b); break;
        case 'hay_bale': this.drawHayBale(g, b); break;
        case 'farm_field': this.drawFarmField(g, b); break;
        case 'farmhouse': this.drawFarmhouse(g, b); break;
        case 'mill': this.drawMill(g, b); break;
        default: break; // walls/gates handled separately
      }
    }

    this.buildingLayer.addChild(g);
  }

  // ---- Castle Keep ----
  private drawCastle(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    // Shadow
    g.rect(x + 5, y + 5, w, h).fill({ color: 0x222222, alpha: 0.3 });
    // Courtyard (lighter stone floor)
    g.rect(x + 15, y + 15, w - 30, h - 30).fill({ color: 0x9A9080 });
    // Outer walls - thick dark stone
    g.rect(x, y, w, 12).fill({ color: 0x555555 });
    g.rect(x, y + h - 12, w, 12).fill({ color: 0x555555 });
    g.rect(x, y, 12, h).fill({ color: 0x555555 });
    g.rect(x + w - 12, y, 12, h).fill({ color: 0x555555 });
    // Crenellations on castle walls
    for (let cx = x; cx < x + w; cx += 14) {
      g.rect(cx, y - 5, 7, 5).fill({ color: 0x555555 });
      g.rect(cx, y + h, 7, 5).fill({ color: 0x555555 });
    }
    for (let cy = y; cy < y + h; cy += 14) {
      g.rect(x - 5, cy, 5, 7).fill({ color: 0x555555 });
      g.rect(x + w, cy, 5, 7).fill({ color: 0x555555 });
    }
    // Central keep tower
    const kw = 80, kh = 80;
    const kx = x + w / 2 - kw / 2, ky = y + h / 2 - kh / 2 - 20;
    g.rect(kx, ky, kw, kh).fill({ color: 0x444444 });
    g.rect(kx, ky, kw, kh).stroke({ color: 0x333333, width: 2 });
    // Keep roof detail
    g.rect(kx + 5, ky + 5, kw - 10, kh - 10).fill({ color: 0x4A4A4A });
    // Keep windows
    g.rect(kx + 15, ky + 20, 8, 12).fill({ color: 0x222222 });
    g.rect(kx + kw - 23, ky + 20, 8, 12).fill({ color: 0x222222 });
    g.rect(kx + kw / 2 - 4, ky + 15, 8, 12).fill({ color: 0x222222 });

    // Corner turrets
    const turretR = 10;
    const turretPositions = [
      { tx: x + 6, ty: y + 6 },
      { tx: x + w - 6, ty: y + 6 },
      { tx: x + 6, ty: y + h - 6 },
      { tx: x + w - 6, ty: y + h - 6 },
    ];
    for (const tp of turretPositions) {
      g.circle(tp.tx, tp.ty, turretR).fill({ color: 0x666666 });
      g.circle(tp.tx, tp.ty, turretR).stroke({ color: 0x444444, width: 1 });
      // Conical roof
      g.circle(tp.tx, tp.ty, turretR - 3).fill({ color: 0x8B2020 });
      g.circle(tp.tx, tp.ty, 3).fill({ color: 0xAA3333 });
    }

    // Banners on castle walls
    const bannerPositions = [
      { bx: x + w / 4, by: y + 14 },
      { bx: x + w * 3 / 4, by: y + 14 },
    ];
    for (const bp of bannerPositions) {
      // Pole
      g.rect(bp.bx - 1, bp.by, 2, 30).fill({ color: 0x8B6914 });
      // Banner
      g.rect(bp.bx + 1, bp.by + 2, 16, 24).fill({ color: 0xCC2222 });
      // Gold trim
      g.rect(bp.bx + 1, bp.by + 2, 16, 3).fill({ color: 0xDAA520 });
      g.rect(bp.bx + 1, bp.by + 23, 16, 3).fill({ color: 0xDAA520 });
      // Lion emblem (simple cross shape)
      g.rect(bp.bx + 6, bp.by + 8, 6, 2).fill({ color: 0xDAA520 });
      g.rect(bp.bx + 8, bp.by + 6, 2, 6).fill({ color: 0xDAA520 });
    }

    // Drawbridge entrance (south side)
    const dbW = 40, dbX = x + w / 2 - dbW / 2;
    g.rect(dbX, y + h - 14, dbW, 16).fill({ color: 0x6B4226 });
    // Plank lines
    for (let ly = y + h - 12; ly < y + h + 2; ly += 4) {
      g.moveTo(dbX, ly).lineTo(dbX + dbW, ly).stroke({ color: 0x4A2810, width: 1 });
    }

    // Label
    if (b.label) {
      const label = new Text({
        text: b.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xDAA520, fontWeight: "bold" }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x + w / 2, y - 14);
      this.buildingLayer.addChild(label);
    }
  }

  // ---- Barracks ----
  private drawBarracks(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    // Shadow
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.25 });
    // Main building
    g.rect(x, y, w, h).fill({ color: 0x7A7060 });
    g.rect(x, y, w, h).stroke({ color: 0x554433, width: 2 });
    // Stone texture
    for (let sy = y + 6; sy < y + h; sy += 10) {
      g.moveTo(x, sy).lineTo(x + w, sy).stroke({ color: 0x6A6050, width: 0.5, alpha: 0.3 });
    }
    // Roof with red tile pattern
    g.rect(x - 3, y - 4, w + 6, h * 0.16).fill({ color: 0x6B2020 });
    g.rect(x - 3, y - 4, w + 6, h * 0.16).stroke({ color: 0x5A1818, width: 0.5 });
    // Roof tile lines
    for (let rx = x; rx < x + w; rx += 8) {
      g.rect(rx, y - 3, 0.5, h * 0.14).fill({ color: 0x5A1818, alpha: 0.3 });
    }
    g.rect(x - 3, y + h - h * 0.1, w + 6, h * 0.13).fill({ color: 0x6B2020 });
    // Windows with iron bars
    for (let wx = x + 25; wx < x + w - 20; wx += 50) {
      g.rect(wx - 1, y + h * 0.3 - 1, 12, 16).fill({ color: 0x554433 });
      g.rect(wx, y + h * 0.3, 10, 14).fill({ color: 0x333333 });
      g.rect(wx, y + h * 0.3, 10, 14).stroke({ color: 0x554433, width: 1 });
      // Window bars
      g.moveTo(wx + 5, y + h * 0.3).lineTo(wx + 5, y + h * 0.3 + 14).stroke({ color: 0x555555, width: 0.8 });
      g.moveTo(wx, y + h * 0.3 + 7).lineTo(wx + 10, y + h * 0.3 + 7).stroke({ color: 0x555555, width: 0.8 });
    }
    // Training yard (south of building)
    const yardY = y + h + 5;
    // Training ground (slightly different ground color)
    g.rect(x - 10, yardY - 2, w + 20, 35).fill({ color: 0x8A7A5A, alpha: 0.2 });
    // Training dummies — more detailed
    for (let d = 0; d < 3; d++) {
      const dx = x + 40 + d * 60;
      // Base
      g.rect(dx - 4, yardY + 18, 8, 4).fill({ color: 0x6B4226 });
      // Pole
      g.rect(dx - 1, yardY - 2, 2, 22).fill({ color: 0x8B6914 });
      // Head (straw-stuffed)
      g.circle(dx, yardY - 2, 5).fill({ color: 0xBBA880 });
      g.circle(dx, yardY - 2, 5).stroke({ color: 0xAA9870, width: 0.5 });
      // Face X marks
      g.moveTo(dx - 2, yardY - 3).lineTo(dx + 2, yardY - 1).stroke({ color: 0x887766, width: 0.8 });
      g.moveTo(dx + 2, yardY - 3).lineTo(dx - 2, yardY - 1).stroke({ color: 0x887766, width: 0.8 });
      // Arms (crossbar)
      g.moveTo(dx - 10, yardY + 6).lineTo(dx + 10, yardY + 6).stroke({ color: 0x8B6914, width: 2 });
      // Shield on arm
      g.ellipse(dx - 8, yardY + 8, 3, 4).fill({ color: 0x663322, alpha: 0.6 });
    }
    // Weapon rack — with visible weapons
    const rackX = x + w - 60;
    g.rect(rackX, yardY + 2, 30, 4).fill({ color: 0x6B4226 });
    g.rect(rackX, yardY + 2, 30, 4).stroke({ color: 0x5A3520, width: 0.5 });
    // Sword
    g.moveTo(rackX + 5, yardY + 6).lineTo(rackX + 5, yardY - 12).stroke({ color: 0x999999, width: 2 });
    g.moveTo(rackX + 2, yardY - 3).lineTo(rackX + 8, yardY - 3).stroke({ color: 0xDAA520, width: 1.5 });
    // Spear
    g.moveTo(rackX + 15, yardY + 6).lineTo(rackX + 15, yardY - 14).stroke({ color: 0x8B6914, width: 1.5 });
    g.poly([rackX + 13, yardY - 14, rackX + 15, yardY - 18, rackX + 17, yardY - 14]).fill({ color: 0x888888 });
    // Axe
    g.moveTo(rackX + 25, yardY + 6).lineTo(rackX + 25, yardY - 10).stroke({ color: 0x8B6914, width: 1.5 });
    g.poly([rackX + 25, yardY - 10, rackX + 30, yardY - 8, rackX + 30, yardY - 4, rackX + 25, yardY - 3]).fill({ color: 0x777777 });

    // Red military banners (2)
    for (const bx of [x + 10, x + w - 25]) {
      g.rect(bx, y + 4, 2, 22).fill({ color: 0x8B6914 });
      g.poly([bx + 2, y + 5, bx + 16, y + 12, bx + 2, y + 20]).fill({ color: 0xCC2222 });
      g.poly([bx + 2, y + 5, bx + 16, y + 12, bx + 2, y + 20]).stroke({ color: 0xAA1818, width: 0.5 });
      // Cross on banner
      g.moveTo(bx + 6, y + 9).lineTo(bx + 6, y + 17).stroke({ color: 0xFFDD44, width: 0.8 });
      g.moveTo(bx + 3, y + 12).lineTo(bx + 10, y + 12).stroke({ color: 0xFFDD44, width: 0.8 });
    }

    if (b.label) {
      const label = new Text({
        text: b.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xCCBBAA }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x + w / 2, y - 10);
      this.buildingLayer.addChild(label);
    }
  }

  // ---- Church ----
  private drawChurch(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.25 });
    // Main building
    g.rect(x, y, w, h).fill({ color: 0x9A9080 });
    g.rect(x, y, w, h).stroke({ color: 0x706050, width: 2 });
    // Gothic peaked roof
    g.poly([x - 8, y + 20, x + w / 2, y - 40, x + w + 8, y + 20]).fill({ color: 0x4A4A5A });
    g.poly([x - 8, y + 20, x + w / 2, y - 40, x + w + 8, y + 20]).stroke({ color: 0x3A3A4A, width: 1 });
    // Steeple/spire
    g.poly([x + w / 2 - 10, y - 30, x + w / 2, y - 65, x + w / 2 + 10, y - 30]).fill({ color: 0x4A4A5A });
    // Golden cross on peak
    g.rect(x + w / 2 - 1.5, y - 80, 3, 18).fill({ color: 0xDAA520 });
    g.rect(x + w / 2 - 6, y - 74, 12, 3).fill({ color: 0xDAA520 });

    // Rose window
    const rwx = x + w / 2, rwy = y + 30;
    g.circle(rwx, rwy, 12).fill({ color: 0x333333 });
    g.circle(rwx, rwy, 12).stroke({ color: 0x706050, width: 2 });
    // Colored segments
    const segColors = [0xCC3333, 0x3366CC, 0xDAA520, 0x33AA55];
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2;
      g.moveTo(rwx, rwy)
        .arc(rwx, rwy, 10, a, a + Math.PI / 2)
        .lineTo(rwx, rwy)
        .fill({ color: segColors[s], alpha: 0.7 });
    }

    // Stained glass windows
    const windowColors = [0xCC3333, 0x3366CC, 0xDAA520];
    for (let wi = 0; wi < 3; wi++) {
      const wx = x + 30 + wi * (w - 60) / 2;
      const wy = y + h * 0.5;
      g.rect(wx, wy, 8, 16).fill({ color: 0x333333 });
      g.rect(wx + 1, wy + 1, 6, 14).fill({ color: windowColors[wi], alpha: 0.6 });
      // Gothic arch top
      g.moveTo(wx, wy).arc(wx + 4, wy, 4, Math.PI, 0).fill({ color: windowColors[wi], alpha: 0.6 });
    }

    // Stone steps at entrance (south)
    for (let step = 0; step < 3; step++) {
      const sw = 40 + step * 6;
      g.rect(x + w / 2 - sw / 2, y + h + step * 4, sw, 4).fill({ color: 0x8A8A80 });
    }

    if (b.label) {
      const label = new Text({
        text: b.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xDAA520 }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x + w / 2, y - 85);
      this.buildingLayer.addChild(label);
    }
  }

  // ---- Tavern ----
  private drawTavern(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.25 });
    // Walls - cream/plaster
    g.rect(x, y, w, h).fill({ color: 0xE8DCC0 });
    // Timber frame cross pattern
    // Horizontal beams
    g.rect(x, y, w, 4).fill({ color: 0x5C3A1E });
    g.rect(x, y + h - 4, w, 4).fill({ color: 0x5C3A1E });
    g.rect(x, y + h / 2 - 2, w, 4).fill({ color: 0x5C3A1E });
    // Vertical beams
    g.rect(x, y, 4, h).fill({ color: 0x5C3A1E });
    g.rect(x + w - 4, y, 4, h).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 2, y, 4, h).fill({ color: 0x5C3A1E });
    // Diagonal cross-bracing
    g.moveTo(x + 4, y + 4).lineTo(x + w / 2 - 2, y + h / 2 - 2).stroke({ color: 0x5C3A1E, width: 2 });
    g.moveTo(x + w / 2 + 2, y + 4).lineTo(x + 4, y + h / 2 - 2).stroke({ color: 0x5C3A1E, width: 2 });
    g.moveTo(x + w / 2 + 2, y + 4).lineTo(x + w - 4, y + h / 2 - 2).stroke({ color: 0x5C3A1E, width: 2 });
    g.moveTo(x + w - 4, y + 4).lineTo(x + w / 2 + 2, y + h / 2 - 2).stroke({ color: 0x5C3A1E, width: 2 });

    // Pitched roof
    g.poly([x - 6, y, x + w / 2, y - 25, x + w + 6, y]).fill({ color: 0x6B4226 });
    g.poly([x - 6, y, x + w / 2, y - 25, x + w + 6, y]).stroke({ color: 0x4A2810, width: 1 });

    // Glowing windows (warm yellow)
    for (let wi = 0; wi < 3; wi++) {
      const wx = x + 20 + wi * (w - 50) / 2;
      g.rect(wx, y + h * 0.25, 14, 12).fill({ color: 0xFFDD44, alpha: 0.7 });
      g.rect(wx, y + h * 0.25, 14, 12).stroke({ color: 0x5C3A1E, width: 1 });
      // Window cross
      g.moveTo(wx + 7, y + h * 0.25).lineTo(wx + 7, y + h * 0.25 + 12).stroke({ color: 0x5C3A1E, width: 1 });
      g.moveTo(wx, y + h * 0.25 + 6).lineTo(wx + 14, y + h * 0.25 + 6).stroke({ color: 0x5C3A1E, width: 1 });
    }

    // Chimney
    g.rect(x + w - 30, y - 20, 12, 20).fill({ color: 0x665544 });

    // Hanging sign
    g.rect(x + w / 2 - 1, y + h, 2, 12).fill({ color: 0x5C3A1E });
    g.roundRect(x + w / 2 - 15, y + h + 10, 30, 16, 3).fill({ color: 0x5C3A1E });
    const signText = new Text({
      text: "TAVERN",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 6, fill: 0xDAA520 }),
    });
    signText.anchor.set(0.5, 0.5);
    signText.position.set(x + w / 2, y + h + 18);
    this.buildingLayer.addChild(signText);

    // Barrels outside
    for (let bi = 0; bi < 3; bi++) {
      const bx = x - 15 + bi * 12;
      const by = y + h - 20;
      g.circle(bx, by, 6).fill({ color: 0x6B4226 });
      g.circle(bx, by, 6).stroke({ color: 0x4A2810, width: 1 });
      g.circle(bx, by, 3).fill({ color: 0x4A2810, alpha: 0.3 });
    }

    // Door
    g.rect(x + w / 2 - 10, y + h - 24, 20, 24).fill({ color: 0x4A2810 });
    g.rect(x + w / 2 - 10, y + h - 24, 20, 24).stroke({ color: 0x3A1800, width: 1 });
    g.circle(x + w / 2 + 6, y + h - 12, 2).fill({ color: 0x888888 }); // handle
  }

  // ---- Market Stall ----
  private drawMarketStall(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    const rng = mulberry32(b.x * 100 + b.y);
    const awningColors = [0xCC3333, 0xDDAA22, 0x33AA55, 0x3366BB];
    const awningColor = awningColors[Math.floor(rng() * awningColors.length)];

    // Wooden counter
    g.rect(x, y + h * 0.4, w, h * 0.6).fill({ color: 0x8B6914 });
    g.rect(x, y + h * 0.4, w, h * 0.6).stroke({ color: 0x6B4226, width: 1 });

    // Support poles
    g.rect(x + 2, y, 3, h).fill({ color: 0x6B4226 });
    g.rect(x + w - 5, y, 3, h).fill({ color: 0x6B4226 });

    // Awning
    g.poly([x - 5, y + 3, x + w / 2, y - 10, x + w + 5, y + 3]).fill({ color: awningColor });
    // Awning stripes
    g.rect(x - 5, y, w + 10, 3).fill({ color: awningColor });
    for (let sx = x - 5; sx < x + w + 5; sx += 12) {
      g.rect(sx, y - 2, 6, 6).fill({ color: 0xFFFFFF, alpha: 0.3 });
    }

    // Goods on counter (colored dots)
    for (let gi = 0; gi < 5; gi++) {
      const gx = x + 8 + gi * (w - 16) / 4;
      const gy = y + h * 0.55;
      const goodColors = [0xFF6644, 0xFFDD44, 0x44BB44, 0xDD8844, 0xCC88CC];
      g.circle(gx, gy, 3).fill({ color: goodColors[gi] });
    }
  }

  // ---- Blacksmith ----
  private drawBlacksmith(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.25 });
    // Dark stone/wood building
    g.rect(x, y, w, h).fill({ color: 0x5A5040 });
    g.rect(x, y, w, h).stroke({ color: 0x3A3020, width: 2 });
    // Stone texture lines
    for (let sy = y + 8; sy < y + h; sy += 12) {
      g.moveTo(x, sy).lineTo(x + w, sy).stroke({ color: 0x4A4030, width: 0.5, alpha: 0.3 });
    }
    // Roof with overhang
    g.rect(x - 4, y - 4, w + 8, 9).fill({ color: 0x443322 });
    g.rect(x - 4, y - 4, w + 8, 9).stroke({ color: 0x332211, width: 0.5 });

    // Chimney with glow and smoke suggestion
    g.rect(x + w - 30, y - 22, 16, 24).fill({ color: 0x444444 });
    g.rect(x + w - 30, y - 22, 16, 24).stroke({ color: 0x333333, width: 1 });
    // Chimney cap
    g.rect(x + w - 32, y - 24, 20, 3).fill({ color: 0x3A3A3A });
    // Fire glow at chimney top (layered)
    g.circle(x + w - 22, y - 26, 12).fill({ color: 0xFF4400, alpha: 0.15 });
    g.circle(x + w - 22, y - 25, 8).fill({ color: 0xFF4400, alpha: 0.3 });
    g.circle(x + w - 22, y - 24, 5).fill({ color: 0xFF6600, alpha: 0.4 });
    // Smoke wisps
    g.circle(x + w - 20, y - 30, 3).fill({ color: 0x666666, alpha: 0.15 });
    g.circle(x + w - 23, y - 35, 4).fill({ color: 0x555555, alpha: 0.1 });

    // Forge window (orange glow) with frame
    g.rect(x + 14, y + h * 0.3 - 1, 18, 14).fill({ color: 0x3A3020 });
    g.rect(x + 15, y + h * 0.3, 16, 12).fill({ color: 0xFF6600, alpha: 0.6 });
    g.rect(x + 15, y + h * 0.3, 16, 12).stroke({ color: 0x3A3020, width: 1 });
    // Window cross-bar (iron)
    g.moveTo(x + 23, y + h * 0.3).lineTo(x + 23, y + h * 0.3 + 12).stroke({ color: 0x3A3020, width: 1 });

    // Anvil (outside) — more detailed
    const anvX = x + w + 10, anvY = y + h / 2;
    g.moveTo(anvX, anvY).lineTo(anvX + 18, anvY).lineTo(anvX + 16, anvY - 8)
      .lineTo(anvX + 2, anvY - 8).lineTo(anvX, anvY).fill({ color: 0x444444 });
    // Anvil horn
    g.moveTo(anvX + 18, anvY - 2).lineTo(anvX + 22, anvY - 5).lineTo(anvX + 18, anvY - 6).fill({ color: 0x444444 });
    // Anvil base (wider block)
    g.rect(anvX + 2, anvY, 14, 8).fill({ color: 0x333333 });
    g.rect(anvX, anvY + 8, 18, 3).fill({ color: 0x2A2A2A });
    // Anvil highlight
    g.rect(anvX + 3, anvY - 7, 12, 1).fill({ color: 0x555555, alpha: 0.4 });
    // Hammer on anvil
    g.rect(anvX + 6, anvY - 10, 2, 8).fill({ color: 0x6B4226 });
    g.rect(anvX + 4, anvY - 12, 6, 3).fill({ color: 0x555555 });

    // Bucket of water with handle
    g.rect(x - 12, y + h - 16, 10, 12).fill({ color: 0x555555 });
    g.rect(x - 12, y + h - 16, 10, 12).stroke({ color: 0x444444, width: 0.5 });
    g.rect(x - 11, y + h - 15, 8, 3).fill({ color: 0x4488BB, alpha: 0.6 });
    // Bucket handle
    g.moveTo(x - 11, y + h - 16).lineTo(x - 7, y + h - 20).lineTo(x - 3, y + h - 16).stroke({ color: 0x555555, width: 1 });

    // Tongs leaning against wall
    g.moveTo(x - 5, y + h - 2).lineTo(x - 3, y + h - 18).stroke({ color: 0x555555, width: 1.5 });
    g.moveTo(x - 3, y + h - 2).lineTo(x - 1, y + h - 18).stroke({ color: 0x555555, width: 1.5 });

    // Door with iron band
    g.rect(x + w / 2 - 10, y + h - 22, 20, 22).fill({ color: 0x3A2010 });
    g.rect(x + w / 2 - 10, y + h - 22, 20, 22).stroke({ color: 0x2A1808, width: 0.5 });
    g.rect(x + w / 2 - 10, y + h - 14, 20, 2).fill({ color: 0x444444 });
    g.circle(x + w / 2 + 6, y + h - 11, 1.5).fill({ color: 0x555555 });

    if (b.label) {
      const label = new Text({
        text: b.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xFF8844 }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x + w / 2, y - 12);
      this.buildingLayer.addChild(label);
    }
  }

  // ---- Stable ----
  private drawStable(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.2 });
    // Wooden structure
    g.rect(x, y, w, h).fill({ color: 0x8B6914 });
    // Vertical plank pattern
    for (let px = x; px < x + w; px += 10) {
      g.rect(px, y, 1, h).fill({ color: 0x6B4226, alpha: 0.5 });
    }
    // Horizontal beam across middle
    g.rect(x, y + h * 0.45, w, 3).fill({ color: 0x6B4226 });
    g.rect(x, y, w, h).stroke({ color: 0x6B4226, width: 2 });

    // Open front (south side) — stall dividers with arched tops
    g.rect(x, y + h - 8, w, 8).fill({ color: 0x6B4226 });
    for (let s = 0; s < 4; s++) {
      const sx = x + 10 + s * (w - 20) / 3;
      g.rect(sx, y + h * 0.5, 3, h * 0.5).fill({ color: 0x6B4226 });
      // Stall gate hinge
      g.circle(sx + 1.5, y + h * 0.55, 1.5).fill({ color: 0x555555 });
      g.circle(sx + 1.5, y + h * 0.75, 1.5).fill({ color: 0x555555 });
    }

    // Hay scattered
    const rng = mulberry32(b.x + b.y * 7);
    for (let hi = 0; hi < 12; hi++) {
      const hx = x + 5 + rng() * (w - 10);
      const hy = y + h * 0.55 + rng() * (h * 0.35);
      g.rect(hx, hy, 4 + rng() * 4, 2).fill({ color: 0xCCBB55, alpha: 0.6 });
    }

    // Roof with thatch lines
    g.poly([x - 5, y, x + w / 2, y - 18, x + w + 5, y]).fill({ color: 0x8B6914 });
    g.poly([x - 5, y, x + w / 2, y - 18, x + w + 5, y]).stroke({ color: 0x6B4226, width: 1 });
    for (let rx = x; rx < x + w / 2; rx += 6) {
      const ratio = (rx - x) / (w / 2);
      g.moveTo(rx, y).lineTo(rx + 1, y - 16 * ratio + 2).stroke({ color: 0x7A5818, width: 0.5, alpha: 0.3 });
    }
    // Ridge line
    g.moveTo(x + w * 0.25, y - 9).lineTo(x + w * 0.75, y - 9).stroke({ color: 0x7A5818, width: 1 });

    // Horse shoe on wall (decorative)
    g.moveTo(x + 15, y + 12).arc(x + 20, y + 12, 5, Math.PI, 0).stroke({ color: 0x666666, width: 1.5 });

    // Water trough outside
    g.rect(x + w + 5, y + h - 20, 18, 8).fill({ color: 0x5A3A1A });
    g.rect(x + w + 5, y + h - 20, 18, 8).stroke({ color: 0x4A2A10, width: 0.5 });
    g.rect(x + w + 6, y + h - 19, 16, 4).fill({ color: 0x4488BB, alpha: 0.5 });

    // Fence around yard (south) with cross-rails
    const fenceY = y + h + 10;
    g.rect(x - 20, fenceY, w + 40, 2).fill({ color: 0x8B6914 });
    g.rect(x - 20, fenceY - 12, w + 40, 2).fill({ color: 0x8B6914, alpha: 0.7 });
    for (let fp = x - 20; fp < x + w + 20; fp += 15) {
      g.rect(fp, fenceY - 14, 2, 16).fill({ color: 0x8B6914 });
      // Post cap
      g.rect(fp - 0.5, fenceY - 15, 3, 2).fill({ color: 0x7A5818 });
    }

    if (b.label) {
      const label = new Text({
        text: b.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xCCBB88 }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x + w / 2, y - 24);
      this.buildingLayer.addChild(label);
    }
  }

  // ---- Prison ----
  private drawPrison(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.3 });
    // Dark stone building
    g.rect(x, y, w, h).fill({ color: 0x444444 });
    g.rect(x, y, w, h).stroke({ color: 0x333333, width: 3 });
    // Inner wall shadow
    g.rect(x + 2, y + 2, w - 4, h - 4).fill({ color: 0x3A3A3A, alpha: 0.2 });
    // Stone block texture
    for (let row = 0; row < Math.ceil(h / 12); row++) {
      const offset = (row % 2) * 10;
      for (let col = 0; col < Math.ceil(w / 20) + 1; col++) {
        const bx = x + col * 20 + offset;
        if (bx >= x + w) continue;
        const bw = Math.min(19, x + w - bx);
        g.rect(bx, y + row * 12, bw, 11).stroke({ color: 0x3A3A3A, width: 0.5 });
      }
    }

    // Roof (flat stone with watchtower corner)
    g.rect(x - 2, y - 3, w + 4, 5).fill({ color: 0x3A3A3A });
    // Crenellations along roof
    for (let cx = x; cx < x + w; cx += 12) {
      g.rect(cx, y - 7, 6, 5).fill({ color: 0x444444 });
      g.rect(cx, y - 7, 6, 5).stroke({ color: 0x3A3A3A, width: 0.5 });
    }

    // Tiny barred windows with frames and inner darkness
    for (let wi = 0; wi < 3; wi++) {
      const wx = x + 30 + wi * (w - 60) / 2;
      const wy = y + 20;
      // Stone frame
      g.rect(wx - 1, wy - 1, 10, 12).fill({ color: 0x3A3A3A });
      g.rect(wx, wy, 8, 10).fill({ color: 0x111111 });
      // Bars (vertical)
      for (let bar = 0; bar < 4; bar++) {
        g.moveTo(wx + 2 * bar + 1, wy).lineTo(wx + 2 * bar + 1, wy + 10).stroke({ color: 0x555555, width: 1 });
      }
      // Horizontal cross-bar
      g.moveTo(wx, wy + 5).lineTo(wx + 8, wy + 5).stroke({ color: 0x555555, width: 0.8 });
    }

    // Heavy iron door with arch
    const doorX = x + w / 2 - 12;
    g.roundRect(doorX, y + h - 30, 24, 30, 3).fill({ color: 0x333333 });
    g.roundRect(doorX, y + h - 30, 24, 30, 3).stroke({ color: 0x222222, width: 2 });
    // Door bands (horizontal iron strips)
    g.rect(doorX + 1, y + h - 25, 22, 2).fill({ color: 0x444444 });
    g.rect(doorX + 1, y + h - 15, 22, 2).fill({ color: 0x444444 });
    // Door viewing slit
    g.rect(doorX + 9, y + h - 28, 6, 4).fill({ color: 0x111111 });
    g.rect(doorX + 9, y + h - 28, 6, 4).stroke({ color: 0x444444, width: 0.5 });
    // Rivets with highlights
    const rivetPos = [
      [doorX + 4, y + h - 24], [doorX + 20, y + h - 24],
      [doorX + 4, y + h - 12], [doorX + 20, y + h - 12],
      [doorX + 12, y + h - 18],
    ];
    for (const [rx, ry] of rivetPos) {
      g.circle(rx, ry, 2).fill({ color: 0x555555 });
      g.circle(rx - 0.4, ry - 0.4, 0.8).fill({ color: 0x666666, alpha: 0.5 });
    }
    // Lock
    g.rect(doorX + 10, y + h - 10, 4, 4).fill({ color: 0x444444 });
    g.circle(doorX + 12, y + h - 8, 0.8).fill({ color: 0x222222 });

    // Guard post with roof
    g.rect(x + w + 5, y + h - 30, 15, 30).fill({ color: 0x555555 });
    g.rect(x + w + 5, y + h - 30, 15, 30).stroke({ color: 0x444444, width: 0.5 });
    g.rect(x + w + 3, y + h - 35, 19, 5).fill({ color: 0x444444 });
    // Guard post window
    g.rect(x + w + 8, y + h - 25, 6, 6).fill({ color: 0x333333 });
    // Torch on guard post
    g.rect(x + w + 20, y + h - 20, 2, 10).fill({ color: 0x6B4226 });
    g.circle(x + w + 21, y + h - 22, 3).fill({ color: 0xFF8833, alpha: 0.5 });

    // Chains on exterior wall (decorative)
    g.moveTo(x + 8, y + h * 0.35).lineTo(x + 8, y + h * 0.55).stroke({ color: 0x555555, width: 1 });
    g.moveTo(x + 8, y + h * 0.4).lineTo(x + 12, y + h * 0.4).stroke({ color: 0x555555, width: 1 });
    g.moveTo(x + 8, y + h * 0.5).lineTo(x + 12, y + h * 0.5).stroke({ color: 0x555555, width: 1 });

    if (b.label) {
      const label = new Text({
        text: b.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x888888 }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x + w / 2, y - 10);
      this.buildingLayer.addChild(label);
    }
  }

  // ---- House Large ----
  private drawHouseLarge(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    // Shadow
    g.rect(x + 4, y + 4, w, h).fill({ color: 0x222222, alpha: 0.25 });
    // Stone base
    g.rect(x, y + h - 6, w, 6).fill({ color: 0x706050 });
    // Main walls - plastered stone
    g.rect(x, y, w, h).fill({ color: 0x9A8A70 });
    g.rect(x, y, w, h).stroke({ color: 0x706050, width: 2 });
    // Timber frame overlay
    g.rect(x, y, w, 3).fill({ color: 0x5C3A1E });
    g.rect(x, y + h / 2, w, 3).fill({ color: 0x5C3A1E });
    g.rect(x, y, 3, h).fill({ color: 0x5C3A1E });
    g.rect(x + w - 3, y, 3, h).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 1, y, 2, h).fill({ color: 0x5C3A1E });
    // Peaked roof with slate tiles
    g.poly([x - 6, y, x + w / 2, y - 22, x + w + 6, y]).fill({ color: 0x5A4A3A });
    g.poly([x - 6, y, x + w / 2, y - 22, x + w + 6, y]).stroke({ color: 0x4A3A2A, width: 1 });
    // Roof tile lines
    for (let ry = y - 18; ry < y; ry += 5) {
      const ratio = (y - ry) / 22;
      const halfW = (w / 2 + 6) * (1 - ratio);
      g.moveTo(x + w / 2 - halfW, ry).lineTo(x + w / 2 + halfW, ry).stroke({ color: 0x4A3A2A, width: 0.5, alpha: 0.4 });
    }
    // Chimney
    g.rect(x + w - 20, y - 18, 10, 18).fill({ color: 0x665544 });
    g.rect(x + w - 21, y - 20, 12, 3).fill({ color: 0x554433 });
    // Windows with shutters (2 upstairs, 2 downstairs)
    for (let wi = 0; wi < 2; wi++) {
      const wx = x + 12 + wi * (w - 34);
      // Window frame
      g.rect(wx - 1, y + 9, 12, 14).fill({ color: 0x5C3A1E });
      // Glass
      g.rect(wx, y + 10, 10, 12).fill({ color: 0x334455, alpha: 0.7 });
      // Window cross
      g.moveTo(wx + 5, y + 10).lineTo(wx + 5, y + 22).stroke({ color: 0x5C3A1E, width: 1 });
      g.moveTo(wx, y + 16).lineTo(wx + 10, y + 16).stroke({ color: 0x5C3A1E, width: 1 });
      // Shutters
      g.rect(wx - 4, y + 10, 4, 12).fill({ color: 0x4A6644 });
      g.rect(wx + 10, y + 10, 4, 12).fill({ color: 0x4A6644 });
      // Lower windows
      g.rect(wx - 1, y + h * 0.5 - 1, 12, 14).fill({ color: 0x5C3A1E });
      g.rect(wx, y + h * 0.5, 10, 12).fill({ color: 0x334455, alpha: 0.7 });
      g.moveTo(wx + 5, y + h * 0.5).lineTo(wx + 5, y + h * 0.5 + 12).stroke({ color: 0x5C3A1E, width: 1 });
      g.moveTo(wx, y + h * 0.5 + 6).lineTo(wx + 10, y + h * 0.5 + 6).stroke({ color: 0x5C3A1E, width: 1 });
    }
    // Door with frame and arch
    const doorX = x + w / 2 - 9;
    g.roundRect(doorX - 2, y + h - 22, 22, 22, 2).fill({ color: 0x5C3A1E });
    g.rect(doorX, y + h - 20, 18, 20).fill({ color: 0x4A2810 });
    // Door planks
    g.moveTo(doorX + 6, y + h - 20).lineTo(doorX + 6, y + h).stroke({ color: 0x3A1800, width: 0.5 });
    g.moveTo(doorX + 12, y + h - 20).lineTo(doorX + 12, y + h).stroke({ color: 0x3A1800, width: 0.5 });
    // Door handle
    g.circle(doorX + 14, y + h - 10, 1.8).fill({ color: 0x888888 });
    // Step
    g.rect(doorX - 2, y + h, 22, 3).fill({ color: 0x808070 });
  }

  // ---- House Medium ----
  private drawHouseMedium(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 3, y + 3, w, h).fill({ color: 0x222222, alpha: 0.2 });
    // Timber-framed with plaster infill
    g.rect(x, y, w, h).fill({ color: 0xDDCCAA });
    // Timber frame beams
    g.rect(x, y, w, 3).fill({ color: 0x5C3A1E });
    g.rect(x, y + h - 3, w, 3).fill({ color: 0x5C3A1E });
    g.rect(x, y, 3, h).fill({ color: 0x5C3A1E });
    g.rect(x + w - 3, y, 3, h).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 1, y, 2, h).fill({ color: 0x5C3A1E });
    // Diagonal cross-bracing
    g.moveTo(x + 3, y + 3).lineTo(x + w / 2 - 1, y + h - 3).stroke({ color: 0x5C3A1E, width: 1.5 });
    g.moveTo(x + w / 2 + 1, y + 3).lineTo(x + w - 3, y + h - 3).stroke({ color: 0x5C3A1E, width: 1.5 });
    // Peaked roof with thatch texture
    g.poly([x - 4, y, x + w / 2, y - 16, x + w + 4, y]).fill({ color: 0x7A5030 });
    g.poly([x - 4, y, x + w / 2, y - 16, x + w + 4, y]).stroke({ color: 0x6A4020, width: 0.5 });
    // Thatch lines
    for (let rx = x; rx < x + w / 2; rx += 3) {
      const ratio = (rx - x) / (w / 2);
      const ry = y - 16 * ratio;
      g.moveTo(rx, y).lineTo(rx + 1, ry + 2).stroke({ color: 0x8A6040, width: 0.7, alpha: 0.3 });
    }
    // Chimney
    g.rect(x + w - 15, y - 12, 8, 12).fill({ color: 0x665544 });
    // Window with shutters
    g.rect(x + w / 2 - 6, y + 8, 12, 12).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 5, y + 9, 10, 10).fill({ color: 0x334455, alpha: 0.6 });
    g.moveTo(x + w / 2, y + 9).lineTo(x + w / 2, y + 19).stroke({ color: 0x5C3A1E, width: 0.8 });
    g.moveTo(x + w / 2 - 5, y + 14).lineTo(x + w / 2 + 5, y + 14).stroke({ color: 0x5C3A1E, width: 0.8 });
    // Shutters
    g.rect(x + w / 2 - 9, y + 9, 4, 10).fill({ color: 0x5A7050 });
    g.rect(x + w / 2 + 5, y + 9, 4, 10).fill({ color: 0x5A7050 });
    // Door with frame
    g.rect(x + w / 2 - 7, y + h - 18, 14, 18).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 7, y + h - 18, 14, 18).stroke({ color: 0x4A2810, width: 0.8 });
    // Door handle
    g.circle(x + w / 2 + 3, y + h - 9, 1.2).fill({ color: 0x888888 });
    // Step
    g.rect(x + w / 2 - 7, y + h, 14, 2).fill({ color: 0x808070 });
  }

  // ---- House Small ----
  private drawHouseSmall(g: Graphics, b: GTABuilding): void {
    const { x, y, w, h } = b;
    g.rect(x + 2, y + 2, w, h).fill({ color: 0x222222, alpha: 0.15 });
    // Wattle-and-daub walls
    g.rect(x, y, w, h).fill({ color: 0xAA9970 });
    g.rect(x, y, w, h).stroke({ color: 0x706050, width: 1 });
    // Timber frame
    g.rect(x, y, w, 2).fill({ color: 0x5C3A1E });
    g.rect(x, y, 2, h).fill({ color: 0x5C3A1E });
    g.rect(x + w - 2, y, 2, h).fill({ color: 0x5C3A1E });
    // Thatched roof (golden-brown with texture)
    g.poly([x - 5, y, x + w / 2, y - 14, x + w + 5, y]).fill({ color: 0xBBA855 });
    g.poly([x - 5, y, x + w / 2, y - 14, x + w + 5, y]).stroke({ color: 0xAA9845, width: 0.5 });
    // Roof thatch lines
    for (let rx = x - 2; rx < x + w / 2; rx += 3) {
      const ry = y - 14 * (1 - (rx - x) / (w / 2));
      g.moveTo(rx, y).lineTo(rx + 1.5, ry + 2).stroke({ color: 0x998844, width: 0.8, alpha: 0.4 });
    }
    for (let rx = x + w / 2; rx < x + w + 3; rx += 3) {
      const ry = y - 14 * ((rx - x - w / 2) / (w / 2));
      g.moveTo(rx, y).lineTo(rx - 1.5, y - 14 + ry + 2).stroke({ color: 0x998844, width: 0.8, alpha: 0.4 });
    }
    // Tiny window with frame
    g.rect(x + w / 2 - 5, y + 7, 10, 9).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 4, y + 8, 8, 7).fill({ color: 0x334455, alpha: 0.5 });
    // Window cross
    g.moveTo(x + w / 2, y + 8).lineTo(x + w / 2, y + 15).stroke({ color: 0x5C3A1E, width: 0.7 });
    // Door with rounded top
    g.rect(x + w / 2 - 5, y + h - 15, 10, 15).fill({ color: 0x5C3A1E });
    g.rect(x + w / 2 - 5, y + h - 15, 10, 15).stroke({ color: 0x4A2810, width: 0.5 });
    // Handle
    g.circle(x + w / 2 + 2, y + h - 8, 1).fill({ color: 0x777777 });
  }

  // ---- Fountain ----
  private drawFountain(g: Graphics, b: GTABuilding): void {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    // Ground shadow
    g.ellipse(cx + 2, cy + 2, 27, 27).fill({ color: 0x000000, alpha: 0.15 });
    // Outer basin - stone rim
    g.circle(cx, cy, 26).fill({ color: 0x888880 });
    g.circle(cx, cy, 26).stroke({ color: 0x666660, width: 3 });
    // Stone rim detail
    g.circle(cx, cy, 24).stroke({ color: 0x777770, width: 1, alpha: 0.5 });
    // Water with reflective shimmer
    g.circle(cx, cy, 22).fill({ color: 0x4488BB, alpha: 0.55 });
    g.circle(cx, cy, 22).stroke({ color: 0x3377AA, width: 0.5 });
    // Water ripple rings
    g.circle(cx, cy, 16).stroke({ color: 0x66AACC, width: 0.5, alpha: 0.3 });
    g.circle(cx, cy, 11).stroke({ color: 0x66AACC, width: 0.5, alpha: 0.2 });
    // Inner pedestal - tiered
    g.circle(cx, cy, 9).fill({ color: 0x999990 });
    g.circle(cx, cy, 9).stroke({ color: 0x777770, width: 1 });
    g.circle(cx, cy, 6).fill({ color: 0xAAAAA0 });
    // Statue/spout on top
    g.rect(cx - 2, cy - 12, 4, 8).fill({ color: 0x888880 });
    g.circle(cx, cy - 13, 3).fill({ color: 0x999990 });
    // Water spray lines (multiple directions)
    g.moveTo(cx, cy - 10).lineTo(cx - 5, cy - 20).stroke({ color: 0x88BBDD, width: 1, alpha: 0.4 });
    g.moveTo(cx, cy - 10).lineTo(cx + 5, cy - 20).stroke({ color: 0x88BBDD, width: 1, alpha: 0.4 });
    g.moveTo(cx, cy - 10).lineTo(cx, cy - 22).stroke({ color: 0x88BBDD, width: 1.2, alpha: 0.5 });
    g.moveTo(cx, cy - 10).lineTo(cx - 8, cy - 16).stroke({ color: 0x88BBDD, width: 0.8, alpha: 0.3 });
    g.moveTo(cx, cy - 10).lineTo(cx + 8, cy - 16).stroke({ color: 0x88BBDD, width: 0.8, alpha: 0.3 });
    // Falling water droplets
    g.circle(cx - 6, cy - 14, 1).fill({ color: 0xAADDFF, alpha: 0.4 });
    g.circle(cx + 4, cy - 16, 1).fill({ color: 0xAADDFF, alpha: 0.4 });
    g.circle(cx - 2, cy - 18, 0.8).fill({ color: 0xAADDFF, alpha: 0.3 });
    // Light sparkles on water
    g.circle(cx - 8, cy - 4, 1.5).fill({ color: 0xCCEEFF, alpha: 0.5 });
    g.circle(cx + 10, cy + 2, 1.5).fill({ color: 0xCCEEFF, alpha: 0.5 });
    g.circle(cx + 3, cy + 8, 1).fill({ color: 0xCCEEFF, alpha: 0.4 });
    g.circle(cx - 12, cy + 5, 1).fill({ color: 0xCCEEFF, alpha: 0.35 });
    // Decorative stones around base
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      g.circle(cx + Math.cos(a) * 25, cy + Math.sin(a) * 25, 2).fill({ color: 0x777770, alpha: 0.5 });
    }
  }

  // ---- Well ----
  private drawWell(g: Graphics, b: GTABuilding): void {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    // Shadow
    g.ellipse(cx + 1, cy + 2, 14, 10).fill({ color: 0x000000, alpha: 0.2 });
    // Stone rim (outer)
    g.circle(cx, cy, 13).fill({ color: 0x888880 });
    g.circle(cx, cy, 13).stroke({ color: 0x666660, width: 1.5 });
    // Stone texture — individual stones around rim
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.circle(cx + Math.cos(a) * 10.5, cy + Math.sin(a) * 10.5, 2.5).fill({ color: 0x999990, alpha: 0.5 });
      g.circle(cx + Math.cos(a) * 10.5, cy + Math.sin(a) * 10.5, 2.5).stroke({ color: 0x777770, width: 0.5 });
    }
    // Inner rim
    g.circle(cx, cy, 9).fill({ color: 0x666660 });
    g.circle(cx, cy, 9).stroke({ color: 0x555550, width: 1 });
    // Water surface
    g.circle(cx, cy, 7).fill({ color: 0x223344 });
    g.circle(cx, cy + 1, 4).fill({ color: 0x334455, alpha: 0.3 }); // reflection highlight
    // Wooden frame posts
    g.rect(cx - 14, cy - 2.5, 28, 3).fill({ color: 0x6B4226 });
    g.rect(cx - 14, cy - 2.5, 28, 3).stroke({ color: 0x5A3520, width: 0.5 });
    // Vertical posts
    g.rect(cx - 14, cy - 14, 2.5, 12).fill({ color: 0x6B4226 });
    g.rect(cx + 12, cy - 14, 2.5, 12).fill({ color: 0x6B4226 });
    // Roof beam
    g.rect(cx - 15, cy - 15, 30, 2).fill({ color: 0x7B5230 });
    // Bucket rope
    g.moveTo(cx, cy - 14).lineTo(cx, cy - 4).stroke({ color: 0x887766, width: 1 });
    // Bucket
    g.rect(cx - 2, cy - 5, 4, 3).fill({ color: 0x6B4226 });
    g.rect(cx - 2, cy - 5, 4, 3).stroke({ color: 0x5A3520, width: 0.5 });
    // Crank handle
    g.moveTo(cx + 13, cy - 13).lineTo(cx + 17, cy - 16).stroke({ color: 0x5A3520, width: 1.5 });
  }

  // ---- Tree Cluster ----
  private drawTreeCluster(g: Graphics, b: GTABuilding): void {
    const rng = mulberry32(b.x * 13 + b.y * 7);
    for (let t = 0; t < 3; t++) {
      const tx = b.x + 8 + rng() * (b.w - 16);
      const ty = b.y + 8 + rng() * (b.h - 16);
      const r = 8 + rng() * 6;
      g.circle(tx + 2, ty + r * 0.6, r * 0.6).fill({ color: 0x1a3a10, alpha: 0.3 });
      g.rect(tx - 1, ty + 2, 3, r * 0.5).fill({ color: 0x5C3A1E });
      g.circle(tx, ty, r).fill({ color: 0x2d6b24 });
      g.circle(tx - r * 0.2, ty - r * 0.2, r * 0.4).fill({ color: 0x3d8a38, alpha: 0.6 });
    }
  }

  // ---- Cart ----
  private drawCart(g: Graphics, b: GTABuilding): void {
    // Shadow
    g.ellipse(b.x + b.w / 2, b.y + b.h + 2, b.w / 2 + 3, 4).fill({ color: 0x000000, alpha: 0.15 });
    // Cart bed
    g.rect(b.x, b.y, b.w, b.h).fill({ color: 0x8B6914 });
    g.rect(b.x, b.y, b.w, b.h).stroke({ color: 0x6B4226, width: 1 });
    // Plank lines across the bed
    for (let p = 1; p < 4; p++) {
      g.moveTo(b.x + p * b.w / 4, b.y).lineTo(b.x + p * b.w / 4, b.y + b.h).stroke({ color: 0x7A5818, width: 0.5 });
    }
    // Side rails
    g.rect(b.x, b.y - 2, b.w, 2).fill({ color: 0x7A5818 });
    g.rect(b.x, b.y + b.h, b.w, 2).fill({ color: 0x7A5818 });
    // Wheels with spokes
    for (const wx of [b.x + 4, b.x + b.w - 4]) {
      const wy = b.y + b.h + 1;
      // Wheel rim
      g.circle(wx, wy, 5).stroke({ color: 0x5C3A1E, width: 2 });
      // Hub
      g.circle(wx, wy, 1.5).fill({ color: 0x5C3A1E });
      // Spokes
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2;
        g.moveTo(wx, wy).lineTo(wx + Math.cos(sa) * 4, wy + Math.sin(sa) * 4).stroke({ color: 0x5C3A1E, width: 0.8 });
      }
    }
    // Axle between wheels
    g.moveTo(b.x + 4, b.y + b.h + 1).lineTo(b.x + b.w - 4, b.y + b.h + 1).stroke({ color: 0x4A2A10, width: 1.5 });
    // Handle/shafts (two parallel bars)
    g.moveTo(b.x + b.w, b.y + b.h * 0.3).lineTo(b.x + b.w + 12, b.y + b.h * 0.3 + 3).stroke({ color: 0x6B4226, width: 1.5 });
    g.moveTo(b.x + b.w, b.y + b.h * 0.7).lineTo(b.x + b.w + 12, b.y + b.h * 0.7 + 3).stroke({ color: 0x6B4226, width: 1.5 });
    // Cross-bar at end of handle
    g.moveTo(b.x + b.w + 11, b.y + b.h * 0.3 + 2).lineTo(b.x + b.w + 11, b.y + b.h * 0.7 + 4).stroke({ color: 0x6B4226, width: 1.5 });
  }

  // ---- Hay Bale ----
  private drawHayBale(g: Graphics, b: GTABuilding): void {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    // Shadow
    g.ellipse(cx + 1, cy + 2, b.w / 2 + 1, b.h / 2 - 1).fill({ color: 0x000000, alpha: 0.15 });
    // Main bale body
    g.ellipse(cx, cy, b.w / 2, b.h / 2).fill({ color: 0xCCBB55 });
    // Shading — darker bottom half
    g.ellipse(cx, cy + b.h * 0.15, b.w / 2 - 1, b.h / 2 - 2).fill({ color: 0xBBAA44, alpha: 0.4 });
    // Highlight — lighter top
    g.ellipse(cx - b.w * 0.1, cy - b.h * 0.15, b.w / 3, b.h / 4).fill({ color: 0xDDCC66, alpha: 0.3 });
    g.ellipse(cx, cy, b.w / 2, b.h / 2).stroke({ color: 0xAA9944, width: 1 });
    // Binding straps (2 horizontal bands)
    g.moveTo(b.x + 2, cy - b.h * 0.15).lineTo(b.x + b.w - 2, cy - b.h * 0.15).stroke({ color: 0x886633, width: 1.5 });
    g.moveTo(b.x + 2, cy + b.h * 0.15).lineTo(b.x + b.w - 2, cy + b.h * 0.15).stroke({ color: 0x886633, width: 1.5 });
    // Straw texture lines (multiple wispy lines)
    for (let s = 0; s < 5; s++) {
      const sy = cy - b.h * 0.3 + s * b.h * 0.15;
      const sx = b.x + 3 + s * 2;
      g.moveTo(sx, sy).lineTo(sx + b.w * 0.4, sy + (s % 2 === 0 ? 1 : -1)).stroke({ color: 0xBBAA44, width: 0.5, alpha: 0.6 });
    }
    // Loose straw strands poking out
    g.moveTo(b.x + b.w - 1, cy - 2).lineTo(b.x + b.w + 4, cy - 4).stroke({ color: 0xCCBB55, width: 0.8 });
    g.moveTo(b.x + b.w - 1, cy + 1).lineTo(b.x + b.w + 3, cy + 3).stroke({ color: 0xCCBB55, width: 0.8 });
    g.moveTo(b.x + 1, cy).lineTo(b.x - 3, cy - 2).stroke({ color: 0xCCBB55, width: 0.8 });
  }

  // ---- Farm Field ----
  private drawFarmField(g: Graphics, b: GTABuilding): void {
    // Tilled soil base
    g.rect(b.x, b.y, b.w, b.h).fill({ color: 0x8B7355, alpha: 0.4 });
    g.rect(b.x, b.y, b.w, b.h).stroke({ color: 0x6B5335, width: 0.5, alpha: 0.3 });
    const rowH = b.h / 8;
    const colors = [0x6B8E23, 0x7B9C33];
    for (let r = 0; r < 8; r++) {
      // Soil furrow (dark line)
      g.rect(b.x + 2, b.y + r * rowH, b.w - 4, 1).fill({ color: 0x5A4A30, alpha: 0.4 });
      // Crop row
      g.rect(b.x + 3, b.y + r * rowH + 2, b.w - 6, rowH - 3).fill({ color: colors[r % 2], alpha: 0.6 });
      // Individual crop tufts along the row
      const tufts = Math.floor(b.w / 8);
      for (let t = 0; t < tufts; t++) {
        const tx = b.x + 5 + t * (b.w - 10) / tufts;
        const ty = b.y + r * rowH + rowH * 0.4;
        g.circle(tx, ty, 1.5 + (t + r) % 2).fill({ color: colors[(r + t) % 2], alpha: 0.4 });
      }
    }
    // Fence posts on two sides
    for (let f = 0; f < 3; f++) {
      const fy = b.y + f * b.h / 2;
      g.rect(b.x - 1, fy, 1.5, 4).fill({ color: 0x6B4226, alpha: 0.5 });
      g.rect(b.x + b.w - 0.5, fy, 1.5, 4).fill({ color: 0x6B4226, alpha: 0.5 });
    }
    // Fence rail
    g.moveTo(b.x - 0.5, b.y + 2).lineTo(b.x - 0.5, b.y + b.h - 2).stroke({ color: 0x6B4226, width: 0.5, alpha: 0.4 });
  }

  // ---- Farmhouse ----
  private drawFarmhouse(g: Graphics, b: GTABuilding): void {
    // Shadow
    g.rect(b.x + 2, b.y + 2, b.w, b.h).fill({ color: 0x000000, alpha: 0.12 });
    // Walls
    g.rect(b.x, b.y, b.w, b.h).fill({ color: 0x8B6914 });
    g.rect(b.x, b.y, b.w, b.h).stroke({ color: 0x7A5810, width: 0.8 });
    // Wall planks (horizontal lines)
    for (let p = 1; p < 4; p++) {
      g.moveTo(b.x, b.y + p * b.h / 4).lineTo(b.x + b.w, b.y + p * b.h / 4).stroke({ color: 0x7A5810, width: 0.5, alpha: 0.4 });
    }
    // Roof with overhang
    g.poly([b.x - 4, b.y, b.x + b.w / 2, b.y - 14, b.x + b.w + 4, b.y]).fill({ color: 0xA08050 });
    g.poly([b.x - 4, b.y, b.x + b.w / 2, b.y - 14, b.x + b.w + 4, b.y]).stroke({ color: 0x8A7040, width: 0.5 });
    // Thatch lines on roof
    g.moveTo(b.x + 2, b.y - 3).lineTo(b.x + b.w / 2, b.y - 11).stroke({ color: 0x907040, width: 0.5, alpha: 0.5 });
    g.moveTo(b.x + b.w - 2, b.y - 3).lineTo(b.x + b.w / 2, b.y - 11).stroke({ color: 0x907040, width: 0.5, alpha: 0.5 });
    // Ridge line
    g.moveTo(b.x + b.w / 2 - 3, b.y - 13).lineTo(b.x + b.w / 2 + 3, b.y - 13).stroke({ color: 0x906840, width: 1 });
    // Door
    g.rect(b.x + b.w / 2 - 5, b.y + b.h - 13, 10, 13).fill({ color: 0x4A2810 });
    g.rect(b.x + b.w / 2 - 5, b.y + b.h - 13, 10, 13).stroke({ color: 0x3A1E0A, width: 0.5 });
    // Door handle
    g.circle(b.x + b.w / 2 + 3, b.y + b.h - 7, 1).fill({ color: 0xAA8844 });
    // Door plank line
    g.moveTo(b.x + b.w / 2, b.y + b.h - 12).lineTo(b.x + b.w / 2, b.y + b.h).stroke({ color: 0x3A1E0A, width: 0.3 });
    // Window
    g.rect(b.x + 3, b.y + 3, 6, 5).fill({ color: 0x334455 });
    g.rect(b.x + 3, b.y + 3, 6, 5).stroke({ color: 0x6B4226, width: 0.8 });
    // Window cross-bar
    g.moveTo(b.x + 6, b.y + 3).lineTo(b.x + 6, b.y + 8).stroke({ color: 0x6B4226, width: 0.5 });
    g.moveTo(b.x + 3, b.y + 5.5).lineTo(b.x + 9, b.y + 5.5).stroke({ color: 0x6B4226, width: 0.5 });
    // Chimney (if wide enough)
    if (b.w > 20) {
      g.rect(b.x + b.w - 8, b.y - 12, 4, 8).fill({ color: 0x777770 });
      g.rect(b.x + b.w - 8, b.y - 12, 4, 8).stroke({ color: 0x666660, width: 0.5 });
    }
  }

  // ---- Mill ----
  private drawMill(g: Graphics, b: GTABuilding): void {
    // Shadow
    g.rect(b.x + 2, b.y + 2, b.w, b.h).fill({ color: 0x000000, alpha: 0.12 });
    // Stone base
    g.rect(b.x, b.y, b.w, b.h).fill({ color: 0x9A8060 });
    g.rect(b.x, b.y, b.w, b.h).stroke({ color: 0x7A6040, width: 0.8 });
    // Stone texture lines
    for (let p = 1; p < 3; p++) {
      g.moveTo(b.x, b.y + p * b.h / 3).lineTo(b.x + b.w, b.y + p * b.h / 3).stroke({ color: 0x8A7050, width: 0.5, alpha: 0.4 });
    }
    // Roof
    g.poly([b.x - 4, b.y, b.x + b.w / 2, b.y - 20, b.x + b.w + 4, b.y]).fill({ color: 0x705030 });
    g.poly([b.x - 4, b.y, b.x + b.w / 2, b.y - 20, b.x + b.w + 4, b.y]).stroke({ color: 0x604020, width: 0.5 });
    // Thatch lines
    g.moveTo(b.x + 3, b.y - 4).lineTo(b.x + b.w / 2, b.y - 17).stroke({ color: 0x806040, width: 0.5, alpha: 0.4 });
    g.moveTo(b.x + b.w - 3, b.y - 4).lineTo(b.x + b.w / 2, b.y - 17).stroke({ color: 0x806040, width: 0.5, alpha: 0.4 });
    // Windmill hub
    const cx = b.x + b.w / 2, cy = b.y - 12;
    g.circle(cx, cy, 3).fill({ color: 0x5C3A1E });
    g.circle(cx, cy, 3).stroke({ color: 0x4A2A10, width: 1 });
    // Windmill blades (4) with sail panels
    for (let bl = 0; bl < 4; bl++) {
      const ba = (bl / 4) * Math.PI * 2;
      const bx2 = cx + Math.cos(ba) * 24;
      const by2 = cy + Math.sin(ba) * 24;
      // Main arm
      g.moveTo(cx, cy).lineTo(bx2, by2).stroke({ color: 0x5C3A1E, width: 2.5 });
      // Sail panel (offset to one side of the arm)
      const perpX = Math.cos(ba + Math.PI / 2) * 5;
      const perpY = Math.sin(ba + Math.PI / 2) * 5;
      const midX = cx + Math.cos(ba) * 12;
      const midY = cy + Math.sin(ba) * 12;
      g.poly([
        midX, midY,
        midX + perpX, midY + perpY,
        bx2 + perpX * 0.6, by2 + perpY * 0.6,
        bx2, by2,
      ]).fill({ color: 0xCCBBAA, alpha: 0.5 });
      g.poly([
        midX, midY,
        midX + perpX, midY + perpY,
        bx2 + perpX * 0.6, by2 + perpY * 0.6,
        bx2, by2,
      ]).stroke({ color: 0x5C3A1E, width: 0.5, alpha: 0.4 });
    }
    // Door
    g.rect(b.x + b.w / 2 - 4, b.y + b.h - 10, 8, 10).fill({ color: 0x4A2810 });
    g.rect(b.x + b.w / 2 - 4, b.y + b.h - 10, 8, 10).stroke({ color: 0x3A1E0A, width: 0.5 });
    // Window
    g.rect(b.x + 3, b.y + 3, 5, 4).fill({ color: 0x334455 });
    g.rect(b.x + 3, b.y + 3, 5, 4).stroke({ color: 0x6B4226, width: 0.5 });
  }

  // ===================== UPDATE =====================
  update(state: MedievalGTAState, _screenW: number, _screenH: number): void {
    // Camera transform is handled by the parent GTA world container

    // Draw buildings (only on first call or if buildings change)
    if (this.buildingLayer.children.length === 0 && state.buildings.length > 0) {
      this.drawBuildings(state.buildings);
    }

    // Chimney smoke animation
    this.updateChimneySmoke(state);

    // Day/Night overlay
    this.updateDayNight(state);

    // Particles
    this.updateParticles(state.particles);
  }

  private updateChimneySmoke(state: MedievalGTAState): void {
    const g = this.chimneySmoke;
    g.clear();

    const tick = state.tick;

    // Chimney positions (building chimneys)
    const chimneys = [
      // Tavern chimney
      { x: 2570, y: 1180 },
      // Blacksmith chimney (with extra fire glow)
      { x: 1178, y: 1180, fireGlow: true },
      // Large houses
      { x: 1490, y: 982 },
      { x: 2640, y: 882 },
      // Medium houses
      { x: 1655, y: 1688 },
      { x: 1905, y: 1738 },
      { x: 2155, y: 1688 },
      // Small houses
      { x: 1345, y: 1486 },
      { x: 1195, y: 1086 },
    ];

    for (const ch of chimneys) {
      // Animated smoke puffs rising
      for (let i = 0; i < 4; i++) {
        const phase = (tick * 0.03 + i * 1.5 + ch.x * 0.01) % 6;
        const smokeX = ch.x + Math.sin(tick * 0.02 + i * 2 + ch.y * 0.01) * 4;
        const smokeY = ch.y - 20 - phase * 8;
        const smokeSize = 2 + phase * 1.2;
        const smokeAlpha = Math.max(0, 0.25 - phase * 0.04);
        g.circle(smokeX, smokeY, smokeSize).fill({ color: 0x888888, alpha: smokeAlpha });
      }

      // Fire glow for blacksmith
      if (ch.fireGlow) {
        const flickerAlpha = 0.25 + Math.sin(tick * 0.15) * 0.1;
        g.circle(ch.x, ch.y - 2, 8).fill({ color: 0xFF4400, alpha: flickerAlpha });
        g.circle(ch.x, ch.y - 4, 5).fill({ color: 0xFF6600, alpha: flickerAlpha * 1.2 });
      }
    }

    // Torch flames at night
    const dt = state.dayTime;
    let darkness: number;
    if (dt <= 0.25) { darkness = 0.5 * (1 - dt / 0.25); }
    else if (dt <= 0.5) { darkness = 0.5 * ((dt - 0.25) / 0.25); }
    else if (dt <= 0.75) { darkness = 0.5 + 0.15 * ((dt - 0.5) / 0.25); }
    else { darkness = 0.65 * (1 - (dt - 0.75) / 0.25); }

    if (darkness > 0.1) {
      const torchPositions = [
        { x: 1925, y: 700 }, { x: 1975, y: 700 },
        { x: 1925, y: 1000 }, { x: 1975, y: 1000 },
        { x: 1925, y: 1200 }, { x: 1975, y: 1200 },
        { x: 1925, y: 1600 }, { x: 1975, y: 1600 },
        { x: 1925, y: 1900 }, { x: 1975, y: 1900 },
        { x: 1925, y: 2200 }, { x: 1975, y: 2200 },
        { x: 1100, y: 1380 }, { x: 1400, y: 1380 },
        { x: 1700, y: 1380 }, { x: 2200, y: 1380 },
        { x: 2500, y: 1380 }, { x: 2800, y: 1380 },
      ];
      const torchAlpha = Math.min(1, (darkness - 0.1) * 3);
      for (const tp of torchPositions) {
        const flicker = Math.sin(tick * 0.2 + tp.x * 0.1) * 0.15;
        // Warm glow
        g.circle(tp.x, tp.y - 10, 12).fill({ color: 0xFF8800, alpha: (0.15 + flicker) * torchAlpha });
        g.circle(tp.x, tp.y - 10, 6).fill({ color: 0xFFAA22, alpha: (0.3 + flicker) * torchAlpha });
        // Flame
        g.circle(tp.x, tp.y - 10, 3).fill({ color: 0xFFDD44, alpha: (0.5 + flicker) * torchAlpha });
      }
    }
  }

  private updateDayNight(state: MedievalGTAState): void {
    const g = this.dayNightOverlay;
    g.clear();

    // dayTime: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
    const dt = state.dayTime;
    // Calculate darkness: 0 at noon (0.25), max at midnight (0.75)
    let darkness: number;
    let tintColor = 0x000033; // default blue night
    if (dt <= 0.25) {
      // dawn -> noon: fading darkness with warm tint
      darkness = 0.5 * (1 - dt / 0.25);
      // Dawn golden tint
      if (dt < 0.1) {
        tintColor = 0x332200; // warm golden dawn
      }
    } else if (dt <= 0.5) {
      // noon -> dusk: increasing darkness
      darkness = 0.5 * ((dt - 0.25) / 0.25);
      // Dusk warm tint
      if (dt > 0.4) {
        tintColor = 0x331100; // warm dusk
      }
    } else if (dt <= 0.75) {
      // dusk -> midnight: deepening
      darkness = 0.5 + 0.15 * ((dt - 0.5) / 0.25);
    } else {
      // midnight -> dawn: lightening
      darkness = 0.65 * (1 - (dt - 0.75) / 0.25);
    }

    if (darkness > 0.02) {
      g.rect(0, 0, WW, WH).fill({ color: tintColor, alpha: darkness });
    }

    // Subtle shadow layer from buildings during daytime (ambient occlusion)
    if (darkness < 0.2) {
      // Building shadow offset based on time of day (sun position)
      const sunAngle = dt * Math.PI * 2;
      const shadowOffX = Math.cos(sunAngle) * 8;
      const shadowOffY = Math.abs(Math.sin(sunAngle)) * 5 + 3;
      const shadowAlpha = 0.08 * (1 - darkness * 5);
      // Draw simple shadow rects for major buildings
      const majorBuildings = [
        { x: 850, y: 550, w: 450, h: 500 },   // Castle
        { x: 1400, y: 550, w: 500, h: 350 },   // Barracks
        { x: 2050, y: 550, w: 350, h: 350 },   // Church
        { x: 2200, y: 1200, w: 400, h: 300 },  // Tavern
        { x: 850, y: 1200, w: 350, h: 300 },   // Blacksmith
      ];
      for (const mb of majorBuildings) {
        g.rect(mb.x + shadowOffX, mb.y + shadowOffY, mb.w, mb.h).fill({ color: 0x000000, alpha: shadowAlpha });
      }
    }

    // Window lights at night
    const wl = this.windowLightsLayer;
    wl.clear();
    if (darkness > 0.15) {
      const lightAlpha = Math.min(1, (darkness - 0.15) * 3);
      const flicker = Math.sin(state.tick * 0.1) * 0.05;
      // Place warm yellow dots on known building positions
      const windowSpots = [
        // Tavern windows (prominent warm glow)
        { x: 2220, y: 1275, r: 5, glow: 12 },
        { x: 2260, y: 1275, r: 5, glow: 12 },
        { x: 2310, y: 1275, r: 5, glow: 12 },
        { x: 2400, y: 1340, r: 6, glow: 14 }, // Tavern door glow
        // Castle windows
        { x: 1060, y: 780, r: 4, glow: 8 },
        { x: 1100, y: 780, r: 4, glow: 8 },
        { x: 1075, y: 760, r: 3, glow: 6 },
        // Blacksmith forge glow
        { x: 865, y: 1260, r: 5, glow: 15 },
        // Church stained glass (colored)
        { x: 2180, y: 650, r: 3, glow: 6 },
        { x: 2210, y: 650, r: 3, glow: 6 },
        // Houses
        { x: 1380, y: 1015, r: 3, glow: 6 },
        { x: 1430, y: 1015, r: 3, glow: 6 },
        { x: 2530, y: 915, r: 3, glow: 6 },
        { x: 1580, y: 1720, r: 3, glow: 6 },
        { x: 1830, y: 1770, r: 3, glow: 6 },
        { x: 2080, y: 1720, r: 3, glow: 6 },
        { x: 2380, y: 1720, r: 3, glow: 6 },
        { x: 1330, y: 1515, r: 2, glow: 5 },
        { x: 1180, y: 1115, r: 2, glow: 5 },
        { x: 2730, y: 1215, r: 2, glow: 5 },
      ];
      for (const ws of windowSpots) {
        const r = ws.r ?? 4;
        const gr = ws.glow ?? 8;
        wl.circle(ws.x, ws.y, r).fill({ color: 0xFFDD44, alpha: (lightAlpha * 0.7 + flicker) });
        wl.circle(ws.x, ws.y, gr).fill({ color: 0xFFAA22, alpha: (lightAlpha * 0.15 + flicker * 0.5) });
      }
    }
  }

  private updateParticles(particles: GTAParticle[]): void {
    const g = this.particleGfx;
    g.clear();

    for (const p of particles) {
      if (p.life <= 0) continue;
      const alpha = Math.min(1, p.life / p.maxLife);
      g.circle(p.pos.x, p.pos.y, p.size).fill({ color: p.color, alpha });
    }
  }
}
