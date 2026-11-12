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

// Index 0 (default): plain white, the lay-practitioner "áo tràng" worn for
// precept days in the Nam Tông (Theravada) tradition — owner's own robe.
export const ROBE_COLORS: RobeColor[] = [
  { base: "#f4f1e6", shade: "#d9d3bf", trim: "#b8b09a" },
  { base: "#3f6e9c", shade: "#2d5378", trim: "#9cc0e0" },
  { base: "#28456a", shade: "#1c3350", trim: "#7fa8cc" },
  { base: "#4f7d5c", shade: "#395c43", trim: "#9fc7a8" },
  { base: "#6a5a8c", shade: "#4c3f66", trim: "#b7a8d6" },
  { base: "#8c5a4a", shade: "#663f33", trim: "#d6a28e" },
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
