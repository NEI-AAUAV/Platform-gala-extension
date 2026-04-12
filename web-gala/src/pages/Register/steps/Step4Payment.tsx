import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCreditCard, faUpload, faCheckCircle, faCircleInfo, faReceipt } from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData } from "@/hooks/useWizardState";

interface Props {
  readonly config: RegistrationConfig;
  readonly data: WizardData;
  readonly onUpdate: (updates: Partial<WizardData>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
}

export default function Step4Payment({ config, data, onUpdate, onNext, onBack }: Readonly<Props>) {
  const [uploading, setUploading] = useState<number | null>(null);

  const handleUpload = (phase: 1 | 2) => {
    setUploading(phase);
    setTimeout(() => {
      const mockUrl = `https://mock-storage.nei/proof-phase${phase}-${Date.now()}.png`;
      if (phase === 1) onUpdate({ paymentProofPhase1: mockUrl });
      else onUpdate({ paymentProofPhase2: mockUrl });
      setUploading(null);
    }, 1000);
  };

  const isComplete = config.phasedPaymentEnabled
    ? data.paymentProofPhase1 && data.paymentProofPhase2
    : data.paymentProofPhase1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-8"
    >
      <PaymentDetails
        contacts={config.paymentContacts}
        description={config.paymentDescription}
        data={data}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PhaseCard
          phase={1}
          price={config.phase1Price}
          deadline={config.phase1Deadline}
          proof={data.paymentProofPhase1}
          uploading={uploading === 1}
          onUpload={() => handleUpload(1)}
        />

        {config.phasedPaymentEnabled && (
          <PhaseCard
            phase={2}
            price={config.phase2Price}
            deadline={config.phase2Deadline}
            proof={data.paymentProofPhase2}
            uploading={uploading === 2}
            onUpload={() => handleUpload(2)}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="border border-white/15 px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <div className="flex flex-col items-end gap-2">
          {!isComplete && (
            <p className="text-[0.6rem] font-bold text-red-400/70 uppercase tracking-widest">
              Faltam comprovativos
            </p>
          )}
          <button
            onClick={onNext}
            disabled={!isComplete}
            className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar → Escolher Mesa
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PaymentDetails({
  contacts,
  description,
  data,
}: Readonly<{
  contacts: RegistrationConfig["paymentContacts"];
  description: string;
  data: WizardData;
}>) {
  const formattedDescription = description
    .replace("<Nome>", data.nmec || "Teu Nome")
    .replace("<Nmec>", data.nmec || "Teu Nmec");

  return (
    <div className="rounded-2xl border border-light-gold/20 bg-light-gold/5 p-6 backdrop-blur-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light-gold/10 text-light-gold">
          <FontAwesomeIcon icon={faCreditCard} />
        </div>
        <div>
          <h3 className="font-gala text-lg font-bold text-light-gold">Detalhes do Pagamento</h3>
          <p className="text-xs text-white/40">Faz a transferência para os dados abaixo</p>
        </div>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div
            key={`${contact.phone}-${idx}`}
            className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 p-4"
          >
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
              {contact.name} ({contact.year})
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-white/80">{contact.phone}</span>
              <button
                onClick={() => navigator.clipboard.writeText(contact.phone)}
                className="text-[0.6rem] font-bold text-light-gold/60 hover:text-light-gold"
              >
                COPIAR
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 p-4">
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
            Assunto / Descritivo
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xs italic text-white/80">{formattedDescription}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  price,
  deadline,
  proof,
  uploading,
  onUpload,
}: Readonly<{
  phase: number;
  price: number;
  deadline: string;
  proof: string | null | undefined;
  uploading: boolean;
  onUpload: () => void;
}>) {
  let icon = faUpload;
  let text = "Enviar Comprovativo";

  if (proof) {
    icon = faCheckCircle;
    text = "Comprovativo Enviado";
  } else if (uploading) {
    icon = faCircleInfo;
    text = "A enviar...";
  }

  return (
    <div
      className={[
        "flex flex-col gap-4 rounded-2xl border p-5 transition-all",
        proof ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/3",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faReceipt} className="text-light-gold/50" />
          <h4 className="font-bold text-white/80">Fase {phase}</h4>
        </div>
        <span className="text-xl font-bold text-light-gold">{price}€</span>
      </div>
      <p className="text-xs text-white/40">
        Deadline: <span className="text-white/60">{deadline}</span>
      </p>

      <button
        onClick={onUpload}
        disabled={uploading}
        className={[
          "mt-2 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
          proof
            ? "border-green-500/50 bg-green-500/10 text-green-400"
            : "border-light-gold/40 text-light-gold hover:bg-light-gold/10",
        ].join(" ")}
      >
        <FontAwesomeIcon icon={icon} />
        {text}
      </button>
    </div>
  );
}
