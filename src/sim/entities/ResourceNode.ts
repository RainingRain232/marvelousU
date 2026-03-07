// Resource node — harvestable resource on the map (gold mine, forest, quarry)

import type { Vec2 } from "@/types";

export enum ResourceType {
  GOLD = "gold",
  WOOD = "wood",
  STONE = "stone",
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: Vec2;
  remaining: number;
  maxAmount: number;
  gatherersMax: number; // Max simultaneous gatherers
  currentGatherers: Set<string>; // Unit IDs currently gathering here
}

let _nodeIdCounter = 0;

export function createResourceNode(opts: {
  type: ResourceType;
  position: Vec2;
  amount: number;
  gatherersMax?: number;
  id?: string;
}): ResourceNode {
  return {
    id: opts.id ?? `rnode-${++_nodeIdCounter}`,
    type: opts.type,
    position: { ...opts.position },
    remaining: opts.amount,
    maxAmount: opts.amount,
    gatherersMax: opts.gatherersMax ?? 8,
    currentGatherers: new Set(),
  };
}
