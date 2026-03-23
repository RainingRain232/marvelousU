// ---------------------------------------------------------------------------
// Round Table – Card View (rich procedural card art with gradients & glow)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { CardInstance, CardType, CardRarity, CardDef } from "../types";
import { getCardDef } from "../config/RoundTableCards";

const CARD_W = 120;
const CARD_H = 174;
const INNER_PAD = 4;
const ART_H = 52; // illustration area height (balanced for text room)

// ── Palette ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, [number, number]> = {
  //                          base        highlight
  [CardType.STRIKE]:    [0x8b1a1a, 0xcc4444],
  [CardType.GUARD]:     [0x1a3a6b, 0x4477bb],
  [CardType.SPELL]:     [0x4a1a6b, 0x8844bb],
  [CardType.VIRTUE]:    [0x6b5a1a, 0xccaa44],
  [CardType.SIN]:       [0x3a0a1a, 0x882244],
  [CardType.COMPANION]: [0x1a4a2a, 0x44aa66],
  [CardType.CURSE]:     [0x1a1a1a, 0x444444],
  [CardType.STATUS]:    [0x2a2a2a, 0x555555],
};

const RARITY_BORDER: Record<string, number> = {
  [CardRarity.STARTER]: 0x777777,
  [CardRarity.COMMON]:  0x999999,
  [CardRarity.UNCOMMON]: 0x4488ff,
  [CardRarity.RARE]:     0xffaa00,
  [CardRarity.CURSE]:    0x550055,
};

const RARITY_GLOW: Record<string, number> = {
  [CardRarity.UNCOMMON]: 0x2244aa,
  [CardRarity.RARE]:     0xaa6600,
};

// ── Text styles ────────────────────────────────────────────────────────────

const nameStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.6 },
});
const costStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, blur: 3, distance: 0, alpha: 0.9 },
});
const descStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 9, fill: 0xcccccc, wordWrap: true, wordWrapWidth: CARD_W - 20,
  lineHeight: 12,
});
const typeStyle = new TextStyle({ fontFamily: "monospace", fontSize: 8, fill: 0x999999 });
const dmgStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xff6644, fontWeight: "bold",
  dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.7 },
});
const blkStyle = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x44aaff, fontWeight: "bold",
  dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.7 },
});

// ── Card Art Icon Generators ───────────────────────────────────────────────

function drawCardArt(g: Graphics, def: CardDef, cx: number, cy: number): void {
  const colors = TYPE_COLORS[def.type] ?? [0x444444, 0x888888];
  const hi = colors[1];
  const S = 1.3; // scale multiplier for larger art

  switch (def.type) {
    case CardType.STRIKE:
      // Large sword
      g.moveTo(cx - 3 * S, cy - 22 * S);
      g.lineTo(cx - 3 * S, cy + 10 * S);
      g.lineTo(cx + 3 * S, cy + 10 * S);
      g.lineTo(cx + 3 * S, cy - 22 * S);
      g.lineTo(cx, cy - 28 * S); // blade tip
      g.closePath();
      g.fill({ color: 0xccccdd });
      // Blade edge highlight
      g.moveTo(cx + 1, cy - 26 * S);
      g.lineTo(cx + 2 * S, cy + 8 * S);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.35 });
      // Crossguard
      g.rect(cx - 12 * S, cy + 8 * S, 24 * S, 5 * S);
      g.fill({ color: 0x8b6914 });
      g.rect(cx - 12 * S, cy + 8 * S, 24 * S, 5 * S);
      g.stroke({ color: 0xaa8844, width: 1 });
      // Grip
      g.rect(cx - 2 * S, cy + 13 * S, 4 * S, 8 * S);
      g.fill({ color: 0x5d3a1a });
      // Pommel
      g.circle(cx, cy + 22 * S, 4 * S);
      g.fill({ color: 0xffd700 });
      g.circle(cx, cy + 22 * S, 4 * S);
      g.stroke({ color: 0xffee88, width: 0.8 });
      break;

    case CardType.GUARD:
      // Large kite shield
      g.moveTo(cx, cy - 20 * S);
      g.lineTo(cx + 18 * S, cy - 10 * S);
      g.lineTo(cx + 16 * S, cy + 10 * S);
      g.lineTo(cx, cy + 22 * S);
      g.lineTo(cx - 16 * S, cy + 10 * S);
      g.lineTo(cx - 18 * S, cy - 10 * S);
      g.closePath();
      g.fill({ color: 0x3366aa, alpha: 0.9 });
      g.stroke({ color: 0x6699cc, width: 2.5 });
      // Shield boss (center circle)
      g.circle(cx, cy, 6 * S);
      g.fill({ color: 0x5588cc, alpha: 0.5 });
      g.circle(cx, cy, 6 * S);
      g.stroke({ color: 0x88aadd, width: 1.5 });
      // Cross emblem
      g.rect(cx - 2, cy - 10 * S, 4, 20 * S);
      g.fill({ color: 0xdddddd, alpha: 0.5 });
      g.rect(cx - 8 * S, cy - 2, 16 * S, 4);
      g.fill({ color: 0xdddddd, alpha: 0.5 });
      break;

    case CardType.SPELL:
      // Magic starburst (larger)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 18 * S : 7 * S;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color: hi, alpha: 0.7 });
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
      // Core glow rings
      g.circle(cx, cy, 8 * S);
      g.fill({ color: 0xffffff, alpha: 0.15 });
      g.circle(cx, cy, 5 * S);
      g.fill({ color: 0xffffff, alpha: 0.4 });
      g.circle(cx, cy, 3 * S);
      g.fill({ color: 0xffffff, alpha: 0.8 });
      // Orbiting dots
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.circle(cx + Math.cos(a) * 14 * S, cy + Math.sin(a) * 14 * S, 2);
        g.fill({ color: hi, alpha: 0.5 });
      }
      break;

    case CardType.VIRTUE:
      // Holy chalice (enlarged)
      g.moveTo(cx - 10 * S, cy - 6 * S);
      g.lineTo(cx - 8 * S, cy + 10 * S);
      g.lineTo(cx + 8 * S, cy + 10 * S);
      g.lineTo(cx + 10 * S, cy - 6 * S);
      g.closePath();
      g.fill({ color: 0xffd700, alpha: 0.9 });
      g.stroke({ color: 0xffee88, width: 1.5 });
      // Stem
      g.rect(cx - 2.5 * S, cy + 10 * S, 5 * S, 8 * S);
      g.fill({ color: 0xddbb44 });
      // Base
      g.ellipse(cx, cy + 19 * S, 10 * S, 4 * S);
      g.fill({ color: 0xddbb44 });
      // Light rays (6 rays)
      for (let i = 0; i < 7; i++) {
        const angle = (-Math.PI * 0.85) + (i / 6) * Math.PI * 0.7;
        g.moveTo(cx, cy - 8 * S);
        g.lineTo(cx + Math.cos(angle) * 22 * S, cy - 8 * S + Math.sin(angle) * 22 * S);
        g.stroke({ color: 0xffee88, width: 1.5, alpha: 0.3 });
      }
      break;

    case CardType.SIN:
      // Horned skull (enlarged)
      g.circle(cx, cy + 2, 13 * S);
      g.fill({ color: 0x442222, alpha: 0.9 });
      g.circle(cx, cy + 2, 13 * S);
      g.stroke({ color: 0x663333, width: 1.5 });
      // Eyes (glowing)
      g.circle(cx - 5 * S, cy, 3 * S);
      g.fill({ color: 0xff2222, alpha: 0.9 });
      g.circle(cx + 5 * S, cy, 3 * S);
      g.fill({ color: 0xff2222, alpha: 0.9 });
      // Eye glow
      g.circle(cx - 5 * S, cy, 5 * S);
      g.fill({ color: 0xff0000, alpha: 0.15 });
      g.circle(cx + 5 * S, cy, 5 * S);
      g.fill({ color: 0xff0000, alpha: 0.15 });
      // Horns (larger, curved)
      g.moveTo(cx - 10 * S, cy - 8 * S);
      g.quadraticCurveTo(cx - 18 * S, cy - 26 * S, cx - 8 * S, cy - 18 * S);
      g.stroke({ color: 0x664433, width: 3 });
      g.moveTo(cx + 10 * S, cy - 8 * S);
      g.quadraticCurveTo(cx + 18 * S, cy - 26 * S, cx + 8 * S, cy - 18 * S);
      g.stroke({ color: 0x664433, width: 3 });
      // Nose hole
      g.ellipse(cx, cy + 6 * S, 3 * S, 2 * S);
      g.fill({ color: 0x221111 });
      break;

    case CardType.COMPANION:
      // Squire (more detailed)
      // Body
      g.roundRect(cx - 8 * S, cy - 2 * S, 16 * S, 20 * S, 4);
      g.fill({ color: 0x558866 });
      // Head
      g.circle(cx, cy - 8 * S, 8 * S);
      g.fill({ color: 0x66aa77 });
      g.circle(cx, cy - 8 * S, 8 * S);
      g.stroke({ color: 0x77bb88, width: 1.5 });
      // Legs
      g.rect(cx - 6 * S, cy + 16 * S, 4 * S, 10 * S);
      g.fill({ color: 0x446655 });
      g.rect(cx + 2 * S, cy + 16 * S, 4 * S, 10 * S);
      g.fill({ color: 0x446655 });
      // Sword on back
      g.moveTo(cx + 6 * S, cy - 18 * S);
      g.lineTo(cx + 8 * S, cy + 12 * S);
      g.stroke({ color: 0xccccdd, width: 2.5 });
      g.rect(cx + 4 * S, cy + 10 * S, 8 * S, 3);
      g.fill({ color: 0x8b6914 });
      break;

    case CardType.CURSE:
    case CardType.STATUS:
      // Cursed sigil (larger, more elaborate)
      g.circle(cx, cy, 16 * S);
      g.stroke({ color: 0x660066, width: 2.5, alpha: 0.7 });
      g.circle(cx, cy, 10 * S);
      g.stroke({ color: 0x880044, width: 1.5, alpha: 0.4 });
      g.moveTo(cx - 12 * S, cy - 12 * S);
      g.lineTo(cx + 12 * S, cy + 12 * S);
      g.stroke({ color: 0x880044, width: 2.5, alpha: 0.6 });
      g.moveTo(cx + 12 * S, cy - 12 * S);
      g.lineTo(cx - 12 * S, cy + 12 * S);
      g.stroke({ color: 0x880044, width: 2.5, alpha: 0.6 });
      // Dripping effect
      for (let i = 0; i < 3; i++) {
        const dx = cx - 8 + i * 8;
        g.moveTo(dx, cy + 14 * S);
        g.quadraticCurveTo(dx + 1, cy + 20 * S, dx, cy + 22 * S);
        g.stroke({ color: 0x660044, width: 1.5, alpha: 0.4 });
      }
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════

export class RoundTableCardView {
  container = new Container();
  cardUid: number;
  playable = false;
  private _highlight = new Graphics();


  constructor(card: CardInstance, playable: boolean) {
    this.cardUid = card.uid;
    this.playable = playable;
    const def = getCardDef(card.defId);
    const colors = TYPE_COLORS[def.type] ?? [0x444444, 0x888888];
    const [base, hi] = colors;
    const borderColor = RARITY_BORDER[def.rarity] ?? 0x888888;
    const glowColor = RARITY_GLOW[def.rarity];

    // ── Outer glow (rare/uncommon) ──
    if (glowColor && playable) {
      const glow = new Graphics();
      glow.roundRect(-4, -4, CARD_W + 8, CARD_H + 8, 10);
      glow.fill({ color: glowColor, alpha: 0.15 });
      glow.roundRect(-2, -2, CARD_W + 4, CARD_H + 4, 8);
      glow.fill({ color: glowColor, alpha: 0.1 });
      this.container.addChild(glow);
    }

    // ── Card body (gradient simulated with layered rects) ──
    const body = new Graphics();
    // Dark base
    body.roundRect(0, 0, CARD_W, CARD_H, 7);
    body.fill({ color: 0x0c0c14, alpha: 0.95 });
    // Color wash (top half darker, bottom lighter)
    body.roundRect(1, 1, CARD_W - 2, CARD_H / 2, 6);
    body.fill({ color: base, alpha: 0.5 });
    body.roundRect(1, CARD_H * 0.4, CARD_W - 2, CARD_H * 0.6 - 1, 6);
    body.fill({ color: base, alpha: 0.25 });
    // Border
    body.roundRect(0, 0, CARD_W, CARD_H, 7);
    body.stroke({ color: borderColor, width: 1.5, alpha: 0.9 });
    this.container.addChild(body);

    // ── Inner frame ──
    const frame = new Graphics();
    frame.roundRect(INNER_PAD, 32, CARD_W - INNER_PAD * 2, ART_H, 4);
    frame.fill({ color: base, alpha: 0.35 });
    frame.roundRect(INNER_PAD, 32, CARD_W - INNER_PAD * 2, ART_H, 4);
    frame.stroke({ color: hi, width: 0.8, alpha: 0.4 });
    this.container.addChild(frame);

    // ── Card art (procedural icon) ──
    const artGfx = new Graphics();
    drawCardArt(artGfx, def, CARD_W / 2, 32 + ART_H / 2);
    this.container.addChild(artGfx);

    // ── Separator line ──
    const sep = new Graphics();
    sep.moveTo(INNER_PAD + 4, 86);
    sep.lineTo(CARD_W - INNER_PAD - 4, 86);
    sep.stroke({ color: hi, width: 0.6, alpha: 0.4 });
    this.container.addChild(sep);

    // ── Cost orb (top-left) ──
    if (def.cost >= 0) {
      const orbSize = 15;
      const orbX = 14;
      const orbY = 14;
      const orb = new Graphics();
      // Outer ring
      orb.circle(orbX, orbY, orbSize);
      orb.fill({ color: 0x0a0a2a, alpha: 0.95 });
      orb.circle(orbX, orbY, orbSize);
      orb.stroke({ color: 0x6688cc, width: 1.8 });
      // Inner glow
      orb.circle(orbX, orbY, orbSize - 3);
      orb.fill({ color: 0x1a1a44, alpha: 0.6 });
      this.container.addChild(orb);
      const cTxt = new Text({ text: `${def.cost}`, style: costStyle });
      cTxt.anchor.set(0.5);
      cTxt.position.set(orbX, orbY);
      this.container.addChild(cTxt);
    }

    // ── Name banner ──
    const banner = new Graphics();
    banner.rect(INNER_PAD, 2, CARD_W - INNER_PAD * 2, 26);
    banner.fill({ color: 0x000000, alpha: 0.3 });
    this.container.addChild(banner);
    const nTxt = new Text({ text: def.name, style: nameStyle });
    nTxt.position.set(32, 7);
    this.container.addChild(nTxt);

    // ── Type label ──
    const tTxt = new Text({ text: def.type.toUpperCase(), style: typeStyle });
    tTxt.anchor.set(1, 0);
    tTxt.position.set(CARD_W - INNER_PAD - 2, 88);
    this.container.addChild(tTxt);

    // ── Description text ──
    const dTxt = new Text({ text: def.description, style: descStyle });
    dTxt.position.set(10, 100);
    this.container.addChild(dTxt);

    // ── Stat badges (damage / block) ──
    let badgeX = 8;
    const badgeY = CARD_H - 20;
    if (def.damage > 0) {
      const dt = new Text({ text: `${def.damage}${def.hits > 1 ? "x" + def.hits : ""}`, style: dmgStyle });
      dt.position.set(badgeX, badgeY);
      this.container.addChild(dt);
      // Tiny sword icon
      const si = new Graphics();
      si.moveTo(badgeX + dt.width + 4, badgeY + 2);
      si.lineTo(badgeX + dt.width + 4, badgeY + 12);
      si.stroke({ color: 0xff6644, width: 1.5 });
      this.container.addChild(si);
      badgeX += dt.width + 12;
    }
    if (def.block > 0) {
      const bt = new Text({ text: `${def.block}`, style: blkStyle });
      bt.position.set(badgeX, badgeY);
      this.container.addChild(bt);
      // Tiny shield icon
      const si = new Graphics();
      si.circle(badgeX + bt.width + 6, badgeY + 7, 5);
      si.stroke({ color: 0x44aaff, width: 1.2 });
      this.container.addChild(si);
    }

    // ── Rarity gem (bottom-center) ──
    if (def.rarity !== CardRarity.STARTER && def.rarity !== CardRarity.CURSE) {
      const gemX = CARD_W / 2;
      const gemY = CARD_H - 6;
      const gem = new Graphics();
      // Diamond shape
      gem.moveTo(gemX, gemY - 5);
      gem.lineTo(gemX + 4, gemY);
      gem.lineTo(gemX, gemY + 5);
      gem.lineTo(gemX - 4, gemY);
      gem.closePath();
      gem.fill({ color: borderColor, alpha: 0.9 });
      gem.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });
      this.container.addChild(gem);
    }

    // ── Highlight (hover) ──
    this._highlight.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 9);
    this._highlight.stroke({ color: 0xffee66, width: 2.5, alpha: 0.85 });
    this._highlight.roundRect(-1, -1, CARD_W + 2, CARD_H + 2, 8);
    this._highlight.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    this._highlight.visible = false;
    this.container.addChild(this._highlight);

    // ── Unplayable dim ──
    if (!playable) {
      const dim = new Graphics();
      dim.roundRect(0, 0, CARD_W, CARD_H, 7);
      dim.fill({ color: 0x000000, alpha: 0.45 });
      this.container.addChild(dim);
    }

    this.container.eventMode = "static";
    this.container.cursor = playable ? "pointer" : "default";
  }

  private _baseY = 0;
  private _hovering = false;

  /** Call once after positioning to record base Y for tween targets. */
  recordBaseY(): void {
    this._baseY = this.container.y;
  }

  setHighlight(on: boolean): void {
    if (on === this._hovering) return;
    this._hovering = on;
    this._highlight.visible = on;

    gsap.killTweensOf(this.container);
    gsap.killTweensOf(this.container.scale);

    if (on) {
      gsap.to(this.container, { y: this._baseY - 14, duration: 0.15, ease: "back.out(2)" });
      gsap.to(this.container.scale, { x: 1.08, y: 1.08, duration: 0.15, ease: "power2.out" });
    } else {
      gsap.to(this.container, { y: this._baseY, duration: 0.12, ease: "power2.out" });
      gsap.to(this.container.scale, { x: 1.0, y: 1.0, duration: 0.12, ease: "power2.out" });
    }
  }

  static readonly WIDTH = CARD_W;
  static readonly HEIGHT = CARD_H;
}
