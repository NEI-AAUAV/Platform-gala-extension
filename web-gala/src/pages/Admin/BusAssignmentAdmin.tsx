import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBus, faMagicWandSparkles } from "@fortawesome/free-solid-svg-icons";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import useUsers from "@/hooks/userHooks/useUsers";
import GalaService from "@/services/GalaService";

const INPUT_CLS =
  "rounded-lg border border-white/15 bg-[#2a4845] px-3 py-2 text-sm text-white placeholder:text-white/30 caret-white outline-none transition focus:border-light-gold/50";

export default function BusAssignmentAdmin() {
  const { config } = useHomepageConfig();
  const { users, mutate } = useUsers();
  const [autoStrategy, setAutoStrategy] = useState<"year" | "order">("year");
  const [assigning, setAssigning] = useState(false);
  const [saved, setSaved] = useState(false);

  const { buses } = config.bus_schedule;
  const registeredWithBus = users.filter(
    (u) => u.is_registered && u.bus_option !== "NONE",
  );

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAssign = async (userId: number, busId: string | null) => {
    await GalaService.homepage.assignBus(userId, busId);
    mutate();
    flash();
  };

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      await GalaService.homepage.autoAssignBuses(autoStrategy);
      mutate();
      flash();
    } finally {
      setAssigning(false);
    }
  };

  if (buses.length === 0) {
    return (
      <div className="bg-white/3 border border-light-gold/20 px-5 py-8 text-center">
        <FontAwesomeIcon icon={faBus} className="text-white/15 mb-3 text-3xl" />
        <p className="font-gala text-sm text-white/40">
          Configura primeiro os autocarros na tab{" "}
          <span className="text-white/60">Homepage</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/40">
          {registeredWithBus.length} pessoa
          {registeredWithBus.length === 1 ? "" : "s"} com autocarro
        </p>
        {saved && (
          <span className="text-xs font-semibold text-dark-gold/80">
            ✓ Guardado
          </span>
        )}
      </div>

      <div className="bg-white/3 flex flex-wrap items-center gap-3 border border-light-gold/20 p-4">
        <span className="font-gala text-xs font-semibold uppercase tracking-widest text-white/40">
          Auto-distribuir por
        </span>
        {(["year", "order"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setAutoStrategy(s)}
            className={[
              "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
              autoStrategy === s
                ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                : "border-light-gold/20 text-white/40 hover:border-white/25 hover:text-white/60",
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
          <FontAwesomeIcon
            icon={faMagicWandSparkles}
            className="text-[0.6rem]"
          />
          {assigning ? "A distribuir..." : "Distribuir automaticamente"}
        </button>
      </div>

      <div className="overflow-x-auto border border-light-gold/20">
        <table className="w-full text-left">
          <thead>
            <tr className="border-light-gold/15 border-b">
              <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                Nome
              </th>
              <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                Nmec
              </th>
              <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                Ano
              </th>
              <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                Opção
              </th>
              <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                Autocarro
              </th>
            </tr>
          </thead>
          <tbody>
            {registeredWithBus.map((user) => (
              <tr
                key={user._id}
                className="border-white/4 hover:bg-white/2 border-b transition"
              >
                <td className="px-4 py-3 font-gala text-sm text-white/75">
                  {user.name}
                </td>
                <td className="text-white/45 px-4 py-3 font-gala text-xs">
                  {user.nmec}
                </td>
                <td className="text-white/45 px-4 py-3 font-gala text-xs">
                  {user.matriculation ? `${user.matriculation}º` : "Alumni"}
                </td>
                <td className="text-white/45 px-4 py-3 font-gala text-xs">
                  {user.bus_option === "ROUND_TRIP" ? "Ida e volta" : "Só ida"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.bus_assignment ?? ""}
                    onChange={(e) =>
                      handleAssign(user._id, e.target.value || null)
                    }
                    className={`${INPUT_CLS} py-1 text-xs`}
                  >
                    <option value="">Não atribuído</option>
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {registeredWithBus.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-white/30">
            Nenhuma pessoa inscrita com autocarro.
          </p>
        )}
      </div>
    </div>
  );
}
