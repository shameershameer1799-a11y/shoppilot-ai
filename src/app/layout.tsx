import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-ibm-plex-mono", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "ShopPilot AI — Your AI Co-Pilot for Smarter Commerce",
  description: "AI shopping agent for customers. AI growth assistant for businesses. One commerce platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
