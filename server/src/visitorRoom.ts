import type { VisitorState, VisitorView } from "./protocol.js";

// Visitors who have joined, their latest state, and who sits on which
// cushion. Pure: server.ts feeds it parsed messages and broadcasts
// snapshot() on its tick when takeDirty() says something changed.

export type UpdateResult = "ok" | "seat-refused" | "ignored";

export interface VisitorRoom {
  join: (id: string, name: string, colorIndex: number) => void;
  updateState: (id: string, state: VisitorState) => UpdateResult;
  leave: (id: string) => void;
  snapshot: () => VisitorView[];
  takeDirty: () => boolean;
}

const START_STATE: VisitorState = {
  x: 0,
  z: 0,
  heading: Math.PI,
  activity: "idle",
  seatIndex: null,
  holdingBroom: false,
  beadsVisible: false,
  beadTotal: 0,
};

function sameState(a: VisitorState, b: VisitorState): boolean {
  return (
    a.x === b.x &&
    a.z === b.z &&
    a.heading === b.heading &&
    a.activity === b.activity &&
    a.seatIndex === b.seatIndex &&
    a.holdingBroom === b.holdingBroom &&
    a.beadsVisible === b.beadsVisible &&
    a.beadTotal === b.beadTotal
  );
}

export function createVisitorRoom(): VisitorRoom {
  const visitors = new Map<string, VisitorView>();
  let dirty = false;

  function seatHolder(seatIndex: number): string | undefined {
    for (const visitor of visitors.values()) {
      if (visitor.seatIndex === seatIndex) return visitor.id;
    }
    return undefined;
  }

  return {
    join(id, name, colorIndex) {
      const existing = visitors.get(id);
      visitors.set(id, { ...(existing ?? { ...START_STATE }), id, name, colorIndex });
      dirty = true;
    },
    updateState(id, state) {
      const visitor = visitors.get(id);
      if (!visitor) return "ignored";
      let next = state;
      let result: UpdateResult = "ok";
      if (state.seatIndex !== null) {
        const holder = seatHolder(state.seatIndex);
        if (holder !== undefined && holder !== id) {
          // keep where they are, but standing
          next = { ...state, seatIndex: null, activity: "idle" };
          result = "seat-refused";
        }
      }
      if (!sameState(visitor, next)) {
        visitors.set(id, { ...visitor, ...next });
        dirty = true;
      }
      return result;
    },
    leave(id) {
      if (visitors.delete(id)) dirty = true;
    },
    snapshot() {
      return [...visitors.values()].map((visitor) => ({ ...visitor }));
    },
    takeDirty() {
      const was = dirty;
      dirty = false;
      return was;
    },
  };
}
