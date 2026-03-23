// ---------------------------------------------------------------------------
// Necromancer mode — dark graveyard renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { NecroState, Grave, Undead, Crusader } from "../state/NecroState";
import { findChimera } from "../state/NecroState";
import { CORPSES, NecroConfig, CRUSADERS } from "../config/NecroConfig";

const FONT = "Georgia, serif";
const NECRO_GREEN = 0x44ff88;
const DARK_PURPLE = 0x6622aa;
const BONE_WHITE = 0xccccbb;

export class NecroRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _ui = new Container();
  private _bgDrawn = false;

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    this._drawBackground(sw, sh);
    this._gfx = new Graphics();
    this._ui = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._ui);
    this._bgDrawn = true;
  }

  private _drawBackground(sw: number, sh: number): void {
    const bg = new Graphics();

    // Dark night sky gradient
    for (let y = 0; y < sh; y += 2) {
      const t = y / sh;
      const r = Math.floor(8 + t * 10);
      const g = Math.floor(6 + t * 12);
      const b = Math.floor(18 + t * 8);
      bg.rect(0, y, sw, 2).fill({ color: (r << 16) | (g << 8) | b });
    }

    // Moon
    const mx = sw * 0.78, my = 45;
    bg.circle(mx, my, 18).fill({ color: 0xeeeedd, alpha: 0.9 });
    bg.circle(mx + 4, my - 2, 15).fill({ color: 0x0a0812 }); // Crescent shadow
    // Moon glow
    for (let r = 20; r < 60; r += 5) {
      bg.circle(mx, my, r).fill({ color: 0xeeeedd, alpha: 0.01 });
    }

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = (i * 8737) % sw;
      const sy = (i * 4219) % (sh * 0.4);
      const sr = 0.5 + (i % 3) * 0.3;
      bg.circle(sx, sy, sr).fill({ color: 0xffffff, alpha: 0.2 + (i % 5) * 0.1 });
    }

    // Distant treeline silhouette
    for (let x = 0; x < sw; x += 3) {
      const h = 20 + Math.sin(x * 0.02) * 12 + Math.sin(x * 0.05) * 8 + Math.sin(x * 0.13) * 4;
      bg.rect(x, sh * 0.15 - h, 3, h + 5).fill({ color: 0x0a120a, alpha: 0.6 });
    }

    // Ground — dark earth
    bg.rect(0, sh * 0.15, sw, sh * 0.85).fill({ color: 0x0e0e08 });

    // Ground texture patches
    for (let i = 0; i < 50; i++) {
      const gx = (i * 6271 + 13) % sw;
      const gy = sh * 0.15 + (i * 3413 + 7) % (sh * 0.82);
      bg.circle(gx, gy, 8 + (i % 5) * 3).fill({ color: 0x111108, alpha: 0.3 });
    }

    // Fog wisps at ground level
    for (let i = 0; i < 12; i++) {
      const fx = (i * 5431) % sw;
      const fy = sh * 0.65 + (i * 2713) % (sh * 0.25);
      const fw = 40 + (i % 4) * 25;
      bg.ellipse(fx, fy, fw, 6).fill({ color: 0x334455, alpha: 0.06 });
    }

    // Dead grass patches
    for (let i = 0; i < 30; i++) {
      const gx = (i * 7919) % sw;
      const gy = sh * 0.2 + (i * 4813) % (sh * 0.7);
      bg.moveTo(gx, gy).bezierCurveTo(gx + 1, gy - 5, gx - 1, gy - 8, gx + 2, gy - 10).stroke({ color: 0x2a3a1a, width: 0.5, alpha: 0.15 });
      bg.moveTo(gx + 3, gy).bezierCurveTo(gx + 4, gy - 4, gx + 2, gy - 7, gx + 5, gy - 9).stroke({ color: 0x283818, width: 0.5, alpha: 0.12 });
    }

    // Scattered bones
    for (let i = 0; i < 10; i++) {
      const bx = 50 + (i * 3571) % (sw - 100);
      const by = sh * 0.3 + (i * 2131) % (sh * 0.55);
      const angle = (i * 1.7) % Math.PI;
      bg.moveTo(bx, by).lineTo(bx + Math.cos(angle) * 6, by + Math.sin(angle) * 3).stroke({ color: BONE_WHITE, width: 1, alpha: 0.08 });
    }

    // Vignette
    for (let v = 0; v < 6; v++) {
      const inset = v * 40;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.04 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.04 });
      bg.rect(0, 0, sw, inset * 0.3).fill({ color: 0x000000, alpha: 0.02 });
    }

    this.container.addChild(bg);
  }

  draw(state: NecroState, sw: number, sh: number): void {
    this._gfx.clear();
    while (this._ui.children.length > 0) this._ui.removeChildAt(0);
    const g = this._gfx;
    const ox = (sw - NecroConfig.FIELD_WIDTH) / 2, oy = 50;

    // Field border — faint green glow
    g.roundRect(ox - 2, oy - 2, NecroConfig.FIELD_WIDTH + 4, NecroConfig.FIELD_HEIGHT + 4, 6)
      .stroke({ color: NECRO_GREEN, width: 1, alpha: 0.15 });

    if (state.phase === "dig") this._drawDigPhase(g, state, ox, oy);
    else if (state.phase === "ritual") this._drawRitualPhase(g, state, ox, oy, sw, sh);
    else if (state.phase === "battle") this._drawBattlePhase(g, state, ox, oy);

    // Particles (all phases)
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      g.circle(ox + p.x, oy + p.y, p.size * lr).fill({ color: p.color, alpha: lr * 0.8 });
    }

    // Announcements
    for (const ann of state.announcements) {
      const a = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 18, fill: ann.color, fontWeight: "bold" }) });
      t.alpha = a; t.anchor.set(0.5, 0.5);
      t.position.set(ox + NecroConfig.FIELD_WIDTH / 2, oy + NecroConfig.FIELD_HEIGHT / 2 - 30);
      this._ui.addChild(t);
    }

    // HUD
    this._drawHUD(g, state, sw, sh, ox, oy);
  }

  // ── Dig phase ──────────────────────────────────────────────────────────

  private _drawDigPhase(g: Graphics, state: NecroState, ox: number, oy: number): void {
    // Draw graves
    for (const grave of state.graves) {
      const gx = ox + grave.x, gy = oy + grave.y;

      if (grave.dug) {
        // Open grave — dark hole
        g.roundRect(gx - 14, gy - 8, 28, 16, 3).fill({ color: 0x0a0a06, alpha: 0.9 });
        g.roundRect(gx - 14, gy - 8, 28, 16, 3).stroke({ color: 0x332211, width: 1, alpha: 0.4 });
        // Dirt piles
        g.ellipse(gx - 18, gy + 4, 6, 3).fill({ color: 0x332211, alpha: 0.4 });
        g.ellipse(gx + 18, gy + 4, 5, 3).fill({ color: 0x332211, alpha: 0.3 });
        // Corpse type label
        if (grave.corpseType) {
          const label = new Text({ text: CORPSES[grave.corpseType].name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x555544 }) });
          label.anchor.set(0.5, 0); label.position.set(gx, gy + 12);
          this._ui.addChild(label);
        }
      } else {
        // Undug grave — mound with cross
        // Mound
        g.ellipse(gx, gy + 2, 16, 8).fill({ color: 0x1a1a10, alpha: 0.8 });
        g.ellipse(gx, gy, 14, 7).fill({ color: 0x221a0e, alpha: 0.7 });

        // Cross / tombstone
        g.roundRect(gx - 6, gy - 20, 12, 18, 2).fill({ color: 0x444438, alpha: 0.8 });
        g.roundRect(gx - 6, gy - 20, 12, 18, 2).stroke({ color: 0x555548, width: 0.5, alpha: 0.4 });
        // Cross detail
        g.rect(gx - 1, gy - 18, 2, 12).fill({ color: 0x666658, alpha: 0.4 });
        g.rect(gx - 4, gy - 15, 8, 2).fill({ color: 0x666658, alpha: 0.4 });

        // Dig progress bar
        if (grave.digging) {
          g.rect(gx - 14, gy + 12, 28, 3).fill({ color: 0x111108, alpha: 0.8 });
          g.rect(gx - 14, gy + 12, 28 * grave.digProgress, 3).fill({ color: NECRO_GREEN, alpha: 0.7 });
          // Digging particles
          const pulse = Math.sin(state.elapsed * 8) * 0.3;
          g.circle(gx + (Math.random() - 0.5) * 10, gy + (Math.random() - 0.5) * 5, 1.5).fill({ color: 0x554433, alpha: 0.3 + pulse });
        }

        // Mystery indicator — faint glow for rarer corpses
        if (grave.corpseType) {
          const rarity = CORPSES[grave.corpseType].weight;
          if (rarity <= 2) {
            const pulse = 0.1 + Math.sin(state.elapsed * 2 + grave.id) * 0.05;
            g.circle(gx, gy, 20).fill({ color: rarity === 1 ? 0x9966cc : 0xccaa44, alpha: pulse });
          }
        }
      }
    }

    // Necromancer figure at bottom-left
    this._drawNecromancer(g, ox + 40, oy + NecroConfig.FIELD_HEIGHT - 50, state);
  }

  // ── Ritual phase ───────────────────────────────────────────────────────

  private _drawRitualPhase(g: Graphics, state: NecroState, ox: number, oy: number, sw: number, sh: number): void {
    const cx = NecroConfig.FIELD_WIDTH / 2, cy = NecroConfig.FIELD_HEIGHT / 2;

    // Ritual circle
    const circleR = 60;
    // Outer ring
    g.circle(ox + cx, oy + cy, circleR).stroke({ color: NECRO_GREEN, width: 2, alpha: 0.3 });
    g.circle(ox + cx, oy + cy, circleR + 5).stroke({ color: DARK_PURPLE, width: 1, alpha: 0.15 });

    // Rune marks around circle
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + state.elapsed * 0.3;
      const rx = ox + cx + Math.cos(angle) * circleR;
      const ry = oy + cy + Math.sin(angle) * circleR;
      g.circle(rx, ry, 3).fill({ color: NECRO_GREEN, alpha: 0.2 + Math.sin(state.elapsed * 2 + i) * 0.15 });
    }

    // Pentagram inside
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
      g.moveTo(ox + cx + Math.cos(a1) * (circleR - 10), oy + cy + Math.sin(a1) * (circleR - 10))
        .lineTo(ox + cx + Math.cos(a2) * (circleR - 10), oy + cy + Math.sin(a2) * (circleR - 10))
        .stroke({ color: DARK_PURPLE, width: 1, alpha: 0.2 });
    }

    // Slot A (left)
    const slotAx = ox + cx - 35, slotAy = oy + cy;
    g.roundRect(slotAx - 15, slotAy - 15, 30, 30, 4).fill({ color: 0x0a0a06, alpha: 0.8 });
    g.roundRect(slotAx - 15, slotAy - 15, 30, 30, 4).stroke({ color: state.ritualSlotA ? NECRO_GREEN : 0x333322, width: 1.5, alpha: 0.5 });
    if (state.ritualSlotA) {
      const def = CORPSES[state.ritualSlotA.type];
      g.circle(slotAx, slotAy, 8).fill({ color: def.color });
      const label = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: def.color }) });
      label.anchor.set(0.5, 0); label.position.set(slotAx, slotAy + 18);
      this._ui.addChild(label);
    } else {
      const label = new Text({ text: "Slot A", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x444433 }) });
      label.anchor.set(0.5, 0.5); label.position.set(slotAx, slotAy);
      this._ui.addChild(label);
    }

    // Slot B (right)
    const slotBx = ox + cx + 35, slotBy = oy + cy;
    g.roundRect(slotBx - 15, slotBy - 15, 30, 30, 4).fill({ color: 0x0a0a06, alpha: 0.8 });
    g.roundRect(slotBx - 15, slotBy - 15, 30, 30, 4).stroke({ color: state.ritualSlotB ? 0xff88ff : 0x333322, width: 1.5, alpha: 0.5 });
    if (state.ritualSlotB) {
      const def = CORPSES[state.ritualSlotB.type];
      g.circle(slotBx, slotBy, 8).fill({ color: def.color });
      const label = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: def.color }) });
      label.anchor.set(0.5, 0); label.position.set(slotBx, slotBy + 18);
      this._ui.addChild(label);
    } else {
      const label = new Text({ text: "Slot B\n(optional)", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x444433, align: "center" }) });
      label.anchor.set(0.5, 0.5); label.position.set(slotBx, slotBy);
      this._ui.addChild(label);
    }

    // Chimera preview
    if (state.ritualSlotA && state.ritualSlotB) {
      const chimera = findChimera(state.ritualSlotA.type, state.ritualSlotB.type);
      if (chimera) {
        const label = new Text({ text: `= ${chimera.name} (${chimera.ability})`, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xff88ff, fontWeight: "bold" }) });
        label.anchor.set(0.5, 0); label.position.set(ox + cx, oy + cy + 45);
        this._ui.addChild(label);
      }
    }

    // Raise progress bar
    if (state.isRaising) {
      g.rect(ox + cx - 50, oy + cy + 65, 100, 6).fill({ color: 0x111108 });
      g.rect(ox + cx - 50, oy + cy + 65, 100 * state.raisingProgress, 6).fill({ color: NECRO_GREEN, alpha: 0.8 });

      // Swirling energy
      for (let i = 0; i < 6; i++) {
        const angle = state.elapsed * 3 + (i / 6) * Math.PI * 2;
        const dist = 30 + Math.sin(state.elapsed * 5 + i) * 10;
        const ex = ox + cx + Math.cos(angle) * dist;
        const ey = oy + cy + Math.sin(angle) * dist;
        g.circle(ex, ey, 2).fill({ color: NECRO_GREEN, alpha: 0.4 + Math.sin(state.elapsed * 4 + i) * 0.2 });
      }
    }

    // Corpse inventory on the left
    let iy = oy + 20;
    const invLabel = new Text({ text: "Corpses:", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x889988 }) });
    invLabel.position.set(ox + 10, iy); this._ui.addChild(invLabel);
    iy += 16;
    for (const corpse of state.corpses) {
      // Skip if placed in a slot
      if (state.ritualSlotA?.id === corpse.id || state.ritualSlotB?.id === corpse.id) continue;
      const def = CORPSES[corpse.type];
      g.roundRect(ox + 10, iy, 100, 18, 3).fill({ color: 0x0a0a06, alpha: 0.6 });
      g.roundRect(ox + 10, iy, 100, 18, 3).stroke({ color: def.color, width: 0.5, alpha: 0.3 });
      g.circle(ox + 22, iy + 9, 4).fill({ color: def.color });
      const ct = new Text({ text: `${def.name} (${def.manaCost}m)`, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0xaaaaaa }) });
      ct.position.set(ox + 30, iy + 4); this._ui.addChild(ct);
      iy += 22;
    }

    // Army preview on the right
    iy = oy + 20;
    const armyLabel = new Text({ text: `Army: ${state.undead.length}/${NecroConfig.MAX_ARMY}`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x889988 }) });
    armyLabel.anchor.set(1, 0); armyLabel.position.set(ox + NecroConfig.FIELD_WIDTH - 10, iy); this._ui.addChild(armyLabel);
    iy += 16;
    for (const u of state.undead) {
      g.roundRect(ox + NecroConfig.FIELD_WIDTH - 120, iy, 110, 16, 3).fill({ color: 0x0a0a06, alpha: 0.5 });
      g.circle(ox + NecroConfig.FIELD_WIDTH - 108, iy + 8, 3).fill({ color: u.color });
      const ut = new Text({ text: `${u.name} HP:${u.hp}`, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x99aa99 }) });
      ut.position.set(ox + NecroConfig.FIELD_WIDTH - 100, iy + 3); this._ui.addChild(ut);
      iy += 19;
    }

    this._drawNecromancer(g, ox + cx, oy + cy - circleR - 30, state);
  }

  // ── Battle phase ───────────────────────────────────────────────────────

  private _drawBattlePhase(g: Graphics, state: NecroState, ox: number, oy: number): void {
    // Battlefield divider line
    const midX = NecroConfig.FIELD_WIDTH / 2;
    g.moveTo(ox + midX, oy).lineTo(ox + midX, oy + NecroConfig.FIELD_HEIGHT).stroke({ color: 0x333322, width: 0.5, alpha: 0.15 });

    // "Undead" and "Crusaders" labels
    const leftLabel = new Text({ text: "UNDEAD", style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: NECRO_GREEN, letterSpacing: 2, alpha: 0.3 } as any) });
    leftLabel.anchor.set(0.5, 0); leftLabel.position.set(ox + midX / 2, oy + 4);
    this._ui.addChild(leftLabel);
    const rightLabel = new Text({ text: "CRUSADERS", style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xffd700, letterSpacing: 2, alpha: 0.3 } as any) });
    rightLabel.anchor.set(0.5, 0); rightLabel.position.set(ox + midX + midX / 2, oy + 4);
    this._ui.addChild(rightLabel);

    // Draw undead
    for (const u of state.undead) {
      if (!u.alive) continue;
      this._drawUndeadUnit(g, ox + u.x, oy + u.y, u, state);
    }

    // Draw crusaders
    for (const c of state.crusaders) {
      if (!c.alive) continue;
      this._drawCrusaderUnit(g, ox + c.x, oy + c.y, c, state);
    }

    // Necromancer in corner
    this._drawNecromancer(g, ox + 30, oy + NecroConfig.FIELD_HEIGHT / 2, state);

    // Nova indicator
    if ((state.powerLevels["dark_nova"] ?? 0) > 0) {
      const novaReady = state.novaCooldown <= 0;
      const nt = new Text({
        text: novaReady ? "NOVA READY (click)" : `Nova: ${Math.ceil(state.novaCooldown)}s`,
        style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: novaReady ? 0xaa44ff : 0x554466 }),
      });
      nt.anchor.set(0.5, 0); nt.position.set(ox + NecroConfig.FIELD_WIDTH / 2, oy + NecroConfig.FIELD_HEIGHT - 16);
      this._ui.addChild(nt);
    }

    // Battle timer
    const bt = new Text({
      text: `${Math.floor(state.battleTimer)}s`,
      style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x667766 }),
    });
    bt.anchor.set(1, 0); bt.position.set(ox + NecroConfig.FIELD_WIDTH - 5, oy + NecroConfig.FIELD_HEIGHT - 14);
    this._ui.addChild(bt);
  }

  // ── Unit drawing ───────────────────────────────────────────────────────

  private _drawUndeadUnit(g: Graphics, x: number, y: number, u: Undead, state: NecroState): void {
    const s = u.size;
    // Shadow
    g.ellipse(x + 1, y + s, s * 0.7, 2).fill({ color: 0x000000, alpha: 0.2 });

    // Ghostly glow
    const pulse = 0.15 + Math.sin(state.elapsed * 2 + u.id) * 0.08;
    g.circle(x, y, s + 4).fill({ color: NECRO_GREEN, alpha: pulse * 0.15 });

    // Body — skull-like shape
    g.ellipse(x, y, s * 0.9, s * 1.1).fill({ color: u.color });

    // Chimera extras
    if (u.chimera) {
      // Extra limbs/horns
      g.moveTo(x - s, y - s * 0.5).lineTo(x - s - 4, y - s - 3).stroke({ color: u.color, width: 1.5, alpha: 0.6 });
      g.moveTo(x + s, y - s * 0.5).lineTo(x + s + 4, y - s - 3).stroke({ color: u.color, width: 1.5, alpha: 0.6 });
      // Glowing eyes
      g.circle(x - 2, y - 2, 1.5).fill({ color: 0xff44ff, alpha: 0.8 });
      g.circle(x + 2, y - 2, 1.5).fill({ color: 0xff44ff, alpha: 0.8 });
      // Ability icon
      if (u.ability) {
        const abilCol = u.ability === "cleave" ? 0xff4444 : u.ability === "drain" ? 0x44ff44 :
          u.ability === "explode" ? 0xff6622 : u.ability === "shield" ? 0x4488ff : 0xffaa00;
        g.circle(x, y - s - 6, 2).fill({ color: abilCol, alpha: 0.5 + Math.sin(state.elapsed * 3) * 0.2 });
      }
    } else {
      // Normal undead eyes
      g.circle(x - 2, y - 1, 1).fill({ color: NECRO_GREEN, alpha: 0.7 });
      g.circle(x + 2, y - 1, 1).fill({ color: NECRO_GREEN, alpha: 0.7 });
    }

    // HP bar
    if (u.hp < u.maxHp) {
      g.rect(x - s, y - s - 4, s * 2, 2).fill({ color: 0x220000 });
      g.rect(x - s, y - s - 4, s * 2 * (u.hp / u.maxHp), 2).fill({ color: NECRO_GREEN });
    }
  }

  private _drawCrusaderUnit(g: Graphics, x: number, y: number, c: Crusader, state: NecroState): void {
    const s = c.size;
    // Shadow
    g.ellipse(x + 1, y + s, s * 0.7, 2).fill({ color: 0x000000, alpha: 0.15 });

    // Holy glow for special units
    if (c.ability) {
      const hpulse = 0.1 + Math.sin(state.elapsed * 2 + c.id * 0.7) * 0.06;
      g.circle(x, y, s + 5).fill({ color: 0xffd700, alpha: hpulse });
    }

    // Body — armored shape
    g.ellipse(x, y, s * 0.8, s * 1.1).fill({ color: c.color });
    // Helmet/head
    g.circle(x, y - s * 0.7, s * 0.5).fill({ color: c.color });
    // Shield (left side)
    g.roundRect(x - s - 2, y - s * 0.3, 4, s, 1).fill({ color: 0xaaaaaa, alpha: 0.5 });
    // Sword (right side)
    g.moveTo(x + s, y).lineTo(x + s + 6, y - 4).stroke({ color: 0xcccccc, width: 1.5, alpha: 0.6 });

    // Type-specific details
    if (c.type === "paladin") {
      // Golden cross on chest
      g.rect(x - 1, y - 3, 2, 6).fill({ color: 0xffd700, alpha: 0.5 });
      g.rect(x - 3, y - 1, 6, 2).fill({ color: 0xffd700, alpha: 0.5 });
    } else if (c.type === "priest") {
      // Staff
      g.moveTo(x + s + 2, y + s).lineTo(x + s + 2, y - s - 4).stroke({ color: 0xddddaa, width: 1.5 });
      g.circle(x + s + 2, y - s - 5, 2).fill({ color: 0xffffaa, alpha: 0.6 });
    } else if (c.type === "banner") {
      // Banner flag
      g.moveTo(x, y - s - 2).lineTo(x, y - s - 14).stroke({ color: 0x886644, width: 1 });
      g.rect(x, y - s - 14, 8, 6).fill({ color: 0xff2222, alpha: 0.7 });
      g.moveTo(x + 1, y - s - 12).lineTo(x + 6, y - s - 12).stroke({ color: 0xffd700, width: 0.8 });
    }

    // HP bar
    if (c.hp < c.maxHp) {
      g.rect(x - s, y - s - 4, s * 2, 2).fill({ color: 0x220000 });
      g.rect(x - s, y - s - 4, s * 2 * (c.hp / c.maxHp), 2).fill({ color: 0xff4444 });
    }
  }

  // ── Necromancer avatar ─────────────────────────────────────────────────

  private _drawNecromancer(g: Graphics, x: number, y: number, state: NecroState): void {
    // Floating dark robe
    const sway = Math.sin(state.elapsed * 1.5) * 2;

    // Dark aura
    const pulse = 0.08 + Math.sin(state.elapsed * 2) * 0.04;
    g.circle(x, y, 20).fill({ color: DARK_PURPLE, alpha: pulse });

    // Robe body — triangular
    g.moveTo(x - 8, y + 15).lineTo(x, y - 5).lineTo(x + 8, y + 15).fill({ color: 0x1a0a2a });
    g.moveTo(x - 8, y + 15).lineTo(x, y - 5).lineTo(x + 8, y + 15).stroke({ color: 0x2a1a3a, width: 0.5 });

    // Hood
    g.circle(x, y - 8, 7).fill({ color: 0x1a0a2a });
    g.circle(x, y - 8, 7).stroke({ color: 0x2a1a3a, width: 0.5 });

    // Eyes — glowing green
    g.circle(x - 2, y - 9, 1.5).fill({ color: NECRO_GREEN, alpha: 0.9 });
    g.circle(x + 2, y - 9, 1.5).fill({ color: NECRO_GREEN, alpha: 0.9 });

    // Staff
    g.moveTo(x + 10 + sway, y + 15).lineTo(x + 12, y - 18).stroke({ color: 0x3a2a1a, width: 2 });
    // Staff orb
    const orbPulse = 0.5 + Math.sin(state.elapsed * 3) * 0.3;
    g.circle(x + 12, y - 20, 4).fill({ color: NECRO_GREEN, alpha: orbPulse });
    g.circle(x + 12, y - 20, 6).fill({ color: NECRO_GREEN, alpha: orbPulse * 0.15 });

    // Floating rune particles around staff
    for (let i = 0; i < 3; i++) {
      const angle = state.elapsed * 2 + (i / 3) * Math.PI * 2;
      const rx = x + 12 + Math.cos(angle) * 8;
      const ry = y - 20 + Math.sin(angle) * 8;
      g.circle(rx, ry, 1).fill({ color: NECRO_GREEN, alpha: 0.3 });
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private _drawHUD(g: Graphics, state: NecroState, sw: number, sh: number, ox: number, oy: number): void {
    // Top bar
    g.rect(0, 0, sw, 44).fill({ color: 0x06040a, alpha: 0.85 });
    g.moveTo(0, 44).lineTo(sw, 44).stroke({ color: NECRO_GREEN, width: 1, alpha: 0.25 });

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); this._ui.addChild(t);
    };

    addText("\u2620 NECROMANCER", 12, 6, { fontSize: 14, fill: NECRO_GREEN, fontWeight: "bold", letterSpacing: 3 });
    addText(`Wave ${state.wave + 1}/${state.totalWaves}`, 200, 8, { fontSize: 11, fill: 0x889988 });
    addText(`Gold: ${state.gold}`, 300, 8, { fontSize: 12, fill: 0xffd700 });
    addText(`Score: ${state.score}`, 400, 8, { fontSize: 12, fill: 0x44ccaa });
    addText(`Army: ${state.undead.length}`, 510, 8, { fontSize: 11, fill: NECRO_GREEN });

    // Mana bar
    const manaW = 120, manaH = 8, manaX = 200, manaY = 26;
    g.roundRect(manaX, manaY, manaW, manaH, 3).fill({ color: 0x111122 });
    g.roundRect(manaX, manaY, manaW * (state.mana / state.maxMana), manaH, 3).fill({ color: 0x4466cc, alpha: 0.8 });
    addText(`Mana: ${Math.floor(state.mana)}/${state.maxMana}`, manaX + manaW + 6, manaY - 2, { fontSize: 9, fill: 0x6688cc });

    // HP
    const hpStr = "♥".repeat(Math.max(0, state.playerHp)) + "♡".repeat(Math.max(0, state.maxPlayerHp - state.playerHp));
    addText(`HP: ${hpStr}`, 440, 26, { fontSize: 9, fill: state.playerHp <= 3 ? 0xff4444 : 0xff8888 });

    // Phase indicator
    const phaseNames: Record<string, string> = { dig: "DIG PHASE", ritual: "RITUAL PHASE", battle: "BATTLE!", upgrade: "UPGRADE" };
    addText(phaseNames[state.phase] ?? state.phase.toUpperCase(), sw / 2, 28, { fontSize: 9, fill: 0x667766, letterSpacing: 2 }, true);

    // Bottom bar
    const controls: Record<string, string> = {
      dig: "Click graves to dig | SPACE: go to ritual | Esc: quit",
      ritual: "Click corpses to place in slots | ENTER: raise undead | SPACE: battle | Esc: quit",
      battle: "Watch your army fight! | Click: Dark Nova (if unlocked) | Esc: quit",
      upgrade: "Click to buy upgrades | SPACE: next wave",
    };
    addText(controls[state.phase] ?? "Esc: quit", sw / 2, sh - 14, { fontSize: 8, fill: 0x445544 }, true);
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
  }
}
