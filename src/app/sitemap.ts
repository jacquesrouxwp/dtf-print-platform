import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://hlv.film";

const paths = [
  "",
  "/order",
  "/pricing",
  "/dtf-transfers",
  "/dtf-vs",
  "/how-to-press",
  "/file-guidelines",
  "/samples",
  "/trade",
  "/about",
  "/shipping",
  "/faq",
  "/contact",
  "/studio",
  "/legal/terms",
  "/legal/privacy",
  "/legal/returns",
  "/legal/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    (["nl", "en"] as const).map((locale) => ({
      url: `${site}/${locale}${path}`,
      changeFrequency: path === "/order" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/order" ? 0.9 : 0.6,
    }))
  );
}
