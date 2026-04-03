import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import TimelineSection from "./TimelineSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative w-full overflow-hidden bg-[#050505]">
      {/* Background with Original NEI Map */}
      <div className="fixed inset-0 z-0 h-screen w-screen pointer-events-none overflow-hidden">
        <img 
          src="/gala/map-black.png" 
          alt="NEI Map Background" 
          className="h-full w-full object-cover object-center opacity-[0.07] scale-110 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]" />
      </div>


      <HeroSection />
      <AboutSection />
      <TimelineSection />
      <Footer />
    </main>
  );
}





