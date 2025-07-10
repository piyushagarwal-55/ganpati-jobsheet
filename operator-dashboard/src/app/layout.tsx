import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ganpati Overseas - Operator Dashboard",
  description:
    "Real-time operator dashboard for machine job management and notifications",
  keywords: [
    "operator",
    "dashboard",
    "manufacturing",
    "job-management",
    "ganpati-overseas",
  ],
  authors: [{ name: "Ganpati Overseas" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen bg-background">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
