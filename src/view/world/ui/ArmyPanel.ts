// Army management panel for world mode.
//
// Shows army composition and movement range when an army is selected.
// Rendered as a PixiJS panel on the left side of the screen.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xcccccc,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
});

const BORDER = 0x555577;
const PANEL_W = 240;

// ---------------------------------------------------------------------------
// ArmyPanel
// ---------------------------------------------------------------------------

export class ArmyPanel {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _army: WorldArmy | null = null;
  private _state: WorldState | null = null;
  private _contentContainer = new Container();

  /** Currently selected army ID (for movement targeting). */
  selectedArmyId: string | null = null;

  /** Called when the player wants to move the army. */
  onMove: ((armyId: string) => void) | null = null;
  /** Called when the panel should close. */
  onClose: (() => void) | null = null;
  /** Called to deploy garrison from city. */
  onDeploy: ((armyId: string) => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(army: WorldArmy, state: WorldState): void {
    this._army = army;
    this._state = state;
    this.selectedArmyId = army.id;
    this.container.visible = true;
    this._rebuild();
  }

  hide(): void {
    this.container.visible = false;
    this._army = null;
    this._state = null;
    this.selectedArmyId = null;
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

    const army = this._army!;

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, 300, 8);
    bg.fill({ color: 0x0a0a20, alpha: 0.92 });
    bg.stroke({ color: BORDER, width: 1.5 });
    this._contentContainer.addChild(bg);

    let y = 12;

    // Close button
    const closeBtn = _makeButton("X", PANEL_W - 30, 8, 20, 20, () => {
      this.onClose?.();
    });
    this._contentContainer.addChild(closeBtn);

    // Title
    const title = new Text({
      text: army.isGarrison ? "Garrison" : "Army",
      style: TITLE_STYLE,
    });
    title.x = 12;
    title.y = y;
    this._contentContainer.addChild(title);
    y += 24;

    // Info
    const total = armyUnitCount(army);
    const mpText = army.isGarrison
      ? ""
      : `  MP: ${army.movementPoints}/${army.maxMovementPoints}`;
    const infoText = new Text({
      text: `Units: ${total}${mpText}`,
      style: INFO_STYLE,
    });
    infoText.x = 12;
    infoText.y = y;
    this._contentContainer.addChild(infoText);
    y += 20;

    // Unit stacks
    let power = 0;
    for (const u of army.units) {
      const def = UNIT_DEFINITIONS[u.unitType as keyof typeof UNIT_DEFINITIONS];
      const unitCost = def?.cost ?? 100;
      power += u.count * unitCost;

      const uText = new Text({
        text: `  ${u.unitType} x${u.count}`,
        style: INFO_STYLE,
      });
      uText.x = 12;
      uText.y = y;
      this._contentContainer.addChild(uText);
      y += 16;
    }

    // Power score
    const powerText = new Text({
      text: `Power: ${power}`,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "bold",
        fill: 0xffaa44,
      }),
    });
    powerText.x = 12;
    powerText.y = y;
    this._contentContainer.addChild(powerText);
    y += 22;

    // Move button (only for non-garrison armies with MP remaining)
    if (!army.isGarrison && army.movementPoints > 0) {
      const moveBtn = _makeButton("MOVE", 12, y, PANEL_W - 24, 26, () => {
        this.onMove?.(army.id);
      });
      this._contentContainer.addChild(moveBtn);
      y += 32;
    }

    // Deploy button (for garrison armies)
    if (army.isGarrison && army.units.length > 0) {
      const deployBtn = _makeButton("DEPLOY ALL", 12, y, PANEL_W - 24, 26, () => {
        this.onDeploy?.(army.id);
      });
      this._contentContainer.addChild(deployBtn);
      y += 32;
    }

    // Position panel on left side, below HUD
    this._contentContainer.x = 10;
    this._contentContainer.y = 64;

    this.container.addChild(this._contentContainer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeButton(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: () => void,
): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, 4);
  bg.fill({ color: 0x222244 });
  bg.stroke({ color: BORDER, width: 1 });
  btn.addChild(bg);

  const txt = new Text({ text: label, style: BTN_STYLE });
  txt.x = 6;
  txt.y = (h - txt.height) / 2;
  btn.addChild(txt);

  btn.position.set(x, y);
  btn.on("pointerdown", onClick);

  return btn;
}

/** Singleton instance. */
export const armyPanel = new ArmyPanel();
