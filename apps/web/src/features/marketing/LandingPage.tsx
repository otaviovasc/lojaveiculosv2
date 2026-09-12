import "../../styles/marketing.css";

import { HeroSection } from "./LandingHero";
import { IntegrationsSection } from "./LandingIntegrations";
import { RacingStripeDivider } from "./LandingMemphisGraphics";
import { LandingNav } from "./LandingNav";
import {
  FeatureSection,
  FinalCta,
  LandingFooter,
  MetricsSection,
  TestimonialsSection,
} from "./LandingPageParts";

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-app font-sans text-app-text antialiased transition-colors duration-200">
      <LandingNav />
      <HeroSection />
      <RacingStripeDivider />
      <IntegrationsSection />
      <MetricsSection />
      <RacingStripeDivider />
      <FeatureSection />
      <TestimonialsSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
