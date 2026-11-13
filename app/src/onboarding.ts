import { isDefaultName, MAX_NAME_LENGTH } from "../../shared/protocol";

export type Gender = "nam" | "nu";

export interface OnboardingState {
  name: string;
  gender: Gender;
  colorIndex: number;
}

export interface OnboardingController {
  readonly state: OnboardingState;
  readonly isValid: boolean;
  // Once locked (the server already has a pháp danh for this visitor's
  // ip), setName() is a no-op — owner, 2026-11-10: "họ chỉ được dùng 1
  // pháp danh này".
  readonly isNameLocked: boolean;
  setName: (name: string) => void;
  lockName: (name: string) => void;
  setGender: (gender: Gender) => void;
  setColorIndex: (index: number) => void;
}

export interface RobeColor {
  base: string;
  shade: string;
  trim: string;
}

// Nam tông (Theravada) robe colours (owner, 2026-11-13). Index 0 (default) is
// the saffron "vàng nghệ" of the monks; the plain white "áo tràng" that lay
// practitioners wear on precept days (the earlier default) is kept as index 3.
export const ROBE_COLORS: RobeColor[] = [
  { base: "#e0951b", shade: "#b8760f", trim: "#f2c25b" },
  { base: "#d9731a", shade: "#b05510", trim: "#f0a560" },
  { base: "#b06a22", shade: "#864d14", trim: "#d9a066" },
  { base: "#f4f1e6", shade: "#d9d3bf", trim: "#b8b09a" },
  { base: "#8c3a22", shade: "#66291a", trim: "#c9806a" },
  { base: "#e8c44a", shade: "#c2a02e", trim: "#f5e08f" },
];

// The forbidden default pháp danh, so onboarding starts with an empty name.
// Same rule as the server's (shared/protocol.ts); here only for instant
// feedback, the server enforces it for real.
export { isDefaultName } from "../../shared/protocol";

export function createOnboardingController(): OnboardingController {
  const state: OnboardingState = {
    name: "",
    gender: "nam",
    colorIndex: 0,
  };
  let isNameLocked = false;

  function setName(name: string): void {
    if (isNameLocked) return;
    state.name = name.trim();
  }

  function lockName(name: string): void {
    isNameLocked = true;
    state.name = name;
  }

  function setGender(gender: Gender): void {
    state.gender = gender;
  }

  function setColorIndex(index: number): void {
    if (index < 0 || index >= ROBE_COLORS.length) {
      return;
    }
    state.colorIndex = index;
  }

  return {
    get state() {
      return state;
    },
    get isValid() {
      return state.name.length > 0 && state.name.length <= MAX_NAME_LENGTH && !isDefaultName(state.name);
    },
    get isNameLocked() {
      return isNameLocked;
    },
    setName,
    lockName,
    setGender,
    setColorIndex,
  };
}
