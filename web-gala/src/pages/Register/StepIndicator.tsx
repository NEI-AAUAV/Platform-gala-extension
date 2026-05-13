import { motion } from "framer-motion";

const STEPS = [
  { n: 1, label: "Evento" },
  { n: 2, label: "Dados" },
  { n: 3, label: "Logística" },
  { n: 4, label: "Pagamento" },
  { n: 5, label: "Mesa" },
  { n: 6, label: "Confirmação" },
];

interface StepIndicatorProps {
  readonly current: number;
  readonly onStepClick: (step: number) => void;
  readonly maxReached: number;
}

export default function StepIndicator({
  current,
  onStepClick,
  maxReached,
}: Readonly<StepIndicatorProps>) {
  return (
    <nav
      className="relative flex items-center justify-center gap-0"
      aria-label="Passos da inscrição"
    >
      {STEPS.map((step, i) => {
        const isDone = step.n < current;
        const isActive = step.n === current;
        const isClickable = step.n <= maxReached;

        return (
          <div key={step.n} className="flex items-center">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.n)}
              disabled={!isClickable}
              className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
              aria-current={isActive ? "step" : undefined}
              title={step.label}
            >
              <div className="relative flex h-8 w-8 items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="active-step"
                    className="bg-light-gold/15 absolute inset-0 rounded-full border border-light-gold/60"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={[
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    (() => {
                      if (isDone) return "bg-dark-gold/80 text-white/90";
                      if (isActive) return "text-light-gold";
                      return "text-white/25";
                    })(),
                  ].join(" ")}
                >
                  {isDone ? "✓" : step.n}
                </span>
              </div>
              {/* Label - hidden on mobile for steps 3+ to avoid overflow */}
              <span
                className={[
                  "text-[0.6rem] font-semibold uppercase tracking-widest transition-colors",
                  // On very small screens, only show label for active step
                  isActive ? "block" : "hidden sm:block",
                  (() => {
                    if (isActive) return "text-light-gold";
                    if (isDone) return "text-dark-gold/70";
                    return "text-white/20";
                  })(),
                ].join(" ")}
              >
                {step.label}
              </span>
            </button>

            {i < STEPS.length - 1 && (
              <div className="mx-0.5 mb-4 h-px w-6 sm:w-10 md:w-14 lg:w-20">
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
