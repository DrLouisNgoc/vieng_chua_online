import "./style.css";
import { createTempleScene } from "./scene";
import { createMoktakController } from "./moktak";
import { createPresenceClient, type PresenceStatus } from "./presence";
import { createOnboardingController, ROBE_COLORS, type Gender } from "./onboarding";
import { renderAvatarSvg } from "./avatar-svg";
import { t } from "./i18n";

const MOKTAK_SOUND_URL = "/sansatemple/audio/moktak-hit-natural.wav";
const DEFAULT_PRESENCE_URL = "ws://localhost:8787";

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
    </header>
    <p class="hint" hidden>${t("바닥 클릭 · 드래그로 둘러보기 · 휠로 확대/축소")}</p>

    <div class="onboarding" id="onboarding">
      <form class="onboarding__card" id="onboarding-form" autocomplete="off">
        <h1 class="onboarding__title">Vào chùa</h1>
        <p class="onboarding__lead">Chọn nhanh một nhân vật rồi bước vào sân chùa.</p>
        <div class="onboarding__preview" id="onboarding-preview"></div>
        <div class="onboarding__field">
          <label for="onboarding-name">Pháp danh</label>
          <input id="onboarding-name" class="onboarding__input" type="text" maxlength="24" autocomplete="off" />
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
  const onboardingGender = document.querySelector<HTMLElement>(
    "#onboarding-gender",
  );
  const onboardingSwatches = document.querySelector<HTMLElement>(
    "#onboarding-swatches",
  );
  if (
    !viewport ||
    !hudTop ||
    !hint ||
    !presenceLabel ||
    !visitorNameLabel ||
    !onboarding ||
    !onboardingForm ||
    !onboardingPreview ||
    !onboardingNameInput ||
    !onboardingGender ||
    !onboardingSwatches
  ) {
    throw new Error("expected UI elements are missing");
  }

  // Start loading the 3D scene immediately, in parallel with onboarding —
  // only sansatemple.com's own monk.glb is used in-scene regardless of the
  // name/gender/color picked here (decision 0003: original 3D assets stay
  // as-is; the picker only customizes the 2D SVG preview).
  const moktakAudio = new Audio(MOKTAK_SOUND_URL);
  const playMoktakSound = (): void => {
    moktakAudio.currentTime = 0;
    moktakAudio.play().catch((error: unknown) => {
      console.warn("Moktak sound could not play:", error);
    });
  };

  let moktakController: ReturnType<typeof createMoktakController> | null =
    null;
  const scenePromise = createTempleScene(viewport, {
    onMoktakClick: () => moktakController?.strike(),
  }).then((temple) => {
    moktakController = createMoktakController({
      onStrike: () => {
        playMoktakSound();
        temple.pulseMoktak();
      },
    });
    return temple;
  });

  createPresenceClient({
    url: import.meta.env.VITE_PRESENCE_URL ?? DEFAULT_PRESENCE_URL,
    onStatus: (status) => {
      presenceLabel.textContent = presenceStatusText(status);
    },
  });


  // Onboarding (character screen)
  const onb = createOnboardingController();
  onboardingNameInput.value = onb.state.name;
  updateAvatarPreview(onboardingPreview, onb.state.gender, onb.state.colorIndex);

  onboardingNameInput.addEventListener("input", () => {
    onb.setName(onboardingNameInput.value);
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
    if (!onb.isValid) return;

    visitorNameLabel.textContent = onb.state.name;
    onboarding.setAttribute("hidden", "");
    hudTop.removeAttribute("hidden");
    hint.removeAttribute("hidden");
    void scenePromise;
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
