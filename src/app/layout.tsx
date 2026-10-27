import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { CrepeCartProvider } from "@/components/CrepeCart";
import "./globals.css";
import "./cart.css";

const fraunces = Fraunces({
  variable: "--font-uma-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-uma-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://crepe-heaven.com"),
  title: "Crepe Heaven — Lawndale Café",
  description:
    "Sweet and savory crepes in Lawndale. Order online for pickup from Hawthorne Blvd, or book catering for 25 or more.",
};

export const viewport: Viewport = {
  themeColor: "#a5a887",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={`ch-root ${fraunces.variable} ${jakarta.variable}`}>
          <CrepeCartProvider>{children}</CrepeCartProvider>
        </div>
      </body>
    </html>
  );
}
