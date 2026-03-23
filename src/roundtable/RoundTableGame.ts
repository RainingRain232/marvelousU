// ---------------------------------------------------------------------------
// Round Table – Main Game Orchestrator (with animation queue + transitions)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import { viewManager } from "../view/ViewManager";

import {
  RTRunState, RTPhase, KnightId, MapNodeType, StatusEffectId,
  RelicRarity, RTAnimEvent,
} from "./types";
import { RT_BALANCE } from "./config/RoundTableBalance";

import { getRelicPool } from "./config/RoundTableRelics";
import { getPotionDef } from "./config/RoundTablePotions";

import {
  createRunState, createCombatState, createRng,
  addEffect,
  saveRunState, loadRunState, clearRunSave,
} from "./state/RoundTableState";

import { RoundTableDeckSystem } from "./systems/RoundTableDeckSystem";
import { RoundTableCombatSystem } from "./systems/RoundTableCombatSystem";
import { RoundTableMapSystem } from "./systems/RoundTableMapSystem";
import { RoundTableRelicSystem } from "./systems/RoundTableRelicSystem";
import { RoundTableRewardSystem } from "./systems/RoundTableRewardSystem";
import { RoundTableEventSystem } from "./systems/RoundTableEventSystem";
import { RoundTableMetaSystem } from "./systems/RoundTableMetaSystem";

import { RoundTableMapView } from "./view/RoundTableMapView";
import { RoundTableCombatView } from "./view/RoundTableCombatView";
import { RoundTableHUD } from "./view/RoundTableHUD";
import {
  KnightSelectScreen, RewardScreen, EventScreen,
  RestScreen, ShopScreen, GameOverScreen, CardPickerScreen,
  TreasureScreen, DeckViewerScreen, PauseScreen,
} from "./view/RoundTableMenus";

const TRANSITION_DUR = 0.25;

export class RoundTableGame {
  private _run!: RTRunState;
  private _rng!: { next: () => number; state: number };

  // Layers
  private _rootContainer = new Container();
  private _gameLayer = new Container();
  private _uiLayer = new Container();
  private _fadeOverlay = new Graphics();

  // Views
  private _mapView = new RoundTableMapView();
  private _combatView = new RoundTableCombatView();
  private _hud = new RoundTableHUD();

  // Screens
  private _knightSelect = new KnightSelectScreen();
  private _rewardScreen = new RewardScreen();
  private _eventScreen = new EventScreen();
  private _restScreen = new RestScreen();
  private _shopScreen = new ShopScreen();
  private _gameOverScreen = new GameOverScreen();
  private _cardPicker = new CardPickerScreen();
  private _treasureScreen = new TreasureScreen();
  private _deckViewer = new DeckViewerScreen();
  private _pauseScreen = new PauseScreen();

  // Current encounter
  private _currentNodeType: MapNodeType = MapNodeType.ENEMY;
  private _currentEnemyIds: string[] = [];

  // Animation processing
  private _processingAnims = false;

  // Combat ticker for idle animations
  private _combatTickerCb: ((ticker: any) => void) | null = null;
  private _combatTime = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOT / DESTROY
  // ═══════════════════════════════════════════════════════════════════════════

  async boot(): Promise<void> {
    viewManager.clearWorld();

    this._rootContainer = new Container();
    this._gameLayer = new Container();
    this._uiLayer = new Container();
    this._rootContainer.addChild(this._gameLayer);
    this._rootContainer.addChild(this._uiLayer);

    // Fade overlay for transitions
    this._fadeOverlay = new Graphics();
    this._fadeOverlay.rect(0, 0, 800, 600);
    this._fadeOverlay.fill({ color: 0x000000 });
    this._fadeOverlay.alpha = 0;
    this._fadeOverlay.visible = false;
    this._rootContainer.addChild(this._fadeOverlay);

    viewManager.addToLayer("ui", this._rootContainer);

    this._knightSelect.onSelect = (knightId, ascension) => {
      this._startRun(knightId, ascension);
    };
    this._knightSelect.onBack = () => {
      this.destroy();
    };
    this._knightSelect.onContinueRun = () => {
      const saved = loadRunState();
      if (saved) {
        this._run = saved;
        this._rng = createRng(this._run.rngState);
        this._hud.build(800);
        this._hud.onPause = () => this._showPause();
        this._transitionTo(() => this._setupMap());
      }
    };

    this._showKnightSelect();
  }

  destroy(): void {
    gsap.killTweensOf(this._fadeOverlay);
    this._stopCombatTicker();
    this._rootContainer.removeChildren();
    viewManager.removeFromLayer("ui", this._rootContainer);
    this._mapView.destroy();
    this._combatView.destroy();
    this._hud.destroy();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Fade out → swap content → fade in */
  private _transitionTo(setupFn: () => void): void {
    this._fadeOverlay.visible = true;
    gsap.to(this._fadeOverlay, {
      alpha: 1, duration: TRANSITION_DUR, ease: "power2.in",
      onComplete: () => {
        this._hideAllImmediate();
        setupFn();
        gsap.to(this._fadeOverlay, {
          alpha: 0, duration: TRANSITION_DUR, ease: "power2.out",
          onComplete: () => { this._fadeOverlay.visible = false; },
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  private _showKnightSelect(): void {
    this._hideAllImmediate();
    this._uiLayer.addChild(this._knightSelect.container);
    this._knightSelect.show();
  }

  private _startRun(knightId: KnightId, ascension: number): void {
    this._run = createRunState(knightId, ascension);
    this._rng = createRng(this._run.seed);
    RoundTableMapSystem.generateAllMaps(this._run, this._rng);
    this._run.flags.add("gawain_combat_0");
    this._hud.build(800);
    this._hud.onPause = () => this._showPause();
    saveRunState(this._run);
    this._transitionTo(() => this._setupMap());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP PHASE
  // ═══════════════════════════════════════════════════════════════════════════

  private _showMap(): void {
    this._transitionTo(() => this._setupMap());
  }

  private _setupMap(): void {
    this._run.phase = RTPhase.MAP;
    const map = this._run.maps[this._run.act - 1];
    if (!map) return;

    const available = RoundTableMapSystem.getAvailableNodes(map);
    const availableIds = new Set(available.map(n => n.id));

    this._mapView.build(map, availableIds, map.currentNodeId);
    this._mapView.onNodeClick = (nodeId) => this._onNodeSelected(nodeId);

    this._gameLayer.addChild(this._mapView.container);
    this._uiLayer.addChild(this._hud.container);
    this._hud.update(this._run, 800);
  }

  private _onNodeSelected(nodeId: number): void {
    const node = RoundTableMapSystem.visitNode(this._run, nodeId);
    if (!node) return;
    this._run.score += RT_BALANCE.SCORE_PER_FLOOR;

    if (this._run.relics.includes("ancient_coin") && !this._run.relics.includes("ectoplasm")) {
      this._run.gold += 15;
    }

    switch (node.type) {
      case MapNodeType.ENEMY:
      case MapNodeType.ELITE:
        this._currentNodeType = node.type;
        this._currentEnemyIds = [...node.encounterIds];
        this._transitionTo(() => this._setupCombat(node.encounterIds));
        break;

      case MapNodeType.BOSS: {
        this._currentNodeType = MapNodeType.BOSS;
        let bossIds = [...node.encounterIds];
        if (this._run.act === 3 && this._run.purity < RT_BALANCE.PURITY_DARK_THRESHOLD) {
          bossIds = ["boss_shadow_self"];
        }
        this._currentEnemyIds = bossIds;
        this._transitionTo(() => this._setupCombat(bossIds));
        break;
      }

      case MapNodeType.REST:
        this._transitionTo(() => this._setupRest());
        break;
      case MapNodeType.SHOP:
        this._transitionTo(() => this._setupShop());
        break;
      case MapNodeType.EVENT:
        this._transitionTo(() => this._setupEvent(node.eventId));
        break;
      case MapNodeType.TREASURE:
        this._showTreasure();
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBAT PHASE
  // ═══════════════════════════════════════════════════════════════════════════

  private _setupCombat(enemyIds: string[]): void {
    this._run.phase = RTPhase.COMBAT;
    this._run.flags.delete("lancelot_drew_this_turn");
    this._run.flags.delete("took_damage_this_turn");

    const combat = createCombatState(this._run, enemyIds, this._rng);
    this._run.combat = combat;

    // Knight passives
    if (this._run.knightId === KnightId.GAWAIN) {
      let gawainCount = 0;
      for (const f of this._run.flags) {
        if (f.startsWith("gawain_combat_")) gawainCount = parseInt(f.split("_")[2]) || 0;
      }
      for (const f of Array.from(this._run.flags)) {
        if (f.startsWith("gawain_combat_")) this._run.flags.delete(f);
      }
      gawainCount++;
      this._run.flags.add(`gawain_combat_${gawainCount}`);
      if (gawainCount % 3 === 0) {
        addEffect(combat.playerEffects, StatusEffectId.STRENGTH, 2);
        combat.log.push("Solar Tide surges! +2 Strength");
      } else {
        for (const e of combat.enemies) addEffect(e.effects, StatusEffectId.STRENGTH, 1);
        combat.log.push("The sun wanes. Enemies gain Strength.");
      }
    }
    if (this._run.knightId === KnightId.TRISTAN) {
      for (const e of combat.enemies) addEffect(e.effects, StatusEffectId.POISON, 1);
      combat.log.push("Festering Wounds: all enemies poisoned.");
    }

    RoundTableRelicSystem.trigger(this._run, combat, "on_combat_start", this._rng);

    this._combatView.build();
    this._combatView.drawKnight(this._run);
    this._combatView.onCardPlay = (uid, idx) => this._onCardPlay(uid, idx);
    this._combatView.onEndTurn = () => this._onEndTurn();
    this._combatView.onPotionUse = (slot) => this._onPotionUse(slot);
    this._combatView.onDeckView = () => this._showDeckViewer();

    this._gameLayer.addChild(this._combatView.container);
    this._uiLayer.addChild(this._hud.container);

    // Start idle animation ticker
    this._startCombatTicker();

    RoundTableCombatSystem.startPlayerTurn(this._run, combat, this._rng);
    this._drainAnimQueue();
    this._updateCombatView();
  }

  private _onCardPlay(cardUid: number, targetIdx: number): void {
    const combat = this._run.combat;
    if (!combat || !combat.isPlayerTurn || this._processingAnims) return;

    const success = RoundTableCombatSystem.playCard(this._run, combat, cardUid, targetIdx, this._rng);
    if (!success) return;

    // Process animation queue from this card play
    this._drainAnimQueue();

    // Centennial puzzle: draw 3 when taking damage
    if (this._run.flags.has("centennial_draw_3")) {
      this._run.flags.delete("centennial_draw_3");
      RoundTableDeckSystem.drawCards(this._run, combat, 3, this._rng);
    }

    // Unceasing top: if hand is empty, draw 1
    if (this._run.relics.includes("unceasing_top") && combat.hand.length === 0 && combat.isPlayerTurn) {
      RoundTableDeckSystem.drawCards(this._run, combat, 1, this._rng);
    }

    const result = RoundTableCombatSystem.checkCombatEnd(this._run, combat);
    if (result === "win") { this._onCombatWin(); return; }
    if (result === "lose") { this._onCombatLose(); return; }
    this._updateCombatView();
  }

  private _onEndTurn(): void {
    const combat = this._run.combat;
    if (!combat || !combat.isPlayerTurn || this._processingAnims) return;

    this._run.flags.delete("lancelot_drew_this_turn");
    this._run.flags.delete("took_damage_this_turn");
    this._run.flags.delete("double_damage_this_turn");
    this._run.flags.delete("no_more_draw_this_turn");
    for (const f of Array.from(this._run.flags)) {
      if (f.startsWith("ornamental_fan_count") || f.startsWith("letter_opener_count") ||
          f.startsWith("kunai_count") || f.startsWith("shuriken_count")) {
        this._run.flags.delete(f);
      }
    }

    // Show "Enemy Turn" banner
    this._combatView.showTurnBanner("ENEMY TURN", 0xff4444);

    RoundTableCombatSystem.endPlayerTurn(this._run, combat, this._rng);
    this._drainAnimQueue();

    const result = RoundTableCombatSystem.checkCombatEnd(this._run, combat);
    if (result === "win") { this._onCombatWin(); return; }
    if (result === "lose") { this._onCombatLose(); return; }

    // Squire companion
    for (const f of this._run.flags) {
      if (f.startsWith("squire_")) {
        const power = parseInt(f.split("_")[1]);
        if (combat.enemies.length > 0 && combat.enemies[0].hp > 0) {
          combat.enemies[0].hp -= power;
          combat.log.push(`Squire deals ${power} damage.`);
        }
        combat.playerBlock += power;
        combat.log.push(`Squire grants ${power} Block.`);
      }
    }

    RoundTableCombatSystem.startPlayerTurn(this._run, combat, this._rng);
    this._drainAnimQueue();

    // Show "Your Turn" banner
    this._combatView.showTurnBanner("YOUR TURN", 0x44ff44);

    this._updateCombatView();
  }

  private _onPotionUse(slotIdx: number): void {
    const pot = this._run.potions[slotIdx];
    if (!pot) return;
    const combat = this._run.combat;
    if (!combat) return;

    const def = getPotionDef(pot.defId);
    this._run.potions[slotIdx] = null;

    // Potion flash
    this._combatView.spawnCardFlash(400, 300, 0x44ff88);

    switch (pot.defId) {
      case "health_potion":
        this._run.hp = Math.min(this._run.maxHp, this._run.hp + 30);
        this._combatView.spawnDamageNumber(400, 350, 30, "heal");
        break;
      case "block_potion":
        combat.playerBlock += 12;
        this._combatView.spawnDamageNumber(400, 350, 12, "block");
        break;
      case "energy_potion": combat.energy += 2; break;
      case "strength_potion": addEffect(combat.playerEffects, StatusEffectId.STRENGTH, 2); break;
      case "dexterity_potion": addEffect(combat.playerEffects, StatusEffectId.DEXTERITY, 2); break;
      case "fire_potion":
        for (const e of combat.enemies) { if (e.hp > 0) e.hp -= 20; }
        break;
      case "poison_potion": {
        const target = combat.enemies[combat.selectedTarget] ?? combat.enemies[0];
        if (target) addEffect(target.effects, StatusEffectId.POISON, 6);
        break;
      }
      case "weak_potion": {
        const target = combat.enemies[combat.selectedTarget] ?? combat.enemies[0];
        if (target) addEffect(target.effects, StatusEffectId.WEAK, 3);
        break;
      }
      case "fear_potion": {
        const target = combat.enemies[combat.selectedTarget] ?? combat.enemies[0];
        if (target) addEffect(target.effects, StatusEffectId.VULNERABLE, 3);
        break;
      }
      case "draw_potion":
        RoundTableDeckSystem.drawCards(this._run, combat, 3, this._rng);
        break;
      case "elixir":
        combat.energy += 2;
        RoundTableDeckSystem.drawCards(this._run, combat, 2, this._rng);
        break;
    }

    combat.log.push(`Used ${def.name}.`);
    this._updateCombatView();
  }

  // ── Animation Queue Processor ────────────────────────────────────────────

  private _drainAnimQueue(): void {
    const combat = this._run.combat;
    if (!combat) return;

    const queue = combat.animQueue;
    combat.animQueue = [];

    for (const ev of queue) {
      this._processAnimEvent(ev);
    }
  }

  private _processAnimEvent(ev: RTAnimEvent): void {
    switch (ev.type) {
      case "damage": {
        const pos = ev.isPlayer ? { x: 400, y: 480 } : this._getEnemyPos(ev.targetUid);
        if (ev.amount > 0) {
          this._combatView.spawnDamageNumber(pos.x, pos.y - 20, ev.amount, "damage");
          this._combatView.spawnHitSparks(pos.x, pos.y);
          if (!ev.isPlayer) {
            const idx = this._getEnemyIdx(ev.targetUid);
            this._combatView.spawnEnemyFlinch(idx);
          } else {
            // Player took damage — red screen flash
            this._combatView.spawnDamageFlash();
          }
        }
        break;
      }
      case "block": {
        const pos = ev.isPlayer ? { x: 400, y: 480 } : this._getEnemyPos(ev.targetUid);
        if (ev.amount > 0) {
          this._combatView.spawnDamageNumber(pos.x, pos.y - 20, ev.amount, "block");
        }
        break;
      }
      case "heal":
        if (ev.amount > 0) {
          this._combatView.spawnDamageNumber(400, 460, ev.amount, "heal");
          this._combatView.spawnHealParticles(400, 480);
        }
        break;
      case "enemy_attack": {
        const pos = this._getEnemyPos(ev.enemyUid);
        this._combatView.spawnEnemyAttackFlash(pos.x, pos.y);
        if (ev.damage > 0) {
          this._combatView.spawnScreenShake();
        }
        break;
      }
      case "enemy_die": {
        const pos = this._getEnemyPos(ev.enemyUid);
        this._combatView.spawnDeathBurst(pos.x, pos.y);
        break;
      }
      case "card_play": {
        this._combatView.spawnCardFlash(400, 300, 0xffcc44);
        break;
      }
      case "effect_apply": {
        // Small particle at target
        const pos = ev.isPlayer ? { x: 400, y: 480 } : this._getEnemyPos(ev.targetUid);
        this._combatView.spawnEffectGlyph(pos.x, pos.y - 30, ev.effectId);
        break;
      }
      default:
        break;
    }
  }

  /** Approximate enemy screen position based on uid. */
  private _getEnemyPos(uid: number): { x: number; y: number } {
    const idx = this._getEnemyIdx(uid);
    const combat = this._run.combat;
    if (!combat || idx === -1) return { x: 400, y: 160 };
    const alive = combat.enemies.filter(e => e.hp > 0 || e.uid === uid);
    const spacing = Math.min(200, 680 / Math.max(1, alive.length));
    const startX = (800 - spacing * alive.length) / 2 + spacing / 2;
    return { x: startX + idx * spacing, y: 160 };
  }

  /** Get enemy display index by uid. */
  private _getEnemyIdx(uid: number): number {
    const combat = this._run.combat;
    if (!combat) return -1;
    const alive = combat.enemies.filter(e => e.hp > 0 || e.uid === uid);
    return alive.findIndex(e => e.uid === uid);
  }

  private _onCombatWin(): void {
    const combat = this._run.combat;
    if (!combat) return;
    RoundTableRelicSystem.trigger(this._run, combat, "on_combat_end", this._rng);
    RoundTableRewardSystem.generateCombatRewards(this._run, this._currentEnemyIds, this._currentNodeType, this._rng);
    this._run.combat = null;

    // Delay slightly so death burst can play
    setTimeout(() => this._showReward(), 400);
  }

  private _onCombatLose(): void {
    const fairyIdx = this._run.potions.findIndex(p => p?.defId === "fairy_potion");
    if (fairyIdx !== -1) {
      this._run.potions[fairyIdx] = null;
      this._run.hp = Math.floor(this._run.maxHp * 0.3);
      this._run.combat!.log.push("Fairy in a Bottle saves you!");
      this._combatView.spawnHealParticles(400, 480);
      this._updateCombatView();
      return;
    }
    this._run.combat = null;
    setTimeout(() => this._showGameOver(false), 600);
  }

  private _updateCombatView(): void {
    if (!this._run.combat) return;
    const showIntents = !this._run.relics.includes("runic_dome");
    this._combatView.update(this._run, this._run.combat, showIntents);
    this._hud.update(this._run, 800);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REWARD / EVENT / REST / SHOP / TREASURE / GAME OVER / CARD PICKER
  // ═══════════════════════════════════════════════════════════════════════════

  private _showReward(): void {
    this._transitionTo(() => {
      this._run.phase = RTPhase.REWARD;
      this._rewardScreen.onCollectGold = () => { RoundTableRewardSystem.collectGold(this._run); this._rewardScreen.show(this._run); };
      this._rewardScreen.onPickCard = (id) => { RoundTableRewardSystem.collectCard(this._run, id); this._rewardScreen.show(this._run); };
      this._rewardScreen.onSkipCards = () => { RoundTableRewardSystem.skipCards(this._run); this._rewardScreen.show(this._run); };
      this._rewardScreen.onSingingBowl = () => {
        RoundTableRewardSystem.skipCards(this._run);
        this._run.maxHp += 2;
        this._run.hp += 2;
        this._rewardScreen.show(this._run);
      };
      this._rewardScreen.onCollectRelic = (id) => { RoundTableRewardSystem.collectRelic(this._run, id); this._rewardScreen.show(this._run); };
      this._rewardScreen.onCollectPotion = (id) => { RoundTableRewardSystem.collectPotion(this._run, id); this._rewardScreen.show(this._run); };
      this._rewardScreen.onContinue = () => this._afterNodeComplete();
      this._uiLayer.addChild(this._rewardScreen.container);
      this._uiLayer.addChild(this._hud.container);
      this._rewardScreen.show(this._run);
      this._hud.update(this._run, 800);
    });
  }

  private _setupEvent(eventId: string): void {
    this._run.phase = RTPhase.EVENT;
    this._run.currentEventId = eventId;
    this._eventScreen.onChoice = (idx) => {
      RoundTableEventSystem.applyChoice(this._run, eventId, idx, this._rng);
      if (this._run.flags.has("pending_card_remove")) {
        this._run.flags.delete("pending_card_remove");
        this._showCardPicker("Remove a card", this._run.deck, (uid) => {
          RoundTableDeckSystem.removeCardFromDeck(this._run, uid);
          this._afterNodeComplete();
        });
        return;
      }
      if (this._run.hp <= 0) { this._showGameOver(false); return; }
      this._afterNodeComplete();
    };
    this._uiLayer.addChild(this._eventScreen.container);
    this._uiLayer.addChild(this._hud.container);
    this._eventScreen.show(this._run, eventId);
    this._hud.update(this._run, 800);
  }

  private _setupRest(): void {
    this._run.phase = RTPhase.REST;
    this._restScreen.onHeal = () => {
      if (this._run.relics.includes("coffee_dripper")) return; // blocked
      const healAmt = Math.floor(this._run.maxHp * RT_BALANCE.REST_HEAL_PERCENT);
      this._run.hp = Math.min(this._run.maxHp, this._run.hp + healAmt);
      RoundTableRelicSystem.trigger(this._run, null, "on_rest", this._rng);
      // Dream catcher: add random card on rest
      if (this._run.flags.has("dream_catcher_triggered")) {
        this._run.flags.delete("dream_catcher_triggered");
        // Add a random common card
        const commonPool = ["quick_slash", "cleave", "twin_strike", "shield_bash", "parry", "fireball", "chain_lightning", "iron_wave", "pommel_strike"];
        const id = commonPool[Math.floor(this._rng.next() * commonPool.length)];
        RoundTableDeckSystem.addCardToDeck(this._run, id);
      }
      this._afterNodeComplete();
    };
    this._restScreen.onUpgrade = () => {
      const upgradeable = RoundTableDeckSystem.getUpgradeableCards(this._run);
      if (upgradeable.length === 0) { this._restScreen.onHeal?.(); return; }
      this._showCardPicker("Upgrade a card", upgradeable, (uid) => {
        RoundTableDeckSystem.upgradeCard(this._run, uid);
        this._afterNodeComplete();
      });
    };
    this._uiLayer.addChild(this._restScreen.container);
    this._uiLayer.addChild(this._hud.container);
    this._restScreen.show(this._run);
    this._hud.update(this._run, 800);
  }

  private _setupShop(): void {
    this._run.phase = RTPhase.SHOP;
    RoundTableRewardSystem.generateShop(this._run, this._rng);
    this._shopScreen.onBuy = (index) => {
      const item = this._run.shop?.[index];
      const success = RoundTableRewardSystem.buyShopItem(this._run, index);
      if (success && item?.type === "remove_card") {
        this._run.flags.delete("pending_card_remove");
        this._showCardPicker("Remove a card", this._run.deck, (uid) => {
          RoundTableDeckSystem.removeCardFromDeck(this._run, uid);
          this._setupShop();
        });
        return;
      }
      this._shopScreen.show(this._run);
      this._hud.update(this._run, 800);
    };
    this._shopScreen.onLeave = () => { this._run.shop = null; this._afterNodeComplete(); };
    this._uiLayer.addChild(this._shopScreen.container);
    this._uiLayer.addChild(this._hud.container);
    this._shopScreen.show(this._run);
    this._hud.update(this._run, 800);
  }

  private _showTreasure(): void {
    const relicId = this._pickTreasureRelic();
    if (relicId) {
      this._run.relics.push(relicId);
      if (this._run.relics.includes("cursed_key")) {
        const curses = ["curse_doubt", "curse_regret", "curse_decay", "curse_pain"];
        RoundTableDeckSystem.addCardToDeck(this._run, curses[Math.floor(this._rng.next() * curses.length)]);
      }
    }
    this._transitionTo(() => {
      this._treasureScreen.onContinue = () => this._afterNodeComplete();
      this._uiLayer.addChild(this._treasureScreen.container);
      this._uiLayer.addChild(this._hud.container);
      this._treasureScreen.show(relicId);
      this._hud.update(this._run, 800);
    });
  }

  private _pickTreasureRelic(): string | null {
    const pool = [
      ...getRelicPool(RelicRarity.COMMON).filter(r => !this._run.relics.includes(r.id)),
      ...getRelicPool(RelicRarity.UNCOMMON).filter(r => !this._run.relics.includes(r.id)),
    ];
    if (pool.length === 0) return null;
    return pool[Math.floor(this._rng.next() * pool.length)].id;
  }

  private _startCombatTicker(): void {
    this._stopCombatTicker();
    this._combatTime = 0;
    this._combatTickerCb = (ticker: any) => {
      this._combatTime += ticker.deltaMS / 1000;
      this._combatView.updateIdle(this._combatTime);
    };
    viewManager.app.ticker.add(this._combatTickerCb);
  }

  private _stopCombatTicker(): void {
    if (this._combatTickerCb) {
      viewManager.app.ticker.remove(this._combatTickerCb);
      this._combatTickerCb = null;
    }
  }

  private _showDeckViewer(): void {
    const combat = this._run.combat;
    if (!combat) return;
    this._deckViewer.onClose = () => {
      this._deckViewer.hide();
    };
    this._uiLayer.addChild(this._deckViewer.container);
    this._deckViewer.show(this._run.deck, combat.discardPile, combat.exhaustPile);
  }

  private _showCardPicker(title: string, cards: any[], onPick: (uid: number) => void): void {
    this._hideAllImmediate();
    this._cardPicker.onPick = (uid) => { this._cardPicker.hide(); onPick(uid); };
    this._cardPicker.onCancel = null;
    this._uiLayer.addChild(this._cardPicker.container);
    this._cardPicker.show(title, cards);
  }

  private _showGameOver(won: boolean): void {
    this._transitionTo(() => {
      this._run.phase = won ? RTPhase.VICTORY : RTPhase.GAME_OVER;
      clearRunSave();
      RoundTableMetaSystem.endRun(this._run, won);
      const score = this._run.score + (won ? RT_BALANCE.SCORE_WIN_BONUS : 0);
      this._gameOverScreen.onRestart = () => this._showKnightSelect();
      this._gameOverScreen.onMainMenu = () => this.destroy();
      this._uiLayer.addChild(this._gameOverScreen.container);
      this._gameOverScreen.show(this._run, won, score);
    });
  }

  private _afterNodeComplete(): void {
    const map = this._run.maps[this._run.act - 1];
    if (!map) return;
    if (RoundTableMapSystem.isActComplete(map)) {
      if (this._run.act >= RT_BALANCE.TOTAL_ACTS) { this._showGameOver(true); return; }
      this._run.act++;
    }
    saveRunState(this._run);
    this._showMap();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAUSE MENU
  // ═══════════════════════════════════════════════════════════════════════════

  private _showPause(): void {
    this._pauseScreen.onResume = () => { this._pauseScreen.hide(); };
    this._pauseScreen.onMainMenu = () => {
      this._pauseScreen.hide();
      clearRunSave();
      this._showKnightSelect();
    };
    this._pauseScreen.onViewDeck = () => {
      this._pauseScreen.hide();
      // Show deck viewer with run.deck
      this._deckViewer.onClose = () => {
        this._deckViewer.hide();
        this._showPause();
      };
      this._uiLayer.addChild(this._deckViewer.container);
      const combat = this._run.combat;
      this._deckViewer.show(this._run.deck, combat?.discardPile ?? [], combat?.exhaustPile ?? []);
    };
    this._uiLayer.addChild(this._pauseScreen.container);
    this._pauseScreen.show(this._run);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════

  private _hideAllImmediate(): void {
    this._stopCombatTicker();
    this._gameLayer.removeChildren();
    this._uiLayer.removeChildren();
    this._knightSelect.hide();
    this._rewardScreen.hide();
    this._eventScreen.hide();
    this._restScreen.hide();
    this._shopScreen.hide();
    this._gameOverScreen.hide();
    this._cardPicker.hide();
    this._treasureScreen.hide();
    this._deckViewer.hide();
    this._pauseScreen.hide();
    this._combatView.destroy();
    this._mapView.destroy();
  }
}
