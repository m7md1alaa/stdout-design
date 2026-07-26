import type { Metadata } from "next";
import { Inter, Figtree } from "next/font/google";

import { Provider } from "@/components/provider";

import "./global.css";
import { hero } from "@/lib/marketing-copy";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  description: hero.subhead,
  title: hero.headline,
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icon-512.png",
  },
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
