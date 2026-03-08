// Colosseum main menu — New Tournament, Rankings, Back
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { ColosseumSaveData } from "../state/ColosseumPersistence";
import { COLOSSEUM_TIERS, getAvailableColosseumTiers } from "../config/ColosseumDefs";
import { getEloRankTitle } from "../systems/RankedSystem";

// ---------------------------------------------------------------------------
// Colours (matches MainMenuView)
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const PANEL_COLOR = 0x12122a;
const BORDER_COLOR = 0x4444aa;
const TITLE_COLOR = 0xffdd44;
const OPTION_COLOR = 0xeeeeff;
const SELECTED_COLOR = 0xffcc00;
const DIM_COLOR = 0x666688;
const GOLD_COLOR = 0xffd700;
const ELO_COLOR = 0x88bbff;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

interface MenuCallbacks {
  onNewTournament: (tierIndex: number) => void;
  onRankings: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// ColosseumMenuView
// ---------------------------------------------------------------------------

export class ColosseumMenuView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _selectedIndex = 0;
  private _callbacks!: MenuCallbacks;
  private _options: { label: string; action: string; enabled: boolean; tierIndex?: number }[] = [];
  private _saved!: ColosseumSaveData;

  init(vm: ViewManager, saved: ColosseumSaveData, callbacks: MenuCallbacks): void {
    this.vm = vm;
    this._saved = saved;
    this._callbacks = callbacks;

    vm.addToLayer("ui", this.container);

    this._buildOptions();
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

  private _buildOptions(): void {
    const tiers = getAvailableColosseumTiers(this._saved.elo);
    this._options = [];

    for (let i = 0; i < COLOSSEUM_TIERS.length; i++) {
      const tier = COLOSSEUM_TIERS[i];
      const available = tiers.includes(tier);
      this._options.push({
        label: `${tier.name} (Entry: ${tier.entryFee}g, Lv ${tier.levelRange[0]}-${tier.levelRange[1]})`,
        action: "tournament",
        enabled: available && this._saved.gold >= tier.entryFee,
        tierIndex: i,
      });
    }

    this._options.push({ label: "Rankings", action: "rankings", enabled: true });
    this._options.push({ label: "Back to Menu", action: "back", enabled: true });
  }

  private _draw(): void {
    this.container.removeChildren();
    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Background
    const bg = new Graphics().rect(0, 0, W, H).fill({ color: BG_COLOR });
    this.container.addChild(bg);

    // Title
    const title = new Text({
      text: "THE COLOSSEUM",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 32, fill: TITLE_COLOR, fontWeight: "bold", letterSpacing: 4 }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 40);
    this.container.addChild(title);

    // Stats panel
    const rankTitle = getEloRankTitle(this._saved.elo);
    const statsText = new Text({
      text: `Gold: ${this._saved.gold}  |  ELO: ${this._saved.elo} (${rankTitle})  |  Season ${this._saved.season}: ${this._saved.seasonWins}W ${this._saved.seasonLosses}L  |  Tournaments Won: ${this._saved.tournamentsWon}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: GOLD_COLOR }),
    });
    statsText.anchor.set(0.5, 0);
    statsText.position.set(W / 2, 90);
    this.container.addChild(statsText);

    // Panel
    const panelW = 600;
    const panelH = this._options.length * 40 + 40;
    const panelX = (W - panelW) / 2;
    const panelY = 130;

    const panel = new Graphics()
      .roundRect(panelX, panelY, panelW, panelH, 8)
      .fill({ color: PANEL_COLOR, alpha: 0.95 })
      .roundRect(panelX, panelY, panelW, panelH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });
    this.container.addChild(panel);

    // Section header
    const header = new Text({
      text: "SELECT TOURNAMENT",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: ELO_COLOR, letterSpacing: 2 }),
    });
    header.position.set(panelX + 20, panelY + 12);
    this.container.addChild(header);

    // Options
    for (let i = 0; i < this._options.length; i++) {
      const opt = this._options[i];
      const isSelected = i === this._selectedIndex;
      const color = !opt.enabled ? DIM_COLOR : isSelected ? SELECTED_COLOR : OPTION_COLOR;

      const prefix = isSelected ? "> " : "  ";
      const text = new Text({
        text: `${prefix}${opt.label}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: color, fontWeight: isSelected ? "bold" : "normal" }),
      });
      text.position.set(panelX + 20, panelY + 40 + i * 40);
      this.container.addChild(text);
    }

    // Instructions
    const instr = new Text({
      text: "[↑/↓] Navigate   [Enter] Select   [Esc] Back",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR }),
    });
    instr.anchor.set(0.5, 0);
    instr.position.set(W / 2, panelY + panelH + 20);
    this.container.addChild(instr);
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        this._selectedIndex = (this._selectedIndex - 1 + this._options.length) % this._options.length;
        this._draw();
      } else if (e.key === "ArrowDown") {
        this._selectedIndex = (this._selectedIndex + 1) % this._options.length;
        this._draw();
      } else if (e.key === "Enter") {
        const opt = this._options[this._selectedIndex];
        if (!opt.enabled) return;
        if (opt.action === "tournament" && opt.tierIndex !== undefined) {
          this._callbacks.onNewTournament(opt.tierIndex);
        } else if (opt.action === "rankings") {
          this._callbacks.onRankings();
        } else if (opt.action === "back") {
          this._callbacks.onBack();
        }
      } else if (e.key === "Escape") {
        this._callbacks.onBack();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
