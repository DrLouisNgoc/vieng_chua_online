import "./style.css";
import { createTempleScene, type TempleScene } from "./scene";
import { createMoktakController } from "./moktak";
import { createPresenceClient, type PresenceStatus } from "./presence";
import { createOnboardingController, isDefaultName, ROBE_COLORS, type Gender } from "./onboarding";
import { renderAvatarSvg } from "./avatar-svg";
import { t } from "./i18n";
import { createInteractionHud } from "./interaction-hud";
import { createAmbience } from "./ambience";
import { createStorageBeadStore } from "./bead-counter";
import { browserStorage } from "./browser-storage";
import { createPractice } from "./practice";
import { createPracticePanel } from "./practice-panel";
import { createBoardsClient, parseQuoteImages, youtubeVideoId } from "./boards-client";
import { createBoardsPanel } from "./boards-panel";
import { createChatPanel } from "./chat-panel";
import { nearestBoardId } from "./board-proximity";
import { createBackgroundMusic, BACKGROUND_MUSIC_VIDEO_ID } from "./background-music";
import { defaultBoardsUrl, defaultPresenceUrl } from "./runtime-urls";

const MOKTAK_SOUND_URL = "/sansatemple/audio/moktak-hit-natural.wav";
const DEFAULT_PRESENCE_URL = defaultPresenceUrl(import.meta.env.DEV, window.location);
const DEFAULT_BOARDS_URL = defaultBoardsUrl(import.meta.env.DEV, window.location);

function presenceStatusText(status: PresenceStatus): string {
  switch (status.kind) {
    case "connecting":
      return "Đang kết nối...";
    case "online":
      return `${status.count} người đang viếng chùa`;
    case "offline":
      return "Mất kết nối máy chủ. Đang thử lại...";
  }
}

function renderShell(): void {
  document.title = t("산사 — 온라인 절");

  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("#app root element is missing");
  }

  const swatches = ROBE_COLORS.map(
    (color, index) =>
      `<button type="button" class="onboarding__swatch" data-color-index="${index}" style="background:${color.base}" aria-pressed="${index === 0}" aria-label="Màu áo ${index + 1}"></button>`,
  ).join("");

  app.innerHTML = `
    <div id="viewport"></div>
    <header class="hud-top" hidden>
      <span class="room-label">${t("산사")} · <span id="visitor-name"></span> · <span id="presence-label"></span></span>
      <button type="button" class="music-toggle" id="music-toggle">🔈 Nhạc nền</button>
    </header>
    <div class="interaction-hud" id="interaction-hud" hidden></div>
    <div class="practice" id="practice" hidden></div>
    <div class="boards" id="boards" hidden></div>
    <div class="chat" id="chat" hidden></div>
    <p class="board-prompt" id="board-prompt" hidden></p>
    <p class="hint" hidden>${t("바닥 클릭 · 드래그로 둘러보기 · 휠로 확대/축소")}</p>

    <div class="onboarding" id="onboarding">
      <form class="onboarding__card" id="onboarding-form" autocomplete="off">
        <h1 class="onboarding__title">Vào chùa</h1>
        <p class="onboarding__lead">Chọn nhanh một nhân vật rồi bước vào sân chùa.</p>
        <div class="onboarding__preview" id="onboarding-preview"></div>
        <div class="onboarding__field">
          <label for="onboarding-name">Pháp danh</label>
          <input id="onboarding-name" class="onboarding__input" type="text" maxlength="24" autocomplete="off" placeholder="Nhập pháp danh hoặc tên riêng của bạn" />
          <p class="onboarding__error" id="onboarding-name-error" hidden></p>
        </div>
        <div class="onboarding__field">
          <label>Giới tính</label>
          <div class="onboarding__toggle" id="onboarding-gender">
            <button type="button" data-gender="nam" aria-pressed="true">Nam</button>
            <button type="button" data-gender="nu" aria-pressed="false">Nữ</button>
          </div>
        </div>
        <div class="onboarding__field">
          <label>Màu áo</label>
          <div class="onboarding__swatches" id="onboarding-swatches">${swatches}</div>
        </div>
        <button type="submit" class="onboarding__enter" id="onboarding-enter">Vào chùa</button>
      </form>
    </div>
  `;
}

function updateAvatarPreview(
  container: HTMLElement,
  gender: Gender,
  colorIndex: number,
): void {
  container.innerHTML = renderAvatarSvg(gender);
  const color = ROBE_COLORS[colorIndex];
  const figure = container.querySelector<SVGElement>(".va-figure");
  if (figure && color) {
    figure.style.setProperty("--avatar-robe", color.base);
    figure.style.setProperty("--avatar-robe-shade", color.shade);
    figure.style.setProperty("--avatar-robe-trim", color.trim);
  }
}

async function main(): Promise<void> {
  renderShell();

  const viewport = document.querySelector<HTMLDivElement>("#viewport");
  const hudTop = document.querySelector<HTMLElement>(".hud-top");
  const hint = document.querySelector<HTMLElement>(".hint");
  const interactionRoot = document.querySelector<HTMLElement>("#interaction-hud");
  const practiceRoot = document.querySelector<HTMLElement>("#practice");
  const boardsRoot = document.querySelector<HTMLElement>("#boards");
  const chatRoot = document.querySelector<HTMLElement>("#chat");
  const boardPrompt = document.querySelector<HTMLElement>("#board-prompt");
  const presenceLabel = document.querySelector<HTMLSpanElement>(
    "#presence-label",
  );
  const visitorNameLabel = document.querySelector<HTMLSpanElement>(
    "#visitor-name",
  );
  const onboarding = document.querySelector<HTMLElement>("#onboarding");
  const onboardingForm = document.querySelector<HTMLFormElement>(
    "#onboarding-form",
  );
  const onboardingPreview = document.querySelector<HTMLElement>(
    "#onboarding-preview",
  );
  const onboardingNameInput = document.querySelector<HTMLInputElement>(
    "#onboarding-name",
  );
  const onboardingNameError = document.querySelector<HTMLParagraphElement>(
    "#onboarding-name-error",
  );
  const onboardingGender = document.querySelector<HTMLElement>(
    "#onboarding-gender",
  );
  const onboardingSwatches = document.querySelector<HTMLElement>(
    "#onboarding-swatches",
  );
  const musicToggle = document.querySelector<HTMLButtonElement>("#music-toggle");
  if (
    !viewport ||
    !hudTop ||
    !hint ||
    !interactionRoot ||
    !practiceRoot ||
    !boardsRoot ||
    !chatRoot ||
    !boardPrompt ||
    !presenceLabel ||
    !visitorNameLabel ||
    !onboarding ||
    !onboardingForm ||
    !onboardingPreview ||
    !onboardingNameInput ||
    !onboardingNameError ||
    !onboardingGender ||
    !onboardingSwatches ||
    !musicToggle
  ) {
    throw new Error("expected UI elements are missing");
  }

  // Start loading the 3D scene immediately, in parallel with onboarding.
  // The robe colour picked here also tints the 3D avatar (decision 0010).
  const moktakAudio = new Audio(MOKTAK_SOUND_URL);
  const playMoktakSound = (): void => {
    moktakAudio.currentTime = 0;
    moktakAudio.play().catch((error: unknown) => {
      console.warn("Moktak sound could not play:", error);
    });
  };

  let moktakController: ReturnType<typeof createMoktakController> | null =
    null;
  let performInteraction: ((action: Parameters<TempleScene["perform"]>[0]) => void) | null = null;
  let temple: TempleScene | null = null;
  const chatPanel = createChatPanel(chatRoot, (text) => presence.sendChat(text));
  const presence = createPresenceClient({
    url: import.meta.env.VITE_PRESENCE_URL ?? DEFAULT_PRESENCE_URL,
    onStatus: (status) => {
      presenceLabel.textContent = presenceStatusText(status);
    },
    onVisitors: (visitors) => temple?.setVisitors(visitors),
    onSeatRefused: () => temple?.refuseSeat(),
    onChat: (message) => chatPanel.addMessage(message),
    onChatHistory: (messages) => chatPanel.setHistory(messages),
    onBell: () => ambience.ringBell(),
    // Pháp danh locked to this visitor's ip (owner, 2026-11-10): prefill
    // and freeze the name field instead of leaving it open to a default.
    onNameLock: (name) => {
      if (name !== null) applyNameLock(name);
    },
    onWelcome: () => enterTemple(onb.state.name),
    onJoinRefused: () =>
      showNameError("Pháp danh này không dùng được, hãy nhập pháp danh hoặc tên riêng của bạn."),
  });
  let entered = false;
  const interactionHud = createInteractionHud(interactionRoot, (action) =>
    performInteraction?.(action),
  );

  // "Tu tập" (Milestone 7): chanting, moktak autoplay, background sound.
  const ambience = createAmbience();
  // Background music (owner, 2026-11-10: "để bài này làm nhạc tự động
  // phát cho tôi") — a hidden YouTube embed, muted until the visitor
  // clicks the toggle (browsers block automatic sound without a click).
  const backgroundMusic = createBackgroundMusic(document.body, BACKGROUND_MUSIC_VIDEO_ID);
  const musicToggleButton: HTMLButtonElement = musicToggle;
  function renderMusicToggle(): void {
    musicToggleButton.textContent = backgroundMusic.muted ? "🔈 Nhạc nền" : "🔊 Nhạc nền";
  }
  renderMusicToggle();
  musicToggleButton.addEventListener("click", () => {
    backgroundMusic.setMuted(!backgroundMusic.muted);
    renderMusicToggle();
  });
  const storage = browserStorage() ?? { getItem: () => null, setItem: () => {} };
  // Cốc + hall projector boards (owner, 2026-11-09): read-only HTTP for
  // everyone, password-gated edits, registration + admin approval for the
  // 4 open cốc.
  const boardsClient = createBoardsClient(import.meta.env.VITE_BOARDS_URL ?? DEFAULT_BOARDS_URL);
  const boardsPanel = createBoardsPanel(boardsRoot, boardsClient, storage);
  let nearBoardId: string | null = null;
  const practice = createPractice({
    strike: () => moktakController?.strike(),
    startChanting: () => temple?.startChanting() ?? false,
    stopChanting: () => temple?.stopChanting(),
    isChanting: () => temple?.isChanting() ?? false,
    storeFor: (id) => createStorageBeadStore(storage, `vieng-chua.chant.${id}`),
    onSessionChange: () => ambience.strikeBowl(),
  });
  const practicePanel = createPracticePanel(practiceRoot, {
    selectChant: (id) => practice.selectChant(id),
    toggleChant: () => practice.toggleChant(),
    toggleAutoplay: () => practice.toggleAutoplay(),
    toggleAmbience: () => ambience.setAmbienceOn(!ambience.ambienceOn),
  });
  let lastPracticeKey = "";
  function renderPractice(): void {
    const key = JSON.stringify([practice.view, ambience.ambienceOn]);
    if (key === lastPracticeKey) return;
    lastPracticeKey = key;
    practicePanel.render(practice.view, ambience.ambienceOn);
  }
  renderPractice();
  const scenePromise = createTempleScene(viewport, {
    onMoktakClick: () => moktakController?.strike(),
    onInteractionView: (view) => interactionHud.render(view),
    onLocalState: (state) => {
      if (entered) presence.sendState(state);
      nearBoardId = nearestBoardId(state);
      boardPrompt.hidden = nearBoardId === null;
      if (nearBoardId !== null) boardPrompt.textContent = "Nhấn E để mở cốc / bài giảng";
    },
    onFrame: (deltaSeconds) => {
      practice.update(deltaSeconds);
      renderPractice();
    },
    onRingBell: () => ambience.ringBell(),
  }).then((loaded) => {
    temple = loaded;
    performInteraction = loaded.perform;
    moktakController = createMoktakController({
      onStrike: () => {
        playMoktakSound();
        loaded.pulseMoktak();
      },
    });
    void refreshProjectorPreview(loaded);
    void refreshPhapCuBanner(loaded);
    return loaded;
  });

  // The in-world screen shows the current talk's thumbnail; actually
  // playing it still needs the boards panel (E), since a YouTube embed
  // can't feed a 3D texture. Refreshed once per load — reload the page
  // after changing the link to see the new thumbnail.
  async function refreshProjectorPreview(scene: TempleScene): Promise<void> {
    const boards = await boardsClient.list();
    const projector = boards.find((board) => board.id === "may-chieu-chanh-dien");
    const firstUrl = projector?.body.split("\n").map((line) => line.trim()).find(Boolean);
    const videoId = firstUrl ? youtubeVideoId(firstUrl) : null;
    scene.setProjectorPreview(videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
  }

  // The chánh điện banner cycles through the owner's own quote photos
  // (owner, 2026-11-10: "treo một số câu nói hay của sư phụ"); files go
  // in app/public/thirdparty/phap-cu/ (gitignored, decision 0009).
  const PHAP_CU_ROTATE_MS = 15_000;
  async function refreshPhapCuBanner(scene: TempleScene): Promise<void> {
    const boards = await boardsClient.list();
    const board = boards.find((b) => b.id === "loi-phap-chanh-dien");
    const images = board ? parseQuoteImages(board.body) : [];
    if (images.length === 0) {
      scene.setPhapCuImage(null);
      return;
    }
    let index = 0;
    scene.setPhapCuImage(`/thirdparty/phap-cu/${images[0]?.file}`);
    if (images.length > 1) {
      setInterval(() => {
        index = (index + 1) % images.length;
        scene.setPhapCuImage(`/thirdparty/phap-cu/${images[index]?.file}`);
      }, PHAP_CU_ROTATE_MS);
    }
  }



  // Onboarding (character screen)
  const onb = createOnboardingController();
  onboardingNameInput.value = onb.state.name;
  updateAvatarPreview(onboardingPreview, onb.state.gender, onb.state.colorIndex);

  // Re-bound as provably non-null for use inside the nested functions
  // below (TypeScript doesn't carry the guard's narrowing into them).
  const nameInput: HTMLInputElement = onboardingNameInput;
  const nameError: HTMLParagraphElement = onboardingNameError;
  const visitorLabel: HTMLSpanElement = visitorNameLabel;
  const onboardingPanel: HTMLElement = onboarding;
  const hudTopPanel: HTMLElement = hudTop;
  const hintPanel: HTMLElement = hint;

  function showNameError(message: string): void {
    nameError.textContent = message;
    nameError.removeAttribute("hidden");
  }

  function hideNameError(): void {
    nameError.setAttribute("hidden", "");
  }

  // The server already has a pháp danh for this visitor's ip (owner,
  // 2026-11-10: "họ chỉ được dùng 1 pháp danh này") — freeze the field so
  // they can't try to enter a different one.
  function applyNameLock(name: string): void {
    onb.lockName(name);
    nameInput.value = name;
    nameInput.readOnly = true;
    hideNameError();
  }

  function enterTemple(name: string): void {
    if (entered) return;
    visitorLabel.textContent = name;
    onboardingPanel.setAttribute("hidden", "");
    hudTopPanel.removeAttribute("hidden");
    hintPanel.removeAttribute("hidden");
    interactionHud.show();
    practicePanel.show();
    boardsPanel.show();
    chatPanel.show();
    entered = true;
    void scenePromise.then((loaded) => loaded.setRobeColor(onb.state.colorIndex));
  }

  onboardingNameInput.addEventListener("input", () => {
    onb.setName(onboardingNameInput.value);
    hideNameError();
  });

  onboardingGender.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-gender]",
    );
    const gender = button?.dataset.gender;
    if (gender !== "nam" && gender !== "nu") return;
    onb.setGender(gender);
    for (const b of onboardingGender.querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b === button));
    }
    updateAvatarPreview(onboardingPreview, onb.state.gender, onb.state.colorIndex);
  });

  onboardingSwatches.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-color-index]",
    );
    const index = Number(button?.dataset.colorIndex);
    if (button === null || Number.isNaN(index)) return;
    onb.setColorIndex(index);
    for (const b of onboardingSwatches.querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b === button));
    }
    updateAvatarPreview(onboardingPreview, onb.state.gender, onb.state.colorIndex);
  });

  onboardingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!onb.isNameLocked && isDefaultName(onb.state.name)) {
      showNameError("Pháp danh này không dùng được, hãy nhập pháp danh hoặc tên riêng của bạn.");
      return;
    }
    if (!onb.isValid) {
      showNameError("Vui lòng nhập pháp danh (tối đa 24 ký tự).");
      return;
    }
    hideNameError();
    // Transition to the 3D scene happens in onWelcome, once the server
    // actually accepts the join (it may refuse a forbidden default name).
    presence.join(onb.state.name, onb.state.colorIndex);
  });

  // Opening a cốc/the hall projector (E, near one) is independent of the
  // sit/bow/beads interaction state machine (scene.ts's own E handling) —
  // the zones never overlap. Ignored while typing in a panel's own input.
  window.addEventListener("keydown", (event) => {
    if (event.code !== "KeyE" || event.repeat || !entered || nearBoardId === null) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    boardsPanel.openBoard(nearBoardId);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("Failed to start the temple scene:", message);
  if (stack) {
    console.error(stack);
  }
});
