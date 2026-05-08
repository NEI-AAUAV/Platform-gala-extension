import HeroSection from "./HeroSection";
import NominationsSection from "./NominationsSection";
import PaymentInfoSection from "./PaymentInfoSection";
import DJSection from "./DJSection";
import PhotoGallerySection from "./PhotoGallerySection";
import BusSection from "./BusSection";
import AfterPartySection from "./AfterPartySection";
import TriangleBackground from "@/components/TriangleBackground";
import Footer from "@/components/Footer";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";

export default function Home() {
  const { config: homepage } = useHomepageConfig();
  const { config: registration } = useRegistrationConfig();

  return (
    <main className="relative w-full overflow-hidden">
      <TriangleBackground />
      <HeroSection />
      <NominationsSection nominationsConfig={homepage.nominations_display} />
      <PaymentInfoSection
        paymentInfoConfig={homepage.payment_info}
        registrationConfig={registration}
      />
      <DJSection djConfig={homepage.dj} />
      <PhotoGallerySection galleryConfig={homepage.gallery} />
      <BusSection busConfig={homepage.bus_schedule} />
      <AfterPartySection afterPartyConfig={homepage.after_party} />
      <Footer />
    </main>
  );
}
