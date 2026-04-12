import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useUserStore } from "@/stores/useUserStore";
import useLoginLink from "@/hooks/useLoginLink";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { useWizardState } from "@/hooks/useWizardState";
import StepIndicator from "./StepIndicator";
import Step1EventInfo from "./steps/Step1EventInfo";
import Step2PersonalData from "./steps/Step2PersonalData";
import Step3Logistics from "./steps/Step3Logistics";
import Step4Payment from "./steps/Step4Payment";
import Step5Table from "./steps/Step5Table";
import Step6Confirm from "./steps/Step6Confirm";

export default function Register() {
  const { sessionLoading, sub } = useUserStore();
  const loginLink = useLoginLink();
  const { config } = useRegistrationConfig();
  const { data, update, reset } = useWizardState();

  if (!sessionLoading && sub === undefined) {
    return <Navigate to={loginLink} />;
  }

  const currentStep = data.currentStep;
  const maxReached = data.currentStep;

  const goTo = (step: number) => update({ currentStep: step });
  const next = () => update({ currentStep: Math.min(currentStep + 1, 6) });
  const back = () => update({ currentStep: Math.max(currentStep - 1, 1) });

  const handleFinish = () => {
    reset();
    globalThis.location.href = "/profile";
  };

  return (
    <div className="min-h-screen pb-24 pt-28">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-center gap-3 text-center"
        >
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-light-gold/40">
            Núcleo de Estudantes de Informática
          </span>
          <h1 className="font-gala text-3xl font-bold text-light-gold sm:text-4xl">
            Inscrição — Jantar de Gala
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <StepIndicator current={currentStep} onStepClick={goTo} maxReached={maxReached} />
        </motion.div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm sm:p-8">
          <StepTitle step={currentStep} />

          <AnimatePresence mode="wait">
            <div key={currentStep}>
              {currentStep === 1 && <Step1EventInfo config={config} onNext={next} />}
              {currentStep === 2 && (
                <Step2PersonalData config={config} data={data} onUpdate={update} onNext={next} onBack={back} />
              )}
              {currentStep === 3 && (
                <Step3Logistics config={config} data={data} onUpdate={update} onNext={next} onBack={back} />
              )}
              {currentStep === 4 && (
                <Step4Payment config={config} data={data} onUpdate={update} onNext={next} onBack={back} />
              )}
              {currentStep === 5 && (
                <Step5Table config={config} data={data} onUpdate={update} onNext={next} onBack={back} />
              )}
              {currentStep === 6 && (
                <Step6Confirm config={config} data={data} onBack={back} onFinish={handleFinish} />
              )}
            </div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-[0.6rem] uppercase tracking-widest text-white/20">
          Passo {currentStep} de 6
        </p>
      </div>
    </div>
  );
}

const STEP_TITLES: Record<number, { title: string; sub: string }> = {
  1: { title: "Informações do Evento", sub: "Conhece todos os detalhes antes de te inscreveres." },
  2: { title: "Dados Pessoais & Acompanhantes", sub: "Confirma os teus dados e adiciona quem te acompanha." },
  3: { title: "Logística", sub: "Transporte e preferências de refeição." },
  4: { title: "Pagamento", sub: "Instruções de pagamento e envio de comprovativos." },
  5: { title: "Escolha de Mesa", sub: "Reserva o teu lugar ou cria uma nova mesa para os teus amigos." },
  6: { title: "Confirmação Final", sub: "Revê os teus dados e conclui a inscrição." },
};

function StepTitle({ step }: Readonly<{ step: number }>) {
  const { title, sub } = STEP_TITLES[step] ?? { title: "", sub: "" };
  return (
    <div className="mb-6 border-b border-white/8 pb-5">
      <h2 className="font-gala text-xl font-bold text-white/90">{title}</h2>
      <p className="mt-1 text-sm text-white/40">{sub}</p>
    </div>
  );
}
