// Campaign intro screen — shows a sequence of lore pages (image + text)
// before the campaign scenario actually begins.
import {
  Container,
  Graphics,
  Text,
  TextStyle,
  Sprite,
  Texture,
  Assets,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

import throneImgUrl from "@/img/throne.png";
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";
import hordeImgUrl from "@/img/horde.png";
import manImgUrl from "@/img/man.png";
import manPImgUrl from "@/img/manP.png";
import magicImgUrl from "@/img/magic.png";
import swordImgUrl from "@/img/sword.png";
import armoryImgUrl from "@/img/armory.png";

// ---------------------------------------------------------------------------
// Intro page data — keyed by scenario number
// ---------------------------------------------------------------------------

export interface IntroPage {
  imageUrl: string;
  text: string;
}

const SCENARIO_INTROS: Record<number, IntroPage[]> = {
  1: [
    {
      imageUrl: throneImgUrl,
      text: "The lands of Rain have long been without ruler. Let me guide you to your rightful destiny as ruler of these lands!",
    },
    {
      imageUrl: arthurImgUrl,
      text: "Your first task is to quell the resistance in your local realm, a unit of swordsmen has risen against your rule. Most castle units would only defend their castle and not move out, but these castle trained units have betrayed their oath to defend your lands!",
    },
  ],
  2: [
    {
      imageUrl: merlinImgUrl,
      text: "Oof now that that is over we can go back to the order of the day. However, I heard you did not click on the firepit building near the castle in your previous campaign!",
    },
    {
      imageUrl: hordeImgUrl,
      text: "What do you mean, you have never seen the castle and the firepit to even click it? Oh well, for now all the firepits units from the land have gathered to address this insult. We will have to calm them down a little. And click that firepit in the next mission!",
    },
  ],
  22: [
    {
      imageUrl: swordImgUrl,
      text: "Welcome to the training grounds, commander. Today you will learn the special abilities that set elite units apart from common soldiers. Each unit on this field demonstrates a key battlefield mechanic.",
    },
    {
      imageUrl: magicImgUrl,
      text: "First, observe your CLERICS surrounding the enemy Cyclops. Clerics do not attack — instead they HEAL nearby wounded allies, keeping your forces alive under the beast's crushing blows. Healing is the backbone of any prolonged engagement.",
    },
    {
      imageUrl: armoryImgUrl,
      text: "From a distance, your LANCERS will charge in on horseback. When a lancer reaches its target after a long ride, it deals 5x CHARGE DAMAGE on its first strike — devastating against heavy targets like the Cyclops.",
    },
    {
      imageUrl: magicImgUrl,
      text: "Your MASTER MAGES stand ready with destructive magic: fireballs, chain lightning, and ice storms. These high-level casters deal massive area damage from long range. Watch the battlefield light up with arcane fury.",
    },
    {
      imageUrl: swordImgUrl,
      text: "Finally, observe the enemy BATTERING RAM — a siege unit that ONLY attacks buildings, ignoring all soldiers. Your SIEGE HUNTER is specifically designed to hunt down and destroy these siege engines. A TREBUCHET provides devastating long-range bombardment. Now, to battle!",
    },
  ],
  23: [
    {
      imageUrl: merlinImgUrl,
      text: "Sire, I have located a powerful Dark Savant willing to fight for our cause. However, our supply lines are cut — we cannot build or train any reinforcements. You must rely on his dark pyromancy alone.",
    },
    {
      imageUrl: magicImgUrl,
      text: "The savant's fireballs are devastating, but he is fragile. Fortunately, I have unlocked the RALLY FLAG from the castle upgrade. Press F to place a flag and your savant will rally to it. Use this to pull him back when wounded — his natural regeneration will restore his health over time.",
    },
    {
      imageUrl: swordImgUrl,
      text: "The enemy has towers and scattered patrols across the field. Do not rush in blindly! Strike, retreat with the flag, let the savant regenerate, then strike again. Patience will win this battle. Now go — and try not to get him killed!",
    },
  ],
  3: [
    {
      imageUrl: manPImgUrl,
      text: "Well done sire! That should ensure some peace at the firepits. For our next mission, we need to capture an enemy castle. We only recently came to these lands, so funds are tight!",
    },
    {
      imageUrl: manImgUrl,
      text: "Fortunately the lord of this castle is mismanaging his forces greatly, he only builds towers and walls and some defensive units that guard the castle. Few will move against us. Remember that units trained at the castle usually stay close to the castle and other friendly buildings to defend it, and only rarely move out. Use your farms to build up wealth and to a lesser extent your barracks. Then move out with our superior barracks units and secure the victory! Oh and remember that firepit sire, it gives us a quick and cheap defense to start with.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CARD_W = 600;
const CARD_H = 620;
const CARD_PAD = 30;
const IMAGE_MAX_H = 300;
const BORDER_COLOR = 0x334466;
const BG_COLOR = 0x0a0e18;

const STYLE_BODY = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xccddee,
  wordWrap: true,
  wordWrapWidth: CARD_W - CARD_PAD * 2,
  lineHeight: 22,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

// ---------------------------------------------------------------------------
// CampaignIntroScreen
// ---------------------------------------------------------------------------

export class CampaignIntroScreen {
  readonly container = new Container();

  /** Fires when the player presses "Start" on the last page. */
  onStart: (() => void) | null = null;
  /** Fires when the player presses "Back" (not currently wired). */
  onBack: (() => void) | null = null;

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;

  // Current state
  private _pages: IntroPage[] = [];
  private _pageIndex = 0;

  // Dynamic elements rebuilt per page
  private _imageSprite: Sprite | null = null;
  private _bodyText!: Text;
  private _actionBtn!: Container;
  private _actionLabel!: Text;
  private _imageContainer!: Container;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    // Full-screen dark overlay
    this._bg = new Graphics();
    this._bg.eventMode = "static";
    this.container.addChild(this._bg);

    // Card
    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    this._buildUI();

    vm.addToLayer("ui", this.container);
    this.container.visible = false;

    vm.app.renderer.on("resize", () => this._layout());
    this._layout();
  }

  /**
   * Show the intro sequence for a given scenario.
   * If the scenario has no intro pages, fires onStart immediately.
   */
  open(scenarioNum: number): void {
    const pages = SCENARIO_INTROS[scenarioNum];
    if (!pages || pages.length === 0) {
      this.onStart?.();
      return;
    }
    this._pages = pages;
    this._pageIndex = 0;
    this.container.visible = true;
    this._renderPage();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // UI construction (one-time)
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const card = this._mainCard;
    card.removeChildren();

    // Card background
    const cardBg = new Graphics()
      .roundRect(0, 0, CARD_W, CARD_H, 8)
      .fill({ color: BG_COLOR })
      .roundRect(0, 0, CARD_W, CARD_H, 8)
      .stroke({ color: BORDER_COLOR, width: 1.5 });
    card.addChild(cardBg);

    // Image container (centered area at top)
    this._imageContainer = new Container();
    this._imageContainer.position.set(CARD_PAD, CARD_PAD);
    card.addChild(this._imageContainer);

    // Image frame background
    const imgFrameW = CARD_W - CARD_PAD * 2;
    const imgFrame = new Graphics()
      .roundRect(0, 0, imgFrameW, IMAGE_MAX_H, 6)
      .fill({ color: 0x060a12 })
      .roundRect(0, 0, imgFrameW, IMAGE_MAX_H, 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.5, width: 1 });
    this._imageContainer.addChild(imgFrame);

    // Body text
    this._bodyText = new Text({ text: "", style: STYLE_BODY });
    this._bodyText.position.set(CARD_PAD, CARD_PAD + IMAGE_MAX_H + 20);
    card.addChild(this._bodyText);

    // Action button (Continue / Start)
    this._actionBtn = new Container();
    this._actionBtn.eventMode = "static";
    this._actionBtn.cursor = "pointer";

    const btnW = 160;
    const btnH = 40;
    const btnBg = new Graphics()
      .roundRect(0, 0, btnW, btnH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, btnW, btnH, 6)
      .stroke({ color: 0x44aa66, width: 1.5 });
    this._actionBtn.addChild(btnBg);

    this._actionLabel = new Text({ text: "CONTINUE", style: STYLE_BTN });
    this._actionLabel.anchor.set(0.5, 0.5);
    this._actionLabel.position.set(btnW / 2, btnH / 2);
    this._actionBtn.addChild(this._actionLabel);

    this._actionBtn.position.set(
      CARD_W / 2 - btnW / 2,
      CARD_H - CARD_PAD - btnH,
    );

    this._actionBtn.on("pointerdown", () => this._advance());
    this._actionBtn.on("pointerover", () => {
      btnBg.tint = 0xaaffcc;
    });
    this._actionBtn.on("pointerout", () => {
      btnBg.tint = 0xffffff;
    });

    card.addChild(this._actionBtn);
  }

  // ---------------------------------------------------------------------------
  // Page rendering
  // ---------------------------------------------------------------------------

  private _renderPage(): void {
    const page = this._pages[this._pageIndex];
    if (!page) return;

    const isLast = this._pageIndex >= this._pages.length - 1;
    this._actionLabel.text = isLast ? "START" : "CONTINUE";

    // Text
    this._bodyText.text = page.text;

    // Image — remove old sprite
    if (this._imageSprite) {
      this._imageSprite.destroy();
      this._imageSprite = null;
    }

    const imgFrameW = CARD_W - CARD_PAD * 2;

    void Assets.load(page.imageUrl).then((tex: Texture) => {
      if (!this.container.visible) return;

      const sprite = new Sprite(tex);
      const maxW = imgFrameW - 10;
      const maxH = IMAGE_MAX_H - 10;
      const scale = Math.min(maxW / tex.width, maxH / tex.height);
      sprite.width = tex.width * scale;
      sprite.height = tex.height * scale;
      sprite.position.set(
        (imgFrameW - sprite.width) / 2,
        (IMAGE_MAX_H - sprite.height) / 2,
      );

      // Remove previous if async race
      if (this._imageSprite) {
        this._imageSprite.destroy();
      }
      this._imageSprite = sprite;
      this._imageContainer.addChild(sprite);
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  private _advance(): void {
    if (this._pageIndex < this._pages.length - 1) {
      this._pageIndex++;
      this._renderPage();
    } else {
      // Last page — start the game
      this.hide();
      this.onStart?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const w = this._vm?.screenWidth ?? 800;
    const h = this._vm?.screenHeight ?? 600;

    this._bg.clear();
    this._bg.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.85 });

    this._mainCard.position.set(
      Math.round((w - CARD_W) / 2),
      Math.round((h - CARD_H) / 2),
    );
  }
}

export const campaignIntroScreen = new CampaignIntroScreen();
