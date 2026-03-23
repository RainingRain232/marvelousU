// ---------------------------------------------------------------------------
// Race mode — track and racer renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RaceState } from "../state/RaceState";
import { RacePhase } from "../state/RaceState";
import { RaceConfig } from "../config/RaceConfig";

const FONT = "Georgia, serif";
const COL = 0xaa8844;

export class RaceRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _ui = new Container();

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x1a2a1a });
    // Grass texture
    for (let gy = 0; gy < sh; gy += 6) {
      bg.moveTo(0, gy).lineTo(sw, gy).stroke({ color: 0x1e2e1e, width: 0.5, alpha: 0.08 });
    }
    this.container.addChild(bg);
    this._gfx = new Graphics();
    this._ui = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._ui);
  }

  draw(state: RaceState, sw: number, sh: number): void {
    this._gfx.clear();
    while (this._ui.children.length > 0) this._ui.removeChildAt(0);
    const g = this._gfx;
    const ox = (sw - RaceConfig.FIELD_WIDTH) / 2, oy = 50;
    const track = state.track;
    const wp = track.waypoints;

    // Draw track path
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      // Track surface
      g.moveTo(ox + a.x, oy + a.y).lineTo(ox + b.x, oy + b.y).stroke({ color: 0x554433, width: track.width, alpha: 0.4 });
      // Track edges
      g.moveTo(ox + a.x, oy + a.y).lineTo(ox + b.x, oy + b.y).stroke({ color: 0x776655, width: track.width + 4, alpha: 0.15 });
    }
    // Track center dashes
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(dist / 20);
      for (let s = 0; s < steps; s += 2) {
        const t = s / steps;
        const t2 = (s + 1) / steps;
        g.moveTo(ox + a.x + dx * t, oy + a.y + dy * t).lineTo(ox + a.x + dx * t2, oy + a.y + dy * t2).stroke({ color: 0xccbb99, width: 1, alpha: 0.15 });
      }
    }

    // Start/finish line
    const s0 = wp[0];
    g.rect(ox + s0.x - 15, oy + s0.y - 2, 30, 4).fill({ color: 0xffffff, alpha: 0.3 });
    // Checkered pattern
    for (let ci = 0; ci < 6; ci++) {
      if (ci % 2 === 0) g.rect(ox + s0.x - 15 + ci * 5, oy + s0.y - 2, 5, 2).fill({ color: 0x000000, alpha: 0.3 });
      else g.rect(ox + s0.x - 15 + ci * 5, oy + s0.y, 5, 2).fill({ color: 0x000000, alpha: 0.3 });
    }

    // Obstacles
    for (const obs of track.obstacles) {
      g.circle(ox + obs.x, oy + obs.y, obs.r).fill({ color: 0x2a3a2a, alpha: 0.5 });
      g.circle(ox + obs.x, oy + obs.y, obs.r * 0.7).fill({ color: 0x1e2e1e, alpha: 0.3 });
      g.circle(ox + obs.x, oy + obs.y, obs.r).stroke({ color: 0x3a4a3a, width: 0.5, alpha: 0.3 });
    }

    // Waypoint markers (subtle)
    for (let i = 0; i < wp.length; i++) {
      g.circle(ox + wp[i].x, oy + wp[i].y, 3).fill({ color: 0xffffff, alpha: 0.05 });
    }

    // Draw racers
    for (const racer of state.racers) {
      const rx = ox + racer.x, ry = oy + racer.y;
      const hc = racer.horse.color;
      // Shadow
      g.ellipse(rx + 1, ry + 4, 8, 3).fill({ color: 0x000000, alpha: 0.15 });
      // Horse body (elongated ellipse facing direction)
      const cos = Math.cos(racer.angle), sin = Math.sin(racer.angle);
      g.ellipse(rx, ry, 10, 5).fill({ color: hc });
      // Head
      g.circle(rx + cos * 8, ry + sin * 8, 4).fill({ color: hc });
      // Ears
      g.circle(rx + cos * 10 - sin * 2, ry + sin * 10 + cos * 2, 1.5).fill({ color: hc });
      g.circle(rx + cos * 10 + sin * 2, ry + sin * 10 - cos * 2, 1.5).fill({ color: hc });
      // Rider
      if (racer.isPlayer) {
        g.circle(rx - cos * 2, ry - sin * 2 - 4, 3).fill({ color: 0x4466aa });
      } else {
        g.circle(rx - cos * 2, ry - sin * 2 - 4, 3).fill({ color: 0x666666 });
      }
      // Name tag
      if (racer.isPlayer) {
        g.circle(rx, ry, 12).stroke({ color: 0x44ff44, width: 1, alpha: 0.3 });
      }
      // Speed lines when galloping
      if (racer.galloping && racer.speed > racer.horse.maxSpeed) {
        for (let li = 0; li < 3; li++) {
          const lx = rx - cos * (12 + li * 4) + (Math.random() - 0.5) * 4;
          const ly = ry - sin * (12 + li * 4) + (Math.random() - 0.5) * 4;
          g.moveTo(lx, ly).lineTo(lx - cos * 6, ly - sin * 6).stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });
        }
      }
    }

    // Particles
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      g.circle(ox + p.x, oy + p.y, p.size * lr).fill({ color: p.color, alpha: lr * 0.5 });
    }

    // Announcements
    for (const ann of state.announcements) {
      const a = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 22, fill: ann.color, fontWeight: "bold", letterSpacing: 2 }) });
      t.alpha = a; t.anchor.set(0.5, 0.5);
      t.position.set(ox + RaceConfig.FIELD_WIDTH / 2, oy + RaceConfig.FIELD_HEIGHT / 2);
      this._ui.addChild(t);
    }

    // HUD
    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t2 = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t2.anchor.set(0.5, 0);
      t2.position.set(x, y); this._ui.addChild(t2);
    };

    g.rect(0, 0, sw, 44).fill({ color: 0x0a0806, alpha: 0.8 });
    g.moveTo(0, 44).lineTo(sw, 44).stroke({ color: COL, width: 1, alpha: 0.3 });
    addText("\u{1F3C7} RACE", 12, 6, { fontSize: 14, fill: COL, fontWeight: "bold", letterSpacing: 3 });
    addText(`Gold: ${state.gold}`, 140, 8, { fontSize: 12, fill: 0xffd700 });
    addText(`Bet: ${state.currentBet}g`, 260, 8, { fontSize: 11, fill: 0xffaa44 });

    const player = state.racers.find(r => r.isPlayer);
    if (player) {
      addText(`Lap: ${Math.min(player.lap + 1, state.track.laps)}/${state.track.laps}`, 380, 8, { fontSize: 12, fill: 0xccddcc });
      // Stamina bar
      const sbx = 500, sby = 8, sbw = 80, sbh = 8;
      g.rect(sbx, sby, sbw, sbh).fill({ color: 0x220000 });
      g.rect(sbx, sby, sbw * (player.stamina / player.horse.stamina), sbh).fill({ color: player.stamina > 30 ? 0x44cc44 : 0xff4444 });
      g.rect(sbx, sby, sbw, sbh).stroke({ color: 0x444433, width: 0.5 });
      addText("Stamina", sbx, sby + 10, { fontSize: 7, fill: 0x889988 });
      // Speed
      addText(`${Math.floor(player.speed)} mph`, 600, 8, { fontSize: 11, fill: 0xccddcc });
    }

    const elapsed = Math.floor(state.elapsedTime);
    addText(`${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, "0")}`, sw / 2, 24, { fontSize: 12, fill: 0xccddcc }, true);

    // Position
    if (state.phase === RacePhase.RACING) {
      const sorted = [...state.racers].sort((a, b) => {
        if (a.lap !== b.lap) return b.lap - a.lap;
        return b.waypointIndex - a.waypointIndex;
      });
      const pos = sorted.findIndex(r => r.isPlayer) + 1;
      addText(`${pos}${pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th"}`, sw - 50, 6, { fontSize: 16, fill: pos === 1 ? 0xffd700 : 0xccddcc, fontWeight: "bold" });
    }

    // Controls
    addText("Hold SPACE: gallop (uses stamina) | Auto-steer follows track", sw / 2, sh - 12, { fontSize: 8, fill: 0x556655 }, true);
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); }
}
