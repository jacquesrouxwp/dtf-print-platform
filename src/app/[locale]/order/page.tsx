import type { Metadata } from "next";
import { BuilderApp } from "@/components/builder/builder-app";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/order", t.meta.orderTitle, t.meta.orderDesc);
}

export default function OrderPage() {
  return <BuilderApp />;
}
