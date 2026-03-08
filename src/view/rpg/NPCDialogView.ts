// NPC dialogue overlay — shows dialogue lines, advance with Enter
// Also handles quest offers, progress, and completion
import { Container, Graphics, Text, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState, QuestState } from "@rpg/state/RPGState";
import { t } from "@/i18n/i18n";
import { getAvailableQuest, getActiveQuest, acceptQuest, claimQuestReward } from "@rpg/systems/QuestSystem";

// Leader portrait images
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";

const LEADER_PORTRAITS: Record<string, string> = {
  leader_arthur: arthurImgUrl,
  leader_merlin: merlinImgUrl,
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0e0e1a;
const BORDER_COLOR = 0x4444aa;
const LEADER_BORDER_COLOR = 0xffd700;
const LEADER_TITLE_COLOR = 0xccaa55;
const BLESSING_COLOR = 0x88ff88;
const NAME_COLOR = 0xffcc00;
const TEXT_COLOR = 0xdddddd;
const PROMPT_COLOR = 0x888888;
const QUEST_COLOR = 0x88ff88;

// ---------------------------------------------------------------------------
// NPCDialogView
// ---------------------------------------------------------------------------

type DialogPhase = "dialogue" | "blessing" | "quest_offer" | "quest_progress" | "quest_complete";

export class NPCDialogView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  private _lines: string[] = [];
  private _npcName: string = "";
  private _npcId: string = "";
  private _currentLine: number = 0;
  private _rpg: RPGState | null = null;
  private _dialogPhase: DialogPhase = "dialogue";
  private _questData: QuestState | null = null;
  private _isLeader: boolean = false;
  private _leaderId: string = "";
  private _leaderTitle: string = "";
  private _blessingName: string = "";
  private _blessingDesc: string = "";

  onClose: (() => void) | null = null;

  init(
    vm: ViewManager,
    npcName: string,
    lines: string[],
    npcId?: string,
    rpg?: RPGState,
    leaderId?: string,
    leaderTitle?: string,
    blessingName?: string,
    blessingDesc?: string,
  ): void {
    this.vm = vm;
    this._npcName = npcName;
    this._lines = lines;
    this._npcId = npcId ?? "";
    this._rpg = rpg ?? null;
    this._currentLine = 0;
    this._dialogPhase = "dialogue";
    this._questData = null;
    this._isLeader = !!leaderId;
    this._leaderId = leaderId ?? "";
    this._leaderTitle = leaderTitle ?? "";
    this._blessingName = blessingName ?? "";
    this._blessingDesc = blessingDesc ?? "";

    vm.addToLayer("ui", this.container);

    this._draw();
    this._setupInput();
  }

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Leader portrait (above dialog box)
    const portraitUrl = this._isLeader ? LEADER_PORTRAITS[this._leaderId] : undefined;
    if (portraitUrl) {
      const pSize = 160;
      const px = W - pSize - 30;
      const py = H - 120 - 10 - pSize - 12;
      const pFrame = new Graphics();
      pFrame.roundRect(px - 4, py - 4, pSize + 8, pSize + 8, 6);
      pFrame.fill({ color: BG_COLOR, alpha: 0.9 });
      pFrame.stroke({ color: LEADER_BORDER_COLOR, width: 2 });
      this.container.addChild(pFrame);

      void Assets.load(portraitUrl).then((tex: Texture) => {
        if (this.container.destroyed) return;
        const sprite = new Sprite(tex);
        const scale = Math.min(pSize / tex.width, pSize / tex.height);
        sprite.scale.set(scale);
        sprite.position.set(
          px + (pSize - tex.width * scale) / 2,
          py + (pSize - tex.height * scale) / 2,
        );
        const mask = new Graphics();
        mask.roundRect(px, py, pSize, pSize, 4);
        mask.fill({ color: 0xffffff });
        this.container.addChild(mask);
        sprite.mask = mask;
        this.container.addChild(sprite);
      });
    }

    // Dialog box at bottom of screen
    const boxH = 120;
    const boxY = H - boxH - 10;
    const boxX = 20;
    const boxW = W - 40;

    const borderColor = this._isLeader ? LEADER_BORDER_COLOR : BORDER_COLOR;

    const bg = new Graphics();
    bg.roundRect(boxX, boxY, boxW, boxH, 8);
    bg.fill({ color: BG_COLOR, alpha: 0.92 });
    bg.stroke({ color: borderColor, width: this._isLeader ? 3 : 2 });
    this.container.addChild(bg);

    // NPC name tag
    const nameTag = new Graphics();
    const nameW = Math.max(100, this._npcName.length * 9 + 20);
    const tagH = this._isLeader && this._leaderTitle ? 40 : 28;
    nameTag.roundRect(boxX + 15, boxY - 14, nameW, tagH, 4);
    nameTag.fill({ color: BG_COLOR });
    nameTag.stroke({ color: borderColor, width: 1 });
    this.container.addChild(nameTag);

    const nameText = new Text({
      text: this._npcName,
      style: { fontFamily: "monospace", fontSize: 13, fill: NAME_COLOR, fontWeight: "bold" },
    });
    nameText.position.set(boxX + 25, boxY - 10);
    this.container.addChild(nameText);

    // Leader title subtitle
    if (this._isLeader && this._leaderTitle) {
      const titleText = new Text({
        text: this._leaderTitle,
        style: { fontFamily: "monospace", fontSize: 10, fill: LEADER_TITLE_COLOR, fontStyle: "italic" },
      });
      titleText.position.set(boxX + 25, boxY + 5);
      this.container.addChild(titleText);
    }

    if (this._dialogPhase === "blessing") {
      this._drawBlessing(boxX, boxY, boxW, boxH);
    } else if (this._dialogPhase === "dialogue") {
      this._drawDialogue(boxX, boxY, boxW, boxH);
    } else if (this._dialogPhase === "quest_offer") {
      this._drawQuestOffer(boxX, boxY, boxW, boxH);
    } else if (this._dialogPhase === "quest_progress") {
      this._drawQuestProgress(boxX, boxY, boxW, boxH);
    } else if (this._dialogPhase === "quest_complete") {
      this._drawQuestComplete(boxX, boxY, boxW, boxH);
    }
  }

  private _drawDialogue(boxX: number, boxY: number, boxW: number, boxH: number): void {
    const line = this._lines[this._currentLine] ?? "";
    const dialogText = new Text({
      text: line,
      style: {
        fontFamily: "monospace",
        fontSize: 14,
        fill: TEXT_COLOR,
        wordWrap: true,
        wordWrapWidth: boxW - 40,
        lineHeight: 22,
      },
    });
    dialogText.position.set(boxX + 20, boxY + 22);
    this.container.addChild(dialogText);

    const isLast = this._currentLine >= this._lines.length - 1;
    const hasMore = this._checkHasQuestContent() || (this._isLeader && this._blessingName);
    const promptStr = isLast
      ? (hasMore ? t("rpg.press_continue") : t("rpg.npc_press_close"))
      : t("rpg.press_continue");
    const prompt = new Text({
      text: promptStr,
      style: { fontFamily: "monospace", fontSize: 10, fill: PROMPT_COLOR },
    });
    prompt.anchor.set(1, 0);
    prompt.position.set(boxX + boxW - 15, boxY + boxH - 22);
    this.container.addChild(prompt);

    if (this._lines.length > 1) {
      const pageText = new Text({
        text: `${this._currentLine + 1}/${this._lines.length}`,
        style: { fontFamily: "monospace", fontSize: 9, fill: PROMPT_COLOR },
      });
      pageText.position.set(boxX + 20, boxY + boxH - 20);
      this.container.addChild(pageText);
    }
  }

  private _drawBlessing(boxX: number, boxY: number, boxW: number, boxH: number): void {
    const headerText = new Text({
      text: `Blessing Received: ${this._blessingName}`,
      style: { fontFamily: "monospace", fontSize: 14, fill: BLESSING_COLOR, fontWeight: "bold" },
    });
    headerText.position.set(boxX + 20, boxY + 20);
    this.container.addChild(headerText);

    const descText = new Text({
      text: this._blessingDesc,
      style: {
        fontFamily: "monospace", fontSize: 12, fill: TEXT_COLOR,
        wordWrap: true, wordWrapWidth: boxW - 40,
      },
    });
    descText.position.set(boxX + 20, boxY + 45);
    this.container.addChild(descText);

    const prompt = new Text({
      text: t("rpg.press_continue"),
      style: { fontFamily: "monospace", fontSize: 10, fill: PROMPT_COLOR },
    });
    prompt.anchor.set(1, 0);
    prompt.position.set(boxX + boxW - 15, boxY + boxH - 22);
    this.container.addChild(prompt);
  }

  private _drawQuestOffer(boxX: number, boxY: number, boxW: number, boxH: number): void {
    if (!this._questData) return;

    const headerText = new Text({
      text: `Quest: ${this._questData.name}`,
      style: { fontFamily: "monospace", fontSize: 14, fill: QUEST_COLOR, fontWeight: "bold" },
    });
    headerText.position.set(boxX + 20, boxY + 15);
    this.container.addChild(headerText);

    const descText = new Text({
      text: this._questData.description,
      style: {
        fontFamily: "monospace", fontSize: 12, fill: TEXT_COLOR,
        wordWrap: true, wordWrapWidth: boxW - 40,
      },
    });
    descText.position.set(boxX + 20, boxY + 38);
    this.container.addChild(descText);

    const rewardStr = `Reward: ${this._questData.reward.gold}g  ${this._questData.reward.xp} XP`;
    const rewardText = new Text({
      text: rewardStr,
      style: { fontFamily: "monospace", fontSize: 11, fill: NAME_COLOR },
    });
    rewardText.position.set(boxX + 20, boxY + 68);
    this.container.addChild(rewardText);

    const prompt = new Text({
      text: t("rpg.accept_decline"),
      style: { fontFamily: "monospace", fontSize: 10, fill: PROMPT_COLOR },
    });
    prompt.anchor.set(1, 0);
    prompt.position.set(boxX + boxW - 15, boxY + boxH - 22);
    this.container.addChild(prompt);
  }

  private _drawQuestProgress(boxX: number, boxY: number, boxW: number, boxH: number): void {
    if (!this._questData) return;

    const headerText = new Text({
      text: `Quest: ${this._questData.name}`,
      style: { fontFamily: "monospace", fontSize: 14, fill: NAME_COLOR, fontWeight: "bold" },
    });
    headerText.position.set(boxX + 20, boxY + 15);
    this.container.addChild(headerText);

    let y = boxY + 40;
    for (const obj of this._questData.objectives) {
      const done = obj.current >= obj.required;
      const objText = new Text({
        text: `${done ? "[x]" : "[ ]"} ${obj.targetId}: ${obj.current}/${obj.required}`,
        style: { fontFamily: "monospace", fontSize: 12, fill: done ? QUEST_COLOR : TEXT_COLOR },
      });
      objText.position.set(boxX + 25, y);
      this.container.addChild(objText);
      y += 20;
    }

    const prompt = new Text({
      text: t("rpg.npc_press_close"),
      style: { fontFamily: "monospace", fontSize: 10, fill: PROMPT_COLOR },
    });
    prompt.anchor.set(1, 0);
    prompt.position.set(boxX + boxW - 15, boxY + boxH - 22);
    this.container.addChild(prompt);
  }

  private _drawQuestComplete(boxX: number, boxY: number, boxW: number, boxH: number): void {
    if (!this._questData) return;

    const headerText = new Text({
      text: `Quest Complete: ${this._questData.name}`,
      style: { fontFamily: "monospace", fontSize: 14, fill: QUEST_COLOR, fontWeight: "bold" },
    });
    headerText.position.set(boxX + 20, boxY + 20);
    this.container.addChild(headerText);

    const rewardStr = `+${this._questData.reward.gold}g  +${this._questData.reward.xp} XP`;
    const rewardText = new Text({
      text: rewardStr,
      style: { fontFamily: "monospace", fontSize: 16, fill: NAME_COLOR, fontWeight: "bold" },
    });
    rewardText.position.set(boxX + 20, boxY + 50);
    this.container.addChild(rewardText);

    const prompt = new Text({
      text: t("rpg.npc_press_close"),
      style: { fontFamily: "monospace", fontSize: 10, fill: PROMPT_COLOR },
    });
    prompt.anchor.set(1, 0);
    prompt.position.set(boxX + boxW - 15, boxY + boxH - 22);
    this.container.addChild(prompt);
  }

  private _checkHasQuestContent(): boolean {
    if (!this._rpg || !this._npcId) return false;

    // Check for completed quest to claim
    const active = getActiveQuest(this._rpg, this._npcId);
    if (active?.isComplete) return true;

    // Check for active quest in progress
    if (active) return true;

    // Check for available quest
    const available = getAvailableQuest(this._rpg, this._npcId);
    return !!available;
  }

  private _transitionToQuestPhase(): void {
    if (!this._rpg || !this._npcId) {
      this.onClose?.();
      return;
    }

    // Check for completed quest first
    const active = getActiveQuest(this._rpg, this._npcId);
    if (active?.isComplete) {
      this._questData = active;
      claimQuestReward(this._rpg, active.id);
      this._dialogPhase = "quest_complete";
      this._draw();
      return;
    }

    // Check for active quest progress
    if (active) {
      this._questData = active;
      this._dialogPhase = "quest_progress";
      this._draw();
      return;
    }

    // Check for available quest
    const available = getAvailableQuest(this._rpg, this._npcId);
    if (available) {
      this._questData = available;
      this._dialogPhase = "quest_offer";
      this._draw();
      return;
    }

    this.onClose?.();
  }

  /** After dialogue ends, show blessing (if leader) then quest content. */
  private _afterDialogueEnd(): void {
    // Show blessing phase for leaders who granted a blessing
    if (this._isLeader && this._blessingName) {
      this._dialogPhase = "blessing";
      this._draw();
      return;
    }
    this._afterBlessingPhase();
  }

  /** After blessing (or skipped), transition to quest content or close. */
  private _afterBlessingPhase(): void {
    if (this._checkHasQuestContent()) {
      this._transitionToQuestPhase();
    } else {
      this.onClose?.();
    }
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        if (this._dialogPhase === "dialogue") {
          if (this._currentLine < this._lines.length - 1) {
            this._currentLine++;
            this._draw();
          } else {
            this._afterDialogueEnd();
          }
        } else if (this._dialogPhase === "blessing") {
          // Blessing acknowledged, move to quest or close
          this._blessingName = ""; // Don't show blessing again
          this._afterBlessingPhase();
        } else if (this._dialogPhase === "quest_offer") {
          // Accept quest
          if (this._rpg && this._questData) {
            acceptQuest(this._rpg, this._questData);
          }
          this.onClose?.();
        } else {
          // quest_progress or quest_complete
          this.onClose?.();
        }
      } else if (e.code === "Escape") {
        this.onClose?.();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
