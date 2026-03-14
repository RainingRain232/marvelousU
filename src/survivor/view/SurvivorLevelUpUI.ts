// ---------------------------------------------------------------------------
// Survivor level-up overlay + arcana selection + pause menu
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { t } from "@/i18n/i18n";
import { ARCANA_DEFS, ARCANA_CHOICES } from "../config/SurvivorArcanaDefs";
import type { SurvivorArcanaDef } from "../config/SurvivorArcanaDefs";
import type { UpgradeChoice } from "../systems/SurvivorLevelSystem";
import type { SurvivorState } from "../state/SurvivorState";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS, PASSIVE_DEFS, EVOLUTION_DEFS } from "../config/SurvivorWeaponDefs";
import type { SurvivorWeaponId, SurvivorPassiveId } from "../config/SurvivorWeaponDefs";

const STYLE_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 28, fill: 0xffd700, fontWeight: "bold", letterSpacing: 3 });
const STYLE_CHOICE_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc });
const STYLE_BTN = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" });

// ---------------------------------------------------------------------------
// Skill icon visual config per weapon/passive type
// ---------------------------------------------------------------------------

interface SkillIconStyle {
  symbol: string;
  bgColor: number;
  glowColor: number;
  borderColor: number;
  shape: "circle" | "diamond" | "hexagon" | "star";
}

const WEAPON_ICON_STYLES: Record<string, SkillIconStyle> = {
  fireball_ring: { symbol: "\u{1F525}", bgColor: 0x4a1000, glowColor: 0xff6600, borderColor: 0xff8800, shape: "circle" },
  arrow_volley: { symbol: "\u{27B3}", bgColor: 0x2a3000, glowColor: 0xddbb77, borderColor: 0xccaa55, shape: "diamond" },
  lightning_chain: { symbol: "\u{26A1}", bgColor: 0x0a1a3a, glowColor: 0xaaddff, borderColor: 0x88bbff, shape: "hexagon" },
  ice_nova: { symbol: "\u{2744}", bgColor: 0x0a2a3a, glowColor: 0x44aaff, borderColor: 0x66ccff, shape: "star" },
  holy_circle: { symbol: "\u{2721}", bgColor: 0x3a3000, glowColor: 0xffd700, borderColor: 0xffee44, shape: "circle" },
  catapult_strike: { symbol: "\u{25C9}", bgColor: 0x2a1a0a, glowColor: 0x886644, borderColor: 0xaa8855, shape: "diamond" },
  spinning_blade: { symbol: "\u{2694}", bgColor: 0x1a1a2a, glowColor: 0xcccccc, borderColor: 0xdddddd, shape: "hexagon" },
  warp_field: { symbol: "\u{2B2E}", bgColor: 0x1a0a2a, glowColor: 0x9944cc, borderColor: 0xbb66ee, shape: "star" },
  rune_circle: { symbol: "\u{2646}", bgColor: 0x2a0a1a, glowColor: 0xff4488, borderColor: 0xff66aa, shape: "hexagon" },
  soul_drain: { symbol: "\u{2620}", bgColor: 0x0a2a1a, glowColor: 0x44ff88, borderColor: 0x66ffaa, shape: "diamond" },
};

const PASSIVE_ICON_STYLES: Record<string, SkillIconStyle> = {
  plate_armor: { symbol: "\u{1F6E1}", bgColor: 0x1a1a2e, glowColor: 0x8899aa, borderColor: 0xaabbcc, shape: "hexagon" },
  swift_boots: { symbol: "\u{1F462}", bgColor: 0x1a2a1a, glowColor: 0x44cc88, borderColor: 0x66ddaa, shape: "diamond" },
  spell_tome: { symbol: "\u{1F4D6}", bgColor: 0x1a1a3a, glowColor: 0x6688ff, borderColor: 0x88aaff, shape: "star" },
  war_drum: { symbol: "\u{1F941}", bgColor: 0x2a1a0a, glowColor: 0xff8844, borderColor: 0xffaa66, shape: "circle" },
  lucky_coin: { symbol: "\u{1FA99}", bgColor: 0x2a2a0a, glowColor: 0xffd700, borderColor: 0xffee44, shape: "circle" },
  magnet: { symbol: "\u{1F9F2}", bgColor: 0x2a0a0a, glowColor: 0xff4444, borderColor: 0xff6666, shape: "diamond" },
  crown: { symbol: "\u{1F451}", bgColor: 0x3a2a0a, glowColor: 0xffd700, borderColor: 0xffcc00, shape: "star" },
  chalice: { symbol: "\u{1F3C6}", bgColor: 0x0a2a2a, glowColor: 0x44dddd, borderColor: 0x66eeee, shape: "hexagon" },
};

function _getSkillIconStyle(choice: UpgradeChoice): SkillIconStyle {
  if (choice.type === "weapon") {
    return WEAPON_ICON_STYLES[choice.id] ?? { symbol: "\u{2B24}", bgColor: 0x1a1a2e, glowColor: choice.color, borderColor: choice.color, shape: "circle" };
  }
  return PASSIVE_ICON_STYLES[choice.id] ?? { symbol: "\u{2B24}", bgColor: 0x1a1a2e, glowColor: 0x8899aa, borderColor: 0xaabbcc, shape: "circle" };
}

function _drawSkillShape(g: Graphics, cx: number, cy: number, r: number, shape: SkillIconStyle["shape"], fillColor: number, fillAlpha: number, strokeColor: number, strokeWidth: number): void {
  switch (shape) {
    case "circle":
      g.circle(cx, cy, r).fill({ color: fillColor, alpha: fillAlpha });
      g.circle(cx, cy, r).stroke({ color: strokeColor, width: strokeWidth });
      break;
    case "diamond": {
      g.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath()
        .fill({ color: fillColor, alpha: fillAlpha });
      g.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath()
        .stroke({ color: strokeColor, width: strokeWidth });
      break;
    }
    case "hexagon": {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 6; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath().fill({ color: fillColor, alpha: fillAlpha });
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 6; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath().stroke({ color: strokeColor, width: strokeWidth });
      break;
    }
    case "star": {
      const pts2: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.5;
        pts2.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
      }
      g.moveTo(pts2[0][0], pts2[0][1]);
      for (let i = 1; i < 10; i++) g.lineTo(pts2[i][0], pts2[i][1]);
      g.closePath().fill({ color: fillColor, alpha: fillAlpha });
      g.moveTo(pts2[0][0], pts2[0][1]);
      for (let i = 1; i < 10; i++) g.lineTo(pts2[i][0], pts2[i][1]);
      g.closePath().stroke({ color: strokeColor, width: strokeWidth });
      break;
    }
  }
}

export class SurvivorLevelUpUI {
  readonly levelUpOverlay = new Container();
  readonly arcanaOverlay = new Container();
  readonly pauseOverlay = new Container();

  private _onUpgrade: ((choice: UpgradeChoice) => void) | null = null;
  private _onArcana: ((arcana: SurvivorArcanaDef) => void) | null = null;
  private _tooltip = new Container();
  private _tooltipBg = new Graphics();
  private _tooltipContent = new Container();

  setUpgradeCallback(cb: (choice: UpgradeChoice) => void): void { this._onUpgrade = cb; }
  setArcanaCallback(cb: (arcana: SurvivorArcanaDef) => void): void { this._onArcana = cb; }

  showLevelUp(choices: UpgradeChoice[], level: number, sw: number, sh: number): void {
    this.levelUpOverlay.removeChildren();

    const dim = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    this.levelUpOverlay.addChild(dim);

    const title = new Text({ text: `LEVEL UP! (Lv.${level})`, style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, sh * 0.15);
    this.levelUpOverlay.addChild(title);

    const cardW = 220;
    const cardH = 120;
    const gap = 16;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const startY = sh * 0.35;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const iconStyle = _getSkillIconStyle(choice);
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.position.set(startX + i * (cardW + gap), startY);

      // Outer glow behind the card
      const outerGlow = new Graphics()
        .roundRect(-4, -4, cardW + 8, cardH + 8, 12)
        .fill({ color: iconStyle.glowColor, alpha: 0.08 });
      card.addChild(outerGlow);

      const bg = new Graphics()
        .roundRect(0, 0, cardW, cardH, 8)
        .fill({ color: iconStyle.bgColor, alpha: 0.95 })
        .roundRect(0, 0, cardW, cardH, 8)
        .stroke({ color: iconStyle.borderColor, width: 2.5 });
      card.addChild(bg);

      // Top accent line
      const accentLine = new Graphics()
        .roundRect(4, 0, cardW - 8, 3, 2)
        .fill({ color: iconStyle.glowColor, alpha: 0.6 });
      card.addChild(accentLine);

      // Skill icon (shaped background + symbol)
      const iconContainer = new Container();
      iconContainer.position.set(cardW - 36, 20);
      const iconBg = new Graphics();
      _drawSkillShape(iconBg, 0, 0, 18, iconStyle.shape, iconStyle.glowColor, 0.15, iconStyle.borderColor, 1.5);
      // Inner glow
      const innerGlow = new Graphics();
      _drawSkillShape(innerGlow, 0, 0, 10, iconStyle.shape, iconStyle.glowColor, 0.3, iconStyle.glowColor, 0);
      iconContainer.addChild(iconBg, innerGlow);
      // Symbol text
      const symbolText = new Text({
        text: iconStyle.symbol,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff }),
      });
      symbolText.anchor.set(0.5, 0.5);
      symbolText.position.set(0, 0);
      iconContainer.addChild(symbolText);
      card.addChild(iconContainer);

      const badge = new Text({
        text: choice.isNew ? "NEW" : `Lv.${choice.level}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: choice.isNew ? 0x44ff44 : 0xffd700, fontWeight: "bold" }),
      });
      badge.anchor.set(0, 0);
      badge.position.set(10, 8);
      card.addChild(badge);

      const name = new Text({ text: choice.name, style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: iconStyle.glowColor, fontWeight: "bold" }) });
      name.position.set(10, 24);
      card.addChild(name);

      const typeLabel = new Text({
        text: choice.type === "weapon" ? "WEAPON" : "PASSIVE",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: choice.type === "weapon" ? 0xff8844 : 0x44aaff }),
      });
      typeLabel.position.set(10, 46);
      card.addChild(typeLabel);

      const desc = new Text({ text: choice.description, style: STYLE_CHOICE_DESC });
      desc.position.set(10, 64);
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = cardW - 50;
      card.addChild(desc);

      card.on("pointerdown", () => this._onUpgrade?.(choice));
      card.on("pointerover", (e) => {
        bg.tint = 0x3366aa;
        outerGlow.alpha = 2;
        this._showUpgradeTooltip(choice, e.globalX, e.globalY, sw, sh);
      });
      card.on("pointermove", (e) => {
        if (this._tooltip.visible) this._positionLevelUpTooltip(e.globalX, e.globalY, sw, sh);
      });
      card.on("pointerout", () => { bg.tint = 0xffffff; outerGlow.alpha = 1; this._tooltip.visible = false; });

      this.levelUpOverlay.addChild(card);
    }

    // Tooltip layer (on top of cards)
    this._tooltip.removeChildren();
    this._tooltipBg = new Graphics();
    this._tooltipContent = new Container();
    this._tooltip.addChild(this._tooltipBg, this._tooltipContent);
    this._tooltip.visible = false;
    this.levelUpOverlay.addChild(this._tooltip);
  }

  hideLevelUp(): void {
    this.levelUpOverlay.removeChildren();
  }

  showArcanaSelection(state: SurvivorState, sw: number, sh: number): void {
    this.arcanaOverlay.removeChildren();

    const bg = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });
    bg.eventMode = "static";
    this.arcanaOverlay.addChild(bg);

    const title = new Text({ text: t("survivor.choose_arcana"), style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: 0xaa44ff, fontWeight: "bold" }) });
    title.anchor.set(0.5, 0.5);
    title.position.set(sw / 2, sh / 2 - 120);
    this.arcanaOverlay.addChild(title);

    const owned = new Set(state.arcana.map((a) => a.id));
    const available = ARCANA_DEFS.filter((a) => !owned.has(a.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, ARCANA_CHOICES);

    const cardW = 200;
    const gap = 15;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (sw - totalW) / 2;

    for (let i = 0; i < choices.length; i++) {
      const arcana = choices[i];
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.position.set(startX + i * (cardW + gap), sh / 2 - 60);

      const rarityColor = arcana.rarity === "legendary" ? 0xffd700 : arcana.rarity === "rare" ? 0x4488ff : 0xaaaaaa;
      const cardBg = new Graphics()
        .roundRect(0, 0, cardW, 140, 8)
        .fill({ color: 0x1a1a2e, alpha: 0.95 })
        .roundRect(0, 0, cardW, 140, 8)
        .stroke({ color: rarityColor, width: 2 });
      card.addChild(cardBg);

      const rarityLabel = new Text({ text: arcana.rarity.toUpperCase(), style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: rarityColor }) });
      rarityLabel.position.set(10, 8);
      card.addChild(rarityLabel);

      const nameText = new Text({ text: arcana.name, style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" }) });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(cardW / 2, 30);
      card.addChild(nameText);

      const descText = new Text({ text: arcana.description, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xaabbcc, wordWrap: true, wordWrapWidth: cardW - 20 }) });
      descText.position.set(10, 58);
      card.addChild(descText);

      card.on("pointerdown", () => this._onArcana?.(arcana));
      card.on("pointerover", () => { cardBg.tint = 0x6644aa; });
      card.on("pointerout", () => { cardBg.tint = 0xffffff; });

      this.arcanaOverlay.addChild(card);
    }
  }

  hideArcana(): void {
    this.arcanaOverlay.removeChildren();
  }

  showPauseMenu(state: SurvivorState, sw: number, sh: number, onResume: () => void, onQuit: () => void): void {
    this.pauseOverlay.removeChildren();

    const bg = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    bg.eventMode = "static";
    this.pauseOverlay.addChild(bg);

    const title = new Text({ text: t("survivor.paused"), style: new TextStyle({ fontFamily: "monospace", fontSize: 32, fill: 0xffd700, fontWeight: "bold", letterSpacing: 4 }) });
    title.anchor.set(0.5, 0.5);
    title.position.set(sw / 2, 40);
    this.pauseOverlay.addChild(title);

    const s = state;
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const statsText = new Text({
      text: `Time: ${mins}:${secs.toString().padStart(2, "0")}  |  Lv.${s.level}  |  Kills: ${s.totalKills}  |  Gold: ${s.gold}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xcccccc }),
    });
    statsText.anchor.set(0.5, 0);
    statsText.position.set(sw / 2, 70);
    this.pauseOverlay.addChild(statsText);

    // --- Inventory: Weapons ---
    const invY = 100;
    if (s.weapons.length > 0) {
      const weaponLabel = new Text({
        text: `WEAPONS (${s.weapons.length}/${SurvivorBalance.MAX_WEAPON_SLOTS})`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xff8844, fontWeight: "bold" }),
      });
      weaponLabel.anchor.set(0.5, 0);
      weaponLabel.position.set(sw / 2, invY);
      this.pauseOverlay.addChild(weaponLabel);

      const cardW = 200;
      const cardH = 100;
      const gap = 10;
      const totalW = s.weapons.length * cardW + (s.weapons.length - 1) * gap;
      const startX = (sw - totalW) / 2;

      for (let i = 0; i < s.weapons.length; i++) {
        const ws = s.weapons[i];
        const def = WEAPON_DEFS[ws.id];
        const card = this._buildInventoryCard(
          def.name + (ws.evolved ? " [EVOLVED]" : ""),
          ws.evolved ? "MAX" : `Lv.${ws.level}`,
          "WEAPON",
          ws.evolved ? 0xffd700 : def.color,
          this._getWeaponStatsText(ws.id, ws.level, ws.evolved),
          cardW, cardH,
        );
        card.position.set(startX + i * (cardW + gap), invY + 22);
        this.pauseOverlay.addChild(card);
      }
    }

    // --- Inventory: Passives ---
    const passiveY = invY + 132;
    if (s.passives.length > 0) {
      const passiveLabel = new Text({
        text: t("survivor.passives"),
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0x44aaff, fontWeight: "bold" }),
      });
      passiveLabel.anchor.set(0.5, 0);
      passiveLabel.position.set(sw / 2, passiveY);
      this.pauseOverlay.addChild(passiveLabel);

      const cardW = 180;
      const cardH = 70;
      const gap = 10;
      const totalW = s.passives.length * cardW + (s.passives.length - 1) * gap;
      const startX = (sw - totalW) / 2;

      for (let i = 0; i < s.passives.length; i++) {
        const ps = s.passives[i];
        const def = PASSIVE_DEFS[ps.id];
        const card = this._buildInventoryCard(
          def.name,
          `Lv.${ps.level}`,
          "PASSIVE",
          0x44aaff,
          this._getPassiveStatsText(ps.id, ps.level),
          cardW, cardH,
        );
        card.position.set(startX + i * (cardW + gap), passiveY + 22);
        this.pauseOverlay.addChild(card);
      }
    }

    // --- Arcana ---
    const arcanaY = s.passives.length > 0 ? passiveY + 102 : passiveY;
    if (s.arcana.length > 0) {
      const arcanaLabel = new Text({
        text: t("survivor.arcana"),
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xaa44ff, fontWeight: "bold" }),
      });
      arcanaLabel.anchor.set(0.5, 0);
      arcanaLabel.position.set(sw / 2, arcanaY);
      this.pauseOverlay.addChild(arcanaLabel);

      const cardW = 180;
      const cardH = 50;
      const gap = 10;
      const totalW = s.arcana.length * cardW + (s.arcana.length - 1) * gap;
      const startX = (sw - totalW) / 2;

      for (let i = 0; i < s.arcana.length; i++) {
        const arc = s.arcana[i];
        const rarityColor = arc.rarity === "legendary" ? 0xffd700 : arc.rarity === "rare" ? 0x4488ff : 0xaaaaaa;
        const card = this._buildInventoryCard(
          arc.name,
          arc.rarity.toUpperCase(),
          "",
          rarityColor,
          arc.description,
          cardW, cardH,
        );
        card.position.set(startX + i * (cardW + gap), arcanaY + 22);
        this.pauseOverlay.addChild(card);
      }
    }

    // --- Buttons ---
    const btnY = Math.max(sh - 90, arcanaY + (s.arcana.length > 0 ? 90 : 20));
    const resumeBtn = this._buildButton("RESUME", sw / 2 - 110, btnY, 0x224422, onResume);
    this.pauseOverlay.addChild(resumeBtn);

    const quitBtn = this._buildButton("QUIT TO MENU", sw / 2 + 110, btnY, 0x442222, onQuit);
    this.pauseOverlay.addChild(quitBtn);
  }

  private _buildInventoryCard(name: string, badge: string, typeLabel: string, borderColor: number, statsStr: string, w: number, h: number): Container {
    const card = new Container();

    const cardBg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a1a2e, alpha: 0.95 })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: borderColor, width: 1.5 });
    card.addChild(cardBg);

    const nameText = new Text({
      text: name,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold" }),
    });
    nameText.position.set(8, 6);
    card.addChild(nameText);

    const badgeText = new Text({
      text: badge,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xffd700, fontWeight: "bold" }),
    });
    badgeText.anchor.set(1, 0);
    badgeText.position.set(w - 8, 8);
    card.addChild(badgeText);

    if (typeLabel) {
      const typeLbl = new Text({
        text: typeLabel,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: typeLabel === "WEAPON" ? 0xff8844 : 0x44aaff }),
      });
      typeLbl.position.set(8, 22);
      card.addChild(typeLbl);
    }

    const statsY = typeLabel ? 35 : 24;
    const desc = new Text({
      text: statsStr,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb, wordWrap: true, wordWrapWidth: w - 16 }),
    });
    desc.position.set(8, statsY);
    card.addChild(desc);

    return card;
  }

  private _getWeaponStatsText(weaponId: SurvivorWeaponId, level: number, evolved: boolean): string {
    const def = WEAPON_DEFS[weaponId];
    if (evolved && def.evolutionId) {
      const evoDef = EVOLUTION_DEFS[def.evolutionId];
      const parts: string[] = [`DMG: ${evoDef.damage}`];
      if (evoDef.cooldown > 0) parts.push(`CD: ${evoDef.cooldown.toFixed(1)}s`);
      if (evoDef.area > 0) parts.push(`AREA: ${evoDef.area.toFixed(1)}`);
      if (evoDef.count > 1) parts.push(`COUNT: ${evoDef.count}`);
      return parts.join("  |  ");
    }
    const dmg = def.baseDamage + def.damagePerLevel * (level - 1);
    const cd = Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (level - 1));
    const area = def.baseArea + def.areaPerLevel * (level - 1);
    const count = def.baseCount + def.countPerLevel * (level - 1);
    const parts: string[] = [`DMG: ${dmg}`];
    if (cd > 0) parts.push(`CD: ${cd.toFixed(1)}s`);
    if (area > 0) parts.push(`AREA: ${area.toFixed(1)}`);
    if (count > 1) parts.push(`COUNT: ${count}`);
    if (def.basePierce > 0) parts.push(`PIERCE: ${def.basePierce}`);
    return parts.join("  |  ");
  }

  private _getPassiveStatsText(passiveId: SurvivorPassiveId, level: number): string {
    const def = PASSIVE_DEFS[passiveId];
    const parts: string[] = [];
    if (def.hpPerLevel) parts.push(`HP: +${def.hpPerLevel * level}`);
    if (def.speedPerLevel) parts.push(`Speed: +${(def.speedPerLevel * level * 100).toFixed(0)}%`);
    if (def.areaPerLevel) parts.push(`Area: +${(def.areaPerLevel * level * 100).toFixed(0)}%`);
    if (def.attackSpeedPerLevel) parts.push(`Atk Spd: +${(def.attackSpeedPerLevel * level * 100).toFixed(0)}%`);
    if (def.critPerLevel) parts.push(`Crit: +${(def.critPerLevel * level * 100).toFixed(0)}%`);
    if (def.pickupRadiusPerLevel) parts.push(`Pickup: +${def.pickupRadiusPerLevel * level}`);
    if (def.xpMultPerLevel) parts.push(`XP: +${(def.xpMultPerLevel * level * 100).toFixed(0)}%`);
    if (def.regenPerLevel) parts.push(`Regen: +${def.regenPerLevel * level} HP/s`);
    return parts.join("  |  ");
  }

  hidePause(): void {
    this.pauseOverlay.removeChildren();
  }

  private _showUpgradeTooltip(choice: UpgradeChoice, gx: number, gy: number, sw: number, sh: number): void {
    this._tooltipContent.removeChildren();
    const TT_W = 230;
    const TT_PAD = 10;
    let y = TT_PAD;

    if (choice.type === "weapon") {
      const def = WEAPON_DEFS[choice.id as SurvivorWeaponId];
      if (!def) return;

      const targetLevel = choice.level;
      const prevLevel = choice.isNew ? 0 : targetLevel - 1;

      // Stats at target level
      const dmg = def.baseDamage + def.damagePerLevel * (targetLevel - 1);
      const cd = Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (targetLevel - 1));
      const area = def.baseArea + def.areaPerLevel * (targetLevel - 1);
      const count = def.baseCount + def.countPerLevel * (targetLevel - 1);

      if (choice.isNew) {
        // New weapon — show base stats
        y = this._ttStat("DMG", `${dmg}`, "", y);
        y = this._ttStat("CD", `${cd.toFixed(1)}s`, "", y);
        if (area > 0) y = this._ttStat("AREA", `${area.toFixed(1)}`, "", y);
        y = this._ttStat("COUNT", `${count}`, "", y);
        if (def.basePierce > 0) y = this._ttStat("PIERCE", `${def.basePierce}`, "", y);
        if (def.baseSpeed > 0) y = this._ttStat("SPEED", `${def.baseSpeed}`, "", y);
      } else {
        // Level-up — show current -> next with delta
        const prevDmg = def.baseDamage + def.damagePerLevel * (prevLevel - 1);
        const prevCd = Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (prevLevel - 1));
        const prevArea = def.baseArea + def.areaPerLevel * (prevLevel - 1);
        const prevCount = def.baseCount + def.countPerLevel * (prevLevel - 1);

        y = this._ttStat("DMG", `${prevDmg}`, dmg !== prevDmg ? ` -> ${dmg} (+${dmg - prevDmg})` : "", y);
        y = this._ttStat("CD", `${prevCd.toFixed(1)}s`, cd !== prevCd ? ` -> ${cd.toFixed(1)}s` : "", y);
        if (area > 0 || prevArea > 0) {
          y = this._ttStat("AREA", `${prevArea.toFixed(1)}`, area !== prevArea ? ` -> ${area.toFixed(1)}` : "", y);
        }
        y = this._ttStat("COUNT", `${prevCount}`, count !== prevCount ? ` -> ${count}` : "", y);
      }

      // Evolution hint
      if (def.evolutionId && def.evolutionPassive) {
        y += 2;
        const passiveDef = PASSIVE_DEFS[def.evolutionPassive];
        const hint = new Text({
          text: `Evolves with: ${passiveDef?.name ?? def.evolutionPassive}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x888899 }),
        });
        hint.position.set(TT_PAD, y);
        this._tooltipContent.addChild(hint);
        y += 14;
      }
    } else {
      // Passive
      const def = PASSIVE_DEFS[choice.id as SurvivorPassiveId];
      if (!def) return;

      const bonuses: { label: string; value: string }[] = [];
      if (def.hpPerLevel) bonuses.push({ label: "HP", value: `+${def.hpPerLevel}/lv` });
      if (def.speedPerLevel) bonuses.push({ label: "Speed", value: `+${(def.speedPerLevel * 100).toFixed(0)}%/lv` });
      if (def.areaPerLevel) bonuses.push({ label: "Area", value: `+${(def.areaPerLevel * 100).toFixed(0)}%/lv` });
      if (def.attackSpeedPerLevel) bonuses.push({ label: "Atk Spd", value: `+${(def.attackSpeedPerLevel * 100).toFixed(0)}%/lv` });
      if (def.critPerLevel) bonuses.push({ label: "Crit", value: `+${(def.critPerLevel * 100).toFixed(0)}%/lv` });
      if (def.pickupRadiusPerLevel) bonuses.push({ label: "Pickup", value: `+${def.pickupRadiusPerLevel}/lv` });
      if (def.xpMultPerLevel) bonuses.push({ label: "XP", value: `+${(def.xpMultPerLevel * 100).toFixed(0)}%/lv` });
      if (def.regenPerLevel) bonuses.push({ label: "Regen", value: `+${def.regenPerLevel} HP/s/lv` });

      for (const b of bonuses) {
        y = this._ttStat(b.label, b.value, "", y);
      }

      if (!choice.isNew) {
        const totalLabel = new Text({
          text: `At Lv.${choice.level}:`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb }),
        });
        totalLabel.position.set(TT_PAD, y + 2);
        this._tooltipContent.addChild(totalLabel);
        y += 16;

        for (const b of bonuses) {
          // Show total at target level
          const numVal = parseFloat(b.value.replace(/[^0-9.]/g, ""));
          const isPercent = b.value.includes("%");
          const total = isPercent ? numVal * choice.level : numVal * choice.level;
          const totalStr = isPercent ? `${total.toFixed(0)}%` : `${total}`;
          y = this._ttStat(b.label, totalStr, " total", y);
        }
      }
    }

    const totalH = y + TT_PAD;
    this._tooltipBg.clear()
      .roundRect(0, 0, TT_W, totalH, 6).fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, totalH, 6).stroke({ color: 0xffd700, alpha: 0.55, width: 1.5 });

    this._positionLevelUpTooltip(gx, gy, sw, sh);
    this._tooltip.visible = true;
  }

  private _ttStat(label: string, value: string, delta: string, y: number): number {
    const TT_PAD = 10;
    const lbl = new Text({
      text: `${label}:`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8899aa }),
    });
    lbl.position.set(TT_PAD, y);
    this._tooltipContent.addChild(lbl);

    const val = new Text({
      text: value + delta,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: delta ? 0x44ff88 : 0xffd700 }),
    });
    val.position.set(TT_PAD + 75, y);
    this._tooltipContent.addChild(val);
    return y + 16;
  }

  private _positionLevelUpTooltip(gx: number, gy: number, sw: number, sh: number): void {
    const ttH = this._tooltipBg.height || 100;
    const x = Math.max(4, Math.min(gx + 16, sw - 240));
    const y = Math.max(4, Math.min(gy - ttH / 2, sh - ttH - 4));
    this._tooltip.position.set(x, y);
  }

  private _buildButton(label: string, x: number, y: number, bgColor: number, onClick: () => void): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const btnBg = new Graphics()
      .roundRect(-90, -18, 180, 36, 6)
      .fill({ color: bgColor })
      .roundRect(-90, -18, 180, 36, 6)
      .stroke({ color: 0x888888, width: 1 });
    btn.addChild(btnBg);
    const btnText = new Text({ text: label, style: STYLE_BTN });
    btnText.anchor.set(0.5, 0.5);
    btn.addChild(btnText);
    btn.position.set(x, y);
    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => { btnBg.tint = 0x66aaff; });
    btn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    return btn;
  }
}
