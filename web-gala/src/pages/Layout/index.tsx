import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TriangleBackground from "@/components/TriangleBackground";

export default function Layout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-base-content/70">
      <TriangleBackground />
      <Navbar />
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
