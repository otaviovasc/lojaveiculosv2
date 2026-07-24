import { HeroSection } from "./LandingHero";
import {
  FeatureSection,
  FinalCta,
  LandingFooter,
  OutcomeStrip,
  ProblemSection,
  WorkflowSection,
} from "./LandingPageParts";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-primary text-white">
      <HeroSection />
      <OutcomeStrip />
      <ProblemSection />
      <WorkflowSection />
      <FeatureSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
