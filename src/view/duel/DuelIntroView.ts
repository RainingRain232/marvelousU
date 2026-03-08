// ---------------------------------------------------------------------------
// Duel mode – VS splash + round announcements
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";

const COL_BG = 0x000000;

export class DuelIntroView {
  readonly container = new Container();

  private _timer = 0;
  private _callback: (() => void) | null = null;

  /** Show VS splash screen for two characters. */
  show(
    sw: number,
    sh: number,
    p1Id: string,
    p2Id: string,
    onComplete: () => void,
  ): void {
    this.container.removeChildren();
    this._callback = onComplete;
    this._timer = 120; // 2 seconds

    const p1 = DUEL_CHARACTERS[p1Id];
    const p2 = DUEL_CHARACTERS[p2Id];

    // Dark overlay
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: COL_BG, alpha: 0.85 });
    this.container.addChild(bg);

    // P1 side
    const p1Name = new Text({
      text: p1.name.toUpperCase(),
      style: { fontFamily: "monospace", fontSize: 36, fill: 0x4488ff, fontWeight: "bold" },
    });
    p1Name.anchor.set(0.5);
    p1Name.position.set(sw * 0.25, sh * 0.4);
    this.container.addChild(p1Name);

    const p1Title = new Text({
      text: p1.title,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x88aacc },
    });
    p1Title.anchor.set(0.5);
    p1Title.position.set(sw * 0.25, sh * 0.4 + 30);
    this.container.addChild(p1Title);

    // VS
    const vs = new Text({
      text: "VS",
      style: { fontFamily: "monospace", fontSize: 64, fill: 0xff4444, fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 } },
    });
    vs.anchor.set(0.5);
    vs.position.set(sw / 2, sh * 0.4);
    this.container.addChild(vs);

    // P2 side
    const p2Name = new Text({
      text: p2.name.toUpperCase(),
      style: { fontFamily: "monospace", fontSize: 36, fill: 0xff4444, fontWeight: "bold" },
    });
    p2Name.anchor.set(0.5);
    p2Name.position.set(sw * 0.75, sh * 0.4);
    this.container.addChild(p2Name);

    const p2Title = new Text({
      text: p2.title,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xcc8888 },
    });
    p2Title.anchor.set(0.5);
    p2Title.position.set(sw * 0.75, sh * 0.4 + 30);
    this.container.addChild(p2Title);

    // Divider line
    const line = new Graphics();
    line.moveTo(sw / 2, sh * 0.15);
    line.lineTo(sw / 2, sh * 0.85);
    line.stroke({ color: 0x444444, width: 2 });
    this.container.addChild(line);

    this.container.visible = true;
  }

  /** Call each frame. Returns true when done. */
  update(): boolean {
    if (this._timer > 0) {
      this._timer--;
      if (this._timer <= 0) {
        this.container.visible = false;
        this._callback?.();
        return true;
      }
    }
    return false;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
