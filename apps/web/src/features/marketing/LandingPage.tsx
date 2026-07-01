import {
  FeatureSection,
  FinalCta,
  HeroSection,
  OutcomeStrip,
  WorkflowSection,
} from "./LandingPageParts";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-primary text-white">
      <HeroSection />
      <OutcomeStrip />
      <WorkflowSection />
      <FeatureSection />
      <FinalCta />
    </main>
  );
}
