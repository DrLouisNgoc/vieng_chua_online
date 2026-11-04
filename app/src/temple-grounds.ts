import {
  BoxGeometry,
  type BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  SpotLight,
  Texture,
  TextureLoader,
  TorusGeometry,
} from "three";
import {
  BANYAN,
  HALL,
  HUT,
  MEDITATION_SEATS,
  PATH,
  POND,
  STATUES,
  STONE_PILLARS,
  groundHeightAt,
} from "./temple-layout";

// Everything here is procedural geometry built in this project, surfaced
// with sansatemple.com's own PBR material sets (decision 0003) — the
// original ships those textures but no hall/pond/tree models.

type MaterialName = "wood" | "roof" | "stone" | "rock" | "plaster" | "cloth";

interface PbrSet {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

const PALETTE = {
  lacquer: 0x9a3a2a,
  roofTint: 0x8f8f8f,
  water: 0x3d6b5e,
  lotusPad: 0x4f7d3a,
  lotusPetal: 0xf2a7c3,
  lotusHeart: 0xf2cf5b,
  bark: 0x8a6a50,
  root: 0x6b5444,
  leaves: [0x3f6b35, 0x4a7a3c, 0x365e2e],
  cushion: 0xc9822f,
  mat: 0x7a2e2a,
  gold: 0xd4a640,
  haloGlow: 0xffc65a,
  flame: 0xffb347,
  spot: 0xffd38a,
  lamp: 0xffc469,
} as const;

export async function buildTempleGrounds(
  textureLoader: TextureLoader,
  maxAnisotropy: number,
): Promise<Group> {
  const root = "/sansatemple/materials";
  const names: MaterialName[] = ["wood", "roof", "stone", "rock", "plaster", "cloth"];
  const sets = new Map<MaterialName, PbrSet>();
  await Promise.all(
    names.map(async (name) => {
      const [map, normalMap, roughnessMap] = await Promise.all([
        textureLoader.loadAsync(`${root}/${name}/color.jpg`),
        textureLoader.loadAsync(`${root}/${name}/normal.jpg`),
        textureLoader.loadAsync(`${root}/${name}/roughness.jpg`),
      ]);
      map.colorSpace = SRGBColorSpace;
      sets.set(name, { map, normalMap, roughnessMap });
    }),
  );

  function pbr(
    name: MaterialName,
    repeatX: number,
    repeatY: number,
    tint = 0xffffff,
  ): MeshStandardMaterial {
    const set = sets.get(name);
    if (!set) throw new Error(`material set ${name} failed to load`);
    const tile = (texture: Texture): Texture => {
      const copy = texture.clone();
      copy.wrapS = RepeatWrapping;
      copy.wrapT = RepeatWrapping;
      copy.repeat.set(repeatX, repeatY);
      copy.anisotropy = maxAnisotropy;
      copy.needsUpdate = true;
      return copy;
    };
    return new MeshStandardMaterial({
      map: tile(set.map),
      normalMap: tile(set.normalMap),
      roughnessMap: tile(set.roughnessMap),
      color: new Color(tint),
    });
  }

  const grounds = new Group();
  grounds.name = "temple-grounds";

  function add(
    parent: Object3D,
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
  ): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  grounds.add(buildHall());
  grounds.add(buildPath());
  for (const pillar of STONE_PILLARS) grounds.add(buildStonePillar(pillar.x, pillar.z));
  grounds.add(buildHut());
  grounds.add(buildPond());
  grounds.add(buildBanyan());
  grounds.add(buildSeats());
  return grounds;

  function hipRoof(
    halfWidth: number,
    halfDepth: number,
    height: number,
    topRatio: number,
    material: MeshStandardMaterial,
  ): Group {
    // A 4-sided frustum rotated 45° and scaled per axis gives a rectangular
    // hip roof whose corners line up with the building's corners.
    const group = new Group();
    const geometry = new CylinderGeometry(
      Math.SQRT2 * topRatio,
      Math.SQRT2,
      1,
      4,
      1,
    );
    const mesh = new Mesh(geometry, material);
    mesh.rotation.y = Math.PI / 4;
    mesh.position.y = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    group.scale.set(halfWidth, height, halfDepth);
    return group;
  }

  function buildHall(): Group {
    const hall = new Group();
    hall.name = "chinh-dien";
    const width = HALL.maxX - HALL.minX;
    const depth = HALL.maxZ - HALL.minZ;
    const centerZ = (HALL.minZ + HALL.maxZ) / 2;
    const top = HALL.platformHeight;
    const wallHeight = HALL.roofBaseY - top;
    // ~one texture tile per 2.5 units keeps detail constant at any hall size
    const tiles = (length: number): number => Math.max(1, Math.round(length / 2.5));
    const stone = pbr("stone", tiles(width), tiles(depth));
    const plaster = pbr("plaster", tiles(width), tiles(wallHeight));
    const lacquer = pbr("wood", 1, tiles(wallHeight), PALETTE.lacquer);

    add(hall, new BoxGeometry(width, top, depth), stone, 0, top / 2, centerZ);
    const step = HALL.step;
    add(
      hall,
      new BoxGeometry(step.maxX - step.minX, HALL.stepHeight, step.maxZ - step.minZ),
      pbr("stone", tiles(step.maxX - step.minX), 1),
      0,
      HALL.stepHeight / 2,
      (step.minZ + step.maxZ) / 2,
    );
    const floorMaterial = pbr("wood", tiles(width), tiles(depth));
    add(hall, new BoxGeometry(width - 0.8, 0.02, depth - 0.8), floorMaterial, 0, top + 0.01, centerZ);

    const t = HALL.wallThickness;
    add(hall, new BoxGeometry(width, wallHeight, t), plaster, 0, top + wallHeight / 2, HALL.minZ + t / 2);
    const sideDepth = HALL.sideWallFrontZ - HALL.minZ;
    const sideZ = (HALL.minZ + HALL.sideWallFrontZ) / 2;
    add(hall, new BoxGeometry(t, wallHeight, sideDepth), plaster, HALL.minX + t / 2, top + wallHeight / 2, sideZ);
    add(hall, new BoxGeometry(t, wallHeight, sideDepth), plaster, HALL.maxX - t / 2, top + wallHeight / 2, sideZ);

    const altar = HALL.altar;
    add(
      hall,
      new BoxGeometry(altar.maxX - altar.minX, HALL.altarHeight, altar.maxZ - altar.minZ),
      pbr("wood", tiles(altar.maxX - altar.minX), 1, PALETTE.lacquer),
      0,
      top + HALL.altarHeight / 2,
      (altar.minZ + altar.maxZ) / 2,
    );
    buildShrine(hall, top + HALL.altarHeight);

    const pillarGeometry = new CylinderGeometry(0.55, 0.62, wallHeight, 20);
    const baseGeometry = new CylinderGeometry(0.85, 0.85, 0.35, 16);
    const baseStone = pbr("stone", 2, 1);
    const pillarSpots = [
      ...HALL.frontPillarXs.map((x) => ({ x, z: HALL.frontPillarZ })),
      ...HALL.innerPillars,
      { x: HALL.minX + 1.4, z: HALL.minZ + 1.4 },
      { x: HALL.maxX - 1.4, z: HALL.minZ + 1.4 },
    ];
    for (const spot of pillarSpots) {
      add(hall, pillarGeometry, lacquer, spot.x, top + wallHeight / 2, spot.z);
      add(hall, baseGeometry, baseStone, spot.x, top + 0.175, spot.z);
    }
    add(hall, new BoxGeometry(width, 0.9, 0.9), lacquer, 0, HALL.roofBaseY - 0.45, HALL.frontPillarZ);
    // a ceiling under the roof so the interior reads as a room, not a box lid
    const ceiling = add(
      hall,
      new BoxGeometry(width, 0.15, depth),
      pbr("wood", tiles(width), tiles(depth), PALETTE.lacquer),
      0,
      HALL.roofBaseY + 0.075,
      centerZ,
    );
    ceiling.castShadow = false;

    // roof proportions follow the hall's size
    const lowerRoofHeight = width * 0.07;
    const drumHeight = width * 0.035;
    const upperRoofHeight = width * 0.075;
    const roofMaterial = pbr("roof", tiles(width), tiles(depth) / 2, PALETTE.roofTint);
    const lowerRoof = hipRoof(width / 2 + 3, depth / 2 + 3, lowerRoofHeight, 0.62, roofMaterial);
    lowerRoof.position.set(0, HALL.roofBaseY + 0.15, centerZ);
    hall.add(lowerRoof);
    const drumBase = HALL.roofBaseY + lowerRoofHeight - drumHeight * 0.3;
    add(hall, new BoxGeometry(width * 0.58, drumHeight, depth * 0.55), plaster, 0, drumBase + drumHeight / 2, centerZ);
    const upperRoof = hipRoof(width * 0.36, depth * 0.36, upperRoofHeight, 0.08, roofMaterial);
    upperRoof.position.set(0, drumBase + drumHeight * 0.9, centerZ);
    hall.add(upperRoof);
    return hall;
  }

  // Lotus pedestal, halo and warm golden lighting around the Shakyamuni
  // Buddha (the statue model itself is added by scene.ts).
  function buildShrine(hall: Group, altarTop: number): void {
    const buddha = STATUES.buddha;
    const gold = new MeshStandardMaterial({
      color: PALETTE.gold,
      metalness: 0.6,
      roughness: 0.35,
      emissive: PALETTE.gold,
      emissiveIntensity: 0.15,
    });
    const pedestalRadius = buddha.height * 0.3;
    add(
      hall,
      new CylinderGeometry(pedestalRadius, pedestalRadius * 0.88, buddha.pedestal, 40),
      gold,
      buddha.x,
      altarTop + buddha.pedestal / 2,
      buddha.z,
    );
    const petal = new SphereGeometry(pedestalRadius * 0.22, 12, 8);
    for (let i = 0; i < 20; i += 1) {
      const angle = (i / 20) * Math.PI * 2;
      const mesh = add(
        hall,
        petal,
        gold,
        buddha.x + Math.cos(angle) * pedestalRadius * 0.96,
        altarTop + buddha.pedestal * 0.75,
        buddha.z + Math.sin(angle) * pedestalRadius * 0.96,
      );
      mesh.scale.set(0.6, 0.55, 1.2);
      mesh.rotation.y = -angle;
    }

    const haloRadius = buddha.height * 0.4;
    const haloY = altarTop + buddha.pedestal + buddha.height * 0.66;
    const haloZ = HALL.minZ + HALL.wallThickness + 0.05; // just in front of the back wall
    const glow = new MeshStandardMaterial({
      color: PALETTE.gold,
      emissive: PALETTE.haloGlow,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide,
    });
    const disc = add(hall, new CircleGeometry(haloRadius * 0.96, 64), glow, buddha.x, haloY, haloZ);
    disc.castShadow = false;
    add(hall, new TorusGeometry(haloRadius, 0.08, 8, 72), gold, buddha.x, haloY, haloZ);

    const flame = new MeshStandardMaterial({
      color: PALETTE.flame,
      emissive: PALETTE.flame,
      emissiveIntensity: 2,
    });
    for (const x of [-6, 6]) {
      add(hall, new CylinderGeometry(0.06, 0.08, 0.35, 10), gold, x, altarTop + 0.175, HALL.altar.maxZ - 0.3);
      const candle = add(hall, new SphereGeometry(0.06, 10, 8), flame, x, altarTop + 0.42, HALL.altar.maxZ - 0.3);
      candle.scale.y = 1.6;
      candle.castShadow = false;
    }

    const statueCenterY = altarTop + buddha.pedestal + buddha.height * 0.5;
    // Light intensities scale with the square of distance (decay 2), so they
    // are derived from the statue's size rather than hand-tuned per hall.
    const reach = buddha.height * 1.8;
    const spot = new SpotLight(PALETTE.spot, 8 * reach * reach, reach * 2.5, 0.38, 0.7, 2);
    spot.position.set(buddha.x, HALL.roofBaseY - 0.6, buddha.z + reach);
    spot.target.position.set(buddha.x, statueCenterY, buddha.z);
    hall.add(spot, spot.target);

    const fill = new PointLight(PALETTE.lamp, 2 * reach * reach, reach * 1.6, 2);
    fill.position.set(buddha.x, HALL.roofBaseY - 1.5, buddha.z + buddha.height * 0.5);
    hall.add(fill);
    for (const side of [STATUES.avalokitesvara, STATUES.mahastamaprapta]) {
      const r = side.height * 1.5;
      const lamp = new PointLight(PALETTE.lamp, 2.5 * r * r, r * 1.6, 2);
      lamp.position.set(side.x, altarTop + side.height * 0.8, side.z + side.height * 0.6);
      hall.add(lamp);
    }
  }

  function buildPath(): Group {
    const path = new Group();
    path.name = "loi-di";
    const slab = new BoxGeometry(PATH.width, 0.06, 0.9);
    const stone = pbr("stone", 1, 0.6);
    let index = 0;
    for (let z = PATH.fromZ; z > PATH.toZ; z -= 1.05) {
      const mesh = add(path, slab, stone, 0, 0.03, z);
      mesh.rotation.y = ((index * 37) % 7 - 3) * 0.015;
      index += 1;
    }
    return path;
  }

  function buildStonePillar(x: number, z: number): Group {
    const pillar = new Group();
    pillar.name = "cot-da";
    const stone = pbr("stone", 1, 2);
    add(pillar, new BoxGeometry(0.75, 0.3, 0.75), stone, 0, 0.15, 0);
    add(pillar, new CylinderGeometry(0.22, 0.25, 2.4, 8), stone, 0, 1.5, 0);
    add(pillar, new BoxGeometry(0.62, 0.22, 0.62), stone, 0, 2.81, 0);
    const bud = add(pillar, new SphereGeometry(0.2, 12, 8), stone, 0, 3.05, 0);
    bud.scale.set(1, 1.4, 1);
    pillar.position.set(x, 0, z);
    return pillar;
  }

  function buildHut(): Group {
    const hut = new Group();
    hut.name = "coc-thien";
    const half = HUT.size / 2;
    const wallHeight = 2.2;
    const t = 0.25;
    const plaster = pbr("plaster", 2, 1.5);
    add(hut, new BoxGeometry(HUT.size + 0.4, 0.15, HUT.size + 0.4), pbr("stone", 2, 2), 0, 0.075, 0);
    const wallY = 0.15 + wallHeight / 2;
    add(hut, new BoxGeometry(HUT.size, wallHeight, t), plaster, 0, wallY, -half + t / 2);
    add(hut, new BoxGeometry(HUT.size, wallHeight, t), plaster, 0, wallY, half - t / 2);
    add(hut, new BoxGeometry(t, wallHeight, HUT.size), plaster, -half + t / 2, wallY, 0);
    // east wall (facing the path) with a doorway in the middle
    const doorWidth = 1.0;
    const segment = (HUT.size - doorWidth) / 2;
    add(hut, new BoxGeometry(t, wallHeight, segment), plaster, half - t / 2, wallY, -(doorWidth + segment) / 2);
    add(hut, new BoxGeometry(t, wallHeight, segment), plaster, half - t / 2, wallY, (doorWidth + segment) / 2);
    add(hut, new BoxGeometry(t, 0.5, doorWidth), plaster, half - t / 2, 0.15 + wallHeight - 0.25, 0);
    const roof = hipRoof(half + 0.7, half + 0.7, 1.5, 0.05, pbr("roof", 3, 2, PALETTE.roofTint));
    roof.position.y = 0.15 + wallHeight;
    hut.add(roof);
    hut.position.set(HUT.x, 0, HUT.z);
    return hut;
  }

  function buildPond(): Group {
    const pond = new Group();
    pond.name = "ao-sen";
    const rim = add(pond, new TorusGeometry(POND.radius, 0.35, 8, 48), pbr("rock", 12, 1), 0, 0.08, 0);
    rim.rotation.x = -Math.PI / 2;
    rim.scale.z = 0.5;
    const water = add(
      pond,
      new CircleGeometry(POND.radius - 0.05, 48),
      new MeshStandardMaterial({
        color: PALETTE.water,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      }),
      0,
      0.06,
      0,
    );
    water.rotation.x = -Math.PI / 2;
    water.castShadow = false;

    const padMaterial = new MeshStandardMaterial({ color: PALETTE.lotusPad, roughness: 0.7, side: DoubleSide });
    const petalMaterial = new MeshStandardMaterial({ color: PALETTE.lotusPetal, roughness: 0.6 });
    const heartMaterial = new MeshStandardMaterial({ color: PALETTE.lotusHeart, roughness: 0.6 });
    const pads = [
      [0.8, 0.4, 0.5], [-1.2, 0.9, 0.45], [1.6, -1.1, 0.4], [-0.6, -1.5, 0.55],
      [-1.9, -0.4, 0.38], [0.2, 1.8, 0.42], [1.9, 0.9, 0.35], [-0.2, -0.2, 0.4],
    ] as const;
    pads.forEach(([x, z, r], index) => {
      const pad = add(pond, new CircleGeometry(r, 20, 0.25, Math.PI * 2 - 0.5), padMaterial, x, 0.08, z);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = index * 1.3;
      if (index % 2 === 0) pond.add(buildLotus(x + 0.1, z - 0.1, petalMaterial, heartMaterial));
    });
    pond.position.set(POND.x, 0, POND.z);
    return pond;
  }

  function buildLotus(
    x: number,
    z: number,
    petalMaterial: MeshStandardMaterial,
    heartMaterial: MeshStandardMaterial,
  ): Group {
    const lotus = new Group();
    const petal = new SphereGeometry(0.12, 10, 8);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const mesh = add(lotus, petal, petalMaterial, Math.cos(angle) * 0.1, 0.14, Math.sin(angle) * 0.1);
      mesh.scale.set(0.55, 1.4, 0.3);
      mesh.rotation.y = -angle + Math.PI / 2;
      mesh.rotation.z = 0.5;
    }
    add(lotus, new SphereGeometry(0.07, 10, 8), heartMaterial, 0, 0.14, 0);
    lotus.position.set(x, 0.1, z);
    return lotus;
  }

  function buildBanyan(): Group {
    const tree = new Group();
    tree.name = "cay-da";
    const bark = pbr("rock", 1, 3, PALETTE.bark);
    add(tree, new CylinderGeometry(0.6, 1.0, 3.4, 12), bark, 0, 1.7, 0);
    add(tree, new CylinderGeometry(1.0, 1.4, 0.4, 12), bark, 0, 0.2, 0);

    const branchGeometry = new CylinderGeometry(0.18, 0.32, 3.0, 8);
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const branch = add(tree, branchGeometry, bark, Math.cos(angle) * 1.0, 3.9, Math.sin(angle) * 1.0);
      branch.rotation.z = Math.cos(angle) * -0.9;
      branch.rotation.x = Math.sin(angle) * 0.9;
    }

    const leafMaterials = PALETTE.leaves.map(
      (color) => new MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
    );
    const clumps = [
      [0, 6.2, 0, 2.6], [2.4, 5.4, 0.6, 2.1], [-2.3, 5.5, -0.4, 2.2], [0.5, 5.3, 2.4, 2.0],
      [-0.6, 5.4, -2.4, 2.1], [2.0, 5.0, -2.0, 1.8], [-2.0, 5.0, 2.0, 1.8], [3.6, 4.6, -0.6, 1.5],
      [-3.6, 4.7, 0.8, 1.5], [1.2, 6.8, -1.0, 1.7], [-1.3, 6.7, 1.1, 1.7], [0.2, 4.6, 3.6, 1.4],
      [-0.3, 4.6, -3.6, 1.4],
    ] as const;
    clumps.forEach(([x, y, z, r], index) => {
      const material = leafMaterials[index % leafMaterials.length];
      if (material) add(tree, new IcosahedronGeometry(r, 1), material, x, y, z);
    });

    const rootMaterial = new MeshStandardMaterial({ color: PALETTE.root, roughness: 0.9 });
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const radius = 1.7 + (i % 3) * 0.7;
      const length = 3.2 + (i % 2) * 0.6;
      add(
        tree,
        new CylinderGeometry(0.035, 0.06, length, 5),
        rootMaterial,
        Math.cos(angle) * radius,
        length / 2,
        Math.sin(angle) * radius,
      );
    }
    tree.position.set(BANYAN.x, 0, BANYAN.z);
    return tree;
  }

  // Hundreds of cushions: one InstancedMesh per part keeps this to two draw
  // calls instead of two per seat.
  function buildSeats(): Group {
    const seats = new Group();
    seats.name = "cho-ngoi-thien";
    const mats = new InstancedMesh(
      new BoxGeometry(1.0, 0.03, 1.0),
      pbr("cloth", 1, 1, PALETTE.mat),
      MEDITATION_SEATS.length,
    );
    const cushions = new InstancedMesh(
      new CylinderGeometry(0.4, 0.44, 0.16, 24),
      pbr("cloth", 1, 1, PALETTE.cushion),
      MEDITATION_SEATS.length,
    );
    const placement = new Matrix4();
    MEDITATION_SEATS.forEach((seat, index) => {
      const floor = groundHeightAt(seat);
      placement.makeTranslation(seat.x, floor + 0.015, seat.z);
      mats.setMatrixAt(index, placement);
      placement.makeTranslation(seat.x, floor + 0.11, seat.z);
      cushions.setMatrixAt(index, placement);
    });
    for (const mesh of [mats, cushions]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      seats.add(mesh);
    }
    return seats;
  }
}
