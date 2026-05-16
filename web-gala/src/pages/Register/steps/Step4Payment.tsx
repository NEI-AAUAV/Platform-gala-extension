import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faUpload,
  faCheckCircle,
  faCircleInfo,
  faReceipt,
  faMoneyBillWave,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData } from "@/hooks/useWizardState";
import GalaService from "@/services/GalaService";
import { useUserStore } from "@/stores/useUserStore";
import type { UserState } from "@/stores/useUserStore";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

interface Props {
  readonly config: RegistrationConfig;
  readonly data: WizardData;
  readonly onUpdate: (updates: Partial<WizardData>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly syncing?: boolean;
}

export default function Step4Payment({
  config,
  data,
  onUpdate,
  onNext,
  onBack,
  syncing,
}: Readonly<Props>) {
  const { name: firstName, surname } = useUserStore((s: UserState) => s);
  const userName = [firstName, surname]
    .filter(Boolean)
    .join(" ")
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Determine if user CHOSE phased payment (only possible when admin enabled it)
  const userChosePhased = config.phasedPaymentEnabled && data.phasedPayment;
  const totalPersons = 1 + data.companions.length;
  const totalEventPrice = config.eventPrice * totalPersons;
  const totalPhase1Price = config.phase1Price * totalPersons;
  const totalPhase2Price = config.phase2Price * totalPersons;

  const handleUpload = async (phase: 1 | 2, file: File) => {
    setUploadError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setUploadError("Tipo de ficheiro não permitido. Usa imagens ou PDF.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(
        `Ficheiro demasiado grande. Máximo ${
          MAX_SIZE_BYTES / (1024 * 1024)
        } MB.`,
      );
      return;
    }

    setUploading(phase);
    try {
      const { url } = await GalaService.registration.uploadPaymentProof(
        file,
        phase,
      );
      if (phase === 1) onUpdate({ paymentProofPhase1: url });
      else onUpdate({ paymentProofPhase2: url });
    } catch {
      setUploadError("Erro ao enviar comprovativo. Tenta novamente.");
    } finally {
      setUploading(null);
    }
  };

  const triggerUpload = (phase: 1 | 2) => {
    if (phase === 1) fileInputRef1.current?.click();
    else fileInputRef2.current?.click();
  };

  const hasPhase1 = !!data.paymentProofPhase1;
  const hasPhase2 = !!data.paymentProofPhase2;
  const isComplete = userChosePhased ? hasPhase1 && hasPhase2 : hasPhase1;
  const phaseLabel = isComplete
    ? "Continuar → Escolher Mesa"
    : userChosePhased && hasPhase1
      ? "Continuar → Escolher Mesa"
      : "Avançar sem comprovativo →";
  const nextButtonLabel = syncing ? "A guardar..." : phaseLabel;

  const renderPaymentMethods = () => {
    let yearLabel = "1";
    if (data.year) {
      yearLabel = data.year >= 5 ? "5" : String(data.year);
    }
    const contact =
      config.paymentContacts.find((c) => c.year.startsWith(yearLabel)) ??
      config.paymentContacts[0];

    return (
      <div className="space-y-3">
        {(config.paymentMethod === "mbway" ||
          config.paymentMethod === "both") &&
          contact && (
            <>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/25">
                MB Way
              </p>
              <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 p-4">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                  {contact.name} ({contact.year})
                </span>
                <div className="flex items-center justify-between">
                  <a
                    href={`tel:${contact.phone.replaceAll(" ", "")}`}
                    className="font-mono text-sm text-white/80 underline-offset-2 hover:text-light-gold hover:underline"
                  >
                    {contact.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        contact.phone.replaceAll(" ", ""),
                      )
                    }
                    className="flex items-center gap-1 text-[0.6rem] font-bold text-light-gold/60 hover:text-light-gold"
                  >
                    <FontAwesomeIcon icon={faCopy} className="text-[0.5rem]" />{" "}
                    COPIAR
                  </button>
                </div>
              </div>
            </>
          )}

        {(config.paymentMethod === "iban" || config.paymentMethod === "both") &&
          config.ibanNumber && (
            <>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/25">
                Transferência Bancária (IBAN)
              </p>
              <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                    Titular
                  </span>
                  <span className="text-sm text-white/80">
                    {config.ibanHolder}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                    IBAN
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white/80">
                      {config.ibanNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(config.ibanNumber)
                      }
                      className="flex items-center gap-1 text-[0.6rem] font-bold text-light-gold/60 hover:text-light-gold"
                    >
                      <FontAwesomeIcon
                        icon={faCopy}
                        className="text-[0.5rem]"
                      />{" "}
                      COPIAR
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                    Montante
                  </span>
                  <span className="font-mono text-sm text-white/80">
                    {config.phasedPaymentEnabled && data.phasedPayment
                      ? `${totalPhase1Price}€ (Fase 1)`
                      : `${totalEventPrice}€`}
                  </span>
                </div>
              </div>
            </>
          )}

        <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
              Assunto / Descritivo
            </span>
            <button
              type="button"
              onClick={() => {
                const desc = config.paymentDescription
                  .replace("<Nome>", userName || "")
                  .replace("<Nmec>", data.nmec ? String(data.nmec) : "");
                navigator.clipboard.writeText(desc);
              }}
              className="flex items-center gap-1 text-[0.6rem] font-bold text-light-gold/60 hover:text-light-gold"
            >
              <FontAwesomeIcon icon={faCopy} className="text-[0.5rem]" /> COPIAR
            </button>
          </div>
          <span className="text-xs italic text-white/80">
            {config.paymentDescription
              .replace("<Nome>", userName || "Teu Nome")
              .replace("<Nmec>", data.nmec ? String(data.nmec) : "Teu Nmec")}
          </span>
          <span className="text-[0.6rem] text-white/25">
            {config.paymentDescription}
          </span>
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
      className="flex flex-col gap-8"
    >
      <input
        ref={fileInputRef1}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(1, f);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef2}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(2, f);
          e.target.value = "";
        }}
      />

      {/* Payment details card */}
      <div className="rounded-2xl border border-light-gold/20 bg-light-gold/5 p-6 backdrop-blur-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light-gold/10 text-light-gold">
            <FontAwesomeIcon icon={faCreditCard} />
          </div>
          <div>
            <h3 className="font-gala text-lg font-bold text-light-gold">
              Detalhes do Pagamento
            </h3>
            <p className="text-xs text-white/40">
              Faz a transferência para os dados abaixo
            </p>
          </div>
        </div>

        {renderPaymentMethods()}
      </div>

      {uploadError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {uploadError}
        </p>
      )}

      {/* Payment mode toggle - only when admin has enabled phased payments */}
      {config.phasedPaymentEnabled && (
        <div className="bg-white/3 rounded-2xl border border-white/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FontAwesomeIcon
              icon={faMoneyBillWave}
              className="text-light-gold/50"
            />
            <h4 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
              Modo de Pagamento
            </h4>
          </div>
          <p className="mb-4 text-xs text-white/40">
            Escolhe se preferes pagar o valor total de uma só vez ou dividir em
            duas fases.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onUpdate({ phasedPayment: false })}
              className={[
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                data.phasedPayment === false
                  ? "bg-light-gold/8 border-light-gold/60"
                  : "border-white/8 bg-white/3 hover:border-white/20",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span
                  className={[
                    "text-sm font-bold",
                    data.phasedPayment ? "text-white/60" : "text-light-gold",
                  ].join(" ")}
                >
                  Pagamento Total
                </span>
                {data.phasedPayment === false && (
                  <span className="h-2 w-2 rounded-full bg-light-gold" />
                )}
              </div>
              <p className="text-white/35 text-xs">
                Paga {totalEventPrice}€ de uma só vez e envia 1 comprovativo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ phasedPayment: true })}
              className={[
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                data.phasedPayment
                  ? "bg-light-gold/8 border-light-gold/60"
                  : "border-white/8 bg-white/3 hover:border-white/20",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span
                  className={[
                    "text-sm font-bold",
                    data.phasedPayment ? "text-light-gold" : "text-white/60",
                  ].join(" ")}
                >
                  Pagamento em 2 Fases
                </span>
                {data.phasedPayment && (
                  <span className="h-2 w-2 rounded-full bg-light-gold" />
                )}
              </div>
              <p className="text-white/35 text-xs">
                Fase 1: {totalPhase1Price}€ até {config.phase1Deadline}
                <br />
                Fase 2: {totalPhase2Price}€ até {config.phase2Deadline}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Upload cards */}
      <div
        className={[
          "grid grid-cols-1 gap-6",
          userChosePhased ? "md:grid-cols-2" : "",
        ].join(" ")}
      >
        <PhaseCard
          label={userChosePhased ? "Fase 1" : "Comprovativo de Pagamento"}
          price={userChosePhased ? totalPhase1Price : totalEventPrice}
          deadline={
            userChosePhased ? config.phase1Deadline : config.paymentDeadlineDate
          }
          hasProof={!!data.paymentProofPhase1}
          uploading={uploading === 1}
          onUpload={() => triggerUpload(1)}
        />
        {userChosePhased && (
          <PhaseCard
            label="Fase 2"
            price={totalPhase2Price}
            deadline={config.phase2Deadline}
            hasProof={!!data.paymentProofPhase2}
            uploading={uploading === 2}
            onUpload={() => triggerUpload(2)}
          />
        )}
      </div>

      {!isComplete && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <p className="text-xs text-yellow-400/80">
            Podes avançar sem enviar o comprovativo agora, poderás fazê-lo mais
            tarde no teu perfil, dentro do prazo indicado.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="border-white/15 border px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={syncing}
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextButtonLabel}
        </button>
      </div>
    </motion.div>
  );
}

function PhaseCard({
  label,
  price,
  deadline,
  hasProof,
  uploading,
  onUpload,
}: Readonly<{
  label: string;
  price: number;
  deadline: string;
  hasProof: boolean;
  uploading: boolean;
  onUpload: () => void;
}>) {
  return (
    <div
      className={[
        "flex flex-col gap-4 rounded-2xl border p-5 transition-all",
        hasProof
          ? "border-green-500/30 bg-green-500/5"
          : "bg-white/3 border-white/10",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faReceipt} className="text-light-gold/50" />
          <h4 className="font-bold text-white/80">{label}</h4>
        </div>
        <span className="text-xl font-bold text-light-gold">{price}€</span>
      </div>
      <p className="text-xs text-white/40">
        Deadline: <span className="text-white/60">{deadline}</span>
      </p>
      <button
        type="button"
        onClick={onUpload}
        disabled={uploading}
        className={[
          "mt-2 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
          hasProof
            ? "border-green-500/50 bg-green-500/10 text-green-400"
            : "border-light-gold/40 text-light-gold hover:bg-light-gold/10",
        ].join(" ")}
      >
        {(() => {
          if (hasProof)
            return (
              <>
                <FontAwesomeIcon icon={faCheckCircle} /> Comprovativo Enviado ✓
              </>
            );
          if (uploading)
            return (
              <>
                <FontAwesomeIcon icon={faCircleInfo} className="animate-spin" />{" "}
                A enviar...
              </>
            );
          return (
            <>
              <FontAwesomeIcon icon={faUpload} /> Enviar Comprovativo
            </>
          );
        })()}
      </button>
    </div>
  );
}
