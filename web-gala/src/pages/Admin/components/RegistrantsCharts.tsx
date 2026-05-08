import { MiniBar } from "./StatsComponents";
import { RegistrantsStats } from "@/utils/registrantsStats";

const BUS_LABEL: Record<string, string> = {
  ROUND_TRIP: "Ida e volta",
  ONE_WAY: "Só ida",
  NONE: "Sem autocarro",
};

export default function RegistrantsCharts({
  stats,
}: Readonly<{ stats: RegistrantsStats }>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="border-white/8 bg-white/3 rounded-xl border p-4">
        <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
          Por ano
        </p>
        <div className="flex flex-col gap-2">
          {Object.entries(stats.byYear)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([yr, n]) => (
              <MiniBar
                key={yr}
                label={yr}
                value={n}
                max={stats.total}
                color="bg-dark-gold/60"
              />
            ))}
        </div>
      </div>
      <div className="border-white/8 bg-white/3 rounded-xl border p-4">
        <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
          Por prato
        </p>
        <div className="flex flex-col gap-2">
          {Object.entries(stats.byMeal).map(([meal, n]) => (
            <MiniBar
              key={meal}
              label={meal}
              value={n}
              max={stats.total}
              color="bg-light-gold/50"
            />
          ))}
        </div>
      </div>
      <div className="border-white/8 bg-white/3 rounded-xl border p-4">
        <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
          Transporte
        </p>
        <div className="flex flex-col gap-2">
          {Object.entries(stats.byBusOption).map(([opt, n]) => (
            <MiniBar
              key={opt}
              label={BUS_LABEL[opt] ?? opt}
              value={n}
              max={stats.total}
              color="bg-blue-400/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
