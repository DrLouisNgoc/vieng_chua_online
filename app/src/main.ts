import "./style.css";
import { createTempleScene } from "./scene";
import { createMoktakController } from "./moktak";
import { t } from "./i18n";

const MOKTAK_SOUND_URL = "/sansatemple/audio/moktak-hit-natural.wav";
const PLACEHOLDER_PRESENCE_COUNT = "1/100";

function renderShell(): void {
  document.title = t("산사 — 온라인 절");

  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("#app root element is missing");
  }

  app.innerHTML = `
    <div id="viewport"></div>
    <header class="hud-top">
      <span class="room-label">${t("산사")} · ${PLACEHOLDER_PRESENCE_COUNT} ${t("방문객 보기")}</span>
    </header>
    <p class="hint">${t("바닥 클릭 · 드래그로 둘러보기 · 휠로 확대/축소")}</p>
    <section class="moktak-panel">
      <button id="moktak-strike" type="button">${t("목탁 두드리기")}</button>
      <button id="moktak-autoplay" type="button">${t("자동재생")}</button>
      <p id="moktak-status" class="moktak-status" aria-live="polite"></p>
    </section>
  `;
}

async function main(): Promise<void> {
  renderShell();

  const viewport = document.querySelector<HTMLDivElement>("#viewport");
  const strikeButton = document.querySelector<HTMLButtonElement>(
    "#moktak-strike",
  );
  const autoplayButton = document.querySelector<HTMLButtonElement>(
    "#moktak-autoplay",
  );
  const statusLabel = document.querySelector<HTMLParagraphElement>(
    "#moktak-status",
  );
  if (!viewport || !strikeButton || !autoplayButton || !statusLabel) {
    throw new Error("expected UI elements are missing");
  }

  const moktakAudio = new Audio(MOKTAK_SOUND_URL);

  const playMoktakSound = (): void => {
    moktakAudio.currentTime = 0;
    moktakAudio.play().catch(() => {
      statusLabel.textContent = t(
        "목탁 소리를 준비하지 못했어요. 다시 눌러주세요.",
      );
    });
  };

  const temple = await createTempleScene(viewport, {
    onMoktakClick: () => moktakController.strike(),
  });

  const moktakController = createMoktakController({
    onStrike: () => {
      playMoktakSound();
      temple.pulseMoktak();
    },
  });

  strikeButton.addEventListener("click", () => moktakController.strike());
  autoplayButton.addEventListener("click", () => {
    moktakController.toggleAutoplay();
    autoplayButton.textContent = moktakController.isAutoplay
      ? t("일시정지")
      : t("자동재생");
    statusLabel.textContent = moktakController.isAutoplay
      ? t("목탁 자동재생을 시작했어요.")
      : t("목탁 자동재생을 멈췄어요.");
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
