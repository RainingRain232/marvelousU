// GTAQuestSystem.ts – Quest progression, dialog, item pickup. No PixiJS.
import type { MedievalGTAState, GTANPC } from '../state/MedievalGTAState';
import { GTAConfig, getStealReputationAction, getTimeOfDay } from '../config/MedievalGTAConfig';
import { addNotification, applyReputationEffects } from './GTACombatSystem';
import { increaseWanted } from './GTAWantedSystem';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Dialog helpers ─────────────────────────────────────────────────────────

function openDialog(
  state: MedievalGTAState,
  npc: GTANPC,
  text: string,
  options: Array<{ text: string; action: string }>,
): void {
  state.dialogNpcId = npc.id;
  state.dialogText = text;
  state.dialogOptions = options;
}

function closeDialog(state: MedievalGTAState): void {
  state.dialogNpcId = null;
  state.dialogText = '';
  state.dialogOptions = [];
}

// ─── Find closest NPC for interaction ───────────────────────────────────────

function findNearestInteractableNPC(
  state: MedievalGTAState,
  maxDist: number,
): GTANPC | null {
  const p = state.player;
  let best: GTANPC | null = null;
  let bestDist = maxDist;

  for (const [, npc] of state.npcs) {
    if (npc.dead) continue;
    const d = dist(npc.pos.x, npc.pos.y, p.pos.x, p.pos.y);
    if (d < bestDist) {
      bestDist = d;
      best = npc;
    }
  }

  return best;
}

// ─── Quest dialog for quest giver NPCs ──────────────────────────────────────

function getQuestDialogForNPC(state: MedievalGTAState, npc: GTANPC): { text: string; options: Array<{ text: string; action: string }> } | null {
  if (!npc.questId) return null;

  const quest = state.quests.find(q => q.id === npc.questId);
  if (!quest) return null;

  // Quest available and not yet accepted
  if (quest.status === 'available') {
    return {
      text: quest.description,
      options: [
        { text: 'Accept quest', action: `accept_quest:${quest.id}` },
        { text: 'Not now', action: 'close' },
      ],
    };
  }

  // Quest active, check if all objectives complete
  if (quest.status === 'active') {
    const allDone = quest.objectives.every(obj => obj.completed);
    if (allDone) {
      return {
        text: quest.completionDialog,
        options: [
          { text: 'Claim reward', action: `complete_quest:${quest.id}` },
        ],
      };
    }

    // Show progress
    const progressLines: string[] = [];
    for (const obj of quest.objectives) {
      if (obj.completed) {
        progressLines.push(`[Done] ${obj.description}`);
      } else if (obj.type === 'kill') {
        progressLines.push(`${obj.description} (${obj.killCurrent ?? 0}/${obj.killCount ?? 1})`);
      } else if (obj.type === 'collect') {
        progressLines.push(`${obj.description} (${obj.itemCurrent ?? 0}/${obj.itemCount ?? 1})`);
      } else {
        progressLines.push(obj.description);
      }
    }
    return {
      text: `Quest: ${quest.title}\n\n${progressLines.join('\n')}`,
      options: [
        { text: 'I will continue', action: 'close' },
      ],
    };
  }

  // Quest completed
  if (quest.status === 'completed') {
    return {
      text: `You have already completed "${quest.title}". Thank you for your service.`,
      options: [
        { text: 'Farewell', action: 'close' },
      ],
    };
  }

  return null;
}

// ─── Handle dialog action ───────────────────────────────────────────────────

function handleDialogAction(state: MedievalGTAState, action: string): void {
  if (action === 'close') {
    closeDialog(state);
    return;
  }

  if (action.startsWith('accept_quest:')) {
    const questId = action.slice('accept_quest:'.length);
    const quest = state.quests.find(q => q.id === questId);
    if (quest && quest.status === 'available') {
      quest.status = 'active';
      state.player.activeQuestIds.push(questId);
      addNotification(state, `Quest accepted: ${quest.title}`, 0xffdd44);
    }
    closeDialog(state);
    return;
  }

  if (action.startsWith('complete_quest:')) {
    const questId = action.slice('complete_quest:'.length);
    const quest = state.quests.find(q => q.id === questId);
    if (quest && quest.status === 'active') {
      quest.status = 'completed';
      state.player.activeQuestIds = state.player.activeQuestIds.filter(id => id !== questId);
      state.player.completedQuestIds.push(questId);
      state.player.gold += quest.reward.gold;
      addNotification(state, `Quest complete: ${quest.title}`, 0x44ff44);
      addNotification(state, `Reward: ${quest.reward.description}`, 0xffdd44);
    }
    closeDialog(state);
    return;
  }

  // Fallback: just close
  closeDialog(state);
}

// ─── Item pickup ────────────────────────────────────────────────────────────

function updateItemPickup(state: MedievalGTAState): void {
  const p = state.player;
  const pickupRange = 30;

  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    if (item.collected) continue;

    const d = dist(item.pos.x, item.pos.y, p.pos.x, p.pos.y);
    if (d > pickupRange) continue;

    // Pick up the item
    item.collected = true;

    switch (item.type) {
      case 'gold_pile': {
        p.gold += item.amount;
        addNotification(state, `+${item.amount} gold`, 0xffdd44);
        break;
      }
      case 'health_potion': {
        const heal = 30;
        p.hp = Math.min(p.maxHp, p.hp + heal);
        addNotification(state, `+${heal} HP`, 0x44ff44);
        break;
      }
      case 'sword': {
        p.weapon = 'sword';
        addNotification(state, 'Picked up Sword!', 0xccccff);
        // Track collect objective
        _trackCollectObjective(state, 'sword', 1);
        break;
      }
      case 'bow': {
        p.weapon = 'bow';
        p.hasBow = true;
        addNotification(state, 'Picked up Bow!', 0xccccff);
        _trackCollectObjective(state, 'bow', 1);
        break;
      }
      case 'key': {
        addNotification(state, 'Picked up Key', 0xccccff);
        _trackCollectObjective(state, 'key', 1);
        break;
      }
      case 'supply_crate': {
        addNotification(state, 'Picked up Supply Crate', 0xccccff);
        _trackCollectObjective(state, 'supply_crate', 1);
        break;
      }
      case 'letter': {
        addNotification(state, 'Picked up Letter', 0xccccff);
        _trackCollectObjective(state, 'letter', 1);
        break;
      }
      case 'treasure_chest': {
        p.gold += item.amount;
        addNotification(state, `Found treasure chest! +${item.amount} gold!`, 0xffdd44);
        break;
      }
    }

    // Remove collected item from array
    state.items.splice(i, 1);
  }
}

function _trackCollectObjective(state: MedievalGTAState, itemType: string, count: number): void {
  for (const quest of state.quests) {
    if (quest.status !== 'active') continue;
    for (const obj of quest.objectives) {
      if (obj.completed) continue;
      if (obj.type === 'collect' && obj.itemType === itemType) {
        obj.itemCurrent = (obj.itemCurrent ?? 0) + count;
        if (obj.itemCurrent >= (obj.itemCount ?? 1)) {
          obj.completed = true;
          addNotification(state, `Objective complete: ${obj.description}`, 0x44ff88);
        }
      }
    }
  }
}

// ─── NPC interaction / dialog ───────────────────────────────────────────────

function updateNPCInteraction(state: MedievalGTAState): void {
  const p = state.player;

  // Handle ongoing dialog actions
  // The dialog system is driven by UI clicks setting dialogOptions actions;
  // we check if the player presses E while dialog is open to pick first option or close
  if (state.dialogNpcId !== null) {
    const ePressed = state.interactKey && !state.lastInteractKey;
    if (ePressed) {
      if (state.dialogOptions.length > 0) {
        handleDialogAction(state, state.dialogOptions[0].action);
      } else {
        closeDialog(state);
      }
      p.dialogCooldown = 0.3;
    }
    return;
  }

  // Start new dialog with E key
  const ePressed = state.interactKey && !state.lastInteractKey;
  if (!ePressed || p.dialogCooldown > 0 || p.state === 'dead') return;

  // ── Tavern healing: check if near a tavern building ──
  for (const bld of state.buildings) {
    if (bld.type !== 'tavern') continue;
    const cx = bld.x + bld.w / 2;
    const cy = bld.y + bld.h / 2;
    const d = dist(p.pos.x, p.pos.y, cx, cy);
    if (d < 60 + Math.max(bld.w, bld.h) / 2) {
      if (p.gold >= 10) {
        p.gold -= 10;
        p.hp = p.maxHp;
        addNotification(state, 'Healed at tavern! (-10 gold)', 0x44ff44);
        p.dialogCooldown = 0.5;
        return;
      } else {
        addNotification(state, 'Not enough gold! (need 10)', 0xff4444);
        p.dialogCooldown = 0.5;
        return;
      }
    }
  }

  // ── Pickpocketing: steal from NPC from behind (faction-aware) ──
  if (p.pickpocketCooldown <= 0) {
    const nearby = findNearestInteractableNPC(state, 30);
    if (nearby && nearby.type !== 'bounty_hunter') {
      // Base stolen amount depends on target type
      let baseStolen = 5 + Math.floor(Math.random() * 11); // 5-15
      if (nearby.type === 'merchant' || nearby.type === 'blacksmith_npc') {
        baseStolen = 10 + Math.floor(Math.random() * 16); // 10-25
      } else if (nearby.type === 'tavern_keeper' || nearby.type === 'bard') {
        baseStolen = 15 + Math.floor(Math.random() * 21); // 15-35 (nobles carry more)
      } else if (nearby.type === 'guard' || nearby.type === 'knight') {
        baseStolen = 8 + Math.floor(Math.random() * 13); // 8-20
      }

      // Day/night crime detection: easier to steal at night
      const todDef = getTimeOfDay(state.dayTime);
      const detectionRoll = Math.random();
      const detected = detectionRoll > (1.0 - todDef.crimeDetectionMult * 0.5);

      p.gold += baseStolen;
      p.pickpocketCooldown = 3.0; // 3 second cooldown

      // Apply faction-specific steal reputation
      const stealAction = getStealReputationAction(nearby.type);
      if (stealAction) {
        applyReputationEffects(state, stealAction);
      }

      if (detected) {
        addNotification(state, `Pickpocketed ${baseStolen} gold! (Spotted!)`, 0xff8844);
        increaseWanted(state, 1);
        nearby.behavior = 'flee';
      } else {
        addNotification(state, `Pickpocketed ${baseStolen} gold! (Unnoticed)`, 0xffdd44);
      }

      p.dialogCooldown = 0.3;
      return;
    }
  }

  const npc = findNearestInteractableNPC(state, GTAConfig.INTERACT_RANGE);
  if (!npc) return;

  p.dialogCooldown = 0.3;

  // Check for quest dialog first
  const questDialog = getQuestDialogForNPC(state, npc);
  if (questDialog) {
    openDialog(state, npc, questDialog.text, questDialog.options);

    // Track talk objectives
    _trackTalkObjective(state, npc.id);
    return;
  }

  // Regular NPC dialog - pick a random line
  if (npc.dialogLines.length > 0) {
    const line = npc.dialogLines[Math.floor(Math.random() * npc.dialogLines.length)];
    openDialog(state, npc, `${npc.name}: "${line}"`, [
      { text: 'Farewell', action: 'close' },
    ]);

    // Track talk objectives even for non-quest NPCs
    _trackTalkObjective(state, npc.id);
  }
}

function _trackTalkObjective(state: MedievalGTAState, npcId: string): void {
  for (const quest of state.quests) {
    if (quest.status !== 'active') continue;
    for (const obj of quest.objectives) {
      if (obj.completed) continue;
      if (obj.type === 'talk' && obj.targetNpcId === npcId) {
        obj.completed = true;
        addNotification(state, `Objective complete: ${obj.description}`, 0x44ff88);
      }
    }
  }
}

// ─── Reach objectives ───────────────────────────────────────────────────────

function updateReachObjectives(state: MedievalGTAState): void {
  const p = state.player;

  for (const quest of state.quests) {
    if (quest.status !== 'active') continue;

    // Reach objectives require all previous objectives to be completed (sequential)
    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i];
      if (obj.completed) continue;
      if (obj.type !== 'reach') break; // stop at first incomplete non-reach (or process reach)

      // Check if previous objectives are done (reach objectives often depend on earlier ones)
      const prevDone = quest.objectives.slice(0, i).every(o => o.completed);
      if (!prevDone) break;

      if (obj.targetPos && obj.targetRadius) {
        const d = dist(p.pos.x, p.pos.y, obj.targetPos.x, obj.targetPos.y);
        if (d <= obj.targetRadius) {
          obj.completed = true;
          addNotification(state, `Objective complete: ${obj.description}`, 0x44ff88);
        }
      }
      break; // only check the first incomplete objective at a time
    }
  }
}

// ─── Escort objectives ──────────────────────────────────────────────────────

function updateEscortObjectives(state: MedievalGTAState): void {
  for (const quest of state.quests) {
    if (quest.status !== 'active') continue;

    for (const obj of quest.objectives) {
      if (obj.completed) continue;
      if (obj.type !== 'escort') continue;

      // Check if escort NPC is alive
      if (obj.targetNpcId) {
        const npc = state.npcs.get(obj.targetNpcId);
        if (!npc) continue;

        if (npc.dead) {
          // Escort target died - fail quest
          quest.status = 'failed';
          state.player.activeQuestIds = state.player.activeQuestIds.filter(id => id !== quest.id);
          addNotification(state, `Quest failed: ${quest.title}`, 0xff4444);
          addNotification(state, `${npc.name} has been killed!`, 0xff4444);
          break;
        }

        // Check if escort NPC reached target position
        if (obj.targetPos && obj.targetRadius) {
          const d = dist(npc.pos.x, npc.pos.y, obj.targetPos.x, obj.targetPos.y);
          if (d <= obj.targetRadius) {
            obj.completed = true;
            addNotification(state, `Objective complete: ${obj.description}`, 0x44ff88);
          }
        }
      }
    }
  }
}

// ─── Main export ────────────────────────────────────────────────────────────

export function updateQuests(state: MedievalGTAState, _dt: number): void {
  if (state.paused || state.gameOver) return;
  if (state.player.state === 'dead') return;

  // NPC interaction (dialog, quest accept/complete)
  updateNPCInteraction(state);

  // Item pickup (gold, potions, quest items)
  updateItemPickup(state);

  // Track reach objectives (player position checks)
  updateReachObjectives(state);

  // Track escort objectives (NPC position + alive checks)
  updateEscortObjectives(state);

  // Check if any quests have all objectives complete and notify
  // Only notify once per quest by checking a simple condition
  for (const quest of state.quests) {
    if (quest.status !== 'active') continue;
    const allDone = quest.objectives.every(obj => obj.completed);
    if (allDone) {
      // Check if quest giver NPC is a quest_giver type that the player can return to
      const giver = state.npcs.get(quest.giverNpcId);
      if (giver && !giver.dead) {
        // The notification is already handled by the dialog system when
        // the player returns to the quest giver; no auto-complete needed.
      }
    }
  }
}
