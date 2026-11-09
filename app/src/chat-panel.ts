import type { ChatEntry } from "./visitor-protocol";

// Public chat (Milestone: cốc + chat): a small collapsible log + input,
// docked bottom-left. DOM-wiring only, same as practice-panel.ts.

export interface ChatPanel {
  show: () => void;
  setHistory: (messages: ChatEntry[]) => void;
  addMessage: (message: ChatEntry) => void;
}

const MAX_RENDERED = 100;

export function createChatPanel(root: HTMLElement, onSend: (text: string) => void): ChatPanel {
  root.hidden = true;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "chat__toggle";
  toggle.textContent = "Trò chuyện";
  toggle.setAttribute("aria-expanded", "false");

  const panel = document.createElement("section");
  panel.className = "chat__panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Trò chuyện chung");

  const log = document.createElement("ul");
  log.className = "chat__log";

  const form = document.createElement("form");
  form.className = "chat__form";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 300;
  input.placeholder = "Nhắn gì đó...";
  input.setAttribute("aria-label", "Tin nhắn");
  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Gửi";
  form.append(input, send);

  panel.append(log, form);
  root.append(toggle, panel);

  function appendEntry(message: ChatEntry): void {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = `${message.name}: `;
    item.append(name, document.createTextNode(message.text));
    log.append(item);
    while (log.children.length > MAX_RENDERED) log.firstElementChild?.remove();
    log.scrollTop = log.scrollHeight;
  }

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    onSend(text);
    input.value = "";
  });

  return {
    show() {
      root.hidden = false;
    },
    setHistory(messages) {
      log.replaceChildren();
      for (const message of messages) appendEntry(message);
    },
    addMessage(message) {
      appendEntry(message);
    },
  };
}
