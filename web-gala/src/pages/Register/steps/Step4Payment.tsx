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
    // Mock upload process
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
      {/* Payment Details Card */}
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
          {config.paymentContacts.map((contact, idx) => (
            <div key={`${contact.phone}-${idx}`} className="flex flex-col gap-1 rounded-xl bg-white/5 p-4 border border-white/5">
              <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">{contact.name} ({contact.year})</span>
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
          
          <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-4 border border-white/5">
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Assunto / Descritivo</span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/80 italic">
                {config.paymentDescription.replace("<Nome>", data.nmec || "Teu Nome").replace("<Nmec>", data.nmec || "Teu Nmec")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Phased Payment Info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className={["flex flex-col gap-4 rounded-2xl border p-5 transition-all", data.paymentProofPhase1 ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/3"].join(" ")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faReceipt} className="text-light-gold/50" />
              <h4 className="font-bold text-white/80">Fase 1</h4>
            </div>
            <span className="text-xl font-bold text-light-gold">{config.phase1Price}€</span>
          </div>
          <p className="text-xs text-white/40">Deadline: <span className="text-white/60">{config.phase1Deadline}</span></p>
          
          <button
            onClick={() => handleUpload(1)}
            disabled={uploading === 1}
            className={[
              "mt-2 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
              data.paymentProofPhase1 
                ? "border-green-500/50 text-green-400 bg-green-500/10" 
                : "border-light-gold/40 text-light-gold hover:bg-light-gold/10"
            ].join(" ")}
          >
            <FontAwesomeIcon icon={data.paymentProofPhase1 ? faCheckCircle : (uploading === 1 ? faCircleInfo : faUpload)} />
            {data.paymentProofPhase1 ? "Comprovativo Enviado" : (uploading === 1 ? "A enviar..." : "Enviar Comprovativo")}
          </button>
        </div>

        {config.phasedPaymentEnabled && (
          <div className={["flex flex-col gap-4 rounded-2xl border p-5 transition-all", data.paymentProofPhase2 ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/3"].join(" ")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faReceipt} className="text-light-gold/50" />
                <h4 className="font-bold text-white/80">Fase 2</h4>
              </div>
              <span className="text-xl font-bold text-light-gold">{config.phase2Price}€</span>
            </div>
            <p className="text-xs text-white/40">Deadline: <span className="text-white/60">{config.phase2Deadline}</span></p>
            
            <button
              onClick={() => handleUpload(2)}
              disabled={uploading === 2}
              className={[
                "mt-2 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
                data.paymentProofPhase2 
                  ? "border-green-500/50 text-green-400 bg-green-500/10" 
                  : "border-light-gold/40 text-light-gold hover:bg-light-gold/10"
              ].join(" ")}
            >
              <FontAwesomeIcon icon={data.paymentProofPhase2 ? faCheckCircle : (uploading === 2 ? faCircleInfo : faUpload)} />
              {data.paymentProofPhase2 ? "Comprovativo Enviado" : (uploading === 2 ? "A enviar..." : "Enviar Comprovativo")}
            </button>
          </div>
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
            <p className="text-[0.6rem] font-bold text-red-400/70 uppercase tracking-widest">Faltam comprovativos</p>
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
