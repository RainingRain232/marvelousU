// Tech tree / research screen for world mode.
//
// Shows available and completed technologies in a tree layout.
// Player can select one tech to research per turn.

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
  setActiveResearch,
  getPlayerAvailableResearch,
} from "@world/systems/ResearchSystem";

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

const DESC_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0xaaaaaa,
  wordWrap: true,
  wordWrapWidth: 140,
});

const BORDER = 0x555577;

// Branch colors
const BRANCH_COLORS: Record<string, number> = {
  military: 0xcc4444,
  magic: 0x8844cc,
  economic: 0x44aa44,
  siege: 0xaa8833,
};

// ---------------------------------------------------------------------------
// ResearchScreen
// ---------------------------------------------------------------------------

export class ResearchScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _state: WorldState | null = null;
  private _contentContainer = new Container();

  /** Called when a tech is selected for research. */
  onResearchSelected: ((researchId: string) => void) | null = null;
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

    // Current research status
    if (player.activeResearch) {
      const statusText = new Text({
        text: `Researching: ${player.activeResearch} (${player.researchTurnsLeft} turns left)`,
        style: TECH_STYLE,
      });
      statusText.x = (screenW - statusText.width) / 2;
      statusText.y = 50;
      this._contentContainer.addChild(statusText);
    }

    // Close button
    const closeBtn = this._makeCloseButton(screenW - 40, 10);
    this._contentContainer.addChild(closeBtn);

    // Render techs grouped by branch
    const branches = ["military", "magic", "economic", "siege"];
    const available = new Set(
      getPlayerAvailableResearch(player).map((d) => d.id),
    );

    const colW = Math.floor((screenW - 60) / branches.length);
    let colX = 30;

    // Track node positions for prerequisite lines
    const nodePositions = new Map<string, { x: number; y: number; w: number }>();

    for (const branch of branches) {
      const branchDefs = allResearchDefs().filter((d) => d.branch === branch);
      const color = BRANCH_COLORS[branch] ?? 0x888888;

      // Branch header
      const header = new Text({
        text: branch.toUpperCase(),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: "bold",
          fill: color,
        }),
      });
      header.x = colX + 10;
      header.y = 80;
      this._contentContainer.addChild(header);

      let y = 105;
      const nodeW = colW - 10;
      for (const def of branchDefs) {
        nodePositions.set(def.id, { x: colX, y, w: nodeW });
        const node = this._createTechNode(
          def,
          colX,
          y,
          nodeW,
          player,
          available.has(def.id),
        );
        this._contentContainer.addChild(node);
        y += 70;
      }

      colX += colW;
    }

    // Draw prerequisite lines
    const lines = new Graphics();
    for (const def of allResearchDefs()) {
      const toPos = nodePositions.get(def.id);
      if (!toPos) continue;

      for (const prereqId of def.prerequisites) {
        const fromPos = nodePositions.get(prereqId);
        if (!fromPos) continue;

        const completed = player.completedResearch.has(prereqId);
        const lineColor = completed ? 0x44aa44 : 0x444466;

        const fromX = fromPos.x + fromPos.w / 2;
        const fromY = fromPos.y + 60; // bottom of node
        const toX = toPos.x + toPos.w / 2;
        const toY = toPos.y; // top of node

        lines.moveTo(fromX, fromY);
        lines.lineTo(toX, toY);
        lines.stroke({ color: lineColor, width: completed ? 2 : 1, alpha: 0.7 });
      }
    }
    this._contentContainer.addChildAt(lines, 1); // behind nodes but above bg

    this.container.addChild(this._contentContainer);
  }

  private _createTechNode(
    def: ResearchDef,
    x: number,
    y: number,
    w: number,
    player: WorldPlayer,
    isAvailable: boolean,
  ): Container {
    const c = new Container();
    const completed = player.completedResearch.has(def.id);
    const isActive = player.activeResearch === def.id;

    let fillColor = 0x1a1a2e;
    let borderColor = BORDER;
    if (completed) {
      fillColor = 0x1a3a1a;
      borderColor = 0x44aa44;
    } else if (isActive) {
      fillColor = 0x2a2a1a;
      borderColor = 0xaaaa44;
    } else if (isAvailable) {
      fillColor = 0x1a1a3a;
      borderColor = 0x4466cc;
    }

    const bg = new Graphics();
    bg.roundRect(0, 0, w, 60, 6);
    bg.fill({ color: fillColor, alpha: 0.9 });
    bg.stroke({ color: borderColor, width: completed ? 2 : 1 });
    c.addChild(bg);

    // Tech name
    const name = new Text({ text: def.name, style: TECH_STYLE });
    name.x = 8;
    name.y = 6;
    c.addChild(name);

    // Turns
    const turns = new Text({
      text: completed ? "DONE" : isActive ? `${player.researchTurnsLeft}t` : `${def.turnsToComplete}t`,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: completed ? 0x44aa44 : 0xaaaaaa,
      }),
    });
    turns.x = w - turns.width - 8;
    turns.y = 6;
    c.addChild(turns);

    // Description
    const desc = new Text({ text: def.description, style: DESC_STYLE });
    desc.x = 8;
    desc.y = 24;
    c.addChild(desc);

    // Click to research
    if (isAvailable && !completed && !isActive) {
      c.eventMode = "static";
      c.cursor = "pointer";
      c.on("pointerdown", () => {
        this.onResearchSelected?.(def.id);
      });
    }

    c.position.set(x, y);
    return c;
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
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0xffffff,
      }),
    });
    txt.x = 6;
    txt.y = 3;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.onClose?.());

    return btn;
  }
}

/** Singleton instance. */
export const researchScreen = new ResearchScreen();
