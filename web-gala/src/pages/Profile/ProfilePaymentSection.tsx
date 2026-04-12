import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faFileCircleCheck,
  faCreditCard,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import useSessionUser from "@/hooks/userHooks/useSessionUser";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_MB = 10;

interface Props {
  readonly config: RegistrationConfig;
  readonly proofName: string | null;
  readonly onProofChange: (name: string) => void;
}

export default function ProfilePaymentSection({ config, proofName, onProofChange }: Readonly<Props>) {
  const { sessionUser } = useSessionUser();
  const yearLabel = sessionUser?.matriculation ? String(sessionUser.matriculation) : null;
  const contact = config.paymentContacts.find((c) => c.year === `${yearLabel}ª`) ?? config.paymentContacts[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(config.paymentMethod === "mbway" || config.paymentMethod === "both") && (
          <MBWayCard contact={contact} config={config} />
        )}
        {(config.paymentMethod === "iban" || config.paymentMethod === "both") && (
          <IBANCard config={config} />
        )}
      </div>

      <ProofUpload proofName={proofName} onProofChange={onProofChange} config={config} />
    </div>
  );
}

function MBWayCard({
  contact,
  config,
}: Readonly<{
  contact: { year: string; name: string; phone: string } | undefined;
  config: RegistrationConfig;
}>) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/8 bg-white/3 p-5">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faCreditCard} className="text-light-gold/60" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          MB Way
        </span>
      </div>
      {contact && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-white/40">Contacto para a tua matrícula ({contact.year} ano):</p>
          <p className="text-sm font-semibold text-white/80">{contact.name}</p>
          <p className="font-gala text-lg font-bold tracking-wider text-light-gold">
            {contact.phone}
          </p>
        </div>
      )}
      <div className="rounded-lg border border-white/6 bg-white/3 px-4 py-3">
        <p className="text-[0.6rem] uppercase tracking-widest text-white/30">Descrição do pagamento</p>
        <p className="mt-1 text-xs text-white/60">{config.paymentDescription}</p>
      </div>
    </div>
  );
}

function IBANCard({ config }: Readonly<{ config: RegistrationConfig }>) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!config.ibanNumber) return;
    navigator.clipboard.writeText(config.ibanNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/8 bg-white/3 p-5">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faBuilding} className="text-light-gold/60" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          Transferência Bancária (IBAN)
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-white/40">Titular da conta:</p>
        <p className="text-sm font-semibold text-white/80">{config.ibanHolder || "—"}</p>
      </div>
      {config.ibanNumber && (
        <button
          type="button"
          onClick={copy}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:border-light-gold/30"
        >
          <span className="font-mono text-sm tracking-wider text-white/70">{config.ibanNumber}</span>
          <span className="ml-3 text-[0.6rem] font-semibold uppercase tracking-widest text-light-gold/60">
            {copied ? "Copiado ✓" : "Copiar"}
          </span>
        </button>
      )}
      <div className="rounded-lg border border-white/6 bg-white/3 px-4 py-3">
        <p className="text-[0.6rem] uppercase tracking-widest text-white/30">Descrição da transferência</p>
        <p className="mt-1 text-xs text-white/60">{config.paymentDescription}</p>
      </div>
    </div>
  );
}

function ProofUpload({
  proofName,
  onProofChange,
  config,
}: Readonly<{
  proofName: string | null;
  onProofChange: (name: string) => void;
  config: RegistrationConfig;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.has(file.type)) return "Formato inválido. Usa PDF, JPG, PNG ou WebP.";
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `Ficheiro demasiado grande (máx. ${MAX_SIZE_MB}MB).`;
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    onProofChange(file.name);
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
        Comprovativo de Pagamento
      </h3>
      <p className="text-xs text-white/40">
        Prazo: <span className="font-semibold text-white/60">{config.paymentDeadlineDate}</span>
        {" · "}Tens {config.paymentDeadlineHours}h após a inscrição.
      </p>

      {proofName ? (
        <div className="flex items-center gap-4 rounded-xl border border-dark-gold/30 bg-dark-gold/8 px-5 py-4">
          <FontAwesomeIcon icon={faFileCircleCheck} className="text-dark-gold/70" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white/80">{proofName}</p>
            <p className="text-xs text-white/35">Comprovativo submetido</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-dark-gold/60 underline underline-offset-2 hover:text-dark-gold"
          >
            Substituir
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all",
            dragOver
              ? "border-light-gold/50 bg-light-gold/5"
              : "border-white/12 hover:border-white/25",
          ].join(" ")}
        >
          <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl text-white/25" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white/50">Clica ou arrasta o comprovativo</p>
            <p className="text-xs text-white/25">PDF, JPG, PNG ou WebP · Máx. {MAX_SIZE_MB}MB</p>
          </div>
        </button>
      )}

      {error && <p className="text-xs text-red-400/80">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <p className="text-xs text-white/30">
        Em alternativa, envia o comprovativo por email para{" "}
        <a href={`mailto:${config.paymentEmail}`} className="text-light-gold/50 underline underline-offset-2 hover:text-light-gold">
          {config.paymentEmail}
        </a>
      </p>
    </div>
  );
}
