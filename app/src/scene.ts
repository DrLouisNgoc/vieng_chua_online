import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "meshoptimizer";
import { createMovementController } from "./movement";
import { createAvatarRig } from "./avatar-rig";
import { localHour, skyAt } from "./sky-cycle";
import { browserStorage } from "./browser-storage";
import { tintRobe } from "./avatar-look";
import { ROBE_COLORS } from "./onboarding";
import { createRemoteVisitors } from "./remote-visitors";
import type { OutgoingState, VisitorView } from "./visitor-protocol";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { resolveMoveInSteps } from "./collision";
import { createKeyState } from "./key-state";
import { loadCocTemplate } from "./coc-model";
import { loadHallRoof } from "./hall-roof-model";
import { loadLanternGeometries } from "./lantern-model";
import { loadMonkOrFallback, NAM_TONG_MONK_URL } from "./monk-model";
import { loadPagoda } from "./pagoda-model";
import { placeStatueCopy } from "./statue-copy";
import { loadBellTower, loadGate, loadHallBody, loadPerimeterWall } from "./temple-structure-model";
import { loadTerrain } from "./terrain-model";
import { buildTempleGrounds } from "./temple-grounds";
import type { TempleGrounds } from "./temple-grounds";
import { simplifyGeometry } from "./simplify-geometry";
import { createInteractionRuntime, type InteractionView } from "./interaction-runtime";
import type { InteractionAction } from "./interaction-prompts";
import {
  DEFAULT_RIG,
  applyDrag,
  applyZoom,
  desiredCameraPosition,
  moveDirection,
  turnTowards,
} from "./third-person-camera";
import {
  AVATAR_START,
  PAGODA_HALL_BUDDHA,
  BANYAN,
  BROADLEAF_TREES,
  COLLIDERS,
  HALL,
  PINE_POSITIONS,
  STATUES,
  WALK_AREA,
  groundHeightAt,
} from "./temple-layout";

const ASSET_ROOT = "/sansatemple";
const MOKTAK_BASE_SCALE = 0.8;
const MOKTAK_PULSE_SCALE = 1.15;
const MOKTAK_PULSE_MS = 150;
const KEYBOARD_LOOK_AHEAD = 5;
const GROUND_TEXTURE_REPEAT = 160;
const SHADOW_HALF_EXTENT = 45;
// Shift runs at three times the walking speed (owner, 2026-11-13).
const RUN_MULTIPLIER = 3;
const RUN_KEYS = ["ShiftLeft", "ShiftRight"];
const ALTAR_TOP = HALL.platformHeight + HALL.altarHeight;
const TURN_SPEED = 10; // radians per second the avatar turns to face its walk direction
const CAMERA_LOOK_HEIGHT = 1.3;
const CAMERA_SMOOTHING = 12;
const CAMERA_WALL_GAP = 0.4;
const STEP_SMOOTHING = 14;
const CAMERA_MIN_CLEARANCE = 1.2;
const START_HEADING = Math.PI; // facing the main hall (-z)
// Distance of the sun/moon light from the avatar (the old offset 28, 49, 21).
const SUN_DISTANCE = 60;
const SKY_CHECK_MS = 1000;

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function paintSky(texture: CanvasTexture, top: number, horizon: number): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, hex(top));
  gradient.addColorStop(1, hex(horizon));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  texture.needsUpdate = true;
}

function createSkyTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const PINE_DETAIL = 0.1;

async function simplifyMeshes(object: Object3D, ratio: number): Promise<void> {
  const meshes: Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  await Promise.all(
    // No dispose() of the original: the simplified copy shares its vertex
    // buffers, and disposing would free them on the GPU.
    meshes.map(async (mesh) => {
      mesh.geometry = await simplifyGeometry(mesh.geometry, ratio);
    }),
  );
}

function enableShadows(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

const FORWARD_KEYS = ["KeyW", "ArrowUp"];
const BACKWARD_KEYS = ["KeyS", "ArrowDown"];
const LEFT_KEYS = ["KeyA", "ArrowLeft"];
const RIGHT_KEYS = ["KeyD", "ArrowRight"];

export interface TempleSceneOptions {
  onMoktakClick: () => void;
  onInteractionView?: (view: InteractionView) => void;
  // Called every frame with the visitor's own state; the sender throttles.
  onLocalState?: (state: OutgoingState) => void;
  onFrame?: (deltaSeconds: number) => void;
  onRingBell?: () => void;
}

export interface TempleScene {
  pulseMoktak: () => void;
  perform: (action: InteractionAction) => void;
  setRobeColor: (colorIndex: number) => void;
  setVisitors: (visitors: readonly VisitorView[]) => void;
  refuseSeat: () => void;
  startChanting: () => boolean;
  stopChanting: () => void;
  isChanting: () => boolean;
  // The hall projector screen's thumbnail, from the current board content.
  setProjectorPreview: (imageUrl: string | null) => void;
  // The chánh điện quote banner's current photo.
  setPhapCuImage: (imageUrl: string | null) => void;
  // A short line of text on the plaque, used until a real photo is set.
  setPhapCuText: (text: string | null) => void;
  // A registrable cốc's own sign, renamed once an admin approves its
  // occupant; null restores the board's seed title.
  setCocOccupant: (cocId: string, occupantName: string | null) => void;
  dispose: () => void;
}

export async function createTempleScene(container: HTMLElement, options: TempleSceneOptions): Promise<TempleScene> {
  const scene = new Scene();
  const skyTexture = createSkyTexture();
  scene.background = skyTexture;
  // far enough that the hall still shows from the gate, 210 units away
  const fog = new Fog(0xc8e2fa, 140, 620);
  scene.fog = fog;

  const camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 800);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  container.appendChild(renderer.domElement);

  const hemi = new HemisphereLight(0xdfeaf5, 0x6b5a3e, 0.9);
  scene.add(hemi);
  const sun = new DirectionalLight(0xfff2d6, 3);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -SHADOW_HALF_EXTENT;
  sun.shadow.camera.right = SHADOW_HALF_EXTENT;
  sun.shadow.camera.top = SHADOW_HALF_EXTENT;
  sun.shadow.camera.bottom = -SHADOW_HALF_EXTENT;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  const textureLoader = new TextureLoader();
  const groundColor = await textureLoader.loadAsync(`${ASSET_ROOT}/materials/ground/color.jpg`);
  groundColor.colorSpace = SRGBColorSpace;
  groundColor.wrapS = RepeatWrapping;
  groundColor.wrapT = RepeatWrapping;
  // The ground is just the walkable land; the mountains and the river start at its edge.
  const groundWidth = WALK_AREA.maxX - WALK_AREA.minX;
  const groundDepth = WALK_AREA.maxZ - WALK_AREA.minZ;
  groundColor.repeat.set((GROUND_TEXTURE_REPEAT * groundWidth) / 800, (GROUND_TEXTURE_REPEAT * groundDepth) / 800);
  groundColor.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = new Mesh(
    new PlaneGeometry(groundWidth, groundDepth),
    // tinted green: no bare earth left (owner, 2026-11-13)
    new MeshStandardMaterial({ map: groundColor, roughness: 0.95, color: 0xa6_d6_7e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((WALK_AREA.minX + WALK_AREA.maxX) / 2, 0, (WALK_AREA.minZ + WALK_AREA.maxZ) / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  async function addModel(path: string, position: Vector3, targetHeight: number, rotationY = 0): Promise<Object3D> {
    const gltf = await gltfLoader.loadAsync(path.startsWith("/") ? path : `${ASSET_ROOT}/models/${path}`);
    const model = gltf.scene;
    const originalSize = new Box3().setFromObject(model).getSize(new Vector3());
    const scale = originalSize.y > 0 ? targetHeight / originalSize.y : 1;
    model.scale.setScalar(scale);
    model.rotation.y = rotationY;

    const scaledBox = new Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new Vector3());
    model.position.set(position.x - scaledCenter.x, position.y - scaledBox.min.y, position.z - scaledCenter.z);
    enableShadows(model);
    scene.add(model);
    return model;
  }

  function addStatue(
    path: string,
    statue: { x: number; z: number; height: number; pedestal: number },
    rotationY = 0,
  ): Promise<Object3D> {
    return addModel(path, new Vector3(statue.x, ALTAR_TOP + statue.pedestal, statue.z), statue.height, rotationY);
  }

  const [firstPine, ...otherPines] = PINE_POSITIONS;
  if (!firstPine) throw new Error("PINE_POSITIONS is empty");
  // buddha.glb (owner, 2026-11-12: replaced with a simplified Tripo export)
  // faces +x by default, not -z toward the congregation like the rest of
  // this scene's models — rotate it to match.
  async function buildGroundsWithLanterns(): Promise<TempleGrounds> {
    const [lanterns, cocTemplate, hallRoof, hallBody, perimeterWall, gateModel, bellTowerModel] = await Promise.all([
      loadLanternGeometries(gltfLoader),
      loadCocTemplate(gltfLoader),
      loadHallRoof(gltfLoader),
      loadHallBody(gltfLoader),
      loadPerimeterWall(gltfLoader),
      loadGate(gltfLoader),
      loadBellTower(gltfLoader),
    ]);
    return buildTempleGrounds(textureLoader, renderer.capabilities.getMaxAnisotropy(), {
      lanternGeometries: lanterns,
      cocTemplate,
      hallRoof,
      hallBody,
      perimeterWall,
      gateModel,
      bellTowerModel,
    });
  }
  const avatarStart = new Vector3(AVATAR_START.x, 0, AVATAR_START.z);
  const [buddha, avatar, bodhi, grounds, pagoda, terrain] = await Promise.all([
    addStatue("buddha.glb", STATUES.buddha, -Math.PI / 2),
    loadMonkOrFallback(
      async () => addModel(NAM_TONG_MONK_URL, avatarStart, 1.7),
      async () => addModel("monk.glb", avatarStart, 1.7),
    ),
    addModel("bodhi.glb", new Vector3(firstPine.x, 0, firstPine.z), 5),
    buildGroundsWithLanterns(),
    loadPagoda(gltfLoader),
    loadTerrain(gltfLoader),
  ]);
  if (terrain) scene.add(terrain);
  scene.add(grounds.group);
  if (pagoda) {
    scene.add(pagoda);
    // The same statue again, on the altar of the pagoda complex's hall.
    scene.add(placeStatueCopy(buddha, PAGODA_HALL_BUDDHA));
  }
  // Other visitors are cloned from this unposed copy (posing changes bones).
  const visitorTemplate = cloneSkinned(avatar);
  // Owner, 2026-11-12: "thay toàn bộ cây trong chùa = cây bồ đề" — one
  // bodhi tree model stands in for the old pines (outside the wall), the
  // courtyard's round-canopy trees, and the big banyan by the pond. The
  // courtyard/banyan spots keep this clone at full detail (visitors walk
  // right up to them); the many boundary spots (far outside the wall, only
  // ever seen at a distance) get a further-simplified clone instead.
  const distantBodhi = bodhi.clone();
  await simplifyMeshes(distantBodhi, PINE_DETAIL);
  for (const spot of otherPines) {
    const tree = distantBodhi.clone();
    tree.position.x += spot.x - firstPine.x;
    tree.position.z += spot.z - firstPine.z;
    tree.rotation.y = (spot.x * 7 + spot.z * 13) % (Math.PI * 2);
    scene.add(tree);
  }
  for (const spot of [...BROADLEAF_TREES, BANYAN]) {
    const tree = bodhi.clone();
    tree.position.x += spot.x - firstPine.x;
    tree.position.z += spot.z - firstPine.z;
    tree.rotation.y = (spot.x * 7 + spot.z * 13) % (Math.PI * 2);
    scene.add(tree);
  }

  const avatarGroundY = avatar.position.y;
  const movement = createMovementController({
    start: AVATAR_START,
    constrain: (from, to) => resolveMoveInSteps(from, to, COLLIDERS),
  });
  const avatarRig = createAvatarRig(avatar);
  const remoteVisitors = createRemoteVisitors({
    scene,
    template: visitorTemplate,
    groundY: avatarGroundY,
    robeColors: ROBE_COLORS,
  });
  let walkClockSeconds = 0;

  const moktakTexture = await textureLoader.loadAsync(`${ASSET_ROOT}/images/moktak.webp`);
  const moktakSprite = new Sprite(new SpriteMaterial({ map: moktakTexture, transparent: true }));
  moktakSprite.scale.set(MOKTAK_BASE_SCALE, MOKTAK_BASE_SCALE, 1);
  // beside the start point, clear of the hall stairs
  moktakSprite.position.set(AVATAR_START.x + 3.2, 0.95, AVATAR_START.z - 0.6);
  scene.add(moktakSprite);

  let pulseUntil = 0;
  function pulseMoktak(): void {
    pulseUntil = performance.now() + MOKTAK_PULSE_MS;
  }

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const CLICK_DRAG_THRESHOLD_PX = 6;
  let pointerDownAt: { x: number; y: number } | null = null;
  let lastPointer = { x: 0, y: 0 };
  let dragging = false;
  let rig = DEFAULT_RIG;

  function handlePointerDown(event: PointerEvent): void {
    pointerDownAt = { x: event.clientX, y: event.clientY };
    lastPointer = { x: event.clientX, y: event.clientY };
    dragging = false;
    renderer.domElement.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (pointerDownAt === null) return;
    if (
      !dragging &&
      Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y) > CLICK_DRAG_THRESHOLD_PX
    ) {
      dragging = true;
    }
    if (dragging) {
      rig = applyDrag(rig, event.clientX - lastPointer.x, event.clientY - lastPointer.y);
    }
    lastPointer = { x: event.clientX, y: event.clientY };
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault();
    rig = applyZoom(rig, event.deltaY);
  }

  function handlePointerUp(event: PointerEvent): void {
    const wasDrag = dragging;
    pointerDownAt = null;
    dragging = false;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (wasDrag) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const moktakHits = raycaster.intersectObject(moktakSprite);
    if (moktakHits.length > 0) {
      options.onMoktakClick();
    }
  }
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);
  renderer.domElement.addEventListener("pointerup", handlePointerUp);
  renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });

  const keys = createKeyState();
  let keyboardDriving = false;
  function isTypingInField(event: KeyboardEvent): boolean {
    const target = event.target;
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  }
  function handleKeyDown(event: KeyboardEvent): void {
    if (isTypingInField(event)) return;
    if (!event.repeat && interactions.handleKey(event.code)) return;
    keys.down(event.code);
  }
  function handleKeyUp(event: KeyboardEvent): void {
    keys.up(event.code);
  }
  function releaseAllKeys(): void {
    keys.clear();
  }
  function handleVisibilityChange(): void {
    if (document.hidden) keys.clear();
  }
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", releaseAllKeys);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Camera-relative WASD: the camera keeps whatever angle the player dragged
  // it to; the avatar turns to face the direction it walks.
  let heading = START_HEADING;
  const interactions = createInteractionRuntime({
    scene,
    avatar,
    movement,
    rig: avatarRig,
    occupiedSeats: () => remoteVisitors.occupiedSeats(),
    setHeading: (next) => {
      heading = next;
    },
    storage: browserStorage(),
    onView: options.onInteractionView,
    onRingBell: options.onRingBell,
  });
  const cameraYaw = (): number => START_HEADING + rig.yawOffset;
  function applyKeyboardMovement(deltaSeconds: number): void {
    const forward = (keys.isAnyHeld(FORWARD_KEYS) ? 1 : 0) - (keys.isAnyHeld(BACKWARD_KEYS) ? 1 : 0);
    const right = (keys.isAnyHeld(RIGHT_KEYS) ? 1 : 0) - (keys.isAnyHeld(LEFT_KEYS) ? 1 : 0);
    const direction = moveDirection(cameraYaw(), forward, right);

    if (direction) {
      interactions.startMoving();
      heading = turnTowards(heading, Math.atan2(direction.x, direction.z), TURN_SPEED * deltaSeconds);
      movement.moveTo({
        x: movement.position.x + direction.x * KEYBOARD_LOOK_AHEAD,
        z: movement.position.z + direction.z * KEYBOARD_LOOK_AHEAD,
      });
      keyboardDriving = true;
    } else if (keyboardDriving) {
      movement.stop();
      interactions.stopMoving();
      keyboardDriving = false;
    }
  }

  const cameraTarget = new Vector3();
  const cameraRay = new Raycaster();
  const toCamera = new Vector3();
  // Pull the camera in front of any building between it and the avatar, so
  // it never ends up inside a roof or wall.
  function unblockedCameraPosition(desired: { x: number; y: number; z: number }) {
    toCamera.set(desired.x - cameraTarget.x, desired.y - cameraTarget.y, desired.z - cameraTarget.z);
    const distance = toCamera.length();
    if (distance < 1e-6) return desired;
    toCamera.divideScalar(distance);
    cameraRay.set(cameraTarget, toCamera);
    cameraRay.far = distance;
    const hit = cameraRay.intersectObjects(grounds.cameraBlockers, true)[0];
    if (!hit) return desired;
    const safe = Math.max(CAMERA_MIN_CLEARANCE, hit.distance - CAMERA_WALL_GAP);
    return {
      x: cameraTarget.x + toCamera.x * safe,
      y: cameraTarget.y + toCamera.y * safe,
      z: cameraTarget.z + toCamera.z * safe,
    };
  }
  function updateCamera(deltaSeconds: number, snap = false): void {
    cameraTarget.set(avatar.position.x, avatar.position.y + CAMERA_LOOK_HEIGHT, avatar.position.z);
    const desired = unblockedCameraPosition(desiredCameraPosition(cameraTarget, START_HEADING, rig));
    const blend = snap ? 1 : 1 - Math.exp(-CAMERA_SMOOTHING * deltaSeconds);
    camera.position.x += (desired.x - camera.position.x) * blend;
    camera.position.y += (desired.y - camera.position.y) * blend;
    camera.position.z += (desired.z - camera.position.z) * blend;
    camera.lookAt(cameraTarget);
  }

  avatar.rotation.y = heading + Math.PI;
  updateCamera(0, true);

  // Real local time (owner decision F1); "?gio=21" previews another hour.
  const forcedHour = Number.parseFloat(new URLSearchParams(location.search).get("gio") ?? "");
  const skyDirection = { x: 0, y: 1, z: 0 };
  let lastSkyMinute = -1;
  let lastSkyCheckMs = -Infinity;
  function applySky(nowMs: number): void {
    if (nowMs - lastSkyCheckMs < SKY_CHECK_MS) return;
    lastSkyCheckMs = nowMs;
    const hour = Number.isFinite(forcedHour) ? forcedHour : localHour(new Date());
    const minute = Math.floor(hour * 60);
    if (minute === lastSkyMinute) return;
    lastSkyMinute = minute;
    const sky = skyAt(hour);
    Object.assign(skyDirection, sky.sunDirection);
    sun.color.setHex(sky.sunColor);
    sun.intensity = sky.sunIntensity;
    hemi.color.setHex(sky.hemiSky);
    hemi.groundColor.setHex(sky.hemiGround);
    hemi.intensity = sky.hemiIntensity;
    fog.color.setHex(sky.fog);
    renderer.toneMappingExposure = sky.exposure;
    paintSky(skyTexture, sky.skyTop, sky.skyHorizon);
    grounds.setNight(sky.night);
  }

  let frameHandle = 0;
  let lastFrameMs = performance.now();
  function renderLoop(): void {
    frameHandle = requestAnimationFrame(renderLoop);
    const nowMs = performance.now();
    const deltaSeconds = Math.min((nowMs - lastFrameMs) / 1000, 0.1);
    lastFrameMs = nowMs;

    applyKeyboardMovement(deltaSeconds);
    const pace = keys.isAnyHeld(RUN_KEYS) ? RUN_MULTIPLIER : 1;
    const pos = movement.update(deltaSeconds * pace);
    avatar.position.x = pos.x;
    avatar.position.z = pos.z;
    if (movement.isWalking) {
      walkClockSeconds += deltaSeconds * pace;
    } else {
      walkClockSeconds = 0;
    }
    const pose = interactions.update(deltaSeconds, walkClockSeconds);
    // ease toward the floor height so stairs read as climbing, not teleporting
    const floorY = avatarGroundY + groundHeightAt(pos) - pose.hipsDrop;
    avatar.position.y += (floorY - avatar.position.y) * Math.min(1, deltaSeconds * STEP_SMOOTHING);
    // +PI: monk.glb's own modeled "front" faces the opposite of the
    // +Z-facing heading convention.
    avatar.rotation.y = heading + Math.PI;
    avatarRig.applyPose(pose);
    interactions.placeProps(walkClockSeconds);
    const snapshot = interactions.snapshot;
    options.onLocalState?.({
      x: pos.x,
      z: pos.z,
      heading,
      activity: snapshot.activity,
      seatIndex: snapshot.seatIndex,
      holdingBroom: snapshot.holdingBroom,
      beadsVisible: snapshot.beadsVisible,
      beadTotal: interactions.beadTotal,
    });
    applySky(nowMs);
    sun.target.position.set(pos.x, 0, pos.z);
    // far enough up-sun that the tall hall roof sits inside the shadow frustum
    sun.position.set(
      pos.x + skyDirection.x * SUN_DISTANCE,
      skyDirection.y * SUN_DISTANCE,
      pos.z + skyDirection.z * SUN_DISTANCE,
    );
    grounds.update(deltaSeconds);
    updateCamera(deltaSeconds);
    remoteVisitors.update(deltaSeconds, camera.position);
    options.onFrame?.(deltaSeconds);
    const pulsing = nowMs < pulseUntil;
    const scale = pulsing ? MOKTAK_PULSE_SCALE : 1;
    moktakSprite.scale.set(MOKTAK_BASE_SCALE * scale, MOKTAK_BASE_SCALE * scale, 1);
    renderer.render(scene, camera);
  }
  renderLoop();

  function handleResize(): void {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", handleResize);

  function dispose(): void {
    cancelAnimationFrame(frameHandle);
    window.removeEventListener("resize", handleResize);
    renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
    renderer.domElement.removeEventListener("pointermove", handlePointerMove);
    renderer.domElement.removeEventListener("pointerup", handlePointerUp);
    renderer.domElement.removeEventListener("wheel", handleWheel);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", releaseAllKeys);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    renderer.dispose();
    container.removeChild(renderer.domElement);
  }

  return {
    pulseMoktak,
    perform: interactions.perform,
    setRobeColor: (colorIndex) => {
      const color = ROBE_COLORS[colorIndex] ?? ROBE_COLORS[0];
      if (color) tintRobe(avatar, color.base);
    },
    setVisitors: (visitors) => remoteVisitors.sync(visitors),
    refuseSeat: () => interactions.standUp(),
    startChanting: () => interactions.startChanting(),
    stopChanting: () => interactions.stopChanting(),
    isChanting: () => interactions.snapshot.activity === "chanting",
    setProjectorPreview: (imageUrl) => grounds.setProjectorPreview(imageUrl),
    setPhapCuImage: (imageUrl) => grounds.setPhapCuImage(imageUrl),
    setPhapCuText: (text) => grounds.setPhapCuText(text),
    setCocOccupant: (cocId, occupantName) => grounds.setCocOccupant(cocId, occupantName),
    dispose,
  };
}
