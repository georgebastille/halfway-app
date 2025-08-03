'use client';

import { useState } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import Sidebar from "./components/Sidebar";
import { Bars3Icon } from '@heroicons/react/24/outline';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1">
            <div className="md:hidden p-4">
              <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
            {children}
          </main>
        </div>
		<Analytics />
      </body>
    </html>
  );
}
