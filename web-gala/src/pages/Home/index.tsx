import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import TimelineSection from "./TimelineSection";
import TriangleBackground from "@/components/TriangleBackground";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative w-full overflow-hidden">
      <TriangleBackground />
      <HeroSection />
      <AboutSection />
      <TimelineSection />
      <Footer />
    </main>
  );
}





