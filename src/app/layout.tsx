import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const description: string = "Production-grade Next.js 16 support desk: role-based access control, finite-state ticket workflow, cursor-based pagination, and cross-tenant isolation enforced at every database query.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Awano — Multi-tenant Support Desk",
  description,
  openGraph: {
    title: "Awano — Multi-tenant Support Desk",
    description,
    url: "https://awano.chairulakmal.com",
    siteName: "Awano",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Awano — Multi-tenant Support Desk",
    description
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the theme cookie server-side so the correct scheme is in the initial
  // HTML — no flash. Absent, `:root` follows the OS via `color-scheme`.
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
