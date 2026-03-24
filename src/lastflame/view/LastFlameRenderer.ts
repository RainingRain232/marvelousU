// ---------------------------------------------------------------------------
// The Last Flame — PixiJS Renderer
// Darkness-survival with dynamic lighting, flickering flame, shadow creatures
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { LFPhase } from "../types";
import type { LFState, LFMeta } from "../types";
import { LF, getLFGrade } from "../config/LastFlameBalance";

const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 48, fill: 0xffaa33, fontWeight: "bold", letterSpacing: 4, dropShadow: { color: 0x000000, distance: 4, blur: 8, alpha: 0.9 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0x886644, fontStyle: "italic", letterSpacing: 2 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xcc8833, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.7 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0xffaa33, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 } });
const STYLE_GRADE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 46, fill: 0xff8844, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.9 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xaa8866, lineHeight: 22 });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0xffaa33, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.7 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 } });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x665544, lineHeight: 16 });

const FLOAT_POOL = 12;

export class LastFlameRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _titleText = new Text({ text: "THE LAST FLAME", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Keep the fire alive. Survive the dark.", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _gradeText = new Text({ text: "", style: STYLE_GRADE });
  private _statText = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  private _shopTexts: Text[] = [];
  private _sw = 0; private _sh = 0;
  private _ox = 0; private _oy = 0; // arena offset

  build(sw: number, sh: number): void {
    this._sw = sw; this._sh = sh;
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    for (const t of [this._hudText, this._titleText, this._subtitleText, this._controlsText,
      this._promptText, this._gradeText, this._statText, this._deathPrompt, this._pauseText]) {
      this.container.addChild(t);
    }
    this._hudText.position.set(10, 8);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5); t.visible = false;
      this._floatTexts.push(t); this._floatContainer.addChild(t);
    }
    // Shop text labels
    for (let i = 0; i < 7; i++) {
      const st = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xaa8866, lineHeight: 14 }) });
      st.visible = false;
      this._shopTexts.push(st);
      this.container.addChild(st);
    }
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); this._uiGfx.destroy(); }

  render(state: LFState, sw: number, sh: number, meta: LFMeta): void {
    this._sw = sw; this._sh = sh;
    this._ox = Math.floor((sw - state.arenaW) / 2);
    this._oy = Math.floor((sh - state.arenaH) / 2);
    const g = this._gfx; g.clear(); this._uiGfx.clear();

    let shX = 0, shY = 0;
    if (state.screenShake > 0) {
      const i = LF.SHAKE_INTENSITY * (state.screenShake / LF.SHAKE_DURATION);
      shX = (Math.random() - 0.5) * i * 2; shY = (Math.random() - 0.5) * i * 2;
    }
    g.position.set(shX, shY);

    // Total darkness
    const bgColor = (state.phase === LFPhase.PLAYING || state.phase === LFPhase.PAUSED || state.phase === LFPhase.DYING) ? state.roomConfig.bgColor : LF.COLOR_BG;
    g.rect(-10, -10, sw + 20, sh + 20).fill(bgColor);

    if (state.phase === LFPhase.PLAYING || state.phase === LFPhase.PAUSED || state.phase === LFPhase.DYING) {
      this._drawFloor(g, state);
      this._drawPillars(g, state);
      if (state.phase !== LFPhase.DYING) this._drawOil(g, state);
      this._drawShadows(g, state);
      if (state.phase !== LFPhase.DYING || state.dyingTimer > LF.DYING_DURATION * 0.3) {
        this._drawFlame(g, state);
      }
      this._drawParticles(g, state);
      this._drawBoundary(g, state);
      this._drawDarkness(g, state);
      if (state.phase !== LFPhase.DYING) {
        this._drawFlareEffect(g, state);
        this._drawIndicators(g, state);
      }
      // Dying: dramatic flame extinguish sequence
      if (state.phase === LFPhase.DYING) {
        const ratio = state.dyingTimer / LF.DYING_DURATION; // 1 at start, 0 at end
        const deathProgress = 1 - ratio;

        // Darkness swallowing the screen from edges
        const darkAlpha = deathProgress * 0.8;
        const thickness = deathProgress * 80;
        g.rect(0, 0, sw, thickness).fill({ color: LF.COLOR_DARKNESS, alpha: darkAlpha });
        g.rect(0, sh - thickness, sw, thickness).fill({ color: LF.COLOR_DARKNESS, alpha: darkAlpha });
        g.rect(0, 0, thickness, sh).fill({ color: LF.COLOR_DARKNESS, alpha: darkAlpha });
        g.rect(sw - thickness, 0, thickness, sh).fill({ color: LF.COLOR_DARKNESS, alpha: darkAlpha });

        // Central darkness closing in
        g.rect(0, 0, sw, sh).fill({ color: LF.COLOR_DARKNESS, alpha: deathProgress * 0.5 });

        // Final ember sparks scattering outward from flame
        if (ratio > 0.3) {
          const sparkCount = 6;
          const sparkPhase = state.time * 4;
          for (let s = 0; s < sparkCount; s++) {
            const sa = sparkPhase + s * Math.PI * 2 / sparkCount;
            const sLife = deathProgress * 0.7;
            const sr = sLife * 60 + 5;
            const sx = this._ox + state.playerX + Math.cos(sa) * sr;
            const sy = this._oy + state.playerY + Math.sin(sa) * sr;
            const sAlpha = ratio * 0.3;
            g.circle(sx, sy, 2 - sLife).fill({ color: LF.COLOR_FLAME, alpha: sAlpha });
          }
        }

        // Red danger pulse growing
        if (deathProgress > 0.5) {
          const dangerAlpha = (deathProgress - 0.5) * 0.08;
          g.rect(0, 0, sw, sh).fill({ color: LF.COLOR_DANGER, alpha: dangerAlpha });
        }
      }
      // Wave announcement overlay
      if (state.waveAnnounceTimer > 0 && state.phase === LFPhase.PLAYING) {
        const announceAlpha = Math.min(1, state.waveAnnounceTimer / (LF.WAVE_ANNOUNCE_DURATION * 0.5));
        this._pauseText.visible = true;
        this._pauseText.text = state.waveName;
        this._pauseText.style.fill = LF.COLOR_FLAME;
        this._pauseText.style.fontSize = 24;
        this._pauseText.anchor.set(0.5);
        this._pauseText.position.set(sw / 2, sh * 0.2);
        this._pauseText.alpha = announceAlpha * 0.8;
      } else if (state.phase !== LFPhase.PAUSED) {
        this._pauseText.visible = false;
      }

      // Mutator choice UI (during Respite)
      if (state.choosingMutator && state.mutatorChoices.length > 0) {
        const ug = this._uiGfx;
        const mcx = sw / 2, mcy = sh * 0.75;
        ug.roundRect(mcx - 180, mcy - 20, 360, 45, 6).fill({ color: 0x000000, alpha: 0.6 });
        ug.setStrokeStyle({ width: 1, color: LF.COLOR_FLAME, alpha: 0.2 });
        ug.roundRect(mcx - 180, mcy - 20, 360, 45, 6).stroke();

        for (let i = 0; i < state.mutatorChoices.length; i++) {
          const m = state.mutatorChoices[i];
          const mx = mcx - 170 + i * 175;
          ug.roundRect(mx, mcy - 14, 165, 33, 4).fill({ color: 0x1a1210, alpha: 0.7 });
          ug.setStrokeStyle({ width: 1, color: LF.COLOR_FLAME, alpha: 0.15 });
          ug.roundRect(mx, mcy - 14, 165, 33, 4).stroke();
          ug.roundRect(mx, mcy - 14, 165, 3, 2).fill({ color: LF.COLOR_FLAME, alpha: 0.3 });

          // Use shop texts if available
          const st = this._shopTexts[i];
          if (st) {
            st.visible = true;
            st.text = `[${i + 1}] ${m.name}\n${m.desc}`;
            st.style.fill = LF.COLOR_FLAME;
            st.position.set(mx + 5, mcy - 10);
          }
        }
      } else {
        // Hide shop texts when not choosing
        for (const st of this._shopTexts) {
          if ((state.phase as string) !== LFPhase.DEAD) st.visible = false;
        }
      }

      // Shadow telegraph visuals
      if (state.phase === LFPhase.PLAYING) {
        const ox2 = this._ox, oy2 = this._oy;
        for (const s of state.shadows) {
          if (!s.alive || s.state !== "telegraph") continue;
          const sx = ox2 + s.x, sy = ox2 ? oy2 + s.y : oy2 + s.y;
          const tpx = ox2 + state.playerX, tpy = oy2 + state.playerY;
          const tRatio = s.dartDuration / LF.TELEGRAPH_DURATION;
          const tFlash = Math.sin(state.time * 30) > 0 ? 1 : 0.4;
          const tAlpha = (1 - tRatio) * 0.3 * tFlash;

          // Direction line to player
          g.setStrokeStyle({ width: 1.5, color: LF.COLOR_SHADOW_EYE, alpha: tAlpha });
          g.moveTo(sx, sy).lineTo(tpx, tpy).stroke();

          // Flaring eyes
          const eyeFlare = 0.6 + (1 - tRatio) * 0.4;
          g.circle(sx, sy, s.radius * 0.5).fill({ color: LF.COLOR_SHADOW_EYE, alpha: eyeFlare * tFlash });
        }
      }
    }

    // Screen flash
    if (state.screenFlashTimer > 0) {
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.3 * (state.screenFlashTimer / LF.FLASH_DURATION) });
    }

    // UI
    this._drawFloatTexts(state);
    this._drawHUD(state);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawDeathScreen(state, meta);
  }

  // ---------------------------------------------------------------------------
  // Floor — stone tiles visible in light
  // ---------------------------------------------------------------------------

  private _drawFloor(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const px = state.playerX, py = state.playerY;
    const lr = state.lightRadius;
    const tileSize = 30;

    const minX = Math.max(0, Math.floor((px - lr - 10) / tileSize));
    const maxX = Math.min(Math.ceil(state.arenaW / tileSize), Math.ceil((px + lr + 10) / tileSize));
    const minY = Math.max(0, Math.floor((py - lr - 10) / tileSize));
    const maxY = Math.min(Math.ceil(state.arenaH / tileSize), Math.ceil((py + lr + 10) / tileSize));

    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        const tcx = tx * tileSize + tileSize / 2;
        const tcy = ty * tileSize + tileSize / 2;
        const dist = Math.sqrt((tcx - px) ** 2 + (tcy - py) ** 2);
        if (dist > lr + tileSize) continue;
        const visibility = Math.max(0, 1 - dist / lr);
        const seed = tx * 17 + ty * 31; // deterministic per-tile variation
        const shadeVar = (seed % 5) * 0.02;
        const shade = ((tx + ty) % 2 === 0) ? state.roomConfig.floorDark : state.roomConfig.floorLight;
        const tileX = ox + tx * tileSize, tileY = oy + ty * tileSize;

        // Base tile with variation
        g.rect(tileX, tileY, tileSize, tileSize).fill({ color: shade, alpha: visibility * (0.55 + shadeVar) });

        // Scorch marks near flame center (warm glow on nearby tiles)
        if (dist < lr * 0.3) {
          g.rect(tileX, tileY, tileSize, tileSize).fill({ color: LF.COLOR_LIGHT_EDGE, alpha: visibility * 0.04 });
        }

        if (visibility > 0.15) {
          // Mortar/edge lines
          g.setStrokeStyle({ width: 0.5, color: 0x1a1a2a, alpha: visibility * 0.18 });
          g.rect(tileX, tileY, tileSize, tileSize).stroke();

          // Crack patterns (deterministic per tile, some tiles only)
          if (seed % 7 === 0 && visibility > 0.3) {
            g.setStrokeStyle({ width: 0.5, color: 0x0a0a16, alpha: visibility * 0.2 });
            const cx1 = tileX + (seed % 11) * tileSize / 11;
            const cy1 = tileY + (seed % 13) * tileSize / 13;
            g.moveTo(cx1, cy1).lineTo(cx1 + tileSize * 0.3, cy1 + tileSize * 0.4).stroke();
          }

          // Corner wear (some tiles get a dark corner spot)
          if (seed % 11 === 0 && visibility > 0.25) {
            const cornerX = tileX + ((seed % 2) ? 0 : tileSize - 4);
            const cornerY = tileY + ((seed % 3) ? 0 : tileSize - 4);
            g.rect(cornerX, cornerY, 4, 4).fill({ color: 0x060410, alpha: visibility * 0.15 });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pillars — stone columns
  // ---------------------------------------------------------------------------

  private _drawPillars(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const px = state.playerX, py = state.playerY;
    const lr = state.lightRadius;

    for (const p of state.pillars) {
      const dist = Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2);
      if (dist > lr + p.radius + 25) continue;
      const visibility = Math.max(0, Math.min(1, 1 - (dist - p.radius) / lr));

      const sdx = p.x - px, sdy = p.y - py;
      const sLen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
      const nx = sdx / sLen, ny = sdy / sLen;
      const pcx = ox + p.x, pcy = oy + p.y;

      // Shadow cast on floor (elongated in light direction)
      g.circle(pcx + nx * 7, pcy + ny * 7, p.radius + 4).fill({ color: 0x000000, alpha: visibility * 0.25 });
      g.circle(pcx + nx * 12, pcy + ny * 12, p.radius + 2).fill({ color: 0x000000, alpha: visibility * 0.12 });

      // Base ring (circular stone base)
      g.circle(pcx, pcy, p.radius + 3).fill({ color: 0x0e0c18, alpha: visibility * 0.5 });

      // Pillar body — darker core with lighter edge
      g.circle(pcx, pcy, p.radius).fill({ color: LF.COLOR_PILLAR, alpha: visibility * 0.85 });
      // Inner depth (slightly darker center)
      g.circle(pcx + nx * 2, pcy + ny * 2, p.radius * 0.7).fill({ color: 0x121020, alpha: visibility * 0.3 });

      // Light-facing highlight
      g.circle(pcx - nx * p.radius * 0.3, pcy - ny * p.radius * 0.3, p.radius * 0.45)
        .fill({ color: LF.COLOR_PILLAR_EDGE, alpha: visibility * 0.45 });
      // Sharper light edge
      g.circle(pcx - nx * p.radius * 0.5, pcy - ny * p.radius * 0.5, p.radius * 0.25)
        .fill({ color: 0x3a3848, alpha: visibility * 0.3 });

      // Outer edge ring
      g.setStrokeStyle({ width: 1.5, color: LF.COLOR_PILLAR_EDGE, alpha: visibility * 0.25 });
      g.circle(pcx, pcy, p.radius).stroke();

      // Crack detail on some pillars (deterministic)
      const seed = Math.floor(p.x * 7 + p.y * 13);
      if (seed % 3 === 0 && visibility > 0.3) {
        g.setStrokeStyle({ width: 0.5, color: 0x0a0816, alpha: visibility * 0.2 });
        g.moveTo(pcx - p.radius * 0.3, pcy - p.radius * 0.2)
          .lineTo(pcx + p.radius * 0.1, pcy + p.radius * 0.3).stroke();
      }

      // Top cap (lighter circle suggesting height)
      g.circle(pcx, pcy, p.radius * 0.6).fill({ color: LF.COLOR_PILLAR_EDGE, alpha: visibility * 0.12 });
    }
  }

  // ---------------------------------------------------------------------------
  // Oil drops — glowing golden drops
  // ---------------------------------------------------------------------------

  private _drawOil(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const t = state.time;

    for (const o of state.oilDrops) {
      const bob = Math.sin(t * 3 + o.pulse) * 3;
      const ocx = ox + o.x, ocy = oy + o.y + bob;
      const glowPulse = 0.15 + Math.sin(t * 4 + o.pulse) * 0.08;

      // Smooth despawn alpha (instead of abrupt flicker)
      let despawnAlpha = 1.0;
      if (o.age > LF.OIL_LIFETIME - 5) {
        despawnAlpha = 0.3 + Math.sin(t * 4 + o.pulse) * 0.35;
      }

      // Large outer beacon glow (visible from far in darkness)
      g.circle(ocx, ocy, LF.OIL_RADIUS * 4).fill({ color: LF.COLOR_OIL_GLOW, alpha: glowPulse * 0.25 * despawnAlpha });
      g.circle(ocx, ocy, LF.OIL_RADIUS * 2.5).fill({ color: LF.COLOR_OIL_GLOW, alpha: glowPulse * 0.5 * despawnAlpha });

      // Swirling sparkle ring
      for (let s = 0; s < 3; s++) {
        const sa = t * 2.5 + o.pulse + s * Math.PI * 2 / 3;
        const sr = LF.OIL_RADIUS * 1.5;
        g.circle(ocx + Math.cos(sa) * sr, ocy + Math.sin(sa) * sr, 1.2)
          .fill({ color: 0xffffff, alpha: 0.3 * despawnAlpha + Math.sin(t * 5 + s) * 0.15 });
      }

      // Inner glow
      g.circle(ocx, ocy, LF.OIL_RADIUS * 1.3).fill({ color: LF.COLOR_OIL_GLOW, alpha: glowPulse * despawnAlpha });

      // Drop body (golden)
      g.circle(ocx, ocy, LF.OIL_RADIUS).fill({ color: LF.COLOR_OIL, alpha: 0.85 * despawnAlpha });

      // Droplet shape highlight (teardrop hint)
      g.circle(ocx - 1, ocy - LF.OIL_RADIUS * 0.4, LF.OIL_RADIUS * 0.35).fill({ color: 0xffffff, alpha: 0.35 * despawnAlpha });

      // Size indicator for large oil drops
      if (o.amount > 0.25) {
        g.setStrokeStyle({ width: 1, color: LF.COLOR_OIL, alpha: 0.25 * despawnAlpha });
        g.circle(ocx, ocy, LF.OIL_RADIUS * 2).stroke();
      }

      // Ground light pool beneath oil
      g.circle(ocx, ocy + LF.OIL_RADIUS + 2, LF.OIL_RADIUS * 1.5).fill({ color: LF.COLOR_OIL_GLOW, alpha: 0.03 * despawnAlpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Shadow creatures — dark shapes with glowing eyes
  // ---------------------------------------------------------------------------

  private _drawShadows(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const px = state.playerX, py = state.playerY;
    const lr = state.lightRadius;
    const t = state.time;

    for (const s of state.shadows) {
      if (!s.alive) continue;
      const dist = Math.sqrt((s.x - px) ** 2 + (s.y - py) ** 2);

      // Shadows are barely visible outside light, more visible inside
      const inLight = dist < lr;
      const visibility = inLight ? Math.min(1, (lr - dist) / (lr * 0.3)) * 0.6 : 0.08;

      // Body — variant-specific shape
      const wobble = Math.sin(t * 5 + s.eyePhase) * 2;
      const sx = ox + s.x, sy = oy + s.y;

      if (s.variant === "brute") {
        // Brute: larger, more solid, angular shape
        g.circle(sx + wobble * 0.5, sy, s.radius * 1.4).fill({ color: LF.COLOR_SHADOW_BODY, alpha: visibility });
        g.circle(sx, sy + wobble * 0.3, s.radius * 1.1).fill({ color: 0x120a22, alpha: visibility * 0.9 });
        // Armor-like edge
        g.setStrokeStyle({ width: 2, color: 0x2a1e3e, alpha: visibility * 0.5 });
        g.circle(sx, sy, s.radius).stroke();
      } else if (s.variant === "swarm") {
        // Swarm: tiny, twitchy
        g.circle(sx + wobble * 1.5, sy + wobble, s.radius * 1.2).fill({ color: LF.COLOR_SHADOW_BODY, alpha: visibility * 0.7 });
        g.circle(sx, sy, s.radius).fill({ color: LF.COLOR_SHADOW_BODY, alpha: visibility * 0.9 });
      } else if (s.variant === "stalker") {
        // Stalker: ethereal, shimmering outline
        g.circle(sx + wobble, sy, s.radius * 1.5).fill({ color: LF.COLOR_SHADOW_BODY, alpha: visibility * 0.5 });
        g.circle(sx, sy + wobble * 0.5, s.radius).fill({ color: 0x1a0e3a, alpha: visibility * 0.8 });
        // Eerie aura that shows light-draining
        const drainPulse = 0.06 + Math.sin(t * 3 + s.eyePhase) * 0.03;
        g.circle(sx, sy, s.radius * 2.5).fill({ color: LF.COLOR_SHADOW_EYE, alpha: drainPulse });
      } else {
        // Normal
        g.circle(sx + wobble, sy, s.radius * 1.3).fill({ color: LF.COLOR_SHADOW_BODY, alpha: visibility * 0.8 });
        g.circle(sx, sy + wobble * 0.5, s.radius).fill({ color: LF.COLOR_SHADOW_BODY, alpha: visibility });
      }

      // Brute wind-up telegraph — growing glow warning
      if (s.state === "wind") {
        const windProgress = 1 - s.dartDuration / LF.BRUTE_WIND_DURATION;
        const windAlpha = 0.1 + windProgress * 0.2;
        g.circle(sx, sy, s.radius * (1.5 + windProgress * 1.5)).fill({ color: LF.COLOR_DANGER, alpha: windAlpha });
        g.setStrokeStyle({ width: 2, color: LF.COLOR_DANGER, alpha: windAlpha * 2 });
        g.circle(sx, sy, s.radius * (1.2 + windProgress * 1.0)).stroke();
      }

      // Darting glow + trail (all variants)
      if (s.state === "dart") {
        const dartColor = s.variant === "brute" ? 0x661144 : LF.COLOR_SHADOW_DART;
        g.circle(sx, sy, s.radius * 1.8).fill({ color: dartColor, alpha: 0.15 });
        const vLen = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (vLen > 0) {
          g.setStrokeStyle({ width: s.radius * 0.8, color: dartColor, alpha: 0.1 });
          g.moveTo(sx, sy).lineTo(sx - s.vx * 0.05, sy - s.vy * 0.05).stroke();
        }
      }

      // Glowing eyes — always slightly visible (creepy!)
      const eyeAlpha = inLight ? 0.5 : 0.2 + Math.sin(t * 2 + s.eyePhase) * 0.1;
      const eyeSpread = s.radius * 0.3;
      // Face toward player
      const toPx = px - s.x, toPy = py - s.y;
      const toLen = Math.sqrt(toPx * toPx + toPy * toPy) || 1;
      const faceDx = toPx / toLen, faceDy = toPy / toLen;
      const perpX = -faceDy, perpY = faceDx;
      g.circle(ox + s.x + faceDx * s.radius * 0.3 + perpX * eyeSpread, oy + s.y + faceDy * s.radius * 0.3 + perpY * eyeSpread, 2)
        .fill({ color: LF.COLOR_SHADOW_EYE, alpha: eyeAlpha });
      g.circle(ox + s.x + faceDx * s.radius * 0.3 - perpX * eyeSpread, oy + s.y + faceDy * s.radius * 0.3 - perpY * eyeSpread, 2)
        .fill({ color: LF.COLOR_SHADOW_EYE, alpha: eyeAlpha });
      // Eye glint
      g.circle(ox + s.x + faceDx * s.radius * 0.3 + perpX * eyeSpread, oy + s.y + faceDy * s.radius * 0.3 + perpY * eyeSpread, 0.8)
        .fill({ color: 0xffffff, alpha: eyeAlpha * 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Player flame — the candle
  // ---------------------------------------------------------------------------

  private _drawFlame(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const px = ox + state.playerX, py = oy + state.playerY;
    const t = state.time;
    const flicker = Math.sin(t * 10) * 2 + Math.sin(t * 7) * 1.5;

    // Light pool on ground (warm glow)
    const lr = state.lightRadius;
    g.circle(px, py, lr * 0.2).fill({ color: LF.COLOR_LIGHT, alpha: 0.05 });
    g.circle(px, py, lr * 0.1).fill({ color: LF.COLOR_LIGHT, alpha: 0.08 });

    // Candle base with dripping wax
    g.rect(px - 2, py + 2, 4, 7).fill({ color: 0x8a7a6a, alpha: 0.7 });
    g.rect(px - 3, py + 8, 6, 2).fill({ color: 0x6a5a4a, alpha: 0.6 });
    // Wax drip
    g.circle(px + 2, py + 5, 1.5).fill({ color: 0x9a8a7a, alpha: 0.4 });

    // Flame layers (bottom to top) — 6 layers for richer fire
    g.circle(px + flicker * 0.4, py - 1, 7).fill({ color: 0xcc3300, alpha: 0.25 }); // deep red base
    g.circle(px + flicker * 0.3, py - 3, 6).fill({ color: LF.COLOR_FLAME_OUTER, alpha: 0.5 });
    g.circle(px, py - 5 + flicker * 0.3, 5).fill({ color: LF.COLOR_FLAME, alpha: 0.75 });
    g.circle(px - flicker * 0.15, py - 7 + flicker * 0.4, 3.8).fill({ color: LF.COLOR_FLAME_CORE, alpha: 0.85 });
    g.circle(px, py - 9 + flicker * 0.6, 2.5).fill({ color: LF.COLOR_FLAME_CORE, alpha: 0.7 });
    // Top tip
    g.circle(px + flicker * 0.5, py - 11 + flicker, 1.5).fill({ color: 0xffffff, alpha: 0.5 });

    // Ember particles drifting upward from flame
    for (let e = 0; e < 3; e++) {
      const ep = t * (2 + e * 0.7) + e * 2.3;
      const eLife = (ep % 1.5) / 1.5; // 0-1
      const ex = px + Math.sin(ep * 3 + e) * (3 + eLife * 8);
      const ey = py - 12 - eLife * 25;
      const eAlpha = (1 - eLife) * 0.4 * state.fuel;
      if (eAlpha > 0.02) {
        g.circle(ex, ey, 1.2 - eLife * 0.6).fill({ color: LF.COLOR_FLAME, alpha: eAlpha });
      }
    }

    // Smoke wisps (faint, above flame)
    if (state.fuel < 0.5) {
      const smokeAlpha = (0.5 - state.fuel) * 0.06;
      for (let s = 0; s < 2; s++) {
        const sp = t * 1.5 + s * 3;
        const sLife = (sp % 2) / 2;
        const sx = px + Math.sin(sp * 2) * (2 + sLife * 6);
        const sy = py - 15 - sLife * 20;
        g.circle(sx, sy, 2 + sLife * 3).fill({ color: 0x444444, alpha: smokeAlpha * (1 - sLife) });
      }
    }

    // Fuel-dependent glow intensity
    const glowAlpha = state.fuel * 0.1;
    g.circle(px, py - 5, 14).fill({ color: LF.COLOR_FLAME, alpha: glowAlpha * 0.5 });
    g.circle(px, py - 4, 10).fill({ color: LF.COLOR_FLAME, alpha: glowAlpha });

    // Flare cooldown indicator
    if (state.flareCooldown > 0) {
      const fill = 1.0 - state.flareCooldown / state.flareCooldownBase;
      const arcEnd = fill * Math.PI * 2;
      g.setStrokeStyle({ width: 1.5, color: LF.COLOR_FLAME, alpha: 0.2 });
      g.moveTo(px + Math.cos(-Math.PI / 2) * 14, py + Math.sin(-Math.PI / 2) * 14);
      const steps = Math.max(3, Math.floor(arcEnd * 4));
      for (let s = 1; s <= steps; s++) {
        const a = -Math.PI / 2 + arcEnd * (s / steps);
        g.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14);
      }
      g.stroke();
    } else if (state.fuel >= LF.FLARE_COST + 0.05) {
      // Ready indicator
      const pulse = 0.12 + Math.sin(t * 4) * 0.08;
      g.setStrokeStyle({ width: 1, color: LF.COLOR_FLAME, alpha: pulse });
      g.circle(px, py, 14).stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Darkness overlay — the core visual effect
  // ---------------------------------------------------------------------------

  private _drawDarkness(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    // Light wobble — organic feel + wind hazard pushes light off-center
    const windStrength = state.roomConfig.hazard === "wind" ? 8 : 0;
    const wobX = Math.sin(state.time * 3.5) * 2 + Math.sin(state.time * 1.2) * windStrength;
    const wobY = Math.cos(state.time * 2.8) * 1.5 + Math.cos(state.time * 0.9) * windStrength * 0.7;
    const px = ox + state.playerX + wobX, py = oy + state.playerY + wobY;
    const lr = state.lightRadius;
    const sw = this._sw, sh = this._sh;

    // Smooth gradient darkness with atmospheric color transition
    // Inner rings: warm darkness (lit by flame), outer rings: cold darkness
    for (let layer = 0; layer < 12; layer++) {
      const layerR = lr + layer * 11;
      const layerAlpha = Math.min(0.93, 0.06 + layer * 0.08);
      // Color transitions from warm dark-brown to cold dark-blue
      const warmth = Math.max(0, 1 - layer / 6);
      const ringColor = warmth > 0.3 ? 0x080406 : LF.COLOR_DARKNESS; // warm near light, cold far
      g.setStrokeStyle({ width: 13, color: ringColor, alpha: layerAlpha });
      g.circle(px, py, layerR).stroke();
    }

    // Atmospheric haze at the transition zone (subtle purple mist at light edge)
    const hazePulse = 0.015 + Math.sin(state.time * 0.8) * 0.005;
    g.setStrokeStyle({ width: 25, color: 0x1a0e2e, alpha: hazePulse });
    g.circle(px, py, lr + 5).stroke();

    // Solid darkness beyond gradient — overlap-safe coverage
    const solidR = lr + 130;
    g.rect(-10, -10, sw + 20, Math.max(0, py - solidR + 10)).fill({ color: LF.COLOR_DARKNESS, alpha: 0.96 });
    g.rect(-10, py + solidR, sw + 20, Math.max(0, sh - py - solidR + 20)).fill({ color: LF.COLOR_DARKNESS, alpha: 0.96 });
    g.rect(-10, Math.max(-10, py - solidR), Math.max(0, px - solidR + 10), solidR * 2).fill({ color: LF.COLOR_DARKNESS, alpha: 0.96 });
    g.rect(Math.min(sw + 10, px + solidR), Math.max(-10, py - solidR), Math.max(0, sw - px - solidR + 20), solidR * 2).fill({ color: LF.COLOR_DARKNESS, alpha: 0.96 });

    // Light edge glow with warm color
    g.setStrokeStyle({ width: 3, color: LF.COLOR_LIGHT_EDGE, alpha: 0.12 });
    g.circle(px, py, lr).stroke();
    g.setStrokeStyle({ width: 1, color: LF.COLOR_LIGHT, alpha: 0.06 });
    g.circle(px, py, lr * 0.95).stroke();

    // Invulnerability flash — dramatic pulsing ring at light boundary
    if (state.invulnTimer > 0) {
      const invRatio = state.invulnTimer / LF.INVULN_DURATION;
      const flash = Math.sin(state.time * 25) > 0 ? 1 : 0.3;
      // Pulsing red ring at light edge
      g.setStrokeStyle({ width: 3, color: LF.COLOR_DANGER, alpha: invRatio * 0.25 * flash });
      g.circle(px, py, lr * 0.95).stroke();
      // Inner red pulse
      g.circle(px, py, lr * 0.4).fill({ color: LF.COLOR_DANGER, alpha: invRatio * 0.06 * flash });
      // Red tint at edges
      const edgeThickness = 15;
      g.rect(0, 0, this._sw, edgeThickness).fill({ color: LF.COLOR_DANGER, alpha: invRatio * 0.1 * flash });
      g.rect(0, this._sh - edgeThickness, this._sw, edgeThickness).fill({ color: LF.COLOR_DANGER, alpha: invRatio * 0.1 * flash });
    }

    // Sprint visual — radiant sprint aura
    if (state.sprinting) {
      const sprintPulse = 0.04 + Math.sin(state.time * 10) * 0.025;
      // Warm aura expanding around flame
      g.circle(px, py, lr * 0.35).fill({ color: LF.COLOR_FLAME, alpha: sprintPulse });
      // Ember sparks trailing outward
      for (let s = 0; s < 4; s++) {
        const sa = state.time * 6 + s * Math.PI / 2;
        const sr = 10 + Math.sin(state.time * 8 + s) * 5;
        g.circle(px + Math.cos(sa) * sr, py + Math.sin(sa) * sr, 1.5)
          .fill({ color: LF.COLOR_FLAME_CORE, alpha: sprintPulse * 2 });
      }
      // Brighter light edge
      g.setStrokeStyle({ width: 1.5, color: LF.COLOR_FLAME, alpha: sprintPulse * 1.5 });
      g.circle(px, py, lr * 0.97).stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Flare effect — bright burst
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Arena boundary — visible walls when light reaches edges
  // ---------------------------------------------------------------------------

  private _drawBoundary(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const px = state.playerX, py = state.playerY;
    const lr = state.lightRadius;
    const aw = state.arenaW, ah = state.arenaH;
    const wallColor = 0x2a2233;
    const wallHighlight = 0x3a3243;
    const wallDark = 0x16121e;
    const brickH = 6; // wall thickness

    // Helper to draw a textured wall segment
    const drawWall = (x: number, y: number, w: number, h: number, vis: number, horizontal: boolean) => {
      // Base wall
      g.rect(x, y, w, h).fill({ color: wallColor, alpha: vis });
      // Highlight edge (light-facing)
      if (horizontal) {
        g.rect(x, y, w, 1).fill({ color: wallHighlight, alpha: vis * 0.5 });
        g.rect(x, y + h - 1, w, 1).fill({ color: wallDark, alpha: vis * 0.4 });
      } else {
        g.rect(x, y, 1, h).fill({ color: wallHighlight, alpha: vis * 0.5 });
        g.rect(x + w - 1, y, 1, h).fill({ color: wallDark, alpha: vis * 0.4 });
      }
      // Stone block pattern (mortar lines)
      if (vis > 0.2) {
        const blockSize = horizontal ? 18 : 14;
        g.setStrokeStyle({ width: 0.5, color: wallDark, alpha: vis * 0.25 });
        if (horizontal) {
          for (let bx = x; bx < x + w; bx += blockSize) {
            g.moveTo(bx, y).lineTo(bx, y + h).stroke();
          }
        } else {
          for (let by = y; by < y + h; by += blockSize) {
            g.moveTo(x, by).lineTo(x + w, by).stroke();
          }
        }
      }
    };

    // Top wall
    if (py < lr + 5) {
      const vis = Math.max(0, 1 - py / lr) * 0.7;
      const x1 = Math.max(0, px - lr), x2 = Math.min(aw, px + lr);
      drawWall(ox + x1, oy, x2 - x1, brickH, vis, true);
    }
    // Bottom wall
    if (ah - py < lr + 5) {
      const vis = Math.max(0, 1 - (ah - py) / lr) * 0.7;
      const x1 = Math.max(0, px - lr), x2 = Math.min(aw, px + lr);
      drawWall(ox + x1, oy + ah - brickH, x2 - x1, brickH, vis, true);
    }
    // Left wall
    if (px < lr + 5) {
      const vis = Math.max(0, 1 - px / lr) * 0.7;
      const y1 = Math.max(0, py - lr), y2 = Math.min(ah, py + lr);
      drawWall(ox, oy + y1, brickH, y2 - y1, vis, false);
    }
    // Right wall
    if (aw - px < lr + 5) {
      const vis = Math.max(0, 1 - (aw - px) / lr) * 0.7;
      const y1 = Math.max(0, py - lr), y2 = Math.min(ah, py + lr);
      drawWall(ox + aw - brickH, oy + y1, brickH, y2 - y1, vis, false);
      g.rect(ox + aw - 1, oy + y1, 1, y2 - y1).fill({ color: wallHighlight, alpha: vis * 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Directional indicators — arrows at light edge for off-screen oil/stalkers
  // ---------------------------------------------------------------------------

  private _drawIndicators(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    const px = ox + state.playerX, py = oy + state.playerY;
    const lr = state.lightRadius;
    const t = state.time;

    // Oil indicators — point toward off-screen oil drops
    for (const o of state.oilDrops) {
      const dx = o.x - state.playerX, dy = o.y - state.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < lr * 0.8) continue; // already visible, no need
      if (dist > 500) continue; // too far to indicate

      const nx = dx / dist, ny = dy / dist;
      const indR = lr * 0.85;
      const ix = px + nx * indR, iy = py + ny * indR;

      // Golden arrow pointing outward
      const arrowSize = 5;
      const perpX = -ny, perpY = nx;
      const pulse = 0.3 + Math.sin(t * 4 + o.pulse) * 0.15;
      g.moveTo(ix + nx * arrowSize, iy + ny * arrowSize)
        .lineTo(ix + perpX * arrowSize * 0.5, iy + perpY * arrowSize * 0.5)
        .lineTo(ix - perpX * arrowSize * 0.5, iy - perpY * arrowSize * 0.5)
        .closePath().fill({ color: LF.COLOR_OIL, alpha: pulse });

      // Distance hint — larger arrow for closer oil
      const closeness = 1 - Math.min(1, (dist - lr) / 200);
      if (closeness > 0.3) {
        g.circle(ix, iy, 3 + closeness * 3).fill({ color: LF.COLOR_OIL_GLOW, alpha: pulse * 0.3 });
      }
    }

    // Stalker indicator — purple arrow for active stalkers
    for (const s of state.shadows) {
      if (!s.alive || s.variant !== "stalker") continue;
      const dx = s.x - state.playerX, dy = s.y - state.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < lr) continue;

      const nx = dx / dist, ny = dy / dist;
      const indR = lr * 0.9;
      const ix = px + nx * indR, iy = py + ny * indR;
      const perpX = -ny, perpY = nx;
      const pulse = 0.2 + Math.sin(t * 3 + s.eyePhase) * 0.1;

      g.moveTo(ix + nx * 4, iy + ny * 4)
        .lineTo(ix + perpX * 3, iy + perpY * 3)
        .lineTo(ix - perpX * 3, iy - perpY * 3)
        .closePath().fill({ color: LF.COLOR_SHADOW_EYE, alpha: pulse });
    }
  }

  private _drawFlareEffect(g: Graphics, state: LFState): void {
    if (state.flareTimer <= 0) return;
    const ox = this._ox, oy = this._oy;
    const px = ox + state.playerX, py = oy + state.playerY;
    const ratio = state.flareTimer / LF.FLARE_DURATION;
    const r = state.flareRadius;
    const t = state.time;

    // Outer glow burst
    g.circle(px, py, r * 1.1).fill({ color: LF.COLOR_FLARE, alpha: ratio * 0.06 });
    g.circle(px, py, r).fill({ color: LF.COLOR_FLARE, alpha: ratio * 0.1 });
    g.circle(px, py, r * 0.6).fill({ color: LF.COLOR_FLAME, alpha: ratio * 0.12 });
    g.circle(px, py, r * 0.3).fill({ color: LF.COLOR_FLAME_CORE, alpha: ratio * 0.08 });

    // Multiple expanding shockwave rings
    for (let ring = 0; ring < 3; ring++) {
      const ringPhase = ratio - ring * 0.15;
      if (ringPhase <= 0 || ringPhase > 1) continue;
      const ringR = r * (1 - ringPhase) * 1.2;
      g.setStrokeStyle({ width: 3 - ring, color: LF.COLOR_FLARE, alpha: ringPhase * 0.3 });
      g.circle(px, py, ringR).stroke();
    }

    // Light spikes (radial lines outward)
    if (ratio > 0.3) {
      const spikeAlpha = (ratio - 0.3) * 0.2;
      for (let s = 0; s < 8; s++) {
        const sa = s * Math.PI / 4 + t * 2;
        const innerR = r * 0.15;
        const outerR = r * ratio * 0.8;
        g.setStrokeStyle({ width: 2, color: LF.COLOR_FLARE, alpha: spikeAlpha });
        g.moveTo(px + Math.cos(sa) * innerR, py + Math.sin(sa) * innerR)
          .lineTo(px + Math.cos(sa) * outerR, py + Math.sin(sa) * outerR).stroke();
      }
    }

    // Central white flash
    g.circle(px, py, 15 * ratio).fill({ color: 0xffffff, alpha: ratio * 0.15 });
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------

  private _drawParticles(g: Graphics, state: LFState): void {
    const ox = this._ox, oy = this._oy;
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      const ppx = ox + p.x, ppy = oy + p.y;
      const sz = p.size * alpha;

      // Motion trail
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 10) {
        const tdx = -p.vx / spd, tdy = -p.vy / spd;
        g.setStrokeStyle({ width: sz * 0.5, color: p.color, alpha: alpha * 0.1 });
        g.moveTo(ppx, ppy).lineTo(ppx + tdx * sz * 2, ppy + tdy * sz * 2).stroke();
      }

      // Glow
      g.circle(ppx, ppy, sz * 1.6).fill({ color: p.color, alpha: alpha * 0.12 });
      // Core — diamond for larger particles
      if (p.size > 3) {
        g.moveTo(ppx, ppy - sz).lineTo(ppx + sz * 0.5, ppy).lineTo(ppx, ppy + sz).lineTo(ppx - sz * 0.5, ppy)
          .closePath().fill({ color: p.color, alpha });
      } else {
        g.circle(ppx, ppy, sz).fill({ color: p.color, alpha });
      }
      // Hot core
      if (alpha > 0.4) {
        g.circle(ppx, ppy, sz * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.25 });
      }
    }
  }

  private _drawFloatTexts(state: LFState): void {
    const ox = this._ox, oy = this._oy;
    for (const t of this._floatTexts) t.visible = false;
    const count = Math.min(state.floatTexts.length, FLOAT_POOL);
    for (let i = 0; i < count; i++) {
      const ft = state.floatTexts[state.floatTexts.length - 1 - i];
      const txt = this._floatTexts[i];
      txt.visible = true; txt.text = ft.text; txt.style.fill = ft.color;
      txt.position.set(ox + ft.x, oy + ft.y);
      txt.alpha = ft.life / ft.maxLife;
      txt.scale.set(ft.scale * (0.8 + (ft.life / ft.maxLife) * 0.2));
    }
  }

  // ---------------------------------------------------------------------------
  // HUD — fuel meter + score
  // ---------------------------------------------------------------------------

  private _drawHUD(state: LFState): void {
    if (state.phase !== LFPhase.PLAYING && state.phase !== LFPhase.PAUSED && state.phase !== LFPhase.DYING) {
      this._hudText.visible = false; return;
    }
    this._hudText.visible = true;
    const ug = this._uiGfx;
    const t = state.time;
    const cx = this._sw / 2;

    // HUD panel background
    ug.roundRect(cx - 85, 4, 170, 22, 6).fill({ color: 0x000000, alpha: 0.4 });
    ug.setStrokeStyle({ width: 1, color: LF.COLOR_FLAME, alpha: 0.08 });
    ug.roundRect(cx - 85, 4, 170, 22, 6).stroke();

    // Fuel bar with ornamental frame
    const barW = 140, barH = 8;
    const bx = cx - barW / 2, by = 10;
    // Outer frame
    ug.roundRect(bx - 2, by - 2, barW + 4, barH + 4, 4).fill({ color: 0x000000, alpha: 0.35 });
    // Background
    ug.rect(bx, by, barW, barH).fill({ color: 0x1a1a1a, alpha: 0.6 });
    // Fuel fill
    const fuelColor = state.fuel > 0.3 ? LF.COLOR_FLAME : state.fuel > 0.15 ? 0xff6600 : LF.COLOR_DANGER;
    const fillW = barW * state.fuel;
    ug.rect(bx, by, fillW, barH).fill({ color: fuelColor, alpha: 0.8 });
    // Shine highlight
    ug.rect(bx, by, fillW, 2).fill({ color: 0xffffff, alpha: 0.15 });

    // Low fuel danger pulse on bar edge
    if (state.fuel < 0.3 && state.fuel > 0) {
      const dangerPulse = Math.sin(t * 8) > 0 ? 0.25 : 0.1;
      ug.rect(bx + fillW - 3, by, 3, barH).fill({ color: LF.COLOR_DANGER, alpha: dangerPulse });
    }

    // Flame icon (left of bar)
    ug.circle(bx - 10, by + barH / 2, 4).fill({ color: LF.COLOR_FLAME, alpha: 0.4 });
    ug.circle(bx - 10, by + barH / 2 - 2, 2.5).fill({ color: LF.COLOR_FLAME_CORE, alpha: 0.5 });
    ug.circle(bx - 10, by + barH / 2 - 4, 1.5).fill({ color: 0xffffff, alpha: 0.3 });

    // Fuel percentage (right of bar)
    ug.circle(bx + barW + 10, by + barH / 2, 8).fill({ color: 0x000000, alpha: 0.25 });

    // Score + wave text
    const roomLabel = state.roomDepth > 0 ? `  |  Depth: ${state.roomDepth + 1}` : "";
    this._hudText.text = `Score: ${Math.floor(state.score)}  |  Wave: ${state.wave}${roomLabel}  |  ${Math.floor(state.time)}s`;
  }

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------

  private _drawStartScreen(state: LFState, meta: LFMeta): void {
    const show = state.phase === LFPhase.START;
    this._titleText.visible = show; this._subtitleText.visible = show;
    this._promptText.visible = show; this._controlsText.visible = show;
    if (!show) { this._controlsText.visible = false; return; }
    const cx = this._sw / 2, cy = this._sh / 2;
    const g = this._gfx;
    const t = state.time;

    // Animated candle flame demo in background
    const flicker = Math.sin(t * 8) * 3;
    g.circle(cx, cy + 30, 80).fill({ color: LF.COLOR_FLAME_OUTER, alpha: 0.03 });
    g.circle(cx, cy + 25, 50).fill({ color: LF.COLOR_FLAME, alpha: 0.05 });
    g.circle(cx, cy + 20 + flicker, 20).fill({ color: LF.COLOR_FLAME, alpha: 0.08 });
    g.circle(cx, cy + 15 + flicker, 10).fill({ color: LF.COLOR_FLAME_CORE, alpha: 0.1 });

    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.6 });

    // Frame
    const fw = Math.min(480, this._sw - 60), fh = 340;
    const fx = cx - fw / 2, fy = cy - fh / 2;
    g.setStrokeStyle({ width: 1.5, color: LF.COLOR_FLAME, alpha: 0.2 });
    g.roundRect(fx, fy, fw, fh, 6).stroke();

    this._titleText.anchor.set(0.5); this._titleText.position.set(cx, cy - 110);
    this._subtitleText.anchor.set(0.5); this._subtitleText.position.set(cx, cy - 65);

    this._controlsText.anchor.set(0.5);
    this._controlsText.position.set(cx, cy - 10);
    this._controlsText.text = [
      "WASD  -  Move       SPACE  -  Flare       SHIFT  -  Sprint",
      "",
      "Keep your flame alive. Collect oil. Survive the dark.",
      "Arrows guide you to oil beyond the light.",
    ].join("\n");

    if (meta.gamesPlayed > 0) {
      this._statText.visible = true;
      this._statText.anchor.set(0.5); this._statText.position.set(cx, cy + 65);
      const msProg = meta.milestones ? meta.milestones.length : 0;
      this._statText.text = `Best: ${meta.highScore}  |  Time: ${meta.bestTime}s  |  Games: ${meta.gamesPlayed}  |  Milestones: ${msProg}/15`;
    } else { this._statText.visible = false; }

    this._promptText.anchor.set(0.5); this._promptText.position.set(cx, cy + 105);
    this._promptText.alpha = 0.5 + Math.sin(t * 3) * 0.4;
  }

  private _drawPauseScreen(state: LFState): void {
    const show = state.phase === LFPhase.PAUSED;
    this._pauseText.visible = show;
    if (!show) return;
    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.6 });
    const cx = this._sw / 2, cy = this._sh / 2;
    ug.roundRect(cx - 100, cy - 30, 200, 60, 8).fill({ color: 0x0a0808, alpha: 0.7 });
    ug.setStrokeStyle({ width: 1.5, color: LF.COLOR_FLAME, alpha: 0.2 });
    ug.roundRect(cx - 100, cy - 30, 200, 60, 8).stroke();
    this._pauseText.anchor.set(0.5); this._pauseText.position.set(cx, cy);
    this._pauseText.alpha = 0.7 + Math.sin(state.time * 2) * 0.3;
  }

  private _drawDeathScreen(state: LFState, meta: LFMeta): void {
    const show = state.phase === LFPhase.DEAD;
    this._gradeText.visible = show; this._statText.visible = show; this._deathPrompt.visible = show;
    for (const st of this._shopTexts) st.visible = false;
    if (!show) return;
    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.8 });

    const cx = this._sw / 2, cy = this._sh / 2;
    const score = Math.floor(state.score);
    const grade = getLFGrade(score);
    const isNew = score >= meta.highScore && score > 0;
    const t = state.time;

    // "The flame has died" visual — dying ember
    const emberPulse = 0.03 + Math.sin(t * 1.5) * 0.02;
    ug.circle(cx, cy - 120, 30).fill({ color: LF.COLOR_FLAME_OUTER, alpha: emberPulse });
    ug.circle(cx, cy - 120, 15).fill({ color: LF.COLOR_FLAME, alpha: emberPulse * 2 });

    // Grade
    const breathe = 1.0 + Math.sin(t * 2) * 0.05;
    ug.circle(cx, cy - 80, 32 * breathe).fill({ color: grade.color, alpha: 0.1 });
    ug.setStrokeStyle({ width: 2, color: grade.color, alpha: 0.4 });
    ug.circle(cx, cy - 80, 26 * breathe).stroke();

    this._gradeText.anchor.set(0.5); this._gradeText.position.set(cx, cy - 80);
    this._gradeText.text = grade.grade; this._gradeText.style.fill = grade.color;
    this._gradeText.scale.set(breathe);

    if (isNew) {
      ug.roundRect(cx - 70, cy - 48, 140, 18, 3).fill({ color: 0xffd700, alpha: 0.1 });
    }

    const embersEarned = Math.floor(score / 10);
    const msProgress = meta.milestones ? meta.milestones.length : 0;
    this._statText.anchor.set(0.5); this._statText.position.set(cx, cy - 10);
    const statLines = [
      `Score: ${score}${isNew ? "  ** NEW BEST **" : ""}`,
      `Survived: ${Math.floor(state.time)}s  |  Wave: ${state.wave}  |  Shadows: ${state.shadowsBurned}`,
      `Flares: ${state.flaresUsed}  |  Hits: ${state.hitsAbsorbed}  |  +${embersEarned} embers`,
      `${state.deathCause || "Unknown cause"}`,
    ];
    if (state.activeMutators.length > 0) {
      statLines.push(`Mutators: ${state.activeMutators.join(", ")}`);
    }
    statLines.push(`Milestones: ${msProgress}/15`);
    this._statText.text = statLines.join("\n");

    // Upgrade shop with text labels
    const shopY = cy + 55;
    const ups = meta.upgrades || { startFuel: 0, flareCooldown: 0, lightRecovery: 0, oilMagnet: 0, doubleFlare: 0, oilFrequency: 0, startingMutator: 0 };
    const shopItems = [
      { name: "Start Fuel +5%", key: "startFuel" },
      { name: "Flare CD -0.5s", key: "flareCooldown" },
      { name: "Light Recovery", key: "lightRecovery" },
      { name: "Oil Magnet", key: "oilMagnet" },
      { name: "Double Flare", key: "doubleFlare" },
      { name: "Oil Frequency", key: "oilFrequency" },
      { name: "Start w/ Mutator", key: "startingMutator" },
    ];
    const costTable = LF.UPGRADE_COSTS as Record<string, number[]>;

    ug.roundRect(cx - 155, shopY - 5, 310, shopItems.length * 18 + 22, 5).fill({ color: 0x0a0808, alpha: 0.65 });
    ug.setStrokeStyle({ width: 1, color: LF.COLOR_FLAME, alpha: 0.15 });
    ug.roundRect(cx - 155, shopY - 5, 310, shopItems.length * 18 + 22, 5).stroke();
    // Title bar
    ug.roundRect(cx - 155, shopY - 5, 310, 16, 5).fill({ color: 0x1a1210, alpha: 0.5 });

    for (let i = 0; i < shopItems.length; i++) {
      const item = shopItems[i];
      const costs = costTable[item.key] || [];
      const level = (ups as unknown as Record<string, number>)[item.key] || 0;
      const maxed = level >= costs.length;
      const cost = maxed ? 0 : costs[level];
      const canBuy = !maxed && meta.embers >= cost;
      const iy = shopY + 17 + i * 18;

      // Level pips
      for (let l = 0; l < costs.length; l++) {
        ug.circle(cx + 105 + l * 12, iy + 2, 3.5).fill({ color: 0x000000, alpha: 0.3 });
        ug.circle(cx + 105 + l * 12, iy + 2, 3).fill({ color: l < level ? LF.COLOR_FLAME : 0x222222, alpha: 0.8 });
      }

      // Buyable highlight
      if (canBuy) {
        ug.roundRect(cx - 150, iy - 5, 305, 16, 2).fill({ color: LF.COLOR_OIL, alpha: 0.04 });
      }

      // Text label with name + cost
      const st = this._shopTexts[i];
      if (st) {
        st.visible = true;
        if (maxed) {
          st.text = `[${i + 1}] ${item.name}  -  MAX`;
          st.style.fill = 0x44aa44;
        } else {
          st.text = `[${i + 1}] ${item.name}  -  ${cost} embers`;
          st.style.fill = canBuy ? LF.COLOR_OIL : 0x555544;
        }
        st.position.set(cx - 145, iy - 4);
      }
    }

    this._deathPrompt.anchor.set(0.5); this._deathPrompt.position.set(cx, cy + 130);
    this._deathPrompt.text = `Embers: ${meta.embers}  |  1-7 upgrade  |  SPACE retry  |  ESC exit`;
    this._deathPrompt.alpha = 0.5 + Math.sin(t * 3) * 0.4;
  }
}
