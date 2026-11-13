// Renders a PDF (the owner's own file, e.g. a full Trung Bộ Kinh volume —
// decision: owner, 2026-11-12, "tôi đưa file PDF vào và bạn làm như 1
// quyển sách", confirming they take responsibility for whatever copyright
// status that file has) page by page, each page cached as a data URL so
// it can sit in a plain <img>, the same way the rest of this app's
// canvas-generated images work (no live <canvas> to keep alive across
// boards-panel.ts's full re-renders).
import type { PDFDocumentProxy } from "pdfjs-dist";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// The standard bundler-agnostic way to point at a worker file (Vite and
// webpack 5+ both resolve this `new URL(...)` + `import.meta.url` pattern
// and bundle the target) — plain-string specifiers like `?url` confuse
// oxlint's static import resolution (it isn't bundler-aware).
GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

// Owner, 2026-11-12: "chữ bé quá! làm lại đi kéo vào cả màn hình luôn khi
// tôi ấn E" — the reader now fills most of the screen (boards__panel--full
// in style.css), so pages render at a higher resolution to stay crisp.
const PAGE_SCALE = 2.2;

// Owner, 2026-11-13: "cho thêm phần tìm kiếm và đánh số trang muốn đi tới".
export function clampPdfPage(page: number, numPages: number): number {
  return Number.isNaN(page) ? 1 : Math.max(1, Math.min(Math.trunc(page), numPages));
}

// Every page once, starting right after `fromPage` and wrapping round, so
// "find next" moves forward from where the reader is.
export function searchPageOrder(numPages: number, fromPage: number): number[] {
  return Array.from({ length: numPages }, (_, index) => ((fromPage + index) % numPages) + 1);
}

function squashSpaces(text: string): string {
  return text.replaceAll(/\s+/g, " ").trim().toLowerCase();
}

export function hasText(pageText: string, query: string): boolean {
  const needle = squashSpaces(query);
  return needle !== "" && squashSpaces(pageText).includes(needle);
}

export interface PdfBook {
  numPages: number;
  pageImageUrl: (pageNumber: number) => Promise<string>;
  // The first page after `fromPage` (wrapping) whose text has `query`, or null.
  findPage: (query: string, fromPage: number) => Promise<number | null>;
}

export async function loadPdfBook(url: string): Promise<PdfBook | null> {
  let doc: PDFDocumentProxy;
  try {
    doc = await getDocument({ url }).promise;
  } catch {
    return null;
  }

  const cache = new Map<number, string>();
  const textCache = new Map<number, string>();
  async function textOf(pageNumber: number): Promise<string> {
    const cached = textCache.get(pageNumber);
    if (cached !== undefined) return cached;
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    textCache.set(pageNumber, text);
    return text;
  }
  return {
    numPages: doc.numPages,
    async pageImageUrl(pageNumber) {
      const cached = cache.get(pageNumber);
      if (cached !== undefined) return cached;
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PAGE_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2d canvas context unavailable");
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      cache.set(pageNumber, dataUrl);
      return dataUrl;
    },
    async findPage(query, fromPage) {
      for (const pageNumber of searchPageOrder(doc.numPages, fromPage)) {
        // eslint-disable-next-line no-await-in-loop -- pages are searched in order, stopping at the first hit
        if (hasText(await textOf(pageNumber), query)) return pageNumber;
      }
      return null;
    },
  };
}

// Stops at the first/last page instead of wrapping, like turnSutraPage did
// for the old link-list reader.
export function turnPdfPage(current: number, numPages: number, direction: 1 | -1): number {
  return Math.max(1, Math.min(current + direction, numPages));
}
