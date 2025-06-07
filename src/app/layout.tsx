import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { TempoInit } from "@/components/tempo-init";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNav } from "@/components/top-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Sheet | Ganpathi Overseas",
  description: "Job Sheet Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script src="https://api.tempolabs.ai/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col h-screen bg-white">
            {/* Top Navigation */}
            <TopNav />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-white p-4 lg:p-6">
              <div className="w-full max-w-7xl mx-auto">{children}</div>
            </main>
          </div>
        </ThemeProvider>
        <TempoInit />
      </body>
    </html>
  );
}
