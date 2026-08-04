import { CtaFooter } from "@/components/marketing/cta-footer";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { Hero } from "@/components/marketing/hero";
import { InterfaceShowcase } from "@/components/marketing/interface-showcase";
import { LogosStrip } from "@/components/marketing/logos-strip";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <LogosStrip />
      <FeaturesGrid />
      <InterfaceShowcase />
      <CtaFooter />
    </main>
  );
}
