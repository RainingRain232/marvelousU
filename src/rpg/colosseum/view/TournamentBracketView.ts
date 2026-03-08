// Tournament bracket display — 8-team single elimination
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { TournamentState, TournamentMatch } from "../state/ColosseumState";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const PANEL_COLOR = 0x181830;
const BORDER_COLOR = 0x4444aa;
const TITLE_COLOR = 0xffdd44;
const TEAM_COLOR = 0xeeeeff;
const WINNER_COLOR = 0x44ff44;
const LOSER_COLOR = 0x555566;
const SELECTED_COLOR = 0xffcc00;
const DIM_COLOR = 0x666688;
const PLAYER_COLOR = 0x88bbff;
const GOLD_COLOR = 0xffd700;
const LINE_COLOR = 0x3333aa;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

interface BracketCallbacks {
  onMatchSelected: (match: TournamentMatch) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// TournamentBracketView
// ---------------------------------------------------------------------------

export class TournamentBracketView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _tournament!: TournamentState;
  private _playerTeamId!: string;
  private _gold!: number;
  private _callbacks!: BracketCallbacks;
  private _selectedMatchIndex = 0;
  private _selectableMatches: TournamentMatch[] = [];

  init(
    vm: ViewManager,
    tournament: TournamentState,
    playerTeamId: string,
    gold: number,
    callbacks: BracketCallbacks,
  ): void {
    this.vm = vm;
    this._tournament = tournament;
    this._playerTeamId = playerTeamId;
    this._gold = gold;
    this._callbacks = callbacks;

    vm.addToLayer("ui", this.container);

    this._updateSelectableMatches();
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

  private _updateSelectableMatches(): void {
    this._selectableMatches = this._tournament.matches.filter(
      m => !m.winnerId && m.team1Id && m.team2Id,
    );
    if (this._selectedMatchIndex >= this._selectableMatches.length) {
      this._selectedMatchIndex = Math.max(0, this._selectableMatches.length - 1);
    }
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
      text: "TOURNAMENT BRACKET",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: TITLE_COLOR, fontWeight: "bold", letterSpacing: 3 }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 15);
    this.container.addChild(title);

    // Gold
    const goldText = new Text({
      text: `Gold: ${this._gold}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: GOLD_COLOR }),
    });
    goldText.position.set(20, 20);
    this.container.addChild(goldText);

    // Draw bracket in 3 columns
    const colWidth = W / 4;
    const roundNames = ["QUARTERFINALS", "SEMIFINALS", "FINAL"];
    const matchCountPerRound = [4, 2, 1];

    for (let round = 0; round < 3; round++) {
      const colX = colWidth * (round + 0.5);
      const matches = this._tournament.matches.filter(m => m.round === round);
      const spacing = H / (matchCountPerRound[round] + 1);

      // Round header
      const roundHeader = new Text({
        text: roundNames[round],
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR, letterSpacing: 1 }),
      });
      roundHeader.anchor.set(0.5, 0);
      roundHeader.position.set(colX, 50);
      this.container.addChild(roundHeader);

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const y = spacing * (i + 1);
        this._drawMatch(colX, y, match, colWidth * 0.8);

        // Draw connector lines
        if (round < 2) {
          const nextRound = round + 1;
          const nextMatches = this._tournament.matches.filter(m => m.round === nextRound);
          const nextSpacing = H / (matchCountPerRound[nextRound] + 1);
          const nextMatchIdx = Math.floor(i / 2);
          if (nextMatchIdx < nextMatches.length) {
            const nextY = nextSpacing * (nextMatchIdx + 1);
            const nextX = colWidth * (nextRound + 0.5);
            const line = new Graphics();
            line.moveTo(colX + colWidth * 0.4, y).lineTo(nextX - colWidth * 0.4, nextY);
            line.stroke({ color: LINE_COLOR, alpha: 0.3, width: 1 });
            this.container.addChild(line);
          }
        }
      }
    }

    // Instructions
    const instr = new Text({
      text: this._selectableMatches.length > 0
        ? "[↑/↓] Select match  [Enter] View match  [Esc] Forfeit"
        : "All matches resolved!  [Enter/Esc] Continue",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR }),
    });
    instr.anchor.set(0.5, 0);
    instr.position.set(W / 2, H - 30);
    this.container.addChild(instr);
  }

  private _drawMatch(x: number, y: number, match: TournamentMatch, width: number): void {
    const isSelectable = this._selectableMatches.includes(match);
    const isSelected = isSelectable && this._selectableMatches[this._selectedMatchIndex] === match;

    const matchW = width;
    const matchH = 50;
    const mx = x - matchW / 2;
    const my = y - matchH / 2;

    // Background
    const borderCol = isSelected ? SELECTED_COLOR : (match.winnerId ? WINNER_COLOR : BORDER_COLOR);
    const panel = new Graphics()
      .roundRect(mx, my, matchW, matchH, 4)
      .fill({ color: PANEL_COLOR, alpha: 0.9 })
      .roundRect(mx, my, matchW, matchH, 4)
      .stroke({ color: borderCol, alpha: isSelected ? 0.9 : 0.5, width: isSelected ? 2 : 1 });
    this.container.addChild(panel);

    // Team 1
    const team1 = this._tournament.teams.find(t => t.id === match.team1Id);
    const team1Name = team1?.name ?? "TBD";
    const team1Won = match.winnerId === match.team1Id;
    const team1Lost = match.winnerId && !team1Won;
    const team1IsPlayer = match.team1Id === this._playerTeamId;

    const t1Color = team1Won ? WINNER_COLOR : team1Lost ? LOSER_COLOR : team1IsPlayer ? PLAYER_COLOR : TEAM_COLOR;
    const t1 = new Text({
      text: team1Name,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: t1Color }),
    });
    t1.position.set(mx + 6, my + 4);
    this.container.addChild(t1);

    // Team 2
    const team2 = this._tournament.teams.find(t => t.id === match.team2Id);
    const team2Name = team2?.name ?? "TBD";
    const team2Won = match.winnerId === match.team2Id;
    const team2Lost = match.winnerId && !team2Won;
    const team2IsPlayer = match.team2Id === this._playerTeamId;

    const t2Color = team2Won ? WINNER_COLOR : team2Lost ? LOSER_COLOR : team2IsPlayer ? PLAYER_COLOR : TEAM_COLOR;
    const t2 = new Text({
      text: team2Name,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: t2Color }),
    });
    t2.position.set(mx + 6, my + 26);
    this.container.addChild(t2);

    // Odds
    if (!match.winnerId && match.team1Id && match.team2Id) {
      const oddsStr = `${match.team1Odds.toFixed(1)}x / ${match.team2Odds.toFixed(1)}x`;
      const odds = new Text({
        text: oddsStr,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: GOLD_COLOR }),
      });
      odds.anchor.set(1, 0.5);
      odds.position.set(mx + matchW - 6, my + matchH / 2);
      this.container.addChild(odds);
    }

    // "VS" divider
    const vs = new Text({
      text: "vs",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: DIM_COLOR }),
    });
    vs.anchor.set(0, 0.5);
    vs.position.set(mx + 6, my + 22);
    this.container.addChild(vs);
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this._callbacks.onBack();
        return;
      }

      if (this._selectableMatches.length === 0) {
        if (e.key === "Enter") {
          this._callbacks.onBack();
        }
        return;
      }

      if (e.key === "ArrowUp") {
        this._selectedMatchIndex = (this._selectedMatchIndex - 1 + this._selectableMatches.length) % this._selectableMatches.length;
        this._draw();
      } else if (e.key === "ArrowDown") {
        this._selectedMatchIndex = (this._selectedMatchIndex + 1) % this._selectableMatches.length;
        this._draw();
      } else if (e.key === "Enter") {
        const match = this._selectableMatches[this._selectedMatchIndex];
        if (match) {
          this._callbacks.onMatchSelected(match);
        }
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
