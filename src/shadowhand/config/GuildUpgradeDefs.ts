// ---------------------------------------------------------------------------
// Shadowhand mode — guild upgrade definitions
// ---------------------------------------------------------------------------

import type { GuildUpgradeId } from "../state/ShadowhandState";

export interface GuildUpgradeDef {
  id: GuildUpgradeId;
  name: string;
  desc: string;
  cost: number;
  tierRequired: number;
  icon: string;
  color: number;
}

export const GUILD_UPGRADE_DEFS: GuildUpgradeDef[] = [
  {
    id: "safe_house",
    name: "Safe House",
    desc: "Heat decays 50% faster between heists.",
    cost: 150,
    tierRequired: 0,
    icon: "house",
    color: 0x44aa44,
  },
  {
    id: "training_ground",
    name: "Training Ground",
    desc: "Crew earn 50% more XP from heists.",
    cost: 200,
    tierRequired: 1,
    icon: "sword",
    color: 0xcc8844,
  },
  {
    id: "armory",
    name: "Guild Armory",
    desc: "Equipment costs 20% less in the shop.",
    cost: 250,
    tierRequired: 1,
    icon: "shield",
    color: 0x8888cc,
  },
  {
    id: "intel_network",
    name: "Intelligence Network",
    desc: "Guard count shown before heist. Intel costs halved.",
    cost: 300,
    tierRequired: 2,
    icon: "eye",
    color: 0xaaaa44,
  },
  {
    id: "escape_tunnels",
    name: "Escape Tunnels",
    desc: "+1 exit point on every heist map.",
    cost: 350,
    tierRequired: 2,
    icon: "tunnel",
    color: 0x886644,
  },
  {
    id: "fence_contact",
    name: "Master Fence",
    desc: "Loot sells for 15% more gold.",
    cost: 400,
    tierRequired: 2,
    icon: "coin",
    color: 0xffd700,
  },
  {
    id: "infirmary",
    name: "Infirmary",
    desc: "Crew fully healed between heists. +10 max HP.",
    cost: 300,
    tierRequired: 1,
    icon: "heart",
    color: 0xff4444,
  },
  {
    id: "shadow_library",
    name: "Shadow Library",
    desc: "Shade shadow meld lasts 4s longer. Alchemist gets extra acid.",
    cost: 500,
    tierRequired: 3,
    icon: "book",
    color: 0x6644cc,
  },
  {
    id: "thieves_cant",
    name: "Thieves' Cant",
    desc: "All crew gain +1 vision range from shared secret signals.",
    cost: 450,
    tierRequired: 3,
    icon: "scroll",
    color: 0x44ccaa,
  },
];

export function getUpgradeById(id: GuildUpgradeId): GuildUpgradeDef | undefined {
  return GUILD_UPGRADE_DEFS.find(u => u.id === id);
}

export function getAvailableUpgrades(tier: number, owned: Set<GuildUpgradeId>): GuildUpgradeDef[] {
  return GUILD_UPGRADE_DEFS.filter(u => u.tierRequired <= tier && !owned.has(u.id));
}
