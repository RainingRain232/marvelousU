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
  military: 0xcc4444, magic: 0x8844cc, economic: 0x44aa44, siege: 0xaa8833,
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
    const branches = ["military", "magic", "economic", "siege"];
    const available = new Set(
      getPlayerAvailableResearch(player).map((d) => d.id),
    );

    const colW = Math.floor((screenW - 60) / branches.length);
    let colX = 30;

    const nodePositions = new Map<string, { x: number; y: number; w: number }>();

    for (const branch of branches) {
      const branchDefs = allResearchDefs().filter((d) => d.branch === branch);
      const color = BRANCH_COLORS[branch] ?? 0x888888;

      const header = new Text({
        text: branch.toUpperCase(),
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 13, fontWeight: "bold", fill: color,
        }),
      });
      header.x = colX + 10;
      header.y = 56;
      this._contentContainer.addChild(header);

      let y = 80;
      const nodeW = colW - 10;
      for (const def of branchDefs) {
        nodePositions.set(def.id, { x: colX, y, w: nodeW });
        const node = this._createTechNode(def, colX, y, nodeW, player, available.has(def.id));
        this._contentContainer.addChild(node);
        y += 70;
      }

      colX += colW;
    }

    // Prerequisite lines
    const lines = new Graphics();
    for (const def of allResearchDefs()) {
      const toPos = nodePositions.get(def.id);
      if (!toPos) continue;

      for (const prereqId of def.prerequisites) {
        const fromPos = nodePositions.get(prereqId);
        if (!fromPos) continue;

        const completed = player.completedResearch.has(prereqId);
        const lineColor = completed ? 0x44aa44 : 0x444466;

        lines.moveTo(fromPos.x + fromPos.w / 2, fromPos.y + 60);
        lines.lineTo(toPos.x + toPos.w / 2, toPos.y);
        lines.stroke({ color: lineColor, width: completed ? 2 : 1, alpha: 0.7 });
      }
    }
    this._contentContainer.addChildAt(lines, 1);
  }

  private _createTechNode(
    def: ResearchDef, x: number, y: number, w: number,
    player: WorldPlayer, isAvailable: boolean,
  ): Container {
    const c = new Container();
    const completed = player.completedResearch.has(def.id);
    const isActive = player.activeResearch === def.id;

    let fillColor = 0x1a1a2e;
    let borderColor = BORDER;
    if (completed) {
      fillColor = 0x1a3a1a; borderColor = 0x44aa44;
    } else if (isActive) {
      fillColor = 0x2a2a1a; borderColor = 0xaaaa44;
    } else if (isAvailable) {
      fillColor = 0x1a1a3a; borderColor = 0x4466cc;
    }

    const bg = new Graphics();
    bg.roundRect(0, 0, w, 60, 6);
    bg.fill({ color: fillColor, alpha: 0.9 });
    bg.stroke({ color: borderColor, width: completed ? 2 : 1 });
    c.addChild(bg);

    const name = new Text({ text: def.name, style: TECH_STYLE });
    name.x = 8; name.y = 6;
    c.addChild(name);

    const turns = new Text({
      text: completed ? "DONE" : isActive ? `${player.researchTurnsLeft}t` : `${def.turnsToComplete}t`,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: completed ? 0x44aa44 : 0xaaaaaa,
      }),
    });
    turns.x = w - turns.width - 8; turns.y = 6;
    c.addChild(turns);

    const descStyle = new TextStyle({
      fontFamily: "monospace", fontSize: 9, fill: 0xaaaaaa, wordWrap: true, wordWrapWidth: w - 16,
    });
    const desc = new Text({ text: def.description, style: descStyle });
    desc.x = 8; desc.y = 24;
    c.addChild(desc);

    if (isAvailable && !completed && !isActive) {
      c.eventMode = "static";
      c.cursor = "pointer";
      c.on("pointerdown", () => this.onResearchSelected?.(def.id));
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
