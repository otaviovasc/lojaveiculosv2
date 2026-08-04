import { HeroSection } from "./LandingHero";
import { ProductSection } from "./LandingProduct";
import { ClerkAuthProvider } from "../account/ClerkAuthProvider";
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
    <ClerkAuthProvider>
      <main className="landing-page min-h-screen bg-app font-sans text-app-text antialiased">
        <HeroSection />
        <MetricsSection />
        <ProblemSection />
        <WorkflowSection />
        <ProductSection />
        <FeatureSection />
        <TestimonialsSection />
        <FinalCta />
        <LandingFooter />
      </main>
    </ClerkAuthProvider>
  );
}
