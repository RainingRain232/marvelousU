import type { RPGState } from "@rpg/state/RPGState";

const PVP_STORAGE_KEY = "rpg_pvp_parties";

export interface PvPPartySnapshot {
  name: string;
  timestamp: number;
  members: { name: string; unitType: string; level: number; atk: number; def: number; hp: number }[];
}

/** Save current party as a PvP challenge target */
export function uploadPartyForPvP(rpg: RPGState, partyName: string): void {
  const snapshots = _loadSnapshots();
  const snapshot: PvPPartySnapshot = {
    name: partyName,
    timestamp: Date.now(),
    members: rpg.party.map(m => ({
      name: m.name,
      unitType: m.unitType,
      level: m.level,
      atk: m.atk,
      def: m.def,
      hp: m.maxHp,
    })),
  };
  // Keep max 10 snapshots
  snapshots.push(snapshot);
  if (snapshots.length > 10) snapshots.shift();
  localStorage.setItem(PVP_STORAGE_KEY, JSON.stringify(snapshots));
}

/** Get available PvP opponents */
export function getPvPOpponents(): PvPPartySnapshot[] {
  return _loadSnapshots();
}

function _loadSnapshots(): PvPPartySnapshot[] {
  try {
    const raw = localStorage.getItem(PVP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
