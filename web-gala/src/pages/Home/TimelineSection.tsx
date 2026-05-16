import { motion } from "framer-motion";
import { useState } from "react";
import { galaContent } from "@/config/galaContent";

export default function TimelineSection() {
  const { title, phases } = galaContent.timeline;
  const [selectedPhase, setSelectedPhase] = useState(phases[0].id);

  const currentPhaseData = phases.find((p) => p.id === selectedPhase);

  const phaseLabels: Record<string, string> = {
    registration: "Inscrições",
    nominees: "Nomeação",
  };

  return (
    <section
      id="timeline"
      className="relative flex flex-col items-center justify-center px-4 py-32 backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-24 text-center"
        >
          <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
            A Jornada
          </span>
          <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
            {title}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[350px_1fr] lg:gap-24">
          {/* Vertical Timeline Navigation */}
          <div className="relative flex flex-col space-y-4">
            {phases.map((phase, idx) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => setSelectedPhase(phase.id)}
                className={`group relative overflow-hidden border p-6 text-left transition-all duration-500 ${
                  selectedPhase === phase.id
                    ? "border-light-gold bg-light-gold/10 shadow-[0_10px_30px_rgba(212,175,55,0.1)]"
                    : "border-white/5 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div className="relative z-10 flex items-center gap-6">
                  <span
                    className={`font-gala text-4xl font-black italic transition-colors duration-500 ${
                      selectedPhase === phase.id
                        ? "text-light-gold"
                        : "text-white/10"
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span
                      className={`font-gala text-[0.65rem] font-bold uppercase tracking-widest ${
                        selectedPhase === phase.id
                          ? "text-light-gold/80"
                          : "text-white/30"
                      }`}
                    >
                      {phaseLabels[phase.id] || "Votação"}
                    </span>
                    <span
                      className={`mt-1 font-gala text-lg font-bold transition-colors duration-500 ${
                        selectedPhase === phase.id
                          ? "text-white"
                          : "text-white/50"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                </div>

                {selectedPhase === phase.id && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 top-0 h-full w-1 bg-light-gold"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Phase Content Display - High Focus on Image */}
          <div className="relative min-h-[500px]">
            <motion.div
              key={selectedPhase}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-10"
            >
              {/* Main Prominent Image */}
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl border border-light-gold/20 shadow-2xl lg:aspect-[16/7]">
                <img
                  src={currentPhaseData?.images[0]}
                  alt={currentPhaseData?.label}
                  className="h-full w-full object-cover transition-transform duration-[2000ms] hover:scale-105"
                />

                {/* Image Overlay/Label */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute bottom-10 left-10 right-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <h3 className="font-gala text-4xl font-black text-white sm:text-5xl">
                      {currentPhaseData?.label}
                    </h3>
                    <p className="mt-4 max-w-2xl font-gala text-lg leading-relaxed text-white/70">
                      {currentPhaseData?.description}
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
