import { CtaFooter } from "@/components/marketing/cta-footer";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { Hero } from "@/components/marketing/hero";
import { InterfaceShowcase } from "@/components/marketing/interface-showcase";
import { LogosStrip } from "@/components/marketing/logos-strip";
import { PipelineShowcase } from "@/components/marketing/pipeline-showcase";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <LogosStrip />
      {/* Pipeline diagram — visually explains the render flow */}
      <PipelineShowcase />
      <FeaturesGrid />
      <InterfaceShowcase />
      <CtaFooter />
    </main>
  );
}
