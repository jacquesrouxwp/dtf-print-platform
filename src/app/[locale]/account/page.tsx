import type { Metadata } from "next";
import { AccountClient } from "@/components/account-client";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/account", t.meta.accountTitle, t.account.lede);
}

export default function AccountPage() {
  return <AccountClient />;
}
