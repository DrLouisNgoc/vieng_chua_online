import {
  parseQuoteImages,
  parseTalks,
  sutraFlipDirection,
  sutraOfTheDay,
  turnSutraPage,
  youtubeVideoId,
  type AdminPendingEntry,
  type AnsweredQuestion,
  type BoardsClient,
  type BoardView,
  type Question,
  type Talk,
} from "./boards-client";

// The "Đọc Kinh Nikaya" board (owner, 2026-11-10): a daily-rotating list
// of links to read, same "Tên | link" body format as bài giảng — not a
// board type of its own, so it's special-cased by id like the hall
// projector/chánh điện boards already are.
const SUTRA_BOARD_ID = "doc-kinh";

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

// One "page" of the Đọc Kinh Nikaya book: the sutra's own budsas.org page,
// framed like a sheet of paper. flipDirection, when set, starts the page
// rotated/transparent so the next frame can transition it back to flat —
// a page-turn animation (owner, 2026-11-11: "lướt sang trang như đọc 1
// quyển sách thật") around content this app never copies (see sutraOfTheDay).
function buildSutraPage(current: Talk, flipDirection: "next" | "prev" | null): HTMLElement {
  const page = document.createElement("div");
  page.className = "boards__page";
  if (flipDirection !== null) page.classList.add(`boards__page--turn-${flipDirection}`);

  const title = document.createElement("p");
  title.className = "boards__page-title";
  title.textContent = current.title;
  page.append(title);

  // Owner, 2026-11-10: "mở kinh như trang giấy, đừng chuyển link sang link
  // khác" — tried an <iframe> so budsas.org's own page reads right here.
  // budsas.org sends `X-Frame-Options: SAMEORIGIN` (owner, 2026-11-12, with
  // a screenshot: "refused to connect"), which blocks every embedding site,
  // not just this one — no code on our side can change that. Showing a
  // plain, honest "mở trang gốc" button reads better than a broken frame.
  const notice = document.createElement("p");
  notice.className = "boards__sutra-notice";
  notice.textContent = "Trang kinh này không cho nhúng trực tiếp — bấm để đọc ở tab mới:";
  page.append(notice);

  const openLink = document.createElement("a");
  openLink.className = "boards__sutra-open";
  openLink.href = current.url;
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  openLink.textContent = "Đọc kinh ↗";
  page.append(openLink);

  if (flipDirection !== null) {
    // Let the browser paint the rotated/transparent starting state first,
    // then drop it so the turn back to flat/opaque actually animates
    // instead of jumping straight to the resting position.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        page.classList.remove("boards__page--turn-next", "boards__page--turn-prev");
      });
    });
  }
  return page;
}

function buildSutraPageNav(currentIndex: number, length: number, turnPage: (direction: 1 | -1) => void): HTMLElement {
  const nav = document.createElement("div");
  nav.className = "boards__page-nav";

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "boards__page-turn";
  prevButton.textContent = "‹ Trang trước";
  prevButton.disabled = currentIndex <= 0;
  prevButton.addEventListener("click", () => turnPage(-1));

  const pageNumber = document.createElement("span");
  pageNumber.className = "boards__page-number";
  pageNumber.textContent = `Trang ${String(currentIndex + 1)} / ${String(length)}`;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "boards__page-turn";
  nextButton.textContent = "Trang sau ›";
  nextButton.disabled = currentIndex >= length - 1;
  nextButton.addEventListener("click", () => turnPage(1));

  nav.append(prevButton, pageNumber, nextButton);
  return nav;
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
  // null = today's automatic pick (sutraOfTheDay); an index once the
  // visitor picks a different one from the list to read instead.
  let selectedSutraIndex: number | null = null;
  // The actual page index shown last render, to tell which way to turn the
  // page (null right after opening, so the first paint never animates).
  let lastRenderedSutraIndex: number | null = null;
  // Questions a board's occupant has pulled up with their password (E,
  // "hỏi pháp") — null until they ask to see them, cleared when leaving
  // the board so a later visitor never sees a stale list. questionsPassword
  // is kept alongside so answering a question can reuse it without a
  // second password field.
  let questionsView: Question[] | null = null;
  let questionsPassword = "";

  function openPanel(next: View): void {
    view = next;
    message = "";
    selectedTalkIndex = 0;
    selectedSutraIndex = null;
    lastRenderedSutraIndex = null;
    questionsView = null;
    questionsPassword = "";
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

  // The 4 named cốc only (owner, 2026-11-10: "xem bài giảng của các vị
  // trong cốc") — the open "Thuyết Pháp" cốc and the hall projector (which
  // IS a talk list) don't get a second one.
  function hasOwnTalks(board: BoardView): boolean {
    return !board.registrable && board.type === "text" && board.id !== SUTRA_BOARD_ID;
  }

  function renderEditForm(board: BoardView): HTMLElement {
    const form = document.createElement("form");
    form.className = "boards__form";
    const title = document.createElement("input");
    title.type = "text";
    title.maxLength = 60;
    title.value = board.title;
    const content = document.createElement("textarea");
    content.className = "boards__content-input";
    content.value = board.body;
    content.rows = 8;
    content.placeholder =
      board.type === "video"
        ? "Mỗi dòng một bài: Tên bài | link YouTube\nVí dụ: Vô thường | https://youtu.be/..."
        : board.type === "image"
          ? "Mỗi dòng một ảnh: tên-file.jpg | Chú thích\n(đưa file ảnh vào app/public/thirdparty/phap-cu/)"
          : board.id === SUTRA_BOARD_ID
            ? "Mỗi dòng một bài kinh: Tên kinh | link để đọc\nVí dụ: Kinh Căn Bản Pháp Môn | https://..."
            : "Viết câu nói hoặc bài pháp ở đây...";
    const talks = hasOwnTalks(board) ? document.createElement("textarea") : null;
    if (talks) {
      talks.className = "boards__content-input";
      talks.value = board.talks;
      talks.rows = 4;
      talks.placeholder = "Mỗi dòng một bài giảng: Tên bài | link YouTube";
    }
    const password = document.createElement("input");
    password.type = "password";
    password.value = storage.getItem(passwordKey(board.id)) ?? "";
    password.placeholder = "Mật khẩu cốc này";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Lưu";
    // Only a text cốc can receive questions (renderAskForm, same
    // condition) — the hall projector, the chánh điện image banner and
    // the kinh board have no one to answer them.
    const viewQuestions =
      board.type === "text" && board.id !== SUTRA_BOARD_ID ? document.createElement("button") : null;
    if (viewQuestions) {
      viewQuestions.type = "button";
      viewQuestions.textContent = "Xem câu hỏi đã nhận";
    }
    const fields = [
      row("Tên cốc", title),
      row("Nội dung", content),
      ...(talks ? [row("Bài giảng", talks)] : []),
      ...(board.requiresPassword ? [row("Mật khẩu", password)] : []),
      submit,
      ...(viewQuestions ? [viewQuestions] : []),
    ];
    form.append(...fields);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const pw = board.requiresPassword ? password.value : "";
        const result = await client.edit(board.id, pw, {
          body: content.value,
          talks: talks?.value,
          title: title.value,
        });
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
    viewQuestions?.addEventListener("click", () => {
      void (async () => {
        const pw = board.requiresPassword ? password.value : "";
        const result = await client.readQuestions(board.id, pw);
        if (result.outcome === "ok") {
          questionsView = result.questions;
          questionsPassword = pw;
          message = result.questions.length === 0 ? "Chưa có câu hỏi nào." : "";
        } else {
          questionsView = null;
          message = "Sai mật khẩu, không xem được câu hỏi.";
        }
        render();
      })();
    });
    return form;
  }

  function renderAskForm(board: BoardView): HTMLElement {
    const form = document.createElement("form");
    form.className = "boards__form";
    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 60;
    name.required = true;
    const text = document.createElement("textarea");
    text.rows = 3;
    text.maxLength = 500;
    text.required = true;
    text.placeholder = "Điều bạn muốn hỏi...";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Gửi câu hỏi (chỉ chủ cốc đọc được)";
    form.append(row("Tên của bạn", name), row("Câu hỏi", text), submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const result = await client.ask(board.id, name.value, text.value);
        message = result === "ok" ? "Đã gửi câu hỏi." : "Không gửi được, thử lại sau.";
        if (result === "ok") text.value = "";
        render();
      })();
    });
    return form;
  }

  function renderQuoteImageList(body: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "boards__content";
    const images = parseQuoteImages(body);
    if (images.length === 0) {
      const p = document.createElement("p");
      p.textContent = "Chưa có ảnh nào.";
      wrap.append(p);
      return wrap;
    }
    const list = document.createElement("ul");
    for (const image of images) {
      const li = document.createElement("li");
      li.textContent = image.caption ? `${image.file} — ${image.caption}` : image.file;
      list.append(li);
    }
    wrap.append(list);
    return wrap;
  }

  function renderQuestions(board: BoardView, questions: Question[]): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "boards__questions";
    const heading = document.createElement("h3");
    heading.textContent = "Câu hỏi đã nhận";
    wrap.append(heading);
    for (const question of questions) {
      const item = document.createElement("div");
      item.className = "boards__question";
      const from = document.createElement("p");
      const name = document.createElement("strong");
      name.textContent = `${question.name}: `;
      from.append(name, document.createTextNode(question.text));
      item.append(from);
      if (question.answer !== null) {
        const answerP = document.createElement("p");
        answerP.className = "boards__answer";
        const label = document.createElement("strong");
        label.textContent = "Trả lời: ";
        answerP.append(label, document.createTextNode(question.answer));
        item.append(answerP);
      } else {
        item.append(renderAnswerForm(board, question));
      }
      wrap.append(item);
    }
    return wrap;
  }

  function renderAnswerForm(board: BoardView, question: Question): HTMLElement {
    const form = document.createElement("form");
    form.className = "boards__form";
    const answer = document.createElement("textarea");
    answer.rows = 2;
    answer.maxLength = 500;
    answer.placeholder = "Trả lời câu hỏi này (sẽ hiện công khai ở cốc)...";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Trả lời";
    form.append(answer, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const result = await client.answer(board.id, questionsPassword, question.id, answer.value);
        if (result === "ok") {
          message = "Đã trả lời.";
          const refreshed = await client.readQuestions(board.id, questionsPassword);
          if (refreshed.outcome === "ok") questionsView = refreshed.questions;
        } else {
          message = "Không trả lời được, thử lại sau.";
        }
        await refresh();
      })();
    });
    return form;
  }

  // Everyone visiting this cốc sees answered questions — the asker never
  // comes back to a private page, so "công khai trong cốc đó" (owner,
  // 2026-11-10) is the only way they'd see the reply at all.
  function renderAnsweredQuestions(answered: AnsweredQuestion[]): HTMLElement | null {
    if (answered.length === 0) return null;
    const wrap = document.createElement("div");
    wrap.className = "boards__questions";
    const heading = document.createElement("h3");
    heading.textContent = "Hỏi đáp";
    wrap.append(heading);
    for (const qa of answered) {
      const item = document.createElement("div");
      item.className = "boards__question";
      const from = document.createElement("p");
      const name = document.createElement("strong");
      name.textContent = `${qa.name}: `;
      from.append(name, document.createTextNode(qa.text));
      const answerP = document.createElement("p");
      answerP.className = "boards__answer";
      const label = document.createElement("strong");
      label.textContent = "Trả lời: ";
      answerP.append(label, document.createTextNode(qa.answer));
      item.append(from, answerP);
      wrap.append(item);
    }
    return wrap;
  }

  function renderVideos(talksText: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "boards__videos";
    const talks = parseTalks(talksText);
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

  // "Hôm nay" + a browsable list of the rest; a click reads a different
  // one but never changes which one is "today's" for other visitors.
  function renderSutraBoard(linksText: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "boards__book";
    const sutras = parseTalks(linksText);
    if (sutras.length === 0) {
      const p = document.createElement("p");
      p.className = "boards__content";
      p.textContent = "Chưa có bài kinh nào.";
      wrap.append(p);
      return wrap;
    }
    const today = sutraOfTheDay(sutras);
    const todayIndex = today ? sutras.indexOf(today) : 0;
    const currentIndex = selectedSutraIndex ?? todayIndex;
    const current = sutras[currentIndex];

    const flipDirection = sutraFlipDirection(lastRenderedSutraIndex, currentIndex);
    lastRenderedSutraIndex = currentIndex;

    const pickSutra = (index: number): void => {
      selectedSutraIndex = index;
      render();
    };

    const label = document.createElement("p");
    label.className = "boards__status";
    label.textContent = selectedSutraIndex === null ? "Hôm nay:" : "Đang xem:";
    wrap.append(label);

    if (current) wrap.append(buildSutraPage(current, flipDirection));

    wrap.append(
      buildSutraPageNav(currentIndex, sutras.length, (direction) =>
        pickSutra(turnSutraPage(currentIndex, sutras.length, direction)),
      ),
    );

    if (sutras.length > 1) {
      const listLabel = document.createElement("p");
      listLabel.className = "boards__status";
      listLabel.textContent = "Các bài kinh khác:";
      const list = document.createElement("ul");
      list.className = "boards__video-list";
      sutras.forEach((sutra, index) => {
        const li = document.createElement("li");
        const pick = document.createElement("button");
        pick.type = "button";
        pick.className = "boards__video-pick";
        pick.textContent = sutra.title;
        if (index === currentIndex) pick.setAttribute("aria-current", "true");
        pick.addEventListener("click", () => pickSutra(index));
        li.append(pick);
        list.append(li);
      });
      wrap.append(listLabel, list);
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
      parts.push(renderVideos(board.body));
      parts.push(renderEditForm(board));
    } else if (board.type === "image") {
      parts.push(renderQuoteImageList(board.body), renderEditForm(board));
    } else if (board.id === SUTRA_BOARD_ID) {
      parts.push(renderSutraBoard(board.body), renderEditForm(board));
    } else {
      const content = document.createElement("p");
      content.className = "boards__content";
      content.textContent = board.body || "(chưa có nội dung)";
      parts.push(content);
      if (hasOwnTalks(board)) parts.push(renderVideos(board.talks));
      const answered = renderAnsweredQuestions(board.answeredQuestions);
      if (answered) parts.push(answered);
      parts.push(renderAskForm(board), renderEditForm(board));
      if (questionsView) parts.push(renderQuestions(board, questionsView));
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
