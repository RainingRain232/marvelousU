// Per-player selection state for RTS mode

export interface SelectionState {
  selectedUnitIds: Set<string>;
  controlGroups: Map<number, Set<string>>; // Ctrl+1-9 groups
}

export function createSelectionState(): SelectionState {
  return {
    selectedUnitIds: new Set(),
    controlGroups: new Map(),
  };
}
