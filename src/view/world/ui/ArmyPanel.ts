// Army management panel for world mode.
//
// Shows army composition and movement range when an army is selected.
// Rendered as a PixiJS panel on the left side of the screen.

import { Container, Graphics, Text, TextStyle, Sprite } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy, ArmyUnit } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { IMPROVEMENT_DEFINITIONS, type ImprovementType } from "@world/config/ResourceDefs";
import { UnitType, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";

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
  /** Called to build an improvement at the army's location. */
  onBuildImprovement: ((armyId: string, improvement: ImprovementType) => void) | null = null;
  /** Called to found a city at the army's location. */
  onFoundCity: ((armyId: string) => void) | null = null;
  /** Check function for city founding eligibility. */
  canFoundCityCheck: ((army: WorldArmy, state: WorldState) => boolean) | null = null;
  /** Called when the player wants to conjure with a mage in the army. */
  onConjure: ((armyId: string) => void) | null = null;
  /** Called when the player renames the army. */
  onRename: ((armyId: string, newName: string) => void) | null = null;
  /** Called when the player splits the army. */
  onSplit: ((armyId: string, units: ArmyUnit[]) => void) | null = null;
  /** Called when the player merges with another army. */
  onMerge: ((armyId: string, targetArmyId: string) => void) | null = null;

  /** Split mode state. */
  private _splitMode = false;
  private _splitUnits = new Map<string, number>();

  /** Rename input state. */
  private _renaming = false;
  private _renameText = "";
  private _renameHandler: ((e: KeyboardEvent) => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
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
    this._splitMode = false;
    this._splitUnits.clear();
    this._stopRename();
  }

  private _stopRename(): void {
    this._renaming = false;
    this._renameText = "";
    if (this._renameHandler) {
      window.removeEventListener("keydown", this._renameHandler);
      this._renameHandler = null;
    }
  }

  private _startRename(): void {
    if (!this._army) return;
    this._renaming = true;
    this._renameText = this._army.name;
    this._renameHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this._stopRename();
        this._rebuild();
        return;
      }
      if (e.key === "Enter") {
        const name = this._renameText.trim();
        if (name.length > 0 && this._army) {
          this.onRename?.(this._army.id, name);
        }
        this._stopRename();
        this._rebuild();
        return;
      }
      if (e.key === "Backspace") {
        this._renameText = this._renameText.slice(0, -1);
        this._rebuild();
        return;
      }
      if (e.key.length === 1 && this._renameText.length < 20) {
        this._renameText += e.key;
        this._rebuild();
      }
    };
    window.addEventListener("keydown", this._renameHandler);
    this._rebuild();
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
    if (this._renaming) {
      const inputBg = new Graphics();
      inputBg.roundRect(12, y, PANEL_W - 70, 20, 3);
      inputBg.fill({ color: 0x111133 });
      inputBg.stroke({ color: 0x6688aa, width: 1 });
      this._contentContainer.addChild(inputBg);

      const inputText = new Text({
        text: this._renameText + "_",
        style: TITLE_STYLE,
      });
      inputText.x = 16;
      inputText.y = y;
      this._contentContainer.addChild(inputText);
      y += 24;
    } else {
      const title = new Text({
        text: army.isGarrison ? "Garrison" : army.name,
        style: TITLE_STYLE,
      });
      title.x = 12;
      title.y = y;
      this._contentContainer.addChild(title);

      if (!army.isGarrison) {
        const renameBtn = _makeButton("Rename", PANEL_W - 80, y, 48, 18, () => {
          this._startRename();
        });
        this._contentContainer.addChild(renameBtn);
      }
      y += 24;
    }

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

      // Unit icon
      const icon = _makeUnitIcon(u.unitType, 24);
      if (icon) {
        icon.x = 12;
        icon.y = y;
        this._contentContainer.addChild(icon);
      }

      const uText = new Text({
        text: `${u.unitType} x${u.count}`,
        style: INFO_STYLE,
      });
      uText.x = icon ? 40 : 12;
      uText.y = y + 4;
      this._contentContainer.addChild(uText);
      y += 28;
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

    // Found city button (if army has a settler and conditions are met)
    if (!army.isGarrison && this._state && this.canFoundCityCheck?.(army, this._state)) {
      const foundBtn = _makeButton("FOUND CITY", 12, y, PANEL_W - 24, 26, () => {
        this.onFoundCity?.(army.id);
      });
      this._contentContainer.addChild(foundBtn);
      y += 32;
    }

    // Build improvement buttons (only for non-garrison armies with MP)
    if (!army.isGarrison && army.movementPoints > 0 && this._state) {
      const tile = this._state.grid.getTile(army.position.q, army.position.r);
      if (tile && !tile.improvement && tile.owner === army.owner) {
        const validImprovements = Object.values(IMPROVEMENT_DEFINITIONS).filter(
          (def) => def.validTerrain.includes(tile.terrain),
        );
        if (validImprovements.length > 0) {
          const header = new Text({
            text: "Build:",
            style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x88cc44 }),
          });
          header.x = 12;
          header.y = y;
          this._contentContainer.addChild(header);
          y += 16;

          for (const impDef of validImprovements) {
            const btn = _makeButton(impDef.label, 12, y, PANEL_W - 24, 22, () => {
              this.onBuildImprovement?.(army.id, impDef.type);
            });
            this._contentContainer.addChild(btn);
            y += 26;
          }
        }
      }
    }

    // Conjure button (if army has a national mage)
    if (_armyHasMage(army)) {
      const conjBtn = _makeButton("CONJURE", 12, y, PANEL_W - 24, 26, () => {
        this.onConjure?.(army.id);
      }, 0x332244, 0x7744aa);
      this._contentContainer.addChild(conjBtn);
      y += 32;
    }

    // Split / Merge section (non-garrison only)
    if (!army.isGarrison) {
      if (this._splitMode) {
        y = this._buildSplitView(army, y);
      } else {
        // Split button (need at least 2 total units)
        const canSplit = armyUnitCount(army) >= 2;
        if (canSplit) {
          const splitBtn = _makeButton("SPLIT", 12, y, (PANEL_W - 28) / 2, 26, () => {
            this._splitMode = true;
            this._splitUnits.clear();
            this._rebuild();
          }, 0x223344, 0x4488aa);
          this._contentContainer.addChild(splitBtn);

          // Merge button (if friendly army on same hex)
          const mergeTargets = this._findMergeTargets(army);
          if (mergeTargets.length > 0) {
            const mergeBtn = _makeButton("MERGE", 12 + (PANEL_W - 28) / 2 + 4, y, (PANEL_W - 28) / 2, 26, () => {
              this.onMerge?.(army.id, mergeTargets[0].id);
            }, 0x224422, 0x44aa44);
            this._contentContainer.addChild(mergeBtn);
          }
          y += 32;
        }
      }
    }

    // Position panel on left side, below HUD
    this._contentContainer.x = 10;
    this._contentContainer.y = 64;

    this.container.addChild(this._contentContainer);
  }

  private _findMergeTargets(army: WorldArmy): WorldArmy[] {
    if (!this._state) return [];
    const targets: WorldArmy[] = [];
    for (const other of this._state.armies.values()) {
      if (other.id === army.id) continue;
      if (other.isGarrison) continue;
      if (other.owner !== army.owner) continue;
      if (other.position.q !== army.position.q || other.position.r !== army.position.r) continue;
      targets.push(other);
    }
    return targets;
  }

  private _buildSplitView(army: WorldArmy, y: number): number {
    const header = new Text({ text: "Split Army", style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fontWeight: "bold", fill: 0xaaddff }) });
    header.x = 12;
    header.y = y;
    this._contentContainer.addChild(header);
    y += 20;

    for (const u of army.units) {
      const selected = this._splitUnits.get(u.unitType) ?? 0;

      const label = new Text({ text: `${u.unitType} x${u.count}`, style: INFO_STYLE });
      label.x = 12;
      label.y = y + 3;
      this._contentContainer.addChild(label);

      const minusBtn = _makeButton("-", PANEL_W - 120, y, 28, 22, (e?: any) => {
        const step = e?.ctrlKey ? 10 : e?.shiftKey ? 5 : 1;
        const cur = this._splitUnits.get(u.unitType) ?? 0;
        this._splitUnits.set(u.unitType, Math.max(0, cur - step));
        this._rebuild();
      });
      this._contentContainer.addChild(minusBtn);

      const countText = new Text({
        text: `${selected}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffcc44, fontWeight: "bold" }),
      });
      countText.x = PANEL_W - 82;
      countText.y = y + 4;
      this._contentContainer.addChild(countText);

      const plusBtn = _makeButton("+", PANEL_W - 60, y, 28, 22, (e?: any) => {
        const step = e?.ctrlKey ? 10 : e?.shiftKey ? 5 : 1;
        const cur = this._splitUnits.get(u.unitType) ?? 0;
        // Can't split all — must leave at least 1 unit total in source
        const maxSplit = u.count - (armyUnitCount(army) - _totalSelected(this._splitUnits) <= 1 ? 1 : 0);
        this._splitUnits.set(u.unitType, Math.min(Math.max(0, maxSplit), cur + step));
        this._rebuild();
      });
      this._contentContainer.addChild(plusBtn);
      y += 28;
    }

    y += 8;
    const totalSel = _totalSelected(this._splitUnits);
    if (totalSel > 0 && totalSel < armyUnitCount(army)) {
      const confirmBtn = _makeButton(`SPLIT (${totalSel} units)`, 12, y, PANEL_W - 24, 26, () => {
        const units: ArmyUnit[] = [];
        for (const [unitType, count] of this._splitUnits) {
          if (count > 0) units.push({ unitType, count, hpPerUnit: 100 });
        }
        this.onSplit?.(army.id, units);
        this._splitMode = false;
        this._splitUnits.clear();
      }, 0x224422, 0x44aa44);
      this._contentContainer.addChild(confirmBtn);
      y += 32;
    }

    const cancelBtn = _makeButton("CANCEL", 12, y, PANEL_W - 24, 24, () => {
      this._splitMode = false;
      this._splitUnits.clear();
      this._rebuild();
    }, 0x332222, 0xaa4444);
    this._contentContainer.addChild(cancelBtn);
    y += 30;

    return y;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeUnitIcon(unitType: string, size: number): Sprite | null {
  try {
    const frames = animationManager.getFrames(unitType as UnitType, UnitState.IDLE);
    if (!frames || frames.length === 0) return null;
    const sprite = new Sprite(frames[0]);
    const scale = size / Math.max(sprite.width, sprite.height);
    sprite.scale.set(scale);
    return sprite;
  } catch {
    return null;
  }
}

function _makeButton(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: (e?: any) => void,
  fillColor = 0x222244,
  strokeColor = BORDER,
): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, 4);
  bg.fill({ color: fillColor });
  bg.stroke({ color: strokeColor, width: 1 });
  btn.addChild(bg);

  const txt = new Text({ text: label, style: BTN_STYLE });
  txt.x = 6;
  txt.y = (h - txt.height) / 2;
  btn.addChild(txt);

  btn.position.set(x, y);
  btn.on("pointerdown", (e: any) => onClick(e));

  return btn;
}

const NATIONAL_MAGE_TYPES: string[] = [
  UnitType.NATIONAL_MAGE_T1, UnitType.NATIONAL_MAGE_T2,
  UnitType.NATIONAL_MAGE_T3, UnitType.NATIONAL_MAGE_T4,
  UnitType.NATIONAL_MAGE_T5, UnitType.NATIONAL_MAGE_T6,
  UnitType.NATIONAL_MAGE_T7,
];

function _armyHasMage(army: WorldArmy): boolean {
  return army.units.some((u) => NATIONAL_MAGE_TYPES.includes(u.unitType));
}

/** Get the highest national mage tier in an army (0 if none). */
export function getArmyMageTier(army: WorldArmy): number {
  let maxTier = 0;
  for (const u of army.units) {
    const idx = NATIONAL_MAGE_TYPES.indexOf(u.unitType);
    if (idx >= 0 && u.count > 0) maxTier = Math.max(maxTier, idx + 1);
  }
  return maxTier;
}

function _totalSelected(m: Map<string, number>): number {
  let t = 0;
  for (const v of m.values()) t += v;
  return t;
}

/** Singleton instance. */
export const armyPanel = new ArmyPanel();
