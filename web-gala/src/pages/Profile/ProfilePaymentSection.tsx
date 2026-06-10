import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faFileCircleCheck,
  faCreditCard,
  faBuilding,
  faLock,
  faCopy,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import useSessionUser from "@/hooks/userHooks/useSessionUser";
import GalaService from "@/services/GalaService";
import {
  formatPaymentDeadline,
  isPaymentDeadlinePassed,
} from "@/utils/paymentDeadline";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_SIZE_MB = 10;

interface Props {
  readonly config: RegistrationConfig;
  readonly proofName: string | null;
  readonly onProofChange: (name: string) => void;
}

export default function ProfilePaymentSection({
  config,
  proofName,
  onProofChange,
}: Readonly<Props>) {
  const { sessionUser } = useSessionUser();
  const yearLabel = sessionUser?.matriculation
    ? String(sessionUser.matriculation)
    : null;
  const fullName = [sessionUser?.name, sessionUser?.surname]
    .filter(Boolean)
    .join(" ")
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
  const contact =
    config.paymentContacts.find((c) => c.year === `${yearLabel}ª`) ??
    config.paymentContacts[0] ??
    null;

  const userChosePhased = sessionUser?.phased_payment ?? false;
  const phase2ProofName = sessionUser?.payment_proof_url_phase2 ?? null;

  const phase1Deadline =
    userChosePhased && config.phase1Deadline
      ? config.phase1Deadline
      : config.paymentDeadlineDate;
  const phase2Deadline =
    userChosePhased && config.phase2Deadline
      ? config.phase2Deadline
      : config.paymentDeadlineDate;

  const phase1Passed = isPaymentDeadlinePassed(phase1Deadline);
  const phase2Passed = isPaymentDeadlinePassed(phase2Deadline);
  const finalDeadlinePassed = isPaymentDeadlinePassed(
    config.paymentDeadlineDate,
  );
  const paymentLocked =
    sessionUser?.payment_expired || sessionUser?.registration_active === false;
  const showMBWay =
    (config.paymentMethod === "mbway" || config.paymentMethod === "both") &&
    Boolean(contact);
  const showIBAN =
    config.paymentMethod === "iban" || config.paymentMethod === "both";
  const showTwoPaymentCards = showMBWay && showIBAN;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={[
          "grid grid-cols-1 gap-4",
          showTwoPaymentCards ? "lg:grid-cols-2" : "",
        ].join(" ")}
      >
        {showMBWay && (
          <MBWayCard
            contact={contact}
            description={config.paymentDescription
              .replace("<Nome>", fullName)
              .replace(
                "<Nmec>",
                sessionUser?.nmec ? String(sessionUser.nmec) : "",
              )}
            template={config.paymentDescription}
            amount={userChosePhased ? config.phase1Price : config.eventPrice}
          />
        )}
        {showIBAN && (
          <IBANCard
            config={config}
            description={config.paymentDescription
              .replace("<Nome>", fullName)
              .replace(
                "<Nmec>",
                sessionUser?.nmec ? String(sessionUser.nmec) : "",
              )}
            template={config.paymentDescription}
          />
        )}
      </div>

      {/* Phase 1 missed — downgraded to full payment notice */}
      {config.phasedPaymentEnabled &&
        phase1Passed &&
        !finalDeadlinePassed &&
        !paymentLocked &&
        !sessionUser?.has_payed && (
          <div className="bg-amber-500/8 flex gap-4 border border-amber-500/30 px-5 py-4">
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="mt-0.5 shrink-0 text-amber-400/70"
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-amber-300/90">
                O prazo da 1.ª fase terminou
              </p>
              <p className="text-white/55 text-xs leading-relaxed">
                A inscrição foi automaticamente convertida para{" "}
                <span className="font-semibold text-white/75">
                  pagamento integral
                </span>
                . Efetua o pagamento total até{" "}
                <span className="font-semibold text-white/75">
                  {formatPaymentDeadline(config.paymentDeadlineDate)}
                </span>{" "}
                para garantires o teu lugar. Caso o pagamento não seja
                confirmado dentro desse prazo, a inscrição será cancelada.
              </p>
            </div>
          </div>
        )}

      <div
        className={[
          "grid grid-cols-1 gap-4",
          userChosePhased ? "md:grid-cols-2" : "",
        ].join(" ")}
      >
        <ProofUpload
          phase={1}
          label={
            userChosePhased
              ? "Comprovativo - Fase 1"
              : "Comprovativo de Pagamento"
          }
          deadline={phase1Deadline}
          deadlinePassed={phase1Passed || paymentLocked}
          proofName={proofName}
          confirmed={sessionUser?.payment_phase1_confirmed ?? false}
          onProofChange={onProofChange}
          config={config}
          phasedPayment={userChosePhased}
        />
        {userChosePhased && (
          <ProofUpload
            phase={2}
            label="Comprovativo - Fase 2"
            deadline={phase2Deadline}
            deadlinePassed={phase2Passed || paymentLocked}
            proofName={phase2ProofName}
            confirmed={sessionUser?.payment_phase2_confirmed ?? false}
            onProofChange={onProofChange}
            config={config}
            phasedPayment={userChosePhased}
          />
        )}
      </div>
    </div>
  );
}

function MBWayCard({
  contact,
  description,
  template,
  amount,
}: Readonly<{
  contact: { year: string; name: string; phone: string } | undefined;
  description: string;
  template: string;
  amount: number;
}>) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  const copyPhone = () => {
    if (!contact) return;
    navigator.clipboard.writeText(contact.phone.replaceAll(" ", ""));
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const copyDesc = () => {
    navigator.clipboard.writeText(description);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  return (
    <div className="bg-white/3 flex flex-col gap-4 border border-light-gold/20 p-5">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faCreditCard} className="text-light-gold/60" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          MB Way
        </span>
      </div>
      {contact && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-white/40">
            Contacto para a tua matrícula ({contact.year} ano):
          </p>
          <p className="text-sm font-semibold text-white/80">{contact.name}</p>
          <div className="flex items-center justify-between">
            <a
              href={`tel:${contact.phone.replaceAll(" ", "")}`}
              className="font-gala text-lg font-bold tracking-wider text-light-gold underline-offset-2 hover:underline"
            >
              {contact.phone}
            </a>
            <button
              type="button"
              onClick={copyPhone}
              className="flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-widest text-light-gold/60 hover:text-light-gold"
            >
              <FontAwesomeIcon icon={faCopy} className="text-[0.55rem]" />
              {copiedPhone ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-white/40">
            Montante:{" "}
            <span className="font-semibold text-white/70">{amount}€</span>
          </p>
        </div>
      )}
      <div className="border-light-gold/15 bg-white/3 border px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[0.6rem] uppercase tracking-widest text-white/30">
            Descrição do pagamento
          </p>
          <button
            type="button"
            onClick={copyDesc}
            className="flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-widest text-light-gold/60 hover:text-light-gold"
          >
            <FontAwesomeIcon icon={faCopy} className="text-[0.55rem]" />
            {copiedDesc ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
        <p className="mt-1 text-xs text-white/60">{description}</p>
        <p className="mt-1 text-[0.6rem] text-white/25">{template}</p>
      </div>
    </div>
  );
}

function IBANCard({
  config,
  description,
  template,
}: Readonly<{
  config: RegistrationConfig;
  description: string;
  template: string;
}>) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!config.ibanNumber) return;
    navigator.clipboard.writeText(config.ibanNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/3 flex flex-col gap-4 border border-light-gold/20 p-5">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faBuilding} className="text-light-gold/60" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          Transferência Bancária (IBAN)
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-white/40">Titular da conta:</p>
        <p className="text-sm font-semibold text-white/80">
          {config.ibanHolder || "—"}
        </p>
      </div>
      {config.ibanNumber && (
        <button
          type="button"
          onClick={copy}
          className="flex items-center justify-between border border-light-gold/20 bg-white/5 px-4 py-3 transition hover:border-light-gold/30"
        >
          <span className="font-mono text-sm tracking-wider text-white/70">
            {config.ibanNumber}
          </span>
          <span className="ml-3 text-[0.6rem] font-semibold uppercase tracking-widest text-light-gold/60">
            {copied ? "Copiado ✓" : "Copiar"}
          </span>
        </button>
      )}
      <div className="border-light-gold/15 bg-white/3 border px-4 py-3">
        <p className="text-[0.6rem] uppercase tracking-widest text-white/30">
          Descrição da transferência
        </p>
        <p className="mt-1 text-xs text-white/60">{description}</p>
        <p className="mt-1 text-[0.6rem] text-white/25">{template}</p>
      </div>
    </div>
  );
}

function ProofUpload({
  phase,
  label,
  deadline,
  deadlinePassed,
  proofName,
  confirmed,
  onProofChange,
  config,
  phasedPayment,
}: Readonly<{
  phase: 1 | 2;
  label: string;
  deadline: string;
  deadlinePassed: boolean;
  proofName: string | null;
  confirmed: boolean;
  onProofChange: (name: string) => void;
  config: RegistrationConfig;
  phasedPayment: boolean;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSessionUser();

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.has(file.type))
      return "Formato inválido. Usa PDF, JPG, PNG ou WebP.";
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `Ficheiro demasiado grande (máx. ${MAX_SIZE_MB}MB).`;
    return null;
  };

  const handleFile = async (file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    try {
      await GalaService.registration.uploadPaymentProof(
        file,
        phase,
        phasedPayment,
      );
      await mutate();
      onProofChange(file.name);
    } catch {
      setError("Erro ao enviar comprovativo. Tenta novamente.");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
        {label}
      </h3>
      <p className="text-xs text-white/40">
        Prazo:{" "}
        <span
          className={[
            "font-semibold",
            deadlinePassed ? "text-red-400/80" : "text-white/60",
          ].join(" ")}
        >
          {formatPaymentDeadline(deadline)}
        </span>
        {deadlinePassed && (
          <span className="ml-2 text-red-400/70">— Prazo expirado</span>
        )}
      </p>

      {(() => {
        if (proofName) {
          return (
            <div className="bg-dark-gold/8 flex items-center gap-4 border border-dark-gold/30 px-5 py-4">
              <FontAwesomeIcon
                icon={faFileCircleCheck}
                className="text-dark-gold/70"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white/80">
                  {proofName.split("/").pop() ?? proofName}
                </p>
                <p className="text-white/35 text-xs">Comprovativo submetido</p>
                <p
                  className={[
                    "mt-1 text-[0.65rem] font-semibold",
                    confirmed ? "text-emerald-400/75" : "text-yellow-400/70",
                  ].join(" ")}
                >
                  {confirmed ? "Validado pela organização" : "Por rever"}
                </p>
              </div>
              {!deadlinePassed && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs text-dark-gold/60 underline underline-offset-2 hover:text-dark-gold"
                >
                  Substituir
                </button>
              )}
            </div>
          );
        }
        if (deadlinePassed) {
          return (
            <div className="flex flex-col items-center gap-3 border-2 border-dashed border-red-500/20 bg-red-500/5 p-8">
              <FontAwesomeIcon
                icon={faLock}
                className="text-xl text-red-400/40"
              />
              <p className="text-sm font-semibold text-red-400/60">
                Prazo de envio encerrado
              </p>
              <p className="text-center text-xs text-white/30">
                Para resolver a situação, contacta a organização por email.
              </p>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={[
              "flex flex-col items-center gap-3 border-2 border-dashed p-8 transition-all",
              dragOver
                ? "border-light-gold/50 bg-light-gold/5"
                : "border-white/12 hover:border-white/25",
            ].join(" ")}
          >
            <FontAwesomeIcon
              icon={faCloudArrowUp}
              className="text-xl text-white/25"
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50">
                Clica ou arrasta o comprovativo
              </p>
              <p className="text-xs text-white/25">
                PDF, JPG, PNG ou WebP · Máx. {MAX_SIZE_MB}MB
              </p>
            </div>
          </button>
        );
      })()}

      {error && <p className="text-xs text-red-400/80">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleFile(f);
          }
          e.target.value = "";
        }}
      />

      {!deadlinePassed && (
        <p className="text-xs text-white/30">
          Em alternativa, envia o comprovativo por email para{" "}
          <a
            href={`mailto:${config.paymentEmail}`}
            className="text-light-gold/50 underline underline-offset-2 hover:text-light-gold"
          >
            {config.paymentEmail}
          </a>
        </p>
      )}
    </div>
  );
}
