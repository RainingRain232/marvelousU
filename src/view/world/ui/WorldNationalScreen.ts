// National overview screen — shows all owned cities and what they are producing.

import { Container, Graphics, Text, TextStyle, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { armyUnitCount } from "@world/state/WorldArmy";
import { getLeader } from "@sim/config/LeaderDefs";

// Leader portrait images (same imports used in LeaderSelectScreen)
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";
import queenImgUrl from "@/img/queen.png";
import lancelotImgUrl from "@/img/lancelot.png";
import morganImgUrl from "@/img/morgan.png";
import gawainImgUrl from "@/img/gawain.png";
import galahadImgUrl from "@/img/galahad.png";
import percivalImgUrl from "@/img/percival.png";
import tristanImgUrl from "@/img/tristan.png";
import nimueImgUrl from "@/img/nimue.png";
import kayImgUrl from "@/img/kay.png";
import bedivereImgUrl from "@/img/bedivere.png";
import elaineImgUrl from "@/img/elaine.png";
import mordredImgUrl from "@/img/mordred.png";
import igraineImgUrl from "@/img/igraine.png";
import pellinoreImgUrl from "@/img/pellinore.png";
import ectorImgUrl from "@/img/ector.png";
import borsImgUrl from "@/img/bors.png";
import utherImgUrl from "@/img/uther.png";
import lotImgUrl from "@/img/lot.png";

const LEADER_IMAGES: Record<string, string> = {
  arthur: arthurImgUrl,
  merlin: merlinImgUrl,
  guinevere: queenImgUrl,
  lancelot: lancelotImgUrl,
  morgan: morganImgUrl,
  gawain: gawainImgUrl,
  galahad: galahadImgUrl,
  percival: percivalImgUrl,
  tristan: tristanImgUrl,
  nimue: nimueImgUrl,
  kay: kayImgUrl,
  bedivere: bedivereImgUrl,
  elaine: elaineImgUrl,
  mordred: mordredImgUrl,
  igraine: igraineImgUrl,
  pellinore: pellinoreImgUrl,
  ector: ectorImgUrl,
  bors: borsImgUrl,
  uther: utherImgUrl,
  lot: lotImgUrl,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fontWeight: "bold",
  fill: 0xaaaacc,
});

const CELL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
});

const IDLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x888888,
  fontStyle: "italic",
});

const LEADER_NAME_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const LEADER_TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fontStyle: "italic",
  fill: 0xaaaacc,
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fontStyle: "italic",
  fill: 0xaaaacc,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
});

// ---------------------------------------------------------------------------
// Leader introduction tracking (session-level — resets on page reload)
// ---------------------------------------------------------------------------

const _introducedLeaders = new Set<string>();

// ---------------------------------------------------------------------------
// Leader self-introductions — first-person, in their own voice
// ---------------------------------------------------------------------------

const LEADER_INTRODUCTIONS: Record<string, string> = {
  arthur: "I am Arthur Pendragon, rightful King of Britain. I drew the sword from the stone when no other hand could move it, and I shall wield it in defence of this land until my last breath. Stand with me, and together we shall build a kingdom worthy of the ages.",
  merlin: "Ah, you have found old Merlin at last. I have watched the stars turn for longer than mortal memory, and I have seen what is to come. Whether you heed my counsel or not, know this — the forces gathering against us care nothing for crowns or courtesies. We must be ready.",
  guinevere: "I am Guinevere, Queen of Camelot. Do not mistake grace for weakness — I have held this throne against treachery, siege, and whispered conspiracies while better warriors than you rode off to seek glory. My court, my rules.",
  lancelot: "They call me Lancelot du Lac. My blade has never known defeat, and I do not intend for that to change today. If you stand against me, know that no fortress wall and no shield wall has ever held against my charge. Choose your next words carefully.",
  morgan: "I am Morgan le Fay, and I have mastered arts that would shatter your fragile mind. The old magics answer to me — the whispers of Avalon, the secrets of the veil between worlds. Do not presume to understand what I am, little ruler. You see a woman; you should see a storm.",
  gawain: "Gawain of Orkney, at your service — for now. My strength waxes with the sun, and at noon I fight with the fury of three men. I walked to certain death against the Green Knight and came back smiling. Do not test whether my courtesy has limits.",
  galahad: "I am Galahad, and I seek not glory but purpose. The Siege Perilous accepted me where it destroyed all others, and I trust that providence guides my steps still. My sword serves the righteous, and my heart knows no compromise with evil.",
  percival: "I am Percival. They say I came to Camelot a simple fool from the Welsh hills, and perhaps I was. But I have looked upon the Grail, and that changes a man. I build, I fortify, and I endure — that is my way.",
  tristan: "I am Tristan of Cornwall, and my blade sings with a sorrow you could never understand. I have won kingdoms through single combat and claimed contested ground before defenders could draw steel. Make peace with me, or make peace with your maker.",
  nimue: "I am Nimue, Lady of the Lake, guardian of waters older than your bloodline. It was I who gave Arthur Excalibur, and I who raised Lancelot beneath enchanted waves. My blessing wards these walls, and my curse would shatter them. Tread carefully.",
  kay: "Sir Kay, Seneschal of Camelot. While the other knights chase glory and dragons, I manage the treasury, supply the armies, and make certain there is actually a kingdom to come home to. Without me, there is no Camelot — only a pile of very expensive rubble.",
  bedivere: "I am Bedivere, the first knight to swear fealty to Arthur and the last who shall ever abandon him. I lost a hand in battle and fought on. Where I stand, the line does not break. Ever. So consider well before you advance.",
  elaine: "I am Elaine, the Lily Maid of Astolat. They remember my broken heart, but they forget my deadly aim. I trained the finest archers in the realm, and my bowmen have made kings weep from a distance they never even saw. Underestimate me at your peril.",
  mordred: "I am Mordred, and I will have what is rightfully mine. My father denied me the throne, so I shall take it — along with everything else. My warriors strike fast and without mercy, because mercy is a luxury only the strong can afford, and I intend to be the strongest.",
  igraine: "I am Igraine, Duchess of Cornwall, mother of kings and enchantresses alike. I endured the schemes of Uther and the machinations of Merlin with a grace that concealed iron resolve. My temples and healers serve the realm, and my legacy of mercy shall outlast every war my children fight.",
  pellinore: "King Pellinore, sworn hunter of the Questing Beast. I have spent my life pursuing monsters through the wild places where civilised men fear to tread. The creatures of the forest answer to my call, and the beasts I raise are fiercer and more cunning than any your kennels could produce.",
  ector: "I am Ector, the humble lord who raised young Arthur as my own. I never sought the crown or the glory — I sought only to manage my estates with prudence and care. My treasury is always full, my people always fed. That is victory enough for a quiet man.",
  bors: "I am Bors the Steadfast. I am neither the purest knight nor the mightiest, but I am the one who is always exactly where I need to be. My soldiers absorb my confidence, and they fight with both greater heart and sharper steel because of it.",
  uther: "I am Uther Pendragon, the dragon-bannered king who united Britain by force when sweet words failed. Gold flows into my coffers because men fear what happens when it does not. Bend the knee, or discover why they call me the Pendragon.",
  lot: "I am Lot, King of Orkney, lord of the storm-battered northern isles. My keeps are carved from cliffs so sheer no army has ever scaled them. Thick walls, deep moats, and supplies for years — you may lay siege to my lands, but you will grow old and grey before they fall.",
};

// ---------------------------------------------------------------------------
// WorldNationalScreen
// ---------------------------------------------------------------------------

export class WorldNationalScreen {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(state: WorldState): void {
    this.container.visible = true;
    this._rebuild(state);
  }

  hide(): void {
    this.container.visible = false;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(state: WorldState): void {
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // Title
    const title = new Text({ text: "CITIES", style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 20;
    this._content.addChild(title);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Gather player cities
    const cities: WorldCity[] = [];
    for (const city of state.cities.values()) {
      if (city.owner === "p1") cities.push(city);
    }

    if (cities.length === 0) {
      const noCity = new Text({ text: "No cities.", style: CELL_STYLE });
      noCity.x = (sw - noCity.width) / 2;
      noCity.y = 80;
      this._content.addChild(noCity);
      this.container.addChild(this._content);
      return;
    }

    // Table columns
    const columns = ["City", "Pop", "Food", "Buildings", "Constructing", "Recruiting", "Garrison"];
    const colWidths = [120, 50, 60, 160, 160, 160, 80];
    const rowH = 28;
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const tableX = Math.max(20, (sw - totalW) / 2);
    const tableY = 60;

    // Header
    let hx = tableX;
    for (let c = 0; c < columns.length; c++) {
      const h = new Text({ text: columns[c], style: HEADER_STYLE });
      h.x = hx;
      h.y = tableY;
      this._content.addChild(h);
      hx += colWidths[c];
    }

    // Divider
    const div = new Graphics();
    div.rect(tableX, tableY + 18, totalW, 1);
    div.fill({ color: 0x555577 });
    this._content.addChild(div);

    // Rows
    for (let r = 0; r < cities.length; r++) {
      const city = cities[r];
      const y = tableY + 26 + r * rowH;

      // Garrison count
      let garrisonCount = 0;
      if (city.garrisonArmyId) {
        const g = state.armies.get(city.garrisonArmyId);
        if (g) garrisonCount = armyUnitCount(g);
      }

      // Construction status
      let constructing = "Idle";
      let constructStyle = IDLE_STYLE;
      if (city.constructionQueue.length > 0) {
        const q = city.constructionQueue[0];
        const pct = Math.floor((q.invested / q.cost) * 100);
        const extra = city.constructionQueue.length > 1 ? ` +${city.constructionQueue.length - 1}` : "";
        constructing = `${q.buildingType} (${pct}%)${extra}`;
        constructStyle = CELL_STYLE;
      }

      // Recruiting status
      let recruiting = "None";
      let recruitStyle = IDLE_STYLE;
      if (city.recruitmentQueue.length > 0) {
        const parts = city.recruitmentQueue.map(
          (e) => `${e.count}x ${_formatUnit(e.unitType)} (${e.turnsLeft}t)`,
        );
        recruiting = parts.join(", ");
        recruitStyle = CELL_STYLE;
      }

      const buildingNames = city.buildings.map((b) => _formatUnit(b.type)).join(", ") || "None";

      const values = [
        { text: `${city.name}${city.isCapital ? " *" : ""}`, style: CELL_STYLE },
        { text: `${city.population}`, style: CELL_STYLE },
        { text: `${city.foodStockpile}`, style: CELL_STYLE },
        { text: buildingNames, style: CELL_STYLE },
        { text: constructing, style: constructStyle },
        { text: recruiting, style: recruitStyle },
        { text: `${garrisonCount}`, style: CELL_STYLE },
      ];

      let cx = tableX;
      for (let c = 0; c < values.length; c++) {
        const t = new Text({ text: values[c].text, style: values[c].style });
        t.x = cx;
        t.y = y;
        // Clip text if it exceeds column width
        if (t.width > colWidths[c] - 8) {
          t.style.wordWrap = true;
          t.style.wordWrapWidth = colWidths[c] - 8;
        }
        this._content.addChild(t);
        cx += colWidths[c];
      }

      // Row separator
      const sep = new Graphics();
      sep.rect(tableX, y + 20, totalW, 1);
      sep.fill({ color: 0x333344, alpha: 0.4 });
      this._content.addChild(sep);
    }

    // -----------------------------------------------------------------------
    // Diplomacy section
    // -----------------------------------------------------------------------

    const diploY = tableY + 26 + cities.length * rowH + 30;
    const diploTitle = new Text({ text: "DIPLOMACY", style: TITLE_STYLE });
    diploTitle.x = (sw - diploTitle.width) / 2;
    diploTitle.y = diploY;
    this._content.addChild(diploTitle);

    const localPlayer = state.players.get("p1");
    const PORTRAIT_SIZE = 64;
    const ROW_H_DIPLO = PORTRAIT_SIZE + 16;
    let dipRow = 0;
    for (const [pid, player] of state.players) {
      if (pid === "p1" || !player.isAlive) continue;

      const y = diploY + 36 + dipRow * ROW_H_DIPLO;
      const relation = localPlayer?.diplomacy.get(pid) ?? "war";
      const raceName = player.raceId.charAt(0).toUpperCase() + player.raceId.slice(1);

      // Resolve leader info
      const leaderId = pid === "morgaine" ? "morgan" : player.leaderId;
      const leaderDef = leaderId ? getLeader(leaderId) : null;
      const leaderName = leaderDef?.name ?? pid.toUpperCase();
      const leaderTitle = leaderDef?.title ?? "";

      // Row background
      const rowBg = new Graphics();
      rowBg.roundRect(tableX - 8, y - 4, totalW + 16, ROW_H_DIPLO - 4, 6);
      rowBg.fill({ color: 0x111122, alpha: 0.6 });
      rowBg.stroke({ color: 0x333355, width: 1 });
      this._content.addChild(rowBg);

      // Portrait frame
      const portraitFrame = new Graphics();
      portraitFrame.roundRect(tableX, y, PORTRAIT_SIZE, PORTRAIT_SIZE, 4);
      portraitFrame.fill({ color: 0x080818 });
      portraitFrame.stroke({ color: relation === "war" ? 0x884444 : 0x448844, width: 1.5 });
      this._content.addChild(portraitFrame);

      // Load portrait image
      const imgUrl = leaderId ? LEADER_IMAGES[leaderId] : null;
      if (imgUrl) {
        void Assets.load(imgUrl).then((tex: Texture) => {
          if (!this.container.visible) return;
          const sprite = new Sprite(tex);
          const maxW = PORTRAIT_SIZE - 6;
          const maxH = PORTRAIT_SIZE - 6;
          const scale = Math.min(maxW / tex.width, maxH / tex.height);
          sprite.scale.set(scale);
          sprite.x = tableX + 3 + (maxW - tex.width * scale) / 2;
          sprite.y = y + 3 + (maxH - tex.height * scale) / 2;
          this._content.addChild(sprite);
        });
      }

      const textX = tableX + PORTRAIT_SIZE + 12;

      // Leader name
      const nameLabel = new Text({ text: leaderName, style: LEADER_NAME_STYLE });
      nameLabel.x = textX;
      nameLabel.y = y + 2;
      this._content.addChild(nameLabel);

      // Leader title
      if (leaderTitle) {
        const titleLabel = new Text({ text: leaderTitle, style: LEADER_TITLE_STYLE });
        titleLabel.x = textX;
        titleLabel.y = y + 20;
        this._content.addChild(titleLabel);
      }

      // Race label
      const raceLabel = new Text({
        text: `Race: ${raceName}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x8888aa }),
      });
      raceLabel.x = textX;
      raceLabel.y = y + 34;
      this._content.addChild(raceLabel);

      // Count cities and army strength for this player
      let playerCityCount = 0;
      for (const c of state.cities.values()) {
        if (c.owner === pid) playerCityCount++;
      }
      let playerArmyStrength = 0;
      for (const a of state.armies.values()) {
        if (a.owner === pid) playerArmyStrength += armyUnitCount(a);
      }

      // Stats
      const statsLabel = new Text({
        text: `Cities: ${playerCityCount}  Army: ${playerArmyStrength} units`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8888aa }),
      });
      statsLabel.x = textX;
      statsLabel.y = y + 48;
      this._content.addChild(statsLabel);

      // Relation label
      const relColor = relation === "war" ? 0xff4444 : 0x44cc44;
      const relLabel = new Text({
        text: relation === "war" ? "AT WAR" : "PEACE",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fontWeight: "bold", fill: relColor }),
      });
      relLabel.x = tableX + 380;
      relLabel.y = y + 20;
      this._content.addChild(relLabel);

      // Toggle button
      const toggleLabel = relation === "war" ? "Propose Peace" : "Declare War";
      const toggleColor = relation === "war" ? 0x336633 : 0x663333;
      const toggleBtn = new Container();
      toggleBtn.eventMode = "static";
      toggleBtn.cursor = "pointer";
      const tbg = new Graphics();
      tbg.roundRect(0, 0, 120, 22, 4);
      tbg.fill({ color: toggleColor });
      tbg.stroke({ color: relation === "war" ? 0x55aa55 : 0xaa5555, width: 1 });
      toggleBtn.addChild(tbg);
      const tTxt = new Text({
        text: toggleLabel,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fontWeight: "bold", fill: 0xffffff }),
      });
      tTxt.x = 8;
      tTxt.y = 3;
      toggleBtn.addChild(tTxt);
      toggleBtn.x = tableX + 480;
      toggleBtn.y = y + 20;

      const targetPid = pid;
      toggleBtn.on("pointerdown", () => {
        if (!localPlayer) return;
        const currentRel = localPlayer.diplomacy.get(targetPid) ?? "war";
        const newRel = currentRel === "war" ? "peace" : "war";
        localPlayer.diplomacy.set(targetPid, newRel);
        // Mirror the relation
        const other = state.players.get(targetPid);
        if (other) other.diplomacy.set("p1", newRel);
        // Rebuild
        this._rebuild(state);
      });

      this._content.addChild(toggleBtn);

      // First-time introduction
      if (leaderId && !_introducedLeaders.has(leaderId)) {
        _introducedLeaders.add(leaderId);
        this._showIntroduction(leaderDef!, relation, sw, sh);
      }

      dipRow++;
    }

    this.container.addChild(this._content);
  }

  // -----------------------------------------------------------------------
  // Leader introduction overlay
  // -----------------------------------------------------------------------

  private _showIntroduction(
    leader: import("@sim/config/LeaderDefs").LeaderDef,
    relation: "war" | "peace",
    sw: number,
    sh: number,
  ): void {
    const intro = LEADER_INTRODUCTIONS[leader.id];
    if (!intro) return;

    const overlay = new Container();

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    overlay.addChild(bg);

    // Dialog box
    const DW = 540;
    const DH = 320;
    const dx = (sw - DW) / 2;
    const dy = (sh - DH) / 2;

    const borderColor = relation === "war" ? 0xaa4444 : 0x44aa66;

    const dialogBg = new Graphics();
    dialogBg.roundRect(dx, dy, DW, DH, 10);
    dialogBg.fill({ color: 0x0c0c24, alpha: 0.95 });
    dialogBg.stroke({ color: borderColor, width: 2 });
    overlay.addChild(dialogBg);

    // Portrait
    const PW = 140;
    const PH = 180;
    const px = dx + 20;
    const py = dy + 50;

    const portraitFrame = new Graphics();
    portraitFrame.roundRect(px, py, PW, PH, 6);
    portraitFrame.fill({ color: 0x080818 });
    portraitFrame.stroke({ color: borderColor, width: 1.5 });
    overlay.addChild(portraitFrame);

    const imgUrl = LEADER_IMAGES[leader.id];
    if (imgUrl) {
      void Assets.load(imgUrl).then((tex: Texture) => {
        if (!overlay.parent) return;
        const sprite = new Sprite(tex);
        const maxW = PW - 10;
        const maxH = PH - 10;
        const scale = Math.min(maxW / tex.width, maxH / tex.height);
        sprite.scale.set(scale);
        sprite.x = px + 5 + (maxW - tex.width * scale) / 2;
        sprite.y = py + 5 + (maxH - tex.height * scale) / 2;
        overlay.addChild(sprite);
      });
    }

    // Name
    const nameText = new Text({ text: leader.name.toUpperCase(), style: TITLE_STYLE });
    nameText.x = dx + 20;
    nameText.y = dy + 14;
    overlay.addChild(nameText);

    // Title
    const titleText = new Text({ text: leader.title, style: SUBTITLE_STYLE });
    titleText.x = dx + 20 + nameText.width + 12;
    titleText.y = dy + 20;
    overlay.addChild(titleText);

    // Introduction quote
    const bodyStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xdddddd,
      wordWrap: true,
      wordWrapWidth: DW - PW - 60,
      lineHeight: 20,
    });
    const quoteText = new Text({ text: `"${intro}"`, style: bodyStyle });
    quoteText.x = px + PW + 20;
    quoteText.y = py + 10;
    overlay.addChild(quoteText);

    // Decorative quote mark
    const bigQuote = new Text({
      text: "\u201C",
      style: new TextStyle({ fontFamily: "serif", fontSize: 48, fill: borderColor }),
    });
    bigQuote.x = px + PW + 12;
    bigQuote.y = py - 10;
    overlay.addChild(bigQuote);

    // Dismiss button
    const dismissBtn = this._makeBtn("Very well.", dx + DW / 2 - 60, dy + DH - 48, 120, 28, () => {
      overlay.removeFromParent();
      overlay.destroy({ children: true });
    });
    overlay.addChild(dismissBtn);

    this._content.addChild(overlay);
  }

  private _makeClose(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 24, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "X",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xff6666 }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(12, 12);
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.hide());
    return btn;
  }

  private _makeBtn(label: string, x: number, y: number, w: number, h: number, onClick?: () => void): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: 0x222244 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.x = (w - txt.width) / 2;
    txt.y = (h - txt.height) / 2;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => (onClick ? onClick() : this.hide()));

    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0x334466 });
      bg.stroke({ color: 0x6688aa, width: 1 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0x222244 });
      bg.stroke({ color: 0x555577, width: 1 });
    });

    return btn;
  }
}

function _formatUnit(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const worldNationalScreen = new WorldNationalScreen();
