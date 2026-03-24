// ---------------------------------------------------------------------------
// Alchemist mode — grid matching, swapping, cascading
// ---------------------------------------------------------------------------

import type { AlchemistState } from "../state/AlchemistState";
import { seedRng } from "../state/AlchemistState";
import { ALL_INGREDIENTS, RARE_INGREDIENTS, AlchemistConfig, type IngredientType } from "../config/AlchemistConfig";

export function trySwap(state: AlchemistState, x1: number, y1: number, x2: number, y2: number): boolean {
  const { GRID_COLS, GRID_ROWS } = AlchemistConfig;
  if (x1 < 0 || x1 >= GRID_COLS || y1 < 0 || y1 >= GRID_ROWS) return false;
  if (x2 < 0 || x2 >= GRID_COLS || y2 < 0 || y2 >= GRID_ROWS) return false;
  if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return false;

  // Swap tiles
  const t1 = state.grid[y1][x1];
  const t2 = state.grid[y2][x2];
  state.grid[y1][x1] = t2;
  state.grid[y2][x2] = t1;
  t1.x = x2; t1.y = y2;
  t2.x = x1; t2.y = y1;

  // Check if swap creates a match
  const matches = findMatches(state);
  if (matches.length === 0) {
    // Swap back — invalid move
    state.grid[y1][x1] = t1;
    state.grid[y2][x2] = t2;
    t1.x = x1; t1.y = y1;
    t2.x = x2; t2.y = y2;
    return false;
  }

  // Valid swap — start animation
  state.swapping = { from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, progress: 0 };
  state.cascadeCount = 0;
  state.comboCount = 0;
  return true;
}

export function findMatches(state: AlchemistState): { x: number; y: number; type: IngredientType }[][] {
  const { GRID_COLS, GRID_ROWS, MATCH_MIN } = AlchemistConfig;
  const matches: { x: number; y: number; type: IngredientType }[][] = [];

  // Helper: can tile participate in matches?
  const canMatch = (r: number, c: number) => !state.grid[r][c].cursed && state.grid[r][c].frozen <= 0;

  // Horizontal matches
  for (let row = 0; row < GRID_ROWS; row++) {
    let run: { x: number; y: number; type: IngredientType }[] = canMatch(row, 0) ? [{ x: 0, y: row, type: state.grid[row][0].type }] : [];
    for (let col = 1; col < GRID_COLS; col++) {
      if (canMatch(row, col) && run.length > 0 && state.grid[row][col].type === run[0].type) {
        run.push({ x: col, y: row, type: state.grid[row][col].type });
      } else {
        if (run.length >= MATCH_MIN) matches.push([...run]);
        run = canMatch(row, col) ? [{ x: col, y: row, type: state.grid[row][col].type }] : [];
      }
    }
    if (run.length >= MATCH_MIN) matches.push(run);
  }

  // Vertical matches
  for (let col = 0; col < GRID_COLS; col++) {
    let run: { x: number; y: number; type: IngredientType }[] = canMatch(0, col) ? [{ x: col, y: 0, type: state.grid[0][col].type }] : [];
    for (let row = 1; row < GRID_ROWS; row++) {
      if (canMatch(row, col) && run.length > 0 && state.grid[row][col].type === run[0].type) {
        run.push({ x: col, y: row, type: state.grid[row][col].type });
      } else {
        if (run.length >= MATCH_MIN) matches.push([...run]);
        run = canMatch(row, col) ? [{ x: col, y: row, type: state.grid[row][col].type }] : [];
      }
    }
    if (run.length >= MATCH_MIN) matches.push(run);
  }

  return matches;
}

export function processMatches(state: AlchemistState): number {
  const matches = findMatches(state);
  if (matches.length === 0) return 0;

  let totalCleared = 0;
  for (const match of matches) {
    for (const cell of match) {
      const tile = state.grid[cell.y][cell.x];
      if (!tile.matched) {
        tile.matched = true;
        totalCleared++;
        // Collect ingredient
        const current = state.collected.get(cell.type) ?? 0;
        state.collected.set(cell.type, current + 1);
        // Spawn particles
        state.particles.push({
          x: cell.x * AlchemistConfig.TILE_SIZE + AlchemistConfig.TILE_SIZE / 2,
          y: cell.y * AlchemistConfig.TILE_SIZE + AlchemistConfig.TILE_SIZE / 2,
          vx: (Math.random() - 0.5) * 60,
          vy: -40 - Math.random() * 40,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          color: tile.type === "fire" ? 0xff4422 : tile.type === "water" ? 0x2266ff : tile.type === "earth" ? 0x886622 : tile.type === "shadow" ? 0x6622aa : tile.type === "light" ? 0xffdd44 : 0x44dddd,
          size: 2 + Math.random() * 2,
        });
      }
    }
  }

  // Handle special tiles that were matched
  for (const match of matches) {
    for (const cell of match) {
      const tile = state.grid[cell.y][cell.x];
      if (tile.special === "bomb") {
        // Bomb: clear 3x3 area around it
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = cell.y + dy, nx = cell.x + dx;
            if (ny >= 0 && ny < AlchemistConfig.GRID_ROWS && nx >= 0 && nx < AlchemistConfig.GRID_COLS) {
              const adj = state.grid[ny][nx];
              if (!adj.matched) {
                adj.matched = true;
                totalCleared++;
                const cur = state.collected.get(adj.type) ?? 0;
                state.collected.set(adj.type, cur + 1);
              }
            }
          }
        }
        state.announcements.push({ text: "BOMB!", color: 0xff6622, timer: 1.5 });
      } else if (tile.special === "column_clear") {
        // Clear entire column
        for (let r = 0; r < AlchemistConfig.GRID_ROWS; r++) {
          const colTile = state.grid[r][cell.x];
          if (!colTile.matched) {
            colTile.matched = true;
            totalCleared++;
            const cur = state.collected.get(colTile.type) ?? 0;
            state.collected.set(colTile.type, cur + 1);
          }
        }
        state.announcements.push({ text: "COLUMN CLEAR!", color: 0x44ccff, timer: 1.5 });
      }
    }
  }

  // Generate special tiles for big matches (4+ = bomb, 5+ = column clear)
  for (const match of matches) {
    if (match.length >= 5) {
      // Mark the center tile position for a column_clear on next fill
      const center = match[Math.floor(match.length / 2)];
      (state as any)._pendingSpecial = { x: center.x, y: center.y, type: "column_clear" };
      state.announcements.push({ text: "5+ MATCH! Column Clear earned!", color: 0x44ccff, timer: 2 });
    } else if (match.length >= 4) {
      const center = match[Math.floor(match.length / 2)];
      (state as any)._pendingSpecial = { x: center.x, y: center.y, type: "bomb" };
      state.announcements.push({ text: "4 MATCH! Bomb earned!", color: 0xff6622, timer: 2 });
    }
  }

  // Thaw frozen tiles adjacent to matches, clear curses adjacent to matches
  for (const match of matches) {
    for (const cell of match) {
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = cell.x + dx, ny = cell.y + dy;
        if (nx >= 0 && nx < AlchemistConfig.GRID_COLS && ny >= 0 && ny < AlchemistConfig.GRID_ROWS) {
          const adj = state.grid[ny][nx];
          if (adj.frozen > 0) {
            adj.frozen--;
            if (adj.frozen <= 0) state.announcements.push({ text: "Thawed!", color: 0x88ccff, timer: 1 });
          }
          if (adj.cursed) {
            adj.cursed = false;
            state.announcements.push({ text: "Curse broken!", color: 0xaa44ff, timer: 1 });
          }
        }
      }
    }
  }

  // Score with escalating cascade multiplier
  state.cascadeCount++;
  // Cascade multiplier: 1x, 1.5x, 2x, 3x, 5x
  const cascadeMults = [1, 1.5, 2, 3, 5];
  state.cascadeMultiplier = cascadeMults[Math.min(state.cascadeCount - 1, cascadeMults.length - 1)];
  const cascadeBonus = state.cascadeCount > 1 ? AlchemistConfig.SCORE_PER_CASCADE * (state.cascadeCount - 1) : 0;
  const matchScore = Math.floor((totalCleared * AlchemistConfig.SCORE_PER_MATCH + cascadeBonus) * state.cascadeMultiplier);
  state.score += matchScore;
  state.comboCount += matches.length;
  if (state.comboCount > state.bestCombo) state.bestCombo = state.comboCount;

  if (state.cascadeCount > 1) {
    state.announcements.push({ text: `CASCADE x${state.cascadeCount}! (${state.cascadeMultiplier}x)`, color: 0xffaa44, timer: 1.5 });
  }
  if (totalCleared >= 5) {
    state.announcements.push({ text: `${totalCleared} MATCH!`, color: 0x44ffaa, timer: 1.2 });
  }

  return totalCleared;
}

export function collapseGrid(state: AlchemistState): boolean {
  const { GRID_COLS, GRID_ROWS } = AlchemistConfig;
  let anyFell = false;

  // Remove matched tiles and drop down
  for (let col = 0; col < GRID_COLS; col++) {
    // Compact column — move non-matched tiles down
    let writeRow = GRID_ROWS - 1;
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (!state.grid[row][col].matched) {
        if (row !== writeRow) {
          state.grid[writeRow][col] = state.grid[row][col];
          state.grid[writeRow][col].y = writeRow;
          state.grid[writeRow][col].falling = true;
          anyFell = true;
        }
        writeRow--;
      }
    }
    // Fill empty spaces at top
    const rng = seedRng(Date.now() + col * 1000);
    for (let row = writeRow; row >= 0; row--) {
      // Boost rare ingredient spawn when customers need them
      const needsRare = state.customers.some(c => !c.served && !c.left && c.recipe.ingredients.some(([t]) => RARE_INGREDIENTS.includes(t as any)));
      const rareChance = needsRare ? 0.2 : 0.12;
      const types = rng() < rareChance ? [...ALL_INGREDIENTS, ...RARE_INGREDIENTS] : ALL_INGREDIENTS;
      const type = types[Math.floor(rng() * types.length)];
      // Check if a special tile should spawn here
      const pending = (state as any)._pendingSpecial;
      let special: import("../state/AlchemistState").SpecialTile = "none";
      if (pending && pending.x === col && row === writeRow) {
        special = pending.type;
        (state as any)._pendingSpecial = null;
      }
      state.grid[row][col] = {
        type, special, cursed: false, frozen: 0,
        x: col, y: row,
        px: col * AlchemistConfig.TILE_SIZE,
        py: (row - (writeRow - row + 1)) * AlchemistConfig.TILE_SIZE,
        matched: false, falling: true, selected: false,
        scale: 0.5,
      };
      anyFell = true;
    }
  }

  return anyFell;
}

export function updateFalling(state: AlchemistState, dt: number): boolean {
  const { TILE_SIZE } = AlchemistConfig;
  let anyMoving = false;

  for (let row = 0; row < state.grid.length; row++) {
    for (let col = 0; col < state.grid[row].length; col++) {
      const tile = state.grid[row][col];
      const targetY = row * TILE_SIZE;
      if (tile.py < targetY) {
        tile.py = Math.min(targetY, tile.py + AlchemistConfig.FALL_SPEED * dt);
        tile.falling = true;
        anyMoving = true;
      } else {
        tile.py = targetY;
        tile.falling = false;
      }
      tile.px = col * TILE_SIZE;
      // Scale animation (pop in)
      if (tile.scale < 1) {
        tile.scale = Math.min(1, tile.scale + dt * 4);
      }
    }
  }

  return anyMoving;
}

export function canServeCustomer(state: AlchemistState, customerId: string): boolean {
  const customer = state.customers.find(c => c.id === customerId && !c.served && !c.left);
  if (!customer) return false;
  for (const [type, count] of customer.recipe.ingredients) {
    if ((state.collected.get(type) ?? 0) < count) return false;
  }
  return true;
}

export function serveCustomer(state: AlchemistState, customerId: string): boolean {
  const customer = state.customers.find(c => c.id === customerId && !c.served && !c.left);
  if (!customer || !canServeCustomer(state, customerId)) return false;

  // Consume ingredients
  for (const [type, count] of customer.recipe.ingredients) {
    state.collected.set(type, (state.collected.get(type) ?? 0) - count);
  }

  customer.served = true;
  state.gold += customer.recipe.value;
  // Serve streak bonus
  state.serveStreak++;
  if (state.serveStreak > state.bestServeStreak) state.bestServeStreak = state.serveStreak;
  const streakBonus = state.serveStreak >= 3 ? Math.floor(customer.recipe.value * 0.5) : 0;
  state.gold += streakBonus;
  if (streakBonus > 0) {
    state.announcements.push({ text: `Serve Streak x${state.serveStreak}! +${streakBonus}g`, color: 0xff8844, timer: 1.5 });
  }

  state.score += AlchemistConfig.SCORE_PER_SERVE;
  state.reputation += AlchemistConfig.REPUTATION_PER_SERVE;
  state.potionsBrewed++;
  state.customersServed++;

  // Update tier
  for (let i = AlchemistConfig.TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (state.reputation >= AlchemistConfig.TIER_THRESHOLDS[i]) {
      state.tier = i;
      break;
    }
  }

  state.announcements.push({ text: `${customer.recipe.name} brewed! +${customer.recipe.value}g`, color: 0xffd700, timer: 2 });
  state.log.push(`Served ${customer.name} a ${customer.recipe.name}!`);
  return true;
}

// ---------------------------------------------------------------------------
// Power-ups
// ---------------------------------------------------------------------------

/** Shuffle the entire board randomly */
export function useShuffle(state: AlchemistState): boolean {
  if (state.shufflesRemaining <= 0) return false;
  state.shufflesRemaining--;
  const rng = seedRng(Date.now());
  // Collect all types
  const types: import("../config/AlchemistConfig").IngredientType[] = [];
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid[r].length; c++) {
      types.push(state.grid[r][c].type);
    }
  }
  // Shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  // Reassign
  let idx = 0;
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid[r].length; c++) {
      state.grid[r][c].type = types[idx++];
      state.grid[r][c].scale = 0.5; // pop animation
    }
  }
  state.announcements.push({ text: "BOARD SHUFFLED!", color: 0xffaa44, timer: 1.5 });
  state.log.push("Used shuffle power-up.");
  return true;
}

/** Add 30 seconds to the timer */
export function useTimeExtension(state: AlchemistState): boolean {
  if (state.timeExtensions <= 0) return false;
  state.timeExtensions--;
  state.timeLimit += 30;
  state.announcements.push({ text: "+30 SECONDS!", color: 0x44ccff, timer: 1.5 });
  state.log.push("Used time extension.");
  return true;
}

/** Convert a random tile to the most-needed ingredient */
export function useMagnet(state: AlchemistState): boolean {
  if (state.magnetsRemaining <= 0) return false;
  state.magnetsRemaining--;
  // Find most-needed ingredient across all customers
  const needs: Map<string, number> = new Map();
  for (const cust of state.customers) {
    if (cust.served || cust.left) continue;
    for (const [type, count] of cust.recipe.ingredients) {
      const have = state.collected.get(type) ?? 0;
      const deficit = count - have;
      if (deficit > 0) needs.set(type, (needs.get(type) ?? 0) + deficit);
    }
  }
  if (needs.size === 0) return false;
  // Find ingredient with biggest deficit
  let bestType = "";
  let bestDeficit = 0;
  for (const [t, d] of needs) { if (d > bestDeficit) { bestType = t; bestDeficit = d; } }
  if (!bestType) return false;
  // Convert 3 random tiles to that ingredient
  const candidates: { r: number; c: number }[] = [];
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid[r].length; c++) {
      if (state.grid[r][c].type !== bestType) candidates.push({ r, c });
    }
  }
  const rng = seedRng(Date.now());
  for (let i = 0; i < 3 && candidates.length > 0; i++) {
    const idx = Math.floor(rng() * candidates.length);
    const { r, c } = candidates.splice(idx, 1)[0];
    state.grid[r][c].type = bestType as import("../config/AlchemistConfig").IngredientType;
    state.grid[r][c].scale = 0.3;
  }
  state.announcements.push({ text: `MAGNET: 3 ${bestType} tiles!`, color: 0xaa44ff, timer: 1.5 });
  state.log.push(`Used magnet: converted 3 tiles to ${bestType}.`);
  return true;
}
