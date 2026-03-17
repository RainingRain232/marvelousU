// ---------------------------------------------------------------------------
// Warband mode – equipment shop (HTML overlay)
// Buy weapons and armor before battle
// ---------------------------------------------------------------------------

import type { WarbandFighter, HorseArmorTier } from "../state/WarbandState";
import { WEAPON_DEFS, type WeaponDef } from "../config/WeaponDefs";
import { ARMOR_DEFS, ArmorSlot, type ArmorDef } from "../config/ArmorDefs";
import { WB } from "../config/WarbandBalanceConfig";

export class WarbandShopView {
  private _container!: HTMLDivElement;
  private _onStart: (() => void) | null = null;

  /** Pending horse purchase — read by WarbandGame on battle start */
  pendingHorse: HorseArmorTier | null = null;

  init(): void {
    this._container = document.createElement("div");
    this._container.id = "warband-shop";
    this._container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 25;
      background: linear-gradient(180deg, rgba(14,11,7,0.97) 0%, rgba(8,6,3,0.98) 100%);
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
      font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
      color: #e0d5c0;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #5a4020 rgba(10,8,5,0.3);
    `;

    this._container.style.display = "none";

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
    const weapons = Object.values(WEAPON_DEFS).filter((w) => !w.oversized);
    const armors = Object.values(ARMOR_DEFS).filter((a) => !a.oversized);

    const categories = [
      { label: "\u2694 One-Handed", items: weapons.filter((w) => w.category === "one_handed") },
      { label: "\uD83D\uDDE1 Two-Handed", items: weapons.filter((w) => w.category === "two_handed") },
      { label: "\uD83D\uDD31 Polearms", items: weapons.filter((w) => w.category === "polearm") },
      { label: "\uD83C\uDFF9 Bows", items: weapons.filter((w) => w.category === "bow") },
      { label: "\u2699 Crossbows", items: weapons.filter((w) => w.category === "crossbow") },
      { label: "\uD83C\uDFAF Thrown", items: weapons.filter((w) => w.category === "thrown") },
      { label: "\uD83E\uDE84 Staves", items: weapons.filter((w) => w.category === "staff") },
      { label: "\uD83D\uDEE1 Shields", items: weapons.filter((w) => w.category === "shield") },
    ];

    const armorSlots = [
      { label: "\uD83E\uDE96 Head", items: armors.filter((a) => a.slot === ArmorSlot.HEAD) },
      { label: "\uD83E\uDDBA Torso", items: armors.filter((a) => a.slot === ArmorSlot.TORSO) },
      { label: "\uD83E\uDDE4 Gauntlets", items: armors.filter((a) => a.slot === ArmorSlot.GAUNTLETS) },
      { label: "\uD83D\uDC56 Legs", items: armors.filter((a) => a.slot === ArmorSlot.LEGS) },
      { label: "\uD83D\uDC62 Boots", items: armors.filter((a) => a.slot === ArmorSlot.BOOTS) },
    ];

    this._container.innerHTML = `
      <div style="max-width:940px;margin:0 auto;padding:30px 36px">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid rgba(218,165,32,0.3);position:relative">
          <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:120px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent)"></div>
          <h1 style="font-size:34px;margin:0 0 6px;color:#daa520;text-shadow:0 0 15px rgba(218,165,32,0.3),0 2px 4px rgba(0,0,0,0.5);letter-spacing:4px;font-weight:normal">
            \u2726 ARMORY \u2726
          </h1>
          <div style="font-size:20px;color:#ffd700;text-shadow:0 0 6px rgba(255,215,0,0.2)">
            <span style="font-size:14px;color:#aa8833">\u2B23</span> <strong>${player.gold}</strong> <span style="color:#aa8833;font-size:14px">gold</span>
          </div>
        </div>

        <!-- Currently Equipped Panel -->
        <div style="
          margin-bottom:24px;padding:14px 18px;
          background:linear-gradient(135deg, rgba(25,20,12,0.8) 0%, rgba(15,12,8,0.7) 100%);
          border:1px solid rgba(218,165,32,0.2);border-radius:8px;
          box-shadow:inset 0 1px 0 rgba(255,220,140,0.05), 0 2px 8px rgba(0,0,0,0.3);
        ">
          <div style="font-size:11px;color:#998877;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">
            <span style="color:#5a4020">\u2726</span> Currently Equipped
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:#c0b8a0">
            <span>\u2694 <strong style="color:#ddd">${player.equipment.mainHand?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83D\uDEE1 <strong style="color:#ddd">${player.equipment.offHand?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83E\uDE96 <strong style="color:#ddd">${player.equipment.armor.head?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83E\uDDBA <strong style="color:#ddd">${player.equipment.armor.torso?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83E\uDDE4 <strong style="color:#ddd">${player.equipment.armor.gauntlets?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83D\uDC56 <strong style="color:#ddd">${player.equipment.armor.legs?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83D\uDC62 <strong style="color:#ddd">${player.equipment.armor.boots?.name ?? "None"}</strong></span>
            <span style="color:#444">\u2758</span>
            <span>\uD83D\uDC0E <strong style="color:#ddd">${this.pendingHorse ? this.pendingHorse.charAt(0).toUpperCase() + this.pendingHorse.slice(1) + " Horse" : "None"}</strong></span>
          </div>
        </div>

        <!-- Weapons Section -->
        <div style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="flex:1;height:1px;background:linear-gradient(90deg,rgba(218,165,32,0.4),transparent)"></span>
            <h2 style="color:#daa520;font-size:16px;margin:0;letter-spacing:2px;text-transform:uppercase;font-weight:normal;text-shadow:0 0 6px rgba(218,165,32,0.2)">Weapons</h2>
            <span style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(218,165,32,0.4))"></span>
          </div>
          ${categories.map((cat) => this._renderCategory(cat.label, cat.items, player, "weapon")).join("")}
        </div>

        <!-- Armor Section -->
        <div style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;margin-top:20px">
            <span style="flex:1;height:1px;background:linear-gradient(90deg,rgba(218,165,32,0.4),transparent)"></span>
            <h2 style="color:#daa520;font-size:16px;margin:0;letter-spacing:2px;text-transform:uppercase;font-weight:normal;text-shadow:0 0 6px rgba(218,165,32,0.2)">Armor</h2>
            <span style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(218,165,32,0.4))"></span>
          </div>
          ${armorSlots.map((slot) => this._renderCategory(slot.label, slot.items, player, "armor")).join("")}
        </div>

        <!-- Mounts Section -->
        <div style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;margin-top:20px">
            <span style="flex:1;height:1px;background:linear-gradient(90deg,rgba(218,165,32,0.4),transparent)"></span>
            <h2 style="color:#daa520;font-size:16px;margin:0;letter-spacing:2px;text-transform:uppercase;font-weight:normal;text-shadow:0 0 6px rgba(218,165,32,0.2)">Mounts</h2>
            <span style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(218,165,32,0.4))"></span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:15px">
            ${this._renderHorseCard("light", "Light Horse", WB.HORSE_COST_LIGHT, WB.HORSE_HP_LIGHT, WB.HORSE_DEF_LIGHT, player)}
            ${this._renderHorseCard("medium", "Medium Horse", WB.HORSE_COST_MEDIUM, WB.HORSE_HP_MEDIUM, WB.HORSE_DEF_MEDIUM, player)}
            ${this._renderHorseCard("heavy", "Heavy Horse", WB.HORSE_COST_HEAVY, WB.HORSE_HP_HEAVY, WB.HORSE_DEF_HEAVY, player)}
          </div>
        </div>

        <!-- Start Battle Button -->
        <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid rgba(218,165,32,0.2)">
          <button id="warband-start-battle" style="
            padding: 16px 56px; font-size: 20px; font-weight: bold;
            background: linear-gradient(180deg, #8b0000 0%, #5c0000 60%, #3a0000 100%);
            color: #ffd700; border: 2px solid #daa520;
            border-radius: 6px; cursor: pointer;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            letter-spacing: 3px;
            pointer-events: auto;
            font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(139,0,0,0.3), inset 0 1px 0 rgba(255,200,100,0.15);
            transition: all 0.2s ease;
          "
          onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.6), 0 0 30px rgba(139,0,0,0.5), inset 0 1px 0 rgba(255,200,100,0.25)';this.style.background='linear-gradient(180deg, #a50000 0%, #6e0000 60%, #4a0000 100%)'"
          onmouseout="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(139,0,0,0.3), inset 0 1px 0 rgba(255,200,100,0.15)';this.style.background='linear-gradient(180deg, #8b0000 0%, #5c0000 60%, #3a0000 100%)'"
          >\u2694 Start Battle \u2694</button>
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

    this._container.querySelectorAll("[data-buy-horse]").forEach((btn) => {
      (btn as HTMLElement).style.pointerEvents = "auto";
      btn.addEventListener("click", () => {
        const tier = (btn as HTMLElement).dataset.buyHorse! as HorseArmorTier;
        this._buyHorse(player, tier);
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
      <div style="margin-bottom:16px">
        <h3 style="color:#aa9977;margin-bottom:8px;font-size:13px;letter-spacing:1px;font-weight:normal">
          ${label}
          <span style="margin-left:8px;flex:1;display:inline-block;width:40px;height:1px;background:rgba(90,64,32,0.3);vertical-align:middle"></span>
        </h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">
          ${items
            .map((item) => {
              const canAfford = player.gold >= item.cost;
              const isEquipped = this._isEquipped(player, item, type);
              const btnAttr = type === "weapon" ? `data-buy-weapon="${item.id}"` : `data-buy-armor="${item.id}"`;

              let stats = "";
              if (type === "weapon") {
                const w = item as WeaponDef;
                stats = `<span style="color:#cc9966">Dmg ${w.damage}</span> \u2758 <span style="color:#8899aa">Spd ${w.speed.toFixed(1)}</span> \u2758 <span style="color:#88aa88">Rng ${w.reach.toFixed(1)}</span>`;
                if (w.ammo) stats += ` \u2758 <span style="color:#aa8866">Ammo ${w.ammo}</span>`;
              } else {
                const a = item as ArmorDef;
                stats = `<span style="color:#8899cc">Def ${a.defense}</span> \u2758 <span style="color:#aa8877">Wgt ${a.weight}</span>`;
              }

              return `
                <div style="
                  background: ${isEquipped
                    ? "linear-gradient(135deg, rgba(34,170,68,0.12) 0%, rgba(20,100,40,0.08) 100%)"
                    : "linear-gradient(135deg, rgba(25,20,12,0.7) 0%, rgba(15,12,8,0.6) 100%)"};
                  border: 1px solid ${isEquipped ? "rgba(34,170,68,0.5)" : "rgba(90,64,32,0.3)"};
                  border-radius: 6px; padding: 10px 12px;
                  transition: border-color 0.2s, background 0.2s;
                  box-shadow: ${isEquipped ? "0 0 8px rgba(34,170,68,0.1), inset 0 1px 0 rgba(100,255,100,0.05)" : "inset 0 1px 0 rgba(255,220,140,0.03)"};
                "
                onmouseover="if(!${isEquipped})this.style.borderColor='rgba(218,165,32,0.4)';this.style.background='${isEquipped ? "linear-gradient(135deg, rgba(34,170,68,0.18) 0%, rgba(20,100,40,0.12) 100%)" : "linear-gradient(135deg, rgba(35,28,16,0.8) 0%, rgba(20,16,10,0.7) 100%)"}'"
                onmouseout="this.style.borderColor='${isEquipped ? "rgba(34,170,68,0.5)" : "rgba(90,64,32,0.3)"}';this.style.background='${isEquipped ? "linear-gradient(135deg, rgba(34,170,68,0.12) 0%, rgba(20,100,40,0.08) 100%)" : "linear-gradient(135deg, rgba(25,20,12,0.7) 0%, rgba(15,12,8,0.6) 100%)"}'"
                >
                  <div style="font-weight:bold;font-size:13px;color:${isEquipped ? "#55dd77" : "#ddd"};margin-bottom:4px">${item.name}</div>
                  <div style="font-size:10px;margin:4px 0;line-height:1.5">${stats}</div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid rgba(90,64,32,0.15)">
                    <span style="color:#ffd700;font-size:12px;text-shadow:0 0 4px rgba(255,215,0,0.2)">
                      <span style="font-size:10px">\u2B23</span> ${item.cost}g
                    </span>
                    ${
                      isEquipped
                        ? '<span style="color:#55dd77;font-size:11px;letter-spacing:1px">\u2713 Equipped</span>'
                        : `<button ${btnAttr} style="
                            padding:4px 12px;font-size:11px;font-weight:bold;
                            background:${canAfford
                              ? "linear-gradient(180deg, rgba(139,105,20,0.9) 0%, rgba(100,75,15,0.8) 100%)"
                              : "rgba(30,25,15,0.5)"};
                            color:${canAfford ? "#ffe088" : "#555"};
                            border:1px solid ${canAfford ? "#daa520" : "#333"};
                            border-radius:4px;cursor:${canAfford ? "pointer" : "default"};
                            font-family:inherit;letter-spacing:0.5px;
                            box-shadow:${canAfford ? "0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,220,140,0.15)" : "none"};
                            transition:all 0.15s ease;
                          "
                          onmouseover="if(${canAfford})this.style.background='linear-gradient(180deg, rgba(170,130,25,0.95) 0%, rgba(120,90,20,0.85) 100%)'"
                          onmouseout="if(${canAfford})this.style.background='linear-gradient(180deg, rgba(139,105,20,0.9) 0%, rgba(100,75,15,0.8) 100%)'"
                          >${canAfford ? "Buy" : "Can't afford"}</button>`
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

  private _renderHorseCard(
    tier: HorseArmorTier,
    name: string,
    cost: number,
    hp: number,
    def: number,
    player: WarbandFighter,
  ): string {
    const isOwned = this.pendingHorse === tier;
    const canAfford = player.gold >= cost;
    return `
      <div style="
        background: ${isOwned
          ? "linear-gradient(135deg, rgba(34,170,68,0.12) 0%, rgba(20,100,40,0.08) 100%)"
          : "linear-gradient(135deg, rgba(25,20,12,0.7) 0%, rgba(15,12,8,0.6) 100%)"};
        border: 1px solid ${isOwned ? "rgba(34,170,68,0.5)" : "rgba(90,64,32,0.3)"};
        border-radius: 6px; padding: 12px 14px;
        box-shadow: ${isOwned ? "0 0 8px rgba(34,170,68,0.1), inset 0 1px 0 rgba(100,255,100,0.05)" : "inset 0 1px 0 rgba(255,220,140,0.03)"};
        transition: border-color 0.2s, background 0.2s;
      "
      onmouseover="if(!${isOwned})this.style.borderColor='rgba(218,165,32,0.4)'"
      onmouseout="if(!${isOwned})this.style.borderColor='rgba(90,64,32,0.3)'"
      >
        <div style="font-weight:bold;font-size:14px;color:${isOwned ? "#55dd77" : "#ddd"};margin-bottom:4px">\uD83D\uDC0E ${name}</div>
        <div style="font-size:10px;margin:4px 0;line-height:1.5">
          <span style="color:#cc9966">HP ${hp}</span> \u2758
          <span style="color:#8899cc">Def ${def}</span> \u2758
          <span style="color:#88aa88">+60% speed</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid rgba(90,64,32,0.15)">
          <span style="color:#ffd700;font-size:12px;text-shadow:0 0 4px rgba(255,215,0,0.2)">
            <span style="font-size:10px">\u2B23</span> ${cost}g
          </span>
          ${isOwned
            ? '<span style="color:#55dd77;font-size:11px;letter-spacing:1px">\u2713 Purchased</span>'
            : `<button data-buy-horse="${tier}" style="
                padding:4px 12px;font-size:11px;font-weight:bold;
                background:${canAfford
                  ? "linear-gradient(180deg, rgba(139,105,20,0.9) 0%, rgba(100,75,15,0.8) 100%)"
                  : "rgba(30,25,15,0.5)"};
                color:${canAfford ? "#ffe088" : "#555"};
                border:1px solid ${canAfford ? "#daa520" : "#333"};
                border-radius:4px;cursor:${canAfford ? "pointer" : "default"};
                font-family:inherit;letter-spacing:0.5px;
                box-shadow:${canAfford ? "0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,220,140,0.15)" : "none"};
                transition:all 0.15s ease;
              "
              onmouseover="if(${canAfford})this.style.background='linear-gradient(180deg, rgba(170,130,25,0.95) 0%, rgba(120,90,20,0.85) 100%)'"
              onmouseout="if(${canAfford})this.style.background='linear-gradient(180deg, rgba(139,105,20,0.9) 0%, rgba(100,75,15,0.8) 100%)'"
              >${canAfford ? "Buy" : "Can't afford"}</button>`
          }
        </div>
      </div>
    `;
  }

  private _buyHorse(player: WarbandFighter, tier: HorseArmorTier): void {
    const costMap = { light: WB.HORSE_COST_LIGHT, medium: WB.HORSE_COST_MEDIUM, heavy: WB.HORSE_COST_HEAVY };
    const cost = costMap[tier];
    if (player.gold < cost) return;

    // Refund previous horse if upgrading
    if (this.pendingHorse) {
      player.gold += costMap[this.pendingHorse];
    }

    player.gold -= cost;
    this.pendingHorse = tier;
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
