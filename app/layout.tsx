import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/jetbrains-mono";

import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {
    template: "%s | D-Rec",
    default: "D-Rec - Academic Platform for Structured Learning",
  },
  description:
    "Build, code, compile, and record. The modern platform for digital record books and academic program submissions.",
  openGraph: {
    title: "D-Rec - Academic Platform",
    description:
      "Build, code, compile, and record. The modern platform for digital record books and academic program submissions.",
    url: "https://record.jenin.dev",
    siteName: "D-Rec",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "D-Rec - Academic Platform",
    description:
      "The modern platform for digital record books and academic program submissions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="flex min-h-screen flex-col antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <Providers>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
