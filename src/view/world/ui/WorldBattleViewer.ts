// Full-screen battle viewer overlay for world mode.
//
// Instead of instantly resolving battles, this renders the tactical sim
// in a simplified top-down view so the player can watch the fight unfold.
// Includes Skip button and speed controls.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { simTick } from "@sim/core/SimLoop";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_SIZE = 12; // pixels per tile in the battle viewer
const TICKS_PER_FRAME_NORMAL = 3;
const TICKS_PER_FRAME_FAST = 12;

const PLAYER_COLORS: Record<string, number> = {
  p1: 0x4488ff,
  p2: 0xff4444,
};

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0xffffff,
});

const COUNT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: "bold",
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 },
});

// ---------------------------------------------------------------------------
// WorldBattleViewer
// ---------------------------------------------------------------------------

export class WorldBattleViewer {
  private _vm!: ViewManager;
  private _container = new Container();
  private _gridContainer = new Container();
  private _unitContainer = new Container();
  private _uiContainer = new Container();

  private _battleState: GameState | null = null;
  private _running = false;
  private _fast = false;
  private _tickerId: (() => void) | null = null;

  private _p1CountText!: Text;
  private _p2CountText!: Text;
  private _statusText!: Text;

  private _onComplete: ((battleState: GameState) => void) | null = null;

  /** Attacker / defender labels for the viewer. */
  private _attackerLabel = "Attacker";
  private _defenderLabel = "Defender";

  /** Set to true when the player clicks the PLAY BATTLE button. */
  playBattleRequested = false;

  private _playBattleBtn: Container | null = null;

  get isVisible(): boolean {
    return this._container.visible;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    this._container.visible = false;
    this._container.eventMode = "static";

    // Background dim
    const bg = new Graphics();
    bg.rect(0, 0, vm.screenWidth, vm.screenHeight);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._container.addChild(bg);

    // Title
    const title = new Text({ text: "BATTLE", style: TITLE_STYLE });
    title.anchor.set(0.5, 0);
    title.x = vm.screenWidth / 2;
    title.y = 10;
    this._container.addChild(title);

    // Grid area
    this._gridContainer.x = vm.screenWidth / 2 - (BalanceConfig.GRID_WIDTH * TILE_SIZE) / 2;
    this._gridContainer.y = 50;
    this._container.addChild(this._gridContainer);

    // Units drawn on top of grid
    this._unitContainer.x = this._gridContainer.x;
    this._unitContainer.y = this._gridContainer.y;
    this._container.addChild(this._unitContainer);

    // UI elements
    this._uiContainer.x = 0;
    this._uiContainer.y = 0;
    this._container.addChild(this._uiContainer);

    // Army count labels
    this._p1CountText = new Text({ text: "", style: COUNT_STYLE });
    this._p1CountText.x = this._gridContainer.x;
    this._p1CountText.y = 34;
    this._uiContainer.addChild(this._p1CountText);

    this._p2CountText = new Text({ text: "", style: COUNT_STYLE });
    this._p2CountText.anchor.set(1, 0);
    this._p2CountText.x = this._gridContainer.x + BalanceConfig.GRID_WIDTH * TILE_SIZE;
    this._p2CountText.y = 34;
    this._uiContainer.addChild(this._p2CountText);

    // Status text (center bottom of grid)
    this._statusText = new Text({ text: "", style: LABEL_STYLE });
    this._statusText.anchor.set(0.5, 0);
    this._statusText.x = vm.screenWidth / 2;
    this._statusText.y = 54 + BalanceConfig.GRID_HEIGHT * TILE_SIZE + 8;
    this._uiContainer.addChild(this._statusText);

    // Skip button
    this._buildButton("SKIP", vm.screenWidth / 2 + 70, 54 + BalanceConfig.GRID_HEIGHT * TILE_SIZE + 30, () => {
      this._skipBattle();
    });

    // Speed button
    this._buildButton("FAST", vm.screenWidth / 2 - 70, 54 + BalanceConfig.GRID_HEIGHT * TILE_SIZE + 30, () => {
      this._fast = !this._fast;
    });

    // Play Battle button (wider, below the other buttons)
    this._playBattleBtn = this._buildWideButton(
      "PLAY BATTLE",
      vm.screenWidth / 2,
      54 + BalanceConfig.GRID_HEIGHT * TILE_SIZE + 62,
      () => {
        this.playBattleRequested = true;
        this._stop();
        this._container.visible = false;
        if (this._battleState && this._onComplete) {
          this._onComplete(this._battleState);
          this._onComplete = null;
          this._battleState = null;
        }
      },
    );
    this._playBattleBtn.visible = false;

    vm.addToLayer("ui", this._container);
  }

  destroy(): void {
    this._stop();
    this._container.removeFromParent();
    this._container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Show the battle viewer and start animating a battle.
   * Returns a Promise that resolves with the completed GameState.
   */
  startBattle(
    battleState: GameState,
    attackerLabel: string,
    defenderLabel: string,
    canPlay = false,
  ): Promise<GameState> {
    this._battleState = battleState;
    this._attackerLabel = attackerLabel;
    this._defenderLabel = defenderLabel;
    this._fast = false;
    this.playBattleRequested = false;

    if (this._playBattleBtn) {
      this._playBattleBtn.visible = canPlay;
    }

    // Draw the battle grid
    this._drawGrid();
    this._updateUnits();
    this._updateCounts();

    this._container.visible = true;
    this._running = true;

    return new Promise<GameState>((resolve) => {
      this._onComplete = resolve;
      this._startTicking();
    });
  }

  // -----------------------------------------------------------------------
  // Private — simulation
  // -----------------------------------------------------------------------

  private _startTicking(): void {
    if (this._tickerId) return;

    const tick = () => {
      if (!this._running || !this._battleState) return;

      const ticksPerFrame = this._fast ? TICKS_PER_FRAME_FAST : TICKS_PER_FRAME_NORMAL;
      for (let i = 0; i < ticksPerFrame; i++) {
        simTick(this._battleState);
        if (this._battleState.winnerId) {
          this._onBattleEnd();
          return;
        }
        // Safety: max 5000 total ticks
        if (this._battleState.tick > 5000) {
          this._onBattleEnd();
          return;
        }
      }

      this._updateUnits();
      this._updateCounts();
    };

    // Use the pixi ticker for frame-synced updates
    this._vm.app.ticker.add(tick);
    this._tickerId = tick;
  }

  private _stop(): void {
    this._running = false;
    if (this._tickerId) {
      this._vm.app.ticker.remove(this._tickerId);
      this._tickerId = null;
    }
  }

  private _skipBattle(): void {
    if (!this._battleState) return;
    const MAX_TICKS = 5000;
    for (let i = this._battleState.tick; i < MAX_TICKS; i++) {
      simTick(this._battleState);
      if (this._battleState.winnerId) break;
    }
    this._onBattleEnd();
  }

  private _onBattleEnd(): void {
    this._stop();
    this._updateUnits();
    this._updateCounts();

    const winnerId = this._battleState?.winnerId;
    const label = winnerId === "p1" ? this._attackerLabel : winnerId === "p2" ? this._defenderLabel : "Draw";
    this._statusText.text = `${label} wins!`;
    this._statusText.style.fill = winnerId === "p1" ? 0x4488ff : winnerId === "p2" ? 0xff4444 : 0xaaaaaa;

    // Auto-close after a short delay
    setTimeout(() => {
      this._container.visible = false;
      if (this._battleState && this._onComplete) {
        this._onComplete(this._battleState);
        this._onComplete = null;
        this._battleState = null;
      }
    }, 1200);
  }

  // -----------------------------------------------------------------------
  // Private — rendering
  // -----------------------------------------------------------------------

  private _drawGrid(): void {
    this._gridContainer.removeChildren();
    const g = new Graphics();

    const w = BalanceConfig.GRID_WIDTH;
    const h = BalanceConfig.GRID_HEIGHT;

    // Grid background
    g.rect(0, 0, w * TILE_SIZE, h * TILE_SIZE);
    g.fill({ color: 0x2a3a2a });

    // Grid lines
    for (let x = 0; x <= w; x++) {
      g.moveTo(x * TILE_SIZE, 0);
      g.lineTo(x * TILE_SIZE, h * TILE_SIZE);
      g.stroke({ color: 0x3a4a3a, width: 0.5, alpha: 0.5 });
    }
    for (let y = 0; y <= h; y++) {
      g.moveTo(0, y * TILE_SIZE);
      g.lineTo(w * TILE_SIZE, y * TILE_SIZE);
      g.stroke({ color: 0x3a4a3a, width: 0.5, alpha: 0.5 });
    }

    // Center divider
    g.moveTo((w / 2) * TILE_SIZE, 0);
    g.lineTo((w / 2) * TILE_SIZE, h * TILE_SIZE);
    g.stroke({ color: 0x555555, width: 1, alpha: 0.6 });

    this._gridContainer.addChild(g);
  }

  private _updateUnits(): void {
    this._unitContainer.removeChildren();
    if (!this._battleState) return;

    const g = new Graphics();
    for (const unit of this._battleState.units.values()) {
      if (unit.hp <= 0 || unit.state === UnitState.DIE) continue;

      const color = PLAYER_COLORS[unit.owner] ?? 0xffffff;
      const px = unit.position.x * TILE_SIZE + TILE_SIZE / 2;
      const py = unit.position.y * TILE_SIZE + TILE_SIZE / 2;

      // Health-based radius (min 2, max 4)
      const hpRatio = unit.hp / unit.maxHp;
      const radius = 2 + hpRatio * 2;

      g.circle(px, py, radius);
      g.fill({ color, alpha: 0.9 });

      // Dim border for low health
      if (hpRatio < 0.5) {
        g.circle(px, py, radius + 1);
        g.stroke({ color: 0xff0000, width: 0.5, alpha: 0.6 });
      }
    }

    // Draw buildings
    for (const bld of this._battleState.buildings.values()) {
      if (bld.health <= 0) continue;
      const color = (bld.owner ? PLAYER_COLORS[bld.owner] : null) ?? 0x888888;
      const bx = bld.position.x * TILE_SIZE;
      const by = bld.position.y * TILE_SIZE;
      g.rect(bx, by, 2 * TILE_SIZE, 2 * TILE_SIZE);
      g.fill({ color, alpha: 0.4 });
      g.stroke({ color, width: 1, alpha: 0.6 });
    }

    this._unitContainer.addChild(g);
  }

  private _updateCounts(): void {
    if (!this._battleState) return;

    let p1Count = 0;
    let p2Count = 0;
    for (const unit of this._battleState.units.values()) {
      if (unit.hp <= 0 || unit.state === UnitState.DIE) continue;
      if (unit.owner === "p1") p1Count++;
      else if (unit.owner === "p2") p2Count++;
    }

    this._p1CountText.text = `${this._attackerLabel}: ${p1Count}`;
    this._p1CountText.style.fill = PLAYER_COLORS.p1;
    this._p2CountText.text = `${this._defenderLabel}: ${p2Count}`;
    this._p2CountText.style.fill = PLAYER_COLORS.p2;

    this._statusText.text = `Tick ${this._battleState.tick}`;
    this._statusText.style.fill = 0xaaaaaa;
  }

  // -----------------------------------------------------------------------
  // Private — UI helpers
  // -----------------------------------------------------------------------

  private _buildWideButton(label: string, x: number, y: number, onClick: () => void): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const hw = 70; // half-width
    const bg = new Graphics();
    bg.roundRect(-hw, -14, hw * 2, 28, 4);
    bg.fill({ color: 0x226622 });
    bg.stroke({ color: 0x44aa44, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.anchor.set(0.5, 0.5);
    btn.addChild(txt);

    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(-hw, -14, hw * 2, 28, 4);
      bg.fill({ color: 0x338833 });
      bg.stroke({ color: 0x66cc66, width: 1.5 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.roundRect(-hw, -14, hw * 2, 28, 4);
      bg.fill({ color: 0x226622 });
      bg.stroke({ color: 0x44aa44, width: 1.5 });
    });

    btn.x = x;
    btn.y = y;
    this._uiContainer.addChild(btn);
    return btn;
  }

  private _buildButton(label: string, x: number, y: number, onClick: () => void): void {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(-40, -14, 80, 28, 4);
    bg.fill({ color: 0x444444 });
    bg.stroke({ color: 0x888888, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.anchor.set(0.5, 0.5);
    btn.addChild(txt);

    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(-40, -14, 80, 28, 4);
      bg.fill({ color: 0x666666 });
      bg.stroke({ color: 0xaaaaaa, width: 1.5 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.roundRect(-40, -14, 80, 28, 4);
      bg.fill({ color: 0x444444 });
      bg.stroke({ color: 0x888888, width: 1.5 });
    });

    btn.x = x;
    btn.y = y;
    this._uiContainer.addChild(btn);
  }
}

/** Singleton instance. */
export const worldBattleViewer = new WorldBattleViewer();
