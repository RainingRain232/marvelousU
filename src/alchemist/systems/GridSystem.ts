// ---------------------------------------------------------------------------
// Alchemist mode — grid matching, swapping, cascading
// ---------------------------------------------------------------------------

import type { AlchemistState, GridTile } from "../state/AlchemistState";
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

  // Horizontal matches
  for (let row = 0; row < GRID_ROWS; row++) {
    let run: { x: number; y: number; type: IngredientType }[] = [{ x: 0, y: row, type: state.grid[row][0].type }];
    for (let col = 1; col < GRID_COLS; col++) {
      if (state.grid[row][col].type === run[0].type) {
        run.push({ x: col, y: row, type: state.grid[row][col].type });
      } else {
        if (run.length >= MATCH_MIN) matches.push([...run]);
        run = [{ x: col, y: row, type: state.grid[row][col].type }];
      }
    }
    if (run.length >= MATCH_MIN) matches.push(run);
  }

  // Vertical matches
  for (let col = 0; col < GRID_COLS; col++) {
    let run: { x: number; y: number; type: IngredientType }[] = [{ x: col, y: 0, type: state.grid[0][col].type }];
    for (let row = 1; row < GRID_ROWS; row++) {
      if (state.grid[row][col].type === run[0].type) {
        run.push({ x: col, y: row, type: state.grid[row][col].type });
      } else {
        if (run.length >= MATCH_MIN) matches.push([...run]);
        run = [{ x: col, y: row, type: state.grid[row][col].type }];
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

  // Score
  state.cascadeCount++;
  const cascadeBonus = state.cascadeCount > 1 ? AlchemistConfig.SCORE_PER_CASCADE * (state.cascadeCount - 1) : 0;
  const matchScore = totalCleared * AlchemistConfig.SCORE_PER_MATCH + cascadeBonus;
  state.score += matchScore;
  state.comboCount += matches.length;
  if (state.comboCount > state.bestCombo) state.bestCombo = state.comboCount;

  if (state.cascadeCount > 1) {
    state.announcements.push({ text: `CASCADE x${state.cascadeCount}!`, color: 0xffaa44, timer: 1.5 });
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
      const types = rng() < 0.08 ? [...ALL_INGREDIENTS, ...RARE_INGREDIENTS] : ALL_INGREDIENTS;
      const type = types[Math.floor(rng() * types.length)];
      state.grid[row][col] = {
        type,
        x: col, y: row,
        px: col * AlchemistConfig.TILE_SIZE,
        py: (row - (writeRow - row + 1)) * AlchemistConfig.TILE_SIZE, // start above grid
        matched: false, falling: true, selected: false,
        scale: 0.5, // pop-in animation
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
