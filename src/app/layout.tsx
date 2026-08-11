import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800", "900"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Macunköy Fantazi Ligi",
    template: "%s · Macunköy FL",
  },
  description:
    "Her Salı 23:00'te kilitlenir, 23:01'de anket atılır. 37 kişilik havuzdan 7 kişi seç, 85 birimi doğru harca.",
  applicationName: "Macunköy FL",
  appleWebApp: { capable: true, title: "Macunköy FL", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#04140c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
