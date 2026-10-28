import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Agripredict · Your growing companion",
  description:
    "A climate-risk companion for Moroccan farmers. Local weather, transparent crop risk screening, and evidence-grounded advice.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      dir="ltr"
      lang="en"
      suppressHydrationWarning
      className={cn(
        outfit.variable,
        "h-full scroll-smooth font-sans antialiased",
      )}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider forcedTheme="light">{children}</ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
