import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "meshoptimizer";

const ASSET_ROOT = "/sansatemple";
const MOKTAK_BASE_SCALE = 0.8;
const MOKTAK_PULSE_SCALE = 1.15;
const MOKTAK_PULSE_MS = 150;

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
  scene.background = new Color(0xe9e2d3);

  const camera = new PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    200,
  );
  camera.position.set(0, 3.5, 9);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.2, 0);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.49;

  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xfff3e0, 1.2);
  sun.position.set(5, 10, 6);
  scene.add(sun);

  const textureLoader = new TextureLoader();
  const groundColor = await textureLoader.loadAsync(
    `${ASSET_ROOT}/materials/ground/color.jpg`,
  );
  const ground = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({ map: groundColor }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  async function addModel(
    path: string,
    position: Vector3,
    targetHeight: number,
  ): Promise<void> {
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
    scene.add(model);
  }

  await Promise.all([
    addModel("buddha.glb", new Vector3(0, 0, -3), 2.2),
    addModel("avalokitesvara.glb", new Vector3(-1.6, 0, -2.6), 1.8),
    addModel("mahastamaprapta.glb", new Vector3(1.6, 0, -2.6), 1.8),
    addModel("monk.glb", new Vector3(0, 0, 2.5), 1.7),
    addModel("pine.glb", new Vector3(-6, 0, -1), 4),
  ]);

  const moktakTexture = await textureLoader.loadAsync(
    `${ASSET_ROOT}/images/moktak.webp`,
  );
  const moktakSprite = new Sprite(
    new SpriteMaterial({ map: moktakTexture, transparent: true }),
  );
  moktakSprite.scale.set(MOKTAK_BASE_SCALE, MOKTAK_BASE_SCALE, 1);
  moktakSprite.position.set(0.9, 0.9, 1.5);
  scene.add(moktakSprite);

  let pulseUntil = 0;
  function pulseMoktak(): void {
    pulseUntil = performance.now() + MOKTAK_PULSE_MS;
  }

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  function handlePointerDown(event: PointerEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(moktakSprite);
    if (hits.length > 0) {
      options.onMoktakClick();
    }
  }
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);

  let frameHandle = 0;
  function renderLoop(): void {
    frameHandle = requestAnimationFrame(renderLoop);
    controls.update();
    const pulsing = performance.now() < pulseUntil;
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
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  }

  return { pulseMoktak, dispose };
}
