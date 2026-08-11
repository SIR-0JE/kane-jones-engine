import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depot Sales Intelligence Engine",
  description: "Pricing audits, margin leaks, volume tier validation, and period comparisons for beverage depots.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <div className="w-full min-h-screen flex flex-col bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
