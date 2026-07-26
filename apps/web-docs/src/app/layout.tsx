import type { Metadata } from "next";
import { Inter, Figtree } from "next/font/google";

import { Provider } from "@/components/provider";

import "./global.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  description:
    "Render the TSX you already wrote into App Store screenshots, launch cards, and Open Graph images. One CLI command, no Figma, no drift.",
  title: "stdout-design — your components already are your marketing assets",
};

const figtreeHeading = Figtree({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(inter.className, figtreeHeading.variable, "h-full")}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
