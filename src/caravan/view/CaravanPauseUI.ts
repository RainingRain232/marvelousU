// ---------------------------------------------------------------------------
// Caravan pause menu — resume, quit, stats display
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CaravanState } from "../state/CaravanState";

export class CaravanPauseUI {
  readonly container = new Container();
  private _resumeCallback: (() => void) | null = null;
  private _quitCallback: (() => void) | null = null;

  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }
  setQuitCallback(cb: () => void): void { this._quitCallback = cb; }

  show(state: CaravanState, sw: number, sh: number): void {
    this.container.removeChildren();

    // Dark overlay
    const bg = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });
    bg.eventMode = "static"; // block clicks through
    this.container.addChild(bg);

    // Panel
    const panelW = 300;
    const panelH = 280;
    const px = sw / 2 - panelW / 2;
    const py = sh / 2 - panelH / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, panelW, panelH, 8).fill({ color: 0x0c0c20, alpha: 0.95 });
    panel.roundRect(px, py, panelW, panelH, 8).stroke({ color: 0xffd700, width: 1, alpha: 0.3 });
    // Corner ornaments
    for (const [cx, cy, fx, fy] of [[px + 5, py + 5, 1, 1], [px + panelW - 5, py + 5, -1, 1], [px + 5, py + panelH - 5, 1, -1], [px + panelW - 5, py + panelH - 5, -1, -1]] as [number, number, number, number][]) {
      panel.moveTo(cx, cy).lineTo(cx + 10 * fx, cy).stroke({ color: 0xffd700, width: 1, alpha: 0.4 });
      panel.moveTo(cx, cy).lineTo(cx, cy + 10 * fy).stroke({ color: 0xffd700, width: 1, alpha: 0.4 });
    }
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: "PAUSED",
      style: new TextStyle({ fontFamily: "serif", fontSize: 24, fill: 0xffd700, fontWeight: "bold", letterSpacing: 3 }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, py + 16);
    this.container.addChild(title);

    // Divider
    panel.moveTo(px + 20, py + 48).lineTo(px + panelW - 20, py + 48)
      .stroke({ color: 0xffd700, width: 0.5, alpha: 0.2 });

    // Stats
    const mins = Math.floor(state.gameTime / 60);
    const secs = Math.floor(state.gameTime % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

    const stats = [
      `Time: ${timeStr}`,
      `Segment: ${state.segment + 1}/${state.difficulty === "endless" ? "∞" : state.totalSegments}`,
      `Hero: ${state.player.heroClass.name} Lv.${state.player.level}`,
      `Kills: ${state.totalKills}`,
      `Gold: ${state.gold}`,
      `Relics: ${state.relicIds.length}`,
      `Defense: ${state.defense}`,
    ];

    let sy = py + 58;
    for (const s of stats) {
      const t = new Text({
        text: s,
        style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0xaabbcc }),
      });
      t.anchor.set(0.5, 0);
      t.position.set(sw / 2, sy);
      this.container.addChild(t);
      sy += 18;
    }

    // Buttons
    const btnW = 160;
    const btnH = 34;
    sy += 10;

    // Resume button
    const resumeBtn = new Graphics();
    resumeBtn.roundRect(sw / 2 - btnW / 2, sy, btnW, btnH, 5).fill({ color: 0x1a3322 });
    resumeBtn.roundRect(sw / 2 - btnW / 2, sy, btnW, btnH, 5).stroke({ color: 0x44aa66, width: 1, alpha: 0.5 });
    resumeBtn.eventMode = "static";
    resumeBtn.cursor = "pointer";
    resumeBtn.on("pointerdown", () => this._resumeCallback?.());
    this.container.addChild(resumeBtn);
    const resumeText = new Text({
      text: "Resume",
      style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: 0x88ffaa, fontWeight: "bold" }),
    });
    resumeText.anchor.set(0.5, 0.5);
    resumeText.position.set(sw / 2, sy + btnH / 2);
    this.container.addChild(resumeText);
    sy += btnH + 10;

    // Quit button
    const quitBtn = new Graphics();
    quitBtn.roundRect(sw / 2 - btnW / 2, sy, btnW, btnH, 5).fill({ color: 0x331a1a });
    quitBtn.roundRect(sw / 2 - btnW / 2, sy, btnW, btnH, 5).stroke({ color: 0xaa4444, width: 1, alpha: 0.5 });
    quitBtn.eventMode = "static";
    quitBtn.cursor = "pointer";
    quitBtn.on("pointerdown", () => this._quitCallback?.());
    this.container.addChild(quitBtn);
    const quitText = new Text({
      text: "Quit to Menu",
      style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: 0xff8888, fontWeight: "bold" }),
    });
    quitText.anchor.set(0.5, 0.5);
    quitText.position.set(sw / 2, sy + btnH / 2);
    this.container.addChild(quitText);

    // ESC hint
    const hint = new Text({
      text: "Press ESC to resume",
      style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0x556666 }),
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(sw / 2, py + panelH - 22);
    this.container.addChild(hint);
  }

  hide(): void {
    this.container.removeChildren();
  }
}
