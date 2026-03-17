// ---------------------------------------------------------------------------
// Rift Wizard mode – contextual tutorial tip system (PixiJS overlay)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";

const TUTORIAL_KEY = "rift_wizard_tutorial_seen";

interface TutorialTip {
  id: string;
  title: string;
  text: string;
  condition: string; // checked by the game orchestrator
}

const TIPS: TutorialTip[] = [
  {
    id: "move",
    title: "Movement",
    text: "Use WASD or Arrow Keys to move.\nEach move takes one turn.",
    condition: "first_turn",
  },
  {
    id: "spell",
    title: "Casting Spells",
    text: "Press 1-9 to select a spell,\nthen click or use arrows to target.\nPress Enter to cast.",
    condition: "first_spell_select",
  },
  {
    id: "interact",
    title: "Interact",
    text: "Press E to interact with shrines,\npick up items, or enter portals.",
    condition: "first_interact_available",
  },
  {
    id: "shop",
    title: "Spell Shop",
    text: "Spend SP to learn new spells,\nupgrade existing ones, or\nlearn passive abilities.",
    condition: "first_shop",
  },
  {
    id: "shrine",
    title: "Shrines",
    text: "Shrines boost your spells matching\ntheir school. They also grant\n+1 bonus SP!",
    condition: "first_shrine_nearby",
  },
  {
    id: "boss",
    title: "Boss Fight!",
    text: "A powerful boss guards this level.\nUse your spells wisely!",
    condition: "first_boss",
  },
  {
    id: "consumable",
    title: "Consumables",
    text: "Press P for health potion,\nC for charge scroll.\nThey don't cost a turn!",
    condition: "first_consumable",
  },
];

export class RiftWizardTutorial {
  readonly container = new Container();
  private _seenTips: Set<string>;
  private _activeTip: TutorialTip | null = null;
  private _dismissed = false;
  private _enabled = true;

  constructor() {
    const seen = localStorage.getItem(TUTORIAL_KEY);
    this._seenTips = new Set(seen ? JSON.parse(seen) : []);
  }

  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(v: boolean) {
    this._enabled = v;
  }

  /** Try to show a tip for the given condition. Returns true if shown. */
  tryShow(condition: string): boolean {
    if (!this._enabled || this._activeTip) return false;
    const tip = TIPS.find((t) => t.condition === condition && !this._seenTips.has(t.id));
    if (!tip) return false;
    this._activeTip = tip;
    this._dismissed = false;
    return true;
  }

  /** Dismiss the current tip */
  dismiss(): void {
    if (this._activeTip) {
      this._seenTips.add(this._activeTip.id);
      localStorage.setItem(TUTORIAL_KEY, JSON.stringify([...this._seenTips]));
      this._activeTip = null;
      this._dismissed = true;
    }
  }

  /** Check if a tip is currently showing */
  get isShowing(): boolean {
    return this._activeTip !== null;
  }

  /** Reset all seen tips */
  reset(): void {
    this._seenTips.clear();
    localStorage.removeItem(TUTORIAL_KEY);
  }

  /** Draw the tutorial overlay */
  draw(sw: number, sh: number): void {
    this.container.removeChildren();
    if (!this._activeTip) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;

    // Semi-transparent backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.4 });
    this.container.addChild(bg);

    // Tip panel — centered, ornate medieval style
    const panelW = 380;
    const panelH = 200;
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    const panel = new Graphics();
    // Shadow
    panel.roundRect(px + 3, py + 3, panelW, panelH, 8);
    panel.fill({ color: 0x000000, alpha: 0.5 });
    // Main panel
    panel.roundRect(px, py, panelW, panelH, 8);
    panel.fill({ color: 0x1a1a2e, alpha: 0.95 });
    // Gold border
    panel.roundRect(px, py, panelW, panelH, 8);
    panel.stroke({ color: 0xdaa520, width: 2 });
    // Inner border
    panel.roundRect(px + 4, py + 4, panelW - 8, panelH - 8, 6);
    panel.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.3 });
    // Title bar
    panel.rect(px + 4, py + 4, panelW - 8, 28);
    panel.fill({ color: 0xdaa520, alpha: 0.15 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: this._activeTip.title,
      style: { fontFamily: "Georgia, serif", fontSize: 18, fill: 0xffd700, fontWeight: "bold" },
    });
    title.position.set(px + 15, py + 8);
    this.container.addChild(title);

    // Body text
    const body = new Text({
      text: this._activeTip.text,
      style: { fontFamily: "Georgia, serif", fontSize: 14, fill: 0xdddddd, lineHeight: 22 },
    });
    body.position.set(px + 15, py + 45);
    this.container.addChild(body);

    // Dismiss hint
    const hint = new Text({
      text: "Press SPACE or click to continue",
      style: { fontFamily: "Georgia, serif", fontSize: 12, fill: 0x888899 },
    });
    hint.position.set(px + 15, py + panelH - 30);
    this.container.addChild(hint);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
