import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TriangleBackground from "@/components/TriangleBackground";

export default function Layout() {
  return (
    <div
      className="text-base-content/70 relative min-h-screen overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% 0%, #1f4030 0%, #0e2a1e 100%)",
      }}
    >
      <TriangleBackground />
      <Navbar />
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
