import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";

import { labelText, ROBE_MATERIAL_NAME, tintRobe } from "./avatar-look";

describe("labelText", () => {
  it("is the name alone when not counting beads", () => {
    expect(labelText("Thiện Tâm", false, 5000)).toBe("Thiện Tâm");
  });

  it("adds the bead total, Vietnamese digit grouping, while counting", () => {
    expect(labelText("An", true, 1080)).toBe("An · 1.080 hạt");
  });
});

function avatarWith(material: MeshStandardMaterial): Group {
  const group = new Group();
  group.add(new Mesh(new BoxGeometry(), material));
  return group;
}

function materialOf(group: Group, index: number): unknown {
  return (group.children.at(index) as Mesh).material;
}

describe("tintRobe", () => {
  it("recolours only this avatar's robe material", () => {
    const shared = new MeshStandardMaterial({ name: ROBE_MATERIAL_NAME, color: 0x66_77_66 });
    const skin = new MeshStandardMaterial({ name: "Warm peach skin", color: 0xc9_8a_5c });
    const a = avatarWith(shared);
    a.add(new Mesh(new BoxGeometry(), skin));
    const b = avatarWith(shared);

    tintRobe(a, "#3f6e9c");

    const robeA = materialOf(a, 0) as MeshStandardMaterial;
    expect(robeA).not.toBe(shared);
    expect(robeA.color.getHexString()).toBe(new MeshStandardMaterial({ color: "#3f6e9c" }).color.getHexString());
    expect(shared.color.getHex()).toBe(0x66_77_66);
    expect(materialOf(b, 0)).toBe(shared);
    expect(materialOf(a, 1)).toBe(skin);
  });

  it("can be applied again without stacking clones", () => {
    const robe = new MeshStandardMaterial({ name: ROBE_MATERIAL_NAME });
    const a = avatarWith(robe);
    tintRobe(a, "#3f6e9c");
    const first = materialOf(a, 0);
    tintRobe(a, "#4f7d5c");
    expect(materialOf(a, 0)).toBe(first);
  });
});
