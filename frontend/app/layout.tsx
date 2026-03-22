import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship Cloud ERP for Colleges",
  description:
    "Production-ready multi-tenant internship SaaS for colleges with free industry participation, semester lifecycle billing, archive retention, and mobile-first PWA delivery.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Internship Cloud ERP",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
