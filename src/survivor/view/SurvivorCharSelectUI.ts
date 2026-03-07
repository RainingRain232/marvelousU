// ---------------------------------------------------------------------------
// Survivor character select + map select + meta upgrade shop
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, AnimatedSprite } from "pixi.js";
import { UnitState, MapType } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";
import { SURVIVOR_MAPS } from "../config/SurvivorBalanceConfig";
import { SURVIVOR_CHARACTERS } from "../config/SurvivorCharacterDefs";
import type { SurvivorCharacterDef } from "../config/SurvivorCharacterDefs";
import { WEAPON_DEFS } from "../config/SurvivorWeaponDefs";
import { META_UPGRADES } from "../config/SurvivorMetaUpgradeDefs";
import { SurvivorPersistence } from "../state/SurvivorPersistence";

const STYLE_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 28, fill: 0xffd700, fontWeight: "bold", letterSpacing: 3 });
const STYLE_CHAR_NAME = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" });
const STYLE_CHAR_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc });
export class SurvivorCharSelectUI {
  readonly container = new Container();
  private _selectedMapIndex = 0;
  private _onStart: ((charDef: SurvivorCharacterDef, mapIndex: number) => void) | null = null;

  setStartCallback(cb: (charDef: SurvivorCharacterDef, mapIndex: number) => void): void {
    this._onStart = cb;
  }

  get selectedMapIndex(): number { return this._selectedMapIndex; }

  show(sw: number, sh: number): void {
    this.container.removeChildren();

    // Background
    const bg = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x0a0a18, alpha: 0.95 });
    this.container.addChild(bg);

    // Title
    const title = new Text({ text: "SELECT SURVIVOR", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 20);
    this.container.addChild(title);

    // Gold display
    const saveData = SurvivorPersistence.load();
    const goldText = new Text({ text: `Gold: ${saveData.totalGold}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffd700, fontWeight: "bold" }) });
    goldText.anchor.set(1, 0);
    goldText.position.set(sw - 20, 25);
    this.container.addChild(goldText);

    // Character cards
    const cardW = 180;
    const cardH = 210;
    const gap = 12;
    const cols = Math.min(SURVIVOR_CHARACTERS.length, 4);
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (sw - totalW) / 2;
    const startY = 70;

    for (let i = 0; i < SURVIVOR_CHARACTERS.length; i++) {
      const charDef = SURVIVOR_CHARACTERS[i];
      const isUnlocked = charDef.unlocked || saveData.unlockedCharacters.includes(charDef.id);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const card = this._buildCharCard(charDef, cardW, cardH, isUnlocked, saveData.totalGold, sw, sh);
      card.position.set(startX + col * (cardW + gap), startY + row * (cardH + gap));
      this.container.addChild(card);
    }

    // Map selection
    const rows2 = Math.ceil(SURVIVOR_CHARACTERS.length / cols);
    const mapSectionY = startY + rows2 * (cardH + gap) + 10;
    const mapTitle = new Text({ text: "SELECT MAP", style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" }) });
    mapTitle.anchor.set(0.5, 0);
    mapTitle.position.set(sw / 2, mapSectionY);
    this.container.addChild(mapTitle);

    const mapCardW = 140;
    const mapCardH = 60;
    const mapGap = 10;
    const mapTotalW = SURVIVOR_MAPS.length * mapCardW + (SURVIVOR_MAPS.length - 1) * mapGap;
    const mapStartX = (sw - mapTotalW) / 2;
    const mapStartY = mapSectionY + 30;

    for (let i = 0; i < SURVIVOR_MAPS.length; i++) {
      const mapDef = SURVIVOR_MAPS[i];
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.position.set(mapStartX + i * (mapCardW + mapGap), mapStartY);

      const isSelected = i === this._selectedMapIndex;
      const mapBg = new Graphics()
        .roundRect(0, 0, mapCardW, mapCardH, 6)
        .fill({ color: isSelected ? 0x2a3a4a : 0x1a1a2e, alpha: 0.9 })
        .roundRect(0, 0, mapCardW, mapCardH, 6)
        .stroke({ color: isSelected ? 0xffd700 : 0x445566, width: isSelected ? 2 : 1 });
      card.addChild(mapBg);

      const swatchColor = this._getMapSwatchColor(mapDef.mapType);
      const swatch = new Graphics().roundRect(8, 8, 20, 20, 3).fill({ color: swatchColor });
      card.addChild(swatch);

      const nameText = new Text({ text: mapDef.name, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: isSelected ? 0xffd700 : 0xaabbcc, fontWeight: isSelected ? "bold" : "normal" }) });
      nameText.position.set(34, 8);
      card.addChild(nameText);

      const sizeText = new Text({ text: `${mapDef.width}×${mapDef.height}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x667788 }) });
      sizeText.position.set(34, 28);
      card.addChild(sizeText);

      const idx = i;
      card.on("pointerdown", () => {
        this._selectedMapIndex = idx;
        this.show(sw, sh);
      });
      card.on("pointerover", () => { if (idx !== this._selectedMapIndex) mapBg.tint = 0x3366aa; });
      card.on("pointerout", () => { mapBg.tint = 0xffffff; });

      this.container.addChild(card);
    }

    // Meta upgrade shop
    const metaSectionY = mapStartY + mapCardH + 20;
    const metaSection = this._buildMetaUpgradeSection(metaSectionY, sw, sh);
    this.container.addChild(metaSection);
  }

  private _getMapSwatchColor(mapType: MapType): number {
    switch (mapType) {
      case MapType.MEADOW: return 0x44aa44;
      case MapType.FOREST: return 0x226633;
      case MapType.TUNDRA: return 0xaaccdd;
      case MapType.VOLCANIC: return 0xcc4422;
      case MapType.SWAMP: return 0x446644;
      case MapType.DESERT: return 0xccaa66;
      default: return 0x888888;
    }
  }

  private _buildCharCard(charDef: SurvivorCharacterDef, w: number, h: number, isUnlocked: boolean, currentGold: number, sw: number, sh: number): Container {
    const card = new Container();
    card.eventMode = "static";
    card.cursor = isUnlocked ? "pointer" : "default";

    const borderColor = isUnlocked ? 0x4488cc : 0x333344;
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: isUnlocked ? 0x1a1a2e : 0x111122, alpha: 0.9 })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: borderColor, width: 2 });
    card.addChild(bg);

    const frames = animationManager.getFrames(charDef.unitType, UnitState.IDLE);
    if (frames.length > 0) {
      const preview = new AnimatedSprite(frames);
      preview.animationSpeed = 0.12;
      preview.play();
      preview.anchor.set(0.5, 0.5);
      preview.position.set(w / 2, 55);
      preview.scale.set(2);
      if (!isUnlocked) preview.tint = 0x444444;
      card.addChild(preview);
    }

    const nameText = new Text({ text: charDef.name, style: STYLE_CHAR_NAME });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(w / 2, 100);
    if (!isUnlocked) nameText.tint = 0x666666;
    card.addChild(nameText);

    const weaponDef = WEAPON_DEFS[charDef.startingWeapon];
    const weaponText = new Text({ text: weaponDef.name, style: STYLE_CHAR_DESC });
    weaponText.anchor.set(0.5, 0);
    weaponText.position.set(w / 2, 125);
    card.addChild(weaponText);

    const descText = new Text({ text: charDef.description, style: STYLE_CHAR_DESC });
    descText.anchor.set(0.5, 0);
    descText.position.set(w / 2, 148);
    descText.style.wordWrap = true;
    descText.style.wordWrapWidth = w - 20;
    card.addChild(descText);

    if (isUnlocked) {
      card.on("pointerdown", () => {
        this._onStart?.(charDef, this._selectedMapIndex);
      });
      card.on("pointerover", () => { bg.tint = 0x3366aa; });
      card.on("pointerout", () => { bg.tint = 0xffffff; });
    } else {
      const canAfford = currentGold >= charDef.unlockCost;
      const lockBg = new Graphics()
        .roundRect(w / 2 - 60, h - 38, 120, 28, 4)
        .fill({ color: canAfford ? 0x2a4a2a : 0x2a2a2a })
        .roundRect(w / 2 - 60, h - 38, 120, 28, 4)
        .stroke({ color: canAfford ? 0xffd700 : 0x555555, width: 1 });
      card.addChild(lockBg);
      const lockText = new Text({
        text: `Unlock: ${charDef.unlockCost}g`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: canAfford ? 0xffd700 : 0x666666, fontWeight: "bold" }),
      });
      lockText.anchor.set(0.5, 0.5);
      lockText.position.set(w / 2, h - 24);
      card.addChild(lockText);

      if (canAfford) {
        card.cursor = "pointer";
        card.on("pointerdown", () => {
          if (SurvivorPersistence.unlockCharacter(charDef.id, charDef.unlockCost)) {
            this.show(sw, sh);
          }
        });
        card.on("pointerover", () => { bg.tint = 0x335533; });
        card.on("pointerout", () => { bg.tint = 0xffffff; });
      }
    }

    return card;
  }

  private _buildMetaUpgradeSection(startY: number, sw: number, sh: number): Container {
    const section = new Container();

    const title = new Text({ text: "UPGRADES", style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" }) });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 0);
    section.addChild(title);

    const saveData = SurvivorPersistence.load();
    const cardW = 130;
    const cardH = 80;
    const gap = 8;
    const cols = Math.min(META_UPGRADES.length, 6);
    const totalW = cols * cardW + (cols - 1) * gap;
    const metaStartX = (sw - totalW) / 2;

    for (let i = 0; i < META_UPGRADES.length; i++) {
      const upgrade = META_UPGRADES[i];
      const level = saveData.metaUpgrades[upgrade.id] ?? 0;
      const maxed = level >= upgrade.maxLevel;
      const cost = maxed ? 0 : upgrade.costPerLevel[level];
      const canAfford = !maxed && saveData.totalGold >= cost;

      const card = new Container();
      card.eventMode = "static";
      card.cursor = canAfford ? "pointer" : "default";
      card.position.set(metaStartX + i * (cardW + gap), 30);

      const cardBg = new Graphics()
        .roundRect(0, 0, cardW, cardH, 6)
        .fill({ color: 0x1a1a2e, alpha: 0.9 })
        .roundRect(0, 0, cardW, cardH, 6)
        .stroke({ color: maxed ? 0xffd700 : canAfford ? 0x448844 : 0x333344, width: 1 });
      card.addChild(cardBg);

      const nameText = new Text({ text: upgrade.name, style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold" }) });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(cardW / 2, 6);
      card.addChild(nameText);

      const lvlText = new Text({ text: maxed ? "MAX" : `Lv.${level}/${upgrade.maxLevel}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: maxed ? 0xffd700 : 0xaabbcc }) });
      lvlText.anchor.set(0.5, 0);
      lvlText.position.set(cardW / 2, 24);
      card.addChild(lvlText);

      const descText = new Text({ text: upgrade.description, style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x889999 }) });
      descText.anchor.set(0.5, 0);
      descText.position.set(cardW / 2, 40);
      card.addChild(descText);

      if (!maxed) {
        const costText = new Text({ text: `${cost}g`, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: canAfford ? 0xffd700 : 0x666666, fontWeight: "bold" }) });
        costText.anchor.set(0.5, 0);
        costText.position.set(cardW / 2, 60);
        card.addChild(costText);
      }

      if (canAfford) {
        card.on("pointerdown", () => {
          SurvivorPersistence.purchaseMetaUpgrade(upgrade.id);
          this.show(sw, sh);
        });
        card.on("pointerover", () => { cardBg.tint = 0x335533; });
        card.on("pointerout", () => { cardBg.tint = 0xffffff; });
      }

      section.addChild(card);
    }

    section.position.set(0, startY);
    return section;
  }
}
