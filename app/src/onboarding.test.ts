import { describe, expect, it } from "vitest";

import { createOnboardingController, ROBE_COLORS } from "./onboarding";

describe("createOnboardingController", () => {
  it("starts with an empty name (no more generic default), gender nam, and the first robe color", () => {
    const controller = createOnboardingController();
    expect(controller.state.gender).toBe("nam");
    expect(controller.state.colorIndex).toBe(0);
    expect(controller.state.name).toBe("");
  });

  it("setName() trims and updates the name", () => {
    const controller = createOnboardingController();
    controller.setName("  Diệu Tâm  ");
    expect(controller.state.name).toBe("Diệu Tâm");
  });

  it.each([
    ["an empty (or whitespace-only) name", " ".repeat(3)],
    ["a name longer than 24 characters", "a".repeat(25)],
    ["the forbidden default pháp danh 'Thiện Tâm'", "Thiện Tâm"],
    ["the default name regardless of case or diacritics", "thien tam"],
  ])("isValid is false for %s", (_label, name) => {
    const controller = createOnboardingController();
    controller.setName(name);
    expect(controller.isValid).toBe(false);
  });

  it("isValid is true for a normal name", () => {
    const controller = createOnboardingController();
    controller.setName("Diệu Tâm");
    expect(controller.isValid).toBe(true);
  });

  it("lockName() sets the name and marks it locked", () => {
    const controller = createOnboardingController();
    controller.lockName("Diệu Tâm");
    expect(controller.isNameLocked).toBe(true);
    expect(controller.state.name).toBe("Diệu Tâm");
    expect(controller.isValid).toBe(true);
  });

  it("setName() is a no-op once the name is locked", () => {
    const controller = createOnboardingController();
    controller.lockName("Diệu Tâm");
    controller.setName("Tên Khác");
    expect(controller.state.name).toBe("Diệu Tâm");
  });

  it("setGender() updates gender", () => {
    const controller = createOnboardingController();
    controller.setGender("nu");
    expect(controller.state.gender).toBe("nu");
  });

  it("setColorIndex() updates the selected color, ignoring out-of-range indexes", () => {
    const controller = createOnboardingController();
    controller.setColorIndex(2);
    expect(controller.state.colorIndex).toBe(2);

    controller.setColorIndex(ROBE_COLORS.length + 5);
    expect(controller.state.colorIndex).toBe(2);

    controller.setColorIndex(-1);
    expect(controller.state.colorIndex).toBe(2);
  });
});
