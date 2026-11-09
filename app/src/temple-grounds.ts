import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
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
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { buildCurvedHipRoof, innerEdge, type CurvedRoofOptions } from "./curved-roof";
import {
  BAMBOO_CLUMPS,
  BANYAN,
  BELL_TOWER,
  BOUNDARY,
  BROADLEAF_TREES,
  GATE,
  HALL,
  HALL_LANTERNS,
  HUT,
  LANTERN_LIGHTS,
  LANTERN_POSTS,
  LANTERN_POST_HEIGHT,
  MEDITATION_SEATS,
  PATH,
  PAVING_HEIGHT,
  POND,
  STAIRS,
  STATUES,
  STONE_PILLARS,
  URN,
  WALL_SEGMENTS,
  groundHeightAt,
} from "./temple-layout";

// Everything here is procedural geometry built in this project (decision
// 0008), surfaced with sansatemple.com's own PBR material sets — the original
// ships those textures but no hall/pond/tree models.

type MaterialName = "wood" | "roof" | "stone" | "rock" | "plaster" | "cloth";

interface PbrSet {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

export interface TempleGrounds {
  group: Group;
  // Buildings big enough that the camera must stay out of them; small props
  // (urn, pillars, trees) are deliberately not included.
  cameraBlockers: Object3D[];
  update: (deltaSeconds: number) => void;
  // 0 = day, 1 = full night: lantern glow and lantern lights.
  setNight: (level: number) => void;
}

const PALETTE = {
  lacquer: 0x9a3a2a,
  roofTint: 0x8a7f74,
  ridge: 0x6f6a64,
  wallOchre: 0xd8c39a,
  water: 0x2f5f55,
  pondBed: 0x23332b,
  lotusPad: 0x4f7d3a,
  lotusPetal: 0xf2a7c3,
  lotusHeart: 0xf2cf5b,
  bark: 0x8a6a50,
  root: 0x6b5444,
  leaves: [0x3f6b35, 0x4a7a3c, 0x365e2e],
  bambooCulm: 0x7f9b3c,
  bambooLeaf: 0x5c8a35,
  cushion: 0xc9822f,
  mat: 0x7a2e2a,
  gold: 0xd4a640,
  bronze: 0x6e5330,
  haloGlow: 0xffc65a,
  flame: 0xffb347,
  spot: 0xffd38a,
  lamp: 0xffc469,
  plaque: 0x8e1f17,
  lantern: 0xb3261e,
  lanternGlow: 0xff4a1c,
  lanternLight: 0xffb070,
  koi: [0xf07a28, 0xf2efe6, 0xd8402a, 0xf4b13a, 0xf07a28, 0xf2efe6, 0xe85a20],
} as const;

const LANTERN_GLOW = 0.9;
const LANTERN_LIGHT_INTENSITY = 10;
const LANTERN_LIGHT_REACH = 10;
const POND_CURB_HEIGHT = 0.45;
const POND_CURB_WIDTH = 0.6;
const POND_WATER_Y = 0.32;

// ~one texture tile per 2.5 units keeps detail constant at any size
function tiles(length: number): number {
  return Math.max(1, Math.round(length / 2.5));
}

export async function buildTempleGrounds(
  textureLoader: TextureLoader,
  maxAnisotropy: number,
): Promise<TempleGrounds> {
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

  // Curved roofs carry UVs in world units, so one material serves every roof.
  const roofTiles = pbr("roof", 0.45, 0.45, PALETTE.roofTint);
  roofTiles.side = DoubleSide;
  const ridgeMaterial = pbr("stone", 1, 1, PALETTE.ridge);
  const gold = new MeshStandardMaterial({
    color: PALETTE.gold,
    metalness: 0.6,
    roughness: 0.35,
    emissive: PALETTE.gold,
    emissiveIntensity: 0.15,
  });
  const bronze = new MeshStandardMaterial({
    color: PALETTE.bronze,
    metalness: 0.85,
    roughness: 0.35,
    side: DoubleSide,
  });
  const flame = new MeshStandardMaterial({
    color: PALETTE.flame,
    emissive: PALETTE.flame,
    emissiveIntensity: 2,
  });

  const updaters: ((deltaSeconds: number) => void)[] = [];
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

  // Repeated small props (pillars, petals, tree parts) as one InstancedMesh
  // instead of one Mesh per copy, to keep draw calls down (status.md).
  function instancedCopies<T>(
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    items: readonly T[],
    place: (dummy: Object3D, item: T, index: number) => void,
  ): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, items.length);
    const dummy = new Object3D();
    items.forEach((item, index) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      place(dummy, item, index);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  const pillarParts = {
    stone: pbr("stone", 1, 2),
    base: new BoxGeometry(0.75, 0.3, 0.75),
    shaft: new CylinderGeometry(0.22, 0.25, 2.4, 8),
    cap: new BoxGeometry(0.62, 0.22, 0.62),
    bud: new SphereGeometry(0.2, 12, 8),
  };
  const buildings = [buildHall(), buildGate(), buildWall(), buildBellTower(), buildHut()];
  grounds.add(...buildings);
  grounds.add(buildPaving());
  grounds.add(buildPath());
  grounds.add(buildStonePillars());
  grounds.add(buildUrn());
  grounds.add(buildPond());
  grounds.add(buildBanyan());
  grounds.add(buildBroadleafTrees());
  grounds.add(buildBamboo());
  grounds.add(buildSeats());
  const lanterns = buildLanterns();
  grounds.add(lanterns.group);

  return {
    group: grounds,
    cameraBlockers: buildings,
    update: (deltaSeconds) => {
      for (const update of updaters) update(deltaSeconds);
    },
    setNight: lanterns.setNight,
  };

  // ---- roof helpers -------------------------------------------------------

  function curvedRoof(options: CurvedRoofOptions): Mesh {
    const data = buildCurvedHipRoof(options);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(data.uvs, 2));
    geometry.setIndex(data.indices);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, roofTiles);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // An upturned scroll ("đầu đao" / ridge-end curl), pointing along (dx, dz).
  function curl(parent: Object3D, x: number, y: number, z: number, dx: number, dz: number, size: number): void {
    const length = Math.hypot(dx, dz) || 1;
    const ux = dx / length;
    const uz = dz / length;
    const point = (out: number, up: number): Vector3 =>
      new Vector3(x + ux * out * size, y + up * size, z + uz * out * size);
    const curve = new CatmullRomCurve3([
      point(-0.6, 0),
      point(0, 0.15),
      point(0.5, 0.7),
      point(0.55, 1.3),
      point(0.25, 1.55),
      point(0.05, 1.35),
    ]);
    add(parent, new TubeGeometry(curve, 24, 0.13 * size, 8, false), ridgeMaterial, 0, 0, 0);
  }

  function cornerCurls(parent: Object3D, options: CurvedRoofOptions, y: number, size: number): void {
    const spread = 1.06;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        curl(
          parent,
          sx * options.halfWidth * spread,
          y + options.upturn,
          sz * options.halfDepth * spread,
          sx * options.halfWidth,
          sz * options.halfDepth,
          size,
        );
      }
    }
  }

  // Ridge beam with curled ends and, optionally, a flaming pearl at the centre.
  function ridge(parent: Object3D, options: CurvedRoofOptions, y: number, size: number, pearl: boolean): void {
    const halfLength = Math.max(0, options.halfWidth - options.halfDepth);
    if (halfLength > 0) {
      add(parent, new BoxGeometry(halfLength * 2, 0.5 * size, 0.5 * size), ridgeMaterial, 0, y + options.height, 0);
      for (const sx of [-1, 1]) curl(parent, sx * halfLength, y + options.height, 0, sx, 0, size * 1.6);
    }
    if (pearl) {
      add(parent, new SphereGeometry(0.55 * size, 16, 12), gold, 0, y + options.height + 0.8 * size, 0);
      const tip = add(parent, new ConeGeometry(0.35 * size, 1.1 * size, 12), flame, 0, y + options.height + 1.7 * size, 0);
      tip.castShadow = false;
    }
  }

  // ---- main hall ----------------------------------------------------------

  function buildHall(): Group {
    const hall = new Group();
    hall.name = "chinh-dien";
    const width = HALL.maxX - HALL.minX;
    const depth = HALL.maxZ - HALL.minZ;
    const centerZ = (HALL.minZ + HALL.maxZ) / 2;
    const top = HALL.platformHeight;
    const wallHeight = HALL.roofBaseY - top;
    const stone = pbr("stone", tiles(width), tiles(depth));
    const plaster = pbr("plaster", tiles(width), tiles(wallHeight));
    const lacquer = pbr("wood", 1, tiles(wallHeight), PALETTE.lacquer);

    add(hall, new BoxGeometry(width, top, depth), stone, 0, top / 2, centerZ);
    buildStairs(hall);
    // polished wooden floor inside the hall
    add(hall, new BoxGeometry(width - 0.8, 0.02, depth - 0.8), pbr("wood", tiles(width), tiles(depth)), 0, top + 0.01, centerZ);

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
    hall.add(
      instancedCopies(pillarGeometry, lacquer, pillarSpots, (dummy, spot) => {
        dummy.position.set(spot.x, top + wallHeight / 2, spot.z);
      }),
      instancedCopies(baseGeometry, baseStone, pillarSpots, (dummy, spot) => {
        dummy.position.set(spot.x, top + 0.175, spot.z);
      }),
    );
    add(hall, new BoxGeometry(width, 0.9, 0.9), lacquer, 0, HALL.roofBaseY - 0.45, HALL.frontPillarZ);
    const ceiling = add(
      hall,
      new BoxGeometry(width, 0.15, depth),
      pbr("wood", tiles(width), tiles(depth), PALETTE.lacquer),
      0,
      HALL.roofBaseY + 0.075,
      centerZ,
    );
    ceiling.castShadow = false;

    // Two-tier curved roof: a lower band, a plastered drum, then the top roof.
    const roofs = new Group();
    roofs.position.set(0, HALL.roofBaseY + 0.15, centerZ);
    hall.add(roofs);
    const lower: CurvedRoofOptions = {
      halfWidth: width / 2 + 3,
      halfDepth: depth / 2 + 3,
      height: (depth / 2 + 3) * 0.6,
      upturn: 2.4,
      topFraction: 0.5,
      segments: 24,
    };
    roofs.add(curvedRoof(lower));
    cornerCurls(roofs, lower, 0, 1.6);

    const edge = innerEdge(lower);
    const drumHeight = 3;
    const drumBase = edge.y - 0.4;
    add(
      roofs,
      new BoxGeometry((edge.halfWidth - 1) * 2, drumHeight, (edge.halfDepth - 1) * 2),
      pbr("plaster", tiles(edge.halfWidth * 2), 1),
      0,
      drumBase + drumHeight / 2,
      0,
    );
    const upper: CurvedRoofOptions = {
      halfWidth: edge.halfWidth + 1.5,
      halfDepth: edge.halfDepth + 1.5,
      height: (edge.halfDepth + 1.5) * 0.55,
      upturn: 1.8,
      segments: 24,
    };
    const upperY = drumBase + drumHeight;
    const upperRoof = curvedRoof(upper);
    upperRoof.position.y = upperY;
    roofs.add(upperRoof);
    cornerCurls(roofs, upper, upperY, 1.3);
    ridge(roofs, upper, upperY, 1.6, true);
    return hall;
  }

  // Nine stone steps up to the raised hall, with stepped balustrades.
  function buildStairs(hall: Group): void {
    const width = STAIRS.maxX - STAIRS.minX;
    const centerX = (STAIRS.minX + STAIRS.maxX) / 2;
    const foot = STAIRS.frontZ + STAIRS.count * STAIRS.tread;
    const stepStone = pbr("stone", tiles(width), 1);
    const railStone = pbr("stone", 1, 1);
    const bw = STAIRS.balustradeWidth;
    const newelXs = [STAIRS.minX - bw / 2, STAIRS.maxX + bw / 2];
    const steps = Array.from({ length: STAIRS.count }, (_, i) => i + 1);
    const rails = steps.flatMap((k) => newelXs.map((x) => ({ k, x })));

    // Unit-height box geometries, scaled per step/rail instance (each step
    // and rail segment is a different height) — one draw call each instead
    // of one per step (status.md: this was ~31 meshes).
    hall.add(
      instancedCopies(new BoxGeometry(width, 1, STAIRS.tread), stepStone, steps, (dummy, k) => {
        const height = k * STAIRS.rise;
        dummy.position.set(centerX, height / 2, foot - (k - 0.5) * STAIRS.tread);
        dummy.scale.set(1, height, 1);
      }),
      instancedCopies(new BoxGeometry(bw, 1, STAIRS.tread), railStone, rails, (dummy, { k, x }) => {
        const railHeight = k * STAIRS.rise + 0.8;
        dummy.position.set(x, railHeight / 2, foot - (k - 0.5) * STAIRS.tread);
        dummy.scale.set(1, railHeight, 1);
      }),
      // newel posts at the foot of the balustrades
      instancedCopies(new BoxGeometry(bw + 0.2, 1.4, bw + 0.2), railStone, newelXs, (dummy, x) => {
        dummy.position.set(x, 0.7, foot + 0.1);
      }),
      instancedCopies(new SphereGeometry(0.32, 12, 8), railStone, newelXs, (dummy, x) => {
        dummy.position.set(x, 1.6, foot + 0.1);
        dummy.scale.set(1, 1.3, 1);
      }),
    );
  }

  // Lotus pedestal, halo and warm golden lighting around the Shakyamuni
  // Buddha (the statue model itself is added by scene.ts).
  function buildShrine(hall: Group, altarTop: number): void {
    const buddha = STATUES.buddha;
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
    const petalIndices = Array.from({ length: 20 }, (_, i) => i);
    hall.add(
      instancedCopies(petal, gold, petalIndices, (dummy, i) => {
        const angle = (i / 20) * Math.PI * 2;
        dummy.position.set(
          buddha.x + Math.cos(angle) * pedestalRadius * 0.96,
          altarTop + buddha.pedestal * 0.75,
          buddha.z + Math.sin(angle) * pedestalRadius * 0.96,
        );
        dummy.rotation.y = -angle;
        dummy.scale.set(0.6, 0.55, 1.2);
      }),
    );

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

  // ---- courtyard, path, pillars, urn --------------------------------------

  // Terracotta floor tiles ("gạch tàu"), drawn procedurally.
  function brickTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const count = 8;
      const size = canvas.width / count;
      ctx.fillStyle = "#6b5a4a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          const shade = ((row * 7 + col * 13) % 9) - 4;
          ctx.fillStyle = `hsl(${16 + shade * 0.6}, ${52 + shade}%, ${40 + shade}%)`;
          ctx.fillRect(col * size + 3, row * size + 3, size - 6, size - 6);
        }
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = maxAnisotropy;
    return texture;
  }

  // The whole yard inside the wall is paved with terracotta tiles.
  function buildPaving(): Group {
    const yard = new Group();
    yard.name = "san-gach";
    const width = BOUNDARY.maxX - BOUNDARY.minX;
    const depth = BOUNDARY.maxZ - BOUNDARY.minZ;
    const texture = brickTexture();
    // 8 tiles per texture, ~0.3 units per tile
    texture.repeat.set(width / 2.4, depth / 2.4);
    const floor = add(
      yard,
      new BoxGeometry(width, PAVING_HEIGHT, depth),
      new MeshStandardMaterial({ map: texture, roughness: 0.92 }),
      (BOUNDARY.minX + BOUNDARY.maxX) / 2,
      PAVING_HEIGHT / 2,
      (BOUNDARY.minZ + BOUNDARY.maxZ) / 2,
    );
    floor.castShadow = false;
    return yard;
  }

  // The path now runs ~200 units, so its slabs are one InstancedMesh.
  function buildPath(): Group {
    const path = new Group();
    path.name = "loi-di";
    const spacing = 1.05;
    const count = Math.floor((PATH.fromZ - PATH.toZ) / spacing);
    const slabs = new InstancedMesh(
      new BoxGeometry(PATH.width, 0.06, 0.9),
      pbr("stone", 1, 0.6),
      count,
    );
    const dummy = new Object3D();
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(0, PAVING_HEIGHT + 0.02, PATH.fromZ - i * spacing);
      dummy.rotation.set(0, ((i * 37) % 7 - 3) * 0.015, 0);
      dummy.updateMatrix();
      slabs.setMatrixAt(i, dummy.matrix);
    }
    slabs.castShadow = true;
    slabs.receiveShadow = true;
    slabs.instanceMatrix.needsUpdate = true;
    path.add(slabs);
    return path;
  }

  // One InstancedMesh per part across all STONE_PILLARS spots, instead of a
  // 4-mesh Group per pillar (status.md: this was 40 meshes for 10 pillars).
  function buildStonePillars(): Group {
    const group = new Group();
    group.name = "cot-da";
    group.add(
      instancedCopies(pillarParts.base, pillarParts.stone, STONE_PILLARS, (dummy, spot) => {
        dummy.position.set(spot.x, 0.15, spot.z);
      }),
      instancedCopies(pillarParts.shaft, pillarParts.stone, STONE_PILLARS, (dummy, spot) => {
        dummy.position.set(spot.x, 1.5, spot.z);
      }),
      instancedCopies(pillarParts.cap, pillarParts.stone, STONE_PILLARS, (dummy, spot) => {
        dummy.position.set(spot.x, 2.81, spot.z);
      }),
      instancedCopies(pillarParts.bud, pillarParts.stone, STONE_PILLARS, (dummy, spot) => {
        dummy.position.set(spot.x, 3.05, spot.z);
        dummy.scale.set(1, 1.4, 1);
      }),
    );
    return group;
  }

  // Bronze incense urn (lư hương) on a stone plinth, with burning sticks.
  function buildUrn(): Group {
    const urn = new Group();
    urn.name = "lu-huong";
    const r = URN.radius;
    add(urn, new BoxGeometry(r * 1.9, 0.3, r * 1.9), pbr("stone", 1, 1), 0, 0.15, 0);
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2;
      add(urn, new CylinderGeometry(0.08, 0.12, 0.4, 8), bronze, Math.cos(angle) * r * 0.55, 0.5, Math.sin(angle) * r * 0.55);
    }
    const profile = [
      [0, 0], [0.5, 0], [0.78, 0.12], [0.9, 0.42], [0.84, 0.7], [0.96, 0.78], [0.92, 0.84], [0.74, 0.8],
    ].map(([px, py]) => new Vector2((px ?? 0) * r, (py ?? 0) * r));
    add(urn, new LatheGeometry(profile, 32), bronze, 0, 0.65, 0);
    const handleGeometry = new TorusGeometry(0.18 * r, 0.04 * r, 8, 16);
    for (const sx of [-1, 1]) {
      const handle = add(urn, handleGeometry, bronze, sx * 0.95 * r, 0.65 + 0.82 * r, 0);
      handle.rotation.y = Math.PI / 2;
    }
    const stick = new CylinderGeometry(0.012, 0.012, 0.6, 4);
    const stickMaterial = new MeshStandardMaterial({ color: 0x8a2a1c, roughness: 0.8 });
    const ember = new SphereGeometry(0.02, 6, 4);
    for (let i = 0; i < 7; i += 1) {
      const sx = ((i % 4) - 1.5) * 0.08;
      const sz = (Math.floor(i / 4) - 0.5) * 0.1;
      const y = 0.65 + 0.7 * r + 0.3;
      add(urn, stick, stickMaterial, sx, y, sz);
      const glowTip = add(urn, ember, flame, sx, y + 0.3, sz);
      glowTip.castShadow = false;
    }
    urn.position.set(URN.x, 0, URN.z);
    return urn;
  }

  // ---- gate, wall, bell tower, hut ----------------------------------------

  function plaqueTexture(text: string): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = `#${PALETTE.plaque.toString(16)}`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#d4a640";
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
      ctx.fillStyle = "#f2cf5b";
      ctx.font = "bold 92px 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }

  // Three-entrance gate (tam quan): a taller centre bay, two side bays.
  function buildGate(): Group {
    const gate = new Group();
    gate.name = "tam-quan";
    const pillarMaterial = pbr("plaster", 1, 2, PALETTE.wallOchre);
    const lacquer = pbr("wood", 2, 1, PALETTE.lacquer);
    const [outerL, innerL, innerR, outerR] = GATE.pillarXs;
    for (const x of GATE.pillarXs) {
      const height = Math.abs(x) < 3 ? GATE.centralHeight : GATE.sideHeight;
      add(gate, new BoxGeometry(0.9, height, 0.9), pillarMaterial, x, height / 2, 0);
      add(gate, new BoxGeometry(1.1, 0.3, 1.1), pbr("stone", 1, 1), x, 0.15, 0);
    }
    const centreSpan = innerR - innerL;
    add(gate, new BoxGeometry(centreSpan + 0.9, 0.55, 0.7), lacquer, 0, GATE.centralHeight - 0.5, 0);
    const sideSpan = innerL - outerL;
    for (const sx of [-1, 1]) {
      add(gate, new BoxGeometry(sideSpan + 0.9, 0.45, 0.6), lacquer, sx * (outerR + innerR) / 2, GATE.sideHeight - 0.4, 0);
    }
    const plaqueMaterial = new MeshStandardMaterial({ map: plaqueTexture("SƠN TỰ"), roughness: 0.6 });
    for (const sz of [-1, 1]) {
      const plaque = add(gate, new BoxGeometry(2.6, 0.8, 0.08), plaqueMaterial, 0, GATE.centralHeight - 1.25, sz * 0.4);
      plaque.rotation.y = sz < 0 ? Math.PI : 0;
    }

    const centreRoof: CurvedRoofOptions = { halfWidth: centreSpan / 2 + 1.5, halfDepth: 1.9, height: 1.9, upturn: 0.7, segments: 12 };
    const centre = curvedRoof(centreRoof);
    centre.position.y = GATE.centralHeight;
    gate.add(centre);
    cornerCurls(gate, centreRoof, GATE.centralHeight, 0.45);
    ridge(gate, centreRoof, GATE.centralHeight, 0.45, true);

    for (const sx of [-1, 1]) {
      const sideRoof: CurvedRoofOptions = { halfWidth: sideSpan / 2 + 0.9, halfDepth: 1.6, height: 1.5, upturn: 0.6, segments: 12 };
      const side = new Group();
      side.position.set(sx * (outerR + innerR) / 2, 0, 0);
      const roof = curvedRoof(sideRoof);
      roof.position.y = GATE.sideHeight;
      side.add(roof);
      cornerCurls(side, sideRoof, GATE.sideHeight, 0.35);
      gate.add(side);
    }
    gate.position.set(0, 0, GATE.z);
    return gate;
  }

  // Ochre perimeter wall with a tiled coping.
  function buildWall(): Group {
    const wall = new Group();
    wall.name = "tuong-bao";
    for (const [x0, z0, x1, z1] of WALL_SEGMENTS) {
      const length = Math.hypot(x1 - x0, z1 - z0);
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const body = add(
        wall,
        new BoxGeometry(length, BOUNDARY.height, BOUNDARY.thickness),
        pbr("plaster", tiles(length), 1, PALETTE.wallOchre),
        cx,
        BOUNDARY.height / 2,
        cz,
      );
      const cap = add(
        wall,
        new BoxGeometry(length + 0.4, 0.25, BOUNDARY.thickness + 0.5),
        pbr("roof", tiles(length), 1, PALETTE.roofTint),
        cx,
        BOUNDARY.height + 0.12,
        cz,
      );
      if (!alongX) {
        body.rotation.y = Math.PI / 2;
        cap.rotation.y = Math.PI / 2;
      }
    }
    return wall;
  }

  // Bell tower (gác chuông): open pavilion with a bronze bell you can walk under.
  function buildBellTower(): Group {
    const tower = new Group();
    tower.name = "gac-chuong";
    const size = BELL_TOWER.half * 2;
    const base = BELL_TOWER.platformHeight;
    const pillarHeight = 3.8;
    const lacquer = pbr("wood", 1, 2, PALETTE.lacquer);
    add(tower, new BoxGeometry(size, base, size), pbr("stone", 2, 2), 0, base / 2, 0);
    const offset = BELL_TOWER.pillarOffset;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add(tower, new CylinderGeometry(0.2, 0.24, pillarHeight, 12), lacquer, sx * offset, base + pillarHeight / 2, sz * offset);
      }
    }
    const top = base + pillarHeight;
    for (const sz of [-1, 1]) {
      add(tower, new BoxGeometry(offset * 2 + 0.4, 0.3, 0.3), lacquer, 0, top - 0.15, sz * offset);
    }
    add(tower, new BoxGeometry(offset * 2 + 0.4, 0.25, 0.25), lacquer, 0, top - 0.5, 0);

    const bellProfile = [
      [0, 1.5], [0.32, 1.5], [0.44, 1.38], [0.5, 0.6], [0.6, 0.14], [0.7, 0.02], [0.66, 0],
    ].map(([px, py]) => new Vector2(px ?? 0, py ?? 0));
    add(tower, new LatheGeometry(bellProfile, 32), bronze, 0, top - 0.6 - 1.5, 0);

    const lower: CurvedRoofOptions = { halfWidth: BELL_TOWER.half + 0.8, halfDepth: BELL_TOWER.half + 0.8, height: 3, upturn: 0.9, topFraction: 0.45, segments: 12 };
    const roofs = new Group();
    roofs.position.y = top;
    tower.add(roofs);
    roofs.add(curvedRoof(lower));
    cornerCurls(roofs, lower, 0, 0.5);
    const edge = innerEdge(lower);
    add(roofs, new BoxGeometry(edge.halfWidth * 2, 0.9, edge.halfDepth * 2), pbr("plaster", 1, 1, PALETTE.wallOchre), 0, edge.y + 0.3, 0);
    const upper: CurvedRoofOptions = { halfWidth: edge.halfWidth + 0.7, halfDepth: edge.halfDepth + 0.7, height: 1.9, upturn: 0.7, segments: 12 };
    const upperRoof = curvedRoof(upper);
    upperRoof.position.y = edge.y + 0.75;
    roofs.add(upperRoof);
    cornerCurls(roofs, upper, edge.y + 0.75, 0.4);
    tower.position.set(BELL_TOWER.x, 0, BELL_TOWER.z);
    return tower;
  }

  // Wooden meditation hut (cốc thiền).
  function buildHut(): Group {
    const hut = new Group();
    hut.name = "coc-thien";
    const half = HUT.size / 2;
    const wallHeight = 2.2;
    const t = 0.2;
    const wood = pbr("wood", 2, 1.5);
    add(hut, new BoxGeometry(HUT.size + 0.4, 0.2, HUT.size + 0.4), pbr("wood", 2, 2), 0, 0.1, 0);
    const wallY = 0.2 + wallHeight / 2;
    add(hut, new BoxGeometry(HUT.size, wallHeight, t), wood, 0, wallY, -half + t / 2);
    add(hut, new BoxGeometry(HUT.size, wallHeight, t), wood, 0, wallY, half - t / 2);
    add(hut, new BoxGeometry(t, wallHeight, HUT.size), wood, -half + t / 2, wallY, 0);
    // east wall (facing the path) with a doorway in the middle
    const doorWidth = 1.0;
    const segment = (HUT.size - doorWidth) / 2;
    add(hut, new BoxGeometry(t, wallHeight, segment), wood, half - t / 2, wallY, -(doorWidth + segment) / 2);
    add(hut, new BoxGeometry(t, wallHeight, segment), wood, half - t / 2, wallY, (doorWidth + segment) / 2);
    add(hut, new BoxGeometry(t, 0.5, doorWidth), wood, half - t / 2, 0.2 + wallHeight - 0.25, 0);
    const corner = new CylinderGeometry(0.12, 0.12, wallHeight, 8);
    const lacquer = pbr("wood", 1, 1, PALETTE.lacquer);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(hut, corner, lacquer, sx * half, wallY, sz * half);
    const roof: CurvedRoofOptions = { halfWidth: half + 0.8, halfDepth: half + 0.8, height: 1.6, upturn: 0.5, segments: 12 };
    const roofMesh = curvedRoof(roof);
    roofMesh.position.y = 0.2 + wallHeight;
    hut.add(roofMesh);
    cornerCurls(hut, roof, 0.2 + wallHeight, 0.3);
    hut.position.set(HUT.x, 0, HUT.z);
    return hut;
  }

  // ---- pond with lotus and koi --------------------------------------------

  // Rectangular lotus pond with a stone curb, beside the hall.
  function buildPond(): Group {
    const pond = new Group();
    pond.name = "ao-sen";
    const width = POND.maxX - POND.minX;
    const depth = POND.maxZ - POND.minZ;
    const curb = pbr("stone", tiles(width), 1);
    const cw = POND_CURB_WIDTH;
    for (const sz of [-1, 1]) {
      add(pond, new BoxGeometry(width, POND_CURB_HEIGHT, cw), curb, 0, POND_CURB_HEIGHT / 2, sz * (depth / 2 - cw / 2));
    }
    for (const sx of [-1, 1]) {
      add(pond, new BoxGeometry(cw, POND_CURB_HEIGHT, depth - 2 * cw), curb, sx * (width / 2 - cw / 2), POND_CURB_HEIGHT / 2, 0);
    }
    const inner = { width: width - 2 * cw, depth: depth - 2 * cw };
    const bed = add(
      pond,
      new BoxGeometry(inner.width, 0.02, inner.depth),
      new MeshStandardMaterial({ color: PALETTE.pondBed, roughness: 1 }),
      0,
      PAVING_HEIGHT + 0.01,
      0,
    );
    bed.castShadow = false;
    const water = add(
      pond,
      new BoxGeometry(inner.width, 0.02, inner.depth),
      new MeshStandardMaterial({
        color: PALETTE.water,
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.55,
      }),
      0,
      POND_WATER_Y,
      0,
    );
    water.castShadow = false;
    water.receiveShadow = false;

    const padMaterial = new MeshStandardMaterial({ color: PALETTE.lotusPad, roughness: 0.7, side: DoubleSide });
    const petalMaterial = new MeshStandardMaterial({ color: PALETTE.lotusPetal, roughness: 0.6 });
    const heartMaterial = new MeshStandardMaterial({ color: PALETTE.lotusHeart, roughness: 0.6 });
    // Pads on a jittered grid across the pond, a lotus on every third.
    const columns = Math.floor(inner.width / 2.6);
    const rows = Math.floor(inner.depth / 2.6);
    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        index += 1;
        if ((row * 7 + col * 3) % 5 === 0) continue; // leave open water for the koi
        const jitterX = (((index * 37) % 11) / 11 - 0.5) * 1.4;
        const jitterZ = (((index * 53) % 13) / 13 - 0.5) * 1.4;
        const x = -inner.width / 2 + (col + 0.5) * (inner.width / columns) + jitterX;
        const z = -inner.depth / 2 + (row + 0.5) * (inner.depth / rows) + jitterZ;
        const r = 0.35 + (index % 4) * 0.08;
        const pad = add(pond, new CircleGeometry(r, 20, 0.25, Math.PI * 2 - 0.5), padMaterial, x, POND_WATER_Y + 0.02, z);
        pad.rotation.x = -Math.PI / 2;
        pad.rotation.z = index * 1.3;
        if (index % 3 === 0) pond.add(buildLotus(x + 0.1, z - 0.1, petalMaterial, heartMaterial));
      }
    }

    pond.add(buildKoi(inner.width / 2 - 1, inner.depth / 2 - 1));
    pond.position.set((POND.minX + POND.maxX) / 2, 0, (POND.minZ + POND.maxZ) / 2);
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
    lotus.position.set(x, POND_WATER_Y + 0.02, z);
    return lotus;
  }

  // Koi swimming ellipses under the water surface; animated through `update`.
  function buildKoi(maxRadiusX: number, maxRadiusZ: number): Group {
    const school = new Group();
    const body = new SphereGeometry(0.12, 14, 10);
    const tail = new ConeGeometry(0.09, 0.2, 6);
    const fish = PALETTE.koi.map((color, index) => {
      const material = new MeshStandardMaterial({ color, roughness: 0.45 });
      const koi = new Group();
      const torso = new Mesh(body, material);
      torso.scale.set(0.65, 0.45, 1.7);
      koi.add(torso);
      const fin = new Mesh(tail, material);
      fin.rotation.x = -Math.PI / 2;
      fin.position.z = -0.27;
      koi.add(fin);
      school.add(koi);
      const scale = 0.35 + (index % 4) * 0.2;
      return {
        koi,
        fin,
        radiusX: maxRadiusX * scale,
        radiusZ: maxRadiusZ * scale,
        speed: (0.18 + (index % 3) * 0.06) * (index % 2 === 0 ? 1 : -1),
        phase: index * 0.9,
      };
    });
    let time = 0;
    updaters.push((deltaSeconds) => {
      time += deltaSeconds;
      for (const f of fish) {
        const angle = f.phase + time * f.speed;
        f.koi.position.set(Math.cos(angle) * f.radiusX, POND_WATER_Y - 0.1, Math.sin(angle) * f.radiusZ);
        // face along the direction of travel (tangent of the ellipse)
        const direction = Math.sign(f.speed);
        f.koi.rotation.y = Math.atan2(
          -Math.sin(angle) * f.radiusX * direction,
          Math.cos(angle) * f.radiusZ * direction,
        );
        f.fin.rotation.y = Math.sin(time * 9 + f.phase) * 0.45;
      }
    });
    return school;
  }

  // ---- trees ---------------------------------------------------------------

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

  // Instanced instead of one Group per tree (status.md: this was 96 meshes
  // for 16 trees — 1 trunk + 5 crown clumps each). Trunks share one
  // InstancedMesh; crowns share one InstancedMesh per leaf colour, since the
  // 3 colours cycle per tree+clump rather than belonging to one tree each.
  function buildBroadleafTrees(): Group {
    const trees = new Group();
    trees.name = "cay-xanh";
    const bark = pbr("rock", 1, 2, PALETTE.bark);
    const trunk = new CylinderGeometry(0.28, 0.42, 3.2, 8);
    const crown = new IcosahedronGeometry(1, 1);
    const leafMaterials = PALETTE.leaves.map(
      (color) => new MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
    );
    const crownOffsets = [
      [0, 4.3, 0, 2.1],
      [1.3, 3.8, 0.4, 1.5],
      [-1.2, 3.9, -0.3, 1.6],
      [0.2, 3.7, 1.3, 1.4],
      [-0.3, 3.8, -1.3, 1.4],
    ] as const;
    const treeScale = (index: number): number => 0.9 + (index % 4) * 0.15;

    trees.add(
      instancedCopies(trunk, bark, BROADLEAF_TREES, (dummy, spot, index) => {
        const scale = treeScale(index);
        dummy.position.set(spot.x, 1.6 * scale, spot.z);
        dummy.rotation.y = index * 1.7;
        dummy.scale.setScalar(scale);
      }),
    );

    const up = new Vector3(0, 1, 0);
    type Clump = { spot: { x: number; z: number }; index: number; offset: (typeof crownOffsets)[number] };
    const clumpsByMaterial: Clump[][] = leafMaterials.map(() => []);
    BROADLEAF_TREES.forEach((spot, index) => {
      crownOffsets.forEach((offset, i) => {
        clumpsByMaterial[(index + i) % leafMaterials.length]?.push({ spot, index, offset });
      });
    });
    clumpsByMaterial.forEach((clumps, materialIndex) => {
      const material = leafMaterials[materialIndex];
      if (!material || clumps.length === 0) return;
      trees.add(
        instancedCopies(crown, material, clumps, (dummy, clump) => {
          const scale = treeScale(clump.index);
          const [ox, oy, oz, r] = clump.offset;
          const local = new Vector3(ox, oy, oz)
            .multiplyScalar(scale)
            .applyAxisAngle(up, clump.index * 1.7);
          dummy.position.set(clump.spot.x + local.x, local.y, clump.spot.z + local.z);
          dummy.rotation.y = clump.index * 1.7;
          dummy.scale.setScalar(scale * r);
        }),
      );
    });

    return trees;
  }

  // Bamboo groves: one InstancedMesh for all culms and one for all leaf tufts.
  function buildBamboo(): Group {
    const grove = new Group();
    grove.name = "tre";
    const perClump = 14;
    const count = BAMBOO_CLUMPS.length * perClump;
    const culms = new InstancedMesh(
      new CylinderGeometry(0.06, 0.075, 1, 6),
      new MeshStandardMaterial({ color: PALETTE.bambooCulm, roughness: 0.6 }),
      count,
    );
    const tufts = new InstancedMesh(
      new IcosahedronGeometry(1, 0),
      new MeshStandardMaterial({ color: PALETTE.bambooLeaf, roughness: 0.85, flatShading: true }),
      count,
    );
    const dummy = new Object3D();
    const matrix = new Matrix4();
    let index = 0;
    for (const clump of BAMBOO_CLUMPS) {
      for (let i = 0; i < perClump; i += 1) {
        const angle = i * 2.39996; // golden-angle spread
        const radius = 0.25 + 0.9 * Math.sqrt(i / perClump);
        const height = 7 + ((i * 37) % 11) * 0.25;
        const lean = 0.05 + (i % 5) * 0.025;
        const x = clump.x + Math.cos(angle) * radius;
        const z = clump.z + Math.sin(angle) * radius;
        dummy.position.set(x, height / 2, z);
        dummy.rotation.set(Math.sin(angle) * lean, 0, -Math.cos(angle) * lean);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        culms.setMatrixAt(index, dummy.matrix);
        const tipX = x + Math.cos(angle) * lean * height * 0.5;
        const tipZ = z + Math.sin(angle) * lean * height * 0.5;
        matrix.compose(
          new Vector3(tipX, height - 0.6, tipZ),
          dummy.quaternion,
          new Vector3(0.9, 1.3, 0.9),
        );
        tufts.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    for (const mesh of [culms, tufts]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      grove.add(mesh);
    }
    return grove;
  }

  // Hundreds of cushions: one InstancedMesh per part keeps this to two draw
  // calls instead of two per seat.
  // Red paper lanterns (Milestone 7): on posts beside the path and hung on
  // the hall's front pillars. Instanced (a few draw calls for all of them);
  // only LANTERN_LIGHTS are real lights, the rest glow by emissive.
  function buildLanterns(): { group: Group; setNight: (level: number) => void } {
    const group = new Group();
    const paper = new MeshStandardMaterial({
      color: PALETTE.lantern,
      emissive: PALETTE.lanternGlow,
      emissiveIntensity: 0,
      roughness: 0.7,
    });
    const goldTrim = new MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.4, metalness: 0.6 });
    const wood = new MeshStandardMaterial({ color: PALETTE.bark, roughness: 0.9 });

    const lanternSpots = [
      ...LANTERN_POSTS.map((post) => ({ x: post.x, y: LANTERN_POST_HEIGHT + 0.36, z: post.z })),
      ...HALL_LANTERNS,
    ];
    const body = new SphereGeometry(0.28, 16, 12);
    body.scale(1, 1.25, 1);
    const cap = new CylinderGeometry(0.13, 0.13, 0.07, 12);
    const bodies = new InstancedMesh(body, paper, lanternSpots.length);
    const caps = new InstancedMesh(cap, goldTrim, lanternSpots.length * 2);
    const posts = new InstancedMesh(
      new CylinderGeometry(0.07, 0.09, LANTERN_POST_HEIGHT, 8),
      wood,
      LANTERN_POSTS.length,
    );
    const place = new Object3D();
    lanternSpots.forEach((spot, index) => {
      place.position.set(spot.x, spot.y, spot.z);
      place.updateMatrix();
      bodies.setMatrixAt(index, place.matrix);
      for (const [offset, slot] of [
        [0.37, index * 2],
        [-0.37, index * 2 + 1],
      ] as const) {
        place.position.set(spot.x, spot.y + offset, spot.z);
        place.updateMatrix();
        caps.setMatrixAt(slot, place.matrix);
      }
    });
    LANTERN_POSTS.forEach((post, index) => {
      place.position.set(post.x, LANTERN_POST_HEIGHT / 2, post.z);
      place.updateMatrix();
      posts.setMatrixAt(index, place.matrix);
    });
    posts.castShadow = true;
    posts.receiveShadow = true;
    group.add(bodies, caps, posts);

    const lights = LANTERN_LIGHTS.map((spot) => {
      const light = new PointLight(PALETTE.lanternLight, 0, LANTERN_LIGHT_REACH, 2);
      light.position.set(spot.x, spot.y, spot.z);
      group.add(light);
      return light;
    });

    return {
      group,
      setNight(level) {
        paper.emissiveIntensity = level * LANTERN_GLOW;
        for (const light of lights) light.intensity = level * LANTERN_LIGHT_INTENSITY;
      },
    };
  }

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
