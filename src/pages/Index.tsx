import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SolutionsSection from "@/components/SolutionsSection";
import Footer from "@/components/Footer";

const EarthScene = lazy(() => import("@/components/EarthScene"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* Hero with 3D Earth */}
      <div className="relative">
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <EarthScene />
        </Suspense>
        <HeroSection />
      </div>

      <SolutionsSection />
      <Footer />
    </div>
  );
};

export default Index;
