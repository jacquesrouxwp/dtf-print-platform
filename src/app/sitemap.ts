import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n-config";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://dtfstudio.site";

const paths = [
  "",
  "/order",
  "/pricing",
  "/bundles",
  "/dtf-transfers",
  "/dtf-vs",
  "/how-to-press",
  "/file-guidelines",
  "/rental",
  "/samples",
  "/trade",
  "/about",
  "/shipping",
  "/faq",
  "/contact",
  "/legal/terms",
  "/legal/privacy",
  "/legal/returns",
  "/legal/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site}/${locale}${path}`,
      changeFrequency: path === "/order" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/order" ? 0.9 : 0.6,
    }))
  );
}
