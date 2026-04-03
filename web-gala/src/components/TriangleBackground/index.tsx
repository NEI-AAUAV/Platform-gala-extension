import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import { motion } from "framer-motion";

const particlesConfig = {
  fullScreen: { enable: false },
  interactivity: {
    detectsOn: "window" as const,
    events: {
      onHover: { enable: true, mode: "repulse" as const },
    },
    modes: {
      repulse: { distance: 80, duration: 0.4 },
    },
  },
  particles: {
    color: { value: ["#F7BBAC", "#C58676"] },
    move: {
      enable: true,
      outModes: { default: "out" as const },
      speed: 1.2,
    },
    number: {
      density: { enable: true, width: 1200, height: 1200 },
      value: 60,
    },
    opacity: {
      value: { min: 0.03, max: 0.1 },
      animation: { enable: true, speed: 0.5, sync: false },
    },
    shape: { type: "triangle" },
    size: { value: { min: 2, max: 6 } },
    rotate: {
      value: { min: 0, max: 360 },
      animation: { enable: true, speed: 3, sync: false },
    },
  },
};

export default function TriangleBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="gala-blur absolute"
        style={{
          left: "8%",
          top: "-15%",
          background: "linear-gradient(135deg, rgba(247,187,172,0.12), rgba(197,134,118,0.08))",
        }}
      />
      <div
        className="gala-blur absolute"
        style={{
          right: "-8%",
          top: "45%",
          background: "linear-gradient(135deg, rgba(197,134,118,0.10), rgba(247,187,172,0.06))",
        }}
      />
      <div
        className="gala-blur absolute"
        style={{
          left: "35%",
          bottom: "-10%",
          background: "linear-gradient(135deg, rgba(247,187,172,0.08), rgba(197,134,118,0.04))",
        }}
      />

      {ready && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <Particles className="absolute h-full w-full" options={particlesConfig} />
        </motion.div>
      )}
    </div>
  );
}
