// Post-battle results overlay — shows XP, gold, loot, and level-ups
import { Container, Graphics, Text, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGItem } from "@rpg/state/RPGState";

import displaycaseUrl from "@/img/displaycase.png";
import longswordUrl from "@/img/longsword.png";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0x4444aa;
const GOLD_COLOR = 0xffd700;
const XP_COLOR = 0x88bbff;
const LOOT_COLOR = 0x88ff88;
const LEVEL_UP_COLOR = 0xffaa00;
const TEXT_COLOR = 0xcccccc;

// ---------------------------------------------------------------------------
// BattleResultsView
// ---------------------------------------------------------------------------

export interface BattleResults {
  victory: boolean;
  xpGained: number;
  goldGained: number;
  lootItems: RPGItem[];
  levelUps: { name: string; newLevel: number; note?: string }[];
}

export class BattleResultsView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  onDismiss: (() => void) | null = null;

  init(vm: ViewManager, results: BattleResults): void {
    this.vm = vm;

    vm.addToLayer("ui", this.container);

    this._draw(results);
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

  private _draw(results: BattleResults): void {
    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.6 });
    this.container.addChild(overlay);

    // Panel
    const panelW = Math.min(400, W - 40);
    const panelX = (W - panelW) / 2;
    const panelY = H * 0.15;
    const panelH = H * 0.65;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Banner image (top-right corner of panel)
    const bannerUrl = results.victory ? displaycaseUrl : longswordUrl;
    const imgSize = 70;
    void Assets.load(bannerUrl).then((tex: Texture) => {
      if (this.container.destroyed) return;
      const sprite = new Sprite(tex);
      const scale = Math.min(imgSize / tex.width, imgSize / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        panelX + panelW - imgSize - 15 + (imgSize - tex.width * scale) / 2,
        panelY + 12 + (imgSize - tex.height * scale) / 2,
      );
      sprite.alpha = 0.8;
      this.container.addChild(sprite);
    });

    let y = panelY + 20;

    // Title
    const titleText = results.victory ? "VICTORY!" : "DEFEAT";
    const titleColor = results.victory ? GOLD_COLOR : 0xaa4444;
    const title = new Text({
      text: titleText,
      style: { fontFamily: "monospace", fontSize: 24, fill: titleColor, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, y);
    this.container.addChild(title);
    y += 45;

    // Divider
    const divider = new Graphics();
    divider.rect(panelX + 20, y, panelW - 40, 1);
    divider.fill({ color: BORDER_COLOR });
    this.container.addChild(divider);
    y += 15;

    if (results.victory) {
      // XP gained
      const xpLine = new Text({
        text: `Experience gained: +${results.xpGained} XP`,
        style: { fontFamily: "monospace", fontSize: 14, fill: XP_COLOR },
      });
      xpLine.position.set(panelX + 25, y);
      this.container.addChild(xpLine);
      y += 28;

      // Gold gained
      const goldLine = new Text({
        text: `Gold earned: +${results.goldGained}`,
        style: { fontFamily: "monospace", fontSize: 14, fill: GOLD_COLOR },
      });
      goldLine.position.set(panelX + 25, y);
      this.container.addChild(goldLine);
      y += 35;

      // Level ups
      if (results.levelUps.length > 0) {
        const lvlHeader = new Text({
          text: "Level Up!",
          style: { fontFamily: "monospace", fontSize: 16, fill: LEVEL_UP_COLOR, fontWeight: "bold" },
        });
        lvlHeader.position.set(panelX + 25, y);
        this.container.addChild(lvlHeader);
        y += 24;

        for (const lu of results.levelUps) {
          const luText = new Text({
            text: `  ${lu.name} reached Level ${lu.newLevel}!`,
            style: { fontFamily: "monospace", fontSize: 13, fill: LEVEL_UP_COLOR },
          });
          luText.position.set(panelX + 25, y);
          this.container.addChild(luText);
          y += 22;
          if (lu.note) {
            const noteText = new Text({
              text: `    ${lu.note}`,
              style: { fontFamily: "monospace", fontSize: 11, fill: 0xaa88cc },
            });
            noteText.position.set(panelX + 25, y);
            this.container.addChild(noteText);
            y += 18;
          }
        }
        y += 10;
      }

      // Loot
      if (results.lootItems.length > 0) {
        const lootHeader = new Text({
          text: "Items Found:",
          style: { fontFamily: "monospace", fontSize: 14, fill: LOOT_COLOR, fontWeight: "bold" },
        });
        lootHeader.position.set(panelX + 25, y);
        this.container.addChild(lootHeader);
        y += 22;

        for (const item of results.lootItems) {
          const itemText = new Text({
            text: `  + ${item.name}`,
            style: { fontFamily: "monospace", fontSize: 12, fill: LOOT_COLOR },
          });
          itemText.position.set(panelX + 25, y);
          this.container.addChild(itemText);
          y += 20;
        }
      } else {
        const noLoot = new Text({
          text: "No items found.",
          style: { fontFamily: "monospace", fontSize: 12, fill: 0x666666 },
        });
        noLoot.position.set(panelX + 25, y);
        this.container.addChild(noLoot);
      }
    } else {
      // Defeat message
      const defeatMsg = new Text({
        text: "Your party was defeated.\nYou lost some gold and were\nrevived with 1 HP each.",
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: TEXT_COLOR,
          wordWrap: true,
          wordWrapWidth: panelW - 50,
          lineHeight: 22,
        },
      });
      defeatMsg.position.set(panelX + 25, y);
      this.container.addChild(defeatMsg);
    }

    // Continue prompt
    const continueText = new Text({
      text: "Press Enter to continue",
      style: { fontFamily: "monospace", fontSize: 12, fill: 0x888888 },
    });
    continueText.anchor.set(0.5, 0);
    continueText.position.set(W / 2, panelY + panelH - 35);
    this.container.addChild(continueText);
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space" || e.code === "Escape") {
        this.onDismiss?.();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
