// National overview screen — shows all owned cities and what they are producing.

import { Container, Graphics, Text, TextStyle, Sprite, Assets, Texture } from "pixi.js";
import { t } from "@/i18n/i18n";
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
    const title = new Text({ text: t("world.cities"), style: TITLE_STYLE });
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
      const noCity = new Text({ text: t("world.no_cities"), style: CELL_STYLE });
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
    const diploTitle = new Text({ text: t("world.diplomacy"), style: TITLE_STYLE });
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
      dipRow++;
    }

    this.container.addChild(this._content);
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

}

function _formatUnit(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const worldNationalScreen = new WorldNationalScreen();
