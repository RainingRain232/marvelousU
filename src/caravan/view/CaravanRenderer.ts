// ---------------------------------------------------------------------------
// Caravan renderer — rich procedural graphics: terrain, road, wagon,
// environment details, entities with shadows
// ---------------------------------------------------------------------------

import { Container, Graphics, AnimatedSprite, Text, TextStyle } from "pixi.js";
import { UnitType, UnitState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { animationManager } from "@view/animation/AnimationManager";
import type { CaravanState, CaravanEnemy, CaravanEscort } from "../state/CaravanState";
import type { BiomeDef } from "../config/CaravanBiomeDefs";

const TS = BalanceConfig.TILE_SIZE;

// ---------------------------------------------------------------------------
// Deterministic hash for procedural placement
// ---------------------------------------------------------------------------

function tileHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1103515245) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 0x100000000;
}

function colorShift(base: number, amount: number, hash: number): number {
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;
  const offset = Math.round((hash - 0.5) * 2 * amount);
  const clamp = (v: number) => Math.max(0, Math.min(255, v + offset));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

// ---------------------------------------------------------------------------
// View interfaces
// ---------------------------------------------------------------------------

interface EnemyView {
  container: Container;
  sprite: AnimatedSprite | null;
  shadow: Graphics;
  hpBar: Graphics;
  nameTag: Text | null;
  lastX: number;
  unitType: UnitType;
}

interface EscortView {
  container: Container;
  sprite: AnimatedSprite | null;
  shadow: Graphics;
  hpBar: Graphics;
  lastX: number;
  unitType: UnitType;
  isRanged: boolean;
}

// ---------------------------------------------------------------------------
// CaravanRenderer
// ---------------------------------------------------------------------------

export class CaravanRenderer {
  readonly worldLayer = new Container();

  // Layer order (back to front)
  readonly skyContainer = new Container();       // sky gradient, clouds
  readonly envBehindContainer = new Container(); // trees, rocks behind road
  readonly roadContainer = new Container();
  readonly envFrontContainer = new Container();  // grass tufts on road edges
  readonly shadowContainer = new Container();    // entity shadows
  readonly lootContainer = new Container();
  readonly escortContainer = new Container();
  readonly enemyContainer = new Container();
  readonly caravanContainer = new Container();
  readonly playerContainer = new Container();
  readonly dustContainer = new Container();      // dust particles
  readonly hazardContainer = new Container();   // biome hazard zones
  private _hazardGfx: Graphics | null = null;

  playerSprite: AnimatedSprite | null = null;
  private _playerShadow: Graphics | null = null;
  private _caravanGfx: Graphics | null = null;
  private _caravanFlag: Graphics | null = null;
  private _caravanShadow: Graphics | null = null;
  private _caravanHpBar: Graphics | null = null;
  private _caravanAnimGfx: Graphics | null = null; // horse legs + wheel rotation
  private _clouds: { gfx: Graphics; x: number; y: number; speed: number; w: number }[] = [];
  private _enemyViews = new Map<number, EnemyView>();
  private _escortViews = new Map<number, EscortView>();
  private _lootViews = new Map<number, { gfx: Graphics; sparkle: Graphics }>();
  private _dustParticles: { gfx: Graphics; x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];

  init(): void {
    this.worldLayer.removeChildren();
    this.skyContainer.removeChildren();
    this._clouds = [];
    this.envBehindContainer.removeChildren();
    this.roadContainer.removeChildren();
    this.envFrontContainer.removeChildren();
    this.shadowContainer.removeChildren();
    this.lootContainer.removeChildren();
    this.escortContainer.removeChildren();
    this.enemyContainer.removeChildren();
    this.caravanContainer.removeChildren();
    this.playerContainer.removeChildren();
    this.dustContainer.removeChildren();
    this.hazardContainer.removeChildren();
    this._hazardGfx = null;
    this._enemyViews.clear();
    this._escortViews.clear();
    this._lootViews.clear();
    this._dustParticles = [];

    this.worldLayer.addChild(this.skyContainer);
    this.worldLayer.addChild(this.envBehindContainer);
    this.worldLayer.addChild(this.roadContainer);
    this.worldLayer.addChild(this.envFrontContainer);
    this.worldLayer.addChild(this.shadowContainer);
    this.worldLayer.addChild(this.lootContainer);
    this.worldLayer.addChild(this.escortContainer);
    this.worldLayer.addChild(this.enemyContainer);
    this.worldLayer.addChild(this.caravanContainer);
    this.worldLayer.addChild(this.playerContainer);
    this.worldLayer.addChild(this.hazardContainer);
    this.worldLayer.addChild(this.dustContainer);
  }

  // ---------------------------------------------------------------------------
  // Road & environment
  // ---------------------------------------------------------------------------

  drawRoad(mapWidth: number, mapHeight: number, biome?: BiomeDef): void {
    this.roadContainer.removeChildren();
    this.envBehindContainer.removeChildren();
    this.envFrontContainer.removeChildren();

    // --- Draw sky background ---
    this._drawSky(mapWidth, mapHeight, biome);

    const roadCY = (mapHeight / 2) * TS;
    const roadH = 3 * TS;
    const roadTop = roadCY - roadH / 2;
    const totalW = mapWidth * TS;

    // --- Dirt road with texture (biome-aware colors) ---
    const roadCol = biome?.roadColor ?? 0x7A6544;
    const wornCol = biome?.roadWornColor ?? 0x8B7B5A;
    const road = new Graphics();
    road.rect(0, roadTop - 4, totalW, roadH + 8).fill({ color: colorShift(roadCol, 20, 0.3), alpha: 0.3 });
    road.rect(0, roadTop, totalW, roadH).fill({ color: roadCol });
    road.rect(0, roadCY - TS * 0.4, totalW, TS * 0.8).fill({ color: wornCol, alpha: 0.5 });

    // Road texture — procedural ruts, stones, patches
    for (let tx = 0; tx < mapWidth; tx++) {
      const h1 = tileHash(tx, 0, 42);
      const h2 = tileHash(tx, 0, 99);
      const h3 = tileHash(tx, 0, 171);

      // Wagon ruts (dark lines)
      if (h1 < 0.3) {
        const rutY = roadCY + (h2 - 0.5) * TS * 1.5;
        road.rect(tx * TS, rutY, TS * 0.8, 1.5).fill({ color: 0x4A3A24, alpha: 0.4 });
      }

      // Small stones embedded in road
      if (h2 > 0.75) {
        const stoneX = tx * TS + h1 * TS;
        const stoneY = roadTop + h3 * roadH;
        const stoneR = 2 + h1 * 3;
        const stoneColor = colorShift(0x888877, 20, h3);
        road.ellipse(stoneX, stoneY, stoneR, stoneR * 0.7).fill({ color: stoneColor, alpha: 0.5 });
      }

      // Dirt patches (slightly different color)
      if (h3 > 0.8) {
        const patchX = tx * TS + h2 * TS * 0.5;
        const patchY = roadTop + h1 * roadH;
        road.circle(patchX, patchY, 8 + h1 * 12).fill({ color: 0x6B5B3A, alpha: 0.25 });
      }
    }

    // Road edges — stone borders
    for (let tx = 0; tx < mapWidth; tx++) {
      const h = tileHash(tx, 1, 55);
      // Top edge stones
      const stoneW = 6 + h * 8;
      road.roundRect(tx * TS + h * 10, roadTop - 3, stoneW, 5, 2).fill({ color: colorShift(0x777766, 15, h) });
      // Bottom edge stones
      const h2 = tileHash(tx, 2, 55);
      road.roundRect(tx * TS + h2 * 10, roadTop + roadH - 2, 6 + h2 * 8, 5, 2).fill({ color: colorShift(0x777766, 15, h2) });
    }

    // Dashed center line (faded cart tracks)
    for (let x = 0; x < totalW; x += 50) {
      const h = tileHash(Math.floor(x / 50), 3, 77);
      if (h > 0.4) {
        road.rect(x, roadCY - 0.5, 25 + h * 15, 1).fill({ color: 0x5C4C34, alpha: 0.35 });
      }
    }

    this.roadContainer.addChild(road);

    // --- Environment: trees, bushes, rocks behind road ---
    // Puddles on road (subtle water reflections)
    for (let tx = 5; tx < mapWidth; tx += 10) {
      const ph = tileHash(tx, 600, 123);
      if (ph > 0.2) continue;
      const px = tx * TS + ph * TS * 5;
      const py = roadTop + roadH * 0.3 + ph * roadH * 0.4;
      const pr = 5 + ph * 10;
      road.ellipse(px, py, pr, pr * 0.4).fill({ color: 0x5577aa, alpha: 0.15 });
      road.ellipse(px - pr * 0.2, py - pr * 0.1, pr * 0.3, pr * 0.15)
        .fill({ color: 0xaaccee, alpha: 0.1 });
    }

    // --- Biome-specific road details ---
    const biomeId = biome?.id ?? "meadow";
    if (biomeId === "tundra") {
      // Snow drifts and ice patches
      for (let tx = 0; tx < mapWidth; tx += 3) {
        const sh2 = tileHash(tx, 700, 111);
        if (sh2 > 0.4) continue;
        const sx = tx * TS + sh2 * TS * 3;
        const sy = roadTop + sh2 * roadH;
        // Snow drift (white with blue tint)
        road.ellipse(sx, sy, 8 + sh2 * 12, 3 + sh2 * 4).fill({ color: 0xddeeff, alpha: 0.2 });
        // Ice patch (shiny)
        if (sh2 < 0.15) {
          road.ellipse(sx, sy, 6, 2.5).fill({ color: 0xaaddff, alpha: 0.12 });
          road.ellipse(sx - 2, sy - 1, 2, 1).fill({ color: 0xeeffff, alpha: 0.15 }); // glint
        }
      }
      // Snowflake sprinkle along edges
      for (let tx = 0; tx < mapWidth; tx += 2) {
        const sh3 = tileHash(tx, 701, 222);
        if (sh3 > 0.5) continue;
        const fx = tx * TS + sh3 * TS;
        const fy = sh3 > 0.25 ? roadTop - 2 - sh3 * 6 : roadTop + roadH + 2 + sh3 * 6;
        road.circle(fx, fy, 1 + sh3 * 1.5).fill({ color: 0xeeeeff, alpha: 0.3 });
      }
    } else if (biomeId === "volcanic") {
      // Lava cracks and ash patches
      for (let tx = 0; tx < mapWidth; tx += 4) {
        const lh = tileHash(tx, 710, 333);
        if (lh > 0.3) continue;
        const lx = tx * TS + lh * TS * 4;
        const ly = roadTop + lh * roadH;
        // Crack line (jagged)
        const crackLen = 10 + lh * 20;
        road.moveTo(lx, ly);
        road.lineTo(lx + crackLen * 0.3, ly + 3);
        road.lineTo(lx + crackLen * 0.6, ly - 2);
        road.lineTo(lx + crackLen, ly + 1);
        road.stroke({ color: 0x441100, width: 1.5, alpha: 0.5 });
        // Glow underneath crack
        road.moveTo(lx + 2, ly + 1);
        road.lineTo(lx + crackLen * 0.5, ly + 2);
        road.stroke({ color: 0xff4400, width: 0.8, alpha: 0.15 });
      }
      // Ash patches
      for (let tx = 0; tx < mapWidth; tx += 5) {
        const ah = tileHash(tx, 711, 444);
        if (ah > 0.35) continue;
        road.circle(tx * TS + ah * TS * 3, roadTop + ah * roadH, 6 + ah * 8)
          .fill({ color: 0x222211, alpha: 0.2 });
      }
    } else if (biomeId === "desert") {
      // Sand ripples
      for (let tx = 0; tx < mapWidth; tx += 2) {
        const dh = tileHash(tx, 720, 555);
        if (dh > 0.4) continue;
        const dx = tx * TS + dh * TS * 2;
        const dy = roadTop + dh * roadH;
        road.moveTo(dx, dy).quadraticCurveTo(dx + 8, dy - 2, dx + 16, dy)
          .stroke({ color: 0xBBAA77, width: 0.5, alpha: 0.25 });
      }
      // Scattered sand particles
      for (let tx = 0; tx < mapWidth; tx += 3) {
        const sp = tileHash(tx, 721, 666);
        if (sp > 0.5) continue;
        for (let s2 = 0; s2 < 3; s2++) {
          const sx2 = tx * TS + tileHash(tx, s2 + 730, 777) * TS * 2;
          const sy2 = roadTop + tileHash(tx, s2 + 740, 888) * roadH;
          road.circle(sx2, sy2, 0.5 + sp).fill({ color: 0xddcc99, alpha: 0.3 });
        }
      }
    } else if (biomeId === "forest") {
      // Leaf litter on the road
      for (let tx = 0; tx < mapWidth; tx += 2) {
        const lf = tileHash(tx, 750, 999);
        if (lf > 0.35) continue;
        const lx2 = tx * TS + lf * TS * 2;
        const ly2 = roadTop + lf * roadH;
        const leafCol = colorShift(0x556633, 20, tileHash(tx, 751, 111));
        // Tiny leaf shapes
        road.ellipse(lx2, ly2, 2 + lf * 2, 1 + lf).fill({ color: leafCol, alpha: 0.3 });
        road.ellipse(lx2 + 3, ly2 + 1, 1.5 + lf, 0.8).fill({ color: colorShift(leafCol, 15, 0.7), alpha: 0.25 });
      }
      // Moss on road edges
      for (let tx = 0; tx < mapWidth; tx += 4) {
        const mh = tileHash(tx, 760, 222);
        if (mh > 0.3) continue;
        const mx = tx * TS + mh * TS * 2;
        const topSide = mh > 0.15;
        const my = topSide ? roadTop + 1 : roadTop + roadH - 3;
        road.ellipse(mx, my, 4 + mh * 6, 2).fill({ color: 0x446633, alpha: 0.2 });
      }
    }

    this._drawEnvironment(mapWidth, mapHeight, roadTop, roadH, biome);
  }

  // ---------------------------------------------------------------------------
  // Sky & clouds
  // ---------------------------------------------------------------------------

  private _drawSky(mapWidth: number, mapHeight: number, biome?: BiomeDef): void {
    this.skyContainer.removeChildren();
    this._clouds = [];

    const totalW = mapWidth * TS;
    const totalH = mapHeight * TS;
    const sky = new Graphics();
    const biomeId = biome?.id ?? "meadow";

    // Sky gradient (multiple horizontal bands)
    const skyColors: Record<string, { top: number; mid: number; bot: number }> = {
      meadow:   { top: 0x4488cc, mid: 0x88bbdd, bot: 0xbbddee },
      forest:   { top: 0x336688, mid: 0x668899, bot: 0x99aabb },
      tundra:   { top: 0x667799, mid: 0x99aabb, bot: 0xccddee },
      desert:   { top: 0xcc9944, mid: 0xddbb77, bot: 0xeeddaa },
      volcanic: { top: 0x332211, mid: 0x553322, bot: 0x664433 },
    };
    const sc = skyColors[biomeId] ?? skyColors.meadow;
    const bandH = totalH / 3;
    sky.rect(0, 0, totalW, bandH).fill({ color: sc.top, alpha: 0.3 });
    sky.rect(0, bandH, totalW, bandH).fill({ color: sc.mid, alpha: 0.2 });
    sky.rect(0, bandH * 2, totalW, bandH).fill({ color: sc.bot, alpha: 0.1 });

    // Horizon glow
    sky.rect(0, totalH * 0.7, totalW, totalH * 0.3).fill({ color: sc.bot, alpha: 0.05 });

    // Distant mountains on horizon
    const mtColor = biomeId === "volcanic" ? 0x332222 : biomeId === "tundra" ? 0x8899aa : biomeId === "desert" ? 0xaa9977 : 0x556655;
    const mtY = totalH * 0.15; // mountain base line
    // Back range (larger, fainter)
    sky.moveTo(0, mtY + 15);
    for (let mx = 0; mx < totalW; mx += 80) {
      const mh2 = tileHash(Math.floor(mx / 80), 0, 9999);
      const peakY = mtY - 15 - mh2 * 25;
      sky.lineTo(mx + 40 + (mh2 - 0.5) * 20, peakY);
      sky.lineTo(mx + 80, mtY + 15 + mh2 * 5);
    }
    sky.lineTo(totalW, mtY + 20);
    sky.lineTo(0, mtY + 20);
    sky.closePath().fill({ color: mtColor, alpha: 0.12 });

    // Front range (smaller, slightly darker)
    sky.moveTo(0, mtY + 25);
    for (let mx = 30; mx < totalW; mx += 60) {
      const mh3 = tileHash(Math.floor(mx / 60), 1, 8888);
      const peakY2 = mtY + 10 - mh3 * 20;
      sky.lineTo(mx + 30 + (mh3 - 0.5) * 15, peakY2);
      sky.lineTo(mx + 60, mtY + 25 + mh3 * 3);
    }
    sky.lineTo(totalW, mtY + 30);
    sky.lineTo(0, mtY + 30);
    sky.closePath().fill({ color: mtColor, alpha: 0.08 });

    // Snow caps on tundra mountains
    if (biomeId === "tundra") {
      for (let mx = 0; mx < totalW; mx += 80) {
        const mh4 = tileHash(Math.floor(mx / 80), 0, 9999);
        const peakY3 = mtY - 15 - mh4 * 25;
        sky.moveTo(mx + 35, peakY3 + 5).lineTo(mx + 40 + (mh4 - 0.5) * 20, peakY3).lineTo(mx + 45, peakY3 + 5)
          .fill({ color: 0xeeeeff, alpha: 0.1 });
      }
    }

    this.skyContainer.addChild(sky);

    // Spawn clouds
    const cloudCount = biomeId === "volcanic" ? 3 : biomeId === "desert" ? 4 : 8;
    for (let i = 0; i < cloudCount; i++) {
      const cx = Math.random() * totalW;
      const cy = 10 + Math.random() * totalH * 0.25; // upper quarter of map
      const w = 40 + Math.random() * 80;
      const speed = 3 + Math.random() * 8; // pixels per second drift

      const cloudColor = biomeId === "volcanic" ? 0x444433 : biomeId === "tundra" ? 0xddeeff : 0xffffff;
      const cloudAlpha = biomeId === "volcanic" ? 0.12 : 0.08 + Math.random() * 0.06;

      const gfx = new Graphics();
      // Cloud shape: multiple overlapping ellipses
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const px = (p / puffs - 0.5) * w;
        const py = (Math.random() - 0.5) * w * 0.2;
        const pr = w * (0.15 + Math.random() * 0.15);
        gfx.ellipse(px, py, pr, pr * 0.45).fill({ color: cloudColor, alpha: cloudAlpha });
      }
      // Brighter center
      gfx.ellipse(0, 0, w * 0.2, w * 0.08).fill({ color: cloudColor, alpha: cloudAlpha * 0.5 });

      gfx.position.set(cx, cy);
      this.skyContainer.addChild(gfx);
      this._clouds.push({ gfx, x: cx, y: cy, speed, w });
    }

  }

  /** Update cloud drift */
  /** Draw biome hazard zones on the ground */
  renderHazards(s: CaravanState): void {
    if (!this._hazardGfx) {
      this._hazardGfx = new Graphics();
      this.hazardContainer.addChild(this._hazardGfx);
    }
    this._hazardGfx.clear();

    for (const h of s.hazards) {
      const hx = h.x * TS;
      const hy = h.y * TS;
      const hr = h.radius * TS;
      const fadeAlpha = Math.min(1, h.lifetime / 1.5) * 0.3; // fade out near end

      const colors: Record<string, { fill: number; stroke: number }> = {
        poison_cloud: { fill: 0x44ff44, stroke: 0x22aa22 },
        ice_patch:    { fill: 0x88ccff, stroke: 0x4488cc },
        sandstorm:    { fill: 0xddaa44, stroke: 0xaa8833 },
        lava_vent:    { fill: 0xff4400, stroke: 0xcc2200 },
      };
      const col = colors[h.type] ?? colors.poison_cloud;

      // Pulsing zone
      const pulse = Math.sin(s.gameTime * 3 + h.id) * 0.05;
      this._hazardGfx.circle(hx, hy, hr).fill({ color: col.fill, alpha: fadeAlpha * (0.12 + pulse) });
      this._hazardGfx.circle(hx, hy, hr * 0.7).fill({ color: col.fill, alpha: fadeAlpha * 0.06 });
      this._hazardGfx.circle(hx, hy, hr).stroke({ color: col.stroke, width: 1, alpha: fadeAlpha * 0.4 });
    }
  }

  updateClouds(dt: number): void {
    for (const cloud of this._clouds) {
      cloud.x += cloud.speed * dt;
      // Wrap around (with buffer)
      if (cloud.x > (cloud.gfx.parent ? (cloud.gfx.parent as Container).width : 10000)) {
        cloud.x = -cloud.w * 2;
      }
      cloud.gfx.position.x = cloud.x;
    }
  }

  private _drawEnvironment(mapWidth: number, _mapHeight: number, roadTop: number, roadH: number, biome?: BiomeDef): void {
    const behind = new Graphics();
    const front = new Graphics();
    const roadBottom = roadTop + roadH;
    const canopyCol = biome?.treeCanopyColor ?? 0x2D6B1E;
    const trunkCol = biome?.treeTrunkColor ?? 0x5C4A2E;
    const grassCol = biome?.grassColor ?? 0x4A8A2A;
    const rockCol = biome?.rockColor ?? 0x888877;
    const flowerCols = biome?.flowerColors ?? [0xff6688, 0xffaa44, 0x88aaff, 0xff88ff, 0xffff66];

    for (let tx = 0; tx < mapWidth; tx += 2) {
      // --- TREES (behind road, top and bottom) ---
      for (let side = 0; side < 2; side++) {
        const h = tileHash(tx, side + 10, 123);
        if (h > 0.35) continue; // ~35% chance of tree

        const treeX = tx * TS + tileHash(tx, side + 20, 456) * TS * 2;
        const baseY = side === 0
          ? roadTop - 30 - tileHash(tx, side, 789) * 80
          : roadBottom + 30 + tileHash(tx, side, 789) * 80;

        const treeH = 30 + h * 40;
        const trunkW = 4 + h * 4;
        const canopyR = 12 + h * 15;
        const trunkColor = colorShift(trunkCol, 15, tileHash(tx, side, 321));
        const canopyBase = colorShift(canopyCol, 25, tileHash(tx, side, 654));

        // Tree shape variety (4 types)
        const treeShape = Math.floor(tileHash(tx, side + 100, 789) * 4);

        if (treeShape === 0) {
          // PINE — tall triangular conifer
          behind.rect(treeX - trunkW / 3, baseY - treeH, trunkW * 0.6, treeH).fill({ color: trunkColor });
          const layers = 4;
          for (let l = 0; l < layers; l++) {
            const ly = baseY - treeH + l * treeH * 0.15 - canopyR * 0.5;
            const lw = canopyR * (0.4 + l * 0.2);
            const lc = colorShift(canopyBase, 15, tileHash(tx, l + 70, side));
            behind.moveTo(treeX, ly - lw * 0.6).lineTo(treeX - lw, ly + lw * 0.3)
              .lineTo(treeX + lw, ly + lw * 0.3).closePath().fill({ color: lc });
          }
        } else if (treeShape === 1) {
          // OAK — wide rounded canopy with thick trunk
          const tw = trunkW * 1.3;
          behind.roundRect(treeX - tw / 2, baseY - treeH, tw, treeH, 2).fill({ color: trunkColor });
          // Wide canopy (5 circles)
          for (let c = 0; c < 5; c++) {
            const cx2 = treeX + (tileHash(tx, c + 30, side) - 0.5) * canopyR;
            const cy2 = baseY - treeH - canopyR * 0.2 + (tileHash(tx, c + 40, side) - 0.5) * canopyR * 0.4;
            const cr2 = canopyR * (0.6 + tileHash(tx, c + 50, side) * 0.3);
            behind.circle(cx2, cy2, cr2).fill({ color: colorShift(canopyBase, 20, tileHash(tx, c + 60, side)) });
          }
          behind.circle(treeX - canopyR * 0.2, baseY - treeH - canopyR * 0.3, canopyR * 0.35)
            .fill({ color: 0xffffff, alpha: 0.06 });
        } else if (treeShape === 2) {
          // DEAD TREE — bare branches, no canopy
          const deadCol = colorShift(0x5A4A3A, 15, tileHash(tx, side, 321));
          behind.rect(treeX - trunkW / 2, baseY - treeH, trunkW, treeH).fill({ color: deadCol });
          // Bare branches
          const bTop = baseY - treeH;
          behind.moveTo(treeX, bTop).lineTo(treeX - 10, bTop - 14).stroke({ color: deadCol, width: 1.5 });
          behind.moveTo(treeX, bTop).lineTo(treeX + 12, bTop - 10).stroke({ color: deadCol, width: 1.5 });
          behind.moveTo(treeX, bTop + 8).lineTo(treeX - 8, bTop - 2).stroke({ color: deadCol, width: 1 });
          behind.moveTo(treeX + 12, bTop - 10).lineTo(treeX + 16, bTop - 16).stroke({ color: deadCol, width: 0.8 });
          behind.moveTo(treeX - 10, bTop - 14).lineTo(treeX - 14, bTop - 20).stroke({ color: deadCol, width: 0.8 });
        } else {
          // STANDARD — existing round canopy (3 circles)
          behind.rect(treeX - trunkW / 2, baseY - treeH, trunkW, treeH).fill({ color: trunkColor });
          for (let c = 0; c < 3; c++) {
            const cx3 = treeX + (tileHash(tx, c + 30, side) - 0.5) * canopyR * 0.6;
            const cy3 = baseY - treeH - canopyR * 0.3 + (tileHash(tx, c + 40, side) - 0.5) * canopyR * 0.5;
            const cr3 = canopyR * (0.7 + tileHash(tx, c + 50, side) * 0.3);
            behind.circle(cx3, cy3, cr3).fill({ color: colorShift(canopyBase, 20, tileHash(tx, c + 60, side)) });
          }
          behind.circle(treeX - canopyR * 0.2, baseY - treeH - canopyR * 0.5, canopyR * 0.4)
            .fill({ color: colorShift(canopyBase, 30, 0.8), alpha: 0.4 });
        }
      }

      // --- GRASS TUFTS along road edges ---
      for (let g = 0; g < 3; g++) {
        const gh = tileHash(tx, g + 50, 333);
        if (gh > 0.5) continue;

        const grassX = tx * TS + gh * TS * 2;
        const topOrBottom = tileHash(tx, g + 60, 444) > 0.5;
        const grassY = topOrBottom
          ? roadTop - 2 - gh * 8
          : roadTop + roadH + 2 + gh * 8;
        const grassColor = colorShift(grassCol, 25, tileHash(tx, g + 70, 555));
        const bladeCount = 3 + Math.floor(gh * 4);
        const bladeH = 6 + gh * 10;

        for (let b = 0; b < bladeCount; b++) {
          const bh = tileHash(tx * 7 + b, g, 666);
          const bx = grassX + (bh - 0.5) * 8;
          const lean = (bh - 0.5) * 4;
          front.moveTo(bx, grassY);
          front.quadraticCurveTo(bx + lean, grassY - bladeH * 0.6, bx + lean * 1.5, grassY - bladeH);
          front.stroke({ color: colorShift(grassColor, 15, bh), width: 1.2, alpha: 0.8 });
        }
      }

      // --- SMALL ROCKS scattered around ---
      const rh = tileHash(tx, 100, 777);
      if (rh > 0.8) {
        const rockX = tx * TS + rh * TS;
        const topBot = tileHash(tx, 101, 888) > 0.5;
        const rockY = topBot
          ? roadTop - 10 - rh * 30
          : roadTop + roadH + 10 + rh * 30;
        const rockR = 3 + rh * 6;
        const rockColor = colorShift(rockCol, 20, tileHash(tx, 102, 999));
        behind.ellipse(rockX, rockY, rockR, rockR * 0.6).fill({ color: rockColor });
        // Highlight
        behind.ellipse(rockX - rockR * 0.2, rockY - rockR * 0.15, rockR * 0.4, rockR * 0.25)
          .fill({ color: 0xaaaaaa, alpha: 0.3 });
      }

      // --- FLOWERS (detailed teardrop petals) ---
      const fh = tileHash(tx, 200, 111);
      if (fh > 0.85) {
        const fx = tx * TS + fh * TS * 1.5;
        const topBot = tileHash(tx, 201, 222) > 0.5;
        const fy = topBot
          ? roadTop - 15 - fh * 20
          : roadTop + roadH + 15 + fh * 20;
        const petalColor = flowerCols[Math.floor(tileHash(tx, 202, 333) * flowerCols.length)];
        const flowerCY = fy - 10;
        // Stem with slight curve
        front.moveTo(fx, fy).quadraticCurveTo(fx + 1, fy - 5, fx, flowerCY + 2).stroke({ color: 0x448833, width: 1.2 });
        // Leaf on stem
        front.moveTo(fx, fy - 4).quadraticCurveTo(fx + 4, fy - 6, fx + 2, fy - 8).stroke({ color: 0x448833, width: 0.8 });
        // Teardrop petals (5 petals)
        for (let p = 0; p < 5; p++) {
          const angle = (p / 5) * Math.PI * 2 + fh * 0.5;
          const px2 = fx + Math.cos(angle) * 3.5;
          const py2 = flowerCY + Math.sin(angle) * 3.5;
          // Teardrop: curve from center outward and back
          front.moveTo(fx, flowerCY);
          front.quadraticCurveTo(
            px2 + Math.cos(angle + 0.6) * 2,
            py2 + Math.sin(angle + 0.6) * 2,
            px2 + Math.cos(angle) * 1.5,
            py2 + Math.sin(angle) * 1.5,
          );
          front.quadraticCurveTo(
            px2 + Math.cos(angle - 0.6) * 2,
            py2 + Math.sin(angle - 0.6) * 2,
            fx, flowerCY,
          );
          front.fill({ color: petalColor, alpha: 0.75 });
          // Petal vein
          front.moveTo(fx, flowerCY).lineTo(px2, py2).stroke({ color: petalColor, width: 0.3, alpha: 0.4 });
        }
        // Center with texture
        front.circle(fx, flowerCY, 2).fill({ color: 0xffee44 });
        front.circle(fx, flowerCY, 2).stroke({ color: 0xddcc22, width: 0.4 });
        // Stamen dots
        for (let st = 0; st < 3; st++) {
          const sa = (st / 3) * Math.PI * 2 + 0.5;
          front.circle(fx + Math.cos(sa) * 1, flowerCY + Math.sin(sa) * 1, 0.4)
            .fill({ color: 0xffaa22, alpha: 0.6 });
        }
      }
    }

    // --- SIGNPOSTS (every ~20 tiles, detailed) ---
    for (let tx = 8; tx < mapWidth; tx += 18 + Math.floor(tileHash(tx, 300, 111) * 8)) {
      const sh2 = tileHash(tx, 301, 222);
      const signX = tx * TS + sh2 * TS;
      const topSide = tileHash(tx, 302, 333) > 0.5;
      const signY = topSide ? roadTop - 8 : roadTop + roadH + 8;

      // Shadow at base
      front.ellipse(signX, signY + 2, 5, 2).fill({ color: 0x000000, alpha: 0.1 });
      // Post with wood grain
      front.roundRect(signX - 2, signY - 22, 4, 24, 1).fill({ color: 0x6B5310 });
      front.moveTo(signX - 0.5, signY - 20).lineTo(signX - 0.5, signY + 1).stroke({ color: 0x5A4208, width: 0.3, alpha: 0.4 });
      front.moveTo(signX + 1, signY - 18).lineTo(signX + 1, signY - 2).stroke({ color: 0x5A4208, width: 0.3, alpha: 0.3 });
      // Post cap (pointed top)
      front.moveTo(signX - 2.5, signY - 22).lineTo(signX, signY - 25).lineTo(signX + 2.5, signY - 22)
        .fill({ color: 0x7A6320 });

      // Sign board with plank divisions
      front.roundRect(signX - 13, signY - 22, 26, 11, 2).fill({ color: 0x8B7344 });
      // Plank divisions
      front.moveTo(signX - 4, signY - 22).lineTo(signX - 4, signY - 11).stroke({ color: 0x7A6234, width: 0.4, alpha: 0.4 });
      front.moveTo(signX + 5, signY - 22).lineTo(signX + 5, signY - 11).stroke({ color: 0x7A6234, width: 0.4, alpha: 0.4 });
      // Board beveled edges
      front.roundRect(signX - 13, signY - 22, 26, 11, 2).stroke({ color: 0x5A4A22, width: 0.7 });
      front.roundRect(signX - 12, signY - 21, 24, 3, 1).fill({ color: 0x9A8354, alpha: 0.2 }); // highlight

      // Rope wrapping where board meets post
      front.moveTo(signX - 3, signY - 20).quadraticCurveTo(signX + 1, signY - 19, signX - 2, signY - 18)
        .stroke({ color: 0x887744, width: 0.8 });
      front.moveTo(signX - 2, signY - 18).quadraticCurveTo(signX + 2, signY - 17, signX - 3, signY - 16)
        .stroke({ color: 0x887744, width: 0.7 });

      // Nails with shading
      front.circle(signX - 10, signY - 17, 1).fill({ color: 0x666655 });
      front.circle(signX - 10.2, signY - 17.2, 0.4).fill({ color: 0x888877, alpha: 0.5 }); // highlight
      front.circle(signX + 10, signY - 17, 1).fill({ color: 0x666655 });
      front.circle(signX + 9.8, signY - 17.2, 0.4).fill({ color: 0x888877, alpha: 0.5 });

      // Arrow pointer (proper arrowhead)
      front.moveTo(signX + 13, signY - 17).lineTo(signX + 17, signY - 17)
        .stroke({ color: 0x5A4A22, width: 1.2 });
      front.moveTo(signX + 17, signY - 17).lineTo(signX + 15, signY - 19).stroke({ color: 0x5A4A22, width: 0.8 });
      front.moveTo(signX + 17, signY - 17).lineTo(signX + 15, signY - 15).stroke({ color: 0x5A4A22, width: 0.8 });
    }

    // --- BUSHES (leafy edges with texture) ---
    for (let tx = 0; tx < mapWidth; tx += 3) {
      const bh = tileHash(tx, 400, 444);
      if (bh > 0.7) continue;
      const bushX = tx * TS + bh * TS * 3;
      const topBot = tileHash(tx, 401, 555) > 0.5;
      const bushY = topBot
        ? roadTop - 18 - bh * 40
        : roadTop + roadH + 18 + bh * 40;
      const bushR = 6 + bh * 10;
      const bushCol = colorShift(grassCol, 20, tileHash(tx, 402, 666));
      const darkCol = colorShift(bushCol, -15, 0.3);
      const lightCol = colorShift(bushCol, 15, 0.7);

      // Base mass (3 overlapping blobs)
      behind.circle(bushX - bushR * 0.3, bushY, bushR * 0.8).fill({ color: darkCol });
      behind.circle(bushX + bushR * 0.3, bushY - bushR * 0.1, bushR * 0.7).fill({ color: bushCol });
      behind.circle(bushX, bushY - bushR * 0.3, bushR * 0.6).fill({ color: lightCol });

      // Leafy edge bumps (small circles along perimeter)
      const leafCount = 6 + Math.floor(bh * 5);
      for (let lf = 0; lf < leafCount; lf++) {
        const la = (lf / leafCount) * Math.PI * 2 + bh;
        const lr = bushR * 0.7 + tileHash(tx * 7 + lf, 403, 777) * bushR * 0.3;
        const lx = bushX + Math.cos(la) * lr;
        const ly = bushY - bushR * 0.1 + Math.sin(la) * lr * 0.6;
        const lc = colorShift(bushCol, 12, tileHash(tx * 7 + lf, 404, 888));
        behind.circle(lx, ly, 2 + tileHash(tx * 7 + lf, 405, 999) * 2.5).fill({ color: lc });
      }

      // Inner shadow depth
      behind.circle(bushX, bushY + bushR * 0.1, bushR * 0.5).fill({ color: darkCol, alpha: 0.2 });
      // Top highlight
      behind.circle(bushX - bushR * 0.1, bushY - bushR * 0.35, bushR * 0.25)
        .fill({ color: 0xffffff, alpha: 0.08 });
      // Individual leaf tips sticking out
      for (let lt = 0; lt < 3; lt++) {
        const la2 = tileHash(tx, lt + 410, 111) * Math.PI * 2;
        const tipX = bushX + Math.cos(la2) * (bushR + 2);
        const tipY = bushY - bushR * 0.1 + Math.sin(la2) * bushR * 0.5;
        behind.moveTo(tipX, tipY)
          .quadraticCurveTo(tipX + Math.cos(la2) * 3, tipY + Math.sin(la2) * 2, tipX + Math.cos(la2) * 5, tipY + Math.sin(la2) * 3)
          .stroke({ color: bushCol, width: 1.5, alpha: 0.6 });
      }
    }

    // --- FENCES (occasional short sections, detailed) ---
    for (let tx = 15; tx < mapWidth; tx += 25 + Math.floor(tileHash(tx, 500, 777) * 15)) {
      const fenceH = tileHash(tx, 501, 888);
      if (fenceH > 0.5) continue;
      const fenceX = tx * TS;
      const topSide2 = tileHash(tx, 502, 999) > 0.5;
      const fenceY = topSide2 ? roadTop - 6 : roadTop + roadH + 4;
      const fenceLen = 3 + Math.floor(fenceH * 4);

      for (let f = 0; f < fenceLen; f++) {
        const px2 = fenceX + f * 8;
        // Shadow at post base
        front.ellipse(px2 + 1, fenceY + 2, 2, 1).fill({ color: 0x000000, alpha: 0.08 });
        // Fence post (with pointed top)
        front.roundRect(px2 - 0.5, fenceY - 10, 3, 12, 0.5).fill({ color: 0x7A6633 });
        // Pointed top (picket)
        front.moveTo(px2 - 0.5, fenceY - 10).lineTo(px2 + 1, fenceY - 13).lineTo(px2 + 2.5, fenceY - 10)
          .fill({ color: 0x8A7643 });
        // Wood grain on post
        front.moveTo(px2 + 0.5, fenceY - 8).lineTo(px2 + 0.5, fenceY + 0).stroke({ color: 0x6A5623, width: 0.3, alpha: 0.3 });

        // Rails (with rounded profile)
        if (f < fenceLen - 1) {
          // Top rail
          front.roundRect(px2 + 2.5, fenceY - 8.5, 5.5, 2, 0.5).fill({ color: 0x8B7744 });
          front.roundRect(px2 + 2.5, fenceY - 8.5, 5.5, 0.5, 0.3).fill({ color: 0x9B8754, alpha: 0.3 }); // highlight
          // Bottom rail
          front.roundRect(px2 + 2.5, fenceY - 3.5, 5.5, 2, 0.5).fill({ color: 0x8B7744 });
          front.roundRect(px2 + 2.5, fenceY - 3.5, 5.5, 0.5, 0.3).fill({ color: 0x9B8754, alpha: 0.3 });
          // Nail at rail-post junction
          front.circle(px2 + 2.5, fenceY - 7.5, 0.5).fill({ color: 0x555544 });
          front.circle(px2 + 2.5, fenceY - 2.5, 0.5).fill({ color: 0x555544 });
          // Cross brace (diagonal)
          if (f % 2 === 0 && f < fenceLen - 1) {
            front.moveTo(px2 + 2.5, fenceY - 7).lineTo(px2 + 8, fenceY - 2)
              .stroke({ color: 0x7A6633, width: 0.7, alpha: 0.4 });
          }
        }

        // Moss/weathering at base (occasional)
        if (tileHash(tx * 7 + f, 510, 111) < 0.3) {
          front.circle(px2 + 1, fenceY + 1, 1.5).fill({ color: 0x446633, alpha: 0.2 });
        }
      }
    }

    // --- ROAD EMBANKMENTS (raised dirt edges for depth) ---
    for (let tx = 0; tx < mapWidth; tx++) {
      const eh = tileHash(tx, 800, 111);
      // Top embankment (darker strip above road)
      const embankCol = colorShift(0x5A4A2E, 15, eh);
      behind.rect(tx * TS, roadTop - 6, TS, 6).fill({ color: embankCol, alpha: 0.15 });
      // Bottom embankment
      behind.rect(tx * TS, roadBottom, TS, 5).fill({ color: embankCol, alpha: 0.12 });
    }

    // --- FALLEN LOGS (occasional, detailed) ---
    for (let tx = 20; tx < mapWidth; tx += 30 + Math.floor(tileHash(tx, 810, 222) * 20)) {
      const fh = tileHash(tx, 811, 333);
      if (fh > 0.35) continue;
      const logX = tx * TS + fh * TS * 3;
      const topSide3 = tileHash(tx, 812, 444) > 0.5;
      const logY = topSide3 ? roadTop - 16 - fh * 20 : roadBottom + 12 + fh * 20;
      const logLen = 15 + fh * 25;
      const logAngle = (tileHash(tx, 813, 555) - 0.5) * 0.4;
      const logCol = colorShift(trunkCol, 20, fh);
      const logW = 4 + fh * 3;
      const endX = logX + Math.cos(logAngle) * logLen;
      const endY = logY + Math.sin(logAngle) * logLen;

      // Shadow underneath
      behind.ellipse((logX + endX) / 2, (logY + endY) / 2 + 3, logLen / 2, 3)
        .fill({ color: 0x000000, alpha: 0.1 });
      // Log body (thicker)
      behind.moveTo(logX, logY).lineTo(endX, endY).stroke({ color: logCol, width: logW });
      // Bark texture lines (multiple parallel)
      for (let bl = 0; bl < 3; bl++) {
        const off = (bl - 1) * (logW * 0.25);
        const perpX = -Math.sin(logAngle) * off;
        const perpY = Math.cos(logAngle) * off;
        behind.moveTo(logX + perpX, logY + perpY)
          .lineTo(endX + perpX, endY + perpY)
          .stroke({ color: colorShift(logCol, -10, 0.3 + bl * 0.2), width: 0.4, alpha: 0.25 });
      }

      // Cross-section at cut end (concentric tree rings)
      const endR = logW * 0.5 + 1;
      behind.circle(logX, logY, endR + 1).fill({ color: colorShift(logCol, -5, 0.4) }); // bark rim
      behind.circle(logX, logY, endR).fill({ color: colorShift(logCol, 15, 0.7) }); // outer wood
      behind.circle(logX, logY, endR * 0.7).stroke({ color: colorShift(logCol, -5, 0.5), width: 0.4 }); // ring
      behind.circle(logX, logY, endR * 0.45).stroke({ color: colorShift(logCol, -5, 0.6), width: 0.3 }); // inner ring
      behind.circle(logX, logY, endR * 0.2).fill({ color: colorShift(logCol, 10, 0.3) }); // pith

      // Branch stubs (1-2 protruding)
      if (fh < 0.2) {
        const stubT = 0.4;
        const stubX = logX + Math.cos(logAngle) * logLen * stubT;
        const stubY = logY + Math.sin(logAngle) * logLen * stubT;
        behind.moveTo(stubX, stubY)
          .lineTo(stubX - Math.sin(logAngle) * 8, stubY + Math.cos(logAngle) * 8)
          .stroke({ color: logCol, width: 2 });
        behind.circle(stubX - Math.sin(logAngle) * 8, stubY + Math.cos(logAngle) * 8, 1)
          .fill({ color: colorShift(logCol, 10, 0.5) });
      }

      // Crack on surface
      const crackT = 0.6;
      const crackX = logX + Math.cos(logAngle) * logLen * crackT;
      const crackY = logY + Math.sin(logAngle) * logLen * crackT;
      behind.moveTo(crackX, crackY - logW * 0.3)
        .quadraticCurveTo(crackX + 2, crackY, crackX, crackY + logW * 0.3)
        .stroke({ color: 0x222211, width: 0.5, alpha: 0.3 });
    }

    // --- UNDERGROWTH (ferns and small plants between trees) ---
    for (let tx = 0; tx < mapWidth; tx += 3) {
      const uh = tileHash(tx, 820, 666);
      if (uh > 0.4) continue;
      const ux = tx * TS + uh * TS * 3;
      const topBot = tileHash(tx, 821, 777) > 0.5;
      const uy = topBot
        ? roadTop - 22 - uh * 50
        : roadBottom + 22 + uh * 50;

      // Fern fronds (curved bezier strokes)
      const fernCol = colorShift(grassCol, 20, tileHash(tx, 822, 888));
      const frondCount = 3 + Math.floor(uh * 3);
      for (let f = 0; f < frondCount; f++) {
        const fAngle = (f / frondCount - 0.5) * Math.PI * 0.6;
        const fLen = 6 + uh * 8;
        const fx2 = ux + Math.sin(fAngle) * fLen;
        const fy2 = uy - Math.cos(fAngle) * fLen;
        front.moveTo(ux, uy).quadraticCurveTo(
          ux + Math.sin(fAngle) * fLen * 0.5,
          uy - Math.cos(fAngle) * fLen * 0.7,
          fx2, fy2,
        ).stroke({ color: fernCol, width: 1, alpha: 0.6 });
        // Tiny leaves along frond
        for (let l = 0; l < 3; l++) {
          const lt = (l + 1) / 4;
          const lx = ux + Math.sin(fAngle) * fLen * lt;
          const ly3 = uy - Math.cos(fAngle) * fLen * lt;
          front.circle(lx + (l % 2 === 0 ? 2 : -2), ly3, 1.2)
            .fill({ color: fernCol, alpha: 0.4 });
        }
      }
    }

    // --- MUSHROOMS (rare, near trees, detailed) ---
    for (let tx = 0; tx < mapWidth; tx += 6) {
      const muh = tileHash(tx, 830, 999);
      if (muh > 0.15) continue;
      const mx2 = tx * TS + muh * TS * 4;
      const topBot2 = tileHash(tx, 831, 111) > 0.5;
      const my2 = topBot2
        ? roadTop - 12 - muh * 30
        : roadBottom + 12 + muh * 30;
      const mushCol = [0xcc4444, 0xddaa44, 0xccccbb, 0x886644][Math.floor(muh * 4)];

      // Shadow base
      front.ellipse(mx2, my2 + 1, 4, 1.5).fill({ color: 0x000000, alpha: 0.08 });
      // Stem (tapered, with ribbing)
      front.moveTo(mx2 - 1.5, my2).lineTo(mx2 - 1, my2 - 4).lineTo(mx2 + 1, my2 - 4).lineTo(mx2 + 1.5, my2)
        .fill({ color: 0xccccbb });
      // Stem ribbing
      front.moveTo(mx2 - 0.3, my2).lineTo(mx2 - 0.3, my2 - 3.5).stroke({ color: 0xbbbbaa, width: 0.3, alpha: 0.3 });
      front.moveTo(mx2 + 0.5, my2 - 1).lineTo(mx2 + 0.5, my2 - 3).stroke({ color: 0xbbbbaa, width: 0.3, alpha: 0.2 });
      // Stem ring (annulus)
      front.moveTo(mx2 - 1.2, my2 - 2).quadraticCurveTo(mx2, my2 - 1.5, mx2 + 1.2, my2 - 2)
        .stroke({ color: 0xddddcc, width: 0.5 });

      // Cap (domed)
      front.moveTo(mx2 - 4.5, my2 - 4.5)
        .quadraticCurveTo(mx2 - 4.5, my2 - 8, mx2, my2 - 8.5)
        .quadraticCurveTo(mx2 + 4.5, my2 - 8, mx2 + 4.5, my2 - 4.5)
        .lineTo(mx2 - 4.5, my2 - 4.5)
        .fill({ color: mushCol });
      // Cap edge (darker underside)
      front.moveTo(mx2 - 4.5, my2 - 4.5).lineTo(mx2 + 4.5, my2 - 4.5)
        .stroke({ color: colorShift(mushCol, -20, 0.3), width: 1 });

      // Gills (radiating lines under cap)
      for (let gl = -3; gl <= 3; gl++) {
        front.moveTo(mx2 + gl, my2 - 4.5).lineTo(mx2 + gl * 0.3, my2 - 3.5)
          .stroke({ color: 0xccbbaa, width: 0.3, alpha: 0.3 });
      }

      // Cap spots (for red mushrooms — more spots)
      if (mushCol === 0xcc4444) {
        front.circle(mx2 - 2, my2 - 7, 0.9).fill({ color: 0xffffff, alpha: 0.5 });
        front.circle(mx2 + 1.5, my2 - 6.5, 0.7).fill({ color: 0xffffff, alpha: 0.45 });
        front.circle(mx2 - 0.5, my2 - 7.5, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
        front.circle(mx2 + 3, my2 - 5.5, 0.6).fill({ color: 0xffffff, alpha: 0.35 });
      }
      // Cap highlight
      front.ellipse(mx2 - 1, my2 - 7, 2, 1).fill({ color: 0xffffff, alpha: 0.1 });
      // Cap shading (darker right side)
      front.ellipse(mx2 + 2, my2 - 5.5, 2, 1.5).fill({ color: 0x000000, alpha: 0.06 });
    }

    this.envBehindContainer.addChild(behind);
    this.envFrontContainer.addChild(front);
  }

  // ---------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------

  createPlayerSprite(unitType: UnitType): void {
    // Shadow
    this._playerShadow = new Graphics().ellipse(0, 4, 14, 5).fill({ color: 0x000000, alpha: 0.25 });
    this.playerContainer.addChild(this._playerShadow);

    const frames = animationManager.getFrames(unitType, UnitState.IDLE);
    if (frames.length > 0) {
      this.playerSprite = new AnimatedSprite(frames);
      this.playerSprite.animationSpeed = 0.15;
      this.playerSprite.play();
      this.playerSprite.anchor.set(0.5, 0.75);
      this.playerSprite.scale.set(1.5);
      this.playerContainer.addChild(this.playerSprite);
    } else {
      const gfx = _drawProceduralHero(unitType);
      this.playerContainer.addChild(gfx);
    }
  }

  // ---------------------------------------------------------------------------
  // Caravan wagon
  // ---------------------------------------------------------------------------

  createCaravanSprite(): void {
    // Shadow
    this._caravanShadow = new Graphics().ellipse(0, 18, 28, 8).fill({ color: 0x000000, alpha: 0.2 });
    this.caravanContainer.addChild(this._caravanShadow);

    const gfx = new Graphics();

    // ---- Draft horse (pulling the wagon) ----
    const hx = -38; // horse center x offset
    const hy = -2;  // horse center y offset

    // Horse shadow
    gfx.ellipse(hx, hy + 14, 12, 4).fill({ color: 0x000000, alpha: 0.15 });
    // Horse body (barrel-shaped)
    gfx.ellipse(hx, hy, 11, 7).fill({ color: 0x6B4423 });
    // Darker belly
    gfx.ellipse(hx, hy + 2, 9, 4).fill({ color: 0x5A3818, alpha: 0.5 });
    // Neck (slanted up)
    gfx.moveTo(hx - 8, hy - 4);
    gfx.quadraticCurveTo(hx - 14, hy - 12, hx - 12, hy - 16);
    gfx.lineTo(hx - 6, hy - 14);
    gfx.quadraticCurveTo(hx - 6, hy - 8, hx - 4, hy - 4);
    gfx.fill({ color: 0x6B4423 });
    // Mane (darker ridge)
    gfx.moveTo(hx - 12, hy - 16).quadraticCurveTo(hx - 9, hy - 10, hx - 6, hy - 6)
      .stroke({ color: 0x3A2211, width: 2 });
    // Head
    gfx.ellipse(hx - 14, hy - 18, 5, 4).fill({ color: 0x7A5533 });
    // Ear
    gfx.moveTo(hx - 12, hy - 22).lineTo(hx - 14, hy - 26).lineTo(hx - 16, hy - 22)
      .fill({ color: 0x7A5533 });
    // Eye
    gfx.circle(hx - 16, hy - 18, 1.2).fill({ color: 0x222211 });
    gfx.circle(hx - 16.3, hy - 18.3, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
    // Nostril
    gfx.circle(hx - 18, hy - 16, 0.8).fill({ color: 0x3A2211 });
    // Mouth line
    gfx.moveTo(hx - 19, hy - 15).quadraticCurveTo(hx - 17, hy - 14, hx - 15, hy - 15)
      .stroke({ color: 0x3A2211, width: 0.5 });

    // ---- Bridle (head gear) ----
    // Noseband (strap across snout)
    gfx.moveTo(hx - 17, hy - 17).lineTo(hx - 11, hy - 17).stroke({ color: 0x5A4422, width: 1.2 });
    // Cheek strap (noseband to ear)
    gfx.moveTo(hx - 11, hy - 17).lineTo(hx - 11, hy - 22).stroke({ color: 0x5A4422, width: 1 });
    // Brow band (across forehead)
    gfx.moveTo(hx - 13, hy - 22).lineTo(hx - 10, hy - 22).stroke({ color: 0x5A4422, width: 1 });
    // Throat latch (under jaw)
    gfx.moveTo(hx - 17, hy - 15).quadraticCurveTo(hx - 14, hy - 13, hx - 11, hy - 14)
      .stroke({ color: 0x5A4422, width: 0.8 });
    // Bit (in mouth)
    gfx.circle(hx - 17, hy - 15.5, 0.6).fill({ color: 0x888888 });
    // Reins (from bit to rider/harness area)
    gfx.moveTo(hx - 17, hy - 15.5).quadraticCurveTo(hx - 12, hy - 8, hx - 4, hy - 4)
      .stroke({ color: 0x5A4422, width: 0.8 });
    // Buckle on cheek strap
    gfx.rect(hx - 12, hy - 20, 2, 2).fill({ color: 0xaa9944 });

    // ---- Saddle blanket ----
    gfx.roundRect(hx - 6, hy - 6, 14, 8, 1).fill({ color: 0x993333, alpha: 0.7 });
    gfx.roundRect(hx - 6, hy - 6, 14, 8, 1).stroke({ color: 0x661122, width: 0.5 });
    // Blanket pattern (gold border trim)
    gfx.rect(hx - 5, hy - 5, 12, 1).fill({ color: 0xddaa44, alpha: 0.4 });
    gfx.rect(hx - 5, hy + 1, 12, 1).fill({ color: 0xddaa44, alpha: 0.4 });

    // Horse legs drawn in animated layer (renderCaravan)
    // Tail (static base - animated part in renderCaravan)
    gfx.moveTo(hx + 11, hy - 2).quadraticCurveTo(hx + 13, hy + 1, hx + 12, hy + 4)
      .stroke({ color: 0x3A2211, width: 1.5 });

    // ---- Harness (connects to wagon) ----
    // Traces (main pulling straps)
    gfx.moveTo(hx + 8, hy - 1).lineTo(-22, -1).stroke({ color: 0x5A4422, width: 1.5 });
    gfx.moveTo(hx + 8, hy + 3).lineTo(-22, 3).stroke({ color: 0x5A4422, width: 1 });
    // Breast collar (across chest)
    gfx.moveTo(hx - 8, hy - 3).quadraticCurveTo(hx - 6, hy + 2, hx - 2, hy + 3)
      .stroke({ color: 0x6B5310, width: 2 });
    // Collar/yoke with padding
    gfx.ellipse(hx - 2, hy, 3.5, 6.5).fill({ color: 0x6B5310, alpha: 0.3 });
    gfx.ellipse(hx - 2, hy, 3, 6).stroke({ color: 0x8B6914, width: 2 });
    // Buckle on collar
    gfx.circle(hx - 2, hy - 5, 1).fill({ color: 0xaa9944 });
    gfx.circle(hx - 2, hy + 5, 1).fill({ color: 0xaa9944 });

    // ---- Wagon undercarriage ----
    gfx.roundRect(-23, 3, 46, 5, 1).fill({ color: 0x3A2A18 });
    // Cross-brace
    gfx.moveTo(-18, 5).lineTo(18, 8).stroke({ color: 0x4A3A28, width: 1 });
    gfx.moveTo(-18, 8).lineTo(18, 5).stroke({ color: 0x4A3A28, width: 1 });
    // Axles
    gfx.rect(-17, 6, 3, 10).fill({ color: 0x4A3A28 });
    gfx.rect(14, 6, 3, 10).fill({ color: 0x4A3A28 });

    // Wheel rims (static part — spokes drawn in animated layer)
    for (const wx of [-15, 15]) {
      gfx.circle(wx, 17, 8).fill({ color: 0x444444 });
      gfx.circle(wx, 17, 7).fill({ color: 0x5A4A38 });
      gfx.circle(wx, 17, 5.5).fill({ color: 0x6B5A48 });
      gfx.circle(wx, 17, 2.5).fill({ color: 0x8B7355 });
      gfx.circle(wx, 17, 1.2).fill({ color: 0x555544 });
    }

    // ---- Wagon body (planked wood with woodgrain) ----
    gfx.roundRect(-21, -12, 42, 18, 2).fill({ color: 0x8B6914 });
    // Individual planks
    for (let p = -19; p < 19; p += 5) {
      gfx.moveTo(p, -12).lineTo(p, 6).stroke({ color: 0x7A5810, width: 0.4, alpha: 0.6 });
      // Wood grain per plank
      const gy = -8 + (p & 3) * 2;
      gfx.moveTo(p + 1, gy).quadraticCurveTo(p + 2.5, gy - 1, p + 4, gy)
        .stroke({ color: 0x7A5810, width: 0.3, alpha: 0.3 });
    }
    // Metal corner brackets
    for (const [cx, cy] of [[-21, -12], [19, -12], [-21, 4], [19, 4]] as [number, number][]) {
      gfx.roundRect(cx, cy, 4, 4, 1).fill({ color: 0x666666, alpha: 0.5 });
      gfx.circle(cx + 2, cy + 2, 0.8).fill({ color: 0x888888 }); // rivet
    }
    // Metal bands
    gfx.rect(-21, -6, 42, 1.5).fill({ color: 0x666666, alpha: 0.35 });
    gfx.rect(-21, 1, 42, 1.5).fill({ color: 0x666666, alpha: 0.35 });
    // Rivets along bands
    for (let r = -18; r < 18; r += 8) {
      gfx.circle(r, -5.5, 0.6).fill({ color: 0x888888, alpha: 0.5 });
      gfx.circle(r, 1.5, 0.6).fill({ color: 0x888888, alpha: 0.5 });
    }

    // ---- Canvas cover (arched with support hoops) ----
    // Support hoops
    for (const hoop of [-12, 0, 12]) {
      gfx.moveTo(hoop - 1, -12);
      gfx.quadraticCurveTo(hoop - 1, -28, hoop, -30);
      gfx.quadraticCurveTo(hoop + 1, -28, hoop + 1, -12);
      gfx.stroke({ color: 0x8B7355, width: 1.5 });
    }
    // Canvas (draped over hoops)
    gfx.moveTo(-19, -12);
    gfx.bezierCurveTo(-19, -28, -6, -32, 0, -32);
    gfx.bezierCurveTo(6, -32, 19, -28, 19, -12);
    gfx.lineTo(-19, -12);
    gfx.fill({ color: 0xD4C5A0 });
    // Canvas folds / stitching
    gfx.moveTo(-13, -12).quadraticCurveTo(-13, -26, 0, -29).stroke({ color: 0xC4B590, width: 0.5 });
    gfx.moveTo(13, -12).quadraticCurveTo(13, -26, 0, -29).stroke({ color: 0xC4B590, width: 0.5 });
    // Canvas patches (wear detail)
    gfx.ellipse(-6, -20, 3, 2).fill({ color: 0xCCBB99, alpha: 0.3 });
    gfx.ellipse(8, -18, 2, 1.5).fill({ color: 0xBAA988, alpha: 0.3 });

    // ---- Cargo peeking out back ----
    gfx.roundRect(15, -10, 7, 11, 1).fill({ color: 0xAA7733 });
    gfx.rect(16, -9, 5, 2).fill({ color: 0x997722 }); // crate slats
    gfx.rect(16, -5, 5, 2).fill({ color: 0x997722 });
    // Sack
    gfx.ellipse(13, -4, 4, 5).fill({ color: 0xBBAA77 });
    gfx.moveTo(13, -9).lineTo(14, -7).stroke({ color: 0x8B7733, width: 0.5 }); // tie

    // ---- Rope coil on side ----
    for (let r = 0; r < 3; r++) {
      gfx.circle(-20 + r * 1.5, -2 + r * 1.2, 2 - r * 0.3).stroke({ color: 0x8B7733, width: 1 });
    }

    // ---- Canvas tie-down ropes ----
    gfx.moveTo(-16, -10).lineTo(-18, -2).stroke({ color: 0x8B7733, width: 0.7 });
    gfx.moveTo(16, -10).lineTo(18, -2).stroke({ color: 0x8B7733, width: 0.7 });
    gfx.moveTo(-6, -12).lineTo(-8, -3).stroke({ color: 0x8B7733, width: 0.5, alpha: 0.6 });
    gfx.moveTo(6, -12).lineTo(8, -3).stroke({ color: 0x8B7733, width: 0.5, alpha: 0.6 });

    // ---- Hanging pots (from canvas hoops) ----
    // Pot 1 (left hoop)
    gfx.moveTo(-11, -10).lineTo(-11, -5).stroke({ color: 0x555544, width: 0.5 }); // chain
    gfx.roundRect(-13, -5, 4, 3, 1).fill({ color: 0x555544 }); // pot
    gfx.roundRect(-13, -5, 4, 1, 0.5).fill({ color: 0x666655 }); // rim
    // Pot 2 (right hoop)
    gfx.moveTo(11, -10).lineTo(11, -6).stroke({ color: 0x555544, width: 0.5 });
    gfx.ellipse(11, -4, 2.5, 2).fill({ color: 0x665544 }); // pan

    // ---- Side lantern (detailed) ----
    gfx.rect(-22, -8, 2, 5).fill({ color: 0x555544 }); // bracket
    gfx.roundRect(-26, -11, 6, 8, 1.5).fill({ color: 0x444433 }); // lantern frame
    gfx.roundRect(-25, -10, 4, 6, 1).fill({ color: 0x332211 }); // glass
    gfx.roundRect(-25, -10, 4, 6, 1).fill({ color: 0xffcc44, alpha: 0.35 }); // warm glow
    // Lantern top cap
    gfx.moveTo(-23, -11).lineTo(-23, -13).stroke({ color: 0x555544, width: 1.5 });
    // Glow halo (animated in renderCaravan)

    // Animated layer (horse legs + wheel spokes — redrawn each frame)
    this._caravanAnimGfx = new Graphics();
    this.caravanContainer.addChild(this._caravanAnimGfx);

    this.caravanContainer.addChild(gfx);
    this._caravanGfx = gfx;

    // Waving flag
    this._caravanFlag = new Graphics();
    this.caravanContainer.addChild(this._caravanFlag);

    // HP bar above wagon
    this._caravanHpBar = new Graphics();
    this.caravanContainer.addChild(this._caravanHpBar);
  }

  // ---------------------------------------------------------------------------
  // Render methods
  // ---------------------------------------------------------------------------

  renderPlayer(s: CaravanState): void {
    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;
    this.playerContainer.position.set(px, py);

    // Bob shadow slightly
    if (this._playerShadow) {
      this._playerShadow.alpha = 0.25;
    }

    if (this.playerSprite) {
      this.playerSprite.alpha = s.player.invincibilityTimer > 0
        ? 0.4 + Math.sin(s.gameTime * 10) * 0.3
        : 1.0;

      const heroType = s.player.heroClass.unitType;
      const isMoving = s.input.left || s.input.right || s.input.up || s.input.down;
      const isDashing = s.player.dashTimer > 0;
      const isAttacking = s.player.attackTimer > (s.player.attackCooldown - 0.2);
      const isCasting = s.player.abilities.some((a) => a.cooldownTimer > a.def.cooldown - 0.3);

      let animState = UnitState.IDLE;
      if (isCasting) animState = UnitState.CAST;
      else if (isAttacking) animState = UnitState.ATTACK;
      else if (isMoving || isDashing) animState = UnitState.MOVE;

      const targetFrames = animationManager.getFrames(heroType, animState);
      // Fallback to IDLE if no frames for this state
      const frames = targetFrames.length > 0
        ? targetFrames
        : animationManager.getFrames(heroType, UnitState.IDLE);
      if (frames.length > 0 && this.playerSprite.textures !== frames) {
        this.playerSprite.textures = frames;
        this.playerSprite.play();
      }

      // Face direction: toward nearest enemy when attacking, or toward input direction
      if (isAttacking && s.enemies.length > 0) {
        const nearest = s.enemies.find((e) => e.alive);
        if (nearest) {
          const facingLeft = nearest.position.x < s.player.position.x;
          this.playerSprite.scale.x = facingLeft
            ? -Math.abs(this.playerSprite.scale.x)
            : Math.abs(this.playerSprite.scale.x);
        }
      } else if (s.input.left) {
        this.playerSprite.scale.x = -Math.abs(this.playerSprite.scale.x);
      } else if (s.input.right) {
        this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x);
      }

      // Dash trail effect: spawn dust
      if (isDashing && Math.random() < 0.5) {
        this.spawnDust(px, py + 4, (Math.random() - 0.5) * 20, -10 - Math.random() * 10);
      }
    }
  }

  renderCaravan(s: CaravanState): void {
    if (!this._caravanGfx) return;

    const baseX = s.caravan.position.x * TS;
    const baseY = s.caravan.position.y * TS;
    const hpRatio = s.caravan.hp / s.caravan.maxHp;

    // Shake when under attack
    let shakeX = 0, shakeY = 0;
    const underAttack = s.enemies.some((e) =>
      e.alive && Math.abs(e.position.x - s.caravan.position.x) < 3 &&
      Math.abs(e.position.y - s.caravan.position.y) < 3,
    );
    if (underAttack && hpRatio < 0.6) {
      shakeX = Math.sin(s.gameTime * 12) * 2;
      shakeY = Math.cos(s.gameTime * 15) * 1.5;
    }

    // Suspension bob (wagon bounces slightly when moving)
    const isMoving = !s.holdPosition && !s.bossActive && s.phase === "travel";
    const suspensionBob = isMoving ? Math.sin(s.gameTime * 4.5) * 1.5 : 0;

    this.caravanContainer.position.set(baseX + shakeX, baseY + shakeY + suspensionBob);

    // Damage states
    if (hpRatio < 0.25) {
      this._caravanGfx.alpha = 0.5 + Math.sin(s.gameTime * 10) * 0.3;
      this._caravanGfx.tint = 0xff4444;
    } else if (hpRatio < 0.5) {
      this._caravanGfx.alpha = 0.7 + Math.sin(s.gameTime * 5) * 0.2;
      this._caravanGfx.tint = 0xffaa66;
    } else {
      this._caravanGfx.alpha = 1.0;
      this._caravanGfx.tint = 0xffffff;
    }

    // ---- Animated horse legs + wheel spokes ----
    if (this._caravanAnimGfx) {
      this._caravanAnimGfx.clear();
      const isMoving = !s.holdPosition && !s.bossActive && s.phase === "travel";
      const hx = -38;
      const hy = -2;
      const t = s.gameTime;

      // Horse legs — 4 legs with gallop animation
      const legPositions = [
        { x: hx - 6, phase: 0 },       // front-left
        { x: hx - 3, phase: Math.PI },  // front-right (opposite phase)
        { x: hx + 5, phase: Math.PI * 0.5 },  // back-left
        { x: hx + 8, phase: Math.PI * 1.5 },  // back-right
      ];
      const legSpeed = 6; // animation speed
      const legSwing = isMoving ? 4 : 0; // how far legs move

      for (const leg of legPositions) {
        const swing = Math.sin(t * legSpeed + leg.phase) * legSwing;
        const lx = leg.x + swing * 0.3;
        const ly = hy + 5;
        const footY = ly + 9 + (isMoving ? Math.abs(Math.sin(t * legSpeed + leg.phase)) * -2 : 0);
        // Upper leg
        this._caravanAnimGfx.moveTo(lx + 1, ly).lineTo(lx + 1 + swing * 0.5, (ly + footY) / 2)
          .stroke({ color: 0x5A3818, width: 2.5 });
        // Lower leg
        this._caravanAnimGfx.moveTo(lx + 1 + swing * 0.5, (ly + footY) / 2)
          .lineTo(lx + 1 + swing * 0.2, footY)
          .stroke({ color: 0x5A3818, width: 2 });
        // Hoof
        this._caravanAnimGfx.rect(lx + swing * 0.2 - 0.5, footY, 3, 2).fill({ color: 0x3A2211 });
      }

      // Animated mane strands (flowing in wind/movement)
      const maneWave = isMoving ? Math.sin(t * 5) * 3 : Math.sin(t * 1.5) * 0.8;
      for (let m = 0; m < 4; m++) {
        const mx = hx - 10 + m * 2;
        const my = hy - 14 + m * 2;
        this._caravanAnimGfx.moveTo(mx, my)
          .quadraticCurveTo(mx + maneWave + m, my + 4, mx + maneWave * 1.3 + m * 0.5, my + 8)
          .stroke({ color: 0x3A2211, width: 1.2, alpha: 0.6 });
      }

      // Animated tail (sways with movement)
      const tailWave1 = Math.sin(t * 3) * (isMoving ? 5 : 2);
      const tailWave2 = Math.sin(t * 3 + 1) * (isMoving ? 4 : 1.5);
      this._caravanAnimGfx.moveTo(hx + 11, hy - 2);
      this._caravanAnimGfx.quadraticCurveTo(hx + 14 + tailWave1, hy + 3, hx + 12 + tailWave2, hy + 10);
      this._caravanAnimGfx.stroke({ color: 0x3A2211, width: 2 });
      // Tail hair strands
      this._caravanAnimGfx.moveTo(hx + 12 + tailWave2, hy + 10);
      this._caravanAnimGfx.lineTo(hx + 10 + tailWave2 * 1.2, hy + 14);
      this._caravanAnimGfx.stroke({ color: 0x3A2211, width: 1 });
      this._caravanAnimGfx.moveTo(hx + 12 + tailWave2, hy + 10);
      this._caravanAnimGfx.lineTo(hx + 14 + tailWave2 * 0.8, hy + 13);
      this._caravanAnimGfx.stroke({ color: 0x3A2211, width: 0.8 });

      // Breath steam in cold biome (check biome via tint)
      if (isMoving && this._caravanGfx?.tint === 0xffffff) {
        // Only spawn breath occasionally
        if (Math.sin(t * 2) > 0.8) {
          this._caravanAnimGfx.circle(hx - 20 + Math.sin(t * 4) * 2, hy - 17, 2 + Math.sin(t * 3) * 1)
            .fill({ color: 0xddddee, alpha: 0.06 });
        }
      }

      // Wheel spokes (rotating)
      const wheelRotation = isMoving ? s.caravan.position.x * 0.5 : 0;
      for (const wx of [-15, 15]) {
        for (let sp = 0; sp < 8; sp++) {
          const angle = (sp / 8) * Math.PI * 2 + wheelRotation;
          const sx = wx + Math.cos(angle) * 6;
          const sy = 17 + Math.sin(angle) * 6;
          this._caravanAnimGfx.moveTo(wx, 17).lineTo(sx, sy).stroke({ color: 0x7A6A4A, width: 0.8 });
        }
      }

      // Lantern glow pulse
      const glowAlpha = 0.12 + Math.sin(t * 2) * 0.06;
      const glowR = 12 + Math.sin(t * 3) * 3;
      this._caravanAnimGfx.circle(-23, -7, glowR).fill({ color: 0xffcc44, alpha: glowAlpha });

      // Hold position: draw brake blocks under wheels
      if (s.holdPosition) {
        this._caravanAnimGfx.moveTo(-18, 22).lineTo(-12, 18).stroke({ color: 0x666655, width: 2.5 });
        this._caravanAnimGfx.moveTo(12, 22).lineTo(18, 18).stroke({ color: 0x666655, width: 2.5 });
        this._caravanAnimGfx.rect(-19, 21, 3, 3).fill({ color: 0x555544 }); // brake block
        this._caravanAnimGfx.rect(17, 21, 3, 3).fill({ color: 0x555544 });
      }
    }

    // Animated flag
    if (this._caravanFlag) {
      this._caravanFlag.clear();
      // Pole
      this._caravanFlag.moveTo(0, -28).lineTo(0, -44).stroke({ color: 0x8B7355, width: 2 });
      // Waving banner
      const wave1 = Math.sin(s.gameTime * 3) * 3;
      const wave2 = Math.sin(s.gameTime * 3 + 1) * 2;
      this._caravanFlag.moveTo(0, -44);
      this._caravanFlag.quadraticCurveTo(6 + wave1, -42, 12 + wave2, -40);
      this._caravanFlag.lineTo(12 + wave1, -34);
      this._caravanFlag.quadraticCurveTo(6 + wave2, -36, 0, -38);
      this._caravanFlag.fill({ color: s.holdPosition ? 0xcc4444 : 0x3366aa });
    }

    // HP bar above wagon
    if (this._caravanHpBar) {
      this._caravanHpBar.clear();
      const barW = 50;
      const barH = 4;
      const barY = -50;
      this._caravanHpBar.roundRect(-barW / 2, barY, barW, barH, 2).fill({ color: 0x220000, alpha: 0.6 });
      const fillColor = hpRatio > 0.5 ? 0xcc8833 : hpRatio > 0.25 ? 0xcc5500 : 0xcc0000;
      this._caravanHpBar.roundRect(-barW / 2, barY, barW * hpRatio, barH, 2).fill({ color: fillColor });
      this._caravanHpBar.roundRect(-barW / 2, barY, barW, barH, 2).stroke({ color: 0x444444, width: 0.5 });
    }

    // Wheel dust (when moving)
    if (!s.holdPosition && s.phase === "travel" && Math.random() < 0.15) {
      this.spawnDust(baseX - 16, baseY + 16, -5 - Math.random() * 5, -2 + Math.random() * 4);
      if (Math.random() < 0.3) {
        this.spawnDust(baseX + 16, baseY + 16, -3 - Math.random() * 3, -2 + Math.random() * 4);
      }
    }
  }

  renderEscorts(s: CaravanState): void {
    const activeIds = new Set<number>();

    for (const escort of s.escorts) {
      if (!escort.alive) continue;
      activeIds.add(escort.id);

      let view = this._escortViews.get(escort.id);
      if (!view) {
        view = this._createEscortView(escort);
        this._escortViews.set(escort.id, view);
        this.escortContainer.addChild(view.container);
      }

      view.container.position.set(escort.position.x * TS, escort.position.y * TS);

      // Animate sprite state + facing
      if (view.sprite) {
        const isMoving = Math.abs(escort.position.x - view.lastX) > 0.01;
        const isAttacking = escort.attackTimer > (escort.attackCooldown - 0.15);
        let state = UnitState.IDLE;
        if (isAttacking) state = UnitState.ATTACK;
        else if (isMoving) state = UnitState.MOVE;

        const frames = animationManager.getFrames(view.unitType, state);
        const fallback = frames.length > 0 ? frames : animationManager.getFrames(view.unitType, UnitState.IDLE);
        if (fallback.length > 0 && view.sprite.textures !== fallback) {
          view.sprite.textures = fallback;
          view.sprite.play();
        }
        // Face direction
        const dx = escort.position.x - view.lastX;
        if (Math.abs(dx) > 0.005) {
          view.sprite.scale.x = dx < 0 ? -Math.abs(view.sprite.scale.x) : Math.abs(view.sprite.scale.x);
        }
      }
      view.lastX = escort.position.x;

      // Hit flash
      if (escort.hitTimer > 0) {
        const t = escort.hitTimer / 0.15;
        view.container.scale.set(1 + t * 0.1);
        view.container.alpha = 0.6 + t * 0.4;
      } else {
        view.container.scale.set(1);
        view.container.alpha = 1.0;
      }

      // HP bar
      const hpRatio = escort.hp / escort.maxHp;
      view.hpBar.clear();
      const barW = 22;
      view.hpBar.roundRect(-barW / 2, -24, barW, 3, 1).fill({ color: 0x220022, alpha: 0.5 });
      view.hpBar.roundRect(-barW / 2, -24, barW * hpRatio, 3, 1)
        .fill({ color: hpRatio > 0.5 ? 0x44dd44 : hpRatio > 0.25 ? 0xddaa00 : 0xdd4444 });
    }

    for (const [id, view] of this._escortViews) {
      if (!activeIds.has(id)) {
        this.escortContainer.removeChild(view.container);
        view.container.destroy({ children: true });
        this._escortViews.delete(id);
      }
    }
  }

  renderEnemies(s: CaravanState): void {
    const activeIds = new Set<number>();

    for (const enemy of s.enemies) {
      if (!enemy.alive && enemy.deathTimer <= 0) continue;
      activeIds.add(enemy.id);

      let view = this._enemyViews.get(enemy.id);
      if (!view) {
        view = this._createEnemyView(enemy);
        this._enemyViews.set(enemy.id, view);
        this.enemyContainer.addChild(view.container);
      }

      view.container.position.set(enemy.position.x * TS, enemy.position.y * TS);

      // Animate sprite state + facing
      if (view.sprite && enemy.alive) {
        const isMoving = Math.abs(enemy.position.x - view.lastX) > 0.01;
        const isAttacking = enemy.attackTimer > (enemy.attackCooldown - 0.15);
        const isStunned = enemy.stunTimer > 0;
        let animState = UnitState.IDLE;
        if (isStunned) animState = UnitState.IDLE; // stunned = frozen
        else if (isAttacking) animState = UnitState.ATTACK;
        else if (isMoving) animState = UnitState.MOVE;

        const frames = animationManager.getFrames(view.unitType, animState);
        const fallback = frames.length > 0 ? frames : animationManager.getFrames(view.unitType, UnitState.IDLE);
        if (fallback.length > 0 && view.sprite.textures !== fallback) {
          view.sprite.textures = fallback;
          view.sprite.play();
        }
        // Face direction of movement
        const dx = enemy.position.x - view.lastX;
        if (Math.abs(dx) > 0.005) {
          view.sprite.scale.x = dx < 0
            ? -Math.abs(view.sprite.scale.x)
            : Math.abs(view.sprite.scale.x);
        }
        // Stun visual: slow animation + tint
        if (isStunned) {
          view.sprite.animationSpeed = 0.04;
          view.sprite.tint = 0x8888ff;
        } else {
          view.sprite.animationSpeed = 0.12;
          view.sprite.tint = 0xffffff;
        }
      }
      // Movement dust for enemies
      if (enemy.alive && Math.abs(enemy.position.x - view.lastX) > 0.02) {
        this.spawnMovementDust(enemy.position.x * TS, enemy.position.y * TS);
      }
      view.lastX = enemy.position.x;

      if (!enemy.alive) {
        const t = enemy.deathTimer / 0.4;
        view.container.alpha = t;
        view.container.scale.set(0.5 + t * 0.5);
        view.shadow.alpha = t * 0.2;
      } else if (enemy.hitTimer > 0) {
        const hitT = enemy.hitTimer / 0.15;
        view.container.scale.set(1 + hitT * 0.15);
        view.container.alpha = 0.6 + hitT * 0.4;
      } else {
        view.container.alpha = 1.0;
        view.container.scale.set(1);
      }

      // HP bar
      if (enemy.alive) {
        const hpRatio = enemy.hp / enemy.maxHp;
        view.hpBar.clear();
        const barW = enemy.isBoss ? 44 : 22;
        view.hpBar.roundRect(-barW / 2, -26, barW, 3, 1).fill({ color: 0x220000, alpha: 0.5 });
        view.hpBar.roundRect(-barW / 2, -26, barW * hpRatio, 3, 1)
          .fill({ color: enemy.isBoss ? 0xff8800 : 0xdd3333 });
        // Boss: thicker bar with border
        if (enemy.isBoss) {
          view.hpBar.roundRect(-barW / 2, -26, barW, 3, 1).stroke({ color: 0xffaa44, width: 0.5 });
        }
      }
    }

    for (const [id, view] of this._enemyViews) {
      if (!activeIds.has(id)) {
        this.enemyContainer.removeChild(view.container);
        view.container.destroy({ children: true });
        this._enemyViews.delete(id);
      }
    }
  }

  renderLoot(s: CaravanState): void {
    const activeIds = new Set<number>();

    for (const loot of s.loot) {
      if (!loot.alive) continue;
      activeIds.add(loot.id);

      let view = this._lootViews.get(loot.id);
      if (!view) {
        const gfx = new Graphics();
        // Gold coin (detailed with bevel and texture)
        // Shadow underneath
        gfx.ellipse(1, 2, 5, 2.5).fill({ color: 0x000000, alpha: 0.15 });
        // Coin body
        gfx.circle(0, 0, 5.5).fill({ color: 0xddaa00 }); // dark edge
        gfx.circle(0, 0, 5).fill({ color: 0xffd700 }); // main
        // Bevel ring
        gfx.circle(0, 0, 4.2).stroke({ color: 0xffee88, width: 0.5, alpha: 0.4 });
        // Inner texture dots (coin pattern)
        for (let d = 0; d < 6; d++) {
          const da = (d / 6) * Math.PI * 2;
          gfx.circle(Math.cos(da) * 2.5, Math.sin(da) * 2.5, 0.6)
            .fill({ color: 0xeebb33, alpha: 0.35 });
        }
        // Highlight (top-left)
        gfx.circle(-1.5, -1.5, 2).fill({ color: 0xffee66, alpha: 0.5 });
        gfx.circle(-2, -2, 0.8).fill({ color: 0xffffff, alpha: 0.4 }); // bright spot
        // Outer stroke
        gfx.circle(0, 0, 5.5).stroke({ color: 0xaa7700, width: 0.6 });
        // Sparkle
        const sparkle = new Graphics();
        this.lootContainer.addChild(gfx);
        this.lootContainer.addChild(sparkle);
        view = { gfx, sparkle };
        this._lootViews.set(loot.id, view);
      }

      view.gfx.position.set(loot.position.x * TS, loot.position.y * TS);
      // Bobbing animation
      view.gfx.position.y += Math.sin(s.gameTime * 4 + loot.id) * 2;
      // Despawn fade: start blinking at 3s remaining, fade at 1.5s
      if (loot.lifetime < 1.5) {
        view.gfx.alpha = loot.lifetime / 1.5;
      } else if (loot.lifetime < 3) {
        view.gfx.alpha = 0.5 + Math.sin(s.gameTime * 8) * 0.3;
      } else {
        view.gfx.alpha = 1;
      }

      // Sparkle effect
      view.sparkle.clear();
      const sparkleAlpha = 0.3 + Math.sin(s.gameTime * 6 + loot.id * 2) * 0.3;
      if (sparkleAlpha > 0.3) {
        const sx = loot.position.x * TS;
        const sy = loot.position.y * TS - 2 + Math.sin(s.gameTime * 4 + loot.id) * 2;
        // Multi-layer sparkle with 8-point star
        const sa2 = s.gameTime * 2 + loot.id; // rotation angle
        // Outer glow ring
        view.sparkle.circle(sx, sy, 5).fill({ color: 0xffd700, alpha: sparkleAlpha * 0.08 });
        // 8-point star (long + short spikes alternating)
        for (let sp = 0; sp < 8; sp++) {
          const angle = (sp / 8) * Math.PI * 2 + sa2;
          const len = sp % 2 === 0 ? 4 : 2.5;
          view.sparkle.moveTo(sx, sy)
            .lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
            .stroke({ color: 0xffffff, width: sp % 2 === 0 ? 0.8 : 0.5, alpha: sparkleAlpha * 0.5 });
        }
        // Inner bright core
        view.sparkle.circle(sx, sy, 1.5).fill({ color: 0xffffff, alpha: sparkleAlpha * 0.6 });
      }
    }

    for (const [id, view] of this._lootViews) {
      if (!activeIds.has(id)) {
        this.lootContainer.removeChild(view.gfx);
        this.lootContainer.removeChild(view.sparkle);
        view.gfx.destroy();
        view.sparkle.destroy();
        this._lootViews.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Dust particle system
  // ---------------------------------------------------------------------------

  /** Spawn dust particle with color variant */
  spawnDust(x: number, y: number, vx: number, vy: number, color = 0x8B7355): void {
    if (this._dustParticles.length > 200) return;
    const r = 1.5 + Math.random() * 3.5;
    const c = colorShift(color, 15, Math.random());
    const gfx = new Graphics().circle(0, 0, r).fill({ color: c, alpha: 0.35 + Math.random() * 0.15 });
    gfx.position.set(x, y);
    this.dustContainer.addChild(gfx);
    const life = 0.5 + Math.random() * 0.5;
    this._dustParticles.push({ gfx, x, y, vx, vy, life, maxLife: life });
  }

  /** Spawn dust trail for an entity at world position */
  spawnMovementDust(worldX: number, worldY: number): void {
    if (Math.random() > 0.3) return;
    this.spawnDust(
      worldX + (Math.random() - 0.5) * 6,
      worldY + 4,
      (Math.random() - 0.5) * 8,
      -3 - Math.random() * 5,
      0x7A6A4A,
    );
  }

  /** Spawn ambient atmosphere particles (mist, pollen, etc.) */
  spawnAmbientParticle(caravanX: number, mapHeight: number): void {
    if (this._dustParticles.length > 120) return; // leave room for combat dust
    if (Math.random() > 0.03) return; // sparse spawning

    const x = caravanX + (Math.random() - 0.5) * 600; // wide scatter around caravan
    const y = Math.random() * mapHeight * TS;
    const type = Math.random();

    if (type < 0.4) {
      // Floating mist wisp — very faint, slow, long-lived
      const gfx = new Graphics().circle(0, 0, 3 + Math.random() * 4)
        .fill({ color: 0xaabbcc, alpha: 0.04 + Math.random() * 0.04 });
      gfx.position.set(x, y);
      this.dustContainer.addChild(gfx);
      const life = 3 + Math.random() * 3;
      this._dustParticles.push({
        gfx, x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -1 - Math.random() * 2,
        life, maxLife: life,
      });
    } else if (type < 0.7) {
      // Pollen/dust mote — tiny, drifting upward
      const gfx = new Graphics().circle(0, 0, 0.8 + Math.random() * 1)
        .fill({ color: 0xddcc88, alpha: 0.15 + Math.random() * 0.1 });
      gfx.position.set(x, y);
      this.dustContainer.addChild(gfx);
      const life = 2 + Math.random() * 2;
      this._dustParticles.push({
        gfx, x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: -4 - Math.random() * 3,
        life, maxLife: life,
      });
    } else {
      // Light ray sparkle — brief flash
      const gfx = new Graphics().circle(0, 0, 1 + Math.random() * 1.5)
        .fill({ color: 0xffffff, alpha: 0.06 + Math.random() * 0.06 });
      gfx.position.set(x, y);
      this.dustContainer.addChild(gfx);
      const life = 1 + Math.random() * 1;
      this._dustParticles.push({
        gfx, x, y,
        vx: 0,
        vy: -1,
        life, maxLife: life,
      });
    }
  }

  updateDust(dt: number): void {
    for (let i = this._dustParticles.length - 1; i >= 0; i--) {
      const p = this._dustParticles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 5 * dt; // slight upward drift
      p.gfx.position.set(p.x, p.y);
      p.gfx.alpha = Math.max(0, (p.life / p.maxLife) * 0.4);
      p.gfx.scale.set(1 + (1 - p.life / p.maxLife) * 0.5); // expand as fading

      if (p.life <= 0) {
        this.dustContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this._dustParticles.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Entity creation
  // ---------------------------------------------------------------------------

  private _createEnemyView(enemy: CaravanEnemy): EnemyView {
    const container = new Container();

    // Shadow
    const shadowR = enemy.isBoss ? 18 : 10;
    const shadow = new Graphics().ellipse(0, 4, shadowR, shadowR * 0.35).fill({ color: 0x000000, alpha: 0.2 });
    container.addChild(shadow);

    const frames = animationManager.getFrames(enemy.unitType, UnitState.IDLE);
    let sprite: AnimatedSprite | null = null;

    if (frames.length > 0) {
      sprite = new AnimatedSprite(frames);
      sprite.animationSpeed = 0.12;
      sprite.play();
      sprite.anchor.set(0.5, 0.75);
      sprite.scale.set(enemy.isBoss ? 1.8 : 1.2);
      container.addChild(sprite);
    } else {
      // Procedural enemy based on type
      const gfx = _drawProceduralEnemy(enemy);
      container.addChild(gfx);
    }

    const hpBar = new Graphics();
    container.addChild(hpBar);

    // Boss name tag
    let nameTag: Text | null = null;
    if (enemy.isBoss) {
      nameTag = new Text({
        text: enemy.displayName,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xff8844, fontWeight: "bold", stroke: { color: 0x000000, width: 2 } }),
      });
      nameTag.anchor.set(0.5, 1);
      nameTag.position.set(0, -32);
      container.addChild(nameTag);
    }

    return { container, sprite, shadow, hpBar, nameTag, lastX: 0, unitType: enemy.unitType };
  }

  private _createEscortView(escort: CaravanEscort): EscortView {
    const container = new Container();

    // Shadow
    const shadow = new Graphics().ellipse(0, 4, 10, 3.5).fill({ color: 0x000000, alpha: 0.2 });
    container.addChild(shadow);

    const frames = animationManager.getFrames(escort.def.unitType, UnitState.IDLE);
    let sprite: AnimatedSprite | null = null;

    if (frames.length > 0) {
      sprite = new AnimatedSprite(frames);
      sprite.animationSpeed = 0.12;
      sprite.play();
      sprite.anchor.set(0.5, 0.75);
      sprite.scale.set(1.2);
      container.addChild(sprite);
    } else {
      const gfx = _drawProceduralEscort(escort.def.isRanged);
      container.addChild(gfx);
    }

    const hpBar = new Graphics();
    container.addChild(hpBar);

    return { container, sprite, shadow, hpBar, lastX: 0, unitType: escort.def.unitType, isRanged: escort.def.isRanged };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  cleanup(): void {
    for (const [, view] of this._enemyViews) view.container.destroy({ children: true });
    for (const [, view] of this._escortViews) view.container.destroy({ children: true });
    for (const [, view] of this._lootViews) {
      view.gfx.destroy();
      view.sparkle.destroy();
    }
    for (const p of this._dustParticles) p.gfx.destroy();
    this._enemyViews.clear();
    this._escortViews.clear();
    this._lootViews.clear();
    this._dustParticles = [];
    this.playerSprite = null;
    this._caravanGfx = null;
    this._caravanFlag = null;
    this._caravanShadow = null;
    this._caravanHpBar = null;
    this._playerShadow = null;
    this.worldLayer.removeChildren();
  }
}

// ---------------------------------------------------------------------------
// Procedural hero drawing (when no spritesheet)
// ---------------------------------------------------------------------------

function _drawProceduralHero(unitType: UnitType): Graphics {
  const g = new Graphics();

  // Determine class colors from unitType
  const isRanged = unitType === UnitType.LONGBOWMAN || unitType === UnitType.FIRE_MAGE;
  const isMage = unitType === UnitType.FIRE_MAGE;
  const isPaladin = unitType === UnitType.TEMPLAR;

  const armorColor = isMage ? 0x4433aa : isPaladin ? 0xbbaa44 : isRanged ? 0x447744 : 0x4466aa;
  const helmColor = isMage ? 0x6655cc : isPaladin ? 0xccbb66 : 0x889999;
  const capeColor = isMage ? 0x553399 : isPaladin ? 0xaa9933 : isRanged ? 0x336633 : 0x334488;

  // Cape (behind body)
  g.moveTo(-6, -20).quadraticCurveTo(-8, -6, -4, 6).lineTo(4, 6)
    .quadraticCurveTo(8, -6, 6, -20).fill({ color: capeColor, alpha: 0.7 });
  // Cape trim
  g.moveTo(-4, 6).lineTo(4, 6).stroke({ color: colorShift(capeColor, 30, 0.3), width: 1 });

  // Boots
  g.roundRect(-7, 0, 5, 5, 1).fill({ color: 0x443322 });
  g.roundRect(2, 0, 5, 5, 1).fill({ color: 0x443322 });
  // Boot cuffs
  g.rect(-7, 0, 5, 1.5).fill({ color: 0x554433 });
  g.rect(2, 0, 5, 1.5).fill({ color: 0x554433 });
  // Legs
  g.rect(-6, -6, 5, 7).fill({ color: 0x555566 });
  g.rect(1, -6, 5, 7).fill({ color: 0x555566 });
  // Knee guards
  g.ellipse(-3.5, -4, 3, 2).fill({ color: 0x666677, alpha: 0.5 });
  g.ellipse(3.5, -4, 3, 2).fill({ color: 0x666677, alpha: 0.5 });

  // Body armor (torso)
  g.roundRect(-8, -24, 16, 20, 3).fill({ color: armorColor });
  // Chest plate detail
  g.moveTo(0, -22).lineTo(-4, -16).lineTo(0, -10).lineTo(4, -16).closePath()
    .fill({ color: colorShift(armorColor, 25, 0.7), alpha: 0.4 });
  // Belt
  g.rect(-8, -7, 16, 2.5).fill({ color: 0x6B5310 });
  g.circle(0, -5.5, 1.5).fill({ color: 0xccaa44 }); // buckle
  // Shoulder pauldrons
  g.ellipse(-9, -20, 4, 3).fill({ color: colorShift(armorColor, 15, 0.6) });
  g.ellipse(9, -20, 4, 3).fill({ color: colorShift(armorColor, 15, 0.6) });
  // Pauldron rivet
  g.circle(-9, -20, 0.8).fill({ color: 0x888888, alpha: 0.5 });
  g.circle(9, -20, 0.8).fill({ color: 0x888888, alpha: 0.5 });

  // Neck
  g.rect(-3, -27, 6, 4).fill({ color: 0xCCAA88 }); // skin

  // Helm
  g.roundRect(-7, -35, 14, 10, 4).fill({ color: helmColor });
  // Visor
  g.rect(-5, -31, 10, 2.5).fill({ color: 0x222222 });
  // Helm crest
  g.moveTo(0, -37).lineTo(-2, -35).lineTo(2, -35).closePath().fill({ color: 0xcc3333 });
  // Helm highlight
  g.ellipse(-2, -34, 3, 1.5).fill({ color: 0xffffff, alpha: 0.12 });

  // Weapon (class-dependent)
  if (isMage) {
    // Staff
    g.rect(11, -34, 2, 30).fill({ color: 0x6B5310 });
    // Staff orb
    g.circle(12, -36, 4).fill({ color: 0x8844ff, alpha: 0.6 });
    g.circle(12, -36, 2.5).fill({ color: 0xaa66ff, alpha: 0.8 });
    g.circle(11.5, -37, 1).fill({ color: 0xffffff, alpha: 0.4 });
  } else if (isRanged) {
    // Longbow
    g.moveTo(10, -30).quadraticCurveTo(18, -18, 10, -4).stroke({ color: 0x8B6914, width: 2 });
    // Bowstring
    g.moveTo(10, -30).lineTo(10, -4).stroke({ color: 0xcccccc, width: 0.5 });
    // Quiver on back
    g.roundRect(-12, -22, 4, 14, 1).fill({ color: 0x7A5533 });
    // Arrow fletching
    g.moveTo(-11, -24).lineTo(-10, -28).stroke({ color: 0xcccccc, width: 0.5 });
    g.moveTo(-10, -24).lineTo(-9, -27).stroke({ color: 0xcccccc, width: 0.5 });
  } else if (isPaladin) {
    // Warhammer
    g.rect(10, -30, 2.5, 22).fill({ color: 0xAA9944 });
    g.roundRect(7, -32, 9, 5, 1).fill({ color: 0x888888 }); // hammer head
    g.rect(7, -31, 9, 1).fill({ color: 0xaaaaaa, alpha: 0.3 }); // highlight
    // Shield (holy emblem)
    g.moveTo(-16, -22).lineTo(-10, -22).lineTo(-10, -12).lineTo(-13, -9).lineTo(-16, -12)
      .closePath().fill({ color: 0xddcc44 });
    g.moveTo(-13, -20).lineTo(-13, -12).stroke({ color: 0xffffff, width: 1 }); // cross
    g.moveTo(-15, -16).lineTo(-11, -16).stroke({ color: 0xffffff, width: 1 }); // cross
  } else {
    // Sword
    g.rect(10, -32, 2.5, 24).fill({ color: 0xcccccc });
    // Fuller (groove)
    g.rect(10.5, -30, 1.5, 18).fill({ color: 0xaaaaaa, alpha: 0.4 });
    // Crossguard
    g.roundRect(7, -10, 9, 2.5, 1).fill({ color: 0x8B6914 });
    // Pommel
    g.circle(11.2, -7, 1.5).fill({ color: 0x8B6914 });
    // Shield
    g.moveTo(-16, -22).lineTo(-10, -22).lineTo(-10, -12).lineTo(-13, -9).lineTo(-16, -12)
      .closePath().fill({ color: 0x2244aa });
    g.moveTo(-14, -20).lineTo(-12, -20).lineTo(-12, -14).lineTo(-14, -14)
      .closePath().fill({ color: 0xffd700, alpha: 0.5 }); // emblem
    // Shield rim
    g.moveTo(-16, -22).lineTo(-10, -22).lineTo(-10, -12).lineTo(-13, -9).lineTo(-16, -12)
      .closePath().stroke({ color: 0x333366, width: 0.5 });
  }

  return g;
}

// ---------------------------------------------------------------------------
// Procedural escort drawing
// ---------------------------------------------------------------------------

function _drawProceduralEscort(isRanged: boolean): Graphics {
  const g = new Graphics();
  const ac = isRanged ? 0x446644 : 0x336633;

  // Cloak
  g.moveTo(-5, -16).quadraticCurveTo(-6, -4, -3, 4).lineTo(3, 4)
    .quadraticCurveTo(6, -4, 5, -16).fill({ color: 0x224422, alpha: 0.6 });
  // Boots
  g.roundRect(-5, 0, 4, 4, 1).fill({ color: 0x443322 });
  g.roundRect(1, 0, 4, 4, 1).fill({ color: 0x443322 });
  // Legs
  g.rect(-5, -4, 4, 5).fill({ color: 0x445544 });
  g.rect(1, -4, 4, 5).fill({ color: 0x445544 });
  // Body
  g.roundRect(-6, -18, 12, 15, 2).fill({ color: ac });
  // Belt
  g.rect(-6, -5, 12, 2).fill({ color: 0x5A4A22 });
  // Shoulders
  g.ellipse(-7, -15, 3, 2).fill({ color: colorShift(ac, 15, 0.6) });
  g.ellipse(7, -15, 3, 2).fill({ color: colorShift(ac, 15, 0.6) });
  // Neck
  g.rect(-2, -21, 4, 3).fill({ color: 0xCCAA88 });
  // Helm (open-face)
  g.roundRect(-5, -27, 10, 8, 3).fill({ color: 0x667766 });
  // Face
  g.rect(-3, -24, 6, 4).fill({ color: 0xCCAA88 });
  // Eyes
  g.circle(-1.5, -22.5, 0.8).fill({ color: 0x333322 });
  g.circle(1.5, -22.5, 0.8).fill({ color: 0x333322 });

  if (isRanged) {
    // Bow
    g.moveTo(8, -22).quadraticCurveTo(14, -14, 8, -4).stroke({ color: 0x8B6914, width: 1.5 });
    g.moveTo(8, -22).lineTo(8, -4).stroke({ color: 0xbbbbbb, width: 0.4 });
    // Quiver
    g.roundRect(-9, -18, 3, 10, 1).fill({ color: 0x7A5533 });
  } else {
    // Sword + shield
    g.rect(8, -24, 2, 16).fill({ color: 0xaaaaaa });
    g.roundRect(6, -10, 6, 2, 1).fill({ color: 0x7A5533 });
    // Small shield
    g.roundRect(-12, -18, 6, 10, 2).fill({ color: 0x336633 });
    g.rect(-11, -16, 4, 1).fill({ color: 0xffffff, alpha: 0.2 });
  }

  return g;
}

// ---------------------------------------------------------------------------
// Procedural enemy drawing (when no spritesheet)
// ---------------------------------------------------------------------------

function _drawProceduralEnemy(enemy: CaravanEnemy): Graphics {
  const g = new Graphics();
  const boss = enemy.isBoss;
  const s = boss ? 1.4 : 1.0;

  const name = enemy.defName;

  // Wolf — quadruped animal
  if (name === "Wolf") {
    return _drawWolf(g, s);
  }
  // Dragon — winged beast
  if (name === "Dragon") {
    return _drawDragon(g, s);
  }
  // Troll — large hulking creature
  if (name === "Troll") {
    return _drawTroll(g, s);
  }

  // Default: humanoid enemies (bandits, brigands, marauders, etc.)
  const colors: Record<string, { body: number; skin: number; accent: number }> = {
    "Bandit":        { body: 0x6B4422, skin: 0xCCAA88, accent: 0x884422 },
    "Bandit Archer": { body: 0x6B5533, skin: 0xCCAA88, accent: 0x886633 },
    "Brigand":       { body: 0x553322, skin: 0xBB9977, accent: 0x774422 },
    "Marauder":      { body: 0x443333, skin: 0xBB9977, accent: 0x993333 },
    "Bandit Lord":   { body: 0x661111, skin: 0xCCAA88, accent: 0xaa4411 },
    "Dark Knight":   { body: 0x222233, skin: 0x999999, accent: 0x333344 },
  };
  const col = colors[name] ?? { body: 0x6B4422, skin: 0xCCAA88, accent: 0x884422 };

  // Cape/cloak
  if (boss) {
    g.moveTo(-6 * s, -18 * s).quadraticCurveTo(-10 * s, -2 * s, -5 * s, 6 * s)
      .lineTo(5 * s, 6 * s).quadraticCurveTo(10 * s, -2 * s, 6 * s, -18 * s)
      .fill({ color: col.accent, alpha: 0.6 });
  }
  // Boots
  g.roundRect(-6 * s, 0, 5 * s, 4 * s, 1).fill({ color: 0x3A2211 });
  g.roundRect(1 * s, 0, 5 * s, 4 * s, 1).fill({ color: 0x3A2211 });
  // Legs
  g.rect(-5 * s, -5 * s, 4 * s, 6 * s).fill({ color: col.body });
  g.rect(1 * s, -5 * s, 4 * s, 6 * s).fill({ color: col.body });
  // Body
  g.roundRect(-7 * s, -20 * s, 14 * s, 16 * s, 2).fill({ color: col.body });
  // Belt
  g.rect(-7 * s, -6 * s, 14 * s, 2 * s).fill({ color: 0x4A3A22 });
  // Shoulders
  g.ellipse(-8 * s, -17 * s, 3 * s, 2 * s).fill({ color: col.accent });
  g.ellipse(8 * s, -17 * s, 3 * s, 2 * s).fill({ color: col.accent });
  // Neck
  g.rect(-2 * s, -23 * s, 4 * s, 3 * s).fill({ color: col.skin });
  // Head
  g.circle(0, -26 * s, 5 * s).fill({ color: col.skin });
  // Hood/helm
  if (name === "Dark Knight") {
    g.roundRect(-5 * s, -31 * s, 10 * s, 8 * s, 3).fill({ color: 0x333344 });
    g.rect(-3 * s, -28 * s, 6 * s, 2 * s).fill({ color: 0x111122 }); // visor
    // Horns
    g.moveTo(-5 * s, -31 * s).lineTo(-7 * s, -36 * s).stroke({ color: 0x333344, width: 1.5 * s });
    g.moveTo(5 * s, -31 * s).lineTo(7 * s, -36 * s).stroke({ color: 0x333344, width: 1.5 * s });
  } else {
    // Hood
    g.moveTo(-5 * s, -23 * s).quadraticCurveTo(0, -33 * s, 5 * s, -23 * s)
      .fill({ color: col.accent, alpha: 0.7 });
    // Eyes
    g.circle(-2 * s, -26 * s, 1 * s).fill({ color: 0xeeeecc });
    g.circle(2 * s, -26 * s, 1 * s).fill({ color: 0xeeeecc });
    g.circle(-2 * s, -26 * s, 0.5 * s).fill({ color: 0x222211 });
    g.circle(2 * s, -26 * s, 0.5 * s).fill({ color: 0x222211 });
    if (boss) {
      // Scar
      g.moveTo(-4 * s, -28 * s).lineTo(-1 * s, -24 * s).stroke({ color: 0xcc6666, width: 0.5 });
    }
  }

  // Weapon
  if (enemy.range > 3) {
    g.moveTo(8 * s, -24 * s).quadraticCurveTo(15 * s, -16 * s, 8 * s, -4 * s)
      .stroke({ color: 0x8B6914, width: 1.5 * s });
    g.moveTo(8 * s, -24 * s).lineTo(8 * s, -4 * s).stroke({ color: 0xbbbbbb, width: 0.4 });
  } else {
    // Melee weapon
    if (name === "Dark Knight" || boss) {
      // Large sword
      g.rect(9 * s, -30 * s, 3 * s, 22 * s).fill({ color: 0x888888 });
      g.moveTo(9 * s, -30 * s).lineTo(10.5 * s, -34 * s).lineTo(12 * s, -30 * s)
        .fill({ color: 0x999999 }); // blade tip
      g.roundRect(7 * s, -10 * s, 7 * s, 2.5 * s, 1).fill({ color: 0x6B5310 });
    } else {
      // Axe
      g.rect(8 * s, -26 * s, 2 * s, 18 * s).fill({ color: 0x7A5533 }); // handle
      g.moveTo(10 * s, -26 * s).quadraticCurveTo(16 * s, -22 * s, 10 * s, -18 * s)
        .fill({ color: 0x888888 }); // axe head
    }
  }

  return g;
}

// Special enemy types with unique shapes

function _drawWolf(g: Graphics, s: number): Graphics {
  const bc = 0x665544;
  const fur = 0x554433;
  // Body
  g.ellipse(0, -4 * s, 10 * s, 6 * s).fill({ color: bc });
  // Darker back ridge
  g.ellipse(0, -7 * s, 8 * s, 2.5 * s).fill({ color: fur, alpha: 0.5 });
  // Lighter belly
  g.ellipse(0, -1 * s, 7 * s, 3 * s).fill({ color: 0x887766, alpha: 0.3 });
  // Fur texture strokes along back
  for (let ft = -6; ft < 6; ft += 2) {
    g.moveTo(ft * s, -8 * s).quadraticCurveTo((ft + 1) * s, -10 * s, (ft + 2) * s, -8 * s)
      .stroke({ color: fur, width: 0.8, alpha: 0.4 });
  }
  // Head
  g.ellipse(-10 * s, -8 * s, 5 * s, 4 * s).fill({ color: bc });
  // Cheek ruff (lighter fur tufts)
  g.ellipse(-8 * s, -7 * s, 2.5 * s, 2 * s).fill({ color: 0x887766, alpha: 0.3 });
  // Snout
  g.ellipse(-14 * s, -7 * s, 3.5 * s, 2 * s).fill({ color: 0x776655 });
  // Nose (shiny)
  g.circle(-17 * s, -7.5 * s, 1.2 * s).fill({ color: 0x222211 });
  g.circle(-17.2 * s, -7.8 * s, 0.4 * s).fill({ color: 0x555544, alpha: 0.4 }); // nose highlight
  // Mouth line
  g.moveTo(-17 * s, -6.5 * s).quadraticCurveTo(-15 * s, -5.5 * s, -13 * s, -6 * s)
    .stroke({ color: 0x332211, width: 0.5 });
  // Ears (with inner color)
  g.moveTo(-8 * s, -12 * s).lineTo(-10 * s, -16 * s).lineTo(-12 * s, -12 * s).fill({ color: bc });
  g.moveTo(-9 * s, -12 * s).lineTo(-10 * s, -14.5 * s).lineTo(-11 * s, -12 * s).fill({ color: 0x998877, alpha: 0.3 });
  g.moveTo(-6 * s, -11 * s).lineTo(-7 * s, -15 * s).lineTo(-9 * s, -11 * s).fill({ color: bc });
  g.moveTo(-7 * s, -11 * s).lineTo(-7.5 * s, -13.5 * s).lineTo(-8.5 * s, -11 * s).fill({ color: 0x998877, alpha: 0.3 });
  // Eyes (fierce)
  g.ellipse(-12 * s, -9 * s, 1.4 * s, 1 * s).fill({ color: 0xffcc44 });
  g.ellipse(-12 * s, -9 * s, 0.7 * s, 0.5 * s).fill({ color: 0x222200 });
  g.circle(-12.3 * s, -9.2 * s, 0.3 * s).fill({ color: 0xffffff, alpha: 0.3 });
  // Legs with paw detail
  for (const lx of [-6, -3, 4, 7]) {
    // Upper leg
    g.roundRect(lx * s, -1 * s, 2.5 * s, 4 * s, 1).fill({ color: fur });
    // Lower leg (narrower)
    g.rect((lx + 0.2) * s, 2.5 * s, 2 * s, 3 * s).fill({ color: fur });
    // Paw pad (oval shape with toes)
    g.ellipse((lx + 1) * s, 5.5 * s, 2 * s, 1 * s).fill({ color: 0x443322 });
    // Toe bumps
    g.circle((lx + 0.3) * s, 5.2 * s, 0.5 * s).fill({ color: 0x443322 });
    g.circle((lx + 1) * s, 5 * s, 0.5 * s).fill({ color: 0x443322 });
    g.circle((lx + 1.7) * s, 5.2 * s, 0.5 * s).fill({ color: 0x443322 });
  }
  // Tail (fluffy)
  g.moveTo(10 * s, -6 * s).quadraticCurveTo(16 * s, -10 * s, 14 * s, -14 * s)
    .stroke({ color: bc, width: 2.5 * s });
  g.moveTo(10 * s, -5.5 * s).quadraticCurveTo(15 * s, -9 * s, 13.5 * s, -13 * s)
    .stroke({ color: 0x887766, width: 1 * s, alpha: 0.4 }); // tail highlight
  // Teeth (multiple)
  g.moveTo(-16 * s, -6 * s).lineTo(-15.5 * s, -4.5 * s).lineTo(-15 * s, -6 * s).fill({ color: 0xeeeeee });
  g.moveTo(-14.5 * s, -6 * s).lineTo(-14 * s, -4.8 * s).lineTo(-13.5 * s, -6 * s).fill({ color: 0xeeeeee });
  return g;
}

function _drawDragon(g: Graphics, s: number): Graphics {
  // Body
  g.ellipse(0, -6 * s, 14 * s, 9 * s).fill({ color: 0xaa2211 });
  // Belly (lighter, segmented)
  g.ellipse(0, -3 * s, 10 * s, 5 * s).fill({ color: 0xcc6633, alpha: 0.5 });
  // Belly segments
  for (let bs = -6; bs < 6; bs += 2.5) {
    g.moveTo(bs * s, 0).quadraticCurveTo((bs + 1.2) * s, 1 * s, (bs + 2.5) * s, 0)
      .stroke({ color: 0xaa5522, width: 0.4, alpha: 0.3 });
  }
  // Dense scale pattern (3 rows)
  for (let row = 0; row < 3; row++) {
    const rowY = (-9 + row * 2.5) * s;
    const offset = row % 2 === 0 ? 0 : 1.5;
    for (let sc = -8 + offset; sc < 8; sc += 3) {
      // Scale as inverted U shape
      g.moveTo((sc - 1) * s, rowY + 1 * s)
        .quadraticCurveTo(sc * s, rowY - 1.2 * s, (sc + 1) * s, rowY + 1 * s)
        .stroke({ color: 0x881100, width: 0.6, alpha: 0.35 });
      g.ellipse(sc * s, rowY, 1.2 * s, 0.8 * s).fill({ color: 0x991100, alpha: 0.15 });
    }
  }
  // Spine ridge (triangular spikes along back)
  for (let sp = -6; sp < 8; sp += 3) {
    g.moveTo(sp * s, -10 * s).lineTo((sp + 1) * s, -13 * s).lineTo((sp + 2) * s, -10 * s)
      .fill({ color: 0x881100, alpha: 0.3 });
  }
  // Neck
  g.moveTo(-10 * s, -10 * s).quadraticCurveTo(-16 * s, -18 * s, -14 * s, -24 * s)
    .lineTo(-10 * s, -22 * s).quadraticCurveTo(-12 * s, -16 * s, -8 * s, -10 * s)
    .fill({ color: 0xaa2211 });
  // Head
  g.ellipse(-14 * s, -26 * s, 6 * s, 4 * s).fill({ color: 0xbb3322 });
  // Horns
  g.moveTo(-12 * s, -30 * s).lineTo(-14 * s, -36 * s).stroke({ color: 0x444433, width: 1.5 * s });
  g.moveTo(-10 * s, -29 * s).lineTo(-11 * s, -34 * s).stroke({ color: 0x444433, width: 1.2 * s });
  // Eye
  g.circle(-16 * s, -26 * s, 1.5 * s).fill({ color: 0xffcc00 });
  g.circle(-16 * s, -26 * s, 0.7 * s).fill({ color: 0x222200 });
  // Jaw
  g.ellipse(-17 * s, -24 * s, 4 * s, 2 * s).fill({ color: 0x993322 });
  g.moveTo(-20 * s, -23 * s).lineTo(-19 * s, -21 * s).lineTo(-18 * s, -23 * s).fill({ color: 0xeeeeee }); // fang
  // Wings
  g.moveTo(-4 * s, -14 * s).quadraticCurveTo(12 * s, -34 * s, 20 * s, -20 * s)
    .lineTo(14 * s, -12 * s).quadraticCurveTo(6 * s, -22 * s, -2 * s, -14 * s)
    .fill({ color: 0x882211, alpha: 0.6 });
  // Wing membrane lines
  g.moveTo(0, -14 * s).lineTo(16 * s, -24 * s).stroke({ color: 0x661100, width: 0.5 });
  g.moveTo(4 * s, -12 * s).lineTo(18 * s, -20 * s).stroke({ color: 0x661100, width: 0.5 });
  // Legs
  for (const lx of [-6, -2, 4, 8]) {
    g.rect(lx * s, 1 * s, 3 * s, 6 * s).fill({ color: 0x882211 });
    // Claws
    g.moveTo(lx * s, 7 * s).lineTo((lx - 1) * s, 9 * s).stroke({ color: 0x444433, width: 1 });
    g.moveTo((lx + 1.5) * s, 7 * s).lineTo((lx + 2.5) * s, 9 * s).stroke({ color: 0x444433, width: 1 });
  }
  // Tail
  g.moveTo(14 * s, -4 * s).quadraticCurveTo(22 * s, 0, 24 * s, -8 * s)
    .stroke({ color: 0xaa2211, width: 3 * s });
  // Tail spike
  g.moveTo(24 * s, -8 * s).lineTo(26 * s, -12 * s).lineTo(22 * s, -10 * s)
    .fill({ color: 0x444433 });
  return g;
}

function _drawTroll(g: Graphics, s: number): Graphics {
  // Legs (thick)
  g.roundRect(-8 * s, -2 * s, 6 * s, 10 * s, 2).fill({ color: 0x3A5A2A });
  g.roundRect(2 * s, -2 * s, 6 * s, 10 * s, 2).fill({ color: 0x3A5A2A });
  // Feet
  g.roundRect(-9 * s, 6 * s, 8 * s, 3 * s, 1).fill({ color: 0x2A4A1A });
  g.roundRect(1 * s, 6 * s, 8 * s, 3 * s, 1).fill({ color: 0x2A4A1A });
  // Body (massive)
  g.roundRect(-10 * s, -22 * s, 20 * s, 22 * s, 4).fill({ color: 0x446633 });
  // Belly
  g.ellipse(0, -12 * s, 8 * s, 8 * s).fill({ color: 0x557744, alpha: 0.5 });
  // Warts/bumps
  g.circle(-6 * s, -18 * s, 1.5 * s).fill({ color: 0x335522, alpha: 0.5 });
  g.circle(4 * s, -14 * s, 2 * s).fill({ color: 0x335522, alpha: 0.5 });
  g.circle(-3 * s, -8 * s, 1 * s).fill({ color: 0x335522, alpha: 0.5 });
  // Arms (long, ape-like)
  g.moveTo(-10 * s, -18 * s).quadraticCurveTo(-16 * s, -10 * s, -14 * s, 2 * s)
    .stroke({ color: 0x446633, width: 4 * s });
  g.moveTo(10 * s, -18 * s).quadraticCurveTo(16 * s, -10 * s, 14 * s, 2 * s)
    .stroke({ color: 0x446633, width: 4 * s });
  // Fists
  g.circle(-14 * s, 2 * s, 3 * s).fill({ color: 0x3A5A2A });
  g.circle(14 * s, 2 * s, 3 * s).fill({ color: 0x3A5A2A });
  // Head (small relative to body)
  g.circle(0, -26 * s, 6 * s).fill({ color: 0x446633 });
  // Jaw (pronounced)
  g.ellipse(0, -22 * s, 5 * s, 3 * s).fill({ color: 0x3A5A2A });
  // Underbite tusks
  g.moveTo(-3 * s, -22 * s).lineTo(-2 * s, -25 * s).stroke({ color: 0xccccaa, width: 1.5 });
  g.moveTo(3 * s, -22 * s).lineTo(2 * s, -25 * s).stroke({ color: 0xccccaa, width: 1.5 });
  // Eyes (small, angry)
  g.circle(-2 * s, -27 * s, 1.5 * s).fill({ color: 0xffcc44 });
  g.circle(2 * s, -27 * s, 1.5 * s).fill({ color: 0xffcc44 });
  g.circle(-2 * s, -27 * s, 0.7 * s).fill({ color: 0x222200 });
  g.circle(2 * s, -27 * s, 0.7 * s).fill({ color: 0x222200 });
  // Brow ridge
  g.moveTo(-5 * s, -29 * s).quadraticCurveTo(0, -30 * s, 5 * s, -29 * s)
    .stroke({ color: 0x335522, width: 2 });
  // Belt/loincloth
  g.roundRect(-8 * s, -4 * s, 16 * s, 4 * s, 1).fill({ color: 0x554422 });
  g.rect(-6 * s, -3 * s, 12 * s, 1 * s).fill({ color: 0x665533, alpha: 0.5 }); // belt strap
  g.circle(0, -2 * s, 1.2 * s).fill({ color: 0xaa8844 }); // buckle
  // Hanging fur strips
  g.rect(-4 * s, 0, 3 * s, 4 * s).fill({ color: 0x554422, alpha: 0.6 });
  g.rect(1 * s, 0, 3 * s, 3.5 * s).fill({ color: 0x665533, alpha: 0.5 });

  // Club weapon (detailed)
  // Handle with leather wrap
  g.roundRect(14 * s, -20 * s, 4 * s, 20 * s, 1).fill({ color: 0x5A4A2E });
  // Leather grip bands
  for (let gb = -16; gb < -2; gb += 3) {
    g.rect(14.5 * s, gb * s, 3 * s, 1 * s).fill({ color: 0x4A3A1E, alpha: 0.4 });
  }
  // Club head (knotted wood)
  g.ellipse(16 * s, -22 * s, 5 * s, 6 * s).fill({ color: 0x5A4A2E });
  g.ellipse(16 * s, -22 * s, 4 * s, 5 * s).fill({ color: 0x6B5A3E, alpha: 0.4 }); // wood grain
  // Wood knot detail
  g.circle(15 * s, -21 * s, 1.5 * s).stroke({ color: 0x4A3A1E, width: 0.5, alpha: 0.3 });
  // Metal spikes (triangular instead of circles)
  for (const [sx, sy, sa] of [[13, -24, -0.3], [19, -23, 0.5], [15, -27, -0.1], [18, -19, 0.8], [14, -20, -0.5]] as [number, number, number][]) {
    g.moveTo(sx * s, sy * s)
      .lineTo((sx + Math.cos(sa) * 2.5) * s, (sy + Math.sin(sa) * 2.5 - 1) * s)
      .lineTo((sx + 1) * s, (sy + 0.5) * s)
      .closePath().fill({ color: 0x888888 });
    // Spike base ring
    g.circle(sx * s, sy * s, 0.8 * s).stroke({ color: 0x666666, width: 0.4 });
  }
  // Metal band around club head
  g.ellipse(16 * s, -18 * s, 4.5 * s, 1.5 * s).stroke({ color: 0x666666, width: 1, alpha: 0.4 });
  return g;
}
