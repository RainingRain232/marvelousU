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
    // Sky gradient (top third)
    bg.rect(0, 0, sw, sh * 0.3).fill({ color: 0x4488cc });
    bg.rect(0, sh * 0.25, sw, sh * 0.1).fill({ color: 0x77aacc, alpha: 0.5 });
    // Grass base
    bg.rect(0, sh * 0.3, sw, sh * 0.7).fill({ color: 0x2a5522 });
    // Grass texture stripes
    for (let gy = Math.floor(sh * 0.3); gy < sh; gy += 3) {
      const shade = 0.05 + Math.sin(gy * 0.05) * 0.03;
      bg.moveTo(0, gy).lineTo(sw, gy).stroke({ color: 0x2e6028, width: 1, alpha: shade });
    }
    // Clouds in sky
    for (let ci = 0; ci < 8; ci++) {
      const cx = 50 + Math.random() * (sw - 100), cy = 20 + Math.random() * sh * 0.2;
      for (let cc = 0; cc < 4; cc++) {
        bg.circle(cx + cc * 15 - 20, cy + (Math.random() - 0.5) * 10, 12 + Math.random() * 10).fill({ color: 0xffffff, alpha: 0.2 + Math.random() * 0.1 });
      }
    }
    // Sun
    bg.circle(sw * 0.8, sh * 0.08, 25).fill({ color: 0xffee88, alpha: 0.4 });
    bg.circle(sw * 0.8, sh * 0.08, 35).fill({ color: 0xffdd66, alpha: 0.1 });
    // Rolling hills (horizon line)
    for (let hx = 0; hx < sw; hx += 2) {
      const hy = sh * 0.3 + Math.sin(hx * 0.008) * 15 + Math.sin(hx * 0.015) * 8;
      bg.rect(hx, hy, 2, sh - hy).fill({ color: 0x2a5522 });
    }
    // Trees on horizon
    for (let ti = 0; ti < 20; ti++) {
      const tx = 30 + Math.random() * (sw - 60);
      const tBase = sh * 0.28 + Math.sin(tx * 0.008) * 15;
      // Trunk
      bg.rect(tx - 2, tBase, 4, 15).fill({ color: 0x553311, alpha: 0.4 });
      // Canopy
      bg.circle(tx, tBase - 5, 8 + Math.random() * 6).fill({ color: [0x225522, 0x1a4418, 0x2a6628][ti % 3], alpha: 0.35 });
    }
    // Grass clumps (more, varied)
    for (let gi = 0; gi < 150; gi++) {
      const gx = Math.random() * sw, gy = sh * 0.35 + Math.random() * sh * 0.65;
      const gr = 2 + Math.random() * 6;
      bg.circle(gx, gy, gr).fill({ color: gi % 3 === 0 ? 0x2e6028 : gi % 3 === 1 ? 0x1a4418 : 0x336630, alpha: 0.08 + Math.random() * 0.06 });
    }
    // Wildflower patches
    for (let fi = 0; fi < 80; fi++) {
      const fx = Math.random() * sw, fy = sh * 0.4 + Math.random() * sh * 0.6;
      const fc = [0xffdd44, 0xff8866, 0xaaddff, 0xffaacc, 0xaaffaa, 0xffff88, 0xff6688][fi % 7];
      bg.circle(fx, fy, 1 + Math.random() * 1.5).fill({ color: fc, alpha: 0.2 + Math.random() * 0.15 });
    }
    // Distant buildings/castle silhouette on horizon
    const castleX = sw * 0.15;
    bg.rect(castleX, sh * 0.22, 12, 25).fill({ color: 0x334455, alpha: 0.25 });
    bg.rect(castleX + 15, sh * 0.24, 20, 20).fill({ color: 0x334455, alpha: 0.2 });
    bg.rect(castleX + 38, sh * 0.21, 10, 28).fill({ color: 0x334455, alpha: 0.25 });
    // Tent/flags near track
    for (let fli = 0; fli < 6; fli++) {
      const flx = 30 + Math.random() * (sw - 60), fly = sh * 0.35 + Math.random() * sh * 0.5;
      bg.rect(flx, fly, 2, 20).fill({ color: 0x886644, alpha: 0.3 });
      const flagColor = [0xcc2222, 0x2244cc, 0xffcc22, 0x22cc44, 0xcc44cc, 0xff8822][fli];
      bg.rect(flx + 2, fly, 10, 6).fill({ color: flagColor, alpha: 0.25 });
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
    const ox = (sw - RaceConfig.FIELD_WIDTH) / 2, oy = (sh - RaceConfig.FIELD_HEIGHT) / 2;
    const track = state.track;
    const wp = track.waypoints;

    // Track dirt border (worn grass at edges)
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      g.moveTo(ox + a.x, oy + a.y).lineTo(ox + b.x, oy + b.y).stroke({ color: 0x443322, width: track.width + 12, alpha: 0.12 });
    }
    // Track surface (dirt road with texture)
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      g.moveTo(ox + a.x, oy + a.y).lineTo(ox + b.x, oy + b.y).stroke({ color: 0x664422, width: track.width, alpha: 0.35 });
      g.moveTo(ox + a.x, oy + a.y).lineTo(ox + b.x, oy + b.y).stroke({ color: 0x775533, width: track.width - 4, alpha: 0.2 });
    }
    // Track edge lines (fence posts / rail markings)
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      g.moveTo(ox + a.x, oy + a.y).lineTo(ox + b.x, oy + b.y).stroke({ color: 0xaa9977, width: track.width + 2, alpha: 0.08 });
      // Fence post dots along edges
      const dx = b.x - a.x, dy = b.y - a.y;
      const segDist = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / segDist, ny = dx / segDist;
      const posts = Math.floor(segDist / 25);
      for (let p = 0; p < posts; p++) {
        const t = p / posts;
        const px = a.x + dx * t, py = a.y + dy * t;
        const hw = track.width / 2 + 2;
        g.circle(ox + px + nx * hw, oy + py + ny * hw, 1.5).fill({ color: 0x998877, alpha: 0.25 });
        g.circle(ox + px - nx * hw, oy + py - ny * hw, 1.5).fill({ color: 0x998877, alpha: 0.25 });
      }
    }
    // Track center dashes
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(dist / 16);
      for (let s = 0; s < steps; s += 2) {
        const t = s / steps;
        const t2 = Math.min((s + 1) / steps, 1);
        g.moveTo(ox + a.x + dx * t, oy + a.y + dy * t).lineTo(ox + a.x + dx * t2, oy + a.y + dy * t2).stroke({ color: 0xccbb99, width: 1.5, alpha: 0.12 });
      }
    }

    // Start/finish line (checkered flag pattern)
    const s0 = wp[0];
    g.rect(ox + s0.x - 20, oy + s0.y - 3, 40, 6).fill({ color: 0xffffff, alpha: 0.35 });
    for (let ci = 0; ci < 8; ci++) {
      for (let ri = 0; ri < 2; ri++) {
        if ((ci + ri) % 2 === 0) g.rect(ox + s0.x - 20 + ci * 5, oy + s0.y - 3 + ri * 3, 5, 3).fill({ color: 0x111111, alpha: 0.35 });
      }
    }

    // Obstacles (trees with trunk, crown, shadow)
    for (const obs of track.obstacles) {
      const tx = ox + obs.x, ty = oy + obs.y;
      // Tree shadow
      g.ellipse(tx + 3, ty + obs.r * 0.6, obs.r * 0.8, obs.r * 0.3).fill({ color: 0x000000, alpha: 0.12 });
      // Trunk
      g.roundRect(tx - 2, ty - 2, 4, obs.r * 0.5, 1).fill({ color: 0x553311, alpha: 0.6 });
      // Crown (layered circles for foliage)
      g.circle(tx, ty - obs.r * 0.3, obs.r * 0.85).fill({ color: 0x2a5a2a, alpha: 0.5 });
      g.circle(tx - obs.r * 0.25, ty - obs.r * 0.4, obs.r * 0.55).fill({ color: 0x336633, alpha: 0.4 });
      g.circle(tx + obs.r * 0.3, ty - obs.r * 0.2, obs.r * 0.5).fill({ color: 0x2a4a2a, alpha: 0.45 });
      // Highlight
      g.circle(tx - obs.r * 0.15, ty - obs.r * 0.5, obs.r * 0.25).fill({ color: 0x44aa44, alpha: 0.15 });
    }

    // Waypoint markers (subtle)
    for (let i = 0; i < wp.length; i++) {
      g.circle(ox + wp[i].x, oy + wp[i].y, 3).fill({ color: 0xffffff, alpha: 0.05 });
    }

    // Power-ups on track
    const pupColors = { speed: 0xff6644, stamina: 0x44ccff, shield: 0xffd700 };
    const pupSymbols = { speed: "\u26A1", stamina: "\u2764", shield: "\u{1F6E1}" };
    for (const pup of state.powerUps) {
      if (pup.collected) continue;
      const ppx = ox + pup.x, ppy = oy + pup.y;
      const col = pupColors[pup.type];
      const pulse = 0.5 + Math.sin(Date.now() / 300) * 0.2;
      g.circle(ppx, ppy, 10).fill({ color: col, alpha: pulse * 0.15 });
      g.circle(ppx, ppy, 7).fill({ color: col, alpha: pulse * 0.4 });
      g.circle(ppx, ppy, 7).stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 });
      const sym = new Text({ text: pupSymbols[pup.type], style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xffffff }) });
      sym.anchor.set(0.5, 0.5); sym.position.set(ppx, ppy);
      this._ui.addChild(sym);
    }

    // Draw racers (sorted by Y for depth)
    const sortedRacers = [...state.racers].sort((a, b) => a.y - b.y);
    for (const racer of sortedRacers) {
      const rx = ox + racer.x, ry = oy + racer.y;
      const hc = racer.horse.color;
      const cos = Math.cos(racer.angle), sin = Math.sin(racer.angle);
      // Leg animation (gallop cycle)
      const gallopPhase = state.elapsedTime * (racer.speed / 50);
      const legAnim = Math.sin(gallopPhase * 6) * 3;

      // Shadow (stretched in direction of movement)
      g.ellipse(rx + sin * 2 + 2, ry - cos * 2 + 5, 10, 4).fill({ color: 0x000000, alpha: 0.18 });

      // Legs (4, animated)
      const legColor = ((hc >> 1) & 0x7f7f7f); // darker
      for (const [lox, loy] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
        const legOffset = (loy < 0 ? legAnim : -legAnim) * (racer.speed > 50 ? 1 : 0.2);
        g.moveTo(rx + cos * loy + sin * lox, ry + sin * loy - cos * lox)
          .lineTo(rx + cos * loy + sin * lox + legOffset * 0.3, ry + sin * loy - cos * lox + 3)
          .stroke({ color: legColor, width: 1.5, alpha: 0.6 });
      }

      // Horse body (elongated, facing direction)
      g.ellipse(rx, ry, 11, 6).fill({ color: hc });
      // Body highlight
      g.ellipse(rx - sin * 1, ry + cos * 1 - 2, 8, 3).fill({ color: 0xffffff, alpha: 0.06 });
      // Neck
      g.moveTo(rx + cos * 6, ry + sin * 6).lineTo(rx + cos * 10, ry + sin * 10 - 2).stroke({ color: hc, width: 4 });
      // Head
      g.ellipse(rx + cos * 11, ry + sin * 11 - 1, 4, 3).fill({ color: hc });
      // Eye
      g.circle(rx + cos * 12 + sin * 1.5, ry + sin * 12 - cos * 1.5 - 1, 0.8).fill({ color: 0x222222 });
      // Ears
      g.circle(rx + cos * 12 - sin * 2, ry + sin * 12 + cos * 2 - 2, 1.5).fill({ color: hc });
      g.circle(rx + cos * 12 + sin * 2, ry + sin * 12 - cos * 2 - 2, 1.5).fill({ color: hc });
      // Tail (flowing behind)
      const tailWave = Math.sin(gallopPhase * 4) * 2;
      g.moveTo(rx - cos * 10, ry - sin * 10)
        .lineTo(rx - cos * 16 + tailWave, ry - sin * 16 + tailWave * 0.5)
        .stroke({ color: hc, width: 1.5, alpha: 0.5 });
      // Mane (along neck)
      for (let mi = 0; mi < 3; mi++) {
        const mt = 0.3 + mi * 0.2;
        const mx = rx + cos * (6 + mt * 4), my = ry + sin * (6 + mt * 4) - 3;
        g.moveTo(mx, my).lineTo(mx + tailWave * 0.5, my - 2).stroke({ color: hc, width: 1, alpha: 0.4 });
      }

      // Rider (body + head)
      const riderColor = racer.isPlayer ? 0x4466aa : 0x666666;
      g.roundRect(rx - cos * 1 - 2, ry - sin * 1 - 7, 4, 5, 1).fill({ color: riderColor, alpha: 0.8 });
      g.circle(rx - cos * 1, ry - sin * 1 - 9, 2.5).fill({ color: 0xddbb88, alpha: 0.8 });
      // Rider helmet
      g.circle(rx - cos * 1, ry - sin * 1 - 10, 2.8).fill({ color: racer.isPlayer ? 0x4488cc : 0x888888, alpha: 0.5 });

      // Player indicator
      if (racer.isPlayer) {
        g.circle(rx, ry, 14).stroke({ color: 0x44ff44, width: 1.5, alpha: 0.25 });
        // Name tag arrow
        g.moveTo(rx, ry - 16).lineTo(rx - 3, ry - 20).lineTo(rx + 3, ry - 20).closePath().fill({ color: 0x44ff44, alpha: 0.3 });
        if (state.playerShield > 0) {
          const shieldAlpha = Math.min(0.4, state.playerShield / 3);
          g.circle(rx, ry, 16).fill({ color: 0xffd700, alpha: shieldAlpha * 0.15 });
          g.circle(rx, ry, 16).stroke({ color: 0xffd700, width: 2, alpha: shieldAlpha });
        }
      } else {
        // AI name label
        const nameT = new Text({ text: racer.name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0xaaaaaa }) });
        nameT.anchor.set(0.5, 1); nameT.position.set(rx, ry - 14); nameT.alpha = 0.5;
        this._ui.addChild(nameT);
      }

      // Speed lines when galloping
      if (racer.galloping && racer.speed > racer.horse.maxSpeed) {
        for (let li = 0; li < 4; li++) {
          const lx = rx - cos * (14 + li * 5) + (Math.random() - 0.5) * 5;
          const ly = ry - sin * (14 + li * 5) + (Math.random() - 0.5) * 5;
          g.moveTo(lx, ly).lineTo(lx - cos * 8, ly - sin * 8).stroke({ color: 0xffffff, width: 0.8, alpha: 0.12 + Math.random() * 0.08 });
        }
      }
      // Stamina glow when sprinting
      if (racer.galloping) {
        g.circle(rx, ry, 12).fill({ color: 0xffaa44, alpha: 0.05 + Math.sin(gallopPhase * 8) * 0.03 });
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

    // Weather overlay
    if (state.track.weather === "rain") {
      g.rect(0, 0, sw, sh).fill({ color: 0x224466, alpha: 0.06 });
    } else if (state.track.weather === "mud") {
      g.rect(0, 0, sw, sh).fill({ color: 0x332211, alpha: 0.05 });
    } else if (state.track.weather === "fog") {
      g.rect(0, 0, sw, sh).fill({ color: 0xaabbcc, alpha: 0.08 });
      // Fog wisps
      for (let fi = 0; fi < 5; fi++) {
        const fx = (fi * 173 + Date.now() * 0.01) % sw;
        const fy = sh * 0.3 + fi * 60;
        g.ellipse(fx, fy, 80, 15).fill({ color: 0xcccccc, alpha: 0.04 });
      }
    }
    // Weather label
    if (state.track.weather !== "clear") {
      addText(state.track.weather.toUpperCase(), sw - 80, 26, { fontSize: 9, fill: state.track.weather === "rain" ? 0x6688aa : state.track.weather === "mud" ? 0x886644 : 0x8899aa, fontStyle: "italic" });
    }

    // Minimap (bottom right)
    const mmx = sw - 90, mmy = sh - 90, mms = 70;
    g.roundRect(mmx, mmy, mms, mms, 4).fill({ color: 0x000000, alpha: 0.4 });
    g.roundRect(mmx, mmy, mms, mms, 4).stroke({ color: 0x444433, width: 0.5 });
    const mmScale = mms / Math.max(RaceConfig.FIELD_WIDTH, RaceConfig.FIELD_HEIGHT);
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i], b = wp[(i + 1) % wp.length];
      g.moveTo(mmx + a.x * mmScale, mmy + a.y * mmScale)
        .lineTo(mmx + b.x * mmScale, mmy + b.y * mmScale)
        .stroke({ color: 0x554433, width: 2, alpha: 0.5 });
    }
    for (const racer of state.racers) {
      const mc = racer.isPlayer ? 0x44ff44 : 0xaa4444;
      g.circle(mmx + racer.x * mmScale, mmy + racer.y * mmScale, racer.isPlayer ? 2.5 : 1.5).fill({ color: mc, alpha: 0.8 });
    }

    // Controls
    addText("SPACE: gallop | A/D: steer | Collect power-ups on track!", sw / 2, sh - 12, { fontSize: 8, fill: 0x556655 }, true);
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); }
}
