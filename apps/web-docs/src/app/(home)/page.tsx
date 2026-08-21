import type { Metadata } from "next";

import { CtaFooter } from "@/components/marketing/cta-footer";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { Hero } from "@/components/marketing/hero";
import { InterfaceShowcase } from "@/components/marketing/interface-showcase";
import { LogosStrip } from "@/components/marketing/logos-strip";
// import { OutputGallery } from "@/components/marketing/output-gallery";
import { PipelineShowcase } from "@/components/marketing/pipeline-showcase";
import { appName } from "@/lib/shared";

export const metadata: Metadata = {
  title: `${appName} — TSX to pixels, from your repo`,
  description:
    "Render the TSX you already wrote into App Store screenshots, launch cards, and Open Graph images. One CLI command, no Figma, no drift.",
  openGraph: {
    images: "/og/home/image.webp",
  },
  twitter: {
    card: "summary_large_image",
    images: "/og/home/image.webp",
  },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <LogosStrip />
      <PipelineShowcase />
      {/* <OutputGallery /> */}
      <FeaturesGrid />
      <InterfaceShowcase />
      <CtaFooter />
    </main>
  );
}
