import { describe, expect, it } from "vitest";
import {
  contentTypeForQueueKey,
  filenameForQueueKey,
  isPngQueueRef,
  queueFileUrl,
  safeQueueKey,
  siteBaseUrl,
} from "./queue-files";

describe("queue file URLs", () => {
  it("builds the studio /api/files link from NEXT_PUBLIC_SITE_URL fallback", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteBaseUrl()).toBe("https://www.dtfstudio.site");
    expect(queueFileUrl("queue/DTF-MTMWZ760.png")).toBe(
      "https://www.dtfstudio.site/api/files?key=queue/DTF-MTMWZ760.png"
    );
    process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("strips a trailing slash on the site URL", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.dtfstudio.site/";
    expect(queueFileUrl("queue/DTF-1-operator.pdf")).toBe(
      "https://www.dtfstudio.site/api/files?key=queue/DTF-1-operator.pdf"
    );
    process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("does not put the Vercel alias into Airtable", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://dtf-print-platform.vercel.app";
    expect(siteBaseUrl()).toBe("https://www.dtfstudio.site");
    process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("picks PNG refs out of mixed queue keys and full URLs", () => {
    expect(isPngQueueRef("queue/DTF-1.png")).toBe(true);
    expect(isPngQueueRef("https://www.dtfstudio.site/api/files?key=queue/DTF-1.png")).toBe(true);
    expect(isPngQueueRef("queue/DTF-1-operator.pdf")).toBe(false);
  });

  it("sets Content-Type from the key suffix", () => {
    expect(contentTypeForQueueKey("queue/a.png")).toBe("image/png");
    expect(contentTypeForQueueKey("queue/a-operator.pdf")).toBe("application/pdf");
    expect(contentTypeForQueueKey("queue/a.json")).toBe("application/json; charset=utf-8");
    expect(filenameForQueueKey("queue/DTF-1.png")).toBe("DTF-1.png");
  });

  it("rejects empty and traversing keys", () => {
    expect(safeQueueKey(null)).toBeNull();
    expect(safeQueueKey("../secret")).toBeNull();
    expect(safeQueueKey("queue/DTF-1.png")).toBe("queue/DTF-1.png");
  });
});
