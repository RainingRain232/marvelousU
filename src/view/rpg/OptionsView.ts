// Options screen — game settings (accessible from main menu and in-game via Escape)
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { t } from "@/i18n/i18n";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BG_COLOR = 0x080816;
const PANEL_COLOR = 0x10102a;
const BORDER_COLOR = 0x5555cc;
const TITLE_COLOR = 0xffdd44;
const OPTION_COLOR = 0xddddf8;
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
  randomEncounterRate: number;  // 0–200 (100 = normal)
  roamingEncounterRate: number; // 0–200 (100 = normal)
}

const DEFAULT_OPTIONS: GameOptions = {
  musicVolume: 70,
  sfxVolume: 80,
  battleMode: "turn",
  textSpeed: "normal",
  showMinimap: true,
  randomEncounterRate: 100,
  roamingEncounterRate: 100,
};

const OPTIONS_STORAGE_KEY = "rpg_options";

export function loadOptions(): GameOptions {
  try {
    const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPTIONS };
    const parsed = JSON.parse(raw);
    // Migrate old single spawnRate to new split rates
    if (parsed.spawnRate !== undefined && parsed.randomEncounterRate === undefined) {
      parsed.randomEncounterRate = parsed.spawnRate;
      parsed.roamingEncounterRate = parsed.spawnRate;
      delete parsed.spawnRate;
    }
    return { ...DEFAULT_OPTIONS, ...parsed };
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
  max?: number; // max value for sliders (default 100)
}

const OPTION_ENTRIES: OptionEntry[] = [
  { label: t("rpg.music_volume"), key: "musicVolume", type: "slider" },
  { label: t("rpg.sfx_volume"), key: "sfxVolume", type: "slider" },
  { label: t("rpg.random_encounters"), key: "randomEncounterRate", type: "slider", max: 200 },
  { label: t("rpg.roaming_encounters"), key: "roamingEncounterRate", type: "slider", max: 200 },
  { label: t("rpg.battle_mode"), key: "battleMode", type: "cycle", values: ["turn", "auto"] },
  { label: t("rpg.text_speed"), key: "textSpeed", type: "cycle", values: ["slow", "normal", "fast"] },
  { label: t("rpg.show_minimap"), key: "showMinimap", type: "toggle" },
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
      window.removeEventListener("keydown", this._onKeyDown, true);
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
    const panelH = Math.min(430, H - 60);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.98 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: t("rpg.options_title"),
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
        hlGfx.roundRect(panelX + 10, y - 4, panelW - 20, rowH - 8, 5);
        hlGfx.fill({ color: 0x222255, alpha: 0.8 });
        hlGfx.stroke({ color: SELECTED_COLOR, width: 1, alpha: 0.4 });
        this.container.addChild(hlGfx);
      }

      // Clickable row
      const rowHit = new Graphics();
      rowHit.rect(panelX + 10, y - 4, panelW - 20, rowH - 8);
      rowHit.fill({ color: 0xffffff, alpha: 0.001 });
      rowHit.eventMode = "static";
      rowHit.cursor = "pointer";
      const rowIdx = i;
      rowHit.on("pointerover", () => { this._selectedIndex = rowIdx; this._draw(); });
      rowHit.on("pointertap", () => {
        this._selectedIndex = rowIdx;
        this._adjustValue(1);
        this._draw();
      });
      this.container.addChild(rowHit);

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
        const sliderMax = entry.max ?? 100;
        const barW = 140;
        const barH = 12;
        const barX = panelX + panelW - barW - 60;
        const barY = y + 12;

        const barBg = new Graphics();
        barBg.roundRect(barX, barY, barW, barH, 3);
        barBg.fill({ color: BAR_BG });
        this.container.addChild(barBg);

        const fillW = (val as number) / sliderMax * barW;
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

    // Close button
    const closeBtnW = 100;
    const closeBtnH = 28;
    const closeX = W / 2 - closeBtnW / 2;
    const closeY = panelY + panelH - 58;
    const closeBtn = new Graphics();
    closeBtn.roundRect(closeX, closeY, closeBtnW, closeBtnH, 5);
    closeBtn.fill({ color: 0x222244, alpha: 0.8 });
    closeBtn.stroke({ color: 0x5555cc, width: 1 });
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.on("pointertap", () => {
      saveOptions(this._options);
      this.onOptionsChanged?.(this._options);
      this.onClose?.();
    });
    closeBtn.on("pointerover", () => { closeBtn.tint = 0xccccff; });
    closeBtn.on("pointerout", () => { closeBtn.tint = 0xffffff; });
    this.container.addChild(closeBtn);
    const closeBtnLabel = new Text({
      text: "Close",
      style: { fontFamily: "monospace", fontSize: 12, fill: 0xaaaacc, fontWeight: "bold" },
    });
    closeBtnLabel.anchor.set(0.5, 0.5);
    closeBtnLabel.position.set(W / 2, closeY + closeBtnH / 2);
    this.container.addChild(closeBtnLabel);

    // Footer
    const footer = new Text({
      text: t("rpg.options_nav"),
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 24);
    this.container.addChild(footer);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
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
    window.addEventListener("keydown", this._onKeyDown, true);
  }

  private _adjustValue(dir: number): void {
    const entry = OPTION_ENTRIES[this._selectedIndex];
    const key = entry.key;

    if (entry.type === "slider") {
      const sliderMax = entry.max ?? 100;
      const current = this._options[key] as number;
      this._options[key] = Math.max(0, Math.min(sliderMax, current + dir * 10)) as never;
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
