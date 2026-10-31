import LandingHeader from '../components/landing/LandingHeader';
import LandingHero from '../components/landing/LandingHero';
import StorySection from '../components/landing/StorySection';
import LedgerSection from '../components/landing/LedgerSection';
import SpatialProductMoment from '../components/landing/SpatialProductMoment';
import TwoDoorsSection from '../components/landing/TwoDoorsSection';
import TrustSection from '../components/landing/TrustSection';
import ClosingSection from '../components/landing/ClosingSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text selection:bg-accent/25 selection:text-text">
      {/* Editorial Landing Top Bar */}
      <LandingHeader />

      {/* 1. Hero with huge serif text, live figure count-up, drawing forecast band */}
      <LandingHero />

      {/* 2. The problem, told as a short story (scroll-driven timeline & rupee amount lost) */}
      <StorySection />

      {/* 3. What it does, as a ledger with hover spatial previews */}
      <LedgerSection />

      {/* 4. Spatial product moment (3 z-levels, -2deg tilt straightening on scroll) */}
      <SpatialProductMoment />

      {/* 5. Two doors ("I export" / "I import" expanding on hover) */}
      <TwoDoorsSection />

      {/* 6. Cryptographic trust without badges (real SHA-256 verifying with pathLength check) */}
      <TrustSection />

      {/* 7. Closing with huge serif line and minimal footer */}
      <ClosingSection />
    </div>
  );
}
