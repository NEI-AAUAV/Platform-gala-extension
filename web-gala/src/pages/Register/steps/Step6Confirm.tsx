import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faUser,
  faChair,
} from "@fortawesome/free-solid-svg-icons";
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

function SummaryRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-light-gold/15 flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-right text-xs font-semibold text-white/75">
        {value}
      </span>
    </div>
  );
}

const getYearLabel = (sessionUser: any, data: WizardData) => {
  if (sessionUser?.matriculation) return `${sessionUser.matriculation}º Ano`;
  if (data.year) return `${data.year}º Ano`;
  return "Alumni / Outro";
};

const getBusLabel = (bus: string) => {
  if (bus === "none") return "Deslocação própria";
  if (bus === "round_trip") return "Autocarro (Ida e Volta)";
  return "Autocarro (Apenas Ida)";
};

const tableRoleLabel = (role: WizardData["tableRole"]) => {
  if (role === "owner") return "Head de Mesa";
  if (role === "member") return "Pedido pendente (aguarda confirmação)";
  return "Membro";
};

const getSelectedTable = (tableId: string | null, tables: any[]) => {
  if (!tableId || tableId === "none") return null;
  if (tableId === "new") return "Nova Mesa (A criar)";
  const tableObj = tables?.find((t) => String(t._id) === tableId);
  return tableObj?.name || `Mesa #${tableId}`;
};

export default function Step6Confirm({
  config,
  data,
  onBack,
  onFinish,
  syncing = false,
}: Props) {
  const { name, surname, email } = useUserStore();
  const { sessionUser } = useSessionUser();
  const { tables } = useTables();

  const mealLabel =
    config.mealOptions.find((m) => m.id === data.meal)?.label ?? "—";
  const yearLabel = getYearLabel(sessionUser, data);
  const busLabel = getBusLabel(data.bus);
  const selectedTable = getSelectedTable(data.tableId, tables);

  // Use user's actual choice (data.phasedPayment), not admin config
  const userChosePhased = config.phasedPaymentEnabled && data.phasedPayment;

  const totalPersons = 1 + data.companions.length;
  const totalPhase1Price = config.phase1Price * totalPersons;
  const totalPhase2Price = config.phase2Price * totalPersons;
  const totalEventPrice = config.eventPrice * totalPersons;
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
          {data.companions.map((c) => {
            const meal =
              config.mealOptions.find((m) => m.id === c.meal)?.label ?? "—";
            return (
              <div
                key={c.id}
                className="border-light-gold/20 bg-white/4 flex items-start gap-3 border p-4"
              >
                <div className="bg-white/6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                  <FontAwesomeIcon
                    icon={faUser}
                    className="text-xs text-white/30"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-white/75">
                    {c.name}
                  </p>
                  <p className="text-xs text-white/40">{meal}</p>
                  {c.allergies && (
                    <p className="text-xs text-white/30">{c.allergies}</p>
                  )}
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
          <div className="border-light-gold/20 bg-white/4 border px-5 py-2">
            <SummaryRow
              label="Nome"
              value={[name, surname].filter(Boolean).join(" ") || "—"}
            />
            <SummaryRow label="Email" value={email || "—"} />
            <SummaryRow
              label="Nº Mecanográfico"
              value={String((sessionUser?.nmec ?? data.nmec) || "—")}
            />
            <SummaryRow label="Ano" value={yearLabel} />
          </div>
        </div>

        {/* Logistics Summary */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Logística
          </h3>
          <div className="border-light-gold/20 bg-white/4 border px-5 py-2">
            {config.busEnabled && (
              <SummaryRow label="Transporte" value={busLabel} />
            )}
            <SummaryRow label="Prato" value={mealLabel} />
            <SummaryRow
              label="Alergias"
              value={data.allergies.trim() || "Nenhuma"}
            />
          </div>
        </div>

        {/* Payment Summary */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Pagamento
          </h3>
          <div className="border-light-gold/20 bg-white/4 border px-5 py-2">
            <div className="border-light-gold/15 flex items-center justify-between border-b py-2.5">
              <span className="text-xs text-white/40">
                {userChosePhased
                  ? `Fase 1 (${totalPhase1Price}€)`
                  : `Pagamento (${totalEventPrice}€)`}
              </span>
              {data.paymentProofPhase1 ? (
                <span className="text-[0.6rem] font-bold uppercase tracking-tighter text-green-400">
                  ✓ COMPROVATIVO
                </span>
              ) : (
                <span className="text-xs text-red-400">Pendente</span>
              )}
            </div>
            {userChosePhased && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-white/40">
                  Fase 2 ({totalPhase2Price}€)
                </span>
                {data.paymentProofPhase2 ? (
                  <span className="text-[0.6rem] font-bold uppercase tracking-tighter text-green-400">
                    ✓ COMPROVATIVO
                  </span>
                ) : (
                  <span className="text-xs text-red-400">Pendente</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table Summary */}
        {selectedTable && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
              Mesa Selecionada
            </h3>
            <div className="border-light-gold/20 bg-white/4 flex items-center gap-4 border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light-gold/10 text-light-gold">
                <FontAwesomeIcon icon={faChair} />
              </div>
              <div>
                <p className="text-sm font-bold text-white/80">
                  {selectedTable}
                </p>
                <p className="text-[0.65rem] text-white/40">
                  {tableRoleLabel(data.tableRole)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {renderCompanionsSummary()}

      {/* Final Total Summary */}
      {(() => {
        const allPaid = userChosePhased
          ? !!data.paymentProofPhase1 && !!data.paymentProofPhase2
          : !!data.paymentProofPhase1;
        let paidAmount: number;
        if (userChosePhased) {
          paidAmount =
            (data.paymentProofPhase1 ? totalPhase1Price : 0) +
            (data.paymentProofPhase2 ? totalPhase2Price : 0);
        } else {
          paidAmount = data.paymentProofPhase1 ? totalEventPrice : 0;
        }
        return (
          <div className="bg-light-gold/6 border border-light-gold/20 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className={allPaid ? "text-light-gold/60" : "text-white/25"}
                />
                <div>
                  <p className="text-sm font-semibold text-light-gold/80">
                    {allPaid ? "Total Pago" : "Total a Pagar"}
                  </p>
                  <p className="text-xs text-white/40">
                    {totalPersons} pessoa{totalPersons > 1 ? "s" : ""} ×{" "}
                    {pricePerPerson}€
                    {!allPaid && paidAmount > 0 && ` · ${paidAmount}€ enviados`}
                  </p>
                </div>
              </div>
              <p className="font-gala text-2xl font-bold text-light-gold">
                {totalPrice}€
              </p>
            </div>
            <p className="text-white/45 mt-3 text-[0.65rem] italic leading-relaxed">
              Ao confirmares a inscrição, os teus dados serão registados
              permanentemente e o teu lugar na mesa ficará reservado.
            </p>
          </div>
        );
      })()}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="border-white/15 border px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          type="button"
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
