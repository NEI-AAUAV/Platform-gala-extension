import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faIdCard,
  faPhone,
  faSpinner,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useUserStore } from "@/stores/useUserStore";
import useSessionUser from "@/hooks/userHooks/useSessionUser";
import { WizardData } from "@/hooks/useWizardState";
import { RegistrationConfig } from "@/config/registrationConfig";
import Step2CompanionEditor from "./Step2CompanionEditor";

const YEAR_OPTIONS: [string, number | null][] = [
  ["1º Ano", 1],
  ["2º Ano", 2],
  ["3º Ano", 3],
  ["4º Ano", 4],
  ["5º Ano", 5],
  ["Alumni / Outro", null],
];

interface Props {
  config: RegistrationConfig;
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  syncing?: boolean;
}

export default function Step2PersonalData({
  config,
  data,
  onUpdate,
  onNext,
  onBack,
  syncing = false,
}: Props) {
  const { name, surname, email } = useUserStore();
  const { sessionUser } = useSessionUser();
  const [error, setError] = useState<string | null>(null);

  const isAlreadyRegistered = !!sessionUser?.nmec;
  const fullName = [name, surname].filter(Boolean).join(" ");

  const handleNext = async () => {
    setError(null);

    if (!data.nmec.trim() || !/^\d+$/.test(data.nmec)) {
      setError("Número mecanográfico inválido — deve conter apenas dígitos.");
      return;
    }
    if (data.year === undefined) {
      setError("Seleciona o teu ano.");
      return;
    }
    if (!data.phone.trim() || !/^\+?[0-9\s-]{9,15}$/.test(data.phone.trim())) {
      setError("Número de telemóvel inválido.");
      return;
    }

    const invalidCompanion = data.companions.find((c) => !c.name.trim());
    if (invalidCompanion) {
      setError("Cada acompanhante precisa de um nome.");
      return;
    }

    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IdentitySection
          fullName={fullName}
          email={email}
          isAlreadyRegistered={isAlreadyRegistered}
        />
        <FormSection
          data={data}
          sessionUser={sessionUser}
          isAlreadyRegistered={isAlreadyRegistered}
          onUpdate={onUpdate}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          Acompanhantes
        </h3>
        <p className="text-xs text-white/40">
          Preço por pessoa:{" "}
          <span className="font-semibold text-white/60">
            {config.eventPrice}€
          </span>
          {config.busEnabled && config.busRoundTripPrice > 0 && (
            <> + {config.busRoundTripPrice}€ autocarro (se aplicável)</>
          )}
        </p>
        <Step2CompanionEditor
          companions={data.companions}
          onChange={(companions) => onUpdate({ companions })}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="border-white/15 border px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          onClick={handleNext}
          disabled={syncing}
          className="flex items-center gap-2 border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:opacity-60"
        >
          {syncing && (
            <FontAwesomeIcon
              icon={faSpinner}
              className="animate-spin text-xs"
            />
          )}
          {isAlreadyRegistered ? "Continuar →" : "Registar e Continuar →"}
        </button>
      </div>
    </motion.div>
  );
}

function IdentitySection({
  fullName,
  email,
  isAlreadyRegistered,
}: Readonly<{
  fullName: string;
  email?: string;
  isAlreadyRegistered: boolean;
}>) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
        Identificação (via Autenticação)
      </h3>
      <div className="border-light-gold/15 bg-white/4 flex flex-col gap-3 rounded-xl border p-5">
        <div className="flex items-center gap-3 text-sm">
          <FontAwesomeIcon
            icon={faLock}
            className="text-[0.65rem] text-white/25"
          />
          <span className="text-[0.6rem] uppercase tracking-widest text-white/30">
            Preenchido automaticamente
          </span>
        </div>
        <IdentityRow icon={faUser} label="Nome" value={fullName || "—"} />
        <IdentityRow icon={faEnvelope} label="Email" value={email || "—"} />
        {isAlreadyRegistered && (
          <div className="mt-2 rounded-lg border border-dark-gold/20 bg-dark-gold/10 px-4 py-3">
            <p className="text-xs text-dark-gold/80">
              Já tens inscrição efetuada. Os dados abaixo são apenas para
              consulta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FormSection({
  data,
  sessionUser,
  isAlreadyRegistered,
  onUpdate,
}: Readonly<{
  data: WizardData;
  sessionUser: ReturnType<typeof useSessionUser>["sessionUser"];
  isAlreadyRegistered: boolean;
  onUpdate: (updates: Partial<WizardData>) => void;
}>) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
        Dados da Inscrição
      </h3>
      <div className="border-white/8 bg-white/4 flex flex-col gap-5 rounded-xl border p-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="nmec-input"
            className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/50"
          >
            <FontAwesomeIcon
              icon={faIdCard}
              className="text-[0.6rem] text-light-gold/40"
            />
            Número Mecanográfico
          </label>
          <input
            id="nmec-input"
            type="text"
            inputMode="numeric"
            value={
              isAlreadyRegistered ? String(sessionUser?.nmec ?? "") : data.nmec
            }
            onChange={(e) => onUpdate({ nmec: e.target.value })}
            disabled={isAlreadyRegistered}
            placeholder="Ex: 123456"
            className="rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/50">
            Ano / Situação
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {YEAR_OPTIONS.map(([label, value]) => {
              const currentValue = isAlreadyRegistered
                ? sessionUser?.matriculation ?? null
                : data.year;
              const isSelected = currentValue === value;
              return (
                <button
                  key={String(value)}
                  type="button"
                  disabled={isAlreadyRegistered}
                  onClick={() => onUpdate({ year: value })}
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed",
                    isSelected
                      ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                      : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="phone-input"
            className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/50"
          >
            <FontAwesomeIcon
              icon={faPhone}
              className="text-[0.6rem] text-light-gold/40"
            />
            Telemóvel
          </label>
          <input
            id="phone-input"
            type="tel"
            value={data.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            placeholder="Ex: 912 345 678"
            className="rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/50"
          />
        </div>
      </div>
    </div>
  );
}

function IdentityRow({
  icon,
  label,
  value,
}: Readonly<{
  icon: typeof faUser;
  label: string;
  value: string;
}>) {
  return (
    <div className="border-white/6 bg-white/3 flex items-center gap-3 rounded-lg border px-4 py-3">
      <FontAwesomeIcon
        icon={icon}
        className="w-3 flex-shrink-0 text-[0.7rem] text-light-gold/40"
      />
      <div className="min-w-0">
        <p className="text-white/35 text-[0.6rem] uppercase tracking-widest">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-white/75">{value}</p>
      </div>
    </div>
  );
}
