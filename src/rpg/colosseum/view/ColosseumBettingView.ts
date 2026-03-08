// Pre-match betting view — team comparison, odds, bet placement
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { TournamentMatch, ColosseumTeam } from "../state/ColosseumState";
import { COLOSSEUM_BET_AMOUNTS } from "../config/ColosseumDefs";

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
const STAT_COLOR = 0x88ff88;
const VS_COLOR = 0xff4444;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

interface BettingCallbacks {
  onPlaceBet: (teamId: string, amount: number) => void;
  onFight: () => void;
  onAutoResolve: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// ColosseumBettingView
// ---------------------------------------------------------------------------

export class ColosseumBettingView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _match!: TournamentMatch;
  private _teams!: ColosseumTeam[];
  private _gold!: number;
  private _playerInMatch!: boolean;
  private _callbacks!: BettingCallbacks;

  // State
  private _selectedRow = 0; // 0 = bet on team1, 1 = bet on team2, 2 = bet amount, 3 = fight, 4 = auto, 5 = back
  private _betTeamId: string | null = null;
  private _betAmountIndex = 0;

  init(
    vm: ViewManager,
    match: TournamentMatch,
    teams: ColosseumTeam[],
    gold: number,
    playerInMatch: boolean,
    callbacks: BettingCallbacks,
  ): void {
    this.vm = vm;
    this._match = match;
    this._teams = teams;
    this._gold = gold;
    this._playerInMatch = playerInMatch;
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

  updateGold(gold: number): void {
    this._gold = gold;
    this._draw();
  }

  private _draw(): void {
    this.container.removeChildren();
    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    const bg = new Graphics().rect(0, 0, W, H).fill({ color: BG_COLOR });
    this.container.addChild(bg);

    const team1 = this._teams.find(t => t.id === this._match.team1Id);
    const team2 = this._teams.find(t => t.id === this._match.team2Id);

    // Title
    const title = new Text({
      text: "PRE-MATCH",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: TITLE_COLOR, fontWeight: "bold" }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 20);
    this.container.addChild(title);

    // Gold
    const goldText = new Text({
      text: `Gold: ${this._gold}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: GOLD_COLOR }),
    });
    goldText.anchor.set(0.5, 0);
    goldText.position.set(W / 2, 52);
    this.container.addChild(goldText);

    // VS panel
    const panelW = 600;
    const panelX = (W - panelW) / 2;
    let y = 80;

    // Team 1
    if (team1) {
      this._drawTeamPanel(panelX, y, panelW / 2 - 20, team1, this._match.team1Odds, this._match.team1Id);
    }

    // VS
    const vsText = new Text({
      text: "VS",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 28, fill: VS_COLOR, fontWeight: "bold" }),
    });
    vsText.anchor.set(0.5, 0.5);
    vsText.position.set(W / 2, y + 60);
    this.container.addChild(vsText);

    // Team 2
    if (team2) {
      this._drawTeamPanel(panelX + panelW / 2 + 20, y, panelW / 2 - 20, team2, this._match.team2Odds, this._match.team2Id);
    }

    y += 140;

    // Betting section
    const betAlreadyPlaced = this._match.playerBet !== null;

    if (!betAlreadyPlaced) {
      // Bet on team options
      const rows = [
        { label: `Bet on: ${team1?.name ?? "Team 1"} (${this._match.team1Odds.toFixed(1)}x)`, action: "bet1" },
        { label: `Bet on: ${team2?.name ?? "Team 2"} (${this._match.team2Odds.toFixed(1)}x)`, action: "bet2" },
        { label: `Bet amount: ${COLOSSEUM_BET_AMOUNTS[this._betAmountIndex]}g  [←/→]`, action: "amount" },
      ];

      for (let i = 0; i < rows.length; i++) {
        const isSelected = this._selectedRow === i;
        const color = isSelected ? SELECTED_COLOR : OPTION_COLOR;
        const prefix = isSelected ? "> " : "  ";

        const selected = (i === 0 && this._betTeamId === this._match.team1Id) ||
                         (i === 1 && this._betTeamId === this._match.team2Id);
        const marker = selected ? " [*]" : "";

        const text = new Text({
          text: `${prefix}${rows[i].label}${marker}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: color }),
        });
        text.position.set(panelX, y);
        this.container.addChild(text);
        y += 28;
      }
    } else {
      const betInfo = new Text({
        text: `Bet placed: ${this._match.playerBet!.amount}g on ${this._teams.find(t => t.id === this._match.playerBet!.teamId)?.name ?? "?"}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: GOLD_COLOR }),
      });
      betInfo.position.set(panelX, y);
      this.container.addChild(betInfo);
      y += 28;
    }

    y += 10;

    // Action buttons
    const actions = [
      { label: this._playerInMatch ? "Fight!" : "Watch", action: "fight" },
      { label: "Auto-resolve", action: "auto" },
      { label: "Back", action: "back" },
    ];

    const actionStartRow = betAlreadyPlaced ? 0 : 3;
    for (let i = 0; i < actions.length; i++) {
      const rowIdx = actionStartRow + i;
      const isSelected = this._selectedRow === rowIdx;
      const color = isSelected ? SELECTED_COLOR : OPTION_COLOR;
      const prefix = isSelected ? "> " : "  ";

      const text = new Text({
        text: `${prefix}${actions[i].label}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: color, fontWeight: isSelected ? "bold" : "normal" }),
      });
      text.position.set(panelX, y);
      this.container.addChild(text);
      y += 30;
    }

    // Instructions
    const instr = new Text({
      text: "[↑/↓] Navigate  [Enter] Select  [←/→] Adjust bet  [Esc] Back",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR }),
    });
    instr.anchor.set(0.5, 0);
    instr.position.set(W / 2, H - 25);
    this.container.addChild(instr);
  }

  private _drawTeamPanel(x: number, y: number, w: number, team: ColosseumTeam, odds: number, _teamId: string): void {
    const panel = new Graphics()
      .roundRect(x, y, w, 120, 6)
      .fill({ color: PANEL_COLOR, alpha: 0.9 })
      .roundRect(x, y, w, 120, 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.5, width: 1 });
    this.container.addChild(panel);

    const nameText = new Text({
      text: team.name,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: team.isPlayer ? SELECTED_COLOR : OPTION_COLOR, fontWeight: "bold" }),
    });
    nameText.position.set(x + 8, y + 8);
    this.container.addChild(nameText);

    const oddsText = new Text({
      text: `Odds: ${odds.toFixed(1)}x`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: GOLD_COLOR }),
    });
    oddsText.position.set(x + 8, y + 28);
    this.container.addChild(oddsText);

    const pwrText = new Text({
      text: `Power: ${team.powerLevel}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: STAT_COLOR }),
    });
    pwrText.position.set(x + 8, y + 46);
    this.container.addChild(pwrText);

    // List members (compact)
    let my = y + 64;
    for (const m of team.members.slice(0, 4)) {
      const mText = new Text({
        text: `${m.unitType} Lv${m.level}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR }),
      });
      mText.position.set(x + 8, my);
      this.container.addChild(mText);
      my += 14;
    }
  }

  private _setupInput(): void {
    const betAlreadyPlaced = this._match.playerBet !== null;
    const totalRows = betAlreadyPlaced ? 3 : 6;

    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this._callbacks.onBack();
        return;
      }

      if (e.key === "ArrowUp") {
        this._selectedRow = (this._selectedRow - 1 + totalRows) % totalRows;
        this._draw();
      } else if (e.key === "ArrowDown") {
        this._selectedRow = (this._selectedRow + 1) % totalRows;
        this._draw();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const amountRow = betAlreadyPlaced ? -1 : 2;
        if (this._selectedRow === amountRow) {
          this._betAmountIndex = (this._betAmountIndex + dir + COLOSSEUM_BET_AMOUNTS.length) % COLOSSEUM_BET_AMOUNTS.length;
          this._draw();
        }
      } else if (e.key === "Enter") {
        this._handleSelect();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleSelect(): void {
    const betAlreadyPlaced = this._match.playerBet !== null;
    const actionStart = betAlreadyPlaced ? 0 : 3;

    if (!betAlreadyPlaced) {
      if (this._selectedRow === 0) {
        this._betTeamId = this._match.team1Id;
        this._draw();
        return;
      } else if (this._selectedRow === 1) {
        this._betTeamId = this._match.team2Id;
        this._draw();
        return;
      } else if (this._selectedRow === 2) {
        // Place the bet
        if (this._betTeamId) {
          const amount = COLOSSEUM_BET_AMOUNTS[this._betAmountIndex];
          this._callbacks.onPlaceBet(this._betTeamId, amount);
          this._selectedRow = actionStart;
          this._draw();
        }
        return;
      }
    }

    const actionIdx = this._selectedRow - actionStart;
    if (actionIdx === 0) this._callbacks.onFight();
    else if (actionIdx === 1) this._callbacks.onAutoResolve();
    else if (actionIdx === 2) this._callbacks.onBack();
  }
}
