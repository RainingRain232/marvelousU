// Victory/defeat screen for world mode.
//
// Shown when the game ends (GAME_OVER phase).
// Displays winner info, turn count, and a return-to-menu button.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 32,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xcccccc,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xffffff,
});

// ---------------------------------------------------------------------------
// WorldVictoryScreen
// ---------------------------------------------------------------------------

export class WorldVictoryScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _contentContainer = new Container();

  /** Called when the player clicks return to menu. */
  onReturnToMenu: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(state: WorldState): void {
    this.container.visible = true;
    this._rebuild(state);
  }

  hide(): void {
    this.container.visible = false;
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

  private _rebuild(state: WorldState): void {
    this._contentContainer.removeFromParent();
    this._contentContainer.destroy({ children: true });
    this._contentContainer = new Container();

    const screenW = this._vm.screenWidth;
    const screenH = this._vm.screenHeight;

    // Fullscreen backdrop
    const bg = new Graphics();
    bg.rect(0, 0, screenW, screenH);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._contentContainer.addChild(bg);

    const centerX = screenW / 2;
    let y = screenH / 4;

    // Winner info
    const winner = state.winnerId ? state.players.get(state.winnerId) : null;
    const isVictory = winner && !winner.isAI;

    const titleText = isVictory ? "VICTORY!" : "DEFEAT";
    const titleColor = isVictory ? 0xffcc44 : 0xcc4444;

    const title = new Text({
      text: titleText,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 32,
        fontWeight: "bold",
        fill: titleColor,
      }),
    });
    title.x = centerX - title.width / 2;
    title.y = y;
    this._contentContainer.addChild(title);
    y += 60;

    // Stats
    if (winner) {
      const winnerLabel = new Text({
        text: `Winner: ${winner.id} (${winner.raceId})`,
        style: INFO_STYLE,
      });
      winnerLabel.x = centerX - winnerLabel.width / 2;
      winnerLabel.y = y;
      this._contentContainer.addChild(winnerLabel);
      y += 30;
    }

    const turnLabel = new Text({
      text: `Turns: ${state.turn}`,
      style: INFO_STYLE,
    });
    turnLabel.x = centerX - turnLabel.width / 2;
    turnLabel.y = y;
    this._contentContainer.addChild(turnLabel);
    y += 30;

    // Count cities and armies
    if (winner) {
      let cities = 0;
      let armies = 0;
      let techs = 0;
      for (const city of state.cities.values()) {
        if (city.owner === winner.id) cities++;
      }
      for (const army of state.armies.values()) {
        if (army.owner === winner.id && !army.isGarrison) armies++;
      }
      techs = winner.completedResearch.size;

      const statsLabel = new Text({
        text: `Cities: ${cities}  Armies: ${armies}  Techs: ${techs}`,
        style: INFO_STYLE,
      });
      statsLabel.x = centerX - statsLabel.width / 2;
      statsLabel.y = y;
      this._contentContainer.addChild(statsLabel);
      y += 50;
    }

    // Return to menu button
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, 220, 44, 8);
    btnBg.fill({ color: 0x333366 });
    btnBg.stroke({ color: 0x5555aa, width: 2 });
    btn.addChild(btnBg);

    const btnLabel = new Text({ text: "RETURN TO MENU", style: BTN_STYLE });
    btnLabel.x = (220 - btnLabel.width) / 2;
    btnLabel.y = 10;
    btn.addChild(btnLabel);

    btn.x = centerX - 110;
    btn.y = y;
    btn.on("pointerdown", () => this.onReturnToMenu?.());
    this._contentContainer.addChild(btn);

    this.container.addChild(this._contentContainer);
  }
}

/** Singleton instance. */
export const worldVictoryScreen = new WorldVictoryScreen();
