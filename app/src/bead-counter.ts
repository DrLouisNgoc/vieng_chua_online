// Prayer-bead counter: a 108-bead round plus a lifetime total that is kept
// on this device (owner decision D6).

export const BEADS_PER_ROUND = 108;
export const BEAD_TOTAL_KEY = "vieng-chua.beads.total";

export interface BeadStore {
  load: () => number | null;
  save: (total: number) => void;
}

export interface BeadCounter {
  // Bead within the current round: 0 before the first, then 1..108.
  readonly round: number;
  readonly total: number;
  turn: () => void;
}

function roundOf(total: number): number {
  return total === 0 ? 0 : ((total - 1) % BEADS_PER_ROUND) + 1;
}

export function createBeadCounter(store: BeadStore): BeadCounter {
  let total = store.load() ?? 0;
  return {
    get round() {
      return roundOf(total);
    },
    get total() {
      return total;
    },
    turn() {
      total += 1;
      store.save(total);
    },
  };
}

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

// Storage can be missing or throw (private mode, blocked site data); the
// counter then just starts from 0 and does not persist.
export function createStorageBeadStore(storage: KeyValueStorage, key: string): BeadStore {
  return {
    load() {
      try {
        const value = Number.parseInt(storage.getItem(key) ?? "", 10);
        return Number.isFinite(value) && value >= 0 ? value : null;
      } catch (error: unknown) {
        console.warn("Could not read the bead total:", error);
        return null;
      }
    },
    save(total) {
      try {
        storage.setItem(key, String(total));
      } catch (error: unknown) {
        console.warn("Could not save the bead total:", error);
      }
    },
  };
}
