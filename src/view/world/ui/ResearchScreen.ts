// Research screen for world mode.
//
// Three views:
//   1. Overview (default) — three columns with portraits:
//      Left: Merlin (Magic) — last magic research + button to magic tree
//      Center: Arthur — current research status
//      Right: Man (Science) — last normal research + button to tech tree
//   2. Tech tree — normal research branches
//   3. Magic tree — per-school tier research

import {
  Container, Graphics, Text, TextStyle, Sprite, Assets, Texture,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import { currentPlayer } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { calculateCityYields } from "@world/systems/WorldEconomySystem";
import {
  allResearchDefs,
  getResearchDef,
  type ResearchDef,
} from "@world/config/ResearchDefs";
import {
  getPlayerAvailableResearch,
} from "@world/systems/ResearchSystem";
import {
  MAGIC_SCHOOLS,
  MAGIC_SCHOOL_LABELS,
  MAGIC_SCHOOL_COLORS,
  getMaxSchoolTier,
  magicTierCost,
} from "@world/config/MagicResearchDefs";

import merlinImgUrl from "@/img/merlin.png";
import arthurImgUrl from "@/img/arthur.png";
import manImgUrl from "@/img/man.png";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 20, fontWeight: "bold", fill: 0xffcc44,
});

const TECH_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xffffff,
});

const BORDER = 0x555577;

const BRANCH_COLORS: Record<string, number> = {
  military: 0xcc4444, magic: 0x8844cc, economic: 0x44aa44, siege: 0xaa8833, buildings: 0x6688cc,
};

// ---------------------------------------------------------------------------
// ResearchScreen
// ---------------------------------------------------------------------------

type ScreenView = "overview" | "tech" | "magic";

export class ResearchScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _state: WorldState | null = null;
  private _contentContainer = new Container();
  private _view: ScreenView = "overview";

  onResearchSelected: ((researchId: string) => void) | null = null;
  onMagicResearchSelected: ((school: string, tier: number) => void) | null = null;
  onClose: (() => void) | null = null;

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
    void Assets.load([merlinImgUrl, arthurImgUrl, manImgUrl]);
  }

  show(state: WorldState): void {
    this._state = state;
    this.container.visible = true;
    this._view = "overview";
    this._rebuild();
  }

  hide(): void {
    this.container.visible = false;
    this._state = null;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(): void {
    this._contentContainer.removeFromParent();
    this._contentContainer.destroy({ children: true });
    this._contentContainer = new Container();

    const state = this._state!;
    const player = currentPlayer(state);
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._contentContainer.addChild(bg);

    // Title
    const titleText = this._view === "tech" ? "TECHNOLOGY TREE"
      : this._view === "magic" ? "MAGIC RESEARCH" : "RESEARCH";
    const title = new Text({ text: titleText, style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 20;
    this._contentContainer.addChild(title);

    // Close button
    this._contentContainer.addChild(this._makeCloseButton(sw - 40, 10));

    if (this._view === "overview") {
      this._buildOverview(player, sw, sh);
    } else if (this._view === "tech") {
      this._buildTechTab(player, sw);
      this._contentContainer.addChild(this._makeBackButton(20, 10));
    } else {
      this._buildMagicTab(player, sw);
      this._contentContainer.addChild(this._makeBackButton(20, 10));
    }

    this.container.addChild(this._contentContainer);
  }

  // -----------------------------------------------------------------------
  // Overview — three columns with portraits
  // -----------------------------------------------------------------------

  private _buildOverview(player: WorldPlayer, sw: number, sh: number): void {
    const colW = Math.floor(sw / 3);
    const centerY = 70;

    // --- LEFT: Merlin / Magic ---
    this._buildOverviewColumn(
      0, centerY, colW, sh,
      merlinImgUrl, "MAGIC", 0x8844cc,
      this._getLastMagicResearchText(player),
      this._getMagicStatusText(player),
      "VIEW MAGIC TREE",
      () => { this._view = "magic"; this._rebuild(); },
    );

    // --- CENTER: Arthur / Current ---
    this._buildCenterColumn(player, colW, centerY, colW, sh);

    // --- RIGHT: Man / Science ---
    this._buildOverviewColumn(
      colW * 2, centerY, colW, sh,
      manImgUrl, "SCIENCE", 0x44aa44,
      this._getLastNormalResearchText(player),
      this._getNormalStatusText(player),
      "VIEW TECH TREE",
      () => { this._view = "tech"; this._rebuild(); },
    );
  }

  private _buildOverviewColumn(
    x: number, y: number, w: number, _sh: number,
    imgUrl: string, label: string, color: number,
    lastResearch: string, statusText: string,
    btnLabel: string, onBtnClick: () => void,
  ): void {
    const cx = x + w / 2;

    // Column background
    const colBg = new Graphics();
    colBg.roundRect(x + 10, y, w - 20, 340, 8);
    colBg.fill({ color: 0x0a0a1e, alpha: 0.6 });
    colBg.stroke({ color, width: 1, alpha: 0.4 });
    this._contentContainer.addChild(colBg);

    // Label
    const labelText = new Text({
      text: label,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fontWeight: "bold", fill: color }),
    });
    labelText.x = cx - labelText.width / 2;
    labelText.y = y + 12;
    this._contentContainer.addChild(labelText);

    // Portrait
    const imgSize = 120;
    const imgY = y + 40;
    void Assets.load(imgUrl).then((tex: Texture) => {
      if (!this.container.visible) return;
      const sprite = new Sprite(tex);
      const scale = imgSize / Math.max(tex.width, tex.height);
      sprite.scale.set(scale);
      sprite.x = cx - (tex.width * scale) / 2;
      sprite.y = imgY;
      // Circular mask
      const mask = new Graphics();
      mask.circle(cx, imgY + imgSize / 2, imgSize / 2);
      mask.fill({ color: 0xffffff });
      sprite.mask = mask;
      this._contentContainer.addChild(mask);
      this._contentContainer.addChild(sprite);
    });

    // Portrait circle border
    const ring = new Graphics();
    ring.circle(cx, imgY + imgSize / 2, imgSize / 2 + 2);
    ring.stroke({ color, width: 2 });
    this._contentContainer.addChild(ring);

    // Last research
    const lastLabel = new Text({
      text: "Last Researched:",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x888899 }),
    });
    lastLabel.x = cx - lastLabel.width / 2;
    lastLabel.y = imgY + imgSize + 16;
    this._contentContainer.addChild(lastLabel);

    const lastText = new Text({
      text: lastResearch,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 11, fontWeight: "bold", fill: 0xffffff,
        wordWrap: true, wordWrapWidth: w - 60,
      }),
    });
    lastText.x = cx - lastText.width / 2;
    lastText.y = imgY + imgSize + 30;
    this._contentContainer.addChild(lastText);

    // Status
    const status = new Text({
      text: statusText,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: 0xaaaacc,
        wordWrap: true, wordWrapWidth: w - 60,
      }),
    });
    status.x = cx - status.width / 2;
    status.y = imgY + imgSize + 52;
    this._contentContainer.addChild(status);

    // Button
    const btn = this._makeActionButton(btnLabel, cx, y + 290, color, onBtnClick);
    this._contentContainer.addChild(btn);
  }

  private _buildCenterColumn(player: WorldPlayer, x: number, y: number, w: number, sh: number): void {
    const cx = x + w / 2;
    const color = 0xffcc44;

    // Column background — taller to fit slider + flavor
    const colH = Math.min(sh - y - 20, 480);
    const colBg = new Graphics();
    colBg.roundRect(x + 10, y, w - 20, colH, 8);
    colBg.fill({ color: 0x0a0a1e, alpha: 0.6 });
    colBg.stroke({ color, width: 1, alpha: 0.4 });
    this._contentContainer.addChild(colBg);

    // Label
    const labelText = new Text({
      text: "CURRENT",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fontWeight: "bold", fill: color }),
    });
    labelText.x = cx - labelText.width / 2;
    labelText.y = y + 12;
    this._contentContainer.addChild(labelText);

    // Portrait
    const imgSize = 100;
    const imgY = y + 36;
    void Assets.load(arthurImgUrl).then((tex: Texture) => {
      if (!this.container.visible) return;
      const sprite = new Sprite(tex);
      const scale = imgSize / Math.max(tex.width, tex.height);
      sprite.scale.set(scale);
      sprite.x = cx - (tex.width * scale) / 2;
      sprite.y = imgY;
      const mask = new Graphics();
      mask.circle(cx, imgY + imgSize / 2, imgSize / 2);
      mask.fill({ color: 0xffffff });
      sprite.mask = mask;
      this._contentContainer.addChild(mask);
      this._contentContainer.addChild(sprite);
    });

    const ring = new Graphics();
    ring.circle(cx, imgY + imgSize / 2, imgSize / 2 + 2);
    ring.stroke({ color, width: 2 });
    this._contentContainer.addChild(ring);

    // Science income per turn
    let infoY = imgY + imgSize + 12;

    let scienceIncome = 0;
    const state = this._state!;
    for (const city of state.cities.values()) {
      if (city.owner !== player.id) continue;
      const yields = calculateCityYields(city, state);
      scienceIncome += yields.science;
    }

    const sciIncomeText = new Text({
      text: `Research Income: +${scienceIncome}/turn`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fontWeight: "bold", fill: 0x44aa44 }),
    });
    sciIncomeText.x = cx - sciIncomeText.width / 2;
    sciIncomeText.y = infoY;
    this._contentContainer.addChild(sciIncomeText);
    infoY += 20;

    // Normal research
    const sciLabel = new Text({
      text: "Science:",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: 0x44aa44 }),
    });
    sciLabel.x = cx - sciLabel.width / 2;
    sciLabel.y = infoY;
    this._contentContainer.addChild(sciLabel);
    infoY += 14;

    const sciStatus = player.activeResearch
      ? `${_formatName(player.activeResearch)} (${player.researchTurnsLeft}t)`
      : "None";
    const sciText = new Text({
      text: sciStatus,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffffff }),
    });
    sciText.x = cx - sciText.width / 2;
    sciText.y = infoY;
    this._contentContainer.addChild(sciText);
    infoY += 18;

    // Magic research
    const magLabel = new Text({
      text: "Magic:",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: 0x8844cc }),
    });
    magLabel.x = cx - magLabel.width / 2;
    magLabel.y = infoY;
    this._contentContainer.addChild(magLabel);
    infoY += 14;

    let magStatus = "None";
    if (player.activeMagicResearch) {
      const { school, tier } = player.activeMagicResearch;
      const cost = magicTierCost(tier);
      const remaining = cost - player.magicResearchProgress;
      const perTurn = player.magicResearchRatio;
      const turnsLeft = perTurn > 0 ? Math.ceil(remaining / perTurn) : 999;
      magStatus = `${MAGIC_SCHOOL_LABELS[school] ?? school} T${tier} (${turnsLeft}t)`;
    }
    const magText = new Text({
      text: magStatus,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffffff }),
    });
    magText.x = cx - magText.width / 2;
    magText.y = infoY;
    this._contentContainer.addChild(magText);
    infoY += 24;

    // --- Research allocation slider ---
    const sliderW = w - 80;
    const sliderX = x + 40;
    const sliderY = infoY;

    const allocLabel = new Text({
      text: "RESEARCH ALLOCATION",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fontWeight: "bold", fill: 0xaaaacc }),
    });
    allocLabel.x = cx - allocLabel.width / 2;
    allocLabel.y = sliderY;
    this._contentContainer.addChild(allocLabel);

    const ratio = player.magicResearchRatio;
    const sciPct = Math.round((1 - ratio) * 100);
    const magPct = Math.round(ratio * 100);

    const splitValue = new Text({
      text: `Science ${sciPct}%  /  Magic ${magPct}%`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: 0xffcc44 }),
    });
    splitValue.x = cx - splitValue.width / 2;
    splitValue.y = sliderY + 14;
    this._contentContainer.addChild(splitValue);

    const trackY = sliderY + 32;

    // Track
    const track = new Graphics();
    track.roundRect(sliderX, trackY, sliderW, 10, 5);
    track.fill({ color: 0x222244 });
    track.stroke({ color: 0x444466, width: 1 });
    this._contentContainer.addChild(track);

    // Science fill (left, green)
    const sciFillW = sliderW * (1 - ratio);
    if (sciFillW > 0) {
      const sciFill = new Graphics();
      sciFill.roundRect(sliderX + 1, trackY + 1, Math.max(0, sciFillW - 2), 8, 4);
      sciFill.fill({ color: 0x44aa44, alpha: 0.5 });
      this._contentContainer.addChild(sciFill);
    }

    // Magic fill (right, purple)
    const magFillW = sliderW * ratio;
    if (magFillW > 0) {
      const magFill = new Graphics();
      magFill.roundRect(sliderX + sliderW - magFillW + 1, trackY + 1, Math.max(0, magFillW - 2), 8, 4);
      magFill.fill({ color: 0x8844cc, alpha: 0.5 });
      this._contentContainer.addChild(magFill);
    }

    // Handle
    const handleX = sliderX + sliderW * ratio;
    const handle = new Graphics();
    handle.circle(0, 0, 8);
    handle.fill({ color: 0xffcc44 });
    handle.stroke({ color: 0xffffff, width: 1.5 });
    handle.position.set(handleX, trackY + 5);
    this._contentContainer.addChild(handle);

    // Interactive hit area
    const hitArea = new Graphics();
    hitArea.rect(sliderX - 10, trackY - 14, sliderW + 20, 38);
    hitArea.fill({ color: 0x000000, alpha: 0.01 });
    hitArea.eventMode = "static";
    hitArea.cursor = "pointer";

    let dragging = false;
    const updateSlider = (globalX: number) => {
      const localX = Math.max(0, Math.min(sliderW, globalX - sliderX));
      const newRatio = Math.round((localX / sliderW) * 20) / 20; // 5% increments
      player.magicResearchRatio = Math.max(0, Math.min(1, newRatio));
      this._rebuild();
    };

    hitArea.on("pointerdown", (e) => { dragging = true; updateSlider(e.global.x); });
    hitArea.on("pointermove", (e) => { if (dragging) updateSlider(e.global.x); });
    hitArea.on("pointerup", () => { dragging = false; });
    hitArea.on("pointerupoutside", () => { dragging = false; });
    this._contentContainer.addChild(hitArea);

    // Labels under slider
    const sciSliderLabel = new Text({
      text: "Sci",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 8, fill: 0x44aa44 }),
    });
    sciSliderLabel.x = sliderX;
    sciSliderLabel.y = trackY + 14;
    this._contentContainer.addChild(sciSliderLabel);

    const magSliderLabel = new Text({
      text: "Mag",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 8, fill: 0x8844cc }),
    });
    magSliderLabel.x = sliderX + sliderW - magSliderLabel.width;
    magSliderLabel.y = trackY + 14;
    this._contentContainer.addChild(magSliderLabel);

    // Flavor text
    const flavorY = trackY + 32;
    const flavor = new Text({
      text: "\"Even the most gifted mages\nmust occasionally turn their\nminds to mundane science\n\u2014 lest their towers collapse\nfrom poor engineering.\"",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 9, fill: 0x666688, fontStyle: "italic",
        wordWrap: true, wordWrapWidth: w - 60,
      }),
    });
    flavor.x = cx - flavor.width / 2;
    flavor.y = flavorY;
    this._contentContainer.addChild(flavor);
  }

  // -----------------------------------------------------------------------
  // Helper text for overview
  // -----------------------------------------------------------------------

  private _getLastMagicResearchText(player: WorldPlayer): string {
    let lastSchool = "";
    let lastTier = 0;
    for (const [school, tier] of player.completedMagicResearch) {
      if (tier > lastTier || (tier === lastTier && !lastSchool)) {
        lastSchool = school;
        lastTier = tier;
      }
    }
    if (!lastSchool) return "None";
    return `${MAGIC_SCHOOL_LABELS[lastSchool] ?? lastSchool} Tier ${lastTier}`;
  }

  private _getMagicStatusText(player: WorldPlayer): string {
    const total = [...player.completedMagicResearch.values()].reduce((a, b) => a + b, 0);
    return `${total} school tiers researched`;
  }

  private _getLastNormalResearchText(player: WorldPlayer): string {
    // Find the most recently completed research (last in the set)
    let lastId = "";
    for (const id of player.completedResearch) {
      lastId = id;
    }
    if (!lastId) return "None";
    const def = getResearchDef(lastId);
    return def ? def.name : _formatName(lastId);
  }

  private _getNormalStatusText(player: WorldPlayer): string {
    return `${player.completedResearch.size} technologies researched`;
  }

  // -----------------------------------------------------------------------
  // Tech tree view
  // -----------------------------------------------------------------------

  private _buildTechTab(player: WorldPlayer, screenW: number): void {
    const available = new Set(
      getPlayerAvailableResearch(player).map((d) => d.id),
    );

    // Left-to-right tree layout: 7 grid columns, rows grouped by branch
    // Eras span multiple columns for a cleaner layout
    const TECH_POS: Record<string, { col: number; row: number }> = {
      // Economic (rows 0-2)
      agriculture: { col: 0, row: 0 },
      masonry: { col: 0, row: 2 },
      trade: { col: 1, row: 0 },
      scholarship: { col: 1, row: 1 },
      banking: { col: 2, row: 0 },
      sea_travel: { col: 2, row: 1 },
      industrialization: { col: 3, row: 0 },
      // Military — melee (row 3)
      bronze_working: { col: 0, row: 3 },
      iron_working: { col: 1, row: 3 },
      steel_working: { col: 2, row: 3 },
      mithril_forging: { col: 3, row: 3 },
      adamantine_craft: { col: 4, row: 3 },
      legendary_arms: { col: 6, row: 3 },
      // Military — ranged (row 4)
      improved_bows: { col: 1, row: 4 },
      advanced_archery: { col: 2, row: 4 },
      expert_archery: { col: 3, row: 4 },
      master_archery: { col: 4, row: 4 },
      legendary_ranged: { col: 6, row: 4 },
      // Military — cavalry (row 5)
      cavalry_tactics: { col: 2, row: 5 },
      cavalry_mastery: { col: 3, row: 5 },
      heavy_cavalry: { col: 4, row: 5 },
      legendary_cavalry: { col: 6, row: 5 },
      // Siege (rows 6-7)
      siege_engineering: { col: 1, row: 6 },
      siege_craft: { col: 2, row: 6 },
      advanced_siege: { col: 3, row: 6 },
      heavy_artillery: { col: 4, row: 6 },
      legendary_siege: { col: 6, row: 6 },
      // Magic (rows 7-8)
      arcane_study: { col: 0, row: 7 },
      conjuration: { col: 1, row: 7 },
      high_sorcery: { col: 2, row: 7 },
      archmage_arts: { col: 3, row: 7 },
      divine_blessing: { col: 1, row: 8 },
      // Buildings (rows 9-11)
      basic_fortification: { col: 0, row: 9 },
      arcane_construction: { col: 0, row: 10 },
      horsemanship: { col: 1, row: 9 },
      siege_construction: { col: 1, row: 10 },
      faction_construction: { col: 2, row: 9 },
      holy_construction: { col: 1, row: 11 },
      beast_construction: { col: 2, row: 10 },
      elite_hall: { col: 3, row: 10 },
      elite_warfare: { col: 4, row: 9 },
      elite_siege_works: { col: 4, row: 10 },
      elite_arcanum: { col: 4, row: 11 },
    };

    const NUM_COLS = 7;
    // Eras span multiple grid columns
    const ERA_SPANS: { label: string; color: number; startCol: number; endCol: number }[] = [
      { label: "DAWN", color: 0x888866, startCol: 0, endCol: 0 },
      { label: "EARLY", color: 0x886644, startCol: 1, endCol: 1 },
      { label: "MIDDLE", color: 0x886644, startCol: 2, endCol: 3 },
      { label: "ADVANCED", color: 0xaa6633, startCol: 4, endCol: 5 },
      { label: "LEGENDARY", color: 0xcc6644, startCol: 6, endCol: 6 },
    ];
    const BRANCH_LABELS: { label: string; color: number; rows: number[] }[] = [
      { label: "ECONOMY", color: 0x44aa44, rows: [0, 1, 2] },
      { label: "MILITARY", color: 0xcc4444, rows: [3, 4, 5] },
      { label: "SIEGE", color: 0xaa8833, rows: [6] },
      { label: "MAGIC", color: 0x8844cc, rows: [7, 8] },
      { label: "BUILDINGS", color: 0x6688cc, rows: [9, 10, 11] },
    ];
    const TOTAL_ROWS = 12;

    // Layout constants — scrollable container
    const marginL = 80;
    const marginT = 56;
    const nodeW = Math.min(130, Math.floor((screenW - marginL - 40) / NUM_COLS) - 10);
    const nodeH = 56;
    const colGap = 8;
    const rowGap = 6;
    const colStep = nodeW + colGap;
    const rowStep = nodeH + rowGap;

    // Scrollable content container
    const scrollContent = new Container();
    this._contentContainer.addChild(scrollContent);

    // Era headers — each era spans one or more columns
    for (const era of ERA_SPANS) {
      const x1 = marginL + era.startCol * colStep;
      const x2 = marginL + era.endCol * colStep + nodeW;
      const cx = (x1 + x2) / 2;
      const eraLabel = new Text({
        text: era.label,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 8, fontWeight: "bold", fill: era.color, letterSpacing: 1,
        }),
      });
      eraLabel.x = cx - eraLabel.width / 2;
      eraLabel.y = marginT - 4;
      scrollContent.addChild(eraLabel);
    }

    // Era separator lines (between era groups)
    for (let i = 1; i < ERA_SPANS.length; i++) {
      const sepCol = ERA_SPANS[i].startCol;
      const sx = marginL + sepCol * colStep - colGap / 2;
      const sep = new Graphics();
      sep.moveTo(sx, marginT + 10);
      sep.lineTo(sx, marginT + TOTAL_ROWS * rowStep + 4);
      sep.stroke({ color: 0x222244, width: 1, alpha: 0.4 });
      scrollContent.addChildAt(sep, 0);
    }

    // Branch labels on left margin
    for (const branch of BRANCH_LABELS) {
      const midRow = branch.rows[Math.floor(branch.rows.length / 2)];
      const by = marginT + 14 + midRow * rowStep + (branch.rows.length * rowStep) / 2 - rowStep / 2;
      const bLabel = new Text({
        text: branch.label,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 8, fontWeight: "bold", fill: branch.color, letterSpacing: 1,
        }),
      });
      bLabel.rotation = -Math.PI / 2;
      bLabel.x = 14;
      bLabel.y = by + bLabel.width / 2;
      scrollContent.addChild(bLabel);

      // Branch lane background
      const laneY = marginT + 10 + branch.rows[0] * rowStep - 4;
      const laneH = branch.rows.length * rowStep + 4;
      const lane = new Graphics();
      lane.roundRect(marginL - 6, laneY, NUM_COLS * colStep + 8, laneH, 4);
      lane.fill({ color: branch.color, alpha: 0.04 });
      lane.stroke({ color: branch.color, width: 1, alpha: 0.1 });
      scrollContent.addChildAt(lane, 0);
    }

    // Branch divider lines
    const dividerRows = [2.5, 5.5, 6.5, 8.5];
    for (const dr of dividerRows) {
      const dy = marginT + 10 + dr * rowStep;
      const divider = new Graphics();
      divider.moveTo(30, dy);
      divider.lineTo(marginL + NUM_COLS * colStep, dy);
      divider.stroke({ color: 0x333355, width: 1, alpha: 0.3 });
      scrollContent.addChildAt(divider, 0);
    }

    // Compute node pixel positions
    const nodePixelPos = new Map<string, { x: number; y: number }>();

    for (const [techId, pos] of Object.entries(TECH_POS)) {
      const px = marginL + pos.col * colStep;
      const py = marginT + 14 + pos.row * rowStep;
      nodePixelPos.set(techId, { x: px, y: py });
    }

    // Draw prerequisite connections (bezier curves)
    const lines = new Graphics();
    for (const def of allResearchDefs()) {
      const toPos = nodePixelPos.get(def.id);
      if (!toPos) continue;

      for (const prereqId of def.prerequisites) {
        const fromPos = nodePixelPos.get(prereqId);
        if (!fromPos) continue;

        const completed = player.completedResearch.has(prereqId) && player.completedResearch.has(def.id);
        const prereqDone = player.completedResearch.has(prereqId);
        const lineColor = completed ? 0x44aa44 : prereqDone ? 0x668844 : 0x333355;
        const lineWidth = completed ? 2.5 : prereqDone ? 1.5 : 1;

        const x1 = fromPos.x + nodeW;
        const y1 = fromPos.y + nodeH / 2;
        const x2 = toPos.x;
        const y2 = toPos.y + nodeH / 2;
        const cpx = (x1 + x2) / 2;

        lines.moveTo(x1, y1);
        lines.bezierCurveTo(cpx, y1, cpx, y2, x2, y2);
        lines.stroke({ color: lineColor, width: lineWidth, alpha: 0.7 });

        // Arrowhead
        const arrowSize = 4;
        lines.moveTo(x2, y2);
        lines.lineTo(x2 - arrowSize * 2, y2 - arrowSize);
        lines.lineTo(x2 - arrowSize * 2, y2 + arrowSize);
        lines.closePath();
        lines.fill({ color: lineColor, alpha: 0.7 });
      }
    }
    scrollContent.addChildAt(lines, 0);

    // Draw tech nodes
    for (const def of allResearchDefs()) {
      const pos = nodePixelPos.get(def.id);
      if (!pos) continue;
      const node = this._createTechNode(def, pos.x, pos.y, nodeW, nodeH, player, available.has(def.id));
      scrollContent.addChild(node);
    }

    // Enable vertical scrolling if content exceeds screen
    const sh = this._vm.screenHeight;
    const totalH = marginT + 14 + TOTAL_ROWS * rowStep + 20;
    if (totalH > sh) {
      scrollContent.eventMode = "static";
      const bgHit = new Graphics();
      bgHit.rect(0, 0, screenW, sh);
      bgHit.fill({ color: 0x000000, alpha: 0.01 });
      bgHit.eventMode = "static";
      scrollContent.addChildAt(bgHit, 0);

      let scrollY = 0;
      const maxScroll = totalH - sh + 40;
      scrollContent.on("wheel", (e: WheelEvent) => {
        scrollY = Math.max(-maxScroll, Math.min(0, scrollY - e.deltaY));
        scrollContent.y = scrollY;
      });
    }
  }

  private _createTechNode(
    def: ResearchDef, x: number, y: number, w: number, h: number,
    player: WorldPlayer, isAvailable: boolean,
  ): Container {
    const c = new Container();
    const completed = player.completedResearch.has(def.id);
    const isActive = player.activeResearch === def.id;
    const branchColor = BRANCH_COLORS[def.branch] ?? 0x888888;

    // Status-based colors
    let fillColor = 0x12121e;
    let borderColor = 0x333344;
    let nameColor = 0x666688;
    if (completed) {
      fillColor = 0x0f2a0f; borderColor = 0x44aa44; nameColor = 0xccffcc;
    } else if (isActive) {
      fillColor = 0x2a2a0f; borderColor = 0xffaa22; nameColor = 0xffffcc;
    } else if (isAvailable) {
      fillColor = 0x0f0f2a; borderColor = 0x4488ff; nameColor = 0xffffff;
    }

    // Card background with colored left accent
    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 5);
    bg.fill({ color: fillColor, alpha: 0.95 });
    bg.stroke({ color: borderColor, width: completed ? 2 : 1.5 });
    c.addChild(bg);

    // Branch color accent bar on left
    const accent = new Graphics();
    accent.roundRect(0, 0, 4, h, 5);
    accent.fill({ color: branchColor, alpha: completed ? 0.9 : 0.5 });
    c.addChild(accent);

    // Tech name
    const name = new Text({
      text: def.name,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: nameColor }),
    });
    name.x = 10; name.y = 4;
    c.addChild(name);

    // Turns / status badge
    let statusText = `${def.turnsToComplete}t`;
    let statusColor = 0x888888;
    if (completed) { statusText = "\u2713"; statusColor = 0x44ff44; }
    else if (isActive) { statusText = `${player.researchTurnsLeft}t`; statusColor = 0xffaa22; }
    const status = new Text({
      text: statusText,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: completed ? 14 : 9, fontWeight: "bold", fill: statusColor,
      }),
    });
    status.x = w - status.width - 6; status.y = completed ? 1 : 5;
    c.addChild(status);

    // Unlocks summary
    const unlockStrs: string[] = [];
    for (const u of def.unlocks) {
      if (u.type === "building") {
        unlockStrs.push(_formatName(u.value));
      } else if (u.type === "unit_tier") {
        unlockStrs.push(u.value.replace("_", " T"));
      } else if (u.type === "spell_tier") {
        unlockStrs.push(`Spells T${u.value}`);
      }
    }
    const unlockText = unlockStrs.length > 0 ? unlockStrs.join(", ") : "";
    if (unlockText) {
      const unlock = new Text({
        text: unlockText,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 8, fill: completed ? 0x66aa66 : 0x8888aa,
          wordWrap: true, wordWrapWidth: w - 16,
        }),
      });
      unlock.x = 10; unlock.y = 18;
      c.addChild(unlock);
    }

    // Progress bar (active research only)
    if (isActive && def.turnsToComplete > 0) {
      const progress = 1 - (player.researchTurnsLeft / def.turnsToComplete);
      const barW = w - 16;
      const barH = 6;
      const barY = h - barH - 5;
      const barBg = new Graphics();
      barBg.roundRect(8, barY, barW, barH, 3);
      barBg.fill({ color: 0x222233 });
      c.addChild(barBg);
      if (progress > 0) {
        const barFill = new Graphics();
        barFill.roundRect(8, barY, Math.max(4, barW * progress), barH, 3);
        barFill.fill({ color: 0xffaa22 });
        c.addChild(barFill);
      }
    }

    // Description tooltip area (show description text below unlocks)
    const descY = unlockText ? 32 : 18;
    if (descY + 10 < h) {
      const desc = new Text({
        text: def.description,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 7, fill: 0x666688,
          wordWrap: true, wordWrapWidth: w - 16,
        }),
      });
      desc.x = 10; desc.y = descY;
      c.addChild(desc);
    }

    // Interaction
    if (isAvailable && !completed && !isActive) {
      c.eventMode = "static";
      c.cursor = "pointer";
      c.on("pointerdown", () => this.onResearchSelected?.(def.id));
      c.on("pointerover", () => {
        bg.clear();
        bg.roundRect(0, 0, w, h, 5);
        bg.fill({ color: 0x1a1a44, alpha: 0.95 });
        bg.stroke({ color: 0x6699ff, width: 2 });
      });
      c.on("pointerout", () => {
        bg.clear();
        bg.roundRect(0, 0, w, h, 5);
        bg.fill({ color: fillColor, alpha: 0.95 });
        bg.stroke({ color: borderColor, width: 1.5 });
      });
    }

    c.position.set(x, y);
    return c;
  }

  // -----------------------------------------------------------------------
  // Magic tree view
  // -----------------------------------------------------------------------

  private _buildMagicTab(player: WorldPlayer, screenW: number): void {
    const visibleSchools = MAGIC_SCHOOLS.filter(
      (s) => getMaxSchoolTier(player.raceId, s) > 0,
    );

    if (visibleSchools.length === 0) {
      const noMagic = new Text({
        text: "This race has no magic schools available.",
        style: TECH_STYLE,
      });
      noMagic.x = (screenW - noMagic.width) / 2;
      noMagic.y = 120;
      this._contentContainer.addChild(noMagic);
      return;
    }

    const startY = 56;
    const colW = Math.max(60, Math.min(90, Math.floor((screenW - 40) / visibleSchools.length)));
    const totalW = colW * visibleSchools.length;
    const startX = Math.max(20, (screenW - totalW) / 2);
    const nodeH = 36;
    const nodeGap = 6;

    for (let si = 0; si < visibleSchools.length; si++) {
      const school = visibleSchools[si];
      const maxTier = getMaxSchoolTier(player.raceId, school);
      const completedTier = player.completedMagicResearch.get(school) ?? 0;
      const isActiveSchool = player.activeMagicResearch?.school === school;
      const activeTier = isActiveSchool ? player.activeMagicResearch!.tier : -1;
      const color = MAGIC_SCHOOL_COLORS[school] ?? 0x888888;
      const label = MAGIC_SCHOOL_LABELS[school] ?? school;
      const colX = startX + si * colW;

      // Column header
      const header = new Text({
        text: label,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: color,
        }),
      });
      header.x = colX + (colW - header.width) / 2;
      header.y = startY;
      this._contentContainer.addChild(header);

      // Tier nodes
      for (let tier = 1; tier <= maxTier; tier++) {
        const ny = startY + 20 + (tier - 1) * (nodeH + nodeGap);
        const nx = colX + 4;
        const nw = colW - 8;

        const isCompleted = tier <= completedTier;
        const isActive = tier === activeTier;
        const isAvailable = tier === completedTier + 1 && !player.activeMagicResearch;

        let fillColor = 0x1a1a2e;
        let borderColor = 0x333344;
        if (isCompleted) {
          fillColor = 0x1a3a1a; borderColor = 0x44aa44;
        } else if (isActive) {
          fillColor = 0x2a2a1a; borderColor = 0xaaaa44;
        } else if (isAvailable) {
          fillColor = 0x1a1a3a; borderColor = 0x4466cc;
        }

        const node = new Container();
        const nodeBg = new Graphics();
        nodeBg.roundRect(0, 0, nw, nodeH, 4);
        nodeBg.fill({ color: fillColor, alpha: 0.9 });
        nodeBg.stroke({ color: borderColor, width: isCompleted ? 2 : 1 });
        node.addChild(nodeBg);

        const tierLabel = new Text({
          text: `T${tier}`,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 10, fontWeight: "bold",
            fill: isCompleted ? 0x44aa44 : isActive ? 0xaaaa44 : 0xcccccc,
          }),
        });
        tierLabel.x = (nw - tierLabel.width) / 2;
        tierLabel.y = 3;
        node.addChild(tierLabel);

        const cost = magicTierCost(tier);
        let statusStr = `${cost}t`;
        if (isCompleted) {
          statusStr = "DONE";
        } else if (isActive) {
          const remaining = cost - player.magicResearchProgress;
          const perTurn = player.magicResearchRatio;
          const tLeft = perTurn > 0 ? Math.ceil(remaining / perTurn) : 999;
          statusStr = `${tLeft}t`;
        }

        const statusLabel = new Text({
          text: statusStr,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 8,
            fill: isCompleted ? 0x44aa44 : 0x888888,
          }),
        });
        statusLabel.x = (nw - statusLabel.width) / 2;
        statusLabel.y = 18;
        node.addChild(statusLabel);

        if (isAvailable) {
          node.eventMode = "static";
          node.cursor = "pointer";
          node.on("pointerdown", () => this.onMagicResearchSelected?.(school, tier));
        }

        node.position.set(nx, ny);
        this._contentContainer.addChild(node);
      }

      // Vertical connector line
      if (maxTier > 1) {
        const lineX = colX + colW / 2;
        const lineY1 = startY + 20 + nodeH;
        const lineY2 = startY + 20 + (maxTier - 1) * (nodeH + nodeGap);
        const line = new Graphics();
        line.moveTo(lineX, lineY1);
        line.lineTo(lineX, lineY2);
        line.stroke({ color: 0x333355, width: 1, alpha: 0.5 });
        this._contentContainer.addChildAt(line, 1);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Buttons
  // -----------------------------------------------------------------------

  private _makeActionButton(label: string, cx: number, y: number, color: number, onClick: () => void): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bw = 160;
    const bh = 30;
    const bg = new Graphics();
    bg.roundRect(0, 0, bw, bh, 5);
    bg.fill({ color: 0x151530 });
    bg.stroke({ color, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fontWeight: "bold", fill: color }),
    });
    txt.x = (bw - txt.width) / 2;
    txt.y = (bh - txt.height) / 2;
    btn.addChild(txt);

    btn.position.set(cx - bw / 2, y);
    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(0, 0, bw, bh, 5);
      bg.fill({ color: 0x222255 });
      bg.stroke({ color, width: 2 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.roundRect(0, 0, bw, bh, 5);
      bg.fill({ color: 0x151530 });
      bg.stroke({ color, width: 1.5 });
    });

    return btn;
  }

  private _makeBackButton(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 60, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: BORDER, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "< BACK",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fontWeight: "bold", fill: 0xcccccc }),
    });
    txt.x = 8; txt.y = 4;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => {
      this._view = "overview";
      this._rebuild();
    });
    return btn;
  }

  private _makeCloseButton(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 24, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: BORDER, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "X",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xffffff }),
    });
    txt.x = 6; txt.y = 3;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.onClose?.());
    return btn;
  }
}

function _formatName(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Singleton instance. */
export const researchScreen = new ResearchScreen();
