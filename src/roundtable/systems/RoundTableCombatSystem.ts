// ---------------------------------------------------------------------------
// Round Table – Combat System
// ---------------------------------------------------------------------------

import {
  RTRunState, RTCombatState, CardInstance, CardDef, CardType,
  EnemyInstance, StatusEffectId,
} from "../types";
import { getCardDef } from "../config/RoundTableCards";
import { getEnemyDef } from "../config/RoundTableEnemies";
import { RT_BALANCE } from "../config/RoundTableBalance";
import { RoundTableDeckSystem } from "./RoundTableDeckSystem";
import { RoundTableRelicSystem } from "./RoundTableRelicSystem";
import {
  getEffect, addEffect, clampHp,
} from "../state/RoundTableState";

export const RoundTableCombatSystem = {
  // ═══════════════════════════════════════════════════════════════════════════
  // TURN FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  /** Start a new player turn. */
  startPlayerTurn(run: RTRunState, combat: RTCombatState, rng: { next: () => number }): void {
    combat.turn++;
    combat.isPlayerTurn = true;
    combat.cardsPlayedThisTurn = 0;
    combat.comboThisTurn = 0;
    combat.playedStrikeThisTurn = false;
    combat.playedGuardThisTurn = false;

    // Reset block
    combat.playerBlock = 0;

    // Apply Ritual (strength per turn from Demon Form etc.)
    const ritual = getEffect(combat.playerEffects, StatusEffectId.RITUAL);
    if (ritual > 0) {
      addEffect(combat.playerEffects, StatusEffectId.STRENGTH, ritual);
    }

    // Block from previous turn effects
    const blockNext = getEffect(combat.playerEffects, StatusEffectId.BLOCK_NEXT);
    if (blockNext > 0) {
      combat.playerBlock += blockNext;
      combat.playerEffects.delete(StatusEffectId.BLOCK_NEXT);
    }

    // Energy
    combat.energy = combat.maxEnergy;

    // Blasphemy: triple damage this turn (set previous turn)
    if (run.flags.has("blasphemy_triple")) {
      run.flags.delete("blasphemy_triple");
      run.flags.add("triple_damage_this_turn");
    }

    // Noxious Fumes: apply poison to all enemies at turn start
    for (const f of run.flags) {
      if (f.startsWith("noxious_fumes_")) {
        const amt = parseInt(f.split("_")[2]) || 2;
        for (const e of combat.enemies) {
          if (e.hp > 0) addEffect(e.effects, StatusEffectId.POISON, amt);
        }
      }
    }

    // Relic: on_turn_start
    RoundTableRelicSystem.trigger(run, combat, "on_turn_start", rng);

    // Draw cards
    let drawCount = RT_BALANCE.STARTING_HAND_SIZE;
    // Draw less next turn (Sloth card)
    if (run.flags.has("draw_less_next_turn")) {
      drawCount -= 1;
      run.flags.delete("draw_less_next_turn");
    }
    // Relic: question_mark draws extra
    if (run.relics.includes("question_mark")) drawCount += 1;
    // Relic: snecko_eye draws 2 extra
    if (run.relics.includes("snecko_eye")) drawCount += 2;
    // First turn: merlin's hourglass
    if (combat.turn === 1 && run.relics.includes("merlins_hourglass")) drawCount += 1;

    RoundTableDeckSystem.drawCards(run, combat, drawCount, rng);

    // Snecko eye: randomize card costs
    if (run.relics.includes("snecko_eye")) {
      for (const card of combat.hand) {
        (card as any)._sneckoCost = Math.floor(rng.next() * 4);
      }
    }

    // Choose enemy intents
    for (const enemy of combat.enemies) {
      this.chooseEnemyMove(enemy, rng);
    }
  },

  /** End the player's turn. Process end-of-turn effects, then run enemy turns. */
  endPlayerTurn(run: RTRunState, combat: RTCombatState, rng: { next: () => number }): void {
    combat.isPlayerTurn = false;

    // Percival passive: gain block for unplayed cards
    if (run.knightId === "percival") {
      const unplayed = combat.hand.length;
      if (unplayed > 0) {
        combat.playerBlock += unplayed;
        combat.animQueue.push({ type: "block", targetUid: -1, amount: unplayed, isPlayer: true });
      }
    }

    // Blasphemy: die at end of this turn
    if (run.flags.has("blasphemy_die_next_turn")) {
      run.flags.delete("blasphemy_die_next_turn");
      run.hp = 0;
      combat.log.push("Blasphemy claims your life...");
      return;
    }

    // Clear triple damage flag
    run.flags.delete("triple_damage_this_turn");

    // Process curse end-of-turn effects
    for (const card of combat.hand) {
      const def = getCardDef(card.defId);
      if (def.special === "curse_weak") {
        addEffect(combat.playerEffects, StatusEffectId.WEAK, 1);
      } else if (def.special === "curse_regret") {
        const dmg = combat.hand.length;
        this._damagePlayer(run, combat, dmg, rng);
      } else if (def.special === "curse_decay") {
        this._damagePlayer(run, combat, 2, rng);
      }
    }

    // Relic: on_turn_end
    RoundTableRelicSystem.trigger(run, combat, "on_turn_end", rng);

    // Discard hand
    RoundTableDeckSystem.discardHand(run, combat);

    // Tick status effects (decay)
    this._tickPlayerEffects(combat);

    // ── Enemy Turns ──
    for (const enemy of combat.enemies) {
      if (enemy.hp <= 0) continue;
      this.executeEnemyTurn(run, combat, enemy, rng);
    }

    // Reset enemy block
    for (const enemy of combat.enemies) {
      enemy.block = 0;
      enemy.turnCount++;
    }

    // Tick poison on enemies
    for (const enemy of combat.enemies) {
      const poison = getEffect(enemy.effects, StatusEffectId.POISON);
      if (poison > 0) {
        enemy.hp -= poison;
        enemy.effects.set(StatusEffectId.POISON, poison - 1);
        if (enemy.effects.get(StatusEffectId.POISON)! <= 0) enemy.effects.delete(StatusEffectId.POISON);
        combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: poison, isPlayer: false });
      }
      // Regen
      const regen = getEffect(enemy.effects, StatusEffectId.REGEN);
      if (regen > 0) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + regen);
        enemy.effects.set(StatusEffectId.REGEN, regen - 1);
        if (enemy.effects.get(StatusEffectId.REGEN)! <= 0) enemy.effects.delete(StatusEffectId.REGEN);
      }
    }

    // Remove dead enemies
    this._removeDeadEnemies(run, combat);

    // Tick player poison
    const playerPoison = getEffect(combat.playerEffects, StatusEffectId.POISON);
    if (playerPoison > 0) {
      this._damagePlayer(run, combat, playerPoison, rng);
      combat.playerEffects.set(StatusEffectId.POISON, playerPoison - 1);
      if (combat.playerEffects.get(StatusEffectId.POISON)! <= 0) combat.playerEffects.delete(StatusEffectId.POISON);
    }

    // Regen
    const playerRegen = getEffect(combat.playerEffects, StatusEffectId.REGEN);
    if (playerRegen > 0) {
      run.hp = Math.min(run.maxHp, run.hp + playerRegen);
      combat.playerEffects.set(StatusEffectId.REGEN, playerRegen - 1);
      if (combat.playerEffects.get(StatusEffectId.REGEN)! <= 0) combat.playerEffects.delete(StatusEffectId.REGEN);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD PLAY
  // ═══════════════════════════════════════════════════════════════════════════

  /** Can this card be played? */
  canPlayCard(run: RTRunState, combat: RTCombatState, card: CardInstance): boolean {
    const def = getCardDef(card.defId);
    if (def.cost < 0) return false; // unplayable (curses/status)
    const cost = this._getEffectiveCost(run, combat, card, def);
    if (cost > combat.energy) return false;
    // Velvet choker: max 6 cards per turn
    if (run.relics.includes("velvet_choker") && combat.cardsPlayedThisTurn >= 6) return false;
    // Entangled: can't play attacks
    if (getEffect(combat.playerEffects, StatusEffectId.ENTANGLED) > 0 && (def.type === CardType.STRIKE)) return false;
    // Clash: only playable if every card in hand is a Strike
    if (def.special === "clash_check" || def.special === "clash_check+") {
      const allAttacks = combat.hand.every(c => {
        const d = getCardDef(c.defId);
        return d.type === CardType.STRIKE || c.uid === card.uid;
      });
      if (!allAttacks) return false;
    }
    return true;
  },

  /** Play a card from hand. */
  playCard(
    run: RTRunState, combat: RTCombatState, cardUid: number,
    targetIdx: number, rng: { next: () => number },
  ): boolean {
    const handIdx = combat.hand.findIndex(c => c.uid === cardUid);
    if (handIdx === -1) return false;

    const card = combat.hand[handIdx];
    const def = getCardDef(card.defId);
    if (!this.canPlayCard(run, combat, card)) return false;

    const cost = this._getEffectiveCost(run, combat, card, def);
    combat.energy -= cost;

    // Remove from hand
    combat.hand.splice(handIdx, 1);

    // Curse pain: take 1 damage per card played
    for (const hCard of combat.hand) {
      if (getCardDef(hCard.defId).special === "curse_pain") {
        this._damagePlayer(run, combat, 1, rng);
      }
    }

    combat.cardsPlayedThisTurn++;
    combat.comboThisTurn++;
    run.cardsPlayed++;

    if (def.type === CardType.STRIKE) combat.playedStrikeThisTurn = true;
    if (def.type === CardType.GUARD) combat.playedGuardThisTurn = true;

    const targets = this._resolveTargets(combat, def, targetIdx, rng);

    // ── Damage ──
    if (def.damage > 0) {
      for (const enemy of targets) {
        let totalDmg = 0;
        for (let h = 0; h < def.hits; h++) {
          let dmg = this._calcDamage(run, combat, def, enemy);
          totalDmg += this._applyDamageToEnemy(combat, enemy, dmg);
        }
        run.damageDealt += totalDmg;
        combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: totalDmg, isPlayer: false });

        // Lancelot passive: first unblocked damage draw a card
        if (run.knightId === "lancelot" && totalDmg > 0 && !run.flags.has("lancelot_drew_this_turn")) {
          run.flags.add("lancelot_drew_this_turn");
          RoundTableDeckSystem.drawCards(run, combat, 1, rng);
        }
      }
    }

    // ── Block ──
    if (def.block > 0) {
      let blockAmt = def.block + getEffect(combat.playerEffects, StatusEffectId.DEXTERITY);
      if (getEffect(combat.playerEffects, StatusEffectId.FRAIL) > 0) {
        blockAmt = Math.floor(blockAmt * 0.75);
      }
      combat.playerBlock += blockAmt;
      combat.animQueue.push({ type: "block", targetUid: -1, amount: blockAmt, isPlayer: true });
    }

    // ── Apply effects to target ──
    for (const eff of def.applyEffects) {
      for (const enemy of targets) {
        addEffect(enemy.effects, eff.id, eff.amount);
        combat.animQueue.push({ type: "effect_apply", effectId: eff.id, targetUid: enemy.uid, isPlayer: false });
      }
    }

    // ── Self effects ──
    for (const eff of def.selfEffects) {
      addEffect(combat.playerEffects, eff.id, eff.amount);
      combat.animQueue.push({ type: "effect_apply", effectId: eff.id, targetUid: -1, isPlayer: true });
    }

    // ── Draw ──
    if (def.draw > 0) {
      RoundTableDeckSystem.drawCards(run, combat, def.draw, rng);
    }

    // ── Energy gain ──
    if (def.energy > 0) {
      combat.energy += def.energy;
    }

    // ── Purity ──
    if (def.purityChange !== 0) {
      let change = def.purityChange;
      if (run.relics.includes("purity_pendant")) change *= 2;
      run.purity = Math.max(0, Math.min(100, run.purity + change));
    }

    // ── Grail Fragment: Virtue cards trigger block/effects/heal twice ──
    if (RoundTableRelicSystem.shouldDoubleVirtue(run, def)) {
      if (def.block > 0) {
        let blockAmt = def.block + getEffect(combat.playerEffects, StatusEffectId.DEXTERITY);
        if (getEffect(combat.playerEffects, StatusEffectId.FRAIL) > 0) blockAmt = Math.floor(blockAmt * 0.75);
        combat.playerBlock += blockAmt;
        combat.animQueue.push({ type: "block", targetUid: -1, amount: blockAmt, isPlayer: true });
      }
      for (const eff of def.selfEffects) {
        addEffect(combat.playerEffects, eff.id, eff.amount);
      }
      if (def.purityChange !== 0) {
        run.purity = Math.max(0, Math.min(100, run.purity + def.purityChange));
      }
    }

    // ── Special effects ──
    this._handleSpecial(run, combat, def, card, targets, rng);

    // ── Exhaust or discard ──
    if (def.exhaust) {
      combat.exhaustPile.push(card);
      combat.animQueue.push({ type: "exhaust_card", cardUid: card.uid });
      // Dead branch relic: add random card to hand
      if (run.relics.includes("dead_branch")) {
        const allPool = ["quick_slash", "cleave", "twin_strike", "shield_bash", "parry", "fireball", "chain_lightning"];
        const randomId = allPool[Math.floor(rng.next() * allPool.length)];
        const newCard: CardInstance = { uid: run.nextUid++, defId: randomId, upgraded: false };
        combat.hand.push(newCard);
      }
      // Dark Embrace power: draw 1 card when exhausting
      if (run.flags.has("dark_embrace_active")) {
        RoundTableDeckSystem.drawCards(run, combat, 1, rng);
      }
    } else {
      combat.discardPile.push(card);
    }

    // ── Whirlwind special: consume all energy ──
    if (def.special === "whirlwind") {
      combat.energy = 0;
    }

    // ── Relic triggers ──
    RoundTableRelicSystem.trigger(run, combat, "on_card_play", rng, { cardDef: def });

    // ── Remove dead enemies ──
    this._removeDeadEnemies(run, combat);

    return true;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENEMY TURNS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Choose an enemy's next move based on weighted random. */
  chooseEnemyMove(enemy: EnemyInstance, rng: { next: () => number }): void {
    const def = getEnemyDef(enemy.defId);
    const available = def.moves.filter(m => {
      if (m.minTurn > enemy.turnCount) return false;
      // Don't repeat the same move twice in a row (for non-single-move enemies)
      if (def.moves.length > 1 && m.id === enemy.lastMoveId) return false;
      return true;
    });

    if (available.length === 0) {
      // fallback: use any move
      enemy.currentMoveId = def.moves[0].id;
      return;
    }

    // Cultist special: always incantation on turn 0, then always dark_strike
    if (enemy.defId === "cultist") {
      enemy.currentMoveId = enemy.turnCount === 0 ? "incantation" : "dark_strike";
      return;
    }

    // Boss phase transitions
    if (def.isBoss) {
      const hpPercent = enemy.hp / enemy.maxHp;

      // Green Knight: Berserk below 30% HP
      if (enemy.defId === "boss_green_knight" && hpPercent < 0.3) {
        enemy.currentMoveId = "berserk";
        return;
      }

      // Morgan le Fay: Dark Ritual below 40% HP
      if (enemy.defId === "boss_morgan_le_fay" && hpPercent < 0.4 && enemy.turnCount >= 3) {
        // Alternate between hex_storm and dark_ritual
        enemy.currentMoveId = enemy.lastMoveId === "dark_ritual" ? "hex_storm" : "dark_ritual";
        return;
      }

      // Mordred Youth: Underhanded spam below 50%
      if (enemy.defId === "boss_mordred_youth" && hpPercent < 0.5 && enemy.turnCount >= 2) {
        enemy.currentMoveId = enemy.lastMoveId === "underhanded" ? "dark_charge" : "underhanded";
        return;
      }

      // Questing Beast Prime: Devour below 35%
      if (enemy.defId === "boss_questing_beast_prime" && hpPercent < 0.35) {
        enemy.currentMoveId = enemy.lastMoveId === "devour" ? "rampage" : "devour";
        return;
      }

      // Grail Guardian: Purge below 30%
      if (enemy.defId === "boss_grail_guardian" && hpPercent < 0.3) {
        enemy.currentMoveId = enemy.lastMoveId === "purge" ? "judgment" : "purge";
        return;
      }

      // Shadow Self: Consume below 40%
      if (enemy.defId === "boss_shadow_self" && hpPercent < 0.4) {
        enemy.currentMoveId = enemy.lastMoveId === "consume" ? "shadow_burst" : "consume";
        return;
      }
    }

    const totalWeight = available.reduce((sum, m) => sum + m.weight, 0);
    let roll = rng.next() * totalWeight;
    for (const m of available) {
      roll -= m.weight;
      if (roll <= 0) {
        enemy.currentMoveId = m.id;
        return;
      }
    }
    enemy.currentMoveId = available[available.length - 1].id;
  },

  /** Execute one enemy's turn. */
  executeEnemyTurn(
    run: RTRunState, combat: RTCombatState,
    enemy: EnemyInstance, rng: { next: () => number },
  ): void {
    const def = getEnemyDef(enemy.defId);
    const moveDef = def.moves.find(m => m.id === enemy.currentMoveId);
    if (!moveDef) return;

    enemy.lastMoveId = enemy.currentMoveId;

    // ── Attack ──
    if (moveDef.damage > 0) {
      for (let h = 0; h < moveDef.hits; h++) {
        let dmg = moveDef.damage + getEffect(enemy.effects, StatusEffectId.STRENGTH);

        // Ascension damage scaling
        const asc = run.ascension;
        if (def.isBoss && asc >= 8) dmg = Math.ceil(dmg * 1.1);
        else if (def.isElite && asc >= 6) dmg = Math.ceil(dmg * 1.15);
        else if (!def.isBoss && !def.isElite && asc >= 7) dmg = Math.ceil(dmg * 1.1);

        if (getEffect(combat.playerEffects, StatusEffectId.VULNERABLE) > 0) {
          dmg = Math.floor(dmg * RT_BALANCE.VULNERABLE_MULTIPLIER);
        }
        if (getEffect(enemy.effects, StatusEffectId.WEAK) > 0) {
          dmg = Math.floor(dmg * RT_BALANCE.WEAK_MULTIPLIER);
        }
        if (dmg < 0) dmg = 0;

        // Holy shield: negate hit
        const holyShield = getEffect(combat.playerEffects, StatusEffectId.HOLY_SHIELD);
        if (holyShield > 0) {
          combat.playerEffects.set(StatusEffectId.HOLY_SHIELD, holyShield - 1);
          if (holyShield - 1 <= 0) combat.playerEffects.delete(StatusEffectId.HOLY_SHIELD);
          continue;
        }

        // Apply to player block first
        const actualDmg = this._damagePlayer(run, combat, dmg, rng);

        combat.animQueue.push({ type: "enemy_attack", enemyUid: enemy.uid, damage: actualDmg });

        // Flame barrier: reflect damage
        const fb = getEffect(combat.playerEffects, StatusEffectId.FLAME_BARRIER);
        if (fb > 0) {
          enemy.hp -= fb;
          combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: fb, isPlayer: false });
        }

        // Bronze scales relic
        if (run.relics.includes("bronze_scales") && actualDmg > 0) {
          enemy.hp -= 3;
          combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: 3, isPlayer: false });
        }
      }
    }

    // ── Block ──
    if (moveDef.block > 0) {
      enemy.block += moveDef.block;
    }

    // ── Effects on player ──
    for (const eff of moveDef.effects) {
      addEffect(combat.playerEffects, eff.id, eff.amount);
    }

    // ── Self effects ──
    for (const eff of moveDef.selfEffects) {
      addEffect(enemy.effects, eff.id, eff.amount);
    }

    // Tick enemy debuffs
    this._tickEnemyEffects(enemy);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBAT CHECKS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Is combat over? Returns "win" | "lose" | null. */
  checkCombatEnd(run: RTRunState, combat: RTCombatState): "win" | "lose" | null {
    if (run.hp <= 0) return "lose";
    if (combat.enemies.every(e => e.hp <= 0)) return "win";
    return null;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ═══════════════════════════════════════════════════════════════════════════

  _getEffectiveCost(run: RTRunState, _combat: RTCombatState, card: CardInstance, def: CardDef): number {
    // Snecko eye: randomized cost
    if (run.relics.includes("snecko_eye") && (card as any)._sneckoCost !== undefined) {
      return (card as any)._sneckoCost;
    }
    let cost = def.cost;
    // Mordred's whisper: sin cards cost 0
    if (run.relics.includes("mordreds_whisper") && def.type === CardType.SIN) cost = 0;
    // Siege perilous: if took damage this turn, -1
    if (run.relics.includes("siege_perilous") && run.flags.has("took_damage_this_turn")) {
      cost = Math.max(0, cost - 1);
    }
    return Math.max(0, cost);
  },

  _calcDamage(run: RTRunState, combat: RTCombatState, def: CardDef, enemy: EnemyInstance): number {
    let dmg = def.damage;
    let str = getEffect(combat.playerEffects, StatusEffectId.STRENGTH);

    // Heavy blade special: strength multiplied
    if (def.special === "strength_x3") str *= 3;
    else if (def.special === "strength_x5") str *= 5;

    dmg += str;

    // Rampage: add accumulated bonus from flags
    if (def.special === "rampage" || def.special === "rampage+") {
      for (const f of run.flags) {
        if (f.startsWith("rampage_bonus_")) dmg += parseInt(f.split("_")[2]) || 0;
      }
    }

    // Weak
    if (getEffect(combat.playerEffects, StatusEffectId.WEAK) > 0) {
      dmg = Math.floor(dmg * RT_BALANCE.WEAK_MULTIPLIER);
    }

    // Vulnerable on enemy
    if (getEffect(enemy.effects, StatusEffectId.VULNERABLE) > 0) {
      dmg = Math.floor(dmg * RT_BALANCE.VULNERABLE_MULTIPLIER);
    }

    // Double damage this turn (Pride card)
    if (run.flags.has("double_damage_this_turn")) {
      dmg *= 2;
    }

    // Triple damage this turn (Blasphemy)
    if (run.flags.has("triple_damage_this_turn")) {
      dmg *= 3;
    }

    // Pen nib: every 10th attack deals double
    if (run.flags.has("pen_nib_double")) {
      dmg *= 2;
      run.flags.delete("pen_nib_double");
    }

    return Math.max(0, dmg);
  },

  _applyDamageToEnemy(_combat: RTCombatState, enemy: EnemyInstance, dmg: number): number {
    if (enemy.block > 0) {
      if (dmg <= enemy.block) {
        enemy.block -= dmg;
        return 0;
      } else {
        dmg -= enemy.block;
        enemy.block = 0;
      }
    }
    enemy.hp -= dmg;
    return dmg;
  },

  _damagePlayer(run: RTRunState, combat: RTCombatState, dmg: number, rng: { next: () => number }): number {
    // Tungsten rod: reduce by 1
    if (run.relics.includes("tungsten_rod") && dmg > 0) dmg = Math.max(0, dmg - 1);

    if (combat.playerBlock > 0) {
      if (dmg <= combat.playerBlock) {
        combat.playerBlock -= dmg;
        return 0;
      } else {
        dmg -= combat.playerBlock;
        combat.playerBlock = 0;
      }
    }
    run.hp -= dmg;
    run.flags.add("took_damage_this_turn");
    combat.animQueue.push({ type: "damage", targetUid: -1, amount: dmg, isPlayer: true });

    // Relic: on_take_damage
    RoundTableRelicSystem.trigger(run, combat, "on_take_damage", rng, { damage: dmg });

    clampHp(run);
    return dmg;
  },

  _removeDeadEnemies(run: RTRunState, combat: RTCombatState): void {
    for (let i = combat.enemies.length - 1; i >= 0; i--) {
      if (combat.enemies[i].hp <= 0) {
        combat.animQueue.push({ type: "enemy_die", enemyUid: combat.enemies[i].uid });
        combat.enemies.splice(i, 1);
        run.enemiesKilled++;
      }
    }
  },

  _resolveTargets(combat: RTCombatState, def: CardDef, targetIdx: number, rng: { next: () => number }): EnemyInstance[] {
    if (def.targetAll) return combat.enemies.filter(e => e.hp > 0);
    if (def.target === "random_enemy") {
      const alive = combat.enemies.filter(e => e.hp > 0);
      if (alive.length === 0) return [];
      // For multi-hit random, return single random per call — handled in playCard loop
      return [alive[Math.floor(rng.next() * alive.length)]];
    }
    if (def.target === "self" || def.target === "none") return [];
    // Single target
    const alive = combat.enemies.filter(e => e.hp > 0);
    if (alive.length === 0) return [];
    const idx = Math.min(targetIdx, alive.length - 1);
    return [alive[Math.max(0, idx)]];
  },

  _handleSpecial(
    run: RTRunState, combat: RTCombatState, def: CardDef,
    card: CardInstance, _targets: EnemyInstance[], rng: { next: () => number },
  ): void {
    const sp = def.special;
    if (!sp) return;

    if (sp === "copy_to_discard") {
      // Anger: add a copy
      const copy: CardInstance = { uid: run.nextUid++, defId: card.defId, upgraded: card.upgraded };
      combat.discardPile.push(copy);
    }
    if (sp === "self_damage_5") {
      this._damagePlayer(run, combat, 5, rng);
    }
    if (sp === "self_damage_6") {
      this._damagePlayer(run, combat, 6, rng);
    }
    if (sp === "double_block") {
      combat.playerBlock *= 2;
    }
    if (sp === "exhaust_random") {
      RoundTableDeckSystem.exhaustRandomCard(combat, rng);
    }
    if (sp.startsWith("heal_")) {
      const amt = parseInt(sp.replace("heal_", ""), 10);
      if (!isNaN(amt)) {
        run.hp = Math.min(run.maxHp, run.hp + amt);
        combat.animQueue.push({ type: "heal", amount: amt, isPlayer: true });
      }
    }
    if (sp === "gain_gold_20_self_damage_8") {
      if (!run.relics.includes("ectoplasm")) run.gold += 20;
      this._damagePlayer(run, combat, 8, rng);
    }
    if (sp === "gain_gold_30_self_damage_8") {
      if (!run.relics.includes("ectoplasm")) run.gold += 30;
      this._damagePlayer(run, combat, 8, rng);
    }
    if (sp === "add_2_curses") {
      const curses = ["curse_doubt", "curse_regret", "curse_decay", "curse_pain"];
      for (let i = 0; i < 2; i++) {
        const id = curses[Math.floor(rng.next() * curses.length)];
        RoundTableDeckSystem.addCardToDeck(run, id);
      }
    }
    if (sp === "whirlwind") {
      // Already handled energy-based hits above
      const alive = combat.enemies.filter(e => e.hp > 0);
      const hitsCount = combat.energy; // energy at time of play (already deducted cost of 0)
      for (let h = 0; h < hitsCount; h++) {
        for (const enemy of alive) {
          const dmg = this._calcDamage(run, combat, def, enemy);
          this._applyDamageToEnemy(combat, enemy, dmg);
          run.damageDealt += dmg;
        }
      }
    }
    if (sp === "double_damage_turn") {
      run.flags.add("double_damage_this_turn");
    }
    if (sp === "no_more_draw") {
      run.flags.add("no_more_draw_this_turn");
    }
    if (sp === "summon_squire" || sp === "summon_squire+") {
      const power = sp === "summon_squire+" ? 6 : 4;
      run.flags.add(`squire_${power}`);
    }
    // Rampage: increase tracked damage bonus
    if (sp === "rampage") {
      let bonus = 0;
      for (const f of Array.from(run.flags)) {
        if (f.startsWith("rampage_bonus_")) { bonus = parseInt(f.split("_")[2]) || 0; run.flags.delete(f); }
      }
      run.flags.add(`rampage_bonus_${bonus + 5}`);
    }
    if (sp === "rampage+") {
      let bonus = 0;
      for (const f of Array.from(run.flags)) {
        if (f.startsWith("rampage_bonus_")) { bonus = parseInt(f.split("_")[2]) || 0; run.flags.delete(f); }
      }
      run.flags.add(`rampage_bonus_${bonus + 8}`);
    }
    // Headbutt: put a card from discard on top of draw pile
    if (sp === "discard_to_top") {
      if (combat.discardPile.length > 0) {
        const idx = Math.floor(rng.next() * combat.discardPile.length);
        const [moved] = combat.discardPile.splice(idx, 1);
        combat.drawPile.push(moved);
      }
    }
    // True Grit+: exhaust a chosen card (simplified: exhaust random for now)
    if (sp === "exhaust_choose") {
      RoundTableDeckSystem.exhaustRandomCard(combat, rng);
    }
    // Body Slam: deal damage equal to current block
    if (sp === "body_slam" || sp === "body_slam+") {
      const bsDmg = combat.playerBlock;
      if (bsDmg > 0) {
        const alive = combat.enemies.filter(e => e.hp > 0);
        const target = alive[Math.min(combat.selectedTarget, alive.length - 1)];
        if (target) {
          const actual = this._applyDamageToEnemy(combat, target, bsDmg);
          run.damageDealt += actual;
          combat.animQueue.push({ type: "damage", targetUid: target.uid, amount: actual, isPlayer: false });
        }
      }
    }
    // Wild Strike: shuffle a Wound into draw pile
    if (sp === "add_wound" || sp === "add_wound+") {
      const wound: CardInstance = { uid: run.nextUid++, defId: "status_wound", upgraded: false };
      combat.drawPile.splice(Math.floor(rng.next() * (combat.drawPile.length + 1)), 0, wound);
    }
    // Sentinel: if this card was exhausted, gain energy
    if (sp === "sentinel_exhaust") {
      // Card is always exhausted (exhaust: true in def), so always grant energy
      combat.energy += 2;
    }
    if (sp === "sentinel_exhaust+") {
      combat.energy += 3;
    }
    // Str Block (Body Armor): gain block = strength * 4 + base
    if (sp === "str_block") {
      const str = getEffect(combat.playerEffects, StatusEffectId.STRENGTH);
      const blk = Math.max(0, str * 4 + 6);
      combat.playerBlock += blk;
      combat.animQueue.push({ type: "block", targetUid: -1, amount: blk, isPlayer: true });
    }
    if (sp === "str_block+") {
      const str = getEffect(combat.playerEffects, StatusEffectId.STRENGTH);
      const blk = Math.max(0, str * 4 + 10);
      combat.playerBlock += blk;
      combat.animQueue.push({ type: "block", targetUid: -1, amount: blk, isPlayer: true });
    }
    // Bloodletting: lose HP, gain energy
    if (sp === "self_damage_3_energy_2") {
      this._damagePlayer(run, combat, 3, rng);
      combat.energy += 2;
    }
    if (sp === "self_damage_3_energy_3") {
      this._damagePlayer(run, combat, 3, rng);
      combat.energy += 3;
    }
    // Dark Embrace power: whenever you exhaust, draw 1 — set flag
    if (sp === "dark_embrace_power" || sp === "dark_embrace_power+") {
      run.flags.add("dark_embrace_active");
    }
    // Noxious Fumes power: apply poison each turn — set flag
    if (sp === "noxious_fumes_power") {
      run.flags.add("noxious_fumes_2");
    }
    if (sp === "noxious_fumes_power+") {
      run.flags.add("noxious_fumes_3");
    }
    // Feed: if enemy dies from this damage, gain max HP
    if (sp === "feed_kill" || sp === "feed_kill+") {
      const alive = combat.enemies.filter(e => e.hp > 0);
      const target = alive[Math.min(combat.selectedTarget, alive.length - 1)];
      if (target && target.hp <= 0) {
        const bonus = sp === "feed_kill+" ? 4 : 3;
        run.maxHp += bonus;
        run.hp += bonus;
        combat.log.push(`Feed: +${bonus} Max HP!`);
      }
    }
    // Reaper: heal equal to unblocked damage dealt (simplified: heal per enemy)
    if (sp === "reaper_heal" || sp === "reaper_heal+") {
      const hitCount = combat.enemies.length;
      const healAmt = hitCount * (sp === "reaper_heal+" ? 8 : 4);
      if (healAmt > 0) {
        run.hp = Math.min(run.maxHp, run.hp + healAmt);
        combat.animQueue.push({ type: "heal", amount: healAmt, isPlayer: true });
      }
    }
    // Envy: copy the last card played (from discard)
    if (sp === "copy_last_played" || sp === "copy_last_played+") {
      if (combat.discardPile.length > 0) {
        const lastCard = combat.discardPile[combat.discardPile.length - 1];
        const copy: CardInstance = { uid: run.nextUid++, defId: lastCard.defId, upgraded: lastCard.upgraded };
        combat.hand.push(copy);
        combat.animQueue.push({ type: "draw_card", cardUid: copy.uid });
      }
    }
    // Sloth: draw 1 less card next turn
    if (sp === "draw_less_next" || sp === "draw_less_next+") {
      run.flags.add("draw_less_next_turn");
    }
    // Blasphemy: triple damage next turn, die at end of next turn
    if (sp === "triple_then_die" || sp === "triple_then_die+") {
      run.flags.add("blasphemy_triple");
      run.flags.add("blasphemy_die_next_turn");
    }
    // Apotheosis: upgrade ALL cards in deck
    if (sp === "upgrade_all" || sp === "upgrade_all+") {
      for (const c of run.deck) {
        const d = getCardDef(c.defId);
        if (d.upgradeId && !c.upgraded) {
          c.defId = d.upgradeId;
          c.upgraded = true;
        }
      }
      // Also upgrade cards currently in combat piles
      const allPiles = [...combat.hand, ...combat.drawPile, ...combat.discardPile];
      for (const c of allPiles) {
        const d = getCardDef(c.defId);
        if (d.upgradeId && !c.upgraded) {
          c.defId = d.upgradeId;
          c.upgraded = true;
        }
      }
      combat.log.push("All cards upgraded!");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // KNIGHT-EXCLUSIVE CARD SPECIALS
    // ═══════════════════════════════════════════════════════════════════════

    // Lancelot — Riposte: if all hits dealt unblocked damage, draw 2 cards
    if (sp === "riposte_draw" || sp === "riposte_draw+") {
      // Check if any enemy still has block (approximation: if target block is 0, hits were unblocked)
      const alive = combat.enemies.filter(e => e.hp > 0);
      const target = alive[Math.min(combat.selectedTarget, alive.length - 1)];
      if (target && target.block === 0) {
        const drawAmt = sp === "riposte_draw+" ? 3 : 2;
        RoundTableDeckSystem.drawCards(run, combat, drawAmt, rng);
        combat.log.push(`Riposte: drew ${drawAmt} cards!`);
      }
    }

    // Lancelot — Peerless Combo: draw 1 card for each enemy killed this action
    if (sp === "combo_draw_kills" || sp === "combo_draw_kills+") {
      const deadCount = combat.enemies.filter(e => e.hp <= 0).length;
      if (deadCount > 0) {
        RoundTableDeckSystem.drawCards(run, combat, deadCount, rng);
        combat.log.push(`Peerless Combo: ${deadCount} kills, drew ${deadCount} cards!`);
      }
    }

    // Gawain — Supernova: deal Strength × 8 to ALL enemies
    if (sp === "str_x8_all" || sp === "str_x8_all+") {
      const str = getEffect(combat.playerEffects, StatusEffectId.STRENGTH);
      const mult = sp === "str_x8_all+" ? 10 : 8;
      const dmg = Math.max(0, str * mult);
      for (const enemy of combat.enemies) {
        if (enemy.hp > 0) {
          const actual = this._applyDamageToEnemy(combat, enemy, dmg);
          run.damageDealt += actual;
          combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: actual, isPlayer: false });
        }
      }
      combat.log.push(`Supernova: ${dmg} damage to all!`);
    }

    // Percival — Steadfast: if Block ≥ 20 after gaining block, gain Holy Shield
    if (sp === "block_threshold_shield" || sp === "block_threshold_shield+") {
      const threshold = sp === "block_threshold_shield+" ? 16 : 20;
      if (combat.playerBlock >= threshold) {
        addEffect(combat.playerEffects, StatusEffectId.HOLY_SHIELD, 1);
        combat.log.push("Steadfast: Holy Shield gained!");
      }
    }

    // Morgause — Dark Gift: add a random curse to deck
    if (sp === "add_random_curse" || sp === "add_random_curse+") {
      const curses = ["curse_doubt", "curse_regret", "curse_decay", "curse_pain"];
      const id = curses[Math.floor(rng.next() * curses.length)];
      RoundTableDeckSystem.addCardToDeck(run, id);
      combat.log.push("Dark Gift: curse added to deck.");
    }

    // Morgause — Plague: apply 12 poison to ALL + 2 extra per curse in deck
    if (sp === "plague_curse_bonus" || sp === "plague_curse_bonus+") {
      let curseCount = 0;
      for (const c of run.deck) { if (c.defId.startsWith("curse_")) curseCount++; }
      const basePsn = sp === "plague_curse_bonus+" ? 15 : 12;
      const bonusPsn = curseCount * (sp === "plague_curse_bonus+" ? 3 : 2);
      const totalPsn = basePsn + bonusPsn;
      for (const enemy of combat.enemies) {
        if (enemy.hp > 0) {
          addEffect(enemy.effects, StatusEffectId.POISON, totalPsn);
          combat.animQueue.push({ type: "effect_apply", effectId: StatusEffectId.POISON, targetUid: enemy.uid, isPlayer: false });
        }
      }
      combat.log.push(`Plague: ${totalPsn} Poison to all (${curseCount} curses).`);
    }

    // Tristan — Toxic Blade: apply Poison equal to unblocked damage
    if (sp === "poison_unblocked" || sp === "poison_unblocked+") {
      const alive = combat.enemies.filter(e => e.hp > 0);
      const target = alive[Math.min(combat.selectedTarget, alive.length - 1)];
      if (target) {
        // Approximate: damage already dealt, use def.damage + strength as proxy
        const str = getEffect(combat.playerEffects, StatusEffectId.STRENGTH);
        const estDmg = Math.max(0, def.damage + str);
        const psnAmt = sp === "poison_unblocked+" ? estDmg + 2 : estDmg;
        addEffect(target.effects, StatusEffectId.POISON, psnAmt);
        combat.animQueue.push({ type: "effect_apply", effectId: StatusEffectId.POISON, targetUid: target.uid, isPlayer: false });
      }
    }

    // Tristan — Catalyst: double the Poison on target enemy
    if (sp === "double_poison" || sp === "double_poison+") {
      const alive = combat.enemies.filter(e => e.hp > 0);
      const target = alive[Math.min(combat.selectedTarget, alive.length - 1)];
      if (target) {
        const currentPsn = getEffect(target.effects, StatusEffectId.POISON);
        if (currentPsn > 0) {
          const mult = sp === "double_poison+" ? 3 : 2;
          addEffect(target.effects, StatusEffectId.POISON, currentPsn * (mult - 1));
          combat.log.push(`Catalyst: Poison ${currentPsn} → ${currentPsn * mult}!`);
        }
      }
    }

    // Tristan — Endure: lose HP, gain block, poison all enemies
    if (sp === "self_damage_4_poison_all_4") {
      this._damagePlayer(run, combat, 4, rng);
      for (const enemy of combat.enemies) {
        if (enemy.hp > 0) addEffect(enemy.effects, StatusEffectId.POISON, 4);
      }
    }
    if (sp === "self_damage_4_poison_all_5") {
      this._damagePlayer(run, combat, 4, rng);
      for (const enemy of combat.enemies) {
        if (enemy.hp > 0) addEffect(enemy.effects, StatusEffectId.POISON, 5);
      }
    }

    // Tristan — Blight: ALL enemies lose HP equal to their Poison
    if (sp === "blight_detonate" || sp === "blight_detonate+") {
      for (const enemy of combat.enemies) {
        if (enemy.hp > 0) {
          const psn = getEffect(enemy.effects, StatusEffectId.POISON);
          if (psn > 0) {
            const dmgMult = sp === "blight_detonate+" ? 1.5 : 1;
            const dmg = Math.floor(psn * dmgMult);
            const actual = this._applyDamageToEnemy(combat, enemy, dmg);
            run.damageDealt += actual;
            combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: actual, isPlayer: false });
          }
        }
      }
      combat.log.push("Blight detonates all Poison!");
    }
  },

  _tickPlayerEffects(combat: RTCombatState): void {
    const decaying: StatusEffectId[] = [
      StatusEffectId.VULNERABLE, StatusEffectId.WEAK, StatusEffectId.FRAIL,
      StatusEffectId.FLAME_BARRIER, StatusEffectId.ENTANGLED,
    ];
    for (const id of decaying) {
      const val = combat.playerEffects.get(id);
      if (val !== undefined && val > 0) {
        if (val <= 1) combat.playerEffects.delete(id);
        else combat.playerEffects.set(id, val - 1);
      }
    }
  },

  _tickEnemyEffects(enemy: EnemyInstance): void {
    const decaying: StatusEffectId[] = [
      StatusEffectId.VULNERABLE, StatusEffectId.WEAK, StatusEffectId.FRAIL,
    ];
    for (const id of decaying) {
      const val = enemy.effects.get(id);
      if (val !== undefined && val > 0) {
        if (val <= 1) enemy.effects.delete(id);
        else enemy.effects.set(id, val - 1);
      }
    }
  },
};
