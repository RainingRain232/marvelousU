// ---------------------------------------------------------------------------
// Round Table – Map Generation System
// ---------------------------------------------------------------------------

import {
  ActMap, MapNode, MapNodeType, RTRunState,
} from "../types";
import { RT_BALANCE } from "../config/RoundTableBalance";
import {
  ENCOUNTER_TABLE, ELITE_TABLE, BOSS_TABLE,
} from "../config/RoundTableEnemies";
import { getEventsForAct } from "../config/RoundTableEvents";

export const RoundTableMapSystem = {

  /** Generate maps for all 3 acts. */
  generateAllMaps(run: RTRunState, rng: { next: () => number }): void {
    run.maps = [];
    for (let act = 1; act <= RT_BALANCE.TOTAL_ACTS; act++) {
      run.maps.push(this.generateActMap(act, rng, run.ascension));
    }
  },

  /** Generate a single act's map. */
  generateActMap(act: number, rng: { next: () => number }, ascension = 0): ActMap {
    const rows = RT_BALANCE.ROWS_PER_ACT;
    const nodes: MapNode[] = [];
    let nextId = 0;

    // Layout: each row has 3-4 columns
    const rowCols: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const numCols = RT_BALANCE.MIN_COLS + Math.floor(rng.next() * (RT_BALANCE.MAX_COLS - RT_BALANCE.MIN_COLS + 1));
      const cols: number[] = [];
      for (let c = 0; c < numCols; c++) cols.push(c);
      rowCols.push(cols);
    }

    // Create nodes
    for (let r = 0; r < rows; r++) {
      const cols = rowCols[r];
      for (const c of cols) {
        const type = this._nodeTypeForRow(r, rows, rng, ascension);
        const x = 80 + c * 160 + (rng.next() * 40 - 20);
        const y = 80 + r * 80;
        const events = getEventsForAct(act);

        const node: MapNode = {
          id: nextId++,
          type,
          row: r,
          col: c,
          x,
          y,
          connections: [],
          visited: false,
          encounterIds: [],
          eventId: "",
        };

        // Assign encounters
        if (type === MapNodeType.ENEMY) {
          const pool = ENCOUNTER_TABLE[act] ?? ENCOUNTER_TABLE[1];
          node.encounterIds = pool[Math.floor(rng.next() * pool.length)];
        } else if (type === MapNodeType.ELITE) {
          const pool = ELITE_TABLE[act] ?? ELITE_TABLE[1];
          node.encounterIds = pool[Math.floor(rng.next() * pool.length)];
        } else if (type === MapNodeType.EVENT) {
          if (events.length > 0) {
            node.eventId = events[Math.floor(rng.next() * events.length)].id;
          }
        }

        nodes.push(node);
      }
    }

    // Add boss node
    const bossPool = BOSS_TABLE[act] ?? BOSS_TABLE[1];
    const bossNode: MapNode = {
      id: nextId++,
      type: MapNodeType.BOSS,
      row: rows,
      col: 1,
      x: 300,
      y: 80 + rows * 80,
      connections: [],
      visited: false,
      encounterIds: [bossPool[Math.floor(rng.next() * bossPool.length)]],
      eventId: "",
    };
    nodes.push(bossNode);

    // Build connections: each node connects to 1-2 nodes in the next row
    for (let r = 0; r < rows; r++) {
      const currentRow = nodes.filter(n => n.row === r);
      const nextRow = r === rows - 1
        ? [bossNode]
        : nodes.filter(n => n.row === r + 1);

      if (nextRow.length === 0) continue;

      for (const node of currentRow) {
        // Connect to at least 1 node in next row
        // Find closest node by column
        const sorted = [...nextRow].sort((a, b) =>
          Math.abs(a.col - node.col) - Math.abs(b.col - node.col)
        );

        // Always connect to closest
        node.connections.push(sorted[0].id);

        // 50% chance to connect to second closest
        if (sorted.length > 1 && rng.next() < 0.5) {
          node.connections.push(sorted[1].id);
        }
      }

      // Ensure every next-row node has at least one incoming connection
      for (const nextNode of nextRow) {
        const hasIncoming = currentRow.some(n => n.connections.includes(nextNode.id));
        if (!hasIncoming) {
          // Connect from the closest current row node
          const closest = currentRow.reduce((best, n) =>
            Math.abs(n.col - nextNode.col) < Math.abs(best.col - nextNode.col) ? n : best
          );
          closest.connections.push(nextNode.id);
        }
      }
    }

    return {
      act,
      nodes,
      bossId: bossNode.encounterIds[0],
      currentNodeId: -1,
    };
  },

  /** Get available next nodes from the current position. */
  getAvailableNodes(map: ActMap): MapNode[] {
    if (map.currentNodeId === -1) {
      // Starting: can visit any node in row 0
      return map.nodes.filter(n => n.row === 0);
    }
    const current = map.nodes.find(n => n.id === map.currentNodeId);
    if (!current) return [];
    return current.connections
      .map(id => map.nodes.find(n => n.id === id)!)
      .filter(Boolean);
  },

  /** Move to a node. */
  visitNode(run: RTRunState, nodeId: number): MapNode | null {
    const map = run.maps[run.act - 1];
    if (!map) return null;
    const node = map.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    node.visited = true;
    map.currentNodeId = nodeId;
    run.floor++;

    return node;
  },

  /** Check if act is complete (boss beaten). */
  isActComplete(map: ActMap): boolean {
    const bossNode = map.nodes.find(n => n.type === MapNodeType.BOSS);
    return bossNode?.visited ?? false;
  },

  // ── Internal ──

  _nodeTypeForRow(row: number, totalRows: number, rng: { next: () => number }, ascension = 0): MapNodeType {
    // Row 0: always enemy
    if (row === 0) return MapNodeType.ENEMY;
    // Row totalRows-1: always rest before boss
    if (row === totalRows - 1) return MapNodeType.REST;

    // Elite rows: row 6 and row 12
    if (row === 6 || row === 12) {
      return rng.next() < 0.5 ? MapNodeType.ELITE : MapNodeType.ENEMY;
    }

    // Treasure: row 8
    if (row === 8) return MapNodeType.TREASURE;

    // Shop: row 5, 10
    if (row === 5 || row === 10) return MapNodeType.SHOP;

    // Otherwise weighted random
    const roll = rng.next();
    const eliteBoost = ascension >= 13 ? 0.08 : 0; // A13: more elites
    if (roll < 0.45 - eliteBoost) return MapNodeType.ENEMY;
    if (roll < 0.68 - eliteBoost) return MapNodeType.EVENT;
    if (roll < 0.78 + eliteBoost) return MapNodeType.ELITE;
    if (roll < 0.88) return MapNodeType.REST;
    if (roll < 0.95) return MapNodeType.SHOP;
    return MapNodeType.TREASURE;
  },
};
