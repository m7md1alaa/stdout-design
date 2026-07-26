import { CtaFooter } from "@/components/marketing/cta-footer";
import { GapSection } from "@/components/marketing/gap-section";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { InterfaceParity } from "@/components/marketing/interface-parity";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <GapSection />
      <HowItWorks />
      <InterfaceParity />
      <CtaFooter />
    </main>
  );
}
