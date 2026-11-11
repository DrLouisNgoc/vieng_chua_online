import type { ChatEntry } from "./protocol.js";

// Public chat history: a ring buffer so a late joiner sees recent context.
// Pure; server.ts feeds it sender name + text and broadcasts the result.

export interface ChatRoom {
  add: (name: string, text: string) => ChatEntry;
  recent: () => ChatEntry[];
}

const DEFAULT_HISTORY_LIMIT = 50;

export function createChatRoom(historyLimit = DEFAULT_HISTORY_LIMIT): ChatRoom {
  const messages: ChatEntry[] = [];

  return {
    add(name, text) {
      const entry: ChatEntry = { id: crypto.randomUUID(), name, text, ts: Date.now() };
      messages.push(entry);
      if (messages.length > historyLimit) messages.shift();
      return entry;
    },
    recent() {
      return [...messages];
    },
  };
}
