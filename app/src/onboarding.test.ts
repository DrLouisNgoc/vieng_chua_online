import { describe, it, expect } from "vitest";
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

  it("isValid is false for an empty (or whitespace-only) name", () => {
    const controller = createOnboardingController();
    controller.setName("   ");
    expect(controller.isValid).toBe(false);
  });

  it("isValid is false for a name longer than 24 characters", () => {
    const controller = createOnboardingController();
    controller.setName("a".repeat(25));
    expect(controller.isValid).toBe(false);
  });

  it("isValid is true for a normal name", () => {
    const controller = createOnboardingController();
    controller.setName("Diệu Tâm");
    expect(controller.isValid).toBe(true);
  });

  it("isValid is false for the forbidden default pháp danh 'Thiện Tâm'", () => {
    const controller = createOnboardingController();
    controller.setName("Thiện Tâm");
    expect(controller.isValid).toBe(false);
  });

  it("isValid is false for the default name regardless of case or diacritics", () => {
    const controller = createOnboardingController();
    controller.setName("thien tam");
    expect(controller.isValid).toBe(false);
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
