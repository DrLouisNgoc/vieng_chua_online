import { describe, it, expect } from "vitest";
import { Group, Mesh, MeshStandardMaterial, BoxGeometry } from "three";
import { labelText, tintRobe, ROBE_MATERIAL_NAME } from "./avatar-look";

describe("labelText", () => {
  it("is the name alone when not counting beads", () => {
    expect(labelText("Thiện Tâm", false, 5000)).toBe("Thiện Tâm");
  });

  it("adds the bead total, Vietnamese digit grouping, while counting", () => {
    expect(labelText("An", true, 1080)).toBe("An · 1.080 hạt");
  });
});

describe("tintRobe", () => {
  function avatarWith(material: MeshStandardMaterial): Group {
    const group = new Group();
    group.add(new Mesh(new BoxGeometry(), material));
    return group;
  }

  it("recolours only this avatar's robe material", () => {
    const shared = new MeshStandardMaterial({ name: ROBE_MATERIAL_NAME, color: 0x667766 });
    const skin = new MeshStandardMaterial({ name: "Warm peach skin", color: 0xc98a5c });
    const a = avatarWith(shared);
    a.add(new Mesh(new BoxGeometry(), skin));
    const b = avatarWith(shared);

    tintRobe(a, "#3f6e9c");

    const robeA = (a.children[0] as Mesh).material as MeshStandardMaterial;
    expect(robeA).not.toBe(shared);
    expect(robeA.color.getHexString()).toBe(new MeshStandardMaterial({ color: "#3f6e9c" }).color.getHexString());
    expect(shared.color.getHex()).toBe(0x667766);
    expect(((b.children[0] as Mesh).material as MeshStandardMaterial)).toBe(shared);
    expect(((a.children[1] as Mesh).material as MeshStandardMaterial)).toBe(skin);
  });

  it("can be applied again without stacking clones", () => {
    const robe = new MeshStandardMaterial({ name: ROBE_MATERIAL_NAME });
    const a = avatarWith(robe);
    tintRobe(a, "#3f6e9c");
    const first = (a.children[0] as Mesh).material;
    tintRobe(a, "#4f7d5c");
    expect((a.children[0] as Mesh).material).toBe(first);
  });
});
