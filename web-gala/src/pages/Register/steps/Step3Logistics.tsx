import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBus,
  faUtensils,
  faLeaf,
  faFish,
  faSeedling,
  faBan,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData, BusOption, Companion } from "@/hooks/useWizardState";

interface Props {
  readonly config: RegistrationConfig;
  readonly data: WizardData;
  readonly onUpdate: (updates: Partial<WizardData>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly syncing?: boolean;
}

const BUS_OPTIONS: {
  value: BusOption;
  label: string;
  sub: string;
  icon: typeof faBus;
}[] = [
  {
    value: "round_trip",
    label: "Autocarro (Ida e Volta)",
    sub: "Transporte incluído na inscrição",
    icon: faBus,
  },
  {
    value: "none",
    label: "Deslocação própria",
    sub: "Sem autocarro",
    icon: faBan,
  },
];

export default function Step3Logistics({
  config,
  data,
  onUpdate,
  onNext,
  onBack,
  syncing,
}: Readonly<Props>) {
  const updateCompanion = (i: number, patch: Partial<Companion>) => {
    const next = data.companions.map((c, idx) =>
      idx === i ? { ...c, ...patch } : c,
    );
    onUpdate({ companions: next });
  };

  const allMealsSelected =
    !!data.meal && data.companions.every((c) => !!c.meal);

  const handleNext = () => {
    if (!allMealsSelected) return;
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
      {config.busEnabled && (
        <BusSection config={config} data={data} onUpdate={onUpdate} />
      )}

      <PersonMealSection
        label="Tu"
        meal={data.meal}
        allergies={data.allergies}
        mealOptions={config.mealOptions}
        allergiesRequired={config.allergiesRequired}
        onMealChange={(meal) => onUpdate({ meal })}
        onAllergiesChange={(allergies) => onUpdate({ allergies })}
      />

      {data.companions.map((companion, i) => (
        <PersonMealSection
          key={companion.id || i}
          label={companion.name || `Acompanhante ${i + 1}`}
          meal={companion.meal}
          allergies={companion.allergies}
          mealOptions={config.mealOptions}
          allergiesRequired={config.allergiesRequired}
          onMealChange={(meal) => updateCompanion(i, { meal })}
          onAllergiesChange={(allergies) => updateCompanion(i, { allergies })}
        />
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="border-white/15 border px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!allMealsSelected || syncing}
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {syncing ? "A guardar..." : "Continuar → Pagamento"}
        </button>
      </div>
    </motion.div>
  );
}

function BusSection({
  config,
  data,
  onUpdate,
}: Readonly<{
  config: RegistrationConfig;
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faBus} className="text-light-gold/50" />
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          Transporte
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BUS_OPTIONS.map((opt) => {
          const isSelected = data.bus === opt.value;
          const showPrice =
            opt.value === "round_trip" && config.busRoundTripPrice > 0;
          const included =
            opt.value === "round_trip" && config.busRoundTripPrice === 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ bus: opt.value })}
              className={[
                "flex flex-col gap-2 border p-4 text-left transition-all",
                isSelected
                  ? "bg-light-gold/8 border-light-gold/60"
                  : "bg-white/3 border-light-gold/20 hover:border-white/20",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <FontAwesomeIcon
                  icon={opt.icon}
                  className={isSelected ? "text-light-gold" : "text-white/30"}
                />
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-light-gold" />
                )}
              </div>
              <p
                className={[
                  "text-sm font-bold",
                  isSelected ? "text-light-gold" : "text-white/60",
                ].join(" ")}
              >
                {opt.label}
              </p>
              <p className="text-white/35 text-xs">{opt.sub}</p>
              {showPrice && (
                <p className="text-xs font-semibold text-dark-gold/80">
                  +{config.busRoundTripPrice}€ por pessoa
                </p>
              )}
              {included && (
                <p className="text-xs text-white/25">Incluído no preço</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PersonMealSectionProps {
  readonly label: string;
  readonly meal: string;
  readonly allergies: string;
  readonly mealOptions: RegistrationConfig["mealOptions"];
  readonly allergiesRequired: boolean;
  readonly onMealChange: (meal: string) => void;
  readonly onAllergiesChange: (allergies: string) => void;
}

function PersonMealSection({
  label,
  meal,
  allergies,
  mealOptions,
  allergiesRequired,
  onMealChange,
  onAllergiesChange,
}: Readonly<PersonMealSectionProps>) {
  return (
    <div className="bg-white/3 flex flex-col gap-4 border border-light-gold/20 p-5">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={faUser}
          className="text-[0.65rem] text-light-gold/40"
        />
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          {label}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
            Prato Principal
          </p>
          <div className="flex flex-col gap-2">
            {mealOptions.map((opt) => {
              const isSelected = meal === opt.id;
              const dishIconMap: Record<string, typeof faUtensils> = {
                VEG: faSeedling,
                VEGAN: faLeaf,
                FISH: faFish,
              };
              const icon = dishIconMap[opt.dishType] ?? faUtensils;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onMealChange(opt.id)}
                  className={[
                    "flex items-center gap-3 border p-3 text-left transition-all",
                    isSelected
                      ? "bg-light-gold/8 border-light-gold/60"
                      : "border-light-gold/20 hover:border-white/20",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                      isSelected ? "bg-light-gold/20" : "bg-white/5",
                    ].join(" ")}
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      className={
                        isSelected ? "text-light-gold" : "text-white/30"
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "text-sm font-bold",
                        isSelected ? "text-light-gold" : "text-white/70",
                      ].join(" ")}
                    >
                      {opt.label}
                    </p>
                    {opt.description && (
                      <p className="text-xs text-white/40">{opt.description}</p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-light-gold" />
                  )}
                </button>
              );
            })}
          </div>
          {!meal && (
            <p className="text-xs text-red-400/70">
              Escolhe um prato para continuar.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
            Alergias Alimentares
            {allergiesRequired && (
              <span className="ml-2 text-red-400/70">*</span>
            )}
          </p>
          <textarea
            value={allergies}
            onChange={(e) => onAllergiesChange(e.target.value)}
            placeholder="Ex: alergia a frutos secos, intolerância à lactose..."
            rows={4}
            className="resize-none border border-light-gold/20 bg-transparent px-4 py-3 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/50"
          />
          {!allergiesRequired && (
            <p className="text-[0.6rem] text-white/25">
              Opcional. Deixa em branco se não tiveres.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
