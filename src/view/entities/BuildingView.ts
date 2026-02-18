// Building sprite + health bar + selection highlight
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Building } from "@sim/entities/Building";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingType, BuildingState } from "@/types";

// ---------------------------------------------------------------------------
// Per-type placeholder colors (0xRRGGBB)
// ---------------------------------------------------------------------------

const BUILDING_COLORS: Record<BuildingType, number> = {
  [BuildingType.CASTLE]: 0x8b6914, // gold-brown
  [BuildingType.BARRACKS]: 0x3a5c8b, // steel blue
  [BuildingType.STABLES]: 0x5c3a1e, // saddle brown
  [BuildingType.MAGE_TOWER]: 0x6a1e8b, // purple
  [BuildingType.ARCHERY_RANGE]: 0x2e6b2e, // forest green
};

const BORDER_COLOR = 0x000000;
const BORDER_ALPHA = 0.6;

// Health bar geometry (in pixels, relative to container origin)
const BAR_H = 6;
const BAR_Y_OFF = -10; // above the building rect
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_DANGER = 0xff4444; // color when hp < 30 %

// Label style
const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xffffff,
  align: "center",
});

// Short display names per building type
const BUILDING_LABELS: Record<BuildingType, string> = {
  [BuildingType.CASTLE]: "CASTLE",
  [BuildingType.BARRACKS]: "BARRACKS",
  [BuildingType.STABLES]: "STABLES",
  [BuildingType.MAGE_TOWER]: "MAGE TWR",
  [BuildingType.ARCHERY_RANGE]: "ARCHERY",
};

// ---------------------------------------------------------------------------
// BuildingView — one per building entity
// ---------------------------------------------------------------------------

export class BuildingView {
  readonly container = new Container();

  private _body = new Graphics();
  private _hpBg = new Graphics();
  private _hpFill = new Graphics();
  private _label = new Text({ text: "", style: LABEL_STYLE });

  constructor(building: Building) {
    const def = BUILDING_DEFINITIONS[building.type];
    const ts = BalanceConfig.TILE_SIZE;
    const pw = def.footprint.w * ts;
    const ph = def.footprint.h * ts;

    // --- Body rect ---
    this._body
      .rect(0, 0, pw, ph)
      .fill({ color: BUILDING_COLORS[building.type] })
      .rect(0, 0, pw, ph)
      .stroke({ color: BORDER_COLOR, alpha: BORDER_ALPHA, width: 2 });
    this.container.addChild(this._body);

    // --- Health bar background ---
    this._hpBg.rect(0, BAR_Y_OFF, pw, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);

    // --- Health bar fill (drawn dynamically in update) ---
    this.container.addChild(this._hpFill);

    // --- Label ---
    this._label.text = BUILDING_LABELS[building.type];
    this._label.anchor.set(0.5, 0.5);
    this._label.position.set(pw / 2, ph / 2);
    this.container.addChild(this._label);

    // Position in world space
    this.container.position.set(
      building.position.x * ts,
      building.position.y * ts,
    );

    this.update(building);
  }

  /** Sync visual state to simulation data (call every frame or on change). */
  update(building: Building): void {
    const def = BUILDING_DEFINITIONS[building.type];
    const ts = BalanceConfig.TILE_SIZE;
    const pw = def.footprint.w * ts;
    const pct = Math.max(0, building.health / building.maxHealth);
    const fillW = pw * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;

    // Health bar fill
    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill.rect(0, BAR_Y_OFF, fillW, BAR_H).fill({ color: hpColor });
    }

    // Dim body on destruction
    this._body.alpha = building.state === BuildingState.DESTROYED ? 0.35 : 1;
    this._label.alpha = this._body.alpha;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
