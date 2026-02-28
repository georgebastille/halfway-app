import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Analytics } from "@vercel/analytics/next";
import Sidebar from "./components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const titleDefault = "Halfway – Find the fairest place to meet by train";
const descriptionDefault =
  "Enter everyone's starting station and Halfway finds the fairest meeting point on the UK rail and tube network – covering TfL, National Rail and more.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: titleDefault,
    template: "%s | Halfway",
  },
  description: descriptionDefault,
  openGraph: {
    title: titleDefault,
    description: descriptionDefault,
    type: "website",
    locale: "en_GB",
    siteName: "Halfway",
  },
  twitter: {
    card: "summary",
    title: titleDefault,
    description: descriptionDefault,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
