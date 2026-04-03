import { motion } from "framer-motion";

const STEPS = [
  { n: 1, label: "Evento" },
  { n: 2, label: "Dados" },
  { n: 3, label: "Logística" },
  { n: 4, label: "Confirmação" },
];

interface StepIndicatorProps {
  current: number;
  onStepClick: (step: number) => void;
  maxReached: number;
}

export default function StepIndicator({ current, onStepClick, maxReached }: StepIndicatorProps) {
  return (
    <nav className="relative flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = step.n < current;
        const isActive = step.n === current;
        const isClickable = step.n <= maxReached;

        return (
          <div key={step.n} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.n)}
              disabled={!isClickable}
              className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
              title={step.label}
            >
              <div className="relative flex h-8 w-8 items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="active-step"
                    className="absolute inset-0 rounded-full border border-light-gold/60 bg-light-gold/15"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={[
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isDone
                      ? "bg-dark-gold/80 text-white/90"
                      : isActive
                      ? "text-light-gold"
                      : "text-white/25",
                  ].join(" ")}
                >
                  {isDone ? "✓" : step.n}
                </span>
              </div>
              <span
                className={[
                  "hidden text-[0.6rem] font-semibold uppercase tracking-widest transition-colors sm:block",
                  isActive ? "text-light-gold" : isDone ? "text-dark-gold/70" : "text-white/20",
                ].join(" ")}
              >
                {step.label}
              </span>
            </button>

            {i < STEPS.length - 1 && (
              <div className="mx-1 mt-[-0.75rem] h-px w-10 sm:w-16 md:w-24 lg:w-32">
                <div
                  className={[
                    "h-full transition-colors duration-500",
                    isDone ? "bg-dark-gold/50" : "bg-white/10",
                  ].join(" ")}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
