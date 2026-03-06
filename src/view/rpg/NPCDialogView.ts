// NPC dialogue overlay — shows dialogue lines, advance with Enter
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0e0e1a;
const BORDER_COLOR = 0x4444aa;
const NAME_COLOR = 0xffcc00;
const TEXT_COLOR = 0xdddddd;
const PROMPT_COLOR = 0x888888;

// ---------------------------------------------------------------------------
// NPCDialogView
// ---------------------------------------------------------------------------

export class NPCDialogView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  private _lines: string[] = [];
  private _npcName: string = "";
  private _currentLine: number = 0;

  onClose: (() => void) | null = null;

  init(vm: ViewManager, npcName: string, lines: string[]): void {
    this.vm = vm;
    this._npcName = npcName;
    this._lines = lines;
    this._currentLine = 0;

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

    // Dialog box at bottom of screen
    const boxH = 120;
    const boxY = H - boxH - 10;
    const boxX = 20;
    const boxW = W - 40;

    const bg = new Graphics();
    bg.roundRect(boxX, boxY, boxW, boxH, 8);
    bg.fill({ color: BG_COLOR, alpha: 0.92 });
    bg.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(bg);

    // NPC name tag
    const nameTag = new Graphics();
    const nameW = Math.max(100, this._npcName.length * 9 + 20);
    nameTag.roundRect(boxX + 15, boxY - 14, nameW, 28, 4);
    nameTag.fill({ color: BG_COLOR });
    nameTag.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(nameTag);

    const nameText = new Text({
      text: this._npcName,
      style: { fontFamily: "monospace", fontSize: 13, fill: NAME_COLOR, fontWeight: "bold" },
    });
    nameText.position.set(boxX + 25, boxY - 10);
    this.container.addChild(nameText);

    // Dialogue text
    const line = this._lines[this._currentLine] ?? "";
    const dialogText = new Text({
      text: line,
      style: {
        fontFamily: "monospace",
        fontSize: 14,
        fill: TEXT_COLOR,
        wordWrap: true,
        wordWrapWidth: boxW - 40,
        lineHeight: 22,
      },
    });
    dialogText.position.set(boxX + 20, boxY + 22);
    this.container.addChild(dialogText);

    // Prompt
    const isLast = this._currentLine >= this._lines.length - 1;
    const promptStr = isLast ? "Press Enter to close" : "Press Enter to continue...";
    const prompt = new Text({
      text: promptStr,
      style: { fontFamily: "monospace", fontSize: 10, fill: PROMPT_COLOR },
    });
    prompt.anchor.set(1, 0);
    prompt.position.set(boxX + boxW - 15, boxY + boxH - 22);
    this.container.addChild(prompt);

    // Page indicator
    if (this._lines.length > 1) {
      const pageText = new Text({
        text: `${this._currentLine + 1}/${this._lines.length}`,
        style: { fontFamily: "monospace", fontSize: 9, fill: PROMPT_COLOR },
      });
      pageText.position.set(boxX + 20, boxY + boxH - 20);
      this.container.addChild(pageText);
    }
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        if (this._currentLine < this._lines.length - 1) {
          this._currentLine++;
          this._draw();
        } else {
          this.onClose?.();
        }
      } else if (e.code === "Escape") {
        this.onClose?.();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
