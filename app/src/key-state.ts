// Held-key tracking by physical key code (KeyboardEvent.code), so a
// Vietnamese input method (Unikey/Telex) rewriting the typed character can
// never leave a key stuck "down".
export interface KeyState {
  down: (code: string) => void;
  up: (code: string) => void;
  clear: () => void;
  isAnyHeld: (codes: readonly string[]) => boolean;
}

export function createKeyState(): KeyState {
  const held = new Set<string>();
  return {
    down: (code) => {
      held.add(code);
    },
    up: (code) => {
      held.delete(code);
    },
    clear: () => {
      held.clear();
    },
    isAnyHeld: (codes) => codes.some((code) => held.has(code)),
  };
}
