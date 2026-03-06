// Game Over screen — shown when the party is wiped, offers restart
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_COLOR = 0x0e0e1a;
const BORDER_COLOR = 0x662222;
const TITLE_COLOR = 0xcc3333;
const TEXT_COLOR = 0xcccccc;
const OPTION_COLOR = 0xffcc00;
const DIM_COLOR = 0x888888;

// ---------------------------------------------------------------------------
// GameOverView
// ---------------------------------------------------------------------------

export class GameOverView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _selectedIndex = 0;
  private _options = ["Start New Adventure", "Return to Title"];
  onRestart: (() => void) | null = null;
  onMainMenu: (() => void) | null = null;

  init(vm: ViewManager): void {
    this.vm = vm;
    vm.addToLayer("ui", this.container);
    this._draw();
    this._setupInput();
  }

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Full-screen dark overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.8 });
    this.container.addChild(overlay);

    // Panel
    const panelW = Math.min(360, W - 40);
    const panelH = 220;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: "GAME OVER",
      style: { fontFamily: "monospace", fontSize: 28, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, panelY + 25);
    this.container.addChild(title);

    // Message
    const msg = new Text({
      text: "Your party has fallen in battle.\nThe adventure ends here... or does it?",
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: TEXT_COLOR,
        wordWrap: true,
        wordWrapWidth: panelW - 40,
        align: "center",
        lineHeight: 20,
      },
    });
    msg.anchor.set(0.5, 0);
    msg.position.set(W / 2, panelY + 75);
    this.container.addChild(msg);

    // Options
    for (let i = 0; i < this._options.length; i++) {
      const selected = i === this._selectedIndex;
      const optText = new Text({
        text: `${selected ? "> " : "  "}${this._options[i]}`,
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fill: selected ? OPTION_COLOR : TEXT_COLOR,
          fontWeight: selected ? "bold" : "normal",
        },
      });
      optText.anchor.set(0.5, 0);
      optText.position.set(W / 2, panelY + 130 + i * 28);
      this.container.addChild(optText);
    }

    // Footer
    const footer = new Text({
      text: "Press Enter to continue",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 28);
    this.container.addChild(footer);
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp") {
        this._selectedIndex = (this._selectedIndex - 1 + this._options.length) % this._options.length;
        this._draw();
      } else if (e.code === "ArrowDown") {
        this._selectedIndex = (this._selectedIndex + 1) % this._options.length;
        this._draw();
      } else if (e.code === "Enter" || e.code === "Space") {
        if (this._selectedIndex === 0) {
          this.onRestart?.();
        } else {
          this.onMainMenu?.();
        }
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
