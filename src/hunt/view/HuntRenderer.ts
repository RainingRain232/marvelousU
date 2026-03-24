// ---------------------------------------------------------------------------
// Hunt mode — forest scene + entity renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { HuntState } from "../state/HuntState";
import { PREY, HuntConfig } from "../config/HuntConfig";

const FONT = "Georgia, serif";
const COL = 0x88aa44;

export class HuntRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _ui = new Container();

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    const bg = new Graphics();
    // Forest floor gradient
    bg.rect(0, 0, sw, sh).fill({ color: 0x1a2a1a });
    for (let gy = 0; gy < sh; gy += 4) {
      bg.moveTo(0, gy).lineTo(sw, gy).stroke({ color: gy < sh * 0.7 ? 0x1e2e1e : 0x182818, width: 1, alpha: 0.05 });
    }
    // Scattered trees (background)
    for (let ti = 0; ti < 30; ti++) {
      const tx = (ti * 7919 % sw), ty = (ti * 4813 % (sh * 0.7));
      const tr = 6 + (ti * 3571 % 8);
      bg.circle(tx, ty, tr).fill({ color: 0x1a3a1a, alpha: 0.3 });
      bg.circle(tx, ty, tr * 0.6).fill({ color: 0x1e3e1e, alpha: 0.2 });
      // Trunk
      bg.rect(tx - 1, ty + tr - 2, 2, 4).fill({ color: 0x2a1a0a, alpha: 0.2 });
    }
    // Grass patches
    for (let gi = 0; gi < 40; gi++) {
      const gx = (gi * 6271 % sw), gy2 = (gi * 3413 % sh);
      bg.moveTo(gx, gy2).bezierCurveTo(gx + 1, gy2 - 4, gx - 1, gy2 - 6, gx + 2, gy2 - 8).stroke({ color: 0x2a4a2a, width: 0.5, alpha: 0.15 });
    }
    // Vignette
    for (let v = 0; v < 4; v++) {
      const i = v * 50;
      bg.rect(0, 0, i, sh).fill({ color: 0x000000, alpha: 0.03 });
      bg.rect(sw - i, 0, i, sh).fill({ color: 0x000000, alpha: 0.03 });
    }
    this.container.addChild(bg);
    this._gfx = new Graphics();
    this._ui = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._ui);
  }

  draw(state: HuntState, sw: number, sh: number): void {
    this._gfx.clear();
    while (this._ui.children.length > 0) this._ui.removeChildAt(0);
    const g = this._gfx;
    const ox = (sw - HuntConfig.FIELD_WIDTH) / 2, oy = 50;

    // Field border
    g.roundRect(ox - 2, oy - 2, HuntConfig.FIELD_WIDTH + 4, HuntConfig.FIELD_HEIGHT + 4, 4).stroke({ color: COL, width: 1, alpha: 0.2 });

    // Draw water zones
    for (const water of state.waterZones) {
      g.roundRect(ox + water.x, oy + water.y, water.w, water.h, 6).fill({ color: 0x2244aa, alpha: 0.25 });
      g.roundRect(ox + water.x, oy + water.y, water.w, water.h, 6).stroke({ color: 0x4466cc, width: 0.8, alpha: 0.2 });
      // Ripple lines
      for (let ri = 0; ri < 3; ri++) {
        const ry = water.y + 5 + ri * (water.h / 3);
        g.moveTo(ox + water.x + 4, oy + ry).bezierCurveTo(ox + water.x + water.w * 0.3, oy + ry - 2, ox + water.x + water.w * 0.7, oy + ry + 2, ox + water.x + water.w - 4, oy + ry).stroke({ color: 0x5577cc, width: 0.4, alpha: 0.15 });
      }
    }

    // Draw brush zones
    for (const brush of state.brushZones) {
      g.roundRect(ox + brush.x, oy + brush.y, brush.w, brush.h, 4).fill({ color: 0x2a4a1a, alpha: 0.3 });
      // Grass blade detail
      for (let bi = 0; bi < 8; bi++) {
        const bx = ox + brush.x + 5 + Math.random() * (brush.w - 10);
        const by = oy + brush.y + brush.h - 3;
        g.moveTo(bx, by).bezierCurveTo(bx + 1, by - 6, bx - 1, by - 8, bx + 2, by - 10).stroke({ color: 0x3a5a2a, width: 0.5, alpha: 0.3 });
      }
    }

    // Draw ammo pickups
    for (const pickup of state.ammoPickups) {
      if (pickup.collected) continue;
      const apx = ox + pickup.x, apy = oy + pickup.y;
      const pulse = 0.4 + Math.sin(Date.now() / 400) * 0.2;
      g.circle(apx, apy, 6).fill({ color: 0xccaa66, alpha: pulse * 0.3 });
      g.circle(apx, apy, 4).fill({ color: 0xccaa66, alpha: pulse * 0.6 });
      // Arrow icon
      g.moveTo(apx - 3, apy + 2).lineTo(apx + 3, apy - 2).stroke({ color: 0xeedd88, width: 1, alpha: 0.5 });
      g.moveTo(apx + 2, apy - 2).lineTo(apx + 3, apy - 2).lineTo(apx + 3, apy - 1).stroke({ color: 0xeedd88, width: 0.8, alpha: 0.4 });
    }

    // Draw trees (obstacles)
    for (const tree of state.trees) {
      const tx = ox + tree.x, ty = oy + tree.y;
      // Trunk
      g.rect(tx - 2, ty + tree.r * 0.3, 4, tree.r * 0.5).fill({ color: 0x3a2a1a, alpha: 0.6 });
      // Canopy
      g.circle(tx, ty, tree.r).fill({ color: 0x1a4a1a, alpha: 0.5 });
      g.circle(tx - 2, ty - 2, tree.r * 0.7).fill({ color: 0x1e4e1e, alpha: 0.3 });
      g.circle(tx, ty, tree.r).stroke({ color: 0x2a5a2a, width: 0.5, alpha: 0.2 });
    }

    // Draw prey
    for (const prey of state.prey) {
      if (!prey.alive) continue;
      const def = PREY[prey.type];
      const px = ox + prey.x, py = oy + prey.y;
      const r = def.size;
      // Shadow
      g.ellipse(px + 1, py + r, r * 0.7, 2).fill({ color: 0x000000, alpha: 0.15 });
      // Body — ellipse with head
      g.ellipse(px, py, r * 1.2, r * 0.8).fill({ color: def.color });
      // Head
      const hx = px + Math.cos(prey.angle) * r, hy = py + Math.sin(prey.angle) * r;
      g.circle(hx, hy, r * 0.5).fill({ color: def.color });
      // Eye
      g.circle(hx + Math.cos(prey.angle) * 2, hy + Math.sin(prey.angle) * 2, 1).fill({ color: 0x111111 });
      // Startled indicator
      if (prey.startled) {
        g.moveTo(px, py - r - 4).lineTo(px, py - r - 9).stroke({ color: 0xff4444, width: 1.5 });
        g.circle(px, py - r - 11, 1).fill({ color: 0xff4444 });
      }
      // HP for multi-hp prey
      if (def.hp > 1 && prey.hp < def.hp) {
        g.rect(px - r, py - r - 4, r * 2, 2).fill({ color: 0x220000 });
        g.rect(px - r, py - r - 4, r * 2 * (prey.hp / def.hp), 2).fill({ color: 0x44cc44 });
      }
    }

    // Draw arrows
    for (const arrow of state.arrows) {
      const px = ox + arrow.x, py = oy + arrow.y;
      const angle = Math.atan2(arrow.vy, arrow.vx);
      // Arrow shaft
      g.moveTo(px - Math.cos(angle) * 8, py - Math.sin(angle) * 8).lineTo(px, py).stroke({ color: 0xccaa66, width: 1.5 });
      // Arrowhead
      g.moveTo(px, py).lineTo(px + Math.cos(angle) * 4, py + Math.sin(angle) * 4).stroke({ color: 0xaaaaaa, width: 2 });
      // Fletching
      g.moveTo(px - Math.cos(angle) * 8, py - Math.sin(angle) * 8).lineTo(px - Math.cos(angle) * 8 + Math.cos(angle + 0.5) * 3, py - Math.sin(angle) * 8 + Math.sin(angle + 0.5) * 3).stroke({ color: 0xff6644, width: 0.8 });
      g.moveTo(px - Math.cos(angle) * 8, py - Math.sin(angle) * 8).lineTo(px - Math.cos(angle) * 8 + Math.cos(angle - 0.5) * 3, py - Math.sin(angle) * 8 + Math.sin(angle - 0.5) * 3).stroke({ color: 0xff6644, width: 0.8 });
    }

    // Draw player (archer)
    const ppx = ox + state.playerX, ppy = oy + state.playerY;
    // Body
    g.ellipse(ppx, ppy, 5, 7).fill({ color: 0x446622 });
    g.circle(ppx, ppy - 8, 4).fill({ color: 0x446622 });
    // Bow
    const bowDist = 8;
    const bx = ppx + Math.cos(state.aimAngle) * bowDist;
    const by = ppy + Math.sin(state.aimAngle) * bowDist;
    g.moveTo(bx + Math.cos(state.aimAngle + 1) * 6, by + Math.sin(state.aimAngle + 1) * 6).bezierCurveTo(bx + Math.cos(state.aimAngle) * 4, by + Math.sin(state.aimAngle) * 4, bx + Math.cos(state.aimAngle) * 4, by + Math.sin(state.aimAngle) * 4, bx + Math.cos(state.aimAngle - 1) * 6, by + Math.sin(state.aimAngle - 1) * 6).stroke({ color: 0x6a4a2a, width: 2 });
    // Draw string (when drawing)
    if (state.drawProgress > 0) {
      const stringBack = bowDist - state.drawProgress * 6;
      const sx = ppx + Math.cos(state.aimAngle) * stringBack;
      const sy = ppy + Math.sin(state.aimAngle) * stringBack;
      g.moveTo(bx + Math.cos(state.aimAngle + 1) * 6, by + Math.sin(state.aimAngle + 1) * 6).lineTo(sx, sy).lineTo(bx + Math.cos(state.aimAngle - 1) * 6, by + Math.sin(state.aimAngle - 1) * 6).stroke({ color: 0xccccaa, width: 0.8 });
      // Power indicator — segmented arc meter
      const powerCol = state.drawProgress > 0.8 ? 0x44ff44 : state.drawProgress > 0.5 ? 0xffaa44 : 0xff6644;
      // Background arc
      const arcR = 10, arcCx = ppx, arcCy = ppy + 14;
      for (let ai = 0; ai < 8; ai++) {
        const a = Math.PI * 0.3 + ai * Math.PI * 0.4 / 8;
        const ax = arcCx + Math.cos(a) * arcR, ay = arcCy + Math.sin(a) * arcR;
        g.circle(ax, ay, 1).fill({ color: 0x333333, alpha: 0.3 });
      }
      // Filled segments
      const filledSegs = Math.floor(state.drawProgress * 8);
      for (let ai = 0; ai < filledSegs; ai++) {
        const a = Math.PI * 0.3 + ai * Math.PI * 0.4 / 8;
        const ax = arcCx + Math.cos(a) * arcR, ay = arcCy + Math.sin(a) * arcR;
        g.circle(ax, ay, 1.5).fill({ color: powerCol, alpha: 0.6 });
      }
      // Power percentage text
      g.circle(arcCx, arcCy, arcR + 2).stroke({ color: powerCol, width: 0.5, alpha: 0.15 });
      if (state.drawProgress > 0.8) g.circle(arcCx, arcCy, arcR + 3).fill({ color: powerCol, alpha: 0.04 });
    }
    // Aim line
    g.moveTo(ppx, ppy).lineTo(ppx + Math.cos(state.aimAngle) * 40, ppy + Math.sin(state.aimAngle) * 40).stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });

    // Particles
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      g.circle(ox + p.x, oy + p.y, p.size * lr).fill({ color: p.color, alpha: lr * 0.7 });
    }

    // Announcements
    for (const ann of state.announcements) {
      const a = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 18, fill: ann.color, fontWeight: "bold" }) });
      t.alpha = a; t.anchor.set(0.5, 0.5);
      t.position.set(ox + HuntConfig.FIELD_WIDTH / 2, oy + HuntConfig.FIELD_HEIGHT / 2);
      this._ui.addChild(t);
    }

    // HUD
    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); this._ui.addChild(t);
    };

    g.rect(0, 0, sw, 44).fill({ color: 0x0a0806, alpha: 0.8 });
    g.moveTo(0, 44).lineTo(sw, 44).stroke({ color: COL, width: 1, alpha: 0.3 });
    addText("\u{1F3F9} HUNT", 12, 6, { fontSize: 14, fill: COL, fontWeight: "bold", letterSpacing: 3 });
    addText(`Gold: ${state.gold}`, 150, 8, { fontSize: 12, fill: 0xffd700 });
    addText(`Score: ${state.score}`, 270, 8, { fontSize: 12, fill: 0x44ccaa });
    addText(`Kills: ${state.kills}`, 390, 8, { fontSize: 12, fill: 0xcc6644 });
    addText(`Bow: ${state.bow.name}`, 500, 8, { fontSize: 11, fill: 0xccaa88 });
    addText(`Arrows: ${state.arrowsLeft}/${state.maxArrows}`, 630, 8, { fontSize: 11, fill: state.arrowsLeft <= 3 ? 0xff4444 : 0xccaa66 });
    const rem = Math.max(0, state.timeLimit - state.elapsedTime);
    addText(`${Math.floor(rem / 60)}:${Math.floor(rem % 60).toString().padStart(2, "0")}`, sw / 2, 24, { fontSize: 14, fill: rem < 15 ? 0xff4444 : 0xccddcc, fontWeight: "bold" }, true);
    addText(`Round ${state.round + 1}/3`, 650, 8, { fontSize: 11, fill: 0x889988 });

    // HP
    addText(`HP: ${"♥".repeat(state.playerHp)}${"♡".repeat(state.maxPlayerHp - state.playerHp)}`, 150, 24, { fontSize: 10, fill: state.playerHp <= 2 ? 0xff4444 : 0xff8888 });

    // Streak
    if (state.streak >= 2) {
      addText(`Streak: ${state.streak}x`, 400, 24, { fontSize: 10, fill: state.streak >= 5 ? 0xffd700 : 0xffaa44, fontWeight: "bold" });
    }

    // Wind indicator
    const windStr = state.wind > 0.3 ? "Wind: >>>" : state.wind < -0.3 ? "Wind: <<<" : "Wind: calm";
    addText(windStr, 530, 24, { fontSize: 9, fill: Math.abs(state.wind) > 0.5 ? 0x88ccff : 0x667766 });

    // Controls
    addText("Click: aim | Hold: draw | Release: shoot | Esc: quit", sw / 2, sh - 14, { fontSize: 8, fill: 0x556655 }, true);
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); }
}
