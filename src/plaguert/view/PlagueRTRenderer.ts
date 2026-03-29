// ---------------------------------------------------------------------------
// Plague Doctor RT — PixiJS renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { PlagueRTPhase, TileType, HouseState, HerbType } from "../types";
import type { PlagueRTState } from "../types";
import { PLAGUE_RT_BALANCE as B } from "../config/PlagueRTBalance";
import { loadPlagueRTMeta, scoreBreakdown } from "../state/PlagueRTState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = B.TILE_SIZE;
const FONT = "Georgia, serif";

function mkStyle(opts: Partial<TextStyle>): TextStyle {
  return new TextStyle({ fontFamily: FONT, ...opts, fontSize: ((opts.fontSize as number) || 10) * 3 } as any);
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const blue = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | blue;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class PlagueRTRenderer {
  container = new Container();

  // Layers
  private _ground = new Container();
  private _buildings = new Container();
  private _entities = new Container();
  private _playerLayer = new Container();
  private _fx = new Container();
  private _nightOverlay = new Container();
  private _hud = new Container();
  private _overlay = new Container();

  private _gfx = new Graphics();
  private _buildingGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _playerGfx = new Graphics();
  private _fxGfx = new Graphics();
  private _nightGfx = new Graphics();
  private _hudGfx = new Graphics();
  private _overlayGfx = new Graphics();

  private _textPool: Text[] = [];
  private _textIdx = 0;

  private _ox = 0;
  private _oy = 0;

  private _dustParticles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  // Callbacks
  private _onStart: (() => void) | null = null;
  private _onExit: (() => void) | null = null;
  private _onResume: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  build(sw: number, _sh: number): void {
    this.container.removeChildren();
    this._ox = Math.max(0, (sw - B.GRID_W * TS) / 2);
    this._oy = 40;

    this._gfx = new Graphics();
    this._buildingGfx = new Graphics();
    this._entityGfx = new Graphics();
    this._playerGfx = new Graphics();
    this._fxGfx = new Graphics();
    this._nightGfx = new Graphics();
    this._hudGfx = new Graphics();
    this._overlayGfx = new Graphics();

    this._ground = new Container();
    this._buildings = new Container();
    this._entities = new Container();
    this._playerLayer = new Container();
    this._fx = new Container();
    this._nightOverlay = new Container();
    this._hud = new Container();
    this._overlay = new Container();

    this._ground.addChild(this._gfx);
    this._buildings.addChild(this._buildingGfx);
    this._entities.addChild(this._entityGfx);
    this._playerLayer.addChild(this._playerGfx);
    this._fx.addChild(this._fxGfx);
    this._nightOverlay.addChild(this._nightGfx);
    this._hud.addChild(this._hudGfx);
    this._overlay.addChild(this._overlayGfx);

    this.container.addChild(this._ground);
    this.container.addChild(this._buildings);
    this.container.addChild(this._entities);
    this.container.addChild(this._playerLayer);
    this.container.addChild(this._fx);
    this.container.addChild(this._nightOverlay);
    this.container.addChild(this._hud);
    this.container.addChild(this._overlay);
  }

  setCallbacks(cbs: {
    start: () => void;
    exit: () => void;
    resume: () => void;
  }): void {
    this._onStart = cbs.start;
    this._onExit = cbs.exit;
    this._onResume = cbs.resume;
  }

  destroy(): void {
    this.container.removeChildren();
    this._textPool = [];
    this._textIdx = 0;
  }

  // ---------------------------------------------------------------------------
  // Text pooling
  // ---------------------------------------------------------------------------

  private _getText(str: string, style: TextStyle): Text {
    if (this._textIdx < this._textPool.length) {
      const t = this._textPool[this._textIdx++];
      t.text = str;
      t.style = style;
      t.visible = true;
      t.alpha = 1;
      t.scale.set(1);
      t.rotation = 0;
      return t;
    }
    const t = new Text({ text: str, style });
    this._textPool.push(t);
    this._textIdx++;
    return t;
  }

  private _resetTextPool(): void {
    for (let i = this._textIdx; i < this._textPool.length; i++) {
      this._textPool[i].visible = false;
    }
    this._textIdx = 0;
  }

  // ---------------------------------------------------------------------------
  // Main draw
  // ---------------------------------------------------------------------------

  draw(state: PlagueRTState, sw: number, sh: number, dt: number): void {
    this._resetTextPool();

    // Clear all graphics
    this._gfx.clear();
    this._buildingGfx.clear();
    this._entityGfx.clear();
    this._playerGfx.clear();
    this._fxGfx.clear();
    this._nightGfx.clear();
    this._hudGfx.clear();
    this._overlayGfx.clear();

    // Remove old text children from layers
    for (const layer of [this._ground, this._buildings, this._entities, this._playerLayer, this._fx, this._nightOverlay, this._hud, this._overlay]) {
      while (layer.children.length > 1) layer.removeChildAt(layer.children.length - 1);
    }

    switch (state.phase) {
      case PlagueRTPhase.MENU:
        this._drawMenu(sw, sh);
        break;
      case PlagueRTPhase.PAUSED:
        this._drawGame(state, sw, sh, dt);
        this._drawPause(state, sw, sh);
        break;
      case PlagueRTPhase.PLAYING:
        this._drawGame(state, sw, sh, dt);
        break;
      case PlagueRTPhase.WON:
      case PlagueRTPhase.LOST:
        this._drawGame(state, sw, sh, dt);
        this._drawEndScreen(state, sw, sh);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Game rendering
  // ---------------------------------------------------------------------------

  private _drawGame(state: PlagueRTState, sw: number, sh: number, dt: number): void {
    const ox = this._ox + (state.screenShake > 0 ? (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2 : 0);
    const oy = this._oy + (state.screenShake > 0 ? (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2 : 0);

    this._drawGround(state, ox, oy);
    this._drawBuildings(state, ox, oy);
    this._drawHerbs(state, ox, oy);
    this._drawSmoke(state, ox, oy);
    this._drawRats(state, ox, oy);
    this._drawPlayer(state, ox, oy, dt);
    this._drawHealBeams(state, ox, oy);
    this._drawMandrakeBlast(state, ox, oy);
    this._drawFloatingTexts(state, ox, oy);
    this._drawNightOverlay(state, ox, oy);
    this._drawDayTransition(state, sw);
    this._drawWavePreview(state, sw);
    this._drawComboDisplay(state, ox, oy);
    this._drawHUD(state, sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Ground tiles
  // ---------------------------------------------------------------------------

  private _drawGround(state: PlagueRTState, ox: number, oy: number): void {
    const g = this._gfx;
    const gridPxW = state.gridW * TS;
    const gridPxH = state.gridH * TS;

    for (let y = 0; y < state.gridH; y++) {
      for (let x = 0; x < state.gridW; x++) {
        const tile = state.tiles[y][x];
        const px = ox + x * TS;
        const py = oy + y * TS;

        let color: number;
        switch (tile) {
          case TileType.GRASS: {
            // Enhanced variation with darker patches
            const seed = (x * 7 + y * 13) % 5;
            const darkSeed = (x * 31 + y * 47) % 11;
            const base = darkSeed < 2 ? 0x2e4e22 : 0x3a5a2a;
            color = base + seed * 0x020302;
            break;
          }
          case TileType.PATH:
            color = 0x7a6a4a;
            break;
          case TileType.HOUSE:
            continue; // drawn in buildings
          case TileType.WELL:
            color = 0x445566;
            break;
          case TileType.CHURCH:
            color = 0x665544;
            break;
          default:
            color = 0x3a5a2a;
        }

        g.rect(px, py, TS, TS).fill({ color, alpha: 1 });
        g.rect(px, py, TS, TS).stroke({ color: 0x000000, width: 0.5, alpha: 0.15 });

        // Grass detail: wildflower dots and grass tufts
        if (tile === TileType.GRASS) {
          const flowerSeed = (x * 53 + y * 97) % 37;
          if (flowerSeed < 3) {
            // Wildflower dot
            const flowerColors = [0xdddd44, 0xdd88aa, 0x88aadd];
            const fx = px + (flowerSeed * 13 + 7) % (TS - 8) + 4;
            const fy = py + (flowerSeed * 19 + 5) % (TS - 8) + 4;
            g.circle(fx, fy, 1.5).fill({ color: flowerColors[flowerSeed % 3], alpha: 0.7 });
          }
          // Grass tuft marks
          const tuftSeed = (x * 41 + y * 67) % 19;
          if (tuftSeed < 4) {
            const tx = px + (tuftSeed * 11 + 3) % (TS - 6) + 3;
            const ty = py + (tuftSeed * 7 + 9) % (TS - 6) + 3;
            g.moveTo(tx, ty).lineTo(tx - 1, ty - 4).stroke({ color: 0x4a6a3a, width: 0.8, alpha: 0.5 });
            g.moveTo(tx + 2, ty).lineTo(tx + 3, ty - 3).stroke({ color: 0x4a6a3a, width: 0.8, alpha: 0.5 });
          }
        }

        // Path detail: cobblestone pattern
        if (tile === TileType.PATH) {
          const cobbleSeed = (x * 23 + y * 59) % 7;
          // Draw small cobblestone circles/rects
          for (let ci = 0; ci < 3 + cobbleSeed % 3; ci++) {
            const cx = px + ((ci * 17 + cobbleSeed * 7 + 4) % (TS - 10)) + 5;
            const cy = py + ((ci * 13 + cobbleSeed * 11 + 3) % (TS - 10)) + 5;
            const cw = 5 + (ci * 3 + cobbleSeed) % 4;
            const ch = 4 + (ci * 5 + cobbleSeed) % 3;
            const shade = (ci + cobbleSeed) % 3 === 0 ? 0x6a5a3a : 0x8a7a5a;
            g.roundRect(cx, cy, cw, ch, 2).fill({ color: shade, alpha: 0.6 });
            g.roundRect(cx, cy, cw, ch, 2).stroke({ color: 0x554a32, width: 0.5, alpha: 0.35 });
          }
        }
      }
    }

    // Ambient edge vignette
    const vigW = 40;
    // Top edge
    for (let i = 0; i < vigW; i++) {
      const a = (1 - i / vigW) * 0.35;
      g.rect(ox, oy + i, gridPxW, 1).fill({ color: 0x000000, alpha: a });
    }
    // Bottom edge
    for (let i = 0; i < vigW; i++) {
      const a = (1 - i / vigW) * 0.35;
      g.rect(ox, oy + gridPxH - i, gridPxW, 1).fill({ color: 0x000000, alpha: a });
    }
    // Left edge
    for (let i = 0; i < vigW; i++) {
      const a = (1 - i / vigW) * 0.35;
      g.rect(ox + i, oy, 1, gridPxH).fill({ color: 0x000000, alpha: a });
    }
    // Right edge
    for (let i = 0; i < vigW; i++) {
      const a = (1 - i / vigW) * 0.35;
      g.rect(ox + gridPxW - i, oy, 1, gridPxH).fill({ color: 0x000000, alpha: a });
    }

    // Scattered leaves along edges
    const leafColors = [0x5a3a1a, 0x6a4a22, 0x4a3a18, 0x7a5a2a];
    for (let li = 0; li < state.gridW + state.gridH; li++) {
      const leafSeed = (li * 73 + 31) % 100;
      if (leafSeed > 30) continue;
      let lx: number, ly: number;
      if (li < state.gridW) {
        // Top/bottom edges
        lx = ox + li * TS + (leafSeed * 7) % TS;
        ly = leafSeed % 2 === 0 ? oy + (leafSeed % 20) : oy + gridPxH - (leafSeed % 20);
      } else {
        // Left/right edges
        const yi = li - state.gridW;
        ly = oy + yi * TS + (leafSeed * 11) % TS;
        lx = leafSeed % 2 === 0 ? ox + (leafSeed % 20) : ox + gridPxW - (leafSeed % 20);
      }
      const lc = leafColors[leafSeed % leafColors.length];
      g.ellipse(lx, ly, 3 + leafSeed % 2, 1.5).fill({ color: lc, alpha: 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Buildings
  // ---------------------------------------------------------------------------

  private _drawBuildings(state: PlagueRTState, ox: number, oy: number): void {
    const g = this._buildingGfx;

    // Well
    if (state.wellPos) {
      const wx = ox + state.wellPos.gx * TS;
      const wy = oy + state.wellPos.gy * TS;
      // Well circle
      g.circle(wx + TS / 2, wy + TS / 2, TS * 0.35).fill({ color: 0x3366aa });
      g.circle(wx + TS / 2, wy + TS / 2, TS * 0.35).stroke({ color: 0x556677, width: 2 });

      if (state.wellActive) {
        // Healing aura
        g.circle(wx + TS / 2, wy + TS / 2, B.WELL_RADIUS * TS)
          .stroke({ color: 0x44ccff, width: 1.5, alpha: 0.3 + Math.sin(state.time * 3) * 0.15 });
        // Beam lines to healing houses
        for (const hid of state.wellHealingHouses) {
          const house = state.houses.find(h => h.id === hid);
          if (house) {
            g.moveTo(wx + TS / 2, wy + TS / 2);
            g.lineTo(ox + house.gx * TS + TS / 2, oy + house.gy * TS + TS / 2);
            g.stroke({ color: 0x44ccff, width: 1, alpha: 0.4 });
          }
        }
      }

      const wt = this._getText("Well", mkStyle({ fontSize: 8, fill: 0x88aacc }));
      wt.anchor.set(0.5, 0);
      wt.position.set(wx + TS / 2, wy + TS + 1);
      this._buildings.addChild(wt);
    }

    // Church
    if (state.churchPos) {
      const cx = ox + state.churchPos.gx * TS;
      const cy = oy + state.churchPos.gy * TS;
      // Church body
      g.rect(cx + 4, cy + 8, TS - 8, TS - 12).fill({ color: 0xaa9977 });
      // Steeple
      g.moveTo(cx + TS / 2, cy + 2).lineTo(cx + TS / 2 - 8, cy + 12).lineTo(cx + TS / 2 + 8, cy + 12).closePath()
        .fill({ color: 0xbbaa88 });
      // Cross
      g.rect(cx + TS / 2 - 1.5, cy - 2, 3, 8).fill({ color: 0xddcc99 });
      g.rect(cx + TS / 2 - 4, cy + 1, 8, 3).fill({ color: 0xddcc99 });
      // Protection aura
      g.circle(cx + TS / 2, cy + TS / 2, B.CHURCH_RADIUS * TS)
        .stroke({ color: 0xddcc66, width: 1, alpha: 0.2 + Math.sin(state.time * 2) * 0.1 });

      const ct = this._getText("Church", mkStyle({ fontSize: 8, fill: 0xaa9966 }));
      ct.anchor.set(0.5, 0);
      ct.position.set(cx + TS / 2, cy + TS + 1);
      this._buildings.addChild(ct);
    }

    // Houses
    for (const house of state.houses) {
      const hx = ox + house.gx * TS;
      const hy = oy + house.gy * TS;

      // Shake offset
      const shakeOff = house.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
      const hxs = hx + shakeOff;

      // House body color based on state
      let bodyColor = 0x8b7b5a;
      if (house.state === HouseState.DEAD) bodyColor = 0x333333;
      else if (house.state === HouseState.CURED) bodyColor = 0x558855;
      else if (house.state === HouseState.CRITICAL) bodyColor = 0x884422;
      else if (house.state === HouseState.INFECTED) bodyColor = lerpColor(0x8b7b5a, 0xaa4422, house.infection / 100);

      // Death flash
      if (house.deathFlash > 0) bodyColor = lerpColor(bodyColor, 0xff0000, house.deathFlash * 2);
      // Cure flash
      if (house.cureFlash > 0) bodyColor = lerpColor(bodyColor, 0x44ff44, house.cureFlash * 2);

      // Body
      g.rect(hxs + 4, hy + 10, TS - 8, TS - 14).fill({ color: bodyColor });
      // Roof
      g.moveTo(hxs + 2, hy + 12).lineTo(hxs + TS / 2, hy + 2).lineTo(hxs + TS - 2, hy + 12).closePath()
        .fill({ color: 0x664433 });
      // Door
      g.rect(hxs + TS / 2 - 3, hy + TS - 10, 6, 6).fill({ color: 0x443322 });
      // Windows
      g.rect(hxs + 8, hy + 16, 5, 5).fill({ color: 0xdddd88, alpha: 0.7 });
      g.rect(hxs + TS - 13, hy + 16, 5, 5).fill({ color: 0xdddd88, alpha: 0.7 });

      // Infection bar
      if (house.state === HouseState.INFECTED || house.state === HouseState.CRITICAL) {
        const barW = TS - 8;
        const barH = 4;
        const barX = hxs + 4;
        const barY = hy - 6;
        g.rect(barX, barY, barW, barH).fill({ color: 0x222222 });
        const fillColor = house.infection >= B.CRITICAL_THRESHOLD ? 0xff3322 : lerpColor(0x44aa44, 0xff3322, house.infection / 100);
        g.rect(barX, barY, barW * (house.infection / 100), barH).fill({ color: fillColor });
        g.rect(barX, barY, barW, barH).stroke({ color: 0x444444, width: 0.5 });

        const pctText = this._getText(`${Math.floor(house.infection)}%`, mkStyle({ fontSize: 7, fill: 0xffffff }));
        pctText.anchor.set(0.5, 1);
        pctText.position.set(hxs + TS / 2, barY - 1);
        this._buildings.addChild(pctText);
      }

      // Critical urgency icon
      if (house.state === HouseState.CRITICAL) {
        const urgText = this._getText("!", mkStyle({ fontSize: 14, fill: 0xff4444, fontWeight: "bold" }));
        urgText.anchor.set(0.5, 0.5);
        urgText.position.set(hxs + TS - 6, hy + 4);
        urgText.alpha = 0.5 + Math.sin(state.time * 8) * 0.5;
        this._buildings.addChild(urgText);
      }

      // State icons
      if (house.state === HouseState.DEAD) {
        const dt2 = this._getText("X", mkStyle({ fontSize: 16, fill: 0xff2222, fontWeight: "bold" }));
        dt2.anchor.set(0.5, 0.5);
        dt2.position.set(hxs + TS / 2, hy + TS / 2);
        this._buildings.addChild(dt2);
      } else if (house.state === HouseState.CURED) {
        const ct2 = this._getText("\u2713", mkStyle({ fontSize: 14, fill: 0x44ff44, fontWeight: "bold" }));
        ct2.anchor.set(0.5, 0.5);
        ct2.position.set(hxs + TS / 2, hy + TS / 2);
        this._buildings.addChild(ct2);
      }

      // Protection shimmer with sparkles
      if (house.protectionTimer > 0) {
        g.circle(hxs + TS / 2, hy + TS / 2, TS * 0.45)
          .stroke({ color: 0xddcc66, width: 1.5, alpha: 0.4 + Math.sin(state.time * 5) * 0.2 });
        // Golden shield
        const shieldT = this._getText("\u2727", mkStyle({ fontSize: 10, fill: 0xffdd44 }));
        shieldT.anchor.set(0.5, 0.5);
        shieldT.position.set(hxs + 6, hy + 6);
        shieldT.alpha = 0.6 + Math.sin(state.time * 4) * 0.3;
        this._buildings.addChild(shieldT);
      }

      // Treatment progress bar
      if (house.treatProgress > 0 && house.treatProgress < 1) {
        const tBarW = TS - 4;
        const tBarH = 3;
        const tBarX = hxs + 2;
        const tBarY = hy + TS + 2;
        g.rect(tBarX, tBarY, tBarW, tBarH).fill({ color: 0x222222 });
        g.rect(tBarX, tBarY, tBarW * house.treatProgress, tBarH).fill({ color: 0x44ff88 });
      }

      // Villager dots
      if (house.state !== HouseState.DEAD) {
        for (let v = 0; v < house.villagers; v++) {
          const dotX = hxs + 8 + v * 6;
          const dotY = hy + TS - 3;
          const dotColor = house.state === HouseState.CURED ? 0x44ff44 : 0xddddaa;
          g.circle(dotX, dotY, 1.5).fill({ color: dotColor });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Herbs
  // ---------------------------------------------------------------------------

  private _drawHerbs(state: PlagueRTState, ox: number, oy: number): void {
    const g = this._entityGfx;

    const herbColors: Record<HerbType, number> = {
      [HerbType.LAVENDER]: 0xbb88ff,
      [HerbType.WORMWOOD]: 0x88cc44,
      [HerbType.MANDRAKE]: 0xaa44dd,
      [HerbType.GARLIC]: 0xeeeecc,
    };
    const herbLetters: Record<HerbType, string> = {
      [HerbType.LAVENDER]: "L",
      [HerbType.WORMWOOD]: "W",
      [HerbType.MANDRAKE]: "M",
      [HerbType.GARLIC]: "G",
    };

    for (const herb of state.herbs) {
      if (herb.collected) continue;

      const hx = ox + herb.pullX * TS + TS / 2;
      const hy = oy + herb.pullY * TS + TS / 2;
      const color = herbColors[herb.type];
      const size = herb.type === HerbType.MANDRAKE ? 8 : 5;

      // Spawn flash expanding ring
      if (herb.spawnFlash > 0) {
        const flashProgress = 1 - herb.spawnFlash / B.HERB_SPAWN_FLASH;
        g.circle(hx, hy, size * 2 + flashProgress * 15)
          .stroke({ color, width: 1.5, alpha: 1 - flashProgress });
      }

      // Herb body
      g.circle(hx, hy, size).fill({ color, alpha: 0.9 });
      g.circle(hx, hy, size).stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });

      // Letter label
      const lt = this._getText(herbLetters[herb.type], mkStyle({ fontSize: 8, fill: 0xffffff, fontWeight: "bold" }));
      lt.anchor.set(0.5, 0.5);
      lt.position.set(hx, hy);
      this._entities.addChild(lt);

      // Pulling trail
      if (herb.pulling) {
        const origX = ox + herb.gx * TS + TS / 2;
        const origY = oy + herb.gy * TS + TS / 2;
        g.moveTo(origX, origY).lineTo(hx, hy).stroke({ color, width: 1, alpha: 0.3 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rats
  // ---------------------------------------------------------------------------

  private _drawRats(state: PlagueRTState, ox: number, oy: number): void {
    const g = this._entityGfx;

    for (const rat of state.rats) {
      const rx = ox + rat.x * TS + TS / 2;
      const ry = oy + rat.y * TS + TS / 2;

      if (!rat.alive) {
        // Death animation
        const alpha = rat.deathTimer / B.RAT_DEATH_ANIM;
        g.circle(rx, ry, 6).fill({ color: 0x664422, alpha: alpha * 0.6 });
        const xt = this._getText("X", mkStyle({ fontSize: 10, fill: 0xff4444 }));
        xt.anchor.set(0.5, 0.5);
        xt.position.set(rx, ry);
        xt.alpha = alpha;
        this._entities.addChild(xt);
        continue;
      }

      // Shadow
      g.ellipse(rx, ry + 7, 7, 3).fill({ color: 0x000000, alpha: 0.25 });

      // Infection aura
      g.circle(rx, ry, rat.infectionAura * TS)
        .stroke({ color: 0x88ff00, width: 1, alpha: 0.15 + Math.sin(state.time * 4) * 0.08 });

      // Swarm glow
      if (rat.swarming) {
        g.circle(rx, ry, 10).fill({ color: 0xff4400, alpha: 0.15 });
      }

      // Body
      g.ellipse(rx, ry, 7, 5).fill({ color: 0x554433 });
      // Head
      g.circle(rx + 6, ry - 1, 4).fill({ color: 0x665544 });
      // Ears
      g.circle(rx + 7, ry - 5, 2.5).fill({ color: 0x776655 });
      g.circle(rx + 4, ry - 5, 2.5).fill({ color: 0x776655 });
      // Eyes
      g.circle(rx + 8, ry - 2, 1).fill({ color: 0xff2222 });
      // Snout
      g.circle(rx + 10, ry, 1.5).fill({ color: 0x887766 });
      // Whiskers
      g.moveTo(rx + 10, ry).lineTo(rx + 15, ry - 2).stroke({ color: 0x998877, width: 0.5 });
      g.moveTo(rx + 10, ry).lineTo(rx + 15, ry + 2).stroke({ color: 0x998877, width: 0.5 });
      // Curved tail
      g.moveTo(rx - 7, ry).quadraticCurveTo(rx - 12, ry - 8, rx - 9, ry - 12)
        .stroke({ color: 0x887766, width: 1.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Smoke
  // ---------------------------------------------------------------------------

  private _drawSmoke(state: PlagueRTState, ox: number, oy: number): void {
    const g = this._fxGfx;

    for (const smoke of state.smokes) {
      const sx = ox + smoke.gx * TS + TS / 2;
      const sy = oy + smoke.gy * TS + TS / 2;
      const r = smoke.radius * TS;

      // 8 swirling particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + state.time * 1.5;
        const pr = r * 0.6 + Math.sin(state.time * 2 + i) * r * 0.2;
        const px = sx + Math.cos(angle) * pr;
        const py = sy + Math.sin(angle) * pr;
        g.circle(px, py, 6 + Math.sin(state.time * 3 + i * 0.7) * 3)
          .fill({ color: 0x888888, alpha: 0.2 + (smoke.timer / B.SMOKE_DURATION) * 0.3 });
      }

      // Boundary ring
      g.circle(sx, sy, r).stroke({ color: 0x666666, width: 1, alpha: 0.3 });

      // Duration countdown
      const durText = this._getText(`${Math.ceil(smoke.timer)}s`, mkStyle({ fontSize: 8, fill: 0xaaaaaa }));
      durText.anchor.set(0.5, 0.5);
      durText.position.set(sx, sy);
      this._fx.addChild(durText);
    }
  }

  // ---------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------

  private _drawPlayer(state: PlagueRTState, ox: number, oy: number, dt: number): void {
    const g = this._playerGfx;
    const p = state.player;
    const px = ox + p.x * TS + TS / 2;
    const py = oy + p.y * TS + TS / 2;
    const isNight = state.dayTime >= B.NIGHT_START || state.dayTime < B.NIGHT_END;

    // Movement dust particles
    if (Math.abs(p.velX) > 0.5 || Math.abs(p.velY) > 0.5) {
      this._dustParticles.push({
        x: px + (Math.random() - 0.5) * 6,
        y: py + 8,
        vx: -p.velX * 0.3 + (Math.random() - 0.5) * 10,
        vy: -2 - Math.random() * 5,
        life: 0.4,
      });
    }

    // Update and draw dust
    for (let i = this._dustParticles.length - 1; i >= 0; i--) {
      const dp = this._dustParticles[i];
      dp.x += dp.vx * dt;
      dp.y += dp.vy * dt;
      dp.life -= dt;
      if (dp.life <= 0) { this._dustParticles.splice(i, 1); continue; }
      g.circle(dp.x, dp.y, 1.5).fill({ color: 0x997755, alpha: dp.life * 1.5 });
    }

    // Garlic aura
    if (p.garlicAuraTimer > 0) {
      g.circle(px, py, B.GARLIC_REPEL_RANGE * TS * 0.3)
        .stroke({ color: 0xeeeecc, width: 1.5, alpha: 0.3 + Math.sin(state.time * 4) * 0.15 });
      // Orbiting particles
      for (let i = 0; i < 6; i++) {
        const angle = state.time * 2 + (i / 6) * Math.PI * 2;
        const orbitR = B.GARLIC_REPEL_RANGE * TS * 0.25;
        const opx = px + Math.cos(angle) * orbitR;
        const opy = py + Math.sin(angle) * orbitR;
        g.circle(opx, opy, 2).fill({ color: 0xeeeeaa, alpha: 0.6 });
      }
    }

    // Dark robe (body)
    g.ellipse(px, py + 2, 8, 12).fill({ color: 0x222222 });
    // Hat
    g.moveTo(px - 8, py - 8).lineTo(px, py - 18).lineTo(px + 8, py - 8).closePath()
      .fill({ color: 0x1a1a1a });
    // Plague doctor mask (beak)
    g.moveTo(px + 2, py - 4).lineTo(px + 14, py - 2).lineTo(px + 2, py + 2).closePath()
      .fill({ color: 0x444444 });
    // Red eye lens
    g.circle(px + 4, py - 3, 2).fill({ color: 0xff2222, alpha: 0.8 });
    // Lantern
    const lanternAlpha = isNight ? 0.9 : 0.5;
    const lanternRadius = isNight ? 5 : 3;
    g.circle(px - 10, py + 4, lanternRadius).fill({ color: 0xffaa33, alpha: lanternAlpha * 0.5 });
    g.circle(px - 10, py + 4, 2).fill({ color: 0xffdd66, alpha: lanternAlpha });

    // Treatment cross indicator
    if (p.treating) {
      g.moveTo(px, py - 22).lineTo(px, py - 28).stroke({ color: 0x44ff88, width: 2 });
      g.moveTo(px - 3, py - 25).lineTo(px + 3, py - 25).stroke({ color: 0x44ff88, width: 2 });
    }
  }

  // ---------------------------------------------------------------------------
  // Heal beams
  // ---------------------------------------------------------------------------

  private _drawHealBeams(state: PlagueRTState, _ox: number, _oy: number): void {
    const g = this._fxGfx;

    for (const beam of state.healBeams) {
      const dx = beam.toX - beam.fromX;
      const dy = beam.toY - beam.fromY;

      // Line
      g.moveTo(beam.fromX, beam.fromY).lineTo(beam.toX, beam.toY)
        .stroke({ color: beam.color, width: 1.5, alpha: 0.4 });

      // Animated particles flowing along line
      for (let i = 0; i < B.HEAL_BEAM_PARTICLES; i++) {
        const t = ((beam.progress + i / B.HEAL_BEAM_PARTICLES) % 1);
        const ppx = beam.fromX + dx * t;
        const ppy = beam.fromY + dy * t;
        g.circle(ppx, ppy, 2.5).fill({ color: beam.color, alpha: 0.7 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mandrake blast
  // ---------------------------------------------------------------------------

  private _drawMandrakeBlast(state: PlagueRTState, _ox: number, _oy: number): void {
    if (state.mandrakeBlastTimer <= 0) return;
    const g = this._fxGfx;
    const progress = 1 - state.mandrakeBlastTimer;
    const mx = state.mandrakeBlastX;
    const my = state.mandrakeBlastY;

    // Expanding purple rings
    for (let i = 0; i < 3; i++) {
      const ringR = (progress + i * 0.15) * (B.SPREAD_RADIUS + 1) * TS;
      const alpha = Math.max(0, 1 - (progress + i * 0.15));
      g.circle(mx, my, ringR).stroke({ color: 0xaa44dd, width: 2 - i * 0.5, alpha });
    }

    // Particle rays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rayLen = progress * (B.SPREAD_RADIUS + 1) * TS;
      const rpx = mx + Math.cos(angle) * rayLen;
      const rpy = my + Math.sin(angle) * rayLen;
      g.moveTo(mx, my).lineTo(rpx, rpy)
        .stroke({ color: 0xcc66ff, width: 1, alpha: Math.max(0, 0.6 - progress) });
    }

    // Sparkles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + state.time * 3;
      const sr = progress * (B.SPREAD_RADIUS + 1) * TS * 0.7;
      const spx = mx + Math.cos(angle) * sr;
      const spy = my + Math.sin(angle) * sr;
      g.circle(spx, spy, 1.5).fill({ color: 0xddaaff, alpha: Math.max(0, 0.8 - progress) });
    }
  }

  // ---------------------------------------------------------------------------
  // Night overlay
  // ---------------------------------------------------------------------------

  private _drawNightOverlay(state: PlagueRTState, ox: number, oy: number): void {
    const nightActive = state.dayTime >= B.NIGHT_START || state.dayTime < B.NIGHT_END;
    if (!nightActive) return;

    const g = this._nightGfx;
    const w = state.gridW * TS;
    const h = state.gridH * TS;

    // Blue-purple tint
    g.rect(ox, oy, w, h).fill({ color: 0x1a1a44, alpha: 0.55 });

    // Lantern light hole — circular cutout effect (lighter area around player)
    const px = ox + state.player.x * TS + TS / 2;
    const py = oy + state.player.y * TS + TS / 2;
    const lightR = TS * 3;
    g.circle(px, py, lightR).fill({ color: 0xffaa33, alpha: 0.08 });
    g.circle(px, py, lightR * 0.6).fill({ color: 0xffdd66, alpha: 0.06 });
  }

  // ---------------------------------------------------------------------------
  // Day/night transition banner
  // ---------------------------------------------------------------------------

  private _drawDayTransition(state: PlagueRTState, sw: number): void {
    if (state.dayTransitionTimer <= 0) return;
    const alpha = Math.min(1, state.dayTransitionTimer / (B.DAY_TRANSITION_TIME * 0.5));
    const color = state.dayTransitionText === "NIGHTFALL" ? 0x4444aa : 0xddaa44;

    const t = this._getText(state.dayTransitionText,
      mkStyle({ fontSize: 28, fill: color, fontWeight: "bold", letterSpacing: 8 }));
    t.anchor.set(0.5, 0.5);
    t.position.set(sw / 2, 100);
    t.alpha = alpha;
    this._overlay.addChild(t);
  }

  // ---------------------------------------------------------------------------
  // Wave preview countdown
  // ---------------------------------------------------------------------------

  private _drawWavePreview(state: PlagueRTState, sw: number): void {
    if (state.wavePreviewTimer <= 0) return;
    const t = this._getText(
      `RAT WAVE in ${Math.ceil(state.wavePreviewTimer)}s (${state.wavePreviewCount} rats)`,
      mkStyle({ fontSize: 14, fill: 0xff6644, fontWeight: "bold" }),
    );
    t.anchor.set(0.5, 0);
    t.position.set(sw / 2, 130);
    t.alpha = 0.5 + Math.sin(state.time * 6) * 0.4;
    this._overlay.addChild(t);
  }

  // ---------------------------------------------------------------------------
  // Combo display
  // ---------------------------------------------------------------------------

  private _drawComboDisplay(state: PlagueRTState, ox: number, oy: number): void {
    const p = state.player;
    if (p.cureStreak <= 1) return;

    const px = ox + p.x * TS + TS / 2;
    const py = oy + p.y * TS - 30;
    const t = this._getText(
      `x${p.cureStreak} (${p.comboMultiplier.toFixed(1)}x)`,
      mkStyle({ fontSize: 11, fill: 0xffdd44, fontWeight: "bold" }),
    );
    t.anchor.set(0.5, 0.5);
    t.position.set(px, py);
    this._fx.addChild(t);
  }

  // ---------------------------------------------------------------------------
  // Floating texts
  // ---------------------------------------------------------------------------

  private _drawFloatingTexts(state: PlagueRTState, _ox: number, _oy: number): void {
    for (const ft of state.floatingTexts) {
      const progress = 1 - ft.timer / ft.maxTimer;
      const fty = ft.y - progress * B.FLOAT_TEXT_RISE;
      const alpha = Math.min(1, ft.timer / (ft.maxTimer * 0.3));

      const t = this._getText(ft.text, mkStyle({ fontSize: ft.size ?? 10, fill: ft.color, fontWeight: "bold" }));
      t.anchor.set(0.5, 0.5);
      t.position.set(ft.x, fty);
      t.alpha = alpha;
      this._fx.addChild(t);
    }
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _drawHUD(state: PlagueRTState, sw: number, _sh: number): void {
    const g = this._hudGfx;
    const p = state.player;

    // Top bar background
    g.rect(0, 0, sw, 36).fill({ color: 0x0a0a0a, alpha: 0.85 });

    // Left: Day / Wave / Difficulty
    const nightActive = state.dayTime >= B.NIGHT_START || state.dayTime < B.NIGHT_END;
    const dayIcon = nightActive ? "\u263E" : "\u2600";
    const dayStr = `${dayIcon} Day ${state.day}  Wave ${state.wave}  Diff ${state.difficulty.toFixed(1)}x`;
    const dayText = this._getText(dayStr, mkStyle({ fontSize: 11, fill: 0xccaa88 }));
    dayText.position.set(8, 4);
    this._hud.addChild(dayText);

    // Day progress bar
    const dpBarX = 8;
    const dpBarW = 160;
    g.rect(dpBarX, 20, dpBarW, 4).fill({ color: 0x222222 });
    g.rect(dpBarX, 20, dpBarW * state.dayTime, 4).fill({ color: nightActive ? 0x4444aa : 0xddaa44 });

    // Center: Herb counts with colored dots
    const herbData: { type: HerbType; color: number; label: string }[] = [
      { type: HerbType.LAVENDER, color: 0xbb88ff, label: "L" },
      { type: HerbType.WORMWOOD, color: 0x88cc44, label: "W" },
      { type: HerbType.MANDRAKE, color: 0xaa44dd, label: "M" },
      { type: HerbType.GARLIC, color: 0xeeeecc, label: "G" },
    ];

    let herbX = 200;
    for (const hd of herbData) {
      g.circle(herbX, 10, 4).fill({ color: hd.color });
      const ht = this._getText(`${hd.label}:${p.herbs[hd.type]}`, mkStyle({ fontSize: 9, fill: 0xcccccc }));
      ht.position.set(herbX + 7, 4);
      this._hud.addChild(ht);
      herbX += 44;
    }

    // Items row
    let itemX = 200;
    const itemY = 18;
    const items = [
      { label: "Rem", count: p.remedies, color: 0x44ff88 },
      { label: "Smk", count: p.smokeBombs, color: 0x888888 },
      { label: "Inc", count: p.incense, color: 0xddaa44 },
      { label: "Trp", count: p.ratTraps, color: 0xaa7744 },
    ];
    for (const item of items) {
      const it = this._getText(`${item.label}:${item.count}`, mkStyle({ fontSize: 8, fill: item.color }));
      it.position.set(itemX, itemY);
      this._hud.addChild(it);
      itemX += 40;
    }

    // Garlic timer
    if (p.garlicAuraTimer > 0) {
      const gt = this._getText(`Garlic ${Math.ceil(p.garlicAuraTimer)}s`, mkStyle({ fontSize: 8, fill: 0xeeeecc }));
      gt.position.set(itemX, itemY);
      this._hud.addChild(gt);
    }

    // Crafting shortcuts
    const craftY = 26;
    const craftText = this._getText(
      "1:Remedy(L) 2:Smoke(W+G) 3:Incense(L+W) 4:Trap(2G)",
      mkStyle({ fontSize: 7, fill: 0x777766 }),
    );
    craftText.position.set(200, craftY);
    this._hud.addChild(craftText);

    // Score + combo (right of center)
    const score = scoreBreakdown(state);
    const scoreStr = `Score: ${score.total}`;
    const scoreText = this._getText(scoreStr, mkStyle({ fontSize: 11, fill: 0xffdd44, fontWeight: "bold" }));
    scoreText.anchor.set(1, 0);
    scoreText.position.set(sw - 190, 4);
    this._hud.addChild(scoreText);

    if (p.comboMultiplier > 1.0) {
      const comboText = this._getText(
        `Combo x${p.comboMultiplier.toFixed(1)}`,
        mkStyle({ fontSize: 9, fill: 0xffaa44 }),
      );
      comboText.anchor.set(1, 0);
      comboText.position.set(sw - 190, 17);
      this._hud.addChild(comboText);
    }

    // Right side: Village status
    const vsX = sw - 180;

    // WIN PROGRESS
    const winTarget = Math.ceil(state.houses.length * B.WIN_PERCENT);
    const loseAt = Math.ceil(state.houses.length * B.LOSE_PERCENT);
    const savedCount = state.houses.filter(h => h.state === HouseState.CURED || h.state === HouseState.HEALTHY).length;
    const deadCount = state.houses.filter(h => h.state === HouseState.DEAD).length;

    const wpText = this._getText("WIN PROGRESS", mkStyle({ fontSize: 8, fill: 0x888877, fontWeight: "bold" }));
    wpText.position.set(vsX, 4);
    this._hud.addChild(wpText);

    const savedText = this._getText(
      `Saved: ${savedCount}/${winTarget}`,
      mkStyle({ fontSize: 9, fill: savedCount >= winTarget ? 0x44ff44 : 0xccccaa }),
    );
    savedText.position.set(vsX, 14);
    this._hud.addChild(savedText);

    const lostText = this._getText(
      `Lost: ${deadCount}/${loseAt}`,
      mkStyle({ fontSize: 9, fill: deadCount >= loseAt - 2 ? 0xff4444 : 0xccccaa }),
    );
    lostText.position.set(vsX + 80, 14);
    this._hud.addChild(lostText);

    // Well / Church context
    let contextStr = "";
    if (state.wellActive) contextStr = "Well active - healing nearby!";
    else if (state.churchPos) {
      const cd = Math.sqrt(
        (state.player.x - state.churchPos.gx) ** 2 + (state.player.y - state.churchPos.gy) ** 2,
      );
      if (cd <= B.CHURCH_RADIUS) contextStr = "Church aura - plague slowed";
    }
    if (contextStr) {
      const ctxText = this._getText(contextStr, mkStyle({ fontSize: 8, fill: 0x88aacc }));
      ctxText.position.set(vsX, 26);
      this._hud.addChild(ctxText);
    }

    // Warnings
    const warningY = this._oy + state.gridH * TS + 8;
    const warnings: string[] = [];
    const critCount = state.houses.filter(h => h.state === HouseState.CRITICAL).length;
    if (critCount > 0) warnings.push(`${critCount} CRITICAL house${critCount > 1 ? "s" : ""}!`);
    if (state.dayTime >= B.NIGHT_WARN && state.dayTime < B.NIGHT_START) warnings.push("Night approaches...");
    if (nightActive) warnings.push("Night - plague spreads faster!");
    if (deadCount >= loseAt - 2 && deadCount < loseAt) warnings.push("Plague is overwhelming the village!");

    for (let i = 0; i < warnings.length; i++) {
      const warnColor = i === 0 && critCount > 0 ? 0xff4444 : 0xddaa44;
      const wt = this._getText(warnings[i], mkStyle({ fontSize: 10, fill: warnColor, fontWeight: "bold" }));
      wt.position.set(8, warningY + i * 14);
      wt.alpha = 0.7 + Math.sin(state.time * 4) * 0.3;
      this._hud.addChild(wt);
    }

    // Controls hint at bottom
    const ctrlText = this._getText(
      "WASD:Move SPACE:Treat 1-4:Craft Q:Smoke E:Incense R:Trap G:Garlic M:Mandrake ESC:Pause",
      mkStyle({ fontSize: 8, fill: 0x555544 }),
    );
    ctrlText.anchor.set(0.5, 0);
    ctrlText.position.set(sw / 2, warningY + warnings.length * 14 + 4);
    this._hud.addChild(ctrlText);
  }

  // ---------------------------------------------------------------------------
  // Menu screen
  // ---------------------------------------------------------------------------

  private _drawMenu(sw: number, sh: number): void {
    const g = this._overlayGfx;

    // Atmospheric dark background with fog
    g.rect(0, 0, sw, sh).fill({ color: 0x0d0d0a });

    // Fog layers
    for (let i = 0; i < 5; i++) {
      const fy = sh * 0.3 + i * 40;
      g.rect(0, fy, sw, 30).fill({ color: 0x222222, alpha: 0.15 - i * 0.02 });
    }

    // Border
    for (let i = 0; i < 3; i++) {
      g.rect(8 + i * 4, 8 + i * 4, sw - 16 - i * 8, sh - 16 - i * 8)
        .stroke({ color: 0x443322, width: 1, alpha: 0.15 - i * 0.04 });
    }

    // Title
    const title = this._getText("PLAGUE DOCTOR RT", mkStyle({
      fontSize: 26, fill: 0xccaa55, fontWeight: "bold", letterSpacing: 6,
    }));
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 40);
    this._overlay.addChild(title);

    const subtitle = this._getText("Real-Time Action / Strategy", mkStyle({
      fontSize: 12, fill: 0x887766, fontStyle: "italic",
    }));
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(sw / 2, 72);
    this._overlay.addChild(subtitle);

    // Objective box
    const boxX = sw / 2 - 200;
    const boxY = 100;
    const boxW = 400;
    const boxH = 120;
    g.roundRect(boxX, boxY, boxW, boxH, 6).fill({ color: 0x1a1a14, alpha: 0.9 });
    g.roundRect(boxX, boxY, boxW, boxH, 6).stroke({ color: 0x443322, width: 1 });

    const objTitle = this._getText("OBJECTIVE", mkStyle({ fontSize: 11, fill: 0xccaa88, fontWeight: "bold" }));
    objTitle.anchor.set(0.5, 0);
    objTitle.position.set(sw / 2, boxY + 8);
    this._overlay.addChild(objTitle);

    const objLines = [
      "Move through the village, treating infected houses before they die.",
      "Gather herbs to craft remedies, smoke bombs, incense, and rat traps.",
      "Stand near the WELL to heal nearby houses passively.",
      "The CHURCH slows plague spread in its radius.",
      `Save ${Math.floor(B.WIN_PERCENT * 100)}% of houses to WIN. Lose ${Math.floor(B.LOSE_PERCENT * 100)}% and you LOSE.`,
    ];
    for (let i = 0; i < objLines.length; i++) {
      const lt = this._getText(objLines[i], mkStyle({ fontSize: 9, fill: 0x998877 }));
      lt.anchor.set(0.5, 0);
      lt.position.set(sw / 2, boxY + 24 + i * 14);
      this._overlay.addChild(lt);
    }

    // Controls
    const ctrlY = boxY + boxH + 16;
    const ctrlTitle = this._getText("CONTROLS", mkStyle({ fontSize: 11, fill: 0xccaa88, fontWeight: "bold" }));
    ctrlTitle.anchor.set(0.5, 0);
    ctrlTitle.position.set(sw / 2, ctrlY);
    this._overlay.addChild(ctrlTitle);

    const ctrlLines = [
      "WASD/Arrows: Move  |  SPACE: Treat nearest house",
      "1: Remedy  2: Smoke  3: Incense  4: Trap",
      "Q: Use Smoke  E: Use Incense  R: Use Trap  G: Garlic  M: Mandrake",
      "ESC: Pause / Back to menu",
    ];
    for (let i = 0; i < ctrlLines.length; i++) {
      const ct = this._getText(ctrlLines[i], mkStyle({ fontSize: 9, fill: 0x887766 }));
      ct.anchor.set(0.5, 0);
      ct.position.set(sw / 2, ctrlY + 16 + i * 13);
      this._overlay.addChild(ct);
    }

    // Meta stats
    const meta = loadPlagueRTMeta();
    if (meta.totalGames > 0) {
      const metaY = ctrlY + 72;
      const metaLines = [
        `Games: ${meta.totalGames}  |  High Score: ${meta.highScore}  |  Best Day: ${meta.bestDay}`,
        `Best Saved: ${meta.bestSaved}  |  Total Saved: ${meta.totalSaved}  |  Best Streak: ${meta.bestStreak}`,
      ];
      for (let i = 0; i < metaLines.length; i++) {
        const mt = this._getText(metaLines[i], mkStyle({ fontSize: 9, fill: 0x665544 }));
        mt.anchor.set(0.5, 0);
        mt.position.set(sw / 2, metaY + i * 14);
        this._overlay.addChild(mt);
      }
    }

    // Start button
    const btnW = 160;
    const btnH = 36;
    const btnX = sw / 2 - btnW / 2;
    const btnY = sh - 100;
    g.roundRect(btnX, btnY, btnW, btnH, 6).fill({ color: 0x224422, alpha: 0.9 });
    g.roundRect(btnX, btnY, btnW, btnH, 6).stroke({ color: 0x44aa44, width: 1.5 });

    const startBtnGfx = new Graphics();
    startBtnGfx.roundRect(btnX, btnY, btnW, btnH, 6).fill({ color: 0x000000, alpha: 0.01 });
    startBtnGfx.eventMode = "static";
    startBtnGfx.cursor = "pointer";
    startBtnGfx.on("pointerdown", () => { if (this._onStart) this._onStart(); });
    this._overlay.addChild(startBtnGfx);

    const startText = this._getText("START GAME", mkStyle({
      fontSize: 14, fill: 0x44ff44, fontWeight: "bold",
    }));
    startText.anchor.set(0.5, 0.5);
    startText.position.set(sw / 2, btnY + btnH / 2);
    this._overlay.addChild(startText);

    // Back button
    const backY = btnY + btnH + 12;
    g.roundRect(sw / 2 - 55, backY, 110, 28, 5).fill({ color: 0x0a0a0a, alpha: 0.7 });
    g.roundRect(sw / 2 - 55, backY, 110, 28, 5).stroke({ color: 0x555544, width: 1 });

    const backBtnGfx = new Graphics();
    backBtnGfx.roundRect(sw / 2 - 55, backY, 110, 28, 5).fill({ color: 0x000000, alpha: 0.01 });
    backBtnGfx.eventMode = "static";
    backBtnGfx.cursor = "pointer";
    backBtnGfx.on("pointerdown", () => { if (this._onExit) this._onExit(); });
    this._overlay.addChild(backBtnGfx);

    const backText = this._getText("BACK", mkStyle({ fontSize: 11, fill: 0x888877, fontWeight: "bold" }));
    backText.anchor.set(0.5, 0.5);
    backText.position.set(sw / 2, backY + 14);
    this._overlay.addChild(backText);
  }

  // ---------------------------------------------------------------------------
  // Pause screen
  // ---------------------------------------------------------------------------

  private _drawPause(state: PlagueRTState, sw: number, sh: number): void {
    const g = this._overlayGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });

    const p = state.player;

    const title = this._getText("PAUSED", mkStyle({
      fontSize: 24, fill: 0xccaa55, fontWeight: "bold", letterSpacing: 4,
    }));
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 40);
    this._overlay.addChild(title);

    // Stats for strategy planning
    const stats = [
      `Day: ${state.day}  |  Wave: ${state.wave}  |  Difficulty: ${state.difficulty.toFixed(2)}x`,
      `Time: ${Math.floor(state.time)}s  |  Layout: ${state.layout}`,
      "",
      `Villagers Saved: ${p.villagersSaved}  |  Lost: ${p.villagersLost}  |  Total: ${state.totalVillagers}`,
      `Cures: ${p.curesPerformed}  |  Streak: ${p.cureStreak} (Best: ${p.bestStreak})`,
      `Combo: ${p.comboMultiplier.toFixed(1)}x  |  Rats Killed: ${state.ratsKilled}`,
      "",
      `Herbs: L:${p.herbs[HerbType.LAVENDER]} W:${p.herbs[HerbType.WORMWOOD]} M:${p.herbs[HerbType.MANDRAKE]} G:${p.herbs[HerbType.GARLIC]}`,
      `Items: Remedies:${p.remedies} Smoke:${p.smokeBombs} Incense:${p.incense} Traps:${p.ratTraps}`,
      "",
      `Houses: ${state.houses.filter(h => h.state === HouseState.HEALTHY).length} healthy, ` +
      `${state.houses.filter(h => h.state === HouseState.INFECTED).length} infected, ` +
      `${state.houses.filter(h => h.state === HouseState.CRITICAL).length} critical, ` +
      `${state.houses.filter(h => h.state === HouseState.CURED).length} cured, ` +
      `${state.houses.filter(h => h.state === HouseState.DEAD).length} dead`,
    ];

    for (let i = 0; i < stats.length; i++) {
      const st = this._getText(stats[i], mkStyle({ fontSize: 10, fill: 0xaa9977 }));
      st.anchor.set(0.5, 0);
      st.position.set(sw / 2, 80 + i * 16);
      this._overlay.addChild(st);
    }

    const score = scoreBreakdown(state);
    const scoreText = this._getText(`Score: ${score.total}`, mkStyle({ fontSize: 14, fill: 0xffdd44, fontWeight: "bold" }));
    scoreText.anchor.set(0.5, 0);
    scoreText.position.set(sw / 2, 80 + stats.length * 16 + 8);
    this._overlay.addChild(scoreText);

    // Resume button
    const btnY = sh - 80;
    g.roundRect(sw / 2 - 80, btnY, 160, 34, 6).fill({ color: 0x224422, alpha: 0.9 });
    g.roundRect(sw / 2 - 80, btnY, 160, 34, 6).stroke({ color: 0x44aa44, width: 1 });

    const resumeBtnGfx = new Graphics();
    resumeBtnGfx.roundRect(sw / 2 - 80, btnY, 160, 34, 6).fill({ color: 0x000000, alpha: 0.01 });
    resumeBtnGfx.eventMode = "static";
    resumeBtnGfx.cursor = "pointer";
    resumeBtnGfx.on("pointerdown", () => { if (this._onResume) this._onResume(); });
    this._overlay.addChild(resumeBtnGfx);

    const resumeText = this._getText("RESUME (ESC)", mkStyle({ fontSize: 12, fill: 0x44ff44, fontWeight: "bold" }));
    resumeText.anchor.set(0.5, 0.5);
    resumeText.position.set(sw / 2, btnY + 17);
    this._overlay.addChild(resumeText);

    // Exit button
    const exitY = btnY + 44;
    g.roundRect(sw / 2 - 55, exitY, 110, 28, 5).fill({ color: 0x0a0a0a, alpha: 0.7 });
    g.roundRect(sw / 2 - 55, exitY, 110, 28, 5).stroke({ color: 0x555544, width: 1 });

    const exitBtnGfx = new Graphics();
    exitBtnGfx.roundRect(sw / 2 - 55, exitY, 110, 28, 5).fill({ color: 0x000000, alpha: 0.01 });
    exitBtnGfx.eventMode = "static";
    exitBtnGfx.cursor = "pointer";
    exitBtnGfx.on("pointerdown", () => { if (this._onExit) this._onExit(); });
    this._overlay.addChild(exitBtnGfx);

    const exitText = this._getText("EXIT", mkStyle({ fontSize: 11, fill: 0xff6644, fontWeight: "bold" }));
    exitText.anchor.set(0.5, 0.5);
    exitText.position.set(sw / 2, exitY + 14);
    this._overlay.addChild(exitText);
  }

  // ---------------------------------------------------------------------------
  // End screen
  // ---------------------------------------------------------------------------

  private _drawEndScreen(state: PlagueRTState, sw: number, sh: number): void {
    const g = this._overlayGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

    const won = state.phase === PlagueRTPhase.WON;
    const titleColor = won ? 0x44ff44 : 0xff4444;
    const titleStr = won ? "VILLAGE SAVED!" : "PLAGUE OVERWHELMED";

    const title = this._getText(titleStr, mkStyle({
      fontSize: 22, fill: titleColor, fontWeight: "bold", letterSpacing: 4,
    }));
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 30);
    this._overlay.addChild(title);

    // Reason text
    const reason = won
      ? "You successfully treated enough houses to save the village!"
      : "Too many houses fell to the plague. The village is lost.";
    const reasonText = this._getText(reason, mkStyle({ fontSize: 10, fill: 0xaa9977, fontStyle: "italic" }));
    reasonText.anchor.set(0.5, 0);
    reasonText.position.set(sw / 2, 58);
    this._overlay.addChild(reasonText);

    // Grade
    const score = scoreBreakdown(state);
    const grades = [
      { min: 2000, label: "S", color: 0xffd700 },
      { min: 1200, label: "A", color: 0x44ff44 },
      { min: 700, label: "B", color: 0x44aaff },
      { min: 300, label: "C", color: 0xdddd44 },
      { min: 100, label: "D", color: 0xff6644 },
      { min: 0, label: "F", color: 0xff2222 },
    ];
    let grade = grades[grades.length - 1];
    for (const gr of grades) {
      if (score.total >= gr.min) { grade = gr; break; }
    }

    const gradeText = this._getText(grade.label, mkStyle({
      fontSize: 48, fill: grade.color, fontWeight: "bold",
    }));
    gradeText.anchor.set(0.5, 0);
    gradeText.position.set(sw / 2, 78);
    this._overlay.addChild(gradeText);

    // Score breakdown
    const breakdown = [
      `Saved: ${state.player.villagersSaved} x ${B.SCORE_SAVED} = ${score.saved}`,
      `Days: ${state.day} x ${B.SCORE_DAY} = ${score.day}`,
      `Cures: ${state.player.curesPerformed} x ${B.SCORE_CURE} x ${state.player.comboMultiplier.toFixed(1)} = ${score.cures}`,
      `Rats killed: ${state.ratsKilled} x ${B.SCORE_RAT_KILL} = ${score.rats}`,
      `Best streak: ${state.player.bestStreak} x ${B.STREAK_BONUS} = ${score.streak}`,
      `Save % bonus: ${score.pctBonus}`,
      "",
      `TOTAL: ${score.total}`,
    ];

    const bStartY = 140;
    for (let i = 0; i < breakdown.length; i++) {
      const isTotal = i === breakdown.length - 1;
      const bt = this._getText(breakdown[i], mkStyle({
        fontSize: isTotal ? 14 : 10,
        fill: isTotal ? 0xffdd44 : 0xccaa88,
        fontWeight: isTotal ? "bold" : "normal",
      }));
      bt.anchor.set(0.5, 0);
      bt.position.set(sw / 2, bStartY + i * 15);
      this._overlay.addChild(bt);
    }

    // Layout name
    const layoutText = this._getText(`Village layout: ${state.layout}`, mkStyle({ fontSize: 9, fill: 0x776655 }));
    layoutText.anchor.set(0.5, 0);
    layoutText.position.set(sw / 2, bStartY + breakdown.length * 15 + 8);
    this._overlay.addChild(layoutText);

    // Exit button
    const btnY = sh - 60;
    g.roundRect(sw / 2 - 80, btnY, 160, 34, 6).fill({ color: 0x224422, alpha: 0.9 });
    g.roundRect(sw / 2 - 80, btnY, 160, 34, 6).stroke({ color: 0x44aa44, width: 1 });

    const exitBtnGfx = new Graphics();
    exitBtnGfx.roundRect(sw / 2 - 80, btnY, 160, 34, 6).fill({ color: 0x000000, alpha: 0.01 });
    exitBtnGfx.eventMode = "static";
    exitBtnGfx.cursor = "pointer";
    exitBtnGfx.on("pointerdown", () => { if (this._onExit) this._onExit(); });
    this._overlay.addChild(exitBtnGfx);

    const btnText = this._getText("BACK TO MENU", mkStyle({ fontSize: 12, fill: 0x44ff44, fontWeight: "bold" }));
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(sw / 2, btnY + 17);
    this._overlay.addChild(btnText);
  }
}
