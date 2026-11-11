import type { InteractionAction } from "./interaction-prompts";
import type { InteractionView } from "./interaction-runtime";

// Prompt bar (one button per offered action, with its key) and the bead
// counter chip. Buttons do exactly what the keys do.

export interface InteractionHud {
  render: (view: InteractionView) => void;
  show: () => void;
}

export function createInteractionHud(root: HTMLElement, onAction: (action: InteractionAction) => void): InteractionHud {
  const bar = document.createElement("div");
  bar.className = "actions";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Hành động");
  const beadChip = document.createElement("p");
  beadChip.className = "bead-chip";
  beadChip.setAttribute("aria-live", "polite");
  beadChip.hidden = true;
  root.append(beadChip, bar);
  root.hidden = true;

  bar.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-action]");
    const action = button?.dataset.action as InteractionAction | undefined;
    if (action) onAction(action);
  });

  return {
    show() {
      root.hidden = false;
    },
    render(view) {
      bar.replaceChildren(
        ...view.prompts.map((prompt) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "actions__button";
          button.dataset.action = prompt.action;
          const key = document.createElement("kbd");
          key.textContent = prompt.key;
          button.append(key, ` ${prompt.label}`);
          return button;
        }),
      );
      beadChip.hidden = view.beadText === null;
      beadChip.textContent = view.beadText ?? "";
    },
  };
}
