import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Lora } from "next/font/google";
import { Footer } from "@/components/Contact";
import { Nav } from "@/components/Nav";
import { site } from "@/lib/content";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Downloaded at build time and served from this site: no requests to Google from visitors.
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-hanken" });

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#121814" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-theme and a class before React loads, so the
    // server HTML and the live <html> attributes are expected to differ.
    <html lang="en" className={`${lora.variable} ${hanken.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
