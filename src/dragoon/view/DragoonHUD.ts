// ---------------------------------------------------------------------------
// Panzer Dragoon mode — HUD (health, mana, score, wave, skills, combo)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { DragoonState } from "../state/DragoonState";
import { DragoonSkillId } from "../state/DragoonState";
import { SKILL_CONFIGS } from "../config/DragoonConfig";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCORE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 24, fill: 0xffd700,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 }, letterSpacing: 2,
});

const STYLE_WAVE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 18, fill: 0xccddff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
});

const STYLE_COMBO = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 20, fill: 0xff8844,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 }, fontStyle: "italic",
});

const STYLE_SKILL_NAME = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 9, fill: 0xcccccc,
});

const STYLE_SKILL_KEY = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 10, fill: 0xffffff, fontWeight: "bold",
});

const STYLE_NOTIFICATION = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 28, fill: 0xffffff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, alpha: 0.8 }, letterSpacing: 3,
});

const STYLE_BOSS_WARNING = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 36, fill: 0xff4444,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, alpha: 0.8 }, letterSpacing: 4, fontStyle: "italic",
});

const STYLE_BETWEEN_WAVE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 22, fill: 0x88ccff,
  fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 },
});

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export class DragoonHUD {
  readonly container = new Container();

  private _hpBarBg = new Graphics();
  private _hpBarFill = new Graphics();
  private _manaBarBg = new Graphics();
  private _manaBarFill = new Graphics();
  private _scoreText = new Text({ text: "0", style: STYLE_SCORE });
  private _waveText = new Text({ text: "Wave 1", style: STYLE_WAVE });
  private _comboText = new Text({ text: "", style: STYLE_COMBO });
  private _skillBg = new Graphics();
  private _skillTexts: { name: Text; key: Text; cooldown: Graphics }[] = [];
  private _bossHpBg = new Graphics();
  private _bossHpFill = new Graphics();
  private _bossNameText = new Text({ text: "", style: STYLE_WAVE });

  // Notifications
  private _notifications: { text: Text; timer: number }[] = [];

  // Boss warning
  private _bossWarningText = new Text({ text: "BOSS INCOMING!", style: STYLE_BOSS_WARNING });
  private _bossWarningTimer = 0;

  // Between waves text
  private _betweenWaveText = new Text({ text: "", style: STYLE_BETWEEN_WAVE });

  build(sw: number, sh: number): void {
    this.container.removeChildren();

    // HP bar (top-left)
    this.container.addChild(this._hpBarBg);
    this.container.addChild(this._hpBarFill);

    // Mana bar (below HP)
    this.container.addChild(this._manaBarBg);
    this.container.addChild(this._manaBarFill);

    // Score (top-right)
    this._scoreText.anchor.set(1, 0);
    this._scoreText.position.set(sw - 20, 15);
    this.container.addChild(this._scoreText);

    // Wave (top-center)
    this._waveText.anchor.set(0.5, 0);
    this._waveText.position.set(sw / 2, 10);
    this.container.addChild(this._waveText);

    // Combo (below wave)
    this._comboText.anchor.set(0.5, 0);
    this._comboText.position.set(sw / 2, 35);
    this.container.addChild(this._comboText);

    // Skill bar (bottom-center)
    this.container.addChild(this._skillBg);
    this._buildSkillBar(sw, sh);

    // Boss HP bar (top, full width, hidden by default)
    this.container.addChild(this._bossHpBg);
    this.container.addChild(this._bossHpFill);
    this._bossNameText.anchor.set(0.5, 1);
    this.container.addChild(this._bossNameText);

    // Boss warning
    this._bossWarningText.anchor.set(0.5, 0.5);
    this._bossWarningText.position.set(sw / 2, sh / 2 - 50);
    this._bossWarningText.alpha = 0;
    this.container.addChild(this._bossWarningText);

    // Between wave text
    this._betweenWaveText.anchor.set(0.5, 0.5);
    this._betweenWaveText.position.set(sw / 2, sh / 2);
    this.container.addChild(this._betweenWaveText);
  }

  private _buildSkillBar(sw: number, sh: number): void {
    const skills = [
      DragoonSkillId.STARFALL,
      DragoonSkillId.THUNDERSTORM,
      DragoonSkillId.FROST_NOVA,
      DragoonSkillId.METEOR_SHOWER,
    ];

    const slotW = 60;
    const slotH = 50;
    const gap = 8;
    const totalW = skills.length * slotW + (skills.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const y = sh - slotH - 15;

    this._skillTexts = [];
    for (let i = 0; i < skills.length; i++) {
      const cfg = SKILL_CONFIGS[skills[i]];
      const x = startX + i * (slotW + gap);

      const name = new Text({ text: cfg.name, style: STYLE_SKILL_NAME });
      name.anchor.set(0.5, 0);
      name.position.set(x + slotW / 2, y + slotH + 2);

      const key = new Text({ text: cfg.key, style: STYLE_SKILL_KEY });
      key.anchor.set(0.5, 0.5);
      key.position.set(x + slotW / 2, y + slotH / 2);

      const cooldown = new Graphics();

      this.container.addChild(name);
      this.container.addChild(key);
      this.container.addChild(cooldown);

      this._skillTexts.push({ name, key, cooldown });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: DragoonState, sw: number, sh: number, dt: number): void {
    const p = state.player;

    // HP bar — gradient fill with shine
    const hpX = 20, hpY = 15, hpW = 180, hpH = 16;
    this._hpBarBg.clear();
    // Dark backing with inner shadow
    this._hpBarBg.roundRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2, 5).fill({ color: 0x110000 });
    this._hpBarBg.roundRect(hpX, hpY, hpW, hpH, 4).fill({ color: 0x220000 });
    this._hpBarBg.roundRect(hpX, hpY, hpW, hpH, 4).stroke({ color: 0x884444, width: 1.5 });
    // Inner shadow at top
    this._hpBarBg.roundRect(hpX + 1, hpY + 1, hpW - 2, 3, 2).fill({ color: 0x000000, alpha: 0.2 });
    this._hpBarFill.clear();
    const hpPct = p.hp / p.maxHp;
    const hpColor = hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xccaa22 : 0xcc2222;
    const hpColorBright = hpPct > 0.5 ? 0x66ee66 : hpPct > 0.25 ? 0xeedd44 : 0xee4444;
    const fillW = (hpW - 2) * hpPct;
    // Main fill
    this._hpBarFill.roundRect(hpX + 1, hpY + 1, fillW, hpH - 2, 3).fill({ color: hpColor });
    // Gradient effect — brighter top half
    this._hpBarFill.roundRect(hpX + 1, hpY + 1, fillW, (hpH - 2) * 0.45, 3).fill({ color: hpColorBright, alpha: 0.4 });
    // Shine streak
    this._hpBarFill.roundRect(hpX + 2, hpY + 2, fillW - 2, 2, 1).fill({ color: 0xffffff, alpha: 0.15 });
    // Animated shine glint
    const shineX = ((state.gameTime * 40) % (hpW + 30)) - 15;
    if (shineX > hpX && shineX < hpX + fillW) {
      this._hpBarFill.roundRect(shineX, hpY + 2, 12, hpH - 4, 2).fill({ color: 0xffffff, alpha: 0.08 });
    }
    // HP glow when low — pulsating border
    if (hpPct < 0.25) {
      const pulseAlpha = 0.15 + Math.sin(state.gameTime * 6) * 0.08;
      this._hpBarFill.roundRect(hpX - 2, hpY - 2, hpW + 4, hpH + 4, 6).fill({ color: 0xff0000, alpha: pulseAlpha });
      this._hpBarFill.roundRect(hpX, hpY, hpW, hpH, 4).stroke({ color: 0xff4444, width: 1, alpha: pulseAlpha * 2 });
    }
    // Label icon (heart shape approximation)
    this._hpBarBg.circle(hpX - 8, hpY + hpH / 2 - 1, 3).fill({ color: 0xff4444, alpha: 0.7 });
    this._hpBarBg.circle(hpX - 5, hpY + hpH / 2 - 1, 3).fill({ color: 0xff4444, alpha: 0.7 });
    this._hpBarBg.moveTo(hpX - 10, hpY + hpH / 2).lineTo(hpX - 6.5, hpY + hpH / 2 + 4).lineTo(hpX - 3, hpY + hpH / 2).fill({ color: 0xff4444, alpha: 0.7 });

    // Mana bar — gradient fill with shine
    const manaX = 20, manaY = hpY + hpH + 6, manaW = 180, manaH = 12;
    this._manaBarBg.clear();
    this._manaBarBg.roundRect(manaX - 1, manaY - 1, manaW + 2, manaH + 2, 4).fill({ color: 0x000011 });
    this._manaBarBg.roundRect(manaX, manaY, manaW, manaH, 3).fill({ color: 0x000022 });
    this._manaBarBg.roundRect(manaX, manaY, manaW, manaH, 3).stroke({ color: 0x4444aa, width: 1.5 });
    this._manaBarBg.roundRect(manaX + 1, manaY + 1, manaW - 2, 2, 1).fill({ color: 0x000000, alpha: 0.2 });
    this._manaBarFill.clear();
    const manaPct = p.mana / p.maxMana;
    const manaFillW = (manaW - 2) * manaPct;
    this._manaBarFill.roundRect(manaX + 1, manaY + 1, manaFillW, manaH - 2, 2).fill({ color: 0x4488ff });
    // Mana gradient top
    this._manaBarFill.roundRect(manaX + 1, manaY + 1, manaFillW, (manaH - 2) * 0.4, 2).fill({ color: 0x66aaff, alpha: 0.4 });
    // Mana shine
    this._manaBarFill.roundRect(manaX + 2, manaY + 2, manaFillW - 2, 1.5, 1).fill({ color: 0xffffff, alpha: 0.12 });
    // Mana icon (diamond)
    this._manaBarBg.moveTo(manaX - 6.5, manaY + manaH / 2).lineTo(manaX - 3, manaY + 1).lineTo(manaX + 0.5, manaY + manaH / 2).lineTo(manaX - 3, manaY + manaH - 1).fill({ color: 0x4488ff, alpha: 0.7 });

    // Score
    this._scoreText.text = `${p.score.toLocaleString()}`;

    // Wave
    if (state.betweenWaves) {
      if (state.wave === 0) {
        this._waveText.text = "Get Ready!";
      } else {
        this._waveText.text = `Wave ${state.wave} Complete`;
      }
    } else {
      this._waveText.text = `Wave ${state.wave} / ${state.totalWaves}`;
    }

    // Combo — with animated scaling and color shift
    if (p.comboCount > 2) {
      this._comboText.text = `${p.comboCount}x COMBO`;
      this._comboText.alpha = Math.min(1, p.comboTimer);
      const comboPulse = Math.sin(state.gameTime * 8) * 0.03;
      this._comboText.scale.set(1 + Math.min(0.4, p.comboCount * 0.025) + comboPulse);
      // Color shift: orange -> yellow -> white as combo grows
      if (p.comboCount > 20) {
        this._comboText.style.fill = 0xffffff;
      } else if (p.comboCount > 10) {
        this._comboText.style.fill = 0xffdd44;
      } else {
        this._comboText.style.fill = 0xff8844;
      }
      // Rotate slightly for dynamism
      this._comboText.rotation = Math.sin(state.gameTime * 5) * 0.03;
    } else {
      this._comboText.text = "";
      this._comboText.rotation = 0;
    }

    // Skill bar
    const skills = [
      DragoonSkillId.STARFALL,
      DragoonSkillId.THUNDERSTORM,
      DragoonSkillId.FROST_NOVA,
      DragoonSkillId.METEOR_SHOWER,
    ];
    const slotW = 60, slotH = 50, gap = 8;
    const totalW = skills.length * slotW + (skills.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const barY = sh - slotH - 15;

    this._skillBg.clear();
    // Background panel — more polished
    this._skillBg.roundRect(startX - 12, barY - 7, totalW + 24, slotH + 29, 8).fill({ color: 0x050510, alpha: 0.8 });
    this._skillBg.roundRect(startX - 12, barY - 7, totalW + 24, slotH + 29, 8).stroke({ color: 0x334466, width: 1.5 });
    // Inner highlight line at top
    this._skillBg.roundRect(startX - 10, barY - 6, totalW + 20, 1, 4).fill({ color: 0x556688, alpha: 0.3 });

    for (let i = 0; i < skills.length; i++) {
      const skillState = state.skills.find(s => s.id === skills[i])!;
      const cfg = SKILL_CONFIGS[skills[i]];
      const x = startX + i * (slotW + gap);

      // Slot background — layered
      const onCooldown = skillState.cooldown > 0;
      const hasEnough = p.mana >= cfg.manaCost;
      const slotColor = onCooldown ? 0x12121f : (hasEnough ? 0x1a2a3a : 0x141418);
      const borderColor = skillState.active ? 0xffdd44 : (hasEnough && !onCooldown ? cfg.color : 0x3a3a4a);
      // Outer shadow
      this._skillBg.roundRect(x - 1, barY - 1, slotW + 2, slotH + 2, 5).fill({ color: 0x000000, alpha: 0.3 });
      // Slot fill
      this._skillBg.roundRect(x, barY, slotW, slotH, 4).fill({ color: slotColor });
      // Inner bevel highlight
      this._skillBg.roundRect(x + 1, barY + 1, slotW - 2, 2, 2).fill({ color: 0xffffff, alpha: 0.04 });
      // Border
      this._skillBg.roundRect(x, barY, slotW, slotH, 4).stroke({ color: borderColor, width: skillState.active ? 2.5 : 1 });

      // Cooldown overlay — with sweep effect
      const cd = this._skillTexts[i].cooldown;
      cd.clear();
      if (onCooldown) {
        const cdPct = skillState.cooldown / skillState.maxCooldown;
        cd.rect(x + 1, barY + slotH * (1 - cdPct), slotW - 2, slotH * cdPct).fill({ color: 0x000000, alpha: 0.55 });
        // Cooldown edge line
        cd.rect(x + 1, barY + slotH * (1 - cdPct), slotW - 2, 1.5).fill({ color: 0x8888aa, alpha: 0.3 });
      }

      // Color indicator — glowing orb instead of dot
      const orbAlpha = onCooldown ? 0.25 : 0.9;
      const orbPulse = hasEnough && !onCooldown ? Math.sin(state.gameTime * 3 + i) * 0.1 : 0;
      this._skillBg.circle(x + slotW / 2, barY + 12, 8).fill({ color: cfg.color, alpha: (orbAlpha + orbPulse) * 0.15 });
      this._skillBg.circle(x + slotW / 2, barY + 12, 5).fill({ color: cfg.color, alpha: orbAlpha + orbPulse });
      this._skillBg.circle(x + slotW / 2, barY + 12, 2.5).fill({ color: 0xffffff, alpha: (orbAlpha + orbPulse) * 0.3 });

      // Active glow — pulsating border glow
      if (skillState.active) {
        const activeGlow = 0.12 + Math.sin(state.gameTime * 6) * 0.05;
        this._skillBg.roundRect(x - 3, barY - 3, slotW + 6, slotH + 6, 7).fill({ color: cfg.color, alpha: activeGlow });
        this._skillBg.roundRect(x - 1, barY - 1, slotW + 2, slotH + 2, 5).stroke({ color: cfg.color, width: 1, alpha: activeGlow * 2 });
      }

      // Ready flash for available skills
      if (hasEnough && !onCooldown && !skillState.active) {
        const readyGlow = 0.03 + Math.sin(state.gameTime * 2 + i * 1.5) * 0.015;
        this._skillBg.roundRect(x, barY, slotW, slotH, 4).fill({ color: cfg.color, alpha: readyGlow });
      }
    }

    // Boss HP bar — stylized
    const boss = state.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      const bw = sw * 0.55;
      const bx = (sw - bw) / 2;
      const by = 52;
      const bh = 16;
      this._bossHpBg.clear();
      // Decorative backing
      this._bossHpBg.roundRect(bx - 3, by - 3, bw + 6, bh + 6, 6).fill({ color: 0x110000, alpha: 0.8 });
      // Main background
      this._bossHpBg.roundRect(bx, by, bw, bh, 4).fill({ color: 0x220000 });
      // Inner shadow
      this._bossHpBg.roundRect(bx + 1, by + 1, bw - 2, 3, 2).fill({ color: 0x000000, alpha: 0.3 });
      // Border — ornate double border
      this._bossHpBg.roundRect(bx, by, bw, bh, 4).stroke({ color: 0xaa2222, width: 1.5 });
      this._bossHpBg.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 5).stroke({ color: 0x661111, width: 0.5, alpha: 0.5 });
      // Corner ornaments (small diamonds)
      for (const cx of [bx - 2, bx + bw + 2]) {
        this._bossHpBg.moveTo(cx, by + bh / 2).lineTo(cx + 3, by + bh / 2 - 3).lineTo(cx + 6, by + bh / 2).lineTo(cx + 3, by + bh / 2 + 3).fill({ color: 0xcc3333, alpha: 0.5 });
      }

      this._bossHpFill.clear();
      const bossHpPct = boss.hp / boss.maxHp;
      const bossFillW = (bw - 2) * bossHpPct;
      // Main fill
      this._bossHpFill.roundRect(bx + 1, by + 1, bossFillW, bh - 2, 3).fill({ color: 0xcc1111 });
      // Gradient — brighter top
      this._bossHpFill.roundRect(bx + 1, by + 1, bossFillW, (bh - 2) * 0.4, 3).fill({ color: 0xff4444, alpha: 0.4 });
      // Shine streak
      this._bossHpFill.roundRect(bx + 2, by + 2, bossFillW - 2, 2, 1).fill({ color: 0xffffff, alpha: 0.12 });
      // Animated damage pulse
      const bossGlow = 0.06 + Math.sin(state.gameTime * 4) * 0.03;
      this._bossHpFill.roundRect(bx - 1, by - 2, bw + 2, bh + 4, 5).fill({ color: 0xff0000, alpha: bossGlow });
      // HP segment markers (every 25%)
      for (let seg = 1; seg < 4; seg++) {
        const segX = bx + bw * seg * 0.25;
        this._bossHpBg.rect(segX - 0.5, by + 1, 1, bh - 2).fill({ color: 0x000000, alpha: 0.3 });
      }

      this._bossNameText.position.set(sw / 2, by - 6);
      this._bossNameText.text = _getBossDisplayName(boss.type);
      this._bossNameText.alpha = 1;
    } else {
      this._bossHpBg.clear();
      this._bossHpFill.clear();
      this._bossNameText.alpha = 0;
    }

    // Boss warning
    if (this._bossWarningTimer > 0) {
      this._bossWarningTimer -= dt;
      const pulse = Math.sin(state.gameTime * 8);
      this._bossWarningText.alpha = Math.min(1, this._bossWarningTimer);
      this._bossWarningText.scale.set(1 + pulse * 0.05);
    } else {
      this._bossWarningText.alpha = 0;
    }

    // Between wave text
    if (state.betweenWaves && state.wave > 0) {
      const nextWave = state.wave + 1;
      const isBossNext = nextWave % state.bossWaveInterval === 0;
      if (nextWave > state.totalWaves) {
        this._betweenWaveText.text = "VICTORY!";
      } else if (isBossNext) {
        this._betweenWaveText.text = `Next: Wave ${nextWave} - BOSS WAVE!`;
        this._betweenWaveText.style.fill = 0xff4444;
      } else {
        this._betweenWaveText.text = `Next: Wave ${nextWave}`;
        this._betweenWaveText.style.fill = 0x88ccff;
      }
      this._betweenWaveText.alpha = Math.min(1, state.betweenWaveTimer);
    } else if (state.betweenWaves && state.wave === 0) {
      this._betweenWaveText.text = "Arthur & the White Eagle";
      this._betweenWaveText.alpha = 1;
    } else {
      this._betweenWaveText.alpha = 0;
    }

    // Notifications
    for (const notif of this._notifications) {
      notif.timer -= dt;
      notif.text.alpha = Math.min(1, notif.timer * 2);
      notif.text.y -= 20 * dt;
    }
    this._notifications = this._notifications.filter(n => {
      if (n.timer <= 0) {
        this.container.removeChild(n.text);
        n.text.destroy();
        return false;
      }
      return true;
    });
  }

  triggerBossWarning(): void {
    this._bossWarningTimer = 3;
  }

  showNotification(msg: string, color: number, sw: number, sh: number): void {
    const text = new Text({ text: msg, style: { ...STYLE_NOTIFICATION, fill: color } as any });
    text.anchor.set(0.5, 0.5);
    text.position.set(sw / 2, sh * 0.35);
    this.container.addChild(text);
    this._notifications.push({ text, timer: 2 });
  }

  cleanup(): void {
    for (const n of this._notifications) n.text.destroy();
    this._notifications.length = 0;
    this.container.removeChildren();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _getBossDisplayName(type: string): string {
  const names: Record<string, string> = {
    boss_drake: "Ignis the Fire Drake",
    boss_chimera: "The Chimera of Dread",
    boss_lich_king: "Mordrath the Lich King",
    boss_storm_titan: "Thalassor, Storm Titan",
    boss_void_serpent: "Nyx, the Void Serpent",
  };
  return names[type] || "Boss";
}
