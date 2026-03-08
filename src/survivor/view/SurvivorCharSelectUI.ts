// ---------------------------------------------------------------------------
// Survivor character select + map select + meta upgrade shop
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, AnimatedSprite, Assets, Sprite, Texture } from "pixi.js";
import archerandswordsmanImgUrl from "@/img/archerandswordsman.png";
import { t } from "@/i18n/i18n";
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

const SURVIVOR_HINTS = [
  "Move constantly — staying still lets enemies surround you.",
  "Pick up XP orbs quickly. Levelling up fast unlocks stronger upgrades.",
  "Area-of-effect and piercing upgrades combo well against dense hordes.",
  "The Magnet passive pulls XP from far away — great on crowded maps.",
  "Each character plays differently — try them all to find your style.",
  "Larger maps give more room to kite, but enemies spread unpredictably.",
  "Meta upgrades persist between runs — invest early for long-term gains.",
  "Boss enemies spawn on a timer — watch the clock and save abilities.",
  "Choke points on the map let one good AoE weapon do all the work.",
  "Speed upgrades let you stay ahead of the horde and dictate the fight.",
  "Some weapons synergise with specific characters — experiment freely.",
  "Spending meta gold on HP upgrades makes every run more forgiving.",
];

export class SurvivorCharSelectUI {
  readonly container = new Container();
  private _selectedMapIndex = 0;
  private _survivorHintIndex = 0;
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
    const title = new Text({ text: t("survivor.select"), style: STYLE_TITLE });
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
    const mapTitle = new Text({ text: t("survivor.select_map"), style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" }) });
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

    // High score panel on the right
    const hsPanel = this._buildSurvivorHSPanel(saveData.highScores);
    hsPanel.position.set(sw - 320, 70);
    this.container.addChild(hsPanel);
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

  private _buildSurvivorHSPanel(scores: import("../state/SurvivorPersistence").HighScoreEntry[]): Container {
    const p = new Container();
    const W = 300;
    const bg = new Graphics();
    p.addChild(bg);

    let curY = 10;

    // Archer & swordsman image (async)
    const imgH = 90;
    const imgSlot = new Container();
    imgSlot.position.set(0, curY);
    p.addChild(imgSlot);
    void Assets.load(archerandswordsmanImgUrl).then((tex: Texture) => {
      if (!p.parent) return;
      const img = new Sprite(tex);
      const scale = Math.min(imgH / img.texture.height, (W - 20) / img.texture.width);
      img.scale.set(scale);
      img.anchor.set(0.5, 0);
      img.position.set(W / 2, 0);
      imgSlot.addChild(img);
    });
    curY += imgH + 6;

    // Title
    const titleStyle = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0xffd700, fontWeight: "bold", letterSpacing: 2 });
    const title = new Text({ text: "SURVIVOR  RECORDS", style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, curY);
    p.addChild(title);
    curY += 24;

    // Divider
    p.addChild(new Graphics().rect(10, curY, W - 20, 1).fill({ color: 0xffd700, alpha: 0.25 }));
    curY += 10;

    if (scores.length === 0) {
      const noStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x556677, letterSpacing: 1 });
      const noRuns = new Text({ text: "No runs recorded yet.\nPlay Survivor mode to set a record!", style: noStyle });
      noRuns.style.wordWrap = true;
      noRuns.style.wordWrapWidth = W - 20;
      noRuns.anchor.set(0.5, 0);
      noRuns.position.set(W / 2, curY);
      p.addChild(noRuns);
      curY += 42;
    } else {
      // --- Personal best banner ---
      const best = scores[0];
      const bestMins = Math.floor(best.timeSurvived / 60);
      const bestSecs = Math.floor(best.timeSurvived % 60);
      const bestTimeStr = `${bestMins}:${String(bestSecs).padStart(2, "0")}`;

      const bannerBg = new Graphics()
        .roundRect(10, 0, W - 20, 44, 6)
        .fill({ color: 0x001a00, alpha: 0.9 })
        .roundRect(10, 0, W - 20, 44, 6)
        .stroke({ color: 0xffd700, alpha: 0.7, width: 1.5 });
      bannerBg.position.set(0, curY);
      p.addChild(bannerBg);

      const pbLabel = new Text({ text: "PERSONAL BEST", style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x997700, letterSpacing: 2 }) });
      pbLabel.anchor.set(0.5, 0);
      pbLabel.position.set(W / 2, curY + 4);
      p.addChild(pbLabel);

      const pbTime = new Text({ text: bestTimeStr, style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xffd700, fontWeight: "bold" }) });
      pbTime.anchor.set(0.5, 0);
      pbTime.position.set(W / 2, curY + 16);
      p.addChild(pbTime);

      const pbSub = new Text({ text: `${best.characterName} · ${best.mapName}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xaabb88 }) });
      pbSub.anchor.set(1, 0);
      pbSub.position.set(W - 14, curY + 4);
      p.addChild(pbSub);

      curY += 52;

      // --- Aggregate stats ---
      const totalKills = scores.reduce((s, r) => s + r.kills, 0);
      const statStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x778899 });
      const statVStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xaaccdd, fontWeight: "bold" });

      const statsRow = new Container();
      const sRuns = new Text({ text: "RUNS", style: statStyle });
      const sRunsV = new Text({ text: String(scores.length), style: statVStyle });
      const sKills = new Text({ text: "TOTAL KILLS", style: statStyle });
      const sKillsV = new Text({ text: String(totalKills), style: statVStyle });
      sRuns.position.set(10, 0);
      sRunsV.position.set(48, 0);
      sKills.position.set(115, 0);
      sKillsV.position.set(210, 0);
      statsRow.addChild(sRuns, sRunsV, sKills, sKillsV);
      statsRow.position.set(0, curY);
      p.addChild(statsRow);
      curY += 18;

      // Divider
      p.addChild(new Graphics().rect(10, curY, W - 20, 1).fill({ color: 0x334455, alpha: 0.8 }));
      curY += 8;

      // --- Table header ---
      const hdrStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x8899aa, letterSpacing: 1 });
      const hdr = new Container();
      const hName = new Text({ text: "NAME", style: hdrStyle });
      const hMap = new Text({ text: "MAP", style: hdrStyle });
      const hTime = new Text({ text: "TIME", style: hdrStyle });
      const hLvl = new Text({ text: "LV", style: hdrStyle });
      hName.position.set(10, 0);
      hMap.position.set(90, 0);
      hTime.position.set(170, 0);
      hLvl.position.set(242, 0);
      hdr.addChild(hName, hMap, hTime, hLvl);
      hdr.position.set(0, curY);
      p.addChild(hdr);
      curY += 14;

      const MEDAL_COLORS = [0xffd700, 0xc0c0c0, 0xcd7f32];
      const rowStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xddeeff });

      const top = scores.slice(0, 8);
      for (let i = 0; i < top.length; i++) {
        const s = top[i];
        const mins = Math.floor(s.timeSurvived / 60);
        const secs = Math.floor(s.timeSurvived % 60);
        const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

        const rowH = 20;
        const rowBg = new Graphics()
          .rect(8, 0, W - 16, rowH)
          .fill({ color: i % 2 === 0 ? 0x111128 : 0x0d0d20, alpha: 0.7 });
        rowBg.position.set(0, curY);
        p.addChild(rowBg);

        const timeColor = i < 3 ? MEDAL_COLORS[i] : 0xddeeff;
        const wName = new Text({ text: s.characterName.slice(0, 8), style: rowStyle });
        const wMap = new Text({ text: s.mapName.slice(0, 8), style: rowStyle });
        const wTime = new Text({ text: timeStr, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: timeColor, fontWeight: i === 0 ? "bold" : "normal" }) });
        const wLvl = new Text({ text: String(s.level), style: rowStyle });
        wName.position.set(10, curY + 4);
        wMap.position.set(90, curY + 4);
        wTime.position.set(170, curY + 3);
        wLvl.position.set(242, curY + 4);
        p.addChild(wName, wMap, wTime, wLvl);
        curY += rowH;
      }
    }

    // --- Hints section ---
    curY += 6;
    p.addChild(new Graphics().rect(10, curY, W - 20, 1).fill({ color: 0x334455, alpha: 0.8 }));
    curY += 8;

    const tipLabel = new Text({ text: "TIP", style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x556677, letterSpacing: 2 }) });
    tipLabel.position.set(12, curY);
    p.addChild(tipLabel);
    curY += 14;

    const hintStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99bbcc, wordWrap: true, wordWrapWidth: W - 24 });
    const hintText = new Text({ text: SURVIVOR_HINTS[this._survivorHintIndex % SURVIVOR_HINTS.length], style: hintStyle });
    hintText.position.set(12, curY);
    p.addChild(hintText);
    curY += 40;

    // Next hint button
    const nextBtnW = W - 20;
    const nextBtnH = 22;
    const nextBtnBg = new Graphics()
      .roundRect(0, 0, nextBtnW, nextBtnH, 4)
      .fill({ color: 0x1a2030, alpha: 0.9 })
      .roundRect(0, 0, nextBtnW, nextBtnH, 4)
      .stroke({ color: 0x445566, width: 1 });
    const nextBtnLabel = new Text({ text: "NEXT TIP  →", style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x6688aa, letterSpacing: 1 }) });
    nextBtnLabel.anchor.set(0.5, 0.5);
    nextBtnLabel.position.set(nextBtnW / 2, nextBtnH / 2);
    const nextBtn = new Container();
    nextBtn.addChild(nextBtnBg, nextBtnLabel);
    nextBtn.position.set(10, curY);
    nextBtn.eventMode = "static";
    nextBtn.cursor = "pointer";
    nextBtn.on("pointerdown", () => {
      this._survivorHintIndex = (this._survivorHintIndex + 1) % SURVIVOR_HINTS.length;
      hintText.text = SURVIVOR_HINTS[this._survivorHintIndex];
    });
    nextBtn.on("pointerover", () => { nextBtnBg.tint = 0x3366aa; });
    nextBtn.on("pointerout", () => { nextBtnBg.tint = 0xffffff; });
    p.addChild(nextBtn);
    curY += nextBtnH;

    // Draw background
    curY += 12;
    bg.roundRect(0, 0, W, curY, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, W, curY, 8)
      .stroke({ color: 0xffd700, alpha: 0.4, width: 1.5 });

    return p;
  }

  private _buildMetaUpgradeSection(startY: number, sw: number, sh: number): Container {
    const section = new Container();

    const title = new Text({ text: t("survivor.upgrades"), style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" }) });
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
