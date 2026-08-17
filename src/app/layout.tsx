import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Instrument_Serif({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: "400",
});

const displayCyr = Source_Serif_4({
  variable: "--font-display-cyr",
  subsets: ["cyrillic"],
  weight: "400",
});

const bodyCyr = Manrope({
  variable: "--font-cyr",
  subsets: ["cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hlv.film"),
  title: {
    default: "HLV — DTF transfers printed in Hilversum",
    template: "%s · HLV",
  },
  description:
    "DTF transfers printed in Hilversum. Ordered today, on your press tomorrow. Pay per meter. No minimums.",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${displayCyr.variable} ${bodyCyr.variable} min-h-screen bg-paper text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
