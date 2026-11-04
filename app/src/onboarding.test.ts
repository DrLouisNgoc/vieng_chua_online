import { describe, it, expect } from "vitest";
import { createOnboardingController, ROBE_COLORS } from "./onboarding";

describe("createOnboardingController", () => {
  it("starts with a default name, gender nam, and the first robe color", () => {
    const controller = createOnboardingController();
    expect(controller.state.gender).toBe("nam");
    expect(controller.state.colorIndex).toBe(0);
    expect(controller.state.name.length).toBeGreaterThan(0);
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
