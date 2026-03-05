// Tech tree / research screen for world mode.
//
// Two tabs: TECHNOLOGY (normal tech tree) and MAGIC (per-school tier research).

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import { currentPlayer } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import {
  allResearchDefs,
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const TECH_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
});

const BORDER = 0x555577;

const BRANCH_COLORS: Record<string, number> = {
  military: 0xcc4444,
  magic: 0x8844cc,
  economic: 0x44aa44,
  siege: 0xaa8833,
};

const TAB_ACTIVE_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fontWeight: "bold", fill: 0xffcc44,
});
const TAB_INACTIVE_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fontWeight: "bold", fill: 0x888899,
});

// ---------------------------------------------------------------------------
// ResearchScreen
// ---------------------------------------------------------------------------

export class ResearchScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _state: WorldState | null = null;
  private _contentContainer = new Container();
  private _activeTab: "tech" | "magic" = "tech";

  /** Called when a tech is selected for research. */
  onResearchSelected: ((researchId: string) => void) | null = null;
  /** Called when a magic school tier is selected for research. */
  onMagicResearchSelected: ((school: string, tier: number) => void) | null = null;
  /** Called when the screen should close. */
  onClose: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(state: WorldState): void {
    this._state = state;
    this.container.visible = true;
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
    const screenW = this._vm.screenWidth;
    const screenH = this._vm.screenHeight;

    // Fullscreen backdrop
    const bg = new Graphics();
    bg.rect(0, 0, screenW, screenH);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._contentContainer.addChild(bg);

    // Title
    const title = new Text({ text: "RESEARCH", style: TITLE_STYLE });
    title.x = (screenW - title.width) / 2;
    title.y = 20;
    this._contentContainer.addChild(title);

    // Close button
    this._contentContainer.addChild(this._makeCloseButton(screenW - 40, 10));

    // Tab buttons
    this._addTabs(screenW);

    // Research status
    this._addResearchStatus(screenW, player);

    // Tab content
    if (this._activeTab === "tech") {
      this._buildTechTab(player, screenW);
    } else {
      this._buildMagicTab(player, screenW);
    }

    this.container.addChild(this._contentContainer);
  }

  // -----------------------------------------------------------------------
  // Tabs
  // -----------------------------------------------------------------------

  private _addTabs(screenW: number): void {
    const tabY = 48;
    const centerX = screenW / 2;

    const techTab = this._makeTab("TECHNOLOGY", centerX - 100, tabY, this._activeTab === "tech", () => {
      this._activeTab = "tech";
      this._rebuild();
    });
    this._contentContainer.addChild(techTab);

    const magicTab = this._makeTab("MAGIC", centerX + 20, tabY, this._activeTab === "magic", () => {
      this._activeTab = "magic";
      this._rebuild();
    });
    this._contentContainer.addChild(magicTab);
  }

  private _makeTab(label: string, x: number, y: number, active: boolean, onClick: () => void): Container {
    const c = new Container();
    const txt = new Text({ text: label, style: active ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE });
    c.addChild(txt);

    if (active) {
      const underline = new Graphics();
      underline.rect(0, 18, txt.width, 2);
      underline.fill({ color: 0xffcc44 });
      c.addChild(underline);
    }

    if (!active) {
      c.eventMode = "static";
      c.cursor = "pointer";
      c.on("pointerdown", onClick);
    }

    c.position.set(x, y);
    return c;
  }

  // -----------------------------------------------------------------------
  // Research status
  // -----------------------------------------------------------------------

  private _addResearchStatus(screenW: number, player: WorldPlayer): void {
    const parts: string[] = [];

    if (player.activeResearch) {
      parts.push(`Tech: ${player.activeResearch} (${player.researchTurnsLeft}t)`);
    }
    if (player.activeMagicResearch) {
      const { school, tier } = player.activeMagicResearch;
      const cost = magicTierCost(tier);
      const remaining = cost - player.magicResearchProgress;
      const perTurn = player.magicResearchRatio;
      const turnsLeft = perTurn > 0 ? Math.ceil(remaining / perTurn) : 999;
      const label = MAGIC_SCHOOL_LABELS[school] ?? school;
      parts.push(`Magic: ${label} ${tier} (${turnsLeft}t)`);
    }

    const ratio = Math.round(player.magicResearchRatio * 100);
    parts.push(`Split: ${100 - ratio}% Science / ${ratio}% Magic`);

    if (parts.length > 0) {
      const statusText = new Text({
        text: parts.join("  |  "),
        style: TECH_STYLE,
      });
      statusText.x = (screenW - statusText.width) / 2;
      statusText.y = 68;
      this._contentContainer.addChild(statusText);
    }
  }

  // -----------------------------------------------------------------------
  // Tech tab
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
      header.y = 92;
      this._contentContainer.addChild(header);

      let y = 117;
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
  // Magic tab
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

    const startY = 92;
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

        // Tier label
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

        // Cost / status
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
  // Shared
  // -----------------------------------------------------------------------

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
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xffffff,
      }),
    });
    txt.x = 6; txt.y = 3;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.onClose?.());
    return btn;
  }
}

/** Singleton instance. */
export const researchScreen = new ResearchScreen();
