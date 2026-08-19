/** Drop in-memory previews — they do not survive a reload and blow quota. */
export function persistableSrc(src: string | undefined | null): string {
  if (!src || typeof src !== "string") return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return "";
  return src;
}

export async function readResponseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return { error: `http ${res.status}` };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return { error: text.slice(0, 240) };
  } catch {
    return { error: text.slice(0, 240) || `http ${res.status}` };
  }
}

async function blobToDataUrl(file: Blob): Promise<string> {
  if (typeof FileReader === "undefined") return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Always-available film preview. Does not wait for /api/upload or Blob.
 * Object URLs first (cheap); data URL if createObjectURL is missing.
 */
export async function localImageMeta(
  file: Blob
): Promise<{ src: string; pixelW: number; pixelH: number }> {
  let src = "";
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    src = URL.createObjectURL(file);
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      const pixelW = bmp.width;
      const pixelH = bmp.height;
      bmp.close();
      if (!src) src = await blobToDataUrl(file);
      return { src, pixelW, pixelH };
    } catch {
      /* fall through to HTMLImage */
    }
  }

  if (!src) src = await blobToDataUrl(file);
  if (typeof Image === "undefined") return { src, pixelW: 0, pixelH: 0 };

  const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = src;
  });
  return { src, pixelW: size.w, pixelH: size.h };
}
