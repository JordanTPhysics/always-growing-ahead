"use client";

import { useEffect, useRef, useState } from "react";
import { MdPictureAsPdf } from "react-icons/md";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";

const THUMB_CSS_WIDTH = 144;

type Props = {
  src: string;
  title: string;
  /** Fill the parent box instead of rendering a fixed 144px preview. */
  fill?: boolean;
};

export function PdfThumbnail({ src, title, fill = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    async function render() {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      if (cancelled || !canvas) return;

      const task = pdfjs.getDocument({
        url: src,
        withCredentials: true,
        disableStream: true,
        disableAutoFetch: true,
        useWasm: false,
      });
      loadingTask = task;
      const pdf = await task.promise;
      if (cancelled) return;

      const page = await pdf.getPage(1);
      if (cancelled) return;

      const unscaled = page.getViewport({ scale: 1 });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = fill
        ? Math.max(rootRef.current?.clientWidth ?? THUMB_CSS_WIDTH, THUMB_CSS_WIDTH)
        : THUMB_CSS_WIDTH;
      const viewport = page.getViewport({
        scale: (cssWidth / unscaled.width) * pixelRatio,
      });

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      if (fill) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }
      if (!cancelled) setStatus("ready");
    }

    setStatus("loading");
    void render().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      void loadingTask?.destroy().catch(() => undefined);
    };
  }, [fill, src, visible]);

  return (
    <div
      ref={rootRef}
      className={
        fill
          ? "relative h-full w-full overflow-hidden bg-white"
          : "relative w-36 overflow-hidden rounded-md border border-border bg-white"
      }
      style={fill || status === "ready" ? undefined : { aspectRatio: "3 / 4" }}
    >
      <canvas
        ref={canvasRef}
        className={
          status === "ready"
            ? fill
              ? "h-full w-full object-contain"
              : "block h-auto w-full"
            : "pointer-events-none absolute inset-0 opacity-0"
        }
      />
      {status === "ready" ? null : (
        <div className="absolute inset-0 flex items-center justify-center bg-background-soft text-muted">
          {status === "error" ? (
            <MdPictureAsPdf className="h-10 w-10" aria-hidden />
          ) : (
            <span className="absolute inset-0 animate-pulse bg-background-soft" />
          )}
        </div>
      )}
      <span className="sr-only">{title}</span>
    </div>
  );
}
