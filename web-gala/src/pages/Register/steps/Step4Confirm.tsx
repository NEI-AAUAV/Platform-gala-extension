import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faUser } from "@fortawesome/free-solid-svg-icons";
import { WizardData } from "@/hooks/useWizardState";
import { RegistrationConfig } from "@/config/registrationConfig";
import { useUserStore } from "@/stores/useUserStore";
import useSessionUser from "@/hooks/userHooks/useSessionUser";

interface Props {
  config: RegistrationConfig;
  data: WizardData;
  onBack: () => void;
  onFinish: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/6 py-2.5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-right text-xs font-semibold text-white/75">{value}</span>
    </div>
  );
}

export default function Step4Confirm({ config, data, onBack, onFinish }: Props) {
  const { name, surname, email } = useUserStore();
  const { sessionUser } = useSessionUser();

  const mealLabel = config.mealOptions.find((m) => m.id === data.meal)?.label ?? "—";
  const yearLabel = sessionUser?.matriculation
    ? `${sessionUser.matriculation}º Ano`
    : data.year
    ? `${data.year}º Ano`
    : "Alumni / Outro";
  const busLabel = data.bus === "round_trip" ? "Autocarro (Ida e Volta)" : "Deslocação própria";

  const totalPersons = 1 + data.companions.length;
  const busExtra = data.bus === "round_trip" ? config.busRoundTripPrice : 0;
  const totalPrice = totalPersons * (config.eventPrice + busExtra);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Dados Pessoais
          </h3>
          <div className="rounded-xl border border-white/8 bg-white/4 px-5 py-2">
            <SummaryRow label="Nome" value={[name, surname].filter(Boolean).join(" ") || "—"} />
            <SummaryRow label="Email" value={email || "—"} />
            <SummaryRow label="Nº Mecanográfico" value={String((sessionUser?.nmec ?? data.nmec) || "—")} />
            <SummaryRow label="Ano" value={yearLabel} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Logística
          </h3>
          <div className="rounded-xl border border-white/8 bg-white/4 px-5 py-2">
            {config.busEnabled && <SummaryRow label="Transporte" value={busLabel} />}
            <SummaryRow label="Prato" value={mealLabel} />
            <SummaryRow label="Alergias" value={data.allergies.trim() || "Nenhuma"} />
          </div>
        </div>
      </div>

      {data.companions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Acompanhantes ({data.companions.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.companions.map((c, i) => {
              const meal = config.mealOptions.find((m) => m.id === c.meal)?.label ?? "—";
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/6">
                    <FontAwesomeIcon icon={faUser} className="text-xs text-white/30" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-white/75">{c.name}</p>
                    <p className="text-xs text-white/40">{meal}</p>
                    {c.allergies && <p className="text-xs text-white/30">{c.allergies}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-light-gold/20 bg-light-gold/6 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircleCheck} className="text-light-gold/60" />
            <div>
              <p className="text-sm font-semibold text-light-gold/80">Total a pagar</p>
              <p className="text-xs text-white/40">
                {totalPersons} pessoa{totalPersons > 1 ? "s" : ""} × {config.eventPrice + busExtra}€
              </p>
            </div>
          </div>
          <p className="font-gala text-2xl font-bold text-light-gold">{totalPrice}€</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          O pagamento e a escolha de mesa podem ser feitos após a inscrição, no teu{" "}
          <span className="text-white/60">perfil</span>. Tens{" "}
          <span className="font-semibold text-white/70">{config.paymentDeadlineHours}h</span> para
          efetuar o pagamento.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="border border-white/15 px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          onClick={onFinish}
          className="border border-light-gold/60 bg-gradient-to-r from-dark-gold/80 to-light-gold/80 px-10 py-3 font-gala text-sm font-bold text-black transition-all hover:from-dark-gold hover:to-light-gold"
        >
          ✓ Confirmar Inscrição
        </button>
      </div>
    </motion.div>
  );
}
