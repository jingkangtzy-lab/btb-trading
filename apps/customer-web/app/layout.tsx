import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SideNav } from "../components/SideNav";
import { MobileNav } from "../components/MobileNav";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "BTB TRADING",
  description: "A clearer way to trade crypto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body">
        <div className="flex min-h-screen">
          <SideNav />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
