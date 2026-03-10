// ---------------------------------------------------------------------------
// Warband mode – equipment shop (HTML overlay)
// Buy weapons and armor before battle
// ---------------------------------------------------------------------------

import type { WarbandFighter } from "../state/WarbandState";
import { WEAPON_DEFS, type WeaponDef } from "../config/WeaponDefs";
import { ARMOR_DEFS, ArmorSlot, type ArmorDef } from "../config/ArmorDefs";

export class WarbandShopView {
  private _container!: HTMLDivElement;
  private _onStart: (() => void) | null = null;

  init(): void {
    this._container = document.createElement("div");
    this._container.id = "warband-shop";
    this._container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 25; background: rgba(10, 8, 5, 0.95);
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
      overflow-y: auto;
    `;

    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) pixiContainer.appendChild(this._container);
  }

  show(player: WarbandFighter, onStart: () => void): void {
    this._onStart = onStart;
    this._render(player);
    this._container.style.display = "block";
  }

  hide(): void {
    this._container.style.display = "none";
  }

  private _render(player: WarbandFighter): void {
    const weapons = Object.values(WEAPON_DEFS);
    const armors = Object.values(ARMOR_DEFS);

    const categories = [
      { label: "⚔ One-Handed", items: weapons.filter((w) => w.category === "one_handed") },
      { label: "🗡 Two-Handed", items: weapons.filter((w) => w.category === "two_handed") },
      { label: "🔱 Polearms", items: weapons.filter((w) => w.category === "polearm") },
      { label: "🏹 Bows", items: weapons.filter((w) => w.category === "bow") },
      { label: "⚙ Crossbows", items: weapons.filter((w) => w.category === "crossbow") },
      { label: "🎯 Thrown", items: weapons.filter((w) => w.category === "thrown") },
      { label: "🛡 Shields", items: weapons.filter((w) => w.category === "shield") },
    ];

    const armorSlots = [
      { label: "🪖 Head", items: armors.filter((a) => a.slot === ArmorSlot.HEAD) },
      { label: "🦺 Torso", items: armors.filter((a) => a.slot === ArmorSlot.TORSO) },
      { label: "🧤 Gauntlets", items: armors.filter((a) => a.slot === ArmorSlot.GAUNTLETS) },
      { label: "👖 Legs", items: armors.filter((a) => a.slot === ArmorSlot.LEGS) },
      { label: "👢 Boots", items: armors.filter((a) => a.slot === ArmorSlot.BOOTS) },
    ];

    this._container.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:30px">
        <h1 style="text-align:center;font-size:32px;margin-bottom:5px;color:#daa520;text-shadow:0 0 10px rgba(218,165,32,0.3)">
          ⚔ Armory ⚔
        </h1>
        <div style="text-align:center;font-size:18px;margin-bottom:20px;color:#ffd700">
          Gold: ${player.gold}
        </div>

        <div style="text-align:center;margin-bottom:20px;padding:10px;background:rgba(255,255,255,0.05);border-radius:5px">
          <b>Equipped:</b>
          Main: ${player.equipment.mainHand?.name ?? "None"} |
          Off: ${player.equipment.offHand?.name ?? "None"} |
          Head: ${player.equipment.armor.head?.name ?? "None"} |
          Torso: ${player.equipment.armor.torso?.name ?? "None"} |
          Hands: ${player.equipment.armor.gauntlets?.name ?? "None"} |
          Legs: ${player.equipment.armor.legs?.name ?? "None"} |
          Boots: ${player.equipment.armor.boots?.name ?? "None"}
        </div>

        <h2 style="color:#ccc;border-bottom:1px solid #444;padding-bottom:5px">Weapons</h2>
        ${categories.map((cat) => this._renderCategory(cat.label, cat.items, player, "weapon")).join("")}

        <h2 style="color:#ccc;border-bottom:1px solid #444;padding-bottom:5px;margin-top:20px">Armor</h2>
        ${armorSlots.map((slot) => this._renderCategory(slot.label, slot.items, player, "armor")).join("")}

        <div style="text-align:center;margin-top:30px">
          <button id="warband-start-battle" style="
            padding: 15px 50px; font-size: 20px; font-weight: bold;
            background: linear-gradient(180deg, #8b0000, #5c0000);
            color: #ffd700; border: 2px solid #daa520;
            border-radius: 5px; cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            pointer-events: auto;
          ">⚔ Start Battle ⚔</button>
        </div>
      </div>
    `;

    // Bind buy buttons
    this._container.querySelectorAll("[data-buy-weapon]").forEach((btn) => {
      (btn as HTMLElement).style.pointerEvents = "auto";
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.buyWeapon!;
        this._buyWeapon(player, id);
      });
    });

    this._container.querySelectorAll("[data-buy-armor]").forEach((btn) => {
      (btn as HTMLElement).style.pointerEvents = "auto";
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.buyArmor!;
        this._buyArmor(player, id);
      });
    });

    const startBtn = document.getElementById("warband-start-battle");
    if (startBtn) {
      startBtn.style.pointerEvents = "auto";
      startBtn.addEventListener("click", () => {
        this.hide();
        this._onStart?.();
      });
    }
  }

  private _renderCategory(
    label: string,
    items: (WeaponDef | ArmorDef)[],
    player: WarbandFighter,
    type: "weapon" | "armor",
  ): string {
    if (items.length === 0) return "";

    return `
      <div style="margin-bottom:15px">
        <h3 style="color:#aa9977;margin-bottom:5px;font-size:15px">${label}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${items
            .map((item) => {
              const canAfford = player.gold >= item.cost;
              const isEquipped = this._isEquipped(player, item, type);
              const btnAttr = type === "weapon" ? `data-buy-weapon="${item.id}"` : `data-buy-armor="${item.id}"`;

              let stats = "";
              if (type === "weapon") {
                const w = item as WeaponDef;
                stats = `Dmg: ${w.damage} | Spd: ${w.speed.toFixed(1)} | Rng: ${w.reach.toFixed(1)}`;
                if (w.ammo) stats += ` | Ammo: ${w.ammo}`;
              } else {
                const a = item as ArmorDef;
                stats = `Def: ${a.defense} | Wgt: ${a.weight}`;
              }

              return `
                <div style="
                  background: ${isEquipped ? "rgba(34,170,68,0.15)" : "rgba(255,255,255,0.03)"};
                  border: 1px solid ${isEquipped ? "#22aa44" : "#444"};
                  border-radius: 4px; padding: 8px;
                ">
                  <div style="font-weight:bold;color:${isEquipped ? "#44cc66" : "#ddd"}">${item.name}</div>
                  <div style="font-size:12px;color:#999;margin:3px 0">${stats}</div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px">
                    <span style="color:#ffd700;font-size:13px">${item.cost}g</span>
                    ${
                      isEquipped
                        ? '<span style="color:#44cc66;font-size:12px">Equipped</span>'
                        : `<button ${btnAttr} style="
                            padding:3px 10px;font-size:12px;
                            background:${canAfford ? "#8b6914" : "#444"};
                            color:${canAfford ? "#fff" : "#888"};
                            border:1px solid ${canAfford ? "#daa520" : "#555"};
                            border-radius:3px;cursor:${canAfford ? "pointer" : "default"};
                          ">${canAfford ? "Buy" : "Can't afford"}</button>`
                    }
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  private _isEquipped(
    player: WarbandFighter,
    item: WeaponDef | ArmorDef,
    type: string,
  ): boolean {
    if (type === "weapon") {
      return (
        player.equipment.mainHand?.id === item.id ||
        player.equipment.offHand?.id === item.id
      );
    }
    const armor = item as ArmorDef;
    return player.equipment.armor[armor.slot]?.id === item.id;
  }

  private _buyWeapon(player: WarbandFighter, weaponId: string): void {
    const def = WEAPON_DEFS[weaponId];
    if (!def || player.gold < def.cost) return;

    player.gold -= def.cost;

    if (def.category === "shield") {
      player.equipment.offHand = def;
    } else {
      player.equipment.mainHand = def;
      // Set ammo for ranged
      if (def.ammo) {
        player.ammo = def.ammo;
        player.maxAmmo = def.ammo;
      }
    }

    this._render(player);
  }

  private _buyArmor(player: WarbandFighter, armorId: string): void {
    const def = ARMOR_DEFS[armorId];
    if (!def || player.gold < def.cost) return;

    player.gold -= def.cost;
    player.equipment.armor[def.slot] = def;
    this._render(player);
  }

  destroy(): void {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}
