// Main menu wiki screen — tabbed encyclopedia with lore, units, spells, buildings.
// Accessed from the main menu via the WIKI button.

import {
  Container, Graphics, Text, TextStyle, Rectangle,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_TAB = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xaabbcc, fontWeight: "bold",
});

const STYLE_TAB_ACTIVE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_BODY = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xccddee,
  wordWrap: true, wordWrapWidth: 900,
  lineHeight: 20,
});

const STYLE_LORE_HEADING = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold",
  letterSpacing: 1,
});

// Layout
const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_W = 1000;
const CARD_H = 700;
const CORNER_R = 10;
const TAB_H = 36;

type WikiTab = "lore" | "units" | "spells" | "buildings";

const TAB_DEFS: { id: WikiTab; label: string }[] = [
  { id: "lore", label: "LORE" },
  { id: "units", label: "UNITS" },
  { id: "spells", label: "SPELLS" },
  { id: "buildings", label: "BUILDINGS" },
];

// ---------------------------------------------------------------------------
// Lore content (from arthurian_lore.docx)
// ---------------------------------------------------------------------------

interface LoreSection {
  heading: string;
  body: string;
}

const LORE_SECTIONS: LoreSection[] = [
  {
    heading: "THE CHRONICLES OF CAMELOT",
    body: "A World Compendium — Background Lore",
  },
  {
    heading: "The Age of Arthur",
    body: "Britain stands fractured. The Roman legions withdrew generations ago, leaving behind crumbling roads, empty forts, and a power vacuum that a dozen petty kings rushed to fill. Saxon warbands raid the eastern shores with growing boldness. The old Celtic faiths clash with the rising influence of Christian monasteries. Into this chaos steps Arthur Pendragon, a young warlord of uncertain parentage who draws a blade from an enchanted stone and unites the warring kingdoms under a single banner. His reign ushers in a brief golden age, but the seeds of its downfall are sown from the very beginning.",
  },
  {
    heading: "The Rise of a King",
    body: "Arthur is raised in obscurity by Sir Ector, unaware of his true bloodline. His father, Uther Pendragon, conceived him through a deception engineered by the sorcerer Merlin, who demanded the child as payment for his services. When Uther dies without a recognized heir, the realm splinters. Merlin orchestrates a test: a sword embedded in an anvil atop a stone, inscribed with the promise that whoever draws it is the rightful king. Arthur, serving as squire to Ector's son Kay, pulls the blade almost by accident. The act is met not with celebration but with fury. Established lords refuse to kneel before an unknown boy. Arthur must win his throne through a brutal campaign of battles against rebel kings, Saxon invaders, and opportunistic warlords. Only after years of bloodshed does he consolidate enough power to establish his court at Camelot.",
  },
  {
    heading: "Camelot and the Round Table",
    body: "Camelot is more than a castle. It is an idea: that justice and honour can hold together a kingdom that violence alone cannot. At its heart sits the Round Table, a massive circular council where no seat ranks above another. Arthur fills these seats with the greatest warriors and noblest minds of the age. Each knight swears an oath to defend the weak, speak truth, and pursue justice above personal gain. The system works, for a time. Disputes between lords are settled by law rather than sword. Trade routes are protected. The Saxon advance is halted. But the Table's strength is also its fragility. It depends entirely on the moral integrity of its members, and mortals are imperfect creatures.",
  },
  {
    heading: "Arthur Pendragon",
    body: "A warrior-king who genuinely believes in the ideals he preaches. Arthur is neither naive nor cruel. He is a skilled battlefield commander who would rather negotiate than fight, but who fights decisively when negotiation fails. His greatest flaw is a tendency to trust the people he loves long past the point where that trust is warranted. He knows, on some level, what transpires between Lancelot and Guinevere, but confronting it would destroy everything he has built. This willful blindness ultimately costs him his kingdom.",
  },
  {
    heading: "Merlin",
    body: "The architect behind Arthur's rise. Merlin is ancient, possibly half-human, and operates on a timescale that makes his motives opaque to everyone around him. He sees fragments of the future and manipulates events to steer history toward outcomes only he understands. He is Arthur's greatest asset and most dangerous ally. His power is immense but not unlimited. He is ultimately undone not by an enemy but by his own fascination with the enchantress Nimue, who traps him using the very magic he taught her.",
  },
  {
    heading: "Guinevere",
    body: "Arthur's queen is a political figure in her own right, not merely a consort. She is intelligent, ambitious, and deeply committed to Camelot's success. Her affair with Lancelot is not a simple betrayal but a tragic collision between personal desire and public duty. She loves Arthur as a partner and Lancelot as a soul. The impossibility of reconciling these loyalties tears all three of them apart and provides the crack through which Camelot's enemies strike.",
  },
  {
    heading: "Lancelot du Lac",
    body: "The greatest knight of the Round Table and its ultimate destroyer. Lancelot is raised by the Lady of the Lake in the enchanted realm beneath the waters, emerging as a warrior without equal. His devotion to Arthur is genuine, which makes his love for Guinevere agonizing rather than treacherous. He tries repeatedly to distance himself, undertaking dangerous quests and voluntary exile, but is drawn back every time. When the affair is finally exposed, Lancelot rescues Guinevere from execution, killing fellow knights in the process. The brotherhood of the Round Table shatters beyond repair.",
  },
  {
    heading: "Morgana le Fay",
    body: "Arthur's half-sister and the most formidable sorceress in Britain. Morgana's opposition to Arthur is not born from simple villainy. She represents the old ways: the pre-Christian traditions, the matrilineal power structures, and the wild magic that Merlin and Arthur's new order threatens to erase. She is a healer, a shapeshifter, and a strategist who wages a shadow war against Camelot through enchantment, political manipulation, and the careful cultivation of her son, Mordred.",
  },
  {
    heading: "Mordred",
    body: "The son of Arthur and Morgana, born of an unwitting union that haunts the king for the rest of his life. Mordred is raised to despise his father, yet he also craves Arthur's recognition. He is cunning, charismatic, and patient. He arrives at Camelot as a young knight, earns a seat at the Round Table, and waits. When Arthur rides to war against Lancelot, Mordred seizes the throne and rallies the discontented lords. The final battle between father and son at Camlann ends them both and brings the age of Camelot to its close.",
  },
  {
    heading: "Magic in the Realm",
    body: "Magic in Arthurian Britain is ancient, dangerous, and deeply tied to the land itself. It is not a system to be mastered through study alone but a living force that flows through sacred sites, standing stones, and enchanted waters. Practitioners draw power from ley lines that crisscross the island, and the potency of their spells waxes and wanes with the seasons. The old druidic traditions treat magic as a covenant with the natural world: take too much and the land withers; give back and it flourishes. Merlin's sorcery, Morgana's enchantments, and the blessings of the Lady of the Lake all stem from this same wellspring, though each channels it differently.",
  },
  {
    heading: "The Schools of Power",
    body: "Several distinct traditions of magic exist. The Druidic Path channels elemental forces through ritual and sacrifice, commanding storms, accelerating growth, and communing with the spirits of place. The Enchanter's Art, practiced by Merlin and Nimue, focuses on illusion, foresight, and the manipulation of fate. The Fay Craft of Morgana and the Ladies of the Lake blends shapeshifting, healing, and the ability to step between the mortal world and the Otherworld. Necromancy, whispered about in fearful tones, draws on the restless dead and corrupts the ley lines wherever it is practiced. Finally, the Holy Tradition channels divine power through faith, prayer, and sacred relics, and stands in uneasy tension with the older magical arts.",
  },
  {
    heading: "The Factions of Britain",
    body: "Arthur's Britain is not a unified nation but a fragile alliance of competing powers. The Pendragon Loyalists hold the heartland and defend the ideals of the Round Table. The Northern Kings, proud and independent, resent southern authority and cooperate only when Saxon raids threaten their own borders. The Saxon Warbands control the eastern coastline and push steadily inland, establishing permanent settlements and fortified halls. The Fay Courts operate in the liminal spaces between the mortal world and the Otherworld, pursuing agendas that span centuries. Morgana's Shadow Court works to undermine Camelot from within, cultivating disaffected knights and ambitious lords. The Church Militant, emboldened by Rome's blessing, seeks to stamp out pagan magic and establish spiritual authority over even the king.",
  },
  {
    heading: "The Fall of Camelot",
    body: "Camelot does not fall to a single catastrophe. It erodes. The Grail Quest strips the Round Table of its finest knights: some die in the wilderness, others achieve the vision and never return, and those who fail come back diminished, haunted by their unworthiness. With the Table weakened, long-suppressed grievances resurface. When Mordred exposes Lancelot and Guinevere's affair, it detonates every fault line at once. Arthur is forced by his own laws to condemn his wife. Lancelot's rescue splits the knighthood into warring camps. Arthur pursues Lancelot to the continent, leaving Mordred as regent. The rest unfolds with terrible inevitability. Mordred declares Arthur dead and claims the crown. Arthur returns to a civil war. At the Battle of Camlann, father and son destroy each other.\n\nThe mortally wounded Arthur is carried to the shores of a mist-shrouded lake. A barge appears, crewed by veiled women. They bear him to the Isle of Avalon, where he is said to sleep still, healing from his wounds, waiting for the hour when Britain's need is greatest. The sword Excalibur is returned to the waters. The Round Table lies empty. But the story does not end. It waits.",
  },
];

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class MainMenuWikiScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;
  private _activeTab: WikiTab = "lore";

  // Content area
  private _contentContainer!: Container;
  private _contentMask!: Graphics;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _contentH = 0;
  private _viewH = 0;

  // Tab buttons
  private _tabButtons: { id: WikiTab; bg: Graphics; txt: Text }[] = [];

  // Callbacks
  onBack: (() => void) | null = null;
  onOpenUnits: (() => void) | null = null;
  onOpenSpells: (() => void) | null = null;
  onOpenBuildings: (() => void) | null = null;

  get isVisible(): boolean {
    return this.container.visible;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
    this._activeTab = "lore";
    this._rebuild();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    this._mainCard.removeChildren();
    this._tabButtons = [];
    this._scrollY = 0;

    const card = this._mainCard;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Block clicks from passing through
    card.eventMode = "static";

    // Title
    const title = new Text({ text: "WIKI", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 14);
    card.addChild(title);

    // Close button
    const closeBtn = this._makeBtn("BACK", 80, 30);
    closeBtn.position.set(CARD_W - 100, 16);
    closeBtn.on("pointerdown", () => {
      this.hide();
      this.onBack?.();
    });
    card.addChild(closeBtn);

    // Divider
    card.addChild(
      new Graphics().rect(16, 52, CARD_W - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Tab bar
    let tabX = 20;
    for (const tabDef of TAB_DEFS) {
      const tabW = tabDef.label.length * 10 + 24;
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.hitArea = new Rectangle(0, 0, tabW, TAB_H);

      const isActive = tabDef.id === this._activeTab;
      const tabBg = new Graphics()
        .roundRect(0, 0, tabW, TAB_H - 4, 5)
        .fill({ color: isActive ? 0x222255 : 0x151530 })
        .roundRect(0, 0, tabW, TAB_H - 4, 5)
        .stroke({ color: isActive ? BORDER_COLOR : 0x333355, width: 1 });
      btn.addChild(tabBg);

      const txt = new Text({
        text: tabDef.label,
        style: isActive ? STYLE_TAB_ACTIVE : STYLE_TAB,
      });
      txt.anchor.set(0.5, 0.5);
      txt.position.set(tabW / 2, TAB_H / 2 - 2);
      btn.addChild(txt);

      btn.position.set(tabX, 58);
      btn.on("pointerdown", () => this._selectTab(tabDef.id));
      card.addChild(btn);

      this._tabButtons.push({ id: tabDef.id, bg: tabBg, txt });
      tabX += tabW + 6;
    }

    // Content area
    const contentTop = 58 + TAB_H + 6;
    this._viewH = CARD_H - contentTop - 10;

    this._contentMask = new Graphics()
      .rect(16, contentTop, CARD_W - 32, this._viewH)
      .fill({ color: 0xffffff });
    card.addChild(this._contentMask);

    this._contentContainer = new Container();
    this._contentContainer.position.set(24, contentTop);
    this._contentContainer.mask = this._contentMask;
    card.addChild(this._contentContainer);

    // Build content for active tab
    this._buildContent();

    // Scroll
    card.on("wheel", (e: WheelEvent) => {
      if (this._maxScroll <= 0) return;
      this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY));
      this._contentContainer.position.y = (58 + TAB_H + 6) - this._scrollY;
    });
  }

  private _selectTab(tab: WikiTab): void {
    // For units/spells/buildings, delegate to existing screens
    if (tab === "units") {
      this.hide();
      this.onOpenUnits?.();
      return;
    }
    if (tab === "spells") {
      this.hide();
      this.onOpenSpells?.();
      return;
    }
    if (tab === "buildings") {
      this.hide();
      this.onOpenBuildings?.();
      return;
    }

    this._activeTab = tab;
    this._rebuild();
    this._layout();
  }

  private _buildContent(): void {
    this._contentContainer.removeChildren();
    this._scrollY = 0;

    if (this._activeTab === "lore") {
      this._buildLoreContent();
    }
  }

  // ---------------------------------------------------------------------------
  // Lore tab
  // ---------------------------------------------------------------------------

  private _buildLoreContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    for (const section of LORE_SECTIONS) {
      // Heading
      const heading = new Text({ text: section.heading, style: STYLE_LORE_HEADING });
      heading.position.set(0, cy);
      c.addChild(heading);
      cy += 22;

      // Body
      const body = new Text({ text: section.body, style: STYLE_BODY });
      body.position.set(0, cy);
      c.addChild(body);
      cy += body.height + 18;

      // Separator
      c.addChild(
        new Graphics().rect(0, cy, CARD_W - 60, 1).fill({ color: 0x333355, alpha: 0.3 }),
      );
      cy += 14;
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _makeBtn(label: string, w: number, h: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(bg);
    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: 0x88bbff, fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    return btn;
  }

  private _layout(): void {
    if (!this._vm) return;
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR, alpha: 0.85 });
    this._bg.eventMode = "static"; // block clicks behind
    this._mainCard.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }
}

export const mainMenuWikiScreen = new MainMenuWikiScreen();
