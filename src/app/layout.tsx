import type { Metadata } from "next";
import { Geist_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dtfstudio.site"),
  title: {
    default: "DTF Studio — DTF transfers printed in Ankeveen",
    template: "%s · DTF Studio",
  },
  description:
    "DTF transfers printed in Ankeveen. Ordered today, on your press tomorrow. Pay per meter.",
  icons: { icon: "/favicon.svg", apple: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body
        className={`${sourceSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="page-rail" aria-hidden />
        {children}
      </body>
    </html>
  );
}
