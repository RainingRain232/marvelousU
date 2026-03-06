// Exploration inventory overlay — use consumable items on party members
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState } from "@rpg/state/RPGState";
import { useItem } from "@rpg/systems/EquipmentSystem";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_COLOR = 0x0e0e1a;
const BORDER_COLOR = 0x4444aa;
const HIGHLIGHT_COLOR = 0xffcc00;
const TEXT_COLOR = 0xcccccc;
const DIM_TEXT = 0x888888;
const HP_GREEN = 0x44aa44;

// ---------------------------------------------------------------------------
// InventoryView
// ---------------------------------------------------------------------------

type SubMode = "item_list" | "member_pick";

export class InventoryView {
  private vm!: ViewManager;
  private rpg!: RPGState;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  private _mode: SubMode = "item_list";
  private _itemIndex = 0;
  private _memberIndex = 0;
  private _message = "";
  private _messageTimer: ReturnType<typeof setTimeout> | null = null;

  onClose: (() => void) | null = null;

  init(vm: ViewManager, rpg: RPGState): void {
    this.vm = vm;
    this.rpg = rpg;
    vm.addToLayer("ui", this.container);
    this._draw();
    this._setupInput();
  }

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._messageTimer) clearTimeout(this._messageTimer);
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(overlay);

    // Panel
    const panelW = Math.min(420, W - 40);
    const panelH = Math.min(400, H - 60);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: this._mode === "item_list" ? "Inventory - Consumables" : "Select Party Member",
      style: { fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" },
    });
    title.position.set(panelX + 20, panelY + 15);
    this.container.addChild(title);

    if (this._mode === "item_list") {
      this._drawItemList(panelX, panelY + 45, panelW, panelH - 85);
    } else {
      this._drawMemberPick(panelX, panelY + 45, panelW, panelH - 85);
    }

    // Message
    if (this._message) {
      const msgBg = new Graphics();
      msgBg.roundRect(panelX + 20, panelY + panelH - 35, panelW - 40, 24, 4);
      msgBg.fill({ color: 0x2a4a2e, alpha: 0.9 });
      this.container.addChild(msgBg);

      const msgText = new Text({
        text: this._message,
        style: { fontFamily: "monospace", fontSize: 12, fill: 0x88ff88, fontWeight: "bold" },
      });
      msgText.anchor.set(0.5, 0.5);
      msgText.position.set(panelX + panelW / 2, panelY + panelH - 23);
      this.container.addChild(msgText);
    }

    // Controls
    const hint = this._mode === "item_list"
      ? "Up/Down=Navigate  Enter=Use  Esc=Close"
      : "Up/Down=Navigate  Enter=Apply  Esc=Back";
    const controls = new Text({
      text: hint,
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
    });
    controls.anchor.set(0.5, 0);
    controls.position.set(panelX + panelW / 2, panelY + panelH + 5);
    this.container.addChild(controls);
  }

  private _drawItemList(x: number, y: number, w: number, h: number): void {
    const consumables = this.rpg.inventory.items.filter(s => s.item.type === "consumable");

    if (consumables.length === 0) {
      const empty = new Text({
        text: "No consumable items.",
        style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT },
      });
      empty.position.set(x + 20, y + 15);
      this.container.addChild(empty);
      return;
    }

    for (let i = 0; i < consumables.length; i++) {
      const { item, quantity } = consumables[i];
      const iy = y + 5 + i * 30;
      if (iy + 30 > y + h) break; // Don't overflow panel

      const isSelected = i === this._itemIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(x + 10, iy - 2, w - 20, 26, 3);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.8 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const statsStr = _formatConsumableStats(item);

      const nameText = new Text({
        text: `${cursor} ${item.name} x${quantity}  ${statsStr}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      nameText.position.set(x + 18, iy);
      this.container.addChild(nameText);
    }

    // Description of selected item
    if (this._itemIndex < consumables.length) {
      const desc = new Text({
        text: consumables[this._itemIndex].item.description,
        style: {
          fontFamily: "monospace",
          fontSize: 11,
          fill: TEXT_COLOR,
          wordWrap: true,
          wordWrapWidth: w - 40,
        },
      });
      desc.position.set(x + 20, y + h - 30);
      this.container.addChild(desc);
    }
  }

  private _drawMemberPick(x: number, y: number, w: number, _h: number): void {
    // Show selected item name
    const consumables = this.rpg.inventory.items.filter(s => s.item.type === "consumable");
    if (this._itemIndex < consumables.length) {
      const itemLabel = new Text({
        text: `Using: ${consumables[this._itemIndex].item.name}`,
        style: { fontFamily: "monospace", fontSize: 12, fill: HIGHLIGHT_COLOR },
      });
      itemLabel.position.set(x + 20, y);
      this.container.addChild(itemLabel);
    }

    for (let i = 0; i < this.rpg.party.length; i++) {
      const member = this.rpg.party[i];
      const my = y + 28 + i * 56;
      const isSelected = i === this._memberIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(x + 10, my - 4, w - 20, 50, 4);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";

      const nameText = new Text({
        text: `${cursor} ${member.name}  Lv.${member.level}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : 0xffffff,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      nameText.position.set(x + 18, my);
      this.container.addChild(nameText);

      // HP/MP bars
      const barX = x + 32;
      const barY = my + 20;
      const barW = w - 60;
      const barH = 8;

      const hpRatio = member.maxHp > 0 ? member.hp / member.maxHp : 0;

      const barG = new Graphics();
      barG.rect(barX, barY, barW, barH);
      barG.fill({ color: 0x333333 });
      barG.rect(barX, barY, barW * hpRatio, barH);
      barG.fill({ color: hpRatio > 0.5 ? HP_GREEN : hpRatio > 0.25 ? 0xaaaa44 : 0xaa4444 });
      this.container.addChild(barG);

      const hpLabel = new Text({
        text: `HP ${member.hp}/${member.maxHp}  MP ${member.mp}/${member.maxMp}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      hpLabel.position.set(barX, barY + barH + 2);
      this.container.addChild(hpLabel);
    }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (this._mode === "item_list") {
        this._handleItemListInput(e);
      } else {
        this._handleMemberPickInput(e);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleItemListInput(e: KeyboardEvent): void {
    const consumables = this.rpg.inventory.items.filter(s => s.item.type === "consumable");

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._itemIndex = Math.max(0, this._itemIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._itemIndex = Math.min(consumables.length - 1, this._itemIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        if (this._itemIndex < consumables.length) {
          this._mode = "member_pick";
          this._memberIndex = 0;
          this._draw();
        }
        break;
      case "Escape":
      case "KeyI":
        this.onClose?.();
        break;
    }
  }

  private _handleMemberPickInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._memberIndex = Math.max(0, this._memberIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._memberIndex = Math.min(this.rpg.party.length - 1, this._memberIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space": {
        const consumables = this.rpg.inventory.items.filter(s => s.item.type === "consumable");
        if (this._itemIndex < consumables.length && this._memberIndex < this.rpg.party.length) {
          const item = consumables[this._itemIndex];
          const member = this.rpg.party[this._memberIndex];
          if (useItem(this.rpg, item.item.id, member.id)) {
            this._showMessage(`Used ${item.item.name} on ${member.name}!`);
            // If item is gone, go back to item list
            const remaining = this.rpg.inventory.items.filter(s => s.item.type === "consumable");
            if (remaining.length === 0) {
              this._mode = "item_list";
              this._itemIndex = 0;
            } else if (this._itemIndex >= remaining.length) {
              this._itemIndex = remaining.length - 1;
            }
          } else {
            this._showMessage("Cannot use that item!");
          }
        }
        break;
      }
      case "Escape":
        this._mode = "item_list";
        this._draw();
        break;
    }
  }

  private _showMessage(msg: string): void {
    this._message = msg;
    if (this._messageTimer) clearTimeout(this._messageTimer);
    this._messageTimer = setTimeout(() => {
      this._message = "";
      this._draw();
    }, 1500);
    this._draw();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _formatConsumableStats(item: { stats: { hp?: number; mp?: number } }): string {
  const parts: string[] = [];
  if (item.stats.hp) parts.push(`HP+${item.stats.hp}`);
  if (item.stats.mp) parts.push(`MP+${item.stats.mp}`);
  return parts.join("  ");
}
