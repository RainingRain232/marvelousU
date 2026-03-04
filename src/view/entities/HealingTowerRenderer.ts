// Healing tower renderer for BuildingView.
// Green theme with a windowed mage peeking out. Reuses TowerMage for the mage
// sprite so the attack/cast visuals match other towers.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";
import { TowerMage, MAGE_COLORS_HEAL } from "./TowerMage";

const TS = 64;
const TW = 1 * TS;
const TH = 2 * TS;

export class HealingTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics();
  private _mage: TowerMage;
  private _mageContainer = new Container();
  private _playerColor: number;
  private _time = 0;
  private _casting = false;

  constructor(owner: string | null) {
    this._playerColor = getPlayerColor(owner);
    this._mage = new TowerMage(MAGE_COLORS_HEAL);

    this._drawStaticTower();
    this.container.addChild(this._base);
    this._mageContainer.addChild(this._mage.graphics);
    this._mageContainer.position.set(-6, -6);
    this.container.addChild(this._mageContainer);
  }

  private _drawStaticTower(): void {
    const g = this._base;
    g.clear();
    const baseY = TH - 8;
    // base platform
    g.rect(4, baseY, TW - 8, 8).fill({ color: this._playerColor });
    
    // Tower body - bottom section
    g.moveTo(14, baseY);
    g.lineTo(10, TH - 60);
    g.lineTo(TW - 10, TH - 60);
    g.lineTo(TW - 14, baseY);
    g.closePath();
    g.fill({ color: 0x1abc9c });
    g.stroke({ color: 0x0e6b51, width: 1.5 });

    // Middle section
    g.moveTo(10, TH - 64);
    g.lineTo(6, TH - 100);
    g.lineTo(TW - 6, TH - 100);
    g.lineTo(TW - 10, TH - 64);
    g.closePath();
    g.fill({ color: 0x1abc9c });
    g.stroke({ color: 0x0e6b51, width: 1.5 });

    // Top section (narrow)
    g.moveTo(8, TH - 104);
    g.lineTo(6, TH - 130);
    g.lineTo(TW - 6, TH - 130);
    g.lineTo(TW - 8, TH - 104);
    g.closePath();
    g.fill({ color: 0x1abc9c });
    g.stroke({ color: 0x0e6b51, width: 1.5 });

    // window area (larger to host mage)
    const winX = TW / 2 - 10;
    const winY = TH - 95;
    this._drawWindow(g, winX, winY);
  }

  private _drawWindow(g: Graphics, x: number, y: number): void {
    g.rect(x - 2, y - 2, 24, 28).fill({ color: 0x0b5e3a });
    g.rect(x, y, 20, 22).fill({ color: 0x0a3d2f });
    g.rect(x - 1, y - 1, 22, 24).stroke({ color: 0x1e7e3a, width: 1.5 });
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    // simple peeking/casting cadence
    const casting = Math.floor(this._time) % 5 === 0;
    if (casting !== this._casting) {
      this._casting = casting;
      this._mage.setCasting(this._casting);
    }
    this._mage.tick(dt);
  }

  destroy(): void {
    this._mage.destroy();
    this.container.destroy({ children: true });
  }
}

export const healingTowerRenderer = new HealingTowerRenderer(null);
