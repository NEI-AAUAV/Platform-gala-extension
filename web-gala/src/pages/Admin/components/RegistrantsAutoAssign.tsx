import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagicWandSparkles } from "@fortawesome/free-solid-svg-icons";

interface RegistrantsAutoAssignProps {
  busesLength: number;
  autoStrategy: "year" | "order";
  setAutoStrategy: (s: "year" | "order") => void;
  assigning: boolean;
  handleAutoAssign: () => void;
}

export default function RegistrantsAutoAssign({
  busesLength, autoStrategy, setAutoStrategy, assigning, handleAutoAssign
}: Readonly<RegistrantsAutoAssignProps>) {
  if (busesLength === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
      <span className="text-xs font-semibold text-white/40">Auto-distribuir autocarros por</span>
      {(["year", "order"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setAutoStrategy(s)}
          className={[
            "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
            autoStrategy === s
              ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
              : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
          ].join(" ")}
        >
          {s === "year" ? "Ano de matrícula" : "Ordem de inscrição"}
        </button>
      ))}
      <button
        type="button"
        onClick={handleAutoAssign}
        disabled={assigning}
        className="ml-auto flex items-center gap-2 rounded-full border border-dark-gold/50 bg-dark-gold/10 px-4 py-1.5 text-xs font-bold text-dark-gold transition hover:bg-dark-gold/20 disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faMagicWandSparkles} />
        {assigning ? "A distribuir..." : "Distribuir automaticamente"}
      </button>
    </div>
  );
}
