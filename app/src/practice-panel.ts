import { CHANTS, type ChantId } from "./chant-texts";
import type { PracticeView } from "./practice";

// "Tu tập" panel (Milestone 7): pick a chant, start/stop, the current line
// with the current syllable highlighted, the count, moktak autoplay and
// background sound. Closed by default behind a top-right button.

export interface PracticePanelActions {
  selectChant: (id: ChantId) => void;
  toggleChant: () => void;
  toggleAutoplay: () => void;
  toggleAmbience: () => void;
}

export interface PracticePanel {
  render: (view: PracticeView, ambienceOn: boolean) => void;
  show: () => void;
}

function button(className: string, text: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = text;
  return element;
}

export function createPracticePanel(root: HTMLElement, actions: PracticePanelActions): PracticePanel {
  root.hidden = true;
  const toggle = button("practice__toggle", "Tu tập");
  toggle.setAttribute("aria-expanded", "false");
  const panel = document.createElement("section");
  panel.className = "practice__panel";
  panel.id = "practice-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Tu tập");
  toggle.setAttribute("aria-controls", panel.id);

  const picker = document.createElement("select");
  picker.className = "practice__picker";
  picker.setAttribute("aria-label", "Chọn bài");
  for (const chant of CHANTS) {
    const option = document.createElement("option");
    option.value = chant.id;
    option.textContent = chant.title;
    picker.append(option);
  }
  const start = button("practice__start", "Bắt đầu tụng");
  const line = document.createElement("p");
  line.className = "practice__line";
  line.setAttribute("aria-live", "off");
  const count = document.createElement("p");
  count.className = "practice__count";
  const autoplay = button("practice__switch", "");
  const ambience = button("practice__switch", "");
  panel.append(picker, start, line, count, autoplay, ambience);
  root.append(toggle, panel);

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  picker.addEventListener("change", () => actions.selectChant(picker.value as ChantId));
  start.addEventListener("click", () => actions.toggleChant());
  autoplay.addEventListener("click", () => actions.toggleAutoplay());
  ambience.addEventListener("click", () => actions.toggleAmbience());

  let lastLineKey = "";
  return {
    show() {
      root.hidden = false;
    },
    render(view, ambienceOn) {
      picker.value = view.chantId;
      picker.disabled = view.chanting;
      start.textContent = view.chanting ? "Dừng tụng" : "Bắt đầu tụng";
      start.setAttribute("aria-pressed", String(view.chanting));
      count.textContent = `Đã tụng: ${view.count.toLocaleString("vi-VN")} ${view.unit}`;
      autoplay.textContent = `Tự động gõ mõ: ${view.autoplay ? "Bật" : "Tắt"}`;
      autoplay.setAttribute("aria-pressed", String(view.autoplay));
      autoplay.disabled = view.chanting;
      ambience.textContent = `Âm thanh nền: ${ambienceOn ? "Bật" : "Tắt"}`;
      ambience.setAttribute("aria-pressed", String(ambienceOn));

      const lineKey = `${view.chantId}|${view.line.join(" ")}|${view.syllable}|${view.chanting}`;
      if (lineKey === lastLineKey) return;
      lastLineKey = lineKey;
      line.hidden = !view.chanting;
      // real spaces between syllables, so the line can wrap
      line.replaceChildren(
        ...view.line.flatMap((syllable, index) => {
          const span = document.createElement("span");
          span.textContent = syllable;
          if (index === view.syllable) span.className = "practice__now";
          else if (index < view.syllable) span.className = "practice__done";
          return index === 0 ? [span] : [" ", span];
        }),
      );
    },
  };
}
