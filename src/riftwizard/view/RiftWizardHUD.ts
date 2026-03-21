// ---------------------------------------------------------------------------
// Rift Wizard HUD — HP bar, spell hotbar, level info, status messages
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
import { SpellSchool } from "../state/RiftWizardState";
import { RWPhase, RWTileType } from "../state/RiftWizardState";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { SCHOOL_COLORS, SHRINE_LABELS, getShrineDescription, getSpellCircleDescription } from "../config/RiftWizardShrineDefs";
import { ENEMY_DEFS } from "../config/RiftWizardEnemyDefs";
import {
  getAvailableSpells,
  getAvailableUpgrades,
  getEffectiveSpellCost,
  getEffectiveUpgradeCost,
  learnSpell,
  buyUpgrade,
  getAvailableAbilities,
  getEffectiveAbilityCost,
  learnAbility,
} from "../systems/RiftWizardProgressionSystem";
import { ABILITY_DEFS } from "../config/RiftWizardAbilityDefs";
import { drawOrnateFrame, drawTitleDivider, drawOrnateButton } from "@view/fx/OrnateFrame";
import { formatRunSummary } from "../systems/RiftWizardRunStats";
import { getLeaderboard } from "../systems/RiftWizardLeaderboard";
import { getActiveSynergies } from "../config/RiftWizardSynergyDefs";

export type PauseSubMenu = "main" | "controls" | "instructions" | "spells" | "buy" | "abilities" | "leaderboard";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xbbbbcc,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffffff,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 3 },
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xddddee,
});

const STAT_VALUE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xaaaacc,
});

const MSG_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffffff,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 4 },
});

// ---------------------------------------------------------------------------
// Helper: draw a school icon polygon into a Graphics at (cx, cy) with size s
// ---------------------------------------------------------------------------

function drawSchoolIcon(g: Graphics, school: SpellSchool, cx: number, cy: number, s: number, color: number, alpha: number): void {
  switch (school) {
    case SpellSchool.FIRE: {
      // Flame shape: 3 triangles stacked
      g.moveTo(cx, cy - s);
      g.lineTo(cx + s * 0.5, cy + s * 0.2);
      g.lineTo(cx - s * 0.5, cy + s * 0.2);
      g.closePath();
      g.fill({ color, alpha });
      g.moveTo(cx - s * 0.35, cy - s * 0.2);
      g.lineTo(cx, cy + s * 0.6);
      g.lineTo(cx - s * 0.7, cy + s * 0.6);
      g.closePath();
      g.fill({ color, alpha: alpha * 0.7 });
      g.moveTo(cx + s * 0.35, cy - s * 0.2);
      g.lineTo(cx + s * 0.7, cy + s * 0.6);
      g.lineTo(cx, cy + s * 0.6);
      g.closePath();
      g.fill({ color, alpha: alpha * 0.7 });
      break;
    }
    case SpellSchool.ICE: {
      // 6-pointed star
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        const outerX = cx + Math.cos(angle) * s;
        const outerY = cy + Math.sin(angle) * s;
        const innerAngle = angle + Math.PI / 6;
        const innerX = cx + Math.cos(innerAngle) * s * 0.45;
        const innerY = cy + Math.sin(innerAngle) * s * 0.45;
        if (i === 0) g.moveTo(outerX, outerY);
        else g.lineTo(outerX, outerY);
        g.lineTo(innerX, innerY);
      }
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.LIGHTNING: {
      // Zigzag bolt
      g.moveTo(cx - s * 0.2, cy - s);
      g.lineTo(cx + s * 0.4, cy - s * 0.2);
      g.lineTo(cx - s * 0.1, cy - s * 0.1);
      g.lineTo(cx + s * 0.3, cy + s);
      g.lineTo(cx - s * 0.1, cy + s * 0.1);
      g.lineTo(cx + s * 0.1, cy + s * 0.15);
      g.lineTo(cx - s * 0.4, cy - s * 0.15);
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.ARCANE: {
      // Spiral dots
      for (let i = 0; i < 7; i++) {
        const angle = (i * Math.PI * 2.5) / 7;
        const r = s * 0.3 + (i / 7) * s * 0.6;
        g.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, s * 0.15);
        g.fill({ color, alpha: alpha * (0.5 + i / 14) });
      }
      break;
    }
    case SpellSchool.NATURE: {
      // Leaf shape
      g.moveTo(cx, cy - s);
      g.lineTo(cx + s * 0.6, cy - s * 0.2);
      g.lineTo(cx + s * 0.5, cy + s * 0.4);
      g.lineTo(cx, cy + s);
      g.lineTo(cx - s * 0.5, cy + s * 0.4);
      g.lineTo(cx - s * 0.6, cy - s * 0.2);
      g.closePath();
      g.fill({ color, alpha });
      // Leaf vein
      g.moveTo(cx, cy - s * 0.7);
      g.lineTo(cx, cy + s * 0.7);
      g.stroke({ color, width: 1, alpha: alpha * 0.6 });
      break;
    }
    case SpellSchool.DARK: {
      // Small pentagon
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = cx + Math.cos(angle) * s * 0.8;
        const py = cy + Math.sin(angle) * s * 0.8;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.HOLY: {
      // Sun with rays
      g.circle(cx, cy, s * 0.4);
      g.fill({ color, alpha });
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        g.moveTo(cx + Math.cos(angle) * s * 0.5, cy + Math.sin(angle) * s * 0.5);
        g.lineTo(cx + Math.cos(angle) * s, cy + Math.sin(angle) * s);
        g.stroke({ color, width: 1, alpha });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export class RiftWizardHUD {
  readonly container = new Container();

  private _bg = new Graphics();
  private _hpBar = new Graphics();
  private _spellBar = new Graphics();
  private _infoText: Text;
  private _levelText: Text;
  private _spText: Text;
  private _turnText: Text;
  private _msgText: Text;
  private _spellTexts: Text[] = [];
  private _consumableText: Text;
  private _tooltipText: Text;
  private _logLines: string[] = [];
  private _logTexts: Text[] = [];
  private _showKeyRef = false;
  private _keyRefTexts: Text[] = [];

  // Pause menu
  private _pauseContainer = new Container();
  private _pauseBg = new Graphics();
  private _pauseTexts: Text[] = [];
  private _pauseButtons: { gfx: Graphics; text: Text; hitArea: { x: number; y: number; w: number; h: number }; action: () => void }[] = [];

  /** Current sub-menu within pause screen */
  pauseSubMenu: PauseSubMenu = "main";
  /** Selected index within buy sub-menu spell/upgrade list */
  private _buySelectedIndex = 0;
  /** Whether viewing upgrades for a spell (buy sub-menu) */
  private _buyViewingUpgrades = false;
  /** Which owned spell is selected for upgrade viewing */
  private _buyUpgradeSpellIndex = 0;
  /** Selected index within abilities sub-menu */
  private _abilitiesSelectedIndex = 0;

  onPauseResume: (() => void) | null = null;
  onPauseRestart: (() => void) | null = null;
  onPauseExit: (() => void) | null = null;
  onPauseSave: (() => void) | null = null;
  onPauseLoad: (() => void) | null = null;
  onPauseCodex: (() => void) | null = null;

  /** Tutorial toggle state (persisted by caller) */
  tutorialEnabled = true;

  constructor() {
    this._infoText = new Text({ text: "", style: INFO_STYLE });
    this._levelText = new Text({ text: "", style: HEADER_STYLE });
    this._spText = new Text({ text: "", style: LABEL_STYLE });
    this._turnText = new Text({ text: "", style: STAT_VALUE_STYLE });
    this._msgText = new Text({ text: "", style: MSG_STYLE });
    this._consumableText = new Text({ text: "", style: LABEL_STYLE });
    this._tooltipText = new Text({ text: "", style: STAT_VALUE_STYLE });
  }

  toggleKeyReference(): void {
    this._showKeyRef = !this._showKeyRef;
  }

  addLog(msg: string): void {
    this._logLines.push(msg);
    if (this._logLines.length > 6) {
      this._logLines.shift();
    }
  }

  build(): void {
    this.container.removeChildren();

    this.container.addChild(this._bg);
    this.container.addChild(this._hpBar);
    this.container.addChild(this._spellBar);
    this.container.addChild(this._infoText);
    this.container.addChild(this._levelText);
    this.container.addChild(this._spText);
    this.container.addChild(this._turnText);
    this.container.addChild(this._msgText);
    this.container.addChild(this._consumableText);
    this.container.addChild(this._tooltipText);

    // Pause menu overlay (hidden by default)
    this._pauseContainer.visible = false;
    this._pauseContainer.addChild(this._pauseBg);
    this.container.addChild(this._pauseContainer);
  }

  update(state: RiftWizardState, screenWidth: number, screenHeight: number, hoverGrid?: { col: number; row: number } | null): void {
    const hudH = 90;
    const hudY = screenHeight - hudH;

    // Background bar with gradient-like effect
    this._bg.clear();
    // Dark base
    this._bg.rect(0, hudY, screenWidth, hudH);
    this._bg.fill({ color: 0x0a0a14, alpha: 0.95 });
    // Top border line
    this._bg.rect(0, hudY, screenWidth, 2);
    this._bg.fill({ color: 0x333366, alpha: 0.8 });
    // Subtle gradient strip
    this._bg.rect(0, hudY + 2, screenWidth, 3);
    this._bg.fill({ color: 0x1a1a2e, alpha: 0.6 });

    // --- Ornate chevron/diamond border pattern along top ---
    const chevronSpacing = 18;
    const chevronH = 6;
    for (let cx = chevronSpacing / 2; cx < screenWidth; cx += chevronSpacing) {
      // Diamond shape
      this._bg.moveTo(cx, hudY - 1);
      this._bg.lineTo(cx + chevronSpacing * 0.3, hudY + chevronH * 0.5);
      this._bg.lineTo(cx, hudY + chevronH);
      this._bg.lineTo(cx - chevronSpacing * 0.3, hudY + chevronH * 0.5);
      this._bg.closePath();
      this._bg.fill({ color: 0x333366, alpha: 0.4 });
      this._bg.moveTo(cx, hudY);
      this._bg.lineTo(cx + chevronSpacing * 0.25, hudY + chevronH * 0.5);
      this._bg.lineTo(cx, hudY + chevronH - 1);
      this._bg.lineTo(cx - chevronSpacing * 0.25, hudY + chevronH * 0.5);
      this._bg.closePath();
      this._bg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.5 });
    }

    // --- Decorative divider lines between sections ---
    // Divider between left (HP/Level) and mid (Turn/Enemy)
    this._bg.moveTo(196, hudY + 8);
    this._bg.lineTo(196, hudY + hudH - 8);
    this._bg.stroke({ color: 0x333355, width: 1, alpha: 0.5 });
    // Small diamond at mid of divider
    this._bg.moveTo(196, hudY + hudH / 2 - 4);
    this._bg.lineTo(199, hudY + hudH / 2);
    this._bg.lineTo(196, hudY + hudH / 2 + 4);
    this._bg.lineTo(193, hudY + hudH / 2);
    this._bg.closePath();
    this._bg.fill({ color: 0x4444aa, alpha: 0.4 });

    // Divider between mid and spell bar area
    this._bg.moveTo(350, hudY + 8);
    this._bg.lineTo(350, hudY + hudH - 8);
    this._bg.stroke({ color: 0x333355, width: 1, alpha: 0.5 });
    this._bg.moveTo(350, hudY + hudH / 2 - 4);
    this._bg.lineTo(353, hudY + hudH / 2);
    this._bg.lineTo(350, hudY + hudH / 2 + 4);
    this._bg.lineTo(347, hudY + hudH / 2);
    this._bg.closePath();
    this._bg.fill({ color: 0x4444aa, alpha: 0.4 });

    // --- Left section: HP + Level ---
    const leftX = 12;

    // HP bar (wider, with better styling)
    this._hpBar.clear();
    const hpBarX = leftX;
    const hpBarY = hudY + 10;
    const hpBarW = 180;
    const hpBarH = 16;
    const hpRatio = Math.max(0, state.wizard.hp / state.wizard.maxHp);

    // HP bar background
    this._hpBar.rect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2);
    this._hpBar.fill(0x0a0a0a);
    this._hpBar.rect(hpBarX, hpBarY, hpBarW, hpBarH);
    this._hpBar.fill(0x220000);

    // HP fill
    const hpColor = hpRatio > 0.6 ? 0x00bb00 : hpRatio > 0.3 ? 0xbbbb00 : 0xcc2200;
    const hpHighlight = hpRatio > 0.6 ? 0x22dd22 : hpRatio > 0.3 ? 0xdddd22 : 0xee4422;
    this._hpBar.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    this._hpBar.fill(hpColor);
    // Subtle gradient effect (brighter at top of bar)
    if (hpRatio > 0) {
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * hpRatio, 3);
      this._hpBar.fill({ color: hpHighlight, alpha: 0.4 });
      this._hpBar.rect(hpBarX, hpBarY + 3, hpBarW * hpRatio, 3);
      this._hpBar.fill({ color: hpHighlight, alpha: 0.2 });
      // Darker bottom gradient
      this._hpBar.rect(hpBarX, hpBarY + hpBarH - 3, hpBarW * hpRatio, 3);
      this._hpBar.fill({ color: 0x000000, alpha: 0.2 });
    }

    // Decorative end caps on the HP bar frame
    // Left end cap
    this._hpBar.moveTo(hpBarX - 4, hpBarY - 2);
    this._hpBar.lineTo(hpBarX - 1, hpBarY - 2);
    this._hpBar.lineTo(hpBarX - 1, hpBarY + hpBarH + 2);
    this._hpBar.lineTo(hpBarX - 4, hpBarY + hpBarH + 2);
    this._hpBar.closePath();
    this._hpBar.fill({ color: 0x333355, alpha: 0.6 });
    this._hpBar.moveTo(hpBarX - 4, hpBarY + 2);
    this._hpBar.lineTo(hpBarX - 6, hpBarY + hpBarH / 2);
    this._hpBar.lineTo(hpBarX - 4, hpBarY + hpBarH - 2);
    this._hpBar.stroke({ color: 0x4444aa, width: 1, alpha: 0.5 });
    // Right end cap
    this._hpBar.moveTo(hpBarX + hpBarW + 1, hpBarY - 2);
    this._hpBar.lineTo(hpBarX + hpBarW + 4, hpBarY - 2);
    this._hpBar.lineTo(hpBarX + hpBarW + 4, hpBarY + hpBarH + 2);
    this._hpBar.lineTo(hpBarX + hpBarW + 1, hpBarY + hpBarH + 2);
    this._hpBar.closePath();
    this._hpBar.fill({ color: 0x333355, alpha: 0.6 });
    this._hpBar.moveTo(hpBarX + hpBarW + 4, hpBarY + 2);
    this._hpBar.lineTo(hpBarX + hpBarW + 6, hpBarY + hpBarH / 2);
    this._hpBar.lineTo(hpBarX + hpBarW + 4, hpBarY + hpBarH - 2);
    this._hpBar.stroke({ color: 0x4444aa, width: 1, alpha: 0.5 });

    // --- Tick marks at 25% intervals ---
    for (let t = 1; t <= 3; t++) {
      const tickX = hpBarX + hpBarW * (t / 4);
      this._hpBar.moveTo(tickX, hpBarY);
      this._hpBar.lineTo(tickX, hpBarY + hpBarH);
      this._hpBar.stroke({ color: 0x000000, width: 1, alpha: 0.6 });
      // Small notch marks on top and bottom
      this._hpBar.rect(tickX - 0.5, hpBarY, 1, 3);
      this._hpBar.fill({ color: 0x666688, alpha: 0.5 });
      this._hpBar.rect(tickX - 0.5, hpBarY + hpBarH - 3, 1, 3);
      this._hpBar.fill({ color: 0x666688, alpha: 0.5 });
    }

    // --- Beveled 3D border (lighter top-left, darker bottom-right) ---
    // Top edge (lighter)
    this._hpBar.moveTo(hpBarX - 1, hpBarY - 1);
    this._hpBar.lineTo(hpBarX + hpBarW + 1, hpBarY - 1);
    this._hpBar.stroke({ color: 0x666688, width: 1 });
    // Left edge (lighter)
    this._hpBar.moveTo(hpBarX - 1, hpBarY - 1);
    this._hpBar.lineTo(hpBarX - 1, hpBarY + hpBarH + 1);
    this._hpBar.stroke({ color: 0x555577, width: 1 });
    // Bottom edge (darker)
    this._hpBar.moveTo(hpBarX - 1, hpBarY + hpBarH + 1);
    this._hpBar.lineTo(hpBarX + hpBarW + 1, hpBarY + hpBarH + 1);
    this._hpBar.stroke({ color: 0x111122, width: 1 });
    // Right edge (darker)
    this._hpBar.moveTo(hpBarX + hpBarW + 1, hpBarY - 1);
    this._hpBar.lineTo(hpBarX + hpBarW + 1, hpBarY + hpBarH + 1);
    this._hpBar.stroke({ color: 0x111122, width: 1 });

    // --- Pulse glow when HP is low (< 30%) ---
    if (hpRatio > 0 && hpRatio <= 0.3) {
      const pulseTime = Date.now() / 500;
      const pulseAlpha = 0.15 + 0.15 * Math.sin(pulseTime * Math.PI);
      this._hpBar.rect(hpBarX - 3, hpBarY - 3, hpBarW + 6, hpBarH + 6);
      this._hpBar.fill({ color: 0xff0000, alpha: pulseAlpha });
      this._hpBar.rect(hpBarX - 3, hpBarY - 3, hpBarW + 6, hpBarH + 6);
      this._hpBar.stroke({ color: 0xff2200, width: 1, alpha: pulseAlpha * 1.5 });
    }

    // Shield bar overlay
    if (state.wizard.shields > 0) {
      const shieldRatio = Math.min(1, state.wizard.shields / state.wizard.maxHp);
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);
      this._hpBar.fill({ color: 0x44ddff, alpha: 0.35 });
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);
      this._hpBar.stroke({ color: 0x44ddff, width: 1, alpha: 0.5 });
    }

    // Heart icon to the left of the HP bar
    const heartCx = hpBarX - 10;
    const heartCy = hpBarY + hpBarH / 2;
    const hs = 4;
    // Heart shape (two circles + triangle)
    this._hpBar.circle(heartCx - hs * 0.35, heartCy - hs * 0.2, hs * 0.45);
    this._hpBar.fill({ color: hpColor, alpha: 0.8 });
    this._hpBar.circle(heartCx + hs * 0.35, heartCy - hs * 0.2, hs * 0.45);
    this._hpBar.fill({ color: hpColor, alpha: 0.8 });
    this._hpBar.moveTo(heartCx - hs * 0.7, heartCy);
    this._hpBar.lineTo(heartCx, heartCy + hs * 0.8);
    this._hpBar.lineTo(heartCx + hs * 0.7, heartCy);
    this._hpBar.closePath();
    this._hpBar.fill({ color: hpColor, alpha: 0.8 });

    // HP text on bar
    const hpStr = `${state.wizard.hp}/${state.wizard.maxHp}${state.wizard.shields > 0 ? ` +${state.wizard.shields}` : ""}`;
    this._infoText.text = hpStr;
    this._infoText.x = hpBarX + hpBarW / 2 - this._infoText.width / 2;
    this._infoText.y = hpBarY + 1;

    // --- Level info with decorative frame polygon ---
    const diffLabel = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
    this._levelText.text = `Level ${state.currentLevel + 1}/25  [${diffLabel}]`;
    this._levelText.x = leftX;
    this._levelText.y = hudY + 32;

    // Decorative frame around level text
    const lvFrameX = leftX - 4;
    const lvFrameY = hudY + 30;
    const lvFrameW = 130;
    const lvFrameH = 22;
    // Corner notches for the frame
    this._bg.moveTo(lvFrameX, lvFrameY + 3);
    this._bg.lineTo(lvFrameX + 3, lvFrameY);
    this._bg.lineTo(lvFrameX + lvFrameW - 3, lvFrameY);
    this._bg.lineTo(lvFrameX + lvFrameW, lvFrameY + 3);
    this._bg.lineTo(lvFrameX + lvFrameW, lvFrameY + lvFrameH - 3);
    this._bg.lineTo(lvFrameX + lvFrameW - 3, lvFrameY + lvFrameH);
    this._bg.lineTo(lvFrameX + 3, lvFrameY + lvFrameH);
    this._bg.lineTo(lvFrameX, lvFrameY + lvFrameH - 3);
    this._bg.closePath();
    this._bg.stroke({ color: 0x444477, width: 1, alpha: 0.6 });

    // --- SP display with star polygon next to it ---
    this._spText.text = `SP: ${state.skillPoints}`;
    this._spText.style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xffcc44,
      fontWeight: "bold",
    });
    this._spText.x = leftX + 16;
    this._spText.y = hudY + 55;

    // Star polygon next to SP text
    const starCx = leftX + 8;
    const starCy = hudY + 63;
    const starOuter = 5;
    const starInner = 2.5;
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = starCx + Math.cos(outerAngle) * starOuter;
      const oy = starCy + Math.sin(outerAngle) * starOuter;
      const ix = starCx + Math.cos(innerAngle) * starInner;
      const iy = starCy + Math.sin(innerAngle) * starInner;
      if (i === 0) this._bg.moveTo(ox, oy);
      else this._bg.lineTo(ox, oy);
      this._bg.lineTo(ix, iy);
    }
    this._bg.closePath();
    this._bg.fill({ color: 0xffcc44, alpha: 0.8 });

    // --- Middle section: Turn + Enemy info ---
    const midX = 200;
    const enemyCount = state.level.enemies.filter((e) => e.alive).length;
    const spawnerCount = state.level.spawners.filter((s) => s.alive).length;
    this._turnText.text = `Turn ${state.turnNumber}`;
    this._turnText.x = midX;
    this._turnText.y = hudY + 10;

    // Enemy/spawner count with color coding
    let enemyStr = `Enemies: ${enemyCount}`;
    if (spawnerCount > 0) enemyStr += `  Spawners: ${spawnerCount}`;
    this._consumableText.text = enemyStr;
    this._consumableText.style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 11,
      fill: enemyCount > 0 ? 0xcc6666 : 0x66cc66,
    });
    this._consumableText.x = midX;
    this._consumableText.y = hudY + 26;

    // Consumables
    const potions = state.consumables.find((c) => c.type === "health_potion")?.quantity ?? 0;
    const scrolls = state.consumables.find((c) => c.type === "charge_scroll")?.quantity ?? 0;
    this._tooltipText.text = `[P] Potions: ${potions}  [C] Scrolls: ${scrolls}`;
    this._tooltipText.x = midX;
    this._tooltipText.y = hudY + 42;

    // --- Right section: Spell bar ---
    this._updateSpellBar(state, screenWidth, hudY);

    // Threat direction arrows for nearby enemies
    if (state.phase === RWPhase.PLAYING) {
      for (const enemy of state.level.enemies) {
        if (!enemy.alive) continue;
        const attackRange = enemy.range ?? 1;
        const dist = Math.abs(enemy.col - state.wizard.col) + Math.abs(enemy.row - state.wizard.row);
        if (dist <= attackRange + 2 && dist > 0) {
          // Calculate direction from wizard to enemy
          const dx = enemy.col - state.wizard.col;
          const dy = enemy.row - state.wizard.row;
          const angle = Math.atan2(dy, dx);
          // Place arrow at screen edge in that direction
          const arrowDist = 50;
          const arrowX = Math.floor(screenWidth / 2) + Math.cos(angle) * arrowDist;
          const arrowY = Math.floor((screenHeight - 90) / 2) + Math.sin(angle) * arrowDist;
          // Clamp to screen edges
          const clampedX = Math.max(20, Math.min(screenWidth - 20, arrowX));
          const clampedY = Math.max(20, Math.min(screenHeight - 110, arrowY));
          // Arrow polygon pointing toward enemy
          const arrowSize = dist <= attackRange ? 8 : 5;
          const arrowColor = dist <= attackRange ? 0xff4444 : 0xffaa44;
          const arrowAlpha = dist <= attackRange ? 0.5 : 0.25;
          this._bg.moveTo(clampedX + Math.cos(angle) * arrowSize, clampedY + Math.sin(angle) * arrowSize);
          this._bg.lineTo(clampedX + Math.cos(angle + 2.5) * arrowSize * 0.6, clampedY + Math.sin(angle + 2.5) * arrowSize * 0.6);
          this._bg.lineTo(clampedX + Math.cos(angle - 2.5) * arrowSize * 0.6, clampedY + Math.sin(angle - 2.5) * arrowSize * 0.6);
          this._bg.closePath();
          this._bg.fill({ color: arrowColor, alpha: arrowAlpha });
        }
      }
    }

    // --- Center message ---
    this._msgText.text = "";
    if (state.phase === RWPhase.VICTORY) {
      // --- Ornate Victory Screen ---
      this._msgText.text = "";
      // Full-screen dark overlay
      this._bg.rect(0, 0, screenWidth, screenHeight - hudH);
      this._bg.fill({ color: 0x000000, alpha: 0.75 });

      // Golden particle rain
      for (let i = 0; i < 30; i++) {
        const px = (i * 37 + Math.floor(Date.now() / 50) * (i % 3 + 1)) % screenWidth;
        const py = (i * 53 + Math.floor(Date.now() / 30) * 2) % (screenHeight - 100);
        this._bg.star(px, py, 4, 3, 1.5);
        this._bg.fill({ color: i % 3 === 0 ? 0xffdd44 : 0xffffaa, alpha: 0.3 + (i % 5) * 0.1 });
      }

      const vcPanelW = 420;
      const vcPanelH = 480;
      const vcPanelX = Math.floor((screenWidth - vcPanelW) / 2);
      const vcPanelY = Math.floor((screenHeight - vcPanelH) / 2) - 20;

      // Panel bg
      this._bg.rect(vcPanelX + 4, vcPanelY + 4, vcPanelW, vcPanelH);
      this._bg.fill({ color: 0x000000, alpha: 0.4 });
      this._bg.rect(vcPanelX, vcPanelY, vcPanelW, vcPanelH);
      this._bg.fill({ color: 0x0a0a18, alpha: 0.96 });
      drawOrnateFrame(this._bg, vcPanelX, vcPanelY, vcPanelW, vcPanelH, {
        color: 0xccaa44,
        highlight: 0xffdd66,
      });

      // "VICTORY!" title
      const vicTitle = new Text({
        text: "VICTORY!",
        style: new TextStyle({
          fontFamily: "Georgia, serif",
          fontSize: 36,
          fill: 0xffdd44,
          fontWeight: "bold",
          letterSpacing: 6,
          stroke: { color: 0x000000, width: 4 },
          dropShadow: { color: 0xccaa00, blur: 12, distance: 0, alpha: 0.5 },
        }),
      });
      vicTitle.x = vcPanelX + vcPanelW / 2;
      vicTitle.anchor.set(0.5, 0);
      vicTitle.y = vcPanelY + 18;
      this.container.addChild(vicTitle);
      this._spellTexts.push(vicTitle);

      // Divider
      const vicDivY = vcPanelY + 64;
      drawTitleDivider(this._bg, vcPanelX, vcPanelW, vicDivY);

      // Run summary stats
      let vicY = vicDivY + 14;
      const summaryLines = formatRunSummary(state.runStats);
      for (const line of summaryLines) {
        const lt = new Text({
          text: line,
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0xbbbbcc }),
        });
        lt.x = vcPanelX + 24;
        lt.y = vicY;
        this.container.addChild(lt);
        this._spellTexts.push(lt);
        vicY += 16;
      }

      vicY += 8;
      // Learned spells list
      const spellListHeader = new Text({
        text: "Spells Learned:",
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xccccff, fontWeight: "bold" }),
      });
      spellListHeader.x = vcPanelX + 24;
      spellListHeader.y = vicY;
      this.container.addChild(spellListHeader);
      this._spellTexts.push(spellListHeader);
      vicY += 18;

      for (const spell of state.spells) {
        const sDef = SPELL_DEFS[spell.defId];
        const sColor = SCHOOL_COLORS[spell.school] ?? 0x888888;
        const st = new Text({
          text: `  ${sDef?.name ?? spell.defId} (${spell.school})`,
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: sColor }),
        });
        st.x = vcPanelX + 28;
        st.y = vicY;
        this.container.addChild(st);
        this._spellTexts.push(st);
        vicY += 14;
      }

      vicY += 10;
      // Difficulty + seed
      const diffSeedT = new Text({
        text: `Difficulty: ${state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1)}  |  Seed: ${state.runSeed}`,
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0x888899 }),
      });
      diffSeedT.x = vcPanelX + vcPanelW / 2;
      diffSeedT.anchor.set(0.5, 0);
      diffSeedT.y = vicY;
      this.container.addChild(diffSeedT);
      this._spellTexts.push(diffSeedT);

      // Footer
      const vicFooter = new Text({
        text: "R: Restart  |  ESC: Exit",
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xffcc44, fontWeight: "bold" }),
      });
      vicFooter.x = vcPanelX + vcPanelW / 2;
      vicFooter.anchor.set(0.5, 0);
      vicFooter.y = vcPanelY + vcPanelH - 32;
      this.container.addChild(vicFooter);
      this._spellTexts.push(vicFooter);

      // Glow ring
      const trophyX = Math.floor(screenWidth / 2);
      const trophyY = vcPanelY - 10;
      const glowPulse = 0.5 + 0.3 * Math.sin(Date.now() / 300);
      this._bg.circle(trophyX, trophyY, 45);
      this._bg.stroke({ color: 0xffdd44, width: 2, alpha: glowPulse * 0.15 });
    } else if (state.phase === RWPhase.GAME_OVER) {
      // --- Enhanced Game Over Screen ---
      this._msgText.text = "";
      // Full-screen dark overlay
      this._bg.rect(0, 0, screenWidth, screenHeight - hudH);
      this._bg.fill({ color: 0x0a0000, alpha: 0.7 });

      // Red vignette
      this._bg.rect(0, 0, screenWidth, 50);
      this._bg.fill({ color: 0x330000, alpha: 0.3 });
      this._bg.rect(0, screenHeight - 140, screenWidth, 50);
      this._bg.fill({ color: 0x330000, alpha: 0.3 });

      // Screen crack lines
      const crackX = Math.floor(screenWidth / 2);
      const crackY = Math.floor(screenHeight / 2);
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) + 0.2;
        const len = 80 + (i * 17) % 60;
        this._bg.moveTo(crackX, crackY);
        const midCX = crackX + Math.cos(angle) * len * 0.5 + ((i * 7) % 10 - 5);
        const midCY = crackY + Math.sin(angle) * len * 0.5 + ((i * 11) % 10 - 5);
        this._bg.lineTo(midCX, midCY);
        this._bg.lineTo(crackX + Math.cos(angle) * len, crackY + Math.sin(angle) * len);
        this._bg.stroke({ color: 0xff2222, width: 2, alpha: 0.15 });
        const branchAngle = angle + ((i % 2 === 0) ? 0.5 : -0.5);
        this._bg.moveTo(midCX, midCY);
        this._bg.lineTo(midCX + Math.cos(branchAngle) * 30, midCY + Math.sin(branchAngle) * 30);
        this._bg.stroke({ color: 0xcc0000, width: 1, alpha: 0.1 });
      }

      const goPanelW = 380;
      const goPanelH = 380;
      const goPanelX = Math.floor((screenWidth - goPanelW) / 2);
      const goPanelY = Math.floor((screenHeight - goPanelH) / 2) - 20;

      // Panel bg
      this._bg.rect(goPanelX + 4, goPanelY + 4, goPanelW, goPanelH);
      this._bg.fill({ color: 0x000000, alpha: 0.4 });
      this._bg.rect(goPanelX, goPanelY, goPanelW, goPanelH);
      this._bg.fill({ color: 0x0a0a18, alpha: 0.96 });
      drawOrnateFrame(this._bg, goPanelX, goPanelY, goPanelW, goPanelH, {
        color: 0x882222,
        highlight: 0xcc4444,
      });

      // "GAME OVER" title
      const goTitle = new Text({
        text: "GAME OVER",
        style: new TextStyle({
          fontFamily: "Georgia, serif",
          fontSize: 30,
          fill: 0xff4444,
          fontWeight: "bold",
          letterSpacing: 4,
          stroke: { color: 0x000000, width: 4 },
          dropShadow: { color: 0xcc0000, blur: 10, distance: 0, alpha: 0.4 },
        }),
      });
      goTitle.x = goPanelX + goPanelW / 2;
      goTitle.anchor.set(0.5, 0);
      goTitle.y = goPanelY + 18;
      this.container.addChild(goTitle);
      this._spellTexts.push(goTitle);

      const goDivY = goPanelY + 58;
      drawTitleDivider(this._bg, goPanelX, goPanelW, goDivY);

      // Floor reached
      let goY = goDivY + 14;
      const floorT = new Text({
        text: `Floor Reached: ${state.currentLevel + 1}/25`,
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xffaa66, fontWeight: "bold" }),
      });
      floorT.x = goPanelX + goPanelW / 2;
      floorT.anchor.set(0.5, 0);
      floorT.y = goY;
      this.container.addChild(floorT);
      this._spellTexts.push(floorT);
      goY += 24;

      // Run summary stats
      const goSummary = formatRunSummary(state.runStats);
      for (const line of goSummary) {
        const lt = new Text({
          text: line,
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0x999999 }),
        });
        lt.x = goPanelX + 24;
        lt.y = goY;
        this.container.addChild(lt);
        this._spellTexts.push(lt);
        goY += 15;
      }

      // Footer
      const goFooter = new Text({
        text: "R: Restart  |  ESC: Exit",
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xffcc44, fontWeight: "bold" }),
      });
      goFooter.x = goPanelX + goPanelW / 2;
      goFooter.anchor.set(0.5, 0);
      goFooter.y = goPanelY + goPanelH - 32;
      this.container.addChild(goFooter);
      this._spellTexts.push(goFooter);
    } else if (state.phase === RWPhase.LEVEL_SUMMARY) {
      // --- Level Summary Screen ---
      this._msgText.text = "";
      // Overlay
      this._bg.rect(0, 0, screenWidth, screenHeight - hudH);
      this._bg.fill({ color: 0x000000, alpha: 0.7 });

      const lsPanelW = 380;
      const lsPanelH = 280;
      const lsPanelX = Math.floor((screenWidth - lsPanelW) / 2);
      const lsPanelY = Math.floor((screenHeight - lsPanelH) / 2) - 20;

      // Panel bg
      this._bg.rect(lsPanelX + 4, lsPanelY + 4, lsPanelW, lsPanelH);
      this._bg.fill({ color: 0x000000, alpha: 0.4 });
      this._bg.rect(lsPanelX, lsPanelY, lsPanelW, lsPanelH);
      this._bg.fill({ color: 0x0a0a18, alpha: 0.96 });
      drawOrnateFrame(this._bg, lsPanelX, lsPanelY, lsPanelW, lsPanelH, {
        color: 0x44aa44,
        highlight: 0x66dd66,
      });

      // Title
      const lsTitle = new Text({
        text: `Level ${state.currentLevel + 1} Complete!`,
        style: new TextStyle({
          fontFamily: "Georgia, serif",
          fontSize: 24,
          fill: 0x44ff88,
          fontWeight: "bold",
          letterSpacing: 3,
          stroke: { color: 0x000000, width: 3 },
          dropShadow: { color: 0x22aa44, blur: 8, distance: 0, alpha: 0.4 },
        }),
      });
      lsTitle.x = lsPanelX + lsPanelW / 2;
      lsTitle.anchor.set(0.5, 0);
      lsTitle.y = lsPanelY + 18;
      this.container.addChild(lsTitle);
      this._spellTexts.push(lsTitle);

      const lsDivY = lsPanelY + 56;
      drawTitleDivider(this._bg, lsPanelX, lsPanelW, lsDivY);

      // Level stats (derived from run stats as best approximation)
      let lsY = lsDivY + 14;
      const levelStatLines = [
        `Enemies Killed: ${state.runStats.enemiesKilled}`,
        `Turns Played: ${state.runStats.turnsPlayed}`,
        `Total Damage Dealt: ${state.runStats.totalDamageDealt}`,
        `Floors Cleared: ${state.runStats.floorsCleared}/25`,
      ];
      for (const line of levelStatLines) {
        const lt = new Text({
          text: line,
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xbbbbcc }),
        });
        lt.x = lsPanelX + 30;
        lt.y = lsY;
        this.container.addChild(lt);
        this._spellTexts.push(lt);
        lsY += 20;
      }

      // Footer
      const lsFooter = new Text({
        text: "SPACE / Enter to continue to Spell Shop",
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xffcc44, fontWeight: "bold" }),
      });
      lsFooter.x = lsPanelX + lsPanelW / 2;
      lsFooter.anchor.set(0.5, 0);
      lsFooter.y = lsPanelY + lsPanelH - 36;
      this.container.addChild(lsFooter);
      this._spellTexts.push(lsFooter);
    } else if (state.level.cleared && state.currentLevel < 24) {
      this._msgText.text = "Level Cleared! Walk to a rift portal.";
      this._msgText.style = new TextStyle({
        fontFamily: "monospace",
        fontSize: 16,
        fill: 0x44ff88,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 },
      });
    } else if (state.phase === RWPhase.TARGETING) {
      const spell = state.spells[state.selectedSpellIndex];
      if (spell) {
        const def = SPELL_DEFS[spell.defId];
        this._msgText.text = `Targeting: ${def?.name ?? "?"} — Arrows + Enter | Esc cancel`;
        this._msgText.style = new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fill: SCHOOL_COLORS[spell.school] ?? 0xffffff,
          fontWeight: "bold",
          stroke: { color: 0x000000, width: 3 },
        });
      }
    } else if (state.phase === RWPhase.SPELL_SHOP) {
      this._msgText.text = "";
    }
    this._msgText.x = Math.floor(screenWidth / 2);
    this._msgText.y = 12;
    this._msgText.anchor.set(0.5, 0);

    // --- Hover tooltip system (works in PLAYING and TARGETING phases) ---
    {
      // Determine the grid cell to inspect: targeting cursor or mouse hover
      const inspectCell = (state.phase === RWPhase.TARGETING && state.targetCursor)
        ? state.targetCursor
        : (state.phase === RWPhase.PLAYING && hoverGrid) ? hoverGrid : null;

      if (inspectCell) {
        const ic = inspectCell;
        const tooltipLines: { text: string; color: number; bold?: boolean }[] = [];
        let borderColor = 0x444477;

        // Check for enemy at this cell
        const hovEnemy = state.level.enemies.find(e => e.alive && e.col === ic.col && e.row === ic.row);
        if (hovEnemy) {
          const eDef = ENEMY_DEFS[hovEnemy.defId];
          borderColor = 0xcc4444;
          tooltipLines.push({ text: eDef?.name ?? hovEnemy.defId, color: 0xff6666, bold: true });
          tooltipLines.push({ text: `HP: ${hovEnemy.hp} / ${hovEnemy.maxHp}`, color: 0xcccccc });
          tooltipLines.push({ text: `Dmg: ${hovEnemy.damage}  Range: ${hovEnemy.range}  Speed: ${hovEnemy.moveSpeed}`, color: 0x999999 });
          tooltipLines.push({ text: `AI: ${hovEnemy.aiType}${hovEnemy.isBoss ? "  [BOSS]" : ""}`, color: hovEnemy.isBoss ? 0xff8844 : 0x777799 });
          if (hovEnemy.school) tooltipLines.push({ text: `School: ${hovEnemy.school}`, color: SCHOOL_COLORS[hovEnemy.school] ?? 0x888888 });
          if (hovEnemy.stunTurns > 0) tooltipLines.push({ text: `Stunned: ${hovEnemy.stunTurns} turns`, color: 0x44bbff });
          if (hovEnemy.statusEffects.length > 0) {
            for (const fx of hovEnemy.statusEffects) {
              tooltipLines.push({ text: `${fx.type}: ${fx.turnsRemaining}t (x${fx.magnitude})`, color: 0xaaaacc });
            }
          }
          if (hovEnemy.abilities.length > 0) {
            const abilNames = hovEnemy.abilities.map(a => SPELL_DEFS[a]?.name ?? a).join(", ");
            tooltipLines.push({ text: `Spells: ${abilNames}`, color: 0xaa88cc });
          }
        }

        // Check for summon at this cell
        if (tooltipLines.length === 0) {
          const hovSummon = state.level.summons.find(s => s.alive && s.col === ic.col && s.row === ic.row);
          if (hovSummon) {
            borderColor = 0x44cc44;
            tooltipLines.push({ text: `Summon: ${hovSummon.unitType}`, color: 0x44cc44, bold: true });
            tooltipLines.push({ text: `HP: ${hovSummon.hp} / ${hovSummon.maxHp}`, color: 0xcccccc });
            tooltipLines.push({ text: `Dmg: ${hovSummon.damage}  Range: ${hovSummon.range}`, color: 0x999999 });
            if (hovSummon.turnsRemaining > 0) tooltipLines.push({ text: `Turns left: ${hovSummon.turnsRemaining}`, color: 0xaaaa88 });
          }
        }

        // Check for spawner at this cell
        if (tooltipLines.length === 0) {
          const hovSpawner = state.level.spawners.find(s => s.alive && s.col === ic.col && s.row === ic.row);
          if (hovSpawner) {
            borderColor = 0xcc6644;
            const spawnName = ENEMY_DEFS[hovSpawner.spawnDefId]?.name ?? hovSpawner.spawnDefId;
            tooltipLines.push({ text: "Enemy Spawner", color: 0xff8844, bold: true });
            tooltipLines.push({ text: `HP: ${hovSpawner.hp} / ${hovSpawner.maxHp}`, color: 0xcccccc });
            tooltipLines.push({ text: `Spawns: ${spawnName}`, color: 0xddaa66 });
            tooltipLines.push({ text: `Every ${hovSpawner.spawnInterval} turns`, color: 0x999999 });
          }
        }

        // Check for shrine at this cell
        if (tooltipLines.length === 0) {
          const hovShrine = state.level.shrines.find(s => s.col === ic.col && s.row === ic.row);
          if (hovShrine) {
            const sc = SCHOOL_COLORS[hovShrine.school] ?? 0x888888;
            borderColor = sc;
            tooltipLines.push({ text: SHRINE_LABELS[hovShrine.effect] ?? "Shrine", color: sc, bold: true });
            tooltipLines.push({ text: getShrineDescription(hovShrine.school, hovShrine.effect, hovShrine.magnitude), color: 0xcccccc });
            tooltipLines.push({ text: hovShrine.used ? "Already used" : "Press [E] to activate", color: hovShrine.used ? 0x666666 : 0xffcc44 });
          }
        }

        // Check for spell circle at this cell
        if (tooltipLines.length === 0) {
          const hovCircle = state.level.spellCircles.find(c => c.col === ic.col && c.row === ic.row);
          if (hovCircle) {
            const sc = SCHOOL_COLORS[hovCircle.school] ?? 0x888888;
            borderColor = sc;
            tooltipLines.push({ text: `${hovCircle.school.charAt(0).toUpperCase() + hovCircle.school.slice(1)} Spell Circle`, color: sc, bold: true });
            tooltipLines.push({ text: getSpellCircleDescription(hovCircle.school), color: 0xbbbbcc });
          }
        }

        // Check for item at this cell
        if (tooltipLines.length === 0) {
          const hovItem = state.level.items.find(i => !i.picked && i.col === ic.col && i.row === ic.row);
          if (hovItem) {
            borderColor = 0xffcc44;
            const itemNames: Record<string, string> = {
              health_potion: "Health Potion",
              charge_scroll: "Charge Scroll",
              shield_scroll: "Shield Scroll",
            };
            const itemDescs: Record<string, string> = {
              health_potion: "Restores 30 HP when used",
              charge_scroll: "Restores 3 charges to a spell",
              shield_scroll: "Grants temporary shields",
            };
            tooltipLines.push({ text: itemNames[hovItem.type] ?? hovItem.type, color: 0xffcc44, bold: true });
            tooltipLines.push({ text: itemDescs[hovItem.type] ?? "", color: 0xbbbbcc });
            tooltipLines.push({ text: "Walk over to pick up", color: 0x888899 });
          }
        }

        // Check for rift portal at this cell
        if (tooltipLines.length === 0) {
          const hovPortal = state.level.riftPortals.find(p => p.col === ic.col && p.row === ic.row);
          if (hovPortal) {
            const sc = SCHOOL_COLORS[hovPortal.theme] ?? 0x8844ff;
            borderColor = sc;
            tooltipLines.push({ text: hovPortal.label || "Rift Portal", color: sc, bold: true });
            tooltipLines.push({ text: "Exit to next level", color: 0xbbbbcc });
            tooltipLines.push({ text: state.level.cleared ? "Press [E] to enter" : "Clear all enemies first", color: state.level.cleared ? 0xffcc44 : 0xff6644 });
          }
        }

        // Check tile type for special tiles
        if (tooltipLines.length === 0) {
          const tile = state.level.tiles[ic.row]?.[ic.col];
          if (tile === RWTileType.LAVA) {
            borderColor = 0xff4400;
            tooltipLines.push({ text: "Lava", color: 0xff6633, bold: true });
            tooltipLines.push({ text: "Deals 15 damage when walked on", color: 0xccaa88 });
          } else if (tile === RWTileType.ICE) {
            borderColor = 0x44bbff;
            tooltipLines.push({ text: "Ice", color: 0x88ccff, bold: true });
            tooltipLines.push({ text: "Slippery surface", color: 0xbbbbcc });
          } else if (tile === RWTileType.CHASM) {
            borderColor = 0x222244;
            tooltipLines.push({ text: "Chasm", color: 0x666688, bold: true });
            tooltipLines.push({ text: "Impassable void", color: 0x555566 });
          }
        }

        // Draw tooltip if there are lines
        if (tooltipLines.length > 0) {
          const lineH = 14;
          const ttPad = 8;
          const ttW = 260;
          const ttH = tooltipLines.length * lineH + ttPad * 2;
          const ttX = Math.floor(screenWidth / 2 - ttW / 2);
          const ttY = 36;

          // Drop shadow
          this._bg.rect(ttX + 2, ttY + 2, ttW, ttH);
          this._bg.fill({ color: 0x000000, alpha: 0.35 });
          // Background
          this._bg.rect(ttX - 1, ttY - 1, ttW + 2, ttH + 2);
          this._bg.fill({ color: 0x000000, alpha: 0.4 });
          this._bg.rect(ttX, ttY, ttW, ttH);
          this._bg.fill({ color: 0x0a0a18, alpha: 0.94 });
          // Double border
          this._bg.rect(ttX, ttY, ttW, ttH);
          this._bg.stroke({ color: borderColor, width: 1.5 });
          this._bg.rect(ttX + 2, ttY + 2, ttW - 4, ttH - 4);
          this._bg.stroke({ color: borderColor, width: 0.5, alpha: 0.3 });
          // Top accent glow
          this._bg.rect(ttX, ttY, ttW, 2);
          this._bg.fill({ color: borderColor, alpha: 0.6 });
          // Corner bevels
          const bv = 6;
          this._bg.moveTo(ttX, ttY + bv); this._bg.lineTo(ttX + bv, ttY);
          this._bg.stroke({ color: borderColor, width: 0.8, alpha: 0.4 });
          this._bg.moveTo(ttX + ttW - bv, ttY); this._bg.lineTo(ttX + ttW, ttY + bv);
          this._bg.stroke({ color: borderColor, width: 0.8, alpha: 0.4 });
          this._bg.moveTo(ttX, ttY + ttH - bv); this._bg.lineTo(ttX + bv, ttY + ttH);
          this._bg.stroke({ color: borderColor, width: 0.8, alpha: 0.4 });
          this._bg.moveTo(ttX + ttW - bv, ttY + ttH); this._bg.lineTo(ttX + ttW, ttY + ttH - bv);
          this._bg.stroke({ color: borderColor, width: 0.8, alpha: 0.4 });

          for (let li = 0; li < tooltipLines.length; li++) {
            const line = tooltipLines[li];
            const lineT = new Text({
              text: line.text,
              style: new TextStyle({
                fontFamily: "monospace",
                fontSize: line.bold ? 12 : 10,
                fill: line.color,
                fontWeight: line.bold ? "bold" : "normal",
              }),
            });
            lineT.x = ttX + ttPad;
            lineT.y = ttY + ttPad + li * lineH;
            this.container.addChild(lineT);
            this._spellTexts.push(lineT);
          }
        }
      }
    }

    // --- Minimap (top-right corner, drawn on _bg) ---
    const tileSize = 3;
    const mapW = state.level.width * tileSize;
    const mapH = state.level.height * tileSize;
    const mmX = screenWidth - mapW - 8;
    const mmY = 8;

    // Minimap background with ornate double border
    this._bg.rect(mmX - 4, mmY - 4, mapW + 8, mapH + 8);
    this._bg.fill({ color: 0x000000, alpha: 0.7 });
    // Outer border
    this._bg.rect(mmX - 4, mmY - 4, mapW + 8, mapH + 8);
    this._bg.stroke({ color: 0x333355, width: 1.5, alpha: 0.8 });
    // Inner border
    this._bg.rect(mmX - 1, mmY - 1, mapW + 2, mapH + 2);
    this._bg.stroke({ color: 0x222244, width: 0.5, alpha: 0.5 });
    // Top glow accent
    this._bg.rect(mmX - 3, mmY - 3, mapW + 6, 1);
    this._bg.fill({ color: 0x4444aa, alpha: 0.4 });
    // Corner dots
    for (const [cx, cy] of [[mmX - 3, mmY - 3], [mmX + mapW + 3, mmY - 3], [mmX - 3, mmY + mapH + 3], [mmX + mapW + 3, mmY + mapH + 3]]) {
      this._bg.circle(cx, cy, 1.5);
      this._bg.fill({ color: 0x4444aa, alpha: 0.4 });
    }

    // Draw tiles
    for (let row = 0; row < state.level.height; row++) {
      for (let col = 0; col < state.level.width; col++) {
        const tile = state.level.tiles[row]?.[col];
        if (tile === undefined) continue;
        let color: number;
        switch (tile) {
          case RWTileType.WALL:
            color = 0x1a1a2e;
            break;
          case RWTileType.FLOOR:
          case RWTileType.CORRIDOR:
            color = 0x3a3a4a;
            break;
          case RWTileType.LAVA:
            color = 0xcc3300;
            break;
          case RWTileType.ICE:
            color = 0x3388bb;
            break;
          case RWTileType.CHASM:
            color = 0x080810;
            break;
          case RWTileType.SHRINE:
            color = 0xffcc44;
            break;
          case RWTileType.SPELL_CIRCLE:
            color = 0x8844ff;
            break;
          case RWTileType.RIFT_PORTAL:
            color = 0x9933ff;
            break;
          default:
            color = 0x1a1a2e;
            break;
        }
        this._bg.rect(mmX + col * tileSize, mmY + row * tileSize, tileSize, tileSize);
        this._bg.fill(color);
      }
    }

    // Draw items (not picked) as yellow dots, 1x1 px
    for (const item of state.level.items) {
      if (!item.picked) {
        this._bg.rect(mmX + item.col * tileSize + 1, mmY + item.row * tileSize + 1, 1, 1);
        this._bg.fill(0xffcc00);
      }
    }

    // Draw alive summons as green dots, 2x2 px
    for (const summon of state.level.summons) {
      if (summon.alive) {
        this._bg.rect(mmX + summon.col * tileSize, mmY + summon.row * tileSize, 2, 2);
        this._bg.fill(0x44cc88);
      }
    }

    // Draw alive enemies as red dots, 2x2 px
    for (const enemy of state.level.enemies) {
      if (enemy.alive) {
        this._bg.rect(mmX + enemy.col * tileSize, mmY + enemy.row * tileSize, 2, 2);
        this._bg.fill(0xcc2222);
      }
    }

    // Draw wizard position as bright blue dot, 3x3 px
    this._bg.rect(mmX + state.wizard.col * tileSize, mmY + state.wizard.row * tileSize, tileSize, tileSize);
    this._bg.fill(0x4488ff);

    // --- Combat Log (top-left area) ---
    // Remove old log texts
    for (const t of this._logTexts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._logTexts = [];

    if (this._logLines.length > 0) {
      const logX = 8;
      const logY = 20;
      const lineH = 13;
      const logW = 260;
      const logH = this._logLines.length * lineH + 6;

      // Subtle dark background
      this._bg.rect(logX - 2, logY - 2, logW + 4, logH + 4);
      this._bg.fill({ color: 0x000000, alpha: 0.5 });

      for (let i = 0; i < this._logLines.length; i++) {
        const age = this._logLines.length - 1 - i; // 0 = newest
        const alpha = 1.0 - age * 0.15;
        const logText = new Text({
          text: this._logLines[i],
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0x999999,
          }),
        });
        logText.x = logX;
        logText.y = logY + i * lineH;
        logText.alpha = Math.max(0.3, alpha);
        this.container.addChild(logText);
        this._logTexts.push(logText);
      }
    }

    // --- Run Seed display (bottom-right corner) ---
    {
      const seedStr = `Seed: ${state.runSeed}`;
      const seedText = new Text({
        text: seedStr,
        style: new TextStyle({
          fontFamily: "Georgia, serif",
          fontSize: 9,
          fill: 0x555577,
        }),
      });
      seedText.x = screenWidth - seedText.width - 8;
      seedText.y = screenHeight - 14;
      this.container.addChild(seedText);
      this._spellTexts.push(seedText);
    }

    // --- Spell Preview Info Panel (TARGETING phase) ---
    if (state.phase === RWPhase.TARGETING) {
      const spell = state.spells[state.selectedSpellIndex];
      if (spell) {
        const def = SPELL_DEFS[spell.defId];
        if (def) {
          const schoolColor = SCHOOL_COLORS[spell.school] ?? 0xffffff;
          const spPanelW = 280;
          const spPanelH = 70;
          const spPanelX = Math.floor((screenWidth - spPanelW) / 2);
          const spPanelY = hudY - spPanelH - 8;

          // Panel background
          this._bg.rect(spPanelX, spPanelY, spPanelW, spPanelH);
          this._bg.fill({ color: 0x0a0a18, alpha: 0.92 });
          this._bg.rect(spPanelX, spPanelY, spPanelW, spPanelH);
          this._bg.stroke({ color: schoolColor, width: 1.5, alpha: 0.7 });
          // Top accent
          this._bg.rect(spPanelX, spPanelY, spPanelW, 2);
          this._bg.fill({ color: schoolColor, alpha: 0.6 });

          const spInfoLines: string[] = [
            `${def.name} (${spell.school})`,
            `Dmg: ${spell.damage}  Range: ${spell.range}  AoE: ${spell.aoeRadius}  Charges: ${spell.charges}/${spell.maxCharges}`,
          ];

          // Check for enemy under cursor for projected damage
          if (state.targetCursor) {
            const tc = state.targetCursor;
            const targetEnemy = state.level.enemies.find(e => e.alive && e.col === tc.col && e.row === tc.row);
            if (targetEnemy) {
              const eDef = ENEMY_DEFS[targetEnemy.defId];
              spInfoLines.push(`Target: ${eDef?.name ?? targetEnemy.defId} (${targetEnemy.hp}HP) — Projected: ${spell.damage} dmg`);
            }
          }

          for (let li = 0; li < spInfoLines.length; li++) {
            const spLineT = new Text({
              text: spInfoLines[li],
              style: new TextStyle({
                fontFamily: "Georgia, serif",
                fontSize: li === 0 ? 12 : 10,
                fill: li === 0 ? schoolColor : 0xaaaacc,
                fontWeight: li === 0 ? "bold" : "normal",
              }),
            });
            spLineT.x = spPanelX + 10;
            spLineT.y = spPanelY + 8 + li * 16;
            this.container.addChild(spLineT);
            this._spellTexts.push(spLineT);
          }

          // Show active synergies for this spell
          const spellSchools = new Set(state.spells.map(s => s.school));
          const activeSynergies = getActiveSynergies(spellSchools);
          const relevantSynergies = activeSynergies.filter(syn =>
            syn.schools[0] === spell.school || syn.schools[1] === spell.school
          );
          if (relevantSynergies.length > 0) {
            const synY = spPanelY + 8 + spInfoLines.length * 16;
            const synT = new Text({
              text: `Synergies: ${relevantSynergies.map(s => s.name).join(", ")}`,
              style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 9, fill: 0xccaa44 }),
            });
            synT.x = spPanelX + 10;
            synT.y = synY;
            this.container.addChild(synT);
            this._spellTexts.push(synT);
          }
        }
      }
    }

    // --- Pause menu overlay ---
    this._updatePauseMenu(state, screenWidth, screenHeight);

    // Keyboard reference overlay
    // Remove old key ref texts
    for (const t of this._keyRefTexts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._keyRefTexts = [];

    if (this._showKeyRef) {
      const refW = 240;
      const refH = 200;
      const refX = Math.floor((screenWidth - refW) / 2);
      const refY = Math.floor((screenHeight - refH) / 2) - 40;

      // Drop shadow
      this._bg.rect(refX + 3, refY + 3, refW, refH);
      this._bg.fill({ color: 0x000000, alpha: 0.35 });
      // Background
      this._bg.rect(refX, refY, refW, refH);
      this._bg.fill({ color: 0x0a0a18, alpha: 0.95 });
      // Ornate frame
      drawOrnateFrame(this._bg, refX, refY, refW, refH, {
        color: 0x4444aa,
        highlight: 0x6666dd,
        headerBand: false,
        grid: false,
        runicTicks: false,
        edgeFiligree: false,
      });

      const keys = [
        "KEYBOARD REFERENCE",
        "",
        "Arrow Keys / WASD  Move",
        "1-9                Cast spell",
        "Enter              Confirm target",
        "Escape             Cancel / Exit",
        "Tab                Spell shop tabs",
        "Space              Buy spell/upgrade",
        "P                  Use potion",
        "C                  Use scroll",
        "Z / U              Undo last move",
        "R                  Restart (game over)",
        "?                  Toggle this help",
      ];

      for (let i = 0; i < keys.length; i++) {
        const isHeader = i === 0;
        const txt = new Text({
          text: keys[i],
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: isHeader ? 13 : 10,
            fill: isHeader ? 0xffffff : 0xaaaacc,
            fontWeight: isHeader ? "bold" : "normal",
          }),
        });
        txt.x = refX + 12;
        txt.y = refY + 8 + i * 14;
        this.container.addChild(txt);
        this._keyRefTexts.push(txt);
      }
    }
  }

  private _updatePauseMenu(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    // Clean up previous pause texts and buttons
    for (const t of this._pauseTexts) {
      this._pauseContainer.removeChild(t);
      t.destroy();
    }
    this._pauseTexts = [];
    for (const btn of this._pauseButtons) {
      this._pauseContainer.removeChild(btn.gfx);
      this._pauseContainer.removeChild(btn.text);
      btn.gfx.destroy();
      btn.text.destroy();
    }
    this._pauseButtons = [];

    if (state.phase !== RWPhase.PAUSED) {
      this._pauseContainer.visible = false;
      return;
    }
    this._pauseContainer.visible = true;

    // Semi-transparent dark overlay covering full screen
    this._pauseBg.clear();
    this._pauseBg.rect(0, 0, screenWidth, screenHeight);
    this._pauseBg.fill({ color: 0x000000, alpha: 0.7 });

    switch (this.pauseSubMenu) {
      case "main":
        this._drawPauseMain(state, screenWidth, screenHeight);
        break;
      case "controls":
        this._drawPauseControls(state, screenWidth, screenHeight);
        break;
      case "instructions":
        this._drawPauseInstructions(state, screenWidth, screenHeight);
        break;
      case "spells":
        this._drawPauseSpells(state, screenWidth, screenHeight);
        break;
      case "buy":
        this._drawPauseBuy(state, screenWidth, screenHeight);
        break;
      case "abilities":
        this._drawPauseAbilities(state, screenWidth, screenHeight);
        break;
      case "leaderboard":
        this._drawPauseLeaderboard(state, screenWidth, screenHeight);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Main hub
  // -------------------------------------------------------------------------

  private _drawPausePanel(screenWidth: number, screenHeight: number, panelW: number, panelH: number): { panelX: number; panelY: number } {
    const panelX = Math.floor((screenWidth - panelW) / 2);
    const panelY = Math.floor((screenHeight - panelH) / 2);

    // Drop shadow
    this._pauseBg.rect(panelX + 4, panelY + 4, panelW, panelH);
    this._pauseBg.fill({ color: 0x000000, alpha: 0.4 });

    // Panel background
    this._pauseBg.rect(panelX, panelY, panelW, panelH);
    this._pauseBg.fill({ color: 0x0a0a18, alpha: 0.96 });

    // Inner shadow
    this._pauseBg.rect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
    this._pauseBg.fill({ color: 0x050510, alpha: 0.3 });

    // Draw the full ornate frame (grid, triple border, gems, flourishes, ticks)
    drawOrnateFrame(this._pauseBg, panelX, panelY, panelW, panelH, {
      color: 0x4444aa,
      highlight: 0x6666dd,
    });

    // === Additional arcane circle ornaments at corners ===
    const arcaneCorners: [number, number][] = [
      [panelX + 18, panelY + 18],
      [panelX + panelW - 18, panelY + 18],
      [panelX + 18, panelY + panelH - 18],
      [panelX + panelW - 18, panelY + panelH - 18],
    ];
    for (const [acx, acy] of arcaneCorners) {
      // Outer arcane ring
      this._pauseBg.circle(acx, acy, 8);
      this._pauseBg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.15 });
      // Inner arcane ring
      this._pauseBg.circle(acx, acy, 4);
      this._pauseBg.stroke({ color: 0x5555cc, width: 0.5, alpha: 0.1 });
      // Radial lines (6 rays)
      for (let r = 0; r < 6; r++) {
        const angle = (r * Math.PI) / 3;
        this._pauseBg.moveTo(acx + Math.cos(angle) * 4, acy + Math.sin(angle) * 4);
        this._pauseBg.lineTo(acx + Math.cos(angle) * 8, acy + Math.sin(angle) * 8);
        this._pauseBg.stroke({ color: 0x4444aa, width: 0.3, alpha: 0.12 });
      }
    }

    // === Rune glyphs along top and bottom edges ===
    const glyphSpacing = 36;
    for (let gx = panelX + 40; gx < panelX + panelW - 40; gx += glyphSpacing) {
      // Top edge mini-rune (small hexagon)
      this._drawMiniRune(gx, panelY + 3, 0x4444aa);
      // Bottom edge mini-rune
      this._drawMiniRune(gx, panelY + panelH - 3, 0x4444aa);
    }

    return { panelX, panelY };
  }

  /** Draw a tiny hexagonal rune glyph */
  private _drawMiniRune(cx: number, cy: number, color: number): void {
    const s = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const x = cx + Math.cos(a) * s;
      const y = cy + Math.sin(a) * s;
      if (i === 0) this._pauseBg.moveTo(x, y);
      else this._pauseBg.lineTo(x, y);
    }
    this._pauseBg.closePath();
    this._pauseBg.fill({ color, alpha: 0.15 });
    this._pauseBg.stroke({ color, alpha: 0.25, width: 0.3 });
  }

  private _addPauseTitle(panelX: number, panelW: number, y: number, text: string): number {
    const title = new Text({
      text,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 3,
        stroke: { color: 0x000000, width: 3 },
        dropShadow: {
          color: 0x2222aa,
          blur: 6,
          distance: 0,
          alpha: 0.4,
        },
      }),
    });
    title.x = panelX + panelW / 2;
    title.anchor.set(0.5, 0);
    title.y = y;
    this._pauseContainer.addChild(title);
    this._pauseTexts.push(title);

    const lineY = y + 36;
    drawTitleDivider(this._pauseBg, panelX, panelW, lineY);

    return lineY + 12;
  }

  private _addPauseDivider(panelX: number, panelW: number, y: number): number {
    // Main line
    this._pauseBg.moveTo(panelX + 20, y);
    this._pauseBg.lineTo(panelX + panelW - 20, y);
    this._pauseBg.stroke({ color: 0x333355, width: 1, alpha: 0.4 });
    // Small diamond at center
    const cx = panelX + panelW / 2;
    const ds = 3;
    this._pauseBg.moveTo(cx, y - ds);
    this._pauseBg.lineTo(cx + ds, y);
    this._pauseBg.lineTo(cx, y + ds);
    this._pauseBg.lineTo(cx - ds, y);
    this._pauseBg.closePath();
    this._pauseBg.fill({ color: 0x4444aa, alpha: 0.25 });
    // End dots
    this._pauseBg.circle(panelX + 20, y, 1.2);
    this._pauseBg.fill({ color: 0x4444aa, alpha: 0.3 });
    this._pauseBg.circle(panelX + panelW - 20, y, 1.2);
    this._pauseBg.fill({ color: 0x4444aa, alpha: 0.3 });
    return y + 12;
  }

  private _drawPauseMain(_state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 340;
    const panelH = 580;
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "PAUSED");

    // Resume
    this._addPauseButton(panelX, yOff, panelW, "Resume", 0x228844, () => {
      if (this.onPauseResume) this.onPauseResume();
    });
    yOff += 36;

    // Save Game
    this._addPauseButton(panelX, yOff, panelW, "Save Game", 0x446688, () => {
      if (this.onPauseSave) this.onPauseSave();
    });
    yOff += 32;

    // Load Game
    this._addPauseButton(panelX, yOff, panelW, "Load Game", 0x446688, () => {
      if (this.onPauseLoad) this.onPauseLoad();
    });
    yOff += 36;

    yOff = this._addPauseDivider(panelX, panelW, yOff);

    // Controls
    this._addPauseButton(panelX, yOff, panelW, "Controls", 0x445588, () => {
      this.pauseSubMenu = "controls";
    });
    yOff += 32;

    // Instructions
    this._addPauseButton(panelX, yOff, panelW, "Instructions", 0x555588, () => {
      this.pauseSubMenu = "instructions";
    });
    yOff += 32;

    // Spells
    this._addPauseButton(panelX, yOff, panelW, "Spells", 0x664488, () => {
      this.pauseSubMenu = "spells";
    });
    yOff += 32;

    // Buy Spells
    this._addPauseButton(panelX, yOff, panelW, "Buy Spells / Upgrades", 0x886644, () => {
      this.pauseSubMenu = "buy";
      this._buySelectedIndex = 0;
      this._buyViewingUpgrades = false;
    });
    yOff += 32;

    // Abilities
    this._addPauseButton(panelX, yOff, panelW, "Abilities", 0x448866, () => {
      this.pauseSubMenu = "abilities";
      this._abilitiesSelectedIndex = 0;
    });
    yOff += 32;

    // Codex
    this._addPauseButton(panelX, yOff, panelW, "Codex", 0x885588, () => {
      if (this.onPauseCodex) this.onPauseCodex();
    });
    yOff += 32;

    // Leaderboard
    this._addPauseButton(panelX, yOff, panelW, "Leaderboard", 0x888844, () => {
      this.pauseSubMenu = "leaderboard";
    });
    yOff += 36;

    yOff = this._addPauseDivider(panelX, panelW, yOff);

    // Tutorial Toggle
    this._addPauseButton(panelX, yOff, panelW, `Tutorial: ${this.tutorialEnabled ? "ON" : "OFF"}`, 0x556655, () => {
      this.tutorialEnabled = !this.tutorialEnabled;
    });
    yOff += 36;

    yOff = this._addPauseDivider(panelX, panelW, yOff);

    // Restart
    this._addPauseButton(panelX, yOff, panelW, "Restart Run", 0x886622, () => {
      if (this.onPauseRestart) this.onPauseRestart();
    });
    yOff += 32;

    // Exit
    this._addPauseButton(panelX, yOff, panelW, "Exit to Menu", 0x882222, () => {
      if (this.onPauseExit) this.onPauseExit();
    });
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Controls
  // -------------------------------------------------------------------------

  private _drawPauseControls(_state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 400;
    const panelH = 340;
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "CONTROLS");

    const controls: [string, string][] = [
      ["Arrow Keys / WASD", "Move wizard"],
      ["1-9", "Select & cast spell"],
      ["Enter / Space", "Confirm target / Pass turn"],
      ["Escape", "Open menu / Back"],
      ["E", "Interact (shrine/portal/item)"],
      ["P", "Use health potion"],
      ["C", "Use charge scroll"],
      ["Z / U", "Undo last move"],
      ["?", "Toggle quick-help overlay"],
      ["Q / E (in menus)", "Switch tabs"],
      ["Arrow Keys (in menus)", "Navigate"],
    ];

    for (const [key, desc] of controls) {
      // Key badge
      const keyText = new Text({
        text: key,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 11,
          fill: 0xffcc44,
          fontWeight: "bold",
        }),
      });
      keyText.x = panelX + 24;
      keyText.y = yOff;
      this._pauseContainer.addChild(keyText);
      this._pauseTexts.push(keyText);

      const descText = new Text({
        text: desc,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 11,
          fill: 0x9999bb,
        }),
      });
      descText.x = panelX + 200;
      descText.y = yOff;
      this._pauseContainer.addChild(descText);
      this._pauseTexts.push(descText);
      yOff += 18;
    }

    yOff += 12;
    this._addPauseButton(panelX, yOff, panelW, "Back", 0x444466, () => {
      this.pauseSubMenu = "main";
    });
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Instructions
  // -------------------------------------------------------------------------

  private _drawPauseInstructions(_state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 420;
    const panelH = 400;
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "HOW TO PLAY");

    const sections: { header: string; lines: string[] }[] = [
      {
        header: "Goal",
        lines: [
          "Navigate 25 dungeon levels. Defeat all enemies",
          "on each floor to open the rift portal and advance.",
        ],
      },
      {
        header: "Combat",
        lines: [
          "Press 1-9 to select a spell, then move the cursor",
          "with arrows/WASD and press Enter to cast.",
          "Space or Enter with no spell passes your turn.",
        ],
      },
      {
        header: "Exploration",
        lines: [
          "Shrines grant permanent buffs to matching spells.",
          "Spell circles reduce the cost of same-school spells.",
          "Pick up potions (P) and scrolls (C) on the ground.",
        ],
      },
      {
        header: "Progression",
        lines: [
          "Earn SP by clearing levels. Spend SP at the spell",
          "shop (between levels) or from the Buy menu here.",
          "Upgrade your spells for more damage, range, or AoE.",
        ],
      },
    ];

    for (const section of sections) {
      const hdr = new Text({
        text: section.header,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 13,
          fill: 0xccccff,
          fontWeight: "bold",
        }),
      });
      hdr.x = panelX + 20;
      hdr.y = yOff;
      this._pauseContainer.addChild(hdr);
      this._pauseTexts.push(hdr);
      yOff += 18;

      for (const line of section.lines) {
        const lt = new Text({
          text: line,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0x8888aa,
          }),
        });
        lt.x = panelX + 24;
        lt.y = yOff;
        this._pauseContainer.addChild(lt);
        this._pauseTexts.push(lt);
        yOff += 14;
      }
      yOff += 8;
    }

    yOff += 4;
    this._addPauseButton(panelX, yOff, panelW, "Back", 0x444466, () => {
      this.pauseSubMenu = "main";
    });
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Spells (view current loadout)
  // -------------------------------------------------------------------------

  private _drawPauseSpells(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 460;
    // Calculate height based on spells + their upgrades
    let estimatedH = 120;
    for (const spell of state.spells) {
      estimatedH += 52 + spell.upgrades.length * 16 + (spell.upgrades.length > 0 ? 8 : 0);
    }
    const panelH = Math.min(screenHeight - 40, Math.max(180, estimatedH));
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "YOUR SPELLS");

    if (state.spells.length === 0) {
      const noSpells = new Text({
        text: "No spells learned yet.",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x666688 }),
      });
      noSpells.x = panelX + 20;
      noSpells.y = yOff;
      this._pauseContainer.addChild(noSpells);
      this._pauseTexts.push(noSpells);
      yOff += 24;
    } else {
      for (let i = 0; i < state.spells.length; i++) {
        const spell = state.spells[i];
        const def = SPELL_DEFS[spell.defId];
        if (!def) continue;

        const schoolColor = SCHOOL_COLORS[spell.school] ?? 0x666666;
        const isEmpty = spell.charges <= 0;
        const slotH = 52 + spell.upgrades.length * 16 + (spell.upgrades.length > 0 ? 8 : 0);

        // Spell slot background
        this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, slotH);
        this._pauseBg.fill({ color: 0x111122, alpha: 0.6 });
        // School accent
        this._pauseBg.rect(panelX + 14, yOff - 2, 4, slotH);
        this._pauseBg.fill({ color: schoolColor, alpha: isEmpty ? 0.3 : 0.8 });

        // Hotkey
        const hotkey = new Text({
          text: `[${i + 1}]`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffcc44, fontWeight: "bold" }),
        });
        hotkey.x = panelX + 24;
        hotkey.y = yOff;
        this._pauseContainer.addChild(hotkey);
        this._pauseTexts.push(hotkey);

        // Spell name
        const nameT = new Text({
          text: def.name,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: schoolColor, fontWeight: "bold" }),
        });
        nameT.x = panelX + 56;
        nameT.y = yOff;
        this._pauseContainer.addChild(nameT);
        this._pauseTexts.push(nameT);

        // Stats line
        const statsStr = `Dmg: ${spell.damage}  Range: ${spell.range}  AoE: ${spell.aoeRadius}  Charges: ${spell.charges}/${spell.maxCharges}`;
        const statsT = new Text({
          text: statsStr,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: isEmpty ? 0x555566 : 0x9999bb }),
        });
        statsT.x = panelX + 56;
        statsT.y = yOff + 16;
        this._pauseContainer.addChild(statsT);
        this._pauseTexts.push(statsT);

        // Description
        const descT = new Text({
          text: def.description,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x666688 }),
        });
        descT.x = panelX + 56;
        descT.y = yOff + 30;
        this._pauseContainer.addChild(descT);
        this._pauseTexts.push(descT);

        // School icon
        drawSchoolIcon(this._pauseBg, spell.school, panelX + panelW - 30, yOff + 18, 8, schoolColor, 0.6);

        yOff += 46;

        // Purchased upgrades
        if (spell.upgrades.length > 0) {
          yOff += 4;
          for (const upId of spell.upgrades) {
            const upDef = def.upgrades.find(u => u.id === upId);
            if (!upDef) continue;

            // Checkmark
            this._pauseBg.moveTo(panelX + 62, yOff + 6);
            this._pauseBg.lineTo(panelX + 65, yOff + 10);
            this._pauseBg.lineTo(panelX + 72, yOff + 2);
            this._pauseBg.stroke({ color: 0x44cc44, width: 1.5 });

            const upT = new Text({
              text: `${upDef.name}: ${upDef.description}`,
              style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x44aa44 }),
            });
            upT.x = panelX + 78;
            upT.y = yOff;
            this._pauseContainer.addChild(upT);
            this._pauseTexts.push(upT);
            yOff += 16;
          }
          yOff += 4;
        } else {
          yOff += 6;
        }

        if (yOff > panelY + panelH - 100) break;
      }
    }

    // Active Synergies in spells view
    if (state.spells.length > 0) {
      const spellSchools = new Set(state.spells.map(s => s.school));
      const activeSynergies = getActiveSynergies(spellSchools);
      if (activeSynergies.length > 0 && yOff < panelY + panelH - 80) {
        yOff += 4;
        yOff = this._addPauseDivider(panelX, panelW, yOff);
        const synHeader = new Text({
          text: "Active Synergies:",
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0xccaa44, fontWeight: "bold" }),
        });
        synHeader.x = panelX + 20;
        synHeader.y = yOff;
        this._pauseContainer.addChild(synHeader);
        this._pauseTexts.push(synHeader);
        yOff += 16;
        for (const syn of activeSynergies) {
          if (yOff > panelY + panelH - 50) break;
          const synT = new Text({
            text: `${syn.name}: ${syn.description}`,
            style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 9, fill: 0xbbaa66 }),
          });
          synT.x = panelX + 28;
          synT.y = yOff;
          this._pauseContainer.addChild(synT);
          this._pauseTexts.push(synT);
          yOff += 14;
        }
      }
    }

    yOff += 8;
    this._addPauseButton(panelX, Math.min(yOff, panelY + panelH - 40), panelW, "Back", 0x444466, () => {
      this.pauseSubMenu = "main";
    });
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Abilities key handler
  // -------------------------------------------------------------------------

  handleAbilitiesKey(state: RiftWizardState, key: string): void {
    const available = getAvailableAbilities(state);
    if (key === "ArrowUp") {
      this._abilitiesSelectedIndex = Math.max(0, this._abilitiesSelectedIndex - 1);
    } else if (key === "ArrowDown") {
      this._abilitiesSelectedIndex = Math.min(available.length - 1, this._abilitiesSelectedIndex);
    } else if (key === "Enter" || key === " ") {
      if (this._abilitiesSelectedIndex < available.length) {
        const sorted = available.sort((a, b) => a.spCost - b.spCost);
        const def = sorted[this._abilitiesSelectedIndex];
        if (def) {
          learnAbility(state, def.id);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Click handlers
  // -------------------------------------------------------------------------

  /** Handle mouse click in buy sub-menu. mx/my are screen coords. */
  handleBuyClick(state: RiftWizardState, mx: number, my: number, screenWidth: number, screenHeight: number): void {
    const panelW = 460;
    const panelH = Math.min(screenHeight - 40, 520);
    const panelX = Math.floor((screenWidth - panelW) / 2);
    const panelY = Math.floor((screenHeight - panelH) / 2);

    // Outside panel
    if (mx < panelX || mx > panelX + panelW || my < panelY || my > panelY + panelH) return;

    if (this._buyViewingUpgrades) {
      const spell = state.spells[this._buyUpgradeSpellIndex];
      if (!spell) return;
      const upgrades = getAvailableUpgrades(spell);
      // Upgrades list starts around panelY + 80
      const listTop = panelY + 80;
      const rowH = 38;
      if (my >= listTop && mx >= panelX + 14) {
        const idx = Math.floor((my - listTop) / rowH);
        if (idx >= 0 && idx < upgrades.length) {
          if (this._buySelectedIndex === idx) {
            const upg = upgrades[idx];
            if (upg) buyUpgrade(state, this._buyUpgradeSpellIndex, upg.id);
          } else {
            this._buySelectedIndex = idx;
          }
        }
      }
    } else {
      const available = getAvailableSpells(state);
      // "New Spells" section starts around panelY + 76, each row is 34px
      // "Upgrade Owned Spells" section follows
      const newSpellsTop = panelY + 76;
      const rowH = 34;
      if (my >= newSpellsTop && mx >= panelX + 14) {
        const maxNewVisible = Math.min(available.length, 8);
        const newSpellsBottom = newSpellsTop + maxNewVisible * rowH;

        if (my < newSpellsBottom) {
          // Clicked on a new spell
          const idx = Math.floor((my - newSpellsTop) / rowH);
          if (idx >= 0 && idx < available.length) {
            if (this._buySelectedIndex === idx) {
              learnSpell(state, available[idx].id);
            } else {
              this._buySelectedIndex = idx;
            }
          }
        } else {
          // Clicked on owned spells section
          const ownedTop = newSpellsBottom + 30; // divider + header
          const ownedRowH = 26;
          if (my >= ownedTop) {
            const ownedIdx = Math.floor((my - ownedTop) / ownedRowH);
            if (ownedIdx >= 0 && ownedIdx < state.spells.length) {
              const listIdx = available.length + ownedIdx;
              if (this._buySelectedIndex === listIdx) {
                // Enter upgrade view
                this._buyUpgradeSpellIndex = ownedIdx;
                this._buyViewingUpgrades = true;
                this._buySelectedIndex = 0;
              } else {
                this._buySelectedIndex = listIdx;
              }
            }
          }
        }
      }
    }
  }

  /** Handle mouse click in abilities sub-menu. mx/my are screen coords. */
  handleAbilitiesClick(state: RiftWizardState, mx: number, my: number, screenWidth: number, screenHeight: number): void {
    const panelW = 480;
    const panelH = Math.min(screenHeight - 40, 600);
    const panelX = Math.floor((screenWidth - panelW) / 2);
    const panelY = Math.floor((screenHeight - panelH) / 2);

    if (mx < panelX || mx > panelX + panelW || my < panelY || my > panelY + panelH) return;

    const available = getAvailableAbilities(state).sort((a, b) => a.spCost - b.spCost);
    // Learned abilities section height
    const learnedH = state.abilities.length > 0 ? (22 * state.abilities.length + 36) : 0;
    // "Buy Abilities" list starts after SP display + divider + learned section
    const buyTop = panelY + 60 + learnedH + 18;
    const rowH = 36;

    if (my >= buyTop && mx >= panelX + 14) {
      const idx = Math.floor((my - buyTop) / rowH);
      const maxVisible = Math.min(available.length, 8);
      if (idx >= 0 && idx < maxVisible) {
        if (this._abilitiesSelectedIndex === idx) {
          const sorted = available;
          const def = sorted[idx];
          if (def) learnAbility(state, def.id);
        } else {
          this._abilitiesSelectedIndex = idx;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Buy Spells / Upgrades
  // -------------------------------------------------------------------------

  handleBuyKey(state: RiftWizardState, key: string): void {
    if (this._buyViewingUpgrades) {
      const spell = state.spells[this._buyUpgradeSpellIndex];
      if (!spell) { this._buyViewingUpgrades = false; return; }
      const upgrades = getAvailableUpgrades(spell);

      if (key === "ArrowUp") {
        this._buySelectedIndex = Math.max(0, this._buySelectedIndex - 1);
      } else if (key === "ArrowDown") {
        this._buySelectedIndex = Math.min(upgrades.length - 1, this._buySelectedIndex + 1);
      } else if (key === "Enter" || key === " ") {
        const upg = upgrades[this._buySelectedIndex];
        if (upg) {
          buyUpgrade(state, this._buyUpgradeSpellIndex, upg.id);
        }
      } else if (key === "Escape" || key === "Backspace") {
        this._buyViewingUpgrades = false;
        this._buySelectedIndex = 0;
      }
    } else {
      const available = getAvailableSpells(state);
      const totalItems = available.length + state.spells.length; // spells to buy + owned spells for upgrades

      if (key === "ArrowUp") {
        this._buySelectedIndex = Math.max(0, this._buySelectedIndex - 1);
      } else if (key === "ArrowDown") {
        this._buySelectedIndex = Math.min(totalItems - 1, this._buySelectedIndex + 1);
      } else if (key === "Enter" || key === " ") {
        if (this._buySelectedIndex < available.length) {
          // Buy new spell
          const def = available[this._buySelectedIndex];
          learnSpell(state, def.id);
        } else {
          // View upgrades for owned spell
          const ownedIdx = this._buySelectedIndex - available.length;
          if (ownedIdx >= 0 && ownedIdx < state.spells.length) {
            this._buyUpgradeSpellIndex = ownedIdx;
            this._buyViewingUpgrades = true;
            this._buySelectedIndex = 0;
          }
        }
      }
    }
  }

  private _drawPauseBuy(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 460;
    const panelH = Math.min(screenHeight - 40, 520);
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "BUY SPELLS");

    // SP display
    const spT = new Text({
      text: `Skill Points: ${state.skillPoints}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffcc44, fontWeight: "bold" }),
    });
    spT.x = panelX + panelW / 2;
    spT.anchor.set(0.5, 0);
    spT.y = yOff;
    this._pauseContainer.addChild(spT);
    this._pauseTexts.push(spT);
    yOff += 22;

    yOff = this._addPauseDivider(panelX, panelW, yOff);

    if (this._buyViewingUpgrades) {
      // Show upgrades for a specific owned spell
      const spell = state.spells[this._buyUpgradeSpellIndex];
      if (spell) {
        const def = SPELL_DEFS[spell.defId];
        const schoolColor = SCHOOL_COLORS[spell.school] ?? 0x666666;

        const spellHeader = new Text({
          text: `Upgrades for: ${def?.name ?? spell.defId}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: schoolColor, fontWeight: "bold" }),
        });
        spellHeader.x = panelX + 20;
        spellHeader.y = yOff;
        this._pauseContainer.addChild(spellHeader);
        this._pauseTexts.push(spellHeader);
        yOff += 20;

        const upgrades = getAvailableUpgrades(spell);
        if (upgrades.length === 0) {
          const noUpg = new Text({
            text: "All upgrades purchased!",
            style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x44cc44 }),
          });
          noUpg.x = panelX + 24;
          noUpg.y = yOff;
          this._pauseContainer.addChild(noUpg);
          this._pauseTexts.push(noUpg);
          yOff += 20;
        } else {
          for (let i = 0; i < upgrades.length; i++) {
            const upg = upgrades[i];
            const cost = getEffectiveUpgradeCost(state, spell, upg);
            const canAfford = state.skillPoints >= cost;
            const isSelected = this._buySelectedIndex === i;

            // Selection highlight
            if (isSelected) {
              this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 34);
              this._pauseBg.fill({ color: 0x222244, alpha: 0.8 });
              this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 34);
              this._pauseBg.stroke({ color: 0x6666cc, width: 1 });
            }

            const nameT = new Text({
              text: `${upg.name}`,
              style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? 0xddddff : 0x666677, fontWeight: isSelected ? "bold" : "normal" }),
            });
            nameT.x = panelX + 24;
            nameT.y = yOff;
            this._pauseContainer.addChild(nameT);
            this._pauseTexts.push(nameT);

            const costT = new Text({
              text: `${cost} SP`,
              style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? 0xffcc44 : 0x884422 }),
            });
            costT.x = panelX + panelW - 60;
            costT.y = yOff;
            this._pauseContainer.addChild(costT);
            this._pauseTexts.push(costT);

            const descT = new Text({
              text: upg.description,
              style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x777799 }),
            });
            descT.x = panelX + 24;
            descT.y = yOff + 15;
            this._pauseContainer.addChild(descT);
            this._pauseTexts.push(descT);

            yOff += 38;
          }
        }

        yOff += 8;
        // Hint
        const hint = new Text({
          text: "[Enter] Buy  [Esc] Back to list",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x555577 }),
        });
        hint.x = panelX + panelW / 2;
        hint.anchor.set(0.5, 0);
        hint.y = yOff;
        this._pauseContainer.addChild(hint);
        this._pauseTexts.push(hint);
      }
    } else {
      // Main buy list: available spells + owned spells (for upgrade access)
      const available = getAvailableSpells(state);

      if (available.length > 0) {
        const secH = new Text({
          text: "New Spells",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xccccff, fontWeight: "bold" }),
        });
        secH.x = panelX + 20;
        secH.y = yOff;
        this._pauseContainer.addChild(secH);
        this._pauseTexts.push(secH);
        yOff += 18;

        const maxVisible = Math.min(available.length, 8);
        for (let i = 0; i < maxVisible; i++) {
          const def = available[i];
          const cost = getEffectiveSpellCost(state, def);
          const canAfford = state.skillPoints >= cost;
          const isSelected = this._buySelectedIndex === i;
          const schoolColor = SCHOOL_COLORS[def.school] ?? 0x666666;

          if (isSelected) {
            this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 30);
            this._pauseBg.fill({ color: 0x222244, alpha: 0.8 });
            this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 30);
            this._pauseBg.stroke({ color: schoolColor, width: 1 });
          }

          // School accent
          this._pauseBg.rect(panelX + 14, yOff - 2, 3, 30);
          this._pauseBg.fill({ color: schoolColor, alpha: 0.7 });

          const nameT = new Text({
            text: def.name,
            style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? schoolColor : 0x555566, fontWeight: isSelected ? "bold" : "normal" }),
          });
          nameT.x = panelX + 24;
          nameT.y = yOff;
          this._pauseContainer.addChild(nameT);
          this._pauseTexts.push(nameT);

          const costT = new Text({
            text: `${cost} SP`,
            style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? 0xffcc44 : 0x884422 }),
          });
          costT.x = panelX + panelW - 60;
          costT.y = yOff;
          this._pauseContainer.addChild(costT);
          this._pauseTexts.push(costT);

          const descT = new Text({
            text: `${def.description.substring(0, 50)}`,
            style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x666688 }),
          });
          descT.x = panelX + 24;
          descT.y = yOff + 14;
          this._pauseContainer.addChild(descT);
          this._pauseTexts.push(descT);

          yOff += 34;
        }
      }

      // Owned spells section (click to view upgrades)
      if (state.spells.length > 0) {
        yOff = this._addPauseDivider(panelX, panelW, yOff + 4);

        const ownH = new Text({
          text: "Upgrade Owned Spells",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xccccff, fontWeight: "bold" }),
        });
        ownH.x = panelX + 20;
        ownH.y = yOff;
        this._pauseContainer.addChild(ownH);
        this._pauseTexts.push(ownH);
        yOff += 18;

        for (let i = 0; i < state.spells.length; i++) {
          const spell = state.spells[i];
          const def = SPELL_DEFS[spell.defId];
          if (!def) continue;
          const listIdx = available.length + i;
          const isSelected = this._buySelectedIndex === listIdx;
          const schoolColor = SCHOOL_COLORS[spell.school] ?? 0x666666;
          const upgCount = getAvailableUpgrades(spell).length;

          if (isSelected) {
            this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 22);
            this._pauseBg.fill({ color: 0x222244, alpha: 0.8 });
            this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 22);
            this._pauseBg.stroke({ color: schoolColor, width: 1 });
          }

          this._pauseBg.rect(panelX + 14, yOff - 2, 3, 22);
          this._pauseBg.fill({ color: schoolColor, alpha: 0.7 });

          const nameT = new Text({
            text: `${def.name}`,
            style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: schoolColor, fontWeight: isSelected ? "bold" : "normal" }),
          });
          nameT.x = panelX + 24;
          nameT.y = yOff;
          this._pauseContainer.addChild(nameT);
          this._pauseTexts.push(nameT);

          const upgT = new Text({
            text: upgCount > 0 ? `${upgCount} upgrades` : "fully upgraded",
            style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: upgCount > 0 ? 0x888899 : 0x44cc44 }),
          });
          upgT.x = panelX + panelW - 100;
          upgT.y = yOff;
          this._pauseContainer.addChild(upgT);
          this._pauseTexts.push(upgT);

          yOff += 26;
        }
      }

      yOff += 8;
      const hint = new Text({
        text: "[Up/Down] Navigate  [Enter] Buy/View Upgrades",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x555577 }),
      });
      hint.x = panelX + panelW / 2;
      hint.anchor.set(0.5, 0);
      hint.y = yOff;
      this._pauseContainer.addChild(hint);
      this._pauseTexts.push(hint);
    }

    // --- Active Synergies Display ---
    {
      const spellSchools = new Set(state.spells.map(s => s.school));
      const activeSynergies = getActiveSynergies(spellSchools);
      if (activeSynergies.length > 0) {
        yOff += 16;
        yOff = this._addPauseDivider(panelX, panelW, yOff);
        const synHeader = new Text({
          text: "Active Synergies:",
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xccaa44, fontWeight: "bold" }),
        });
        synHeader.x = panelX + 20;
        synHeader.y = yOff;
        this._pauseContainer.addChild(synHeader);
        this._pauseTexts.push(synHeader);
        yOff += 18;

        for (const syn of activeSynergies) {
          const synT = new Text({
            text: `${syn.name}: ${syn.description}`,
            style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0xbbaa66 }),
          });
          synT.x = panelX + 28;
          synT.y = yOff;
          this._pauseContainer.addChild(synT);
          this._pauseTexts.push(synT);
          yOff += 16;
        }
      }
    }

    // Back button at bottom
    const backY = panelY + panelH - 40;
    this._addPauseButton(panelX, backY, panelW, "Back", 0x444466, () => {
      this.pauseSubMenu = "main";
    });
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Abilities (wizard stats, status effects, shrine bonuses)
  // -------------------------------------------------------------------------

  private _drawPauseAbilities(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 480;
    const panelH = Math.min(screenHeight - 40, 600);
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "ABILITIES");

    // SP display
    const spT = new Text({
      text: `Skill Points: ${state.skillPoints}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffcc44, fontWeight: "bold" }),
    });
    spT.x = panelX + panelW / 2;
    spT.anchor.set(0.5, 0);
    spT.y = yOff;
    this._pauseContainer.addChild(spT);
    this._pauseTexts.push(spT);
    yOff += 22;

    yOff = this._addPauseDivider(panelX, panelW, yOff);

    // Learned abilities section
    if (state.abilities.length > 0) {
      const learnedHeader = new Text({
        text: "Learned Abilities",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x44cc44, fontWeight: "bold" }),
      });
      learnedHeader.x = panelX + 20;
      learnedHeader.y = yOff;
      this._pauseContainer.addChild(learnedHeader);
      this._pauseTexts.push(learnedHeader);
      yOff += 18;

      for (const id of state.abilities) {
        const def = ABILITY_DEFS[id];
        if (!def) continue;
        const schoolColor = SCHOOL_COLORS[def.school] ?? 0x666666;

        this._pauseBg.rect(panelX + 14, yOff - 2, 3, 18);
        this._pauseBg.fill({ color: schoolColor, alpha: 0.7 });

        const nameT = new Text({
          text: def.name,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: schoolColor }),
        });
        nameT.x = panelX + 24;
        nameT.y = yOff;
        this._pauseContainer.addChild(nameT);
        this._pauseTexts.push(nameT);

        const trigLabel = def.trigger === "on_spell_cast" ? "[On Cast]" :
          def.trigger === "on_kill" ? "[On Kill]" :
          def.trigger === "on_take_damage" ? "[On Hit]" :
          def.trigger === "on_turn_start" ? "[Per Turn]" :
          def.trigger === "passive" ? "[Passive]" : `[${def.trigger}]`;
        const trigT = new Text({
          text: trigLabel,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x888899 }),
        });
        trigT.x = panelX + panelW - 100;
        trigT.y = yOff + 1;
        this._pauseContainer.addChild(trigT);
        this._pauseTexts.push(trigT);

        yOff += 22;
      }

      yOff += 4;
      yOff = this._addPauseDivider(panelX, panelW, yOff);
    }

    // Available abilities to buy
    const available = getAvailableAbilities(state).sort((a, b) => a.spCost - b.spCost);
    this._abilitiesSelectedIndex = Math.min(this._abilitiesSelectedIndex, Math.max(0, available.length - 1));

    const buyHeader = new Text({
      text: "Buy Abilities",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xccccff, fontWeight: "bold" }),
    });
    buyHeader.x = panelX + 20;
    buyHeader.y = yOff;
    this._pauseContainer.addChild(buyHeader);
    this._pauseTexts.push(buyHeader);
    yOff += 18;

    if (available.length === 0) {
      const allDone = new Text({
        text: "All abilities learned!",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x44cc44 }),
      });
      allDone.x = panelX + 28;
      allDone.y = yOff;
      this._pauseContainer.addChild(allDone);
      this._pauseTexts.push(allDone);
      yOff += 20;
    } else {
      const maxVisible = Math.min(available.length, 8);
      for (let i = 0; i < maxVisible; i++) {
        const def = available[i];
        const cost = getEffectiveAbilityCost(state, def);
        const canAfford = state.skillPoints >= cost;
        const isSelected = this._abilitiesSelectedIndex === i;
        const schoolColor = SCHOOL_COLORS[def.school] ?? 0x666666;

        if (isSelected) {
          this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 32);
          this._pauseBg.fill({ color: 0x222244, alpha: 0.8 });
          this._pauseBg.rect(panelX + 14, yOff - 2, panelW - 28, 32);
          this._pauseBg.stroke({ color: schoolColor, width: 1 });
        }

        // School accent bar
        this._pauseBg.rect(panelX + 14, yOff - 2, 3, 32);
        this._pauseBg.fill({ color: schoolColor, alpha: 0.7 });

        const nameT = new Text({
          text: def.name,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? schoolColor : 0x555566, fontWeight: isSelected ? "bold" : "normal" }),
        });
        nameT.x = panelX + 24;
        nameT.y = yOff;
        this._pauseContainer.addChild(nameT);
        this._pauseTexts.push(nameT);

        const costT = new Text({
          text: `${cost} SP`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? 0xffcc44 : 0x884422 }),
        });
        costT.x = panelX + panelW - 60;
        costT.y = yOff;
        this._pauseContainer.addChild(costT);
        this._pauseTexts.push(costT);

        const descT = new Text({
          text: `${def.description.substring(0, 55)}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x666688 }),
        });
        descT.x = panelX + 24;
        descT.y = yOff + 15;
        this._pauseContainer.addChild(descT);
        this._pauseTexts.push(descT);

        yOff += 36;
      }
    }

    yOff += 4;
    yOff = this._addPauseDivider(panelX, panelW, yOff);

    // Wizard stats (compact)
    const statsHeader = new Text({
      text: "Wizard Stats",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xccccff, fontWeight: "bold" }),
    });
    statsHeader.x = panelX + 20;
    statsHeader.y = yOff;
    this._pauseContainer.addChild(statsHeader);
    this._pauseTexts.push(statsHeader);
    yOff += 18;

    const statsLine = `HP: ${state.wizard.hp}/${state.wizard.maxHp}  |  Shields: ${state.wizard.shields}  |  Level: ${state.currentLevel + 1}/25  |  Spells: ${state.spells.length}`;
    const statsT = new Text({
      text: statsLine,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x9999aa }),
    });
    statsT.x = panelX + 28;
    statsT.y = yOff;
    this._pauseContainer.addChild(statsT);
    this._pauseTexts.push(statsT);
    yOff += 18;

    // Hint bar
    const hint = new Text({
      text: "[Up/Down] Navigate  [Enter/Space] Buy  [Esc] Back",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x555577 }),
    });
    hint.x = panelX + panelW / 2;
    hint.anchor.set(0.5, 0);
    hint.y = yOff + 4;
    this._pauseContainer.addChild(hint);
    this._pauseTexts.push(hint);

    // Back button
    const backY = panelY + panelH - 40;
    this._addPauseButton(panelX, backY, panelW, "Back", 0x444466, () => {
      this.pauseSubMenu = "main";
    });
  }

  // -------------------------------------------------------------------------
  // Pause sub-menu: Leaderboard
  // -------------------------------------------------------------------------

  private _drawPauseLeaderboard(_state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const panelW = 520;
    const panelH = 440;
    const { panelX, panelY } = this._drawPausePanel(screenWidth, screenHeight, panelW, panelH);

    let yOff = this._addPauseTitle(panelX, panelW, panelY + 16, "LEADERBOARD");

    const entries = getLeaderboard();
    const top10 = entries.slice(0, 10);

    if (top10.length === 0) {
      const noScores = new Text({
        text: "No scores recorded yet.",
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0x666688 }),
      });
      noScores.x = panelX + panelW / 2;
      noScores.anchor.set(0.5, 0);
      noScores.y = yOff;
      this._pauseContainer.addChild(noScores);
      this._pauseTexts.push(noScores);
      yOff += 30;
    } else {
      // Table header
      const headerStr = "#   Score    Floors  Kills  Diff       Seed      Won";
      const headerT = new Text({
        text: headerStr,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xccccff, fontWeight: "bold" }),
      });
      headerT.x = panelX + 16;
      headerT.y = yOff;
      this._pauseContainer.addChild(headerT);
      this._pauseTexts.push(headerT);
      yOff += 16;

      // Divider line under header
      this._pauseBg.moveTo(panelX + 16, yOff);
      this._pauseBg.lineTo(panelX + panelW - 16, yOff);
      this._pauseBg.stroke({ color: 0x333355, width: 0.5, alpha: 0.5 });
      yOff += 4;

      for (let i = 0; i < top10.length; i++) {
        const e = top10[i];
        const rank = `${i + 1}`.padStart(2);
        const score = `${e.score}`.padStart(7);
        const floors = `${e.floorsCleared}/25`.padStart(6);
        const kills = `${e.enemiesKilled}`.padStart(5);
        const diff = e.difficulty.padEnd(8);
        const seed = `${e.seed}`.padStart(8);
        const won = e.won ? "YES" : " - ";
        const rowStr = `${rank}  ${score}  ${floors}  ${kills}  ${diff}  ${seed}   ${won}`;

        const rowColor = e.won ? 0xffdd44 : i === 0 ? 0xcccccc : 0x999999;
        // Row highlight for rank 1
        if (i === 0) {
          this._pauseBg.rect(panelX + 14, yOff - 1, panelW - 28, 16);
          this._pauseBg.fill({ color: 0x222244, alpha: 0.5 });
        }

        const rowT = new Text({
          text: rowStr,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: rowColor }),
        });
        rowT.x = panelX + 16;
        rowT.y = yOff;
        this._pauseContainer.addChild(rowT);
        this._pauseTexts.push(rowT);
        yOff += 18;
      }
    }

    yOff += 12;
    this._addPauseButton(panelX, Math.min(yOff, panelY + panelH - 40), panelW, "Back", 0x444466, () => {
      this.pauseSubMenu = "main";
    });
  }

  private _addPauseButton(
    panelX: number,
    y: number,
    panelW: number,
    label: string,
    color: number,
    action: () => void,
  ): void {
    const btnW = 220;
    const btnH = 28;
    const btnX = panelX + Math.floor((panelW - btnW) / 2);

    const gfx = new Graphics();
    drawOrnateButton(gfx, btnX, y, btnW, btnH, color);

    gfx.eventMode = "static";
    gfx.cursor = "pointer";
    gfx.hitArea = { contains: (x: number, yy: number) => x >= btnX && x <= btnX + btnW && yy >= y && yy <= y + btnH };
    gfx.on("pointerdown", () => action());
    gfx.on("pointerover", () => {
      gfx.clear();
      drawOrnateButton(gfx, btnX, y, btnW, btnH, color, { selected: true });
    });
    gfx.on("pointerout", () => {
      gfx.clear();
      drawOrnateButton(gfx, btnX, y, btnW, btnH, color);
    });

    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 13,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 1,
      }),
    });
    text.x = btnX + btnW / 2;
    text.y = y + btnH / 2;
    text.anchor.set(0.5, 0.5);

    this._pauseContainer.addChild(gfx);
    this._pauseContainer.addChild(text);
    this._pauseButtons.push({ gfx, text, hitArea: { x: btnX, y, w: btnW, h: btnH }, action });
  }

  private _updateSpellBar(
    state: RiftWizardState,
    screenWidth: number,
    hudY: number,
  ): void {
    this._spellBar.clear();

    // Remove old spell texts
    for (const t of this._spellTexts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._spellTexts = [];

    if (state.spells.length === 0) return;

    const slotW = 56;
    const slotH = 36;
    const slotGap = 4;
    const totalW = state.spells.length * (slotW + slotGap) - slotGap;
    const spellBarX = Math.max(360, Math.floor(screenWidth - totalW - 12));
    const slotY = hudY + 8;

    // Subtle background panel behind the entire spell bar
    this._spellBar.rect(spellBarX - 6, slotY - 4, totalW + 12, slotH + 8);
    this._spellBar.fill({ color: 0x08081a, alpha: 0.5 });
    this._spellBar.rect(spellBarX - 6, slotY - 4, totalW + 12, slotH + 8);
    this._spellBar.stroke({ color: 0x222244, width: 1, alpha: 0.4 });

    for (let i = 0; i < state.spells.length && i < 9; i++) {
      const spell = state.spells[i];
      const def = SPELL_DEFS[spell.defId];
      if (!def) continue;

      const sx = spellBarX + i * (slotW + slotGap);
      const isSelected = state.selectedSpellIndex === i;
      const isEmpty = spell.charges <= 0;
      const schoolColor = SCHOOL_COLORS[spell.school] ?? 0x666666;

      // Slot background
      this._spellBar.rect(sx, slotY, slotW, slotH);
      this._spellBar.fill({
        color: isSelected ? 0x222244 : isEmpty ? 0x111118 : 0x181828,
      });

      // School color accent bar on left
      this._spellBar.rect(sx, slotY, 3, slotH);
      this._spellBar.fill({ color: schoolColor, alpha: isEmpty ? 0.3 : 0.8 });

      // --- Double-line ornate borders ---
      // Outer border
      this._spellBar.rect(sx - 1, slotY - 1, slotW + 2, slotH + 2);
      this._spellBar.stroke({
        color: isSelected ? 0xffffff : isEmpty ? 0x222233 : schoolColor,
        width: isSelected ? 2 : 1,
        alpha: isSelected ? 1 : isEmpty ? 0.5 : 0.6,
      });
      // Inner border (ornate double-line)
      this._spellBar.rect(sx + 2, slotY + 2, slotW - 4, slotH - 4);
      this._spellBar.stroke({
        color: isSelected ? 0x8888cc : isEmpty ? 0x1a1a22 : schoolColor,
        width: 0.5,
        alpha: isSelected ? 0.7 : 0.25,
      });

      // Selection glow
      if (isSelected) {
        // Inner glow fill
        this._spellBar.rect(sx, slotY, slotW, slotH);
        this._spellBar.fill({ color: schoolColor, alpha: 0.1 });

        // --- Glowing underline for selected spell ---
        const glowTime = Date.now() / 600;
        const glowAlpha = 0.5 + 0.3 * Math.sin(glowTime * Math.PI);
        this._spellBar.rect(sx + 2, slotY + slotH - 2, slotW - 4, 2);
        this._spellBar.fill({ color: schoolColor, alpha: glowAlpha });
        // Wider soft glow beneath
        this._spellBar.rect(sx, slotY + slotH, slotW, 2);
        this._spellBar.fill({ color: schoolColor, alpha: glowAlpha * 0.4 });
      }

      // Ornamental corner notches on each spell slot
      const cnSz = 3;
      // Top-left corner notch
      this._spellBar.moveTo(sx, slotY + cnSz);
      this._spellBar.lineTo(sx + cnSz, slotY);
      this._spellBar.stroke({ color: schoolColor, width: 0.5, alpha: isEmpty ? 0.15 : 0.4 });
      // Top-right corner notch
      this._spellBar.moveTo(sx + slotW - cnSz, slotY);
      this._spellBar.lineTo(sx + slotW, slotY + cnSz);
      this._spellBar.stroke({ color: schoolColor, width: 0.5, alpha: isEmpty ? 0.15 : 0.4 });
      // Bottom-left corner notch
      this._spellBar.moveTo(sx, slotY + slotH - cnSz);
      this._spellBar.lineTo(sx + cnSz, slotY + slotH);
      this._spellBar.stroke({ color: schoolColor, width: 0.5, alpha: isEmpty ? 0.15 : 0.4 });
      // Bottom-right corner notch
      this._spellBar.moveTo(sx + slotW - cnSz, slotY + slotH);
      this._spellBar.lineTo(sx + slotW, slotY + slotH - cnSz);
      this._spellBar.stroke({ color: schoolColor, width: 0.5, alpha: isEmpty ? 0.15 : 0.4 });

      // Subtle vignette/gradient on empty spell slots
      if (isEmpty) {
        this._spellBar.rect(sx, slotY, slotW, 4);
        this._spellBar.fill({ color: 0x000000, alpha: 0.15 });
        this._spellBar.rect(sx, slotY + slotH - 4, slotW, 4);
        this._spellBar.fill({ color: 0x000000, alpha: 0.15 });
      }

      // Charge indicator dots below slot
      const maxDots = Math.min(spell.maxCharges, 8);
      const dotSpacing = Math.min(6, (slotW - 4) / maxDots);
      const dotsStartX = sx + (slotW - maxDots * dotSpacing) / 2;
      for (let d = 0; d < maxDots; d++) {
        const dotX = dotsStartX + d * dotSpacing + dotSpacing / 2;
        const dotY = slotY + slotH + 3;
        const filled = d < spell.charges;
        this._spellBar.circle(dotX, dotY, 1.5);
        this._spellBar.fill({ color: filled ? schoolColor : 0x222233, alpha: filled ? 0.7 : 0.3 });
      }

      // --- Small spell school icon polygon inside each slot ---
      const iconCx = sx + slotW - 10;
      const iconCy = slotY + 10;
      const iconSize = 4;
      drawSchoolIcon(this._spellBar, spell.school, iconCx, iconCy, iconSize, schoolColor, isEmpty ? 0.2 : 0.6);

      // Key number
      const keyText = new Text({
        text: `${i + 1}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 9,
          fill: isSelected ? 0xffffff : 0x666688,
          fontWeight: "bold",
        }),
      });
      keyText.x = sx + 5;
      keyText.y = slotY + 2;
      this.container.addChild(keyText);
      this._spellTexts.push(keyText);

      // Spell name (abbreviated)
      const nameText = new Text({
        text: def.name.substring(0, 6),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 9,
          fill: isEmpty ? 0x444455 : isSelected ? 0xffffff : 0xbbbbcc,
        }),
      });
      nameText.x = sx + 16;
      nameText.y = slotY + 2;
      this.container.addChild(nameText);
      this._spellTexts.push(nameText);

      // Charges display
      const chargeColor = isEmpty ? 0x663333 : spell.charges <= 3 ? 0xcccc44 : 0x88cc88;
      const chargeText = new Text({
        text: `${spell.charges}/${spell.maxCharges}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: chargeColor,
        }),
      });
      chargeText.x = sx + 16;
      chargeText.y = slotY + 14;
      this.container.addChild(chargeText);
      this._spellTexts.push(chargeText);

      // Damage/range mini-info
      const miniText = new Text({
        text: `${spell.damage}dmg r${spell.range}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 8,
          fill: 0x666688,
        }),
      });
      miniText.x = sx + 5;
      miniText.y = slotY + 26;
      this.container.addChild(miniText);
      this._spellTexts.push(miniText);
    }

    // Selected spell detail row below spell bar
    if (state.selectedSpellIndex >= 0 && state.selectedSpellIndex < state.spells.length) {
      const spell = state.spells[state.selectedSpellIndex];
      const def = SPELL_DEFS[spell.defId];
      if (def) {
        const schoolColor = SCHOOL_COLORS[spell.school] ?? 0xffffff;
        const detailText = new Text({
          text: `${def.name} | Dmg: ${spell.damage} | Range: ${spell.range} | AoE: ${spell.aoeRadius} | Charges: ${spell.charges}/${spell.maxCharges}`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 11,
            fill: schoolColor,
          }),
        });
        detailText.x = spellBarX;
        detailText.y = slotY + slotH + 6;
        this.container.addChild(detailText);
        this._spellTexts.push(detailText);

        // Description
        const descText = new Text({
          text: def.description,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 9,
            fill: 0x888899,
          }),
        });
        descText.x = spellBarX;
        descText.y = slotY + slotH + 20;
        this.container.addChild(descText);
        this._spellTexts.push(descText);
      }
    }
  }

  destroy(): void {
    for (const t of this._spellTexts) {
      t.destroy();
    }
    this._spellTexts = [];
    for (const t of this._logTexts) {
      t.destroy();
    }
    this._logTexts = [];
    for (const t of this._keyRefTexts) {
      t.destroy();
    }
    this._keyRefTexts = [];
    for (const t of this._pauseTexts) {
      t.destroy();
    }
    this._pauseTexts = [];
    for (const btn of this._pauseButtons) {
      btn.gfx.destroy();
      btn.text.destroy();
    }
    this._pauseButtons = [];
    this._infoText.destroy();
    this._levelText.destroy();
    this._spText.destroy();
    this._turnText.destroy();
    this._msgText.destroy();
    this._consumableText.destroy();
    this._tooltipText.destroy();
    this._bg.destroy();
    this._hpBar.destroy();
    this._spellBar.destroy();
    this._pauseBg.destroy();
    this._pauseContainer.removeChildren();
    this.container.removeChildren();
  }
}
