// ============================================================================
// CivHUD.ts — Full HUD/UI for the Arthurian Civilization Game
// ============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import {
  CIV_UNIT_DEFS, CIV_BUILDING_DEFS, CIV_TECH_TREE,
  CIV_WONDERS, CIV_HEROES, TERRAIN_TYPES, CIV_FACTIONS,
  type TechDef,
} from "./CivConfig";
import type { CivGameState, CivCity, CivUnit, CivPlayer } from "./CivState";
import { getUnit, getCity, getBuildableItems, calculateCityYields, getValidImprovements } from "./CivState";

// ── Color Scheme ─────────────────────────────────────────────────────────────

const PANEL_BG = 0x2A1F14;
const PANEL_BORDER = 0x8B7355;
const TEXT_COLOR = 0xE8D5B5;
const ACCENT = 0xC4A265;
const BTN_BG = 0x4A3728;
const BTN_BORDER = 0xC4A265;

// ── Text Styles ──────────────────────────────────────────────────────────────

function makeStyle(size: number, color: number = TEXT_COLOR, bold = false): TextStyle {
  return new TextStyle({
    fontFamily: "serif",
    fontSize: size,
    fill: color,
    fontWeight: bold ? "bold" : "normal",
    wordWrap: true,
    wordWrapWidth: 380,
  });
}

const STYLE_TITLE = makeStyle(18, ACCENT, true);
const STYLE_HEADER = makeStyle(15, ACCENT, true);
const STYLE_BODY = makeStyle(12, TEXT_COLOR);
const _STYLE_SMALL = makeStyle(11, TEXT_COLOR);
const _STYLE_BUTTON = makeStyle(12, TEXT_COLOR, true);
const STYLE_HERO = makeStyle(13, 0xFFD700, true);
const _STYLE_VICTORY_TITLE = makeStyle(48, 0xFFD700, true);
const _STYLE_VICTORY_SUB = makeStyle(22, TEXT_COLOR, true);
void _STYLE_SMALL; void _STYLE_BUTTON; void STYLE_HERO; void _STYLE_VICTORY_TITLE; void _STYLE_VICTORY_SUB;

// ── Helper: Draw a Parchment-Style Panel ─────────────────────────────────────

function drawPanel(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Outer shadow
  g.roundRect(x + 3, y + 3, w, h, 8);
  g.fill({ color: 0x000000, alpha: 0.35 });
  // Main parchment body
  g.roundRect(x, y, w, h, 8);
  g.fill({ color: PANEL_BG, alpha: 0.94 });
  // Inner lighter edge (top/left highlight)
  g.roundRect(x + 1, y + 1, w - 2, h * 0.08, 8);
  g.fill({ color: 0x3A2F24, alpha: 0.4 });
  // Ornamental double border
  g.roundRect(x, y, w, h, 8);
  g.stroke({ color: PANEL_BORDER, alpha: 0.9, width: 2 });
  g.roundRect(x + 3, y + 3, w - 6, h - 6, 6);
  g.stroke({ color: PANEL_BORDER, alpha: 0.35, width: 1 });
  // Corner ornaments (small circles at corners)
  const cr = 3;
  for (const [cx, cy] of [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]]) {
    g.circle(cx, cy, cr);
    g.fill({ color: ACCENT, alpha: 0.5 });
  }
}

// ── Helper: Draw a Progress Bar ──────────────────────────────────────────────

function drawBar(
  g: Graphics, x: number, y: number, w: number, h: number,
  fill: number, color: number
): void {
  // Background groove
  g.roundRect(x, y, w, h, 3);
  g.fill({ color: 0x0D0907, alpha: 0.8 });
  g.roundRect(x, y, w, h, 3);
  g.stroke({ color: PANEL_BORDER, alpha: 0.5, width: 1 });

  const fillW = Math.max(0, Math.min(1, fill)) * (w - 2);
  if (fillW > 0) {
    // Main fill
    g.roundRect(x + 1, y + 1, fillW, h - 2, 2);
    g.fill({ color, alpha: 0.9 });
    // Top highlight
    g.roundRect(x + 1, y + 1, fillW, (h - 2) * 0.4, 2);
    g.fill({ color: 0xFFFFFF, alpha: 0.12 });
  }
}

// ── Helper: Draw an Interactive Button ───────────────────────────────────────

function drawButton(
  parent: Container,
  x: number, y: number, w: number, h: number,
  label: string,
  onClick: () => void
): Container {
  const btn = new Container();
  btn.x = x;
  btn.y = y;

  const bg = new Graphics();
  // Button shadow
  bg.roundRect(1, 1, w, h, 5);
  bg.fill({ color: 0x000000, alpha: 0.25 });
  // Main body
  bg.roundRect(0, 0, w, h, 5);
  bg.fill({ color: BTN_BG, alpha: 0.95 });
  // Top bevel (lighter)
  bg.roundRect(0, 0, w, h * 0.45, 5);
  bg.fill({ color: 0x5A4838, alpha: 0.35 });
  // Border
  bg.roundRect(0, 0, w, h, 5);
  bg.stroke({ color: BTN_BORDER, alpha: 0.8, width: 1.2 });
  btn.addChild(bg);

  const txt = new Text(label, makeStyle(11, TEXT_COLOR, true));
  txt.anchor.set(0.5, 0.5);
  txt.x = w / 2;
  txt.y = h / 2;
  btn.addChild(txt);

  btn.eventMode = "static";
  btn.cursor = "pointer";

  btn.on("pointerover", () => {
    bg.tint = 0xDDCCBB;
    txt.style.fill = 0xFFEEDD;
  });
  btn.on("pointerout", () => {
    bg.tint = 0xFFFFFF;
    txt.style.fill = TEXT_COLOR;
  });
  btn.on("pointerdown", () => {
    bg.tint = 0xAA9988;
    onClick();
    setTimeout(() => { bg.tint = 0xFFFFFF; }, 100);
  });

  parent.addChild(btn);
  return btn;
}

// ============================================================================
// CivHUD Class
// ============================================================================

export class CivHUD {
  private container: Container = new Container();

  // Sub-containers for each panel
  private topBar: Container = new Container();
  private minimapContainer: Container = new Container();
  private unitPanel: Container = new Container();
  private cityPanel: Container = new Container();
  private techPanel: Container = new Container();
  private buildMenu: Container = new Container();
  private diplomacyPanel: Container = new Container();
  private endTurnBtn: Container = new Container();
  private eventLog: Container = new Container();
  private notificationBanner: Container = new Container();
  private victoryScreen: Container = new Container();
  private eventDialog: Container = new Container();
  private eventDialogGfx: Graphics = new Graphics();
  private helpPanel: Container = new Container();

  // Internal graphics references for redrawing
  private topBarGfx: Graphics = new Graphics();
  private minimapGfx: Graphics = new Graphics();
  private unitPanelGfx: Graphics = new Graphics();
  private cityPanelGfx: Graphics = new Graphics();
  private eventLogGfx: Graphics = new Graphics();

  // Text elements that update every frame
  private turnText: Text = new Text("", STYLE_HEADER);
  private factionText: Text = new Text("", STYLE_HEADER);
  private resourceText: Text = new Text("", STYLE_BODY);

  // Notification state
  private notificationText: Text = new Text("", makeStyle(14, 0xFFD700, true));
  private notificationTimer: number = 0;
  private notificationAlpha: number = 0;
  private notificationQueue: string[] = [];

  // Scroll offsets for panels
  private techScrollOffset = 0;
  private buildScrollOffset = 0;
  private diploScrollOffset = 0;

  // Cached screen dimensions
  private sw: number = 0;
  private sh: number = 0;

  // ── Callbacks ──────────────────────────────────────────────────────────────

  onEndTurn: (() => void) | null = null;
  onTechSelect: ((techId: string) => void) | null = null;
  onBuildSelect: ((cityId: number, itemId: string) => void) | null = null;
  onUnitAction: ((action: string, unitId: number) => void) | null = null;
  onDiplomacyAction: ((action: string, targetPlayer: number) => void) | null = null;
  onExitGame: (() => void) | null = null;
  onEventChoice: ((eventId: string, choiceIndex: number) => void) | null = null;
  onHeroRecruit: ((heroId: string) => void) | null = null;
  onHeroAbility: ((ability: string, unitId: number) => void) | null = null;
  onMinimapClick: ((hx: number, hy: number) => void) | null = null;

  // ══════════════════════════════════════════════════════════════════════════
  // init — Create all HUD elements and add to the UI layer
  // ══════════════════════════════════════════════════════════════════════════

  init(): void {
    this.sw = viewManager.app.screen.width;
    this.sh = viewManager.app.screen.height;

    // Main container
    this.container = new Container();
    this.container.sortableChildren = true;

    // Build each panel
    this.buildTopBar();
    this.buildMinimap();
    this.buildUnitPanel();
    this.buildCityPanel();
    this.buildEndTurnButton();
    this.buildEventLog();
    this.buildNotificationBanner();

    // Overlays start hidden
    this.techPanel.visible = false;
    this.buildMenu.visible = false;
    this.diplomacyPanel.visible = false;
    this.victoryScreen.visible = false;

    this.eventDialog.visible = false;
    this.container.addChild(this.eventDialog);

    this.helpPanel.visible = false;
    this.container.addChild(this.helpPanel);

    this.container.addChild(this.techPanel);
    this.container.addChild(this.buildMenu);
    this.container.addChild(this.diplomacyPanel);
    this.container.addChild(this.victoryScreen);

    // Add to UI layer
    viewManager.layers.ui.addChild(this.container);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // destroy — Remove everything from the stage
  // ══════════════════════════════════════════════════════════════════════════

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // update — Refresh all panels based on current game state
  // ══════════════════════════════════════════════════════════════════════════

  // Dirty flag — set true when game state changes (end turn, selection, action)
  private _hudDirty = true;
  private _lastSelectedUnit = -1;
  private _lastSelectedCity = -1;
  private _lastTurn = -1;

  /** Call this from CivGame whenever the game state changes (selection, end turn, action) */
  markDirty(): void { this._hudDirty = true; }

  update(state: CivGameState): void {
    this.sw = viewManager.app.screen.width;
    this.sh = viewManager.app.screen.height;
    this.lastState = state;

    // Notification fade runs every frame (lightweight)
    this.updateNotification();

    // End turn button position
    this.endTurnBtn.x = this.sw - 155;
    this.endTurnBtn.y = this.sh - 60;

    // Detect if anything changed since last update
    const selUnit = state.selectedUnitId;
    const selCity = state.selectedCityId;
    if (selUnit !== this._lastSelectedUnit || selCity !== this._lastSelectedCity || state.turn !== this._lastTurn) {
      this._hudDirty = true;
      this._lastSelectedUnit = selUnit;
      this._lastSelectedCity = selCity;
      this._lastTurn = state.turn;
    }

    // Only rebuild heavy panels when something changed
    if (!this._hudDirty) return;
    this._hudDirty = false;

    const human = state.players[state.humanPlayerIndex];
    if (!human) return;

    // Top bar
    this.updateTopBar(state, human);

    // Minimap
    this.updateMinimap(state);

    // Unit panel
    if (state.selectedUnitId >= 0) {
      const unit = getUnit(state, state.selectedUnitId);
      if (unit && unit.owner === state.humanPlayerIndex) {
        this.updateUnitPanel(state, unit);
        this.unitPanel.visible = true;
      } else {
        this.unitPanel.visible = false;
      }
    } else {
      this.unitPanel.visible = false;
    }

    // City panel
    if (state.selectedCityId >= 0) {
      const city = getCity(state, state.selectedCityId);
      if (city && city.owner === state.humanPlayerIndex) {
        this.updateCityPanel(state, city);
        this.cityPanel.visible = true;
      } else {
        this.cityPanel.visible = false;
      }
    } else {
      this.cityPanel.visible = false;
    }

    // Event log
    this.updateEventLog(state);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1. TOP BAR
  // ══════════════════════════════════════════════════════════════════════════

  private buildTopBar(): void {
    this.topBar = new Container();
    this.topBar.zIndex = 10;

    this.topBarGfx = new Graphics();
    this.topBar.addChild(this.topBarGfx);

    this.turnText = new Text("Turn 1", STYLE_HEADER);
    this.turnText.x = 12;
    this.turnText.y = 8;
    this.topBar.addChild(this.turnText);

    this.factionText = new Text("", STYLE_HEADER);
    this.factionText.anchor.set(0.5, 0);
    this.factionText.y = 8;
    this.topBar.addChild(this.factionText);

    this.resourceText = new Text("", makeStyle(11, TEXT_COLOR));
    this.resourceText.anchor.set(1, 0);
    this.resourceText.y = 10;
    this.topBar.addChild(this.resourceText);

    // Gear icon (exit button)
    const gearBtn = new Container();
    gearBtn.eventMode = "static";
    gearBtn.cursor = "pointer";
    const gearGfx = new Graphics();
    gearGfx.circle(0, 0, 13);
    gearGfx.fill({ color: BTN_BG, alpha: 0.9 });
    gearGfx.circle(0, 0, 13);
    gearGfx.stroke({ color: PANEL_BORDER, width: 1 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      gearGfx.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
      gearGfx.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
      gearGfx.stroke({ color: ACCENT, width: 2 });
    }
    gearGfx.circle(0, 0, 5);
    gearGfx.fill({ color: BTN_BG });
    gearBtn.addChild(gearGfx);
    gearBtn.y = 18;
    gearBtn.on("pointerdown", () => { if (this.onExitGame) this.onExitGame(); });
    this.topBar.addChild(gearBtn);
    // Position will be set in update
    (gearBtn as any)._isGearBtn = true;

    this.container.addChild(this.topBar);
  }

  private updateTopBar(state: CivGameState, human: CivPlayer): void {
    const g = this.topBarGfx;
    g.clear();

    // Gradient-like top bar: darker at top, lighter at bottom
    g.rect(0, 0, this.sw, 40);
    g.fill({ color: 0x1A150F, alpha: 0.95 });
    g.rect(0, 0, this.sw, 18);
    g.fill({ color: 0x241E16, alpha: 0.5 });
    // Bottom gold accent line
    g.rect(0, 38, this.sw, 2);
    g.fill({ color: ACCENT, alpha: 0.6 });
    // Left decorative flourish
    g.moveTo(0, 40); g.lineTo(120, 40); g.lineTo(140, 30); g.lineTo(120, 30); g.lineTo(0, 30);
    g.fill({ color: ACCENT, alpha: 0.1 });

    // Faction crest circle behind name
    const cx = this.sw / 2;
    g.circle(cx, 20, 16);
    g.fill({ color: human.factionDef.color, alpha: 0.2 });
    g.circle(cx, 20, 16);
    g.stroke({ color: human.factionDef.color, alpha: 0.5, width: 1.5 });

    this.turnText.text = `⚜ Turn ${state.turn}`;

    this.factionText.text = human.factionDef.name;
    this.factionText.x = cx;

    const gaText = human.goldenAgeTurns > 0 ? `✨ GOLDEN AGE (${human.goldenAgeTurns}t) ✨  ·  ` : "";
    const goldSign = human.goldPerTurn >= 0 ? "+" : "";
    const goldColor = human.gold < 0 ? "🔴" : "💰";
    this.resourceText.text = gaText +
      `${goldColor} ${Math.floor(human.gold)} (${goldSign}${human.goldPerTurn}/t)` +
      `  ·  📜 ${human.researchPerTurn}/t` +
      `  ·  ♛ ${human.chivalry}` +
      `  ·  ⭐ ${human.score}` +
      `  ·  🏰 ${human.cityIds.length}` +
      `  ·  ⚔ ${human.unitIds.length}`;
    this.resourceText.x = this.sw - 50;

    for (const child of this.topBar.children) {
      if ((child as any)._isGearBtn) child.x = this.sw - 22;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. MINIMAP
  // ══════════════════════════════════════════════════════════════════════════

  private buildMinimap(): void {
    this.minimapContainer = new Container();
    this.minimapContainer.zIndex = 5;

    this.minimapGfx = new Graphics();
    this.minimapContainer.addChild(this.minimapGfx);

    this.container.addChild(this.minimapContainer);
  }

  private updateMinimap(state: CivGameState): void {
    const mmW = 180;
    const mmH = 130;
    const mmX = 8;
    const mmY = this.sh - mmH - 8;
    this.minimapContainer.x = mmX;
    this.minimapContainer.y = mmY;

    this.minimapGfx.clear();
    drawPanel(this.minimapGfx, 0, 0, mmW, mmH);

    if (!state.tiles || state.mapWidth === 0 || state.mapHeight === 0) return;

    const padX = 4;
    const padY = 4;
    const innerW = mmW - padX * 2;
    const innerH = mmH - padY * 2;
    const dotW = innerW / state.mapWidth;
    const dotH = innerH / state.mapHeight;

    const mg = this.minimapGfx;

    // Terrain dots — use actual terrain colors from config
    for (let y = 0; y < state.mapHeight; y++) {
      for (let x = 0; x < state.mapWidth; x++) {
        const tile = state.tiles[y]?.[x];
        if (!tile) continue;
        const tDef = TERRAIN_TYPES[tile.terrain];
        const color = tDef ? tDef.color : 0x3A5A30;

        mg.rect(padX + x * dotW, padY + y * dotH, Math.max(1, dotW), Math.max(1, dotH));
        mg.fill({ color, alpha: 0.9 });

        // Owned territory tint
        if (tile.owner >= 0 && tile.owner < CIV_FACTIONS.length) {
          mg.rect(padX + x * dotW, padY + y * dotH, Math.max(1, dotW), Math.max(1, dotH));
          mg.fill({ color: CIV_FACTIONS[tile.owner].color, alpha: 0.15 });
        }
      }
    }

    // City markers (larger, brighter)
    for (const city of state.cities) {
      const player = state.players[city.owner];
      if (!player) continue;
      const ccx = padX + city.x * dotW + dotW / 2;
      const ccy = padY + city.y * dotH + dotH / 2;
      // Glow
      mg.circle(ccx, ccy, 4);
      mg.fill({ color: player.factionDef.color, alpha: 0.3 });
      // Dot
      mg.rect(ccx - 2, ccy - 2, 4, 4);
      mg.fill({ color: player.factionDef.color });
      mg.rect(ccx - 2, ccy - 2, 4, 4);
      mg.stroke({ color: 0x000000, alpha: 0.5, width: 0.5 });
    }

    // Fog overlay on minimap
    if (state.visibility[state.humanPlayerIndex]) {
      const vis = state.visibility[state.humanPlayerIndex];
      for (let hy = 0; hy < state.mapHeight; hy++) {
        for (let hx = 0; hx < state.mapWidth; hx++) {
          const v = vis[hy]?.[hx] ?? 0;
          if (v === 0) {
            mg.rect(padX + hx * dotW, padY + hy * dotH, dotW + 0.5, dotH + 0.5);
            mg.fill({ color: 0x080810, alpha: 0.9 });
          } else if (v === 1) {
            mg.rect(padX + hx * dotW, padY + hy * dotH, dotW + 0.5, dotH + 0.5);
            mg.fill({ color: 0x0A0A18, alpha: 0.35 });
          }
        }
      }
    }

    // Viewport outline (approximate)
    mg.rect(padX + 2, padY + 2, innerW * 0.3, innerH * 0.3);
    mg.stroke({ color: 0xFFFFFF, alpha: 0.6, width: 1 });

    // Make minimap clickable
    this.minimapContainer.eventMode = "static";
    this.minimapContainer.cursor = "pointer";
    this.minimapContainer.on("pointerdown", (e: any) => {
      const local = e.getLocalPosition(this.minimapContainer);
      // Convert minimap coords to map coords
      const scaleX = dotW;
      const scaleY = dotH;
      const hx = Math.floor((local.x - padX) / scaleX);
      const hy = Math.floor((local.y - padY) / scaleY);
      if (this.onMinimapClick) this.onMinimapClick(hx, hy);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. UNIT INFO PANEL
  // ══════════════════════════════════════════════════════════════════════════

  private buildUnitPanel(): void {
    this.unitPanel = new Container();
    this.unitPanel.zIndex = 8;
    this.unitPanel.visible = false;

    this.unitPanelGfx = new Graphics();
    this.unitPanel.addChild(this.unitPanelGfx);

    this.container.addChild(this.unitPanel);
  }

  private updateUnitPanel(_state: CivGameState, unit: CivUnit): void {
    // Destroy old children to prevent memory leak, then rebuild
    for (const c of this.unitPanel.removeChildren()) c.destroy();
    this.unitPanelGfx = new Graphics();
    this.unitPanel.addChild(this.unitPanelGfx);

    const pw = 360;
    const ph = 110;
    const px = (this.sw - pw) / 2;
    const py = this.sh - ph - 8;
    this.unitPanel.x = px;
    this.unitPanel.y = py;

    drawPanel(this.unitPanelGfx, 0, 0, pw, ph);

    // Unit name
    const unitDef = CIV_UNIT_DEFS[unit.type];
    const displayName = unit.label || (unitDef ? unitDef.name : unit.type);
    const nameStyle = unit.isHero ? STYLE_HERO : STYLE_HEADER;
    const nameText = new Text(displayName, nameStyle);
    nameText.x = 10;
    nameText.y = 6;
    this.unitPanel.addChild(nameText);

    // Type label
    const typeLabel = unitDef ? unitDef.unitClass.toUpperCase() : "UNIT";
    const typeText = new Text(typeLabel, makeStyle(10, 0x999988));
    typeText.x = 10;
    typeText.y = 24;
    this.unitPanel.addChild(typeText);

    // HP bar
    const hpFill = unit.hp / unit.maxHp;
    let hpColor = 0x44AA44;
    if (hpFill < 0.3) hpColor = 0xCC3333;
    else if (hpFill < 0.6) hpColor = 0xCCAA33;

    drawBar(this.unitPanelGfx, 10, 40, 140, 10, hpFill, hpColor);
    const hpText = new Text(`HP: ${unit.hp}/${unit.maxHp}`, makeStyle(10, TEXT_COLOR));
    hpText.x = 155;
    hpText.y = 37;
    this.unitPanel.addChild(hpText);

    // Stats: ATK / DEF / MOV
    const statsStr = `ATK: ${unit.attack}  DEF: ${unit.defense}  MOV: ${unit.movement}/${unit.maxMovement}`;
    const statsText = new Text(statsStr, makeStyle(11, TEXT_COLOR));
    statsText.x = 10;
    statsText.y = 55;
    this.unitPanel.addChild(statsText);

    // XP bar
    const xpNeeded = unit.level * 10 + 10; // simplified XP per level
    const xpFill = Math.min(1, unit.experience / xpNeeded);
    drawBar(this.unitPanelGfx, 10, 72, 100, 8, xpFill, 0x6688CC);
    const xpText = new Text(`Lv ${unit.level} (${unit.experience}/${xpNeeded} XP)`, makeStyle(10, TEXT_COLOR));
    xpText.x = 115;
    xpText.y = 69;
    this.unitPanel.addChild(xpText);

    // Action buttons
    const btnY = 86;
    const btnH = 20;
    const btnW = 50;
    let bx = 10;

    const actions: { label: string; action: string }[] = [];

    // Check if settler
    if (unitDef && unitDef.canFoundCity) {
      actions.push({ label: "Found City", action: "found_city" });
    }

    if (unitDef?.unitClass === "scout") {
      actions.push({ label: "Explore", action: "explore" });
    }
    // Spy actions
    if (unitDef?.id === "spy") {
      actions.push({ label: "Steal Tech", action: "steal_tech" });
      actions.push({ label: "Sabotage", action: "sabotage" });
    }
    actions.push({ label: "Move", action: "move" });
    actions.push({ label: "Fortify", action: "fortify" });
    actions.push({ label: "Sleep", action: "sleep" });
    actions.push({ label: "Skip", action: "skip" });
    actions.push({ label: "Disband", action: "disband" });

    for (const act of actions) {
      const aw = act.label.length > 6 ? 65 : btnW;
      drawButton(this.unitPanel, bx, btnY, aw, btnH, act.label, () => {
        if (this.onUnitAction) this.onUnitAction(act.action, unit.id);
      });
      bx += aw + 4;
    }

    // Worker improvement buttons
    if (unitDef?.canBuildImprovement && _state) {
      const validImprovements = getValidImprovements(_state, unit.x, unit.y);
      if (validImprovements.length > 0) {
        let ix = 10;
        for (const imp of validImprovements) {
          const impLabel = imp.charAt(0).toUpperCase() + imp.slice(1).replace("_", " ");
          drawButton(this.unitPanel, ix, btnY + 28, 55, 20, impLabel, () => {
            if (this.onUnitAction) this.onUnitAction(`improve_${imp}`, unit.id);
          });
          ix += 58;
        }
      }
    }

    // Hero abilities
    if (unit.isHero && unit.heroId) {
      const heroDef = CIV_HEROES[unit.heroId];
      if (heroDef && heroDef.abilities.length > 0) {
        let ax = 10;
        const abilY = btnY + 28;
        for (const ability of heroDef.abilities) {
          const abilLabel = ability.charAt(0).toUpperCase() + ability.slice(1).replace("_", " ");
          drawButton(this.unitPanel, ax, abilY, 65, 20, abilLabel, () => {
            if (this.onHeroAbility) this.onHeroAbility(ability, unit.id);
          });
          ax += 68;
        }
      }
    }

    // Worker progress display
    if ((unit as any).improvementTarget) {
      const impName = (unit as any).improvementTarget.replace("_", " ");
      const turnsLeft = (unit as any).improvementProgress ?? 0;
      const impText = new Text(`Building ${impName}... (${turnsLeft} turns)`, new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0xFFC107 }));
      impText.x = 10; impText.y = 70;
      this.unitPanel.addChild(impText);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. CITY PANEL (right side)
  // ══════════════════════════════════════════════════════════════════════════

  private buildCityPanel(): void {
    this.cityPanel = new Container();
    this.cityPanel.zIndex = 8;
    this.cityPanel.visible = false;

    this.cityPanelGfx = new Graphics();
    this.cityPanel.addChild(this.cityPanelGfx);

    this.container.addChild(this.cityPanel);
  }

  private updateCityPanel(state: CivGameState, city: CivCity): void {
    for (const c of this.cityPanel.removeChildren()) c.destroy();
    this.cityPanelGfx = new Graphics();
    this.cityPanel.addChild(this.cityPanelGfx);

    const pw = 260;
    const ph = 420;
    const px = this.sw - pw - 8;
    const py = 44;
    this.cityPanel.x = px;
    this.cityPanel.y = py;

    drawPanel(this.cityPanelGfx, 0, 0, pw, ph);

    let ly = 8;

    // City name
    const nameStr = city.isCapital ? `★ ${city.name}` : city.name;
    const nameText = new Text(nameStr, STYLE_TITLE);
    nameText.x = 10;
    nameText.y = ly;
    this.cityPanel.addChild(nameText);
    ly += 24;

    // Population
    const popText = new Text(`Population: ${city.population}`, makeStyle(12, TEXT_COLOR));
    popText.x = 10;
    popText.y = ly;
    this.cityPanel.addChild(popText);
    ly += 18;

    // Food bar
    const foodFill = city.foodNeeded > 0 ? city.food / city.foodNeeded : 0;
    const foodLabel = new Text(`Food: ${Math.floor(city.food)}/${city.foodNeeded}`, makeStyle(11, TEXT_COLOR));
    foodLabel.x = 10;
    foodLabel.y = ly;
    this.cityPanel.addChild(foodLabel);
    ly += 15;
    drawBar(this.cityPanelGfx, 10, ly, 230, 10, foodFill, 0x55AA55);
    ly += 16;

    // Yields
    const yields = calculateCityYields(state, city);
    const yieldLines = [
      `Production: ${yields.production}`,
      `Gold: ${yields.gold}`,
      `Research: ${yields.research}`,
      `Culture: ${yields.culture}`,
    ];
    for (const line of yieldLines) {
      const yText = new Text(line, makeStyle(11, TEXT_COLOR));
      yText.x = 10;
      yText.y = ly;
      this.cityPanel.addChild(yText);
      ly += 15;
    }

    // Happiness
    const happyColor = city.happiness >= 5 ? 0x44AA44 : city.happiness >= 0 ? 0xFFC107 : 0xFF4444;
    const happyText = city.happiness >= 5 ? "Happy" : city.happiness >= 0 ? "Content" : "Revolt!";
    const happyLabel = new Text(`Mood: ${happyText} (${city.happiness})`, new TextStyle({ fontFamily: "serif", fontSize: 12, fill: happyColor }));
    happyLabel.x = 10;
    happyLabel.y = ly;
    this.cityPanel.addChild(happyLabel);
    ly += 18;

    // Defense
    const defText = new Text(`Defense: ${city.defense}`, makeStyle(11, 0xAAAA88));
    defText.x = 10;
    defText.y = ly;
    this.cityPanel.addChild(defText);
    ly += 20;

    // Separator
    this.cityPanelGfx.moveTo(10, ly);
    this.cityPanelGfx.lineTo(pw - 10, ly);
    this.cityPanelGfx.stroke({ color: PANEL_BORDER, alpha: 0.5, width: 1 });
    ly += 6;

    // Buildings list
    const bldHeader = new Text("Buildings:", makeStyle(12, ACCENT, true));
    bldHeader.x = 10;
    bldHeader.y = ly;
    this.cityPanel.addChild(bldHeader);
    ly += 16;

    const maxBuildingDisplay = 8;
    const buildingsToShow = city.buildings.slice(0, maxBuildingDisplay);
    for (const bId of buildingsToShow) {
      const bDef = CIV_BUILDING_DEFS[bId];
      const bName = bDef ? bDef.name : bId;
      const bText = new Text(`  • ${bName}`, makeStyle(10, TEXT_COLOR));
      bText.x = 10;
      bText.y = ly;
      this.cityPanel.addChild(bText);
      ly += 13;
    }
    if (city.buildings.length > maxBuildingDisplay) {
      const moreText = new Text(
        `  ...and ${city.buildings.length - maxBuildingDisplay} more`,
        makeStyle(10, 0x888877)
      );
      moreText.x = 10;
      moreText.y = ly;
      this.cityPanel.addChild(moreText);
      ly += 13;
    }
    if (city.buildings.length === 0) {
      const noneText = new Text("  (none)", makeStyle(10, 0x777766));
      noneText.x = 10;
      noneText.y = ly;
      this.cityPanel.addChild(noneText);
      ly += 13;
    }
    ly += 6;

    // Separator
    this.cityPanelGfx.moveTo(10, ly);
    this.cityPanelGfx.lineTo(pw - 10, ly);
    this.cityPanelGfx.stroke({ color: PANEL_BORDER, alpha: 0.5, width: 1 });
    ly += 6;

    // Build queue
    const queueHeader = new Text("Build Queue:", makeStyle(12, ACCENT, true));
    queueHeader.x = 10;
    queueHeader.y = ly;
    this.cityPanel.addChild(queueHeader);
    ly += 16;

    if (city.buildQueue.length > 0) {
      const currentBuild = city.buildQueue[0];
      // Try to find cost of current production item
      let totalCost = 0;
      const uDef = CIV_UNIT_DEFS[currentBuild];
      const bDef = CIV_BUILDING_DEFS[currentBuild];
      const wDef = CIV_WONDERS[currentBuild];
      if (uDef) totalCost = uDef.cost;
      else if (bDef) totalCost = bDef.cost;
      else if (wDef) totalCost = wDef.cost;

      const prodName = uDef?.name ?? bDef?.name ?? wDef?.name ?? currentBuild;
      const buildText = new Text(`Building: ${prodName}`, makeStyle(11, TEXT_COLOR));
      buildText.x = 10;
      buildText.y = ly;
      this.cityPanel.addChild(buildText);
      ly += 15;

      // Production progress bar
      const prodFill = totalCost > 0 ? city.productionAccum / totalCost : 0;
      drawBar(this.cityPanelGfx, 10, ly, 180, 10, prodFill, 0xCC8833);
      const prodPctText = new Text(
        `${Math.floor(city.productionAccum)}/${totalCost}`,
        makeStyle(10, TEXT_COLOR)
      );
      prodPctText.x = 195;
      prodPctText.y = ly - 2;
      this.cityPanel.addChild(prodPctText);
      ly += 16;

      // Remaining queue
      if (city.buildQueue.length > 1) {
        for (let qi = 1; qi < Math.min(city.buildQueue.length, 4); qi++) {
          const qItem = city.buildQueue[qi];
          const qDef = CIV_UNIT_DEFS[qItem] ?? CIV_BUILDING_DEFS[qItem] ?? CIV_WONDERS[qItem];
          const qName = qDef ? (qDef as any).name : qItem;
          const qText = new Text(`  ${qi + 1}. ${qName}`, makeStyle(10, 0x999988));
          qText.x = 10;
          qText.y = ly;
          this.cityPanel.addChild(qText);
          ly += 13;
        }
      }
    } else {
      const idleText = new Text("  (idle — nothing in queue)", makeStyle(10, 0xCC8833));
      idleText.x = 10;
      idleText.y = ly;
      this.cityPanel.addChild(idleText);
      ly += 15;
    }
    ly += 6;

    // Change Build button
    drawButton(this.cityPanel, 10, ly, 120, 24, "Change Build", () => {
      this.showBuildMenu(this.lastState!, city.id);
    });

    // Hero recruitment button (if heroes available)
    const player = state.players[city.owner];
    if (player) {
      const recruitedHeroIds = player.heroes || [];
      const availableHeroes = Object.values(CIV_HEROES).filter(
        (h: any) => !recruitedHeroIds.includes(h.id) && (!h.requiresTech || player.techs.includes(h.requiresTech))
      );
      if (availableHeroes.length > 0) {
        drawButton(this.cityPanel, 140, ly, 110, 24, "Recruit Hero", () => {
          if (this.onHeroRecruit && availableHeroes.length > 0) {
            this.onHeroRecruit((availableHeroes[0] as any).id);
          }
        });
      }
    }
  }

  // Store last state for callbacks
  private lastState: CivGameState | null = null;

  // ══════════════════════════════════════════════════════════════════════════
  // 5. TECH PANEL (overlay)
  // ══════════════════════════════════════════════════════════════════════════

  showTechPanel(state: CivGameState): void {
    for (const c of this.techPanel.removeChildren()) c.destroy();
    this.techPanel.visible = true;
    this.techPanel.zIndex = 50;

    const human = state.players[state.humanPlayerIndex];
    if (!human) return;

    const pw = 700;
    const ph = 500;
    const px = (this.sw - pw) / 2;
    const py = (this.sh - ph) / 2;
    this.techPanel.x = px;
    this.techPanel.y = py;

    // Backdrop
    const backdrop = new Graphics();
    backdrop.rect(-px, -py, this.sw, this.sh);
    backdrop.fill({ color: 0x000000, alpha: 0.5 });
    backdrop.eventMode = "static";
    this.techPanel.addChild(backdrop);

    // Panel background
    const bg = new Graphics();
    drawPanel(bg, 0, 0, pw, ph);
    this.techPanel.addChild(bg);

    // Title
    const title = new Text("Lore & Legend", STYLE_TITLE);
    title.anchor.set(0.5, 0);
    title.x = pw / 2;
    title.y = 10;
    this.techPanel.addChild(title);

    // Current research + progress
    if (human.currentTech) {
      const techDef = CIV_TECH_TREE[human.currentTech];
      if (techDef) {
        const resLabel = new Text(
          `Researching: ${techDef.name}`,
          makeStyle(12, ACCENT, true)
        );
        resLabel.x = 15;
        resLabel.y = 35;
        this.techPanel.addChild(resLabel);

        const resFill = techDef.cost > 0 ? human.researchAccum / techDef.cost : 0;
        drawBar(bg, 15, 52, 300, 10, resFill, 0x6688CC);

        const resPct = new Text(
          `${Math.floor(human.researchAccum)}/${techDef.cost}`,
          makeStyle(10, TEXT_COLOR)
        );
        resPct.x = 320;
        resPct.y = 49;
        this.techPanel.addChild(resPct);
      }
    } else {
      const noRes = new Text("No research selected", makeStyle(12, 0xCC8833));
      noRes.x = 15;
      noRes.y = 35;
      this.techPanel.addChild(noRes);
    }

    // Column headers
    const branches: { key: string; label: string }[] = [
      { key: "chivalry", label: "Chivalry" },
      { key: "sorcery", label: "Sorcery" },
      { key: "statecraft", label: "Statecraft" },
      { key: "faith", label: "Faith" },
    ];

    const colW = (pw - 20) / 4;
    const startY = 72;
    const headerHeight = startY + 22;
    const techBoxPositions = new Map<string, {x: number, y: number, w: number, h: number}>();
    const allTechs: TechDef[] = [];

    // Era legend
    const eraLabels = ["Era I", "Era II", "Era III", "Era IV"];
    const eraLColors = [0x66AA44, 0x4488CC, 0xAA44CC, 0xFFAA22];
    for (let ei = 0; ei < 4; ei++) {
      const ex = pw - 200 + ei * 48;
      bg.rect(ex, 12, 12, 12);
      bg.fill({ color: eraLColors[ei], alpha: 0.7 });
      const el = new Text(eraLabels[ei], makeStyle(9, 0xAA9988));
      el.x = ex + 15; el.y = 13;
      this.techPanel.addChild(el);
    }

    for (let ci = 0; ci < branches.length; ci++) {
      const bx = 10 + ci * colW;
      const branch = branches[ci];

      // Column header
      const colHeader = new Text(branch.label, makeStyle(13, ACCENT, true));
      colHeader.anchor.set(0.5, 0);
      colHeader.x = bx + colW / 2;
      colHeader.y = startY;
      this.techPanel.addChild(colHeader);

      // Separator line
      bg.moveTo(bx + colW, startY);
      bg.lineTo(bx + colW, ph - 10);
      bg.stroke({ color: PANEL_BORDER, alpha: 0.4, width: 1 });

      // Collect techs for this branch
      const branchTechs = Object.values(CIV_TECH_TREE).filter(
        (t: TechDef) => t.branch === branch.key
      );

      let ty = startY + 22 - this.techScrollOffset * 25;
      for (const tech of branchTechs) {
        allTechs.push(tech);
        if (ty < headerHeight) { ty += 32; continue; }
        if (ty > ph - 60) { ty += 32; continue; }

        const isResearched = human.techs.includes(tech.id);
        const isAvailable = !isResearched && tech.prerequisites.every(
          (p: string) => human.techs.includes(p)
        );
        const isCurrent = human.currentTech === tech.id;

        let boxColor = 0x555544; // locked
        let textColor = 0x666655;
        if (isResearched) {
          boxColor = 0xC4A265; // gold = done
          textColor = 0xFFEECC;
        } else if (isAvailable) {
          boxColor = 0x888877; // white-ish = available
          textColor = 0xEEEEDD;
        }
        if (isCurrent) {
          boxColor = 0x6688CC;
          textColor = 0xCCDDFF;
        }

        const bw = colW - 12;
        const bh = 28;
        const techBox = new Container();
        techBox.x = bx + 4;
        techBox.y = ty;
        techBoxPositions.set(tech.id, { x: bx + 4, y: ty, w: bw, h: bh });

        const techBg = new Graphics();
        techBg.roundRect(0, 0, bw, bh, 3);
        techBg.fill({ color: boxColor, alpha: 0.4 });
        techBg.roundRect(0, 0, bw, bh, 3);
        techBg.stroke({ color: boxColor, alpha: 0.8, width: 1 });
        // Era color strip on left edge
        const eraColors = [0x66AA44, 0x4488CC, 0xAA44CC, 0xFFAA22]; // era 1-4
        const eraC = eraColors[Math.min(3, (tech.era ?? 1) - 1)];
        techBg.rect(0, 0, 4, bh);
        techBg.fill({ color: eraC, alpha: 0.8 });
        techBox.addChild(techBg);

        const techName = new Text(tech.name, makeStyle(10, textColor, isResearched));
        techName.x = 10;
        techName.y = 2;
        techBox.addChild(techName);

        const costText = new Text(
          isResearched ? "✓" : `${tech.cost}`,
          makeStyle(9, textColor)
        );
        costText.x = 10;
        costText.y = 15;
        techBox.addChild(costText);

        // Click to select if available
        if (isAvailable && !isCurrent) {
          techBox.eventMode = "static";
          techBox.cursor = "pointer";
          techBox.on("pointerover", () => { techBg.tint = 0xDDCCBB; });
          techBox.on("pointerout", () => { techBg.tint = 0xFFFFFF; });
          techBox.on("pointerdown", () => {
            if (this.onTechSelect) this.onTechSelect(tech.id);
            this.hideTechPanel();
          });
        }

        this.techPanel.addChild(techBox);
        ty += 32;
      }
    }

    // Draw prerequisite lines
    for (const tech of allTechs) {
      const fromBox = techBoxPositions.get(tech.id);
      if (!fromBox) continue;
      for (const prereq of tech.prerequisites) {
        const toBox = techBoxPositions.get(prereq);
        if (!toBox) continue;
        const lineG = new Graphics();
        lineG.moveTo(toBox.x + toBox.w, toBox.y + toBox.h / 2);
        lineG.lineTo(fromBox.x, fromBox.y + fromBox.h / 2);
        lineG.stroke({ color: 0x887766, width: 1.5, alpha: 0.6 });
        this.techPanel.addChild(lineG);
      }
    }

    // Scroll up
    drawButton(this.techPanel, pw - 60, ph - 28, 25, 22, "▲", () => {
      this.techScrollOffset = Math.max(0, this.techScrollOffset - 3);
      this.showTechPanel(state);
    });
    // Scroll down
    drawButton(this.techPanel, pw - 30, ph - 28, 25, 22, "▼", () => {
      this.techScrollOffset += 3;
      this.showTechPanel(state);
    });

    // Close button
    drawButton(this.techPanel, pw - 150, ph - 35, 70, 26, "Close", () => {
      this.hideTechPanel();
    });
  }

  hideTechPanel(): void {
    this.techPanel.visible = false;
    for (const c of this.techPanel.removeChildren()) c.destroy();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. BUILD MENU (overlay)
  // ══════════════════════════════════════════════════════════════════════════

  showBuildMenu(state: CivGameState, cityId: number): void {
    for (const c of this.buildMenu.removeChildren()) c.destroy();
    this.buildMenu.visible = true;
    this.buildMenu.zIndex = 50;

    const city = getCity(state, cityId);
    if (!city) return;

    const buildable = getBuildableItems(state, city);
    const pw = 400;
    const ph = 500;
    const px = (this.sw - pw) / 2;
    const py = (this.sh - ph) / 2;
    this.buildMenu.x = px;
    this.buildMenu.y = py;

    // Backdrop
    const backdrop = new Graphics();
    backdrop.rect(-px, -py, this.sw, this.sh);
    backdrop.fill({ color: 0x000000, alpha: 0.5 });
    backdrop.eventMode = "static";
    this.buildMenu.addChild(backdrop);

    // Panel
    const bg = new Graphics();
    drawPanel(bg, 0, 0, pw, ph);
    this.buildMenu.addChild(bg);

    // Title
    const title = new Text("Choose Production", STYLE_TITLE);
    title.anchor.set(0.5, 0);
    title.x = pw / 2;
    title.y = 10;
    this.buildMenu.addChild(title);

    let ly = 38 - this.buildScrollOffset * 25;
    const itemW = pw - 20;
    const itemH = 24;
    const buildHeaderHeight = 38;

    const renderSection = (label: string, items: string[], type: "unit" | "building" | "wonder") => {
      if (items.length === 0) return;

      if (ly >= buildHeaderHeight && ly <= ph - 60) {
        const header = new Text(label, makeStyle(13, ACCENT, true));
        header.x = 10;
        header.y = ly;
        this.buildMenu.addChild(header);
      }
      ly += 18;

      for (const itemId of items) {
        const actualH = type === "unit" ? 32 : itemH;
        if (ly < buildHeaderHeight) { ly += actualH + 3; continue; }
        if (ly > ph - 60) { ly += actualH + 3; continue; }

        let name = itemId;
        let cost = 0;

        if (type === "unit") {
          const def = CIV_UNIT_DEFS[itemId];
          if (def) { name = def.name; cost = def.cost; }
        } else if (type === "building") {
          const def = CIV_BUILDING_DEFS[itemId];
          if (def) { name = def.name; cost = def.cost; }
        } else {
          const def = CIV_WONDERS[itemId];
          if (def) { name = def.name; cost = def.cost; }
        }

        const turnsNeeded = city.production > 0
          ? Math.max(1, Math.ceil((cost - city.productionAccum) / city.production))
          : Infinity;
        const turnsStr = turnsNeeded === Infinity ? "\u221e" : `${turnsNeeded} turns`;

        const itemContainer = new Container();
        itemContainer.x = 10;
        itemContainer.y = ly;

        const itemBg = new Graphics();
        itemBg.roundRect(0, 0, itemW, actualH, 3);
        itemBg.fill({ color: BTN_BG, alpha: 0.6 });
        itemBg.roundRect(0, 0, itemW, actualH, 3);
        itemBg.stroke({ color: PANEL_BORDER, alpha: 0.4, width: 1 });
        itemContainer.addChild(itemBg);

        const itemName = new Text(name, makeStyle(11, TEXT_COLOR));
        itemName.x = 8;
        itemName.y = 4;
        itemContainer.addChild(itemName);

        const costLabel = new Text(
          `Cost: ${cost}  (~${turnsStr})`,
          makeStyle(10, 0x999988)
        );
        costLabel.anchor.set(1, 0);
        costLabel.x = itemW - 8;
        costLabel.y = 5;
        itemContainer.addChild(costLabel);

        if (type === "unit") {
          const uDef = CIV_UNIT_DEFS[itemId];
          if (uDef) {
            const statsStr = `\u2694${uDef.attack} \ud83d\udee1${uDef.defense} \u2665${uDef.hp} \ud83d\udc63${uDef.movement}`;
            const statsLine = new Text(statsStr, makeStyle(9, 0x888877));
            statsLine.x = 8; statsLine.y = 14;
            itemContainer.addChild(statsLine);
          }
        }

        if (type === "building") {
          const bDef = CIV_BUILDING_DEFS[itemId];
          if (bDef) {
            const effects: string[] = [];
            if (bDef.effects.food) effects.push(`+${bDef.effects.food} food`);
            if (bDef.effects.production) effects.push(`+${bDef.effects.production} prod`);
            if (bDef.effects.gold) effects.push(`+${bDef.effects.gold} gold`);
            if (bDef.effects.research) effects.push(`+${bDef.effects.research} research`);
            if (bDef.effects.culture) effects.push(`+${bDef.effects.culture} culture`);
            if (bDef.effects.happiness) effects.push(`+${bDef.effects.happiness} happy`);
            if (bDef.effects.defense) effects.push(`+${bDef.effects.defense} defense`);
            if (effects.length > 0) {
              const effectStr = effects.join(", ");
              const effectLine = new Text(effectStr, makeStyle(9, 0x88AA77));
              effectLine.x = 8; effectLine.y = 14;
              itemContainer.addChild(effectLine);
            }
          }
        }

        itemContainer.eventMode = "static";
        itemContainer.cursor = "pointer";
        itemContainer.on("pointerover", () => { itemBg.tint = 0xDDCCBB; });
        itemContainer.on("pointerout", () => { itemBg.tint = 0xFFFFFF; });
        itemContainer.on("pointerdown", () => {
          if (this.onBuildSelect) this.onBuildSelect(cityId, itemId);
          this.hideBuildMenu();
        });

        this.buildMenu.addChild(itemContainer);
        ly += actualH + 3;
      }
      ly += 4;
    };

    renderSection("— Units —", buildable.units, "unit");
    renderSection("— Buildings —", buildable.buildings, "building");
    renderSection("— Wonders —", buildable.wonders, "wonder");

    // Scroll up
    drawButton(this.buildMenu, pw - 60, ph - 28, 25, 22, "▲", () => {
      this.buildScrollOffset = Math.max(0, this.buildScrollOffset - 3);
      this.showBuildMenu(state, cityId);
    });
    // Scroll down
    drawButton(this.buildMenu, pw - 30, ph - 28, 25, 22, "▼", () => {
      this.buildScrollOffset += 3;
      this.showBuildMenu(state, cityId);
    });

    // Close button
    drawButton(this.buildMenu, pw - 150, ph - 35, 70, 26, "Close", () => {
      this.hideBuildMenu();
    });
  }

  hideBuildMenu(): void {
    this.buildMenu.visible = false;
    for (const c of this.buildMenu.removeChildren()) c.destroy();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. DIPLOMACY PANEL (overlay)
  // ══════════════════════════════════════════════════════════════════════════

  showDiplomacyPanel(state: CivGameState): void {
    for (const c of this.diplomacyPanel.removeChildren()) c.destroy();
    this.diplomacyPanel.visible = true;
    this.diplomacyPanel.zIndex = 50;

    const human = state.players[state.humanPlayerIndex];
    if (!human) return;

    const pw = 500;
    const ph = 400;
    const px = (this.sw - pw) / 2;
    const py = (this.sh - ph) / 2;
    this.diplomacyPanel.x = px;
    this.diplomacyPanel.y = py;

    // Backdrop
    const backdrop = new Graphics();
    backdrop.rect(-px, -py, this.sw, this.sh);
    backdrop.fill({ color: 0x000000, alpha: 0.5 });
    backdrop.eventMode = "static";
    this.diplomacyPanel.addChild(backdrop);

    // Panel
    const bg = new Graphics();
    drawPanel(bg, 0, 0, pw, ph);
    this.diplomacyPanel.addChild(bg);

    // Title
    const title = new Text("Diplomacy", STYLE_TITLE);
    title.anchor.set(0.5, 0);
    title.x = pw / 2;
    title.y = 10;
    this.diplomacyPanel.addChild(title);

    let ly = 40 - this.diploScrollOffset * 25;
    const rowH = 55;
    const diploHeaderHeight = 40;

    for (const dipEntry of human.diplomacy) {
      const targetPlayer = state.players[dipEntry.targetPlayer];
      if (!targetPlayer || !targetPlayer.alive) continue;
      if (dipEntry.targetPlayer === state.humanPlayerIndex) continue;

      if (ly < diploHeaderHeight) { ly += rowH + 6; continue; }
      if (ly + rowH > ph - 60) { ly += rowH + 6; continue; }

      // Row background
      const rowBg = new Graphics();
      rowBg.roundRect(0, 0, pw - 20, rowH, 4);
      rowBg.fill({ color: 0x1A1209, alpha: 0.5 });
      rowBg.roundRect(0, 0, pw - 20, rowH, 4);
      rowBg.stroke({ color: PANEL_BORDER, alpha: 0.3, width: 1 });
      rowBg.x = 10;
      rowBg.y = ly;
      this.diplomacyPanel.addChild(rowBg);

      // Faction color circle
      const circle = new Graphics();
      circle.circle(0, 0, 10);
      circle.fill({ color: targetPlayer.factionDef.color, alpha: 1 });
      circle.x = 28;
      circle.y = ly + rowH / 2;
      this.diplomacyPanel.addChild(circle);

      // Faction initial letter inside circle
      const initial = new Text(targetPlayer.factionDef.name.charAt(0), new TextStyle({ fontFamily: "serif", fontSize: 12, fontWeight: "bold", fill: 0xFFFFFF }));
      initial.anchor.set(0.5, 0.5);
      initial.position.set(28, ly + rowH / 2);
      this.diplomacyPanel.addChild(initial);

      // Faction name + leader
      const factionName = new Text(
        `${targetPlayer.factionDef.name} — ${targetPlayer.factionDef.leader}`,
        makeStyle(12, TEXT_COLOR, true)
      );
      factionName.x = 46;
      factionName.y = ly + 4;
      this.diplomacyPanel.addChild(factionName);

      // Relation status
      let relationColor = TEXT_COLOR;
      if (dipEntry.relation === "war") relationColor = 0xCC3333;
      else if (dipEntry.relation === "alliance") relationColor = 0x44AA44;
      else relationColor = 0xCCAA33;

      const relationText = new Text(
        dipEntry.relation.toUpperCase(),
        makeStyle(11, relationColor, true)
      );
      relationText.x = 46;
      relationText.y = ly + 20;
      this.diplomacyPanel.addChild(relationText);

      // Attitude bar
      const attNorm = (dipEntry.attitude + 100) / 200; // -100..100 → 0..1
      let attColor = 0xCC3333;
      if (attNorm > 0.6) attColor = 0x44AA44;
      else if (attNorm > 0.35) attColor = 0xCCAA33;

      drawBar(bg, 46, ly + 36, 120, 8, attNorm, attColor);
      const attLabel = new Text(`Attitude: ${dipEntry.attitude}`, makeStyle(9, TEXT_COLOR));
      attLabel.x = 170;
      attLabel.y = ly + 33;
      this.diplomacyPanel.addChild(attLabel);

      // Chivalry rating
      const chivText = new Text(
        `Chivalry: ${targetPlayer.chivalry}`,
        makeStyle(10, ACCENT)
      );
      chivText.x = 260;
      chivText.y = ly + 33;
      this.diplomacyPanel.addChild(chivText);

      // Action buttons
      const btnX = pw - 160;
      if (dipEntry.relation === "peace") {
        drawButton(this.diplomacyPanel, btnX, ly + 6, 100, 20, "Declare War", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("declare_war", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
        drawButton(this.diplomacyPanel, btnX, ly + 30, 100, 20, "Form Alliance", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("form_alliance", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
        // Trade route button
        drawButton(this.diplomacyPanel, btnX + 110, ly + 6, 70, 20, "Trade", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("trade", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
      } else if (dipEntry.relation === "war") {
        drawButton(this.diplomacyPanel, btnX, ly + 6, 100, 20, "Offer Peace", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("offer_peace", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
      } else if (dipEntry.relation === "alliance") {
        drawButton(this.diplomacyPanel, btnX, ly + 6, 100, 20, "Break Alliance", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("break_alliance", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
        drawButton(this.diplomacyPanel, btnX, ly + 30, 100, 20, "Declare War", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("declare_war", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
        // Trade route button (alliance)
        drawButton(this.diplomacyPanel, btnX + 110, ly + 6, 70, 20, "Trade", () => {
          if (this.onDiplomacyAction) this.onDiplomacyAction("trade", dipEntry.targetPlayer);
          this.hideDiplomacyPanel();
        });
      }

      ly += rowH + 6;
    }

    // Scroll up
    drawButton(this.diplomacyPanel, pw - 60, ph - 28, 25, 22, "▲", () => {
      this.diploScrollOffset = Math.max(0, this.diploScrollOffset - 3);
      this.showDiplomacyPanel(state);
    });
    // Scroll down
    drawButton(this.diplomacyPanel, pw - 30, ph - 28, 25, 22, "▼", () => {
      this.diploScrollOffset += 3;
      this.showDiplomacyPanel(state);
    });

    // Close button
    drawButton(this.diplomacyPanel, pw - 150, ph - 35, 70, 26, "Close", () => {
      this.hideDiplomacyPanel();
    });
  }

  hideDiplomacyPanel(): void {
    this.diplomacyPanel.visible = false;
    for (const c of this.diplomacyPanel.removeChildren()) c.destroy();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7b. CHIVALRY EVENT DIALOG (overlay)
  // ══════════════════════════════════════════════════════════════════════════

  showEventDialog(event: { id: string; name: string; description: string; choices: { label: string; chivalryChange: number; goldChange?: number; cultureChange?: number }[] }): void {
    for (const c of this.eventDialog.removeChildren()) c.destroy();
    this.eventDialogGfx = new Graphics();
    this.eventDialog.addChild(this.eventDialogGfx);

    const pw = 420, ph = 250;
    const px = (this.sw - pw) / 2, py = (this.sh - ph) / 2;
    drawPanel(this.eventDialogGfx, px, py, pw, ph);

    // Title
    const title = new Text(event.name, STYLE_TITLE);
    title.x = px + 15; title.y = py + 10;
    this.eventDialog.addChild(title);

    // Description
    const desc = new Text(event.description, new TextStyle({ fontFamily: "serif", fontSize: 13, fill: 0xE8D5B5, wordWrap: true, wordWrapWidth: pw - 30 }));
    desc.x = px + 15; desc.y = py + 40;
    this.eventDialog.addChild(desc);

    // Choice buttons
    let cy = py + 110;
    event.choices.forEach((choice, idx) => {
      let label = choice.label;
      if (choice.chivalryChange > 0) label += ` (+${choice.chivalryChange})`;
      else if (choice.chivalryChange < 0) label += ` (${choice.chivalryChange})`;
      if (choice.goldChange) label += choice.goldChange > 0 ? ` (Gold+${choice.goldChange})` : ` (Gold${choice.goldChange})`;

      drawButton(this.eventDialog, px + 15, cy, pw - 30, 28, label, () => {
        if (this.onEventChoice) this.onEventChoice(event.id, idx);
        this.hideEventDialog();
      });
      cy += 35;
    });

    this.eventDialog.visible = true;
  }

  hideEventDialog(): void {
    this.eventDialog.visible = false;
    for (const c of this.eventDialog.removeChildren()) c.destroy();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CIVILOPEDIA / HELP OVERLAY
  // ══════════════════════════════════════════════════════════════════════════

  showHelpPanel(): void {
    for (const c of this.helpPanel.removeChildren()) c.destroy();
    this.helpPanel.visible = true;
    this.helpPanel.zIndex = 60;

    const pw = 600, ph = 500;
    const px = (this.sw - pw) / 2, py = (this.sh - ph) / 2;
    this.helpPanel.x = px;
    this.helpPanel.y = py;

    // Backdrop
    const bd = new Graphics();
    bd.rect(-px, -py, this.sw, this.sh);
    bd.fill({ color: 0x000000, alpha: 0.5 });
    bd.eventMode = "static";
    this.helpPanel.addChild(bd);

    const bg = new Graphics();
    drawPanel(bg, 0, 0, pw, ph);
    this.helpPanel.addChild(bg);

    const title = new Text("\u269C Arthurian Civilopedia \u269C", STYLE_TITLE);
    title.anchor.set(0.5, 0);
    title.x = pw / 2; title.y = 12;
    this.helpPanel.addChild(title);

    const sections = [
      { header: "Controls", text: "WASD/Arrows: Pan camera\nScroll: Zoom\nClick: Select unit/city\nEnter: End turn\nT: Tech tree\nD: Diplomacy\nB: Build menu\nH: Recruit hero\nF: Fortify\nSpace: Skip unit\nEsc: Close panels\nF5: Quick save  |  F9: Quick load" },
      { header: "Victory Conditions", text: "Conquest: Eliminate all other factions\nHoly Grail: Build the Holy Grail wonder\nRound Table: Alliance with all living factions\nSurvival: Highest score at turn 200" },
      { header: "Chivalry", text: "Your chivalry rating (-100 to 100) affects:\n\u2022 City happiness (+2 if >60, -2 if <20)\n\u2022 Diplomacy (AI trusts chivalrous leaders)\n\u2022 Mordred's Rebellion (triggers if <30 and 5+ cities)\nRandom events let you choose chivalrous or pragmatic actions." },
      { header: "Heroes", text: "Recruit heroes for 100 gold at your capital.\nEach hero has unique abilities:\n\u2022 Merlin: Teleport, Prophecy (reveal map), Lightning\n\u2022 Lancelot: Charge (2x damage), Inspire (+2 ATK nearby)\n\u2022 Morgana: Curse (-3 DEF enemies), Heal nearby allies\n\u2022 Tristan: Stealth (+3 movement)" },
      { header: "Workers", text: "Workers build improvements on tiles:\n\u2022 Farm (3 turns): +2 food\n\u2022 Mine (4 turns): +2 production\n\u2022 Road (2 turns): +1 gold\n\u2022 Lumber Camp (3 turns): +1 production\n\u2022 Pasture (3 turns): +1 food, +1 production\n\u2022 Holy Shrine (5 turns): +2 culture" },
      { header: "Wonders", text: "Excalibur: +3 attack all units\nRound Table: +2 happiness all cities\nHoly Grail: +10 happiness (win condition!)\nAvalon: Heal all units 2 HP/turn\nGreat Library: +5 research/turn\nStonehenge: +3 research/turn\nSword in Stone: +3 happiness all cities" },
    ];

    let ly = 40;
    for (const s of sections) {
      if (ly > ph - 40) break;
      const h = new Text(s.header, makeStyle(13, ACCENT, true));
      h.x = 15; h.y = ly;
      this.helpPanel.addChild(h);
      ly += 17;
      const t = new Text(s.text, new TextStyle({ fontFamily: "serif", fontSize: 11, fill: TEXT_COLOR, wordWrap: true, wordWrapWidth: pw - 40, lineHeight: 14 }));
      t.x = 15; t.y = ly;
      this.helpPanel.addChild(t);
      ly += t.height + 10;
    }

    drawButton(this.helpPanel, pw / 2 - 40, ph - 38, 80, 28, "Close", () => {
      this.hideHelpPanel();
    });
  }

  hideHelpPanel(): void {
    this.helpPanel.visible = false;
    for (const c of this.helpPanel.removeChildren()) c.destroy();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 8. END TURN BUTTON
  // ══════════════════════════════════════════════════════════════════════════

  private buildEndTurnButton(): void {
    this.endTurnBtn = new Container();
    this.endTurnBtn.zIndex = 10;
    this.endTurnBtn.x = this.sw - 160;
    this.endTurnBtn.y = this.sh - 65;

    const W = 150, H = 50;

    const bg = new Graphics();
    // Shadow
    bg.roundRect(3, 3, W, H, 8);
    bg.fill({ color: 0x000000, alpha: 0.4 });
    // Main golden parchment body
    bg.roundRect(0, 0, W, H, 8);
    bg.fill({ color: 0x8B7355 });
    // Inner lighter area
    bg.roundRect(4, 4, W - 8, H - 8, 6);
    bg.fill({ color: 0xAA9470, alpha: 0.7 });
    // Top highlight
    bg.roundRect(4, 4, W - 8, H * 0.35, 6);
    bg.fill({ color: 0xC4A265, alpha: 0.4 });
    // Outer gold border
    bg.roundRect(0, 0, W, H, 8);
    bg.stroke({ color: ACCENT, width: 2.5 });
    // Inner border
    bg.roundRect(3, 3, W - 6, H - 6, 6);
    bg.stroke({ color: 0xD4B275, alpha: 0.4, width: 1 });
    // Corner flourishes
    for (const [cx, cy] of [[10, 10], [W - 10, 10], [10, H - 10], [W - 10, H - 10]]) {
      bg.circle(cx, cy, 2.5);
      bg.fill({ color: ACCENT, alpha: 0.6 });
    }
    this.endTurnBtn.addChild(bg);

    // Shield/crest icon
    const shield = new Text("⚜", new TextStyle({ fontSize: 14, fill: 0x2A1F14 }));
    shield.anchor.set(0.5, 0.5);
    shield.x = 18; shield.y = H / 2;
    this.endTurnBtn.addChild(shield);

    const label = new Text("END TURN", new TextStyle({ fontFamily: "serif", fontSize: 17, fontWeight: "bold", fill: 0x2A1F14, letterSpacing: 2 }));
    label.anchor.set(0.5, 0.5);
    label.x = W / 2 + 5; label.y = H / 2 - 5;
    this.endTurnBtn.addChild(label);

    const hint = new Text("Enter ↵", makeStyle(9, 0x5A4A38));
    hint.anchor.set(0.5, 0);
    hint.x = W / 2 + 5; hint.y = H / 2 + 8;
    this.endTurnBtn.addChild(hint);

    this.endTurnBtn.eventMode = "static";
    this.endTurnBtn.cursor = "pointer";
    this.endTurnBtn.on("pointerover", () => { bg.tint = 0xEEDDCC; label.style.fill = 0x1A0F04; });
    this.endTurnBtn.on("pointerout", () => { bg.tint = 0xFFFFFF; label.style.fill = 0x2A1F14; });
    this.endTurnBtn.on("pointerdown", () => { bg.tint = 0xBBAA99; if (this.onEndTurn) this.onEndTurn(); setTimeout(() => { bg.tint = 0xFFFFFF; }, 120); });

    this.container.addChild(this.endTurnBtn);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 9. EVENT LOG
  // ══════════════════════════════════════════════════════════════════════════

  private buildEventLog(): void {
    this.eventLog = new Container();
    this.eventLog.zIndex = 6;

    this.eventLogGfx = new Graphics();
    this.eventLog.addChild(this.eventLogGfx);

    this.container.addChild(this.eventLog);
  }

  private updateEventLog(state: CivGameState): void {
    for (const c of this.eventLog.removeChildren()) c.destroy();
    this.eventLogGfx = new Graphics();
    this.eventLog.addChild(this.eventLogGfx);

    const logW = 400;
    const logH = 80;
    const logX = (this.sw - logW) / 2;
    const logY = this.sh - logH - 8;

    // If unit panel is visible, shift the event log to the left
    const unitPanelVisible = this.unitPanel.visible;
    this.eventLog.x = unitPanelVisible ? 195 : logX;
    this.eventLog.y = logY;

    drawPanel(this.eventLogGfx, 0, 0, logW, logH);

    // Filter events visible to human player
    const visibleEvents = state.events.filter(
      (e) => e.player === -1 || e.player === state.humanPlayerIndex
    );

    // Show last 5
    const recentEvents = visibleEvents.slice(-5).reverse();
    let ey = 4;

    for (const evt of recentEvents) {
      if (ey > logH - 14) break;

      const turnTag = `[T${evt.turn}] `;
      const evtText = new Text(
        turnTag + evt.message,
        makeStyle(10, TEXT_COLOR)
      );
      evtText.x = 6;
      evtText.y = ey;
      // Clip text to panel width
      if (evtText.width > logW - 12) {
        evtText.style.wordWrapWidth = logW - 12;
      }
      this.eventLog.addChild(evtText);
      ey += 14;
    }

    if (recentEvents.length === 0) {
      const emptyText = new Text("No events yet.", makeStyle(10, 0x777766));
      emptyText.x = 6;
      emptyText.y = 4;
      this.eventLog.addChild(emptyText);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 10. NOTIFICATION BANNER
  // ══════════════════════════════════════════════════════════════════════════

  private buildNotificationBanner(): void {
    this.notificationBanner = new Container();
    this.notificationBanner.zIndex = 40;
    this.notificationBanner.visible = false;

    const bg = new Graphics();
    bg.roundRect(0, 0, 500, 40, 8);
    bg.fill({ color: PANEL_BG, alpha: 0.95 });
    bg.roundRect(0, 0, 500, 40, 8);
    bg.stroke({ color: ACCENT, width: 2 });
    // Side flourishes
    bg.moveTo(15, 20); bg.lineTo(25, 15); bg.lineTo(25, 25); bg.closePath();
    bg.fill({ color: ACCENT, alpha: 0.5 });
    bg.moveTo(485, 20); bg.lineTo(475, 15); bg.lineTo(475, 25); bg.closePath();
    bg.fill({ color: ACCENT, alpha: 0.5 });
    this.notificationBanner.addChild(bg);

    this.notificationText = new Text("", makeStyle(14, 0xFFD700, true));
    this.notificationText.anchor.set(0.5, 0.5);
    this.notificationText.x = 250;
    this.notificationText.y = 20;
    this.notificationBanner.addChild(this.notificationText);

    this.container.addChild(this.notificationBanner);
  }

  showNotification(message: string): void {
    this.notificationQueue.push(message);
    if (this.notificationTimer <= 0) {
      this._showNextNotification();
    }
  }

  private _showNextNotification(): void {
    if (this.notificationQueue.length === 0) {
      this.notificationBanner.visible = false;
      return;
    }
    const msg = this.notificationQueue.shift()!;
    this.notificationText.text = msg;
    this.notificationBanner.visible = true;
    this.notificationBanner.alpha = 1;
    this.notificationBanner.x = (this.sw - 500) / 2;
    this.notificationBanner.y = 50;
    this.notificationTimer = 120; // 2 seconds (faster to cycle through queue)
    this.notificationAlpha = 1;
  }

  private updateNotification(): void {
    if (this.notificationTimer > 0) {
      this.notificationTimer--;
      if (this.notificationTimer < 40) {
        this.notificationAlpha = this.notificationTimer / 40;
        this.notificationBanner.alpha = this.notificationAlpha;
      }
      if (this.notificationTimer <= 0) {
        this._showNextNotification(); // show next in queue
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 11. VICTORY SCREEN (full overlay)
  // ══════════════════════════════════════════════════════════════════════════

  showVictoryScreen(type: string, score: number): void {
    for (const c of this.victoryScreen.removeChildren()) c.destroy();
    this.victoryScreen.visible = true;
    this.victoryScreen.zIndex = 100;
    this.victoryScreen.x = 0;
    this.victoryScreen.y = 0;

    // Full-screen backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, this.sw, this.sh);
    backdrop.fill({ color: 0x000000, alpha: 0.75 });
    backdrop.eventMode = "static";
    this.victoryScreen.addChild(backdrop);

    // Central panel
    const panelW = 500;
    const panelH = 340;
    const panelX = (this.sw - panelW) / 2;
    const panelY = (this.sh - panelH) / 2;

    const bg = new Graphics();
    drawPanel(bg, panelX, panelY, panelW, panelH);
    // Ornate inner border
    bg.roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 4);
    bg.stroke({ color: ACCENT, alpha: 0.5, width: 1 });
    this.victoryScreen.addChild(bg);

    // Determine if victory or defeat
    const isVictory = type !== "defeat" && type !== "elimination";

    // Title
    const titleText = isVictory ? "VICTORY!" : "DEFEAT";
    const titleColor = isVictory ? 0xFFD700 : 0xCC3333;
    const titleStyle = new TextStyle({
      fontFamily: "serif",
      fontSize: 48,
      fill: titleColor,
      fontWeight: "bold",
      dropShadow: {
        color: 0x000000,
        distance: 3,
        angle: Math.PI / 4,
        blur: 4,
      },
    });
    const title = new Text(titleText, titleStyle);
    title.anchor.set(0.5, 0);
    title.x = this.sw / 2;
    title.y = panelY + 30;
    this.victoryScreen.addChild(title);

    // Victory type
    const typeDisplay = this.formatVictoryType(type);
    const typeText = new Text(typeDisplay, makeStyle(22, TEXT_COLOR, true));
    typeText.anchor.set(0.5, 0);
    typeText.x = this.sw / 2;
    typeText.y = panelY + 100;
    this.victoryScreen.addChild(typeText);

    // Score
    const scoreText = new Text(`Final Score: ${score}`, makeStyle(18, ACCENT, true));
    scoreText.anchor.set(0.5, 0);
    scoreText.x = this.sw / 2;
    scoreText.y = panelY + 140;
    this.victoryScreen.addChild(scoreText);

    // Decorative separator
    bg.moveTo(panelX + 40, panelY + 180);
    bg.lineTo(panelX + panelW - 40, panelY + 180);
    bg.stroke({ color: ACCENT, alpha: 0.6, width: 1 });

    // Flavor text
    const flavorTexts: Record<string, string> = {
      domination: "Through sword and valor, all kingdoms kneel before you.",
      conquest: "Through sword and valor, all kingdoms kneel before you.",
      round_table: "All knights gather at the Round Table \u2014 the realm is united in peace.",
      survival: "Two hundred turns have passed. Your kingdom endures through the ages.",
      cultural: "Your culture shines as a beacon across the realm.",
      scientific: "The arcane mysteries of the world lay bare before your scholars.",
      diplomatic: "Through wisdom and cunning, you have united the kingdoms in peace.",
      grail: "The Holy Grail is found! The land is healed and prospers.",
      wonder: "Your magnificent wonders stand as testaments to eternal glory.",
      defeat: "Your kingdom has fallen. The legends will remember your name.",
      elimination: "Your armies have been scattered, your cities taken.",
    };
    const flavor = flavorTexts[type] ?? "The age of legends draws to a close.";
    const flavorStyle = new TextStyle({
      fontFamily: "serif",
      fontSize: 13,
      fill: TEXT_COLOR,
      fontStyle: "italic",
      wordWrap: true,
      wordWrapWidth: panelW - 80,
      align: "center",
    });
    const flavorText = new Text(flavor, flavorStyle);
    flavorText.anchor.set(0.5, 0);
    flavorText.x = this.sw / 2;
    flavorText.y = panelY + 195;
    this.victoryScreen.addChild(flavorText);

    // Stats breakdown
    if (this.lastState) {
      const human = this.lastState.players[this.lastState.humanPlayerIndex];
      if (human) {
        let sy = panelY + 230;
        const stats = [
          `Turns Played: ${this.lastState.turn}`,
          `Cities: ${human.cityIds.length}  |  Units: ${human.unitIds.length}`,
          `Technologies: ${human.techs.length}  |  Wonders: ${human.wonders.length}`,
          `Gold: ${Math.floor(human.gold)}  |  Chivalry: ${human.chivalry}`,
          `Heroes: ${human.heroes.length}`,
        ];
        for (const line of stats) {
          const st = new Text(line, makeStyle(12, TEXT_COLOR));
          st.anchor.set(0.5, 0);
          st.x = this.sw / 2; st.y = sy;
          this.victoryScreen.addChild(st);
          sy += 17;
        }
      }
    }

    // Return to Menu button
    drawButton(
      this.victoryScreen,
      this.sw / 2 - 75, panelY + panelH - 60,
      150, 36,
      "Return to Menu",
      () => { if (this.onExitGame) this.onExitGame(); }
    );
  }

  private formatVictoryType(type: string): string {
    const labels: Record<string, string> = {
      domination: "Domination Victory",
      conquest: "Conquest Victory",
      round_table: "Round Table Victory",
      survival: "Survival Victory",
      cultural: "Cultural Victory",
      scientific: "Scientific Victory",
      diplomatic: "Diplomatic Victory",
      grail: "Holy Grail Victory",
      wonder: "Wonder Victory",
      defeat: "Kingdom Fallen",
      elimination: "Eliminated",
    };
    return labels[type] ?? `${type.charAt(0).toUpperCase() + type.slice(1)} Victory`;
  }

}
