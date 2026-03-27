import { DiabloRenderer, getTerrainHeight } from "./DiabloRenderer";
import { hasSave, saveGame, showSaveRecoveryPrompt } from "./DiabloSaveLoad";
import { loadLeaderboard, saveLeaderboard, addLeaderboardEntry, showLeaderboard } from "./DiabloLeaderboard";
import { DiabloNetwork } from './DiabloNetwork';
import {
  PetContext, PetUIContext,
  createPet as petCreatePet,
  rollPetDrop as petRollPetDrop,
  summonPet as petSummonPet,
  dismissPet as petDismissPet,
  grantPetXp as petGrantPetXp,
  updatePets as petUpdatePets,
  applyPetBuff as petApplyPetBuff,
  updatePetBuffs as petUpdatePetBuffs,
  hasPetBuff as petHasPetBuff,
  showPetPanel as petShowPetPanel,
  showPetManagement as petShowPetManagement,
} from "./DiabloPets";
import {
  DiabloState, DiabloEnemy, DiabloProjectile, DiabloLoot,
  DiabloTreasureChest, DiabloAOE,
  DiabloClass, DiabloMapId, DiabloPhase, ItemRarity, DiabloDifficulty,
  SkillId, EnemyState, EnemyType, StatusEffect, TimeOfDay, DamageType,
  DiabloItem, DiabloEquipment, DiabloPotion, PotionType,
  VendorType, DiabloVendor, DiabloTownfolk, TownfolkRole,
  BossAbility, EnemyBehavior,
  DiabloQuest, QuestType, CraftType,
  TalentEffectType,
  ParticleType, Weather,
  MapModifier, LootFilterLevel, GreaterRiftState,
  PetType, PetSpecies, PetAIState, DiabloPet,
  CraftingStationType, MaterialType, AdvancedCraftingRecipe,
  RuneType, SkillRuneEffect,
  LegendaryEffectDef,
  ItemSlot, ItemType, DiabloItemStats,
  MultiplayerState,
  GRLeaderboardEntry, KeyBindings, DEFAULT_KEYBINDINGS,
  createDefaultPlayer, createDefaultState
} from "./DiabloTypes";
import {
  SKILL_DEFS, MAP_CONFIGS, ENEMY_DEFS, ITEM_DATABASE, SET_BONUSES,
  LOOT_TABLES, RARITY_NAMES, XP_TABLE,
  ENEMY_SPAWN_WEIGHTS,
  VENDOR_DEFS, generateVendorInventory,
  DIFFICULTY_CONFIGS,
  BOSS_PHASE_CONFIGS,
  TALENT_TREES, TALENT_BRANCH_NAMES,
  POTION_DATABASE, ENEMY_DAMAGE_TYPES,
  QUEST_DATABASE,
  MAP_COMPLETION_REWARDS,
  CRAFTING_RECIPES,
  SALVAGE_MATERIAL_YIELDS,
  LANTERN_CONFIGS,
  SKILL_BRANCHES,
  UNLOCKABLE_SKILLS,
  MAP_SPECIFIC_ITEMS,
  MAP_MODIFIER_DEFS, PARAGON_XP_TABLE,
  PET_DEFS, PET_DROP_TABLE, PET_XP_TABLE,
  ADVANCED_CRAFTING_RECIPES, CRAFTING_MATERIALS, MATERIAL_DROP_TABLE,
  GREATER_RIFT_CONFIG,
  SKILL_RUNES,
  LEGENDARY_EFFECTS,
  RUNEWORD_DEFS,
  COSMETIC_DEFS,
  TALENT_SYNERGIES,
} from "./DiabloConfig";
import {
  RARITY_CSS, RARITY_GLOW, RARITY_BORDER, RARITY_TIER, RARITY_BG, RARITY_BADGE,
  rarityNeedsAnim, resolveEquipKey,
  MAP_KILL_TARGET, BOSS_NAMES, EXCALIBUR_QUEST_INFO, CAMELOT_FIRST_VISIT_TEXT,
  VENDOR_DIALOGUE, NIGHT_BOSS_MAP, DAY_BOSS_MAP,
  MAP_LORE_POINTS, RARITY_ORDER, MAP_NAME_MAP, WEATHER_LABELS,
} from "./DiabloConstants";
import {
  createAudioState, ensureAudio as ensureAudioCtx,
  startBgm, stopBgm, playSound as playSoundEffect, destroyAudio,
} from "./DiabloAudioSystem";
import type { SoundType } from "./DiabloAudioSystem";
import {
  CombatContext,
  updateCombat as combatUpdateCombat,
  activateSkill as combatActivateSkill,
  updateProjectiles as combatUpdateProjectiles,
  updateAOE as combatUpdateAOE,
  tickAOEDamage as combatTickAOEDamage,
  createProjectile as combatCreateProjectile,
  chainLightningBounce as combatChainLightningBounce,
  checkElementalReaction as combatCheckElementalReaction,
  getEquippedLegendaryEffects as combatGetEquippedLegendaryEffects,
  triggerLegendaryEffects as combatTriggerLegendaryEffects,
  getPassiveLegendaryBonusDamage as combatGetPassiveLegendaryBonusDamage,
  getSkillBranchModifiers as combatGetSkillBranchModifiers,
  getSkillDamage as combatGetSkillDamage,
  doDodgeRoll as combatDoDodgeRoll,
  damageTypeColor as combatDamageTypeColor,
  damageTypeToParticle as combatDamageTypeToParticle,
} from "./DiabloCombat";
import { drawMinimapContent, isExplored, type MinimapContext } from "./DiabloMinimap";
import { HUDRefs, HUDState, HUDUpdateContext, buildHUD, updateHUD, createHUDState } from "./DiabloHUD";
import {
  initAchievements, updateAchievement, incrementAchievement,
  showAchievements, processAchievementNotifications,
  generateDailyChallenges, updateDailyProgress, updateQuestTracker,
} from "./DiabloQuests";
import {
  RiftContext,
  startGreaterRift as riftStart,
  updateGreaterRift as riftUpdate,
  spawnRiftGuardian as riftSpawnGuardian,
  onRiftEnemyKill as riftOnEnemyKill,
  onRiftGuardianKill as riftOnGuardianKill,
} from "./DiabloRift";
import {
  ScreenContext,
  showClassSelect as screenShowClassSelect,
  showMapSelect as screenShowMapSelect,
  showInventory as screenShowInventory,
  showCollection as screenShowCollection,
  showSkillSwapMenu as screenShowSkillSwapMenu,
  showCharacterOverview as screenShowCharacterOverview,
  showItemTooltip as screenShowItemTooltip,
  showPauseMenu as screenShowPauseMenu,
  showControls as screenShowControls,
  showGameOver as screenShowGameOver,
  showVictory as screenShowVictory,
  showStash as screenShowStash,
  showSkillTreeScreen as screenShowSkillTreeScreen,
  showTalentTree as screenShowTalentTree,
  showVendorShop as screenShowVendorShop,
  showCraftingUI as screenShowCraftingUI,
  showAdvancedCraftingUI as screenShowAdvancedCraftingUI,
  showQuestBoard as screenShowQuestBoard,
} from "./DiabloScreens";

// ────────────────────────────────────────────────────────────────────────────
// DiabloGame
export class DiabloGame {
  private _state!: DiabloState;
  private _renderer!: DiabloRenderer;
  private _hud!: HTMLDivElement;
  private _menuEl!: HTMLDivElement;
  private _rafId: number = 0;
  private _lastTime: number = 0;
  private _keys: Set<string> = new Set();
  private _mouseX: number = 0;
  private _mouseY: number = 0;
  private _mouseDown: boolean = false;
  private _nextId: number = 1;
  private _targetEnemyId: string | null = null;
  private _discoveredLore: Set<string> = new Set();
  private _phaseBeforeOverlay: DiabloPhase = DiabloPhase.CLASS_SELECT;

  // Achievement popup
  private _achievementPopup: HTMLDivElement | null = null;
  // Deathless tracking (per map run)
  private _mapDeathCount: number = 0;

  // First-person mode
  private _firstPerson: boolean = false;
  private _fpYaw: number = 0;
  private _fpPitch: number = 0;
  private _pointerLocked: boolean = false;
  private _mouseDX: number = 0;
  private _mouseDY: number = 0;

  // Help overlay
  private _firstPlayHelpShown: boolean = false;

  // Multiplayer
  private _network: DiabloNetwork = new DiabloNetwork();
  private _networkUpdateTimer: number = 0;

  // Bound event handlers
  private _boundKeyDown!: (e: KeyboardEvent) => void;
  private _boundKeyUp!: (e: KeyboardEvent) => void;
  private _boundMouseMove!: (e: MouseEvent) => void;
  private _boundMouseDown!: (e: MouseEvent) => void;
  private _boundMouseUp!: (e: MouseEvent) => void;
  private _boundContextMenu!: (e: MouseEvent) => void;
  private _boundResize!: () => void;
  private _boundPointerLockChange!: () => void;

  // HUD (extracted to DiabloHUD.ts)
  private _hudRefs!: HUDRefs;
  private _hudState: HUDState = createHUDState();

  // Town portal (return to character select)
  private _portalX: number = 0;
  private _portalZ: number = 0;
  private _portalActive: boolean = false;

  // Death overlay state
  private _isDead: boolean = false;

  // Quest tracker state (a270b216)
  private _chestsOpened: number = 0;
  private _goldEarnedTotal: number = 0;
  private _totalKills: number = 0;
  private _questTrackerDirty: boolean = true;
  private _questTrackerDirtyTimer: number = 0;

  // Safe zone (enemy-free spawn area)
  // @ts-ignore assigned but value never read (reserved for future use)
  private _safeZoneX: number = 0;
  // @ts-ignore assigned but value never read (reserved for future use)
  private _safeZoneZ: number = 0;
  // @ts-ignore assigned but value never read (reserved for future use)
  private _safeZoneRadius: number = 20;

  // Procedural audio system (delegated to DiabloAudioSystem)
  private _audio = createAudioState();

  // Skill mastery XP tracking (feature: mastery per skill)
  private _skillMasteryXp: Map<SkillId, number> = new Map();

  // Map completion reward tracking
  private _mapClearRewardGiven: boolean = false;

  // Death tracking
  private _lastDeathCause: string = '';
  private _recentDamage: { source: string; amount: number; type: string; time: number }[] = [];
  private _deathLocationX: number = 0;
  private _deathLocationZ: number = 0;
  private _deathGoldDrop: number = 0;

  // Hit freeze & slow motion
  private _hitFreezeTimer: number = 0;

  // Combo kill system
  private _comboCount: number = 0;
  private _comboTimer: number = 0;
  private _comboMultiplier: number = 1.0;
  private _slowMotionTimer: number = 0;
  private _slowMotionScale: number = 1;

  // DPS tracking
  private _dpsDisplay!: HTMLDivElement;
  private _combatLog: { time: number; damage: number }[] = [];
  private _currentDps: number = 0;

  // Skill queue
  private _queuedSkillIdx: number = -1;

  // Loot filter
  private _lootFilterLevel: LootFilterLevel = LootFilterLevel.SHOW_ALL;

  // Legendary hit counter (for "Every 5th Strike")
  // @ts-ignore used by legendary effects
  private _hitCounter: number = 0;

  // Berserker stacks
  // @ts-ignore used by legendary effects
  private _berserkerStacks: { expiry: number }[] = [];

  // Pet system
  private _petBuffs: { type: string; value: number; remaining: number }[] = [];

  // Advanced crafting
  // @ts-ignore used by crafting UI state
  private _craftingUIOpen: boolean = false;

  // Greater Rift Leaderboard
  private _grLeaderboard: GRLeaderboardEntry[] = [];

  // Keyboard rebinding
  private _keyBindings: KeyBindings = { ...DEFAULT_KEYBINDINGS };

  // Performance: dirty flags for cached computations
  private _statsDirty: boolean = true;
  private _talentsDirty: boolean = true;
  private _equipDirty: boolean = true;
  private _cachedTalentBonuses: Partial<Record<TalentEffectType, number>> = {};
  private _cachedLegendaryEffects: LegendaryEffectDef[] = [];

  // Performance: fog-of-war reveal position cache
  private _lastRevealX: number = -9999;
  private _lastRevealZ: number = -9999;

  // Performance: cached HUD element references
  private _dpsValueEl: Element | null = null;
  private _lootFilterLabelEl: HTMLDivElement | null = null;

  // ──────────────────────────────────────────────────────────────
  //  LEADERBOARD
  // ──────────────────────────────────────────────────────────────
  private _loadLeaderboard(): void {
    this._grLeaderboard = loadLeaderboard();
  }

  private _saveLeaderboard(): void {
    saveLeaderboard(this._grLeaderboard);
  }

  private _addLeaderboardEntry(entry: GRLeaderboardEntry): void {
    this._grLeaderboard = addLeaderboardEntry(this._grLeaderboard, entry);
  }

  private _showLeaderboard(): void {
    showLeaderboard(this._menuEl, this._grLeaderboard, () => this._showMapSelect());
  }

  // ──────────────────────────────────────────────────────────────
  //  KEY BINDINGS
  // ──────────────────────────────────────────────────────────────
  private _loadKeyBindings(): void {
    try {
      const raw = localStorage.getItem('diablo_keybindings');
      if (raw) this._keyBindings = { ...DEFAULT_KEYBINDINGS, ...JSON.parse(raw) };
    } catch { /* use defaults */ }
  }

  // ──────────────────────────────────────────────────────────────
  //  TOOLTIP HELPERS
  // ──────────────────────────────────────────────────────────────
  private _countEquippedSetPieces(setName: string): number {
    let count = 0;
    const eq = this._state.player.equipment;
    const slots = ['helmet', 'body', 'gauntlets', 'legs', 'feet', 'accessory1', 'accessory2', 'weapon', 'lantern'] as const;
    for (const slot of slots) {
      if (eq[slot]?.setName === setName) count++;
    }
    return count;
  }

  // ──────────────────────────────────────────────────────────────
  //  STASH SORTING
  // ──────────────────────────────────────────────────────────────
  private _sortStash(sortBy: 'rarity' | 'type' | 'level'): void {
    const stash = this._state.persistentStash;
    const items = stash.filter(s => s.item !== null).map(s => s.item!);

    items.sort((a, b) => {
      switch (sortBy) {
        case 'rarity': {
          return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        }
        case 'type':
          return a.type.localeCompare(b.type) || b.level - a.level;
        case 'level':
          return b.level - a.level;
        default:
          return 0;
      }
    });

    for (let i = 0; i < stash.length; i++) {
      stash[i].item = i < items.length ? items[i] : null;
    }
  }
  // ──────────────────────────────────────────────────────────────
  //  HELP OVERLAY
  // ──────────────────────────────────────────────────────────────
  private _showHelpOverlay(): void {
    this._phaseBeforeOverlay = this._state.phase;
    this._state.phase = DiabloPhase.PAUSED;
    this._menuEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,15,10,0.95);border:2px solid #8b6914;border-radius:8px;padding:20px 30px;color:#fff;font-family:Georgia,serif;min-width:550px;max-height:85vh;overflow-y:auto;z-index:100;';

    panel.innerHTML = `
      <h2 style="text-align:center;color:#ffd700;margin:0 0 15px;">Controls & Shortcuts</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:13px;">
        <div>
          <h3 style="color:#b8860b;margin:0 0 8px;font-size:14px;">Movement</h3>
          <div><span style="color:#ffd700;">WASD / Arrows</span> \u2014 Move</div>
          <div><span style="color:#ffd700;">Right Click</span> \u2014 Click to move</div>
          <div><span style="color:#ffd700;">Space</span> \u2014 Dodge roll</div>
          <div><span style="color:#ffd700;">V</span> \u2014 Toggle first person</div>

          <h3 style="color:#b8860b;margin:10px 0 8px;font-size:14px;">Combat</h3>
          <div><span style="color:#ffd700;">Left Click</span> \u2014 Attack / Target enemy</div>
          <div><span style="color:#ffd700;">1-6</span> \u2014 Use skill</div>
          <div><span style="color:#ffd700;">Shift+1-6</span> \u2014 Cycle skill rune</div>
          <div><span style="color:#ffd700;">F1-F4</span> \u2014 Use potion</div>
          <div><span style="color:#ffd700;">E</span> \u2014 Interact</div>
        </div>
        <div>
          <h3 style="color:#b8860b;margin:0 0 8px;font-size:14px;">Panels</h3>
          <div><span style="color:#ffd700;">I</span> \u2014 Inventory</div>
          <div><span style="color:#ffd700;">M</span> \u2014 Fullscreen map</div>
          <div><span style="color:#ffd700;">B</span> \u2014 Advanced crafting</div>
          <div><span style="color:#ffd700;">Tab</span> \u2014 Cycle loot filter</div>
          <div><span style="color:#ffd700;">Y</span> \u2014 Summon/cycle pet</div>
          <div><span style="color:#ffd700;">Shift+P</span> \u2014 Pet management</div>
          <div><span style="color:#ffd700;">Shift+A</span> \u2014 Achievements</div>
          <div><span style="color:#ffd700;">Shift+S</span> \u2014 Statistics</div>
          <div><span style="color:#ffd700;">Shift+O</span> \u2014 Cosmetics</div>
          <div><span style="color:#ffd700;">Shift+C</span> \u2014 Quick salvage</div>
          <div><span style="color:#ffd700;">L</span> \u2014 GR Leaderboard (map select)</div>
          <div><span style="color:#ffd700;">H / ?</span> \u2014 This help screen</div>

          <h3 style="color:#b8860b;margin:10px 0 8px;font-size:14px;">Other</h3>
          <div><span style="color:#ffd700;">T</span> \u2014 Toggle lantern</div>
          <div><span style="color:#ffd700;">Esc</span> \u2014 Close panel / Pause</div>
          <div><span style="color:#ffd700;">F5</span> \u2014 Save game</div>
          <div><span style="color:#ffd700;">N</span> \u2014 Multiplayer (map select)</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:15px;">
        <button id="help-close" style="padding:8px 24px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;">Close (Esc)</button>
      </div>
    `;
    this._menuEl.appendChild(panel);

    document.getElementById('help-close')?.addEventListener('click', () => {
      this._state.phase = this._phaseBeforeOverlay;
      this._menuEl.innerHTML = '';
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  INVENTORY SORT
  // ──────────────────────────────────────────────────────────────
  private _sortInventory(sortBy: 'rarity' | 'type' | 'level'): void {
    const inv = this._state.player.inventory;
    const items = inv.filter(s => s.item !== null).map(s => s.item!);

    items.sort((a, b) => {
      switch (sortBy) {
        case 'rarity': {
          const order = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY, ItemRarity.MYTHIC, ItemRarity.DIVINE];
          return order.indexOf(b.rarity) - order.indexOf(a.rarity);
        }
        case 'type': return a.type.localeCompare(b.type) || b.level - a.level;
        case 'level': return b.level - a.level;
        default: return 0;
      }
    });

    for (let i = 0; i < inv.length; i++) {
      inv[i].item = i < items.length ? items[i] : null;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ITEM LOCK
  // ──────────────────────────────────────────────────────────────
  private _toggleItemLock(slotIndex: number): void {
    const item = this._state.player.inventory[slotIndex]?.item;
    if (item) {
      item.isLocked = !item.isLocked;
      this._addFloatingText(this._state.player.x, this._state.player.y + 2, this._state.player.z,
        item.isLocked ? '\uD83D\uDD12 Item locked' : '\uD83D\uDD13 Item unlocked', '#aaaaaa');
    }
  }


  // ──────────────────────────────────────────────────────────────
  //  BOOT
  // ──────────────────────────────────────────────────────────────
  async boot(): Promise<void> {
    this._state = createDefaultState();
    this._loadLeaderboard();
    this._loadKeyBindings();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer = new DiabloRenderer();
    this._renderer.init(w, h);
    document.body.appendChild(this._renderer.canvas);

    // HUD overlay
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;" +
      "font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;display:none;";
    document.body.appendChild(this._hud);

    // Menu overlay
    this._menuEl = document.createElement("div");
    this._menuEl.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;";
    document.body.appendChild(this._menuEl);

    // Bind events
    this._keys = new Set();
    this._boundKeyDown = (e: KeyboardEvent) => this._onKeyDown(e);
    this._boundKeyUp = (e: KeyboardEvent) => this._onKeyUp(e);
    this._boundMouseMove = (e: MouseEvent) => this._onMouseMove(e);
    this._boundMouseDown = (e: MouseEvent) => this._onMouseDown(e);
    this._boundMouseUp = (e: MouseEvent) => this._onMouseUp(e);
    this._boundContextMenu = (e: MouseEvent) => this._onContextMenu(e);
    this._boundResize = () => this._onResize();

    window.addEventListener("keydown", this._boundKeyDown);
    window.addEventListener("keyup", this._boundKeyUp);
    window.addEventListener("mousemove", this._boundMouseMove);
    window.addEventListener("mousedown", this._boundMouseDown);
    window.addEventListener("mouseup", this._boundMouseUp);
    window.addEventListener("contextmenu", this._boundContextMenu);
    window.addEventListener("resize", this._boundResize);
    this._boundPointerLockChange = () => {
      this._pointerLocked = document.pointerLockElement === this._renderer.canvas;
      if (!this._pointerLocked && this._firstPerson) {
        this._firstPerson = false;
        this._renderer.firstPerson = false;
      }
    };
    document.addEventListener("pointerlockchange", this._boundPointerLockChange);

    // Suppress Chrome "message channel" errors from pointer lock and DOM cleanup
    window.addEventListener("unhandledrejection", (e) => {
      if (e.reason?.message?.includes?.("message channel") ||
          e.reason?.message?.includes?.("MessageChannel") ||
          e.reason?.message?.includes?.("pointer lock")) {
        e.preventDefault();
      }
    });

    this._buildHUD();
    this._showClassSelect();
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._gameLoop);
  }

  // ──────────────────────────────────────────────────────────────
  //  DESTROY
  // ──────────────────────────────────────────────────────────────
  destroy(): void {
    cancelAnimationFrame(this._rafId);
    document.body.style.cursor = '';
    window.removeEventListener("keydown", this._boundKeyDown);
    window.removeEventListener("keyup", this._boundKeyUp);
    window.removeEventListener("mousemove", this._boundMouseMove);
    window.removeEventListener("mousedown", this._boundMouseDown);
    window.removeEventListener("mouseup", this._boundMouseUp);
    window.removeEventListener("contextmenu", this._boundContextMenu);
    window.removeEventListener("resize", this._boundResize);
    document.removeEventListener("pointerlockchange", this._boundPointerLockChange);
    if (this._hud && this._hud.parentElement) {
      this._hud.parentElement.removeChild(this._hud);
    }
    if (this._menuEl && this._menuEl.parentElement) {
      this._menuEl.parentElement.removeChild(this._menuEl);
    }
    this._renderer.dispose();
  }

  // ──────────────────────────────────────────────────────────────
  //  INPUT HANDLERS
  // ──────────────────────────────────────────────────────────────
  private _onKeyDown(e: KeyboardEvent): void {
    this._keys.add(e.code);
    if (this._state.phase === DiabloPhase.PLAYING) {
      // Shift+Digit cycles runes for the skill in that slot
      if (e.shiftKey) {
        if (e.code === "KeyS") {
          this._showStatsPanel();
          return;
        }
        const slotMap: Record<string, number> = { 'Digit1': 0, 'Digit2': 1, 'Digit3': 2, 'Digit4': 3, 'Digit5': 4, 'Digit6': 5 };
        const slotIdx = slotMap[e.code];
        if (slotIdx !== undefined && slotIdx < this._state.player.skills.length) {
          const skillId = this._state.player.skills[slotIdx];
          const runes = SKILL_RUNES[skillId];
          if (runes && runes.length > 0) {
            const current = this._state.player.activeRunes[skillId] || RuneType.NONE;
            const allRunes = [RuneType.NONE, ...runes.filter(r => {
              const key = `${skillId}_${r.runeType}`;
              return this._state.player.unlockedRunes.includes(key);
            }).map(r => r.runeType)];
            const idx = allRunes.indexOf(current);
            const nextIdx = (idx + 1) % allRunes.length;
            this._state.player.activeRunes[skillId] = allRunes[nextIdx];
            const runeName = allRunes[nextIdx] === RuneType.NONE ? 'No Rune' : runes.find(r => r.runeType === allRunes[nextIdx])?.name || '';
            this._addFloatingText(this._state.player.x, this._state.player.y + 2, this._state.player.z, runeName, '#aa44ff');
          }
        }
      } else if (e.code === this._keyBindings.skill1) this._activateSkill(0);
      else if (e.code === this._keyBindings.skill2) this._activateSkill(1);
      else if (e.code === this._keyBindings.skill3) this._activateSkill(2);
      else if (e.code === this._keyBindings.skill4) this._activateSkill(3);
      else if (e.code === this._keyBindings.skill5) this._activateSkill(4);
      else if (e.code === this._keyBindings.skill6) this._activateSkill(5);
      else if (e.code === this._keyBindings.inventory) {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showInventory();
      } else if (e.code === "Escape") {
        this._state.phase = DiabloPhase.PAUSED;
        this._showPauseMenu();
      } else if (e.code === "KeyJ") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showQuestBoard();
      } else if (e.code === "KeyT") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showTalentTree();
      } else if (e.code === this._keyBindings.dodge) { e.preventDefault(); } // dodge handled in processInput
      else if (e.code === this._keyBindings.lootFilter) {
        e.preventDefault();
        const levels = [LootFilterLevel.SHOW_ALL, LootFilterLevel.HIDE_COMMON, LootFilterLevel.RARE_PLUS, LootFilterLevel.EPIC_PLUS];
        const curIdx = levels.indexOf(this._lootFilterLevel);
        this._lootFilterLevel = levels[(curIdx + 1) % levels.length];
        this._state.player.lootFilter = this._lootFilterLevel;
        // Also cycle custom loot filter
        const pf = this._state.player;
        if (pf.customLootFilters.length > 0) {
          pf.activeFilterIndex = (pf.activeFilterIndex + 1) % pf.customLootFilters.length;
          const filter = pf.customLootFilters[pf.activeFilterIndex];
          this._addFloatingText(pf.x, pf.y + 3, pf.z, `Filter: ${filter.name}`, '#ffdd00');
        }
      }
      else if ((e.code === "KeyH" && !e.shiftKey) || (e.code === "Slash" && e.shiftKey)) {
        this._showHelpOverlay();
      }
      else if (e.code === "KeyH" && e.shiftKey) {
        // Toggle DPS display
        this._state.player.dpsDisplayVisible = !this._state.player.dpsDisplayVisible;
      }
      else if (e.code === "KeyQ") {
        this._useQuickPotion(PotionType.HEALTH);
      } else if (e.code === this._keyBindings.interact && this._state.currentMap !== DiabloMapId.CAMELOT) {
        if (this._portalActive && this._dist(this._state.player.x, this._state.player.z, this._portalX, this._portalZ) < 4) {
          this._useTownPortal();
        } else {
          this._useQuickPotion(PotionType.MANA);
        }
      } else if (e.code === this._keyBindings.potion1) {
        e.preventDefault();
        this._usePotionSlot(0);
      } else if (e.code === this._keyBindings.potion2) {
        e.preventDefault();
        this._usePotionSlot(1);
      } else if (e.code === this._keyBindings.potion3) {
        e.preventDefault();
        this._usePotionSlot(2);
      } else if (e.code === this._keyBindings.potion4) {
        e.preventDefault();
        this._usePotionSlot(3);
      } else if (e.code === this._keyBindings.interact && this._state.currentMap === DiabloMapId.CAMELOT) {
        const p = this._state.player;
        let nearestVendor: DiabloVendor | null = null;
        let nearestDist = 4;
        for (const v of this._state.vendors) {
          const d = this._dist(p.x, p.z, v.x, v.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestVendor = v;
          }
        }
        if (nearestVendor) {
          if (nearestVendor.type === VendorType.BLACKSMITH) {
            this._showCraftingUI(nearestVendor, 'blacksmith');
          } else if (nearestVendor.type === VendorType.JEWELER) {
            this._showCraftingUI(nearestVendor, 'jeweler');
          } else {
            this._showVendorShop(nearestVendor);
          }
        } else if (this._portalActive && this._dist(p.x, p.z, this._portalX, this._portalZ) < 4) {
          this._useTownPortal();
        }
      } else if (e.code === this._keyBindings.map) {
        this._hudState.fullmapVisible = !this._hudState.fullmapVisible;
        this._hudRefs.fullmapCanvas.style.display = this._hudState.fullmapVisible ? "block" : "none";
      } else if (e.code === this._keyBindings.dodge) {
        this._doDodgeRoll();
      } else if (e.code === "KeyP" && e.shiftKey) {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showPetPanel();
      } else if (e.code === "KeyA" && e.shiftKey) {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showAchievements();
      } else if (e.code === "KeyO" && e.shiftKey) {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showCosmeticsPanel();
      } else if ((e.code === "KeyP" && !e.shiftKey) || e.code === "KeyL") {
        this._toggleLantern();
      } else if (e.code === "KeyK") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showSkillSwapMenu();
      } else if (e.code === "KeyF") {
        this._openNearestChest();
      } else if (e.code === "KeyC" && e.shiftKey) {
        // Quick salvage selected item
        this._quickSalvageSelectedItem();
      } else if (e.code === "KeyC" && !e.shiftKey) {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showCharacterOverview();
      } else if (e.code === "KeyV") {
        this._firstPerson = !this._firstPerson;
        this._renderer.firstPerson = this._firstPerson;
        if (this._firstPerson) {
          this._fpYaw = this._state.player.angle;
          this._fpPitch = 0;
          try { this._renderer.canvas.requestPointerLock()?.catch?.(() => {}); } catch (_) {}
        } else if (document.pointerLockElement) {
          try { document.exitPointerLock(); } catch (_) {}
        }
      } else if (e.code === "KeyN") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showCollection();
      } else if (e.code === "KeyG") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showPetManagement();
      } else if (e.code === "KeyB") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showAdvancedCraftingUI();
      } else if (e.code === this._keyBindings.petSummon) {
        // Quick pet summon/cycle
        const pp = this._state.player;
        if (pp.pets.length > 0) {
          if (pp.activePetId) {
            const currentIdx = pp.pets.findIndex(pet => pet.id === pp.activePetId);
            const nextIdx = (currentIdx + 1) % pp.pets.length;
            if (nextIdx === currentIdx) {
              // Only one pet, toggle summon
              this._summonPet(pp.activePetId);
            } else {
              this._summonPet(pp.pets[nextIdx].id);
            }
          } else {
            // Summon first pet
            this._summonPet(pp.pets[0].id);
          }
        }
      }
    } else if (this._state.phase === DiabloPhase.INVENTORY) {
      if (e.code === "Escape" || e.code === "KeyI" || e.code === "KeyT" || e.code === "KeyC" || e.code === "KeyN") {
        this._closeOverlay();
      } else if (e.code === "KeyS") {
        this._showStash();
      }
    } else if (this._state.phase === DiabloPhase.CLASS_SELECT) {
      // no-op: class select handles its own UI
    } else if (this._state.phase === DiabloPhase.MAP_SELECT) {
      if (e.code === "KeyL") {
        this._showLeaderboard();
      }
      // Multiplayer: N to toggle connect (for development/testing)
      else if (e.code === "KeyN") {
        if (this._state.multiplayer.state === MultiplayerState.DISCONNECTED) {
          // Try to connect to local dev server
          const wsUrl = `ws://${window.location.hostname}:3001`;
          this.connectMultiplayer(wsUrl, `Player${Math.floor(Math.random() * 999)}`);
          this._addFloatingText(this._state.player.x, this._state.player.y + 2, this._state.player.z, 'Connecting...', '#44ffff');
        } else {
          this.disconnectMultiplayer();
          this._addFloatingText(this._state.player.x, this._state.player.y + 2, this._state.player.z, 'Disconnected', '#ff4444');
        }
      }
    } else if (this._state.phase === DiabloPhase.PAUSED) {
      if (e.code === "Escape") {
        this._state.phase = this._phaseBeforeOverlay || DiabloPhase.PLAYING;
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        this._menuEl.innerHTML = "";
      }
    }
  }

  private _onKeyUp(e: KeyboardEvent): void {
    this._keys.delete(e.code);
  }

  private _onMouseMove(e: MouseEvent): void {
    this._mouseX = e.clientX;
    this._mouseY = e.clientY;
    if (this._firstPerson && this._pointerLocked) {
      this._mouseDX += e.movementX;
      this._mouseDY += e.movementY;
    }
    // Hover detection for enemy targeting
    if (this._state.phase === DiabloPhase.PLAYING && !this._firstPerson) {
      const hoverId = this._renderer.getEnemyAtScreen(e.clientX, e.clientY);
      this._renderer.setHoverEnemy(hoverId);
      // Change cursor when hovering an enemy
      document.body.style.cursor = hoverId ? 'crosshair' : '';
    }
  }

  private _onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this._mouseDown = true;
      if (this._state.phase === DiabloPhase.PLAYING) {
        // Check vendor interaction on Camelot
        if (this._state.currentMap === DiabloMapId.CAMELOT) {
          const p = this._state.player;

          // Check for Excalibur reforging at Camelot
          const totalFragments = Object.keys(EXCALIBUR_QUEST_INFO).length;
          if (p.excaliburFragments.length >= totalFragments && !p.excaliburReforged) {
            this._showReforgeExcalibur();
            return;
          }

          let nearestVendor: DiabloVendor | null = null;
          let nearestDist = 3;
          for (const v of this._state.vendors) {
            const d = this._dist(p.x, p.z, v.x, v.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearestVendor = v;
            }
          }
          if (nearestVendor) {
            this._showVendorShop(nearestVendor);
            return;
          }
        }

        // First person: left click fires active skill or attacks nearest enemy in look direction
        if (this._firstPerson && this._pointerLocked) {
          // Try to fire a skill (use slot 0 by default, or whichever the player has selected)
          const p = this._state.player;
          if (p.skills.length > 0) {
            this._activateSkill(0);
          }
          // Also auto-target nearest enemy in look direction for melee
          const sinY = Math.sin(this._fpYaw);
          const cosY = Math.cos(this._fpYaw);
          let bestId: string | null = null;
          let bestScore = Infinity;
          for (const enemy of this._state.enemies) {
            if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
            const dx = enemy.x - p.x;
            const dz = enemy.z - p.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 15) continue;
            // Dot product with look direction (higher = more aligned)
            const dot = (-sinY * dx + -cosY * dz) / (dist || 1);
            if (dot > 0.5) { // within ~60 degree cone
              const score = dist * (2 - dot); // prefer close + aligned
              if (score < bestScore) {
                bestScore = score;
                bestId = enemy.id;
              }
            }
          }
          if (bestId) this._targetEnemyId = bestId;
          return;
        }

        const target = this._renderer.getClickTarget(this._mouseX, this._mouseY, this._state);
        if (target) {
          if (target.type === "enemy") {
            this._targetEnemyId = target.id;
            // Auto-move toward targeted enemy
            const enemy = this._state.enemies.find(e => e.id === target.id);
            if (enemy) {
              const path = this._findPath(this._state.player.x, this._state.player.z, enemy.x, enemy.z);
              this._state.player.moveTarget = { x: enemy.x, z: enemy.z };
              this._state.player.movePath = path;
              this._state.player.movePathIndex = 0;
              this._state.player.isMovingToTarget = true;
            }
          } else if (target.type === "chest") {
            this._openChest(target.id);
          } else if (target.type === "loot") {
            this._pickupLoot(target.id);
          }
        } else {
          this._targetEnemyId = null;
        }
      }
    }
  }

  private _onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this._mouseDown = false;
  }

  private _onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    // Right-click to move
    if (this._state.phase === DiabloPhase.PLAYING && !this._isDead && !this._firstPerson) {
      const worldPos = this._getMouseWorldPos();
      const p = this._state.player;
      const path = this._findPath(p.x, p.z, worldPos.x, worldPos.z);
      p.moveTarget = { x: worldPos.x, z: worldPos.z };
      p.movePath = path;
      p.movePathIndex = 0;
      p.isMovingToTarget = true;
    }
  }

  private _screenCtx(): ScreenContext {
    return {
      menuEl: this._menuEl,
      state: this._state,
      showMapSelect: () => this._showMapSelect(),
      showInventory: () => this._showInventory(),
      showStash: () => this._showStash(),
      showControls: () => this._showControls(),
      showCharacterOverview: () => this._showCharacterOverview(),
      showPrestigePanel: () => this._showPrestigePanel(),
      showSkillTreeScreen: () => this._showSkillTreeScreen(),
      showItemTooltip: (ev, item) => this._showItemTooltip(ev, item),
      hideItemTooltip: () => this._hideItemTooltip(),
      showSaveRecoveryPrompt: () => this._showSaveRecoveryPrompt(),
      closeOverlay: () => this._closeOverlay(),
      backToMenu: () => this._backToMenu(),
      loadGame: () => this._loadGame(),
      loadPlayerOnly: () => this._loadPlayerOnly(),
      hasSave: () => this._hasSave(),
      saveGame: () => this._saveGame(),
      startMap: (mapId) => this._startMap(mapId),
      startGreaterRift: (level) => this._startGreaterRift(level),
      sortInventory: (sortBy) => this._sortInventory(sortBy),
      toggleItemLock: (idx) => this._toggleItemLock(idx),
      checkRunewords: () => this._checkRunewords(),
      recalculatePlayerStats: () => this._recalculatePlayerStats(),
      addFloatingText: (x, y, z, text, color) => this._addFloatingText(x, y, z, text, color),
      genId: () => this._genId(),
      getEffectiveStats: () => this._getEffectiveStats(),
      getWeaponDamage: () => this._getWeaponDamage(),
      getTalentBonuses: () => this._getTalentBonuses(),
      renderer: this._renderer,
      setStatsDirty: () => { this._statsDirty = true; },
      setEquipDirty: () => { this._equipDirty = true; },
      setPhaseBeforeOverlay: (phase) => { this._phaseBeforeOverlay = phase; },
      showQuestTracker: () => {
        this._hudRefs.questTracker.dataset.userHidden = "false";
        this._hudRefs.questTracker.style.display = "block";
        this._updateQuestTracker();
      },

      // New fields for extracted screens
      sortStash: (sortBy) => this._sortStash(sortBy),
      countEquippedSetPieces: (setName) => this._countEquippedSetPieces(setName),
      getTalentPointsInBranch: (branch) => this._getTalentPointsInBranch(branch),
      setTalentsDirty: () => { this._talentsDirty = true; },
      pickRandomItemOfRarity: (rarity) => this._pickRandomItemOfRarity(rarity),
      canAffordRecipe: (recipe) => this._canAffordRecipe(recipe),
      payRecipeCost: (recipe) => this._payRecipeCost(recipe),
      craftingUIOpen: this._craftingUIOpen,
      setCraftingUIOpen: (v) => { this._craftingUIOpen = v; },
      chestsOpened: this._chestsOpened,
      goldEarnedTotal: this._goldEarnedTotal,
      setGoldEarnedTotal: (v) => { this._goldEarnedTotal = v; },
      vendorDialogueIdx: this._vendorDialogueIdx,
    };
  }

  private _onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.resize(w, h);
  }

  // ──────────────────────────────────────────────────────────────
  //  CLASS SELECT SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showClassSelect(): void {
    screenShowClassSelect(this._screenCtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  MAP SELECT SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showMapSelect(): void {
    this._stopBgm();
    screenShowMapSelect(this._screenCtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  START MAP
  // ──────────────────────────────────────────────────────────────
  private _startMap(mapId: DiabloMapId): void {
    this._renderer.fadeOverlay(1); // fade to black
    this._state.currentMap = mapId;
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._state.killCount = 0;
    this._state.totalEnemiesSpawned = 0;
    this._state.spawnTimer = 0;
    this._mapClearRewardGiven = false;
    this._targetEnemyId = null;
    this._hudState.fullmapVisible = false;
    if (this._hudRefs) this._hudRefs.fullmapCanvas.style.display = "none";

    const weathers = [Weather.NORMAL, Weather.FOGGY, Weather.CLEAR, Weather.STORMY];
    this._state.weather = this._state.preferredWeather === 'RANDOM'
      ? weathers[Math.floor(Math.random() * weathers.length)]
      : this._state.preferredWeather as Weather;

    // Apply map modifier speed multiplier to spawned enemies
    // (modifiers are already set from map select, stored in this._state.activeMapModifiers)

    const mapCfg = MAP_CONFIGS[mapId];
    const gridW = mapCfg.width;
    const gridD = mapCfg.depth;
    this._state.exploredGrid = [];
    for (let x = 0; x < gridW; x++) {
      this._state.exploredGrid[x] = [];
      for (let z = 0; z < gridD; z++) {
        this._state.exploredGrid[x][z] = false;
      }
    }
    // Spawn player near a random corner of the map (with padding)
    const cornerPadX = gridW * 0.12;
    const cornerPadZ = gridD * 0.12;
    const corners = [
      { x: cornerPadX, z: cornerPadZ },
      { x: gridW - cornerPadX, z: cornerPadZ },
      { x: cornerPadX, z: gridD - cornerPadZ },
      { x: gridW - cornerPadX, z: gridD - cornerPadZ },
    ];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    const spawnX = corner.x + (Math.random() * 2 - 1);
    const spawnZ = corner.z + (Math.random() * 2 - 1);

    this._state.player.x = spawnX;
    this._state.player.y = getTerrainHeight(spawnX, spawnZ);
    this._state.player.z = spawnZ;
    // Mark spawn location as enemy-free safe zone
    this._safeZoneX = spawnX;
    this._safeZoneZ = spawnZ;
    this._safeZoneRadius = 40;
    this._revealAroundPlayer(spawnX, spawnZ);
    this._state.player.hp = this._state.player.maxHp;
    this._state.player.mana = this._state.player.maxMana;

    this._renderer.buildMap(mapId);
    this._renderer.buildPlayer(this._state.player.class);
    this._renderer.applyTimeOfDay(this._state.timeOfDay, mapId);
    this._renderer.applyWeather(this._state.weather);

    // Start map-specific background music
    this._startBgm(mapId);

    // Auto-enable lantern on map entry if one is equipped
    if (this._state.player.equipment.lantern) {
      const lanternCfg = LANTERN_CONFIGS[this._state.player.equipment.lantern.name];
      if (lanternCfg) {
        this._state.player.lanternOn = true;
        this._renderer.setPlayerLantern(true, lanternCfg.intensity, lanternCfg.distance, lanternCfg.color);
      }
    }

    if (mapId === DiabloMapId.CAMELOT) {
      // Camelot is a safe hub: no enemies, no dungeon
      this._state.dungeonLayout = null;
      // Place town portal near the entrance of Camelot
      this._portalX = 0;
      this._portalZ = gridD / 2 - 5;
      this._portalActive = true;
      this._state.vendors = VENDOR_DEFS.map((vd) => ({
        id: this._genId(),
        type: vd.type,
        name: vd.name,
        x: vd.x,
        z: vd.z,
        inventory: generateVendorInventory(vd.type, this._state.player.level),
        icon: vd.icon,
      }));
      if ((this._renderer as any).syncVendors) {
        (this._renderer as any).syncVendors(
          this._state.vendors.map((v) => ({ x: v.x, z: v.z, type: v.type, name: v.name, icon: v.icon }))
        );
      }
      // Generate bounties in Camelot
      this._generateBounties();
      // Spawn townfolk wandering around Camelot
      this._spawnCamelotTownfolk();
    } else {
      this._state.vendors = [];
      this._state.townfolk = [];
      // Place town portal at map center
      this._portalX = gridW / 2;
      this._portalZ = gridD / 2;
      this._portalActive = true;

      this._state.dungeonLayout = null;

      this._spawnInitialEnemies();
      this._spawnInitialChests();
      this._generateBounties();
      this._spawnBountyTargets();
    }

    this._renderer.renderDungeonLayout(null);

    this._state.phase = DiabloPhase.PLAYING;
    this._state.player.invulnTimer = Math.max(this._state.player.invulnTimer, 3.0); // spawn protection
    setTimeout(() => this._renderer.fadeOverlay(0), 100); // fade back in
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();
    this._initAchievements();
    this._generateDailyChallenges();
    this._mapDeathCount = 0;

    if (!this._firstPlayHelpShown) {
      this._firstPlayHelpShown = true;
      this._addFloatingText(this._state.player.x, this._state.player.y + 2, this._state.player.z, 'Press H for controls', '#aaaaaa');
    }

    // Main quest popup on map entry
    if (mapId === DiabloMapId.CAMELOT) {
      this._showQuestPopup(
        "\u2694\uFE0F The Fall of Excalibur",
        CAMELOT_FIRST_VISIT_TEXT.join("<br>"),
        null,
        8000,
      );
    } else {
      const questInfo = EXCALIBUR_QUEST_INFO[mapId];
      if (questInfo) {
        this._showQuestPopup(
          `\u2694\uFE0F ${questInfo.fragment}`,
          questInfo.hint,
          questInfo.lore,
          7000,
        );
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  INVENTORY SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showInventory(): void {
    screenShowInventory(this._screenCtx());
  }

  private _showItemTooltip(ev: MouseEvent, item: DiabloItem | null): void { screenShowItemTooltip(this._screenCtx(), ev, item); }

  private _hideItemTooltip(): void {
    const tooltip = this._menuEl.querySelector("#inv-tooltip") as HTMLDivElement;
    if (tooltip) tooltip.style.display = "none";
  }

  // ──────────────────────────────────────────────────────────────
  //  PAUSE MENU
  // ──────────────────────────────────────────────────────────────
  private _showPauseMenu(): void { screenShowPauseMenu(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  CONTROLS SCREEN
  // ──────────────────────────────────────────────────────────────
  private _backToMenu(): void {
    if (this._phaseBeforeOverlay === DiabloPhase.CLASS_SELECT) {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    } else {
      this._showPauseMenu();
    }
  }

  private _closeOverlay(): void {
    this._hideItemTooltip();
    if (this._phaseBeforeOverlay === DiabloPhase.CLASS_SELECT) {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    } else {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = "";
      if (this._firstPerson) {
        try { this._renderer.canvas.requestPointerLock()?.catch?.(() => {}); } catch (_) {}
      }
    }
  }

  private _showControls(): void { screenShowControls(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  COLLECTION / CODEX MENU
  // ──────────────────────────────────────────────────────────────
  private _showCollection(): void {
    screenShowCollection(this._screenCtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  SKILL SWAP MENU
  // ──────────────────────────────────────────────────────────────
  private _showSkillSwapMenu(): void {
    screenShowSkillSwapMenu(this._screenCtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Open nearest chest (F key)
  // ──────────────────────────────────────────────────────────────
  private _openNearestChest(): void {
    const p = this._state.player;
    let nearest: DiabloTreasureChest | null = null;
    let nearestDist = 3;
    for (const chest of this._state.treasureChests) {
      if (chest.opened) continue;
      const d = this._dist(p.x, p.z, chest.x, chest.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = chest;
      }
    }
    if (nearest) {
      this._openChest(nearest.id);
    }
  }


  // ──────────────────────────────────────────────────────────────
  //  STATISTICS PANEL
  // ──────────────────────────────────────────────────────────────
  private _showStatsPanel(): void {
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.PAUSED;
    this._menuEl.innerHTML = '';
    const s = this._state.player.stats;
    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,15,10,0.95);border:2px solid #8b6914;border-radius:8px;padding:20px;color:#fff;font-family:Georgia,serif;min-width:400px;max-height:80vh;overflow-y:auto;z-index:100;';

    const hrs = Math.floor(s.timePlayed / 3600);
    const mins = Math.floor((s.timePlayed % 3600) / 60);

    panel.innerHTML = `
      <h2 style="text-align:center;color:#ffd700;margin:0 0 15px;">Statistics</h2>
      <div style="font-size:13px;line-height:1.8;">
        <div style="color:#b8860b;font-weight:bold;margin-top:8px;">Combat</div>
        <div>Total Kills: <span style="color:#ffd700;">${s.totalKills.toLocaleString()}</span></div>
        <div>Boss Kills: <span style="color:#ffd700;">${s.totalBossKills}</span></div>
        <div>Deaths: <span style="color:#ff4444;">${s.totalDeaths}</span></div>
        <div>Total Damage Dealt: <span style="color:#ffd700;">${Math.floor(s.totalDamageDealt).toLocaleString()}</span></div>
        <div>Total Damage Taken: <span style="color:#ff4444;">${Math.floor(s.totalDamageTaken).toLocaleString()}</span></div>
        <div>Highest Crit: <span style="color:#ff8800;">${Math.floor(s.highestCrit).toLocaleString()}</span></div>
        <div>Crits Landed: <span style="color:#ffd700;">${s.totalCritsLanded.toLocaleString()}</span></div>
        <div>Dodges: <span style="color:#44ffff;">${s.totalDodges}</span></div>
        <div>Longest Kill Streak: <span style="color:#ffd700;">${s.longestKillStreak}</span></div>

        <div style="color:#b8860b;font-weight:bold;margin-top:8px;">Economy</div>
        <div>Gold Earned: <span style="color:#ffd700;">${s.totalGoldEarned.toLocaleString()}</span></div>
        <div>Gold Spent: <span style="color:#ffd700;">${s.totalGoldSpent.toLocaleString()}</span></div>
        <div>Items Found: <span style="color:#ffd700;">${s.totalItemsFound}</span></div>
        <div>Legendaries Found: <span style="color:#ff8800;">${s.totalLegendariesFound}</span></div>

        <div style="color:#b8860b;font-weight:bold;margin-top:8px;">Progress</div>
        <div>Quests Completed: <span style="color:#ffd700;">${s.totalQuestsCompleted}</span></div>
        <div>Maps Cleared: <span style="color:#ffd700;">${s.totalMapsCleared}</span></div>
        <div>Potions Used: <span style="color:#44ff44;">${s.totalPotionsUsed}</span></div>
        <div>Time Played: <span style="color:#ffd700;">${hrs}h ${mins}m</span></div>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'display:block;margin:15px auto 0;padding:8px 20px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => { this._state.phase = this._phaseBeforeOverlay; this._menuEl.innerHTML = ''; });
    panel.appendChild(closeBtn);
    this._menuEl.appendChild(panel);
  }
  // ──────────────────────────────────────────────────────────────
  //  CHARACTER OVERVIEW SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showCharacterOverview(): void {
    screenShowCharacterOverview(this._screenCtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME OVER SCREEN (kept for potential future use)
  // ──────────────────────────────────────────────────────────────
  // @ts-ignore unused-method kept intentionally
  private _showGameOver(): void { screenShowGameOver(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  VICTORY SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showVictory(): void { screenShowVictory(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  BUILD HUD
  // ──────────────────────────────────────────────────────────────
  private _buildHUD(): void {
    this._hudRefs = buildHUD(this._hud);
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE HUD
  // ──────────────────────────────────────────────────────────────
  private _updateHUD(): void {
    const ctx: HUDUpdateContext = {
      state: this._state,
      firstPerson: this._firstPerson,
      portalActive: this._portalActive,
      portalX: this._portalX,
      portalZ: this._portalZ,
      combatLog: this._combatLog,
      currentDps: this._currentDps,
      setCurrentDps: (v) => { this._currentDps = v; },
      updateVignette: (r) => this._renderer.updateVignette(r),
      dist: (x1, z1, x2, z2) => this._dist(x1, z1, x2, z2),
      updateMinimap: () => this._updateMinimap(),
      updateFullmap: () => this._updateFullmap(),
      updateQuestTracker: () => this._updateQuestTracker(),
      hudEl: this._hud,
    };
    updateHUD(this._hudRefs, this._hudState, ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  MULTIPLAYER INTEGRATION
  // ──────────────────────────────────────────────────────────────
  private _initMultiplayer(): void {
    this._network.onPlayerJoin = (player) => {
      this._state.multiplayer.remotePlayers.push(player);
      this._addFloatingText(this._state.player.x, this._state.player.y + 3, this._state.player.z,
        `${player.name} joined!`, '#44ff44');
    };

    this._network.onPlayerLeave = (playerId) => {
      this._state.multiplayer.remotePlayers = this._state.multiplayer.remotePlayers.filter(p => p.id !== playerId);
      this._addFloatingText(this._state.player.x, this._state.player.y + 3, this._state.player.z,
        'Player left', '#ff4444');
    };

    this._network.onPlayerUpdate = (player) => {
      const idx = this._state.multiplayer.remotePlayers.findIndex(p => p.id === player.id);
      if (idx >= 0) {
        this._state.multiplayer.remotePlayers[idx] = player;
      } else {
        this._state.multiplayer.remotePlayers.push(player);
      }
    };

    this._network.onEnemyDamage = (enemyId, damage, _sourceId) => {
      const enemy = this._state.enemies.find(e => e.id === enemyId);
      if (enemy) {
        enemy.hp -= damage;
        this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(damage)}`, '#88aaff');
      }
    };

    this._network.onEnemyKill = (enemyId, _killerId) => {
      const enemy = this._state.enemies.find(e => e.id === enemyId);
      if (enemy && enemy.state !== EnemyState.DYING && enemy.state !== EnemyState.DEAD) {
        enemy.hp = 0;
        enemy.state = EnemyState.DYING;
      }
    };

    this._network.onLootPickup = (lootId, _playerId) => {
      this._state.loot = this._state.loot.filter(l => l.id !== lootId);
    };

    this._network.onChatMessage = (playerId, message) => {
      const player = this._state.multiplayer.remotePlayers.find(p => p.id === playerId);
      const name = player?.name || 'Unknown';
      this._state.multiplayer.chatMessages.push({ name, message, time: Date.now() });
      // Keep last 50 messages
      if (this._state.multiplayer.chatMessages.length > 50) {
        this._state.multiplayer.chatMessages.shift();
      }
    };
  }

  private _updateMultiplayer(dt: number): void {
    if (this._state.multiplayer.state === MultiplayerState.DISCONNECTED) return;

    this._network.update(dt);
    this._state.multiplayer.ping = this._network.ping;

    // Send player state at ~20Hz
    this._networkUpdateTimer += dt;
    if (this._networkUpdateTimer >= 0.05) {
      this._networkUpdateTimer = 0;
      const p = this._state.player;
      this._network.sendPlayerUpdate({
        id: this._state.multiplayer.playerId,
        name: this._state.multiplayer.playerName,
        class: p.class,
        level: p.level,
        x: p.x, y: p.y, z: p.z,
        angle: p.angle,
        hp: p.hp,
        maxHp: p.maxHp,
        isAttacking: p.isAttacking,
        activeSkillId: p.activeSkillId,
        isDodging: p.isDodging,
      });
    }

    // Sync remote players to state
    this._state.multiplayer.remotePlayers = this._network.remotePlayers;
  }

  connectMultiplayer(serverUrl: string, playerName: string): void {
    this._state.multiplayer.playerName = playerName;
    this._state.multiplayer.state = MultiplayerState.CONNECTING;
    this._network.connect(serverUrl, playerName);
    this._state.multiplayer.playerId = this._network.playerId;
    this._initMultiplayer();
  }

  disconnectMultiplayer(): void {
    this._network.disconnect();
    this._state.multiplayer.state = MultiplayerState.DISCONNECTED;
    this._state.multiplayer.remotePlayers = [];
    this._state.multiplayer.lobby = null;
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME LOOP
  // ──────────────────────────────────────────────────────────────
  private _gameLoop = (ts: number): void => {
    const dt = Math.min((ts - this._lastTime) / 1000, 0.1);
    // Hit freeze: skip simulation frames
    if (this._hitFreezeTimer > 0) {
      this._hitFreezeTimer -= dt;
      this._lastTime = ts;
      this._renderer.update(this._state, 0);
      this._rafId = requestAnimationFrame(this._gameLoop);
      return;
    }
    // Combo timer decay
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        if (this._comboCount >= 5) {
          this._addFloatingText(this._state.player.x, this._state.player.y + 3, this._state.player.z,
            `${this._comboCount}x COMBO ENDED`, '#888888');
        }
        this._comboCount = 0;
        this._comboMultiplier = 1.0;
      }
    }

    // Slow motion scaling
    const timeScale = this._slowMotionTimer > 0 ? this._slowMotionScale : 1;
    if (this._slowMotionTimer > 0) this._slowMotionTimer -= dt;
    const scaledDt = dt * timeScale;
    this._lastTime = ts;

    if (this._state.phase === DiabloPhase.PLAYING) {
      if (this._isDead) {
        this._updateDeathRespawn(scaledDt);
      } else {
        this._processInput(scaledDt);
        this._updatePlayer(scaledDt);
        this._updateEnemies(scaledDt);
        this._updateBossAbilities(scaledDt);
        this._updateCombat(scaledDt);
        this._updateProjectiles(scaledDt);
        this._updateAOE(scaledDt);
        this._updateLoot(scaledDt);
        this._updateSpawning(scaledDt);
        this._updateStatusEffects(scaledDt);
        this._updateFloatingText(scaledDt);
        this._checkLoreDiscovery();
        this._updateTownfolk(scaledDt);
        this._updatePets(scaledDt);
        this._updateCraftingQueue(scaledDt);
        this._updateGreaterRift(scaledDt);
        this._updatePetBuffs(scaledDt);
        this._updateMultiplayer(scaledDt);
        this._checkMapClear();
        this._updateWeatherEffects(scaledDt);
        this._revealAroundPlayer(this._state.player.x, this._state.player.z);
        // Stat tracking: time played
        this._state.player.stats.timePlayed += scaledDt;
        this._state.player.stats.classPlayTime[this._state.player.class] = (this._state.player.stats.classPlayTime[this._state.player.class] || 0) + scaledDt;

        // Quest popup fade
        if (this._questPopupTimer > 0) {
          this._questPopupTimer -= dt * 1000;
          if (this._questPopupTimer <= 1500) {
            this._hudRefs.questPopup.style.opacity = String(Math.max(0, this._questPopupTimer / 1500));
          }
          if (this._questPopupTimer <= 0) {
            this._hudRefs.questPopup.style.display = "none";
            this._questPopupTimer = 0;
          }
        }
      }
      this._updateHUD();
      this._processAchievementNotifications();
    }

    this._renderer.setTargetEnemy(this._targetEnemyId);
    this._renderer.update(this._state, dt);
    this._rafId = requestAnimationFrame(this._gameLoop);
  };

  // ──────────────────────────────────────────────────────────────
  //  A* PATHFINDING
  // ──────────────────────────────────────────────────────────────
  private _findPath(startX: number, startZ: number, endX: number, endZ: number): { x: number; z: number }[] {
    const GRID_SIZE = 2; // world units per grid cell
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;

    // Convert world coords to grid coords
    const toGrid = (wx: number, wz: number) => ({
      gx: Math.floor((wx + halfW) / GRID_SIZE),
      gz: Math.floor((wz + halfD) / GRID_SIZE),
    });
    const toWorld = (gx: number, gz: number) => ({
      x: gx * GRID_SIZE - halfW + GRID_SIZE / 2,
      z: gz * GRID_SIZE - halfD + GRID_SIZE / 2,
    });

    const gridW = Math.ceil(mapCfg.width / GRID_SIZE);
    const gridH = Math.ceil(((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / GRID_SIZE);

    const start = toGrid(startX, startZ);
    const end = toGrid(endX, endZ);

    // Clamp to grid bounds
    start.gx = Math.max(0, Math.min(gridW - 1, start.gx));
    start.gz = Math.max(0, Math.min(gridH - 1, start.gz));
    end.gx = Math.max(0, Math.min(gridW - 1, end.gx));
    end.gz = Math.max(0, Math.min(gridH - 1, end.gz));

    // Check if cell is blocked by building colliders
    const isBlocked = (gx: number, gz: number): boolean => {
      const w = toWorld(gx, gz);
      for (const [cx, cz, chw, chd] of this._renderer.buildingColliders) {
        if (Math.abs(w.x - cx) < chw + 0.5 && Math.abs(w.z - cz) < chd + 0.5) {
          return true;
        }
      }
      return false;
    };

    // A* implementation
    const key = (gx: number, gz: number) => `${gx},${gz}`;
    const heuristic = (ax: number, az: number, bx: number, bz: number) =>
      Math.abs(ax - bx) + Math.abs(az - bz);

    const openSet = new Map<string, { gx: number; gz: number; f: number; g: number }>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();

    const startKey = key(start.gx, start.gz);
    const endKey = key(end.gx, end.gz);

    gScore.set(startKey, 0);
    openSet.set(startKey, {
      gx: start.gx, gz: start.gz,
      f: heuristic(start.gx, start.gz, end.gx, end.gz),
      g: 0
    });

    const dirs = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    const dirCosts = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];

    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      // Find node with lowest f score
      let bestKey = '';
      let bestF = Infinity;
      for (const [k, node] of openSet) {
        if (node.f < bestF) {
          bestF = node.f;
          bestKey = k;
        }
      }

      const current = openSet.get(bestKey)!;
      openSet.delete(bestKey);

      if (bestKey === endKey) {
        // Reconstruct path
        const path: { x: number; z: number }[] = [];
        let ck = endKey;
        while (ck && ck !== startKey) {
          const [gxStr, gzStr] = ck.split(',');
          const w = toWorld(parseInt(gxStr), parseInt(gzStr));
          path.unshift(w);
          ck = cameFrom.get(ck) || '';
        }
        return path;
      }

      for (let d = 0; d < dirs.length; d++) {
        const ngx = current.gx + dirs[d][0];
        const ngz = current.gz + dirs[d][1];

        if (ngx < 0 || ngx >= gridW || ngz < 0 || ngz >= gridH) continue;
        if (isBlocked(ngx, ngz)) continue;

        // For diagonal movement, check that both adjacent cells are clear
        if (d >= 4) {
          if (isBlocked(current.gx + dirs[d][0], current.gz) ||
              isBlocked(current.gx, current.gz + dirs[d][1])) continue;
        }

        const nKey = key(ngx, ngz);
        const tentativeG = current.g + dirCosts[d];

        if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, bestKey);
          gScore.set(nKey, tentativeG);
          const f = tentativeG + heuristic(ngx, ngz, end.gx, end.gz);
          openSet.set(nKey, { gx: ngx, gz: ngz, f, g: tentativeG });
        }
      }
    }

    // No path found - return direct line
    return [{ x: endX, z: endZ }];
  }

  // ──────────────────────────────────────────────────────────────
  //  PROCESS INPUT
  // ──────────────────────────────────────────────────────────────
  private _processInput(dt: number): void {
    const p = this._state.player;

    if (this._firstPerson && this._pointerLocked) {
      // FPS mouse look
      const sens = 0.002;
      this._fpYaw -= this._mouseDX * sens;
      this._fpPitch = Math.max(-Math.PI / 2 * 0.95, Math.min(Math.PI / 2 * 0.95, this._fpPitch - this._mouseDY * sens));
      this._mouseDX = 0;
      this._mouseDY = 0;

      p.angle = this._fpYaw;

      // Continuous skill/attack while holding mouse in FPS
      if (this._mouseDown && p.skills.length > 0) {
        this._activateSkill(0);
      }

      // WASD relative to facing direction
      let forward = 0;
      let strafe = 0;
      if (this._keys.has(this._keyBindings.moveUp) || this._keys.has("ArrowUp")) forward = 1;
      if (this._keys.has(this._keyBindings.moveDown) || this._keys.has("ArrowDown")) forward = -1;
      if (this._keys.has(this._keyBindings.moveLeft) || this._keys.has("ArrowLeft")) strafe = -1;
      if (this._keys.has(this._keyBindings.moveRight) || this._keys.has("ArrowRight")) strafe = 1;

      const len = Math.sqrt(forward * forward + strafe * strafe);
      if (len > 0) {
        forward /= len;
        strafe /= len;
      }

      const sinY = Math.sin(this._fpYaw);
      const cosY = Math.cos(this._fpYaw);
      const speed = p.moveSpeed;
      p.x += (-sinY * forward + cosY * strafe) * speed * dt;
      p.z += (-cosY * forward - sinY * strafe) * speed * dt;

      // Pass pitch to renderer
      this._renderer.fpPitch = this._fpPitch;
      this._renderer.fpYaw = this._fpYaw;
    } else {
      let dx = 0;
      let dz = 0;
      if (this._keys.has(this._keyBindings.moveUp) || this._keys.has("ArrowUp")) dz -= 1;
      if (this._keys.has(this._keyBindings.moveDown) || this._keys.has("ArrowDown")) dz += 1;
      if (this._keys.has(this._keyBindings.moveLeft) || this._keys.has("ArrowLeft")) dx -= 1;
      if (this._keys.has(this._keyBindings.moveRight) || this._keys.has("ArrowRight")) dx += 1;

      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
        // WASD movement cancels click-to-move
        p.isMovingToTarget = false;
        p.moveTarget = null;
        p.movePath = [];
      }

      // Click-to-move path following
      if (p.isMovingToTarget && p.movePath.length > 0 && len === 0) {
        const waypoint = p.movePath[p.movePathIndex];
        if (waypoint) {
          const wx = waypoint.x - p.x;
          const wz = waypoint.z - p.z;
          const wDist = Math.sqrt(wx * wx + wz * wz);
          if (wDist < 0.5) {
            p.movePathIndex++;
            if (p.movePathIndex >= p.movePath.length) {
              p.isMovingToTarget = false;
              p.moveTarget = null;
              p.movePath = [];
            }
          } else {
            dx = wx / wDist;
            dz = wz / wDist;
            p.angle = Math.atan2(dx, dz);
          }
        }
      }

      const speed = p.moveSpeed;
      p.x += dx * speed * dt;
      p.z += dz * speed * dt;

      // Face mouse direction (only when not following a path)
      if (!p.isMovingToTarget) {
        const worldMouse = this._getMouseWorldPos();
        p.angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
      }
    }

    // Clamp to map bounds
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;
    p.x = Math.max(-halfW, Math.min(halfW, p.x));
    p.z = Math.max(-halfD, Math.min(halfD, p.z));

    // Building collision — push player out of buildings
    const playerR = 0.4;
    for (const [cx, cz, chw, chd] of this._renderer.buildingColliders) {
      const overlapX = (chw + playerR) - Math.abs(p.x - cx);
      const overlapZ = (chd + playerR) - Math.abs(p.z - cz);
      if (overlapX > 0 && overlapZ > 0) {
        // Push out along the axis of least penetration
        if (overlapX < overlapZ) {
          p.x += p.x < cx ? -overlapX : overlapX;
        } else {
          p.z += p.z < cz ? -overlapZ : overlapZ;
        }
      }
    }

    p.y = getTerrainHeight(p.x, p.z);

    // Update camera target to follow player
    this._state.camera.targetX = p.x;
    this._state.camera.targetZ = p.z;
    this._state.camera.x += (p.x + Math.sin(this._state.camera.angle) * this._state.camera.distance - this._state.camera.x) * 3 * dt;
    this._state.camera.z += (p.z + Math.cos(this._state.camera.angle) * this._state.camera.distance - this._state.camera.z) * 3 * dt;

    // Dodge roll (spacebar)
    if (this._keys.has("Space") && p.dodgeCooldown <= 0 && !p.isDodging) {
      p.isDodging = true;
      p.stats.totalDodges++;
      p.dodgeTimer = 0.3; // 300ms roll duration
      p.dodgeCooldown = 1.5; // 1.5s cooldown
      p.invulnTimer = 0.3; // i-frames during roll
      this._playSound('dodge');
      this._incrementAchievement('untouchable');
      // Roll in movement direction or facing direction
      let dx = 0, dz = 0;
      if (this._keys.has(this._keyBindings.moveUp) || this._keys.has("ArrowUp")) dz -= 1;
      if (this._keys.has(this._keyBindings.moveDown) || this._keys.has("ArrowDown")) dz += 1;
      if (this._keys.has(this._keyBindings.moveLeft) || this._keys.has("ArrowLeft")) dx -= 1;
      if (this._keys.has(this._keyBindings.moveRight) || this._keys.has("ArrowRight")) dx += 1;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) { dx /= len; dz /= len; }
      else { dx = Math.sin(p.angle); dz = Math.cos(p.angle); }
      p.dodgeVx = dx * p.moveSpeed * 3; // 3x speed during roll
      p.dodgeVz = dz * p.moveSpeed * 3;
      this._renderer.spawnParticles(ParticleType.DUST, p.x, p.y, p.z, 8, this._state.particles);
      this._renderer.showDodgeGhost(p.x, p.y, p.z);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE PLAYER
  // ──────────────────────────────────────────────────────────────
  private _updatePlayer(dt: number): void {
    const p = this._state.player;

    // Dodge roll movement
    if (p.dodgeCooldown > 0) p.dodgeCooldown -= dt;
    if (p.isDodging) {
      p.dodgeTimer -= dt;
      p.x += p.dodgeVx * dt;
      p.z += p.dodgeVz * dt;
      if (p.dodgeTimer <= 0) {
        p.isDodging = false;
        p.dodgeVx = 0;
        p.dodgeVz = 0;
      }
      return; // Skip other updates during dodge
    }

    // Process queued skill
    if (this._queuedSkillIdx >= 0) {
      const qIdx = this._queuedSkillIdx;
      this._queuedSkillIdx = -1;
      this._activateSkill(qIdx);
    }

    // Mana regen
    const manaRegenBase = 1.0 + p.intelligence * 0.05;
    p.mana = Math.min(p.maxMana, p.mana + manaRegenBase * dt);

    // Cooldowns
    for (const [skillId, cd] of p.skillCooldowns) {
      if (cd > 0) {
        p.skillCooldowns.set(skillId, Math.max(0, cd - dt));
      }
    }

    // Attack timer
    if (p.attackTimer > 0) {
      p.attackTimer -= dt;
    }

    // Invuln timer
    if (p.invulnTimer > 0) {
      p.invulnTimer -= dt;
    }

    // Skill anim timer
    if (p.activeSkillAnimTimer > 0) {
      p.activeSkillAnimTimer -= dt;
      if (p.activeSkillAnimTimer <= 0) {
        p.activeSkillId = null;
      }
    }

    // Potion cooldown (ad1a2850)
    if (p.potionCooldown > 0) {
      p.potionCooldown = Math.max(0, p.potionCooldown - dt);
    }
    // Potion buff durations (ad1a2850)
    for (let i = p.activePotionBuffs.length - 1; i >= 0; i--) {
      p.activePotionBuffs[i].remaining -= dt;
      if (p.activePotionBuffs[i].remaining <= 0) {
        p.activePotionBuffs.splice(i, 1);
        this._statsDirty = true;
        this._recalculatePlayerStats();
      }
    }
    // Mana regen from talents (ad1a2850)
    const talentManaRegen = this._getTalentBonuses()[TalentEffectType.MANA_REGEN] || 0;
    if (talentManaRegen > 0) {
      p.mana = Math.min(p.maxMana, p.mana + talentManaRegen * dt);
    }

    // Level up check
    while (p.level < XP_TABLE.length - 1 && p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = p.level < XP_TABLE.length ? XP_TABLE[p.level] : XP_TABLE[XP_TABLE.length - 1] * 1.5;

      // Stat increases
      p.strength += 3;
      p.dexterity += 3;
      p.intelligence += 3;
      p.vitality += 4;
      p.maxHp += Math.floor(p.vitality * 2);
      p.maxMana += Math.floor(p.intelligence * 0.8);
      p.hp = p.maxHp;
      p.mana = p.maxMana;
      p.talentPoints += 1;

      this._addFloatingText(p.x, p.y + 3, p.z, "LEVEL UP!", "#ffd700");
      this._updateAchievement('level_cap', p.level);
      this._playSound('levelup');
      this._renderer.spawnParticles(ParticleType.LEVEL_UP, p.x, p.y + 0.5, p.z, 20 + Math.floor(Math.random() * 11), this._state.particles);
      this._renderer.shakeCamera(0.2, 0.3);
      this._slowMotionTimer = 0.5;
      this._slowMotionScale = 0.5;
      this._statsDirty = true;
      this._recalculatePlayerStats();

      // Unlock base class skills progressively at levels 2-5
      const BASE_SKILL_UNLOCK: Record<string, SkillId[]> = {
        [DiabloClass.WARRIOR]: [SkillId.CLEAVE, SkillId.SHIELD_BASH, SkillId.WHIRLWIND, SkillId.BATTLE_CRY, SkillId.GROUND_SLAM, SkillId.BLADE_FURY],
        [DiabloClass.MAGE]: [SkillId.FIREBALL, SkillId.ICE_NOVA, SkillId.LIGHTNING_BOLT, SkillId.METEOR, SkillId.ARCANE_SHIELD, SkillId.CHAIN_LIGHTNING],
        [DiabloClass.RANGER]: [SkillId.MULTI_SHOT, SkillId.POISON_ARROW, SkillId.EVASIVE_ROLL, SkillId.EXPLOSIVE_TRAP, SkillId.RAIN_OF_ARROWS, SkillId.PIERCING_SHOT],
      };
      const baseSkills = BASE_SKILL_UNLOCK[p.class] || [];
      // Skills unlock at: lv1=2 skills, lv2=3, lv3=4, lv4=5, lv5=6
      const unlockedCount = Math.min(baseSkills.length, 2 + (p.level - 1));
      for (let i = 0; i < unlockedCount; i++) {
        if (!p.skills.includes(baseSkills[i])) {
          p.skills.push(baseSkills[i]);
          const def = SKILL_DEFS[baseSkills[i]];
          this._addFloatingText(p.x, p.y + 4, p.z, `NEW SKILL: ${def.name}!`, "#44ffff");
        }
      }
      // Also check for bonus skill unlocks (every 3 levels)
      const unlockList = UNLOCKABLE_SKILLS[p.class];
      for (const entry of unlockList) {
        if (p.level >= entry.level && !p.unlockedSkills.includes(entry.skillId)) {
          p.unlockedSkills.push(entry.skillId);
          const def = SKILL_DEFS[entry.skillId];
          this._addFloatingText(p.x, p.y + 4, p.z, `NEW SKILL: ${def.name}!`, "#44ffff");
        }
      }

      // Unlock runes based on level
      for (const [skillIdStr, runes] of Object.entries(SKILL_RUNES)) {
        if (!runes) continue;
        for (const rune of runes) {
          const runeKey = `${skillIdStr}_${rune.runeType}`;
          if (p.level >= rune.unlocksAtLevel && !p.unlockedRunes.includes(runeKey)) {
            p.unlockedRunes.push(runeKey);
            this._addFloatingText(p.x, p.y + 4.5, p.z, `RUNE: ${rune.name}!`, '#aa44ff');
          }
        }
      }
    }

    // Paragon XP (after max normal level or always accumulate)
    if (p.level >= 100) {
      p.paragonXp += Math.floor(p.xp);
      p.xp = 0;
      while (p.paragonXp >= p.paragonXpToNext) {
        p.paragonXp -= p.paragonXpToNext;
        p.paragonLevel++;
        this._updateAchievement('paragon_10', p.paragonLevel);
        this._updateAchievement('paragon_50', p.paragonLevel);
        p.paragonXpToNext = PARAGON_XP_TABLE[Math.min(p.paragonLevel, PARAGON_XP_TABLE.length - 1)];
        // Small stat bonus per paragon level
        p.paragonBonuses['bonusDamage'] = (p.paragonBonuses['bonusDamage'] || 0) + 1;
        p.paragonBonuses['bonusHp'] = (p.paragonBonuses['bonusHp'] || 0) + 5;
        p.paragonBonuses['bonusMana'] = (p.paragonBonuses['bonusMana'] || 0) + 2;
        this._addFloatingText(p.x, p.y + 3, p.z, `PARAGON ${p.paragonLevel}!`, '#ffd700');
        this._renderer.spawnParticles(ParticleType.LEVEL_UP, p.x, p.y + 1, p.z, 30, this._state.particles);
      }
    }

    // Increment global time
    this._state.time += dt;
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE ENEMIES (AI STATE MACHINE)
  // ──────────────────────────────────────────────────────────────
  private _updateEnemies(dt: number): void {
    const p = this._state.player;
    const toRemove = new Set<string>();

    for (const enemy of this._state.enemies) {
      // Stagger freeze
      if (enemy.staggerTimer && enemy.staggerTimer > 0) {
        enemy.staggerTimer -= dt;
        continue;
      }

      const dist = this._dist(enemy.x, enemy.z, p.x, p.z);
      const effectiveSpeed = this._getEnemyEffectiveSpeed(enemy);

      // Check for stun
      const isStunned = enemy.statusEffects.some((e) => e.effect === StatusEffect.STUNNED);
      const isFrozen = enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN);

      let effectiveAggroRange = this._state.weather === Weather.FOGGY ? enemy.aggroRange * 0.8 : enemy.aggroRange;
      // Night vision reduction
      let nightMultiplier = 1.0;
      if (this._state.timeOfDay === TimeOfDay.NIGHT) {
        nightMultiplier = (p.lanternOn && p.equipment.lantern) ? 0.8 : 0.4;
      } else if (this._state.timeOfDay === TimeOfDay.DUSK || this._state.timeOfDay === TimeOfDay.DAWN) {
        nightMultiplier = 0.9;
      }
      effectiveAggroRange *= nightMultiplier;

      switch (enemy.state) {
        case EnemyState.IDLE: {
          enemy.stateTimer += dt;
          if (dist <= effectiveAggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          } else if (enemy.stateTimer > 3 && Math.random() < 0.02) {
            // Random patrol
            enemy.state = EnemyState.PATROL;
            enemy.stateTimer = 0;
            enemy.patrolTarget = {
              x: enemy.x + (Math.random() * 10 - 5),
              y: 0,
              z: enemy.z + (Math.random() * 10 - 5),
            };
          }
          break;
        }
        case EnemyState.PATROL: {
          if (isStunned || isFrozen) break;
          enemy.stateTimer += dt;
          if (enemy.patrolTarget) {
            const pdist = this._dist(enemy.x, enemy.z, enemy.patrolTarget.x, enemy.patrolTarget.z);
            if (pdist < 1 || enemy.stateTimer > 5) {
              enemy.state = EnemyState.IDLE;
              enemy.stateTimer = 0;
              enemy.patrolTarget = null;
            } else {
              const dx = enemy.patrolTarget.x - enemy.x;
              const dz = enemy.patrolTarget.z - enemy.z;
              const pLen = Math.sqrt(dx * dx + dz * dz);
              if (pLen > 0) {
                enemy.x += (dx / pLen) * effectiveSpeed * 0.5 * dt;
                enemy.z += (dz / pLen) * effectiveSpeed * 0.5 * dt;
                enemy.angle = Math.atan2(dx, dz);
              }
            }
          }
          // Aggro check
          if (dist <= effectiveAggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.CHASE: {
          if (isStunned || isFrozen) break;
          const behavior = enemy.behavior || EnemyBehavior.MELEE_BASIC;

          if (behavior === EnemyBehavior.RANGED) {
            const preferredDist = 10;
            const tooClose = 4;
            if (enemy.rangedCooldown === undefined) enemy.rangedCooldown = 0;
            enemy.rangedCooldown = Math.max(0, (enemy.rangedCooldown || 0) - dt);
            if (dist < tooClose) {
              const dx = enemy.x - p.x;
              const dz = enemy.z - p.z;
              const bLen = Math.sqrt(dx * dx + dz * dz);
              if (bLen > 0) { enemy.x += (dx / bLen) * effectiveSpeed * dt; enemy.z += (dz / bLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
            } else if (dist > preferredDist + 2) {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            } else {
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
              if (enemy.rangedCooldown <= 0) { this._enemyFireProjectile(enemy); enemy.rangedCooldown = 2.0; }
            }
            if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
          } else if (behavior === EnemyBehavior.HEALER) {
            let healTarget: DiabloEnemy | null = null;
            let healDist = 8;
            for (const ally of this._state.enemies) {
              if (ally.id === enemy.id) continue;
              if (ally.state === EnemyState.DYING || ally.state === EnemyState.DEAD) continue;
              if (ally.hp >= ally.maxHp) continue;
              const ad = this._dist(enemy.x, enemy.z, ally.x, ally.z);
              if (ad < healDist) { healDist = ad; healTarget = ally; }
            }
            if (healTarget && dist > 3) {
              const dx = healTarget.x - enemy.x; const dz = healTarget.z - enemy.z;
              const hLen = Math.sqrt(dx * dx + dz * dz);
              if (hLen > 2) { enemy.x += (dx / hLen) * effectiveSpeed * 0.8 * dt; enemy.z += (dz / hLen) * effectiveSpeed * 0.8 * dt; }
              enemy.angle = Math.atan2(dx, dz);
              healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healTarget.maxHp * 0.05 * dt);
              enemy.healTarget = healTarget.id;
            } else {
              enemy.healTarget = null;
              if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
              else {
                const dx = p.x - enemy.x; const dz = p.z - enemy.z;
                const cLen = Math.sqrt(dx * dx + dz * dz);
                if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
                enemy.angle = Math.atan2(dx, dz);
              }
            }
            if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
          } else if (behavior === EnemyBehavior.SHIELDED) {
            if (enemy.shieldCooldown === undefined) enemy.shieldCooldown = 5;
            if (enemy.shieldActive === undefined) enemy.shieldActive = false;
            enemy.shieldCooldown = Math.max(0, (enemy.shieldCooldown || 0) - dt);
            if (enemy.shieldActive) {
              enemy.stateTimer += dt;
              if (enemy.stateTimer > 2) { enemy.shieldActive = false; enemy.shieldCooldown = 5; enemy.stateTimer = 0; }
            } else if (enemy.shieldCooldown <= 0) { enemy.shieldActive = true; enemy.stateTimer = 0; }
            if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
            else {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            }
          } else if (behavior === EnemyBehavior.FLANKER) {
            if (enemy.flankerAngle === undefined) { enemy.flankerAngle = p.angle + Math.PI * (0.5 + Math.random()); }
            const flankDist = 3;
            const targetX = p.x + Math.sin(enemy.flankerAngle) * flankDist;
            const targetZ = p.z + Math.cos(enemy.flankerAngle) * flankDist;
            const ftDist = this._dist(enemy.x, enemy.z, targetX, targetZ);
            if (ftDist < 1.5 && dist <= enemy.attackRange * 1.5) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; enemy.flankerAngle = undefined; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; enemy.flankerAngle = undefined; }
            else {
              const dx = targetX - enemy.x; const dz = targetZ - enemy.z;
              const fLen = Math.sqrt(dx * dx + dz * dz);
              if (fLen > 0) { enemy.x += (dx / fLen) * effectiveSpeed * 1.1 * dt; enemy.z += (dz / fLen) * effectiveSpeed * 1.1 * dt; }
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
            }
          } else {
            if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
            else {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            }
          }
          break;
        }
        case EnemyState.ATTACK: {
          if (isStunned || isFrozen) break;
          // Face player
          const adx = p.x - enemy.x;
          const adz = p.z - enemy.z;
          enemy.angle = Math.atan2(adx, adz);

          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0) {
            if (dist <= enemy.attackRange * 1.2) {
              // Deal damage to player
              if (p.invulnTimer <= 0) {
                let rawDmg = enemy.damage;
                // Check weakened
                const isWeakened = enemy.statusEffects.some((e) => e.effect === StatusEffect.WEAKENED);
                if (isWeakened) rawDmg *= 0.7;

                const mitigated = this._applyPlayerDefenses(rawDmg, enemy.damageType);
                p.hp -= mitigated;
                p.stats.totalDamageTaken += mitigated;
                this._recentDamage.push({
                  source: enemy.bossName || (enemy.type as string).replace(/_/g, ' '),
                  amount: mitigated,
                  type: enemy.damageType || 'PHYSICAL',
                  time: performance.now()
                });
                if (this._recentDamage.length > 10) this._recentDamage.shift();
                this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(mitigated)}`, "#ff4444");

                if (enemy.isBoss) {
                  this._renderer.shakeCamera(0.25, 0.3);
                }
                this._renderer.spawnParticles(ParticleType.BLOOD, p.x, p.y + 1, p.z, 3 + Math.floor(Math.random() * 3), this._state.particles);

                // Trigger legendary on_take_damage effects
                this._triggerLegendaryEffects('on_take_damage', { targetX: p.x, targetZ: p.z, damage: mitigated });

                if (p.hp <= 0) {
                  p.hp = 0;
                  this._lastDeathCause = enemy.bossName || (enemy.type as string).replace(/_/g, ' ');
                  this._triggerDeath();
                  return;
                }
              }
            }
            enemy.attackTimer = 1.5;
            if (dist > enemy.attackRange * 1.5) {
              enemy.state = EnemyState.CHASE;
              enemy.stateTimer = 0;
            }
          }
          break;
        }
        case EnemyState.HURT: {
          enemy.stateTimer += dt;
          if (enemy.stateTimer >= 0.3) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.DYING: {
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 1.0) {
            enemy.state = EnemyState.DEAD;
            enemy.deathTimer = 0;
          }
          break;
        }
        case EnemyState.DEAD: {
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 3.0) {
            toRemove.add(enemy.id);
          }
          break;
        }
      }

      // Map modifier: Enemy regen
      if (this._state.activeMapModifiers.includes(MapModifier.ENEMY_REGEN)) {
        if (enemy.hp < enemy.maxHp && enemy.state !== EnemyState.DYING && enemy.state !== EnemyState.DEAD) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.02 * dt);
        }
      }
      // Keep enemies on terrain
      enemy.y = getTerrainHeight(enemy.x, enemy.z);
    }

    this._state.enemies = this._state.enemies.filter((e) => !toRemove.has(e.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  COMBAT CONTEXT (bridge to DiabloCombat.ts)
  // ──────────────────────────────────────────────────────────────
  private _getCombatContext(): CombatContext {
    return {
      state: this._state,
      addFloatingText: (x, y, z, text, color) => this._addFloatingText(x, y, z, text, color),
      genId: () => this._genId(),
      dist: (x1, z1, x2, z2) => this._dist(x1, z1, x2, z2),
      playSound: (type) => this._playSound(type as SoundType),
      recalculatePlayerStats: () => this._recalculatePlayerStats(),
      renderer: {
        shakeCamera: (i, d) => this._renderer.shakeCamera(i, d),
        spawnParticles: (type, x, y, z, count, particles) => this._renderer.spawnParticles(type, x, y, z, count, particles),
        flashEnemy: (id) => this._renderer.flashEnemy(id),
        showSwingArc: (x, y, z, angle, color) => this._renderer.showSwingArc(x, y, z, angle, color),
        showSkillFlash: (color) => this._renderer.showSkillFlash(color),
        showCastOverlay: (damageType, duration) => this._renderer.showCastOverlay(damageType, duration),
        destroyNearbyProps: (x, z, radius) => this._renderer.destroyNearbyProps(x, z, radius),
      },
      incrementAchievement: (id, amount?) => this._incrementAchievement(id, amount),
      updateAchievement: (id, progress) => this._updateAchievement(id, progress),
      killEnemy: (enemy) => this._killEnemy(enemy),
      triggerDeath: () => this._triggerDeath(),
      getMouseWorldPos: () => this._getMouseWorldPos(),
      getWeaponDamage: () => this._getWeaponDamage(),
      getTalentBonuses: () => this._getTalentBonuses(),
      getLifeSteal: () => this._getLifeSteal(),
      spawnHitParticles: (enemy, damageType) => this._spawnHitParticles(enemy, damageType),
      rollLoot: (enemy) => this._rollLoot(enemy),
      pickRandomItemOfRarity: (rarity) => this._pickRandomItemOfRarity(rarity),
      grantPetXp: (amount) => this._grantPetXp(amount),
      rollPetDrop: (isBoss) => this._rollPetDrop(isBoss),
      rollMaterialDrop: (enemy) => this._rollMaterialDrop(enemy),
      onRiftGuardianKill: () => this._onRiftGuardianKill(),
      onRiftEnemyKill: () => this._onRiftEnemyKill(),
      updateDailyProgress: (type, amount?) => this._updateDailyProgress(type, amount),
      updateQuestProgress: (type, context) => this._updateQuestProgress(type, context),
      network: this._network,
      mutableState: {
        mouseDown: this._mouseDown,
        targetEnemyId: this._targetEnemyId,
        combatLog: this._combatLog,
        hitFreezeTimer: this._hitFreezeTimer,
        comboCount: this._comboCount,
        comboTimer: this._comboTimer,
        comboMultiplier: this._comboMultiplier,
        slowMotionTimer: this._slowMotionTimer,
        slowMotionScale: this._slowMotionScale,
        goldEarnedTotal: this._goldEarnedTotal,
        totalKills: this._totalKills,
        queuedSkillIdx: this._queuedSkillIdx,
        skillMasteryXp: this._skillMasteryXp,
        equipDirty: this._equipDirty,
        cachedLegendaryEffects: this._cachedLegendaryEffects,
      },
    };
  }

  private _syncCombatState(ctx: CombatContext): void {
    this._mouseDown = ctx.mutableState.mouseDown;
    this._targetEnemyId = ctx.mutableState.targetEnemyId;
    this._hitFreezeTimer = ctx.mutableState.hitFreezeTimer;
    this._comboCount = ctx.mutableState.comboCount;
    this._comboTimer = ctx.mutableState.comboTimer;
    this._comboMultiplier = ctx.mutableState.comboMultiplier;
    this._slowMotionTimer = ctx.mutableState.slowMotionTimer;
    this._slowMotionScale = ctx.mutableState.slowMotionScale;
    this._goldEarnedTotal = ctx.mutableState.goldEarnedTotal;
    this._totalKills = ctx.mutableState.totalKills;
    this._queuedSkillIdx = ctx.mutableState.queuedSkillIdx;
    this._equipDirty = ctx.mutableState.equipDirty;
    this._cachedLegendaryEffects = ctx.mutableState.cachedLegendaryEffects;
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE COMBAT (auto-attack targeted enemy)
  // ──────────────────────────────────────────────────────────────
  private _updateCombat(dt: number): void {
    const ctx = this._getCombatContext();
    combatUpdateCombat(ctx, dt);
    this._syncCombatState(ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  LEGENDARY EFFECT PROCESSING
  // ──────────────────────────────────────────────────────────────
  private _getEquippedLegendaryEffects(): LegendaryEffectDef[] {
    const ctx = this._getCombatContext();
    const result = combatGetEquippedLegendaryEffects(ctx);
    this._syncCombatState(ctx);
    return result;
  }

  private _triggerLegendaryEffects(trigger: 'on_hit' | 'on_kill' | 'on_skill' | 'on_crit' | 'on_take_damage', context: {
    targetX?: number; targetZ?: number; damage?: number; enemyMaxHp?: number; skillId?: SkillId;
    enemyStatusEffects?: { effect: StatusEffect; duration: number; source: string }[];
  }): void {
    const ctx = this._getCombatContext();
    combatTriggerLegendaryEffects(ctx, trigger, context);
    this._syncCombatState(ctx);
  }

  private _getPassiveLegendaryBonusDamage(): number {
    const ctx = this._getCombatContext();
    const result = combatGetPassiveLegendaryBonusDamage(ctx);
    this._syncCombatState(ctx);
    return result;
  }

  private _checkElementalReaction(enemy: DiabloEnemy, newEffect: StatusEffect): void {
    const ctx = this._getCombatContext();
    combatCheckElementalReaction(ctx, enemy, newEffect);
    this._syncCombatState(ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  SKILL BRANCH MODIFIERS
  // ──────────────────────────────────────────────────────────────
  private _getSkillBranchModifiers(skillId: SkillId): {
    damageMult: number; cooldownMult: number; manaCostMult: number;
    aoeRadiusMult: number; extraProjectiles: number;
    statusOverride: string | null; bonusEffects: Set<string>;
  } {
    return combatGetSkillBranchModifiers(this._getCombatContext(), skillId);
  }

  // ──────────────────────────────────────────────────────────────
  //  ACTIVATE SKILL (delegated to DiabloCombat.ts)
  // ──────────────────────────────────────────────────────────────
  private _activateSkill(idx: number): void {
    const ctx = this._getCombatContext();
    combatActivateSkill(ctx, idx);
    this._syncCombatState(ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE PROJECTILES (delegated to DiabloCombat.ts)
  // ──────────────────────────────────────────────────────────────
  private _updateProjectiles(dt: number): void {
    const ctx = this._getCombatContext();
    combatUpdateProjectiles(ctx, dt);
    this._syncCombatState(ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE AOE (delegated to DiabloCombat.ts)
  // ──────────────────────────────────────────────────────────────
  private _updateAOE(dt: number): void {
    const ctx = this._getCombatContext();
    combatUpdateAOE(ctx, dt);
    this._syncCombatState(ctx);
  }

  private _tickAOEDamage(aoe: DiabloAOE): void {
    const ctx = this._getCombatContext();
    combatTickAOEDamage(ctx, aoe);
    this._syncCombatState(ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE LOOT
  // ──────────────────────────────────────────────────────────────
  private _updateLoot(dt: number): void {
    const p = this._state.player;
    const toRemove = new Set<string>();

    for (const loot of this._state.loot) {
      loot.timer += dt;

      // Loot filter: hide filtered items (legacy filter)
      const minRarityIdx = this._lootFilterLevel === LootFilterLevel.HIDE_COMMON ? 1 :
        this._lootFilterLevel === LootFilterLevel.RARE_PLUS ? 2 :
        this._lootFilterLevel === LootFilterLevel.EPIC_PLUS ? 3 : 0;
      if (RARITY_ORDER.indexOf(loot.item.rarity) < minRarityIdx) continue;

      // Custom loot filter check
      if (!this._shouldShowLoot(loot.item)) continue;

      // Auto-pickup within 3 units
      const dist = this._dist(p.x, p.z, loot.x, loot.z);
      if (dist < 3) {
        // Auto-salvage check
        if (this._shouldAutoSalvage(loot.item)) {
          const salvageYields: Record<string, number> = {
            [ItemRarity.COMMON]: 1, [ItemRarity.UNCOMMON]: 2, [ItemRarity.RARE]: 5,
            [ItemRarity.EPIC]: 10, [ItemRarity.LEGENDARY]: 25,
          };
          const salvageMats = salvageYields[loot.item.rarity] || 1;
          p.salvageMaterials += salvageMats;
          this._addFloatingText(p.x, p.y + 2, p.z, `Auto-salvage: +${salvageMats}`, '#888888');
          toRemove.add(loot.id);
          continue;
        }

        const emptyIdx = p.inventory.findIndex((s) => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
          this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
          this._incrementAchievement('collector');
          if (loot.item.rarity === ItemRarity.LEGENDARY || loot.item.rarity === ItemRarity.MYTHIC || loot.item.rarity === ItemRarity.DIVINE) {
            this._incrementAchievement('legendary_hunter');
          }
          toRemove.add(loot.id);
        }
      }

      // Extended auto-pickup radius for gold and low-tier items
      if (dist >= 3 && dist <= 5) {
        const isGold = loot.item.name.includes('Gold') || loot.item.icon === '\uD83D\uDCB0';
        const isLowTier = loot.item.rarity === ItemRarity.COMMON || loot.item.rarity === ItemRarity.UNCOMMON;
        if (isGold || isLowTier) {
          if (this._shouldAutoSalvage(loot.item)) {
            const salvageYields: Record<string, number> = {
              [ItemRarity.COMMON]: 1, [ItemRarity.UNCOMMON]: 2,
            };
            const salvageMats = salvageYields[loot.item.rarity] || 1;
            p.salvageMaterials += salvageMats;
            this._addFloatingText(p.x, p.y + 2, p.z, `Auto-salvage: +${salvageMats}`, '#888888');
            toRemove.add(loot.id);
          } else {
            const emptyIdx = p.inventory.findIndex((s) => s.item === null);
            if (emptyIdx >= 0) {
              p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
              this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
              toRemove.add(loot.id);
            }
          }
        }
      }

      // Expire after 60 seconds
      if (loot.timer > 60) {
        toRemove.add(loot.id);
      }
    }

    this._state.loot = this._state.loot.filter((l) => !toRemove.has(l.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE SPAWNING
  // ──────────────────────────────────────────────────────────────
  private _updateSpawning(dt: number): void {
    if (this._state.currentMap === DiabloMapId.CAMELOT) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const spawnInterval = (mapCfg as any).spawnInterval || 4;

    this._state.spawnTimer += dt;
    const effectiveMaxEnemies = Math.round(mapCfg.maxEnemies * DIFFICULTY_CONFIGS[this._state.difficulty].maxEnemiesMult);
    if (this._state.spawnTimer >= spawnInterval && this._state.enemies.length < effectiveMaxEnemies) {
      this._spawnEnemy();
      this._state.spawnTimer = 0;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE STATUS EFFECTS
  // ──────────────────────────────────────────────────────────────
  private _updateStatusEffects(dt: number): void {
    const p = this._state.player;

    // Player effects
    for (let i = p.statusEffects.length - 1; i >= 0; i--) {
      const eff = p.statusEffects[i];
      eff.duration -= dt;

      switch (eff.effect) {
        case StatusEffect.BURNING:
          p.hp -= 5 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.POISONED:
          p.hp -= 3 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.BLEEDING:
          p.hp -= 4 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.FROZEN:
          p.moveSpeed = 0;
          break;
        case StatusEffect.SLOWED:
          // Handled in movement calc below
          break;
      }

      if (eff.duration <= 0) {
        p.statusEffects.splice(i, 1);
      }
    }

    // Restore speed if no longer frozen
    if (!p.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) {
      if (this._statsDirty) { this._recalculatePlayerStats(); this._statsDirty = false; }
    }

    // Enemy effects
    for (const enemy of this._state.enemies) {
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
      for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
        const eff = enemy.statusEffects[i];
        eff.duration -= dt;

        switch (eff.effect) {
          case StatusEffect.BURNING:
            enemy.hp -= 5 * dt;
            break;
          case StatusEffect.POISONED:
            enemy.hp -= 3 * dt;
            break;
          case StatusEffect.BLEEDING:
            enemy.hp -= 4 * dt;
            break;
        }

        if (enemy.hp <= 0) {
          this._killEnemy(enemy);
        }

        if (eff.duration <= 0) {
          enemy.statusEffects.splice(i, 1);
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE FLOATING TEXT
  // ──────────────────────────────────────────────────────────────
  private _updateFloatingText(dt: number): void {
    for (let i = this._state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._state.floatingTexts[i];
      ft.timer += dt;
      // Lively arc: fast upward initially, decelerating + slight horizontal drift
      const t = ft.timer;
      ft.vy = Math.max(0.3, ft.vy - 3.5 * dt); // decelerate
      ft.y += ft.vy * dt * 3;
      // Horizontal scatter (seeded by id hash)
      const idHash = ft.id.charCodeAt(0) + ft.id.charCodeAt(ft.id.length - 1);
      ft.x += Math.sin(t * 4 + idHash) * 0.3 * dt;
      ft.z += Math.cos(t * 3 + idHash * 0.7) * 0.2 * dt;
      if (ft.timer > 1.8) {
        this._state.floatingTexts.splice(i, 1);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  TOWNFOLK
  // ──────────────────────────────────────────────────────────────

  private _spawnCamelotTownfolk(): void {
    this._state.townfolk = [];
    const roles: Array<{ role: TownfolkRole; name: string; x: number; z: number; radius: number }> = [
      // Named Camelot NPCs
      { role: 'guard', name: 'Sir Kay, Seneschal', x: 5, z: -3, radius: 15 },
      { role: 'maiden', name: 'Lady Elaine', x: -4, z: 2, radius: 8 },
      { role: 'monk', name: 'Brother Thomas', x: 0, z: -8, radius: 8 },
      { role: 'bard', name: 'Bard Rhiannon', x: 8, z: 5, radius: 12 },
      { role: 'child', name: 'Young Gareth', x: -6, z: -5, radius: 14 },
      { role: 'noble', name: 'Lord Ector', x: 3, z: 7, radius: 8 },
      { role: 'peasant', name: 'Martha the Baker', x: -8, z: 0, radius: 10 },
      { role: 'monk', name: 'Old Merlin\'s Apprentice', x: 6, z: -7, radius: 6 },
      // Near castle
      { role: 'noble', name: 'Lord Cedric', x: -18, z: -15, radius: 8 },
      { role: 'noble', name: 'Lady Eleanor', x: -12, z: -20, radius: 8 },
      { role: 'guard', name: 'Sir Bedivere', x: 15, z: 5, radius: 12 },
      { role: 'guard', name: 'Gate Warden Aldric', x: 0, z: 20, radius: 6 },
      // Religious quarter
      { role: 'monk', name: 'Sister Evangeline', x: 20, z: -8, radius: 6 },
      // Entertainment
      { role: 'bard', name: 'Taliesin the Storyteller', x: 10, z: 10, radius: 10 },
      // Children
      { role: 'child', name: 'Squire Percival', x: -10, z: 0, radius: 12 },
      // Townspeople
      { role: 'peasant', name: 'Old Henric the Beggar', x: -15, z: 10, radius: 15 },
      { role: 'peasant', name: 'Wilfred the Woodcutter', x: 20, z: 15, radius: 10 },
      { role: 'maiden', name: 'Rosalind the Flower Girl', x: 0, z: 15, radius: 12 },
      { role: 'noble', name: 'Dagonet the Jester', x: -5, z: -12, radius: 10 },
      { role: 'peasant', name: 'Edmund the Smith\'s Boy', x: 8, z: -3, radius: 10 },
    ];

    for (const def of roles) {
      const tf: DiabloTownfolk = {
        id: this._genId(),
        role: def.role,
        name: def.name,
        x: def.x,
        y: getTerrainHeight(def.x, def.z),
        z: def.z,
        angle: Math.random() * Math.PI * 2,
        speed: def.role === 'child' ? 2.0 : def.role === 'guard' ? 1.8 : def.role === 'noble' ? 1.0 : 1.4,
        wanderTarget: null,
        wanderTimer: Math.random() * 5,
        homeX: def.x,
        homeZ: def.z,
        wanderRadius: def.radius,
      };
      this._state.townfolk.push(tf);
    }
  }

  private _updateTownfolk(dt: number): void {
    if (this._state.currentMap !== DiabloMapId.CAMELOT) return;

    const mapCfg = MAP_CONFIGS[DiabloMapId.CAMELOT];
    const halfW = mapCfg.width / 2 - 2;
    const halfD = mapCfg.depth / 2 - 2;

    for (const tf of this._state.townfolk) {
      tf.wanderTimer -= dt;

      if (tf.wanderTimer <= 0) {
        // Pick a new wander target within radius of home
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * tf.wanderRadius;
        let tx = tf.homeX + Math.cos(angle) * dist;
        let tz = tf.homeZ + Math.sin(angle) * dist;
        // Clamp to map bounds
        tx = Math.max(-halfW, Math.min(halfW, tx));
        tz = Math.max(-halfD, Math.min(halfD, tz));
        tf.wanderTarget = { x: tx, z: tz };
        tf.wanderTimer = 3 + Math.random() * 6; // pause 3-9 seconds between wanders
      }

      if (tf.wanderTarget) {
        const dx = tf.wanderTarget.x - tf.x;
        const dz = tf.wanderTarget.z - tf.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5) {
          tf.wanderTarget = null;
        } else {
          const moveSpeed = tf.speed * dt;
          tf.x += (dx / dist) * moveSpeed;
          tf.z += (dz / dist) * moveSpeed;
          tf.angle = Math.atan2(dx, dz);
          tf.y = getTerrainHeight(tf.x, tf.z);
        }
      }
    }

    // Townfolk ambient speech (rare, when player is nearby)
    const TOWNFOLK_LINES: Record<string, string[]> = {
      peasant: ["The crops are failing...", "I miss the old days.", "Stay safe out there."],
      noble: ["Camelot shall endure!", "The Round Table will rise again."],
      guard: ["The walls hold firm.", "Keep your weapon ready.", "I've seen things in the dark..."],
      maiden: ["Bless your quest, brave one.", "The Lady of the Lake weeps."],
      monk: ["Faith guides the blade.", "Pray for us all.", "The light endures."],
      bard: ["\u266A The Knights ride forth... \u266A", "\u266A Steel and shadow... \u266A"],
      child: ["Are you a real knight?", "Will you save us?"],
    };
    const pTf = this._state.player;
    for (const npc of this._state.townfolk) {
      const tfDist = this._dist(npc.x, npc.z, pTf.x, pTf.z);
      if (tfDist < 4 && Math.random() < 0.002) {
        const lines = TOWNFOLK_LINES[npc.role] || TOWNFOLK_LINES.peasant;
        const tfLine = lines[Math.floor(Math.random() * lines.length)];
        this._addFloatingText(npc.x, npc.y + 2.5, npc.z, tfLine, '#cccc88');
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  GREATER RIFT SYSTEM  (delegated to DiabloRift.ts)
  // ──────────────────────────────────────────────────────────────
  private _riftCtx(): RiftContext {
    return {
      state: this._state,
      genId: () => this._genId(),
      addFloatingText: (x, y, z, text, color) => this._addFloatingText(x, y, z, text, color),
      updateAchievement: (id, progress) => this._updateAchievement(id, progress),
      addLeaderboardEntry: (entry) => this._addLeaderboardEntry(entry),
      rollLoot: (enemy) => this._rollLoot(enemy),
      startMap: (mapId) => this._startMap(mapId),
    };
  }

  private _startGreaterRift(level: number): void {
    riftStart(this._riftCtx(), level);
  }

  private _updateGreaterRift(dt: number): void {
    riftUpdate(this._riftCtx(), dt);
  }

  private _spawnRiftGuardian(): void {
    riftSpawnGuardian(this._riftCtx());
  }

  private _onRiftEnemyKill(): void {
    riftOnEnemyKill(this._riftCtx());
  }

  private _onRiftGuardianKill(): void {
    riftOnGuardianKill(this._riftCtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  WEATHER VISUAL EFFECTS
  // ──────────────────────────────────────────────────────────────
  private _updateWeatherEffects(_dt: number): void {
    if (this._state.weather === Weather.NORMAL || this._state.weather === Weather.CLEAR) return;

    const p = this._state.player;

    if (this._state.weather === Weather.STORMY) {
      // Rain particles
      if (Math.random() < 0.3) {
        for (let i = 0; i < 3; i++) {
          const rx = p.x + (Math.random() * 30 - 15);
          const rz = p.z + (Math.random() * 30 - 15);
          this._state.particles.push({
            x: rx, y: 8 + Math.random() * 4, z: rz,
            vx: 0, vy: -15, vz: -2,
            life: 0.6, maxLife: 0.6,
            color: 0x6688aa, size: 0.05,
            type: ParticleType.DUST,
          });
        }
      }
      // Lightning flash (rare)
      if (Math.random() < 0.001) {
        this._renderer.shakeCamera(0.05, 0.1);
        this._addFloatingText(p.x + (Math.random() * 20 - 10), 5, p.z + (Math.random() * 20 - 10), 'LIGHTNING', '#ffffff');
      }
    }

    if (this._state.weather === Weather.FOGGY) {
      // Fog wisps
      if (Math.random() < 0.05) {
        const fx = p.x + (Math.random() * 20 - 10);
        const fz = p.z + (Math.random() * 20 - 10);
        this._state.particles.push({
          x: fx, y: 0.5 + Math.random(), z: fz,
          vx: (Math.random() - 0.5) * 0.5, vy: 0.1, vz: (Math.random() - 0.5) * 0.5,
          life: 3, maxLife: 3,
          color: 0x888888, size: 0.3,
          type: ParticleType.DUST,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  CHECK MAP CLEAR
  // ──────────────────────────────────────────────────────────────
  private _checkMapClear(): void {
    if (this._state.phase !== DiabloPhase.PLAYING) return;
    if (this._state.currentMap === DiabloMapId.CAMELOT) return;

    const target = MAP_KILL_TARGET[this._state.currentMap] || 50;
    if (this._state.killCount >= target) {
      const aliveEnemies = this._state.enemies.filter(
        (e) => e.state !== EnemyState.DYING && e.state !== EnemyState.DEAD
      );
      if (aliveEnemies.length === 0) {
        this._onMapComplete();
        this._showVictory();
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ROLL LOOT
  // ──────────────────────────────────────────────────────────────
  private _rollLoot(enemy: DiabloEnemy): DiabloItem[] {
    const items: DiabloItem[] = [];
    const table = LOOT_TABLES[enemy.type];
    if (!table) return items;

    // Calculate drop rate bonus from map modifiers
    let dropRateBonus = 0;
    for (const mod of this._state.activeMapModifiers) {
      const modDef = MAP_MODIFIER_DEFS[mod];
      if (modDef) dropRateBonus += modDef.dropRateBonus;
    }
    // Modifier stacking bonus: +15% loot quality per extra modifier beyond the first
    const modifierCount = this._state.activeMapModifiers.filter(m => m !== MapModifier.NONE).length;
    const stackBonus = modifierCount > 1 ? 1 + (modifierCount - 1) * 0.15 : 1;
    const dropMult = (1 + dropRateBonus / 100) * stackBonus;

    for (const entry of table) {
      if (Math.random() < entry.chance * dropMult) {
        const item = this._pickRandomItemOfRarity(entry.rarity);
        if (item) {
          items.push({ ...item, id: this._genId() });
        }
      }
    }

    // Boss guaranteed rare+ drop
    if (enemy.isBoss && items.length === 0) {
      const rareItems = ITEM_DATABASE.filter(
        (it) => it.rarity === ItemRarity.RARE || it.rarity === ItemRarity.EPIC || it.rarity === ItemRarity.LEGENDARY
      );
      if (rareItems.length > 0) {
        const pick = rareItems[Math.floor(Math.random() * rareItems.length)];
        items.push({ ...pick, id: this._genId() });
      }
    }

    // Map-specific set/unique drops (bosses: guaranteed, regular enemies: small chance)
    const mapKey = this._state.currentMap as string;
    const mapItemNames = MAP_SPECIFIC_ITEMS[mapKey];
    if (mapItemNames) {
      const dropChance = enemy.isBoss ? 1.0 : 0.04;
      if (Math.random() < dropChance) {
        const name = mapItemNames[Math.floor(Math.random() * mapItemNames.length)];
        const mapItem = ITEM_DATABASE.find((it) => it.name === name);
        if (mapItem) {
          items.push({ ...mapItem, id: this._genId() });
        }
      }
    }

    // Assign legendary effect for legendary+ items
    const effectIds = Object.keys(LEGENDARY_EFFECTS);
    for (const item of items) {
      if (item.rarity === ItemRarity.LEGENDARY || item.rarity === ItemRarity.MYTHIC || item.rarity === ItemRarity.DIVINE) {
        if (!item.legendaryAbility) {
          item.legendaryAbility = effectIds[Math.floor(Math.random() * effectIds.length)];
        }
      }
    }

    return items;
  }

  private _pickRandomItemOfRarity(rarity: ItemRarity): DiabloItem | null {
    const pool = ITEM_DATABASE.filter((it) => it.rarity === rarity);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ──────────────────────────────────────────────────────────────
  //  SPAWN ENEMY
  // ──────────────────────────────────────────────────────────────
  private _spawnEnemy(): void {
    const p = this._state.player;
    const mapCfg = MAP_CONFIGS[this._state.currentMap];

    // Night boss re-spawn check (once per 10 kills at night)
    if (this._state.timeOfDay === TimeOfDay.NIGHT && this._state.killCount > 0 && this._state.killCount % 10 === 0) {
      this._spawnNightBoss();
    }
    // Day boss re-spawn check (once per 15 kills when not night)
    if (this._state.timeOfDay !== TimeOfDay.NIGHT && this._state.killCount > 0 && this._state.killCount % 15 === 0) {
      this._spawnDayBoss();
    }

    // Random position 40-60 units from player, within map bounds
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 20;
    const halfW = mapCfg.width / 2 - 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2 - 2;

    let ex = p.x + Math.cos(angle) * dist;
    let ez = p.z + Math.sin(angle) * dist;
    ex = Math.max(-halfW, Math.min(halfW, ex));
    ez = Math.max(-halfD, Math.min(halfD, ez));

    this._spawnEnemyAt(ex, ez);
  }

  private _spawnEnemyAt(ex: number, ez: number): void {
    const weights = ENEMY_SPAWN_WEIGHTS[this._state.currentMap];
    if (!weights || weights.length === 0) return;

    // Pick enemy type from weighted table
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenType = weights[0].type;
    for (const w of weights) {
      roll -= w.weight;
      if (roll <= 0) {
        chosenType = w.type;
        break;
      }
    }

    // Boss spawn every 20 kills
    let isBossSpawn = false;
    if (this._state.killCount > 0 && this._state.killCount % 20 === 0 && this._state.totalEnemiesSpawned > 0) {
      const existingBoss = this._state.enemies.find((e) => e.isBoss && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING);
      if (!existingBoss) {
        isBossSpawn = true;
      }
    }

    const def = ENEMY_DEFS[chosenType];
    if (!def) return;

    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];
    let hpMult = (isBossSpawn ? 5 : 1) * diffCfg.hpMult;
    let dmgMult = (isBossSpawn ? 2 : 1) * diffCfg.damageMult;
    // Apply map modifier effects
    for (const mod of this._state.activeMapModifiers) {
      const modDef = MAP_MODIFIER_DEFS[mod];
      if (modDef) {
        hpMult *= modDef.enemyHpMult;
        dmgMult *= modDef.enemyDamageMult;
      }
    }
    // Extra elites modifier
    if (this._state.activeMapModifiers.includes(MapModifier.EXTRA_ELITES)) {
      if (!isBossSpawn && this._state.killCount > 0 && this._state.killCount % 12 === 0) {
        const existingBoss2 = this._state.enemies.find((e) => e.isBoss && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING);
        if (!existingBoss2) isBossSpawn = true;
      }
    }
    const armorMult = (isBossSpawn ? 1.5 : 1) * diffCfg.armorMult;
    const bossNames = BOSS_NAMES[this._state.currentMap] || ["Dark Champion"];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: chosenType,
      x: ex,
      y: getTerrainHeight(ex, ez),
      z: ez,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * hpMult,
      maxHp: def.hp * hpMult,
      damage: def.damage * dmgMult,
      armor: def.armor * armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange * (isBossSpawn ? 1.3 : 1),
      xpReward: Math.round(def.xpReward * (isBossSpawn ? 5 : 1) * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: isBossSpawn || def.isBoss,
      bossName: isBossSpawn ? bossName : undefined,
      scale: def.scale * (isBossSpawn ? 1.8 : 1),
      level: def.level + (isBossSpawn ? 5 : 0),
      damageType: ENEMY_DAMAGE_TYPES[chosenType] || DamageType.PHYSICAL,
      behavior: def.behavior,
    };

    // Greater Rift scaling
    if (this._state.greaterRift.state !== GreaterRiftState.NOT_ACTIVE) {
      enemy.hp *= this._state.greaterRift.enemyHpMultiplier;
      enemy.maxHp = enemy.hp;
      enemy.damage *= this._state.greaterRift.enemyDamageMultiplier;
    }

    // Multiplayer scaling
    const playerCount = 1 + this._state.multiplayer.remotePlayers.length;
    if (playerCount > 1) {
      enemy.hp *= 1 + (playerCount - 1) * 0.75;
      enemy.maxHp = enemy.hp;
      enemy.xpReward = Math.floor(enemy.xpReward * (1 + (playerCount - 1) * 0.3));
    }

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Kill enemy
  // ──────────────────────────────────────────────────────────────
  private _killEnemy(enemy: DiabloEnemy): void {
    if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) return;
    enemy.hp = 0;
    enemy.state = EnemyState.DYING;
    enemy.deathTimer = 0;

    if (this._network.isConnected) {
      this._network.sendEnemyKill(enemy.id);
    }

    this._renderer.spawnParticles(ParticleType.DUST, enemy.x, enemy.y + 0.5, enemy.z, 8 + Math.floor(Math.random() * 5), this._state.particles);

    // Map modifier: Explosive death
    if (this._state.activeMapModifiers.includes(MapModifier.EXPLOSIVE_DEATH)) {
      const p = this._state.player;
      const explodeDmg = enemy.maxHp * 0.3;
      const explodeRadius = 4;
      // Damage player if nearby
      const distToPlayer = this._dist(enemy.x, enemy.z, p.x, p.z);
      if (distToPlayer < explodeRadius && p.invulnTimer <= 0) {
        p.hp -= explodeDmg;
        this._addFloatingText(p.x, p.y + 2, p.z, `${Math.round(explodeDmg)} EXPLOSION`, '#ff8800');
        if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
      }
      this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 20, this._state.particles);
      this._renderer.shakeCamera(0.3, 0.3);
    }

    const p = this._state.player;
    const xpMult = (this._state.weather === Weather.CLEAR ? 1.1 : 1.0) * (1 + this._hasPetBuff('xpBonus'));
    let xpAmount = Math.floor(enemy.xpReward * xpMult);
    // Prestige XP bonus
    if (p.prestigeBonuses.xpPercent > 0) {
      xpAmount = Math.floor(xpAmount * (1 + p.prestigeBonuses.xpPercent / 100));
    }
    p.xp += xpAmount;
    const goldMult = (1 + this._hasPetBuff('goldBonus'));
    let goldEarned = Math.floor((5 + Math.random() * 10 * enemy.level) * DIFFICULTY_CONFIGS[this._state.difficulty].goldMult * goldMult);
    // Prestige gold bonus
    if (p.prestigeBonuses.goldPercent > 0) {
      goldEarned = Math.floor(goldEarned * (1 + p.prestigeBonuses.goldPercent / 100));
    }
    p.gold += goldEarned;
    this._goldEarnedTotal += goldEarned;
    this._state.killCount++;
    this._totalKills++;
    // Achievement tracking: enemy kill (ranged/projectile)
    this._incrementAchievement('first_blood');
    this._incrementAchievement('centurion');
    this._incrementAchievement('slayer');
    this._incrementAchievement('massacre');
    this._updateDailyProgress('kill');
    this._updateDailyProgress('collect_gold', goldEarned);
    this._updateAchievement('gold_hoarder', p.gold);
    if (enemy.isBoss) {
      this._incrementAchievement('boss_slayer');
      this._incrementAchievement('boss_hunter');
      this._updateDailyProgress('boss_kill');
    }

    // Stat tracking
    p.stats.totalKills++;
    p.stats.currentKillStreak++;
      // Kill streak announcements
      const streak = p.stats.currentKillStreak;
      if (streak === 5) {
        this._addFloatingText(p.x, p.y + 4, p.z, 'KILLING SPREE!', '#ff8800');
        this._renderer.shakeCamera(0.2, 0.3);
      } else if (streak === 10) {
        this._addFloatingText(p.x, p.y + 4, p.z, 'RAMPAGE!', '#ff4400');
        this._renderer.shakeCamera(0.3, 0.4);
      } else if (streak === 20) {
        this._addFloatingText(p.x, p.y + 4, p.z, 'MASSACRE!', '#ff0000');
        this._renderer.shakeCamera(0.5, 0.6);
      } else if (streak === 50) {
        this._addFloatingText(p.x, p.y + 4, p.z, 'LEGENDARY SLAYER!', '#ffd700');
        this._renderer.shakeCamera(0.6, 0.8);
        this._slowMotionTimer = 0.5;
        this._slowMotionScale = 0.3;
      }
    p.stats.longestKillStreak = Math.max(p.stats.longestKillStreak, p.stats.currentKillStreak);
    p.stats.totalGoldEarned += goldEarned;
    if (enemy.isBoss) p.stats.totalBossKills++;

    // Map completion reward check
    if (!this._mapClearRewardGiven) {
      const killTarget = MAP_KILL_TARGET[this._state.currentMap] || 0;
      if (killTarget > 0 && this._state.killCount >= Math.floor(killTarget * 0.9)) {
        this._mapClearRewardGiven = true;
        const bonus = 500;
        p.gold += bonus;
        this._goldEarnedTotal += bonus;
        this._addFloatingText(p.x, p.y + 5, p.z, 'MAP CLEARED!', '#ffd700');
        this._addFloatingText(p.x, p.y + 4, p.z, `+${bonus} Gold Bonus`, '#ffd700');
        this._playSound('levelup');
      }
    }

    // Trigger legendary on_kill effects
    this._triggerLegendaryEffects('on_kill', {
      targetX: enemy.x, targetZ: enemy.z, damage: 0, enemyMaxHp: enemy.maxHp,
      enemyStatusEffects: enemy.statusEffects
    });

    // Roll loot
    const lootItems = this._rollLoot(enemy);
    for (const item of lootItems) {
      const loot: DiabloLoot = {
        id: this._genId(),
        item,
        x: enemy.x + (Math.random() * 2 - 1),
        y: 0,
        z: enemy.z + (Math.random() * 2 - 1),
        timer: 0,
      };
      this._state.loot.push(loot);
      // Stat tracking: items found
      p.stats.totalItemsFound++;
      if (item.rarity === ItemRarity.LEGENDARY || item.rarity === ItemRarity.MYTHIC || item.rarity === ItemRarity.DIVINE) {
        p.stats.totalLegendariesFound++;
      }
    }

    // 5% chance to drop a potion
    if (Math.random() < 0.05) {
      const pot = POTION_DATABASE[Math.floor(Math.random() * POTION_DATABASE.length)];
      const droppedPotion: DiabloPotion = { ...pot, id: this._genId() };
      p.potions.push(droppedPotion);
      this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `+${pot.name}`, "#44ff44");
    }

    this._updateQuestProgress(QuestType.KILL_COUNT, this._state.currentMap);
    this._updateQuestProgress(QuestType.KILL_SPECIFIC, enemy.type);
    if (enemy.isBoss) {
      this._updateQuestProgress(QuestType.BOSS_KILL, this._state.currentMap);
      if ((enemy.type as string).startsWith("NIGHT_")) {
        this._updateQuestProgress(QuestType.NIGHT_BOSS, undefined);
        this._incrementAchievement('night_stalker');
      }
    }
    this._updateQuestProgress(QuestType.COLLECT_GOLD, undefined);

    // Check bounty completion
    for (const bounty of this._state.activeBounties) {
      if (!bounty.isComplete && enemy.id === `bounty-enemy-${bounty.id}`) {
        bounty.isComplete = true;
        this._questTrackerDirty = true;
        this._state.completedBountyIds.push(bounty.id);
        p.gold += bounty.reward.gold;
        p.xp += bounty.reward.xp;
        if (bounty.reward.keystones) {
          this._state.greaterRift.keystones += bounty.reward.keystones;
        }
        this._addFloatingText(enemy.x, enemy.y + 4, enemy.z, `BOUNTY: ${bounty.targetName} SLAIN!`, '#ffd700');
        this._addFloatingText(p.x, p.y + 3, p.z, `+${bounty.reward.gold}g +${bounty.reward.xp}xp`, '#44ff44');
        this._playSound('levelup');
        break;
      }
    }

    // Pet XP, pet egg drops, crafting material drops
    this._grantPetXp(Math.floor(enemy.xpReward * 0.5));
    this._rollPetDrop(enemy.isBoss);
    this._rollMaterialDrop(enemy);

    // Greater Rift tracking
    if (this._state.greaterRift.state !== GreaterRiftState.NOT_ACTIVE) {
      if (enemy.bossName?.startsWith('Rift Guardian')) {
        this._onRiftGuardianKill();
      } else {
        this._onRiftEnemyKill();
      }
    }

    // Greater Rift keystone drop from bosses
    if (enemy.isBoss && Math.random() < GREATER_RIFT_CONFIG.keystoneDropChance) {
      this._state.greaterRift.keystones++;
      this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, '+1 Rift Keystone!', '#00ffff');
    }

    // Excalibur fragment drop from map bosses
    const questInfo = EXCALIBUR_QUEST_INFO[this._state.currentMap];
    if (questInfo && enemy.isBoss && !this._state.player.excaliburFragments.includes(this._state.currentMap)) {
      const fragmentItem: DiabloItem = {
        id: `excalibur-fragment-${this._state.currentMap}`,
        name: questInfo.fragment,
        type: ItemType.AMULET,
        slot: ItemSlot.ACCESSORY_1,
        rarity: ItemRarity.DIVINE,
        level: 1,
        stats: {} as DiabloItemStats,
        description: questInfo.lore,
        icon: '\u2694\uFE0F',
        value: 0,
        legendaryAbility: 'excalibur_fragment',
      };
      this._state.loot.push({
        id: `excalibur-loot-${this._state.currentMap}`,
        item: fragmentItem,
        x: enemy.x,
        y: 0,
        z: enemy.z,
        timer: 999,
      });
      this._addFloatingText(enemy.x, enemy.y + 4, enemy.z, `${questInfo.fragment}!`, '#ffd700');
      this._playSound('levelup');
    }

    // Mordred defeated
    if (enemy.id === 'mordred-final-boss') {
      this._state.player.mordredDefeated = true;
      this._updateAchievement('mordred', 1);
      this._addFloatingText(enemy.x, enemy.y + 5, enemy.z, 'MORDRED FALLS!', '#ffd700');
      this._addFloatingText(this._state.player.x, this._state.player.y + 3, this._state.player.z,
        'Camelot is saved! The kingdom endures!', '#ffd700');
      this._playSound('levelup');
      setTimeout(() => {
        this._state.phase = DiabloPhase.VICTORY;
        this._showVictoryScreen();
      }, 3000);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ACHIEVEMENT SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _initAchievements(): void {
    initAchievements(this._state);
  }

  private _updateAchievement(id: string, progress: number): void {
    const result = updateAchievement(this._state, id, progress);
    if (result) {
      const p = this._state.player;
      this._addFloatingText(p.x, p.y + 4, p.z, `🏆 ${result.name}!`, '#ffd700');
      this._playSound('levelup');
    }
  }

  private _incrementAchievement(id: string, amount: number = 1): void {
    const result = incrementAchievement(this._state, id, amount);
    if (result) {
      const p = this._state.player;
      this._addFloatingText(p.x, p.y + 4, p.z, `🏆 ${result.name}!`, '#ffd700');
      this._playSound('levelup');
    }
  }

  private _showAchievements(): void {
    this._phaseBeforeOverlay = this._state.phase;
    this._state.phase = DiabloPhase.PAUSED;
    showAchievements(this._menuEl, this._state, () => {
      this._state.phase = this._phaseBeforeOverlay;
      this._menuEl.innerHTML = '';
    });
  }

  private _processAchievementNotifications(): void {
    if (this._achievementPopup) return;
    const notif = processAchievementNotifications(this._state);
    if (notif) {
      this._achievementPopup = document.createElement('div');
      this._achievementPopup.style.cssText = 'position:absolute;top:80px;left:50%;transform:translateX(-50%);background:rgba(20,15,10,0.9);border:2px solid #ffd700;border-radius:6px;padding:10px 20px;color:#ffd700;font-family:Georgia,serif;font-size:14px;text-align:center;z-index:30;transition:opacity 1s;pointer-events:none;';
      this._achievementPopup.innerHTML = `🏆 <b>${notif.name}</b><br><span style="color:#aaa;font-size:12px;">${notif.description}</span>`;
      this._hud.appendChild(this._achievementPopup);
      setTimeout(() => {
        if (this._achievementPopup) {
          this._achievementPopup.style.opacity = '0';
          setTimeout(() => {
            this._achievementPopup?.remove();
            this._achievementPopup = null;
          }, 1000);
        }
      }, 3000);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  DAILY CHALLENGE SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _generateDailyChallenges(): void {
    generateDailyChallenges(this._state);
  }

  private _updateDailyProgress(type: string, amount: number = 1): void {
    const results = updateDailyProgress(this._state, type, amount);
    if (results.length > 0) {
      this._questTrackerDirty = true;
      const p = this._state.player;
      for (const r of results) {
        this._addFloatingText(p.x, p.y + 3, p.z, `Daily: ${r.challengeName} Complete!`, '#44ff44');
        this._playSound('loot');
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  COSMETIC SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _showCosmeticsPanel(): void {
    this._phaseBeforeOverlay = this._state.phase;
    this._state.phase = DiabloPhase.PAUSED;
    this._menuEl.innerHTML = '';
    const p = this._state.player;
    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,15,10,0.95);border:2px solid #8b6914;border-radius:8px;padding:20px;color:#fff;font-family:Georgia,serif;min-width:500px;max-height:80vh;overflow-y:auto;z-index:100;pointer-events:auto;';
    panel.innerHTML = `<h2 style="text-align:center;color:#ffd700;margin:0 0 15px;">Cosmetics</h2>`;

    const types: ('trail' | 'aura')[] = ['trail', 'aura'];
    for (const type of types) {
      const label = document.createElement('h3');
      label.style.cssText = 'color:#b8860b;margin:10px 0 5px;font-size:14px;text-transform:uppercase;';
      label.textContent = type === 'trail' ? 'Trails' : 'Auras';
      panel.appendChild(label);

      const items = COSMETIC_DEFS.filter(c => c.type === type);
      for (const cosItem of items) {
        const isUnlocked = p.unlockedCosmetics.includes(cosItem.id);
        const isActive = (type === 'trail' && p.activeTrail === cosItem.id) || (type === 'aura' && p.activeAura === cosItem.id);
        const row = document.createElement('div');
        row.style.cssText = `padding:6px 10px;margin:2px 0;background:rgba(255,255,255,${isActive ? '0.15' : '0.05'});border:1px solid ${isActive ? '#ffd700' : '#333'};border-radius:4px;font-size:12px;opacity:${isUnlocked ? '1' : '0.4'};display:flex;justify-content:space-between;align-items:center;`;
        const leftHtml = `<span>${cosItem.icon} <b>${cosItem.name}</b> — <span style="color:#aaa;">${cosItem.description}</span></span>`;
        let rightHtml = '';
        if (!isUnlocked) {
          rightHtml = '<span style="color:#666;">Locked</span>';
        } else if (isActive) {
          rightHtml = '<button class="cos-equip" data-cos-id="' + cosItem.id + '" data-cos-type="' + type + '" style="padding:3px 10px;background:#553;border:1px solid #ffd700;border-radius:3px;color:#ffd700;cursor:pointer;font-size:11px;pointer-events:auto;">Unequip</button>';
        } else {
          rightHtml = '<button class="cos-equip" data-cos-id="' + cosItem.id + '" data-cos-type="' + type + '" style="padding:3px 10px;background:#335;border:1px solid #88f;border-radius:3px;color:#88f;cursor:pointer;font-size:11px;pointer-events:auto;">Equip</button>';
        }
        row.innerHTML = leftHtml + rightHtml;
        panel.appendChild(row);
      }
    }

    // Wire up equip/unequip buttons
    setTimeout(() => {
      panel.querySelectorAll('.cos-equip').forEach(btn => {
        btn.addEventListener('click', () => {
          const cosId = (btn as HTMLElement).dataset.cosId!;
          const cosType = (btn as HTMLElement).dataset.cosType!;
          if (cosType === 'trail') {
            p.activeTrail = p.activeTrail === cosId ? null : cosId;
          } else if (cosType === 'aura') {
            p.activeAura = p.activeAura === cosId ? null : cosId;
          }
          this._showCosmeticsPanel(); // refresh
        });
      });
    }, 0);

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'display:block;margin:15px auto 0;padding:8px 20px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => { this._state.phase = this._phaseBeforeOverlay; this._menuEl.innerHTML = ''; });
    panel.appendChild(closeBtn);
    this._menuEl.appendChild(panel);
  }

  // ──────────────────────────────────────────────────────────────
  //  EXCALIBUR QUEST: Reforge UI
  // ──────────────────────────────────────────────────────────────
  private _showReforgeExcalibur(): void {
    const p = this._state.player;
    this._phaseBeforeOverlay = this._state.phase;
    this._state.phase = DiabloPhase.PAUSED;
    this._menuEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,5,0,0.95);border:3px solid #ffd700;border-radius:8px;padding:30px;color:#fff;font-family:Georgia,serif;max-width:500px;text-align:center;z-index:100;';

    panel.innerHTML = `
      <h2 style="color:#ffd700;margin:0 0 15px;font-size:28px;">⚔️ Reforge Excalibur ⚔️</h2>
      <p style="color:#ddd;font-style:italic;margin-bottom:15px;">
        "The fragments pulse with ancient power. The Lady of the Lake's enchantment stirs within the steel.
        Place the shards upon the Round Table's anvil and speak the words of binding."
      </p>
      <p style="color:#aaa;margin-bottom:20px;">
        Fragments collected: ${p.excaliburFragments.length}/${Object.keys(EXCALIBUR_QUEST_INFO).length}
      </p>
      <button id="reforge-btn" style="padding:12px 30px;background:linear-gradient(180deg,#ffd700,#b8860b);color:#000;border:2px solid #ffd700;border-radius:6px;cursor:pointer;font-family:Georgia,serif;font-size:18px;font-weight:bold;">
        Reforge the Blade
      </button>
      <br>
      <button id="reforge-close" style="margin-top:10px;padding:6px 16px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;">
        Not yet
      </button>
    `;

    this._menuEl.appendChild(panel);

    document.getElementById('reforge-btn')?.addEventListener('click', () => {
      p.excaliburReforged = true;
      this._updateAchievement('excalibur', 1);

      const excalibur: DiabloItem = {
        id: 'excalibur-reforged',
        name: 'Excalibur, the Blade Reborn',
        type: ItemType.SWORD,
        slot: ItemSlot.WEAPON,
        rarity: ItemRarity.DIVINE,
        level: p.level,
        stats: {
          strength: 50,
          dexterity: 30,
          intelligence: 30,
          vitality: 40,
          armor: 25,
          critChance: 0.15,
          critDamage: 1.0,
          attackSpeed: 0.3,
          bonusDamage: 100,
          bonusHealth: 200,
          lifeSteal: 5,
        } as DiabloItemStats,
        description: 'The legendary blade of King Arthur, reforged from thirteen shattered fragments. Its edge cuts through darkness itself.',
        icon: '⚔️',
        value: 99999,
        legendaryAbility: 'holy_retribution',
        setName: 'Excalibur',
      };

      if (!p.equipment.weapon || confirm('Replace current weapon with Excalibur?')) {
        p.equipment.weapon = excalibur;
      } else {
        const emptySlot = p.inventory.findIndex(s => !s.item);
        if (emptySlot >= 0) p.inventory[emptySlot].item = excalibur;
      }

      this._addFloatingText(p.x, p.y + 4, p.z, 'EXCALIBUR REFORGED!', '#ffd700');
      this._playSound('levelup');
      this._statsDirty = true; this._equipDirty = true;
      this._recalculatePlayerStats();

      this._menuEl.innerHTML = '';
      const mordredPanel = document.createElement('div');
      mordredPanel.style.cssText = panel.style.cssText;
      mordredPanel.innerHTML = `
        <h2 style="color:#ff4444;margin:0 0 15px;font-size:24px;">⚔️ The Final Battle ⚔️</h2>
        <p style="color:#ddd;font-style:italic;">
          "Excalibur sings in your hands. Its light reaches across the land — and Mordred feels it.
          He comes. The traitor prince marches on Camelot with his dark army.
          Defend the kingdom. End this."
        </p>
        <button id="mordred-fight" style="padding:12px 30px;background:linear-gradient(180deg,#ff4444,#aa0000);color:#fff;border:2px solid #ff4444;border-radius:6px;cursor:pointer;font-family:Georgia,serif;font-size:18px;font-weight:bold;margin-top:15px;">
          Face Mordred
        </button>
      `;
      this._menuEl.appendChild(mordredPanel);

      document.getElementById('mordred-fight')?.addEventListener('click', () => {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = '';
        this._spawnMordred();
      });
    });

    document.getElementById('reforge-close')?.addEventListener('click', () => {
      this._state.phase = this._phaseBeforeOverlay;
      this._menuEl.innerHTML = '';
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  EXCALIBUR QUEST: Spawn Mordred as final boss
  // ──────────────────────────────────────────────────────────────
  private _spawnMordred(): void {
    const p = this._state.player;

    const mordred: DiabloEnemy = {
      id: 'mordred-final-boss',
      type: EnemyType.SKELETON_WARRIOR,
      x: p.x + 15, y: 0, z: p.z,
      angle: Math.atan2(-15, 0),
      hp: 5000 + p.level * 200,
      maxHp: 5000 + p.level * 200,
      damage: 50 + p.level * 5,
      damageType: DamageType.SHADOW,
      armor: 50 + p.level * 2,
      speed: 4,
      state: EnemyState.CHASE,
      targetId: null,
      attackTimer: 0,
      attackRange: 3.5,
      aggroRange: 100,
      xpReward: 10000,
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: true,
      bossName: 'Mordred, the Oathbreaker',
      scale: 2.5,
      level: Math.max(p.level, 50),
      behavior: EnemyBehavior.MELEE_BASIC,
      bossPhase: 0,
      bossAbilityCooldown: 0,
      bossEnraged: false,
      bossShieldTimer: 0,
    };

    this._state.enemies.push(mordred);
    this._addFloatingText(mordred.x, 4, mordred.z, 'MORDRED, THE OATHBREAKER', '#ff2222');
    this._playSound('boss');

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const mx = mordred.x + Math.sin(angle) * 8;
      const mz = mordred.z + Math.cos(angle) * 8;
      this._spawnEnemyAt(mx, mz);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  EXCALIBUR QUEST: Victory screen
  // ──────────────────────────────────────────────────────────────
  private _showVictoryScreen(): void {
    this._menuEl.innerHTML = '';
    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:200;';
    panel.innerHTML = `
      <div style="text-align:center;color:#ffd700;font-family:Georgia,serif;max-width:600px;padding:40px;">
        <h1 style="font-size:48px;margin-bottom:20px;">⚔️ Victory ⚔️</h1>
        <h2 style="color:#fff;font-size:24px;margin-bottom:20px;">Mordred Has Fallen</h2>
        <p style="color:#ddd;font-size:16px;line-height:1.6;margin-bottom:15px;">
          The Oathbreaker lies slain. Excalibur gleams in your hand, whole once more.
          The corruption recedes. The Round Table shall be restored.
        </p>
        <p style="color:#aaa;font-size:14px;margin-bottom:25px;">
          Level ${this._state.player.level} ${this._state.player.class} |
          ${this._state.killCount} enemies slain |
          ${this._state.player.excaliburFragments.length} fragments collected
        </p>
        <p style="color:#888;font-size:12px;margin-bottom:20px;">
          But darkness always returns. Greater Rifts await those who seek eternal challenge.
        </p>
        <button id="victory-continue" style="padding:12px 30px;background:linear-gradient(180deg,#ffd700,#b8860b);color:#000;border:2px solid #ffd700;border-radius:6px;cursor:pointer;font-family:Georgia,serif;font-size:18px;font-weight:bold;">
          Continue Playing
        </button>
      </div>
    `;
    this._menuEl.appendChild(panel);

    document.getElementById('victory-continue')?.addEventListener('click', () => {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = '';
    });
  }

  //  HELPER: Create projectile
  // ──────────────────────────────────────────────────────────────
  private _createProjectile(
    x: number, y: number, z: number,
    angle: number, damage: number,
    def: any, skillId: SkillId
  ): void {
    combatCreateProjectile(this._getCombatContext(), x, y, z, angle, damage, def, skillId);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Chain lightning bounce (delegated to DiabloCombat.ts)
  // ──────────────────────────────────────────────────────────────
  private _chainLightningBounce(fromEnemy: DiabloEnemy, damage: number, bouncesLeft: number): void {
    const ctx = this._getCombatContext();
    combatChainLightningBounce(ctx, fromEnemy, damage, bouncesLeft);
    this._syncCombatState(ctx);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Open chest
  // ──────────────────────────────────────────────────────────────
  private _openChest(chestId: string): void {
    const chest = this._state.treasureChests.find((c) => c.id === chestId);
    if (!chest || chest.opened) return;

    const p = this._state.player;
    const dist = this._dist(p.x, p.z, chest.x, chest.z);
    if (dist > 3) return;

    chest.opened = true;
    for (const item of chest.items) {
      const loot: DiabloLoot = {
        id: this._genId(),
        item: { ...item, id: this._genId() },
        x: chest.x + (Math.random() * 3 - 1.5),
        y: 0,
        z: chest.z + (Math.random() * 3 - 1.5),
        timer: 0,
      };
      this._state.loot.push(loot);
    }

    // Gold bonus
    const goldBonus = Math.floor(20 + Math.random() * 50);
    p.gold += goldBonus;
    this._goldEarnedTotal += goldBonus;
    this._addFloatingText(chest.x, 2, chest.z, `+${goldBonus} Gold`, "#ffd700");

    this._chestsOpened++;
    this._updateQuestProgress(QuestType.TREASURE_HUNT, undefined);
    this._updateQuestProgress(QuestType.COLLECT_GOLD, undefined);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Pickup loot manually
  // ──────────────────────────────────────────────────────────────
  private _pickupLoot(lootId: string): void {
    const lootIdx = this._state.loot.findIndex((l) => l.id === lootId);
    if (lootIdx < 0) return;
    const loot = this._state.loot[lootIdx];

    const p = this._state.player;
    const dist = this._dist(p.x, p.z, loot.x, loot.z);
    if (dist > 4) return;

    // Excalibur fragment collection
    if (loot.item.id.startsWith('excalibur-fragment-')) {
      const mapId = loot.item.id.replace('excalibur-fragment-', '') as DiabloMapId;
      if (!p.excaliburFragments.includes(mapId)) {
        p.excaliburFragments.push(mapId);
        const totalNeeded = Object.keys(EXCALIBUR_QUEST_INFO).length;
        this._addFloatingText(p.x, p.y + 3, p.z,
          `Fragment ${p.excaliburFragments.length}/${totalNeeded} collected!`, '#ffd700');

        if (p.excaliburFragments.length >= totalNeeded) {
          this._addFloatingText(p.x, p.y + 4, p.z,
            'All fragments found! Return to Camelot to reforge Excalibur!', '#ffd700');
        }
      }
      this._state.loot = this._state.loot.filter(l => l.item.id !== loot.item.id);
      return;
    }

    const emptyIdx = p.inventory.findIndex((s) => s.item === null);
    if (emptyIdx < 0) {
      this._addFloatingText(p.x, p.y + 2, p.z, "Inventory Full!", "#ff4444");
      return;
    }

    p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
    this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
    this._playSound('loot');
    this._renderer.spawnParticles(ParticleType.GOLD, loot.x, loot.y + 0.5, loot.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
    this._state.loot.splice(lootIdx, 1);

    if (this._network.isConnected) {
      this._network.sendLootPickup(lootId);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Generate chest loot
  // ──────────────────────────────────────────────────────────────
  private _generateChestLoot(rarity: ItemRarity): DiabloItem[] {
    const items: DiabloItem[] = [];
    const count = rarity === ItemRarity.EPIC ? 3 : rarity === ItemRarity.RARE ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const item = this._pickRandomItemOfRarity(rarity);
      if (item) items.push({ ...item, id: this._genId() });
    }
    // Always add a common item too
    const common = this._pickRandomItemOfRarity(ItemRarity.COMMON);
    if (common) items.push({ ...common, id: this._genId() });
    return items;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Dodge roll (space bar)
  // ──────────────────────────────────────────────────────────────
  private _doDodgeRoll(): void {
    combatDoDodgeRoll(this._getCombatContext());
  }

  // ──────────────────────────────────────────────────────────────
  //  PROCEDURAL AUDIO (delegated to DiabloAudioSystem.ts)
  // ──────────────────────────────────────────────────────────────
  private _ensureAudio(): AudioContext | null {
    return ensureAudioCtx(this._audio);
  }

  private _startBgm(mapId: DiabloMapId): void {
    startBgm(this._audio, mapId);
  }

  private _stopBgm(): void {
    stopBgm(this._audio);
  }

  private _playSound(type: SoundType): void {
    playSoundEffect(this._audio, type);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Add floating text
  // ──────────────────────────────────────────────────────────────
  private _damageTypeColor(type: DamageType): string {
    return combatDamageTypeColor(type);
  }

  private _addFloatingText(x: number, y: number, z: number, text: string, color: string): void {
    // Cap floating texts to prevent GPU memory pressure from mass AOE hits
    if (this._state.floatingTexts.length >= 40) {
      this._state.floatingTexts.shift();
    }
    this._state.floatingTexts.push({
      id: this._genId(),
      text,
      x,
      y,
      z,
      color,
      timer: 0,
      vy: 2,
    });
  }

  private _checkLoreDiscovery(): void {
    const lorePoints = MAP_LORE_POINTS[this._state.currentMap];
    if (!lorePoints) return;
    const p = this._state.player;
    for (const lp of lorePoints) {
      const key = `${this._state.currentMap}:${lp.title}`;
      if (this._discoveredLore.has(key)) continue;
      const dist = this._dist(p.x, p.z, lp.x, lp.z);
      if (dist <= lp.radius) {
        this._discoveredLore.add(key);
        this._showQuestPopup(lp.title, lp.text, null, 8);
        this._addFloatingText(p.x, p.y + 3, p.z, "Lore Discovered", "#c8a84e");
        break; // Only one discovery per frame
      }
    }
  }

  private _questPopupTimer: number = 0;

  private _showQuestPopup(title: string, body: string, lore: string | null, duration: number): void {
    const loreHtml = lore
      ? `<div style="margin-top:10px;font-size:12px;color:#887755;font-style:italic;line-height:1.5;">${lore}</div>`
      : "";
    this._hudRefs.questPopup.innerHTML = `
      <div style="font-size:11px;color:#665533;letter-spacing:3px;margin-bottom:6px;">THE FALL OF EXCALIBUR</div>
      <div style="font-size:20px;color:#ffd700;font-weight:bold;margin-bottom:10px;text-shadow:0 0 8px rgba(255,215,0,0.3);">${title}</div>
      <div style="font-size:14px;color:#ccbb99;line-height:1.7;">${body}</div>
      ${loreHtml}
    `;
    this._hudRefs.questPopup.style.display = "block";
    this._hudRefs.questPopup.style.opacity = "1";
    this._questPopupTimer = duration;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Distance
  // ──────────────────────────────────────────────────────────────
  private _dist(x1: number, z1: number, x2: number, z2: number): number {
    return Math.hypot(x2 - x1, z2 - z1);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Generate ID
  // ──────────────────────────────────────────────────────────────
  private _genId(): string {
    return "d" + (this._nextId++);
  }


  // ──────────────────────────────────────────────────────────────
  //  RUNEWORD SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _checkRunewords(): void {
    const p = this._state.player;
    const eq = p.equipment;
    const slots = ['helmet', 'body', 'gauntlets', 'legs', 'feet', 'accessory1', 'accessory2', 'weapon', 'lantern'] as const;

    for (const slotKey of slots) {
      const item = eq[slotKey];
      if (!item || !item.sockets || item.sockets.length < 2) continue;

      // Check if item's socket rune pattern matches any runeword
      // Map gem types to rune types (fire=A, ice=B, lightning=C, poison=D, holy=E)
      const gemToRune: Record<string, RuneType> = {
        [DamageType.FIRE]: RuneType.RUNE_A,
        [DamageType.ICE]: RuneType.RUNE_B,
        [DamageType.LIGHTNING]: RuneType.RUNE_C,
        [DamageType.POISON]: RuneType.RUNE_D,
        [DamageType.HOLY]: RuneType.RUNE_E,
      };

      const itemRunes = item.sockets
        .filter(s => s.gemType !== null)
        .map(s => gemToRune[s.gemType as string] || RuneType.NONE);

      if (itemRunes.length < 2) continue;

      for (const rw of RUNEWORD_DEFS) {
        // Check slot compatibility
        if (!rw.requiredSlots.includes(item.slot)) continue;

        // Check rune pattern (must match in order, allow partial match for shorter patterns)
        if (itemRunes.length < rw.requiredRunes.length) continue;

        let matches = true;
        for (let i = 0; i < rw.requiredRunes.length; i++) {
          if (itemRunes[i] !== rw.requiredRunes[i]) {
            matches = false;
            break;
          }
        }

        if (matches) {
          // Apply runeword!
          item.name = `${rw.name} ${item.name}`;
          item.rarity = ItemRarity.LEGENDARY;
          if (rw.legendaryEffectId) {
            item.legendaryAbility = rw.legendaryEffectId;
          }
          // Add bonus stats
          for (const [key, value] of Object.entries(rw.bonusStats)) {
            if (typeof value === 'number') {
              (item.stats as any)[key] = ((item.stats as any)[key] || 0) + value;
            }
          }
          item.description = `${rw.specialEffect}\n${item.description || ''}`;
          this._addFloatingText(p.x, p.y + 3, p.z, `RUNEWORD: ${rw.name}!`, '#ffd700');
          this._statsDirty = true; this._equipDirty = true;
          this._recalculatePlayerStats();
          break; // Only one runeword per item
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Recalculate player stats
  // ──────────────────────────────────────────────────────────────
  private _recalculatePlayerStats(): void {
    const p = this._state.player;
    const base = createDefaultPlayer(p.class);

    // Scale base stats by level
    const lvlBonus = (p.level - 1) * 3;
    p.strength = base.strength + lvlBonus;
    p.dexterity = base.dexterity + lvlBonus;
    p.intelligence = base.intelligence + lvlBonus;
    p.vitality = base.vitality + (p.level - 1) * 4;
    p.armor = base.armor;
    p.moveSpeed = base.moveSpeed;
    p.attackSpeed = base.attackSpeed;
    p.critChance = base.critChance;
    p.critDamage = base.critDamage;
    // Apply equipment stats
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    const equippedNames: string[] = [];
    let bonusHealthFromGear = 0;
    let bonusManaFromGear = 0;

    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      equippedNames.push(item.name);
      const stats = item.stats as any;
      if (stats.strength) p.strength += stats.strength;
      if (stats.dexterity) p.dexterity += stats.dexterity;
      if (stats.intelligence) p.intelligence += stats.intelligence;
      if (stats.vitality) p.vitality += stats.vitality;
      if (stats.armor) p.armor += stats.armor;
      if (stats.critChance) p.critChance += stats.critChance / 100;
      if (stats.critDamage) p.critDamage += stats.critDamage / 100;
      if (stats.attackSpeed) p.attackSpeed += stats.attackSpeed / 100;
      if (stats.moveSpeed || stats.speed) p.moveSpeed += (stats.moveSpeed || stats.speed || 0);
      if (stats.bonusHealth) bonusHealthFromGear += stats.bonusHealth;
      if (stats.bonusMana) bonusManaFromGear += stats.bonusMana;
    }

    // Check set bonuses (count equipped items by setName)
    const eqSlotKeys = ['helmet', 'body', 'gauntlets', 'legs', 'feet', 'accessory1', 'accessory2', 'weapon', 'lantern'] as const;
    const setCounts: Record<string, number> = {};
    for (const slotKey of eqSlotKeys) {
      const eqItem = p.equipment[slotKey];
      if (eqItem && (eqItem as any).setName) {
        const sn = (eqItem as any).setName as string;
        setCounts[sn] = (setCounts[sn] || 0) + 1;
      }
    }
    for (const setBonus of SET_BONUSES) {
      const setCount = setCounts[setBonus.setName] || 0;
      if (setCount >= setBonus.pieces) {
        const bs = setBonus.bonusStats as any;
        if (bs.strength) p.strength += bs.strength;
        if (bs.dexterity) p.dexterity += bs.dexterity;
        if (bs.intelligence) p.intelligence += bs.intelligence;
        if (bs.vitality) p.vitality += bs.vitality;
        if (bs.armor) p.armor += bs.armor;
        if (bs.critChance) p.critChance += bs.critChance / 100;
        if (bs.critDamage) p.critDamage += bs.critDamage / 100;
        if (bs.attackSpeed) p.attackSpeed += bs.attackSpeed / 100;
        if (bs.moveSpeed) p.moveSpeed += bs.moveSpeed;
        if (bs.manaRegen) { /* applied in update */ }
        if (bs.bonusDamage) { /* applied in damage calc */ }
        if (bs.lifeSteal) { /* applied in damage calc */ }
      }
    }

    // Calculate maxHp/maxMana AFTER all vitality/intelligence bonuses are applied
    p.maxHp = base.maxHp + (p.level - 1) * Math.floor(p.vitality * 2) + bonusHealthFromGear;
    p.maxMana = base.maxMana + (p.level - 1) * Math.floor(p.intelligence * 0.8) + bonusManaFromGear;

    // Apply talent effects
    const talentBonuses = this._getTalentBonuses();
    if (talentBonuses[TalentEffectType.BONUS_HP_PERCENT]) {
      p.maxHp = Math.floor(p.maxHp * (1 + talentBonuses[TalentEffectType.BONUS_HP_PERCENT] / 100));
    }
    if (talentBonuses[TalentEffectType.BONUS_MANA_PERCENT]) {
      p.maxMana = Math.floor(p.maxMana * (1 + talentBonuses[TalentEffectType.BONUS_MANA_PERCENT] / 100));
    }
    if (talentBonuses[TalentEffectType.BONUS_ARMOR]) {
      p.armor += talentBonuses[TalentEffectType.BONUS_ARMOR];
    }
    if (talentBonuses[TalentEffectType.BONUS_CRIT_CHANCE]) {
      p.critChance += talentBonuses[TalentEffectType.BONUS_CRIT_CHANCE] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_CRIT_DAMAGE]) {
      p.critDamage += talentBonuses[TalentEffectType.BONUS_CRIT_DAMAGE] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_ATTACK_SPEED]) {
      p.attackSpeed += talentBonuses[TalentEffectType.BONUS_ATTACK_SPEED] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_MOVE_SPEED]) {
      p.moveSpeed += talentBonuses[TalentEffectType.BONUS_MOVE_SPEED];
    }

    // Talent synergies
    for (const syn of TALENT_SYNERGIES) {
      if ((p.talents[syn.talentA] || 0) > 0 && (p.talents[syn.talentB] || 0) > 0) {
        (p as any)[syn.bonus] = ((p as any)[syn.bonus] || 0) + syn.value;
      }
    }

    // Prestige bonuses
    if (p.prestigeLevel > 0) {
      // Damage bonus applied in combat calculations
      p.maxHp = Math.floor(p.maxHp * (1 + p.prestigeBonuses.hpPercent / 100));
    }

    // Apply potion buffs
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.SPEED) {
        p.moveSpeed *= (1 + buff.value / 100);
      }
    }

    // Make sure hp/mana don't exceed new max
    p.hp = Math.min(p.hp, p.maxHp);
    p.mana = Math.min(p.mana, p.maxMana);

    // Apply frozen override if applicable
    if (p.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) {
      p.moveSpeed = 0;
    }
    // Apply slowed
    if (p.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) {
      p.moveSpeed *= 0.5;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get effective stats (for display)
  // ──────────────────────────────────────────────────────────────
  private _getEffectiveStats(): {
    strength: number; dexterity: number; intelligence: number;
    vitality: number; armor: number; critChance: number;
    moveSpeed: number; attackSpeed: number; critDamage: number;
  } {
    const p = this._state.player;
    return {
      strength: p.strength,
      dexterity: p.dexterity,
      intelligence: p.intelligence,
      vitality: p.vitality,
      armor: p.armor,
      critChance: p.critChance,
      moveSpeed: p.moveSpeed,
      attackSpeed: p.attackSpeed,
      critDamage: p.critDamage,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get weapon damage bonus
  // ──────────────────────────────────────────────────────────────
  private _getWeaponDamage(): number {
    const weapon = this._state.player.equipment.weapon;
    if (!weapon) return 5;
    const stats = weapon.stats as any;
    return (stats.damage || 0) + (stats.bonusDamage || 0);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get life steal percentage
  // ──────────────────────────────────────────────────────────────
  private _getLifeSteal(): number {
    let ls = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = this._state.player.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.lifeSteal) ls += stats.lifeSteal;
      }
    }
    const talentBonusesLs = this._getTalentBonuses();
    if (talentBonusesLs[TalentEffectType.LIFE_STEAL_PERCENT]) {
      ls += talentBonusesLs[TalentEffectType.LIFE_STEAL_PERCENT];
    }
    return Math.min(25, ls); // Cap at 25%
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get skill damage
  // ──────────────────────────────────────────────────────────────
  private _getSkillDamage(def: any): number {
    return combatGetSkillDamage(this._getCombatContext(), def);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get enemy effective speed
  // ──────────────────────────────────────────────────────────────
  private _getEnemyEffectiveSpeed(enemy: DiabloEnemy): number {
    let speed = enemy.speed;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) return 0;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) speed *= 0.5;
    if (this._state.weather === Weather.STORMY) speed *= 1.1;
    return speed;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get mouse world position
  // ──────────────────────────────────────────────────────────────
  private _getMouseWorldPos(): { x: number; z: number } {
    const p = this._state.player;

    // First person: project forward from player in look direction
    if (this._firstPerson) {
      const range = 10;
      return {
        x: p.x - Math.sin(this._fpYaw) * range,
        z: p.z - Math.cos(this._fpYaw) * range,
      };
    }

    // Use accurate raycast against ground plane
    const hit = this._renderer.getWorldPosAtScreen(this._mouseX, this._mouseY);
    if (hit) return hit;

    // Fallback: approximate projection
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dx = (this._mouseX - w / 2) / (w / 2);
    const dz = (this._mouseY - h / 2) / (h / 2);
    const scale = (this._state.camera.distance || 18) * 0.6;
    return { x: p.x + dx * scale, z: p.z + dz * scale };
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Spawn initial enemies (extracted from _startMap)
  // ──────────────────────────────────────────────────────────────
  private _spawnInitialEnemies(): void {
    const initialCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < initialCount; i++) {
      this._spawnEnemy();
    }
    // Ensure no enemies spawn too close to the player
    const p = this._state.player;
    for (const e of this._state.enemies) {
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 60) {
        const angle = Math.atan2(dz, dx);
        e.x = p.x + Math.cos(angle) * (60 + Math.random() * 20);
        e.z = p.z + Math.sin(angle) * (60 + Math.random() * 20);
        e.y = getTerrainHeight(e.x, e.z);
      }
    }
    // Spawn special night boss if time is NIGHT, otherwise spawn day boss
    if (this._state.timeOfDay === TimeOfDay.NIGHT) {
      this._spawnNightBoss();
    } else {
      this._spawnDayBoss();
    }
  }

  private _spawnNightBoss(): void {
    const nightBossType = NIGHT_BOSS_MAP[this._state.currentMap];
    if (!nightBossType) return;
    // Check if night boss already exists
    const existingNightBoss = this._state.enemies.find(
      (e) => e.type === nightBossType && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING
    );
    if (existingNightBoss) return;

    const def = ENEMY_DEFS[nightBossType];
    if (!def) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2 - 5;
    const halfD = ((mapCfg as any).depth || mapCfg.width) / 2 - 5;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: nightBossType,
      x: (Math.random() - 0.5) * halfW * 1.2,
      y: 0,
      z: (Math.random() - 0.5) * halfD * 1.2,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * diffCfg.hpMult,
      maxHp: def.hp * diffCfg.hpMult,
      damage: def.damage * diffCfg.damageMult,
      damageType: ENEMY_DAMAGE_TYPES[nightBossType] || DamageType.PHYSICAL,
      armor: def.armor * diffCfg.armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange,
      xpReward: Math.round(def.xpReward * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: true,
      bossName: def.name,
      scale: def.scale,
      level: def.level,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;

    // Announce the night boss spawn
    const px = this._state.player.x;
    const py = this._state.player.y;
    const pz = this._state.player.z;
    this._addFloatingText(px, py + 4, pz, `${def.name} has awoken!`, "#ff44ff");
    this._addFloatingText(px, py + 3, pz, "A creature of the night stalks this land...", "#cc88ff");
    this._playSound('boss');
  }

  private _spawnDayBoss(): void {
    const dayBossType = DAY_BOSS_MAP[this._state.currentMap];
    if (!dayBossType) return;
    // Don't spawn during night (night has its own boss)
    if (this._state.timeOfDay === TimeOfDay.NIGHT) return;
    // Check if day boss already exists
    const existing = this._state.enemies.find(
      (e) => e.type === dayBossType && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING
    );
    if (existing) return;

    const def = ENEMY_DEFS[dayBossType];
    if (!def) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2 - 5;
    const halfD = ((mapCfg as any).depth || mapCfg.width) / 2 - 5;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: dayBossType,
      x: (Math.random() - 0.5) * halfW * 1.2,
      y: 0,
      z: (Math.random() - 0.5) * halfD * 1.2,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * diffCfg.hpMult,
      maxHp: def.hp * diffCfg.hpMult,
      damage: def.damage * diffCfg.damageMult,
      damageType: ENEMY_DAMAGE_TYPES[dayBossType] || DamageType.PHYSICAL,
      armor: def.armor * diffCfg.armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange,
      xpReward: Math.round(def.xpReward * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: true,
      bossName: def.name,
      scale: def.scale,
      level: def.level,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;

    const px = this._state.player.x;
    const py = this._state.player.y;
    const pz = this._state.player.z;
    this._addFloatingText(px, py + 4, pz, `${def.name} roams this land!`, "#ffaa44");
    // Boss entrance effects
    this._renderer.shakeCamera(0.5, 0.8);
    this._addFloatingText(enemy.x, enemy.y + 4, enemy.z, `${enemy.bossName || 'BOSS'} APPEARS!`, '#ff4444');
    this._slowMotionTimer = 1.0;
    this._slowMotionScale = 0.4;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Spawn initial chests (extracted from _startMap)
  // ──────────────────────────────────────────────────────────────
  private _spawnInitialChests(): void {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const mapW = mapCfg.width;
    const mapD = (mapCfg as any).depth || (mapCfg as any).height || mapCfg.width;
    const chestCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chestCount; i++) {
      const halfW = mapW / 2 - 5;
      const halfD = mapD / 2 - 5;
      const cx = (Math.random() * 2 - 1) * halfW;
      const cz = (Math.random() * 2 - 1) * halfD;
      const roll = Math.random();
      const rarity = roll < 0.02
        ? ItemRarity.EPIC
        : roll < 0.12
          ? ItemRarity.RARE
          : roll < 0.45
            ? ItemRarity.UNCOMMON
            : ItemRarity.COMMON;
      const chestItems = this._generateChestLoot(rarity);
      const chest: DiabloTreasureChest = {
        id: this._genId(),
        x: cx,
        y: 0,
        z: cz,
        opened: false,
        rarity,
        items: chestItems,
      };
      this._state.treasureChests.push(chest);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Check if save exists
  // ──────────────────────────────────────────────────────────────
  private _hasSave(): boolean {
    return hasSave();
  }

  // ──────────────────────────────────────────────────────────────
  //  SAVE GAME
  // ──────────────────────────────────────────────────────────────
  private _saveGame(): void {
    saveGame({ state: this._state, menuEl: this._menuEl, chestsOpened: this._chestsOpened, goldEarnedTotal: this._goldEarnedTotal, totalKills: this._totalKills });
  }

  // ──────────────────────────────────────────────────────────────
  //  TOWN PORTAL — save & return to character select
  // ──────────────────────────────────────────────────────────────
  private _useTownPortal(): void {
    this._saveGame();
    this._stopBgm();
    this._hud.style.display = "none";
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._portalActive = false;
    this._state.phase = DiabloPhase.CLASS_SELECT;
    this._showClassSelect();
  }

  // ──────────────────────────────────────────────────────────────
  //  LOAD PLAYER ONLY (for continuing saved character to map select)
  // ──────────────────────────────────────────────────────────────
  private _loadPlayerOnly(): void {
    const raw = localStorage.getItem("diablo_save");
    if (!raw) return;
    let save: any;
    try { save = JSON.parse(raw); } catch (e) { console.error('Save data corrupted:', e); this._showSaveRecoveryPrompt(); return; }
    this._state.player = {
      ...save.player,
      skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)),
      talents: save.playerTalents || save.player.talents || {},
      talentPoints: save.playerTalentPoints ?? save.player.talentPoints ?? 0,
      potions: save.playerPotions || save.player.potions || [],
      potionSlots: save.playerPotionSlots || save.player.potionSlots || [null, null, null, null],
      potionCooldown: 0,
      activePotionBuffs: [],
      lanternOn: save.player.lanternOn || false,
      skillBranches: save.player.skillBranches || {},
      unlockedSkills: save.player.unlockedSkills || [],
      activeRunes: save.player.activeRunes || {},
      unlockedRunes: save.player.unlockedRunes || [],
      excaliburFragments: save.player?.excaliburFragments || save.excaliburFragments || [],
      excaliburReforged: save.player?.excaliburReforged || save.excaliburReforged || false,
      mordredDefeated: save.player?.mordredDefeated || save.mordredDefeated || false,
      // Retention features
      achievements: save.player?.achievements || save.achievements || [],
      achievementNotifications: [],
      dailyChallenges: save.player?.dailyChallenges || save.dailyChallenges || [],
      dailyStreak: save.player?.dailyStreak ?? save.dailyStreak ?? 0,
      lastDailyDate: save.player?.lastDailyDate || save.lastDailyDate || '',
      unlockedCosmetics: save.player?.unlockedCosmetics || save.unlockedCosmetics || [],
      activeTrail: save.player?.activeTrail ?? save.activeTrail ?? null,
      activeAura: save.player?.activeAura ?? save.activeAura ?? null,
      activeTitle: save.player?.activeTitle ?? save.activeTitle ?? null,
      stats: save.player?.stats || {
        totalKills: 0, totalBossKills: 0, totalDeaths: 0,
        totalDamageDealt: 0, totalDamageTaken: 0,
        totalGoldEarned: 0, totalGoldSpent: 0,
        totalItemsFound: 0, totalLegendariesFound: 0,
        totalCritsLanded: 0, totalDodges: 0,
        totalPotionsUsed: 0, totalQuestsCompleted: 0,
        totalMapsCleared: 0, highestCrit: 0,
        longestKillStreak: 0, currentKillStreak: 0,
        timePlayed: 0, favoriteClass: '',
        classPlayTime: {},
      },
      // Prestige system
      prestigeLevel: save.player?.prestigeLevel ?? save.prestigeLevel ?? 0,
      prestigeBonuses: save.player?.prestigeBonuses ?? save.prestigeBonuses ?? { damagePercent: 0, hpPercent: 0, xpPercent: 0, goldPercent: 0 },
      // Hardcore mode
      isHardcore: save.player?.isHardcore ?? save.isHardcore ?? false,
    };
    // Restore bounties
    this._state.activeBounties = save.activeBounties || [];
    this._state.completedBountyIds = save.completedBountyIds || [];
    this._state.difficulty = save.difficulty || DiabloDifficulty.DAGGER;
    this._state.persistentInventory = save.persistentInventory;
    this._state.persistentGold = save.persistentGold;
    this._state.persistentLevel = save.persistentLevel;
    this._state.persistentXp = save.persistentXp;
    this._state.persistentStash = (() => { const s = save.persistentStash || []; while (s.length < 150) s.push({ item: null }); return s; })();
    this._state.completedMaps = save.completedMaps || {};
    this._chestsOpened = save.chestsOpened || 0;
    this._goldEarnedTotal = save.goldEarnedTotal || 0;
    this._totalKills = save.totalKills || 0;
    this._state.activeQuests = save.activeQuests || [];
    this._state.completedQuestIds = save.completedQuestIds || [];
  }

  // ──────────────────────────────────────────────────────────────
  //  LOAD GAME
  // ──────────────────────────────────────────────────────────────
  private _loadGame(): void {
    const raw = localStorage.getItem("diablo_save");
    if (!raw) return;
    let save: any;
    try { save = JSON.parse(raw); } catch (e) { console.error('Save data corrupted:', e); this._showSaveRecoveryPrompt(); return; }
    // Restore player state
    this._state.player = {
      ...save.player,
      skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)),
      talents: save.playerTalents || save.player.talents || {},
      talentPoints: save.playerTalentPoints ?? save.player.talentPoints ?? 0,
      potions: save.playerPotions || save.player.potions || [],
      potionSlots: save.playerPotionSlots || save.player.potionSlots || [null, null, null, null],
      potionCooldown: 0,
      activePotionBuffs: [],
      lanternOn: save.player.lanternOn || false,
      skillBranches: save.player.skillBranches || {},
      unlockedSkills: save.player.unlockedSkills || [],
      activeRunes: save.player.activeRunes || {},
      unlockedRunes: save.player.unlockedRunes || [],
      excaliburFragments: save.player?.excaliburFragments || save.excaliburFragments || [],
      excaliburReforged: save.player?.excaliburReforged || save.excaliburReforged || false,
      mordredDefeated: save.player?.mordredDefeated || save.mordredDefeated || false,
      stats: save.player?.stats || {
        totalKills: 0, totalBossKills: 0, totalDeaths: 0,
        totalDamageDealt: 0, totalDamageTaken: 0,
        totalGoldEarned: 0, totalGoldSpent: 0,
        totalItemsFound: 0, totalLegendariesFound: 0,
        totalCritsLanded: 0, totalDodges: 0,
        totalPotionsUsed: 0, totalQuestsCompleted: 0,
        totalMapsCleared: 0, highestCrit: 0,
        longestKillStreak: 0, currentKillStreak: 0,
        timePlayed: 0, favoriteClass: '',
        classPlayTime: {},
      },
      // Prestige system
      prestigeLevel: save.player?.prestigeLevel ?? save.prestigeLevel ?? 0,
      prestigeBonuses: save.player?.prestigeBonuses ?? save.prestigeBonuses ?? { damagePercent: 0, hpPercent: 0, xpPercent: 0, goldPercent: 0 },
      // Hardcore mode
      isHardcore: save.player?.isHardcore ?? save.isHardcore ?? false,
    };
    // Restore bounties
    this._state.activeBounties = save.activeBounties || [];
    this._state.completedBountyIds = save.completedBountyIds || [];
    // Restore lantern light if it was on
    if (this._state.player.lanternOn && this._state.player.equipment.lantern) {
      const cfg = LANTERN_CONFIGS[this._state.player.equipment.lantern.name];
      if (cfg) this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
    }
    this._state.currentMap = save.currentMap;
    this._state.timeOfDay = save.timeOfDay || TimeOfDay.DAY;
    this._state.killCount = save.killCount;
    this._state.persistentInventory = save.persistentInventory;
    this._state.persistentGold = save.persistentGold;
    this._state.persistentLevel = save.persistentLevel;
    this._state.persistentXp = save.persistentXp;
    this._state.persistentStash = (() => { const s = save.persistentStash || []; while (s.length < 150) s.push({ item: null }); return s; })();
    this._state.mapCleared = save.mapCleared;
    this._state.difficulty = save.difficulty || DiabloDifficulty.DAGGER;
    this._state.activeQuests = save.activeQuests || [];
    this._state.completedQuestIds = save.completedQuestIds || [];
    this._state.completedMaps = save.completedMaps || {};
    this._chestsOpened = save.chestsOpened || 0;
    this._goldEarnedTotal = save.goldEarnedTotal || 0;
    this._totalKills = save.totalKills || 0;
    // Restore Greater Rift progress
    if (save.greaterRift) {
      this._state.greaterRift.bestRiftLevel = save.greaterRift.bestRiftLevel || 0;
      this._state.greaterRift.keystones = save.greaterRift.keystones ?? 3;
    }
    // Rebuild the map
    this._renderer.buildMap(this._state.currentMap);
    this._renderer.buildPlayer(this._state.player.class);
    this._renderer.applyTimeOfDay(this._state.timeOfDay, this._state.currentMap);
    // Spawn fresh enemies and chests (or vendors for Camelot)
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._state.vendors = [];
    this._state.townfolk = [];
    if (this._state.currentMap === DiabloMapId.CAMELOT) {
      this._state.vendors = VENDOR_DEFS.map((vd) => ({
        id: this._genId(),
        type: vd.type,
        name: vd.name,
        x: vd.x,
        z: vd.z,
        inventory: generateVendorInventory(vd.type, this._state.player.level),
        icon: vd.icon,
      }));
      if ((this._renderer as any).syncVendors) {
        (this._renderer as any).syncVendors(
          this._state.vendors.map((v) => ({ x: v.x, z: v.z, type: v.type, name: v.name, icon: v.icon }))
        );
      }
      this._spawnCamelotTownfolk();
    } else {
      this._spawnInitialEnemies();
      this._spawnInitialChests();
    }
    // Set to playing
    this._state.phase = DiabloPhase.PLAYING;
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();
  }

  // ──────────────────────────────────────────────────────────────
  //  SAVE RECOVERY PROMPT
  // ──────────────────────────────────────────────────────────────
  private _showSaveRecoveryPrompt(): void {
    showSaveRecoveryPrompt(this._menuEl);
  }

  // ──────────────────────────────────────────────────────────────
  //  SHARED STASH SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showStash(): void { screenShowStash(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  VENDOR SHOP
  // ──────────────────────────────────────────────────────────────
  private _vendorDialogueIdx: Record<string, number> = {};

  private _showVendorShop(vendor: DiabloVendor): void { screenShowVendorShop(this._screenCtx(), vendor); }

  // ──────────────────────────────────────────────────────────────
  //  MINIMAP
  // ──────────────────────────────────────────────────────────────
  private _drawMinimapContent(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawMinimapContent(ctx, {
      state: this._state,
      portalActive: this._portalActive,
      portalX: this._portalX,
      portalZ: this._portalZ,
      firstPerson: this._firstPerson,
    }, W, H);
  }

  private _updateMinimap(): void {
    this._drawMinimapContent(this._hudRefs.minimapCtx, 200, 200);
  }

  private _updateFullmap(): void {
    this._drawMinimapContent(this._hudRefs.fullmapCtx, 400, 400);
  }

  // ──────────────────────────────────────────────────────────────
  //  MAP COMPLETION
  // ──────────────────────────────────────────────────────────────
  private _onMapComplete(): void {
    const p = this._state.player;
    const mapId = this._state.currentMap;
    const reward = MAP_COMPLETION_REWARDS[mapId];
    if (!reward) return;

    const completionKey = `${mapId}_${this._state.difficulty}_${this._state.timeOfDay}`;
    const isFirstClear = !this._state.completedMaps[completionKey];
    const isNight = this._state.timeOfDay === TimeOfDay.NIGHT;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    let goldReward = Math.floor(reward.gold * diffCfg.goldMult);
    let xpReward = Math.floor(reward.xp * diffCfg.xpMult);
    if (isNight) { goldReward = Math.floor(goldReward * 1.5); xpReward = Math.floor(xpReward * 1.5); }
    if (isFirstClear) { goldReward *= 2; xpReward *= 2; }

    p.gold += goldReward;
    p.xp += xpReward;
    p.stats.totalMapsCleared++;
    p.stats.totalGoldEarned += goldReward;

    const item = this._pickRandomItemOfRarity(reward.guaranteedDropRarity);
    if (item) {
      const loot: DiabloLoot = {
        id: this._genId(), item: { ...item, id: this._genId() },
        x: p.x + (Math.random() * 2 - 1), y: 0, z: p.z + (Math.random() * 2 - 1), timer: 0,
      };
      this._state.loot.push(loot);
    }

    this._addFloatingText(p.x, p.y + 4, p.z, "MAP CLEARED!", "#ffd700");
    this._addFloatingText(p.x, p.y + 3, p.z, `+${goldReward} Gold  +${xpReward} XP`, "#ffd700");
    if (isFirstClear) {
      this._addFloatingText(p.x, p.y + 2, p.z, "FIRST CLEAR BONUS!", "#44ff44");
    }
    // Achievement tracking: map clear
    const mapCompletedCount = Object.values(this._state.completedMaps).filter(Boolean).length;
    this._updateAchievement('explorer', mapCompletedCount);
    this._updateAchievement('world_walker', mapCompletedCount);
    this._updateAchievement('completionist', mapCompletedCount);
    this._updateAchievement('gold_hoarder', p.gold);
    // Deathless achievement
    if (this._mapDeathCount === 0) {
      this._updateAchievement('deathless', 1);
    }
    this._addFloatingText(p.x, p.y + 1, p.z, reward.bonusMessage, "#c8a84e");

    this._state.completedMaps[completionKey] = true;

    this._updateQuestProgress(QuestType.CLEAR_MAP, mapId);
  }

  // ──────────────────────────────────────────────────────────────
  //  DEATH / RESPAWN
  // ──────────────────────────────────────────────────────────────
  private _triggerDeath(): void {
    if (this._isDead) return;
    this._isDead = true;
    this._comboCount = 0;
    this._comboTimer = 0;
    this._comboMultiplier = 1.0;
    this._state.deathCount++;
    this._mapDeathCount++;
    const p = this._state.player;
    // Stat tracking: death
    p.stats.totalDeaths++;

    // Hardcore permadeath
    if (p.isHardcore) {
      localStorage.removeItem('diablo_save');
      this._addFloatingText(p.x, p.y + 4, p.z, 'HARDCORE DEATH - CHARACTER LOST', '#ff0000');
      this._playSound('death');
      setTimeout(() => {
        this._showHardcoreDeathScreen();
      }, 2000);
      return; // Don't allow respawn
    }
    p.stats.currentKillStreak = 0;

    // Record death location
    this._deathLocationX = p.x;
    this._deathLocationZ = p.z;

    this._deathGoldDrop = 0;
    this._state.deathGoldLoss = 0;
    this._state.respawnTimer = 5.0;

    this._playSound('death');

    this._hudRefs.deathOverlay.style.display = "flex";
    const goldEl = this._hudRefs.deathOverlay.querySelector("#diablo-gold-loss") as HTMLDivElement;
    if (goldEl) goldEl.textContent = "";
    // Death recap
    const recapEl = this._hudRefs.deathOverlay.querySelector("#diablo-death-recap") as HTMLDivElement;
    if (recapEl) {
      let recapHtml = this._lastDeathCause ? `<div>Slain by: ${this._lastDeathCause}</div>` : '<div>You have been slain.</div>';
      const now = performance.now();
      const recent = this._recentDamage.filter(d => now - d.time < 5000);
      if (recent.length > 0) {
        recapHtml += '<div style="margin-top:8px;font-size:13px;color:#aaa;">Last hits:</div>';
        for (const d of recent.slice(-5)) {
          const timeAgo = ((now - d.time) / 1000).toFixed(1);
          recapHtml += `<div style="font-size:12px;color:#cc8888;margin-top:2px;">${d.source}: ${Math.round(d.amount)} ${d.type} (${timeAgo}s ago)</div>`;
        }
      }
      recapEl.innerHTML = recapHtml;
    }
  }

  private _updateDeathRespawn(dt: number): void {
    this._state.respawnTimer -= dt;
    const timerEl = this._hudRefs.deathOverlay.querySelector("#diablo-respawn-timer") as HTMLDivElement;
    if (timerEl) timerEl.textContent = `Respawning in ${Math.ceil(this._state.respawnTimer)}...`;

    if (this._state.respawnTimer <= 0) {
      this._isDead = false;
      this._hudRefs.deathOverlay.style.display = "none";
      const p = this._state.player;
      if (this._state.currentMap === DiabloMapId.CAMELOT) {
        p.x = 0;
        p.z = 0;
      } else {
        const rMapCfg = MAP_CONFIGS[this._state.currentMap];
        const rHalfW = rMapCfg.width / 2;
        const rHalfD = rMapCfg.depth / 2;
        const rPadX = rMapCfg.width * 0.12;
        const rPadZ = rMapCfg.depth * 0.12;
        const rCorners = [
          { x: -rHalfW + rPadX, z: -rHalfD + rPadZ },
          { x: rHalfW - rPadX, z: -rHalfD + rPadZ },
          { x: -rHalfW + rPadX, z: rHalfD - rPadZ },
          { x: rHalfW - rPadX, z: rHalfD - rPadZ },
        ];
        const rCorner = rCorners[Math.floor(Math.random() * rCorners.length)];
        p.x = rCorner.x + (Math.random() * 2 - 1);
        p.z = rCorner.z + (Math.random() * 2 - 1);
      }
      p.hp = Math.floor(p.maxHp * 0.5);
      p.mana = Math.floor(p.maxMana * 0.5);
      p.invulnTimer = 3.0;
      p.statusEffects = [];
      this._state.respawnTimer = 0;
    }
  }

  // ──────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────
  //  HARDCORE DEATH SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showHardcoreDeathScreen(): void {
    this._menuEl.innerHTML = '';
    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:200;';
    panel.innerHTML = `
      <div style="text-align:center;color:#ff4444;font-family:Georgia,serif;max-width:500px;">
        <h1 style="font-size:48px;margin-bottom:10px;">FALLEN</h1>
        <h2 style="color:#aaa;font-size:20px;">Your hardcore character has perished.</h2>
        <p style="color:#888;font-size:14px;margin:15px 0;">
          Level ${this._state.player.level} ${this._state.player.class}<br>
          ${this._state.player.stats.totalKills} enemies slain<br>
          Prestige ${this._state.player.prestigeLevel}
        </p>
        <p style="color:#666;font-style:italic;margin-bottom:20px;">The bravest warriors fall. But their legend endures.</p>
        <button id="hc-restart" style="padding:10px 24px;background:#cc0000;color:#fff;border:2px solid #ff4444;border-radius:6px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">
          New Character
        </button>
      </div>
    `;
    this._menuEl.appendChild(panel);
    document.getElementById('hc-restart')?.addEventListener('click', () => {
      this._state = createDefaultState();
      this._isDead = false;
      this._hudState.hardcoreLabel = null;
      this._showClassSelect();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  PRESTIGE SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _prestige(): void {
    const p = this._state.player;
    const oldPrestige = p.prestigeLevel;

    const keepCosmetics = [...p.unlockedCosmetics];
    const keepAchievements = [...p.achievements];
    const keepKeystones = this._state.greaterRift.keystones;
    const keepBestGR = this._state.greaterRift.bestRiftLevel;
    const keepPets = [...p.pets];
    const keepStash = [...this._state.persistentStash];
    const keepStats = { ...p.stats };
    const keepDailies = [...p.dailyChallenges];
    const keepStreak = p.dailyStreak;
    const keepLastDaily = p.lastDailyDate;

    const cls = p.class;
    const newPlayer = createDefaultPlayer(cls);

    newPlayer.prestigeLevel = oldPrestige + 1;
    newPlayer.prestigeBonuses = {
      damagePercent: (oldPrestige + 1) * 5,
      hpPercent: (oldPrestige + 1) * 5,
      xpPercent: (oldPrestige + 1) * 10,
      goldPercent: (oldPrestige + 1) * 10,
    };

    newPlayer.unlockedCosmetics = keepCosmetics;
    newPlayer.achievements = keepAchievements;
    newPlayer.pets = keepPets;
    newPlayer.stats = keepStats;
    newPlayer.dailyChallenges = keepDailies;
    newPlayer.dailyStreak = keepStreak;
    newPlayer.lastDailyDate = keepLastDaily;

    this._state.player = newPlayer;
    this._state.greaterRift.keystones = keepKeystones + 5;
    this._state.greaterRift.bestRiftLevel = keepBestGR;
    this._state.persistentStash = keepStash;
    this._state.persistentGold = 0;
    this._state.persistentLevel = 1;
    this._state.persistentXp = 0;
    this._state.completedMaps = {};

    this._addFloatingText(0, 3, 0, `PRESTIGE ${newPlayer.prestigeLevel}!`, '#ffd700');
    this._playSound('levelup');
    this._saveGame();
  }

  private _showPrestigePanel(): void {
    this._menuEl.innerHTML = '';
    const p = this._state.player;
    const nextLevel = p.prestigeLevel + 1;

    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,5,0,0.95);border:3px solid #ffd700;border-radius:8px;padding:25px;color:#fff;font-family:Georgia,serif;max-width:500px;text-align:center;z-index:100;';

    panel.innerHTML = `
      <h2 style="color:#ffd700;margin:0 0 15px;">Prestige ${nextLevel}</h2>
      <p style="color:#ddd;font-size:14px;margin-bottom:10px;">Reset your level to 1 and start anew with permanent bonuses.</p>
      <div style="text-align:left;font-size:13px;color:#aaa;margin:10px 0;padding:10px;background:rgba(255,255,255,0.05);border-radius:4px;">
        <div style="color:#44ff44;">Keep: Achievements, Cosmetics, Pets, Stash, Stats</div>
        <div style="color:#44ff44;">Keep: GR Keystones (+5 bonus), Best GR Level</div>
        <div style="color:#ff4444;">Lose: Level, Gold, Equipment, Inventory, Map Progress</div>
        <div style="color:#ffd700;margin-top:8px;">Permanent Bonuses (Prestige ${nextLevel}):</div>
        <div>+${nextLevel * 5}% Damage | +${nextLevel * 5}% HP</div>
        <div>+${nextLevel * 10}% XP | +${nextLevel * 10}% Gold</div>
      </div>
      <button id="prestige-confirm" style="padding:10px 24px;background:linear-gradient(180deg,#ffd700,#b8860b);color:#000;border:2px solid #ffd700;border-radius:6px;cursor:pointer;font-family:Georgia,serif;font-size:16px;font-weight:bold;margin:5px;">Prestige Now</button>
      <button id="prestige-cancel" style="padding:8px 20px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;margin:5px;">Cancel</button>
    `;
    this._menuEl.appendChild(panel);

    document.getElementById('prestige-confirm')?.addEventListener('click', () => {
      this._prestige();
      this._showMapSelect();
    });
    document.getElementById('prestige-cancel')?.addEventListener('click', () => {
      this._showMapSelect();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  BOUNTY SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _generateBounties(): void {
    this._state.activeBounties = this._state.activeBounties.filter(b => !b.isComplete);
    if (this._state.activeBounties.length >= 5) return;

    const bountyNames = [
      'Grimfang the Devourer', 'Bloodclaw the Merciless', 'Shadow Fang',
      'The Butcher of Bones', 'Venomweaver', 'Hellspawn Krul',
      'Duskbane', 'The Iron Maiden', 'Rotgut the Festering',
      'Stormbreaker Kael', 'Nightstalker Prime', 'The Plague Bringer',
    ];

    const maps = Object.values(DiabloMapId).filter(id =>
      id !== DiabloMapId.CAMELOT && id !== DiabloMapId.CITY && id !== DiabloMapId.CITY_RUINS
    );

    while (this._state.activeBounties.length < 5) {
      const map = maps[Math.floor(Math.random() * maps.length)] as DiabloMapId;
      const mapCfg = MAP_CONFIGS[map];
      if (!mapCfg) continue;
      const enemyType = mapCfg.enemyTypes[Math.floor(Math.random() * mapCfg.enemyTypes.length)];
      const name = bountyNames[Math.floor(Math.random() * bountyNames.length)];
      const id = `bounty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      if (this._state.completedBountyIds.includes(id)) continue;

      const playerLevel = this._state.player.level;
      this._state.activeBounties.push({
        id,
        targetName: name,
        targetType: enemyType,
        mapId: map,
        description: `Hunt down ${name} in ${mapCfg.name}.`,
        reward: {
          gold: 500 + playerLevel * 100,
          xp: 200 + playerLevel * 50,
          keystones: Math.random() < 0.3 ? 1 : undefined,
          guaranteedRarity: Math.random() < 0.2 ? ItemRarity.LEGENDARY : ItemRarity.RARE,
        },
        isComplete: false,
        isActive: true,
      });
    }
  }

  private _spawnBountyTargets(): void {
    for (const bounty of this._state.activeBounties) {
      if (bounty.isComplete || bounty.mapId !== this._state.currentMap) continue;

      const mapCfg = MAP_CONFIGS[this._state.currentMap];
      const halfW = mapCfg.width / 2;
      const halfD = ((mapCfg as any).depth || mapCfg.width) / 2;
      const bx = (Math.random() * 0.6 + 0.2) * mapCfg.width - halfW;
      const bz = (Math.random() * 0.6 + 0.2) * ((mapCfg as any).depth || mapCfg.width) - halfD;

      const enemyDef = ENEMY_DEFS[bounty.targetType];
      const baseHp = (enemyDef?.hp || 200) * 3;
      const baseDmg = (enemyDef?.damage || 20) * 2;

      const bountyEnemy: DiabloEnemy = {
        id: `bounty-enemy-${bounty.id}`,
        type: bounty.targetType,
        x: bx, y: 0, z: bz,
        angle: Math.random() * Math.PI * 2,
        hp: baseHp, maxHp: baseHp,
        damage: baseDmg,
        damageType: DamageType.PHYSICAL,
        armor: 15,
        speed: 3.5,
        state: EnemyState.PATROL,
        targetId: null,
        attackTimer: 0,
        attackRange: 2.5,
        aggroRange: 15,
        xpReward: bounty.reward.xp,
        lootTable: [],
        deathTimer: 0,
        stateTimer: 0,
        patrolTarget: null,
        statusEffects: [],
        isBoss: true,
        bossName: bounty.targetName,
        scale: 1.8,
        level: this._state.player.level + 2,
        behavior: EnemyBehavior.MELEE_BASIC,
      };

      this._state.enemies.push(bountyEnemy);
    }
  }

  //  BOSS ABILITIES
  // ──────────────────────────────────────────────────────────────
  private _updateBossAbilities(dt: number): void {
    const p = this._state.player;
    const phases = BOSS_PHASE_CONFIGS[this._state.currentMap];
    if (!phases || phases.length === 0) return;

    for (const enemy of this._state.enemies) {
      if (!enemy.isBoss) continue;
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;

      if (enemy.bossPhase === undefined) enemy.bossPhase = 0;
      if (enemy.bossAbilityCooldown === undefined) enemy.bossAbilityCooldown = 3;

      const hpPct = enemy.hp / enemy.maxHp;
      let targetPhase = 0;
      for (let i = phases.length - 1; i >= 0; i--) {
        if (hpPct <= phases[i].hpThreshold) {
          targetPhase = i;
        }
      }

      if (targetPhase > enemy.bossPhase) {
        enemy.bossPhase = targetPhase;
        const phase = phases[targetPhase];
        enemy.damage = enemy.damage * phase.damageMultiplier;
        enemy.speed = enemy.speed * phase.speedMultiplier;
        this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, phase.name, "#ff00ff");
        enemy.bossAbilityCooldown = 1.0;
      }

      const phase = phases[enemy.bossPhase];
      if (!phase || phase.abilities.length === 0) continue;

      if (enemy.bossShieldTimer !== undefined && enemy.bossShieldTimer > 0) {
        enemy.bossShieldTimer -= dt;
      }

      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (enemy.bossAbilityCooldown > 0) continue;

      const dist = this._dist(enemy.x, enemy.z, p.x, p.z);
      if (dist > enemy.aggroRange * 2) continue;

      const ability = phase.abilities[Math.floor(Math.random() * phase.abilities.length)];
      enemy.bossAbilityCooldown = 4.0;

      switch (ability) {
        case BossAbility.GROUND_SLAM: {
          // Show telegraph before impact
          this._renderer.showTelegraph(`gs-${enemy.id}`, enemy.x, enemy.z, 6, 0xff4400, 1.0);
          const aoe: DiabloAOE = {
            id: this._genId(),
            x: enemy.x, y: 0, z: enemy.z,
            radius: 6, damage: enemy.damage * 1.5,
            damageType: DamageType.PHYSICAL,
            duration: 0.5, timer: 0,
            ownerId: enemy.id, tickInterval: 0.5, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(aoe);
          this._renderer.spawnParticles(ParticleType.DUST, enemy.x, enemy.y + 0.5, enemy.z, 20, this._state.particles);
          this._renderer.shakeCamera(0.3, 0.4);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "GROUND SLAM!", "#ff8844");
          break;
        }
        case BossAbility.CHARGE: {
          const dx = p.x - enemy.x;
          const dz = p.z - enemy.z;
          const cLen = Math.sqrt(dx * dx + dz * dz);
          if (cLen > 0) {
            enemy.x += (dx / cLen) * 6;
            enemy.z += (dz / cLen) * 6;
          }
          if (this._dist(enemy.x, enemy.z, p.x, p.z) < 3 && p.invulnTimer <= 0) {
            const dmg = Math.max(1, enemy.damage * 2 - p.armor * 0.3);
            p.hp -= dmg;
            this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(dmg)}`, "#ff4444");
            if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); }
          }
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "CHARGE!", "#ffaa00");
          break;
        }
        case BossAbility.SUMMON_ADDS: {
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const addEnemy: DiabloEnemy = {
              id: this._genId(),
              type: EnemyType.SKELETON_WARRIOR,
              x: enemy.x + Math.cos(angle) * 4, y: 0, z: enemy.z + Math.sin(angle) * 4,
              angle: Math.random() * Math.PI * 2,
              hp: enemy.maxHp * 0.1, maxHp: enemy.maxHp * 0.1,
              damage: enemy.damage * 0.3, damageType: DamageType.PHYSICAL, armor: 2, speed: 4,
              state: EnemyState.CHASE, targetId: null,
              attackTimer: 1.0, attackRange: 2.0, aggroRange: 20,
              xpReward: 10, lootTable: [], deathTimer: 0, stateTimer: 0,
              patrolTarget: null, statusEffects: [], isBoss: false,
              scale: 0.8, level: enemy.level,
            };
            this._state.enemies.push(addEnemy);
          }
          this._renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "SUMMON!", "#aa44ff");
          break;
        }
        case BossAbility.ENRAGE: {
          if (!enemy.bossEnraged) {
            enemy.bossEnraged = true;
            enemy.damage *= 1.5;
            enemy.speed *= 1.3;
            this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 25, this._state.particles);
            this._renderer.shakeCamera(0.2, 0.5);
            this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "ENRAGED!", "#ff0000");
          }
          break;
        }
        case BossAbility.SHIELD: {
          enemy.bossShieldTimer = 4.0;
          this._renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "SHIELD!", "#4488ff");
          break;
        }
        case BossAbility.METEOR_RAIN: {
          for (let i = 0; i < 5; i++) {
            const mx = p.x + (Math.random() * 12 - 6);
            const mz = p.z + (Math.random() * 12 - 6);
            // Show telegraph circle for each meteor
            this._renderer.showTelegraph(`meteor-${enemy.id}-${i}`, mx, mz, 3, 0xff2200, 1.5);
            const aoe: DiabloAOE = {
              id: this._genId(),
              x: mx, y: 0, z: mz,
              radius: 3, damage: enemy.damage * 1.2,
              damageType: DamageType.FIRE,
              duration: 1.0, timer: 0,
              ownerId: enemy.id, tickInterval: 0.5, lastTickTimer: 0,
            };
            this._state.aoeEffects.push(aoe);
          }
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 2, enemy.z, 30, this._state.particles);
          this._renderer.shakeCamera(0.4, 0.6);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "METEOR RAIN!", "#ff4400");
          break;
        }
        case BossAbility.FIRE_WALL: {
          const numWalls = 3;
          for (let w = 0; w < numWalls; w++) {
            const wallAngle = (this._state.time * 0.5) + (w * Math.PI * 2 / numWalls);
            const wallDist = 5 + Math.sin(this._state.time) * 2;
            const wx = enemy.x + Math.sin(wallAngle) * wallDist;
            const wz = enemy.z + Math.cos(wallAngle) * wallDist;
            const distToWall = Math.sqrt((p.x - wx) ** 2 + (p.z - wz) ** 2);
            if (distToWall < 2) {
              p.hp -= 20 * dt;
              if (!p.statusEffects.some(e => e.effect === StatusEffect.BURNING)) {
                p.statusEffects.push({ effect: StatusEffect.BURNING, duration: 3, source: 'fire_wall' });
              }
              if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); }
            }
          }
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "FIRE WALL!", "#ff4400");
          break;
        }
        case BossAbility.TELEPORT_STRIKE: {
          const behindAngle = p.angle + Math.PI;
          enemy.x = p.x + Math.sin(behindAngle) * 3;
          enemy.z = p.z + Math.cos(behindAngle) * 3;
          const tsDist = this._dist(enemy.x, enemy.z, p.x, p.z);
          if (tsDist < 4) {
            const dmg = enemy.damage * 2;
            if (p.invulnTimer <= 0) {
              p.hp -= dmg;
              this._addFloatingText(p.x, p.y + 2, p.z, `AMBUSH! ${Math.round(dmg)}`, '#ff4444');
              if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); }
            }
          }
          this._renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 1, enemy.z, 20, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "TELEPORT STRIKE!", "#aa44ff");
          break;
        }
        case BossAbility.DEATH_BEAM: {
          const beamDx = p.x - enemy.x;
          const beamDz = p.z - enemy.z;
          const beamLen = Math.sqrt(beamDx * beamDx + beamDz * beamDz);
          if (beamLen < 15) {
            const beamAngle = Math.atan2(beamDx, beamDz);
            const angleDiff = Math.abs(beamAngle - enemy.angle);
            if (angleDiff < 0.3 || angleDiff > Math.PI * 2 - 0.3) {
              p.hp -= 40 * dt;
              this._addFloatingText(p.x, p.y + 2, p.z, `${Math.round(40 * dt)}`, '#ff0000');
              if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); }
            }
          }
          enemy.angle = Math.atan2(beamDx, beamDz);
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1.5, enemy.z, 10, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "DEATH BEAM!", "#ff0000");
          break;
        }
        case BossAbility.ARENA_SHRINK: {
          for (let i = 0; i < 8; i++) {
            const asAngle = (i / 8) * Math.PI * 2;
            const asDist = 20 + Math.random() * 10;
            const ax = enemy.x + Math.sin(asAngle) * asDist;
            const az = enemy.z + Math.cos(asAngle) * asDist;
            // Show telegraph for each arena shrink zone
            this._renderer.showTelegraph(`arena-${enemy.id}-${i}`, ax, az, 4, 0xff0000, 2.0);
            this._state.aoeEffects.push({
              id: `arena-shrink-${this._nextId++}`,
              x: ax, y: 0, z: az,
              radius: 4,
              damage: 15,
              damageType: DamageType.FIRE,
              duration: 8,
              timer: 0,
              ownerId: enemy.id,
              tickInterval: 1,
              lastTickTimer: 0,
              statusEffect: StatusEffect.BURNING,
            });
          }
          this._renderer.shakeCamera(0.3, 0.5);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "ARENA SHRINK!", "#ff8844");
          break;
        }
        case BossAbility.MINION_FRENZY: {
          let buffCount = 0;
          for (const ally of this._state.enemies) {
            if (ally.id === enemy.id || ally.isBoss) continue;
            if (ally.state === EnemyState.DYING || ally.state === EnemyState.DEAD) continue;
            const allyDist = Math.sqrt((ally.x - enemy.x) ** 2 + (ally.z - enemy.z) ** 2);
            if (allyDist < 15) {
              ally.damage *= 1.5;
              ally.speed *= 1.3;
              buffCount++;
            }
          }
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 20, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, `MINION FRENZY! (${buffCount})`, "#ff4444");
          break;
        }
        case BossAbility.PHASE_TRANSITION: {
          enemy.bossShieldTimer = 3.0;
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.1);
          this._renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 1, enemy.z, 25, this._state.particles);
          this._renderer.shakeCamera(0.5, 0.8);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "PHASE TRANSITION!", "#00ffff");
          break;
        }
      }

      // Boss enrage timer (gets stronger over time)
      if (enemy.isBoss && !enemy.bossEnraged) {
        const fightDuration = enemy.stateTimer;
        if (fightDuration > 60) {
          enemy.bossEnraged = true;
          enemy.damage *= 2;
          enemy.speed *= 1.5;
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, 'ENRAGED!', '#ff0000');
          this._renderer.shakeCamera(0.6, 1.0);
        }
      }
    }
  }

  private _enemyFireProjectile(enemy: DiabloEnemy): void {
    const p = this._state.player;
    const dx = p.x - enemy.x;
    const dz = p.z - enemy.z;
    const angle = Math.atan2(dx, dz);
    const speed = 15;
    const proj: DiabloProjectile = {
      id: this._genId(),
      x: enemy.x, y: 1, z: enemy.z,
      vx: Math.sin(angle) * speed, vy: 0, vz: Math.cos(angle) * speed,
      speed,
      damage: enemy.damage * 0.8,
      damageType: enemy.damageType || DamageType.PHYSICAL,
      radius: 0.3,
      ownerId: enemy.id,
      isPlayerOwned: false,
      lifetime: 0,
      maxLifetime: 3.0,
    };
    this._state.projectiles.push(proj);
  }

  // ──────────────────────────────────────────────────────────────
  //  TALENT TREE
  // ──────────────────────────────────────────────────────────────
  private _getTalentBonuses(): Partial<Record<TalentEffectType, number>> {
    if (!this._talentsDirty) return this._cachedTalentBonuses;
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    const result: Partial<Record<TalentEffectType, number>> = {};
    for (const node of tree) {
      const rank = p.talents[node.id] || 0;
      if (rank > 0) {
        for (const eff of node.effects) {
          result[eff.type] = (result[eff.type] || 0) + eff.value * rank;
        }
      }
    }
    this._cachedTalentBonuses = result;
    this._talentsDirty = false;
    return result;
  }

  private _getTalentPointsInBranch(branch: number): number {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    let total = 0;
    for (const node of tree) {
      if (node.branch === branch) {
        total += (p.talents[node.id] || 0);
      }
    }
    return total;
  }

  private _showSkillTreeScreen(): void { screenShowSkillTreeScreen(this._screenCtx()); }

  private _showTalentTree(): void { screenShowTalentTree(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  LANTERN TOGGLE
  // ──────────────────────────────────────────────────────────────
  private _toggleLantern(): void {
    const p = this._state.player;
    if (!p.equipment.lantern) {
      this._addFloatingText(p.x, p.y + 2, p.z, "No lantern equipped!", "#ff4444");
      return;
    }
    p.lanternOn = !p.lanternOn;
    const cfg = LANTERN_CONFIGS[p.equipment.lantern.name];
    if (p.lanternOn && cfg) {
      this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
      this._addFloatingText(p.x, p.y + 2, p.z, "Lantern ON", "#ffcc44");
    } else {
      this._renderer.setPlayerLantern(false);
      this._addFloatingText(p.x, p.y + 2, p.z, "Lantern OFF", "#888888");
      p.lanternOn = false;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  POTION SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _useQuickPotion(type: PotionType.HEALTH | PotionType.MANA): void {
    const p = this._state.player;
    if (p.potionCooldown > 0) return;

    // Find from potion slots first, then inventory
    for (let i = 0; i < 4; i++) {
      const pot = p.potionSlots[i];
      if (pot && ((type === PotionType.HEALTH && (pot.type === PotionType.HEALTH || pot.type === PotionType.REJUVENATION))
        || (type === PotionType.MANA && (pot.type === PotionType.MANA || pot.type === PotionType.REJUVENATION)))) {
        this._consumePotion(pot, i);
        return;
      }
    }
    // Fallback to potion inventory
    for (let i = 0; i < p.potions.length; i++) {
      const pot = p.potions[i];
      if ((type === PotionType.HEALTH && (pot.type === PotionType.HEALTH || pot.type === PotionType.REJUVENATION))
        || (type === PotionType.MANA && (pot.type === PotionType.MANA || pot.type === PotionType.REJUVENATION))) {
        this._consumePotionFromInventory(i);
        return;
      }
    }
  }

  private _usePotionSlot(slotIdx: number): void {
    const p = this._state.player;
    if (p.potionCooldown > 0) return;
    const pot = p.potionSlots[slotIdx];
    if (!pot) return;
    this._consumePotion(pot, slotIdx);
  }

  private _consumePotion(pot: DiabloPotion, slotIdx: number): void {
    const p = this._state.player;
    this._applyPotionEffect(pot);
    p.potionSlots[slotIdx] = null;
    p.potionCooldown = pot.cooldown;
  }

  private _consumePotionFromInventory(idx: number): void {
    const p = this._state.player;
    const pot = p.potions[idx];
    this._applyPotionEffect(pot);
    p.potions.splice(idx, 1);
    p.potionCooldown = pot.cooldown;
  }

  private _applyPotionEffect(pot: DiabloPotion): void {
    this._playSound('potion');
    this._state.player.stats.totalPotionsUsed++;
    const p = this._state.player;
    switch (pot.type) {
      case PotionType.HEALTH:
        p.hp = Math.min(p.maxHp, p.hp + pot.value);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} HP`, "#44ff44");
        break;
      case PotionType.MANA:
        p.mana = Math.min(p.maxMana, p.mana + pot.value);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} Mana`, "#4488ff");
        break;
      case PotionType.REJUVENATION:
        p.hp = Math.min(p.maxHp, p.hp + pot.value);
        p.mana = Math.min(p.maxMana, p.mana + 150);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} HP`, "#44ff44");
        this._addFloatingText(p.x, p.y + 3.5, p.z, "+150 Mana", "#4488ff");
        break;
      case PotionType.STRENGTH:
        p.activePotionBuffs.push({ type: PotionType.STRENGTH, value: pot.value, remaining: pot.duration || 30 });
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value}% Damage!`, "#ff8800");
        break;
      case PotionType.SPEED:
        p.activePotionBuffs.push({ type: PotionType.SPEED, value: pot.value, remaining: pot.duration || 20 });
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value}% Speed!`, "#44ffff");
        this._statsDirty = true;
        this._recalculatePlayerStats();
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ELEMENTAL RESISTANCE DAMAGE REDUCTION
  // ──────────────────────────────────────────────────────────────
  private _getPlayerResistances(): { fire: number; ice: number; lightning: number; poison: number } {
    const p = this._state.player;
    let fire = 0, ice = 0, lightning = 0, poison = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      const s = item.stats as any;
      if (s.fireResist) fire += s.fireResist;
      if (s.iceResist) ice += s.iceResist;
      if (s.lightningResist) lightning += s.lightningResist;
      if (s.poisonResist) poison += s.poisonResist;
    }
    const talentBonuses = this._getTalentBonuses();
    const allResist = talentBonuses[TalentEffectType.RESISTANCE_ALL] || 0;
    fire += allResist;
    ice += allResist;
    lightning += allResist;
    poison += allResist;
    return { fire, ice, lightning, poison };
  }

  private _applyPlayerDefenses(rawDmg: number, dmgType: DamageType): number {
    const p = this._state.player;
    const resists = this._getPlayerResistances();

    // Physical: armor only
    if (dmgType === DamageType.PHYSICAL) {
      return Math.max(1, rawDmg - p.armor * 0.3);
    }

    // Apply armor first
    let afterArmor = Math.max(1, rawDmg - p.armor * 0.15);

    // Get elemental resistance
    let resist = 0;
    switch (dmgType) {
      case DamageType.FIRE: resist = resists.fire; break;
      case DamageType.ICE: resist = resists.ice; break;
      case DamageType.LIGHTNING: resist = resists.lightning; break;
      case DamageType.POISON: resist = resists.poison; break;
      case DamageType.ARCANE:
      case DamageType.SHADOW:
        resist = (resists.fire + resists.ice + resists.lightning + resists.poison) / 4;
        break;
      default:
        resist = 0;
    }

    // Diminishing returns: reduction = resist / (resist + 100)
    const reduction = resist / (resist + 100);
    return Math.max(1, afterArmor * (1 - reduction));
  }

  // ──────────────────────────────────────────────────────────────
  //  QUEST SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _updateQuestTracker(): void {
    // Dirty timer: force refresh every ~1s for time-sensitive displays
    this._questTrackerDirtyTimer += 0.016;
    if (this._questTrackerDirtyTimer >= 1.0) {
      this._questTrackerDirtyTimer = 0;
      this._questTrackerDirty = true;
    }
    if (!this._questTrackerDirty) return;
    this._questTrackerDirty = false;

    updateQuestTracker(this._hudRefs.questTracker, this._state, this._state.currentMap);
  }

  private _updateQuestProgress(type: QuestType, context: string | undefined): void {
    this._questTrackerDirty = true;
    for (const quest of this._state.activeQuests) {
      if (quest.isComplete || !quest.isActive) continue;
      if (quest.type !== type) continue;

      let matches = false;
      switch (type) {
        case QuestType.KILL_COUNT:
          if (quest.mapId && quest.mapId === context) matches = true;
          else if (!quest.mapId) matches = true;
          break;
        case QuestType.KILL_SPECIFIC:
          if (quest.target.enemyType === context) matches = true;
          break;
        case QuestType.CLEAR_MAP:
          if (quest.id === 'q_completionist') {
            quest.progress = Object.keys(this._state.completedMaps).length;
            if (quest.progress >= quest.required) this._completeQuest(quest);
            return;
          }
          if (quest.target.mapId === context || !quest.target.mapId) matches = true;
          break;
        case QuestType.BOSS_KILL:
          if (!quest.mapId || quest.mapId === context) matches = true;
          break;
        case QuestType.NIGHT_BOSS:
          matches = true;
          break;
        case QuestType.COLLECT_GOLD:
          quest.progress = this._state.player.gold;
          if (quest.progress >= quest.required) this._completeQuest(quest);
          return;
        case QuestType.TREASURE_HUNT:
          quest.progress = this._chestsOpened;
          if (quest.progress >= quest.required) this._completeQuest(quest);
          return;
      }

      if (matches) {
        quest.progress++;
        if (quest.progress >= quest.required) {
          this._completeQuest(quest);
        }
      }
    }
  }

  private _completeQuest(quest: DiabloQuest): void {
    this._questTrackerDirty = true;
    quest.isComplete = true;
    quest.isActive = false;
    this._state.completedQuestIds.push(quest.id);

    const p = this._state.player;
    p.gold += quest.rewards.gold;
    p.stats.totalQuestsCompleted++;
    p.stats.totalGoldEarned += quest.rewards.gold;
    p.xp += quest.rewards.xp;

    if (quest.rewards.itemRarity) {
      const item = this._pickRandomItemOfRarity(quest.rewards.itemRarity);
      if (item) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...item, id: this._genId() };
        } else {
          const loot: DiabloLoot = {
            id: this._genId(), item: { ...item, id: this._genId() },
            x: p.x + (Math.random() * 2 - 1), y: 0, z: p.z + (Math.random() * 2 - 1), timer: 0,
          };
          this._state.loot.push(loot);
        }
      }
    }

    this._addFloatingText(p.x, p.y + 4, p.z, `QUEST COMPLETE: ${quest.name}!`, "#ffd700");
    this._incrementAchievement('quest_complete_5');
    this._incrementAchievement('quest_complete_20');
    this._addFloatingText(p.x, p.y + 3, p.z, `+${quest.rewards.gold} Gold  +${quest.rewards.xp} XP`, "#c8a84e");

    this._state.activeQuests = this._state.activeQuests.filter(q => q.id !== quest.id);
  }

  private _showQuestBoard(): void { screenShowQuestBoard(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  CRAFTING SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _showCraftingUI(vendor: DiabloVendor, mode: 'blacksmith' | 'jeweler'): void { screenShowCraftingUI(this._screenCtx(), vendor, mode); }

  // ──────────────────────────────────────────────────────────────
  //  FOG OF WAR / EXPLORATION
  // ──────────────────────────────────────────────────────────────
  private _revealAroundPlayer(px: number, pz: number): void {
    const dx = px - this._lastRevealX;
    const dz = pz - this._lastRevealZ;
    if (dx * dx + dz * dz < 0.25) return; // skip if moved less than 0.5 units
    this._lastRevealX = px;
    this._lastRevealZ = pz;
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = mapCfg.depth / 2;
    const revealRadius = 40;
    const gx = Math.floor(px + halfW);
    const gz = Math.floor(pz + halfD);
    const grid = this._state.exploredGrid;
    for (let dx = -revealRadius; dx <= revealRadius; dx++) {
      for (let dz = -revealRadius; dz <= revealRadius; dz++) {
        if (dx * dx + dz * dz > revealRadius * revealRadius) continue;
        const x = gx + dx;
        const z = gz + dz;
        if (x >= 0 && x < mapCfg.width && z >= 0 && z < mapCfg.depth) {
          if (grid[x]) grid[x][z] = true;
        }
      }
    }
  }

  private _isExplored(wx: number, wz: number): boolean {
    return isExplored(this._state, wx, wz);
  }

  // ══════════════════════════════════════════════════════════════
  //  PET SYSTEM
  // ══════════════════════════════════════════════════════════════

  /** Build context for pet system functions (DiabloPets.ts). */
  private _petCtx(): PetContext {
    return {
      state: this._state,
      addFloatingText: (x, y, z, text, color) => this._addFloatingText(x, y, z, text, color),
      genId: () => this._genId(),
      dist: (x1, z1, x2, z2) => this._dist(x1, z1, x2, z2),
      updateAchievement: (id, progress) => this._updateAchievement(id, progress),
      pickupLoot: (lootId) => this._pickupLoot(lootId),
      petBuffs: this._petBuffs,
    };
  }

  private _petUICtx(): PetUIContext {
    return {
      state: this._state,
      menuEl: this._menuEl,
      phaseBeforeOverlay: this._phaseBeforeOverlay,
      setPhaseBeforeOverlay: (p) => { this._phaseBeforeOverlay = p; },
      summonPet: (petId) => this._summonPet(petId),
      dismissPet: () => this._dismissPet(),
    };
  }

  private _createPet(species: PetSpecies): DiabloPet {
    return petCreatePet(this._petCtx(), species);
  }

  /** Try to drop a pet egg when an enemy is killed. */
  private _rollPetDrop(isBoss: boolean): void {
    petRollPetDrop(this._petCtx(), isBoss);
  }

  /** Summon / dismiss a pet. Only one can be active at a time. */
  private _summonPet(petId: string): void {
    petSummonPet(this._petCtx(), petId);
  }

  private _dismissPet(): void {
    petDismissPet(this._petCtx());
  }

  /** Award XP to all summoned pets. */
  private _grantPetXp(amount: number): void {
    petGrantPetXp(this._petCtx(), amount);
  }

  /** Main pet AI update each frame. */
  private _updatePets(dt: number): void {
    petUpdatePets(this._petCtx(), dt);
  }


  /** Apply a pet buff to the player. */
  private _applyPetBuff(ability: { id: string; name: string; buffType?: string; buffDuration?: number; healAmount?: number }): void {
    petApplyPetBuff(this._petCtx(), ability);
  }

  /** Update pet buff timers and apply passive pet buffs. */
  private _updatePetBuffs(dt: number): void {
    petUpdatePetBuffs(this._petCtx(), dt);
  }

  /** Check if a pet buff is active. */
  private _hasPetBuff(type: string): number {
    return petHasPetBuff(this._petCtx(), type);
  }


  // ──────────────────────────────────────────────────────────────
  //  PET PANEL (Shift+P quick view)
  // ──────────────────────────────────────────────────────────────
  private _showPetPanel(): void {
    petShowPetPanel(this._petUICtx());
  }

  // ──────────────────────────────────────────────────────────────
  //  PET MANAGEMENT UI
  // ──────────────────────────────────────────────────────────────
  private _showPetManagement(): void {
    petShowPetManagement(this._petUICtx());
  }

  // ══════════════════════════════════════════════════════════════
  //  ADVANCED CRAFTING SYSTEM
  // ══════════════════════════════════════════════════════════════

  /** Roll material drops from enemy kills. */
  private _rollMaterialDrop(enemy?: DiabloEnemy): void {
    const mapId = this._state.currentMap;
    const p = this._state.player;
    const entry = MATERIAL_DROP_TABLE.find(e => e.mapId === mapId);
    if (!entry) return;

    for (const drop of entry.drops) {
      if (Math.random() < drop.chance) {
        const count = drop.countMin + Math.floor(Math.random() * (drop.countMax - drop.countMin + 1));
        p.crafting.materials[drop.type] = (p.crafting.materials[drop.type] || 0) + count;
        const mat = CRAFTING_MATERIALS[drop.type];
        const fx = enemy ? enemy.x : p.x;
        const fy = enemy ? enemy.y + 2 : p.y + 3;
        const fz = enemy ? enemy.z : p.z;
        this._addFloatingText(fx, fy, fz, `+${count} ${mat.icon} ${mat.name}`, "#88aaff");
      }
    }
  }

  /** Award crafting XP and handle crafting level ups. */
  private _grantCraftingXp(amount: number): void {
    const cs = this._state.player.crafting;
    cs.craftingXp += amount;
    while (cs.craftingXp >= cs.craftingXpToNext) {
      cs.craftingXp -= cs.craftingXpToNext;
      cs.craftingLevel++;
      cs.craftingXpToNext = Math.floor(100 * Math.pow(1.15, cs.craftingLevel - 1));
      // Discover recipes at certain levels
      this._checkRecipeDiscovery();
      this._addFloatingText(
        this._state.player.x, this._state.player.y + 4, this._state.player.z,
        `Crafting Level ${cs.craftingLevel}!`, "#88ccff"
      );
    }
  }

  /** Check if new recipes should be discovered based on crafting level. */
  private _checkRecipeDiscovery(): void {
    const cs = this._state.player.crafting;
    for (const recipe of ADVANCED_CRAFTING_RECIPES) {
      if (cs.discoveredRecipes.includes(recipe.id)) continue;
      if (cs.craftingLevel >= recipe.levelRequired) {
        cs.discoveredRecipes.push(recipe.id);
        this._addFloatingText(
          this._state.player.x, this._state.player.y + 5, this._state.player.z,
          `Recipe Discovered: ${recipe.name}!`, "#ffd700"
        );
      }
    }
  }

  /** Process crafting queue progress. */
  private _updateCraftingQueue(dt: number): void {
    const cs = this._state.player.crafting;
    if (cs.craftingQueue.length === 0) return;

    const current = cs.craftingQueue[0];
    current.progress += dt;
    if (current.progress >= current.duration) {
      // Craft completed
      cs.craftingQueue.shift();
      const recipe = ADVANCED_CRAFTING_RECIPES.find(r => r.id === current.recipeId);
      if (!recipe) return;

      if (Math.random() < recipe.successChance) {
        this._completeCraft(recipe);
        this._addFloatingText(
          this._state.player.x, this._state.player.y + 3, this._state.player.z,
          `Crafted ${recipe.name}!`, "#ffd700"
        );
      } else {
        // Failed — return some materials
        for (const mat of recipe.materials) {
          const returned = Math.floor(mat.count * 0.3);
          cs.materials[mat.type] = (cs.materials[mat.type] || 0) + returned;
        }
        this._addFloatingText(
          this._state.player.x, this._state.player.y + 3, this._state.player.z,
          `Crafting failed! Some materials returned.`, "#ff4444"
        );
      }
      this._grantCraftingXp(recipe.levelRequired * 10 + 20);
    }
  }

  /** Complete a craft and give the player the output item. */
  private _completeCraft(recipe: AdvancedCraftingRecipe): void {
    const p = this._state.player;

    // Potion recipes
    if (recipe.id === 'adv_craft_health_potion') {
      const potion: DiabloPotion = {
        id: this._genId(), name: 'Crafted Health Elixir', type: PotionType.HEALTH,
        icon: '\u2764\uFE0F', value: 80, cooldown: 5, cost: 0,
      };
      p.potions.push(potion);
      return;
    }
    if (recipe.id === 'adv_craft_mana_potion') {
      const potion: DiabloPotion = {
        id: this._genId(), name: 'Crafted Mana Elixir', type: PotionType.MANA,
        icon: '\uD83D\uDCA7', value: 60, cooldown: 5, cost: 0,
      };
      p.potions.push(potion);
      return;
    }

    // Item recipe — generate an item of the output rarity and slot
    if (recipe.outputSlot && recipe.outputRarity) {
      const pool = ITEM_DATABASE.filter(it => it.rarity === recipe.outputRarity && it.slot === recipe.outputSlot);
      let outputItem: DiabloItem | null = null;
      if (pool.length > 0) {
        outputItem = { ...pool[Math.floor(Math.random() * pool.length)], id: this._genId() };
      } else {
        // Fallback: pick any item of the right rarity
        outputItem = this._pickRandomItemOfRarity(recipe.outputRarity);
        if (outputItem) outputItem = { ...outputItem, id: this._genId() };
      }
      if (outputItem) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = outputItem;
        } else {
          this._addFloatingText(p.x, p.y + 3, p.z, "Inventory full!", "#ff4444");
        }
      }
    } else if (recipe.outputRarity) {
      const outputItem = this._pickRandomItemOfRarity(recipe.outputRarity);
      if (outputItem) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...outputItem, id: this._genId() };
        }
      }
    }
  }

  /** Check if the player can afford a recipe. */
  private _canAffordRecipe(recipe: AdvancedCraftingRecipe): boolean {
    const p = this._state.player;
    const cs = p.crafting;
    if (p.gold < recipe.goldCost) return false;
    if (p.salvageMaterials < recipe.salvageCost) return false;
    for (const mat of recipe.materials) {
      if ((cs.materials[mat.type] || 0) < mat.count) return false;
    }
    return true;
  }

  /** Consume recipe costs. */
  private _payRecipeCost(recipe: AdvancedCraftingRecipe): void {
    const p = this._state.player;
    const cs = p.crafting;
    p.gold -= recipe.goldCost;
    p.salvageMaterials -= recipe.salvageCost;
    for (const mat of recipe.materials) {
      cs.materials[mat.type] -= mat.count;
    }
  }

  private _quickSalvageSelectedItem(): void {
    const p = this._state.player;
    const slot = this._state.selectedInventorySlot;
    if (slot < 0 || slot >= p.inventory.length || !p.inventory[slot].item) return;

    const item = p.inventory[slot].item!;
    if (item.isLocked) {
      this._addFloatingText(p.x, p.y + 2, p.z, 'Item is locked!', '#ff4444');
      return;
    }
    const yields: Record<string, number> = {
      [ItemRarity.COMMON]: 1,
      [ItemRarity.UNCOMMON]: 2,
      [ItemRarity.RARE]: 5,
      [ItemRarity.EPIC]: 10,
      [ItemRarity.LEGENDARY]: 25,
      [ItemRarity.MYTHIC]: 50,
      [ItemRarity.DIVINE]: 100,
    };
    const mats = yields[item.rarity] || 1;
    p.salvageMaterials += mats;
    const matTypes = Object.values(MaterialType);
    const matType = matTypes[Math.floor(Math.random() * matTypes.length)];
    p.crafting.materials[matType] = (p.crafting.materials[matType] || 0) + Math.ceil(mats / 3);
    p.inventory[slot].item = null;
    this._addFloatingText(p.x, p.y + 2, p.z, `Salvaged: +${mats} materials`, '#44ff44');
    this._grantCraftingXp(mats * 5);
  }

  // ──────────────────────────────────────────────────────────────
  //  LOOT FILTER SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _shouldShowLoot(item: DiabloItem): boolean {
    const p = this._state.player;
    const filter = p.customLootFilters[p.activeFilterIndex];
    if (!filter) return true;

    if (!filter.showRarities.includes(item.rarity)) return false;
    if (!filter.showItemTypes.includes(item.type)) return false;
    if (item.level < filter.minLevel) return false;

    return true;
  }

  private _shouldAutoSalvage(item: DiabloItem): boolean {
    if (item.isLocked) return false;
    const p = this._state.player;
    const filter = p.customLootFilters[p.activeFilterIndex];
    if (!filter || !filter.autoSalvageBelow) return false;

    const itemIdx = RARITY_ORDER.indexOf(item.rarity);
    const thresholdIdx = RARITY_ORDER.indexOf(filter.autoSalvageBelow);

    return itemIdx <= thresholdIdx;
  }

  // ──────────────────────────────────────────────────────────────
  //  ADVANCED CRAFTING UI
  // ──────────────────────────────────────────────────────────────
  private _showAdvancedCraftingUI(): void { screenShowAdvancedCraftingUI(this._screenCtx()); }

  // ──────────────────────────────────────────────────────────────
  //  DAMAGE TYPE TO PARTICLE MAPPER
  // ──────────────────────────────────────────────────────────────
  private _damageTypeToParticle(dmgType: DamageType): ParticleType {
    return combatDamageTypeToParticle(dmgType);
  }

  // ──────────────────────────────────────────────────────────────
  //  HIT PARTICLES
  // ──────────────────────────────────────────────────────────────
  private _spawnHitParticles(enemy: DiabloEnemy, damageType: DamageType): void {
    const isArmored = enemy.type === EnemyType.BONE_GOLEM || enemy.type === EnemyType.SAND_GOLEM ||
      enemy.type === EnemyType.INFERNAL_KNIGHT || enemy.type === EnemyType.DRAKE_GUARDIAN;

    let particleType = this._damageTypeToParticle(damageType);
    // For physical damage, use SPARK for armored enemies instead of BLOOD
    if (damageType === DamageType.PHYSICAL && isArmored) {
      particleType = ParticleType.SPARK;
    }
    const count = 5 + Math.floor(Math.random() * 5);
    this._renderer.spawnParticles(particleType, enemy.x, enemy.y + 0.5, enemy.z, count, this._state.particles);
  }
}
