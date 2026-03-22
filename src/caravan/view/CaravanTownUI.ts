// ---------------------------------------------------------------------------
// Caravan town UI — shop, tavern (hire escorts), healer, upgrades, continue
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CaravanState } from "../state/CaravanState";
import { TRADE_GOODS, getGoodPrice, getSpoiledSellPrice, getTownForSegment } from "../config/CaravanTradeDefs";
import { ESCORT_DEFS } from "../config/CaravanEscortDefs";
import type { EscortDef } from "../config/CaravanEscortDefs";
import { CaravanBalance } from "../config/CaravanBalanceConfig";

const STYLE_TITLE = new TextStyle({ fontFamily: "serif", fontSize: 22, fill: 0xffd700, fontWeight: "bold" });
const STYLE_LABEL = new TextStyle({ fontFamily: "serif", fontSize: 13, fill: 0xffffff });
const STYLE_COST = new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0xffd700 });
const STYLE_DESC = new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0xaaaaaa });
const STYLE_PROFIT = new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0x44ff44 });
const STYLE_LOSS = new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0xff6644 });

// Panel theme colors per section
const PANEL_THEMES = {
  trade:    { border: 0xddaa44, headerBg: 0x221a08, icon: "\u2696" }, // ⚖ scales
  tavern:   { border: 0xaa6633, headerBg: 0x1a1208, icon: "\u2615" }, // ☕ cup
  services: { border: 0x44aa88, headerBg: 0x081a14, icon: "\u2726" }, // ✦ star
  info:     { border: 0x6688cc, headerBg: 0x081018, icon: "\u2691" }, // ⚑ flag
};

function drawPanelBorder(g: Graphics, x: number, y: number, w: number, h: number, color: number, headerH = 26): void {
  // Panel body
  g.roundRect(x, y, w, h, 6).fill({ color: 0x0c0c1e, alpha: 0.95 });
  // Header tinted area
  g.roundRect(x + 1, y + 1, w - 2, headerH, 5).fill({ color, alpha: 0.08 });
  // Border
  g.roundRect(x, y, w, h, 6).stroke({ color, width: 1, alpha: 0.35 });
  // Corner ornaments
  const s = 8;
  for (const [cx, cy, fx, fy] of [[x + 3, y + 3, 1, 1], [x + w - 3, y + 3, -1, 1], [x + 3, y + h - 3, 1, -1], [x + w - 3, y + h - 3, -1, -1]] as [number, number, number, number][]) {
    g.moveTo(cx, cy).lineTo(cx + s * fx, cy).stroke({ color, width: 1, alpha: 0.4 });
    g.moveTo(cx, cy).lineTo(cx, cy + s * fy).stroke({ color, width: 1, alpha: 0.4 });
  }
  // Header divider
  g.moveTo(x + 10, y + headerH).lineTo(x + w - 10, y + headerH).stroke({ color, width: 0.5, alpha: 0.2 });
}

export class CaravanTownUI {
  readonly container = new Container();

  private _continueCallback: (() => void) | null = null;
  private _sw = 800;
  private _sh = 600;

  setContinueCallback(cb: () => void): void {
    this._continueCallback = cb;
  }

  show(state: CaravanState, sw: number, sh: number): void {
    this._sw = sw;
    this._sh = sh;
    this.container.removeChildren();
    const town = getTownForSegment(state.towns, state.segment);
    if (!town) return;

    // Background with subtle gradient
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x060612, alpha: 0.92 });
    bg.circle(sw / 2, sh * 0.3, sh * 0.5).fill({ color: 0x111128, alpha: 0.3 });
    bg.rect(0, 0, sw, 2).fill({ color: 0xffd700, alpha: 0.15 });
    bg.rect(0, sh - 2, sw, 2).fill({ color: 0xffd700, alpha: 0.15 });
    this.container.addChild(bg);

    // Title banner
    const titleStr = state.segment === 0
      ? `Departing from ${town.name}`
      : `Arrived at ${town.name}`;
    const bannerG = new Graphics();
    bannerG.roundRect(sw / 2 - 200, 8, 400, 32, 4).fill({ color: 0x111128, alpha: 0.8 });
    bannerG.roundRect(sw / 2 - 200, 8, 400, 32, 4).stroke({ color: 0xffd700, width: 1, alpha: 0.25 });
    this.container.addChild(bannerG);

    const title = new Text({ text: titleStr, style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 12);
    this.container.addChild(title);

    // Town type subtitle
    if (state.segment > 0) {
      const typeName = new Text({
        text: town.type.charAt(0).toUpperCase() + town.type.slice(1) + " Town",
        style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0x888899, letterSpacing: 1 }),
      });
      typeName.anchor.set(0.5, 0);
      typeName.position.set(sw / 2, 38);
      this.container.addChild(typeName);
    }

    // Gold display
    const goldText = new Text({
      text: `\u2B27 ${state.gold} gold`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: 0xffd700, fontWeight: "bold" }),
    });
    goldText.anchor.set(0.5, 0);
    goldText.position.set(sw / 2, 50);
    this.container.addChild(goldText);

    // Layout: 4 panels
    const panelW = 240;
    const panelH = sh - 150;
    const panelY = 68;
    const gap = 12;
    const totalW = panelW * 4 + gap * 3;
    const startX = (sw - totalW) / 2;

    // Panel 1: Trade goods
    this._buildTradePanel(state, town, startX, panelY, panelW, panelH);

    // Panel 2: Tavern (hire escorts)
    this._buildTavernPanel(state, startX + panelW + gap, panelY, panelW, panelH);

    // Panel 3: Services & Upgrades
    this._buildServicesPanel(state, startX + (panelW + gap) * 2, panelY, panelW, panelH);

    // Panel 4: Journey info
    this._buildInfoPanel(state, startX + (panelW + gap) * 3, panelY, panelW, panelH);

    // Continue button — styled
    const btnW = 200;
    const btnH = 36;
    const btnY2 = sh - 50;
    const btn = new Graphics()
      .roundRect(sw / 2 - btnW / 2, btnY2, btnW, btnH, 5)
      .fill({ color: 0x1a3322 })
      .roundRect(sw / 2 - btnW / 2, btnY2, btnW, btnH, 5)
      .stroke({ color: 0x44aa66, width: 1.5, alpha: 0.5 });
    // Inner glow
    btn.roundRect(sw / 2 - btnW / 2 + 2, btnY2 + 2, btnW - 4, 12, 3).fill({ color: 0x44aa66, alpha: 0.06 });
    const btnText = new Text({
      text: "\u27A4  Continue Journey",
      style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: 0x88ffaa, fontWeight: "bold" }),
    });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(sw / 2, btnY2 + btnH / 2);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.on("pointerdown", () => this._continueCallback?.());
    this.container.addChild(btn, btnText);
  }

  hide(): void {
    this.container.removeChildren();
  }

  private _rebuild(state: CaravanState): void {
    this.show(state, this._sw, this._sh);
  }

  private _buildTradePanel(
    state: CaravanState, town: ReturnType<typeof import("../config/CaravanTradeDefs").generateRoute>[0],
    x: number, y: number, w: number, h: number,
  ): void {
    const theme = PANEL_THEMES.trade;
    const panel = new Graphics();
    drawPanelBorder(panel, x, y, w, h, theme.border);
    this.container.addChild(panel);

    const header = new Text({ text: `${theme.icon} Trade Goods`, style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: theme.border, fontWeight: "bold" }) });
    header.position.set(x + 8, y + 5);
    this.container.addChild(header);

    // Cargo capacity
    const totalCargo = state.cargo.reduce((sum, c) => sum + c.quantity, 0);
    const capText = new Text({
      text: `Cargo: ${totalCargo}/${state.maxCargoSlots}`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: totalCargo >= state.maxCargoSlots ? 0xff6644 : 0x88aacc }),
    });
    capText.position.set(x + 130, y + 8);
    this.container.addChild(capText);

    let rowY = y + 28;
    for (const good of TRADE_GOODS) {
      const price = getGoodPrice(good, town);
      const owned = state.cargo.find((c) => c.good.id === good.id);
      const qty = owned ? owned.quantity : 0;

      // Good name
      const nameText = new Text({ text: good.name, style: STYLE_LABEL });
      nameText.position.set(x + 8, rowY);
      this.container.addChild(nameText);

      // Price
      const priceText = new Text({ text: `${price}g`, style: STYLE_COST });
      priceText.position.set(x + 70, rowY + 2);
      this.container.addChild(priceText);

      // Owned
      const qtyText = new Text({ text: `x${qty}`, style: STYLE_DESC });
      qtyText.position.set(x + 110, rowY + 2);
      this.container.addChild(qtyText);

      // Sell price (adjusted for spoilage) and profit/loss indicator
      if (owned && qty > 0) {
        const sellPrice = getSpoiledSellPrice(good, town, owned.spoilage ?? 0);
        const diff = sellPrice - owned.purchasePrice;
        const spoilTag = (owned.spoilage ?? 0) > 0 && good.perishable ? ` [${owned.spoilage}t]` : "";
        const diffStr = diff >= 0 ? `+${diff}g${spoilTag}` : `${diff}g${spoilTag}`;
        const diffText = new Text({ text: diffStr, style: diff >= 0 ? STYLE_PROFIT : STYLE_LOSS });
        diffText.position.set(x + 135, rowY + 2);
        this.container.addChild(diffText);
      }

      // Buy button
      const canBuy = state.gold >= price && totalCargo < state.maxCargoSlots;
      const buyBtn = this._makeSmallButton(x + 175, rowY, "Buy", canBuy ? 0x224466 : 0x222222, () => {
        if (state.gold >= price) {
          const slots = state.cargo.reduce((sum, c) => sum + c.quantity, 0);
          if (slots >= state.maxCargoSlots) return;
          state.gold -= price;
          const existing = state.cargo.find((c) => c.good.id === good.id);
          if (existing) {
            const total = existing.purchasePrice * existing.quantity + price;
            existing.quantity++;
            existing.purchasePrice = Math.round(total / existing.quantity);
          } else {
            state.cargo.push({ good, quantity: 1, purchasePrice: price });
          }
          this._rebuild(state);
        }
      });
      this.container.addChild(buyBtn);

      // Sell button (uses spoilage-adjusted price)
      const sellBtn = this._makeSmallButton(x + 210, rowY, "Sell", qty > 0 ? 0x664422 : 0x222222, () => {
        const existing = state.cargo.find((c) => c.good.id === good.id);
        if (existing && existing.quantity > 0) {
          const sellPrice = getSpoiledSellPrice(good, town, existing.spoilage ?? 0);
          state.gold += sellPrice;
          state.totalGoldEarned += sellPrice;
          const profit = sellPrice - existing.purchasePrice;
          if (profit > 0) state.totalTradeProfit += profit;
          existing.quantity--;
          if (existing.quantity <= 0) {
            state.cargo = state.cargo.filter((c) => c.good.id !== good.id);
          }
          this._rebuild(state);
        }
      });
      this.container.addChild(sellBtn);

      rowY += 24;
    }

    // Cargo upgrade button
    if (state.maxCargoSlots < CaravanBalance.MAX_CARGO_SLOTS) {
      rowY += 8;
      const upgCost = CaravanBalance.CARGO_UPGRADE_COST;
      const canUpg = state.gold >= upgCost;
      const upgBtn = this._makeWideButton(x + 8, rowY, `Upgrade Cargo (+${CaravanBalance.CARGO_UPGRADE_SLOTS} slots) — ${upgCost}g`, canUpg ? 0x334455 : 0x222222, () => {
        if (state.gold >= upgCost && state.maxCargoSlots < CaravanBalance.MAX_CARGO_SLOTS) {
          state.gold -= upgCost;
          state.maxCargoSlots += CaravanBalance.CARGO_UPGRADE_SLOTS;
          this._rebuild(state);
        }
      });
      this.container.addChild(upgBtn);
      rowY += 28;
    }

    // Sell All button
    if (state.cargo.length > 0) {
      const town2 = getTownForSegment(state.towns, state.segment);
      let totalSellValue = 0;
      for (const slot of state.cargo) {
        if (slot.quantity <= 0) continue;
        const sellPrice = town2 ? getSpoiledSellPrice(slot.good, town2, slot.spoilage ?? 0) : slot.good.basePrice;
        totalSellValue += sellPrice * slot.quantity;
      }
      rowY += 4;
      const sellAllBtn = this._makeWideButton(x + 8, rowY, `Sell All Cargo — ${totalSellValue}g`, 0x664422, () => {
        const t = getTownForSegment(state.towns, state.segment);
        if (!t) return;
        for (const slot of state.cargo) {
          if (slot.quantity <= 0) continue;
          const sp = getSpoiledSellPrice(slot.good, t, slot.spoilage ?? 0);
          const total = sp * slot.quantity;
          state.gold += total;
          state.totalGoldEarned += total;
          const profit = sp - slot.purchasePrice;
          if (profit > 0) state.totalTradeProfit += profit * slot.quantity;
        }
        state.cargo = [];
        this._rebuild(state);
      });
      this.container.addChild(sellAllBtn);
    }
  }

  private _buildTavernPanel(
    state: CaravanState,
    x: number, y: number, w: number, h: number,
  ): void {
    const theme = PANEL_THEMES.tavern;
    const panel = new Graphics();
    drawPanelBorder(panel, x, y, w, h, theme.border);
    this.container.addChild(panel);

    const header = new Text({ text: `${theme.icon} Tavern — Hire Escorts`, style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: theme.border, fontWeight: "bold" }) });
    header.position.set(x + 8, y + 5);
    this.container.addChild(header);

    const aliveEscorts = state.escorts.filter((e) => e.alive).length;
    const countText = new Text({
      text: `Escorts: ${aliveEscorts}/${CaravanBalance.MAX_ESCORTS}`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: aliveEscorts >= CaravanBalance.MAX_ESCORTS ? 0xff8844 : 0xaaaaaa }),
    });
    countText.position.set(x + 8, y + 26);
    this.container.addChild(countText);

    let rowY = y + 44;
    for (const def of ESCORT_DEFS) {
      const canHire = state.gold >= def.cost && aliveEscorts < CaravanBalance.MAX_ESCORTS;

      const nameText = new Text({ text: def.name, style: STYLE_LABEL });
      nameText.position.set(x + 8, rowY);
      this.container.addChild(nameText);

      const costText = new Text({ text: `${def.cost}g`, style: STYLE_COST });
      costText.position.set(x + 100, rowY + 2);
      this.container.addChild(costText);

      // Stats
      const statsText = new Text({
        text: `HP:${def.hp} ATK:${def.atk} SPD:${def.speed} RNG:${def.range}`,
        style: new TextStyle({ fontFamily: "serif", fontSize: 9, fill: 0x888888 }),
      });
      statsText.position.set(x + 8, rowY + 17);
      this.container.addChild(statsText);

      const descText = new Text({ text: def.description, style: STYLE_DESC });
      descText.position.set(x + 8, rowY + 28);
      this.container.addChild(descText);

      const hireBtn = this._makeSmallButton(x + 150, rowY, "Hire", canHire ? 0x335522 : 0x222222, () => {
        const alive = state.escorts.filter((e) => e.alive).length;
        if (state.gold >= def.cost && alive < CaravanBalance.MAX_ESCORTS) {
          state.gold -= def.cost;
          _hireEscort(state, def);
          this._rebuild(state);
        }
      });
      this.container.addChild(hireBtn);

      rowY += 44;
    }
  }

  private _buildServicesPanel(
    state: CaravanState,
    x: number, y: number, w: number, h: number,
  ): void {
    const theme = PANEL_THEMES.services;
    const panel = new Graphics();
    drawPanelBorder(panel, x, y, w, h, theme.border);
    this.container.addChild(panel);

    const header = new Text({ text: `${theme.icon} Services & Upgrades`, style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: theme.border, fontWeight: "bold" }) });
    header.position.set(x + 8, y + 5);
    this.container.addChild(header);

    let rowY = y + 30;

    // --- Repair caravan ---
    const missingCaravan = state.caravan.maxHp - state.caravan.hp;
    const repairCost = Math.ceil(missingCaravan * CaravanBalance.HEAL_COST_PER_HP);
    const canRepair = state.gold >= repairCost && missingCaravan > 0;

    this.container.addChild(new Text({ text: "Repair Caravan", style: STYLE_LABEL })).position.set(x + 8, rowY);
    const repairInfo = new Text({
      text: missingCaravan > 0 ? `${Math.ceil(state.caravan.hp)}/${state.caravan.maxHp} HP — ${repairCost}g` : "Full HP",
      style: STYLE_DESC,
    });
    repairInfo.position.set(x + 8, rowY + 16);
    this.container.addChild(repairInfo);
    if (missingCaravan > 0) {
      this.container.addChild(this._makeSmallButton(x + 180, rowY, "Fix", canRepair ? 0x443322 : 0x222222, () => {
        const miss = state.caravan.maxHp - state.caravan.hp;
        const cost = Math.ceil(miss * CaravanBalance.HEAL_COST_PER_HP);
        if (state.gold >= cost && miss > 0) {
          state.gold -= cost;
          state.caravan.hp = state.caravan.maxHp;
          this._rebuild(state);
        }
      }));
    }
    rowY += 36;

    // --- Heal hero ---
    const missingPlayer = state.player.maxHp - state.player.hp;
    const healCost = Math.ceil(missingPlayer * CaravanBalance.PLAYER_HEAL_COST_PER_HP);
    const canHeal = state.gold >= healCost && missingPlayer > 0;

    this.container.addChild(new Text({ text: "Heal Hero", style: STYLE_LABEL })).position.set(x + 8, rowY);
    const healInfo = new Text({
      text: missingPlayer > 0 ? `${Math.ceil(state.player.hp)}/${state.player.maxHp} HP — ${healCost}g` : "Full HP",
      style: STYLE_DESC,
    });
    healInfo.position.set(x + 8, rowY + 16);
    this.container.addChild(healInfo);
    if (missingPlayer > 0) {
      this.container.addChild(this._makeSmallButton(x + 180, rowY, "Heal", canHeal ? 0x223344 : 0x222222, () => {
        const miss = state.player.maxHp - state.player.hp;
        const cost = Math.ceil(miss * CaravanBalance.PLAYER_HEAL_COST_PER_HP);
        if (state.gold >= cost && miss > 0) {
          state.gold -= cost;
          state.player.hp = state.player.maxHp;
          this._rebuild(state);
        }
      }));
    }
    rowY += 36;

    // --- Heal alive escorts ---
    const woundedEscorts = state.escorts.filter((e) => e.alive && e.hp < e.maxHp);
    if (woundedEscorts.length > 0) {
      this.container.addChild(new Text({ text: "Heal Escorts", style: STYLE_LABEL })).position.set(x + 8, rowY);
      rowY += 16;
      const totalHealCost = woundedEscorts.reduce((sum, e) => sum + Math.ceil((e.maxHp - e.hp) * 0.3), 0);
      const canHealAll = state.gold >= totalHealCost && totalHealCost > 0;
      this.container.addChild(this._makeWideButton(x + 8, rowY, `Heal All Escorts — ${totalHealCost}g`, canHealAll ? 0x334433 : 0x222222, () => {
        if (state.gold >= totalHealCost) {
          state.gold -= totalHealCost;
          for (const esc of state.escorts) {
            if (esc.alive) esc.hp = esc.maxHp;
          }
          this._rebuild(state);
        }
      }));
      rowY += 28;
    }

    // --- Revive fallen escorts ---
    const fallen = state.escorts.filter((e) => !e.alive);
    if (fallen.length > 0) {
      this.container.addChild(new Text({ text: "Revive Escorts", style: STYLE_LABEL })).position.set(x + 8, rowY);
      rowY += 18;
      for (const esc of fallen) {
        const reviveCost = Math.round(esc.def.cost * 0.4);
        const canRevive = state.gold >= reviveCost;
        const reviveText = new Text({
          text: `${esc.def.name} — ${reviveCost}g`,
          style: STYLE_DESC,
        });
        reviveText.position.set(x + 8, rowY);
        this.container.addChild(reviveText);
        this.container.addChild(this._makeSmallButton(x + 160, rowY - 2, "Revive", canRevive ? 0x443355 : 0x222222, () => {
          if (state.gold >= reviveCost) {
            state.gold -= reviveCost;
            esc.alive = true;
            esc.hp = esc.maxHp;
            esc.position.x = state.caravan.position.x;
            esc.position.y = state.caravan.position.y + 1;
            this._rebuild(state);
          }
        }));
        rowY += 18;
      }
      rowY += 4;
    }

    // --- Hero upgrades ---
    const upgSep = new Text({ text: "Hero Upgrades", style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: 0xffd700, fontWeight: "bold" }) });
    upgSep.position.set(x + 8, rowY);
    this.container.addChild(upgSep);
    rowY += 20;

    const lvl = state.player.level;
    const upgrades = [
      {
        label: `Attack +${CaravanBalance.UPGRADE_ATK_BONUS}`,
        cost: 80 + lvl * 30,
        apply: () => { state.player.atk += CaravanBalance.UPGRADE_ATK_BONUS; },
        stat: `ATK: ${state.player.atk}`,
      },
      {
        label: `Max HP +${CaravanBalance.UPGRADE_HP_BONUS}`,
        cost: 60 + lvl * 20,
        apply: () => {
          state.player.maxHp += CaravanBalance.UPGRADE_HP_BONUS;
          state.player.hp += CaravanBalance.UPGRADE_HP_BONUS;
        },
        stat: `HP: ${state.player.maxHp}`,
      },
      {
        label: `Speed +${CaravanBalance.UPGRADE_SPEED_BONUS}`,
        cost: 70 + lvl * 25,
        apply: () => { state.player.speed += CaravanBalance.UPGRADE_SPEED_BONUS; },
        stat: `SPD: ${state.player.speed.toFixed(1)}`,
      },
      {
        label: `Range +${CaravanBalance.UPGRADE_RANGE_BONUS}`,
        cost: 90 + lvl * 35,
        apply: () => { state.player.range += CaravanBalance.UPGRADE_RANGE_BONUS; },
        stat: `RNG: ${state.player.range.toFixed(1)}`,
      },
    ];

    for (const upg of upgrades) {
      const canBuy = state.gold >= upg.cost;
      const line = new Text({ text: `${upg.label} (${upg.cost}g)`, style: STYLE_DESC });
      line.position.set(x + 8, rowY);
      this.container.addChild(line);

      const statTxt = new Text({ text: upg.stat, style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0x6688aa }) });
      statTxt.position.set(x + 150, rowY);
      this.container.addChild(statTxt);

      const btn = this._makeSmallButton(x + 200, rowY - 2, "Buy", canBuy ? 0x334455 : 0x222222, () => {
        if (state.gold >= upg.cost) {
          state.gold -= upg.cost;
          upg.apply();
          state.player.level++;
          this._rebuild(state);
        }
      });
      this.container.addChild(btn);

      rowY += 22;
    }
  }

  private _buildInfoPanel(
    state: CaravanState,
    x: number, y: number, w: number, h: number,
  ): void {
    const theme = PANEL_THEMES.info;
    const panel = new Graphics();
    drawPanelBorder(panel, x, y, w, h, theme.border);
    this.container.addChild(panel);

    const header = new Text({ text: `${theme.icon} Journey Status`, style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: theme.border, fontWeight: "bold" }) });
    header.position.set(x + 8, y + 5);
    this.container.addChild(header);

    let infoY = y + 28;
    const stats = [
      `Segment: ${state.segment + 1} of ${state.totalSegments}`,
      `Hero Level: ${state.player.level}`,
      `Kills: ${state.totalKills}`,
      `Trade profit: ${state.totalTradeProfit}g`,
      `Total gold earned: ${state.totalGoldEarned}g`,
      `Caravan HP: ${Math.ceil(state.caravan.hp)}/${state.caravan.maxHp}`,
      `Cargo: ${state.cargo.reduce((s, c) => s + c.quantity, 0)}/${state.maxCargoSlots}`,
      state.defense > 0 ? `Defense: ${state.defense}` : "",
    ].filter(Boolean);
    for (const s of stats) {
      const t = new Text({ text: s, style: STYLE_DESC });
      t.position.set(x + 8, infoY);
      this.container.addChild(t);
      infoY += 15;
    }

    // Escort roster with HP
    const aliveEscorts = state.escorts.filter((e) => e.alive);
    if (aliveEscorts.length > 0) {
      infoY += 4;
      const escHeader = new Text({ text: "Escort Roster", style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0x88aa88 }) });
      escHeader.position.set(x + 8, infoY);
      this.container.addChild(escHeader);
      infoY += 14;
      for (const esc of aliveEscorts) {
        const hpPct = Math.round(esc.hp / esc.maxHp * 100);
        const hpCol = hpPct > 60 ? 0x88cc88 : hpPct > 30 ? 0xccaa44 : 0xcc4444;
        const escLine = new Text({
          text: `  ${esc.def.name}: ${esc.hp}/${esc.maxHp} HP`,
          style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: hpCol }),
        });
        escLine.position.set(x + 8, infoY);
        this.container.addChild(escLine);
        infoY += 13;
      }
    }

    // Next town preview
    const nextTown = getTownForSegment(state.towns, state.segment + 1);
    if (nextTown) {
      infoY += 8;
      const nextLabel = new Text({
        text: `Next stop: ${nextTown.name}`,
        style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0x88ccff }),
      });
      nextLabel.position.set(x + 8, infoY);
      this.container.addChild(nextLabel);
      infoY += 16;

      // Price comparison table for next town
      const nextTypeText = new Text({
        text: `(${nextTown.type})`,
        style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0x668899 }),
      });
      nextTypeText.position.set(x + 8, infoY);
      this.container.addChild(nextTypeText);
      infoY += 14;

      // Show all good prices at next town vs current
      const currentTown2 = getTownForSegment(state.towns, state.segment);
      for (const good of TRADE_GOODS) {
        const curPrice = currentTown2 ? getGoodPrice(good, currentTown2) : good.basePrice;
        const nextPrice = getGoodPrice(good, nextTown);
        const diff = nextPrice - curPrice;
        const diffCol = diff > 0 ? 0x44ff44 : diff < 0 ? 0xff6644 : 0x888888;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        const line = new Text({
          text: `${good.name}: ${nextPrice}g (${diffStr})`,
          style: new TextStyle({ fontFamily: "serif", fontSize: 9, fill: diffCol }),
        });
        line.position.set(x + 10, infoY);
        this.container.addChild(line);
        infoY += 12;
      }
    }

    // Current cargo value display
    infoY += 20;
    const valHeader = new Text({ text: "Cargo Manifest", style: STYLE_LABEL });
    valHeader.position.set(x + 8, infoY);
    this.container.addChild(valHeader);
    infoY += 18;

    for (const slot of state.cargo) {
      if (slot.quantity <= 0) continue;
      const t = new Text({
        text: `${slot.good.name} x${slot.quantity} (bought @${slot.purchasePrice}g)`,
        style: STYLE_DESC,
      });
      t.position.set(x + 8, infoY);
      this.container.addChild(t);
      infoY += 14;
    }
    if (state.cargo.length === 0) {
      const empty = new Text({ text: "Empty", style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0x555555 }) });
      empty.position.set(x + 8, infoY);
      this.container.addChild(empty);
    }
  }

  private _makeSmallButton(x: number, y: number, label: string, color: number, onClick: () => void): Container {
    const c = new Container();
    const bg = new Graphics()
      .roundRect(0, 0, 34, 18, 3).fill({ color })
      .roundRect(0, 0, 34, 18, 3).stroke({ color: 0x555555, width: 1 });
    const text = new Text({
      text: label,
      style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0xffffff }),
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(17, 9);
    c.addChild(bg, text);
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointerdown", onClick);
    return c;
  }

  private _makeWideButton(x: number, y: number, label: string, color: number, onClick: () => void): Container {
    const c = new Container();
    const bg = new Graphics()
      .roundRect(0, 0, 220, 22, 4).fill({ color })
      .roundRect(0, 0, 220, 22, 4).stroke({ color: 0x555555, width: 1 });
    const text = new Text({
      text: label,
      style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0xffffff }),
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(110, 11);
    c.addChild(bg, text);
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointerdown", onClick);
    return c;
  }
}

function _hireEscort(state: CaravanState, def: EscortDef): void {
  const cy = CaravanBalance.CARAVAN_Y;
  const idx = state.escorts.filter((e) => e.alive).length;
  state.escorts.push({
    id: state.nextEscortId++,
    def,
    position: {
      x: state.caravan.position.x + (idx % 2 === 0 ? -1.2 : 1.2),
      y: cy + (idx < 2 ? -1.2 : 1.2),
    },
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    speed: def.speed,
    range: def.range,
    attackTimer: 0,
    attackCooldown: CaravanBalance.ESCORT_ATTACK_COOLDOWN,
    alive: true,
    targetId: null,
    hitTimer: 0,
    atkBuffTimer: 0,
    atkBuffMult: 1,
  });
}
