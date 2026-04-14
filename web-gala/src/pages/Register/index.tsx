import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useUserStore } from "@/stores/useUserStore";
import useLoginLink from "@/hooks/useLoginLink";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { useWizardState, BusOption } from "@/hooks/useWizardState";
import GalaService from "@/services/GalaService";
import StepIndicator from "./StepIndicator";
import Step1EventInfo from "./steps/Step1EventInfo";
import Step2PersonalData from "./steps/Step2PersonalData";
import Step3Logistics from "./steps/Step3Logistics";
import Step4Payment from "./steps/Step4Payment";
import Step5Table from "./steps/Step5Table";
import Step6Confirm from "./steps/Step6Confirm";

const BUS_OPTION_MAP: Record<string, BusOption> = {
  ROUND_TRIP: "round_trip",
  ONE_WAY: "one_way",
  NONE: "none",
};

const BUS_OPTION_REVERSE: Record<BusOption, string> = {
  round_trip: "ROUND_TRIP",
  one_way: "ONE_WAY",
  none: "NONE",
};

export default function Register() {
  const { sessionLoading, sub } = useUserStore();
  const loginLink = useLoginLink();
  const { config } = useRegistrationConfig();
  const { data, update, reset } = useWizardState();
  const [syncing, setSyncing] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (sub === undefined) return;
    GalaService.registration.getStatus()
      .then((status) => {
        if (status.registration_step && status.registration_step > 1) {
          update({
            nmec: String(status.nmec || ""),
            year: (status as unknown as Record<string, unknown>).matriculation as number | null ?? null,
            bus: BUS_OPTION_MAP[(status as unknown as Record<string, unknown>).bus_option as string ?? "NONE"] ?? "none",
            meal: (status as unknown as Record<string, unknown>).meal_option as string || "",
            allergies: (status as unknown as Record<string, unknown>).food_allergies as string || "",
            companions: (status as unknown as Record<string, unknown>).companions as [] || [],
            currentStep: Math.max(status.registration_step, data.currentStep),
          });
        }
      })
      .catch(() => {});
  }, [sub]);

  if (!sessionLoading && sub === undefined) {
    return <Navigate to={loginLink} />;
  }

  const currentStep = data.currentStep;
  const maxReached = data.currentStep;

  const goTo = (step: number) => update({ currentStep: step });
  const back = () => update({ currentStep: Math.max(currentStep - 1, 1) });

  const syncCurrentStep = async () => {
    if (currentStep === 2) {
      await GalaService.registration.updateStep(2, {
        nmec: Number(data.nmec),
        matriculation: data.year,
        companions: data.companions,
      });
    } else if (currentStep === 3) {
      await GalaService.registration.updateStep(3, {
        bus_option: BUS_OPTION_REVERSE[data.bus] ?? "NONE",
        meal_option: data.meal,
        food_allergies: data.allergies || "",
        companions: data.companions,
      });
    } else if (currentStep === 4) {
      await GalaService.registration.updateStep(4, {
        phased_payment: config.phasedPaymentEnabled,
      });
    } else if (currentStep === 5) {
      await GalaService.registration.updateStep(5, {
        table_id: data.tableId,
      });
    }
  };

  const next = async () => {
    setStepError(null);
    setSyncing(true);
    try {
      await syncCurrentStep();
      update({ currentStep: Math.min(currentStep + 1, 6) });
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setStepError(detail || "Erro ao guardar dados. Tenta novamente.");
    } finally {
      setSyncing(false);
    }
  };

  const handleFinish = async () => {
    setStepError(null);
    setSyncing(true);
    try {
      await GalaService.registration.updateStep(6, {});
      reset();
      window.location.href = "/gala/profile";
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setStepError(detail || "Erro ao concluir inscrição. Tenta novamente.");
      setSyncing(false);
    }
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

          {stepError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {stepError}
            </div>
          )}

          <AnimatePresence mode="wait">
            <div key={currentStep}>
              {currentStep === 1 && <Step1EventInfo config={config} onNext={next} />}
              {currentStep === 2 && (
                <Step2PersonalData config={config} data={data} onUpdate={update} onNext={next} onBack={back} syncing={syncing} />
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
                <Step6Confirm config={config} data={data} onBack={back} onFinish={handleFinish} syncing={syncing} />
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
