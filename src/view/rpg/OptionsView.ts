// Options screen — game settings (accessible from main menu and in-game via Escape)
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const PANEL_COLOR = 0x12122a;
const BORDER_COLOR = 0x4444aa;
const TITLE_COLOR = 0xffdd44;
const OPTION_COLOR = 0xeeeeff;
const SELECTED_COLOR = 0xffcc00;
const DIM_COLOR = 0x666688;
const VALUE_COLOR = 0x88ccff;
const BAR_BG = 0x222244;
const BAR_FILL = 0x4488ff;

// ---------------------------------------------------------------------------
// Options data
// ---------------------------------------------------------------------------

export interface GameOptions {
  musicVolume: number;  // 0–100
  sfxVolume: number;    // 0–100
  battleMode: "turn" | "auto";
  textSpeed: "slow" | "normal" | "fast";
  showMinimap: boolean;
}

const DEFAULT_OPTIONS: GameOptions = {
  musicVolume: 70,
  sfxVolume: 80,
  battleMode: "turn",
  textSpeed: "normal",
  showMinimap: true,
};

const OPTIONS_STORAGE_KEY = "rpg_options";

export function loadOptions(): GameOptions {
  try {
    const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPTIONS };
    return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(opts: GameOptions): void {
  localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(opts));
}

// ---------------------------------------------------------------------------
// OptionsView
// ---------------------------------------------------------------------------

interface OptionEntry {
  label: string;
  key: keyof GameOptions;
  type: "slider" | "toggle" | "cycle";
  values?: string[];
}

const OPTION_ENTRIES: OptionEntry[] = [
  { label: "Music Volume", key: "musicVolume", type: "slider" },
  { label: "SFX Volume", key: "sfxVolume", type: "slider" },
  { label: "Battle Mode", key: "battleMode", type: "cycle", values: ["turn", "auto"] },
  { label: "Text Speed", key: "textSpeed", type: "cycle", values: ["slow", "normal", "fast"] },
  { label: "Show Minimap", key: "showMinimap", type: "toggle" },
];

export class OptionsView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _selectedIndex = 0;
  private _options: GameOptions = { ...DEFAULT_OPTIONS };

  onClose: (() => void) | null = null;
  onOptionsChanged: ((opts: GameOptions) => void) | null = null;

  init(vm: ViewManager, currentOptions?: GameOptions): void {
    this.vm = vm;
    this._options = currentOptions ? { ...currentOptions } : loadOptions();
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

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Full-screen background
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: BG_COLOR, alpha: 0.92 });
    this.container.addChild(bg);

    // Panel
    const panelW = Math.min(480, W - 40);
    const panelH = Math.min(380, H - 60);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.98 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: "OPTIONS",
      style: { fontFamily: "monospace", fontSize: 22, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, panelY + 18);
    this.container.addChild(title);

    // Options entries
    const startY = panelY + 62;
    const rowH = 48;

    for (let i = 0; i < OPTION_ENTRIES.length; i++) {
      const entry = OPTION_ENTRIES[i];
      const selected = i === this._selectedIndex;
      const y = startY + i * rowH;

      // Highlight bar
      if (selected) {
        const hlGfx = new Graphics();
        hlGfx.roundRect(panelX + 10, y - 4, panelW - 20, rowH - 8, 4);
        hlGfx.fill({ color: 0x222244, alpha: 0.8 });
        this.container.addChild(hlGfx);
      }

      // Label
      const labelText = new Text({
        text: `${selected ? "> " : "  "}${entry.label}`,
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fill: selected ? SELECTED_COLOR : OPTION_COLOR,
          fontWeight: selected ? "bold" : "normal",
        },
      });
      labelText.position.set(panelX + 24, y + 8);
      this.container.addChild(labelText);

      // Value
      const val = this._options[entry.key];

      if (entry.type === "slider") {
        const barW = 140;
        const barH = 12;
        const barX = panelX + panelW - barW - 60;
        const barY = y + 12;

        const barBg = new Graphics();
        barBg.roundRect(barX, barY, barW, barH, 3);
        barBg.fill({ color: BAR_BG });
        this.container.addChild(barBg);

        const fillW = (val as number) / 100 * barW;
        if (fillW > 0) {
          const barFill = new Graphics();
          barFill.roundRect(barX, barY, fillW, barH, 3);
          barFill.fill({ color: BAR_FILL });
          this.container.addChild(barFill);
        }

        const valText = new Text({
          text: `${val}%`,
          style: { fontFamily: "monospace", fontSize: 12, fill: VALUE_COLOR },
        });
        valText.position.set(panelX + panelW - 50, y + 10);
        this.container.addChild(valText);
      } else {
        const displayVal = entry.type === "toggle"
          ? (val ? "ON" : "OFF")
          : String(val).toUpperCase();

        const valText = new Text({
          text: `< ${displayVal} >`,
          style: { fontFamily: "monospace", fontSize: 14, fill: VALUE_COLOR, fontWeight: "bold" },
        });
        valText.anchor.set(1, 0);
        valText.position.set(panelX + panelW - 24, y + 8);
        this.container.addChild(valText);
      }
    }

    // Footer
    const footer = new Text({
      text: "Up/Down: Navigate  |  Left/Right: Adjust  |  Escape: Back",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 28);
    this.container.addChild(footer);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp") {
        this._selectedIndex = (this._selectedIndex - 1 + OPTION_ENTRIES.length) % OPTION_ENTRIES.length;
        this._draw();
      } else if (e.code === "ArrowDown") {
        this._selectedIndex = (this._selectedIndex + 1) % OPTION_ENTRIES.length;
        this._draw();
      } else if (e.code === "ArrowLeft") {
        this._adjustValue(-1);
        this._draw();
      } else if (e.code === "ArrowRight") {
        this._adjustValue(1);
        this._draw();
      } else if (e.code === "Escape") {
        saveOptions(this._options);
        this.onOptionsChanged?.(this._options);
        this.onClose?.();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _adjustValue(dir: number): void {
    const entry = OPTION_ENTRIES[this._selectedIndex];
    const key = entry.key;

    if (entry.type === "slider") {
      const current = this._options[key] as number;
      this._options[key] = Math.max(0, Math.min(100, current + dir * 10)) as never;
    } else if (entry.type === "toggle") {
      this._options[key] = !this._options[key] as never;
    } else if (entry.type === "cycle" && entry.values) {
      const current = this._options[key] as string;
      const idx = entry.values.indexOf(current);
      const next = (idx + dir + entry.values.length) % entry.values.length;
      this._options[key] = entry.values[next] as never;
    }
  }
}
