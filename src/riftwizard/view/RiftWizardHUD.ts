// ---------------------------------------------------------------------------
// Rift Wizard HUD — HP bar, spell hotbar, level info, status messages
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
import { SpellSchool } from "../state/RiftWizardState";
import { RWPhase, RWTileType } from "../state/RiftWizardState";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";
import { ENEMY_DEFS } from "../config/RiftWizardEnemyDefs";

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

  constructor() {
    this._infoText = new Text({ text: "", style: INFO_STYLE });
    this._levelText = new Text({ text: "", style: HEADER_STYLE });
    this._spText = new Text({ text: "", style: LABEL_STYLE });
    this._turnText = new Text({ text: "", style: STAT_VALUE_STYLE });
    this._msgText = new Text({ text: "", style: MSG_STYLE });
    this._consumableText = new Text({ text: "", style: LABEL_STYLE });
    this._tooltipText = new Text({ text: "", style: STAT_VALUE_STYLE });
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
  }

  update(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
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
    // Highlight strip on top
    if (hpRatio > 0) {
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * hpRatio, 3);
      this._hpBar.fill({ color: hpHighlight, alpha: 0.4 });
    }

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

    // HP text on bar
    const hpStr = `${state.wizard.hp}/${state.wizard.maxHp}${state.wizard.shields > 0 ? ` +${state.wizard.shields}` : ""}`;
    this._infoText.text = hpStr;
    this._infoText.x = hpBarX + hpBarW / 2 - this._infoText.width / 2;
    this._infoText.y = hpBarY + 1;

    // --- Level info with decorative frame polygon ---
    this._levelText.text = `Level ${state.currentLevel + 1}/25`;
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

    // --- Center message ---
    this._msgText.text = "";
    if (state.phase === RWPhase.VICTORY) {
      this._msgText.text = "VICTORY! You conquered all 25 levels!";
      this._msgText.style = new TextStyle({
        fontFamily: "monospace",
        fontSize: 22,
        fill: 0xffdd44,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      });
    } else if (state.phase === RWPhase.GAME_OVER) {
      this._msgText.text = "GAME OVER — [R] Restart  [Esc] Exit";
      this._msgText.style = new TextStyle({
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xff4444,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      });
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

    // --- Enemy tooltip when targeting ---
    if (state.phase === RWPhase.TARGETING && state.targetCursor) {
      const tc = state.targetCursor;
      const targetEnemy = state.level.enemies.find(
        (e) => e.alive && e.col === tc.col && e.row === tc.row
      );
      if (targetEnemy) {
        // Draw tooltip panel near the HUD area
        const ttW = 200;
        const ttH = 50;
        const ttX = Math.floor(screenWidth / 2 - ttW / 2);
        const ttY = 40;

        // Background
        this._bg.rect(ttX, ttY, ttW, ttH);
        this._bg.fill({ color: 0x0a0a18, alpha: 0.92 });
        this._bg.rect(ttX, ttY, ttW, ttH);
        this._bg.stroke({ color: 0xcc4444, width: 1 });

        // Enemy name
        const enemyDef = ENEMY_DEFS[targetEnemy.defId];
        const enemyName = new Text({
          text: enemyDef?.name ?? targetEnemy.defId,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xff6666, fontWeight: "bold" }),
        });
        enemyName.x = ttX + 8;
        enemyName.y = ttY + 4;
        this.container.addChild(enemyName);
        this._spellTexts.push(enemyName);

        // HP info
        const hpInfo = new Text({
          text: `HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xcccccc }),
        });
        hpInfo.x = ttX + 8;
        hpInfo.y = ttY + 20;
        this.container.addChild(hpInfo);
        this._spellTexts.push(hpInfo);

        // Stats line
        const statsLine = new Text({
          text: `Dmg: ${targetEnemy.damage}  Range: ${targetEnemy.range}${targetEnemy.isBoss ? "  [BOSS]" : ""}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x999999 }),
        });
        statsLine.x = ttX + 8;
        statsLine.y = ttY + 34;
        this.container.addChild(statsLine);
        this._spellTexts.push(statsLine);
      }
    }

    // --- Minimap (top-right corner, drawn on _bg) ---
    const tileSize = 3;
    const mapW = state.level.width * tileSize;
    const mapH = state.level.height * tileSize;
    const mmX = screenWidth - mapW - 8;
    const mmY = 8;

    // Dark background with 1px border
    this._bg.rect(mmX - 2, mmY - 2, mapW + 4, mapH + 4);
    this._bg.fill({ color: 0x000000, alpha: 0.7 });
    this._bg.rect(mmX - 2, mmY - 2, mapW + 4, mapH + 4);
    this._bg.stroke({ color: 0x333355, width: 1, alpha: 0.8 });

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
    this.container.removeChildren();
  }
}
