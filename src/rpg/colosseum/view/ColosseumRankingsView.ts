// Rankings view — ELO leaderboard, season stats
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { getLeaderboard } from "@rpg/systems/LeaderboardSystem";
import type { ColosseumSaveData } from "../state/ColosseumPersistence";
import { getEloRankTitle, getSeasonRewards } from "../systems/RankedSystem";

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
const GOLD_COLOR = 0xffd700;
const ELO_COLOR = 0x88bbff;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

interface RankingsCallbacks {
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// ColosseumRankingsView
// ---------------------------------------------------------------------------

export class ColosseumRankingsView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _saved!: ColosseumSaveData;
  private _callbacks!: RankingsCallbacks;

  init(vm: ViewManager, saved: ColosseumSaveData, callbacks: RankingsCallbacks): void {
    this.vm = vm;
    this._saved = saved;
    this._callbacks = callbacks;

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

    const bg = new Graphics().rect(0, 0, W, H).fill({ color: BG_COLOR });
    this.container.addChild(bg);

    // Title
    const title = new Text({
      text: "COLOSSEUM RANKINGS",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: TITLE_COLOR, fontWeight: "bold", letterSpacing: 3 }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 30);
    this.container.addChild(title);

    const panelW = 500;
    const panelX = (W - panelW) / 2;
    let y = 80;

    // Player stats panel
    const statsPanel = new Graphics()
      .roundRect(panelX, y, panelW, 100, 8)
      .fill({ color: PANEL_COLOR, alpha: 0.95 })
      .roundRect(panelX, y, panelW, 100, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });
    this.container.addChild(statsPanel);

    const rankTitle = getEloRankTitle(this._saved.elo);
    const seasonReward = getSeasonRewards(this._saved.elo);

    const lines = [
      `ELO Rating: ${this._saved.elo}  (${rankTitle})`,
      `Season ${this._saved.season}: ${this._saved.seasonWins}W / ${this._saved.seasonLosses}L`,
      `Tournaments Won: ${this._saved.tournamentsWon} / ${this._saved.tournamentsPlayed}`,
      seasonReward ? `Season Reward: ${seasonReward.title} (+${seasonReward.gold}g)` : "No season reward yet",
    ];

    for (let i = 0; i < lines.length; i++) {
      const color = i === 0 ? ELO_COLOR : i === 3 ? GOLD_COLOR : OPTION_COLOR;
      const text = new Text({
        text: lines[i],
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: color }),
      });
      text.position.set(panelX + 15, y + 10 + i * 22);
      this.container.addChild(text);
    }

    y += 120;

    // Leaderboard
    const lbHeader = new Text({
      text: "TOP ELO SCORES",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: SELECTED_COLOR, letterSpacing: 2 }),
    });
    lbHeader.position.set(panelX, y);
    this.container.addChild(lbHeader);
    y += 28;

    const entries = getLeaderboard("colosseumElo");
    if (entries.length === 0) {
      const empty = new Text({
        text: "No entries yet. Complete a tournament!",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR }),
      });
      empty.position.set(panelX, y);
      this.container.addChild(empty);
    } else {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const text = new Text({
          text: `${(i + 1).toString().padStart(2, " ")}. ${entry.name.padEnd(20, " ")} ELO: ${entry.value}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: i === 0 ? GOLD_COLOR : OPTION_COLOR }),
        });
        text.position.set(panelX, y);
        this.container.addChild(text);
        y += 20;
      }
    }

    // High scores from persistence
    y += 20;
    if (this._saved.highScores.length > 0) {
      const hsHeader = new Text({
        text: "PERSONAL BEST",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: SELECTED_COLOR, letterSpacing: 2 }),
      });
      hsHeader.position.set(panelX, y);
      this.container.addChild(hsHeader);
      y += 28;

      for (let i = 0; i < Math.min(5, this._saved.highScores.length); i++) {
        const hs = this._saved.highScores[i];
        const date = new Date(hs.date).toLocaleDateString();
        const text = new Text({
          text: `Season ${hs.season} — ELO: ${hs.elo}, Won: ${hs.tournamentsWon} (${date})`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR }),
        });
        text.position.set(panelX, y);
        this.container.addChild(text);
        y += 18;
      }
    }

    // Back instruction
    const instr = new Text({
      text: "[Esc / Enter] Back",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR }),
    });
    instr.anchor.set(0.5, 0);
    instr.position.set(W / 2, H - 30);
    this.container.addChild(instr);
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        this._callbacks.onBack();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
