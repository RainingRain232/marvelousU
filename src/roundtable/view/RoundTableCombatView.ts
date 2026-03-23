// ---------------------------------------------------------------------------
// Round Table – Combat View (rich procedural visuals, particles, GSAP anims)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import {
  RTRunState, RTCombatState, StatusEffectId,
  EnemyIntentType,
} from "../types";
import { getCardDef } from "../config/RoundTableCards";
import { getEnemyDef } from "../config/RoundTableEnemies";
import { RoundTableCardView } from "./RoundTableCardView";
import { RoundTableCombatSystem } from "../systems/RoundTableCombatSystem";
import { getEffect } from "../state/RoundTableState";

const SW = 800;
const SH = 600;

// ── Palettes ───────────────────────────────────────────────────────────────

const COL = {
  BG_TOP: 0x0c0c1a,
  BG_BOT: 0x181828,
  PANEL: 0x10102a,
  PANEL_BORDER: 0x2a2a4a,
  HP_BG: 0x220808,
  HP_FILL: 0xcc2222,
  HP_WARN: 0xccaa22,
  HP_CRIT: 0xff2222,
  BLOCK: 0x2244aa,
  BLOCK_TXT: 0x66aaff,
  ENERGY_BG: 0x0a0a2a,
  ENERGY_RIM: 0x4466aa,
  ENERGY_TXT: 0x88ccff,
  GOLD: 0xffd700,
  PURITY_HOLY: 0xffdd44,
  PURITY_DARK: 0x8800cc,
  PURITY_NEUT: 0x888888,
  EFFECT_BUFF: 0x44cc44,
  EFFECT_DEBUFF: 0xcc4444,
  INTENT_ATK: 0xff5544,
  INTENT_DEF: 0x4488ff,
  INTENT_BUFF: 0x44cc44,
  INTENT_DEBUFF: 0xcc44cc,
  ENEMY_NORMAL: 0x554444,
  ENEMY_ELITE: 0x886622,
  ENEMY_BOSS: 0x882222,
  FLOOR_LINE: 0x333344,
};

// ── Text styles ────────────────────────────────────────────────────────────

const mkStyle = (size: number, fill: number, bold = false, shadow = false): TextStyle =>
  new TextStyle({
    fontFamily: "monospace", fontSize: size, fill, fontWeight: bold ? "bold" : "normal",
    ...(shadow ? { dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } } : {}),
  });

const sName = mkStyle(12, 0xffffff, true, true);
const sHp = mkStyle(10, 0xff8888, false, true);
const sBlock = mkStyle(10, COL.BLOCK_TXT, true, true);
const sEnergy = mkStyle(20, COL.ENERGY_TXT, true, true);
const sBtn = mkStyle(13, 0xffffff, true, true);
const sLog = mkStyle(9, 0x888888);

// ── Effect name mapping ────────────────────────────────────────────────────

const EFFECT_LABELS: Partial<Record<StatusEffectId, { short: string; color: number }>> = {
  [StatusEffectId.STRENGTH]: { short: "STR", color: 0xff6644 },
  [StatusEffectId.DEXTERITY]: { short: "DEX", color: 0x44ff88 },
  [StatusEffectId.VULNERABLE]: { short: "VLN", color: 0xff8844 },
  [StatusEffectId.WEAK]: { short: "WEK", color: 0x88cc44 },
  [StatusEffectId.POISON]: { short: "PSN", color: 0x44cc44 },
  [StatusEffectId.REGEN]: { short: "RGN", color: 0x44ffaa },
  [StatusEffectId.THORNS]: { short: "THN", color: 0xcc8844 },
  [StatusEffectId.RITUAL]: { short: "RTL", color: 0xcc44cc },
  [StatusEffectId.FLAME_BARRIER]: { short: "FLM", color: 0xff6622 },
  [StatusEffectId.HOLY_SHIELD]: { short: "HLY", color: 0xffd700 },
  [StatusEffectId.FRAIL]: { short: "FRL", color: 0xaa8844 },
  [StatusEffectId.ENTANGLED]: { short: "ENT", color: 0x448844 },
};

// ═══════════════════════════════════════════════════════════════════════════

export class RoundTableCombatView {
  container = new Container();
  private _bgLayer = new Container();
  private _ambientLayer = new Container(); // floating dust, embers
  private _enemyLayer = new Container();
  private _handLayer = new Container();
  private _uiLayer = new Container();
  private _fxLayer = new Container(); // damage numbers, particles
  private _damageFlash = new Graphics(); // red screen flash
  private _cardViews: RoundTableCardView[] = [];
  private _enemyBaseY: number[] = [];
  private _lastEmberTime = 0;
  private _lastDustTime = 0;

  onCardPlay: ((cardUid: number, targetIdx: number) => void) | null = null;
  onEndTurn: (() => void) | null = null;
  onPotionUse: ((slotIdx: number) => void) | null = null;
  onDeckView: (() => void) | null = null;

  private _selectedCardUid = -1;

  build(): void {
    this.container.removeChildren();
    this._ambientLayer.removeChildren();
    this.container.addChild(this._bgLayer);
    this.container.addChild(this._ambientLayer);
    this.container.addChild(this._enemyLayer);
    this.container.addChild(this._handLayer);
    this.container.addChild(this._uiLayer);
    this.container.addChild(this._fxLayer);

    // Damage flash overlay (covers entire screen, hidden by default)
    this._damageFlash = new Graphics();
    this._damageFlash.rect(0, 0, SW, SH);
    this._damageFlash.fill({ color: 0xff0000, alpha: 0.15 });
    this._damageFlash.visible = false;
    this.container.addChild(this._damageFlash);

    this._drawBackground();
    this._lastEmberTime = 0;
    this._lastDustTime = 0;
  }

  /** Called once after build when run state is available. */
  drawKnight(run: RTRunState): void {
    this._drawPlayerKnight(run);
  }

  /** Per-frame idle animation updates (called from ticker). */
  updateIdle(time: number): void {
    // Enemy idle bobbing
    for (let i = 0; i < this._enemyLayer.children.length; i++) {
      const ec = this._enemyLayer.children[i];
      const baseY = this._enemyBaseY[i] ?? ec.y;
      ec.y = baseY + Math.sin(time * 1.4 + i * 0.4) * 4;
    }

    // ── Ambient dust motes (every 0.6s, max 20 on screen) ──
    if (time - this._lastDustTime > 0.6 && this._ambientLayer.children.length < 25) {
      this._lastDustTime = time;
      const dust = new Graphics();
      const dx = 80 + Math.random() * 640;
      const dy = 250 + Math.random() * 100;
      dust.circle(0, 0, 1 + Math.random() * 1.5);
      dust.fill({ color: [0xffddaa, 0xeeccaa, 0xddbb88][Math.floor(Math.random() * 3)], alpha: 0.06 + Math.random() * 0.04 });
      dust.position.set(dx, dy);
      this._ambientLayer.addChild(dust);
      gsap.to(dust, {
        y: dy - 40 - Math.random() * 60,
        x: dx + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 3 + Math.random() * 2,
        ease: "power1.out",
        onComplete: () => { this._ambientLayer.removeChild(dust); },
      });
    }

    // ── Torch embers (every 0.8s, spawn near torch positions) ──
    if (time - this._lastEmberTime > 0.8 && this._ambientLayer.children.length < 25) {
      this._lastEmberTime = time;
      const torchX = Math.random() < 0.5 ? 60 : SW - 60;
      const ember = new Graphics();
      ember.circle(0, 0, 1 + Math.random());
      ember.fill({ color: [0xff6622, 0xffaa44, 0xffcc66][Math.floor(Math.random() * 3)], alpha: 0.3 + Math.random() * 0.3 });
      ember.position.set(torchX + (Math.random() - 0.5) * 12, 120);
      this._ambientLayer.addChild(ember);
      gsap.to(ember, {
        y: 60 - Math.random() * 50,
        x: ember.x + (Math.random() - 0.5) * 40,
        alpha: 0,
        duration: 1.5 + Math.random() * 1.5,
        ease: "power1.out",
        onComplete: () => { this._ambientLayer.removeChild(ember); },
      });
    }
  }

  /** Flash the screen red briefly when player takes damage. */
  spawnDamageFlash(): void {
    this._damageFlash.visible = true;
    this._damageFlash.alpha = 0.18;
    gsap.to(this._damageFlash, { alpha: 0, duration: 0.3, ease: "power2.out", onComplete: () => {
      this._damageFlash.visible = false;
    }});
  }

  // ── Card tooltip (shows full description above hovered card) ──────────

  private _cardTooltip: Container | null = null;

  private _showCardTooltip(card: { defId: string; upgraded: boolean }, x: number, y: number): void {
    this._hideCardTooltip();
    const def = getCardDef(card.defId);

    const tip = new Container();
    const tipW = 200;
    let tipH = 70;

    // Build description lines
    let desc = def.description;
    let statLine = "";
    if (def.damage > 0) statLine += `DMG: ${def.damage}${def.hits > 1 ? "x" + def.hits : ""}  `;
    if (def.block > 0) statLine += `BLK: ${def.block}  `;
    if (def.draw > 0) statLine += `DRAW: +${def.draw}  `;
    if (def.energy > 0) statLine += `ENERGY: +${def.energy}`;
    if (def.purityChange !== 0) statLine += `  Purity: ${def.purityChange > 0 ? "+" : ""}${def.purityChange}`;
    if (statLine) tipH += 14;
    if (def.exhaust) tipH += 12;

    // Clamp position
    const tipX = Math.max(4, Math.min(SW - tipW - 4, x - tipW / 2 + 60));
    const tipY = Math.max(50, y);
    tip.position.set(tipX, tipY);

    const bg = new Graphics();
    bg.roundRect(0, 0, tipW, tipH, 6);
    bg.fill({ color: 0x0c0c1a, alpha: 0.95 });
    bg.roundRect(0, 0, tipW, tipH, 6);
    bg.stroke({ color: 0x555577, width: 1.2 });
    tip.addChild(bg);

    // Name + cost
    const nameT = new Text({ text: `${def.name}  (${def.cost >= 0 ? def.cost : "-"})`, style: mkStyle(10, card.upgraded ? 0x88ff88 : 0xffffff, true, true) });
    nameT.position.set(8, 6);
    tip.addChild(nameT);

    // Type + rarity
    const typeT = new Text({ text: `${def.type.toUpperCase()} · ${def.rarity.toUpperCase()}`, style: mkStyle(7, 0x777799) });
    typeT.position.set(8, 20);
    tip.addChild(typeT);

    // Description
    const descT = new Text({ text: desc, style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xcccccc, wordWrap: true, wordWrapWidth: tipW - 16 }) });
    descT.position.set(8, 34);
    tip.addChild(descT);

    let bottomY = 56;
    if (statLine) {
      const statT = new Text({ text: statLine, style: mkStyle(8, 0x668888) });
      statT.position.set(8, bottomY);
      tip.addChild(statT);
      bottomY += 14;
    }
    if (def.exhaust) {
      const exhT = new Text({ text: "Exhaust", style: mkStyle(8, 0xaa6644) });
      exhT.position.set(8, bottomY);
      tip.addChild(exhT);
    }

    this._fxLayer.addChild(tip);
    this._cardTooltip = tip;
  }

  private _hideCardTooltip(): void {
    if (this._cardTooltip) {
      this._fxLayer.removeChild(this._cardTooltip);
      this._cardTooltip = null;
    }
  }

  /** Flinch an enemy container by index (quick x-jitter). */
  spawnEnemyFlinch(idx: number): void {
    if (idx < 0 || idx >= this._enemyLayer.children.length) return;
    const ec = this._enemyLayer.children[idx];
    const origX = ec.x;
    gsap.to(ec, { x: origX + 8, duration: 0.04, yoyo: true, repeat: 3, ease: "none",
      onComplete: () => { ec.x = origX; },
    });
  }

  // ── Background with atmosphere ───────────────────────────────────────────

  private _drawBackground(): void {
    this._bgLayer.removeChildren();
    const bg = new Graphics();

    // ── Sky gradient ──
    for (let i = 0; i < 16; i++) {
      const frac = i / 16;
      const r = 8 + frac * 14;
      const g = 8 + frac * 10;
      const b = 18 + frac * 16;
      const color = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      bg.rect(0, frac * 240, SW, 16);
      bg.fill({ color });
    }

    // ── Distant mountains silhouette ──
    bg.moveTo(0, 100);
    bg.lineTo(60, 55); bg.lineTo(130, 80); bg.lineTo(180, 40); bg.lineTo(250, 75);
    bg.lineTo(320, 50); bg.lineTo(400, 30); bg.lineTo(480, 60); bg.lineTo(550, 35);
    bg.lineTo(620, 65); bg.lineTo(700, 45); bg.lineTo(760, 70); bg.lineTo(800, 55);
    bg.lineTo(SW, 100); bg.lineTo(SW, 120); bg.lineTo(0, 120);
    bg.closePath();
    bg.fill({ color: 0x151525, alpha: 0.8 });

    // ── Moon (crescent with craters) ──
    // Outer glow halo
    bg.circle(650, 45, 24);
    bg.fill({ color: 0x334466, alpha: 0.06 });
    // Moon disc
    bg.circle(650, 45, 16);
    bg.fill({ color: 0x556688, alpha: 0.14 });
    // Crescent shadow (darker circle offset to create crescent)
    bg.circle(655, 43, 13);
    bg.fill({ color: 0x0c0c1a, alpha: 0.1 });
    // Craters (small dark circles)
    bg.circle(646, 40, 2.5);
    bg.fill({ color: 0x3a4a5a, alpha: 0.1 });
    bg.circle(652, 48, 1.8);
    bg.fill({ color: 0x3a4a5a, alpha: 0.08 });
    bg.circle(644, 47, 1.5);
    bg.fill({ color: 0x3a4a5a, alpha: 0.07 });
    // Bright edge (lit side)
    bg.arc(650, 45, 15, -1.8, 1.2);
    bg.stroke({ color: 0x667799, width: 1, alpha: 0.12 });

    // ── Castle wall silhouettes (left and right, with stone detail) ──
    for (const wallX of [0, SW - 50]) {
      // Main wall body
      bg.rect(wallX, 80, 50, 160);
      bg.fill({ color: 0x1a1a28 });
      // Wall cap
      bg.rect(wallX, 80, 50, 6);
      bg.fill({ color: 0x222233 });
      // Crenellations (merlons with tapered tops)
      for (let i = 0; i < 4; i++) {
        const cx = wallX + i * 14;
        bg.moveTo(cx, 80);
        bg.lineTo(cx, 68);
        bg.lineTo(cx + 2, 66);
        bg.lineTo(cx + 6, 66);
        bg.lineTo(cx + 8, 68);
        bg.lineTo(cx + 8, 80);
        bg.closePath();
        bg.fill({ color: 0x1a1a28 });
        // Merlon cap stone
        bg.rect(cx + 1, 66, 6, 2);
        bg.fill({ color: 0x222233, alpha: 0.5 });
      }
      // Stone block lines (horizontal mortar)
      for (let r = 0; r < 7; r++) {
        const ry = 90 + r * 22;
        bg.moveTo(wallX + 2, ry);
        bg.lineTo(wallX + 48, ry);
        bg.stroke({ color: 0x151520, width: 0.8, alpha: 0.35 });
      }
      // Vertical mortar (staggered per row)
      for (let r = 0; r < 6; r++) {
        const ry = 90 + r * 22;
        const offset = (r % 2) * 12;
        for (let c = 0; c < 3; c++) {
          const vx = wallX + 8 + offset + c * 18;
          if (vx > wallX && vx < wallX + 50) {
            bg.moveTo(vx, ry);
            bg.lineTo(vx, ry + 22);
            bg.stroke({ color: 0x151520, width: 0.6, alpha: 0.25 });
          }
        }
      }
      // Arrow slit
      const slitX = wallX + 22;
      bg.rect(slitX, 130, 4, 18);
      bg.fill({ color: 0x0c0c14 });
      bg.moveTo(slitX - 3, 139);
      bg.lineTo(slitX + 7, 139);
      bg.stroke({ color: 0x0c0c14, width: 2 });
    }

    // ── Stone floor ──
    bg.rect(0, 240, SW, SH - 240);
    bg.fill({ color: 0x1a1a22 });
    // Floor highlight line
    bg.moveTo(0, 240);
    bg.lineTo(SW, 240);
    bg.stroke({ color: 0x333344, width: 1.5, alpha: 0.6 });
    // Stone tile lines
    for (let i = 0; i < 10; i++) {
      const tx = 40 + i * 80;
      bg.moveTo(tx, 242);
      bg.lineTo(tx + (i % 2 ? -10 : 10), SH);
      bg.stroke({ color: 0x222233, width: 0.8, alpha: 0.3 });
    }
    // Horizontal mortar lines
    for (let i = 0; i < 4; i++) {
      const ty = 270 + i * 40;
      bg.moveTo(0, ty);
      bg.lineTo(SW, ty);
      bg.stroke({ color: 0x222233, width: 0.5, alpha: 0.2 });
    }

    // ── Torches (left and right, multi-layer flames) ──
    const torchGfx = new Graphics();
    for (const tx of [60, SW - 60]) {
      // Wall bracket (angled)
      torchGfx.moveTo(tx - 2, 155);
      torchGfx.lineTo(tx - 8, 165);
      torchGfx.stroke({ color: 0x4a2a10, width: 3 });
      // Bracket ring
      torchGfx.circle(tx, 155, 4);
      torchGfx.stroke({ color: 0x5d3a1a, width: 2 });
      // Shaft
      torchGfx.rect(tx - 2.5, 128, 5, 28);
      torchGfx.fill({ color: 0x5d3a1a });
      // Shaft wrap bands
      torchGfx.moveTo(tx - 3, 135);
      torchGfx.lineTo(tx + 3, 137);
      torchGfx.stroke({ color: 0x8b6914, width: 1, alpha: 0.4 });
      torchGfx.moveTo(tx - 3, 142);
      torchGfx.lineTo(tx + 3, 144);
      torchGfx.stroke({ color: 0x8b6914, width: 1, alpha: 0.4 });
      // Cup (wider, tapered)
      torchGfx.moveTo(tx - 7, 123);
      torchGfx.lineTo(tx - 5, 130);
      torchGfx.lineTo(tx + 5, 130);
      torchGfx.lineTo(tx + 7, 123);
      torchGfx.closePath();
      torchGfx.fill({ color: 0x6b3a1f });
      torchGfx.stroke({ color: 0x7a4a2f, width: 0.8 });
      // Outer flame (3-point jagged)
      torchGfx.moveTo(tx - 6, 123);
      torchGfx.quadraticCurveTo(tx - 5, 108, tx - 2, 102);
      torchGfx.quadraticCurveTo(tx - 1, 96, tx, 92);
      torchGfx.quadraticCurveTo(tx + 1, 96, tx + 2, 100);
      torchGfx.quadraticCurveTo(tx + 4, 106, tx + 3, 112);
      torchGfx.quadraticCurveTo(tx + 5, 108, tx + 6, 123);
      torchGfx.closePath();
      torchGfx.fill({ color: 0xff5511, alpha: 0.65 });
      // Mid flame
      torchGfx.moveTo(tx - 4, 123);
      torchGfx.quadraticCurveTo(tx - 3, 110, tx - 1, 104);
      torchGfx.quadraticCurveTo(tx, 97, tx + 1, 104);
      torchGfx.quadraticCurveTo(tx + 3, 110, tx + 4, 123);
      torchGfx.closePath();
      torchGfx.fill({ color: 0xff8822, alpha: 0.7 });
      // Inner flame (bright core)
      torchGfx.moveTo(tx - 2, 122);
      torchGfx.quadraticCurveTo(tx - 1, 112, tx, 105);
      torchGfx.quadraticCurveTo(tx + 1, 112, tx + 2, 122);
      torchGfx.closePath();
      torchGfx.fill({ color: 0xffcc44, alpha: 0.8 });
      // Flame tip (white-hot)
      torchGfx.moveTo(tx - 1, 108);
      torchGfx.quadraticCurveTo(tx, 98, tx + 1, 108);
      torchGfx.fill({ color: 0xffeedd, alpha: 0.4 });
      // Glow halos
      torchGfx.circle(tx, 112, 30);
      torchGfx.fill({ color: 0xff6622, alpha: 0.03 });
      torchGfx.circle(tx, 112, 18);
      torchGfx.fill({ color: 0xff8844, alpha: 0.05 });
      torchGfx.circle(tx, 112, 10);
      torchGfx.fill({ color: 0xffaa44, alpha: 0.06 });
    }
    this._bgLayer.addChild(bg);
    this._bgLayer.addChild(torchGfx);

    // Torch flame flicker
    gsap.to(torchGfx, { alpha: 0.7, duration: 0.12, yoyo: true, repeat: -1, ease: "none" });

    // ── Atmospheric fog ──
    const fog = new Graphics();
    for (let i = 0; i < 5; i++) {
      const fx = 80 + i * 150;
      const fy = 230 + (i % 3) * 8;
      fog.ellipse(fx, fy, 70 + i * 8, 6);
      fog.fill({ color: 0x222244, alpha: 0.06 });
    }
    this._bgLayer.addChild(fog);

    // ── Floor rune circle (center) ──
    const rune = new Graphics();
    rune.circle(SW / 2, 260, 40);
    rune.stroke({ color: 0x333355, width: 0.8, alpha: 0.15 });
    rune.circle(SW / 2, 260, 30);
    rune.stroke({ color: 0x333355, width: 0.5, alpha: 0.1 });
    // Cross pattern
    rune.moveTo(SW / 2 - 35, 260);
    rune.lineTo(SW / 2 + 35, 260);
    rune.stroke({ color: 0x333355, width: 0.5, alpha: 0.1 });
    rune.moveTo(SW / 2, 225);
    rune.lineTo(SW / 2, 295);
    rune.stroke({ color: 0x333355, width: 0.5, alpha: 0.1 });
    this._bgLayer.addChild(rune);

    // ── Vignette (darkened edges for cinematic feel) ──
    const vig = new Graphics();
    // Top edge
    vig.rect(0, 0, SW, 50);
    vig.fill({ color: 0x000000, alpha: 0.25 });
    vig.rect(0, 0, SW, 25);
    vig.fill({ color: 0x000000, alpha: 0.15 });
    // Bottom edge
    vig.rect(0, SH - 30, SW, 30);
    vig.fill({ color: 0x000000, alpha: 0.2 });
    // Left edge
    vig.rect(0, 0, 30, SH);
    vig.fill({ color: 0x000000, alpha: 0.15 });
    // Right edge
    vig.rect(SW - 30, 0, 30, SH);
    vig.fill({ color: 0x000000, alpha: 0.15 });
    this._bgLayer.addChild(vig);
  }

  // ── Draw player knight silhouette ─────────────────────────────────────────

  private _drawPlayerKnight(_run: RTRunState): void {
    const g = new Graphics();
    const kx = 52;
    const ky = 285;
    const knightColor = 0x556677;

    // Shadow
    g.ellipse(kx, ky + 42, 22, 6);
    g.fill({ color: 0x000000, alpha: 0.25 });

    // Legs
    g.rect(kx - 8, ky + 16, 6, 24);
    g.fill({ color: 0x444455 });
    g.rect(kx + 2, ky + 16, 6, 24);
    g.fill({ color: 0x444455 });
    // Boots
    g.roundRect(kx - 10, ky + 36, 10, 6, 2);
    g.fill({ color: 0x3a3a44 });
    g.roundRect(kx, ky + 36, 10, 6, 2);
    g.fill({ color: 0x3a3a44 });

    // Torso (armor)
    g.roundRect(kx - 14, ky - 14, 28, 32, 4);
    g.fill({ color: knightColor, alpha: 0.9 });
    // Chest plate highlight
    g.roundRect(kx - 10, ky - 10, 20, 10, 3);
    g.fill({ color: 0x667788, alpha: 0.4 });
    // Belt
    g.rect(kx - 14, ky + 12, 28, 4);
    g.fill({ color: 0x8b6914 });
    g.circle(kx, ky + 14, 2);
    g.fill({ color: 0xffd700 });

    // Cape (behind, flowing with fold detail)
    g.moveTo(kx - 12, ky - 12);
    g.quadraticCurveTo(kx - 22, ky - 2, kx - 26, ky + 8);
    g.quadraticCurveTo(kx - 30, ky + 20, kx - 24, ky + 30);
    g.quadraticCurveTo(kx - 20, ky + 38, kx - 18, ky + 36);
    g.lineTo(kx - 14, ky + 30);
    g.lineTo(kx - 14, ky - 12);
    g.closePath();
    g.fill({ color: 0x882222, alpha: 0.7 });
    // Cape inner fold line
    g.moveTo(kx - 16, ky - 6);
    g.quadraticCurveTo(kx - 22, ky + 8, kx - 20, ky + 28);
    g.stroke({ color: 0x661111, width: 1, alpha: 0.4 });
    // Cape highlight edge
    g.moveTo(kx - 13, ky - 10);
    g.quadraticCurveTo(kx - 20, ky + 2, kx - 18, ky + 20);
    g.stroke({ color: 0xaa3333, width: 0.8, alpha: 0.3 });

    // Arms
    // Left arm (shield side)
    g.rect(kx - 18, ky - 6, 6, 20);
    g.fill({ color: knightColor });
    // Right arm (sword side)
    g.rect(kx + 12, ky - 6, 6, 18);
    g.fill({ color: knightColor });

    // Shield (left)
    g.moveTo(kx - 24, ky - 4);
    g.lineTo(kx - 30, ky);
    g.lineTo(kx - 28, ky + 14);
    g.lineTo(kx - 22, ky + 20);
    g.lineTo(kx - 16, ky + 14);
    g.lineTo(kx - 14, ky);
    g.lineTo(kx - 20, ky - 4);
    g.closePath();
    g.fill({ color: 0x3366aa, alpha: 0.85 });
    g.stroke({ color: 0x5588cc, width: 1 });
    // Shield emblem (cross)
    g.rect(kx - 24, ky + 4, 8, 2);
    g.fill({ color: 0xdddddd, alpha: 0.5 });
    g.rect(kx - 21, ky + 1, 2, 8);
    g.fill({ color: 0xdddddd, alpha: 0.5 });

    // Sword (right, pointing up)
    g.rect(kx + 16, ky - 28, 2.5, 32);
    g.fill({ color: 0xbbbbcc });
    // Sword highlight
    g.rect(kx + 16.5, ky - 28, 1, 28);
    g.fill({ color: 0xffffff, alpha: 0.2 });
    // Crossguard
    g.rect(kx + 12, ky + 0, 12, 3);
    g.fill({ color: 0x8b6914 });
    // Pommel
    g.circle(kx + 17.25, ky + 6, 2.5);
    g.fill({ color: 0xffd700 });
    // Blade tip
    g.moveTo(kx + 16, ky - 28);
    g.lineTo(kx + 17.25, ky - 34);
    g.lineTo(kx + 18.5, ky - 28);
    g.fill({ color: 0xccccdd });

    // Helm
    g.roundRect(kx - 10, ky - 30, 20, 18, 5);
    g.fill({ color: 0x778899, alpha: 0.9 });
    g.roundRect(kx - 10, ky - 30, 20, 18, 5);
    g.stroke({ color: 0x8899aa, width: 0.8 });
    // Visor slit
    g.rect(kx - 7, ky - 20, 14, 3);
    g.fill({ color: 0x1a1a2a });
    // Eye glow (subtle)
    g.circle(kx - 3, ky - 19, 1.5);
    g.fill({ color: 0x4488ff, alpha: 0.6 });
    g.circle(kx + 3, ky - 19, 1.5);
    g.fill({ color: 0x4488ff, alpha: 0.6 });
    // Nasal guard
    g.rect(kx - 1, ky - 28, 2, 10);
    g.fill({ color: 0x8899aa });
    // Plume
    g.moveTo(kx - 2, ky - 30);
    g.quadraticCurveTo(kx + 12, ky - 44, kx + 6, ky - 30);
    g.fill({ color: 0xcc2222, alpha: 0.7 });

    this._bgLayer.addChild(g);

    // Breathing idle (subtle scale pulse)
    gsap.to(g.scale, { y: 1.008, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }

  // ── Main render update ───────────────────────────────────────────────────

  update(run: RTRunState, combat: RTCombatState, showIntents: boolean): void {
    this._enemyLayer.removeChildren();
    this._handLayer.removeChildren();
    this._uiLayer.removeChildren();
    this._hideCardTooltip();
    this._cardViews = [];
    this._enemyBaseY = [];

    if (!combat) return;

    // ── Enemies ──
    const alive = combat.enemies.filter(e => e.hp > 0);
    const spacing = Math.min(200, (SW - 120) / Math.max(1, alive.length));
    const startX = (SW - spacing * alive.length) / 2 + spacing / 2;

    for (let i = 0; i < alive.length; i++) {
      const enemy = alive[i];
      const def = getEnemyDef(enemy.defId);
      const ex = startX + i * spacing;
      const ey = 160;
      const selected = i === combat.selectedTarget;

      const ec = new Container();
      ec.position.set(ex, ey);
      this._enemyBaseY.push(ey); // store for idle bobbing

      // ── Procedural enemy body (type-specific shapes) ──
      const scale = def.isBoss ? 1.6 : def.isElite ? 1.25 : 1.0;
      const bodyColor = def.isBoss ? COL.ENEMY_BOSS : def.isElite ? COL.ENEMY_ELITE : COL.ENEMY_NORMAL;
      const borderCol = selected ? 0xffee44 : 0x666666;
      const borderW = selected ? 2.5 : 1.2;
      const eid = enemy.defId;

      // Determine body type from enemy id
      const isBeast = eid.includes("wolf") || eid.includes("louse") || eid.includes("fungus") || eid.includes("hellhound") || eid.includes("questing") || eid.includes("pixie");
      const isDragon = eid.includes("dragon") || eid.includes("whelp");
      const isUndead = eid.includes("skeleton") || eid.includes("wraith") || eid.includes("shade") || eid.includes("wight") || eid.includes("ghost");
      const isKnight = eid.includes("knight") || eid.includes("nob") || eid.includes("paladin") || eid.includes("mordred") || eid.includes("sentry");
      const isMage = eid.includes("morgan") || eid.includes("trickster") || eid.includes("cultist") || eid.includes("guardian");

      const body = new Graphics();
      let bodyH = 56 * scale;
      const bodyW = 44 * scale;

      // Shadow
      const shadow = new Graphics();
      shadow.ellipse(0, bodyH / 2 + 4, bodyW * 0.6, 6);
      shadow.fill({ color: 0x000000, alpha: 0.3 });
      ec.addChild(shadow);

      // Selected glow
      if (selected) {
        const selGlow = new Graphics();
        selGlow.roundRect(-bodyW / 2 - 8, -bodyH / 2 - 8, bodyW + 16, bodyH + 16, 12 * scale);
        selGlow.fill({ color: 0xffee44, alpha: 0.05 });
        ec.addChild(selGlow);
        gsap.to(selGlow, { alpha: 0.25, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }

      if (isDragon) {
        // ── Dragon shape: detailed wings, head, tail ──
        bodyH = 50 * scale;
        // Body (oval)
        body.ellipse(0, 0, bodyW * 0.55, bodyH * 0.4);
        body.fill({ color: bodyColor, alpha: 0.9 });
        // Left wing (multi-point membrane)
        body.moveTo(-bodyW * 0.4, -bodyH * 0.15);
        body.lineTo(-bodyW * 0.6, -bodyH * 0.5);
        body.lineTo(-bodyW * 0.85, -bodyH * 0.55);
        body.lineTo(-bodyW * 0.7, -bodyH * 0.3);
        body.lineTo(-bodyW * 0.9, -bodyH * 0.35);
        body.lineTo(-bodyW * 0.6, -bodyH * 0.1);
        body.lineTo(-bodyW * 0.3, -bodyH * 0.05);
        body.closePath();
        body.fill({ color: bodyColor + 0x111111, alpha: 0.6 });
        // Wing membrane veins
        body.moveTo(-bodyW * 0.45, -bodyH * 0.18);
        body.lineTo(-bodyW * 0.75, -bodyH * 0.5);
        body.stroke({ color: bodyColor, width: 1, alpha: 0.4 });
        body.moveTo(-bodyW * 0.4, -bodyH * 0.1);
        body.lineTo(-bodyW * 0.8, -bodyH * 0.35);
        body.stroke({ color: bodyColor, width: 1, alpha: 0.3 });
        // Right wing (mirror)
        body.moveTo(bodyW * 0.4, -bodyH * 0.15);
        body.lineTo(bodyW * 0.6, -bodyH * 0.5);
        body.lineTo(bodyW * 0.85, -bodyH * 0.55);
        body.lineTo(bodyW * 0.7, -bodyH * 0.3);
        body.lineTo(bodyW * 0.9, -bodyH * 0.35);
        body.lineTo(bodyW * 0.6, -bodyH * 0.1);
        body.lineTo(bodyW * 0.3, -bodyH * 0.05);
        body.closePath();
        body.fill({ color: bodyColor + 0x111111, alpha: 0.6 });
        body.moveTo(bodyW * 0.45, -bodyH * 0.18);
        body.lineTo(bodyW * 0.75, -bodyH * 0.5);
        body.stroke({ color: bodyColor, width: 1, alpha: 0.4 });
        body.moveTo(bodyW * 0.4, -bodyH * 0.1);
        body.lineTo(bodyW * 0.8, -bodyH * 0.35);
        body.stroke({ color: bodyColor, width: 1, alpha: 0.3 });
        // Neck + Head (elongated triangle with jaw)
        body.moveTo(-4 * scale, -bodyH * 0.3);
        body.lineTo(-2 * scale, -bodyH * 0.55);
        body.lineTo(0, -bodyH * 0.65);
        body.lineTo(2 * scale, -bodyH * 0.55);
        body.lineTo(4 * scale, -bodyH * 0.3);
        body.closePath();
        body.fill({ color: bodyColor });
        // Jaw line
        body.moveTo(-3 * scale, -bodyH * 0.48);
        body.lineTo(0, -bodyH * 0.52);
        body.lineTo(3 * scale, -bodyH * 0.48);
        body.stroke({ color: bodyColor - 0x111111, width: 1 });
        // Horns on head
        body.moveTo(-3 * scale, -bodyH * 0.58);
        body.lineTo(-5 * scale, -bodyH * 0.72);
        body.stroke({ color: bodyColor + 0x222222, width: 2 });
        body.moveTo(3 * scale, -bodyH * 0.58);
        body.lineTo(5 * scale, -bodyH * 0.72);
        body.stroke({ color: bodyColor + 0x222222, width: 2 });
        // Tail (S-curve with 4 points)
        body.moveTo(0, bodyH * 0.35);
        body.quadraticCurveTo(bodyW * 0.25, bodyH * 0.55, bodyW * 0.15, bodyH * 0.5);
        body.quadraticCurveTo(bodyW * 0.35, bodyH * 0.45, bodyW * 0.25, bodyH * 0.6);
        body.stroke({ color: bodyColor, width: 3 * scale });
        // Tail spike
        body.moveTo(bodyW * 0.2, bodyH * 0.58);
        body.lineTo(bodyW * 0.35, bodyH * 0.55);
        body.lineTo(bodyW * 0.25, bodyH * 0.65);
        body.fill({ color: bodyColor + 0x111111 });
        // Belly scales (3 horizontal lines)
        for (let si = 0; si < 3; si++) {
          const sy2 = -bodyH * 0.15 + si * bodyH * 0.12;
          body.moveTo(-bodyW * 0.3, sy2);
          body.lineTo(bodyW * 0.3, sy2);
          body.stroke({ color: bodyColor + 0x222222, width: 0.8, alpha: 0.3 });
        }
        body.ellipse(0, 0, bodyW * 0.55, bodyH * 0.4);
        body.stroke({ color: borderCol, width: borderW });
      } else if (isBeast) {
        // ── Beast shape: articulated legs with joints ──
        bodyH = 40 * scale;
        body.ellipse(0, 0, bodyW * 0.55, bodyH * 0.4);
        body.fill({ color: bodyColor, alpha: 0.9 });
        // Fur/spine ridge along back
        for (let si = 0; si < 5; si++) {
          const sx2 = -bodyW * 0.3 + si * bodyW * 0.15;
          body.moveTo(sx2, -bodyH * 0.35);
          body.lineTo(sx2 + 2 * scale, -bodyH * 0.45);
          body.lineTo(sx2 + 4 * scale, -bodyH * 0.35);
          body.fill({ color: bodyColor + 0x111111, alpha: 0.5 });
        }
        // Head (protruding with jaw)
        body.circle(-bodyW * 0.35, -bodyH * 0.15, 10 * scale);
        body.fill({ color: bodyColor });
        // Snout (elongated)
        body.moveTo(-bodyW * 0.45, -bodyH * 0.08);
        body.lineTo(-bodyW * 0.58, -bodyH * 0.12);
        body.lineTo(-bodyW * 0.56, -bodyH * 0.05);
        body.closePath();
        body.fill({ color: bodyColor + 0x111111 });
        // Ear
        body.moveTo(-bodyW * 0.3, -bodyH * 0.25);
        body.lineTo(-bodyW * 0.35, -bodyH * 0.4);
        body.lineTo(-bodyW * 0.25, -bodyH * 0.28);
        body.fill({ color: bodyColor });
        // Legs with joints (L-shaped, 2 segments each)
        const legPositions = [-bodyW * 0.3, -bodyW * 0.08, bodyW * 0.08, bodyW * 0.3];
        for (let li = 0; li < legPositions.length; li++) {
          const lx = legPositions[li];
          const knee = bodyH * 0.32;
          const foot = bodyH * 0.42;
          // Upper leg
          body.moveTo(lx, bodyH * 0.2);
          body.lineTo(lx + 2 * scale, knee);
          body.stroke({ color: bodyColor - 0x111111, width: 3.5 * scale });
          // Lower leg (angled forward)
          body.moveTo(lx + 2 * scale, knee);
          body.lineTo(lx - 1 * scale, foot);
          body.stroke({ color: bodyColor - 0x111111, width: 3 * scale });
          // Paw
          body.circle(lx - 1 * scale, foot + 2, 2.5 * scale);
          body.fill({ color: bodyColor - 0x222222 });
        }
        // Tail (curved upward with S)
        body.moveTo(bodyW * 0.4, 0);
        body.quadraticCurveTo(bodyW * 0.55, -bodyH * 0.15, bodyW * 0.5, -bodyH * 0.25);
        body.quadraticCurveTo(bodyW * 0.6, -bodyH * 0.35, bodyW * 0.55, -bodyH * 0.2);
        body.stroke({ color: bodyColor, width: 2.5 * scale });
        body.ellipse(0, 0, bodyW * 0.55, bodyH * 0.4);
        body.stroke({ color: borderCol, width: borderW });
      } else if (isUndead) {
        // ── Undead: skeletal with arm bones, curved ribs, jaw detail ──
        // Spine
        body.rect(-1.5 * scale, -bodyH * 0.28, 3 * scale, bodyH * 0.45);
        body.fill({ color: 0x445544, alpha: 0.6 });
        // Ribcage (curved ribs)
        for (let r = 0; r < 5; r++) {
          const ry = -bodyH * 0.22 + r * 5 * scale;
          const ribW = (bodyW * 0.25 - r * 1.5 * scale);
          // Left rib (curved)
          body.moveTo(0, ry);
          body.quadraticCurveTo(-ribW * 0.6, ry - 2 * scale, -ribW, ry + 2 * scale);
          body.stroke({ color: 0x667766, width: 1.5, alpha: 0.6 });
          // Right rib
          body.moveTo(0, ry);
          body.quadraticCurveTo(ribW * 0.6, ry - 2 * scale, ribW, ry + 2 * scale);
          body.stroke({ color: 0x667766, width: 1.5, alpha: 0.6 });
        }
        // Pelvis
        body.arc(0, bodyH * 0.1, bodyW * 0.2, 0, Math.PI);
        body.stroke({ color: 0x556655, width: 1.5, alpha: 0.5 });
        // Skull head
        body.circle(0, -bodyH * 0.35, 10 * scale);
        body.fill({ color: 0x556655 });
        body.circle(0, -bodyH * 0.35, 10 * scale);
        body.stroke({ color: borderCol, width: borderW });
        // Jaw (separate piece)
        body.arc(0, -bodyH * 0.28, 7 * scale, 0.2, Math.PI - 0.2);
        body.stroke({ color: 0x4a5a4a, width: 1.5 });
        // Teeth
        for (let t = 0; t < 4; t++) {
          const tx2 = -4 * scale + t * 3 * scale;
          body.rect(tx2, -bodyH * 0.29, 1.5 * scale, 2 * scale);
          body.fill({ color: 0x667766, alpha: 0.5 });
        }
        // Eye sockets
        body.circle(-4 * scale, -bodyH * 0.37, 3 * scale);
        body.fill({ color: 0x1a1a22 });
        body.circle(4 * scale, -bodyH * 0.37, 3 * scale);
        body.fill({ color: 0x1a1a22 });
        // Ghostly glow eyes
        body.circle(-4 * scale, -bodyH * 0.37, 2 * scale);
        body.fill({ color: 0x44ff88, alpha: 0.5 });
        body.circle(4 * scale, -bodyH * 0.37, 2 * scale);
        body.fill({ color: 0x44ff88, alpha: 0.5 });
        // Left arm (upper + lower + hand)
        body.moveTo(-bodyW * 0.25, -bodyH * 0.2);
        body.lineTo(-bodyW * 0.35, -bodyH * 0.05);
        body.stroke({ color: 0x556655, width: 2.5 * scale }); // upper
        body.moveTo(-bodyW * 0.35, -bodyH * 0.05);
        body.lineTo(-bodyW * 0.3, bodyH * 0.1);
        body.stroke({ color: 0x4a5a4a, width: 2 * scale }); // lower
        // Bony hand
        body.circle(-bodyW * 0.3, bodyH * 0.12, 3 * scale);
        body.stroke({ color: 0x4a5a4a, width: 1 });
        // Right arm
        body.moveTo(bodyW * 0.25, -bodyH * 0.2);
        body.lineTo(bodyW * 0.35, -bodyH * 0.02);
        body.stroke({ color: 0x556655, width: 2.5 * scale });
        body.moveTo(bodyW * 0.35, -bodyH * 0.02);
        body.lineTo(bodyW * 0.28, bodyH * 0.12);
        body.stroke({ color: 0x4a5a4a, width: 2 * scale });
        body.circle(bodyW * 0.28, bodyH * 0.14, 3 * scale);
        body.stroke({ color: 0x4a5a4a, width: 1 });
        // Legs (bone segments)
        body.moveTo(-5 * scale, bodyH * 0.12);
        body.lineTo(-7 * scale, bodyH * 0.3);
        body.stroke({ color: 0x3a3a44, width: 2.5 * scale });
        body.moveTo(-7 * scale, bodyH * 0.3);
        body.lineTo(-5 * scale, bodyH * 0.42);
        body.stroke({ color: 0x3a3a44, width: 2 * scale });
        body.moveTo(5 * scale, bodyH * 0.12);
        body.lineTo(7 * scale, bodyH * 0.3);
        body.stroke({ color: 0x3a3a44, width: 2.5 * scale });
        body.moveTo(7 * scale, bodyH * 0.3);
        body.lineTo(5 * scale, bodyH * 0.42);
        body.stroke({ color: 0x3a3a44, width: 2 * scale });
      } else if (isMage) {
        // ── Mage: detailed robe with folds, ornate hood, staff ──
        // Robe (curved 6-point polygon with hem)
        body.moveTo(0, -bodyH * 0.35);
        body.quadraticCurveTo(-bodyW * 0.15, -bodyH * 0.1, -bodyW * 0.35, bodyH * 0.3);
        body.lineTo(-bodyW * 0.42, bodyH * 0.4);
        body.lineTo(-bodyW * 0.2, bodyH * 0.38);
        body.lineTo(0, bodyH * 0.42);
        body.lineTo(bodyW * 0.2, bodyH * 0.38);
        body.lineTo(bodyW * 0.42, bodyH * 0.4);
        body.lineTo(bodyW * 0.35, bodyH * 0.3);
        body.quadraticCurveTo(bodyW * 0.15, -bodyH * 0.1, 0, -bodyH * 0.35);
        body.closePath();
        body.fill({ color: 0x332255, alpha: 0.9 });
        body.stroke({ color: borderCol, width: borderW });
        // Robe fold lines (vertical)
        body.moveTo(-bodyW * 0.08, -bodyH * 0.15);
        body.quadraticCurveTo(-bodyW * 0.12, bodyH * 0.1, -bodyW * 0.1, bodyH * 0.35);
        body.stroke({ color: 0x221144, width: 1, alpha: 0.4 });
        body.moveTo(bodyW * 0.08, -bodyH * 0.15);
        body.quadraticCurveTo(bodyW * 0.12, bodyH * 0.1, bodyW * 0.1, bodyH * 0.35);
        body.stroke({ color: 0x221144, width: 1, alpha: 0.4 });
        // Center seam
        body.moveTo(0, -bodyH * 0.2);
        body.lineTo(0, bodyH * 0.38);
        body.stroke({ color: 0x221144, width: 0.8, alpha: 0.3 });
        // Hem detail (wavy bottom)
        body.moveTo(-bodyW * 0.4, bodyH * 0.39);
        body.quadraticCurveTo(-bodyW * 0.3, bodyH * 0.42, -bodyW * 0.2, bodyH * 0.38);
        body.quadraticCurveTo(-bodyW * 0.1, bodyH * 0.44, 0, bodyH * 0.42);
        body.quadraticCurveTo(bodyW * 0.1, bodyH * 0.44, bodyW * 0.2, bodyH * 0.38);
        body.quadraticCurveTo(bodyW * 0.3, bodyH * 0.42, bodyW * 0.4, bodyH * 0.39);
        body.stroke({ color: 0x443366, width: 1.2, alpha: 0.5 });
        // Sash/belt
        body.moveTo(-bodyW * 0.25, bodyH * 0.05);
        body.lineTo(bodyW * 0.25, bodyH * 0.05);
        body.stroke({ color: 0x8b6914, width: 2 });
        // Hood (layered arc)
        body.arc(0, -bodyH * 0.25, 13 * scale, -Math.PI, 0);
        body.fill({ color: 0x221144 });
        body.arc(0, -bodyH * 0.25, 13 * scale, -Math.PI, 0);
        body.stroke({ color: 0x332255, width: 1 });
        // Hood point
        body.moveTo(0, -bodyH * 0.25 - 13 * scale);
        body.lineTo(-2 * scale, -bodyH * 0.25 - 16 * scale);
        body.lineTo(2 * scale, -bodyH * 0.25 - 13 * scale);
        body.fill({ color: 0x221144 });
        // Staff (detailed)
        const stx = bodyW * 0.38;
        body.rect(stx, -bodyH * 0.5, 2.5 * scale, bodyH * 0.88);
        body.fill({ color: 0x6b3a1f });
        // Staff spiral wrap
        for (let sw2 = 0; sw2 < 4; sw2++) {
          const swy = -bodyH * 0.3 + sw2 * bodyH * 0.15;
          body.moveTo(stx - 1, swy);
          body.lineTo(stx + 3.5 * scale, swy + 4 * scale);
          body.stroke({ color: 0x8b6914, width: 1, alpha: 0.4 });
        }
        // Staff orb (multi-layered)
        const orbX = stx + 1.25 * scale;
        const orbY = -bodyH * 0.5;
        body.circle(orbX, orbY, 8 * scale);
        body.fill({ color: 0x8844cc, alpha: 0.08 });
        body.circle(orbX, orbY, 6 * scale);
        body.fill({ color: 0x8844cc, alpha: 0.15 });
        body.circle(orbX, orbY, 4.5 * scale);
        body.fill({ color: 0x9955dd, alpha: 0.6 });
        body.circle(orbX, orbY, 4.5 * scale);
        body.stroke({ color: 0xaa66ee, width: 1.2 });
        body.circle(orbX, orbY, 2.5 * scale);
        body.fill({ color: 0xccaaff, alpha: 0.5 });
        // Eyes under hood
        body.circle(-4 * scale, -bodyH * 0.2, 2.5 * scale);
        body.fill({ color: 0xffcc00, alpha: 0.8 });
        body.circle(4 * scale, -bodyH * 0.2, 2.5 * scale);
        body.fill({ color: 0xffcc00, alpha: 0.8 });
        body.circle(-4 * scale, -bodyH * 0.2, 4 * scale);
        body.fill({ color: 0xffaa00, alpha: 0.1 });
        body.circle(4 * scale, -bodyH * 0.2, 4 * scale);
        body.fill({ color: 0xffaa00, alpha: 0.1 });
      } else {
        // ── Humanoid knight/warrior: full armor with cape, shield, detailed sword ──
        // Cape (behind body)
        body.moveTo(-bodyW * 0.4, -bodyH * 0.3);
        body.quadraticCurveTo(-bodyW * 0.5, bodyH * 0.1, -bodyW * 0.45, bodyH * 0.35);
        body.lineTo(-bodyW * 0.35, bodyH * 0.3);
        body.lineTo(-bodyW * 0.35, -bodyH * 0.28);
        body.closePath();
        body.fill({ color: bodyColor + 0x110000, alpha: 0.5 });
        // Legs
        body.rect(-8 * scale, bodyH * 0.15, 6 * scale, 18 * scale);
        body.fill({ color: bodyColor - 0x111111 });
        body.rect(2 * scale, bodyH * 0.15, 6 * scale, 18 * scale);
        body.fill({ color: bodyColor - 0x111111 });
        // Boots
        body.roundRect(-10 * scale, bodyH * 0.3, 10 * scale, 5 * scale, 2);
        body.fill({ color: 0x3a3a44 });
        body.roundRect(0, bodyH * 0.3, 10 * scale, 5 * scale, 2);
        body.fill({ color: 0x3a3a44 });
        // Torso (armored)
        body.roundRect(-bodyW / 2, -bodyH * 0.35, bodyW, bodyH * 0.55, 6 * scale);
        body.fill({ color: bodyColor, alpha: 0.9 });
        // Chest plate
        body.roundRect(-bodyW / 2 + 3, -bodyH * 0.32, bodyW - 6, bodyH * 0.2, 4);
        body.fill({ color: bodyColor + 0x222222, alpha: 0.4 });
        // Armor seam lines
        body.moveTo(-bodyW * 0.1, -bodyH * 0.3);
        body.lineTo(-bodyW * 0.1, bodyH * 0.15);
        body.stroke({ color: bodyColor - 0x111111, width: 0.8, alpha: 0.3 });
        body.moveTo(bodyW * 0.1, -bodyH * 0.3);
        body.lineTo(bodyW * 0.1, bodyH * 0.15);
        body.stroke({ color: bodyColor - 0x111111, width: 0.8, alpha: 0.3 });
        // Belt
        body.rect(-bodyW / 2, bodyH * 0.12, bodyW, 3 * scale);
        body.fill({ color: 0x5d3a1a });
        body.roundRect(-bodyW / 2, -bodyH * 0.35, bodyW, bodyH * 0.55, 6 * scale);
        body.stroke({ color: borderCol, width: borderW });
        // Pauldrons (shoulder plates)
        body.ellipse(-bodyW / 2 - 2 * scale, -bodyH * 0.22, 6 * scale, 4 * scale);
        body.fill({ color: bodyColor + 0x111111 });
        body.ellipse(-bodyW / 2 - 2 * scale, -bodyH * 0.22, 6 * scale, 4 * scale);
        body.stroke({ color: borderCol, width: 0.8 });
        body.ellipse(bodyW / 2 + 2 * scale, -bodyH * 0.22, 6 * scale, 4 * scale);
        body.fill({ color: bodyColor + 0x111111 });
        body.ellipse(bodyW / 2 + 2 * scale, -bodyH * 0.22, 6 * scale, 4 * scale);
        body.stroke({ color: borderCol, width: 0.8 });
        // Arms
        body.rect(-bodyW / 2 - 5 * scale, -bodyH * 0.18, 5 * scale, 16 * scale);
        body.fill({ color: bodyColor });
        body.rect(bodyW / 2, -bodyH * 0.18, 5 * scale, 16 * scale);
        body.fill({ color: bodyColor });
        // Shield (left arm)
        body.moveTo(-bodyW / 2 - 6 * scale, -bodyH * 0.15);
        body.lineTo(-bodyW / 2 - 12 * scale, -bodyH * 0.1);
        body.lineTo(-bodyW / 2 - 10 * scale, bodyH * 0.05);
        body.lineTo(-bodyW / 2 - 6 * scale, bodyH * 0.1);
        body.closePath();
        body.fill({ color: bodyColor + 0x222244, alpha: 0.7 });
        body.stroke({ color: borderCol, width: 0.8 });
        // Head/Helm
        body.roundRect(-8 * scale, -bodyH * 0.5, 16 * scale, 16 * scale, 4 * scale);
        body.fill({ color: bodyColor + 0x111111 });
        body.roundRect(-8 * scale, -bodyH * 0.5, 16 * scale, 16 * scale, 4 * scale);
        body.stroke({ color: borderCol, width: borderW * 0.7 });
        // Visor
        body.rect(-6 * scale, -bodyH * 0.4, 12 * scale, 3 * scale);
        body.fill({ color: 0x1a1a22 });
        // Nasal guard
        body.rect(-1 * scale, -bodyH * 0.48, 2 * scale, 8 * scale);
        body.fill({ color: bodyColor + 0x222222 });
        // Weapon (detailed sword on right)
        const swX = bodyW / 2 + 3 * scale;
        body.rect(swX, -bodyH * 0.48, 2.5 * scale, 32 * scale);
        body.fill({ color: 0xaaaabb });
        // Blade highlight
        body.rect(swX + 0.5, -bodyH * 0.46, 1, 28 * scale);
        body.fill({ color: 0xffffff, alpha: 0.15 });
        // Crossguard
        body.rect(swX - 3 * scale, -bodyH * 0.18, 9 * scale, 3 * scale);
        body.fill({ color: 0x8b6914 });
        // Pommel
        body.circle(swX + 1.25 * scale, -bodyH * 0.12, 2.5 * scale);
        body.fill({ color: 0xffd700, alpha: 0.7 });
      }

      ec.addChild(body);

      // ── Eyes (for non-specialized types that didn't draw their own) ──
      if (!isUndead && !isMage && !isKnight) {
        const eyeY2 = isDragon ? -bodyH * 0.45 : isBeast ? -bodyH * 0.15 : -bodyH * 0.15;
        const eyeGap2 = (isDragon ? 4 : isBeast ? 3 : 6) * scale;
        const eyeSize2 = (isDragon ? 2 : isBeast ? 2 : 2.5) * scale;
        const eyeColor = def.isBoss ? 0xff2222 : 0xffcc00;
        const eyeG = new Graphics();
        const eyeOffX = isBeast ? -bodyW * 0.2 : 0;
        eyeG.circle(eyeOffX - eyeGap2, eyeY2, eyeSize2);
        eyeG.fill({ color: eyeColor, alpha: 0.9 });
        eyeG.circle(eyeOffX + eyeGap2, eyeY2, eyeSize2);
        eyeG.fill({ color: eyeColor, alpha: 0.9 });
        // Glow
        eyeG.circle(eyeOffX - eyeGap2, eyeY2, eyeSize2 + 2);
        eyeG.fill({ color: eyeColor, alpha: 0.12 });
        eyeG.circle(eyeOffX + eyeGap2, eyeY2, eyeSize2 + 2);
        eyeG.fill({ color: eyeColor, alpha: 0.12 });
        ec.addChild(eyeG);
      }

      // Boss crown / elite star
      const topY = isDragon ? -bodyH * 0.6 : isBeast ? -bodyH * 0.3 : isUndead ? -bodyH * 0.5 : -bodyH * 0.55;
      if (def.isBoss) {
        const crown = new Graphics();
        const cw = 18 * scale;
        crown.moveTo(-cw / 2, topY);
        crown.lineTo(-cw / 2, topY - 10);
        crown.lineTo(-cw / 4, topY - 5);
        crown.lineTo(0, topY - 12);
        crown.lineTo(cw / 4, topY - 5);
        crown.lineTo(cw / 2, topY - 10);
        crown.lineTo(cw / 2, topY);
        crown.closePath();
        crown.fill({ color: 0xffd700, alpha: 0.85 });
        crown.stroke({ color: 0xffee88, width: 0.8 });
        ec.addChild(crown);
      } else if (def.isElite) {
        const star = new Graphics();
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2 - Math.PI / 2;
          const a2 = ((j + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
          if (j === 0) star.moveTo(Math.cos(a) * 7, topY + Math.sin(a) * 7);
          else star.lineTo(Math.cos(a) * 7, topY + Math.sin(a) * 7);
          star.lineTo(Math.cos(a2) * 3, topY + Math.sin(a2) * 3);
        }
        star.closePath();
        star.fill({ color: 0xffaa44, alpha: 0.85 });
        ec.addChild(star);
      }

      // ── Name ──
      const nTxt = new Text({ text: def.name, style: sName });
      nTxt.anchor.set(0.5);
      nTxt.position.set(0, -bodyH / 2 - 16 - (def.isBoss ? 12 : def.isElite ? 8 : 0));
      ec.addChild(nTxt);

      // ── HP Bar ──
      const hpBarW = 56 * scale;
      const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);
      const hpBarY = bodyH / 2 + 8;
      const hpBg = new Graphics();
      hpBg.roundRect(-hpBarW / 2, hpBarY, hpBarW, 10, 3);
      hpBg.fill({ color: COL.HP_BG, alpha: 0.9 });
      hpBg.roundRect(-hpBarW / 2, hpBarY, hpBarW, 10, 3);
      hpBg.stroke({ color: 0x441111, width: 0.8 });
      ec.addChild(hpBg);
      if (hpFrac > 0) {
        const hpFill = new Graphics();
        const hpColor = hpFrac > 0.5 ? COL.HP_FILL : hpFrac > 0.25 ? COL.HP_WARN : COL.HP_CRIT;
        hpFill.roundRect(-hpBarW / 2 + 1, hpBarY + 1, (hpBarW - 2) * hpFrac, 8, 2);
        hpFill.fill({ color: hpColor });
        ec.addChild(hpFill);
      }
      const hpTxt = new Text({ text: `${Math.max(0, enemy.hp)}/${enemy.maxHp}`, style: sHp });
      hpTxt.anchor.set(0.5);
      hpTxt.position.set(0, hpBarY + 22);
      ec.addChild(hpTxt);

      // ── Block ──
      if (enemy.block > 0) {
        const blkC = new Graphics();
        const bx = hpBarW / 2 + 8;
        // Shield shape
        blkC.moveTo(bx, hpBarY - 4);
        blkC.lineTo(bx + 8, hpBarY);
        blkC.lineTo(bx + 7, hpBarY + 8);
        blkC.lineTo(bx, hpBarY + 12);
        blkC.lineTo(bx - 7, hpBarY + 8);
        blkC.lineTo(bx - 8, hpBarY);
        blkC.closePath();
        blkC.fill({ color: COL.BLOCK, alpha: 0.8 });
        blkC.stroke({ color: COL.BLOCK_TXT, width: 1 });
        ec.addChild(blkC);
        const bTxt = new Text({ text: `${enemy.block}`, style: sBlock });
        bTxt.anchor.set(0.5);
        bTxt.position.set(bx, hpBarY + 4);
        ec.addChild(bTxt);
      }

      // ── Intent ──
      if (showIntents && enemy.currentMoveId) {
        const moveDef = def.moves.find(m => m.id === enemy.currentMoveId);
        if (moveDef) {
          const intentC = new Container();
          const iy = -bodyH / 2 - 30 - (def.isBoss ? 12 : def.isElite ? 8 : 0);
          intentC.position.set(0, iy);

          const ibg = new Graphics();
          let intentText = "";
          let intentColor = COL.INTENT_ATK;

          if (moveDef.intent === EnemyIntentType.ATTACK) {
            const totalDmg = (moveDef.damage + getEffect(enemy.effects, StatusEffectId.STRENGTH)) * moveDef.hits;
            intentText = moveDef.hits > 1 ? `${moveDef.damage}x${moveDef.hits}` : `${Math.max(0, totalDmg)}`;
            intentColor = COL.INTENT_ATK;
            // Sword icon
            ibg.moveTo(-14, -4);
            ibg.lineTo(-14, 8);
            ibg.stroke({ color: intentColor, width: 2 });
            ibg.rect(-18, 6, 8, 2);
            ibg.fill({ color: intentColor });
          } else if (moveDef.intent === EnemyIntentType.DEFEND) {
            intentText = `${moveDef.block}`;
            intentColor = COL.INTENT_DEF;
            // Shield icon
            ibg.circle(-12, 2, 6);
            ibg.stroke({ color: intentColor, width: 1.5 });
          } else if (moveDef.intent === EnemyIntentType.BUFF) {
            intentText = "Buff";
            intentColor = COL.INTENT_BUFF;
            ibg.moveTo(-12, 6);
            ibg.lineTo(-12, -4);
            ibg.lineTo(-8, 0);
            ibg.stroke({ color: intentColor, width: 1.5 });
          } else if (moveDef.intent === EnemyIntentType.DEBUFF) {
            intentText = "Debuff";
            intentColor = COL.INTENT_DEBUFF;
          }

          const iTxt = new Text({ text: intentText, style: mkStyle(11, intentColor, true, true) });
          iTxt.anchor.set(0, 0.5);
          iTxt.position.set(-4, 2);
          intentC.addChild(ibg);
          intentC.addChild(iTxt);
          ec.addChild(intentC);
        }
      }

      // ── Status effects (compact badges) ──
      let effX = -bodyW / 2;
      const effY = bodyH / 2 + 36;
      for (const [effId, amount] of enemy.effects) {
        if (amount <= 0) continue;
        const info = EFFECT_LABELS[effId as StatusEffectId];
        if (!info) continue;
        const badge = new Graphics();
        badge.roundRect(effX, effY, 28, 14, 3);
        badge.fill({ color: 0x111122, alpha: 0.85 });
        badge.roundRect(effX, effY, 28, 14, 3);
        badge.stroke({ color: info.color, width: 0.8, alpha: 0.6 });
        ec.addChild(badge);
        const eTxt = new Text({ text: `${info.short}${amount}`, style: mkStyle(7, info.color) });
        eTxt.position.set(effX + 2, effY + 2);
        ec.addChild(eTxt);
        effX += 30;
      }

      // ── Click to target ──
      ec.eventMode = "static";
      ec.cursor = "pointer";
      ec.on("pointerdown", () => {
        combat.selectedTarget = i;
        if (this._selectedCardUid >= 0) {
          this.onCardPlay?.(this._selectedCardUid, i);
          this._selectedCardUid = -1;
        }
      });

      this._enemyLayer.addChild(ec);
    }

    // ══════════════════════════════════════════════════════════════════════
    // HAND
    // ══════════════════════════════════════════════════════════════════════

    const handY = SH - RoundTableCardView.HEIGHT - 24;
    const handCards = combat.hand;
    const cardSpacing = Math.min(RoundTableCardView.WIDTH + 4, (SW - 60) / Math.max(1, handCards.length));
    const handStartX = (SW - cardSpacing * handCards.length) / 2;

    // Hand area separator
    const handSep = new Graphics();
    handSep.moveTo(80, handY - 10);
    handSep.lineTo(SW - 80, handY - 10);
    handSep.stroke({ color: 0x2a2a44, width: 1, alpha: 0.4 });
    this._handLayer.addChild(handSep);

    for (let i = 0; i < handCards.length; i++) {
      const card = handCards[i];
      const playable = combat.isPlayerTurn && RoundTableCombatSystem.canPlayCard(run, combat, card);
      const cv = new RoundTableCardView(card, playable);

      // Fan layout: dramatic arc with visible rotation
      const centerOffset = i - (handCards.length - 1) / 2;
      const angle = centerOffset * 0.05;
      const yOff = Math.min(centerOffset * centerOffset * 1.8, 22); // gentle arc, capped

      const finalX = handStartX + i * cardSpacing;
      const finalY = handY + yOff;
      // Slide-in from below
      cv.container.position.set(finalX, finalY + 30);
      cv.container.alpha = 0;
      cv.container.rotation = angle;
      gsap.to(cv.container, { y: finalY, alpha: 1, duration: 0.2, delay: i * 0.03, ease: "power2.out", onComplete: () => {
        cv.recordBaseY();
      }});

      cv.container.on("pointerover", () => {
        cv.setHighlight(true);
        this._showCardTooltip(card, finalX, handY - 90);
      });
      cv.container.on("pointerout", () => {
        cv.setHighlight(false);
        this._hideCardTooltip();
      });
      cv.container.on("pointerdown", () => {
        if (!playable) return;
        const def = getCardDef(card.defId);
        if (def.target === "self" || def.target === "none" || def.targetAll) {
          this.onCardPlay?.(card.uid, combat.selectedTarget);
        } else if (alive.length === 1) {
          this.onCardPlay?.(card.uid, 0);
        } else {
          this._selectedCardUid = card.uid;
          cv.setHighlight(true);
        }
      });

      this._handLayer.addChild(cv.container);
      this._cardViews.push(cv);
    }

    // ══════════════════════════════════════════════════════════════════════
    // UI PANELS
    // ══════════════════════════════════════════════════════════════════════

    // ── Player HP bar (bottom-left) ──
    const phpX = 16;
    const phpY = SH - RoundTableCardView.HEIGHT - 58;
    const phpW = 180;
    const hpFrac = Math.max(0, run.hp / run.maxHp);
    const phpBg = new Graphics();
    phpBg.roundRect(phpX, phpY, phpW, 16, 4);
    phpBg.fill({ color: COL.HP_BG, alpha: 0.9 });
    phpBg.roundRect(phpX, phpY, phpW, 16, 4);
    phpBg.stroke({ color: 0x441111, width: 1 });
    this._uiLayer.addChild(phpBg);
    if (hpFrac > 0) {
      const phpFill = new Graphics();
      const hpColor = hpFrac > 0.5 ? 0xcc2222 : hpFrac > 0.25 ? COL.HP_WARN : COL.HP_CRIT;
      phpFill.roundRect(phpX + 1, phpY + 1, (phpW - 2) * hpFrac, 14, 3);
      phpFill.fill({ color: hpColor });
      // Highlight line
      phpFill.roundRect(phpX + 2, phpY + 2, (phpW - 4) * hpFrac, 4, 2);
      phpFill.fill({ color: 0xffffff, alpha: 0.12 });
      this._uiLayer.addChild(phpFill);
    }
    const phpTxt = new Text({ text: `${run.hp} / ${run.maxHp}`, style: mkStyle(10, 0xffcccc, true, true) });
    phpTxt.anchor.set(0.5, 0.5);
    phpTxt.position.set(phpX + phpW / 2, phpY + 8);
    this._uiLayer.addChild(phpTxt);

    // ── Block ──
    if (combat.playerBlock > 0) {
      const bx = phpX + phpW + 12;
      const by = phpY - 2;
      const blkIcon = new Graphics();
      blkIcon.moveTo(bx + 10, by);
      blkIcon.lineTo(bx + 20, by + 4);
      blkIcon.lineTo(bx + 18, by + 14);
      blkIcon.lineTo(bx + 10, by + 18);
      blkIcon.lineTo(bx + 2, by + 14);
      blkIcon.lineTo(bx, by + 4);
      blkIcon.closePath();
      blkIcon.fill({ color: COL.BLOCK, alpha: 0.85 });
      blkIcon.stroke({ color: COL.BLOCK_TXT, width: 1.2 });
      this._uiLayer.addChild(blkIcon);
      const bTxt = new Text({ text: `${combat.playerBlock}`, style: sBlock });
      bTxt.anchor.set(0.5);
      bTxt.position.set(bx + 10, by + 9);
      this._uiLayer.addChild(bTxt);
    }

    // ── Energy orb ──
    const eOrbX = 40;
    const eOrbY = SH - RoundTableCardView.HEIGHT - 88;
    // Outer glow (pulses when energy available)
    if (combat.energy > 0) {
      const eGlow = new Graphics();
      eGlow.circle(eOrbX, eOrbY, 28);
      eGlow.fill({ color: COL.ENERGY_TXT, alpha: 0.08 });
      eGlow.circle(eOrbX, eOrbY, 34);
      eGlow.fill({ color: COL.ENERGY_TXT, alpha: 0.04 });
      this._uiLayer.addChild(eGlow);
      gsap.to(eGlow, { alpha: 0.4, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }
    const eOrb = new Graphics();
    eOrb.circle(eOrbX, eOrbY, 22);
    eOrb.fill({ color: COL.ENERGY_BG, alpha: 0.95 });
    eOrb.circle(eOrbX, eOrbY, 22);
    eOrb.stroke({ color: combat.energy > 0 ? COL.ENERGY_TXT : 0x444466, width: 2 });
    // Inner glow ring
    eOrb.circle(eOrbX, eOrbY, 17);
    eOrb.stroke({ color: combat.energy > 0 ? COL.ENERGY_TXT : 0x333344, width: 0.8, alpha: 0.4 });
    this._uiLayer.addChild(eOrb);
    const eTxt = new Text({ text: `${combat.energy}/${combat.maxEnergy}`, style: combat.energy > 0 ? sEnergy : mkStyle(20, 0x555577, true, true) });
    eTxt.anchor.set(0.5);
    eTxt.position.set(eOrbX, eOrbY);
    this._uiLayer.addChild(eTxt);
    const eLabel = new Text({ text: "ENERGY", style: mkStyle(7, 0x6688aa) });
    eLabel.anchor.set(0.5);
    eLabel.position.set(eOrbX, eOrbY + 28);
    this._uiLayer.addChild(eLabel);

    // ── Player effects ──
    let pEffX = SW - 160;
    const pEffY = 50;
    let pEffRow = 0;
    for (const [effId, amount] of combat.playerEffects) {
      if (amount <= 0) continue;
      const info = EFFECT_LABELS[effId as StatusEffectId];
      if (!info) continue;
      const badge = new Graphics();
      const bx = pEffX + (pEffRow % 4) * 36;
      const by = pEffY + Math.floor(pEffRow / 4) * 18;
      badge.roundRect(bx, by, 34, 16, 3);
      badge.fill({ color: 0x111122, alpha: 0.85 });
      badge.roundRect(bx, by, 34, 16, 3);
      badge.stroke({ color: info.color, width: 0.8, alpha: 0.6 });
      this._uiLayer.addChild(badge);
      const eTxt2 = new Text({ text: `${info.short} ${amount}`, style: mkStyle(8, info.color) });
      eTxt2.position.set(bx + 3, by + 3);
      this._uiLayer.addChild(eTxt2);
      pEffRow++;
    }

    // ── End Turn button ──
    if (combat.isPlayerTurn) {
      const btn = new Container();
      const bw = 110;
      const bh = 38;
      const bx = SW - bw - 20;
      const by = SH - RoundTableCardView.HEIGHT - 82;
      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, bw, bh, 8);
      btnBg.fill({ color: 0x1a331a, alpha: 0.9 });
      btnBg.roundRect(0, 0, bw, bh, 8);
      btnBg.stroke({ color: 0x44aa44, width: 1.5 });
      // Highlight bar
      btnBg.roundRect(2, 2, bw - 4, bh * 0.35, 5);
      btnBg.fill({ color: 0xffffff, alpha: 0.06 });
      btn.addChild(btnBg);
      const btnTxt = new Text({ text: "END TURN", style: sBtn });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(bw / 2, bh / 2);
      btn.addChild(btnTxt);
      btn.position.set(bx, by);
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.on("pointerdown", () => this.onEndTurn?.());
      btn.on("pointerover", () => { btn.scale.set(1.05); });
      btn.on("pointerout", () => { btn.scale.set(1.0); });
      this._uiLayer.addChild(btn);
    }

    // ── Turn indicator badge ──
    const turnBadge = new Container();
    const tbBg = new Graphics();
    const isYourTurn = combat.isPlayerTurn;
    tbBg.roundRect(0, 0, 100, 24, 5);
    tbBg.fill({ color: isYourTurn ? 0x1a331a : 0x331a1a, alpha: 0.9 });
    tbBg.roundRect(0, 0, 100, 24, 5);
    tbBg.stroke({ color: isYourTurn ? 0x44aa44 : 0xaa4444, width: 1.2 });
    turnBadge.addChild(tbBg);
    const tbTxt = new Text({ text: isYourTurn ? "YOUR TURN" : "ENEMY TURN", style: mkStyle(10, isYourTurn ? 0x44ff44 : 0xff4444, true, true) });
    tbTxt.anchor.set(0.5);
    tbTxt.position.set(50, 12);
    turnBadge.addChild(tbTxt);
    turnBadge.position.set(SW / 2 - 50, 58);
    this._uiLayer.addChild(turnBadge);

    // ── Potions ──
    for (let i = 0; i < run.potions.length; i++) {
      const pot = run.potions[i];
      const px = 80 + i * 42;
      const py = 10;
      const potG = new Graphics();
      // Potion bottle (curved flask shape)
      const bx = px + 16; // center x
      const by = py + 16; // center y
      if (pot) {
        // Bottle body (tapered flask)
        potG.moveTo(bx - 10, by + 10);
        potG.quadraticCurveTo(bx - 12, by + 2, bx - 8, by - 2);
        potG.lineTo(bx - 4, by - 6);
        potG.lineTo(bx - 4, by - 12);
        potG.lineTo(bx + 4, by - 12);
        potG.lineTo(bx + 4, by - 6);
        potG.lineTo(bx + 8, by - 2);
        potG.quadraticCurveTo(bx + 12, by + 2, bx + 10, by + 10);
        potG.closePath();
        potG.fill({ color: 0x224422, alpha: 0.85 });
        potG.stroke({ color: 0x448844, width: 1.2 });
        // Glass highlight (left edge)
        potG.moveTo(bx - 8, by + 6);
        potG.quadraticCurveTo(bx - 10, by, bx - 6, by - 3);
        potG.stroke({ color: 0x66cc88, width: 1, alpha: 0.25 });
        // Liquid fill (lower portion)
        potG.moveTo(bx - 9, by + 8);
        potG.quadraticCurveTo(bx - 10, by + 3, bx - 6, by);
        potG.lineTo(bx + 6, by);
        potG.quadraticCurveTo(bx + 10, by + 3, bx + 9, by + 8);
        potG.closePath();
        potG.fill({ color: 0x44cc66, alpha: 0.5 });
        // Liquid surface shimmer
        potG.moveTo(bx - 5, by);
        potG.quadraticCurveTo(bx, by - 1.5, bx + 5, by);
        potG.stroke({ color: 0x88ffaa, width: 0.8, alpha: 0.3 });
        // Neck
        potG.rect(bx - 3.5, by - 14, 7, 4);
        potG.fill({ color: 0x224422, alpha: 0.7 });
        potG.rect(bx - 3.5, by - 14, 7, 4);
        potG.stroke({ color: 0x448844, width: 0.8 });
        // Cork (rounded)
        potG.roundRect(bx - 3, by - 17, 6, 4, 1.5);
        potG.fill({ color: 0x8b6914 });
        potG.roundRect(bx - 3, by - 17, 6, 4, 1.5);
        potG.stroke({ color: 0xaa8844, width: 0.6 });
        // Cork grain line
        potG.moveTo(bx - 1, by - 16.5);
        potG.lineTo(bx + 1, by - 13.5);
        potG.stroke({ color: 0x6b5010, width: 0.5, alpha: 0.4 });
      } else {
        // Empty slot
        potG.roundRect(px + 2, py + 2, 28, 28, 6);
        potG.fill({ color: 0x111111, alpha: 0.6 });
        potG.roundRect(px + 2, py + 2, 28, 28, 6);
        potG.stroke({ color: 0x333333, width: 0.8 });
      }
      this._uiLayer.addChild(potG);
      if (pot) {
        potG.eventMode = "static";
        potG.cursor = "pointer";
        potG.on("pointerdown", () => this.onPotionUse?.(i));
      }
    }

    // ── Draw pile icon (left of hand) ──
    const drawPileC = new Container();
    const dpX = 16;
    const dpY = handY + 30;
    const dpG = new Graphics();
    // Stacked card backs
    dpG.roundRect(dpX + 4, dpY + 4, 36, 48, 4);
    dpG.fill({ color: 0x1a1a33, alpha: 0.5 });
    dpG.roundRect(dpX + 2, dpY + 2, 36, 48, 4);
    dpG.fill({ color: 0x1a1a33, alpha: 0.7 });
    dpG.roundRect(dpX, dpY, 36, 48, 4);
    dpG.fill({ color: 0x1a2244, alpha: 0.9 });
    dpG.roundRect(dpX, dpY, 36, 48, 4);
    dpG.stroke({ color: 0x3355aa, width: 1.2 });
    // Card back pattern (diamond)
    dpG.moveTo(dpX + 18, dpY + 10);
    dpG.lineTo(dpX + 28, dpY + 24);
    dpG.lineTo(dpX + 18, dpY + 38);
    dpG.lineTo(dpX + 8, dpY + 24);
    dpG.closePath();
    dpG.stroke({ color: 0x4466aa, width: 1, alpha: 0.5 });
    drawPileC.addChild(dpG);
    const dpCount = new Text({ text: `${combat.drawPile.length}`, style: mkStyle(12, 0x6699cc, true, true) });
    dpCount.anchor.set(0.5);
    dpCount.position.set(dpX + 18, dpY + 54);
    drawPileC.addChild(dpCount);
    const dpLabel = new Text({ text: "DRAW", style: mkStyle(7, 0x4466aa) });
    dpLabel.anchor.set(0.5);
    dpLabel.position.set(dpX + 18, dpY + 66);
    drawPileC.addChild(dpLabel);
    drawPileC.eventMode = "static";
    drawPileC.cursor = "pointer";
    drawPileC.on("pointerdown", () => this.onDeckView?.());
    this._uiLayer.addChild(drawPileC);

    // ── Discard pile icon (right of hand) ──
    const discPileC = new Container();
    const dcX = SW - 52;
    const dcY = handY + 30;
    const dcG = new Graphics();
    if (combat.discardPile.length > 0) {
      // Scattered cards (messy pile)
      dcG.roundRect(dcX + 4, dcY + 6, 36, 48, 4);
      dcG.fill({ color: 0x2a1a1a, alpha: 0.5 });
      dcG.roundRect(dcX - 2, dcY + 3, 36, 48, 4);
      dcG.fill({ color: 0x2a1a1a, alpha: 0.6 });
    }
    dcG.roundRect(dcX, dcY, 36, 48, 4);
    dcG.fill({ color: 0x2a1a22, alpha: 0.9 });
    dcG.roundRect(dcX, dcY, 36, 48, 4);
    dcG.stroke({ color: 0x885544, width: 1.2 });
    // Used card marker (X)
    dcG.moveTo(dcX + 10, dcY + 14);
    dcG.lineTo(dcX + 26, dcY + 34);
    dcG.stroke({ color: 0x664433, width: 1.5, alpha: 0.4 });
    dcG.moveTo(dcX + 26, dcY + 14);
    dcG.lineTo(dcX + 10, dcY + 34);
    dcG.stroke({ color: 0x664433, width: 1.5, alpha: 0.4 });
    discPileC.addChild(dcG);
    const dcCount = new Text({ text: `${combat.discardPile.length}`, style: mkStyle(12, 0xaa7755, true, true) });
    dcCount.anchor.set(0.5);
    dcCount.position.set(dcX + 18, dcY + 54);
    discPileC.addChild(dcCount);
    const dcLabel = new Text({ text: "DISC", style: mkStyle(7, 0x885544) });
    dcLabel.anchor.set(0.5);
    dcLabel.position.set(dcX + 18, dcY + 66);
    discPileC.addChild(dcLabel);
    discPileC.eventMode = "static";
    discPileC.cursor = "pointer";
    discPileC.on("pointerdown", () => this.onDeckView?.());
    this._uiLayer.addChild(discPileC);

    // ── Enemy turn screen tint ──
    if (!combat.isPlayerTurn) {
      const turnTint = new Graphics();
      turnTint.rect(0, 0, SW, SH);
      turnTint.fill({ color: 0x220000, alpha: 0.08 });
      this._uiLayer.addChildAt(turnTint, 0);
    }

    // ── Player status effect badges (near knight) ──
    let psX = 14;
    const psY = 370;
    for (const [effId, amount] of combat.playerEffects) {
      if (amount <= 0) continue;
      const info = EFFECT_LABELS[effId as StatusEffectId];
      if (!info) continue;
      const badge = new Graphics();
      badge.roundRect(psX, psY, 34, 18, 4);
      badge.fill({ color: 0x0c0c1a, alpha: 0.9 });
      badge.roundRect(psX, psY, 34, 18, 4);
      badge.stroke({ color: info.color, width: 1, alpha: 0.7 });
      this._uiLayer.addChild(badge);
      const eTxt3 = new Text({ text: `${info.short}${amount}`, style: mkStyle(8, info.color, true) });
      eTxt3.position.set(psX + 3, psY + 3);
      this._uiLayer.addChild(eTxt3);
      psX += 36;
      if (psX > 160) { psX = 14; /* wrap not needed at this count */ }
    }

    // ── Purity ──
    const purityColor = run.purity >= 75 ? COL.PURITY_HOLY : run.purity <= 25 ? COL.PURITY_DARK : COL.PURITY_NEUT;
    const purTxt = new Text({ text: `Purity ${run.purity}`, style: mkStyle(10, purityColor) });
    purTxt.position.set(SW - 90, 10);
    this._uiLayer.addChild(purTxt);

    // ── Gold ──
    const goldTxt = new Text({ text: `${run.gold}g`, style: mkStyle(10, COL.GOLD, true) });
    goldTxt.position.set(SW - 90, 26);
    this._uiLayer.addChild(goldTxt);

    // ── Combat log ──
    const logEntries = combat.log.slice(-4);
    for (let i = 0; i < logEntries.length; i++) {
      const lTxt = new Text({ text: logEntries[i], style: sLog });
      lTxt.alpha = 0.5 + (i / logEntries.length) * 0.5;
      lTxt.position.set(SW - 260, SH - 140 + i * 14);
      this._uiLayer.addChild(lTxt);
    }
  }

  // ── Floating damage numbers ──────────────────────────────────────────────

  spawnDamageNumber(x: number, y: number, amount: number, type: "damage" | "heal" | "block"): void {
    // Scale font size with amount for big hits
    const isBigHit = amount >= 20;
    const fontSize = isBigHit ? 22 : amount >= 10 ? 18 : 16;
    const color = type === "damage" ? (isBigHit ? 0xff2222 : 0xff4444) : type === "heal" ? 0x44ff66 : 0x66aaff;
    const style = mkStyle(fontSize, color, true, true);
    const prefix = type === "damage" ? "-" : "+";
    const txt = new Text({ text: `${prefix}${amount}`, style });
    txt.anchor.set(0.5);
    txt.position.set(x + (Math.random() - 0.5) * 24, y);
    txt.scale.set(0.3);
    this._fxLayer.addChild(txt);

    const peakScale = isBigHit ? 1.5 : 1.2;
    gsap.to(txt.scale, { x: peakScale, y: peakScale, duration: 0.15, ease: "back.out(3)" });
    gsap.to(txt, { y: y - (isBigHit ? 55 : 40), duration: 0.9, ease: "power2.out" });
    gsap.to(txt, { alpha: 0, duration: 0.4, delay: 0.55, ease: "power2.in", onComplete: () => {
      this._fxLayer.removeChild(txt);
    }});

    // Big hit: additional screen emphasis
    if (isBigHit && type === "damage") {
      const bang = new Text({ text: "!", style: mkStyle(28, 0xffcc00, true, true) });
      bang.anchor.set(0.5);
      bang.position.set(x + 20, y - 10);
      bang.alpha = 0;
      this._fxLayer.addChild(bang);
      gsap.to(bang, { alpha: 1, duration: 0.1 });
      gsap.to(bang, { y: y - 50, alpha: 0, duration: 0.5, delay: 0.1, ease: "power2.out", onComplete: () => {
        this._fxLayer.removeChild(bang);
      }});
    }
  }

  // ── Card play flash ──────────────────────────────────────────────────────

  spawnCardFlash(x: number, y: number, color: number): void {
    // Core flash
    const flash = new Graphics();
    flash.circle(0, 0, 10);
    flash.fill({ color, alpha: 0.5 });
    flash.position.set(x, y);
    this._fxLayer.addChild(flash);
    gsap.to(flash.scale, { x: 5, y: 5, duration: 0.35, ease: "power2.out" });
    gsap.to(flash, { alpha: 0, duration: 0.35, onComplete: () => { this._fxLayer.removeChild(flash); }});

    // Expanding ring
    const ring = new Graphics();
    ring.circle(0, 0, 12);
    ring.stroke({ color, width: 2, alpha: 0.7 });
    ring.position.set(x, y);
    this._fxLayer.addChild(ring);
    gsap.to(ring.scale, { x: 4, y: 4, duration: 0.4, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.4, onComplete: () => { this._fxLayer.removeChild(ring); }});

    // Radial rays
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const ray = new Graphics();
      ray.moveTo(0, 0);
      ray.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
      ray.stroke({ color, width: 2, alpha: 0.6 });
      ray.position.set(x, y);
      this._fxLayer.addChild(ray);
      gsap.to(ray.scale, { x: 3, y: 3, duration: 0.3, ease: "power2.out" });
      gsap.to(ray, { alpha: 0, duration: 0.3, onComplete: () => { this._fxLayer.removeChild(ray); }});
    }
  }

  // ── Hit sparks (red particles radiating outward) ─────────────────────────

  spawnHitSparks(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 20 + Math.random() * 30;
      const spark = new Graphics();
      spark.circle(0, 0, 2 + Math.random() * 2);
      spark.fill({ color: [0xff4444, 0xff8844, 0xffcc44][i % 3], alpha: 0.9 });
      spark.position.set(x, y);
      this._fxLayer.addChild(spark);

      gsap.to(spark, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        duration: 0.3 + Math.random() * 0.2,
        ease: "power2.out",
      });
      gsap.to(spark, { alpha: 0, duration: 0.3, delay: 0.15, onComplete: () => {
        this._fxLayer.removeChild(spark);
      }});
    }
  }

  // ── Heal particles (green motes floating up) ────────────────────────────

  spawnHealParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const mote = new Graphics();
      mote.circle(0, 0, 2);
      mote.fill({ color: [0x44ff66, 0x88ffaa, 0xaaffcc][i % 3], alpha: 0.8 });
      mote.position.set(x + (Math.random() - 0.5) * 40, y);
      this._fxLayer.addChild(mote);

      gsap.to(mote, {
        y: y - 30 - Math.random() * 30,
        x: mote.x + (Math.random() - 0.5) * 20,
        duration: 0.6 + Math.random() * 0.3,
        ease: "power2.out",
      });
      gsap.to(mote, { alpha: 0, duration: 0.4, delay: 0.3, onComplete: () => {
        this._fxLayer.removeChild(mote);
      }});
    }
  }

  // ── Enemy attack flash (red pulse) ──────────────────────────────────────

  spawnEnemyAttackFlash(x: number, y: number): void {
    const flash = new Graphics();
    flash.circle(0, 0, 12);
    flash.fill({ color: 0xff2222, alpha: 0.5 });
    flash.position.set(x, y);
    this._fxLayer.addChild(flash);

    gsap.to(flash.scale, { x: 3, y: 3, duration: 0.25, ease: "power2.out" });
    gsap.to(flash, { alpha: 0, duration: 0.25, onComplete: () => {
      this._fxLayer.removeChild(flash);
    }});
  }

  // ── Screen shake ────────────────────────────────────────────────────────

  spawnScreenShake(): void {
    const orig = { x: this.container.x, y: this.container.y };
    gsap.to(this.container, {
      x: orig.x + 6, duration: 0.04, yoyo: true, repeat: 5, ease: "none",
      onComplete: () => { this.container.x = orig.x; this.container.y = orig.y; },
    });
    gsap.to(this.container, {
      y: orig.y + 4, duration: 0.05, yoyo: true, repeat: 3, ease: "none",
    });
  }

  // ── Death burst (enemy dies — expanding ring + particles) ───────────────

  spawnDeathBurst(x: number, y: number): void {
    // Ring
    const ring = new Graphics();
    ring.circle(0, 0, 10);
    ring.stroke({ color: 0xff6644, width: 2, alpha: 0.8 });
    ring.position.set(x, y);
    this._fxLayer.addChild(ring);
    gsap.to(ring.scale, { x: 5, y: 5, duration: 0.5, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(ring); }});

    // Flash
    const flash = new Graphics();
    flash.circle(0, 0, 15);
    flash.fill({ color: 0xffffff, alpha: 0.4 });
    flash.position.set(x, y);
    this._fxLayer.addChild(flash);
    gsap.to(flash.scale, { x: 3, y: 3, duration: 0.3, ease: "power2.out" });
    gsap.to(flash, { alpha: 0, duration: 0.3, onComplete: () => { this._fxLayer.removeChild(flash); }});

    // Debris particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const p = new Graphics();
      p.rect(-2, -2, 4, 4);
      p.fill({ color: [0xff6644, 0xcc4422, 0x884422, 0xffaa44][i % 4] });
      p.position.set(x, y);
      this._fxLayer.addChild(p);

      gsap.to(p, {
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed + 20, // slight gravity
        rotation: Math.random() * 4,
        duration: 0.5 + Math.random() * 0.3,
        ease: "power2.out",
      });
      gsap.to(p, { alpha: 0, duration: 0.3, delay: 0.3, onComplete: () => {
        this._fxLayer.removeChild(p);
      }});
    }
  }

  // ── Attack arc (beam from knight sword to target enemy) ──────────────────

  spawnAttackArc(targetX: number, targetY: number, color: number): void {
    // Knight sword tip position
    const kx = 69;
    const ky = 251;
    const arc = new Graphics();

    // Curved beam
    const midX = (kx + targetX) / 2;
    const midY = Math.min(ky, targetY) - 40;
    arc.moveTo(kx, ky);
    arc.quadraticCurveTo(midX, midY, targetX, targetY);
    arc.stroke({ color, width: 3, alpha: 0.6 });
    // Bright core
    arc.moveTo(kx, ky);
    arc.quadraticCurveTo(midX, midY, targetX, targetY);
    arc.stroke({ color: 0xffffff, width: 1.2, alpha: 0.3 });

    this._fxLayer.addChild(arc);
    gsap.to(arc, { alpha: 0, duration: 0.35, delay: 0.05, ease: "power2.in", onComplete: () => {
      this._fxLayer.removeChild(arc);
    }});

    // Trailing particles along the arc
    for (let t = 0; t < 5; t++) {
      const frac = t / 5;
      const px = kx + (midX - kx) * 2 * frac * (1 - frac) + (targetX - kx) * frac * frac;
      const py = ky + (midY - ky) * 2 * frac * (1 - frac) + (targetY - ky) * frac * frac;
      const spark = new Graphics();
      spark.circle(0, 0, 2);
      spark.fill({ color, alpha: 0.7 });
      spark.position.set(px, py);
      this._fxLayer.addChild(spark);
      gsap.to(spark, { alpha: 0, duration: 0.25, delay: t * 0.04, onComplete: () => {
        this._fxLayer.removeChild(spark);
      }});
    }
  }

  // ── Death stain (lingering shadow after enemy dies) ─────────────────────

  spawnDeathStain(x: number, y: number): void {
    const stain = new Graphics();
    // Dark scorch mark
    stain.ellipse(x, y + 10, 25, 8);
    stain.fill({ color: 0x110808, alpha: 0.35 });
    stain.ellipse(x, y + 10, 18, 5);
    stain.fill({ color: 0x1a0808, alpha: 0.25 });
    // Wisps rising
    for (let i = 0; i < 3; i++) {
      const wx = x + (i - 1) * 10;
      stain.moveTo(wx, y + 6);
      stain.quadraticCurveTo(wx + (Math.random() - 0.5) * 8, y - 10, wx + (Math.random() - 0.5) * 6, y - 18);
      stain.stroke({ color: 0x442222, width: 1.5, alpha: 0.2 });
    }
    this._fxLayer.addChild(stain);

    // Fade out slowly
    gsap.to(stain, { alpha: 0, duration: 2.5, delay: 0.5, ease: "power1.in", onComplete: () => {
      this._fxLayer.removeChild(stain);
    }});
  }

  // ── Torch flare (brighten scene on big hits) ────────────────────────────

  spawnTorchFlare(): void {
    // Bright flash at both torch positions
    for (const tx of [60, SW - 60]) {
      const flare = new Graphics();
      flare.circle(tx, 115, 30);
      flare.fill({ color: 0xffaa44, alpha: 0.2 });
      flare.circle(tx, 115, 18);
      flare.fill({ color: 0xffcc66, alpha: 0.15 });
      this._fxLayer.addChild(flare);
      gsap.to(flare, { alpha: 0, duration: 0.4, ease: "power2.out", onComplete: () => {
        this._fxLayer.removeChild(flare);
      }});
    }
    // Brief global warm tint
    const warmTint = new Graphics();
    warmTint.rect(0, 0, SW, SH);
    warmTint.fill({ color: 0xff8844, alpha: 0.03 });
    this._fxLayer.addChild(warmTint);
    gsap.to(warmTint, { alpha: 0, duration: 0.3, onComplete: () => {
      this._fxLayer.removeChild(warmTint);
    }});
  }

  // ── Status effect glyph (brief icon at position) ────────────────────────

  spawnEffectGlyph(x: number, y: number, effectId: StatusEffectId): void {
    const info = EFFECT_LABELS[effectId];
    if (!info) return;
    const txt = new Text({ text: info.short, style: mkStyle(10, info.color, true, true) });
    txt.anchor.set(0.5);
    txt.position.set(x + (Math.random() - 0.5) * 16, y);
    txt.alpha = 0;
    this._fxLayer.addChild(txt);

    gsap.to(txt, { alpha: 1, y: y - 16, duration: 0.2, ease: "power2.out" });
    gsap.to(txt, { alpha: 0, y: y - 32, duration: 0.4, delay: 0.4, ease: "power2.in", onComplete: () => {
      this._fxLayer.removeChild(txt);
    }});
  }

  // ── Turn banner ("YOUR TURN" / "ENEMY TURN") ───────────────────────────

  showTurnBanner(text: string, color: number): void {
    const banner = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 240, 40);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    banner.addChild(bg);
    const txt = new Text({ text, style: mkStyle(16, color, true, true) });
    txt.anchor.set(0.5);
    txt.position.set(120, 20);
    banner.addChild(txt);
    banner.position.set(SW / 2 - 120, SH / 2 - 80);
    banner.alpha = 0;
    this._fxLayer.addChild(banner);

    gsap.to(banner, { alpha: 1, duration: 0.15, ease: "power2.out" });
    gsap.to(banner, { alpha: 0, duration: 0.3, delay: 0.6, ease: "power2.in", onComplete: () => {
      this._fxLayer.removeChild(banner);
    }});
  }

  destroy(): void {
    gsap.killTweensOf(this.container);
    // Kill all ambient particle tweens
    for (const child of this._ambientLayer.children) gsap.killTweensOf(child);
    this.container.removeChildren();
    this._bgLayer.removeChildren();
    this._ambientLayer.removeChildren();
    this._enemyLayer.removeChildren();
    this._handLayer.removeChildren();
    this._uiLayer.removeChildren();
    this._fxLayer.removeChildren();
    this._cardViews = [];
  }
}
