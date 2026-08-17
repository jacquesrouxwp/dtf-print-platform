import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout-client";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/checkout", t.meta.checkoutTitle, t.checkout.lede);
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
