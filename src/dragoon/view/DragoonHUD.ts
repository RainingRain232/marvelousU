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

    // HP bar
    const hpX = 20, hpY = 15, hpW = 180, hpH = 14;
    this._hpBarBg.clear();
    this._hpBarBg.roundRect(hpX, hpY, hpW, hpH, 4).fill({ color: 0x220000 });
    this._hpBarBg.roundRect(hpX, hpY, hpW, hpH, 4).stroke({ color: 0x884444, width: 1 });
    this._hpBarFill.clear();
    const hpPct = p.hp / p.maxHp;
    const hpColor = hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xccaa22 : 0xcc2222;
    this._hpBarFill.roundRect(hpX + 1, hpY + 1, (hpW - 2) * hpPct, hpH - 2, 3).fill({ color: hpColor });
    // HP glow when low
    if (hpPct < 0.25) {
      this._hpBarFill.roundRect(hpX, hpY - 2, hpW, hpH + 4, 4).fill({ color: 0xff0000, alpha: 0.1 + Math.sin(state.gameTime * 6) * 0.05 });
    }

    // Mana bar
    const manaX = 20, manaY = hpY + hpH + 4, manaW = 180, manaH = 10;
    this._manaBarBg.clear();
    this._manaBarBg.roundRect(manaX, manaY, manaW, manaH, 3).fill({ color: 0x000022 });
    this._manaBarBg.roundRect(manaX, manaY, manaW, manaH, 3).stroke({ color: 0x4444aa, width: 1 });
    this._manaBarFill.clear();
    const manaPct = p.mana / p.maxMana;
    this._manaBarFill.roundRect(manaX + 1, manaY + 1, (manaW - 2) * manaPct, manaH - 2, 2).fill({ color: 0x4488ff });

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

    // Combo
    if (p.comboCount > 2) {
      this._comboText.text = `${p.comboCount}x COMBO`;
      this._comboText.alpha = Math.min(1, p.comboTimer);
      this._comboText.scale.set(1 + Math.min(0.3, p.comboCount * 0.02));
    } else {
      this._comboText.text = "";
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
    // Background panel
    this._skillBg.roundRect(startX - 10, barY - 5, totalW + 20, slotH + 25, 6).fill({ color: 0x0a0a1a, alpha: 0.7 });
    this._skillBg.roundRect(startX - 10, barY - 5, totalW + 20, slotH + 25, 6).stroke({ color: 0x334466, width: 1 });

    for (let i = 0; i < skills.length; i++) {
      const skillState = state.skills.find(s => s.id === skills[i])!;
      const cfg = SKILL_CONFIGS[skills[i]];
      const x = startX + i * (slotW + gap);

      // Slot background
      const onCooldown = skillState.cooldown > 0;
      const hasEnough = p.mana >= cfg.manaCost;
      const slotColor = onCooldown ? 0x1a1a2a : (hasEnough ? 0x223344 : 0x1a1a22);
      this._skillBg.roundRect(x, barY, slotW, slotH, 4).fill({ color: slotColor });
      this._skillBg.roundRect(x, barY, slotW, slotH, 4).stroke({ color: skillState.active ? 0xffdd44 : (hasEnough ? cfg.color : 0x444444), width: skillState.active ? 2 : 1 });

      // Cooldown overlay
      const cd = this._skillTexts[i].cooldown;
      cd.clear();
      if (onCooldown) {
        const cdPct = skillState.cooldown / skillState.maxCooldown;
        cd.rect(x + 1, barY + slotH * (1 - cdPct), slotW - 2, slotH * cdPct).fill({ color: 0x000000, alpha: 0.5 });
      }

      // Color indicator dot
      this._skillBg.circle(x + slotW / 2, barY + 12, 5).fill({ color: cfg.color, alpha: onCooldown ? 0.3 : 0.9 });

      // Active glow
      if (skillState.active) {
        this._skillBg.roundRect(x - 2, barY - 2, slotW + 4, slotH + 4, 6).fill({ color: cfg.color, alpha: 0.1 });
      }
    }

    // Boss HP bar
    const boss = state.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      const bw = sw * 0.5;
      const bx = (sw - bw) / 2;
      const by = 50;
      this._bossHpBg.clear();
      this._bossHpBg.roundRect(bx, by, bw, 12, 4).fill({ color: 0x220000 });
      this._bossHpBg.roundRect(bx, by, bw, 12, 4).stroke({ color: 0xff4444, width: 1 });
      this._bossHpFill.clear();
      this._bossHpFill.roundRect(bx + 1, by + 1, (bw - 2) * (boss.hp / boss.maxHp), 10, 3).fill({ color: 0xff2222 });
      // Glow
      this._bossHpFill.roundRect(bx, by - 2, bw, 16, 4).fill({ color: 0xff0000, alpha: 0.05 + Math.sin(state.gameTime * 4) * 0.03 });

      this._bossNameText.position.set(sw / 2, by - 4);
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
