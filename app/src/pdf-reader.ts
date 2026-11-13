// Renders a PDF (the owner's own file, e.g. a full Trung Bộ Kinh volume —
// decision: owner, 2026-11-12, "tôi đưa file PDF vào và bạn làm như 1
// quyển sách", confirming they take responsibility for whatever copyright
// status that file has) page by page, each page cached as a data URL so
// it can sit in a plain <img>, the same way the rest of this app's
// canvas-generated images work (no live <canvas> to keep alive across
// boards-panel.ts's full re-renders).
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

export interface PdfBook {
  numPages: number;
  pageImageUrl: (pageNumber: number) => Promise<string>;
}

export async function loadPdfBook(url: string): Promise<PdfBook | null> {
  let doc;
  try {
    doc = await getDocument({ url }).promise;
  } catch {
    return null;
  }

  const cache = new Map<number, string>();
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
  };
}

// Stops at the first/last page instead of wrapping, like turnSutraPage did
// for the old link-list reader.
export function turnPdfPage(current: number, numPages: number, direction: 1 | -1): number {
  return Math.max(1, Math.min(current + direction, numPages));
}
