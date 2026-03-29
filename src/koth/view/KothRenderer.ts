// ---------------------------------------------------------------------------
// King of the Hill — renderer (v3: slash arcs, veterancy, kill feed,
// war horn, screen shake, income display, PPS ticker)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { KothState } from "../state/KothState";
import {
  KothConfig, UNITS, GUARDIANS, RELICS, CATACLYSMS,
  ALL_UNIT_TYPES, ALL_UPGRADE_IDS, UPGRADES, DIFFICULTIES,
  VET_COLORS,
  type UnitType, type UpgradeId,
} from "../config/KothConfig";

const FONT = "Georgia, serif";

export class KothRenderer {
  readonly container = new Container();
  private _bg = new Graphics();
  private _terrainGfx = new Graphics();
  private _hillGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _fxGfx = new Graphics();
  private _uiGfx = new Graphics();
  private _spawnCallback: ((type: UnitType) => void) | null = null;
  private _warHornCallback: (() => void) | null = null;
  private _upgradeCallback: ((id: UpgradeId) => void) | null = null;
  setSpawnCallback(cb: (type: UnitType) => void): void { this._spawnCallback = cb; }
  setWarHornCallback(cb: () => void): void { this._warHornCallback = cb; }
  setUpgradeCallback(cb: (id: UpgradeId) => void): void { this._upgradeCallback = cb; }

  init(_sw: number, _sh: number): void {
    this.container.removeChildren();
    this._bg = new Graphics();
    this._terrainGfx = new Graphics();
    this._hillGfx = new Graphics();
    this._entityGfx = new Graphics();
    this._fxGfx = new Graphics();
    this._uiGfx = new Graphics();
    this.container.addChild(this._bg);
    this.container.addChild(this._terrainGfx);
    this.container.addChild(this._hillGfx);
    this.container.addChild(this._entityGfx);
    this.container.addChild(this._fxGfx);
    this.container.addChild(this._uiGfx);
  }

  getArenaOffset(sw: number): { ox: number; oy: number } {
    return { ox: Math.max(10, (sw - KothConfig.ARENA_W) / 2), oy: 65 };
  }

  draw(state: KothState, sw: number, sh: number): void {
    this._bg.clear();
    this._terrainGfx.clear();
    this._hillGfx.clear();
    this._entityGfx.clear();
    this._fxGfx.clear();
    this._uiGfx.clear();
    while (this._uiGfx.children.length > 0) this._uiGfx.removeChildAt(0);
    while (this._hillGfx.children.length > 0) this._hillGfx.removeChildAt(0);

    let { ox, oy } = this.getArenaOffset(sw);

    // Screen shake offset
    if (state.shakeTimer > 0) {
      const intensity = state.shakeIntensity * (state.shakeTimer / 0.4);
      ox += (Math.random() - 0.5) * intensity * 2;
      oy += (Math.random() - 0.5) * intensity * 2;
    }

    this._drawArena(state, ox, oy, sw, sh);
    this._drawObstacles(state, ox, oy);
    this._drawHill(state, ox, oy);
    this._drawRallyPoint(state, ox, oy);
    this._drawRelics(state, ox, oy);
    this._drawUnits(state, ox, oy);
    this._drawProjectiles(state, ox, oy);
    this._drawParticles(state, ox, oy);
    this._drawCataclysm(state, ox, oy);
    this._drawFloatingTexts(state, ox, oy);
    this._drawHUD(state, sw, sh, ox, oy);
    this._drawMinimap(state, sw, oy);
    this._drawKillFeed(state, ox, oy);
    this._drawAnnouncements(state, sw, sh);
  }

  destroy(): void {
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }

  private _drawArena(state: KothState, ox: number, oy: number, sw: number, sh: number): void {
    const aw = KothConfig.ARENA_W, ah = KothConfig.ARENA_H;

    // Screen background
    this._bg.rect(0, 0, sw, sh).fill({ color: 0x080806 });

    // Arena base with gradient bands
    this._bg.rect(ox, oy, aw, ah).fill({ color: 0x1a2218 });
    // Gradient strips for depth
    for (let i = 0; i < 6; i++) {
      const bandH = ah / 6;
      const alpha = 0.03 + i * 0.01;
      this._bg.rect(ox, oy + i * bandH, aw, bandH).fill({ color: i % 2 === 0 ? 0x1e2a1c : 0x182016, alpha });
    }

    // Terrain noise (grass patches, dirt spots)
    const th = (x: number, y: number) => { let h = x * 374761 + y * 668265; h = (h ^ (h >> 13)) * 127413; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
    for (let gx = 0; gx < aw; gx += 16) {
      for (let gy = 0; gy < ah; gy += 16) {
        const h = th(gx, gy);
        if (h > 0.6) {
          const col = h > 0.9 ? 0x2a3a22 : h > 0.8 ? 0x253520 : h > 0.7 ? 0x1e2c1a : 0x222e1e;
          this._bg.rect(ox + gx, oy + gy, 16, 16).fill({ color: col, alpha: 0.35 });
        }
        // Dirt patches
        if (h < 0.12) {
          this._bg.circle(ox + gx + 8, oy + gy + 8, 5 + h * 20).fill({ color: 0x2a2218, alpha: 0.2 });
        }
      }
    }

    // Grass tufts scattered
    for (let i = 0; i < 80; i++) {
      const gx = th(i * 137, 42) * aw;
      const gy = th(i * 97, 73) * ah;
      const gs = 2 + th(i, i) * 4;
      this._bg.ellipse(ox + gx, oy + gy, gs, gs * 0.4).fill({ color: 0x2a4a22, alpha: 0.25 });
    }

    // Subtle path/trail marks
    this._bg.moveTo(ox + aw * 0.15, oy + ah * 0.5)
      .lineTo(ox + aw * 0.5, oy + ah * 0.48)
      .lineTo(ox + aw * 0.85, oy + ah * 0.5)
      .stroke({ color: 0x2a2a1a, width: 12, alpha: 0.15 });

    // Arena border (double line)
    this._bg.rect(ox + 1, oy + 1, aw - 2, ah - 2).stroke({ color: 0x555544, width: 1, alpha: 0.4 });
    this._bg.rect(ox, oy, aw, ah).stroke({ color: 0x666655, width: 2 });

    // Spawn zones (larger, more detailed)
    const { SPAWN_OFFSET } = KothConfig;
    // Blue spawn
    this._bg.circle(ox + SPAWN_OFFSET, oy + ah / 2, 35).fill({ color: 0x4488cc, alpha: 0.06 });
    this._bg.circle(ox + SPAWN_OFFSET, oy + ah / 2, 35).stroke({ color: 0x4488cc, width: 1.5, alpha: 0.25 });
    this._bg.circle(ox + SPAWN_OFFSET, oy + ah / 2, 20).stroke({ color: 0x4488cc, width: 0.5, alpha: 0.15 });
    // Red spawn
    this._bg.circle(ox + aw - SPAWN_OFFSET, oy + ah / 2, 35).fill({ color: 0xcc4444, alpha: 0.06 });
    this._bg.circle(ox + aw - SPAWN_OFFSET, oy + ah / 2, 35).stroke({ color: 0xcc4444, width: 1.5, alpha: 0.25 });
    this._bg.circle(ox + aw - SPAWN_OFFSET, oy + ah / 2, 20).stroke({ color: 0xcc4444, width: 0.5, alpha: 0.15 });

    // War Horn aura
    if (state.warHornTimer > 0) {
      const pulse = 0.08 + Math.sin(Date.now() / 150) * 0.04;
      this._bg.rect(ox, oy, aw, ah).fill({ color: 0xffcc44, alpha: pulse });
    }
  }

  private _drawObstacles(state: KothState, ox: number, oy: number): void {
    for (const obs of state.obstacles) {
      const px = ox + obs.x, py = oy + obs.y;
      switch (obs.type) {
        case "rock":
          this._terrainGfx.ellipse(px, py + 2, obs.radius, obs.radius * 0.6).fill({ color: 0x555544, alpha: 0.7 });
          this._terrainGfx.ellipse(px, py, obs.radius * 0.9, obs.radius * 0.55).fill({ color: 0x666655 });
          this._terrainGfx.ellipse(px - 2, py - 2, obs.radius * 0.4, obs.radius * 0.25).fill({ color: 0x777766, alpha: 0.5 });
          break;
        case "tree":
          this._terrainGfx.rect(px - 2, py, 4, 8).fill({ color: 0x553322 });
          this._terrainGfx.circle(px, py - 4, obs.radius * 0.8).fill({ color: 0x2a4a22, alpha: 0.8 });
          this._terrainGfx.circle(px + 3, py - 2, obs.radius * 0.5).fill({ color: 0x335522, alpha: 0.6 });
          break;
        case "ruin":
          this._terrainGfx.rect(px - obs.radius, py - 3, obs.radius * 0.7, 6).fill({ color: 0x555544 });
          this._terrainGfx.rect(px + 2, py - 6, 4, 10).fill({ color: 0x666655 });
          this._terrainGfx.rect(px - obs.radius + 2, py - 5, 3, 4).fill({ color: 0x666655, alpha: 0.6 });
          break;
      }
    }
  }

  private _drawHill(state: KothState, ox: number, oy: number): void {
    const hx = ox + KothConfig.HILL_CENTER_X, hy = oy + KothConfig.HILL_CENTER_Y;
    const hr = KothConfig.HILL_RADIUS;
    const t = state.hillContestPulse;

    this._hillGfx.circle(hx, hy, hr).fill({ color: 0x2a2820, alpha: 0.6 });
    this._hillGfx.circle(hx, hy, hr * 0.7).fill({ color: 0x332e25, alpha: 0.4 });
    this._hillGfx.circle(hx, hy, hr * 0.35).fill({ color: 0x3a352a, alpha: 0.3 });

    let glowColor = 0x666655;
    let glowAlpha = 0.15 + Math.sin(t * 2) * 0.05;
    if (state.hillController === 0) { glowColor = state.players[0].color; glowAlpha = 0.25 + Math.sin(t * 3) * 0.1; }
    else if (state.hillController === 1) { glowColor = state.players[1].color; glowAlpha = 0.25 + Math.sin(t * 3) * 0.1; }

    this._hillGfx.circle(hx, hy, hr + 4).stroke({ color: glowColor, width: 3, alpha: glowAlpha });
    this._hillGfx.circle(hx, hy, hr - 2).stroke({ color: glowColor, width: 1.5, alpha: glowAlpha * 0.6 });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sx = hx + Math.cos(angle) * (hr - 6), sy = hy + Math.sin(angle) * (hr - 6);
      this._hillGfx.circle(sx, sy, 3).fill({ color: 0x555544, alpha: 0.6 });
      this._hillGfx.circle(sx, sy, 4).stroke({ color: glowColor, width: 0.8, alpha: 0.2 + Math.sin(t * 1.5 + i) * 0.15 });
    }

    // Capture meter bar
    const barW = hr * 1.6, barH = 6;
    const barX = hx - barW / 2, barY = hy + hr + 8;
    this._hillGfx.rect(barX, barY, barW, barH).fill({ color: 0x111111, alpha: 0.7 });
    const fillFrac = Math.abs(state.captureMeter) / 100;
    if (state.captureMeter > 0) {
      this._hillGfx.rect(hx, barY, barW / 2 * fillFrac, barH).fill({ color: state.players[0].color, alpha: 0.7 });
    } else if (state.captureMeter < 0) {
      const fw = barW / 2 * fillFrac;
      this._hillGfx.rect(hx - fw, barY, fw, barH).fill({ color: state.players[1].color, alpha: 0.7 });
    }
    this._hillGfx.rect(hx - 1, barY - 1, 2, barH + 2).fill({ color: 0x888877, alpha: 0.5 });
    const threshW = barW / 2 * 0.6;
    this._hillGfx.rect(hx + threshW, barY - 1, 1, barH + 2).fill({ color: state.players[0].color, alpha: 0.3 });
    this._hillGfx.rect(hx - threshW - 1, barY - 1, 1, barH + 2).fill({ color: state.players[1].color, alpha: 0.3 });

    let label = state.hillController >= 0 ? state.players[state.hillController].name : "Contested";
    if (state.streakTimer >= KothConfig.STREAK_THRESHOLD) {
      const mult = 1 + Math.floor(state.streakTimer / 10) * KothConfig.STREAK_MULT_PER_10S;
      label += ` (x${mult.toFixed(1)})`;
    }
    const lt = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: glowColor }) });
    lt.alpha = 0.8; lt.anchor.set(0.5, 0.5); lt.position.set(hx, hy - hr - 10);
    this._hillGfx.addChild(lt);

    // Guardian approach warning — pulsing red ring around hill
    if (state.guardianWarning > 0) {
      const warnPulse = 0.2 + Math.sin(Date.now() / 200) * 0.15;
      this._hillGfx.circle(hx, hy, hr + 8).stroke({ color: 0xff4422, width: 2, alpha: warnPulse });
      this._hillGfx.circle(hx, hy, hr + 14).stroke({ color: 0xff4422, width: 1, alpha: warnPulse * 0.5 });
      const warnTxt = new Text({ text: `Guardians in ${Math.ceil(state.guardianWarning)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xff6644 }) });
      warnTxt.anchor.set(0.5, 0); warnTxt.position.set(hx, hy + hr + 18);
      warnTxt.alpha = warnPulse + 0.3;
      this._hillGfx.addChild(warnTxt);
    }
  }

  private _drawRallyPoint(state: KothState, ox: number, oy: number): void {
    if (!state.hasRallyPoint) return;
    const rx = ox + state.rallyX, ry = oy + state.rallyY;
    const pulse = 0.4 + Math.sin(Date.now() / 250) * 0.2;
    this._entityGfx.moveTo(rx, ry).lineTo(rx, ry - 14).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
    this._entityGfx.moveTo(rx, ry - 14).lineTo(rx + 8, ry - 11).lineTo(rx, ry - 8).fill({ color: state.players[0].color, alpha: pulse });
    this._entityGfx.circle(rx, ry, 6).stroke({ color: state.players[0].color, width: 1, alpha: pulse * 0.6 });
  }

  private _drawRelics(state: KothState, ox: number, oy: number): void {
    const t = Date.now() / 1000;
    for (const relic of state.relics) {
      if (!relic.alive) continue;
      const rx = ox + relic.x, ry = oy + relic.y;
      const def = RELICS[relic.type];
      const pulse = 0.6 + Math.sin(t * 3) * 0.2;
      this._entityGfx.circle(rx, ry, 12).fill({ color: def.color, alpha: 0.1 });
      this._entityGfx.circle(rx, ry, 8).fill({ color: def.color, alpha: pulse * 0.3 });
      this._entityGfx.moveTo(rx, ry - 6).lineTo(rx + 5, ry).lineTo(rx, ry + 6).lineTo(rx - 5, ry).closePath().fill({ color: def.color, alpha: 0.8 });
      this._entityGfx.circle(rx, ry, 10).stroke({ color: def.color, width: 1, alpha: pulse });
      // Relic name label
      const rl = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: def.color }) });
      rl.alpha = 0.7; rl.anchor.set(0.5, 0); rl.position.set(rx, ry + 10);
      this._entityGfx.addChild(rl);
    }
  }

  private _drawUnits(state: KothState, ox: number, oy: number): void {
    const sorted = [...state.units].sort((a, b) => a.y - b.y);
    for (const u of sorted) {
      if (!u.alive) continue;
      const ux = ox + u.x, uy = oy + u.y;
      const s = u.size;

      // Shadow
      this._entityGfx.ellipse(ux, uy + s * 0.5, s * 0.8, s * 0.3).fill({ color: 0x000000, alpha: 0.2 });

      const drawColor = u.hitFlash > 0 ? 0xffffff : u.color;
      this._drawUnitShape(ux, uy, s, drawColor, u.shape, u.facingAngle);

      // Veterancy glow ring
      if (u.vetLevel > 0) {
        const vetColor = VET_COLORS[u.vetLevel] ?? 0xffd700;
        this._entityGfx.circle(ux, uy, s + 2.5).stroke({ color: vetColor, width: 1.5, alpha: 0.6 });
        // Vet level pips (small dots above unit)
        for (let vi = 0; vi < u.vetLevel; vi++) {
          this._entityGfx.circle(ux - (u.vetLevel - 1) * 2.5 + vi * 5, uy - s - 9, 1.5).fill({ color: vetColor });
        }
      }

      // Owner ring
      if (u.owner < 2) {
        this._entityGfx.circle(ux, uy, s + 1.5).stroke({ color: state.players[u.owner].color, width: 1.5, alpha: 0.5 });
      } else {
        this._entityGfx.circle(ux, uy, s + 1).stroke({ color: 0x888877, width: 1, alpha: 0.4 });
      }

      // HP bar
      if (u.hp < u.maxHp) {
        const bw = s * 2.5, bh = 2.5;
        const hpFrac = Math.max(0, u.hp / u.maxHp);
        this._entityGfx.rect(ux - bw / 2, uy - s - 6, bw, bh).fill({ color: 0x222222, alpha: 0.6 });
        const hpColor = hpFrac > 0.5 ? 0x44cc44 : hpFrac > 0.25 ? 0xccaa44 : 0xcc4444;
        this._entityGfx.rect(ux - bw / 2, uy - s - 6, bw * hpFrac, bh).fill({ color: hpColor });
      }

      // Melee slash arc VFX
      if (u.slashArc > 0) {
        const arcAlpha = u.slashArc / 0.15;
        const arcR = s + 6;
        const startAngle = u.slashAngle - 0.6;
        const endAngle = u.slashAngle + 0.6;
        this._entityGfx.arc(ux, uy, arcR, startAngle, endAngle).stroke({ color: 0xffffff, width: 2, alpha: arcAlpha * 0.7 });
      }

      // Guardian name label
      if (u.owner === 2) {
        const gDef = GUARDIANS[u.type as import("../config/KothConfig").GuardianType];
        if (gDef) {
          const nt = new Text({ text: gDef.name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x999988 }) });
          nt.anchor.set(0.5, 0); nt.position.set(ux, uy + s + 3);
          this._entityGfx.addChild(nt);
        }
      }

      // Slow debuff indicator — blue tint overlay
      if (u.slowDebuff > 0.05) {
        this._entityGfx.circle(ux, uy, s * 0.9).fill({ color: 0x4488ff, alpha: u.slowDebuff * 0.3 });
      }

      // War horn buff glow (player 0 only)
      if (u.owner === 0 && state.warHornTimer > 0) {
        this._entityGfx.circle(ux, uy, s + 3).stroke({ color: 0xffcc44, width: 1, alpha: 0.25 + Math.sin(Date.now() / 150) * 0.1 });
      }

      // Paladin heal aura
      if (u.owner < 2) {
        const def = UNITS[u.type as UnitType];
        if (def?.passive === "aura_heal") {
          this._entityGfx.circle(ux, uy, KothConfig.PALADIN_HEAL_RADIUS).stroke({ color: 0x44ff88, width: 0.5, alpha: 0.12 });
        }
      }
    }
  }

  private _drawUnitShape(x: number, y: number, s: number, color: number, shape: string, angle?: number): void {
    const g = this._entityGfx;
    const sc = s * 1.3; // scale up slightly for detail
    const a = angle ?? 0;
    const cos = Math.cos(a), sin = Math.sin(a);
    const rot = (px: number, py: number): [number, number] => [x + px * cos - py * sin, y + px * sin + py * cos];

    // Body (rounded torso)
    g.roundRect(x - sc * 0.5, y - sc * 0.6, sc, sc * 1.2, sc * 0.2).fill({ color });
    // Body highlight
    g.roundRect(x - sc * 0.35, y - sc * 0.5, sc * 0.3, sc * 0.15, 1).fill({ color: 0xffffff, alpha: 0.12 });

    // Head
    const headY = y - sc * 0.9;
    g.circle(x, headY, sc * 0.35).fill({ color: 0xffcc99 });
    // Eyes (facing direction)
    const [ex, ey] = rot(sc * 0.12, 0);
    g.circle(ex, headY - sc * 0.05, sc * 0.06).fill({ color: 0x222222 });

    // Weapon/class detail
    switch (shape) {
      case "diamond": {
        // Cavalry — lance pointing forward + horse ear shapes
        const [lx, ly] = rot(sc * 1.2, 0);
        const [lb, lby] = rot(sc * 0.3, 0);
        g.moveTo(lb, lby).lineTo(lx, ly).stroke({ color: 0xccccdd, width: 2 });
        // Shield on side
        const [sx2, sy2] = rot(0, -sc * 0.5);
        g.circle(sx2, sy2, sc * 0.25).fill({ color, alpha: 0.8 });
        g.circle(sx2, sy2, sc * 0.25).stroke({ color: 0xffd700, width: 1 });
        break;
      }
      case "square": {
        // Pikeman — long spear + square shield
        const [lx, ly] = rot(sc * 1.5, 0);
        const [lb, lby] = rot(sc * 0.2, 0);
        g.moveTo(lb, lby).lineTo(lx, ly).stroke({ color: 0x887766, width: 1.5 });
        // Spearhead
        g.circle(lx, ly, sc * 0.12).fill({ color: 0xccccdd });
        // Shield
        const [sx2, sy2] = rot(-sc * 0.15, -sc * 0.3);
        g.roundRect(sx2 - sc * 0.2, sy2 - sc * 0.3, sc * 0.4, sc * 0.6, 2).fill({ color });
        g.roundRect(sx2 - sc * 0.2, sy2 - sc * 0.3, sc * 0.4, sc * 0.6, 2).stroke({ color: 0x888888, width: 1 });
        break;
      }
      case "triangle": {
        // Archer/Crossbow — bow drawn
        const [bx, by] = rot(sc * 0.5, 0);
        g.arc(bx, by, sc * 0.5, a - 0.8, a + 0.8).stroke({ color: 0x886644, width: 1.5 });
        // Arrow
        const [ax, ay] = rot(sc * 1.0, 0);
        g.moveTo(bx, by).lineTo(ax, ay).stroke({ color: 0xcccccc, width: 1 });
        // Quiver on back
        const [qx, qy] = rot(-sc * 0.4, sc * 0.2);
        g.roundRect(qx - 1, qy - sc * 0.3, 3, sc * 0.5, 1).fill({ color: 0x664422 });
        break;
      }
      case "star": {
        // Mage — staff with orb
        const [sx2, sy2] = rot(sc * 0.8, sc * 0.15);
        g.moveTo(x, y + sc * 0.3).lineTo(sx2, sy2 - sc * 0.8).stroke({ color: 0x553322, width: 1.5 });
        // Orb glow
        g.circle(sx2, sy2 - sc * 0.85, sc * 0.15).fill({ color: 0x8866ff, alpha: 0.8 });
        g.circle(sx2, sy2 - sc * 0.85, sc * 0.25).fill({ color: 0x6644cc, alpha: 0.2 });
        // Robe hem
        g.roundRect(x - sc * 0.55, y + sc * 0.3, sc * 1.1, sc * 0.3, 2).fill({ color });
        break;
      }
      case "hex": {
        // Paladin — shield + sword + halo
        const [sx2, sy2] = rot(sc * 0.8, 0);
        g.moveTo(x, y - sc * 0.2).lineTo(sx2, sy2 - sc * 0.1).stroke({ color: 0xddddee, width: 2 });
        // Shield
        const [shx, shy] = rot(-sc * 0.2, -sc * 0.3);
        g.circle(shx, shy, sc * 0.3).fill({ color: 0xffd700 });
        g.moveTo(shx, shy - sc * 0.2).lineTo(shx, shy + sc * 0.2).stroke({ color: 0xcc2222, width: 1.5 });
        g.moveTo(shx - sc * 0.15, shy).lineTo(shx + sc * 0.15, shy).stroke({ color: 0xcc2222, width: 1.5 });
        // Halo
        g.circle(x, headY - sc * 0.3, sc * 0.2).stroke({ color: 0xffd700, width: 1, alpha: 0.5 });
        break;
      }
      default: {
        // Swordsman — sword + small shield
        const [sx2, sy2] = rot(sc * 0.9, -sc * 0.1);
        g.moveTo(x, y).lineTo(sx2, sy2).stroke({ color: 0xccccdd, width: 1.5 });
        // Crossguard
        const [cx2, cy2] = rot(sc * 0.3, -sc * 0.05);
        g.moveTo(cx2 - sin * sc * 0.15, cy2 + cos * sc * 0.15)
          .lineTo(cx2 + sin * sc * 0.15, cy2 - cos * sc * 0.15)
          .stroke({ color: 0x888888, width: 1.5 });
        break;
      }
    }
  }

  private _drawProjectiles(state: KothState, ox: number, oy: number): void {
    // Ranged attack trails (brief line flashes)
    for (const trail of state.rangedTrails) {
      const alpha = trail.timer / KothConfig.RANGED_TRAIL_DURATION;
      this._fxGfx.moveTo(ox + trail.x1, oy + trail.y1).lineTo(ox + trail.x2, oy + trail.y2)
        .stroke({ color: trail.color, width: 1, alpha: alpha * 0.4 });
    }
    for (const p of state.projectiles) {
      const px = ox + p.x, py = oy + p.y;
      const srcDef = UNITS[p.sourceType as UnitType];
      if (srcDef?.passive === "splash") {
        this._fxGfx.circle(px, py, 3.5).fill({ color: 0x8844cc });
        this._fxGfx.circle(px, py, 5).stroke({ color: 0xaa66ee, width: 0.5, alpha: 0.3 });
      } else {
        this._fxGfx.circle(px, py, 2.5).fill({ color: p.color });
      }
      this._fxGfx.circle(px - 1, py - 1, 1.5).fill({ color: p.color, alpha: 0.3 });
    }
  }

  private _drawParticles(state: KothState, ox: number, oy: number): void {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this._fxGfx.circle(ox + p.x, oy + p.y, p.size * alpha).fill({ color: p.color, alpha });
    }
  }

  private _drawCataclysm(state: KothState, ox: number, oy: number): void {
    if (!state.cataclysm) return;
    const c = state.cataclysm;
    const def = CATACLYSMS[c.type];
    const progress = 1 - c.timer / def.duration;
    switch (c.type) {
      case "meteor_shower": {
        const pulse = 0.15 + Math.sin(Date.now() / 200) * 0.08;
        this._fxGfx.circle(ox + c.x, oy + c.y, KothConfig.HILL_RADIUS * 1.5).fill({ color: 0xff4400, alpha: pulse });
        break;
      }
      case "earthquake": {
        for (let ring = 0; ring < 3; ring++) {
          const r = (progress * 200 + ring * 60) % 200;
          this._fxGfx.circle(ox + KothConfig.HILL_CENTER_X, oy + KothConfig.HILL_CENTER_Y, r).stroke({ color: 0x886644, width: 2, alpha: 0.15 * (1 - r / 200) });
        }
        break;
      }
      case "dragon_flyover": {
        const dx = ox + KothConfig.ARENA_W * progress;
        const dy = oy + KothConfig.HILL_CENTER_Y + Math.sin(progress * Math.PI) * 40;
        this._fxGfx.ellipse(dx, dy, 20, 8).fill({ color: 0x442200, alpha: 0.7 });
        const wingFlap = Math.sin(Date.now() / 100) * 8;
        this._fxGfx.moveTo(dx - 10, dy).lineTo(dx - 25, dy - 15 + wingFlap).lineTo(dx, dy).fill({ color: 0x553311, alpha: 0.6 });
        this._fxGfx.moveTo(dx + 10, dy).lineTo(dx + 25, dy - 15 - wingFlap).lineTo(dx, dy).fill({ color: 0x553311, alpha: 0.6 });
        this._fxGfx.circle(dx, dy + 10, 15).fill({ color: 0xff4400, alpha: 0.15 });
        break;
      }
      case "blizzard":
        this._fxGfx.rect(ox, oy, KothConfig.ARENA_W, KothConfig.ARENA_H).fill({ color: 0x88aadd, alpha: 0.06 });
        break;
    }
  }

  // ---- Kill feed (bottom-right of arena) ----
  private _drawKillFeed(state: KothState, ox: number, oy: number): void {
    const feedX = ox + KothConfig.ARENA_W - 10;
    let feedY = oy + KothConfig.ARENA_H - 10;
    for (let i = state.killFeed.length - 1; i >= 0; i--) {
      const entry = state.killFeed[i];
      const alpha = Math.min(1, entry.timer);
      const t = new Text({ text: entry.text, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: entry.color }) });
      t.alpha = alpha; t.anchor.set(1, 1); t.position.set(feedX, feedY);
      this._entityGfx.addChild(t);
      feedY -= 14;
    }
  }

  // ---- HUD ----
  private _drawHUD(state: KothState, sw: number, _sh: number, ox: number, oy: number): void {
    const g = this._uiGfx;
    const barY = 5;
    g.rect(0, 0, sw, 62).fill({ color: 0x0a0a06, alpha: 0.92 });

    const p0 = state.players[0], p1 = state.players[1];
    const scoreBarW = 240, scoreBarH = 18;
    const sbx0 = sw / 2 - scoreBarW - 40;
    const sbx1 = sw / 2 + 40;

    const scoreLimit = DIFFICULTIES[state.difficulty].scoreLimit;
    for (const [p, sbx, align] of [[p0, sbx0, "right"], [p1, sbx1, "left"]] as const) {
      g.rect(sbx, barY + 8, scoreBarW, scoreBarH).fill({ color: 0x111111, alpha: 0.8 });
      g.rect(sbx, barY + 8, scoreBarW * Math.min(1, p.score / scoreLimit), scoreBarH).fill({ color: p.color, alpha: 0.6 });
      g.rect(sbx, barY + 8, scoreBarW, scoreBarH).stroke({ color: p.color, width: 1, alpha: 0.4 });
      const txt = `${p.name}: ${Math.floor(p.score)}/${scoreLimit}`;
      const st = new Text({ text: txt, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: p.color, fontWeight: "bold" }) });
      st.anchor.set(align === "right" ? 1 : 0, 0.5);
      st.position.set(align === "right" ? sbx + scoreBarW - 6 : sbx + 6, barY + 8 + scoreBarH / 2);
      g.addChild(st);
    }

    // Points per second display
    if (state.hillController >= 0) {
      const minutes = state.elapsed / 60;
      let pps = KothConfig.BASE_POINTS_PER_SEC + minutes * KothConfig.ESCALATION_RATE;
      if (state.streakTimer >= KothConfig.STREAK_THRESHOLD) {
        pps *= 1 + Math.floor(state.streakTimer / 10) * KothConfig.STREAK_MULT_PER_10S;
      }
      const ppsTxt = new Text({ text: `+${pps.toFixed(1)}/s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: state.players[state.hillController].color }) });
      ppsTxt.anchor.set(0.5, 0); ppsTxt.position.set(sw / 2, barY + 45);
      g.addChild(ppsTxt);
    }

    const crownTxt = new Text({ text: "KING OF THE HILL", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xccaa44, letterSpacing: 2 }) });
    crownTxt.anchor.set(0.5, 0); crownTxt.position.set(sw / 2, barY + 1);
    g.addChild(crownTxt);

    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    const timeTxt = new Text({ text: `${mins}:${secs.toString().padStart(2, "0")}`, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0x888888 }) });
    timeTxt.anchor.set(0.5, 0); timeTxt.position.set(sw / 2, barY + 15);
    g.addChild(timeTxt);

    const ctrlColor = state.hillController >= 0 ? state.players[state.hillController].color : 0x666655;
    const ctrlLabel = state.hillController >= 0 ? state.players[state.hillController].name + " controls" : "Contested";
    const ctrlTxt = new Text({ text: ctrlLabel, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: ctrlColor }) });
    ctrlTxt.anchor.set(0.5, 0); ctrlTxt.position.set(sw / 2, barY + 32);
    g.addChild(ctrlTxt);

    // Gold + income + unit count
    const p0UnitCount = state.units.filter(u => u.alive && u.owner === 0).length;
    const p1UnitCount = state.units.filter(u => u.alive && u.owner === 1).length;
    const p0Income = KothConfig.PASSIVE_INCOME + (p0.controllingHill ? KothConfig.HILL_INCOME_BONUS : 0);
    const goldTxt = new Text({ text: `Gold: ${Math.floor(p0.gold)} (+${p0Income}/s)  |  Army: ${p0UnitCount}/${KothConfig.MAX_UNITS_PER_PLAYER}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xffd700 }) });
    goldTxt.position.set(sbx0, barY + 30); g.addChild(goldTxt);

    const enemyInfoTxt = new Text({ text: `Army: ${p1UnitCount}/${KothConfig.MAX_UNITS_PER_PLAYER}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xcc8888 }) });
    enemyInfoTxt.anchor.set(1, 0); enemyInfoTxt.position.set(sbx1 + scoreBarW, barY + 30);
    g.addChild(enemyInfoTxt);

    // Active buffs
    let buffX = sbx0;
    const buffY = barY + 46;
    if (p0.speedBuffTimer > 0) {
      const bt = new Text({ text: `SWIFT ${Math.ceil(p0.speedBuffTimer)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x44ccff }) });
      bt.position.set(buffX, buffY); g.addChild(bt); buffX += 70;
    }
    if (p0.damageBuffTimer > 0) {
      const bt = new Text({ text: `FURY ${Math.ceil(p0.damageBuffTimer)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xff4444 }) });
      bt.position.set(buffX, buffY); g.addChild(bt); buffX += 65;
    }
    if (p0.armorBuffTimer > 0) {
      const bt = new Text({ text: `SHIELD ${Math.ceil(p0.armorBuffTimer)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x8888cc }) });
      bt.position.set(buffX, buffY); g.addChild(bt); buffX += 75;
    }
    if (state.warHornTimer > 0) {
      const bt = new Text({ text: `HORN ${Math.ceil(state.warHornTimer)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xffcc44, fontWeight: "bold" }) });
      bt.position.set(buffX, buffY); g.addChild(bt);
    }

    if (state.cataclysm) {
      const cDef = CATACLYSMS[state.cataclysm.type];
      const warnTxt = new Text({ text: `${cDef.name}!`, style: new TextStyle({ fontFamily: FONT, fontSize: 14, fill: cDef.color, fontWeight: "bold" }) });
      warnTxt.anchor.set(0.5, 0); warnTxt.position.set(sw / 2, barY + 48);
      g.addChild(warnTxt);
    }

    // ---- Bottom panel: Unit shop + War Horn button ----
    const panelH = 80;
    const panelY = oy + KothConfig.ARENA_H + 10;
    g.rect(ox, panelY, KothConfig.ARENA_W, panelH).fill({ color: 0x0e0e0a, alpha: 0.92 });
    g.rect(ox, panelY, KothConfig.ARENA_W, panelH).stroke({ color: 0x333322, width: 1 });

    // War Horn button (left side of panel)
    const hornW = 60, hornH = 60;
    const hornX = ox + 8, hornY = panelY + 8;
    const hornReady = state.warHornCooldown <= 0 && state.warHornTimer <= 0;
    const hornBtn = new Graphics();
    hornBtn.roundRect(hornX, hornY, hornW, hornH, 4).fill({ color: hornReady ? 0x1a1808 : 0x0c0c08, alpha: 0.9 });
    hornBtn.roundRect(hornX, hornY, hornW, hornH, 4).stroke({ color: hornReady ? 0xccaa44 : 0x332222, width: hornReady ? 2 : 1 });
    hornBtn.eventMode = "static"; hornBtn.cursor = hornReady ? "pointer" : "default";
    hornBtn.on("pointerdown", () => { if (this._warHornCallback) this._warHornCallback(); });
    this._uiGfx.addChild(hornBtn);

    const hornIcon = new Text({ text: "H", style: new TextStyle({ fontFamily: FONT, fontSize: 20, fill: hornReady ? 0xffcc44 : 0x444422, fontWeight: "bold" }) });
    hornIcon.anchor.set(0.5, 0); hornIcon.position.set(hornX + hornW / 2, hornY + 4);
    this._uiGfx.addChild(hornIcon);

    const hornLabel = new Text({
      text: state.warHornCooldown > 0 ? `${Math.ceil(state.warHornCooldown)}s` : "Horn",
      style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: hornReady ? 0xccaa88 : 0x555544 }),
    });
    hornLabel.anchor.set(0.5, 0); hornLabel.position.set(hornX + hornW / 2, hornY + 30);
    this._uiGfx.addChild(hornLabel);

    // Cooldown overlay
    if (state.warHornCooldown > 0) {
      const cdFrac = state.warHornCooldown / KothConfig.WAR_HORN_COOLDOWN;
      hornBtn.rect(hornX, hornY + hornH * (1 - cdFrac), hornW, hornH * cdFrac).fill({ color: 0x000000, alpha: 0.5 });
    }

    // Unit buttons (shifted right to make room for horn)
    const btnW = 80, btnH = 60, btnGap = 4;
    const shopStartX = hornX + hornW + 10;
    const totalBtnsW = ALL_UNIT_TYPES.length * (btnW + btnGap) - btnGap;
    let bx = shopStartX + ((KothConfig.ARENA_W - hornW - 26 - totalBtnsW) / 2);

    for (const type of ALL_UNIT_TYPES) {
      const def = UNITS[type];
      const isSelected = state.selectedUnit === type;
      const canAfford = p0.gold >= def.cost;
      const atCap = p0UnitCount >= KothConfig.MAX_UNITS_PER_PLAYER;

      const btn = new Graphics();
      btn.roundRect(bx, panelY + 8, btnW, btnH, 4).fill({ color: isSelected ? 0x1a1a0e : 0x0c0c08, alpha: 0.9 });
      btn.roundRect(bx, panelY + 8, btnW, btnH, 4).stroke({
        color: isSelected ? 0xccaa44 : canAfford && !atCap ? 0x444433 : 0x332222,
        width: isSelected ? 2 : 1,
      });
      btn.eventMode = "static"; btn.cursor = "pointer";
      const tp = type;
      btn.on("pointerdown", () => { if (this._spawnCallback) this._spawnCallback(tp); });
      btn.on("pointerover", () => { state.hoveredUnit = tp; });
      btn.on("pointerout", () => { if (state.hoveredUnit === tp) state.hoveredUnit = null; });
      this._uiGfx.addChild(btn);

      const previewColor = canAfford && !atCap ? def.color : 0x444444;
      this._drawUnitShape(bx + btnW / 2, panelY + 26, def.size + 1, previewColor, def.shape);

      const nameTxt = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: canAfford ? 0xccccaa : 0x555544 }) });
      nameTxt.anchor.set(0.5, 0); nameTxt.position.set(bx + btnW / 2, panelY + 38);
      this._uiGfx.addChild(nameTxt);

      const costTxt = new Text({ text: `${def.cost}g`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: canAfford ? 0xffd700 : 0x664422, fontWeight: "bold" }) });
      costTxt.anchor.set(0.5, 0); costTxt.position.set(bx + btnW / 2, panelY + 50);
      this._uiGfx.addChild(costTxt);

      const keys = ["Q", "W", "E", "R", "T", "Y", "U", "I"];
      const idx = ALL_UNIT_TYPES.indexOf(type);
      const keyTxt = new Text({ text: keys[idx], style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x555544 }) });
      keyTxt.position.set(bx + 3, panelY + 10);
      this._uiGfx.addChild(keyTxt);

      bx += btnW + btnGap;
    }

    // Tooltip
    if (state.hoveredUnit) {
      const def = UNITS[state.hoveredUnit];
      const tipW = 220, tipH = 80;
      const tipX = sw / 2 - tipW / 2, tipY = panelY - tipH - 8;
      g.roundRect(tipX, tipY, tipW, tipH, 5).fill({ color: 0x0a0a06, alpha: 0.95 });
      g.roundRect(tipX, tipY, tipW, tipH, 5).stroke({ color: 0x555544, width: 1 });
      const statLines = [
        `HP: ${def.hp}  ATK: ${def.atk}  SPD: ${def.speed}`,
        `Range: ${def.range > 0 ? def.range + "px" : "Melee"}  Rate: ${def.attackRate}/s`,
        def.passiveDesc,
      ];
      const nameTip = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: def.color, fontWeight: "bold" }) });
      nameTip.position.set(tipX + 8, tipY + 5); g.addChild(nameTip);
      for (let li = 0; li < statLines.length; li++) {
        const lt = new Text({ text: statLines[li], style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: li < 2 ? 0xccccaa : 0x88cc88 }) });
        lt.position.set(tipX + 8, tipY + 22 + li * 16); g.addChild(lt);
      }
    }

    // ---- Upgrade row (below shop panel) ----
    const upgY = panelY + panelH + 2;
    const upgBtnW = 48, upgBtnH = 28, upgGap = 3;
    let upgX = ox + 5;

    // Speed label
    const speedTxt = new Text({ text: `${state.speedMult}x`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x888866 }) });
    speedTxt.position.set(upgX, upgY + 2);
    this._uiGfx.addChild(speedTxt);
    upgX += 22;

    // Pause indicator
    if (state.paused) {
      const pt = new Text({ text: "PAUSED", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xffcc44, fontWeight: "bold" }) });
      pt.position.set(upgX, upgY + 2); this._uiGfx.addChild(pt);
      upgX += 52;
    }
    upgX += 10;

    // Upgrade buttons
    const upLabel = new Text({ text: "Upgrades:", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x888866 }) });
    upLabel.position.set(upgX, upgY + 2); this._uiGfx.addChild(upLabel);
    upgX += 58;

    for (const uid of ALL_UPGRADE_IDS) {
      const uDef = UPGRADES[uid];
      const lvl = state.upgrades[uid];
      const maxed = lvl >= uDef.maxLevel;
      const cost = uDef.cost * (lvl + 1);
      const canBuy = !maxed && p0.gold >= cost;
      const ubtn = new Graphics();
      ubtn.roundRect(upgX, upgY, upgBtnW, upgBtnH, 3).fill({ color: canBuy ? 0x151508 : 0x0a0a06, alpha: 0.9 });
      ubtn.roundRect(upgX, upgY, upgBtnW, upgBtnH, 3).stroke({ color: maxed ? 0x444422 : canBuy ? uDef.color : 0x332222, width: 1 });
      ubtn.eventMode = "static"; ubtn.cursor = canBuy ? "pointer" : "default";
      const capturedId = uid;
      ubtn.on("pointerdown", () => { if (this._upgradeCallback) this._upgradeCallback(capturedId); });
      this._uiGfx.addChild(ubtn);

      // Level pips
      for (let pi = 0; pi < uDef.maxLevel; pi++) {
        const pipColor = pi < lvl ? uDef.color : 0x333322;
        this._uiGfx.addChild((() => { const pg = new Graphics(); pg.circle(upgX + 6 + pi * 7, upgY + 5, 2).fill({ color: pipColor }); return pg; })());
      }

      const costLabel = maxed ? "MAX" : `${cost}g`;
      const ut = new Text({ text: costLabel, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: maxed ? 0x666644 : canBuy ? 0xffd700 : 0x554422 }) });
      ut.anchor.set(0.5, 0); ut.position.set(upgX + upgBtnW / 2, upgY + 13);
      this._uiGfx.addChild(ut);

      // Tooltip on hover
      ubtn.on("pointerover", () => { state.hoveredUnit = null; }); // clear unit tooltip

      upgX += upgBtnW + upgGap;
    }

    // Hint text
    const hintTxt = new Text({
      text: "P: pause | H: horn | C: clear rally",
      style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x444433 }),
    });
    hintTxt.anchor.set(1, 0); hintTxt.position.set(ox + KothConfig.ARENA_W - 5, upgY + 4);
    this._uiGfx.addChild(hintTxt);
  }

  // ---- Floating damage/gold texts ----
  private _drawFloatingTexts(state: KothState, ox: number, oy: number): void {
    for (const ft of state.floatingTexts) {
      const alpha = Math.min(1, ft.timer / ft.maxTimer * 2);
      const scale = 0.8 + (1 - ft.timer / ft.maxTimer) * 0.3;
      const t = new Text({ text: ft.text, style: new TextStyle({ fontFamily: FONT, fontSize: Math.round(11 * scale), fill: ft.color, fontWeight: "bold" }) });
      t.alpha = alpha; t.anchor.set(0.5, 0.5); t.position.set(ox + ft.x, oy + ft.y);
      this._fxGfx.addChild(t);
    }
  }

  // ---- Minimap (top-right corner) ----
  private _drawMinimap(state: KothState, sw: number, oy: number): void {
    const mw = 100, mh = 75;
    const mx = sw - mw - 8, my = oy + 2;
    const sx = mw / KothConfig.ARENA_W, sy = mh / KothConfig.ARENA_H;
    const g = this._uiGfx;

    // Background
    g.rect(mx, my, mw, mh).fill({ color: 0x111108, alpha: 0.85 });
    g.rect(mx, my, mw, mh).stroke({ color: 0x333322, width: 1 });

    // Hill zone
    const hx = mx + KothConfig.HILL_CENTER_X * sx, hy = my + KothConfig.HILL_CENTER_Y * sy;
    const hr = KothConfig.HILL_RADIUS * sx;
    const hillColor = state.hillController >= 0 ? state.players[state.hillController].color : 0x444433;
    g.circle(hx, hy, hr).fill({ color: hillColor, alpha: 0.2 });
    g.circle(hx, hy, hr).stroke({ color: hillColor, width: 0.5, alpha: 0.4 });

    // Guardian warning pulse
    if (state.guardianWarning > 0) {
      const pulse = 0.3 + Math.sin(Date.now() / 200) * 0.15;
      g.circle(hx, hy, hr + 2).stroke({ color: 0xff6644, width: 1.5, alpha: pulse });
    }

    // Units as dots
    for (const u of state.units) {
      if (!u.alive) continue;
      const ux = mx + u.x * sx, uy = my + u.y * sy;
      const c = u.owner === 0 ? state.players[0].color : u.owner === 1 ? state.players[1].color : 0x888877;
      const dotSize = u.owner === 2 ? 1.5 : 1;
      g.circle(ux, uy, dotSize).fill({ color: c });
    }

    // Relics as bright diamonds
    for (const r of state.relics) {
      if (!r.alive) continue;
      const rx = mx + r.x * sx, ry = my + r.y * sy;
      const def = RELICS[r.type];
      g.rect(rx - 1.5, ry - 1.5, 3, 3).fill({ color: def.color });
    }

    // Rally point
    if (state.hasRallyPoint) {
      const rpx = mx + state.rallyX * sx, rpy = my + state.rallyY * sy;
      g.circle(rpx, rpy, 2).stroke({ color: state.players[0].color, width: 1 });
    }

    // Label
    const label = new Text({ text: "MAP", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x555544 }) });
    label.position.set(mx + 2, my + 1);
    g.addChild(label);
  }

  // ---- Announcements ----
  private _drawAnnouncements(state: KothState, sw: number, sh: number): void {
    let ay = sh * 0.35;
    for (const a of state.announcements) {
      const alpha = Math.min(1, a.timer * 2);
      const t = new Text({ text: a.text, style: new TextStyle({ fontFamily: FONT, fontSize: 20, fill: a.color, fontWeight: "bold", letterSpacing: 2 }) });
      t.anchor.set(0.5, 0.5); t.position.set(sw / 2, ay); t.alpha = alpha;
      this._uiGfx.addChild(t);
      ay += 28;
    }
  }
}

