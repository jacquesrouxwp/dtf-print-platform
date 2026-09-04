import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const liberationSans = localFont({
  src: [
    { path: "../fonts/LiberationSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/LiberationSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-liberation-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dtfstudio.site"),
  title: {
    default: "DTF Studio",
    template: "%s · DTF Studio",
  },
  description: "DTF Studio. Custom DTF transfers and merch. Bestel film. Pers zelf. Ankeveen, Netherlands.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body
        className={`${liberationSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="page-rail" aria-hidden />
        {children}
      </body>
    </html>
  );
}
