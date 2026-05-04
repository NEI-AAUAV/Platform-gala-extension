import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faUser, faChair } from "@fortawesome/free-solid-svg-icons";
import { WizardData } from "@/hooks/useWizardState";
import { RegistrationConfig } from "@/config/registrationConfig";
import { useUserStore } from "@/stores/useUserStore";
import useSessionUser from "@/hooks/userHooks/useSessionUser";
import useTables from "@/hooks/tableHooks/useTables";

interface Props {
  readonly config: RegistrationConfig;
  readonly data: WizardData;
  readonly onBack: () => void;
  readonly onFinish: () => void;
  readonly syncing?: boolean;
}

function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/6 py-2.5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-right text-xs font-semibold text-white/75">{value}</span>
    </div>
  );
}

export default function Step6Confirm({ config, data, onBack, onFinish, syncing = false }: Props) {
  const { name, surname, email } = useUserStore();
  const { sessionUser } = useSessionUser();
  const { tables } = useTables();

  const mealLabel = config.mealOptions.find((m) => m.id === data.meal)?.label ?? "—";

  let yearLabel = "Alumni / Outro";
  if (sessionUser?.matriculation) {
    yearLabel = `${sessionUser.matriculation}º Ano`;
  } else if (data.year) {
    yearLabel = `${data.year}º Ano`;
  }

  let busLabel = "Autocarro (Apenas Ida)";
  if (data.bus === "none") {
    busLabel = "Deslocação própria";
  } else if (data.bus === "round_trip") {
    busLabel = "Autocarro (Ida e Volta)";
  }

  let selectedTable = `Mesa #${data.tableId}`;
  if (data.tableId === "new") {
    selectedTable = "Nova Mesa (A criar)";
  } else {
    const tableObj = tables?.find((t) => String(t._id) === data.tableId);
    if (tableObj?.name) {
      selectedTable = tableObj.name;
    }
  }

  // Use user's actual choice (data.phasedPayment), not admin config
  const userChosePhased = config.phasedPaymentEnabled && data.phasedPayment;

  const totalPersons = 1 + data.companions.length;
  const pricePerPerson = userChosePhased
    ? config.phase1Price + config.phase2Price
    : config.eventPrice;
  const totalPrice = totalPersons * pricePerPerson;

  const renderCompanionsSummary = () => {
    if (data.companions.length === 0) return null;
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          Acompanhantes ({data.companions.length})
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.companions.map((c, i) => {
            const meal = config.mealOptions.find((m) => m.id === c.meal)?.label ?? "—";
            return (
              <div key={`${c.name}-${i}`} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 p-4">
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
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Details Summary */}
        <div className="flex flex-col gap-3">
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

        {/* Logistics Summary */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Logística
          </h3>
          <div className="rounded-xl border border-white/8 bg-white/4 px-5 py-2">
            {config.busEnabled && <SummaryRow label="Transporte" value={busLabel} />}
            <SummaryRow label="Prato" value={mealLabel} />
            <SummaryRow label="Alergias" value={data.allergies.trim() || "Nenhuma"} />
          </div>
        </div>

        {/* Payment Summary */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Pagamento
          </h3>
          <div className="rounded-xl border border-white/8 bg-white/4 px-5 py-2">
            <div className="flex items-center justify-between py-2.5 border-b border-white/6">
              <span className="text-xs text-white/40">
                {userChosePhased ? `Fase 1 (${config.phase1Price}€)` : `Pagamento (${config.eventPrice}€)`}
              </span>
              {data.paymentProofPhase1 ? (
                <span className="text-[0.6rem] font-bold text-green-400 uppercase tracking-tighter">✓ COMPROVATIVO</span>
              ) : (
                <span className="text-xs text-red-400">Pendente</span>
              )}
            </div>
            {userChosePhased && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-white/40">Fase 2 ({config.phase2Price}€)</span>
                {data.paymentProofPhase2 ? (
                   <span className="text-[0.6rem] font-bold text-green-400 uppercase tracking-tighter">✓ COMPROVATIVO</span>
                ) : (
                  <span className="text-xs text-red-400">Pendente</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table Summary */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Mesa Selecionada
          </h3>
          <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-4">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light-gold/10 text-light-gold">
               <FontAwesomeIcon icon={faChair} />
             </div>
             <div>
               <p className="text-sm font-bold text-white/80">{selectedTable}</p>
               <p className="text-[0.65rem] text-white/40">{data.tableRole === "owner" ? "Head de Mesa" : "Membro"}</p>
             </div>
          </div>
        </div>
      </div>

      {renderCompanionsSummary()}

      {/* Final Total Summary */}
      <div className="rounded-xl border border-light-gold/20 bg-light-gold/6 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircleCheck} className="text-light-gold/60" />
            <div>
              <p className="text-sm font-semibold text-light-gold/80">Total Pago</p>
              <p className="text-xs text-white/40">
                {totalPersons} pessoa{totalPersons > 1 ? "s" : ""} × {pricePerPerson}€
              </p>
            </div>
          </div>
          <p className="font-gala text-2xl font-bold text-light-gold">{totalPrice}€</p>
        </div>
        <p className="mt-3 text-[0.65rem] leading-relaxed text-white/45 italic">
          Ao confirmares a inscrição, os teus dados serão registados permanentemente e o teu lugar na mesa ficará reservado.
        </p>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onBack}
          className="border border-white/15 px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          onClick={onFinish}
          disabled={syncing}
          className="flex items-center gap-2 border border-light-gold/60 bg-gradient-to-r from-dark-gold/80 to-light-gold/80 px-10 py-3 font-gala text-sm font-bold text-black transition-all hover:from-dark-gold hover:to-light-gold disabled:opacity-60"
        >
          {syncing ? "A guardar..." : "✓ Concluir Inscrição"}
        </button>
      </div>
    </motion.div>
  );
}
