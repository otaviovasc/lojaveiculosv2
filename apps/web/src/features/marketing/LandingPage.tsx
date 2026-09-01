import { HeroSection } from "./LandingHero";
import { IntegrationsSection } from "./LandingIntegrations";
import { ProductSection } from "./LandingProduct";
import {
  FeatureSection,
  FinalCta,
  LandingFooter,
  MetricsSection,
  ProblemSection,
  TestimonialsSection,
  WorkflowSection,
} from "./LandingPageParts";

export function LandingPage() {
  return (
    <main className="landing-page min-h-screen bg-app font-sans text-app-text antialiased">
      <HeroSection />
      <IntegrationsSection />
      <MetricsSection />
      <ProblemSection />
      <WorkflowSection />
      <ProductSection />
      <FeatureSection />
      <TestimonialsSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
