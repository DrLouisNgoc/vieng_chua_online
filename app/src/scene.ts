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
  Quaternion,
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
import { computeWalkPose, IDLE_POSE } from "./walk-cycle";
import { resolveMove } from "./collision";
import { createKeyState } from "./key-state";
import { buildTempleGrounds } from "./temple-grounds";
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
  COLLIDERS,
  HALL,
  PINE_POSITIONS,
  STATUES,
  groundHeightAt,
} from "./temple-layout";

const ASSET_ROOT = "/sansatemple";
const MOKTAK_BASE_SCALE = 0.8;
const MOKTAK_PULSE_SCALE = 1.15;
const MOKTAK_PULSE_MS = 150;
const KEYBOARD_LOOK_AHEAD = 5;
const HORIZON_COLOR = 0xe8dcc4;
const SKY_TOP_COLOR = "#9cbcd6";
const GROUND_SIZE = 800;
const GROUND_TEXTURE_REPEAT = 160;
const SHADOW_HALF_EXTENT = 45;
const RUN_MULTIPLIER = 2.2;
const RUN_KEYS = ["ShiftLeft", "ShiftRight"];
const ALTAR_TOP = HALL.platformHeight + HALL.altarHeight;
const TURN_SPEED = 10; // radians per second the avatar turns to face its walk direction
const CAMERA_LOOK_HEIGHT = 1.3;
const CAMERA_SMOOTHING = 12;
const CAMERA_WALL_GAP = 0.4;
const STEP_SMOOTHING = 14;
const CAMERA_MIN_CLEARANCE = 1.2;
const START_HEADING = Math.PI; // facing the main hall (-z)

function createSkyTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, SKY_TOP_COLOR);
    gradient.addColorStop(1, `#${HORIZON_COLOR.toString(16)}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
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
}

export interface TempleScene {
  pulseMoktak: () => void;
  dispose: () => void;
}

export async function createTempleScene(
  container: HTMLElement,
  options: TempleSceneOptions,
): Promise<TempleScene> {
  const scene = new Scene();
  scene.background = createSkyTexture();
  // far enough that the hall still shows from the gate, 210 units away
  scene.fog = new Fog(HORIZON_COLOR, 90, 340);

  const camera = new PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    800,
  );

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new HemisphereLight(0xdfeaf5, 0x6b5a3e, 0.9));
  const sun = new DirectionalLight(0xffe8c4, 2.2);
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
  const groundColor = await textureLoader.loadAsync(
    `${ASSET_ROOT}/materials/ground/color.jpg`,
  );
  groundColor.colorSpace = SRGBColorSpace;
  groundColor.wrapS = RepeatWrapping;
  groundColor.wrapT = RepeatWrapping;
  groundColor.repeat.set(GROUND_TEXTURE_REPEAT, GROUND_TEXTURE_REPEAT);
  groundColor.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = new Mesh(
    new PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new MeshStandardMaterial({ map: groundColor, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  async function addModel(
    path: string,
    position: Vector3,
    targetHeight: number,
  ): Promise<Object3D> {
    const gltf = await gltfLoader.loadAsync(`${ASSET_ROOT}/models/${path}`);
    const model = gltf.scene;
    const originalSize = new Box3().setFromObject(model).getSize(new Vector3());
    const scale = originalSize.y > 0 ? targetHeight / originalSize.y : 1;
    model.scale.setScalar(scale);

    const scaledBox = new Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new Vector3());
    model.position.set(
      position.x - scaledCenter.x,
      position.y - scaledBox.min.y,
      position.z - scaledCenter.z,
    );
    enableShadows(model);
    scene.add(model);
    return model;
  }

  function addStatue(
    path: string,
    statue: { x: number; z: number; height: number; pedestal: number },
  ): Promise<Object3D> {
    return addModel(
      path,
      new Vector3(statue.x, ALTAR_TOP + statue.pedestal, statue.z),
      statue.height,
    );
  }

  const [firstPine, ...otherPines] = PINE_POSITIONS;
  if (!firstPine) throw new Error("PINE_POSITIONS is empty");
  const [, , , avatar, pine, grounds] = await Promise.all([
    addStatue("buddha.glb", STATUES.buddha),
    addStatue("avalokitesvara.glb", STATUES.avalokitesvara),
    addStatue("mahastamaprapta.glb", STATUES.mahastamaprapta),
    addModel("monk.glb", new Vector3(AVATAR_START.x, 0, AVATAR_START.z), 1.7),
    addModel("pine.glb", new Vector3(firstPine.x, 0, firstPine.z), 4),
    buildTempleGrounds(textureLoader, renderer.capabilities.getMaxAnisotropy()),
  ]);
  scene.add(grounds.group);
  for (const spot of otherPines) {
    const tree = pine.clone();
    tree.position.x += spot.x - firstPine.x;
    tree.position.z += spot.z - firstPine.z;
    tree.rotation.y = (spot.x * 7 + spot.z * 13) % (Math.PI * 2);
    scene.add(tree);
  }

  const avatarGroundY = avatar.position.y;
  const movement = createMovementController({
    start: AVATAR_START,
    constrain: (from, to) => resolveMove(from, to, COLLIDERS),
  });
  // GLTFLoader strips "." from node names (it reserves "." as the
  // animation-track path separator), so the original rig's "thigh.L" etc.
  // load as "thighL".
  const avatarBones = {
    thighL: avatar.getObjectByName("thighL"),
    thighR: avatar.getObjectByName("thighR"),
    shinL: avatar.getObjectByName("shinL"),
    shinR: avatar.getObjectByName("shinR"),
    upperArmL: avatar.getObjectByName("upper_armL"),
    upperArmR: avatar.getObjectByName("upper_armR"),
  };
  const restQuaternions = new Map<Object3D, Quaternion>();
  for (const bone of Object.values(avatarBones)) {
    if (bone) restQuaternions.set(bone, bone.quaternion.clone());
  }
  let walkClockSeconds = 0;

  // Swing a bone about the avatar's own side-to-side axis, as an offset from
  // its rest pose. Expressing the axis in the bone's parent frame makes this
  // independent of how each bone's local axes were rolled in the rig.
  const sideAxis = new Vector3(1, 0, 0);
  const avatarWorldQuat = new Quaternion();
  const parentWorldQuat = new Quaternion();
  const axisInParent = new Vector3();
  const offset = new Quaternion();
  function swingBone(bone: Object3D | undefined, angle: number): void {
    const rest = bone ? restQuaternions.get(bone) : undefined;
    if (!bone || !rest || !bone.parent) return;
    avatar.getWorldQuaternion(avatarWorldQuat);
    bone.parent.getWorldQuaternion(parentWorldQuat);
    axisInParent
      .copy(sideAxis)
      .applyQuaternion(avatarWorldQuat)
      .applyQuaternion(parentWorldQuat.invert())
      .normalize();
    offset.setFromAxisAngle(axisInParent, angle);
    bone.quaternion.copy(rest).premultiply(offset);
    bone.updateMatrixWorld(true);
  }

  const moktakTexture = await textureLoader.loadAsync(
    `${ASSET_ROOT}/images/moktak.webp`,
  );
  const moktakSprite = new Sprite(
    new SpriteMaterial({ map: moktakTexture, transparent: true }),
  );
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
      Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y) >
        CLICK_DRAG_THRESHOLD_PX
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
    return (
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    );
  }
  function handleKeyDown(event: KeyboardEvent): void {
    if (isTypingInField(event)) return;
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
  const cameraYaw = (): number => START_HEADING + rig.yawOffset;
  function applyKeyboardMovement(deltaSeconds: number): void {
    const forward =
      (keys.isAnyHeld(FORWARD_KEYS) ? 1 : 0) - (keys.isAnyHeld(BACKWARD_KEYS) ? 1 : 0);
    const right =
      (keys.isAnyHeld(RIGHT_KEYS) ? 1 : 0) - (keys.isAnyHeld(LEFT_KEYS) ? 1 : 0);
    const direction = moveDirection(cameraYaw(), forward, right);

    if (direction) {
      heading = turnTowards(
        heading,
        Math.atan2(direction.x, direction.z),
        TURN_SPEED * deltaSeconds,
      );
      movement.moveTo({
        x: movement.position.x + direction.x * KEYBOARD_LOOK_AHEAD,
        z: movement.position.z + direction.z * KEYBOARD_LOOK_AHEAD,
      });
      keyboardDriving = true;
    } else if (keyboardDriving) {
      movement.stop();
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
    cameraTarget.set(
      avatar.position.x,
      avatar.position.y + CAMERA_LOOK_HEIGHT,
      avatar.position.z,
    );
    const desired = unblockedCameraPosition(
      desiredCameraPosition(cameraTarget, START_HEADING, rig),
    );
    const blend = snap ? 1 : 1 - Math.exp(-CAMERA_SMOOTHING * deltaSeconds);
    camera.position.x += (desired.x - camera.position.x) * blend;
    camera.position.y += (desired.y - camera.position.y) * blend;
    camera.position.z += (desired.z - camera.position.z) * blend;
    camera.lookAt(cameraTarget);
  }

  avatar.rotation.y = heading + Math.PI;
  updateCamera(0, true);

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
    // ease toward the floor height so stairs read as climbing, not teleporting
    const floorY = avatarGroundY + groundHeightAt(pos);
    avatar.position.y += (floorY - avatar.position.y) * Math.min(1, deltaSeconds * STEP_SMOOTHING);
    // +PI: monk.glb's own modeled "front" faces the opposite of the
    // +Z-facing heading convention.
    avatar.rotation.y = heading + Math.PI;
    if (movement.isWalking) {
      walkClockSeconds += deltaSeconds * pace;
    } else {
      walkClockSeconds = 0;
    }
    const pose = movement.isWalking
      ? computeWalkPose(walkClockSeconds)
      : IDLE_POSE;
    avatar.updateMatrixWorld(true);
    swingBone(avatarBones.thighL, pose.thighL);
    swingBone(avatarBones.thighR, pose.thighR);
    swingBone(avatarBones.upperArmL, pose.upperArmL);
    swingBone(avatarBones.upperArmR, pose.upperArmR);
    // Shins swing after their parent thighs so the axis uses the new thigh pose.
    swingBone(avatarBones.shinL, -pose.shinL);
    swingBone(avatarBones.shinR, -pose.shinR);
    sun.target.position.set(pos.x, 0, pos.z);
    // far enough up-sun that the tall hall roof sits inside the shadow frustum
    sun.position.set(pos.x + 28, 49, pos.z + 21);
    grounds.update(deltaSeconds);
    updateCamera(deltaSeconds);
    const pulsing = nowMs < pulseUntil;
    const scale = pulsing ? MOKTAK_PULSE_SCALE : 1;
    moktakSprite.scale.set(
      MOKTAK_BASE_SCALE * scale,
      MOKTAK_BASE_SCALE * scale,
      1,
    );
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

  return { pulseMoktak, dispose };
}
