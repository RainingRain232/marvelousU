// Scrolling event notification log for world mode.
//
// Displays game events (battles, research, city growth) at the bottom-left.
// Old entries fade out after a few turns.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 8;
const ENTRY_HEIGHT = 16;
const LOG_W = 350;
const LOG_H = MAX_ENTRIES * ENTRY_HEIGHT + 8;

const DEFAULT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xcccccc,
});

// ---------------------------------------------------------------------------
// WorldEventLog
// ---------------------------------------------------------------------------

interface LogEntry {
  text: string;
  color: number;
  turn: number;
}

export class WorldEventLog {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _entries: LogEntry[] = [];
  private _currentTurn = 1;
  private _textContainer = new Container();
  private _bg!: Graphics;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this._bg.roundRect(0, 0, LOG_W, LOG_H, 4);
    this._bg.fill({ color: 0x000000, alpha: 0.5 });
    this.container.addChild(this._bg);
    this.container.addChild(this._textContainer);

    // Position at bottom-left
    this.container.x = 10;
    this.container.y = vm.screenHeight - LOG_H - 60;

    vm.addToLayer("ui", this.container);

    vm.app.renderer.on("resize", (_w: number, h: number) => {
      this.container.y = h - LOG_H - 60;
    });
  }

  /** Set the current turn number (for fade calculations). */
  setTurn(turn: number): void {
    this._currentTurn = turn;
    this._rebuild();
  }

  /** Add an event to the log. */
  addEvent(text: string, color = 0xcccccc): void {
    this._entries.push({ text, color, turn: this._currentTurn });
    // Keep only recent entries
    if (this._entries.length > MAX_ENTRIES * 2) {
      this._entries = this._entries.slice(-MAX_ENTRIES * 2);
    }
    this._rebuild();
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(): void {
    this._textContainer.removeChildren();

    // Filter to entries within last 5 turns
    const recent = this._entries.filter(
      (e) => this._currentTurn - e.turn < 5,
    );

    // Show last MAX_ENTRIES
    const visible = recent.slice(-MAX_ENTRIES);

    let y = 4;
    for (const entry of visible) {
      const age = this._currentTurn - entry.turn;
      const alpha = Math.max(0.3, 1.0 - age * 0.2);

      const txt = new Text({
        text: entry.text,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 11,
          fill: entry.color,
        }),
      });
      txt.x = 6;
      txt.y = y;
      txt.alpha = alpha;
      this._textContainer.addChild(txt);
      y += ENTRY_HEIGHT;
    }

    // Resize background
    this._bg.clear();
    this._bg.roundRect(0, 0, LOG_W, Math.max(LOG_H, y + 4), 4);
    this._bg.fill({ color: 0x000000, alpha: 0.5 });
  }
}

/** Singleton instance. */
export const worldEventLog = new WorldEventLog();
