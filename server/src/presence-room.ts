export interface PresenceRoom {
  readonly count: number;
  join: () => string;
  leave: (visitorId: string) => void;
}

export function createPresenceRoom(): PresenceRoom {
  const visitorIds = new Set<string>();

  return {
    get count() {
      return visitorIds.size;
    },
    join() {
      const visitorId = crypto.randomUUID();
      visitorIds.add(visitorId);
      return visitorId;
    },
    leave(visitorId: string) {
      visitorIds.delete(visitorId);
    },
  };
}
