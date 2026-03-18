// ---------------------------------------------------------------------------
// Rift Wizard Codex — in-game reference with Bestiary, Spells, Abilities tabs
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { ENEMY_DEFS } from "../config/RiftWizardEnemyDefs";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { ABILITY_DEFS } from "../config/RiftWizardAbilityDefs";
import type { SpellSchool } from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const PANEL_BG = 0x1a1a2e;
const PANEL_BORDER = 0xdaa520;
const TAB_BG = 0x222244;
const TAB_ACTIVE = 0x3a3060;
const TEXT_GOLD = 0xdaa520;
const TEXT_WHITE = 0xeeeeee;
const TEXT_GRAY = 0x777788;
const TEXT_DIM = 0x555566;

const SCHOOL_DOT_COLORS: Record<SpellSchool | string, number> = {
  fire: 0xff4400,
  ice: 0x44bbff,
  lightning: 0xffdd00,
  arcane: 0xaa44ff,
  nature: 0x44cc44,
  dark: 0x666666,
  holy: 0xffffaa,
};

const FONT_FAMILY = "Georgia, serif";

function titleStyle(size = 18): TextStyle {
  return new TextStyle({
    fontFamily: FONT_FAMILY,
    fontSize: size,
    fill: TEXT_GOLD,
    fontWeight: "bold",
  });
}

function bodyStyle(size = 13, fill = TEXT_WHITE): TextStyle {
  return new TextStyle({
    fontFamily: FONT_FAMILY,
    fontSize: size,
    fill,
  });
}

// ---------------------------------------------------------------------------
// Codex class
// ---------------------------------------------------------------------------

export class RiftWizardCodex {
  container = new Container();

  private _visible = false;
  private _tab: "bestiary" | "spells" | "abilities" = "bestiary";
  private _scrollOffset = 0;
  private _encounteredEnemies = new Set<string>();
  private _learnedSpells = new Set<string>();

  // Internal display objects
  private _bg = new Graphics();
  private _contentContainer = new Container();
  private _texts: Text[] = [];

  build(): void {
    this.container.visible = false;
    this.container.addChild(this._bg);
    this.container.addChild(this._contentContainer);
  }

  get visible(): boolean {
    return this._visible;
  }

  toggle(encounteredEnemies: string[], learnedSpells: string[]): void {
    this._visible = !this._visible;
    this.container.visible = this._visible;
    if (this._visible) {
      this._encounteredEnemies = new Set(encounteredEnemies);
      this._learnedSpells = new Set(learnedSpells);
      this._scrollOffset = 0;
    }
  }

  draw(sw: number, sh: number): void {
    if (!this._visible) return;

    // Clean up old texts
    this._cleanup();

    const g = this._bg;
    g.clear();

    const panelW = Math.floor(sw * 0.8);
    const panelH = Math.floor(sh * 0.8);
    const panelX = Math.floor((sw - panelW) / 2);
    const panelY = Math.floor((sh - panelH) / 2);

    // Full-screen dark overlay
    g.rect(0, 0, sw, sh);
    g.fill({ color: 0x000000, alpha: 0.7 });

    // Main panel background
    g.rect(panelX, panelY, panelW, panelH);
    g.fill({ color: PANEL_BG, alpha: 0.95 });

    // Gold border (outer)
    g.rect(panelX, panelY, panelW, panelH);
    g.stroke({ color: PANEL_BORDER, width: 2 });
    // Inner border
    g.rect(panelX + 4, panelY + 4, panelW - 8, panelH - 8);
    g.stroke({ color: PANEL_BORDER, width: 1, alpha: 0.4 });

    // Corner ornaments
    this._drawCornerOrnament(g, panelX + 8, panelY + 8, 1, 1);
    this._drawCornerOrnament(g, panelX + panelW - 8, panelY + 8, -1, 1);
    this._drawCornerOrnament(g, panelX + 8, panelY + panelH - 8, 1, -1);
    this._drawCornerOrnament(g, panelX + panelW - 8, panelY + panelH - 8, -1, -1);

    // Title
    const titleText = this._makeText("~ Codex Arcanum ~", titleStyle(20));
    titleText.anchor.set(0.5, 0);
    titleText.x = sw / 2;
    titleText.y = panelY + 12;

    // Tab buttons
    const tabs: Array<{ label: string; key: "bestiary" | "spells" | "abilities" }> = [
      { label: "[1] Bestiary", key: "bestiary" },
      { label: "[2] Spells", key: "spells" },
      { label: "[3] Abilities", key: "abilities" },
    ];

    const tabY = panelY + 42;
    const tabW = Math.floor((panelW - 40) / 3);
    const tabH = 26;

    for (let i = 0; i < tabs.length; i++) {
      const tx = panelX + 20 + i * (tabW + 5);
      const isActive = this._tab === tabs[i].key;

      g.rect(tx, tabY, tabW, tabH);
      g.fill({ color: isActive ? TAB_ACTIVE : TAB_BG, alpha: isActive ? 0.9 : 0.6 });
      g.rect(tx, tabY, tabW, tabH);
      g.stroke({ color: isActive ? PANEL_BORDER : TEXT_GRAY, width: isActive ? 1.5 : 0.5 });

      const tabLabel = this._makeText(
        tabs[i].label,
        bodyStyle(13, isActive ? TEXT_GOLD : TEXT_GRAY),
      );
      tabLabel.anchor.set(0.5, 0.5);
      tabLabel.x = tx + tabW / 2;
      tabLabel.y = tabY + tabH / 2;
    }

    // Content area
    const contentX = panelX + 20;
    const contentY = tabY + tabH + 14;
    const contentW = panelW - 40;
    const contentH = panelH - (contentY - panelY) - 36;

    // Clip area indicator lines
    g.moveTo(contentX, contentY);
    g.lineTo(contentX + contentW, contentY);
    g.stroke({ color: PANEL_BORDER, width: 0.5, alpha: 0.3 });

    // Draw content based on tab
    if (this._tab === "bestiary") {
      this._drawBestiary(contentX, contentY, contentW, contentH);
    } else if (this._tab === "spells") {
      this._drawSpells(contentX, contentY, contentW, contentH);
    } else {
      this._drawAbilities(contentX, contentY, contentW, contentH);
    }

    // Footer
    const footerText = this._makeText(
      "ESC / B to close    |    Arrow keys to scroll",
      bodyStyle(11, TEXT_GRAY),
    );
    footerText.anchor.set(0.5, 0);
    footerText.x = sw / 2;
    footerText.y = panelY + panelH - 22;
  }

  handleKey(key: string): void {
    if (!this._visible) return;

    if (key === "1") {
      this._tab = "bestiary";
      this._scrollOffset = 0;
    } else if (key === "2") {
      this._tab = "spells";
      this._scrollOffset = 0;
    } else if (key === "3") {
      this._tab = "abilities";
      this._scrollOffset = 0;
    } else if (key === "ArrowDown") {
      this._scrollOffset += 1;
    } else if (key === "ArrowUp") {
      this._scrollOffset = Math.max(0, this._scrollOffset - 1);
    } else if (key === "Escape" || key === "b" || key === "B") {
      this._visible = false;
      this.container.visible = false;
    }
  }

  destroy(): void {
    this._cleanup();
    this._bg.destroy();
    this._contentContainer.destroy();
    this.container.destroy();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _cleanup(): void {
    for (const t of this._texts) {
      this._contentContainer.removeChild(t);
      t.destroy();
    }
    this._texts = [];
  }

  private _makeText(str: string, style: TextStyle): Text {
    const t = new Text({ text: str, style });
    this._contentContainer.addChild(t);
    this._texts.push(t);
    return t;
  }

  private _drawCornerOrnament(g: Graphics, x: number, y: number, dx: number, dy: number): void {
    const len = 12;
    // L-shaped ornament
    g.moveTo(x, y);
    g.lineTo(x + dx * len, y);
    g.stroke({ color: PANEL_BORDER, width: 1, alpha: 0.6 });
    g.moveTo(x, y);
    g.lineTo(x, y + dy * len);
    g.stroke({ color: PANEL_BORDER, width: 1, alpha: 0.6 });
    // Small diamond at corner
    g.moveTo(x, y - dy * 2);
    g.lineTo(x + dx * 2, y);
    g.lineTo(x, y + dy * 2);
    g.lineTo(x - dx * 2, y);
    g.closePath();
    g.fill({ color: PANEL_BORDER, alpha: 0.5 });
  }

  private _drawSchoolDot(g: Graphics, x: number, y: number, school: string | null): void {
    const color = school ? (SCHOOL_DOT_COLORS[school] ?? TEXT_GRAY) : TEXT_GRAY;
    g.circle(x, y, 4);
    g.fill({ color, alpha: 0.8 });
    g.circle(x, y, 4);
    g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });
  }

  private _getTierForEnemy(defId: string): number {
    const tierMap: Record<string, number> = {};
    for (const id of ["spider", "swordsman", "archer", "bat"]) tierMap[id] = 1;
    for (const id of ["fire_mage", "cold_mage", "storm_mage", "troll", "vampire_bat"]) tierMap[id] = 2;
    for (const id of ["minor_fire_elemental", "minor_ice_elemental", "minor_lightning_elemental", "banshee", "necromancer"]) tierMap[id] = 3;
    for (const id of ["fire_elemental", "death_knight", "distortion_mage", "pit_lord"]) tierMap[id] = 4;
    for (const id of ["archmage", "seraphim"]) tierMap[id] = 5;
    for (const id of ["boss_troll_king", "boss_fire_lord", "boss_lich", "boss_storm_titan", "boss_mordred"]) tierMap[id] = 6;
    return tierMap[defId] ?? 0;
  }

  // -------------------------------------------------------------------------
  // Bestiary tab
  // -------------------------------------------------------------------------

  private _drawBestiary(x: number, y: number, w: number, h: number): void {
    const g = this._bg;
    const entries = Object.values(ENEMY_DEFS);
    const rowH = 26;
    const maxVisible = Math.floor(h / rowH);
    const maxScroll = Math.max(0, entries.length - maxVisible);
    this._scrollOffset = Math.min(this._scrollOffset, maxScroll);

    // Header
    const header = this._makeText("Name          HP     DMG    School    Tier    AI", bodyStyle(11, TEXT_GOLD));
    header.x = x;
    header.y = y + 2;

    const startIdx = this._scrollOffset;
    const endIdx = Math.min(entries.length, startIdx + maxVisible);

    for (let i = startIdx; i < endIdx; i++) {
      const def = entries[i];
      const rowY = y + 20 + (i - startIdx) * rowH;
      const encountered = this._encounteredEnemies.has(def.id);

      if (encountered) {
        // School dot
        this._drawSchoolDot(g, x + 4, rowY + 8, def.school);

        // Full info
        const name = this._makeText(def.name, bodyStyle(12, TEXT_WHITE));
        name.x = x + 14;
        name.y = rowY;

        const hp = this._makeText(`${def.hp}`, bodyStyle(11, TEXT_WHITE));
        hp.x = x + 150;
        hp.y = rowY + 1;

        const dmg = this._makeText(`${def.damage}`, bodyStyle(11, TEXT_WHITE));
        dmg.x = x + 200;
        dmg.y = rowY + 1;

        const school = this._makeText(def.school ?? "---", bodyStyle(11, SCHOOL_DOT_COLORS[def.school ?? ""] ?? TEXT_GRAY));
        school.x = x + 260;
        school.y = rowY + 1;

        const tier = this._getTierForEnemy(def.id);
        const tierLabel = def.isBoss ? "Boss" : `T${tier}`;
        const tierText = this._makeText(tierLabel, bodyStyle(11, def.isBoss ? 0xff4444 : TEXT_WHITE));
        tierText.x = x + 340;
        tierText.y = rowY + 1;

        const aiText = this._makeText(def.aiType, bodyStyle(11, TEXT_GRAY));
        aiText.x = x + 400;
        aiText.y = rowY + 1;
      } else {
        // Grayed out with "???"
        g.circle(x + 4, rowY + 8, 4);
        g.fill({ color: TEXT_DIM, alpha: 0.4 });

        const unknown = this._makeText("???", bodyStyle(12, TEXT_DIM));
        unknown.x = x + 14;
        unknown.y = rowY;

        const stats = this._makeText("???       ???      ???         ???       ???", bodyStyle(11, TEXT_DIM));
        stats.x = x + 150;
        stats.y = rowY + 1;
      }

      // Separator line
      g.moveTo(x, rowY + rowH - 2);
      g.lineTo(x + w, rowY + rowH - 2);
      g.stroke({ color: TEXT_DIM, width: 0.5, alpha: 0.2 });
    }

    // Scroll indicator
    if (entries.length > maxVisible) {
      this._drawScrollIndicator(g, x + w - 10, y + 20, h - 24, startIdx / maxScroll);
    }
  }

  // -------------------------------------------------------------------------
  // Spells tab
  // -------------------------------------------------------------------------

  private _drawSpells(x: number, y: number, w: number, h: number): void {
    const g = this._bg;
    const entries = Object.values(SPELL_DEFS);
    const rowH = 28;
    const maxVisible = Math.floor(h / rowH);
    const maxScroll = Math.max(0, entries.length - maxVisible);
    this._scrollOffset = Math.min(this._scrollOffset, maxScroll);

    // Header
    const header = this._makeText("Name            School    DMG   RNG   Charges  SP   Mechanic", bodyStyle(11, TEXT_GOLD));
    header.x = x;
    header.y = y + 2;

    const startIdx = this._scrollOffset;
    const endIdx = Math.min(entries.length, startIdx + maxVisible);

    for (let i = startIdx; i < endIdx; i++) {
      const def = entries[i];
      const rowY = y + 20 + (i - startIdx) * rowH;
      const learned = this._learnedSpells.has(def.id);
      const textColor = learned ? TEXT_GOLD : TEXT_GRAY;

      // School dot
      this._drawSchoolDot(g, x + 4, rowY + 8, def.school);

      // Highlight bar for learned spells
      if (learned) {
        g.rect(x, rowY - 1, w, rowH - 2);
        g.fill({ color: TEXT_GOLD, alpha: 0.04 });
      }

      const name = this._makeText(def.name, bodyStyle(12, textColor));
      name.x = x + 14;
      name.y = rowY;

      const school = this._makeText(def.school, bodyStyle(11, SCHOOL_DOT_COLORS[def.school] ?? TEXT_GRAY));
      school.x = x + 160;
      school.y = rowY + 1;

      const dmg = this._makeText(`${def.damage}`, bodyStyle(11, textColor));
      dmg.x = x + 230;
      dmg.y = rowY + 1;

      const rng = this._makeText(`${def.range}`, bodyStyle(11, textColor));
      rng.x = x + 276;
      rng.y = rowY + 1;

      const charges = this._makeText(`${def.baseCharges}`, bodyStyle(11, textColor));
      charges.x = x + 326;
      charges.y = rowY + 1;

      const sp = this._makeText(`${def.spCost}`, bodyStyle(11, textColor));
      sp.x = x + 392;
      sp.y = rowY + 1;

      const mech = this._makeText(def.mechanic.replace(/_/g, " "), bodyStyle(10, TEXT_DIM));
      mech.x = x + 430;
      mech.y = rowY + 2;

      // Separator
      g.moveTo(x, rowY + rowH - 2);
      g.lineTo(x + w, rowY + rowH - 2);
      g.stroke({ color: TEXT_DIM, width: 0.5, alpha: 0.2 });
    }

    if (entries.length > maxVisible) {
      this._drawScrollIndicator(g, x + w - 10, y + 20, h - 24, startIdx / maxScroll);
    }
  }

  // -------------------------------------------------------------------------
  // Abilities tab
  // -------------------------------------------------------------------------

  private _drawAbilities(x: number, y: number, w: number, h: number): void {
    const g = this._bg;
    const entries = Object.values(ABILITY_DEFS);
    const rowH = 38;
    const maxVisible = Math.floor(h / rowH);
    const maxScroll = Math.max(0, entries.length - maxVisible);
    this._scrollOffset = Math.min(this._scrollOffset, maxScroll);

    // Header
    const header = this._makeText("Name              School    SP    Trigger          Effect", bodyStyle(11, TEXT_GOLD));
    header.x = x;
    header.y = y + 2;

    const startIdx = this._scrollOffset;
    const endIdx = Math.min(entries.length, startIdx + maxVisible);

    for (let i = startIdx; i < endIdx; i++) {
      const def = entries[i];
      const rowY = y + 20 + (i - startIdx) * rowH;

      // School dot
      this._drawSchoolDot(g, x + 4, rowY + 8, def.school);

      const name = this._makeText(def.name, bodyStyle(12, TEXT_WHITE));
      name.x = x + 14;
      name.y = rowY;

      const school = this._makeText(def.school, bodyStyle(11, SCHOOL_DOT_COLORS[def.school] ?? TEXT_GRAY));
      school.x = x + 170;
      school.y = rowY + 1;

      const sp = this._makeText(`${def.spCost}`, bodyStyle(11, TEXT_WHITE));
      sp.x = x + 240;
      sp.y = rowY + 1;

      const trigger = this._makeText(def.trigger.replace(/_/g, " "), bodyStyle(10, TEXT_GRAY));
      trigger.x = x + 280;
      trigger.y = rowY + 2;

      // Description on second line
      const desc = this._makeText(def.description, bodyStyle(10, TEXT_DIM));
      desc.x = x + 14;
      desc.y = rowY + 17;
      // Clamp description width
      if (desc.width > w - 20) {
        desc.style.wordWrap = true;
        desc.style.wordWrapWidth = w - 20;
      }

      // Separator
      g.moveTo(x, rowY + rowH - 2);
      g.lineTo(x + w, rowY + rowH - 2);
      g.stroke({ color: TEXT_DIM, width: 0.5, alpha: 0.2 });
    }

    if (entries.length > maxVisible) {
      this._drawScrollIndicator(g, x + w - 10, y + 20, h - 24, startIdx / maxScroll);
    }
  }

  // -------------------------------------------------------------------------
  // Scroll indicator
  // -------------------------------------------------------------------------

  private _drawScrollIndicator(g: Graphics, x: number, y: number, h: number, progress: number): void {
    // Track
    g.rect(x, y, 4, h);
    g.fill({ color: TAB_BG, alpha: 0.5 });
    g.rect(x, y, 4, h);
    g.stroke({ color: PANEL_BORDER, width: 0.5, alpha: 0.3 });

    // Thumb
    const thumbH = Math.max(20, h * 0.15);
    const safeProgress = isNaN(progress) ? 0 : progress;
    const thumbY = y + safeProgress * (h - thumbH);
    g.rect(x, thumbY, 4, thumbH);
    g.fill({ color: PANEL_BORDER, alpha: 0.6 });
  }
}
