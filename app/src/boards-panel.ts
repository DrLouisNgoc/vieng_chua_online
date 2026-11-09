import { parseTalks, youtubeVideoId, type AdminPendingEntry, type BoardsClient, type BoardView } from "./boards-client";

// Panel for the 9 boards (4 named cốc, 4 open "Thuyết Pháp" cốc, the hall
// projector) plus the owner's admin approval screen. DOM-wiring only (no
// unit tests here, same as practice-panel.ts/interaction-hud.ts) —
// verified by screenshot per CLAUDE.md.

export interface BoardsPanel {
  show: () => void;
  openList: () => void;
  openBoard: (id: string) => void;
}

type View = { kind: "list" } | { kind: "board"; id: string } | { kind: "admin" };

function passwordKey(id: string): string {
  return `vieng-chua.boardpass.${id}`;
}

function statusLine(board: BoardView): string {
  if (!board.registrable) return board.occupantName ? `Phụ trách: ${board.occupantName}` : "";
  if (board.occupantName) return `Phụ trách: ${board.occupantName}`;
  if (board.pendingName) return `Đang chờ chủ chùa duyệt: ${board.pendingName}`;
  return "Còn trống — đăng ký để thuyết pháp tại đây";
}

export function createBoardsPanel(
  root: HTMLElement,
  client: BoardsClient,
  storage: Pick<Storage, "getItem" | "setItem">,
): BoardsPanel {
  root.hidden = true;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "boards__toggle";
  toggle.textContent = "Cốc & Bài giảng";
  toggle.setAttribute("aria-expanded", "false");

  const panel = document.createElement("section");
  panel.className = "boards__panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Cốc & Bài giảng");
  toggle.setAttribute("aria-controls", (panel.id = "boards-panel"));

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "boards__close";
  closeButton.textContent = "Đóng";

  const body = document.createElement("div");
  body.className = "boards__body";
  panel.append(closeButton, body);
  root.append(toggle, panel);

  let view: View = { kind: "list" };
  let boards: BoardView[] = [];
  let message = "";
  let selectedTalkIndex = 0;

  function openPanel(next: View): void {
    view = next;
    message = "";
    selectedTalkIndex = 0;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    void refresh();
  }

  async function refresh(): Promise<void> {
    boards = await client.list();
    render();
  }

  function row(label: string, el: HTMLElement): HTMLElement {
    const wrap = document.createElement("label");
    wrap.className = "boards__field";
    const span = document.createElement("span");
    span.textContent = label;
    wrap.append(span, el);
    return wrap;
  }

  function renderMessage(): HTMLElement | null {
    if (!message) return null;
    const p = document.createElement("p");
    p.className = "boards__message";
    p.textContent = message;
    return p;
  }

  function renderList(): void {
    const items = document.createElement("div");
    items.className = "boards__list";
    for (const board of boards) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "boards__item";
      const title = document.createElement("strong");
      title.textContent = board.title;
      const status = document.createElement("span");
      status.textContent = statusLine(board);
      item.append(title, status);
      item.addEventListener("click", () => openPanel({ kind: "board", id: board.id }));
      items.append(item);
    }
    const adminLink = document.createElement("button");
    adminLink.type = "button";
    adminLink.className = "boards__admin-link";
    adminLink.textContent = "Quản trị (chủ chùa)";
    adminLink.addEventListener("click", () => openPanel({ kind: "admin" }));
    body.replaceChildren(items, adminLink);
  }

  function renderRegisterForm(board: BoardView): HTMLElement {
    const form = document.createElement("form");
    form.className = "boards__form";
    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 60;
    name.required = true;
    const note = document.createElement("textarea");
    note.maxLength = 500;
    note.placeholder = "Muốn chia sẻ pháp thoại gì (không bắt buộc)";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Đăng ký cốc này";
    form.append(row("Tên của bạn", name), row("Ghi chú", note), submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const result = await client.register(board.id, name.value, note.value);
        message =
          result === "ok"
            ? "Đã gửi đăng ký, chờ chủ chùa duyệt."
            : result === "already-pending"
              ? "Cốc này đang có người chờ duyệt rồi."
              : result === "already-assigned"
                ? "Cốc này đã có người phụ trách rồi."
                : "Không đăng ký được, thử lại sau.";
        await refresh();
      })();
    });
    return form;
  }

  function renderEditForm(board: BoardView): HTMLElement {
    const form = document.createElement("form");
    form.className = "boards__form";
    const content = document.createElement("textarea");
    content.className = "boards__content-input";
    content.value = board.body;
    content.rows = 8;
    content.placeholder =
      board.type === "video"
        ? "Mỗi dòng một bài: Tên bài | link YouTube\nVí dụ: Vô thường | https://youtu.be/..."
        : "Viết câu nói hoặc bài pháp ở đây...";
    const password = document.createElement("input");
    password.type = "password";
    password.value = storage.getItem(passwordKey(board.id)) ?? "";
    password.placeholder = "Mật khẩu cốc này";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Lưu";
    form.append(row("Nội dung", content), row("Mật khẩu", password), submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const result = await client.edit(board.id, password.value, content.value);
        if (result === "ok") {
          storage.setItem(passwordKey(board.id), password.value);
          message = "Đã lưu.";
        } else if (result === "wrong-password") {
          message = "Sai mật khẩu.";
        } else {
          message = "Không lưu được, thử lại sau.";
        }
        await refresh();
      })();
    });
    return form;
  }

  function renderVideos(board: BoardView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "boards__videos";
    const talks = parseTalks(board.body);
    if (talks.length === 0) {
      const p = document.createElement("p");
      p.textContent = "Chưa có bài giảng nào.";
      wrap.append(p);
      return wrap;
    }
    if (selectedTalkIndex >= talks.length) selectedTalkIndex = 0;
    const current = talks[selectedTalkIndex];
    if (current) {
      const iframe = document.createElement("iframe");
      iframe.className = "boards__video";
      iframe.src = toEmbedUrl(current.url);
      iframe.allow = "encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      wrap.append(iframe);
    }
    if (talks.length > 1) {
      const list = document.createElement("ul");
      list.className = "boards__video-list";
      talks.forEach((talk, index) => {
        const li = document.createElement("li");
        const pick = document.createElement("button");
        pick.type = "button";
        pick.className = "boards__video-pick";
        pick.textContent = talk.title;
        if (index === selectedTalkIndex) pick.setAttribute("aria-current", "true");
        pick.addEventListener("click", () => {
          selectedTalkIndex = index;
          render();
        });
        li.append(pick);
        list.append(li);
      });
      wrap.append(list);
    }
    return wrap;
  }

  function renderBoardDetail(board: BoardView): void {
    const title = document.createElement("h2");
    title.textContent = board.title;
    const status = document.createElement("p");
    status.className = "boards__status";
    status.textContent = statusLine(board);

    const parts: HTMLElement[] = [title, status];
    const msg = renderMessage();
    if (msg) parts.push(msg);

    if (board.registrable && board.occupantName === null) {
      if (board.pendingName === null) parts.push(renderRegisterForm(board));
    } else if (board.type === "video") {
      parts.push(renderVideos(board));
      parts.push(renderEditForm(board));
    } else {
      const content = document.createElement("p");
      content.className = "boards__content";
      content.textContent = board.body || "(chưa có nội dung)";
      parts.push(content, renderEditForm(board));
    }
    body.replaceChildren(...parts);
  }

  function renderAdminLogin(): void {
    const form = document.createElement("form");
    form.className = "boards__form";
    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = "Mật khẩu quản trị (lần đầu: tự đặt)";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Vào quản trị";
    form.append(row("Mật khẩu quản trị", password), submit);
    const msg = renderMessage();
    const parts = msg ? [msg, form] : [form];
    body.replaceChildren(...parts);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const result = await client.adminPending(password.value);
        if (result.outcome === "ok") {
          storage.setItem("vieng-chua.adminpass", password.value);
          renderAdminPending(result.registrations, password.value);
        } else {
          message = "Sai mật khẩu quản trị.";
          renderAdminLogin();
        }
      })();
    });
  }

  function renderAdminPending(registrations: AdminPendingEntry[], password: string): void {
    const title = document.createElement("h2");
    title.textContent = "Đăng ký cốc đang chờ duyệt";
    const parts: HTMLElement[] = [title];
    const msg = renderMessage();
    if (msg) parts.push(msg);
    if (registrations.length === 0) {
      const p = document.createElement("p");
      p.textContent = "Không có đăng ký nào đang chờ.";
      parts.push(p);
    }
    for (const entry of registrations) {
      const card = document.createElement("div");
      card.className = "boards__pending-card";
      const heading = document.createElement("strong");
      heading.textContent = `${entry.title} — ${entry.name}`;
      const note = document.createElement("p");
      note.textContent = entry.note || "(không có ghi chú)";
      const approve = document.createElement("button");
      approve.type = "button";
      approve.textContent = "Duyệt";
      const reject = document.createElement("button");
      reject.type = "button";
      reject.textContent = "Từ chối";
      approve.addEventListener("click", () => {
        void (async () => {
          await client.adminApprove(entry.id, password);
          const next = await client.adminPending(password);
          if (next.outcome === "ok") renderAdminPending(next.registrations, password);
        })();
      });
      reject.addEventListener("click", () => {
        void (async () => {
          await client.adminReject(entry.id, password);
          const next = await client.adminPending(password);
          if (next.outcome === "ok") renderAdminPending(next.registrations, password);
        })();
      });
      card.append(heading, note, approve, reject);
      parts.push(card);
    }
    body.replaceChildren(...parts);
  }

  function render(): void {
    const current = view;
    if (current.kind === "list") {
      renderList();
      return;
    }
    if (current.kind === "admin") {
      renderAdminLogin();
      return;
    }
    const board = boards.find((b) => b.id === current.id);
    if (!board) {
      const p = document.createElement("p");
      p.textContent = "Không tìm thấy.";
      body.replaceChildren(p);
      return;
    }
    renderBoardDetail(board);
  }

  toggle.addEventListener("click", () => {
    if (panel.hidden) openPanel({ kind: "list" });
    else {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  closeButton.addEventListener("click", () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  });

  return {
    show() {
      root.hidden = false;
    },
    openList() {
      openPanel({ kind: "list" });
    },
    openBoard(id) {
      openPanel({ kind: "board", id });
    },
  };
}

function toEmbedUrl(url: string): string {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
}
