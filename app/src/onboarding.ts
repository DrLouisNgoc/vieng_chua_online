export type Gender = "nam" | "nu";

export interface OnboardingState {
  name: string;
  gender: Gender;
  colorIndex: number;
}

export interface OnboardingController {
  readonly state: OnboardingState;
  readonly isValid: boolean;
  setName: (name: string) => void;
  setGender: (gender: Gender) => void;
  setColorIndex: (index: number) => void;
}

export interface RobeColor {
  base: string;
  shade: string;
  trim: string;
}

export const ROBE_COLORS: RobeColor[] = [
  { base: "#3f6e9c", shade: "#2d5378", trim: "#9cc0e0" },
  { base: "#28456a", shade: "#1c3350", trim: "#7fa8cc" },
  { base: "#4f7d5c", shade: "#395c43", trim: "#9fc7a8" },
  { base: "#6a5a8c", shade: "#4c3f66", trim: "#b7a8d6" },
  { base: "#8c5a4a", shade: "#663f33", trim: "#d6a28e" },
];

const DEFAULT_NAME = "Thiện Tâm";
const MAX_NAME_LENGTH = 24;

export function createOnboardingController(): OnboardingController {
  const state: OnboardingState = {
    name: DEFAULT_NAME,
    gender: "nam",
    colorIndex: 0,
  };

  function setName(name: string): void {
    state.name = name.trim();
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
      return state.name.length > 0 && state.name.length <= MAX_NAME_LENGTH;
    },
    setName,
    setGender,
    setColorIndex,
  };
}
